# MetroMind AI — Testing and Validation

## Test layers

| Layer | Location | Purpose |
|---|---|---|
| Algorithm unit/regression | `server/src/tests/graphService.test.js` | Validate routing behavior on controlled graphs |
| Synthetic graph fixtures | `server/src/tests/fixtures/metroGraph.js` | Repeatable test input |
| Imported network validation | `server/src/scripts/validateMetroNetwork.js` | Check graph integrity and connectivity |
| Imported network route checks | `server/src/scripts/testNetworkRoutes.js` | Exercise selected source/destination pairs and modes |
| Frontend production build | `client` Vite build | Verify production bundling |

## Previously reported results

The following are results reported during development, **not rerun as part of preparing this document**:

- **10/10** graph regression tests passed.
- **30/30** imported-network route checks passed (10 station pairs × 3 optimization modes).
- Dataset validation reported **245 stations, 9 lines, 262 connections**, with zero invalid references, duplicate connections, isolated stations, or line mismatches, and one connected component.

These results are evidence of implementation testing, not verification against an authoritative real-world metro map.

## Reproduce

From `server/`:

```bash
npm install
npm test
npm run validate:network
npm run test:network
```

From `client/`:

```bash
npm install
npm run build
npm run lint
```

Network scripts may require MongoDB connectivity and imported sample data. Configure the environment variables first. Confirm exact script names against `server/package.json` if they change.

## Manual smoke test

1. Open the app and confirm station search loads.
2. Select two distinct stations and calculate all three route modes.
3. Check stop count, estimated time, transfer count, and rendered path.
4. Inspect line filters and station details in the network explorer.
5. Verify the analytics dashboard loads.
6. Register, log in, and fetch the authenticated profile.
7. Test invalid stations, same-station requests, unavailable API, and incorrect credentials.
8. Check desktop and mobile layout.

## Evidence for submission

Capture terminal output of the automated tests, a screenshot of the successful production build, and screenshots of the planner, comparison, analytics, and network explorer. Store screenshots in a dedicated repository folder after verifying that they contain no credentials or personal data.

## Known limits

The tests check software behavior and internal dataset consistency. They do not prove live operational accuracy, real-world transfer feasibility, fare accuracy, or predicted journey duration.
