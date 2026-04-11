# Excel Assignment Backend

NestJS backend for the banking transaction assignment, with Prisma persistence, concurrent-safe transaction processing, realtime events, Swagger docs, and `k6` load testing.

## Project setup

```bash
npm install
```

## Run the backend

```bash
npm run start:dev
```

The API is available at `http://localhost:8000/api` by default, and Swagger is available at `http://localhost:8000/api/docs`.

## Test commands

```bash
npm run test
npm run test:e2e
npm run test:cov
```

## Load testing

`k6` scripts live in [`k6/`](./k6). Available commands:

```bash
npm run test:load:smoke
npm run test:load
npm run test:load:stress
```

More details are documented in [`docs/load-testing.md`](./docs/load-testing.md).

## Load Testing Results

The latest stress test was run on April 10, 2026 using `npm run test:load:stress` against the local API. The test completed successfully and met all configured thresholds.

- Duration: `151.6s`
- Seeded accounts: `200`
- Total iterations: `5612`
- Total HTTP requests: `5812`
- Transactions created: `3462`
- Overall latency: `1512 ms` p95
- Transaction write latency: `1764 ms` p95
- Transaction read latency: `744 ms` p95
- Checks pass rate: `100%`
- HTTP request failure rate: `0%`
- Transaction conflict rate: `4.15%`

These results show that the system remained stable under heavy concurrent traffic. A small conflict rate is expected for concurrent banking transactions and was handled without causing request failures. The raw report is stored in [`k6/results/latest-summary.json`](./k6/results/latest-summary.json).
