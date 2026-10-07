import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { Flame, Trophy, Calendar, Check, X, Sparkles } from "lucide-react-native";
import { useUserStreak } from "@/hooks/useUserStreak";
import { colors } from "@/constants/colors";

interface StreakModalProps {
  visible: boolean;
  onClose: () => void;
  onLogMealPress: () => void;
}

export function StreakModal({
  visible,
  onClose,
  onLogMealPress,
}: StreakModalProps) {
  const { data } = useUserStreak();
  const currentStreak = data?.currentStreak ?? 0;
  const bestStreak = data?.bestStreak ?? 0;
  const hasLoggedToday = data?.hasLoggedToday ?? false;
  const last7Days = data?.last7Days ?? [];

  // Próximo hito de racha (3, 7, 14, 30, 60, 100)
  const milestones = [3, 7, 14, 30, 60, 100];
  const nextMilestone =
    milestones.find((m) => m > currentStreak) || (currentStreak + 10);
  const milestoneProgress = Math.min(
    1,
    currentStreak / nextMilestone
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header con botón de cierre */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Racha de Hábitos</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal de racha"
            >
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Hero de Racha */}
          <View style={styles.heroWrap}>
            <View style={styles.heroFlameCircle}>
              <Flame
                size={48}
                color="#EA580C"
                fill={hasLoggedToday || currentStreak > 0 ? "#EA580C" : "none"}
              />
            </View>
            <Text style={styles.heroCountText}>
              {currentStreak}{" "}
              <Text style={styles.heroCountUnit}>
                {currentStreak === 1 ? "día" : "días"}
              </Text>
            </Text>
            <Text style={styles.heroStatusText}>
              {hasLoggedToday
                ? "¡Día completado! Tu racha está a salvo hoy 🎉"
                : currentStreak > 0
                ? "¡Registra una comida hoy para no perder tu racha!"
                : "¡Registra tu primera comida para encender la llama!"}
            </Text>
          </View>

          {/* Badge de Mejor Racha */}
          <View style={styles.recordRow}>
            <View style={styles.recordPill}>
              <Trophy size={14} color="#D97706" />
              <Text style={styles.recordText}>
                Mejor racha: <Text style={styles.recordBold}>{bestStreak} {bestStreak === 1 ? "día" : "días"}</Text>
              </Text>
            </View>
          </View>

          {/* Barra de 7 días */}
          <View style={styles.weekContainer}>
            <View style={styles.weekHeader}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={styles.weekHeaderText}>Últimos 7 días</Text>
            </View>
            <View style={styles.daysRow}>
              {last7Days.map((d, index) => {
                const dayNumber = d.date.split("-")[2];
                return (
                  <View key={index} style={styles.dayCol}>
                    <Text
                      style={[
                        styles.dayLabel,
                        d.isToday && styles.dayLabelToday,
                      ]}
                    >
                      {d.dayLabel}
                    </Text>
                    <View
                      style={[
                        styles.dayCircle,
                        d.hasLogged
                          ? styles.dayCircleLogged
                          : d.isToday
                          ? styles.dayCircleToday
                          : styles.dayCircleEmpty,
                      ]}
                    >
                      {d.hasLogged ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        <Text
                          style={[
                            styles.dayNumberText,
                            d.isToday && styles.dayNumberTextToday,
                          ]}
                        >
                          {dayNumber}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Próximo Logro / Progreso */}
          <View style={styles.milestoneCard}>
            <View style={styles.milestoneHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Sparkles size={15} color="#4F46E5" />
                <Text style={styles.milestoneTitle}>
                  Próxima meta: {nextMilestone} días seguidos
                </Text>
              </View>
              <Text style={styles.milestoneRatio}>
                {currentStreak}/{nextMilestone}
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.round(milestoneProgress * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.milestoneTip}>
              {currentStreak >= nextMilestone
                ? "¡Completaste esta meta! Tu constancia es inspiradora."
                : `Faltan ${nextMilestone - currentStreak} ${
                    nextMilestone - currentStreak === 1 ? "día" : "días"
                  } para tu siguiente logro.`}
            </Text>
          </View>

          {/* Acciones */}
          <View style={styles.actionsRow}>
            {!hasLoggedToday && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  onClose();
                  onLogMealPress();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Registrar Comida Ahora</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                hasLoggedToday && styles.secondaryBtnFull,
              ]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>
                {hasLoggedToday ? "¡Genial, entendido!" : "Cerrar"}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  heroWrap: {
    alignItems: "center",
    paddingVertical: 10,
  },
  heroFlameCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF7ED",
    borderWidth: 2,
    borderColor: "#FDBA74",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroCountText: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  heroCountUnit: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  heroStatusText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  recordRow: {
    alignItems: "center",
    marginVertical: 10,
  },
  recordPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  recordText: {
    fontSize: 12,
    color: "#92400E",
  },
  recordBold: {
    fontWeight: "700",
  },
  weekContainer: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    marginBottom: 14,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  weekHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayCol: {
    alignItems: "center",
    gap: 6,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
  dayLabelToday: {
    color: colors.primary,
    fontWeight: "700",
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleLogged: {
    backgroundColor: "#EA580C",
  },
  dayCircleToday: {
    backgroundColor: "#FFF7ED",
    borderWidth: 2,
    borderColor: "#EA580C",
  },
  dayCircleEmpty: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dayNumberText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },
  dayNumberTextToday: {
    color: "#EA580C",
    fontWeight: "700",
  },
  milestoneCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    marginBottom: 18,
  },
  milestoneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  milestoneTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3730A3",
  },
  milestoneRatio: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C7D2FE",
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 3,
  },
  milestoneTip: {
    fontSize: 11,
    color: "#4338CA",
    lineHeight: 15,
  },
  actionsRow: {
    flexDirection: "column",
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnFull: {
    backgroundColor: colors.primary,
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
});
