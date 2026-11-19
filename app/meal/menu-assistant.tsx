import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Mic,
  MicOff,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react-native";
import { colors, layout, shadows } from "@/constants/colors";
import { PageBackHeader } from "@/components/common/AppUI";
import { AiConsentModal } from "@/components/common/AiConsentModal";
import { CoachMessageContent } from "@/components/coach/CoachMessageContent";
import { useAiConsent } from "@/hooks/useAiConsent";
import { useCoachChat } from "@/hooks/useCoachChat";
import { useDailyNutrition } from "@/hooks/useDailyNutrition";
import { saveMealToDatabase } from "@/services/mealService";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { MealType } from "@/types/meal";
import { CoachActionData } from "@/utils/coachActions";
import { showAlert, showToast } from "@/utils/alerts";
import {
  buildMenuAssistantPrompt,
  MENU_VENUES,
  MenuVenueType,
} from "@/utils/menuAssistantPrompt";

const MEAL_MOMENTS: { id: MealType; label: string }[] = [
  { id: "desayuno", label: "Desayuno" },
  { id: "almuerzo", label: "Almuerzo" },
  { id: "cena", label: "Once / Cena" },
  { id: "snack", label: "Colación" },
];

export default function MenuAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { suggestedMealType } = useLocalSearchParams<{
    suggestedMealType?: MealType;
  }>();
  const user = useAuthStore((s) => s.user);

  const { data: dailyNutrition } = useDailyNutrition();
  const { hasConsent, setConsent, isUpdating } = useAiConsent();
  const { sendMessage, isSending } = useCoachChat();

  const [venue, setVenue] = useState<MenuVenueType>("casino");
  const [mealType, setMealType] = useState<MealType>(
    suggestedMealType &&
      ["desayuno", "almuerzo", "cena", "snack"].includes(suggestedMealType)
      ? suggestedMealType
      : "almuerzo"
  );
  const [preferHighProtein, setPreferHighProtein] = useState(true);
  const [preferLight, setPreferLight] = useState(false);
  const [menuText, setMenuText] = useState("");
  const [replyText, setReplyText] = useState<string | null>(null);
  const [actionOverride, setActionOverride] = useState<
    CoachActionData | undefined
  >(undefined);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const remaining = useMemo(() => {
    const goalCal = dailyNutrition?.goal.calories ?? 2000;
    const goalProt = dailyNutrition?.goal.protein_g ?? 130;
    const goalCarbs = dailyNutrition?.goal.carbs_g ?? 200;
    const goalFat = dailyNutrition?.goal.fat_g ?? 60;

    return {
      calories: Math.max(0, goalCal - (dailyNutrition?.consumed.calories || 0)),
      protein: Math.max(0, goalProt - (dailyNutrition?.consumed.protein || 0)),
      carbs: Math.max(0, goalCarbs - (dailyNutrition?.consumed.carbs || 0)),
      fat: Math.max(0, goalFat - (dailyNutrition?.consumed.fat || 0)),
    };
  }, [dailyNutrition]);

  const activeVenue = MENU_VENUES.find((v) => v.id === venue) || MENU_VENUES[0];

  const runAnalysis = async () => {
    if (!menuText.trim()) {
      showAlert(
        "Carta o menú vacío",
        "Escribe o pega las opciones del casino/restaurante (o carga un ejemplo para probar)."
      );
      return;
    }

    if (!hasConsent) {
      setShowConsentModal(true);
      return;
    }

    setReplyText(null);
    setActionOverride(undefined);

    const prompt = buildMenuAssistantPrompt({
      venue,
      mealType,
      menuText,
      remainingCalories: remaining.calories,
      remainingProtein: remaining.protein,
      remainingCarbs: remaining.carbs,
      remainingFat: remaining.fat,
      preferHighProtein,
      preferLight,
    });

    try {
      const res: any = await sendMessage(prompt);
      const reply = res?.reply;
      if (typeof reply === "string" && reply.trim()) {
        setReplyText(reply.trim());
      } else {
        throw new Error("El Coach no entregó recomendaciones claras.");
      }
    } catch (err: any) {
      showAlert(
        "No se pudo analizar la carta",
        err?.message || "Revisa tu conexión e inténtalo de nuevo."
      );
    }
  };

  const toggleVoiceDictation = () => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      showAlert(
        "Dictado web",
        "En dispositivos móviles puedes usar el micrófono del teclado para dictar el menú."
      );
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      showAlert(
        "Dictado no disponible",
        "Tu navegador no soporta dictado directo. Escribe o pega el menú abajo."
      );
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = "es-CL";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || "";
        if (transcript.trim()) {
          setMenuText((prev) =>
            prev.trim() ? `${prev.trim()}\n${transcript.trim()}` : transcript.trim()
          );
        }
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  const handleActionConfirm = async (action: CoachActionData) => {
    if (action.type !== "meal" || action.status === "confirmed") return;
    setActionOverride({ ...action, status: "executing" });
    try {
      if (!user) throw new Error("No hay usuario autenticado");
      const saved = await saveMealToDatabase({
        userId: user.id,
        mealType: action.mealType,
        imagePath: null,
        items: action.items.map((it) => ({
          food: it.food,
          grams: it.grams,
          unit: it.unit,
          calories: it.calories,
          protein: it.protein,
          carbs: it.carbs,
          fat: it.fat,
          confidence: 1.0,
        })),
        totals: action.totals,
      });
      setActionOverride({
        ...action,
        status: "confirmed",
        mealId: (saved as any)?.id,
      });
      await queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] });
      await queryClient.invalidateQueries({ queryKey: ["recentMeals"] });
      showToast({
        type: "success",
        title: "¡Plato registrado!",
        message: `${Math.round(action.totals.calories)} kcal agregadas a tu ${action.mealType}.`,
      });
    } catch (err: any) {
      setActionOverride({
        ...action,
        status: "error",
        error: err?.message || "No se pudo guardar el plato.",
      });
    }
  };

  const handleActionUndo = async (action: CoachActionData) => {
    if (action.type !== "meal" || !action.mealId) return;
    setActionOverride({ ...action, status: "executing" });
    try {
      await supabase.from("meals").delete().eq("id", action.mealId);
      await queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] });
      await queryClient.invalidateQueries({ queryKey: ["recentMeals"] });
      setActionOverride({ ...action, status: "undone" });
      showToast({
        type: "info",
        title: "Registro deshecho",
        message: "Se eliminó el plato de tu diario.",
      });
    } catch (err: any) {
      setActionOverride({
        ...action,
        status: "error",
        error: err?.message || "No se pudo deshacer.",
      });
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 24) + 32,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <PageBackHeader
          title="¿Qué pido hoy?"
          backLabel="Volver a añadir alimentos"
          onBack={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)/record")
          }
        />

        {/* Hero presupuesto restante del día */}
        <View style={styles.budgetCard}>
          <View style={styles.budgetTop}>
            <View style={styles.budgetIcon}>
              <UtensilsCrossed size={18} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.budgetOverline}>TU PRESUPUESTO RESTANTE HOY</Text>
              <Text style={styles.budgetHeadline}>
                {Math.round(remaining.calories).toLocaleString("es-CL")} kcal ·{" "}
                {Math.round(remaining.protein)} g proteína disponibles
              </Text>
            </View>
          </View>
          <Text style={styles.budgetSub}>
            La IA elegirá las 2 mejores opciones de la carta o casino calzando con tus macros y alergias guardadas.
          </Text>
        </View>

        {/* Tipo de lugar */}
        <Text style={styles.sectionLabel}>1. ¿Dónde vas a comer?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={{ marginBottom: 16 }}
        >
          {MENU_VENUES.map((v) => {
            const active = v.id === venue;
            return (
              <TouchableOpacity
                key={v.id}
                style={[styles.venueChip, active && styles.venueChipActive]}
                onPress={() => setVenue(v.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.venueEmoji}>{v.emoji}</Text>
                <Text style={[styles.venueText, active && styles.venueTextActive]}>
                  {v.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Momento y enfoque */}
        <Text style={styles.sectionLabel}>2. Momento y prioridad</Text>
        <View style={styles.momentsRow}>
          {MEAL_MOMENTS.map((m) => {
            const active = mealType === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.momentChip, active && styles.momentChipActive]}
                onPress={() => setMealType(m.id)}
              >
                <Text style={[styles.momentText, active && styles.momentTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.prefsRow}>
          <TouchableOpacity
            style={[styles.prefPill, preferHighProtein && styles.prefPillActive]}
            onPress={() => setPreferHighProtein((v) => !v)}
          >
            <Text style={[styles.prefText, preferHighProtein && styles.prefTextActive]}>
              🥩 Priorizar proteína
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.prefPill, preferLight && styles.prefPillActive]}
            onPress={() => setPreferLight((v) => !v)}
          >
            <Text style={[styles.prefText, preferLight && styles.prefTextActive]}>
              🥗 Opción más liviana
            </Text>
          </TouchableOpacity>
        </View>

        {/* Caja del menú */}
        <View style={styles.menuHeaderRow}>
          <Text style={styles.sectionLabel}>3. Escribe o dicta las opciones</Text>
          <View style={styles.menuTools}>
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => setMenuText(activeVenue.sampleMenu)}
            >
              <Text style={styles.toolBtnText}>Cargar ejemplo</Text>
            </TouchableOpacity>
            {Platform.OS === "web" && (
              <TouchableOpacity
                style={[styles.toolBtn, isListening && styles.toolBtnListening]}
                onPress={toggleVoiceDictation}
                accessibilityRole="button"
                accessibilityLabel="Dictar opciones del menú"
              >
                {isListening ? (
                  <MicOff size={13} color="#FFFFFF" />
                ) : (
                  <Mic size={13} color={colors.primaryDark} />
                )}
                <Text
                  style={[
                    styles.toolBtnText,
                    isListening && { color: "#FFFFFF" },
                  ]}
                >
                  {isListening ? "Detener" : "Dictar"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TextInput
          style={styles.menuInput}
          value={menuText}
          onChangeText={setMenuText}
          multiline
          numberOfLines={5}
          placeholder={`Ej: ${activeVenue.sampleMenu}`}
          placeholderTextColor={colors.textMuted}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.analyzeBtn, isSending && { opacity: 0.7 }]}
          onPress={() => void runAnalysis()}
          disabled={isSending}
          activeOpacity={0.85}
        >
          {isSending ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.analyzeBtnText}>Evaluando opciones para ti...</Text>
            </>
          ) : (
            <>
              <Sparkles size={18} color="#FFFFFF" />
              <Text style={styles.analyzeBtnText}>Elegir las 2 mejores opciones</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Recomendación de la IA */}
        {replyText && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultOverline}>RECOMENDACIÓN INTELIGENTE</Text>
              <TouchableOpacity
                style={styles.openCoachLink}
                onPress={() => router.push("/coach")}
              >
                <Text style={styles.openCoachText}>Abrir en Coach</Text>
                <ArrowUpRight size={14} color={colors.primaryDark} />
              </TouchableOpacity>
            </View>
            <CoachMessageContent
              content={replyText}
              actionOverride={actionOverride}
              onActionConfirm={handleActionConfirm}
              onActionUndo={handleActionUndo}
            />
          </View>
        )}
      </ScrollView>

      <AiConsentModal
        visible={showConsentModal}
        isUpdating={isUpdating}
        onCancel={() => setShowConsentModal(false)}
        onViewPrivacy={() => {
          setShowConsentModal(false);
          router.push("/legal" as any);
        }}
        onAccept={async () => {
          try {
            await setConsent(true);
          } catch {}
          setShowConsentModal(false);
          void runAnalysis();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...layout.narrowPage,
  },
  budgetCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 18,
  },
  budgetTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  budgetIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetOverline: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: colors.primaryDark,
  },
  budgetHeadline: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
  },
  budgetSub: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  chipsRow: {
    gap: 8,
  },
  venueChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
  },
  venueChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  venueEmoji: {
    fontSize: 15,
  },
  venueText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  venueTextActive: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  momentsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  momentChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  momentChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  momentText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  momentTextActive: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  prefsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  prefPill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  prefPillActive: {
    backgroundColor: colors.primaryGhost,
    borderColor: colors.primary,
  },
  prefText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  prefTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  menuHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  menuTools: {
    flexDirection: "row",
    gap: 6,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  toolBtnListening: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  menuInput: {
    minHeight: 128,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
    marginBottom: 14,
  },
  analyzeBtn: {
    minHeight: 52,
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
    ...shadows.glow,
  },
  analyzeBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultOverline: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: colors.primaryDark,
  },
  openCoachLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  openCoachText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
});
