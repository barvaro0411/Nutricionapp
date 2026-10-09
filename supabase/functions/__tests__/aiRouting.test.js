jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
let env, fetchMock, generateText, withAiFallback, ApiError, callGroq, transcribeGroq;
const messages = [{ role: 'system', content: 'Responde en español.' }, { role: 'user', content: 'Consulta sintética' }];
const groqReply = text => new Response(JSON.stringify({ choices: [{ message: { content: text, reasoning: 'private reasoning' } }], usage: { total_tokens: 100 } }));
const geminiReply = text => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
beforeEach(() => {
  jest.resetModules();
  env = { GROQ_API_KEY: 'groq-secret', GEMINI_MODEL: 'gemini-test' };
  global.Deno = { env: { get: name => env[name] } };
  global.fetch = fetchMock = jest.fn();
  ({ generateText, withAiFallback } = require('../_shared/aiRouting.ts'));
  ({ ApiError } = require('../_shared/http.ts'));
  ({ callGroq, transcribeGroq } = require('../_shared/groq.ts'));
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('text and coach use separate Groq models and return only the answer', async () => {
  fetchMock.mockImplementation(async () => groqReply('Respuesta en español'));
  for (const task of ['text', 'coach']) {
    const result = await generateText({ messages, task, geminiKey: 'gemini-secret' });
    expect(result.text).toBe('Respuesta en español');
  }
  const bodies = fetchMock.mock.calls.map(([, request]) => JSON.parse(request.body));
  expect(bodies.map(body => body.model)).toEqual(['openai/gpt-oss-20b', 'openai/gpt-oss-120b']);
  expect(bodies.every(body => body.include_reasoning === false && body.reasoning_effort === 'low')).toBe(true);
  expect(fetchMock.mock.calls.every(([url]) => url.startsWith('https://api.groq.com/'))).toBe(true);
});

test('quota failure uses Gemini and honors cooldown on following requests', async () => {
  fetchMock.mockImplementation(async url => url.includes('groq.com') ? new Response('secret and user text', { status: 429, headers: { 'Retry-After': '120' } }) : geminiReply('Respuesta de respaldo'));
  for (let i = 0; i < 2; i++) expect((await generateText({ messages, geminiKey: 'gemini-secret' })).text).toBe('Respuesta de respaldo');
  expect(fetchMock.mock.calls.filter(([url]) => url.includes('groq.com'))).toHaveLength(1);
  const backupBody = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(backupBody.systemInstruction.parts[0].text).toBe(messages[0].content);
  expect(JSON.stringify(console.warn.mock.calls)).not.toMatch(/groq-secret|gemini-secret|Consulta sintética|secret and user text/);
});

test('a text quota failure does not disable the separate coach model', async () => {
  fetchMock.mockImplementation(async (url, request) => url.includes('googleapis.com') ? geminiReply('Respaldo')
    : JSON.parse(request.body).model === 'openai/gpt-oss-20b' ? new Response('quota', { status: 429 }) : groqReply('Coach disponible'));
  await generateText({ messages, geminiKey: 'gemini-secret' });
  expect((await generateText({ messages, task: 'coach', geminiKey: 'gemini-secret' })).text).toBe('Coach disponible');
});

test('schema-invalid primary JSON falls back rather than returning invalid nutrients', async () => {
  fetchMock.mockResolvedValueOnce(groqReply('{"items":"invalid"}')).mockResolvedValueOnce(geminiReply('{"items":[]}'));
  const result = await generateText({ messages, json: true, geminiKey: 'gemini-secret', validate: text => {
    if (!Array.isArray(JSON.parse(text).items)) throw new ApiError(502, 'AI_INVALID_RESPONSE', 'Invalid');
  } });
  expect(JSON.parse(result.text).items).toEqual([]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test.each([401, 403, 404, 429])('Groq HTTP %i is not retried or exposed', async status => {
  fetchMock.mockResolvedValue(new Response('groq-secret upstream details', { status }));
  await expect(callGroq('groq-secret', messages)).rejects.toMatchObject({ status: status === 429 ? 429 : 503 });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(console.warn.mock.calls)).not.toContain('groq-secret');
});

test('temporary provider failures recover within one bounded call', async () => {
  jest.useFakeTimers();
  fetchMock.mockResolvedValueOnce(new Response('busy', { status: 503 })).mockResolvedValueOnce(groqReply('Recuperado'));
  const pending = callGroq('groq-secret', messages);
  await jest.advanceTimersByTimeAsync(500);
  expect((await pending).text).toBe('Recuperado');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('timeout aborts the request and produces a safe error', async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementation((url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('groq-secret', 'AbortError')))));
  const pending = expect(callGroq('groq-secret', messages, { timeoutMs: 2000 })).rejects.toMatchObject({ status: 504, code: 'AI_TIMEOUT' });
  await jest.advanceTimersByTimeAsync(2000); await pending;
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
});

test('fallback receives only the remaining shared time budget', async () => {
  jest.useFakeTimers();
  const backup = jest.fn().mockResolvedValue('Success');
  const pending = withAiFallback([
    { id: 'slow-primary', run: timeout => new Promise((resolve, reject) => setTimeout(() => reject(new ApiError(504, 'AI_TIMEOUT', 'Timeout')), timeout)) },
    { id: 'backup', run: backup },
  ], { timeoutMs: 20000, perProviderMs: 15000 });
  await jest.advanceTimersByTimeAsync(15000);
  expect(await pending).toBe('Success'); expect(backup).toHaveBeenCalledWith(5000);
});

test('business errors are returned without reinterpreting the input', async () => {
  const backup = jest.fn();
  await expect(withAiFallback([{ id: 'primary', run: async () => { throw new ApiError(422, 'NO_FOOD_DETECTED', 'No food'); } }, { id: 'backup', run: backup }])).rejects.toMatchObject({ status: 422 });
  expect(backup).not.toHaveBeenCalled();
});

test('audio uploads a Spanish transcription file with the correct MIME type', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ text: 'Comí una manzana.' })));
  expect((await transcribeGroq('groq-secret', btoa('synthetic-audio'), 'audio/webm')).text).toBe('Comí una manzana.');
  const [url, request] = fetchMock.mock.calls[0];
  expect(url).toMatch(/audio\/transcriptions$/);
  expect(request.headers['Content-Type']).toBeUndefined();
  expect(request.body.get('file').name).toBe('recording.webm');
  expect(request.body.get('file').type).toBe('audio/webm');
  expect(await request.body.get('file').text()).toBe('synthetic-audio');
  expect(request.body.get('language')).toBe('es');
});

test('OpenAI credentials never enable a paid fallback', async () => {
  env.OPENAI_API_KEY = 'unused-openai-secret';
  fetchMock.mockImplementation(async () => new Response('quota', { status: 429 }));
  await expect(generateText({ messages, geminiKey: 'gemini-secret' })).rejects.toMatchObject({ status: 429 });
  expect(fetchMock.mock.calls.some(([url]) => url.includes('api.openai.com'))).toBe(false);
});
