# MetroMind AI

**Metro route planning, multi-criteria optimization, and network analytics**  
MS Computer Science capstone | MERN stack

MetroMind AI is a full-stack metro route planning application. It calculates routes between stations using graph-based optimization, compares travel objectives, visualizes the station network, and presents network analytics. The current imported network is a **demonstration dataset**, not a live official transit feed.

## Features

- Searchable source and destination station selection
- Route optimization by **estimated time**, **number of stops**, or **interchanges**
- Side-by-side comparison of optimization modes
- Interactive line-focused network explorer and route highlighting
- Network analytics, including line distribution and interchange insights
- User registration, login, and authenticated profile endpoint
- REST APIs backed by MongoDB Atlas

**Scope note:** The product name includes “AI,” but the implemented route engine is deterministic graph search; conversational AI and predictive models are future work. Estimated edge times and distances are illustrative, not verified operational values. The schematic map is not geographically accurate.

## Technology

| Layer | Stack |
|---|---|
| Frontend | React 19, Vite 8, React Flow, Lucide icons, CSS |
| Backend | Node.js, Express 5, CommonJS |
| Database | MongoDB Atlas, Mongoose 9 |
| Authentication | bcryptjs, JSON Web Tokens |
| Testing | Node.js built-in test runner and network validation scripts |

## Architecture

```text
React + Vite client
    | HTTP /api/*
Express REST API
    |-- auth / stations / routes / analytics / network
    |-- controllers -> services -> Mongoose models
    |                       |            |
    |                 graphService     MongoDB Atlas
    +-- import, validation, and route-check scripts
```

See [ARCHITECTURE.md](ARCHITECTURE.md) and [ALGORITHMS.md](ALGORITHMS.md).

## Repository layout

```text
metromind-ai/
├── client/                # React frontend
├── server/
│   └── src/
│       ├── app.js
│       ├── config/
│       ├── controllers/
│       ├── data/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── scripts/
│       ├── services/graphService.js
│       └── tests/
├── README.md
├── ARCHITECTURE.md
├── ALGORITHMS.md
└── TESTING.md
```

## Local setup

**Requirements:** Node.js compatible with the installed Vite version (check `node --version` and Vite's requirements); npm; a MongoDB Atlas database.

1. Clone the repository and open the root folder.
2. In `server/`, run `npm ci` (or `npm install` if no lockfile is available).
3. Copy `server/.env.example` to `server/.env` and configure `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, and optionally `PORT` and `NODE_ENV`.
4. Run `npm run dev` in `server/`.
5. In a separate terminal, run `npm ci` in `client/`, copy `client/.env.example` to `client/.env`, and set `VITE_API_URL=http://localhost:5000/api`.
6. Run `npm run dev` in `client/` and open the local URL printed by Vite.

If the database is empty, use the existing `server/src/scripts/importMetroNetwork.js` or `seedMetro.js` scripts according to the dataset you intend to demonstrate. **Inspect their behavior before running**; seeding may create or update records. Avoid claiming that sample data is official.

### Example environment settings

Server (`server/.env`):

```dotenv
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=replace_with_a_strong_random_secret
CLIENT_URL=http://localhost:5173
```

Client (`client/.env`):

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Never commit real `.env` files, passwords, or database connection strings.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API health check |
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Current user (authenticated) |
| GET | `/api/stations` | List stations |
| GET | `/api/routes?source=...&destination=...&optimize=time` | Calculate route |
| GET | `/api/analytics/network` | Network analytics |
| GET | `/api/network/map` | Stations, lines, and graph connections |

Optimization values: `time`, `stops`, `interchanges`. Other request/response specifics are governed by the current controllers.

## Quality checks

From `server/`:

```bash
npm test
npm run validate:network
npm run test:network
```

From `client/`:

```bash
npm run build
npm run lint
```

See [TESTING.md](TESTING.md) for documented test coverage and reported results.

## Dataset and limitations

The imported demonstration network was reported to contain **245 stations, 9 lines, and 262 connections**, with 24 interchange stations. The structural validation reported one connected component and no invalid, duplicate, or isolated records. These checks do **not** independently establish geographic accuracy, up-to-date service patterns, fare correctness, or real travel times. Route recommendations must not be treated as live journey advice.

## Future work

- Verified station geography and authoritative operational data
- Service disruptions, schedules, fares, and real-time estimates
- Accessible route preferences and richer branch-aware schematic layout
- AI-assisted natural-language planning and personalized recommendations
- Deployment monitoring and automated CI

## Author

Shrey Madaan — MS Computer Science capstone project.
