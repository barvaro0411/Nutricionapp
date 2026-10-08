import { create } from "zustand";
import { randomUUID } from "expo-crypto";
import { DetectedFoodItem, DetectedFoodItemInput, FoodUnit, MealTotals, MealType } from "@/types/meal";
import { resolveItemUnit } from "@/utils/liquidUnits";
import { DrinkVariantData } from "@/utils/drinkVariants";

interface MealReviewState {
  imagePath: string | null;
  localImageUri: string | null;
  mealType: MealType;
  items: DetectedFoodItem[];
  userNotes: string;
  loggedAt: string | null;
  clientRequestId: string;
  setLoggedAt: (date: string | null) => void;

  // Acciones
  initializeReview: (params: {
    imagePath: string;
    localImageUri: string;
    mealType: MealType;
    items: DetectedFoodItemInput[];
  }) => void;
  setMealType: (type: MealType) => void;
  setUserNotes: (notes: string) => void;
  updateItemGrams: (index: number, newGrams: number) => void;
  adjustItemGramsDelta: (index: number, delta: number) => void;
  updateItemUnit: (index: number, newUnit: FoodUnit) => void;
  applyDrinkVariant: (index: number, target: DrinkVariantData) => void;
  updateItemVariant: (
    index: number,
    variant: {
      food: string;
      caloriesPer100g: number;
      proteinPer100g: number;
      carbsPer100g: number;
      fatPer100g: number;
    }
  ) => void;
  removeItem: (index: number) => void;
  addItem: (item: DetectedFoodItemInput) => void;
  replaceItem: (index: number, item: DetectedFoodItemInput) => void;
  getTotals: () => MealTotals;
  reset: () => void;
}

