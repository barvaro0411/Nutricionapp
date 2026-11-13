jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn() }));
let createClient;
const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
let client, env, fetchMock, insertedRecipes;

beforeEach(() => {
  jest.spyOn(crypto.subtle, "digest").mockImplementation(async (_, bytes) => {
    const hash = require("node:crypto").createHash("sha256").update(Buffer.from(bytes)).digest();
    return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
  });
  jest.resetModules();
  ({ createClient } = require("@supabase/supabase-js"));
  env = {
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "server-secret",
    GEMINI_API_KEY: "gemini-secret",
  };
  global.Deno = { env: { get: (k) => env[k] }, serve: jest.fn() };
  insertedRecipes = [];

  client = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: owner } }, error: null }),
    },
    rpc: jest.fn().mockResolvedValue({ data: { allowed: true }, error: null }),
    from: jest.fn((table) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { dietary_restrictions: ["celiac_gluten"], custom_allergies: ["mani"] },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "user_recipes") {
        return {
          insert: jest.fn((row) => {
            const saved = {
              id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              created_at: "2026-11-12T20:00:00Z",
              updated_at: "2026-11-12T20:00:00Z",
              is_favorite: false,
              ...row,
            };
            insertedRecipes.push(saved);
            return {
              select: () => ({
                single: async () => ({ data: saved, error: null }),
              }),
            };
          }),
        };
      }
      throw new Error("Unexpected table " + table);
    }),
  };

  createClient.mockReturnValue(client);
  global.fetch = fetchMock = jest.fn();
});

afterEach(() => jest.restoreAllMocks());

const request = (body) =>
  new Request("https://test/functions/v1/generate-recipe", {
    method: "POST",
    headers: {
      Authorization: "Bearer user-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

test("rejects unauthenticated requests, wrong methods, and invalid payloads before charging quota", async () => {
  const { handleRequest } = require("../generate-recipe/index.ts");
  expect((await handleRequest(new Request("https://test"))).status).toBe(405);
  expect((await handleRequest(new Request("https://test", { method: "POST", body: "{}" }))).status).toBe(401);
  expect((await handleRequest(request({ servings: 99 }))).status).toBe(400);
  expect(client.rpc).not.toHaveBeenCalled();
});

test("generates recipe respecting dietary preferences, recalculates macros from ingredients, and saves in user_recipes", async () => {
  const aiPayload = {
    title: "Pollo salteado con arroz y palta",
    description: "Plato chileno balanceado sin gluten ni maní.",
    mealType: "almuerzo",
    prepTimeMinutes: 25,
    servings: 2,
    ingredients: [
      {
        foodName: "Pechuga de pollo",
        grams: 300,
        unit: "g",
        category: "proteinas",
        calories: 495,
        protein: 93,
        carbs: 0,
        fat: 10.8,
      },
      {
        foodName: "Arroz blanco cocido",
        grams: 300,
        unit: "g",
        category: "despensa_granos",
        calories: 390,
        protein: 8,
        carbs: 84,
        fat: 0.9,
      },
      {
        foodName: "Palta Hass",
        grams: 100,
        unit: "unidad",
        quantity: 1,
        category: "verduras_frutas",
        calories: 160,
        protein: 2,
        carbs: 8.5,
        fat: 14.7,
      },
    ],
    instructions: [
      "Saltear el pollo en tiras hasta dorar.",
      "Servir con el arroz caliente y palta laminada.",
    ],
  };

  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(aiPayload) }] } }],
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  );

  const { handleRequest } = require("../generate-recipe/index.ts");
  const res = await handleRequest(
    request({
      mealType: "almuerzo",
      servings: 2,
      maxPrepMinutes: 30,
      availableIngredients: ["pollo", "arroz", "palta"],
      targetMacros: { calories: 550, protein: 45 },
    })
  );

  expect(res.status).toBe(200);
  expect(client.rpc).toHaveBeenCalledTimes(1);
  expect(client.rpc).toHaveBeenCalledWith("reserve_ai_request", expect.objectContaining({ target_user_id: owner }));

  const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
  const promptText = JSON.stringify(sentBody);
  expect(promptText).toContain("Sin gluten / celíaco");
  expect(promptText).toContain("mani");

  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.data.calories_per_serving).toBe(522.5);
  expect(body.data.protein_per_serving).toBe(51.5);
  expect(body.data.ingredients).toHaveLength(3);
  expect(insertedRecipes).toHaveLength(1);
});

test("returns clean error without saving when AI provider fails repeatedly", async () => {
  jest.useFakeTimers();
  const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
  try {
    fetchMock.mockImplementation(async () => new Response("upstream error", { status: 500 }));
    const { handleRequest } = require("../generate-recipe/index.ts");
    const pending = handleRequest(request({ mealType: "cena", servings: 1 }));
    await jest.advanceTimersByTimeAsync(2500);
    const res = await pending;
    expect(res.status).toBe(503);
    expect(insertedRecipes).toHaveLength(0);
    expect(client.rpc).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
    warning.mockRestore();
  }
});
