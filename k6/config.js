const DEFAULT_THRESHOLDS = {
  checks: ['rate>0.99'],
  http_req_failed: ['rate<0.02'],
  http_req_duration: ['p(95)<750', 'p(99)<1500'],
  transaction_duration: ['p(95)<1000'],
  read_duration: ['p(95)<500'],
  transaction_conflict_rate: ['rate<0.15'],
};

const PROFILES = {
  smoke: {
    scenarios: {
      accounts_read: {
        executor: 'constant-vus',
        exec: 'listAccountsScenario',
        vus: 2,
        duration: '15s',
      },
      transaction_write: {
        executor: 'constant-vus',
        exec: 'createTransferScenario',
        vus: 2,
        duration: '15s',
      },
    },
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      http_req_duration: ['p(95)<900', 'p(99)<1800'],
      transaction_conflict_rate: ['rate<0.2'],
    },
  },
  load: {
    scenarios: {
      accounts_read: {
        executor: 'ramping-arrival-rate',
        exec: 'listAccountsScenario',
        startRate: 5,
        timeUnit: '1s',
        preAllocatedVUs: 10,
        maxVUs: 30,
        stages: [
          { duration: '30s', target: 15 },
          { duration: '1m', target: 15 },
          { duration: '20s', target: 0 },
        ],
      },
      transactions_read: {
        executor: 'ramping-arrival-rate',
        exec: 'listTransactionsScenario',
        startRate: 5,
        timeUnit: '1s',
        preAllocatedVUs: 10,
        maxVUs: 30,
        stages: [
          { duration: '30s', target: 10 },
          { duration: '1m', target: 10 },
          { duration: '20s', target: 0 },
        ],
      },
      transfers_write: {
        executor: 'ramping-arrival-rate',
        exec: 'createTransferScenario',
        startRate: 4,
        timeUnit: '1s',
        preAllocatedVUs: 12,
        maxVUs: 36,
        stages: [
          { duration: '30s', target: 12 },
          { duration: '1m', target: 12 },
          { duration: '20s', target: 0 },
        ],
      },
      deposits_write: {
        executor: 'ramping-arrival-rate',
        exec: 'createDepositScenario',
        startRate: 2,
        timeUnit: '1s',
        preAllocatedVUs: 8,
        maxVUs: 24,
        stages: [
          { duration: '30s', target: 6 },
          { duration: '1m', target: 6 },
          { duration: '20s', target: 0 },
        ],
      },
    },
    thresholds: DEFAULT_THRESHOLDS,
  },
  stress: {
    scenarios: {
      transfers_write: {
        executor: 'ramping-arrival-rate',
        exec: 'createTransferScenario',
        startRate: 8,
        timeUnit: '1s',
        preAllocatedVUs: 40,
        maxVUs: 120,
        stages: [
          { duration: '30s', target: 18 },
          { duration: '45s', target: 30 },
          { duration: '45s', target: 40 },
          { duration: '30s', target: 0 },
        ],
      },
      transactions_read: {
        executor: 'ramping-arrival-rate',
        exec: 'listTransactionsScenario',
        startRate: 6,
        timeUnit: '1s',
        preAllocatedVUs: 20,
        maxVUs: 60,
        stages: [
          { duration: '30s', target: 12 },
          { duration: '45s', target: 18 },
          { duration: '45s', target: 18 },
          { duration: '30s', target: 0 },
        ],
      },
    },
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      http_req_duration: ['p(95)<1800', 'p(99)<3200'],
      transaction_duration: ['p(95)<2200'],
      read_duration: ['p(95)<1000'],
      transaction_conflict_rate: ['rate<0.2'],
    },
  },
};

export function buildOptions(profile = 'load') {
  return PROFILES[profile] ?? PROFILES.load;
}
