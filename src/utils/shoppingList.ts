import {
  Recipe,
  SHOPPING_CATEGORY_LABELS,
  SHOPPING_CATEGORY_ORDER,
  ShoppingCategory,
  ShoppingListItem,
  ShoppingUnit,
  UpsertShoppingItemInput,
} from "@/types/recipe";
import { isLiquidFood } from "@/utils/liquidUnits";

const KEEP_SINGULAR_WORDS = new Set(["hummus", "humus", "cuscus", "ananas"]);

function singularizeSpanishToken(token: string): string {
  if (token.length <= 3 || KEEP_SINGULAR_WORDS.has(token)) {
    return token;
  }
  if (token.endsWith("ces") && token.length > 4) {
    return token.slice(0, -3) + "z";
  }
  if (/(?:[aeio]n|[dr])es$/.test(token) && token.length > 4) {
    return token.slice(0, -2);
  }
  if (/[aeio]s$/.test(token)) {
    return token.slice(0, -1);
  }
  return token;
}

/**
 * Normalizes ingredient names for deterministic deduplication in shopping lists.
 */
export function normalizeShoppingIngredientKey(name: string): string {
  const withoutParens = name.replace(/\([^)]*\)/g, " ");
  const ascii = withoutParens
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (!ascii) return "";
  return ascii
    .split(" ")
    .map((token) => singularizeSpanishToken(token))
    .join(" ");
}

const CATEGORY_RULES: Array<{ category: ShoppingCategory; keywords: string[] }> = [
  {
    category: "condimentos_aceites",
    keywords: [
      "aceite",
      "sal",
      "pimienta",
      "oregano",
      "comino",
      "merken",
      "curry",
      "paprika",
      "aji de color",
      "vinagre",
      "mostaza",
      "mayonesa",
      "ketchup",
      "salsa",
      "soya",
      "jengibre",
      "canela",
      "vainilla",
      "polvo de hornear",
      "edulcorante",
      "stevia",
    ],
  },
  {
    category: "verduras_frutas",
    keywords: [
      "poroto verde",
      "porotos verdes",
      "palta",
      "tomate",
      "lechuga",
      "espinaca",
      "acelga",
      "zapallo",
      "zapallito",
      "papa",
      "camote",
      "zanahoria",
      "cebolla",
      "cebollin",
      "ajo",
      "pimenton",
      "brocoli",
      "coliflor",
      "pepino",
      "apio",
      "repollo",
      "betarraga",
      "choclo",
      "champinon",
      "berenjena",
      "esparrago",
      "rucula",
      "cilantro",
      "perejil",
      "albahaca",
      "manzana",
      "platano",
      "banana",
      "naranja",
      "limon",
      "frutilla",
      "arandano",
      "frambuesa",
      "pera",
      "durazno",
      "kiwi",
      "uva",
      "pina",
      "mango",
      "berries",
    ],
  },
  {
    category: "lacteos_huevos",
    keywords: [
      "huevo",
      "clara",
      "yema",
      "leche",
      "yogur",
      "yoghurt",
      "queso",
      "quesillo",
      "ricota",
      "ricotta",
      "crema",
      "mantequilla",
      "kefir",
      "mozzarella",
      "parmesano",
      "cottage",
    ],
  },
  {
    category: "proteinas",
    keywords: [
      "pollo",
      "pechuga",
      "truto",
      "pavo",
      "vacuno",
      "carne",
      "posta",
      "lomo",
      "asiento",
      "cerdo",
      "atun",
      "jurel",
      "salmon",
      "merluza",
      "reineta",
      "camaron",
      "marisco",
      "pescado",
      "jamon",
      "tofu",
      "seitan",
      "tempeh",
      "soya texturizada",
      "whey",
      "proteina",
    ],
  },
  {
    category: "despensa_granos",
    keywords: [
      "arroz",
      "avena",
      "fideo",
      "tallarin",
      "pasta",
      "quinoa",
      "quinua",
      "pan",
      "marraqueta",
      "hallulla",
      "molde",
      "tortilla",
      "harina",
      "lenteja",
      "poroto",
      "garbanzo",
      "arveja",
      "chia",
      "linaza",
      "nuez",
      "nueces",
      "almendra",
      "mani",
      "mantequilla de mani",
      "castana",
      "miel",
      "azucar",
      "cacao",
      "cafe",
      "granola",
      "maicena",
    ],
  },
];

/**
 * Maps an ingredient name to one of the 6 Chilean supermarket categories.
 */
export function categorizeIngredientChile(foodName: string): ShoppingCategory {
  const normalized = foodName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      return rule.category;
    }
  }
  return "otros";
}

