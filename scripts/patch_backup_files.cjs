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

const injectionSQL = `
-- FIX RESELLER SELF-REFERENCING FOREIGN KEY FOR DATA RESTORE
ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_reseller_id_fkey;

-- FIX STREAM DEFINITIONS & EMBEDDED DUMP COLUMNS
ALTER TABLE public.institutions DROP COLUMN IF EXISTS "streamDefinitions" CASCADE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "streamDefinitions" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions DROP COLUMN IF EXISTS stream_definitions CASCADE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS stream_definitions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "'aiModelTier" TEXT DEFAULT 'premium';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "usersInstitutionIdFkey" JSONB;
`;

const postRestoreSQL = `

-- RE-ENABLE RESELLER FOREIGN KEY CONSTRAINT ONCE ALL DATA IS RESTORED
DO $$
BEGIN
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

    for await (let line of rl) {
        if (line.includes('stream_definitions TEXT[] DEFAULT')) {
            line = line.replace('stream_definitions TEXT[] DEFAULT \'{}\'', 'stream_definitions JSONB DEFAULT \'[]\'::jsonb');
            replacedDefinitions++;
        }

        if (line.includes('reseller_id TEXT REFERENCES institutions(id)')) {
            line = line.replace('reseller_id TEXT REFERENCES institutions(id) ON DELETE SET NULL', 'reseller_id TEXT');
        }

        if (!patchedInsert && line.includes('INSERT INTO public."institutions"')) {
            writeStream.write(injectionSQL + '\n');
            patchedInsert = true;
            console.log(`  -> Injected DDL before INSERT INTO public."institutions"`);
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
    console.log(`Successfully patched ${filename} (definitions replaced: ${replacedDefinitions}, empty JSON strings fixed: ${fixedJsonEmptyStrings})`);
}

async function run() {
    for (const file of filesToPatch) {
        await patchFile(file);
    }
    console.log('All backup files patched successfully!');
}

run().catch(err => {
    console.error('Error patching files:', err);
    process.exit(1);
});
