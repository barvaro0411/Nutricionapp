export interface PortionOption {
  label: string;
  grams: number;
  unit?: "g" | "ml";
}

export type ChileanCatalogSourceId = "INTA_UCHILE_2018" | "MINSAL_2010" | "RECETARIO_ESTANDAR_CL";

export interface ChileanCatalogMetadata {
  version: string;
  updatedAt: string;
  badgeLabel: string;
  sources: Record<
    ChileanCatalogSourceId,
    {
      name: string;
      institution: string;
      edition: string;
      year: number;
      url: string;
    }
  >;
}

export const CHILEAN_CATALOG_METADATA: ChileanCatalogMetadata = {
  version: "2026.2",
  updatedAt: "2026-10-23",
  badgeLabel: "Catálogo Chileno (v2026.2 · INTA / Minsal)",
  sources: {
    INTA_UCHILE_2018: {
      name: "Tabla de Composición Química de Alimentos Chilenos",
      institution: "INTA - Universidad de Chile",
      edition: "8ª edición revisada",
      year: 2018,
      url: "https://repositorio.uchile.cl/handle/2250/121427",
    },
    MINSAL_2010: {
      name: "Base Nacional de Composición de Alimentos",
      institution: "Ministerio de Salud de Chile (MINSAL)",
      edition: "Actualización Nacional",
      year: 2010,
      url: "https://www.minsal.cl/composicion-de-alimentos/",
    },
    RECETARIO_ESTANDAR_CL: {
      name: "Porciones de Intercambio y Recetario Estandarizado Chileno",
      institution: "INTA / MINSAL",
      edition: "Referencia Clínica 2026",
      year: 2026,
      url: "https://www.minsal.cl/composicion-de-alimentos/",
    },
  },
};

export interface FoodVariant {
  food: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  cookingMethod?: string;
  sourceId?: ChileanCatalogSourceId;
  portions?: PortionOption[];
}

