import React, { useState } from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { Link, useRouter } from "expo-router";
import { MailCheck, ArrowRight } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/constants/colors";
import { AuthShell } from "@/components/common/AuthShell";
import { AppButton, FormField } from "@/components/common/AppUI";

export default function RegisterScreen() {
  const router = useRouter();
  const { signUpWithEmail, resendConfirmationEmail, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [resent, setResent] = useState(false);
  const register = async () => {
    if (loading) return;
    if (!fullName.trim()) {
      setError("Ingresa tu nombre para personalizar tu cuenta.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    if (password.length < 8) {
      setError("Usa una contraseña de al menos 8 caracteres.");
      return;
    }
    setError(null);
    const result = await signUpWithEmail(
      email.trim(),
      password,
      fullName.trim(),
    );
    if (!result.success) {
      setError(result.error || "No se pudo crear la cuenta.");
      return;
    }
    if (result.needsEmailConfirmation) {
      setConfirming(true);
      setPassword("");
    }
  };
  const resend = async () => {
    setError(null);
    const result = await resendConfirmationEmail(email.trim());
    if (result.success) setResent(true);
    else setError(result.error || "No se pudo reenviar el correo.");
  };
  return (
    <AuthShell
      title={confirming ? "Revisa tu correo" : "Empieza con un pequeño paso"}
      subtitle={
        confirming
          ? "Confirma tu dirección para activar la cuenta."
          : "Crea tu cuenta y encuentra una rutina que funcione para ti."
      }
      footer={
        <>
          <Text style={styles.muted}>¿Ya tienes una cuenta?</Text>
          <Link href="/(auth)/login" asChild>
            <Pressable accessibilityRole="link" style={styles.linkButton}>
              <Text style={styles.link}>Iniciar sesión</Text>
              <ArrowRight size={16} color={colors.primary} />
            </Pressable>
          </Link>
        </>
      }
    >
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {confirming ? (
        <View style={styles.confirmation}>
          <View style={styles.mailIcon}>
            <MailCheck size={30} color={colors.primary} />
          </View>
          <Text style={styles.email}>{email.trim()}</Text>
          <Text style={styles.confirmationText}>
            Abre el enlace del correo de confirmación. Si no lo ves, revisa
            también la carpeta de spam.
          </Text>
          <AppButton
            title="Ir a iniciar sesión"
            onPress={() => router.replace("/(auth)/login")}
          />
          <AppButton
            title={resent ? "Correo reenviado" : "Reenviar confirmación"}
            onPress={() => void resend()}
            secondary
            loading={loading}
            disabled={resent}
          />
          {resent && (
            <Text accessibilityRole="alert" style={styles.muted}>
              El correo está en camino. Puede tardar unos minutos.
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            style={styles.linkButton}
            onPress={() => {
              setConfirming(false);
              setResent(false);
              setError(null);
            }}
          >
            <Text style={styles.link}>Corregir mi correo</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FormField
            label="Nombre completo"
            placeholder="Ej: Sofía Contreras"
            value={fullName}
            onChangeText={setFullName}
            maxLength={80}
            autoComplete="name"
            textContentType="name"
            editable={!loading}
          />
          <FormField
            label="Correo electrónico"
            placeholder="ejemplo@correo.cl"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!loading}
          />
          <FormField
            label="Contraseña"
            placeholder="Al menos 8 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            hint="Elige una contraseña larga y diferente a la de otras cuentas."
            editable={!loading}
            returnKeyType="go"
            onSubmitEditing={() => void register()}
          />
          <AppButton
            title="Crear mi cuenta"
            onPress={() => void register()}
            loading={loading}
            icon={<ArrowRight size={18} color="#FFFFFF" />}
          />
          <Text style={styles.bottomNote}>
            Confirmarás tu correo antes de completar tu perfil y tus metas.
          </Text>
        </>
      )}
    </AuthShell>
  );
}
const styles = StyleSheet.create({
  muted: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  linkButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  link: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  error: {
    color: colors.danger,
    backgroundColor: colors.dangerLight,
    fontSize: 13,
    lineHeight: 19,
    padding: 14,
    borderRadius: 12,
    marginBottom: 18,
  },
  confirmation: { gap: 16 },
  mailIcon: {
    alignSelf: "center",
    padding: 18,
    backgroundColor: colors.primaryLight,
    borderRadius: 22,
  },
  email: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  confirmationText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
  },
  bottomNote: {
    marginTop: 16,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
