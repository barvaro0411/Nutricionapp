import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { CheckCircle2, RotateCcw, Droplets, Utensils, AlertTriangle } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { CoachActionData } from "@/utils/coachActions";

export interface CoachActionCardProps {
  action: CoachActionData;
  onConfirm?: (action: CoachActionData) => void;
  onUndo?: (action: CoachActionData) => void;
}

export function CoachActionCard({ action, onConfirm, onUndo }: CoachActionCardProps) {
  const isWater = action.type === "water";
  const isExecuting = action.status === "executing";
  const isConfirmed = action.status === "confirmed";
  const isUndone = action.status === "undone";
  const isPending = action.status === "pending";

  return (
    <View testID="coach-action-card" style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, isWater ? styles.waterIconWrap : styles.mealIconWrap]}>
          {isWater ? (
            <Droplets size={16} color="#0284C7" />
          ) : (
            <Utensils size={16} color={colors.primaryDark} />
          )}
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>
            {isWater
              ? "Registro de Agua"
              : `Registro de Comida · ${action.mealType.toUpperCase()}`}
          </Text>
          <Text style={styles.subtitle}>
            {isWater
              ? `${action.amountMl} ml (${Math.round(action.amountMl / 250)} vaso${action.amountMl >= 500 ? "s" : ""})`
              : action.description}
          </Text>
        </View>
      </View>

      {/* Items list for Meal */}
      {!isWater && action.items && action.items.length > 0 && (
        <View style={styles.mealItemsList}>
          {action.items.map((item, idx) => (
            <View key={idx} style={styles.mealItemRow}>
              <View style={styles.mealItemLeft}>
                <Text style={styles.mealItemName} numberOfLines={1}>
                  {item.food}
                </Text>
                <Text style={styles.mealItemGrams}>
                  {Math.round(item.grams)} {item.unit}
                </Text>
              </View>
              <Text style={styles.mealItemMacros}>
                {Math.round(item.calories)} kcal · {Math.round(item.protein)}g P
              </Text>
            </View>
          ))}

          {/* Totals */}
          <View style={styles.totalsBar}>
            <View style={styles.totalCol}>
              <Text style={styles.totalVal}>{Math.round(action.totals.calories)}</Text>
              <Text style={styles.totalLbl}>kcal</Text>
            </View>
            <View style={styles.totalCol}>
              <Text style={styles.totalVal}>{Math.round(action.totals.protein)}g</Text>
              <Text style={styles.totalLbl}>Prot</Text>
            </View>
            <View style={styles.totalCol}>
              <Text style={styles.totalVal}>{Math.round(action.totals.carbs)}g</Text>
              <Text style={styles.totalLbl}>Carbos</Text>
            </View>
            <View style={styles.totalCol}>
              <Text style={styles.totalVal}>{Math.round(action.totals.fat)}g</Text>
              <Text style={styles.totalLbl}>Grasas</Text>
            </View>
          </View>
        </View>
      )}

      {/* Status Badge */}
      {isConfirmed && (
        <View style={styles.statusBadgeConfirmed}>
          <CheckCircle2 size={13} color="#15803D" />
          <Text style={styles.statusBadgeTextConfirmed}>
            {isWater ? "Registrado en tu consumo de hoy" : "Guardado en tu diario de hoy"}
          </Text>
        </View>
      )}

      {isUndone && (
        <View style={styles.statusBadgeUndone}>
          <RotateCcw size={13} color="#B45309" />
          <Text style={styles.statusBadgeTextUndone}>Registro deshecho</Text>
        </View>
      )}

      {action.status === "error" && (
        <View style={styles.statusBadgeError}>
          <AlertTriangle size={13} color={colors.danger} />
          <Text style={styles.statusBadgeTextError}>
            {action.error || "No se pudo completar el registro"}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        {isExecuting ? (
          <View style={styles.executingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.executingText}>Procesando...</Text>
          </View>
        ) : (
          <>
            {(isPending || isUndone) && (
              <TouchableOpacity
                testID="coach-confirm-action"
                style={styles.confirmBtn}
                onPress={() => onConfirm?.(action)}
                accessibilityRole="button"
                accessibilityLabel="Confirmar registro"
                activeOpacity={0.8}
              >
                <CheckCircle2 size={14} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>Confirmar registro</Text>
              </TouchableOpacity>
            )}

            {(isPending || isConfirmed) && (
              <TouchableOpacity
                testID="coach-undo-action"
                style={[styles.undoBtn, isConfirmed && styles.undoBtnFull]}
                onPress={() => onUndo?.(action)}
                accessibilityRole="button"
                accessibilityLabel={isConfirmed ? "Deshacer registro" : "Cancelar registro"}
                activeOpacity={0.8}
              >
                <RotateCcw size={13} color={colors.textSecondary} />
                <Text style={styles.undoBtnText}>
                  {isConfirmed ? "Deshacer" : "Cancelar"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 10,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  waterIconWrap: {
    backgroundColor: "#E0F2FE",
  },
  mealIconWrap: {
    backgroundColor: colors.primaryLight,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  mealItemsList: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  mealItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealItemLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  mealItemName: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.text,
    maxWidth: "70%",
  },
  mealItemGrams: {
    fontSize: 11,
    color: colors.textMuted,
  },
  mealItemMacros: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  totalsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
    marginTop: 4,
  },
  totalCol: {
    alignItems: "center",
  },
  totalVal: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.text,
  },
  totalLbl: {
    fontSize: 9.5,
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: 1,
  },
  statusBadgeConfirmed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCFCE7",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusBadgeTextConfirmed: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  statusBadgeUndone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusBadgeTextUndone: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  statusBadgeError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEE2E2",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusBadgeTextError: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.danger,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  executingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  executingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  undoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  undoBtnFull: {
    flex: 1,
  },
  undoBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
