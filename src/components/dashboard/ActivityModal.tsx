import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { showAlert } from "@/utils/alerts";
import { parseDecimal } from "@/utils/dates";
import { colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  EXERCISE_DURATIONS,
  EXERCISE_PRESETS,
  ExercisePresetId,
  estimateExerciseBurn,
} from "@/utils/exerciseCalculator";

interface ActivityModalProps {
  visible: boolean;
  currentBurned: number;
  currentSteps: number;
  onClose: () => void;
  onSave: (calories: number, steps: number) => Promise<void>;
}

export function ActivityModal({
  visible,
  currentBurned,
  currentSteps,
  onClose,
  onSave,
}: ActivityModalProps) {
  const profileWeight = useAuthStore((s) => s.profile?.current_weight_kg);
  const [cals, setCals] = useState(String(currentBurned));
  const [steps, setSteps] = useState(String(currentSteps));
  const [selectedPreset, setSelectedPreset] = useState<ExercisePresetId | null>(null);
  const [durationMin, setDurationMin] = useState<number>(45);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCals(String(currentBurned));
      setSteps(String(currentSteps));
      setSelectedPreset(null);
    }
  }, [visible, currentBurned, currentSteps]);

  const applyEstimate = (presetId: ExercisePresetId, minutes: number) => {
    setSelectedPreset(presetId);
    setDurationMin(minutes);
    const { calories, estimatedSteps } = estimateExerciseBurn({
      presetId,
      durationMinutes: minutes,
      weightKg: profileWeight,
    });
    setCals(String(calories));
    if (estimatedSteps > 0 && (parseDecimal(steps) || 0) === 0) {
      setSteps(String(estimatedSteps));
    }
  };

  const handleSave = async () => {
    const parsedCals = parseDecimal(cals);
    const parsedSteps = parseDecimal(steps);

    if (
      !Number.isFinite(parsedCals) ||
      parsedCals < 0 ||
      parsedCals > 10000 ||
      !Number.isInteger(parsedSteps) ||
      parsedSteps < 0 ||
      parsedSteps > 200000
    ) {
      showAlert("Datos inválidos", "Revisa las calorías y los pasos.");
      return;
    }
    setSaving(true);
    try {
      await onSave(parsedCals, parsedSteps);
      onClose();
    } catch {
      showAlert("No se pudo guardar", "Revisa la conexión y vuelve a intentar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>🏃 Actividad y Ejercicio</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal de actividad"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Elige un deporte para estimar según tu peso ({profileWeight ? `${profileWeight} kg` : "70 kg"}) o ingresa los datos de tu reloj.
          </Text>

          {/* Calculadora rápida por deporte */}
          <Text style={styles.sectionSmallLabel}>ESTIMAR RÁPIDO POR DEPORTE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsScroll}
            style={{ marginBottom: 10 }}
          >
            {EXERCISE_PRESETS.map((preset) => {
              const active = selectedPreset === preset.id;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetChip, active && styles.presetChipActive]}
                  onPress={() => applyEstimate(preset.id, durationMin)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                  <Text
                    style={[
                      styles.presetChipText,
                      active && styles.presetChipTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedPreset && (
            <View style={styles.durationsRow}>
              {EXERCISE_DURATIONS.map((min) => {
                const active = durationMin === min;
                return (
                  <TouchableOpacity
                    key={min}
                    style={[
                      styles.durationPill,
                      active && styles.durationPillActive,
                    ]}
                    onPress={() => applyEstimate(selectedPreset, min)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        active && styles.durationTextActive,
                      ]}
                    >
                      {min} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Entrada de Calorías Quemadas */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Calorías activas quemadas (kcal)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={cals}
              onChangeText={setCals}
              placeholder="350"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Entrada de Pasos */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pasos caminados hoy</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={steps}
              onChangeText={setSteps}
              placeholder="7500"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar Actividad</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(6, 15, 11, 0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  sectionSmallLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.primaryDark,
    marginBottom: 8,
  },
  presetsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  presetChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  presetEmoji: {
    fontSize: 15,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  durationsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  durationPill: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  durationPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  durationTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  saveBtn: {
    minHeight: 50,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
