
-- Migration 189: Alumnae Portal Triggers and Fixes
-- This adds triggers to automatically sync comment counts and fixes any potential schema inconsistencies.

-- 1. Trigger to update alumni_posts.comments_count when a comment is added
CREATE OR REPLACE FUNCTION public.update_alumni_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.alumni_posts
        SET comments_count = comments_count + 1
        WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.alumni_posts
        SET comments_count = GREATEST(0, comments_count - 1)
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS tr_update_alumni_post_comment_count ON public.alumni_comments;
CREATE TRIGGER tr_update_alumni_post_comment_count
AFTER INSERT OR DELETE ON public.alumni_comments
FOR EACH ROW EXECUTE FUNCTION public.update_alumni_post_comment_count();

REVOKE EXECUTE ON FUNCTION public.update_alumni_post_comment_count() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_alumni_post_comment_count() TO postgres, service_role;

-- 2. Ensure all existing counts are correct
UPDATE public.alumni_posts p
SET comments_count = (
    SELECT count(*)
    FROM public.alumni_comments c
    WHERE c.post_id = p.id
);
