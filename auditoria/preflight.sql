SELECT proname, prosecdef, proacl FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND proname IN ('get_vault_secret','save_meal','reserve_ai_request','set_nutrition_goals');
SELECT tgname FROM pg_trigger WHERE NOT tgisinternal ORDER BY tgname;
SELECT count(*) AS users_with_duplicate_active_goals FROM (SELECT user_id FROM public.goals WHERE is_active GROUP BY user_id HAVING count(*) > 1) q;
SELECT schemaname, tablename, policyname, cmd FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY tablename;
