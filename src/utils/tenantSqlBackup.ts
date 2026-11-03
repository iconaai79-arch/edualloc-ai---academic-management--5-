import type { Institution, User, Branch } from '../types';

export interface TenantBackupData {
    institution: Institution;
    branches?: Branch[];
    users?: User[];
    departments?: any[];
    buildings?: any[];
    rooms?: any[];
    academicLevels?: any[];
    academicYears?: any[];
    semesters?: any[];
    subjects?: any[];
    courses?: any[];
    allocations?: any[];
    timetable?: any[];
    studentEnrollments?: any[];
    moduleStates?: any[];
    inventory?: any[];
    visitors?: any[];
    securityAlerts?: any[];
    // Library module
    books?: any[];
    libraryTransactions?: any[];
    libraryFines?: any[];
    librarySettings?: any[];
    bookReservations?: any[];
    bookStockReceipts?: any[];
    // Financial & Ledger
    invoices?: any[];
    receipts?: any[];
    feeStructures?: any[];
    voteHeads?: any[];
    financialPeriods?: any[];
    expenses?: any[];
    bankTransactions?: any[];
    mpesaTransactions?: any[];
    // Boarding & Logistics
    boardingHouses?: any[];
    boardingRooms?: any[];
    boardingBeds?: any[];
    boardingAllocations?: any[];
    bedAllocations?: any[];
    vehicles?: any[];
    transportBills?: any[];
    // Assessments & Academics
    assessments?: any[];
    assessmentMarks?: any[];
    studentAttendances?: any[];
    // Remedials & Communications
    remedialSessions?: any[];
    remedialAllocations?: any[];
    remedialRateSettings?: any[];
    smsLogs?: any[];
    drivingSchool?: {
        students?: any[];
        instructors?: any[];
        vehicles?: any[];
        lessons?: any[];
        payments?: any[];
        tests?: any[];
    };
    health?: {
        patients?: any[];
        staff?: any[];
        wards?: any[];
        beds?: any[];
        appointments?: any[];
    };
    propertyManagement?: {
        properties?: any[];
        units?: any[];
        leases?: any[];
    };
}

/**
 * Escapes a JS value into a valid PostgreSQL literal
 */
export function escapeSqlLiteral(val: any, colName?: string): string {
    if (val === null || val === undefined) {
        return 'NULL';
    }
    const lowerCol = (colName || '').toLowerCase();
    const isDateOrTimeOrPolicyOrId = lowerCol.includes('date') || lowerCol.includes('time') || lowerCol.includes('policy') || lowerCol.endsWith('id') || lowerCol.includes('system');
    if (typeof val === 'boolean') {
        if (isDateOrTimeOrPolicyOrId) {
            return 'NULL';
        }
        return val ? 'TRUE' : 'FALSE';
    }
    if (typeof val === 'number') {
        return isNaN(val) ? 'NULL' : String(val);
    }
    if (lowerCol === 'roles') {
        if (val === null || val === undefined) return "'[]'::jsonb";
        if (Array.isArray(val)) {
            const jsonStr = JSON.stringify(val);
            return `'${jsonStr.replace(/'/g, "''")}'::jsonb`;
        }
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (!trimmed || trimmed === '[]' || trimmed === '{}') return "'[]'::jsonb";
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) return `'${trimmed.replace(/'/g, "''")}'::jsonb`;
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                const inner = trimmed.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
                return `'${JSON.stringify(inner).replace(/'/g, "''")}'::jsonb`;
            }
            return `'${JSON.stringify([trimmed]).replace(/'/g, "''")}'::jsonb`;
        }
    }
    if (Array.isArray(val) || (typeof val === 'object' && !(val instanceof Date))) {
        const jsonStr = JSON.stringify(val);
        return `'${jsonStr.replace(/'/g, "''")}'::jsonb`;
    }
    if (val instanceof Date) {
        return `'${val.toISOString()}'::timestamptz`;
    }
    // Check if empty string for columns that should be NULL or JSONB
    if (typeof val === 'string' && val.trim() === '') {
        if (
            lowerCol.includes('roles') ||
            lowerCol.includes('enrolled_subject') ||
            lowerCol.includes('stream_definitions') ||
            lowerCol.includes('streamdefinitions') ||
            lowerCol.includes('fkey') ||
            lowerCol.includes('parent_ids') ||
            lowerCol.includes('student_ids') ||
            lowerCol.includes('expertise') ||
            lowerCol.includes('equipment') ||
            lowerCol.includes('data') ||
            lowerCol.includes('config') ||
            lowerCol.includes('settings') ||
            lowerCol.includes('profiles') ||
            lowerCol.includes('location') ||
            lowerCol.includes('metadata') ||
            lowerCol.includes('pricing') ||
            lowerCol.endsWith('_ids') ||
            lowerCol.endsWith('ids')
        ) {
            return "NULL";
        }
    }
    // String with newline protection (escapes multiline strings to single-line E'...' to prevent splitting tuples)
    const str = String(val).replace(/\0/g, '');
    if (str.includes('\n') || str.includes('\r')) {
        const cEscaped = str
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n');
        return `E'${cEscaped}'`;
    }
    return `'${str.replace(/'/g, "''")}'`;
}

/**
 * Converts a table row into an SQL INSERT statement with dynamic self-healing DDL.
 * Ensures the target table and all columns exist before INSERT runs so that platforms
 * like Neon, Supabase, or vanilla PostgreSQL never fail with "adds rows to tables it does not create".
 */
