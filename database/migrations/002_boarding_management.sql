-- Boarding Management System Database Schema
-- For Primary and Secondary Institutions

-- ============================================
-- BOARDING HOUSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS boarding_houses (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('Boys', 'Girls', 'Mixed')),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    house_master_id INTEGER,
    status VARCHAR(30) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Under Maintenance')),
    floor_plan_url TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, name)
);

-- ============================================
-- BOARDING ROOMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS boarding_rooms (
    id SERIAL PRIMARY KEY,
    house_id INTEGER NOT NULL REFERENCES boarding_houses(id) ON DELETE CASCADE,
    room_number VARCHAR(50) NOT NULL,
    room_type VARCHAR(30) NOT NULL CHECK (room_type IN ('Single', 'Double', 'Triple', 'Quad', 'Dormitory')),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    floor_level INTEGER DEFAULT 0,
    amenities TEXT,
    status VARCHAR(30) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Under Maintenance')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(house_id, room_number)
);

-- ============================================
-- BOARDING BEDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS boarding_beds (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES boarding_rooms(id) ON DELETE CASCADE,
    bed_number VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Reserved', 'Under Maintenance')),
    condition VARCHAR(30) DEFAULT 'Good' CHECK (condition IN ('Excellent', 'Good', 'Fair', 'Poor', 'Needs Replacement')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, bed_number)
);

