
const Station = require("../models/Station");
const MetroLine = require("../models/MetroLine");
const Connection = require("../models/Connection");

const getNetworkAnalytics = async (req, res, next) => {
  try {
    const [
      stations,
      lines,
      connections,
    ] = await Promise.all([
      Station.find({ isActive: true })
        .select("_id code name lines isInterchange")
        .lean(),

      MetroLine.find({ isActive: true })
        .select("_id code name color")
        .lean(),

      Connection.find({ isActive: true })
        .select(
          "_id fromStation toStation line distanceKm travelTimeMinutes"
        )
        .lean(),
    ]);

    const activeStationIds = new Set(
      stations.map((station) => String(station._id))
    );

    const activeLineIds = new Set(
      lines.map((line) => String(line._id))
    );

    // Only include connections whose endpoints and
    // metro line are currently active.
    const validConnections = connections.filter(
      (connection) =>
        activeStationIds.has(
          String(connection.fromStation)
        ) &&
        activeStationIds.has(
          String(connection.toStation)
        ) &&
        activeLineIds.has(String(connection.line))
    );

    const interchangeStations = stations.filter(
      (station) => {
        const activeMemberships = new Set(
          (station.lines || [])
            .map(String)
            .filter((id) => activeLineIds.has(id))
        );

        return activeMemberships.size > 1;
      }
    );

    const lineAnalytics = lines.map((line) => {
      const lineId = String(line._id);

      const lineStations = stations.filter(
        (station) =>
          (station.lines || []).some(
            (id) => String(id) === lineId
          )
      );

      const lineConnections = validConnections.filter(
        (connection) =>
          String(connection.line) === lineId
      );

      const totalDistanceKm = lineConnections.reduce(
        (total, connection) =>
          total + (Number(connection.distanceKm) || 0),
        0
      );

      return {
        code: line.code,
        name: line.name,
        color: line.color,
        stationCount: lineStations.length,
        connectionCount: lineConnections.length,
        totalDistanceKm:
          Math.round(totalDistanceKm * 100) / 100,
      };
    });

    // An undirected graph edge contributes one degree
    // to each of its endpoint stations.
    const degreeMap = new Map(
      stations.map((station) => [
        String(station._id),
        0,
      ])
    );

    for (const connection of validConnections) {
      const from = String(connection.fromStation);
      const to = String(connection.toStation);

      degreeMap.set(
        from,
        (degreeMap.get(from) || 0) + 1
      );

      degreeMap.set(
        to,
        (degreeMap.get(to) || 0) + 1
      );
    }

    const isolatedStations = stations
      .filter(
        (station) =>
          (degreeMap.get(String(station._id)) || 0) === 0
      )
      .map((station) => ({
        code: station.code,
        name: station.name,
      }));

    const totalDistanceKm = validConnections.reduce(
      (total, connection) =>
        total + (Number(connection.distanceKm) || 0),
      0
    );

    const averageConnectionsPerStation =
      stations.length > 0
        ? (2 * validConnections.length) /
          stations.length
        : 0;

    return res.status(200).json({
      success: true,
      message: "Network analytics fetched successfully",
      data: {
        overview: {
          totalStations: stations.length,
          totalLines: lines.length,
          totalConnections: validConnections.length,
          totalInterchanges: interchangeStations.length,
          totalDistanceKm:
            Math.round(totalDistanceKm * 100) / 100,
        },

        graph: {
          vertices: stations.length,
          edges: validConnections.length,
          averageDegree:
            Math.round(
              averageConnectionsPerStation * 100
            ) / 100,
          isolatedStationCount: isolatedStations.length,
          isolatedStations,
        },

        lines: lineAnalytics,

        interchangeStations:
          interchangeStations.map((station) => ({
            code: station.code,
            name: station.name,
          })),

        dataQuality: {
          type: "demonstration",
          note:
            "Network statistics are calculated from imported MongoDB records. Distances and travel times may be illustrative rather than verified operational data.",
        },

        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNetworkAnalytics,
};
