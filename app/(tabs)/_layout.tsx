import React from "react";
import { Tabs, useRouter } from "expo-router";
import { View, Text, StyleSheet, Platform, Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutDashboard, CalendarDays, Plus, Sparkles, UserRound, Leaf } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/useAuthStore";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const wide = useWindowDimensions().width >= 768;
  const fullName = useAuthStore(state => state.profile?.full_name);

  // En móviles con barra gestual inferior (iOS / Android / PWA), insets.bottom es ~20-34px.
  // Aseguramos un padding dinámico ergonómico para que los iconos y etiquetas nunca se corten.
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 20 : 10);
  const barHeight = 62 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerTitle: () => <View style={styles.brand}><View style={styles.brandIcon}><Leaf size={20} color={colors.primary}/></View><View><Text style={styles.brandText}>Nutrición IA</Text><Text style={styles.brandTagline}>Comer bien, a tu ritmo</Text></View></View>,
        headerRight: () => <Pressable accessibilityRole="button" accessibilityLabel="Abrir mi perfil" onPress={() => router.push("/(tabs)/settings")} style={({ pressed }) => [styles.profileShortcut, pressed && { opacity: 0.7 }]}><Text style={styles.profileInitial}>{fullName?.trim().charAt(0).toUpperCase() || "N"}</Text></Pressable>,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarActiveBackgroundColor: colors.primaryLight,
        tabBarLabelPosition: wide ? "beside-icon" : "below-icon",
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          fontWeight: "700",
          flexShrink: 0,
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          overflow: "hidden",
          marginHorizontal: 3,
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.cardBorder,
          borderTopWidth: 1,
          borderLeftWidth: wide ? 1 : 0,
          borderRightWidth: wide ? 1 : 0,
          borderBottomWidth: wide ? 1 : 0,
          borderColor: colors.cardBorder,
          width: wide ? "96%" : "100%",
          maxWidth: 1000,
          alignSelf: "center",
          borderRadius: wide ? 22 : 0,
          marginBottom: wide ? 10 : 0,
          height: barHeight,
          paddingBottom: bottomInset,
          paddingTop: 5,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 10,
        },
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
          borderBottomColor: colors.cardBorder,
        },
        headerTitleStyle: {
          fontWeight: "800",
          fontSize: 18,
          color: colors.text,
          letterSpacing: -0.3,
        },
      }}
    >
      {/* Tab 1: Hoy */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarAccessibilityLabel: "Ir al inicio",
          tabBarIcon: ({ color, focused }) => (
            <LayoutDashboard
              size={21}
              color={color}
              strokeWidth={focused ? 2.5 : 1.8}
            />
          ),
        }}
      />

      {/* Tab 2: Historial */}
      <Tabs.Screen
        name="history"
        options={{
          title: "Progreso",
          tabBarAccessibilityLabel: "Ver progreso",
          tabBarIcon: ({ color, focused }) => (
            <CalendarDays
              size={21}
              color={color}
              strokeWidth={focused ? 2.5 : 1.8}
            />
          ),
        }}
      />

      {/* Tab 3: Botón Central: Registrar Comida */}
      <Tabs.Screen
        name="record"
        options={{
          title: "Registrar",
          tabBarAccessibilityLabel: "Registrar comida",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.centerButton, focused && styles.centerButtonActive]}>
              <Plus size={24} color="#FFFFFF" strokeWidth={3} />
            </View>
          ),
        }}
      />

      {/* Tab 4: Coach IA */}
      <Tabs.Screen
        name="coach"
        options={{
          title: "Coach",
          tabBarAccessibilityLabel: "Abrir asistente",
          headerShown: false, // CoachChatScreen ya maneja su propia cabecera completa
          tabBarIcon: ({ color, focused }) => (
            <Sparkles
              size={21}
              color={color}
              strokeWidth={focused ? 2.5 : 1.8}
            />
          ),
        }}
      />

      {/* Tab 5: Ajustes */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Perfil",
          tabBarAccessibilityLabel: "Abrir perfil",
          tabBarIcon: ({ color, focused }) => (
            <UserRound
              size={21}
              color={color}
              strokeWidth={focused ? 2.5 : 1.8}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  brandText: { fontSize: 17, fontWeight: "800", letterSpacing: -0.5, color: colors.text },
  brandTagline: { fontSize: 9, color: colors.textSecondary, marginTop: 2 },
  profileShortcut: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 16, borderWidth: 1, borderColor: "#D3EADB" },
  profileInitial: { color: colors.primaryDark, fontSize: 16, fontWeight: "800" },
  centerButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -8,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  centerButtonActive: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 1.05 }],
  },
});
