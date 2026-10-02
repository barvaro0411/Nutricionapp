BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
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
CREATE TABLE IF NOT EXISTS public.meals (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
meal_type TEXT NOT NULL CHECK (meal_type IN ('desayuno', 'almuerzo', 'cena', 'snack')),
logged_at TIMESTAMPTZ DEFAULT now() NOT NULL,
image_path TEXT,
total_calories NUMERIC(7, 2) DEFAULT 0 NOT NULL,
total_protein NUMERIC(7, 2) DEFAULT 0 NOT NULL,
total_carbs NUMERIC(7, 2) DEFAULT 0 NOT NULL,
total_fat NUMERIC(7, 2) DEFAULT 0 NOT NULL,
notes TEXT,
created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON public.meals(user_id, logged_at DESC);
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
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);
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
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
'meal_photos',
'meal_photos',
false,
5242880,
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
CREATE TABLE IF NOT EXISTS public.barcode_products (
barcode TEXT PRIMARY KEY,
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
CREATE TABLE IF NOT EXISTS public.water_logs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
amount_ml INTEGER NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 5000),
logged_at TIMESTAMPTZ DEFAULT now() NOT NULL,
created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON public.water_logs(user_id, logged_at DESC);
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
ALTER TABLE public.barcode_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_meal_items ENABLE ROW LEVEL SECURITY;
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
DROP POLICY IF EXISTS "Users can manage own water logs" ON public.water_logs;
CREATE POLICY "Users can manage own water logs"
ON public.water_logs FOR ALL
USING (auth.uid() = user_id);
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
CREATE TABLE IF NOT EXISTS public.coach_messages (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
content TEXT NOT NULL,
context_snapshot JSONB,
created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coach_messages_user ON public.coach_messages(user_id, created_at ASC);
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
INSERT INTO public.recipe_ingredients (id, recipe_id, food_name, grams, calories, protein, carbs, fat)
SELECT md5(recipe_id || food_name)::uuid, recipe_id::uuid, food_name, grams, calories, protein, carbs, fat
FROM (VALUES
('11111111-1111-1111-1111-111111111111', 'Pechuga de pollo cocida', 180.0, 270.0, 38.0, 0.0, 4.5),
('11111111-1111-1111-1111-111111111111', 'Zapallo camote cocido', 80.0, 28.0, 1.0, 6.5, 0.2),
('11111111-1111-1111-1111-111111111111', 'Papa cocida', 80.0, 68.0, 1.5, 15.5, 0.1),
('11111111-1111-1111-1111-111111111111', 'Porotos verdes y zanahoria', 60.0, 14.0, 1.5, 10.0, 3.2),
('22222222-2222-2222-2222-222222222222', 'Carne vacuno tártaro (magra)', 140.0, 215.0, 31.0, 0.0, 6.0),
('22222222-2222-2222-2222-222222222222', 'Huevo a la plancha', 50.0, 75.0, 6.0, 0.5, 5.0),
('22222222-2222-2222-2222-222222222222', 'Puré de verduras casero (zapallo, papa, arvejas)', 150.0, 135.0, 1.0, 43.5, 0.5),
('33333333-3333-3333-3333-333333333333', 'Atún al agua en conserva', 120.0, 130.0, 28.0, 0.0, 1.2),
('33333333-3333-3333-3333-333333333333', 'Huevo entero', 50.0, 75.0, 6.0, 0.5, 5.0),
('33333333-3333-3333-3333-333333333333', 'Zapallo italiano fresco', 200.0, 34.0, 2.4, 6.2, 0.4),
('33333333-3333-3333-3333-333333333333', 'Quesillo chileno', 50.0, 56.0, 5.5, 2.0, 2.4),
('44444444-4444-4444-4444-444444444444', 'Avena tradicional', 50.0, 190.0, 6.5, 34.0, 3.5),
('44444444-4444-4444-4444-444444444444', 'Huevo entero', 50.0, 75.0, 6.0, 0.5, 5.0),
('44444444-4444-4444-4444-444444444444', 'Plátano maduro', 80.0, 72.0, 1.0, 18.5, 0.2)
) AS seed(recipe_id, food_name, grams, calories, protein, carbs, fat)
ON CONFLICT (id) DO NOTHING;
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
IF sub_record.status IN ('active', 'trialing') THEN
RETURN jsonb_build_object('allowed', true, 'is_pro', true, 'remaining', 9999);
END IF;
IF sub_record.last_scan_date < today_date THEN
UPDATE public.subscriptions
SET ai_photo_scans_today = 1, last_scan_date = today_date, updated_at = now()
WHERE user_id = target_user_id;
RETURN jsonb_build_object('allowed', true, 'is_pro', false, 'remaining', max_free_scans - 1);
END IF;
IF sub_record.ai_photo_scans_today >= max_free_scans THEN
RETURN jsonb_build_object('allowed', false, 'is_pro', false, 'remaining', 0);
END IF;
UPDATE public.subscriptions
SET ai_photo_scans_today = ai_photo_scans_today + 1, updated_at = now()
WHERE user_id = target_user_id;
RETURN jsonb_build_object('allowed', true, 'is_pro', false, 'remaining', max_free_scans - (sub_record.ai_photo_scans_today + 1));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
CREATE POLICY "Users can read own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
CREATE POLICY "Users can update own subscription"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id);
ALTER VIEW public.v_daily_totals SET (security_invoker = true);
CREATE OR REPLACE VIEW public.v_daily_water_totals WITH (security_invoker = true) AS
SELECT user_id, (logged_at AT TIME ZONE 'America/Santiago')::date AS log_date,
sum(amount_ml)::bigint AS total_ml
FROM public.water_logs
GROUP BY user_id, (logged_at AT TIME ZONE 'America/Santiago')::date;
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_one_active_per_user
ON public.goals(user_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_favorite_meal_items_parent ON public.favorite_meal_items(favorite_meal_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_parent ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_barcode_products_creator ON public.barcode_products(created_by);
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS client_request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_meals_client_request ON public.meals(user_id, client_request_id);
ALTER TABLE public.barcode_products ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.barcode_products ALTER COLUMN country DROP DEFAULT;
ALTER TABLE public.activity_logs ALTER COLUMN logged_at SET DEFAULT ((now() AT TIME ZONE 'America/Santiago')::date);
ALTER TABLE public.subscriptions ALTER COLUMN last_scan_date SET DEFAULT ((now() AT TIME ZONE 'America/Santiago')::date);
ALTER TABLE public.barcode_products ADD CONSTRAINT barcode_products_valid_values CHECK (
barcode ~ '^[0-9]{8,14}$' AND serving_size_g > 0 AND calories_per_100g >= 0
AND protein_per_100g >= 0 AND carbs_per_100g >= 0 AND fat_per_100g >= 0);
ALTER TABLE public.recipes ADD CONSTRAINT recipes_valid_values CHECK (
servings > 0 AND prep_time_minutes >= 0 AND calories_per_serving >= 0
AND protein_per_serving >= 0 AND carbs_per_serving >= 0 AND fat_per_serving >= 0);
ALTER TABLE public.recipe_ingredients ADD CONSTRAINT recipe_ingredients_valid_values CHECK (
grams > 0 AND calories >= 0 AND protein >= 0 AND carbs >= 0 AND fat >= 0);
ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_valid_values CHECK (
active_calories_burned >= 0 AND steps >= 0);
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_valid_quota CHECK (ai_photo_scans_today >= 0);
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
NEW.updated_at := now();
RETURN NEW;
END;
$$;
DO $$
DECLARE table_name text;
BEGIN
FOREACH table_name IN ARRAY ARRAY['profiles', 'goals', 'meals', 'favorite_meals', 'subscriptions'] LOOP
EXECUTE format('CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', table_name);
END LOOP;
END;
$$;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
INSERT INTO public.profiles(id, full_name)
VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', ''))
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.subscriptions(user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
RETURN NEW;
END;
$$;
INSERT INTO public.profiles(id, full_name)
SELECT id, coalesce(raw_user_meta_data->>'full_name', '') FROM auth.users
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.subscriptions(user_id) SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.lock_meal_parents()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE parent_ids uuid[];
BEGIN
IF TG_OP = 'INSERT' THEN parent_ids := ARRAY[NEW.meal_id];
ELSIF TG_OP = 'DELETE' THEN parent_ids := ARRAY[OLD.meal_id];
ELSE parent_ids := ARRAY[OLD.meal_id, NEW.meal_id]; END IF;
PERFORM id FROM public.meals WHERE id = ANY(parent_ids) ORDER BY id FOR UPDATE;
IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
RETURN NEW;
END;
$$;
CREATE TRIGGER trg_lock_meal_parents BEFORE INSERT OR UPDATE OR DELETE ON public.meal_items
FOR EACH ROW EXECUTE FUNCTION public.lock_meal_parents();
CREATE OR REPLACE FUNCTION public.recalculate_meal_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE parent_ids uuid[]; parent_id uuid;
BEGIN
IF TG_OP = 'INSERT' THEN parent_ids := ARRAY[NEW.meal_id];
ELSIF TG_OP = 'DELETE' THEN parent_ids := ARRAY[OLD.meal_id];
ELSE parent_ids := ARRAY[OLD.meal_id, NEW.meal_id]; END IF;
FOR parent_id IN SELECT DISTINCT unnest(parent_ids) LOOP
UPDATE public.meals SET
total_calories = coalesce((SELECT sum(calories) FROM public.meal_items WHERE meal_id = parent_id), 0),
total_protein = coalesce((SELECT sum(protein) FROM public.meal_items WHERE meal_id = parent_id), 0),
total_carbs = coalesce((SELECT sum(carbs) FROM public.meal_items WHERE meal_id = parent_id), 0),
total_fat = coalesce((SELECT sum(fat) FROM public.meal_items WHERE meal_id = parent_id), 0),
updated_at = now() WHERE id = parent_id;
END LOOP;
RETURN NULL;
END;
$$;
CREATE OR REPLACE FUNCTION public.save_meal(
p_meal_type text, p_items jsonb, p_image_path text DEFAULT NULL,
p_notes text DEFAULT NULL, p_logged_at timestamptz DEFAULT now(),
p_client_request_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE caller_id uuid := auth.uid(); saved public.meals; item jsonb;
BEGIN
IF caller_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
RAISE EXCEPTION 'Items must be an array' USING ERRCODE = '22023';
END IF;
IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN
RAISE EXCEPTION 'A meal must contain between 1 and 100 items' USING ERRCODE = '22023';
END IF;
IF p_image_path IS NOT NULL AND split_part(p_image_path, '/', 1) <> caller_id::text THEN
RAISE EXCEPTION 'Image belongs to another user' USING ERRCODE = '42501';
END IF;
INSERT INTO public.meals(user_id, meal_type, image_path, notes, logged_at, client_request_id)
VALUES (caller_id, p_meal_type, p_image_path, p_notes, coalesce(p_logged_at, now()), p_client_request_id)
ON CONFLICT (user_id, client_request_id) DO NOTHING RETURNING * INTO saved;
IF saved.id IS NULL THEN
SELECT * INTO saved FROM public.meals WHERE user_id = caller_id AND client_request_id = p_client_request_id;
RETURN to_jsonb(saved);
END IF;
FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
INSERT INTO public.meal_items(meal_id, food_name, grams, calories, protein, carbs, fat, confidence, ai_detected)
VALUES (saved.id, coalesce(item->>'food', item->>'food_name'),
(item->>'grams')::numeric, (item->>'calories')::numeric, (item->>'protein')::numeric,
(item->>'carbs')::numeric, (item->>'fat')::numeric, (item->>'confidence')::numeric,
coalesce((item->>'ai_detected')::boolean, false));
END LOOP;
SELECT * INTO saved FROM public.meals WHERE id = saved.id;
RETURN to_jsonb(saved);
END;
$$;
CREATE OR REPLACE FUNCTION public.set_nutrition_goals(
p_calories integer, p_protein_g integer, p_carbs_g integer, p_fat_g integer
) RETURNS public.goals LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE caller_id uuid := auth.uid(); saved public.goals;
BEGIN
IF caller_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
PERFORM id FROM public.profiles WHERE id = caller_id FOR UPDATE;
UPDATE public.goals SET is_active = false WHERE user_id = caller_id AND is_active;
INSERT INTO public.goals(user_id, calories, protein_g, carbs_g, fat_g)
VALUES (caller_id, p_calories, p_protein_g, p_carbs_g, p_fat_g) RETURNING * INTO saved;
RETURN saved;
END;
$$;
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_quota(target_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE sub public.subscriptions; today_date date := (now() AT TIME ZONE 'America/Santiago')::date;
scans integer; max_free_scans integer := 3;
BEGIN
IF auth.role() IS DISTINCT FROM 'service_role' THEN
RAISE EXCEPTION 'AI quota consumption is restricted to the backend' USING ERRCODE = '42501';
END IF;
IF target_user_id IS NULL THEN RAISE EXCEPTION 'User is required' USING ERRCODE = '22023'; END IF;
INSERT INTO public.subscriptions(user_id) VALUES (target_user_id) ON CONFLICT (user_id) DO NOTHING;
SELECT * INTO STRICT sub FROM public.subscriptions WHERE user_id = target_user_id FOR UPDATE;
IF sub.status IN ('active', 'trialing', 'canceled') AND sub.plan_id <> 'free' AND sub.current_period_end > now() THEN
RETURN jsonb_build_object('allowed', true, 'is_pro', true, 'remaining', 9999);
END IF;
scans := CASE WHEN sub.last_scan_date = today_date THEN sub.ai_photo_scans_today ELSE 0 END;
IF scans >= max_free_scans THEN
RETURN jsonb_build_object('allowed', false, 'is_pro', false, 'remaining', 0);
END IF;
UPDATE public.subscriptions SET ai_photo_scans_today = scans + 1, last_scan_date = today_date
WHERE user_id = target_user_id;
RETURN jsonb_build_object('allowed', true, 'is_pro', false, 'remaining', max_free_scans - scans - 1);
END;
$$;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated users can insert new barcode products" ON public.barcode_products;
CREATE POLICY "Authenticated users can insert new barcode products" ON public.barcode_products
FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by AND NOT verified);
DROP POLICY IF EXISTS "Users can manage own coach messages" ON public.coach_messages;
CREATE POLICY "Users can read own coach messages" ON public.coach_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own user messages" ON public.coach_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND role = 'user');
CREATE POLICY "Users can delete own coach messages" ON public.coach_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.profiles, public.goals, public.meals, public.meal_items,
public.barcode_products, public.water_logs, public.favorite_meals, public.favorite_meal_items,
public.coach_messages, public.recipes, public.recipe_ingredients, public.activity_logs,
public.subscriptions, public.v_daily_totals, public.v_daily_water_totals FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meals, public.meal_items, public.water_logs,
public.favorite_meals, public.favorite_meal_items, public.activity_logs TO authenticated;
GRANT SELECT, INSERT ON public.barcode_products TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.coach_messages TO authenticated;
GRANT SELECT ON public.recipes, public.recipe_ingredients, public.subscriptions,
public.v_daily_totals, public.v_daily_water_totals TO authenticated;
GRANT ALL ON public.profiles, public.goals, public.meals, public.meal_items,
public.barcode_products, public.water_logs, public.favorite_meals, public.favorite_meal_items,
public.coach_messages, public.recipes, public.recipe_ingredients, public.activity_logs,
public.subscriptions TO service_role;
GRANT SELECT ON public.v_daily_totals, public.v_daily_water_totals TO service_role;
REVOKE ALL ON FUNCTION public.touch_updated_at(), public.handle_new_user(),
public.lock_meal_parents(), public.recalculate_meal_totals(),
public.check_and_increment_ai_quota(uuid),
public.save_meal(text, jsonb, text, text, timestamptz, uuid),
public.set_nutrition_goals(integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_quota(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_meal(text, jsonb, text, text, timestamptz, uuid),
public.set_nutrition_goals(integer, integer, integer, integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT jsonb_build_object('tables',(SELECT count(*) FROM pg_tables WHERE schemaname='public'),'recipes',(SELECT count(*) FROM public.recipes),'ingredients',(SELECT count(*) FROM public.recipe_ingredients),'rls_tables',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity),'photo_bucket_private',(SELECT NOT public FROM storage.buckets WHERE id='meal_photos')) AS installation;
