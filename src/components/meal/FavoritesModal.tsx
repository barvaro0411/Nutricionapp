import { showAlert } from "@/utils/alerts";
import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useFavoriteMeals, FavoriteMealWithItems } from "@/hooks/useFavoriteMeals";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { colors } from "@/constants/colors";
import { MealType } from "@/types/meal";

interface FavoritesModalProps {
  visible: boolean;
  onClose: () => void;
  mealType?: MealType;
  onSelectCombo?: (fav: FavoriteMealWithItems) => void;
}

type FilterType = "all" | "combos" | "singles";

export function FavoritesModal({
  visible,
  onClose,
  mealType,
  onSelectCombo,
}: FavoritesModalProps) {
  const router = useRouter();
  const {
    favorites,
    isLoading,
    logFavoriteMeal,
    isLoggingFavorite,
    deleteFavorite,
  } = useFavoriteMeals();
  const { loadFavoriteCombo } = useMealReviewStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const combosCount = useMemo(
    () => favorites.filter((f) => f.items.length > 1).length,
    [favorites]
  );
  const singlesCount = useMemo(
    () => favorites.filter((f) => f.items.length === 1).length,
    [favorites]
  );

  const filteredFavorites = useMemo(() => {
    return favorites.filter((fav) => {
      // Filtro de tipo
      if (activeFilter === "combos" && fav.items.length <= 1) return false;
      if (activeFilter === "singles" && fav.items.length > 1) return false;

      // Filtro de texto
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const inTitle = fav.title.toLowerCase().includes(q);
      const inItems = fav.items.some((i) =>
        i.food_name.toLowerCase().includes(q)
      );
      return inTitle || inItems;
    });
  }, [favorites, activeFilter, searchQuery]);

  // Registro directo en 1 toque
  const handleSelectFavorite = async (fav: FavoriteMealWithItems) => {
    try {
      await logFavoriteMeal({ ...fav, targetMealType: mealType });
      showAlert("¡Listo!", `Se registró "${fav.title}" en tus comidas del día.`);
      onClose();
    } catch (err: any) {
      showAlert("Error", err?.message || "No se pudo registrar la comida favorita");
    }
  };

  // Cargar combo en el review store para editarlo antes de guardar
  const handleLoadAndEdit = (fav: FavoriteMealWithItems) => {
    if (onSelectCombo) {
      onSelectCombo(fav);
      onClose();
      return;
    }
    loadFavoriteCombo(fav, mealType);
    onClose();
    router.push("/meal/review");
  };

  // Confirmar eliminación
  const handleDelete = (fav: FavoriteMealWithItems) => {
    Alert.alert(
      "Eliminar de favoritas",
      `¿Deseas quitar "${fav.title}" de tus comidas frecuentes?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFavorite(fav.id);
            } catch (err: any) {
              showAlert("Error", err?.message || "No se pudo eliminar.");
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>⭐ Mis Comidas Frecuentes</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cerrar comidas frecuentes"
                onPress={onClose}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>
              Registra en un solo toque o carga combos completos para editarlos.
            </Text>
          </View>

          {/* Buscador */}
          {favorites.length > 0 && (
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por comida o ingredientes..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>
          )}

          {/* Filtros de Tipo */}
          {favorites.length > 0 && (
            <View style={styles.filterPillsRow}>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  activeFilter === "all" && styles.filterPillActive,
                ]}
                onPress={() => setActiveFilter("all")}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === "all" && styles.filterPillTextActive,
                  ]}
                >
                  Todos ({favorites.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  activeFilter === "combos" && styles.filterPillActive,
                ]}
                onPress={() => setActiveFilter("combos")}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === "combos" && styles.filterPillTextActive,
                  ]}
                >
                  🍱 Combos ({combosCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  activeFilter === "singles" && styles.filterPillActive,
                ]}
                onPress={() => setActiveFilter("singles")}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === "singles" && styles.filterPillTextActive,
                  ]}
                >
                  🍎 Individuales ({singlesCount})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
          ) : favorites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>Aún no tienes comidas favoritas</Text>
              <Text style={styles.emptyDesc}>
                Cuando confirmes una comida o combo que repites a menudo, toca "⭐ Guardar como favorita" para registrarlo en segundos.
              </Text>
            </View>
          ) : filteredFavorites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔎</Text>
              <Text style={styles.emptyTitle}>No encontramos resultados</Text>
              <Text style={styles.emptyDesc}>
                Prueba con otro término de búsqueda o cambia el filtro.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {filteredFavorites.map((fav) => {
                const isCombo = fav.items.length > 1;
                return (
                  <View key={fav.id} style={styles.card}>
                    {/* Encabezado de la tarjeta */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleWrap}>
                        <Text style={styles.cardTitle}>{fav.title}</Text>
                        <View
                          style={[
                            styles.typeBadge,
                            isCombo ? styles.comboBadge : styles.singleBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.typeBadgeText,
                              isCombo ? styles.comboBadgeText : styles.singleBadgeText,
                            ]}
                          >
                            {isCombo ? `🍱 Combo (${fav.items.length})` : "🍎 Individual"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.headerRightGroup}>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            {Math.round(fav.total_calories)} kcal
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(fav)}
                          accessibilityRole="button"
                          accessibilityLabel={`Eliminar favorita ${fav.title}`}
                        >
                          <Text style={styles.deleteBtnText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Desglose de ítems */}
                    <View style={styles.itemsBox}>
                      <Text style={styles.itemsSummary}>
                        {fav.items
                          .map(
                            (i) =>
                              `${i.food_name} (${Math.round(i.grams)}${i.unit || "g"})`
                          )
                          .join(" • ")}
                      </Text>
                    </View>

                    {/* Macros */}
                    <View style={styles.macrosRow}>
                      <Text style={styles.macroText}>
                        {Math.round(fav.total_protein)}g P • {Math.round(fav.total_carbs)}g C •{" "}
                        {Math.round(fav.total_fat)}g G
                      </Text>
                      <Text style={styles.usageText}>Usada {fav.usage_count} veces</Text>
                    </View>

                    {/* Botones de acción dual: 1 toque vs Cargar y Editar */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.editComboBtn}
                        onPress={() => handleLoadAndEdit(fav)}
                        accessibilityRole="button"
                        accessibilityLabel={`Cargar y editar ${fav.title}`}
                      >
                        <Text style={styles.editComboBtnText}>✏️ Cargar y editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.directLogBtn}
                        onPress={() => handleSelectFavorite(fav)}
                        disabled={isLoggingFavorite}
                        accessibilityRole="button"
                        accessibilityLabel={`Registrar directo ${fav.title}`}
                      >
                        <Text style={styles.directLogBtnText}>⚡ 1 Toque</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {isLoggingFavorite && (
            <View style={styles.loggingOverlay}>
              <ActivityIndicator color="#FFFFFF" size="large" />
              <Text style={styles.loggingText}>Registrando comida...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    maxHeight: "85%",
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textMuted,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    padding: 0,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  list: {
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  cardTitleWrap: {
    flex: 1,
    marginRight: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  comboBadge: {
    backgroundColor: "#E0E7FF",
  },
  comboBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3730A3",
  },
  singleBadge: {
    backgroundColor: "#F1F5F9",
  },
  singleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  deleteBtn: {
    padding: 2,
  },
  deleteBtnText: {
    fontSize: 14,
  },
  itemsBox: {
    backgroundColor: colors.card,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemsSummary: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  macroText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  usageText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  editComboBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  editComboBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  directLogBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  directLogBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  loggingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  loggingText: {
    color: "#FFFFFF",
    marginTop: 10,
    fontWeight: "700",
    fontSize: 14,
  },
});
