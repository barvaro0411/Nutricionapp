import { useEffect, useRef, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as Linking from "expo-linking";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { supabase, configurationError } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { syncAllScheduledReminders } from "@/services/notificationService";
import { colors } from "@/constants/colors";
import { ToastContainer } from "@/components/common/ToastContainer";

// Supabase already retries transient failures on idempotent reads. Avoid
// repeating that entire retry cycle before showing a recoverable error.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 300000 } } });

function RootNavigationLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading, isRecoveringPassword, setSession, setProfile, setIsLoading, setIsRecoveringPassword } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(configurationError);
  const [retry, setRetry] = useState(0);
  const previousUser = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (configurationError) return;
    let active = true;
    let authEventReceived = false;
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      authEventReceived = true;
      if (event === "PASSWORD_RECOVERY") setIsRecoveringPassword(true);
      setSession(next);
      setInitialized(true);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) throw error;
      if (!authEventReceived) setSession(data.session);
      setInitialized(true);
    }).catch(() => {
      if (active) { setError("No se pudo recuperar la sesión. Reintenta para continuar."); setIsLoading(false); setInitialized(true); }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [retry, setSession, setIsLoading, setIsRecoveringPassword]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const acceptLink = async (url: string | null) => {
      if (!url || !url.includes("reset-password")) return;
      try {
        const params = new URLSearchParams(url.split("#")[1] || url.split("?")[1] || "");
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          setIsRecoveringPassword(true);
        }
      } catch { setError("El enlace de recuperación es inválido o ha caducado."); }
    };
    void Linking.getInitialURL().then(acceptLink);
    const listener = Linking.addEventListener("url", ({ url }) => { void acceptLink(url); });
    return () => listener.remove();
  }, [setIsRecoveringPassword]);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!initialized || configurationError) return;
    let active = true;
    if (previousUser.current !== userId) {
      queryClient.clear();
      void syncAllScheduledReminders(userId).catch(() => console.warn("No se pudieron restaurar los recordatorios."));
      useMealReviewStore.getState().reset();
      setProfile(null);
      previousUser.current = userId;
      if (!userId) setIsRecoveringPassword(false);
    }
    if (!userId) { setIsLoading(false); return; }
    setIsLoading(true);
    supabase.from("profiles").select("*").eq("id", userId).single().then(({ data, error }) => {
      if (!active) return;
      if (error) { setError("No se pudo cargar tu perfil. Reintenta para continuar."); }
      else { setProfile(data); setError(null); }
      setIsLoading(false);
    }, () => {
      if (active) { setError("No se pudo cargar tu perfil. Revisa la conexión y reintenta."); setIsLoading(false); }
    });
    return () => { active = false; };
  }, [initialized, userId, retry, setProfile, setIsLoading, setIsRecoveringPassword]);

  useEffect(() => {
    if (!initialized || isLoading || error) return;
    const inAuth = segments[0] === "(auth)";
    const inRecovery = segments[0] === "reset-password";
    if (isRecoveringPassword && session) {
      if (!inRecovery) router.replace("/reset-password");
    } else if (!session) {
      if (!inAuth && !inRecovery) router.replace("/(auth)/login");
    } else if (inAuth) router.replace("/(tabs)");
  }, [initialized, isLoading, error, segments, session, isRecoveringPassword, router]);

  if (error) return <View style={styles.center}>
    <Text style={styles.message}>{error}</Text>
    {!configurationError && <TouchableOpacity accessibilityRole="button" onPress={() => { setError(null); setRetry(v => v + 1); }}>
      <Text style={styles.action}>Reintentar</Text>
    </TouchableOpacity>}
  </View>;
  if (!initialized || isLoading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  return <>
    <StatusBar style="auto" />
    <ToastContainer />
    <Stack initialRouteName="(tabs)" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="meal/review" options={{ presentation: "modal", title: "Confirmar comida", headerShown: true }} />
      <Stack.Screen name="meal/camera" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="meal/barcode" options={{ presentation: "modal" }} />
      <Stack.Screen name="coach/index" options={{ presentation: "modal" }} />
    </Stack>
  </>;
}
export default function RootLayout() {
  return <QueryClientProvider client={queryClient}><RootNavigationLayout /></QueryClientProvider>;
}
const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: 24 },
  message: { color: colors.text, textAlign: "center", marginBottom: 20 },
  action: { color: colors.primary, fontSize: 18, padding: 12 },
});
