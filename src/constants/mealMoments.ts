import { Sunrise, Sun, Moon, Apple, LucideIcon } from "lucide-react-native";
import { MealType } from "@/types/meal";
import { colors } from "@/constants/colors";

export interface MealMomentMeta {
  type: MealType;
  label: string;
  shortLabel: string;
  Icon: LucideIcon;
  color: string;
  bg: string;
}

export const MEAL_MOMENT_LIST: MealMomentMeta[] = [
  {
    type: "desayuno",
    label: "Desayuno",
    shortLabel: "Desayuno",
    Icon: Sunrise,
    color: colors.carbs,
    bg: colors.carbsLight,
  },
  {
    type: "almuerzo",
    label: "Almuerzo",
    shortLabel: "Almuerzo",
    Icon: Sun,
    color: colors.primary,
    bg: colors.primaryLight,
  },
  {
    type: "cena",
    label: "Once / Cena",
    shortLabel: "Once/Cena",
    Icon: Moon,
    color: colors.protein,
    bg: colors.proteinLight,
  },
  {
    type: "snack",
    label: "Colación",
    shortLabel: "Colación",
    Icon: Apple,
    color: colors.fat,
    bg: colors.fatLight,
  },
];

export const MEAL_MOMENT_MAP: Record<MealType, MealMomentMeta> = {
  desayuno: MEAL_MOMENT_LIST[0],
  almuerzo: MEAL_MOMENT_LIST[1],
  cena: MEAL_MOMENT_LIST[2],
  snack: MEAL_MOMENT_LIST[3],
};

export function guessChileanMealTypeByHour(date: Date = new Date()): MealType {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "desayuno";
  if (hour >= 11 && hour < 16) return "almuerzo";
  if (hour >= 16 && hour < 19) return "snack";
  return "cena";
}
