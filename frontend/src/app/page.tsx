'use client';

import './dashboard.css';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type Account = {
  id: string;
  accountId: string;
  holderName: string;
  balance: number;
  version: number;
  isActive: boolean;
};

type Transaction = {
  id: string;
  txId: string;
  type: 'deposit' | 'withdraw' | 'transfer';
  status: 'pending' | 'success' | 'failed';
  amount: number;
  failureReason?: string | null;
  createdAt: string;
  fromAccount?: Account | null;
  toAccount?: Account | null;
};

type ApiResponse<T> = {
  data: T;
};

type ApiError = {
  message?: string;
  error?: string | string[];
};

type ActivityEvent = {
  id: string;
  title: string;
  subtitle: string;
  at: string;
};

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

const transactionTypeOptions = ['DEPOSIT', 'WITHDRAW', 'TRANSFER'] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function createActivityEvent(title: string, subtitle: string): ActivityEvent {
  return {
    id: crypto.randomUUID(),
    title,
    subtitle,
    at: new Date().toISOString(),
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const rawBody = await response.text();

  if (!contentType.includes('application/json')) {
    throw new Error(
      `Expected JSON from ${url}. Make sure the backend is running and the frontend API URL is correct.`,
    );
  }

  let payload: T | ApiError;

  try {
    payload = JSON.parse(rawBody) as T | ApiError;
  } catch {
    throw new Error(`Received an invalid JSON response from ${url}.`);
  }

  if (!response.ok) {
    const errorPayload = payload as ApiError;
    const detail = Array.isArray(errorPayload.error)
      ? errorPayload.error[0]
      : errorPayload.error;
    throw new Error(detail || errorPayload.message || 'Request failed');
  }

  return payload as T;
}

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [, setEvents] = useState<ActivityEvent[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [activeFormTab, setActiveFormTab] = useState<'account' | 'transaction'>(
    'account',
  );
  const [activeSideTab, setActiveSideTab] = useState<
    'accounts' | 'create-account'
  >('accounts');
  const [accountForm, setAccountForm] = useState(defaultAccountForm);
  const [transactionForm, setTransactionForm] = useState(
    defaultTransactionForm,
  );
  const [loading, setLoading] = useState(true);
  const [submittingAccount, setSubmittingAccount] = useState(false);
  const [submittingTransaction, setSubmittingTransaction] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedAccount = useMemo(
    () =>
      accounts.find((account) => account.accountId === selectedAccountId) ??
      accounts[0] ??
      null,
    [accounts, selectedAccountId],
  );

  const selectedTransactions = useMemo(() => {
    if (!selectedAccount) {
      return transactions;
    }

    return transactions.filter(
      (transaction) =>
        transaction.fromAccount?.accountId === selectedAccount.accountId ||
        transaction.toAccount?.accountId === selectedAccount.accountId,
    );
  }, [selectedAccount, transactions]);

  const selectedSuccessCount = useMemo(
    () =>
      selectedTransactions.filter(
        (transaction) => transaction.status === 'success',
      ).length,
    [selectedTransactions],
  );

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [accountsResponse, transactionsResponse] = await Promise.all([
        requestJson<ApiResponse<Account[]>>('/accounts'),
        requestJson<ApiResponse<Transaction[]>>('/transactions?limit=12'),
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

  useEffect(() => {
    void loadDashboardData();
  }, []);

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].accountId);
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socket.on('transaction:created', (payload: Transaction) => {
      setEvents((current) =>
        [
          createActivityEvent(
            `${payload.type.toUpperCase()} completed`,
            `${formatCurrency(payload.amount)} | ${payload.txId}`,
          ),
          ...current,
        ].slice(0, 8),
      );
      void loadDashboardData();
    });

    socket.on(
      'balance:updated',
      (payload: { account: Account; transactionId: string }) => {
        setEvents((current) =>
          [
            createActivityEvent(
              `Balance updated for ${payload.account.accountId}`,
              `${formatCurrency(payload.account.balance)} | ${payload.transactionId}`,
            ),
            ...current,
          ].slice(0, 8),
        );
        setAccounts((current) =>
          current.map((account) =>
            account.accountId === payload.account.accountId
              ? payload.account
              : account,
          ),
        );
      },
    );

    socket.on('transaction:failed', (payload: Transaction) => {
      setEvents((current) =>
        [
          createActivityEvent(
            'Transaction failed',
            payload.failureReason || payload.txId,
          ),
          ...current,
        ].slice(0, 8),
      );
      void loadDashboardData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingAccount(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await requestJson<ApiResponse<Account>>('/accounts', {
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

  async function handleCreateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingTransaction(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload: Record<string, string | number> = {
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
      await requestJson<ApiResponse<Transaction>>('/transactions', {
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

  function handleTransactionTypeChange(
    nextType: (typeof transactionTypeOptions)[number],
  ) {
    setTransactionForm((current) => ({
      ...current,
      type: nextType,
      fromAccountId: nextType === 'DEPOSIT' ? '' : current.fromAccountId,
      toAccountId: nextType === 'WITHDRAW' ? '' : current.toAccountId,
    }));
  }

  return (
    <main className="ds-shell">
      <section className="ds-topbar">
        <div className="ds-topbar__title">
          <span className="ds-topbar__eyebrow">Selected user</span>
          <h1>{selectedAccount?.holderName ?? 'No account selected'}</h1>
        </div>
        <label className="ds-select">
          <span>Account</span>
          <div className="ds-select__control">
            <select
              value={selectedAccount?.accountId ?? ''}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              disabled={accounts.length === 0}
            >
              {accounts.length === 0 ? (
                <option value="">No accounts</option>
              ) : null}
              {accounts.map((account) => (
                <option key={account.id} value={account.accountId}>
                  {account.holderName} ({account.accountId})
                </option>
              ))}
            </select>
          </div>
        </label>
      </section>

      <section className="ds-stats">
        <article className="ds-stat">
          <span>Balance</span>
          <strong>
            {selectedAccount
              ? formatCurrency(selectedAccount.balance)
              : formatCurrency(0)}
          </strong>
          <p>{selectedAccount?.accountId ?? 'No account selected'}</p>
        </article>
        <article className="ds-stat">
          <span>Transactions</span>
          <strong>{selectedTransactions.length}</strong>
          <p>{selectedAccount ? 'Filtered to account' : 'All transactions'}</p>
        </article>
        <article className="ds-stat">
          <span>Version</span>
          <strong>{selectedAccount?.version ?? '--'}</strong>
          <p>
            <span
              className={`ds-badge ${
                selectedAccount?.isActive ? 'ds-badge--active' : ''
              }`}
            >
              {selectedAccount
                ? selectedAccount.isActive
                  ? 'Active'
                  : 'Inactive'
                : 'Unavailable'}
            </span>
          </p>
        </article>
        <article className="ds-stat">
          <span>Successful</span>
          <strong>{selectedSuccessCount}</strong>
          <p>Completed requests</p>
        </article>
      </section>

      {(errorMessage || successMessage) && (
        <section className="ds-flash-stack">
          {errorMessage ? (
            <p className="ds-flash ds-flash--error">{errorMessage}</p>
          ) : null}
          {successMessage ? (
            <p className="ds-flash ds-flash--success">{successMessage}</p>
          ) : null}
        </section>
      )}

      <section className="ds-main-grid">
        <article className="ds-panel">
          <div className="ds-tabs">
            <button
              type="button"
              className={`ds-tab ${activeFormTab === 'account' ? 'ds-tab--active' : ''}`}
              onClick={() => setActiveFormTab('account')}
            >
              Create account
            </button>
            <button
              type="button"
              className={`ds-tab ${activeFormTab === 'transaction' ? 'ds-tab--active' : ''}`}
              onClick={() => setActiveFormTab('transaction')}
            >
              New transaction
            </button>
          </div>

          <div className="ds-panel__body">
            {activeFormTab === 'account' ? (
              <form className="ds-form" onSubmit={handleCreateAccount}>
                <label className="ds-form-row">
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
                <label className="ds-form-row">
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
                <label className="ds-form-row ds-form-row--single">
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
                <div className="ds-form-row ds-form-row--single">
                  <button
                    type="submit"
                    className="ds-btn"
                    disabled={submittingAccount}
                  >
                    {submittingAccount ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            ) : (
              <form className="ds-form" onSubmit={handleCreateTransaction}>
                <div className="ds-form-row ds-form-row--single">
                  <span>Transaction Type</span>
                  <div className="ds-transaction-tabs">
                    {transactionTypeOptions.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`ds-tab ds-transaction-tab ${
                          transactionForm.type === type ? 'ds-tab--active' : ''
                        }`}
                        onClick={() => handleTransactionTypeChange(type)}
                      >
                        {type === 'DEPOSIT'
                          ? 'Deposit'
                          : type === 'WITHDRAW'
                            ? 'Withdraw'
                            : 'Transfer'}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="ds-form-row">
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
                  <label className="ds-form-row">
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
                  <label className="ds-form-row">
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
                <label className="ds-form-row ds-form-row--single">
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
                <label className="ds-form-row ds-form-row--single">
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
                <div className="ds-form-row ds-form-row--single">
                  <button
                    type="submit"
                    className="ds-btn"
                    disabled={submittingTransaction}
                  >
                    {submittingTransaction
                      ? 'Submitting...'
                      : 'Submit Transaction'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </article>

        <article className="ds-panel">
          <div className="ds-tabs">
            <button
              type="button"
              className={`ds-tab ${activeSideTab === 'accounts' ? 'ds-tab--active' : ''}`}
              onClick={() => setActiveSideTab('accounts')}
            >
              Accounts
            </button>
            <button
              type="button"
              className={`ds-tab ${
                activeSideTab === 'create-account' ? 'ds-tab--active' : ''
              }`}
              onClick={() => setActiveSideTab('create-account')}
            >
              Create account
            </button>
            <button
              type="button"
              className="ds-tab ds-tab--ghost"
              onClick={() => void loadDashboardData()}
            >
              Refresh
            </button>
          </div>

          <div
            className={`ds-panel__body ${
              activeSideTab === 'accounts' ? 'ds-panel__body--flush' : ''
            }`}
          >
            {activeSideTab === 'accounts' ? (
              <div className="ds-list" role="list">
                {loading ? (
                  <p className="ds-empty">Loading accounts...</p>
                ) : null}
                {!loading && accounts.length === 0 ? (
                  <p className="ds-empty">No accounts created yet.</p>
                ) : null}
                {accounts.map((account) => (
                  <button
                    type="button"
                    className={`ds-account-item ${
                      selectedAccount?.accountId === account.accountId
                        ? 'ds-account-item--active'
                        : ''
                    }`}
                    key={account.id}
                    onClick={() => setSelectedAccountId(account.accountId)}
                  >
                    <div className="ds-account-item__top">
                      <div>
                        <strong>{account.holderName}</strong>
                        <p>{account.accountId}</p>
                      </div>
                      <span className="ds-capsule">
                        {formatCurrency(account.balance)}
                      </span>
                    </div>
                    <div className="ds-account-item__bottom">
                      <span>Version {account.version}</span>
                      <span
                        className={`ds-badge ${
                          account.isActive ? 'ds-badge--active' : ''
                        }`}
                      >
                        {account.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <form className="ds-form" onSubmit={handleCreateAccount}>
                <label className="ds-form-row">
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
                <label className="ds-form-row">
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
                <label className="ds-form-row ds-form-row--single">
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
                <div className="ds-form-row ds-form-row--single">
                  <button
                    type="submit"
                    className="ds-btn"
                    disabled={submittingAccount}
                  >
                    {submittingAccount ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </article>
      </section>

      <section className="ds-panel">
        <div className="ds-panel__header">
          <div>
            <span className="ds-topbar__eyebrow">Audit trail</span>
            <h2 className="ds-panel__title">
              {selectedAccount
                ? `Recent transactions for ${selectedAccount.accountId}`
                : 'Recent transactions'}
            </h2>
          </div>
        </div>
        <div className="ds-table">
          <div className="ds-table-header">
            <span className="ds-table-head">Type</span>
            <span className="ds-table-head">Accounts</span>
            <span className="ds-table-head">Amount</span>
            <span className="ds-table-head">Status</span>
            <span className="ds-table-head">Created</span>
          </div>
          {loading ? <p className="ds-empty">Loading transactions...</p> : null}
          {!loading && transactions.length === 0 ? (
            <p className="ds-empty">
              Transactions will appear after the first request.
            </p>
          ) : null}
          {selectedTransactions.map((transaction) => (
            <div className="ds-table-row" key={transaction.id}>
              <span className="ds-capsule">{transaction.type}</span>
              <span>
                {transaction.fromAccount?.accountId || 'System'} -&gt;{' '}
                {transaction.toAccount?.accountId || 'System'}
              </span>
              <span>{formatCurrency(transaction.amount)}</span>
              <span
                className={`ds-pill ${
                  transaction.status === 'success'
                    ? 'ds-pill--success'
                    : transaction.status === 'pending'
                      ? 'ds-pill--pending'
                      : 'ds-pill--failed'
                }`}
              >
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
