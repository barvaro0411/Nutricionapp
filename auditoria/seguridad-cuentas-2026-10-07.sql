-- Solo metadatos y contadores; no devuelve información personal ni contraseñas.
SELECT jsonb_build_object(
  'tables', (SELECT jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity)) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'),
  'policies', (SELECT jsonb_agg(jsonb_build_object('table',tablename,'command',cmd,'roles',roles,'using',qual,'check',with_check)) FROM pg_policies WHERE schemaname='public'),
  'storage_buckets', (SELECT jsonb_agg(jsonb_build_object('name',id,'public',public,'max_bytes',file_size_limit,'mime_types',allowed_mime_types)) FROM storage.buckets),
  'storage_policies', (SELECT jsonb_agg(jsonb_build_object('command',cmd,'roles',roles,'using',qual,'check',with_check)) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'),
  'views', (SELECT jsonb_agg(jsonb_build_object('name',c.relname,'options',c.reloptions)) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v'),
  'auth_triggers', (SELECT jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'function',p.proname)) FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE t.tgrelid='auth.users'::regclass AND NOT t.tgisinternal),
  'functions', (SELECT jsonb_agg(jsonb_build_object('name',p.proname,'security_definer',p.prosecdef,'config',p.proconfig,'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'),
  'private_schema_anon_access', has_schema_privilege('anon','app_private','USAGE'),
  'private_schema_authenticated_access', has_schema_privilege('authenticated','app_private','USAGE'),
  'auth_users_without_profile', (SELECT count(*) FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id WHERE p.id IS NULL),
  'profiles_without_auth_user', (SELECT count(*) FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id WHERE u.id IS NULL),
  'profiles_without_subscription', (SELECT count(*) FROM public.profiles p LEFT JOIN public.subscriptions s ON s.user_id=p.id WHERE s.user_id IS NULL),
  'completed_profiles_without_active_goals', (SELECT count(*) FROM public.profiles p WHERE p.current_weight_kg IS NOT NULL AND p.height_cm IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.goals g WHERE g.user_id=p.id AND g.is_active)),
  'duplicate_active_goals', (SELECT count(*) FROM (SELECT user_id FROM public.goals WHERE is_active GROUP BY user_id HAVING count(*)>1) x),
  'sensitive_function_definitions', (SELECT jsonb_agg(jsonb_build_object('name',p.proname,'definition',pg_get_functiondef(p.oid))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('get_weight_history','record_weight','save_water','update_meal','delete_meal'))
) AS security_checks;
