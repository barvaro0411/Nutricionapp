import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MealWithItems, MealType } from "@/types/meal";
import { colors } from "@/constants/colors";

const MEAL_TITLES: Record<MealType, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Once / Cena",
  snack: "Colación",
};

interface MealCardProps {
  mealType: MealType;
  meals: MealWithItems[];
  onAddPress: (type: MealType) => void;
  onMealPress?: (meal: MealWithItems) => void;
}

export function MealCard({ mealType, meals, onAddPress, onMealPress }: MealCardProps) {
  const filteredMeals = meals.filter((m) => m.meal_type === mealType);
  const hasMeals = filteredMeals.length > 0;

  const totalCalories = filteredMeals.reduce((acc, m) => acc + m.total_calories, 0);
  const totalProtein = filteredMeals.reduce((acc, m) => acc + m.total_protein, 0);
  const totalCarbs = filteredMeals.reduce((acc, m) => acc + m.total_carbs, 0);
  const totalFat = filteredMeals.reduce((acc, m) => acc + m.total_fat, 0);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrapper}>
          <Text style={styles.title}>{MEAL_TITLES[mealType]}</Text>
          {hasMeals && (
            <Text style={styles.macroSummary}>
              {Math.round(totalProtein)}g P  •  {Math.round(totalCarbs)}g C  •  {Math.round(totalFat)}g G
            </Text>
          )}
        </View>

        {hasMeals ? (
          <View style={styles.calPill}>
            <Text style={styles.calText}>{Math.round(totalCalories)} kcal</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => onAddPress(mealType)}
            activeOpacity={0.7}
          >
            <Text style={styles.addBtnText}>+ Registrar</Text>
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
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.food_name}
                  </Text>
                  <View style={styles.itemMetrics}>
                    <Text style={styles.itemGrams}>{Math.round(item.grams)}g</Text>
                    <Text style={styles.itemCalories}>{Math.round(item.calories)} kcal</Text>
                  </View>
                </View>
              ))}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.addMoreRow}
            onPress={() => onAddPress(mealType)}
            activeOpacity={0.6}
          >
            <Text style={styles.addMoreText}>+ Añadir alimento</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  macroSummary: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "500",
  },
  calPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  calText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  addBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  itemsList: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
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
  itemName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
  },
  itemMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemGrams: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
  },
  itemCalories: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    width: 65,
    textAlign: "right",
  },
  addMoreRow: {
    paddingTop: 10,
    alignItems: "flex-start",
  },
  addMoreText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: "700",
  },
});
