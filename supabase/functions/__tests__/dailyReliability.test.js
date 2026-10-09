jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
const { createProviderHealth, providerScope } = require('../_shared/providerHealth.ts');
const { providerRetrySeconds, durationSeconds, nextPacificDaySeconds, retryHeaderSeconds } = require('../_shared/providerRetry.ts');
const { createAsyncCache } = require('../_shared/asyncCache.ts');

test('cooldowns survive another instance, isolate keys/models and expire', async () => {
  let now = 100000;
  const rows = new Map();
  const shared = { read: async scopes => scopes.map(scope => rows.get(scope)).filter(Boolean), write: async row => rows.set(row.scope, row) };
  const first = createProviderHealth({ now: () => now, shared });
  await first.block('gemini', 'private-key', 'flash', 429, 120);
  const next = createProviderHealth({ now: () => now, shared });
  await expect(next.check('gemini', 'private-key', 'flash')).rejects.toMatchObject({ status: 429, retryAfterSeconds: 120 });
  await expect(next.check('gemini', 'other-key', 'flash')).resolves.toBeUndefined();
  await expect(next.check('gemini', 'private-key', 'live')).resolves.toBeUndefined();
  expect([...rows.keys()].join()).not.toContain('private-key');
  expect(await providerScope('gemini', 'private-key', 'flash')).toMatch(/^gemini:[0-9a-f]{64}:flash$/);
  now += 121000;
  await expect(next.check('gemini', 'private-key', 'flash')).resolves.toBeUndefined();
});

test('credential errors block all models of only that credential', async () => {
  const health = createProviderHealth();
  await health.block('groq', 'bad-key', 'text', 401, 300);
  await expect(health.check('groq', 'bad-key', 'vision')).rejects.toMatchObject({ status: 503 });
  await expect(health.check('groq', 'good-key', 'vision')).resolves.toBeUndefined();
});

test('a failed shared store retains local protection without blocking healthy providers', async () => {
  const health = createProviderHealth({ shared: { read: async () => { throw Error('offline'); }, write: async () => { throw Error('offline'); } } });
  await health.block('groq', 'one', 'text', 429, 30);
  await expect(health.check('groq', 'one', 'text')).rejects.toMatchObject({ status: 429 });
  await expect(health.check('groq', 'two', 'text')).resolves.toBeUndefined();
});

test.each([false, true])('Gemini daily quota beats short RetryInfo regardless of detail order (%s)', async reverse => {
  const now = Date.parse('2026-10-09T18:00:00Z');
  const details = [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] },
    { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '21s' }];
  const response = new Response(JSON.stringify({ error: { details: reverse ? details.reverse() : details } }), { status: 429 });
  const seconds = await providerRetrySeconds(response, 'gemini', now);
  expect(seconds).toBeGreaterThanOrEqual(46799);
  expect(seconds).toBeLessThanOrEqual(46801);
  expect(nextPacificDaySeconds(now)).toBe(seconds);
});

test('Groq uses exhausted quota reset headers and parses bounded durations and dates', async () => {
  const response = new Response('', { status: 429, headers: { 'Retry-After': '7.66', 'x-ratelimit-remaining-requests': '0', 'x-ratelimit-reset-requests': '2m59.56s' } });
  expect(await providerRetrySeconds(response, 'groq')).toBe(180);
  expect(durationSeconds('1h2m3.5s')).toBe(3724);
  expect(durationSeconds('not a duration')).toBeUndefined();
  expect(retryHeaderSeconds('Fri, 09 Oct 2026 18:01:00 GMT', Date.parse('2026-10-09T18:00:00Z'))).toBe(60);
  expect(retryHeaderSeconds('999999')).toBe(86400);
});

test('translation cache coalesces work, expires, isolates users and does not cache failures', async () => {
  let now = 0;
  const cached = createAsyncCache(2, 100, () => now);
  const load = jest.fn(async () => 'rice');
  expect(await Promise.all([cached('user-1:arroz', load), cached('user-1:arroz', load)])).toEqual(['rice', 'rice']);
  expect(load).toHaveBeenCalledTimes(1);
  await cached('user-2:arroz', load); expect(load).toHaveBeenCalledTimes(2);
  now = 101;
  await cached('user-1:arroz', load); expect(load).toHaveBeenCalledTimes(3);
  await expect(cached('user-1:failed', async () => { throw Error('invalid'); })).rejects.toThrow('invalid');
  expect(await cached('user-1:failed', load)).toBe('rice');
});
