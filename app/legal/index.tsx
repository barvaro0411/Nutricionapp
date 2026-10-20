import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Sparkles,
  Trash2,
} from "lucide-react-native";
import { colors, layout } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { useAiConsent } from "@/hooks/useAiConsent";
import { showAlert } from "@/utils/alerts";

export default function LegalAndPrivacyScreen() {
  const router = useRouter();
  const { user, deleteAccount, loading } = useAuth();
  const { hasConsent, setConsent, isUpdating } = useAiConsent();
  const [activeTab, setActiveTab] = useState<"privacy" | "terms" | "ai">("privacy");

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(user ? "/(tabs)/settings" : "/(auth)/login");
    }
  };

  const handleToggleConsent = async (value: boolean) => {
    if (!user) {
      showAlert("Inicia sesión", "Inicia sesión para guardar tu preferencia de consentimiento IA.");
      return;
    }
    try {
      await setConsent(value);
      showAlert(
        value ? "Consentimiento IA activado" : "Consentimiento IA revocado",
        value
          ? "Ahora puedes usar el análisis por foto, voz y el Coach IA."
          : "Se ha desactivado el envío de datos a proveedores de IA. Puedes seguir usando el Catálogo Chileno, código de barras e ingreso manual."
      );
    } catch (err: any) {
      showAlert("Error", err?.message || "No se pudo actualizar tu preferencia.");
    }
  };

  const handleConfirmDeleteAccount = () => {
    if (!user) return;
    showAlert(
      "Eliminar mi cuenta permanentemente",
      "Esta acción borrará de forma irreversible tu perfil, historial de comidas, hidratación, registros de peso, fotos almacenadas y conversaciones con el coach. ¿Deseas continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, eliminar mi cuenta",
          style: "destructive",
          onPress: async () => {
            const res = await deleteAccount();
            if (res.success) {
              showAlert("Cuenta eliminada", "Todos tus datos personales y registros han sido eliminados del servidor.");
              router.replace("/(auth)/login");
            } else {
              showAlert("No se pudo eliminar", res.error || "Inténtalo nuevamente.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver atrás"
          onPress={handleBack}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacidad, Términos e IA</Text>
      </View>

      {/* Selector de pestañas */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.tabBtn, activeTab === "privacy" && styles.tabBtnActive]}
          onPress={() => setActiveTab("privacy")}
        >
          <ShieldCheck size={15} color={activeTab === "privacy" ? colors.primaryDark : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === "privacy" && styles.tabTextActive]}>
            Privacidad
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.tabBtn, activeTab === "terms" && styles.tabBtnActive]}
          onPress={() => setActiveTab("terms")}
        >
          <FileText size={15} color={activeTab === "terms" ? colors.primaryDark : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === "terms" && styles.tabTextActive]}>
            Términos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.tabBtn, activeTab === "ai" && styles.tabBtnActive]}
          onPress={() => setActiveTab("ai")}
        >
          <Sparkles size={15} color={activeTab === "ai" ? colors.primaryDark : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === "ai" && styles.tabTextActive]}>
            Datos e IA
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "privacy" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Política de Privacidad (Chile · Ley 19.628)</Text>
          <Text style={styles.updatedAt}>Última actualización: Octubre 2026</Text>

          <Text style={styles.sectionHeading}>1. Datos que recopilamos</Text>
          <Text style={styles.paragraph}>
            Nutrición IA recopila únicamente la información necesaria para calcular tus requerimientos nutricionales y llevar tu registro diario: correo electrónico de acceso, medidas corporales (peso, estatura, edad, nivel de actividad), registros de comidas, hidratación y fotografías opcionales de alimentos.
          </Text>

          <Text style={styles.sectionHeading}>2. Minimización y anonimización ante terceros</Text>
          <Text style={styles.paragraph}>
            Tu nombre completo, correo electrónico e identificador de usuario nunca se comparten con proveedores externos de Inteligencia Artificial ni bases de datos de alimentos (USDA FoodData Central / Open Food Facts). Las consultas a modelos de lenguaje e imagen se realizan desde funciones de servidor seguras eliminando cualquier identificador personal.
          </Text>

          <Text style={styles.sectionHeading}>3. Retención y borrado automático de fotografías</Text>
          <Text style={styles.paragraph}>
            Las fotografías de platos subidas para análisis nutricional se almacenan en un contenedor privado con control de acceso por fila (RLS) y son eliminadas automáticamente del almacenamiento pasados 14 días, conservando solo el desglose nutricional confirmado por ti.
          </Text>

          <Text style={styles.sectionHeading}>4. Derechos ARCO y eliminación total</Text>
          <Text style={styles.paragraph}>
            Como titular de tus datos en Chile, tienes derecho de acceso, rectificación, cancelación y oposición. Puedes exportar tus registros en formato CSV/PDF o eliminar permanentemente tu cuenta y todos tus datos desde esta misma pantalla o en Ajustes.
          </Text>
        </View>
      )}

      {activeTab === "terms" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Términos y Condiciones de Uso</Text>
          <Text style={styles.updatedAt}>Última actualización: Octubre 2026</Text>

          <Text style={styles.sectionHeading}>1. Propósito informativo y aviso médico</Text>
          <Text style={styles.paragraph}>
            Nutrición IA es una herramienta de apoyo para el registro de hábitos alimentarios e hidratación adaptada a Chile. Las estimaciones calóricas, sellos referenciales Ley 20.606 y sugerencias del Coach IA tienen carácter orientativo y no reemplazan el diagnóstico, tratamiento ni supervisión de un médico o nutricionista profesional.
          </Text>

          <Text style={styles.sectionHeading}>2. Verificación de porciones y alérgenos</Text>
          <Text style={styles.paragraph}>
            Las estimaciones generadas por visión computacional o voz pueden presentar variaciones según preparación e ingredientes ocultos. Si presentas alergias alimentarias severas o enfermedad celíaca, verifica siempre el etiquetado oficial del envase antes de consumir un producto.
          </Text>

          <Text style={styles.sectionHeading}>3. Plan Gratuito y Prueba Pro</Text>
          <Text style={styles.paragraph}>
            El plan gratuito incluye acceso ilimitado al Catálogo Chileno, búsqueda USDA, escáner de código de barras y registro manual, además de hasta 3 escaneos diarios con IA. La prueba gratuita de 7 días de NutriIA Pro se otorga una sola vez por cuenta registrada.
          </Text>
        </View>
      )}

      {activeTab === "ai" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Consentimiento de Procesamiento con IA</Text>
          <Text style={styles.paragraph}>
            Para analizar fotografías de platos, transcribir notas de voz y conversar con el Coach Nutricional, la aplicación procesa el contenido de la consulta mediante proveedores de IA en la nube (Google Gemini y Groq) bajo canales cifrados HTTPS.
          </Text>

          <View style={styles.consentSwitchBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.consentSwitchTitle}>
                Autorizar análisis con Inteligencia Artificial
              </Text>
              <Text style={styles.consentSwitchSub}>
                {hasConsent
                  ? "Consentimiento activo. Puedes usar cámara IA, voz y coach."
                  : "Desactivado. Solo se usarán herramientas manuales y catálogos locales."}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Autorizar análisis con Inteligencia Artificial"
              value={hasConsent}
              disabled={isUpdating || !user}
              onValueChange={(val) => void handleToggleConsent(val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Text style={styles.sectionHeading}>¿Qué ocurre si desactivo este permiso?</Text>
          <Text style={styles.paragraph}>
            Podrás seguir utilizando la aplicación con total normalidad mediante el Catálogo Chileno Instantáneo, búsqueda verificada USDA, lector de código de barras, recetas chilenas, registro de peso e hidratación sin enviar fotos ni audios a modelos de IA.
          </Text>
        </View>
      )}

      {user && (
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Zona de Control de Cuenta</Text>
          <Text style={styles.dangerDesc}>
            Si deseas dejar de usar Nutrición IA, puedes borrar tu cuenta y todos tus datos asociados en nuestros servidores de forma inmediata.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Eliminar mi cuenta permanentemente"
            style={styles.deleteBtn}
            disabled={loading}
            onPress={handleConfirmDeleteAccount}
          >
            <Trash2 size={17} color={colors.danger} />
            <Text style={styles.deleteBtnText}>
              {loading ? "Eliminando cuenta..." : "Eliminar mi cuenta y todos mis datos"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...layout.narrowPage,
    paddingTop: Platform.OS === "ios" ? 48 : 24,
    paddingBottom: 48,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.4,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primaryDark,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 22,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },
  updatedAt: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  consentSwitchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginVertical: 16,
  },
  consentSwitchTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  consentSwitchSub: {
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 3,
  },
  dangerZone: {
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#991B1B",
    marginBottom: 6,
  },
  dangerDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: "#7F1D1D",
    marginBottom: 14,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 13,
    borderRadius: 14,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.danger,
  },
});
