import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Href, useRouter } from "expo-router";
import { Minus, Plus, ShieldCheck, Sparkles, X } from "lucide-react-native";
import { AiConsentModal } from "@/components/common/AiConsentModal";
import { colors } from "@/constants/colors";
import { useAiConsent } from "@/hooks/useAiConsent";
import { useDailyNutrition } from "@/hooks/useDailyNutrition";
import { useDietaryPreferences } from "@/hooks/useDietaryPreferences";
import { useGenerateRecipe } from "@/hooks/useRecipes";
import { showToast } from "@/utils/alerts";
import { MealType } from "@/types/meal";
import { DIETARY_RESTRICTION_LABELS } from "@/types/profile";
import { Recipe } from "@/types/recipe";

export interface AiRecipeGeneratorModalProps {
  visible: boolean;
  defaultMealType?: MealType;
  onClose: () => void;
  onGenerated: (recipe: Recipe) => void;
}

const MEAL_OPTIONS: Array<{ value: MealType; label: string }> = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "cena", label: "Once / Cena" },
  { value: "snack", label: "Colación" },
];

const PREP_TIME_OPTIONS: Array<{ value: number | undefined; label: string }> = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: undefined, label: "Sin límite" },
];

function inferDefaultMealTypeByHour(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return "desayuno";
  if (hour < 16) return "almuerzo";
  if (hour < 19) return "snack";
  return "cena";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function AiRecipeGeneratorModal({
  visible,
  defaultMealType,
  onClose,
  onGenerated,
}: AiRecipeGeneratorModalProps) {
  const router = useRouter();
  const { data: daily } = useDailyNutrition();
  const { restrictions, customAllergies } = useDietaryPreferences();
  const { hasConsent, setConsent, isUpdating: isUpdatingConsent } = useAiConsent();
  const generateMutation = useGenerateRecipe();

  const [mealType, setMealType] = useState<MealType>(
    defaultMealType || inferDefaultMealTypeByHour()
  );
  const [maxPrepMinutes, setMaxPrepMinutes] = useState<number | undefined>(30);
  const [servings, setServings] = useState<number>(1);
  const [ingredientsText, setIngredientsText] = useState("");
  const [cravingNote, setCravingNote] = useState("");
  const [useRemainingMacros, setUseRemainingMacros] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [consentVisible, setConsentVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setErrorMsg(null);
      if (defaultMealType) {
        setMealType(defaultMealType);
      }
    }
  }, [visible, defaultMealType]);

  const remaining = daily?.remaining;
  const hasMeaningfulBudget = Boolean(remaining && remaining.calories >= 100);

  const runGeneration = async () => {
    setErrorMsg(null);
    const availableIngredients = ingredientsText
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);

    const targetMacros =
      useRemainingMacros && hasMeaningfulBudget && remaining
        ? {
            calories: clamp(remaining.calories, 100, 2500),
            protein: clamp(remaining.protein, 0, 250),
            carbs: clamp(remaining.carbs, 0, 350),
            fat: clamp(remaining.fat, 0, 150),
          }
        : undefined;

    try {
      const created = await generateMutation.mutateAsync({
        mealType,
        maxPrepMinutes,
        servings,
        ...(availableIngredients.length ? { availableIngredients } : {}),
        ...(cravingNote.trim() ? { cravingNote: cravingNote.trim().slice(0, 140) } : {}),
        ...(targetMacros ? { targetMacros } : {}),
      });
      showToast({
        type: "success",
        title: "Receta creada y guardada",
        message: created.title,
      });
      setIngredientsText("");
      setCravingNote("");
      onGenerated(created);
    } catch (err: any) {
      const msg = err?.message || "No se pudo generar la receta con IA.";
      setErrorMsg(msg);
      showToast({
        type: "error",
        title: "Error al generar receta",
        message: msg,
      });
    }
  };

  const handleSubmit = () => {
    if (generateMutation.isPending) return;
    if (!hasConsent) {
      setConsentVisible(true);
      return;
    }
    void runGeneration();
  };

  const activeRestrictionSummary = [
    ...restrictions.map((r) => DIETARY_RESTRICTION_LABELS[r]?.label || r),
    ...customAllergies,
  ];

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.header}>
              <View style={styles.badge}>
                <Sparkles size={14} color={colors.primaryDark} />
                <Text style={styles.badgeText}>RECETA PERSONALIZADA IA</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cerrar generador de recetas"
                style={styles.closeBtn}
                onPress={onClose}
                disabled={generateMutation.isPending}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollBody}
            >
              <Text style={styles.title}>Crea una receta a tu medida</Text>
              <Text style={styles.subtitle}>
                Se guardará automáticamente en &quot;Mis Recetas IA&quot; para registrarla o sumarla a tus compras.
              </Text>

              {remaining && (
                <View style={styles.budgetCard}>
                  <View style={styles.budgetHeader}>
                    <View style={styles.budgetTextWrap}>
                      <Text style={styles.budgetTitle}>Ajustar a tus macros restantes de hoy</Text>
                      <Text style={styles.budgetNumbers}>
                        {hasMeaningfulBudget
                          ? `🔥 ${Math.round(remaining.calories)} kcal · 🥩 ${Math.round(remaining.protein)}g P · 🍞 ${Math.round(remaining.carbs)}g C · 🥑 ${Math.round(remaining.fat)}g G`
                          : "Ya cubriste casi toda tu meta de hoy; generaremos una opción ligera."}
                      </Text>
                    </View>
                    {hasMeaningfulBudget && (
                      <Switch
                        accessibilityLabel="Ajustar receta a macros restantes de hoy"
                        value={useRemainingMacros}
                        onValueChange={setUseRemainingMacros}
                        trackColor={{ false: colors.cardBorder, true: colors.mint }}
                        thumbColor={useRemainingMacros ? colors.primary : "#FFFFFF"}
                      />
                    )}
                  </View>
                </View>
              )}

              {activeRestrictionSummary.length > 0 && (
                <View style={styles.dietaryBox}>
                  <ShieldCheck size={16} color={colors.primary} />
                  <Text style={styles.dietaryText} numberOfLines={2}>
                    Evitará automáticamente: {activeRestrictionSummary.join(", ")}
                  </Text>
                </View>
              )}

              <Text style={styles.label}>Momento del día</Text>
              <View style={styles.chipsRow}>
                {MEAL_OPTIONS.map((opt) => {
                  const active = mealType === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setMealType(opt.value)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Tiempo máximo</Text>
              <View style={styles.chipsRow}>
                {PREP_TIME_OPTIONS.map((opt) => {
                  const active = maxPrepMinutes === opt.value;
                  return (
                    <Pressable
                      key={opt.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setMaxPrepMinutes(opt.value)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.servingsRow}>
                <View>
                  <Text style={styles.label}>Porciones</Text>
                  <Text style={styles.helper}>Los ingredientes escalan al guardar y comprar.</Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Disminuir porciones"
                    style={styles.stepBtn}
                    onPress={() => setServings((s) => Math.max(1, s - 1))}
                    disabled={servings <= 1 || generateMutation.isPending}
                  >
                    <Minus size={16} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{servings}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Aumentar porciones"
                    style={styles.stepBtn}
                    onPress={() => setServings((s) => Math.min(6, s + 1))}
                    disabled={servings >= 6 || generateMutation.isPending}
                  >
                    <Plus size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.label}>Ingredientes que ya tienes (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: pollo, arroz, palta, tomate"
                placeholderTextColor={colors.textMuted}
                value={ingredientsText}
                onChangeText={setIngredientsText}
                editable={!generateMutation.isPending}
              />

              <Text style={styles.label}>Antojo o estilo (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: algo tibio, fácil para llevar, sin horno"
                placeholderTextColor={colors.textMuted}
                value={cravingNote}
                onChangeText={setCravingNote}
                maxLength={140}
                editable={!generateMutation.isPending}
              />

              {errorMsg && (
                <View accessibilityRole="alert" style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Generar receta con IA"
              accessibilityState={{ busy: generateMutation.isPending, disabled: generateMutation.isPending }}
              style={[styles.submitBtn, generateMutation.isPending && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.submitText}>Diseñando tu receta…</Text>
                </View>
              ) : (
                <Text style={styles.submitText}>✨ Generar y Guardar Receta</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AiConsentModal
        visible={consentVisible}
        isUpdating={isUpdatingConsent}
        onAccept={async () => {
          try {
            await setConsent(true);
            setConsentVisible(false);
            void runGeneration();
          } catch (err: any) {
            setConsentVisible(false);
            showToast({
              type: "error",
              title: "No se pudo guardar el consentimiento",
              message: err?.message,
            });
          }
        }}
        onCancel={() => setConsentVisible(false)}
        onViewPrivacy={() => {
          setConsentVisible(false);
          onClose();
          router.push("/legal" as Href);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(16, 62, 50, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 28,
    maxHeight: "90%",
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  scrollBody: {
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  budgetCard: {
    backgroundColor: colors.primaryGhost,
    borderWidth: 1,
    borderColor: colors.mint,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  budgetTextWrap: {
    flex: 1,
  },
  budgetTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  budgetNumbers: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  dietaryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  dietaryText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.forest,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  helper: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: -4,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  servingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  stepValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    minWidth: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 14,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
  },
  submitBtn: {
    minHeight: 52,
    backgroundColor: colors.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
