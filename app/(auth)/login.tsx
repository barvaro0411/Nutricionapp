import React, { useState } from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/constants/colors";
import { AuthShell } from "@/components/common/AuthShell";
import { AppButton, FormField } from "@/components/common/AppUI";

export default function LoginScreen() {
  const { signInWithEmail, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const handleLogin = async () => {
    if (loading) return;
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contraseña para continuar.");
      return;
    }
    setError(null);
    const result = await signInWithEmail(email.trim(), password);
    if (!result.success)
      setError(result.error || "No se pudo iniciar sesión. Reintenta.");
  };
  return (
    <AuthShell
      title="Qué bueno verte"
      subtitle="Inicia sesión para continuar con tu progreso."
      footer={
        <>
          <Text style={styles.footerText}>¿Es tu primera vez por aquí?</Text>
          <Link href="/(auth)/register" asChild>
            <Pressable accessibilityRole="link" style={styles.linkButton}>
              <Text style={styles.link}>Crear cuenta gratis</Text>
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
        placeholder="Tu contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        editable={!loading}
        returnKeyType="go"
        onSubmitEditing={() => void handleLogin()}
      />
      <View style={styles.forgot}>
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable accessibilityRole="link" style={styles.linkButton}>
            <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
        </Link>
      </View>
      <AppButton
        title="Entrar"
        onPress={() => void handleLogin()}
        loading={loading}
        icon={<ArrowRight size={18} color="#FFFFFF" />}
      />
    </AuthShell>
  );
}
const styles = StyleSheet.create({
  error: {
    backgroundColor: colors.dangerLight,
    color: colors.danger,
    padding: 14,
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
  },
  forgot: { alignItems: "flex-end", marginTop: -8, marginBottom: 16 },
  linkButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  link: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  footerText: { color: colors.textSecondary, fontSize: 13 },
});
