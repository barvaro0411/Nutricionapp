const isBrowserRuntime =
  typeof window !== "undefined" &&
  typeof document !== "undefined" &&
  (typeof process === "undefined" || !process.env?.JEST_WORKER_ID);

const token = (cssVarName: string, hexFallback: string): string =>
  isBrowserRuntime ? `var(${cssVarName}, ${hexFallback})` : hexFallback;

export const lightPalette = {
  primary: "#087F5B",
  primaryAccent: "#06966B",
  primaryDark: "#064E3B",
  primaryLight: "#E7F5ED",
  primaryGhost: "#F2FAF5",
  forest: "#103E32",
  mint: "#BCF3CF",
  protein: "#6366F1",
  proteinLight: "#EEF2FF",
  carbs: "#A65F10",
  carbsLight: "#FFFBEB",
  fat: "#0EA5E9",
  fatLight: "#F0F9FF",
  water: "#036FA2",
  waterLight: "#F0F9FF",
  waterTrack: "#E0F2FE",
  background: "#F6F8F5",
  card: "#FFFFFF",
  cardBorder: "#E1E8E2",
  cardBorderHover: "#CBD5E1",
  surfaceMuted: "#EDF2EE",
  text: "#17352C",
  textSecondary: "#586B63",
  textMuted: "#64746B",
  danger: "#C33F49",
  dangerLight: "#FEE2E2",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  success: "#087F5B",
  successLight: "#ECFDF5",
};

export const darkPalette = {
  primary: "#10B981",
  primaryAccent: "#34D399",
  primaryDark: "#6EE7B7",
  primaryLight: "#163829",
  primaryGhost: "#112C20",
  forest: "#0D2B22",
  mint: "#A7F3D0",
  protein: "#818CF8",
  proteinLight: "#1E2440",
  carbs: "#F59E0B",
  carbsLight: "#332611",
  fat: "#38BDF8",
  fatLight: "#112A3B",
  water: "#38BDF8",
  waterLight: "#102A3A",
  waterTrack: "#1A3A4F",
  background: "#0B1913",
  card: "#13261D",
  cardBorder: "#213D30",
  cardBorderHover: "#2E5442",
  surfaceMuted: "#1A3227",
  text: "#ECFDF5",
  textSecondary: "#9DC0B0",
  textMuted: "#759989",
  danger: "#F87171",
  dangerLight: "#3B181E",
  warning: "#FBBF24",
  warningLight: "#382810",
  success: "#10B981",
  successLight: "#123325",
};

export const colors = {
  // Acentos de Marca (Saludable, Fresco y Enérgico estilo Lifesum / Apple Health)
  primary: token("--c-primary", lightPalette.primary),
  primaryAccent: token("--c-primary-accent", lightPalette.primaryAccent),
  primaryDark: token("--c-primary-dark", lightPalette.primaryDark),
  primaryLight: token("--c-primary-light", lightPalette.primaryLight),
  primaryGhost: token("--c-primary-ghost", lightPalette.primaryGhost),
  forest: token("--c-forest", lightPalette.forest),
  mint: token("--c-mint", lightPalette.mint),

  // Macronutrientes (Colores nítidos y modernos)
  protein: token("--c-protein", lightPalette.protein),
  proteinLight: token("--c-protein-light", lightPalette.proteinLight),
  carbs: token("--c-carbs", lightPalette.carbs),
  carbsLight: token("--c-carbs-light", lightPalette.carbsLight),
  fat: token("--c-fat", lightPalette.fat),
  fatLight: token("--c-fat-light", lightPalette.fatLight),

  // Hidratación
  water: token("--c-water", lightPalette.water),
  waterLight: token("--c-water-light", lightPalette.waterLight),
  waterTrack: token("--c-water-track", lightPalette.waterTrack),

  // Superficies y Fondos
  background: token("--c-background", lightPalette.background),
  card: token("--c-card", lightPalette.card),
  cardBorder: token("--c-card-border", lightPalette.cardBorder),
  cardBorderHover: token("--c-card-border-hover", lightPalette.cardBorderHover),
  surfaceMuted: token("--c-surface-muted", lightPalette.surfaceMuted),

  // Tipografía
  text: token("--c-text", lightPalette.text),
  textSecondary: token("--c-text-secondary", lightPalette.textSecondary),
  textMuted: token("--c-text-muted", lightPalette.textMuted),

  // Estados
  danger: token("--c-danger", lightPalette.danger),
  dangerLight: token("--c-danger-light", lightPalette.dangerLight),
  warning: token("--c-warning", lightPalette.warning),
  warningLight: token("--c-warning-light", lightPalette.warningLight),
  success: token("--c-success", lightPalette.success),
  successLight: token("--c-success-light", lightPalette.successLight),

  dark: {
    background: "#0B1913",
    card: "#13261D",
    cardBorder: "#213D30",
    text: "#ECFDF5",
    textSecondary: "#9DC0B0",
    textMuted: "#759989",
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
