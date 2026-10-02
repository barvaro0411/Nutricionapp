import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { colors } from "@/constants/colors";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutos
    },
  },
});

function RootNavigationLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, profile, isLoading, setSession, setProfile, setIsLoading } = useAuthStore();
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    // 1. Cargar sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (profileData) {
          setProfile(profileData);
        }
      }
      setIsLoading(false);
      setAuthInitialized(true);
    });

    // 2. Suscribirse a cambios de estado de autenticación
    const { data: authSubscription } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", newSession.user.id)
            .single();
          if (profileData) {
            setProfile(profileData);
          }
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  // 3. Protección de rutas y redirecciones automáticas
  useEffect(() => {
    if (!authInitialized || isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";

    if (!session) {
      // Si no hay sesión y no está en auth, redirigir a login
      if (!inAuthGroup) {
        router.replace("/(auth)/login");
      }
    } else {
      // Si hay sesión pero no ha completado el perfil (peso o altura nula), llevar a onboarding
      const isProfileIncomplete = !profile?.current_weight_kg || !profile?.height_cm;
      if (isProfileIncomplete) {
        if (!inOnboardingGroup) {
          router.replace("/(onboarding)/profile-setup");
        }
      } else {
        // Usuario autenticado y con perfil completo: si está en auth u onboarding, enviar a tabs
        if (inAuthGroup || inOnboardingGroup) {
          router.replace("/(tabs)");
        }
      }
    }
  }, [session, profile, authInitialized, isLoading, segments]);

  if (isLoading || !authInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="meal/camera"
          options={{
            presentation: "fullScreenModal",
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="meal/review"
          options={{
            presentation: "modal",
            title: "Confirmar Comida",
            headerShown: true,
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
          }}
        />
        <Stack.Screen
          name="meal/barcode"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="coach/index"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="recipes/index"
          options={{
            presentation: "card",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="recipes/[id]"
          options={{
            presentation: "card",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="paywall/index"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="export/index"
          options={{
            presentation: "card",
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigationLayout />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
