import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { colors, shadows } from "@/constants/colors";
import { DetectedFoodItem, FoodUnit } from "@/types/meal";
import { findFamilyForFood, CHILEAN_CATALOG_METADATA } from "@/constants/chileanPresets";
import { resolveItemUnit, getStandardPortions, parseQuantityInput } from "@/utils/liquidUnits";
import { getVariant, DrinkVariantData } from "@/utils/drinkVariants";
import { evaluateFoodAlerts } from "@/utils/foodAlerts";
import { validateMacroCalorieCoherence } from "@/utils/nutritionCalculator";
import { DietaryRestriction } from "@/types/profile";

export interface MealReviewItemCardProps {
  item: DetectedFoodItem;
  index: number;
  restrictions?: DietaryRestriction[];
  inputValue?: string;
  inputError?: string;
  rememberedGrams?: number;
  onRemove: (index: number) => void;
  onOpenUsda: (itemId: string | null) => void;
  onOpenVariants: (index: number) => void;
  onApplyDrinkVariant: (index: number, target: DrinkVariantData) => void;
  onUpdateUnit: (index: number, unit: FoodUnit) => void;
  onAdjustDelta: (index: number, delta: number) => void;
  onChangeQuantity: (index: number, value: string, parsedValue: number, newUnit: FoodUnit, errorMsg?: string) => void;
  onBlurQuantity: (index: number) => void;
  onSelectPortion: (index: number, amount: number) => void;
  onReconcileCalories?: (index: number) => void;
}

