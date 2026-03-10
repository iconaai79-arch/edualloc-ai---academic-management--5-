import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase as sharedSupabase, initSupabase } from '../lib/supabase';
import { generateAlphanumericCode, formatPhoneNumber } from '../utils/stringUtils';
import type {
    AllocationRequest, RequestStatus, User, Institution,
    Priority, Department, Subject, Course, CompanyDetails, Room,
    AcademicYear, Semester, TimetableEntry, SmsConfig,
    MpesaConfig, EmailConfig, TransactionStatus, InvoiceItem,
    MpesaTransaction, Receipt, Invoice, ExtensionRequest, AcademicLevel,
    VoteHead, FeeStructure, FinancialPeriod, ExamTimetableEntry, BusinessDocument,
    Supplier, Internship, AbsenceRequest, StudentAbsenceRequest, EnrollmentRequest, StudentAttendance, TaAssignment, Assessment, AssessmentMark,
    BoardingHouse, BoardingRoom, BoardingBed, BedAllocation, BoardingCheckIn, BoardingCheckOut, BoardingMaintenanceLog,
    Vehicle, TransportOnboarding, VehicleLog, TransportBill, SmsLog
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
            // Sync with lib/supabase.ts
            initSupabase(finalUrl, finalKey);

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

function toSnakeCase(obj: any): any {
    if (obj === null || obj === undefined || typeof obj !== 'object' || obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map((item: any) => toSnakeCase(item));
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        if (key === 'isImpersonated') return; // Skip internal session-only flags
        let val = obj[key];
        if (val === "") val = null;
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newObj[snakeKey] = toSnakeCase(val);
    });
    return newObj;
}

