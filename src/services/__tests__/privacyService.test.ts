import {
  deleteOwnAccount,
  getAiConsentStatus,
  setAiConsentStatus,
} from "../privacyService";

const mockRpc = jest.fn();
const mockSignOut = jest.fn();
const mockUpdateSingle = jest.fn();

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
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      signOut: () => mockSignOut(),
    },
    from: jest.fn(() => ({
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

describe("privacyService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageMap.clear();
  });

  it("sincroniza consentimiento de IA desde profiles y lo guarda en caché local", async () => {
    const state = await getAiConsentStatus("user-1", "2026-10-20T12:00:00.000Z");

    expect(state.granted).toBe(true);
    expect(state.consentedAt).toBe("2026-10-20T12:00:00.000Z");
    expect(mockStorageMap.get("ai_consent_user-1")).toBe("2026-10-20T12:00:00.000Z");
  });

  it("actualiza el consentimiento de IA en servidor y almacenamiento local", async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: null });

    const state = await setAiConsentStatus("user-1", true);

    expect(state.granted).toBe(true);
    expect(state.consentedAt).toBeTruthy();
    expect(mockUpdateSingle).toHaveBeenCalledTimes(1);
  });

  it("ejecuta el RPC delete_own_account y cierra sesión al eliminar la cuenta", async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });
    mockSignOut.mockResolvedValue({ error: null });

    await deleteOwnAccount("user-1");

    expect(mockRpc).toHaveBeenCalledWith("delete_own_account");
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("lanza error si delete_own_account falla en el servidor", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "No se pudo eliminar la cuenta" },
    });

    await expect(deleteOwnAccount("user-1")).rejects.toThrow(
      "No se pudo eliminar la cuenta"
    );
  });
});
