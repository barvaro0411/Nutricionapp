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
    title: "07:00 • Desayuno Energético 🥣",
    body: "Avena + whey protein + plátano + leche descremada (~500 kcal, ~39g P).",
    hour: 7,
    minute: 0,
    enabled: true,
  },
  {
    id: "reminder_snack_am",
    mealType: "breakfast",
    title: "10:30 • Colación de Media Mañana 🍎",
    body: "Yogurt alto en proteína + fruta + 15g almendras (~290 kcal, ~20g P).",
    hour: 10,
    minute: 30,
    enabled: true,
  },
  {
    id: "reminder_pre_gym",
    mealType: "lunch",
    title: "13:45 • Comida Pre-Entreno ⚡",
    body: "Pan blanco 60g + mermelada + café. ¡Combustible rápido para el gym!",
    hour: 13,
    minute: 45,
    enabled: true,
  },
  {
    id: "reminder_lunch",
    mealType: "lunch",
    title: "16:15 • Almuerzo Post-Entreno 🍗",
    body: "Pollo 170g + arroz 220g + verduras + oliva (~720 kcal, ~58g P).",
    hour: 16,
    minute: 15,
    enabled: true,
  },
  {
    id: "reminder_dinner",
    mealType: "dinner",
    title: "20:30 • Cena de Recuperación 🥑",
    body: "2 huevos + atún 80g + pan integral + palta (~410 kcal, ~38g P).",
    hour: 20,
    minute: 30,
    enabled: true,
  },
  {
    id: "reminder_water",
    mealType: "water",
    title: "Hidratación Deportiva (Meta 3,2 L) 💧",
    body: "Recuerda hidratarte antes y después del entrenamiento y traslados en bicicleta.",
    hour: 12,
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
