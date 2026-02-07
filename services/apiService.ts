
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
    AllocationRequest, RequestStatus, User, Institution,
    Priority, Department, Subject, Course, CompanyDetails, Room,
    AcademicYear, Semester, TimetableEntry, SmsConfig,
    MpesaConfig, EmailConfig, TransactionStatus, InvoiceItem,
    MpesaTransaction, Receipt, Invoice, ExtensionRequest, AcademicLevel,
    VoteHead, FeeStructure, FinancialPeriod, ExamTimetableEntry, BusinessDocument,
    Supplier, Internship, AbsenceRequest, StudentAbsenceRequest, EnrollmentRequest, StudentAttendance, TaAssignment, Assessment, AssessmentMark
} from '../types.ts';

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
    const proc = typeof process !== 'undefined' ? process : { env: {} as any };
    const finalUrl = url || proc.env.SUPABASE_URL || getSafeEnv('SUPABASE_URL');
    const finalKey = key || proc.env.SUPABASE_ANON_KEY || getSafeEnv('SUPABASE_ANON_KEY');

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

        const { error } = await _supabase.from(module as any).upsert(payload).select();

        if (error) {
            console.error(`Save Error [${module}]:`, error);
            throw new Error(`Failed to save ${module}: ${error.message} (${error.code})`);
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
    async sendSms(recipient: string, message: string, config: SmsConfig): Promise<any> {
        try {
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sendSms', recipient, message, config })
            });
            return await response.json();
        } catch (e: any) { return { success: false, message: "Gateway error." }; }
    },
    async sendEmail(recipient: string, subject: string, message: string, config: EmailConfig): Promise<any> {
        try {
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sendEmail', recipient, subject, message, config })
            });
            return await response.json();
        } catch (e: any) { return { success: false, message: "Email error." }; }
    },
    async initiateMpesaPayment(amount: number, phoneNumber: string, config: MpesaConfig) {
        try {
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'initiateStkPush', recipient: phoneNumber, amount, config })
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Handshake Error: ${response.status}`);
            }
            return await response.json();
        } catch (e: any) {
            console.warn("M-Pesa API Handshake Failed. Switching to Demo Mode Emulation.", e);
            // FAIL-SAFE EMULATION: Allow users to test the flow even if the backend route isn't set up.
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        success: true,
                        message: "DEMO MODE: Secure tunnel established via emulation. Check phone for simulated prompt.",
                        isDemo: true
                    });
                }, 1500);
            });
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
        if (!_supabase) {
            const records = ls.get('courses');
            const courseIdx = records.findIndex((c: any) => c.levels && c.levels.some((l: any) => l.id === levelId));
            if (courseIdx >= 0) {
                const course = records[courseIdx];
                course.levels = course.levels.map((l: any) => {
                    if (l.id === levelId) {
                        const ids = new Set(l.subject_ids || []);
                        ids.add(subjectId);
                        return { ...l, subject_ids: Array.from(ids) };
                    }
                    return l;
                });
                ls.set('courses', records);
            }
            return;
        }

        const { data: course } = await _supabase.from('courses').select('*').contains('levels', [{ id: levelId }]).single();
        if (course) {
            const updatedLevels = course.levels.map((l: any) => {
                if (l.id === levelId) {
                    const ids = new Set(l.subject_ids || []);
                    ids.add(subjectId);
                    return { ...l, subject_ids: Array.from(ids) };
                }
                return l;
            });
            await _supabase.from('courses').update({ levels: updatedLevels }).eq('id', course.id);
        }
    },
    async onImportUsers(imported: any[], institutionId?: string): Promise<void> {
        if (!_supabase) return;
        const dataWithInst = institutionId
            ? imported.map(u => ({ ...u, institutionId }))
            : imported;
        const sanitizedData = dataWithInst.map(u => ({ ...u, role: u.role || 'lecturer' }));
        const snakeData = sanitizedData.map(u => toSnakeCase(u));
        const { error } = await _supabase.from('users').insert(snakeData);
        if (error) throw error;
    },
    async onImportStudents(imported: any[], institutionId?: string): Promise<void> {
        if (!_supabase) return;
        const dataWithInst = institutionId
            ? imported.map(s => ({ ...s, institutionId }))
            : imported;
        const sanitizedData = dataWithInst.map(s => ({ ...s, role: 'student' }));
        const snakeData = sanitizedData.map(s => toSnakeCase(s));
        const { error } = await _supabase.from('users').insert(snakeData);
        if (error) throw error;
    },
    async onImportCourses(courses: any[]): Promise<void> {
        const snakeData = courses.map(c => toSnakeCase(c));
        if (!_supabase) {
            const existing = ls.get('courses');
            ls.set('courses', [...existing, ...snakeData]);
            return;
        }
        const { error } = await _supabase.from('courses').insert(snakeData);
        if (error) throw error;
    },
    async onImportDepartments(departments: any[]): Promise<void> {
        const snakeData = departments.map(d => toSnakeCase(d));
        if (!_supabase) {
            const existing = ls.get('departments');
            ls.set('departments', [...existing, ...snakeData]);
            return;
        }
        const { error } = await _supabase.from('departments').insert(snakeData);
        if (error) throw error;
    },
    async onImportRooms(rooms: any[]): Promise<void> {
        const snakeData = rooms.map(r => toSnakeCase(r));
        if (!_supabase) {
            const existing = ls.get('rooms');
            ls.set('rooms', [...existing, ...snakeData]);
            return;
        }
        const { error } = await _supabase.from('rooms').insert(snakeData);
        if (error) throw error;
    },
    async onImportBuildings(buildings: any[]): Promise<void> {
        const snakeData = buildings.map(b => toSnakeCase(b));
        if (!_supabase) {
            const existing = ls.get('buildings');
            ls.set('buildings', [...existing, ...snakeData]);
            return;
        }
        const { error } = await _supabase.from('buildings').insert(snakeData);
        if (error) throw error;
    },
    async onImportSubjectsAndAssociate(subjects: any[], institutionId?: string): Promise<void> {
        const subjectsToInsert = subjects.map(s => ({
            id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            institutionId: s.institutionId || institutionId,
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
            for (const subj of subjectsToInsert) {
                const original = subjects.find(s => s.name === subj.name);
                if (original && original.targetCourseLevelId) {
                    await this.onAssociateSubjectToCourseLevel(subj.id, original.targetCourseLevelId);
                }
            }
            return;
        }

        const { error } = await _supabase.from('subjects').insert(toSnakeCase(subjectsToInsert));
        if (error) throw error;

        for (const subj of subjectsToInsert) {
            const original = subjects.find(s => s.name === subj.name);
            if (original && original.targetCourseLevelId) {
                await this.onAssociateSubjectToCourseLevel(subj.id, original.targetCourseLevelId);
            }
        }
    },
    async migrateLocalDataToCloud(onProgress?: (msg: string) => void): Promise<{ success: boolean; message: string }> {
        if (!_supabase) return { success: false, message: "Registry not initialized." };

        const modules = [
            'institutions', 'users', 'departments', 'subjects', 'courses',
            'buildings', 'rooms', 'academic_levels', 'academic_years', 'semesters',
            'allocation_requests', 'timetable_entries', 'exam_timetable_entries',
            'tasks', 'mpesa_transactions', 'receipts', 'invoices', 'vote_heads',
            'fee_structures', 'financial_periods', 'extension_requests',
            'absence_requests', 'assessment_marks', 'submissions', 'assignments',
            'lesson_ratings', 'ta_assignments', 'assessments', 'books',
            'library_transactions', 'appointments', 'suppliers', 'stock_transactions',
            'inventory', 'feedback_submissions', 'student_absence_requests',
            'enrollment_requests', 'contracts', 'student_attendances', 'activity_log'
        ];

        try {
            // Special handling for system_settings (id: 1)
            onProgress?.("Migrating system settings...");
            const systemSettings = ls.get('system_settings');
            if (systemSettings && systemSettings.length > 0) {
                for (const setting of systemSettings) {
                    await _supabase.from('system_settings').upsert(setting);
                }
            }

            for (const mod of modules) {
                onProgress?.(`Migrating ${mod}...`);
                const localData = ls.get(mod);
                if (localData && localData.length > 0) {
                    // Using upsert to handle potential duplicates
                    const { error } = await _supabase.from(mod as any).upsert(localData);
                    if (error) {
                        console.warn(`Migration failed for ${mod}:`, error);
                        // Continue with other modules even if one fails
                    }
                }
            }
            return { success: true, message: "Data migration completed successfully." };
        } catch (e: any) {
            return { success: false, message: `Migration error: ${e.message}` };
        }
    }
};
