import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useAuthStore } from "@/stores/useAuthStore";
export interface MealReminderConfig {
  id: string; mealType: "breakfast" | "lunch" | "dinner" | "water";
  title: string; body: string; hour: number; minute: number; enabled: boolean;
}
export const DEFAULT_CHILEAN_REMINDERS: MealReminderConfig[] = [
  { id: "reminder_breakfast", mealType: "breakfast", title: "Desayuno", body: "Registra tu desayuno.", hour: 8, minute: 0, enabled: false },
  { id: "reminder_lunch", mealType: "lunch", title: "Almuerzo", body: "Registra tu almuerzo.", hour: 13, minute: 0, enabled: false },
  { id: "reminder_dinner", mealType: "dinner", title: "Cena", body: "Registra tu cena.", hour: 20, minute: 0, enabled: false },
  { id: "reminder_water", mealType: "water", title: "Agua", body: "Recuerda registrar el agua que tomas.", hour: 12, minute: 0, enabled: false },
];
function storageKey() { return "reminders_" + (useAuthStore.getState().user?.id || "anonymous"); }
export async function getReminderPreferences(): Promise<MealReminderConfig[]> {
  if (Platform.OS === "web") return DEFAULT_CHILEAN_REMINDERS;
  const raw = await SecureStore.getItemAsync(storageKey());
  try {
    const prefs = raw ? JSON.parse(raw) : {};
    return DEFAULT_CHILEAN_REMINDERS.map(r => ({ ...r, enabled: prefs[r.id] === true }));
  } catch { return DEFAULT_CHILEAN_REMINDERS; }
}
export async function saveReminderPreferences(configs: MealReminderConfig[]): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(storageKey(), JSON.stringify(Object.fromEntries(configs.map(r => [r.id, r.enabled]))));
}
export async function cancelMealReminders() {
  if (Platform.OS === "web") return;
  const reminders = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(reminders.filter(r => r.identifier.startsWith("reminder_")).map(r => Notifications.cancelScheduledNotificationAsync(r.identifier)));
}
export async function scheduleLocalNotification(reminder: MealReminderConfig): Promise<boolean> {
  if (Platform.OS === "web") return false;
  await Notifications.cancelScheduledNotificationAsync(reminder.id);
  if (!reminder.enabled) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: reminder.id, content: { title: reminder.title, body: reminder.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: reminder.hour, minute: reminder.minute, channelId: "meal-reminders" },
  });
  return true;
}
export async function toggleReminder(id: string, enabled: boolean): Promise<MealReminderConfig[]> {
  if (Platform.OS === "web") throw new Error("Los recordatorios del dispositivo no están disponibles en la versión web.");
  if (enabled) {
    if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("meal-reminders", { name: "Comidas y agua", importance: Notifications.AndroidImportance.DEFAULT });
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) throw new Error("Permite las notificaciones en los ajustes del dispositivo.");
  }
  const current = await getReminderPreferences();
  const updated = current.map(r => r.id === id ? { ...r, enabled } : r);
  const reminder = updated.find(r => r.id === id);
  if (!reminder) throw new Error("Recordatorio desconocido.");
  await scheduleLocalNotification(reminder);
  await saveReminderPreferences(updated);
  return updated;
}
export async function syncAllScheduledReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  for (const reminder of await getReminderPreferences()) await scheduleLocalNotification(reminder);
}
