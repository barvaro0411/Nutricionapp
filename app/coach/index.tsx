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
import { useCoachChat } from "@/hooks/useCoachChat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sparkles, ArrowLeft, Send, Volume2, Square, Mic, Utensils, Target, Apple, ShoppingBasket, ArrowUpRight } from "lucide-react-native";
import { StateCard } from "@/components/common/AppUI";
import { colors } from "@/constants/colors";
import { CoachMessageContent } from "@/components/coach/CoachMessageContent";
import { useCoachSpeech } from "@/hooks/useCoachSpeech";
import { useCoachLive } from "@/hooks/useCoachLive";
import { CoachBuddy, BuddyMood } from "@/components/coach/CoachBuddy";

export default function CoachChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const withinTabs = useSegments()[0] === "(tabs)";
  const wide = useWindowDimensions().width >= 760;
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
    if (messages.length || isSending || live.draft.user || live.draft.assistant) scrollViewRef.current?.scrollToEnd({ animated: true });
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
        <View style={styles.headerIcon}><Sparkles size={20} color={colors.primary} /></View>
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
                  disabled={isSending || live.active} onPress={() => handleSend(prompt)}
                  style={[styles.promptChip, wide && styles.promptWide, (isSending || live.active) && styles.sendButtonDisabled]}>
                  <View style={styles.promptIcon}><Icon size={18} color={colors.primary} /></View>
                  <Text style={styles.promptChipText}>{title}</Text><Text style={styles.promptDescription}>{description}</Text>
                </TouchableOpacity>
              ))}
            </View>
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

      {/* Input inferior */}
      <View testID="coach-composer" style={[styles.inputContainer, { paddingBottom: withinTabs ? 12 : Math.max(insets.bottom, 12) }]}>
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
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
  },
  headerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
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
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
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
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    maxHeight: 120,
  },
  sendButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
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
  voiceBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.cardBorder },
  voiceButton: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, padding: 12, backgroundColor: colors.primaryLight, borderRadius: 18, borderWidth: 1, borderColor: "#D3EADB" },
  voiceButtonActive: { backgroundColor: "#FFF5F5", borderColor: "#ECCFD2" },
  voiceIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  voiceIconActive: { backgroundColor: colors.dangerLight },
  voiceCopy: { flex: 1, minWidth: 0 },
  voiceButtonText: { color: colors.primaryDark, fontWeight: "700", fontSize: 13, flexShrink: 1 },
  voiceHint: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 3 },
  voiceError: { color: colors.textSecondary, paddingHorizontal: 16, paddingVertical: 8, fontSize: 13 },
  listenButton: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", minHeight: 44, paddingHorizontal: 12, marginTop: 12, backgroundColor: colors.primaryLight, borderRadius: 12 },
  liveDraft: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, backgroundColor: colors.primaryLight, padding: 14, gap: 6, marginBottom: 12 },
  draftText: { color: colors.text, fontSize: 14, lineHeight: 21 },
  retryCard: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#FFF7E8", borderTopWidth: 1, borderColor: "#F1DFC1" },
  retryText: { flex: 1, color: "#6D532D", fontSize: 12, lineHeight: 18 },
  retryButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10 },
});
