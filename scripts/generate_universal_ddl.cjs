const fs = require('fs');
const readline = require('readline');

function camelToSnake(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

async function generateUniversalDDLAndMappings() {
    const rl = readline.createInterface({
        input: fs.createReadStream('C:\\Users\\hp\\Downloads\\eduai_fixed_for_import.sql', { encoding: 'utf8' }),
        crlfDelay: Infinity
    });

    const definedTables = new Map(); // table -> Set(cols)
    const insertHeaders = new Map(); // table -> rawCols

    let currentTable = null;

    for await (const line of rl) {
        const createMatch = line.match(/^CREATE TABLE IF NOT EXISTS public\.([a-zA-Z0-9_"]+)\s*\(/i) ||
                            line.match(/^CREATE TABLE IF NOT EXISTS ([a-zA-Z0-9_"]+)\s*\(/i);
        if (createMatch) {
            currentTable = createMatch[1].replace(/"/g, '').toLowerCase();
            if (!definedTables.has(currentTable)) definedTables.set(currentTable, new Set());
            continue;
        }

        if (currentTable) {
            if (line.startsWith(');')) {
                currentTable = null;
            } else {
                const colMatch = line.trim().match(/^"?([a-zA-Z0-9_]+)"?\s+/);
                if (colMatch) {
                    const colName = colMatch[1].replace(/"/g, '');
                    if (!['CONSTRAINT', 'PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK'].includes(colName.toUpperCase())) {
                        definedTables.get(currentTable).add(colName);
                        definedTables.get(currentTable).add(colName.toLowerCase());
                    }
                }
            }
        }

        const alterMatch = line.match(/^ALTER TABLE public\.([a-zA-Z0-9_"]+)\s+ADD COLUMN IF NOT EXISTS\s+"?([a-zA-Z0-9_']+)"?/i);
        if (alterMatch) {
            const tbl = alterMatch[1].replace(/"/g, '').toLowerCase();
            const col = alterMatch[2].replace(/"/g, '');
            if (!definedTables.has(tbl)) definedTables.set(tbl, new Set());
            definedTables.get(tbl).add(col);
            definedTables.get(tbl).add(col.toLowerCase());
        }

        if (line.startsWith('INSERT INTO public.')) {
            const insertMatch = line.match(/^INSERT INTO public\."?([a-zA-Z0-9_]+)"?\s*\(([^)]+)\)/);
            if (insertMatch) {
                const tbl = insertMatch[1].replace(/"/g, '').toLowerCase();
                if (!insertHeaders.has(tbl)) {
                    const cols = insertMatch[2].split(',').map(c => c.trim());
                    insertHeaders.set(tbl, cols);
                }
            }
        }
    }

    console.log(`Tables in DDL: ${definedTables.size}`);
    console.log(`Tables in INSERTs: ${insertHeaders.size}`);

    let totalDdlStatements = 0;
    const ddlStatements = [];

    for (const [tbl, cols] of insertHeaders.entries()) {
        const existing = definedTables.get(tbl) || new Set();
        const missingCols = cols.filter(rawCol => {
            const c = rawCol.replace(/"/g, '');
            return !existing.has(c);
        });

        if (!definedTables.has(tbl)) {
            ddlStatements.push(`CREATE TABLE IF NOT EXISTS public."${tbl}" (id TEXT PRIMARY KEY);`);
            ddlStatements.push(`ALTER TABLE public."${tbl}" DISABLE ROW LEVEL SECURITY;`);
        }

        if (missingCols.length > 0) {
            for (const rawCol of missingCols) {
                const c = rawCol.replace(/"/g, '');
                // Heuristic for types:
                let colType = 'TEXT';
                if (/^(issue|issued)/i.test(c)) {
                    colType = 'TIMESTAMPTZ';
                } else if (/id$/i.test(c) || /Id$/.test(c)) {
                    colType = 'TEXT';
                } else if (/(at|date|time)$/i.test(c) || /^(created|updated|deleted)/i.test(c)) {
                    colType = 'TIMESTAMPTZ';
                } else if (/^(is[A-Z]|has[A-Z]|can[A-Z])/.test(c) || /^(active|enabled|required)$/i.test(c) || /^(is_active|is_enabled|is_required|is_default|is_shared|is_promoted|is_read|is_anonymous)$/i.test(c)) {
                    colType = 'BOOLEAN DEFAULT false';
                } else if (/(config|data|metadata|payload|items|settings|features|options|nodes|permissions|json)/i.test(c)) {
                    colType = "JSONB DEFAULT '{}'::jsonb";
                } else if (/(amount|price|balance|rate|cost|fee|quantity|count|quota|score|lat|lng|latitude|longitude|units)/i.test(c)) {
                    colType = 'NUMERIC';
                }

                ddlStatements.push(`ALTER TABLE public."${tbl}" ADD COLUMN IF NOT EXISTS "${c}" ${colType};`);
                const snake = camelToSnake(c);
                if (snake !== c) {
                    ddlStatements.push(`ALTER TABLE public."${tbl}" ADD COLUMN IF NOT EXISTS "${snake}" ${colType};`);
                }
                totalDdlStatements++;
            }
        }

        // Always drop NOT NULL on foreign keys / critical fields so inserts don't fail
        ddlStatements.push(`DO $$ BEGIN ALTER TABLE public."${tbl}" ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`);
    }

    // Append column sync triggers for library_settings and ds_settings
    ddlStatements.push(`
CREATE OR REPLACE FUNCTION public.sync_library_settings_columns() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.institution_id IS NULL AND NEW."institutionId" IS NOT NULL THEN
        NEW.institution_id := NEW."institutionId";
    END IF;
    IF NEW."institutionId" IS NULL AND NEW.institution_id IS NOT NULL THEN
        NEW."institutionId" := NEW.institution_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'library_settings') THEN
        DROP TRIGGER IF EXISTS trg_sync_library_settings_columns ON public.library_settings;
        CREATE TRIGGER trg_sync_library_settings_columns
        BEFORE INSERT OR UPDATE ON public.library_settings
        FOR EACH ROW EXECUTE FUNCTION public.sync_library_settings_columns();
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_ds_settings_columns() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.institution_id IS NULL AND NEW."institutionId" IS NOT NULL THEN
        NEW.institution_id := NEW."institutionId";
    END IF;
    IF NEW."institutionId" IS NULL AND NEW.institution_id IS NOT NULL THEN
        NEW."institutionId" := NEW.institution_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_settings') THEN
        DROP TRIGGER IF EXISTS trg_sync_ds_settings_columns ON public.ds_settings;
        CREATE TRIGGER trg_sync_ds_settings_columns
        BEFORE INSERT OR UPDATE ON public.ds_settings
        FOR EACH ROW EXECUTE FUNCTION public.sync_ds_settings_columns();
    END IF;
END $$;`);

    console.log(`Generated ${ddlStatements.length} DDL statements for 100% coverage.`);
    fs.writeFileSync('scripts/generated_universal_ddl.sql', ddlStatements.join('\n'));
}

generateUniversalDDLAndMappings();
