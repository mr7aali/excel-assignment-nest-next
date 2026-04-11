# Architecture Overview

## System Components

### Frontend

- Next.js dashboard in `frontend/`
- Lists accounts and recent transactions
- Creates accounts and transactions through REST APIs
- Subscribes to live Socket.IO updates for balance and transaction changes

### Backend

- NestJS application in `src/`
- REST controllers for accounts and transactions
- Prisma for PostgreSQL persistence
- Socket.IO gateway for real-time client notifications

### Database

- PostgreSQL
- `Account` table stores balance and concurrency version
- `Transaction` table stores the audit trail and before/after snapshots

## Data Model

### Account

- `accountId`
- `holderName`
- `balance`
- `version`
- `isActive`

### Transaction

- `txId`
- `type`
- `status`
- `amount`
- `fromAccountId`
- `toAccountId`
- `fromVersionBefore`
- `fromVersionAfter`
- `toVersionBefore`
- `toVersionAfter`
- `fromBalanceBefore`
- `fromBalanceAfter`
- `toBalanceBefore`
- `toBalanceAfter`
- `failureReason`
- `idempotencyKey`

## Request Flow

1. The frontend submits `POST /api/transactions`.
2. DTO validation ensures the payload is structurally correct.
3. The transaction service opens a serializable Prisma transaction.
4. Accounts are loaded by business account ID.
5. Business rules are checked:
   insufficient funds, missing accounts, invalid transfer pairs.
6. Account balances are mutated with optimistic version matching.
7. The transaction record is written with before/after audit fields.
8. The backend emits Socket.IO events to connected clients.
9. The frontend updates balances and refreshes transaction data.

## Why This Prevents Race Conditions

Two protection layers work together:

- Serializable isolation prevents unsafe interleavings at the database level.
- Optimistic locking with `version` ensures a write only succeeds when it still targets the exact version that was originally read.

If another request updates the same account first, the stale request no longer matches the expected version and is retried instead of corrupting the balance.

## Example Concurrent Withdrawal Scenario

Initial balance: `1000`

- Request A withdraws `700`
- Request B withdraws `500`

Possible safe outcome:

1. Both requests read the same starting balance.
2. Request A wins the version-checked update and moves the balance to `300`.
3. Request B either:
   retries after a serialization/version conflict, or
   rereads the balance and fails with insufficient funds.

The balance never becomes negative.

## Real-Time Layer

The backend emits:

- `transaction:created`
- `balance:updated`
- `transaction:failed`

This keeps the frontend synchronized without polling after every change.
