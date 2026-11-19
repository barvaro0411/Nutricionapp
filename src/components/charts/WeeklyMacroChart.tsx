import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
import { BarChart3, Activity, CheckCircle2 } from "lucide-react-native";
import { DayStat, ProgressMetric } from "@/utils/progressStats";
import {
  buildSmoothSvgPath,
  computeMetricTrendInsights,
  formatCompactMetricValue,
  isDayOnMetricTarget,
} from "@/utils/trendInsights";
import { colors } from "@/constants/colors";

interface Props {
  days: DayStat[];
  metric: ProgressMetric;
  target?: number;
  color: string;
  unit: string;
  selectedDate: string;
  onSelectDay: (day: DayStat) => void;
}

const LINE_HEIGHT = 172;
const PAD_TOP = 18;
const PAD_BOTTOM = 26;
const PAD_LEFT = 38;
const PAD_RIGHT = 14;
const BAR_TRACK_HEIGHT = 132;

export function WeeklyMacroChart({
  days,
  metric,
  target,
  color,
  unit,
  selectedDate,
  onSelectDay,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [chartMode, setChartMode] = useState<"bars" | "line">("bars");
  const [lineWidth, setLineWidth] = useState(320);

  const hasTarget = target !== undefined && target > 0;
  const compactMode = days.length > 7;

  const insights = useMemo(
    () => computeMetricTrendInsights(days, metric, target),
    [days, metric, target]
  );

  const maxVal = useMemo(() => {
    const rawMax = Math.max(
      hasTarget ? target * 1.18 : 0,
      ...days.map((day) => day[metric]),
      1
    );
    return rawMax;
  }, [days, metric, hasTarget, target]);

  const targetPctFromBottom = hasTarget
    ? Math.min(96, Math.max(4, (target / maxVal) * 100))
    : null;

  const handleLineLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 120 && Math.abs(w - lineWidth) > 4) {
      setLineWidth(w);
    }
  };

  // Geometría para vista de Línea SVG
  const plotW = Math.max(120, lineWidth - PAD_LEFT - PAD_RIGHT);
  const plotH = LINE_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const { coords, loggedPath, areaPath, targetY, yTicks } = useMemo(() => {
    const toY = (v: number) => PAD_TOP + plotH - (v / maxVal) * plotH;
    const toX = (idx: number) => {
      if (days.length <= 1) return PAD_LEFT + plotW / 2;
      return PAD_LEFT + (idx / (days.length - 1)) * plotW;
    };

    const allCoords = days.map((d, idx) => ({
      x: toX(idx),
      y: toY(d[metric]),
      day: d,
    }));

    const activeCoords = allCoords.filter((c) => c.day.mealCount > 0);
    const smooth = buildSmoothSvgPath(activeCoords);
    const area =
      activeCoords.length >= 2
        ? `${smooth} L ${activeCoords[activeCoords.length - 1].x.toFixed(1)} ${(PAD_TOP + plotH).toFixed(1)} L ${activeCoords[0].x.toFixed(1)} ${(PAD_TOP + plotH).toFixed(1)} Z`
        : "";

    const tY = hasTarget ? toY(target) : null;
    return {
      coords: allCoords,
      loggedPath: smooth,
      areaPath: area,
      targetY: tY,
      yTicks: [
        { val: maxVal, y: toY(maxVal) },
        { val: maxVal / 2, y: toY(maxVal / 2) },
        { val: 0, y: toY(0) },
      ],
    };
  }, [days, metric, maxVal, hasTarget, target, plotW, plotH]);

  const xLabelIndices = useMemo(() => {
    if (days.length <= 7) return days.map((_, i) => i);
    const step = Math.ceil(days.length / 6);
    const indices: number[] = [];
    for (let i = 0; i < days.length; i += step) indices.push(i);
    if (indices[indices.length - 1] !== days.length - 1) {
      indices.push(days.length - 1);
    }
    return indices;
  }, [days]);

  const gradId = `macroGrad_${metric}`;

  return (
    <View>
      {/* Cabecera de Insights + Toggle Barras/Línea */}
      <View style={styles.topStatsRow}>
        <View style={styles.insightPillsRow}>
          <View style={styles.insightPill}>
            <Text style={styles.insightPillLabel}>PROMEDIO</Text>
            <View style={styles.insightPillValueRow}>
              <Text style={styles.insightPillValue}>
                {insights.average.toLocaleString("es-CL")} {unit}
              </Text>
              {insights.targetPct !== null && (
                <View style={[styles.pctTag, { backgroundColor: colors.primaryLight }]}>
                  <Text style={styles.pctTagText}>{insights.targetPct}%</Text>
                </View>
              )}
            </View>
          </View>

          {hasTarget && (
            <View style={styles.insightPill}>
              <Text style={styles.insightPillLabel}>EN META</Text>
              <View style={styles.insightPillValueRow}>
                <CheckCircle2 size={13} color={colors.primary} />
                <Text style={styles.insightPillValue}>
                  {insights.daysOnTarget}/{insights.loggedDays} días
                </Text>
              </View>
            </View>
          )}

          {insights.peakDay && (
            <View style={styles.insightPill}>
              <Text style={styles.insightPillLabel}>PICO</Text>
              <Text style={styles.insightPillValue}>
                {Math.round(insights.peakDay[metric]).toLocaleString("es-CL")} {unit}
              </Text>
            </View>
          )}
        </View>

        {/* Toggle Barras / Curva */}
        <View style={styles.modeToggle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver gráfico de barras"
            accessibilityState={{ selected: chartMode === "bars" }}
            onPress={() => setChartMode("bars")}
            style={[styles.modeBtn, chartMode === "bars" && styles.modeBtnActive]}
          >
            <BarChart3
              size={14}
              color={chartMode === "bars" ? "#FFFFFF" : colors.textSecondary}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver gráfico de curva"
            accessibilityState={{ selected: chartMode === "line" }}
            onPress={() => setChartMode("line")}
            style={[styles.modeBtn, chartMode === "line" && styles.modeBtnActive]}
          >
            <Activity
              size={14}
              color={chartMode === "line" ? "#FFFFFF" : colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      {/* Vista Barras */}
      {chartMode === "bars" ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={compactMode}
          onContentSizeChange={() => {
            if (compactMode) scrollRef.current?.scrollToEnd({ animated: false });
          }}
        >
          <View
            style={[
              styles.barsOuter,
              compactMode && { minWidth: days.length * 44 },
            ]}
          >
            {/* Línea de meta continua a través de todo el gráfico */}
            {hasTarget && targetPctFromBottom !== null && (
              <View
                pointerEvents="none"
                style={[
                  styles.continuousTargetLine,
                  {
                    top:
                      30 +
                      BAR_TRACK_HEIGHT * (1 - targetPctFromBottom / 100),
                  },
                ]}
              >
                <View style={styles.targetDashedBar} />
                <View style={styles.targetTag}>
                  <Text style={styles.targetTagText}>
                    Meta {Math.round(target)} {unit}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.chartArea}>
              {days.map((day) => {
                const selected = day.date === selectedDate;
                const onTarget = isDayOnMetricTarget(day[metric], metric, target);
                const pctHeight =
                  day[metric] > 0
                    ? Math.max((day[metric] / maxVal) * 100, 3)
                    : 0;

                return (
                  <Pressable
                    key={day.date}
                    accessibilityRole="button"
                    accessibilityLabel={`${day.dayLabel} ${day.date}: ${
                      day.mealCount
                        ? `${Math.round(day[metric])} ${unit}`
                        : "sin registros"
                    }`}
                    accessibilityState={{ selected }}
                    onPress={() => onSelectDay(day)}
                    aria-pressed={selected}
                    style={[styles.column, selected && styles.selected]}
                  >
                    <Text
                      style={[
                        styles.value,
                        selected && { color: colors.text, fontWeight: "800" },
                      ]}
                      numberOfLines={1}
                    >
                      {day.mealCount
                        ? formatCompactMetricValue(day[metric], compactMode)
                        : "—"}
                    </Text>

                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          {
                            height: `${pctHeight}%`,
                            backgroundColor: color,
                            opacity: selected ? 1 : day.mealCount ? 0.72 : 0,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.dayFooter}>
                      <View
                        style={[
                          styles.statusDot,
                          onTarget
                            ? { backgroundColor: colors.primary }
                            : day.mealCount > 0
                            ? { backgroundColor: colors.cardBorderHover }
                            : { backgroundColor: "transparent" },
                        ]}
                      />
                      <Text
                        style={[
                          styles.day,
                          selected && { color: colors.primaryDark },
                        ]}
                      >
                        {day.dayLabel}
                      </Text>
                      <Text style={styles.date}>{Number(day.date.slice(8))}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      ) : (
        /* Vista Curva Vectorial SVG */
        <View style={styles.lineContainer} onLayout={handleLineLayout}>
          <Svg width={lineWidth} height={LINE_HEIGHT}>
            <Defs>
              <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={color} stopOpacity="0.28" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </LinearGradient>
            </Defs>

            {/* Rejilla y eje Y */}
            {yTicks.map((t, i) => (
              <React.Fragment key={i}>
                <Line
                  x1={PAD_LEFT}
                  y1={t.y}
                  x2={lineWidth - PAD_RIGHT}
                  y2={t.y}
                  stroke={colors.cardBorder}
                  strokeWidth={1}
                  strokeDasharray={i === 1 ? "3 3" : undefined}
                />
                <SvgText
                  x={PAD_LEFT - 6}
                  y={t.y + 3.5}
                  fontSize={9.5}
                  fontWeight="600"
                  fill={colors.textMuted}
                  textAnchor="end"
                >
                  {formatCompactMetricValue(t.val, true)}
                </SvgText>
              </React.Fragment>
            ))}

            {/* Línea de meta */}
            {targetY !== null && hasTarget && (
              <>
                <Line
                  x1={PAD_LEFT}
                  y1={targetY}
                  x2={lineWidth - PAD_RIGHT}
                  y2={targetY}
                  stroke={colors.textSecondary}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                />
                <Rect
                  x={lineWidth - PAD_RIGHT - 68}
                  y={Math.max(2, targetY - 16)}
                  width={68}
                  height={14}
                  rx={5}
                  fill={colors.surfaceMuted}
                />
                <SvgText
                  x={lineWidth - PAD_RIGHT - 34}
                  y={Math.max(12, targetY - 6)}
                  fontSize={8.5}
                  fontWeight="800"
                  fill={colors.textSecondary}
                  textAnchor="middle"
                >
                  Meta {Math.round(target)}
                </SvgText>
              </>
            )}

            {/* Relleno y curva suavizada */}
            {areaPath ? <Path d={areaPath} fill={`url(#${gradId})`} /> : null}
            {loggedPath ? (
              <Path
                d={loggedPath}
                fill="none"
                stroke={color}
                strokeWidth={2.6}
                strokeLinecap="round"
              />
            ) : null}

            {/* Puntos de días con registro */}
            {coords.map((c) => {
              if (c.day.mealCount === 0) return null;
              const isSelected = c.day.date === selectedDate;
              return (
                <React.Fragment key={c.day.date}>
                  {isSelected && (
                    <>
                      <Line
                        x1={c.x}
                        y1={PAD_TOP}
                        x2={c.x}
                        y2={PAD_TOP + plotH}
                        stroke={color}
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        opacity={0.45}
                      />
                      <Circle cx={c.x} cy={c.y} r={9} fill={color} opacity={0.18} />
                    </>
                  )}
                  <Circle
                    cx={c.x}
                    cy={c.y}
                    r={isSelected ? 5 : compactMode ? 2.8 : 4}
                    fill={isSelected ? color : colors.card}
                    stroke={color}
                    strokeWidth={2}
                    onPress={() => onSelectDay(c.day)}
                  />
                </React.Fragment>
              );
            })}

            {/* Eje X */}
            {xLabelIndices.map((idx) => {
              const c = coords[idx];
              if (!c) return null;
              const isSelected = c.day.date === selectedDate;
              return (
                <SvgText
                  key={`xl-${c.day.date}`}
                  x={c.x}
                  y={LINE_HEIGHT - 7}
                  fontSize={9.5}
                  fontWeight={isSelected ? "800" : "600"}
                  fill={isSelected ? colors.primaryDark : colors.textSecondary}
                  textAnchor={
                    idx === 0
                      ? "start"
                      : idx === days.length - 1
                      ? "end"
                      : "middle"
                  }
                >
                  {compactMode
                    ? `${Number(c.day.date.slice(8))}`
                    : `${c.day.dayLabel} ${Number(c.day.date.slice(8))}`}
                </SvgText>
              );
            })}
          </Svg>

          {/* Hit targets accesibles */}
          <View style={styles.touchOverlay} pointerEvents="box-none">
            {coords.map((c) => {
              if (c.day.mealCount === 0) return null;
              return (
                <Pressable
                  key={`lh-${c.day.date}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.day.dayLabel} ${c.day.date}: ${Math.round(c.day[metric])} ${unit}`}
                  accessibilityState={{ selected: c.day.date === selectedDate }}
                  onPress={() => onSelectDay(c.day)}
                  style={[
                    styles.lineHitTarget,
                    { left: Math.max(0, c.x - 16), top: Math.max(0, c.y - 16) },
                  ]}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Leyenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.help}>Consumo registrado</Text>
        </View>
        {hasTarget && (
          <View style={styles.legendItem}>
            <View style={styles.line} />
            <Text style={styles.help}>
              Meta diaria: {Math.round(target)} {unit}
            </Text>
          </View>
        )}
        {hasTarget && chartMode === "bars" && (
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={styles.help}>Día en meta</Text>
          </View>
        )}
      </View>
      <Text style={styles.note}>
        Los días sin comidas no se incluyen en el promedio.
        {compactMode
          ? " Toca cualquier día para ver el desglose completo."
          : " Toca una barra o punto para inspeccionar sus macros."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  insightPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
    minWidth: 200,
  },
  insightPill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  insightPillLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  insightPillValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  insightPillValue: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.text,
  },
  pctTag: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  pctTagText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 11,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 2,
  },
  modeBtn: {
    width: 32,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  barsOuter: {
    position: "relative",
    minWidth: "100%",
  },
  continuousTargetLine: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  targetDashedBar: {
    flex: 1,
    borderTopWidth: 1.5,
    borderTopColor: colors.textSecondary,
    borderStyle: "dashed",
    opacity: 0.65,
  },
  targetTag: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginLeft: 4,
  },
  targetTagText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textSecondary,
  },
  chartArea: {
    flexDirection: "row",
    flex: 1,
    minWidth: "100%",
    paddingVertical: 6,
  },
  column: {
    flex: 1,
    minWidth: 38,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 14,
  },
  selected: {
    backgroundColor: colors.surfaceMuted,
  },
  track: {
    width: 20,
    height: BAR_TRACK_HEIGHT,
    backgroundColor: colors.background,
    borderRadius: 10,
    justifyContent: "flex-end",
    overflow: "hidden",
    marginTop: 8,
  },
  fill: {
    width: "100%",
    borderRadius: 10,
  },
  value: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  dayFooter: {
    alignItems: "center",
    marginTop: 7,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginBottom: 4,
  },
  day: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  date: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lineContainer: {
    position: "relative",
    width: "100%",
    height: LINE_HEIGHT,
    marginVertical: 4,
  },
  touchOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lineHitTarget: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    width: 14,
    borderTopWidth: 2,
    borderTopColor: colors.textSecondary,
    borderStyle: "dashed",
  },
  help: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  note: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 8,
  },
});
