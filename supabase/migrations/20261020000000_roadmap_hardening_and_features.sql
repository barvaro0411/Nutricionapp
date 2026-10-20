-- ============================================================================
-- Migración: Hardening de Trial/Cuota, Procedencia Catálogo Chileno,
--            Tabla weight_logs con RLS, Consentimiento IA y Eliminación de Cuenta
-- Fecha: 2026-10-20
-- ============================================================================

-- ============================================================================
-- 1. TRIAL CONTROLADO EN SERVIDOR Y CUOTA DE IA
-- ============================================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;

CREATE OR REPLACE FUNCTION public.activate_free_trial(
  p_plan_id text DEFAULT 'pro_annual_clp'
)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
  sub public.subscriptions;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para activar tu prueba gratuita.' USING ERRCODE = '42501';
  END IF;

  IF p_plan_id NOT IN ('pro_monthly_clp', 'pro_annual_clp') THEN
    RAISE EXCEPTION 'Plan de suscripción no válido.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.subscriptions(user_id)
  VALUES (caller_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO STRICT sub
  FROM public.subscriptions
  WHERE user_id = caller_id
  FOR UPDATE;

  IF sub.status IN ('active', 'trialing') AND sub.plan_id <> 'free' AND sub.current_period_end > now() THEN
    RAISE EXCEPTION 'Ya tienes una suscripción o prueba Pro activa.' USING ERRCODE = 'P0001';
  END IF;

  IF sub.trial_started_at IS NOT NULL THEN
    RAISE EXCEPTION 'Ya utilizaste tu prueba gratuita de 7 días en esta cuenta.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.subscriptions
  SET status = 'trialing',
      plan_id = p_plan_id,
      trial_started_at = now(),
      current_period_end = now() + interval '7 days',
      updated_at = now()
  WHERE user_id = caller_id
  RETURNING * INTO sub;

  RETURN sub;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_increment_ai_quota(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_role text := auth.role();
  caller_id uuid := auth.uid();
  sub public.subscriptions;
  today_date date := (now() AT TIME ZONE 'America/Santiago')::date;
  scans integer;
  max_free_scans integer := 3;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User is required' USING ERRCODE = '22023';
  END IF;

  IF caller_role IS DISTINCT FROM 'service_role' AND (caller_role IS DISTINCT FROM 'authenticated' OR caller_id IS DISTINCT FROM target_user_id) THEN
    RAISE EXCEPTION 'No autorizado para consultar o modificar la cuota de otro usuario.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.subscriptions(user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO STRICT sub
  FROM public.subscriptions
  WHERE user_id = target_user_id
  FOR UPDATE;

  IF sub.status IN ('active', 'trialing', 'canceled')
     AND sub.plan_id <> 'free'
     AND sub.current_period_end IS NOT NULL
     AND sub.current_period_end > now() THEN
    RETURN jsonb_build_object('allowed', true, 'is_pro', true, 'remaining', 9999);
  END IF;

  scans := CASE WHEN sub.last_scan_date = today_date THEN sub.ai_photo_scans_today ELSE 0 END;

  IF scans >= max_free_scans THEN
    IF sub.last_scan_date <> today_date THEN
      UPDATE public.subscriptions
      SET ai_photo_scans_today = 0, last_scan_date = today_date, updated_at = now()
      WHERE user_id = target_user_id;
    END IF;
    RETURN jsonb_build_object('allowed', false, 'is_pro', false, 'remaining', 0);
  END IF;

  UPDATE public.subscriptions
  SET ai_photo_scans_today = scans + 1,
      last_scan_date = today_date,
      updated_at = now()
  WHERE user_id = target_user_id;

  RETURN jsonb_build_object('allowed', true, 'is_pro', false, 'remaining', max_free_scans - scans - 1);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_free_trial(text), public.check_and_increment_ai_quota(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_free_trial(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_quota(uuid) TO authenticated, service_role;

-- ============================================================================
-- 2. PROCEDENCIA DEL CATÁLOGO LOCAL CHILENO Y USDA EN NUTRITION_REFERENCE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.valid_nutrition_reference(reference jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT reference IS NULL OR coalesce(
    jsonb_typeof(reference) = 'object'
    AND reference->>'source' IN ('USDA FoodData Central', 'Catálogo Chileno')
    AND jsonb_typeof(reference->'fdc_id') = 'number'
    AND (reference->>'fdc_id') ~ '^[1-9][0-9]{0,9}$'
    AND jsonb_typeof(reference->'description') = 'string'
    AND length(reference->>'description') BETWEEN 1 AND 500
    AND (NOT reference ? 'data_type' OR (jsonb_typeof(reference->'data_type') = 'string' AND length(reference->>'data_type') <= 100))
    AND (NOT reference ? 'basis' OR reference->>'basis' IN ('100g', '100ml')),
    false
  );
$$;

-- ============================================================================
-- 3. TABLA WEIGHT_LOGS CON RLS Y META DE PESO EN PROFILES
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_weight_kg numeric(5,1) CHECK (target_weight_kg BETWEEN 30 AND 300),
  ADD COLUMN IF NOT EXISTS ai_consent_at timestamptz;

CREATE TABLE IF NOT EXISTS public.weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  logged_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Santiago')::date),
  weight_kg numeric(5,1) NOT NULL CHECK (weight_kg BETWEEN 30 AND 300),
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, logged_date)
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date
  ON public.weight_logs(user_id, logged_date DESC);

DROP TRIGGER IF EXISTS trg_touch_updated_at ON public.weight_logs;
CREATE TRIGGER trg_touch_updated_at
  BEFORE UPDATE ON public.weight_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own weight logs" ON public.weight_logs;
CREATE POLICY "Users can read own weight logs"
  ON public.weight_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own weight logs" ON public.weight_logs;
CREATE POLICY "Users can insert own weight logs"
  ON public.weight_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own weight logs" ON public.weight_logs;
CREATE POLICY "Users can update own weight logs"
  ON public.weight_logs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own weight logs" ON public.weight_logs;
CREATE POLICY "Users can delete own weight logs"
  ON public.weight_logs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.weight_logs FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_logs TO authenticated;
GRANT ALL ON public.weight_logs TO service_role;

-- ============================================================================
-- 4. ELIMINACIÓN DE CUENTA PROPIA (CUMPLIMIENTO PRIVACIDAD Y TIENDAS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
  deleted_photos integer := 0;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida para eliminar la cuenta.' USING ERRCODE = '42501';
  END IF;

  -- 1. Eliminar fotos privadas del bucket meal_photos pertenecientes al usuario
  WITH removed AS (
    DELETE FROM storage.objects
    WHERE bucket_id = 'meal_photos'
      AND split_part(name, '/', 1) = caller_id::text
    RETURNING id
  )
  SELECT count(*) INTO deleted_photos FROM removed;

  -- 2. Registrar evento de eliminación en auditoría interna sin datos personales identificables
  IF to_regclass('app_private.audit_logs') IS NOT NULL THEN
    INSERT INTO app_private.audit_logs (user_id, action, table_name, record_id, details)
    VALUES (
      caller_id,
      'delete_own_account',
      'auth.users',
      caller_id::text,
      jsonb_build_object('deleted_photos', deleted_photos, 'deleted_at', now())
    );
  END IF;

  -- 3. Eliminar usuario de auth.users (propaga ON DELETE CASCADE a profiles y tablas hijas)
  DELETE FROM auth.users WHERE id = caller_id;

  RETURN jsonb_build_object('success', true, 'deleted_photos', deleted_photos);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
