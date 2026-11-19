import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Check,
  Copy,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react-native";
import { PageHeading, StateCard } from "@/components/common/AppUI";
import { colors, layout } from "@/constants/colors";
import { useShoppingList } from "@/hooks/useShoppingList";
import { SHOPPING_CATEGORY_LABELS, ShoppingUnit } from "@/types/recipe";
import { showAlert, showToast } from "@/utils/alerts";
import {
  formatShoppingListForShare,
  formatShoppingQuantity,
} from "@/utils/shoppingList";

const UNIT_OPTIONS: Array<{ value: ShoppingUnit; label: string }> = [
  { value: "g", label: "g" },
  { value: "ml", label: "ml" },
  { value: "unidad", label: "unid" },
];

export default function ShoppingListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    items,
    pendingGroups,
    checkedItems,
    pendingCount,
    isLoading,
    error,
    refetch,
    addManualItem,
    toggleItem,
    clearChecked,
    removeItem,
    isAdding,
    isMutating,
  } = useShoppingList();

  const [name, setName] = useState("");
  const [quantityText, setQuantityText] = useState("1");
  const [unit, setUnit] = useState<ShoppingUnit>("unidad");
  const [formError, setFormError] = useState<string | null>(null);

  const handleAddManual = async () => {
    setFormError(null);
    const cleanedName = name.trim();
    const parsedQty = Number(quantityText.replace(",", "."));
    if (!cleanedName) {
      setFormError("Escribe el nombre del producto.");
      return;
    }
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setFormError("Ingresa una cantidad válida mayor a 0.");
      return;
    }

    try {
      await addManualItem({
        name: cleanedName,
        quantity: parsedQty,
        unit,
      });
      setName("");
      setQuantityText(unit === "unidad" ? "1" : "100");
      showToast({
        type: "success",
        title: "Agregado a compras",
        message: cleanedName,
      });
    } catch (err: any) {
      setFormError(err?.message || "No se pudo agregar el producto.");
    }
  };

  const handleShareList = async () => {
    const formatted = formatShoppingListForShare(items);
    if (!formatted) {
      showToast({
        type: "info",
        title: "Sin pendientes",
        message: "Agrega ingredientes o desmarca productos para compartir.",
      });
      return;
    }

    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(formatted);
        showToast({
          type: "success",
          title: "Lista copiada",
          message: "Lista agrupada lista para pegar en WhatsApp o Notas.",
        });
        return;
      }
      await Share.share({
        title: "Lista de Compras - Nutricionapp",
        message: formatted,
      });
    } catch {
      showToast({
        type: "error",
        title: "No se pudo copiar o compartir la lista",
      });
    }
  };

  const handleClearChecked = () => {
    if (checkedItems.length === 0) return;
    showAlert(
      "Limpiar productos comprados",
      `Se quitarán ${checkedItems.length} productos marcados como comprados.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpiar",
          style: "destructive",
          onPress: () => {
            void clearChecked().catch((err: any) =>
              showToast({ type: "error", title: "Error", message: err?.message })
            );
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a recetas"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/recipes"))}
          style={styles.back}
        >
          <ArrowLeft size={18} color={colors.primary} />
          <Text style={styles.backText}>Recetas</Text>
        </Pressable>

        {pendingCount > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copiar o compartir lista de compras"
            onPress={() => void handleShareList()}
            style={styles.shareBtn}
          >
            <Copy size={15} color={colors.primary} />
            <Text style={styles.shareBtnText}>Copiar lista</Text>
          </Pressable>
        )}
      </View>

      <PageHeading
        eyebrow="Supermercado inteligente"
        title="Lista de Compras"
        description={`${pendingCount} por comprar${checkedItems.length > 0 ? ` · ${checkedItems.length} comprados` : ""}. Los ingredientes repetidos de tus recetas se suman solos.`}
      />

      {/* Alta manual rápida */}
      <View style={styles.addCard}>
        <Text style={styles.addTitle}>Agregar producto manual</Text>
        <TextInput
          style={styles.nameInput}
          placeholder="Ej: Palta, Papel absorbente, Yogur..."
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (formError) setFormError(null);
          }}
          returnKeyType="done"
          onSubmitEditing={() => void handleAddManual()}
        />

        <View style={styles.qtyRow}>
          <TextInput
            style={styles.qtyInput}
            placeholder="Cant."
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={quantityText}
            onChangeText={(val) => {
              setQuantityText(val);
              if (formError) setFormError(null);
            }}
          />
          <View style={styles.unitGroup}>
            {UNIT_OPTIONS.map((opt) => {
              const active = unit === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setUnit(opt.value);
                    if (opt.value === "unidad" && quantityText === "100") setQuantityText("1");
                    if (opt.value !== "unidad" && quantityText === "1") setQuantityText("100");
                  }}
                  style={[styles.unitChip, active && styles.unitChipActive]}
                >
                  <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Agregar producto a la lista"
            style={[styles.addBtn, isAdding && styles.btnDisabled]}
            onPress={() => void handleAddManual()}
            disabled={isAdding}
          >
            {isAdding ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Agregar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        {formError && <Text style={styles.errorText}>{formError}</Text>}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={styles.loading} />
      ) : error ? (
        <StateCard
          title="No pudimos cargar tu lista"
          message="Revisa tu conexión e inténtalo nuevamente."
          onRetry={() => void refetch()}
        />
      ) : items.length === 0 ? (
        <View style={styles.emptyCard}>
          <ShoppingCart size={36} color={colors.primary} />
          <Text style={styles.emptyTitle}>Tu lista de compras está vacía</Text>
          <Text style={styles.emptySubtitle}>
            Abre cualquier receta (del catálogo o generada con IA) y toca &quot;Agregar a Compras&quot;, o añade ítems manualmente arriba.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.emptyBtn}
            onPress={() => router.replace("/recipes")}
          >
            <Text style={styles.emptyBtnText}>Explorar recetas</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {pendingGroups.map((group) => {
            const catMeta = SHOPPING_CATEGORY_LABELS[group.category];
            return (
              <View key={group.category} style={styles.sectionBlock}>
                <Text style={styles.sectionHeader}>
                  {catMeta.icon} {catMeta.label} ({group.items.length})
                </Text>
                <View style={styles.groupCard}>
                  {group.items.map((item, idx) => (
                    <View
                      key={item.id}
                      style={[
                        styles.itemRow,
                        idx < group.items.length - 1 && styles.itemDivider,
                      ]}
                    >
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityLabel={`Marcar ${item.name} como comprado`}
                        accessibilityState={{ checked: item.checked }}
                        style={styles.itemTapArea}
                        onPress={() => toggleItem(item.id, !item.checked)}
                      >
                        <View style={styles.checkbox}>
                          {item.checked && <Check size={14} color="#FFFFFF" />}
                        </View>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          {item.sourceRecipes.length > 0 && (
                            <Text style={styles.itemSources} numberOfLines={1}>
                              Para: {item.sourceRecipes.join(", ")}
                            </Text>
                          )}
                        </View>
                        <View style={styles.qtyPill}>
                          <Text style={styles.qtyPillText}>
                            {formatShoppingQuantity(item.quantity, item.unit)}
                          </Text>
                        </View>
                      </Pressable>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Eliminar ${item.name}`}
                        style={styles.deleteBtn}
                        onPress={() =>
                          void removeItem(item.id).catch((err: any) =>
                            showToast({ type: "error", title: "Error", message: err?.message })
                          )
                        }
                      >
                        <X size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {checkedItems.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.checkedHeaderRow}>
                <Text style={styles.sectionHeader}>
                  ✓ Comprados ({checkedItems.length})
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar comprados"
                  style={styles.clearBtn}
                  onPress={handleClearChecked}
                  disabled={isMutating}
                >
                  <Trash2 size={14} color={colors.danger} />
                  <Text style={styles.clearBtnText}>Limpiar comprados</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.groupCard, styles.checkedCard]}>
                {checkedItems.map((item, idx) => (
                  <View
                    key={item.id}
                    style={[
                      styles.itemRow,
                      idx < checkedItems.length - 1 && styles.itemDivider,
                    ]}
                  >
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={`Desmarcar ${item.name}`}
                      accessibilityState={{ checked: item.checked }}
                      style={styles.itemTapArea}
                      onPress={() => toggleItem(item.id, false)}
                    >
                      <View style={[styles.checkbox, styles.checkboxChecked]}>
                        <Check size={14} color="#FFFFFF" />
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={[styles.itemName, styles.itemNameChecked]}>
                          {item.name}
                        </Text>
                      </View>
                      <Text style={styles.checkedQtyText}>
                        {formatShoppingQuantity(item.quantity, item.unit)}
                      </Text>
                    </Pressable>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar ${item.name}`}
                      style={styles.deleteBtn}
                      onPress={() =>
                        void removeItem(item.id).catch((err: any) =>
                          showToast({ type: "error", title: "Error", message: err?.message })
                        )
                      }
                    >
                      <X size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { ...layout.narrowPage },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingRight: 8,
  },
  backText: { fontSize: 14, fontWeight: "700", color: colors.primary },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
  },
  shareBtnText: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  addCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 22,
  },
  addTitle: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 10 },
  nameInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
    marginBottom: 10,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  qtyInput: {
    width: 72,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  unitGroup: { flexDirection: "row", gap: 6 },
  unitChip: {
    minHeight: 40,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
    justifyContent: "center",
  },
  unitChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitChipText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  unitChipTextActive: { color: "#FFFFFF" },
  addBtn: {
    marginLeft: "auto",
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnDisabled: { opacity: 0.65 },
  addBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  errorText: { fontSize: 12, color: colors.danger, fontWeight: "600", marginTop: 8 },
  loading: { marginVertical: 48 },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 12, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 19, marginBottom: 18 },
  emptyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  sectionBlock: { marginBottom: 20 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  groupCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },
  checkedCard: {
    backgroundColor: colors.surfaceMuted,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  itemTapArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 14, fontWeight: "600", color: colors.text },
  itemNameChecked: { textDecorationLine: "line-through", color: colors.textMuted },
  itemSources: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  qtyPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qtyPillText: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },
  checkedQtyText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  checkedHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.dangerLight,
  },
  clearBtnText: { fontSize: 12, fontWeight: "700", color: colors.danger },
});
