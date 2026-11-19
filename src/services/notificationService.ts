import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useAuthStore } from "@/stores/useAuthStore";
import { getDateKey } from "@/utils/dates";

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

function isValidTimePart(val: unknown, max: number): val is number {
  return typeof val === "number" && Number.isInteger(val) && val >= 0 && val <= max;
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
    return DEFAULT_CHILEAN_REMINDERS.map((r) => {
      const entry = prefs?.[r.id];
      if (entry && typeof entry === "object") {
        return {
          ...r,
          enabled: entry.enabled === true,
          hour: isValidTimePart(entry.hour, 23) ? entry.hour : r.hour,
          minute: isValidTimePart(entry.minute, 59) ? entry.minute : r.minute,
        };
      }
      return {
        ...r,
        enabled: entry === true,
      };
    });
  } catch {
    return DEFAULT_CHILEAN_REMINDERS;
  }
}

export async function saveReminderPreferences(configs: MealReminderConfig[], userId = useAuthStore.getState().user?.id): Promise<void> {
  try {
    const json = JSON.stringify(
      Object.fromEntries(
        configs.map((r) => [r.id, { enabled: r.enabled, hour: r.hour, minute: r.minute }])
      )
    );
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

export type WebNotificationStatus = "granted" | "denied" | "default" | "unsupported";

export function getWebNotificationStatus(): WebNotificationStatus {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

async function dispatchWebNotification(
  title: string,
  body: string,
  tag?: string,
  targetUrl = "/(tabs)/record"
): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  try {
    if ("serviceWorker" in navigator) {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
      ]);
      if (reg && typeof reg.showNotification === "function") {
        await reg.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag,
          data: { url: targetUrl },
        });
        return true;
      }
    }
  } catch {}

  try {
    new Notification(title, {
      body,
      icon: "/icon-192.png",
      tag,
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendTestNotification(): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined" || !("Notification" in window)) {
      throw new Error("Tu navegador no soporta notificaciones locales.");
    }
    if (Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        throw new Error("Permite las notificaciones en tu navegador para probar los avisos.");
      }
    }
    const ok = await dispatchWebNotification(
      "🔔 Recordatorio de prueba",
      "Así verás tus avisos de comidas e hidratación en Nutrición IA Chile.",
      "reminder_test",
      "/(tabs)/record"
    );
    if (!ok) throw new Error("No se pudo mostrar la notificación de prueba.");
    return;
  }

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Permite las notificaciones en los ajustes del dispositivo.");
  }
  await Notifications.scheduleNotificationAsync({
    identifier: "reminder_test",
    content: {
      title: "🔔 Recordatorio de prueba",
      body: "Tus avisos están configurados correctamente.",
      sound: true,
    },
    trigger: null,
  });
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

    const current = await getReminderPreferences(userId);
    const updated = current.map((r) => (r.id === id ? { ...r, enabled } : r));
    await saveReminderPreferences(updated, userId);

    if (enabled && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const target = updated.find((r) => r.id === id);
      const timeStr = target
        ? `${String(target.hour).padStart(2, "0")}:${String(target.minute).padStart(2, "0")}`
        : "";
      await dispatchWebNotification(
        target?.title || "Recordatorio Activado",
        timeStr
          ? `Te avisaremos a las ${timeStr} cuando tengas la app abierta o instalada.`
          : target?.body || "Te avisaremos a la hora programada.",
        id
      );
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

export async function updateReminderTime(
  id: string,
  hour: number,
  minute: number
): Promise<MealReminderConfig[]> {
  if (!isValidTimePart(hour, 23) || !isValidTimePart(minute, 59)) {
    throw new Error("Horario inválido.");
  }
  const userId = useAuthStore.getState().user?.id;
  const current = await getReminderPreferences(userId);
  const targetExists = current.some((r) => r.id === id);
  if (!targetExists) throw new Error("Recordatorio desconocido.");

  const updated = current.map((r) => (r.id === id ? { ...r, hour, minute } : r));
  const target = updated.find((r) => r.id === id)!;

  if (Platform.OS !== "web" && target.enabled) {
    const scheduled = await scheduleLocalNotification(target);
    if (!scheduled) throw new Error("No se pudo actualizar el horario del recordatorio.");
  }

  await saveReminderPreferences(updated, userId);

  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    const todayKey = getDateKey();
    window.localStorage.removeItem(`fired_rem_${userId || "anon"}_${todayKey}_${id}`);
  }

  return updated;
}

