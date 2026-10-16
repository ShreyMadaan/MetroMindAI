
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  GitBranch,
  MapPinned,
  Network,
  RefreshCw,
  TrainFront,
  Waypoints,
} from "lucide-react";

import { getNetworkAnalytics } from "../services/api";

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN").format(value ?? 0);

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <article className="analytics-metric-card">
      <div className="analytics-metric-top">
        <span className="analytics-metric-icon">
          <Icon size={21} />
        </span>

        <ArrowUpRight
          size={16}
          className="analytics-arrow"
        />
      </div>

      <strong>{value}</strong>
      <span className="analytics-metric-label">
        {label}
      </span>
      <small>{detail}</small>
    </article>
  );
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getNetworkAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading && !analytics) {
    return (
      <section className="analytics-dashboard">
        <div className="analytics-status">
          <RefreshCw
            className="analytics-spinning"
            size={22}
          />
          Loading network analytics...
        </div>
      </section>
    );
  }

  if (error && !analytics) {
    return (
      <section className="analytics-dashboard">
        <div className="analytics-status analytics-error">
          <p>{error}</p>

          <button
            type="button"
            onClick={loadAnalytics}
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!analytics) return null;

  const {
    overview,
    graph,
    lines = [],
    interchangeStations = [],
  } = analytics;

  const maxStations = Math.max(
    1,
    ...lines.map((line) => line.stationCount)
  );

  return (
    <section
      className="analytics-dashboard"
      id="analytics"
    >
      {/* Dashboard heading */}
      <div className="analytics-heading">
        <div>
          <p className="eyebrow">
            NETWORK INTELLIGENCE
          </p>

          <h2>Metro Network Analytics</h2>

          <p>
            Explore the structure and connectivity of
            the MetroMind demonstration network.
          </p>
        </div>

        <button
          type="button"
          className="analytics-refresh"
          onClick={loadAnalytics}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={
              loading ? "analytics-spinning" : ""
            }
          />
          Refresh
        </button>
      </div>

      {error && (
        <p
          className="analytics-inline-error"
          role="alert"
        >
          Refresh failed: {error}. Showing the last
          loaded data.
        </p>
      )}

      {/* Network overview */}
      <div className="analytics-metrics-grid">
        <MetricCard
          icon={MapPinned}
          label="Active Stations"
          value={formatNumber(overview.totalStations)}
          detail="Graph vertices"
        />

        <MetricCard
          icon={TrainFront}
          label="Metro Lines"
          value={formatNumber(overview.totalLines)}
          detail="Active corridors"
        />

        <MetricCard
          icon={Network}
          label="Connections"
          value={formatNumber(overview.totalConnections)}
          detail="Graph edges"
        />

        <MetricCard
          icon={GitBranch}
          label="Interchanges"
          value={formatNumber(overview.totalInterchanges)}
          detail="Multi-line stations"
        />
      </div>

      {/* Primary row:
          Station Distribution + Interchange Stations */}
      <div className="analytics-main-grid">
        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <h3>Station Distribution</h3>
              <p>
                Stations served by each metro line
              </p>
            </div>

            <Waypoints size={21} />
          </div>

          <div className="analytics-line-list analytics-line-scroll">
            {lines.map((line) => (
              <div
                className="analytics-line-item"
                key={line.code}
              >
                <div className="analytics-line-label">
                  <span>
                    <i
                      className="analytics-line-dot"
                      style={{
                        backgroundColor: line.color,
                      }}
                    />
                    {line.name}
                  </span>

                  <strong>
                    {formatNumber(line.stationCount)}
                  </strong>
                </div>

                <div className="analytics-bar-track">
                  <div
                    className="analytics-bar-fill"
                    style={{
                      width: `${
                        (line.stationCount /
                          maxStations) *
                        100
                      }%`,
                      backgroundColor: line.color,
                    }}
                  />
                </div>

                <small>
                  {formatNumber(line.connectionCount)}{" "}
                  connections
                </small>
              </div>
            ))}
          </div>

          <p className="analytics-panel-note">
            Interchange stations can belong to multiple
            lines, so line station counts may exceed
            unique stations.
          </p>
        </article>

        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <h3>Interchange Stations</h3>
              <p>
                Stations connecting multiple lines
              </p>
            </div>

            <GitBranch size={21} />
          </div>

          <div className="analytics-interchanges analytics-interchange-list">
            {interchangeStations.length > 0 ? (
              interchangeStations.map((station) => (
                <div
                  className="analytics-interchange"
                  key={station.code}
                >
                  <span className="analytics-interchange-icon">
                    <GitBranch size={17} />
                  </span>

                  <span>{station.name}</span>
                </div>
              ))
            ) : (
              <p className="analytics-panel-note">
                No interchange stations found.
              </p>
            )}
          </div>

          <p className="analytics-panel-note">
            {formatNumber(interchangeStations.length)}{" "}
            interchange stations identified in the
            imported network.
          </p>
        </article>
      </div>

      {/* Secondary row:
          Graph Insights + Network Coverage */}
      <div className="analytics-secondary-grid">
        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <h3>Graph Insights</h3>
              <p>
                Connectivity and network structure
              </p>
            </div>

            <Activity size={21} />
          </div>

          <div className="analytics-graph-stats">
            <div>
              <span>Vertices</span>
              <strong>
                {formatNumber(graph.vertices)}
              </strong>
            </div>

            <div>
              <span>Edges</span>
              <strong>
                {formatNumber(graph.edges)}
              </strong>
            </div>

            <div>
              <span>Average Degree</span>
              <strong>
                {graph.averageDegree}
              </strong>
            </div>

            <div>
              <span>Isolated Stations</span>
              <strong>
                {formatNumber(
                  graph.isolatedStationCount
                )}
              </strong>
            </div>
          </div>

          <div className="analytics-network-status">
            <span className="analytics-status-dot" />

            {graph.isolatedStationCount === 0
              ? "No isolated stations detected"
              : `${graph.isolatedStationCount} isolated stations detected`}
          </div>
        </article>

        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <h3>Network Coverage</h3>
              <p>
                Imported demonstration data
              </p>
            </div>

            <MapPinned size={21} />
          </div>

          <div className="analytics-coverage-value">
            {formatNumber(
              overview.totalDistanceKm
            )}
            <span> km</span>
          </div>

          <p className="analytics-coverage-description">
            Sum of the imported connection distances.
            This is not a verified operational network
            length.
          </p>

          <div className="analytics-coverage-footer">
            <span>Dataset type</span>

            <strong>
              {analytics.dataQuality?.type ||
                "Unknown"}
            </strong>
          </div>
        </article>
      </div>

      {/* Data quality disclaimer */}
      {analytics.dataQuality?.note && (
        <p className="analytics-disclaimer">
          {analytics.dataQuality.note}
        </p>
      )}
    </section>
  );
}
