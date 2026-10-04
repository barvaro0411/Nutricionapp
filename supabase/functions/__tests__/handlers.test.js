jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn() }));
const { createClient } = require("@supabase/supabase-js");
const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
let client, env, fetchMock;
beforeEach(() => {
  env = { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "server-secret", GEMINI_API_KEY: "gemini-secret" };
  global.Deno = { env: { get: k => env[k] }, serve: jest.fn() };
  client = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: owner } }, error: null }) },
    rpc: jest.fn().mockResolvedValue({ data: { allowed: true }, error: null }),
    storage: { from: jest.fn().mockReturnValue({ download: jest.fn() }) } };
  createClient.mockReturnValue(client);
  global.fetch = fetchMock = jest.fn();
});
const request = body => new Request("https://test/functions/v1/test", { method: "POST", headers: { Authorization: "Bearer user-token", "Content-Type": "application/json" }, body: JSON.stringify(body) });
test("photo rejects forged sessions and never downloads", async () => {
  client.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
  const { handleRequest } = require("../analyze-meal/index.ts");
  expect((await handleRequest(request({ image_path: owner + "/photo.jpg" }))).status).toBe(401);
  expect(client.storage.from).not.toHaveBeenCalled();
});
test("photo rejects another user's path before charging AI quota", async () => {
  const { handleRequest } = require("../analyze-meal/index.ts");
  expect((await handleRequest(request({ image_path: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/photo.jpg" }))).status).toBe(403);
  expect(client.rpc).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
});
test("text handler processes real provider JSON and computes totals", async () => {
  const output = { items: [{ food: "Manzana", grams: 100, calories: 52, protein: 0.3, carbs: 14, fat: 0.2, confidence: 0.9 }], meal_type_guess: "snack", notes: null };
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] })));
  const { handleRequest } = require("../parse-meal-text/index.ts");
  const res = await handleRequest(request({ text: "Una manzana", client_time_iso: "2026-10-02T12:00:00Z" }));
  expect(res.status).toBe(200);
  expect((await res.json()).data.totals.calories).toBe(52);
  expect(client.auth.getUser).toHaveBeenCalledWith("user-token");
  expect(client.rpc).toHaveBeenCalledWith("reserve_ai_request", expect.objectContaining({ target_user_id: owner }));
});
test("quota storage failure denies requests and does not call AI", async () => {
  client.rpc.mockResolvedValue({ data: null, error: new Error("missing migration") });
  const { handleRequest } = require("../parse-meal-text/index.ts");
  expect((await handleRequest(request({ text: "Una manzana" }))).status).toBe(503);
  expect(fetchMock).not.toHaveBeenCalled();
});
test("provider error details and keys are not returned to the client", async () => {
  fetchMock.mockResolvedValue(new Response("private upstream error gemini-secret", { status: 500 }));
  const { handleRequest } = require("../parse-meal-text/index.ts");
  const res = await handleRequest(request({ text: "Una manzana" }));
  expect(res.status).toBe(502); expect(await res.text()).not.toContain("gemini-secret");
});
test("missing session rejects before reading the request; wrong HTTP method rejected", async () => {
  const { handleRequest } = require("../parse-meal-text/index.ts");
  expect((await handleRequest(new Request("https://test", { method: "POST", body: "{}" }))).status).toBe(401);
  expect((await handleRequest(new Request("https://test"))).status).toBe(405);
});