export const useMealReviewStore = create<MealReviewState>((set, get) => ({
  imagePath: null,
  localImageUri: null,
  mealType: "almuerzo",
  items: [],
  userNotes: "",
  loggedAt: null,
  clientRequestId: randomUUID(),
  setLoggedAt: (loggedAt) => set({ loggedAt }),

  initializeReview: ({ imagePath, localImageUri, mealType, items }) => {
    // Calculamos los ratios por gramo para cada ítem detectado
    const enrichedItems: DetectedFoodItem[] = items.map((item, idx) => {
      const g = item.grams > 0 ? item.grams : 100;
      const effectiveUnit: FoodUnit = item.unit || resolveItemUnit(item);
      return {
        ...item,
        unit: effectiveUnit,
        confidence: item.confidence ?? 0.8,
        id: item.id || `item_${idx}_${Date.now()}`,
        ratioCalories: item.calories / g,
        ratioProtein: item.protein / g,
        ratioCarbs: item.carbs / g,
        ratioFat: item.fat / g,
      };
    });

    set({
      imagePath,
      localImageUri,
      mealType,
      items: enrichedItems,
      userNotes: "",
      clientRequestId: randomUUID(),
    });
  },

  setMealType: (mealType) => set({ mealType }),
  setUserNotes: (userNotes) => set({ userNotes }),

  updateItemGrams: (index, newGrams) => {
    if (!Number.isFinite(newGrams) || newGrams < 0 || newGrams > 20000) return;
    const safeGrams = Math.round(newGrams * 10) / 10;
    set((state) => {
      const updated = [...state.items];
      const item = updated[index];
      if (!item) return state;

      const rCals = item.ratioCalories ?? item.calories / (item.grams || 100);
      const rProt = item.ratioProtein ?? item.protein / (item.grams || 100);
      const rCarbs = item.ratioCarbs ?? item.carbs / (item.grams || 100);
      const rFat = item.ratioFat ?? item.fat / (item.grams || 100);

      updated[index] = {
        ...item,
        grams: safeGrams,
        calories: Math.round(safeGrams * rCals * 10) / 10,
        protein: Math.round(safeGrams * rProt * 10) / 10,
        carbs: Math.round(safeGrams * rCarbs * 10) / 10,
        fat: Math.round(safeGrams * rFat * 10) / 10,
      };
      return { items: updated };
    });
  },

  adjustItemGramsDelta: (index, delta) => {
    const item = get().items[index];
    if (!item) return;
    get().updateItemGrams(index, item.grams + delta);
  },

  updateItemUnit: (index, newUnit) => {
    set((state) => {
      if (!state.items[index]) return state;
      const updated = [...state.items];
      const item = updated[index];
      const clamped = Math.min(item.grams, 5000);
      updated[index] = {
        ...item,
        unit: newUnit,
        nutrition_reference: undefined,
        grams: clamped,
      };
      return { items: updated };
    });
  },

  applyDrinkVariant: (index, target) => {
    set((state) => {
      if (!state.items[index]) return state;
      const updated = [...state.items];
      const item = updated[index];
      const rCals = target.caloriesPer100g / 100;
      const rProt = target.proteinPer100g / 100;
      const rCarbs = target.carbsPer100g / 100;
      const rFat = target.fatPer100g / 100;

      updated[index] = {
        ...item,
        food: target.food,
        nutrition_reference: undefined,
        ratioCalories: rCals,
        ratioProtein: rProt,
        ratioCarbs: rCarbs,
        ratioFat: rFat,
        calories: Math.round(item.grams * rCals * 10) / 10,
        protein: Math.round(item.grams * rProt * 10) / 10,
        carbs: Math.round(item.grams * rCarbs * 10) / 10,
        fat: Math.round(item.grams * rFat * 10) / 10,
        confidence: target.confidence,
      };
      return { items: updated };
    });
  },

  updateItemVariant: (index, variant) => {
    set((state) => {
      const updated = [...state.items];
      const item = updated[index];
      if (!item) return state;

      const rCals = variant.caloriesPer100g / 100;
      const rProt = variant.proteinPer100g / 100;
      const rCarbs = variant.carbsPer100g / 100;
      const rFat = variant.fatPer100g / 100;

      updated[index] = {
        ...item,
        food: variant.food,
        nutrition_reference: undefined,
        ratioCalories: rCals,
        ratioProtein: rProt,
        ratioCarbs: rCarbs,
        ratioFat: rFat,
        calories: Math.round(item.grams * rCals * 10) / 10,
        protein: Math.round(item.grams * rProt * 10) / 10,
        carbs: Math.round(item.grams * rCarbs * 10) / 10,
        fat: Math.round(item.grams * rFat * 10) / 10,
      };
      return { items: updated };
    });
  },

  removeItem: (index) => {
    set((state) => ({
      items: state.items.filter((_, i) => i !== index),
    }));
  },

  addItem: (newItem) => {
    const g = newItem.grams > 0 ? newItem.grams : 100;
    const effectiveUnit: FoodUnit = newItem.unit || resolveItemUnit(newItem);
    const enriched: DetectedFoodItem = {
      ...newItem,
      unit: effectiveUnit,
      confidence: newItem.confidence ?? 0.8,
      id: newItem.id || `custom_${Date.now()}`,
      ratioCalories: newItem.calories / g,
      ratioProtein: newItem.protein / g,
      ratioCarbs: newItem.carbs / g,
      ratioFat: newItem.fat / g,
    };
    set((state) => ({ items: [...state.items, enriched] }));
  },

  replaceItem: (index, replacement) => {
    set((state) => {
      const current = state.items[index];
      if (!current) return state;
      const amount = replacement.grams > 0 ? replacement.grams : 100;
      const items = [...state.items];
      items[index] = { ...replacement, id: current.id, unit: replacement.unit || "g", confidence: replacement.confidence ?? 1,
        ratioCalories: replacement.calories / amount, ratioProtein: replacement.protein / amount,
        ratioCarbs: replacement.carbs / amount, ratioFat: replacement.fat / amount };
      return { items };
    });
  },

  getTotals: () => {
    const items = get().items;
    return items.reduce(
      (acc, item) => ({
        calories: Math.round((acc.calories + item.calories) * 10) / 10,
        protein: Math.round((acc.protein + item.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
        fat: Math.round((acc.fat + item.fat) * 10) / 10,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  },

  reset: () =>
    set({
      imagePath: null,
      localImageUri: null,
      mealType: "almuerzo",
      items: [],
      userNotes: "",
      loggedAt: null,
      clientRequestId: randomUUID(),
    }),
}));
