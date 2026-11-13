import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useRouter, useLocalSearchParams, useSegments } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useQueryClient } from "@tanstack/react-query";
import { useCoachChat } from "@/hooks/useCoachChat";
import { useWaterTracker } from "@/hooks/useWaterTracker";
import { useAuthStore } from "@/stores/useAuthStore";
import { saveMealToDatabase } from "@/services/mealService";
import { supabase } from "@/services/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Sparkles,
  ArrowLeft,
  Send,
  Volume2,
  Square,
  Mic,
  Utensils,
  Target,
  Apple,
  ShoppingBasket,
  ArrowUpRight,
  Trash2,
} from "lucide-react-native";
import { StateCard } from "@/components/common/AppUI";
import { colors } from "@/constants/colors";
import { CoachMessageContent } from "@/components/coach/CoachMessageContent";
import { useCoachSpeech } from "@/hooks/useCoachSpeech";
import { useCoachLive } from "@/hooks/useCoachLive";
import { CoachBuddy, BuddyMood } from "@/components/coach/CoachBuddy";
import {
  detectCoachAction,
  embedCoachAction,
  extractCoachAction,
  CoachActionData,
} from "@/utils/coachActions";
import { AnalyzeMealResponse } from "@/types/meal";
import { showAlert, showToast } from "@/utils/alerts";

