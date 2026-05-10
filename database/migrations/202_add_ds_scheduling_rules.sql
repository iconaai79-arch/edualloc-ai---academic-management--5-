-- Migration 202: Add scheduling rules to ds_settings
ALTER TABLE ds_settings 
ADD COLUMN IF NOT EXISTS auto_scheduling_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS scheduling_rules JSONB DEFAULT '{
    "maxLessonsPerDayPerStudent": 1,
    "minGapMinutesBetweenLessons": 15,
    "allowBackToBackLessons": false,
    "autoAssignInstructor": false,
    "autoAssignVehicle": false
}'::jsonb;
