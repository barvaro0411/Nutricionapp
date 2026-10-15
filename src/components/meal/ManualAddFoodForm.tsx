import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { colors } from "@/constants/colors";
import { FoodUnit } from "@/types/meal";
import { isLiquidFood } from "@/utils/liquidUnits";

/** Borrador del formulario de ingreso manual (valores tal como se escriben). */
export interface ManualFoodDraft {
  name: string;
  unit: FoodUnit;
  grams: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export const EMPTY_MANUAL_FOOD_DRAFT: ManualFoodDraft = {
  name: "",
  unit: "g",
  grams: "100",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
};

interface ManualAddFoodFormProps {
  draft: ManualFoodDraft;
  onChangeDraft: (patch: Partial<ManualFoodDraft>) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

/** Formulario para añadir alimentos manuales al plato (datos de la etiqueta). */
export function ManualAddFoodForm({ draft, onChangeDraft, onCancel, onSubmit }: ManualAddFoodFormProps) {
  return (
    <View style={styles.manualAddCard}>
      <Text style={styles.manualAddTitle}>Datos de tu etiqueta</Text>
      <Text style={styles.manualHelp}>Ingresa los nutrientes de la porción indicada abajo, no los del envase completo. Si la etiqueta indica valores por 100 g o ml, añade esa cantidad y luego ajusta la porción.</Text>
      <TextInput
        accessibilityLabel="Nombre del alimento manual"
        style={styles.manualInput}
        placeholder="Nombre (ej: Palta Hass o Gatorade)"
        placeholderTextColor={colors.textMuted}
        value={draft.name}
        onChangeText={(val) => {
          if (isLiquidFood(val) && draft.unit !== "ml") {
            onChangeDraft({ name: val, unit: "ml", grams: "250" });
          } else {
            onChangeDraft({ name: val });
          }
        }}
      />
      {/* Selector de unidad [ g | ml ] */}
      <View style={styles.manualUnitRow}>
        <Text style={styles.manualColLabel}>Tipo de alimento:</Text>
        <View style={styles.unitToggleGroup}>
          <TouchableOpacity
            style={[styles.unitToggleBtn, draft.unit === "g" && styles.unitToggleBtnActive]}
            onPress={() => {
              onChangeDraft({ unit: "g", grams: "100" });
            }}
            accessibilityLabel="Unidad gramos"
            accessibilityState={{ selected: draft.unit === "g" }}
          >
            <Text style={[styles.unitToggleText, draft.unit === "g" && styles.unitToggleTextActive]}>
              g (Sólido)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitToggleBtn, draft.unit === "ml" && styles.unitToggleBtnActive]}
            onPress={() => {
              onChangeDraft({ unit: "ml", grams: "250" });
            }}
            accessibilityLabel="Unidad mililitros"
            accessibilityState={{ selected: draft.unit === "ml" }}
          >
            <Text style={[styles.unitToggleText, draft.unit === "ml" && styles.unitToggleTextActive]}>
              ml (Bebida)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.manualRow}>
        <View style={styles.manualCol}>
          <Text style={styles.manualColLabel}>
            {draft.unit === "ml" ? "Volumen (ml / L)" : "Gramos (g)"}
          </Text>
          <TextInput
            accessibilityLabel="Cantidad del alimento manual"
            style={styles.manualInput}
            value={draft.grams}
            onChangeText={(grams) => onChangeDraft({ grams })}
            placeholder={draft.unit === "ml" ? "ej: 250 o 1L" : "ej: 100"}
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.manualCol}>
          <Text style={styles.manualColLabel}>Calorías</Text>
          <TextInput
            accessibilityLabel="Calorías de la porción manual"
            style={styles.manualInput}
            keyboardType="numeric"
            value={draft.calories}
            onChangeText={(calories) => onChangeDraft({ calories })}
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
            value={draft.protein}
            onChangeText={(protein) => onChangeDraft({ protein })}
          />
        </View>
        <View style={styles.manualCol}>
          <Text style={styles.manualColLabel}>Carbs (g)</Text>
          <TextInput
            accessibilityLabel="Carbohidratos de la porción manual"
            style={styles.manualInput}
            keyboardType="numeric"
            value={draft.carbs}
            onChangeText={(carbs) => onChangeDraft({ carbs })}
          />
        </View>
        <View style={styles.manualCol}>
          <Text style={styles.manualColLabel}>Grasas (g)</Text>
          <TextInput
            accessibilityLabel="Grasas de la porción manual"
            style={styles.manualInput}
            keyboardType="numeric"
            value={draft.fat}
            onChangeText={(fat) => onChangeDraft({ fat })}
          />
        </View>
      </View>
      <View style={styles.manualActions}>
        <TouchableOpacity
          style={styles.cancelManualBtn}
          onPress={onCancel}
        >
          <Text style={styles.cancelManualText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Añadir alimento manual" style={styles.saveManualBtn} onPress={onSubmit}>
          <Text style={styles.saveManualText}>Añadir alimento</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  manualHelp: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 14 },
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
  manualUnitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 4,
  },
});
