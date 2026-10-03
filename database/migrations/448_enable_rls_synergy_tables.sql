-- Migration 448: Enable Row Level Security (RLS) on synergy_comments, synergy_posts, and synergy_messages
-- Fixes Supabase Advisor Warning: "Table public.synergy_comments is public, but RLS has not been enabled."

DO $$
BEGIN
    -- ====================================================================
    -- 1. SYNERGY POSTS
    -- ====================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'synergy_posts') THEN
        ALTER TABLE public.synergy_posts ENABLE ROW LEVEL SECURITY;

        CREATE INDEX IF NOT EXISTS idx_synergy_posts_inst_id ON public.synergy_posts(institution_id);
        CREATE INDEX IF NOT EXISTS idx_synergy_posts_created_at ON public.synergy_posts(created_at DESC);

        DROP POLICY IF EXISTS "Institutional tenancy select: synergy_posts" ON public.synergy_posts;
        CREATE POLICY "Institutional tenancy select: synergy_posts" ON public.synergy_posts 
        FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

        DROP POLICY IF EXISTS "Institutional tenancy manage: synergy_posts" ON public.synergy_posts;
        CREATE POLICY "Institutional tenancy manage: synergy_posts" ON public.synergy_posts 
        FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

        GRANT ALL ON public.synergy_posts TO anon, authenticated, service_role;
    END IF;

    -- ====================================================================
    -- 2. SYNERGY COMMENTS
    -- ====================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'synergy_comments') THEN
        -- Enable RLS
        ALTER TABLE public.synergy_comments ENABLE ROW LEVEL SECURITY;

        -- Ensure institution_id column exists on synergy_comments
        ALTER TABLE public.synergy_comments ADD COLUMN IF NOT EXISTS institution_id TEXT;

        -- Backfill institution_id from parent synergy_posts if missing
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'synergy_posts') THEN
            UPDATE public.synergy_comments c
            SET institution_id = p.institution_id
            FROM public.synergy_posts p
            WHERE c.post_id = p.id AND c.institution_id IS NULL;
        END IF;

        CREATE INDEX IF NOT EXISTS idx_synergy_comments_post_id ON public.synergy_comments(post_id);
        CREATE INDEX IF NOT EXISTS idx_synergy_comments_inst_id ON public.synergy_comments(institution_id);

        DROP POLICY IF EXISTS "Institutional tenancy select: synergy_comments" ON public.synergy_comments;
        CREATE POLICY "Institutional tenancy select: synergy_comments" ON public.synergy_comments 
        FOR SELECT USING (
            institution_id = public.get_curr_user_inst_id() 
            OR public.get_curr_user_role() = 'super_admin'
            OR EXISTS (
                SELECT 1 FROM public.synergy_posts p 
                WHERE p.id = synergy_comments.post_id 
                  AND (p.institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin')
            )
        );

        DROP POLICY IF EXISTS "Institutional tenancy manage: synergy_comments" ON public.synergy_comments;
        CREATE POLICY "Institutional tenancy manage: synergy_comments" ON public.synergy_comments 
        FOR ALL USING (
            author_id = auth.uid()::text 
            OR institution_id = public.get_curr_user_inst_id() 
            OR public.get_curr_user_role() = 'super_admin'
            OR EXISTS (
                SELECT 1 FROM public.synergy_posts p 
                WHERE p.id = synergy_comments.post_id 
                  AND (p.institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin')
            )
        );

        GRANT ALL ON public.synergy_comments TO anon, authenticated, service_role;
    END IF;

    -- ====================================================================
    -- 3. SYNERGY MESSAGES
    -- ====================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'synergy_messages') THEN
        ALTER TABLE public.synergy_messages ENABLE ROW LEVEL SECURITY;

        ALTER TABLE public.synergy_messages ADD COLUMN IF NOT EXISTS institution_id TEXT;

        CREATE INDEX IF NOT EXISTS idx_synergy_messages_sender ON public.synergy_messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_synergy_messages_recipient ON public.synergy_messages(recipient_id);

        DROP POLICY IF EXISTS "Users can read their own messages" ON public.synergy_messages;
        CREATE POLICY "Users can read their own messages" ON public.synergy_messages
        FOR SELECT USING (
            sender_id = auth.uid()::text 
            OR recipient_id = auth.uid()::text 
            OR public.get_curr_user_role() = 'super_admin'
        );

        DROP POLICY IF EXISTS "Users can manage their own messages" ON public.synergy_messages;
        CREATE POLICY "Users can manage their own messages" ON public.synergy_messages
        FOR ALL USING (
            sender_id = auth.uid()::text 
            OR public.get_curr_user_role() = 'super_admin'
        );

        GRANT ALL ON public.synergy_messages TO anon, authenticated, service_role;
    END IF;
END $$;
