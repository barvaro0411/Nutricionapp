import { Platform } from "react-native";

export interface AudioRecordingHandle {
  stopAndGetUri(): Promise<string | null>;
  cancel(): Promise<void>;
}

/**
 * Adaptador desacoplado de grabación de audio.
 * Aísla `expo-av` mediante importación dinámica para:
 * 1. Facilitar el reemplazo futuro por `expo-audio` en actualizaciones de Expo SDK.
 * 2. Permitir code-splitting en Web/PWA evitando cargar `expo-av` en el bundle inicial.
 */
export async function resetAudioRecordingMode(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { Audio } = await import("expo-av");
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  } catch {
    // Ignorar errores de limpieza de modo de audio
  }
}

export async function startAudioRecording(): Promise<AudioRecordingHandle> {
  const { Audio } = await import("expo-av");
  const permission = await Audio.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Permite el acceso al micrófono para grabar.");
  }

  if (Platform.OS !== "web") {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
  }

  const result = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  const recording = result.recording;

  return {
    async stopAndGetUri(): Promise<string | null> {
      await recording.stopAndUnloadAsync();
      if (Platform.OS !== "web") {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => undefined);
      }
      return recording.getURI();
    },
    async cancel(): Promise<void> {
      await recording.stopAndUnloadAsync().catch(() => undefined);
      if (Platform.OS !== "web") {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => undefined);
      }
    },
  };
}
