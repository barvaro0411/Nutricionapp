import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { colors } from "@/constants/colors";
import {
  findFamilyForFood,
  FoodVariant,
  COMMON_ACCOMPANIMENTS,
  PortionOption,
} from "@/constants/chileanPresets";
import { FoodUnit } from "@/types/meal";

export interface SelectedVariantPayload extends FoodVariant {
  grams?: number;
  unit?: FoodUnit;
}

interface VariantModalProps {
  visible: boolean;
  foodName: string;
  onClose: () => void;
  onSelectVariant: (variant: SelectedVariantPayload) => void;
}

export function VariantModal({
  visible,
  foodName,
  onClose,
  onSelectVariant,
}: VariantModalProps) {
  const family = findFamilyForFood(foodName);
  const [tab, setTab] = useState<"variants" | "sides">("variants");

  if (!family) return null;

  const showSidesTab = family.id !== "acompanamientos";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Encabezado */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Variantes y Cocción</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cerrar selector de variantes"
                onPress={onClose}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>
              Categoría: <Text style={styles.subtitleBold}>{family.category}</Text>
            </Text>
          </View>

          {/* Selector de Pestañas (Variantes vs Acompañamientos) */}
          {showSidesTab && (
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabBtn, tab === "variants" && styles.tabBtnActive]}
                onPress={() => setTab("variants")}
                accessibilityRole="button"
                accessibilityLabel="Ver variantes de este alimento"
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    tab === "variants" && styles.tabBtnTextActive,
                  ]}
                >
                  🥘 Variantes y Cocción
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, tab === "sides" && styles.tabBtnActive]}
                onPress={() => setTab("sides")}
                accessibilityRole="button"
                accessibilityLabel="Ver acompañamientos sugeridos"
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    tab === "sides" && styles.tabBtnTextActive,
                  ]}
                >
                  🍚 Guarniciones / Acompañamientos
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Lista de Variantes */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {tab === "variants" && (
              <>
                {family.variants.map((variant) => {
                  const isCurrent =
                    variant.food.toLowerCase() === foodName.toLowerCase();
                  return (
                    <View
                      key={variant.food}
                      style={[styles.itemCard, isCurrent && styles.itemCardActive]}
                    >
                      <TouchableOpacity
                        style={styles.cardMainAction}
                        onPress={() => {
                          onSelectVariant(variant);
                          onClose();
                        }}
                      >
                        <View style={styles.itemInfo}>
                          <View style={styles.nameAndMethod}>
                            <Text
                              style={[
                                styles.itemName,
                                isCurrent && styles.itemNameActive,
                              ]}
                            >
                              {variant.food}
                            </Text>
                            {variant.cookingMethod && (
                              <View style={styles.methodBadge}>
                                <Text style={styles.methodBadgeText}>
                                  {variant.cookingMethod}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.itemMacros}>
                            Base 100g/ml: {variant.caloriesPer100g} kcal •{" "}
                            {variant.proteinPer100g}g P • {variant.carbsPer100g}g C •{" "}
                            {variant.fatPer100g}g G
                          </Text>
                        </View>
                        {isCurrent && <Text style={styles.checkIcon}>✓</Text>}
                      </TouchableOpacity>

                      {/* Porciones típicas de un toque */}
                      {variant.portions && variant.portions.length > 0 && (
                        <View style={styles.portionsContainer}>
                          <Text style={styles.portionsLabel}>
                            Porción sugerida:
                          </Text>
                          <View style={styles.portionsRow}>
                            {variant.portions.map((portion: PortionOption, pIdx: number) => {
                              const calcCal = Math.round(
                                (variant.caloriesPer100g * portion.grams) / 100
                              );
                              return (
                                <TouchableOpacity
                                  key={pIdx}
                                  style={styles.portionChip}
                                  onPress={() => {
                                    onSelectVariant({
                                      ...variant,
                                      grams: portion.grams,
                                      unit: portion.unit || "g",
                                    });
                                    onClose();
                                  }}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Elegir ${variant.food} con porción ${portion.label}`}
                                >
                                  <Text style={styles.portionChipText}>
                                    {portion.label}
                                  </Text>
                                  <Text style={styles.portionChipCals}>
                                    {calcCal} kcal
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            {tab === "sides" && (
              <>
                <Text style={styles.sidesHelper}>
                  ¿Deseas reemplazar este alimento por un acompañamiento típico chileno?
                </Text>
                {COMMON_ACCOMPANIMENTS.map((side) => (
                  <View key={side.food} style={styles.itemCard}>
                    <TouchableOpacity
                      style={styles.cardMainAction}
                      onPress={() => {
                        onSelectVariant(side);
                        onClose();
                      }}
                    >
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{side.food}</Text>
                        <Text style={styles.itemMacros}>
                          Base 100g: {side.caloriesPer100g} kcal • {side.proteinPer100g}g P •{" "}
                          {side.carbsPer100g}g C • {side.fatPer100g}g G
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {side.portions && (
                      <View style={styles.portionsContainer}>
                        <View style={styles.portionsRow}>
                          {side.portions.map((portion: PortionOption, pIdx: number) => (
                            <TouchableOpacity
                              key={pIdx}
                              style={styles.portionChip}
                              onPress={() => {
                                onSelectVariant({
                                  ...side,
                                  grams: portion.grams,
                                  unit: portion.unit || "g",
                                });
                                onClose();
                              }}
                            >
                              <Text style={styles.portionChipText}>{portion.label}</Text>
                              <Text style={styles.portionChipCals}>
                                {Math.round((side.caloriesPer100g * portion.grams) / 100)} kcal
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    maxHeight: "85%",
  },
  header: {
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textMuted,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitleBold: {
    fontWeight: "700",
    color: colors.primary,
  },
  tabBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  sidesHelper: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  list: {
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  itemCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardMainAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  nameAndMethod: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  itemNameActive: {
    color: colors.primaryDark,
  },
  methodBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  methodBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  itemMacros: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  checkIcon: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: "800",
    marginLeft: 6,
  },
  portionsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  portionsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  portionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  portionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  portionChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  portionChipCals: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  cancelBtn: {
    backgroundColor: colors.background,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
