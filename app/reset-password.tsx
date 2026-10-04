import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { colors } from "@/constants/colors";

export default function ResetPassword() {
  const router = useRouter();
  const { session, setIsRecoveringPassword } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (password.length < 8) { setError("Usa al menos 8 caracteres."); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setSaving(true); setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setIsRecoveringPassword(false);
      router.replace("/(tabs)");
    } catch { setError("No se pudo cambiar la contraseña. Solicita un nuevo enlace si ha caducado."); }
    finally { setSaving(false); }
  };
  return <View style={styles.container}><View style={styles.card}>
    <Text style={styles.title}>Nueva contraseña</Text>
    {session ? <>
      <TextInput accessibilityLabel="Nueva contraseña" placeholder="Al menos 8 caracteres" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      <TextInput accessibilityLabel="Confirmar contraseña" placeholder="Repite la contraseña" secureTextEntry value={confirm} onChangeText={setConfirm} style={styles.input} />
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={save} style={styles.button}><Text style={styles.buttonText}>{saving ? "Guardando…" : "Guardar contraseña"}</Text></TouchableOpacity>
    </> : <><Text>Abre el enlace recibido por correo para cambiar tu contraseña.</Text>
      <TouchableOpacity onPress={() => router.replace("/(auth)/forgot-password")}><Text style={styles.link}>Solicitar enlace</Text></TouchableOpacity></>}
  </View></View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: colors.background },
  card: { width: "100%", maxWidth: 480, gap: 16 },
  title: { fontSize: 26, fontWeight: "700", color: colors.text },
  input: { padding: 14, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, backgroundColor: colors.card },
  button: { backgroundColor: colors.primary, padding: 16, borderRadius: 12 },
  buttonText: { color: "white", textAlign: "center", fontWeight: "700" },
  link: { color: colors.primary, paddingVertical: 16 },
  error: { color: colors.danger },
});
