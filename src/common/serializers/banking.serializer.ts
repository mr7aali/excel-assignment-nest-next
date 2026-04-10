import { Account, Prisma, Transaction, TransactionStatus } from '@prisma/client';

type TransactionWithAccounts = Transaction & {
  fromAccount: Account | null;
  toAccount: Account | null;
};

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  return value === null || value === undefined ? null : Number(value.toString());
}

export function serializeAccount(account: Account) {
  return {
    id: account.id,
    accountId: account.accountId,
    holderName: account.holderName,
    balance: decimalToNumber(account.balance),
    version: account.version,
    isActive: account.isActive,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

function serializeAccountReference(account: Account | null) {
  return account ? serializeAccount(account) : null;
}

export function serializeTransaction(transaction: TransactionWithAccounts) {
  return {
    id: transaction.id,
    txId: transaction.txId,
    type: transaction.type.toLowerCase(),
    status: transaction.status.toLowerCase(),
    amount: decimalToNumber(transaction.amount),
    description: transaction.description,
    failureReason: transaction.failureReason,
    idempotencyKey: transaction.idempotencyKey,
    fromVersionBefore: transaction.fromVersionBefore,
    fromVersionAfter: transaction.fromVersionAfter,
    toVersionBefore: transaction.toVersionBefore,
    toVersionAfter: transaction.toVersionAfter,
    fromBalanceBefore: decimalToNumber(transaction.fromBalanceBefore),
    fromBalanceAfter: decimalToNumber(transaction.fromBalanceAfter),
    toBalanceBefore: decimalToNumber(transaction.toBalanceBefore),
    toBalanceAfter: decimalToNumber(transaction.toBalanceAfter),
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    fromAccount: serializeAccountReference(transaction.fromAccount),
    toAccount: serializeAccountReference(transaction.toAccount),
    success: transaction.status === TransactionStatus.SUCCESS,
  };
}
