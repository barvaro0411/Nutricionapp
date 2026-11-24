import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Check, RotateCcw, Sparkles, X } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { colors, shadows } from "@/constants/colors";
import { supabase } from "@/services/supabase";
import { GoalsSchema } from "@/types/profile";
import { showAlert, showToast } from "@/utils/alerts";
import { parseDecimal } from "@/utils/dates";

interface CustomGoalsModalProps {
  visible: boolean;
  initialCalories: number;
  initialProtein: number;
  initialCarbs: number;
  initialFat: number;
  autoSuggested?: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  } | null;
  onClose: () => void;
}

export function CustomGoalsModal({
  visible,
  initialCalories,
  initialProtein,
  initialCarbs,
  initialFat,
  autoSuggested,
  onClose,
}: CustomGoalsModalProps) {
  const queryClient = useQueryClient();
  const [calories, setCalories] = useState(String(Math.round(initialCalories)));
  const [protein, setProtein] = useState(String(Math.round(initialProtein)));
  const [carbs, setCarbs] = useState(String(Math.round(initialCarbs)));
  const [fat, setFat] = useState(String(Math.round(initialFat)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCalories(String(Math.round(initialCalories)));
      setProtein(String(Math.round(initialProtein)));
      setCarbs(String(Math.round(initialCarbs)));
      setFat(String(Math.round(initialFat)));
    }
  }, [visible, initialCalories, initialProtein, initialCarbs, initialFat]);

  const atwaterCalories = useMemo(() => {
    const p = Math.max(0, parseDecimal(protein) || 0);
    const c = Math.max(0, parseDecimal(carbs) || 0);
    const f = Math.max(0, parseDecimal(fat) || 0);
    return Math.round(p * 4 + c * 4 + f * 9);
  }, [protein, carbs, fat]);

  const handleApplyAuto = () => {
    if (!autoSuggested) return;
    setCalories(String(Math.round(autoSuggested.calories)));
    setProtein(String(Math.round(autoSuggested.proteinG)));
    setCarbs(String(Math.round(autoSuggested.carbsG)));
    setFat(String(Math.round(autoSuggested.fatG)));
  };

  const handleSave = async () => {
    const parsed = GoalsSchema.safeParse({
      calories: Math.round(parseDecimal(calories)),
      proteinG: Math.round(parseDecimal(protein)),
      carbsG: Math.round(parseDecimal(carbs)),
      fatG: Math.round(parseDecimal(fat)),
    });

    if (!parsed.success) {
      showAlert(
        "Revisa los valores",
        "Calorías: 1.200–8.000 kcal · Proteína: 20–400 g · Carbos: 20–1.600 g · Grasas: 15–300 g."
      );
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc("set_nutrition_goals", {
        p_calories: parsed.data.calories,
        p_protein_g: parsed.data.proteinG,
        p_carbs_g: parsed.data.carbsG,
        p_fat_g: parsed.data.fatG,
      });

      if (error) {
        throw new Error(error.message || "No se pudieron guardar tus metas.");
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] }),
        queryClient.invalidateQueries({ queryKey: ["weeklyStats"] }),
      ]);

      showToast({
        type: "success",
        title: "Metas actualizadas",
        message: `${parsed.data.calories} kcal · ${parsed.data.proteinG}g P · ${parsed.data.carbsG}g C · ${parsed.data.fatG}g G`,
      });
      onClose();
    } catch (err: any) {
      showAlert("Error", err?.message || "No se pudieron actualizar tus metas.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.overline}>PAUTA PERSONALIZADA</Text>
              <Text style={styles.title}>Ajustar metas diarias</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar editor de metas"
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Ingresa las cifras indicadas por tu nutricionista o vuelve al cálculo automático cuando quieras.
          </Text>

          <View style={styles.fieldBox}>
            <Text style={styles.fieldLabel}>Calorías diarias (kcal)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
              placeholder="2000"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.macrosRow}>
            <View style={styles.macroCol}>
              <Text style={[styles.fieldLabel, { color: colors.protein }]}>
                Proteína (g)
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={protein}
                onChangeText={setProtein}
                placeholder="140"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.macroCol}>
              <Text style={[styles.fieldLabel, { color: colors.carbs }]}>
                Carbos (g)
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={carbs}
                onChangeText={setCarbs}
                placeholder="200"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.macroCol}>
              <Text style={[styles.fieldLabel, { color: colors.fat }]}>
                Grasas (g)
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={fat}
                onChangeText={setFat}
                placeholder="60"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.atwaterHintBox}>
            <Sparkles size={14} color={colors.primaryDark} />
            <Text style={styles.atwaterHintText}>
              Tus gramos suman <Text style={{ fontWeight: "800" }}>{atwaterCalories} kcal</Text>
            </Text>
            <TouchableOpacity
              onPress={() => setCalories(String(atwaterCalories))}
              style={styles.syncCalPill}
            >
              <Text style={styles.syncCalText}>Usar {atwaterCalories}</Text>
            </TouchableOpacity>
          </View>

          {autoSuggested && (
            <TouchableOpacity
              style={styles.autoBtn}
              onPress={handleApplyAuto}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <RotateCcw size={14} color={colors.textSecondary} />
              <Text style={styles.autoBtnText}>
                Cargar cálculo automático ({autoSuggested.calories} kcal · {autoSuggested.proteinG}g P)
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={() => void handleSave()}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={17} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Guardar metas personalizadas</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(6, 15, 11, 0.62)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 22,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  overline: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: colors.primaryDark,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  fieldBox: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    minHeight: 46,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  macrosRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  macroCol: {
    flex: 1,
    minWidth: 0,
  },
  atwaterHintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryGhost,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  atwaterHintText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
  },
  syncCalPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  syncCalText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  autoBtn: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 13,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  autoBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  saveBtn: {
    minHeight: 50,
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...shadows.glow,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
