-- Migración para soporte de unidades líquidas (g y ml) en meal_items y favorite_meal_items
-- Retrocompatible: registros existentes quedan con unit = 'g'.

ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'g'
  CHECK (unit IN ('g', 'ml'));

ALTER TABLE public.favorite_meal_items
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'g'
  CHECK (unit IN ('g', 'ml'));

-- Actualizar RPC save_meal para persistir unit
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
    INSERT INTO public.meal_items(meal_id, food_name, grams, unit, calories, protein, carbs, fat, confidence, ai_detected)
    VALUES (saved.id, coalesce(item->>'food', item->>'food_name'),
      (item->>'grams')::numeric,
      CASE WHEN (item->>'unit') IN ('g', 'ml') THEN (item->>'unit') ELSE 'g' END,
      (item->>'calories')::numeric, (item->>'protein')::numeric,
      (item->>'carbs')::numeric, (item->>'fat')::numeric, (item->>'confidence')::numeric,
      coalesce((item->>'ai_detected')::boolean, false));
  END LOOP;
  SELECT * INTO saved FROM public.meals WHERE id = saved.id;
  RETURN to_jsonb(saved);
END;
$$;

-- Actualizar RPC save_favorite para persistir unit
CREATE OR REPLACE FUNCTION public.save_favorite(p_title text, p_meal_type text, p_items jsonb)
RETURNS public.favorite_meals LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE caller uuid := auth.uid(); saved public.favorite_meals; item jsonb;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF length(trim(p_title)) NOT BETWEEN 1 AND 100 OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid favorite'; END IF;
  INSERT INTO public.favorite_meals(user_id, title, meal_type) VALUES(caller, trim(p_title), p_meal_type) RETURNING * INTO saved;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.favorite_meal_items(favorite_meal_id, food_name, grams, unit, calories, protein, carbs, fat)
      VALUES(saved.id, coalesce(item->>'food', item->>'food_name'), (item->>'grams')::numeric,
        CASE WHEN (item->>'unit') IN ('g', 'ml') THEN (item->>'unit') ELSE 'g' END,
        (item->>'calories')::numeric, (item->>'protein')::numeric, (item->>'carbs')::numeric, (item->>'fat')::numeric);
  END LOOP;
  UPDATE public.favorite_meals SET
    total_calories = (SELECT sum(calories) FROM public.favorite_meal_items WHERE favorite_meal_id = saved.id),
    total_protein = (SELECT sum(protein) FROM public.favorite_meal_items WHERE favorite_meal_id = saved.id),
    total_carbs = (SELECT sum(carbs) FROM public.favorite_meal_items WHERE favorite_meal_id = saved.id),
    total_fat = (SELECT sum(fat) FROM public.favorite_meal_items WHERE favorite_meal_id = saved.id)
    WHERE id = saved.id RETURNING * INTO saved;
  RETURN saved;
END;
$$;

-- Permitir actualizar productos propios de código de barras
GRANT UPDATE ON public.barcode_products TO authenticated;
DROP POLICY IF EXISTS "Authenticated users can update own barcode products" ON public.barcode_products;
CREATE POLICY "Authenticated users can update own barcode products" ON public.barcode_products
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid() AND NOT verified);
