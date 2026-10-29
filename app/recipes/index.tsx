import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowUpRight,
  ChefHat,
  Clock3,
  ShoppingBasket,
  Check,
  Plus,
} from "lucide-react-native";
import { useRecipes } from "@/hooks/useRecipes";
import { useDietaryPreferences } from "@/hooks/useDietaryPreferences";
import { isRecipeCompatible } from "@/utils/foodAlerts";
import { useShoppingListStore } from "@/stores/useShoppingListStore";
import { buildShoppingList } from "@/utils/shoppingListUtils";
import { ShoppingListModal } from "@/components/recipes/ShoppingListModal";
import { showToast } from "@/utils/alerts";
import {
  PageHeading,
  FormField,
  StateCard,
  AppButton,
} from "@/components/common/AppUI";
import { colors, layout } from "@/constants/colors";
import { MealType } from "@/types/meal";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const labels: Record<MealType, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Once / Cena",
  snack: "Colación",
};
export default function RecipesCatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const wide = useWindowDimensions().width >= 760;
  const [selectedType, setSelectedType] = useState<MealType | undefined>();
  const [filterCompatibleOnly, setFilterCompatibleOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const { restrictions } = useDietaryPreferences();
  const { data: recipes, isLoading, error, refetch } = useRecipes(selectedType);
  const {
    plannedRecipes,
    checkedMap,
    customItems,
    hydrate,
    toggleRecipeInList,
  } = useShoppingListStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const shoppingItems = useMemo(
    () => buildShoppingList(plannedRecipes, checkedMap, customItems),
    [plannedRecipes, checkedMap, customItems]
  );

  const filtered = (recipes || []).filter((recipe) => {
    const matchesSearch = normalize(recipe.title + " " + recipe.description).includes(
      normalize(search.trim())
    );
    if (!matchesSearch) return false;
    if (filterCompatibleOnly && restrictions.length > 0) {
      const { compatible } = isRecipeCompatible(recipe, restrictions);
      if (!compatible) return false;
    }
    return true;
  });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 16) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topActionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a mi día"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
          style={styles.back}
        >
          <ArrowLeft size={18} color={colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir lista de compras para la feria y supermercado"
          onPress={() => setShowShoppingModal(true)}
          style={styles.shoppingHeaderBtn}
        >
          <ShoppingBasket size={17} color="#FFFFFF" />
          <Text style={styles.shoppingHeaderBtnText}>
            Lista de Compras
            {shoppingItems.length > 0 ? ` (${shoppingItems.length})` : ""}
          </Text>
        </Pressable>
      </View>

      <PageHeading
        eyebrow="Un poco de inspiración"
        title="Ideas para tu próxima comida"
        description="Recetas para variar tu rutina, disfrutar lo que comes y conocer sus nutrientes."
      />

      {/* Banner de Planificación Semanal */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Planificar compras de la semana para la feria y supermercado"
        onPress={() => setShowShoppingModal(true)}
        style={styles.plannerBanner}
      >
        <View style={styles.plannerIconWrap}>
          <ShoppingBasket size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.plannerOverline}>
            FERIA LIBRE Y SUPERMERCADO
          </Text>
          <Text style={styles.plannerTitle}>
            {plannedRecipes.length > 0
              ? `${plannedRecipes.length} ${
                  plannedRecipes.length === 1 ? "receta" : "recetas"
                } en tu lista (${shoppingItems.length} ingredientes)`
              : "Planifica tus compras de la semana"}
          </Text>
          <Text style={styles.plannerDesc}>
            {plannedRecipes.length > 0
              ? "Toca para revisar, tachar en el súper o compartir por WhatsApp."
              : "Suma tus recetas favoritas con '+ Lista' y agruparemos verduras, carnes y abarrotes automáticamente."}
          </Text>
        </View>
        <ArrowUpRight size={18} color={colors.primary} />
      </Pressable>
      <FormField
        label="Buscar recetas"
        placeholder="Ej: pollo, avena, porotos…"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
        returnKeyType="search"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {[
          undefined,
          ...(["desayuno", "almuerzo", "cena", "snack"] as MealType[]),
        ].map((type) => (
          <Pressable
            key={type || "all"}
            accessibilityRole="button"
            accessibilityLabel={
              "Filtrar " + (type ? labels[type] : "todas las recetas")
            }
            accessibilityState={{ selected: selectedType === type }}
            onPress={() => setSelectedType(type)}
            style={[styles.chip, selectedType === type && styles.activeChip]}
          >
            <Text
              style={[
                styles.chipText,
                selectedType === type && styles.activeText,
              ]}
            >
              {type ? labels[type] : "Todas"}
            </Text>
          </Pressable>
        ))}
        {restrictions.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filtrar solo recetas compatibles con mis restricciones"
            accessibilityState={{ selected: filterCompatibleOnly }}
            onPress={() => setFilterCompatibleOnly((v) => !v)}
            style={[styles.chip, filterCompatibleOnly && styles.activeChip]}
          >
            <Text
              style={[
                styles.chipText,
                filterCompatibleOnly && styles.activeText,
              ]}
            >
              🌱 Para mi dieta ({restrictions.length})
            </Text>
          </Pressable>
        )}
      </ScrollView>
      {isLoading ? (
        <ActivityIndicator
          color={colors.primary}
          size="large"
          style={styles.loading}
        />
      ) : error ? (
        <StateCard
          title="No pudimos cargar las recetas"
          message="Revisa la conexión y vuelve a intentarlo."
          onRetry={() => void refetch()}
        />
      ) : filtered.length === 0 ? (
        <>
          <StateCard
            title={
              search || selectedType || filterCompatibleOnly
                ? "No encontramos esa combinación"
                : "Estamos preparando nuevas ideas"
            }
            message={
              search || selectedType || filterCompatibleOnly
                ? "Prueba otro ingrediente o cambia los filtros seleccionados."
                : "Las recetas aparecerán aquí cuando estén disponibles."
            }
          />
          {(search || selectedType || filterCompatibleOnly) && (
            <AppButton
              title="Limpiar filtros"
              onPress={() => {
                setSearch("");
                setSelectedType(undefined);
                setFilterCompatibleOnly(false);
              }}
              secondary
            />
          )}
        </>
      ) : (
        <>
          <Text style={styles.results}>
            {filtered.length}{" "}
            {filtered.length === 1
              ? "receta para inspirarte"
              : "recetas para inspirarte"}
          </Text>
          <View style={styles.grid}>
            {filtered.map((recipe) => (
              <Pressable
                key={recipe.id}
                accessibilityRole="button"
                accessibilityLabel={"Ver receta de " + recipe.title}
                onPress={() =>
                  router.push({
                    pathname: "/recipes/[id]",
                    params: { id: recipe.id },
                  })
                }
                style={({ pressed }) => [
                  styles.card,
                  wide && styles.wideCard,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.icon}>
                    <ChefHat size={25} color={colors.primary} />
                  </View>
                  <View style={styles.cardHeaderRight}>
                    {restrictions.length > 0 && (() => {
                      const { compatible, alerts } = isRecipeCompatible(recipe, restrictions);
                      return (
                        <View
                          style={[
                            styles.recipeBadge,
                            compatible ? styles.recipeBadgeSuccess : styles.recipeBadgeWarning,
                          ]}
                        >
                          <Text
                            style={[
                              styles.recipeBadgeText,
                              compatible ? styles.recipeBadgeTextSuccess : styles.recipeBadgeTextWarning,
                            ]}
                          >
                            {compatible ? "✓ Compatible" : `⚠️ ${alerts[0]?.label || "Alérgeno"}`}
                          </Text>
                        </View>
                      );
                    })()}
                    <View style={styles.time}>
                      <Clock3 size={13} color={colors.textSecondary} />
                      <Text style={styles.timeText}>
                        {recipe.prepTimeMinutes} min
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.category}>{labels[recipe.mealType]}</Text>
                <Text style={styles.recipeTitle}>{recipe.title}</Text>
                <Text style={styles.recipeDescription} numberOfLines={2}>
                  {recipe.description}
                </Text>
                <View style={styles.nutrients}>
                  <Text style={styles.calories}>
                    {Math.round(recipe.caloriesPerServing)}{" "}
                    <Text style={styles.calorieUnit}>kcal / porción</Text>
                  </Text>
                  <Text style={styles.protein}>
                    {Math.round(recipe.proteinPerServing)} g proteína
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <View style={styles.detailsRow}>
                    <Text style={styles.details}>
                      Ver ingredientes y preparación
                    </Text>
                    <ArrowUpRight size={17} color={colors.primary} />
                  </View>
                  {(() => {
                    const inList = plannedRecipes.some((r) => r.recipe.id === recipe.id);
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          inList
                            ? `Quitar ${recipe.title} de la lista de compras`
                            : `Agregar ${recipe.title} a la lista de compras`
                        }
                        onPress={(e) => {
                          e.stopPropagation?.();
                          const added = toggleRecipeInList(recipe);
                          showToast({
                            type: added ? "success" : "info",
                            title: added
                              ? "¡Sumada a tu Lista de Compras!"
                              : "Quitada de tu lista",
                            message: added
                              ? `Se agregaron los ingredientes de "${recipe.title}".`
                              : `Se quitaron los ingredientes de "${recipe.title}".`,
                          });
                        }}
                        style={[
                          styles.addToListBtn,
                          inList && styles.addToListBtnActive,
                        ]}
                      >
                        {inList ? (
                          <Check size={13} color={colors.primaryDark} strokeWidth={3} />
                        ) : (
                          <Plus size={13} color={colors.primary} strokeWidth={2.5} />
                        )}
                        <Text
                          style={[
                            styles.addToListBtnText,
                            inList && styles.addToListBtnTextActive,
                          ]}
                        >
                          {inList ? "En tu lista" : "Lista de compras"}
                        </Text>
                      </Pressable>
                    );
                  })()}
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <ShoppingListModal
        visible={showShoppingModal}
        onClose={() => setShowShoppingModal(false)}
      />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { ...layout.page },
  topActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  backText: { fontSize: 13, fontWeight: "600", color: colors.text },
  shoppingHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  shoppingHeaderBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  plannerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.primaryGhost,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  plannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  plannerOverline: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  plannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  plannerDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  filters: { gap: 8, paddingBottom: 12, marginBottom: 10 },
  chip: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  activeChip: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  activeText: { color: "#FFFFFF" },
  loading: { marginVertical: 60 },
  results: { fontSize: 12, color: colors.textSecondary, marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  card: {
    width: "100%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 22,
    padding: 22,
  },
  wideCard: { flexGrow: 1, flexBasis: "45%", maxWidth: "49%" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  cardHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  recipeBadge: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  recipeBadgeSuccess: { backgroundColor: "#DCFCE7" },
  recipeBadgeWarning: { backgroundColor: "#FEF3C7" },
  recipeBadgeText: { fontSize: 10, fontWeight: "700" },
  recipeBadgeTextSuccess: { color: "#166534" },
  recipeBadgeTextWarning: { color: "#92400E" },
  icon: {
    width: 52,
    height: 52,
    backgroundColor: colors.primaryLight,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  time: { flexDirection: "row", alignItems: "center", gap: 5 },
  timeText: { fontSize: 11, color: colors.textSecondary },
  category: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.primary,
    marginBottom: 8,
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    letterSpacing: -0.5,
    color: colors.text,
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  nutrients: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    marginBottom: 18,
  },
  calories: { fontSize: 18, fontWeight: "700", color: colors.text },
  calorieUnit: { fontSize: 11, fontWeight: "400", color: colors.textSecondary },
  protein: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.protein,
    backgroundColor: colors.proteinLight,
    padding: 7,
    borderRadius: 9,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 140,
  },
  details: { fontSize: 12, fontWeight: "600", color: colors.primary },
  addToListBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: colors.primaryGhost,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  addToListBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  addToListBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  addToListBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
});
