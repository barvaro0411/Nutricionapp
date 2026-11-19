import { parseDecimal } from "@/utils/dates";
import { showAlert, showToast } from "@/utils/alerts";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera, Keyboard, Scale, Search, X } from "lucide-react-native";
import {
  lookupBarcode,
  saveCustomBarcodeProduct,
  searchProductsByName,
  BarcodeProduct,
} from "@/services/barcodeService";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { FoodUnit } from "@/types/meal";
import { useMealAnalysis } from "@/hooks/useMealAnalysis";
import { isLiquidFood, parseQuantityInput } from "@/utils/liquidUnits";
import { colors, layout } from "@/constants/colors";
import { nutritionPer100 } from "@/utils/productNutrition";
import { useDietaryPreferences } from "@/hooks/useDietaryPreferences";
import { PageBackHeader } from "@/components/common/AppUI";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BarcodeCameraPanel,
  BarcodeManualSearch,
  ScannedProductSheet,
  BarcodeNotFoundSheet,
  ProductCompareCard,
} from "@/components/meal/barcode";

export default function BarcodeScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { addItem } = useMealReviewStore();
  const { analyzeProductPhoto } = useMealAnalysis();
  const { restrictions, customAllergies } = useDietaryPreferences();

  const [activeTab, setActiveTab] = useState<"camera" | "manual" | "compare">(
    mode === "compare" ? "compare" : "camera"
  );
  const [scanned, setScanned] = useState(false);

  // Estado del comparador de 2 productos
  const [compareA, setCompareA] = useState<BarcodeProduct | null>(null);
  const [compareB, setCompareB] = useState<BarcodeProduct | null>(null);
  const [compareQuery, setCompareQuery] = useState("");
  const [compareResults, setCompareResults] = useState<BarcodeProduct[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [activeSlot, setActiveSlot] = useState<"A" | "B">("A");

  useEffect(() => {
    if (mode === "compare") setActiveTab("compare");
  }, [mode]);

  const [barcodeInput, setBarcodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [portionGrams, setPortionGrams] = useState("100");
  const [portionUnit, setPortionUnit] = useState<FoodUnit>("g");
  const [notFound, setNotFound] = useState(false);

  // Formulario si no se encuentra
  const [customName, setCustomName] = useState("");
  const [customUnit, setCustomUnit] = useState<FoodUnit>("g");
  const [customBrand, setCustomBrand] = useState("");
  const [customCals, setCustomCals] = useState("150");
  const [customProt, setCustomProt] = useState("5");
  const [customCarbs, setCustomCarbs] = useState("20");
  const [customFat, setCustomFat] = useState("3");
  const [scanningLabel, setScanningLabel] = useState(false);

  const handleSearch = async (codeToSearch?: string) => {
    const code = (codeToSearch || barcodeInput).trim();
    if (!code) return;

    setLoading(true);
    setNotFound(false);
    setProduct(null);

    try {
      const result = await lookupBarcode(code);
      if (result) {
        setProduct(result);
        const isLiquid = result.unit === "ml" || isLiquidFood(result.productName);
        const unit: FoodUnit = isLiquid ? "ml" : "g";
        setPortionUnit(unit);
        setPortionGrams(String(result.servingSizeG || (isLiquid ? 250 : 100)));
      } else {
        setNotFound(true);
      }
    } catch (e) {
      showAlert("Código de barras", e instanceof Error ? e.message : "No se pudo buscar.");
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeDetected = (code: string) => {
    if (scanned || loading || !code) return;
    setScanned(true);
    setBarcodeInput(code);
    void handleSearch(code);
  };

  const handleResetScanner = () => {
    setScanned(false);
    setProduct(null);
    setNotFound(false);
    setBarcodeInput("");
  };

  const handleTakePhotoOfBarcode = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setLoading(true);
        let codeFound: string | null = null;

        try {
          const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } =
            await import("@zxing/library");
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.CODE_128,
          ]);
          const reader = new BrowserMultiFormatReader(hints);
          const decoded = await reader.decodeFromImageUrl(result.assets[0].uri);
          if (decoded) {
            codeFound = decoded.getText();
          }
        } catch {}

        if (codeFound) {
          setBarcodeInput(codeFound);
          await handleSearch(codeFound);
        } else {
          // Si no se decodificó ópticamente, usar IA para reconocer el alimento directamente
          const analysis = await analyzeProductPhoto(result.assets[0].uri);

          if (analysis.success && analysis.data?.items?.[0]) {
            const item = analysis.data.items[0];
            const isLiquid = item.unit === "ml" || isLiquidFood(item.food);
            const unit: FoodUnit = (item.unit as FoodUnit) || (isLiquid ? "ml" : "g");
            const initialPortion = item.grams || (isLiquid ? 250 : 100);
            setProduct({
              barcode: "FOTO-IA",
              productName: item.food,
              servingSizeG: initialPortion,
              ...nutritionPer100(item),
              source: "local",
              unit,
              containerSize: isLiquid ? initialPortion : undefined,
            });
            setPortionUnit(unit);
            setPortionGrams(String(Math.round(initialPortion)));
          } else {
            showAlert("No se reconoció el código", "Intenta escribir los números del código manualmente abajo.");
            setActiveTab("manual");
          }
        }
      }
    } catch (e: any) {
      showAlert("Cámara", e?.message || "No se pudo tomar la foto");
    } finally {
      setLoading(false);
    }
  };

  const handleScanNutritionLabel = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]) {
        setScanningLabel(true);
        const analysis = await analyzeProductPhoto(result.assets[0].uri, true);

        if (analysis.success && analysis.data?.items?.[0]) {
          const item = analysis.data.items[0];
          const nutrition = nutritionPer100(item);

          if (product && user) {
            const updatedProduct: BarcodeProduct = {
              ...product,
              ...nutrition,
              source: "custom",
            };
            setProduct(updatedProduct);
            try {
              await saveCustomBarcodeProduct(user.id, {
                barcode: product.barcode,
                productName: product.productName,
                brand: product.brand,
                servingSizeG: product.servingSizeG,
                unit: product.unit,
                containerSize: product.containerSize,
                quantityText: product.quantityText,
                caloriesPer100g: updatedProduct.caloriesPer100g,
                proteinPer100g: updatedProduct.proteinPer100g,
                carbsPer100g: updatedProduct.carbsPer100g,
                fatPer100g: updatedProduct.fatPer100g,
              });
              showAlert(
                "¡Tabla Nutricional Actualizada!",
                "Guardamos los valores de la etiqueta. Revísalos antes de confirmar la porción."
              );
            } catch {
              showAlert(
                "¡Tabla Nutricional Leída!",
                "Valores actualizados según la foto de tu envase."
              );
            }
          } else {
            setCustomName(item.food);
            setCustomUnit(item.unit === "ml" || isLiquidFood(item.food) ? "ml" : "g");
            setCustomCals(String(nutrition.caloriesPer100g));
            setCustomProt(String(nutrition.proteinPer100g));
            setCustomCarbs(String(nutrition.carbsPer100g));
            setCustomFat(String(nutrition.fatPer100g));
            showAlert(
              "¡Etiqueta Leída con IA!",
              "Completamos los datos nutricionales según la foto. Confirma los valores."
            );
          }
        } else {
          showAlert("Etiqueta", analysis.error || "No se pudo leer la etiqueta. Ingresa los valores manualmente.");
        }
      }
    } catch (err: any) {
      showAlert("Cámara", err?.message || "No se pudo fotografiar la etiqueta.");
    } finally {
      setScanningLabel(false);
    }
  };

  const handleAddProductToMeal = () => {
    if (!product) return;
    const parsed = parseQuantityInput(portionGrams, portionUnit);
    if (!parsed.ok) {
      showAlert("Porción inválida", parsed.error);
      return;
    }
    const finalAmount = parsed.value;
    const finalUnit = parsed.unit;
    const factor = finalAmount / 100;

    addItem({
      food: `${product.productName}${product.brand ? ` (${product.brand})` : ""}`,
      grams: finalAmount,
      unit: finalUnit,
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
      const unit = customUnit;

      await saveCustomBarcodeProduct(user.id, {
        barcode: barcodeInput.trim() || "000000000000",
        productName: customName.trim(),
        brand: customBrand.trim() || undefined,
        servingSizeG: 100,
        unit,
        caloriesPer100g: parseDecimal(customCals),
        proteinPer100g: parseDecimal(customProt),
        carbsPer100g: parseDecimal(customCarbs),
        fatPer100g: parseDecimal(customFat),
      });

      addItem({
        food: `${customName.trim()}${customBrand ? ` (${customBrand.trim()})` : ""}`,
        grams: 100,
        unit,
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

  const handleCompareWithOther = () => {
    if (!product) return;
    setCompareA(product);
    setActiveSlot(compareB ? "B" : "B");
    setActiveTab("compare");
    showToast({
      type: "info",
      title: "Producto A guardado",
      message: "Ahora busca o escanea el segundo producto para compararlos.",
    });
  };

  const handleCompareSearch = async () => {
    const q = compareQuery.trim();
    if (!q) return;
    setCompareLoading(true);
    try {
      if (/^[0-9]{8,14}$/.test(q)) {
        const found = await lookupBarcode(q);
        setCompareResults(found ? [found] : []);
        if (!found) {
          showAlert("Sin resultados", "No encontramos ese código de barras.");
        }
      } else {
        const list = await searchProductsByName(q, 10);
        setCompareResults(list);
      }
    } catch (err: any) {
      showAlert("Comparador", err?.message || "No se pudo buscar el producto.");
    } finally {
      setCompareLoading(false);
    }
  };

  const assignCompareProduct = (item: BarcodeProduct) => {
    if (activeSlot === "A") {
      setCompareA(item);
      if (!compareB) setActiveSlot("B");
    } else {
      setCompareB(item);
      if (!compareA) setActiveSlot("A");
    }
    setCompareQuery("");
    setCompareResults([]);
  };

  const handleChooseComparedForMeal = (chosen: BarcodeProduct) => {
    const isLiquid = chosen.unit === "ml" || isLiquidFood(chosen.productName);
    const unit: FoodUnit = isLiquid ? "ml" : "g";
    setProduct(chosen);
    setPortionUnit(unit);
    setPortionGrams(String(chosen.servingSizeG || (isLiquid ? 250 : 100)));
    setActiveTab("manual");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20) + 20,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top Navigation */}
      <PageBackHeader
        title="Escanear Código de Barras"
        backLabel="Volver a añadir alimentos"
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/record"))}
      />

      {/* Selector de Modo: Cámara vs Manual */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "camera" && styles.tabBtnActive]}
          onPress={() => setActiveTab("camera")}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Modo escáner en vivo"
          accessibilityState={{ selected: activeTab === "camera" }}
        >
          <Camera
            size={16}
            color={activeTab === "camera" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "camera" && styles.tabBtnTextActive,
            ]}
          >
            Escáner en Vivo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "manual" && styles.tabBtnActive]}
          onPress={() => setActiveTab("manual")}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Modo ingreso manual"
          accessibilityState={{ selected: activeTab === "manual" }}
        >
          <Keyboard
            size={16}
            color={activeTab === "manual" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "manual" && styles.tabBtnTextActive,
            ]}
          >
            Código
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "compare" && styles.tabBtnActive]}
          onPress={() => setActiveTab("compare")}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Comparar dos productos"
          accessibilityState={{ selected: activeTab === "compare" }}
        >
          <Scale
            size={16}
            color={activeTab === "compare" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "compare" && styles.tabBtnTextActive,
            ]}
          >
            Comparar 2
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: ESCÁNER EN VIVO CON CÁMARA */}
      {activeTab === "camera" && (
        <BarcodeCameraPanel
          onBarcodeScanned={handleBarcodeDetected}
          isPaused={scanned || loading}
          scanned={scanned}
          onResetScanner={handleResetScanner}
          onTakePhoto={handleTakePhotoOfBarcode}
        />
      )}

      {/* TAB 2: INGRESO MANUAL */}
      {activeTab === "manual" && (
        <BarcodeManualSearch
          barcodeInput={barcodeInput}
          onChangeBarcodeInput={setBarcodeInput}
          onSearch={handleSearch}
          loading={loading}
        />
      )}

      {/* TAB 3: COMPARADOR DE 2 PRODUCTOS */}
      {activeTab === "compare" && (
        <View style={styles.comparePanel}>
          <Text style={styles.compareTitle}>Comparador de supermercado</Text>
          <Text style={styles.compareSubtitle}>
            Elige dos productos por nombre o código de barras para ver sellos Ley 20.606 y cuál conviene más.
          </Text>

          {/* Ranuras A y B */}
          <View style={styles.slotsRow}>
            {(["A", "B"] as const).map((slot) => {
              const item = slot === "A" ? compareA : compareB;
              const isSelected = activeSlot === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.slotCard, isSelected && styles.slotCardActive]}
                  onPress={() => setActiveSlot(slot)}
                  activeOpacity={0.85}
                >
                  <View style={styles.slotTop}>
                    <Text style={styles.slotLabel}>PRODUCTO {slot}</Text>
                    {item && (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar producto ${slot}`}
                        onPress={() => (slot === "A" ? setCompareA(null) : setCompareB(null))}
                      >
                        <X size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.slotName} numberOfLines={2}>
                    {item ? item.productName : "Toca para buscar"}
                  </Text>
                  {item && (
                    <Text style={styles.slotMeta}>
                      {Math.round(item.caloriesPer100g)} kcal · {item.proteinPer100g}g P
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Buscador para el slot activo */}
          <View style={styles.compareSearchRow}>
            <TextInput
              style={styles.compareInput}
              value={compareQuery}
              onChangeText={setCompareQuery}
              placeholder={`Buscar para Opción ${activeSlot} (ej. yogur, pan, o código EAN)`}
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              onSubmitEditing={() => void handleCompareSearch()}
            />
            <TouchableOpacity
              style={styles.compareSearchBtn}
              onPress={() => void handleCompareSearch()}
              disabled={compareLoading}
            >
              {compareLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Search size={17} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Sugerencias rápidas para probar al tiro */}
          {!compareResults.length && (
            <View style={styles.quickTermsRow}>
              {["Yogurt", "Pan", "Leche", "Queso", "Avena"].map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.quickTermChip}
                  onPress={() => {
                    setCompareQuery(term);
                    setCompareLoading(true);
                    void searchProductsByName(term, 8)
                      .then(setCompareResults)
                      .finally(() => setCompareLoading(false));
                  }}
                >
                  <Text style={styles.quickTermText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Lista de resultados */}
          {compareResults.length > 0 && (
            <View style={styles.compareResultsList}>
              {compareResults.map((item) => (
                <TouchableOpacity
                  key={`${item.barcode}-${item.productName}`}
                  style={styles.compareResultItem}
                  onPress={() => assignCompareProduct(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.compareResultName}>{item.productName}</Text>
                    <Text style={styles.compareResultMeta}>
                      {item.brand ? `${item.brand} · ` : ""}
                      {Math.round(item.caloriesPer100g)} kcal · {item.proteinPer100g}g P / 100{item.unit || "g"}
                    </Text>
                  </View>
                  <Text style={styles.assignPill}>Usar en {activeSlot}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {compareA && compareB && (
            <ProductCompareCard
              productA={compareA}
              productB={compareB}
              restrictions={restrictions}
              customAllergies={customAllergies}
              onSelectForMeal={handleChooseComparedForMeal}
            />
          )}
        </View>
      )}

      {/* ESTADO DE CARGA */}
      {loading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>
            Consultando catálogo chileno e internacional...
          </Text>
        </View>
      )}

      {/* PRODUCTO ENCONTRADO */}
      {activeTab !== "compare" && product && (
        <ScannedProductSheet
          product={product}
          restrictions={restrictions}
          customAllergies={customAllergies}
          portionGrams={portionGrams}
          portionUnit={portionUnit}
          onChangePortionGrams={setPortionGrams}
          onChangePortionUnit={setPortionUnit}
          onScanNutritionLabel={handleScanNutritionLabel}
          scanningLabel={scanningLabel}
          onAddToMeal={handleAddProductToMeal}
          onCompareWithOther={handleCompareWithOther}
        />
      )}

      {/* PRODUCTO NO ENCONTRADO EN LA BASE DE DATOS */}
      {activeTab !== "compare" && notFound && (
        <BarcodeNotFoundSheet
          barcode={barcodeInput}
          customName={customName}
          customBrand={customBrand}
          customUnit={customUnit}
          customCals={customCals}
          customProt={customProt}
          customCarbs={customCarbs}
          customFat={customFat}
          scanningLabel={scanningLabel}
          loading={loading}
          onChangeCustomName={setCustomName}
          onChangeCustomBrand={setCustomBrand}
          onChangeCustomUnit={setCustomUnit}
          onChangeCustomCals={setCustomCals}
          onChangeCustomProt={setCustomProt}
          onChangeCustomCarbs={setCustomCarbs}
          onChangeCustomFat={setCustomFat}
          onScanNutritionLabel={handleScanNutritionLabel}
          onSaveCustomProduct={handleSaveCustomProduct}
        />
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
    ...layout.narrowPage,
    paddingBottom: 40,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: colors.primaryLight,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  loadingCard: {
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  comparePanel: {
    gap: 10,
  },
  compareTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  compareSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  slotsRow: {
    flexDirection: "row",
    gap: 10,
  },
  slotCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  slotCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  slotTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  slotLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.7,
  },
  slotName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    minHeight: 34,
  },
  slotMeta: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 4,
  },
  compareSearchRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  compareInput: {
    flex: 1,
    minHeight: 46,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    fontSize: 13,
    color: colors.text,
  },
  compareSearchBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTermsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  quickTermChip: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  quickTermText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  compareResultsList: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },
  compareResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  compareResultName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  compareResultMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  assignPill: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
});
