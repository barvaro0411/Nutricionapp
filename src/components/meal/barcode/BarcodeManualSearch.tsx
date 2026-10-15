import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { colors } from "@/constants/colors";

export interface DemoProduct {
  label: string;
  code: string;
}

const DEFAULT_DEMO_PRODUCTS: DemoProduct[] = [
  { label: "Leche Colun Entera", code: "7802900001001" },
  { label: "Galletas Salvado Costa", code: "7802800000123" },
  { label: "Atún Lomitos San José", code: "7801810000456" },
];

export interface BarcodeManualSearchProps {
  barcodeInput: string;
  onChangeBarcodeInput: (code: string) => void;
  onSearch: (code?: string) => void;
  loading: boolean;
  demoProducts?: DemoProduct[];
}

export function BarcodeManualSearch({
  barcodeInput,
  onChangeBarcodeInput,
  onSearch,
  loading,
  demoProducts = DEFAULT_DEMO_PRODUCTS,
}: BarcodeManualSearchProps) {
  const isSearchDisabled = !barcodeInput.trim() || loading;

  return (
    <View style={styles.searchCard}>
      <Text style={styles.searchTitle}>Ingresa los números del código de barras</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.barcodeTextInput}
          placeholder="Ej: 7802900000001"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          value={barcodeInput}
          onChangeText={onChangeBarcodeInput}
          accessibilityLabel="Código de barras manual"
        />
        <TouchableOpacity
          style={[styles.searchBtn, isSearchDisabled && styles.btnDisabled]}
          onPress={() => onSearch()}
          disabled={isSearchDisabled}
          accessibilityRole="button"
          accessibilityLabel="Buscar código de barras"
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
              onChangeBarcodeInput(p.code);
              onSearch(p.code);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Probar ${p.label}`}
          >
            <Text style={styles.demoChipText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
