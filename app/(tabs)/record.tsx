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
  RotateCcw,
  FileText,
  Scale,
  UtensilsCrossed,
} from "lucide-react-native";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { useFavoriteMeals } from "@/hooks/useFavoriteMeals";
import { useYesterdayMeals } from "@/hooks/useYesterdayMeal";
import { useAiConsent } from "@/hooks/useAiConsent";
import { AiConsentModal } from "@/components/common/AiConsentModal";
import { MealType } from "@/types/meal";
import { colors, layout, shadows } from "@/constants/colors";
import {
  MEAL_MOMENT_LIST,
  guessChileanMealTypeByHour,
} from "@/constants/mealMoments";
import {
  getDateKey,
  dateForMealRoute,
  loggedAtForDate,
  APP_TIME_ZONE,
} from "@/utils/dates";

const TextVoiceModal = lazy(() =>
  import("@/components/meal/TextVoiceModal").then((m) => ({
    default: m.TextVoiceModal,
  }))
);
const FavoritesModal = lazy(() =>
  import("@/components/meal/FavoritesModal").then((m) => ({
    default: m.FavoritesModal,
  }))
);
const UsdaSearchModal = lazy(() =>
  import("@/components/meal/UsdaSearchModal").then((m) => ({
    default: m.UsdaSearchModal,
  }))
);

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
  const [pendingAiAction, setPendingAiAction] = useState<
    "camera" | "nutrition_label" | "voice" | null
  >(null);

  useEffect(() => {
    if (params.mealType) setSelectedMealType(params.mealType);
  }, [params.mealType]);

  const selectedDate = dateForMealRoute(params.date);
  const dateKey = getDateKey(selectedDate);
  const isToday = dateKey === getDateKey();
  const { data: yesterdayMeals } = useYesterdayMeals(selectedDate);
  const yesterdayMealForType = yesterdayMeals?.[selectedMealType];

  const habitualFavorite =
    favorites.find((f) => f.meal_type === selectedMealType) ||
    favorites[0] ||
    null;

  const beginMeal = () => {
    useMealReviewStore.getState().reset();
    useMealReviewStore.getState().setLoggedAt(loggedAtForDate(selectedDate));
    useMealReviewStore.getState().setMealType(selectedMealType);
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabecera compacta + Fecha */}
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={styles.screenTitle}>
              Registrar comida
            </Text>
          </View>
          <View style={styles.datePill}>
            <CalendarDays size={13} color={colors.primaryDark} />
            <Text style={styles.datePillText}>
              {isToday
                ? "Hoy"
                : selectedDate.toLocaleDateString("es-CL", {
                    timeZone: APP_TIME_ZONE,
                    day: "numeric",
                    month: "short",
                  })}
            </Text>
            {!isToday && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => router.setParams({ date: getDateKey() })}
              >
                <Text style={styles.todayReset}>· Hoy</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 1. Selector de Momento con íconos vectoriales consistentes */}
        <View style={styles.mealTypesRow}>
          {MEAL_MOMENT_LIST.map((m) => {
            const active = selectedMealType === m.type;
            const MomentIcon = m.Icon;
            return (
              <TouchableOpacity
                key={m.type}
                style={[
                  styles.mealTypeChip,
                  active && styles.mealTypeChipActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Elegir ${m.label}`}
                accessibilityState={{ selected: active }}
                aria-pressed={active}
                onPress={() => setSelectedMealType(m.type)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.momentIconWrap,
                    { backgroundColor: active ? colors.card : m.bg },
                  ]}
                >
                  <MomentIcon size={16} color={m.color} />
                </View>
                <Text
                  style={[
                    styles.mealTypeLabel,
                    active && styles.mealTypeLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {m.shortLabel}
                </Text>
                {active && (
                  <View style={styles.mealCheck}>
                    <Check size={9} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Buscador rápido en 1 línea */}
        <TouchableOpacity
          style={styles.quickSearchBar}
          accessibilityRole="button"
          accessibilityLabel="Buscar un alimento"
          activeOpacity={0.85}
          onPress={() => {
            beginMeal();
            setShowSearchModal(true);
          }}
        >
          <View style={styles.quickSearchIcon}>
            <Search size={17} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.quickSearchPlaceholder} numberOfLines={1}>
              Buscar alimento (arroz, pollo, yogur…)
            </Text>
            <Text style={styles.quickSearchSub} numberOfLines={1}>
              Catálogo Chileno INTA / MINSAL · USDA
            </Text>
          </View>
          <ChevronRight size={17} color={colors.primary} />
        </TouchableOpacity>

        {/* Atajo de 1 toque: Ayer o Habitual */}
        {(yesterdayMealForType || habitualFavorite) && (
          <View style={styles.repeatStrip}>
            {yesterdayMealForType && (
              <TouchableOpacity
                style={styles.repeatChip}
                accessibilityRole="button"
                accessibilityLabel={`Repetir comida de ayer: ${yesterdayMealForType.summaryLabel}`}
                activeOpacity={0.85}
                onPress={() => {
                  beginMeal();
                  useMealReviewStore
                    .getState()
                    .loadFavoriteCombo(yesterdayMealForType, selectedMealType);
                  router.push("/meal/review");
                }}
              >
                <View
                  style={[
                    styles.repeatIcon,
                    { backgroundColor: colors.waterLight },
                  ]}
                >
                  <RotateCcw size={14} color={colors.water} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.repeatEyebrow}>AYER · 1 TOQUE</Text>
                  <Text style={styles.repeatTitle} numberOfLines={1}>
                    {yesterdayMealForType.summaryLabel}
                  </Text>
                </View>
                <Text style={styles.repeatKcal}>
                  {Math.round(yesterdayMealForType.total_calories)} kcal
                </Text>
              </TouchableOpacity>
            )}

            {habitualFavorite && (
              <TouchableOpacity
                style={styles.repeatChip}
                accessibilityRole="button"
                accessibilityLabel={`Registrar comida habitual ${habitualFavorite.title}`}
                activeOpacity={0.85}
                onPress={() => {
                  beginMeal();
                  useMealReviewStore
                    .getState()
                    .loadFavoriteCombo(habitualFavorite, selectedMealType);
                  router.push("/meal/review");
                }}
              >
                <View
                  style={[
                    styles.repeatIcon,
                    { backgroundColor: colors.carbsLight },
                  ]}
                >
                  <Star size={14} color={colors.carbs} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.repeatEyebrow}>HABITUAL</Text>
                  <Text style={styles.repeatTitle} numberOfLines={1}>
                    {habitualFavorite.title}
                  </Text>
                </View>
                <Text style={styles.repeatKcal}>
                  {Math.round(habitualFavorite.total_calories)} kcal
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 2. Cuadrícula 2×2: Acciones principales sin scroll */}
        <Text style={styles.sectionLabel}>Formas rápidas</Text>
        <View style={styles.primaryGrid}>
          {/* Foto IA */}
          <TouchableOpacity
            style={[styles.gridTile, styles.gridTileFeatured]}
            accessibilityRole="button"
            accessibilityLabel="Registrar con foto de comida"
            activeOpacity={0.85}
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
          >
            <View style={styles.gridTileTop}>
              <View
                style={[styles.gridIcon, { backgroundColor: colors.primary }]}
              >
                <Camera size={20} color="#FFFFFF" />
              </View>
              <View style={styles.miniBadge}>
                <Sparkles size={10} color="#FFFFFF" />
                <Text style={styles.miniBadgeText}>IA</Text>
              </View>
            </View>
            <Text style={styles.gridTitle}>Foto de tu plato</Text>
            <Text style={styles.gridDesc}>Estima porciones y macros</Text>
          </TouchableOpacity>

          {/* Escáner de Supermercado */}
          <TouchableOpacity
            style={styles.gridTile}
            accessibilityRole="button"
            accessibilityLabel="Registrar con código de barras"
            activeOpacity={0.85}
            onPress={() => {
              beginMeal();
              router.push({
                pathname: "/meal/barcode",
                params: { mealType: selectedMealType },
              });
            }}
          >
            <View style={styles.gridTileTop}>
              <View
                style={[styles.gridIcon, { backgroundColor: colors.fatLight }]}
              >
                <Barcode size={20} color={colors.fat} />
              </View>
              <View
                style={[
                  styles.miniBadge,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Text
                  style={[styles.miniBadgeText, { color: colors.primaryDark }]}
                >
                  SÚPER
                </Text>
              </View>
            </View>
            <Text style={styles.gridTitle}>Escáner Súper</Text>
            <Text style={styles.gridDesc}>Veredicto, sellos y barras</Text>
          </TouchableOpacity>

          {/* Escribir o Dictar */}
          <TouchableOpacity
            style={styles.gridTile}
            accessibilityRole="button"
            accessibilityLabel="Registrar con texto o voz"
            activeOpacity={0.85}
            onPress={() => {
              beginMeal();
              if (!hasConsent) {
                setPendingAiAction("voice");
                return;
              }
              setShowTextVoiceModal(true);
            }}
          >
            <View style={styles.gridTileTop}>
              <View
                style={[
                  styles.gridIcon,
                  { backgroundColor: colors.proteinLight },
                ]}
              >
                <Mic size={20} color={colors.protein} />
              </View>
            </View>
            <Text style={styles.gridTitle}>Dictar o escribir</Text>
            <Text style={styles.gridDesc}>Describe tu comida rápido</Text>
          </TouchableOpacity>

          {/* Comidas Frecuentes */}
          <TouchableOpacity
            style={styles.gridTile}
            accessibilityRole="button"
            accessibilityLabel="Registrar comida frecuente"
            activeOpacity={0.85}
            onPress={() => {
              beginMeal();
              setShowFavoritesModal(true);
            }}
          >
            <View style={styles.gridTileTop}>
              <View
                style={[
                  styles.gridIcon,
                  { backgroundColor: colors.carbsLight },
                ]}
              >
                <Star size={20} color={colors.carbs} />
              </View>
            </View>
            <Text style={styles.gridTitle}>Frecuentes</Text>
            <Text style={styles.gridDesc}>Tus favoritos en 1 toque</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Herramientas inteligentes (compacto 2×2) */}
        <Text style={styles.sectionLabel}>Herramientas inteligentes</Text>
        <View style={styles.toolsGrid}>
          <TouchableOpacity
            style={styles.toolTile}
            accessibilityRole="button"
            accessibilityLabel="Comparar dos productos de supermercado"
            activeOpacity={0.85}
            onPress={() => {
              beginMeal();
              router.push({
                pathname: "/meal/barcode",
                params: { mode: "compare", mealType: selectedMealType },
              });
            }}
          >
            <View
              style={[
                styles.toolIcon,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Scale size={17} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toolTitle} numberOfLines={1}>
                Comparar 2
              </Text>
              <Text style={styles.toolDesc} numberOfLines={1}>
                Sellos Ley 20.606
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolTile}
            accessibilityRole="button"
            accessibilityLabel="Elegir qué pedir en restaurante o casino"
            activeOpacity={0.85}
            onPress={() => {
              beginMeal();
              router.push({
                pathname: "/meal/menu-assistant" as any,
                params: { suggestedMealType: selectedMealType },
              });
            }}
          >
            <View
              style={[styles.toolIcon, { backgroundColor: colors.waterLight }]}
            >
              <UtensilsCrossed size={17} color={colors.water} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toolTitle} numberOfLines={1}>
                ¿Qué pido hoy?
              </Text>
              <Text style={styles.toolDesc} numberOfLines={1}>
                Carta o casino IA
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolTile}
            accessibilityRole="button"
            accessibilityLabel="Leer etiqueta nutricional con IA"
            activeOpacity={0.85}
            onPress={() => {
              beginMeal();
              if (!hasConsent) {
                setPendingAiAction("nutrition_label");
                return;
              }
              router.push({
                pathname: "/meal/camera",
                params: {
                  suggestedMealType: selectedMealType,
                  mode: "nutrition_label",
                },
              });
            }}
          >
            <View
              style={[styles.toolIcon, { backgroundColor: colors.dangerLight }]}
            >
              <FileText size={17} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toolTitle} numberOfLines={1}>
                Leer etiqueta
              </Text>
              <Text style={styles.toolDesc} numberOfLines={1}>
                Foto a la tabla
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolTile}
            accessibilityRole="button"
            accessibilityLabel="Ingresar alimento manualmente"
            activeOpacity={0.85}
            onPress={() => {
              beginMeal();
              router.push({ pathname: "/meal/review", params: { manual: "1" } });
            }}
          >
            <View
              style={[
                styles.toolIcon,
                { backgroundColor: colors.surfaceMuted },
              ]}
            >
              <PencilLine size={17} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toolTitle} numberOfLines={1}>
                Manual
              </Text>
              <Text style={styles.toolDesc} numberOfLines={1}>
                Escribir macros
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backHomeBtn}
          accessibilityRole="button"
          onPress={() =>
            router.replace({ pathname: "/(tabs)", params: { date: dateKey } })
          }
          activeOpacity={0.8}
        >
          <ArrowLeft size={15} color={colors.textSecondary} />
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
          } catch {}
          setPendingAiAction(null);
          if (action === "camera") {
            router.push({
              pathname: "/meal/camera",
              params: { suggestedMealType: selectedMealType },
            });
          } else if (action === "nutrition_label") {
            router.push({
              pathname: "/meal/camera",
              params: {
                suggestedMealType: selectedMealType,
                mode: "nutrition_label",
              },
            });
          } else if (action === "voice") {
            setShowTextVoiceModal(true);
          }
        }}
      />

      <Suspense fallback={null}>
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
    paddingTop: 12,
    paddingBottom: 28,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.4,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  datePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  todayReset: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
  },
  mealTypesRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 12,
  },
  mealTypeChip: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.card,
    borderRadius: 15,
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    position: "relative",
    gap: 4,
  },
  mealTypeChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  momentIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mealTypeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  mealTypeLabelActive: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  mealCheck: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: colors.primary,
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 17,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 12,
    ...shadows.card,
  },
  quickSearchIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  quickSearchPlaceholder: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  quickSearchSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  repeatStrip: {
    gap: 8,
    marginBottom: 14,
  },
  repeatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  repeatIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: colors.textMuted,
  },
  repeatTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  repeatKcal: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginBottom: 9,
  },
  primaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  gridTile: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: colors.card,
    borderRadius: 19,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  gridTileFeatured: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.primaryGhost,
  },
  gridTileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  gridIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  miniBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
  },
  gridDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  toolTile: {
    flexGrow: 1,
    flexBasis: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 15,
    paddingVertical: 11,
    paddingHorizontal: 11,
  },
  toolIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toolTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  toolDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  backHomeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
  },
  backHomeText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
