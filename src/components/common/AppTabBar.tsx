import React from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { useLinkBuilder } from "@react-navigation/native";
import { colors } from "@/constants/colors";

export function appTabBarHeight(bottom: number, wide: boolean) {
  return 64 + (wide ? 8 : 7) + (wide ? Math.max(bottom, 12) : Math.max(bottom, Platform.OS === "ios" ? 20 : 8));
}

export function AppTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const wide = useWindowDimensions().width >= 768;
  const { buildHref } = useLinkBuilder();
  const bottom = wide ? Math.max(insets.bottom, 12) : Math.max(insets.bottom, Platform.OS === "ios" ? 20 : 8);

  return (
    <View testID="app-tab-bar" style={[styles.wrapper, wide && styles.wideWrapper, { paddingBottom: bottom }]}>
      <View role={Platform.OS === "web" ? "tablist" : undefined} accessibilityLabel="Navegación principal" style={[styles.bar, wide && styles.wideBar]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = typeof options.tabBarLabel === "string" ? options.tabBarLabel : options.title || route.name;
          const color = focused ? colors.primaryDark : colors.textSecondary;
          const register = route.name === "record";
          return (
            <PlatformPressable key={route.key} href={buildHref(route.name, route.params)}
              pressOpacity={0.8}
              role={Platform.OS === "ios" ? "button" : "tab"}
              accessibilityLabel={options.tabBarAccessibilityLabel || label}
              accessibilityState={{ selected: focused }} aria-selected={focused}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              style={[styles.item, wide && styles.wideItem, focused && styles.activeItem]}>
              <View style={[styles.icon, register && styles.registerIcon]}>
                {options.tabBarIcon?.({ focused, color: register ? "#FFFFFF" : color, size: 21 })}
              </View>
              <Text numberOfLines={1} style={[styles.label, wide && styles.wideLabel, { color }, focused && styles.activeLabel]}>{label}</Text>
            </PlatformPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%", alignItems: "center", paddingTop: 6, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  wideWrapper: { paddingTop: 8, paddingHorizontal: 20, borderTopWidth: 0, backgroundColor: colors.background },
  bar: { width: "100%", maxWidth: 1000, height: 64, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6 },
  wideBar: { backgroundColor: colors.card, paddingHorizontal: 8, borderRadius: 22, borderWidth: 1, borderColor: colors.cardBorder },
  item: { flex: 1, minWidth: 0, minHeight: 60, alignItems: "center", justifyContent: "center", borderRadius: 16, gap: 4, paddingVertical: 4 },
  wideItem: { flexDirection: "row", gap: 8 },
  activeItem: { backgroundColor: colors.primaryLight },
  icon: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 9 },
  registerIcon: { backgroundColor: colors.primary, borderRadius: 16 },
  label: { fontSize: 11, lineHeight: 14, fontWeight: "600", maxWidth: "100%" },
  wideLabel: { fontSize: 12 },
  activeLabel: { fontWeight: "800" },
});
