import { supabase } from "@/services/supabase";
import { CHILEAN_FOOD_FAMILIES } from "@/constants/chileanPresets";
import { FoodUnit } from "@/types/meal";
import { isLiquidFood, parseProductQuantity } from "@/utils/liquidUnits";

export interface BarcodeProduct {
  barcode: string;
  productName: string;
  brand?: string;
  servingSizeG: number;
  unit?: FoodUnit;
  containerSize?: number;
  quantityText?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  source: "local" | "openfoodfacts" | "custom";
}

/**
 * Consulta un código de barras (priorizando productos chilenos EAN 780)
 * 1. Busca en la tabla 'barcode_products' de Supabase (caché / base local)
 * 2. Si no existe, consulta la API mundial de Open Food Facts
 * 3. Si lo encuentra en Open Food Facts, lo guarda en Supabase para futuras consultas rápidas
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeProduct | null> {
  const cleanBarcode = barcode.trim();
  if (!/^[0-9]{8,14}$/.test(cleanBarcode)) throw new Error("Ingresa un código de barras de 8 a 14 dígitos.");

  // 1. Consultar base propia en Supabase
  try {
    const { data, error } = await supabase
      .from("barcode_products")
      .select("*")
      .eq("barcode", cleanBarcode)
      .maybeSingle();

    if (!error && data) {
      const isLiquid = isLiquidFood(data.product_name);
      return {
        barcode: data.barcode,
        productName: data.product_name,
        brand: data.brand || undefined,
        servingSizeG: Number(data.serving_size_g) || (isLiquid ? 250 : 100),
        unit: data.unit || (isLiquid ? "ml" : "g"),
        containerSize: data.container_size ? Number(data.container_size) : undefined,
        quantityText: data.quantity_text || undefined,
        caloriesPer100g: Number(data.calories_per_100g),
        proteinPer100g: Number(data.protein_per_100g),
        carbsPer100g: Number(data.carbs_per_100g),
        fatPer100g: Number(data.fat_per_100g),
        source: data.created_by ? "custom" : "local",
      };
    }
  } catch (dbErr) {
    console.warn("Error consultando tabla barcode_products:", dbErr);
  }

  // 2. Fallback a Open Food Facts
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const nutriments = p.nutriments || {};

        const productName =
          p.product_name_es || p.product_name || `Producto (${cleanBarcode})`;
        const brand = p.brands || undefined;
        const cals = Number(nutriments["energy-kcal_100g"]);
        const prot = Number(nutriments.proteins_100g);
        const carbs = Number(nutriments.carbohydrates_100g);
        const fat = Number(nutriments.fat_100g);

        if (![cals, prot, carbs, fat].every(v => Number.isFinite(v) && v >= 0) || cals > 1000 || [prot, carbs, fat].some(v => v > 100)) return null;

        const quantityRaw = String(p.quantity || p.serving_size || "");
        const parsedQty = parseProductQuantity(quantityRaw);
        const isLiquid =
          isLiquidFood(productName) ||
          parsedQty?.unit === "ml" ||
          /(beverage|drink|bebida|boisson)/i.test(String(p.categories || ""));
        const unit: FoodUnit = parsedQty?.unit || (isLiquid ? "ml" : "g");
        const containerSize = parsedQty?.value;
        const servingSize = containerSize || (isLiquid ? 250 : 100);

        const productResult: BarcodeProduct = {
          barcode: cleanBarcode,
          productName,
          brand,
          servingSizeG: servingSize,
          unit,
          containerSize,
          quantityText: quantityRaw.slice(0, 300) || undefined,
          caloriesPer100g: Math.round(cals * 10) / 10,
          proteinPer100g: Math.round(prot * 10) / 10,
          carbsPer100g: Math.round(carbs * 10) / 10,
          fatPer100g: Math.round(fat * 10) / 10,
          source: "openfoodfacts",
        };

        // 3. Auto-cache en Supabase para acelerar futuras búsquedas chilenas
        try {
          const { error: cacheError } = await supabase.from("barcode_products").insert({
            barcode: cleanBarcode,
            product_name: productName,
            brand: brand || null,
            serving_size_g: productResult.servingSizeG,
            unit: productResult.unit,
            container_size: productResult.containerSize || null,
            quantity_text: productResult.quantityText || null,
            calories_per_100g: productResult.caloriesPer100g,
            protein_per_100g: productResult.proteinPer100g,
            carbs_per_100g: productResult.carbsPer100g,
            fat_per_100g: productResult.fatPer100g,
            country: null,
          });
          if (cacheError && cacheError.code !== "23505") console.warn("No se pudo guardar el producto en la caché.");
        } catch (cacheErr) {
          console.warn("No se pudo cachear en barcode_products:", cacheErr);
        }

        return productResult;
      }
    }
  } catch (offErr) {
    console.warn("Error consultando Open Food Facts:", offErr);
  }

  return null;
}

/**
 * Guarda un producto chileno no encontrado para enriquecer la base de datos
 */
