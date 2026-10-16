
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  findRouteInGraph,
} = require("../services/graphService");

const createGraph = () => {
  const stationMap = new Map();
  const adjacency = new Map();

  const addStation = (code) => {
    stationMap.set(code, {
      _id: code,
      code,
      name: code,
    });

    adjacency.set(code, []);
  };

  const addConnection = (
    from,
    to,
    lineId,
    travelTimeMinutes,
    distanceKm = 1
  ) => {
    const edge = {
      lineId,
      lineCode: lineId,
      lineName: lineId,
      lineColor: "#2563eb",
      travelTimeMinutes,
      distanceKm,
    };

    adjacency.get(from).push({
      ...edge,
      to,
    });

    adjacency.get(to).push({
      ...edge,
      to: from,
    });
  };

  return {
    stationMap,
    adjacency,
    addStation,
    addConnection,
  };
};

const buildSampleGraph = () => {
  const graph = createGraph();

  ["A", "B", "C", "D", "E", "F"].forEach(
    graph.addStation
  );

  // Shorter in stops, slower in time.
  graph.addConnection("A", "B", "BLUE", 5);
  graph.addConnection("B", "D", "BLUE", 5);

  // Faster, but includes a line change.
  graph.addConnection("A", "C", "RED", 2);
  graph.addConnection("C", "E", "RED", 2);
  graph.addConnection("E", "D", "GREEN", 2);

  // Separate station for disconnected-route tests.
  return graph;
};

test("time mode chooses the fastest route", () => {
  const graph = buildSampleGraph();

  const route = findRouteInGraph(
    graph,
    "A",
    "D",
    "time"
  );

  assert.deepEqual(
    route.path.map((station) => station.stationCode),
    ["A", "C", "E", "D"]
  );

  assert.equal(route.estimatedTravelTimeMinutes, 6);
  assert.equal(route.totalStops, 3);
  assert.equal(route.interchangeCount, 1);
});

test("stops mode chooses the fewest stops", () => {
  const graph = buildSampleGraph();

  const route = findRouteInGraph(
    graph,
    "A",
    "D",
    "stops"
  );

  assert.deepEqual(
    route.path.map((station) => station.stationCode),
    ["A", "B", "D"]
  );

  assert.equal(route.totalStops, 2);
  assert.equal(route.interchangeCount, 0);
});

test("interchanges mode prefers fewer transfers", () => {
  const graph = buildSampleGraph();

  const route = findRouteInGraph(
    graph,
    "A",
    "D",
    "interchanges"
  );

  assert.deepEqual(
    route.path.map((station) => station.stationCode),
    ["A", "B", "D"]
  );

  assert.equal(route.interchangeCount, 0);
});

test("same source and destination returns zero-length journey", () => {
  const graph = buildSampleGraph();

  const route = findRouteInGraph(
    graph,
    "A",
    "A",
    "time"
  );

  assert.equal(route.totalStops, 0);
  assert.equal(route.totalDistanceKm, 0);
  assert.equal(route.estimatedTravelTimeMinutes, 0);
  assert.equal(route.interchangeCount, 0);
  assert.equal(route.path.length, 1);
  assert.equal(route.path[0].stationCode, "A");
});

test("unknown station returns a 404 error", () => {
  const graph = buildSampleGraph();

  assert.throws(
    () =>
      findRouteInGraph(
        graph,
        "A",
        "UNKNOWN",
        "time"
      ),
    {
      message: "Source or destination station not found",
      status: 404,
    }
  );
});

test("invalid optimization mode returns a 400 error", () => {
  const graph = buildSampleGraph();

  assert.throws(
    () =>
      findRouteInGraph(
        graph,
        "A",
        "D",
        "distance"
      ),
    {
      message: "Invalid optimization mode",
      status: 400,
    }
  );
});

test("disconnected destination returns a 404 error", () => {
  const graph = buildSampleGraph();

  assert.throws(
    () =>
      findRouteInGraph(
        graph,
        "A",
        "F",
        "time"
      ),
    {
      message: "No route available between these stations",
      status: 404,
    }
  );
});

test("reconstructed path has consistent time and distance totals", () => {
  const graph = buildSampleGraph();

  for (const mode of [
    "time",
    "stops",
    "interchanges",
  ]) {
    const route = findRouteInGraph(
      graph,
      "A",
      "D",
      mode
    );

    const summedTime = route.path.reduce(
      (sum, station) =>
        sum + station.timeFromPreviousMinutes,
      0
    );

    const summedDistance = route.path.reduce(
      (sum, station) =>
        sum + station.distanceFromPreviousKm,
      0
    );

    assert.equal(
      summedTime,
      route.estimatedTravelTimeMinutes
    );

    assert.equal(
      Number(summedDistance.toFixed(2)),
      route.totalDistanceKm
    );

    assert.equal(
      route.path.length,
      route.totalStops + 1
    );
  }
});

test("reconstructed route follows actual graph edges", () => {
  const graph = buildSampleGraph();

  for (const mode of [
    "time",
    "stops",
    "interchanges",
  ]) {
    const route = findRouteInGraph(
      graph,
      "A",
      "D",
      mode
    );

    for (let index = 1; index < route.path.length; index++) {
      const previous = route.path[index - 1];
      const current = route.path[index];

      const matchingEdge = graph.adjacency
        .get(previous.stationCode)
        .find(
          (edge) =>
            edge.to === current.stationCode &&
            edge.lineCode === current.line.code &&
            edge.travelTimeMinutes ===
              current.timeFromPreviousMinutes
        );

      assert.ok(
        matchingEdge,
        `Invalid edge: ${previous.stationCode} -> ${current.stationCode}`
      );
    }
  }
});

test("route metadata remains compatible with the API", () => {
  const graph = buildSampleGraph();

  const route = findRouteInGraph(
    graph,
    "A",
    "D",
    "time"
  );

  assert.equal(route.source, "A");
  assert.equal(route.destination, "D");
  assert.equal(route.optimization, "time");
  assert.equal(route.dataQuality, "demonstration");

  assert.equal(route.path[0].line, null);

  assert.deepEqual(
    Object.keys(route.path[1].line).sort(),
    ["code", "color", "name"]
  );
});
