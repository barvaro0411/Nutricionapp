import { create } from "zustand";
import { Appearance, Platform } from "react-native";
import { lightPalette, darkPalette } from "@/constants/colors";

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "nutricion_theme_mode_v1";

function getSystemDark(): boolean {
  try {
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function"
    ) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return Appearance.getColorScheme() === "dark";
  } catch {
    return false;
  }
}

export function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return getSystemDark();
}

export function applyWebThemeVariables(isDark: boolean): void {
  if (
    Platform.OS !== "web" ||
    typeof document === "undefined" ||
    typeof window === "undefined"
  ) {
    return;
  }

  const root = document.documentElement;
  root.setAttribute("data-theme", isDark ? "dark" : "light");
  root.style.colorScheme = isDark ? "dark" : "light";

  // Actualizar meta theme-color para barra superior en PWA (iOS/Android)
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", isDark ? darkPalette.background : lightPalette.primary);
  }

  let styleEl = document.getElementById("nutricion-theme-variables") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "nutricion-theme-variables";
    document.head.appendChild(styleEl);
  }

  const p = isDark ? darkPalette : lightPalette;

  styleEl.textContent = `
    :root {
      --c-primary: ${p.primary};
      --c-primary-accent: ${p.primaryAccent};
      --c-primary-dark: ${p.primaryDark};
      --c-primary-light: ${p.primaryLight};
      --c-primary-ghost: ${p.primaryGhost};
      --c-forest: ${p.forest};
      --c-mint: ${p.mint};
      --c-protein: ${p.protein};
      --c-protein-light: ${p.proteinLight};
      --c-carbs: ${p.carbs};
      --c-carbs-light: ${p.carbsLight};
      --c-fat: ${p.fat};
      --c-fat-light: ${p.fatLight};
      --c-water: ${p.water};
      --c-water-light: ${p.waterLight};
      --c-water-track: ${p.waterTrack};
      --c-background: ${p.background};
      --c-card: ${p.card};
      --c-card-border: ${p.cardBorder};
      --c-card-border-hover: ${p.cardBorderHover};
      --c-surface-muted: ${p.surfaceMuted};
      --c-text: ${p.text};
      --c-text-secondary: ${p.textSecondary};
      --c-text-muted: ${p.textMuted};
      --c-danger: ${p.danger};
      --c-danger-light: ${p.dangerLight};
      --c-warning: ${p.warning};
      --c-warning-light: ${p.warningLight};
      --c-success: ${p.success};
      --c-success-light: ${p.successLight};
    }
    html, body, #root {
      background-color: ${p.background} !important;
      color: ${p.text};
    }
    body {
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    input::placeholder, textarea::placeholder {
      color: ${p.textMuted};
    }
    button:focus-visible, [role="button"]:focus-visible, [role="tab"]:focus-visible {
      outline: 2px solid ${p.primary};
      outline-offset: 2px;
    }
  `;
}

async function saveThemeMode(mode: ThemeMode) {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode);
      }
      return;
    }
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors
  }
}

async function loadThemeMode(): Promise<ThemeMode> {
  try {
    let raw: string | null = null;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        raw = window.localStorage.getItem(THEME_STORAGE_KEY);
      }
    } else {
      const SecureStore = await import("expo-secure-store");
      raw = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
    }
    if (raw === "light" || raw === "dark" || raw === "system") {
      return raw;
    }
    return "light";
  } catch {
    return "light";
  }
}

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => void;
  toggleDark: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "light",
  isDark: false,
  hydrated: false,

  hydrate: async () => {
    const savedMode = await loadThemeMode();
    const isDark = resolveIsDark(savedMode);
    applyWebThemeVariables(isDark);
    set({ mode: savedMode, isDark, hydrated: true });
  },

  setMode: (mode) => {
    const isDark = resolveIsDark(mode);
    applyWebThemeVariables(isDark);
    void saveThemeMode(mode);
    set({ mode, isDark });
  },

  toggleDark: () => {
    const nextMode: ThemeMode = get().isDark ? "light" : "dark";
    get().setMode(nextMode);
  },
}));

// Auto-hidratar y escuchar cambios de preferencia del sistema en navegador
if (
  typeof window !== "undefined" &&
  typeof document !== "undefined" &&
  (typeof process === "undefined" || !process.env?.JEST_WORKER_ID)
) {
  void useThemeStore.getState().hydrate();
  if (typeof window.matchMedia === "function") {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      const state = useThemeStore.getState();
      if (state.mode === "system") {
        const nextDark = media.matches;
        applyWebThemeVariables(nextDark);
        useThemeStore.setState({ isDark: nextDark });
      }
    };
    media.addEventListener?.("change", onSystemChange);
  }
}
