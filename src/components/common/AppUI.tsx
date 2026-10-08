import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInputProps,
} from "react-native";
import { Eye, EyeOff, AlertCircle } from "lucide-react-native";
import { colors } from "@/constants/colors";

export function PageHeading({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.headingRow}>
      <View style={styles.headingText}>
        {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text accessibilityRole="header" style={styles.heading}>
          {title}
        </Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      {action}
    </View>
  );
}

export function AppButton({
  title,
  onPress,
  loading,
  disabled,
  secondary,
  icon,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: !!disabled || !!loading,
        busy: !!loading,
      }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondaryButton,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.primary : "#FFFFFF"} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonText, secondary && styles.secondaryText]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function FormField({
  label,
  hint,
  secureTextEntry,
  style,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputFocused]}>
        <TextInput
          autoCapitalize={secureTextEntry ? "none" : undefined}
          autoCorrect={secureTextEntry ? false : undefined}
          {...props}
          accessibilityLabel={props.accessibilityLabel || label}
          secureTextEntry={secureTextEntry && !visible}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              visible ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            onPress={() => setVisible((value) => !value)}
            style={styles.eyeButton}
          >
            {visible ? (
              <EyeOff color={colors.textSecondary} size={20} />
            ) : (
              <Eye color={colors.textSecondary} size={20} />
            )}
          </Pressable>
        )}
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

export function StateCard({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View
      style={styles.stateCard}
      accessibilityRole={onRetry ? "alert" : undefined}
    >
      <View style={styles.stateIcon}>
        <AlertCircle size={22} color={colors.primary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {onRetry && <AppButton title="Reintentar" onPress={onRetry} secondary />}
    </View>
  );
}

const styles = StyleSheet.create({
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  headingText: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heading: {
    fontSize: 29,
    lineHeight: 35,
    letterSpacing: -1,
    fontWeight: "800",
    color: colors.text,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginTop: 8,
  },
  button: {
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  secondaryText: { color: colors.primaryDark },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
  field: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  inputWrap: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  inputFocused: { borderColor: colors.primary, backgroundColor: "#FFFFFF" },
  input: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  eyeButton: {
    width: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 6,
  },
  stateCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  stateIcon: {
    width: 44,
    height: 44,
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  stateMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 440,
  },
});
