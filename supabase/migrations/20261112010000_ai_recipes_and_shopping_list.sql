-- ============================================================================
-- Migración: Recetas IA privadas (user_recipes) y Lista de Compras Inteligente
-- Fecha: 2026-11-12
-- ============================================================================

-- ============================================================================
-- 1. TABLA USER_RECIPES (Biblioteca privada de recetas generadas por IA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 120),
  description text,
  meal_type text NOT NULL CHECK (meal_type IN ('desayuno', 'almuerzo', 'cena', 'snack')),
  prep_time_minutes integer NOT NULL DEFAULT 20 CHECK (prep_time_minutes BETWEEN 1 AND 300),
  servings integer NOT NULL DEFAULT 1 CHECK (servings BETWEEN 1 AND 12),
  calories_per_serving numeric(7, 2) NOT NULL CHECK (calories_per_serving >= 0),
  protein_per_serving numeric(7, 2) NOT NULL CHECK (protein_per_serving >= 0),
  carbs_per_serving numeric(7, 2) NOT NULL CHECK (carbs_per_serving >= 0),
  fat_per_serving numeric(7, 2) NOT NULL CHECK (fat_per_serving >= 0),
  ingredients jsonb NOT NULL CHECK (
    jsonb_typeof(ingredients) = 'array'
    AND jsonb_array_length(ingredients) BETWEEN 1 AND 30
  ),
  instructions text[] NOT NULL CHECK (
    coalesce(array_length(instructions, 1), 0) BETWEEN 1 AND 20
  ),
  prompt_context jsonb CHECK (prompt_context IS NULL OR jsonb_typeof(prompt_context) = 'object'),
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_recipes_user_created
  ON public.user_recipes (user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_touch_updated_at ON public.user_recipes;
CREATE TRIGGER trg_touch_updated_at
  BEFORE UPDATE ON public.user_recipes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own recipes" ON public.user_recipes;
CREATE POLICY "Users can read own recipes"
  ON public.user_recipes FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own recipes" ON public.user_recipes;
CREATE POLICY "Users can insert own recipes"
  ON public.user_recipes FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own recipes" ON public.user_recipes;
CREATE POLICY "Users can update own recipes"
  ON public.user_recipes FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own recipes" ON public.user_recipes;
CREATE POLICY "Users can delete own recipes"
  ON public.user_recipes FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.user_recipes FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_recipes TO authenticated;
GRANT ALL ON public.user_recipes TO service_role;

-- ============================================================================
-- 2. TABLA SHOPPING_LIST_ITEMS (Lista activa única sincronizada)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  normalized_key text NOT NULL CHECK (char_length(trim(normalized_key)) BETWEEN 1 AND 100),
  quantity numeric(8, 2) NOT NULL CHECK (quantity > 0 AND quantity <= 999999),
  unit text NOT NULL DEFAULT 'g' CHECK (unit IN ('g', 'ml', 'unidad')),
  category text NOT NULL DEFAULT 'otros' CHECK (
    category IN (
      'verduras_frutas',
      'proteinas',
      'lacteos_huevos',
      'despensa_granos',
      'condimentos_aceites',
      'otros'
    )
  ),
  checked boolean NOT NULL DEFAULT false,
  source_recipes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, normalized_key, unit)
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_user_state
  ON public.shopping_list_items (user_id, checked, category, created_at DESC);

DROP TRIGGER IF EXISTS trg_touch_updated_at ON public.shopping_list_items;
CREATE TRIGGER trg_touch_updated_at
  BEFORE UPDATE ON public.shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own shopping list" ON public.shopping_list_items;
CREATE POLICY "Users can read own shopping list"
  ON public.shopping_list_items FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own shopping list" ON public.shopping_list_items;
CREATE POLICY "Users can insert own shopping list"
  ON public.shopping_list_items FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own shopping list" ON public.shopping_list_items;
CREATE POLICY "Users can update own shopping list"
  ON public.shopping_list_items FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own shopping list" ON public.shopping_list_items;
CREATE POLICY "Users can delete own shopping list"
  ON public.shopping_list_items FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.shopping_list_items FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_list_items TO authenticated;
GRANT ALL ON public.shopping_list_items TO service_role;

-- ============================================================================
-- 3. RPC ATÓMICO DE FUSIÓN DE INGREDIENTES EN LISTA DE COMPRAS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_shopping_list_items(p_items jsonb)
RETURNS SETOF public.shopping_list_items
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_item jsonb;
  v_name text;
  v_key text;
  v_quantity numeric(8, 2);
  v_unit text;
  v_category text;
  v_source text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida' USING ERRCODE = '42501';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'p_items debe contener entre 1 y 50 ingredientes' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'Cada ingrediente debe ser un objeto JSON' USING ERRCODE = '22023';
    END IF;

    v_name := left(regexp_replace(trim(coalesce(v_item->>'name', '')), '\s+', ' ', 'g'), 100);
    v_key := left(regexp_replace(trim(coalesce(v_item->>'normalized_key', '')), '\s+', ' ', 'g'), 100);
    IF v_name = '' OR v_key = '' THEN
      RAISE EXCEPTION 'Nombre y clave normalizada requeridos' USING ERRCODE = '22023';
    END IF;

    v_quantity := round((v_item->>'quantity')::numeric, 2);
    IF v_quantity IS NULL OR v_quantity <= 0 OR v_quantity > 999999 THEN
      RAISE EXCEPTION 'Cantidad inválida para %', v_name USING ERRCODE = '22023';
    END IF;

    v_unit := coalesce(v_item->>'unit', 'g');
    IF v_unit NOT IN ('g', 'ml', 'unidad') THEN
      RAISE EXCEPTION 'Unidad inválida: %', v_unit USING ERRCODE = '22023';
    END IF;

    v_category := coalesce(v_item->>'category', 'otros');
    IF v_category NOT IN (
      'verduras_frutas',
      'proteinas',
      'lacteos_huevos',
      'despensa_granos',
      'condimentos_aceites',
      'otros'
    ) THEN
      v_category := 'otros';
    END IF;

    v_source := NULLIF(left(regexp_replace(trim(coalesce(v_item->>'source_recipe', '')), '\s+', ' ', 'g'), 120), '');

    INSERT INTO public.shopping_list_items AS s (
      user_id, name, normalized_key, quantity, unit, category, checked, source_recipes
    )
    VALUES (
      v_user_id,
      v_name,
      v_key,
      v_quantity,
      v_unit,
      v_category,
      false,
      CASE WHEN v_source IS NOT NULL THEN ARRAY[v_source] ELSE '{}'::text[] END
    )
    ON CONFLICT (user_id, normalized_key, unit) DO UPDATE SET
      name = EXCLUDED.name,
      category = CASE WHEN s.category = 'otros' THEN EXCLUDED.category ELSE s.category END,
      quantity = CASE
        WHEN s.checked THEN EXCLUDED.quantity
        ELSE LEAST(999999, round(s.quantity + EXCLUDED.quantity, 2))
      END,
      checked = false,
      source_recipes = CASE
        WHEN array_length(EXCLUDED.source_recipes, 1) IS NULL THEN s.source_recipes
        WHEN EXCLUDED.source_recipes[1] = ANY(s.source_recipes) THEN s.source_recipes
        ELSE (s.source_recipes || EXCLUDED.source_recipes)[1:10]
      END,
      updated_at = now();
  END LOOP;

  RETURN QUERY
  SELECT *
  FROM public.shopping_list_items
  WHERE user_id = v_user_id
  ORDER BY checked ASC, category ASC, created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_shopping_list_items(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_shopping_list_items(jsonb) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
