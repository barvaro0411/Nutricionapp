SELECT jsonb_build_object(
  'functions',(SELECT jsonb_agg(pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'),
  'policies',(SELECT jsonb_agg(row_to_json(p)) FROM pg_policies p WHERE schemaname IN ('public','storage')),
  'constraints',(SELECT jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'name',c.conname,'definition',pg_get_constraintdef(c.oid))) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public'),
  'indexes',(SELECT jsonb_agg(row_to_json(i)) FROM pg_indexes i WHERE schemaname='public'),
  'triggers',(SELECT jsonb_agg(pg_get_triggerdef(t.oid)) FROM pg_trigger t WHERE NOT t.tgisinternal),
  'grants',(SELECT jsonb_agg(row_to_json(g)) FROM information_schema.role_table_grants g WHERE table_schema='public'),
  'duplicate_active_goals',(SELECT count(*) FROM (SELECT user_id FROM public.goals WHERE is_active GROUP BY user_id HAVING count(*)>1) d)
) AS schema_snapshot;
