import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Easing, Platform, StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

export type BuddyMood = "ready" | "thinking" | "listening" | "speaking";

/** A small companion; animation sleeps off-screen and respects motion preferences. */
export function CoachBuddy({ mood = "ready" }: { mood?: BuddyMood }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState !== "background");
  const [focused, setFocused] = useState(false);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  useEffect(() => {
    let mounted = true;
    const media = Platform.OS === "web" && typeof window !== "undefined"
      ? window.matchMedia?.("(prefers-reduced-motion: reduce)") : undefined;
    const onPreference = () => setReducedMotion(!!media?.matches);
    if (media) {
      onPreference();
      media.addEventListener?.("change", onPreference);
    } else {
      AccessibilityInfo.isReduceMotionEnabled().then((value) => {
        if (mounted) setReducedMotion(value);
      }).catch(() => {});
    }
    const accessibility = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    const state = AppState.addEventListener("change", (value) => setForeground(value === "active"));
    return () => {
      mounted = false;
      media?.removeEventListener?.("change", onPreference);
      accessibility.remove();
      state.remove();
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || !foreground || !focused) {
      progress.setValue(0);
      return;
    }
    const duration = mood === "thinking" || mood === "speaking" ? 650 : 1300;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => { loop.stop(); progress.setValue(0); };
  }, [focused, foreground, mood, progress, reducedMotion]);

  return <View style={styles.frame} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Animated.View testID="coach-buddy" style={{ transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
      { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] }) },
    ] }}>
      <Svg width={86} height={88} viewBox="0 0 100 100">
        <Ellipse cx="50" cy="90" rx="25" ry="4" fill="#C7E7D5" />
        <Path d="M50 28C27 23 15 41 20 62C24 80 40 88 50 88C65 88 81 77 82 59C83 38 72 26 50 28Z" fill="#2FAD77" />
        <Path d="M50 30C44 13 61 5 75 9C72 22 64 30 50 30Z" fill="#97DCAA" />
        <Path d="M50 30C48 19 37 11 27 13C27 23 36 31 50 30Z" fill="#65C88A" />
        <Path d="M31 63C19 59 15 64 12 70M72 62C81 52 85 52 89 55" stroke="#23935F" strokeWidth="5" strokeLinecap="round" />
        <Circle cx="38" cy="52" r="4" fill="#173B2C" />
        <Circle cx="63" cy="52" r="4" fill="#173B2C" />
        <Circle cx="39" cy="51" r="1.2" fill="white" />
        <Circle cx="64" cy="51" r="1.2" fill="white" />
        <Ellipse cx="30" cy="63" rx="6" ry="3" fill="#9FDEAD" />
        <Ellipse cx="71" cy="63" rx="6" ry="3" fill="#9FDEAD" />
        {mood === "speaking" ? <Ellipse cx="51" cy="66" rx="5" ry="6" fill="#173B2C" />
          : <Path d="M43 65Q51 74 60 65" fill="none" stroke="#173B2C" strokeWidth="3" strokeLinecap="round" />}
        <Path d="M87 18V26M83 22H91M10 33V39M7 36H13" stroke="#EABF57" strokeWidth="3" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({ frame: { width: 92, height: 92, alignItems: "center", justifyContent: "center" } });
