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
  Platform,
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
  ArrowLeft,
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
import { useMealAnalysis } from "@/hooks/useMealAnalysis";
import { BarcodeScannerView } from "@/components/meal/BarcodeScannerView";
import { colors } from "@/constants/colors";

export default function BarcodeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addItem } = useMealReviewStore();
  const { analyzePhoto } = useMealAnalysis();

  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [scanned, setScanned] = useState(false);

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
        setPortionGrams(String(result.servingSizeG || 100));
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
          const analysis = await analyzePhoto(
            result.assets[0].uri,
            "snack",
            "Identifica este producto de supermercado chileno y sus macronutrientes por cada 100g."
          );

          if (analysis.success && analysis.data?.items?.[0]) {
            const item = analysis.data.items[0];
            setProduct({
              barcode: "FOTO-IA",
              productName: item.food,
              servingSizeG: 100,
              caloriesPer100g: item.calories,
              proteinPer100g: item.protein,
              carbsPer100g: item.carbs,
              fatPer100g: item.fat,
              source: "local",
            });
            setPortionGrams(String(Math.round(item.grams || 100)));
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
        const analysis = await analyzePhoto(
          result.assets[0].uri,
          "snack",
          "Esta foto es de una etiqueta nutricional de un producto chileno. Lee la información por cada 100g."
        );

        if (analysis.success && analysis.data?.items?.[0]) {
          const item = analysis.data.items[0];
          setCustomName(item.food);
          setCustomCals(String(Math.round(item.calories)));
          setCustomProt(String(Math.round(item.protein * 10) / 10));
          setCustomCarbs(String(Math.round(item.carbs * 10) / 10));
          setCustomFat(String(Math.round(item.fat * 10) / 10));
          showAlert(
            "¡Etiqueta Leída con IA!",
            "Completamos los datos nutricionales según la foto. Confirma los valores."
          );
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
    const grams = parseDecimal(portionGrams);
    if (!Number.isFinite(grams) || grams <= 0 || grams > 20000) {
      showAlert("Porción inválida", "Ingresa los gramos consumidos.");
      return;
    }
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
        barcode: barcodeInput.trim() || "000000000000",
        productName: customName.trim(),
        brand: customBrand.trim() || undefined,
        servingSizeG: 100,
        caloriesPer100g: parseDecimal(customCals),
        proteinPer100g: parseDecimal(customProt),
        carbsPer100g: parseDecimal(customCarbs),
        fatPer100g: parseDecimal(customFat),
      });

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

  // Productos chilenos frecuentes para probar en 1 toque
  const demoProducts = [
    { label: "Leche Colun Entera", code: "7802900001001" },
    { label: "Galletas Salvado Costa", code: "7802800000123" },
    { label: "Atún Lomitos San José", code: "7801810000456" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Escanear Código de Barras</Text>
        <View style={{ width: 40 }} />
      </View>

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
                {product.source === "local" ? "🇨🇱 Catálogo Chileno" : "🌐 Open Food Facts"}
              </Text>
            </View>
            <Text style={styles.productName}>{product.productName}</Text>
            {product.brand && <Text style={styles.productBrand}>{product.brand}</Text>}
            <Text style={styles.productCode}>Código: {product.barcode}</Text>
          </View>

          {/* Selector de porción en gramos */}
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
            onChangeText={setCustomName}
          />
          <TextInput
            style={styles.customInput}
            placeholder="Marca (ej: Great Value, Carozzi, Costa)"
            placeholderTextColor={colors.textMuted}
            value={customBrand}
            onChangeText={setCustomBrand}
          />

          <Text style={styles.customMacroHeader}>Información por cada 100g (etiqueta):</Text>
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
    padding: 16,
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
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  resultHeader: {
    marginBottom: 14,
  },
  sourceBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  productName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  productBrand: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  productCode: {
    fontSize: 11,
    color: colors.textMuted,
  },
  portionSection: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  portionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  portionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  portionInput: {
    backgroundColor: colors.card,
    height: 38,
    width: 90,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  portionUnit: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  nutritionPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  nutriCol: {
    alignItems: "center",
  },
  nutriVal: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  nutriLbl: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  addToMealBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addToMealBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
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
