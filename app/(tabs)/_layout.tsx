import React from "react";
import { Tabs, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LayoutDashboard,
  TrendingUp,
  Plus,
  Sparkles,
  UserRound,
  Leaf,
  ChefHat,
  ShoppingCart,
} from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useShoppingList } from "@/hooks/useShoppingList";
import { AppTabBar, appTabBarHeight } from "@/components/common/AppTabBar";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const wide = useWindowDimensions().width >= 768;
  const { pendingCount } = useShoppingList();

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerTitle: () => (
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Leaf size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.brandText}>Nutrición IA</Text>
              {wide && (
                <Text style={styles.brandTagline}>Comer bien, a tu ritmo</Text>
              )}
            </View>
          </View>
        ),
        headerRight: () => (
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir recetas y plan semanal"
              onPress={() => router.push("/recipes")}
              style={({ pressed }) => [
                styles.headerBtn,
                pressed && { opacity: 0.72 },
              ]}
            >
              <ChefHat size={18} color={colors.primaryDark} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir lista de compras"
              onPress={() => router.push("/recipes/shopping-list")}
              style={({ pressed }) => [
                styles.headerBtn,
                pressed && { opacity: 0.72 },
              ]}
            >
              <ShoppingCart size={18} color={colors.primaryDark} />
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {pendingCount > 99 ? "99" : pendingCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        ),
        tabBarStyle: { height: appTabBarHeight(insets.bottom, wide) },
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        },
        headerTitleStyle: {
          fontWeight: "800",
          fontSize: 17,
          color: colors.text,
          letterSpacing: -0.3,
        },
      }}
    >
      {/* Tab 1: Hoy */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Hoy",
          tabBarAccessibilityLabel: "Ir al inicio",
          tabBarIcon: ({ color, focused }) => (
            <LayoutDashboard
              size={20}
              color={color}
              strokeWidth={focused ? 2.4 : 1.8}
            />
          ),
        }}
      />

      {/* Tab 2: Progreso */}
      <Tabs.Screen
        name="history"
        options={{
          title: "Progreso",
          tabBarAccessibilityLabel: "Ver progreso",
          tabBarIcon: ({ color, focused }) => (
            <TrendingUp
              size={20}
              color={color}
              strokeWidth={focused ? 2.4 : 1.8}
            />
          ),
        }}
      />

      {/* Tab 3: Botón Central Protagonista */}
      <Tabs.Screen
        name="record"
        options={{
          title: "Registrar",
          tabBarAccessibilityLabel: "Registrar comida",
          tabBarIcon: ({ color }) => (
            <Plus size={23} color={color} strokeWidth={2.8} />
          ),
        }}
      />

      {/* Tab 4: Coach IA */}
      <Tabs.Screen
        name="coach"
        options={{
          title: "Coach",
          tabBarAccessibilityLabel: "Abrir asistente",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Sparkles
              size={20}
              color={color}
              strokeWidth={focused ? 2.4 : 1.8}
            />
          ),
        }}
      />

      {/* Tab 5: Perfil */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Perfil",
          tabBarAccessibilityLabel: "Abrir perfil",
          tabBarIcon: ({ color, focused }) => (
            <UserRound
              size={20}
              color={color}
              strokeWidth={focused ? 2.4 : 1.8}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.text,
  },
  brandTagline: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 14,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
});
