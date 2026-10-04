import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  X,
  Target,
  Dumbbell,
  Clock,
  Pill,
  CheckCircle2,
  Circle,
  Flame,
  Droplets,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { usePersonalPlan } from "@/hooks/usePersonalPlan";
import { colors } from "@/constants/colors";

interface MasterPlanModalProps {
  visible: boolean;
  onClose: () => void;
}

export function MasterPlanModal({ visible, onClose }: MasterPlanModalProps) {
  const { data: plan, isLoading, error } = usePersonalPlan();
  const [activeTab, setActiveTab] = useState<"nutricion" | "rutina" | "habitos">("nutricion");
  const [checkedHabits, setCheckedHabits] = useState<Record<number, boolean>>({});
  const [expandedDay, setExpandedDay] = useState<string>("Lunes");

  const toggleHabit = (index: number) => {
    setCheckedHabits((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  if (!plan) return <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.overlay}><View style={styles.container}>
      <Text style={styles.title}>{isLoading ? "Cargando plan…" : error ? error.message : "No tienes un plan personal asignado."}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={onClose}><Text style={styles.cyclingTitle}>Cerrar</Text></TouchableOpacity>
    </View></View>
  </Modal>;
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.planBadge}>
                <Target size={14} color={colors.primary} />
                <Text style={styles.planBadgeText}>PLAN MAESTRO ACTIVO</Text>
              </View>
              <Text style={styles.title}>Mi plan personal</Text>
              <Text style={styles.subtitle}>{plan.user.objectiveTitle}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Selector de Pestañas */}
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
                Rutina Gym
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "habitos" && styles.tabBtnActive]}
              onPress={() => setActiveTab("habitos")}
            >
              <CheckCircle2 size={16} color={activeTab === "habitos" ? colors.primaryDark : colors.textMuted} />
              <Text style={[styles.tabText, activeTab === "habitos" && styles.tabTextActive]}>
                Hábitos & Supl.
              </Text>
            </TouchableOpacity>
          </View>

          {/* Contenido scrolleable */}
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* Tarjeta Resumen Antropométrico InBody siempre visible */}
            <View style={styles.inbodyCard}>
              <Text style={styles.inbodyHeader}>MEDICIONES INBODY / PUNTO DE PARTIDA</Text>
              <View style={styles.inbodyGrid}>
                <View style={styles.inbodyItem}>
                  <Text style={styles.inbodyValue}>{plan.user.heightCm} cm</Text>
                  <Text style={styles.inbodyLabel}>Estatura</Text>
                </View>
                <View style={styles.inbodyItem}>
                  <Text style={styles.inbodyValue}>{plan.user.currentWeightKg} kg</Text>
                  <Text style={styles.inbodyLabel}>Peso Actual</Text>
                </View>
                <View style={styles.inbodyItem}>
                  <Text style={[styles.inbodyValue, { color: colors.primaryDark }]}>{plan.user.bodyFatPct}%</Text>
                  <Text style={styles.inbodyLabel}>Grasa ({plan.user.targetFatPct} meta)</Text>
                </View>
                <View style={styles.inbodyItem}>
                  <Text style={styles.inbodyValue}>{plan.user.skeletalMuscleKg} kg</Text>
                  <Text style={styles.inbodyLabel}>MME (Músculo)</Text>
                </View>
              </View>
              <View style={styles.inbodyPills}>
                <Text style={styles.inbodyPill}>TMB: {plan.user.bmrKcal} kcal</Text>
                <Text style={styles.inbodyPill}>Peso orientativo: ~{plan.user.targetWeightKg} kg</Text>
                <Text style={styles.inbodyPill}>Ritmo: {plan.user.weeklyPaceKg}</Text>
              </View>
            </View>

            {/* PESTAÑA 1: NUTRICIÓN */}
            {activeTab === "nutricion" && (
              <>
                <Text style={styles.sectionTitle}>Ciclado de Calorías y Macronutrientes</Text>
                
                {/* Días Estándar L-S */}
                <View style={styles.cyclingCard}>
                  <View style={styles.cyclingHeader}>
                    <Flame size={16} color={colors.primary} />
                    <Text style={styles.cyclingTitle}>{plan.dailyGoals.standard.days}</Text>
                    <View style={styles.calBadge}>
                      <Text style={styles.calBadgeText}>{plan.dailyGoals.standard.calories} kcal</Text>
                    </View>
                  </View>
                  <Text style={styles.cyclingSubtitle}>Rango: {plan.dailyGoals.standard.caloriesRange}</Text>
                  <View style={styles.macrosRow}>
                    <Text style={styles.macroTag}>🥩 {plan.dailyGoals.standard.proteinG}g P</Text>
                    <Text style={styles.macroTag}>🍚 {plan.dailyGoals.standard.carbsG}g C</Text>
                    <Text style={styles.macroTag}>🥑 {plan.dailyGoals.standard.fatG}g G</Text>
                  </View>
                </View>

                {/* Domingo Fútbol / Carga */}
                <View style={[styles.cyclingCard, { borderColor: "#FCD34D", backgroundColor: "#FFFBEB" }]}>
                  <View style={styles.cyclingHeader}>
                    <Flame size={16} color="#D97706" />
                    <Text style={[styles.cyclingTitle, { color: "#92400E" }]}>{plan.dailyGoals.matchDay.days}</Text>
                    <View style={[styles.calBadge, { backgroundColor: "#FEF3C7" }]}>
                      <Text style={[styles.calBadgeText, { color: "#B45309" }]}>{plan.dailyGoals.matchDay.calories} kcal</Text>
                    </View>
                  </View>
                  <Text style={[styles.cyclingSubtitle, { color: "#B45309" }]}>{plan.dailyGoals.matchDay.focus}</Text>
                  <View style={styles.macrosRow}>
                    <Text style={styles.macroTag}>🥩 {plan.dailyGoals.matchDay.proteinG}g P</Text>
                    <Text style={[styles.macroTag, { color: "#D97706", fontWeight: "700" }]}>⚡ {plan.dailyGoals.matchDay.carbsG}g Carbos</Text>
                    <Text style={styles.macroTag}>🥑 {plan.dailyGoals.matchDay.fatG}g G</Text>
                  </View>
                </View>

                {/* Hidratación Deportiva */}
                <View style={styles.waterBox}>
                  <Droplets size={20} color={colors.water} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.waterBoxTitle}>Meta de Agua: {plan.dailyGoals.waterRangeL} / día</Text>
                    <Text style={styles.waterBoxDesc}>Base de 3.200 ml; aumentar en días de calor o sudoración alta en bicicleta y fútbol.</Text>
                  </View>
                </View>

                {/* Horarios de Comida */}
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

            {/* PESTAÑA 2: RUTINA DE GYM */}
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
                        {item.exercises && (
                          isExpanded ? <ChevronUp size={20} color={colors.textMuted} /> : <ChevronDown size={20} color={colors.textMuted} />
                        )}
                      </TouchableOpacity>

                      {isExpanded && item.exercises && (
                        <View style={styles.exerciseList}>
                          <View style={styles.exerciseListHeader}>
                            <Text style={[styles.exerciseColH, { flex: 2 }]}>Ejercicio</Text>
                            <Text style={[styles.exerciseColH, { width: 70, textAlign: "center" }]}>Series x Reps</Text>
                            <Text style={[styles.exerciseColH, { width: 45, textAlign: "center" }]}>RIR</Text>
                            <Text style={[styles.exerciseColH, { width: 65, textAlign: "right" }]}>Descanso</Text>
                          </View>
                          {item.exercises.map((ex, exIdx) => (
                            <View key={exIdx} style={styles.exerciseRow}>
                              <Text style={[styles.exerciseName, { flex: 2 }]}>{ex.name}</Text>
                              <Text style={[styles.exerciseSets, { width: 70, textAlign: "center" }]}>{ex.setsReps}</Text>
                              <Text style={[styles.exerciseRir, { width: 45, textAlign: "center" }]}>{ex.rir}</Text>
                              <Text style={[styles.exerciseRest, { width: 65, textAlign: "right" }]}>{ex.rest}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            {/* PESTAÑA 3: HÁBITOS & SUPLEMENTOS */}
            {activeTab === "habitos" && (
              <>
                <Text style={styles.sectionTitle}>Checklist Diario de Cumplimiento</Text>
                <View style={styles.checklistCard}>
                  {plan.dailyChecklist.map((habit, idx) => {
                    const isChecked = !!checkedHabits[idx];
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={styles.habitRow}
                        onPress={() => toggleHabit(idx)}
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
                    );
                  })}
                </View>

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
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    minHeight: "75%",
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
  },
  headerTitleWrap: {
    flex: 1,
    marginRight: 10,
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.5,
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
    gap: 6,
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
    marginBottom: 12,
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
