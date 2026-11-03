/**
 * SQL Importer Utility for EduAI Automation
 * Parses, validates, and executes full multi-tenant PostgreSQL database dumps,
 * schema DDL migrations, and table backups with batching and error recovery.
 */

export interface SqlAnalysisStats {
    totalStatements: number;
    totalBytes: number;
    ddlCount: number;
    dmlCount: number;
    transactionCount: number;
    otherCount: number;
    detectedTables: string[];
    previewStatements: string[];
}

export interface SqlImportProgress {
    currentBatch: number;
    totalBatches: number;
    executedStatements: number;
    failedStatements: number;
    totalStatements: number;
    percent: number;
    currentStatementSnippet: string;
    currentTable?: string;
}

export interface SqlImportLogEntry {
    id: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    details?: string;
}

export interface SqlImportErrorItem {
    statementIndex: number;
    statementSnippet: string;
    error: string;
    code?: string;
}

export interface SqlImportResult {
    success: boolean;
    totalStatements: number;
    executedCount: number;
    failedCount: number;
    durationMs: number;
    errors: SqlImportErrorItem[];
    affectedTables: string[];
}

export interface SqlImportOptions {
    statements: string[];
    batchSize?: number;
    continueOnError?: boolean;
    onProgress?: (progress: SqlImportProgress) => void;
    onLog?: (entry: SqlImportLogEntry) => void;
    signal?: AbortSignal;
}

/**
 * Automatically sanitizes legacy syntax defects in imported SQL statements,
 * including malformed column identifiers (e.g. "'aiModelTier" -> "aiModelTier"),
 * information_schema empty quote syntax errors (column_name = ''foo' -> column_name = 'foo'),
 * and unescaped identifiers in DDL blocks.
 */
