import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from "react-native";
import { Scale, Target, X, Check, Sparkles } from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";
import { validateWeightKg } from "@/services/weightService";
import { parseDecimal } from "@/utils/dates";

interface QuickWeightModalProps {
  visible: boolean;
  onClose: () => void;
  currentWeightKg: number | null;
  targetWeightKg?: number | null;
  onSave: (newWeightKg: number, newTargetKg?: number) => Promise<void>;
  onRecalculateGoals?: () => void;
}

export function QuickWeightModal({
  visible,
  onClose,
  currentWeightKg,
  targetWeightKg,
  onSave,
  onRecalculateGoals,
}: QuickWeightModalProps) {
  const [weightText, setWeightText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      setWeightText(currentWeightKg ? String(currentWeightKg) : "");
      setTargetText(targetWeightKg ? String(targetWeightKg) : "");
      setError(null);
      setSavedSuccess(false);
    }
  }, [visible, currentWeightKg, targetWeightKg]);

  const handleAdjustWeight = (delta: number) => {
    const current = parseDecimal(weightText) || currentWeightKg || 70;
    const next = Math.max(30, Math.min(300, Math.round((current + delta) * 10) / 10));
    setWeightText(String(next));
  };

  const handleSave = async () => {
    setError(null);
    const weightValidation = validateWeightKg(weightText);
    if (!weightValidation.ok) {
      setError(weightValidation.error);
      return;
    }

    let parsedTarget: number | undefined;
    if (targetText.trim()) {
      const targetValidation = validateWeightKg(targetText);
      if (!targetValidation.ok) {
        setError("Meta de peso inválida (entre 30 y 300 kg).");
        return;
      }
      parsedTarget = targetValidation.value;
    }

    setLoading(true);
    try {
      await onSave(weightValidation.value, parsedTarget);
      setSavedSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el peso.");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.modalCard}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerIconWrap}>
                  <Scale size={20} color={colors.primary} />
                </View>
                <View style={styles.headerTitleWrap}>
                  <Text style={styles.headerTitle}>Actualizar peso de hoy</Text>
                  <Text style={styles.headerSubtitle}>
                    Tu peso nos permite calibrar tu gasto diario exacto
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar ventana"
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {savedSuccess ? (
                <View style={styles.successContainer}>
                  <View style={styles.successIcon}>
                    <Check size={28} color="#10B981" />
                  </View>
                  <Text style={styles.successTitle}>¡Peso actualizado con éxito!</Text>
                  <Text style={styles.successDesc}>
                    Se guardó {weightText} kg en tu registro corporal de hoy.
                  </Text>
                  {onRecalculateGoals && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.recalculateBtn}
                      onPress={() => {
                        onClose();
                        onRecalculateGoals();
                      }}
                    >
                      <Sparkles size={16} color="#FFFFFF" />
                      <Text style={styles.recalculateBtnText}>
                        Recalcular mis metas con este peso
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.finishBtn}
                    onPress={onClose}
                  >
                    <Text style={styles.finishBtnText}>Listo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.formContainer}>
                  {/* Input de peso actual */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>PESO ACTUAL (KG)</Text>
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={styles.weightInput}
                        keyboardType="decimal-pad"
                        value={weightText}
                        onChangeText={setWeightText}
                        placeholder="70.0"
                        placeholderTextColor={colors.textMuted}
                        maxLength={5}
                        autoFocus
                      />
                      <Text style={styles.inputSuffix}>kg</Text>
                    </View>
                  </View>

                  {/* Botones de ajuste rápido */}
                  <View style={styles.quickAdjustRow}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Restar medio kilo"
                      style={styles.adjustChip}
                      onPress={() => handleAdjustWeight(-0.5)}
                    >
                      <Text style={styles.adjustChipText}>-0.5 kg</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Restar cien gramos"
                      style={styles.adjustChip}
                      onPress={() => handleAdjustWeight(-0.1)}
                    >
                      <Text style={styles.adjustChipText}>-0.1 kg</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Sumar cien gramos"
                      style={styles.adjustChip}
                      onPress={() => handleAdjustWeight(0.1)}
                    >
                      <Text style={styles.adjustChipText}>+0.1 kg</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Sumar medio kilo"
                      style={styles.adjustChip}
                      onPress={() => handleAdjustWeight(0.5)}
                    >
                      <Text style={styles.adjustChipText}>+0.5 kg</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Input opcional de peso meta */}
                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabel}>META DE PESO (OPCIONAL)</Text>
                      <Target size={13} color={colors.textSecondary} />
                    </View>
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={styles.targetInput}
                        keyboardType="decimal-pad"
                        value={targetText}
                        onChangeText={setTargetText}
                        placeholder={targetWeightKg ? String(targetWeightKg) : "Ej: 68.0"}
                        placeholderTextColor={colors.textMuted}
                        maxLength={5}
                      />
                      <Text style={styles.inputSuffix}>kg</Text>
                    </View>
                  </View>

                  {error && (
                    <Text accessibilityRole="alert" style={styles.errorText}>
                      {error}
                    </Text>
                  )}

                  {/* Acciones */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.cancelBtn}
                      onPress={onClose}
                      disabled={loading}
                    >
                      <Text style={styles.cancelBtnText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.saveBtn}
                      onPress={handleSave}
                      disabled={loading || !weightText.trim()}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Check size={16} color="#FFFFFF" />
                          <Text style={styles.saveBtnText}>Guardar peso</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
  modalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  formContainer: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
  },
  weightInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  targetInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
    marginLeft: 6,
  },
  quickAdjustRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  adjustChip: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 7,
    alignItems: "center",
  },
  adjustChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1.4,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  successDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
  recalculateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 6,
    width: "100%",
    justifyContent: "center",
  },
  recalculateBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  finishBtn: {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  finishBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
