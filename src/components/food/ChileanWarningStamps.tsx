import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Svg, { Polygon, Line } from "react-native-svg";
import { ShieldCheck } from "lucide-react-native";
import { FoodWarningStamp, ChileanStampType, detectFoodWarningLabels } from "@/utils/foodAlerts";
import { colors } from "@/constants/colors";

interface ChileanWarningStampsProps {
  stamps?: FoodWarningStamp[];
  item?: {
    food: string;
    calories: number;
    protein?: number;
    carbs: number;
    fat: number;
    grams: number;
    unit?: string;
  };
  compact?: boolean;
  showZeroNotice?: boolean;
  onPressStamp?: (stamp: FoodWarningStamp) => void;
}

const STAMP_TEXT_CONFIG: Record<ChileanStampType, { main: string; sub?: string }> = {
  calories: { main: "CALORÍAS" },
  sugars: { main: "AZÚCARES" },
  fats: { main: "GRASAS", sub: "SATURADAS" },
  sodium: { main: "SODIO" },
};

/**
 * Renderiza un octógono negro oficial chileno (Ley 20.606 / MINSAL)
 */
function ChileanOctagon({
  stamp,
  compact = false,
  onPress,
}: {
  stamp: FoodWarningStamp;
  compact?: boolean;
  onPress?: () => void;
}) {
  const size = compact ? 52 : 74;
  const config = STAMP_TEXT_CONFIG[stamp.stamp] || { main: stamp.label.replace("ALTO EN ", "") };

  const content = (
    <View
      style={[
        styles.octagonWrapper,
        { width: size, height: size },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Sello negro oficial: ${stamp.label}. ${stamp.description}`}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Octógono exterior negro */}
        <Polygon
          points="29.3,0 70.7,0 100,29.3 100,70.7 70.7,100 29.3,100 0,70.7 0,29.3"
          fill="#000000"
        />
        {/* Filete blanco interior característico de la Ley 20.606 */}
        <Polygon
          points="30.5,3.5 69.5,3.5 96.5,30.5 96.5,69.5 69.5,96.5 30.5,96.5 3.5,69.5 3.5,30.5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.2"
        />
        {/* Línea horizontal divisoria sobre Ministerio de Salud (versión normal) */}
        {!compact && (
          <Line
            x1="18"
            y1="75"
            x2="82"
            y2="75"
            stroke="#FFFFFF"
            strokeWidth="1.2"
          />
        )}
      </Svg>

      {/* Textos tipográficos oficiales */}
      <View style={styles.textOverlay} pointerEvents="none">
        <Text style={[styles.textAltoEn, compact && styles.textAltoEnCompact]}>
          ALTO EN
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.textMain, compact && styles.textMainCompact]}
        >
          {config.main}
        </Text>
        {config.sub && (
          <Text style={[styles.textSub, compact && styles.textSubCompact]}>
            {config.sub}
          </Text>
        )}
        {!compact && (
          <Text style={styles.textMinsal}>
            Ministerio de Salud
          </Text>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalle de sello ${stamp.label}`}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export function ChileanWarningStamps({
  stamps: externalStamps,
  item,
  compact = false,
  showZeroNotice = true,
  onPressStamp,
}: ChileanWarningStampsProps) {
  const resolvedStamps = React.useMemo(() => {
    if (externalStamps) return externalStamps;
    if (item) {
      return detectFoodWarningLabels({
        food: item.food,
        calories: item.calories,
        protein: item.protein || 0,
        carbs: item.carbs,
        fat: item.fat,
        grams: item.grams,
        unit: item.unit,
      });
    }
    return [];
  }, [externalStamps, item]);

  if (resolvedStamps.length === 0) {
    if (!showZeroNotice) return null;
    return (
      <View
        style={[styles.zeroNoticeRow, compact && styles.zeroNoticeRowCompact]}
        accessibilityRole="text"
        accessibilityLabel="Alimento libre de sellos negros Ley 20.606"
      >
        <View style={styles.zeroIconCircle}>
          <ShieldCheck size={compact ? 13 : 15} color={colors.primaryDark} />
        </View>
        <Text style={[styles.zeroNoticeText, compact && styles.zeroNoticeTextCompact]}>
          0 SELLOS · Libre de sellos Ley 20.606
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.stampsGrid, compact && styles.stampsGridCompact]}>
        {resolvedStamps.map((stamp) => (
          <ChileanOctagon
            key={stamp.stamp}
            stamp={stamp}
            compact={compact}
            onPress={onPressStamp ? () => onPressStamp(stamp) : undefined}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  stampsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  stampsGridCompact: {
    gap: 6,
  },
  octagonWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  textOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  textAltoEn: {
    color: "#FFFFFF",
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    textAlign: "center",
    marginBottom: 0,
  },
  textAltoEnCompact: {
    fontSize: 6.5,
    letterSpacing: 0.5,
  },
  textMain: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  textMainCompact: {
    fontSize: 7.5,
    letterSpacing: 0.2,
  },
  textSub: {
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.2,
    textAlign: "center",
    marginTop: -1,
  },
  textSubCompact: {
    fontSize: 5.5,
  },
  textMinsal: {
    color: "#E2E8F0",
    fontSize: 5.5,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
    marginTop: 3,
  },
  zeroNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginVertical: 4,
  },
  zeroNoticeRowCompact: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  zeroIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  zeroNoticeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.3,
  },
  zeroNoticeTextCompact: {
    fontSize: 9.5,
  },
});
