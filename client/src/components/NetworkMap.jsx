
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";

import {
  GitBranch,
  LocateFixed,
  Map as MapIcon,
  RefreshCw,
  TrainFront,
  X,
} from "lucide-react";

import "@xyflow/react/dist/style.css";

const NODE_WIDTH = 176;
const NODE_HEIGHT = 64;
const NODE_GAP = 240;
const ROW_GAP = 125;
const MAX_COLUMNS = 7;

const normalizeColor = (color) => {
  if (typeof color !== "string") return "#64748b";

  const namedColors = {
    BLUE: "#2563eb",
    YELLOW: "#eab308",
    RED: "#dc2626",
    GREEN: "#16a34a",
    VIOLET: "#7c3aed",
    PINK: "#ec4899",
    MAGENTA: "#d946ef",
    GREY: "#64748b",
    GRAY: "#64748b",
    ORANGE: "#f97316",
  };

  return namedColors[color.toUpperCase()] || color;
};

function StationNode({ data }) {
  return (
    <div
      className={`metro-station-node ${
        data.isOnRoute ? "on-route" : ""
      } ${data.isSelected ? "is-selected" : ""}`}
      style={{
        "--station-color": normalizeColor(data.color),
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
      />

      <div className="metro-station-node-top">
        <span className="metro-station-dot" />

        {data.isInterchange && (
          <GitBranch size={13} />
        )}
      </div>

      <span className="metro-station-name">
        {data.label}
      </span>

      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
      />
    </div>
  );
}

const nodeTypes = {
  station: StationNode,
};

function getStationOrder(stations, connections) {
  const stationMap = new Map(
    stations.map((station) => [station.id, station])
  );

  const adjacency = new Map(
    stations.map((station) => [station.id, []])
  );

  for (const connection of connections) {
    if (
      !adjacency.has(connection.source) ||
      !adjacency.has(connection.target)
    ) {
      continue;
    }

    adjacency.get(connection.source).push(
      connection.target
    );

    adjacency.get(connection.target).push(
      connection.source
    );
  }

  const visited = new Set();
  const ordered = [];

  const walk = (start) => {
    const queue = [start];
    visited.add(start);

    while (queue.length) {
      const current = queue.shift();
      ordered.push(current);

      const neighbors = [...adjacency.get(current)].sort(
        (a, b) =>
          (adjacency.get(a)?.length || 0) -
            (adjacency.get(b)?.length || 0) ||
          stationMap.get(a).name.localeCompare(
            stationMap.get(b).name
          )
      );

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  };

  const endpoints = stations
    .filter(
      (station) =>
        (adjacency.get(station.id)?.length || 0) <= 1
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const station of endpoints) {
    if (!visited.has(station.id)) {
      walk(station.id);
    }
  }

  for (const station of stations) {
    if (!visited.has(station.id)) {
      walk(station.id);
    }
  }

  return ordered;
}

function getLayout(stations, connections, orderedCodes) {
  const stationByCode = new Map(
    stations.map((station) => [station.code, station])
  );

  let orderedIds;

  if (orderedCodes?.length) {
    orderedIds = orderedCodes
      .map((code) => stationByCode.get(code)?.id)
      .filter(Boolean);
  } else {
    orderedIds = getStationOrder(
      stations,
      connections
    );
  }

  const seen = new Set();
  const uniqueIds = orderedIds.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return new Map(
    uniqueIds.map((id, index) => {
      const row = Math.floor(index / MAX_COLUMNS);
      const column = index % MAX_COLUMNS;

      const serpentineColumn =
        row % 2 === 0
          ? column
          : MAX_COLUMNS - 1 - column;

      return [
        id,
        {
          x: serpentineColumn * NODE_GAP,
          y: row * ROW_GAP,
        },
      ];
    })
  );
}

function NetworkMapContent({ route }) {
  const [network, setNetwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLine, setSelectedLine] =
    useState("ALL");
  const [selectedStationId, setSelectedStationId] =
    useState(null);

  const { fitView } = useReactFlow();

  const loadNetwork = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const baseUrl = (
        import.meta.env.VITE_API_URL ||
        "http://localhost:5000/api"
      ).replace(/\/$/, "");

      const response = await fetch(
        `${baseUrl}/network/map`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load network"
        );
      }

      setNetwork(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNetwork();
  }, [loadNetwork]);

  const stationById = useMemo(
    () =>
      new Map(
        (network?.stations || []).map((station) => [
          station.id,
          station,
        ])
      ),
    [network]
  );

  const routeCodes = useMemo(
    () =>
      (route?.path || []).map(
        (station) => station.stationCode
      ),
    [route]
  );

  const routeCodeSet = useMemo(
    () => new Set(routeCodes),
    [routeCodes]
  );

  const journeyMode =
    selectedLine === "JOURNEY" && routeCodes.length > 0;

  const visibleStations = useMemo(() => {
    if (!network) return [];

    if (journeyMode) {
      return network.stations.filter((station) =>
        routeCodeSet.has(station.code)
      );
    }

    if (selectedLine === "ALL") {
      return network.stations.filter(
        (station) => station.isInterchange
      );
    }

    return network.stations.filter((station) =>
      station.lines.some(
        (line) => line.code === selectedLine
      )
    );
  }, [
    network,
    journeyMode,
    selectedLine,
    routeCodeSet,
  ]);

  const visibleIds = useMemo(
    () =>
      new Set(
        visibleStations.map((station) => station.id)
      ),
    [visibleStations]
  );

  const visibleConnections = useMemo(() => {
    if (!network) return [];

    return network.connections.filter(
      (connection) => {
        if (
          !visibleIds.has(connection.source) ||
          !visibleIds.has(connection.target)
        ) {
          return false;
        }

        if (
          selectedLine !== "ALL" &&
          selectedLine !== "JOURNEY"
        ) {
          return connection.lineCode === selectedLine;
        }

        return true;
      }
    );
  }, [network, visibleIds, selectedLine]);

  const routeEdgeKeys = useMemo(() => {
    const keys = new Set();

    const path = route?.path || [];

    for (let i = 1; i < path.length; i++) {
      const previous = path[i - 1];
      const current = path[i];

      const lineCode = current.line?.code;

      if (!lineCode) continue;

      keys.add(
        `${[
          previous.stationCode,
          current.stationCode,
        ]
          .sort()
          .join("|")}|${lineCode}`
      );
    }

    return keys;
  }, [route]);

  const positions = useMemo(
    () =>
      getLayout(
        visibleStations,
        visibleConnections,
        journeyMode ? routeCodes : null
      ),
    [
      visibleStations,
      visibleConnections,
      journeyMode,
      routeCodes,
    ]
  );

  const nodes = useMemo(
    () =>
      visibleStations.map((station) => ({
        id: station.id,
        type: "station",
        position: positions.get(station.id) || {
          x: 0,
          y: 0,
        },
        data: {
          label: station.name,
          color:
            station.lines.find(
              (line) => line.code === selectedLine
            )?.color ||
            station.lines[0]?.color ||
            "#64748b",
          isInterchange: station.isInterchange,
          isOnRoute: routeCodeSet.has(station.code),
          isSelected:
            selectedStationId === station.id,
        },
      })),
    [
      visibleStations,
      positions,
      selectedLine,
      routeCodeSet,
      selectedStationId,
    ]
  );

  const edges = useMemo(() => {
    return visibleConnections.map((connection) => {
      const source = stationById.get(
        connection.source
      );
      const target = stationById.get(
        connection.target
      );

      const key = `${[
        source.code,
        target.code,
      ]
        .sort()
        .join("|")}|${connection.lineCode}`;

      const highlighted = routeEdgeKeys.has(key);

      return {
        id: connection.id,
        source: connection.source,
        target: connection.target,
        type: "smoothstep",
        animated: highlighted,
        style: {
          stroke: normalizeColor(
            connection.lineColor
          ),
          strokeWidth: highlighted ? 5 : 3,
          opacity:
            routeCodes.length > 0 && !highlighted
              ? 0.22
              : 0.85,
        },
      };
    });
  }, [
    visibleConnections,
    stationById,
    routeEdgeKeys,
    routeCodes,
  ]);

  useEffect(() => {
    if (!network) return;

    const frame = requestAnimationFrame(() => {
      fitView({
        padding: 0.2,
        duration: 400,
        maxZoom: 1.1,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [
    network,
    selectedLine,
    fitView,
  ]);

  useEffect(() => {
    if (routeCodes.length > 0) {
      setSelectedLine("JOURNEY");
    }
  }, [routeCodes]);

  const selectedStation = selectedStationId
    ? stationById.get(selectedStationId)
    : null;

  return (
    <section
      className="network-map-section"
      id="network-map"
    >
      <div className="network-map-heading">
        <div>
          <p className="eyebrow">
            INTERACTIVE NETWORK EXPLORER
          </p>
          <h2>Explore the Metro Network</h2>
          <p>
            Discover metro lines, inspect
            interchanges, and explore your
            optimized journey.
          </p>
        </div>

        <button
          type="button"
          className="network-map-refresh"
          onClick={loadNetwork}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh Map
        </button>
      </div>

      {network && (
        <div className="metro-map-line-tabs">
          <button
            type="button"
            className={
              selectedLine === "ALL" ? "active" : ""
            }
            onClick={() => setSelectedLine("ALL")}
          >
            Network Overview
          </button>

          {routeCodes.length > 0 && (
            <button
              type="button"
              className={
                selectedLine === "JOURNEY"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSelectedLine("JOURNEY")
              }
            >
              <LocateFixed size={15} />
              My Journey
            </button>
          )}

          {network.lines.map((line) => (
            <button
              type="button"
              key={line.code}
              className={
                selectedLine === line.code
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSelectedLine(line.code)
              }
            >
              <span
                className="metro-line-tab-dot"
                style={{
                  background: normalizeColor(
                    line.color
                  ),
                }}
              />
              {line.name}
            </button>
          ))}
        </div>
      )}

      {loading && !network && (
        <div className="network-map-status">
          Loading metro network...
        </div>
      )}

      {error && (
        <p className="network-map-error" role="alert">
          {error}
        </p>
      )}

      {network && (
        <>
          <div className="metro-map-info-bar">
            <div>
              <MapIcon size={16} />
              <strong>
                {selectedLine === "ALL"
                  ? "Interchange Overview"
                  : journeyMode
                  ? "Your Optimized Journey"
                  : network.lines.find(
                      (line) =>
                        line.code === selectedLine
                    )?.name || "Metro Line"}
              </strong>
            </div>

            <span>
              {visibleStations.length} stations
            </span>
          </div>

          <div className="network-map-canvas metro-map-canvas">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) =>
                setSelectedStationId(node.id)
              }
              nodesDraggable={false}
              nodesConnectable={false}
              fitView
              minZoom={0.15}
              maxZoom={2}
              proOptions={{
                hideAttribution: true,
              }}
            >
              <Background
                color="#e2e8f0"
                gap={24}
              />
              <Controls />
            </ReactFlow>
          </div>

          {selectedStation && (
            <div className="network-station-details">
              <div className="network-station-title">
                {selectedStation.isInterchange ? (
                  <GitBranch size={20} />
                ) : (
                  <TrainFront size={20} />
                )}

                <div>
                  <h3>{selectedStation.name}</h3>
                  <p>
                    {selectedStation.isInterchange
                      ? "Interchange station"
                      : "Metro station"}
                  </p>
                </div>
              </div>

              <div className="network-station-lines">
                {selectedStation.lines.map(
                  (line) => (
                    <span
                      key={line.code}
                      className="network-line-chip"
                    >
                      <i
                        style={{
                          backgroundColor:
                            normalizeColor(
                              line.color
                            ),
                        }}
                      />
                      {line.name}
                    </span>
                  )
                )}
              </div>

              <button
                type="button"
                className="metro-station-close"
                onClick={() =>
                  setSelectedStationId(null)
                }
                aria-label="Close station details"
              >
                <X size={18} />
              </button>
            </div>
          )}

          <p className="network-map-note">
            <MapIcon size={14} />
            Schematic visualization based on
            imported graph connectivity.
            Not a geographically accurate map.
          </p>
        </>
      )}
    </section>
  );
}

export default function NetworkMap({ route = null }) {
  return (
    <ReactFlowProvider>
      <NetworkMapContent route={route} />
    </ReactFlowProvider>
  );
}
