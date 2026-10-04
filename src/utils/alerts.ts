import { Alert, Platform } from "react-native";

type AlertButtons = NonNullable<Parameters<typeof Alert.alert>[2]>;

export function showAlert(title: string, message?: string, buttons?: AlertButtons) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }
  if (typeof window === "undefined") return;
  const text = [title, message].filter(Boolean).join("\n\n");
  const action = buttons?.find((button) => button.style !== "cancel");
  if (buttons?.some((button) => button.style === "cancel")) {
    if (window.confirm(text)) action?.onPress?.();
  } else {
    window.alert(text);
    action?.onPress?.();
  }
}
