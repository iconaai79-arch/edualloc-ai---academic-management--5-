-- Migration: Create Broadcaster Messages, Institution Events, and Event PINs
-- Path: database/migrations/232_create_events_and_broadcaster_tables.sql

CREATE TABLE IF NOT EXISTS public.broadcaster_messages (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    target TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    recipients_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.institution_events (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date TEXT NOT NULL,
    event_time TEXT NOT NULL,
    venue TEXT NOT NULL,
    target TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_pins (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES public.institution_events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    pin TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    guests TEXT,
    vehicle_registration TEXT,
    rating INTEGER,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE public.broadcaster_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_pins ENABLE ROW LEVEL SECURITY;

-- Institutional tenancy policies
DO $$
DECLARE
    tables text[] := ARRAY['broadcaster_messages', 'institution_events', 'event_pins'];
    t text;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy select: %I" ON public.%I FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
        
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy manage: %I" ON public.%I FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
        
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;

-- Public read/update overrides for event pins and events
DROP POLICY IF EXISTS "Public select: event_pins" ON public.event_pins;
CREATE POLICY "Public select: event_pins" ON public.event_pins FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public update: event_pins" ON public.event_pins;
CREATE POLICY "Public update: event_pins" ON public.event_pins FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public select: institution_events" ON public.institution_events;
CREATE POLICY "Public select: institution_events" ON public.institution_events FOR SELECT USING (true);
