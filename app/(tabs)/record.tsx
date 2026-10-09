import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  Search,
  PencilLine,
  CalendarDays,
  Check,
} from "lucide-react-native";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { TextVoiceModal } from "@/components/meal/TextVoiceModal";
import { FavoritesModal } from "@/components/meal/FavoritesModal";
import { UsdaSearchModal } from "@/components/meal/UsdaSearchModal";
import { MealType } from "@/types/meal";
import { colors, layout } from "@/constants/colors";
import { PageHeading } from "@/components/common/AppUI";
import { getDateKey, dateForMealRoute, loggedAtForDate, APP_TIME_ZONE } from "@/utils/dates";

export default function RecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: MealType; date?: string }>();

  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    params.mealType || "almuerzo"
  );
  const [showTextVoiceModal, setShowTextVoiceModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    if (params.mealType) setSelectedMealType(params.mealType);
  }, [params.mealType]);

  const selectedDate = dateForMealRoute(params.date);
  const dateKey = getDateKey(selectedDate);

  const beginMeal = () => {
    useMealReviewStore.getState().reset();
    useMealReviewStore.getState().setLoggedAt(loggedAtForDate(selectedDate));
    useMealReviewStore.getState().setMealType(selectedMealType);
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
        <PageHeading eyebrow="Tu diario de alimentación" title="Añadir alimentos" description="Busca un alimento o registra tu plato completo. Revisa la porción y guarda cuando esté listo." />
        <View style={styles.dateBanner}>
          <CalendarDays size={18} color={colors.primary} />
          <Text style={styles.dateText}>{dateKey === getDateKey() ? "Hoy" : "Registrando para"} · {selectedDate.toLocaleDateString("es-CL", { timeZone: APP_TIME_ZONE, day: "numeric", month: "long" })}</Text>
          {dateKey !== getDateKey() && <TouchableOpacity accessibilityRole="button" onPress={() => router.setParams({ date: getDateKey() })} style={styles.todayButton}><Text style={styles.todayText}>Ir a hoy</Text></TouchableOpacity>}
        </View>
        {/* Selector de Tiempo de Comida */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Elige la comida</Text>
          <View style={styles.mealTypesRow}>
            {mealTypes.map((m) => {
              const active = selectedMealType === m.type;
              return (
                <TouchableOpacity
                  key={m.type}
                  style={[styles.mealTypeChip, active && styles.mealTypeChipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Elegir ${m.label}`}
                  accessibilityState={{ selected: active }}
                  aria-pressed={active}
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
                  {active && <View style={styles.mealCheck}><Check size={10} color="white" strokeWidth={3} /></View>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sección de Métodos de Registro */}
        <Text style={styles.sectionTitle}>2. Añade lo que comiste</Text>
        <TouchableOpacity style={styles.searchCard} accessibilityRole="button" accessibilityLabel="Buscar un alimento" activeOpacity={0.85}
          onPress={() => { beginMeal(); setShowSearchModal(true); }}>
          <View style={styles.searchTop}><View style={styles.searchIcon}><Search size={24} color={colors.mint} /></View><View style={styles.catalogBadge}><Text style={styles.catalogBadgeText}>CATÁLOGO USDA</Text></View></View>
          <Text style={styles.searchTitle}>Encuentra tu alimento</Text>
          <Text style={styles.searchDescription}>Busca en español, elige cómo está preparado y ajusta tu porción.</Text>
          <View style={styles.searchField}><Search size={17} color={colors.primary} /><Text style={styles.searchPlaceholder}>Arroz cocido, pollo, yogur…</Text><ChevronRight size={18} color={colors.primary} /></View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.manualCard} accessibilityRole="button" accessibilityLabel="Ingresar alimento manualmente" activeOpacity={0.8}
          onPress={() => { beginMeal(); router.push({ pathname: "/meal/review", params: { manual: "1" } }); }}>
          <PencilLine size={20} color={colors.primary} /><View style={styles.methodInfo}><Text style={styles.methodTitle}>Tengo la etiqueta nutricional</Text><Text style={styles.methodDesc}>Ingresa la porción y sus nutrientes a mano.</Text></View><ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.otherMethodsTitle}>O registra tu plato de otra forma</Text>

        {/* 1. Foto con IA (Destacada) */}
        <TouchableOpacity
          style={[styles.methodCard, styles.methodCardFeatured]}
          accessibilityRole="button"
          accessibilityLabel="Registrar con foto de comida"
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
                <Text style={styles.featuredBadgeText}>CON IA</Text>
              </View>
            </View>
            <Text style={styles.methodDesc}>
              Fotografía tu plato y revisa los alimentos y las porciones que estima la IA.
            </Text>
          </View>
          <ChevronRight size={18} color={colors.primary} />
        </TouchableOpacity>

        {/* 2. Escribir o Dictar por Voz */}
        <TouchableOpacity
          style={styles.methodCard}
          accessibilityRole="button"
          accessibilityLabel="Registrar con texto o voz"
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
            <Text style={styles.methodTitle}>Escribir o dictar</Text>
            <Text style={styles.methodDesc}>
              Describe tu comida con tus palabras, por escrito o con tu voz.
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* 3. Escáner de Código de Barras */}
        <TouchableOpacity
          style={styles.methodCard}
          accessibilityRole="button"
          accessibilityLabel="Registrar con código de barras"
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
              Busca los nutrientes del envase por su código o lee la etiqueta.
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* 4. Comidas Frecuentes */}
        <TouchableOpacity
          style={styles.methodCard}
          accessibilityRole="button"
          accessibilityLabel="Registrar comida frecuente"
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
          accessibilityRole="button"
          onPress={() => router.replace({ pathname: "/(tabs)", params: { date: dateKey } })}
          activeOpacity={0.8}
        >
          <ArrowLeft size={16} color={colors.textSecondary} />
          <Text style={styles.backHomeText}>Volver a mi día</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Texto / Voz */}
      <TextVoiceModal
        visible={showTextVoiceModal}
        mealType={selectedMealType}
        onClose={() => setShowTextVoiceModal(false)}
      />
      {showSearchModal && <UsdaSearchModal onClose={() => setShowSearchModal(false)} onSelect={item => {
        useMealReviewStore.getState().addItem(item);
        router.push("/meal/review");
      }} />}

      {/* Modal de Comidas Frecuentes */}
      <FavoritesModal
        visible={showFavoritesModal}
        mealType={selectedMealType}
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
    ...layout.narrowPage,
  },
  section: {
    marginBottom: 20,
    marginTop: 4,
  },
  dateBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.primaryLight, marginBottom: 24 },
  dateText: { flex: 1, color: colors.primaryDark, fontSize: 12, fontWeight: "600" },
  todayButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 6 },
  todayText: { color: colors.primary, fontWeight: "700", fontSize: 12 },
  mealCheck: { position: "absolute", top: 5, right: 5, backgroundColor: colors.primary, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  searchCard: { backgroundColor: colors.forest, padding: 22, borderRadius: 24, marginBottom: 12 },
  searchTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  searchIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#275747", alignItems: "center", justifyContent: "center" },
  catalogBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: "#275747" },
  catalogBadgeText: { color: colors.mint, fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  searchTitle: { fontSize: 23, fontWeight: "800", color: "white", letterSpacing: -0.5 },
  searchDescription: { fontSize: 13, lineHeight: 20, color: "#CEE1D6", marginTop: 8, marginBottom: 18 },
  searchField: { minHeight: 52, backgroundColor: "white", borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  searchPlaceholder: { flex: 1, color: colors.textSecondary, fontSize: 13 },
  manualCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 16, borderRadius: 18, marginBottom: 24 },
  otherMethodsTitle: { fontSize: 13, color: colors.textSecondary, fontWeight: "600", marginBottom: 12 },
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
    minWidth: 0,
    minHeight: 64,
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
    borderRadius: 16,
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
    flexWrap: "wrap",
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
