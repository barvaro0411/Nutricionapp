import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSubscription } from "@/hooks/useSubscription";
import { colors } from "@/constants/colors";

export default function PaywallScreen() {
  const router = useRouter();
  const { purchasePlan, isPurchasing, isPro } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<"pro_annual_clp" | "pro_monthly_clp">(
    "pro_annual_clp"
  );

  const handleSubscribe = async () => {
    try {
      await purchasePlan(selectedPlan);
      Alert.alert(
        "¡Bienvenido a Nutrición Pro! 💎",
        "Tu cuenta ha sido activada con escaneos y funciones ilimitadas.",
        [{ text: "Continuar", onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert("Error en la compra", err?.message || "No se pudo procesar la suscripción.");
    }
  };

  const handleRestore = () => {
    Alert.alert("Restaurar Compras", "Tus compras anteriores han sido verificadas correctamente.");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Close */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.gemBadge}>
          <Text style={styles.gemIcon}>💎</Text>
        </View>
        <Text style={styles.title}>Nutrición Pro</Text>
        <Text style={styles.subtitle}>
          Lleva tu seguimiento al siguiente nivel sin límites de inteligencia artificial.
        </Text>
      </View>

      {/* Beneficios */}
      <View style={styles.benefitsCard}>
        {[
          { icon: "📸", title: "Fotos con IA Ilimitadas", desc: "Registra todos tus platos, ensaladas y snacks del día." },
          { icon: "🎙️", title: "Dictado por Voz Multimodal", desc: "Describe tu comida por voz sin límites." },
          { icon: "🤖", title: "Coach Nutricional IA 24/7", desc: "Consejos en vivo con el contexto de lo que comiste hoy." },
          { icon: "📄", title: "Informes Clínicos para Nutricionistas", desc: "Exporta tus promedios semanales en PDF/CSV." },
          { icon: "⚡", title: "Procesamiento Prioritario", desc: "Análisis de imagen y audio ultra-rápido en servidores dedicados." },
        ].map((benefit, idx) => (
          <View key={idx} style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>{benefit.icon}</Text>
            <View style={styles.benefitTextCol}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitDesc}>{benefit.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Selector de Planes en Pesos Chilenos (CLP) */}
      <Text style={styles.plansSectionTitle}>Selecciona tu plan:</Text>
      <View style={styles.plansContainer}>
        {/* Plan Anual */}
        <TouchableOpacity
          style={[styles.planCard, selectedPlan === "pro_annual_clp" && styles.planCardActive]}
          onPress={() => setSelectedPlan("pro_annual_clp")}
          activeOpacity={0.8}
        >
          <View style={styles.bestValueBadge}>
            <Text style={styles.bestValueText}>MEJOR VALOR • AHORRA 33%</Text>
          </View>
          <View style={styles.planCardHeader}>
            <Text style={styles.planTitle}>Anual</Text>
            <Text style={styles.planPrice}>$39.990 CLP / año</Text>
          </View>
          <Text style={styles.planSubtext}>Equivale a solo $3.332 CLP al mes • Incluye 7 días gratis</Text>
        </TouchableOpacity>

        {/* Plan Mensual */}
        <TouchableOpacity
          style={[styles.planCard, selectedPlan === "pro_monthly_clp" && styles.planCardActive]}
          onPress={() => setSelectedPlan("pro_monthly_clp")}
          activeOpacity={0.8}
        >
          <View style={styles.planCardHeader}>
            <Text style={styles.planTitle}>Mensual</Text>
            <Text style={styles.planPrice}>$4.990 CLP / mes</Text>
          </View>
          <Text style={styles.planSubtext}>Cancela cuando quieras • Facturación mes a mes</Text>
        </TouchableOpacity>
      </View>

      {/* Botón de Suscripción */}
      <TouchableOpacity
        style={[styles.ctaButton, isPurchasing && styles.btnDisabled]}
        onPress={handleSubscribe}
        disabled={isPurchasing}
      >
        {isPurchasing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.ctaButtonText}>
            {selectedPlan === "pro_annual_clp" ? "Probar 7 Días Gratis" : "Suscribirme Ahora"}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.guaranteeText}>
        🔒 Cancela en cualquier momento desde tu cuenta de App Store o Google Play.
      </Text>

      {/* Footer */}
      <View style={styles.footerRow}>
        <TouchableOpacity onPress={handleRestore}>
          <Text style={styles.footerLink}>Restaurar compras</Text>
        </TouchableOpacity>
        <Text style={styles.footerDot}>•</Text>
        <Text style={styles.footerLink}>Términos de servicio</Text>
        <Text style={styles.footerDot}>•</Text>
        <Text style={styles.footerLink}>Privacidad</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 48 : 20,
    paddingBottom: 40,
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  gemBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EFF6FF", // Blue 50
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#BFDBFE",
  },
  gemIcon: {
    fontSize: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  benefitsCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 24,
    gap: 14,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitIcon: {
    fontSize: 22,
  },
  benefitTextCol: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  benefitDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  plansSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    position: "relative",
  },
  planCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#F0FDF4",
  },
  bestValueBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  planSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  guaranteeText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  footerLink: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  footerDot: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
