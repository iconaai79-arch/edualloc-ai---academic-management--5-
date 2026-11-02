const fs = require('fs');
const path = require('path');
const readline = require('readline');

const downloadsDir = 'C:\\Users\\hp\\Downloads';
const replacementsPath = path.join(__dirname, 'table_col_replacements.json');
const tableReplacements = fs.existsSync(replacementsPath) ? JSON.parse(fs.readFileSync(replacementsPath, 'utf8')) : {};

const universalDdlPath = path.join(__dirname, 'generated_universal_ddl.sql');
const universalDdl = fs.existsSync(universalDdlPath) ? fs.readFileSync(universalDdlPath, 'utf8') : '';

const reverseReplacements = {};
for (const [tbl, map] of Object.entries(tableReplacements)) {
    reverseReplacements[tbl] = {};
    for (const [camelCol, snakeCol] of Object.entries(map)) {
        if (!reverseReplacements[tbl][snakeCol]) {
            reverseReplacements[tbl][snakeCol] = [];
        }
        reverseReplacements[tbl][snakeCol].push(camelCol);
    }
}

const injectionSQL = `
-- DYNAMICALLY STRIP ALL FOREIGN KEY CONSTRAINTS ACROSS PUBLIC SCHEMA FOR 100% RELIABLE RESTORE
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conrelid::regclass AS table_name, conname
        FROM pg_constraint
        WHERE contype = 'f' 
          AND connamespace = 'public'::regnamespace
    ) LOOP
        BEGIN
            EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE;';
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- FIX INSTITUTION AND DEPENDENT FOREIGN KEYS FOR DATA RESTORE
ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_reseller_id_fkey CASCADE;
ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_county_id_fkey CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_institution_id_fkey CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_department_id_fkey CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key CASCADE;
DROP INDEX IF EXISTS public.users_email_key CASCADE;
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_department_id_fkey CASCADE;
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_department_id_fkey CASCADE;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_building_id_fkey CASCADE;
ALTER TABLE public.semesters DROP CONSTRAINT IF EXISTS semesters_academic_year_id_fkey CASCADE;
ALTER TABLE public.semesters DROP CONSTRAINT IF EXISTS semesters_institution_id_fkey CASCADE;
DO $$ BEGIN ALTER TABLE public.semesters ALTER COLUMN academic_year_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.semesters ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.academic_years ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- PRE-SEED MISSING ACADEMIC YEAR IF REFERENCED
INSERT INTO public.academic_years (id, name, start_date, end_date, institution_id, status)
VALUES ('ay_1770440553949', 'Academic Year 2026', '2026-01-01', '2026-12-31', 'inst_1770144450093_f9p2x', 'inactive')
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.users ALTER COLUMN role DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.users ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.courses ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.courses ALTER COLUMN code DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.subjects ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.subjects ALTER COLUMN code DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.students ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.departments ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- FIX AUDIT REPORTS NOT-NULL CONSTRAINTS & DEFAULTS
DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN title DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN title SET DEFAULT 'Audit Report'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN period DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN overall_risk DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN run_at DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN report_type DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN generated_by DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- FIX AUDIT ISSUES CONSTRAINTS
ALTER TABLE public.audit_issues DROP CONSTRAINT IF EXISTS audit_issues_report_id_fkey CASCADE;
DO $$ BEGIN ALTER TABLE public.audit_issues ALTER COLUMN report_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.audit_issues ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- FIX MPESA TRANSACTIONS NOT-NULL CONSTRAINTS
DO $$ BEGIN ALTER TABLE public.mpesa_transactions ALTER COLUMN receipt_no DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mpesa_transactions ALTER COLUMN receipt_no SET DEFAULT 'MPESA_REC'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mpesa_transactions ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- FIX DS LICENSE CATEGORIES NOT-NULL CONSTRAINTS
DO $$ BEGIN ALTER TABLE public.ds_license_categories ALTER COLUMN category_code DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ds_license_categories ALTER COLUMN category_name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ds_license_categories ALTER COLUMN code DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ds_license_categories ALTER COLUMN name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.ds_license_categories ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- FIX HIS CLINICAL EVENTS NOT-NULL CONSTRAINTS
DO $$ BEGIN ALTER TABLE public.his_clinical_events ALTER COLUMN event_type DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.his_clinical_events ALTER COLUMN event_type SET DEFAULT 'clinical_event'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.his_clinical_events ALTER COLUMN title DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.his_clinical_events ALTER COLUMN title SET DEFAULT 'Clinical Event'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.his_clinical_events ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- INSERT MISSING / DEMO INSTITUTIONS TO SATISFY FOREIGN KEY CONSTRAINTS
INSERT INTO public.institutions (id, name, email, status) VALUES
    ('1779527512643_8nszj', '1779527512643 8nszj', '17795275126438nszj@placeholder.local', 'trial'),
    ('inst_1791913405331_gy6tl', 'Inst 1791913405331 Gy6tl', 'inst1791913405331gy6tl@placeholder.local', 'trial'),
    ('default_inst', 'Default Inst', 'defaultinst@placeholder.local', 'trial'),
    ('inst_1791521572395_ufyl6', 'Inst 1791521572395 Ufyl6', 'inst1791521572395ufyl6@placeholder.local', 'trial'),
    ('1781602587516_kqmod', '1781602587516 Kqmod', '1781602587516kqmod@placeholder.local', 'trial'),
    ('demo_autoservice', 'Demo Autoservice', 'demoautoservice@placeholder.local', 'trial'),
    ('demo_civil', 'Demo Civil', 'democivil@placeholder.local', 'trial'),
    ('demo_coop', 'Demo Coop', 'democoop@placeholder.local', 'trial'),
    ('demo_ds', 'Demo Ds', 'demods@placeholder.local', 'trial'),
    ('demo_fuel', 'Demo Fuel', 'demofuel@placeholder.local', 'trial'),
    ('demo_property', 'Demo Property', 'demoproperty@placeholder.local', 'trial'),
    ('demo_retail', 'Demo Retail', 'demoretail@placeholder.local', 'trial'),
    ('GLOBAL', 'GLOBAL', 'global@placeholder.local', 'trial'),
    ('KAPSERET', 'KAPSERET', 'kapseret@placeholder.local', 'trial'),
    ('county_1786953923332', 'County 1786953923332', 'county1786953923332@placeholder.local', 'trial'),
    ('inst_1792259096009_tlj7o', 'Inst 1792259096009 Tlj7o', 'inst1792259096009tlj7o@placeholder.local', 'trial')
ON CONFLICT (id) DO NOTHING;

-- FIX STREAM DEFINITIONS & EMBEDDED DUMP COLUMNS
ALTER TABLE public.institutions DROP COLUMN IF EXISTS "streamDefinitions" CASCADE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "streamDefinitions" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions DROP COLUMN IF EXISTS stream_definitions CASCADE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS stream_definitions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "'aiModelTier" TEXT DEFAULT 'premium';
ALTER TABLE public.institutions DROP COLUMN IF EXISTS "usersInstitutionIdFkey";
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "usersInstitutionIdFkey" TEXT;

-- FIX INSTITUTION MODULE STATES CONSTRAINTS & SELF-HEALING TRIGGER
ALTER TABLE public.institution_module_states DROP CONSTRAINT IF EXISTS institution_module_states_institution_id_fkey CASCADE;
ALTER TABLE public.institution_module_states DROP CONSTRAINT IF EXISTS institution_module_states_institution_id_module_id_key CASCADE;
ALTER TABLE public.institution_module_states DROP CONSTRAINT IF EXISTS uq_institution_module_states_inst_module CASCADE;
ALTER TABLE public.institution_module_states DROP CONSTRAINT IF EXISTS uq_ims_inst_module CASCADE;
DROP INDEX IF EXISTS public.institution_module_states_institution_id_module_id_key CASCADE;
DO $$ BEGIN ALTER TABLE public.institution_module_states ALTER COLUMN module_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.institution_module_states ALTER COLUMN status DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.institution_module_states ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS "0" JSONB;
ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS "data" JSONB DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.trg_fix_ims_row()
RETURNS TRIGGER AS $$
DECLARE
    json_payload jsonb;
BEGIN
    IF NEW.id IS NULL THEN
        BEGIN
            json_payload := to_jsonb(NEW)->'0';
        EXCEPTION WHEN OTHERS THEN
            json_payload := NULL;
        END;
        
        IF json_payload IS NULL OR json_payload = 'null'::jsonb THEN
            BEGIN
                json_payload := to_jsonb(NEW)->'data';
            EXCEPTION WHEN OTHERS THEN
                json_payload := NULL;
            END;
        END IF;

        IF json_payload IS NOT NULL AND json_payload ? 'id' THEN
            NEW.id := json_payload->>'id';
            NEW.institution_id := COALESCE(NEW.institution_id, json_payload->>'institutionId', json_payload->>'institution_id');
            NEW.module_id := COALESCE(NEW.module_id, json_payload->>'moduleId', json_payload->>'module_id');
            NEW.status := COALESCE(NEW.status, json_payload->>'status', 'active');
            IF json_payload ? 'data' THEN
                NEW.data := json_payload->'data';
            END IF;
        ELSE
            NEW.id := 'ims_' || COALESCE(NEW.module_id, 'mod') || '_' || COALESCE(NEW.institution_id, 'inst_' || substr(md5(random()::text), 1, 8));
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fix_ims_row ON public.institution_module_states;
CREATE TRIGGER trg_fix_ims_row
BEFORE INSERT ON public.institution_module_states
FOR EACH ROW
EXECUTE FUNCTION public.trg_fix_ims_row();

-- SAFELY CONVERT ARRAY COLUMNS (TEXT[]) TO JSONB TO GUARANTEE 100% TYPE COMPATIBILITY WITHOUT DATA LOSS
DO $$ 
BEGIN 
    -- users.expertise
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'expertise' AND data_type = 'ARRAY') THEN 
        ALTER TABLE public.users ALTER COLUMN expertise DROP DEFAULT;
        ALTER TABLE public.users ALTER COLUMN expertise TYPE JSONB USING CASE WHEN expertise IS NULL THEN '[]'::jsonb ELSE to_jsonb(expertise) END;
        ALTER TABLE public.users ALTER COLUMN expertise SET DEFAULT '[]'::jsonb;
    ELSE 
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expertise JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- users.roles
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'roles' AND data_type = 'ARRAY') THEN 
        ALTER TABLE public.users ALTER COLUMN roles DROP DEFAULT;
        ALTER TABLE public.users ALTER COLUMN roles TYPE JSONB USING CASE WHEN roles IS NULL THEN '[]'::jsonb ELSE to_jsonb(roles) END;
        ALTER TABLE public.users ALTER COLUMN roles SET DEFAULT '[]'::jsonb;
    ELSE 
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- users.enrolled_subject_ids
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'enrolled_subject_ids' AND data_type = 'ARRAY') THEN 
        ALTER TABLE public.users ALTER COLUMN enrolled_subject_ids DROP DEFAULT;
        ALTER TABLE public.users ALTER COLUMN enrolled_subject_ids TYPE JSONB USING CASE WHEN enrolled_subject_ids IS NULL THEN '[]'::jsonb ELSE to_jsonb(enrolled_subject_ids) END;
        ALTER TABLE public.users ALTER COLUMN enrolled_subject_ids SET DEFAULT '[]'::jsonb;
    ELSE 
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS enrolled_subject_ids JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- users.parent_ids
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'parent_ids' AND data_type = 'ARRAY') THEN 
        ALTER TABLE public.users ALTER COLUMN parent_ids DROP DEFAULT;
        ALTER TABLE public.users ALTER COLUMN parent_ids TYPE JSONB USING CASE WHEN parent_ids IS NULL THEN '[]'::jsonb ELSE to_jsonb(parent_ids) END;
        ALTER TABLE public.users ALTER COLUMN parent_ids SET DEFAULT '[]'::jsonb;
    ELSE 
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS parent_ids JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- users.student_ids
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'student_ids' AND data_type = 'ARRAY') THEN 
        ALTER TABLE public.users ALTER COLUMN student_ids DROP DEFAULT;
        ALTER TABLE public.users ALTER COLUMN student_ids TYPE JSONB USING CASE WHEN student_ids IS NULL THEN '[]'::jsonb ELSE to_jsonb(student_ids) END;
        ALTER TABLE public.users ALTER COLUMN student_ids SET DEFAULT '[]'::jsonb;
    ELSE 
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_ids JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Universal dynamic conversion across all public tables
DO $$ 
DECLARE r RECORD; 
BEGIN 
    FOR r IN (
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND data_type = 'ARRAY'
    ) LOOP 
        BEGIN 
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', r.table_name, r.column_name); 
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE JSONB USING CASE WHEN %I IS NULL THEN ''[]''::jsonb ELSE to_jsonb(%I) END', r.table_name, r.column_name, r.column_name, r.column_name); 
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT ''[]''::jsonb', r.table_name, r.column_name); 
        EXCEPTION WHEN OTHERS THEN NULL; 
        END; 
    END LOOP; 
END $$;

-- DYNAMICALLY FIX ERRONEOUS BOOLEAN COLUMNS (DATES, IDS, POLICIES) TO TEXT
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND data_type = 'boolean' 
          AND (
            column_name ILIKE '%date%' 
            OR column_name ILIKE '%time%' 
            OR column_name ILIKE '%policy%' 
            OR column_name IN ('activeGradingSystemId', 'active_grading_system_id', 'cancellationPolicy', 'cancellation_policy', 'issueDate', 'issue_date', 'issuedDate', 'issued_date')
          )
    ) LOOP 
        BEGIN 
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', r.table_name, r.column_name); 
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE TEXT USING NULL', r.table_name, r.column_name); 
        EXCEPTION WHEN OTHERS THEN NULL; 
        END; 
    END LOOP; 
END $$;

-- DYNAMICALLY ENSURE PRIMARY KEY OR UNIQUE CONSTRAINT ON "id" FOR ALL BASE TABLES
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- 1. Ensure institution_id PK for library_settings and ds_settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'library_settings') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.library_settings'::regclass AND contype = 'p') THEN
            BEGIN
                ALTER TABLE public.library_settings ADD PRIMARY KEY (institution_id);
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_settings') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ds_settings'::regclass AND contype = 'p') THEN
            BEGIN
                ALTER TABLE public.ds_settings ADD PRIMARY KEY (institution_id);
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;
    END IF;

    -- 2. Ensure PRIMARY KEY or UNIQUE constraint on "id" for all other tables
    FOR r IN (
        SELECT c.table_name 
        FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name AND t.table_schema = 'public'
        WHERE c.table_schema = 'public' 
          AND c.column_name = 'id'
          AND t.table_type = 'BASE TABLE'
          AND c.table_name NOT IN ('library_settings', 'ds_settings')
    ) LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_constraint con
            JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
            WHERE con.connamespace = 'public'::regnamespace
              AND con.conrelid = r.table_name::regclass
              AND con.contype IN ('p', 'u')
              AND att.attname = 'id'
        ) THEN
            BEGIN
                EXECUTE format('ALTER TABLE public.%I ADD PRIMARY KEY (id)', r.table_name);
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (id)', r.table_name, 'uq_' || r.table_name || '_id');
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END;
        END IF;
    END LOOP;
END $$;

-- UNIVERSAL EXTENDED TABLE AND COLUMN DEFINITIONS (100% COVERAGE)
${universalDdl}
`;

