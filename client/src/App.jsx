import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeftRight,
  ArrowRight,
  BrainCircuit,
  Clock3,
  GitBranch,
  LogIn,
  LogOut,
  RefreshCw,
  TrainFront,
  UserRound,
} from "lucide-react";

import StationSelect from "./components/StationSelect";
import RouteResults from "./components/RouteResults";
import RouteComparison from "./components/RouteComparison";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import NetworkMap from "./components/NetworkMap";
import AuthModal from "./components/AuthModal";

import {
  getStations,
  getRouteComparisons,
  getCurrentUser,
} from "./services/api";

import "./App.css";
import "./Auth.css";

const TOKEN_KEY = "metromind_auth_token";

const optimizationModes = [
  {
    value: "time",
    title: "Fastest",
    description: "Minimum travel time",
    icon: Clock3,
  },
  {
    value: "stops",
    title: "Fewest Stops",
    description: "Minimum station hops",
    icon: TrainFront,
  },
  {
    value: "interchanges",
    title: "Less Switching",
    description: "Minimum line changes",
    icon: GitBranch,
  },
];

function App() {
  const [stations, setStations] = useState([]);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [optimize, setOptimize] = useState("time");

  const [comparisons, setComparisons] =
    useState(null);

  const [activeMode, setActiveMode] =
    useState("time");

  const [loading, setLoading] = useState(false);

  const [stationsLoading, setStationsLoading] =
    useState(true);

  const [stationsError, setStationsError] =
    useState("");

  const [routeError, setRouteError] =
    useState("");

  const [
    comparisonWarnings,
    setComparisonWarnings,
  ] = useState([]);

  // ==============================
  // Authentication
  // ==============================

  const [token, setToken] = useState(() =>
    sessionStorage.getItem(TOKEN_KEY)
  );

  const [user, setUser] = useState(null);

  const [authLoading, setAuthLoading] =
    useState(Boolean(token));

  const [authModal, setAuthModal] =
    useState(null);

  const [authError, setAuthError] =
    useState("");

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setAuthLoading(false);
    setAuthError("");
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return;
    }

    let cancelled = false;

    const restoreSession = async () => {
      setAuthLoading(true);

      try {
        const result = await getCurrentUser(token);

        if (cancelled) return;

        const account =
          result.data?.user ||
          result.data ||
          result.user;

        if (
          !account ||
          typeof account !== "object" ||
          !account.email
        ) {
          throw new Error(
            "Unable to verify your account."
          );
        }

        setUser(account);
        setAuthError("");
      } catch (error) {
        if (cancelled) return;

        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);

        setAuthError(
          error.message ||
          "Your session could not be verified."
        );
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAuthenticated = (newToken) => {
    sessionStorage.setItem(
      TOKEN_KEY,
      newToken
    );

    setAuthError("");
    setToken(newToken);
    setAuthModal(null);
  };

  // ==============================
  // Stations
  // ==============================

  const loadStations = useCallback(async () => {
    try {
      setStationsLoading(true);
      setStationsError("");

      const data = await getStations();

      setStations(data);

      if (data.length === 0) {
        setStationsError(
          "No active metro stations found in the database."
        );
      }
    } catch (error) {
      setStations([]);
      setStationsError(error.message);
    } finally {
      setStationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  // ==============================
  // Route planner
  // ==============================

  const resetResults = () => {
    setComparisons(null);
    setComparisonWarnings([]);
    setRouteError("");
  };

  const handleSwap = () => {
    setSource(destination);
    setDestination(source);
    resetResults();
  };

  const handleStationChange = (
    field,
    value
  ) => {
    if (field === "source") {
      setSource(value);
    } else {
      setDestination(value);
    }

    resetResults();
  };

  const handleFindRoute = async (event) => {
    event.preventDefault();

    if (!source || !destination) {
      setRouteError(
        "Please select both metro stations."
      );
      return;
    }

    if (source === destination) {
      setRouteError(
        "Please select two different stations."
      );
      return;
    }

    setLoading(true);
    resetResults();

    try {
      const result =
        await getRouteComparisons({
          source,
          destination,
        });

      setComparisons(result.comparisons);

      setComparisonWarnings(
        result.errors || []
      );

      const preferredMode =
        result.comparisons[optimize]
          ? optimize
          : Object.keys(
              result.comparisons
            )[0];

      setActiveMode(preferredMode);
    } catch (error) {
      setRouteError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const activeRoute =
    comparisons?.[activeMode] || null;

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.email?.split("@")[0] ||
    "Account";

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container nav-container">
          <a href="/" className="brand">
            <span className="brand-icon">
              <TrainFront size={22} />
            </span>

            <span className="brand-text">
              <span className="brand-name">
                <span className="brand-primary">
                  MetroMind
                </span>{" "}
                <span className="brand-accent">
                  AI
                </span>
              </span>

              <span className="brand-credit">
                <span className="brand-by">
                  by
                </span>{" "}
                <span className="brand-primary">
                  Shrey
                </span>{" "}
                <span className="brand-accent">
                  Madaan
                </span>
              </span>
            </span>
          </a>

          <div className="nav-right">
            <span className="nav-caption">
              Intelligent Metro Navigation
            </span>

            <span className="version-badge">
              BETA
            </span>

            {authLoading ? (
              <span className="nav-auth-status">
                Checking session...
              </span>
            ) : user ? (
              <div className="nav-user">
                <span className="nav-user-name">
                  <UserRound size={17} />
                  {displayName}
                </span>

                <button
                  type="button"
                  className="nav-logout-button"
                  onClick={handleLogout}
                  title="Logout"
                >
                  <LogOut size={17} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="nav-auth-actions">
                <button
                  type="button"
                  className="nav-login-button"
                  onClick={() =>
                    setAuthModal("login")
                  }
                >
                  <LogIn size={17} />
                  Login
                </button>

                <button
                  type="button"
                  className="nav-signup-button"
                  onClick={() =>
                    setAuthModal("signup")
                  }
                >
                  Sign Up
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="container hero-content">
            <div className="hero-badge">
              <BrainCircuit size={15} />
              SMART ROUTE OPTIMIZATION
            </div>

            <h1>
              Navigate smarter.
              <br />
              <span>Travel better.</span>
            </h1>

            <p className="hero-description">
              Discover metro routes optimized for your
              priorities. Compare travel time, station
              stops, and line interchanges.
            </p>

            {user && (
              <p className="auth-welcome">
                Welcome back, {displayName}!
              </p>
            )}

            {authError && !user && (
              <p
                className="auth-session-error"
                role="alert"
              >
                {authError}
              </p>
            )}

            <div className="hero-stats">
              <div>
                <strong>3</strong>
                <span>Optimization modes</span>
              </div>

              <div className="stat-divider" />

              <div>
                <strong>
                  {stations.length}
                </strong>
                <span>Demo stations</span>
              </div>

              <div className="stat-divider" />

              <div>
                <strong>10</strong>
                <span>
                  Algorithm tests passed
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="planner-section">
          <div className="container">
            <div className="planner-card">
              <div className="planner-header">
                <div>
                  <p className="eyebrow">
                    METROMIND ROUTE PLANNER
                  </p>

                  <h2>
                    Where are we heading?
                  </h2>
                </div>

                <div className="planner-header-icon">
                  <TrainFront size={24} />
                </div>
              </div>

              {stationsError && (
                <div
                  className="error-message"
                  role="alert"
                >
                  <p>{stationsError}</p>

                  <button
                    type="button"
                    onClick={loadStations}
                    disabled={stationsLoading}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "10px",
                      padding: "9px 12px",
                      border:
                        "1px solid #fecaca",
                      borderRadius: "8px",
                      background: "#ffffff",
                      color: "#b91c1c",
                      fontWeight: 700,
                    }}
                  >
                    <RefreshCw size={16} />
                    Retry loading stations
                  </button>
                </div>
              )}

              <form onSubmit={handleFindRoute}>
                <div className="station-fields">
                  <StationSelect
                    label="Starting station"
                    placeholder="Select origin"
                    stations={stations}
                    value={source}
                    disabled={
                      stationsLoading ||
                      stations.length === 0
                    }
                    onChange={(value) =>
                      handleStationChange(
                        "source",
                        value
                      )
                    }
                  />

                  <button
                    type="button"
                    className="swap-button"
                    onClick={handleSwap}
                    aria-label="Swap stations"
                    title="Swap stations"
                    disabled={stationsLoading}
                  >
                    <ArrowLeftRight
                      size={19}
                    />
                  </button>

                  <StationSelect
                    label="Destination station"
                    placeholder="Select destination"
                    stations={stations}
                    value={destination}
                    disabled={
                      stationsLoading ||
                      stations.length === 0
                    }
                    onChange={(value) =>
                      handleStationChange(
                        "destination",
                        value
                      )
                    }
                  />
                </div>

                <div className="preferences">
                  <h3>
                    Optimize your journey
                  </h3>

                  <div className="optimization-grid">
                    {optimizationModes.map(
                      (mode) => {
                        const Icon =
                          mode.icon;

                        return (
                          <button
                            type="button"
                            key={mode.value}
                            className={`optimization-option ${
                              optimize ===
                              mode.value
                                ? "selected"
                                : ""
                            }`}
                            onClick={() => {
                              setOptimize(
                                mode.value
                              );

                              if (
                                comparisons?.[
                                  mode.value
                                ]
                              ) {
                                setActiveMode(
                                  mode.value
                                );
                              }
                            }}
                          >
                            <Icon size={20} />

                            <strong>
                              {mode.title}
                            </strong>

                            <span>
                              {
                                mode.description
                              }
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {routeError && (
                  <p
                    className="error-message"
                    role="alert"
                  >
                    {routeError}
                  </p>
                )}

                <button
                  type="submit"
                  className="find-route-button"
                  disabled={
                    loading ||
                    stationsLoading ||
                    stations.length === 0
                  }
                >
                  {loading
                    ? "Comparing routes..."
                    : stationsLoading
                    ? "Loading stations..."
                    : "Compare Best Routes"}

                  {!loading && (
                    <ArrowRight
                      size={20}
                    />
                  )}
                </button>
              </form>
            </div>

            {comparisons && (
              <>
                <RouteComparison
                  comparisons={comparisons}
                  activeMode={activeMode}
                  onSelect={(mode) => {
                    setActiveMode(mode);
                    setOptimize(mode);
                  }}
                />

                {comparisonWarnings.length >
                  0 && (
                  <p
                    className="error-message"
                    role="status"
                  >
                    Some route calculations
                    were unavailable:{" "}
                    {comparisonWarnings
                      .map(
                        (warning) =>
                          `${warning.mode}: ${warning.message}`
                      )
                      .join("; ")}
                  </p>
                )}

                <RouteResults
                  route={activeRoute}
                />
              </>
            )}

            <NetworkMap
              route={activeRoute}
            />

            <AnalyticsDashboard />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-content">
          <span>
            MetroMind AI · Designed &
            Developed by{" "}
            <strong>
              Shrey Madaan
            </strong>
          </span>

          <span>
            Intelligent Metro Navigation
            & Analytics
          </span>
        </div>
      </footer>

      {authModal && (
        <AuthModal
          initialMode={authModal}
          onClose={() =>
            setAuthModal(null)
          }
          onAuthenticated={
            handleAuthenticated
          }
        />
      )}
    </div>
  );
}

export default App;