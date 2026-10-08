import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Sunrise, Sun, Moon, Apple, Plus, LucideIcon } from "lucide-react-native";
import { MealWithItems, MealType } from "@/types/meal";
import { colors, shadows } from "@/constants/colors";
import { formatQuantityDisplay, resolveItemUnit } from "@/utils/liquidUnits";

interface MealMeta {
  title: string;
  Icon: LucideIcon;
  color: string;
  bg: string;
}

const MEAL_META: Record<MealType, MealMeta> = {
  desayuno: {
    title: "Desayuno",
    Icon: Sunrise,
    color: "#D97706",
    bg: "#FEF3C7",
  },
  almuerzo: {
    title: "Almuerzo",
    Icon: Sun,
    color: "#059669",
    bg: "#ECFDF5",
  },
  cena: {
    title: "Once / Cena",
    Icon: Moon,
    color: "#4F46E5",
    bg: "#EEF2FF",
  },
  snack: {
    title: "Colación",
    Icon: Apple,
    color: "#0284C7",
    bg: "#F0F9FF",
  },
};

interface MealCardProps {
  mealType: MealType;
  meals: MealWithItems[];
  onAddPress: (type: MealType) => void;
  onMealPress?: (meal: MealWithItems) => void;
}

export function MealCard({ mealType, meals, onAddPress, onMealPress }: MealCardProps) {
  const meta = MEAL_META[mealType];
  const { Icon } = meta;
  const filteredMeals = meals.filter((m) => m.meal_type === mealType);
  const hasMeals = filteredMeals.length > 0;

  const totalCalories = filteredMeals.reduce((acc, m) => acc + m.total_calories, 0);
  const totalProtein = filteredMeals.reduce((acc, m) => acc + m.total_protein, 0);
  const totalCarbs = filteredMeals.reduce((acc, m) => acc + m.total_carbs, 0);
  const totalFat = filteredMeals.reduce((acc, m) => acc + m.total_fat, 0);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
            <Icon size={18} color={meta.color} />
          </View>
          <View style={styles.titleWrapper}>
            <Text style={styles.title}>{meta.title}</Text>
            {hasMeals ? (
              <View style={styles.macrosRow}>
                <View style={styles.macroPill}>
                  <View style={[styles.macroDot, { backgroundColor: colors.protein }]} />
                  <Text style={styles.macroText}>{Math.round(totalProtein)}g P</Text>
                </View>
                <View style={styles.macroPill}>
                  <View style={[styles.macroDot, { backgroundColor: colors.carbs }]} />
                  <Text style={styles.macroText}>{Math.round(totalCarbs)}g C</Text>
                </View>
                <View style={styles.macroPill}>
                  <View style={[styles.macroDot, { backgroundColor: colors.fat }]} />
                  <Text style={styles.macroText}>{Math.round(totalFat)}g G</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.emptySubtitle}>Sin registro aún</Text>
            )}
          </View>
        </View>

        {hasMeals ? (
          <View style={styles.calPill}>
            <Text style={styles.calText}>
              {Math.round(totalCalories).toLocaleString("es-CL")} <Text style={styles.calUnit}>kcal</Text>
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => onAddPress(mealType)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Registrar ${meta.title}`}
          >
            <Plus size={13} color={colors.primaryDark} />
            <Text style={styles.addBtnText}>Registrar</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasMeals && (
        <View style={styles.itemsList}>
          {filteredMeals.map((meal) => (
            <TouchableOpacity
              key={meal.id}
              style={styles.mealBlock}
              onPress={() => onMealPress && onMealPress(meal)}
              activeOpacity={0.7}
            >
              {meal.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemNameWrap}>
                    <View style={styles.itemBullet} />
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.food_name}
                      {item.nutrition_reference ? " · USDA" : ""}
                    </Text>
                  </View>
                  <View style={styles.itemMetrics}>
                    <View style={styles.quantityTag}>
                      <Text style={styles.itemGrams}>
                        {formatQuantityDisplay(item.grams, resolveItemUnit(item))}
                      </Text>
                    </View>
                    <Text style={styles.itemCalories}>
                      {Math.round(item.calories).toLocaleString("es-CL")} kcal
                    </Text>
                  </View>
                </View>
              ))}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.addMoreRow}
            onPress={() => onAddPress(mealType)}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={`Añadir alimento a ${meta.title}`}
          >
            <View style={styles.addMoreIconWrap}>
              <Plus size={13} color={colors.primary} />
            </View>
            <Text style={styles.addMoreText}>Añadir alimento</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 15.5,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  macrosRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  macroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },
  calPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  calText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  calUnit: {
    fontSize: 11,
    fontWeight: "600",
  },
  addBtn: {
    backgroundColor: colors.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  itemsList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  mealBlock: {
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  itemNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
    gap: 8,
  },
  itemBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
  },
  itemName: {
    fontSize: 13.5,
    color: colors.text,
    fontWeight: "600",
    flex: 1,
  },
  itemMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quantityTag: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemGrams: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  itemCalories: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.text,
    minWidth: 58,
    textAlign: "right",
  },
  addMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 10,
    marginTop: 2,
  },
  addMoreIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  addMoreText: {
    fontSize: 12.5,
    color: colors.primaryDark,
    fontWeight: "700",
  },
});
