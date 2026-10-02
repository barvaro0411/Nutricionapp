import React from "react";
import { Tabs, useRouter } from "expo-router";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { colors } from "@/constants/colors";

export default function TabLayout() {
  const router = useRouter();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.cardBorder,
            height: 64,
            paddingBottom: 10,
            paddingTop: 8,
          },
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTitleStyle: {
            fontWeight: "700",
            color: colors.text,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Hoy",
            headerTitle: "Nutrición Hoy",
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📊</Text>,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "Historial",
            headerTitle: "Historial y Semanal",
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📅</Text>,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Ajustes",
            headerTitle: "Mi Perfil y Metas",
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>⚙️</Text>,
          }}
        />
      </Tabs>

      {/* Botón flotante central de captura de comida con IA */}
      <View style={styles.floatingButtonContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => router.push("/meal/camera")}
          activeOpacity={0.85}
        >
          <Text style={styles.floatingButtonIcon}>📸</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    zIndex: 99,
  },
  floatingButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  floatingButtonIcon: {
    fontSize: 22,
  },
});
