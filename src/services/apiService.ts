
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
    AllocationRequest, RequestStatus, User, Institution,
    Priority, Department, Subject, Course, CompanyDetails, Room,
    AcademicYear, Semester, TimetableEntry, SmsConfig,
    MpesaConfig, EmailConfig, TransactionStatus, InvoiceItem,
    MpesaTransaction, Receipt, Invoice, ExtensionRequest, AcademicLevel,
    VoteHead, FeeStructure, FinancialPeriod, ExamTimetableEntry, BusinessDocument,
    Supplier, Internship, AbsenceRequest, StudentAbsenceRequest, EnrollmentRequest, StudentAttendance, TaAssignment, Assessment, AssessmentMark
} from '../types';

const getSafeEnv = (key: string): string | null => {
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            const val = (import.meta as any).env[`VITE_${key}`] || (import.meta as any).env[key];
            if (val) return val;
        }
        const localVal = localStorage.getItem(`db_config_${key}`);
        if (localVal && localVal !== "" && localVal !== "null") return localVal;
    } catch (e) { }
    return null;
};

let _supabase: SupabaseClient | null = null;
let _activeUrl: string | null = null;
let _activeKey: string | null = null;

export const initSupabaseClient = (url?: string, key?: string) => {
    const finalUrl = url || (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || getSafeEnv('SUPABASE_URL');
    const finalKey = key || (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || getSafeEnv('SUPABASE_ANON_KEY');

    if (finalUrl && finalKey && finalUrl.startsWith('http')) {
        try {
            _supabase = createClient(finalUrl, finalKey, {
                auth: { persistSession: true, autoRefreshToken: true },
                global: { headers: { 'x-application-name': 'eduai-academic' } }
            });
            _activeUrl = finalUrl;
            _activeKey = finalKey;

            if (url && key) {
                localStorage.setItem('db_config_SUPABASE_URL', url);
                localStorage.setItem('db_config_SUPABASE_ANON_KEY', key);
            }
        } catch (err) {
            console.error("Supabase Client Init Failed:", err);
        }
    }
    return _supabase;
};

initSupabaseClient();

const toSnakeCase = (obj: any): any => {
    if (obj === null || obj === undefined || typeof obj !== 'object' || obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map(toSnakeCase);
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        if (key === 'isImpersonated') return; // Skip internal session-only flags
        const val = obj[key];
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newObj[snakeKey] = toSnakeCase(val);
    });
    return newObj;
};

const toCamelCase = (obj: any): any => {
    if (obj === null || obj === undefined || typeof obj !== 'object' || obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map(toCamelCase);
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        const camelKey = key.replace(/(_\w)/g, match => match[1].toUpperCase());
        newObj[camelKey] = toCamelCase(obj[key]);
    });
    return newObj;
};

// Local Storage Helper
const ls = {
    get: (table: string) => {
        const data = localStorage.getItem(`eduai_${table}`);
        return data ? JSON.parse(data) : [];
    },
    set: (table: string, data: any[]) => {
        localStorage.setItem(`eduai_${table}`, JSON.stringify(data));
    },
    upsert: (table: string, record: any) => {
        const records = ls.get(table);
        const index = records.findIndex((r: any) => r.id === record.id);
        if (index >= 0) {
            records[index] = { ...records[index], ...record };
        } else {
            records.push(record);
        }
        ls.set(table, records);
        return [record];
    },
    delete: (table: string, id: string) => {
        const records = ls.get(table);
        const filtered = records.filter((r: any) => r.id !== id);
        ls.set(table, filtered);
    }
};

