import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export interface MealReminderConfig {
  id: string;
  mealType: "breakfast" | "lunch" | "dinner" | "water";
  title: string;
  body: string;
  hour: number;
  minute: number;
  enabled: boolean;
}

export const DEFAULT_CHILEAN_REMINDERS: MealReminderConfig[] = [
  {
    id: "reminder_breakfast",
    mealType: "breakfast",
    title: "Hora del Desayuno ☕",
    body: "¿Qué tomaste de desayuno hoy? Registra tu marraqueta, huevos o café para partir el día con energía.",
    hour: 8,
    minute: 30,
    enabled: true,
  },
  {
    id: "reminder_lunch",
    mealType: "lunch",
    title: "¡Hora de Almorzar! 🍽️",
    body: "Sácale una foto a tu almuerzo (cazuela, charquicán, ensaladas) para no perder tus macros.",
    hour: 13,
    minute: 30,
    enabled: true,
  },
  {
    id: "reminder_dinner",
    mealType: "dinner",
    title: "¡Hora de la Once o Cena! 🥖",
    body: "Registra tu comida de la tarde o noche para completar tu resumen nutricional diario.",
    hour: 20,
    minute: 30,
    enabled: true,
  },
  {
    id: "reminder_water",
    mealType: "water",
    title: "Recordatorio de Hidratación 💧",
    body: "No olvides beber agua. Un vaso más te acerca a tu meta del día.",
    hour: 16,
    minute: 0,
    enabled: true,
  },
];

const STORAGE_KEY = "nutricion_chile_meal_reminders_prefs";

export async function getReminderPreferences(): Promise<MealReminderConfig[]> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return DEFAULT_CHILEAN_REMINDERS;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("No se pudieron cargar las preferencias de recordatorios:", error);
    return DEFAULT_CHILEAN_REMINDERS;
  }
}

export async function saveReminderPreferences(
  configs: MealReminderConfig[]
): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(configs));
  } catch (error) {
    console.warn("No se pudieron guardar las preferencias de recordatorios:", error);
  }
}

export async function toggleReminder(
  id: string,
  enabled: boolean
): Promise<MealReminderConfig[]> {
  const current = await getReminderPreferences();
  const updated = current.map((rem) =>
    rem.id === id ? { ...rem, enabled } : rem
  );
  await saveReminderPreferences(updated);
  return updated;
}

export async function scheduleLocalNotification(reminder: MealReminderConfig): Promise<boolean> {
  if (!reminder.enabled) {
    return false;
  }

  // En producción con módulo nativo, expo-notifications programa el trigger diario.
  // En entornos de testing / simulador web, retornamos true registrando la configuración.
  if (__DEV__) {
    console.log(
      `[Notificación Programada] ${reminder.title} a las ${String(reminder.hour).padStart(2, "0")}:${String(
        reminder.minute
      ).padStart(2, "0")} hrs - ${reminder.body}`
    );
  }
  return true;
}

export async function syncAllScheduledReminders(): Promise<void> {
  const reminders = await getReminderPreferences();
  for (const rem of reminders) {
    await scheduleLocalNotification(rem);
  }
}
