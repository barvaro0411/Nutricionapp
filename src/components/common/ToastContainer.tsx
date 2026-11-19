import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from "react-native";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react-native";
import { useToastStore, ToastType } from "@/stores/useToastStore";
import { colors } from "@/constants/colors";

const getToastConfig = (type: ToastType) => {
  switch (type) {
    case "success":
      return {
        icon: <CheckCircle2 size={20} color={colors.success} />,
        borderColor: colors.primary,
        badgeBg: colors.successLight,
        accentColor: colors.success,
      };
    case "error":
      return {
        icon: <AlertCircle size={20} color={colors.danger} />,
        borderColor: colors.danger,
        badgeBg: colors.dangerLight,
        accentColor: colors.danger,
      };
    case "warning":
      return {
        icon: <AlertTriangle size={20} color={colors.warning} />,
        borderColor: colors.warning,
        badgeBg: colors.warningLight,
        accentColor: colors.warning,
      };
    case "info":
    default:
      return {
        icon: <Info size={20} color={colors.protein} />,
        borderColor: colors.protein,
        badgeBg: colors.proteinLight,
        accentColor: colors.protein,
      };
  }
};

export function ToastContainer() {
  const { currentToast, hideToast } = useToastStore();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const toastId = currentToast?.id;

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished && useToastStore.getState().currentToast?.id === toastId) hideToast();
    });
  }, [translateY, opacity, hideToast, toastId]);

  useEffect(() => {
    if (currentToast) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, currentToast.duration || 3000);

      return () => { clearTimeout(timer); translateY.stopAnimation(); opacity.stopAnimation(); };
    } else {
      translateY.setValue(-80);
      opacity.setValue(0);
    }
  }, [currentToast, handleDismiss, opacity, translateY]);

  if (!currentToast) return null;

  const config = getToastConfig(currentToast.type);

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toastCard,
          {
            borderColor: config.borderColor,
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <View style={[styles.iconBadge, { backgroundColor: config.badgeBg }]}>
          {config.icon}
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {currentToast.title}
          </Text>
          {currentToast.message ? (
            <Text style={styles.message} numberOfLines={2}>
              {currentToast.message}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <X size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: "absolute",
    top: Platform.OS === "web" ? 20 : 54,
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: "center",
  },
  toastCard: {
    maxWidth: 520,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 12.5,
    fontWeight: "400",
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
});
