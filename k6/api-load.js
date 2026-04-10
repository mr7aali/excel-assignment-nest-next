import http from 'k6/http';
import { check, fail, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { buildOptions } from './config.js';
import {
  buildUrl,
  createRunId,
  jsonHeaders,
  pickAccount,
  randomInt,
  summarize,
  unwrapData,
  uniqueIdempotencyKey,
} from './utils.js';

const profile = __ENV.PROFILE || 'load';
const baseUrl = (__ENV.BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const apiPrefix = (__ENV.API_PREFIX || '/api').replace(/\/$/, '');
const openingBalance = Number(__ENV.OPENING_BALANCE || 25000);
const seedAccounts = Number(
  __ENV.SEED_ACCOUNTS || defaultSeedAccountsForProfile(profile),
);

export const options = buildOptions(profile);

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 299 }, 409));

const transactionDuration = new Trend('transaction_duration', true);
const readDuration = new Trend('read_duration', true);
const transactionConflictRate = new Rate('transaction_conflict_rate');
const transactionCreatedCounter = new Counter('transactions_created');
const unexpectedTransactionStatusCounter = new Counter(
  'unexpected_transaction_status',
);
const unexpectedReadStatusCounter = new Counter('unexpected_read_status');

function apiUrl(path) {
  return buildUrl(baseUrl, `${apiPrefix}${path}`);
}

function defaultSeedAccountsForProfile(currentProfile) {
  switch (currentProfile) {
    case 'stress':
      return 200;
    case 'load':
      return 64;
    default:
      return 24;
  }
}

function pickRandomAccount(accounts) {
  return pickAccount(accounts, randomInt(0, accounts.length - 1));
}

function pickDistinctAccounts(accounts) {
  const fromIndex = randomInt(0, accounts.length - 1);
  let toIndex = randomInt(0, accounts.length - 1);

  while (toIndex === fromIndex) {
    toIndex = randomInt(0, accounts.length - 1);
  }

  return {
    fromAccountId: pickAccount(accounts, fromIndex),
    toAccountId: pickAccount(accounts, toIndex),
  };
}

function createAccountPayload(runId, index) {
  return {
    accountId: `ACC${runId}${String(index + 1).padStart(3, '0')}`,
    holderName: `Load Test User ${index + 1}`,
    initialBalance: openingBalance,
  };
}

export function setup() {
  const runId = __ENV.TEST_RUN_ID || createRunId();
  const accounts = [];

  for (let index = 0; index < seedAccounts; index++) {
    const payload = createAccountPayload(runId, index);
    const response = http.post(
      apiUrl('/accounts'),
      JSON.stringify(payload),
      {
        headers: jsonHeaders(),
        tags: { endpoint: 'POST /accounts', type: 'setup' },
      },
    );

    check(response, {
      'setup account created': (res) => res.status === 201,
    });

    if (response.status !== 201) {
      fail(`setup failed for account ${payload.accountId}: ${response.body}`);
    }

    accounts.push(payload.accountId);
  }

  return { accounts, runId };
}

export function listAccountsScenario() {
  group('list accounts', () => {
    const response = http.get(apiUrl('/accounts'), {
      tags: { endpoint: 'GET /accounts', type: 'read' },
    });

    readDuration.add(response.timings.duration);

    if (response.status !== 200) {
      unexpectedReadStatusCounter.add(1, {
        endpoint: 'GET /accounts',
        status: String(response.status),
      });
      console.error(
        `[k6] unexpected read response GET /accounts -> ${response.status}: ${response.body}`,
      );
    }

    check(response, {
      'accounts list status is 200': (res) => res.status === 200,
      'accounts list is wrapped': (res) => Array.isArray(unwrapData(res)),
    });
  });

  sleep(randomInt(1, 2));
}

export function listTransactionsScenario(data) {
  const accountId = pickRandomAccount(data.accounts);

  group('list transactions', () => {
    const response = http.get(
      apiUrl(`/transactions?limit=20&accountId=${accountId}`),
      {
        tags: { endpoint: 'GET /transactions', type: 'read' },
      },
    );

    readDuration.add(response.timings.duration);

    if (response.status !== 200) {
      unexpectedReadStatusCounter.add(1, {
        endpoint: 'GET /transactions',
        status: String(response.status),
      });
      console.error(
        `[k6] unexpected read response GET /transactions -> ${response.status}: ${response.body}`,
      );
    }

    check(response, {
      'transactions list status is 200': (res) => res.status === 200,
      'transactions list is wrapped': (res) => Array.isArray(unwrapData(res)),
    });
  });

  sleep(randomInt(1, 2));
}

function createTransferPayload(data) {
  const { fromAccountId, toAccountId } = pickDistinctAccounts(data.accounts);

  return {
    type: 'TRANSFER',
    amount: randomInt(5, 40),
    fromAccountId,
    toAccountId,
    description: `k6 transfer ${profile}`,
    idempotencyKey: uniqueIdempotencyKey('transfer'),
  };
}

function createDepositPayload(data) {
  const accountId = pickRandomAccount(data.accounts);

  return {
    type: 'DEPOSIT',
    amount: randomInt(10, 50),
    toAccountId: accountId,
    description: `k6 deposit ${profile}`,
    idempotencyKey: uniqueIdempotencyKey('deposit'),
  };
}

function postTransaction(payload) {
  const response = http.post(
    apiUrl('/transactions'),
    JSON.stringify(payload),
    {
      headers: jsonHeaders(),
      tags: { endpoint: 'POST /transactions', type: 'write', tx_type: payload.type },
    },
  );

  transactionDuration.add(response.timings.duration, { tx_type: payload.type });
  transactionConflictRate.add(response.status === 409);

  if (response.status === 201) {
    transactionCreatedCounter.add(1, { tx_type: payload.type });
  }

  if (response.status !== 201 && response.status !== 409) {
    unexpectedTransactionStatusCounter.add(1, {
      tx_type: payload.type,
      status: String(response.status),
    });
    console.error(
      `[k6] unexpected transaction response ${payload.type} -> ${response.status}: ${response.body}`,
    );
  }

  check(response, {
    'transaction request accepted': (res) =>
      res.status === 201 || res.status === 409,
    'transaction body is wrapped on success': (res) =>
      res.status !== 201 || !!unwrapData(res)?.txId,
  });
}

export function createTransferScenario(data) {
  group('create transfer transaction', () => {
    postTransaction(createTransferPayload(data));
  });

  sleep(randomInt(0, 1));
}

export function createDepositScenario(data) {
  group('create deposit transaction', () => {
    postTransaction(createDepositPayload(data));
  });

  sleep(randomInt(0, 1));
}

export function handleSummary(data) {
  const transactionStatusMetrics = Object.entries(data.metrics)
    .filter(([name]) => name.startsWith('unexpected_transaction_status{'))
    .map(([name, metric]) => `${name}: ${metric.values.count}`);
  const readStatusMetrics = Object.entries(data.metrics)
    .filter(([name]) => name.startsWith('unexpected_read_status{'))
    .map(([name, metric]) => `${name}: ${metric.values.count}`);

  if (transactionStatusMetrics.length > 0 || readStatusMetrics.length > 0) {
    console.log('unexpected response summary');
    for (const line of transactionStatusMetrics) {
      console.log(line);
    }
    for (const line of readStatusMetrics) {
      console.log(line);
    }
  }

  return summarize(data);
}
