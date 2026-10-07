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
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useFavoriteMeals } from "@/hooks/useFavoriteMeals";
import { saveMealToDatabase } from "@/services/mealService";
import { VariantModal } from "@/components/meal/VariantModal";
import { findFamilyForFood } from "@/constants/chileanPresets";
import { colors } from "@/constants/colors";
import { MealType } from "@/types/meal";
import { DetectedFoodItemSchema } from "@/types/meal";
import { parseDecimal } from "@/utils/dates";

export default function MealReviewScreen() {
  const router = useRouter();
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
    updateItemVariant,
    removeItem,
    addItem,
    getTotals,
    reset,
  } = useMealReviewStore();

  const [saving, setSaving] = useState(false);
  const [activeVariantIndex, setActiveVariantIndex] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFavModal, setShowFavModal] = useState(false);
  const [favTitle, setFavTitle] = useState("");
  const [newFoodName, setNewFoodName] = useState("");
  const [newFoodGrams, setNewFoodGrams] = useState("100");
  const [newFoodCals, setNewFoodCals] = useState("150");
  const [newFoodProt, setNewFoodProt] = useState("10");
  const [newFoodCarbs, setNewFoodCarbs] = useState("15");
  const [newFoodFat, setNewFoodFat] = useState("5");

  const totals = getTotals();

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
    if (!user) {
      showAlert("Error", "No se detectó sesión de usuario.");
      return;
    }

    if (items.length === 0) {
      showAlert("Aviso", "Debes tener al menos un alimento en la lista.");
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

      // Invalidar queries de TanStack para refrescar Dashboard e Historial de inmediato
      await queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] });
      await queryClient.invalidateQueries({ queryKey: ["weeklyStats"] });

      showToast({
        type: "success",
        title: "¡Comida registrada!",
        message: `${Math.round(totals.calories)} kcal agregadas a tu día.`,
      });
      reset();
      router.replace("/(tabs)");
    } catch (err: any) {
      showAlert("Error al guardar", err?.message || "Ocurrió un error al persistir la comida.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewItem = () => {
    if (!newFoodName.trim()) return;
    const grams = parseDecimal(newFoodGrams);
    const calories = parseDecimal(newFoodCals);
    const protein = parseDecimal(newFoodProt);
    const carbs = parseDecimal(newFoodCarbs);
    const fat = parseDecimal(newFoodFat);
    if (!DetectedFoodItemSchema.safeParse({ food: newFoodName.trim(), grams, calories, protein, carbs, fat }).success) {
      showAlert("Datos inválidos", "Ingresa cantidades y nutrientes válidos, sin números negativos.");
      return;
    }

    addItem({
      food: newFoodName.trim(),
      grams,
      calories,
      protein,
      carbs,
      fat,
      confidence: 1.0,
    });

    setNewFoodName("");
    setShowAddModal(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
          <Text style={styles.listHeaderTitle}>Alimentos Detectados ({items.length})</Text>
          <TouchableOpacity onPress={() => setShowAddModal(true)}>
            <Text style={styles.addFoodLink}>+ Agregar otro</Text>
          </TouchableOpacity>
        </View>

        {/* Modal simple de agregado manual */}
        {showAddModal && (
          <View style={styles.manualAddCard}>
            <Text style={styles.manualAddTitle}>Agregar Alimento Manual</Text>
            <TextInput
              style={styles.manualInput}
              placeholder="Nombre (ej: Palta Hass)"
              placeholderTextColor={colors.textMuted}
              value={newFoodName}
              onChangeText={setNewFoodName}
            />
            <View style={styles.manualRow}>
              <View style={styles.manualCol}>
                <Text style={styles.manualColLabel}>Gramos</Text>
                <TextInput
                  style={styles.manualInput}
                  keyboardType="numeric"
                  value={newFoodGrams}
                  onChangeText={setNewFoodGrams}
                />
              </View>
              <View style={styles.manualCol}>
                <Text style={styles.manualColLabel}>Calorías</Text>
                <TextInput
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
                  style={styles.manualInput}
                  keyboardType="numeric"
                  value={newFoodProt}
                  onChangeText={setNewFoodProt}
                />
              </View>
              <View style={styles.manualCol}>
                <Text style={styles.manualColLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.manualInput}
                  keyboardType="numeric"
                  value={newFoodCarbs}
                  onChangeText={setNewFoodCarbs}
                />
              </View>
              <View style={styles.manualCol}>
                <Text style={styles.manualColLabel}>Grasas (g)</Text>
                <TextInput
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
              <TouchableOpacity style={styles.saveManualBtn} onPress={handleAddNewItem}>
                <Text style={styles.saveManualText}>Añadir</Text>
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
              Esta pantalla es para revisar y confirmar los alimentos detectados por la IA después de tomar una foto o ingresar una comida.
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

        {/* Lista de alimentos interactiva */}
        {items.map((item, index) => {
          const hasVariants = !!findFamilyForFood(item.food);
          const isLowConfidence = item.confidence && item.confidence < 0.75;

          return (
            <View key={item.id || index} style={styles.itemCard}>
              {/* Encabezado del ítem */}
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleBlock}>
                  <Text style={styles.itemNameText}>{item.food}</Text>
                  {isLowConfidence && (
                    <View style={styles.warningPill}>
                      <Text style={styles.warningPillText}>⚠️ Revisa este alimento</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeItem(index)}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Botón para cambiar variante culinaria si existe */}
              {hasVariants && (
                <TouchableOpacity
                  style={styles.variantBtn}
                  onPress={() => setActiveVariantIndex(index)}
                >
                  <Text style={styles.variantBtnText}>🔄 Cambiar variante / método de cocción</Text>
                </TouchableOpacity>
              )}

              {/* Ajuste de Gramos (Botones [-10] [+10] y Entrada) */}
              <View style={styles.gramsControlRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjustItemGramsDelta(index, -10)}
                >
                  <Text style={styles.stepBtnText}>-10g</Text>
                </TouchableOpacity>

                <View style={styles.gramsDisplay}>
                  <TextInput
                    style={styles.gramsInput}
                    keyboardType="numeric"
                    value={String(Math.round(item.grams))}
                    onChangeText={(val) => updateItemGrams(index, parseDecimal(val))}
                  />
                  <Text style={styles.gramsUnit}>g</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjustItemGramsDelta(index, 10)}
                >
                  <Text style={styles.stepBtnText}>+10g</Text>
                </TouchableOpacity>
              </View>

              {/* Atajos rápidos de gramos */}
              <View style={styles.shortcutsRow}>
                {[100, 150, 180, 200, 250].map((shortcut) => (
                  <TouchableOpacity
                    key={shortcut}
                    style={[
                      styles.shortcutChip,
                      Math.round(item.grams) === shortcut && styles.shortcutChipActive,
                    ]}
                    onPress={() => updateItemGrams(index, shortcut)}
                  >
                    <Text
                      style={[
                        styles.shortcutChipText,
                        Math.round(item.grams) === shortcut && styles.shortcutChipTextActive,
                      ]}
                    >
                      {shortcut}g
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
          onPress={() => setShowFavModal(true)}
        >
          <Text style={styles.favStarBtnText}>⭐ Guardar como frecuente</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmBtn, saving && styles.confirmBtnDisabled]}
          onPress={handleConfirmMeal}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmBtnText}>
              Confirmar Comida ({Math.round(totals.calories)} kcal) ✓
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
    padding: 16,
    paddingBottom: 110,
  },
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
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    fontWeight: "700",
    color: colors.text,
  },
  warningPill: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  warningPillText: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "700",
  },
  removeBtn: {
    padding: 4,
  },
  removeBtnText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: "700",
  },
  variantBtn: {
    backgroundColor: colors.background,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  variantBtnText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  gramsControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 14,
  },
  stepBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  stepBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  gramsDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  gramsInput: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
    minWidth: 50,
  },
  gramsUnit: {
    fontSize: 16,
    fontWeight: "600",
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
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  shortcutChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  shortcutChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  shortcutChipTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  itemTotalsFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  itemCals: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  itemMacrosDetail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  favStarBtn: {
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  favStarBtnText: {
    color: "#B45309",
    fontWeight: "700",
    fontSize: 13,
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
