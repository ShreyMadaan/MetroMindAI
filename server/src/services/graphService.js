
const Station = require("../models/Station");
const Connection = require("../models/Connection");
require("../models/MetroLine");

const MODES = ["stops", "time", "interchanges"];

const makeError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const buildGraph = async () => {
  const [stations, connections] = await Promise.all([
    Station.find({ isActive: true })
      .populate("lines", "code name color")
      .lean(),

    Connection.find({ isActive: true })
      .populate("line", "code name color isActive")
      .lean(),
  ]);

  const stationMap = new Map();
  const adjacency = new Map();

  for (const station of stations) {
    const id = String(station._id);

    stationMap.set(id, station);
    adjacency.set(id, []);
  }

  for (const connection of connections) {
    const from = String(connection.fromStation);
    const to = String(connection.toStation);
    const line = connection.line;

    if (
      !stationMap.has(from) ||
      !stationMap.has(to) ||
      !line?._id ||
      line.isActive === false
    ) {
      continue;
    }

    const edge = {
      lineId: String(line._id),
      lineCode: line.code,
      lineName: line.name,
      lineColor: line.color,
      distanceKm: connection.distanceKm,
      travelTimeMinutes: connection.travelTimeMinutes,
    };

    adjacency.get(from).push({
      ...edge,
      to,
    });

    adjacency.get(to).push({
      ...edge,
      to: from,
    });
  }

  return {
    stationMap,
    adjacency,
  };
};

const stateKey = (stationId, lineId) =>
  `${stationId}|${lineId ?? "START"}`;

const compareCosts = (a, b, mode) => {
  if (mode === "stops") {
    return (
      a.stops - b.stops ||
      a.time - b.time ||
      a.interchanges - b.interchanges
    );
  }

  if (mode === "interchanges") {
    return (
      a.interchanges - b.interchanges ||
      a.time - b.time ||
      a.stops - b.stops
    );
  }

  return (
    a.time - b.time ||
    a.interchanges - b.interchanges ||
    a.stops - b.stops
  );
};

/*
 * Core route optimization algorithm.
 *
 * Uses Dijkstra-style search with lexicographic costs.
 *
 * Each search state represents:
 *   (stationId, currentLineId)
 *
 * Every accepted state has an immutable parent reference,
 * ensuring that path reconstruction remains consistent.
 *
 * This function accepts an in-memory graph, making it
 * independently testable without MongoDB.
 */

const findRouteInGraph = (
  graph,
  sourceCode,
  destinationCode,
  mode = "time"
) => {
  if (!MODES.includes(mode)) {
    throw makeError("Invalid optimization mode");
  }

  const { stationMap, adjacency } = graph;

  const codeToId = new Map();

  for (const [id, station] of stationMap) {
    codeToId.set(station.code, id);
  }

  const sourceId = codeToId.get(sourceCode);
  const destinationId = codeToId.get(destinationCode);

  if (!sourceId || !destinationId) {
    throw makeError(
      "Source or destination station not found",
      404
    );
  }

  const start = {
    key: stateKey(sourceId, null),
    stationId: sourceId,
    lineId: null,
    stops: 0,
    time: 0,
    distance: 0,
    interchanges: 0,
    parent: null,
    incomingEdge: null,
  };

  const best = new Map([[start.key, start]]);
  const queue = [start];

  let destinationState = null;

  while (queue.length > 0) {
    queue.sort((a, b) => compareCosts(a, b, mode));

    const current = queue.shift();

    // Ignore outdated queue entries.
    if (best.get(current.key) !== current) {
      continue;
    }

    if (current.stationId === destinationId) {
      destinationState = current;
      break;
    }

    const neighbors =
      adjacency.get(current.stationId) || [];

    for (const edge of neighbors) {
      const changedLine =
        current.lineId !== null &&
        current.lineId !== edge.lineId;

      const next = {
        key: stateKey(edge.to, edge.lineId),
        stationId: edge.to,
        lineId: edge.lineId,
        stops: current.stops + 1,
        time:
          current.time + edge.travelTimeMinutes,
        distance:
          current.distance + edge.distanceKm,
        interchanges:
          current.interchanges + Number(changedLine),

        // Immutable reconstruction chain.
        parent: current,
        incomingEdge: edge,
      };

      const existing = best.get(next.key);

      if (
        !existing ||
        compareCosts(next, existing, mode) < 0
      ) {
        best.set(next.key, next);
        queue.push(next);
      }
    }
  }

  if (!destinationState) {
    throw makeError(
      "No route available between these stations",
      404
    );
  }

  /*
   * Reconstruct using immutable parent references.
   *
   * This avoids retrieving an updated predecessor
   * from the best-state map.
   */

  const path = [];
  let cursor = destinationState;

  while (cursor !== null) {
    const station = stationMap.get(cursor.stationId);
    const edge = cursor.incomingEdge;

    path.push({
      stationCode: station.code,
      stationName: station.name,
      line: edge
        ? {
            code: edge.lineCode,
            name: edge.lineName,
            color: edge.lineColor,
          }
        : null,
      distanceFromPreviousKm:
        edge?.distanceKm ?? 0,
      timeFromPreviousMinutes:
        edge?.travelTimeMinutes ?? 0,
    });

    cursor = cursor.parent;
  }

  path.reverse();

  return {
    source: stationMap.get(sourceId).name,
    destination: stationMap.get(destinationId).name,
    optimization: mode,
    totalStops: destinationState.stops,
    totalDistanceKm: Number(
      destinationState.distance.toFixed(2)
    ),
    estimatedTravelTimeMinutes:
      destinationState.time,
    interchangeCount:
      destinationState.interchanges,
    path,
    dataQuality: "demonstration",
  };
};

const calculateRoute = async (
  sourceCode,
  destinationCode,
  mode = "time"
) => {
  const graph = await buildGraph();

  return findRouteInGraph(
    graph,
    sourceCode,
    destinationCode,
    mode
  );
};

module.exports = {
  buildGraph,
  findRouteInGraph,
  calculateRoute,
};
