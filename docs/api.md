# API Guide

Base URL:

```text
http://localhost:8000/api
```

All successful responses are wrapped as:

```json
{
  "data": {}
}
```

All errors return a JSON error payload through the global exception filter.

## Accounts

### `POST /accounts`

Create a new bank account.

Request body:

```json
{
  "accountId": "ACC1001",
  "holderName": "John Doe",
  "initialBalance": 1000
}
```

Success:

- Status: `201 Created`

Response:

```json
{
  "data": {
    "id": "cm123...",
    "accountId": "ACC1001",
    "holderName": "John Doe",
    "balance": 1000,
    "version": 1,
    "isActive": true,
    "createdAt": "2026-04-11T00:00:00.000Z",
    "updatedAt": "2026-04-11T00:00:00.000Z"
  }
}
```

### `GET /accounts`

List all accounts.

Success:

- Status: `200 OK`

### `GET /accounts/:accountId`

Fetch a single account by business account ID.

Success:

- Status: `200 OK`

Errors:

- `404 Not Found`

## Transactions

### `POST /transactions`

Create a transaction.

Supported types:

- `DEPOSIT`
- `WITHDRAW`
- `TRANSFER`

Common fields:

```json
{
  "type": "TRANSFER",
  "amount": 250,
  "description": "Vendor payment",
  "idempotencyKey": "transfer-acc1001-acc1002-001"
}
```

Deposit example:

```json
{
  "type": "DEPOSIT",
  "amount": 500,
  "toAccountId": "ACC1001",
  "description": "Cash deposit"
}
```

Withdraw example:

```json
{
  "type": "WITHDRAW",
  "amount": 200,
  "fromAccountId": "ACC1001",
  "description": "ATM withdrawal"
}
```

Transfer example:

```json
{
  "type": "TRANSFER",
  "amount": 250,
  "fromAccountId": "ACC1001",
  "toAccountId": "ACC1002",
  "description": "Vendor payment"
}
```

Success:

- Status: `201 Created`

Response:

```json
{
  "data": {
    "id": "cm123...",
    "txId": "cm456...",
    "type": "transfer",
    "status": "success",
    "amount": 250,
    "description": "Vendor payment",
    "failureReason": null,
    "idempotencyKey": "transfer-acc1001-acc1002-001",
    "fromVersionBefore": 3,
    "fromVersionAfter": 4,
    "toVersionBefore": 1,
    "toVersionAfter": 2,
    "fromBalanceBefore": 1000,
    "fromBalanceAfter": 750,
    "toBalanceBefore": 300,
    "toBalanceAfter": 550,
    "fromAccount": {
      "accountId": "ACC1001"
    },
    "toAccount": {
      "accountId": "ACC1002"
    },
    "success": true
  }
}
```

Expected failure cases:

- `400 Bad Request` for invalid payloads
- `404 Not Found` for missing accounts
- `409 Conflict` for high-contention concurrency retries exhausted

Important behavior:

- Withdraw and transfer requests fail safely if funds are insufficient.
- Failed transactions are still recorded for auditability.
- Idempotency keys let clients retry safely without creating duplicates.

### `GET /transactions`

List transactions.

Supported query params:

- `accountId`
- `type`
- `status`
- `limit`

Example:

```text
GET /transactions?accountId=ACC1001&status=SUCCESS&limit=20
```

### `GET /transactions/:txId`

Get a single transaction by `txId`.

## WebSocket Events

Socket.IO server emits:

### `transaction:created`

Emitted after a successful deposit, withdrawal, or transfer is persisted.

### `balance:updated`

Emitted when an account balance changes.

Payload shape:

```json
{
  "transactionId": "cm456...",
  "account": {
    "accountId": "ACC1001",
    "balance": 750,
    "version": 4
  }
}
```

### `transaction:failed`

Emitted when a transaction is recorded with failed status, such as insufficient funds.

## Additional References

- Swagger JSON: [swagger.json](./swagger.json)
- Postman collection: [postman/excel-assignment-api.postman_collection.json](./postman/excel-assignment-api.postman_collection.json)
