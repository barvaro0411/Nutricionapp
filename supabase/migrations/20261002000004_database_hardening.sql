-- Security and transactional operations for the application database.
-- All monetary entitlements and AI quota consumption are server-owned.

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

-- Lock parents before changing items, serializing recalculation under concurrency.
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

-- Replace permissive policies on server-managed data.
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated users can insert new barcode products" ON public.barcode_products;
CREATE POLICY "Authenticated users can insert new barcode products" ON public.barcode_products
FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by AND NOT verified);
DROP POLICY IF EXISTS "Users can manage own coach messages" ON public.coach_messages;
CREATE POLICY "Users can read own coach messages" ON public.coach_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own user messages" ON public.coach_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND role = 'user');
CREATE POLICY "Users can delete own coach messages" ON public.coach_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Explicit privileges: RLS governs rows; grants govern allowed operations.
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
