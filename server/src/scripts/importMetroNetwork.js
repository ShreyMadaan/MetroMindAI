
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");

const Station = require("../models/Station");
const MetroLine = require("../models/MetroLine");
const Connection = require("../models/Connection");

const {
  metroLines,
  DEFAULT_TRAVEL_TIME,
  DEFAULT_DISTANCE_KM,
} = require("../data/metroNetwork");

const APPLY_CLEANUP =
  process.argv.includes("--apply-cleanup");

const createStationCode = (name) =>
  name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const edgeKey = (from, to, line) => {
  const [a, b] = [String(from), String(to)].sort();
  return `${String(line)}:${a}:${b}`;
};

function buildDefinitions() {
  if (!Array.isArray(metroLines) || !metroLines.length) {
    throw new Error("Metro dataset is empty.");
  }

  const stations = new Map();
  const connections = new Map();
  const lineCodes = new Set();

  for (const line of metroLines) {
    if (!line.code || lineCodes.has(line.code)) {
      throw new Error(
        `Duplicate or missing line code: ${line.code}`
      );
    }

    lineCodes.add(line.code);

    const segments =
      line.segments ||
      (line.stations ? [line.stations] : []);

    if (!segments.length) {
      throw new Error(
        `No segments defined for ${line.code}`
      );
    }

    for (const segment of segments) {
      if (!Array.isArray(segment) || segment.length < 2) {
        throw new Error(
          `Invalid segment in ${line.code}`
        );
      }

      const codes = segment.map((name) => {
        if (typeof name !== "string" || !name.trim()) {
          throw new Error(
            `Invalid station name in ${line.code}`
          );
        }

        const code = createStationCode(name);

        if (!code) {
          throw new Error("Empty station code");
        }

        if (!stations.has(code)) {
          stations.set(code, {
            code,
            name,
            lines: new Set(),
          });
        } else if (stations.get(code).name !== name) {
          throw new Error(
            `Station code collision: ${code}`
          );
        }

        stations.get(code).lines.add(line.code);

        return code;
      });

      if (new Set(codes).size !== codes.length) {
        throw new Error(
          `Repeated station in ${line.code} segment`
        );
      }

      for (let i = 0; i < codes.length - 1; i++) {
        const from = codes[i];
        const to = codes[i + 1];

        const key = edgeKey(from, to, line.code);

        if (!connections.has(key)) {
          connections.set(key, {
            from,
            to,
            line: line.code,
          });
        }
      }
    }
  }

  return { stations, connections };
}

async function importNetwork() {
  try {
    const definitions = buildDefinitions();

    console.log("\nMetroMind AI — Network Import");
    console.log("=============================");
    console.log("Dataset validation passed.");
    console.log(`Lines: ${metroLines.length}`);
    console.log(`Stations: ${definitions.stations.size}`);
    console.log(
      `Connections: ${definitions.connections.size}`
    );

    await connectDB();

    const lineMap = new Map();

    // Step 1: Upsert metro lines.
    for (const line of metroLines) {
      const saved = await MetroLine.findOneAndUpdate(
        { code: line.code },
        {
          $set: {
            name: line.name,
            color: line.color,
            isActive: true,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      lineMap.set(line.code, saved);
    }

    // Step 2: Upsert stations.
    const stationOperations = [
      ...definitions.stations.values(),
    ].map((station) => ({
      updateOne: {
        filter: { code: station.code },
        update: {
          $set: {
            name: station.name,
            lines: [...station.lines].map(
              (code) => lineMap.get(code)._id
            ),
            isInterchange: station.lines.size > 1,
            isActive: true,
          },
        },
        upsert: true,
      },
    }));

    await Station.bulkWrite(stationOperations);

    const savedStations = await Station.find({
      code: {
        $in: [...definitions.stations.keys()],
      },
    })
      .select("_id code")
      .lean();

    const stationMap = new Map(
      savedStations.map((station) => [
        station.code,
        station._id,
      ])
    );

    if (stationMap.size !== definitions.stations.size) {
      throw new Error(
        "Station import count mismatch."
      );
    }

    // Step 3: Fetch existing edges.
    const importedLineIds = [
      ...lineMap.values(),
    ].map((line) => line._id);

    const existingConnections = await Connection.find({
      line: { $in: importedLineIds },
    })
      .select(
        "_id fromStation toStation line isActive"
      )
      .lean();

    const existingByKey = new Map();

    for (const connection of existingConnections) {
      const key = edgeKey(
        connection.fromStation,
        connection.toStation,
        connection.line
      );

      if (!existingByKey.has(key)) {
        existingByKey.set(key, []);
      }

      existingByKey.get(key).push(connection);
    }

    // Step 4: Upsert expected edges.
    const expectedKeys = new Set();

    let created = 0;
    let updated = 0;

    for (const definition of definitions.connections.values()) {
      const fromStation = stationMap.get(definition.from);
      const toStation = stationMap.get(definition.to);
      const line = lineMap.get(definition.line)._id;

      const key = edgeKey(
        fromStation,
        toStation,
        line
      );

      expectedKeys.add(key);

      const existing = existingByKey.get(key) || [];

      if (existing.length) {
        // Update one canonical edge.
        await Connection.updateOne(
          { _id: existing[0]._id },
          {
            $set: {
              distanceKm: DEFAULT_DISTANCE_KM,
              travelTimeMinutes: DEFAULT_TRAVEL_TIME,
              isActive: true,
            },
          },
          { runValidators: true }
        );

        updated++;
      } else {
        await Connection.create({
          fromStation,
          toStation,
          line,
          distanceKm: DEFAULT_DISTANCE_KM,
          travelTimeMinutes: DEFAULT_TRAVEL_TIME,
          isActive: true,
        });

        created++;
      }
    }

    // Step 5: Find obsolete or duplicate edges.
    const staleConnectionIds = [];

    for (const [key, records] of existingByKey) {
      if (!expectedKeys.has(key)) {
        staleConnectionIds.push(
          ...records.map((record) => record._id)
        );
      } else if (records.length > 1) {
        // Keep the first matching edge.
        staleConnectionIds.push(
          ...records.slice(1).map(
            (record) => record._id
          )
        );
      }
    }

    console.log("\nImport summary");
    console.log("--------------");
    console.log(`New connections: ${created}`);
    console.log(`Updated connections: ${updated}`);
    console.log(
      `Stale/duplicate connections: ${staleConnectionIds.length}`
    );

    if (APPLY_CLEANUP) {
      if (staleConnectionIds.length > 0) {
        const result = await Connection.updateMany(
          {
            _id: { $in: staleConnectionIds },
          },
          {
            $set: { isActive: false },
          }
        );

        console.log(
          `Deactivated connections: ${result.modifiedCount}`
        );
      }

      console.log("Connection cleanup completed.");
    } else if (staleConnectionIds.length > 0) {
      console.log(
        "\nCleanup preview only. No stale connections deactivated."
      );
      console.log(
        "Run with --apply-cleanup after reviewing the dataset."
      );
    }

    console.log("\nNetwork import completed.");
    console.log(
      "Distances and travel times remain illustrative."
    );
  } catch (error) {
    console.error(
      "\nMetro import failed:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

importNetwork();
