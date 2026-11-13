import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Sparkles, ArrowRight, Bot, Volume2, Square, CheckCircle2, Lightbulb } from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";
import { useCoachSpeech } from "@/hooks/useCoachSpeech";
import { buildDailyClosingSummary } from "@/utils/dailyClosingUtils";

interface SmartCoachCardProps {
  userName?: string | null;
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
  userName,
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
  const speech = useCoachSpeech();
  const [showClosing, setShowClosing] = useState(false);

  const closingSummary = useMemo(
    () =>
      buildDailyClosingSummary({
        userName,
        consumedCalories,
        goalCalories,
        consumedProtein,
        goalProtein,
        waterMl,
        targetWaterMl,
        mealCount,
      }),
    [
      userName,
      consumedCalories,
      goalCalories,
      consumedProtein,
      goalProtein,
      waterMl,
      targetWaterMl,
      mealCount,
    ]
  );

  const isSpeakingClosing = speech.speakingId === "daily-closing";

  const handleToggleClosingAudio = () => {
    if (!showClosing) {
      setShowClosing(true);
      if (speech.supported) {
        speech.toggle("daily-closing", closingSummary.spokenText);
      }
      return;
    }
    if (speech.supported) {
      speech.toggle("daily-closing", closingSummary.spokenText);
    }
  };

  const currentHour = new Date().getHours();
  const calPct = goalCalories > 0 ? (consumedCalories / goalCalories) * 100 : 0;
  const proteinPct = goalProtein > 0 ? (consumedProtein / goalProtein) * 100 : 0;

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
  } else if (calPct >= 60 && proteinPct <= 45) {
    const diff = Math.max(0, Math.round(remainingProtein));
    insight = {
      tag: "Desbalance de Macros",
      tagColor: "#B45309",
      tagBg: "#FEF3C7",
      title: "Pocas calorías y proteína pendiente",
      message: `Llevas el ${Math.round(calPct)}% de tus calorías pero solo el ${Math.round(proteinPct)}% de tu proteína (faltan ${diff}g). Prioriza fuentes proteicas magras como pechuga de pollo, claras, atún o yogur proteico.`,
      prompt: `Llevo el ${Math.round(calPct)}% de mis calorías pero me faltan ${diff}g de proteína. ¿Qué alimentos magros y saciantes me recomiendas para el resto del día?`,
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

      {/* Botones de Acción: Preguntar al Coach + Audio-Cierre del Día */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onAskCoach(insight.prompt)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Preguntar al coach: ${insight.prompt}`}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flex: 1 }}>
            <Sparkles size={15} color="#FFFFFF" />
            <Text style={styles.actionBtnText} numberOfLines={1}>
              Preguntarle al Coach
            </Text>
          </View>
          <ArrowRight size={15} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.audioCloseBtn,
            isSpeakingClosing && styles.audioCloseBtnActive,
          ]}
          onPress={handleToggleClosingAudio}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="¿Cómo estuvo mi día? Escuchar audio-cierre del día con el Coach IA"
        >
          {isSpeakingClosing ? (
            <Square size={15} color={colors.danger} />
          ) : (
            <Volume2 size={16} color={colors.primary} />
          )}
          <Text
            style={[
              styles.audioCloseBtnText,
              isSpeakingClosing && { color: colors.danger },
            ]}
          >
            {isSpeakingClosing ? "Detener voz" : "¿Cómo estuvo mi día?"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tarjeta expandible de Audio-Cierre del Día */}
      {showClosing && (
        <View style={styles.closingBox}>
          <View style={styles.closingHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.closingOverline}>
                🎙️ AUDIO-CIERRE DEL DÍA · COACH IA
              </Text>
              <Text style={styles.closingHeadline}>{closingSummary.headline}</Text>
            </View>
            <View style={styles.closingBadge}>
              <Text style={styles.closingBadgeText}>{closingSummary.badgeText}</Text>
            </View>
          </View>

          <View style={styles.closingPointRow}>
            <CheckCircle2 size={15} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={styles.closingPointText}>{closingSummary.achievement}</Text>
          </View>

          <View style={styles.closingPointRow}>
            <Lightbulb size={15} color="#D97706" style={{ marginTop: 2 }} />
            <Text style={styles.closingPointText}>{closingSummary.tomorrowTip}</Text>
          </View>

          <View style={styles.closingFooter}>
            {speech.supported && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  isSpeakingClosing ? "Detener narración" : "Escuchar resumen en voz alta"
                }
                onPress={() =>
                  speech.toggle("daily-closing", closingSummary.spokenText)
                }
                style={styles.listenAgainBtn}
              >
                {isSpeakingClosing ? (
                  <Square size={13} color={colors.danger} />
                ) : (
                  <Volume2 size={14} color={colors.primary} />
                )}
                <Text
                  style={[
                    styles.listenAgainText,
                    isSpeakingClosing && { color: colors.danger },
                  ]}
                >
                  {isSpeakingClosing ? "Escuchando…" : "Escuchar con voz"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Conversar mi cierre del día con el Coach IA"
              onPress={() => {
                speech.stop();
                onAskCoach(closingSummary.coachPrompt);
              }}
              style={styles.deepDiveBtn}
            >
              <Text style={styles.deepDiveText}>Profundizar con Coach ›</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  categoryTag: {
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    borderRadius: 10,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 15.5,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    minWidth: 170,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    ...shadows.glow,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  audioCloseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: colors.primaryGhost,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  audioCloseBtnActive: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
  },
  audioCloseBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  closingBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.primaryGhost,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 10,
  },
  closingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  closingOverline: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  closingHeadline: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  closingBadge: {
    backgroundColor: colors.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  closingBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  closingPointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  closingPointText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.text,
  },
  closingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  listenAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  listenAgainText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.primary,
  },
  deepDiveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  deepDiveText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark,
  },
});
