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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCoachChat } from "@/hooks/useCoachChat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sparkles, ArrowLeft, Send, Volume2, Square, Mic } from "lucide-react-native";
import { StateCard } from "@/components/common/AppUI";
import { colors } from "@/constants/colors";
import { CoachMessageContent } from "@/components/coach/CoachMessageContent";
import { useCoachSpeech } from "@/hooks/useCoachSpeech";
import { useCoachLive } from "@/hooks/useCoachLive";
import { CoachBuddy, BuddyMood } from "@/components/coach/CoachBuddy";

export default function CoachChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { initialPrompt } = useLocalSearchParams<{ initialPrompt?: string }>();
  const { messages, isLoading, error, refetch, sendMessage, isSending, sendError, pendingMessage } =
    useCoachChat();
  const [inputText, setInputText] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const speech = useCoachSpeech();
  const live = useCoachLive();
  const buddyMood: BuddyMood = isSending ? "thinking" : live.status === "speaking" || speech.speakingId
    ? "speaking" : live.active ? "listening" : "ready";
  const buddyStatus = isSending ? "Preparando ideas para ti…" : buddyMood === "speaking"
    ? "Tengo algo para contarte" : live.active ? "Estoy contigo. Te escucho" : "Un paso a la vez, juntos";

  useEffect(() => {
    if (initialPrompt && typeof initialPrompt === "string") {
      setInputText(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isSending, live.draft]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending || live.active) return;

    setInputText("");
    try {
      await sendMessage(text);
    } catch {
      setInputText(text);
    }
  };

  const quickPrompts = [
    "¿Qué puedo cenar con las calorías que me faltan hoy?",
    "¿Cómo voy con mi meta de proteína de hoy?",
    "Recomiéndame un snack chileno alto en proteína",
    "¿Qué comprar en el supermercado para mis metas?",
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
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
        >
          <ArrowLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Coach IA</Text>
          <Text style={styles.headerSubtitle}>
            Ideas para tu rutina, por texto y voz
          </Text>
        </View>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.companionCard}>
        <CoachBuddy mood={buddyMood} />
        <View style={styles.companionCopy}>
          <Text style={styles.companionEyebrow}>TU COMPAÑERO DE CADA DÍA</Text>
          <Text style={styles.companionTitle}>Pequeñas ideas. Grandes hábitos.</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.companionStatus} accessibilityLiveRegion="polite">{buddyStatus}</Text>
          </View>
        </View>
      </View>

      {live.supported && (
        <View style={styles.voiceBar}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={live.active ? "Terminar conversación por voz" : "Conversar por voz"}
            disabled={isSending || isLoading || !!error} style={styles.voiceButton}
            onPress={() => { speech.stop(); if (live.active) live.stop(); else live.start(); }}>
            {live.active ? <Square size={17} color={colors.primary} /> : <Mic size={17} color={colors.primary} />}
            <Text style={styles.voiceButtonText}>{live.active ? "Terminar conversación" : "Conversar por voz"}</Text>
          </TouchableOpacity>
          <Text style={styles.voiceHint} accessibilityLiveRegion="polite">
            {live.status === "connecting" ? "Conectando…" : live.status === "speaking" ? "El coach responde" : live.status === "listening" ? "Te escucho" : "Sesiones de hasta 2 min"}
          </Text>
        </View>
      )}
      {(speech.error || live.error) && <Text style={styles.voiceError} accessibilityRole="alert">{live.error || speech.error}</Text>}

      {/* Mensajes */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
      >
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
            <View style={styles.welcomeIconWrap}>
              <Sparkles size={28} color={colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>¿Qué hacemos hoy?</Text>
            <Text style={styles.welcomeDesc}>
              Explora ideas de comidas, aclara tus dudas sobre nutrientes y
              organiza tu rutina a partir de tus registros y metas. Elige una idea abajo o cuéntame lo que necesitas.
            </Text>
          </View>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === "user";
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
                {isUser ? <Text selectable style={[styles.bubbleText, styles.userText]}>{msg.content}</Text> : (
                  <>
                    <CoachMessageContent content={msg.content} />
                    {speech.supported && <TouchableOpacity accessibilityRole="button"
                      accessibilityLabel={speech.speakingId === msg.id ? "Detener lectura" : "Escuchar respuesta"}
                      style={styles.listenButton} onPress={() => { live.stop(); speech.toggle(msg.id, msg.content); }}>
                      {speech.speakingId === msg.id ? <Square size={15} color={colors.primary} /> : <Volume2 size={15} color={colors.primary} />}
                      <Text style={styles.voiceButtonText}>{speech.speakingId === msg.id ? "Detener" : "Escuchar"}</Text>
                    </TouchableOpacity>}
                  </>
                )}
              </View>
            </View>
          );
        })}

        {live.active && (live.draft.user || live.draft.assistant) && <View style={styles.liveDraft} accessibilityLiveRegion="polite">
          {!!live.draft.user && <Text style={styles.draftText}>Tú: {live.draft.user}</Text>}
          {!!live.draft.assistant && <Text style={styles.draftText}>Coach: {live.draft.assistant}</Text>}
        </View>}

        {isSending && !!pendingMessage && (
          <View style={[styles.messageRow, styles.userRow]}>
            <View style={[styles.bubble, styles.userBubble]}>
              <Text style={[styles.bubbleText, styles.userText]}>{pendingMessage}</Text>
            </View>
          </View>
        )}

        {isSending && (
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
                Revisando tu día y calculando...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {!!sendError && !isSending && <View style={styles.retryCard} accessibilityRole="alert">
        <Text style={styles.retryText}>{sendError instanceof Error ? sendError.message : "No pudimos enviar el mensaje. Tu texto sigue aquí."}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reintentar mensaje"
          disabled={!inputText.trim() || live.active || !!error} style={styles.retryButton} onPress={() => handleSend()}>
          <Text style={styles.voiceButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>}

      {/* Chips de preguntas sugeridas */}
      {messages.length < 3 && (
        <View style={styles.promptsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptsRow}
          >
            {quickPrompts.map((p) => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={p}
                disabled={isSending || live.active || !!error}
                key={p}
                style={styles.promptChip}
                onPress={() => handleSend(p)}
              >
                <Text style={styles.promptChipText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input inferior */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          accessibilityLabel="Mensaje para el asistente"
          placeholder="¿Qué te gustaría saber?"
          editable={!isSending && !live.active && !error}
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
            styles.sendButton,
            (!inputText.trim() || isSending || live.active || !!error) &&
              styles.sendButtonDisabled,
          ]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || isSending || live.active || !!error}
        >
          <Send size={18} color="#FFFFFF" />
        </TouchableOpacity>
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
  },
  backBtnText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
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
  companionCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 12, marginBottom: 4, padding: 10, borderRadius: 22, backgroundColor: "#EDF8F1", borderWidth: 1, borderColor: "#D5EBDD", gap: 8 },
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
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginVertical: 6,
  },
  welcomeIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
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
    textAlign: "center",
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
  promptsContainer: {
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  promptsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  promptChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 10,
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    maxHeight: 90,
  },
  sendButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  voiceBar: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.cardBorder },
  voiceButton: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 12, backgroundColor: colors.primaryLight, borderRadius: 12 },
  voiceButtonText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  voiceHint: { color: colors.textSecondary, fontSize: 12 },
  voiceError: { color: colors.textSecondary, paddingHorizontal: 16, paddingVertical: 8, fontSize: 13 },
  listenButton: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", minHeight: 44, paddingTop: 8, marginTop: 8, borderTopWidth: 1, borderColor: colors.cardBorder },
  liveDraft: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, backgroundColor: colors.primaryLight, padding: 14, gap: 6, marginBottom: 12 },
  draftText: { color: colors.text, fontSize: 14, lineHeight: 21 },
  retryCard: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#FFF7E8", borderTopWidth: 1, borderColor: "#F1DFC1" },
  retryText: { flex: 1, color: "#6D532D", fontSize: 12, lineHeight: 18 },
  retryButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10 },
});
