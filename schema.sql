-- ============================================================================
-- AuraFind — Normalized Campus Recovery & Predictive Analytics Database Schema
-- Optimized for PostgreSQL 16 (Docker)
-- ============================================================================

-- 1. Main Incidents Table (Found Items & Lost Broadcasts)
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('found', 'lost')),
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,            -- e.g. 'Electronics', 'Clothing', 'Accessories', 'Eyewear'
    item_type VARCHAR(50),                    -- e.g. 'charger', 'umbrella', 'jacket', 'glasses', 'phone'
    
    -- Analytical Location Tags for Vulnerability Heatmaps
    location_zone VARCHAR(50) NOT NULL CHECK (
        location_zone IN ('classroom', 'washroom', 'cafeteria', 'library', 'lab', 'hostel_common', 'sports', 'other')
    ),
    location_detail VARCHAR(150),             -- e.g. 'Lecture Hall 302, 3rd row desk', '2nd Floor Sink Counter'
    
    -- Safe, Non-Sensitive Observable Attributes (No Privacy Breach)
    brand_company VARCHAR(100),               -- e.g. 'Apple', 'Dell', 'Sony', 'Ray-Ban'
    build_material VARCHAR(100),              -- e.g. 'Matte aluminum', 'Tortoiseshell acetate', 'Nylon'
    observable_wallpaper VARCHAR(150),        -- e.g. 'Mount Fuji', 'Anime', 'Space'
    observable_color VARCHAR(100),            -- e.g. 'Aqua Blue', 'Midnight Black'
    image_url TEXT,

    -- Reporter Contact (Sanity Validated)
    reporter_name VARCHAR(100) NOT NULL,
    reporter_email VARCHAR(150) NOT NULL,
    reporter_batch_year VARCHAR(50) NOT NULL,
    reporter_phone VARCHAR(20) NOT NULL,
    
    -- Custody Routing
    residence_type VARCHAR(20) CHECK (residence_type IN ('hostel', 'dayscholar')),
    hostel_floor VARCHAR(50),
    hostel_room VARCHAR(50),
    guard_location VARCHAR(150),
    
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'searching', 'reunited')),
    lost_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Security Questions (For Found Items)
CREATE TABLE IF NOT EXISTS security_questions (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    question_order SMALLINT NOT NULL CHECK (question_order BETWEEN 1 AND 10),
    question_text VARCHAR(255) NOT NULL,
    answer_raw VARCHAR(255) NOT NULL,
    semantic_cluster VARCHAR(100),            -- e.g. 'nature_mountain', 'color_aqua_cyan', 'port_type_c'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Claims & AI Verification Records
CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    claimer_name VARCHAR(100) NOT NULL,
    claimer_email VARCHAR(150) NOT NULL,
    claimer_phone VARCHAR(20) NOT NULL,
    submitted_answers JSONB NOT NULL,
    ai_confidence_score NUMERIC(5,2) NOT NULL, -- e.g. 92.50%
    discrepancy_resolved BOOLEAN DEFAULT FALSE,
    match_details JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Analytical Performance Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_zone ON incidents(location_zone);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(report_type);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at);

-- ============================================================================
-- ANALYTICAL VIEW: CAMPUS VULNERABILITY & LOSS HOTSPOT MATRIX
-- Allows querying: "Which campus location is most vulnerable to losing chargers,
-- jackets, umbrellas, or glasses?"
-- ============================================================================
CREATE OR REPLACE VIEW campus_vulnerability_heatmap AS
SELECT 
    location_zone,
    category,
    COUNT(*) AS total_incidents,
    ROUND(
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY location_zone), 
        1
    ) AS zone_loss_percentage,
    COUNT(CASE WHEN status = 'reunited' THEN 1 END) AS successful_reunions,
    ROUND(
        COUNT(CASE WHEN status = 'reunited' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
        1
    ) AS recovery_rate_percentage
FROM incidents
GROUP BY location_zone, category
ORDER BY location_zone, total_incidents DESC;

-- ============================================================================
-- SAMPLE ANALYTICAL QUERY FOR HACKATHON DEMO:
-- Run this query in Adminer (http://localhost:8080) to extract vulnerability insights:
-- 
-- SELECT 
--     location_zone,
--     category,
--     total_incidents,
--     zone_loss_percentage || '%' AS vulnerability_share
-- FROM campus_vulnerability_heatmap
-- WHERE total_incidents >= 1;
-- ============================================================================
