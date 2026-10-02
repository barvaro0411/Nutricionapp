-- ============================================================================
-- Migración: Fase 3 - Coach Nutricional IA, Recetas Chilenas y Actividad
-- Fecha: 2026-10-02
-- ============================================================================

-- ============================================================================
-- 1. TABLA: COACH_MESSAGES (Historial de chat con el Coach IA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    context_snapshot JSONB, -- Metas y macros consumidos al momento del mensaje
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coach_messages_user ON public.coach_messages(user_id, created_at ASC);

-- ============================================================================
-- 2. TABLAS: RECIPES Y RECIPE_INGREDIENTS (Catálogo de recetas chilenas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('desayuno', 'almuerzo', 'cena', 'snack')),
    prep_time_minutes INTEGER NOT NULL DEFAULT 20,
    servings INTEGER NOT NULL DEFAULT 1,
    calories_per_serving NUMERIC(7, 2) NOT NULL,
    protein_per_serving NUMERIC(7, 2) NOT NULL,
    carbs_per_serving NUMERIC(7, 2) NOT NULL,
    fat_per_serving NUMERIC(7, 2) NOT NULL,
    instructions TEXT[] NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    grams NUMERIC(7, 2) NOT NULL,
    calories NUMERIC(7, 2) NOT NULL,
    protein NUMERIC(7, 2) NOT NULL,
    carbs NUMERIC(7, 2) NOT NULL,
    fat NUMERIC(7, 2) NOT NULL
);

