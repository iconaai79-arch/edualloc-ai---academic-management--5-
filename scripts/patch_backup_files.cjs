const fs = require('fs');
const path = require('path');
const readline = require('readline');

const downloadsDir = 'C:\\Users\\hp\\Downloads';
const filesToPatch = [
    'eduai_full_database_backup_READY_FOR_IMPORT.sql',
    'eduai_fixed_for_import.sql',
    'eduai_full_database_backup_2026-10-30.sql',
    'eduai_full_database_backup_2026-10-30 (1).sql',
    'eduai_full_database_backup_2026-10-30 (2).sql'
];

const replacementsPath = path.join(__dirname, 'table_col_replacements.json');
const tableReplacements = fs.existsSync(replacementsPath) ? JSON.parse(fs.readFileSync(replacementsPath, 'utf8')) : {};

const universalDdlPath = path.join(__dirname, 'generated_universal_ddl.sql');
const universalDdl = fs.existsSync(universalDdlPath) ? fs.readFileSync(universalDdlPath, 'utf8') : '';

const injectionSQL = `
-- FIX INSTITUTION AND DEPENDENT FOREIGN KEYS FOR DATA RESTORE
ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_reseller_id_fkey;
ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_county_id_fkey;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_institution_id_fkey;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_department_id_fkey;
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_department_id_fkey;
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_department_id_fkey;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_building_id_fkey;
DO $$ BEGIN ALTER TABLE public.users ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- INSERT MISSING / DEMO INSTITUTIONS TO SATISFY FOREIGN KEY CONSTRAINTS ACROSS ALL 27 TABLES
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
    ('sch_knec_25551244', 'Sch Knec 25551244', 'schknec25551244@placeholder.local', 'trial'),
    ('sch_knec_26577137', 'Sch Knec 26577137', 'schknec26577137@placeholder.local', 'trial'),
    ('sch_knec_26578003', 'Sch Knec 26578003', 'schknec26578003@placeholder.local', 'trial'),
    ('sch_knec_26578005', 'Sch Knec 26578005', 'schknec26578005@placeholder.local', 'trial'),
    ('sch_knec_33517209', 'Sch Knec 33517209', 'schknec33517209@placeholder.local', 'trial'),
    ('GLOBAL', 'GLOBAL', 'global@placeholder.local', 'trial'),
    ('KAPSERET', 'KAPSERET', 'kapseret@placeholder.local', 'trial'),
    ('inst_1770486388875_r8ist', 'Inst 1770486388875 R8ist', 'inst1770486388875r8ist@placeholder.local', 'trial'),
    ('inst_1769348188501_rvoxm', 'Inst 1769348188501 Rvoxm', 'inst1769348188501rvoxm@placeholder.local', 'trial'),
    ('county_1786953923332', 'County 1786953923332', 'county1786953923332@placeholder.local', 'trial'),
    ('inst_1772523035394_7k9se', 'Inst 1772523035394 7k9se', 'inst17725230353947k9se@placeholder.local', 'trial'),
    ('inst_1785181082476_eiy0k', 'Inst 1785181082476 Eiy0k', 'inst1785181082476eiy0k@placeholder.local', 'trial'),
    ('inst_1787071694218_p64ub', 'Inst 1787071694218 P64ub', 'inst1787071694218p64ub@placeholder.local', 'trial'),
    ('county_1787230534995', 'County 1787230534995', 'county1787230534995@placeholder.local', 'trial'),
    ('inst_1788944502601_e4li8', 'Inst 1788944502601 E4li8', 'inst1788944502601e4li8@placeholder.local', 'trial'),
    ('demo_coop_9vr5earpe', 'Demo Coop 9vr5earpe', 'democoop9vr5earpe@placeholder.local', 'trial'),
    ('demo_coop_t3t6snx7s', 'Demo Coop T3t6snx7s', 'democoopt3t6snx7s@placeholder.local', 'trial'),
    ('demo_coop_unubxygq1', 'Demo Coop Unubxygq1', 'democoopunubxygq1@placeholder.local', 'trial'),
    ('demo_edu_7q6le23sv', 'Demo Edu 7q6le23sv', 'demoedu7q6le23sv@placeholder.local', 'trial'),
    ('demo_edu_f6raq10ne', 'Demo Edu F6raq10ne', 'demoeduf6raq10ne@placeholder.local', 'trial'),
    ('demo_edu_k77u3mt4o', 'Demo Edu K77u3mt4o', 'demoeduk77u3mt4o@placeholder.local', 'trial'),
    ('demo_edu_n2zfnzyhz', 'Demo Edu N2zfnzyhz', 'demoedun2zfnzyhz@placeholder.local', 'trial'),
    ('demo_edu_o55rx5qs0', 'Demo Edu O55rx5qs0', 'demoeduo55rx5qs0@placeholder.local', 'trial'),
    ('demo_edu_rk8vimyoa', 'Demo Edu Rk8vimyoa', 'demoedurk8vimyoa@placeholder.local', 'trial'),
    ('demo_edu_s9ngfxdpw', 'Demo Edu S9ngfxdpw', 'demoedus9ngfxdpw@placeholder.local', 'trial'),
    ('demo_edu_uc2klfhxd', 'Demo Edu Uc2klfhxd', 'demoeduuc2klfhxd@placeholder.local', 'trial'),
    ('demo_edu_uw1cepdqu', 'Demo Edu Uw1cepdqu', 'demoeduuw1cepdqu@placeholder.local', 'trial'),
    ('demo_fuel_svz2663b7', 'Demo Fuel Svz2663b7', 'demofuelsvz2663b7@placeholder.local', 'trial'),
    ('demo_his_2l4rq3tym', 'Demo His 2l4rq3tym', 'demohis2l4rq3tym@placeholder.local', 'trial'),
    ('demo_his_6dwt61wjq', 'Demo His 6dwt61wjq', 'demohis6dwt61wjq@placeholder.local', 'trial'),
    ('demo_logistics_ed7eiw62e', 'Demo Logistics Ed7eiw62e', 'demologisticsed7eiw62e@placeholder.local', 'trial'),
    ('demo_parent_portal_uhxfsh6aj', 'Demo Parent Portal Uhxfsh6aj', 'demoparentportaluhxfsh6aj@placeholder.local', 'trial'),
    ('demo_property_ehqsnliqg', 'Demo Property Ehqsnliqg', 'demopropertyehqsnliqg@placeholder.local', 'trial'),
    ('demo_retail_cljivnlkf', 'Demo Retail Cljivnlkf', 'demoretailcljivnlkf@placeholder.local', 'trial'),
    ('demo_retail_q2hpgiu07', 'Demo Retail Q2hpgiu07', 'demoretailq2hpgiu07@placeholder.local', 'trial'),
    ('demo_retail_x8570mail', 'Demo Retail X8570mail', 'demoretailx8570mail@placeholder.local', 'trial'),
    ('inst_1790411490864_b86an', 'Inst 1790411490864 B86an', 'inst1790411490864b86an@placeholder.local', 'trial'),
    ('CHANGAMWE', 'CHANGAMWE', 'changamwe@placeholder.local', 'trial'),
    ('inst_1769349351692_pm077', 'Inst 1769349351692 Pm077', 'inst1769349351692pm077@placeholder.local', 'trial'),
    ('INST001', 'INST001', 'inst001@placeholder.local', 'trial'),
    ('inst_6ed131dc-3498-437b-9082-76d93b481ffa', 'Inst 6ed131dc-3498-437b-9082-76d93b481ffa', 'inst6ed131dc3498437b908276d93b481ffa@placeholder.local', 'trial'),
    ('inst_demo_coop_9vr5earpe', 'Inst Demo Coop 9vr5earpe', 'instdemocoop9vr5earpe@placeholder.local', 'trial'),
    ('inst_demo_coop_unubxygq1', 'Inst Demo Coop Unubxygq1', 'instdemocoopunubxygq1@placeholder.local', 'trial'),
    ('inst_GLOBAL', 'Inst GLOBAL', 'instglobal@placeholder.local', 'trial')
ON CONFLICT (id) DO NOTHING;

-- FIX STREAM DEFINITIONS & EMBEDDED DUMP COLUMNS
ALTER TABLE public.institutions DROP COLUMN IF EXISTS "streamDefinitions" CASCADE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "streamDefinitions" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions DROP COLUMN IF EXISTS stream_definitions CASCADE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS stream_definitions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "'aiModelTier" TEXT DEFAULT 'premium';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "usersInstitutionIdFkey" JSONB;

-- FIX INSTITUTION MODULE STATES CONSTRAINTS
DO $$ BEGIN ALTER TABLE public.institution_module_states ALTER COLUMN module_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.institution_module_states ALTER COLUMN status DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.institution_module_states ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.institution_module_states DROP CONSTRAINT IF EXISTS institution_module_states_institution_id_module_id_key;
-- DROP AND RECREATE ARRAY COLUMNS AS JSONB TO GUARANTEE 100% TYPE COMPATIBILITY WITH JSONB LITERALS
ALTER TABLE public.users DROP COLUMN IF EXISTS expertise CASCADE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expertise JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users DROP COLUMN IF EXISTS roles CASCADE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users DROP COLUMN IF EXISTS enrolled_subject_ids CASCADE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS enrolled_subject_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users DROP COLUMN IF EXISTS parent_ids CASCADE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS parent_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users DROP COLUMN IF EXISTS student_ids CASCADE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_ids JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.rooms DROP COLUMN IF EXISTS equipment CASCADE;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS equipment JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.allocation_requests DROP COLUMN IF EXISTS course_level_ids CASCADE;
ALTER TABLE public.allocation_requests ADD COLUMN IF NOT EXISTS course_level_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.allocation_requests DROP COLUMN IF EXISTS subject_ids CASCADE;
ALTER TABLE public.allocation_requests ADD COLUMN IF NOT EXISTS subject_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.carwash_jobs DROP COLUMN IF EXISTS add_ons CASCADE;
ALTER TABLE public.carwash_jobs ADD COLUMN IF NOT EXISTS add_ons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.pm_listings DROP COLUMN IF EXISTS images CASCADE;
ALTER TABLE public.pm_listings ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.pm_listings DROP COLUMN IF EXISTS features CASCADE;
ALTER TABLE public.pm_listings ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.his_patients DROP COLUMN IF EXISTS allergies CASCADE;
ALTER TABLE public.his_patients ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.his_patients DROP COLUMN IF EXISTS chronic_conditions CASCADE;
ALTER TABLE public.his_patients ADD COLUMN IF NOT EXISTS chronic_conditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.his_prescriptions DROP COLUMN IF EXISTS attached_files CASCADE;
ALTER TABLE public.his_prescriptions ADD COLUMN IF NOT EXISTS attached_files JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.car_sales_listings DROP COLUMN IF EXISTS gallery_urls CASCADE;
ALTER TABLE public.car_sales_listings ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.car_appraisals DROP COLUMN IF EXISTS images CASCADE;
ALTER TABLE public.car_appraisals ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.synergy_posts DROP COLUMN IF EXISTS likes CASCADE;
ALTER TABLE public.synergy_posts ADD COLUMN IF NOT EXISTS likes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.synergy_posts DROP COLUMN IF EXISTS student_ids CASCADE;
ALTER TABLE public.synergy_posts ADD COLUMN IF NOT EXISTS student_ids JSONB DEFAULT '[]'::jsonb;

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

-- SYNC BRANCHES CAMELCASE COLUMNS TO SNAKE_CASE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='branches' AND column_name='institutionId') THEN
        UPDATE public.branches SET institution_id = COALESCE(institution_id, "institutionId") WHERE institution_id IS NULL AND "institutionId" IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='branches' AND column_name='createdAt') THEN
        UPDATE public.branches SET created_at = COALESCE(created_at, "createdAt") WHERE created_at IS NULL AND "createdAt" IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='branches' AND column_name='updatedAt') THEN
        UPDATE public.branches SET updated_at = COALESCE(updated_at, "updatedAt") WHERE updated_at IS NULL AND "updatedAt" IS NOT NULL;
    END IF;
END $$;

-- SYNC AND POPULATE MODULE_ID FOR INSTITUTION_MODULE_STATES
UPDATE public.institution_module_states 
SET module_id = regexp_replace(regexp_replace(id, '^ims_', ''), '_inst_.*$', '')
WHERE module_id IS NULL OR module_id = '';

-- RE-ENABLE INSTITUTION FOREIGN KEY CONSTRAINTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'institutions_county_id_fkey'
    ) THEN
        ALTER TABLE public.institutions 
        ADD CONSTRAINT institutions_county_id_fkey 
        FOREIGN KEY (county_id) REFERENCES public.counties(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'institutions_reseller_id_fkey'
    ) THEN
        ALTER TABLE public.institutions 
        ADD CONSTRAINT institutions_reseller_id_fkey 
        FOREIGN KEY (reseller_id) REFERENCES public.institutions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- CLEAN UP ORPHANED FOREIGN KEYS BEFORE RE-ENABLING CONSTRAINTS
UPDATE public.users SET department_id = NULL WHERE department_id IS NOT NULL AND department_id NOT IN (SELECT id FROM public.departments);
UPDATE public.courses SET department_id = NULL WHERE department_id IS NOT NULL AND department_id NOT IN (SELECT id FROM public.departments);
UPDATE public.subjects SET department_id = NULL WHERE department_id IS NOT NULL AND department_id NOT IN (SELECT id FROM public.departments);
UPDATE public.rooms SET building_id = NULL WHERE building_id IS NOT NULL AND building_id NOT IN (SELECT id FROM public.buildings);

-- RE-ENABLE FOREIGN KEY CONSTRAINTS SAFELY
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_institution_id_fkey') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_department_id_fkey') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_department_id_fkey') THEN
        ALTER TABLE public.courses ADD CONSTRAINT courses_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subjects_department_id_fkey') THEN
        ALTER TABLE public.subjects ADD CONSTRAINT subjects_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rooms_building_id_fkey') THEN
        ALTER TABLE public.rooms ADD CONSTRAINT rooms_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`;

