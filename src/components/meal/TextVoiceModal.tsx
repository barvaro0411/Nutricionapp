import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import React, { useState, useRef, useEffect } from "react";
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
  ScrollView,
} from "react-native";
import { PencilLine, Mic, X, Sparkles, RotateCcw } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTextAudioMeal } from "@/hooks/useTextAudioMeal";
import { colors } from "@/constants/colors";
import { MealType } from "@/types/meal";

interface TextVoiceModalProps {
  visible: boolean;
  mealType?: MealType;
  onClose: () => void;
}

export function TextVoiceModal({ visible, mealType = "almuerzo", onClose }: TextVoiceModalProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedPreview, setTranscribedPreview] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const recording = useRef<Audio.Recording | null>(null);
  const busy = useRef(false);
  useEffect(() => {
    if (visible) return;
    const pending = recording.current;
    recording.current = null;
    setIsRecording(false);
    setTranscribedPreview(false);
    setCaptureError(null);
    if (pending) void pending.stopAndUnloadAsync().catch(() => undefined);
    if (Platform.OS !== "web") void Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => undefined);
  }, [visible]);
  useEffect(() => () => { void recording.current?.stopAndUnloadAsync().catch(() => undefined); }, []);

  const { parseTextMeal, transcribeAudioMeal, processing, isTranscribing, error } = useTextAudioMeal();

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const res = await parseTextMeal(inputText, mealType);
    if (res.success) {
      setInputText("");
      setTranscribedPreview(false);
      onClose();
    }
  };

  const webSpeechRef = useRef<any>(null);

  const handleVoiceCapture = async () => {
    if (busy.current || processing || isTranscribing) return;
    busy.current = true;
    setCaptureError(null);
    try {
      // En Web/PWA: priorizar Web Speech API en el dispositivo (latencia 0 y sin costo de servidor)
      const SpeechRecognitionCtor =
        Platform.OS === "web" && typeof window !== "undefined"
          ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
          : null;

      if (SpeechRecognitionCtor && !recording.current) {
        if (webSpeechRef.current) {
          webSpeechRef.current.stop();
          webSpeechRef.current = null;
          setIsRecording(false);
          return;
        }
        const recognition = new SpeechRecognitionCtor();
        recognition.lang = "es-CL";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = (event: any) => {
          const transcript = event?.results?.[0]?.[0]?.transcript?.trim();
          if (transcript) {
            setInputText(transcript);
            setTranscribedPreview(true);
          }
          setIsRecording(false);
          webSpeechRef.current = null;
        };
        recognition.onerror = () => {
          setIsRecording(false);
          webSpeechRef.current = null;
          setCaptureError("No se pudo transcribir desde el navegador. Intenta de nuevo o escribe tu comida.");
        };
        recognition.onend = () => {
          setIsRecording(false);
          webSpeechRef.current = null;
        };
        webSpeechRef.current = recognition;
        setIsRecording(true);
        recognition.start();
        return;
      }

      if (!recording.current) {
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) throw new Error("Permite el acceso al micrófono para grabar.");
        if (Platform.OS !== "web") await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const result = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        recording.current = result.recording;
        setIsRecording(true);
      } else {
        const captured = recording.current;
        recording.current = null;
        setIsRecording(false);
        await captured.stopAndUnloadAsync();
        if (Platform.OS !== "web") await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const uri = captured.getURI();
        if (!uri) throw new Error("No se pudo obtener el audio. Intenta grabar de nuevo.");
        let base64: string;
        let mime = "audio/mp4";
        if (Platform.OS === "web") {
          const blob = await (await fetch(uri)).blob();
          mime = blob.type.split(";")[0] || "audio/webm";
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.onerror = () => reject(new Error("No se pudo leer el audio."));
            reader.readAsDataURL(blob);
          });
          URL.revokeObjectURL(uri);
        } else {
          base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
        if (base64.length > 6000000) throw new Error("El audio es demasiado largo. Graba una descripción más breve.");

        // Transcribir el audio para que el usuario pueda revisarlo y editarlo antes de analizar con IA
        const res = await transcribeAudioMeal(base64, mime);
        if (res.success && res.transcript) {
          setInputText(res.transcript);
          setTranscribedPreview(true);
        }
      }
    } catch (e) {
      setIsRecording(false);
      if (recording.current) await recording.current.stopAndUnloadAsync().catch(() => undefined);
      recording.current = null;
      setCaptureError(e instanceof Error ? e.message : "No se pudo grabar el audio.");
    } finally { busy.current = false; }
  };

  const handleSelectShortcut = (text: string) => {
    setInputText(text);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => { if (!processing && !isTranscribing) onClose(); }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <ScrollView style={styles.sheet} contentContainerStyle={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) }]} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.tabsRow}>
              <TouchableOpacity
                accessibilityRole="button" accessibilityLabel="Escribir comida" aria-pressed={mode === "text"}
                disabled={isRecording || processing || isTranscribing}
                style={[styles.tabBtn, mode === "text" && styles.tabBtnActive]}
                onPress={() => { if (!isRecording && !processing && !isTranscribing) setMode("text"); }}
              >
                <PencilLine size={17} color={mode === "text" ? colors.primary : colors.textSecondary} />
                <Text style={[styles.tabBtnText, mode === "text" && styles.tabBtnTextActive]}>Escribir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button" accessibilityLabel="Dictar comida por voz" aria-pressed={mode === "voice"}
                disabled={isRecording || processing || isTranscribing}
                style={[styles.tabBtn, mode === "voice" && styles.tabBtnActive]}
                onPress={() => { if (!isRecording && !processing && !isTranscribing) setMode("voice"); }}
              >
                <Mic size={17} color={mode === "voice" ? colors.primary : colors.textSecondary} />
                <Text style={[styles.tabBtnText, mode === "voice" && styles.tabBtnTextActive]}>Dictar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar registro por texto o voz" disabled={processing || isTranscribing} style={styles.closeBtn} onPress={() => { if (!processing && !isTranscribing) onClose(); }}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {(error || captureError) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{captureError || error}</Text>
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
              {transcribedPreview ? (
                <View style={styles.previewBox}>
                  <View style={styles.previewBadge}>
                    <Sparkles size={16} color={colors.primaryDark} />
                    <Text style={styles.previewBadgeText}>Voz transcrita lista para confirmar</Text>
                  </View>
                  <Text style={styles.previewInstruction}>
                    Revisa o edita lo que interpretamos antes de calcular los nutrientes con IA:
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    multiline
                    numberOfLines={4}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Edita la comida si es necesario..."
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={styles.previewTip}>
                    💡 Puedes corregir porciones, marcas o ingredientes adicionales antes de enviar.
                  </Text>

                  <View style={styles.previewActionsRow}>
                    <TouchableOpacity
                      style={styles.retryBtn}
                      onPress={() => {
                        setTranscribedPreview(false);
                        setInputText("");
                      }}
                      disabled={processing}
                    >
                      <RotateCcw size={16} color={colors.textSecondary} />
                      <Text style={styles.retryBtnText}>Re-grabar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, (!inputText.trim() || processing) && styles.btnDisabled, { flex: 1 }]}
                      onPress={handleSendText}
                      disabled={!inputText.trim() || processing}
                    >
                      {processing ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.actionBtnText}>Confirmar y procesar ⚡</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.instruction}>
                    Toca para grabar y vuelve a tocar para transcribir. Usa una descripción breve.
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.micButton,
                      isRecording && styles.micButtonRecording,
                      (isTranscribing || processing) && styles.btnDisabled,
                    ]}
                    onPress={handleVoiceCapture}
                    disabled={processing || isTranscribing}
                  >
                    {isTranscribing ? (
                      <ActivityIndicator size="large" color={colors.primary} />
                    ) : (
                      <Text style={styles.micIcon}>{isRecording ? "⏹️" : "🎙️"}</Text>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.voiceStatusText}>
                    {isRecording
                      ? "Escuchando... Di lo que comiste (ej: 'una empanada de pino')"
                      : isTranscribing
                      ? "Transcribiendo tu voz con IA..."
                      : processing
                      ? "Interpretando alimentos y porciones..."
                      : "Toca el micrófono para comenzar"}
                  </Text>

                  {(processing || isTranscribing) && (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
                  )}
                </>
              )}
            </View>
          )}
        </ScrollView>
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
    flexGrow: 0,
    maxHeight: "90%",
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetContent: { padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  tabsRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
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
    width: 44,
    height: 44,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.background,
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
  previewBox: {
    width: "100%",
    marginTop: 4,
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  previewBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  previewInstruction: {
    fontSize: 13.5,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  previewTip: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -6,
    marginBottom: 14,
  },
  previewActionsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
