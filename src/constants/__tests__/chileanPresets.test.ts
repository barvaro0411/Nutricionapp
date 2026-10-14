import {
  findFamilyForFood,
  CHILEAN_FOOD_FAMILIES,
  COMMON_ACCOMPANIMENTS,
} from "../chileanPresets";

describe("chileanPresets", () => {
  describe("findFamilyForFood", () => {
    test("detects chicken and poultry", () => {
      expect(findFamilyForFood("Pechuga de pollo a la plancha")?.id).toBe("pollo");
      expect(findFamilyForFood("Trutro asado")?.id).toBe("pollo");
    });

    test("detects beef and red meats with accents", () => {
      expect(findFamilyForFood("Lomo liso")?.id).toBe("vacuno");
      expect(findFamilyForFood("Carne molida tártaro")?.id).toBe("vacuno");
      expect(findFamilyForFood("Bistec de posta")?.id).toBe("vacuno");
    });

    test("detects pork variants", () => {
      expect(findFamilyForFood("Costillar de cerdo")?.id).toBe("cerdo");
      expect(findFamilyForFood("Chuleta de chancho")?.id).toBe("cerdo");
    });

    test("detects fish and seafood with accents", () => {
      expect(findFamilyForFood("Salmón con ensalada")?.id).toBe("pescados_mariscos");
      expect(findFamilyForFood("Merluza frita")?.id).toBe("pescados_mariscos");
      expect(findFamilyForFood("Reineta")?.id).toBe("pescados_mariscos");
    });

    test("detects eggs and breakfast preparations", () => {
      expect(findFamilyForFood("Huevo frito")?.id).toBe("huevos");
      expect(findFamilyForFood("Omelette de queso")?.id).toBe("huevos");
    });

    test("detects Chilean breads", () => {
      expect(findFamilyForFood("Media marraqueta")?.id).toBe("pan");
      expect(findFamilyForFood("Hallulla con queso")?.id).toBe("pan");
      expect(findFamilyForFood("Pan amasado")?.id).toBe("pan");
    });

    test("detects typical sides with accents", () => {
      expect(findFamilyForFood("Arroz blanco")?.id).toBe("acompanamientos");
      expect(findFamilyForFood("Puré de papas")?.id).toBe("acompanamientos");
      expect(findFamilyForFood("Papas fritas")?.id).toBe("acompanamientos");
    });

    test("detects Chilean traditional prepared dishes", () => {
      expect(findFamilyForFood("Cazuela de vacuno")?.id).toBe("platos_chilenos");
      expect(findFamilyForFood("Pastel de choclo")?.id).toBe("platos_chilenos");
      expect(findFamilyForFood("Charquicán")?.id).toBe("platos_chilenos");
      expect(findFamilyForFood("Empanada de pino")?.id).toBe("platos_chilenos");
      expect(findFamilyForFood("Completo italiano")?.id).toBe("platos_chilenos");
    });

    test("detects hot beverages", () => {
      expect(findFamilyForFood("Café con leche")?.id).toBe("bebidas_calientes");
      expect(findFamilyForFood("Cortado")?.id).toBe("bebidas_calientes");
      expect(findFamilyForFood("Té con leche")?.id).toBe("bebidas_calientes");
    });

    test("returns null for unrecognized foods", () => {
      expect(findFamilyForFood("Manzana roja")).toBeNull();
      expect(findFamilyForFood("")).toBeNull();
    });
  });

  describe("Food Family data integrity", () => {
    test("every food variant has non-negative macro values", () => {
      Object.values(CHILEAN_FOOD_FAMILIES).forEach((family) => {
        expect(family.variants.length).toBeGreaterThan(0);
        family.variants.forEach((variant) => {
          expect(variant.caloriesPer100g).toBeGreaterThanOrEqual(0);
          expect(variant.proteinPer100g).toBeGreaterThanOrEqual(0);
          expect(variant.carbsPer100g).toBeGreaterThanOrEqual(0);
          expect(variant.fatPer100g).toBeGreaterThanOrEqual(0);

          if (variant.portions) {
            variant.portions.forEach((portion) => {
              expect(portion.grams).toBeGreaterThan(0);
              expect(portion.label.length).toBeGreaterThan(0);
            });
          }
        });
      });
    });

    test("common accompaniments are populated", () => {
      expect(COMMON_ACCOMPANIMENTS.length).toBeGreaterThan(0);
      expect(COMMON_ACCOMPANIMENTS.some((v) => v.food.includes("Arroz"))).toBe(true);
    });
  });
});
