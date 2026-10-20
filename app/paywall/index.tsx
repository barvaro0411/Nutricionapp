import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSubscription } from "@/hooks/useSubscription";
import { colors, layout } from "@/constants/colors";
import { showAlert } from "@/utils/alerts";
import {
  Sparkles,
  Camera,
  Mic,
  BookmarkCheck,
  ShieldCheck,
  X,
} from "lucide-react-native";

export default function PaywallScreen() {
  const router = useRouter();
  const { isPro, trialUsed, activateTrial, isActivatingTrial } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">("annual");

  const handleStartTrial = async () => {
    try {
      const planId = selectedPlan === "annual" ? "pro_annual_clp" : "pro_monthly_clp";
      const updated = await activateTrial(planId);
      if (!updated?.isPro) {
        throw new Error("El servidor no pudo confirmar la activación de tu prueba Pro.");
      }
      showAlert("¡Bienvenido a Pro! 🌟", "Se ha activado tu prueba gratuita de 7 días con escaneos y voz ilimitados.");
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      showAlert("No se pudo activar la prueba", err?.message || "No se pudo activar la prueba en el servidor. Reintenta.");
    }
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Botón cerrar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Cerrar pantalla de suscripción"
        >
          <X size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Hero Header */}
      <View style={styles.heroSection}>
        <View style={styles.proBadge}>
          <Sparkles size={14} color="#4F46E5" />
          <Text style={styles.proBadgeText}>NUTRIIA PRO</Text>
        </View>
        <Text style={styles.title}>Potencia tu Nutrición sin Límites</Text>
        <Text style={styles.subtitle}>
          {isPro
            ? "Ya tienes una suscripción Pro activa en tu cuenta."
            : "Desbloquea análisis ilimitados de fotos, coach por voz en vivo y todas las funciones avanzadas."}
        </Text>
      </View>

      {/* Selector de Planes */}
      {!isPro && (
        <View style={styles.plansContainer}>
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === "annual" && styles.planCardActive,
            ]}
            onPress={() => setSelectedPlan("annual")}
            activeOpacity={0.85}
          >
            <View style={styles.popularTag}>
              <Text style={styles.popularTagText}>AHORRA 33% · MÁS ELEGIDO</Text>
            </View>
            <View style={styles.planHeaderRow}>
              <View>
                <Text style={styles.planName}>Plan Anual</Text>
                <Text style={styles.planSubtext}>$3.330 CLP al mes</Text>
              </View>
              <Text style={styles.planPrice}>$39.990<Text style={styles.pricePeriod}>/año</Text></Text>
            </View>
            <Text style={styles.planTrialNote}>Incluye 7 días de prueba gratis</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === "monthly" && styles.planCardActive,
            ]}
            onPress={() => setSelectedPlan("monthly")}
            activeOpacity={0.85}
          >
            <View style={styles.planHeaderRow}>
              <View>
                <Text style={styles.planName}>Plan Mensual</Text>
                <Text style={styles.planSubtext}>Flexibilidad mes a mes</Text>
              </View>
              <Text style={styles.planPrice}>$4.990<Text style={styles.pricePeriod}>/mes</Text></Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Beneficios Clave */}
      <View style={styles.benefitsCard}>
        <Text style={styles.benefitsTitle}>¿Qué incluye tu plan Pro?</Text>

        <View style={styles.benefitRow}>
          <View style={styles.benefitIconWrap}>
            <Camera size={18} color={colors.primary} />
          </View>
          <View style={styles.benefitTextWrap}>
            <Text style={styles.benefitHeading}>Escaneos de Comida Ilimitados</Text>
            <Text style={styles.benefitDescription}>
              El plan básico incluye 3 escaneos diarios. En Pro analiza todas tus comidas y etiquetas sin restricciones.
            </Text>
          </View>
        </View>

        <View style={styles.benefitRow}>
          <View style={styles.benefitIconWrap}>
            <Mic size={18} color="#8B5CF6" />
          </View>
          <View style={styles.benefitTextWrap}>
            <Text style={styles.benefitHeading}>Coach Interactivo por Voz</Text>
            <Text style={styles.benefitDescription}>
              Conversa directamente por audio con tu asistente para resolver dudas de porciones y alternativas.
            </Text>
          </View>
        </View>

        <View style={styles.benefitRow}>
          <View style={styles.benefitIconWrap}>
            <BookmarkCheck size={18} color="#059669" />
          </View>
          <View style={styles.benefitTextWrap}>
            <Text style={styles.benefitHeading}>Combos y Favoritos Ilimitados</Text>
            <Text style={styles.benefitDescription}>
              Guarda tus plantillas de comidas completas frecuentes y regístralas de un solo toque sin esperas.
            </Text>
          </View>
        </View>

        <View style={styles.benefitRow}>
          <View style={styles.benefitIconWrap}>
            <ShieldCheck size={18} color="#D97706" />
          </View>
          <View style={styles.benefitTextWrap}>
            <Text style={styles.benefitHeading}>Alertas de Alérgenos y Sellos Oficiales</Text>
            <Text style={styles.benefitDescription}>
              Detección de sellos Ley 20.606 y filtros personalizados para celiaquía, lactosa y alergias alimentarias.
            </Text>
          </View>
        </View>
      </View>

      {/* Botón Principal de Acción */}
      <View style={styles.actionsContainer}>
        {!isPro ? (
          <TouchableOpacity
            style={[
              styles.primaryActionBtn,
              (isActivatingTrial || trialUsed) && styles.disabledBtn,
            ]}
            onPress={handleStartTrial}
            disabled={isActivatingTrial || trialUsed}
            activeOpacity={0.85}
          >
            {isActivatingTrial ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryActionBtnText}>
                {trialUsed
                  ? "Prueba Gratis de 7 Días ya Utilizada"
                  : "Comenzar Prueba Gratis de 7 Días"}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={handleClose}
          >
            <Text style={styles.primaryActionBtnText}>Continuar al Panel Principal</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.freePlanBtn} onPress={handleClose}>
          <Text style={styles.freePlanBtnText}>
            Continuar con Plan Gratuito (3 escaneos al día)
          </Text>
        </TouchableOpacity>

        {/* Bloqueo suave de cuota: métodos gratuitos ilimitados */}
        <View style={styles.softPaywallBox}>
          <Text style={styles.softPaywallTitle}>
            ¿Alcanzaste tus 3 escaneos IA de hoy? Sigue registrando gratis sin límites:
          </Text>
          <View style={styles.softPaywallBtnsRow}>
            <TouchableOpacity
              style={styles.softAltBtn}
              onPress={() => router.replace("/(tabs)/record")}
            >
              <Text style={styles.softAltBtnText}>🔍 Catálogo Chileno / USDA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.softAltBtn}
              onPress={() => router.replace("/meal/barcode")}
            >
              <Text style={styles.softAltBtnText}>📦 Código de Barras</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.softAltBtn}
              onPress={() => router.replace({ pathname: "/meal/review", params: { manual: "1" } })}
            >
              <Text style={styles.softAltBtnText}>✏️ Entrada Manual</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Letra chica */}
      <Text style={styles.termsText}>
        Precios en pesos chilenos (CLP). La prueba gratuita dura 7 días. Puedes cancelar en cualquier momento desde los ajustes de tu cuenta.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...layout.narrowPage,
    paddingTop: Platform.OS === "ios" ? 48 : 24,
    paddingBottom: 40,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4338CA",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 340,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    position: "relative",
  },
  planCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  popularTag: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  planHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  planSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  pricePeriod: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  planTrialNote: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primaryDark,
    marginTop: 8,
  },
  benefitsCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 2,
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 3,
  },
  benefitDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  actionsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  freePlanBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  freePlanBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  softPaywallBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 6,
  },
  softPaywallTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 10,
  },
  softPaywallBtnsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  softAltBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  softAltBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  termsText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});
