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
-- FIX INSTITUTION FOREIGN KEYS FOR DATA RESTORE
ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_reseller_id_fkey;
ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_county_id_fkey;

-- FIX STREAM DEFINITIONS & EMBEDDED DUMP COLUMNS
ALTER TABLE public.institutions DROP COLUMN IF EXISTS "streamDefinitions" CASCADE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "streamDefinitions" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions DROP COLUMN IF EXISTS stream_definitions CASCADE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS stream_definitions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "'aiModelTier" TEXT DEFAULT 'premium';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "usersInstitutionIdFkey" JSONB;

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
`;

function fixEmptyStringForJson(line) {
    if (!line.includes("''")) return line;
    let fixed = line.replace(/(::jsonb|TRUE|FALSE|NULL|\d+),\s*'',/g, '$1, NULL,');
    fixed = fixed.replace(/,\s*'',\s*(NULL|TRUE|FALSE|\d+|'\[|'\{|::jsonb)/g, ', NULL, $1');
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

    for await (let line of rl) {
        if (line.includes('stream_definitions TEXT[] DEFAULT')) {
            line = line.replace('stream_definitions TEXT[] DEFAULT \'{}\'', 'stream_definitions JSONB DEFAULT \'[]\'::jsonb');
            replacedDefinitions++;
        }

        if (line.includes('reseller_id TEXT REFERENCES institutions(id)')) {
            line = line.replace('reseller_id TEXT REFERENCES institutions(id) ON DELETE SET NULL', 'reseller_id TEXT');
        }

        if (line.includes('county_id TEXT REFERENCES counties(id)')) {
            line = line.replace('county_id TEXT REFERENCES counties(id) ON DELETE SET NULL', 'county_id TEXT');
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
    console.log(`Successfully patched ${filename} (definitions replaced: ${replacedDefinitions}, headers remapped: ${replacedInsertHeaders}, empty JSON strings fixed: ${fixedJsonEmptyStrings}, orphan counties mapped: ${replacedOrphanCounties})`);
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
