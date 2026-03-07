-- data_check.sql
-- Check if any logs actually exist and what they look like

SELECT COUNT(*) as total_logs FROM public.activity_log;

SELECT * FROM public.activity_log ORDER BY timestamp DESC LIMIT 5;

SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'activity_log';
