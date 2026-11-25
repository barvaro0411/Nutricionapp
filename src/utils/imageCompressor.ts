import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";

export interface CompressedImageResult {
  uri: string;
  width: number;
  height: number;
}

const MAX_WEB_DIMENSION = 1024;
const NATIVE_MAX_WIDTH = 960;
const JPEG_QUALITY = 0.76;
const JPEG_FALLBACK_QUALITY = 0.55;
const MAX_DATA_URL_CHARS = 4_000_000; // ~3 MB en bytes reales (< límite 5 MB del bucket)

/**
 * En Web/PWA, `expo-image-manipulator` ignora `format` y `compress` (emite PNG sin compresión)
 * y ejecuta un redimensionado JS píxel-a-píxel que puede exceder memoria en iOS Safari.
 * Este compresor usa `<canvas>` acelerado por hardware y genera siempre JPEG real liviano.
 */
async function compressImageOnWeb(uri: string): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined" || typeof Image === "undefined") {
      reject(new Error("Canvas no disponible en este entorno."));
      return;
    }

    const img = new Image();
    if (!uri.startsWith("data:") && !uri.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }

    const timer = setTimeout(() => {
      reject(new Error("Tiempo agotado al preparar la imagen."));
    }, 15_000);

    img.onload = () => {
      clearTimeout(timer);
      const naturalWidth = img.naturalWidth || img.width;
      const naturalHeight = img.naturalHeight || img.height;

      if (!naturalWidth || !naturalHeight) {
        reject(new Error("Dimensiones inválidas de la imagen."));
        return;
      }

      const scale = Math.min(
        1,
        MAX_WEB_DIMENSION / Math.max(naturalWidth, naturalHeight)
      );
      const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
      const targetHeight = Math.max(1, Math.round(naturalHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        canvas.width = 0;
        canvas.height = 0;
        reject(new Error("No se pudo crear el contexto de compresión."));
        return;
      }

      // Fondo blanco para evitar fondos negros si la imagen de entrada tenía transparencia
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      try {
        let dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        if (dataUrl.length > MAX_DATA_URL_CHARS) {
          dataUrl = canvas.toDataURL("image/jpeg", JPEG_FALLBACK_QUALITY);
        }

        if (!dataUrl.startsWith("data:image/jpeg;base64,")) {
          reject(new Error("El navegador no pudo codificar la foto como JPEG."));
          return;
        }

        resolve({
          uri: dataUrl,
          width: targetWidth,
          height: targetHeight,
        });
      } catch (err) {
        reject(err);
      } finally {
        // Liberar memoria de canvas de inmediato (importante en iOS Safari PWA)
        canvas.width = 0;
        canvas.height = 0;
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("No se pudo decodificar la imagen capturada."));
    };

    img.src = uri;
  });
}

/**
 * Comprime y redimensiona la imagen de la comida antes de subirla a Storage y enviarla a la IA.
 * - Siempre genera JPEG real (compatible con Safari, Chrome, iOS, Android, Gemini Vision y Groq Vision).
 * - Mantiene resolución nítida para platos y etiquetas nutricionales con peso típico de 80–200 KB.
 */
export async function compressMealImage(uri: string): Promise<CompressedImageResult> {
  if (Platform.OS === "web" && typeof document !== "undefined" && typeof Image !== "undefined") {
    try {
      return await compressImageOnWeb(uri);
    } catch {
      // Fallback seguro si el canvas no pudo decodificar el URI
    }
  }

  try {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: NATIVE_MAX_WIDTH } }],
      {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return {
      uri: manipulatedImage.uri,
      width: manipulatedImage.width,
      height: manipulatedImage.height,
    };
  } catch {
    // Último fallback: devolver URI original para que storageService valide formato real y tamaño
    return {
      uri,
      width: 0,
      height: 0,
    };
  }
}
