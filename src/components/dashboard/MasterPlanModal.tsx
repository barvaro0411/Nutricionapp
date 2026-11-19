import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Droplets,
  Dumbbell,
  Flame,
  Pencil,
  Pill,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react-native";
import { colors } from "@/constants/colors";
import {
  useChecklistHistory,
  usePersonalPlan,
  useSavePersonalPlan,
  useToggleChecklistItem,
} from "@/hooks/usePersonalPlan";
import { showToast } from "@/utils/alerts";
import { getDateKey, getWeekday } from "@/utils/dates";
import {
  formatWeekdaysLabel,
  getMatchDayWeekdays,
  isConfiguredMatchDay,
  isHabitChecked,
  normalizeHabitKey,
  WEEKDAY_OPTIONS,
} from "@/utils/personalPlan";

interface MasterPlanModalProps {
  visible: boolean;
  selectedDate?: Date;
  onClose: () => void;
  onOpenBuilder?: () => void;
}

export function MasterPlanModal({
  visible,
  selectedDate = new Date(),
  onClose,
  onOpenBuilder,
}: MasterPlanModalProps) {
  const { data: plan, isLoading, error } = usePersonalPlan();
  const { checkedItemsForDay, adherence, dateKey } = useChecklistHistory(7, selectedDate);
  const toggleMutation = useToggleChecklistItem(dateKey);
  const savePlanMutation = useSavePersonalPlan();

  const [activeTab, setActiveTab] = useState<"nutricion" | "rutina" | "habitos">("nutricion");
  const [expandedDay, setExpandedDay] = useState<string>("Lunes");
  const [newHabitText, setNewHabitText] = useState("");

  if (!plan) {
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.emptyContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {isLoading ? "Cargando plan..." : error ? error.message : "Aún no tienes Plan Maestro"}
              </Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            {!isLoading && !error && (
              <View style={styles.emptyBody}>
                <Text style={styles.emptyDesc}>
                  Crea un plan con IA o plantilla personalizada para organizar tus días de carga, comidas y checklist diario.
                </Text>
                {onOpenBuilder && (
                  <TouchableOpacity style={styles.emptyCreateBtn} onPress={onOpenBuilder}>
                    <Sparkles size={16} color="#FFFFFF" />
                    <Text style={styles.emptyCreateBtnText}>Crear mi Plan Maestro</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  const weekday = getWeekday(selectedDate);
  const matchWeekdays = getMatchDayWeekdays(plan);
  const isMatchDay = isConfiguredMatchDay(plan, weekday);
  const checklist = plan.dailyChecklist ?? [];

  const handleAddHabit = async () => {
    const trimmed = newHabitText.trim();
    if (trimmed.length < 2) return;
    if (checklist.some((item) => normalizeHabitKey(item) === normalizeHabitKey(trimmed))) {
      setNewHabitText("");
      return;
    }
    try {
      await savePlanMutation.mutateAsync({
        plan: {
          ...plan,
          dailyChecklist: [...checklist, trimmed].slice(0, 25),
        },
        syncGoals: false,
      });
      setNewHabitText("");
    } catch (err: any) {
      showToast({
        type: "error",
        title: "No se pudo agregar el hábito",
        message: err?.message,
      });
    }
  };

  const handleDeleteHabit = async (habitToRemove: string) => {
    try {
      await savePlanMutation.mutateAsync({
        plan: {
          ...plan,
          dailyChecklist: checklist.filter((item) => item !== habitToRemove),
        },
        syncGoals: false,
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "No se pudo quitar el hábito",
        message: err?.message,
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.badgeRow}>
                <View style={styles.planBadge}>
                  <Target size={13} color={colors.primary} />
                  <Text style={styles.planBadgeText}>PLAN MAESTRO ACTIVO</Text>
                </View>
                <View
                  style={[
                    styles.dayModeBadge,
                    isMatchDay ? styles.dayModeMatch : styles.dayModeStandard,
                  ]}
                >
                  {isMatchDay && <Zap size={11} color="#B45309" />}
                  <Text
                    style={[
                      styles.dayModeText,
                      isMatchDay ? styles.dayModeTextMatch : styles.dayModeTextStandard,
                    ]}
                  >
                    {isMatchDay ? "Día de carga" : "Día estándar"}
                  </Text>
                </View>
              </View>
              <Text style={styles.title}>Mi plan personal</Text>
              <Text style={styles.subtitle}>{plan.user.objectiveTitle}</Text>
            </View>

            <View style={styles.headerActions}>
              {onOpenBuilder && (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={onOpenBuilder}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Editar o regenerar plan"
                >
                  <Pencil size={15} color={colors.primaryDark} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "nutricion" && styles.tabBtnActive]}
              onPress={() => setActiveTab("nutricion")}
            >
              <Clock size={16} color={activeTab === "nutricion" ? colors.primaryDark : colors.textMuted} />
              <Text style={[styles.tabText, activeTab === "nutricion" && styles.tabTextActive]}>
                Nutrición
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "rutina" && styles.tabBtnActive]}
              onPress={() => setActiveTab("rutina")}
            >
              <Dumbbell size={16} color={activeTab === "rutina" ? colors.primaryDark : colors.textMuted} />
              <Text style={[styles.tabText, activeTab === "rutina" && styles.tabTextActive]}>
                Rutina
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "habitos" && styles.tabBtnActive]}
              onPress={() => setActiveTab("habitos")}
            >
              <CheckCircle2 size={16} color={activeTab === "habitos" ? colors.primaryDark : colors.textMuted} />
              <Text style={[styles.tabText, activeTab === "habitos" && styles.tabTextActive]}>
                Checklist ({adherence.today.completedCount}/{adherence.today.totalItems})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            <View style={styles.inbodyCard}>
              <Text style={styles.inbodyHeader}>PERFIL Y METAS DEL PLAN</Text>
              <View style={styles.inbodyGrid}>
                <View style={styles.inbodyItem}>
                  <Text style={styles.inbodyValue}>{plan.user.heightCm} cm</Text>
                  <Text style={styles.inbodyLabel}>Estatura</Text>
                </View>
                <View style={styles.inbodyItem}>
                  <Text style={styles.inbodyValue}>{plan.user.currentWeightKg} kg</Text>
                  <Text style={styles.inbodyLabel}>Peso inicial</Text>
                </View>
                <View style={styles.inbodyItem}>
                  <Text style={styles.inbodyValue}>{plan.user.targetWeightKg} kg</Text>
                  <Text style={styles.inbodyLabel}>Peso meta</Text>
                </View>
                {typeof plan.user.bodyFatPct === "number" && (
                  <View style={styles.inbodyItem}>
                    <Text style={[styles.inbodyValue, { color: colors.primaryDark }]}>
                      {plan.user.bodyFatPct}%
                    </Text>
                    <Text style={styles.inbodyLabel}>
                      Grasa{plan.user.targetFatPct ? ` (${plan.user.targetFatPct})` : ""}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.inbodyPills}>
                {typeof plan.user.bmrKcal === "number" && (
                  <Text style={styles.inbodyPill}>TMB: {plan.user.bmrKcal} kcal</Text>
                )}
                {typeof plan.user.skeletalMuscleKg === "number" && (
                  <Text style={styles.inbodyPill}>MME: {plan.user.skeletalMuscleKg} kg</Text>
                )}
                {!!plan.user.weeklyPaceKg && (
                  <Text style={styles.inbodyPill}>Ritmo: {plan.user.weeklyPaceKg}</Text>
                )}
              </View>
            </View>

            {activeTab === "nutricion" && (
              <>
                <Text style={styles.sectionTitle}>Ciclado de Calorías y Macronutrientes</Text>

                <View
                  style={[
                    styles.cyclingCard,
                    !isMatchDay && styles.cyclingCardActiveHighlight,
                  ]}
                >
                  <View style={styles.cyclingHeader}>
                    <Flame size={16} color={colors.primary} />
                    <Text style={styles.cyclingTitle}>
                      Días estándar ({plan.dailyGoals.standard.days})
                    </Text>
                    <View style={styles.calBadge}>
                      <Text style={styles.calBadgeText}>{plan.dailyGoals.standard.calories} kcal</Text>
                    </View>
                  </View>
                  <Text style={styles.cyclingSubtitle}>Rango: {plan.dailyGoals.standard.caloriesRange}</Text>
                  <View style={styles.macrosRow}>
                    <Text style={styles.macroTag}>{plan.dailyGoals.standard.proteinG}g P</Text>
                    <Text style={styles.macroTag}>{plan.dailyGoals.standard.carbsG}g C</Text>
                    <Text style={styles.macroTag}>{plan.dailyGoals.standard.fatG}g G</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.cyclingCard,
                    { borderColor: "#FCD34D", backgroundColor: "#FFFBEB" },
                    isMatchDay && styles.matchCardActiveHighlight,
                  ]}
                >
                  <View style={styles.cyclingHeader}>
                    <Zap size={16} color="#D97706" />
                    <Text style={[styles.cyclingTitle, { color: "#92400E" }]}>
                      Días de carga ({formatWeekdaysLabel(matchWeekdays)})
                    </Text>
                    <View style={[styles.calBadge, { backgroundColor: "#FEF3C7" }]}>
                      <Text style={[styles.calBadgeText, { color: "#B45309" }]}>
                        {plan.dailyGoals.matchDay.calories} kcal
                      </Text>
                    </View>
                  </View>
                  <View style={styles.weekdayStrip}>
                    {WEEKDAY_OPTIONS.map((opt) => {
                      const active = matchWeekdays.includes(opt.value);
                      return (
                        <View
                          key={opt.value}
                          style={[styles.weekdayDot, active && styles.weekdayDotActive]}
                        >
                          <Text
                            style={[
                              styles.weekdayDotText,
                              active && styles.weekdayDotTextActive,
                            ]}
                          >
                            {opt.short}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={[styles.cyclingSubtitle, { color: "#B45309" }]}>
                    {plan.dailyGoals.matchDay.focus}
                  </Text>
                  <View style={styles.macrosRow}>
                    <Text style={styles.macroTag}>{plan.dailyGoals.matchDay.proteinG}g P</Text>
                    <Text style={[styles.macroTag, { color: "#D97706", fontWeight: "700" }]}>
                      {plan.dailyGoals.matchDay.carbsG}g Carbos
                    </Text>
                    <Text style={styles.macroTag}>{plan.dailyGoals.matchDay.fatG}g G</Text>
                  </View>
                </View>

                <View style={styles.waterBox}>
                  <Droplets size={20} color={colors.water} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.waterBoxTitle}>
                      Meta de Agua: {plan.dailyGoals.waterRangeL} / día
                    </Text>
                    <Text style={styles.waterBoxDesc}>
                      Base recomendada de {plan.dailyGoals.waterMl} ml; aumenta en días de calor o entrenamiento intenso.
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Horarios y Distribución de Comidas</Text>
                <View style={styles.mealList}>
                  {plan.mealSchedule.map((meal, idx) => (
                    <View key={idx} style={styles.mealScheduleItem}>
                      <View style={styles.mealTimeCol}>
                        <Text style={styles.mealTimeText}>{meal.time}</Text>
                        <Text style={styles.mealKcalText}>{meal.energyKcal} kcal</Text>
                      </View>
                      <View style={styles.mealDetailCol}>
                        <View style={styles.mealBlockRow}>
                          <Text style={styles.mealBlockTitle}>{meal.block}</Text>
                          <Text style={styles.mealProteinBadge}>{meal.proteinG}</Text>
                        </View>
                        <Text style={styles.mealDetailText}>{meal.detail}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {activeTab === "rutina" && (
              <>
                <Text style={styles.sectionTitle}>Estructura Semanal de Entrenamiento</Text>
                {plan.weeklyRoutine.map((item, idx) => {
                  const isExpanded = expandedDay === item.day;
                  return (
                    <View key={idx} style={styles.routineDayCard}>
                      <TouchableOpacity
                        style={styles.routineDayHeader}
                        onPress={() => setExpandedDay(isExpanded ? "" : item.day)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={styles.routineDayName}>{item.day}</Text>
                            <View style={styles.rirBadge}>
                              <Text style={styles.rirBadgeText}>{item.intensity}</Text>
                            </View>
                          </View>
                          <Text style={styles.routineActivityText}>{item.activity}</Text>
                          <Text style={styles.routineGoalText}>{item.goal}</Text>
                        </View>
                        {item.exercises &&
                          (isExpanded ? (
                            <ChevronUp size={20} color={colors.textMuted} />
                          ) : (
                            <ChevronDown size={20} color={colors.textMuted} />
                          ))}
                      </TouchableOpacity>

                      {isExpanded && item.exercises && (
                        <View style={styles.exerciseList}>
                          <View style={styles.exerciseListHeader}>
                            <Text style={[styles.exerciseColH, { flex: 2 }]}>Ejercicio</Text>
                            <Text style={[styles.exerciseColH, { width: 70, textAlign: "center" }]}>
                              Series x Reps
                            </Text>
                            <Text style={[styles.exerciseColH, { width: 45, textAlign: "center" }]}>
                              RIR
                            </Text>
                            <Text style={[styles.exerciseColH, { width: 65, textAlign: "right" }]}>
                              Descanso
                            </Text>
                          </View>
                          {item.exercises.map((ex, exIdx) => (
                            <View key={exIdx} style={styles.exerciseRow}>
                              <Text style={[styles.exerciseName, { flex: 2 }]}>{ex.name}</Text>
                              <Text style={[styles.exerciseSets, { width: 70, textAlign: "center" }]}>
                                {ex.setsReps}
                              </Text>
                              <Text style={[styles.exerciseRir, { width: 45, textAlign: "center" }]}>
                                {ex.rir}
                              </Text>
                              <Text style={[styles.exerciseRest, { width: 65, textAlign: "right" }]}>
                                {ex.rest}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            {activeTab === "habitos" && (
              <>
                <View style={styles.adherenceCard}>
                  <View style={styles.adherenceHeader}>
                    <Text style={styles.adherenceTitle}>Adherencia últimos 7 días</Text>
                    <Text style={styles.adherencePct}>{adherence.weeklyAveragePct}% promedio</Text>
                  </View>
                  <View style={styles.adherenceStrip}>
                    {adherence.days.map((day) => {
                      const d = new Date(`${day.dateKey}T12:00:00Z`);
                      const weekdayOpt = WEEKDAY_OPTIONS.find((w) => w.value === d.getUTCDay());
                      const isCurrentDay = day.dateKey === dateKey;
                      const done = day.totalItems > 0 && day.pct >= 80;
                      const partial = day.totalItems > 0 && day.pct > 0 && day.pct < 80;
                      return (
                        <View
                          key={day.dateKey}
                          style={[styles.adherenceDay, isCurrentDay && styles.adherenceDayCurrent]}
                        >
                          <View
                            style={[
                              styles.adherenceBubble,
                              done && styles.adherenceBubbleDone,
                              partial && styles.adherenceBubblePartial,
                            ]}
                          >
                            <Text
                              style={[
                                styles.adherenceBubbleText,
                                done && styles.adherenceBubbleTextDone,
                              ]}
                            >
                              {day.totalItems > 0 ? `${day.pct}%` : "-"}
                            </Text>
                          </View>
                          <Text style={styles.adherenceDayLabel}>{weekdayOpt?.short ?? ""}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <Text style={styles.sectionTitle}>
                  Checklist del {dateKey === getDateKey(new Date()) ? "día de hoy" : dateKey}
                </Text>

                <View style={styles.checklistCard}>
                  {checklist.map((habit, idx) => {
                    const isChecked = isHabitChecked(checkedItemsForDay, habit);
                    return (
                      <View key={`${habit}-${idx}`} style={styles.habitRow}>
                        <TouchableOpacity
                          style={styles.habitToggleArea}
                          onPress={() =>
                            toggleMutation.mutate({
                              habit,
                              checklist,
                              currentChecked: checkedItemsForDay,
                            })
                          }
                          disabled={toggleMutation.isPending}
                          activeOpacity={0.7}
                        >
                          {isChecked ? (
                            <CheckCircle2 size={22} color={colors.primary} />
                          ) : (
                            <Circle size={22} color={colors.textMuted} />
                          )}
                          <Text style={[styles.habitText, isChecked && styles.habitTextChecked]}>
                            {habit}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteHabit(habit)}
                          disabled={savePlanMutation.isPending}
                          hitSlop={8}
                        >
                          <Trash2 size={15} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  <View style={styles.inlineAddRow}>
                    <TextInput
                      style={styles.inlineAddInput}
                      value={newHabitText}
                      onChangeText={setNewHabitText}
                      placeholder="Nuevo hábito diario..."
                      placeholderTextColor={colors.textMuted}
                      maxLength={140}
                    />
                    <TouchableOpacity
                      style={styles.inlineAddBtn}
                      onPress={handleAddHabit}
                      disabled={savePlanMutation.isPending}
                    >
                      <Plus size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                {plan.supplements.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Suplementación del Plan</Text>
                    <View style={styles.supplementsList}>
                      {plan.supplements.map((sup, idx) => (
                        <View key={idx} style={styles.supplementCard}>
                          <View style={styles.supIconBadge}>
                            <Pill size={18} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.supName}>{sup.name}</Text>
                            <Text style={styles.supDose}>Dosis: {sup.dose}</Text>
                            <Text style={styles.supTiming}>{sup.timing}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  emptyContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingBottom: 28,
  },
  emptyBody: {
    padding: 20,
    gap: 14,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  emptyCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
  },
  emptyCreateBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    minHeight: "78%",
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  dayModeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dayModeStandard: {
    backgroundColor: colors.surfaceMuted,
  },
  dayModeMatch: {
    backgroundColor: colors.warningLight,
  },
  dayModeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  dayModeTextStandard: {
    color: colors.textSecondary,
  },
  dayModeTextMatch: {
    color: "#92400E",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inbodyCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
  },
  inbodyHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  inbodyGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  inbodyItem: {
    alignItems: "center",
  },
  inbodyValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  inbodyLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  inbodyPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 10,
  },
  inbodyPill: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
    marginTop: 4,
  },
  cyclingCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  cyclingCardActiveHighlight: {
    borderColor: colors.primary,
  },
  matchCardActiveHighlight: {
    borderWidth: 2,
    borderColor: "#D97706",
  },
  cyclingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cyclingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    marginLeft: 8,
  },
  calBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  calBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  cyclingSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  weekdayStrip: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    marginBottom: 8,
  },
  weekdayDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  weekdayDotActive: {
    backgroundColor: "#D97706",
    borderColor: "#D97706",
  },
  weekdayDotText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400E",
  },
  weekdayDotTextActive: {
    color: "#FFFFFF",
  },
  macrosRow: {
    flexDirection: "row",
    gap: 12,
  },
  macroTag: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  waterBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.waterLight,
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
  },
  waterBoxTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.water,
  },
  waterBoxDesc: {
    fontSize: 11,
    color: "#0369A1",
    marginTop: 2,
  },
  mealList: {
    gap: 10,
  },
  mealScheduleItem: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 14,
  },
  mealTimeCol: {
    width: 65,
    borderRightWidth: 1,
    borderRightColor: colors.cardBorder,
    paddingRight: 10,
    justifyContent: "center",
  },
  mealTimeText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  mealKcalText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 2,
  },
  mealDetailCol: {
    flex: 1,
  },
  mealBlockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  mealBlockTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  mealProteinBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mealDetailText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  routineDayCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 10,
    overflow: "hidden",
  },
  routineDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  routineDayName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  rirBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rirBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  routineActivityText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
    marginTop: 2,
  },
  routineGoalText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exerciseList: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.background,
    padding: 12,
  },
  exerciseListHeader: {
    flexDirection: "row",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    marginBottom: 6,
  },
  exerciseColH: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  exerciseName: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  exerciseSets: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  exerciseRir: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  exerciseRest: {
    fontSize: 11,
    color: colors.textMuted,
  },
  adherenceCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
    gap: 10,
  },
  adherenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  adherenceTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  adherencePct: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  adherenceStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  adherenceDay: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    borderRadius: 10,
  },
  adherenceDayCurrent: {
    backgroundColor: colors.primaryGhost,
  },
  adherenceBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  adherenceBubbleDone: {
    backgroundColor: colors.primary,
  },
  adherenceBubblePartial: {
    backgroundColor: colors.primaryLight,
  },
  adherenceBubbleText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  adherenceBubbleTextDone: {
    color: "#FFFFFF",
  },
  adherenceDayLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
  },
  checklistCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
    gap: 12,
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  habitToggleArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  habitText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
    lineHeight: 18,
  },
  habitTextChecked: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  inlineAddRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 10,
  },
  inlineAddInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.text,
  },
  inlineAddBtn: {
    width: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  supplementsList: {
    gap: 10,
  },
  supplementCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  supIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  supName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  supDose: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
    marginTop: 1,
  },
  supTiming: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
