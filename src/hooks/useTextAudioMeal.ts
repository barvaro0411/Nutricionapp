import { useState } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/services/supabase";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { useToastStore } from "@/stores/useToastStore";
import { AnalyzeMealResponse, MealType } from "@/types/meal";
import { extractFunctionErrorMessage } from "@/utils/functionErrors";

export function useTextAudioMeal() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { initializeReview } = useMealReviewStore();

  const transcribeAudioMeal = async (
    audioBase64: string,
    mimeType: string = "audio/m4a"
  ): Promise<{ success: boolean; transcript?: string; error?: string }> => {
    setIsTranscribing(true);
    setError(null);

    try {
      const { data, error: funcErr } = await supabase.functions.invoke<{
        success: boolean;
        data?: { transcript?: string };
        error?: { message?: string };
      }>("parse-meal-text", {
        body: {
          audio_base64: audioBase64,
          audio_mime_type: mimeType,
          transcribe_only: true,
        },
      });

      if (funcErr) {
        const readableMsg = await extractFunctionErrorMessage(
          funcErr,
          "No pudimos transcribir el audio. Habla claro y cerca del micrófono."
        );
        throw new Error(readableMsg);
      }

      const transcript = data?.data?.transcript?.trim();
      if (!data?.success || !transcript) {
        throw new Error(data?.error?.message || "No se detectaron palabras en la grabación.");
      }

      useToastStore.getState().showToast({
        type: "info",
        title: "Audio transcrito",
        message: "Revisa o edita tu comida antes de procesarla con IA.",
      });

      return { success: true, transcript };
    } catch (err: any) {
      const msg = err?.message || "Error al transcribir el audio";
      setError(msg);
      useToastStore.getState().showToast({
        type: "error",
        title: "Error al transcribir",
        message: msg,
      });
      return { success: false, error: msg };
    } finally {
      setIsTranscribing(false);
    }
  };

  const parseTextMeal = async (text: string, suggestedMealType?: MealType) => {
    if (!text.trim()) {
      const emptyMsg = "Por favor escribe o dicta lo que comiste.";
      setError(emptyMsg);
      useToastStore.getState().showToast({
        type: "warning",
        title: "Descripción vacía",
        message: emptyMsg,
      });
      return { success: false, error: emptyMsg };
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

      useToastStore.getState().showToast({
        type: "success",
        title: "¡Comida interpretada!",
        message: "Calculamos los alimentos y macronutrientes.",
      });

      // Redirigir a la pantalla de confirmación
      router.push("/meal/review");

      return { success: true, data: mealData };
    } catch (err: any) {
      const msg = err?.message || "Error al procesar el texto de la comida";
      setError(msg);
      useToastStore.getState().showToast({
        type: "error",
        title: "Error al analizar",
        message: msg,
      });
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

      useToastStore.getState().showToast({
        type: "success",
        title: "¡Comida interpretada!",
        message: "Calculamos los alimentos y macronutrientes.",
      });

      router.push("/meal/review");
      return { success: true, data: mealData };
    } catch (err: any) {
      const msg = err?.message || "Error al procesar el audio de la comida";
      setError(msg);
      useToastStore.getState().showToast({
        type: "error",
        title: "Error al analizar",
        message: msg,
      });
      return { success: false, error: msg };
    } finally {
      setProcessing(false);
    }
  };

  return {
    parseTextMeal,
    parseAudioMeal,
    transcribeAudioMeal,
    processing,
    isTranscribing,
    error,
  };
}
