-- Quick Reference Queries for Kenyan Administrative Units

-- ============================================
-- COUNT QUERIES
-- ============================================

-- Get total counts
SELECT 
    (SELECT COUNT(*) FROM counties) as total_counties,
    (SELECT COUNT(*) FROM subcounties) as total_subcounties,
    (SELECT COUNT(*) FROM constituencies) as total_constituencies,
    (SELECT COUNT(*) FROM wards) as total_wards;

-- Count by county
SELECT 
    c.code,
    c.name as county,
    COUNT(DISTINCT sc.id) as subcounties,
    COUNT(DISTINCT const.id) as constituencies,
    COUNT(DISTINCT w.id) as wards
FROM counties c
LEFT JOIN subcounties sc ON c.id = sc.county_id
LEFT JOIN constituencies const ON c.id = const.county_id
LEFT JOIN wards w ON const.id = w.constituency_id
GROUP BY c.id, c.code, c.name
ORDER BY c.code;

-- ============================================
-- NAIROBI COUNTY QUERIES
-- ============================================

-- Get all Nairobi constituencies and ward counts
SELECT 
    const.name as constituency,
    COUNT(w.id) as ward_count
FROM constituencies const
LEFT JOIN wards w ON const.id = w.constituency_id
WHERE const.county_id = (SELECT id FROM counties WHERE code = '047')
GROUP BY const.id, const.name
ORDER BY const.name;

-- Get all Nairobi wards
SELECT 
    const.name as constituency,
    w.name as ward
FROM constituencies const
JOIN wards w ON const.id = w.constituency_id
WHERE const.county_id = (SELECT id FROM counties WHERE code = '047')
ORDER BY const.name, w.name;

-- ============================================
-- MOMBASA COUNTY QUERIES
-- ============================================

-- Get all Mombasa wards
SELECT 
    const.name as constituency,
    w.name as ward
FROM constituencies const
JOIN wards w ON const.id = w.constituency_id
WHERE const.county_id = (SELECT id FROM counties WHERE code = '001')
ORDER BY const.name, w.name;

-- ============================================
-- GENERAL LOOKUP QUERIES
-- ============================================

-- Find a specific ward
SELECT 
    c.name as county,
    const.name as constituency,
    sc.name as subcounty,
    w.name as ward
FROM wards w
JOIN constituencies const ON w.constituency_id = const.id
JOIN counties c ON const.county_id = c.id
LEFT JOIN subcounties sc ON w.subcounty_id = sc.id
WHERE w.name ILIKE '%karen%'
ORDER BY c.name, const.name, w.name;

-- Get full hierarchy for a county (by code)
SELECT 
    c.code,
    c.name as county,
    sc.name as subcounty,
    const.name as constituency,
    w.name as ward
FROM counties c
LEFT JOIN subcounties sc ON c.id = sc.county_id
LEFT JOIN constituencies const ON c.id = const.county_id
LEFT JOIN wards w ON const.id = w.constituency_id
WHERE c.code = '047'  -- Change to any county code
ORDER BY sc.name, const.name, w.name;

-- Get all constituencies in a county
SELECT 
    c.name as county,
    const.name as constituency
FROM counties c
JOIN constituencies const ON c.id = const.county_id
WHERE c.code = '022'  -- Kiambu
ORDER BY const.name;

-- ============================================
-- VALIDATION QUERIES
-- ============================================

-- Check for wards without constituencies (should be empty)
SELECT * FROM wards WHERE constituency_id IS NULL;

-- Check for constituencies without counties (should be empty)
SELECT * FROM constituencies WHERE county_id IS NULL;

-- Check for subcounties without counties (should be empty)
SELECT * FROM subcounties WHERE county_id IS NULL;

-- Find duplicate ward names in same constituency (should be empty)
SELECT 
    constituency_id,
    name,
    COUNT(*) as count
FROM wards
GROUP BY constituency_id, name
HAVING COUNT(*) > 1;

-- ============================================
-- SEARCH QUERIES
-- ============================================

-- Search for a location by name
SELECT 
    'County' as type,
    c.name as location,
    NULL as parent
FROM counties c
WHERE c.name ILIKE '%nairobi%'

UNION ALL

SELECT 
    'Constituency' as type,
    const.name as location,
    c.name as parent
FROM constituencies const
JOIN counties c ON const.county_id = c.id
WHERE const.name ILIKE '%nairobi%'

UNION ALL

SELECT 
    'Ward' as type,
    w.name as location,
    const.name as parent
FROM wards w
JOIN constituencies const ON w.constituency_id = const.id
WHERE w.name ILIKE '%nairobi%';

-- ============================================
-- DROPDOWN/SELECT QUERIES (For Your App)
-- ============================================

-- Get counties for dropdown
SELECT id, code, name 
FROM counties 
ORDER BY name;

-- Get constituencies for a county (for dropdown)
SELECT id, name 
FROM constituencies 
WHERE county_id = $1  -- Replace with actual county_id
ORDER BY name;

-- Get wards for a constituency (for dropdown)
SELECT id, name 
FROM wards 
WHERE constituency_id = $1  -- Replace with actual constituency_id
ORDER BY name;

-- Get subcounties for a county (for dropdown)
SELECT id, name 
FROM subcounties 
WHERE county_id = $1  -- Replace with actual county_id
ORDER BY name;

-- ============================================
-- REPORTING QUERIES
-- ============================================

-- Counties with most constituencies
SELECT 
    c.name as county,
    COUNT(const.id) as constituency_count
FROM counties c
LEFT JOIN constituencies const ON c.id = const.county_id
GROUP BY c.id, c.name
ORDER BY constituency_count DESC
LIMIT 10;

-- Counties with most wards
SELECT 
    c.name as county,
    COUNT(w.id) as ward_count
FROM counties c
LEFT JOIN constituencies const ON c.id = const.county_id
LEFT JOIN wards w ON const.id = w.constituency_id
GROUP BY c.id, c.name
ORDER BY ward_count DESC
LIMIT 10;

-- Average wards per constituency by county
SELECT 
    c.name as county,
    COUNT(DISTINCT const.id) as constituencies,
    COUNT(w.id) as total_wards,
    ROUND(COUNT(w.id)::numeric / NULLIF(COUNT(DISTINCT const.id), 0), 2) as avg_wards_per_constituency
FROM counties c
LEFT JOIN constituencies const ON c.id = const.county_id
LEFT JOIN wards w ON const.id = w.constituency_id
GROUP BY c.id, c.name
HAVING COUNT(DISTINCT const.id) > 0
ORDER BY avg_wards_per_constituency DESC;
