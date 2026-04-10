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
