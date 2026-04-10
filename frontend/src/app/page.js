'use client';
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.default = Home;
const react_1 = require('react');
const socket_io_client_1 = require('socket.io-client');
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api';
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? API_BASE_URL.replace(/\/api\/?$/, '');
const defaultAccountForm = {
  accountId: '',
  holderName: '',
  initialBalance: '0',
};
const defaultTransactionForm = {
  type: 'DEPOSIT',
  amount: '',
  fromAccountId: '',
  toAccountId: '',
  description: '',
  idempotencyKey: '',
};
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}
function formatDate(value) {
  return new Date(value).toLocaleString();
}
async function requestJson(path, init) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const payload = await response.json();
  if (!response.ok) {
    const errorPayload = payload;
    const detail = Array.isArray(errorPayload.error)
      ? errorPayload.error[0]
      : errorPayload.error;
    throw new Error(detail || errorPayload.message || 'Request failed');
  }
  return payload;
}
function Home() {
  const [accounts, setAccounts] = (0, react_1.useState)([]);
  const [transactions, setTransactions] = (0, react_1.useState)([]);
  const [events, setEvents] = (0, react_1.useState)([]);
  const [accountForm, setAccountForm] = (0, react_1.useState)(
    defaultAccountForm,
  );
  const [transactionForm, setTransactionForm] = (0, react_1.useState)(
    defaultTransactionForm,
  );
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [submittingAccount, setSubmittingAccount] = (0, react_1.useState)(
    false,
  );
  const [submittingTransaction, setSubmittingTransaction] = (0,
  react_1.useState)(false);
  const [errorMessage, setErrorMessage] = (0, react_1.useState)(null);
  const [successMessage, setSuccessMessage] = (0, react_1.useState)(null);
  const totalBalance = (0, react_1.useMemo)(
    () => accounts.reduce((sum, account) => sum + account.balance, 0),
    [accounts],
  );
  const successfulTransactions = (0, react_1.useMemo)(
    () =>
      transactions.filter((transaction) => transaction.status === 'success')
        .length,
    [transactions],
  );
  async function loadDashboardData() {
    setLoading(true);
    try {
      const [accountsResponse, transactionsResponse] = await Promise.all([
        requestJson('/accounts'),
        requestJson('/transactions?limit=12'),
      ]);
      setAccounts(accountsResponse.data);
      setTransactions(transactionsResponse.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load dashboard data',
      );
    } finally {
      setLoading(false);
    }
  }
  (0, react_1.useEffect)(() => {
    void loadDashboardData();
  }, []);
  (0, react_1.useEffect)(() => {
    const socket = (0, socket_io_client_1.io)(SOCKET_URL, {
      transports: ['websocket'],
    });
    socket.on('transaction:created', (payload) => {
      setEvents((current) =>
        [
          {
            id: crypto.randomUUID(),
            kind: 'transaction:created',
            title: `${payload.type.toUpperCase()} completed`,
            subtitle: `${formatCurrency(payload.amount)} • ${payload.txId}`,
            at: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 10),
      );
      void loadDashboardData();
    });
    socket.on('balance:updated', (payload) => {
      setEvents((current) =>
        [
          {
            id: crypto.randomUUID(),
            kind: 'balance:updated',
            title: `Balance updated for ${payload.account.accountId}`,
            subtitle: `${formatCurrency(payload.account.balance)} • ${payload.transactionId}`,
            at: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 10),
      );
      setAccounts((current) =>
        current.map((account) =>
          account.accountId === payload.account.accountId
            ? payload.account
            : account,
        ),
      );
    });
    socket.on('transaction:failed', (payload) => {
      setEvents((current) =>
        [
          {
            id: crypto.randomUUID(),
            kind: 'transaction:failed',
            title: `Transaction failed`,
            subtitle: payload.failureReason || payload.txId,
            at: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 10),
      );
      void loadDashboardData();
    });
    return () => {
      socket.disconnect();
    };
  }, []);
  async function handleCreateAccount(event) {
    event.preventDefault();
    setSubmittingAccount(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await requestJson('/accounts', {
        method: 'POST',
        body: JSON.stringify({
          accountId: accountForm.accountId,
          holderName: accountForm.holderName,
          initialBalance: Number(accountForm.initialBalance || 0),
        }),
      });
      setAccountForm(defaultAccountForm);
      setSuccessMessage('Account created successfully.');
      void loadDashboardData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create account',
      );
    } finally {
      setSubmittingAccount(false);
    }
  }
  async function handleCreateTransaction(event) {
    event.preventDefault();
    setSubmittingTransaction(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const payload = {
      type: transactionForm.type,
      amount: Number(transactionForm.amount),
    };
    if (transactionForm.fromAccountId) {
      payload.fromAccountId = transactionForm.fromAccountId;
    }
    if (transactionForm.toAccountId) {
      payload.toAccountId = transactionForm.toAccountId;
    }
    if (transactionForm.description) {
      payload.description = transactionForm.description;
    }
    if (transactionForm.idempotencyKey) {
      payload.idempotencyKey = transactionForm.idempotencyKey;
    }
    try {
      await requestJson('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setTransactionForm(defaultTransactionForm);
      setSuccessMessage('Transaction submitted successfully.');
      void loadDashboardData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create transaction',
      );
    } finally {
      setSubmittingTransaction(false);
    }
  }
  const needsFromAccount =
    transactionForm.type === 'WITHDRAW' || transactionForm.type === 'TRANSFER';
  const needsToAccount =
    transactionForm.type === 'DEPOSIT' || transactionForm.type === 'TRANSFER';
  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div className="hero-copy" style={{ border: '1px solid red' }}>
          <span className="eyebrow">MERN Assignment Frontend</span>
          <h1>Concurrent Banking Transaction Dashboard</h1>
          <p>
            A simple frontend for creating accounts, sending deposit or transfer
            requests, and watching balance updates arrive in real time.
          </p>
        </div>
        <div className="hero-actions">
          <a
            href="http://localhost:8000/api/docs"
            target="_blank"
            rel="noreferrer"
          >
            Open Swagger
          </a>
          <a
            href="http://localhost:8000/api/transactions?limit=10"
            target="_blank"
            rel="noreferrer"
          >
            Test API
          </a>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span>Total Accounts</span>
          <strong>{accounts.length}</strong>
        </article>
        <article className="stat-card">
          <span>Total Balance</span>
          <strong>{formatCurrency(totalBalance)}</strong>
        </article>
        <article className="stat-card">
          <span>Recent Transactions</span>
          <strong>{transactions.length}</strong>
        </article>
        <article className="stat-card">
          <span>Successful Transactions</span>
          <strong>{successfulTransactions}</strong>
        </article>
      </section>

      {(errorMessage || successMessage) && (
        <section className="message-row">
          {errorMessage ? (
            <p className="message error">{errorMessage}</p>
          ) : null}
          {successMessage ? (
            <p className="message success">{successMessage}</p>
          ) : null}
        </section>
      )}

      <section className="content-grid">
        <div className="column-stack">
          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Accounts</span>
                <h2>Create account</h2>
              </div>
            </div>
            <form className="form-grid" onSubmit={handleCreateAccount}>
              <label>
                <span>Account ID</span>
                <input
                  value={accountForm.accountId}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      accountId: event.target.value,
                    }))
                  }
                  placeholder="ACC1001"
                  required
                />
              </label>
              <label>
                <span>Holder Name</span>
                <input
                  value={accountForm.holderName}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      holderName: event.target.value,
                    }))
                  }
                  placeholder="John Doe"
                  required
                />
              </label>
              <label>
                <span>Initial Balance</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={accountForm.initialBalance}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      initialBalance: event.target.value,
                    }))
                  }
                />
              </label>
              <button type="submit" disabled={submittingAccount}>
                {submittingAccount ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Transactions</span>
                <h2>Execute transaction</h2>
              </div>
            </div>
            <form className="form-grid" onSubmit={handleCreateTransaction}>
              <label>
                <span>Type</span>
                <select
                  value={transactionForm.type}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      type: event.target.value,
                      fromAccountId:
                        event.target.value === 'DEPOSIT'
                          ? ''
                          : current.fromAccountId,
                      toAccountId:
                        event.target.value === 'WITHDRAW'
                          ? ''
                          : current.toAccountId,
                    }))
                  }
                >
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAW">Withdraw</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </label>
              <label>
                <span>Amount</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="250"
                  required
                />
              </label>
              {needsFromAccount ? (
                <label>
                  <span>From Account</span>
                  <input
                    value={transactionForm.fromAccountId}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        fromAccountId: event.target.value,
                      }))
                    }
                    placeholder="ACC1001"
                    required={needsFromAccount}
                  />
                </label>
              ) : null}
              {needsToAccount ? (
                <label>
                  <span>To Account</span>
                  <input
                    value={transactionForm.toAccountId}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        toAccountId: event.target.value,
                      }))
                    }
                    placeholder="ACC1002"
                    required={needsToAccount}
                  />
                </label>
              ) : null}
              <label>
                <span>Description</span>
                <input
                  value={transactionForm.description}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Optional note"
                />
              </label>
              <label>
                <span>Idempotency Key</span>
                <input
                  value={transactionForm.idempotencyKey}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      idempotencyKey: event.target.value,
                    }))
                  }
                  placeholder="transfer-001"
                />
              </label>
              <button type="submit" disabled={submittingTransaction}>
                {submittingTransaction ? 'Submitting...' : 'Submit Transaction'}
              </button>
            </form>
          </article>
        </div>

        <div className="column-stack">
          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Live State</span>
                <h2>Accounts overview</h2>
              </div>
              <button
                className="ghost-button"
                onClick={() => void loadDashboardData()}
              >
                Refresh
              </button>
            </div>
            <div className="account-list">
              {loading ? (
                <p className="empty-state">Loading accounts...</p>
              ) : null}
              {!loading && accounts.length === 0 ? (
                <p className="empty-state">No accounts created yet.</p>
              ) : null}
              {accounts.map((account) => (
                <article className="account-card" key={account.id}>
                  <div>
                    <h3>{account.holderName}</h3>
                    <p>{account.accountId}</p>
                  </div>
                  <strong>{formatCurrency(account.balance)}</strong>
                  <div className="account-meta">
                    <span>Version {account.version}</span>
                    <span>{account.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Realtime</span>
                <h2>Activity feed</h2>
              </div>
            </div>
            <div className="event-list">
              {events.length === 0 ? (
                <p className="empty-state">Socket events will appear here.</p>
              ) : null}
              {events.map((item) => (
                <article
                  className={`event-card ${item.kind.replace(':', '-')}`}
                  key={item.id}
                >
                  <strong>{item.title}</strong>
                  <p>{item.subtitle}</p>
                  <span>{formatDate(item.at)}</span>
                </article>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="panel transaction-panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">Audit Trail</span>
            <h2>Recent transactions</h2>
          </div>
        </div>
        <div className="transaction-table">
          <div className="table-head">
            <span>Type</span>
            <span>Accounts</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Created</span>
          </div>
          {loading ? (
            <p className="empty-state">Loading transactions...</p>
          ) : null}
          {!loading && transactions.length === 0 ? (
            <p className="empty-state">
              Transactions will appear after the first request.
            </p>
          ) : null}
          {transactions.map((transaction) => (
            <div className="table-row" key={transaction.id}>
              <span className="capsule">{transaction.type}</span>
              <span>
                {transaction.fromAccount?.accountId || 'System'} →{' '}
                {transaction.toAccount?.accountId || 'System'}
              </span>
              <span>{formatCurrency(transaction.amount)}</span>
              <span className={`status-pill ${transaction.status}`}>
                {transaction.status}
              </span>
              <span>{formatDate(transaction.createdAt)}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
//# sourceMappingURL=page.js.map
