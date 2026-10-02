import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  ParseMealTextRequestSchema,
  AIStructuredOutputSchema,
} from "./types.ts";
import { CHILEAN_MEAL_TEXT_PROMPT } from "./prompts/mealTextPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Falta autorización" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawBody = await req.json();
    const parseResult = ParseMealTextRequestSchema.safeParse(rawBody);

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

    const { text, audio_base64, audio_mime_type, client_time_iso } = parseResult.data;

    let apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: vaultKey } = await supabaseAdmin.rpc("get_vault_secret", {
        secret_name: "GEMINI_API_KEY",
      });
      if (vaultKey) apiKey = vaultKey;
    }

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY no encontrada en secrets ni en Supabase Vault.");
    }

    // Preparar contenido para Gemini 1.5 Flash
    let promptWithContext = CHILEAN_MEAL_TEXT_PROMPT;
    if (clientTimeIso) {
      promptWithContext += `\n[Hora local del cliente: ${clientTimeIso}]`;
    }

    const parts: any[] = [{ text: promptWithContext }];

    if (audio_base64) {
      // Entrada de audio multimodal directa
      parts.push({
        inline_data: {
          mime_type: audio_mime_type || "audio/m4a",
          data: audio_base64,
        },
      });
      parts.push({
        text: "Transcribe el audio y extrae los alimentos, gramos y macronutrientes en el JSON requerido.",
      });
    } else if (text) {
      parts.push({
        text: `Descripción del usuario: "${text}"`,
      });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error en API Gemini (${response.status}): ${errText}`);
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("No se obtuvo respuesta textual de la IA.");
    }

    const parsedJson = JSON.parse(rawText);
    const validatedData = AIStructuredOutputSchema.parse(parsedJson);

    if (!validatedData.items || validatedData.items.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "NO_FOOD_DETECTED",
            message: "No logramos entender alimentos en la descripción. Por favor intenta ser más específico.",
          },
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totals = validatedData.items.reduce(
      (acc, item) => ({
        calories: Math.round((acc.calories + item.calories) * 10) / 10,
        protein: Math.round((acc.protein + item.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
        fat: Math.round((acc.fat + item.fat) * 10) / 10,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const latencyMs = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          meal_type_guess: validatedData.meal_type_guess,
          items: validatedData.items,
          totals,
        },
        meta: {
          provider_used: "gemini-1.5-flash",
          latency_ms: latencyMs,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error en parse-meal-text:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error?.message || "Ocurrió un error inesperado al procesar el texto/audio.",
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
