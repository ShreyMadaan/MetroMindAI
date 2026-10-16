
import {
  Clock3,
  TrainFront,
  GitBranch,
  CheckCircle2,
} from "lucide-react";

const modes = [
  {
    key: "time",
    title: "Fastest",
    description: "Minimum travel time",
    icon: Clock3,
    primaryMetric: (route) =>
      `${route.estimatedTravelTimeMinutes} min`,
  },
  {
    key: "stops",
    title: "Fewest Stops",
    description: "Minimum station hops",
    icon: TrainFront,
    primaryMetric: (route) =>
      `${route.totalStops} stops`,
  },
  {
    key: "interchanges",
    title: "Less Switching",
    description: "Minimum line changes",
    icon: GitBranch,
    primaryMetric: (route) =>
      `${route.interchangeCount} changes`,
  },
];

const getRouteSignature = (route) => {
  if (!route?.path) return "";

  return route.path
    .map(
      (station) =>
        `${station.stationCode}:${
          station.line?.code || ""
        }`
    )
    .join("|");
};

export default function RouteComparison({
  comparisons,
  activeMode,
  onSelect,
}) {
  if (!comparisons) return null;

  const seenRoutes = new Map();

  const duplicateModes = {};

  for (const mode of modes) {
    const route = comparisons[mode.key];

    if (!route) continue;

    const signature = getRouteSignature(route);

    if (seenRoutes.has(signature)) {
      duplicateModes[mode.key] = seenRoutes.get(signature);
    } else {
      seenRoutes.set(signature, mode.title);
    }
  }

  return (
    <section className="comparison-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            EXPLORE YOUR OPTIONS
          </p>
          <h2>Compare Routes</h2>
        </div>
      </div>

      <div className="comparison-grid">
        {modes.map((mode) => {
          const route = comparisons[mode.key];
          const Icon = mode.icon;

          if (!route) return null;

          const selected = activeMode === mode.key;
          const duplicateOf = duplicateModes[mode.key];

          return (
            <button
              key={mode.key}
              type="button"
              className={`comparison-card ${
                selected ? "comparison-card-active" : ""
              }`}
              onClick={() => onSelect(mode.key)}
              aria-pressed={selected}
            >
              <div className="comparison-card-top">
                <span className="comparison-icon">
                  <Icon size={20} />
                </span>

                {selected && (
                  <CheckCircle2
                    size={19}
                    className="comparison-selected-icon"
                  />
                )}
              </div>

              <h3>{mode.title}</h3>
              <p className="comparison-description">
                {mode.description}
              </p>

              <strong className="comparison-primary">
                {mode.primaryMetric(route)}
              </strong>

              <div className="comparison-metrics">
                <span>
                  <Clock3 size={14} />
                  {route.estimatedTravelTimeMinutes} min
                </span>

                <span>
                  <TrainFront size={14} />
                  {route.totalStops} stops
                </span>

                <span>
                  <GitBranch size={14} />
                  {route.interchangeCount} transfers
                </span>
              </div>

              {duplicateOf && (
                <span className="comparison-duplicate">
                  Same journey as {duplicateOf}
                </span>
              )}

              <span className="comparison-action">
                {selected
                  ? "Currently viewing"
                  : "View journey"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
