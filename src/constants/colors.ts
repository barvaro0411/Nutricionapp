export const colors = {
  // Acentos de Marca (Saludable, Fresco y Enérgico estilo Lifesum / Apple Health)
  primary: "#10B981", // Esmeralda vibrante
  primaryAccent: "#059669", // Esmeralda profundo
  primaryDark: "#047857",
  primaryLight: "#ECFDF5", // Menta suave para fondos e iconos activos
  primaryGhost: "#F0FDF4",

  // Macronutrientes (Colores nítidos y modernos)
  protein: "#6366F1", // Indigo
  proteinLight: "#EEF2FF",
  carbs: "#F59E0B", // Ámbar / Naranja
  carbsLight: "#FFFBEB",
  fat: "#0EA5E9", // Celeste / Sky
  fatLight: "#F0F9FF",

  // Hidratación
  water: "#0284C7",
  waterLight: "#F0F9FF",
  waterTrack: "#E0F2FE",

  // Superficies y Fondos
  background: "#F8FAFC", // Fondo claro y pulcro
  card: "#FFFFFF",
  cardBorder: "#E2E8F0", // Borde sutil y limpio
  cardBorderHover: "#CBD5E1",
  surfaceMuted: "#F1F5F9",

  // Tipografía
  text: "#0F172A", // Pizarra oscuro de alta legibilidad
  textSecondary: "#64748B",
  textMuted: "#94A3B8",

  // Estados
  danger: "#EF4444", // Rojo vibrante
  dangerLight: "#FEE2E2",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  success: "#10B981",
  successLight: "#ECFDF5",

  dark: {
    background: "#090A0F",
    card: "#12141C",
    cardBorder: "#1E2230",
    text: "#F4F4F5",
    textSecondary: "#A1A1AA",
    textMuted: "#71717A",
  },
};

export const shadows = {
  sm: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHover: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  glow: {
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 22,
  full: 9999,
};
