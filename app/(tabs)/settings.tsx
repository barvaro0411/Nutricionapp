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
  Sparkles,
  ShieldCheck,
  Trash2,
  Scale,
  Flame,
  Droplets,
  Utensils,
  Activity,
  History,
} from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useDietaryPreferences } from "@/hooks/useDietaryPreferences";
import { useAiConsent } from "@/hooks/useAiConsent";
import { useWeightTracker } from "@/hooks/useWeightTracker";
import { useDailyNutrition } from "@/hooks/useDailyNutrition";
import { DietaryRestriction, DIETARY_RESTRICTION_LABELS } from "@/types/profile";
import {
  getReminderPreferences,
  toggleReminder,
  MealReminderConfig,
  DEFAULT_CHILEAN_REMINDERS,
} from "@/services/notificationService";
import { calculateBMR, calculateTDEE } from "@/utils/nutritionCalculator";
import { QuickWeightModal } from "@/components/profile/QuickWeightModal";
import { PageHeading, AppButton, FormField } from "@/components/common/AppUI";
import { showAlert } from "@/utils/alerts";
import { colors, layout } from "@/constants/colors";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, signOut, updateProfile, deleteAccount, loading } = useAuth();
  const { isPro, scansRemaining, maxFreeScans } = useSubscription();
  const { toggleRestriction, hasRestriction } = useDietaryPreferences();
  const { hasConsent, setConsent, isUpdating: isUpdatingConsent } = useAiConsent();
  const { stats, logWeight, updateTargetWeight } = useWeightTracker();
  const { data: dailyNutrition } = useDailyNutrition();

  const [reminders, setReminders] = useState<MealReminderConfig[]>(
    DEFAULT_CHILEAN_REMINDERS
  );
  const [busyReminder, setBusyReminder] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [showWeightModal, setShowWeightModal] = useState(false);

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
          : "No se pudo guardar el cambio."
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

  const handleSaveQuickWeight = async (newWeightKg: number, newTargetKg?: number) => {
    await logWeight({ weightKg: newWeightKg });
    if (newTargetKg !== undefined) {
      await updateTargetWeight(newTargetKg);
    }
    await updateProfile({
      current_weight_kg: newWeightKg,
      ...(newTargetKg !== undefined ? { target_weight_kg: newTargetKg } : {}),
    });
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
                "Reintenta para continuar."
              );
            }
          },
        },
      ]
    );

  const objectives: Record<string, string> = {
    lose_weight: "Reducir grasa corporal",
    maintain: "Mantener mi peso",
    gain_muscle: "Ganar masa muscular",
  };

  const activityLabels: Record<string, string> = {
    sedentary: "Sedentaria",
    light: "Ligera (1-3 días)",
    moderate: "Moderada (3-5 días)",
    active: "Activa (6-7 días)",
    very_active: "Muy activa",
  };

  // Cálculos de composición corporal
  const currentWeight = profile?.current_weight_kg ?? stats?.latestWeightKg ?? null;
  const heightCm = profile?.height_cm ?? null;
  const targetWeight = profile?.target_weight_kg ?? stats?.targetWeightKg ?? null;

  let bmi: number | null = null;
  let bmiCategory = { label: "Por calcular", color: colors.textSecondary, bg: colors.surfaceMuted };
  if (currentWeight && heightCm && heightCm > 0) {
    const heightM = heightCm / 100;
    bmi = Math.round((currentWeight / (heightM * heightM)) * 10) / 10;
    if (bmi < 18.5) {
      bmiCategory = { label: "Bajo peso", color: "#B45309", bg: "#FEF3C7" };
    } else if (bmi < 25) {
      bmiCategory = { label: "Rango saludable", color: colors.primaryDark, bg: colors.primaryLight };
    } else if (bmi < 30) {
      bmiCategory = { label: "Sobrepeso leve", color: "#B45309", bg: "#FEF3C7" };
    } else {
      bmiCategory = { label: "Obesidad", color: colors.danger, bg: "#FEE2E2" };
    }
  }

  let bmr: number | null = null;
  let tdee: number | null = null;
  if (currentWeight && heightCm) {
    const age = profile?.age ?? 30;
    const gender = profile?.gender ?? "other";
    bmr = calculateBMR(currentWeight, heightCm, age, gender);
    tdee = calculateTDEE(bmr, profile?.activity_level ?? "moderate");
  }

  // Meta de agua recomendada según peso corporal (aprox. 35 ml / kg)
  const waterGoalMl = currentWeight ? Math.round(currentWeight * 35) : 2000;

  // Metas nutricionales activas
  const activeGoal = dailyNutrition?.goal;
  const caloriesGoal = activeGoal?.calories ?? (tdee || 2000);
  const proteinGoal = activeGoal?.protein_g ?? (currentWeight ? Math.round(currentWeight * 1.8) : 130);
  const carbsGoal = activeGoal?.carbs_g ?? 200;
  const fatGoal = activeGoal?.fat_g ?? 60;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <PageHeading
        eyebrow="A tu medida"
        title="Tu espacio"
        description="Administra tu perfil, tus metas y los hábitos que quieres mantener."
      />

      {/* Tarjeta de Identidad / Avatar */}
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
            <Text selectable numberOfLines={1} style={styles.email}>
              {user?.email}
            </Text>
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
        {user?.email_confirmed_at && (
          <View style={styles.verified}>
            <CheckCircle2 size={13} color={colors.mint} />
            <Text style={styles.verifiedText}>Correo verificado</Text>
          </View>
        )}
      </View>

      {/* Tarjeta de Suscripción NutriIA Pro */}
      <View style={styles.proCard}>
        <View style={styles.proCardHeader}>
          <View style={styles.proCardHeaderLeft}>
            <View style={styles.proIconBadge}>
              <Sparkles size={16} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.proCardTitle}>
                {isPro ? "NutriIA Pro Activo 🌟" : "Plan Básico (Gratuito)"}
              </Text>
              <Text style={styles.proCardSub}>
                {isPro
                  ? "Escaneos y coach en vivo sin restricciones."
                  : `${scansRemaining} de ${maxFreeScans} escaneos disponibles hoy`}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPro ? "Ver detalles de mi plan Pro" : "Mejorar a NutriIA Pro"}
            style={[styles.proActionBtn, isPro && styles.proActionBtnActive]}
            onPress={() => router.push("/paywall")}
          >
            <Text style={[styles.proActionBtnText, isPro && styles.proActionBtnTextActive]}>
              {isPro ? "Ver plan" : "Mejorar"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Editor de Nombre en Modal/Inline */}
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

      {/* 1. SECCIÓN: MEDIDAS Y COMPOSICIÓN CORPORAL */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Medidas corporales</Text>
          <Text style={styles.sectionDescription}>
            Mantén tu peso al día para afinar el cálculo de tus requerimientos.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrar peso rápido"
          onPress={() => setShowWeightModal(true)}
          style={({ pressed }) => [styles.quickWeightPill, pressed && styles.pressed]}
        >
          <Scale size={14} color="#FFFFFF" />
          <Text style={styles.quickWeightPillText}>Pesarme</Text>
        </Pressable>
      </View>

      <View style={styles.metricsGrid}>
        {/* Tarjeta Peso Actual */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Peso actual: ${currentWeight ? currentWeight + " kg" : "sin registrar"}. Toca para actualizar.`}
          style={({ pressed }) => [styles.metricCard, styles.metricCardInteractive, pressed && styles.pressed]}
          onPress={() => setShowWeightModal(true)}
        >
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricCardLabel}>PESO ACTUAL</Text>
            <Scale size={15} color={colors.primary} />
          </View>
          <Text style={styles.metricCardValue}>
            {currentWeight ? `${currentWeight} kg` : "Por registrar"}
          </Text>
          <View style={styles.metricCardFooter}>
            {targetWeight ? (
              <Text style={styles.metricCardHint}>
                Meta: {targetWeight} kg {targetWeight < (currentWeight || 0) ? "📉" : "📈"}
              </Text>
            ) : (
              <Text style={styles.metricCardHintTap}>Toca para actualizar ✍️</Text>
            )}
          </View>
        </Pressable>

        {/* Tarjeta Estatura */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Estatura: ${heightCm ? heightCm + " cm" : "sin registrar"}. Toca para ajustar.`}
          style={({ pressed }) => [styles.metricCard, pressed && styles.pressed]}
          onPress={() =>
            router.push({
              pathname: "/(onboarding)/profile-setup",
              params: { fromSettings: "true" },
            })
          }
        >
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricCardLabel}>ESTATURA</Text>
            <Activity size={15} color={colors.textSecondary} />
          </View>
          <Text style={styles.metricCardValue}>
            {heightCm ? `${heightCm} cm` : "Por definir"}
          </Text>
          <View style={styles.metricCardFooter}>
            <Text style={styles.metricCardHint}>
              {profile?.activity_level ? activityLabels[profile.activity_level] : "Nivel de actividad"}
            </Text>
          </View>
        </Pressable>

        {/* Tarjeta IMC con Badge Clínico */}
        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricCardLabel}>ÍNDICE MASA (IMC)</Text>
          </View>
          <Text style={styles.metricCardValue}>
            {bmi ? `${bmi}` : "—"}
          </Text>
          <View style={styles.metricCardFooter}>
            <View style={[styles.bmiBadge, { backgroundColor: bmiCategory.bg }]}>
              <Text style={[styles.bmiBadgeText, { color: bmiCategory.color }]}>
                {bmiCategory.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Tarjeta Gasto Diario TDEE / BMR */}
        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricCardLabel}>GASTO TOTAL (TDEE)</Text>
            <Flame size={15} color="#EA580C" />
          </View>
          <Text style={styles.metricCardValue}>
            {tdee ? `${tdee} kcal` : "—"}
          </Text>
          <View style={styles.metricCardFooter}>
            <Text style={styles.metricCardHint}>
              {bmr ? `Basal: ${bmr} kcal/día` : "Estimado diario"}
            </Text>
          </View>
        </View>
      </View>

      {/* Enlace directo a Historial de Peso */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver historial y curva de peso en Historial"
        style={({ pressed }) => [styles.historyLinkRow, pressed && styles.pressed]}
        onPress={() => router.push("/(tabs)/history")}
      >
        <History size={16} color={colors.primary} />
        <Text style={styles.historyLinkText}>
          Ver evolución completa y gráfico de peso
        </Text>
        <ChevronRight size={16} color={colors.primary} />
      </Pressable>

      {/* 2. SECCIÓN: METAS NUTRICIONALES DIARIAS */}
      <Text style={styles.sectionTitle}>Metas nutricionales activas</Text>
      <Text style={styles.sectionDescription}>
        Objetivo actual:{" "}
        <Text style={{ fontWeight: "700", color: colors.text }}>
          {objectives[profile?.objective || ""] || "Mantener hábitos saludables"}
        </Text>
      </Text>

      <View style={styles.goalsHeroCard}>
        {/* Cabecera de la tarjeta con badge */}
        <View style={styles.goalsHeroHeader}>
          <View style={styles.goalsTargetPill}>
            <Target size={14} color={colors.primaryDark} />
            <Text style={styles.goalsTargetPillText}>
              {profile?.objective ? objectives[profile.objective] : "Plan Personalizado"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recalcular metas nutricionales"
            onPress={() =>
              router.push({
                pathname: "/(onboarding)/profile-setup",
                params: { fromSettings: "true" },
              })
            }
            style={({ pressed }) => [styles.recalculateBtn, pressed && styles.pressed]}
          >
            <Text style={styles.recalculateBtnText}>Ajustar</Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        </View>

        {/* Grilla de Macros */}
        <View style={styles.macroPillsGrid}>
          {/* Calorías */}
          <View style={[styles.macroPill, { backgroundColor: "#FFF1F2" }]}>
            <View style={styles.macroPillHeader}>
              <Flame size={14} color="#E11D48" />
              <Text style={[styles.macroPillLabel, { color: "#9F1239" }]}>Calorías</Text>
            </View>
            <Text style={[styles.macroPillValue, { color: "#881337" }]}>
              {caloriesGoal}
            </Text>
            <Text style={styles.macroPillUnit}>kcal / día</Text>
          </View>

          {/* Proteínas */}
          <View style={[styles.macroPill, { backgroundColor: "#EFF6FF" }]}>
            <View style={styles.macroPillHeader}>
              <Utensils size={14} color="#2563EB" />
              <Text style={[styles.macroPillLabel, { color: "#1E40AF" }]}>Proteína</Text>
            </View>
            <Text style={[styles.macroPillValue, { color: "#1E3A8A" }]}>
              {proteinGoal}g
            </Text>
            <Text style={styles.macroPillUnit}>diarios</Text>
          </View>

          {/* Carbohidratos */}
          <View style={[styles.macroPill, { backgroundColor: "#FEF3C7" }]}>
            <View style={styles.macroPillHeader}>
              <Sparkles size={14} color="#D97706" />
              <Text style={[styles.macroPillLabel, { color: "#92400E" }]}>Carbos</Text>
            </View>
            <Text style={[styles.macroPillValue, { color: "#78350F" }]}>
              {carbsGoal}g
            </Text>
            <Text style={styles.macroPillUnit}>diarios</Text>
          </View>

          {/* Grasas */}
          <View style={[styles.macroPill, { backgroundColor: "#ECFDF5" }]}>
            <View style={styles.macroPillHeader}>
              <Droplets size={14} color="#059669" />
              <Text style={[styles.macroPillLabel, { color: "#065F46" }]}>Grasas</Text>
            </View>
            <Text style={[styles.macroPillValue, { color: "#064E3B" }]}>
              {fatGoal}g
            </Text>
            <Text style={styles.macroPillUnit}>diarias</Text>
          </View>
        </View>

        {/* Fila de Hidratación recomendada */}
        <View style={styles.waterRow}>
          <View style={styles.waterIconCircle}>
            <Droplets size={16} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.waterTitle}>Meta diaria de agua</Text>
            <Text style={styles.waterSub}>
              {(waterGoalMl / 1000).toFixed(1)} L recomendados (~{waterGoalMl} ml según tu peso)
            </Text>
          </View>
        </View>
      </View>

      {/* 3. SECCIÓN: PREFERENCIAS Y ALÉRGENOS */}
      <Text style={styles.sectionTitle}>Preferencias y Alérgenos</Text>
      <Text style={styles.sectionDescription}>
        Te alertaremos en el diario de comidas y filtraremos automáticamente recetas compatibles (Ley 20.606).
      </Text>
      <View style={styles.dietaryGrid}>
        {(Object.keys(DIETARY_RESTRICTION_LABELS) as DietaryRestriction[]).map((key) => {
          const item = DIETARY_RESTRICTION_LABELS[key];
          const active = hasRestriction(key);
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}: ${active ? "activo" : "inactivo"}`}
              accessibilityState={{ selected: active }}
              style={[styles.dietaryCard, active && styles.dietaryCardActive]}
              onPress={() => void toggleRestriction(key)}
            >
              <View style={styles.dietaryTop}>
                <Text style={styles.dietaryIcon}>{item.icon}</Text>
                <View style={[styles.dietaryRadio, active && styles.dietaryRadioActive]}>
                  {active && <CheckCircle2 size={16} color={colors.primary} />}
                </View>
              </View>
              <Text style={[styles.dietaryLabel, active && styles.dietaryLabelActive]}>
                {item.label}
              </Text>
              <Text style={styles.dietaryDesc}>{item.description}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* 4. SECCIÓN: RECORDATORIOS */}
      <Text style={styles.sectionTitle}>Un recordatorio a tiempo</Text>
      <Text style={styles.sectionDescription}>
        Horarios de comidas e hidratación para tu rutina en Chile.
      </Text>

      <View style={styles.reminders}>
        {Platform.OS === "web" && (
          <View style={styles.webReminderNotice}>
            <Text style={styles.noticeText}>
              Disponibles en la app instalada en tu celular. En el navegador puedes
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

      {/* 5. SECCIÓN: PRIVACIDAD, DATOS Y EXPORTACIÓN */}
      <Text style={styles.sectionTitle}>Privacidad, Datos e IA</Text>
      <View style={styles.actions}>
        <View style={styles.action}>
          <View style={styles.actionIcon}>
            <Sparkles size={20} color={colors.primary} />
          </View>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>Consentimiento de Análisis con IA</Text>
            <Text style={styles.actionDescription}>
              {hasConsent
                ? "Autorizado para foto, voz y Coach IA (sin datos personales)."
                : "Desactivado. Solo registro manual y catálogos locales."}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Consentimiento de análisis con IA"
            disabled={isUpdatingConsent || !user}
            value={hasConsent}
            onValueChange={(val) => {
              void setConsent(val).catch((err) => {
                showAlert("Error", err?.message || "No se pudo guardar tu preferencia.");
              });
            }}
            trackColor={{ false: colors.cardBorder, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

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
              Genera un informe en PDF o CSV para tu nutricionista o médico.
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Política de Privacidad y Términos de Uso"
          onPress={() => router.push("/legal" as any)}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <View style={styles.actionIcon}>
            <ShieldCheck size={20} color={colors.primary} />
          </View>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>Privacidad y Términos de Uso</Text>
            <Text style={styles.actionDescription}>
              Ley 19.628, retención de fotos (14 días), uso de IA y tus derechos.
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.privacy}>
        <LockKeyhole size={20} color={colors.primary} />
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>Tu cuenta, tu progreso</Text>
          <Text style={styles.actionDescription}>
            Tus registros se guardan cifrados en tu cuenta. Cerrar sesión no los elimina.
          </Text>
        </View>
      </View>

      {/* 6. ZONA DE CUENTA */}
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Eliminar mi cuenta permanentemente"
        disabled={loading}
        onPress={() =>
          showAlert(
            "Eliminar mi cuenta permanentemente",
            "Esta acción borrará de forma irreversible tu perfil, comidas, hidratación, peso, fotos y conversaciones. ¿Estás seguro?",
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Sí, eliminar mi cuenta",
                style: "destructive",
                onPress: async () => {
                  const res = await deleteAccount();
                  if (res.success) {
                    showAlert(
                      "Cuenta eliminada",
                      "Tu cuenta y todos tus datos han sido eliminados."
                    );
                    router.replace("/(auth)/login");
                  } else {
                    showAlert(
                      "Error al eliminar cuenta",
                      res.error || "Reintenta más tarde."
                    );
                  }
                },
              },
            ]
          )
        }
        style={({ pressed }) => [styles.deleteAccountBtn, pressed && styles.pressed]}
      >
        <Trash2 size={16} color={colors.textSecondary} />
        <Text style={styles.deleteAccountText}>Eliminar mi cuenta y datos</Text>
      </Pressable>

      <Text style={styles.footer}>Nutrición IA · Un día a la vez</Text>

      {/* Modal Rápido de Peso */}
      <QuickWeightModal
        visible={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        currentWeightKg={currentWeight}
        targetWeightKg={targetWeight}
        onSave={handleSaveQuickWeight}
        onRecalculateGoals={() => {
          setShowWeightModal(false);
          router.push({
            pathname: "/(onboarding)/profile-setup",
            params: { fromSettings: "true" },
          });
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { ...layout.narrowPage, paddingBottom: 48 },
  profileCard: {
    backgroundColor: colors.forest,
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
  },
  proCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    marginBottom: 26,
  },
  proCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  proCardHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  proIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  proCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  proCardSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  proActionBtn: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  proActionBtnActive: {
    backgroundColor: colors.surfaceMuted,
  },
  proActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  proActionBtnTextActive: {
    color: colors.textSecondary,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 24, fontWeight: "800", color: colors.forest },
  identity: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  email: { fontSize: 12, lineHeight: 18, color: "#CEE1D6", marginTop: 2 },
  editButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2C5B45",
  },
  verified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  verifiedText: { fontSize: 11, color: colors.mint, fontWeight: "600" },
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  quickWeightPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  quickWeightPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    borderRadius: 18,
    minWidth: 0,
    justifyContent: "space-between",
  },
  metricCardInteractive: {
    borderColor: "#D1FAE5",
    backgroundColor: "#FCFDFD",
  },
  metricCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  metricCardLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  metricCardValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 24,
    marginVertical: 2,
  },
  metricCardFooter: {
    marginTop: 4,
    minHeight: 22,
    justifyContent: "center",
  },
  metricCardHint: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  metricCardHintTap: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  bmiBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bmiBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  historyLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 24,
  },
  historyLinkText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  goalsHeroCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    padding: 16,
    marginBottom: 26,
  },
  goalsHeroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  goalsTargetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  goalsTargetPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  recalculateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  recalculateBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  macroPillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  macroPill: {
    flexGrow: 1,
    flexBasis: "47%",
    padding: 12,
    borderRadius: 14,
  },
  macroPillHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  macroPillLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  macroPillValue: {
    fontSize: 17,
    fontWeight: "800",
  },
  macroPillUnit: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  waterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  waterIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  waterTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0369A1",
  },
  waterSub: {
    fontSize: 11,
    color: "#075985",
    marginTop: 1,
  },
  actions: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 24,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    minHeight: 74,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 16,
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
  webReminderNotice: { padding: 14, backgroundColor: colors.primaryLight },
  noticeText: { fontSize: 11, lineHeight: 17, color: colors.primaryDark },
  reminder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  reminderBorder: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  reminderTime: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  timeText: { fontSize: 12, fontWeight: "700", color: colors.text },
  privacy: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    marginBottom: 20,
  },
  logout: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#ECCFD2",
    borderRadius: 14,
    backgroundColor: colors.card,
  },
  logoutText: { fontSize: 14, fontWeight: "600", color: colors.danger },
  dietaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  dietaryCard: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 12,
    minWidth: 0,
  },
  dietaryCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#F0FDF4",
  },
  dietaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dietaryIcon: {
    fontSize: 20,
  },
  dietaryRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  dietaryRadioActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  dietaryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  dietaryLabelActive: {
    color: colors.primaryDark,
  },
  dietaryDesc: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  deleteAccountBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    marginTop: 10,
    borderRadius: 14,
  },
  deleteAccountText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
  footer: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 20,
  },
});
