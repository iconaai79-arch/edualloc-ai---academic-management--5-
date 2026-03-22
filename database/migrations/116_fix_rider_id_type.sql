-- Fix rider_id type in coop_farmers to match coop_riders.id (TEXT)
ALTER TABLE coop_farmers DROP COLUMN IF EXISTS rider_id;
ALTER TABLE coop_farmers ADD COLUMN rider_id TEXT REFERENCES coop_riders(id);
