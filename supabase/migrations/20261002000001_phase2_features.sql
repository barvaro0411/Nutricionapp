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
