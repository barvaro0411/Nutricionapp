import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { ShieldCheck, Sparkles, Lock, Trash2, X } from "lucide-react-native";
import { colors } from "@/constants/colors";

export interface AiConsentModalProps {
  visible: boolean;
  isUpdating?: boolean;
  onAccept: () => void;
  onCancel: () => void;
  onViewPrivacy?: () => void;
}

export function AiConsentModal({
  visible,
  isUpdating = false,
  onAccept,
  onCancel,
  onViewPrivacy,
}: AiConsentModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <View style={styles.badge}>
              <Sparkles size={14} color={colors.primaryDark} />
              <Text style={styles.badgeText}>TRANSPARENCIA Y PRIVACIDAD IA</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cerrar aviso de consentimiento IA"
              style={styles.closeBtn}
              onPress={onCancel}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Consentimiento de Procesamiento con IA</Text>
          <Text style={styles.subtitle}>
            Antes de analizar fotos, audio o mensajes con el Coach IA, te explicamos de forma transparente cómo protegemos tus datos conforme a la normativa chilena (Ley 19.628):
          </Text>

          <ScrollView style={styles.pointsScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.pointRow}>
              <View style={styles.iconBox}>
                <ShieldCheck size={18} color={colors.primary} />
              </View>
              <View style={styles.pointTextWrap}>
                <Text style={styles.pointTitle}>¿Qué datos se procesan?</Text>
                <Text style={styles.pointDesc}>
                  Solo la fotografía del plato/etiqueta, grabación de voz o texto de comida que envías voluntariamente, junto con tus metas nutricionales numéricas del día.
                </Text>
              </View>
            </View>

            <View style={styles.pointRow}>
              <View style={styles.iconBox}>
                <Lock size={18} color="#4F46E5" />
              </View>
              <View style={styles.pointTextWrap}>
                <Text style={styles.pointTitle}>Sin datos personales identificables</Text>
                <Text style={styles.pointDesc}>
                  Nunca enviamos tu nombre, correo electrónico ni identificadores de cuenta a los proveedores de IA (Google Gemini / Groq) ni al catálogo USDA.
                </Text>
              </View>
            </View>

            <View style={styles.pointRow}>
              <View style={styles.iconBox}>
                <Trash2 size={18} color="#059669" />
              </View>
              <View style={styles.pointTextWrap}>
                <Text style={styles.pointTitle}>Eliminación automática y control total</Text>
                <Text style={styles.pointDesc}>
                  Las fotos se eliminan automáticamente a los 14 días. Puedes revocar este consentimiento o usar el catálogo chileno manual sin IA en cualquier momento desde Ajustes.
                </Text>
              </View>
            </View>
          </ScrollView>

          {onViewPrivacy && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onViewPrivacy}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>
                Leer Política de Privacidad y Términos de Uso completos →
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={isUpdating}
            >
              <Text style={styles.cancelBtnText}>Usar modo manual sin IA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.acceptBtn, isUpdating && styles.disabledBtn]}
              onPress={onAccept}
              disabled={isUpdating}
            >
              <Text style={styles.acceptBtnText}>
                {isUpdating ? "Guardando..." : "Aceptar y continuar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 22,
    width: "100%",
    maxWidth: 460,
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  pointsScroll: {
    maxHeight: 280,
    marginBottom: 12,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pointTextWrap: {
    flex: 1,
  },
  pointTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 3,
  },
  pointDesc: {
    fontSize: 11.5,
    lineHeight: 16.5,
    color: colors.textSecondary,
  },
  linkBtn: {
    paddingVertical: 8,
    marginBottom: 10,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledBtn: {
    opacity: 0.65,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
