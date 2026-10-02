// Plan Maestro de Transformación - Datos Oficiales del Usuario (Álvaro Acosta)
// Recomposición corporal + hipertrofia + rendimiento

export interface MasterPlanData {
  user: {
    fullName: string;
    email: string;
    heightCm: number;
    currentWeightKg: number;
    targetFatPct: string;
    targetWeightKg: number;
    weeklyPaceKg: string;
    bodyFatPct: number;
    skeletalMuscleKg: number;
    bmrKcal: number;
    objectiveTitle: string;
    objectiveDesc: string;
  };
  dailyGoals: {
    standard: {
      days: string;
      calories: number;
      caloriesRange: string;
      proteinG: number;
      proteinRange: string;
      carbsG: number;
      carbsRange: string;
      fatG: number;
      fatRange: string;
    };
    matchDay: {
      days: string;
      calories: number;
      caloriesRange: string;
      proteinG: number;
      carbsG: number;
      carbsRange: string;
      fatG: number;
      fatRange: string;
      focus: string;
    };
    waterMl: number;
    waterRangeL: string;
  };
  mealSchedule: Array<{
    time: string;
    block: string;
    detail: string;
    energyKcal: number;
    proteinG: string;
    notes?: string;
  }>;
  weeklyRoutine: Array<{
    day: string;
    activity: string;
    goal: string;
    intensity: string;
    exercises?: Array<{
      name: string;
      setsReps: string;
      rir: string;
      rest: string;
    }>;
  }>;
  supplements: Array<{
    name: string;
    dose: string;
    timing: string;
  }>;
  dailyChecklist: string[];
}

