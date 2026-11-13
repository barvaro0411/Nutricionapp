import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Href, useRouter } from "expo-router";
import {
  Check,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  X,
} from "lucide-react-native";
import { AiConsentModal } from "@/components/common/AiConsentModal";
import { colors } from "@/constants/colors";
import type { MasterPlanData } from "@/data/masterPlan";
import { useAiConsent } from "@/hooks/useAiConsent";
import { useDietaryPreferences } from "@/hooks/useDietaryPreferences";
import {
  useDeletePersonalPlan,
  useGeneratePersonalPlan,
  useSavePersonalPlan,
} from "@/hooks/usePersonalPlan";
import { buildLocalMasterPlanTemplate } from "@/services/personalPlanTemplate";
import { useAuthStore } from "@/stores/useAuthStore";
import { DIETARY_RESTRICTION_LABELS } from "@/types/profile";
import { showAlert, showToast } from "@/utils/alerts";
import {
  clampPlanInteger,
  formatWeekdaysLabel,
  getMatchDayWeekdays,
  WEEKDAY_OPTIONS,
} from "@/utils/personalPlan";

interface MasterPlanBuilderModalProps {
  visible: boolean;
  existingPlan: MasterPlanData | null;
  onClose: () => void;
  onSaved?: (plan: MasterPlanData) => void;
}

const FOCUS_PRESETS = [
  "Fuerza y composición corporal",
  "Bajar grasa manteniendo músculo",
  "Fútbol y deportes de equipo",
  "Running y resistencia",
];

const EQUIPMENT_OPTIONS: Array<{
  value: "gym" | "home_dumbbells" | "bodyweight";
  label: string;
}> = [
  { value: "gym", label: "Gimnasio" },
  { value: "home_dumbbells", label: "Mancuernas" },
  { value: "bodyweight", label: "Peso corporal" },
];

