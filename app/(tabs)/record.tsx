import React, { useEffect, useState, Suspense, lazy } from "react";
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
import { useFavoriteMeals } from "@/hooks/useFavoriteMeals";
import { useAiConsent } from "@/hooks/useAiConsent";
import { AiConsentModal } from "@/components/common/AiConsentModal";
import { MealType } from "@/types/meal";
import { colors, layout } from "@/constants/colors";
import { PageHeading } from "@/components/common/AppUI";
import { getDateKey, dateForMealRoute, loggedAtForDate, APP_TIME_ZONE } from "@/utils/dates";

const TextVoiceModal = lazy(() =>
  import("@/components/meal/TextVoiceModal").then((m) => ({ default: m.TextVoiceModal }))
);
const FavoritesModal = lazy(() =>
  import("@/components/meal/FavoritesModal").then((m) => ({ default: m.FavoritesModal }))
);
const UsdaSearchModal = lazy(() =>
  import("@/components/meal/UsdaSearchModal").then((m) => ({ default: m.UsdaSearchModal }))
);

function guessChileanMealTypeByHour(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "desayuno";
  if (hour >= 11 && hour < 16) return "almuerzo";
  if (hour >= 16 && hour < 19) return "snack";
  return "cena";
}

export default function RecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: MealType; date?: string }>();
  const { favorites } = useFavoriteMeals();
  const { hasConsent, setConsent, isUpdating } = useAiConsent();

  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    params.mealType || guessChileanMealTypeByHour()
  );
  const [showTextVoiceModal, setShowTextVoiceModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [pendingAiAction, setPendingAiAction] = useState<"camera" | "voice" | null>(null);

  useEffect(() => {
    if (params.mealType) setSelectedMealType(params.mealType);
  }, [params.mealType]);

  const selectedDate = dateForMealRoute(params.date);
  const dateKey = getDateKey(selectedDate);

  const habitualFavorite =
    favorites.find((f) => f.meal_type === selectedMealType) || favorites[0] || null;

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

        {/* Predicción de comida habitual por horario (1 toque sin llamadas a IA) */}
        {habitualFavorite && (
          <TouchableOpacity
            style={styles.habitualBanner}
            accessibilityRole="button"
            accessibilityLabel={`Registrar comida habitual ${habitualFavorite.title}`}
            activeOpacity={0.85}
            onPress={() => {
              beginMeal();
              useMealReviewStore.getState().loadFavoriteCombo(habitualFavorite, selectedMealType);
              router.push("/meal/review");
            }}
          >
            <View style={styles.habitualIconWrap}>
              <Star size={18} color="#B45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.habitualOverline}>SUGERENCIA HABITUAL · 1 TOQUE</Text>
              <Text style={styles.habitualTitle}>
                ¿Repetiste &ldquo;{habitualFavorite.title}&rdquo;?
              </Text>
              <Text style={styles.habitualMeta}>
                {Math.round(habitualFavorite.total_calories)} kcal · {Math.round(habitualFavorite.total_protein)}g Prot · Toca para revisar y guardar
              </Text>
            </View>
            <ChevronRight size={18} color="#B45309" />
          </TouchableOpacity>
        )}

        {/* Sección de Métodos de Registro */}
        <Text style={styles.sectionTitle}>2. Añade lo que comiste</Text>
        <TouchableOpacity style={styles.searchCard} accessibilityRole="button" accessibilityLabel="Buscar un alimento" activeOpacity={0.85}
          onPress={() => { beginMeal(); setShowSearchModal(true); }}>
          <View style={styles.searchTop}><View style={styles.searchIcon}><Search size={24} color={colors.mint} /></View><View style={styles.catalogBadge}><Text style={styles.catalogBadgeText}>CATÁLOGO CHILENO + USDA</Text></View></View>
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
            if (!hasConsent) {
              setPendingAiAction("camera");
              return;
            }
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
            if (!hasConsent) {
              setPendingAiAction("voice");
              return;
            }
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

      {/* Modal de Consentimiento de IA */}
      <AiConsentModal
        visible={pendingAiAction !== null}
        isUpdating={isUpdating}
        onCancel={() => setPendingAiAction(null)}
        onViewPrivacy={() => {
          setPendingAiAction(null);
          router.push("/legal" as any);
        }}
        onAccept={async () => {
          const action = pendingAiAction;
          try {
            await setConsent(true);
          } catch {
            // Continuar de forma resiliente si la red demora
          }
          setPendingAiAction(null);
          if (action === "camera") {
            router.push({
              pathname: "/meal/camera",
              params: { suggestedMealType: selectedMealType },
            });
          } else if (action === "voice") {
            setShowTextVoiceModal(true);
          }
        }}
      />

      <Suspense fallback={null}>
        {/* Modal de Texto / Voz */}
        {showTextVoiceModal && (
          <TextVoiceModal
            visible={showTextVoiceModal}
            mealType={selectedMealType}
            onClose={() => setShowTextVoiceModal(false)}
          />
        )}
        {showSearchModal && (
          <UsdaSearchModal
            onClose={() => setShowSearchModal(false)}
            onSelect={(item) => {
              useMealReviewStore.getState().addItem(item);
              router.push("/meal/review");
            }}
          />
        )}

        {/* Modal de Comidas Frecuentes */}
        {showFavoritesModal && (
          <FavoritesModal
            visible={showFavoritesModal}
            mealType={selectedMealType}
            onClose={() => setShowFavoritesModal(false)}
          />
        )}
      </Suspense>
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
  habitualBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  habitualIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  habitualOverline: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#B45309",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  habitualTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  habitualMeta: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
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
