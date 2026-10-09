import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Speech from "expo-speech";
import { coachSpeechText, chunkCoachSpeech } from "@/utils/coachFormatting";

export function useCoachSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const supported = Platform.OS !== "web" || (typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
  const stop = useCallback(() => {
    generation.current++;
    if (mounted.current) setSpeakingId(null);
    void Speech.stop().catch(() => {});
  }, []);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener("change", state => { if (state !== "active") stop(); });
    return () => { mounted.current = false; subscription.remove(); stop(); };
  }, [stop]);
  useFocusEffect(useCallback(() => () => stop(), [stop]));
  const toggle = useCallback((id: string, content: string) => {
    const wasSpeaking = speakingId === id;
    stop();
    setError(null);
    if (wasSpeaking) return;
    if (!supported) { setError("Este dispositivo no dispone de lectura por voz."); return; }
    const chunks = chunkCoachSpeech(coachSpeechText(content), Math.min(3000, Speech.maxSpeechInputLength));
    if (!chunks.length) return;
    const current = generation.current;
    setSpeakingId(id);
    const finish = () => { if (mounted.current && generation.current === current) setSpeakingId(null); };
    try {
      chunks.forEach((text, index) => Speech.speak(text, { language: "es-CL", rate: 0.95, pitch: 1,
        onDone: index === chunks.length - 1 ? finish : undefined,
        onStopped: finish,
        onError: () => { if (mounted.current && generation.current === current) { stop(); setError("No se pudo reproducir la voz. Revisa el audio del dispositivo."); } },
      }));
    } catch { stop(); setError("No se pudo iniciar la lectura por voz."); }
  }, [speakingId, stop, supported]);
  return { speakingId, error, supported, toggle, stop };
}
