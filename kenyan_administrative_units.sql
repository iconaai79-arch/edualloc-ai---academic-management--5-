-- Kenyan Administrative Units: Counties, Subcounties, Constituencies, and Wards
-- Data as of 2022 (based on IEBC boundaries)

-- Create tables if they don't exist
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

-- Insert Counties (47 counties)
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

-- MOMBASA COUNTY
INSERT INTO subcounties (county_id, name) VALUES
((SELECT id FROM counties WHERE code = '001'), 'Changamwe'),
((SELECT id FROM counties WHERE code = '001'), 'Jomvu'),
((SELECT id FROM counties WHERE code = '001'), 'Kisauni'),
((SELECT id FROM counties WHERE code = '001'), 'Likoni'),
((SELECT id FROM counties WHERE code = '001'), 'Mvita'),
((SELECT id FROM counties WHERE code = '001'), 'Nyali');

INSERT INTO constituencies (county_id, name) VALUES
((SELECT id FROM counties WHERE code = '001'), 'Changamwe'),
((SELECT id FROM counties WHERE code = '001'), 'Jomvu'),
((SELECT id FROM counties WHERE code = '001'), 'Kisauni'),
((SELECT id FROM counties WHERE code = '001'), 'Nyali'),
((SELECT id FROM counties WHERE code = '001'), 'Likoni'),
((SELECT id FROM counties WHERE code = '001'), 'Mvita');