export async function checkAndDispatchWebReminders(
  userId = useAuthStore.getState().user?.id,
  now = new Date()
): Promise<string[]> {
  if (Platform.OS !== "web") return [];
  if (typeof window === "undefined" || !("Notification" in window)) return [];
  if (Notification.permission !== "granted") return [];

  const configs = await getReminderPreferences(userId);
  const todayKey = getDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const firedIds: string[] = [];

  for (const rem of configs) {
    if (!rem.enabled) continue;
    const targetMinutes = rem.hour * 60 + rem.minute;
    const diff = nowMinutes - targetMinutes;
    if (diff < 0 || diff > 15) continue;

    const dedupeKey = `fired_rem_${userId || "anon"}_${todayKey}_${rem.id}`;
    try {
      if (window.localStorage?.getItem(dedupeKey)) continue;
      window.localStorage?.setItem(dedupeKey, "1");
    } catch {}

    const sent = await dispatchWebNotification(rem.title, rem.body, rem.id, "/(tabs)/record");
    if (sent) firedIds.push(rem.id);
  }

  return firedIds;
}

export function buildRemindersIcs(reminders: MealReminderConfig[], referenceDate = new Date()): string {
  const active = reminders.filter((r) => r.enabled);
  const list = active.length > 0 ? active : reminders;
  const dateCompact = getDateKey(referenceDate).replace(/-/g, "");
  const pad2 = (n: number) => String(n).padStart(2, "0");

  const events = list.map((r) => {
    const startH = pad2(r.hour);
    const startM = pad2(r.minute);
    const endMinutes = (r.hour * 60 + r.minute + 15) % (24 * 60);
    const endH = pad2(Math.floor(endMinutes / 60));
    const endM = pad2(endMinutes % 60);
    return [
      "BEGIN:VEVENT",
      `UID:${r.id}@nutricionia.cl`,
      `DTSTAMP:${dateCompact}T000000Z`,
      `DTSTART:${dateCompact}T${startH}${startM}00`,
      `DTEND:${dateCompact}T${endH}${endM}00`,
      "RRULE:FREQ=DAILY",
      `SUMMARY:${r.title} - Nutrición IA Chile`,
      `DESCRIPTION:${r.body}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT0M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${r.body}`,
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nutricion IA Chile//Recordatorios//ES",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
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

export const ADAPTIVE_STREAK_REMINDER_ID = "reminder_adaptive_streak";
export const ADAPTIVE_WATER_REMINDER_ID = "reminder_adaptive_water";

export interface AdaptiveRiskState {
  streakAtRisk: boolean;
  waterAtRisk: boolean;
  streakDays: number;
  waterPercent: number;
  message?: string;
}

export function evaluateAdaptiveRisks(params: {
  currentStreak: number;
  hasLoggedToday: boolean;
  waterTotalMl: number;
  waterTargetMl: number;
  currentHour?: number;
}): AdaptiveRiskState {
  const hour = params.currentHour ?? new Date().getHours();
  // Racha en riesgo: si tiene racha activa (> 0) y aún no ha registrado comida hoy
  const streakAtRisk = !params.hasLoggedToday && params.currentStreak > 0;

  // Hidratación en riesgo: si ya es por la tarde (>= 15:00) y lleva menos del 50% de la meta
  const safeTarget = params.waterTargetMl > 0 ? params.waterTargetMl : 2000;
  const waterPct = Math.round((params.waterTotalMl / safeTarget) * 100);
  const waterAtRisk = hour >= 15 && waterPct < 50;

  let message: string | undefined;
  if (streakAtRisk && hour >= 18) {
    message = `🔥 ¡Tu racha de ${params.currentStreak} días está en juego! Registra tu once/cena para mantenerla.`;
  } else if (waterAtRisk) {
    message = `💧 Tu hidratación va en ${waterPct}%. Toma un vaso ahora para alcanzar tu meta.`;
  }

  return {
    streakAtRisk,
    waterAtRisk,
    streakDays: params.currentStreak,
    waterPercent: waterPct,
    message,
  };
}

/**
 * Sincroniza notificaciones contextuales y adaptativas:
 * Cancela avisos si el objetivo ya se cumplió para no molestar al usuario,
 * o programa un aviso preventivo al final de la tarde si la racha o el agua están en riesgo.
 */
export async function syncAdaptiveNotifications(params: {
  userId?: string;
  currentStreak: number;
  hasLoggedToday: boolean;
  waterTotalMl: number;
  waterTargetMl: number;
  currentHour?: number;
}): Promise<AdaptiveRiskState> {
  const risks = evaluateAdaptiveRisks(params);
  const hour = params.currentHour ?? new Date().getHours();

  if (Platform.OS === "web") {
    // En Web, si la racha está en riesgo al final de la tarde y hay permiso, emitir aviso una sola vez por día
    if (risks.streakAtRisk && hour >= 19 && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const dedupeKey = `fired_adaptive_streak_${params.userId || "anon"}_${getDateKey()}`;
      try {
        if (!window.localStorage?.getItem(dedupeKey)) {
          window.localStorage?.setItem(dedupeKey, "1");
          await dispatchWebNotification(
            "🔥 ¡Protege tu racha de hábitos!",
            `Llevas ${risks.streakDays} días consecutivos. Registra una comida antes de que termine el día.`,
            ADAPTIVE_STREAK_REMINDER_ID,
            "/(tabs)/record"
          );
        }
      } catch {}
    }
    return risks;
  }

  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return risks;

    // 1. Manejo de Racha
    if (params.hasLoggedToday) {
      // Racha ya protegida hoy -> cancelar recordatorio preventivo
      await Notifications.cancelScheduledNotificationAsync(ADAPTIVE_STREAK_REMINDER_ID);
    } else if (risks.streakAtRisk) {
      // Racha en riesgo -> programar aviso a las 19:45
      await Notifications.cancelScheduledNotificationAsync(ADAPTIVE_STREAK_REMINDER_ID);
      await Notifications.scheduleNotificationAsync({
        identifier: ADAPTIVE_STREAK_REMINDER_ID,
        content: {
          title: "🔥 ¡Tu racha está en riesgo!",
          body: `Llevas ${risks.streakDays} ${risks.streakDays === 1 ? "día" : "días"} seguidos. Registra tu comida para mantener el fuego encendido.`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 19,
          minute: 45,
          channelId: "meal-reminders",
        },
      });
    }

    // 2. Manejo de Hidratación
    if (params.waterTotalMl >= (params.waterTargetMl || 2000) * 0.8) {
      // Meta de agua casi completa o superada -> cancelar aviso
      await Notifications.cancelScheduledNotificationAsync(ADAPTIVE_WATER_REMINDER_ID);
    } else if (risks.waterAtRisk) {
      // Hidratación baja -> programar aviso a las 16:30
      await Notifications.cancelScheduledNotificationAsync(ADAPTIVE_WATER_REMINDER_ID);
      await Notifications.scheduleNotificationAsync({
        identifier: ADAPTIVE_WATER_REMINDER_ID,
        content: {
          title: "💧 Tu cuerpo necesita agua",
          body: `Llevas solo el ${risks.waterPercent}% de tu meta (${params.waterTotalMl} ml). Bebe un vaso ahora para sentirte con energía.`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 16,
          minute: 30,
          channelId: "meal-reminders",
        },
      });
    }
  } catch (err) {
    console.warn("Error sincronizando notificaciones adaptativas:", err);
  }

  return risks;
}
