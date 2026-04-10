import type {
  Account,
  TransactionFormState,
  TransactionRequestType,
} from '../_lib/dashboard';
import {
  getTransactionTypeLabel,
  transactionTypeOptions,
} from '../_lib/dashboard';

type TransactionFormPanelProps = {
  accounts: Account[];
  needsFromAccount: boolean;
  needsToAccount: boolean;
  selectedAccount: Account | null;
  submittingTransaction: boolean;
  transactionForm: TransactionFormState;
  onFieldChange: (
    field: Exclude<keyof TransactionFormState, 'type'>,
    value: string,
  ) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onTransactionTypeChange: (type: TransactionRequestType) => void;
};

export function TransactionFormPanel({
  accounts,
  needsFromAccount,
  needsToAccount,
  selectedAccount,
  submittingTransaction,
  transactionForm,
  onFieldChange,
  onSubmit,
  onTransactionTypeChange,
}: TransactionFormPanelProps) {
  const toAccountOptions = accounts.filter(
    (account) => account.accountId !== selectedAccount?.accountId,
  );
  const amountValue = Number(transactionForm.amount);
  const selectedAccountLabel = selectedAccount
    ? `${selectedAccount.holderName} (${selectedAccount.accountId})`
    : 'Select an account from the top bar first';
  const hasValidAmount =
    transactionForm.amount.trim() !== '' &&
    Number.isFinite(amountValue) &&
    amountValue > 0;
  const hasValidFromAccount =
    !needsFromAccount || transactionForm.fromAccountId.trim() !== '';
  const hasValidToAccount =
    !needsToAccount || transactionForm.toAccountId.trim() !== '';
  const hasDistinctAccounts =
    !needsFromAccount ||
    !needsToAccount ||
    transactionForm.fromAccountId !== transactionForm.toAccountId;
  const canSubmit =
    hasValidAmount &&
    hasValidFromAccount &&
    hasValidToAccount &&
    hasDistinctAccounts;

  return (
    <article className="ds-panel">
      <div className="ds-tabs">
        <span className="ds-tab ds-tab--active">New transaction</span>
      </div>

      <div className="ds-panel__body">
        <form className="ds-form" onSubmit={onSubmit}>
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
                  onClick={() => onTransactionTypeChange(type)}
                >
                  {getTransactionTypeLabel(type)}
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
              inputMode="decimal"
              value={transactionForm.amount}
              onChange={(event) => onFieldChange('amount', event.target.value)}
              placeholder="250.00"
              required
            />
          </label>
          {needsFromAccount ? (
            <label className="ds-form-row">
              <span>From Account</span>
              <input value={selectedAccountLabel} readOnly />
            </label>
          ) : null}
          {needsToAccount ? (
            <label className="ds-form-row">
              <span>To Account</span>
              {transactionForm.type === 'DEPOSIT' ? (
                <input value={selectedAccountLabel} readOnly />
              ) : (
                <select
                  value={transactionForm.toAccountId}
                  onChange={(event) =>
                    onFieldChange('toAccountId', event.target.value)
                  }
                  required={needsToAccount}
                  disabled={!selectedAccount || toAccountOptions.length === 0}
                >
                  <option value="">
                    {selectedAccount
                      ? toAccountOptions.length > 0
                        ? 'Select destination account'
                        : 'No destination accounts'
                      : 'Select an account from the top bar first'}
                  </option>
                  {toAccountOptions.map((account) => (
                    <option key={account.id} value={account.accountId}>
                      {account.holderName} ({account.accountId})
                    </option>
                  ))}
                </select>
              )}
            </label>
          ) : null}
          <label className="ds-form-row ds-form-row--single">
            <span>Description</span>
            <input
              value={transactionForm.description}
              onChange={(event) =>
                onFieldChange('description', event.target.value)
              }
              placeholder="Optional note"
              maxLength={140}
            />
          </label>
          <div className="ds-form-row ds-form-row--single">
            <button
              type="submit"
              className="ds-btn"
              disabled={submittingTransaction || !selectedAccount || !canSubmit}
            >
              {submittingTransaction ? 'Submitting...' : 'Submit Transaction'}
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}
