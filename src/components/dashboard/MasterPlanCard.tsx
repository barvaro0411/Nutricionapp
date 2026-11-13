import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Flame,
  Sparkles,
  Target,
  Zap,
} from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";
import type { MasterPlanData } from "@/data/masterPlan";
import { useChecklistHistory, useToggleChecklistItem } from "@/hooks/usePersonalPlan";
import { getDateKey, getWeekday } from "@/utils/dates";
import { isConfiguredMatchDay, isHabitChecked } from "@/utils/personalPlan";

interface MasterPlanCardProps {
  plan: MasterPlanData | null;
  selectedDate: Date;
  onOpenPlan: () => void;
  onOpenBuilder: () => void;
}

export function MasterPlanCard({
  plan,
  selectedDate,
  onOpenPlan,
  onOpenBuilder,
}: MasterPlanCardProps) {
  const dateKey = getDateKey(selectedDate);
  const { checkedItemsForDay, adherence } = useChecklistHistory(7, selectedDate);
  const toggleMutation = useToggleChecklistItem(dateKey);

  if (!plan) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyHeader}>
          <View style={styles.emptyBadge}>
            <Target size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emptyTitle}>Plan Maestro Personal</Text>
            <Text style={styles.emptyDesc}>
              Arma metas por día, horarios, rutina y un checklist diario guardado en tu cuenta.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={onOpenBuilder}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Crear mi Plan Maestro"
        >
          <Sparkles size={16} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Crear mi Plan Maestro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const weekday = getWeekday(selectedDate);
  const isMatchDay = isConfiguredMatchDay(plan, weekday);
  const checklist = plan.dailyChecklist ?? [];
  const quickHabits = checklist.slice(0, 3);
  const remainingHabitsCount = Math.max(0, checklist.length - quickHabits.length);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.topRow}
        onPress={onOpenPlan}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Abrir Plan Maestro: ${plan.user.objectiveTitle}`}
      >
        <View style={styles.planIconWrap}>
          <Target size={18} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Mi Plan Maestro</Text>
            <View
              style={[
                styles.modePill,
                isMatchDay ? styles.modePillMatch : styles.modePillStandard,
              ]}
            >
              {isMatchDay && <Zap size={10} color="#B45309" />}
              <Text
                style={[
                  styles.modePillText,
                  isMatchDay ? styles.modePillTextMatch : styles.modePillTextStandard,
                ]}
              >
                {isMatchDay ? "Día de carga" : "Día estándar"}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {plan.user.objectiveTitle}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.primary} />
      </TouchableOpacity>

      {checklist.length > 0 && (
        <View style={styles.checklistWrap}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              Checklist del día: {adherence.today.completedCount}/{adherence.today.totalItems} ({adherence.today.pct}%)
            </Text>
            <View style={styles.adherenceMeta}>
              <Text style={styles.weeklyText}>7d: {adherence.weeklyAveragePct}%</Text>
              {adherence.streakDays >= 2 && (
                <View style={styles.streakChip}>
                  <Flame size={11} color="#C2410C" />
                  <Text style={styles.streakChipText}>{adherence.streakDays}d</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.max(0, adherence.today.pct))}%` },
              ]}
            />
          </View>

          <View style={styles.quickHabitsList}>
            {quickHabits.map((habit, idx) => {
              const checked = isHabitChecked(checkedItemsForDay, habit);
              return (
                <TouchableOpacity
                  key={`${habit}-${idx}`}
                  style={styles.quickHabitRow}
                  activeOpacity={0.75}
                  disabled={toggleMutation.isPending}
                  onPress={() =>
                    toggleMutation.mutate({
                      habit,
                      checklist,
                      currentChecked: checkedItemsForDay,
                    })
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                >
                  {checked ? (
                    <CheckCircle2 size={18} color={colors.primary} />
                  ) : (
                    <Circle size={18} color={colors.textMuted} />
                  )}
                  <Text
                    style={[styles.quickHabitText, checked && styles.quickHabitTextChecked]}
                    numberOfLines={1}
                  >
                    {habit}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {remainingHabitsCount > 0 && (
            <TouchableOpacity onPress={onOpenPlan} activeOpacity={0.7}>
              <Text style={styles.moreLink}>
                +{remainingHabitsCount} hábito{remainingHabitsCount > 1 ? "s" : ""} más y rutina semanal →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
    marginBottom: 14,
    gap: 12,
  },
  emptyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 11,
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
    marginBottom: 14,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modePillStandard: {
    backgroundColor: colors.primaryLight,
  },
  modePillMatch: {
    backgroundColor: colors.warningLight,
  },
  modePillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  modePillTextStandard: {
    color: colors.primaryDark,
  },
  modePillTextMatch: {
    color: "#92400E",
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "500",
  },
  checklistWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 10,
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  adherenceMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  weeklyText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  streakChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  streakChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#C2410C",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  quickHabitsList: {
    gap: 6,
    marginTop: 2,
  },
  quickHabitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  quickHabitText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
  },
  quickHabitTextChecked: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  moreLink: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 2,
  },
});
