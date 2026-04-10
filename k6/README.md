# k6 load testing

This folder contains reusable `k6` scripts for the Nest banking API.

## Covered flows

- Seed a fresh pool of test accounts before execution
- Read-heavy traffic against `GET /api/accounts`
- Read-heavy traffic against `GET /api/transactions`
- Write traffic against `POST /api/transactions` for deposits and transfers
- Concurrency contention tracking for optimistic-lock conflicts (`409`)

## Profiles

- `smoke`: quick sanity check for local development
- `load`: balanced read/write traffic for normal benchmarking
- `stress`: heavier contention to probe concurrency behavior

## Run

Install `k6` first, then start the Nest API locally and run one of:

```bash
npm run test:load:smoke
npm run test:load
npm run test:load:stress
```

You can also override runtime settings:

```bash
k6 run -e PROFILE=load -e BASE_URL=http://localhost:8000 -e API_PREFIX=/api -e SEED_ACCOUNTS=50 k6/api-load.js
```

## Output

- Console summary after the run
- JSON summary written to `k6/results/latest-summary.json`
