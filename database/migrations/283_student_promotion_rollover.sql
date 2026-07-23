-- Migration 283: Student Promotion & Academic Year Rollover Engine
-- Creates tables and indexes for historical promotion tracking and academic year transitions

CREATE TABLE IF NOT EXISTS student_promotion_history (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    from_academic_year_id VARCHAR(64) NOT NULL,
    to_academic_year_id VARCHAR(64) NOT NULL,
    from_class VARCHAR(64) NOT NULL,
    to_class VARCHAR(64) NOT NULL,
    from_stream VARCHAR(64),
    to_stream VARCHAR(64),
    action VARCHAR(32) NOT NULL, -- 'promoted', 'repeated', 'graduated', 'withdrawn'
    closing_balance NUMERIC(12, 2) DEFAULT 0.00,
    carried_opening_balance NUMERIC(12, 2) DEFAULT 0.00,
    promoted_by VARCHAR(64) NOT NULL,
    promoted_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_promotion_history_student ON student_promotion_history(student_id);
CREATE INDEX IF NOT EXISTS idx_promotion_history_inst_year ON student_promotion_history(institution_id, from_academic_year_id);