function fixEmptyStringForJson(line) {
    if (!line.includes("''")) return line;
    let fixed = line.replace(/(::jsonb|TRUE|FALSE|NULL|\d+),\s*'',/g, '$1, NULL,');
    fixed = fixed.replace(/,\s*'',\s*(NULL|TRUE|FALSE|\d+|'\[|'\{|::jsonb)/g, ', NULL, $1');
    return fixed;
}

function fixImsLine(line) {
    if (!line.includes("'ims_") || !line.includes(", NULL,")) return line;
    return line.replace(/\('ims_([a-zA-Z0-9_]+?)_inst_([a-zA-Z0-9_]+?)',\s*'inst_([a-zA-Z0-9_]+?)',\s*NULL,/g, (match, moduleName, instSuffix, instSuffix2) => {
        return `('ims_${moduleName}_inst_${instSuffix}', 'inst_${instSuffix2}', '${moduleName}',`;
    });
}

function fixRolesLine(line) {
    if (!line.trim().startsWith('(')) return line;

    // 1. Convert PostgreSQL array literal syntax like '{admin}', '{head_teacher}', etc. to JSONB array '["admin"]'::jsonb
    let fixed = line.replace(/'\{([a-zA-Z0-9_, -]+)\}'/g, (match, inner) => {
        if (inner === 'systemSmsBalance') return match;
        const items = inner.split(',').map(x => `"${x.trim()}"`).join(',');
        return `'[${items}]'::jsonb`;
    });

    // 2. Handle empty string in roles (row 2478 where roles is '' followed by status '')
    fixed = fixed.replace(/,\s*'',\s*'',/g, ", '[]'::jsonb, '',");

    return fixed;
}

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
            // Only replace if the replacement column is NOT already present in this header!
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

async function patchFile(filename) {
    const filePath = path.join(downloadsDir, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${filename} (not found)`);
        return;
    }

    console.log(`Patching ${filename}...`);
    const tempPath = path.join(downloadsDir, `${filename}.tmp`);
    const readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const writeStream = fs.createWriteStream(tempPath, { encoding: 'utf8' });

    const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity
    });

    let patchedInsert = false;
    let replacedDefinitions = 0;
    let fixedJsonEmptyStrings = 0;
    let replacedOrphanCounties = 0;
    let replacedInsertHeaders = 0;
    let fixedImsRows = 0;
    let fixedRolesRows = 0;

    for await (let line of rl) {
        if (line.includes('stream_definitions TEXT[] DEFAULT')) {
            line = line.replace('stream_definitions TEXT[] DEFAULT \'{}\'', 'stream_definitions JSONB DEFAULT \'[]\'::jsonb');
            replacedDefinitions++;
        }

        if (line.includes('expertise TEXT[]')) {
            line = line.replace('expertise TEXT[]', 'expertise JSONB DEFAULT \'[]\'::jsonb');
            replacedDefinitions++;
        }

        if (line.includes("roles TEXT[] DEFAULT '{}'")) {
            line = line.replace("roles TEXT[] DEFAULT '{}'", 'roles JSONB DEFAULT \'[]\'::jsonb');
            replacedDefinitions++;
        }

        if (line.includes("enrolled_subject_ids TEXT[] DEFAULT '{}'")) {
            line = line.replace("enrolled_subject_ids TEXT[] DEFAULT '{}'", 'enrolled_subject_ids JSONB DEFAULT \'[]\'::jsonb');
            replacedDefinitions++;
        }

        if (line.includes("parent_ids TEXT[] DEFAULT '{}'")) {
            line = line.replace("parent_ids TEXT[] DEFAULT '{}'", 'parent_ids JSONB DEFAULT \'[]\'::jsonb');
            replacedDefinitions++;
        }

        if (line.includes("student_ids TEXT[] DEFAULT '{}'")) {
            line = line.replace("student_ids TEXT[] DEFAULT '{}'", 'student_ids JSONB DEFAULT \'[]\'::jsonb');
            replacedDefinitions++;
        }

        if (line.includes('reseller_id TEXT REFERENCES institutions(id)')) {
            line = line.replace('reseller_id TEXT REFERENCES institutions(id) ON DELETE SET NULL', 'reseller_id TEXT');
        }

        if (line.includes('county_id TEXT REFERENCES counties(id)')) {
            line = line.replace('county_id TEXT REFERENCES counties(id) ON DELETE SET NULL', 'county_id TEXT');
        }

        if (line.includes('institution_id TEXT NOT NULL REFERENCES institutions(id)')) {
            line = line.replace('institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE', 'institution_id TEXT');
            line = line.replace('institution_id TEXT NOT NULL REFERENCES institutions(id)', 'institution_id TEXT');
        }

        if (line.includes('institution_id TEXT REFERENCES institutions(id)')) {
            line = line.replace('institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE', 'institution_id TEXT');
            line = line.replace('institution_id TEXT REFERENCES institutions(id) ON DELETE SET NULL', 'institution_id TEXT');
            line = line.replace('institution_id TEXT REFERENCES institutions(id)', 'institution_id TEXT');
        }

        if (line.includes('county_1770545434249')) {
            line = line.replace(/county_1770545434249/g, 'county_1786953923332');
            replacedOrphanCounties++;
        }

        if (!patchedInsert && line.startsWith('INSERT INTO public.')) {
            writeStream.write(injectionSQL + '\n');
            patchedInsert = true;
            console.log(`  -> Injected universal DDL before first INSERT statement (${line.substring(0, 50)})`);
        }

        if (line.startsWith('INSERT INTO public."')) {
            const replaced = replaceInsertHeader(line, tableReplacements);
            const deduped = deduplicateHeader(replaced);
            if (deduped !== line) {
                line = deduped;
                replacedInsertHeaders++;
            }
        }

        if (line.includes("'ims_")) {
            const fixed = fixImsLine(line);
            if (fixed !== line) {
                line = fixed;
                fixedImsRows++;
            }
        }

        if (line.includes("'{") || line.includes("''")) {
            const fixed = fixRolesLine(line);
            if (fixed !== line) {
                line = fixed;
                fixedRolesRows++;
            }
        }

        if (line.includes("''")) {
            const fixed = fixEmptyStringForJson(line);
            if (fixed !== line) {
                line = fixed;
                fixedJsonEmptyStrings++;
            }
        }

        writeStream.write(line + '\n');
    }

    writeStream.write(postRestoreSQL + '\n');
    writeStream.end();

    await new Promise((resolve) => writeStream.on('finish', resolve));
    readStream.close();

    fs.unlinkSync(filePath);
    fs.renameSync(tempPath, filePath);
    console.log(`Successfully patched ${filename} (definitions replaced: ${replacedDefinitions}, headers remapped: ${replacedInsertHeaders}, ims rows populated: ${fixedImsRows}, roles/arrays converted to JSONB: ${fixedRolesRows}, empty JSON strings fixed: ${fixedJsonEmptyStrings}, orphan counties mapped: ${replacedOrphanCounties})`);
}

async function run() {
    console.log(`Loaded ${Object.keys(tableReplacements).length} table column replacement definitions.`);
    console.log(`Loaded universal DDL statements.`);
    for (const file of filesToPatch) {
        await patchFile(file);
    }
    console.log('All backup files patched successfully!');
}

run().catch(err => {
    console.error('Error patching files:', err);
    process.exit(1);
});