function buildInsertStatements(tableName: string, rows: any[]): string {
    if (!Array.isArray(rows) || rows.length === 0) return '';

    // 1. Sanitize institution_module_states to ensure valid IDs and prevent nested column "0"
    if (tableName === 'institution_module_states') {
        rows = rows.map((r, idx) => {
            if (!r || typeof r !== 'object') return r;
            let nested: any = null;
            if (r['0']) {
                try {
                    nested = typeof r['0'] === 'string' ? JSON.parse(r['0']) : r['0'];
                } catch (_) {}
            }
            const id = r.id || nested?.id || ('ims_' + (r.module_id || r.moduleId || 'mod') + '_' + (r.institution_id || r.institutionId || 'inst_' + idx));
            const institutionId = r.institution_id || r.institutionId || nested?.institution_id || nested?.institutionId || 'default_inst';
            let derivedModule = r.module_id || r.moduleId || nested?.module_id || nested?.moduleId || '';
            if (!derivedModule && id) {
                if (id.startsWith('ims_')) {
                    const temp = id.substring(4);
                    if (institutionId && temp.endsWith('_' + institutionId)) {
                        derivedModule = temp.substring(0, temp.length - (institutionId.length + 1));
                    } else if (temp.includes('_inst_')) {
                        derivedModule = temp.split('_inst_')[0];
                    } else if (temp.includes('_default_inst')) {
                        derivedModule = temp.split('_default_inst')[0];
                    } else {
                        derivedModule = temp;
                    }
                } else if (institutionId && id.startsWith(institutionId + '_')) {
                    derivedModule = id.substring(institutionId.length + 1);
                } else if (id.startsWith('mod_')) {
                    const parts = id.split('_');
                    derivedModule = parts[1] || id;
                } else {
                    derivedModule = id;
                }
            }
            const moduleId = derivedModule || 'module';
            const status = r.status || nested?.status || 'active';
            const data = r.data || nested?.data || {};
            const updatedAt = r.updated_at || r.updatedAt || nested?.updated_at || nested?.updatedAt || new Date().toISOString();
            const createdAt = r.created_at || r.createdAt || nested?.created_at || nested?.createdAt || updatedAt;
            const activatedAt = r.activated_at || r.activatedAt || nested?.activated_at || nested?.activatedAt || updatedAt;

            return {
                id,
                institution_id: institutionId,
                institutionId,
                module_id: moduleId,
                moduleId,
                status,
                data,
                activated_at: activatedAt,
                activatedAt,
                created_at: createdAt,
                updated_at: updatedAt,
                updatedAt
            };
        });
    }

    // 2. Sanitize users to ensure valid emails and prevent null email violations
    if (tableName === 'users') {
        rows = rows.map(r => {
            if (!r || typeof r !== 'object') return r;
            if (!r.email) {
                return {
                    ...r,
                    email: r.role === 'tenant' ? `tenant_${r.id}@eduai.local` : `user_${r.id}@eduai.local`
                };
            }
            return r;
        });
    }

    // 3. Sanitize leave_requests to normalize both camelCase & snake_case and avoid null constraint violations
    if (tableName === 'leave_requests') {
        rows = rows.map(r => {
            if (!r || typeof r !== 'object') return r;
            const instId = r.institution_id || r.institutionId || 'inst_default';
            const leaveType = r.leave_type || r.leaveType || r.type || 'General';
            const startDate = r.start_date || r.startDate || (r.created_at ? String(r.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10));
            const endDate = r.end_date || r.endDate || startDate;
            return {
                ...r,
                institution_id: instId,
                institutionId: instId,
                leave_type: leaveType,
                leaveType: leaveType,
                start_date: startDate,
                startDate: startDate,
                end_date: endDate,
                endDate: endDate
            };
        });
    }

    if (tableName === 'leave_out_requests') {
        rows = rows.map(r => {
            if (!r || typeof r !== 'object') return r;
            const instId = r.institution_id || r.institutionId || 'inst_default';
            return {
                ...r,
                institution_id: instId,
                institutionId: instId
            };
        });
    }

    // 4. Guarantee that any row with an 'id' column has a non-null id (skip settings tables where id is not primary)
    const isSettingsTable = tableName === 'library_settings' || tableName === 'ds_settings';
    rows = rows.map((r, idx) => {
        if (!isSettingsTable && r && typeof r === 'object' && (r.id === null || r.id === undefined || r.id === '')) {
            return {
                ...r,
                id: `${tableName}_gen_${Date.now()}_${idx}`
            };
        }
        return r;
    });

    // Deduplicate settings tables by institution_id to guarantee no duplicate key errors in batch
    if (tableName === 'library_settings' || tableName === 'ds_settings') {
        const seenInst = new Set<string>();
        rows = rows.filter(r => {
            if (!r || typeof r !== 'object') return false;
            const instId = r.institution_id || r.institutionId;
            if (!instId || seenInst.has(instId)) return false;
            seenInst.add(instId);
            return true;
        });
    } else {
        const seenIds = new Set<string>();
        rows = rows.filter(r => {
            if (!r || typeof r !== 'object' || r.id === undefined || r.id === null) return true;
            const strId = String(r.id);
            if (seenIds.has(strId)) return false;
            seenIds.add(strId);
            return true;
        });
    }

    // Helper to sanitize corrupted column keys with stray quotes, spaces, or backticks
    const sanitizeColName = (k: string): string => k.replace(/^['"`\s]+|['"`\s]+$/g, '').trim();

    // Collect all unique sanitized column names across all rows
    const colSet = new Set<string>();
    rows.forEach(r => {
        if (r && typeof r === 'object') {
            Object.keys(r).forEach(k => {
                // Ignore functions, internal keys, or undefined values
                if (typeof r[k] !== 'function' && !k.startsWith('__')) {
                    const clean = sanitizeColName(k);
                    if (clean) colSet.add(clean);
                }
            });
        }
    });

    const columns = Array.from(colSet);
    if (columns.length === 0) return '';

    const lines: string[] = [];
    lines.push(`-- ============================================================================`);
    lines.push(`-- Table: public."${tableName}" (${rows.length} records)`);
    lines.push(`-- ============================================================================`);

    // Self-healing DDL: create table if missing, then ensure all columns exist
    const hasId = !isSettingsTable && columns.includes('id');
    const hasInstId = columns.includes('institution_id') || columns.includes('institutionId');
    if (isSettingsTable && hasInstId) {
        const pkCol = columns.includes('institution_id') ? 'institution_id' : 'institutionId';
        lines.push(`CREATE TABLE IF NOT EXISTS public."${tableName}" (`);
        lines.push(`    "${pkCol}" TEXT PRIMARY KEY`);
        lines.push(`);`);
        lines.push(`ALTER TABLE IF EXISTS public."${tableName}" ADD COLUMN IF NOT EXISTS "institution_id" TEXT;`);
        lines.push(`ALTER TABLE IF EXISTS public."${tableName}" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;`);
        lines.push(`DO $$ BEGIN ALTER TABLE public."${tableName}" ADD PRIMARY KEY ("${pkCol}"); EXCEPTION WHEN OTHERS THEN NULL; END $$;`);
    } else if (hasId) {
        const sampleVal = rows.find(r => r && r.id !== null && r.id !== undefined)?.id;
        const idType = (typeof sampleVal === 'number' && Number.isInteger(sampleVal)) ? 'BIGINT' : 'TEXT';
        lines.push(`CREATE TABLE IF NOT EXISTS public."${tableName}" (`);
        lines.push(`    "id" ${idType} PRIMARY KEY`);
        lines.push(`);`);
        lines.push(`DO $$ BEGIN ALTER TABLE public."${tableName}" ADD PRIMARY KEY (id); EXCEPTION WHEN OTHERS THEN BEGIN ALTER TABLE public."${tableName}" ADD CONSTRAINT "uq_${tableName}_id" UNIQUE (id); EXCEPTION WHEN OTHERS THEN NULL; END; END $$;`);
    } else {
        const firstCol = columns[0];
        const sampleVal = rows.find(r => r && (r[firstCol] !== null && r[firstCol] !== undefined || r["'" + firstCol] !== undefined || r['"' + firstCol + '"'] !== undefined))?.[firstCol];
        let firstType = 'TEXT';
        if (typeof sampleVal === 'boolean') firstType = 'BOOLEAN';
        else if (typeof sampleVal === 'number') firstType = Number.isInteger(sampleVal) ? 'BIGINT' : 'NUMERIC';
        else if (sampleVal && typeof sampleVal === 'object') firstType = 'JSONB';
        lines.push(`CREATE TABLE IF NOT EXISTS public."${tableName}" (`);
        lines.push(`    "${firstCol.replace(/"/g, '""')}" ${firstType}`);
        lines.push(`);`);
    }

    for (const col of columns) {
        if (hasId && col === 'id') continue;
        if (!hasId && !isSettingsTable && col === columns[0]) continue;
        const cleanCol = sanitizeColName(col);
        if (!cleanCol) continue;
        const safeIdent = `"${cleanCol.replace(/"/g, '""')}"`;
        const safeLiteral = cleanCol.replace(/'/g, "''");
        const lowerCol = cleanCol.toLowerCase();
        const isDateOrTimeOrPolicyOrId = lowerCol.includes('date') || lowerCol.includes('time') || lowerCol.includes('policy') || lowerCol.endsWith('id') || lowerCol.includes('system');
        const sampleRow = rows.find(r => r && (r[cleanCol] !== null && r[cleanCol] !== undefined || r["'" + cleanCol] !== undefined || r['"' + cleanCol + '"'] !== undefined));
        const sampleVal = sampleRow ? (sampleRow[cleanCol] !== undefined ? sampleRow[cleanCol] : (sampleRow["'" + cleanCol] !== undefined ? sampleRow["'" + cleanCol] : sampleRow['"' + cleanCol + '"'])) : undefined;
        const isKnownJsonbArrayCol = [
            'roles', 'expertise', 'enrolled_subject_ids', 'enrolledsubjectids',
            'parent_ids', 'parentids', 'student_ids', 'studentids',
            'stream_definitions', 'streamdefinitions', 'equipment', 'likes',
            'course_level_ids', 'courselevelids', 'subject_ids', 'subjectids',
            'add_ons', 'addons', 'images', 'features', 'allergies',
            'chronic_conditions', 'chronicconditions', 'attached_files', 'attachedfiles',
            'gallery_urls', 'galleryurls'
        ].includes(lowerCol);

        let colType = 'TEXT';
        if (typeof sampleVal === 'boolean' && !isDateOrTimeOrPolicyOrId) {
            colType = 'BOOLEAN DEFAULT FALSE';
        } else if (typeof sampleVal === 'number' && !isDateOrTimeOrPolicyOrId) {
            colType = Number.isInteger(sampleVal) ? 'BIGINT' : 'NUMERIC';
        } else if ((sampleVal && typeof sampleVal === 'object') || isKnownJsonbArrayCol) {
            colType = "JSONB DEFAULT '[]'::jsonb";
        }
        if ((sampleVal && typeof sampleVal === 'object') || isKnownJsonbArrayCol) {
            lines.push(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName}' AND column_name = '${safeLiteral}' AND data_type = 'ARRAY') THEN ALTER TABLE public."${tableName}" ALTER COLUMN ${safeIdent} DROP DEFAULT; ALTER TABLE public."${tableName}" ALTER COLUMN ${safeIdent} TYPE JSONB USING CASE WHEN ${safeIdent} IS NULL THEN '[]'::jsonb ELSE to_jsonb(${safeIdent}) END; ALTER TABLE public."${tableName}" ALTER COLUMN ${safeIdent} SET DEFAULT '[]'::jsonb; ELSE ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS ${safeIdent} JSONB DEFAULT '[]'::jsonb; END IF; EXCEPTION WHEN OTHERS THEN NULL; END $$;`);
        } else if (typeof sampleVal !== 'boolean' || isDateOrTimeOrPolicyOrId) {
            lines.push(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName}' AND column_name = '${safeLiteral}' AND data_type = 'boolean') THEN ALTER TABLE public."${tableName}" ALTER COLUMN ${safeIdent} DROP DEFAULT; ALTER TABLE public."${tableName}" ALTER COLUMN ${safeIdent} TYPE ${colType} USING NULL; ELSE ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS ${safeIdent} ${colType}; END IF; EXCEPTION WHEN OTHERS THEN NULL; END $$;`);
        } else {
            lines.push(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS ${safeIdent} ${colType};`);
        }
    }

    if (tableName === 'leave_requests') {
        lines.push(`DO $$ BEGIN ALTER TABLE public."leave_requests" ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`);
        lines.push(`DO $$ BEGIN ALTER TABLE public."leave_requests" ALTER COLUMN leave_type DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`);
        lines.push(`DO $$ BEGIN ALTER TABLE public."leave_requests" ALTER COLUMN start_date DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`);
        lines.push(`DO $$ BEGIN ALTER TABLE public."leave_requests" ALTER COLUMN end_date DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`);
        lines.push(`DO $$ BEGIN ALTER TABLE public."leave_requests" DROP CONSTRAINT IF EXISTS leave_requests_institution_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END $$;`);
    } else if (tableName === 'leave_out_requests') {
        lines.push(`DO $$ BEGIN ALTER TABLE public."leave_out_requests" ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`);
        lines.push(`DO $$ BEGIN ALTER TABLE public."leave_out_requests" DROP CONSTRAINT IF EXISTS leave_out_requests_institution_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END $$;`);
    }
    lines.push('');

    // Batch in groups of 50 for clean SQL readability
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const colList = columns.map(c => `"${sanitizeColName(c).replace(/"/g, '""')}"`).join(', ');
        const valueRows = chunk.map(row => {
            const values = columns.map(col => {
                const cleanCol = sanitizeColName(col);
                const val = row[cleanCol] !== undefined ? row[cleanCol] : (row[col] !== undefined ? row[col] : (row["'" + cleanCol] !== undefined ? row["'" + cleanCol] : row['"' + cleanCol + '"']));
                return escapeSqlLiteral(val, cleanCol);
            });
            return `    (${values.join(', ')})`;
        });

        lines.push(`INSERT INTO public."${tableName}" (${colList}) VALUES\n${valueRows.join(',\n')}`);
        if (isSettingsTable) {
            lines.push(`ON CONFLICT DO NOTHING;`);
        } else if (columns.includes('id')) {
            const updateCols = columns.filter(c => c !== 'id').map(c => {
                const safeName = sanitizeColName(c).replace(/"/g, '""');
                return `"${safeName}" = EXCLUDED."${safeName}"`;
            }).join(', ');
            if (updateCols) {
                lines.push(`ON CONFLICT ("id") DO UPDATE SET ${updateCols};`);
            } else {
                lines.push(`ON CONFLICT ("id") DO NOTHING;`);
            }
        } else {
            lines.push(`ON CONFLICT DO NOTHING;`);
        }
        lines.push('');
    }

    return lines.join('\n');
}


/**
 * Generates a complete, executable SQL backup script for an institutional tenant
 */
export function generateTenantSqlDump(data: TenantBackupData): string {
    const inst = data.institution;
    const now = new Date();
    const timestamp = now.toISOString();

    const sections: string[] = [];

    // Header block
    sections.push(`-- ============================================================================`);
    sections.push(`-- EduAI Automation - Institutional Tenant SQL Backup`);
    sections.push(`-- Tenant Name     : ${inst.name || 'Unknown Tenant'}`);
    sections.push(`-- Tenant Code     : ${inst.institutionCode || 'N/A'}`);
    sections.push(`-- Institution ID  : ${inst.id}`);
    sections.push(`-- Registry Email  : ${inst.email || 'N/A'}`);
    sections.push(`-- Contact Hotline : ${inst.phoneNumber || 'N/A'}`);
    sections.push(`-- Cluster / Type  : ${inst.institutionType || 'General'} / ${inst.category || 'Standard'}`);
    sections.push(`-- Backup Timestamp: ${timestamp}`);
    sections.push(`-- Generated By    : Super Admin Data Guardian`);
    sections.push(`-- ============================================================================`);
    sections.push('');
    sections.push('BEGIN;');
    sections.push('');

    // 1. Institution record
    const instSql = buildInsertStatements('institutions', [inst]);
    if (instSql) sections.push(instSql);

    // 2. Branches
    if (data.branches && data.branches.length > 0) {
        sections.push(buildInsertStatements('branches', data.branches));
    }

    // 3. Module States / Licensing Subscriptions
    if (data.moduleStates && data.moduleStates.length > 0) {
        sections.push(buildInsertStatements('institution_module_states', data.moduleStates));
    }

    // 4. Users & Staff
    if (data.users && data.users.length > 0) {
        sections.push(buildInsertStatements('users', data.users));
    }

    // 5. Departments
    if (data.departments && data.departments.length > 0) {
        sections.push(buildInsertStatements('departments', data.departments));
    }

    // 6. Buildings & Rooms
    if (data.buildings && data.buildings.length > 0) {
        sections.push(buildInsertStatements('buildings', data.buildings));
    }
    if (data.rooms && data.rooms.length > 0) {
        sections.push(buildInsertStatements('rooms', data.rooms));
    }

    // 7. Academic Calendar & Levels
    if (data.academicYears && data.academicYears.length > 0) {
        sections.push(buildInsertStatements('academic_years', data.academicYears));
    }
    if (data.semesters && data.semesters.length > 0) {
        sections.push(buildInsertStatements('semesters', data.semesters));
    }
    if (data.academicLevels && data.academicLevels.length > 0) {
        sections.push(buildInsertStatements('academic_levels', data.academicLevels));
    }

    // 8. Subjects & Courses
    if (data.subjects && data.subjects.length > 0) {
        sections.push(buildInsertStatements('subjects', data.subjects));
    }
    if (data.courses && data.courses.length > 0) {
        sections.push(buildInsertStatements('courses', data.courses));
    }

    // 9. Student Enrollments
    if (data.studentEnrollments && data.studentEnrollments.length > 0) {
        sections.push(buildInsertStatements('student_enrollments', data.studentEnrollments));
    }

    // 10. Timetable & Allocations
    if (data.allocations && data.allocations.length > 0) {
        sections.push(buildInsertStatements('allocation_requests', data.allocations));
    }
    if (data.timetable && data.timetable.length > 0) {
        sections.push(buildInsertStatements('timetable_entries', data.timetable));
    }

    // 11. Inventory, Visitors & Alerts
    if (data.inventory && data.inventory.length > 0) {
        sections.push(buildInsertStatements('inventory', data.inventory));
    }
    if (data.visitors && data.visitors.length > 0) {
        sections.push(buildInsertStatements('visitors', data.visitors));
    }
    if (data.securityAlerts && data.securityAlerts.length > 0) {
        sections.push(buildInsertStatements('security_alerts', data.securityAlerts));
    }

    // 12. Library Module
    if (data.books && data.books.length > 0) {
        sections.push(buildInsertStatements('books', data.books));
    }
    if (data.libraryTransactions && data.libraryTransactions.length > 0) {
        sections.push(buildInsertStatements('library_transactions', data.libraryTransactions));
    }
    if (data.libraryFines && data.libraryFines.length > 0) {
        sections.push(buildInsertStatements('library_fines', data.libraryFines));
    }
    if (data.librarySettings && data.librarySettings.length > 0) {
        const normalizedLibSettings = data.librarySettings.map((s: any) => ({
            institution_id: s.institution_id || s.institutionId,
            overdue_fine_per_day: s.overdue_fine_per_day !== undefined ? s.overdue_fine_per_day : (s.overdueFinePerDay ?? 0),
            max_books_per_user: s.max_books_per_user !== undefined ? s.max_books_per_user : (s.maxBooksPerUser ?? 3),
            reservation_expiry_days: s.reservation_expiry_days !== undefined ? s.reservation_expiry_days : (s.reservationExpiryDays ?? 3),
            default_lending_period_days: s.default_lending_period_days !== undefined ? s.default_lending_period_days : (s.defaultLendingPeriodDays ?? 14),
            updated_at: s.updated_at || s.updatedAt || new Date().toISOString()
        }));
        sections.push(buildInsertStatements('library_settings', normalizedLibSettings));
    }
    if (data.bookReservations && data.bookReservations.length > 0) {
        sections.push(buildInsertStatements('book_reservations', data.bookReservations));
    }
    if (data.bookStockReceipts && data.bookStockReceipts.length > 0) {
        sections.push(buildInsertStatements('book_stock_receipts', data.bookStockReceipts));
    }

    // 13. Finance & Ledgers
    if (data.invoices && data.invoices.length > 0) {
        sections.push(buildInsertStatements('invoices', data.invoices));
    }
    if (data.receipts && data.receipts.length > 0) {
        sections.push(buildInsertStatements('receipts', data.receipts));
    }
    if (data.feeStructures && data.feeStructures.length > 0) {
        sections.push(buildInsertStatements('fee_structures', data.feeStructures));
    }
    if (data.voteHeads && data.voteHeads.length > 0) {
        sections.push(buildInsertStatements('vote_heads', data.voteHeads));
    }
    if (data.financialPeriods && data.financialPeriods.length > 0) {
        sections.push(buildInsertStatements('financial_periods', data.financialPeriods));
    }
    if (data.expenses && data.expenses.length > 0) {
        sections.push(buildInsertStatements('expenses', data.expenses));
    }
    if (data.bankTransactions && data.bankTransactions.length > 0) {
        sections.push(buildInsertStatements('bank_transactions', data.bankTransactions));
    }
    if (data.mpesaTransactions && data.mpesaTransactions.length > 0) {
        sections.push(buildInsertStatements('mpesa_transactions', data.mpesaTransactions));
    }

    // 14. Boarding & Fleet
    if (data.boardingHouses && data.boardingHouses.length > 0) {
        sections.push(buildInsertStatements('boarding_houses', data.boardingHouses));
    }
    if (data.boardingRooms && data.boardingRooms.length > 0) {
        sections.push(buildInsertStatements('boarding_rooms', data.boardingRooms));
    }
    if (data.boardingBeds && data.boardingBeds.length > 0) {
        sections.push(buildInsertStatements('boarding_beds', data.boardingBeds));
    }
    if (data.boardingAllocations && data.boardingAllocations.length > 0) {
        sections.push(buildInsertStatements('boarding_allocations', data.boardingAllocations));
    }
    if (data.bedAllocations && data.bedAllocations.length > 0) {
        sections.push(buildInsertStatements('bed_allocations', data.bedAllocations));
    }
    if (data.vehicles && data.vehicles.length > 0) {
        sections.push(buildInsertStatements('vehicles', data.vehicles));
    }
    if (data.transportBills && data.transportBills.length > 0) {
        sections.push(buildInsertStatements('transport_bills', data.transportBills));
    }

    // 15. Assessments & Academics
    if (data.assessments && data.assessments.length > 0) {
        sections.push(buildInsertStatements('assessments', data.assessments));
    }
    if (data.assessmentMarks && data.assessmentMarks.length > 0) {
        sections.push(buildInsertStatements('assessment_marks', data.assessmentMarks));
    }
    if (data.studentAttendances && data.studentAttendances.length > 0) {
        sections.push(buildInsertStatements('student_attendances', data.studentAttendances));
    }

    // 16. Remedials & Communication
    if (data.remedialSessions && data.remedialSessions.length > 0) {
        sections.push(buildInsertStatements('school_remedial_sessions', data.remedialSessions));
    }
    if (data.remedialAllocations && data.remedialAllocations.length > 0) {
        sections.push(buildInsertStatements('school_remedial_allocations', data.remedialAllocations));
    }
    if (data.remedialRateSettings && data.remedialRateSettings.length > 0) {
        sections.push(buildInsertStatements('school_remedial_rate_settings', data.remedialRateSettings));
    }
    if (data.smsLogs && data.smsLogs.length > 0) {
        sections.push(buildInsertStatements('sms_logs', data.smsLogs));
    }

    // 17. Driving School specific
    if (data.drivingSchool) {
        if (data.drivingSchool.students?.length) sections.push(buildInsertStatements('ds_students', data.drivingSchool.students));
        if (data.drivingSchool.instructors?.length) sections.push(buildInsertStatements('ds_instructors', data.drivingSchool.instructors));
        if (data.drivingSchool.vehicles?.length) sections.push(buildInsertStatements('ds_vehicles', data.drivingSchool.vehicles));
        if (data.drivingSchool.lessons?.length) sections.push(buildInsertStatements('ds_lessons', data.drivingSchool.lessons));
        if (data.drivingSchool.payments?.length) sections.push(buildInsertStatements('ds_payments', data.drivingSchool.payments));
        if (data.drivingSchool.tests?.length) sections.push(buildInsertStatements('ds_tests', data.drivingSchool.tests));
    }

    // 18. Health (HIS) specific
    if (data.health) {
        if (data.health.patients?.length) sections.push(buildInsertStatements('his_patients', data.health.patients));
        if (data.health.staff?.length) sections.push(buildInsertStatements('his_staff', data.health.staff));
        if (data.health.wards?.length) sections.push(buildInsertStatements('his_wards', data.health.wards));
        if (data.health.beds?.length) sections.push(buildInsertStatements('his_beds', data.health.beds));
        if (data.health.appointments?.length) sections.push(buildInsertStatements('his_appointments', data.health.appointments));
    }

    // 19. Property Management specific
    if (data.propertyManagement) {
        if (data.propertyManagement.properties?.length) sections.push(buildInsertStatements('property_management_properties', data.propertyManagement.properties));
        if (data.propertyManagement.units?.length) sections.push(buildInsertStatements('property_management_units', data.propertyManagement.units));
        if (data.propertyManagement.leases?.length) sections.push(buildInsertStatements('property_management_leases', data.propertyManagement.leases));
    }

    sections.push('COMMIT;');
    sections.push('');
    sections.push(`-- End of Backup for ${inst.name} (${inst.id})`);

    return sections.filter(Boolean).join('\n');
}

/**
 * Safely executes a browser file download using a Blob and anchor element.
 * Retains the ObjectURL for 60 seconds to prevent Chromium/Edge from aborting asynchronous downloads.
 */
export function executeSafeBlobDownload(content: string, fileName: string, mimeType = 'text/plain;charset=utf-8;'): string {
    try {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.setAttribute('download', fileName);
        link.rel = 'noopener';
        link.style.display = 'none';
        document.body.appendChild(link);

        // Dispatch synthetic click event
        try {
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            link.dispatchEvent(clickEvent);
        } catch (_) {
            link.click();
        }

        // Delay revokeObjectURL by 60 seconds so browser download manager finishes streaming
        setTimeout(() => {
            try {
                if (link.parentNode) {
                    document.body.removeChild(link);
                }
                URL.revokeObjectURL(url);
            } catch (_) {}
        }, 60000);

        return fileName;
    } catch (e) {
        console.error('[tenantSqlBackup] Safe download failed, attempting data-uri fallback:', e);
        try {
            const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                if (link.parentNode) document.body.removeChild(link);
            }, 1000);
            return fileName;
        } catch (innerErr) {
            console.error('[tenantSqlBackup] Data URI fallback also failed:', innerErr);
            throw e;
        }
    }
}

/**
 * Triggers a file download for the compiled SQL script in browser
 */
export function downloadTenantSqlBackup(data: TenantBackupData): string {
    const inst = data.institution;
    const sqlContent = generateTenantSqlDump(data);
    
    const sanitize = (str?: string) => (str || 'tenant').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const cleanName = sanitize(inst.name);
    const cleanCode = sanitize(inst.institutionCode || inst.id);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `backup_${cleanName}_${cleanCode}_${dateStr}.sql`;

    return executeSafeBlobDownload(sqlContent, fileName);
}

/**
 * Gathers all records for a tenant across relational modules and triggers SQL backup download
 */
export async function collectAndDownloadTenantBackup(
    inst: Institution,
    fallbackUsers: User[] = [],
    fallbackBranches: any[] = []
): Promise<{ fileName: string; totalRecords: number; data: TenantBackupData }> {
    // Dynamic import to prevent circular dependency issues
    const { apiService } = await import('../services/apiService');

    const instId = inst.id;

    // Robust fetch helper that checks function existence and falls back to fetchModuleRecords
    const safeFetch = async <T = any>(table: string, methodName?: string): Promise<T[]> => {
        try {
            if (methodName && typeof (apiService as any)?.[methodName] === 'function') {
                const res = await (apiService as any)[methodName](instId);
                if (Array.isArray(res) && res.length > 0) return res;
            }
            if (typeof apiService?.fetchModuleRecords === 'function') {
                const res = await apiService.fetchModuleRecords<T>(table, instId);
                if (Array.isArray(res) && res.length > 0) return res;
            }
            // Check localDb
            try {
                const { localDb } = await import('../services/localDb');
                if (localDb && typeof localDb.getAll === 'function') {
                    const localRows = await localDb.getAll(table).catch(() => []);
                    if (Array.isArray(localRows) && localRows.length > 0) {
                        return localRows.filter((r: any) => !r.institution_id || r.institution_id === instId || r.institutionId === instId);
                    }
                }
            } catch (_) {}
            return [];
        } catch (e) {
            console.warn(`[tenantSqlBackup] Notice: safeFetch skipped ${table}:`, e);
            return [];
        }
    };

    // Concurrently fetch all potential relational child records
    const [
        remoteBranches,
        remoteUsers,
        departments,
        courses,
        subjects,
        rooms,
        buildings,
        academicYears,
        semesters,
        academicLevels,
        allocations,
        timetable,
        moduleStates,
        inventory,
        visitors,
        securityAlerts,
        // Library module
        books,
        libraryTransactions,
        libraryFines,
        librarySettings,
        bookReservations,
        bookStockReceipts,
        // Financial & Ledgers
        invoices,
        receipts,
        feeStructures,
        voteHeads,
        financialPeriods,
        expenses,
        bankTransactions,
        mpesaTransactions,
        // Boarding & Fleet
        boardingHouses,
        boardingRooms,
        boardingBeds,
        boardingAllocations,
        bedAllocations,
        vehicles,
        transportBills,
        // Assessments & Academics
        assessments,
        assessmentMarks,
        studentAttendances,
        // Remedials & Communications
        remedialSessions,
        remedialAllocations,
        remedialRateSettings,
        smsLogs,
        // Driving school
        dsStudents,
        dsInstructors,
        dsVehicles,
        dsLessons,
        dsPayments,
        dsTests,
        // Health
        hisPatients,
        hisStaff,
        hisWards,
        hisBeds,
        hisAppointments,
        // Property
        propProperties,
        propUnits,
        propLeases
    ] = await Promise.all([
        safeFetch<any>('branches'),
        safeFetch<User>('users'),
        safeFetch<any>('departments', 'fetchDepartments'),
        safeFetch<any>('courses', 'fetchCourses'),
        safeFetch<any>('subjects', 'fetchSubjects'),
        safeFetch<any>('rooms', 'fetchRooms'),
        safeFetch<any>('buildings', 'fetchBuildings'),
        safeFetch<any>('academic_years', 'fetchAcademicYears'),
        safeFetch<any>('semesters', 'fetchSemesters'),
        safeFetch<any>('academic_levels', 'fetchAcademicLevels'),
        safeFetch<any>('allocation_requests', 'fetchAllocations'),
        safeFetch<any>('timetable_entries', 'fetchTimetable'),
        safeFetch<any>('institution_module_states'),
        safeFetch<any>('inventory'),
        safeFetch<any>('visitors'),
        safeFetch<any>('security_alerts'),
        // Library module
        safeFetch<any>('books'),
        safeFetch<any>('library_transactions'),
        safeFetch<any>('library_fines'),
        safeFetch<any>('library_settings'),
        safeFetch<any>('book_reservations'),
        safeFetch<any>('book_stock_receipts'),
        // Financial & Ledgers
        safeFetch<any>('invoices'),
        safeFetch<any>('receipts'),
        safeFetch<any>('fee_structures'),
        safeFetch<any>('vote_heads'),
        safeFetch<any>('financial_periods'),
        safeFetch<any>('expenses'),
        safeFetch<any>('bank_transactions'),
        safeFetch<any>('mpesa_transactions'),
        // Boarding & Fleet
        safeFetch<any>('boarding_houses'),
        safeFetch<any>('boarding_rooms'),
        safeFetch<any>('boarding_beds'),
        safeFetch<any>('boarding_allocations'),
        safeFetch<any>('bed_allocations'),
        safeFetch<any>('vehicles'),
        safeFetch<any>('transport_bills'),
        // Assessments & Academics
        safeFetch<any>('assessments'),
        safeFetch<any>('assessment_marks'),
        safeFetch<any>('student_attendances'),
        // Remedials & Communications
        safeFetch<any>('school_remedial_sessions'),
        safeFetch<any>('school_remedial_allocations'),
        safeFetch<any>('school_remedial_rate_settings'),
        safeFetch<any>('sms_logs'),
        // Driving school
        safeFetch<any>('ds_students'),
        safeFetch<any>('ds_instructors'),
        safeFetch<any>('ds_vehicles'),
        safeFetch<any>('ds_lessons'),
        safeFetch<any>('ds_payments'),
        safeFetch<any>('ds_tests'),
        // Health
        safeFetch<any>('his_patients'),
        safeFetch<any>('his_staff'),
        safeFetch<any>('his_wards'),
        safeFetch<any>('his_beds'),
        safeFetch<any>('his_appointments'),
        // Property
        safeFetch<any>('property_management_properties'),
        safeFetch<any>('property_management_units'),
        safeFetch<any>('property_management_leases')
    ]);

    // Merge branches: combine remote and fallback
    const branchMap = new Map<string, any>();
    (fallbackBranches || []).filter(b => b && (b.institution_id === instId || b.institutionId === instId)).forEach(b => branchMap.set(b.id, b));
    (remoteBranches || []).forEach(b => branchMap.set(b.id, b));
    const mergedBranches = Array.from(branchMap.values());

    // Merge users: combine remote and fallback
    const userMap = new Map<string, User>();
    (fallbackUsers || []).filter(u => u && (u.institutionId === instId || (u as any).institution_id === instId)).forEach(u => userMap.set(u.id, u));
    (remoteUsers || []).forEach(u => userMap.set(u.id, u));
    const mergedUsers = Array.from(userMap.values());

    const backupData: TenantBackupData = {
        institution: inst,
        branches: mergedBranches,
        users: mergedUsers,
        departments: departments || [],
        buildings: buildings || [],
        rooms: rooms || [],
        academicLevels: academicLevels || [],
        academicYears: academicYears || [],
        semesters: semesters || [],
        subjects: subjects || [],
        courses: courses || [],
        allocations: allocations || [],
        timetable: timetable || [],
        moduleStates: moduleStates || [],
        inventory: inventory || [],
        visitors: visitors || [],
        securityAlerts: securityAlerts || [],
        books: books || [],
        libraryTransactions: libraryTransactions || [],
        libraryFines: libraryFines || [],
        librarySettings: librarySettings || [],
        bookReservations: bookReservations || [],
        bookStockReceipts: bookStockReceipts || [],
        invoices: invoices || [],
        receipts: receipts || [],
        feeStructures: feeStructures || [],
        voteHeads: voteHeads || [],
        financialPeriods: financialPeriods || [],
        expenses: expenses || [],
        bankTransactions: bankTransactions || [],
        mpesaTransactions: mpesaTransactions || [],
        boardingHouses: boardingHouses || [],
        boardingRooms: boardingRooms || [],
        boardingBeds: boardingBeds || [],
        boardingAllocations: boardingAllocations || [],
        bedAllocations: bedAllocations || [],
        vehicles: vehicles || [],
        transportBills: transportBills || [],
        assessments: assessments || [],
        assessmentMarks: assessmentMarks || [],
        studentAttendances: studentAttendances || [],
        remedialSessions: remedialSessions || [],
        remedialAllocations: remedialAllocations || [],
        remedialRateSettings: remedialRateSettings || [],
        smsLogs: smsLogs || [],
        drivingSchool: {
            students: dsStudents || [],
            instructors: dsInstructors || [],
            vehicles: dsVehicles || [],
            lessons: dsLessons || [],
            payments: dsPayments || [],
            tests: dsTests || []
        },
        health: {
            patients: hisPatients || [],
            staff: hisStaff || [],
            wards: hisWards || [],
            beds: hisBeds || [],
            appointments: hisAppointments || []
        },
        propertyManagement: {
            properties: propProperties || [],
            units: propUnits || [],
            leases: propLeases || []
        }
    };

    // Calculate total record count
    let totalRecords = 1; // institution itself
    totalRecords += mergedBranches.length;
    totalRecords += mergedUsers.length;
    totalRecords += (departments?.length || 0) + (buildings?.length || 0) + (rooms?.length || 0);
    totalRecords += (academicLevels?.length || 0) + (academicYears?.length || 0) + (semesters?.length || 0);
    totalRecords += (subjects?.length || 0) + (courses?.length || 0);
    totalRecords += (allocations?.length || 0) + (timetable?.length || 0) + (moduleStates?.length || 0);
    totalRecords += (inventory?.length || 0) + (visitors?.length || 0) + (securityAlerts?.length || 0);
    totalRecords += (books?.length || 0) + (libraryTransactions?.length || 0) + (libraryFines?.length || 0) + (librarySettings?.length || 0) + (bookReservations?.length || 0) + (bookStockReceipts?.length || 0);
    totalRecords += (invoices?.length || 0) + (receipts?.length || 0) + (feeStructures?.length || 0) + (voteHeads?.length || 0) + (financialPeriods?.length || 0) + (expenses?.length || 0) + (bankTransactions?.length || 0) + (mpesaTransactions?.length || 0);
    totalRecords += (boardingHouses?.length || 0) + (boardingRooms?.length || 0) + (boardingBeds?.length || 0) + (boardingAllocations?.length || 0) + (bedAllocations?.length || 0);
    totalRecords += (vehicles?.length || 0) + (transportBills?.length || 0);
    totalRecords += (assessments?.length || 0) + (assessmentMarks?.length || 0) + (studentAttendances?.length || 0);
    totalRecords += (remedialSessions?.length || 0) + (remedialAllocations?.length || 0) + (remedialRateSettings?.length || 0) + (smsLogs?.length || 0);
    totalRecords += (dsStudents?.length || 0) + (dsInstructors?.length || 0) + (dsVehicles?.length || 0) + (dsLessons?.length || 0) + (dsPayments?.length || 0) + (dsTests?.length || 0);
    totalRecords += (hisPatients?.length || 0) + (hisStaff?.length || 0) + (hisWards?.length || 0) + (hisBeds?.length || 0) + (hisAppointments?.length || 0);
    totalRecords += (propProperties?.length || 0) + (propUnits?.length || 0) + (propLeases?.length || 0);

    const fileName = downloadTenantSqlBackup(backupData);

    return {
        fileName,
        totalRecords,
        data: backupData
    };
}

/**
 * Complete, authoritative list of all relational tables across the entire multi-tenant platform
 */
export const FULL_PLATFORM_SQL_TABLES: string[] = [
    // 1. Tenancy, Core & Geography
    'counties',
    'constituencies',
    'wards',
    'institutions',
    'branches',
    'institution_module_states',
    'institution_extension_requests',
    'school_registry',
    'school_authorized_devices',
    'school_router_profiles',
    'school_projects',
    'project_updates',
    'school_ads',
    'school_gallery',

    // 2. Identity, Access, Tasks & Biometrics
    'users',
    'students',
    'tasks',
    'activity_log',
    'audit_log',
    'audit_reports',
    'audit_issues',
    'biometric_devices',
    'biometric_enrollments',
    'biometric_device_commands',
    'staff_attendance_daily',
    'staff_attendance_logs',
    'employee_documents',

    // 3. Academic Structure, Curriculum & Schemes
    'departments',
    'academic_levels',
    'academic_years',
    'semesters',
    'courses',
    'course_levels',
    'subjects',
    'subject_allocations',
    'class_subject_allocations',
    'student_enrollments',
    'student_clearances',
    'student_promotion_history',
    'student_subject_exemptions',
    'student_conduct_records',
    'discipline_incidents',
    'schemes_of_work',
    'school_leaving_certificates',
    'observation_notes',
    'student_parent_messages',

    // 4. Scheduling, Timetables & Allocations
    'timetable_settings',
    'exam_timetable_settings',
    'allocation_requests',
    'allocations',
    'timetable_entries',
    'exam_timetable_entries',
    'teacher_lesson_plans',
    'lesson_ratings',

    // 5. Assessments, Attendance & Feedback
    'assessments',
    'assessment_marks',
    'student_attendances',
    'teacher_check_ins',
    'teacher_checkin_reminders',
    'teacher_attendance_summary',
    'student_absence_requests',
    'absence_requests',
    'leave_requests',
    'leave_out_requests',
    'time_off_requests',
    'feedback_submissions',
    'guest_feedback',

    // 6. Finance, Invoicing, Billing & Banking
    'vote_heads',
    'fee_structures',
    'financial_periods',
    'financial_goals',
    'invoices',
    'receipts',
    'expenses',
    'platform_expenses',
    'school_bank_accounts',
    'finance_numbering_configs',
    'inter_bank_transfers',
    'inter_account_transfers',
    'inter_vote_transfers',
    'vote_head_transfers',
    'requisitions',
    'payroll_records',
    'payroll_runs',
    'bank_transactions',
    'bank_feed_transactions',
    'mpesa_transactions',
    'airtel_transactions',
    'intasend_transactions',
    'ncba_transactions',
    'equity_biller_transactions',
    'im_bank_transactions',
    'im_transactions',
    'invoice_clients',
    'company_invoice_settings',
    'institution_wallets',
    'teacher_wallets',
    'wallet_transactions',
    'convenience_fee_configs',
    'super_admin_revenue_wallets',
    'fee_promises',
    'fee_goods_proposals',
    'tenant_bills',
    'transactions',
    'payments',
    'commission_withdrawal_requests',
    'bursary_disbursements',
    'ng_cdf_bursaries',
    'ng_cdf_funds',
    'ng_cdf_school_grants',
    'gok_capitation_logs',

    // 7. Library Module
    'books',
    'library_transactions',
    'library_fines',
    'library_settings',
    'book_reservations',
    'book_stock_receipts',

    // 8. Boarding, Logistics, Vehicles & Fleet
    'boarding_houses',
    'boarding_rooms',
    'boarding_beds',
    'boarding_allocations',
    'bed_allocations',
    'boarding_maintenance_logs',
    'boarding_checkins',
    'boarding_checkouts',
    'vehicles',
    'transport_onboarding',
    'vehicle_logs',
    'transport_bills',
    'transport_sacco_accounts',
    'transport_sacco_daily_remittances',
    'transport_sacco_loan_applications',
    'transport_sacco_settings',
    'transport_sacco_transactions',
    'logistic_drivers',
    'logistic_trips',
    'logistic_vehicles',
    'logistic_vehicle_maintenance',

    // 9. Physical Facilities, Inventory & Maintenance
    'buildings',
    'building_floors',
    'building_offices',
    'rooms',
    'inventory',
    'maintenance_requests',

    // 10. Security & Gatehouse Kiosk
    'visitors',
    'security_alerts',
    'watchlist_records',
    'security_guards',
    'security_patrol_scans',
    'occurrence_book',
    'building_visitor_logs',
    'building_visitor_assets',
    'armory_equipment',
    'rapid_response_units',
    'client_site_contracts',

    // 11. School Remedials & Duty Rosters
    'school_remedial_rate_settings',
    'school_remedial_allocations',
    'school_remedial_subjects',
    'school_remedial_sessions',
    'school_remedial_payouts',
    'school_remedial_opening_balances',
    'school_remedial_duty_roster',

    // 12. Retail, Store & Point of Sale (POS)
    'store_categories',
    'retail_stores',
    'retail_customers',
    'retail_inventory',
    'retail_inventory_items',
    'retail_store_stock',
    'retail_serialized_items',
    'retail_sales',
    'retail_stock_receipts',
    'retail_stock_issues',
    'retail_stock_transfers',
    'retail_stock_transfer_items',
    'retail_expenses',
    'retail_marketplace_orders',
    'retail_wishlist',
    'retail_couriers',
    'retail_delivery_rates',
    'retail_commissions_ledger',

    // 13. Cafe & Restaurant POS
    'cafe_menu_items',
    'cafe_orders',

    // 14. Carwash Module
    'carwash_settings',
    'carwash_accounts',
    'carwash_services',
    'carwash_packages',
    'carwash_add_ons',
    'carwash_vehicles',
    'carwash_customers',
    'carwash_jobs',
    'carwash_sales',
    'carwash_expenses',
    'carwash_inventory',
    'carwash_shifts',
    'carwash_payroll',
    'carwash_feedback',
    'carwash_journal_entries',
    'carwash_journal_lines',

    // 15. Driving School Vertical (DS)
    'ds_settings',
    'ds_license_categories',
    'ds_votes',
    'ds_fee_structures',
    'ds_instructors',
    'ds_vehicles',
    'ds_students',
    'ds_lessons',
    'ds_skill_mastery',
    'ds_invoices',
    'ds_payments',
    'ds_expenditures',
    'ds_leads',
    'ds_tests',

    // 16. Healthcare / Hospital Information System (HIS)
    'his_staff',
    'his_patients',
    'his_wards',
    'his_beds',
    'his_admissions',
    'his_inpatient_records',
    'his_appointments',
    'his_queue_calls',
    'his_vital_statistics',
    'his_clinical_events',
    'his_medical_notes',
    'his_medication_logs',
    'his_prescriptions',
    'his_prescription_items',
    'his_pharmacy_inventory',
    'his_pharmacy_batches',
    'his_pharmacy_interactions',
    'his_pharmacy_sales',
    'his_pharmacy_sale_items',
    'his_pharmacy_ledger',
    'his_pharmacy_staff',
    'his_pharmacy_settings',
    'his_pharmacy_narcotics_ledger',
    'his_pharmacy_adherence_alerts',
    'his_billing_items',
    'his_billing_settings',
    'his_billing_transactions',
    'his_invoices',
    'his_payments',
    'his_financial_records',
    'his_claims',
    'his_insurance_providers',
    'his_insurance_remittances',
    'his_tariffs',
    'his_expenditures',
    'his_lab_requests',
    'his_partner_labs',
    'his_hospital_rooms',
    'his_dental_charts',
    'his_eye_prescriptions',
    'his_broadcasts',
    'his_patient_id_config',
    'his_staff_attendance',
    'his_nurse_tasks',
    'his_audit_logs',
    'his_anc_records',
    'his_delivery_records',
    'his_cwc_immunizations',
    'his_nbu_admissions',
    'his_branding',
    'icd_codes',

    // 17. Property Management (PM)
    'pm_settings',
    'pm_landlords',
    'pm_properties',
    'pm_units',
    'pm_tenants',
    'pm_listings',
    'pm_inquiries',
    'pm_leases',
    'pm_invoices',
    'pm_payments',
    'pm_expenses',
    'pm_disbursements',
    'pm_inspections',
    'pm_deposit_refunds',
    'pm_notices',
    'pm_maintenance',
    'pm_utility_readings',
    'property_management_properties',
    'property_management_units',
    'property_management_leases',

    // 18. Auto Marketplace, Showroom & Servicing
    'showroom_settings',
    'car_sales_listings',
    'car_sales_invoices',
    'car_sales_payments',
    'car_appraisals',
    'car_test_drives',
    'car_servicing_packages',
    'car_servicing_sales',

    // 19. Fuel Station & Petroleum Management
    'fuel_stations',
    'fuel_pumps',
    'fuel_tanks',
    'fuel_prices',
    'fuel_price_history',
    'fuel_sales',
    'fuel_transfers',
    'fuel_inventory_log',
    'fuel_station_customers',
    'fuel_station_assets',
    'fuel_fleet_accounts',
    'fuel_fleet_cards',
    'fuel_fleet_telemetry',
    'fuel_etr_configs',
    'fuel_financial_reports',
    'fuel_leak_alerts',
    'fuel_maintenance_logs',
    'fuel_reorder_predictions',
    'fuel_sms_logs',
    'fuel_staff_achievements',

    // 20. Cooperative, Sacco, Milling & Agrovet
    'coop_farmers',
    'coop_collections',
    'coop_riders',
    'coop_monthly_payouts',
    'coop_expenses',
    'coop_income',
    'coop_agrovet_inventory',
    'coop_agrovet_sales',
    'sacco_accounts',
    'sacco_transactions',
    'agrovet_products',
    'agrovet_batches',
    'agrovet_customers',
    'agrovet_animals',
    'agrovet_sales',
    'agrovet_sale_items',
    'agrovet_consultations',
    'agrovet_credit',
    'grain_suppliers',
    'grain_sale_orders',
    'milling_silos',
    'milling_batch_runs',
    'weighbridge_intake_tickets',
    'flour_packaging_shifts',
    'animal_feed_batches',

    // 21. Civil Engineering, Yards & Construction
    'civil_yards',
    'civil_products',
    'civil_batches',
    'civil_sales',
    'construction_projects',

    // 22. Vocational & Beauty College (BC)
    'bc_settings',
    'bc_fee_structures',
    'bc_trainers',
    'bc_courses',
    'bc_students',
    'bc_practicals',
    'bc_invoices',
    'bc_payments',

    // 23. Alumni & Alumnae Network
    'alumnae_members',
    'alumnae_events',
    'alumnae_contributions',
    'alumni_groups',
    'alumni_group_members',
    'alumni_posts',
    'alumni_comments',
    'alumni_follows',
    'alumni_messages',
    'alumni_jobs',
    'alumni_businesses',
    'alumni_event_rsvps',
    'alumni_document_requests',
    'alumni_school_inbox',
    'alumni_school_staff',
    'alumni_success_stories',
    'alumni_notifications',

    // 24. Political, Campaign & Elections (EduVote AI)
    'election_events',
    'election_candidates',
    'election_voters_ledger',
    'election_ballots',
    'election_checkins',
    'political_parties',
    'political_units',
    'campaign_profiles',
    'campaign_members',
    'campaign_supporters',
    'campaign_groups',
    'campaign_group_members',
    'campaign_villages',
    'campaign_events',
    'campaign_tasks',
    'campaign_task_logs',
    'campaign_feedback',
    'campaign_posts',
    'campaign_votes',
    'voter_outreach',

    // 25. Faith, Church & Religious Administration
    'church_cell_groups',
    'church_mass_intentions',
    'church_sacraments',
    'church_fasting_periods',
    'church_saint_days',
    'church_follow_ups',

    // 26. Family Heritage & Totems
    'heritage_members',
    'heritage_stories',
    'heritage_totems',
    'heritage_gallery',
    'heritage_announcements',

    // 27. Events, Community & Law Operations
    'events',
    'institution_events',
    'event_categories',
    'event_participants',
    'event_splits',
    'event_pins',
    'event_pledges',
    'event_medical_logs',
    'law_clients',
    'law_matters',
    'law_documents',
    'law_time_entries',
    'law_invoices',
    'law_agreements',
    'law_agreement_templates',
    'law_trust_transactions',
    'bulletin_items',
    'document_collections',
    'contracts',
    'demo_requests',
    'marketing_prospects',
    'lead_scout_records',

    // 28. Communications, SMS, WhatsApp & Notifications
    'sms_logs',
    'sms_outbox',
    'whatsapp_configs',
    'whatsapp_logs',
    'broadcaster_messages',
    'app_notifications',
    'branch_integration_configs',
    'integration_logs',

    // 29. EduFlow Workflow System
    'eduflow_tasks',
    'eduflow_files',
    'eduflow_comments',

    // 30. Procurement, Tenders & Supply Chain
    'suppliers',
    'procurement_suppliers',
    'procurement_items',
    'procurement_lpos',
    'procurement_invoices',

    // 31. County Central Stores & Inventory
    'county_stores',
    'county_inventory_categories',
    'county_inventory',
    'county_dispatch_manifests',
    'county_dispatch_items',
    'county_school_requisitions',

    // 32. Station Shifts, Marketing & Referrals
    'station_shifts',
    'station_items',
    'station_pos_sales',
    'station_pos_sale_items',
    'referral_program_settings',
    'teacher_referral_profiles',
    'school_teacher_referrals',
    'school_referral_leads',
    'revision_marketplace',
    'student_subscription_plans',
    'student_subscriptions',
    'school_intel_submissions',
    'school_intel_replies',
    'branding_price_settings',
    'system_settings',

    // 33. Miscellaneous & System Extensions
    'hospitality_items',
    'hr_allowance_categories',
    'hr_deduction_categories',
    'teacher_checkins',
];


export interface FullSqlBackupProgress {
    currentTable: string;
    completedTables: number;
    totalTables: number;
    percent: number;
}

export interface FullSqlBackupResult {
    fileName: string;
    totalRecords: number;
    totalTables: number;
    tableCounts: Record<string, number>;
    sqlContent: string;
}

/**
 * Triggers a browser download for the compiled full database SQL backup text
 */
export function downloadFullSqlBackup(sqlContent: string): string {
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `eduai_full_database_backup_${dateStr}.sql`;
    return executeSafeBlobDownload(sqlContent, fileName);
}

/**
 * Gathers complete records across all platform tables and triggers a full SQL database backup download.
 * Ensures zero table omissions, queries both live remote API and local caches, and guarantees
 * deterministic dependency ordering in the generated SQL file.
 */
export async function collectAndDownloadFullSqlBackup(options?: {
    inMemoryFallback?: Record<string, any[]>;
    onProgress?: (progress: FullSqlBackupProgress) => void;
    includeSchema?: boolean;
}): Promise<FullSqlBackupResult> {
    const { apiService } = await import('../services/apiService');
    let localDbRef: any = null;
    try {
        const { localDb } = await import('../services/localDb');
        localDbRef = localDb;
    } catch (_) {}

    const totalTables = FULL_PLATFORM_SQL_TABLES.length;
    let completedTables = 0;
    const tableCounts: Record<string, number> = {};
    const tableSqlMap: Record<string, string> = {};

    // Process tables in concurrency-friendly batches of 6 for high speed with minimal browser memory overhead
    const batchSize = 6;
    for (let i = 0; i < FULL_PLATFORM_SQL_TABLES.length; i += batchSize) {
        const batch = FULL_PLATFORM_SQL_TABLES.slice(i, i + batchSize);
        await Promise.all(
            batch.map(async (tableName) => {
                let rows: any[] = [];
                try {
                    if (typeof apiService?.fetchModuleRecords === 'function') {
                        rows = await apiService.fetchModuleRecords(tableName, undefined, undefined, {
                            limit: 100000,
                            bypassCache: true
                        }).catch(() => []);
                    }
                } catch (e) {
                    rows = [];
                }

                if (!Array.isArray(rows)) rows = [];

                // Augment with localDb (IndexedDB) if available
                if (localDbRef && typeof localDbRef.getAll === 'function') {
                    try {
                        const localRows = await localDbRef.getAll(tableName).catch(() => []);
                        if (Array.isArray(localRows) && localRows.length > 0) {
                            const existingKeys = new Set(rows.map(r => r?.id || JSON.stringify(r)));
                            for (const item of localRows) {
                                const key = item?.id || JSON.stringify(item);
                                if (!existingKeys.has(key)) {
                                    rows.push(item);
                                    existingKeys.add(key);
                                }
                            }
                        }
                    } catch (_) {}
                }

                // Augment with localStorage cache if available
                if (typeof localStorage !== 'undefined') {
                    try {
                        const rawLocal = localStorage.getItem(`eduai_${tableName}`) || localStorage.getItem(tableName);
                        if (rawLocal) {
                            const parsed = JSON.parse(rawLocal);
                            const list = Array.isArray(parsed) ? parsed : (parsed?.items || parsed?.data || []);
                            if (Array.isArray(list) && list.length > 0) {
                                const existingKeys = new Set(rows.map(r => r?.id || JSON.stringify(r)));
                                for (const item of list) {
                                    const key = item?.id || JSON.stringify(item);
                                    if (!existingKeys.has(key)) {
                                        rows.push(item);
                                        existingKeys.add(key);
                                    }
                                }
                            }
                        }
                    } catch (_) {}
                }

                // Augment with in-memory fallback data if available
                if (options?.inMemoryFallback && Array.isArray(options.inMemoryFallback[tableName])) {
                    const fallbackList = options.inMemoryFallback[tableName];
                    const existingKeys = new Set(rows.map(r => r?.id || JSON.stringify(r)));
                    for (const item of fallbackList) {
                        const key = item?.id || JSON.stringify(item);
                        if (!existingKeys.has(key)) {
                            rows.push(item);
                            existingKeys.add(key);
                        }
                    }
                }

                completedTables++;
                if (options?.onProgress) {
                    options.onProgress({
                        currentTable: tableName,
                        completedTables,
                        totalTables,
                        percent: Math.round((completedTables / totalTables) * 100)
                    });
                }

                if (rows.length > 0) {
                    let exportRows = rows;
                    if (tableName === 'library_settings') {
                        exportRows = rows.map((s: any) => {
                            const instId = s.institution_id || s.institutionId || 'inst_default';
                            const overdue = s.overdue_fine_per_day !== undefined ? s.overdue_fine_per_day : (s.overdueFinePerDay ?? 0);
                            const maxBooks = s.max_books_per_user !== undefined ? s.max_books_per_user : (s.maxBooksPerUser ?? 3);
                            const expiry = s.reservation_expiry_days !== undefined ? s.reservation_expiry_days : (s.reservationExpiryDays ?? 3);
                            const period = s.default_lending_period_days !== undefined ? s.default_lending_period_days : (s.defaultLendingPeriodDays ?? 14);
                            const updated = s.updated_at || s.updatedAt || new Date().toISOString();
                            return {
                                institution_id: instId,
                                institutionId: instId,
                                overdue_fine_per_day: overdue,
                                overdueFinePerDay: String(overdue),
                                max_books_per_user: maxBooks,
                                maxBooksPerUser: maxBooks,
                                reservation_expiry_days: expiry,
                                reservationExpiryDays: expiry,
                                default_lending_period_days: period,
                                defaultLendingPeriodDays: period,
                                updated_at: updated,
                                updatedAt: updated
                            };
                        });
                    } else if (tableName === 'ds_settings') {
                        exportRows = rows.map((s: any) => {
                            const instId = s.institution_id || s.institutionId || 'inst_default';
                            return {
                                ...s,
                                institution_id: instId,
                                institutionId: instId
                            };
                        });
                    }
                    tableCounts[tableName] = exportRows.length;
                    const sql = buildInsertStatements(tableName, exportRows);
                    if (sql) {
                        tableSqlMap[tableName] = sql;
                    }
                }
            })
        );
    }

    // Assemble SQL sections in the exact logical order of FULL_PLATFORM_SQL_TABLES
    const tableSqlSections: string[] = [];
    for (const tbl of FULL_PLATFORM_SQL_TABLES) {
        if (tableSqlMap[tbl]) {
            tableSqlSections.push(tableSqlMap[tbl]);
        }
    }

    const totalRecords = Object.values(tableCounts).reduce((acc, count) => acc + count, 0);
    const populatedTables = Object.keys(tableCounts).length;
    const now = new Date();
    const timestamp = now.toISOString();

    // Prepend Master DDL Schema so that fresh/empty databases immediately have the tables before data insertion
    let schemaSection = '';
    if (options?.includeSchema !== false) {
        try {
            const { generateFullSqlScript } = await import('./sqlGenerator');
            schemaSection = [
                `-- ============================================================================`,
                `-- PART 1: MASTER DDL SCHEMA DEFINITIONS (TABLES, COLUMNS, INDEXES, CONSTRAINTS)`,
                `-- Ensures tables exist before data insertion so empty databases import smoothly`,
                `-- ============================================================================`,
                ``,
                generateFullSqlScript(),
                ``
            ].join('\n');
        } catch (e) {
            console.warn('[FullSqlBackup] Failed to load dynamic DDL schema generator:', e);
        }
    }

    const header = [
        `-- ============================================================================`,
        `-- EduAI Automation - Master Multi-Tenant PostgreSQL Database Dump (Schema + Data)`,
        `-- Generated At       : ${timestamp}`,
        `-- Export Scope       : Full Platform (All Schemas, Tables, Tenants, Users & Modules)`,
        `-- Total Tables Dumped: ${populatedTables} of ${totalTables} monitored schemas`,
        `-- Total Records      : ${totalRecords.toLocaleString()} rows`,
        `-- Generated By       : Super Admin Cyber Command`,
        `-- Mode               : Idempotent (CREATE TABLE IF NOT EXISTS + ON CONFLICT Upserts)`,
        `-- ============================================================================`,
        ``,
        `SET statement_timeout = 0;`,
        `SET lock_timeout = 0;`,
        `SET client_encoding = 'UTF8';`,
        `SET standard_conforming_strings = on;`,
        `SET check_function_bodies = false;`,
        `SET client_min_messages = warning;`,
        `SET row_security = off;`,
        ``,
        `-- ============================================================================`,
        `-- PRE-RESTORE UNIVERSAL ARRAY TO JSONB MIGRATION & CONSTRAINT NEUTRALIZATION`,
        `-- Ensures that all legacy text[] array columns are migrated to JSONB before ANY inserts`,
        `-- ============================================================================`,
        `DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND data_type = 'ARRAY' AND ((table_name = 'users' AND column_name IN ('expertise', 'roles', 'enrolled_subject_ids', 'parent_ids', 'student_ids')) OR (table_name = 'rooms' AND column_name IN ('equipment')) OR (table_name = 'institutions' AND column_name IN ('stream_definitions', 'streamDefinitions')) OR (table_name = 'allocation_requests' AND column_name IN ('course_level_ids', 'subject_ids')) OR (table_name = 'carwash_jobs' AND column_name IN ('add_ons')) OR (table_name = 'pm_listings' AND column_name IN ('images', 'features')) OR (table_name = 'his_patients' AND column_name IN ('allergies', 'chronic_conditions')) OR (table_name = 'his_prescriptions' AND column_name IN ('attached_files')) OR (table_name = 'car_sales_listings' AND column_name IN ('gallery_urls')) OR (table_name = 'car_appraisals' AND column_name IN ('images')) OR (table_name = 'synergy_posts' AND column_name IN ('likes', 'student_ids')))) LOOP BEGIN EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', r.table_name, r.column_name); EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE JSONB USING CASE WHEN %I IS NULL THEN ''[]''::jsonb ELSE to_jsonb(%I) END', r.table_name, r.column_name, r.column_name, r.column_name); EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT ''[]''::jsonb', r.table_name, r.column_name); EXCEPTION WHEN OTHERS THEN NULL; END; END LOOP; END $$;`,
        `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'roles' AND data_type = 'ARRAY') THEN ALTER TABLE public.users ALTER COLUMN roles DROP DEFAULT; ALTER TABLE public.users ALTER COLUMN roles TYPE JSONB USING CASE WHEN roles IS NULL THEN '[]'::jsonb ELSE to_jsonb(roles) END; ALTER TABLE public.users ALTER COLUMN roles SET DEFAULT '[]'::jsonb; ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'roles') THEN ALTER TABLE public.users ADD COLUMN roles JSONB DEFAULT '[]'::jsonb; END IF; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'expertise' AND data_type = 'ARRAY') THEN ALTER TABLE public.users ALTER COLUMN expertise DROP DEFAULT; ALTER TABLE public.users ALTER COLUMN expertise TYPE JSONB USING CASE WHEN expertise IS NULL THEN '[]'::jsonb ELSE to_jsonb(expertise) END; ALTER TABLE public.users ALTER COLUMN expertise SET DEFAULT '[]'::jsonb; ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'expertise') THEN ALTER TABLE public.users ADD COLUMN expertise JSONB DEFAULT '[]'::jsonb; END IF; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        ``
    ].join('\n');

    const dataHeader = [
        `-- ============================================================================`,
        `-- PART 2: MULTI-TENANT PLATFORM DATA (IDEMPOTENT UPSERT STATEMENTS)`,
        `-- ============================================================================`,
        ``,
        `BEGIN;`,
        ``,
        `-- Temporarily defer constraints and disable replication triggers if permissions allow`,
        `DO $$ BEGIN SET session_replication_role = 'replica'; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `SET CONSTRAINTS ALL DEFERRED;`,
        ``,
        `-- DYNAMICALLY STRIP ALL FOREIGN KEY CONSTRAINTS ACROSS PUBLIC SCHEMA FOR 100% RELIABLE RESTORE`,
        `DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT conrelid::regclass AS table_name, conname FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace) LOOP BEGIN EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE;'; EXCEPTION WHEN OTHERS THEN NULL; END; END LOOP; END $$;`,
        ``,
        `-- DYNAMICALLY DROP NOT NULL ON ALL institution_id & institutionId COLUMNS ACROSS PUBLIC SCHEMA`,
        `DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name IN ('institution_id', 'institutionId') AND is_nullable = 'NO') LOOP BEGIN EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', r.table_name, r.column_name); EXCEPTION WHEN OTHERS THEN NULL; END; END LOOP; END $$;`,
        ``,
        `-- DYNAMICALLY ENSURE BOTH institution_id & institutionId EXIST ACROSS ALL PUBLIC TABLES`,
        `DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') LOOP IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = r.table_name AND column_name = 'institution_id') THEN EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS "institutionId" TEXT', r.table_name); END IF; IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = r.table_name AND column_name = 'institutionId') THEN EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS institution_id TEXT', r.table_name); END IF; END LOOP; END $$;`,
        ``,
        `-- UNIVERSAL BEFORE-INSERT SYNCHRONIZATION TRIGGER FOR TENANT IDENTIFIERS`,
        `CREATE OR REPLACE FUNCTION public.fn_sync_institution_ids() RETURNS TRIGGER AS $$ DECLARE new_json jsonb; BEGIN new_json := to_jsonb(NEW); IF (new_json ? 'institutionId') AND (new_json->>'institutionId') IS NOT NULL THEN IF NEW.institution_id IS NULL THEN NEW.institution_id := new_json->>'institutionId'; END IF; END IF; IF (new_json ? 'institution_id') AND (new_json->>'institution_id') IS NOT NULL THEN IF NEW."institutionId" IS NULL THEN NEW."institutionId" := new_json->>'institution_id'; END IF; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;`,
        `DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT c1.table_name FROM information_schema.columns c1 JOIN information_schema.columns c2 ON c1.table_name = c2.table_name AND c1.table_schema = c2.table_schema WHERE c1.table_schema = 'public' AND c1.column_name = 'institution_id' AND c2.column_name = 'institutionId') LOOP EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_inst_id ON public.%I', r.table_name); EXECUTE format('CREATE TRIGGER trg_sync_inst_id BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_sync_institution_ids()', r.table_name); END LOOP; END $$;`,
        ``,
        `-- FIX FOREIGN KEY CONSTRAINTS FOR RESTORE`,
        `ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_reseller_id_fkey CASCADE;`,
        `ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_county_id_fkey CASCADE;`,
        `ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_institution_id_fkey CASCADE;`,
        `ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_department_id_fkey CASCADE;`,
        `ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_department_id_fkey CASCADE;`,
        `ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_department_id_fkey CASCADE;`,
        `ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_building_id_fkey CASCADE;`,
        `ALTER TABLE public.semesters DROP CONSTRAINT IF EXISTS semesters_academic_year_id_fkey CASCADE;`,
        `ALTER TABLE public.semesters DROP CONSTRAINT IF EXISTS semesters_institution_id_fkey CASCADE;`,
        `DO $$ BEGIN ALTER TABLE public.semesters ALTER COLUMN academic_year_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.semesters ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.academic_years ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `INSERT INTO public.academic_years (id, name, start_date, end_date, institution_id, status) VALUES ('ay_1770440553949', 'Academic Year 2026', '2026-01-01', '2026-12-31', 'inst_1770144450093_f9p2x', 'inactive') ON CONFLICT (id) DO NOTHING;`,
        `ALTER TABLE public.institution_module_states DROP CONSTRAINT IF EXISTS institution_module_states_institution_id_fkey CASCADE;`,
        `ALTER TABLE public.institution_module_states DROP CONSTRAINT IF EXISTS institution_module_states_institution_id_module_id_key CASCADE;`,
        `ALTER TABLE public.institution_module_states DROP CONSTRAINT IF EXISTS uq_institution_module_states_inst_module CASCADE;`,
        `ALTER TABLE public.institution_module_states DROP CONSTRAINT IF EXISTS uq_ims_inst_module CASCADE;`,
        `DROP INDEX IF EXISTS public.institution_module_states_institution_id_module_id_key CASCADE;`,
        `DO $$ BEGIN ALTER TABLE public.users ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.users ALTER COLUMN role DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key CASCADE;`,
        `DROP INDEX IF EXISTS public.users_email_key CASCADE;`,
        `DO $$ BEGIN ALTER TABLE public.institution_module_states ALTER COLUMN module_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.institution_module_states ALTER COLUMN status DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.institution_module_states ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS "0" JSONB;`,
        `ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS "data" JSONB DEFAULT '{}'::jsonb;`,
        `DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN title DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN title SET DEFAULT 'Audit Report'; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN period DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN overall_risk DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN run_at DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN report_type DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.audit_reports ALTER COLUMN generated_by DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `ALTER TABLE public.audit_issues DROP CONSTRAINT IF EXISTS audit_issues_report_id_fkey CASCADE;`,
        `DO $$ BEGIN ALTER TABLE public.audit_issues ALTER COLUMN report_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.audit_issues ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.mpesa_transactions ALTER COLUMN receipt_no DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.mpesa_transactions ALTER COLUMN receipt_no SET DEFAULT 'MPESA_REC'; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.mpesa_transactions ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.ds_license_categories ALTER COLUMN category_code DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.ds_license_categories ALTER COLUMN category_name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.ds_license_categories ALTER COLUMN code DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.ds_license_categories ALTER COLUMN name DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.ds_license_categories ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.his_clinical_events ALTER COLUMN event_type DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.his_clinical_events ALTER COLUMN event_type SET DEFAULT 'clinical_event'; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.his_clinical_events ALTER COLUMN title DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.his_clinical_events ALTER COLUMN title SET DEFAULT 'Clinical Event'; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `DO $$ BEGIN ALTER TABLE public.his_clinical_events ALTER COLUMN institution_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        ``,
        `-- CONVERT LEGACY TEXT[] / ARRAY COLUMNS TO JSONB FOR 100% IMPORT COMPATIBILITY`,
        `DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND data_type = 'ARRAY' AND ((table_name = 'users' AND column_name IN ('expertise', 'roles', 'enrolled_subject_ids', 'parent_ids', 'student_ids')) OR (table_name = 'rooms' AND column_name IN ('equipment')) OR (table_name = 'institutions' AND column_name IN ('stream_definitions', 'streamDefinitions')) OR (table_name = 'allocation_requests' AND column_name IN ('course_level_ids', 'subject_ids')) OR (table_name = 'carwash_jobs' AND column_name IN ('add_ons')) OR (table_name = 'pm_listings' AND column_name IN ('images', 'features')) OR (table_name = 'his_patients' AND column_name IN ('allergies', 'chronic_conditions')) OR (table_name = 'his_prescriptions' AND column_name IN ('attached_files')) OR (table_name = 'car_sales_listings' AND column_name IN ('gallery_urls')) OR (table_name = 'car_appraisals' AND column_name IN ('images')) OR (table_name = 'synergy_posts' AND column_name IN ('likes', 'student_ids')))) LOOP BEGIN EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', r.table_name, r.column_name); EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE JSONB USING CASE WHEN %I IS NULL THEN ''[]''::jsonb ELSE to_jsonb(%I) END', r.table_name, r.column_name, r.column_name, r.column_name); EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT ''[]''::jsonb', r.table_name, r.column_name); EXCEPTION WHEN OTHERS THEN NULL; END; END LOOP; END $$;`,
        `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'expertise' AND data_type = 'ARRAY') THEN ALTER TABLE public.users ALTER COLUMN expertise DROP DEFAULT; ALTER TABLE public.users ALTER COLUMN expertise TYPE JSONB USING CASE WHEN expertise IS NULL THEN '[]'::jsonb ELSE to_jsonb(expertise) END; ALTER TABLE public.users ALTER COLUMN expertise SET DEFAULT '[]'::jsonb; ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'expertise') THEN ALTER TABLE public.users ADD COLUMN expertise JSONB DEFAULT '[]'::jsonb; END IF; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        ``,
        `-- DYNAMICALLY FIX ERRONEOUS BOOLEAN COLUMNS (DATES, IDS, POLICIES) TO TEXT`,
        `DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND data_type = 'boolean' AND (column_name ILIKE '%date%' OR column_name ILIKE '%time%' OR column_name ILIKE '%policy%' OR column_name IN ('activeGradingSystemId', 'active_grading_system_id', 'cancellationPolicy', 'cancellation_policy', 'issueDate', 'issue_date', 'issuedDate', 'issued_date'))) LOOP BEGIN EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', r.table_name, r.column_name); EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE TEXT USING NULL', r.table_name, r.column_name); EXCEPTION WHEN OTHERS THEN NULL; END; END LOOP; END $$;`,
        ``,
        `-- DYNAMICALLY ENSURE PRIMARY KEY OR UNIQUE CONSTRAINT ON "id" FOR ALL BASE TABLES`,
        `DO $$ DECLARE r RECORD; BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'library_settings') THEN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.library_settings'::regclass AND contype = 'p') THEN BEGIN ALTER TABLE public.library_settings ADD PRIMARY KEY (institution_id); EXCEPTION WHEN OTHERS THEN NULL; END; END IF; END IF; IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_settings') THEN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ds_settings'::regclass AND contype = 'p') THEN BEGIN ALTER TABLE public.ds_settings ADD PRIMARY KEY (institution_id); EXCEPTION WHEN OTHERS THEN NULL; END; END IF; END IF; FOR r IN (SELECT c.table_name FROM information_schema.columns c JOIN information_schema.tables t ON c.table_name = t.table_name AND t.table_schema = 'public' WHERE c.table_schema = 'public' AND c.column_name = 'id' AND t.table_type = 'BASE TABLE' AND c.table_name NOT IN ('library_settings', 'ds_settings')) LOOP IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey) WHERE con.connamespace = 'public'::regnamespace AND con.conrelid = r.table_name::regclass AND con.contype IN ('p', 'u') AND att.attname = 'id') THEN BEGIN EXECUTE format('ALTER TABLE public.%I ADD PRIMARY KEY (id)', r.table_name); EXCEPTION WHEN OTHERS THEN BEGIN EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (id)', r.table_name, 'uq_' || r.table_name || '_id'); EXCEPTION WHEN OTHERS THEN NULL; END; END; END IF; END LOOP; END $$;`,
        ``,
        `-- PRE-SEED ESSENTIAL / DEFAULT INSTITUTIONS`,
        `INSERT INTO public.institutions (id, name, email, status) VALUES`,
        `    ('1779527512643_8nszj', '1779527512643 8nszj', '17795275126438nszj@placeholder.local', 'trial'),`,
        `    ('inst_1791913405331_gy6tl', 'Inst 1791913405331 Gy6tl', 'inst1791913405331gy6tl@placeholder.local', 'trial'),`,
        `    ('default_inst', 'Default Inst', 'defaultinst@placeholder.local', 'trial'),`,
        `    ('inst_1791521572395_ufyl6', 'Inst 1791521572395 Ufyl6', 'inst1791521572395ufyl6@placeholder.local', 'trial'),`,
        `    ('1781602587516_kqmod', '1781602587516 Kqmod', '1781602587516kqmod@placeholder.local', 'trial'),`,
        `    ('inst_1792259096009_tlj7o', 'Inst 1792259096009 Tlj7o', 'inst1792259096009tlj7o@placeholder.local', 'trial'),`,
        `    ('GLOBAL', 'GLOBAL', 'global@placeholder.local', 'trial'),`,
        `    ('KAPSERET', 'KAPSERET', 'kapseret@placeholder.local', 'trial'),`,
        `    ('county_1786953923332', 'County 1786953923332', 'county1786953923332@placeholder.local', 'trial')`,
        `ON CONFLICT (id) DO NOTHING;`,
        ``,
        `-- SELF-HEALING IMS TRIGGER`,
        `CREATE OR REPLACE FUNCTION public.trg_fix_ims_row() RETURNS TRIGGER AS $$`,
        `BEGIN`,
        `    IF NEW.id IS NULL THEN`,
        `        IF (to_jsonb(NEW)->'0' ? 'id') THEN`,
        `            NEW.id := to_jsonb(NEW)->'0'->>'id';`,
        `            NEW.institution_id := COALESCE(NEW.institution_id, to_jsonb(NEW)->'0'->>'institutionId', to_jsonb(NEW)->'0'->>'institution_id');`,
        `            NEW.module_id := COALESCE(NEW.module_id, to_jsonb(NEW)->'0'->>'moduleId', to_jsonb(NEW)->'0'->>'module_id');`,
        `            NEW.status := COALESCE(NEW.status, to_jsonb(NEW)->'0'->>'status', 'active');`,
        `        ELSE`,
        `            NEW.id := 'ims_' || COALESCE(NEW.module_id, 'mod') || '_' || COALESCE(NEW.institution_id, 'inst_' || substr(md5(random()::text), 1, 8));`,
        `        END IF;`,
        `    END IF;`,
        `    RETURN NEW;`,
        `END;`,
        `$$ LANGUAGE plpgsql;`,
        `DROP TRIGGER IF EXISTS trg_fix_ims_row ON public.institution_module_states;`,
        `CREATE TRIGGER trg_fix_ims_row BEFORE INSERT ON public.institution_module_states FOR EACH ROW EXECUTE FUNCTION public.trg_fix_ims_row();`,
        ``
    ].join('\n');

    const footer = [
        ``,
        `DO $$ BEGIN SET session_replication_role = 'origin'; EXCEPTION WHEN OTHERS THEN NULL; END $$;`,
        `COMMIT;`,
        ``,
        `-- ============================================================================`,
        `-- End of EduAI Automation Master PostgreSQL Data Backup (${totalRecords} records across ${populatedTables} tables)`,
        `-- ============================================================================`,
        ``
    ].join('\n');

    const fullSql = [header, schemaSection, dataHeader, ...tableSqlSections, footer].join('\n');
    const fileName = downloadFullSqlBackup(fullSql);

    return {
        fileName,
        totalRecords,
        totalTables: populatedTables,
        tableCounts,
        sqlContent: fullSql
    };
}
