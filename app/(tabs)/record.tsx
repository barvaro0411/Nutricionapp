import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Camera,
  Mic,
  Barcode,
  Star,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Utensils,
} from "lucide-react-native";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { TextVoiceModal } from "@/components/meal/TextVoiceModal";
import { FavoritesModal } from "@/components/meal/FavoritesModal";
import { MealType } from "@/types/meal";
import { colors } from "@/constants/colors";

export default function RecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: MealType }>();

  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    params.mealType || "almuerzo"
  );
  const [showTextVoiceModal, setShowTextVoiceModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);

  const beginMeal = () => {
    useMealReviewStore.getState().reset();
  };

  const mealTypes: { type: MealType; label: string; emoji: string }[] = [
    { type: "desayuno", label: "Desayuno", emoji: "🌅" },
    { type: "almuerzo", label: "Almuerzo", emoji: "🍽️" },
    { type: "cena", label: "Once / Cena", emoji: "🥗" },
    { type: "snack", label: "Colación", emoji: "🍎" },
  ];

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Selector de Tiempo de Comida */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Qué comida vas a registrar?</Text>
          <View style={styles.mealTypesRow}>
            {mealTypes.map((m) => {
              const active = selectedMealType === m.type;
              return (
                <TouchableOpacity
                  key={m.type}
                  style={[styles.mealTypeChip, active && styles.mealTypeChipActive]}
                  onPress={() => setSelectedMealType(m.type)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.mealTypeEmoji}>{m.emoji}</Text>
                  <Text
                    style={[
                      styles.mealTypeLabel,
                      active && styles.mealTypeLabelActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sección de Métodos de Registro */}
        <Text style={styles.sectionTitle}>Elige cómo registrar:</Text>

        {/* 1. Foto con IA (Destacada) */}
        <TouchableOpacity
          style={[styles.methodCard, styles.methodCardFeatured]}
          onPress={() => {
            beginMeal();
            router.push({
              pathname: "/meal/camera",
              params: { suggestedMealType: selectedMealType },
            });
          }}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
            <Camera size={24} color="#FFFFFF" />
          </View>
          <View style={styles.methodInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.methodTitle}>Foto IA de tu plato</Text>
              <View style={styles.featuredBadge}>
                <Sparkles size={11} color="#FFFFFF" />
                <Text style={styles.featuredBadgeText}>MÁS RÁPIDO</Text>
              </View>
            </View>
            <Text style={styles.methodDesc}>
              Toma una foto de tu comida. La IA detecta alimentos, estima porciones y calcula calorías automáticamente.
            </Text>
          </View>
          <ChevronRight size={18} color={colors.primary} />
        </TouchableOpacity>

        {/* 2. Escribir o Dictar por Voz */}
        <TouchableOpacity
          style={styles.methodCard}
          onPress={() => {
            beginMeal();
            setShowTextVoiceModal(true);
          }}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, { backgroundColor: "#EEF2FF" }]}>
            <Mic size={24} color="#6366F1" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Texto o Dictado por Voz</Text>
            <Text style={styles.methodDesc}>
              Escribe o dicta lo que comiste (ej: "2 huevos revueltos con una marraqueta y café").
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* 3. Escáner de Código de Barras */}
        <TouchableOpacity
          style={styles.methodCard}
          onPress={() => {
            beginMeal();
            router.push("/meal/barcode");
          }}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, { backgroundColor: "#F0F9FF" }]}>
            <Barcode size={24} color="#0EA5E9" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Código de Barras</Text>
            <Text style={styles.methodDesc}>
              Apunta la cámara al envase de cualquier producto chileno o internacional para leer sus datos.
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* 4. Comidas Frecuentes */}
        <TouchableOpacity
          style={styles.methodCard}
          onPress={() => {
            beginMeal();
            setShowFavoritesModal(true);
          }}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7" }]}>
            <Star size={24} color="#F59E0B" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Comidas Frecuentes</Text>
            <Text style={styles.methodDesc}>
              Registra en 1 toque las combinaciones habituales que ya tienes guardadas en favoritos.
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Botón para volver al Inicio */}
        <TouchableOpacity
          style={styles.backHomeBtn}
          onPress={() => router.replace("/(tabs)")}
          activeOpacity={0.8}
        >
          <ArrowLeft size={16} color={colors.textSecondary} />
          <Text style={styles.backHomeText}>Volver al Panel Principal (Hoy)</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Texto / Voz */}
      <TextVoiceModal
        visible={showTextVoiceModal}
        mealType={selectedMealType}
        onClose={() => setShowTextVoiceModal(false)}
      />

      {/* Modal de Comidas Frecuentes */}
      <FavoritesModal
        visible={showFavoritesModal}
        onClose={() => setShowFavoritesModal(false)}
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
    padding: 16,
    paddingBottom: 110,
  },
  section: {
    marginBottom: 20,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  mealTypesRow: {
    flexDirection: "row",
    gap: 8,
  },
  mealTypeChip: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  mealTypeChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  mealTypeEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  mealTypeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  mealTypeLabelActive: {
    color: colors.primaryDark,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  methodCardFeatured: {
    borderColor: colors.primary,
    backgroundColor: "#F0FDF4",
    borderWidth: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  methodInfo: {
    flex: 1,
    paddingRight: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  featuredBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  methodDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  backHomeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  backHomeText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
