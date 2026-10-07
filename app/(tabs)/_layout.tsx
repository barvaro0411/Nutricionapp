import React from "react";
import { Tabs, useRouter } from "expo-router";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { LayoutDashboard, CalendarDays, Plus, Sparkles, Settings } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useQuickLogStore } from "@/stores/useQuickLogStore";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { QuickLogModal } from "@/components/dashboard/QuickLogModal";

export default function TabLayout() {
  const router = useRouter();
  const {
    isOpen: isQuickLogOpen,
    openQuickLog,
    closeQuickLog,
    openTextVoice,
    openFavorites,
  } = useQuickLogStore();

  const handleOpenQuickLog = () => {
    useMealReviewStore.getState().reset();
    openQuickLog();
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: "700",
            marginBottom: Platform.OS === "ios" ? 0 : 4,
          },
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopColor: colors.cardBorder,
            borderTopWidth: 1,
            height: Platform.OS === "ios" ? 84 : 68,
            paddingBottom: Platform.OS === "ios" ? 22 : 8,
            paddingTop: 8,
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 10,
          },
          headerStyle: {
            backgroundColor: "#FFFFFF",
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
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
            title: "Hoy",
            headerTitle: "Nutrición Hoy",
            tabBarIcon: ({ color, focused }) => (
              <LayoutDashboard
                size={22}
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
            title: "Historial",
            headerTitle: "Progreso Semanal",
            tabBarIcon: ({ color, focused }) => (
              <CalendarDays
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 1.8}
              />
            ),
          }}
        />

        {/* Tab 3: Botón Central de Registro Rápido */}
        <Tabs.Screen
          name="record"
          options={{
            title: "",
            tabBarButton: () => (
              <View style={styles.centerButtonWrapper} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.centerButton}
                  onPress={handleOpenQuickLog}
                  activeOpacity={0.85}
                  accessibilityLabel="Registrar comida"
                  accessibilityRole="button"
                >
                  <Plus size={26} color="#FFFFFF" strokeWidth={2.8} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />

        {/* Tab 4: Coach IA */}
        <Tabs.Screen
          name="coach"
          options={{
            title: "Coach IA",
            headerTitle: "Coach Nutricional IA",
            tabBarIcon: ({ color, focused }) => (
              <Sparkles
                size={22}
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
            title: "Ajustes",
            headerTitle: "Mi Perfil y Metas",
            tabBarIcon: ({ color, focused }) => (
              <Settings
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 1.8}
              />
            ),
          }}
        />
      </Tabs>

      {/* Modal de Registro Rápido */}
      <QuickLogModal
        visible={isQuickLogOpen}
        onClose={closeQuickLog}
        onSelectCamera={() => {
          useMealReviewStore.getState().reset();
          router.push("/meal/camera");
        }}
        onSelectBarcode={() => {
          useMealReviewStore.getState().reset();
          router.push("/meal/barcode");
        }}
        onSelectTextVoice={() => {
          useMealReviewStore.getState().reset();
          router.push("/(tabs)");
          openTextVoice();
        }}
        onSelectFavorites={() => {
          useMealReviewStore.getState().reset();
          router.push("/(tabs)");
          openFavorites();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centerButtonWrapper: {
    top: -14,
    justifyContent: "center",
    alignItems: "center",
    width: 60,
  },
  centerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3.5,
    borderColor: "#FFFFFF",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
