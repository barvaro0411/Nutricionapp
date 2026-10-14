jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("react", () => ({ useState: (value: unknown) => [value, jest.fn()] }));
jest.mock("@/stores/useMealReviewStore", () => ({ useMealReviewStore: () => ({ initializeReview: mockInitialize }) }));
jest.mock("@/stores/useToastStore", () => ({
  useToastStore: {
    getState: () => ({ showToast: mockShowToast, hideToast: jest.fn() }),
  },
}));
jest.mock("@/services/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

const mockPush = jest.fn();
const mockInitialize = jest.fn();
const mockShowToast = jest.fn();
const mockInvoke = jest.fn();

import { useTextAudioMeal } from "../useTextAudioMeal";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useTextAudioMeal", () => {
  test("transcribeAudioMeal successfully transcribes audio and alerts user", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        success: true,
        data: { transcript: "2 marraquetas con palta y un café con leche" },
      },
      error: null,
    });

    const { transcribeAudioMeal } = useTextAudioMeal();
    const res = await transcribeAudioMeal("UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=", "audio/webm");

    expect(res.success).toBe(true);
    expect(res.transcript).toBe("2 marraquetas con palta y un café con leche");
    expect(mockInvoke).toHaveBeenCalledWith(
      "parse-meal-text",
      expect.objectContaining({
        body: expect.objectContaining({
          transcribe_only: true,
          audio_mime_type: "audio/webm",
        }),
      })
    );
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "info",
        title: "Audio transcrito",
      })
    );
  });

  test("transcribeAudioMeal handles backend transcription errors gracefully", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: {
          json: async () => ({ error: { message: "No se detectó voz en el audio." } }),
        },
      },
    });

    const { transcribeAudioMeal } = useTextAudioMeal();
    const res = await transcribeAudioMeal("UklGRiQAAAA=", "audio/mp4");

    expect(res.success).toBe(false);
    expect(res.error).toBe("No se detectó voz en el audio.");
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        title: "Error al transcribir",
        message: "No se detectó voz en el audio.",
      })
    );
  });

  test("parseTextMeal rejects empty descriptions with a friendly warning toast", async () => {
    const { parseTextMeal } = useTextAudioMeal();
    const res = await parseTextMeal("   ");

    expect(res.success).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "warning",
        title: "Descripción vacía",
      })
    );
  });

  test("parseTextMeal processes confirmed text and initializes review screen", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          meal_type_guess: "desayuno",
          items: [{ food: "Marraqueta con palta", grams: 120, calories: 250, protein: 4, carbs: 35, fat: 10 }],
        },
      },
      error: null,
    });

    const { parseTextMeal } = useTextAudioMeal();
    const res = await parseTextMeal("1 marraqueta con palta", "desayuno");

    expect(res.success).toBe(true);
    expect(mockInitialize).toHaveBeenCalledWith(
      expect.objectContaining({
        mealType: "desayuno",
        items: expect.arrayContaining([
          expect.objectContaining({ food: "Marraqueta con palta" }),
        ]),
      })
    );
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "success",
        title: "¡Comida interpretada!",
      })
    );
    expect(mockPush).toHaveBeenCalledWith("/meal/review");
  });
});
