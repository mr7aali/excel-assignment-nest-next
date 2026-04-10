import type { Account, AccountFormState } from '../_lib/dashboard';
import { formatCurrency } from '../_lib/dashboard';

type AccountsPanelProps = {
  accountForm: AccountFormState;
  accounts: Account[];
  loading: boolean;
  selectedAccount: Account | null;
  showCreateAccountForm: boolean;
  submittingAccount: boolean;
  onAccountFieldChange: (field: keyof AccountFormState, value: string) => void;
  onRefresh: () => void;
  onSelectAccount: (accountId: string) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onToggleCreateAccountForm: () => void;
};

export function AccountsPanel({
  accountForm,
  accounts,
  loading,
  selectedAccount,
  showCreateAccountForm,
  submittingAccount,
  onAccountFieldChange,
  onRefresh,
  onSelectAccount,
  onSubmit,
  onToggleCreateAccountForm,
}: AccountsPanelProps) {
  return (
    <article className="ds-panel">
      <div className="ds-tabs">
        <span className="ds-tab ds-tab--active">Accounts</span>
        <button
          type="button"
          className="ds-tab ds-tab--ghost"
          onClick={onRefresh}
        >
          Refresh
        </button>
      </div>

      <div className="ds-panel__body ds-panel__body--flush">
        <div className="ds-list" role="list">
          {loading ? <p className="ds-empty">Loading accounts...</p> : null}
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
              onClick={() => onSelectAccount(account.accountId)}
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
        <div className="ds-inline-create-account">
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={onToggleCreateAccountForm}
          >
            Crate new account
          </button>

          {showCreateAccountForm ? (
            <form className="ds-form" onSubmit={onSubmit}>
              <label className="ds-form-row">
                <span>Account ID</span>
                <input
                  value={accountForm.accountId}
                  onChange={(event) =>
                    onAccountFieldChange('accountId', event.target.value)
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
                    onAccountFieldChange('holderName', event.target.value)
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
                    onAccountFieldChange('initialBalance', event.target.value)
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
          ) : null}
        </div>
      </div>
    </article>
  );
}
