jest.mock("react-native", () => ({ Platform: { OS: "web" } }));
jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/services/supabase", () => ({
  supabaseUrl: "https://placeholder-project.supabase.co",
  supabaseAnonKey: "placeholder-anon-key",
  supabase: {
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

import {
  enqueueMutation,
  getQueuedMutations,
  removeQueuedMutation,
  updateQueuedMutation,
  clearQueue,
  updateAccessTokens,
  buildMealMutation,
  buildWaterMutation,
  requestBackgroundSync,
  QueuedMutation,
} from "../offlineQueueStore";
import { syncOfflineQueueNow, useOfflineStore } from "../offlineService";

describe("offlineQueueStore & offlineService", () => {
  beforeEach(async () => {
    await clearQueue();
    useOfflineStore.getState().resetPendingSync();
  });

  describe("mutation builders", () => {
    it("builds a self-contained meal mutation with RPC parameters", () => {
      const mutation = buildMealMutation({
        id: "meal-1",
        accessToken: "test-token-123",
        mealType: "almuerzo",
        items: [{ food: "Arroz con pollo", grams: 300, unit: "g", calories: 450, protein: 30, carbs: 50, fat: 12 }],
        notes: "Sin sal",
        clientRequestId: "req-1",
      });

      expect(mutation.id).toBe("meal-1");
      expect(mutation.method).toBe("POST");
      expect(mutation.url).toContain("/rest/v1/rpc/save_meal");
      expect(mutation.headers.Authorization).toBe("Bearer test-token-123");
      expect(mutation.headers["Content-Type"]).toBe("application/json");
      expect(mutation.body.p_meal_type).toBe("almuerzo");
      expect(mutation.body.p_items).toHaveLength(1);
      expect(mutation.body.p_notes).toBe("Sin sal");
      expect(mutation.body.p_client_request_id).toBe("req-1");
      expect(mutation.tag).toBe("meal");
    });

    it("builds a self-contained water mutation with water_logs parameters", () => {
      const mutation = buildWaterMutation({
        id: "water-1",
        accessToken: "test-token-456",
        userId: "user-abc",
        amountMl: 500,
      });

      expect(mutation.id).toBe("water-1");
      expect(mutation.method).toBe("POST");
      expect(mutation.url).toContain("/rest/v1/water_logs");
      expect(mutation.headers.Authorization).toBe("Bearer test-token-456");
      expect(mutation.body.amount_ml).toBe(500);
      expect(mutation.body.user_id).toBe("user-abc");
      expect(mutation.tag).toBe("water");
    });
  });

  describe("queue storage operations", () => {
    it("enqueues, retrieves and removes mutations in order", async () => {
      const m1: QueuedMutation = {
        id: "m-1",
        url: "https://example.com/api/1",
        method: "POST",
        headers: { Authorization: "Bearer tok1" },
        body: { foo: "bar" },
        createdAt: 1000,
        attempts: 0,
      };
      const m2: QueuedMutation = {
        id: "m-2",
        url: "https://example.com/api/2",
        method: "POST",
        headers: { Authorization: "Bearer tok1" },
        body: { baz: "qux" },
        createdAt: 2000,
        attempts: 0,
      };

      await enqueueMutation(m2);
      await enqueueMutation(m1);

      const items = await getQueuedMutations();
      expect(items).toHaveLength(2);
      // Sorted by createdAt
      expect(items[0].id).toBe("m-1");
      expect(items[1].id).toBe("m-2");

      await removeQueuedMutation("m-1");
      const remaining = await getQueuedMutations();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe("m-2");
    });

    it("updates an existing mutation", async () => {
      const m: QueuedMutation = {
        id: "m-update",
        url: "https://example.com/api",
        method: "POST",
        headers: {},
        body: {},
        createdAt: Date.now(),
        attempts: 0,
      };
      await enqueueMutation(m);

      m.attempts = 3;
      m.error = "Temporary network error";
      await updateQueuedMutation(m);

      const items = await getQueuedMutations();
      expect(items[0].attempts).toBe(3);
      expect(items[0].error).toBe("Temporary network error");
    });

    it("updates access tokens across all queued items", async () => {
      const m: QueuedMutation = {
        id: "m-token",
        url: "https://example.com/api",
        method: "POST",
        headers: { Authorization: "Bearer old-token" },
        body: {},
        createdAt: Date.now(),
        attempts: 1,
      };
      await enqueueMutation(m);

      await updateAccessTokens("new-fresh-token");

      const items = await getQueuedMutations();
      expect(items[0].headers.Authorization).toBe("Bearer new-fresh-token");
    });
  });

  describe("background sync trigger", () => {
    it("handles missing Background Sync API gracefully without throwing", async () => {
      const supported = await requestBackgroundSync();
      expect(typeof supported).toBe("boolean");
    });
  });

  describe("syncOfflineQueueNow replay", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("replays successful mutations and clears them from queue", async () => {
      const m: QueuedMutation = {
        id: "m-sync-ok",
        url: "https://example.com/api",
        method: "POST",
        headers: {},
        body: { test: true },
        createdAt: Date.now(),
        attempts: 0,
      };
      await enqueueMutation(m);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const res = await syncOfflineQueueNow();
      expect(res.success).toBe(true);
      expect(res.syncedCount).toBe(1);

      const remaining = await getQueuedMutations();
      expect(remaining).toHaveLength(0);
    });

    it("retains mutations when server returns 401 and increments attempts", async () => {
      const m: QueuedMutation = {
        id: "m-sync-401",
        url: "https://example.com/api",
        method: "POST",
        headers: {},
        body: { test: true },
        createdAt: Date.now(),
        attempts: 0,
      };
      await enqueueMutation(m);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      const res = await syncOfflineQueueNow();
      expect(res.syncedCount).toBe(0);

      const remaining = await getQueuedMutations();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].attempts).toBe(1);
    });
  });
});