-- ============================================
-- BED ALLOCATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bed_allocations (
    id SERIAL PRIMARY KEY,
    bed_id INTEGER NOT NULL REFERENCES boarding_beds(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    allocated_by INTEGER NOT NULL,
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    term VARCHAR(20) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    status VARCHAR(30) DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Transferred', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BOARDING CHECK-INS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS boarding_checkins (
    id SERIAL PRIMARY KEY,
    allocation_id INTEGER NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIME NOT NULL DEFAULT CURRENT_TIME,
    checked_in_by INTEGER NOT NULL,
    condition_notes TEXT,
    items_inventory JSONB,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BOARDING CHECK-OUTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS boarding_checkouts (
    id SERIAL PRIMARY KEY,
    allocation_id INTEGER NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL,
    check_out_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_out_time TIME NOT NULL DEFAULT CURRENT_TIME,
    checked_out_by INTEGER NOT NULL,
    condition_notes TEXT,
    damage_report TEXT,
    clearance_status VARCHAR(30) DEFAULT 'Pending' CHECK (clearance_status IN ('Pending', 'Cleared', 'Issues Reported')),
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BOARDING MAINTENANCE LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS boarding_maintenance_logs (
    id SERIAL PRIMARY KEY,
    house_id INTEGER REFERENCES boarding_houses(id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES boarding_rooms(id) ON DELETE CASCADE,
    bed_id INTEGER REFERENCES boarding_beds(id) ON DELETE CASCADE,
    issue_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    reported_by INTEGER NOT NULL,
    reported_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
    resolved_date DATE,
    resolved_by INTEGER,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_boarding_houses_institution ON boarding_houses(institution_id);
CREATE INDEX IF NOT EXISTS idx_boarding_houses_status ON boarding_houses(status);
CREATE INDEX IF NOT EXISTS idx_boarding_rooms_house ON boarding_rooms(house_id);
CREATE INDEX IF NOT EXISTS idx_boarding_rooms_status ON boarding_rooms(status);
CREATE INDEX IF NOT EXISTS idx_boarding_beds_room ON boarding_beds(room_id);
CREATE INDEX IF NOT EXISTS idx_boarding_beds_status ON boarding_beds(status);
CREATE INDEX IF NOT EXISTS idx_bed_allocations_bed ON bed_allocations(bed_id);
CREATE INDEX IF NOT EXISTS idx_bed_allocations_student ON bed_allocations(student_id);
CREATE INDEX IF NOT EXISTS idx_bed_allocations_status ON bed_allocations(status);
CREATE INDEX IF NOT EXISTS idx_bed_allocations_term_year ON bed_allocations(term, academic_year);
CREATE INDEX IF NOT EXISTS idx_boarding_checkins_allocation ON boarding_checkins(allocation_id);
CREATE INDEX IF NOT EXISTS idx_boarding_checkins_student ON boarding_checkins(student_id);
CREATE INDEX IF NOT EXISTS idx_boarding_checkins_date ON boarding_checkins(check_in_date);
CREATE INDEX IF NOT EXISTS idx_boarding_checkouts_allocation ON boarding_checkouts(allocation_id);
CREATE INDEX IF NOT EXISTS idx_boarding_checkouts_student ON boarding_checkouts(student_id);
CREATE INDEX IF NOT EXISTS idx_boarding_checkouts_date ON boarding_checkouts(check_out_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_house ON boarding_maintenance_logs(house_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_status ON boarding_maintenance_logs(status);

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- View: Current Bed Occupancy
CREATE OR REPLACE VIEW v_bed_occupancy AS
SELECT 
    bh.id as house_id,
    bh.name as house_name,
    bh.gender,
    br.id as room_id,
    br.room_number,
    br.room_type,
    bb.id as bed_id,
    bb.bed_number,
    bb.status as bed_status,
    ba.id as allocation_id,
    ba.student_id,
    ba.term,
    ba.academic_year,
    ba.status as allocation_status
FROM boarding_houses bh
JOIN boarding_rooms br ON bh.id = br.house_id
JOIN boarding_beds bb ON br.id = bb.room_id
LEFT JOIN bed_allocations ba ON bb.id = ba.bed_id AND ba.status = 'Active';

-- View: House Statistics
CREATE OR REPLACE VIEW v_house_statistics AS
SELECT 
    bh.id as house_id,
    bh.name as house_name,
    bh.gender,
    bh.capacity as house_capacity,
    COUNT(DISTINCT br.id) as total_rooms,
    COUNT(DISTINCT bb.id) as total_beds,
    COUNT(DISTINCT CASE WHEN bb.status = 'Available' THEN bb.id END) as available_beds,
    COUNT(DISTINCT CASE WHEN bb.status = 'Occupied' THEN bb.id END) as occupied_beds,
    COUNT(DISTINCT CASE WHEN ba.status = 'Active' THEN ba.id END) as active_allocations,
    ROUND(
        (COUNT(DISTINCT CASE WHEN bb.status = 'Occupied' THEN bb.id END)::numeric / 
         NULLIF(COUNT(DISTINCT bb.id), 0) * 100), 2
    ) as occupancy_percentage
FROM boarding_houses bh
LEFT JOIN boarding_rooms br ON bh.id = br.house_id
LEFT JOIN boarding_beds bb ON br.id = bb.room_id
LEFT JOIN bed_allocations ba ON bb.id = ba.bed_id AND ba.status = 'Active'
GROUP BY bh.id, bh.name, bh.gender, bh.capacity;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Sample Houses
-- INSERT INTO boarding_houses (institution_id, name, gender, capacity, status) VALUES
-- (1, 'Phoenix House', 'Boys', 120, 'Active'),
-- (1, 'Eagle House', 'Boys', 100, 'Active'),
-- (1, 'Rose House', 'Girls', 110, 'Active'),
-- (1, 'Lily House', 'Girls', 90, 'Active');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to auto-update bed status when allocated
CREATE OR REPLACE FUNCTION update_bed_status_on_allocation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Active' THEN
        UPDATE boarding_beds 
        SET status = 'Occupied', updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.bed_id;
    ELSIF OLD.status = 'Active' AND NEW.status IN ('Completed', 'Transferred', 'Cancelled') THEN
        UPDATE boarding_beds 
        SET status = 'Available', updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.bed_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for bed status updates
DROP TRIGGER IF EXISTS trg_update_bed_status ON bed_allocations;
CREATE TRIGGER trg_update_bed_status
    AFTER INSERT OR UPDATE ON bed_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_bed_status_on_allocation();

-- Function to prevent double allocation
CREATE OR REPLACE FUNCTION prevent_double_allocation()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM bed_allocations 
        WHERE bed_id = NEW.bed_id 
        AND status = 'Active' 
        AND id != COALESCE(NEW.id, 0)
    ) THEN
        RAISE EXCEPTION 'Bed is already allocated to another student';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent double allocation
DROP TRIGGER IF EXISTS trg_prevent_double_allocation ON bed_allocations;
CREATE TRIGGER trg_prevent_double_allocation
    BEFORE INSERT OR UPDATE ON bed_allocations
    FOR EACH ROW
    WHEN (NEW.status = 'Active')
    EXECUTE FUNCTION prevent_double_allocation();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE boarding_houses IS 'Boarding houses/dormitories in the institution';
COMMENT ON TABLE boarding_rooms IS 'Rooms within boarding houses';
COMMENT ON TABLE boarding_beds IS 'Individual beds within rooms';
COMMENT ON TABLE bed_allocations IS 'Student bed allocations per term/year';
COMMENT ON TABLE boarding_checkins IS 'Student check-in records';
COMMENT ON TABLE boarding_checkouts IS 'Student check-out records';
COMMENT ON TABLE boarding_maintenance_logs IS 'Maintenance issues and resolutions';
