import { create } from "zustand";
import { Platform } from "react-native";
import { Recipe } from "@/services/recipeService";
import {
  PlannedRecipeEntry,
  ShoppingListItem,
  classifyGroceryCategory,
  normalizeIngredientKey,
} from "@/utils/shoppingListUtils";
import { isLiquidFood } from "@/utils/liquidUnits";

const STORAGE_KEY = "nutricion_shopping_list_v1";

interface PersistedState {
  plannedRecipes: PlannedRecipeEntry[];
  checkedMap: Record<string, boolean>;
  customItems: ShoppingListItem[];
}

async function savePersisted(state: PersistedState) {
  try {
    const raw = JSON.stringify(state);
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, raw);
      }
      return;
    }
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(STORAGE_KEY, raw);
  } catch {
    // Ignore storage errors
  }
}

async function loadPersisted(): Promise<PersistedState | null> {
  try {
    let raw: string | null = null;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        raw = window.localStorage.getItem(STORAGE_KEY);
      }
    } else {
      const SecureStore = await import("expo-secure-store");
      raw = await SecureStore.getItemAsync(STORAGE_KEY);
    }
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

interface ShoppingListState {
  plannedRecipes: PlannedRecipeEntry[];
  checkedMap: Record<string, boolean>;
  customItems: ShoppingListItem[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addOrUpdateRecipe: (recipe: Recipe, servings?: number) => void;
  removeRecipe: (recipeId: string) => void;
  toggleRecipeInList: (recipe: Recipe, defaultServings?: number) => boolean;
  isRecipeInList: (recipeId: string) => boolean;
  toggleItemChecked: (itemKey: string) => void;
  addCustomItem: (name: string, grams?: number) => void;
  removeCustomItem: (itemKey: string) => void;
  clearChecked: () => void;
  clearAll: () => void;
}

export const useShoppingListStore = create<ShoppingListState>((set, get) => ({
  plannedRecipes: [],
  checkedMap: {},
  customItems: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const saved = await loadPersisted();
    if (saved) {
      set({
        plannedRecipes: Array.isArray(saved.plannedRecipes) ? saved.plannedRecipes : [],
        checkedMap: saved.checkedMap && typeof saved.checkedMap === "object" ? saved.checkedMap : {},
        customItems: Array.isArray(saved.customItems) ? saved.customItems : [],
        hydrated: true,
      });
    } else {
      set({ hydrated: true });
    }
  },

  addOrUpdateRecipe: (recipe, servings) => {
    const targetServings = servings ?? Math.max(1, recipe.servings || 1);
    set((state) => {
      const exists = state.plannedRecipes.some((r) => r.recipe.id === recipe.id);
      const nextPlanned = exists
        ? state.plannedRecipes.map((r) =>
            r.recipe.id === recipe.id ? { recipe, servings: targetServings } : r
          )
        : [...state.plannedRecipes, { recipe, servings: targetServings }];
      const next = {
        plannedRecipes: nextPlanned,
        checkedMap: state.checkedMap,
        customItems: state.customItems,
      };
      void savePersisted(next);
      return next;
    });
  },

  removeRecipe: (recipeId) => {
    set((state) => {
      const nextPlanned = state.plannedRecipes.filter((r) => r.recipe.id !== recipeId);
      const next = {
        plannedRecipes: nextPlanned,
        checkedMap: state.checkedMap,
        customItems: state.customItems,
      };
      void savePersisted(next);
      return next;
    });
  },

  toggleRecipeInList: (recipe, defaultServings) => {
    const exists = get().plannedRecipes.some((r) => r.recipe.id === recipe.id);
    if (exists) {
      get().removeRecipe(recipe.id);
      return false;
    } else {
      get().addOrUpdateRecipe(recipe, defaultServings ?? Math.max(1, recipe.servings || 1));
      return true;
    }
  },

  isRecipeInList: (recipeId) => {
    return get().plannedRecipes.some((r) => r.recipe.id === recipeId);
  },

  toggleItemChecked: (itemKey) => {
    set((state) => {
      const nextChecked = {
        ...state.checkedMap,
        [itemKey]: !state.checkedMap[itemKey],
      };
      const next = {
        plannedRecipes: state.plannedRecipes,
        checkedMap: nextChecked,
        customItems: state.customItems,
      };
      void savePersisted(next);
      return next;
    });
  },

  addCustomItem: (name, grams = 0) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = `custom_${normalizeIngredientKey(trimmed)}_${Date.now()}`;
    const newItem: ShoppingListItem = {
      id: key,
      key,
      name: trimmed,
      grams: grams > 0 ? Math.round(grams) : 0,
      unit: isLiquidFood(trimmed) ? "ml" : "g",
      category: classifyGroceryCategory(trimmed),
      checked: false,
      fromRecipes: ["Agregado manual"],
      isCustom: true,
    };
    set((state) => {
      const nextCustom = [...state.customItems, newItem];
      const next = {
        plannedRecipes: state.plannedRecipes,
        checkedMap: state.checkedMap,
        customItems: nextCustom,
      };
      void savePersisted(next);
      return next;
    });
  },

  removeCustomItem: (itemKey) => {
    set((state) => {
      const nextCustom = state.customItems.filter((i) => i.key !== itemKey);
      const nextChecked = { ...state.checkedMap };
      delete nextChecked[itemKey];
      const next = {
        plannedRecipes: state.plannedRecipes,
        checkedMap: nextChecked,
        customItems: nextCustom,
      };
      void savePersisted(next);
      return next;
    });
  },

  clearChecked: () => {
    set((state) => {
      const nextCustom = state.customItems.filter((i) => !state.checkedMap[i.key]);
      const next = {
        plannedRecipes: state.plannedRecipes,
        checkedMap: {},
        customItems: nextCustom,
      };
      void savePersisted(next);
      return next;
    });
  },

  clearAll: () => {
    const empty: PersistedState = {
      plannedRecipes: [],
      checkedMap: {},
      customItems: [],
    };
    void savePersisted(empty);
    set(empty);
  },
}));
