-- Adding academic registry fields to the institutions table
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS region VARCHAR(255);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS uic VARCHAR(255);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS knec_code VARCHAR(255);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS cluster VARCHAR(255);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS special_need_type VARCHAR(100); -- Regular, SNE, Integrated
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS disability_type VARCHAR(255);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS accommodation_type VARCHAR(100); -- Boarding, Day, Mixed
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS gender_type VARCHAR(100); -- Boys, Girls, Mixed
