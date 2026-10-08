import React, { useState } from "react";
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
import { ArrowLeft, ArrowUpRight, ChefHat, Clock3 } from "lucide-react-native";
import { useRecipes } from "@/hooks/useRecipes";
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
  const [search, setSearch] = useState("");
  const { data: recipes, isLoading, error, refetch } = useRecipes(selectedType);
  const filtered = (recipes || []).filter((recipe) =>
    normalize(recipe.title + " " + recipe.description).includes(
      normalize(search.trim()),
    ),
  );
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 16) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
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
      <PageHeading
        eyebrow="Un poco de inspiración"
        title="Ideas para tu próxima comida"
        description="Recetas para variar tu rutina, disfrutar lo que comes y conocer sus nutrientes."
      />
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
              search || selectedType
                ? "No encontramos esa combinación"
                : "Estamos preparando nuevas ideas"
            }
            message={
              search || selectedType
                ? "Prueba otro ingrediente o cambia el filtro de comida."
                : "Las recetas aparecerán aquí cuando estén disponibles."
            }
          />
          {(search || selectedType) && (
            <AppButton
              title="Limpiar filtros"
              onPress={() => {
                setSearch("");
                setSelectedType(undefined);
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
                  <View style={styles.time}>
                    <Clock3 size={13} color={colors.textSecondary} />
                    <Text style={styles.timeText}>
                      {recipe.prepTimeMinutes} min
                    </Text>
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
                  <Text style={styles.details}>
                    Ver ingredientes y preparación
                  </Text>
                  <ArrowUpRight size={17} color={colors.primary} />
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { ...layout.page },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backText: { fontSize: 13, fontWeight: "600", color: colors.primary },
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
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  details: { flex: 1, fontSize: 12, fontWeight: "600", color: colors.primary },
});
