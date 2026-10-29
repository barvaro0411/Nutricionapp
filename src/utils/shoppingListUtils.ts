import { Recipe } from "@/services/recipeService";
import { isLiquidFood, formatQuantityDisplay } from "@/utils/liquidUnits";

export type GroceryCategory = "feria" | "carnes" | "lacteos" | "abarrotes";

export interface GroceryCategoryMeta {
  key: GroceryCategory;
  title: string;
  subtitle: string;
  emoji: string;
  badgeBg: string;
  badgeColor: string;
}

export const GROCERY_CATEGORIES: GroceryCategoryMeta[] = [
  {
    key: "feria",
    title: "Feria Libre (Frutas y Verduras)",
    subtitle: "Productos frescos de estación",
    emoji: "🥬",
    badgeBg: "#ECFDF5",
    badgeColor: "#047857",
  },
  {
    key: "carnes",
    title: "Carnes, Pescados y Huevos",
    subtitle: "Proteínas principales",
    emoji: "🥩",
    badgeBg: "#FEF2F2",
    badgeColor: "#B91C1C",
  },
  {
    key: "lacteos",
    title: "Lácteos y Refrigerados",
    subtitle: "Leches, yogures y quesos",
    emoji: "🥛",
    badgeBg: "#EFF6FF",
    badgeColor: "#1D4ED8",
  },
  {
    key: "abarrotes",
    title: "Abarrotes y Despensa",
    subtitle: "Granos, panes, frutos secos y aliños",
    emoji: "🌾",
    badgeBg: "#FFFBEB",
    badgeColor: "#B45309",
  },
];

export interface ShoppingListItem {
  id: string;
  key: string;
  name: string;
  grams: number;
  unit: "g" | "ml";
  category: GroceryCategory;
  checked: boolean;
  fromRecipes: string[];
  isCustom?: boolean;
}

export interface PlannedRecipeEntry {
  recipe: Recipe;
  servings: number;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clasifica un ingrediente en su pasillo/sección chilena (Feria, Carnes, Lácteos o Abarrotes).
 */
export function classifyGroceryCategory(foodName: string): GroceryCategory {
  const norm = normalizeText(foodName);

  // 1. Lácteos y refrigerados (evaluar antes por ej. "leche de vaca", "queso fresco")
  if (
    /\b(leche|yogur|yogurt|queso|quesillo|chacarero|ricota|ricotta|mantequilla|crema|kefir|tofu|tempeh|margarina)\b/i.test(
      norm
    ) &&
    !/\b(coco|almendra|soya|avena)\b/i.test(norm)
  ) {
    return "lacteos";
  }

  // 2. Carnes, pescados, mariscos y huevos
  if (
    /\b(pollo|pechuga|pavo|carne|vacuno|posta|lomo|asiento|molida|filete|cerdo|cazuela|salmon|reineta|merluza|atun|jurel|tilapia|pescado|camaron|marisco|chorito|huevo|huevos|clara|claras|jamon|vienesa|longaniza)\b/i.test(
      norm
    )
  ) {
    return "carnes";
  }

  // 3. Feria Libre (Frutas, verduras, tubérculos y hierbas frescas)
  if (
    /\b(palta|tomate|lechuga|espinaca|acelga|rucula|repollo|kale|apio|pepino|zanahoria|zapallo|italiano|betarraga|cebolla|cebollin|ajo|pimenton|aji|brocoli|coliflor|esparrago|poroto verde|porotos verdes|choclo|arveja|champinon|seta|papa|papas|camote|cilantro|perejil|albahaca|menta|jengibre|limon|naranja|mandarina|pomelo|manzana|platano|banana|frutilla|arandano|frambuesa|mora|berries|kiwi|pera|durazno|damasco|ciruela|uva|melon|sandia|pina|mango|palmito| cochayuyo)\b/i.test(
      norm
    )
  ) {
    return "feria";
  }

  // 4. Por defecto: Abarrotes, panadería y despensa
  return "abarrotes";
}

/**
 * Limpia el nombre del ingrediente para agrupar equivalentes (ej: "Pechuga de pollo cocida" -> "Pechuga de pollo").
 */
export function normalizeIngredientKey(foodName: string): string {
  return normalizeText(foodName)
    .replace(/\b(cocido|cocida|crudo|cruda|fresco|fresca|picado|picada|en cubos|rallado|rallada|al vapor)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Combina y escala los ingredientes de todas las recetas planificadas junto con ítems manuales.
 */
export function buildShoppingList(
  plannedRecipes: PlannedRecipeEntry[],
  checkedMap: Record<string, boolean> = {},
  customItems: ShoppingListItem[] = []
): ShoppingListItem[] {
  const map = new Map<string, ShoppingListItem>();

  for (const entry of plannedRecipes) {
    const { recipe, servings } = entry;
    const baseServings = Math.max(1, recipe.servings || 1);
    const factor = Math.max(0.5, servings) / baseServings;

    for (const ing of recipe.ingredients || []) {
      const key = normalizeIngredientKey(ing.foodName);
      if (!key) continue;

      const scaledGrams = Math.max(1, Math.round(ing.grams * factor));
      const unit: "g" | "ml" = isLiquidFood(ing.foodName) ? "ml" : "g";
      const existing = map.get(key);

      if (existing) {
        existing.grams += scaledGrams;
        if (!existing.fromRecipes.includes(recipe.title)) {
          existing.fromRecipes.push(recipe.title);
        }
      } else {
        map.set(key, {
          id: `ing_${key}`,
          key,
          name: ing.foodName,
          grams: scaledGrams,
          unit,
          category: classifyGroceryCategory(ing.foodName),
          checked: Boolean(checkedMap[key]),
          fromRecipes: [recipe.title],
          isCustom: false,
        });
      }
    }
  }

  const aggregated = Array.from(map.values());

  // Añadir ítems personalizados
  for (const custom of customItems) {
    aggregated.push({
      ...custom,
      checked: Boolean(checkedMap[custom.key] ?? custom.checked),
    });
  }

  return aggregated;
}

/**
 * Formatea la lista de compras para compartir por WhatsApp o portapapeles.
 */
export function formatShoppingListForShare(
  items: ShoppingListItem[],
  plannedRecipes: PlannedRecipeEntry[]
): string {
  const lines: string[] = [];
  lines.push("🛒 *MI LISTA DE COMPRAS · NUTRICIÓN IA*");

  if (plannedRecipes.length > 0) {
    const recipeSummary = plannedRecipes
      .map((r) => `${r.recipe.title} (${r.servings} porc.)`)
      .join(", ");
    lines.push(`📋 _Recetas: ${recipeSummary}_`);
  }
  lines.push("");

  for (const cat of GROCERY_CATEGORIES) {
    const catItems = items.filter((i) => i.category === cat.key);
    if (catItems.length === 0) continue;

    lines.push(`${cat.emoji} *${cat.title.toUpperCase()}*`);
    for (const item of catItems) {
      const check = item.checked ? "✅" : "⬜";
      const qty =
        item.grams > 0 ? ` — ${formatQuantityDisplay(item.grams, item.unit)}` : "";
      lines.push(`${check} ${item.name}${qty}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
