
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");

const Station = require("../models/Station");
const MetroLine = require("../models/MetroLine");
const Connection = require("../models/Connection");

// Demonstration dataset for development/testing.
// Connections and travel times are illustrative,
// not verified Delhi Metro operational data.

const lines = [
  { code: "YELLOW", name: "Yellow Line", color: "#FFD600" },
  { code: "BLUE", name: "Blue Line", color: "#2563EB" },
];

const stations = [
  { code: "RAJIV_CHOWK", name: "Rajiv Chowk", lines: ["YELLOW", "BLUE"] },
  { code: "PATEL_CHOWK", name: "Patel Chowk", lines: ["YELLOW"] },
  { code: "CENTRAL_SECRETARIAT", name: "Central Secretariat", lines: ["YELLOW"] },
  { code: "BARAKHAMBA_ROAD", name: "Barakhamba Road", lines: ["BLUE"] },
  { code: "MANDI_HOUSE", name: "Mandi House", lines: ["BLUE"] },
];

const connections = [
  {
    from: "RAJIV_CHOWK",
    to: "PATEL_CHOWK",
    line: "YELLOW",
    distanceKm: 1.2,
    travelTimeMinutes: 2,
  },
  {
    from: "PATEL_CHOWK",
    to: "CENTRAL_SECRETARIAT",
    line: "YELLOW",
    distanceKm: 1.1,
    travelTimeMinutes: 2,
  },
  {
    from: "RAJIV_CHOWK",
    to: "BARAKHAMBA_ROAD",
    line: "BLUE",
    distanceKm: 1.0,
    travelTimeMinutes: 2,
  },
  {
    from: "BARAKHAMBA_ROAD",
    to: "MANDI_HOUSE",
    line: "BLUE",
    distanceKm: 1.1,
    travelTimeMinutes: 2,
  },
];

const seedMetro = async () => {
  try {
    await connectDB();

    const lineMap = {};

    for (const line of lines) {
      const savedLine = await MetroLine.findOneAndUpdate(
        { code: line.code },
        { $set: line },
        { upsert: true, new: true, runValidators: true }
      );

      lineMap[line.code] = savedLine;
    }

    const stationMap = {};

    for (const station of stations) {
      const lineIds = station.lines.map(
        (code) => lineMap[code]._id
      );

      const savedStation = await Station.findOneAndUpdate(
        { code: station.code },
        {
          $set: {
            name: station.name,
            lines: lineIds,
            isInterchange: lineIds.length > 1,
            isActive: true,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );

      stationMap[station.code] = savedStation;
    }

    for (const connection of connections) {
      const fromStation = stationMap[connection.from]._id;
      const toStation = stationMap[connection.to]._id;
      const line = lineMap[connection.line]._id;

      await Connection.findOneAndUpdate(
        { fromStation, toStation, line },
        {
          $set: {
            distanceKm: connection.distanceKm,
            travelTimeMinutes: connection.travelTimeMinutes,
            isActive: true,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
    }

    console.log("Metro demonstration dataset seeded successfully");
    console.log(`Lines: ${lines.length}`);
    console.log(`Stations: ${stations.length}`);
    console.log(`Connections: ${connections.length}`);
  } catch (error) {
    console.error("Metro seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedMetro();
