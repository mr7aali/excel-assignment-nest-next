export type Account = {
  id: string;
  accountId: string;
  holderName: string;
  balance: number;
  version: number;
  isActive: boolean;
};

export type Transaction = {
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

export type ApiResponse<T> = {
  data: T;
};

export type ApiError = {
  message?: string;
  error?: string | string[];
};

export type TransactionRequestType = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER';

export type AccountFormState = {
  accountId: string;
  holderName: string;
  initialBalance: string;
};

export type TransactionFormState = {
  type: TransactionRequestType;
  amount: string;
  fromAccountId: string;
  toAccountId: string;
  description: string;
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api';
export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? API_BASE_URL.replace(/\/api\/?$/, '');

export const defaultAccountForm: AccountFormState = {
  accountId: '',
  holderName: '',
  initialBalance: '0',
};

export const defaultTransactionForm: TransactionFormState = {
  type: 'DEPOSIT',
  amount: '',
  fromAccountId: '',
  toAccountId: '',
  description: '',
};

export const transactionTypeOptions = [
  'DEPOSIT',
  'WITHDRAW',
  'TRANSFER',
] as const;

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function getTransactionTypeLabel(type: TransactionRequestType) {
  if (type === 'DEPOSIT') {
    return 'Deposit';
  }

  if (type === 'WITHDRAW') {
    return 'Withdraw';
  }

  return 'Transfer';
}

export async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
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
