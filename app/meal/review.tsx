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
import { FavoritesModal } from "@/components/meal/FavoritesModal";
import { UsdaSearchModal } from "@/components/meal/UsdaSearchModal";
import { MealReviewItemCard } from "@/components/meal/MealReviewItemCard";
import { ReviewPortionGuide } from "@/components/meal/ReviewPortionGuide";
import {
  ManualAddFoodForm,
  ManualFoodDraft,
  EMPTY_MANUAL_FOOD_DRAFT,
} from "@/components/meal/ManualAddFoodForm";
import { colors, shadows, layout } from "@/constants/colors";
import { MealType, DetectedFoodItemSchema } from "@/types/meal";
import { parseDecimal, getDateKey, APP_TIME_ZONE } from "@/utils/dates";
import { parseQuantityInput, resolveItemUnit } from "@/utils/liquidUnits";
import { useDietaryPreferences } from "@/hooks/useDietaryPreferences";

export default function MealReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ manual?: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { saveFavorite, isSavingFavorite } = useFavoriteMeals();
  const { restrictions } = useDietaryPreferences();


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
    loadFavoriteCombo,
    addComboItems,
    getTotals,
    reset,
  } = useMealReviewStore();

  const [saving, setSaving] = useState(false);
  const [activeVariantIndex, setActiveVariantIndex] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(params.manual === "1");
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [usdaTarget, setUsdaTarget] = useState<string | "new" | null>(null);
  const [showFavModal, setShowFavModal] = useState(false);
  const [favTitle, setFavTitle] = useState("");
  const [manualDraft, setManualDraft] = useState<ManualFoodDraft>(EMPTY_MANUAL_FOOD_DRAFT);
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
      const result = await saveMealToDatabase({
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

      if ((result as any)?.offline) {
        showToast({
          type: "info",
          title: "Guardado sin conexión",
          message: "Se sincronizará automáticamente en segundo plano al volver internet.",
        });
      } else {
        showToast({
          type: "success",
          title: "¡Comida registrada!",
          message: `${Math.round(totals.calories)} kcal agregadas a tu día.`,
        });
      }
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
    if (!manualDraft.name.trim()) return;
    const parseRes = parseQuantityInput(manualDraft.grams, manualDraft.unit);
    if (!parseRes.ok || parseRes.value <= 0) {
      showAlert("Cantidad inválida", parseRes.ok ? "Ingresa una cantidad mayor que cero." : parseRes.error);
      return;
    }
    const calories = parseDecimal(manualDraft.calories);
    const protein = parseDecimal(manualDraft.protein);
    const carbs = parseDecimal(manualDraft.carbs);
    const fat = parseDecimal(manualDraft.fat);
    const validation = DetectedFoodItemSchema.safeParse({
      food: manualDraft.name.trim(),
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
      food: manualDraft.name.trim(),
      grams: parseRes.value,
      unit: parseRes.unit,
      calories,
      protein,
      carbs,
      fat,
      confidence: 1.0,
    });

    setManualDraft(EMPTY_MANUAL_FOOD_DRAFT);
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
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Añadir combo frecuente" onPress={() => setShowFavoritesModal(true)} style={styles.addComboBtn}><Text style={styles.addComboBtnText}>⭐ Combo frecuente</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Añadir alimento manualmente" onPress={() => setShowAddModal(true)} style={styles.addManualBtn}><Text style={styles.addFoodLink}>Ingreso manual</Text></TouchableOpacity>
        </View>
        {showAddModal && (
          <ManualAddFoodForm
            draft={manualDraft}
            onChangeDraft={(patch) => setManualDraft((prev) => ({ ...prev, ...patch }))}
            onCancel={() => setShowAddModal(false)}
            onSubmit={handleAddNewItem}
          />
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
        {items.length > 0 && <ReviewPortionGuide />}

        {/* Lista de alimentos interactiva */}
        {items.map((item, index) => (
          <MealReviewItemCard
            key={item.id || index}
            item={item}
            index={index}
            restrictions={restrictions}
            inputValue={inputValues[index]}
            inputError={inputErrors[index]}
            onRemove={(idx) => {
              removeItem(idx);
              setInputValues({});
              setInputErrors({});
              setActiveVariantIndex(null);
            }}
            onOpenUsda={(id) => setUsdaTarget(id)}
            onOpenVariants={(idx) => setActiveVariantIndex(idx)}
            onApplyDrinkVariant={(idx, target) => applyDrinkVariant(idx, target)}
            onUpdateUnit={(idx, unit) => {
              updateItemUnit(idx, unit);
              setInputErrors((prev) => ({ ...prev, [idx]: "" }));
            }}
            onAdjustDelta={(idx, delta) => {
              adjustItemGramsDelta(idx, delta);
              clearQuantityInput(idx);
            }}
            onChangeQuantity={(idx, val, parsedValue, newUnit, errorMsg) => {
              setInputValues((prev) => ({ ...prev, [idx]: val }));
              if (errorMsg) {
                setInputErrors((prev) => ({ ...prev, [idx]: errorMsg }));
              } else {
                updateItemGrams(idx, parsedValue);
                const currentUnit = resolveItemUnit(item);
                if (newUnit !== currentUnit) {
                  updateItemUnit(idx, newUnit);
                }
                setInputErrors((prev) => ({ ...prev, [idx]: "" }));
              }
            }}
            onBlurQuantity={(idx) => {
              setInputValues((prev) => {
                const next = { ...prev };
                delete next[idx];
                return next;
              });
            }}
            onSelectPortion={(idx, portion) => {
              updateItemGrams(idx, portion);
              setInputValues((prev) => {
                const next = { ...prev };
                delete next[idx];
                return next;
              });
              setInputErrors((prev) => ({ ...prev, [idx]: "" }));
            }}
          />
        ))}
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
            if (variant.grams) {
              setInputValues((prev) => ({
                ...prev,
                [activeVariantIndex]: String(Math.round(variant.grams!)),
              }));
              setInputErrors((prev) => ({ ...prev, [activeVariantIndex]: "" }));
            }
            setActiveVariantIndex(null);
          }}
        />
      )}

      {/* Modal de Combos y Comidas Frecuentes */}
      <FavoritesModal
        visible={showFavoritesModal}
        onClose={() => setShowFavoritesModal(false)}
        mealType={mealType}
        onSelectCombo={(fav) => {
          if (items.length === 0) {
            loadFavoriteCombo(fav, mealType);
          } else {
            addComboItems(fav);
          }
          setShowFavoritesModal(false);
        }}
      />

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
  addComboBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  addComboBtnText: {
    color: "#3730A3",
    fontSize: 13,
    fontWeight: "700",
  },
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
  typeSelectorRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  typeButton: {
    minHeight: 44,
    justifyContent: "center",
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
    minHeight: 44,
    justifyContent: "center",
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
});
