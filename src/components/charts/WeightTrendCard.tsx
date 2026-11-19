import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  LayoutChangeEvent,
} from "react-native";
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
  Rect,
} from "react-native-svg";
import {
  Scale,
  Target,
  Plus,
  Check,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Calendar,
} from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";
import { WeightTrendStats, validateWeightKg } from "@/services/weightService";
import { parseDecimal, getDateKey, dateForMealRoute, APP_TIME_ZONE } from "@/utils/dates";
import {
  buildSmoothSvgPath,
  computeBmiSummary,
  computeWeeklyWeightRate,
} from "@/utils/trendInsights";
import { showAlert, showToast } from "@/utils/alerts";

interface WeightTrendCardProps {
  stats?: WeightTrendStats;
  heightCm?: number | null;
  onLogWeight: (params: { weightKg: number; date?: string }) => Promise<unknown>;
  onUpdateTarget: (targetKg: number) => Promise<unknown>;
  isSaving?: boolean;
}

const CHART_HEIGHT = 176;
const PAD_TOP = 20;
const PAD_BOTTOM = 28;
const PAD_LEFT = 40;
const PAD_RIGHT = 18;

export function WeightTrendCard({
  stats,
  heightCm,
  onLogWeight,
  onUpdateTarget,
  isSaving = false,
}: WeightTrendCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState(320);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const latestWeight = stats?.latestWeightKg ?? null;
  const startWeight = stats?.startWeightKg ?? null;
  const targetWeight = stats?.targetWeightKg ?? null;
  const deltaKg = stats?.deltaKg ?? 0;
  const remainingKg = stats?.remainingToGoalKg ?? null;
  const progressPercent = stats?.progressPercent ?? 0;
  const points = useMemo(() => stats?.points || [], [stats?.points]);

  // Mantener seleccionado el punto más reciente cuando cambian los puntos
  useEffect(() => {
    if (points.length > 0) {
      setSelectedIndex(points.length - 1);
    } else {
      setSelectedIndex(null);
    }
  }, [points.length]);

  const bmiSummary = useMemo(
    () => computeBmiSummary(latestWeight, heightCm),
    [latestWeight, heightCm]
  );

  const weeklyRate = useMemo(
    () => computeWeeklyWeightRate(points),
    [points]
  );

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
        message: `Guardamos ${wCheck.value} kg en tu seguimiento corporal.`,
      });
    } catch (err: any) {
      showAlert("No se pudo guardar", err?.message || "Inténtalo de nuevo.");
    }
  };

  const handleChartLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 120 && Math.abs(w - chartWidth) > 4) {
      setChartWidth(w);
    }
  };

  const isOnTrack =
    latestWeight !== null && targetWeight !== null
      ? (targetWeight <= (startWeight ?? latestWeight) && deltaKg <= 0) ||
        (targetWeight >= (startWeight ?? latestWeight) && deltaKg >= 0)
      : true;

  const goalReached =
    remainingKg !== null && Math.abs(remainingKg) <= 0.2;

  // Cálculo de geometría SVG
  const plotW = Math.max(120, chartWidth - PAD_LEFT - PAD_RIGHT);
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const {
    minVal,
    maxVal,
    svgCoords,
    projectedCoords,
    linePath,
    areaPath,
    projectedPath,
    targetY,
    yTicks,
  } = useMemo(() => {
    const rawValues = [
      ...points.map((p) => p.weightKg),
      ...points
        .map((p) => p.projectedKg)
        .filter((v): v is number => v !== null),
      ...(targetWeight !== null ? [targetWeight] : []),
    ];
    const minRaw = rawValues.length > 0 ? Math.min(...rawValues) : 65;
    const maxRaw = rawValues.length > 0 ? Math.max(...rawValues) : 75;
    const spread = Math.max(maxRaw - minRaw, 1.2);
    const pad = Math.max(0.6, spread * 0.22);
    const minV = Math.floor((minRaw - pad) * 2) / 2;
    const maxV = Math.ceil((maxRaw + pad) * 2) / 2;
    const span = Math.max(maxV - minV, 1);

    const toY = (val: number) =>
      PAD_TOP + plotH - ((val - minV) / span) * plotH;

    const toX = (idx: number) => {
      if (points.length <= 1) return PAD_LEFT + plotW / 2;
      return PAD_LEFT + (idx / (points.length - 1)) * plotW;
    };

    const coords = points.map((pt, idx) => ({
      x: toX(idx),
      y: toY(pt.weightKg),
    }));

    const projCoords = points
      .map((pt, idx) =>
        pt.projectedKg !== null
          ? { x: toX(idx), y: toY(pt.projectedKg) }
          : null
      )
      .filter((p): p is { x: number; y: number } => p !== null);

    const smoothLine = buildSmoothSvgPath(coords);
    const area =
      coords.length >= 2
        ? `${smoothLine} L ${coords[coords.length - 1].x.toFixed(1)} ${(PAD_TOP + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(PAD_TOP + plotH).toFixed(1)} Z`
        : "";

    const projLine =
      projCoords.length >= 2 ? buildSmoothSvgPath(projCoords) : "";

    const tY = targetWeight !== null ? toY(targetWeight) : null;
    const midV = Math.round(((minV + maxV) / 2) * 10) / 10;

    return {
      minVal: minV,
      maxVal: maxV,
      svgCoords: coords,
      projectedCoords: projCoords,
      linePath: smoothLine,
      areaPath: area,
      projectedPath: projLine,
      targetY: tY,
      yTicks: [
        { val: maxV, y: toY(maxV) },
        { val: midV, y: toY(midV) },
        { val: minV, y: toY(minV) },
      ],
    };
  }, [points, targetWeight, plotW, plotH]);

  const activeIdx =
    selectedIndex !== null && selectedIndex < points.length
      ? selectedIndex
      : points.length > 0
      ? points.length - 1
      : null;
  const activePoint = activeIdx !== null ? points[activeIdx] : null;
  const activeDeltaFromStart =
    activePoint && startWeight !== null
      ? Math.round((activePoint.weightKg - startWeight) * 10) / 10
      : null;

  const formatFullDate = (dateKey: string) => {
    if (dateKey === getDateKey()) return "Hoy";
    return dateForMealRoute(dateKey).toLocaleDateString("es-CL", {
      timeZone: APP_TIME_ZONE,
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  // Índices para mostrar etiquetas del eje X sin superposición
  const xLabelIndices = useMemo(() => {
    if (points.length <= 5) return points.map((_, i) => i);
    const mid = Math.floor((points.length - 1) / 2);
    return [0, mid, points.length - 1];
  }, [points]);

  return (
    <View style={styles.card}>
      {/* Cabecera */}
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <View style={styles.overlineRow}>
            <Scale size={15} color={colors.primary} />
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

      {/* Indicadores principales (3 KPIs enriquecidos) */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Peso actual</Text>
          <Text style={styles.kpiValue}>
            {latestWeight !== null ? `${latestWeight}` : "—"}
            <Text style={styles.kpiUnit}> kg</Text>
          </Text>
          {bmiSummary ? (
            <View
              style={[
                styles.bmiChip,
                bmiSummary.tone === "success"
                  ? styles.bmiChipSuccess
                  : bmiSummary.tone === "warning"
                  ? styles.bmiChipWarning
                  : styles.bmiChipDanger,
              ]}
            >
              <Text
                style={[
                  styles.bmiChipText,
                  bmiSummary.tone === "success"
                    ? styles.bmiChipTextSuccess
                    : bmiSummary.tone === "warning"
                    ? styles.bmiChipTextWarning
                    : styles.bmiChipTextDanger,
                ]}
                numberOfLines={1}
              >
                IMC {bmiSummary.bmi} · {bmiSummary.label}
              </Text>
            </View>
          ) : (
            <Text style={styles.kpiSub}>Último pesaje</Text>
          )}
        </View>

        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Cambio periodo</Text>
          <View style={styles.deltaRow}>
            {deltaKg < 0 ? (
              <TrendingDown size={15} color={isOnTrack ? colors.primary : colors.warning} />
            ) : deltaKg > 0 ? (
              <TrendingUp size={15} color={isOnTrack ? colors.primary : colors.warning} />
            ) : null}
            <Text
              style={[
                styles.kpiValue,
                deltaKg !== 0 && {
                  color: isOnTrack ? colors.primaryDark : colors.warning,
                },
              ]}
            >
              {deltaKg > 0 ? `+${deltaKg}` : `${deltaKg}`}
              <Text style={styles.kpiUnit}> kg</Text>
            </Text>
          </View>
          <Text style={styles.kpiSub} numberOfLines={1}>
            {weeklyRate !== null
              ? `${weeklyRate > 0 ? "+" : ""}${weeklyRate} kg/sem`
              : points.length === 1
              ? "Primer registro"
              : "Sin cambios"}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Editar meta de peso"
          onPress={openWeighModal}
          style={({ pressed }) => [
            styles.kpiBox,
            styles.kpiBoxInteractive,
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={styles.goalLabelRow}>
            <Target size={12} color={colors.primary} />
            <Text style={styles.kpiLabel}>Meta</Text>
          </View>
          <Text style={styles.kpiValue}>
            {targetWeight !== null ? `${targetWeight}` : "Definir"}
            {targetWeight !== null && <Text style={styles.kpiUnit}> kg</Text>}
          </Text>
          <Text style={styles.kpiSubPrimary} numberOfLines={1}>
            {goalReached
              ? "¡Alcanzada!"
              : remainingKg !== null
              ? `${remainingKg > 0 ? "Faltan " : "Sobran "}${Math.abs(remainingKg)} kg`
              : "Toca para fijar"}
          </Text>
        </Pressable>
      </View>

      {/* Barra de progreso hacia la meta */}
      {targetWeight !== null && latestWeight !== null && (
        <View style={styles.goalProgressBox}>
          <View style={styles.goalProgressHeader}>
            <Text style={styles.goalProgressTitle}>
              {goalReached ? "🎉 ¡Llegaste a tu peso objetivo!" : "Avance hacia tu meta"}
            </Text>
            <Text style={styles.goalProgressPct}>{progressPercent}%</Text>
          </View>
          <View style={styles.goalProgressTrack}>
            <View
              style={[
                styles.goalProgressFill,
                { width: `${Math.min(100, Math.max(goalReached ? 100 : 4, progressPercent))}%` },
              ]}
            />
          </View>
        </View>
      )}

      {/* Gráfico Vectorial SVG de Curva Suave */}
      {points.length > 0 ? (
        <View style={styles.chartWrapper} onLayout={handleChartLayout}>
          {/* Detalle del punto seleccionado */}
          {activePoint && (
            <View style={styles.selectedPointBar}>
              <View style={styles.selectedPointLeft}>
                <Calendar size={13} color={colors.primary} />
                <Text style={styles.selectedPointDate}>
                  {formatFullDate(activePoint.date)}
                </Text>
              </View>
              <View style={styles.selectedPointRight}>
                <Text style={styles.selectedPointKg}>{activePoint.weightKg} kg</Text>
                {activeDeltaFromStart !== null && activeIdx !== 0 && (
                  <View style={styles.selectedDeltaPill}>
                    <Text style={styles.selectedDeltaText}>
                      {activeDeltaFromStart > 0 ? "+" : ""}
                      {activeDeltaFromStart} kg vs inicio
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.svgContainer}>
            <Svg width={chartWidth} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.28" />
                  <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.01" />
                </LinearGradient>
              </Defs>

              {/* Líneas guía horizontales + etiquetas eje Y */}
              {yTicks.map((tick, i) => (
                <React.Fragment key={`${tick.val}-${i}`}>
                  <Line
                    x1={PAD_LEFT}
                    y1={tick.y}
                    x2={chartWidth - PAD_RIGHT}
                    y2={tick.y}
                    stroke={colors.cardBorder}
                    strokeWidth={1}
                    strokeDasharray={i === 1 ? "3 3" : undefined}
                  />
                  <SvgText
                    x={PAD_LEFT - 6}
                    y={tick.y + 3.5}
                    fontSize={10}
                    fontWeight="600"
                    fill={colors.textMuted}
                    textAnchor="end"
                  >
                    {tick.val.toFixed(1)}
                  </SvgText>
                </React.Fragment>
              ))}

              {/* Línea horizontal de Meta */}
              {targetY !== null && targetWeight !== null && (
                <>
                  <Line
                    x1={PAD_LEFT}
                    y1={targetY}
                    x2={chartWidth - PAD_RIGHT}
                    y2={targetY}
                    stroke={colors.warning}
                    strokeWidth={1.6}
                    strokeDasharray="5 4"
                  />
                  <Rect
                    x={chartWidth - PAD_RIGHT - 72}
                    y={Math.max(4, targetY - 17)}
                    width={72}
                    height={15}
                    rx={5}
                    fill={colors.warningLight}
                  />
                  <SvgText
                    x={chartWidth - PAD_RIGHT - 36}
                    y={Math.max(14.5, targetY - 6.5)}
                    fontSize={9}
                    fontWeight="800"
                    fill={colors.warning}
                    textAnchor="middle"
                  >
                    Meta {targetWeight} kg
                  </SvgText>
                </>
              )}

              {/* Área rellena degradada bajo la curva */}
              {areaPath ? <Path d={areaPath} fill="url(#weightAreaGrad)" /> : null}

              {/* Curva proyectada (referencia hacia la meta) */}
              {projectedPath && projectedCoords.length >= 2 ? (
                <Path
                  d={projectedPath}
                  fill="none"
                  stroke={colors.warning}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  opacity={0.75}
                />
              ) : null}

              {/* Curva real suavizada */}
              {linePath && svgCoords.length >= 2 ? (
                <Path
                  d={linePath}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {/* Puntos interactivos */}
              {svgCoords.map((pt, idx) => {
                const isSelected = idx === activeIdx;
                const isLatest = idx === svgCoords.length - 1;
                return (
                  <React.Fragment key={points[idx].date}>
                    {isSelected && (
                      <>
                        <Line
                          x1={pt.x}
                          y1={PAD_TOP}
                          x2={pt.x}
                          y2={PAD_TOP + plotH}
                          stroke={colors.primary}
                          strokeWidth={1}
                          strokeDasharray="3 3"
                          opacity={0.45}
                        />
                        <Circle
                          cx={pt.x}
                          cy={pt.y}
                          r={10}
                          fill={colors.primary}
                          opacity={0.18}
                        />
                      </>
                    )}
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 5.5 : isLatest ? 4.5 : 3.5}
                      fill={isSelected ? colors.primary : colors.card}
                      stroke={colors.primary}
                      strokeWidth={2.2}
                      onPress={() => setSelectedIndex(idx)}
                    />
                  </React.Fragment>
                );
              })}

              {/* Etiquetas de fecha en eje X */}
              {xLabelIndices.map((idx) => {
                const coord = svgCoords[idx];
                const pt = points[idx];
                if (!coord || !pt) return null;
                return (
                  <SvgText
                    key={`xlabel-${pt.date}`}
                    x={coord.x}
                    y={CHART_HEIGHT - 8}
                    fontSize={10}
                    fontWeight={idx === activeIdx ? "800" : "600"}
                    fill={idx === activeIdx ? colors.primaryDark : colors.textSecondary}
                    textAnchor={
                      points.length === 1
                        ? "middle"
                        : idx === 0
                        ? "start"
                        : idx === points.length - 1
                        ? "end"
                        : "middle"
                    }
                  >
                    {pt.date === getDateKey() ? "Hoy" : pt.label}
                  </SvgText>
                );
              })}
            </Svg>

            {/* Áreas táctiles accesibles sobre los puntos para móvil y web */}
            <View style={styles.touchOverlay} pointerEvents="box-none">
              {svgCoords.map((pt, idx) => (
                <Pressable
                  key={`hit-${points[idx].date}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatFullDate(points[idx].date)}: ${points[idx].weightKg} kg`}
                  accessibilityState={{ selected: idx === activeIdx }}
                  onPress={() => setSelectedIndex(idx)}
                  style={[
                    styles.pointHitTarget,
                    { left: Math.max(0, pt.x - 18), top: Math.max(0, pt.y - 18) },
                  ]}
                />
              ))}
            </View>
          </View>

          {points.length === 1 && (
            <View style={styles.singlePointHint}>
              <Sparkles size={13} color={colors.primary} />
              <Text style={styles.singlePointHintText}>
                Registra un segundo pesaje en unos días para trazar tu curva de evolución real.
              </Text>
            </View>
          )}

          {/* Leyenda */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>Peso real ({minVal}–{maxVal} kg)</Text>
            </View>
            {targetWeight !== null && (
              <View style={styles.legendItem}>
                <View style={styles.legendDashed} />
                <Text style={styles.legendText}>Referencia hacia meta</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrar primer peso"
          onPress={openWeighModal}
          style={styles.emptyBox}
        >
          <Sparkles size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.emptyTitle}>Comienza tu curva corporal</Text>
            <Text style={styles.emptyText}>
              Registra tu primer pesaje para visualizar tu evolución, ritmo semanal e IMC hacia tu meta.
            </Text>
          </View>
        </Pressable>
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
                accessibilityLabel="Restar 0.5 kg"
                onPress={() => adjustWeightStep(-0.5)}
                style={styles.stepBtnSmall}
              >
                <Text style={styles.stepBtnText}>-0,5</Text>
              </Pressable>
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sumar 0.5 kg"
                onPress={() => adjustWeightStep(0.5)}
                style={styles.stepBtnSmall}
              >
                <Text style={styles.stepBtnText}>+0,5</Text>
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
    minWidth: 0,
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
    color: colors.primary,
    letterSpacing: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
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
    ...shadows.glow,
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
    minWidth: 0,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: "space-between",
  },
  kpiBoxInteractive: {
    backgroundColor: colors.primaryGhost,
    borderColor: colors.cardBorder,
  },
  goalLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  kpiUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  kpiSub: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 4,
  },
  kpiSubPrimary: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primaryDark,
    marginTop: 4,
  },
  bmiChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    maxWidth: "100%",
  },
  bmiChipSuccess: { backgroundColor: colors.successLight },
  bmiChipWarning: { backgroundColor: colors.warningLight },
  bmiChipDanger: { backgroundColor: colors.dangerLight },
  bmiChipText: { fontSize: 9.5, fontWeight: "800" },
  bmiChipTextSuccess: { color: colors.primaryDark },
  bmiChipTextWarning: { color: colors.warning },
  bmiChipTextDanger: { color: colors.danger },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  goalProgressBox: {
    backgroundColor: colors.primaryGhost,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 14,
  },
  goalProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  goalProgressTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.text,
  },
  goalProgressPct: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  goalProgressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  goalProgressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  chartWrapper: {
    marginTop: 2,
  },
  selectedPointBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  selectedPointLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectedPointDate: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    textTransform: "capitalize",
  },
  selectedPointRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedPointKg: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.primaryDark,
  },
  selectedDeltaPill: {
    backgroundColor: colors.card,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  selectedDeltaText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  svgContainer: {
    position: "relative",
    width: "100%",
    height: CHART_HEIGHT,
  },
  touchOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pointHitTarget: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  singlePointHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.primaryGhost,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  singlePointHintText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
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
  legendLine: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendDashed: {
    width: 14,
    borderTopWidth: 2,
    borderTopColor: colors.warning,
    borderStyle: "dashed",
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 420,
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
    gap: 6,
    marginBottom: 16,
  },
  stepBtn: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  stepBtnSmall: {
    backgroundColor: colors.primaryGhost,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  stepBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.text,
  },
  weightInputBox: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    paddingHorizontal: 8,
    height: 48,
  },
  weightInput: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.text,
    textAlign: "center",
    minWidth: 56,
    flex: 1,
  },
  weightUnit: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    marginLeft: 2,
  },
  targetInput: {
    backgroundColor: colors.surfaceMuted,
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
