import { useState } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/services/supabase";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { AnalyzeMealResponse, MealType } from "@/types/meal";
import { extractFunctionErrorMessage } from "@/utils/functionErrors";

export function useTextAudioMeal() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { initializeReview } = useMealReviewStore();

  const parseTextMeal = async (text: string, suggestedMealType?: MealType) => {
    if (!text.trim()) {
      setError("Por favor escribe lo que comiste.");
      return { success: false };
    }

    setProcessing(true);
    setError(null);

    try {
      const clientTimeIso = new Date().toISOString();

      const { data, error: funcErr } = await supabase.functions.invoke<AnalyzeMealResponse>(
        "parse-meal-text",
        {
          body: {
            text: text.trim(),
            client_time_iso: clientTimeIso,
          },
        }
      );

      if (funcErr) {
        const readableMsg = await extractFunctionErrorMessage(
          funcErr,
          "No pudimos interpretar la descripción. Intenta detallar un poco más los alimentos."
        );
        throw new Error(readableMsg);
      }

      if (!data || !data.success || !data.data) {
        throw new Error(data?.error?.message || "No se detectaron alimentos válidos.");
      }

      const mealData = data.data;
      const finalMealType = suggestedMealType || mealData.meal_type_guess || "almuerzo";

      // Inicializar el store de confirmación
      initializeReview({
        imagePath: "",
        localImageUri: "",
        mealType: finalMealType,
        items: mealData.items,
      });

      // Redirigir a la pantalla de confirmación
      router.push("/meal/review");

      return { success: true, data: mealData };
    } catch (err: any) {
      const msg = err?.message || "Error al procesar el texto de la comida";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setProcessing(false);
    }
  };

  const parseAudioMeal = async (
    audioBase64: string,
    mimeType: string = "audio/m4a",
    suggestedMealType?: MealType
  ) => {
    setProcessing(true);
    setError(null);

    try {
      const clientTimeIso = new Date().toISOString();

      const { data, error: funcErr } = await supabase.functions.invoke<AnalyzeMealResponse>(
        "parse-meal-text",
        {
          body: {
            audio_base64: audioBase64,
            audio_mime_type: mimeType,
            client_time_iso: clientTimeIso,
          },
        }
      );

      if (funcErr) {
        const readableMsg = await extractFunctionErrorMessage(
          funcErr,
          "No pudimos procesar el audio. Asegúrate de hablar claro y cerca del micrófono."
        );
        throw new Error(readableMsg);
      }

      if (!data || !data.success || !data.data) {
        throw new Error(data?.error?.message || "No se detectaron alimentos en el audio.");
      }

      const mealData = data.data;
      const finalMealType = suggestedMealType || mealData.meal_type_guess || "almuerzo";

      initializeReview({
        imagePath: "",
        localImageUri: "",
        mealType: finalMealType,
        items: mealData.items,
      });

      router.push("/meal/review");
      return { success: true, data: mealData };
    } catch (err: any) {
      const msg = err?.message || "Error al procesar el audio de la comida";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setProcessing(false);
    }
  };

  return {
    parseTextMeal,
    parseAudioMeal,
    processing,
    error,
  };
}
