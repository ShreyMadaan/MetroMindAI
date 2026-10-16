
import {
  ArrowRight,
  Clock3,
  GitBranch,
  MapPinned,
  TrainFront,
  CircleDot,
  Flag,
  Info,
} from "lucide-react";

const DEFAULT_LINE_COLOR = "#2563eb";

const getLineColor = (line) =>
  line?.color || DEFAULT_LINE_COLOR;

const getLineName = (line) =>
  line?.name || line?.code || "Metro line";

const getOptimizationLabel = (optimization) => {
  switch (optimization) {
    case "time":
      return "Fastest route";
    case "stops":
      return "Fewest stops";
    case "interchanges":
      return "Fewest interchanges";
    default:
      return "Recommended route";
  }
};

export default function RouteResults({ route }) {
  if (!route || !Array.isArray(route.path)) {
    return null;
  }

  const path = route.path;

  // Each station's "line" describes the segment
  // used to arrive at that station.
  //
  // Therefore, the outgoing line from station i
  // is stored on station i + 1.

  const uniqueLines = [];
  const seenLines = new Set();

  for (let i = 1; i < path.length; i++) {
    const line = path[i].line;

    if (!line) continue;

    const key = line.code || line.name;

    if (!seenLines.has(key)) {
      seenLines.add(key);
      uniqueLines.push(line);
    }
  }

  const interchangeStations = [];

  for (let i = 1; i < path.length - 1; i++) {
    const incomingLine = path[i].line;
    const outgoingLine = path[i + 1].line;

    if (
      incomingLine?.code &&
      outgoingLine?.code &&
      incomingLine.code !== outgoingLine.code
    ) {
      interchangeStations.push({
        station: path[i].stationName,
        fromLine: incomingLine,
        toLine: outgoingLine,
      });
    }
  }

  const firstLine = path[1]?.line;

  return (
    <section className="results-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR JOURNEY</p>
          <h2>Recommended Route</h2>
        </div>

        <span className="result-badge">
          {getOptimizationLabel(route.optimization)}
        </span>
      </div>

      <div className="route-heading">
        <h3>{route.source}</h3>
        <ArrowRight size={20} />
        <h3>{route.destination}</h3>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <Clock3 size={21} />
          <strong>
            {route.estimatedTravelTimeMinutes} min
          </strong>
          <span>Estimated time</span>
        </div>

        <div className="metric-card">
          <TrainFront size={21} />
          <strong>{route.totalStops}</strong>
          <span>Station hops</span>
        </div>

        <div className="metric-card">
          <GitBranch size={21} />
          <strong>{route.interchangeCount}</strong>
          <span>Interchanges</span>
        </div>

        <div className="metric-card">
          <MapPinned size={21} />
          <strong>{route.totalDistanceKm} km</strong>
          <span>Distance</span>
        </div>
      </div>

      <div className="journey-overview">
        <div className="journey-overview-header">
          <h3>Journey overview</h3>
          <span>
            {path.length} stations on route
          </span>
        </div>

        <div className="journey-lines">
          {uniqueLines.map((line) => (
            <span
              key={line.code || line.name}
              className="journey-line-chip"
              style={{
                "--metro-color": getLineColor(line),
              }}
            >
              <span className="journey-line-dot" />
              {getLineName(line)}
            </span>
          ))}
        </div>

        <div className="journey-instructions">
          <div className="journey-instruction">
            <CircleDot size={18} />
            <span>
              Board at <strong>{path[0]?.stationName}</strong>
              {firstLine && (
                <>
                  {" "}on the{" "}
                  <strong>{getLineName(firstLine)}</strong>
                </>
              )}
            </span>
          </div>

          {interchangeStations.map((transfer, index) => (
            <div
              className="journey-instruction"
              key={`${transfer.station}-${index}`}
            >
              <GitBranch size={18} />
              <span>
                Change at{" "}
                <strong>{transfer.station}</strong>
                {" "}from{" "}
                <strong>
                  {getLineName(transfer.fromLine)}
                </strong>
                {" "}to{" "}
                <strong>
                  {getLineName(transfer.toLine)}
                </strong>
              </span>
            </div>
          ))}

          <div className="journey-instruction">
            <Flag size={18} />
            <span>
              Exit at{" "}
              <strong>
                {path[path.length - 1]?.stationName}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="timeline-card">
        <div className="timeline-card-header">
          <h3>Station-by-station journey</h3>
          <span>{route.totalStops} stops</span>
        </div>

        <div className="route-timeline">
          {path.map((station, index) => {
            const isStart = index === 0;
            const isEnd = index === path.length - 1;

            const incomingLine = station.line;
            const outgoingLine = path[index + 1]?.line;

            const isInterchange =
              !isStart &&
              !isEnd &&
              incomingLine?.code &&
              outgoingLine?.code &&
              incomingLine.code !== outgoingLine.code;

            const markerColor = getLineColor(
              outgoingLine || incomingLine
            );

            const segmentColor = getLineColor(outgoingLine);

            return (
              <div
                className={`timeline-item ${
                  isInterchange
                    ? "timeline-item-interchange"
                    : ""
                }`}
                key={`${station.stationCode}-${index}`}
              >
                <div className="timeline-marker">
                  <span
                    className={`timeline-dot ${
                      isStart || isEnd
                        ? "timeline-dot-endpoint"
                        : ""
                    }`}
                    style={{
                      borderColor: markerColor,
                      backgroundColor:
                        isStart || isEnd
                          ? markerColor
                          : "#ffffff",
                    }}
                  />

                  {!isEnd && (
                    <span
                      className="timeline-line"
                      style={{
                        backgroundColor: segmentColor,
                      }}
                    />
                  )}
                </div>

                <div className="timeline-content">
                  <div className="timeline-station">
                    <strong>{station.stationName}</strong>

                    {isStart && (
                      <span className="endpoint-tag">
                        START
                      </span>
                    )}

                    {isEnd && (
                      <span className="endpoint-tag">
                        END
                      </span>
                    )}

                    {isInterchange && (
                      <span className="interchange-tag">
                        <GitBranch size={12} />
                        INTERCHANGE
                      </span>
                    )}
                  </div>

                  {isStart && outgoingLine && (
                    <p className="station-action">
                      Board {getLineName(outgoingLine)}
                    </p>
                  )}

                  {!isStart && incomingLine && (
                    <div className="timeline-details">
                      <span
                        className="line-pill"
                        style={{
                          "--line-color":
                            getLineColor(incomingLine),
                        }}
                      >
                        {getLineName(incomingLine)}
                      </span>

                      <span>
                        +
                        {station.timeFromPreviousMinutes ?? 0}
                        {" "}min
                      </span>
                    </div>
                  )}

                  {isInterchange && (
                    <p className="transfer-note">
                      <GitBranch size={14} />
                      Change to{" "}
                      <strong>
                        {getLineName(outgoingLine)}
                      </strong>
                      {" "}at this station
                    </p>
                  )}

                  {isEnd && (
                    <p className="station-action">
                      You have reached your destination.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {route.dataQuality === "demonstration" && (
        <div className="demo-note">
          <Info size={17} />
          <span>
            Demonstration dataset: distances and travel
            times are illustrative, not live Delhi Metro
            estimates.
          </span>
        </div>
      )}
    </section>
  );
}
