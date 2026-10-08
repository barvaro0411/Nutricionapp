jest.mock("react", () => ({ useState: (value: unknown) => [value, jest.fn()] }));
jest.mock("@/stores/useAuthStore", () => ({ useAuthStore: (selector: (state: unknown) => unknown) => selector({ user: { id: "owner" } }) }));
jest.mock("@/stores/useMealReviewStore", () => ({ useMealReviewStore: () => ({ initializeReview: mockInitialize }) }));
jest.mock("@/utils/imageCompressor", () => ({ compressMealImage: async () => ({ uri: "memory://photo" }) }));
jest.mock("@/services/storageService", () => ({ uploadMealPhoto: async () => ({ path: "owner/photo.jpg" }), removeMealPhoto: (...args: unknown[]) => mockRemove(...args) }));
jest.mock("@/services/supabase", () => ({ supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } } }));
const mockInitialize = jest.fn();
const mockRemove = jest.fn().mockResolvedValue(undefined);
const mockInvoke = jest.fn();
import { useMealAnalysis } from "../useMealAnalysis";

beforeEach(() => {
  jest.clearAllMocks();
  mockInvoke.mockResolvedValue({ data: { success: true, data: { items: [{ food: "Red Bull", grams: 250, unit: "ml", calories: 110, protein: 0, carbs: 27.5, fat: 0 }], meal_type_guess: "snack" } }, error: null });
});
test("product and label analysis leave the draft intact and discard their temporary photo", async () => {
  const result = await useMealAnalysis().analyzeProductPhoto("memory://label", true);
  expect(result.success).toBe(true);
  expect(mockInitialize).not.toHaveBeenCalled();
  expect(mockInvoke).toHaveBeenCalledWith("analyze-meal", expect.objectContaining({ body: expect.objectContaining({ mode: "nutrition_label" }) }));
  expect(mockRemove).toHaveBeenCalledWith("owner/photo.jpg");
});
test("meal analysis initializes the review once and retains its photo", async () => {
  await useMealAnalysis().analyzePhoto("memory://meal", "almuerzo");
  expect(mockInitialize).toHaveBeenCalledTimes(1);
  expect(mockInitialize).toHaveBeenCalledWith(expect.objectContaining({ imagePath: "owner/photo.jpg", mealType: "almuerzo" }));
  expect(mockRemove).not.toHaveBeenCalled();
});
test("a failed provider does not leave an unreferenced uploaded photo", async () => {
  mockInvoke.mockResolvedValue({ data: { success: false, error: { message: "No se detectó comida" } }, error: null });
  const warning = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect((await useMealAnalysis().analyzePhoto("memory://meal")).success).toBe(false);
    expect(mockInitialize).not.toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith("owner/photo.jpg");
  } finally { warning.mockRestore(); }
});
