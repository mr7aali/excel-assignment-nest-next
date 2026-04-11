# Project Walkthrough Script

Use this as your recording outline for the assignment walkthrough video.

## 1. Introduction

- Introduce the project as a concurrent banking transaction system.
- Mention the stack:
  NestJS on Express, PostgreSQL, Prisma, Next.js, Socket.IO, k6.

## 2. Backend Overview

- Show the account and transaction models in `prisma/schema.prisma`.
- Explain the meaning of the `version` field.
- Show the transaction service and how requests are processed.

## 3. Concurrency Strategy

- Point to `TransactionsService.create`.
- Explain serializable transactions.
- Explain version-based optimistic locking using `updateMany`.
- Explain retry logic for serialization/write-conflict errors.
- Explain why this prevents negative balances and race conditions.

## 4. Transaction Rules

- Demonstrate deposit
- Demonstrate withdraw
- Demonstrate transfer
- Demonstrate insufficient funds leading to failed transaction

## 5. Real-Time Updates

- Show the Socket.IO gateway.
- Show the frontend listening to `transaction:created`, `balance:updated`, and `transaction:failed`.
- Trigger a transaction and show the dashboard update live.

## 6. API Documentation

- Open Swagger at `/api/docs`.
- Briefly show account and transaction endpoints.
- Mention the Postman collection in `docs/postman/`.

## 7. Load Testing

- Open `k6/api-load.js` and `k6/config.js`.
- Explain the smoke, load, stress, and assignment-1000 profiles.
- Show the saved summary JSON and highlight conflict rate, latency, and pass rate.

## 8. Frontend Overview

- Show account selection, transaction creation, and live balance changes.
- Explain that the dashboard is connected to both REST and WebSocket layers.

## 9. Closing

- Summarize how the system guarantees safe concurrent processing.
- Share the repository URL and live demo URL.
