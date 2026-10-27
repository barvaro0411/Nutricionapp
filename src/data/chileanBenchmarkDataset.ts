import { validateMacroCalorieCoherence } from "@/utils/nutritionCalculator";
import { ChileanCatalogSourceId, CHILEAN_CATALOG_METADATA } from "@/constants/chileanPresets";

export type BenchmarkCategory =
  | "desayuno_once"
  | "sandwiches_completos"
  | "platos_de_fondo"
  | "empanadas_masas"
  | "acompanamientos_ensaladas"
  | "postres_bebidas";

export type RecommendedAiProvider =
  | "catalogo_chileno"
  | "gemini-3.5-flash-lite"
  | "qwen/qwen3.8-27b"
  | "usda_hybrid";

export interface WeighedIngredient {
  name: string;
  grams: number;
  calories: number;
}

export interface ChileanBenchmarkDish {
  id: string;
  name: string;
  aliases: string[];
  category: BenchmarkCategory;
  portionGrams: number;
  unit: "g" | "ml";
  ingredientsBreakdown: WeighedIngredient[];
  referenceMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  source: ChileanCatalogSourceId;
  recommendedProvider: RecommendedAiProvider;
  providerRationale: string;
}

export interface AppPredictionSample {
  dishId: string;
  appName: "Nutricionapp" | "NutrIA" | "Fitia";
  predictedMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  correctionTouches: number;
  latencyMs: number;
  providerUsed?: string;
}

export interface DishEvaluationResult {
  dishId: string;
  dishName: string;
  category: BenchmarkCategory;
  referenceCalories: number;
  predictedCalories: number;
  absoluteCaloricErrorKcal: number;
  caloricErrorPct: number;
  signedCaloricErrorPct: number;
  within15Pct: boolean;
  atwaterCoherent: boolean;
  correctionTouches: number;
  latencyMs: number;
}

export interface BenchmarkSummaryMetrics {
  appName: string;
  totalDishes: number;
  medianCaloricErrorPct: number;
  meanCaloricErrorPct: number;
  pctWithin15Pct: number;
  pctAtwaterCoherent: number;
  meanCorrectionTouches: number;
  medianLatencyMs: number;
  byCategory: Record<
    BenchmarkCategory,
    {
      count: number;
      medianErrorPct: number;
      pctWithin15Pct: number;
    }
  >;
}

/**
 * Dataset de referencia de 45 platos chilenos pesados en balanza de cocina,
 * con valores nutricionales calculados según INTA (Universidad de Chile) y MINSAL.
 * Todos los platos cumplen coherencia fisiológica Atwater (4×P + 4×C + 9×G).
 */
