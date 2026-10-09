import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  FileText,
  Target,
  ChevronRight,
  LogOut,
  Pencil,
  CheckCircle2,
  LockKeyhole,
} from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import {
  getReminderPreferences,
  toggleReminder,
  MealReminderConfig,
  DEFAULT_CHILEAN_REMINDERS,
} from "@/services/notificationService";
import { PageHeading, AppButton, FormField } from "@/components/common/AppUI";
import { showAlert } from "@/utils/alerts";
import { colors, layout } from "@/constants/colors";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, signOut, updateProfile, loading } = useAuth();
  const [reminders, setReminders] = useState<MealReminderConfig[]>(
    DEFAULT_CHILEAN_REMINDERS,
  );
  const [busyReminder, setBusyReminder] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getReminderPreferences(user?.id).then((prefs) => {
      if (active) setReminders(prefs);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);
  const toggle = async (id: string, enabled: boolean) => {
    if (busyReminder) return;
    setBusyReminder(id);
    try {
      setReminders(await toggleReminder(id, enabled));
    } catch (error) {
      showAlert(
        "Recordatorios",
        error instanceof Error
          ? error.message
          : "No se pudo guardar el cambio.",
      );
    } finally {
      setBusyReminder(null);
    }
  };
  const saveName = async () => {
    if (!name.trim()) {
      setEditError("Ingresa tu nombre.");
      return;
    }
    setEditError(null);
    const result = await updateProfile({ full_name: name.trim() });
    if (result.success) setEditing(false);
    else setEditError(result.error || "No se pudo guardar el nombre.");
  };
  const leave = () =>
    showAlert(
      "Cerrar sesión",
      "Tus registros seguirán guardados en tu cuenta.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              router.replace("/(auth)/login");
            } catch {
              showAlert(
                "No se pudo cerrar la sesión",
                "Reintenta para continuar.",
              );
            }
          },
        },
      ],
    );
  const objectives: Record<string, string> = {
    lose_weight: "Reducir grasa corporal",
    maintain: "Mantener mi peso",
    gain_muscle: "Ganar masa muscular",
  };
  const activity: Record<string, string> = {
    sedentary: "Sedentaria",
    light: "Ligera",
    moderate: "Moderada",
    active: "Activa",
    very_active: "Muy activa",
  };
  const metrics = [
    {
      label: "Peso actual",
      value: profile?.current_weight_kg
        ? profile.current_weight_kg + " kg"
        : "Por completar",
    },
    {
      label: "Estatura",
      value: profile?.height_cm ? profile.height_cm + " cm" : "Por completar",
    },
    {
      label: "Mi objetivo",
      value: objectives[profile?.objective || ""] || "Por completar",
    },
    {
      label: "Actividad",
      value: activity[profile?.activity_level || ""] || "Por completar",
    },
  ];
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <PageHeading
        eyebrow="A tu medida"
        title="Tu espacio"
        description="Administra tu perfil, tus metas y los hábitos que quieres mantener."
      />
      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.full_name || user?.email || "U")
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>
          <View style={styles.identity}>
            <Text style={styles.name}>{profile?.full_name || "Tu perfil"}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Editar mi nombre"
            style={styles.editButton}
            onPress={() => {
              setName(profile?.full_name || "");
              setEditing(true);
              setEditError(null);
            }}
          >
            <Pencil size={17} color={colors.mint} />
          </Pressable>
        </View>
        <Text selectable numberOfLines={1} style={styles.email}>{user?.email}</Text>
        {user?.email_confirmed_at && (
          <View style={styles.verified}>
            <CheckCircle2 size={13} color={colors.mint} />
            <Text style={styles.verifiedText}>Correo verificado</Text>
          </View>
        )}
      </View>
      {editing && (
        <View style={styles.editor}>
          <FormField
            label="Nombre completo"
            value={name}
            onChangeText={setName}
            maxLength={80}
            editable={!loading}
          />
          {editError && (
            <Text accessibilityRole="alert" style={styles.error}>
              {editError}
            </Text>
          )}
          <View style={styles.editorActions}>
            <View style={styles.editorButton}>
              <AppButton
                title="Cancelar"
                onPress={() => setEditing(false)}
                secondary
                disabled={loading}
              />
            </View>
            <View style={styles.editorButton}>
              <AppButton
                title="Guardar nombre"
                onPress={() => void saveName()}
                loading={loading}
              />
            </View>
          </View>
        </View>
      )}
      <Text style={styles.sectionTitle}>Tu punto de partida</Text>
      <View style={styles.metrics}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>{metric.value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualizar mis metas"
          onPress={() => router.push("/(onboarding)/profile-setup")}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <View style={styles.actionIcon}>
            <Target size={20} color={colors.primary} />
          </View>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>Actualizar mis metas</Text>
            <Text style={styles.actionDescription}>
              Revisa tus medidas y tu objetivo nutricional.
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Exportar mis registros"
          onPress={() => router.push("/export")}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <View style={styles.actionIcon}>
            <FileText size={20} color={colors.primary} />
          </View>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>Exportar mis registros</Text>
            <Text style={styles.actionDescription}>
              Comparte un resumen con tu nutricionista.
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </Pressable>
      </View>
      <Text style={styles.sectionTitle}>Un recordatorio a tiempo</Text>
      <Text style={styles.sectionDescription}>
        Horarios de comidas e hidratación para tu rutina en Chile.
      </Text>
      <View style={styles.reminders}>
        {Platform.OS === "web" && (
          <View style={styles.webReminderNotice}>
            <Text style={styles.noticeText}>
              Disponibles en la app para iOS y Android. En el navegador puedes
              registrar tus hábitos en cualquier momento.
            </Text>
          </View>
        )}
        {reminders.map((rem, index) => (
          <View
            key={rem.id}
            style={[styles.reminder, index > 0 && styles.reminderBorder]}
          >
            <View style={styles.reminderTime}>
              <Text style={styles.timeText}>
                {String(rem.hour).padStart(2, "0")}:
                {String(rem.minute).padStart(2, "0")}
              </Text>
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>
                {rem.mealType === "breakfast"
                  ? "Desayuno"
                  : rem.mealType === "lunch"
                    ? "Almuerzo"
                    : rem.mealType === "water"
                      ? "Hidratación"
                      : "Once / Cena"}
              </Text>
              <Text style={styles.actionDescription}>
                {rem.enabled ? "Activado" : "Desactivado"}
              </Text>
            </View>
            <Switch
              accessibilityLabel={"Recordatorio de " + rem.mealType}
              disabled={Platform.OS === "web" || !!busyReminder}
              value={rem.enabled}
              onValueChange={(value) => void toggle(rem.id, value)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
      </View>
      <View style={styles.privacy}>
        <LockKeyhole size={20} color={colors.primary} />
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>Tu cuenta, tu progreso</Text>
          <Text style={styles.actionDescription}>
            Los registros confirmados se guardan en tu cuenta. Cerrar sesión no
            los elimina.
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        disabled={loading}
        onPress={leave}
        style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
      >
        <LogOut size={18} color={colors.danger} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
      <Text style={styles.footer}>Nutrición IA · Un día a la vez</Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { ...layout.narrowPage },
  profileCard: {
    backgroundColor: colors.forest,
    padding: 22,
    borderRadius: 24,
    marginBottom: 26,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 24, fontWeight: "800", color: colors.forest },
  identity: { flex: 1, minWidth: 0 },
  name: { fontSize: 19, fontWeight: "700", color: "#FFFFFF" },
  email: { fontSize: 12, lineHeight: 18, color: "#CEE1D6", marginTop: 16 },
  editButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#2C5B45",
  },
  verified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
  },
  verifiedText: { fontSize: 11, color: colors.mint },
  editor: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  editorActions: { flexDirection: "row", gap: 10 },
  editorButton: { flex: 1 },
  error: { fontSize: 13, color: colors.danger, marginBottom: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 22,
  },
  metric: {
    flexGrow: 1,
    flexBasis: "44%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    borderRadius: 18,
    minWidth: 0,
  },
  metricLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  metricValue: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 24,
  },
  actions: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 28,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
    minHeight: 86,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: { flex: 1, minWidth: 0 },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 20,
  },
  actionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 18,
  },
  pressed: { opacity: 0.75 },
  reminders: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 24,
  },
  webReminderNotice: { padding: 16, backgroundColor: colors.primaryLight },
  noticeText: { fontSize: 12, lineHeight: 19, color: colors.primaryDark },
  reminder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  reminderBorder: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  reminderTime: {
    backgroundColor: colors.surfaceMuted,
    padding: 10,
    borderRadius: 10,
  },
  timeText: { fontSize: 12, fontWeight: "600", color: colors.text },
  privacy: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 18,
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    marginBottom: 24,
  },
  logout: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#ECCFD2",
    borderRadius: 14,
    backgroundColor: colors.card,
  },
  logoutText: { fontSize: 14, fontWeight: "600", color: colors.danger },
  footer: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 24,
  },
});
