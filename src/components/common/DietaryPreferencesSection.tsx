import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { CheckCircle2, Plus, X } from "lucide-react-native";
import {
  CUSTOM_ALLERGY_MAX_ITEMS,
  CUSTOM_ALLERGY_MAX_LENGTH,
  DIETARY_RESTRICTION_LABELS,
  DietaryRestriction,
} from "@/types/profile";
import { colors } from "@/constants/colors";

export interface DietaryPreferencesSectionProps {
  restrictions: DietaryRestriction[];
  customAllergies: string[];
  onToggleRestriction: (restriction: DietaryRestriction) => void | Promise<unknown>;
  onAddCustomAllergy: (term: string) => void | Promise<unknown>;
  onRemoveCustomAllergy: (term: string) => void | Promise<unknown>;
  disabled?: boolean;
}

const normalizeCompare = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function DietaryPreferencesSection({
  restrictions,
  customAllergies,
  onToggleRestriction,
  onAddCustomAllergy,
  onRemoveCustomAllergy,
  disabled = false,
}: DietaryPreferencesSectionProps) {
  const [draftAllergy, setDraftAllergy] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (disabled) return;
    const cleaned = draftAllergy.trim().replace(/\s+/g, " ");
    if (!cleaned) {
      setInputError("Escribe un alimento o ingrediente a evitar.");
      return;
    }
    if (cleaned.length > CUSTOM_ALLERGY_MAX_LENGTH) {
      setInputError(`Máximo ${CUSTOM_ALLERGY_MAX_LENGTH} caracteres por elemento.`);
      return;
    }
    if (customAllergies.length >= CUSTOM_ALLERGY_MAX_ITEMS) {
      setInputError(`Puedes registrar hasta ${CUSTOM_ALLERGY_MAX_ITEMS} elementos.`);
      return;
    }
    const candidateKey = normalizeCompare(cleaned);
    if (customAllergies.some((item) => normalizeCompare(item) === candidateKey)) {
      setInputError("Ya tienes este ingrediente en tu lista.");
      return;
    }

    setInputError(null);
    setDraftAllergy("");
    await onAddCustomAllergy(cleaned);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.dietaryGrid}>
        {(Object.keys(DIETARY_RESTRICTION_LABELS) as DietaryRestriction[]).map((key) => {
          const item = DIETARY_RESTRICTION_LABELS[key];
          const active = restrictions.includes(key);
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}: ${active ? "activo" : "inactivo"}`}
              accessibilityState={{ selected: active, disabled }}
              disabled={disabled}
              style={[styles.dietaryCard, active && styles.dietaryCardActive]}
              onPress={() => void onToggleRestriction(key)}
            >
              <View style={styles.dietaryTop}>
                <Text style={styles.dietaryIcon}>{item.icon}</Text>
                <View style={[styles.dietaryRadio, active && styles.dietaryRadioActive]}>
                  {active && <CheckCircle2 size={16} color={colors.primary} />}
                </View>
              </View>
              <Text style={[styles.dietaryLabel, active && styles.dietaryLabelActive]}>
                {item.label}
              </Text>
              <Text style={styles.dietaryDesc}>{item.description}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.customBox}>
        <Text style={styles.customTitle}>Otras alergias o alimentos a evitar</Text>
        <Text style={styles.customHint}>
          Ej: huevo, soya, champiñones, kiwi. El Coach y las alertas los evitarán.
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Agregar ingrediente o alergia..."
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Agregar alergia o alimento a evitar"
            value={draftAllergy}
            onChangeText={(text) => {
              setDraftAllergy(text);
              if (inputError) setInputError(null);
            }}
            onSubmitEditing={() => void handleAdd()}
            maxLength={CUSTOM_ALLERGY_MAX_LENGTH}
            editable={!disabled}
            returnKeyType="done"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Añadir alergia personalizada"
            disabled={disabled}
            onPress={() => void handleAdd()}
            style={({ pressed }) => [
              styles.addButton,
              disabled && styles.addButtonDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Agregar</Text>
          </Pressable>
        </View>

        {inputError && (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {inputError}
          </Text>
        )}

        {customAllergies.length > 0 && (
          <View style={styles.chipsWrap}>
            {customAllergies.map((term) => (
              <View key={term} style={styles.chip}>
                <Text style={styles.chipText}>{term}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${term}`}
                  disabled={disabled}
                  onPress={() => void onRemoveCustomAllergy(term)}
                  hitSlop={8}
                  style={styles.chipRemove}
                >
                  <X size={13} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  dietaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  dietaryCard: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 12,
    minWidth: 0,
  },
  dietaryCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#F0FDF4",
  },
  dietaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dietaryIcon: {
    fontSize: 20,
  },
  dietaryRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  dietaryRadioActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  dietaryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  dietaryLabelActive: {
    color: colors.primaryDark,
  },
  dietaryDesc: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  customBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    padding: 14,
  },
  customTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  customHint: {
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: colors.text,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.danger,
    fontWeight: "600",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 999,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#991B1B",
  },
  chipRemove: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
  },
});
