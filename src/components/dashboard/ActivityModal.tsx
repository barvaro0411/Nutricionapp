import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { showAlert } from "@/utils/alerts";
import { parseDecimal } from "@/utils/dates";
import { colors } from "@/constants/colors";

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
  const [cals, setCals] = useState(String(currentBurned));
  const [steps, setSteps] = useState(String(currentSteps));
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (visible) { setCals(String(currentBurned)); setSteps(String(currentSteps)); } }, [visible, currentBurned, currentSteps]);
  const handleSave = async () => {
    const parsedCals = parseDecimal(cals);
    const parsedSteps = parseDecimal(steps);

    if (!Number.isFinite(parsedCals) || parsedCals < 0 || parsedCals > 10000 || !Number.isInteger(parsedSteps) || parsedSteps < 0 || parsedSteps > 200000) { showAlert("Datos inválidos", "Revisa las calorías y los pasos."); return; }
    setSaving(true);
    try {
      await onSave(parsedCals, parsedSteps);
      onClose();
    } catch { showAlert("No se pudo guardar", "Revisa la conexión y vuelve a intentar."); } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>🏃 Actividad y Ejercicio</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Ingresa las calorías activas y los pasos del día seleccionado.
          </Text>

          {/* Entrada de Calorías Quemadas */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Calorías activas quemadas (kcal)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={cals}
              onChangeText={setCals}
              placeholder="350"
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
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  appleHealthBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF2F8", // Pink 50
    borderWidth: 1.5,
    borderColor: "#FBCFE8", // Pink 200
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  appleHealthIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  appleHealthTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#BE185D", // Pink 700
  },
  appleHealthDesc: {
    fontSize: 11,
    color: "#9D174D",
    marginTop: 2,
  },
  appleHealthAction: {
    fontSize: 13,
    fontWeight: "700",
    color: "#BE185D",
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
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
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
