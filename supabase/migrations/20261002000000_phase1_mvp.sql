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