-- Mombasa Wards
INSERT INTO wards (constituency_id, subcounty_id, name) VALUES
((SELECT id FROM constituencies WHERE name = 'Changamwe' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Changamwe' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Port Reitz'),
((SELECT id FROM constituencies WHERE name = 'Changamwe' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Changamwe' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Kipevu'),
((SELECT id FROM constituencies WHERE name = 'Changamwe' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Changamwe' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Airport'),
((SELECT id FROM constituencies WHERE name = 'Changamwe' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Changamwe' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Changamwe'),
((SELECT id FROM constituencies WHERE name = 'Changamwe' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Changamwe' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Chaani'),
((SELECT id FROM constituencies WHERE name = 'Jomvu' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Jomvu' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Jomvu Kuu'),
((SELECT id FROM constituencies WHERE name = 'Jomvu' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Jomvu' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Miritini'),
((SELECT id FROM constituencies WHERE name = 'Jomvu' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Jomvu' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Mikindani'),
((SELECT id FROM constituencies WHERE name = 'Kisauni' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Kisauni' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Mjambere'),
((SELECT id FROM constituencies WHERE name = 'Kisauni' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Kisauni' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Junda'),
((SELECT id FROM constituencies WHERE name = 'Kisauni' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Kisauni' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Bamburi'),
((SELECT id FROM constituencies WHERE name = 'Kisauni' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Kisauni' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Mwakirunge'),
((SELECT id FROM constituencies WHERE name = 'Kisauni' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Kisauni' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Mtopanga'),
((SELECT id FROM constituencies WHERE name = 'Kisauni' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Kisauni' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Magogoni'),
((SELECT id FROM constituencies WHERE name = 'Kisauni' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Kisauni' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Shanzu'),
((SELECT id FROM constituencies WHERE name = 'Nyali' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Nyali' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Frere Town'),
((SELECT id FROM constituencies WHERE name = 'Nyali' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Nyali' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Ziwa La Ng''Ombe'),
((SELECT id FROM constituencies WHERE name = 'Nyali' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Nyali' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Mkomani'),
((SELECT id FROM constituencies WHERE name = 'Nyali' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Nyali' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Kongowea'),
((SELECT id FROM constituencies WHERE name = 'Nyali' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Nyali' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Kadzandani'),
((SELECT id FROM constituencies WHERE name = 'Likoni' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Likoni' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Mtongwe'),
((SELECT id FROM constituencies WHERE name = 'Likoni' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Likoni' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Shika Adabu'),
((SELECT id FROM constituencies WHERE name = 'Likoni' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Likoni' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Bofu'),
((SELECT id FROM constituencies WHERE name = 'Likoni' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Likoni' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Likoni'),
((SELECT id FROM constituencies WHERE name = 'Likoni' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Likoni' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Timbwani'),
((SELECT id FROM constituencies WHERE name = 'Mvita' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Mvita' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Mji Wa Kale/Makadara'),
((SELECT id FROM constituencies WHERE name = 'Mvita' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Mvita' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Tudor'),
((SELECT id FROM constituencies WHERE name = 'Mvita' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Mvita' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Tononoka'),
((SELECT id FROM constituencies WHERE name = 'Mvita' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Mvita' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Shimanzi/Ganjoni'),
((SELECT id FROM constituencies WHERE name = 'Mvita' AND county_id = (SELECT id FROM counties WHERE code = '001')), (SELECT id FROM subcounties WHERE name = 'Mvita' AND county_id = (SELECT id FROM counties WHERE code = '001')), 'Majengo');

-- KWALE COUNTY
INSERT INTO subcounties (county_id, name) VALUES
((SELECT id FROM counties WHERE code = '002'), 'Matuga'),
((SELECT id FROM counties WHERE code = '002'), 'Kinango'),
((SELECT id FROM counties WHERE code = '002'), 'Msambweni'),
((SELECT id FROM counties WHERE code = '002'), 'Lunga Lunga');

INSERT INTO constituencies (county_id, name) VALUES
((SELECT id FROM counties WHERE code = '002'), 'Msambweni'),
((SELECT id FROM counties WHERE code = '002'), 'Lunga Lunga'),
((SELECT id FROM counties WHERE code = '002'), 'Matuga'),
((SELECT id FROM counties WHERE code = '002'), 'Kinango');

-- Kwale Wards
INSERT INTO wards (constituency_id, subcounty_id, name) VALUES
((SELECT id FROM constituencies WHERE name = 'Msambweni' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Msambweni' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Gombato Bongwe'),
((SELECT id FROM constituencies WHERE name = 'Msambweni' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Msambweni' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Ukunda'),
((SELECT id FROM constituencies WHERE name = 'Msambweni' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Msambweni' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Kinondo'),
((SELECT id FROM constituencies WHERE name = 'Msambweni' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Msambweni' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Ramisi'),
((SELECT id FROM constituencies WHERE name = 'Lunga Lunga' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Lunga Lunga' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Pongwe Kikoneni'),
((SELECT id FROM constituencies WHERE name = 'Lunga Lunga' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Lunga Lunga' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Dzombo'),
((SELECT id FROM constituencies WHERE name = 'Lunga Lunga' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Lunga Lunga' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Mwereni'),
((SELECT id FROM constituencies WHERE name = 'Lunga Lunga' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Lunga Lunga' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Vanga'),
((SELECT id FROM constituencies WHERE name = 'Matuga' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Matuga' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Tsimba Golini'),
((SELECT id FROM constituencies WHERE name = 'Matuga' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Matuga' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Waa'),
((SELECT id FROM constituencies WHERE name = 'Matuga' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Matuga' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Tiwi'),
((SELECT id FROM constituencies WHERE name = 'Matuga' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Matuga' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Kubo South'),
((SELECT id FROM constituencies WHERE name = 'Matuga' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Matuga' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Mkongani'),
((SELECT id FROM constituencies WHERE name = 'Kinango' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Kinango' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Puma'),
((SELECT id FROM constituencies WHERE name = 'Kinango' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Kinango' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Kinango'),
((SELECT id FROM constituencies WHERE name = 'Kinango' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Kinango' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Kasemeni'),
((SELECT id FROM constituencies WHERE name = 'Kinango' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Kinango' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Mackinnon Road'),
((SELECT id FROM constituencies WHERE name = 'Kinango' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Kinango' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Chengoni/Samburu'),
((SELECT id FROM constituencies WHERE name = 'Kinango' AND county_id = (SELECT id FROM counties WHERE code = '002')), (SELECT id FROM subcounties WHERE name = 'Kinango' AND county_id = (SELECT id FROM counties WHERE code = '002')), 'Mwavumbo');

-- KILIFI COUNTY
INSERT INTO subcounties (county_id, name) VALUES
((SELECT id FROM counties WHERE code = '003'), 'Kilifi North'),
((SELECT id FROM counties WHERE code = '003'), 'Kilifi South'),
((SELECT id FROM counties WHERE code = '003'), 'Kaloleni'),
((SELECT id FROM counties WHERE code = '003'), 'Rabai'),
((SELECT id FROM counties WHERE code = '003'), 'Ganze'),
((SELECT id FROM counties WHERE code = '003'), 'Malindi'),
((SELECT id FROM counties WHERE code = '003'), 'Magarini');

INSERT INTO constituencies (county_id, name) VALUES
((SELECT id FROM counties WHERE code = '003'), 'Kilifi North'),
((SELECT id FROM counties WHERE code = '003'), 'Kilifi South'),
((SELECT id FROM counties WHERE code = '003'), 'Kaloleni'),
((SELECT id FROM counties WHERE code = '003'), 'Rabai'),
((SELECT id FROM counties WHERE code = '003'), 'Ganze'),
((SELECT id FROM counties WHERE code = '003'), 'Malindi'),
((SELECT id FROM counties WHERE code = '003'), 'Magarini');

-- Sample Kilifi Wards (abbreviated for space)
INSERT INTO wards (constituency_id, subcounty_id, name) VALUES
((SELECT id FROM constituencies WHERE name = 'Kilifi North' AND county_id = (SELECT id FROM counties WHERE code = '003')), (SELECT id FROM subcounties WHERE name = 'Kilifi North' AND county_id = (SELECT id FROM counties WHERE code = '003')), 'Tezo'),
((SELECT id FROM constituencies WHERE name = 'Kilifi North' AND county_id = (SELECT id FROM counties WHERE code = '003')), (SELECT id FROM subcounties WHERE name = 'Kilifi North' AND county_id = (SELECT id FROM counties WHERE code = '003')), 'Sokoke'),
((SELECT id FROM constituencies WHERE name = 'Kilifi North' AND county_id = (SELECT id FROM counties WHERE code = '003')), (SELECT id FROM subcounties WHERE name = 'Kilifi North' AND county_id = (SELECT id FROM counties WHERE code = '003')), 'Ganda'),
((SELECT id FROM constituencies WHERE name = 'Kilifi North' AND county_id = (SELECT id FROM counties WHERE code = '003')), (SELECT id FROM subcounties WHERE name = 'Kilifi North' AND county_id = (SELECT id FROM counties WHERE code = '003')), 'Roka'),
((SELECT id FROM constituencies WHERE name = 'Kilifi North' AND county_id = (SELECT id FROM counties WHERE code = '003')), (SELECT id FROM subcounties WHERE name = 'Kilifi North' AND county_id = (SELECT id FROM counties WHERE code = '003')), 'Matsangoni'),
((SELECT id FROM constituencies WHERE name = 'Kilifi South' AND county_id = (SELECT id FROM counties WHERE code = '003')), (SELECT id FROM subcounties WHERE name = 'Kilifi South' AND county_id = (SELECT id FROM counties WHERE code = '003')), 'Junju'),
((SELECT id FROM constituencies WHERE name = 'Kilifi South' AND county_id = (SELECT id FROM counties WHERE code = '003')), (SELECT id FROM subcounties WHERE name = 'Kilifi South' AND county_id = (SELECT id FROM counties WHERE code = '003')), 'Mwarakaya'),
((SELECT id FROM constituencies WHERE name = 'Kilifi South' AND county_id = (SELECT id FROM counties WHERE code = '003')), (SELECT id FROM subcounties WHERE name = 'Kilifi South' AND county_id = (SELECT id FROM counties WHERE code = '003')), 'Shimo La Tewa'),
((SELECT id FROM constituencies WHERE name = 'Kilifi South' AND county_id = (SELECT id FROM counties WHERE code = '003')), (SELECT id FROM subcounties WHERE name = 'Kilifi South' AND county_id = (SELECT id FROM counties WHERE code = '003')), 'Mtepeni'),
((SELECT id FROM constituencies WHERE name = 'Kilifi South' AND county_id = (SELECT id FROM counties WHERE code = '003')), (SELECT id FROM subcounties WHERE name = 'Kilifi South' AND county_id = (SELECT id FROM counties WHERE code = '003')), 'Chumani');

-- NAIROBI COUNTY (Complete Example)
INSERT INTO subcounties (county_id, name) VALUES
((SELECT id FROM counties WHERE code = '047'), 'Westlands'),
((SELECT id FROM counties WHERE code = '047'), 'Dagoretti North'),
((SELECT id FROM counties WHERE code = '047'), 'Dagoretti South'),
((SELECT id FROM counties WHERE code = '047'), 'Langata'),
((SELECT id FROM counties WHERE code = '047'), 'Kibra'),
((SELECT id FROM counties WHERE code = '047'), 'Roysambu'),
((SELECT id FROM counties WHERE code = '047'), 'Kasarani'),
((SELECT id FROM counties WHERE code = '047'), 'Ruaraka'),
((SELECT id FROM counties WHERE code = '047'), 'Embakasi South'),
((SELECT id FROM counties WHERE code = '047'), 'Embakasi North'),
((SELECT id FROM counties WHERE code = '047'), 'Embakasi Central'),
((SELECT id FROM counties WHERE code = '047'), 'Embakasi East'),
((SELECT id FROM counties WHERE code = '047'), 'Embakasi West'),
((SELECT id FROM counties WHERE code = '047'), 'Makadara'),
((SELECT id FROM counties WHERE code = '047'), 'Kamukunji'),
((SELECT id FROM counties WHERE code = '047'), 'Starehe'),
((SELECT id FROM counties WHERE code = '047'), 'Mathare');

INSERT INTO constituencies (county_id, name) VALUES
((SELECT id FROM counties WHERE code = '047'), 'Westlands'),
((SELECT id FROM counties WHERE code = '047'), 'Dagoretti North'),
((SELECT id FROM counties WHERE code = '047'), 'Dagoretti South'),
((SELECT id FROM counties WHERE code = '047'), 'Langata'),
((SELECT id FROM counties WHERE code = '047'), 'Kibra'),
((SELECT id FROM counties WHERE code = '047'), 'Roysambu'),
((SELECT id FROM counties WHERE code = '047'), 'Kasarani'),
((SELECT id FROM counties WHERE code = '047'), 'Ruaraka'),
((SELECT id FROM counties WHERE code = '047'), 'Embakasi South'),
((SELECT id FROM counties WHERE code = '047'), 'Embakasi North'),
((SELECT id FROM counties WHERE code = '047'), 'Embakasi Central'),
((SELECT id FROM counties WHERE code = '047'), 'Embakasi East'),
((SELECT id FROM counties WHERE code = '047'), 'Embakasi West'),
((SELECT id FROM counties WHERE code = '047'), 'Makadara'),
((SELECT id FROM counties WHERE code = '047'), 'Kamukunji'),
((SELECT id FROM counties WHERE code = '047'), 'Starehe'),
((SELECT id FROM counties WHERE code = '047'), 'Mathare');

-- Nairobi Wards
INSERT INTO wards (constituency_id, subcounty_id, name) VALUES
-- Westlands Constituency
((SELECT id FROM constituencies WHERE name = 'Westlands' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Westlands' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kitisuru'),
((SELECT id FROM constituencies WHERE name = 'Westlands' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Westlands' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Parklands/Highridge'),
((SELECT id FROM constituencies WHERE name = 'Westlands' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Westlands' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Karura'),
((SELECT id FROM constituencies WHERE name = 'Westlands' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Westlands' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kangemi'),
((SELECT id FROM constituencies WHERE name = 'Westlands' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Westlands' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Mountain View'),
-- Dagoretti North
((SELECT id FROM constituencies WHERE name = 'Dagoretti North' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Dagoretti North' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kilimani'),
((SELECT id FROM constituencies WHERE name = 'Dagoretti North' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Dagoretti North' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kawangware'),
((SELECT id FROM constituencies WHERE name = 'Dagoretti North' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Dagoretti North' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Gatina'),
((SELECT id FROM constituencies WHERE name = 'Dagoretti North' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Dagoretti North' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kileleshwa'),
((SELECT id FROM constituencies WHERE name = 'Dagoretti North' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Dagoretti North' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kabiro'),
-- Dagoretti South
((SELECT id FROM constituencies WHERE name = 'Dagoretti South' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Dagoretti South' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Mutuini'),
((SELECT id FROM constituencies WHERE name = 'Dagoretti South' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Dagoretti South' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Ngando'),
((SELECT id FROM constituencies WHERE name = 'Dagoretti South' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Dagoretti South' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Riruta'),
((SELECT id FROM constituencies WHERE name = 'Dagoretti South' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Dagoretti South' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Uthiru/Ruthimitu'),
((SELECT id FROM constituencies WHERE name = 'Dagoretti South' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Dagoretti South' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Waithaka'),
-- Langata
((SELECT id FROM constituencies WHERE name = 'Langata' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Langata' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Karen'),
((SELECT id FROM constituencies WHERE name = 'Langata' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Langata' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Nairobi West'),
((SELECT id FROM constituencies WHERE name = 'Langata' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Langata' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Mugumo-Ini'),
((SELECT id FROM constituencies WHERE name = 'Langata' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Langata' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'South C'),
((SELECT id FROM constituencies WHERE name = 'Langata' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Langata' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Nyayo Highrise'),
-- Kibra
((SELECT id FROM constituencies WHERE name = 'Kibra' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kibra' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Laini Saba'),
((SELECT id FROM constituencies WHERE name = 'Kibra' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kibra' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Lindi'),
((SELECT id FROM constituencies WHERE name = 'Kibra' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kibra' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Makina'),
((SELECT id FROM constituencies WHERE name = 'Kibra' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kibra' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Woodley/Kenyatta Golf Course'),
((SELECT id FROM constituencies WHERE name = 'Kibra' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kibra' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Sarang''Ombe'),
-- Roysambu
((SELECT id FROM constituencies WHERE name = 'Roysambu' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Roysambu' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Roysambu'),
((SELECT id FROM constituencies WHERE name = 'Roysambu' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Roysambu' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Githurai'),
((SELECT id FROM constituencies WHERE name = 'Roysambu' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Roysambu' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kahawa West'),
((SELECT id FROM constituencies WHERE name = 'Roysambu' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Roysambu' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Zimmerman'),
((SELECT id FROM constituencies WHERE name = 'Roysambu' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Roysambu' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kahawa'),
-- Kasarani
((SELECT id FROM constituencies WHERE name = 'Kasarani' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kasarani' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Clay City'),
((SELECT id FROM constituencies WHERE name = 'Kasarani' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kasarani' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Mwiki'),
((SELECT id FROM constituencies WHERE name = 'Kasarani' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kasarani' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kasarani'),
((SELECT id FROM constituencies WHERE name = 'Kasarani' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kasarani' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Njiru'),
((SELECT id FROM constituencies WHERE name = 'Kasarani' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kasarani' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Ruai'),
-- Ruaraka
((SELECT id FROM constituencies WHERE name = 'Ruaraka' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Ruaraka' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Babadogo'),
((SELECT id FROM constituencies WHERE name = 'Ruaraka' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Ruaraka' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Utalii'),
((SELECT id FROM constituencies WHERE name = 'Ruaraka' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Ruaraka' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Mathare North'),
((SELECT id FROM constituencies WHERE name = 'Ruaraka' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Ruaraka' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Lucky Summer'),
((SELECT id FROM constituencies WHERE name = 'Ruaraka' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Ruaraka' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Korogocho'),
-- Embakasi South
((SELECT id FROM constituencies WHERE name = 'Embakasi South' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi South' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Imara Daima'),
((SELECT id FROM constituencies WHERE name = 'Embakasi South' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi South' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kwa Njenga'),
((SELECT id FROM constituencies WHERE name = 'Embakasi South' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi South' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kwa Reuben'),
((SELECT id FROM constituencies WHERE name = 'Embakasi South' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi South' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Pipeline'),
((SELECT id FROM constituencies WHERE name = 'Embakasi South' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi South' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kware'),
-- Embakasi North
((SELECT id FROM constituencies WHERE name = 'Embakasi North' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi North' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kariobangi North'),
((SELECT id FROM constituencies WHERE name = 'Embakasi North' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi North' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Dandora Area I'),
((SELECT id FROM constituencies WHERE name = 'Embakasi North' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi North' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Dandora Area II'),
((SELECT id FROM constituencies WHERE name = 'Embakasi North' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi North' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Dandora Area III'),
((SELECT id FROM constituencies WHERE name = 'Embakasi North' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi North' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Dandora Area IV'),
-- Embakasi Central
((SELECT id FROM constituencies WHERE name = 'Embakasi Central' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi Central' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kayole North'),
((SELECT id FROM constituencies WHERE name = 'Embakasi Central' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi Central' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kayole Central'),
((SELECT id FROM constituencies WHERE name = 'Embakasi Central' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi Central' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kayole South'),
((SELECT id FROM constituencies WHERE name = 'Embakasi Central' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi Central' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Komarock'),
((SELECT id FROM constituencies WHERE name = 'Embakasi Central' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi Central' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Matopeni/Spring Valley'),
-- Embakasi East
((SELECT id FROM constituencies WHERE name = 'Embakasi East' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi East' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Upper Savannah'),
((SELECT id FROM constituencies WHERE name = 'Embakasi East' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi East' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Lower Savannah'),
((SELECT id FROM constituencies WHERE name = 'Embakasi East' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi East' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Embakasi'),
((SELECT id FROM constituencies WHERE name = 'Embakasi East' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi East' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Utawala'),
((SELECT id FROM constituencies WHERE name = 'Embakasi East' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi East' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Mihang''O'),
-- Embakasi West
((SELECT id FROM constituencies WHERE name = 'Embakasi West' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi West' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Umoja I'),
((SELECT id FROM constituencies WHERE name = 'Embakasi West' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi West' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Umoja II'),
((SELECT id FROM constituencies WHERE name = 'Embakasi West' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi West' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Mowlem'),
((SELECT id FROM constituencies WHERE name = 'Embakasi West' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Embakasi West' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kariobangi South'),
-- Makadara
((SELECT id FROM constituencies WHERE name = 'Makadara' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Makadara' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Maringo/Hamza'),
((SELECT id FROM constituencies WHERE name = 'Makadara' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Makadara' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Viwandani'),
((SELECT id FROM constituencies WHERE name = 'Makadara' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Makadara' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Harambee'),
((SELECT id FROM constituencies WHERE name = 'Makadara' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Makadara' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Makongeni'),
((SELECT id FROM constituencies WHERE name = 'Makadara' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Makadara' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Mbotela'),
-- Kamukunji
((SELECT id FROM constituencies WHERE name = 'Kamukunji' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kamukunji' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Pumwani'),
((SELECT id FROM constituencies WHERE name = 'Kamukunji' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kamukunji' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Eastleigh North'),
((SELECT id FROM constituencies WHERE name = 'Kamukunji' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kamukunji' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Eastleigh South'),
((SELECT id FROM constituencies WHERE name = 'Kamukunji' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kamukunji' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Airbase'),
((SELECT id FROM constituencies WHERE name = 'Kamukunji' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Kamukunji' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'California'),
-- Starehe
((SELECT id FROM constituencies WHERE name = 'Starehe' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Starehe' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Nairobi Central'),
((SELECT id FROM constituencies WHERE name = 'Starehe' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Starehe' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Ngara'),
((SELECT id FROM constituencies WHERE name = 'Starehe' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Starehe' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Pangani'),
((SELECT id FROM constituencies WHERE name = 'Starehe' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Starehe' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Ziwani/Kariokor'),
((SELECT id FROM constituencies WHERE name = 'Starehe' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Starehe' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Landimawe'),
((SELECT id FROM constituencies WHERE name = 'Starehe' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Starehe' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Nairobi South'),
-- Mathare
((SELECT id FROM constituencies WHERE name = 'Mathare' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Mathare' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Hospital'),
((SELECT id FROM constituencies WHERE name = 'Mathare' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Mathare' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Mabatini'),
((SELECT id FROM constituencies WHERE name = 'Mathare' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Mathare' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Huruma'),
((SELECT id FROM constituencies WHERE name = 'Mathare' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Mathare' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Ngei'),
((SELECT id FROM constituencies WHERE name = 'Mathare' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Mathare' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Mlango Kubwa'),
((SELECT id FROM constituencies WHERE name = 'Mathare' AND county_id = (SELECT id FROM counties WHERE code = '047')), (SELECT id FROM subcounties WHERE name = 'Mathare' AND county_id = (SELECT id FROM counties WHERE code = '047')), 'Kiamaiko');

-- Note: This is a comprehensive starter file. Due to the extensive nature of all 47 counties with their
-- subcounties, constituencies, and wards (1,450+ wards total), this file includes complete data for:
-- - All 47 Counties
-- - Sample data for Mombasa, Kwale, Kilifi (coastal counties)
-- - Complete data for Nairobi County (all 17 constituencies and 85 wards)
-- 
-- To add remaining counties, follow the same pattern:
-- 1. Insert subcounties for the county
-- 2. Insert constituencies for the county
-- 3. Insert wards linking to both constituency_id and subcounty_id
--
-- For a complete database, you would need to add the remaining 43 counties following this structure.

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subcounties_county ON subcounties(county_id);
CREATE INDEX IF NOT EXISTS idx_constituencies_county ON constituencies(county_id);
CREATE INDEX IF NOT EXISTS idx_wards_constituency ON wards(constituency_id);
CREATE INDEX IF NOT EXISTS idx_wards_subcounty ON wards(subcounty_id);

-- Sample queries to verify data
-- SELECT COUNT(*) as total_counties FROM counties;
-- SELECT COUNT(*) as total_subcounties FROM subcounties;
-- SELECT COUNT(*) as total_constituencies FROM constituencies;
-- SELECT COUNT(*) as total_wards FROM wards;

-- Query to get full hierarchy for a specific county
-- SELECT 
--     c.name as county,
--     sc.name as subcounty,
--     const.name as constituency,
--     w.name as ward
-- FROM counties c
-- LEFT JOIN subcounties sc ON c.id = sc.county_id
-- LEFT JOIN constituencies const ON c.id = const.county_id
-- LEFT JOIN wards w ON const.id = w.constituency_id
-- WHERE c.code = '047'
-- ORDER BY c.name, sc.name, const.name, w.name;
