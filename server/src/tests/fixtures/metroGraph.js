
const createTestGraph = () => {
  const stationMap = new Map();
  const adjacency = new Map();

  const stations = ["A", "B", "C", "D", "E", "F", "G"];

  for (const code of stations) {
    stationMap.set(code, {
      _id: code,
      code,
      name: `Station ${code}`,
    });

    adjacency.set(code, []);
  }

  const addConnection = (
    from,
    to,
    lineCode,
    minutes,
    distance = 1
  ) => {
    const edge = {
      lineId: lineCode,
      lineCode,
      lineName: `${lineCode} Line`,
      lineColor: "#2563EB",
      distanceKm: distance,
      travelTimeMinutes: minutes,
    };

    adjacency.get(from).push({ ...edge, to });
    adjacency.get(to).push({ ...edge, to: from });
  };

  // Blue: 2 hops, 12 minutes, 0 interchanges
  addConnection("A", "B", "BLUE", 6);
  addConnection("B", "F", "BLUE", 6);

  // Green: 4 hops, 4 minutes, 0 interchanges
  addConnection("A", "D", "GREEN", 1);
  addConnection("D", "E", "GREEN", 1);
  addConnection("E", "G", "GREEN", 1);
  addConnection("G", "F", "GREEN", 1);

  // Mixed: 2 hops, 6 minutes, 1 interchange
  addConnection("A", "C", "RED", 3);
  addConnection("C", "F", "YELLOW", 3);

  return { stationMap, adjacency };
};

module.exports = { createTestGraph };
