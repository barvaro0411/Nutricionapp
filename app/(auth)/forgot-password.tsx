import React, { useState } from "react";
import { Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { AuthShell } from "@/components/common/AuthShell";
import { AppButton, FormField } from "@/components/common/AppUI";
import { colors } from "@/constants/colors";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    if (loading) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    setError(null);
    const result = await resetPassword(email.trim());
    if (result.success) setSuccess(true);
    else setError(result.error || "No se pudo enviar el enlace.");
  };
  return (
    <AuthShell
      title={success ? "Revisa tu bandeja" : "Recupera tu acceso"}
      subtitle={
        success
          ? "Si existe una cuenta con este correo, recibirás un enlace para elegir una nueva contraseña."
          : "Escribe el correo de tu cuenta y te ayudaremos a volver."
      }
      footer={
        <Pressable
          accessibilityRole="button"
          style={styles.back}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.link}>Volver a iniciar sesión</Text>
        </Pressable>
      }
    >
      {success ? (
        <>
          <Text style={styles.email}>{email.trim()}</Text>
          <Text style={styles.message}>
            Revisa también la carpeta de spam. El enlace de recuperación tiene
            una duración limitada.
          </Text>
          <AppButton
            title="Volver a iniciar sesión"
            onPress={() => router.replace("/(auth)/login")}
          />
        </>
      ) : (
        <>
          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <FormField
            label="Correo electrónico"
            placeholder="ejemplo@correo.cl"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!loading}
            returnKeyType="send"
            onSubmitEditing={() => void send()}
          />
          <AppButton
            title="Enviar enlace de recuperación"
            onPress={() => void send()}
            loading={loading}
          />
        </>
      )}
    </AuthShell>
  );
}
const styles = StyleSheet.create({
  back: { minHeight: 44, justifyContent: "center" },
  link: { fontSize: 13, fontWeight: "700", color: colors.primary },
  email: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 14,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
    backgroundColor: colors.dangerLight,
    padding: 14,
    borderRadius: 12,
    marginBottom: 18,
  },
});
