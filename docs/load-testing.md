# Load testing with k6

The backend now includes a proper `k6` suite in [`k6/api-load.js`](../k6/api-load.js) that exercises the banking API under realistic concurrent traffic.

## What it tests

- account listing through `GET /api/accounts`
- transaction listing through `GET /api/transactions`
- concurrent deposits through `POST /api/transactions`
- concurrent transfers through `POST /api/transactions`
- optimistic concurrency conflicts tracked through `409` responses

## Prerequisites

1. Install `k6`: https://grafana.com/docs/k6/latest/set-up/install-k6/
2. Start the backend locally on `http://localhost:8000`
3. Make sure the database is running and migrations are applied

## Available commands

```bash
npm run test:load:smoke
npm run test:load
npm run test:load:stress
```

## Useful environment variables

- `BASE_URL`: target host, defaults to `http://localhost:8000`
- `API_PREFIX`: API prefix, defaults to `/api`
- `PROFILE`: `smoke`, `load`, or `stress`
- `SEED_ACCOUNTS`: number of accounts created in `setup()`, defaults to `24`
- `OPENING_BALANCE`: initial balance per seeded account, defaults to `25000`
- `TEST_RUN_ID`: optional override for deterministic account IDs

## Notes

- Every run seeds fresh account IDs, so test data does not collide by default.
- The script treats `409` transaction conflicts as expected concurrency pressure, not infrastructure failure.
- A machine-readable summary is written to `k6/results/latest-summary.json`.
