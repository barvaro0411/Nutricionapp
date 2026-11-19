import type { ServerClient } from "./http.ts";

export const DIETARY_RESTRICTION_SET = new Set([
  "lactose_intolerance",
  "celiac_gluten",
  "vegan",
  "vegetarian",
  "low_sodium",
  "low_sugar",
  "nut_allergy",
  "seafood_allergy",
]);

const DIETARY_RESTRICTION_SHORT_LABELS: Record<string, string> = {
  lactose_intolerance: "Sin lactosa",
  celiac_gluten: "Sin gluten / celíaco",
  vegan: "Vegano",
  vegetarian: "Vegetariano",
  low_sodium: "Bajo en sodio",
  low_sugar: "Bajo en azúcar",
  nut_allergy: "Alergia a frutos secos",
  seafood_allergy: "Alergia a mariscos",
};

export interface UserDietaryPreferences {
  restrictions: string[];
  customAllergies: string[];
}

/**
 * Extracts and normalizes dietary restrictions and custom allergies from a profile row.
 */
export function extractDietaryPreferences(profileRow: unknown): UserDietaryPreferences | null {
  if (!profileRow || typeof profileRow !== "object") return null;
  const row = profileRow as { dietary_restrictions?: unknown; custom_allergies?: unknown };
  const rawRestrictions = Array.isArray(row.dietary_restrictions) ? row.dietary_restrictions : [];
  const rawAllergies = Array.isArray(row.custom_allergies) ? row.custom_allergies : [];

  const restrictions: string[] = [];
  for (const item of rawRestrictions) {
    if (typeof item === "string" && DIETARY_RESTRICTION_SET.has(item) && !restrictions.includes(item)) {
      restrictions.push(item);
    }
  }

  const customAllergies: string[] = [];
  const seenKeys = new Set<string>();
  for (const item of rawAllergies) {
    if (typeof item !== "string") continue;
    const cleaned = item.trim().replace(/\s+/g, " ");
    if (!cleaned || cleaned.length > 60) continue;
    const key = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      customAllergies.push(cleaned);
      if (customAllergies.length >= 15) break;
    }
  }

  if (restrictions.length === 0 && customAllergies.length === 0) return null;
  return { restrictions, customAllergies };
}

/**
 * Formats a bounded summary (<= 220 chars) suitable for token-constrained prompts.
 */
export function formatCompactDietaryNote(prefs: UserDietaryPreferences | null | undefined): string | undefined {
  if (!prefs) return undefined;
  const parts: string[] = [];
  if (prefs.restrictions.length > 0) {
    parts.push("Restricciones: " + prefs.restrictions.map((r) => DIETARY_RESTRICTION_SHORT_LABELS[r] || r).join(", "));
  }
  if (prefs.customAllergies.length > 0) {
    parts.push("Alergias/evitar: " + prefs.customAllergies.join(", "));
  }
  if (parts.length === 0) return undefined;
  const note = parts.join(". ");
  return note.length > 220 ? note.slice(0, 217) + "..." : note;
}

/**
 * Best-effort profile lookup for dietary preferences without extra RPC quota calls.
 */
export async function loadUserDietaryPreferencesBestEffort(
  client: ServerClient,
  userId: string
): Promise<UserDietaryPreferences | null> {
  if (typeof client?.from !== "function") return null;
  try {
    const { data, error } = await client
      .from("profiles")
      .select("dietary_restrictions,custom_allergies")
      .eq("id", userId)
      .maybeSingle();
    if (error) return null;
    return extractDietaryPreferences(data);
  } catch {
    return null;
  }
}
