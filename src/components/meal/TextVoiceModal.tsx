import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTextAudioMeal } from "@/hooks/useTextAudioMeal";
import { colors } from "@/constants/colors";
import { MealType } from "@/types/meal";

interface TextVoiceModalProps {
  visible: boolean;
  mealType?: MealType;
  onClose: () => void;
}

export function TextVoiceModal({ visible, mealType = "almuerzo", onClose }: TextVoiceModalProps) {
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const { parseTextMeal, parseAudioMeal, processing, error } = useTextAudioMeal();

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const res = await parseTextMeal(inputText, mealType);
    if (res.success) {
      setInputText("");
      onClose();
    }
  };

  const handleSimulatedVoiceCapture = async () => {
    // Modo voz interactivo
    if (!isRecording) {
      setIsRecording(true);
      // En una sesión real se inicia audio recorder; aquí capturamos la simulación
      setTimeout(async () => {
        setIsRecording(false);
        // Si el usuario no escribió nada, enviamos una frase de ejemplo o procesamos
        if (inputText.trim()) {
          const res = await parseTextMeal(inputText, mealType);
          if (res.success) onClose();
        } else {
          const sampleAudioDictation = "Me comí dos batidos de marraqueta con palta y un café con leche";
          setInputText(sampleAudioDictation);
          const res = await parseTextMeal(sampleAudioDictation, mealType);
          if (res.success) onClose();
        }
      }, 2500);
    }
  };

  const handleSelectShortcut = (text: string) => {
    setInputText(text);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tabBtn, mode === "text" && styles.tabBtnActive]}
                onPress={() => setMode("text")}
              >
                <Text style={[styles.tabBtnText, mode === "text" && styles.tabBtnTextActive]}>
                  ✍️ Escribir
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, mode === "voice" && styles.tabBtnActive]}
                onPress={() => setMode("voice")}
              >
                <Text style={[styles.tabBtnText, mode === "voice" && styles.tabBtnTextActive]}>
                  🎙️ Dictar por voz
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {mode === "text" ? (
            <View style={styles.body}>
              <Text style={styles.instruction}>
                Escribe lo que comiste en lenguaje natural chileno:
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Un plato de cazuela de vacuno con ensalada a la chilena y un vaso de agua..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                value={inputText}
                onChangeText={setInputText}
                autoFocus
              />

              {/* Atajos rápidos chilenos */}
              <Text style={styles.shortcutsTitle}>Ideas rápidas:</Text>
              <View style={styles.chipsWrap}>
                {[
                  "1 marraqueta con palta",
                  "Completo italiano tradicional",
                  "Pechuga a la plancha con arroz",
                  "Plato de charquicán con huevo",
                  "Porotos con riendas",
                ].map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    style={styles.chip}
                    onPress={() => handleSelectShortcut(chip)}
                  >
                    <Text style={styles.chipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, (!inputText.trim() || processing) && styles.btnDisabled]}
                onPress={handleSendText}
                disabled={!inputText.trim() || processing}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionBtnText}>Procesar con IA ⚡</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.voiceBody}>
              <Text style={styles.instruction}>
                Mantén presionado o toca para dictar tu comida:
              </Text>

              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonRecording]}
                onPress={handleSimulatedVoiceCapture}
                disabled={processing}
              >
                <Text style={styles.micIcon}>{isRecording ? "⏹️" : "🎙️"}</Text>
              </TouchableOpacity>

              <Text style={styles.voiceStatusText}>
                {isRecording
                  ? "Escuchando... Di lo que comiste (ej: 'una empanada de pino')"
                  : processing
                  ? "Interpretando alimentos y porciones..."
                  : "Toca el micrófono para comenzar"}
              </Text>

              {processing && <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  tabBtnActive: {
    backgroundColor: colors.primaryLight,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  body: {
    marginTop: 4,
  },
  instruction: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: "top",
    minHeight: 100,
    marginBottom: 14,
  },
  shortcutsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
  },
  actionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  voiceBody: {
    alignItems: "center",
    paddingVertical: 20,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  micButtonRecording: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
  },
  micIcon: {
    fontSize: 36,
  },
  voiceStatusText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
