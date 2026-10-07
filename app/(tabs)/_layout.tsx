import React from "react";
import { Tabs, useRouter } from "expo-router";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutDashboard, CalendarDays, Plus, Sparkles, Settings } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useQuickLogStore } from "@/stores/useQuickLogStore";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { QuickLogModal } from "@/components/dashboard/QuickLogModal";

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  // En móviles con barra gestual inferior (iOS / Android / PWA), insets.bottom es ~20-34px.
  // Aseguramos un mínimo de 12px y padding dinámico para que los textos nunca se corten.
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 20 : 10);
  const barHeight = 56 + bottomInset;

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            marginTop: 2,
            marginBottom: 2,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
            justifyContent: "center",
            alignItems: "center",
          },
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopColor: colors.cardBorder,
            borderTopWidth: 1,
            height: barHeight,
            paddingBottom: bottomInset,
            paddingTop: 6,
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
            title: "Historial",
            headerTitle: "Progreso Semanal",
            tabBarIcon: ({ color, focused }) => (
              <CalendarDays
                size={21}
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
            tabBarButton: (props) => {
              const { delayLongPress, ...restProps } = props as any;
              return (
                <TouchableOpacity
                  {...restProps}
                  delayLongPress={delayLongPress ?? undefined}
                  style={[props.style, styles.centerButtonContainer]}
                  onPress={handleOpenQuickLog}
                  activeOpacity={0.85}
                  accessibilityLabel="Registrar comida"
                  accessibilityRole="button"
                >
                  <View style={styles.centerButton}>
                    <Plus size={24} color="#FFFFFF" strokeWidth={2.8} />
                  </View>
                </TouchableOpacity>
              );
            },
          }}
        />

        {/* Tab 4: Coach IA */}
        <Tabs.Screen
          name="coach"
          options={{
            title: "Coach IA",
            headerShown: false, // CoachChatScreen ya maneja su propia cabecera
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
            title: "Ajustes",
            headerTitle: "Mi Perfil y Metas",
            tabBarIcon: ({ color, focused }) => (
              <Settings
                size={21}
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
  centerButtonContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -14, // Flota suavemente hacia arriba sin recortar
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
