import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Sparkles,
  Minus,
  Plus,
  Info,
  Check,
} from "lucide-react-native";
import { useAuthStore } from "@/stores/useAuthStore";
import { colors, layout } from "@/constants/colors";
import { Gender, ActivityLevel, Objective } from "@/types/profile";
import { parseDecimal } from "@/utils/dates";
import { calculateBMR, calculateTDEE, calculateNutritionGoals } from "@/utils/nutritionCalculator";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fromSettings?: string }>();
  const isFromSettings = params.fromSettings === "true";
  const { profile } = useAuthStore();

  const [gender, setGender] = useState<Gender>(profile?.gender || "male");
  const [age, setAge] = useState(profile?.age ? String(profile.age) : "28");
  const [heightCm, setHeightCm] = useState(profile?.height_cm ? String(profile.height_cm) : "175");
  const [weightKg, setWeightKg] = useState(profile?.current_weight_kg ? String(profile.current_weight_kg) : "75");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    profile?.activity_level || "moderate"
  );
  const [objective, setObjective] = useState<Objective>(profile?.objective || "lose_weight");
  const [error, setError] = useState<string | null>(null);

  // Steppers para ajustes rápidos táctiles
  const handleAdjustValue = (
    currentValue: string,
    delta: number,
    min: number,
    max: number,
    isFloat = false
  ): string => {
    const parsed = parseDecimal(currentValue) || min;
    const next = Math.max(min, Math.min(max, parsed + delta));
    return isFloat ? String(Math.round(next * 10) / 10) : String(Math.round(next));
  };

  // Cálculos en vivo reactivos
  const parsedAge = parseDecimal(age);
  const parsedHeight = parseDecimal(heightCm);
  const parsedWeight = parseDecimal(weightKg);

  const isAgeValid = Number.isInteger(parsedAge) && parsedAge >= 14 && parsedAge <= 100;
  const isHeightValid = !isNaN(parsedHeight) && parsedHeight >= 100 && parsedHeight <= 240;
  const isWeightValid = !isNaN(parsedWeight) && parsedWeight >= 30 && parsedWeight <= 300;
  const canCalculate = isAgeValid && isHeightValid && isWeightValid;

  const livePreview = useMemo(() => {
    if (!canCalculate) return null;

    const heightM = parsedHeight / 100;
    const bmi = Math.round((parsedWeight / (heightM * heightM)) * 10) / 10;
    let bmiCategory = { label: "Saludable", color: colors.primaryDark, bg: colors.primaryLight };
    if (bmi < 18.5) {
      bmiCategory = { label: "Bajo peso", color: "#B45309", bg: "#FEF3C7" };
    } else if (bmi < 25) {
      bmiCategory = { label: "Saludable", color: colors.primaryDark, bg: colors.primaryLight };
    } else if (bmi < 30) {
      bmiCategory = { label: "Sobrepeso leve", color: "#B45309", bg: "#FEF3C7" };
    } else {
      bmiCategory = { label: "Obesidad", color: colors.danger, bg: "#FEE2E2" };
    }

    const bmr = calculateBMR(parsedWeight, parsedHeight, parsedAge, gender);
    const tdee = calculateTDEE(bmr, activityLevel);

    let targetCalories = tdee;
    let objectiveBadge = "Mantenimiento";
    if (objective === "lose_weight") {
      targetCalories = Math.max(1200, tdee - Math.min(500, Math.round(tdee * 0.2)));
      objectiveBadge = "Déficit moderado (-20%)";
    } else if (objective === "gain_muscle") {
      targetCalories = Math.round(tdee * 1.1);
      objectiveBadge = "Superávit controlado (+10%)";
    }

    return {
      bmi,
      bmiCategory,
      bmr,
      tdee,
      targetCalories,
      objectiveBadge,
      waterMl: Math.round(parsedWeight * 35),
    };
  }, [canCalculate, parsedAge, parsedHeight, parsedWeight, gender, activityLevel, objective]);

  const handleCalculateGoals = () => {
    if (!isAgeValid) {
      setError("Ingresa una edad válida (entre 14 y 100 años).");
      return;
    }
    if (!isHeightValid) {
      setError("Ingresa una estatura válida en centímetros (entre 100 y 240 cm).");
      return;
    }
    if (!isWeightValid) {
      setError("Ingresa un peso válido en kilogramos (entre 30 y 300 kg).");
      return;
    }

    setError(null);

    const calculatedGoals = calculateNutritionGoals({
      fullName: profile?.full_name || "Usuario",
      gender,
      age: parsedAge,
      heightCm: parsedHeight,
      weightKg: parsedWeight,
      activityLevel,
      objective,
    });

    router.push({
      pathname: "/(onboarding)/goals-review",
      params: {
        gender,
        age: parsedAge.toString(),
        heightCm: parsedHeight.toString(),
        weightKg: parsedWeight.toString(),
        activityLevel,
        objective,
        calories: calculatedGoals.calories.toString(),
        proteinG: calculatedGoals.proteinG.toString(),
        carbsG: calculatedGoals.carbsG.toString(),
        fatG: calculatedGoals.fatG.toString(),
        fromSettings: isFromSettings ? "true" : undefined,
      },
    });
  };

  const handleBack = () => {
    if (isFromSettings) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/settings");
      }
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Botón Volver a Ajustes / Atrás */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={isFromSettings ? "Volver a ajustes" : "Volver"}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.backButton}
        onPress={handleBack}
      >
        <ArrowLeft size={18} color={colors.text} />
        <Text style={styles.backButtonText}>
          {isFromSettings ? "Volver a Ajustes" : "Atrás"}
        </Text>
      </TouchableOpacity>

      {/* Cabecera */}
      <View style={styles.header}>
        <View style={styles.badgePill}>
          <Text style={styles.stepIndicator}>
            {isFromSettings ? "Ajustes de Perfil" : "Paso 1 de 2"}
          </Text>
        </View>
        <Text style={styles.title}>
          {isFromSettings ? "Recalibrar medidas y metas" : "Cuéntanos sobre ti"}
        </Text>
        <Text style={styles.subtitle}>
          {isFromSettings
            ? "Modifica tu peso o rutina para recalcular tus requerimientos con precisión médica."
            : "Usaremos tus medidas para calcular una pauta adaptada a tu cuerpo y objetivo."}
        </Text>
      </View>

      {/* Tarjeta de Previsualización Inteligente en Tiempo Real */}
      {livePreview && (
        <View style={styles.liveCard}>
          <View style={styles.liveCardHeader}>
            <View style={styles.liveCardTitleRow}>
              <Sparkles size={16} color={colors.primaryDark} />
              <Text style={styles.liveCardTitle}>Estimación en tiempo real</Text>
            </View>
            <View style={[styles.bmiPill, { backgroundColor: livePreview.bmiCategory.bg }]}>
              <Text style={[styles.bmiPillText, { color: livePreview.bmiCategory.color }]}>
                IMC {livePreview.bmi} · {livePreview.bmiCategory.label}
              </Text>
            </View>
          </View>

          <View style={styles.liveMetricsGrid}>
            <View style={styles.liveMetricItem}>
              <Text style={styles.liveMetricLabel}>GASTO TOTAL (TDEE)</Text>
              <Text style={styles.liveMetricValue}>{livePreview.tdee} kcal</Text>
              <Text style={styles.liveMetricSub}>Basal: {livePreview.bmr} kcal</Text>
            </View>

            <View style={styles.liveMetricDivider} />

            <View style={styles.liveMetricItem}>
              <Text style={styles.liveMetricLabel}>META CALÓRICA</Text>
              <Text style={[styles.liveMetricValue, { color: colors.primaryDark }]}>
                {livePreview.targetCalories} kcal
              </Text>
              <Text style={styles.liveMetricSub}>{livePreview.objectiveBadge}</Text>
            </View>
          </View>
        </View>
      )}

      {error && (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* 1. SEXO BIOLÓGICO */}
      <View style={styles.section}>
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>Sexo Biológico</Text>
          <View style={styles.infoHintRow}>
            <Info size={13} color={colors.textSecondary} />
            <Text style={styles.infoHintText}>Para la fórmula metabólica</Text>
          </View>
        </View>

        <View style={styles.genderRow}>
          {(
            [
              { key: "male", label: "Hombre", emoji: "👨" },
              { key: "female", label: "Mujer", emoji: "👩" },
              { key: "other", label: "Otro / Neutro", emoji: "⚧️" },
            ] as const
          ).map((item) => {
            const active = gender === item.key;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Sexo biológico: ${item.label}`}
                accessibilityState={{ selected: active }}
                key={item.key}
                style={[styles.genderCard, active && styles.genderCardActive]}
                onPress={() => setGender(item.key)}
              >
                <Text style={styles.genderEmoji}>{item.emoji}</Text>
                <Text style={[styles.genderLabel, active && styles.genderLabelActive]}>
                  {item.label}
                </Text>
                {active && (
                  <View style={styles.activeCheckIcon}>
                    <Check size={12} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 2. MEDIDAS CORPORALES (EDAD, ESTATURA, PESO) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Medidas Corporales</Text>

        <View style={styles.measureCardsRow}>
          {/* Edad */}
          <View style={styles.measureCard}>
            <Text style={styles.measureCardLabel}>EDAD</Text>
            <View style={styles.measureStepperRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Restar 1 año"
                style={styles.stepperBtn}
                onPress={() => setAge(handleAdjustValue(age, -1, 14, 100))}
              >
                <Minus size={14} color={colors.text} />
              </TouchableOpacity>

              <TextInput
                style={styles.measureInput}
                keyboardType="numeric"
                accessibilityLabel="Edad en años"
                value={age}
                onChangeText={setAge}
                maxLength={3}
                placeholder="28"
                selectTextOnFocus
              />

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Sumar 1 año"
                style={styles.stepperBtn}
                onPress={() => setAge(handleAdjustValue(age, 1, 14, 100))}
              >
                <Plus size={14} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.measureUnit}>años</Text>
          </View>

          {/* Estatura */}
          <View style={styles.measureCard}>
            <Text style={styles.measureCardLabel}>ESTATURA</Text>
            <View style={styles.measureStepperRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Restar 1 centímetro"
                style={styles.stepperBtn}
                onPress={() => setHeightCm(handleAdjustValue(heightCm, -1, 100, 240))}
              >
                <Minus size={14} color={colors.text} />
              </TouchableOpacity>

              <TextInput
                style={styles.measureInput}
                keyboardType="numeric"
                accessibilityLabel="Estatura en centímetros"
                value={heightCm}
                onChangeText={setHeightCm}
                maxLength={3}
                placeholder="175"
                selectTextOnFocus
              />

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Sumar 1 centímetro"
                style={styles.stepperBtn}
                onPress={() => setHeightCm(handleAdjustValue(heightCm, 1, 100, 240))}
              >
                <Plus size={14} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.measureUnit}>cm</Text>
          </View>

          {/* Peso Actual */}
          <View style={[styles.measureCard, styles.measureCardHighlight]}>
            <Text style={[styles.measureCardLabel, { color: colors.primaryDark }]}>
              PESO ACTUAL
            </Text>
            <View style={styles.measureStepperRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Restar 0.5 kg"
                style={styles.stepperBtn}
                onPress={() => setWeightKg(handleAdjustValue(weightKg, -0.5, 30, 300, true))}
              >
                <Minus size={14} color={colors.text} />
              </TouchableOpacity>

              <TextInput
                style={[styles.measureInput, { color: colors.primaryDark }]}
                keyboardType="decimal-pad"
                accessibilityLabel="Peso actual en kilogramos"
                value={weightKg}
                onChangeText={setWeightKg}
                maxLength={5}
                placeholder="75"
                selectTextOnFocus
              />

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Sumar 0.5 kg"
                style={styles.stepperBtn}
                onPress={() => setWeightKg(handleAdjustValue(weightKg, 0.5, 30, 300, true))}
              >
                <Plus size={14} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.measureUnit}>kg</Text>
          </View>
        </View>
      </View>

      {/* 3. NIVEL DE ACTIVIDAD FÍSICA */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Nivel de Actividad Semanal</Text>
        <Text style={styles.sectionSublabel}>
          Determina el multiplicador de tu gasto calórico diario.
        </Text>

        {(
          [
            {
              key: "sedentary",
              emoji: "🛋️",
              title: "Sedentario",
              desc: "Trabajo sentado, poco o ningún ejercicio planificado.",
              mult: "x1.2",
            },
            {
              key: "light",
              emoji: "🚶‍♂️",
              title: "Ligero",
              desc: "1 a 2 días de caminata o entrenamiento por semana.",
              mult: "x1.375",
            },
            {
              key: "moderate",
              emoji: "🏃‍♂️",
              title: "Moderado (Recomendado)",
              desc: "3 a 5 días de entrenamiento por semana.",
              mult: "x1.55",
            },
            {
              key: "active",
              emoji: "⚡",
              title: "Activo",
              desc: "6 a 7 días de entrenamiento intenso o labor activa.",
              mult: "x1.725",
            },
            {
              key: "very_active",
              emoji: "🏋️‍♂️",
              title: "Muy Activo",
              desc: "Trabajo físico pesado o entrenamientos dobles.",
              mult: "x1.9",
            },
          ] as const
        ).map((item) => {
          const active = activityLevel === item.key;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${item.title}: ${item.desc}`}
              accessibilityState={{ selected: active }}
              key={item.key}
              style={[styles.cardOption, active && styles.cardOptionActive]}
              onPress={() => setActivityLevel(item.key)}
            >
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <View style={styles.cardOptionText}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardOptionTitle, active && styles.cardOptionTitleActive]}>
                    {item.title}
                  </Text>
                  <Text style={styles.multBadge}>{item.mult}</Text>
                </View>
                <Text style={styles.cardOptionDesc}>{item.desc}</Text>
              </View>
              <View style={[styles.cardOptionRadio, active && styles.cardOptionRadioActive]}>
                {active && <Check size={13} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 4. OBJETIVO NUTRICIONAL */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>¿Cuál es tu objetivo?</Text>
        <Text style={styles.sectionSublabel}>
          Ajustaremos el reparto calórico y de macronutrientes a esta meta.
        </Text>

        {(
          [
            {
              key: "lose_weight",
              emoji: "🎯",
              title: "Reducir grasa corporal",
              desc: "Déficit calórico moderado (~20%) con alta proteína para proteger tu masa muscular.",
            },
            {
              key: "maintain",
              emoji: "⚖️",
              title: "Mantener mi peso y recomposición",
              desc: "Consumo calórico equivalente a tu gasto diario (100% TDEE).",
            },
            {
              key: "gain_muscle",
              emoji: "💪",
              title: "Aumentar masa muscular",
              desc: "Superávit calórico controlado (+10%) optimizado para hipertrofia y fuerza.",
            },
          ] as const
        ).map((item) => {
          const active = objective === item.key;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${item.title}: ${item.desc}`}
              accessibilityState={{ selected: active }}
              key={item.key}
              style={[styles.cardOption, active && styles.cardOptionActive]}
              onPress={() => setObjective(item.key)}
            >
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <View style={styles.cardOptionText}>
                <Text style={[styles.cardOptionTitle, active && styles.cardOptionTitleActive]}>
                  {item.title}
                </Text>
                <Text style={styles.cardOptionDesc}>{item.desc}</Text>
              </View>
              <View style={[styles.cardOptionRadio, active && styles.cardOptionRadioActive]}>
                {active && <Check size={13} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Botón de Acción Principal */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={isFromSettings ? "Continuar a revisar metas" : "Calcular mis metas nutricionales"}
        style={styles.continueButton}
        onPress={handleCalculateGoals}
      >
        <Text style={styles.continueButtonText}>
          {isFromSettings ? "Continuar a revisión de metas →" : "Calcular mis metas nutricionales →"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...layout.narrowPage,
    paddingBottom: 48,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: Platform.OS === "ios" ? 18 : 12,
    marginBottom: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  header: {
    marginBottom: 20,
  },
  badgePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  stepIndicator: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    letterSpacing: -0.6,
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  liveCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  liveCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  liveCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveCardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.3,
  },
  bmiPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bmiPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  liveMetricsGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  liveMetricItem: {
    flex: 1,
    alignItems: "center",
  },
  liveMetricDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.cardBorder,
  },
  liveMetricLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  liveMetricValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  liveMetricSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    marginBottom: 26,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  sectionSublabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    marginTop: 2,
  },
  infoHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoHintText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  genderRow: {
    flexDirection: "row",
    gap: 10,
  },
  genderCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  genderCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#F0FDF4",
  },
  genderEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  genderLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  genderLabelActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  activeCheckIcon: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  measureCardsRow: {
    flexDirection: "row",
    gap: 10,
  },
  measureCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
  },
  measureCardHighlight: {
    borderColor: "#A7F3D0",
    backgroundColor: "#FCFDFD",
  },
  measureCardLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  measureStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    width: "100%",
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  measureInput: {
    width: 44,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    color: colors.text,
    paddingVertical: 4,
  },
  measureUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: 4,
  },
  cardOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: 10,
    gap: 12,
  },
  cardOptionActive: {
    borderColor: colors.primary,
    backgroundColor: "#F0FDF4",
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardOptionText: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  cardOptionTitleActive: {
    color: colors.primaryDark,
  },
  multBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardOptionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  cardOptionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  cardOptionRadioActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
