import { showAlert } from "@/utils/alerts";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMealAnalysis } from "@/hooks/useMealAnalysis";
import { colors } from "@/constants/colors";
import { MealType } from "@/types/meal";

export default function CameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ suggestedMealType?: MealType }>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>(params.suggestedMealType || "almuerzo");
  const [note, setNote] = useState("");

  const { analyzePhoto, analyzing, stage, error } = useMealAnalysis();

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showAlert("Permiso requerido", "Se necesita acceso a la cámara para tomar fotos de tu comida.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Permiso requerido", "Se necesita acceso a tu galería para seleccionar fotos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleStartAnalysis = async () => {
    if (!imageUri) return;

    const result = await analyzePhoto(imageUri, mealType, note.trim() || undefined);
    if (result.success) {
      router.replace("/meal/review");
    }
  };

  const getStageText = () => {
    if (stage === "compressing") return "Optimizando imagen...";
    if (stage === "uploading") return "Subiendo foto...";
    if (stage === "analyzing") return "La IA está reconociendo los alimentos chilenos y porciones...";
    return "Procesando...";
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Barra superior */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>✕ Cerrar</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Registrar Comida</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Selector de tipo de comida */}
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
          >
            <Text style={[styles.typePillText, mealType === item.key && styles.typePillTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Área de Visualización / Captura */}
      {imageUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <TouchableOpacity style={styles.retakeBtn} onPress={() => setImageUri(null)}>
            <Text style={styles.retakeBtnText}>Cambiar foto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.captureBox}>
          <Text style={styles.captureIcon}>📸</Text>
          <Text style={styles.captureTitle}>Fotografía tu plato</Text>
          <Text style={styles.captureSubtitle}>
            Enfoca bien tu comida con buena iluminación. La IA detectará los alimentos y calculará las porciones.
          </Text>

          <View style={styles.actionButtonsCol}>
            <TouchableOpacity style={styles.cameraActionBtn} onPress={takePhoto}>
              <Text style={styles.cameraActionBtnText}>📷 Abrir Cámara</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.galleryActionBtn} onPress={pickFromGallery}>
              <Text style={styles.galleryActionBtnText}>🖼️ Elegir de Galería</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Nota opcional para ayudar a la IA */}
      {imageUri && (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>Aclaración opcional para la IA:</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Ej: es pollo a la plancha con marraqueta y sal"
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
          />
        </View>
      )}

      {/* Error si ocurre */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>No pudimos analizar la foto</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Botón de Análisis */}
      {imageUri && (
        <TouchableOpacity
          style={[styles.analyzeButton, analyzing && styles.buttonDisabled]}
          onPress={handleStartAnalysis}
          disabled={analyzing}
        >
          {analyzing ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.loadingStageText}>{getStageText()}</Text>
            </View>
          ) : (
            <Text style={styles.analyzeButtonText}>Analizar con IA ⚡</Text>
          )}
        </TouchableOpacity>
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
    paddingTop: 48,
    paddingBottom: 40,
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  mealTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  typePillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  typePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  typePillTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  captureBox: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: "center",
    marginBottom: 20,
  },
  captureIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  captureTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  captureSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  actionButtonsCol: {
    width: "100%",
    gap: 12,
  },
  cameraActionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  cameraActionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  galleryActionBtn: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  galleryActionBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  previewContainer: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  previewImage: {
    width: "100%",
    height: 280,
    resizeMode: "cover",
  },
  retakeBtn: {
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.background,
  },
  retakeBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  noteBox: {
    marginBottom: 18,
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  noteInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  analyzeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  analyzeButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  loadingStageText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
});
