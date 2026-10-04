import { parseDecimal } from "@/utils/dates";
import { showAlert } from "@/utils/alerts";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { lookupBarcode, saveCustomBarcodeProduct, BarcodeProduct } from "@/services/barcodeService";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { colors } from "@/constants/colors";

export default function BarcodeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addItem } = useMealReviewStore();

  const [barcodeInput, setBarcodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [portionGrams, setPortionGrams] = useState("100");
  const [notFound, setNotFound] = useState(false);

  // Formulario si no se encuentra
  const [customName, setCustomName] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [customCals, setCustomCals] = useState("150");
  const [customProt, setCustomProt] = useState("5");
  const [customCarbs, setCustomCarbs] = useState("20");
  const [customFat, setCustomFat] = useState("3");

  const handleSearch = async (codeToSearch?: string) => {
    const code = (codeToSearch || barcodeInput).trim();
    if (!code) return;

    setLoading(true);
    setNotFound(false);
    setProduct(null);

    try {
      const result = await lookupBarcode(code);
      if (result) { setProduct(result); setPortionGrams(String(result.servingSizeG || 100)); }
      else { setNotFound(true); }
    } catch (e) { showAlert("Código de barras", e instanceof Error ? e.message : "No se pudo buscar."); }
    finally { setLoading(false); }
  };

  const handleAddProductToMeal = () => {
    if (!product) return;
    const grams = parseDecimal(portionGrams);
    if (!Number.isFinite(grams) || grams <= 0 || grams > 20000) { showAlert("Porción inválida", "Ingresa los gramos consumidos."); return; }
    const factor = grams / 100;

    addItem({
      food: `${product.productName}${product.brand ? ` (${product.brand})` : ""}`,
      grams,
      calories: Math.round(product.caloriesPer100g * factor * 10) / 10,
      protein: Math.round(product.proteinPer100g * factor * 10) / 10,
      carbs: Math.round(product.carbsPer100g * factor * 10) / 10,
      fat: Math.round(product.fatPer100g * factor * 10) / 10,
      confidence: 1.0,
    });

    router.push("/meal/review");
  };

  const handleSaveCustomProduct = async () => {
    if (!customName.trim()) {
      showAlert("Error", "Ingresa el nombre del producto.");
      return;
    }
    if (!user) return;

    try {
      setLoading(true);
      await saveCustomBarcodeProduct(user.id, {
        barcode: barcodeInput.trim(),
        productName: customName.trim(),
        brand: customBrand.trim() || undefined,
        servingSizeG: 100,
        caloriesPer100g: parseDecimal(customCals),
        proteinPer100g: parseDecimal(customProt),
        carbsPer100g: parseDecimal(customCarbs),
        fatPer100g: parseDecimal(customFat),
      });

      // Añadir directamente a la comida
      addItem({
        food: `${customName.trim()}${customBrand ? ` (${customBrand.trim()})` : ""}`,
        grams: 100,
        calories: parseDecimal(customCals),
        protein: parseDecimal(customProt),
        carbs: parseDecimal(customCarbs),
        fat: parseDecimal(customFat),
        confidence: 1.0,
      });

      router.push("/meal/review");
    } catch (err: any) {
      showAlert("Error al guardar", err?.message);
    } finally {
      setLoading(false);
    }
  };

  const grams = parseFloat(portionGrams) || 100;
  const factor = grams / 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Buscar Código de Barras</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Input de código de barras */}
      <View style={styles.searchCard}>
        <Text style={styles.searchTitle}>Ingresa el código de barras del producto</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.barcodeTextInput}
            placeholder="Ej: 7802900000001"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={barcodeInput}
            onChangeText={setBarcodeInput}
          />
          <TouchableOpacity
            style={[styles.searchBtn, (!barcodeInput.trim() || loading) && styles.btnDisabled]}
            onPress={() => handleSearch()}
            disabled={!barcodeInput.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.searchBtnText}>Buscar</Text>
            )}
          </TouchableOpacity>
        </View>

      </View>

      {/* Resultado Encontrado */}
      {product && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>
                {product.source === "local" ? "🇨🇱 Catálogo Chileno" : "🌐 Open Food Facts"}
              </Text>
            </View>
            <Text style={styles.productName}>{product.productName}</Text>
            {product.brand && <Text style={styles.productBrand}>{product.brand}</Text>}
          </View>

          {/* Selector de porción consumida */}
          <View style={styles.portionSection}>
            <Text style={styles.portionLabel}>¿Cuántos gramos consumiste?</Text>
            <View style={styles.portionInputRow}>
              <TextInput
                style={styles.portionInput}
                keyboardType="numeric"
                value={portionGrams}
                onChangeText={setPortionGrams}
              />
              <Text style={styles.portionUnit}>gramos</Text>
            </View>
          </View>

          {/* Información nutricional calculada */}
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

          <TouchableOpacity style={styles.addToMealBtn} onPress={handleAddProductToMeal}>
            <Text style={styles.addToMealBtnText}>Añadir a mi Comida ✓</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Si no se encontró el producto: Formulario Comunitario */}
      {notFound && (
        <View style={styles.notFoundCard}>
          <Text style={styles.notFoundTitle}>Producto chileno no registrado</Text>
          <Text style={styles.notFoundDesc}>
            No encontramos el código {barcodeInput}. Ingresa sus datos para guardarlo y agregarlo a tu comida:
          </Text>

          <TextInput
            style={styles.customInput}
            placeholder="Nombre del alimento (ej: Galletas de avena)"
            placeholderTextColor={colors.textMuted}
            value={customName}
            onChangeText={setCustomName}
          />
          <TextInput
            style={styles.customInput}
            placeholder="Marca (ej: Great Value, Carozzi, Costa)"
            placeholderTextColor={colors.textMuted}
            value={customBrand}
            onChangeText={setCustomBrand}
          />

          <Text style={styles.customMacroHeader}>Información por cada 100g (según etiqueta):</Text>
          <View style={styles.macroInputsRow}>
            <View style={styles.macroInputCol}>
              <Text style={styles.macroInputLbl}>Calorías</Text>
              <TextInput
                style={styles.customInput}
                keyboardType="numeric"
                value={customCals}
                onChangeText={setCustomCals}
              />
            </View>
            <View style={styles.macroInputCol}>
              <Text style={styles.macroInputLbl}>Prot (g)</Text>
              <TextInput
                style={styles.customInput}
                keyboardType="numeric"
                value={customProt}
                onChangeText={setCustomProt}
              />
            </View>
            <View style={styles.macroInputCol}>
              <Text style={styles.macroInputLbl}>Carbs (g)</Text>
              <TextInput
                style={styles.customInput}
                keyboardType="numeric"
                value={customCarbs}
                onChangeText={setCustomCarbs}
              />
            </View>
            <View style={styles.macroInputCol}>
              <Text style={styles.macroInputLbl}>Grasas (g)</Text>
              <TextInput
                style={styles.customInput}
                keyboardType="numeric"
                value={customFat}
                onChangeText={setCustomFat}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveCustomBtn}
            onPress={handleSaveCustomProduct}
            disabled={loading}
          >
            <Text style={styles.saveCustomBtnText}>Guardar y Añadir a la Comida</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 40,
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeBtn: {
    paddingVertical: 6,
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  searchCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  searchTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  barcodeTextInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  searchBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  quickChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  quickChipText: {
    fontSize: 12,
    color: colors.text,
  },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: 16,
  },
  resultHeader: {
    marginBottom: 16,
  },
  sourceBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  productName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  productBrand: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  portionSection: {
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  portionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  portionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  portionInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    width: 90,
    textAlign: "center",
  },
  portionUnit: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
  },
  nutritionPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  nutriCol: {
    alignItems: "center",
  },
  nutriVal: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  nutriLbl: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addToMealBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  addToMealBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  notFoundCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  notFoundTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  notFoundDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  customInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    marginBottom: 10,
  },
  customMacroHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginVertical: 6,
  },
  macroInputsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  macroInputCol: {
    flex: 1,
  },
  macroInputLbl: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  saveCustomBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  saveCustomBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
