import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { Sparkles } from "lucide-react-native";
import { colors } from "@/constants/colors";

interface ScanningOverlayProps {
  stage: "compressing" | "uploading" | "analyzing" | null;
}

export function ScanningOverlay({ stage }: ScanningOverlayProps) {
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [analyzingStep, setAnalyzingStep] = useState(0);

  const stepMessages = [
    "🔍 Reconociendo alimentos chilenos...",
    "⚖️ Estimando porciones y gramos...",
    "📊 Calculando calorías y macros...",
    "✨ Afinando detalles nutricionales...",
  ];

  useEffect(() => {
    // Animación continua del láser de escaneo vertical
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    scanLoop.start();

    // Animación de pulso del icono
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Barra de progreso estimada
    Animated.timing(progressAnim, {
      toValue: 0.92,
      duration: 3800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Rotación de mensajes dinámicos durante el análisis
    const stepInterval = setInterval(() => {
      setAnalyzingStep((prev) => (prev + 1) % stepMessages.length);
    }, 1100);

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
      clearInterval(stepInterval);
    };
  }, [progressAnim, pulseAnim, scanLineAnim, stepMessages.length]);

  const getStageTitle = () => {
    if (stage === "compressing") return "⚡ Optimizando foto...";
    if (stage === "uploading") return "☁️ Transfiriendo imagen...";
    return stepMessages[analyzingStep];
  };

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 270], // Recorrido del escáner sobre la imagen
  });

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["10%", "100%"],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Velo translúcido tecnológico */}
      <View style={styles.scrim} />

      {/* Retículas en las cuatro esquinas (HUD de Visor de IA) */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      {/* Línea Láser Móvil de Escaneo */}
      <Animated.View
        style={[
          styles.laserLine,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.laserGlow} />
        <View style={styles.laserCore} />
      </Animated.View>

      {/* Tarjeta Flotante Inferior de Estado */}
      <View style={styles.hudCard}>
        <View style={styles.hudHeader}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Sparkles size={16} color={colors.primary} />
          </Animated.View>
          <Text style={styles.hudTitle}>IA VISION NUTRICIONAL</Text>
        </View>

        <Text style={styles.hudMessage}>{getStageTitle()}</Text>

        {/* Barra de progreso sutil */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: widthInterpolated }]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderRadius: 20,
    justifyContent: "space-between",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: 14,
    left: 14,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 14,
    right: 14,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 14,
    right: 14,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  laserLine: {
    position: "absolute",
    left: 14,
    right: 14,
    height: 24,
    justifyContent: "center",
  },
  laserGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 185, 129, 0.18)",
    borderRadius: 12,
  },
  laserCore: {
    height: 2.5,
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  hudCard: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  hudHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  hudTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 1,
  },
  hudMessage: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
