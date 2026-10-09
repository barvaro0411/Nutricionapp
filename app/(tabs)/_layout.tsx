import React from "react";
import { Tabs, useRouter } from "expo-router";
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutDashboard, CalendarDays, Plus, Sparkles, UserRound, Leaf } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/useAuthStore";
import { AppTabBar, appTabBarHeight } from "@/components/common/AppTabBar";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const wide = useWindowDimensions().width >= 768;
  const fullName = useAuthStore(state => state.profile?.full_name);

  return (
    <Tabs
      tabBar={props => <AppTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerTitle: () => <View style={styles.brand}><View style={styles.brandIcon}><Leaf size={20} color={colors.primary}/></View><View><Text style={styles.brandText}>Nutrición IA</Text><Text style={styles.brandTagline}>Comer bien, a tu ritmo</Text></View></View>,
        headerRight: () => <Pressable accessibilityRole="button" accessibilityLabel="Abrir mi perfil" onPress={() => router.push("/(tabs)/settings")} style={({ pressed }) => [styles.profileShortcut, pressed && { opacity: 0.7 }]}><Text style={styles.profileInitial}>{fullName?.trim().charAt(0).toUpperCase() || "N"}</Text></Pressable>,
        tabBarStyle: { height: appTabBarHeight(insets.bottom, wide) },
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
          tabBarIcon: ({ color }) => <Plus size={21} color={color} strokeWidth={2.5} />,
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
});
