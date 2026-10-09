import type { loadCoachContext } from "./coachContext.ts";

export type CoachFact = "remainingCalories" | "consumedCalories" | "remainingProtein";
export function coachFactQuestion(message: string): CoachFact | undefined {
  const normalized = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[¿?¡!.,;:]/g, " ").replace(/\s+/g, " ").trim()
    .replace(/^hola\s+/, "")
    .replace(/\s+responde (?:con el numero y el dia actual|solo con el numero|breve)$/, "");
  // Exact, self-contained questions only. Advice, conditionals and follow-ups use AI.
  const goal = "(?: para (?:mi|la) meta)?(?: de hoy| hoy)?";
  if (new RegExp("^cuantas calorias me (?:quedan|faltan)" + goal + "$", "u").test(normalized)) return "remainingCalories";
  if (/^cuantas calorias (?:he consumido|he registrado|llevo registradas)(?: hoy| de hoy)?$/u.test(normalized)) return "consumedCalories";
  if (new RegExp("^(?:cuanta proteina|cuantos gramos de proteina) me (?:queda|quedan|falta|faltan)" + goal + "$", "u").test(normalized)) return "remainingProtein";
  return undefined;
}

export function coachFactReply(fact: CoachFact, loaded: Awaited<ReturnType<typeof loadCoachContext>>) {
  const format = (value: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(value);
  const today = `Hoy ${loaded.context.weekday}`;
  if (fact === "consumedCalories") return `${today} llevas **${format(loaded.consumed.calories)} calorías registradas**. Tu meta del día es de ${format(loaded.context.target.calories)} calorías.`;
  const remaining = fact === "remainingCalories" ? loaded.remaining.calories : loaded.remaining.protein;
  const unit = fact === "remainingCalories" ? "calorías" : "g de proteína";
  const balance = remaining > 0 ? `te faltan **${format(remaining)} ${unit}** para alcanzar tu meta`
    : remaining < 0 ? `superaste tu meta en **${format(-remaining)} ${unit}**`
      : "alcanzaste tu meta";
  const consumed = fact === "remainingCalories" ? loaded.consumed.calories : loaded.consumed.protein;
  const activity = fact === "remainingCalories" && Number(loaded.context.activity?.active_calories_burned) > 0
    ? " El saldo incluye las calorías de actividad registradas." : "";
  return `${today}, ${balance}. Llevas ${format(consumed)} ${unit} registradas.${activity}`;
}
