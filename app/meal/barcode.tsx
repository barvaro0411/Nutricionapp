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
import * as ImagePicker from "expo-image-picker";
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";
import {
  Camera,
  Keyboard,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Camera as CameraIcon,
} from "lucide-react-native";
import {
  lookupBarcode,
  saveCustomBarcodeProduct,
  BarcodeProduct,
} from "@/services/barcodeService";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { FoodUnit } from "@/types/meal";
import { useMealAnalysis } from "@/hooks/useMealAnalysis";
import { BarcodeScannerView } from "@/components/meal/BarcodeScannerView";
import {
  isLiquidFood,
  parseQuantityInput,
  getStandardPortions,
  formatQuantityDisplay,
} from "@/utils/liquidUnits";
import { colors, shadows, layout } from "@/constants/colors";
import { nutritionPer100 } from "@/utils/productNutrition";
import { PageBackHeader } from "@/components/common/AppUI";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BarcodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { addItem } = useMealReviewStore();
  const { analyzeProductPhoto } = useMealAnalysis();

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

  const parsedPortion = parseQuantityInput(portionGrams, portionUnit);
  const factor = parsedPortion.ok ? parsedPortion.value / 100 : 1;

  // Productos chilenos frecuentes para probar en 1 toque
  const demoProducts = [
    { label: "Leche Colun Entera", code: "7802900001001" },
    { label: "Galletas Salvado Costa", code: "7802800000123" },
    { label: "Atún Lomitos San José", code: "7801810000456" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) + 20 }]} keyboardShouldPersistTaps="handled">
      {/* Top Navigation */}
      <PageBackHeader title="Escanear Código de Barras" backLabel="Volver a añadir alimentos" onBack={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/record")} />

      {/* Selector de Modo: Cámara vs Manual */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "camera" && styles.tabBtnActive]}
          onPress={() => setActiveTab("camera")}
          activeOpacity={0.8}
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
        <View style={styles.cameraSection}>
          <BarcodeScannerView
            onBarcodeScanned={handleBarcodeDetected}
            isPaused={scanned || loading}
          />

          <View style={styles.cameraActionsRow}>
            {scanned ? (
              <TouchableOpacity
                style={styles.rescanBtn}
                onPress={handleResetScanner}
                activeOpacity={0.85}
              >
                <RotateCcw size={16} color={colors.text} />
                <Text style={styles.rescanBtnText}>Escanear otro código</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.snapPhotoBtn}
                onPress={handleTakePhotoOfBarcode}
                activeOpacity={0.85}
              >
                <CameraIcon size={16} color="#FFFFFF" />
                <Text style={styles.snapPhotoBtnText}>
                  Tomar foto al código o producto
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* TAB 2: INGRESO MANUAL */}
      {activeTab === "manual" && (
        <View style={styles.searchCard}>
          <Text style={styles.searchTitle}>Ingresa los números del código de barras</Text>
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
              style={[
                styles.searchBtn,
                (!barcodeInput.trim() || loading) && styles.btnDisabled,
              ]}
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

          {/* Chips de ejemplo */}
          <Text style={styles.demoHeader}>O prueba con un producto chileno:</Text>
          <View style={styles.demoChipsRow}>
            {demoProducts.map((p) => (
              <TouchableOpacity
                key={p.code}
                style={styles.demoChip}
                onPress={() => {
                  setBarcodeInput(p.code);
                  void handleSearch(p.code);
                }}
              >
                <Text style={styles.demoChipText}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
      {product && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>
                {product.source === "custom"
                  ? "⭐ Mi Producto Guardado"
                  : product.source === "local"
                  ? "🇨🇱 Catálogo Chileno"
                  : "🌐 Open Food Facts"}
              </Text>
            </View>
            <Text style={styles.productName}>{product.productName}</Text>
            {product.brand && <Text style={styles.productBrand}>{product.brand}</Text>}
            <Text style={styles.productCode}>Código: {product.barcode}</Text>
          </View>

          {/* Selector de porción */}
          <View style={styles.portionSection}>
            <View style={styles.portionHeaderRow}>
              <Text style={styles.portionLabel}>
                {portionUnit === "ml" ? "¿Cuánto volumen consumiste?" : "¿Cuántos gramos consumiste?"}
              </Text>
              {/* Selector [ g | ml ] */}
              <View style={styles.unitToggle}>
                <TouchableOpacity
                  style={[styles.unitToggleBtn, portionUnit === "g" && styles.unitToggleBtnActive]}
                  onPress={() => setPortionUnit("g")}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar unidad a gramos"
                  accessibilityState={{ selected: portionUnit === "g" }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.unitToggleText, portionUnit === "g" && styles.unitToggleTextActive]}>
                    g
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitToggleBtn, portionUnit === "ml" && styles.unitToggleBtnActive]}
                  onPress={() => setPortionUnit("ml")}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar unidad a mililitros"
                  accessibilityState={{ selected: portionUnit === "ml" }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.unitToggleText, portionUnit === "ml" && styles.unitToggleTextActive]}>
                    ml
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.portionInputRow}>
              <TextInput
                style={[styles.portionInput, !parsedPortion.ok && styles.portionInputError]}
                value={portionGrams}
                onChangeText={(text) => {
                  setPortionGrams(text);
                  const parsed = parseQuantityInput(text, portionUnit);
                  if (parsed.ok && parsed.unit !== portionUnit) {
                    setPortionUnit(parsed.unit);
                  }
                }}
                placeholder={portionUnit === "ml" ? "ej. 250, 1L" : "ej. 150"}
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Cantidad consumida"
              />
              <Text style={styles.portionUnitLabel}>{portionUnit}</Text>
            </View>

            {!parsedPortion.ok && portionGrams.trim().length > 0 && (
              <Text style={styles.portionErrorText}>{parsedPortion.error}</Text>
            )}

            {/* Chips de envase si existe tamaño conocido */}
            {product.containerSize && product.containerSize > 0 && (
              <View style={styles.containerChipsRow}>
                <TouchableOpacity
                  style={styles.containerChip}
                  onPress={() => setPortionGrams(String(Math.round(product.containerSize! / 2)))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.containerChipText}>
                    ½ envase ({formatQuantityDisplay(product.containerSize / 2, portionUnit)})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.containerChip}
                  onPress={() => setPortionGrams(String(product.containerSize))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.containerChipText}>
                    Envase completo ({formatQuantityDisplay(product.containerSize, portionUnit)})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Chips de porciones estándar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.standardChipsScroll}
              contentContainerStyle={styles.standardChipsContainer}
            >
              {getStandardPortions(portionUnit).map((portion) => {
                const isSelected = parsedPortion.ok && parsedPortion.value === portion.value;
                return (
                  <TouchableOpacity
                    key={portion.label}
                    style={[styles.portionChip, isSelected && styles.portionChipActive]}
                    onPress={() => setPortionGrams(String(portion.value))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.portionChipText, isSelected && styles.portionChipTextActive]}>
                      {portion.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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

          {/* Botón para corregir tabla con foto si no coincide */}
          <TouchableOpacity
            style={styles.rescanLabelBtn}
            onPress={handleScanNutritionLabel}
            disabled={scanningLabel}
            activeOpacity={0.8}
          >
            {scanningLabel ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <CameraIcon size={14} color={colors.primary} />
                <Text style={styles.rescanLabelBtnText}>
                  ¿No coincide con tu envase? Leer tabla física con IA
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addToMealBtn}
            onPress={handleAddProductToMeal}
            activeOpacity={0.85}
          >
            <CheckCircle2 size={18} color="#FFFFFF" />
            <Text style={styles.addToMealBtnText}>Añadir a mi Comida ✓</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PRODUCTO NO ENCONTRADO EN LA BASE DE DATOS */}
      {notFound && (
        <View style={styles.notFoundCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertCircle size={18} color="#D97706" />
            <Text style={styles.notFoundTitle}>Producto no registrado en catálogo</Text>
          </View>
          <Text style={styles.notFoundDesc}>
            No encontramos el código {barcodeInput}. Puedes fotografiar la tabla nutricional con IA o ingresar los datos:
          </Text>

          {/* Botón de Escanear Tabla con Foto IA */}
          <TouchableOpacity
            style={styles.labelScanBtn}
            onPress={handleScanNutritionLabel}
            disabled={scanningLabel}
            activeOpacity={0.85}
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
            onChangeText={(name) => { setCustomName(name); if (isLiquidFood(name)) setCustomUnit("ml"); }}
          />
          <TextInput
            style={styles.customInput}
            placeholder="Marca (ej: Great Value, Carozzi, Costa)"
            placeholderTextColor={colors.textMuted}
            value={customBrand}
            onChangeText={setCustomBrand}
          />

          <View style={styles.unitToggle}>
            {(["g", "ml"] as FoodUnit[]).map(unit => <TouchableOpacity key={unit}
              style={[styles.unitToggleBtn, customUnit === unit && styles.unitToggleBtnActive]}
              accessibilityRole="button" accessibilityLabel={`Etiqueta por 100 ${unit}`}
              accessibilityState={{ selected: customUnit === unit }} onPress={() => setCustomUnit(unit)}>
              <Text style={[styles.unitToggleText, customUnit === unit && styles.unitToggleTextActive]}>{unit}</Text>
            </TouchableOpacity>)}
          </View>
          <Text style={styles.customMacroHeader}>Información por cada 100 {customUnit} (etiqueta):</Text>
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
            activeOpacity={0.85}
          >
            <Text style={styles.saveCustomBtnText}>Guardar y Añadir a Comida</Text>
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
    ...layout.narrowPage,
    paddingBottom: 40,
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
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
  cameraSection: {
    marginBottom: 16,
  },
  cameraActionsRow: {
    marginTop: 12,
  },
  rescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rescanBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  snapPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
  },
  snapPhotoBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  searchCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  searchTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  barcodeTextInput: {
    flex: 1,
    height: 46,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  searchBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  demoHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 14,
    marginBottom: 8,
  },
  demoChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  demoChip: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  demoChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
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
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
    marginBottom: 16,
  },
  resultHeader: {
    marginBottom: 14,
  },
  sourceBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  productName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  productBrand: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: "500",
  },
  productCode: {
    fontSize: 11,
    color: colors.textMuted,
  },
  portionSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 14,
  },
  portionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  portionLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  unitToggle: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
  portionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  portionInput: {
    backgroundColor: "#FFFFFF",
    height: 40,
    width: 120,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  portionInputError: {
    borderColor: colors.danger,
  },
  portionUnitLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  portionErrorText: {
    fontSize: 11,
    color: colors.danger,
    marginBottom: 8,
  },
  containerChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  containerChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  containerChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  standardChipsScroll: {
    marginTop: 4,
  },
  standardChipsContainer: {
    gap: 6,
  },
  portionChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  portionChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: "#86EFAC",
  },
  portionChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  portionChipTextActive: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  nutritionPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 16,
  },
  nutriCol: {
    alignItems: "center",
  },
  nutriVal: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  nutriLbl: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 2,
  },
  rescanLabelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    marginBottom: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  rescanLabelBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  addToMealBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    ...shadows.glow,
  },
  addToMealBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  notFoundCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 16,
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
