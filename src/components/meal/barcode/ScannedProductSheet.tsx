import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Camera as CameraIcon,
  Scale,
  Plus,
  ShoppingCart,
  ScanLine,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
} from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";
import { BarcodeProduct } from "@/services/barcodeService";
import { FoodUnit, MealType } from "@/types/meal";
import { DietaryRestriction } from "@/types/profile";
import { ChileanWarningStamps } from "@/components/food/ChileanWarningStamps";
import {
  evaluateSupermarketProduct,
  TrafficLightLevel,
} from "@/utils/supermarketEvaluator";
import {
  parseQuantityInput,
  getStandardPortions,
  formatQuantityDisplay,
} from "@/utils/liquidUnits";

const MEAL_MOMENTS: { type: MealType; label: string; emoji: string }[] = [
  { type: "desayuno", label: "Desayuno", emoji: "🌅" },
  { type: "almuerzo", label: "Almuerzo", emoji: "🍽️" },
  { type: "cena", label: "Once / Cena", emoji: "🥗" },
  { type: "snack", label: "Colación", emoji: "🍎" },
];

export interface ScannedProductSheetProps {
  product: BarcodeProduct;
  restrictions: DietaryRestriction[];
  customAllergies?: string[];
  objective?: string | null;
  remainingCalories?: number;
  remainingProtein?: number;
  portionGrams: string;
  portionUnit: FoodUnit;
  selectedMealType: MealType;
  onChangeMealType: (mealType: MealType) => void;
  onChangePortionGrams: (val: string) => void;
  onChangePortionUnit: (unit: FoodUnit) => void;
  onScanNutritionLabel: () => void;
  scanningLabel: boolean;
  onSaveDirectToMeal?: () => void;
  savingDirect?: boolean;
  onAddToMeal: () => void;
  onCompareWithOther?: () => void;
  onScanAnother?: () => void;
  onAddToShoppingList?: () => void;
  addingToShopping?: boolean;
}

function trafficColor(level: TrafficLightLevel): string {
  if (level === "good") return colors.primary;
  if (level === "warn") return colors.warning;
  return colors.danger;
}

