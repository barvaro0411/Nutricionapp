import {
  getTargetWeight,
  getWeightHistory,
  logWeightEntry,
  saveTargetWeight,
} from "../weightService";

const mockSelectOrderLimit = jest.fn();
const mockUpsert = jest.fn();
const mockProfileUpdateSingle = jest.fn();

const mockStorageMap = new Map<string, string>();

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => mockStorageMap.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStorageMap.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStorageMap.delete(key);
  }),
}));

jest.mock("@/services/supabase", () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === "weight_logs") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: mockSelectOrderLimit,
              })),
            })),
          })),
          upsert: mockUpsert,
        };
      }
      return {
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: mockProfileUpdateSingle,
            })),
          })),
        })),
      };
    }),
  },
}));

describe("weightService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageMap.clear();
  });

  it("combina el historial remoto de weight_logs con el almacenamiento local y sincroniza pendientes", async () => {
    mockStorageMap.set(
      "weight_history_user-1",
      JSON.stringify([
        { date: "2026-10-18", weightKg: 75.4, loggedAt: "2026-10-18T08:00:00.000Z" },
        { date: "2026-10-19", weightKg: 75.0, loggedAt: "2026-10-19T08:00:00.000Z" },
      ])
    );

    mockSelectOrderLimit.mockResolvedValue({
      data: [
        {
          logged_date: "2026-10-18",
          weight_kg: 75.2,
          logged_at: "2026-10-18T12:00:00.000Z",
        },
      ],
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: null });

    const history = await getWeightHistory("user-1", null);

    expect(history).toEqual([
      {
        date: "2026-10-18",
        weightKg: 75.2,
        loggedAt: "2026-10-18T12:00:00.000Z",
      },
      {
        date: "2026-10-19",
        weightKg: 75.0,
        loggedAt: "2026-10-19T08:00:00.000Z",
      },
    ]);
    expect(mockUpsert).toHaveBeenCalledWith(
      [
        {
          user_id: "user-1",
          logged_date: "2026-10-19",
          weight_kg: 75.0,
          logged_at: "2026-10-19T08:00:00.000Z",
        },
      ],
      { onConflict: "user_id,logged_date" }
    );
  });

  it("registra un nuevo peso en local y hace upsert en weight_logs y profiles", async () => {
    mockUpsert.mockResolvedValue({ error: null });
    mockProfileUpdateSingle.mockResolvedValue({ data: null, error: null });

    const updated = await logWeightEntry({ userId: "user-1", weightKg: 74.6 });

    expect(updated).toHaveLength(1);
    expect(updated[0].weightKg).toBe(74.6);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockProfileUpdateSingle).toHaveBeenCalledTimes(1);
  });

  it("lee y guarda el peso objetivo sincronizando con profiles.target_weight_kg", async () => {
    mockProfileUpdateSingle.mockResolvedValue({ data: null, error: null });

    const saved = await saveTargetWeight("user-1", 69.8);
    expect(saved).toBe(69.8);
    expect(mockProfileUpdateSingle).toHaveBeenCalledTimes(1);

    const target = await getTargetWeight("user-1", null);
    expect(target).toBe(69.8);
  });
});
