const fs = require('fs');
const readline = require('readline');

function camelToSnake(str) {
    const clean = str.replace(/"/g, '');
    const snake = clean.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    return snake;
}

async function exportAllMappings() {
    const rl = readline.createInterface({
        input: fs.createReadStream('C:\\Users\\hp\\Downloads\\eduai_fixed_for_import.sql', { encoding: 'utf8' }),
        crlfDelay: Infinity
    });

    const definedTables = new Map();
    let currentTable = null;
    const tableInsertHeaders = new Map();

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
                        definedTables.get(currentTable).add(colName.toLowerCase());
                    }
                }
            }
        }

        if (line.startsWith('INSERT INTO public.')) {
            const insertMatch = line.match(/^INSERT INTO public\."?([a-zA-Z0-9_]+)"?\s*\(([^)]+)\)/);
            if (insertMatch) {
                const tbl = insertMatch[1].replace(/"/g, '').toLowerCase();
                if (!tableInsertHeaders.has(tbl)) {
                    const rawCols = insertMatch[2].split(',').map(c => c.trim());
                    tableInsertHeaders.set(tbl, rawCols);
                }
            }
        }
    }

    const tableReplacements = {};

    for (const [tbl, rawCols] of tableInsertHeaders.entries()) {
        const existing = definedTables.get(tbl);
        if (!existing) continue;

        const colMap = {};
        for (const rawCol of rawCols) {
            const clean = rawCol.replace(/"/g, '');
            if (existing.has(clean.toLowerCase())) {
                continue; // Already exists directly
            }
            const snake = camelToSnake(clean);
            if (existing.has(snake)) {
                colMap[rawCol] = `"${snake}"`;
            }
        }
        if (Object.keys(colMap).length > 0) {
            tableReplacements[tbl] = colMap;
        }
    }

    fs.writeFileSync('scripts/table_col_replacements.json', JSON.stringify(tableReplacements, null, 2));
    console.log(`Saved column replacements for ${Object.keys(tableReplacements).length} tables.`);
}

exportAllMappings();
