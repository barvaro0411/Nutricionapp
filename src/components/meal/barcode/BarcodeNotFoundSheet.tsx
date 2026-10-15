import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { AlertCircle, Sparkles } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { FoodUnit } from "@/types/meal";
import { isLiquidFood } from "@/utils/liquidUnits";

export interface BarcodeNotFoundSheetProps {
  barcode: string;
  customName: string;
  customBrand: string;
  customUnit: FoodUnit;
  customCals: string;
  customProt: string;
  customCarbs: string;
  customFat: string;
  scanningLabel: boolean;
  loading: boolean;
  onChangeCustomName: (name: string) => void;
  onChangeCustomBrand: (brand: string) => void;
  onChangeCustomUnit: (unit: FoodUnit) => void;
  onChangeCustomCals: (val: string) => void;
  onChangeCustomProt: (val: string) => void;
  onChangeCustomCarbs: (val: string) => void;
  onChangeCustomFat: (val: string) => void;
  onScanNutritionLabel: () => void;
  onSaveCustomProduct: () => void;
}

export function BarcodeNotFoundSheet({
  barcode,
  customName,
  customBrand,
  customUnit,
  customCals,
  customProt,
  customCarbs,
  customFat,
  scanningLabel,
  loading,
  onChangeCustomName,
  onChangeCustomBrand,
  onChangeCustomUnit,
  onChangeCustomCals,
  onChangeCustomProt,
  onChangeCustomCarbs,
  onChangeCustomFat,
  onScanNutritionLabel,
  onSaveCustomProduct,
}: BarcodeNotFoundSheetProps) {
  return (
    <View style={styles.notFoundCard}>
      <View style={styles.titleRow}>
        <AlertCircle size={18} color="#D97706" />
        <Text style={styles.notFoundTitle}>Producto no registrado en catálogo</Text>
      </View>
      <Text style={styles.notFoundDesc}>
        No encontramos el código {barcode}. Puedes fotografiar la tabla nutricional con IA o ingresar los datos:
      </Text>

      {/* Botón de Escanear Tabla con Foto IA */}
      <TouchableOpacity
        style={styles.labelScanBtn}
        onPress={onScanNutritionLabel}
        disabled={scanningLabel}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Fotografiar tabla nutricional con IA"
      >
        {scanningLabel ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Sparkles size={16} color="#FFFFFF" />
            <Text style={styles.labelScanBtnText}>
              Fotografiar Tabla Nutricional con IA
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.customInput}
        placeholder="Nombre del alimento (ej: Galletas de avena)"
        placeholderTextColor={colors.textMuted}
        value={customName}
        onChangeText={(name) => {
          onChangeCustomName(name);
          if (isLiquidFood(name)) onChangeCustomUnit("ml");
        }}
        accessibilityLabel="Nombre del alimento no registrado"
      />
      <TextInput
        style={styles.customInput}
        placeholder="Marca (ej: Great Value, Carozzi, Costa)"
        placeholderTextColor={colors.textMuted}
        value={customBrand}
        onChangeText={onChangeCustomBrand}
        accessibilityLabel="Marca del producto"
      />

      <View style={styles.unitToggle}>
        {(["g", "ml"] as FoodUnit[]).map((unit) => (
          <TouchableOpacity
            key={unit}
            style={[styles.unitToggleBtn, customUnit === unit && styles.unitToggleBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={`Etiqueta por 100 ${unit}`}
            accessibilityState={{ selected: customUnit === unit }}
            onPress={() => onChangeCustomUnit(unit)}
          >
            <Text
              style={[
                styles.unitToggleText,
                customUnit === unit && styles.unitToggleTextActive,
              ]}
            >
              {unit}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.customMacroHeader}>
        Información por cada 100 {customUnit} (etiqueta):
      </Text>
      <View style={styles.macroInputsRow}>
        <View style={styles.macroInputCol}>
          <Text style={styles.macroInputLbl}>Calorías</Text>
          <TextInput
            style={styles.customInput}
            keyboardType="numeric"
            value={customCals}
            onChangeText={onChangeCustomCals}
            accessibilityLabel="Calorías por 100g o 100ml"
          />
        </View>
        <View style={styles.macroInputCol}>
          <Text style={styles.macroInputLbl}>Prot (g)</Text>
          <TextInput
            style={styles.customInput}
            keyboardType="numeric"
            value={customProt}
            onChangeText={onChangeCustomProt}
            accessibilityLabel="Proteínas por 100g o 100ml"
          />
        </View>
        <View style={styles.macroInputCol}>
          <Text style={styles.macroInputLbl}>Carbs (g)</Text>
          <TextInput
            style={styles.customInput}
            keyboardType="numeric"
            value={customCarbs}
            onChangeText={onChangeCustomCarbs}
            accessibilityLabel="Carbohidratos por 100g o 100ml"
          />
        </View>
        <View style={styles.macroInputCol}>
          <Text style={styles.macroInputLbl}>Grasas (g)</Text>
          <TextInput
            style={styles.customInput}
            keyboardType="numeric"
            value={customFat}
            onChangeText={onChangeCustomFat}
            accessibilityLabel="Grasas por 100g o 100ml"
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.saveCustomBtn}
        onPress={onSaveCustomProduct}
        disabled={loading}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Guardar y añadir a comida"
      >
        <Text style={styles.saveCustomBtnText}>Guardar y Añadir a Comida</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  notFoundCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  notFoundTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400E",
  },
  notFoundDesc: {
    fontSize: 13,
    color: "#B45309",
    marginBottom: 12,
    lineHeight: 18,
  },
  labelScanBtn: {
    backgroundColor: "#4F46E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  labelScanBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  customInput: {
    width: "100%",
    minWidth: 0,
    backgroundColor: colors.card,
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  unitToggle: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  unitToggleBtn: {
    paddingHorizontal: 11,
    paddingVertical: 4,
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
  customMacroHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
    marginVertical: 6,
  },
  macroInputsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  macroInputCol: {
    flex: 1,
    minWidth: 0,
  },
  macroInputLbl: {
    fontSize: 11,
    color: "#92400E",
    marginBottom: 4,
    fontWeight: "600",
  },
  saveCustomBtn: {
    backgroundColor: "#D97706",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveCustomBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
