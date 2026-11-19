import {
  CUSTOM_ALLERGY_MAX_ITEMS,
  CUSTOM_ALLERGY_MAX_LENGTH,
  normalizeCustomAllergies,
  normalizeDietaryRestrictions,
} from "../profile";

describe("profile dietary normalization", () => {
  test("normalizeDietaryRestrictions filters invalid keys and deduplicates", () => {
    const result = normalizeDietaryRestrictions([
      "vegan",
      "invalid_code",
      "vegan",
      "celiac_gluten",
      123,
      null,
    ]);
    expect(result).toEqual(["vegan", "celiac_gluten"]);
  });

  test("normalizeCustomAllergies trims, collapses spaces, deduplicates accent-insensitively and bounds length/count", () => {
    const tooLong = "a".repeat(CUSTOM_ALLERGY_MAX_LENGTH + 15);
    const result = normalizeCustomAllergies([
      "  Huevo  ",
      "huevo",
      "Maní   tostado",
      "mani tostado",
      "",
      "   ",
      tooLong,
    ]);

    expect(result).toHaveLength(3);
    expect(result[0]).toBe("Huevo");
    expect(result[1]).toBe("Maní tostado");
    expect(result[2]).toHaveLength(CUSTOM_ALLERGY_MAX_LENGTH);
  });

  test("normalizeCustomAllergies caps list at CUSTOM_ALLERGY_MAX_ITEMS", () => {
    const many = Array.from({ length: CUSTOM_ALLERGY_MAX_ITEMS + 5 }, (_, i) => `Alergeno ${i + 1}`);
    const result = normalizeCustomAllergies(many);
    expect(result).toHaveLength(CUSTOM_ALLERGY_MAX_ITEMS);
  });
});
