
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");

const {
  buildGraph,
  findRouteInGraph,
} = require("../services/graphService");

const MODES = ["time", "stops", "interchanges"];

async function testNetworkRoutes() {
  try {
    await connectDB();

    const graph = await buildGraph();
    const stations = [...graph.stationMap.values()];

    console.log("\nMETROMIND AI — DATASET ROUTING TESTS");
    console.log("===================================");
    console.log(`Loaded stations: ${stations.length}`);

    if (stations.length < 2) {
      throw new Error("Not enough stations to test routing");
    }

    const sampleStations = [
      stations[0],
      stations[Math.floor(stations.length / 4)],
      stations[Math.floor(stations.length / 2)],
      stations[Math.floor((3 * stations.length) / 4)],
      stations[stations.length - 1],
    ];

    let passed = 0;
    let failed = 0;

    for (let i = 0; i < sampleStations.length; i++) {
      for (let j = i + 1; j < sampleStations.length; j++) {
        const source = sampleStations[i];
        const destination = sampleStations[j];

        console.log(
          `\n${source.name} → ${destination.name}`
        );

        for (const mode of MODES) {
          try {
            const route = findRouteInGraph(
              graph,
              source.code,
              destination.code,
              mode
            );

            const codes = route.path.map(
              (station) => station.stationCode
            );

            const correctEndpoints =
              codes[0] === source.code &&
              codes[codes.length - 1] === destination.code;

            const correctStopCount =
              route.totalStops === route.path.length - 1;

            const correctTime =
              route.path.reduce(
                (sum, station) =>
                  sum + station.timeFromPreviousMinutes,
                0
              ) === route.estimatedTravelTimeMinutes;

            const correctTransfers =
              route.path.slice(2).reduce(
                (count, station, index) =>
                  count +
                  Number(
                    station.line?.code !==
                      route.path[index + 1].line?.code
                  ),
                0
              ) === route.interchangeCount;

            if (
              !correctEndpoints ||
              !correctStopCount ||
              !correctTime ||
              !correctTransfers
            ) {
              throw new Error(
                "Route consistency validation failed"
              );
            }

            console.log(
              `  ✓ ${mode.padEnd(13)} ` +
                `${route.totalStops} stops, ` +
                `${route.estimatedTravelTimeMinutes} min, ` +
                `${route.interchangeCount} transfers`
            );

            passed++;
          } catch (error) {
            console.error(
              `  ✗ ${mode}: ${error.message}`
            );

            failed++;
          }
        }
      }
    }

    console.log("\nTEST SUMMARY");
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      "Dataset routing tests failed:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

testNetworkRoutes();
