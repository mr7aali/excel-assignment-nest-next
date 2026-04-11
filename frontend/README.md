# Banking Dashboard Frontend

Next.js frontend for the concurrent banking transaction assignment.

## Run locally

```bash
npm install
npm run dev
```

## Environment variables

Create `frontend/.env` with:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

## Features

- Account selector
- Account creation form
- Deposit, withdraw, and transfer form
- Recent transactions list
- Real-time balance and transaction updates with Socket.IO

## Production build

```bash
npm run build
npm run start
```
