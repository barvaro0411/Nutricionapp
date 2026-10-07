import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { getDateKey, getWeekday } from "@/utils/dates";

export interface DayStreakItem {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "L", "M", "X", etc.
  hasLogged: boolean;
  isToday: boolean;
}

export interface UserStreakData {
  currentStreak: number;
  bestStreak: number;
  hasLoggedToday: boolean;
  last7Days: DayStreakItem[];
  motivationMessage: string;
}

export function useUserStreak() {
  const { user } = useAuthStore();

  return useQuery<UserStreakData>({
    queryKey: ["userStreak", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UserStreakData> => {
      if (!user) {
        throw new Error("No hay sesión de usuario activa");
      }

      // Consultamos los registros de los últimos 60 días para calcular racha
      const today = new Date();
      const past60Days = new Date();
      past60Days.setDate(today.getDate() - 60);

      const { data, error } = await supabase
        .from("v_daily_totals")
        .select("log_date, meal_count, total_calories")
        .eq("user_id", user.id)
        .gte("log_date", getDateKey(past60Days))
        .lte("log_date", getDateKey(today))
        .order("log_date", { ascending: false });

      if (error) {
        console.warn("Error al cargar datos de racha:", error);
      }

      const loggedDatesSet = new Set<string>();
      (data || []).forEach((row) => {
        if (Number(row.meal_count) > 0 || Number(row.total_calories) > 0) {
          loggedDatesSet.add(row.log_date);
        }
      });

      const todayIso = getDateKey(today);
      const hasLoggedToday = loggedDatesSet.has(todayIso);

      // 1. Calcular racha actual (hacia atrás desde hoy o ayer)
      let currentStreak = 0;
      let checkDate = new Date(today);

      if (!hasLoggedToday) {
        // Si hoy no ha registrado todavía, verificamos si ayer sí registró
        checkDate.setDate(checkDate.getDate() - 1);
      }

      while (true) {
        const checkIso = getDateKey(checkDate);
        if (loggedDatesSet.has(checkIso)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      // 2. Calcular mejor racha histórica de los últimos 60 días
      let bestStreak = currentStreak;
      let tempStreak = 0;
      const iterDate = new Date(today);
      iterDate.setDate(iterDate.getDate() - 59);

      for (let i = 0; i < 60; i++) {
        const iso = getDateKey(iterDate);
        if (loggedDatesSet.has(iso)) {
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
        iterDate.setDate(iterDate.getDate() + 1);
      }

      // 3. Generar últimos 7 días visuales
      const dayLetters = ["D", "L", "M", "M", "J", "V", "S"];
      const last7Days: DayStreakItem[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const iso = getDateKey(d);
        const weekdayIndex = getWeekday(d);

        last7Days.push({
          date: iso,
          dayLabel: dayLetters[weekdayIndex],
          hasLogged: loggedDatesSet.has(iso),
          isToday: iso === todayIso,
        });
      }

      // 4. Mensaje motivacional
      let motivationMessage = "¡Comienza tu racha registrando tu primera comida!";
      if (currentStreak >= 1) {
        if (hasLoggedToday) {
          motivationMessage = `¡Excelente! Racha activa de ${currentStreak} ${currentStreak === 1 ? "día" : "días"}.`;
        } else {
          motivationMessage = `¡Registra tu comida de hoy para mantener tu racha de ${currentStreak} días!`;
        }
      }

      return {
        currentStreak,
        bestStreak,
        hasLoggedToday,
        last7Days,
        motivationMessage,
      };
    },
  });
}