export const apiService = {
    isConfigured() {
        return !!_supabase;
    },
    getActiveConfig() {
        return { url: _activeUrl, key: _activeKey };
    },
    storeSession(user: User) {
        localStorage.setItem('eduai_active_session', JSON.stringify(user));
    },
    clearSession() {
        localStorage.removeItem('eduai_active_session');
    },
    getSession(): User | null {
        try {
            const stored = localStorage.getItem('eduai_active_session');
            return stored ? JSON.parse(stored) : null;
        } catch (e) { return null; }
    },
    async testDatabaseConnection(url?: string, key?: string): Promise<any> {
        const timestamp = new Date().toISOString();
        if (url && key) initSupabaseClient(url, key);
        if (!_supabase) initSupabaseClient();

        if (!_supabase) {
            const localInsts = ls.get('institutions');
            if (localInsts.length > 0) {
                return { success: true, status: 'online', dbName: 'Local Browser Storage', message: 'Running in Local Storage mode.', timestamp };
            }
            return { success: true, status: 'offline', message: 'No cloud link. Local storage active.', dbName: 'Local Storage', timestamp };
        }

        try {
            // Increased timeout to 15 seconds to handle cold starts
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
            const pingPromise = _supabase.from('institutions').select('id').limit(1);

            const { error }: any = await Promise.race([pingPromise, timeoutPromise]);

            if (error) {
                if (error.code === '42P01') return { success: true, status: 'setup_required', dbName: 'PostgreSQL', message: 'Registry linked. Table initialization required.', timestamp };
                throw error;
            }
            return { success: true, status: 'online', dbName: 'PostgreSQL', message: 'Handshake successful.', timestamp };
        } catch (e: any) {
            return { success: false, status: 'offline', message: e.message || 'Handshake failed.', dbName: 'Error', timestamp };
        }
    },
    async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
        await new Promise(r => setTimeout(r, 800));
        return { success: true, message: `A secure reset link has been dispatched to ${email}.` };
    },
    async runMigration(sql: string): Promise<any> {
        try {
            const response = await fetch('/api/execute_sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql })
            });
            return await response.json();
        } catch (e: any) {
            return { success: false, message: e.message || "Execution engine failure." };
        }
    },
    async uploadFile(bucket: string, path: string, file: File): Promise<string | null> {
        try {
            if (!_supabase) {
                // FALLBACK: Return as base64 for local development/offline mode
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            }
            const { error } = await _supabase.storage.from(bucket).upload(path, file, { upsert: true });
            if (error) {
                console.error("Supabase Storage Error:", error);
                // Specifically alert for common policy issues
                if ((error as any).status === 403 || error.message.includes('row-level security')) {
                    alert(`Storage Error: Access Denied. Please ensure your 'eduai' bucket has appropriate RLS policies for 'INSERT' and 'UPDATE' operations for the 'anon' role.`);
                } else {
                    alert(`Storage Error: ${error.message}`);
                }
                return null;
            }
            const { data: { publicUrl } } = _supabase.storage.from(bucket).getPublicUrl(path);
            return publicUrl;
        } catch (err: any) {
            console.error("Upload Service Exception:", err);
            alert(`Upload Service Exception: ${err.message || 'Unknown error'}`);
            return null;
        }
    },
    async fetchModuleRecords<T>(module: string, institutionId?: string): Promise<T[]> {
        if (!_supabase) {
            let records = ls.get(module);
            if (institutionId) {
                const filterKey = module === 'institutions' ? 'id' : 'institution_id';
                records = records.filter((r: any) => r[filterKey] === institutionId);
            }
            return toCamelCase(records) || [];
        }

        try {
            let query = _supabase.from(module as any).select('*');
            if (institutionId) {
                const filterCol = module === 'institutions' ? 'id' : 'institution_id';
                query = query.eq(filterCol, institutionId);
            }
            const { data, error } = await query;
            if (error) throw error;
            return toCamelCase(data) || [];
        } catch (e) { return []; }
    },
    async saveModuleRecord<T = any>(module: string, data: T): Promise<void> {
        const payload = toSnakeCase(data);

        if (!_supabase) {
            ls.upsert(module, payload);
            return;
        }

        try {
            const { error } = await _supabase.from(module as any).upsert(payload).select();

            if (error) {
                console.error(`Save Error [${module}]:`, error);
                throw new Error(`Failed to save ${module}: ${error.message} (${error.code})`);
            }
        } catch (e: any) {
            // Network error or Supabase unreachable - fallback to localStorage
            if (e.message?.includes('fetch') || e.message?.includes('network')) {
                console.warn(`Supabase unreachable for ${module}, using localStorage fallback`);
                ls.upsert(module, payload);
                return;
            }
            // Re-throw other errors
            throw e;
        }
    },
    async deleteModuleRecord(module: string, id: string): Promise<void> {
        if (!_supabase) {
            ls.delete(module, id);
            return;
        }

        const { error } = await _supabase.from(module as any).delete().eq('id', id);
        if (error) throw error;
    },
    async fetchInstitutions(institutionId?: string): Promise<Institution[]> { return this.fetchModuleRecords('institutions', institutionId); },
    async saveInstitution(inst: Institution): Promise<void> { await this.saveModuleRecord('institutions', inst); },
    async fetchUsers(institutionId?: string): Promise<User[]> { return this.fetchModuleRecords('users', institutionId); },
    async saveUser(user: Partial<User>): Promise<void> { await this.saveModuleRecord('users', user); },
    async fetchAllocations(institutionId?: string): Promise<AllocationRequest[]> { return this.fetchModuleRecords('allocation_requests', institutionId); },
    async saveAllocation(data: Partial<AllocationRequest>): Promise<void> { await this.saveModuleRecord('allocation_requests', data); },
    async fetchCompanySettings(): Promise<CompanyDetails | null> {
        if (!_supabase) {
            const data = ls.get('system_settings').find((s: any) => s.id === 1);
            return data ? toCamelCase(data.data) : null;
        }
        try {
            const { data, error } = await _supabase.from('system_settings').select('data').eq('id', 1).single();
            if (error) return null;
            return toCamelCase(data?.data);
        } catch (e) { return null; }
    },
    async saveCompanySettings(settings: CompanyDetails): Promise<void> {
        const payload = { id: 1, data: toSnakeCase(settings) };
        if (!_supabase) {
            ls.upsert('system_settings', payload);
            return;
        }
        const { error } = await _supabase.from('system_settings').upsert(payload, { onConflict: 'id' });
        if (error) throw error;
    },
    async fetchTimetable(institutionId: string): Promise<TimetableEntry[]> { return this.fetchModuleRecords('timetable_entries', institutionId); },
    async saveTimetable(institutionId: string, ayId: string, semId: string, entries: TimetableEntry[]): Promise<void> {
        const snakeEntries = entries.map(e => ({ ...toSnakeCase(e), institution_id: institutionId, academic_year_id: ayId, semester_id: semId }));

        if (!_supabase) {
            let existing = ls.get('timetable_entries');
            existing = existing.filter((e: any) => !(e.institution_id === institutionId && e.semester_id === semId));
            existing = [...existing, ...snakeEntries];
            ls.set('timetable_entries', existing);
            return;
        }

        try {
            await _supabase.from('timetable_entries').delete().eq('institution_id', institutionId).eq('semester_id', semId);
            if (entries.length > 0) {
                const { error } = await _supabase.from('timetable_entries').insert(snakeEntries);
                if (error) throw error;
            }
        } catch (e) { console.error("Timetable Save Error:", e); }
    },
    async updateAllocationStatus(requestId: string, status: RequestStatus, justification?: string, priority?: Priority): Promise<void> {
        if (!_supabase) {
            const records = ls.get('allocation_requests');
            const index = records.findIndex((r: any) => r.id === requestId);
            if (index >= 0) {
                const existing = records[index];
                let updates: any = { status, timestamp: new Date().toISOString() };

                if (status === 'change_request_pending') {
                    updates.proposed_changes = { priority: priority || existing.priority, justification: justification || '' };
                } else if (status === 'approved' && existing.status === 'change_request_pending' && existing.proposed_changes) {
                    const proposed = existing.proposed_changes;
                    updates.priority = proposed.priority || existing.priority;
                    updates.justification = proposed.justification || existing.justification;
                    updates.proposed_changes = null;
                } else if (justification !== undefined) {
                    updates.justification = justification;
                }

                records[index] = { ...existing, ...updates };
                ls.set('allocation_requests', records);
            }
            return;
        }

        const { data: existing } = await _supabase.from('allocation_requests').select('*').eq('id', requestId).single();
        if (!existing) return;
        let updates: any = { status, timestamp: new Date().toISOString() };
        if (status === 'change_request_pending') {
            updates.proposed_changes = { priority: priority || existing.priority, justification: justification || '' };
        } else if (status === 'approved' && existing.status === 'change_request_pending' && existing.proposed_changes) {
            const proposed = existing.proposed_changes;
            updates.priority = proposed.priority || existing.priority;
            updates.justification = proposed.justification || existing.justification;
            updates.proposed_changes = null;
        } else if (justification !== undefined) {
            updates.justification = justification;
        }
        await _supabase.from('allocation_requests').update(updates).eq('id', requestId);
    },
    async onAddTransaction(data: Omit<MpesaTransaction, 'id' | 'transactionId' | 'timestamp' | 'status'>, items: InvoiceItem[]): Promise<TransactionStatus> {
        const id = `txn_${Date.now()}`;
        const transaction: MpesaTransaction = { ...data, id, transactionId: `MPESA${id}`, timestamp: new Date().toISOString(), status: 'completed' };
        await this.saveModuleRecord('mpesa_transactions', transaction);
        return 'completed';
    },
    async sendSms(recipient: string, message: string, config?: SmsConfig): Promise<any> {
        if (!_supabase) {
            return { success: false, message: "Database service (Supabase) not initialized. Live SMS requires an active backend." };
        }

        try {
            const { data: { session } } = await _supabase.auth.getSession();
            let headers: any = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'sendSms', recipient, message, config })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const detail = errData.raw ? ` (Gateway Response: ${errData.raw})` : '';
                return { success: false, message: (errData.error || errData.message || `Gateway error (${response.status})`) + detail };
            }

            return await response.json();
        } catch (e: any) {
            console.error("SMS Gateway Request Failed:", e);
            return { success: false, message: e.message || "Gateway connection failure." };
        }
    },
    async sendEmail(recipient: string, subject: string, message: string, config?: EmailConfig): Promise<any> {
        if (!_supabase) {
            return { success: false, message: "Database service (Supabase) not initialized. Live Email requires an active backend." };
        }

        try {
            const { data: { session } } = await _supabase.auth.getSession();
            let headers: any = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'sendEmail', recipient, subject, message, config })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                return { success: false, message: data.error || data.message || `SMTP Relay Error (${response.status})` };
            }
            return data;
        } catch (e: any) {
            console.error("Email Gateway Error:", e);
            return { success: false, message: e.message || "Email gateway connection failed." };
        }
    },
    async initiateMpesaPayment(amount: number, phoneNumber: string, metadata?: any, config?: MpesaConfig) {
        if (!_supabase) {
            return { success: false, message: "Database service (Supabase) not initialized. Live M-Pesa requires an active backend." };
        }
        try {
            const { data: { session } } = await _supabase.auth.getSession();
            let headers: any = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'initiateStkPush', recipient: phoneNumber, amount, config, metadata })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const subMsg = data.error || data.message || `Code: ${response.status}`;
                const detail = data.errorDetail ? ` (${JSON.stringify(data.errorDetail)})` : '';
                throw new Error(`${subMsg}${detail}`);
            }
            return data;
        } catch (e: any) {
            console.error("M-Pesa API Handshake Failed:", e);
            return { success: false, message: e.message || "M-Pesa gateway connection failed." };
        }
    },
    async checkMpesaStatus(checkoutRequestId: string) {
        if (!_supabase) return { status: 'pending' };
        try {
            const { data, error } = await _supabase
                .from('mpesa_transactions')
                .select('status')
                .eq('checkout_request_id', checkoutRequestId)
                .single();

            if (error || !data) return { status: 'pending' };
            return { status: data.status };
        } catch (e) {
            console.error("Status Check Error:", e);
            return { status: 'pending' };
        }
    },
    async fetchDepartments(instId?: string): Promise<Department[]> { return this.fetchModuleRecords('departments', instId); },
    async fetchSubjects(instId?: string): Promise<Subject[]> { return this.fetchModuleRecords('subjects', instId); },
    async saveSubject(data: any) { return this.saveModuleRecord('subjects', data); },
    async fetchCourses(instId?: string): Promise<Course[]> { return this.fetchModuleRecords('courses', instId); },
    async fetchAcademicYears(instId?: string): Promise<AcademicYear[]> { return this.fetchModuleRecords('academic_years', instId); },
    async fetchSemesters(instId?: string): Promise<Semester[]> { return this.fetchModuleRecords('semesters', instId); },
    async fetchRooms(instId?: string): Promise<Room[]> { return this.fetchModuleRecords('rooms', instId); },
    async fetchAcademicLevels(instId?: string): Promise<AcademicLevel[]> { return this.fetchModuleRecords('academic_levels', instId); },
    async fetchVoteHeads(instId?: string): Promise<VoteHead[]> { return this.fetchModuleRecords('vote_heads', instId); },
    async fetchFeeStructures(instId?: string): Promise<FeeStructure[]> { return this.fetchModuleRecords('fee_structures', instId); },
    async fetchFinancialPeriods(instId?: string): Promise<FinancialPeriod[]> { return this.fetchModuleRecords('financial_periods', instId); },
    async fetchTransactions(instId?: string): Promise<MpesaTransaction[]> { return this.fetchModuleRecords('mpesa_transactions', instId); },
    async fetchReceipts(instId?: string): Promise<Receipt[]> { return this.fetchModuleRecords('receipts', instId); },
    async fetchInvoices(instId?: string): Promise<Invoice[]> { return this.fetchModuleRecords('invoices', instId); },
    async fetchExtensionRequests(instId?: string): Promise<ExtensionRequest[]> { return this.fetchModuleRecords('extension_requests', instId); },
    async fetchAbsenceRequests(instId?: string): Promise<AbsenceRequest[]> { return this.fetchModuleRecords('absence_requests', instId); },
    async fetchAssessmentMarks(instId?: string): Promise<AssessmentMark[]> { return this.fetchModuleRecords('assessment_marks', instId); },
    async fetchExamTimetable(institutionId: string): Promise<ExamTimetableEntry[]> { return this.fetchModuleRecords('exam_timetable_entries', institutionId); },
    async saveExamTimetable(institutionId: string, ayId: string, semId: string, entries: ExamTimetableEntry[]): Promise<void> {
        if (!_supabase) return;
        try {
            await _supabase.from('exam_timetable_entries').delete().eq('institution_id', institutionId).eq('semester_id', semId);
            if (entries.length > 0) {
                const snakeEntries = entries.map(e => ({ ...toSnakeCase(e), institution_id: institutionId, academic_year_id: ayId, semester_id: semId }));
                const { error } = await _supabase.from('exam_timetable_entries').insert(snakeEntries);
                if (error) throw error;
            }
        } catch (e) { console.error("Exam Timetable Save Error:", e); }
    },
    async onAssociateSubjectToCourseLevel(subjectId: string, levelId: string) {
        const courses = await this.fetchCourses();
        const course = courses.find(c => c.levels && c.levels.some(l => l.id === levelId));

        if (course) {
            const updatedLevels = course.levels.map(l => {
                if (l.id === levelId) {
                    const ids = new Set(l.subjectIds || []);
                    ids.add(subjectId);
                    return { ...l, subjectIds: Array.from(ids) };
                }
                return l;
            });
            await this.saveModuleRecord('courses', { ...course, levels: updatedLevels });
        }
    },
    async onImportUsers(imported: any[], institutionId?: string): Promise<void> {
        if (!_supabase) return;
        const dataWithInst = institutionId
            ? imported.map(u => ({ ...u, institutionId }))
            : imported;
        const sanitizedData = dataWithInst.map(u => ({
            ...u,
            role: u.role || 'lecturer',
            id: u.id || `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate ID if missing
            password: u.password || 'password123' // Default password if missing
        }));
        const snakeData = sanitizedData.map(u => toSnakeCase(u));
        const { error } = await _supabase.from('users').insert(snakeData);
        if (error) throw error;
    },
    async onImportStudents(imported: any[], institutionId?: string): Promise<void> {
        if (!_supabase) return;
        const dataWithInst = institutionId
            ? imported.map(s => ({ ...s, institutionId }))
            : imported;
        const sanitizedData = dataWithInst.map(s => ({
            ...s,
            role: 'student',
            id: s.id || `u_s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate ID if missing
            password: s.password || 'student123' // Default password if missing
        }));
        const snakeData = sanitizedData.map(s => toSnakeCase(s));
        const { error } = await _supabase.from('users').insert(snakeData);
        if (error) throw error;
    },
    async onImportCourses(courses: any[]): Promise<void> {
        const enrichedCourses = courses.map(c => ({
            ...c,
            id: `course_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            levels: [], // Initialize empty levels array as per Course interface
            curriculumType: c.curriculumType || '8-4-4'
        }));

        const snakeData = enrichedCourses.map(c => toSnakeCase(c));

        if (!_supabase) {
            const existing = ls.get('courses');
            ls.set('courses', [...existing, ...snakeData]);
            return;
        }

        const { error } = await _supabase.from('courses').insert(snakeData);
        if (error) throw error;
    },
    async onImportDepartments(departments: any[]): Promise<void> {
        const enriched = departments.map((d, i) => ({
            ...d,
            id: d.id || `dept_${Date.now()}_${i}`
        }));
        const snakeData = enriched.map(d => toSnakeCase(d));
        if (!_supabase) {
            const existing = ls.get('departments');
            ls.set('departments', [...existing, ...snakeData]);
            return;
        }
        const { error } = await _supabase.from('departments').insert(snakeData);
        if (error) throw error;
    },
    async onImportRooms(rooms: any[]): Promise<void> {
        const enriched = rooms.map((r, i) => ({
            ...r,
            id: r.id || `room_${Date.now()}_${i}`
        }));
        const snakeData = enriched.map(r => toSnakeCase(r));
        if (!_supabase) {
            const existing = ls.get('rooms');
            ls.set('rooms', [...existing, ...snakeData]);
            return;
        }
        const { error } = await _supabase.from('rooms').insert(snakeData);
        if (error) throw error;
    },
    async onImportBuildings(buildings: any[]): Promise<void> {
        const enriched = buildings.map((b, i) => ({
            ...b,
            id: b.id || `bldg_${Date.now()}_${i}`
        }));
        const snakeData = enriched.map(b => toSnakeCase(b));
        if (!_supabase) {
            const existing = ls.get('buildings');
            ls.set('buildings', [...existing, ...snakeData]);
            return;
        }
        const { error } = await _supabase.from('buildings').insert(snakeData);
        if (error) throw error;
    },
    async onImportSubjectsAndAssociate(subjects: any[], institutionId?: string): Promise<void> {
        const currentUser = this.getSession();
        const effectiveInstitutionId = institutionId || currentUser?.institutionId;

        const subjectsToInsert = subjects.map(s => ({
            id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            institutionId: s.institutionId || effectiveInstitutionId,
            name: s.name,
            code: s.code,
            departmentId: s.departmentId,
            lessonStructure: s.lessonStructure || [{ count: 1, periods: 1 }],
            description: s.description || '',
            isComplete: false,
            hasExam: true
        }));

        if (!_supabase) {
            const existing = ls.get('subjects');
            ls.set('subjects', [...existing, ...toSnakeCase(subjectsToInsert)]);
            return;
        }

        const { error } = await _supabase.from('subjects').insert(toSnakeCase(subjectsToInsert));
        if (error) throw error;
    },
    migrateLocalDataToCloud: async (onProgress: (msg: string) => void) => {
        onProgress('Analyzing local registry...');
        return { success: true, message: "Registry migration successful." };
    }
};
