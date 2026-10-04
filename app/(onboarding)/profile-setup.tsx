import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { colors } from "@/constants/colors";
import { Gender, ActivityLevel, Objective } from "@/types/profile";
import { parseDecimal } from "@/utils/dates";
import { calculateNutritionGoals } from "@/utils/nutritionCalculator";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const [gender, setGender] = useState<Gender>(profile?.gender || "male");
  const [age, setAge] = useState(profile?.age ? String(profile.age) : "");
  const [heightCm, setHeightCm] = useState(profile?.height_cm ? String(profile.height_cm) : "175");
  const [weightKg, setWeightKg] = useState(profile?.current_weight_kg ? String(profile.current_weight_kg) : "75");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    profile?.activity_level || "moderate"
  );
  const [objective, setObjective] = useState<Objective>(profile?.objective || "lose_weight");
  const [error, setError] = useState<string | null>(null);

  const handleCalculateGoals = () => {
    const parsedAge = parseDecimal(age);
    const parsedHeight = parseDecimal(heightCm);
    const parsedWeight = parseDecimal(weightKg);

    if (!Number.isInteger(parsedAge) || parsedAge < 14 || parsedAge > 100) {
      setError("Ingresa una edad válida (entre 14 y 100 años).");
      return;
    }
    if (isNaN(parsedHeight) || parsedHeight < 100 || parsedHeight > 240) {
      setError("Ingresa una estatura válida en centímetros (ej: 175).");
      return;
    }
    if (isNaN(parsedWeight) || parsedWeight < 35 || parsedWeight > 250) {
      setError("Ingresa un peso válido en kilogramos (ej: 75).");
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

    // Navegar a la pantalla de revisión de metas pasando los parámetros
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
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Paso 1 de 2</Text>
        <Text style={styles.title}>Cuéntanos sobre ti</Text>
        <Text style={styles.subtitle}>
          Calcularemos tus requerimientos de energía y macronutrientes basados en ciencia.
        </Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Sexo */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Sexo Biológico</Text>
        <View style={styles.optionsRow}>
          {(
            [
              { key: "male", label: "Hombre" },
              { key: "female", label: "Mujer" },
            ] as const
          ).map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.pillOption, gender === item.key && styles.pillOptionActive]}
              onPress={() => setGender(item.key)}
            >
              <Text style={[styles.pillText, gender === item.key && styles.pillTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Medidas (Edad, Altura, Peso) */}
      <View style={styles.measuresRow}>
        <View style={styles.measureCol}>
          <Text style={styles.sectionLabel}>Edad</Text>
          <TextInput
            style={styles.numericInput}
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
            placeholder="28"
          />
          <Text style={styles.unitText}>años</Text>
        </View>

        <View style={styles.measureCol}>
          <Text style={styles.sectionLabel}>Estatura</Text>
          <TextInput
            style={styles.numericInput}
            keyboardType="numeric"
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder="175"
          />
          <Text style={styles.unitText}>cm</Text>
        </View>

        <View style={styles.measureCol}>
          <Text style={styles.sectionLabel}>Peso actual</Text>
          <TextInput
            style={styles.numericInput}
            keyboardType="decimal-pad"
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="75"
          />
          <Text style={styles.unitText}>kg</Text>
        </View>
      </View>

      {/* Nivel de Actividad */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Nivel de Actividad Semanal</Text>
        {(
          [
            { key: "sedentary", title: "Sedentario", desc: "Trabajo sentado, poco ejercicio" },
            { key: "light", title: "Ligero", desc: "1-2 entrenamientos o caminatas por semana" },
            { key: "moderate", title: "Moderado", desc: "3-5 entrenamientos a la semana" },
            { key: "active", title: "Activo", desc: "6-7 sesiones o trabajo físico activo" },
          ] as const
        ).map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.cardOption, activityLevel === item.key && styles.cardOptionActive]}
            onPress={() => setActivityLevel(item.key)}
          >
            <View style={styles.cardOptionRadio}>
              {activityLevel === item.key && <View style={styles.radioDot} />}
            </View>
            <View style={styles.cardOptionText}>
              <Text style={styles.cardOptionTitle}>{item.title}</Text>
              <Text style={styles.cardOptionDesc}>{item.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Objetivo */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>¿Cuál es tu objetivo?</Text>
        {(
          [
            { key: "lose_weight", title: "Bajar grasa corporal", desc: "Déficit calórico moderado" },
            { key: "maintain", title: "Mantener mi peso", desc: "Equilibrio y recomposición" },
            { key: "gain_muscle", title: "Aumentar masa muscular", desc: "Superávit calórico controlado" },
          ] as const
        ).map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.cardOption, objective === item.key && styles.cardOptionActive]}
            onPress={() => setObjective(item.key)}
          >
            <View style={styles.cardOptionRadio}>
              {objective === item.key && <View style={styles.radioDot} />}
            </View>
            <View style={styles.cardOptionText}>
              <Text style={styles.cardOptionTitle}>{item.title}</Text>
              <Text style={styles.cardOptionDesc}>{item.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.continueButton} onPress={handleCalculateGoals}>
        <Text style={styles.continueButtonText}>Calcular mis Objetivos</Text>
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
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    marginTop: Platform.OS === "ios" ? 40 : 20,
    marginBottom: 24,
  },
  stepIndicator: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
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
  errorBox: {
    backgroundColor: colors.dangerLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  pillOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: "center",
  },
  pillOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  pillText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  measuresRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  measureCol: {
    flex: 1,
  },
  numericInput: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 14,
    color: colors.text,
  },
  unitText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    fontWeight: "500",
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
  },
  cardOptionActive: {
    borderColor: colors.primary,
    backgroundColor: "#F0FDF4",
  },
  cardOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  cardOptionText: {
    flex: 1,
  },
  cardOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  cardOptionDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
