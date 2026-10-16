# MetroMind AI — Routing Algorithms

## Graph model

Metro stations form vertices and adjacent travel segments form edges. Line identity is part of the search state so transfers can be counted. The graph service exports `buildGraph`, `findRouteInGraph`, and `calculateRoute`.

A conceptual search state is:

```text
(station, currentLine)
```

Moving along the same line advances to the next station; switching line identity at an interchange adds a transfer. The implementation uses a Dijkstra-style search with a lexicographic comparison of route costs and parent references to reconstruct the selected path.

## Three optimization objectives

| Mode | Primary objective | Other measures |
|---|---|---|
| `time` | Minimize estimated travel time | Used for route reporting / tie-breaking as implemented |
| `stops` | Minimize station-to-station segments | Used for route reporting / tie-breaking as implemented |
| `interchanges` | Minimize line transfers | Used for route reporting / tie-breaking as implemented |

The routing algorithm evaluates a vector of costs in priority order rather than treating all objectives as equivalent. The precise tie-break ordering should be documented from the current comparator code before making formal optimality claims.

## Conceptual pseudocode

```text
build a graph from stations, lines, and connections
initialize a priority frontier at the source station
store best-known cost for each (station, line) state

while frontier is not empty:
    extract the state with the best cost for the chosen mode
    if destination reached, reconstruct path from parent references
    for each permitted adjacent segment:
        calculate added time, stops, and line changes
        form candidate cumulative cost
        if candidate is lexicographically better:
            update best cost and parent
            add candidate to frontier

return selected route, or report that no route exists
```

## Complexity

For a standard Dijkstra implementation using a binary heap and adjacency lists, the typical bound is `O((V' + E') log V')`, where `V'` and `E'` refer to the **expanded station-line state graph**, not merely physical stations and connections. Actual complexity depends on the priority queue and data structures used by `graphService.js`; verify them before asserting that bound for this implementation.

## Returned route data

The application reports source, destination, optimization mode, station path, stop count, estimated distance, estimated travel time, interchange count, and demonstration-data quality labeling.

## Limitations

- Estimated time and distance per connection are illustrative.
- Real-time train arrivals, delays, closures, crowding, fares, and walking times are not modeled.
- Topological consistency does not prove that every represented transfer or line connection matches the live network.
- A route optimal under one metric need not be optimal under another.

## Verification

Regression tests cover graph and optimization behavior; network scripts test imported graph integrity and selected station pairs. See [TESTING.md](TESTING.md).
