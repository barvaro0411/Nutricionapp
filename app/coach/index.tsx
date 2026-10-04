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
import { useRouter } from "expo-router";
import { useCoachChat } from "@/hooks/useCoachChat";
import { showAlert } from "@/utils/alerts";
import { colors } from "@/constants/colors";

export default function CoachChatScreen() {
  const router = useRouter();
  const { messages, isLoading, sendMessage, isSending } = useCoachChat();
  const [inputText, setInputText] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setInputText("");
    try { await sendMessage(text); }
    catch (e) { setInputText(text); showAlert("Coach IA", e instanceof Error ? e.message : "No se pudo enviar el mensaje."); }
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Volver</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Coach Nutricional IA 🤖</Text>
          <Text style={styles.headerSubtitle}>Conoce tus comidas y metas de hoy</Text>
        </View>
        <View style={{ width: 50 }} />
      </View>

      {/* Mensajes */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
      >
        {/* Mensaje de bienvenida inicial si no hay historial */}
        {messages.length === 0 && !isLoading && (
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeIcon}>🥗</Text>
            <Text style={styles.welcomeTitle}>¡Hola! Soy tu Coach de Nutrición</Text>
            <Text style={styles.welcomeDesc}>
              Tengo acceso a tus metas del día, las calorías que has consumido y los macronutrientes que te faltan.
              Pregúntame lo que necesites para optimizar tus comidas.
            </Text>
          </View>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <View
              key={msg.id}
              style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}
            >
              {!isUser && (
                <View style={styles.botAvatar}>
                  <Text style={{ fontSize: 16 }}>🤖</Text>
                </View>
              )}
              <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
                  {msg.content}
                </Text>
              </View>
            </View>
          );
        })}

        {isSending && (
          <View style={[styles.messageRow, styles.assistantRow]}>
            <View style={styles.botAvatar}>
              <Text style={{ fontSize: 16 }}>🤖</Text>
            </View>
            <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.typingText}>Revisando tu día y calculando...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Chips de preguntas sugeridas */}
      {messages.length < 3 && (
        <View style={styles.promptsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptsRow}>
            {quickPrompts.map((p) => (
              <TouchableOpacity key={p} style={styles.promptChip} onPress={() => handleSend(p)}>
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
          placeholder="Pregúntale a tu coach nutricional..."
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={400}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || isSending}
        >
          <Text style={styles.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
  },
  headerCenter: {
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
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginVertical: 20,
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
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
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
});
