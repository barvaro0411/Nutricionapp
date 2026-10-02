-- ============================================================================
-- ESQUEMA COMPLETO Y DEFINITIVO: NUTRICIÓN IA CHILE (FASES 1 A 4)
-- ============================================================================



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRACIÓN: 20261002000000_phase1_mvp.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- Migración: Fase 1 (MVP) - Nutrición App Chile
-- Fecha: 2026-10-02
-- ============================================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TABLA: PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    birth_date DATE,
    height_cm NUMERIC(5, 2) CHECK (height_cm > 50 AND height_cm < 250),
    current_weight_kg NUMERIC(5, 2) CHECK (current_weight_kg > 20 AND current_weight_kg < 350),
    activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
    objective TEXT CHECK (objective IN ('lose_weight', 'maintain', 'gain_muscle')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- 2. TABLA: GOALS (Objetivos calóricos y macronutrientes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    calories INTEGER NOT NULL CHECK (calories >= 800 AND calories <= 8000),
    protein_g INTEGER NOT NULL CHECK (protein_g >= 10),
    carbs_g INTEGER NOT NULL CHECK (carbs_g >= 10),
    fat_g INTEGER NOT NULL CHECK (fat_g >= 5),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_goals_user_active ON public.goals(user_id) WHERE is_active = true;

-- ============================================================================
-- 3. TABLA: MEALS (Comidas registradas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('desayuno', 'almuerzo', 'cena', 'snack')),
    logged_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    image_path TEXT, -- Ruta en el bucket privado 'meal_photos'
    total_calories NUMERIC(7, 2) DEFAULT 0 NOT NULL,
    total_protein NUMERIC(7, 2) DEFAULT 0 NOT NULL,
    total_carbs NUMERIC(7, 2) DEFAULT 0 NOT NULL,
    total_fat NUMERIC(7, 2) DEFAULT 0 NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meals_user_date ON public.meals(user_id, logged_at DESC);

-- ============================================================================
-- 4. TABLA: MEAL_ITEMS (Alimentos individuales dentro de una comida)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.meal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    grams NUMERIC(7, 2) NOT NULL CHECK (grams >= 0),
    calories NUMERIC(7, 2) NOT NULL CHECK (calories >= 0),
    protein NUMERIC(7, 2) NOT NULL CHECK (protein >= 0),
    carbs NUMERIC(7, 2) NOT NULL CHECK (carbs >= 0),
    fat NUMERIC(7, 2) NOT NULL CHECK (fat >= 0),
    confidence NUMERIC(3, 2) CHECK (confidence >= 0.00 AND confidence <= 1.00),
    ai_detected BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meal_items_meal_id ON public.meal_items(meal_id);

-- ============================================================================
-- 5. TRIGGER: RECALCULAR TOTALES DE MEAL AUTOMÁTICAMENTE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_meal_totals()
RETURNS TRIGGER AS $$
DECLARE
    target_meal_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_meal_id := OLD.meal_id;
    ELSE
        target_meal_id := NEW.meal_id;
    END IF;

    UPDATE public.meals
    SET 
        total_calories = COALESCE((SELECT SUM(calories) FROM public.meal_items WHERE meal_id = target_meal_id), 0),
        total_protein = COALESCE((SELECT SUM(protein) FROM public.meal_items WHERE meal_id = target_meal_id), 0),
        total_carbs = COALESCE((SELECT SUM(carbs) FROM public.meal_items WHERE meal_id = target_meal_id), 0),
        total_fat = COALESCE((SELECT SUM(fat) FROM public.meal_items WHERE meal_id = target_meal_id), 0),
        updated_at = now()
    WHERE id = target_meal_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recalculate_meal_totals ON public.meal_items;
CREATE TRIGGER trg_recalculate_meal_totals
AFTER INSERT OR UPDATE OR DELETE ON public.meal_items
FOR EACH ROW EXECUTE FUNCTION public.recalculate_meal_totals();

-- ============================================================================
-- 6. VISTA: TOTALES DIARIOS POR USUARIO (ZONA HORARIA CHILE)
-- ============================================================================
CREATE OR REPLACE VIEW public.v_daily_totals AS
SELECT 
    m.user_id,
    (m.logged_at AT TIME ZONE 'America/Santiago')::DATE AS log_date,
    COUNT(m.id) AS meal_count,
    ROUND(SUM(m.total_calories)::NUMERIC, 1) AS total_calories,
    ROUND(SUM(m.total_protein)::NUMERIC, 1) AS total_protein,
    ROUND(SUM(m.total_carbs)::NUMERIC, 1) AS total_carbs,
    ROUND(SUM(m.total_fat)::NUMERIC, 1) AS total_fat
FROM public.meals m
GROUP BY m.user_id, (m.logged_at AT TIME ZONE 'America/Santiago')::DATE;

-- ============================================================================
-- 7. TRIGGER: CREACIÓN AUTOMÁTICA DE PERFIL AL REGISTRARSE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 8. POLÍTICAS ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Goals
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
CREATE POLICY "Users can view own goals" 
    ON public.goals FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
CREATE POLICY "Users can insert own goals" 
    ON public.goals FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
CREATE POLICY "Users can update own goals" 
    ON public.goals FOR UPDATE 
    USING (auth.uid() = user_id);

-- Meals
DROP POLICY IF EXISTS "Users can view own meals" ON public.meals;
CREATE POLICY "Users can view own meals" 
    ON public.meals FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own meals" ON public.meals;
CREATE POLICY "Users can insert own meals" 
    ON public.meals FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meals" ON public.meals;
CREATE POLICY "Users can update own meals" 
    ON public.meals FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own meals" ON public.meals;
CREATE POLICY "Users can delete own meals" 
    ON public.meals FOR DELETE 
    USING (auth.uid() = user_id);

-- Meal Items
DROP POLICY IF EXISTS "Users can view own meal items" ON public.meal_items;
CREATE POLICY "Users can view own meal items" 
    ON public.meal_items FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.meals 
        WHERE meals.id = meal_items.meal_id AND meals.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert own meal items" ON public.meal_items;
CREATE POLICY "Users can insert own meal items" 
    ON public.meal_items FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.meals 
        WHERE meals.id = meal_items.meal_id AND meals.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update own meal items" ON public.meal_items;
CREATE POLICY "Users can update own meal items" 
    ON public.meal_items FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM public.meals 
        WHERE meals.id = meal_items.meal_id AND meals.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can delete own meal items" ON public.meal_items;
CREATE POLICY "Users can delete own meal items" 
    ON public.meal_items FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM public.meals 
        WHERE meals.id = meal_items.meal_id AND meals.user_id = auth.uid()
    ));

