import {
  getDietaryPreferences,
  getDietaryPreferencesSnapshot,
  saveDietaryPreferences,
  saveDietaryPreferencesSnapshot,
} from "../dietaryPreferencesService";

const mockMaybeSingle = jest.fn();
const mockUpdateSingle = jest.fn();
const mockSetProfile = jest.fn();
let mockCurrentProfile: Record<string, unknown> | null = null;
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

jest.mock("@/stores/useAuthStore", () => ({
  useAuthStore: {
    getState: () => ({
      user: { id: "user-1" },
      profile: mockCurrentProfile,
      setProfile: (...args: unknown[]) => mockSetProfile(...args),
    }),
  },
}));

jest.mock("@/services/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: mockUpdateSingle,
          })),
        })),
      })),
    })),
  },
}));

describe("dietaryPreferencesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageMap.clear();
    mockCurrentProfile = {
      id: "user-1",
      dietary_restrictions: [],
      custom_allergies: [],
    };
  });

  it("carga preferencias desde profiles en Supabase y actualiza caché local", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        dietary_restrictions: ["vegan", "celiac_gluten"],
        custom_allergies: ["Huevo", "Soya"],
      },
      error: null,
    });

    const prefs = await getDietaryPreferencesSnapshot("user-1");

    expect(prefs).toEqual({
      restrictions: ["vegan", "celiac_gluten"],
      customAllergies: ["Huevo", "Soya"],
    });
    expect(mockStorageMap.get("dietary_prefs_v2_user-1")).toBe(
      JSON.stringify({
        restrictions: ["vegan", "celiac_gluten"],
        customAllergies: ["Huevo", "Soya"],
      })
    );
  });

  it("migra una única vez preferencias locales legadas cuando la nube está vacía", async () => {
    mockStorageMap.set("dietary_prefs_user-1", JSON.stringify(["lactose_intolerance"]));
    mockMaybeSingle.mockResolvedValue({
      data: { dietary_restrictions: [], custom_allergies: [] },
      error: null,
    });
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: "user-1",
        dietary_restrictions: ["lactose_intolerance"],
        custom_allergies: [],
      },
      error: null,
    });

    const prefs = await getDietaryPreferencesSnapshot("user-1");

    expect(prefs.restrictions).toEqual(["lactose_intolerance"]);
    expect(mockUpdateSingle).toHaveBeenCalledTimes(1);
    expect(mockStorageMap.get("dietary_prefs_migrated_user-1")).toBe("1");
  });

  it("no re-sube preferencias locales si la migración ya ocurrió y la nube fue limpiada", async () => {
    mockStorageMap.set("dietary_prefs_migrated_user-1", "1");
    mockStorageMap.set(
      "dietary_prefs_v2_user-1",
      JSON.stringify({ restrictions: ["vegan"], customAllergies: ["Maní"] })
    );
    mockMaybeSingle.mockResolvedValue({
      data: { dietary_restrictions: [], custom_allergies: [] },
      error: null,
    });

    const prefs = await getDietaryPreferencesSnapshot("user-1");

    expect(prefs).toEqual({ restrictions: [], customAllergies: [] });
    expect(mockUpdateSingle).not.toHaveBeenCalled();
  });

  it("resuelve desde caché local si falla la conexión con Supabase", async () => {
    mockStorageMap.set(
      "dietary_prefs_v2_user-1",
      JSON.stringify({ restrictions: ["low_sodium"], customAllergies: ["Apio"] })
    );
    mockMaybeSingle.mockRejectedValue(new Error("Network error"));

    const prefs = await getDietaryPreferencesSnapshot("user-1");

    expect(prefs).toEqual({
      restrictions: ["low_sodium"],
      customAllergies: ["Apio"],
    });
  });

  it("guarda restricciones y alergias normalizadas en Supabase y caché local", async () => {
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: "user-1",
        dietary_restrictions: ["vegetarian"],
        custom_allergies: ["Champiñón"],
      },
      error: null,
    });

    const saved = await saveDietaryPreferencesSnapshot(
      {
        restrictions: ["vegetarian", "vegetarian"],
        customAllergies: ["  Champiñón ", "champiñon"],
      },
      "user-1"
    );

    expect(saved).toEqual({
      restrictions: ["vegetarian"],
      customAllergies: ["Champiñón"],
    });
    expect(mockUpdateSingle).toHaveBeenCalledTimes(1);
    expect(mockSetProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        dietary_restrictions: ["vegetarian"],
        custom_allergies: ["Champiñón"],
      })
    );
  });

  it("mantiene compatibilidad con getDietaryPreferences y saveDietaryPreferences", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { dietary_restrictions: ["low_sugar"], custom_allergies: ["Soya"] },
      error: null,
    });
    mockUpdateSingle.mockResolvedValue({
      data: { id: "user-1", dietary_restrictions: ["vegan"], custom_allergies: ["Soya"] },
      error: null,
    });

    const loaded = await getDietaryPreferences("user-1");
    expect(loaded).toEqual(["low_sugar"]);

    const saved = await saveDietaryPreferences(["vegan"], "user-1");
    expect(saved).toEqual(["vegan"]);
  });
});
