import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Sparkles, RefreshCw, X } from "lucide-react-native";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import { colors, shadows } from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function PwaUpdateBanner() {
  const insets = useSafeAreaInsets();
  const { updateAvailable, isUpdating, applyUpdate, dismissUpdate } = usePwaUpdate();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      setShouldRender(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setShouldRender(false);
      });
    }
  }, [updateAvailable, translateY, opacity]);

  if (Platform.OS !== "web" || !shouldRender) {
    return null;
  }

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          top: Math.max(insets.top, 12),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Sparkles size={18} color="#FFFFFF" />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Nueva versión disponible</Text>
          <Text style={styles.subtitle}>Toca para aplicar las últimas mejoras</Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Actualizar aplicación ahora"
          onPress={applyUpdate}
          disabled={isUpdating}
          style={styles.actionButton}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <RefreshCw size={13} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Actualizar</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Descartar aviso de actualización"
          onPress={dismissUpdate}
          style={styles.closeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 560,
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    ...shadows.card,
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
