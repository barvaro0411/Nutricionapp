import { showAlert } from "@/utils/alerts";
import React, { useState, useEffect } from "react";
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
import { FileText, Target, ChevronRight, LogOut } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import {
  getReminderPreferences,
  toggleReminder,
  MealReminderConfig,
  DEFAULT_CHILEAN_REMINDERS,
} from "@/services/notificationService";
import { colors } from "@/constants/colors";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [reminders, setReminders] = useState<MealReminderConfig[]>(DEFAULT_CHILEAN_REMINDERS);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    const prefs = await getReminderPreferences();
    setReminders(prefs);
  };

  const handleToggleReminder = async (id: string, value: boolean) => {
    try { const updated = await toggleReminder(id, value); setReminders(updated); }
    catch (e) { showAlert("Recordatorios", e instanceof Error ? e.message : "No se pudo programar."); }
  };

  const handleSignOut = () => {
    showAlert("Cerrar Sesión", "¿Estás seguro de que deseas salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          try { await signOut(); router.replace("/(auth)/login"); }
          catch { showAlert("No se pudo cerrar la sesión", "Reintenta para continuar."); }
        },
      },
    ]);
  };

  const handleRecalculateGoals = () => {
    router.push("/(onboarding)/profile-setup");
  };

  const objectiveMap: Record<string, string> = {
    lose_weight: "Bajar grasa corporal",
    maintain: "Mantener peso actual",
    gain_muscle: "Aumentar masa muscular",
  };

  const activityMap: Record<string, string> = {
    sedentary: "Sedentario",
    light: "Ligero (1-2 días)",
    moderate: "Moderado (3-5 días)",
    active: "Activo (6-7 días)",
    very_active: "Muy activo",
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tarjeta de Usuario */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.full_name || user?.email || "U")[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{profile?.full_name || "Usuario"}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Beta de pruebas</Text>
      <Text style={styles.actionSubtitle}>Comidas, metas, IA e informes. Cada cuenta mantiene sus datos separados.</Text>
      {/* Informes Clínicos para Nutricionistas */}
      <Text style={styles.sectionHeader}>Herramientas de Salud</Text>
      <View style={styles.actionsCard}>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push("/export")}
        >
          <View style={styles.actionIconBadge}>
            <FileText size={20} color={colors.primary} />
          </View>
          <View style={styles.actionTextWrapper}>
            <Text style={styles.actionTitle}>Exportar Informe para Nutricionista</Text>
            <Text style={styles.actionSubtitle}>
              Genera tu resumen semanal o mensual para WhatsApp o planilla Excel
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Recordatorios de Horarios de Comidas Chilenas */}
      <Text style={styles.sectionHeader}>Horarios y Recordatorios (Chile)</Text>
      <View style={styles.actionsCard}>
        {Platform.OS === "web" && <Text style={[styles.actionSubtitle, { padding: 16 }]}>Los recordatorios están disponibles en la app instalada para iOS o Android.</Text>}
        {reminders.map((rem, idx) => (
          <React.Fragment key={rem.id}>
            <View style={styles.reminderRow}>
              <View style={styles.actionTextWrapper}>
                <Text style={styles.actionTitle}>{rem.title}</Text>
                <Text style={styles.actionSubtitle}>
                  Programado a las {String(rem.hour).padStart(2, "0")}:
                  {String(rem.minute).padStart(2, "0")} hrs
                </Text>
              </View>
              <Switch
                disabled={Platform.OS === "web"}
                value={rem.enabled}
                onValueChange={(val) => handleToggleReminder(rem.id, val)}
                trackColor={{ false: colors.cardBorder, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            {idx < reminders.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {/* Métricas actuales */}
      <Text style={styles.sectionHeader}>Mis Métricas Actuales</Text>
      <View style={styles.metricsCard}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Peso actual</Text>
          <Text style={styles.metricValue}>
            {profile?.current_weight_kg ? `${profile.current_weight_kg} kg` : "No definido"}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Estatura</Text>
          <Text style={styles.metricValue}>
            {profile?.height_cm ? `${profile.height_cm} cm` : "No definida"}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Objetivo principal</Text>
          <Text style={styles.metricValue}>
            {profile?.objective ? objectiveMap[profile.objective] : "No definido"}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Nivel de actividad</Text>
          <Text style={styles.metricValue}>
            {profile?.activity_level ? activityMap[profile.activity_level] : "No definido"}
          </Text>
        </View>
      </View>

      {/* Preferencias */}
      <Text style={styles.sectionHeader}>Preferencias</Text>
      <View style={styles.actionsCard}>
        <TouchableOpacity style={styles.actionRow} onPress={handleRecalculateGoals}>
          <View style={[styles.actionIconBadge, { backgroundColor: "#FEF3C7" }]}>
            <Target size={20} color="#D97706" />
          </View>
          <View style={styles.actionTextWrapper}>
            <Text style={styles.actionTitle}>Recalcular Objetivos</Text>
            <Text style={styles.actionSubtitle}>
              Actualiza tu peso o cambia tu meta de calorías y macros
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Cerrar Sesión */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <LogOut size={18} color={colors.danger} style={{ marginRight: 8 }} />
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Nutrición IA · Beta</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  proCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  proCardLeft: {
    flex: 1,
  },
  proBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  proBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryAccent,
    letterSpacing: 1,
  },
  proTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  proSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  metricsCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 24,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  actionsCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 24,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  actionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  actionTextWrapper: {
    flex: 1,
    marginRight: 10,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  actionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.danger,
    marginTop: 8,
  },
  logoutButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "700",
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 24,
  },
});
