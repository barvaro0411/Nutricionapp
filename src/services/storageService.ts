import { supabase } from "@/services/supabase";

export type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp";
export type SupportedImageExtension = "jpg" | "png" | "webp";

export interface DetectedImageFormat {
  contentType: SupportedImageMime;
  extension: SupportedImageExtension;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB (límite del bucket meal_photos)

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1"]);

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  if (bytes.length < start + length) return "";
  let out = "";
  for (let i = start; i < start + length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

export function isHeicBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (readAscii(bytes, 4, 4) !== "ftyp") return false;
  return HEIC_BRANDS.has(readAscii(bytes, 8, 4).toLowerCase());
}

/**
 * Detecta el formato real de la imagen desde sus magic bytes (y usa hintContentType solo como respaldo).
 * Evita enviar bytes PNG/WebP etiquetados como `image/jpeg` a los proveedores de IA de visión.
 */
export function detectImageFormat(
  bytes: Uint8Array,
  hintContentType?: string | null
): DetectedImageFormat | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { contentType: "image/png", extension: "png" };
  }

  if (
    bytes.length >= 12 &&
    readAscii(bytes, 0, 4) === "RIFF" &&
    readAscii(bytes, 8, 4) === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  if (isHeicBytes(bytes)) {
    return null;
  }

  const normalizedHint = (hintContentType || "").split(";")[0].trim().toLowerCase();
  if (normalizedHint === "image/jpeg" || normalizedHint === "image/jpg") {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (normalizedHint === "image/png") {
    return { contentType: "image/png", extension: "png" };
  }
  if (normalizedHint === "image/webp") {
    return { contentType: "image/webp", extension: "webp" };
  }

  return null;
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/\s+/g, "");
  if (typeof atob === "function") {
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const BufferCtor = (globalThis as { Buffer?: typeof Buffer }).Buffer;
  if (BufferCtor) {
    return new Uint8Array(BufferCtor.from(clean, "base64"));
  }

  throw new Error("No se pudo decodificar la imagen en este dispositivo.");
}

async function readImageBytes(localUri: string): Promise<{
  bytes: Uint8Array;
  hintContentType?: string | null;
}> {
  if (localUri.startsWith("data:")) {
    const commaIndex = localUri.indexOf(",");
    if (commaIndex === -1) {
      throw new Error("La imagen capturada no tiene un formato válido.");
    }
    const header = localUri.slice(5, commaIndex);
    const body = localUri.slice(commaIndex + 1);
    const isBase64 = header.toLowerCase().includes(";base64");
    const mime = header.split(";")[0] || null;
    const bytes = isBase64
      ? decodeBase64ToBytes(body)
      : new TextEncoder().encode(decodeURIComponent(body));
    return { bytes, hintContentType: mime };
  }

  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error("No se pudo leer la foto capturada.");
  }
  const arrayBuffer = await response.arrayBuffer();
  return {
    bytes: new Uint8Array(arrayBuffer),
    hintContentType: response.headers?.get?.("content-type"),
  };
}

export async function uploadMealPhoto(
  userId: string,
  localUri: string
): Promise<{ path: string; error?: string }> {
  try {
    const { bytes, hintContentType } = await readImageBytes(localUri);

    if (bytes.byteLength === 0) {
      return {
        path: "",
        error: "La imagen está vacía. Intenta tomar la foto nuevamente.",
      };
    }

    if (bytes.byteLength > MAX_UPLOAD_BYTES) {
      return {
        path: "",
        error: "La foto supera los 5 MB. Intenta tomar otra foto o elegir una más liviana.",
      };
    }

    if (isHeicBytes(bytes)) {
      return {
        path: "",
        error:
          "Esta imagen está en formato HEIC y no pudo convertirse. Toma la foto nuevamente o elige una imagen JPG o PNG.",
      };
    }

    const detected = detectImageFormat(bytes, hintContentType);
    if (!detected) {
      return {
        path: "",
        error: "Formato de imagen no compatible. Usa una foto JPG, PNG o WebP.",
      };
    }

    const timestamp = Date.now();
    const suffix = Math.random().toString(36).slice(2, 8);
    const filePath = `${userId}/${timestamp}-${suffix}.${detected.extension}`;
    const uploadBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(uploadBuffer).set(bytes);

    const { data, error } = await supabase.storage
      .from("meal_photos")
      .upload(filePath, uploadBuffer, {
        contentType: detected.contentType,
        upsert: false,
      });

    if (error) {
      console.error("Error al subir imagen a Supabase Storage:", error);
      return { path: "", error: error.message };
    }

    return { path: data.path };
  } catch (err: any) {
    console.error("Excepción en uploadMealPhoto:", err);
    return { path: "", error: err?.message || "Error al procesar la imagen" };
  }
}

/** El mantenimiento por antigüedad se ejecuta en el backend, junto con sus referencias. */
export async function removeMealPhoto(imagePath: string): Promise<void> {
  const { error } = await supabase.storage.from("meal_photos").remove([imagePath]);
  if (error) throw new Error("No se pudo eliminar la foto temporal.");
}
