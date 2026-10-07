import {
  isLiquidFood,
  parseQuantityInput,
  formatQuantityDisplay,
  getStandardPortions,
  resolveItemUnit,
  parseProductQuantity,
} from "../liquidUnits";
import { getVariant } from "../drinkVariants";

describe("liquidUnits utils", () => {
  describe("isLiquidFood", () => {
    test("detects common liquids as true", () => {
      expect(isLiquidFood("Gatorade")).toBe(true);
      expect(isLiquidFood("Red Bull")).toBe(true);
      expect(isLiquidFood("agua mineral")).toBe(true);
      expect(isLiquidFood("jugo de naranja")).toBe(true);
      expect(isLiquidFood("café con leche")).toBe(true);
      expect(isLiquidFood("té helado")).toBe(true);
      expect(isLiquidFood("Coca-Cola")).toBe(true);
      expect(isLiquidFood("Cerveza rubia")).toBe(true);
      expect(isLiquidFood("Bebida energizante")).toBe(true);
      expect(isLiquidFood("Monster Energy")).toBe(true);
      expect(isLiquidFood("Powerade")).toBe(true);
    });

    test("detects solid foods and false exceptions as false", () => {
      expect(isLiquidFood("pan con palta")).toBe(false);
      expect(isLiquidFood("cazuela")).toBe(false);
      expect(isLiquidFood("leche en polvo")).toBe(false);
      expect(isLiquidFood("café molido")).toBe(false);
      expect(isLiquidFood("té en hojas")).toBe(false);
      expect(isLiquidFood("tetera")).toBe(false);
      expect(isLiquidFood("tertulia")).toBe(false);
      expect(isLiquidFood("arroz blanco")).toBe(false);
      expect(isLiquidFood("galleta de avena")).toBe(false);
      expect(isLiquidFood("barra de cereal")).toBe(false);
    });
  });

  describe("parseQuantityInput", () => {
    test("parses liter inputs with comma and dot as decimal separator", () => {
      expect(parseQuantityInput("1L", "ml")).toEqual({ ok: true, value: 1000, unit: "ml" });
      expect(parseQuantityInput("1.5L", "ml")).toEqual({ ok: true, value: 1500, unit: "ml" });
      expect(parseQuantityInput("1,5 l", "ml")).toEqual({ ok: true, value: 1500, unit: "ml" });
      expect(parseQuantityInput("0.75L", "ml")).toEqual({ ok: true, value: 750, unit: "ml" });
      expect(parseQuantityInput("1 lt", "ml")).toEqual({ ok: true, value: 1000, unit: "ml" });
      expect(parseQuantityInput("1 lts", "ml")).toEqual({ ok: true, value: 1000, unit: "ml" });
      expect(parseQuantityInput("1 litro", "ml")).toEqual({ ok: true, value: 1000, unit: "ml" });
    });

    test("parses volume suffixes ml, cc, cl", () => {
      expect(parseQuantityInput("250ml", "ml")).toEqual({ ok: true, value: 250, unit: "ml" });
      expect(parseQuantityInput("250cc", "ml")).toEqual({ ok: true, value: 250, unit: "ml" });
      expect(parseQuantityInput("33cl", "ml")).toEqual({ ok: true, value: 330, unit: "ml" });
      expect(parseQuantityInput("500 ml", "ml")).toEqual({ ok: true, value: 500, unit: "ml" });
    });

    test("switches unit if volume suffix is used with unit='g' or mass suffix with unit='ml'", () => {
      expect(parseQuantityInput("250ml", "g")).toEqual({ ok: true, value: 250, unit: "ml" });
      expect(parseQuantityInput("1L", "g")).toEqual({ ok: true, value: 1000, unit: "ml" });
      expect(parseQuantityInput("200g", "ml")).toEqual({ ok: true, value: 200, unit: "g" });
      expect(parseQuantityInput("1kg", "ml")).toEqual({ ok: true, value: 1000, unit: "g" });
    });

    test("parses numbers without suffix according to thousands vs decimal rules", () => {
      // Thousands separator: 1.000 -> 1000, 2.500 -> 2500
      expect(parseQuantityInput("1.000", "ml")).toEqual({ ok: true, value: 1000, unit: "ml" });
      expect(parseQuantityInput("2.500", "g")).toEqual({ ok: true, value: 2500, unit: "g" });

      // Decimal without suffix: 1,5 -> 1.5 (for g), 250 -> 250
      expect(parseQuantityInput("250", "ml")).toEqual({ ok: true, value: 250, unit: "ml" });
      expect(parseQuantityInput("1,5", "g")).toEqual({ ok: true, value: 1.5, unit: "g" });
      expect(parseQuantityInput("100", "g")).toEqual({ ok: true, value: 100, unit: "g" });
    });

    test("rejects invalid inputs, negative numbers, 0, or out of range", () => {
      expect(parseQuantityInput("abc", "ml")).toEqual({ ok: false, error: expect.any(String) });
      expect(parseQuantityInput("1,5,2", "ml")).toEqual({ ok: false, error: expect.any(String) });
      expect(parseQuantityInput("", "ml")).toEqual({ ok: false, error: expect.any(String) });
      expect(parseQuantityInput("0", "ml")).toEqual({ ok: false, error: expect.any(String) });
      expect(parseQuantityInput("-5", "ml")).toEqual({ ok: false, error: expect.any(String) });
      expect(parseQuantityInput("5001 ml", "ml")).toEqual({ ok: false, error: "Ingresa entre 1 y 5.000 ml" });
      expect(parseQuantityInput("5001 g", "g")).toEqual({ ok: false, error: "Ingresa entre 1 y 5.000 g" });
      expect(parseQuantityInput("6L", "ml")).toEqual({ ok: false, error: "Ingresa entre 1 y 5.000 ml" });
    });
  });

  describe("formatQuantityDisplay", () => {
    test("formats ml amounts with smart L and Chilean decimal notation", () => {
      expect(formatQuantityDisplay(250, "ml")).toBe("250 ml");
      expect(formatQuantityDisplay(500, "ml")).toBe("500 ml");
      expect(formatQuantityDisplay(1000, "ml")).toBe("1 L");
      expect(formatQuantityDisplay(1500, "ml")).toBe("1,5 L");
      expect(formatQuantityDisplay(2000, "ml")).toBe("2 L");
      expect(formatQuantityDisplay(750, "ml")).toBe("750 ml");
    });

    test("formats g amounts with Chilean separator for thousands", () => {
      expect(formatQuantityDisplay(150, "g")).toBe("150 g");
      expect(formatQuantityDisplay(1000, "g")).toBe("1.000 g");
      expect(formatQuantityDisplay(2500, "g")).toBe("2.500 g");
    });
  });

  describe("getStandardPortions", () => {
    test("returns liquid portions for ml", () => {
      const mlPortions = getStandardPortions("ml");
      expect(mlPortions).toEqual([
        { label: "200 ml (Vaso)", value: 200 },
        { label: "250 ml (Lata chica)", value: 250 },
        { label: "350 ml (Lata)", value: 350 },
        { label: "500 ml (Botella)", value: 500 },
        { label: "1 L (Botella grande)", value: 1000 },
      ]);
    });

    test("returns standard gram portions for g", () => {
      const gPortions = getStandardPortions("g");
      expect(gPortions).toEqual([
        { label: "100 g", value: 100 },
        { label: "150 g", value: 150 },
        { label: "200 g", value: 200 },
        { label: "250 g", value: 250 },
        { label: "300 g", value: 300 },
      ]);
    });
  });

  describe("resolveItemUnit", () => {
    test("returns ml if item.unit is already ml", () => {
      expect(resolveItemUnit({ food: "Cualquier cosa", unit: "ml" })).toBe("ml");
    });

    test("returns ml for historical item with unit='g' if isLiquidFood is true", () => {
      expect(resolveItemUnit({ food: "Red Bull Energy Drink", unit: "g" })).toBe("ml");
      expect(resolveItemUnit({ food: "Gatorade Cool Blue", unit: "g" })).toBe("ml");
      expect(resolveItemUnit({ food_name: "Café con leche", unit: "g" } as any)).toBe("ml");
    });

    test("returns g for solid food with unit='g'", () => {
      expect(resolveItemUnit({ food: "Pechuga de pollo", unit: "g" })).toBe("g");
      expect(resolveItemUnit({ food: "Pan con palta" })).toBe("g");
    });
  });

  describe("parseProductQuantity", () => {
    test("extracts volume and unit from text formats", () => {
      expect(parseProductQuantity("250 ml")).toEqual({ value: 250, unit: "ml" });
      expect(parseProductQuantity("1 L")).toEqual({ value: 1000, unit: "ml" });
      expect(parseProductQuantity("33 cl")).toEqual({ value: 330, unit: "ml" });
      expect(parseProductQuantity("500g")).toEqual({ value: 500, unit: "g" });
      expect(parseProductQuantity("6 x 330 ml")).toEqual({ value: 330, unit: "ml" });
    });

    test("returns null for empty or unparseable text", () => {
      expect(parseProductQuantity("")).toBeNull();
      expect(parseProductQuantity("Pack familiar")).toBeNull();
    });
  });

  describe("getVariant", () => {
    test("finds Zero variant for regular drinks", () => {
      const redBullVariant = getVariant("Red Bull Energy Drink");
      expect(redBullVariant).not.toBeNull();
      expect(redBullVariant?.label).toContain("Zero");
      expect(redBullVariant?.target.food).toContain("Sin Azúcar");

      const gatoradeVariant = getVariant("Gatorade");
      expect(gatoradeVariant).not.toBeNull();
      expect(gatoradeVariant?.target.food).toContain("Zero");
    });

    test("finds Regular variant for Zero drinks", () => {
      const cocaZeroVariant = getVariant("Coca-Cola Zero");
      expect(cocaZeroVariant).not.toBeNull();
      expect(cocaZeroVariant?.label).toContain("Regular");
      expect(cocaZeroVariant?.target.food).toBe("Coca-Cola");
    });

    test("returns null for foods without a known variant", () => {
      expect(getVariant("Manzana")).toBeNull();
      expect(getVariant("Arroz con pollo")).toBeNull();
      expect(getVariant("Jugo de manzana artesanal")).toBeNull();
    });
  });
});
