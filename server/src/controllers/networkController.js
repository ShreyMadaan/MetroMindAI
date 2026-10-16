
const Station = require("../models/Station");
const Connection = require("../models/Connection");
const MetroLine = require("../models/MetroLine");

const getNetworkMap = async (req, res) => {
  try {
    const [stations, lines, connections] =
      await Promise.all([
        Station.find({ isActive: true })
          .select("code name lines isInterchange")
          .lean(),

        MetroLine.find({ isActive: true })
          .select("code name color")
          .lean(),

        Connection.find({ isActive: true })
          .select(
            "fromStation toStation line distanceKm travelTimeMinutes"
          )
          .lean(),
      ]);

    const stationIds = new Set(
      stations.map((station) => String(station._id))
    );

    const lineMap = new Map(
      lines.map((line) => [String(line._id), line])
    );

    const stationData = stations.map((station) => ({
      id: String(station._id),
      code: station.code,
      name: station.name,
      isInterchange: station.isInterchange,
      lines: station.lines
        .map((id) => lineMap.get(String(id)))
        .filter(Boolean)
        .map((line) => ({
          code: line.code,
          name: line.name,
          color: line.color,
        })),
    }));

    const connectionData = connections
      .filter(
        (connection) =>
          stationIds.has(String(connection.fromStation)) &&
          stationIds.has(String(connection.toStation)) &&
          lineMap.has(String(connection.line))
      )
      .map((connection) => {
        const line = lineMap.get(String(connection.line));

        return {
          id: String(connection._id),
          source: String(connection.fromStation),
          target: String(connection.toStation),
          lineCode: line.code,
          lineName: line.name,
          lineColor: line.color,
          distanceKm: connection.distanceKm,
          travelTimeMinutes: connection.travelTimeMinutes,
        };
      });

    return res.status(200).json({
      success: true,
      data: {
        stations: stationData,
        lines: lines.map((line) => ({
          code: line.code,
          name: line.name,
          color: line.color,
        })),
        connections: connectionData,
      },
    });
  } catch (error) {
    console.error("Network map error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load metro network map",
    });
  }
};

module.exports = { getNetworkMap };
