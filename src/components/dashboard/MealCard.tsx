import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Sunrise, Sun, Moon, Apple, Plus, ChevronDown, ChevronUp, Utensils, LucideIcon } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { MealWithItems, MealType } from "@/types/meal";
import { colors, shadows } from "@/constants/colors";
import { formatQuantityDisplay, resolveItemUnit } from "@/utils/liquidUnits";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

const MEAL_META: Record<MealType, { title: string; Icon: LucideIcon; color: string; bg: string }> = {
  desayuno: { title: "Desayuno", Icon: Sunrise, color: "#D97706", bg: "#FEF3C7" },
  almuerzo: { title: "Almuerzo", Icon: Sun, color: "#059669", bg: "#ECFDF5" },
  cena: { title: "Once / Cena", Icon: Moon, color: "#4F46E5", bg: "#EEF2FF" },
  snack: { title: "Colación", Icon: Apple, color: "#0284C7", bg: "#F0F9FF" },
};

/** A photo belongs to the whole meal, rather than to any one ingredient. */
function MealPhoto({ path }: { path: string }) {
  const userId = useAuthStore((state) => state.user?.id);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const ownsPath = !!userId && path.startsWith(`${userId}/`);
  const { data: url } = useQuery({
    queryKey: ["meal-photo", userId, path],
    enabled: ownsPath,
    staleTime: 30 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("meal_photos").createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (!ownsPath || !url || failedUrl === url) return null;
  return (
    <View style={styles.photoRow}>
      <Image source={{ uri: url }} style={styles.photo} accessibilityLabel="Foto de esta comida" onError={() => setFailedUrl(url)} />
      <Text style={styles.photoLabel}>Foto de esta comida</Text>
    </View>
  );
}

interface MealCardProps {
  mealType: MealType;
  meals: MealWithItems[];
  onAddPress: (type: MealType) => void;
  onMealPress?: (meal: MealWithItems) => void;
}

export function MealCard({ mealType, meals, onAddPress, onMealPress }: MealCardProps) {
  const meta = MEAL_META[mealType];
  const { Icon } = meta;
  const [expanded, setExpanded] = useState(mealType === "desayuno" || mealType === "almuerzo");
  const filteredMeals = meals.filter((meal) => meal.meal_type === mealType);
  const hasMeals = filteredMeals.length > 0;
  const totals = filteredMeals.reduce((sum, meal) => ({
    calories: sum.calories + meal.total_calories,
    protein: sum.protein + meal.total_protein,
    carbs: sum.carbs + meal.total_carbs,
    fat: sum.fat + meal.total_fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <View testID={`meal-card-${mealType}`} style={styles.card}>
      <Pressable disabled={!hasMeals} onPress={() => setExpanded((value) => !value)}
        accessibilityRole={hasMeals ? "button" : undefined}
        accessibilityLabel={hasMeals ? `${expanded ? "Ocultar" : "Mostrar"} alimentos de ${meta.title}` : undefined}
        accessibilityState={hasMeals ? { expanded } : undefined} aria-expanded={hasMeals ? expanded : undefined}
        style={({ pressed }) => [styles.header, pressed && hasMeals && { opacity: 0.75 }]}>
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}><Icon size={22} color={meta.color} /></View>
        <View style={styles.titleWrapper}>
          <Text style={styles.title}>{meta.title}</Text>
          {hasMeals ? (
            <View style={styles.macrosRow}>
              <View style={styles.macroPill}><View style={[styles.dot, { backgroundColor: colors.protein }]} /><Text style={styles.macroText}>{Math.round(totals.protein)} g P</Text></View>
              <View style={styles.macroPill}><View style={[styles.dot, { backgroundColor: colors.carbs }]} /><Text style={styles.macroText}>{Math.round(totals.carbs)} g C</Text></View>
              <View style={styles.macroPill}><View style={[styles.dot, { backgroundColor: colors.fat }]} /><Text style={styles.macroText}>{Math.round(totals.fat)} g G</Text></View>
            </View>
          ) : <Text style={styles.emptySubtitle}>Sin registro aún</Text>}
        </View>
        {hasMeals && <View style={styles.headerMetrics}>
          <View style={styles.calPill}><Text style={styles.calText}>{Math.round(totals.calories).toLocaleString("es-CL")}</Text><Text style={styles.calUnit}>kcal</Text></View>
          {expanded ? <ChevronUp size={17} color={colors.textSecondary} /> : <ChevronDown size={17} color={colors.textSecondary} />}
        </View>}
      </Pressable>

      {hasMeals && expanded && (
        <View style={styles.itemsList}>
          {filteredMeals.map((meal) => (
            <View key={meal.id} style={styles.mealBlock}>
              {meal.image_path && <MealPhoto key={meal.image_path} path={meal.image_path} />}
              <Pressable disabled={!onMealPress} accessibilityRole={onMealPress ? "button" : undefined}
                accessibilityLabel={onMealPress ? `Ver registro de ${meta.title}` : undefined}
                onPress={() => onMealPress?.(meal)}>
                {meal.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.foodIcon} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Utensils size={18} color={colors.textMuted} /></View>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName}>{item.food_name}</Text>
                      <View style={styles.itemBottom}>
                        <View style={styles.quantityTag}><Text style={styles.itemGrams}>{formatQuantityDisplay(item.grams, resolveItemUnit(item))}</Text></View>
                        {item.nutrition_reference && <View style={styles.sourceBadge}><Text style={styles.sourceText}>USDA</Text></View>}
                        <Text style={styles.itemCalories}>{Math.round(item.calories).toLocaleString("es-CL")} kcal</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {(!hasMeals || expanded) && <Pressable accessibilityRole="button" accessibilityLabel={`Añadir alimento a ${meta.title}`}
        onPress={() => onAddPress(mealType)} style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.75 }]}>
        <Plus size={18} color={colors.primaryDark} /><Text style={styles.addText}>Añadir alimento</Text>
      </Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, ...shadows.card },
  header: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  titleWrapper: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  macrosRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 5, flexWrap: "wrap" },
  macroPill: { flexDirection: "row", alignItems: "center", gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  macroText: { fontSize: 10, color: colors.textSecondary, fontWeight: "600" },
  emptySubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  headerMetrics: { flexDirection: "row", alignItems: "center", gap: 7 },
  calPill: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, alignItems: "center" },
  calText: { fontSize: 14, fontWeight: "800", color: colors.primaryDark },
  calUnit: { fontSize: 9, color: colors.primaryDark, marginTop: 1 },
  itemsList: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder, gap: 10 },
  mealBlock: { gap: 8 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 10, borderRadius: 14, backgroundColor: "#F7F9F7", marginBottom: 7 },
  foodIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#EBF1EB", alignItems: "center", justifyContent: "center" },
  itemDetails: { flex: 1, minWidth: 0, gap: 7 },
  itemName: { fontSize: 13, lineHeight: 19, color: colors.text, fontWeight: "600" },
  itemBottom: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  quantityTag: { backgroundColor: "#EAF0EA", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  itemGrams: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  itemCalories: { fontSize: 12, fontWeight: "700", color: colors.text, marginLeft: "auto" },
  addButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 48, backgroundColor: colors.primaryLight, borderRadius: 14, marginTop: 12 },
  addText: { fontSize: 13, color: colors.primaryDark, fontWeight: "700" },
  sourceBadge: { backgroundColor: colors.primaryLight, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 3 },
  sourceText: { color: colors.primaryDark, fontSize: 8, fontWeight: "800" },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  photo: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.surfaceMuted },
  photoLabel: { fontSize: 11, color: colors.textSecondary, flex: 1 },
});