export function ScannedProductSheet({
  product,
  restrictions,
  customAllergies = [],
  objective,
  remainingCalories,
  remainingProtein,
  portionGrams,
  portionUnit,
  selectedMealType,
  onChangeMealType,
  onChangePortionGrams,
  onChangePortionUnit,
  onScanNutritionLabel,
  scanningLabel,
  onSaveDirectToMeal,
  savingDirect = false,
  onAddToMeal,
  onCompareWithOther,
  onScanAnother,
  onAddToShoppingList,
  addingToShopping = false,
}: ScannedProductSheetProps) {
  const [showLogPanel, setShowLogPanel] = useState(false);

  const selectedMomentLabel =
    MEAL_MOMENTS.find((m) => m.type === selectedMealType)?.label || "Comida";

  const parsedPortion = parseQuantityInput(portionGrams, portionUnit);
  const portionAmount = parsedPortion.ok
    ? parsedPortion.value
    : product.servingSizeG || 100;
  const factor = portionAmount / 100;

  const evaluation = useMemo(
    () =>
      evaluateSupermarketProduct({
        product,
        portionAmount,
        portionUnit,
        objective,
        remainingCalories,
        remainingProtein,
        restrictions,
        customAllergies,
      }),
    [
      product,
      portionAmount,
      portionUnit,
      objective,
      remainingCalories,
      remainingProtein,
      restrictions,
      customAllergies,
    ]
  );

  const verdictTheme =
    evaluation.verdict === "great"
      ? {
          bg: colors.primaryLight,
          border: colors.primary,
          accent: colors.primaryDark,
          Icon: CheckCircle2,
        }
      : evaluation.verdict === "moderate"
        ? {
            bg: colors.warningLight,
            border: colors.warning,
            accent: colors.warning,
            Icon: AlertTriangle,
          }
        : {
            bg: colors.dangerLight,
            border: colors.danger,
            accent: colors.danger,
            Icon: XCircle,
          };

  const VerdictIcon = verdictTheme.Icon;

  return (
    <View style={styles.resultCard}>
      {/* 1. Cabecera del producto */}
      <View style={styles.resultHeader}>
        <View style={styles.badgesTopRow}>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>
              {product.source === "custom"
                ? "⭐ Mi Producto"
                : product.source === "local"
                  ? "🇨🇱 Catálogo Chileno"
                  : "🌐 Open Food Facts"}
            </Text>
          </View>
          {evaluation.isUltraProcessed && (
            <View style={styles.novaBadge}>
              <Text style={styles.novaBadgeText}>Ultraprocesado · NOVA 4</Text>
            </View>
          )}
        </View>
        <Text style={styles.productName}>{product.productName}</Text>
        {product.brand ? (
          <Text style={styles.productBrand}>{product.brand}</Text>
        ) : null}
        <Text style={styles.productCode}>Código: {product.barcode}</Text>
      </View>

      {/* 2. Veredicto de Supermercado ("¿Me sirve para mi dieta?") */}
      <View
        style={[
          styles.verdictCard,
          {
            backgroundColor: verdictTheme.bg,
            borderColor: verdictTheme.border,
          },
        ]}
        accessibilityRole="summary"
        accessibilityLabel={`${evaluation.verdictTitle}. Puntaje ${evaluation.score} de 100. ${evaluation.summary}`}
      >
        <View style={styles.verdictHeaderRow}>
          <View style={styles.verdictTitleWrap}>
            <VerdictIcon size={22} color={verdictTheme.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.verdictOverline, { color: verdictTheme.accent }]}>
                PARA TU META · {evaluation.objectiveLabel.toUpperCase()}
              </Text>
              <Text style={styles.verdictTitle}>{evaluation.verdictTitle}</Text>
            </View>
          </View>
          <View
            style={[
              styles.scoreBadge,
              { borderColor: verdictTheme.border },
            ]}
          >
            <Text style={[styles.scoreNum, { color: verdictTheme.accent }]}>
              {evaluation.score}
            </Text>
            <Text style={styles.scoreDenom}>/100</Text>
          </View>
        </View>

        <Text style={styles.verdictSummary}>{evaluation.summary}</Text>

        {evaluation.alerts.length > 0 && (
          <View style={styles.productAlertsRow}>
            {evaluation.alerts.map((alert, aIdx) => (
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
      </View>

      {/* 3. Sellos Negros Oficiales Ley 20.606 */}
      <View style={styles.stampsContainer}>
        <ChileanWarningStamps
          stamps={evaluation.stamps}
          showZeroNotice={true}
        />
      </View>

      {/* 4. Semáforo de Nutrientes (por 100g/ml) */}
      <Text style={styles.miniSectionTitle}>
        Semáforo nutricional (por 100 {portionUnit})
      </Text>
      <View style={styles.trafficGrid}>
        {evaluation.trafficLights.map((item) => {
          const dotColor = trafficColor(item.level);
          return (
            <View key={item.key} style={styles.trafficTile}>
              <View style={styles.trafficTopRow}>
                <View
                  style={[styles.trafficDot, { backgroundColor: dotColor }]}
                />
                <Text style={styles.trafficLabel}>{item.label}</Text>
              </View>
              <Text style={styles.trafficValue} numberOfLines={1}>
                {item.valueText}
              </Text>
              <Text
                style={[styles.trafficStatus, { color: dotColor }]}
                numberOfLines={1}
              >
                {item.statusText}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 5. Lo bueno / Ojo con esto */}
      {(evaluation.pros.length > 0 || evaluation.cons.length > 0) && (
        <View style={styles.pointsBox}>
          {evaluation.pros.slice(0, 3).map((pro, idx) => (
            <View key={`pro-${idx}`} style={styles.pointRow}>
              <Check size={14} color={colors.primary} />
              <Text style={styles.pointText}>{pro}</Text>
            </View>
          ))}
          {evaluation.cons.slice(0, 3).map((con, idx) => (
            <View key={`con-${idx}`} style={styles.pointRow}>
              <AlertTriangle size={13} color={colors.danger} />
              <Text style={styles.pointText}>{con}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Impacto real en el presupuesto de hoy */}
      {evaluation.dayBudgetImpact && (
        <View
          style={[
            styles.budgetBox,
            evaluation.dayBudgetImpact.exceedsRemainingCalories &&
              styles.budgetBoxWarn,
          ]}
        >
          <Sparkles
            size={14}
            color={
              evaluation.dayBudgetImpact.exceedsRemainingCalories
                ? colors.danger
                : colors.primaryDark
            }
          />
          <Text style={styles.budgetText}>
            {evaluation.dayBudgetImpact.summaryText}
          </Text>
        </View>
      )}

      {/* Alternativa más saludable en el mismo pasillo */}
      {evaluation.smartTip ? (
        <View style={styles.substituteTipBox}>
          <Text style={styles.substituteTipText}>{evaluation.smartTip}</Text>
        </View>
      ) : null}

      {/* 6. Barra rápida de pasillo (sin obligar a registrar como comido) */}
      <View style={styles.aisleActionsRow}>
        {onScanAnother && (
          <TouchableOpacity
            style={styles.aisleActionBtn}
            onPress={onScanAnother}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Escanear otro producto"
          >
            <ScanLine size={15} color={colors.primaryDark} />
            <Text style={styles.aisleActionText}>Escanear otro</Text>
          </TouchableOpacity>
        )}

        {onCompareWithOther && (
          <TouchableOpacity
            style={styles.aisleActionBtn}
            onPress={onCompareWithOther}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Comparar este producto con otro"
          >
            <Scale size={15} color={colors.primaryDark} />
            <Text style={styles.aisleActionText}>Comparar 2</Text>
          </TouchableOpacity>
        )}

        {onAddToShoppingList && (
          <TouchableOpacity
            style={styles.aisleActionBtn}
            onPress={onAddToShoppingList}
            disabled={addingToShopping}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Agregar producto a la lista de compras"
          >
            {addingToShopping ? (
              <ActivityIndicator size="small" color={colors.primaryDark} />
            ) : (
              <>
                <ShoppingCart size={15} color={colors.primaryDark} />
                <Text style={styles.aisleActionText}>+ Compras</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Botón para corregir tabla nutricional física con IA */}
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
              ¿La tabla física es distinta? Leer etiqueta con IA
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* 7. Sección opcional: Registrar que ya lo comí */}
      <TouchableOpacity
        style={styles.logToggleHeader}
        onPress={() => setShowLogPanel((prev) => !prev)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Registrar que consumiste este producto"
        accessibilityState={{ expanded: showLogPanel }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.logToggleTitle}>¿Te lo comiste? Regístralo en tu día</Text>
          <Text style={styles.logToggleSub}>
            {Math.round(product.caloriesPer100g * factor)} kcal ·{" "}
            {formatQuantityDisplay(portionAmount, portionUnit)} · {selectedMomentLabel}
          </Text>
        </View>
        {showLogPanel ? (
          <ChevronUp size={18} color={colors.primaryDark} />
        ) : (
          <ChevronDown size={18} color={colors.primaryDark} />
        )}
      </TouchableOpacity>

      {showLogPanel && (
        <View style={styles.logPanelBody}>
          {/* Selector de porción */}
          <View style={styles.portionSection}>
            <View style={styles.portionHeaderRow}>
              <Text style={styles.portionLabel}>
                {portionUnit === "ml"
                  ? "¿Cuánto volumen consumiste?"
                  : "¿Cuántos gramos consumiste?"}
              </Text>
              <View style={styles.unitToggle}>
                <TouchableOpacity
                  style={[
                    styles.unitToggleBtn,
                    portionUnit === "g" && styles.unitToggleBtnActive,
                  ]}
                  onPress={() => onChangePortionUnit("g")}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar unidad a gramos"
                  accessibilityState={{ selected: portionUnit === "g" }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.unitToggleText,
                      portionUnit === "g" && styles.unitToggleTextActive,
                    ]}
                  >
                    g
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitToggleBtn,
                    portionUnit === "ml" && styles.unitToggleBtnActive,
                  ]}
                  onPress={() => onChangePortionUnit("ml")}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar unidad a mililitros"
                  accessibilityState={{ selected: portionUnit === "ml" }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.unitToggleText,
                      portionUnit === "ml" && styles.unitToggleTextActive,
                    ]}
                  >
                    ml
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.portionInputRow}>
              <TextInput
                style={[
                  styles.portionInput,
                  !parsedPortion.ok && styles.portionInputError,
                ]}
                value={portionGrams}
                onChangeText={(text) => {
                  onChangePortionGrams(text);
                  const parsed = parseQuantityInput(text, portionUnit);
                  if (parsed.ok && parsed.unit !== portionUnit) {
                    onChangePortionUnit(parsed.unit);
                  }
                }}
                keyboardType="default"
                placeholder={portionUnit === "ml" ? "Ej: 250 ml" : "Ej: 100 g"}
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Cantidad consumida"
              />
              <Text style={styles.portionUnitBadge}>
                {parsedPortion.ok
                  ? formatQuantityDisplay(parsedPortion.value, parsedPortion.unit)
                  : portionUnit}
              </Text>
            </View>
            {!parsedPortion.ok && (
              <Text style={styles.portionErrorText}>{parsedPortion.error}</Text>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.standardChipsScroll}
              contentContainerStyle={styles.standardChipsContainer}
            >
              {getStandardPortions(portionUnit).map((portion) => {
                const isSelected =
                  parsedPortion.ok && parsedPortion.value === portion.value;
                return (
                  <TouchableOpacity
                    key={portion.label}
                    style={[
                      styles.portionChip,
                      isSelected && styles.portionChipActive,
                    ]}
                    onPress={() => onChangePortionGrams(String(portion.value))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.portionChipText,
                        isSelected && styles.portionChipTextActive,
                      ]}
                    >
                      {portion.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Información nutricional calculada de la porción */}
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

          {/* Selector de momento del día */}
          <View style={styles.mealTypeSection}>
            <Text style={styles.mealTypePrompt}>¿En qué momento lo comiste?</Text>
            <View style={styles.mealTypesRow}>
              {MEAL_MOMENTS.map((m) => {
                const active = selectedMealType === m.type;
                return (
                  <TouchableOpacity
                    key={m.type}
                    style={[
                      styles.mealTypeChip,
                      active && styles.mealTypeChipActive,
                    ]}
                    onPress={() => onChangeMealType(m.type)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Registrar en ${m.label}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={styles.mealTypeEmoji}>{m.emoji}</Text>
                    <Text
                      style={[
                        styles.mealTypeChipText,
                        active && styles.mealTypeChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {onSaveDirectToMeal ? (
            <>
              <TouchableOpacity
                style={[styles.addToMealBtn, savingDirect && { opacity: 0.7 }]}
                onPress={onSaveDirectToMeal}
                disabled={savingDirect}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Guardar en ${selectedMomentLabel}`}
              >
                {savingDirect ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <CheckCircle2 size={18} color="#FFFFFF" />
                    <Text style={styles.addToMealBtnText}>
                      Guardar en {selectedMomentLabel} ✓
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addAndContinueBtn}
                onPress={onAddToMeal}
                disabled={savingDirect}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Añadir a ${selectedMomentLabel} y sumar más alimentos`}
              >
                <Plus size={15} color={colors.primaryDark} />
                <Text style={styles.addAndContinueText}>
                  Añadir a {selectedMomentLabel} y sumar más alimentos
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.addToMealBtn}
              onPress={onAddToMeal}
              activeOpacity={0.85}
            >
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.addToMealBtnText}>
                Añadir a {selectedMomentLabel} ✓
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
    marginBottom: 16,
  },
  resultHeader: {
    marginBottom: 12,
  },
  badgesTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  sourceBadge: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  novaBadge: {
    backgroundColor: colors.dangerLight,
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger + "44",
  },
  novaBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.danger,
  },
  productName: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  productBrand: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 2,
  },
  productCode: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  verdictCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
  },
  verdictHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  verdictTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  verdictOverline: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  verdictTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginTop: 1,
  },
  scoreBadge: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    flexDirection: "row",
    gap: 1,
  },
  scoreNum: {
    fontSize: 18,
    fontWeight: "900",
  },
  scoreDenom: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
  },
  verdictSummary: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    fontWeight: "500",
  },
  stampsContainer: {
    marginBottom: 14,
  },
  miniSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trafficGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  trafficTile: {
    flexGrow: 1,
    flexBasis: "46%",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
  },
  trafficTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  trafficDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trafficLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  trafficValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  trafficStatus: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  pointsBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    gap: 7,
    marginBottom: 10,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  pointText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
    fontWeight: "500",
  },
  budgetBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.primaryGhost,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 11,
    marginBottom: 10,
  },
  budgetBoxWarn: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger + "44",
  },
  budgetText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
    fontWeight: "600",
  },
  productAlertsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  dietAlertPill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dietAlertPillDanger: {
    borderColor: colors.danger,
  },
  dietAlertText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.warning,
  },
  dietAlertTextDanger: {
    color: colors.danger,
  },
  substituteTipBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  substituteTipText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: "600",
    lineHeight: 17,
  },
  aisleActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  aisleActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  aisleActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  rescanLabelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: colors.primaryGhost,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rescanLabelBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  logToggleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 14,
  },
  logToggleTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  logToggleSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "600",
  },
  logPanelBody: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  portionSection: {
    marginBottom: 14,
  },
  portionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  portionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  unitToggle: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  unitToggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
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
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
  },
  portionInputError: {
    borderColor: colors.danger,
  },
  portionUnitBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  portionErrorText: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: 6,
  },
  standardChipsScroll: {
    marginTop: 4,
  },
  standardChipsContainer: {
    gap: 6,
    paddingVertical: 2,
  },
  portionChip: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  portionChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
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
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 14,
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
  mealTypeSection: {
    marginBottom: 14,
  },
  mealTypePrompt: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  mealTypesRow: {
    flexDirection: "row",
    gap: 6,
  },
  mealTypeChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 13,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    gap: 2,
  },
  mealTypeChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  mealTypeEmoji: {
    fontSize: 15,
  },
  mealTypeChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  mealTypeChipTextActive: {
    color: colors.primaryDark,
    fontWeight: "800",
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
  addAndContinueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 9,
    borderRadius: 14,
    backgroundColor: colors.primaryGhost,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  addAndContinueText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
});
