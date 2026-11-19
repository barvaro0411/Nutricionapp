import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Trophy, CheckCircle2, ArrowRight } from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";
import { BarcodeProduct } from "@/services/barcodeService";
import { DietaryRestriction } from "@/types/profile";
import { compareBarcodeProducts, CompareWinner } from "@/utils/productCompare";
import { ChileanWarningStamps } from "@/components/food/ChileanWarningStamps";

interface ProductCompareCardProps {
  productA: BarcodeProduct;
  productB: BarcodeProduct;
  restrictions: DietaryRestriction[];
  customAllergies?: string[];
  onSelectForMeal: (product: BarcodeProduct) => void;
}

export function ProductCompareCard({
  productA,
  productB,
  restrictions,
  customAllergies = [],
  onSelectForMeal,
}: ProductCompareCardProps) {
  const comparison = compareBarcodeProducts(
    productA,
    productB,
    restrictions,
    customAllergies
  );

  const unitLabelA = productA.unit === "ml" ? "100 ml" : "100 g";
  const unitLabelB = productB.unit === "ml" ? "100 ml" : "100 g";

  const rows: {
    label: string;
    valA: string;
    valB: string;
    winner: CompareWinner;
  }[] = [
    {
      label: "Calorías",
      valA: `${Math.round(productA.caloriesPer100g)} kcal`,
      valB: `${Math.round(productB.caloriesPer100g)} kcal`,
      winner: comparison.metricWinners.calories,
    },
    {
      label: "Proteína",
      valA: `${productA.proteinPer100g} g`,
      valB: `${productB.proteinPer100g} g`,
      winner: comparison.metricWinners.protein,
    },
    {
      label: "Prot / 100 kcal",
      valA: `${comparison.a.proteinPer100Kcal} g`,
      valB: `${comparison.b.proteinPer100Kcal} g`,
      winner: comparison.metricWinners.proteinDensity,
    },
    {
      label: "Carbohidratos",
      valA: `${productA.carbsPer100g} g`,
      valB: `${productB.carbsPer100g} g`,
      winner: "tie",
    },
    {
      label: "Grasas totales",
      valA: `${productA.fatPer100g} g`,
      valB: `${productB.fatPer100g} g`,
      winner: comparison.metricWinners.fat,
    },
  ];

  return (
    <View style={styles.card}>
      {/* Banner Ganador */}
      <View style={styles.winnerBanner}>
        <View style={styles.winnerIcon}>
          <Trophy size={18} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.winnerOverline}>COMPARATIVA POR 100 g/ml</Text>
          <Text style={styles.winnerTitle}>{comparison.headline}</Text>
        </View>
      </View>

      {/* Razones clave */}
      <View style={styles.reasonsBox}>
        {comparison.reasons.map((reason, idx) => (
          <View key={idx} style={styles.reasonRow}>
            <CheckCircle2 size={14} color={colors.primary} />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>

      {/* Cabeceras A vs B + Sellos */}
      <View style={styles.columnsHeader}>
        <View
          style={[
            styles.colHeaderBox,
            comparison.winner === "A" && styles.colHeaderWinner,
          ]}
        >
          <Text style={styles.slotBadge}>OPCION A</Text>
          <Text style={styles.prodName} numberOfLines={2}>
            {productA.productName}
          </Text>
          <Text style={styles.prodSub}>Por {unitLabelA}</Text>
          <View style={styles.stampsWrap}>
            <ChileanWarningStamps
              stamps={comparison.a.stamps}
              compact={true}
              showZeroNotice={true}
            />
          </View>
        </View>

        <View
          style={[
            styles.colHeaderBox,
            comparison.winner === "B" && styles.colHeaderWinner,
          ]}
        >
          <Text style={styles.slotBadge}>OPCION B</Text>
          <Text style={styles.prodName} numberOfLines={2}>
            {productB.productName}
          </Text>
          <Text style={styles.prodSub}>Por {unitLabelB}</Text>
          <View style={styles.stampsWrap}>
            <ChileanWarningStamps
              stamps={comparison.b.stamps}
              compact={true}
              showZeroNotice={true}
            />
          </View>
        </View>
      </View>

      {/* Tabla Nutricional Lado a Lado */}
      <View style={styles.table}>
        {rows.map((r, idx) => (
          <View key={r.label} style={[styles.tableRow, idx > 0 && styles.tableRowBorder]}>
            <Text style={styles.metricName}>{r.label}</Text>
            <Text
              style={[
                styles.metricVal,
                r.winner === "A" && styles.metricValWin,
              ]}
            >
              {r.valA} {r.winner === "A" ? "✓" : ""}
            </Text>
            <Text
              style={[
                styles.metricVal,
                r.winner === "B" && styles.metricValWin,
              ]}
            >
              {r.valB} {r.winner === "B" ? "✓" : ""}
            </Text>
          </View>
        ))}
      </View>

      {/* Botones para elegir */}
      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[
            styles.pickBtn,
            comparison.winner === "A" && styles.pickBtnWinner,
          ]}
          onPress={() => onSelectForMeal(productA)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Elegir ${productA.productName}`}
        >
          <Text
            style={[
              styles.pickBtnText,
              comparison.winner === "A" && styles.pickBtnTextWinner,
            ]}
            numberOfLines={1}
          >
            Elegir A
          </Text>
          <ArrowRight
            size={14}
            color={comparison.winner === "A" ? "#FFFFFF" : colors.primaryDark}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pickBtn,
            comparison.winner === "B" && styles.pickBtnWinner,
          ]}
          onPress={() => onSelectForMeal(productB)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Elegir ${productB.productName}`}
        >
          <Text
            style={[
              styles.pickBtnText,
              comparison.winner === "B" && styles.pickBtnTextWinner,
            ]}
            numberOfLines={1}
          >
            Elegir B
          </Text>
          <ArrowRight
            size={14}
            color={comparison.winner === "B" ? "#FFFFFF" : colors.primaryDark}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 14,
    marginBottom: 18,
    ...shadows.card,
  },
  winnerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  winnerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  winnerOverline: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: colors.primaryDark,
  },
  winnerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
  },
  reasonsBox: {
    gap: 6,
    marginBottom: 14,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  columnsHeader: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  colHeaderBox: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  colHeaderWinner: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  slotBadge: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: colors.primaryDark,
    marginBottom: 3,
  },
  prodName: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    minHeight: 34,
  },
  prodSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 8,
  },
  stampsWrap: {
    minHeight: 40,
  },
  table: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  tableRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  metricName: {
    flex: 1.1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  metricVal: {
    flex: 0.9,
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
  },
  metricValWin: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  ctaRow: {
    flexDirection: "row",
    gap: 10,
  },
  pickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pickBtnWinner: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  pickBtnTextWinner: {
    color: "#FFFFFF",
  },
});