-- ============================================================================
-- 3. TABLA: ACTIVITY_LOGS (Calorías activas quemadas y pasos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
    active_calories_burned INTEGER NOT NULL DEFAULT 0,
    steps INTEGER DEFAULT 0,
    source TEXT DEFAULT 'manual' CHECK (source IN ('apple_health', 'health_connect', 'manual')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, logged_at)
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON public.activity_logs(user_id, logged_at DESC);

-- ============================================================================
-- 4. POLÍTICAS RLS FASE 3
-- ============================================================================
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own coach messages" ON public.coach_messages;
CREATE POLICY "Users can manage own coach messages"
    ON public.coach_messages FOR ALL
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can read recipes" ON public.recipes;
CREATE POLICY "Authenticated users can read recipes"
    ON public.recipes FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can read recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Authenticated users can read recipe ingredients"
    ON public.recipe_ingredients FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can manage own activity logs" ON public.activity_logs;
CREATE POLICY "Users can manage own activity logs"
    ON public.activity_logs FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================================
-- 5. SEED INICIAL: RECETAS SALUDABLES CHILENAS
-- ============================================================================
INSERT INTO public.recipes (id, title, description, meal_type, prep_time_minutes, servings, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, instructions)
VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'Cazuela de Pollo Proteica',
    'Versión ligera y alta en proteína del clásico caldo chileno con pechuga y verduras frescas.',
    'almuerzo',
    35,
    1,
    380.0,
    42.0,
    32.0,
    8.0,
    ARRAY[
        'Sellar la pechuga de pollo en una olla con unas gotas de aceite.',
        'Agregar 400ml de agua caliente, el zapallo camote, la papa y la zanahoria en juliana.',
        'Hervir a fuego medio por 20 minutos hasta que las verduras estén tiernas.',
        'Añadir los porotos verdes y el choclo durante los últimos 5 minutos.',
        'Servir en plato hondo con cilantro picado encima.'
    ]
),
(
    '22222222-2222-2222-2222-222222222222',
    'Charquicán con Carne Tártaro y Huevo',
    'Preparación tradicional con carne magra seleccionada y huevo pochado o a la plancha.',
    'almuerzo',
    25,
    1,
    425.0,
    38.0,
    44.0,
    10.5,
    ARRAY[
        'Saltear la carne molida magra tártaro con cebolla picada fina y aliño completo.',
        'Cocer las papas, zapallo y verduras mixtas (arvejas, choclo, porotos verdes) hasta que estén blandas.',
        'Moler rústicamente con tenedor dejando textura casera y mezclar con la carne salteada.',
        'Cocinar un huevo a la plancha con rocío vegetal y colocar sobre el charquicán caliente.'
    ]
),
(
    '33333333-3333-3333-3333-333333333333',
    'Budín de Zapallo Italiano con Atún',
    'Excelente opción baja en carbohidratos, saciante y rica en proteína para la cena u once.',
    'cena',
    30,
    1,
    295.0,
    34.0,
    14.0,
    9.0,
    ARRAY[
        'Rallar el zapallo italiano y escurrir el exceso de agua con un paño limpio.',
        'Mezclar en un bowl con 1 lata de atún al agua escurrida y 2 huevos batidos.',
        'Condimentar con orégano chileno, sal y pimienta a gusto.',
        'Verter en molde apto para horno o airfryer y cubrir con cubitos de quesillo.',
        'Hornear a 180°C por 20 minutos hasta que cuaje y dore ligeramente.'
    ]
),
(
    '44444444-4444-4444-4444-444444444444',
    'Panqueques de Avena, Plátano y Proteína',
    'Desayuno rápido, energético y sin azúcar añadida para comenzar el día con máxima energía.',
    'desayuno',
    15,
    1,
    340.0,
    26.0,
    45.0,
    6.0,
    ARRAY[
        'Licuar 50g de avena en hojuelas, 1 huevo, medio plátano y un chorrito de leche o agua.',
        'Calentar un sartén antiadherente a fuego medio-bajo.',
        'Verter porciones pequeñas y cocinar 2 minutos por lado hasta dorar.',
        'Servir con rodajas del resto del plátano y una pizca de canela.'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- Ingredientes detallados para registro directo en comidas
INSERT INTO public.recipe_ingredients (id, recipe_id, food_name, grams, calories, protein, carbs, fat)
SELECT md5(recipe_id || food_name)::uuid, recipe_id::uuid, food_name, grams, calories, protein, carbs, fat
FROM (VALUES
-- Cazuela
('11111111-1111-1111-1111-111111111111', 'Pechuga de pollo cocida', 180.0, 270.0, 38.0, 0.0, 4.5),
('11111111-1111-1111-1111-111111111111', 'Zapallo camote cocido', 80.0, 28.0, 1.0, 6.5, 0.2),
('11111111-1111-1111-1111-111111111111', 'Papa cocida', 80.0, 68.0, 1.5, 15.5, 0.1),
('11111111-1111-1111-1111-111111111111', 'Porotos verdes y zanahoria', 60.0, 14.0, 1.5, 10.0, 3.2),

-- Charquicán
('22222222-2222-2222-2222-222222222222', 'Carne vacuno tártaro (magra)', 140.0, 215.0, 31.0, 0.0, 6.0),
('22222222-2222-2222-2222-222222222222', 'Huevo a la plancha', 50.0, 75.0, 6.0, 0.5, 5.0),
('22222222-2222-2222-2222-222222222222', 'Puré de verduras casero (zapallo, papa, arvejas)', 150.0, 135.0, 1.0, 43.5, 0.5),

-- Budín Zapallo Italiano
('33333333-3333-3333-3333-333333333333', 'Atún al agua en conserva', 120.0, 130.0, 28.0, 0.0, 1.2),
('33333333-3333-3333-3333-333333333333', 'Huevo entero', 50.0, 75.0, 6.0, 0.5, 5.0),
('33333333-3333-3333-3333-333333333333', 'Zapallo italiano fresco', 200.0, 34.0, 2.4, 6.2, 0.4),
('33333333-3333-3333-3333-333333333333', 'Quesillo chileno', 50.0, 56.0, 5.5, 2.0, 2.4),

-- Panqueques de Avena
('44444444-4444-4444-4444-444444444444', 'Avena tradicional', 50.0, 190.0, 6.5, 34.0, 3.5),
('44444444-4444-4444-4444-444444444444', 'Huevo entero', 50.0, 75.0, 6.0, 0.5, 5.0),
('44444444-4444-4444-4444-444444444444', 'Plátano maduro', 80.0, 72.0, 1.0, 18.5, 0.2)
) AS seed(recipe_id, food_name, grams, calories, protein, carbs, fat)
ON CONFLICT (id) DO NOTHING;
