SELECT jsonb_build_object(
  'migration_history', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
  'personal_plans', to_regclass('public.personal_plans') IS NOT NULL,
  'ai_limits', to_regclass('public.ai_request_limits') IS NOT NULL,
  'functions', (SELECT jsonb_agg(proname ORDER BY proname) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'),
  'triggers', (SELECT jsonb_agg(tgname ORDER BY tgname) FROM pg_trigger WHERE NOT tgisinternal),
  'duplicate_active_goals', (SELECT count(*) FROM (SELECT user_id FROM public.goals WHERE is_active GROUP BY user_id HAVING count(*) > 1) d),
  'invalid_barcodes', (SELECT count(*) FROM public.barcode_products WHERE NOT (barcode ~ '^[0-9]{8,14}$' AND serving_size_g > 0 AND calories_per_100g >= 0 AND protein_per_100g >= 0 AND carbs_per_100g >= 0 AND fat_per_100g >= 0)),
  'invalid_recipes', (SELECT count(*) FROM public.recipes WHERE NOT (servings > 0 AND prep_time_minutes >= 0 AND calories_per_serving >= 0 AND protein_per_serving >= 0 AND carbs_per_serving >= 0 AND fat_per_serving >= 0)),
  'invalid_ingredients', (SELECT count(*) FROM public.recipe_ingredients WHERE NOT (grams > 0 AND calories >= 0 AND protein >= 0 AND carbs >= 0 AND fat >= 0)),
  'invalid_activity', (SELECT count(*) FROM public.activity_logs WHERE NOT (active_calories_burned >= 0 AND steps >= 0)),
  'invalid_meal_items', (SELECT count(*) FROM public.meal_items WHERE NOT (grams BETWEEN 0 AND 20000 AND calories BETWEEN 0 AND 50000 AND protein BETWEEN 0 AND 10000 AND carbs BETWEEN 0 AND 10000 AND fat BETWEEN 0 AND 10000)),
  'invalid_favorite_items', (SELECT count(*) FROM public.favorite_meal_items WHERE NOT (grams BETWEEN 0 AND 20000 AND calories BETWEEN 0 AND 50000 AND protein BETWEEN 0 AND 10000 AND carbs BETWEEN 0 AND 10000 AND fat BETWEEN 0 AND 10000)),
  'buckets', (SELECT jsonb_agg(jsonb_build_object('id', id, 'public', public)) FROM storage.buckets)
) AS predeploy;