export async function saveCustomBarcodeProduct(
  userId: string,
  product: {
    barcode: string;
    productName: string;
    brand?: string;
    servingSizeG?: number;
    unit?: FoodUnit;
    containerSize?: number;
    quantityText?: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
  }
) {
  if (!/^[0-9]{8,14}$/.test(product.barcode) || !product.productName.trim()) throw new Error("Producto inválido.");
  if (product.servingSizeG !== undefined && (!Number.isFinite(product.servingSizeG) || product.servingSizeG <= 0 || product.servingSizeG > 20000)) throw new Error("Porción inválida.");
  if (product.containerSize !== undefined && (!Number.isFinite(product.containerSize) || product.containerSize <= 0 || product.containerSize > 20000)) throw new Error("Tamaño de envase inválido.");
  if (![product.caloriesPer100g, product.proteinPer100g, product.carbsPer100g, product.fatPer100g].every(v => Number.isFinite(v) && v >= 0) || product.caloriesPer100g > 1000 || [product.proteinPer100g, product.carbsPer100g, product.fatPer100g].some(v => v > 100)) throw new Error("Revisa la información nutricional por 100 g.");
  const { data, error } = await supabase
    .from("barcode_products")
    .upsert(
      {
        barcode: product.barcode,
        product_name: product.productName,
        brand: product.brand || null,
        serving_size_g: product.servingSizeG || 100,
        unit: product.unit || (isLiquidFood(product.productName) ? "ml" : "g"),
        container_size: product.containerSize || null,
        quantity_text: product.quantityText?.slice(0, 300) || null,
        calories_per_100g: product.caloriesPer100g,
        protein_per_100g: product.proteinPer100g,
        carbs_per_100g: product.carbsPer100g,
        fat_per_100g: product.fatPer100g,
        created_by: userId,
        country: "CL",
        verified: false,
      },
      { onConflict: "barcode" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Busca productos por nombre en `barcode_products` y en el catálogo chileno INTA/MINSAL
 * para comparar alimentos o elegir sin tener que digitar un código EAN.
 */
export async function searchProductsByName(rawQuery: string, limit = 10): Promise<BarcodeProduct[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const results: BarcodeProduct[] = [];
  const seen = new Set<string>();

  try {
    const { data, error } = await supabase
      .from("barcode_products")
      .select("*")
      .or(`product_name.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(limit);

    if (!error && data) {
      for (const row of data) {
        const isLiquid = isLiquidFood(row.product_name);
        const item: BarcodeProduct = {
          barcode: row.barcode,
          productName: row.product_name,
          brand: row.brand || undefined,
          servingSizeG: Number(row.serving_size_g) || (isLiquid ? 250 : 100),
          unit: row.unit || (isLiquid ? "ml" : "g"),
          containerSize: row.container_size ? Number(row.container_size) : undefined,
          quantityText: row.quantity_text || undefined,
          caloriesPer100g: Number(row.calories_per_100g),
          proteinPer100g: Number(row.protein_per_100g),
          carbsPer100g: Number(row.carbs_per_100g),
          fatPer100g: Number(row.fat_per_100g),
          source: row.created_by ? "custom" : "local",
        };
        const key = `${item.productName.toLowerCase()}|${(item.brand || "").toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(item);
        }
      }
    }
  } catch (err) {
    console.warn("Error buscando productos por nombre:", err);
  }

  const normalizedQuery = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  let presetIndex = 0;
  for (const family of Object.values(CHILEAN_FOOD_FAMILIES)) {
    for (const variant of family.variants) {
      presetIndex++;
      if (results.length >= limit) break;
      const normalizedFood = variant.food
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (!normalizedFood.includes(normalizedQuery)) continue;

      const key = `${variant.food.toLowerCase()}|`;
      if (seen.has(key)) continue;
      seen.add(key);

      const isLiquid =
        variant.portions?.[0]?.unit === "ml" || isLiquidFood(variant.food);
      const defaultPortion = variant.portions?.[0]?.grams || (isLiquid ? 200 : 100);
      results.push({
        barcode: `CL-INTA-${presetIndex}`,
        productName: variant.food,
        brand: family.category,
        servingSizeG: defaultPortion,
        unit: isLiquid ? "ml" : "g",
        caloriesPer100g: variant.caloriesPer100g,
        proteinPer100g: variant.proteinPer100g,
        carbsPer100g: variant.carbsPer100g,
        fatPer100g: variant.fatPer100g,
        source: "local",
      });
    }
    if (results.length >= limit) break;
  }

  return results;
}
