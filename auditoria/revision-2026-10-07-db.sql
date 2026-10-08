-- Consultas de solo lectura: metadatos y contadores, sin datos personales.
SELECT jsonb_build_object(
  'migrations', (SELECT jsonb_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations),
  'unit_columns', (SELECT jsonb_agg(jsonb_build_object('table', table_name, 'column', column_name, 'default', column_default)) FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('meal_items','favorite_meal_items','barcode_products') AND column_name IN ('unit','serving_size_g')),
  'save_meal_stores_unit', (SELECT position('unit' IN pg_get_functiondef(p.oid)) > 0 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'save_meal' LIMIT 1),
  'save_favorite_stores_unit', (SELECT position('unit' IN pg_get_functiondef(p.oid)) > 0 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'save_favorite' LIMIT 1),
  'barcode_policies', (SELECT jsonb_agg(jsonb_build_object('name', policyname, 'command', cmd, 'using', qual, 'check', with_check)) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'barcode_products'),
  'meal_totals_mismatches', (SELECT count(*) FROM public.meals m LEFT JOIN (SELECT meal_id, sum(calories) c, sum(protein) p, sum(carbs) cb, sum(fat) f FROM public.meal_items GROUP BY meal_id) i ON i.meal_id = m.id WHERE m.total_calories <> coalesce(i.c,0) OR m.total_protein <> coalesce(i.p,0) OR m.total_carbs <> coalesce(i.cb,0) OR m.total_fat <> coalesce(i.f,0)),
  'favorite_totals_mismatches', (SELECT count(*) FROM public.favorite_meals m LEFT JOIN (SELECT favorite_meal_id, sum(calories) c, sum(protein) p, sum(carbs) cb, sum(fat) f FROM public.favorite_meal_items GROUP BY favorite_meal_id) i ON i.favorite_meal_id = m.id WHERE m.total_calories <> coalesce(i.c,0) OR m.total_protein <> coalesce(i.p,0) OR m.total_carbs <> coalesce(i.cb,0) OR m.total_fat <> coalesce(i.f,0)),
  'broken_photo_references', (SELECT count(*) FROM public.meals m WHERE m.image_path IS NOT NULL AND NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'meal_photos' AND o.name = m.image_path)),
  'public_tables_without_rls', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity),
  'barcode_update_granted', has_table_privilege('authenticated','public.barcode_products','UPDATE')
) AS checks;