-- ============================================================================
-- 9. CONFIGURACIÓN DEL BUCKET PRIVADO DE STORAGE: meal_photos
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'meal_photos', 
    'meal_photos', 
    false, 
    5242880, -- 5 MB máximo
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own meal photos" ON storage.objects;
CREATE POLICY "Users can upload their own meal photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'meal_photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view their own meal photos" ON storage.objects;
CREATE POLICY "Users can view their own meal photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'meal_photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their own meal photos" ON storage.objects;
CREATE POLICY "Users can delete their own meal photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'meal_photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRACIÓN: 20261002000001_phase2_features.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- Migración: Fase 2 - Códigos de Barra, Agua y Comidas Frecuentes
-- Fecha: 2026-10-02
-- ============================================================================

-- ============================================================================
-- 1. TABLA: BARCODE_PRODUCTS (Base de datos propia + caché local EAN 780)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.barcode_products (
    barcode TEXT PRIMARY KEY, -- Código EAN-13 o EAN-8 (ej: 7801234567890)
    product_name TEXT NOT NULL,
    brand TEXT,
    serving_size_g NUMERIC(7, 2) DEFAULT 100 NOT NULL,
    calories_per_100g NUMERIC(7, 2) NOT NULL,
    protein_per_100g NUMERIC(7, 2) NOT NULL,
    carbs_per_100g NUMERIC(7, 2) NOT NULL,
    fat_per_100g NUMERIC(7, 2) NOT NULL,
    country TEXT DEFAULT 'CL',
    verified BOOLEAN DEFAULT false NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_barcode_products_barcode ON public.barcode_products(barcode);

-- ============================================================================
-- 2. TABLA: WATER_LOGS (Registro de consumo de agua)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.water_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_ml INTEGER NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 5000),
    logged_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON public.water_logs(user_id, logged_at DESC);

