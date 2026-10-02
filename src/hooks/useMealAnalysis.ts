import { useState } from "react";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { compressMealImage } from "@/utils/imageCompressor";
import { uploadMealPhoto } from "@/services/storageService";
import { AnalyzeMealResponse, MealType } from "@/types/meal";

export function useMealAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState<"compressing" | "uploading" | "analyzing" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();
  const { initializeReview } = useMealReviewStore();

  const analyzePhoto = async (
    localUri: string,
    suggestedMealType?: MealType,
    userNote?: string
  ) => {
    if (!user) {
      setError("Usuario no autenticado");
      return { success: false, error: "Usuario no autenticado" };
    }

    setAnalyzing(true);
    setError(null);

    try {
      // 1. Compresión local
      setStage("compressing");
      const compressed = await compressMealImage(localUri);

      // 2. Subida a Supabase Storage privado
      setStage("uploading");
      const { path: imagePath, error: uploadErr } = await uploadMealPhoto(
        user.id,
        compressed.uri
      );

      if (uploadErr || !imagePath) {
        throw new Error(uploadErr || "No se pudo subir la foto");
      }

      // 3. Llamar a Edge Function `analyze-meal`
      setStage("analyzing");
      const clientTimeIso = new Date().toISOString();

      const { data, error: functionErr } = await supabase.functions.invoke<AnalyzeMealResponse>(
        "analyze-meal",
        {
          body: {
            image_path: imagePath,
            client_time_iso: clientTimeIso,
            user_note: userNote,
            provider: "gemini",
          },
        }
      );

      if (functionErr) {
        throw new Error(functionErr.message || "Error al conectar con el servicio de IA");
      }

      if (!data || !data.success || !data.data) {
        throw new Error(data?.error?.message || "No se pudieron identificar alimentos claros.");
      }

      const mealData = data.data;
      const finalMealType = suggestedMealType || mealData.meal_type_guess || "almuerzo";

      // 4. Inicializar estado de revisión
      initializeReview({
        imagePath,
        localImageUri: compressed.uri,
        mealType: finalMealType,
        items: mealData.items,
      });

      return { success: true, data: mealData };
    } catch (err: any) {
      console.error("Error en analyzePhoto:", err);
      const msg = err?.message || "Error al analizar la comida";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setAnalyzing(false);
      setStage(null);
    }
  };

  return {
    analyzePhoto,
    analyzing,
    stage,
    error,
  };
}
