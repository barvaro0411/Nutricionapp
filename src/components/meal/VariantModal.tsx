import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { colors } from "@/constants/colors";
import { findFamilyForFood, FoodVariant } from "@/constants/chileanPresets";

interface VariantModalProps {
  visible: boolean;
  foodName: string;
  onClose: () => void;
  onSelectVariant: (variant: FoodVariant) => void;
}

export function VariantModal({
  visible,
  foodName,
  onClose,
  onSelectVariant,
}: VariantModalProps) {
  const family = findFamilyForFood(foodName);

  if (!family) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Cambiar Variante</Text>
            <Text style={styles.subtitle}>
              Categoría: {family.category}
            </Text>
          </View>

          <ScrollView style={styles.list}>
            {family.variants.map((variant) => {
              const isCurrent =
                variant.food.toLowerCase() === foodName.toLowerCase();
              return (
                <TouchableOpacity
                  key={variant.food}
                  style={[styles.itemCard, isCurrent && styles.itemCardActive]}
                  onPress={() => {
                    onSelectVariant(variant);
                    onClose();
                  }}
                >
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, isCurrent && styles.itemNameActive]}>
                      {variant.food}
                    </Text>
                    <Text style={styles.itemMacros}>
                      100g: {variant.caloriesPer100g} kcal • {variant.proteinPer100g}g P •{" "}
                      {variant.carbsPer100g}g C • {variant.fatPer100g}g G
                    </Text>
                  </View>
                  {isCurrent && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              );
            })}
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  list: {
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  itemCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  itemNameActive: {
    color: colors.primaryDark,
  },
  itemMacros: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  checkIcon: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: "800",
  },
  cancelBtn: {
    backgroundColor: colors.background,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
