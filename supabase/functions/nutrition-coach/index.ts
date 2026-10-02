import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";

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

    const { message, client_time_iso } = await req.json();
    if (!message || !message.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "BAD_REQUEST", message: "Mensaje vacío" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Obtener usuario del token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Usuario no válido" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Compilar contexto del usuario
    // a) Perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // b) Objetivo activo
    const { data: goal } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // c) Comidas de hoy
    const now = client_time_iso ? new Date(client_time_iso) : new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: mealsData } = await supabase
      .from("meals")
      .select(`
        id,
        meal_type,
        total_calories,
        total_protein,
        total_carbs,
        total_fat,
        meal_items ( food_name, grams, calories, protein )
      `)
      .eq("user_id", user.id)
      .gte("logged_at", startOfDay.toISOString())
      .lte("logged_at", endOfDay.toISOString())
      .order("logged_at", { ascending: true });

    const meals = mealsData || [];
    const consumed = meals.reduce(
      (acc, m: any) => ({
        calories: acc.calories + Number(m.total_calories),
        protein: acc.protein + Number(m.total_protein),
        carbs: acc.carbs + Number(m.total_carbs),
        fat: acc.fat + Number(m.total_fat),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const targetCals = goal?.calories || 2000;
    const targetProt = goal?.protein_g || 140;
    const targetCarbs = goal?.carbs_g || 220;
    const targetFat = goal?.fat_g || 65;

    const remaining = {
      calories: Math.round(targetCals - consumed.calories),
      protein: Math.round(targetProt - consumed.protein),
      carbs: Math.round(targetCarbs - consumed.carbs),
      fat: Math.round(targetFat - consumed.fat),
    };

    // Resumen de comidas consumidas hoy
    const mealsSummary = meals
      .map((m: any) => {
        const items = (m.meal_items || []).map((i: any) => `${i.food_name} (${i.grams}g)`).join(", ");
        return `- ${m.meal_type.toUpperCase()} (${Math.round(m.total_calories)} kcal, ${Math.round(m.total_protein)}g P): ${items}`;
      })
      .join("\n");

    // Historial reciente de mensajes
    const { data: recentMessages } = await supabase
      .from("coach_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6);

    const historyReversed = (recentMessages || []).reverse();

    // 3. Prompt de sistema contextual
    const masterPlanContext = user.email === "barvaro0411@gmail.com" ? `
### PLAN MAESTRO DE TRANSFORMACIÓN ACTIVO (ÁLVARO ACOSTA):
- Composición corporal InBody: Estatura 173 cm, Peso actual 70.6 kg, 14.4% de grasa corporal (10.2 kg), 34.3 kg MME (masa muscular esquelética), Tasa Metabólica Basal (TMB): 1675 kcal/día.
- Meta de transformación: Bajar grasa corporal al rango 12-13% (~68.6 kg) preservando masa muscular, fuerza y rendimiento. Ritmo: 0.2 a 0.4 kg/semana.
- Ciclado Nutricional:
  * Lunes a Sábado: 2150-2200 kcal | 150-160g Proteína | 230-260g Carbohidratos | 55-65g Grasas.
  * Domingo (Partido de Fútbol / Carga de Carbohidratos): 2500-2600 kcal | ~150g Proteína | 350-375g Carbohidratos | 55-60g Grasas.
- Hidratación deportiva: 3.0 a 3.5 Litros de agua diarios (base 3.2 L).
- Horarios y comidas tipo del plan:
  * 07:00 Desayuno (~500 kcal, ~39g P): Avena 60g + whey 30g + plátano 100g + leche descremada 200ml.
  * 10:30 Colación (~290 kcal, ~20g P): Yogurt alto en proteína + manzana/pera + almendras 15g.
  * 13:45 Pre-Gym (~250 kcal): Pan blanco 60g + mermelada 20g + café (combustible rápido).
  * 16:15 Post-Entreno / Almuerzo (~720 kcal, ~58g P): Pollo 170g + arroz cocido 220g + verduras 200g + aceite de oliva 10g.
  * 20:30 Cena (~410 kcal, ~38g P): 2 huevos + atún 80g + pan integral 40g + palta 30g + ensalada.
- Rutina semanal de entrenamiento: Lunes Torso + Bici, Martes Piernas + Bici, Miércoles Push + Bici, Jueves Pull + Bici (sin peso muerto), Viernes Hombros/brazos + Bici, Sábado Recuperación activa, Domingo Partido de Fútbol.
- Suplementación: Creatina monohidratada (3-5g diarios), Proteína Whey (20-30g según necesidad), Cafeína (100-200mg pre-entreno), Omega-3, Electrolitos para el fútbol y calor.
- RIR (Repeticiones en Reserva): RIR 1-2 en ejercicios básicos pesados, RIR 0-1 solo en aislados. Regla de doble progresión.
` : "";

    const systemPrompt = `
Eres el Coach Nutricional IA de una aplicación de nutrición en Chile.
Tu rol es acompañar al usuario con empatía, base científica y soluciones prácticas aterrizadas a la realidad chilena (ferias libres, supermercados, picadas, once familiar).
${masterPlanContext}
### CONTEXTO EN TIEMPO REAL DEL USUARIO HOY:
- Nombre: ${profile?.full_name || "Usuario"}
- Objetivo: ${profile?.objective || "Mantenimiento"}
- Peso actual: ${profile?.current_weight_kg || "?"} kg, Estatura: ${profile?.height_cm || "?"} cm
- Metas Diarias: ${targetCals} kcal | ${targetProt}g Proteína | ${targetCarbs}g Carbohidratos | ${targetFat}g Grasas
- Consumido Hoy: ${Math.round(consumed.calories)} kcal | ${Math.round(consumed.protein)}g P | ${Math.round(consumed.carbs)}g C | ${Math.round(consumed.fat)}g G
- Restante para cumplir la meta: ${remaining.calories} kcal | ${remaining.protein}g P | ${remaining.carbs}g C | ${remaining.fat}g G
- Comidas ya registradas hoy:
${mealsSummary || "Ninguna comida registrada aún hoy."}

### DIRECTRICES DE RESPUESTA:
1. Responde de forma cálida, cercana (tono chileno educado y motivador) y directa.
2. Si te preguntan qué comer o cenar, calcula exactamente opciones que calcen con las calorías y gramos de proteína que le faltan hoy.
3. Menciona alimentos chilenos concretos (ej: atún San José o Lomito al agua, huevos revueltos con marraqueta, quesillo Colun, yogur de proteína, pechuga de pollo, legumbres, jurel, etc.).
4. Mantén las respuestas legibles, con viñetas cuando des opciones o recetas rápidas.
5. No des diagnósticos médicos; enfócate en hábitos sostenibles y balance de macronutrientes.
`.trim();

    // Construir contenido para Gemini
    const contents: any[] = [];
    contents.push({ role: "user", parts: [{ text: systemPrompt }] });
    contents.push({ role: "model", parts: [{ text: "Entendido. Conozco el progreso del usuario hoy y estoy listo para asesorarlo." }] });

    for (const msg of historyReversed) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: message.trim() }],
    });

    let apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      const { data: vaultKey } = await supabase.rpc("get_vault_secret", {
        secret_name: "GEMINI_API_KEY",
      });
      if (vaultKey) apiKey = vaultKey;
    }
    if (!apiKey) throw new Error("Falta GEMINI_API_KEY (no encontrada en secrets ni en Supabase Vault)");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const aiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 800,
        },
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      throw new Error(`Error Gemini: ${err}`);
    }

    const aiData = await aiRes.json();
    const assistantReply = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "No pude generar una respuesta en este momento.";

    // 4. Guardar mensajes en supabase
    const contextSnapshot = {
      targetCals,
      consumedCals: Math.round(consumed.calories),
      remainingCals: remaining.calories,
      remainingProt: remaining.protein,
    };

    await supabase.from("coach_messages").insert([
      {
        user_id: user.id,
        role: "user",
        content: message.trim(),
        context_snapshot: contextSnapshot,
      },
      {
        user_id: user.id,
        role: "assistant",
        content: assistantReply,
        context_snapshot: contextSnapshot,
      },
    ]);

    const latencyMs = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        reply: assistantReply,
        context: {
          remainingCalories: remaining.calories,
          remainingProtein: remaining.protein,
          consumedCalories: Math.round(consumed.calories),
        },
        meta: {
          latency_ms: latencyMs,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error en nutrition-coach:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "COACH_ERROR", message: error?.message || "Error procesando la consulta con el Coach." },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
