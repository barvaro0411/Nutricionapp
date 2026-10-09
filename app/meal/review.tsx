import { showAlert, showToast } from "@/utils/alerts";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useFavoriteMeals } from "@/hooks/useFavoriteMeals";
import { saveMealToDatabase } from "@/services/mealService";
import { VariantModal } from "@/components/meal/VariantModal";
import { UsdaSearchModal } from "@/components/meal/UsdaSearchModal";
import { findFamilyForFood } from "@/constants/chileanPresets";
import { colors, shadows, layout } from "@/constants/colors";
import { FoodUnit, MealType, DetectedFoodItemSchema } from "@/types/meal";
import { parseDecimal, getDateKey, APP_TIME_ZONE } from "@/utils/dates";
import {
  getStandardPortions,
  isLiquidFood,
  parseQuantityInput,
  resolveItemUnit,
} from "@/utils/liquidUnits";
import { getVariant } from "@/utils/drinkVariants";

export default function MealReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ manual?: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { saveFavorite, isSavingFavorite } = useFavoriteMeals();

  const {
    items,
    mealType,
    localImageUri,
    imagePath,
    userNotes,
    loggedAt,
    clientRequestId,
    setMealType,
    updateItemGrams,
    adjustItemGramsDelta,
    updateItemUnit,
    applyDrinkVariant,
    updateItemVariant,
    removeItem,
    addItem,
    replaceItem,
    getTotals,
    reset,
  } = useMealReviewStore();

  const [saving, setSaving] = useState(false);
  const [activeVariantIndex, setActiveVariantIndex] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(params.manual === "1");
  const [usdaTarget, setUsdaTarget] = useState<string | "new" | null>(null);
  const [showFavModal, setShowFavModal] = useState(false);
  const [favTitle, setFavTitle] = useState("");
  const [newFoodName, setNewFoodName] = useState("");
  const [newFoodUnit, setNewFoodUnit] = useState<FoodUnit>("g");
  const [newFoodGrams, setNewFoodGrams] = useState("100");
  const [newFoodCals, setNewFoodCals] = useState("");
  const [newFoodProt, setNewFoodProt] = useState("");
  const [newFoodCarbs, setNewFoodCarbs] = useState("");
  const [newFoodFat, setNewFoodFat] = useState("");
  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const [inputErrors, setInputErrors] = useState<Record<number, string>>({});

  const totals = getTotals();
  const clearQuantityInput = (index: number) => {
    setInputValues(previous => { const next = { ...previous }; delete next[index]; return next; });
    setInputErrors(previous => { const next = { ...previous }; delete next[index]; return next; });
  };

  const handleSaveFavorite = async () => {
    if (!favTitle.trim()) {
      showAlert("Título requerido", "Ingresa un nombre para tu comida frecuente (ej: Mi desayuno habitual)");
      return;
    }
    try {
      await saveFavorite({
        title: favTitle.trim(),
        mealType,
        items,
        totals,
      });
      setShowFavModal(false);
      showAlert("¡Guardada!", "Esta comida ahora está disponible en tus Comidas Frecuentes para registrarla con 1 toque.");
    } catch (err: any) {
      showAlert("Error", err?.message || "No se pudo guardar como favorita");
    }
  };

  const handleConfirmMeal = async () => {
    if (saving) return;
    if (!user) {
      showAlert("Error", "No se detectó sesión de usuario.");
      return;
    }

    if (items.length === 0) {
      showAlert("Aviso", "Debes tener al menos un alimento en la lista.");
      return;
    }
    if (items.some(item => item.grams <= 0) || Object.values(inputErrors).some(Boolean)) {
      showAlert("Revisa las porciones", "Cada alimento necesita una cantidad válida mayor que cero antes de guardar.");
      return;
    }

    setSaving(true);
    try {
      await saveMealToDatabase({
        userId: user.id,
        mealType,
        imagePath,
        items,
        totals,
        notes: userNotes,
        loggedAt: loggedAt ? new Date(loggedAt) : undefined,
        clientRequestId,
      });

      // Invalidar queries de TanStack para refrescar Dashboard, Historial y Racha de inmediato
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] }),
        queryClient.invalidateQueries({ queryKey: ["weeklyStats"] }),
        queryClient.invalidateQueries({ queryKey: ["userStreak"] }),
      ]);

      showToast({
        type: "success",
        title: "¡Comida registrada!",
        message: `${Math.round(totals.calories)} kcal agregadas a tu día.`,
      });
      const date = loggedAt ? getDateKey(new Date(loggedAt)) : getDateKey();
      reset();
      router.replace({ pathname: "/(tabs)", params: { date } });
    } catch (err: any) {
      showAlert("Error al guardar", err?.message || "Ocurrió un error al persistir la comida.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewItem = () => {
    if (!newFoodName.trim()) return;
    const parseRes = parseQuantityInput(newFoodGrams, newFoodUnit);
    if (!parseRes.ok || parseRes.value <= 0) {
      showAlert("Cantidad inválida", parseRes.ok ? "Ingresa una cantidad mayor que cero." : parseRes.error);
      return;
    }
    const calories = parseDecimal(newFoodCals);
    const protein = parseDecimal(newFoodProt);
    const carbs = parseDecimal(newFoodCarbs);
    const fat = parseDecimal(newFoodFat);
    const validation = DetectedFoodItemSchema.safeParse({
      food: newFoodName.trim(),
      grams: parseRes.value,
      unit: parseRes.unit,
      calories,
      protein,
      carbs,
      fat,
    });
    if (!validation.success) {
      showAlert("Datos inválidos", "Ingresa cantidades y nutrientes válidos, sin números negativos.");
      return;
    }

    addItem({
      food: newFoodName.trim(),
      grams: parseRes.value,
      unit: parseRes.unit,
      calories,
      protein,
      carbs,
      fat,
      confidence: 1.0,
    });

    setNewFoodName("");
    setNewFoodGrams(newFoodUnit === "ml" ? "250" : "100");
    setNewFoodCals(""); setNewFoodProt(""); setNewFoodCarbs(""); setNewFoodFat("");
    setShowAddModal(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.reviewIntro}>Revisa tu comida</Text>
        <Text style={styles.reviewDate}>{(loggedAt ? new Date(loggedAt) : new Date()).toLocaleDateString("es-CL", { timeZone: APP_TIME_ZONE, day: "numeric", month: "long" })} · Ajusta las porciones antes de guardar</Text>
        {/* Banner de foto y resumen */}
        <View style={styles.topSummaryCard}>
          {localImageUri && (
            <Image source={{ uri: localImageUri }} style={styles.mealThumbnail} />
          )}
          <View style={styles.summaryInfo}>
            <View style={styles.mealTypeBadge}>
              <Text style={styles.mealTypeText}>{mealType.toUpperCase()}</Text>
            </View>
            <Text style={styles.totalCalsText}>{Math.round(totals.calories)} kcal</Text>
            <Text style={styles.macrosSummaryText}>
              {Math.round(totals.protein)}g P • {Math.round(totals.carbs)}g C • {Math.round(totals.fat)}g G
            </Text>
          </View>
        </View>

        {/* Selector de horario */}
        <View style={styles.typeSelectorRow}>
          {(["desayuno", "almuerzo", "cena", "snack"] as MealType[]).map((type) => (
            <TouchableOpacity
              key={type}
              accessibilityRole="button"
              accessibilityLabel={"Cambiar comida a " + type}
              accessibilityState={{ selected: mealType === type }}
              aria-pressed={mealType === type}
              style={[styles.typeButton, mealType === type && styles.typeButtonActive]}
              onPress={() => setMealType(type)}
            >
              <Text style={[styles.typeButtonText, mealType === type && styles.typeButtonTextActive]}>
                {type === "cena" ? "Once/Cena" : type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Título de la lista */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>Tu comida · {items.length} {items.length === 1 ? "alimento" : "alimentos"}</Text>
        </View>

        {/* Modal simple de agregado manual */}
        <View style={styles.addActions}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Añadir otro alimento desde USDA" onPress={() => setUsdaTarget("new")} style={styles.addSearchBtn}><Text style={styles.addSearchText}>+ Buscar alimento</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Añadir alimento manualmente" onPress={() => setShowAddModal(true)} style={styles.addManualBtn}><Text style={styles.addFoodLink}>Ingreso manual</Text></TouchableOpacity>
        </View>
        {showAddModal && (
          <View style={styles.manualAddCard}>
            <Text style={styles.manualAddTitle}>Datos de tu etiqueta</Text>
            <Text style={styles.manualHelp}>Ingresa los nutrientes de la porción indicada abajo, no los del envase completo. Si la etiqueta indica valores por 100 g o ml, añade esa cantidad y luego ajusta la porción.</Text>
            <TextInput
              accessibilityLabel="Nombre del alimento manual"
              style={styles.manualInput}
              placeholder="Nombre (ej: Palta Hass o Gatorade)"
              placeholderTextColor={colors.textMuted}
              value={newFoodName}
              onChangeText={(val) => {
                setNewFoodName(val);
                if (isLiquidFood(val) && newFoodUnit !== "ml") {
                  setNewFoodUnit("ml");
                  setNewFoodGrams("250");
                }
              }}
            />
            {/* Selector de unidad [ g | ml ] */}
            <View style={styles.manualUnitRow}>
              <Text style={styles.manualColLabel}>Tipo de alimento:</Text>
              <View style={styles.unitToggleGroup}>
                <TouchableOpacity
                  style={[styles.unitToggleBtn, newFoodUnit === "g" && styles.unitToggleBtnActive]}
                  onPress={() => {
                    setNewFoodUnit("g");
                    setNewFoodGrams("100");
                  }}
                  accessibilityLabel="Unidad gramos"
                  accessibilityState={{ selected: newFoodUnit === "g" }}
                >
                  <Text style={[styles.unitToggleText, newFoodUnit === "g" && styles.unitToggleTextActive]}>
                    g (Sólido)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitToggleBtn, newFoodUnit === "ml" && styles.unitToggleBtnActive]}
                  onPress={() => {
                    setNewFoodUnit("ml");
                    setNewFoodGrams("250");
                  }}
                  accessibilityLabel="Unidad mililitros"
                  accessibilityState={{ selected: newFoodUnit === "ml" }}
                >
                  <Text style={[styles.unitToggleText, newFoodUnit === "ml" && styles.unitToggleTextActive]}>
                    ml (Bebida)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.manualRow}>
              <View style={styles.manualCol}>
                <Text style={styles.manualColLabel}>
                  {newFoodUnit === "ml" ? "Volumen (ml / L)" : "Gramos (g)"}
                </Text>
                <TextInput
                  accessibilityLabel="Cantidad del alimento manual"
                  style={styles.manualInput}
                  value={newFoodGrams}
                  onChangeText={setNewFoodGrams}
                  placeholder={newFoodUnit === "ml" ? "ej: 250 o 1L" : "ej: 100"}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.manualCol}>
                <Text style={styles.manualColLabel}>Calorías</Text>
                <TextInput
                  accessibilityLabel="Calorías de la porción manual"
                  style={styles.manualInput}
                  keyboardType="numeric"
                  value={newFoodCals}
                  onChangeText={setNewFoodCals}
                />
              </View>
            </View>
            <View style={styles.manualRow}>
              <View style={styles.manualCol}>
                <Text style={styles.manualColLabel}>Prot (g)</Text>
                <TextInput
                  accessibilityLabel="Proteína de la porción manual"
                  style={styles.manualInput}
                  keyboardType="numeric"
                  value={newFoodProt}
                  onChangeText={setNewFoodProt}
                />
              </View>
              <View style={styles.manualCol}>
                <Text style={styles.manualColLabel}>Carbs (g)</Text>
                <TextInput
                  accessibilityLabel="Carbohidratos de la porción manual"
                  style={styles.manualInput}
                  keyboardType="numeric"
                  value={newFoodCarbs}
                  onChangeText={setNewFoodCarbs}
                />
              </View>
              <View style={styles.manualCol}>
                <Text style={styles.manualColLabel}>Grasas (g)</Text>
                <TextInput
                  accessibilityLabel="Grasas de la porción manual"
                  style={styles.manualInput}
                  keyboardType="numeric"
                  value={newFoodFat}
                  onChangeText={setNewFoodFat}
                />
              </View>
            </View>
            <View style={styles.manualActions}>
              <TouchableOpacity
                style={styles.cancelManualBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelManualText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Añadir alimento manual" style={styles.saveManualBtn} onPress={handleAddNewItem}>
                <Text style={styles.saveManualText}>Añadir alimento</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Estado vacío cuando no hay alimentos detectados */}
        {items.length === 0 && !showAddModal && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyTitle}>Bandeja de comida vacía</Text>
            <Text style={styles.emptyDescription}>
              Busca un alimento o copia los nutrientes de su etiqueta. Aquí podrás ajustar cada porción antes de guardar.
            </Text>
            <View style={styles.emptyButtonsContainer}>
              <TouchableOpacity
                style={styles.emptyPrimaryBtn}
                onPress={() => router.replace("/(tabs)")}
              >
                <Text style={styles.emptyPrimaryBtnText}>🏠 Ir al Panel Principal (Dashboard)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.emptySecondaryBtn}
                onPress={() => router.push("/meal/camera")}
              >
                <Text style={styles.emptySecondaryBtnText}>📸 Escanear Comida con Foto</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Guía visual de calibración de porciones chilenas */}
        {items.length > 0 && (
          <View style={styles.portionGuideCard}>
            <Text style={styles.portionGuideTitle}>💡 Calibra tus porciones con facilidad</Text>
            <Text style={styles.portionGuideSubtitle}>
              Estas medidas son aproximadas. Si puedes, pesa tu porción para registrarla con mayor precisión:
            </Text>
            <View style={styles.portionPillsRow}>
              <View style={styles.portionPill}>
                <Text style={styles.portionPillText}>✋ Palma: ~120-150g (carnes)</Text>
              </View>
              <View style={styles.portionPill}>
                <Text style={styles.portionPillText}>✊ Puño: ~1 taza (arroz/fideos)</Text>
              </View>
              <View style={styles.portionPill}>
                <Text style={styles.portionPillText}>🥄 Cuchara: ~15g (aceite/aderezo)</Text>
              </View>
            </View>
          </View>
        )}

        {/* Lista de alimentos interactiva */}
        {items.map((item, index) => {
          const hasVariants = !!findFamilyForFood(item.food);
          const isLowConfidence = item.confidence && item.confidence < 0.75;
          const itemUnit = resolveItemUnit(item);
          const isMl = itemUnit === "ml";
          const drinkVariant = getVariant(item.food);
          const standardPortions = getStandardPortions(itemUnit);

          return (
            <View key={item.id || index} style={styles.itemCard}>
              {/* Encabezado del ítem */}
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleBlock}>
                  <Text style={styles.itemNameText}>{item.food}</Text>
                  {item.nutrition_reference && (
                    <View>
                      <Text style={styles.nutritionSourceText}>Nutrientes: USDA · Revisa la porción</Text>
                      <Text style={styles.nutritionSourceText}>{item.nutrition_reference.description}</Text>
                    </View>
                  )}
                  {!item.nutrition_reference && <Text style={styles.nutritionSourceText}>Sin referencia USDA · Revisa los nutrientes</Text>}
                  {isLowConfidence && (
                    <View style={styles.warningPill}>
                      <Text style={styles.warningPillText}>⚠️ Revisa este alimento</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={"Quitar " + item.food}
                  onPress={() => { removeItem(index); setInputValues({}); setInputErrors({}); setActiveVariantIndex(null); }}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Botón para cambiar variante culinaria si existe */}
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={"Buscar referencia USDA para " + item.food} style={styles.variantBtn} onPress={() => setUsdaTarget(item.id || null)}>
                <Text style={styles.variantBtnText}>{item.nutrition_reference ? "Cambiar referencia USDA" : "Buscar nutrientes en USDA"}</Text>
              </TouchableOpacity>
              {hasVariants && (
                <TouchableOpacity
                  style={styles.variantBtn}
                  onPress={() => setActiveVariantIndex(index)}
                >
                  <Text style={styles.variantBtnText}>🔄 Cambiar variante / método de cocción</Text>
                </TouchableOpacity>
              )}

              {/* Botón de variante Zero / Sin Azúcar si es bebida reconocida */}
              {drinkVariant && (
                <TouchableOpacity
                  style={styles.drinkVariantBtn}
                  onPress={() => applyDrinkVariant(index, drinkVariant.target)}
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
                    onPress={() => {
                      updateItemUnit(index, "g");
                      setInputErrors((prev) => ({ ...prev, [index]: "" }));
                    }}
                    accessibilityLabel="Cambiar a gramos"
                    accessibilityState={{ selected: !isMl }}
                  >
                    <Text style={[styles.unitToggleText, !isMl && styles.unitToggleTextActive]}>g</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.unitToggleBtn, isMl && styles.unitToggleBtnActive]}
                    onPress={() => {
                      updateItemUnit(index, "ml");
                      setInputErrors((prev) => ({ ...prev, [index]: "" }));
                    }}
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
                  onPress={() => { adjustItemGramsDelta(index, isMl ? -50 : -10); clearQuantityInput(index); }}
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
                    value={
                      inputValues[index] !== undefined
                        ? inputValues[index]
                        : String(Math.round(item.grams))
                    }
                    onChangeText={(val) => {
                      setInputValues((prev) => ({ ...prev, [index]: val }));
                      const res = parseQuantityInput(val, itemUnit);
                      if (res.ok) {
                        updateItemGrams(index, res.value);
                        if (res.unit !== itemUnit) {
                          updateItemUnit(index, res.unit);
                        }
                        setInputErrors((prev) => ({ ...prev, [index]: "" }));
                      } else {
                        setInputErrors((prev) => ({ ...prev, [index]: res.error }));
                      }
                    }}
                    onBlur={() => {
                      setInputValues((prev) => {
                        const next = { ...prev };
                        delete next[index];
                        return next;
                      });
                    }}
                  />
                  <Text style={styles.gramsUnit}>{isMl ? "ml" : "g"}</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => { adjustItemGramsDelta(index, isMl ? 50 : 10); clearQuantityInput(index); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Aumentar porción de ${item.food}`}
                >
                  <Text style={styles.stepBtnText}>{isMl ? "+50ml" : "+10g"}</Text>
                </TouchableOpacity>
              </View>

              {inputErrors[index] ? (
                <Text style={styles.inlineErrorText}>{inputErrors[index]}</Text>
              ) : null}

              {/* Atajos rápidos por envase / porción */}
              <View style={styles.shortcutsRow}>
                {standardPortions.map((shortcut) => (
                  <TouchableOpacity
                    key={shortcut.value}
                    style={[
                      styles.shortcutChip,
                      Math.round(item.grams) === shortcut.value && styles.shortcutChipActive,
                    ]}
                    onPress={() => {
                      updateItemGrams(index, shortcut.value);
                      setInputValues((prev) => {
                        const next = { ...prev };
                        delete next[index];
                        return next;
                      });
                      setInputErrors((prev) => ({ ...prev, [index]: "" }));
                    }}
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
        })}
      </ScrollView>

      {/* Modal de variantes */}
      {usdaTarget !== null && (() => {
        const target = items.find(item => item.id === usdaTarget);
        return <UsdaSearchModal key={usdaTarget} initialQuery={target?.food} initialAmount={target?.grams} initialUnit={target?.unit}
          onClose={() => setUsdaTarget(null)} onSelect={selected => {
            if (usdaTarget === "new") addItem(selected);
            else {
              const index = useMealReviewStore.getState().items.findIndex(item => item.id === usdaTarget);
              if (index >= 0) { replaceItem(index, selected); setInputValues(prev => ({ ...prev, [index]: String(selected.grams) })); setInputErrors(prev => ({ ...prev, [index]: "" })); }
            }
          }} />;
      })()}
      {activeVariantIndex !== null && items[activeVariantIndex] && (
        <VariantModal
          visible={activeVariantIndex !== null}
          foodName={items[activeVariantIndex].food}
          onClose={() => setActiveVariantIndex(null)}
          onSelectVariant={(variant) => {
            updateItemVariant(activeVariantIndex, variant);
            setActiveVariantIndex(null);
          }}
        />
      )}

      {/* Modal para guardar como comida favorita */}
      <Modal visible={showFavModal} transparent animationType="fade" onRequestClose={() => setShowFavModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.favDialog}>
            <Text style={styles.favDialogTitle}>⭐ Guardar como Comida Frecuente</Text>
            <Text style={styles.favDialogSubtitle}>
              Así podrás registrar esta misma combinación con 1 toque en el futuro sin esperar a la IA.
            </Text>
            <TextInput
              style={styles.favInput}
              placeholder="Ej: Mi desayuno habitual"
              placeholderTextColor={colors.textMuted}
              value={favTitle}
              onChangeText={setFavTitle}
              autoFocus
            />
            <View style={styles.favActions}>
              <TouchableOpacity
                style={styles.favCancelBtn}
                onPress={() => setShowFavModal(false)}
              >
                <Text style={styles.favCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.favConfirmBtn, isSavingFavorite && styles.confirmBtnDisabled]}
                onPress={handleSaveFavorite}
                disabled={isSavingFavorite}
              >
                <Text style={styles.favConfirmText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barra de acción inferior con botones de guardado */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.favStarBtn}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving || !items.length }}
          disabled={saving || !items.length}
          onPress={() => setShowFavModal(true)}
        >
          <Text style={styles.favStarBtnText}>⭐ Guardar como frecuente</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Guardar comida"
          accessibilityState={{ disabled: saving || !items.length, busy: saving }}
          style={[styles.confirmBtn, (saving || !items.length) && styles.confirmBtnDisabled]}
          onPress={handleConfirmMeal}
          disabled={saving || !items.length}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmBtnText}>
              Guardar comida · {Math.round(totals.calories)} kcal
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    ...layout.narrowPage,
    paddingBottom: 190,
  },
  reviewIntro: { color: colors.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  reviewDate: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 20 },
  addActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  addSearchBtn: { minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: 12, backgroundColor: colors.primaryLight },
  addSearchText: { color: colors.primaryDark, fontSize: 13, fontWeight: "700" },
  addManualBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  manualHelp: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 14 },
  topSummaryCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
    alignItems: "center",
  },
  mealThumbnail: {
    width: 72,
    height: 72,
    borderRadius: 14,
    marginRight: 14,
  },
  summaryInfo: {
    flex: 1,
  },
  mealTypeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  mealTypeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  totalCalsText: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  macrosSummaryText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  portionGuideCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 16,
  },
  portionGuideTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 2,
  },
  portionGuideSubtitle: {
    fontSize: 11,
    color: "#15803D",
    marginBottom: 10,
  },
  portionPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  portionPill: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  portionPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#14532D",
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  typeButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  addFoodLink: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  manualAddCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    marginBottom: 16,
  },
  manualAddTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  manualInput: {
    width: "100%",
    minWidth: 0,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
  },
  manualRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  manualCol: {
    flex: 1,
    minWidth: 0,
  },
  manualColLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  manualActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 14,
  },
  cancelManualBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  cancelManualText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  saveManualBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  saveManualText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
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
  shortcutsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  shortcutChip: {
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
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    ...shadows.glow,
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  favStarBtn: {
    paddingVertical: 9,
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  favStarBtnText: {
    color: "#B45309",
    fontWeight: "700",
    fontSize: 12.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  favDialog: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  favDialogTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  favDialogSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  favInput: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 16,
  },
  favActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  favCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  favCancelText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  favConfirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  favConfirmText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  emptyContainer: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderStyle: "dashed",
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 320,
  },
  emptyButtonsContainer: {
    width: "100%",
    gap: 10,
  },
  emptyPrimaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    width: "100%",
  },
  emptyPrimaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  emptySecondaryBtn: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    width: "100%",
  },
  emptySecondaryBtnText: {
    color: colors.primaryDark,
    fontWeight: "700",
    fontSize: 15,
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
  inlineErrorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: -6,
    marginBottom: 8,
    textAlign: "center",
  },
  manualUnitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 4,
  },
});
