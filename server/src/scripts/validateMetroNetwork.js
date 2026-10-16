
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");

const Station = require("../models/Station");
const MetroLine = require("../models/MetroLine");
const Connection = require("../models/Connection");

const normalizeId = (value) => String(value);

async function validateNetwork() {
  try {
    await connectDB();

    const [stations, lines, connections] =
      await Promise.all([
        Station.find({ isActive: true }).lean(),
        MetroLine.find({ isActive: true }).lean(),
        Connection.find({ isActive: true }).lean(),
      ]);

    const stationMap = new Map(
      stations.map((station) => [
        normalizeId(station._id),
        station,
      ])
    );

    const lineMap = new Map(
      lines.map((line) => [
        normalizeId(line._id),
        line,
      ])
    );

    const adjacency = new Map(
      stations.map((station) => [
        normalizeId(station._id),
        new Set(),
      ])
    );

    const issues = {
      invalidConnections: [],
      invalidMemberships: [],
      duplicateConnections: [],
      isolatedStations: [],
      disconnectedComponents: [],
      interchangeMismatches: [],
    };

    const edgeKeys = new Set();

    for (const station of stations) {
      const stationId = normalizeId(station._id);

      const validLines = (station.lines || []).filter(
        (lineId) => lineMap.has(normalizeId(lineId))
      );

      if (
        validLines.length !==
        (station.lines || []).length
      ) {
        issues.invalidMemberships.push(station.name);
      }

      const expectedInterchange = validLines.length > 1;

      if (station.isInterchange !== expectedInterchange) {
        issues.interchangeMismatches.push({
          station: station.name,
          stored: station.isInterchange,
          expected: expectedInterchange,
        });
      }

      if (!adjacency.has(stationId)) {
        adjacency.set(stationId, new Set());
      }
    }

    for (const connection of connections) {
      const from = normalizeId(connection.fromStation);
      const to = normalizeId(connection.toStation);
      const line = normalizeId(connection.line);

      if (
        !stationMap.has(from) ||
        !stationMap.has(to) ||
        !lineMap.has(line) ||
        from === to
      ) {
        issues.invalidConnections.push(
          normalizeId(connection._id)
        );
        continue;
      }

      const fromStation = stationMap.get(from);
      const toStation = stationMap.get(to);

      if (
        !(fromStation.lines || []).some(
          (id) => normalizeId(id) === line
        ) ||
        !(toStation.lines || []).some(
          (id) => normalizeId(id) === line
        )
      ) {
        issues.invalidConnections.push(
          normalizeId(connection._id)
        );
        continue;
      }

      const [a, b] = [from, to].sort();
      const key = `${line}:${a}:${b}`;

      if (edgeKeys.has(key)) {
        issues.duplicateConnections.push(key);
      } else {
        edgeKeys.add(key);
      }

      adjacency.get(from).add(to);
      adjacency.get(to).add(from);
    }

    for (const [id, neighbors] of adjacency) {
      if (neighbors.size === 0) {
        issues.isolatedStations.push(
          stationMap.get(id).name
        );
      }
    }

    const visited = new Set();

    for (const startId of adjacency.keys()) {
      if (visited.has(startId)) continue;

      const queue = [startId];
      const component = [];
      visited.add(startId);

      for (let index = 0; index < queue.length; index++) {
        const current = queue[index];
        component.push(stationMap.get(current).name);

        for (const neighbor of adjacency.get(current)) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      issues.disconnectedComponents.push(component);
    }

    console.log("\nMETROMIND AI — NETWORK VALIDATION");
    console.log("=================================");

    console.log(`Stations: ${stations.length}`);
    console.log(`Lines: ${lines.length}`);
    console.log(`Connections: ${connections.length}`);

    console.log("\nVALIDATION SUMMARY");

    for (const [key, values] of Object.entries(issues)) {
      console.log(`${key}: ${values.length}`);
    }

    console.log("\nCONNECTED COMPONENTS");

    issues.disconnectedComponents.forEach(
      (component, index) => {
        console.log(
          `Component ${index + 1}: ${component.length} stations`
        );

        if (
          issues.disconnectedComponents.length > 1
        ) {
          console.log(
            `  Sample: ${component.slice(0, 8).join(", ")}`
          );
        }
      }
    );

    console.log("\nDETAILED ISSUES");

    for (const [key, values] of Object.entries(issues)) {
      if (
        key === "disconnectedComponents" ||
        values.length === 0
      ) {
        continue;
      }

      console.log(`\n${key}:`);
      console.dir(values.slice(0, 30), {
        depth: null,
      });
    }

    const hasIssues =
      issues.invalidConnections.length > 0 ||
      issues.invalidMemberships.length > 0 ||
      issues.duplicateConnections.length > 0 ||
      issues.isolatedStations.length > 0 ||
      issues.interchangeMismatches.length > 0 ||
      issues.disconnectedComponents.length > 1;

    console.log(
      hasIssues
        ? "\nNetwork requires reconciliation."
        : "\nNetwork structural validation passed."
    );
  } catch (error) {
    console.error(
      "Network validation failed:",
      error.message
    );
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

validateNetwork();
