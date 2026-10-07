import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Sparkles, ArrowRight, Bot } from "lucide-react-native";
import { colors } from "@/constants/colors";

interface SmartCoachCardProps {
  consumedCalories: number;
  goalCalories: number;
  remainingCalories: number;
  consumedProtein: number;
  goalProtein: number;
  remainingProtein: number;
  waterMl: number;
  targetWaterMl: number;
  mealCount: number;
  onAskCoach: (prompt: string) => void;
}

interface CoachInsight {
  tag: string;
  tagColor: string;
  tagBg: string;
  title: string;
  message: string;
  prompt: string;
}

export function SmartCoachCard({
  consumedCalories,
  goalCalories,
  remainingCalories,
  consumedProtein,
  goalProtein,
  remainingProtein,
  waterMl,
  targetWaterMl,
  mealCount,
  onAskCoach,
}: SmartCoachCardProps) {
  const currentHour = new Date().getHours();

  // Determinamos el insight más valioso de forma proactiva
  let insight: CoachInsight;

  if (mealCount === 0) {
    insight = {
      tag: "Inicio del Día",
      tagColor: "#059669",
      tagBg: "#ECFDF5",
      title: "Comienza tu día con buen balance",
      message:
        "Aún no registras comidas hoy. Un desayuno balanceado con proteína y fibra (huevos, avena o marraqueta con palta) te dará energía sostenida.",
      prompt: "¿Cuál es el desayuno ideal para mis metas calóricas de hoy?",
    };
  } else if (remainingCalories < -100) {
    insight = {
      tag: "Recuperación",
      tagColor: "#DC2626",
      tagBg: "#FEF2F2",
      title: "Superaste tu presupuesto calórico",
      message: `Te pasaste por ${Math.round(Math.abs(remainingCalories))} kcal. No te preocupes: la consistencia semanal manda. Bebe agua, haz una caminata ligera y mantén la calma.`,
      prompt: "¿Cómo balancear mis siguientes comidas tras superar las calorías?",
    };
  } else if (remainingCalories <= 350 && remainingCalories >= 0 && mealCount < 4) {
    insight = {
      tag: "Cena Ligera",
      tagColor: "#EA580C",
      tagBg: "#FFF7ED",
      title: "Presupuesto ajustado para la cena",
      message: `Te quedan ${Math.round(remainingCalories)} kcal disponibles. Te sugerimos una cena saciante de bajo aporte calórico: ensalada con atún o sopa de verduras.`,
      prompt: `Tengo solo ${Math.round(remainingCalories)} kcal restantes. ¿Qué cena chilena ligera y saciante me recomiendas?`,
    };
  } else if (consumedProtein < goalProtein * 0.45 && currentHour >= 13) {
    const diff = Math.max(0, Math.round(remainingProtein));
    insight = {
      tag: "Proteína",
      tagColor: "#D97706",
      tagBg: "#FEF3C7",
      title: "Atención a tu meta de proteína",
      message: `Llevas ${Math.round(consumedProtein)}g de los ${Math.round(goalProtein)}g objetivo (faltan ${diff}g). Una porción de pechuga, atún o 2 huevos te ayudarán a completarla.`,
      prompt: `Me faltan ${diff}g de proteína hoy. ¿Qué alimentos rápidos me recomiendas comer?`,
    };
  } else if (waterMl < targetWaterMl * 0.4 && currentHour >= 14) {
    insight = {
      tag: "Hidratación",
      tagColor: "#0284C7",
      tagBg: "#F0F9FF",
      title: "Hidratación pendiente",
      message: `Llevas ${waterMl} ml de tu meta de ${targetWaterMl} ml. La deshidratación reduce tu energía y causa falsa sensación de hambre. ¡Toma un vaso ahora!`,
      prompt: "¿Cuánta agua debería beber diariamente y qué beneficios tiene para mi objetivo?",
    };
  } else {
    insight = {
      tag: "Ritmo Óptimo",
      tagColor: "#10B981",
      tagBg: "#ECFDF5",
      title: "¡Vas con excelente balance hoy!",
      message: `Llevas ${Math.round(consumedCalories)} de ${Math.round(goalCalories)} kcal y ${Math.round(consumedProtein)}g de proteína. Continúa así para cerrar tu día en verde.`,
      prompt: "¿Cómo evaluarías mis comidas de hoy y qué snack ligero me recomiendas?",
    };
  }

  return (
    <View style={styles.card}>
      {/* Header del Card */}
      <View style={styles.headerRow}>
        <View style={styles.aiTag}>
          <Bot size={14} color={colors.primary} />
          <Text style={styles.aiTagText}>Coach IA Proactivo</Text>
        </View>

        <View style={[styles.categoryTag, { backgroundColor: insight.tagBg }]}>
          <Text style={[styles.categoryTagText, { color: insight.tagColor }]}>
            {insight.tag}
          </Text>
        </View>
      </View>

      {/* Contenido del Consejo */}
      <Text style={styles.title}>{insight.title}</Text>
      <Text style={styles.message}>{insight.message}</Text>

      {/* Botón de Acción a Coach */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => onAskCoach(insight.prompt)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Preguntar al coach: ${insight.prompt}`}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
          <Sparkles size={15} color="#FFFFFF" />
          <Text style={styles.actionBtnText} numberOfLines={1}>
            Preguntarle al Coach
          </Text>
        </View>
        <ArrowRight size={15} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  categoryTag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
