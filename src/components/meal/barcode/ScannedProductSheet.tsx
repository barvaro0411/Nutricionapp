import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { CheckCircle2, Camera as CameraIcon } from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";
import { BarcodeProduct } from "@/services/barcodeService";
import { FoodUnit } from "@/types/meal";
import { DietaryRestriction } from "@/types/profile";
import { evaluateFoodAlerts } from "@/utils/foodAlerts";
import { ChileanWarningStamps } from "@/components/food/ChileanWarningStamps";
import {
  parseQuantityInput,
  getStandardPortions,
  formatQuantityDisplay,
} from "@/utils/liquidUnits";

export interface ScannedProductSheetProps {
  product: BarcodeProduct;
  restrictions: DietaryRestriction[];
  portionGrams: string;
  portionUnit: FoodUnit;
  onChangePortionGrams: (val: string) => void;
  onChangePortionUnit: (unit: FoodUnit) => void;
  onScanNutritionLabel: () => void;
  scanningLabel: boolean;
  onAddToMeal: () => void;
}

export function ScannedProductSheet({
  product,
  restrictions,
  portionGrams,
  portionUnit,
  onChangePortionGrams,
  onChangePortionUnit,
  onScanNutritionLabel,
  scanningLabel,
  onAddToMeal,
}: ScannedProductSheetProps) {
  const parsedPortion = parseQuantityInput(portionGrams, portionUnit);
  const factor = parsedPortion.ok ? parsedPortion.value / 100 : 1;

  const productAlerts = evaluateFoodAlerts(
    {
      food: `${product.productName} ${product.brand || ""}`,
      calories: product.caloriesPer100g,
      protein: product.proteinPer100g,
      carbs: product.carbsPer100g,
      fat: product.fatPer100g,
      grams: 100,
      unit: portionUnit || product.unit,
    },
    restrictions
  );

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceBadgeText}>
            {product.source === "custom"
              ? "⭐ Mi Producto Guardado"
              : product.source === "local"
              ? "🇨🇱 Catálogo Chileno"
              : "🌐 Open Food Facts"}
          </Text>
        </View>
        <Text style={styles.productName}>{product.productName}</Text>
        {product.brand ? <Text style={styles.productBrand}>{product.brand}</Text> : null}
        <Text style={styles.productCode}>Código: {product.barcode}</Text>

        {/* Sellos negros oficiales de la Ley 20.606 */}
        <View style={styles.stampsContainer}>
          <ChileanWarningStamps
            stamps={productAlerts.stamps}
            showZeroNotice={true}
          />
        </View>

        {productAlerts.alerts.length > 0 && (
          <View style={styles.productAlertsRow}>
            {productAlerts.alerts.map((alert, aIdx) => (
              <View
                key={aIdx}
                style={[
                  styles.dietAlertPill,
                  alert.severity === "danger" && styles.dietAlertPillDanger,
                ]}
              >
                <Text
                  style={[
                    styles.dietAlertText,
                    alert.severity === "danger" && styles.dietAlertTextDanger,
                  ]}
                >
                  ⚠️ {alert.label}
                </Text>
              </View>
            ))}
          </View>
        )}
        {productAlerts.substituteSuggestion ? (
          <View style={styles.substituteTipBox}>
            <Text style={styles.substituteTipText}>{productAlerts.substituteSuggestion}</Text>
          </View>
        ) : null}
      </View>

      {/* Selector de porción */}
      <View style={styles.portionSection}>
        <View style={styles.portionHeaderRow}>
          <Text style={styles.portionLabel}>
            {portionUnit === "ml" ? "¿Cuánto volumen consumiste?" : "¿Cuántos gramos consumiste?"}
          </Text>
          {/* Selector [ g | ml ] */}
          <View style={styles.unitToggle}>
            <TouchableOpacity
              style={[styles.unitToggleBtn, portionUnit === "g" && styles.unitToggleBtnActive]}
              onPress={() => onChangePortionUnit("g")}
              accessibilityRole="button"
              accessibilityLabel="Cambiar unidad a gramos"
              accessibilityState={{ selected: portionUnit === "g" }}
              activeOpacity={0.8}
            >
              <Text style={[styles.unitToggleText, portionUnit === "g" && styles.unitToggleTextActive]}>
                g
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitToggleBtn, portionUnit === "ml" && styles.unitToggleBtnActive]}
              onPress={() => onChangePortionUnit("ml")}
              accessibilityRole="button"
              accessibilityLabel="Cambiar unidad a mililitros"
              accessibilityState={{ selected: portionUnit === "ml" }}
              activeOpacity={0.8}
            >
              <Text style={[styles.unitToggleText, portionUnit === "ml" && styles.unitToggleTextActive]}>
                ml
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.portionInputRow}>
          <TextInput
            style={[styles.portionInput, !parsedPortion.ok && styles.portionInputError]}
            value={portionGrams}
            onChangeText={(text) => {
              onChangePortionGrams(text);
              const parsed = parseQuantityInput(text, portionUnit);
              if (parsed.ok && parsed.unit !== portionUnit) {
                onChangePortionUnit(parsed.unit);
              }
            }}
            placeholder={portionUnit === "ml" ? "ej. 250, 1L" : "ej. 150"}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Cantidad consumida"
          />
          <Text style={styles.portionUnitLabel}>{portionUnit}</Text>
        </View>

        {!parsedPortion.ok && portionGrams.trim().length > 0 && (
          <Text style={styles.portionErrorText}>{parsedPortion.error}</Text>
        )}

        {/* Chips de envase si existe tamaño conocido */}
        {product.containerSize && product.containerSize > 0 && (
          <View style={styles.containerChipsRow}>
            <TouchableOpacity
              style={styles.containerChip}
              onPress={() => onChangePortionGrams(String(Math.round(product.containerSize! / 2)))}
              activeOpacity={0.7}
            >
              <Text style={styles.containerChipText}>
                ½ envase ({formatQuantityDisplay(product.containerSize / 2, portionUnit)})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.containerChip}
              onPress={() => onChangePortionGrams(String(product.containerSize))}
              activeOpacity={0.7}
            >
              <Text style={styles.containerChipText}>
                Envase completo ({formatQuantityDisplay(product.containerSize, portionUnit)})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Chips de porciones estándar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.standardChipsScroll}
          contentContainerStyle={styles.standardChipsContainer}
        >
          {getStandardPortions(portionUnit).map((portion) => {
            const isSelected = parsedPortion.ok && parsedPortion.value === portion.value;
            return (
              <TouchableOpacity
                key={portion.label}
                style={[styles.portionChip, isSelected && styles.portionChipActive]}
                onPress={() => onChangePortionGrams(String(portion.value))}
                activeOpacity={0.7}
              >
                <Text style={[styles.portionChipText, isSelected && styles.portionChipTextActive]}>
                  {portion.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Información nutricional calculada */}
      <View style={styles.nutritionPreview}>
        <View style={styles.nutriCol}>
          <Text style={styles.nutriVal}>
            {Math.round(product.caloriesPer100g * factor)}
          </Text>
          <Text style={styles.nutriLbl}>kcal</Text>
        </View>
        <View style={styles.nutriCol}>
          <Text style={styles.nutriVal}>
            {Math.round(product.proteinPer100g * factor * 10) / 10}g
          </Text>
          <Text style={styles.nutriLbl}>Prot</Text>
        </View>
        <View style={styles.nutriCol}>
          <Text style={styles.nutriVal}>
            {Math.round(product.carbsPer100g * factor * 10) / 10}g
          </Text>
          <Text style={styles.nutriLbl}>Carbos</Text>
        </View>
        <View style={styles.nutriCol}>
          <Text style={styles.nutriVal}>
            {Math.round(product.fatPer100g * factor * 10) / 10}g
          </Text>
          <Text style={styles.nutriLbl}>Grasas</Text>
        </View>
      </View>

      {/* Botón para corregir tabla con foto si no coincide */}
      <TouchableOpacity
        style={styles.rescanLabelBtn}
        onPress={onScanNutritionLabel}
        disabled={scanningLabel}
        activeOpacity={0.8}
      >
        {scanningLabel ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <>
            <CameraIcon size={14} color={colors.primary} />
            <Text style={styles.rescanLabelBtnText}>
              ¿No coincide con tu envase? Leer tabla física con IA
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.addToMealBtn}
        onPress={onAddToMeal}
        activeOpacity={0.85}
      >
        <CheckCircle2 size={18} color="#FFFFFF" />
        <Text style={styles.addToMealBtnText}>Añadir a mi Comida ✓</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
    marginBottom: 16,
  },
  resultHeader: {
    marginBottom: 14,
  },
  sourceBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  productName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  productBrand: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: "500",
  },
  productCode: {
    fontSize: 11,
    color: colors.textMuted,
  },
  stampsContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  productAlertsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  stampBadge: {
    backgroundColor: "#111827",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    alignSelf: "flex-start",
  },
  stampText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  dietAlertPill: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  dietAlertPillDanger: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  dietAlertText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400E",
  },
  dietAlertTextDanger: {
    color: "#991B1B",
  },
  substituteTipBox: {
    marginTop: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  substituteTipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#166534",
    lineHeight: 16,
  },
  portionSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 14,
  },
  portionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  portionLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  unitToggle: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  unitToggleBtn: {
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unitToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  unitToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  unitToggleTextActive: {
    color: "#FFFFFF",
  },
  portionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  portionInput: {
    backgroundColor: "#FFFFFF",
    height: 40,
    width: 120,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  portionInputError: {
    borderColor: colors.danger,
  },
  portionUnitLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  portionErrorText: {
    fontSize: 11,
    color: colors.danger,
    marginBottom: 8,
  },
  containerChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  containerChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  containerChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  standardChipsScroll: {
    marginTop: 4,
  },
  standardChipsContainer: {
    gap: 6,
  },
  portionChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  portionChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: "#86EFAC",
  },
  portionChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  portionChipTextActive: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  nutritionPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 16,
  },
  nutriCol: {
    alignItems: "center",
  },
  nutriVal: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  nutriLbl: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 2,
  },
  rescanLabelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    marginBottom: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  rescanLabelBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  addToMealBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    ...shadows.glow,
  },
  addToMealBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
});
