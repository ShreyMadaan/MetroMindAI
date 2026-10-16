
const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

const request = async (endpoint) => {
  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`);
  } catch {
    throw new Error(
      `Cannot connect to MetroMind API at ${API_URL}. Check that the backend is running.`
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `Server returned an invalid response (HTTP ${response.status}).`
    );
  }

  if (!response.ok || result.success !== true) {
    throw new Error(
      result.message ||
      `API request failed (HTTP ${response.status}).`
    );
  }

  return result;
};

export const getStations = async () => {
  const result = await request("/stations");

  if (!Array.isArray(result.data)) {
    throw new Error("Station API returned an invalid data format.");
  }

  return result.data;
};

export const getRoute = async ({
  source,
  destination,
  optimize = "time",
}) => {
  const params = new URLSearchParams({
    source,
    destination,
    optimize,
  });

  const result = await request(
    `/routes?${params.toString()}`
  );

  return result.data;
};

export const getRouteComparisons = async ({
  source,
  destination,
}) => {
  const modes = ["time", "stops", "interchanges"];

  const results = await Promise.allSettled(
    modes.map((optimize) =>
      getRoute({ source, destination, optimize })
    )
  );

  const comparisons = {};
  const errors = [];

  results.forEach((result, index) => {
    const mode = modes[index];

    if (result.status === "fulfilled") {
      comparisons[mode] = result.value;
    } else {
      errors.push({
        mode,
        message:
          result.reason?.message ||
          "Unable to calculate this route.",
      });
    }
  });

  if (Object.keys(comparisons).length === 0) {
    throw new Error(
      errors[0]?.message ||
      "Unable to calculate routes."
    );
  }

  return { comparisons, errors };
};


export const getNetworkAnalytics = async () => {
  const result = await request("/analytics/network");

  if (!result.data?.overview || !result.data?.graph) {
    throw new Error(
      "Analytics API returned an invalid data format."
    );
  }

  return result.data;
};
