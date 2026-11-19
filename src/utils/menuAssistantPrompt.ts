import { MealType } from "@/types/meal";

export type MenuVenueType = "casino" | "restaurante" | "cafe" | "rapida" | "sushi";

export interface MenuVenueOption {
  id: MenuVenueType;
  label: string;
  emoji: string;
  sampleTitle: string;
  sampleMenu: string;
}

export const MENU_VENUES: MenuVenueOption[] = [
  {
    id: "casino",
    label: "Casino / Colación",
    emoji: "🍱",
    sampleTitle: "Menú típico de casino",
    sampleMenu:
      "1) Pollo arvejado con arroz blanco y ensalada de tomate\n2) Lasaña boloñesa con pan amasado\n3) Merluza frita con puré de papas\n4) Ensalada César con pollo a la plancha",
  },
  {
    id: "restaurante",
    label: "Restaurante chileno",
    emoji: "🍽️",
    sampleTitle: "Carta clásica chilena",
    sampleMenu:
      "1) Pastel de choclo\n2) Reineta a la plancha con papas salteadas y ensalada chilena\n3) Lomo saltado con arroz y papas fritas\n4) Cazuela de ave",
  },
  {
    id: "cafe",
    label: "Café / Sánguches",
    emoji: "🥪",
    sampleTitle: "Carta de cafetería",
    sampleMenu:
      "1) Barros Luco en frica\n2) Sánguche de ave palta en pan integral\n3) Medialuna con jamón y queso + cappuccino\n4) Bowl de yogur con granola y fruta",
  },
  {
    id: "rapida",
    label: "Comida rápida",
    emoji: "🍔",
    sampleTitle: "Opciones al paso",
    sampleMenu:
      "1) Hamburguesa doble con queso y papas medianas\n2) Wrap de pollo grillado con vegetales\n3) Completo italiano\n4) Tacos de pollo sin crema",
  },
  {
    id: "sushi",
    label: "Sushi / Nikkei",
    emoji: "🍣",
    sampleTitle: "Carta de sushi",
    sampleMenu:
      "1) Roll tempura queso crema y pollo (10 piezas)\n2) Ceviche mixto con camote y choclo\n3) Gohan de salmón fresco con palta y pepino\n4) Hosomaki de salmón (8 piezas)",
  },
];

const MEAL_LABELS: Record<MealType, string> = {
  desayuno: "desayuno",
  almuerzo: "almuerzo",
  cena: "once / cena",
  snack: "colación",
};

export function buildMenuAssistantPrompt(params: {
  venue: MenuVenueType;
  mealType: MealType;
  menuText: string;
  remainingCalories: number;
  remainingProtein: number;
  remainingCarbs: number;
  remainingFat: number;
  preferHighProtein?: boolean;
  preferLight?: boolean;
}): string {
  const venueLabel =
    MENU_VENUES.find((v) => v.id === params.venue)?.label || "Restaurante / Casino";
  const mealLabel = MEAL_LABELS[params.mealType] || "almuerzo";
  const cleanedMenu = params.menuText.trim().slice(0, 1100);
  const prefs: string[] = [];
  if (params.preferHighProtein) prefs.push("priorizar proteína");
  if (params.preferLight) prefs.push("opción más liviana y menos calorías");

  return [
    `Ayúdame a elegir qué pedir para mi ${mealLabel} en ${venueLabel}.`,
    `Presupuesto restante hoy: ${Math.max(0, Math.round(params.remainingCalories))} kcal, ${Math.max(0, Math.round(params.remainingProtein))} g proteína, ${Math.max(0, Math.round(params.remainingCarbs))} g carbos, ${Math.max(0, Math.round(params.remainingFat))} g grasas.`,
    prefs.length ? `Preferencia actual: ${prefs.join(" y ")}.` : "",
    `Opciones de la carta o pizarra:\n${cleanedMenu}`,
    `Elige las 2 mejores opciones de ESA lista, ordenadas de mejor a segunda, indica por qué calzan con mis macros y da 1 ajuste práctico al pedir (ej. salsa aparte o cambiar acompañamiento). Incluye al final la tarjeta <!--coach-action:...--> para la opción #1 con mealType "${params.mealType}".`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 1950);
}