-- ============================================================================
-- 3. TABLAS: FAVORITE_MEALS Y FAVORITE_MEAL_ITEMS (Comidas Frecuentes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.favorite_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('desayuno', 'almuerzo', 'cena', 'snack')),
    total_calories NUMERIC(7, 2) DEFAULT 0 NOT NULL,
    total_protein NUMERIC(7, 2) DEFAULT 0 NOT NULL,
    total_carbs NUMERIC(7, 2) DEFAULT 0 NOT NULL,
    total_fat NUMERIC(7, 2) DEFAULT 0 NOT NULL,
    usage_count INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.favorite_meal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    favorite_meal_id UUID NOT NULL REFERENCES public.favorite_meals(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    grams NUMERIC(7, 2) NOT NULL CHECK (grams >= 0),
    calories NUMERIC(7, 2) NOT NULL CHECK (calories >= 0),
    protein NUMERIC(7, 2) NOT NULL CHECK (protein >= 0),
    carbs NUMERIC(7, 2) NOT NULL CHECK (carbs >= 0),
    fat NUMERIC(7, 2) NOT NULL CHECK (fat >= 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- 4. POLÍTICAS RLS FASE 2
-- ============================================================================
ALTER TABLE public.barcode_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_meal_items ENABLE ROW LEVEL SECURITY;

-- Barcode products: Lectura pública autenticados, inserción colaborativa
DROP POLICY IF EXISTS "Authenticated users can read barcode products" ON public.barcode_products;
CREATE POLICY "Authenticated users can read barcode products"
    ON public.barcode_products FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert new barcode products" ON public.barcode_products;
CREATE POLICY "Authenticated users can insert new barcode products"
    ON public.barcode_products FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Water logs: Privacidad total por usuario
DROP POLICY IF EXISTS "Users can manage own water logs" ON public.water_logs;
CREATE POLICY "Users can manage own water logs"
    ON public.water_logs FOR ALL
    USING (auth.uid() = user_id);

-- Favorite meals: Privacidad total por usuario
DROP POLICY IF EXISTS "Users can manage own favorite meals" ON public.favorite_meals;
CREATE POLICY "Users can manage own favorite meals"
    ON public.favorite_meals FOR ALL
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own favorite meal items" ON public.favorite_meal_items;
CREATE POLICY "Users can manage own favorite meal items"
    ON public.favorite_meal_items FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.favorite_meals
        WHERE favorite_meals.id = favorite_meal_items.favorite_meal_id 
        AND favorite_meals.user_id = auth.uid()
    ));


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRACIÓN: 20261002000002_phase3_coach_recipes.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- MIGRACIÓN: 20261002000003_phase4_subscriptions.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- Migración: Fase 4 - Suscripciones, Cuotas de IA y RevenueCat
-- Fecha: 2026-10-02
-- ============================================================================

-- ============================================================================
-- 1. TABLA: SUBSCRIPTIONS (Estado de suscripción sincronizado con RevenueCat)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'active', 'trialing', 'canceled', 'past_due')),
    plan_id TEXT NOT NULL DEFAULT 'free' CHECK (plan_id IN ('free', 'pro_monthly_clp', 'pro_annual_clp')),
    revenuecat_customer_id TEXT,
    current_period_end TIMESTAMPTZ,
    ai_photo_scans_today INTEGER DEFAULT 0 NOT NULL,
    last_scan_date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- 2. FUNCIÓN PARA CONTROLAR CUOTA DIARIA DE IA EN PLAN GRATUITO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_quota(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    sub_record RECORD;
    today_date DATE := CURRENT_DATE;
    max_free_scans INTEGER := 3;
BEGIN
    SELECT * INTO sub_record FROM public.subscriptions WHERE user_id = target_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.subscriptions (user_id, status, plan_id, ai_photo_scans_today, last_scan_date)
        VALUES (target_user_id, 'free', 'free', 1, today_date)
        RETURNING * INTO sub_record;
        
        RETURN jsonb_build_object('allowed', true, 'is_pro', false, 'remaining', max_free_scans - 1);
    END IF;

    -- Si es usuario Pro, tiene escaneos ilimitados
    IF sub_record.status IN ('active', 'trialing') THEN
        RETURN jsonb_build_object('allowed', true, 'is_pro', true, 'remaining', 9999);
    END IF;

    -- Si cambió de día, reiniciar contador
    IF sub_record.last_scan_date < today_date THEN
        UPDATE public.subscriptions
        SET ai_photo_scans_today = 1, last_scan_date = today_date, updated_at = now()
        WHERE user_id = target_user_id;

        RETURN jsonb_build_object('allowed', true, 'is_pro', false, 'remaining', max_free_scans - 1);
    END IF;

    -- Si ya alcanzó el límite gratuito
    IF sub_record.ai_photo_scans_today >= max_free_scans THEN
        RETURN jsonb_build_object('allowed', false, 'is_pro', false, 'remaining', 0);
    END IF;

    -- Incrementar contador
    UPDATE public.subscriptions
    SET ai_photo_scans_today = ai_photo_scans_today + 1, updated_at = now()
    WHERE user_id = target_user_id;

    RETURN jsonb_build_object('allowed', true, 'is_pro', false, 'remaining', max_free_scans - (sub_record.ai_photo_scans_today + 1));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. POLÍTICAS RLS FASE 4
-- ============================================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
CREATE POLICY "Users can read own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
CREATE POLICY "Users can update own subscription"
    ON public.subscriptions FOR UPDATE
    USING (auth.uid() = user_id);