/**
 * Infers shopping unit ('g', 'ml', or 'unidad') from an optional hint and food name.
 */
export function inferShoppingUnit(foodName: string, hintUnit?: string): ShoppingUnit {
  if (hintUnit === "unidad") return "unidad";
  if (hintUnit === "ml") return "ml";
  if (hintUnit === "g") return "g";
  return isLiquidFood(foodName) ? "ml" : "g";
}

/**
 * Converts a recipe's ingredients into deduplicated shopping items scaled by target servings.
 */
export function buildShoppingItemsFromRecipe(
  recipe: Recipe,
  targetServings?: number
): UpsertShoppingItemInput[] {
  const baseServings = recipe.servings > 0 ? recipe.servings : 1;
  const desiredServings = targetServings && targetServings > 0 ? targetServings : baseServings;
  const scale = desiredServings / baseServings;

  const grouped = new Map<string, UpsertShoppingItemInput>();

  for (const ing of recipe.ingredients) {
    const unit = inferShoppingUnit(ing.foodName, ing.unit);
    const rawQty =
      unit === "unidad" && typeof ing.quantity === "number" && ing.quantity > 0
        ? ing.quantity
        : ing.grams;
    const scaledQty = Math.round(Math.max(0.1, rawQty * scale) * 100) / 100;
    const key = normalizeShoppingIngredientKey(ing.foodName) || ing.foodName.trim().toLowerCase();
    const mapKey = `${key}::${unit}`;
    const existing = grouped.get(mapKey);

    if (existing) {
      existing.quantity = Math.round((existing.quantity + scaledQty) * 100) / 100;
    } else {
      grouped.set(mapKey, {
        name: ing.foodName.trim(),
        normalizedKey: key,
        quantity: scaledQty,
        unit,
        category: ing.category || categorizeIngredientChile(ing.foodName),
        sourceRecipe: recipe.title,
      });
    }
  }

  return Array.from(grouped.values());
}

/**
 * Client mirror of the SQL upsert_shopping_list_items conflict rule for optimistic previews and testing.
 */
export function mergeShoppingListPreview(
  existing: ShoppingListItem[],
  incoming: UpsertShoppingItemInput[]
): ShoppingListItem[] {
  const map = new Map<string, ShoppingListItem>(
    existing.map((item) => [`${item.normalizedKey}::${item.unit}`, { ...item }])
  );
  const nowIso = new Date().toISOString();

  for (const inc of incoming) {
    const mapKey = `${inc.normalizedKey}::${inc.unit}`;
    const prev = map.get(mapKey);
    if (!prev) {
      map.set(mapKey, {
        id: `temp-${mapKey}`,
        userId: "",
        name: inc.name,
        normalizedKey: inc.normalizedKey,
        quantity: inc.quantity,
        unit: inc.unit,
        category: inc.category,
        checked: false,
        sourceRecipes: inc.sourceRecipe ? [inc.sourceRecipe] : [],
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      continue;
    }

    const nextSources =
      inc.sourceRecipe && !prev.sourceRecipes.includes(inc.sourceRecipe)
        ? [...prev.sourceRecipes, inc.sourceRecipe].slice(0, 10)
        : prev.sourceRecipes;

    map.set(mapKey, {
      ...prev,
      name: inc.name,
      category: prev.category === "otros" ? inc.category : prev.category,
      quantity: prev.checked
        ? inc.quantity
        : Math.min(999999, Math.round((prev.quantity + inc.quantity) * 100) / 100),
      checked: false,
      sourceRecipes: nextSources,
      updatedAt: nowIso,
    });
  }

  return Array.from(map.values());
}

export function formatShoppingQuantity(quantity: number, unit: ShoppingUnit): string {
  const rounded = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1).replace(/\.0$/, "");
  if (unit === "unidad") return `${rounded} unid`;
  return `${rounded} ${unit}`;
}

/**
 * Formats pending shopping list items grouped by supermarket aisle for clipboard/WhatsApp sharing.
 */
export function formatShoppingListForShare(items: ShoppingListItem[]): string {
  const pending = items.filter((item) => !item.checked);
  if (pending.length === 0) return "";

  const lines: string[] = ["Lista de compras - Nutricionapp"];
  for (const cat of SHOPPING_CATEGORY_ORDER) {
    const group = pending.filter((item) => item.category === cat);
    if (group.length === 0) continue;
    const meta = SHOPPING_CATEGORY_LABELS[cat];
    lines.push("", `${meta.icon} ${meta.label}:`);
    for (const item of group) {
      lines.push(`- ${item.name} (${formatShoppingQuantity(item.quantity, item.unit)})`);
    }
  }
  return lines.join("\n").trim();
}
