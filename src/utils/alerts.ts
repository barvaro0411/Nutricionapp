import { Alert, Platform } from "react-native";
import { useToastStore, ToastType } from "@/stores/useToastStore";

type AlertButtons = NonNullable<Parameters<typeof Alert.alert>[2]>;

export function showToast(params: {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
}) {
  useToastStore.getState().showToast(params);
}

export function showAlert(title: string, message?: string, buttons?: AlertButtons) {
  const hasMultipleActions = Boolean(buttons && buttons.length > 1);
  const hasCancel = Boolean(buttons?.some((button) => button.style === "cancel"));

  // Dialogs requiring confirmation or multiple buttons retain native modal flow
  if (hasMultipleActions || hasCancel) {
    if (Platform.OS !== "web") {
      Alert.alert(title, message, buttons);
      return;
    }
    if (typeof window === "undefined") return;
    const text = [title, message].filter(Boolean).join("\n\n");
    const action = buttons?.find((button) => button.style !== "cancel");
    if (hasCancel) {
      if (window.confirm(text)) action?.onPress?.();
    } else {
      window.alert(text);
      action?.onPress?.();
    }
    return;
  }

  // Single-button or purely informational notifications become modern Toasts!
  const lower = `${title} ${message || ""}`.toLowerCase();
  let type: ToastType = "info";
  if (
    lower.includes("error") ||
    lower.includes("inválid") ||
    lower.includes("falló") ||
    lower.includes("requerid") ||
    lower.includes("no se pudo")
  ) {
    type = "error";
  } else if (
    lower.includes("éxito") ||
    lower.includes("guardad") ||
    lower.includes("completad") ||
    lower.includes("¡") ||
    lower.includes("correct")
  ) {
    type = "success";
  } else if (
    lower.includes("aviso") ||
    lower.includes("atención") ||
    lower.includes("cuidado") ||
    lower.includes("alerta")
  ) {
    type = "warning";
  }

  useToastStore.getState().showToast({
    type,
    title,
    message,
    duration: 3200,
  });

  const singleAction = buttons?.[0];
  if (singleAction?.onPress) {
    setTimeout(() => singleAction.onPress?.(), 50);
  }
}
