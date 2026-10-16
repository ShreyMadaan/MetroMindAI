# MetroMind AI — Architecture

## System design

MetroMind AI follows a client-server MERN architecture. The React/Vite frontend requests data from an Express REST API. The server separates route definitions, controllers, graph processing, and Mongoose persistence. MongoDB Atlas stores network and user records.

```text
Browser (React/Vite)
  |-- station search and route comparison
  |-- analytics dashboard
  |-- React Flow network explorer
  |
  v HTTP (VITE_API_URL)
Express app (server/src/app.js)
  |-- /api/auth       -> authRoutes / authController
  |-- /api/stations   -> stationRoutes / stationController
  |-- /api/routes     -> routeRoutes / routeController
  |-- /api/analytics  -> analyticsRoutes / analyticsController
  |-- /api/network    -> networkRoutes / networkController
  |
  |-- graphService.js (graph construction and route computation)
  |-- middleware (authentication and errors)
  v
Mongoose models -> MongoDB Atlas
```

## Persisted entities

The backend contains the following model modules:

- `User.js` — user accounts and authentication data
- `Station.js` — station records and line memberships
- `MetroLine.js` — metro line records and visual metadata
- `Connection.js` — graph links between stations, associated with metro lines

Exact schema fields and indexes should be checked against the source model definitions before a formal ER diagram is finalized.

## Backend components

- `server/src/app.js`: environment loading, CORS, JSON parsing, health endpoint, API mounting, database startup, and error middleware.
- `server/src/services/graphService.js`: `buildGraph`, `findRouteInGraph`, and `calculateRoute`.
- `server/src/controllers/networkController.js`: produces the station/line/connection payload for the frontend explorer.
- `server/src/scripts/importMetroNetwork.js`: imports the demonstration network.
- `server/src/scripts/validateMetroNetwork.js`: checks graph data integrity.
- `server/src/scripts/testNetworkRoutes.js`: runs route checks on imported network data.

## Frontend components

The frontend uses React for state and rendering, a shared API service for route and analytics requests, and React Flow for the network explorer. The explorer supports line selection, journey focus, station inspection, zooming, and panning. Its coordinates are schematic rather than geographical.

## Runtime configuration

- `MONGO_URI`: database connection string, server only
- `JWT_SECRET`: token signing secret, server only
- `CLIENT_URL`: permitted frontend origin(s) for CORS
- `PORT`: backend listen port
- `VITE_API_URL`: public frontend build-time API base URL

Never place `JWT_SECRET` or MongoDB credentials in Vite variables; `VITE_*` variables are exposed to client bundles.

## Request example

1. User selects source, destination, and optimization mode.
2. Frontend requests `/api/routes` with query parameters.
3. Controller retrieves required network data and delegates to graph computation.
4. Graph service calculates a path with the selected objective.
5. API returns stations, estimated time/distance, stops, and interchange count.
6. Frontend renders route details, comparison, and highlighted map path.

## Operational boundaries

The current system is a demonstrator, not an official Delhi Metro journey planner. Network topology and travel estimates require verification against authoritative datasets before production travel use. Network validation checks internal consistency, not real-world truth.
