import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { createCoachLive, coachLiveSupported } from "@/services/coachLive";
import type { CoachLiveController, LiveStatus } from "@/services/coachLiveTypes";
import { useAuthStore } from "@/stores/useAuthStore";

export function useCoachLive() {
  const userId = useAuthStore(state => state.user?.id);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [draft, setDraft] = useState({ user: "", assistant: "" });
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<CoachLiveController | null>(null);
  const mounted = useRef(true);
  const stop = useCallback(() => { controller.current?.stop(); controller.current = null; }, []);
  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener("change", state => { if (state !== "active") stop(); });
    return () => { mounted.current = false; listener.remove(); stop(); };
  }, [stop]);
  useEffect(() => { stop(); }, [userId, stop]);
  useFocusEffect(useCallback(() => () => stop(), [stop]));
  const start = useCallback(() => {
    if (!userId || controller.current) return;
    setError(null);
    const connection = createCoachLive({
      onStatus: value => { if (mounted.current) { setStatus(value); if (value === "idle") controller.current = null; } },
      onDraft: (user, assistant) => { if (mounted.current) setDraft({ user, assistant }); },
      onError: message => { if (mounted.current) setError(message); },
      onSaved: () => { void queryClient.invalidateQueries({ queryKey: ["coachMessages", userId] }); },
    });
    controller.current = connection;
    void connection.start();
  }, [userId, queryClient]);
  return { status, draft, error, supported: coachLiveSupported(), active: status !== "idle", start, stop };
}
