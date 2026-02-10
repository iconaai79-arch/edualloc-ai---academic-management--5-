-- ============================================================================
-- AUTOMATED REMINDER CREATION SETUP
-- ============================================================================
-- This file shows how to set up automated daily reminder creation
-- for the teacher check-in system

-- ============================================================================
-- OPTION 1: Supabase pg_cron Extension (Recommended)
-- ============================================================================

-- Enable pg_cron extension (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily reminder creation at midnight (00:00)
-- This will create reminders for ALL institutions
SELECT cron.schedule(
    'create-daily-teacher-reminders',
    '0 0 * * *', -- Every day at midnight
    $$
    DO $$
    DECLARE
        inst RECORD;
    BEGIN
        FOR inst IN SELECT id FROM institutions WHERE status = 'active'
        LOOP
            PERFORM create_daily_reminders(inst.id);
        END LOOP;
    END $$;
    $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Unschedule if needed
-- SELECT cron.unschedule('create-daily-teacher-reminders');

-- ============================================================================
-- OPTION 2: Supabase Edge Function (Alternative)
-- ============================================================================

-- Create a new Edge Function in Supabase Dashboard:
-- Functions > Create a new function > Name: create-teacher-reminders

-- File: supabase/functions/create-teacher-reminders/index.ts
/*
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get all active institutions
    const { data: institutions, error: instError } = await supabase
      .from('institutions')
      .select('id, name')
      .eq('status', 'active')
    
    if (instError) throw instError
    
    let totalCreated = 0
    
    // Create reminders for each institution
    for (const inst of institutions || []) {
      const { data, error } = await supabase.rpc('create_daily_reminders', {
        p_institution_id: inst.id
      })
      
      if (!error && data) {
        totalCreated += data
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Created reminders for ${institutions?.length || 0} institutions`,
        totalReminders: totalCreated
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
*/

-- Then set up a cron job in Supabase Dashboard:
-- Database > Cron Jobs > Create a new cron job
-- Schedule: 0 0 * * * (daily at midnight)
-- SQL: SELECT net.http_post(url:='YOUR_EDGE_FUNCTION_URL', headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}');

-- ============================================================================
-- OPTION 3: Manual Daily Execution (For Testing)
-- ============================================================================

-- Run this manually each day to create reminders
-- Replace 'your-institution-id' with actual institution ID

SELECT create_daily_reminders('your-institution-id');

-- Or create for all institutions:
DO $$
DECLARE
    inst RECORD;
    total_created INTEGER := 0;
BEGIN
    FOR inst IN SELECT id, name FROM institutions WHERE status = 'active'
    LOOP
        total_created := total_created + create_daily_reminders(inst.id);
        RAISE NOTICE 'Created reminders for institution: % (% teachers)', inst.name, total_created;
    END LOOP;
    
    RAISE NOTICE 'Total reminders created: %', total_created;
END $$;

-- ============================================================================
-- OPTION 4: Application-Level Cron (Node.js/Backend)
-- ============================================================================

-- If you have a backend server, you can use node-cron:

/*
// File: server/cron/teacherReminders.js
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Creating daily teacher check-in reminders...');
  
  try {
    // Get all active institutions
    const { data: institutions, error: instError } = await supabase
      .from('institutions')
      .select('id, name')
      .eq('status', 'active');
    
    if (instError) throw instError;
    
    let totalCreated = 0;
    
    for (const inst of institutions) {
      const { data, error } = await supabase.rpc('create_daily_reminders', {
        p_institution_id: inst.id
      });
      
      if (!error && data) {
        totalCreated += data;
        console.log(`Created ${data} reminders for ${inst.name}`);
      }
    }
    
    console.log(`Total reminders created: ${totalCreated}`);
  } catch (error) {
    console.error('Error creating reminders:', error);
  }
});

console.log('Teacher reminder cron job scheduled');
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if reminders were created for today
SELECT 
    COUNT(*) as total_reminders,
    reminder_type,
    status
FROM teacher_checkin_reminders
WHERE reminder_date = CURRENT_DATE
GROUP BY reminder_type, status;

-- View pending reminders for today
SELECT * FROM v_pending_reminders;

-- Check reminder creation for a specific institution
SELECT 
    r.*,
    u.name as teacher_name
FROM teacher_checkin_reminders r
JOIN users u ON r.teacher_id = u.id
WHERE r.institution_id = 'your-institution-id'
    AND r.reminder_date = CURRENT_DATE
ORDER BY r.reminder_time;

-- ============================================================================
-- CLEANUP QUERIES (Optional)
-- ============================================================================

-- Delete old reminders (older than 30 days)
DELETE FROM teacher_checkin_reminders
WHERE reminder_date < CURRENT_DATE - INTERVAL '30 days';

-- Or create a cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_reminders()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM teacher_checkin_reminders
    WHERE reminder_date < CURRENT_DATE - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run weekly
SELECT cron.schedule(
    'cleanup-old-teacher-reminders',
    '0 2 * * 0', -- Every Sunday at 2 AM
    'SELECT cleanup_old_reminders();'
);

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- Daily reminder creation statistics
SELECT 
    reminder_date,
    COUNT(*) as total_reminders,
    COUNT(CASE WHEN status = 'Acknowledged' THEN 1 END) as acknowledged,
    COUNT(CASE WHEN status = 'Dismissed' THEN 1 END) as dismissed,
    COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending
FROM teacher_checkin_reminders
WHERE reminder_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY reminder_date
ORDER BY reminder_date DESC;

-- Teachers who haven't acknowledged reminders
SELECT 
    u.name as teacher_name,
    u.email,
    COUNT(*) as pending_reminders
FROM teacher_checkin_reminders r
JOIN users u ON r.teacher_id = u.id
WHERE r.status = 'Pending'
    AND r.reminder_date = CURRENT_DATE
    AND r.reminder_time < CURRENT_TIME
GROUP BY u.id, u.name, u.email
ORDER BY pending_reminders DESC;

-- ============================================================================
-- NOTES
-- ============================================================================

/*
IMPORTANT REMINDERS:

1. Choose ONE option above based on your infrastructure:
   - Option 1: Best for Supabase-only setup
   - Option 2: Good for serverless architecture
   - Option 3: For testing or manual control
   - Option 4: If you have a backend server

2. Reminder Times:
   - Morning: 7:45 AM (created at midnight for same day)
   - Afternoon: 3:45 PM (created at midnight for same day)

3. The create_daily_reminders() function:
   - Creates 2 reminders per active teacher
   - Skips if reminders already exist (ON CONFLICT DO NOTHING)
   - Returns count of teachers processed

4. Monitoring:
   - Check cron.job_run_details for execution history
   - Monitor v_pending_reminders view
   - Set up alerts for failed executions

5. Testing:
   - Test manually first with Option 3
   - Verify reminders appear in teacher_checkin_reminders table
   - Check that teachers see notifications in UI

6. Timezone Considerations:
   - Ensure your database timezone matches your institution's timezone
   - Adjust cron schedule if needed for different timezones
*/
