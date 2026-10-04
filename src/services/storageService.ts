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

    return { path: data.path };
  } catch (err: any) {
    console.error("Excepción en uploadMealPhoto:", err);
    return { path: "", error: err?.message || "Error al procesar la imagen" };
  }
}
