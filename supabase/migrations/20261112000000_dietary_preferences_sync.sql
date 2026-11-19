-- ============================================================================
-- Migración: Sincronización de Restricciones Dietéticas y Alergias en Profiles
-- Fecha: 2026-11-12
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dietary_restrictions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_allergies text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_dietary_restrictions_valid;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_dietary_restrictions_valid CHECK (
  dietary_restrictions IS NOT NULL
  AND array_position(dietary_restrictions, NULL) IS NULL
  AND dietary_restrictions <@ ARRAY[
    'lactose_intolerance',
    'celiac_gluten',
    'vegan',
    'vegetarian',
    'low_sodium',
    'low_sugar',
    'nut_allergy',
    'seafood_allergy'
  ]::text[]
  AND coalesce(array_length(dietary_restrictions, 1), 0) <= 8
);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_custom_allergies_bounded;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_custom_allergies_bounded CHECK (
  custom_allergies IS NOT NULL
  AND array_position(custom_allergies, NULL) IS NULL
  AND coalesce(array_length(custom_allergies, 1), 0) <= 15
);

CREATE OR REPLACE FUNCTION public.validate_profile_dietary_preferences()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_item text;
  v_cleaned text;
  v_seen text[] := '{}';
  v_allergies text[] := '{}';
  v_restrictions text[] := '{}';
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.dietary_restrictions IS NOT DISTINCT FROM OLD.dietary_restrictions
     AND NEW.custom_allergies IS NOT DISTINCT FROM OLD.custom_allergies THEN
    RETURN NEW;
  END IF;

  IF NEW.dietary_restrictions IS NULL THEN
    NEW.dietary_restrictions := '{}';
  ELSE
    FOREACH v_item IN ARRAY NEW.dietary_restrictions LOOP
      IF v_item IS NOT NULL AND NOT (v_item = ANY(v_restrictions)) THEN
        v_restrictions := array_append(v_restrictions, v_item);
      END IF;
    END LOOP;
    NEW.dietary_restrictions := v_restrictions;
  END IF;

  IF NEW.custom_allergies IS NULL THEN
    NEW.custom_allergies := '{}';
  ELSE
    FOREACH v_item IN ARRAY NEW.custom_allergies LOOP
      IF v_item IS NULL THEN
        CONTINUE;
      END IF;
      v_cleaned := regexp_replace(trim(v_item), '\s+', ' ', 'g');
      IF length(v_cleaned) = 0 THEN
        CONTINUE;
      END IF;
      IF length(v_cleaned) > 60 THEN
        RAISE EXCEPTION 'Cada alergia o preferencia personalizada debe tener máximo 60 caracteres.'
          USING ERRCODE = '22023';
      END IF;
      IF NOT (lower(v_cleaned) = ANY(v_seen)) THEN
        v_seen := array_append(v_seen, lower(v_cleaned));
        v_allergies := array_append(v_allergies, v_cleaned);
      END IF;
    END LOOP;

    IF coalesce(array_length(v_allergies, 1), 0) > 15 THEN
      RAISE EXCEPTION 'Puedes registrar hasta 15 alergias o alimentos a evitar.'
        USING ERRCODE = '22023';
    END IF;
    NEW.custom_allergies := v_allergies;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_dietary_preferences ON public.profiles;
CREATE TRIGGER trg_validate_profile_dietary_preferences
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_dietary_preferences();

CREATE OR REPLACE FUNCTION public.complete_onboarding(p_profile jsonb, p_goals jsonb)
RETURNS public.profiles
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  caller uuid := auth.uid();
  saved public.profiles;
  has_restrictions boolean := (p_profile ? 'dietary_restrictions');
  has_allergies boolean := (p_profile ? 'custom_allergies');
  v_restrictions text[] := '{}';
  v_allergies text[] := '{}';
  v_item text;
  v_allowed text[] := ARRAY[
    'lactose_intolerance',
    'celiac_gluten',
    'vegan',
    'vegetarian',
    'low_sodium',
    'low_sugar',
    'nut_allergy',
    'seafood_allergy'
  ]::text[];
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT coalesce((p_profile->>'age')::integer BETWEEN 14 AND 100
    AND (p_profile->>'height_cm')::numeric BETWEEN 100 AND 240
    AND (p_profile->>'current_weight_kg')::numeric BETWEEN 30 AND 300
    AND p_profile->>'gender' IN ('male','female','other')
    AND p_profile->>'activity_level' IN ('sedentary','light','moderate','active','very_active')
    AND p_profile->>'objective' IN ('lose_weight','maintain','gain_muscle'), false)
  THEN
    RAISE EXCEPTION 'Invalid profile' USING ERRCODE = '22023';
  END IF;

  IF NOT coalesce((p_goals->>'calories')::integer BETWEEN 1200 AND 8000
    AND (p_goals->>'protein_g')::integer BETWEEN 20 AND 400
    AND (p_goals->>'carbs_g')::integer BETWEEN 20 AND 1600
    AND (p_goals->>'fat_g')::integer BETWEEN 15 AND 300, false)
  THEN
    RAISE EXCEPTION 'Invalid goals' USING ERRCODE = '22023';
  END IF;

  IF has_restrictions THEN
    IF jsonb_typeof(p_profile->'dietary_restrictions') <> 'array' THEN
      RAISE EXCEPTION 'Invalid dietary restrictions' USING ERRCODE = '22023';
    END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements_text(p_profile->'dietary_restrictions') LOOP
      IF NOT (v_item = ANY(v_allowed)) THEN
        RAISE EXCEPTION 'Invalid dietary restriction code: %', v_item USING ERRCODE = '22023';
      END IF;
      IF NOT (v_item = ANY(v_restrictions)) THEN
        v_restrictions := array_append(v_restrictions, v_item);
      END IF;
    END LOOP;
  END IF;

  IF has_allergies THEN
    IF jsonb_typeof(p_profile->'custom_allergies') <> 'array' THEN
      RAISE EXCEPTION 'Invalid custom allergies' USING ERRCODE = '22023';
    END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements_text(p_profile->'custom_allergies') LOOP
      v_item := regexp_replace(trim(coalesce(v_item, '')), '\s+', ' ', 'g');
      IF length(v_item) > 0 THEN
        IF length(v_item) > 60 THEN
          RAISE EXCEPTION 'Custom allergy exceeds 60 characters' USING ERRCODE = '22023';
        END IF;
        v_allergies := array_append(v_allergies, v_item);
      END IF;
    END LOOP;
    IF coalesce(array_length(v_allergies, 1), 0) > 15 THEN
      RAISE EXCEPTION 'Too many custom allergies' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.profiles
  SET gender = p_profile->>'gender',
      age = (p_profile->>'age')::integer,
      height_cm = (p_profile->>'height_cm')::numeric,
      current_weight_kg = (p_profile->>'current_weight_kg')::numeric,
      activity_level = p_profile->>'activity_level',
      objective = p_profile->>'objective',
      dietary_restrictions = CASE WHEN has_restrictions THEN v_restrictions ELSE dietary_restrictions END,
      custom_allergies = CASE WHEN has_allergies THEN v_allergies ELSE custom_allergies END
  WHERE id = caller
  RETURNING * INTO saved;

  IF saved.id IS NULL THEN
    RAISE EXCEPTION 'Profile missing';
  END IF;

  PERFORM public.set_nutrition_goals(
    (p_goals->>'calories')::integer,
    (p_goals->>'protein_g')::integer,
    (p_goals->>'carbs_g')::integer,
    (p_goals->>'fat_g')::integer
  );

  RETURN saved;
END;
$$;

NOTIFY pgrst, 'reload schema';
