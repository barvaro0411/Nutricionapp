import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { ChileanWarningStamps } from "@/components/food/ChileanWarningStamps";
import { colors, shadows } from "@/constants/colors";
import { ChileanStampType, FoodWarningStamp } from "@/utils/foodAlerts";
import { WarningStampsPeriodStats } from "@/utils/qualityStats";

interface WarningStampsSummaryCardProps {
  stats: WarningStampsPeriodStats;
  period: 7 | 30;
}

const STAMP_PREVIEW: Record<ChileanStampType, FoodWarningStamp> = {
  calories: { stamp: "calories", label: "ALTO EN CALORÍAS", description: "" },
  sugars: { stamp: "sugars", label: "ALTO EN AZÚCARES", description: "" },
  fats: { stamp: "fats", label: "ALTO EN GRASAS SATURADAS", description: "" },
  sodium: { stamp: "sodium", label: "ALTO EN SODIO", description: "" },
};

const STAMP_TITLES: Record<ChileanStampType, string> = {
  calories: "Calorías",
  sugars: "Azúcares",
  fats: "Grasas sat.",
  sodium: "Sodio",
};

export function WarningStampsSummaryCard({
  stats,
  period,
}: WarningStampsSummaryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>CALIDAD NUTRICIONAL · LEY 20.606 ({period}D)</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Semáforo de sellos negros
          </Text>
        </View>
        <View style={styles.badge}>
          <ShieldCheck size={16} color={colors.primaryDark} />
          <Text style={styles.badgeText}>{stats.cleanPercent}% sin sellos</Text>
        </View>
      </View>

      {stats.totalItems === 0 ? (
        <Text style={styles.tipText}>{stats.tip}</Text>
      ) : (
        <>
          {/* Barra de proporción limpio vs con sellos */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(4, stats.cleanPercent)}%` },
              ]}
            />
          </View>
          <Text style={styles.summarySub}>
            {stats.cleanItems} de {stats.totalItems}{" "}
            {stats.totalItems === 1 ? "alimento libre" : "alimentos libres"} de sellos negros MINSAL
          </Text>

          {/* Cuadrícula con los 4 octógonos oficiales */}
          <View style={styles.stampsGrid}>
            {(["calories", "sugars", "fats", "sodium"] as ChileanStampType[]).map((key) => {
              const count = stats.stampCounts[key] || 0;
              return (
                <View key={key} style={[styles.stampTile, count === 0 && styles.stampTileZero]}>
                  <ChileanWarningStamps
                    stamps={[STAMP_PREVIEW[key]]}
                    compact={true}
                    showZeroNotice={false}
                  />
                  <Text style={styles.stampCount}>
                    {count} {count === 1 ? "vez" : "veces"}
                  </Text>
                  <Text style={styles.stampName}>{STAMP_TITLES[key]}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipText}>{stats.tip}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  overline: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.9,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  progressTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  summarySub: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 14,
  },
  stampsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  stampTile: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 72,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 5,
  },
  stampTileZero: {
    opacity: 0.6,
  },
  stampCount: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  stampName: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tipBox: {
    backgroundColor: colors.primaryGhost,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
