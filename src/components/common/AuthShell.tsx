import React from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Leaf, Camera, ChartNoAxesCombined, Target } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const features = [
  {
    Icon: Camera,
    name: "Registra con una foto",
    description: "Alimentos y porciones con ayuda de IA",
  },
  {
    Icon: ChartNoAxesCombined,
    name: "Entiende tu progreso",
    description: "Calorías, nutrientes e hidratación",
  },
  {
    Icon: Target,
    name: "Encuentra tu equilibrio",
    description: "Metas que puedes ajustar a tu ritmo",
  },
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const wide = useWindowDimensions().width >= 900;
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          wide && styles.wideContent,
          {
            paddingTop: Math.max(insets.top, wide ? 32 : 24),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {wide && (
          <View style={styles.story}>
            <View style={styles.brand}>
              <View style={styles.brandIcon}>
                <Leaf color={colors.forest} size={23} />
              </View>
              <Text style={styles.storyBrand}>Nutrición IA</Text>
            </View>
            <View style={styles.storyBody}>
              <View style={styles.storyTag}>
                <Text style={styles.storyTagText}>
                  PEQUEÑOS HÁBITOS. GRANDES CAMBIOS.
                </Text>
              </View>
              <Text style={styles.storyTitle}>
                Tu bienestar,{"\n"}un día a la vez.
              </Text>
              <Text style={styles.storyDescription}>
                Conoce lo que comes, entiende tu progreso y construye hábitos
                que se adapten a ti.
              </Text>
              {features.map(({ Icon, name, description }) => (
                <View style={styles.feature} key={name}>
                  <View style={styles.featureIcon}>
                    <Icon size={20} color={colors.mint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureName}>{name}</Text>
                    <Text style={styles.featureDescription}>{description}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.storyFooter}>
              Hecho para tu día a día · Chile
            </Text>
          </View>
        )}
        <View style={[styles.formColumn, wide && styles.wideForm]}>
          {!wide && (
            <View style={styles.mobileBrand}>
              <View style={styles.mobileIcon}>
                <Leaf color={colors.primary} size={23} />
              </View>
              <Text style={styles.mobileBrandText}>Nutrición IA</Text>
            </View>
          )}
          <View style={styles.form}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
          </View>
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
  },
  wideContent: {
    flexDirection: "row",
    alignItems: "stretch",
    padding: 32,
    minHeight: 700,
  },
  story: {
    flex: 1,
    backgroundColor: colors.forest,
    borderRadius: 30,
    padding: 40,
    justifyContent: "space-between",
    minHeight: 650,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  storyBrand: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  storyBody: { marginVertical: 36 },
  storyTag: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#426456",
    borderRadius: 20,
  },
  storyTagText: {
    fontSize: 10,
    color: colors.mint,
    fontWeight: "600",
    letterSpacing: 1,
  },
  storyTitle: {
    fontSize: 48,
    lineHeight: 55,
    letterSpacing: -2,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 24,
  },
  storyDescription: {
    fontSize: 16,
    lineHeight: 25,
    color: "#CEE1D6",
    marginTop: 18,
    marginBottom: 28,
    maxWidth: 380,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#245342",
    alignItems: "center",
    justifyContent: "center",
  },
  featureName: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  featureDescription: { fontSize: 12, color: "#CEE1D6", marginTop: 4 },
  storyFooter: { fontSize: 12, color: "#BDD6C8" },
  formColumn: { width: "100%", maxWidth: 440, alignSelf: "center" },
  wideForm: { flex: 1, marginLeft: 56 },
  form: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 24,
    padding: 24,
  },
  mobileBrand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 32,
  },
  mobileIcon: {
    width: 44,
    height: 44,
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileBrandText: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.6,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 28,
  },
  footer: { marginTop: 24, alignItems: "center", gap: 8 },
});