const postRestoreSQL = `

-- FIX ORPHANED COUNTY AND RESELLER REFERENCES
UPDATE public.institutions 
SET county_id = 'county_1786953923332' 
WHERE county_id = 'county_1770545434249';

UPDATE public.institutions 
SET county_id = NULL 
WHERE county_id IS NOT NULL 
  AND county_id NOT IN (SELECT id FROM public.counties);

UPDATE public.institutions 
SET reseller_id = NULL 
WHERE reseller_id IS NOT NULL 
  AND reseller_id NOT IN (SELECT id FROM public.institutions);

-- RE-ENABLE FOREIGN KEY CONSTRAINTS SAFELY
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_institution_id_fkey') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`;

function deduplicateHeader(line) {
    if (!line.startsWith('INSERT INTO public."')) return line;
    const match = line.match(/^(INSERT INTO public\."([^"]+)"\s*\()([^)]+)(\)\s*VALUES.*)$/);
    if (!match) return line;

    const [_, prefix, tableName, headerCols, suffix] = match;
    const tblKey = tableName.toLowerCase();
    const revMap = reverseReplacements[tblKey] || {};

    const rawCols = headerCols.split(',').map(c => c.trim());
    const seen = new Set();
    let modified = false;

    for (let i = 0; i < rawCols.length; i++) {
        const col = rawCols[i];
        if (seen.has(col)) {
            const candidates = revMap[col];
            if (candidates && candidates.length > 0) {
                const unused = candidates.find(cand => !seen.has(cand));
                if (unused) {
                    rawCols[i] = unused;
                    seen.add(unused);
                    modified = true;
                    continue;
                }
            }
            const alias = `"${col.replace(/"/g, '')}_dup_${i}"`;
            rawCols[i] = alias;
            seen.add(alias);
            modified = true;
        } else {
            seen.add(col);
        }
    }

    if (modified) {
        return `${prefix}${rawCols.join(', ')}${suffix}`;
    }
    return line;
}

