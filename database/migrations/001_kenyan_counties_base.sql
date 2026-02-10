-- Base schema and all 47 counties
-- Part 1: Table structure and counties only

CREATE TABLE IF NOT EXISTS counties (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subcounties (
    id SERIAL PRIMARY KEY,
    county_id INTEGER NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(county_id, name)
);

CREATE TABLE IF NOT EXISTS constituencies (
    id SERIAL PRIMARY KEY,
    county_id INTEGER NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(county_id, name)
);

CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    constituency_id INTEGER NOT NULL REFERENCES constituencies(id) ON DELETE CASCADE,
    subcounty_id INTEGER REFERENCES subcounties(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(constituency_id, name)
);

-- All 47 Counties
INSERT INTO counties (code, name) VALUES
('001', 'Mombasa'),
('002', 'Kwale'),
('003', 'Kilifi'),
('004', 'Tana River'),
('005', 'Lamu'),
('006', 'Taita Taveta'),
('007', 'Garissa'),
('008', 'Wajir'),
('009', 'Mandera'),
('010', 'Marsabit'),
('011', 'Isiolo'),
('012', 'Meru'),
('013', 'Tharaka Nithi'),
('014', 'Embu'),
('015', 'Kitui'),
('016', 'Machakos'),
('017', 'Makueni'),
('018', 'Nyandarua'),
('019', 'Nyeri'),
('020', 'Kirinyaga'),
('021', 'Murang''a'),
('022', 'Kiambu'),
('023', 'Turkana'),
('024', 'West Pokot'),
('025', 'Samburu'),
('026', 'Trans Nzoia'),
('027', 'Uasin Gishu'),
('028', 'Elgeyo Marakwet'),
('029', 'Nandi'),
('030', 'Baringo'),
('031', 'Laikipia'),
('032', 'Nakuru'),
('033', 'Narok'),
('034', 'Kajiado'),
('035', 'Kericho'),
('036', 'Bomet'),
('037', 'Kakamega'),
('038', 'Vihiga'),
('039', 'Bungoma'),
('040', 'Busia'),
('041', 'Siaya'),
('042', 'Kisumu'),
('043', 'Homa Bay'),
('044', 'Migori'),
('045', 'Kisii'),
('046', 'Nyamira'),
('047', 'Nairobi');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subcounties_county ON subcounties(county_id);
CREATE INDEX IF NOT EXISTS idx_constituencies_county ON constituencies(county_id);
CREATE INDEX IF NOT EXISTS idx_wards_constituency ON wards(constituency_id);
CREATE INDEX IF NOT EXISTS idx_wards_subcounty ON wards(subcounty_id);
