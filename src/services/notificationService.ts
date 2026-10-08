import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useAuthStore } from "@/stores/useAuthStore";

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
    title: "Desayuno 🌅",
    body: "¡Hora de registrar tu desayuno para iniciar tu racha del día!",
    hour: 8,
    minute: 30,
    enabled: false,
  },
  {
    id: "reminder_lunch",
    mealType: "lunch",
    title: "Almuerzo 🍽️",
    body: "Recuerda fotografiar o registrar tu almuerzo para cumplir tus macros.",
    hour: 13,
    minute: 30,
    enabled: false,
  },
  {
    id: "reminder_water",
    mealType: "water",
    title: "Hidratación 💧",
    body: "¿Llevas tu meta de agua al día? Bebe un vaso ahora.",
    hour: 16,
    minute: 0,
    enabled: false,
  },
  {
    id: "reminder_dinner",
    mealType: "dinner",
    title: "Once / Cena 🥗",
    body: "Cierra tu día registrando tu cena y asegura tu racha de hoy.",
    hour: 20,
    minute: 30,
    enabled: false,
  },
];

function storageKey(userId = useAuthStore.getState().user?.id) {
  return "reminders_" + (userId || "anonymous");
}

export async function getReminderPreferences(userId = useAuthStore.getState().user?.id): Promise<MealReminderConfig[]> {
  try {
    let raw: string | null = null;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        raw = window.localStorage.getItem(storageKey(userId));
      }
    } else {
      raw = await SecureStore.getItemAsync(storageKey(userId));
    }

    const prefs = raw ? JSON.parse(raw) : {};
    return DEFAULT_CHILEAN_REMINDERS.map((r) => ({
      ...r,
      enabled: prefs[r.id] === true,
    }));
  } catch {
    return DEFAULT_CHILEAN_REMINDERS;
  }
}

export async function saveReminderPreferences(configs: MealReminderConfig[], userId = useAuthStore.getState().user?.id): Promise<void> {
  try {
    const json = JSON.stringify(Object.fromEntries(configs.map((r) => [r.id, r.enabled])));
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(storageKey(userId), json);
      }
    } else {
      await SecureStore.setItemAsync(storageKey(userId), json);
    }
  } catch (err) {
    console.warn("Error guardando preferencias de recordatorios:", err);
    throw new Error("No se pudieron guardar los recordatorios. Reintenta.");
  }
}

export async function scheduleLocalNotification(reminder: MealReminderConfig): Promise<boolean> {
  if (Platform.OS === "web") {
    // En web PWA se almacenan en el navegador para recordatorios locales / service worker
    return true;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(reminder.id);
    if (!reminder.enabled) return true;

    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminder.hour,
        minute: reminder.minute,
        channelId: "meal-reminders",
      },
    });
    return true;
  } catch (e) {
    console.warn("Error programando notificación nativa:", e);
    return false;
  }
}

export async function toggleReminder(id: string, enabled: boolean): Promise<MealReminderConfig[]> {
  const userId = useAuthStore.getState().user?.id;
  // 1. Manejo en Web / PWA
  if (Platform.OS === "web") {
    if (enabled && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "granted") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          throw new Error("Permite las notificaciones en tu navegador para recibir recordatorios.");
        }
      }
    }

    const current = await getReminderPreferences();
    const updated = current.map((r) => (r.id === id ? { ...r, enabled } : r));
    await saveReminderPreferences(updated);

    if (enabled && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const target = updated.find((r) => r.id === id);
      try {
        new Notification(target?.title || "Recordatorio Activado", {
          body: target?.body || "Te avisaremos a la hora programada.",
          icon: "/favicon.ico",
        });
      } catch {}
    }

    return updated;
  }

  // 2. Manejo en App Nativa (Android / iOS)
  if (enabled) {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("meal-reminders", {
        name: "Comidas y agua",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Permite las notificaciones en los ajustes del dispositivo.");
    }
  }

  if (useAuthStore.getState().user?.id !== userId) throw new Error("La sesión cambió. Reintenta.");
  const current = await getReminderPreferences(userId);
  const updated = current.map((r) => (r.id === id ? { ...r, enabled } : r));
  const reminder = updated.find((r) => r.id === id);
  if (!reminder) throw new Error("Recordatorio desconocido.");

  const scheduled = await scheduleLocalNotification(reminder);
  if (!scheduled) throw new Error("No se pudo programar el recordatorio. Reintenta.");
  await saveReminderPreferences(updated, userId);
  return updated;
}

export async function cancelMealReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const reminders = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      reminders
        .filter((r) => r.identifier.startsWith("reminder_"))
        .map((r) => Notifications.cancelScheduledNotificationAsync(r.identifier))
    );
  } catch (err) {
    console.warn("Error cancelando recordatorios:", err);
    throw new Error("No se pudieron cancelar los recordatorios anteriores.");
  }
}

let reminderSync = Promise.resolve();
let reminderSyncVersion = 0;

/** Serializa cambios de cuenta para que una sesión anterior no restaure sus avisos después de salir. */
export function syncAllScheduledReminders(userId: string | null = useAuthStore.getState().user?.id || null): Promise<void> {
  const version = ++reminderSyncVersion;
  reminderSync = reminderSync.catch(() => undefined).then(async () => {
    if (Platform.OS === "web" || version !== reminderSyncVersion) return;
    await cancelMealReminders();
    if (!userId || version !== reminderSyncVersion || useAuthStore.getState().user?.id !== userId) return;
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("meal-reminders", {
        name: "Comidas y agua", importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const list = await getReminderPreferences(userId);
    for (const reminder of list) {
      if (version !== reminderSyncVersion || useAuthStore.getState().user?.id !== userId) return;
      if (reminder.enabled) await scheduleLocalNotification(reminder);
    }
  });
  return reminderSync;
}
