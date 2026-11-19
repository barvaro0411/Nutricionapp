jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn() }));
let createClient;
const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
let client, env, fetchMock;

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
                data: {
                  full_name: "Carla Soto",
                  age: 29,
                  gender: "female",
                  height_cm: 165,
                  current_weight_kg: 62,
                  target_weight_kg: 58,
                  activity_level: "moderate",
                  objective: "lose_weight",
                  dietary_restrictions: ["lactose_intolerance"],
                  custom_allergies: ["almendras"],
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "goals") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { calories: 1800, protein_g: 130, carbs_g: 170, fat_g: 60 },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      throw new Error("Unexpected table " + table);
    }),
  };

  createClient.mockReturnValue(client);
  global.fetch = fetchMock = jest.fn();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

function makeReq(body, token = "user-jwt") {
  return new Request("https://test/functions/v1/generate-personal-plan", {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function geminiJson(obj) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

test("generates sanitized MasterPlanData respecting requested matchDayWeekdays and profile constraints", async () => {
  const aiOutput = {
    user: {
      fullName: "Nombre Inventado",
      heightCm: 199,
      currentWeightKg: 99,
      targetWeightKg: 58,
      objectiveTitle: "Definición progresiva sin lácteos",
      objectiveDesc: "Plan equilibrado con alta saciedad y entrenamiento 4 días.",
      weeklyPaceKg: "-0.4 kg/sem",
    },
    dailyGoals: {
      standard: {
        days: "Lunes, Miércoles, Viernes, Sábado y Domingo",
        calories: 1780,
        caloriesRange: "1730 - 1830 kcal",
        proteinG: 130,
        proteinRange: "125 - 135 g",
        carbsG: 170,
        carbsRange: "160 - 180 g",
        fatG: 64,
        fatRange: "60 - 68 g",
      },
      matchDay: {
        days: "Martes y Jueves",
        weekdays: [0], // AI returned wrong day; server must enforce input [2, 4]
        calories: 9999, // Over limit; server must clamp to <= 8000
        caloriesRange: "2050 - 2150 kcal",
        proteinG: 130,
        carbsG: 245,
        carbsRange: "235 - 255 g",
        fatG: 60,
        fatRange: "55 - 65 g",
        focus: "Sesión intensa de piernas y cardio",
      },
      waterMl: 2800,
      waterRangeL: "2.8 L",
    },
    mealSchedule: [
      {
        time: "08:00",
        block: "Desayuno",
        detail: "Pan marraqueta integral con huevos revueltos y palta",
        energyKcal: 420,
        proteinG: "28g",
      },
      {
        time: "13:30",
        block: "Almuerzo",
        detail: "Pechuga de pollo con arroz basmati y ensalada chilena",
        energyKcal: 610,
        proteinG: "46g",
      },
      {
        time: "17:30",
        block: "Colación",
        detail: "Bebida vegetal de soya sin azúcar con plátano",
        energyKcal: 260,
        proteinG: "14g",
      },
      {
        time: "20:30",
        block: "Cena",
        detail: "Salmón al horno con papas cocidas y brócoli",
        energyKcal: 490,
        proteinG: "42g",
      },
    ],
    weeklyRoutine: [
      {
        day: "Martes",
        activity: "Tren inferior fuerza",
        goal: "Fuerza de piernas y glúteos",
        intensity: "RIR 2",
        exercises: [
          { name: "Sentadilla goblet", setsReps: "4x10", rir: "2", rest: "90s" },
        ],
      },
    ],
    supplements: [{ name: "Creatina Monohidratada", dose: "5 g", timing: "Con cualquier comida" }],
    dailyChecklist: [
      "Cumplir 130g de proteína",
      "Tomar 2.8 L de agua",
      "Tomar 5 g de creatina",
    ],
  };

  fetchMock.mockResolvedValueOnce(geminiJson(aiOutput));

  const { handleRequest } = require("../generate-personal-plan/index.ts");
  const res = await handleRequest(
    makeReq({
      matchDayWeekdays: [2, 4],
      trainingDaysPerWeek: 4,
      trainingFocus: "Tonificación y running",
      equipment: "gym",
      mealsPerDay: 4,
      targetWeightKg: 58,
    }),
  );

  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(client.rpc).toHaveBeenCalledTimes(1);
  expect(client.rpc).toHaveBeenCalledWith("reserve_ai_request", expect.objectContaining({ target_user_id: owner }));

  expect(body.plan.user.fullName).toBe("Carla Soto");
  expect(body.plan.user.heightCm).toBe(165);
  expect(body.plan.user.currentWeightKg).toBe(62);
  expect(body.plan.user.targetWeightKg).toBe(58);
  expect(body.plan.dailyGoals.matchDay.weekdays).toEqual([2, 4]);
  expect(body.plan.dailyGoals.matchDay.calories).toBe(8000);

  const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
  const userContent = sentBody.contents[0].parts[0].text;
  expect(userContent).toContain("lactosa");
  expect(userContent).toContain("almendras");
});

test("rejects unauthenticated requests with 401 before AI call", async () => {
  client.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("Invalid") });
  const { handleRequest } = require("../generate-personal-plan/index.ts");
  const res = await handleRequest(makeReq({}, ""));
  expect(res.status).toBe(401);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("returns 502 when AI returns malformed plan payload", async () => {
  fetchMock.mockResolvedValue(geminiJson({ broken: true }));
  const { handleRequest } = require("../generate-personal-plan/index.ts");
  const res = await handleRequest(makeReq({ matchDayWeekdays: [] }));
  expect(res.status).toBe(502);
  const body = await res.json();
  expect(body.error.code).toBe("AI_INVALID_RESPONSE");
});

test("coachContext resolves configured matchDay weekdays and todayChecklist", async () => {
  const mondayNoon = new Date("2026-10-12T16:00:00Z"); // Monday in America/Santiago
  const contextClient = {
    from: jest.fn((table) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        returns: jest.fn().mockReturnThis(),
        single: async () => ({ data: { objective: "maintain", current_weight_kg: 75, height_cm: 175 }, error: null }),
        maybeSingle: async () => {
          if (table === "goals") return { data: { calories: 2000, protein_g: 150, carbs_g: 220, fat_g: 60 }, error: null };
          if (table === "personal_plans") {
            return {
              data: {
                plan: {
                  user: { objectiveTitle: "Plan semanal" },
                  dailyGoals: {
                    standard: { calories: 2000, proteinG: 150, carbsG: 220, fatG: 60 },
                    matchDay: { weekdays: [1, 4], calories: 2450, proteinG: 150, carbsG: 320, fatG: 62 },
                  },
                  dailyChecklist: ["Tomar agua", "Creatina 5g"],
                },
              },
              error: null,
            };
          }
          if (table === "plan_daily_checklists") {
            return { data: { checked_items: ["Tomar agua"] }, error: null };
          }
          return { data: null, error: null };
        },
        then: (resolve) => resolve({ data: [], error: null }),
      };
      return chain;
    }),
  };

  const { loadCoachContext } = require("../_shared/coachContext.ts");
  const loaded = await loadCoachContext(contextClient, owner, mondayNoon, "full");
  expect(loaded.context.target.calories).toBe(2450);
  expect(loaded.context.personalPlan.isMatchDayToday).toBe(true);
  expect(loaded.context.personalPlan.todayChecklist).toEqual({
    completedCount: 1,
    totalItems: 2,
    pct: 50,
  });
});