export function sanitizeSqlStatement(statement: string): string {
    if (!statement || typeof statement !== 'string') return statement;
    let s = statement;

    // 1. Repair typo column names starting with single quotes inside double quotes, e.g. "'aiModelTier" -> "aiModelTier"
    s = s.replace(/(["'`])'+([a-zA-Z0-9_]+)\1/g, '$1$2$1');
    s = s.replace(/"'([a-zA-Z0-9_]+)"/g, '"$1"');
    s = s.replace(/'"([a-zA-Z0-9_]+)'/g, "'$1'");

    // 2. Repair information_schema column_name checks with accidental double single quotes: column_name = ''foo'
    s = s.replace(/column_name\s*=\s*''([a-zA-Z0-9_]+)'/gi, "column_name = '$1'");

    // 3. Repair malformed ADD COLUMN / ALTER COLUMN / DROP COLUMN statements
    s = s.replace(/(ADD\s+COLUMN(?:\s+IF\s+NOT\s+EXISTS)?\s+)["'`]+([a-zA-Z0-9_]+)["'`]+/gi, '$1"$2"');
    s = s.replace(/(ALTER\s+COLUMN\s+)["'`]+([a-zA-Z0-9_]+)["'`]+/gi, '$1"$2"');
    s = s.replace(/(DROP\s+COLUMN(?:\s+IF\s+EXISTS)?\s+)["'`]+([a-zA-Z0-9_]+)["'`]+/gi, '$1"$2"');

    // 4. In case of leftover stray leading single quotes on known columns like 'aiModelTier:
    s = s.replace(/'aiModelTier/g, 'aiModelTier');

    // 5. Explicit column remapping for library_settings:
    // Client-side dumps have camelCase keys ("institutionId", "overdueFinePerDay", etc.)
    // but PostgreSQL public.library_settings expects snake_case (institution_id, overdue_fine_per_day, etc.)
    if (/library_settings/i.test(s)) {
        s = s.replace(/(["'`]?)institutionId\1/gi, '"institution_id"');
        s = s.replace(/(["'`]?)overdueFinePerDay\1/gi, '"overdue_fine_per_day"');
        s = s.replace(/(["'`]?)maxBooksPerUser\1/gi, '"max_books_per_user"');
        s = s.replace(/(["'`]?)reservationExpiryDays\1/gi, '"reservation_expiry_days"');
        s = s.replace(/(["'`]?)defaultLendingPeriodDays\1/gi, '"default_lending_period_days"');
        s = s.replace(/(["'`]?)updatedAt\1/gi, '"updated_at"');
    }

    // 6. Explicit column remapping for ds_settings:
    if (/ds_settings/i.test(s)) {
        s = s.replace(/(["'`]?)institutionId\1/gi, '"institution_id"');
        s = s.replace(/(["'`]?)schedulingRules\1/gi, '"scheduling_rules"');
        s = s.replace(/(["'`]?)autoSchedulingEnabled\1/gi, '"auto_scheduling_enabled"');
        s = s.replace(/(["'`]?)invoicePrefix\1/gi, '"invoice_prefix"');
        s = s.replace(/(["'`]?)receiptPrefix\1/gi, '"receipt_prefix"');
        s = s.replace(/(["'`]?)studentIdPrefix\1/gi, '"student_id_prefix"');
        s = s.replace(/(["'`]?)licenseCategories\1/gi, '"license_categories"');
        s = s.replace(/(["'`]?)licenseGroups\1/gi, '"license_groups"');
        s = s.replace(/(["'`]?)cancellationPolicy\1/gi, '"cancellation_policy"');
        s = s.replace(/(["'`]?)createdAt\1/gi, '"created_at"');
        s = s.replace(/(["'`]?)updatedAt\1/gi, '"updated_at"');
    }

    // 7. Universal normalization of INSERT headers:
    // If an INSERT statement has camelCase quoted column names (e.g. "institutionId", "userId"),
    // remap them to snake_case if the snake_case identifier is not already present in the header.
    const insertMatch = s.match(/(INSERT\s+INTO\s+(?:public\.)?["`]?([a-zA-Z0-9_]+)["`]?\s*\()([^)]+)(\)\s*VALUES[\s\S]*)$/i);
    if (insertMatch && insertMatch.index !== undefined) {
        const [fullMatch, prefix, _tableName, headerCols, rest] = insertMatch;
        const rawCols = headerCols.split(',').map(c => c.trim());
        const existingSet = new Set(rawCols);
        let modified = false;

        const remappedCols = rawCols.map(col => {
            const m = col.match(/^["']([a-zA-Z0-9_]+)["']$/);
            if (!m) return col;
            const originalCol = m[1];
            // Convert camelCase to snake_case (e.g. institutionId -> institution_id)
            const snakeCol = originalCol
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
                .replace(/([a-z\d])([A-Z])/g, '$1_$2')
                .toLowerCase();

            if (snakeCol !== originalCol) {
                const quotedSnake = `"${snakeCol}"`;
                if (!existingSet.has(quotedSnake) && !existingSet.has(snakeCol)) {
                    existingSet.delete(col);
                    existingSet.add(quotedSnake);
                    modified = true;
                    return quotedSnake;
                }
            }
            return col;
        });

        if (modified) {
            s = s.substring(0, insertMatch.index) + `${prefix}${remappedCols.join(', ')}${rest}`;
        }
    }

    // 8. Remap ON CONFLICT ("institutionId") -> ON CONFLICT ("institution_id")
    s = s.replace(/ON\s+CONFLICT\s*\(\s*["']?institutionId["']?\s*\)/gi, 'ON CONFLICT ("institution_id")');

    // 9. Remap EXCLUDED."camelCase" to EXCLUDED."snake_case" in ON CONFLICT DO UPDATE
    if (/EXCLUDED\./i.test(s)) {
        s = s.replace(/"([a-zA-Z0-9_]+)"\s*=\s*EXCLUDED\."\1"/g, (match, c) => {
            const snake = c
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
                .replace(/([a-z\d])([A-Z])/g, '$1_$2')
                .toLowerCase();
            return `"${snake}" = EXCLUDED."${snake}"`;
        });
    }

    return s;
}

/**
 * Splits multi-statement raw SQL into individual statements, safely respecting
 * dollar quotes ($$...$$ or $tag$...$tag$), quotes ('...' or "..."), and comments (-- and /* ... * /).
 */
export function splitSqlStatements(rawSql: string): string[] {
    if (!rawSql || typeof rawSql !== 'string') return [];

    const stmts: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inDollarQuote: string | null = null;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < rawSql.length; i++) {
        const char = rawSql[i];
        const nextChar = rawSql[i + 1] || '';

        // Single-line comments (-- ...)
        if (!inSingleQuote && !inDoubleQuote && !inDollarQuote && !inBlockComment && char === '-' && nextChar === '-') {
            inLineComment = true;
            current += char;
            continue;
        }
        if (inLineComment) {
            current += char;
            if (char === '\n') inLineComment = false;
            continue;
        }

        // Multi-line block comments (/* ... */)
        if (!inSingleQuote && !inDoubleQuote && !inDollarQuote && !inLineComment && char === '/' && nextChar === '*') {
            inBlockComment = true;
            current += char;
            continue;
        }
        if (inBlockComment) {
            current += char;
            if (char === '*' && nextChar === '/') {
                current += nextChar;
                i++;
                inBlockComment = false;
            }
            continue;
        }

        // Dollar-quoted blocks (PostgreSQL $$ or $body$ or $function$)
        if (!inSingleQuote && !inDoubleQuote && !inLineComment && !inBlockComment) {
            if (!inDollarQuote && char === '$') {
                const match = rawSql.substring(i).match(/^\$[a-zA-Z0-9_]*\$/);
                if (match) {
                    inDollarQuote = match[0];
                    current += inDollarQuote;
                    i += inDollarQuote.length - 1;
                    continue;
                }
            } else if (inDollarQuote && char === '$') {
                if (rawSql.substring(i).startsWith(inDollarQuote)) {
                    current += inDollarQuote;
                    i += inDollarQuote.length - 1;
                    inDollarQuote = null;
                    continue;
                }
            }
        }

        // String quotes
        if (!inDoubleQuote && !inDollarQuote && !inLineComment && !inBlockComment && char === "'" && rawSql[i - 1] !== '\\') {
            inSingleQuote = !inSingleQuote;
        }
        if (!inSingleQuote && !inDollarQuote && !inLineComment && !inBlockComment && char === '"' && rawSql[i - 1] !== '\\') {
            inDoubleQuote = !inDoubleQuote;
        }

        // Statement terminator: semicolon outside of quotes, dollar blocks, and comments
        if (char === ';' && !inSingleQuote && !inDoubleQuote && !inDollarQuote && !inLineComment && !inBlockComment) {
            const trimmed = current.trim();
            // Ignore standalone comments or empty stmts
            if (trimmed && !isPureComment(trimmed)) {
                stmts.push(sanitizeSqlStatement(trimmed));
            }
            current = '';
            continue;
        }

        current += char;
    }

    const remaining = current.trim();
    if (remaining && !isPureComment(remaining)) {
        stmts.push(sanitizeSqlStatement(remaining));
    }

    return stmts;
}

function isPureComment(str: string): boolean {
    const stripped = str.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    return stripped.length === 0;
}

/**
 * Extracts the target table name from a statement if present (e.g. INSERT INTO public.users, ALTER TABLE foo, CREATE TABLE bar)
 */
export function extractTargetTable(statement: string): string | null {
    if (!statement) return null;
    const match = statement.match(/(?:INSERT\s+INTO|UPDATE|FROM|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE(?:\s+IF\s+EXISTS)?|DROP\s+TABLE(?:\s+IF\s+EXISTS)?)\s+(?:public\.)?["`]?([a-zA-Z0-9_]+)["`]?/i);
    return match ? match[1] : null;
}

/**
 * Analyzes SQL content and provides rich structural metadata and statistics
 */
export function analyzeSqlScript(rawSql: string): { statements: string[]; stats: SqlAnalysisStats } {
    const statements = splitSqlStatements(rawSql);
    const tableSet = new Set<string>();

    let ddlCount = 0;
    let dmlCount = 0;
    let transactionCount = 0;
    let otherCount = 0;

    for (const stmt of statements) {
        const clean = stmt.trim();
        const upper = clean.toUpperCase();

        const table = extractTargetTable(clean);
        if (table) {
            tableSet.add(table);
        }

        if (/^(CREATE|ALTER|DROP|TRUNCATE|COMMENT|GRANT|REVOKE)\b/i.test(upper)) {
            ddlCount++;
        } else if (/^(INSERT|UPDATE|DELETE|UPSERT)\b/i.test(upper)) {
            dmlCount++;
        } else if (/^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|SET\s+CONSTRAINTS|SET\s+statement_timeout|SET\s+lock_timeout)\b/i.test(upper)) {
            transactionCount++;
        } else {
            otherCount++;
        }
    }

    const previewStatements = statements.slice(0, 5).map(s => {
        const singleLine = s.replace(/\s+/g, ' ').trim();
        return singleLine.length > 120 ? singleLine.substring(0, 117) + '...' : singleLine;
    });

    const stats: SqlAnalysisStats = {
        totalStatements: statements.length,
        totalBytes: new Blob([rawSql]).size,
        ddlCount,
        dmlCount,
        transactionCount,
        otherCount,
        detectedTables: Array.from(tableSet).sort(),
        previewStatements
    };

    return { statements, stats };
}

/**
 * Executes a list of SQL statements in manageable batches against the backend SQL engine.
 * Streams real-time progress, supports cancellation, and collects errors.
 */
export async function executeBatchSqlImport(options: SqlImportOptions): Promise<SqlImportResult> {
    const {
        statements,
        batchSize = 25,
        continueOnError = true,
        onProgress,
        onLog,
        signal
    } = options;

    const startTime = Date.now();
    const totalStatements = statements.length;
    const errors: SqlImportErrorItem[] = [];
    const affectedTablesSet = new Set<string>();

    const makeLog = (type: 'info' | 'success' | 'warning' | 'error', message: string, details?: string) => {
        if (onLog) {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
            onLog({
                id: Math.random().toString(36).substring(2, 9),
                timestamp: timeStr,
                type,
                message,
                details
            });
        }
    };

    if (totalStatements === 0) {
        makeLog('warning', 'No valid SQL statements found to execute.');
        return {
            success: true,
            totalStatements: 0,
            executedCount: 0,
            failedCount: 0,
            durationMs: 0,
            errors: [],
            affectedTables: []
        };
    }

    // Split statements into batches
    const batches: string[][] = [];
    for (let i = 0; i < totalStatements; i += batchSize) {
        batches.push(statements.slice(i, i + batchSize));
    }

    const totalBatches = batches.length;
    makeLog('info', `Starting SQL import: ${totalStatements.toLocaleString()} statements partitioned into ${totalBatches} execution batches (batch size: ${batchSize}).`);

    let executedStatements = 0;
    let failedStatements = 0;

    for (let bIndex = 0; bIndex < totalBatches; bIndex++) {
        if (signal?.aborted) {
            makeLog('warning', `Import aborted by operator after batch ${bIndex} of ${totalBatches}.`);
            break;
        }

        const currentBatch = batches[bIndex];
        const batchStartIndex = bIndex * batchSize;
        const batchLabel = `Batch ${bIndex + 1}/${totalBatches}`;

        // Collect tables affected in this batch
        currentBatch.forEach(st => {
            const t = extractTargetTable(st);
            if (t) affectedTablesSet.add(t);
        });

        const firstTable = currentBatch.map(extractTargetTable).find(Boolean) || undefined;
        const snippet = currentBatch[0].substring(0, 80).replace(/\s+/g, ' ');

        if (onProgress) {
            onProgress({
                currentBatch: bIndex + 1,
                totalBatches,
                executedStatements,
                failedStatements,
                totalStatements,
                percent: Math.round((executedStatements / totalStatements) * 100),
                currentStatementSnippet: snippet,
                currentTable: firstTable
            });
        }

        makeLog('info', `Executing ${batchLabel} (${currentBatch.length} statements)...`);

        try {
            const response = await fetch('/api/system?action=execute_sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    statements: currentBatch.map(sanitizeSqlStatement),
                    continueOnError
                }),
                signal
            });

            const result = await response.json().catch(async () => {
                const text = await response.text();
                return { success: false, error: text || `HTTP ${response.status} Server Error` };
            });

            if (result.success || (continueOnError && result.executedCount > 0)) {
                const batchExecuted = result.executedCount !== undefined ? result.executedCount : currentBatch.length;
                const batchFailed = result.failedCount !== undefined ? result.failedCount : 0;
                executedStatements += batchExecuted;
                failedStatements += batchFailed;

                if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
                    result.errors.forEach((err: any, idx: number) => {
                        errors.push({
                            statementIndex: batchStartIndex + idx + 1,
                            statementSnippet: typeof err?.statement === 'string' ? err.statement : snippet,
                            error: err?.message || err?.error || String(err),
                            code: err?.code
                        });
                    });
                    makeLog('warning', `${batchLabel} completed with ${result.errors.length} non-fatal warning(s).`, result.errors[0]?.message);
                } else {
                    makeLog('success', `${batchLabel} completed successfully (${batchExecuted} statement(s)).`);
                }
            } else {
                failedStatements += currentBatch.length;
                const errorMsg = result.error || result.message || 'Execution failed';
                errors.push({
                    statementIndex: batchStartIndex + 1,
                    statementSnippet: snippet,
                    error: errorMsg,
                    code: result.code
                });

                makeLog('error', `${batchLabel} failed: ${errorMsg}`, result.detail || result.hint);

                if (!continueOnError) {
                    makeLog('error', `Import halted due to failure in ${batchLabel}. Halting mode is active.`);
                    break;
                }
            }
        } catch (fetchErr: any) {
            if (signal?.aborted || fetchErr?.name === 'AbortError') {
                makeLog('warning', `Import cancelled by user.`);
                break;
            }

            failedStatements += currentBatch.length;
            const errMsg = fetchErr?.message || 'Network / Server timeout during batch execution';
            errors.push({
                statementIndex: batchStartIndex + 1,
                statementSnippet: snippet,
                error: errMsg
            });

            makeLog('error', `${batchLabel} network failure: ${errMsg}`);

            if (!continueOnError) {
                break;
            }
        }
    }

    const durationMs = Date.now() - startTime;
    const isOverallSuccess = errors.length === 0 || (continueOnError && executedStatements > 0);

    if (onProgress) {
        onProgress({
            currentBatch: totalBatches,
            totalBatches,
            executedStatements,
            failedStatements,
            totalStatements,
            percent: 100,
            currentStatementSnippet: 'Completed',
            currentTable: undefined
        });
    }

    makeLog(
        isOverallSuccess ? 'success' : 'error',
        `Import finished in ${(durationMs / 1000).toFixed(2)}s: ${executedStatements.toLocaleString()} executed, ${failedStatements.toLocaleString()} errors across ${affectedTablesSet.size} tables.`
    );

    return {
        success: isOverallSuccess,
        totalStatements,
        executedCount: executedStatements,
        failedCount: failedStatements,
        durationMs,
        errors,
        affectedTables: Array.from(affectedTablesSet).sort()
    };
}
