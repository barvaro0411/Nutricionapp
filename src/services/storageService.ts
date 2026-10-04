import { supabase } from "@/services/supabase";

export async function uploadMealPhoto(
  userId: string,
  localUri: string
): Promise<{ path: string; error?: string }> {
  try {
    const timestamp = Date.now();
    const filePath = `${userId}/${timestamp}.jpg`;

    // Convertir URI local a Blob compatible con Supabase Storage
    const response = await fetch(localUri);
    const bytes = await response.arrayBuffer();

    const { data, error } = await supabase.storage
      .from("meal_photos")
      .upload(filePath, bytes, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("Error al subir imagen a Supabase Storage:", error);
      return { path: "", error: error.message };
    }

    // Auto-limpieza en segundo plano de fotos con más de 14 días para ahorrar espacio
    void cleanOldMealPhotos(userId, 14).catch(() => undefined);

    return { path: data.path };
  } catch (err: any) {
    console.error("Excepción en uploadMealPhoto:", err);
    return { path: "", error: err?.message || "Error al procesar la imagen" };
  }
}

/**
 * Limpia automáticamente las fotos de comidas con más de `retentionDays` días (por defecto 14 días)
 * para optimizar el almacenamiento del usuario y mantenerlo dentro de la capa gratuita.
 */
export async function cleanOldMealPhotos(
  userId: string,
  retentionDays: number = 14
): Promise<number> {
  try {
    const { data: files, error } = await supabase.storage
      .from("meal_photos")
      .list(userId, { limit: 100 });

    if (error || !files || files.length === 0) return 0;

    const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const oldFiles: string[] = [];

    for (const file of files) {
      const nameParts = file.name.split(".");
      const timestamp = Number(nameParts[0]);
      const fileTime =
        !isNaN(timestamp) && timestamp > 1600000000000
          ? timestamp
          : file.created_at
          ? new Date(file.created_at).getTime()
          : 0;

      if (fileTime > 0 && fileTime < cutoffMs) {
        oldFiles.push(`${userId}/${file.name}`);
      }
    }

    if (oldFiles.length > 0) {
      const { error: removeErr } = await supabase.storage
        .from("meal_photos")
        .remove(oldFiles);

      if (!removeErr) {
        console.log(`Auto-limpieza de fotos: ${oldFiles.length} fotos antiguas eliminadas.`);
        return oldFiles.length;
      }
    }
    return 0;
  } catch (err) {
    console.warn("No se pudo completar la auto-limpieza de fotos:", err);
    return 0;
  }
}