export interface FoodFamily {
  id: string;
  category: string;
  variants: FoodVariant[];
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const CHILEAN_FOOD_FAMILIES: Record<string, FoodFamily> = {
  pollo: {
    id: "pollo",
    category: "Pollo y Aves",
    variants: [
      {
        food: "Pechuga de pollo a la plancha",
        caloriesPer100g: 165,
        proteinPer100g: 31,
        carbsPer100g: 0,
        fatPer100g: 3.6,
        cookingMethod: "🔥 A la plancha",
        portions: [
          { label: "Bistec chico (120g)", grams: 120 },
          { label: "Porción estándar (150g)", grams: 150 },
          { label: "Pechuga entera (200g)", grams: 200 },
        ],
      },
      {
        food: "Pechuga de pollo cocida / hervida",
        caloriesPer100g: 150,
        proteinPer100g: 29,
        carbsPer100g: 0,
        fatPer100g: 3.0,
        cookingMethod: "🍲 Cocida / Hervida",
        portions: [
          { label: "Desmenuzada (100g)", grams: 100 },
          { label: "Filete mediano (150g)", grams: 150 },
        ],
      },
      {
        food: "Trutro de pollo al horno con piel",
        caloriesPer100g: 215,
        proteinPer100g: 24,
        carbsPer100g: 0,
        fatPer100g: 13.0,
        cookingMethod: "♨️ Al horno",
        portions: [
          { label: "1 trutro corto (~130g)", grams: 130 },
          { label: "1 trutro entero (~220g)", grams: 220 },
        ],
      },
      {
        food: "Trutro de pollo sin piel",
        caloriesPer100g: 170,
        proteinPer100g: 26,
        carbsPer100g: 0,
        fatPer100g: 7.0,
        cookingMethod: "♨️ Al horno (sin piel)",
        portions: [
          { label: "1 trutro corto (~110g)", grams: 110 },
          { label: "1 trutro entero (~180g)", grams: 180 },
        ],
      },
      {
        food: "Pollo frito / apanado",
        caloriesPer100g: 260,
        proteinPer100g: 22,
        carbsPer100g: 12,
        fatPer100g: 14.5,
        cookingMethod: "🍳 Frito / Crispy",
        portions: [
          { label: "1 presa mediana (~150g)", grams: 150 },
          { label: "Porción nuggets (~180g)", grams: 180 },
        ],
      },
      {
        food: "Pollo al jugo con verduras",
        caloriesPer100g: 140,
        proteinPer100g: 21,
        carbsPer100g: 4.5,
        fatPer100g: 4.0,
        cookingMethod: "🍲 Guisado al jugo",
        portions: [
          { label: "1 porción (~200g)", grams: 200 },
        ],
      },
    ],
  },

  vacuno: {
    id: "vacuno",
    category: "Carnes de Vacuno",
    variants: [
      {
        food: "Posta negra / rosada a la plancha",
        caloriesPer100g: 145,
        proteinPer100g: 28,
        carbsPer100g: 0,
        fatPer100g: 3.5,
        cookingMethod: "🔥 A la plancha (magra)",
        portions: [
          { label: "Bistec delgado (120g)", grams: 120 },
          { label: "Porción estándar (180g)", grams: 180 },
          { label: "Corte grueso (250g)", grams: 250 },
        ],
      },
      {
        food: "Lomo liso a la plancha",
        caloriesPer100g: 210,
        proteinPer100g: 26,
        carbsPer100g: 0,
        fatPer100g: 11.5,
        cookingMethod: "🔥 A la plancha / sartén",
        portions: [
          { label: "Bistec mediano (180g)", grams: 180 },
          { label: "Trozo parrillero (250g)", grams: 250 },
        ],
      },
      {
        food: "Lomo vetado a la parrilla",
        caloriesPer100g: 280,
        proteinPer100g: 24,
        carbsPer100g: 0,
        fatPer100g: 20.0,
        cookingMethod: "🥩 A la parrilla",
        portions: [
          { label: "Corte estándar (200g)", grams: 200 },
          { label: "Porción parrillera (300g)", grams: 300 },
        ],
      },
      {
        food: "Carne molida tártaro (magra)",
        caloriesPer100g: 155,
        proteinPer100g: 27,
        carbsPer100g: 0,
        fatPer100g: 5.0,
        cookingMethod: "🍲 Salteada / Guisada",
        portions: [
          { label: "1/2 taza (~100g)", grams: 100 },
          { label: "1 porción (~150g)", grams: 150 },
        ],
      },
      {
        food: "Carne molida corriente",
        caloriesPer100g: 240,
        proteinPer100g: 22,
        carbsPer100g: 0,
        fatPer100g: 17.0,
        cookingMethod: "🍳 Salteada con grasa",
        portions: [
          { label: "1 porción (~150g)", grams: 150 },
          { label: "Porción abundante (~200g)", grams: 200 },
        ],
      },
      {
        food: "Carne mechada al jugo",
        caloriesPer100g: 190,
        proteinPer100g: 26,
        carbsPer100g: 3.0,
        fatPer100g: 8.0,
        cookingMethod: "🍲 Mechada en olla",
        portions: [
          { label: "Para sándwich (120g)", grams: 120 },
          { label: "Plato de fondo (180g)", grams: 180 },
        ],
      },
    ],
  },

  cerdo: {
    id: "cerdo",
    category: "Carne de Cerdo",
    variants: [
      {
        food: "Pulpa de cerdo a la plancha",
        caloriesPer100g: 160,
        proteinPer100g: 27,
        carbsPer100g: 0,
        fatPer100g: 5.5,
        cookingMethod: "🔥 A la plancha (magra)",
        portions: [
          { label: "Bistec estándar (150g)", grams: 150 },
          { label: "Porción contundente (200g)", grams: 200 },
        ],
      },
      {
        food: "Costillar de cerdo al horno",
        caloriesPer100g: 290,
        proteinPer100g: 20,
        carbsPer100g: 1.0,
        fatPer100g: 23.0,
        cookingMethod: "♨️ Al horno",
        portions: [
          { label: "Porción estándar (200g)", grams: 200 },
          { label: "Porción parrillera (300g)", grams: 300 },
        ],
      },
      {
        food: "Chuleta de centro a la plancha",
        caloriesPer100g: 220,
        proteinPer100g: 24,
        carbsPer100g: 0,
        fatPer100g: 13.5,
        cookingMethod: "🔥 A la plancha",
        portions: [
          { label: "1 chuleta mediana (~160g)", grams: 160 },
          { label: "1 chuleta grande (~220g)", grams: 220 },
        ],
      },
    ],
  },

  pescados_mariscos: {
    id: "pescados_mariscos",
    category: "Pescados y Mariscos",
    variants: [
      {
        food: "Salmón a la plancha / al horno",
        caloriesPer100g: 208,
        proteinPer100g: 22,
        carbsPer100g: 0,
        fatPer100g: 13.0,
        cookingMethod: "🔥 Plancha / Horno",
        portions: [
          { label: "Filete mediano (150g)", grams: 150 },
          { label: "Filete grande (200g)", grams: 200 },
        ],
      },
      {
        food: "Reineta a la plancha",
        caloriesPer100g: 95,
        proteinPer100g: 19.5,
        carbsPer100g: 0,
        fatPer100g: 1.8,
        cookingMethod: "🔥 Plancha (magro)",
        portions: [
          { label: "Filete mediano (150g)", grams: 150 },
          { label: "Filete grande (200g)", grams: 200 },
        ],
      },
      {
        food: "Merluza frita tradicional",
        caloriesPer100g: 195,
        proteinPer100g: 16,
        carbsPer100g: 9.0,
        fatPer100g: 10.5,
        cookingMethod: "🍳 Batida y frita",
        portions: [
          { label: "1 presa frita (~150g)", grams: 150 },
          { label: "Porción doble (~220g)", grams: 220 },
        ],
      },
      {
        food: "Merluza al vapor / al horno",
        caloriesPer100g: 90,
        proteinPer100g: 18,
        carbsPer100g: 0,
        fatPer100g: 1.5,
        cookingMethod: "💨 Al vapor / Horno",
        portions: [
          { label: "1 filete (~150g)", grams: 150 },
        ],
      },
      {
        food: "Atún en lata al agua",
        caloriesPer100g: 116,
        proteinPer100g: 26,
        carbsPer100g: 0,
        fatPer100g: 1.0,
        cookingMethod: "🥫 Al agua",
        portions: [
          { label: "1/2 lata escurrida (60g)", grams: 60 },
          { label: "1 lata escurrida (120g)", grams: 120 },
        ],
      },
      {
        food: "Atún en lata en aceite",
        caloriesPer100g: 198,
        proteinPer100g: 29,
        carbsPer100g: 0,
        fatPer100g: 8.2,
        cookingMethod: "🥫 En aceite",
        portions: [
          { label: "1 lata escurrida (120g)", grams: 120 },
        ],
      },
    ],
  },

  huevos: {
    id: "huevos",
    category: "Huevos y Desayuno",
    variants: [
      {
        food: "Huevo frito al sartén",
        caloriesPer100g: 196,
        proteinPer100g: 13.6,
        carbsPer100g: 0.8,
        fatPer100g: 15.3,
        cookingMethod: "🍳 Frito con aceite",
        portions: [
          { label: "1 huevo (~55g)", grams: 55 },
          { label: "2 huevos (~110g)", grams: 110 },
        ],
      },
      {
        food: "Huevo revuelto casero",
        caloriesPer100g: 154,
        proteinPer100g: 11.0,
        carbsPer100g: 1.6,
        fatPer100g: 11.5,
        cookingMethod: "🍳 Revuelto al sartén",
        portions: [
          { label: "1 huevo (~60g)", grams: 60 },
          { label: "2 huevos (~120g)", grams: 120 },
        ],
      },
      {
        food: "Huevo duro / cocido",
        caloriesPer100g: 155,
        proteinPer100g: 12.6,
        carbsPer100g: 1.1,
        fatPer100g: 10.6,
        cookingMethod: "🍲 Cocido en agua",
        portions: [
          { label: "1 huevo (~50g)", grams: 50 },
          { label: "2 huevos (~100g)", grams: 100 },
        ],
      },
      {
        food: "Huevo pochado",
        caloriesPer100g: 143,
        proteinPer100g: 12.5,
        carbsPer100g: 0.7,
        fatPer100g: 9.5,
        cookingMethod: "🍲 Pochado en agua",
        portions: [
          { label: "1 huevo (~50g)", grams: 50 },
          { label: "2 huevos (~100g)", grams: 100 },
        ],
      },
      {
        food: "Omelette tradicional",
        caloriesPer100g: 165,
        proteinPer100g: 12.5,
        carbsPer100g: 2.0,
        fatPer100g: 12.0,
        cookingMethod: "🍳 Omelette doblado",
        portions: [
          { label: "1 porción (~150g)", grams: 150 },
        ],
      },
      {
        food: "Omelette de claras (fit)",
        caloriesPer100g: 52,
        proteinPer100g: 11.0,
        carbsPer100g: 0.7,
        fatPer100g: 0.2,
        cookingMethod: "🍳 Claras sin grasa",
        portions: [
          { label: "1 porción (~120g)", grams: 120 },
        ],
      },
    ],
  },

  pan: {
    id: "pan",
    category: "Pan Chileno",
    variants: [
      {
        food: "Marraqueta chilena",
        caloriesPer100g: 270,
        proteinPer100g: 8.5,
        carbsPer100g: 56,
        fatPer100g: 1.0,
        cookingMethod: "🥖 Sin grasa añadida",
        portions: [
          { label: "Media marraqueta (1 diente ~50g)", grams: 50 },
          { label: "1 marraqueta entera (2 dientes ~100g)", grams: 100 },
        ],
      },
      {
        food: "Hallulla tradicional",
        caloriesPer100g: 310,
        proteinPer100g: 8.0,
        carbsPer100g: 54,
        fatPer100g: 7.0,
        cookingMethod: "🥖 Con manteca",
        portions: [
          { label: "Media hallulla (~50g)", grams: 50 },
          { label: "1 hallulla entera (~100g)", grams: 100 },
        ],
      },
      {
        food: "Pan amasado casero",
        caloriesPer100g: 330,
        proteinPer100g: 7.5,
        carbsPer100g: 52,
        fatPer100g: 10.5,
        cookingMethod: "🥖 Tradicional sureño",
        portions: [
          { label: "1 unidad pequeña (~80g)", grams: 80 },
          { label: "1 unidad tradicional (~130g)", grams: 130 },
        ],
      },
      {
        food: "Pan molde blanco",
        caloriesPer100g: 265,
        proteinPer100g: 8.0,
        carbsPer100g: 50,
        fatPer100g: 3.5,
        cookingMethod: "🍞 Molde blanco",
        portions: [
          { label: "1 rebanada (~25g)", grams: 25 },
          { label: "2 rebanadas (~50g)", grams: 50 },
        ],
      },
      {
        food: "Pan molde integral",
        caloriesPer100g: 245,
        proteinPer100g: 9.5,
        carbsPer100g: 44,
        fatPer100g: 3.2,
        cookingMethod: "🍞 Molde integral con fibra",
        portions: [
          { label: "1 rebanada (~25g)", grams: 25 },
          { label: "2 rebanadas (~50g)", grams: 50 },
        ],
      },
      {
        food: "Dobladita chilena",
        caloriesPer100g: 350,
        proteinPer100g: 7.0,
        carbsPer100g: 50,
        fatPer100g: 14.0,
        cookingMethod: "🥖 Masa hojaldrada con manteca",
        portions: [
          { label: "1 unidad (~80g)", grams: 80 },
        ],
      },
    ],
  },

  acompanamientos: {
    id: "acompanamientos",
    category: "Acompañamientos Típicos",
    variants: [
      {
        food: "Arroz blanco graneado",
        caloriesPer100g: 130,
        proteinPer100g: 2.7,
        carbsPer100g: 28,
        fatPer100g: 0.3,
        cookingMethod: "🍚 Cocido tradicional",
        portions: [
          { label: "1/2 taza (~75g)", grams: 75 },
          { label: "1 taza (~150g)", grams: 150 },
          { label: "Plato hondo (~220g)", grams: 220 },
        ],
      },
      {
        food: "Arroz integral",
        caloriesPer100g: 112,
        proteinPer100g: 2.6,
        carbsPer100g: 23,
        fatPer100g: 0.9,
        cookingMethod: "🍚 Integral con fibra",
        portions: [
          { label: "1/2 taza (~75g)", grams: 75 },
          { label: "1 taza (~150g)", grams: 150 },
        ],
      },
      {
        food: "Papas cocidas",
        caloriesPer100g: 86,
        proteinPer100g: 1.7,
        carbsPer100g: 20,
        fatPer100g: 0.1,
        cookingMethod: "🥔 Cocidas en agua con sal",
        portions: [
          { label: "1 papa mediana (~100g)", grams: 100 },
          { label: "2 papas (~200g)", grams: 200 },
        ],
      },
      {
        food: "Papas fritas caseras",
        caloriesPer100g: 312,
        proteinPer100g: 3.4,
        carbsPer100g: 41,
        fatPer100g: 15.0,
        cookingMethod: "🍟 Fritas en aceite caliente",
        portions: [
          { label: "Porción chica (~100g)", grams: 100 },
          { label: "Porción estándar (~180g)", grams: 180 },
          { label: "Porción grande (~250g)", grams: 250 },
        ],
      },
      {
        food: "Puré de papas con leche y mantequilla",
        caloriesPer100g: 110,
        proteinPer100g: 2.0,
        carbsPer100g: 16,
        fatPer100g: 4.2,
        cookingMethod: "🥔 Puré cremoso",
        portions: [
          { label: "1/2 taza (~100g)", grams: 100 },
          { label: "1 taza / porción (~200g)", grams: 200 },
        ],
      },
      {
        food: "Fideos / Tallarines cocidos",
        caloriesPer100g: 140,
        proteinPer100g: 5.0,
        carbsPer100g: 28,
        fatPer100g: 0.7,
        cookingMethod: "🍝 Pasta cocida al dente",
        portions: [
          { label: "1 taza (~140g)", grams: 140 },
          { label: "Plato regular (~220g)", grams: 220 },
        ],
      },
      {
        food: "Quinoa cocida",
        caloriesPer100g: 120,
        proteinPer100g: 4.4,
        carbsPer100g: 21,
        fatPer100g: 1.9,
        cookingMethod: "🌾 Quinoa cocida",
        portions: [
          { label: "1/2 taza (~85g)", grams: 85 },
          { label: "1 taza (~170g)", grams: 170 },
        ],
      },
      {
        food: "Ensalada chilena (tomate y cebolla)",
        caloriesPer100g: 45,
        proteinPer100g: 1.0,
        carbsPer100g: 5.0,
        fatPer100g: 2.5,
        cookingMethod: "🥗 Fresca con aceite y sal",
        portions: [
          { label: "Plato chico (~120g)", grams: 120 },
          { label: "Plato grande (~200g)", grams: 200 },
        ],
      },
    ],
  },

  platos_chilenos: {
    id: "platos_chilenos",
    category: "Platos Preparados Chilenos",
    variants: [
      {
        food: "Cazuela de vacuno",
        caloriesPer100g: 75,
        proteinPer100g: 6.5,
        carbsPer100g: 7.0,
        fatPer100g: 2.5,
        cookingMethod: "🍲 Olla tradicional",
        portions: [
          { label: "1 plato regular (~350g)", grams: 350 },
          { label: "1 plato contundente (~450g)", grams: 450 },
        ],
      },
      {
        food: "Cazuela de ave",
        caloriesPer100g: 68,
        proteinPer100g: 6.0,
        carbsPer100g: 6.5,
        fatPer100g: 2.0,
        cookingMethod: "🍲 Olla tradicional",
        portions: [
          { label: "1 plato regular (~350g)", grams: 350 },
          { label: "1 plato contundente (~450g)", grams: 450 },
        ],
      },
      {
        food: "Pastel de choclo",
        caloriesPer100g: 175,
        proteinPer100g: 8.0,
        carbsPer100g: 20,
        fatPer100g: 7.0,
        cookingMethod: "♨️ Al horno en greda",
        portions: [
          { label: "Porción mediana (~250g)", grams: 250 },
          { label: "Paila individual (~350g)", grams: 350 },
        ],
      },
      {
        food: "Charquicán con huevo frito",
        caloriesPer100g: 135,
        proteinPer100g: 6.2,
        carbsPer100g: 15,
        fatPer100g: 5.5,
        cookingMethod: "🍲 Guiso con huevo montado",
        portions: [
          { label: "1 plato hondo (~300g)", grams: 300 },
        ],
      },
      {
        food: "Porotos con riendas",
        caloriesPer100g: 140,
        proteinPer100g: 7.0,
        carbsPer100g: 22,
        fatPer100g: 2.5,
        cookingMethod: "🍲 Guiso de legumbres",
        portions: [
          { label: "1 plato hondo (~350g)", grams: 350 },
        ],
      },
      {
        food: "Porotos granados con mazamorra",
        caloriesPer100g: 125,
        proteinPer100g: 5.5,
        carbsPer100g: 20,
        fatPer100g: 2.0,
        cookingMethod: "🍲 Tradicional de verano",
        portions: [
          { label: "1 plato hondo (~350g)", grams: 350 },
        ],
      },
      {
        food: "Empanada de pino al horno",
        caloriesPer100g: 250,
        proteinPer100g: 9.0,
        carbsPer100g: 26,
        fatPer100g: 12.0,
        cookingMethod: "♨️ Al horno",
        portions: [
          { label: "1 unidad tradicional (~200g)", grams: 200 },
        ],
      },
      {
        food: "Empanada de queso frita",
        caloriesPer100g: 310,
        proteinPer100g: 10.0,
        carbsPer100g: 28,
        fatPer100g: 17.5,
        cookingMethod: "🍳 Frita crujiente",
        portions: [
          { label: "1 unidad frita (~140g)", grams: 140 },
        ],
      },
      {
        food: "Completo italiano",
        caloriesPer100g: 210,
        proteinPer100g: 6.5,
        carbsPer100g: 21,
        fatPer100g: 11.0,
        cookingMethod: "🌭 Pan, vienesa, palta, tomate, mayo",
        portions: [
          { label: "1 completo (~220g)", grams: 220 },
        ],
      },
      {
        food: "As italiano (con carne picada)",
        caloriesPer100g: 225,
        proteinPer100g: 9.5,
        carbsPer100g: 20,
        fatPer100g: 12.0,
        cookingMethod: "🌭 Pan alargado, vacuno, palta, tomate, mayo",
        sourceId: "RECETARIO_ESTANDAR_CL",
        portions: [
          { label: "1 sándwich As (~250g)", grams: 250 },
        ],
      },
      {
        food: "Completo dinámico",
        caloriesPer100g: 220,
        proteinPer100g: 6.4,
        carbsPer100g: 21.5,
        fatPer100g: 12.0,
        cookingMethod: "🌭 Pan, vienesa, palta, tomate, americana, chucrut, mayo",
        sourceId: "RECETARIO_ESTANDAR_CL",
        portions: [
          { label: "1 completo dinámico (~250g)", grams: 250 },
        ],
      },
      {
        food: "Churrasco italiano",
        caloriesPer100g: 215,
        proteinPer100g: 11.5,
        carbsPer100g: 18.0,
        fatPer100g: 10.8,
        cookingMethod: "🥪 Pan frica/marraqueta, posta a la plancha, palta, tomate, mayo",
        sourceId: "RECETARIO_ESTANDAR_CL",
        portions: [
          { label: "1 churrasco mediano (~260g)", grams: 260 },
          { label: "1 churrasco grande (~330g)", grams: 330 },
        ],
      },
      {
        food: "Barros Luco",
        caloriesPer100g: 255,
        proteinPer100g: 14.5,
        carbsPer100g: 19.0,
        fatPer100g: 13.5,
        cookingMethod: "🥪 Pan marraqueta/molde, vacuno a la plancha y queso fundido",
        sourceId: "RECETARIO_ESTANDAR_CL",
        portions: [
          { label: "1 sándwich regular (~230g)", grams: 230 },
        ],
      },
      {
        food: "Marraqueta con palta",
        caloriesPer100g: 224,
        proteinPer100g: 5.8,
        carbsPer100g: 34.0,
        fatPer100g: 7.2,
        cookingMethod: "🥑 Pan batido con palta Hass molida",
        sourceId: "INTA_UCHILE_2018",
        portions: [
          { label: "Media marraqueta con palta (~140g)", grams: 140 },
          { label: "1 marraqueta entera con palta (~260g)", grams: 260 },
        ],
      },
      {
        food: "Humita en hoja",
        caloriesPer100g: 145,
        proteinPer100g: 4.0,
        carbsPer100g: 24.5,
        fatPer100g: 3.5,
        cookingMethod: "🌽 Choclo molido con albahaca y cebolla cocido en chala",
        sourceId: "INTA_UCHILE_2018",
        portions: [
          { label: "1 humita mediana (~220g)", grams: 220 },
          { label: "1 humita grande (~280g)", grams: 280 },
        ],
      },
      {
        food: "Lentejas con arroz y longaniza",
        caloriesPer100g: 138,
        proteinPer100g: 7.8,
        carbsPer100g: 18.0,
        fatPer100g: 3.8,
        cookingMethod: "🍲 Guiso casero tradicional",
        sourceId: "MINSAL_2010",
        portions: [
          { label: "1 plato hondo (~350g)", grams: 350 },
        ],
      },
      {
        food: "Carbonada chilena de vacuno",
        caloriesPer100g: 76,
        proteinPer100g: 5.5,
        carbsPer100g: 8.5,
        fatPer100g: 2.2,
        cookingMethod: "🍲 Sopa con vacuno picado, papa, zapallo, choclo y arvejas",
        sourceId: "INTA_UCHILE_2018",
        portions: [
          { label: "1 plato hondo (~350g)", grams: 350 },
        ],
      },
      {
        food: "Pantrucas en caldo",
        caloriesPer100g: 98,
        proteinPer100g: 5.2,
        carbsPer100g: 14.5,
        fatPer100g: 2.1,
        cookingMethod: "🍲 Caldo con masas de harina, papa y huevo",
        sourceId: "MINSAL_2010",
        portions: [
          { label: "1 plato hondo (~350g)", grams: 350 },
        ],
      },
      {
        food: "Paila marina",
        caloriesPer100g: 78,
        proteinPer100g: 10.5,
        carbsPer100g: 3.5,
        fatPer100g: 2.4,
        cookingMethod: "🦪 Caldo de mariscos surtidos y pescado en greda",
        sourceId: "INTA_UCHILE_2018",
        portions: [
          { label: "1 paila individual (~380g)", grams: 380 },
        ],
      },
      {
        food: "Chorrillana tradicional",
        caloriesPer100g: 235,
        proteinPer100g: 9.8,
        carbsPer100g: 21.0,
        fatPer100g: 12.4,
        cookingMethod: "🍟 Papas fritas, vacuno salteado, cebolla caramelizada y huevo frito",
        sourceId: "RECETARIO_ESTANDAR_CL",
        portions: [
          { label: "Porción individual (~320g)", grams: 320 },
        ],
      },
      {
        food: "Sopaipilla tradicional con zapallo",
        caloriesPer100g: 328,
        proteinPer100g: 6.2,
        carbsPer100g: 43.0,
        fatPer100g: 14.5,
        cookingMethod: "🎃 Masa con zapallo frita",
        sourceId: "INTA_UCHILE_2018",
        portions: [
          { label: "1 sopaipilla mediana (~55g)", grams: 55 },
          { label: "2 sopaipillas (~110g)", grams: 110 },
        ],
      },
      {
        food: "Sopaipilla pasada en chancaca",
        caloriesPer100g: 255,
        proteinPer100g: 3.8,
        carbsPer100g: 41.5,
        fatPer100g: 8.2,
        cookingMethod: "🍯 En almíbar de chancaca con canela y cáscara de naranja",
        sourceId: "RECETARIO_ESTANDAR_CL",
        portions: [
          { label: "Porción 2 unidades con salsa (~180g)", grams: 180 },
        ],
      },
      {
        food: "Mote con huesillo",
        caloriesPer100g: 108,
        proteinPer100g: 1.8,
        carbsPer100g: 24.5,
        fatPer100g: 0.3,
        cookingMethod: "🍑 Huesillo cocido en jugo acaramelado con mote de trigo",
        sourceId: "INTA_UCHILE_2018",
        portions: [
          { label: "1 vaso tradicional (300ml)", grams: 300, unit: "ml" },
          { label: "1 vaso grande (450ml)", grams: 450, unit: "ml" },
        ],
      },
      {
        food: "Calzones rotos",
        caloriesPer100g: 375,
        proteinPer100g: 6.5,
        carbsPer100g: 51.0,
        fatPer100g: 16.0,
        cookingMethod: "🍩 Masa dulce frita con azúcar flor",
        sourceId: "MINSAL_2010",
        portions: [
          { label: "1 unidad (~50g)", grams: 50 },
          { label: "2 unidades (~100g)", grams: 100 },
        ],
      },
      {
        food: "Leche con plátano licuada",
        caloriesPer100g: 74,
        proteinPer100g: 2.8,
        carbsPer100g: 12.0,
        fatPer100g: 1.6,
        cookingMethod: "🍌 Batido tradicional con leche semidescremada",
        sourceId: "INTA_UCHILE_2018",
        portions: [
          { label: "1 vaso (250ml)", grams: 250, unit: "ml" },
          { label: "1 tazón grande (350ml)", grams: 350, unit: "ml" },
        ],
      },
    ],
  },

  bebidas_calientes: {
    id: "bebidas_calientes",
    category: "Café, Té y Bebidas Calientes",
    variants: [
      {
        food: "Café negro solo / americano",
        caloriesPer100g: 2,
        proteinPer100g: 0.1,
        carbsPer100g: 0.3,
        fatPer100g: 0.0,
        cookingMethod: "☕ Sin azúcar ni leche",
        portions: [
          { label: "Taza pequeña (150ml)", grams: 150, unit: "ml" },
          { label: "Taza grande / Mug (250ml)", grams: 250, unit: "ml" },
        ],
      },
      {
        food: "Café con leche entera",
        caloriesPer100g: 48,
        proteinPer100g: 2.6,
        carbsPer100g: 3.8,
        fatPer100g: 2.5,
        cookingMethod: "☕ Con leche entera",
        portions: [
          { label: "Taza (150ml)", grams: 150, unit: "ml" },
          { label: "Taza grande / Mug (250ml)", grams: 250, unit: "ml" },
        ],
      },
      {
        food: "Café con leche descremada / light",
        caloriesPer100g: 32,
        proteinPer100g: 3.0,
        carbsPer100g: 4.2,
        fatPer100g: 0.2,
        cookingMethod: "☕ Con leche 0% grasa",
        portions: [
          { label: "Taza (150ml)", grams: 150, unit: "ml" },
          { label: "Taza grande / Mug (250ml)", grams: 250, unit: "ml" },
        ],
      },
      {
        food: "Café con leche vegetal (almendra / soya)",
        caloriesPer100g: 24,
        proteinPer100g: 1.2,
        carbsPer100g: 2.5,
        fatPer100g: 1.1,
        cookingMethod: "☕ Bebida vegetal",
        portions: [
          { label: "Taza (150ml)", grams: 150, unit: "ml" },
          { label: "Taza grande / Mug (250ml)", grams: 250, unit: "ml" },
        ],
      },
      {
        food: "Té tradicional solo",
        caloriesPer100g: 1,
        proteinPer100g: 0.0,
        carbsPer100g: 0.2,
        fatPer100g: 0.0,
        cookingMethod: "🍵 Infusión",
        portions: [
          { label: "Taza (150ml)", grams: 150, unit: "ml" },
          { label: "Taza grande / Mug (250ml)", grams: 250, unit: "ml" },
        ],
      },
      {
        food: "Té con leche",
        caloriesPer100g: 35,
        proteinPer100g: 2.0,
        carbsPer100g: 3.0,
        fatPer100g: 1.6,
        cookingMethod: "🍵 Con leche",
        portions: [
          { label: "Taza (150ml)", grams: 150, unit: "ml" },
          { label: "Taza grande / Mug (250ml)", grams: 250, unit: "ml" },
        ],
      },
    ],
  },
};

export const COMMON_ACCOMPANIMENTS: FoodVariant[] =
  CHILEAN_FOOD_FAMILIES.acompanamientos.variants;

/**
 * Busca si un nombre de alimento detectado corresponde a una familia de alimentos para ofrecer variantes
 */
export function findFamilyForFood(foodName: string): FoodFamily | null {
  if (!foodName || typeof foodName !== "string") return null;
  const n = normalize(foodName);

  // 1. Platos preparados chilenos (prioridad sobre ingredientes individuales)
  if (
    n.includes("cazuela") ||
    n.includes("pastel de choclo") ||
    n.includes("charquican") ||
    n.includes("porotos") ||
    n.includes("carbonada") ||
    n.includes("empanada") ||
    n.includes("completo") ||
    n.includes("as italiano") ||
    n.includes("churrasco italiano") ||
    n.includes("barros luco") ||
    n.includes("marraqueta con palta") ||
    n.includes("humita") ||
    n.includes("lentejas") ||
    n.includes("pantrucas") ||
    n.includes("paila marina") ||
    n.includes("chorrillana") ||
    n.includes("sopaipilla") ||
    n.includes("mote con huesillo") ||
    n.includes("calzones rotos") ||
    n.includes("leche con platano")
  ) {
    return CHILEAN_FOOD_FAMILIES.platos_chilenos;
  }

  // 2. Pan chileno
  if (
    n.includes("marraqueta") ||
    n.includes("hallulla") ||
    n.includes("pan") ||
    n.includes("amasado") ||
    n.includes("molde") ||
    n.includes("dobladita") ||
    n.includes("tostada")
  ) {
    return CHILEAN_FOOD_FAMILIES.pan;
  }

  // 3. Aves / Pollo
  if (n.includes("pollo") || n.includes("pechuga") || n.includes("trutro") || n.includes("alitas")) {
    return CHILEAN_FOOD_FAMILIES.pollo;
  }

  // 4. Vacuno
  if (
    n.includes("carne") ||
    n.includes("vacuno") ||
    n.includes("lomo") ||
    n.includes("posta") ||
    (/\basado\b/).test(n) ||
    n.includes("bife") ||
    n.includes("filete") ||
    n.includes("churrasco") ||
    n.includes("molida") ||
    n.includes("mechada")
  ) {
    return CHILEAN_FOOD_FAMILIES.vacuno;
  }

  // 5. Cerdo
  if (n.includes("cerdo") || n.includes("chancho") || n.includes("costillar") || n.includes("chuleta") || n.includes("pulpa")) {
    return CHILEAN_FOOD_FAMILIES.cerdo;
  }

  // 6. Pescados y Mariscos
  if (
    n.includes("pescado") ||
    n.includes("salmon") ||
    n.includes("merluza") ||
    n.includes("reineta") ||
    n.includes("atun") ||
    n.includes("marisco") ||
    n.includes("camaron") ||
    n.includes("congrio")
  ) {
    return CHILEAN_FOOD_FAMILIES.pescados_mariscos;
  }

  // 7. Huevos
  if (n.includes("huevo") || n.includes("huevos") || n.includes("omelette") || n.includes("revuelto")) {
    return CHILEAN_FOOD_FAMILIES.huevos;
  }

  // 8. Acompañamientos
  if (
    n.includes("arroz") ||
    n.includes("papa") ||
    n.includes("pure") ||
    n.includes("fideo") ||
    n.includes("tallarin") ||
    n.includes("pasta") ||
    n.includes("quinoa")
  ) {
    return CHILEAN_FOOD_FAMILIES.acompanamientos;
  }

  // 9. Bebidas calientes
  if (
    n.includes("cafe") ||
    n.includes("cortado") ||
    n.includes("te") ||
    n.includes("infusion") ||
    n.includes("cappuccino") ||
    n.includes("latte")
  ) {
    return CHILEAN_FOOD_FAMILIES.bebidas_calientes;
  }

  return null;
}
