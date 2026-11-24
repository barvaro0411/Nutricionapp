import React from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { useLinkBuilder } from "@react-navigation/native";
import { colors, shadows } from "@/constants/colors";

export function appTabBarHeight(bottom: number, wide: boolean) {
  return (
    64 +
    (wide ? 8 : 6) +
    (wide ? Math.max(bottom, 12) : Math.max(bottom, Platform.OS === "ios" ? 20 : 8))
  );
}

export function AppTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const wide = useWindowDimensions().width >= 768;
  const { buildHref } = useLinkBuilder();
  const bottom = wide
    ? Math.max(insets.bottom, 12)
    : Math.max(insets.bottom, Platform.OS === "ios" ? 20 : 8);

  return (
    <View
      testID="app-tab-bar"
      style={[styles.wrapper, wide && styles.wideWrapper, { paddingBottom: bottom }]}
    >
      <View
        role={Platform.OS === "web" ? "tablist" : undefined}
        accessibilityLabel="Navegación principal"
        style={[styles.bar, wide && styles.wideBar]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title || route.name;
          const color = focused ? colors.primaryDark : colors.textSecondary;
          const register = route.name === "record";
          return (
            <PlatformPressable
              key={route.key}
              href={buildHref(route.name, route.params)}
              pressOpacity={0.78}
              role={Platform.OS === "ios" ? "button" : "tab"}
              accessibilityLabel={options.tabBarAccessibilityLabel || label}
              accessibilityState={{ selected: focused }}
              aria-selected={focused}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
              style={[
                styles.item,
                wide && styles.wideItem,
                focused && !register && styles.activeItem,
                register && !wide && styles.registerItemMobile,
              ]}
            >
              {focused && !register && !wide && (
                <View style={styles.activeIndicator} />
              )}
              <View
                style={[
                  styles.icon,
                  register && styles.registerIcon,
                  register && !wide && styles.registerIconMobile,
                  register && focused && styles.registerIconFocused,
                ]}
              >
                {options.tabBarIcon?.({
                  focused,
                  color: register ? "#FFFFFF" : color,
                  size: register ? 23 : 20,
                })}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  wide && styles.wideLabel,
                  { color: register ? colors.primaryDark : color },
                  (focused || register) && styles.activeLabel,
                ]}
              >
                {label}
              </Text>
            </PlatformPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
    paddingTop: 6,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  wideWrapper: {
    paddingTop: 8,
    paddingHorizontal: 20,
    borderTopWidth: 0,
    backgroundColor: colors.background,
  },
  bar: {
    width: "100%",
    maxWidth: 1000,
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
  },
  wideBar: {
    maxWidth: 660,
    height: 64,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.cardHover,
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 4,
    position: "relative",
  },
  wideItem: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
  },
  activeItem: {
    backgroundColor: colors.primaryLight,
  },
  activeIndicator: {
    position: "absolute",
    top: 0,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  registerItemMobile: {
    marginTop: -12,
  },
  icon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  registerIcon: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    width: 36,
    height: 36,
    ...shadows.glow,
  },
  registerIconMobile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.card,
  },
  registerIconFocused: {
    backgroundColor: colors.primaryDark,
  },
  label: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "600",
    maxWidth: "100%",
  },
  wideLabel: {
    fontSize: 12,
  },
  activeLabel: {
    fontWeight: "800",
  },
});
