import { useState } from "react";
import { Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { AuthShell } from "@/components/common/AuthShell";
import { AppButton, FormField } from "@/components/common/AppUI";
import { colors } from "@/constants/colors";

export default function ResetPassword() {
  const router = useRouter();
  const { session, setIsRecoveringPassword } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (saving) return;
    if (password.length < 8) {
      setError("Usa al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setIsRecoveringPassword(false);
      router.replace("/(tabs)");
    } catch {
      setError(
        "No se pudo cambiar la contraseña. Solicita otro enlace si ha caducado.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <AuthShell
      title="Una nueva contraseña"
      subtitle="Elige una contraseña larga que uses solo para esta cuenta."
    >
      {session ? (
        <>
          <FormField
            label="Nueva contraseña"
            placeholder="Al menos 8 caracteres"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!saving}
          />
          <FormField
            label="Confirmar contraseña"
            placeholder="Repite tu nueva contraseña"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            autoComplete="new-password"
            editable={!saving}
            returnKeyType="go"
            onSubmitEditing={() => void save()}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <AppButton
            title="Guardar contraseña"
            onPress={() => void save()}
            loading={saving}
          />
        </>
      ) : (
        <>
          <Text style={styles.message}>
            Abre el enlace recibido por correo para continuar. Si ya caducó,
            puedes solicitar uno nuevo.
          </Text>
          <AppButton
            title="Solicitar otro enlace"
            onPress={() => router.replace("/(auth)/forgot-password")}
          />
        </>
      )}
    </AuthShell>
  );
}
const styles = StyleSheet.create({
  error: {
    fontSize: 13,
    color: colors.danger,
    lineHeight: 19,
    marginBottom: 18,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 24,
  },
});
