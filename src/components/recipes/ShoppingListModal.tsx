import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Platform,
} from "react-native";
import {
  ShoppingBasket,
  X,
  Check,
  Plus,
  Minus,
  Trash2,
  Share2,
  Sparkles,
} from "lucide-react-native";
import { useShoppingListStore } from "@/stores/useShoppingListStore";
import {
  GROCERY_CATEGORIES,
  buildShoppingList,
  formatShoppingListForShare,
} from "@/utils/shoppingListUtils";
import { formatQuantityDisplay } from "@/utils/liquidUnits";
import { colors, shadows } from "@/constants/colors";
import { showToast } from "@/utils/alerts";

interface ShoppingListModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ShoppingListModal({ visible, onClose }: ShoppingListModalProps) {
  const {
    plannedRecipes,
    checkedMap,
    customItems,
    addOrUpdateRecipe,
    removeRecipe,
    toggleItemChecked,
    addCustomItem,
    removeCustomItem,
    clearAll,
  } = useShoppingListStore();

  const [newItemText, setNewItemText] = useState("");

  const items = useMemo(
    () => buildShoppingList(plannedRecipes, checkedMap, customItems),
    [plannedRecipes, checkedMap, customItems]
  );

  const totalCount = items.length;
  const checkedCount = items.filter((i) => i.checked).length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const handleAddCustom = () => {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    addCustomItem(trimmed);
    setNewItemText("");
  };

