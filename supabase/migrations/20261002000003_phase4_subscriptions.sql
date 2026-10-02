-- ============================================================================
-- Migración: Fase 4 - Suscripciones, Cuotas de IA y RevenueCat
-- Fecha: 2026-10-02
-- ============================================================================

-- ============================================================================
-- 1. TABLA: SUBSCRIPTIONS (Estado de suscripción sincronizado con RevenueCat)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'active', 'trialing', 'canceled', 'past_due')),
    plan_id TEXT NOT NULL DEFAULT 'free' CHECK (plan_id IN ('free', 'pro_monthly_clp', 'pro_annual_clp')),
    revenuecat_customer_id TEXT,
    current_period_end TIMESTAMPTZ,
    ai_photo_scans_today INTEGER DEFAULT 0 NOT NULL,
    last_scan_date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- 2. FUNCIÓN PARA CONTROLAR CUOTA DIARIA DE IA EN PLAN GRATUITO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_quota(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    sub_record RECORD;
    today_date DATE := CURRENT_DATE;
    max_free_scans INTEGER := 3;
BEGIN
    SELECT * INTO sub_record FROM public.subscriptions WHERE user_id = target_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.subscriptions (user_id, status, plan_id, ai_photo_scans_today, last_scan_date)
        VALUES (target_user_id, 'free', 'free', 1, today_date)
        RETURNING * INTO sub_record;
        
        RETURN jsonb_build_object('allowed', true, 'is_pro', false, 'remaining', max_free_scans - 1);
    END IF;

    -- Si es usuario Pro, tiene escaneos ilimitados
    IF sub_record.status IN ('active', 'trialing') THEN
        RETURN jsonb_build_object('allowed', true, 'is_pro', true, 'remaining', 9999);
    END IF;

    -- Si cambió de día, reiniciar contador
    IF sub_record.last_scan_date < today_date THEN
        UPDATE public.subscriptions
        SET ai_photo_scans_today = 1, last_scan_date = today_date, updated_at = now()
        WHERE user_id = target_user_id;

        RETURN jsonb_build_object('allowed', true, 'is_pro', false, 'remaining', max_free_scans - 1);
    END IF;

    -- Si ya alcanzó el límite gratuito
    IF sub_record.ai_photo_scans_today >= max_free_scans THEN
        RETURN jsonb_build_object('allowed', false, 'is_pro', false, 'remaining', 0);
    END IF;

    -- Incrementar contador
    UPDATE public.subscriptions
    SET ai_photo_scans_today = ai_photo_scans_today + 1, updated_at = now()
    WHERE user_id = target_user_id;

    RETURN jsonb_build_object('allowed', true, 'is_pro', false, 'remaining', max_free_scans - (sub_record.ai_photo_scans_today + 1));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. POLÍTICAS RLS FASE 4
-- ============================================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
CREATE POLICY "Users can read own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
CREATE POLICY "Users can update own subscription"
    ON public.subscriptions FOR UPDATE
    USING (auth.uid() = user_id);
