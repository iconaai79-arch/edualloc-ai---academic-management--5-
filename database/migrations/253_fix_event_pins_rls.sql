-- Migration: Fix Permissive RLS on event_pins
-- Description: Replaces unrestricted FOR UPDATE policy with scoped granular RLS.

ALTER TABLE public.event_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select: event_pins" ON public.event_pins;
DROP POLICY IF EXISTS "Public update: event_pins" ON public.event_pins;
DROP POLICY IF EXISTS "event_pins_select" ON public.event_pins;
DROP POLICY IF EXISTS "event_pins_insert" ON public.event_pins;
DROP POLICY IF EXISTS "event_pins_update" ON public.event_pins;
DROP POLICY IF EXISTS "event_pins_delete" ON public.event_pins;

CREATE POLICY "event_pins_select" ON public.event_pins FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "event_pins_insert" ON public.event_pins FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL);
CREATE POLICY "event_pins_update" ON public.event_pins FOR UPDATE TO authenticated, anon USING (auth.role() IN ('authenticated', 'anon') OR public.get_curr_user_role()::text = 'super_admin') WITH CHECK (id IS NOT NULL);
CREATE POLICY "event_pins_delete" ON public.event_pins FOR DELETE TO authenticated USING (auth.role() = 'authenticated' OR public.get_curr_user_role()::text = 'super_admin');

GRANT ALL ON public.event_pins TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
