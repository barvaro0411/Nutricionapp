import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Camera, Image as ImageIcon, RotateCcw, ArrowLeft, Sparkles, AlertCircle } from "lucide-react-native";
import { useMealAnalysis } from "@/hooks/useMealAnalysis";
import { ScanningOverlay } from "@/components/meal/ScanningOverlay";
import { colors } from "@/constants/colors";
import { MealType } from "@/types/meal";
import { showAlert } from "@/utils/alerts";

export default function CameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ suggestedMealType?: MealType }>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>(params.suggestedMealType || "almuerzo");
  const [note, setNote] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);

  const { analyzePhoto, analyzing, stage, error } = useMealAnalysis();

  // Inicia el análisis automático de inmediato al capturar
  const triggerAnalysis = async (uri: string, customNote?: string) => {
    const activeNote = customNote !== undefined ? customNote : note;
    const result = await analyzePhoto(uri, mealType, activeNote.trim() || undefined);
    if (result.success) {
      router.replace("/meal/review");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showAlert("Permiso requerido", "Se necesita acceso a la cámara para fotografiar tu comida.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        // Auto-análisis instantáneo: Snap & Scan
        void triggerAnalysis(uri);
      }
    } catch (err: any) {
      showAlert("Cámara", err?.message || "No se pudo abrir la cámara.");
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert("Permiso requerido", "Se necesita acceso a tu galería para seleccionar fotos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        // Auto-análisis instantáneo: Snap & Scan
        void triggerAnalysis(uri);
      }
    } catch (err: any) {
      showAlert("Galería", err?.message || "No se pudo acceder a las fotos.");
    }
  };

  const handleRetry = () => {
    if (imageUri) {
      void triggerAnalysis(imageUri);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header superior */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          disabled={analyzing}
        >
          <ArrowLeft size={20} color={colors.text} />
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>

        <View style={styles.navTitleWrap}>
          <Text style={styles.navTitle}>Cámara IA</Text>
        </View>

        <View style={{ width: 60 }} />
      </View>

      {/* Selector de horario de comida */}
      <View style={styles.mealTypeRow}>
        {(
          [
            { key: "desayuno", label: "Desayuno" },
            { key: "almuerzo", label: "Almuerzo" },
            { key: "cena", label: "Once/Cena" },
            { key: "snack", label: "Snack" },
          ] as const
        ).map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.typePill, mealType === item.key && styles.typePillActive]}
            onPress={() => setMealType(item.key)}
            disabled={analyzing}
          >
            <Text
              style={[
                styles.typePillText,
                mealType === item.key && styles.typePillTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Si ya hay imagen: Vista previa + Efecto de Escaneo Láser */}
      {imageUri ? (
        <View style={styles.photoContainer}>
          <View style={styles.imageFrame}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />

            {/* Capa animada de escaneo HUD durante el análisis */}
            {analyzing && <ScanningOverlay stage={stage} />}
          </View>

          {/* Opciones cuando la foto ya fue tomada */}
          {!analyzing && (
            <View style={styles.postCaptureActions}>
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={() => {
                  setImageUri(null);
                }}
                activeOpacity={0.8}
              >
                <RotateCcw size={16} color={colors.textSecondary} />
                <Text style={styles.retakeBtnText}>Tomar otra foto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reanalyzeBtn}
                onPress={handleRetry}
                activeOpacity={0.85}
              >
                <Sparkles size={16} color="#FFFFFF" />
                <Text style={styles.reanalyzeBtnText}>Analizar de nuevo</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Campo opcional de aclaración */}
          {!analyzing && (
            <View style={styles.noteContainer}>
              <TouchableOpacity
                onPress={() => setShowNoteField(!showNoteField)}
                style={styles.toggleNoteBtn}
              >
                <Text style={styles.toggleNoteText}>
                  {showNoteField ? "Ocultar nota" : "✏️ ¿Quieres aclararle algo a la IA?"}
                </Text>
              </TouchableOpacity>

              {showNoteField && (
                <View style={styles.noteInputWrap}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Ej: Es pechuga a la plancha sin aceite y arroz integral"
                    placeholderTextColor={colors.textMuted}
                    value={note}
                    onChangeText={setNote}
                    onSubmitEditing={() => triggerAnalysis(imageUri, note)}
                    returnKeyType="go"
                  />
                  <TouchableOpacity
                    style={styles.applyNoteBtn}
                    onPress={() => triggerAnalysis(imageUri, note)}
                  >
                    <Text style={styles.applyNoteBtnText}>Aplicar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Error si ocurre durante el escaneo */}
          {error && !analyzing && (
            <View style={styles.errorBox}>
              <View style={styles.errorHeader}>
                <AlertCircle size={18} color={colors.danger} />
                <Text style={styles.errorTitle}>No pudimos analizar la foto</Text>
              </View>
              <Text style={styles.errorText}>{error}</Text>

              <TouchableOpacity
                style={styles.errorRetryBtn}
                onPress={handleRetry}
                activeOpacity={0.8}
              >
                <Text style={styles.errorRetryBtnText}>Reintentar con esta foto</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        /* Pantalla inicial de bienvenida a la cámara */
        <View style={styles.welcomeCard}>
          <View style={styles.cameraIconBadge}>
            <Camera size={38} color={colors.primary} />
          </View>

          <Text style={styles.welcomeTitle}>Fotografía tu plato</Text>
          <Text style={styles.welcomeDesc}>
            Apunta desde arriba con buena iluminación. La IA detectará los alimentos chilenos,
            estimará porciones en gramos y calculará las calorías al instante.
          </Text>

          <View style={styles.captureButtonsCol}>
            <TouchableOpacity
              style={styles.mainCameraBtn}
              onPress={takePhoto}
              activeOpacity={0.85}
            >
              <Camera size={22} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.mainCameraBtnText}>Tomar Foto Ahora</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.galleryBtn}
              onPress={pickFromGallery}
              activeOpacity={0.8}
            >
              <ImageIcon size={20} color={colors.text} />
              <Text style={styles.galleryBtnText}>Elegir de mi Galería</Text>
            </TouchableOpacity>
          </View>

          {/* Nota opcional previa */}
          <View style={styles.preNoteContainer}>
            <Text style={styles.preNoteLabel}>Aclaración opcional previa:</Text>
            <TextInput
              style={styles.preNoteInput}
              placeholder="Ej: es ensalada sin aderezo / leche descremada"
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 36,
    paddingBottom: 40,
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  navTitleWrap: {
    alignItems: "center",
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  mealTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  typePillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  typePillText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  typePillTextActive: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cameraIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  welcomeDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 26,
    paddingHorizontal: 8,
  },
  captureButtonsCol: {
    width: "100%",
    gap: 12,
  },
  mainCameraBtn: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  mainCameraBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  galleryBtn: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    paddingVertical: 15,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  galleryBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  preNoteContainer: {
    width: "100%",
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  preNoteLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  preNoteInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
  },
  photoContainer: {
    width: "100%",
  },
  imageFrame: {
    width: "100%",
    height: 320,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  postCaptureActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  retakeBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  reanalyzeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 14,
  },
  reanalyzeBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  noteContainer: {
    marginTop: 14,
  },
  toggleNoteBtn: {
    alignSelf: "center",
    paddingVertical: 6,
  },
  toggleNoteText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  noteInputWrap: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  noteInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
  },
  applyNoteBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: 12,
  },
  applyNoteBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    padding: 16,
    borderRadius: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "800",
  },
  errorText: {
    color: "#991B1B",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  errorRetryBtn: {
    backgroundColor: colors.danger,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  errorRetryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
