'use client';

import './dashboard.css';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { AccountsPanel } from '../_components/accounts-panel';
import { DashboardFlashMessages } from '../_components/dashboard-flash-messages';
import { DashboardStats } from '../_components/dashboard-stats';
import { DashboardTopbar } from '../_components/dashboard-topbar';
import { TransactionFormPanel } from '../_components/transaction-form-panel';
import { TransactionsPanel } from '../_components/transactions-panel';
import {
  type Account,
  type AccountFormState,
  type ApiResponse,
  type Transaction,
  type TransactionFormState,
  type TransactionRequestType,
  getNextAccountId,
  SOCKET_URL,
  defaultAccountForm,
  defaultTransactionForm,
  requestJson,
} from '../_lib/dashboard';

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [showCreateAccountForm, setShowCreateAccountForm] = useState(false);
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

  const needsFromAccount =
    transactionForm.type === 'WITHDRAW' || transactionForm.type === 'TRANSFER';
  const needsToAccount =
    transactionForm.type === 'DEPOSIT' || transactionForm.type === 'TRANSFER';

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

  function handleAccountFormChange(
    field: keyof AccountFormState,
    value: string,
  ) {
    setAccountForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleOpenCreateAccountForm() {
    setAccountForm({
      ...defaultAccountForm,
      accountId: getNextAccountId(accounts),
    });
    setShowCreateAccountForm(true);
  }

  function handleCloseCreateAccountForm() {
    setShowCreateAccountForm(false);
  }

  function handleTransactionFieldChange(
    field: Exclude<keyof TransactionFormState, 'type'>,
    value: string,
  ) {
    setTransactionForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleTransactionTypeChange(nextType: TransactionRequestType) {
    const selectedAccountValue = selectedAccount?.accountId ?? '';

    setTransactionForm((current) => ({
      ...current,
      type: nextType,
      fromAccountId:
        nextType === 'DEPOSIT' ? '' : selectedAccountValue,
      toAccountId:
        nextType === 'DEPOSIT'
          ? selectedAccountValue
          : nextType === 'WITHDRAW'
            ? ''
            : current.toAccountId === selectedAccountValue
              ? ''
              : current.toAccountId,
    }));
  }

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
      setShowCreateAccountForm(false);
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

  useEffect(() => {
    void loadDashboardData();
  }, []);

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].accountId);
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    const selectedAccountValue = selectedAccount?.accountId ?? '';

    setTransactionForm((current) => {
      if (current.type === 'DEPOSIT') {
        if (
          current.fromAccountId === '' &&
          current.toAccountId === selectedAccountValue
        ) {
          return current;
        }

        return {
          ...current,
          fromAccountId: '',
          toAccountId: selectedAccountValue,
        };
      }

      if (current.type === 'WITHDRAW') {
        if (
          current.fromAccountId === selectedAccountValue &&
          current.toAccountId === ''
        ) {
          return current;
        }

        return {
          ...current,
          fromAccountId: selectedAccountValue,
          toAccountId: '',
        };
      }

      const nextToAccountId =
        current.toAccountId === selectedAccountValue ? '' : current.toAccountId;

      if (
        current.fromAccountId === selectedAccountValue &&
        current.toAccountId === nextToAccountId
      ) {
        return current;
      }

      return {
        ...current,
        fromAccountId: selectedAccountValue,
        toAccountId: nextToAccountId,
      };
    });
  }, [selectedAccount]);

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socket.on('transaction:created', () => {
      void loadDashboardData();
    });

    socket.on(
      'balance:updated',
      (payload: { account: Account; transactionId: string }) => {
        setAccounts((current) =>
          current.map((account) =>
            account.accountId === payload.account.accountId
              ? payload.account
              : account,
          ),
        );
      },
    );

    socket.on('transaction:failed', () => {
      void loadDashboardData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <main className="ds-shell">
      <DashboardTopbar
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelectAccount={setSelectedAccountId}
      />

      <DashboardStats
        selectedAccount={selectedAccount}
        selectedTransactionsCount={selectedTransactions.length}
        selectedSuccessCount={selectedSuccessCount}
      />

      <DashboardFlashMessages
        errorMessage={errorMessage}
        successMessage={successMessage}
      />

      <section className="ds-main-grid">
        <TransactionFormPanel
          accounts={accounts}
          needsFromAccount={needsFromAccount}
          needsToAccount={needsToAccount}
          selectedAccount={selectedAccount}
          submittingTransaction={submittingTransaction}
          transactionForm={transactionForm}
          onFieldChange={handleTransactionFieldChange}
          onSubmit={handleCreateTransaction}
          onTransactionTypeChange={handleTransactionTypeChange}
        />

        <AccountsPanel
          accountForm={accountForm}
          accounts={accounts}
          loading={loading}
          selectedAccount={selectedAccount}
          showCreateAccountForm={showCreateAccountForm}
          submittingAccount={submittingAccount}
          onAccountFieldChange={handleAccountFormChange}
          onCloseCreateAccountForm={handleCloseCreateAccountForm}
          onRefresh={() => void loadDashboardData()}
          onSelectAccount={setSelectedAccountId}
          onSubmit={handleCreateAccount}
          onToggleCreateAccountForm={handleOpenCreateAccountForm}
        />
      </section>

      <TransactionsPanel
        loading={loading}
        selectedAccount={selectedAccount}
        transactions={selectedTransactions}
      />
    </main>
  );
}
