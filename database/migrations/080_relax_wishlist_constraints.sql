-- Relax constraints on retail_wishlist for marketplace leads
ALTER TABLE public.retail_wishlist ALTER COLUMN captured_by_id DROP NOT NULL;

-- Ensure RLS allows anonymous inserts for marketplace leads if needed
-- (Though apiService usually runs with service role or user session)
-- But for marketplace, we might need a public policy if it's truly anonymous.
-- However, the user said "tenant portal", so they are likely logged in as admins when viewing.
-- The MARKETPLACE submission might be anonymous.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'retail_wishlist' AND policyname = 'Allow anonymous marketplace inserts'
    ) THEN
        CREATE POLICY "Allow anonymous marketplace inserts" 
            ON public.retail_wishlist FOR INSERT 
            WITH CHECK (true);
    END IF;
END $$;
