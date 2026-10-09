import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ArrowLeft, Check, Search, X } from "lucide-react-native";
import { AppButton } from "@/components/common/AppUI";
import { colors } from "@/constants/colors";
import { DetectedFoodItem, FoodUnit } from "@/types/meal";
import { searchUsdaFoods, UsdaSearchFood, usdaFoodToItem } from "@/services/usdaService";
import { parseQuantityInput } from "@/utils/liquidUnits";

interface Props {
  initialQuery?: string;
  initialAmount?: number;
  initialUnit?: FoodUnit;
  onClose: () => void;
  onSelect: (item: DetectedFoodItem) => void;
}
export function UsdaSearchModal({ initialQuery = "", initialAmount = 100, initialUnit = "g", onClose, onSelect }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [amount, setAmount] = useState(String(initialAmount));
  const [unit, setUnit] = useState<FoodUnit>(initialUnit);
  const [results, setResults] = useState<UsdaSearchFood[]>([]);
  const [selectedFood, setSelectedFood] = useState<UsdaSearchFood | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("");
  const requestId = useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const clearResults = () => {
    requestId.current++;
    setResults([]); setMessage(""); setSearched(false); setLoading(false);
  };
  const search = async () => {
    if (loading || query.trim().length < 2) return;
    const id = ++requestId.current;
    setLoading(true); setMessage(""); setResults([]); setSearched(false);
    try {
      const result = await searchUsdaFoods(query.trim(), unit);
      if (mounted.current && id === requestId.current) {
        setResults(result.foods); setMessage(result.message || ""); setSearched(true);
      }
    } catch (error) {
      if (mounted.current && id === requestId.current) setMessage(error instanceof Error ? error.message : "No se pudo buscar. Inténtalo de nuevo.");
    } finally { if (mounted.current && id === requestId.current) setLoading(false); }
  };
  const parsed = parseQuantityInput(amount, selectedFood?.unit || unit);
  let preview: DetectedFoodItem | null = null;
  if (selectedFood && parsed.ok && parsed.value > 0 && parsed.unit === selectedFood.unit) {
    try { preview = usdaFoodToItem(selectedFood, parsed.value); } catch { /* Invalid portions stay disabled. */ }
  }
  const portionError = !preview && selectedFood
    ? !parsed.ok ? parsed.error
      : parsed.unit !== selectedFood.unit ? "Usa " + selectedFood.unit + " para esta referencia; no hay conversión verificada a otra unidad."
        : "La porción supera los valores permitidos. Revísala."
    : "";
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.header}>
            {selectedFood && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a los resultados" onPress={() => setSelectedFood(null)} style={styles.iconButton}><ArrowLeft size={20} color={colors.text} /></TouchableOpacity>}
            <View style={styles.headerCopy}><Text accessibilityRole="header" style={styles.title}>{selectedFood ? "Ajusta tu porción" : "Buscar alimentos"}</Text><Text style={styles.subtitle}>{selectedFood ? "Revisa cuánto vas a comer" : "Datos de USDA FoodData Central"}</Text></View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar búsqueda USDA" onPress={onClose} style={styles.iconButton}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          {selectedFood ? (
            <>
              <ScrollView style={[styles.results, styles.detailScroll]} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.detail}>
                <View style={styles.foodHeading}><Text style={styles.name}>{selectedFood.label}</Text><Text style={styles.help}>{selectedFood.description}</Text><Text style={styles.source}>Referencia USDA · #{selectedFood.fdcId}</Text></View>
                <Text style={styles.label}>Cantidad que vas a consumir</Text>
                <View style={styles.quantityRow}>
                  <TextInput accessibilityLabel="Porción USDA" style={[styles.input, styles.quantity]} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" maxLength={16} selectTextOnFocus />
                  <Text style={styles.quantityUnit}>{selectedFood.unit}</Text>
                </View>
                <View style={styles.shortcuts}>
                  {(selectedFood.unit === "ml" ? [100, 200, 250, 500] : [50, 100, 150, 200]).map(value => (
                    <TouchableOpacity key={value} accessibilityRole="button" accessibilityLabel={"Porción de " + value + " " + selectedFood.unit}
                      accessibilityState={{ selected: parsed.ok && parsed.value === value }} onPress={() => setAmount(String(value))}
                      aria-pressed={parsed.ok && parsed.value === value}
                      style={[styles.shortcut, parsed.ok && parsed.value === value && styles.shortcutActive]}><Text style={styles.shortcutText}>{value} {selectedFood.unit}</Text></TouchableOpacity>
                  ))}
                </View>
                {!!portionError && <Text accessibilityLiveRegion="polite" style={styles.error}>{portionError}</Text>}
                <View style={styles.preview}>
                  <Text style={styles.previewCaption}>PARA TU PORCIÓN</Text>
                  <Text style={styles.energy}>{preview ? Math.round(preview.calories) : "—"} <Text style={styles.energyUnit}>kcal</Text></Text>
                  <View style={styles.macros}>
                    {[["Proteína", preview?.protein, colors.protein], ["Carbos", preview?.carbs, colors.carbs], ["Grasas", preview?.fat, colors.fat]].map(([label, value, color]) => (
                      <View key={String(label)} style={styles.macro}><View style={[styles.dot, { backgroundColor: String(color) }]} /><Text style={styles.macroValue}>{typeof value === "number" ? value.toFixed(1) : "—"} g</Text><Text style={styles.help}>{label}</Text></View>
                    ))}
                  </View>
                </View>
                <Text style={styles.help}>Valores por 100 {selectedFood.unit}: {Math.round(selectedFood.per100.calories)} kcal. La porción se calcula proporcionalmente usando esta referencia.</Text>
              </ScrollView>
              <AppButton title="Añadir a mi comida" disabled={!preview} icon={<Check size={18} color="white" />} onPress={() => { if (preview) { onSelect(preview); onClose(); } }} />
            </>
          ) : (
            <>
              <Text style={styles.help}>Escribe el alimento y su preparación para elegir una referencia que corresponda a lo que comiste.</Text>
              <View style={styles.searchRow}><Search size={18} color={colors.primary} /><TextInput accessibilityLabel="Alimento para buscar en USDA" style={styles.searchInput}
                value={query} onChangeText={value => { setQuery(value); clearResults(); }} placeholder="Ej: arroz cocido o pollo asado"
                placeholderTextColor={colors.textMuted} maxLength={160} returnKeyType="search" onSubmitEditing={search} /></View>
              <View style={styles.filters}>
                {(["g", "ml"] as FoodUnit[]).map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityLabel={"Buscar USDA en " + value}
                  accessibilityState={{ selected: unit === value }} onPress={() => { setUnit(value); clearResults(); }}
                  aria-pressed={unit === value}
                  style={[styles.unit, unit === value && styles.unitSelected]}><Text style={[styles.unitText, unit === value && { color: colors.primaryDark }]}>{value === "g" ? "Alimentos · g" : "Bebidas · ml"}</Text></TouchableOpacity>)}
              </View>
              <AppButton title="Buscar" loading={loading} disabled={query.trim().length < 2} onPress={() => void search()} />
              {!!message && <Text accessibilityLiveRegion="polite" style={styles.help}>{message}</Text>}
              <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
                {loading ? <View style={styles.placeholder}><ActivityIndicator color={colors.primary} /><Text style={styles.help}>Buscando referencias para tu alimento…</Text></View> : results.length ? (
                  <><Text style={styles.resultsTitle}>{results.length} referencias · elige la preparación correcta</Text>
                    {results.map(food => <TouchableOpacity key={food.fdcId} accessibilityRole="button" accessibilityLabel={"Seleccionar " + food.label}
                      style={styles.result} onPress={() => setSelectedFood(food)}>
                      <Text style={styles.name}>{food.label}</Text><Text style={styles.help}>{food.description}</Text>
                      <Text style={styles.source}>{Math.round(food.per100.calories)} kcal por 100 {food.unit} · Revisar porción →</Text>
                    </TouchableOpacity>)}
                  </>
                ) : <View style={styles.placeholder}><Search size={28} color={colors.primary} /><Text style={styles.placeholderTitle}>{searched ? "No encontramos una referencia" : "¿Qué vas a añadir?"}</Text><Text style={styles.placeholderText}>{searched ? "Prueba otro nombre o especifica si está crudo o cocido." : "Por ejemplo: arroz cocido, pechuga de pollo o leche."}</Text></View>}
              </ScrollView>
              <Text style={styles.footer}>En ml se muestran solo referencias con conversión verificable.</Text>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(16,38,29,0.55)", justifyContent: "center", alignItems: "center", padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 20, width: "100%", maxWidth: 560, maxHeight: "90%" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 21, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, borderRadius: 14 },
  help: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginVertical: 5 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, paddingHorizontal: 12, backgroundColor: colors.background, marginTop: 12 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 52, fontSize: 14, color: colors.text },
  filters: { flexDirection: "row", gap: 8, marginVertical: 12 },
  unit: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.cardBorder },
  unitSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  unitText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
  results: { flexGrow: 0, maxHeight: 360, marginVertical: 12, flexShrink: 1 },
  resultsTitle: { fontSize: 11, color: colors.textSecondary, marginVertical: 8 },
  result: { padding: 14, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, marginBottom: 8 },
  name: { color: colors.text, fontWeight: "700", fontSize: 16, lineHeight: 22 },
  source: { color: colors.primaryDark, fontSize: 11, fontWeight: "600", marginTop: 6, lineHeight: 17 },
  placeholder: { alignItems: "center", paddingVertical: 28, gap: 10 },
  placeholderTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  placeholderText: { fontSize: 12, lineHeight: 18, textAlign: "center", color: colors.textSecondary, maxWidth: 300 },
  footer: { fontSize: 10, color: colors.textSecondary, lineHeight: 16 },
  detail: { paddingBottom: 8 },
  detailScroll: { maxHeight: 520 },
  foodHeading: { backgroundColor: colors.primaryGhost, borderRadius: 16, padding: 14, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 8 },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 12, color: colors.text, backgroundColor: colors.background },
  quantity: { flex: 1, minWidth: 0, fontSize: 24, fontWeight: "700", minHeight: 56 },
  quantityUnit: { fontSize: 18, fontWeight: "700", color: colors.textSecondary, paddingHorizontal: 10 },
  shortcuts: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 12 },
  shortcut: { flex: 1, minWidth: 50, minHeight: 44, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  shortcutActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  shortcutText: { color: colors.primaryDark, fontSize: 12, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  preview: { backgroundColor: colors.background, borderRadius: 18, padding: 18, marginBottom: 10 },
  previewCaption: { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  energy: { color: colors.text, fontSize: 34, fontWeight: "800", marginVertical: 12 },
  energyUnit: { fontSize: 14, fontWeight: "500", color: colors.textSecondary },
  macros: { flexDirection: "row", gap: 12 },
  macro: { flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, marginBottom: 8 },
  macroValue: { color: colors.text, fontSize: 16, fontWeight: "700" },
});
