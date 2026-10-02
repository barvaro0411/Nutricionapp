import React from "react";
import { Tabs, useRouter } from "expo-router";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { LayoutDashboard, CalendarDays, Settings, Camera } from "lucide-react-native";
import { colors } from "@/constants/colors";

export default function TabLayout() {
  const router = useRouter();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginBottom: 2,
          },
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.cardBorder,
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 6,
            paddingTop: 6,
            elevation: 8,
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
          },
          headerStyle: {
            backgroundColor: colors.card,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.cardBorder,
          },
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 18,
            color: colors.text,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Hoy",
            headerTitle: "Nutrición Hoy",
            tabBarIcon: ({ color, focused }) => (
              <LayoutDashboard size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "Historial",
            headerTitle: "Historial y Semanal",
            tabBarIcon: ({ color, focused }) => (
              <CalendarDays size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Ajustes",
            headerTitle: "Mi Perfil y Metas",
            tabBarIcon: ({ color, focused }) => (
              <Settings size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            ),
          }}
        />
      </Tabs>

      {/* Botón flotante de cámara inteligente IA posicionado ergonómicamente */}
      <View style={styles.floatingButtonContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => router.push("/meal/camera")}
          activeOpacity={0.85}
        >
          <Camera size={26} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: "absolute",
    bottom: 78,
    right: 20,
    zIndex: 99,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
