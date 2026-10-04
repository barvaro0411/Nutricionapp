-- ============================================================================
-- Migración: Modularización de Esquema y Triggers de Auditoría / Mantenimiento
-- Fecha: 2026-10-04
-- ============================================================================

-- 1. ESQUEMA MODULAR PRIVADO (Oculto de PostgREST API)
CREATE SCHEMA IF NOT EXISTS app_private;

-- Restringir acceso al esquema privado (solo accesible por backend / service_role)
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO service_role;

-- 2. TABLA DE AUDITORÍA INTERNA
CREATE TABLE IF NOT EXISTS app_private.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    details JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Asegurar índices para búsquedas rápidas por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON app_private.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON app_private.audit_logs(action, created_at DESC);

-- Permisos estrictos de auditoría
REVOKE ALL ON app_private.audit_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON app_private.audit_logs TO service_role;

-- 3. FUNCIÓN DE AUTO-LIMPIEZA DE FOTOS EXPIRADAS (Almacenamiento Seguro)
CREATE OR REPLACE FUNCTION app_private.cleanup_old_meal_photos(days_threshold integer DEFAULT 14)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    deleted_photos_count integer := 0;
    updated_meals_count integer := 0;
    cutoff_time timestamptz := now() - (days_threshold || ' days')::interval;
BEGIN
    -- 1. Eliminar archivos de storage con más de 'days_threshold' días en el bucket meal_photos
    WITH deleted_objects AS (
        DELETE FROM storage.objects
        WHERE bucket_id = 'meal_photos'
          AND created_at < cutoff_time
        RETURNING id
    )
    SELECT count(*) INTO deleted_photos_count FROM deleted_objects;

    -- 2. Limpiar referencia image_path en las comidas antiguas para evitar enlaces rotos
    WITH updated_meals AS (
        UPDATE public.meals
        SET image_path = NULL
        WHERE logged_at < cutoff_time
          AND image_path IS NOT NULL
        RETURNING id
    )
    SELECT count(*) INTO updated_meals_count FROM updated_meals;

    -- 3. Registrar ejecución en la tabla de auditoría privada
    INSERT INTO app_private.audit_logs (action, table_name, details)
    VALUES (
        'cleanup_photos',
        'storage.objects',
        jsonb_build_object(
            'deleted_photos', deleted_photos_count,
            'updated_meals', updated_meals_count,
            'days_threshold', days_threshold,
            'cutoff_time', cutoff_time
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'deleted_photos', deleted_photos_count,
        'updated_meals', updated_meals_count,
        'executed_at', now()
    );
END;
$$;

REVOKE ALL ON FUNCTION app_private.cleanup_old_meal_photos(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.cleanup_old_meal_photos(integer) TO service_role;

-- 4. TRIGGER DE AUDITORÍA: SEGUIMIENTO HISTÓRICO DE PESO Y OBJETIVOS EN PROFILES
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF OLD.current_weight_kg IS DISTINCT FROM NEW.current_weight_kg OR
       OLD.activity_level IS DISTINCT FROM NEW.activity_level OR
       OLD.objective IS DISTINCT FROM NEW.objective THEN
        INSERT INTO app_private.audit_logs (user_id, action, table_name, record_id, details)
        VALUES (
            NEW.id,
            'update_profile_metrics',
            'profiles',
            NEW.id::text,
            jsonb_build_object(
                'old_weight', OLD.current_weight_kg,
                'new_weight', NEW.current_weight_kg,
                'old_activity', OLD.activity_level,
                'new_activity', NEW.activity_level,
                'old_objective', OLD.objective,
                'new_objective', NEW.objective,
                'changed_at', now()
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_profile_changes ON public.profiles;
CREATE TRIGGER trg_log_profile_changes
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_profile_changes();
