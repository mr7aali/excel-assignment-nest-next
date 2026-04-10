import type { Account, Transaction } from '../_lib/dashboard';
import { formatCurrency, formatDate } from '../_lib/dashboard';

type TransactionsPanelProps = {
  loading: boolean;
  selectedAccount: Account | null;
  transactions: Transaction[];
};

export function TransactionsPanel({
  loading,
  selectedAccount,
  transactions,
}: TransactionsPanelProps) {
  return (
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
        {transactions.map((transaction) => (
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
  );
}