export function MasterPlanBuilderModal({
  visible,
  existingPlan,
  onClose,
  onSaved,
}: MasterPlanBuilderModalProps) {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { restrictions, customAllergies } = useDietaryPreferences();
  const aiConsent = useAiConsent();
  const generateMutation = useGeneratePersonalPlan();
  const saveMutation = useSavePersonalPlan();
  const deleteMutation = useDeletePersonalPlan();

  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [matchDayWeekdays, setMatchDayWeekdays] = useState<number[]>([]);
  const [trainingDays, setTrainingDays] = useState(4);
  const [trainingFocus, setTrainingFocus] = useState(FOCUS_PRESETS[0]);
  const [equipment, setEquipment] = useState<"gym" | "home_dumbbells" | "bodyweight">("gym");
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [targetWeightText, setTargetWeightText] = useState("");
  const [includeSupplements, setIncludeSupplements] = useState(true);
  const [customNotes, setCustomNotes] = useState("");
  const [syncGoals, setSyncGoals] = useState(true);
  const [consentVisible, setConsentVisible] = useState(false);

  const [draftPlan, setDraftPlan] = useState<MasterPlanData | null>(null);
  const [newHabitText, setNewHabitText] = useState("");

  useEffect(() => {
    if (!visible) return;
    const initialWeekdays = existingPlan ? getMatchDayWeekdays(existingPlan) : [];
    setMatchDayWeekdays(initialWeekdays);
    setTrainingDays(4);
    setMealsPerDay(existingPlan?.mealSchedule.length ? clampPlanInteger(existingPlan.mealSchedule.length, 3, 6) : 4);
    const weightRef =
      existingPlan?.user.targetWeightKg ??
      profile?.target_weight_kg ??
      profile?.current_weight_kg ??
      "";
    setTargetWeightText(weightRef ? String(weightRef) : "");
    setIncludeSupplements(existingPlan ? existingPlan.supplements.length > 0 : true);
    setCustomNotes("");
    setSyncGoals(true);
    setNewHabitText("");

    if (existingPlan) {
      setDraftPlan(existingPlan);
      setMode("manual");
    } else {
      setDraftPlan(null);
      setMode("ai");
    }
  }, [visible, existingPlan, profile]);

  const dietarySummary = useMemo(() => {
    const labels = restrictions.map(
      (key) => DIETARY_RESTRICTION_LABELS[key]?.label || key,
    );
    return [...labels, ...customAllergies];
  }, [restrictions, customAllergies]);

  const toggleWeekday = (weekday: number) => {
    setMatchDayWeekdays((prev) =>
      prev.includes(weekday) ? prev.filter((d) => d !== weekday) : [...prev, weekday],
    );
  };

  const handleRebuildTemplate = () => {
    const parsedTarget = Number(targetWeightText.replace(",", "."));
    const created = buildLocalMasterPlanTemplate({
      fullName: profile?.full_name,
      gender: profile?.gender,
      age: profile?.age,
      heightCm: profile?.height_cm,
      weightKg: profile?.current_weight_kg,
      targetWeightKg: Number.isFinite(parsedTarget) && parsedTarget >= 30 ? parsedTarget : undefined,
      activityLevel: profile?.activity_level,
      objective: profile?.objective,
      matchDayWeekdays,
      trainingDaysPerWeek: trainingDays,
      trainingFocus,
      mealsPerDay,
      includeSupplements,
    });
    setDraftPlan(created);
    setMode("manual");
  };

  const ensureDraft = (): MasterPlanData => {
    if (draftPlan) return draftPlan;
    const parsedTarget = Number(targetWeightText.replace(",", "."));
    const created = buildLocalMasterPlanTemplate({
      fullName: profile?.full_name,
      gender: profile?.gender,
      age: profile?.age,
      heightCm: profile?.height_cm,
      weightKg: profile?.current_weight_kg,
      targetWeightKg: Number.isFinite(parsedTarget) && parsedTarget >= 30 ? parsedTarget : undefined,
      activityLevel: profile?.activity_level,
      objective: profile?.objective,
      matchDayWeekdays,
      trainingDaysPerWeek: trainingDays,
      trainingFocus,
      mealsPerDay,
      includeSupplements,
    });
    setDraftPlan(created);
    return created;
  };

  const executeAiGeneration = async () => {
    const parsedTarget = Number(targetWeightText.replace(",", "."));
    try {
      const result = await generateMutation.mutateAsync({
        matchDayWeekdays,
        trainingDaysPerWeek: trainingDays,
        trainingFocus,
        equipment,
        mealsPerDay,
        targetWeightKg:
          Number.isFinite(parsedTarget) && parsedTarget >= 30 && parsedTarget <= 300
            ? parsedTarget
            : undefined,
        includeSupplements,
        ...(customNotes.trim() ? { customNotes: customNotes.trim() } : {}),
      });
      setDraftPlan(result.plan);
      setMode("manual");
      showToast({
        type: "success",
        title: "Borrador IA listo",
        message: "Revisa los detalles y guarda para activar tu plan.",
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "No se pudo generar el plan",
        message: err?.message || "Inténtalo nuevamente en unos segundos.",
      });
    }
  };

  const handlePressGenerate = () => {
    if (!aiConsent.hasConsent) {
      setConsentVisible(true);
      return;
    }
    void executeAiGeneration();
  };

  const updateStandardField = (
    field: "calories" | "proteinG" | "carbsG" | "fatG",
    raw: string,
  ) => {
    const num = Number(raw.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(num)) return;
    const current = ensureDraft();
    setDraftPlan({
      ...current,
      dailyGoals: {
        ...current.dailyGoals,
        standard: {
          ...current.dailyGoals.standard,
          [field]: num,
        },
      },
    });
  };

  const updateMatchField = (
    field: "calories" | "proteinG" | "carbsG" | "fatG",
    raw: string,
  ) => {
    const num = Number(raw.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(num)) return;
    const current = ensureDraft();
    setDraftPlan({
      ...current,
      dailyGoals: {
        ...current.dailyGoals,
        matchDay: {
          ...current.dailyGoals.matchDay,
          [field]: num,
        },
      },
    });
  };

  const updateDraftWeekdays = (weekday: number) => {
    const current = ensureDraft();
    const prev = getMatchDayWeekdays(current);
    const next = prev.includes(weekday)
      ? prev.filter((d) => d !== weekday)
      : [...prev, weekday];
    setMatchDayWeekdays(next);
    setDraftPlan({
      ...current,
      dailyGoals: {
        ...current.dailyGoals,
        matchDay: {
          ...current.dailyGoals.matchDay,
          weekdays: next,
          days: formatWeekdaysLabel(next),
        },
      },
    });
  };

  const handleAddHabit = () => {
    const clean = newHabitText.trim();
    if (clean.length < 2) return;
    const current = ensureDraft();
    if (current.dailyChecklist.some((h) => h.toLowerCase() === clean.toLowerCase())) {
      setNewHabitText("");
      return;
    }
    setDraftPlan({
      ...current,
      dailyChecklist: [...current.dailyChecklist, clean].slice(0, 20),
    });
    setNewHabitText("");
  };

  const handleRemoveHabit = (idx: number) => {
    const current = ensureDraft();
    setDraftPlan({
      ...current,
      dailyChecklist: current.dailyChecklist.filter((_, i) => i !== idx),
    });
  };

  const handleSave = async () => {
    const base = ensureDraft();
    const finalPlan: MasterPlanData = {
      ...base,
      dailyGoals: {
        ...base.dailyGoals,
        standard: {
          ...base.dailyGoals.standard,
          calories: clampPlanInteger(base.dailyGoals.standard.calories, 800, 8000),
          proteinG: clampPlanInteger(base.dailyGoals.standard.proteinG, 10, 400),
          carbsG: clampPlanInteger(base.dailyGoals.standard.carbsG, 10, 1600),
          fatG: clampPlanInteger(base.dailyGoals.standard.fatG, 5, 300),
        },
        matchDay: {
          ...base.dailyGoals.matchDay,
          weekdays: matchDayWeekdays,
          days: formatWeekdaysLabel(matchDayWeekdays),
          calories: clampPlanInteger(base.dailyGoals.matchDay.calories, 800, 8000),
          proteinG: clampPlanInteger(base.dailyGoals.matchDay.proteinG, 10, 400),
          carbsG: clampPlanInteger(base.dailyGoals.matchDay.carbsG, 10, 1600),
          fatG: clampPlanInteger(base.dailyGoals.matchDay.fatG, 5, 300),
        },
      },
    };

    try {
      const saved = await saveMutation.mutateAsync({ plan: finalPlan, syncGoals });
      showToast({
        type: "success",
        title: "Plan Maestro activado",
        message: syncGoals
          ? "Metas del Home sincronizadas con tu plan."
          : "Tu plan fue guardado correctamente.",
      });
      onSaved?.(saved);
      onClose();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "No se pudo guardar el plan",
        message: err?.message || "Revisa los campos e inténtalo de nuevo.",
      });
    }
  };

  const handleDelete = () => {
    showAlert(
      "Eliminar Plan Maestro",
      "Se eliminará tu Plan Maestro y su checklist asociado en pantalla. Tus comidas registradas no se borrarán.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync();
              showToast({ type: "success", title: "Plan eliminado" });
              onClose();
            } catch (err: any) {
              showToast({
                type: "error",
                title: "No se pudo eliminar",
                message: err?.message,
              });
            }
          },
        },
      ],
    );
  };

  const activeDraft = draftPlan;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>CONFIGURACIÓN DINÁMICA</Text>
                <Text style={styles.title}>
                  {existingPlan ? "Editar Plan Maestro" : "Crear mi Plan Maestro"}
                </Text>
              </View>
              {existingPlan && (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={handleDelete}
                  disabled={deleteMutation.isPending}
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar Plan Maestro"
                >
                  <Trash2 size={18} color={colors.danger} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.modeTab, mode === "ai" && styles.modeTabActive]}
                onPress={() => setMode("ai")}
              >
                <Sparkles
                  size={15}
                  color={mode === "ai" ? colors.primaryDark : colors.textSecondary}
                />
                <Text style={[styles.modeTabText, mode === "ai" && styles.modeTabTextActive]}>
                  Generar con IA
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, mode === "manual" && styles.modeTabActive]}
                onPress={() => {
                  ensureDraft();
                  setMode("manual");
                }}
              >
                <Sliders
                  size={15}
                  color={mode === "manual" ? colors.primaryDark : colors.textSecondary}
                />
                <Text
                  style={[styles.modeTabText, mode === "manual" && styles.modeTabTextActive]}
                >
                  Plantilla / Editar
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
              {mode === "ai" ? (
                <View style={styles.formSection}>
                  {dietarySummary.length > 0 && (
                    <View style={styles.dietaryBox}>
                      <ShieldCheck size={16} color={colors.primaryDark} />
                      <Text style={styles.dietaryText}>
                        Se respetarán automáticamente tus restricciones: {dietarySummary.join(", ")}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.label}>
                    Días de carga / entrenamiento intenso (opcional)
                  </Text>
                  <Text style={styles.helperText}>
                    En estos días el Home y el Coach aumentarán automáticamente tu objetivo de carbohidratos y energía.
                  </Text>
                  <View style={styles.weekdayRow}>
                    {WEEKDAY_OPTIONS.map((opt) => {
                      const active = matchDayWeekdays.includes(opt.value);
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.weekdayBtn, active && styles.weekdayBtnActive]}
                          onPress={() => toggleWeekday(opt.value)}
                        >
                          <Text
                            style={[styles.weekdayText, active && styles.weekdayTextActive]}
                          >
                            {opt.short}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.stepperRow}>
                    <Text style={styles.label}>Días de entreno por semana</Text>
                    <View style={styles.stepperControls}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setTrainingDays((d) => Math.max(0, d - 1))}
                      >
                        <Minus size={16} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={styles.stepValue}>{trainingDays}</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setTrainingDays((d) => Math.min(7, d + 1))}
                      >
                        <Plus size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.stepperRow}>
                    <Text style={styles.label}>Comidas al día</Text>
                    <View style={styles.stepperControls}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setMealsPerDay((m) => Math.max(3, m - 1))}
                      >
                        <Minus size={16} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={styles.stepValue}>{mealsPerDay}</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => setMealsPerDay((m) => Math.min(6, m + 1))}
                      >
                        <Plus size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.label}>Enfoque principal</Text>
                  <View style={styles.chipsWrap}>
                    {FOCUS_PRESETS.map((preset) => {
                      const selected = trainingFocus === preset;
                      return (
                        <TouchableOpacity
                          key={preset}
                          style={[styles.chip, selected && styles.chipActive]}
                          onPress={() => setTrainingFocus(preset)}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                            {preset}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Equipamiento disponible</Text>
                  <View style={styles.chipsWrap}>
                    {EQUIPMENT_OPTIONS.map((opt) => {
                      const selected = equipment === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.chip, selected && styles.chipActive]}
                          onPress={() => setEquipment(opt.value)}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Peso objetivo (kg, opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={targetWeightText}
                    onChangeText={setTargetWeightText}
                    keyboardType="numeric"
                    placeholder="Ej. 74"
                    placeholderTextColor={colors.textMuted}
                  />

                  <View style={styles.switchRow}>
                    <Text style={styles.label}>Incluir sugerencias de suplementos</Text>
                    <Switch
                      value={includeSupplements}
                      onValueChange={setIncludeSupplements}
                      trackColor={{ false: colors.surfaceMuted, true: colors.mint }}
                      thumbColor={includeSupplements ? colors.primary : "#FFFFFF"}
                    />
                  </View>

                  <Text style={styles.label}>Notas o preferencias extra (opcional)</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    value={customNotes}
                    onChangeText={setCustomNotes}
                    multiline
                    maxLength={240}
                    placeholder="Ej. Juego fútbol los domingos y entreno temprano en ayunas"
                    placeholderTextColor={colors.textMuted}
                  />

                  <TouchableOpacity
                    style={[styles.generateBtn, generateMutation.isPending && styles.btnDisabled]}
                    onPress={handlePressGenerate}
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Sparkles size={17} color="#FFFFFF" />
                        <Text style={styles.generateBtnText}>
                          Generar borrador de Plan Maestro
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.secondaryBtn} onPress={handleRebuildTemplate}>
                    <RefreshCw size={15} color={colors.primaryDark} />
                    <Text style={styles.secondaryBtnText}>
                      Crear sin IA con plantilla personalizada
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                activeDraft && (
                  <View style={styles.formSection}>
                    <View style={styles.templateBanner}>
                      <Text style={styles.templateBannerTitle}>Ajusta tu Plan Maestro</Text>
                      <TouchableOpacity
                        style={styles.recalcLink}
                        onPress={handleRebuildTemplate}
                      >
                        <RefreshCw size={13} color={colors.primaryDark} />
                        <Text style={styles.recalcLinkText}>Recalcular base</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Título del objetivo</Text>
                    <TextInput
                      style={styles.input}
                      value={activeDraft.user.objectiveTitle}
                      onChangeText={(text) =>
                        setDraftPlan({
                          ...activeDraft,
                          user: { ...activeDraft.user, objectiveTitle: text },
                        })
                      }
                      maxLength={160}
                    />

                    <Text style={styles.label}>Días de carga / intensidad alta</Text>
                    <View style={styles.weekdayRow}>
                      {WEEKDAY_OPTIONS.map((opt) => {
                        const active = matchDayWeekdays.includes(opt.value);
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[styles.weekdayBtn, active && styles.weekdayBtnActive]}
                            onPress={() => updateDraftWeekdays(opt.value)}
                          >
                            <Text
                              style={[styles.weekdayText, active && styles.weekdayTextActive]}
                            >
                              {opt.short}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={styles.label}>Metas diarias estándar</Text>
                    <View style={styles.macrosGrid}>
                      <View style={styles.macroField}>
                        <Text style={styles.macroFieldLabel}>Calorías</Text>
                        <TextInput
                          style={styles.macroInput}
                          keyboardType="numeric"
                          value={String(activeDraft.dailyGoals.standard.calories)}
                          onChangeText={(t) => updateStandardField("calories", t)}
                        />
                      </View>
                      <View style={styles.macroField}>
                        <Text style={styles.macroFieldLabel}>Prot (g)</Text>
                        <TextInput
                          style={styles.macroInput}
                          keyboardType="numeric"
                          value={String(activeDraft.dailyGoals.standard.proteinG)}
                          onChangeText={(t) => updateStandardField("proteinG", t)}
                        />
                      </View>
                      <View style={styles.macroField}>
                        <Text style={styles.macroFieldLabel}>Carbos (g)</Text>
                        <TextInput
                          style={styles.macroInput}
                          keyboardType="numeric"
                          value={String(activeDraft.dailyGoals.standard.carbsG)}
                          onChangeText={(t) => updateStandardField("carbsG", t)}
                        />
                      </View>
                      <View style={styles.macroField}>
                        <Text style={styles.macroFieldLabel}>Grasa (g)</Text>
                        <TextInput
                          style={styles.macroInput}
                          keyboardType="numeric"
                          value={String(activeDraft.dailyGoals.standard.fatG)}
                          onChangeText={(t) => updateStandardField("fatG", t)}
                        />
                      </View>
                    </View>

                    {matchDayWeekdays.length > 0 && (
                      <>
                        <Text style={styles.label}>
                          Metas días de carga ({formatWeekdaysLabel(matchDayWeekdays)})
                        </Text>
                        <View style={styles.macrosGrid}>
                          <View style={styles.macroField}>
                            <Text style={styles.macroFieldLabel}>Calorías</Text>
                            <TextInput
                              style={styles.macroInput}
                              keyboardType="numeric"
                              value={String(activeDraft.dailyGoals.matchDay.calories)}
                              onChangeText={(t) => updateMatchField("calories", t)}
                            />
                          </View>
                          <View style={styles.macroField}>
                            <Text style={styles.macroFieldLabel}>Prot (g)</Text>
                            <TextInput
                              style={styles.macroInput}
                              keyboardType="numeric"
                              value={String(activeDraft.dailyGoals.matchDay.proteinG)}
                              onChangeText={(t) => updateMatchField("proteinG", t)}
                            />
                          </View>
                          <View style={styles.macroField}>
                            <Text style={styles.macroFieldLabel}>Carbos (g)</Text>
                            <TextInput
                              style={styles.macroInput}
                              keyboardType="numeric"
                              value={String(activeDraft.dailyGoals.matchDay.carbsG)}
                              onChangeText={(t) => updateMatchField("carbsG", t)}
                            />
                          </View>
                          <View style={styles.macroField}>
                            <Text style={styles.macroFieldLabel}>Grasa (g)</Text>
                            <TextInput
                              style={styles.macroInput}
                              keyboardType="numeric"
                              value={String(activeDraft.dailyGoals.matchDay.fatG)}
                              onChangeText={(t) => updateMatchField("fatG", t)}
                            />
                          </View>
                        </View>
                      </>
                    )}

                    <Text style={styles.label}>
                      Hábitos del checklist diario ({activeDraft.dailyChecklist.length})
                    </Text>
                    <View style={styles.addHabitRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={newHabitText}
                        onChangeText={setNewHabitText}
                        placeholder="Agregar hábito diario..."
                        placeholderTextColor={colors.textMuted}
                        maxLength={140}
                      />
                      <TouchableOpacity style={styles.addHabitBtn} onPress={handleAddHabit}>
                        <Plus size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.habitDraftList}>
                      {activeDraft.dailyChecklist.map((habit, idx) => (
                        <View key={`${habit}-${idx}`} style={styles.habitDraftItem}>
                          <Text style={styles.habitDraftText}>{habit}</Text>
                          <TouchableOpacity onPress={() => handleRemoveHabit(idx)}>
                            <X size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    <View style={styles.switchRow}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={styles.label}>Sincronizar metas del Home</Text>
                        <Text style={styles.helperText}>
                          Actualiza tus calorías y macros diarios activos al guardar.
                        </Text>
                      </View>
                      <Switch
                        value={syncGoals}
                        onValueChange={setSyncGoals}
                        trackColor={{ false: colors.surfaceMuted, true: colors.mint }}
                        thumbColor={syncGoals ? colors.primary : "#FFFFFF"}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.saveBtn, saveMutation.isPending && styles.btnDisabled]}
                      onPress={handleSave}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Check size={17} color="#FFFFFF" />
                          <Text style={styles.saveBtnText}>Guardar y activar Plan Maestro</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AiConsentModal
        visible={consentVisible}
        isUpdating={aiConsent.isUpdating}
        onAccept={async () => {
          try {
            await aiConsent.setConsent(true);
            setConsentVisible(false);
            void executeAiGeneration();
          } catch (err: any) {
            setConsentVisible(false);
            showToast({
              type: "error",
              title: "No se pudo guardar el consentimiento",
              message: err?.message,
            });
          }
        }}
        onCancel={() => setConsentVisible(false)}
        onViewPrivacy={() => {
          setConsentVisible(false);
          onClose();
          router.push("/legal" as Href);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "93%",
    minHeight: "80%",
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
  },
  iconBtn: {
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
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modeTabActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  modeTabTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 38,
  },
  formSection: {
    gap: 12,
  },
  dietaryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 14,
  },
  dietaryText: {
    flex: 1,
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  helperText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: -6,
  },
  weekdayRow: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
  },
  weekdayBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  weekdayBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  weekdayTextActive: {
    color: "#FFFFFF",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  stepValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    minWidth: 20,
    textAlign: "center",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  generateBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.65,
  },
  templateBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  templateBannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  recalcLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  recalcLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  macrosGrid: {
    flexDirection: "row",
    gap: 8,
  },
  macroField: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  macroFieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 4,
  },
  macroInput: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    padding: 0,
  },
  addHabitRow: {
    flexDirection: "row",
    gap: 8,
  },
  addHabitBtn: {
    width: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  habitDraftList: {
    gap: 6,
  },
  habitDraftItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  habitDraftText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
