jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn() }));
const { callGemini } = require("../_shared/gemini.ts");
let fetchMock;
beforeEach(() => {
  jest.useFakeTimers();
  global.Deno = { env: { get: key => key === "GEMINI_MODEL" ? "gemini-test" : undefined } };
  global.fetch = fetchMock = jest.fn();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
const success = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"items":[]}' }] } }] }));

test.each([500, 502, 503, 504])("temporary HTTP %i recovers with a bounded retry", async status => {
  fetchMock.mockResolvedValueOnce(new Response("temporary failure", { status })).mockResolvedValueOnce(success());
  const result = callGemini("private-key", { contents: [] });
  await jest.advanceTimersByTimeAsync(500);
  expect((await result).text).toBe('{"items":[]}');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(console.warn).toHaveBeenCalledWith("Gemini request failed", { model: "gemini-test", status, attempt: 1 });
});

test("persistent unavailability stops after three attempts and returns a safe message", async () => {
  fetchMock.mockImplementation(async () => new Response("private upstream error private-key", { status: 503 }));
  const rejected = expect(callGemini("private-key", {})).rejects.toMatchObject({ status: 503, code: "AI_PROVIDER_ERROR", message: expect.stringContaining("temporalmente ocupado") });
  await jest.advanceTimersByTimeAsync(1500);
  await rejected;
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(JSON.stringify(console.warn.mock.calls)).not.toContain("private-key");
});

test.each([400, 401, 403, 404, 429])("HTTP %i is not retried with the same credentials", async status => {
  fetchMock.mockResolvedValue(new Response("private-key", { status }));
  await expect(callGemini("private-key", {})).rejects.toMatchObject({ code: [401, 403, 404].includes(status) ? "AI_PROVIDER_CONFIGURATION_ERROR" : "AI_PROVIDER_ERROR" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test.each([401, 403, 429])("primary HTTP %i can use the configured backup", async status => {
  fetchMock.mockResolvedValueOnce(new Response("denied", { status })).mockResolvedValueOnce(success());
  await expect(callGemini("primary,backup", {})).resolves.toMatchObject({ model: "gemini-test" });
  expect(fetchMock.mock.calls.map(call => call[1].headers["x-goog-api-key"])).toEqual(["primary", "backup"]);
});

test("a stalled request retains the existing 45 second deadline", async () => {
  fetchMock.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  }));
  const rejected = expect(callGemini("private-key", {})).rejects.toMatchObject({ status: 504, code: "AI_TIMEOUT" });
  await jest.advanceTimersByTimeAsync(45000);
  await rejected;
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("optional work shares its deadline across backup keys", async () => {
  fetchMock.mockImplementationOnce(async () => {
    await new Promise(resolve => setTimeout(resolve, 7000));
    return new Response('busy', { status: 429 });
  }).mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  }));
  const rejected = expect(callGemini('primary,backup', {}, { timeoutMs: 12000 })).rejects.toMatchObject({ status: 504, code: 'AI_TIMEOUT' });
  await jest.advanceTimersByTimeAsync(12000);
  await rejected;
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('a stalled primary key leaves time for the next key to answer', async () => {
  fetchMock.mockImplementationOnce((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  })).mockResolvedValueOnce(success());
  const pending = callGemini('primary,backup', {}, { timeoutMs: 12000 });
  await jest.advanceTimersByTimeAsync(6000);
  expect((await pending).text).toBe('{"items":[]}');
  expect(fetchMock.mock.calls.map(call => call[1].headers['x-goog-api-key'])).toEqual(['primary','backup']);
});
