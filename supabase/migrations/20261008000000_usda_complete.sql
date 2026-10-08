-- Keep USDA provenance with meals and favorites; existing records remain unchanged.
CREATE OR REPLACE FUNCTION public.valid_nutrition_reference(reference jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT reference IS NULL OR coalesce(
    jsonb_typeof(reference) = 'object'
    AND reference->>'source' = 'USDA FoodData Central'
    AND jsonb_typeof(reference->'fdc_id') = 'number'
    AND (reference->>'fdc_id') ~ '^[1-9][0-9]{0,9}$'
    AND jsonb_typeof(reference->'description') = 'string'
    AND length(reference->>'description') BETWEEN 1 AND 500
    AND (NOT reference ? 'data_type' OR (jsonb_typeof(reference->'data_type') = 'string' AND length(reference->>'data_type') <= 100))
    AND (NOT reference ? 'basis' OR reference->>'basis' IN ('100g', '100ml')), false);
$$;
ALTER TABLE public.meal_items ADD COLUMN IF NOT EXISTS nutrition_reference jsonb
  CHECK (public.valid_nutrition_reference(nutrition_reference));
ALTER TABLE public.favorite_meal_items ADD COLUMN IF NOT EXISTS nutrition_reference jsonb
  CHECK (public.valid_nutrition_reference(nutrition_reference));

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
    INSERT INTO public.meal_items(meal_id, food_name, grams, unit, calories, protein, carbs, fat, confidence, ai_detected, nutrition_reference)
    VALUES (saved.id, coalesce(item->>'food', item->>'food_name'),
      (item->>'grams')::numeric,
      CASE WHEN (item->>'unit') IN ('g', 'ml') THEN (item->>'unit') ELSE 'g' END,
      (item->>'calories')::numeric, (item->>'protein')::numeric,
      (item->>'carbs')::numeric, (item->>'fat')::numeric, (item->>'confidence')::numeric,
      coalesce((item->>'ai_detected')::boolean, false), NULLIF(item->'nutrition_reference', 'null'::jsonb));
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
    INSERT INTO public.favorite_meal_items(favorite_meal_id, food_name, grams, unit, calories, protein, carbs, fat, nutrition_reference)
      VALUES(saved.id, coalesce(item->>'food', item->>'food_name'), (item->>'grams')::numeric,
        CASE WHEN (item->>'unit') IN ('g', 'ml') THEN (item->>'unit') ELSE 'g' END,
        (item->>'calories')::numeric, (item->>'protein')::numeric, (item->>'carbs')::numeric, (item->>'fat')::numeric, NULLIF(item->'nutrition_reference', 'null'::jsonb));
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

