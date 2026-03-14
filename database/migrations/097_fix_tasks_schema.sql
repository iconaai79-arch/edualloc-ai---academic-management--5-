-- 097_fix_tasks_schema.sql
-- Fixes missing institution_id column and standardizes RLS

-- 1. Add institution_id column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN institution_id TEXT;
    ELSE
        -- If it exists as UUID, convert it to TEXT to match users table and HIS module pattern
        ALTER TABLE tasks ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
    END IF;

    -- Try to populate from user's institution if possible
    UPDATE tasks t
    SET institution_id = (SELECT u.institution_id FROM users u WHERE u.id::text = t.user_id::text LIMIT 1)
    WHERE institution_id IS NULL;
END $$;

-- 2. Ensure RLS is enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 3. Update RLS Policies
DROP POLICY IF EXISTS "User personal tasks" ON tasks;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON tasks;
DROP POLICY IF EXISTS "Institutional tasks access" ON tasks;

-- Private tasks (Owned by user)
CREATE POLICY "User personal tasks"
    ON tasks
    FOR ALL
    USING (
        auth.uid()::text = user_id::text 
        OR 'u_' || auth.uid()::text = user_id::text
        OR auth.jwt() ->> 'email' = 'super@app.com'
    )
    WITH CHECK (
        auth.uid()::text = user_id::text 
        OR 'u_' || auth.uid()::text = user_id::text
        OR auth.jwt() ->> 'email' = 'super@app.com'
    );

-- Institutional View (For Admins)
CREATE POLICY "Institutional tasks access"
    ON tasks
    FOR SELECT
    USING (
        institution_id::text = public.get_curr_user_inst_id()
        AND public.get_curr_user_role() IN ('admin', 'super_admin', 'head_teacher')
    );

-- 4. Explicit Grants
GRANT ALL ON public.tasks TO anon, authenticated, service_role;
