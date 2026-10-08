-- Pruebas reales del guardado bajo el rol de usuario; todo se revierte al finalizar.
BEGIN;
SET LOCAL statement_timeout = '20s';
DO $$
DECLARE caller uuid;
BEGIN
  SELECT id INTO caller FROM public.profiles LIMIT 1;
  IF caller IS NULL THEN RAISE EXCEPTION 'A profile is required for the transactional test'; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub',caller,'role','authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', caller::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
END;
$$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE request_id uuid := gen_random_uuid(); saved jsonb; repeated jsonb;
  favorite public.favorite_meals; solid jsonb; denied boolean := false; rejected boolean := false;
  items jsonb := '[{"food":"Aquarius","grams":250,"unit":"ml","calories":110,"protein":0,"carbs":27.5,"fat":0,"confidence":1}]'::jsonb;
BEGIN
  saved := public.save_meal('snack',items,NULL,'Verificación con rollback','2026-10-05T15:00:00Z',request_id);
  IF NOT EXISTS(SELECT 1 FROM public.meal_items WHERE meal_id=(saved->>'id')::uuid AND unit='ml' AND grams=250 AND calories=110) THEN
    RAISE EXCEPTION 'Liquid quantity or nutrients not preserved';
  END IF;
  IF (saved->>'total_calories')::numeric <> 110 OR (saved->>'logged_at')::timestamptz AT TIME ZONE 'America/Santiago' <> '2026-10-05 12:00:00'::timestamp THEN
    RAISE EXCEPTION 'Meal totals or selected date incorrect';
  END IF;
  repeated := public.save_meal('snack',items,NULL,NULL,'2026-10-05T15:00:00Z',request_id);
  IF saved->>'id' <> repeated->>'id' OR (SELECT count(*) FROM public.meal_items WHERE meal_id=(saved->>'id')::uuid) <> 1 THEN
    RAISE EXCEPTION 'Retry duplicated the meal';
  END IF;
  favorite := public.save_favorite('Verificación con rollback','snack',items);
  IF NOT EXISTS(SELECT 1 FROM public.favorite_meal_items WHERE favorite_meal_id=favorite.id AND unit='ml' AND grams=250) OR favorite.total_calories <> 110 THEN
    RAISE EXCEPTION 'Favorite unit or totals incorrect';
  END IF;
  solid := public.save_meal('snack','[{"food":"Pan","grams":100,"calories":250,"protein":8,"carbs":45,"fat":3}]'::jsonb);
  IF NOT EXISTS(SELECT 1 FROM public.meal_items WHERE meal_id=(solid->>'id')::uuid AND unit='g') THEN RAISE EXCEPTION 'Legacy default unit changed'; END IF;
  BEGIN
    PERFORM public.save_meal('snack',items,gen_random_uuid()::text || '/other-user.jpg');
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Foreign image accepted'; END IF;
  BEGIN
    PERFORM public.save_meal('snack','[{"food":"Inválido","grams":-1,"calories":0,"protein":0,"carbs":0,"fat":0}]'::jsonb);
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Invalid item accepted'; END IF;
END;
$$;
RESET ROLE;
ROLLBACK;
SELECT true AS database_regressions_passed;