function toCamelCase(obj: any): any {
    if (obj === null || obj === undefined || typeof obj !== 'object' || obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map((item: any) => toCamelCase(item));
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
        newObj[camelKey] = toCamelCase(obj[key]);
    });
    return newObj;
}

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
        if (!_supabase) return { success: false, message: "Server connection required." };
        try {
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'forgotPassword', recipient: email })
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                return { success: false, message: result.message || "Account verification failed." };
            }
            return { success: true, message: "Recovery email dispatched." };
        } catch (e: any) {
            console.error("Reset password recovery failed", e);
            return { success: false, message: e.message || "Connection failure during verification." };
        }
    },
    async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
        if (!_supabase) return { success: false, message: "Server connection required." };
        try {
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resetPasswordWithToken', token, newPassword })
            });
            const result = await response.json();
            return { success: response.ok && result.success, message: result.message };
        } catch (e: any) {
            console.error("Token reset failed:", e);
            return { success: false, message: "Connection failure." };
        }
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
            // 1. Try Local Upload (cPanel PHP Handler)
            const formData = new FormData();
            formData.append('file', file);

            // Get explicit upload URL if provided, otherwise default to relative path
            const cpanelUploadUrl = getSafeEnv('CPANEL_UPLOAD_URL') || '/upload.php';
            const absoluteUploadUrl = cpanelUploadUrl.startsWith('http')
                ? cpanelUploadUrl
                : `${window.location.origin}${cpanelUploadUrl.startsWith('/') ? '' : '/'}${cpanelUploadUrl}`;

            try {
                const response = await fetch(absoluteUploadUrl, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.url) {
                        return result.url;
                    }
                } else {
                    const errorText = await response.text();
                    console.error("cPanel upload returned non-OK status:", response.status, errorText);
                }
            } catch (localErr) {
                console.warn("Local upload failed, checking fallback:", localErr);
            }

            // 2. Fallback: Supabase Storage
            if (!_supabase) {
                // Return as base64 for local development/offline mode
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
    async fetchModuleRecords<T>(module: string, institutionId?: string, countyId?: string): Promise<T[]> {
        const getFilterCol = (mod: string, type: 'institution' | 'county') => {
            if (type === 'institution') {
                if (mod === 'institutions') return 'id';
                if (mod === 'county_inventory') return 'target_institution_id';
                return 'institution_id';
            } else {
                if (mod === 'counties') return 'id';
                return 'county_id';
            }
        };

        if (!_supabase) {
            // Mapping for views in local storage mode
            let effectiveModule = module;
            if (module === 'v_house_statistics' || module === 'v_bed_occupancy') {
                effectiveModule = 'boarding_houses';
            }

            let records = ls.get(effectiveModule);
            if (institutionId) {
                const filterKey = getFilterCol(effectiveModule, 'institution');
                records = records.filter((r: any) => r[filterKey] === institutionId);
            }
            if (countyId) {
                const filterKey = getFilterCol(effectiveModule, 'county');
                records = records.filter((r: any) => r[filterKey] === countyId);
            }
            return toCamelCase(records) || [];
        }

        try {
            let query = _supabase.from(module as any).select('*');

            if (institutionId) {
                const filterCol = getFilterCol(module, 'institution');
                query = query.eq(filterCol, institutionId);
            }

            if (countyId) {
                const filterCol = getFilterCol(module, 'county');
                query = query.eq(filterCol, countyId);
            }

            const { data, error } = await query;
            if (error) {
                console.error(`Fetch Error [${module}]:`, error);
                throw error;
            }
            console.log(`Fetch [${module}]: Found ${data?.length || 0} raw records`);
            return toCamelCase(data) || [];
        } catch (e) {
            console.error(`Fetch Exception [${module}]:`, e);
            return [];
        }
    }
    ,
    async createBedAllocation(payload: {
        id: string; bed_id: string; student_id: string; institution_id: string;
        allocated_by: string; allocation_date: string; term: string;
        academic_year: string; status: string; notes?: string | null;
    }): Promise<any> {
        if (!_supabase) {
            return this.saveModuleRecord('bed_allocations', toCamelCase(payload));
        }
        const { data, error } = await _supabase.rpc('create_bed_allocation', {
            allocation_data: payload
        });
        if (error) {
            console.error('RPC createBedAllocation error:', error);
            throw new Error(`Failed to save bed_allocations: ${error.message} (${error.code})`);
        }
        return data;
    },
    async saveModuleRecord<T = any>(module: string, data: T): Promise<T | null> {
        const payload = toSnakeCase(data);

        if (!_supabase) {
            ls.upsert(module, payload);
            return toCamelCase(payload);
        }

        try {
            const { data: savedData, error } = await _supabase.from(module as any).upsert(payload).select();

            if (error) {
                console.error(`Save Error [${module}]:`, error);
                throw new Error(`Failed to save ${module}: ${error.message} (${error.code})`);
            }
            return savedData ? toCamelCase(savedData[0]) : null;
        } catch (e: any) {
            // Network error or Supabase unreachable - fallback to localStorage
            if (e.message?.includes('fetch') || e.message?.includes('network')) {
                console.warn(`Supabase unreachable for ${module}, using localStorage fallback`);
                ls.upsert(module, payload);
                return toCamelCase(payload);
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
    async registerUser(userData: Partial<User>, institutionName?: string): Promise<void> {
        const password = userData.password || (userData.role === 'student' ? 'student123' : 'password123');
        const userWithPass = { ...userData, password };
        await this.saveUser(userWithPass);

        if (userData.email) {
            const subject = "Welcome to EduAlloc - Account Credentials";
            const body = `Dear ${userData.name},\n\nYour account has been created on the EduAlloc Academic Management System${institutionName ? ` for ${institutionName}` : ''}.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nEmail: ${userData.email}\nPassword: ${password}\n\nPlease change your password upon first login.\n\nBest Regards,\nSystem Admin`;

            // Send email asynchronously so we don't block the UI
            this.sendEmail(userData.email, subject, body).catch(e => {
                console.error("Failed to send welcome email:", e);
            });
        }

        // Send Welcome SMS if phone number exists
        if (userData.phoneNumber) {
            let smsMessage = `Welcome to EduAlloc Hub. Your account is ready. Email: ${userData.email || userData.staffId}, Password: ${password}. Portal: ${window.location.origin}`;

            if (userData.role === 'driver' || userData.role === 'transport_assistant') {
                smsMessage = `Welcome to the Transport Fleet. Your driver account is active. ID: ${userData.staffId || userData.email}, Pass: ${password}. Access portal at ${window.location.origin}`;
            }

            this.sendSms(userData.phoneNumber, smsMessage).catch(e => {
                console.error("Failed to send welcome SMS:", e);
            });
        }
    },
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
        if (!_supabase) {
            const id = `txn_${Date.now()}`;
            const transaction: MpesaTransaction = { ...data, id, transactionId: `MPESA${id}`, timestamp: new Date().toISOString(), status: 'completed' };
            await this.saveModuleRecord('mpesa_transactions', transaction);
            return 'completed';
        }

        // Check if this transaction already exists (to avoid duplicates from STK push)
        // If payerName is empty, we might be able to find the existing record by amount and phone
        try {
            const { data: existing } = await _supabase
                .from('mpesa_transactions')
                .select('id')
                .eq('institution_id', data.institutionId)
                .eq('amount', data.amount)
                .eq('phone_number', data.phoneNumber)
                .eq('status', 'completed')
                .order('timestamp', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existing) {
                console.log('[apiService] Transaction already exists, skipping duplicate creation');
                return 'completed';
            }
        } catch (e) {
            console.warn('[apiService] Error checking for existing transaction:', e);
        }

        const id = `txn_${Date.now()}`;
        const transaction: MpesaTransaction = { ...data, id, transactionId: `MPESA${id}`, timestamp: new Date().toISOString(), status: 'completed' };
        await this.saveModuleRecord('mpesa_transactions', transaction);
        return 'completed';
    },
    async sendSms(recipient: string, message: string, config?: SmsConfig, units?: number, institutionId?: string, authToken?: string): Promise<any> {
        const formattedRecipient = formatPhoneNumber(recipient);
        if (!_supabase) {
            return { success: false, message: "Database service (Supabase) not initialized. Live SMS requires an active backend." };
        }

        try {
            const { data } = await _supabase.auth.getSession();
            let token = data?.session?.access_token;

            if (!token) {
                const storageKey = Object.keys(localStorage).find(k => k.includes('-auth-token'));
                if (storageKey) {
                    try {
                        const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
                        token = stored.access_token;
                    } catch (e) { }
                }
            }

            // Final Deep Fallback: Use the Internal User ID as a token
            if (!token) {
                if (authToken) {
                    token = authToken;
                } else {
                    const session = this.getSession();
                    if (session?.id) token = session.id;
                }
            }

            let headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'sendSms', recipient: formattedRecipient, message, config, units, institutionId })
            });

            let resData: any = {};
            let rawText = '';
            try {
                rawText = await response.text();
                resData = JSON.parse(rawText);
            } catch (e) {
                const isHtml = rawText.includes('<!DOCTYPE') || rawText.includes('<html');
                resData = {
                    message: isHtml ? `Internal Server Error (HTML returned). Status: ${response.status}` : (rawText || `HTTP Error ${response.status}`),
                    isHtmlResponse: isHtml
                };
            }

            if (!response.ok) {
                const baseMessage = resData.message || `Failed to send SMS (${response.status})`;
                return {
                    success: false,
                    message: typeof baseMessage === 'string' ? baseMessage : 'Unknown Gateway Error',
                    errorDetail: resData.error || resData.raw || null
                };
            }

            return resData;
        } catch (e: any) {
            console.error("SMS Gateway Request Failed:", e);
            return { success: false, message: e.message || "Gateway connection failure." };
        }
    },
    async sendPrivateDriverSms(driver: User, recipient: string, message: string): Promise<any> {
        if (!driver.smsBalance || driver.smsBalance <= 0) {
            throw new Error("Insufficient SMS balance. Please top up to send notifications.");
        }
        if (driver.subscriptionStatus !== 'active') {
            throw new Error("Portal service is not active. Please subscribe to use this feature.");
        }

        const res = await this.sendSms(recipient, message);
        if (res.success) {
            const updatedDriver = { ...driver, smsBalance: driver.smsBalance - 1 };
            await this.saveUser(updatedDriver);
            this.storeSession(updatedDriver);
        }
        return res;
    },
    async sendLibraryOverdueReminder(recipient: string, bookTitle: string, dueDate: string, institutionId: string): Promise<any> {
        const message = `REMINDER: Your library book "${bookTitle}" was due on ${new Date(dueDate).toLocaleDateString()}. Please return it to avoid further fines.`;
        return this.sendSms(recipient, message, undefined, 1, institutionId);
    },
    async fetchTransportBills(driverId: string): Promise<TransportBill[]> {
        if (!_supabase) {
            const bills = ls.get('transport_bills');
            return toCamelCase(bills.filter((b: any) => b.driver_id === driverId));
        }
        const { data, error } = await _supabase.from('transport_bills').select('*').eq('driver_id', driverId);
        if (error) throw error;
        return toCamelCase(data);
    },
    async saveTransportBill(bill: TransportBill): Promise<void> {
        await this.saveModuleRecord('transport_bills', bill);
    },
    async topUpDriverSms(driver: User, amount: number, units: number): Promise<void> {
        const updatedUser = {
            ...driver,
            smsBalance: (driver.smsBalance || 0) + units
        };
        await this.saveUser(updatedUser);
        this.storeSession(updatedUser);
        // Record as transaction
        await this.onAddTransaction({
            amount,
            phoneNumber: driver.phoneNumber,
            institutionId: driver.institutionId,
            payerName: driver.name,
            description: `SMS Top-up (${units} units)`
        }, []);
    },
    async activateDriverSubscription(driver: User, months: number): Promise<void> {
        const expiry = new Date();
        const currentExpiry = driver.subscriptionExpiry ? new Date(driver.subscriptionExpiry) : new Date();
        const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
        baseDate.setMonth(baseDate.getMonth() + months);

        const updatedUser: User = {
            ...driver,
            subscriptionStatus: 'active',
            subscriptionExpiry: baseDate.toISOString()
        };
        await this.saveUser(updatedUser);
        this.storeSession(updatedUser);

        await this.onAddTransaction({
            amount: months * 1000, // Example scale
            phoneNumber: driver.phoneNumber,
            institutionId: driver.institutionId,
            payerName: driver.name,
            description: `Portal Subscription (${months} months)`
        }, []);
    },
    async sendEmail(recipient: string, subject: string, message: string, config?: EmailConfig, authToken?: string, attachments?: any[]): Promise<any> {
        if (!_supabase) {
            return { success: false, message: "Database service (Supabase) not initialized. Live Email requires an active backend." };
        }

        try {
            const { data } = await _supabase.auth.getSession();
            let token = data?.session?.access_token;

            if (!token) {
                const storageKey = Object.keys(localStorage).find(k => k.includes('-auth-token'));
                if (storageKey) {
                    try {
                        const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
                        token = stored.access_token;
                    } catch (e) { }
                }
            }

            // Final Deep Fallback: Use the Internal User ID as a token
            if (!token) {
                if (authToken) {
                    token = authToken;
                } else {
                    const session = this.getSession();
                    if (session?.id) token = session.id;
                }
            }

            let headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'sendEmail', recipient, subject, message, config, attachments })
            });

            let resData: any = {};
            let rawText = '';
            try {
                rawText = await response.text();
                resData = JSON.parse(rawText);
            } catch (e) {
                console.warn("Failed to parse API response as JSON:", rawText);
                resData = { message: rawText || `HTTP Error ${response.status}` };
            }

            if (!response.ok) {
                const hint = resData.hint ? `\n\nHint: ${resData.hint}` : '';
                const details = resData.error || resData.details || (rawText.length > 100 ? rawText.substring(0, 500) + '...' : '');
                return { success: false, message: (resData.message || `SMTP Relay Error (${response.status})`) + hint + (details ? `\n\nDetails: ${details}` : '') };
            }
            return resData;
        } catch (e: any) {
            console.error("Email Gateway Error:", e);
            return { success: false, message: e.message || "Email gateway connection failed." };
        }
    },
    async sendBulkCredentials(users: User[], method: 'email' | 'sms'): Promise<{ success_count: number; fail_count: number }> {
        let success_count = 0;
        let fail_count = 0;

        for (const user of users) {
            const password = user.password || 'password123';
            const subject = "Account Credentials - EduAlloc Hub";
            const body = `Dear ${user.name},\n\nYour account on EduAlloc has been initialized.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nEmail: ${user.email}\nPassword: ${password}\n\nPlease secure your account upon login.\n\nBest Regards,\nSystem Admin`;

            const smsBody = `EduAlloc Hub: Your account for ${user.name} is ready. Email: ${user.email}, Pass: ${password}. Portal: ${window.location.host}`;

            try {
                let res;
                if (method === 'email' && user.email) {
                    res = await this.sendEmail(user.email, subject, body);
                } else if (method === 'sms' && user.phoneNumber) {
                    res = await this.sendSms(user.phoneNumber, smsBody);
                }

                if (res?.success) success_count++;
                else fail_count++;
            } catch (e) {
                fail_count++;
            }
        }
        return { success_count, fail_count };
    },
    async initiateMpesaPayment(amount: number, phoneNumber: string, metadata?: any, config?: MpesaConfig) {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        if (!_supabase) {
            return { success: false, message: "Database service (Supabase) not initialized. Live M-Pesa requires an active backend." };
        }
        try {
            const { data } = await _supabase.auth.getSession();
            let token = data?.session?.access_token;

            if (!token) {
                const storageKey = Object.keys(localStorage).find(k => k.includes('-auth-token'));
                if (storageKey) {
                    try {
                        const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
                        token = stored.access_token;
                    } catch (e) { }
                }
            }

            // Final Deep Fallback: Use the Internal User ID as a token
            if (!token) {
                const session = this.getSession();
                if (session?.id) token = session.id;
            }

            console.log('[M-Pesa Client] Initiating payment request...');
            let headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'initiateStkPush', recipient: formattedPhone, amount, config, metadata })
            });

            console.log('[M-Pesa Client] Response :', response);
            console.log('[M-Pesa Client] Response status:', response.status);

            let resData: any = {};
            let rawText = '';
            try {
                rawText = await response.text();
                resData = JSON.parse(rawText);
            } catch (e) {
                resData = { message: rawText || `HTTP Error ${response.status}` };
            }

            if (!response.ok) {
                // Provide detailed error information
                let errorMessage = '';

                if (response.status === 500) {
                    errorMessage = `Server Error (500): ${resData.error || resData.message || 'Internal server error'}`;
                    if (resData.error?.includes('Database service unavailable')) {
                        errorMessage += '\n\nPossible causes:\n- SUPABASE_SERVICE_ROLE_KEY not configured\n- Supabase connection failed';
                    } else if (resData.message?.includes('configuration is missing')) {
                        errorMessage += '\n\nPlease configure M-Pesa credentials in Super Admin > System Settings';
                    }
                } else if (response.status === 401) {
                    errorMessage = resData.message || resData.error || 'Authentication failed. Please log in again.';
                    if (resData.hint) errorMessage += `\n\nHint: ${resData.hint}`;
                } else if (response.status === 400) {
                    errorMessage = resData.message || resData.error || 'Bad request';
                } else {
                    errorMessage = resData.error || resData.message || `HTTP Error: ${response.status}`;
                }

                const detail = resData.errorDetail ? `\n\nDetails: ${JSON.stringify(resData.errorDetail, null, 2)}` : '';
                throw new Error(`${errorMessage}${detail}`);
            }
            return resData;
        } catch (e: any) {
            console.error("M-Pesa API Handshake Failed:", e);
            return {
                success: false,
                message: e.message || "M-Pesa gateway connection failed.",
                error: e
            };
        }
    },
    async checkMpesaStatus(checkoutRequestId: string, config?: MpesaConfig) {
        try {
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'queryStkStatus',
                    checkoutRequestId,
                    config
                })
            });
            const result = await response.json();
            if (!response.ok || result.success === false) {
                console.error("M-Pesa status query rejected by backend:", result);
                // If it's a transient error, we can return pending, but if it's a configuration error, we should know.
                // For now, let's fallback to DB check for safety.
                throw new Error(result.message || "Backend error during status check");
            }
            return { status: result.status || 'pending' };
        } catch (e) {
            console.error("Status Check Query Error:", e);
            // Fallback to database check in case API fails
            if (!_supabase) return { status: 'pending' };
            const { data, error } = await _supabase.from('mpesa_transactions').select('status').eq('checkout_request_id', checkoutRequestId).single();
            if (error) return { status: 'pending' };
            return { status: data.status };
        }
    },
    async initiateKcbStkPush(tenantId: string, amount: number, paymentType: string): Promise<{ success: boolean; message: string; requestId?: string }> {
        // Mock KCB Buni STK Push Integration
        console.log(`[KCB Buni] Initiating STK Push for ${tenantId}. Amount: ${amount}, Type: ${paymentType}`);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        return {
            success: true,
            message: "KCB STK Push initiated successfully. Please check your phone for the prompt.",
            requestId: `KCB_${Date.now()}`
        };
    },
    async verifyKcbAccount(tenantId: string): Promise<{ success: boolean; message: string; details?: any }> {
        // Mock KCB Buni Account Verification
        console.log(`[KCB Buni] Verifying account for ${tenantId}`);

        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            success: true,
            message: "Account verified successfully via KCB Buni KYC.",
            details: {
                verificationStatus: 'Verified',
                customerName: 'Verified Tenant Name',
                kycSource: 'KCB Buni API'
            }
        };
    },
    async verifyMpesaTransaction(transactionId: string) {
        if (!_supabase) return { success: false, message: "Bridge unavailable" };
        try {
            const { data } = await _supabase.auth.getSession();
            let token = data?.session?.access_token;
            if (!token) {
                const session = this.getSession();
                if (session?.id) token = session.id;
            }

            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    action: 'verifyTransactionManually',
                    transactionId
                })
            });
            return await response.json();
        } catch (e: any) {
            return { success: false, message: e.message || "Request failed" };
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
    async fetchSmsLogs(instId?: string): Promise<SmsLog[]> { return this.fetchModuleRecords('sms_logs', instId); },
    async fetchExtensionRequests(instId?: string): Promise<ExtensionRequest[]> { return this.fetchModuleRecords('institution_extension_requests', instId); },
    async updateExtensionRequestStatus(requestId: string, status: 'approved' | 'rejected', extensionDays: number = 14): Promise<void> {
        if (!_supabase) return;

        try {
            // 1. Update the request status
            const { data: request, error: reqError } = await _supabase
                .from('institution_extension_requests')
                .update({ status })
                .eq('id', requestId)
                .select()
                .single();

            if (reqError) throw reqError;

            // 2. If approved, extend the institution's trial
            if (status === 'approved' && request) {
                const { data: inst, error: instError } = await _supabase
                    .from('institutions')
                    .select('trial_ends_at, status')
                    .eq('id', request.institution_id)
                    .single();

                if (instError) throw instError;

                // Calculate new expiry date
                // If already expired, extend from today. If not, extend from current expiry.
                const currentExpiry = inst.trial_ends_at ? new Date(inst.trial_ends_at) : new Date();
                const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
                const newExpiry = new Date(baseDate.getTime() + (extensionDays * 24 * 60 * 60 * 1000));

                await _supabase
                    .from('institutions')
                    .update({
                        status: 'trial', // Ensure it's set back to 'trial' if it was suspended
                        trial_ends_at: newExpiry.toISOString()
                    })
                    .eq('id', request.institution_id);

                console.log(`[Extension] Institution ${request.institution_id} extended to ${newExpiry.toISOString()}`);
            }
        } catch (error) {
            console.error("Failed to update extension request status:", error);
            throw error;
        }
    },
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
    async onAssociateSubjectToCourseLevel(subjectId: string | string[], levelId: string) {
        const courses = await this.fetchCourses();
        const course = courses.find(c => c.levels && c.levels.some(l => l.id === levelId));
        const subjectIds = Array.isArray(subjectId) ? subjectId : [subjectId];

        if (course) {
            const updatedLevels = course.levels.map(l => {
                if (l.id === levelId) {
                    const ids = new Set(l.subjectIds || []);
                    subjectIds.forEach(id => ids.add(id));
                    return { ...l, subjectIds: Array.from(ids) };
                }
                return l;
            });
            await this.saveModuleRecord('courses', { ...course, levels: updatedLevels });
        }
    },
    async onDisassociateSubjectFromCourseLevel(subjectId: string, levelId: string) {
        const courses = await this.fetchCourses();
        const course = courses.find(c => c.levels && c.levels.some(l => l.id === levelId));

        if (course) {
            const updatedLevels = course.levels.map(l => {
                if (l.id === levelId) {
                    const ids = (l.subjectIds || []).filter(id => id !== subjectId);
                    const metadata = (l.subjectMetadata || []).filter(m => m.subjectId !== subjectId);
                    return { ...l, subjectIds: ids, subjectMetadata: metadata };
                }
                return l;
            });
            await this.saveModuleRecord('courses', { ...course, levels: updatedLevels });
        }
    },
    async onImportUsers(imported: any[], institutionId?: string, institutionName?: string): Promise<void> {
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

        // Send welcome emails and SMS
        sanitizedData.forEach(user => {
            if (user.email) {
                const subject = "Welcome to EduAlloc - Account Credentials";
                const body = `Dear ${user.name},\n\nYour account has been created on the EduAlloc Academic Management System${institutionName ? ` for ${institutionName}` : ''}.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nEmail: ${user.email}\nPassword: ${user.password}\n\nPlease change your password upon first login.\n\nBest Regards,\nSystem Admin`;
                this.sendEmail(user.email, subject, body).catch(e => console.error(`Failed to send email to ${user.email}:`, e));
            }

            if (user.phoneNumber) {
                const smsMessage = `Welcome to EduAlloc. Your account is ready. Email: ${user.email || user.staffId}, Password: ${user.password}. Portal: ${window.location.origin}`;
                this.sendSms(user.phoneNumber, smsMessage, undefined, 1, institutionId).catch(e => console.error(`Failed to send SMS to ${user.phoneNumber}:`, e));
            }
        });
    },
    async onImportStudents(imported: any[], institutionId?: string, institutionName?: string): Promise<void> {
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

        // Send welcome emails and SMS
        sanitizedData.forEach(user => {
            if (user.email) {
                const subject = "Welcome to EduAlloc - Account Credentials";
                const body = `Dear ${user.name},\n\nYour student account has been created on the EduAlloc Academic Management System${institutionName ? ` for ${institutionName}` : ''}.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nEmail: ${user.email}\nPassword: ${user.password}\n\nPlease change your password upon first login.\n\nBest Regards,\nSystem Admin`;
                this.sendEmail(user.email, subject, body).catch(e => console.error(`Failed to send email to ${user.email}:`, e));
            }

            if (user.phoneNumber) {
                const smsMessage = `Welcome to EduAlloc Hub. Your student account is ready. Email: ${user.email || user.staffId}, Password: ${user.password}. Portal: ${window.location.origin}`;
                this.sendSms(user.phoneNumber, smsMessage, undefined, 1, institutionId).catch(e => console.error(`Failed to send SMS to ${user.phoneNumber}:`, e));
            }
        });
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
    },
    async fetchBoardingRooms(houseId: string): Promise<any[]> {
        if (!_supabase) return [];
        try {
            const { data, error } = await _supabase
                .from('boarding_rooms')
                .select(`
                    *,
                    boarding_houses!inner(name),
                    boarding_beds(*)
                `)
                .eq('house_id', houseId)
                .order('room_number');
            if (error) throw error;
            return toCamelCase(data) || [];
        } catch (e) { return []; }
    },
    async fetchAvailableBeds(institutionId: string): Promise<any[]> {
        if (!_supabase) return [];
        try {
            const { data, error } = await _supabase
                .from('boarding_beds')
                .select(`
                    *,
                    boarding_rooms!inner(
                        id,
                        room_number,
                        boarding_houses!inner(
                            id,
                            name,
                            gender,
                            institution_id
                        )
                    )
                `)
                .eq('status', 'Available')
                .eq('boarding_rooms.boarding_houses.institution_id', institutionId);
            if (error) throw error;
            return toCamelCase(data) || [];
        } catch (e) { return []; }
    },
    async fetchBedAllocations(institutionId: string): Promise<any[]> {
        if (!_supabase) return [];
        try {
            const { data, error } = await _supabase
                .from('bed_allocations')
                .select(`
                    *,
                    usersStudentIdFkey:users!student_id(name, email, gender),
                    usersAllocatedByFkey:users!allocated_by(name),
                    boardingBeds:boarding_beds(
                        bed_number,
                        boardingRooms:boarding_rooms(
                            room_number,
                            boardingHouses:boarding_houses(name, institution_id)
                        )
                    ),
                    boarding_checkins(id),
                    boarding_checkouts(id)
                `)
                .order('allocation_date', { ascending: false });

            if (error) {
                console.error('Fetch Bed Allocations Error:', error);
                throw error;
            }

            // Filter in-memory to be safer, or let RLS handle it
            const filtered = (data || []).filter((a: any) =>
                !a.institution_id || a.institution_id === institutionId
            );

            return toCamelCase(filtered) || [];
        } catch (e) {
            console.error('Fetch Bed Allocations Exception:', e);
            return [];
        }
    },
    async fetchMaintenanceLogs(institutionId: string): Promise<any[]> {
        if (!_supabase) return [];
        try {
            const { data, error } = await _supabase
                .from('boarding_maintenance_logs')
                .select(`
                    *,
                    boarding_houses(name),
                    boarding_rooms(room_number),
                    boarding_beds(bed_number),
                    users!boarding_maintenance_logs_reported_by_fkey(name),
                    users!boarding_maintenance_logs_resolved_by_fkey(name)
                `)
                .order('reported_date', { ascending: false });

            if (error) throw error;
            return toCamelCase(data) || [];
        } catch (e) { return []; }
    },
    async fetchBoardingCheckIns(institutionId: string): Promise<any[]> {
        if (!_supabase) return [];
        try {
            const { data, error } = await _supabase
                .from('boarding_checkins')
                .select('*')
                .order('check_in_date', { ascending: false });
            if (error) throw error;
            return toCamelCase(data) || [];
        } catch (e) { return []; }
    },
    async fetchBoardingCheckOuts(institutionId: string): Promise<any[]> {
        if (!_supabase) return [];
        try {
            const { data, error } = await _supabase
                .from('boarding_checkouts')
                .select('*')
                .order('check_out_date', { ascending: false });
            if (error) throw error;
            return toCamelCase(data) || [];
        } catch (e) { return []; }
    },
    // Transport Module
    async fetchVehicles(instId?: string): Promise<Vehicle[]> { return this.fetchModuleRecords('vehicles', instId); },
    async fetchTransportOnboarding(instId?: string): Promise<TransportOnboarding[]> { return this.fetchModuleRecords('transport_onboarding', instId); },
    async fetchVehicleLogs(instId?: string): Promise<VehicleLog[]> { return this.fetchModuleRecords('vehicle_logs', instId); }
};
