import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { Camera, Mic, Barcode, Star, X, Sparkles } from "lucide-react-native";
import { colors } from "@/constants/colors";

interface QuickLogModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectTextVoice: () => void;
  onSelectBarcode: () => void;
  onSelectFavorites: () => void;
}

export function QuickLogModal({
  visible,
  onClose,
  onSelectCamera,
  onSelectTextVoice,
  onSelectBarcode,
  onSelectFavorites,
}: QuickLogModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Handle bar */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.titleWrapper}>
                  <View style={styles.sparkleBadge}>
                    <Sparkles size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.title}>Registrar Comida</Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>
                Elige el método que te resulte más cómodo ahora:
              </Text>

              {/* Opciones */}
              <View style={styles.optionsList}>
                {/* 1. Foto con IA */}
                <TouchableOpacity
                  style={[styles.optionCard, styles.optionCardFeatured]}
                  onPress={() => {
                    onClose();
                    onSelectCamera();
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Camera size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.optionTexts}>
                    <View style={styles.tagRow}>
                      <Text style={styles.optionTitle}>Foto IA de tu plato</Text>
                      <View style={styles.aiTag}>
                        <Text style={styles.aiTagText}>⚡ MÁS RÁPIDO</Text>
                      </View>
                    </View>
                    <Text style={styles.optionDesc}>
                      Fotografía tu comida y la IA reconoce porciones y calorías automáticamente.
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* 2. Texto / Voz */}
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={() => {
                    onClose();
                    onSelectTextVoice();
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: "#EEF2FF" },
                    ]}
                  >
                    <Mic size={22} color="#6366F1" />
                  </View>
                  <View style={styles.optionTexts}>
                    <Text style={styles.optionTitle}>Escribir o Dictar con voz</Text>
                    <Text style={styles.optionDesc}>
                      Ej: "2 huevos revueltos con media marraqueta y café".
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* 3. Código de barras */}
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={() => {
                    onClose();
                    onSelectBarcode();
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: "#F0F9FF" },
                    ]}
                  >
                    <Barcode size={22} color="#0EA5E9" />
                  </View>
                  <View style={styles.optionTexts}>
                    <Text style={styles.optionTitle}>Escanear Código de Barras</Text>
                    <Text style={styles.optionDesc}>
                      Busca alimentos envasados y productos chilenos por su código.
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* 4. Comidas frecuentes */}
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={() => {
                    onClose();
                    onSelectFavorites();
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: "#FEF3C7" },
                    ]}
                  >
                    <Star size={22} color="#F59E0B" fill="#F59E0B" />
                  </View>
                  <View style={styles.optionTexts}>
                    <Text style={styles.optionTitle}>Comidas Frecuentes</Text>
                    <Text style={styles.optionDesc}>
                      Registra en 1 toque lo que comes habitualmente.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sparkleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    marginTop: 2,
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 14,
  },
  optionCardFeatured: {
    borderColor: "#A7F3D0",
    backgroundColor: colors.primaryGhost,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTexts: {
    flex: 1,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  aiTag: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiTagText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  optionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
