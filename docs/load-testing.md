# Load Testing with k6

The project includes a `k6` suite in [`k6/api-load.js`](../k6/api-load.js) to validate concurrency handling under realistic traffic.

## What It Tests

- `GET /api/accounts`
- `GET /api/transactions`
- `POST /api/transactions` for deposits
- `POST /api/transactions` for transfers
- expected conflict behavior under high contention

## Profiles

### `smoke`

- quick validation run for local sanity checks

### `load`

- mixed read/write workload for normal performance validation

### `stress`

- heavier write pressure with concurrent reads

### `assignment1000`

- explicit assignment profile
- runs `1000` concurrent transaction users against `POST /api/transactions`
- intended to demonstrate the assignment requirement of handling at least 1000 concurrent transaction requests

## Prerequisites

1. Install `k6`: https://grafana.com/docs/k6/latest/set-up/install-k6/
2. Start the backend locally on `http://localhost:8000`
3. Ensure PostgreSQL is reachable and Prisma migrations are applied

## Commands

```bash
npm run test:load:smoke
npm run test:load
npm run test:load:stress
npm run test:load:assignment
```

## Useful Environment Variables

- `BASE_URL`: target host, default `http://localhost:8000`
- `API_PREFIX`: default `/api`
- `PROFILE`: `smoke`, `load`, `stress`, or `assignment1000`
- `SEED_ACCOUNTS`: seeded account count
- `OPENING_BALANCE`: starting balance for seeded accounts
- `TEST_RUN_ID`: deterministic run identifier override

Recommended assignment run:

```bash
npm run test:load:assignment
```

Optional higher-cardinality seeding:

```bash
$env:SEED_ACCOUNTS=400
npm run test:load:assignment
```

## Output

- Human-readable summary in stdout
- Machine-readable summary in `k6/results/latest-summary.json`

## Notes

- Every run seeds fresh account IDs to avoid collisions.
- `409 Conflict` responses are treated as expected concurrency pressure, not infrastructure failures.
- The safety goal is correctness under concurrency, not zero conflicts.
