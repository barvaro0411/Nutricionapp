import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";
import { useFavoriteMeals } from "@/hooks/useFavoriteMeals";
import { deleteSavedMeal, updateSavedMeal } from "@/services/mealService";
import { useAuthStore } from "@/stores/useAuthStore";
import { MealType, MealWithItems } from "@/types/meal";
import { showAlert, showToast } from "@/utils/alerts";
import {
  APP_TIME_ZONE,
  dateForMealRoute,
  getDateKey,
  loggedAtForDate,
} from "@/utils/dates";
import { formatQuantityDisplay, resolveItemUnit } from "@/utils/liquidUnits";
import {
  computeMealItemsTotals,
  EditableMealItem,
  scaleMealItemGrams,
} from "@/utils/mealEditUtils";

interface SavedMealDetailModalProps {
  meal: MealWithItems | null;
  visible: boolean;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}

const MEAL_MOMENTS: { id: MealType; label: string }[] = [
  { id: "desayuno", label: "Desayuno" },
  { id: "almuerzo", label: "Almuerzo" },
  { id: "cena", label: "Once / Cena" },
  { id: "snack", label: "Colación" },
];

export function SavedMealDetailModal({
  meal,
  visible,
  onClose,
  onChanged,
}: SavedMealDetailModalProps) {
  const user = useAuthStore((s) => s.user);
  const { saveFavorite, isSavingFavorite } = useFavoriteMeals();

  const [mealType, setMealType] = useState<MealType>("almuerzo");
  const [targetDateKey, setTargetDateKey] = useState<string>(getDateKey());
  const [items, setItems] = useState<EditableMealItem[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [draftGrams, setDraftGrams] = useState<Record<string, string>>({});
  const [busyAction, setBusyAction] = useState<"save" | "delete" | null>(null);
  const [savedFav, setSavedFav] = useState(false);

  useEffect(() => {
    if (!meal) return;
    setMealType(meal.meal_type);
    setTargetDateKey(getDateKey(new Date(meal.logged_at)));
    const editable: EditableMealItem[] = meal.items.map((it) => ({
      id: it.id,
      food_name: it.food_name,
      grams: Number(it.grams) || 100,
      unit: resolveItemUnit(it),
      calories: Number(it.calories) || 0,
      protein: Number(it.protein) || 0,
      carbs: Number(it.carbs) || 0,
      fat: Number(it.fat) || 0,
    }));
    setItems(editable);
    setRemovedIds([]);
    setDraftGrams(
      Object.fromEntries(editable.map((it) => [it.id, String(Math.round(it.grams))]))
    );
    setSavedFav(false);
    setBusyAction(null);
  }, [meal]);

  const totals = useMemo(() => computeMealItemsTotals(items), [items]);

  const applyGramsChange = (itemId: string, nextValue: number) => {
    if (!Number.isFinite(nextValue) || nextValue <= 0) return;
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? scaleMealItemGrams(it, nextValue) : it))
    );
    setDraftGrams((prev) => ({
      ...prev,
      [itemId]: String(Math.round(nextValue)),
    }));
  };

  const handleTextGramsChange = (itemId: string, raw: string) => {
    setDraftGrams((prev) => ({ ...prev, [itemId]: raw }));
    const cleaned = raw.replace(",", ".");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 20000) {
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? scaleMealItemGrams(it, parsed) : it))
      );
    }
  };

  const handleRemoveItem = (itemId: string) => {
    if (items.length <= 1) {
      showAlert(
        "Último alimento",
        "Para quitar el único alimento, usa el botón Eliminar comida completa abajo."
      );
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    setRemovedIds((prev) => [...prev, itemId]);
  };

  const shiftDateByDays = (delta: number) => {
    const base = dateForMealRoute(targetDateKey);
    base.setUTCDate(base.getUTCDate() + delta);
    setTargetDateKey(getDateKey(base));
  };

  const formattedDate = useMemo(() => {
    const d = dateForMealRoute(targetDateKey);
    if (targetDateKey === getDateKey()) return "Hoy";
    return d.toLocaleDateString("es-CL", {
      timeZone: APP_TIME_ZONE,
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }, [targetDateKey]);

  const handleSaveChanges = async () => {
    if (!meal || !user || busyAction) return;
    setBusyAction("save");
    try {
      const originalDateKey = getDateKey(new Date(meal.logged_at));
      const loggedAtIso =
        targetDateKey === originalDateKey
          ? meal.logged_at
          : loggedAtForDate(dateForMealRoute(targetDateKey));

      await updateSavedMeal({
        userId: user.id,
        mealId: meal.id,
        mealType,
        loggedAtIso,
        items,
        removedItemIds: removedIds,
      });

      await onChanged();
      showToast({
        type: "success",
        title: "Comida actualizada",
        message: `${Math.round(totals.calories)} kcal · cambios guardados en tu diario.`,
      });
      onClose();
    } catch (err: any) {
      showAlert(
        "No se pudo guardar",
        err?.message || "Revisa las cantidades e intenta nuevamente."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteMeal = () => {
    if (!meal || !user || busyAction) return;
    showAlert(
      "Eliminar comida",
      "¿Seguro que quieres borrar este registro de tu diario? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setBusyAction("delete");
            try {
              await deleteSavedMeal({
                userId: user.id,
                mealId: meal.id,
                imagePath: meal.image_path,
              });
              await onChanged();
              showToast({
                type: "info",
                title: "Comida eliminada",
                message: "Se actualizó tu resumen del día.",
              });
              onClose();
            } catch (err: any) {
              showAlert(
                "Error al eliminar",
                err?.message || "No se pudo borrar el registro."
              );
            } finally {
              setBusyAction(null);
            }
          },
        },
      ]
    );
  };

  const handleSaveAsFavorite = async () => {
    if (!items.length || isSavingFavorite || savedFav) return;
    const title = items
      .slice(0, 2)
      .map((i) => i.food_name)
      .join(" + ")
      .slice(0, 60);
    try {
      await saveFavorite({
        title: title || "Comida guardada",
        mealType,
        items: items.map((i) => ({
          food: i.food_name,
          grams: i.grams,
          unit: i.unit,
          calories: i.calories,
          protein: i.protein,
          carbs: i.carbs,
          fat: i.fat,
          confidence: 1,
        })),
        totals,
      });
      setSavedFav(true);
      showToast({
        type: "success",
        title: "Guardada en Favoritos",
        message: "La encontrarás en Comidas Frecuentes para registrarla en 1 toque.",
      });
    } catch (err: any) {
      showAlert(
        "Favoritos",
        err?.message || "No se pudo guardar en tus comidas frecuentes."
      );
    }
  };

  if (!meal) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.overline}>EDITAR REGISTRO</Text>
              <Text style={styles.title}>Ajusta tu comida</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar editor de comida"
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* Resumen en vivo */}
            <View style={styles.totalsRow}>
              <View style={styles.totalCell}>
                <Text style={[styles.totalNum, { color: colors.primaryDark }]}>
                  {Math.round(totals.calories)}
                </Text>
                <Text style={styles.totalLbl}>kcal</Text>
              </View>
              <View style={styles.totalCell}>
                <Text style={[styles.totalNum, { color: colors.protein }]}>
                  {Math.round(totals.protein)}g
                </Text>
                <Text style={styles.totalLbl}>Prot</Text>
              </View>
              <View style={styles.totalCell}>
                <Text style={[styles.totalNum, { color: colors.carbs }]}>
                  {Math.round(totals.carbs)}g
                </Text>
                <Text style={styles.totalLbl}>Carbos</Text>
              </View>
              <View style={styles.totalCell}>
                <Text style={[styles.totalNum, { color: colors.fat }]}>
                  {Math.round(totals.fat)}g
                </Text>
                <Text style={styles.totalLbl}>Grasas</Text>
              </View>
            </View>

            {/* Momento del día */}
            <Text style={styles.sectionLabel}>Momento del día</Text>
            <View style={styles.momentsRow}>
              {MEAL_MOMENTS.map((m) => {
                const active = m.id === mealType;
                return (
                  <Pressable
                    key={m.id}
                    style={[styles.momentChip, active && styles.momentChipActive]}
                    onPress={() => setMealType(m.id)}
                  >
                    <Text
                      style={[
                        styles.momentChipText,
                        active && styles.momentChipTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Mover fecha */}
            <Text style={styles.sectionLabel}>Día del registro</Text>
            <View style={styles.dateBar}>
              <TouchableOpacity
                style={styles.dateStepBtn}
                onPress={() => shiftDateByDays(-1)}
                accessibilityLabel="Mover un día atrás"
              >
                <ChevronLeft size={16} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.dateCenter}>
                <CalendarDays size={15} color={colors.primary} />
                <Text style={styles.dateLabel}>{formattedDate}</Text>
              </View>
              <TouchableOpacity
                style={styles.dateStepBtn}
                onPress={() => shiftDateByDays(1)}
                accessibilityLabel="Mover un día adelante"
              >
                <ChevronRight size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Alimentos editables */}
            <Text style={styles.sectionLabel}>Alimentos ({items.length})</Text>
            <View style={styles.itemsList}>
              {items.map((item) => {
                const step = item.unit === "ml" ? 50 : 25;
                return (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.food_name}</Text>
                        <Text style={styles.itemMacros}>
                          {Math.round(item.calories)} kcal · {Math.round(item.protein)}g P ·{" "}
                          {Math.round(item.carbs)}g C · {Math.round(item.fat)}g G
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeItemBtn}
                        onPress={() => handleRemoveItem(item.id)}
                        accessibilityLabel={`Quitar ${item.food_name}`}
                      >
                        <Trash2 size={15} color={colors.danger} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.stepperRow}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() =>
                          applyGramsChange(item.id, Math.max(5, item.grams - step))
                        }
                        accessibilityLabel={`Restar ${step} ${item.unit}`}
                      >
                        <Minus size={14} color={colors.text} />
                        <Text style={styles.stepBtnTxt}>{step}</Text>
                      </TouchableOpacity>

                      <View style={styles.gramsInputWrap}>
                        <TextInput
                          style={styles.gramsInput}
                          value={draftGrams[item.id] ?? String(Math.round(item.grams))}
                          onChangeText={(v) => handleTextGramsChange(item.id, v)}
                          keyboardType="numeric"
                        />
                        <Text style={styles.gramsUnit}>{item.unit}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => applyGramsChange(item.id, item.grams + step)}
                        accessibilityLabel={`Sumar ${step} ${item.unit}`}
                      >
                        <Plus size={14} color={colors.text} />
                        <Text style={styles.stepBtnTxt}>{step}</Text>
                      </TouchableOpacity>

                      <Text style={styles.displayBadge}>
                        {formatQuantityDisplay(item.grams, item.unit)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Acción secundaria: Guardar en Favoritos */}
            <TouchableOpacity
              style={[styles.favBtn, savedFav && styles.favBtnDone]}
              onPress={() => void handleSaveAsFavorite()}
              disabled={isSavingFavorite || savedFav}
            >
              {savedFav ? (
                <Check size={16} color={colors.primaryDark} />
              ) : (
                <Star size={16} color={colors.carbs} />
              )}
              <Text style={styles.favBtnText}>
                {savedFav
                  ? "Guardada en tus Comidas Frecuentes"
                  : isSavingFavorite
                    ? "Guardando favorita..."
                    : "Guardar combinación en Favoritos"}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer de acciones */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDeleteMeal}
              disabled={!!busyAction}
              accessibilityRole="button"
              accessibilityLabel="Eliminar comida completa"
            >
              <Trash2 size={17} color={colors.danger} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, busyAction && { opacity: 0.7 }]}
              onPress={() => void handleSaveChanges()}
              disabled={!!busyAction}
              accessibilityRole="button"
              accessibilityLabel="Guardar cambios"
            >
              {busyAction === "save" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={17} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Guardar cambios</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(6, 15, 11, 0.62)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxHeight: "90%",
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 20,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  overline: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: colors.primaryDark,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollBody: {
    paddingBottom: 14,
  },
  totalsRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 12,
    marginBottom: 16,
  },
  totalCell: {
    flex: 1,
    alignItems: "center",
  },
  totalNum: {
    fontSize: 16,
    fontWeight: "800",
  },
  totalLbl: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  momentsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  momentChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  momentChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  momentChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  momentChipTextActive: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 6,
    marginBottom: 16,
  },
  dateStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    textTransform: "capitalize",
  },
  itemsList: {
    gap: 10,
    marginBottom: 14,
  },
  itemCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    gap: 10,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  itemMacros: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  removeItemBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  stepBtnTxt: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  gramsInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 34,
    minWidth: 74,
  },
  gramsInput: {
    minWidth: 38,
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
  },
  gramsUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginLeft: 3,
  },
  displayBadge: {
    marginLeft: "auto",
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
  favBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.carbsLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  favBtnDone: {
    backgroundColor: colors.primaryLight,
  },
  favBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  deleteBtn: {
    width: 50,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
