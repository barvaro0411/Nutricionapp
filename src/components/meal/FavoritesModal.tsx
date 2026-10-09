import { showAlert } from "@/utils/alerts";
import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFavoriteMeals, FavoriteMealWithItems } from "@/hooks/useFavoriteMeals";
import { colors } from "@/constants/colors";
import { MealType } from "@/types/meal";

interface FavoritesModalProps {
  visible: boolean;
  onClose: () => void;
  mealType?: MealType;
}

export function FavoritesModal({ visible, onClose, mealType }: FavoritesModalProps) {
  const { favorites, isLoading, logFavoriteMeal, isLoggingFavorite } = useFavoriteMeals();

  const handleSelectFavorite = async (fav: FavoriteMealWithItems) => {
    try {
      await logFavoriteMeal({ ...fav, targetMealType: mealType });
      showAlert("¡Listo!", `Se registró "${fav.title}" en tus comidas del día.`);
      onClose();
    } catch (err: any) {
      showAlert("Error", err?.message || "No se pudo registrar la comida favorita");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>⭐ Mis Comidas Frecuentes</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar comidas frecuentes" onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Regístralas en un solo toque sin gastar IA ni tiempo de análisis.
          </Text>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
          ) : favorites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>Aún no tienes comidas favoritas</Text>
              <Text style={styles.emptyDesc}>
                Cuando confirmes una comida que repites a menudo, toca "⭐ Guardar como favorita" para que aparezca aquí.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.list}>
              {favorites.map((fav) => (
                <TouchableOpacity
                  key={fav.id}
                  accessibilityRole="button"
                  accessibilityLabel={"Registrar favorita " + fav.title}
                  style={styles.card}
                  onPress={() => handleSelectFavorite(fav)}
                  disabled={isLoggingFavorite}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{fav.title}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{Math.round(fav.total_calories)} kcal</Text>
                    </View>
                  </View>
                  <Text style={styles.itemsSummary}>
                    {fav.items.map((i) => i.food_name).join(", ")}
                  </Text>
                  <View style={styles.macrosRow}>
                    <Text style={styles.macroText}>
                      {Math.round(fav.total_protein)}g P • {Math.round(fav.total_carbs)}g C • {Math.round(fav.total_fat)}g G
                    </Text>
                    <Text style={styles.usageText}>Usada {fav.usage_count} veces</Text>
                  </View>
                </TouchableOpacity>
              ))}
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
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
    marginBottom: 16,
    lineHeight: 18,
  },
  list: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
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
  itemsSummary: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
