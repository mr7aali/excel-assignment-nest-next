# Concurrent Banking Transaction System

Concurrent-safe banking transaction system built with:

- Backend: NestJS running on the Express adapter, Prisma, PostgreSQL, Socket.IO
- Frontend: Next.js 16 + React 19
- Database: PostgreSQL
- Load testing: k6

This project implements deposits, withdrawals, and transfers with optimistic concurrency control using account version numbers plus serializable database transactions to prevent race conditions and inconsistent balance updates.

## Assignment Status

Repo-completable deliverables are included:

- Backend and frontend source code
- README with setup, architecture, and concurrency strategy
- API documentation via Swagger and a written API guide
- Load-testing scripts and saved results
- Walkthrough script for recording the project video
- Submission checklist for the remaining external deliverables

External deliverables still need your final links:

- Public GitHub repository URL
- Live deployed frontend URL
- Live deployed backend/API docs URL
- Walkthrough video URL

## Monorepo Layout

```text
.
|-- src/                     NestJS backend
|-- prisma/                  Prisma schema + migrations
|-- frontend/                Next.js dashboard
|-- k6/                      Load-testing scripts and results
|-- docs/                    Swagger export, API guide, architecture, checklist
`-- test/                    E2E smoke tests
```

## Features

- Create and list bank accounts
- Create deposit, withdraw, and transfer transactions
- Prevent negative balances during concurrent writes
- Use account version numbers for optimistic locking
- Retry serializable transaction conflicts safely
- Emit real-time Socket.IO events for transaction and balance updates
- Provide Swagger and Postman API documentation
- Run k6 stress and 1000-concurrent-user load tests

## Architecture

Detailed architecture notes live in [docs/architecture.md](./docs/architecture.md).

High-level flow:

1. The Next.js dashboard sends REST requests to the NestJS API.
2. The API validates payloads and starts a serializable database transaction.
3. Account rows are updated only when the current `version` matches the expected one.
4. If a concurrent write changes the row first, the write is retried safely.
5. Successful and failed transactions are persisted for auditability.
6. Socket.IO events push live updates back to connected clients.

## Concurrency Control Strategy

The concurrency strategy is intentionally layered:

1. Serializable DB transactions
   Every transaction request runs inside `Prisma.TransactionIsolationLevel.Serializable`.

2. Optimistic locking with version numbers
   Account updates are executed with `updateMany` using both `id` and `version`.
   If the row count is not exactly `1`, another concurrent request won the race and the mutation is retried.

3. Safe retries for transient conflicts
   Known serialization and deadlock-like errors are retried up to a fixed limit.

4. Business-rule validation inside the transaction
   Withdrawals and transfers check available balance before decrementing funds.

5. Audit trail
   Transactions store before/after balances and before/after versions so results can be inspected later.

Relevant implementation:

- [src/transactions/transactions.service.ts](./src/transactions/transactions.service.ts)
- [prisma/schema.prisma](./prisma/schema.prisma)

## Setup

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL
- k6 for load testing

### 1. Install dependencies

Backend:

```bash
npm install
```

Frontend:

```bash
cd frontend
npm install
cd ..
```

### 2. Configure environment variables

Backend `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require
PORT=8000
GLOBAL_PREFIX=api
```

Frontend `frontend/.env`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

### 3. Apply database migrations

```bash
npx prisma generate
npx prisma migrate deploy
```

For local development with schema changes:

```bash
npx prisma migrate dev
```

### 4. Start the backend

```bash
npm run start:dev
```

Backend URLs:

- API base: `http://localhost:8000/api`
- Swagger UI: `http://localhost:8000/api/docs`

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend URL:

- Dashboard: `http://localhost:3000`

## API Documentation

Available API docs:

- Swagger UI: `http://localhost:8000/api/docs`
- Swagger JSON export: [docs/swagger.json](./docs/swagger.json)
- Written API guide: [docs/api.md](./docs/api.md)
- Postman collection: [docs/postman/excel-assignment-api.postman_collection.json](./docs/postman/excel-assignment-api.postman_collection.json)

## Real-Time Events

Socket.IO events emitted by the backend:

- `transaction:created`
- `balance:updated`
- `transaction:failed`

The frontend listens for those events in [frontend/src/app/page.tsx](./frontend/src/app/page.tsx).

## Testing

Unit tests:

```bash
npm test
```

E2E smoke tests:

```bash
npm run test:e2e
```

Backend build:

```bash
npm run build
```

Frontend build:

```bash
cd frontend
npm run build
```

## Load Testing

Load-testing docs live in [docs/load-testing.md](./docs/load-testing.md).

Available scripts:

```bash
npm run test:load:smoke
npm run test:load
npm run test:load:stress
npm run test:load:assignment
```

The assignment-specific profile targets 1000 concurrent transaction users.

Saved results:

- Latest summary: [k6/results/latest-summary.json](./k6/results/latest-summary.json)

## Deliverables Checklist

See [docs/submission-checklist.md](./docs/submission-checklist.md) for the final handoff checklist, including the still-external items you need to attach before submission.

## Walkthrough Video

A ready-to-record walkthrough outline is included in [docs/walkthrough-script.md](./docs/walkthrough-script.md).
