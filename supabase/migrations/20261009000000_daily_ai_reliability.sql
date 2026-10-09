-- Shared provider cooldowns and idempotent coach requests. Backend access only.
CREATE TABLE public.ai_provider_cooldowns (
  scope text PRIMARY KEY CHECK (scope ~ '^(groq|gemini):[0-9a-f]{64}:[a-zA-Z0-9./_*-]{1,100}$'),
  blocked_until timestamptz NOT NULL,
  status integer NOT NULL CHECK (status BETWEEN 400 AND 599)
);
ALTER TABLE public.ai_provider_cooldowns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_provider_cooldowns FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_provider_cooldowns TO service_role;

CREATE FUNCTION public.get_ai_provider_cooldowns(p_scopes text[])
RETURNS TABLE(scope text, blocked_until timestamptz, status integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Backend only' USING ERRCODE = '42501'; END IF;
  IF coalesce(array_length(p_scopes,1),0) NOT BETWEEN 1 AND 8 THEN RAISE EXCEPTION 'Invalid scopes'; END IF;
  RETURN QUERY SELECT c.scope,c.blocked_until,c.status FROM public.ai_provider_cooldowns c WHERE c.scope = ANY(p_scopes) AND c.blocked_until > now();
END;
$$;
CREATE FUNCTION public.set_ai_provider_cooldown(p_scope text, p_retry_seconds integer, p_status integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Backend only' USING ERRCODE = '42501'; END IF;
  IF p_retry_seconds NOT BETWEEN 1 AND 86400 OR p_status NOT BETWEEN 400 AND 599 THEN RAISE EXCEPTION 'Invalid cooldown'; END IF;
  DELETE FROM public.ai_provider_cooldowns WHERE blocked_until < now() - interval '1 day';
  INSERT INTO public.ai_provider_cooldowns(scope,blocked_until,status) VALUES(p_scope,now()+make_interval(secs=>p_retry_seconds),p_status)
  ON CONFLICT (scope) DO UPDATE SET blocked_until=greatest(ai_provider_cooldowns.blocked_until,EXCLUDED.blocked_until),
    status=CASE WHEN EXCLUDED.blocked_until >= ai_provider_cooldowns.blocked_until THEN EXCLUDED.status ELSE ai_provider_cooldowns.status END;
END;
$$;

CREATE TABLE public.coach_requests (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  message_hash text NOT NULL CHECK (message_hash ~ '^[0-9a-f]{64}$'),
  claim_token uuid NOT NULL,
  lease_until timestamptz NOT NULL,
  response jsonb CHECK (response IS NULL OR jsonb_typeof(response)='object'),
  completed_at timestamptz,
  PRIMARY KEY(user_id,request_id)
);
ALTER TABLE public.coach_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coach_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.coach_requests TO service_role;
CREATE FUNCTION public.begin_coach_request(p_user_id uuid,p_request_id uuid,p_message_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE saved public.coach_requests; claim uuid := gen_random_uuid();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Backend only' USING ERRCODE='42501'; END IF;
  IF p_message_hash IS NULL OR p_message_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid hash'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||p_request_id::text,0));
  DELETE FROM public.coach_requests WHERE user_id=p_user_id AND (completed_at < now()-interval '1 day' OR (response IS NULL AND lease_until < now()-interval '1 day'));
  SELECT * INTO saved FROM public.coach_requests WHERE user_id=p_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF saved.message_hash <> p_message_hash THEN RETURN jsonb_build_object('state','conflict'); END IF;
    IF saved.response IS NOT NULL THEN RETURN jsonb_build_object('state','cached','response',saved.response); END IF;
    IF saved.lease_until > now() THEN RETURN jsonb_build_object('state','processing'); END IF;
  END IF;
  INSERT INTO public.coach_requests(user_id,request_id,message_hash,claim_token,lease_until) VALUES(p_user_id,p_request_id,p_message_hash,claim,now()+interval '90 seconds')
  ON CONFLICT(user_id,request_id) DO UPDATE SET claim_token=EXCLUDED.claim_token,lease_until=EXCLUDED.lease_until;
  RETURN jsonb_build_object('state','acquired','claim_token',claim);
END;
$$;
CREATE FUNCTION public.finish_coach_request(p_user_id uuid,p_request_id uuid,p_claim_token uuid,p_user_text text,p_assistant_text text,p_snapshot jsonb,p_response jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE saved public.coach_requests; stamp timestamptz := clock_timestamp();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Backend only' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||p_request_id::text,0));
  SELECT * INTO saved FROM public.coach_requests WHERE user_id=p_user_id AND request_id=p_request_id;
  IF NOT FOUND OR saved.claim_token IS DISTINCT FROM p_claim_token THEN RAISE EXCEPTION 'Request claim lost' USING ERRCODE='40001'; END IF;
  IF saved.response IS NOT NULL THEN RETURN saved.response; END IF;
  IF coalesce(length(trim(p_user_text)),0) NOT BETWEEN 1 AND 2000 OR coalesce(length(trim(p_assistant_text)),0) NOT BETWEEN 1 AND 16000
    OR jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object' OR jsonb_typeof(p_response) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid conversation'; END IF;
  INSERT INTO public.coach_messages(user_id,role,content,created_at,context_snapshot) VALUES
    (p_user_id,'user',p_user_text,stamp,p_snapshot),(p_user_id,'assistant',p_assistant_text,stamp+interval '1 millisecond',p_snapshot);
  UPDATE public.coach_requests SET response=p_response,completed_at=now() WHERE user_id=p_user_id AND request_id=p_request_id;
  RETURN p_response;
END;
$$;
CREATE FUNCTION public.abandon_coach_request(p_user_id uuid,p_request_id uuid,p_claim_token uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Backend only' USING ERRCODE='42501'; END IF;
  DELETE FROM public.coach_requests WHERE user_id=p_user_id AND request_id=p_request_id AND claim_token=p_claim_token AND response IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.get_ai_provider_cooldowns(text[]),public.set_ai_provider_cooldown(text,integer,integer),
  public.begin_coach_request(uuid,uuid,text),public.finish_coach_request(uuid,uuid,uuid,text,text,jsonb,jsonb),public.abandon_coach_request(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_provider_cooldowns(text[]),public.set_ai_provider_cooldown(text,integer,integer),
  public.begin_coach_request(uuid,uuid,text),public.finish_coach_request(uuid,uuid,uuid,text,text,jsonb,jsonb),public.abandon_coach_request(uuid,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_ai_request(target_user_id uuid,daily_limit integer,minute_limit integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE usage public.ai_request_limits; today date := (now() AT TIME ZONE 'America/Santiago')::date; wait_seconds integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Backend only' USING ERRCODE='42501'; END IF;
  IF daily_limit NOT BETWEEN 1 AND 10000 OR minute_limit NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Invalid limits'; END IF;
  INSERT INTO public.ai_request_limits(user_id,day_key,minute_started_at) VALUES(target_user_id,today,now()) ON CONFLICT DO NOTHING;
  SELECT * INTO STRICT usage FROM public.ai_request_limits WHERE user_id=target_user_id FOR UPDATE;
  IF usage.day_key <> today THEN usage.day_count := 0; END IF;
  IF usage.minute_started_at <= now()-interval '1 minute' THEN usage.minute_count := 0; usage.minute_started_at := now(); END IF;
  IF usage.day_count >= daily_limit THEN
    wait_seconds := greatest(1,ceil(extract(epoch FROM (((today+1)::timestamp AT TIME ZONE 'America/Santiago')-now())))::integer);
    RETURN jsonb_build_object('allowed',false,'scope','daily','retry_after_seconds',wait_seconds);
  END IF;
  IF usage.minute_count >= minute_limit THEN
    RETURN jsonb_build_object('allowed',false,'scope','minute','retry_after_seconds',greatest(1,ceil(extract(epoch FROM (usage.minute_started_at+interval '1 minute'-now())))::integer));
  END IF;
  UPDATE public.ai_request_limits SET day_key=today,day_count=usage.day_count+1,minute_started_at=usage.minute_started_at,minute_count=usage.minute_count+1 WHERE user_id=target_user_id;
  RETURN jsonb_build_object('allowed',true,'remaining_daily',daily_limit-usage.day_count-1);
END;
$$;
