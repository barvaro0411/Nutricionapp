import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";
import {
  AnalyzeMealRequestSchema,
  AnalyzeMealResponse,
  NutritionTotals,
} from "./types.ts";
import { CHILEAN_MEAL_VISION_PROMPT } from "./prompts/mealVisionPrompt.ts";
import { GeminiVisionProvider } from "./providers/gemini.ts";
import { OpenAIVisionProvider } from "./providers/openai.ts";
import { VisionProvider } from "./providers/provider.interface.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // 1. Verificar encabezado de autorización
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Falta el encabezado de autorización.",
          },
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parsear y validar el cuerpo de la solicitud
    const rawBody = await req.json();
    const parseResult = AnalyzeMealRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: parseResult.error.errors.map((e) => e.message).join(", "),
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { image_path, client_time_iso, user_note, provider: requestedProvider } = parseResult.data;

    // 3. Inicializar cliente Supabase para descargar la imagen privada
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Descargar imagen desde el bucket privado 'meal_photos'
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("meal_photos")
      .download(image_path);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "IMAGE_NOT_FOUND",
            message: `No se pudo obtener la imagen en ${image_path}: ${downloadError?.message || "Archivo vacío"}`,
          },
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detectar tipo MIME o fallback a image/jpeg
    const mimeType = fileData.type || "image/jpeg";
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convertir Uint8Array a base64 eficientemente
    let binary = "";
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const imageBase64 = btoa(binary);

    // 3.5. Obtener clave de Gemini desde Secrets o desde Supabase Vault
    let geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      const { data: vaultKey } = await supabase.rpc("get_vault_secret", {
        secret_name: "GEMINI_API_KEY",
      });
      if (vaultKey) geminiKey = vaultKey;
    }

    // 4. Seleccionar proveedor y ejecutar análisis con fallback
    let primaryProvider: VisionProvider;
    let fallbackProvider: VisionProvider | null = null;

    if (requestedProvider === "openai") {
      primaryProvider = new OpenAIVisionProvider();
      fallbackProvider = new GeminiVisionProvider(geminiKey);
    } else {
      primaryProvider = new GeminiVisionProvider(geminiKey);
      try {
        if (Deno.env.get("OPENAI_API_KEY")) {
          fallbackProvider = new OpenAIVisionProvider();
        }
      } catch {
        fallbackProvider = null;
      }
    }

    let analysisResult;
    try {
      analysisResult = await primaryProvider.analyzeImage(
        imageBase64,
        mimeType,
        CHILEAN_MEAL_VISION_PROMPT,
        client_time_iso,
        user_note
      );
    } catch (primaryError) {
      console.warn(`Fallo en proveedor primario (${primaryProvider.name}):`, primaryError);
      if (fallbackProvider) {
        console.log(`Intentando con proveedor de fallback (${fallbackProvider.name})...`);
        analysisResult = await fallbackProvider.analyzeImage(
          imageBase64,
          mimeType,
          CHILEAN_MEAL_VISION_PROMPT,
          client_time_iso,
          user_note
        );
      } else {
        throw primaryError;
      }
    }

    const { data: structuredOutput, tokensPrompt, tokensCompletion, providerName } = analysisResult;

    // Si la IA no detectó ningún alimento en la foto
    if (!structuredOutput.items || structuredOutput.items.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "NO_FOOD_DETECTED",
            message: "No detectamos alimentos claros en la imagen. Intenta con otra foto o añade tu comida manualmente.",
          },
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Calcular totales nutricionales
    const totals: NutritionTotals = structuredOutput.items.reduce(
      (acc, item) => ({
        calories: Math.round((acc.calories + item.calories) * 10) / 10,
        protein: Math.round((acc.protein + item.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
        fat: Math.round((acc.fat + item.fat) * 10) / 10,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const latencyMs = Date.now() - startTime;

    const responseBody: AnalyzeMealResponse = {
      success: true,
      data: {
        meal_type_guess: structuredOutput.meal_type_guess,
        items: structuredOutput.items,
        totals,
      },
      meta: {
        provider_used: providerName,
        tokens_prompt: tokensPrompt,
        tokens_completion: tokensCompletion,
        latency_ms: latencyMs,
      },
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error en Edge Function analyze-meal:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error?.message || "Ocurrió un error inesperado al analizar la imagen.",
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