  const handleShareOrCopy = async () => {
    if (items.length === 0) return;
    const formatted = formatShoppingListForShare(items, plannedRecipes);
    try {
      if (
        Platform.OS === "web" &&
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(formatted);
        showToast({
          type: "success",
          title: "¡Lista copiada!",
          message: "Pégala en tu WhatsApp o notas para llevarla a la feria o supermercado.",
        });
        return;
      }
      await Share.share({
        message: formatted,
        title: "Mi Lista de Compras · Nutrición IA",
      });
    } catch {
      showToast({
        type: "info",
        title: "Lista lista para usar",
        message: "Puedes ir marcando cada producto aquí mismo mientras compras.",
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIcon}>
                <ShoppingBasket size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.overline}>PLANIFICADOR SEMANAL</Text>
                <Text accessibilityRole="header" style={styles.title}>
                  Lista para la Feria y Súper
                </Text>
              </View>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cerrar lista de compras"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Barra de progreso si hay ítems */}
            {totalCount > 0 && (
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>
                    {checkedCount} de {totalCount} productos en el carro
                  </Text>
                  <Text style={styles.progressPct}>{progressPct}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, progressPct)}%` },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Recetas planificadas */}
            {plannedRecipes.length > 0 && (
              <View style={styles.recipesBox}>
                <Text style={styles.sectionLabel}>
                  🍲 RECETAS INCLUIDAS ({plannedRecipes.length})
                </Text>
                <View style={styles.recipesList}>
                  {plannedRecipes.map(({ recipe, servings }) => (
                    <View key={recipe.id} style={styles.recipeRow}>
                      <Text style={styles.recipeRowTitle} numberOfLines={1}>
                        {recipe.title}
                      </Text>
                      <View style={styles.servingsControls}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Menos porciones de ${recipe.title}`}
                          onPress={() =>
                            servings <= 1
                              ? removeRecipe(recipe.id)
                              : addOrUpdateRecipe(recipe, servings - 1)
                          }
                          style={styles.stepBtn}
                        >
                          <Minus size={13} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.servingsText}>{servings} porc.</Text>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Más porciones de ${recipe.title}`}
                          onPress={() => addOrUpdateRecipe(recipe, servings + 1)}
                          style={styles.stepBtn}
                        >
                          <Plus size={13} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Quitar ${recipe.title} de la lista`}
                          onPress={() => removeRecipe(recipe.id)}
                          style={styles.removeRecipeBtn}
                        >
                          <X size={14} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Agregar ítem extra manual */}
            <View style={styles.addCustomRow}>
              <TextInput
                style={styles.customInput}
                placeholder="Agregar extra (ej: Marraqueta, café, servilletas…)"
                placeholderTextColor={colors.textMuted}
                value={newItemText}
                onChangeText={setNewItemText}
                onSubmitEditing={handleAddCustom}
                returnKeyType="done"
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Añadir producto a la lista"
                onPress={handleAddCustom}
                style={[
                  styles.addCustomBtn,
                  !newItemText.trim() && { opacity: 0.5 },
                ]}
                disabled={!newItemText.trim()}
              >
                <Plus size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Estado vacío */}
            {totalCount === 0 ? (
              <View style={styles.emptyBox}>
                <Sparkles size={28} color={colors.primary} />
                <Text style={styles.emptyTitle}>
                  Tu lista de compras está vacía
                </Text>
                <Text style={styles.emptyDesc}>
                  Toca el botón &ldquo;+ Lista de compras&rdquo; en tus recetas chilenas favoritas y agruparemos automáticamente cada ingrediente para la feria y el supermercado.
                </Text>
              </View>
            ) : (
              /* Categorías agrupadas */
              GROCERY_CATEGORIES.map((cat) => {
                const catItems = items.filter((i) => i.category === cat.key);
                if (catItems.length === 0) return null;

                return (
                  <View key={cat.key} style={styles.categoryCard}>
                    <View style={styles.categoryHeader}>
                      <View
                        style={[
                          styles.categoryEmojiWrap,
                          { backgroundColor: cat.badgeBg },
                        ]}
                      >
                        <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.categoryTitle}>{cat.title}</Text>
                        <Text style={styles.categorySubtitle}>{cat.subtitle}</Text>
                      </View>
                      <View
                        style={[
                          styles.categoryCountBadge,
                          { backgroundColor: cat.badgeBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryCountText,
                            { color: cat.badgeColor },
                          ]}
                        >
                          {catItems.filter((i) => i.checked).length}/{catItems.length}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.itemsList}>
                      {catItems.map((item) => (
                        <TouchableOpacity
                          key={item.key}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: item.checked }}
                          accessibilityLabel={`${item.name} ${
                            item.grams > 0
                              ? formatQuantityDisplay(item.grams, item.unit)
                              : ""
                          }`}
                          onPress={() => toggleItemChecked(item.key)}
                          activeOpacity={0.75}
                          style={[
                            styles.itemRow,
                            item.checked && styles.itemRowChecked,
                          ]}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              item.checked && styles.checkboxChecked,
                            ]}
                          >
                            {item.checked && (
                              <Check size={13} color="#FFFFFF" strokeWidth={3} />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.itemName,
                                item.checked && styles.itemNameChecked,
                              ]}
                            >
                              {item.name}
                            </Text>
                            {item.fromRecipes.length > 0 && (
                              <Text style={styles.itemSource} numberOfLines={1}>
                                Para: {item.fromRecipes.join(", ")}
                              </Text>
                            )}
                          </View>
                          {item.grams > 0 && (
                            <View style={styles.qtyPill}>
                              <Text style={styles.qtyText}>
                                {formatQuantityDisplay(item.grams, item.unit)}
                              </Text>
                            </View>
                          )}
                          {item.isCustom && (
                            <TouchableOpacity
                              accessibilityRole="button"
                              accessibilityLabel={`Eliminar ${item.name}`}
                              onPress={() => removeCustomItem(item.key)}
                              style={styles.deleteCustomBtn}
                            >
                              <Trash2 size={14} color={colors.textMuted} />
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          {totalCount > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Vaciar toda la lista"
                onPress={clearAll}
                style={styles.clearBtn}
              >
                <Trash2 size={16} color={colors.danger} />
                <Text style={styles.clearBtnText}>Vaciar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Copiar o compartir lista para WhatsApp"
                onPress={handleShareOrCopy}
                style={styles.shareBtn}
              >
                <Share2 size={16} color="#FFFFFF" />
                <Text style={styles.shareBtnText}>
                  Copiar para WhatsApp / Notas
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    overflow: "hidden",
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  overline: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 32,
    gap: 14,
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  progressPct: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  recipesBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  recipesList: {
    gap: 8,
  },
  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primaryGhost,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  recipeRowTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  servingsControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  servingsText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark,
    minWidth: 48,
    textAlign: "center",
  },
  removeRecipeBtn: {
    padding: 4,
    marginLeft: 2,
  },
  addCustomRow: {
    flexDirection: "row",
    gap: 8,
  },
  customInput: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.card,
    borderRadius: 13,
    paddingHorizontal: 14,
    fontSize: 13,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  addCustomBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  categoryEmojiWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  categorySubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  categoryCountBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: "800",
  },
  itemsList: {
    gap: 6,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  itemRowChecked: {
    backgroundColor: colors.primaryGhost,
    borderColor: "#BBF7D0",
    opacity: 0.78,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  itemNameChecked: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  itemSource: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  qtyPill: {
    backgroundColor: colors.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  deleteCustomBtn: {
    padding: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: colors.dangerLight,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.danger,
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: colors.primary,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