export const BARVARO_MASTER_PLAN: MasterPlanData = {
  user: {
    fullName: "Álvaro Acosta",
    email: "barvaro0411@gmail.com",
    heightCm: 173,
    currentWeightKg: 70.6,
    targetFatPct: "12-13%",
    targetWeightKg: 68.6,
    weeklyPaceKg: "0,2 a 0,4 kg/semana",
    bodyFatPct: 14.4,
    skeletalMuscleKg: 34.3,
    bmrKcal: 1675,
    objectiveTitle: "Recomposición Corporal + Rendimiento",
    objectiveDesc: "Déficit leve medible, proteína alta, sobrecarga progresiva y combustible para bicicleta y fútbol.",
  },
  dailyGoals: {
    standard: {
      days: "Lunes a Sábado",
      calories: 2175,
      caloriesRange: "2.150 - 2.200 kcal",
      proteinG: 155,
      proteinRange: "150 - 160 g",
      carbsG: 245,
      carbsRange: "230 - 260 g",
      fatG: 60,
      fatRange: "55 - 65 g",
    },
    matchDay: {
      days: "Domingo (Partido de Fútbol)",
      calories: 2550,
      caloriesRange: "2.500 - 2.600 kcal",
      proteinG: 150,
      carbsG: 360,
      carbsRange: "350 - 375 g",
      fatG: 58,
      fatRange: "55 - 60 g",
      focus: "Recarga de glucógeno y electrolitos para alto rendimiento.",
    },
    waterMl: 3200,
    waterRangeL: "3,0 - 3,5 L",
  },
  mealSchedule: [
    {
      time: "07:00",
      block: "Desayuno",
      detail: "Avena 60g + whey 30g + plátano 100g + leche descremada 200ml",
      energyKcal: 500,
      proteinG: "~39 g",
    },
    {
      time: "10:30",
      block: "Colación",
      detail: "Yogurt alto en proteína + manzana o pera + almendras 15g",
      energyKcal: 290,
      proteinG: "18-22 g",
    },
    {
      time: "13:45",
      block: "Pre-Gym",
      detail: "Pan blanco 60g + mermelada 20g + café (plátano opcional)",
      energyKcal: 250,
      proteinG: "5-7 g",
    },
    {
      time: "16:15",
      block: "Post-Entreno / Almuerzo",
      detail: "Pollo 170g + arroz cocido 220g + verduras 200g + aceite de oliva 10g",
      energyKcal: 720,
      proteinG: "55-60 g",
    },
    {
      time: "20:30",
      block: "Cena",
      detail: "2 huevos + atún 80g + pan integral 40g + palta 30g + ensalada",
      energyKcal: 410,
      proteinG: "35-40 g",
    },
  ],
  weeklyRoutine: [
    {
      day: "Lunes",
      activity: "Torso fuerte + Bicicleta",
      goal: "Fuerza / Hipertrofia de Torso",
      intensity: "RIR 1-2",
      exercises: [
        { name: "Press banca con barra", setsReps: "4 x 6-8", rir: "1-2", rest: "2-3 min" },
        { name: "Remo barra o polea baja", setsReps: "4 x 6-8", rir: "1-2", rest: "2 min" },
        { name: "Press militar mancuernas", setsReps: "3 x 8-10", rir: "1-2", rest: "2 min" },
        { name: "Jalón al pecho", setsReps: "3 x 8-10", rir: "1-2", rest: "2 min" },
        { name: "Elevaciones laterales", setsReps: "3 x 12-15", rir: "0-2", rest: "60-90 s" },
        { name: "Tríceps en polea", setsReps: "3 x 10-12", rir: "1", rest: "60-90 s" },
        { name: "Curl de bíceps", setsReps: "2 x 10-12", rir: "1", rest: "60-90 s" },
      ],
    },
    {
      day: "Martes",
      activity: "Piernas completa + Bicicleta",
      goal: "Cuádriceps + Cadena Posterior",
      intensity: "RIR 1-2",
      exercises: [
        { name: "Sentadilla o prensa principal", setsReps: "4 x 6-10", rir: "1-2", rest: "2-3 min" },
        { name: "Peso muerto rumano", setsReps: "3 x 8-10", rir: "2", rest: "2-3 min" },
        { name: "Prensa de piernas", setsReps: "3 x 10-12", rir: "1-2", rest: "2 min" },
        { name: "Curl femoral", setsReps: "3 x 10-12", rir: "1", rest: "90-120 s" },
        { name: "Gemelos", setsReps: "4 x 12-15", rir: "1", rest: "60-90 s" },
        { name: "Abdomen", setsReps: "3 x 12-20", rir: "1", rest: "45-90 s" },
      ],
    },
    {
      day: "Miércoles",
      activity: "Push + Bicicleta",
      goal: "Pecho, Hombros y Tríceps",
      intensity: "RIR 0-2",
      exercises: [
        { name: "Press inclinado mancuernas", setsReps: "4 x 8-10", rir: "1-2", rest: "2 min" },
        { name: "Press de pecho máquina", setsReps: "3 x 8-12", rir: "1", rest: "90-120 s" },
        { name: "Aperturas en polea", setsReps: "3 x 12-15", rir: "1", rest: "60-90 s" },
        { name: "Press de hombro", setsReps: "3 x 8-10", rir: "1-2", rest: "2 min" },
        { name: "Elevaciones laterales", setsReps: "4 x 12-20", rir: "0-1", rest: "60-90 s" },
        { name: "Tríceps polea / variante", setsReps: "3-4 x 10-15", rir: "0-1", rest: "60-90 s" },
      ],
    },
    {
      day: "Jueves",
      activity: "Pull + Bicicleta",
      goal: "Espalda, Deltoides Post. y Bíceps",
      intensity: "RIR 1-2",
      exercises: [
        { name: "Dominadas o jalón", setsReps: "4 x 6-10", rir: "1-2", rest: "2 min" },
        { name: "Remo sentado", setsReps: "4 x 8-10", rir: "1", rest: "2 min" },
        { name: "Remo unilateral", setsReps: "3 x 8-12", rir: "1", rest: "90-120 s" },
        { name: "Face pull", setsReps: "3 x 12-15", rir: "1", rest: "60-90 s" },
        { name: "Curl inclinado", setsReps: "3 x 8-12", rir: "1", rest: "60-90 s" },
        { name: "Curl martillo", setsReps: "3 x 10-12", rir: "1", rest: "60-90 s" },
      ],
    },
    {
      day: "Viernes",
      activity: "Hombros + Brazos + Core + Bici",
      goal: "Volumen sin fatigar piernas",
      intensity: "RIR 0-2",
      exercises: [
        { name: "Elevaciones laterales", setsReps: "4 x 12-20", rir: "0-1", rest: "60-90 s" },
        { name: "Pájaros / Deltoide post.", setsReps: "3 x 12-20", rir: "1", rest: "60-90 s" },
        { name: "Curl barra Z", setsReps: "3 x 8-12", rir: "1", rest: "60-90 s" },
        { name: "Curl martillo", setsReps: "3 x 10-12", rir: "1", rest: "60-90 s" },
        { name: "Tríceps en polea", setsReps: "3 x 10-15", rir: "1", rest: "60-90 s" },
        { name: "Extensión tríceps sobre cabeza", setsReps: "3 x 10-15", rir: "1", rest: "60-90 s" },
        { name: "Elevaciones piernas / core", setsReps: "3 x 12-15", rir: "1", rest: "45-90 s" },
      ],
    },
    {
      day: "Sábado",
      activity: "Recuperación Activa",
      goal: "Caminar 20-40 min suave, movilidad, sin pesas",
      intensity: "Suave",
    },
    {
      day: "Domingo",
      activity: "Partido de Fútbol",
      goal: "Rendimiento y disfrute (Carga de carbohidratos)",
      intensity: "Alta intensidad",
    },
  ],
  supplements: [
    { name: "Creatina monohidratada", dose: "3-5 g diarios", timing: "Cualquier hora con constancia" },
    { name: "Whey Protein", dose: "20-30 g según necesidad", timing: "Post-entreno o colación para llegar a la proteína" },
    { name: "Cafeína", dose: "100-200 mg", timing: "30-60 min pre-entreno (evitar cerca de dormir)" },
    { name: "Omega-3", dose: "Según EPA+DHA", timing: "Tomar con comida principal" },
    { name: "Electrolitos", dose: "Según sudoración", timing: "Útiles en fútbol y calor" },
  ],
  dailyChecklist: [
    "Proteína 150-160 g alcanzada",
    "Calorías dentro de rango (2.150-2.200 L-S / 2.500-2.600 Dom)",
    "3,0+ Litros de agua consumidos",
    "Entrenamiento o actividad planificada realizada",
    "Registro de cargas y repeticiones de ejercicios",
    "Consumo de frutas y verduras frescas",
    "7 a 9 horas de descanso nocturno",
  ],
};