export function MealReviewItemCard({
  item,
  index,
  restrictions = [],
  inputValue,
  inputError,
  rememberedGrams,
  onRemove,
  onOpenUsda,
  onOpenVariants,
  onApplyDrinkVariant,
  onUpdateUnit,
  onAdjustDelta,
  onChangeQuantity,
  onBlurQuantity,
  onSelectPortion,
  onReconcileCalories,
}: MealReviewItemCardProps) {
  const hasVariants = !!findFamilyForFood(item.food);
  const isLowConfidence = item.confidence && item.confidence < 0.75;
  const itemUnit = resolveItemUnit(item);
  const isMl = itemUnit === "ml";
  const drinkVariant = getVariant(item.food);
  const standardPortions = getStandardPortions(itemUnit);
  const { stamps, alerts, substituteSuggestion } = evaluateFoodAlerts(item, restrictions);
  const coherence = validateMacroCalorieCoherence(item);

  return (
    <View style={styles.itemCard}>
      {/* Encabezado del ítem */}
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleBlock}>
          <Text style={styles.itemNameText}>{item.food}</Text>
          {item.nutrition_reference && (
            <View>
              <Text style={styles.nutritionSourceText}>
                {item.nutrition_reference.source === "Catálogo Chileno"
                  ? `Nutrientes: ${CHILEAN_CATALOG_METADATA.badgeLabel} · Revisa la porción`
                  : "Nutrientes: USDA · Revisa la porción"}
              </Text>
              <Text style={styles.nutritionSourceText}>{item.nutrition_reference.description}</Text>
            </View>
          )}
          {!item.nutrition_reference && (
            <Text style={styles.nutritionSourceText}>Sin referencia verificada · Revisa los nutrientes</Text>
          )}
          {isLowConfidence && (
            <View style={styles.warningPill}>
              <Text style={styles.warningPillText}>⚠️ Revisa este alimento</Text>
            </View>
          )}
          {!coherence.coherent && coherence.expectedCalories > 0 && onReconcileCalories && (
            <TouchableOpacity
              style={styles.atwaterPill}
              accessibilityRole="button"
              accessibilityLabel={`Ajustar calorías de ${item.food} según sus macronutrientes`}
              onPress={() => onReconcileCalories(index)}
              activeOpacity={0.8}
            >
              <Text style={styles.atwaterPillText}>
                ⚡ Macros equivalen a {Math.round(coherence.expectedCalories)} kcal (4P+4C+9G) · Toca para ajustar
              </Text>
            </TouchableOpacity>
          )}
          {rememberedGrams && Math.round(rememberedGrams) !== Math.round(item.grams) && (
            <TouchableOpacity
              style={styles.rememberedPill}
              accessibilityRole="button"
              accessibilityLabel={`Aplicar tu porción habitual de ${Math.round(rememberedGrams)} ${itemUnit}`}
              onPress={() => onSelectPortion(index, rememberedGrams)}
              activeOpacity={0.8}
            >
              <Text style={styles.rememberedPillText}>
                🧠 Tu porción habitual: {Math.round(rememberedGrams)}{itemUnit} · Aplicar
              </Text>
            </TouchableOpacity>
          )}
          {(stamps.length > 0 || alerts.length > 0) && (
            <View style={styles.foodAlertsRow}>
              {stamps.map((stamp) => (
                <View key={stamp.stamp} style={styles.stampBadge}>
                  <Text style={styles.stampText}>{stamp.label}</Text>
                </View>
              ))}
              {alerts.map((alert, aIdx) => (
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
          {substituteSuggestion && !drinkVariant && (
            <Text style={styles.nutritionSourceText}>{substituteSuggestion}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.removeBtn}
          accessibilityRole="button"
          accessibilityLabel={"Quitar " + item.food}
          onPress={() => onRemove(index)}
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Botón para cambiar variante culinaria si existe */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={"Buscar referencia USDA para " + item.food}
        style={styles.variantBtn}
        onPress={() => onOpenUsda(item.id || null)}
      >
        <Text style={styles.variantBtnText}>
          {item.nutrition_reference ? "Cambiar referencia USDA" : "Buscar nutrientes en USDA"}
        </Text>
      </TouchableOpacity>
      {hasVariants && (
        <TouchableOpacity style={styles.variantBtn} onPress={() => onOpenVariants(index)}>
          <Text style={styles.variantBtnText}>🔄 Cambiar variante / método de cocción</Text>
        </TouchableOpacity>
      )}

      {/* Botón de variante Zero / Sin Azúcar si es bebida reconocida */}
      {drinkVariant && (
        <TouchableOpacity
          style={styles.drinkVariantBtn}
          onPress={() => onApplyDrinkVariant(index, drinkVariant.target)}
          activeOpacity={0.8}
        >
          <Text style={styles.drinkVariantBtnText}>{drinkVariant.label}</Text>
        </TouchableOpacity>
      )}

      {/* Selector de unidad [ g | ml ] */}
      <View style={styles.quantityHeaderRow}>
        <Text style={styles.quantityHeaderLabel}>
          {isMl ? "Volumen de bebida:" : "Porción consumida:"}
        </Text>
        <View style={styles.unitToggleGroup}>
          <TouchableOpacity
            style={[styles.unitToggleBtn, !isMl && styles.unitToggleBtnActive]}
            onPress={() => onUpdateUnit(index, "g")}
            accessibilityLabel="Cambiar a gramos"
            accessibilityState={{ selected: !isMl }}
          >
            <Text style={[styles.unitToggleText, !isMl && styles.unitToggleTextActive]}>g</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitToggleBtn, isMl && styles.unitToggleBtnActive]}
            onPress={() => onUpdateUnit(index, "ml")}
            accessibilityLabel="Cambiar a mililitros"
            accessibilityState={{ selected: isMl }}
          >
            <Text style={[styles.unitToggleText, isMl && styles.unitToggleTextActive]}>ml</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ajuste de Cantidad (Botones [-50ml/-10g] [+50ml/+10g] y Entrada) */}
      <View style={styles.gramsControlRow}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onAdjustDelta(index, isMl ? -50 : -10)}
          accessibilityRole="button"
          accessibilityLabel={`Disminuir porción de ${item.food}`}
        >
          <Text style={styles.stepBtnText}>{isMl ? "-50ml" : "-10g"}</Text>
        </TouchableOpacity>

        <View style={styles.gramsDisplay}>
          <TextInput
            style={styles.gramsInput}
            keyboardType="default"
            accessibilityLabel={`Cantidad de ${item.food}`}
            value={inputValue !== undefined ? inputValue : String(Math.round(item.grams))}
            onChangeText={(val) => {
              const res = parseQuantityInput(val, itemUnit);
              if (res.ok) {
                onChangeQuantity(index, val, res.value, res.unit);
              } else {
                onChangeQuantity(index, val, item.grams, itemUnit, res.error);
              }
            }}
            onBlur={() => onBlurQuantity(index)}
          />
          <Text style={styles.gramsUnit}>{isMl ? "ml" : "g"}</Text>
        </View>

        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onAdjustDelta(index, isMl ? 50 : 10)}
          accessibilityRole="button"
          accessibilityLabel={`Aumentar porción de ${item.food}`}
        >
          <Text style={styles.stepBtnText}>{isMl ? "+50ml" : "+10g"}</Text>
        </TouchableOpacity>
      </View>

      {inputError ? <Text style={styles.inlineErrorText}>{inputError}</Text> : null}

      {/* Atajos rápidos por envase / porción */}
      <View style={styles.shortcutsRow}>
        {standardPortions.map((shortcut) => (
          <TouchableOpacity
            key={shortcut.value}
            style={[
              styles.shortcutChip,
              Math.round(item.grams) === shortcut.value && styles.shortcutChipActive,
            ]}
            onPress={() => onSelectPortion(index, shortcut.value)}
          >
            <Text
              style={[
                styles.shortcutChipText,
                Math.round(item.grams) === shortcut.value && styles.shortcutChipTextActive,
              ]}
            >
              {shortcut.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Totales calculados en tiempo real para este alimento */}
      <View style={styles.itemTotalsFooter}>
        <Text style={styles.itemCals}>{Math.round(item.calories)} kcal</Text>
        <Text style={styles.itemMacrosDetail}>
          {Math.round(item.protein)}g Prot • {Math.round(item.carbs)}g Carbos • {Math.round(item.fat)}g Grasas
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
    marginBottom: 14,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemTitleBlock: {
    flex: 1,
    marginRight: 8,
  },
  itemNameText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  warningPill: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  warningPillText: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "700",
  },
  atwaterPill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  atwaterPillText: {
    fontSize: 11,
    color: "#1E40AF",
    fontWeight: "700",
  },
  rememberedPill: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  rememberedPillText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "700",
  },
  foodAlertsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
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
  removeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  variantBtn: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  variantBtnText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: "700",
  },
  nutritionSourceText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  drinkVariantBtn: {
    backgroundColor: "#F0FDF4",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  drinkVariantBtnText: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "700",
  },
  quantityHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  quantityHeaderLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  unitToggleGroup: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  unitToggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  unitToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  unitToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  unitToggleTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  gramsControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 14,
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  stepBtn: {
    minHeight: 44,
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    ...shadows.sm,
  },
  stepBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  gramsDisplay: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  gramsInput: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    textAlign: "right",
    width: 70,
    flexShrink: 1,
    minWidth: 0,
    padding: 0,
  },
  gramsUnit: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textSecondary,
    marginLeft: 4,
  },
  inlineErrorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: -6,
    marginBottom: 8,
    textAlign: "center",
  },
  shortcutsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  shortcutChip: {
    minHeight: 44,
    justifyContent: "center",
    flex: 1,
    paddingVertical: 7,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  shortcutChipActive: {
    borderColor: "#86EFAC",
    backgroundColor: colors.primaryLight,
  },
  shortcutChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  shortcutChipTextActive: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  itemTotalsFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  itemCals: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  itemMacrosDetail: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
