-- Private personal plans, atomic onboarding/favorites and backend AI limits.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer CHECK (age BETWEEN 14 AND 100);
CREATE TABLE IF NOT EXISTS public.personal_plans (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan jsonb NOT NULL CHECK (jsonb_typeof(plan) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.personal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own personal plan" ON public.personal_plans FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.personal_plans FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.personal_plans TO authenticated;
GRANT ALL ON public.personal_plans TO service_role;

CREATE OR REPLACE FUNCTION public.complete_onboarding(p_profile jsonb, p_goals jsonb)
RETURNS public.profiles LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE caller uuid := auth.uid(); saved public.profiles;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF NOT coalesce((p_profile->>'age')::integer BETWEEN 14 AND 100
    AND (p_profile->>'height_cm')::numeric BETWEEN 100 AND 240
    AND (p_profile->>'current_weight_kg')::numeric BETWEEN 30 AND 300
    AND p_profile->>'gender' IN ('male','female','other')
    AND p_profile->>'activity_level' IN ('sedentary','light','moderate','active','very_active')
    AND p_profile->>'objective' IN ('lose_weight','maintain','gain_muscle'), false)
    THEN RAISE EXCEPTION 'Invalid profile' USING ERRCODE = '22023'; END IF;
  IF NOT coalesce((p_goals->>'calories')::integer BETWEEN 1200 AND 8000
    AND (p_goals->>'protein_g')::integer BETWEEN 20 AND 400
    AND (p_goals->>'carbs_g')::integer BETWEEN 20 AND 1600
    AND (p_goals->>'fat_g')::integer BETWEEN 15 AND 300, false)
    THEN RAISE EXCEPTION 'Invalid goals' USING ERRCODE = '22023'; END IF;
  UPDATE public.profiles SET gender = p_profile->>'gender', age = (p_profile->>'age')::integer,
    height_cm = (p_profile->>'height_cm')::numeric, current_weight_kg = (p_profile->>'current_weight_kg')::numeric,
    activity_level = p_profile->>'activity_level', objective = p_profile->>'objective'
    WHERE id = caller RETURNING * INTO saved;
  IF saved.id IS NULL THEN RAISE EXCEPTION 'Profile missing'; END IF;
  PERFORM public.set_nutrition_goals((p_goals->>'calories')::integer, (p_goals->>'protein_g')::integer,
    (p_goals->>'carbs_g')::integer, (p_goals->>'fat_g')::integer);
  RETURN saved;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_favorite(p_title text, p_meal_type text, p_items jsonb)
RETURNS public.favorite_meals LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE caller uuid := auth.uid(); saved public.favorite_meals; item jsonb;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF length(trim(p_title)) NOT BETWEEN 1 AND 100 OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid favorite'; END IF;
  INSERT INTO public.favorite_meals(user_id, title, meal_type) VALUES(caller, trim(p_title), p_meal_type) RETURNING * INTO saved;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.favorite_meal_items(favorite_meal_id, food_name, grams, calories, protein, carbs, fat)
      VALUES(saved.id, coalesce(item->>'food', item->>'food_name'), (item->>'grams')::numeric,
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

CREATE TABLE IF NOT EXISTS public.ai_request_limits (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_key date NOT NULL,
  day_count integer NOT NULL DEFAULT 0,
  minute_started_at timestamptz NOT NULL,
  minute_count integer NOT NULL DEFAULT 0
);
ALTER TABLE public.ai_request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_request_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_request_limits TO service_role;
CREATE OR REPLACE FUNCTION public.reserve_ai_request(target_user_id uuid, daily_limit integer, minute_limit integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE usage public.ai_request_limits; today date := (now() AT TIME ZONE 'America/Santiago')::date;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Backend only' USING ERRCODE = '42501'; END IF;
  IF daily_limit NOT BETWEEN 1 AND 10000 OR minute_limit NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Invalid limits'; END IF;
  INSERT INTO public.ai_request_limits(user_id, day_key, minute_started_at) VALUES(target_user_id, today, now()) ON CONFLICT DO NOTHING;
  SELECT * INTO STRICT usage FROM public.ai_request_limits WHERE user_id = target_user_id FOR UPDATE;
  IF usage.day_key <> today THEN usage.day_count := 0; END IF;
  IF usage.minute_started_at <= now() - interval '1 minute' THEN
    usage.minute_count := 0; usage.minute_started_at := now();
  END IF;
  IF usage.day_count >= daily_limit OR usage.minute_count >= minute_limit THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;
  UPDATE public.ai_request_limits SET day_key = today, day_count = usage.day_count + 1,
    minute_started_at = usage.minute_started_at, minute_count = usage.minute_count + 1 WHERE user_id = target_user_id;
  RETURN jsonb_build_object('allowed', true);
END;
$$;
REVOKE ALL ON FUNCTION public.complete_onboarding(jsonb,jsonb), public.save_favorite(text,text,jsonb),
  public.reserve_ai_request(uuid,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(jsonb,jsonb), public.save_favorite(text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_request(uuid,integer,integer) TO service_role;

-- Only a product's creator can see its unverified custom entry.
DROP POLICY IF EXISTS "Anyone can read barcode products" ON public.barcode_products;
DROP POLICY IF EXISTS "Authenticated users can read barcode products" ON public.barcode_products;
CREATE POLICY "Read verified or own barcode products" ON public.barcode_products FOR SELECT TO authenticated
  USING (verified OR created_by = auth.uid());

-- Recipe ingredient nutrients represent the entire recipe.
UPDATE public.recipes r SET
  calories_per_serving = t.calories / r.servings, protein_per_serving = t.protein / r.servings,
  carbs_per_serving = t.carbs / r.servings, fat_per_serving = t.fat / r.servings
FROM (SELECT recipe_id, sum(calories) calories, sum(protein) protein, sum(carbs) carbs, sum(fat) fat
      FROM public.recipe_ingredients GROUP BY recipe_id) t WHERE r.id = t.recipe_id;
NOTIFY pgrst, 'reload schema';
-- Bound direct writes as well as RPC calls (Postgres numeric NaN exceeds the maximum).
ALTER TABLE public.meal_items ADD CONSTRAINT meal_items_bounded CHECK (grams BETWEEN 0 AND 20000 AND calories BETWEEN 0 AND 50000 AND protein BETWEEN 0 AND 10000 AND carbs BETWEEN 0 AND 10000 AND fat BETWEEN 0 AND 10000);
ALTER TABLE public.favorite_meal_items ADD CONSTRAINT favorite_items_bounded CHECK (grams BETWEEN 0 AND 20000 AND calories BETWEEN 0 AND 50000 AND protein BETWEEN 0 AND 10000 AND carbs BETWEEN 0 AND 10000 AND fat BETWEEN 0 AND 10000);
ALTER TABLE public.goals ADD CONSTRAINT goals_bounded CHECK (calories BETWEEN 1200 AND 8000 AND protein_g BETWEEN 20 AND 400 AND carbs_g BETWEEN 20 AND 1600 AND fat_g BETWEEN 15 AND 300) NOT VALID;
-- Older projects may have a Vault helper created outside migrations. Never expose secrets to browsers.
DO $$
BEGIN
  IF to_regprocedure('public.get_vault_secret(text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.get_vault_secret(text) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.get_vault_secret(text) TO service_role;
  END IF;
END;
$$;
