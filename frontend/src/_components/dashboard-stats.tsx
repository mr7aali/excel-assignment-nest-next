import type { Account } from '../_lib/dashboard';
import { formatCurrency } from '../_lib/dashboard';

type DashboardStatsProps = {
  selectedAccount: Account | null;
  selectedTransactionsCount: number;
  selectedSuccessCount: number;
};

export function DashboardStats({
  selectedAccount,
  selectedTransactionsCount,
  selectedSuccessCount,
}: DashboardStatsProps) {
  return (
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
        <strong>{selectedTransactionsCount}</strong>
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
  );
}
