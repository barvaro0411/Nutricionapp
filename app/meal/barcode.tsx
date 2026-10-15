import { parseDecimal } from "@/utils/dates";
import { showAlert } from "@/utils/alerts";
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera, Keyboard } from "lucide-react-native";
import {
  lookupBarcode,
  saveCustomBarcodeProduct,
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
} from "@/components/meal/barcode";

export default function BarcodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { addItem } = useMealReviewStore();
  const { analyzeProductPhoto } = useMealAnalysis();
  const { restrictions } = useDietaryPreferences();

  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [scanned, setScanned] = useState(false);

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
            Ingreso Manual
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
      {product && (
        <ScannedProductSheet
          product={product}
          restrictions={restrictions}
          portionGrams={portionGrams}
          portionUnit={portionUnit}
          onChangePortionGrams={setPortionGrams}
          onChangePortionUnit={setPortionUnit}
          onScanNutritionLabel={handleScanNutritionLabel}
          scanningLabel={scanningLabel}
          onAddToMeal={handleAddProductToMeal}
        />
      )}

      {/* PRODUCTO NO ENCONTRADO EN LA BASE DE DATOS */}
      {notFound && (
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
});
