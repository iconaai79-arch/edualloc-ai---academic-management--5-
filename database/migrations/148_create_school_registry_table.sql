-- Creating a dedicated School Registry table for Alumnae Portals
-- This serves as a master list of all learning institutions in the country
CREATE TABLE IF NOT EXISTS school_registry (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(255),
    county VARCHAR(255),
    sub_county VARCHAR(255),
    uic VARCHAR(255) UNIQUE,
    knec_code VARCHAR(255) UNIQUE,
    cluster VARCHAR(255),
    special_need_type VARCHAR(100), -- Regular, SNE, Integrated
    disability_type VARCHAR(255),
    accommodation_type VARCHAR(100), -- Boarding, Day, Mixed
    gender_type VARCHAR(100), -- Boys, Girls, Mixed
    institution_id VARCHAR(255), -- Reference to an active tenant if school is claimed
    slug VARCHAR(255) UNIQUE, -- SEO friendly URL identifier
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_school_registry_knec ON school_registry(knec_code);
CREATE INDEX IF NOT EXISTS idx_school_registry_uic ON school_registry(uic);
CREATE INDEX IF NOT EXISTS idx_school_registry_county ON school_registry(county);
CREATE INDEX IF NOT EXISTS idx_school_registry_slug ON school_registry(slug);
