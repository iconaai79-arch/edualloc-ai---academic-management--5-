import { SupabaseClient } from '@supabase/supabase-js';
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
    Vehicle, TransportOnboarding, VehicleLog, TransportBill, SmsLog, AppNotification,
    CoopFarmer, CoopCollection, CoopRider, CoopAgrovetInventory, CoopAgrovetSales, SaccoAccount, SaccoTransaction, CoopMonthlyPayout, SecurityAlert,
    CoopExpense, CoopIncome, DemoRequest
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
            // Use the singleton from lib/supabase.ts
            _supabase = initSupabase(finalUrl, finalKey, {
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
    async uploadBlob(path: string, blob: Blob, contentType?: string): Promise<string> {
        if (!_supabase) {
            // Mock for local storage mode if needed
            return `local-blob://${path}`;
        }
        const bucket = 'eduai';
        const { data, error } = await _supabase.storage.from(bucket).upload(path, blob, {
            upsert: true,
            contentType: contentType || 'application/octet-stream'
        });
        if (error) throw error;
        const { data: { publicUrl } } = _supabase.storage.from(bucket).getPublicUrl(path);
        return publicUrl;
    },
    async incrementCount(table: string, id: string, field: 'view_count' | 'inquiry_count'): Promise<void> {
        if (!_supabase) {
            const records = ls.get(table);
            const index = records.findIndex((r: any) => r.id === id);
            if (index >= 0) {
                const camelField = field.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
                (records[index] as any)[camelField] = ((records[index] as any)[camelField] || 0) + 1;
                ls.set(table, records);
            }
            return;
        }

        try {
            const token = this.getSession()?.id || '';
            const response = await fetch(`${window.location.origin}/api/system?action=rpc`, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    function: 'increment_module_count',
                    params: { 
                        t_name: table, 
                        r_id: id, 
                        f_name: field 
                    }
                })
            });

            if (!response.ok) {
                // Fallback attempt within the proxy handled endpoint if we had one, 
                // but since we don't, we can try a direct module update via proxy /api/records
                // However, incrementing a count requires knowing the current value or using an atomic operation.
                // The proxy RPC is the best way. If it fails, we log it.
                const err = await response.json().catch(() => ({}));
                console.error(`IncrementCount Proxy Error [${table}]:`, response.status, err);
            }
        } catch (e) {
            console.error(`IncrementCount Exception [${table}]:`, e);
        }
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
            const timestamp = new Date().toISOString();
            const insts = await this.fetchModuleRecords('institutions', undefined, undefined, { limit: 1 });
            if (insts) {
                return { success: true, status: 'online', dbName: 'PostgreSQL', message: 'Handshake successful.', timestamp };
            }
            throw new Error("Handshake failed");
        } catch (e: any) {
            const timestamp = new Date().toISOString();
            console.error("[apiService] Connection Test Failed:", e);
            return { 
                success: false, 
                status: 'offline', 
                message: `Connection Error: ${e.message || 'Handshake failed'}. Ensure SUPABASE_URL and ANON_KEY are correctly configured in your environment.`, 
                dbName: 'Error', 
                timestamp 
            };
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
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                return { success: false, message: `Server error: ${text.substring(0, 100)}` };
            }

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
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                return { success: false, message: `Server error: ${text.substring(0, 100)}` };
            }

            const result = await response.json();
            return { success: response.ok && result.success, message: result.message };
        } catch (e: any) {
            console.error("Token reset failed:", e);
            return { success: false, message: "Connection failure." };
        }
    },
    async runMigration(sql: string): Promise<any> {
        try {
            const response = await fetch('/api/system?action=execute_sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql })
            });
            
            // Handle non-JSON or empty responses gracefully
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return await response.json();
            } else {
                const text = await response.text();
                console.error(`[SQL Engine] Server Error (${response.status}):`, text.substring(0, 500));
                return { 
                    success: response.ok, 
                    message: text.substring(0, 200) || (response.ok ? "Operation completed successfully" : `Server Error (${response.status}) - The execution engine returned an invalid response.`)
                };
            }
        } catch (e: any) {
            console.error("Migration Error:", e);
            return { success: false, message: e.message || "Execution engine failure." };
        }
    },
    async debugRLSSession(): Promise<any> {
        const sql = `
            SELECT 
                current_user as db_user,
                auth.uid() as auth_uid,
                auth.jwt() ->> 'email' as jwt_email,
                auth.jwt() ->> 'role' as jwt_role,
                public.get_curr_user_role() as calculated_role,
                public.get_curr_user_inst_id() as calculated_inst_id,
                current_setting('role') as current_role_setting;
        `;
        return this.runMigration(sql);
    },
    async uploadFile(bucket: string, path: string, file: File, contentType?: string): Promise<string | null> {
        try {
            if (!_supabase) {
                // Return as base64 for local development/offline mode
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            }

            const { data, error } = await _supabase.storage
                .from(bucket)
                .upload(path, file, {
                    upsert: true,
                    cacheControl: '3600',
                    contentType: contentType || file.type
                });

            if (error) {
                console.error(`[Storage] Supabase upload error (${bucket}/${path}):`, error);

                // Specifically alert for common policy issues
                if ((error as any).status === 403 || error.message.toLowerCase().includes('denied') || error.message.includes('row-level security')) {
                    alert(`Storage Error: Access Denied. Please ensure your '${bucket}' bucket has appropriate RLS policies for 'INSERT' and 'UPDATE' operations for the 'anon' role.`);
                } else if (error.message === 'Failed to fetch') {
                    alert(`Storage Error: Failed to fetch. This usually means your Supabase URL is unreachable or CORS is blocked. Please check your Supabase URL in your settings.`);
                } else {
                    alert(`Storage Error: ${error.message}`);
                }
                return null;
            }

            if (data) {
                const { data: { publicUrl } } = _supabase.storage
                    .from(bucket)
                    .getPublicUrl(path);

                // console.log(`[Storage] Uploaded to Supabase: ${publicUrl}`);
                return publicUrl;
            }

            return null;
        } catch (err: any) {
            console.error("Upload Service Exception:", err);
            alert(`Upload Service Exception: ${err.message || 'Unknown error'}`);
            return null;
        }
    },
    async fetchModuleRecords<T = any>(
        module: string, 
        institutionId?: string, 
        countyId?: string, 
        options?: { 
            select?: string; 
            filter?: Record<string, any>; 
            order?: string; 
            limit?: number;
        }
    ): Promise<T[]> {
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
            if (institutionId && institutionId !== 'ALL') {
                const filterKey = getFilterCol(effectiveModule, 'institution');
                records = records.filter((r: any) => r[filterKey] === institutionId);
            }
            if (countyId) {
                const filterKey = getFilterCol(effectiveModule, 'county');
                records = records.filter((r: any) => r[filterKey] === countyId);
            }
            
            // Local simple filter
            if (options?.filter) {
                records = records.filter((r: any) => 
                    Object.entries(options.filter as any).every(([k, v]) => r[k] === v)
                );
            }

            return toCamelCase(records) || [];
        }

        try {
            // Determine Auth Token (Internal ID fallback)
            let token = '';
            const session = this.getSession();
            if (session?.id) token = session.id;

            const url = new URL(`${window.location.origin}/api/records`);
            url.searchParams.append('module', module);
            if (institutionId && institutionId !== 'ALL') url.searchParams.append('institutionId', institutionId);
            if (countyId) url.searchParams.append('countyId', countyId);
            
            // Append advanced options
            if (options?.select) url.searchParams.append('select', options.select);
            if (options?.order) url.searchParams.append('order', options.order);
            if (options?.limit) url.searchParams.append('limit', options.limit.toString());
            if (options?.filter) {
                // For now, only simple equality filters are sent to proxy as query params
                // We could enhance the proxy to handle more complex filters
                Object.entries(options.filter).forEach(([k, v]) => {
                    url.searchParams.append(k, v as string);
                });
            }

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error(`[apiService] Fetch API Error [${module}]:`, response.status, errData);
                
                // If it's a 500 error from our proxy, it usually contains a 'Database Error' string with column details
                if (response.status === 500 && errData.error) {
                    console.warn(`[apiService] Critical Database Failure in [${module}]:`, errData.error);
                }
                
                return [];
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error(`[apiService] Non-JSON response for [${module}]:`, text.substring(0, 200));
                return [];
            }

            const data = await response.json();
            const result = toCamelCase(data);
            return Array.isArray(result) ? result : [];
        } catch (e) {
            console.error(`Fetch Exception [${module}]:`, e);
            return [];
        }
    },

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
            const session = this.getSession();
            const token = session?.id || '';

            const response = await fetch('/api/records?module=' + module, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: payload })
            });

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                let errData: any = {};
                if (contentType && contentType.includes('application/json')) {
                    errData = await response.json().catch(() => ({}));
                } else {
                    errData = { error: await response.text().catch(() => `Status ${response.status}`) };
                }
                console.error(`Save API Error [${module}]:`, response.status, errData);
                throw new Error(errData.error || `Failed to save ${module}`);
            }

            const savedData = await response.json();
            return savedData ? toCamelCase(savedData) : null;
        } catch (e: any) {
            console.error(`Save Exception [${module}]:`, e);
            throw e;
        }
    },
    async saveModuleRecords<T = any>(module: string, data: T[]): Promise<T[] | null> {
        const payload = data.map(toSnakeCase);

        if (!_supabase) {
            payload.forEach(item => ls.upsert(module, item));
            return data;
        }

        try {
            const session = this.getSession();
            const token = session?.id || '';

            const response = await fetch('/api/records?module=' + module, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: payload })
            });

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                let errData: any = {};
                if (contentType && contentType.includes('application/json')) {
                    errData = await response.json().catch(() => ({}));
                } else {
                    errData = { error: await response.text().catch(() => `Status ${response.status}`) };
                }
                console.error(`Bulk Save API Error [${module}]:`, response.status, errData);
                throw new Error(errData.error || `Failed to bulk save ${module}`);
            }

            const savedData = await response.json();
            return Array.isArray(savedData) ? savedData.map(toCamelCase) : [toCamelCase(savedData)] as any;
        } catch (e: any) {
            console.error(`Bulk Save Exception [${module}]:`, e);
            throw e;
        }
    },
    async fetchNotifications(userId: string): Promise<AppNotification[]> {
        return this.fetchModuleRecords('app_notifications', undefined, userId);
    },
    async markNotificationAsRead(id: string): Promise<void> {
        await this.saveModuleRecord('app_notifications', { id, isRead: true } as any);
    },
    async markAllNotificationsAsRead(userId: string): Promise<void> {
        if (!_supabase) {
            const records = ls.get('app_notifications');
            const updated = records.map((n: any) => n.user_id === userId ? { ...n, is_read: true } : n);
            ls.set('app_notifications', updated);
            return;
        }
        
        // This is tricky without a bulk update in api proxy. 
        // For now, let's use a simple loop or just update them one by one.
        // Better: add a bulk update to the api proxy if needed, but for now:
        const notifications = await this.fetchNotifications(userId);
        for (const n of notifications) {
            if (!n.isRead) {
                await this.markNotificationAsRead(n.id);
            }
        }
    },
    async deleteModuleRecord(module: string, id: string): Promise<void> {
        if (!_supabase) {
            ls.delete(module, id);
            return;
        }

        const session = this.getSession();
        const token = session?.id || '';

        const response = await fetch(`/api/records?module=${module}&id=${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errData: any = {};
            if (contentType && contentType.includes('application/json')) {
                errData = await response.json().catch(() => ({}));
            } else {
                errData = { error: await response.text().catch(() => `Status ${response.status}`) };
            }
            throw new Error(errData.error || `Failed to delete ${module}`);
        }
    },
    async fetchInstitutions(institutionId?: string): Promise<Institution[]> { return this.fetchModuleRecords('institutions', institutionId); },
    async saveInstitution(inst: Institution): Promise<void> { 
        const { countyId, ...rest } = inst;
        await this.saveModuleRecord('institutions', { ...rest, county_id: countyId }); 
    },
    async fetchUsers(institutionId?: string): Promise<User[]> { return this.fetchModuleRecords('users', institutionId); },
    async saveUser(user: Partial<User>): Promise<void> { 
        const { countyId, ...rest } = user;
        await this.saveModuleRecord('users', { ...rest, county_id: countyId }); 
    },
    async checkEmailExists(email: string): Promise<boolean> {
        if (!email) return false;
        try {
            const response = await fetch(`${API_BASE}/system?action=checkEmail&email=${encodeURIComponent(email.toLowerCase())}`, {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            const data = await response.json();
            return !!data.exists;
        } catch (e) {
            console.error("Error checking email existence:", e);
            // Fallback to local check if system API fails
            const records = await this.fetchModuleRecords('users', undefined, undefined, { filter: { email: email.toLowerCase() } });
            return Array.isArray(records) && records.length > 0;
        }
    },
    async registerUser(userData: Partial<User>, institutionName?: string): Promise<void> {
        const password = userData.password || (userData.role === 'student' ? 'student123' : 'password123');
        const userWithPass = { ...userData, password };
        await this.saveUser(userWithPass);

        if (userData.email) {
            const subject = "Welcome to Eduai Automation - Account Credentials";
            const body = `Dear ${userData.name},\n\nYour account has been created on the Eduai Automation Management System${institutionName ? ` for ${institutionName}` : ''}.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nEmail: ${userData.email}\nPassword: ${password}\n\nPlease change your password upon first login.\n\nBest Regards,\nSystem Admin`;

            // Send email asynchronously so we don't block the UI
            this.sendEmail(userData.email, subject, body).catch(e => {
                console.error("Failed to send welcome email:", e);
            });
        }

        // Send Welcome SMS if phone number exists
        if (userData.phoneNumber) {
            let smsMessage = `Welcome to Eduai Automation Hub. Your account is ready. Email: ${userData.email || userData.staffId}, Password: ${password}. Portal: ${window.location.origin}`;

            if (userData.role === 'driver' || userData.role === 'transport_assistant') {
                smsMessage = `Welcome to the Transport Fleet. Your driver account is active. ID: ${userData.staffId || userData.email}, Pass: ${password}. Access portal at ${window.location.origin}`;
            } else if (userData.role === 'rider') {
                smsMessage = `Welcome to the Logistics Team. Your rider account is active. ID: ${userData.phoneNumber}, Pass: ${password}. Access portal at ${window.location.origin}`;
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
            const response = await fetch('/api/system?action=getSettings');
            if (!response.ok) throw new Error('Failed to fetch settings');
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error("Received non-JSON response for settings");
            }

            const data = await response.json();
            return toCamelCase(data) || null;
        } catch (e) {
            console.error("[apiService] Error fetching company settings:", e);
            return null;
        }
    },
    async saveCompanySettings(settings: CompanyDetails): Promise<void> {
        const payload = toSnakeCase(settings);
        if (!_supabase) {
            ls.upsert('system_settings', { id: 1, data: payload });
            return;
        }
        const response = await fetch('/api/system?action=saveSettings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: payload })
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to save settings');
        }
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
            // Use bulk save via proxy
            // Note: Currently proxy save is upsert. we might need to delete existing first if not using UPSERT.
            // But timetable entries usually have unique IDs or we can rely on UPSERT if we have PKs.
            // If we really need to delete first, we'd need a multi-filter delete proxy.
            // For now, let's use the proxy save.
            await this.saveModuleRecord('timetable_entries', snakeEntries);
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

        const existingRecords = await this.fetchModuleRecords<any>('allocation_requests', undefined, undefined, {
            filter: { id: requestId },
            limit: 1
        });
        const existing = toSnakeCase(existingRecords[0]);
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
        
        await this.saveModuleRecord('allocation_requests', { id: requestId, ...updates });
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
            const existing = await this.fetchModuleRecords<any>('mpesa_transactions', data.institutionId, undefined, {
                filter: { 
                    amount: data.amount,
                    phone_number: data.phoneNumber,
                    status: 'completed'
                },
                order: 'timestamp.desc',
                limit: 1
            });

            if (existing && existing.length > 0) {
                // Duplicate transaction handled silently
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
        return this.fetchModuleRecords('transport_bills', undefined, undefined, {
            filter: { driver_id: driverId }
        });
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
            description: `SMS Top-up (${units} units)`,
            provider: 'mpesa',
            paymentMethod: 'stk_push'
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
            description: `Portal Subscription (${months} months)`,
            provider: 'mpesa',
            paymentMethod: 'stk_push'
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
            const subject = "Account Credentials - Eduai Automation Hub";
            const body = `Dear ${user.name},\n\nYour account on Eduai Automation has been initialized.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nEmail: ${user.email}\nPassword: ${password}\n\nPlease secure your account upon login.\n\nBest Regards,\nSystem Admin`;

            const smsBody = `Eduai Automation Hub: Your account for ${user.name} is ready. Email: ${user.email}, Pass: ${password}. Portal: ${window.location.host}`;

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
    async initiatePayment(provider: 'mpesa' | 'airtel' | 'intasend' | 'ncba', amount: number, phoneNumber: string, metadata?: any, config?: any) {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        if (!_supabase) {
            return { success: false, message: "Database service (Supabase) not initialized. Live payments require an active backend." };
        }
        try {
            const session = this.getSession();
            const token = session?.id || '';

            let action = 'initiateStkPush';
            if (provider === 'airtel') action = 'initiateAirtelMoneyStk';
            if (provider === 'intasend') action = 'initiateIntasendPayment';
            if (provider === 'ncba') action = 'ncbaInitiateStk';

            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                     'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ action, recipient: formattedPhone, amount, config, metadata, provider })
            });

            const result = await response.json();
            if (response.ok && result.success && metadata?.invoiceId) {
                // Auto-record a pending transaction
                await this.recordPayment({
                    transactionId: result.checkoutRequestId || result.requestId || `PENDING_${Date.now()}`,
                    amount,
                    phoneNumber: formattedPhone,
                    payerName: 'Pending Payer',
                    description: `Payment for Invoice ${metadata.invoiceId}`,
                    status: 'pending',
                    provider,
                    paymentMethod: 'stk_push',
                    metadata: { ...metadata, checkoutRequestId: result.checkoutRequestId }
                });
            }
            return result;
        } catch (e: any) {
            console.error(`${provider} API Handshake Failed:`, e);
            return { success: false, message: e.message || `${provider} gateway connection failed.` };
        }
    },
    async checkPaymentStatus(provider: 'mpesa' | 'airtel' | 'intasend' | 'ncba', checkoutRequestId: string, config?: any) {
        try {
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'queryPaymentStatus',
                    provider,
                    checkoutRequestId,
                    config
                })
            });
            const result = await response.json();
            if (result.status === 'completed' && result.metadata?.invoiceId) {
                await this.reconcilePayment(result);
            }
            return result;
        } catch (e) {
            console.error("Payment Status Check Error:", e);
            return { status: 'pending' };
        }
    },
    async recordPayment(data: Partial<MpesaTransaction>) {
        return this.saveModuleRecord('mpesa_transactions', {
            ...data,
            timestamp: data.timestamp || new Date().toISOString(),
            status: data.status || 'pending'
        });
    },
    async reconcilePayment(transaction: MpesaTransaction) {
        try {
            const metadata = typeof transaction.metadata === 'string' ? JSON.parse(transaction.metadata) : transaction.metadata;
            const invoiceId = metadata?.invoiceId;
            if (!invoiceId) return;

            // 1. Create a receipt
            await this.saveModuleRecord('receipts', {
                id: `RCT_${Date.now()}`,
                receiptNumber: `RCT-${Date.now()}`,
                institutionId: transaction.institutionId,
                paymentDate: new Date().toISOString(),
                amountPaid: transaction.amount,
                paidFor: transaction.description || 'Service Payment',
                paymentMethod: transaction.provider,
                relatedTransactionId: transaction.transactionId,
                invoiceId: invoiceId,
                studentId: metadata?.studentId
            });

            // 2. Update invoice status if fully paid
            const invoice = await this.fetchModuleRecords<Invoice>('invoices', undefined, undefined, { filter: { id: invoiceId }, limit: 1 });
            if (invoice?.[0]) {
                const totalPaid = (await this.fetchModuleRecords<Receipt>('receipts', undefined, undefined, { filter: { invoice_id: invoiceId } }))
                    .reduce((sum, r) => sum + (r.amountPaid || 0), 0);
                
                if (totalPaid >= invoice[0].totalAmount) {
                    await this.saveModuleRecord('invoices', { id: invoiceId, status: 'paid' });
                }
            }
        } catch (e) {
            console.error("Reconciliation Error:", e);
        }
    },
    async initiateMpesaPayment(amount: number, phoneNumber: string, metadata?: any, config?: MpesaConfig) {
        return this.initiatePayment('mpesa', amount, phoneNumber, metadata, config);
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
            try {
                const data = await this.fetchModuleRecords<any>('mpesa_transactions', undefined, undefined, {
                    select: 'status',
                    filter: { checkout_request_id: checkoutRequestId },
                    limit: 1
                });
                return { status: data && data.length > 0 ? data[0].status : 'pending' };
            } catch (e) { 
                console.error("Mpesa Status Fallback Error:", e);
                return { status: 'pending' }; 
            }
        }
    },
    async initiateKcbStkPush(tenantId: string, amount: number, paymentType: string): Promise<{ success: boolean; message: string; requestId?: string }> {
        // Mock KCB Buni STK Push Integration
        // Initiating KCB STK Push

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
        // Verifying KCB account

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
        try {
            // 1. Update the request status
            const request = await this.saveModuleRecord('institution_extension_requests', { id: requestId, status });
            if (!request) throw new Error("Request not found or failed to update");

            // 2. If approved, extend the institution's trial
            if (status === 'approved' && request) {
                const insts = await this.fetchModuleRecords<any>('institutions', (request as any).institutionId);
                const inst = insts[0];
                if (!inst) throw new Error("Institution not found");

                // Calculate new expiry date
                const currentExpiry = inst.trialEndsAt ? new Date(inst.trialEndsAt) : new Date();
                const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
                const newExpiry = new Date(baseDate.getTime() + (extensionDays * 24 * 60 * 60 * 1000));

                await this.saveModuleRecord('institutions', {
                    id: (request as any).institutionId,
                    status: 'trial', 
                    trialEndsAt: newExpiry.toISOString()
                });
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
        try {
            const snakeEntries = entries.map(e => ({ ...toSnakeCase(e), institution_id: institutionId, academic_year_id: ayId, semester_id: semId }));
            // Use bulk save via proxy
            await this.saveModuleRecord('exam_timetable_entries', snakeEntries);
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
        const dataWithInst = institutionId
            ? imported.map(u => ({ ...u, institutionId }))
            : imported;
        const sanitizedData = dataWithInst.map(u => ({
            ...u,
            role: u.role || 'lecturer',
            id: u.id || `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate ID if missing
            password: u.password || 'password123' // Default password if missing
        }));

        await this.saveModuleRecord('users', sanitizedData);

        // Send welcome emails and SMS
        sanitizedData.forEach(user => {
            if (user.email) {
                const subject = "Welcome to Eduai Automation - Account Credentials";
                const body = `Dear ${user.name},\n\nYour account has been created on the Eduai Automation Management System${institutionName ? ` for ${institutionName}` : ''}.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nEmail: ${user.email}\nPassword: ${user.password}\n\nPlease change your password upon first login.\n\nBest Regards,\nSystem Admin`;
                this.sendEmail(user.email, subject, body).catch(e => console.error(`Failed to send email to ${user.email}:`, e));
            }

            if (user.phoneNumber) {
                const smsMessage = `Welcome to Eduai Automation. Your account is ready. Email: ${user.email || user.staffId}, Password: ${user.password}. Portal: ${window.location.origin}`;
                this.sendSms(user.phoneNumber, smsMessage, undefined, 1, institutionId).catch(e => console.error(`Failed to send SMS to ${user.phoneNumber}:`, e));
            }
        });
    },
    async onImportStudents(imported: any[], institutionId?: string, institutionName?: string): Promise<void> {
        const dataWithInst = institutionId
            ? imported.map(s => ({ ...s, institutionId }))
            : imported;
        const sanitizedData = dataWithInst.map(s => ({
            ...s,
            role: 'student',
            id: s.id || `u_s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate ID if missing
            password: s.password || 'student123' // Default password if missing
        }));
        
        await this.saveModuleRecord('users', sanitizedData);

        // Send welcome emails and SMS
        sanitizedData.forEach(user => {
            if (user.email) {
                const subject = "Welcome to Eduai Automation - Account Credentials";
                const body = `Dear ${user.name},\n\nYour student account has been created on the Eduai Automation Management System${institutionName ? ` for ${institutionName}` : ''}.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nEmail: ${user.email}\nPassword: ${user.password}\n\nPlease change your password upon first login.\n\nBest Regards,\nSystem Admin`;
                this.sendEmail(user.email, subject, body).catch(e => console.error(`Failed to send email to ${user.email}:`, e));
            }

            if (user.phoneNumber) {
                const smsMessage = `Welcome to Eduai Automation Hub. Your student account is ready. Email: ${user.email || user.staffId}, Password: ${user.password}. Portal: ${window.location.origin}`;
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

        await this.saveModuleRecord('courses', enrichedCourses);
    },
    async onImportDepartments(departments: any[]): Promise<void> {
        const enriched = departments.map((d, i) => ({
            ...d,
            id: d.id || `dept_${Date.now()}_${i}`
        }));
        await this.saveModuleRecord('departments', enriched);
    },
    async onImportRooms(rooms: any[]): Promise<void> {
        const enriched = rooms.map((r, i) => ({
            ...r,
            id: r.id || `room_${Date.now()}_${i}`
        }));
        await this.saveModuleRecord('rooms', enriched);
    },
    async onImportBuildings(buildings: any[]): Promise<void> {
        const enriched = buildings.map((b, i) => ({
            ...b,
            id: b.id || `bldg_${Date.now()}_${i}`
        }));
        await this.saveModuleRecord('buildings', enriched);
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

        await this.saveModuleRecord('subjects', subjectsToInsert);
    },
    migrateLocalDataToCloud: async (onProgress: (msg: string) => void) => {
        onProgress('Analyzing local registry...');
        return { success: true, message: "Registry migration successful." };
    },
    async fetchBoardingRooms(houseId: string): Promise<any[]> {
        return this.fetchModuleRecords('boarding_rooms', undefined, undefined, {
            select: '*,boarding_houses!inner(name),boarding_beds(*)',
            filter: { house_id: houseId },
            order: 'room_number.asc'
        });
    },
    async fetchAvailableBeds(institutionId: string): Promise<any[]> {
        return this.fetchModuleRecords('boarding_beds', institutionId, undefined, {
            select: '*,boarding_rooms!inner(id,room_number,boarding_houses!inner(id,name,gender,institution_id))',
            filter: { status: 'Available' }
        });
    },
    async fetchBedAllocations(institutionId: string): Promise<any[]> {
        return this.fetchModuleRecords('bed_allocations', institutionId, undefined, {
            select: '*,usersStudentIdFkey:users!student_id(name, email, gender),usersAllocatedByFkey:users!allocated_by(name),boardingBeds:boarding_beds(bed_number,boardingRooms:boarding_rooms(room_number,boardingHouses:boarding_houses(name, institution_id))),boarding_checkins(id),boarding_checkouts(id)',
            order: 'allocation_date.desc'
        });
    },
    async fetchMaintenanceLogs(institutionId: string): Promise<any[]> {
        return this.fetchModuleRecords('boarding_maintenance_logs', institutionId, undefined, {
            select: '*,boarding_houses(name),boarding_rooms(room_number),boarding_beds(bed_number),users!boarding_maintenance_logs_reported_by_fkey(name),users!boarding_maintenance_logs_resolved_by_fkey(name)',
            order: 'reported_date.desc'
        });
    },
    async fetchBoardingCheckIns(institutionId: string): Promise<any[]> {
        return this.fetchModuleRecords('boarding_checkins', institutionId, undefined, {
            order: 'check_in_date.desc'
        });
    },
    async fetchBoardingCheckOuts(institutionId: string): Promise<any[]> {
        return this.fetchModuleRecords('boarding_checkouts', institutionId, undefined, {
            order: 'check_out_date.desc'
        });
    },
    // Transport Module
    async fetchVehicles(instId?: string): Promise<Vehicle[]> { return this.fetchModuleRecords('vehicles', instId); },
    async fetchTransportOnboarding(instId?: string): Promise<TransportOnboarding[]> { return this.fetchModuleRecords('transport_onboarding', instId); },
    async fetchVehicleLogs(instId?: string): Promise<VehicleLog[]> { return this.fetchModuleRecords('vehicle_logs', instId); },
    async clearInstitutionalData(institutionId: string, currentUserId: string): Promise<void> {
        // Supabase Logic - Moved to secure proxy
        try {
            const token = this.getSession()?.id || '';
            const response = await fetch(`${window.location.origin}/api/system?action=clearData`, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ institutionId, currentUserId })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                console.error("Failed to clear institutional data via proxy:", response.status, err);
                throw new Error(err.error || "Failed to clear institutional data");
            }
        } catch (e) {
            console.error("Clear Institutional Data Exception:", e);
            throw e;
        }
    },
    async fetchSecurityAlerts(institutionId: string): Promise<SecurityAlert[]> {
        return this.fetchModuleRecords('security_alerts', institutionId);
    },
    async fetchCoopFarmers(institutionId?: string): Promise<CoopFarmer[]> {
        return this.fetchModuleRecords('coop_farmers', institutionId);
    },
    async saveCoopFarmer(data: Partial<CoopFarmer>): Promise<void> {
        await this.saveModuleRecord('coop_farmers', data);
    },
    async fetchCoopCollections(institutionId?: string): Promise<CoopCollection[]> {
        return this.fetchModuleRecords('coop_collections', institutionId);
    },
    async saveCoopCollection(data: Partial<CoopCollection>): Promise<void> {
        await this.saveModuleRecord('coop_collections', data);
    },
    async fetchCoopRiders(institutionId?: string): Promise<CoopRider[]> {
        return this.fetchModuleRecords('coop_riders', institutionId);
    },
    async saveCoopRider(data: Partial<CoopRider>): Promise<void> {
        await this.saveModuleRecord('coop_riders', data);
    },
    async fetchCoopAgrovetInventory(institutionId?: string): Promise<CoopAgrovetInventory[]> {
        return this.fetchModuleRecords('coop_agrovet_inventory', institutionId);
    },
    async saveCoopAgrovetInventory(data: Partial<CoopAgrovetInventory>): Promise<void> {
        await this.saveModuleRecord('coop_agrovet_inventory', data);
    },
    async fetchCoopAgrovetSales(institutionId?: string): Promise<CoopAgrovetSales[]> {
        return this.fetchModuleRecords('coop_agrovet_sales', institutionId);
    },
    async saveCoopAgrovetSale(data: Partial<CoopAgrovetSales>): Promise<void> {
        await this.saveModuleRecord('coop_agrovet_sales', data);
    },
    async fetchSaccoAccounts(institutionId?: string): Promise<SaccoAccount[]> {
        return this.fetchModuleRecords('sacco_accounts', institutionId);
    },
    async fetchSaccoTransactions(institutionId?: string): Promise<SaccoTransaction[]> {
        return this.fetchModuleRecords('sacco_transactions', institutionId);
    },
    async fetchCoopMonthlyPayouts(institutionId?: string): Promise<CoopMonthlyPayout[]> {
        return this.fetchModuleRecords('coop_monthly_payouts', institutionId);
    },
    async fetchCoopExpenses(institutionId?: string): Promise<CoopExpense[]> {
        return this.fetchModuleRecords('coop_expenses', institutionId);
    },
    async saveCoopExpense(data: Partial<CoopExpense>): Promise<void> {
        await this.saveModuleRecord('coop_expenses', data);
    },
    async fetchCoopIncome(institutionId?: string): Promise<CoopIncome[]> {
        return this.fetchModuleRecords('coop_income', institutionId);
    },
    async saveCoopIncome(data: Partial<CoopIncome>): Promise<void> {
        await this.saveModuleRecord('coop_income', data);
    },
    async confirmCoopCollection(id: string, finalQuantity: number, confirmedBy: string): Promise<void> {
        const collections = await this.fetchCoopCollections();
        const collection = collections.find(c => c.id === id);
        if (!collection) throw new Error("Collection not found");

        const hasDiscrepancy = finalQuantity !== collection.quantity;
        const update: CoopCollection = {
            ...collection,
            finalQuantity,
            factoryConfirmed: true,
            confirmedBy,
            confirmedAt: new Date().toISOString(),
            requiresApproval: hasDiscrepancy,
            approvalStatus: hasDiscrepancy ? 'pending' : 'approved',
            smsStatus: 'pending'
        };

        await this.saveModuleRecord('coop_collections', update);
    },
    async approveCoopCollection(id: string, approvedBy: string, status: 'approved' | 'rejected'): Promise<void> {
        const collections = await this.fetchCoopCollections();
        const collection = collections.find(c => c.id === id);
        if (!collection) throw new Error("Collection not found");

        const update: CoopCollection = {
            ...collection,
            approvalStatus: status,
            approvedBy,
            approvedAt: new Date().toISOString(),
            smsStatus: status === 'approved' ? 'pending' : 'failed'
        };
        await this.saveModuleRecord('coop_collections', update);
    },
    async updatePayoutStatus(id: string, status: 'initiated' | 'approved' | 'paid' | 'rejected', userId: string): Promise<void> {
        const update: any = {
            id,
            status,
            updatedAt: new Date().toISOString()
        };
        if (status === 'initiated') {
            update.initiatedBy = userId;
            update.initiatedAt = new Date().toISOString();
        } else if (status === 'approved') {
            update.approvedBy = userId;
            update.approvedAt = new Date().toISOString();
        } else if (status === 'paid') {
            update.paidAt = new Date().toISOString();
        }
        await this.saveModuleRecord('coop_monthly_payouts', update);
    },
    async disburseBulkMpesa(ids: string[], userId: string): Promise<any> {
        // Simulate M-Pesa B2C API Call
        console.log(`[MPESA SIMULATION] Processing bulk disbursement for ${ids.length} farmers...`);
        
        // Wait for 1.5 seconds to simulate API latency
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update all payouts to 'paid' status
        await Promise.all(ids.map(id => this.updatePayoutStatus(id, 'paid', userId)));

        return {
            success: true,
            transactionId: `MP_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            count: ids.length,
            timestamp: new Date().toISOString()
        };
    }
};
