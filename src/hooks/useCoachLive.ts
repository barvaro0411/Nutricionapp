import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { createCoachLive, coachLiveSupported } from "@/services/coachLive";
import type { CoachLiveController, LiveStatus } from "@/services/coachLiveTypes";
import { useAuthStore } from "@/stores/useAuthStore";

export const MAX_LIVE_SESSION_SECONDS = 120; // 2 minutos por sesión para control de costos de voz

export function useCoachLive() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [draft, setDraft] = useState({ user: "", assistant: "" });
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(MAX_LIVE_SESSION_SECONDS);
  const controller = useRef<CoachLiveController | null>(null);
  const mounted = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    controller.current?.stop();
    controller.current = null;
  }, [clearTimer]);

  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active") stop();
    });
    return () => {
      mounted.current = false;
      listener.remove();
      stop();
    };
  }, [stop]);

  useEffect(() => {
    stop();
  }, [userId, stop]);

  useFocusEffect(useCallback(() => () => stop(), [stop]));

  // Manejo del temporizador de sesión cuando está activa
  useEffect(() => {
    if (status === "listening" || status === "speaking") {
      clearTimer();
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            stop();
            if (mounted.current) {
              setError("Sesión de voz finalizada (límite de 2 min alcanzado). Puedes continuar por chat.");
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (status === "idle") {
      clearTimer();
      setTimeRemaining(MAX_LIVE_SESSION_SECONDS);
    }

    return () => clearTimer();
  }, [status, clearTimer, stop]);

  const start = useCallback(() => {
    if (!userId || controller.current) return;
    setError(null);
    setTimeRemaining(MAX_LIVE_SESSION_SECONDS);

    const connection = createCoachLive({
      onStatus: (value) => {
        if (mounted.current) {
          setStatus(value);
          if (value === "idle") {
            controller.current = null;
            clearTimer();
          }
        }
      },
      onDraft: (user, assistant) => {
        if (mounted.current) setDraft({ user, assistant });
      },
      onError: (message) => {
        if (mounted.current) {
          setError(message);
          clearTimer();
        }
      },
      onSaved: () => {
        void queryClient.invalidateQueries({ queryKey: ["coachMessages", userId] });
      },
    });

    controller.current = connection;
    void connection.start();
  }, [userId, queryClient, clearTimer]);

  return {
    status,
    draft,
    error,
    timeRemaining,
    maxDurationSeconds: MAX_LIVE_SESSION_SECONDS,
    isExpiringSoon: timeRemaining <= 15 && status !== "idle" && status !== "connecting",
    supported: coachLiveSupported(),
    active: status !== "idle",
    start,
    stop,
  };
}