export default function CoachChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const withinTabs = useSegments()[0] === "(tabs)";
  const wide = useWindowDimensions().width >= 760;
  const { initialPrompt } = useLocalSearchParams<{ initialPrompt?: string }>();
  const {
    messages,
    isLoading,
    error,
    refetch,
    sendMessage,
    clearHistory,
    appendLocalMessages,
    isSending,
    sendError,
    pendingMessage,
  } = useCoachChat();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { addWater } = useWaterTracker();

  const [inputText, setInputText] = useState("");
  const [actionOverrides, setActionOverrides] = useState<Record<string, CoachActionData>>({});
  const [isActionProcessing, setIsActionProcessing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const hasAutoSentRef = useRef(false);
  const speech = useCoachSpeech();
  const live = useCoachLive();

  const isBusy = isSending || isActionProcessing;
  const buddyMood: BuddyMood = isBusy
    ? "thinking"
    : live.status === "speaking" || speech.speakingId
    ? "speaking"
    : live.active
    ? "listening"
    : "ready";
  const buddyStatus = isBusy
    ? "Preparando ideas y registros para ti…"
    : buddyMood === "speaking"
    ? "Tengo algo para contarte"
    : live.active
    ? "Estoy contigo. Te escucho"
    : "Un paso a la vez, juntos";


  useEffect(() => {
    if (messages.length || isBusy || live.draft.user || live.draft.assistant)
      scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isBusy, live.draft]);

  const handleActionConfirm = async (action: CoachActionData) => {
    if (action.status === "confirmed" || isBusy) return;
    setActionOverrides((prev) => ({
      ...prev,
      [action.id]: { ...action, status: "executing" },
    }));

    try {
      if (action.type === "water") {
        const log = await addWater(action.amountMl);
        setActionOverrides((prev) => ({
          ...prev,
          [action.id]: { ...action, status: "confirmed", logId: (log as any)?.id },
        }));
        showToast({
          type: "success",
          title: "¡Agua registrada!",
          message: `Se sumaron ${action.amountMl} ml a tu hidratación de hoy.`,
        });
      } else {
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
        setActionOverrides((prev) => ({
          ...prev,
          [action.id]: { ...action, status: "confirmed", mealId: (saved as any)?.id },
        }));
        await queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] });
        await queryClient.invalidateQueries({ queryKey: ["recentMeals"] });
        showToast({
          type: "success",
          title: "¡Comida registrada!",
          message: `${Math.round(action.totals.calories)} kcal añadidas a tu ${action.mealType}.`,
        });
      }
    } catch (err: any) {
      setActionOverrides((prev) => ({
        ...prev,
        [action.id]: {
          ...action,
          status: "error",
          error: err?.message || "No se pudo registrar",
        },
      }));
    }
  };

  const handleActionUndo = async (action: CoachActionData) => {
    setActionOverrides((prev) => ({
      ...prev,
      [action.id]: { ...action, status: "executing" },
    }));

    try {
      if (action.type === "water" && action.logId) {
        await supabase.from("water_logs").delete().eq("id", action.logId);
        await queryClient.invalidateQueries({ queryKey: ["waterLogs"] });
      } else if (action.type === "meal" && action.mealId) {
        await supabase.from("meals").delete().eq("id", action.mealId);
        await queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] });
        await queryClient.invalidateQueries({ queryKey: ["recentMeals"] });
      }
      setActionOverrides((prev) => ({
        ...prev,
        [action.id]: { ...action, status: "undone" },
      }));
      showToast({
        type: "info",
        title: "Registro deshecho",
        message: "Se eliminó el registro de tu diario.",
      });
    } catch (err: any) {
      setActionOverrides((prev) => ({
        ...prev,
        [action.id]: {
          ...action,
          status: "error",
          error: err?.message || "No se pudo deshacer",
        },
      }));
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isBusy || live.active) return;

    const detected = detectCoachAction(text);
    if (!detected) {
      setInputText("");
      try {
        await sendMessage(text);
      } catch {
        setInputText(text);
      }
      return;
    }

    // Acción automática detectada
    setInputText("");
    setIsActionProcessing(true);

    try {
      if (detected.type === "water") {
        const log = await addWater(detected.amountMl);
        const actionData: CoachActionData = {
          id: randomUUID(),
          type: "water",
          amountMl: detected.amountMl,
          status: "confirmed",
          logId: (log as any)?.id,
        };
        const assistantText = embedCoachAction(
          `¡Anotado! He sumado **${detected.amountMl} ml** de agua a tu consumo de hoy.`,
          actionData
        );
        appendLocalMessages(text, assistantText);
      } else {
        const { data, error: funcErr } = await supabase.functions.invoke<AnalyzeMealResponse>(
          "parse-meal-text",
          {
            body: {
              text: detected.description,
              client_time_iso: new Date().toISOString(),
            },
          }
        );

        if (funcErr || !data?.success || !data.data?.items?.length) {
          throw new Error(
            funcErr?.message ||
              data?.error?.message ||
              "No pude interpretar los alimentos descritos."
          );
        }

        const mealItems = data.data.items.map((it) => ({
          food: it.food,
          grams: it.grams,
          unit: (it.unit as "g" | "ml") || "g",
          calories: it.calories,
          protein: it.protein,
          carbs: it.carbs,
          fat: it.fat,
        }));

        const totals = data.data.totals;
        let savedMealId: string | undefined;

        if (user) {
          const saved = await saveMealToDatabase({
            userId: user.id,
            mealType: detected.mealType,
            imagePath: null,
            items: data.data.items,
            totals,
          });
          savedMealId = (saved as any)?.id;
          await queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] });
          await queryClient.invalidateQueries({ queryKey: ["recentMeals"] });
        }

        const actionData: CoachActionData = {
          id: randomUUID(),
          type: "meal",
          description: detected.description,
          mealType: detected.mealType,
          status: "confirmed",
          items: mealItems,
          totals,
          mealId: savedMealId,
        };

        const assistantText = embedCoachAction(
          `¡Listo! Registré tu **${detected.mealType}** (${Math.round(
            totals.calories
          )} kcal) en tu diario de hoy.`,
          actionData
        );
        appendLocalMessages(text, assistantText);
      }
    } catch (err: any) {
      showAlert("Acción del Coach", err?.message || "No se pudo completar el registro.");
      setInputText(text);
    } finally {
      setIsActionProcessing(false);
    }
  };

  // Auto-envío inmediato si se redirigió con una sugerencia desde el Dashboard
  useEffect(() => {
    if (initialPrompt && typeof initialPrompt === "string" && !hasAutoSentRef.current) {
      hasAutoSentRef.current = true;
      router.replace("/coach");
      void handleSend(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo se ejecuta una vez al montar con initialPrompt
  }, [initialPrompt]);

  const handleClearHistory = () => {
    showAlert(
      "Limpiar conversación",
      "¿Deseas vaciar el historial de mensajes del Coach?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpiar",
          style: "destructive",
          onPress: async () => {
            try {
              speech.stop();
              await clearHistory();
            } catch {
              showAlert("Error", "No se pudo limpiar la conversación.");
            }
          },
        },
      ]
    );
  };

  const quickPrompts = [
    { title: "¿Cómo estuvo mi día?", description: "Balance y cierre del día", prompt: "Hazme el cierre de mi día según mis comidas y agua registradas hoy, felicitándome por mis avances y dándome un consejo práctico para mañana.", Icon: Sparkles },
    { title: "Ideas para cenar", description: "Según tus registros", prompt: "¿Qué puedo cenar con las calorías que me faltan hoy?", Icon: Utensils },
    { title: "Mi proteína", description: "Revisa tu meta de hoy", prompt: "¿Cómo voy con mi meta de proteína de hoy?", Icon: Target },
    { title: "Una colación", description: "Opciones con proteína", prompt: "Recomiéndame un snack chileno alto en proteína", Icon: Apple },
    { title: "Mis compras", description: "Organiza tu semana", prompt: "¿Qué comprar en el supermercado para mis metas?", Icon: ShoppingBasket },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio"
          style={styles.backBtn}
          onPress={() =>
            withinTabs ? router.navigate("/(tabs)") : router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
        >
          <ArrowLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text accessibilityRole="header" style={styles.headerTitle}>Coach IA</Text>
          <Text style={styles.headerSubtitle}>
            Ideas para tu rutina, por texto y voz
          </Text>
        </View>
        {messages.length > 0 ? (
          <TouchableOpacity
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Limpiar conversación"
            onPress={handleClearHistory}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerIcon}>
            <Sparkles size={20} color={colors.primary} />
          </View>
        )}
      </View>

      {live.supported && (
        <View style={styles.voiceBar}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={live.active ? "Terminar conversación por voz" : "Conversar por voz"}
            disabled={!live.active && (isSending || isLoading || !!error)} style={[styles.voiceButton, live.active && styles.voiceButtonActive, !live.active && (isSending || isLoading || !!error) && styles.sendButtonDisabled]}
            onPress={() => { speech.stop(); if (live.active) live.stop(); else live.start(); }}>
            <View style={[styles.voiceIcon, live.active && styles.voiceIconActive]}>{live.active ? <Square size={19} color={colors.danger} /> : <Mic size={19} color="white" />}</View>
            <View style={styles.voiceCopy}><Text style={[styles.voiceButtonText, live.active && { color: colors.danger }]}>{live.active ? "Terminar conversación" : "Conversar por voz"}</Text>
              <Text style={styles.voiceHint} accessibilityLiveRegion="polite">{live.status === "connecting" ? "Conectando…" : live.status === "speaking" ? "El coach responde" : live.status === "listening" ? "Te escucho" : "Habla y escucha · hasta 2 min"}</Text></View>
            {!live.active && <ArrowUpRight size={18} color={colors.primary} />}
          </TouchableOpacity>
        </View>
      )}
      {(speech.error || live.error) && <Text style={styles.voiceError} accessibilityRole="alert">{live.error || speech.error}</Text>}

      {/* Mensajes */}
      <ScrollView
        testID="coach-conversation"
        ref={scrollViewRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.companionCard}>
          <CoachBuddy mood={buddyMood} />
          <View style={styles.companionCopy}>
            <Text style={styles.companionEyebrow}>TU COMPAÑERO DE CADA DÍA</Text>
            <Text style={styles.companionTitle}>Pequeñas ideas. Grandes hábitos.</Text>
            <View style={styles.statusRow}><View style={styles.statusDot} /><Text style={styles.companionStatus} accessibilityLiveRegion="polite">{buddyStatus}</Text></View>
          </View>
        </View>
        {/* Mensaje de bienvenida inicial si no hay historial */}
        {error && (
          <StateCard
            title="No pudimos cargar la conversación"
            message="Revisa la conexión y vuelve a intentarlo."
            onRetry={() => void refetch()}
          />
        )}
        {isLoading && (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        )}
        {messages.length === 0 && !isLoading && !error && (
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>¿Qué hacemos hoy?</Text>
            <Text style={styles.welcomeDesc}>
              Elige una idea o escribe tu pregunta. Usaré tus registros y metas para orientarte.
            </Text>
          </View>
        )}

        {messages.length < 3 && !isLoading && !error && (
          <View style={styles.promptsContainer}>
            <Text style={styles.promptsTitle}>Empieza con una idea</Text>
            <View style={styles.promptsRow}>
              {quickPrompts.map(({ title, description, prompt, Icon }) => (
                <TouchableOpacity key={prompt} accessibilityRole="button" accessibilityLabel={prompt}
                  disabled={isBusy || live.active} onPress={() => handleSend(prompt)}
                  style={[styles.promptChip, wide && styles.promptWide, (isBusy || live.active) && styles.sendButtonDisabled]}>
                  <View style={styles.promptIcon}><Icon size={18} color={colors.primary} /></View>
                  <Text style={styles.promptChipText}>{title}</Text><Text style={styles.promptDescription}>{description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const extracted = !isUser ? extractCoachAction(msg.content) : null;
          const msgAction = extracted?.action;
          const actionToPass = msgAction ? actionOverrides[msgAction.id] ?? msgAction : undefined;

          return (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                isUser ? styles.userRow : styles.assistantRow,
              ]}
            >
              {!isUser && (
                <View style={styles.botAvatar}>
                  <Sparkles size={16} color={colors.primary} />
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  isUser ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                {isUser ? (
                  <Text selectable style={[styles.bubbleText, styles.userText]}>
                    {msg.content}
                  </Text>
                ) : (
                  <>
                    <CoachMessageContent
                      content={msg.content}
                      actionOverride={actionToPass}
                      onActionConfirm={handleActionConfirm}
                      onActionUndo={handleActionUndo}
                    />
                    {speech.supported && (
                      <View style={styles.msgFooter}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={
                            speech.speakingId === msg.id
                              ? "Detener lectura de voz"
                              : "Escuchar respuesta en voz alta"
                          }
                          style={[
                            styles.miniListenBtn,
                            speech.speakingId === msg.id && styles.miniListenBtnActive,
                          ]}
                          onPress={() => {
                            live.stop();
                            speech.toggle(msg.id, msg.content);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          {speech.speakingId === msg.id ? (
                            <Square size={13} color={colors.danger} />
                          ) : (
                            <Volume2 size={15} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          );
        })}

        {live.active && (live.draft.user || live.draft.assistant) && (
          <View style={styles.liveDraft} accessibilityLiveRegion="polite">
            {!!live.draft.user && <Text style={styles.draftText}>Tú: {live.draft.user}</Text>}
            {!!live.draft.assistant && <Text style={styles.draftText}>Coach: {live.draft.assistant}</Text>}
          </View>
        )}

        {isSending && !!pendingMessage && (
          <View style={[styles.messageRow, styles.userRow]}>
            <View style={[styles.bubble, styles.userBubble]}>
              <Text style={[styles.bubbleText, styles.userText]}>{pendingMessage}</Text>
            </View>
          </View>
        )}

        {isBusy && (
          <View style={[styles.messageRow, styles.assistantRow]}>
            <View style={styles.botAvatar}>
              <Sparkles size={16} color={colors.primary} />
            </View>
            <View
              style={[
                styles.bubble,
                styles.assistantBubble,
                styles.loadingBubble,
              ]}
            >
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.typingText}>
                {isActionProcessing
                  ? "Procesando alimentos y registrando..."
                  : "Revisando tu día y calculando..."}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {!!sendError && !isSending && (
        <View style={styles.retryCard} accessibilityRole="alert">
          <Text style={styles.retryText}>
            {sendError instanceof Error
              ? sendError.message
              : "No pudimos enviar el mensaje. Tu texto sigue aquí."}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Reintentar mensaje"
            disabled={!inputText.trim() || live.active || !!error}
            style={styles.retryButton}
            onPress={() => handleSend()}
          >
            <Text style={styles.voiceButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input inferior unificado */}
      <View
        testID="coach-composer"
        style={[
          styles.inputContainer,
          { paddingBottom: withinTabs ? 12 : Math.max(insets.bottom, 12) },
        ]}
      >
        <View style={styles.unifiedComposer}>
          <TextInput
            style={styles.textInput}
            accessibilityLabel="Mensaje para el asistente"
            placeholder="Pregúntale a tu Coach..."
            editable={!isBusy && !live.active && !error}
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            style={[
              styles.sendButtonInline,
              (!inputText.trim() || isBusy || live.active || !!error) &&
                styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isBusy || live.active || !!error}
          >
            <Send size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 48 : 20,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  companionCard: { flexDirection: "row", alignItems: "center", marginBottom: 16, padding: 10, borderRadius: 22, backgroundColor: "#EDF8F1", borderWidth: 1, borderColor: "#D5EBDD", gap: 8 },
  companionCopy: { flex: 1, minWidth: 0, gap: 7 },
  companionEyebrow: { color: "#39845A", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  companionTitle: { color: "#214B35", fontSize: 16, fontWeight: "800", lineHeight: 21 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#2FAD77" },
  companionStatus: { flex: 1, color: "#44735A", fontSize: 11, lineHeight: 16 },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  welcomeCard: {
    paddingHorizontal: 2,
    alignItems: "flex-start",
    marginVertical: 8,
  },
  welcomeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  welcomeIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  welcomeDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 14,
    gap: 8,
  },
  userRow: {
    justifyContent: "flex-end",
  },
  assistantRow: {
    justifyContent: "flex-start",
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    flexShrink: 1,
    maxWidth: "88%",
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: 8,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  assistantText: {
    color: colors.text,
  },
  typingText: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  msgFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
  },
  miniListenBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  miniListenBtnActive: {
    backgroundColor: colors.dangerLight,
  },
  promptsContainer: {
    marginTop: 16,
    marginBottom: 22,
  },
  promptsTitle: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 10 },
  promptsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  promptChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: 0,
    minHeight: 112,
    padding: 14,
    borderRadius: 18,
  },
  promptWide: { flexBasis: "22%" },
  promptIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.primaryLight, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  promptChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "700",
  },
  promptDescription: { fontSize: 11, lineHeight: 16, color: colors.textSecondary, marginTop: 4 },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  unifiedComposer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: colors.text,
    maxHeight: 120,
    paddingTop: Platform.OS === "ios" ? 6 : 8,
    paddingBottom: Platform.OS === "ios" ? 6 : 8,
    paddingHorizontal: 0,
  },
  sendButtonInline: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  voiceBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.cardBorder },
  voiceButton: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, padding: 12, backgroundColor: colors.primaryLight, borderRadius: 18, borderWidth: 1, borderColor: "#D3EADB" },
  voiceButtonActive: { backgroundColor: "#FFF5F5", borderColor: "#ECCFD2" },
  voiceIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  voiceIconActive: { backgroundColor: colors.dangerLight },
  voiceCopy: { flex: 1, minWidth: 0 },
  voiceButtonText: { color: colors.primaryDark, fontWeight: "700", fontSize: 13, flexShrink: 1 },
  voiceHint: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 3 },
  voiceError: { color: colors.textSecondary, paddingHorizontal: 16, paddingVertical: 8, fontSize: 13 },
  liveDraft: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, backgroundColor: colors.primaryLight, padding: 14, gap: 6, marginBottom: 12 },
  draftText: { color: colors.text, fontSize: 14, lineHeight: 21 },
  retryCard: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#FFF7E8", borderTopWidth: 1, borderColor: "#F1DFC1" },
  retryText: { flex: 1, color: "#6D532D", fontSize: 12, lineHeight: 18 },
  retryButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10 },
});
