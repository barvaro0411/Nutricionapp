export const colors = {
  // Acentos de Marca (Saludable, Fresco y Enérgico estilo Lifesum / Apple Health)
  primary: "#087F5B",
  primaryAccent: "#06966B",
  primaryDark: "#064E3B",
  primaryLight: "#E7F5ED",
  primaryGhost: "#F2FAF5",
  forest: "#103E32",
  mint: "#BCF3CF",

  // Macronutrientes (Colores nítidos y modernos)
  protein: "#6366F1", // Indigo
  proteinLight: "#EEF2FF",
  carbs: "#A65F10",
  carbsLight: "#FFFBEB",
  fat: "#0EA5E9", // Celeste / Sky
  fatLight: "#F0F9FF",

  // Hidratación
  water: "#036FA2",
  waterLight: "#F0F9FF",
  waterTrack: "#E0F2FE",

  // Superficies y Fondos
  background: "#F6F8F5",
  card: "#FFFFFF",
  cardBorder: "#E1E8E2",
  cardBorderHover: "#CBD5E1",
  surfaceMuted: "#EDF2EE",

  // Tipografía
  text: "#17352C",
  textSecondary: "#586B63",
  textMuted: "#64746B",

  // Estados
  danger: "#C33F49",
  dangerLight: "#FEE2E2",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  success: "#087F5B",
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

export const layout = {
  page: {
    width: "100%" as const,
    maxWidth: 980,
    alignSelf: "center" as const,
    padding: 20,
    paddingBottom: 40,
  },
  narrowPage: {
    width: "100%" as const,
    maxWidth: 680,
    alignSelf: "center" as const,
    padding: 20,
    paddingBottom: 40,
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
