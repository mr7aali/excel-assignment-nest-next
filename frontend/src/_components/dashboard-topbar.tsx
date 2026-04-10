import type { Account } from '../_lib/dashboard';

type DashboardTopbarProps = {
  accounts: Account[];
  selectedAccount: Account | null;
  onSelectAccount: (accountId: string) => void;
};

export function DashboardTopbar({
  accounts,
  selectedAccount,
  onSelectAccount,
}: DashboardTopbarProps) {
  return (
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
            onChange={(event) => onSelectAccount(event.target.value)}
            disabled={accounts.length === 0}
          >
            {accounts.length === 0 ? <option value="">No accounts</option> : null}
            {accounts.map((account) => (
              <option key={account.id} value={account.accountId}>
                {account.holderName} ({account.accountId})
              </option>
            ))}
          </select>
        </div>
      </label>
    </section>
  );
}