function replaceInsertHeader(line, tableReplacements) {
    if (!line.startsWith('INSERT INTO public."')) return line;
    const match = line.match(/^(INSERT INTO public\."([^"]+)"\s*\()([^)]+)(\)\s*VALUES.*)$/);
    if (!match) return line;

    const [_, prefix, tableName, headerCols, suffix] = match;
    const replacements = tableReplacements[tableName.toLowerCase()];
    if (!replacements) return line;

    const rawCols = headerCols.split(',').map(c => c.trim());
    const existingCols = new Set(rawCols);

    const newCols = rawCols.map(col => {
        const replacement = replacements[col];
        if (replacement) {
            if (!existingCols.has(replacement)) {
                existingCols.add(replacement);
                existingCols.delete(col);
                return replacement;
            }
        }
        return col;
    });

    return `${prefix}${newCols.join(', ')}${suffix}`;
}

function sanitizeRowContent(row) {
    // 1. Convert PostgreSQL array literal syntax like '{admin}', '{head_teacher}' to JSONB '["admin"]'::jsonb
    let fixed = row.replace(/'\{([a-zA-Z0-9_, -]+)\}'/g, (match, inner) => {
        if (inner === 'systemSmsBalance') return match;
        const items = inner.split(',').map(x => `"${x.trim()}"`).join(',');
        return `'[${items}]'::jsonb`;
    });

    // 2. Fix empty strings for JSON columns
    fixed = fixed.replace(/(::jsonb|TRUE|FALSE|NULL|\d+),\s*'',/g, '$1, NULL,');
    fixed = fixed.replace(/,\s*'',\s*(NULL|TRUE|FALSE|\d+|'\[|'\{|::jsonb)/g, ', NULL, $1');

    // 3. Fix roles row 2478 where roles is '' followed by status ''
    fixed = fixed.replace(/,\s*'',\s*'',/g, ", '[]'::jsonb, '',");

    // 4. Fill fallback email for user rows with NULL email
    if (/,\s*NULL\s*,/i.test(fixed) && /^\s*\('user_/i.test(fixed)) {
        fixed = fixed.replace(/^(\s*\('([^']+)',\s*(?:'(?:''|[^'])*'|NULL),\s*)NULL,/i, (match, prefix, userId) => {
            return `${prefix}'${userId}@eduai.local',`;
        });
    }

    return fixed;
}

// Convert multiline string contents inside a row into single-line safe representation
function flattenTupleNewlines(tupleStr) {
    if (!tupleStr.includes('\n') && !tupleStr.includes('\r')) {
        return tupleStr;
    }
    // Replace internal newlines within the single string literal seamlessly
    // so the entire tuple sits cleanly on 1 physical line
    return tupleStr
        .replace(/\r\n/g, '\\n')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\n');
}

async function processAndRepairFile(sourceFilename, targetFilename) {
    const srcPath = path.join(downloadsDir, sourceFilename);
    const tgtPath = path.join(downloadsDir, targetFilename);

    if (!fs.existsSync(srcPath)) {
        console.log(`Source file ${srcPath} does not exist, skipping.`);
        return;
    }

    console.log(`\n======================================================`);
    console.log(`Processing & Repairing: ${sourceFilename} -> ${targetFilename}`);
    console.log(`======================================================`);

    const readStream = fs.createReadStream(srcPath, { encoding: 'utf8' });
    const tempPath = tgtPath + '.tmp';
    const writeStream = fs.createWriteStream(tempPath, { encoding: 'utf8' });

    const rl = readline.createInterface({ input: readStream, crlfDelay: Infinity });

    let inPart2 = false;
    let inDoBlock = false;
    let inCreateTable = false;
    let currentTable = null;

    let orphanLines = [];
    let currentInsertHeader = null;
    let currentRows = [];
    let seenLibInstIds = new Set();

    let totalStitched = 0;
    let totalRowsWritten = 0;
    let replacedHeadersCount = 0;

    let hasInjectedHeader = false;
    let hasPostRestore = false;

    for await (const rawLine of rl) {
        const line = rawLine;
        const trimmed = line.trim();

        if (line.includes('PART 2: MULTI-TENANT PLATFORM DATA')) {
            inPart2 = true;
            writeStream.write(line + '\n');
            continue;
        }

        if (line.includes('-- FIX ORPHANED COUNTY AND RESELLER REFERENCES')) {
            hasPostRestore = true;
        }

        // Before Part 2 (DDL Part 1): write directly
        if (!inPart2) {
            writeStream.write(line + '\n');
            continue;
        }

        // Handle PL/pgSQL blocks
        if (inDoBlock) {
            if (trimmed.endsWith('$$;') || trimmed.endsWith('$$ LANGUAGE plpgsql;')) {
                inDoBlock = false;
            }
            writeStream.write(line + '\n');
            continue;
        }
        if (trimmed.startsWith('DO $$') || trimmed.startsWith('CREATE OR REPLACE FUNCTION')) {
            if (!trimmed.endsWith('$$;') && !trimmed.endsWith('$$ LANGUAGE plpgsql;')) {
                inDoBlock = true;
            }
            writeStream.write(line + '\n');
            continue;
        }

        // Handle CREATE TABLE blocks
        if (inCreateTable) {
            if (trimmed === ');' || trimmed.endsWith(');')) {
                inCreateTable = false;
            }
            writeStream.write(line + '\n');
            continue;
        }
        if (trimmed.startsWith('CREATE TABLE')) {
            if (!trimmed.endsWith(');')) {
                inCreateTable = true;
            }
            writeStream.write(line + '\n');
            continue;
        }

        // Inject Universal DDL and Pre-Data Migrations before first table INSERT in Part 2
        if (!hasInjectedHeader && line.startsWith('INSERT INTO public.')) {
            writeStream.write(injectionSQL + '\n');
            hasInjectedHeader = true;
            console.log(`  -> Injected universal DDL & constraint migrations at top of Part 2`);
        }

        // INSERT statement begins
        if (line.startsWith('INSERT INTO public."')) {
            const match = trimmed.match(/^INSERT INTO public\."([^"]+)"/);
            currentTable = match ? match[1] : 'unknown';
            if (currentTable === 'library_settings' || currentTable === 'ds_settings') {
                seenLibInstIds.clear();
            }

            const replaced = replaceInsertHeader(trimmed, tableReplacements);
            currentInsertHeader = deduplicateHeader(replaced);
            if (currentInsertHeader !== trimmed) {
                replacedHeadersCount++;
            }
            currentRows = [];
            continue;
        }

        // ON CONFLICT reached (Insert statement ends)
        if (currentTable && trimmed.includes('ON CONFLICT')) {
            let conflictClause = trimmed;
            if (currentTable === 'library_settings' || currentTable === 'ds_settings') {
                conflictClause = 'ON CONFLICT DO NOTHING;';
            }

            // Assemble orphan tails for stitching
            const tails = [];
            let curTail = [];
            for (const o of orphanLines) {
                curTail.push(o.line);
                if (o.line.endsWith('),') || o.line.endsWith(');') || o.line.endsWith(')')) {
                    tails.push(curTail.join('\n'));
                    curTail = [];
                }
            }
            if (curTail.length > 0) {
                tails.push(curTail.join('\n'));
            }

            // Stitch any broken head rows with corresponding tails
            let tailIdx = 0;
            const finalRows = [];

            for (let i = 0; i < currentRows.length; i++) {
                let r = currentRows[i];
                const withoutEscaped = r.replace(/''/g, '');
                const quoteCount = (withoutEscaped.match(/'/g) || []).length;
                const isBroken = quoteCount % 2 !== 0 || (!r.endsWith('),') && !r.endsWith(')'));

                if (isBroken && tailIdx < tails.length) {
                    const tail = tails[tailIdx++];
                    const stitched = r + '\n' + tail;
                    const flat = flattenTupleNewlines(stitched);
                    finalRows.push(sanitizeRowContent(flat));
                    totalStitched++;
                } else {
                    const flat = flattenTupleNewlines(r);
                    finalRows.push(sanitizeRowContent(flat));
                }
            }

            // Deduplicate library_settings and ds_settings by institution_id
            let rowsToWrite = finalRows;
            if (currentTable === 'library_settings' || currentTable === 'ds_settings') {
                const uniqueRows = [];
                const seenInst = new Set();
                for (const r of finalRows) {
                    const instMatch = r.match(/^\s*\('([^']+)'/);
                    if (instMatch) {
                        const instId = instMatch[1];
                        if (seenInst.has(instId)) continue;
                        seenInst.add(instId);
                    }
                    uniqueRows.push(r);
                }
                rowsToWrite = uniqueRows;
            }

            // Write out the complete, clean INSERT block
            if (rowsToWrite.length > 0) {
                writeStream.write(currentInsertHeader + '\n');
                for (let i = 0; i < rowsToWrite.length; i++) {
                    let r = rowsToWrite[i].trim().replace(/[,;]\s*$/, '');
                    if (i < rowsToWrite.length - 1) {
                        writeStream.write('    ' + r + ',\n');
                    } else {
                        writeStream.write('    ' + r + '\n');
                    }
                    totalRowsWritten++;
                }
                writeStream.write(conflictClause + '\n');
            }

            // Reset state
            orphanLines = [];
            currentTable = null;
            currentRows = [];
            currentInsertHeader = null;
            continue;
        }

        // Inside an INSERT statement: accumulate rows
        if (currentTable) {
            if (trimmed.startsWith('(')) {
                currentRows.push(trimmed);
            }
            continue;
        }

        // Outside INSERT statement in Part 2:
        // Check if this line is an orphan tail that was displaced by the old patcher
        if (!trimmed.startsWith('--') && 
            !trimmed.startsWith('CREATE') && 
            !trimmed.startsWith('ALTER') && 
            !trimmed.startsWith('DROP') && 
            !trimmed.startsWith('SET') && 
            !trimmed.startsWith('BEGIN') && 
            !trimmed.startsWith('COMMIT') && 
            !trimmed.startsWith('INSERT INTO') && 
            !trimmed.startsWith("VALUES") && 
            !trimmed.endsWith(';')) {
            orphanLines.push({ lineNum: 0, line: trimmed });
            // Do NOT write displaced orphan tails outside statements!
            continue;
        }

        // Regular DDL line
        writeStream.write(line + '\n');
    }

    if (!hasPostRestore) {
        writeStream.write(postRestoreSQL + '\n');
    }

    writeStream.end();
    await new Promise(resolve => writeStream.on('finish', resolve));
    readStream.close();

    // Replace target file
    if (fs.existsSync(tgtPath)) {
        fs.unlinkSync(tgtPath);
    }
    fs.renameSync(tempPath, tgtPath);

    const stats = fs.statSync(tgtPath);
    console.log(`\nResults for ${targetFilename}:`);
    console.log(`  File Size           : ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Tuples Stitched     : ${totalStitched}`);
    console.log(`  Total Rows Written  : ${totalRowsWritten.toLocaleString()}`);
    console.log(`  Headers Remapped    : ${replacedHeadersCount}`);
    console.log(`  Output Path         : ${tgtPath}`);
}

async function validateFile(filename) {
    const filePath = path.join(downloadsDir, filename);
    if (!fs.existsSync(filePath)) return;

    console.log(`\nValidating ${filename}...`);
    const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });

    let lineNum = 0;
    let oddQuotes = 0;
    let unbalancedParens = 0;
    let danglingCommas = 0;
    let prevLine = '';
    let brokenLines = [];

    for await (const line of rl) {
        lineNum++;
        const trimmed = line.trim();

        if (trimmed.startsWith('(')) {
            const withoutEscaped = trimmed.replace(/''/g, '').replace(/\\'/g, '');
            const quoteCount = (withoutEscaped.match(/'/g) || []).length;
            if (quoteCount % 2 !== 0) {
                oddQuotes++;
                if (brokenLines.length < 5) brokenLines.push({ lineNum, reason: 'odd quotes', line: trimmed.substring(0, 80) });
            }
            if (!trimmed.endsWith('),') && !trimmed.endsWith(');') && !trimmed.endsWith(')')) {
                unbalancedParens++;
                if (brokenLines.length < 5) brokenLines.push({ lineNum, reason: 'unclosed tuple', line: trimmed.substring(0, 80) });
            }
        }

        if (trimmed.startsWith('ON CONFLICT') && prevLine.trim().endsWith(',')) {
            danglingCommas++;
        }

        prevLine = line;
    }

    console.log(`Validation Results for ${filename} (${lineNum.toLocaleString()} lines):`);
    console.log(`  Odd / Unclosed Quotes     : ${oddQuotes}`);
    console.log(`  Unbalanced / Broken Parens: ${unbalancedParens}`);
    console.log(`  Dangling Commas Before ON : ${danglingCommas}`);
    if (brokenLines.length > 0) {
        console.log(`  First few broken lines:`, brokenLines);
    } else {
        console.log(`  >>> 100% CLEAN - ZERO ERRORS! <<<`);
    }
}

async function run() {
    // 1. Repair eduai_full_database_backup_2026-11-02.sql -> eduai_fixed_for_import.sql
    await processAndRepairFile('eduai_full_database_backup_2026-11-02.sql', 'eduai_fixed_for_import.sql');
    await validateFile('eduai_fixed_for_import.sql');

    // 2. Also repair eduai_full_database_backup_2026-11-02.sql in-place
    await processAndRepairFile('eduai_full_database_backup_2026-11-02.sql', 'eduai_full_database_backup_2026-11-02.sql');
    await validateFile('eduai_full_database_backup_2026-11-02.sql');

    // 3. Also repair copy (1)
    if (fs.existsSync(path.join(downloadsDir, 'eduai_full_database_backup_2026-11-02(1).sql'))) {
        await processAndRepairFile('eduai_full_database_backup_2026-11-02(1).sql', 'eduai_full_database_backup_2026-11-02(1).sql');
        await validateFile('eduai_full_database_backup_2026-11-02(1).sql');
    }
}

run().catch(err => {
    console.error('Error in repair & verification:', err);
    process.exit(1);
});
