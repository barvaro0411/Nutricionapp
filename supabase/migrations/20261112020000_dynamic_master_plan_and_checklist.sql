-- ============================================================================
-- Migración: Plan Maestro Dinámico (autogestión + sync metas) y Checklist Diario Persistente
-- Fecha: 2026-11-12
-- ============================================================================

-- ============================================================================
-- 1. PERSONAL_PLANS: RLS completa para autogestión + trigger updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS trg_touch_updated_at ON public.personal_plans;
CREATE TRIGGER trg_touch_updated_at
  BEFORE UPDATE ON public.personal_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP POLICY IF EXISTS "Read own personal plan" ON public.personal_plans;
CREATE POLICY "Read own personal plan"
  ON public.personal_plans FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own personal plan" ON public.personal_plans;
CREATE POLICY "Users can insert own personal plan"
  ON public.personal_plans FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own personal plan" ON public.personal_plans;
CREATE POLICY "Users can update own personal plan"
  ON public.personal_plans FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own personal plan" ON public.personal_plans;
CREATE POLICY "Users can delete own personal plan"
  ON public.personal_plans FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.personal_plans FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_plans TO authenticated;
GRANT ALL ON public.personal_plans TO service_role;

-- ============================================================================
-- 2. RPC ATÓMICA: save_personal_plan(p_plan jsonb, p_sync_goals boolean)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.save_personal_plan(
  p_plan jsonb,
  p_sync_goals boolean DEFAULT true
)
RETURNS public.personal_plans
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
  saved public.personal_plans;
  std_obj jsonb;
  match_obj jsonb;
  std_cal integer;
  std_prot integer;
  std_carbs integer;
  std_fat integer;
  match_cal integer;
  match_prot integer;
  match_carbs integer;
  match_fat integer;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para guardar tu plan personal.' USING ERRCODE = '42501';
  END IF;

  IF p_plan IS NULL OR jsonb_typeof(p_plan) <> 'object' THEN
    RAISE EXCEPTION 'El plan personal debe ser un objeto JSON válido.' USING ERRCODE = '22023';
  END IF;

  IF length(trim(coalesce(p_plan->'user'->>'objectiveTitle', ''))) NOT BETWEEN 1 AND 160 THEN
    RAISE EXCEPTION 'El plan personal requiere un título de objetivo válido.' USING ERRCODE = '22023';
  END IF;

  std_obj := p_plan->'dailyGoals'->'standard';
  IF std_obj IS NULL OR jsonb_typeof(std_obj) <> 'object' THEN
    RAISE EXCEPTION 'Faltan las metas estándar del plan personal.' USING ERRCODE = '22023';
  END IF;

  BEGIN
    std_cal := round((std_obj->>'calories')::numeric)::integer;
    std_prot := round((std_obj->>'proteinG')::numeric)::integer;
    std_carbs := round((std_obj->>'carbsG')::numeric)::integer;
    std_fat := round((std_obj->>'fatG')::numeric)::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'Las metas estándar contienen valores numéricos inválidos.' USING ERRCODE = '22023';
  END;

  IF NOT coalesce(
    std_cal BETWEEN 800 AND 8000
    AND std_prot BETWEEN 10 AND 400
    AND std_carbs BETWEEN 10 AND 1600
    AND std_fat BETWEEN 5 AND 300,
    false
  ) THEN
    RAISE EXCEPTION 'Las metas estándar están fuera de los rangos permitidos.' USING ERRCODE = '22023';
  END IF;

  match_obj := p_plan->'dailyGoals'->'matchDay';
  IF match_obj IS NOT NULL AND jsonb_typeof(match_obj) = 'object' THEN
    BEGIN
      match_cal := round((match_obj->>'calories')::numeric)::integer;
      match_prot := round((match_obj->>'proteinG')::numeric)::integer;
      match_carbs := round((match_obj->>'carbsG')::numeric)::integer;
      match_fat := round((match_obj->>'fatG')::numeric)::integer;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Las metas de día de carga contienen valores numéricos inválidos.' USING ERRCODE = '22023';
    END;

    IF NOT coalesce(
      match_cal BETWEEN 800 AND 8000
      AND match_prot BETWEEN 10 AND 400
      AND match_carbs BETWEEN 10 AND 1600
      AND match_fat BETWEEN 5 AND 300,
      false
    ) THEN
      RAISE EXCEPTION 'Las metas de día de carga están fuera de los rangos permitidos.' USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.personal_plans (user_id, plan, updated_at)
  VALUES (caller_id, p_plan, now())
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        updated_at = now()
  RETURNING * INTO saved;

  IF coalesce(p_sync_goals, true) THEN
    PERFORM public.set_nutrition_goals(std_cal, std_prot, std_carbs, std_fat);
  END IF;

  RETURN saved;
END;
$$;

REVOKE ALL ON FUNCTION public.save_personal_plan(jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_personal_plan(jsonb, boolean) TO authenticated;

-- ============================================================================
-- 3. TABLA PLAN_DAILY_CHECKLISTS (Cumplimiento diario persistente por fecha)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plan_daily_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  checked_items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
    jsonb_typeof(checked_items) = 'array'
    AND jsonb_array_length(checked_items) <= 50
  ),
  total_items integer NOT NULL DEFAULT 0 CHECK (total_items BETWEEN 0 AND 50),
  completed_count integer NOT NULL DEFAULT 0 CHECK (completed_count BETWEEN 0 AND total_items),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_plan_daily_checklists_user_date
  ON public.plan_daily_checklists (user_id, plan_date DESC);

DROP TRIGGER IF EXISTS trg_touch_updated_at ON public.plan_daily_checklists;
CREATE TRIGGER trg_touch_updated_at
  BEFORE UPDATE ON public.plan_daily_checklists
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.plan_daily_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own daily checklists" ON public.plan_daily_checklists;
CREATE POLICY "Users can read own daily checklists"
  ON public.plan_daily_checklists FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own daily checklists" ON public.plan_daily_checklists;
CREATE POLICY "Users can insert own daily checklists"
  ON public.plan_daily_checklists FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own daily checklists" ON public.plan_daily_checklists;
CREATE POLICY "Users can update own daily checklists"
  ON public.plan_daily_checklists FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own daily checklists" ON public.plan_daily_checklists;
CREATE POLICY "Users can delete own daily checklists"
  ON public.plan_daily_checklists FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.plan_daily_checklists FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_daily_checklists TO authenticated;
GRANT ALL ON public.plan_daily_checklists TO service_role;
