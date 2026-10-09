import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useQueryClient } from "@tanstack/react-query";
import { GoalsSchema, OnboardingProfileSchema } from "@/types/profile";
import { parseDecimal } from "@/utils/dates";
import { colors, layout } from "@/constants/colors";

export default function GoalsReviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setProfile } = useAuthStore();
  const params = useLocalSearchParams<{
    gender: string;
    age: string;
    heightCm: string;
    weightKg: string;
    activityLevel: string;
    objective: string;
    calories: string;
    proteinG: string;
    carbsG: string;
    fatG: string;
  }>();

  const [calories, setCalories] = useState(params.calories || "2000");
  const [proteinG, setProteinG] = useState(params.proteinG || "150");
  const [carbsG, setCarbsG] = useState(params.carbsG || "200");
  const [fatG, setFatG] = useState(params.fatG || "65");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adjustValue = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    current: string,
    delta: number,
    min: number = 0
  ) => {
    const val = parseInt(current, 10) || 0;
    setter(Math.max(min, val + delta).toString());
  };

  const handleSaveAndContinue = async () => {
    if (!user) {
      setError("No hay sesión de usuario activa.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const goals = GoalsSchema.parse({
        calories: parseDecimal(calories), proteinG: parseDecimal(proteinG),
        carbsG: parseDecimal(carbsG), fatG: parseDecimal(fatG),
      });
      const profile = OnboardingProfileSchema.parse({
        fullName: user.user_metadata?.full_name || "Usuario", gender: params.gender,
        age: parseDecimal(params.age), heightCm: parseDecimal(params.heightCm),
        weightKg: parseDecimal(params.weightKg), activityLevel: params.activityLevel, objective: params.objective,
      });
      const { data: updatedProfile, error } = await supabase.rpc("complete_onboarding", {
        p_profile: { gender: profile.gender, age: profile.age, height_cm: profile.heightCm,
          current_weight_kg: profile.weightKg, activity_level: profile.activityLevel, objective: profile.objective },
        p_goals: { calories: Math.round(goals.calories), protein_g: Math.round(goals.proteinG),
          carbs_g: Math.round(goals.carbsG), fat_g: Math.round(goals.fatG) },
      });
      if (error) throw new Error(error.message);
      setProfile(updatedProfile);
      await queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] });
      // Redirigir al inicio
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al guardar tus objetivos.");
    } finally {
      setSaving(false);
    }
  };

  const protKcal = (parseInt(proteinG, 10) || 0) * 4;
  const carbsKcal = (parseInt(carbsG, 10) || 0) * 4;
  const fatKcal = (parseInt(fatG, 10) || 0) * 9;
  const totalMacroKcal = protKcal + carbsKcal + fatKcal || 1;

  const protPct = Math.round((protKcal / totalMacroKcal) * 100);
  const carbsPct = Math.round((carbsKcal / totalMacroKcal) * 100);
  const fatPct = Math.max(0, 100 - protPct - carbsPct);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Paso 2 de 2</Text>
        <Text style={styles.title}>Tus Objetivos Diarios</Text>
        <Text style={styles.subtitle}>
          Hemos calculado tus metas nutricionales personalizadas. Puedes ajustarlas según tus preferencias.
        </Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Tarjeta de Calorías */}
      <View style={styles.calorieCard}>
        <Text style={styles.calorieCardLabel}>Calorías diarias recomendadas</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity accessibilityRole="button"
            accessibilityLabel="Reducir meta de calorías"
            style={styles.adjustBtn}
            onPress={() => adjustValue(setCalories, calories, -50, 800)}
          >
            <Text style={styles.adjustBtnText}>-50</Text>
          </TouchableOpacity>
          <View style={styles.mainValueContainer}>
            <TextInput
              style={styles.mainValueText}
              keyboardType="numeric"
              accessibilityLabel="Meta de calorías"
              value={calories}
              onChangeText={setCalories}
            />
            <Text style={styles.mainValueUnit}>kcal / día</Text>
          </View>
          <TouchableOpacity accessibilityRole="button"
            accessibilityLabel="Aumentar meta de calorías"
            style={styles.adjustBtn}
            onPress={() => adjustValue(setCalories, calories, 50, 800)}
          >
            <Text style={styles.adjustBtnText}>+50</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de distribución de macros */}
      <View style={styles.ratioBarContainer}>
        <View style={[styles.ratioSegment, { flex: protPct, backgroundColor: colors.protein }]} />
        <View style={[styles.ratioSegment, { flex: carbsPct, backgroundColor: colors.carbs }]} />
        <View style={[styles.ratioSegment, { flex: fatPct, backgroundColor: colors.fat }]} />
      </View>
      <View style={styles.ratioLabelsRow}>
        <Text style={[styles.ratioLabel, { color: colors.protein }]}>Proteína {protPct}%</Text>
        <Text style={[styles.ratioLabel, { color: colors.carbs }]}>Carbos {carbsPct}%</Text>
        <Text style={[styles.ratioLabel, { color: colors.fat }]}>Grasas {fatPct}%</Text>
      </View>

      {/* Controles de Macronutrientes */}
      <View style={styles.macrosSection}>
        {/* Proteína */}
        <View style={styles.macroRow}>
          <View style={styles.macroInfo}>
            <View style={[styles.colorIndicator, { backgroundColor: colors.protein }]} />
            <Text style={styles.macroName}>Proteína</Text>
          </View>
          <View style={styles.inlineControls}>
            <TouchableOpacity accessibilityRole="button"
              accessibilityLabel="Reducir meta de proteínas"
              style={styles.inlineBtn}
              onPress={() => adjustValue(setProteinG, proteinG, -5, 10)}
            >
              <Text style={styles.inlineBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.macroInput}
              keyboardType="numeric"
              accessibilityLabel="Meta de proteínas"
              value={proteinG}
              onChangeText={setProteinG}
            />
            <Text style={styles.macroUnit}>g</Text>
            <TouchableOpacity accessibilityRole="button"
              accessibilityLabel="Aumentar meta de proteínas"
              style={styles.inlineBtn}
              onPress={() => adjustValue(setProteinG, proteinG, 5, 10)}
            >
              <Text style={styles.inlineBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Carbohidratos */}
        <View style={styles.macroRow}>
          <View style={styles.macroInfo}>
            <View style={[styles.colorIndicator, { backgroundColor: colors.carbs }]} />
            <Text style={styles.macroName}>Carbohidratos</Text>
          </View>
          <View style={styles.inlineControls}>
            <TouchableOpacity accessibilityRole="button"
              accessibilityLabel="Reducir meta de carbohidratos"
              style={styles.inlineBtn}
              onPress={() => adjustValue(setCarbsG, carbsG, -5, 10)}
            >
              <Text style={styles.inlineBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.macroInput}
              keyboardType="numeric"
              accessibilityLabel="Meta de carbohidratos"
              value={carbsG}
              onChangeText={setCarbsG}
            />
            <Text style={styles.macroUnit}>g</Text>
            <TouchableOpacity accessibilityRole="button"
              accessibilityLabel="Aumentar meta de carbohidratos"
              style={styles.inlineBtn}
              onPress={() => adjustValue(setCarbsG, carbsG, 5, 10)}
            >
              <Text style={styles.inlineBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Grasas */}
        <View style={styles.macroRow}>
          <View style={styles.macroInfo}>
            <View style={[styles.colorIndicator, { backgroundColor: colors.fat }]} />
            <Text style={styles.macroName}>Grasas</Text>
          </View>
          <View style={styles.inlineControls}>
            <TouchableOpacity accessibilityRole="button"
              accessibilityLabel="Reducir meta de grasas"
              style={styles.inlineBtn}
              onPress={() => adjustValue(setFatG, fatG, -5, 5)}
            >
              <Text style={styles.inlineBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.macroInput}
              keyboardType="numeric"
              accessibilityLabel="Meta de grasas"
              value={fatG}
              onChangeText={setFatG}
            />
            <Text style={styles.macroUnit}>g</Text>
            <TouchableOpacity accessibilityRole="button"
              accessibilityLabel="Aumentar meta de grasas"
              style={styles.inlineBtn}
              onPress={() => adjustValue(setFatG, fatG, 5, 5)}
            >
              <Text style={styles.inlineBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity accessibilityRole="button"
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={handleSaveAndContinue}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Guardar y Comenzar</Text>
        )}
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
  header: {
    marginTop: 40,
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
  },
  calorieCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: 18,
    alignItems: "center",
  },
  calorieCardLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 14,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  adjustBtn: {
    minWidth: 48,
    minHeight: 44,
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  adjustBtnText: {
    color: colors.primaryDark,
    fontWeight: "700",
    fontSize: 14,
  },
  mainValueContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  mainValueText: {
    width: 100,
    minWidth: 0,
    fontSize: 34,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  mainValueUnit: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },
  ratioBarContainer: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 8,
  },
  ratioSegment: {
    height: "100%",
  },
  ratioLabelsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    marginBottom: 24,
  },
  ratioLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  macrosSection: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: 24,
  },
  macroRow: {
    flexDirection: "column",
    gap: 10,
    alignItems: "stretch",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  macroInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  macroName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  inlineControls: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 300,
    justifyContent: "space-between",
  },
  inlineBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  inlineBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  macroInput: {
    flex: 1,
    width: 54,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  macroUnit: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 6,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
