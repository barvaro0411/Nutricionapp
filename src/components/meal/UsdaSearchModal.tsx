import React, { useRef, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { colors } from "@/constants/colors";
import { DetectedFoodItem, FoodUnit } from "@/types/meal";
import { searchUsdaFoods, UsdaSearchFood, usdaFoodToItem } from "@/services/usdaService";
import { parseQuantityInput } from "@/utils/liquidUnits";

interface Props { initialQuery?: string; initialAmount?: number; initialUnit?: FoodUnit; onClose: () => void; onSelect: (item: DetectedFoodItem) => void }
export function UsdaSearchModal({ initialQuery = "", initialAmount = 100, initialUnit = "g", onClose, onSelect }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [amount, setAmount] = useState(String(initialAmount));
  const [unit, setUnit] = useState<FoodUnit>(initialUnit);
  const [results, setResults] = useState<UsdaSearchFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const requestId = useRef(0);
  const mounted = useRef(true);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const search = async () => {
    if (loading || query.trim().length < 2) return;
    const id = ++requestId.current;
    setLoading(true); setMessage(""); setResults([]);
    try {
      const result = await searchUsdaFoods(query.trim(), unit);
      if (mounted.current && id === requestId.current) { setResults(result.foods); setMessage(result.message || ""); }
    } catch (error) {
      if (mounted.current && id === requestId.current) setMessage(error instanceof Error ? error.message : "No se pudo buscar.");
    } finally { if (mounted.current && id === requestId.current) setLoading(false); }
  };
  const select = (food: UsdaSearchFood) => {
    const parsed = parseQuantityInput(amount, unit);
    if (!parsed.ok || parsed.value <= 0 || parsed.unit !== food.unit) { setMessage("Ingresa una porción positiva en " + food.unit + "."); return; }
    try { onSelect(usdaFoodToItem(food, parsed.value)); onClose(); }
    catch { setMessage("La porción supera los valores permitidos. Revísala."); }
  };
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={styles.overlay}><View style={styles.card}>
        <View style={styles.header}><Text style={styles.title}>Buscar en USDA</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar búsqueda USDA" onPress={onClose}><Text style={styles.link}>Cerrar</Text></TouchableOpacity></View>
        <Text style={styles.help}>Busca en español e indica la preparación. Elige la referencia que corresponda a tu comida y revisa la porción.</Text>
        <TextInput accessibilityLabel="Alimento para buscar en USDA" style={styles.input} value={query} onChangeText={value => { setQuery(value); setResults([]); setMessage(""); requestId.current++; setLoading(false); }} placeholder="Ej: fideos cocidos o salsa con carne" maxLength={160} onSubmitEditing={search} />
        <View style={styles.header}>
          <TextInput accessibilityLabel="Porción USDA" style={[styles.input, styles.amount]} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          {(["g", "ml"] as FoodUnit[]).map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityLabel={"Buscar USDA en " + value} accessibilityState={{ selected: unit === value }} onPress={() => { setUnit(value); setResults([]); setMessage(""); requestId.current++; setLoading(false); }} style={[styles.unit, unit === value && styles.selected]}><Text>{value}</Text></TouchableOpacity>)}
          <TouchableOpacity accessibilityRole="button" disabled={loading || query.trim().length < 2} onPress={search} style={styles.button}><Text style={styles.buttonText}>{loading ? "Buscando…" : "Buscar"}</Text></TouchableOpacity>
        </View>
        {loading && <ActivityIndicator color={colors.primary} accessibilityLabel="Consultando USDA" />}
        {!!message && <Text accessibilityLiveRegion="polite" style={styles.help}>{message}</Text>}
        <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
          {results.map(food => <TouchableOpacity key={food.fdcId} accessibilityRole="button" accessibilityLabel={"Seleccionar " + food.label} style={styles.result} onPress={() => select(food)}>
            <Text style={styles.name}>{food.label}</Text><Text style={styles.help}>{food.description}</Text>
            <Text style={styles.link}>{Math.round(food.per100.calories)} kcal · P {food.per100.protein.toFixed(1)} · C {food.per100.carbs.toFixed(1)} · G {food.per100.fat.toFixed(1)} por 100 {food.unit}</Text>
          </TouchableOpacity>)}
        </ScrollView>
        <Text style={styles.help}>Fuente: USDA FoodData Central. En ml solo se muestran referencias con conversión verificable.</Text>
      </View></View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 16 },
  card: { backgroundColor: "white", borderRadius: 18, padding: 18, width: "100%", maxWidth: 560, maxHeight: "90%" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "space-between" }, title: { fontSize: 20, fontWeight: "700", color: colors.text },
  input: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 12, marginVertical: 10, color: colors.text }, amount: { flex: 1, minWidth: 60 },
  unit: { padding: 10, borderRadius: 8, backgroundColor: "#f3f4f6" }, selected: { backgroundColor: "#d1fae5" },
  button: { backgroundColor: colors.primary, borderRadius: 10, padding: 12 }, buttonText: { color: "white", fontWeight: "700" },
  results: { flexGrow: 0, maxHeight: 350 }, result: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  name: { color: colors.text, fontWeight: "600", fontSize: 15 }, help: { color: colors.textSecondary, fontSize: 12, marginVertical: 5 }, link: { color: colors.primaryDark, fontSize: 12, fontWeight: "600" },
});
