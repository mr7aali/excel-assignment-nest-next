export function buildUrl(baseUrl, path) {
  return `${baseUrl}${path}`;
}

export function jsonHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  };
}

export function safeJson(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}

export function unwrapData(response) {
  const body = safeJson(response);
  return body?.data ?? null;
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createRunId() {
  return `${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

export function pickAccount(accounts, index) {
  return accounts[index % accounts.length];
}

export function uniqueIdempotencyKey(prefix) {
  return `${prefix}-${__VU}-${__ITER}-${Date.now()}`;
}

export function summarize(data) {
  const lines = [
    'k6 summary',
    `http_req_duration p95: ${data.metrics.http_req_duration?.values['p(95)'] ?? 'n/a'} ms`,
    `http_req_failed rate: ${data.metrics.http_req_failed?.values.rate ?? 'n/a'}`,
    `checks pass rate: ${data.metrics.checks?.values.rate ?? 'n/a'}`,
    `transactions_created: ${data.metrics.transactions_created?.values.count ?? 0}`,
    `transaction_conflict_rate: ${data.metrics.transaction_conflict_rate?.values.rate ?? 'n/a'}`,
  ];

  return {
    stdout: `${lines.join('\n')}\n`,
    'k6/results/latest-summary.json': JSON.stringify(data, null, 2),
  };
}
