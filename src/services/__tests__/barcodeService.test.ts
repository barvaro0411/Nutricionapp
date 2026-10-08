jest.mock("@/services/supabase", () => ({ supabase: { from: jest.fn() } }));
import { supabase } from "@/services/supabase";
import { lookupBarcode } from "../barcodeService";

test("cached products retain the volume and unit even when their name is not recognized as a liquid", async () => {
  let cached: Record<string, unknown> | null = null;
  (supabase.from as jest.Mock).mockImplementation(() => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: cached, error: null }) }) }),
    insert: async (data: Record<string, unknown>) => { cached = { ...data, created_by: "owner" }; return { error: null }; },
  }));
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 1, product: {
    product_name: "Aquarius", quantity: "1 L",
    nutriments: { "energy-kcal_100g": 24, proteins_100g: 0, carbohydrates_100g: 6, fat_100g: 0 },
  } }) });
  try {
    const first = await lookupBarcode("7800000000001");
    const second = await lookupBarcode("7800000000001");
    const portion = (product: typeof first) => ({ amount: product?.servingSizeG, unit: product?.unit, container: product?.containerSize, quantity: product?.quantityText });
    expect(portion(first)).toEqual({ amount: 1000, unit: "ml", container: 1000, quantity: "1 L" });
    expect(portion(second)).toEqual(portion(first));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  } finally { global.fetch = originalFetch; }
});