export const CHILEAN_BENCHMARK_DISHES: ChileanBenchmarkDish[] = [
  // === 1. DESAYUNO Y ONCE (10 platos) ===
  {
    id: "cl-01",
    name: "Media marraqueta con palta Hass",
    aliases: ["pan con palta", "marraqueta con palta", "pan batido con palta"],
    category: "desayuno_once",
    portionGrams: 140,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Media marraqueta (2 dientes)", grams: 90, calories: 240 },
      { name: "Palta Hass molida", grams: 50, calories: 80 },
    ],
    referenceMacros: { calories: 320, protein: 8.5, carbs: 49.0, fat: 10.0 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Plato chileno estandarizado con relación fija pan/palta en INTA.",
  },
  {
    id: "cl-02",
    name: "Marraqueta entera con huevos revueltos",
    aliases: ["pan con huevo", "marraqueta con huevo revuelto"],
    category: "desayuno_once",
    portionGrams: 200,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Marraqueta entera", grams: 100, calories: 267 },
      { name: "2 huevos revueltos sin aceite extra", grams: 100, calories: 149 },
    ],
    referenceMacros: { calories: 416, protein: 21.0, carbs: 56.0, fat: 12.0 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "gemini-3.5-flash-lite",
    providerRationale: "Visión distingue si es media o marraqueta entera y número de huevos.",
  },
  {
    id: "cl-03",
    name: "Hallulla tostada con mantequilla",
    aliases: ["hallulla con mantequilla", "pan hallulla con mantequilla"],
    category: "desayuno_once",
    portionGrams: 90,
    unit: "g",
    ingredientsBreakdown: [
      { name: "1 hallulla mediana", grams: 80, calories: 248 },
      { name: "Mantequilla con sal", grams: 10, calories: 72 },
    ],
    referenceMacros: { calories: 320, protein: 6.5, carbs: 43.0, fat: 13.6 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "La hallulla chilena tiene materia grasa propia distinta al pan blanco USDA.",
  },
  {
    id: "cl-04",
    name: "Hallulla con queso mantecoso y jamón de pavo",
    aliases: ["hallulla aliñada", "pan con jamon y queso", "hallulla jamon queso"],
    category: "desayuno_once",
    portionGrams: 130,
    unit: "g",
    ingredientsBreakdown: [
      { name: "1 hallulla mediana", grams: 80, calories: 248 },
      { name: "Queso mantecoso chileno (1 lámina)", grams: 25, calories: 90 },
      { name: "Jamón de pavo cocido (1 lámina)", grams: 25, calories: 28 },
    ],
    referenceMacros: { calories: 366, protein: 16.5, carbs: 44.0, fat: 13.8 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "gemini-3.5-flash-lite",
    providerRationale: "Detecta capas de fiambre y queso derretido dentro de la hallulla.",
  },
  {
    id: "cl-05",
    name: "Pan amasado casero con pebre",
    aliases: ["pan amasado con pebre", "pan amasado"],
    category: "desayuno_once",
    portionGrams: 130,
    unit: "g",
    ingredientsBreakdown: [
      { name: "1 pan amasado tradicional", grams: 100, calories: 334 },
      { name: "Pebre chileno (tomate, cebolla, cilantro, aceite)", grams: 30, calories: 25 },
    ],
    referenceMacros: { calories: 359, protein: 8.5, carbs: 54.0, fat: 12.1 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Preparación típica chilena con manteca vegetal/animal no indexada en USDA.",
  },
  {
    id: "cl-06",
    name: "Dobladita chilena recién horneada",
    aliases: ["dobladita", "pan dobladita"],
    category: "desayuno_once",
    portionGrams: 95,
    unit: "g",
    ingredientsBreakdown: [
      { name: "1 dobladita triangular de panadería", grams: 95, calories: 342 },
    ],
    referenceMacros: { calories: 342, protein: 7.4, carbs: 47.0, fat: 13.8 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Masa hojaldrada con manteca típica de panadería chilena.",
  },
  {
    id: "cl-07",
    name: "Paila de 2 huevos fritos en aceite",
    aliases: ["paila de huevos", "huevos fritos en paila"],
    category: "desayuno_once",
    portionGrams: 115,
    unit: "g",
    ingredientsBreakdown: [
      { name: "2 huevos medianos", grams: 105, calories: 150 },
      { name: "Aceite absorbido en cocción", grams: 10, calories: 88 },
    ],
    referenceMacros: { calories: 238, protein: 13.5, carbs: 1.0, fat: 20.0 },
    source: "MINSAL_2010",
    recommendedProvider: "usda_hybrid",
    providerRationale: "USDA + ajuste de cocción frita estima con alta fidelidad la grasa absorbida.",
  },
  {
    id: "cl-08",
    name: "Tazón de avena cocida con leche semidescremada y plátano",
    aliases: ["avena con leche y platano", "porridge chileno"],
    category: "desayuno_once",
    portionGrams: 340,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Avena tradicional", grams: 40, calories: 152 },
      { name: "Leche semidescremada", grams: 200, calories: 96 },
      { name: "Plátano maduro en rodajas", grams: 100, calories: 89 },
    ],
    referenceMacros: { calories: 337, protein: 13.2, carbs: 56.0, fat: 6.7 },
    source: "MINSAL_2010",
    recommendedProvider: "usda_hybrid",
    providerRationale: "Ingredientes simples donde USDA distingue plátano dessert banana de plantain.",
  },
  {
    id: "cl-09",
    name: "Tostadas de pan molde integral con quesillo y mermelada sin azúcar",
    aliases: ["pan integral con quesillo", "tostadas con quesillo"],
    category: "desayuno_once",
    portionGrams: 135,
    unit: "g",
    ingredientsBreakdown: [
      { name: "2 rebanadas pan molde integral", grams: 60, calories: 150 },
      { name: "Quesillo fresco chileno", grams: 60, calories: 78 },
      { name: "Mermelada sin azúcar", grams: 15, calories: 18 },
    ],
    referenceMacros: { calories: 246, protein: 14.5, carbs: 32.0, fat: 6.6 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "El quesillo chileno tiene menos grasa que el queso fresco genérico latinoamericano.",
  },
  {
    id: "cl-10",
    name: "Once de té con leche y media marraqueta con jamón y palta",
    aliases: ["once chilena", "te con leche y pan con palta"],
    category: "desayuno_once",
    portionGrams: 390,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Taza de té con leche semidescremada", grams: 230, calories: 72 },
      { name: "Media marraqueta", grams: 90, calories: 240 },
      { name: "Palta Hass", grams: 40, calories: 64 },
      { name: "Jamón de pavo", grams: 30, calories: 34 },
    ],
    referenceMacros: { calories: 410, protein: 18.0, carbs: 55.0, fat: 13.1 },
    source: "RECETARIO_ESTANDAR_CL",
    recommendedProvider: "gemini-3.5-flash-lite",
    providerRationale: "Detecta múltiples ítems en bandeja (taza + sándwich abierto) en una sola foto.",
  },

  // === 2. SÁNDWICHES Y COMPLETOS (8 platos) ===
  {
    id: "cl-11",
    name: "Completo italiano tradicional",
    aliases: ["completo italiano", "italiano", "hot dog chileno"],
    category: "sandwiches_completos",
    portionGrams: 220,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Pan de completo (lengua)", grams: 80, calories: 216 },
      { name: "Vienesa tradicional cocida", grams: 50, calories: 145 },
      { name: "Palta Hass molida", grams: 45, calories: 72 },
      { name: "Tomate picado en cubos", grams: 30, calories: 6 },
      { name: "Mayonesa tradicional", grams: 15, calories: 23 },
    ],
    referenceMacros: { calories: 462, protein: 14.3, carbs: 46.2, fat: 24.4 },
    source: "RECETARIO_ESTANDAR_CL",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Plato insignia chileno; las IAs globales suelen omitir la capa gruesa de palta y mayo.",
  },
  {
    id: "cl-12",
    name: "Completo dinámico completo",
    aliases: ["completo dinamico", "dinamico"],
    category: "sandwiches_completos",
    portionGrams: 250,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Pan de completo", grams: 80, calories: 216 },
      { name: "Vienesa", grams: 50, calories: 145 },
      { name: "Palta Hass", grams: 45, calories: 72 },
      { name: "Tomate, chucrut y salsa americana", grams: 55, calories: 22 },
      { name: "Mayonesa", grams: 20, calories: 95 },
    ],
    referenceMacros: { calories: 550, protein: 16.0, carbs: 53.8, fat: 30.0 },
    source: "RECETARIO_ESTANDAR_CL",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Reconoce la combinación chilena de salsa americana + chucrut + palta + mayo.",
  },
  {
    id: "cl-13",
    name: "As italiano (carne de vacuno a la plancha)",
    aliases: ["as italiano", "sandwich as"],
    category: "sandwiches_completos",
    portionGrams: 250,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Pan de completo", grams: 80, calories: 216 },
      { name: "Posta de vacuno picada a la plancha", grams: 85, calories: 165 },
      { name: "Palta Hass", grams: 45, calories: 72 },
      { name: "Tomate y mayonesa", grams: 40, calories: 110 },
    ],
    referenceMacros: { calories: 563, protein: 23.8, carbs: 50.0, fat: 29.8 },
    source: "RECETARIO_ESTANDAR_CL",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Mayor aporte proteico que el completo de vienesa gracias al vacuno picado.",
  },
  {
    id: "cl-14",
    name: "Churrasco italiano en pan frica",
    aliases: ["churrasco italiano", "sandwich churrasco"],
    category: "sandwiches_completos",
    portionGrams: 260,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Pan frica grande", grams: 90, calories: 245 },
      { name: "Bistec de asiento/posta a la plancha", grams: 90, calories: 170 },
      { name: "Palta Hass y tomate", grams: 65, calories: 78 },
      { name: "Mayonesa", grams: 15, calories: 66 },
    ],
    referenceMacros: { calories: 559, protein: 29.9, carbs: 46.8, fat: 28.0 },
    source: "RECETARIO_ESTANDAR_CL",
    recommendedProvider: "gemini-3.5-flash-lite",
    providerRationale: "Distingue visualmente láminas de churrasco vs hamburguesa molida.",
  },
  {
    id: "cl-15",
    name: "Barros Luco tradicional",
    aliases: ["barros luco", "sandwich barros luco"],
    category: "sandwiches_completos",
    portionGrams: 230,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Pan marraqueta o frica", grams: 90, calories: 243 },
      { name: "Vacuno a la plancha", grams: 90, calories: 175 },
      { name: "Queso mantecoso fundido", grams: 50, calories: 168 },
    ],
    referenceMacros: { calories: 586, protein: 33.4, carbs: 43.7, fat: 30.8 },
    source: "RECETARIO_ESTANDAR_CL",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Clásico chileno carne + queso fundido con densidad calórica estandarizada.",
  },
  {
    id: "cl-16",
    name: "Chacarero chileno (vacuno, porotos verdes, tomate y ají)",
    aliases: ["chacarero", "sandwich chacarero"],
    category: "sandwiches_completos",
    portionGrams: 270,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Pan frica", grams: 90, calories: 245 },
      { name: "Churrasco de posta", grams: 90, calories: 170 },
      { name: "Porotos verdes cocidos y tomate", grams: 80, calories: 28 },
      { name: "Toque de mayonesa y ají verde", grams: 10, calories: 45 },
    ],
    referenceMacros: { calories: 488, protein: 30.5, carbs: 50.0, fat: 18.4 },
    source: "RECETARIO_ESTANDAR_CL",
    recommendedProvider: "gemini-3.5-flash-lite",
    providerRationale: "Los porotos verdes visibles en el sándwich permiten identificación visual inequívoca.",
  },
  {
    id: "cl-17",
    name: "Ave palta mayo en pan molde",
    aliases: ["ave palta", "ave palta mayo", "sandwich ave palta"],
    category: "sandwiches_completos",
    portionGrams: 210,
    unit: "g",
    ingredientsBreakdown: [
      { name: "2 rebanadas pan molde blanco grande", grams: 70, calories: 185 },
      { name: "Pechuga de pollo cocida desmenuzada", grams: 80, calories: 120 },
      { name: "Palta Hass y mayonesa", grams: 60, calories: 142 },
    ],
    referenceMacros: { calories: 447, protein: 28.0, carbs: 36.0, fat: 21.2 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Miga/molde con pollo desmenuzado y palta muy común en cafeterías chilenas.",
  },
  {
    id: "cl-18",
    name: "Lomo kassler con tomate y mayonesa en marraqueta",
    aliases: ["lomito italiano", "sandwich de lomito", "lomo kassler"],
    category: "sandwiches_completos",
    portionGrams: 240,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Marraqueta", grams: 95, calories: 254 },
      { name: "Lomito de cerdo cocido/ahumado", grams: 85, calories: 162 },
      { name: "Palta, tomate y mayonesa", grams: 60, calories: 112 },
    ],
    referenceMacros: { calories: 528, protein: 26.5, carbs: 49.0, fat: 25.1 },
    source: "RECETARIO_ESTANDAR_CL",
    recommendedProvider: "qwen/qwen3.8-27b",
    providerRationale: "Buen desempeño diferenciando cortes de cerdo en sándwich.",
  },

  // === 3. PLATOS DE FONDO TRADICIONALES (14 platos) ===
  {
    id: "cl-19",
    name: "Cazuela de vacuno tradicional",
    aliases: ["cazuela de vacuno", "cazuela de carne", "cazuela"],
    category: "platos_de_fondo",
    portionGrams: 400,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Tapapecho / asado de tira magro", grams: 90, calories: 135 },
      { name: "1 papa mediana, trozo de zapallo y choclo", grams: 160, calories: 130 },
      { name: "Caldo con arroz y porotos verdes", grams: 150, calories: 35 },
    ],
    referenceMacros: { calories: 300, protein: 26.0, carbs: 28.0, fat: 9.3 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Gran parte del peso es caldo; las IAs sin contexto chileno sobreestiman calorías.",
  },
  {
    id: "cl-20",
    name: "Cazuela de ave de campo",
    aliases: ["cazuela de pollo", "cazuela de ave"],
    category: "platos_de_fondo",
    portionGrams: 400,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Trutro de pollo cocido sin piel", grams: 90, calories: 120 },
      { name: "Papa, zapallo camote y choclo", grams: 160, calories: 125 },
      { name: "Caldo con fideos cabello de ángel", grams: 150, calories: 27 },
    ],
    referenceMacros: { calories: 272, protein: 24.0, carbs: 26.0, fat: 8.0 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Densidad calórica baja (68 kcal/100g) por proporción de caldo e ingredientes cocidos.",
  },
  {
    id: "cl-21",
    name: "Pastel de choclo en paila de greda",
    aliases: ["pastel de choclo", "paila de pastel de choclo"],
    category: "platos_de_fondo",
    portionGrams: 350,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Pastelera de choclo con leche y albahaca", grams: 180, calories: 230 },
      { name: "Pino de carne molida y cebolla", grams: 100, calories: 220 },
      { name: "Pollo cocido, medio huevo duro y aceituna", grams: 70, calories: 163 },
    ],
    referenceMacros: { calories: 613, protein: 28.0, carbs: 70.0, fat: 24.5 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "La cubierta dorada oculta el pino y el pollo interior; el catálogo chileno conoce la receta completa.",
  },
  {
    id: "cl-22",
    name: "Charquicán con huevo frito montado",
    aliases: ["charquican", "charquican con huevo"],
    category: "platos_de_fondo",
    portionGrams: 320,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Guiso de zapallo, papa, acelga y carne picada", grams: 270, calories: 332 },
      { name: "1 huevo frito montado", grams: 50, calories: 100 },
    ],
    referenceMacros: { calories: 432, protein: 19.8, carbs: 48.0, fat: 17.8 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Puré rústico de zapallo y papa exclusivo de la cocina chilena.",
  },
  {
    id: "cl-23",
    name: "Porotos con riendas y longaniza",
    aliases: ["porotos con riendas", "porotos con tallarines"],
    category: "platos_de_fondo",
    portionGrams: 350,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Porotos tórtola cocidos con zapallo", grams: 220, calories: 260 },
      { name: "Tallarines cocidos", grams: 80, calories: 112 },
      { name: "Rodajas de longaniza chilena", grams: 50, calories: 118 },
    ],
    referenceMacros: { calories: 490, protein: 24.5, carbs: 77.0, fat: 9.3 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Combinación legumbre + cereal + embutido tradicional de invierno.",
  },
  {
    id: "cl-24",
    name: "Porotos granados con mazamorra",
    aliases: ["porotos granados", "porotos con mazamorra"],
    category: "platos_de_fondo",
    portionGrams: 350,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Porotos granados frescos y zapallo", grams: 230, calories: 275 },
      { name: "Choclo molido (mazamorra) y albahaca", grams: 120, calories: 163 },
    ],
    referenceMacros: { calories: 438, protein: 19.3, carbs: 70.0, fat: 8.9 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Sin carne ni embutidos; perfil alto en carbohidratos complejos y fibra.",
  },
  {
    id: "cl-25",
    name: "Lentejas guisadas con arroz y longaniza",
    aliases: ["lentejas con arroz", "guiso de lentejas"],
    category: "platos_de_fondo",
    portionGrams: 350,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Lentejas cocidas con sofrito", grams: 220, calories: 255 },
      { name: "Arroz blanco cocido", grams: 80, calories: 104 },
      { name: "Longaniza en rodajas", grams: 50, calories: 124 },
    ],
    referenceMacros: { calories: 483, protein: 27.3, carbs: 63.0, fat: 13.5 },
    source: "MINSAL_2010",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Plato de legumbres de consumo semanal estándar en hogares chilenos.",
  },
  {
    id: "cl-26",
    name: "Humita en hoja con ensalada chilena",
    aliases: ["humita", "humita con tomate", "humita en chala"],
    category: "platos_de_fondo",
    portionGrams: 360,
    unit: "g",
    ingredientsBreakdown: [
      { name: "1 humita grande en chala", grams: 240, calories: 348 },
      { name: "Ensalada de tomate y cebolla con aceite", grams: 120, calories: 54 },
    ],
    referenceMacros: { calories: 402, protein: 10.8, carbs: 64.8, fat: 11.1 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "gemini-3.5-flash-lite",
    providerRationale: "Identifica la humita y el acompañamiento de tomate separado en el plato.",
  },
  {
    id: "cl-27",
    name: "Carbonada chilena de vacuno",
    aliases: ["carbonada", "sopa de carbonada"],
    category: "platos_de_fondo",
    portionGrams: 350,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Posta picada en cubitos", grams: 70, calories: 110 },
      { name: "Papa, zapallo, zanahoria, arvejas y choclo en caldo", grams: 280, calories: 156 },
    ],
    referenceMacros: { calories: 266, protein: 19.3, carbs: 29.8, fat: 7.7 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Guiso caldoso liviano donde el peso total incluye caldo vegetal.",
  },
  {
    id: "cl-28",
    name: "Pantrucas en caldo con vacuno",
    aliases: ["pantrucas", "pancutras"],
    category: "platos_de_fondo",
    portionGrams: 350,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Masitas de harina cocidas en caldo", grams: 160, calories: 215 },
      { name: "Papa, vacuno y huevo batido en caldo", grams: 190, calories: 128 },
    ],
    referenceMacros: { calories: 343, protein: 18.2, carbs: 50.8, fat: 7.4 },
    source: "MINSAL_2010",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Plato tradicional chileno que no existe en bases de datos anglosajonas.",
  },
  {
    id: "cl-29",
    name: "Paila marina tradicional",
    aliases: ["paila marina", "caldo de mariscos"],
    category: "platos_de_fondo",
    portionGrams: 380,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Choritos, almejas, machas y trozo de congrio", grams: 200, calories: 225 },
      { name: "Caldo de cocción al vino blanco y sofrito", grams: 180, calories: 71 },
    ],
    referenceMacros: { calories: 296, protein: 39.9, carbs: 13.3, fat: 9.2 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Altísima densidad proteica y bajo aporte calórico por volumen.",
  },
  {
    id: "cl-30",
    name: "Merluza frita en batido con papas cocidas",
    aliases: ["pescado frito con papas", "merluza frita"],
    category: "platos_de_fondo",
    portionGrams: 340,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Filete de merluza frita en batido", grams: 160, calories: 336 },
      { name: "Papas cocidas con perejil", grams: 180, calories: 157 },
    ],
    referenceMacros: { calories: 493, protein: 31.6, carbs: 50.2, fat: 18.4 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "gemini-3.5-flash-lite",
    providerRationale: "Reconoce el rebozado dorado del pescado y separa las papas cocidas.",
  },
  {
    id: "cl-31",
    name: "Bistec a lo pobre (vacuno, papas fritas, cebolla y 2 huevos)",
    aliases: ["bistec a lo pobre", "lomo a lo pobre"],
    category: "platos_de_fondo",
    portionGrams: 480,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Lomo liso a la plancha", grams: 180, calories: 360 },
      { name: "Papas fritas caseras", grams: 160, calories: 499 },
      { name: "2 huevos fritos y cebolla caramelizada", grams: 140, calories: 245 },
    ],
    referenceMacros: { calories: 1104, protein: 61.5, carbs: 72.0, fat: 63.3 },
    source: "RECETARIO_ESTANDAR_CL",
    recommendedProvider: "gemini-3.5-flash-lite",
    providerRationale: "Desglosa con precisión los 4 componentes visibles en el plato.",
  },
  {
    id: "cl-32",
    name: "Pechuga de pollo a la plancha con arroz graneado",
    aliases: ["pollo con arroz", "pechuga con arroz"],
    category: "platos_de_fondo",
    portionGrams: 330,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Pechuga de pollo a la plancha", grams: 150, calories: 248 },
      { name: "Arroz blanco graneado cocido", grams: 180, calories: 234 },
    ],
    referenceMacros: { calories: 482, protein: 51.3, carbs: 50.4, fat: 8.4 },
    source: "MINSAL_2010",
    recommendedProvider: "usda_hybrid",
    providerRationale: "Alimentos base donde USDA + ajuste de cocción tienen exactitud de laboratorio.",
  },

  // === 4. EMPANADAS, MASAS Y PICOTEO (5 platos) ===
  {
    id: "cl-33",
    name: "Empanada de pino al horno tradicional",
    aliases: ["empanada de pino", "empanada de horno"],
    category: "empanadas_masas",
    portionGrams: 200,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Masa horneada tradicional", grams: 95, calories: 295 },
      { name: "Pino de vacuno, cebolla, cuarto de huevo y aceituna", grams: 105, calories: 205 },
    ],
    referenceMacros: { calories: 500, protein: 18.0, carbs: 52.0, fat: 24.4 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Referencia chilena oficial para una unidad estándar de 200g.",
  },
  {
    id: "cl-34",
    name: "Empanada de queso frita",
    aliases: ["empanada de queso", "empanada frita de queso"],
    category: "empanadas_masas",
    portionGrams: 140,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Masa frita", grams: 85, calories: 280 },
      { name: "Queso mantecoso derretido", grams: 55, calories: 154 },
    ],
    referenceMacros: { calories: 434, protein: 14.0, carbs: 39.2, fat: 24.6 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Diferencia claramente masa frita de masa horneada y peso unitario menor (140g).",
  },
  {
    id: "cl-35",
    name: "Chorrillana individual",
    aliases: ["chorrillana", "plato de chorrillana"],
    category: "empanadas_masas",
    portionGrams: 320,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Papas fritas", grams: 150, calories: 468 },
      { name: "Vacuno salteado y cebolla", grams: 120, calories: 194 },
      { name: "1 huevo frito", grams: 50, calories: 90 },
    ],
    referenceMacros: { calories: 752, protein: 31.4, carbs: 67.2, fat: 39.7 },
    source: "RECETARIO_ESTANDAR_CL",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Plato compartido típico de Valparaíso con mezcla densa de ingredientes.",
  },
  {
    id: "cl-36",
    name: "2 Sopaipillas tradicionales con pebre",
    aliases: ["sopaipillas", "sopaipillas con pebre"],
    category: "empanadas_masas",
    portionGrams: 140,
    unit: "g",
    ingredientsBreakdown: [
      { name: "2 sopaipillas con zapallo fritas", grams: 110, calories: 361 },
      { name: "Pebre cuchareado", grams: 30, calories: 22 },
    ],
    referenceMacros: { calories: 383, protein: 7.2, carbs: 50.0, fat: 17.1 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Masa chilena con zapallo cuyo peso por unidad ronda los 55g.",
  },
  {
    id: "cl-37",
    name: "Sopaipillas pasadas en chancaca (2 unidades)",
    aliases: ["sopaipillas pasadas", "sopaipilla pasada"],
    category: "empanadas_masas",
    portionGrams: 180,
    unit: "g",
    ingredientsBreakdown: [
      { name: "2 sopaipillas fritas", grams: 110, calories: 361 },
      { name: "Salsa de chancaca con canela", grams: 70, calories: 98 },
    ],
    referenceMacros: { calories: 459, protein: 6.8, carbs: 74.7, fat: 14.8 },
    source: "RECETARIO_ESTANDAR_CL",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Considera los carbohidratos simples del almíbar de chancaca.",
  },

  // === 5. ACOMPAÑAMIENTOS Y ENSALADAS (4 platos) ===
  {
    id: "cl-38",
    name: "Ensalada a la chilena (tomate, cebolla pluma y cilantro)",
    aliases: ["ensalada chilena", "tomate con cebolla"],
    category: "acompanamientos_ensaladas",
    portionGrams: 200,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Tomate maduro en gajos", grams: 150, calories: 27 },
      { name: "Cebolla pluma amortiguada", grams: 45, calories: 18 },
      { name: "Aceite vegetal de aliño", grams: 5, calories: 45 },
    ],
    referenceMacros: { calories: 90, protein: 2.0, carbs: 10.0, fat: 4.7 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Incluye el aceite de aliño habitual sin sobreestimar calorías.",
  },
  {
    id: "cl-39",
    name: "Puré de papas casero con leche y mantequilla",
    aliases: ["pure de papas", "pure casero"],
    category: "acompanamientos_ensaladas",
    portionGrams: 200,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Papa cocida molida", grams: 160, calories: 139 },
      { name: "Leche entera y mantequilla", grams: 40, calories: 81 },
    ],
    referenceMacros: { calories: 220, protein: 4.0, carbs: 32.0, fat: 8.4 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Refleja la preparación casera chilena con mantequilla y leche.",
  },
  {
    id: "cl-40",
    name: "Tallarines con salsa boloñesa casera",
    aliases: ["tallarines con salsa", "fideos con salsa de carne"],
    category: "acompanamientos_ensaladas",
    portionGrams: 320,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Tallarines cocidos al dente", grams: 220, calories: 308 },
      { name: "Salsa de tomate con carne molida", grams: 100, calories: 118 },
    ],
    referenceMacros: { calories: 426, protein: 18.5, carbs: 69.0, fat: 8.4 },
    source: "MINSAL_2010",
    recommendedProvider: "usda_hybrid",
    providerRationale: "El enriquecimiento USDA separa la pasta cocida de la salsa con carne.",
  },
  {
    id: "cl-41",
    name: "Papas mayo caseras",
    aliases: ["papas mayo", "ensalada de papas con mayonesa"],
    category: "acompanamientos_ensaladas",
    portionGrams: 200,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Papas cocidas en cubos", grams: 175, calories: 152 },
      { name: "Mayonesa tradicional", grams: 25, calories: 158 },
    ],
    referenceMacros: { calories: 310, protein: 3.8, carbs: 31.5, fat: 18.8 },
    source: "RECETARIO_ESTANDAR_CL",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Guarnición típica de asados chilenos donde la mayonesa duplica las kcal de la papa.",
  },

  // === 6. POSTRES Y BEBIDAS TÍPICAS (4 platos) ===
  {
    id: "cl-42",
    name: "Vaso de mote con huesillo tradicional",
    aliases: ["mote con huesillo", "vaso de mote con huesillo"],
    category: "postres_bebidas",
    portionGrams: 300,
    unit: "ml",
    ingredientsBreakdown: [
      { name: "Mote de trigo cocido", grams: 80, calories: 105 },
      { name: "1 huesillo rehidratado", grams: 50, calories: 95 },
      { name: "Jugo acaramelado de cocción", grams: 170, calories: 124 },
    ],
    referenceMacros: { calories: 324, protein: 5.4, carbs: 73.5, fat: 0.9 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Bebida/postre emblema de Chile con aporte casi exclusivo de carbohidratos.",
  },
  {
    id: "cl-43",
    name: "Calzones rotos con azúcar flor (2 unidades)",
    aliases: ["calzones rotos", "calzon roto"],
    category: "postres_bebidas",
    portionGrams: 100,
    unit: "g",
    ingredientsBreakdown: [
      { name: "2 calzones rotos fritos espolvoreados con azúcar flor", grams: 100, calories: 375 },
    ],
    referenceMacros: { calories: 375, protein: 6.5, carbs: 51.0, fat: 16.1 },
    source: "MINSAL_2010",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Pastelería de invierno chilena con masa frita dulce.",
  },
  {
    id: "cl-44",
    name: "Leche con plátano licuada sin azúcar añadida",
    aliases: ["leche con platano", "batido de leche con platano"],
    category: "postres_bebidas",
    portionGrams: 300,
    unit: "ml",
    ingredientsBreakdown: [
      { name: "Leche semidescremada", grams: 220, calories: 105 },
      { name: "Plátano maduro", grams: 80, calories: 117 },
    ],
    referenceMacros: { calories: 222, protein: 8.4, carbs: 36.0, fat: 4.9 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Clásico chileno; expresado en ml con densidad verificada.",
  },
  {
    id: "cl-45",
    name: "Leche asada casera",
    aliases: ["leche asada", "postre de leche asada"],
    category: "postres_bebidas",
    portionGrams: 160,
    unit: "g",
    ingredientsBreakdown: [
      { name: "Leche entera, huevo, azúcar y caramelo horneado", grams: 160, calories: 232 },
    ],
    referenceMacros: { calories: 232, protein: 8.8, carbs: 32.0, fat: 7.7 },
    source: "INTA_UCHILE_2018",
    recommendedProvider: "catalogo_chileno",
    providerRationale: "Postre tradicional chileno horneado con caramelo.",
  },
];

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * Busca si un alimento detectado coincide con uno de los 45 platos del Benchmark Chileno
 * y devuelve sus nutrientes escalados según los gramos indicados.
 */
export function resolveChileanBenchmarkDish(
  foodName: string,
  portionGrams?: number
): {
  dish: ChileanBenchmarkDish;
  scaledMacros: { calories: number; protein: number; carbs: number; fat: number };
  effectiveGrams: number;
  catalogBadge: string;
} | null {
  if (!foodName || typeof foodName !== "string") return null;
  const query = normalizeText(foodName);
  if (query.length < 3) return null;

  for (const dish of CHILEAN_BENCHMARK_DISHES) {
    const candidates = [dish.name, ...dish.aliases].map(normalizeText);
    const matched = candidates.some(
      (candidate) => query === candidate || query.includes(candidate) || candidate.includes(query)
    );
    if (matched) {
      const effectiveGrams =
        portionGrams && Number.isFinite(portionGrams) && portionGrams > 0
          ? portionGrams
          : dish.portionGrams;
      const ratio = effectiveGrams / dish.portionGrams;
      return {
        dish,
        effectiveGrams,
        scaledMacros: {
          calories: Math.round(dish.referenceMacros.calories * ratio * 10) / 10,
          protein: Math.round(dish.referenceMacros.protein * ratio * 10) / 10,
          carbs: Math.round(dish.referenceMacros.carbs * ratio * 10) / 10,
          fat: Math.round(dish.referenceMacros.fat * ratio * 10) / 10,
        },
        catalogBadge: CHILEAN_CATALOG_METADATA.badgeLabel,
      };
    }
  }
  return null;
}

/**
 * Evalúa la predicción de una app sobre un plato chileno de referencia.
 */
export function evaluateDishPrediction(
  dish: ChileanBenchmarkDish,
  sample: Pick<AppPredictionSample, "predictedMacros" | "correctionTouches" | "latencyMs">
): DishEvaluationResult {
  const refCals = dish.referenceMacros.calories;
  const predCals = sample.predictedMacros.calories;
  const absoluteCaloricErrorKcal = Math.round(Math.abs(predCals - refCals) * 10) / 10;
  const caloricErrorPct =
    refCals > 0 ? Math.round((absoluteCaloricErrorKcal / refCals) * 1000) / 10 : 0;
  const signedCaloricErrorPct =
    refCals > 0 ? Math.round(((predCals - refCals) / refCals) * 1000) / 10 : 0;
  const within15Pct = caloricErrorPct <= 15;
  const coherence = validateMacroCalorieCoherence(sample.predictedMacros);

  return {
    dishId: dish.id,
    dishName: dish.name,
    category: dish.category,
    referenceCalories: refCals,
    predictedCalories: predCals,
    absoluteCaloricErrorKcal,
    caloricErrorPct,
    signedCaloricErrorPct,
    within15Pct,
    atwaterCoherent: coherence.coherent,
    correctionTouches: sample.correctionTouches,
    latencyMs: sample.latencyMs,
  };
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const raw =
    sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(raw * 10) / 10;
}

/**
 * Calcula las métricas globales publicables del benchmark (Error mediano %, % dentro de ±15 %,
 * coherencia Atwater, toques para corregir y latencia mediana).
 */
export function computeBenchmarkMetrics(
  appName: string,
  evaluations: DishEvaluationResult[]
): BenchmarkSummaryMetrics {
  const total = evaluations.length;
  const errors = evaluations.map((e) => e.caloricErrorPct);
  const latencies = evaluations.map((e) => e.latencyMs);
  const within15Count = evaluations.filter((e) => e.within15Pct).length;
  const coherentCount = evaluations.filter((e) => e.atwaterCoherent).length;
  const totalTouches = evaluations.reduce((acc, e) => acc + e.correctionTouches, 0);
  const meanError =
    total > 0 ? Math.round((errors.reduce((a, b) => a + b, 0) / total) * 10) / 10 : 0;

  const categories: BenchmarkCategory[] = [
    "desayuno_once",
    "sandwiches_completos",
    "platos_de_fondo",
    "empanadas_masas",
    "acompanamientos_ensaladas",
    "postres_bebidas",
  ];

  const byCategory = {} as BenchmarkSummaryMetrics["byCategory"];
  for (const cat of categories) {
    const subset = evaluations.filter((e) => e.category === cat);
    const subWithin = subset.filter((e) => e.within15Pct).length;
    byCategory[cat] = {
      count: subset.length,
      medianErrorPct: computeMedian(subset.map((e) => e.caloricErrorPct)),
      pctWithin15Pct:
        subset.length > 0 ? Math.round((subWithin / subset.length) * 1000) / 10 : 0,
    };
  }

  return {
    appName,
    totalDishes: total,
    medianCaloricErrorPct: computeMedian(errors),
    meanCaloricErrorPct: meanError,
    pctWithin15Pct: total > 0 ? Math.round((within15Count / total) * 1000) / 10 : 0,
    pctAtwaterCoherent: total > 0 ? Math.round((coherentCount / total) * 1000) / 10 : 0,
    meanCorrectionTouches: total > 0 ? Math.round((totalTouches / total) * 10) / 10 : 0,
    medianLatencyMs: computeMedian(latencies),
    byCategory,
  };
}
