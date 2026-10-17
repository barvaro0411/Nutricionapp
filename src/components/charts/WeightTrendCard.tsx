import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Scale, Target, Plus, Check, TrendingDown, TrendingUp } from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";
import { WeightTrendStats, validateWeightKg } from "@/services/weightService";
import { parseDecimal, getDateKey } from "@/utils/dates";
import { showAlert, showToast } from "@/utils/alerts";

interface WeightTrendCardProps {
  stats?: WeightTrendStats;
  onLogWeight: (params: { weightKg: number; date?: string }) => Promise<unknown>;
  onUpdateTarget: (targetKg: number) => Promise<unknown>;
  isSaving?: boolean;
}

export function WeightTrendCard({
  stats,
  onLogWeight,
  onUpdateTarget,
  isSaving = false,
}: WeightTrendCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const latestWeight = stats?.latestWeightKg ?? null;
  const targetWeight = stats?.targetWeightKg ?? null;
  const deltaKg = stats?.deltaKg ?? 0;
  const points = stats?.points || [];

  const openWeighModal = () => {
    setWeightInput(latestWeight ? String(latestWeight) : "70");
    setTargetInput(targetWeight ? String(targetWeight) : "");
    setErrorMsg(null);
    setShowModal(true);
  };

  const adjustWeightStep = (delta: number) => {
    const current = parseDecimal(weightInput) || latestWeight || 70;
    const next = Math.max(30, Math.min(300, Math.round((current + delta) * 10) / 10));
    setWeightInput(String(next));
    setErrorMsg(null);
  };

  const handleSave = async () => {
    const wCheck = validateWeightKg(weightInput);
    if (!wCheck.ok) {
      setErrorMsg(wCheck.error);
      return;
    }

    if (targetInput.trim().length > 0) {
      const tCheck = validateWeightKg(targetInput);
      if (!tCheck.ok) {
        setErrorMsg("Meta: " + tCheck.error);
        return;
      }
      await onUpdateTarget(tCheck.value);
    }

    try {
      await onLogWeight({ weightKg: wCheck.value, date: getDateKey() });
      setShowModal(false);
      showToast({
        type: "success",
        title: "Peso registrado",
        message: `Guardamos ${wCheck.value} kg en tu progreso de hoy.`,
      });
    } catch (err: any) {
      showAlert("No se pudo guardar", err?.message || "Inténtalo de nuevo.");
    }
  };

  // Escala del gráfico para que las variaciones de peso (ej: 72.0 a 75.5 kg) se aprecien con claridad
  const allValues = [
    ...points.map((p) => p.weightKg),
    ...(targetWeight !== null ? [targetWeight] : []),
  ];
  const minVal = allValues.length > 0 ? Math.min(...allValues) - 1.5 : 60;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) + 1.5 : 80;
  const range = Math.max(maxVal - minVal, 2);

  const targetBottomPct =
    targetWeight !== null
      ? Math.max(6, Math.min(94, ((targetWeight - minVal) / range) * 100))
      : null;

  const isOnTrack =
    latestWeight !== null && targetWeight !== null
      ? (targetWeight <= (stats?.startWeightKg ?? latestWeight) && deltaKg <= 0) ||
        (targetWeight >= (stats?.startWeightKg ?? latestWeight) && deltaKg >= 0)
      : true;

  return (
    <View style={styles.card}>
      {/* Cabecera */}
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <View style={styles.overlineRow}>
            <Scale size={16} color={colors.primary} />
            <Text style={styles.overline}>SEGUIMIENTO CORPORAL</Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Peso y curva hacia tu meta
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pesarme hoy"
          onPress={openWeighModal}
          style={({ pressed }) => [styles.weighBtn, pressed && { opacity: 0.85 }]}
        >
          <Plus size={15} color="#FFFFFF" />
          <Text style={styles.weighBtnText}>Pesarme hoy</Text>
        </Pressable>
      </View>

      {/* Indicadores principales */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Peso actual</Text>
          <Text style={styles.kpiValue}>
            {latestWeight !== null ? `${latestWeight}` : "—"}
            <Text style={styles.kpiUnit}> kg</Text>
          </Text>
        </View>

        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Cambio periodo</Text>
          <View style={styles.deltaRow}>
            {deltaKg < 0 ? (
              <TrendingDown size={15} color={colors.primary} />
            ) : deltaKg > 0 ? (
              <TrendingUp size={15} color={isOnTrack ? colors.primary : colors.warning} />
            ) : null}
            <Text
              style={[
                styles.kpiValue,
                deltaKg !== 0 && { color: isOnTrack ? colors.primaryDark : colors.text },
              ]}
            >
              {deltaKg > 0 ? `+${deltaKg}` : `${deltaKg}`}
              <Text style={styles.kpiUnit}> kg</Text>
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Editar meta de peso"
          onPress={openWeighModal}
          style={styles.kpiBox}
        >
          <View style={styles.goalLabelRow}>
            <Target size={12} color={colors.primary} />
            <Text style={styles.kpiLabel}>Meta</Text>
          </View>
          <Text style={styles.kpiValue}>
            {targetWeight !== null ? `${targetWeight}` : "Definir"}
            {targetWeight !== null && <Text style={styles.kpiUnit}> kg</Text>}
          </Text>
        </Pressable>
      </View>

      {/* Gráfico de tendencia vs proyección */}
      {points.length > 0 ? (
        <View style={styles.chartWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={points.length > 7}>
            <View style={[styles.chartArea, points.length > 7 && { minWidth: points.length * 48 }]}>
              {points.map((pt, idx) => {
                const isLatest = idx === points.length - 1;
                const fillPct = Math.max(
                  10,
                  Math.min(95, ((pt.weightKg - minVal) / range) * 100)
                );
                const projectedPct =
                  pt.projectedKg !== null
                    ? Math.max(8, Math.min(95, ((pt.projectedKg - minVal) / range) * 100))
                    : null;

                return (
                  <View key={pt.date} style={styles.column}>
                    <Text style={[styles.pointValue, isLatest && styles.pointValueLatest]}>
                      {pt.weightKg}
                    </Text>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${fillPct}%`,
                            backgroundColor: isLatest ? colors.primary : "#86EFAC",
                          },
                        ]}
                      />
                      {projectedPct !== null && (
                        <View
                          style={[
                            styles.projectedDot,
                            { bottom: `${projectedPct}%` },
                          ]}
                        />
                      )}
                      {targetBottomPct !== null && (
                        <View style={[styles.targetLine, { bottom: `${targetBottomPct}%` }]} />
                      )}
                    </View>
                    <Text style={[styles.dateLabel, isLatest && styles.dateLabelLatest]}>
                      {pt.date === getDateKey() ? "Hoy" : pt.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>Peso real (kg)</Text>
            </View>
            {targetWeight !== null && (
              <View style={styles.legendItem}>
                <View style={styles.legendProjectedDot} />
                <Text style={styles.legendText}>
                  Curva proyectada hacia {targetWeight} kg
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Registra tu primer pesaje para visualizar tu curva de evolución hacia tu meta.
          </Text>
        </View>
      )}

      {/* Modal "Pesarme hoy" */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>⚖️ Pesarme hoy</Text>
            <Text style={styles.modalSub}>
              Registra tu peso en ayunas o a la misma hora del día para una tendencia más precisa.
            </Text>

            <Text style={styles.fieldLabel}>Peso de hoy (kg)</Text>
            <View style={styles.stepperRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restar 0.1 kg"
                onPress={() => adjustWeightStep(-0.1)}
                style={styles.stepBtn}
              >
                <Text style={styles.stepBtnText}>-0,1</Text>
              </Pressable>

              <View style={styles.weightInputBox}>
                <TextInput
                  style={styles.weightInput}
                  value={weightInput}
                  onChangeText={(txt) => {
                    setWeightInput(txt);
                    setErrorMsg(null);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="70.0"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Peso en kilogramos"
                />
                <Text style={styles.weightUnit}>kg</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sumar 0.1 kg"
                onPress={() => adjustWeightStep(0.1)}
                style={styles.stepBtn}
              >
                <Text style={styles.stepBtnText}>+0,1</Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Peso meta objetivo (kg)</Text>
            <TextInput
              style={styles.targetInput}
              value={targetInput}
              onChangeText={(txt) => {
                setTargetInput(txt);
                setErrorMsg(null);
              }}
              keyboardType="decimal-pad"
              placeholder="Ej: 68.0"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Meta de peso en kilogramos"
            />

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowModal(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Guardar peso de hoy"
                disabled={isSaving}
                onPress={() => void handleSave()}
                style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Guardar peso</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 22,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  titleBlock: {
    flex: 1,
  },
  overlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  overline: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  weighBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    minHeight: 40,
  },
  weighBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  goalLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  kpiUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chartWrapper: {
    marginTop: 4,
  },
  chartArea: {
    flexDirection: "row",
    minWidth: "100%",
    paddingVertical: 6,
  },
  column: {
    flex: 1,
    minWidth: 44,
    alignItems: "center",
  },
  pointValue: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  pointValueLatest: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  track: {
    width: 18,
    height: 110,
    backgroundColor: colors.background,
    borderRadius: 9,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    borderRadius: 9,
  },
  projectedDot: {
    position: "absolute",
    left: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  targetLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderTopColor: "#F59E0B",
    borderStyle: "dashed",
  },
  dateLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 6,
    fontWeight: "600",
  },
  dateLabelLatest: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendProjectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  stepBtn: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  stepBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  weightInputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    height: 48,
  },
  weightInput: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    textAlign: "center",
    minWidth: 70,
  },
  weightUnit: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
    marginLeft: 4,
  },
  targetInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
