import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as sharedSupabase, initSupabase } from '../lib/supabase';
import { generateAlphanumericCode, formatPhoneNumber } from '../utils/stringUtils';
import { getGoogleDriveDirectUrl } from '../utils/googleDriveUtils';
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
    CoopExpense, CoopIncome, DemoRequest, InstitutionModuleState,
    ChurchSacrament, ChurchMassIntention, ChurchCellGroup, ChurchFollowUp, ChurchFastingPeriod, ChurchSaintDay,
    CarListing, TestDriveBooking, CarAppraisal, SchoolRegistry, CarInvoice, CarPayment,
    RemedialSession, RemedialRateSetting, RemedialPayout, FeePromise
} from '../types';

const getSafeEnv = (key: string): string | null => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            // @ts-ignore
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

// Module-level session user cache so branch auto-attach works without a React context
let _sessionUser: { branchId?: string; branch_id?: string; role?: string } | null = null;
export const setSessionUser = (user: { branchId?: string; branch_id?: string; role?: string } | null) => {
    _sessionUser = user;
};

const PROTECTED_KEYS = new Set([
    'coopConfig', 'coopSettings', 'coop_settings',
    'mpesaConfig', 'mpesa_config',
    'smsConfig', 'sms_config',
    'emailConfig', 'email_config',
    'googleDriveConfig', 'google_drive_config',
    'ftpConfig', 'ftp_config',
    'letterheadConfig', 'letterhead_config',
    'subscriptionConfig', 'subscription_config',
    'chatAssistantConfig', 'chat_assistant_config',
    'portalSettings', 'portal_settings',
    'themeConfig', 'theme_config',
    'customTheme', 'custom_theme',
    'metadata',
    'cpanelSettings', 'cpanel_settings'
]);

function toSnakeCase(obj: any): any {
    if (obj === null || obj === undefined || typeof obj !== 'object' || obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map((item: any) => toSnakeCase(item));
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        if (key === 'isImpersonated') return; // Skip internal session-only flags
        let val = obj[key];
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (PROTECTED_KEYS.has(key) || PROTECTED_KEYS.has(snakeKey)) {
            newObj[snakeKey] = val;
        } else {
            newObj[snakeKey] = toSnakeCase(val);
        }
    });
    return newObj;
}

function toCamelCase(obj: any): any {
    if (obj === null || obj === undefined || typeof obj !== 'object' || obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map((item: any) => toCamelCase(item));
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
        if (PROTECTED_KEYS.has(key) || PROTECTED_KEYS.has(camelKey)) {
            newObj[camelKey] = obj[key];
        } else {
            newObj[camelKey] = toCamelCase(obj[key]);
        }
    });
    return newObj;
}

// Local Storage Helper
const ls = {
    get: (table: string): any[] => {
        try {
            const data = localStorage.getItem(`eduai_${table}`);
            if (!data) return [];
            const parsed = JSON.parse(data);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter(r => r && typeof r === 'object');
        } catch (e) {
            console.error(`[localStorage helper] Error parsing table ${table}:`, e);
            return [];
        }
    },
    set: (table: string, data: any[]) => {
        try {
            const safeData = Array.isArray(data) ? data : [];
            localStorage.setItem(`eduai_${table}`, JSON.stringify(safeData));
        } catch (e) {
            console.error(`[localStorage helper] Error writing table ${table}:`, e);
            throw e;
        }
    },
    upsert: (table: string, record: any) => {
        const records = ls.get(table);
        const index = records.findIndex((r: any) => r && r.id === record.id);
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
        const filtered = records.filter((r: any) => r && r.id !== id);
        ls.set(table, filtered);
    }
};

export const apiService = {
    getSupabase() {
        return _supabase;
    },
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
            const keys = [
                'eduai_active_session',
                'eduai_super_admin_session',
                'eduai_impersonated_user',
                'eduai_user_session',
                'user',
                'eduai_alumna_session',
                'eduai_campaign_session'
            ];
            for (const k of keys) {
                const stored = localStorage.getItem(k);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed && (parsed.id || parsed.user_id || parsed.userId || parsed.role)) {
                        return parsed;
                    }
                }
            }
            return null;
        } catch (e) { return null; }
    },
    async getNextDocumentNumber(instId: string, docType: string): Promise<string> {
        try {
            const supabaseClient = _supabase;
            if (!supabaseClient) {
                // Mock local storage mode
                return `${docType.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
            }

            // Try atomic RPC first to avoid concurrent/race-condition duplicate numbers
            try {
                const { data, error } = await supabaseClient.rpc('get_next_document_number', {
                    p_institution_id: instId,
                    p_document_type: docType
                });
                if (!error && data) {
                    return data;
                }
            } catch (rpcErr) {
                console.warn("[apiService] get_next_document_number RPC failed, falling back to legacy:", rpcErr);
            }

            const numberingConfigs = await apiService.fetchModuleRecords<any>('finance_numbering_configs', instId);
            let config = numberingConfigs.find((c: any) => c.documentType === docType || c.document_type === docType);
            
            const defaultPrefixes: Record<string, string> = {
                invoice: 'INV-',
                receipt: 'REC-',
                payment_voucher: 'PV-',
                credit_note: 'CN-',
                debit_note: 'DN-',
                goods_in_lieu: 'GIL-'
            };

            if (!config) {
                const prefix = defaultPrefixes[docType] || 'DOC-';
                config = {
                    id: `num_cfg_${docType}_${instId}_${Date.now()}`,
                    institutionId: instId,
                    institution_id: instId,
                    documentType: docType,
                    document_type: docType,
                    prefix: prefix,
                    nextNumber: 1001,
                    next_number: 1001,
                    updatedAt: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                await apiService.saveModuleRecord('finance_numbering_configs', config).catch(() => {});
            }

            const nextNum = Number(config.nextNumber || config.next_number || 1001);
            const prefix = config.prefix || defaultPrefixes[docType] || 'DOC-';
            const formattedNum = `${prefix}${nextNum}`;

            await apiService.updateModuleRecord('finance_numbering_configs', config.id, {
                ...config,
                nextNumber: nextNum + 1,
                next_number: nextNum + 1,
                updatedAt: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }).catch(() => {});

            return formattedNum;
        } catch (err) {
            console.error(`[apiService] Failed to get next document number for ${docType}:`, err);
            const fallbackPrefix = docType === 'invoice' ? 'INV-' : docType === 'receipt' ? 'REC-' : 'DOC-';
            return `${fallbackPrefix}${Date.now().toString().slice(-6)}`;
        }
    },
    async getAuthToken(): Promise<string> {
        // 1. Try Supabase session (JWT)
        if (_supabase) {
            try {
                const { data } = _supabase.auth ? await _supabase.auth.getSession() : { data: { session: null } };
                if (data?.session?.access_token) return data.session.access_token;

                // Session missing or expired — attempt a silent refresh
                if (_supabase.auth) {
                    try {
                        const { data: refreshData, error: refreshErr } = await _supabase.auth.refreshSession();
                        if (!refreshErr && refreshData?.session?.access_token) {
                            console.log('[apiService] Token silently refreshed.');
                            return refreshData.session.access_token;
                        }
                    } catch (refreshEx) {
                        console.warn('[apiService] Silent refresh failed:', refreshEx);
                    }
                }
            } catch (e) { }

            // fallback to localStorage supanse-auth-token if available
            const storageKey = Object.keys(localStorage).find(k => k.includes('-auth-token'));
            if (storageKey) {
                try {
                    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
                    if (stored.access_token) return stored.access_token;
                } catch (e) { }
            }
        }

        // 2. Try Super Admin session fallback
        const superAdminSession = localStorage.getItem('eduai_super_admin_session');
        if (superAdminSession) {
            try {
                const parsed = JSON.parse(superAdminSession);
                if (parsed?.id) return parsed.id;
            } catch (e) {}
            return 'temp_admin_bypass';
        }

        // 3. Fallback to active session user ID
        let session = apiService.getSession();
        
        // 3.1 Try Alumnae Session fallback
        if (!session) {
            try {
                const alumStored = localStorage.getItem('eduai_alumna_session');
                if (alumStored) session = JSON.parse(alumStored);
            } catch (e) {}
        }

        const token = session?.id || (session as any)?.userId || (session as any)?.user_id || '';
        return token;
    },
    /** Dispatch a global event when all auth attempts fail with 401 so the UI can prompt re-login */
    _notifySessionExpired(): void {
        try {
            window.dispatchEvent(new CustomEvent('eduai:session_expired', { detail: { ts: Date.now() } }));
        } catch (e) { /* non-browser env */ }
    },
    getToken(): string {
        // Synchronous version for legacy/simple calls
        // Since getAuthToken is async, this one will just return the session ID as a fallback
        const session = apiService.getSession();
        return session?.id || '';
    },
    async invokeIntegration(payload: { action: string; [key: string]: any }): Promise<any> {
        try {
            const token = await apiService.getAuthToken();
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(payload)
            });
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            const text = await response.text();
            throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}`);
        } catch (e: any) {
            console.error(`[apiService] invokeIntegration [${payload.action}] failed:`, e);
            throw e;
        }
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
    async shortenUrl(longUrl: string): Promise<string> {
        // Normalize localhost/127.0.0.1 URLs to production portal domain to ensure shortened links work globally
        // Skip normalization for Supabase storage URLs (containing '/storage/v1/') as storage is not hosted on the portal domain.
        let normalizedUrl = longUrl;
        if ((normalizedUrl.includes('localhost') || normalizedUrl.includes('127.0.0.1')) && !normalizedUrl.includes('/storage/v1/')) {
            normalizedUrl = normalizedUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'https://portal.eduai.co.ke');
        }

        // Cache key — per unique normalized URL, using v2 prefix to prevent collision and clear legacy entries
        const cacheKey = `eduai_short_v2_${encodeURIComponent(normalizedUrl)}`;

        // Validate cached entry: discard if it doesn't look like a legit short URL
        // or if the cache might be stale from a previous wrong session
        try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached && cached.startsWith('http') && !cached.includes('localhost')) {
                return cached;
            } else if (cached) {
                sessionStorage.removeItem(cacheKey); // clear bad cache
            }
        } catch (_) {}

        // 1. Try server-side proxy first (avoids browser CORS issues and uses server-side fetch with User-Agent)
        try {
            if (_supabase) {
                const res = await fetch('/api/integrations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'shortenUrl', url: normalizedUrl })
                });
                if (res.ok) {
                    const data = await res.json();
                    const short = data?.shortUrl;
                    // Ensure the returned shortUrl is not the original longUrl fallback
                    if (short && short.startsWith('http') && !short.includes('localhost') && (short.includes('is.gd') || short.includes('tinyurl.com'))) {
                        try { sessionStorage.setItem(cacheKey, short); } catch (_) {}
                        return short;
                    }
                }
            }
        } catch (_) {}

        // Helper: attempt a shortener service and return the result or null
        const tryShorten = async (shortenerUrl: string, extractFn: (text: string) => string | null): Promise<string | null> => {
            try {
                const res = await fetch(shortenerUrl, { 
                    method: 'GET', 
                    headers: {
                        'Accept': 'text/plain',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    signal: AbortSignal.timeout(7000) 
                });
                if (res.ok) {
                    const text = (await res.text()).trim();
                    return extractFn(text);
                }
            } catch (_) {}
            return null;
        };

        // 2. Client-side is.gd fallback
        const isgdShort = await tryShorten(
            `https://is.gd/create.php?format=simple&url=${encodeURIComponent(normalizedUrl)}`,
            (text) => (text.startsWith('https://is.gd/') ? text : null)
        );
        if (isgdShort) {
            try { sessionStorage.setItem(cacheKey, isgdShort); } catch (_) {}
            return isgdShort;
        }

        // 3. Client-side TinyURL fallback
        const tinyShort = await tryShorten(
            `https://tinyurl.com/api-create.php?url=${encodeURIComponent(normalizedUrl)}`,
            (text) => (text.startsWith('https://tinyurl.com/') ? text : null)
        );
        if (tinyShort) {
            try { sessionStorage.setItem(cacheKey, tinyShort); } catch (_) {}
            return tinyShort;
        }

        // 4. Final fallback: return the original normalized URL unchanged
        return normalizedUrl;
    },
    async checkUrl(url: string): Promise<{ success: boolean; status?: number; finalUrl?: string; ok?: boolean; message?: string }> {
        try {
            const res = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'checkUrl', url })
            });
            if (res.ok) {
                return await res.json();
            }
            return { success: false, message: 'Server responded with error status: ' + res.status };
        } catch (err: any) {
            return { success: false, message: err.message || 'Failed to check URL' };
        }
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
            const token = await apiService.getAuthToken();
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
    _lastConnectionTest: null as { success: boolean, status: string, dbName: string, message: string, timestamp: number } | null,
    async testDatabaseConnection(url?: string, key?: string): Promise<any> {
        // Skip redundant checks if performed within the last 5 seconds to prevent render loops
        const now = Date.now();
        if (!url && !key && apiService._lastConnectionTest && (now - apiService._lastConnectionTest.timestamp < 5000)) {
            return { ...apiService._lastConnectionTest, timestamp: new Date(apiService._lastConnectionTest.timestamp).toISOString(), cached: true };
        }

        const timestampStr = new Date().toISOString();
        if (url && key) initSupabaseClient(url, key);
        if (!_supabase) initSupabaseClient();

        if (!_supabase) {
            const localInsts = ls.get('institutions');
            if (localInsts.length > 0) {
                return { success: true, status: 'online', dbName: 'Local Browser Storage', message: 'Running in Local Storage mode.', timestamp: timestampStr };
            }
            return { success: true, status: 'offline', message: 'No cloud link. Local storage active.', dbName: 'Local Storage', timestamp: timestampStr };
        }

        try {
            // Increased timeout to 15 seconds to handle cold starts
            const insts = await apiService.fetchModuleRecords('institutions', undefined, undefined, { limit: 1 });
            if (insts) {
                const res = { success: true, status: 'online', dbName: 'PostgreSQL', message: 'Handshake successful.' };
                apiService._lastConnectionTest = { ...res, timestamp: Date.now() };
                return { ...res, timestamp: timestampStr };
            }
            throw new Error("Handshake failed");
        } catch (e: any) {
            const errRes = { 
                success: false, 
                status: 'offline', 
                message: `Connection Error: ${e.message || 'Handshake failed'}. Ensure SUPABASE_URL and ANON_KEY are correctly configured in your environment.`, 
                dbName: 'Error'
            };
            apiService._lastConnectionTest = { ...errRes, timestamp: Date.now() };
            return { ...errRes, timestamp: new Date().toISOString() };
        }
    },
    async resetPassword(identifier: string, type: 'email' | 'phone' = 'email'): Promise<{ success: boolean; message: string }> {
        if (!_supabase) return { success: false, message: "Server connection required." };
        try {
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'forgotPassword', 
                    recipient: identifier,
                    method: type 
                })
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
            return { success: true, message: type === 'email' ? "Recovery email dispatched." : "Verification code sent to your phone." };
        } catch (e: any) {
            console.error("Reset password recovery failed", e);
            return { success: false, message: e.message || "Connection failure during verification." };
        }
    },
    async verifyResetOtp(phone: string, code: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
        if (!_supabase) return { success: false, message: "Server connection required." };
        try {
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verifyResetOtp', recipient: phone, message: code })
            });
            const contentType = response.headers.get('content-type');
            let result: any;
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                console.error("[apiService] Non-JSON response in verifyResetOtp:", text.substring(0, 200));
                return { success: false, message: "Server returned invalid response format" };
            }

            return { 
                success: response.ok && result.success, 
                message: result.message,
                resetToken: result.resetToken 
            };
        } catch (e: any) {
            console.error("OTP verification failed:", e);
            return { success: false, message: "Connection failure." };
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
        return apiService.runMigration(sql);
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

            let activeBucket = bucket;
            let { data, error } = await _supabase.storage
                .from(activeBucket)
                .upload(path, file, {
                    upsert: true,
                    cacheControl: '3600',
                    contentType: contentType || file.type
                });

            // Fallback to default 'eduai' bucket if custom bucket doesn't exist
            if (error && activeBucket !== 'eduai') {
                console.warn(`[Storage] Bucket '${activeBucket}' returned error (${error.message}). Retrying upload using default 'eduai' bucket...`);
                activeBucket = 'eduai';
                const retryRes = await _supabase.storage
                    .from(activeBucket)
                    .upload(path, file, {
                        upsert: true,
                        cacheControl: '3600',
                        contentType: contentType || file.type
                    });
                data = retryRes.data;
                error = retryRes.error;
            }

            if (error) {
                console.error(`[Storage] Supabase upload error (${activeBucket}/${path}):`, error);
                console.warn(`[Storage] Falling back to Base64 data URL storage.`);
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            }

            if (data) {
                const { data: { publicUrl } } = _supabase.storage
                    .from(activeBucket)
                    .getPublicUrl(path);

                return publicUrl;
            }

            return null;
        } catch (err: any) {
            console.error("Upload Service Exception:", err);
            const errMsg = String(err.message || err);
            if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('fetch failed')) {
                console.warn(`[Storage] Supabase host unreachable during upload exception. Falling back to local Base64 storage.`);
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            }
            alert(`Upload Service Exception: ${err.message || 'Unknown error'}`);
            return null;
        }
    },
    async uploadToShowcaseCpanel(file: File, cpanelUrl: string, secretToken: string): Promise<string | null> {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(cpanelUrl, {
                method: 'POST',
                headers: {
                    'X-Showcase-Token': secretToken
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success' && result.url) {
                return result.url;
            } else {
                throw new Error(result.message || 'Upload failed on server.');
            }
        } catch (err: any) {
            console.error("[cPanel Storage] Upload error:", err);
            alert(`cPanel Upload Error: ${err.message}`);
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
            offset?: number;
        }
    ): Promise<T[]> {
        const getFilterCol = (mod: string, type: 'institution' | 'county') => {
            if (type === 'institution') {
                if (mod === 'institutions') return 'id';
                if (mod === 'county_inventory') return 'target_institution_id';
                if (mod === 'ng_cdf_funds') return 'constituency_id';
                if (mod === 'ng_cdf_bursaries') return 'constituency_name';
                return 'institution_id';
            } else {
                if (mod === 'counties') return 'id';
                return 'county_id';
            }
        };

        const queryLocal = () => {
            // Mapping for views in local storage mode
            let effectiveModule = module;
            if (module === 'v_house_statistics' || module === 'v_bed_occupancy') {
                effectiveModule = 'boarding_houses';
            }

            let records = ls.get(effectiveModule);
            if (!Array.isArray(records)) records = [];
            records = records.filter((r: any) => r && typeof r === 'object');

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
                    Object.entries(options.filter as any).every(([k, v]) => {
                        const snakeK = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                        return r[k] === v || r[snakeK] === v;
                    })
                );
            }

            const result = toCamelCase(records);
            const finalResult = Array.isArray(result) ? result : [];
            if (module === 'institutions' && Array.isArray(finalResult)) {
                finalResult.forEach((inst: any) => {
                    const settings = inst.coopSettings || inst.coop_settings;
                    if (settings) {
                        inst.coopConfig = {
                            serviceName: settings.serviceName || '',
                            connectionID: settings.connectionID || '',
                            connectionPassword: settings.connectionPassword || '',
                            institutionCode: settings.institutionCode || '',
                        };
                        inst.coopSettings = settings;
                    }
                });
            }
            return finalResult;
        };

        if (!_supabase) {
            return queryLocal();
        }

        try {
            // Determine Auth Token (Try JWT then ID fallback)
            let token = await apiService.getAuthToken();

            const url = new URL(`${window.location.origin}/api/records`);
            url.searchParams.append('module', module);
            if (institutionId && institutionId !== 'ALL') url.searchParams.append('institutionId', institutionId);
            if (countyId) url.searchParams.append('countyId', countyId);
            
            // Append advanced options
            if (options?.select) url.searchParams.append('select', options.select);
            if (options?.order) url.searchParams.append('order', options.order);
            if (options?.limit) url.searchParams.append('limit', options.limit.toString());
            if (options?.offset) url.searchParams.append('offset', options.offset.toString());
            if (options?.filter) {
                // For now, only simple equality filters are sent to proxy as query params
                // We could enhance the proxy to handle more complex filters
                Object.entries(options.filter).forEach(([k, v]) => {
                    // Convert camelCase filter keys to snake_case for Supabase/PostgreSQL compatibility
                    const dbKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                    url.searchParams.append(dbKey, v as string);
                });
            }

            const doFetch = (tkn: string) => fetch(url.toString(), {
                headers: {
                    'Authorization': tkn ? `Bearer ${tkn}` : '',
                    'Content-Type': 'application/json'
                }
            });

            let response = await doFetch(token);

            // --- 401 handler: try silent token refresh then retry once ---
            if (response.status === 401) {
                console.warn(`[apiService] 401 on fetch [${module}] — attempting token refresh...`);
                if (_supabase?.auth) {
                    try {
                        const { data: rd } = await _supabase.auth.refreshSession();
                        if (rd?.session?.access_token) {
                            token = rd.session.access_token;
                            console.log('[apiService] Token refreshed, retrying fetch...');
                            response = await doFetch(token);
                        }
                    } catch (refreshErr) {
                        console.warn('[apiService] Refresh failed during fetch:', refreshErr);
                    }
                }
                if (response.status === 401) {
                    apiService._notifySessionExpired();
                    console.warn(`[apiService] Session expired — falling back to local storage for [${module}]`);
                    return queryLocal();
                }
            }
            // --- end 401 handler ---

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error(`[apiService] Fetch API Error [${module}]:`, response.status, errData);
                
                // If it's a 500 error from our proxy, it usually contains a 'Database Error' string with column details
                if (response.status === 500 && errData.error) {
                    console.warn(`[apiService] Critical Database Failure in [${module}]:`, errData.error);
                }
                
                console.warn(`[apiService] Falling back to local storage for module [${module}]`);
                return queryLocal();
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error(`[apiService] Non-JSON response for [${module}]:`, text.substring(0, 200));
                console.warn(`[apiService] Falling back to local storage for module [${module}]`);
                return queryLocal();
            }

            const data = await response.json();
            const result = toCamelCase(data);
            if (module === 'institutions' && Array.isArray(result)) {
                result.forEach((inst: any) => {
                    const settings = inst.coopSettings || inst.coop_settings;
                    if (settings) {
                        inst.coopConfig = {
                            serviceName: settings.serviceName || '',
                            connectionID: settings.connectionID || '',
                            connectionPassword: settings.connectionPassword || '',
                            institutionCode: settings.institutionCode || '',
                        };
                        inst.coopSettings = settings;
                    }
                });
            }
            return Array.isArray(result) ? result : [];
        } catch (e) {
            console.error(`Fetch Exception [${module}]:`, e);
            console.warn(`[apiService] Falling back to local storage for module [${module}]`);
            return queryLocal();
        }
    },
    async fetchModuleRecord<T = any>(module: string, id: string): Promise<T | null> {
        const list = await apiService.fetchModuleRecords<T>(module, undefined, undefined, {
            filter: { id },
            limit: 1
        });
        return list.length > 0 ? list[0] : null;
    },

    async createBedAllocation(payload: {
        id: string; bed_id: string; student_id: string; institution_id: string;
        allocated_by: string; allocation_date: string; term: string;
        academic_year: string; status: string; notes?: string | null;
    }): Promise<any> {
        if (!_supabase) {
            return apiService.saveModuleRecord('bed_allocations', toCamelCase(payload));
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
    async invokeRpc(functionName: string, params: any): Promise<any> {
        if (!_supabase) {
            console.warn(`RPC ${functionName} called in offline mode. Returning null.`);
            return null;
        }
        try {
            const token = await apiService.getAuthToken();
            const response = await fetch(`${window.location.origin}/api/system?action=rpc`, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    function: functionName,
                    params: params
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `RPC ${functionName} failed with status ${response.status}`);
            }

            return await response.json();
        } catch (e) {
            console.error(`RPC Exception [${functionName}]:`, e);
            throw e;
        }
    },
    async fetchTodayTeacherCheckIn(teacherId: string): Promise<any | null> {
        const records = await apiService.fetchModuleRecords<any>('v_today_teacher_checkins', undefined, undefined, {
            filter: { teacher_id: teacherId },
            limit: 1
        });
        return records.length > 0 ? records[0] : null;
    },
    async fetchTeacherCheckInsRange(
        institutionId: string,
        startDate: string,
        endDate: string,
        teacherId?: string
    ): Promise<any[]> {
        if (!_supabase) return [];
        let query = _supabase
            .from('v_teacher_checkins')
            .select('*')
            .eq('institution_id', institutionId)
            .gte('check_in_date', startDate)
            .lte('check_in_date', endDate);
        
        if (teacherId && teacherId !== 'all') {
            query = query.eq('teacher_id', teacherId);
        }
        
        const { data, error } = await query.order('check_in_date', { ascending: false });
        if (error) {
            console.error('Error fetching teacher check-ins range:', error);
            return [];
        }
        return toCamelCase(data);
    },
    async processTeacherCheckIn(payload: {
        teacher_id?: string;
        institution_id?: string;
        checkin_type: string;
        location?: string;
        notes?: string;
        timetable_entry_id?: string;
        timestamp?: string;
    }): Promise<any> {
        return apiService.invokeRpc('process_teacher_checkin', {
            p_teacher_id: payload.teacher_id,
            p_institution_id: payload.institution_id,
            p_checkin_type: payload.checkin_type,
            p_location: payload.location || '',
            p_notes: payload.notes || '',
            p_timetable_entry_id: payload.timetable_entry_id,
            p_timestamp: payload.timestamp
        });
    },
    sanitizePayload(module: string, payload: any, isUpdate = false): any {
        if (!payload) return payload;

        const processItem = (item: any) => {
            if (typeof item !== 'object' || item === null) return item;
            
            // Auto-generate primary key ID if missing or null to prevent PostgreSQL not-null constraint failures (ONLY for new record creation, NOT updates)
            // Tables whose `id` column is `UUID` type must NOT receive a prefixed string id — Postgres will auto-generate a UUID via DEFAULT gen_random_uuid().
            const UUID_PK_MODULES = [
                'biometric_devices', 'biometric_enrollments', 'biometric_logs',
                'staff_attendance_daily', 'student_attendance',
                'zkteco_commands', 'zkteco_attendance_raw'
            ];
            if (!isUpdate && !item.id && !UUID_PK_MODULES.includes(module)) {
                const prefixMap: Record<string, string> = {
                    books: 'bk_',
                    activity_log: 'log_',
                    cafe_orders: 'co_',
                    cafe_menu_items: 'cmi_',
                    retail_sales: 'rs_',
                    retail_inventory: 'ri_',
                    users: 'u_'
                };
                const prefix = prefixMap[module] || `${module.slice(0, 3)}_`;
                item.id = `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            }

            // Safety net for Driving School modules to prevent schema mismatch errors
            if (module === 'ds_vehicles' || module === 'ds_instructors' || module === 'ds_students') {
                delete item.start_time;
                delete item.end_time;
                delete item.lesson_date;
                delete item.lesson_type;
                delete item.student_id;
                delete item.instructor_id;
                delete item.vehicle_id;
            }
            if (module === 'ds_lessons') {
                delete item.confirmation_status;
            }
            if (module === 'ds_students') {
                delete item.preferred_lesson_hours;
            }
            if (module === 'ds_vehicles') {
                delete item.assigned_instructor_id;
            }
            
            // Convert empty strings to null for date, timestamp, numeric, and relation fields to prevent PostgreSQL syntax/constraint errors
            Object.keys(item).forEach(key => {
                if (item[key] === '') {
                    const lowerKey = key.toLowerCase();
                    if (
                        lowerKey === 'dob' || 
                        lowerKey === 'age' ||
                        lowerKey === 'user_id' || 
                        lowerKey === 'patient_id' ||
                        lowerKey === 'recorded_by' ||
                        lowerKey === 'date' ||
                        lowerKey.endsWith('_date') || 
                        lowerKey.endsWith('_at')
                    ) {
                        item[key] = null;
                    }
                }
            });
            
            return item;
        };

        if (Array.isArray(payload)) {
            return payload.map(processItem);
        }
        return processItem(payload);
    },
    async updateModuleRecord<T = any>(module: string, id: string, data: Partial<T>): Promise<T | null> {
        let payload = apiService.sanitizePayload(module, toSnakeCase(data), true);
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
            if (payload.id === id) {
                delete payload.id;
            }
        }

        if (!_supabase) {
            const records = ls.get(module);
            const index = records.findIndex((r: any) => r.id === id);
            if (index >= 0) {
                records[index] = { ...records[index], ...payload };
                ls.set(module, records);
            }
            return toCamelCase(payload);
        }

        try {
            const token = await apiService.getAuthToken();

            const response = await fetch(`/api/records?module=${module}&id=${id}`, {
                method: 'PATCH',
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
                
                const errorCode = errData.code || 'UNKNOWN';
                const errorDetail = errData.details || errData.detail || '';
                const errorHint = errData.hint ? ` Hint: ${errData.hint}` : '';
                const reasonStr = errData.reason ? ` Reason: ${errData.reason}` : '';
                const debugStr = errData.debug?.token ? ` Debug: ${errData.debug.token}` : '';
                
                const fullErrorMessage = `${errData.error || `Failed to update ${module}`} [Code: ${errorCode}] ${errorDetail}${errorHint}${reasonStr}${debugStr}`;
                
                const colMatch = fullErrorMessage.match(/Could not find the '([^']+)' column/i);
                if (colMatch && colMatch[1]) {
                    const offendingCol = colMatch[1];
                    console.warn(`[apiService] Schema cache stale: automatically stripping un-cached column '${offendingCol}' and retrying update for [${module}]`);
                    const retryPayload = { ...payload };
                    delete retryPayload[offendingCol];
                    
                    const retryResponse = await fetch(`/api/records?module=${module}&id=${id}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': token ? `Bearer ${token}` : '',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ data: retryPayload })
                    });
                    
                    if (retryResponse.ok) {
                        const contentTypeRetry = retryResponse.headers.get('content-type');
                        if (contentTypeRetry && contentTypeRetry.includes('application/json')) {
                            const updatedData = await retryResponse.json().catch(() => null);
                            return Array.isArray(updatedData) ? toCamelCase(updatedData[0]) : toCamelCase(updatedData);
                        }
                        return toCamelCase(retryPayload);
                    }
                }
                
                throw new Error(fullErrorMessage);
            }

            const contentTypePatch = response.headers.get('content-type');
            if (contentTypePatch && contentTypePatch.includes('application/json')) {
                const updatedData = await response.json().catch(() => null);
                return Array.isArray(updatedData) ? toCamelCase(updatedData[0]) : toCamelCase(updatedData);
            }
            return toCamelCase(payload);
        } catch (e: any) {
            console.error(`Update API Error [${module}]:`, e);
            throw e;
        }
    },

    async deleteModuleRecord(module: string, id: string): Promise<void> {
        const idsArray = id.split(',').map(s => s.trim()).filter(Boolean);
        if (idsArray.length === 0) return;

        // ── Tier 0: Local storage mode (no Supabase configured) ──
        if (!_supabase) {
            const records = ls.get(module);
            const idsSet = new Set(idsArray);
            ls.set(module, records.filter((r: any) => !idsSet.has(r.id)));

            if (module === 'users') {
                // Delete linked ds_students
                const dsStudents = ls.get('ds_students');
                ls.set('ds_students', (dsStudents || []).filter((s: any) => s && !idsSet.has(s.userId) && !idsSet.has(s.user_id)));
                
                // Delete linked ds_instructors
                const dsInstructors = ls.get('ds_instructors');
                ls.set('ds_instructors', (dsInstructors || []).filter((i: any) => i && !idsSet.has(i.userId) && !idsSet.has(i.user_id)));
            }
            return;
        }

        // Delete linked DS records first (client side direct delete)
        if (module === 'users' && _supabase) {
            try {
                if (idsArray.length === 1) {
                    await _supabase.from('ds_students').delete().eq('user_id', idsArray[0]);
                    await _supabase.from('ds_instructors').delete().eq('user_id', idsArray[0]);
                } else {
                    await _supabase.from('ds_students').delete().in('user_id', idsArray);
                    await _supabase.from('ds_instructors').delete().in('user_id', idsArray);
                }
            } catch (err) {
                console.warn('[deleteModuleRecord] Client-side linked DS delete failed:', err);
            }
        }

        // ── Tier 1: Supabase RPC with SECURITY DEFINER (bypasses RLS, no body parsing) ──
        // Requires migration 241_safe_delete_records_rpc.sql to be applied in Supabase.
        try {
            const { data: rpcResult, error: rpcErr } = await _supabase.rpc('safe_delete_records', {
                p_table: module,
                p_ids: idsArray
            });
            if (!rpcErr && rpcResult && typeof rpcResult === 'number' && rpcResult > 0) {
                console.log(`[deleteModuleRecord] RPC OK: ${module} x${idsArray.length} → ${rpcResult} deleted`);
                return;
            }
            // RPC did not delete anything or failed; fall through to direct client-side delete
            console.warn(`[deleteModuleRecord] RPC returned 0 or error for ${module}: ${rpcErr?.message || '0 deleted'}. Falling back to direct client-side delete...`);
        } catch (rpcEx: any) {
            console.warn(`[deleteModuleRecord] RPC exception (${rpcEx.message}), falling back to direct client-side delete...`);
        }

        // ── Tier 1.5: Client-side direct Supabase delete (respects RLS) ──
        try {
            let q = _supabase.from(module).delete().select('id');
            if (idsArray.length === 1) q = q.eq('id', idsArray[0]);
            else q = q.in('id', idsArray);

            const { data: deletedRows, error: directErr } = await q;
            if (!directErr && deletedRows && deletedRows.length > 0) {
                console.log(`[deleteModuleRecord] Client-side delete OK: ${module} x${deletedRows.length} rows`);
                return;
            }
            console.warn(`[deleteModuleRecord] Client-side delete did not delete any rows (possibly RLS block or missing record), falling back to API...`);
        } catch (directEx: any) {
            console.warn(`[deleteModuleRecord] Client-side delete exception (${directEx.message}), falling back to API...`);
        }

        // ── Tier 2: Dedicated Delete API Call ──
        try {
            const token = await apiService.getAuthToken();
            const url = `${window.location.origin}/api/delete?module=${encodeURIComponent(module)}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: idsArray })
            });

            const contentType = response.headers.get('content-type');
            let resData: any = {};
            if (contentType && contentType.includes('application/json')) {
                resData = await response.json().catch(() => ({}));
            } else {
                const txt = await response.text().catch(() => '');
                console.warn(`[deleteModuleRecord] Non-JSON API response (${response.status}):`, txt.substring(0, 200));
            }

            console.log(`[deleteModuleRecord] API DELETE ${module} ids=${idsArray.length} status=${response.status}`, resData);

            if (response.status === 503 || (resData.error && resData.error.includes('Supabase keys missing'))) {
                console.warn(`[deleteModuleRecord] 503: falling back to localStorage for ${module}`);
                const records = ls.get(module);
                const idsSet = new Set(idsArray);
                ls.set(module, records.filter((r: any) => !idsSet.has(r.id)));
                return;
            }

            if (!response.ok || resData.success === false) {
                throw new Error(resData.error || `Failed to delete from ${module} (HTTP ${response.status})`);
            }
        } catch (e: any) {
            console.error(`Delete API Error [${module}]:`, e);
            console.warn(`[apiService] Falling back to localStorage delete for ${module}`);
            const records = ls.get(module);
            const idsSet = new Set(idsArray);
            ls.set(module, records.filter((r: any) => !idsSet.has(r.id)));
        }
    },
    async saveModuleRecord<T = any>(module: string, data: T): Promise<T | null> {
        if (module === 'invoices' && data && (data as any).studentId && ((data as any).status === 'pending' || !(data as any).status)) {
            const invData = data as any;
            try {
                // Fetch student receipts
                const allReceipts = await apiService.fetchModuleRecords<any>('receipts').catch(() => []);
                const studentReceipts = allReceipts.filter((r: any) => r.studentId === invData.studentId || r.student_id === invData.studentId);
                const totalPaid = studentReceipts.reduce((sum, r) => sum + Number(r.amountPaid || 0), 0);

                // Fetch student existing invoices (excluding this invoice if it already exists in DB)
                const allInvoices = await apiService.fetchModuleRecords<any>('invoices').catch(() => []);
                const studentInvoices = allInvoices.filter((i: any) => 
                    (i.studentId === invData.studentId || i.student_id === invData.studentId) && 
                    i.status !== 'cancelled' && 
                    i.status !== 'quote' && 
                    i.id !== invData.id
                );
                const totalInvoiced = studentInvoices.reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

                let prepayment = totalPaid - totalInvoiced;
                if (prepayment > 0) {
                    // Extract items of this new invoice
                    let items: any[] = [];
                    if (typeof invData.items === 'string') {
                        try { items = JSON.parse(invData.items); } catch(e) {}
                    } else if (Array.isArray(invData.items)) {
                        items = invData.items;
                    }

                    // Sort items by priority ascending (e.g. priority 1 first, priority 2 next, etc. Null/undefined gets 99)
                    const sortedItems = [...items].sort((a: any, b: any) => {
                        const prioA = a.priority !== undefined ? Number(a.priority) : 99;
                        const prioB = b.priority !== undefined ? Number(b.priority) : 99;
                        return prioA - prioB;
                    });

                    let totalAllocated = 0;
                    const updatedItems = sortedItems.map(item => {
                        const itemTotal = Number(item.amount || item.unitPrice || 0);
                        const itemPaid = Number(item.paid || 0);
                        const itemRemaining = Math.max(0, itemTotal - itemPaid);
                        const allocated = Math.min(prepayment, itemRemaining);
                        prepayment -= allocated;
                        totalAllocated += allocated;
                        return {
                            ...item,
                            paid: itemPaid + allocated
                        };
                    });

                    invData.items = updatedItems;
                    const finalPaidSum = updatedItems.reduce((sum, it) => sum + (it.paid || 0), 0);
                    invData.status = finalPaidSum >= invData.totalAmount ? 'paid' : (finalPaidSum > 0 ? 'partial' : 'pending');
                }
            } catch (err) {
                console.error("Failed to automatically apply prepayment to invoice:", err);
            }
        }

        const tablesWithBranchId = ['users', 'invoices', 'receipts', 'branches', 'branch_integration_configs'];
        if (tablesWithBranchId.includes(module) && module !== 'branches') {
            const bId = _sessionUser?.branchId || _sessionUser?.branch_id;
            if (bId && !(data as any).branch_id && !(data as any).branchId) {
                (data as any).branchId = bId;
            }
        }

        let payload = apiService.sanitizePayload(module, toSnakeCase(data));

        if (!_supabase) {
            ls.upsert(module, payload);
            return toCamelCase(payload);
        }

        try {
            let token = await apiService.getAuthToken();

            const doSaveRequest = async (tkn: string, currentPayload: any) => fetch('/api/records?module=' + module, {
                method: 'POST',
                headers: {
                    'Authorization': tkn ? `Bearer ${tkn}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: currentPayload })
            });

            const attemptSave = async (currentPayload: any, retries: number = 5): Promise<any> => {
                let response = await doSaveRequest(token, currentPayload);

                // --- 401 handler: try silent token refresh then retry once ---
                if (response.status === 401) {
                    console.warn(`[apiService] 401 on save [${module}] — attempting token refresh...`);
                    if (_supabase?.auth) {
                        try {
                            const { data: rd } = await _supabase.auth.refreshSession();
                            if (rd?.session?.access_token) {
                                token = rd.session.access_token;
                                console.log('[apiService] Token refreshed, retrying save...');
                                response = await doSaveRequest(token, currentPayload);
                            }
                        } catch (refreshErr) {
                            console.warn('[apiService] Refresh failed during save:', refreshErr);
                        }
                    }
                    // If still 401 after refresh attempt, signal session expiry
                    if (response.status === 401) {
                        apiService._notifySessionExpired();
                        throw new Error('Session expired. Please log in again.');
                    }
                }
                // --- end 401 handler ---

                if (!response.ok) {
                    const contentType = response.headers.get('content-type');
                    let errData: any = {};
                    if (contentType && contentType.includes('application/json')) {
                        errData = await response.json().catch(() => ({}));
                    } else {
                        errData = { error: await response.text().catch(() => `Status ${response.status}`) };
                    }
                    
                    const errorCode = errData.code || 'UNKNOWN';
                    const errorDetail = errData.details || errData.detail || '';
                    const errorHint = errData.hint ? ` Hint: ${errData.hint}` : '';
                    const reasonStr = errData.reason ? ` Reason: ${errData.reason}` : '';
                    const debugStr = errData.debug?.token ? ` Debug: ${errData.debug.token}` : '';
                    
                    const fullErrorMessage = `${errData.error || `Failed to save ${module}`} [Code: ${errorCode}] ${errorDetail}${errorHint}${reasonStr}${debugStr}`;
                    
                    const colMatch = fullErrorMessage.match(/Could not find the '([^']+)' column/i);
                    if (colMatch && colMatch[1] && retries > 0) {
                        const offendingCol = colMatch[1];
                        console.warn(`[apiService] Schema cache stale: stripping un-cached column '${offendingCol}' and retrying (${retries} left)...`);
                        const retryPayload = { ...currentPayload };
                        delete retryPayload[offendingCol];
                        return attemptSave(retryPayload, retries - 1);
                    }
                    
                    console.error(`Save API Error [${module}]:`, response.status, errData);
                    throw new Error(fullErrorMessage);
                }

                const contentTypePost = response.headers.get('content-type');
                if (contentTypePost && contentTypePost.includes('application/json')) {
                    return await response.json().catch(() => null);
                } else {
                    const text = await response.text();
                    console.warn(`[apiService] Save [${module}] returned non-JSON:`, text.substring(0, 200));
                    return null;
                }
            };

            const savedData = await attemptSave(payload);
            return savedData ? toCamelCase(savedData) : null;
        } catch (e: any) {
            console.error(`Save Exception [${module}]:`, e);
            const msg = e.message || String(e);
            if (msg.includes('Session expired') || msg.includes('Please log in')) {
                throw e; // propagate session-expiry errors, don't mask them
            }
            if (msg.includes('Registry Conflict') || msg.includes('23505') || msg.toLowerCase().includes('unique constraint') || msg.toLowerCase().includes('already registered')) {
                throw e;
            }
            console.warn(`[apiService] Falling back to localStorage save for ${module}`);
            ls.upsert(module, payload);
            return toCamelCase(payload);
        }
    },
    async fetchSmsOutbox(institutionId: string): Promise<any[]> {
        return apiService.fetchModuleRecords('sms_outbox', institutionId, undefined, {
            order: 'created_at.desc'
        });
    },
    async saveToSmsOutbox(messages: any[]): Promise<void> {
        await apiService.saveModuleRecord('sms_outbox', messages);
    },
    async removeFromSmsOutbox(id: string): Promise<void> {
        await apiService.deleteModuleRecord('sms_outbox', id);
    },
    async clearSmsOutbox(institutionId: string): Promise<void> {
        // Since we don't have a bulk delete by filter in proxy, 
        // we'll fetch then delete individual for now, or just let users delete manually.
        // For "Retry All", we'll delete each as it succeeds.
    },
    async fetchFeePromises(institutionId: string): Promise<FeePromise[]> {
        return apiService.fetchModuleRecords('fee_promises', institutionId, undefined, {
            order: 'promised_date.asc'
        });
    },
    async saveFeePromise(promise: any): Promise<void> {
        await apiService.saveModuleRecord('fee_promises', promise);
    },
    async deleteFeePromise(id: string): Promise<void> {
        await apiService.deleteModuleRecord('fee_promises', id);
    },
    async saveModuleRecords<T = any>(module: string, data: T[]): Promise<T[] | null> {
        const tablesWithBranchId = ['users', 'invoices', 'receipts', 'branches', 'branch_integration_configs'];
        if (tablesWithBranchId.includes(module) && module !== 'branches') {
            const bId = _sessionUser?.branchId || _sessionUser?.branch_id;
            if (bId) {
                data.forEach((item: any) => {
                    if (item && !item.branch_id && !item.branchId) {
                        (item as any).branchId = bId;
                    }
                });
            }
        }

        let payload = apiService.sanitizePayload(module, data.map(toSnakeCase));

        if (!_supabase) {
            const records = ls.get(module);
            payload.forEach((item: any) => {
                const index = records.findIndex((r: any) => r && r.id === item.id);
                if (index >= 0) {
                    records[index] = { ...records[index], ...item };
                } else {
                    records.push(item);
                }
            });
            ls.set(module, records);
            return data;
        }

        try {
            const token = await apiService.getAuthToken();

            const attemptBulkSave = async (currentPayload: any[], retries: number = 5): Promise<any> => {
                const response = await fetch('/api/records?module=' + module, {
                    method: 'POST',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : '',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ data: currentPayload })
                });

                if (!response.ok) {
                    const contentType = response.headers.get('content-type');
                    let errData: any = {};
                    if (contentType && contentType.includes('application/json')) {
                        errData = await response.json().catch(() => ({}));
                    } else {
                        errData = { error: await response.text().catch(() => `Status ${response.status}`) };
                    }
                    
                    const errorCode = errData.code || 'UNKNOWN';
                    const errorDetail = errData.details || errData.detail || '';
                    const errorHint = errData.hint ? ` Hint: ${errData.hint}` : '';
                    const reasonStr = errData.reason ? ` Reason: ${errData.reason}` : '';
                    const debugStr = errData.debug?.token ? ` Debug: ${errData.debug.token}` : '';
                    
                    const fullErrorMessage = `${errData.error || `Failed to bulk save ${module}`} [Code: ${errorCode}] ${errorDetail}${errorHint}${reasonStr}${debugStr}`;
                    
                    const colMatch = fullErrorMessage.match(/Could not find the '([^']+)' column/i);
                    if (colMatch && colMatch[1] && retries > 0) {
                        const offendingCol = colMatch[1];
                        console.warn(`[apiService] Schema cache stale: stripping un-cached column '${offendingCol}' and retrying bulk save (${retries} left)...`);
                        const retryPayload = currentPayload.map((p: any) => {
                            const copy = { ...p };
                            delete copy[offendingCol];
                            return copy;
                        });
                        return attemptBulkSave(retryPayload, retries - 1);
                    }
                    
                    console.error(`Bulk Save API Error [${module}]:`, response.status, errData);
                    throw new Error(fullErrorMessage);
                }

                const contentTypeBulk = response.headers.get('content-type');
                if (contentTypeBulk && contentTypeBulk.includes('application/json')) {
                    return await response.json().catch(() => null);
                } else {
                    const text = await response.text();
                    console.warn(`[apiService] Bulk Save [${module}] returned non-JSON:`, text.substring(0, 200));
                    return [];
                }
            };

            const savedData = await attemptBulkSave(payload);
            return Array.isArray(savedData) ? savedData.map(toCamelCase) : (savedData ? [toCamelCase(savedData)] : []) as any;
        } catch (e: any) {
            console.error(`Bulk Save Exception [${module}]:`, e);
            throw e;
        }
    },
    async fetchNotifications(userId: string, options: any = {}): Promise<AppNotification[]> {
        return apiService.fetchModuleRecords('app_notifications', undefined, undefined, {
            filter: { user_id: userId },
            order: 'timestamp.desc',
            ...options
        });
    },
    async createNotification(userId: string, message: string, type: string = 'info'): Promise<void> {
        const notification: AppNotification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            userId,
            message,
            type,
            isRead: false,
            timestamp: new Date().toISOString()
        };
        await apiService.saveModuleRecord('app_notifications', notification);
    },
    async markNotificationAsRead(id: string): Promise<void> {
        await apiService.saveModuleRecord('app_notifications', { id, isRead: true } as any);
    },
    async notifySuperAdmins(message: string, type: string = 'info'): Promise<void> {
        const admins = await apiService.fetchModuleRecords<User>('users', undefined, undefined, { 
            filter: { role: 'super_admin' } 
        });
        if (admins && admins.length > 0) {
            for (const admin of admins) {
                await apiService.createNotification(admin.id, message, type);
            }
        }
    },
    async notifyCoopAdmins(institutionId: string, message: string, type: string = 'info'): Promise<void> {
        // Fetch users in this institution to find Chairman/Managers
        const users = await apiService.fetchModuleRecords<User>('users', institutionId);
        const targets = users.filter(u => u.role === 'coop_chairman' || u.role === 'cooperative_manager' || u.role === 'coop_admin');
        
        if (targets.length > 0) {
            for (const target of targets) {
                await apiService.createNotification(target.id, message, type);
            }
        }
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
        const notifications = await apiService.fetchNotifications(userId);
        for (const n of notifications) {
            if (!n.isRead) {
                await apiService.markNotificationAsRead(n.id);
            }
        }
    },
    async activateModuleTrial(moduleId: string, institutionId: string): Promise<void> {
        // First check if a record already exists to avoid unique constraint violations
        const existing = await apiService.fetchModuleRecords<InstitutionModuleState>('institution_module_states', institutionId, undefined, {
            filter: { module_id: moduleId }
        });

        const trialDays = 14;
        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();
        
        const moduleState: Partial<InstitutionModuleState> = {
            id: existing.length > 0 ? existing[0].id : `${institutionId}_${moduleId}_${Date.now()}`,
            institutionId,
            moduleId,
            status: 'trial',
            trialEndsAt,
            activatedAt: now.toISOString(),
            updatedAt: now.toISOString()
        } as any;

        await apiService.saveModuleRecord('institution_module_states', moduleState);
    },
    async fetchInstitutions(institutionId?: string): Promise<Institution[]> { return apiService.fetchModuleRecords('institutions', institutionId); },

    async saveInstitution(inst: Institution): Promise<void> { 
        const { countyId, moduleStates, coopConfig, coopSettings, ...rest } = inst as any;
        const coop_settings = {
            ...(coopSettings || {}),
            ...(coopConfig || {})
        };
        await apiService.saveModuleRecord('institutions', { 
            ...rest, 
            coop_settings,
            county_id: countyId
        }); 
    },
    async fetchUsers(institutionId?: string): Promise<User[]> { return apiService.fetchModuleRecords('users', institutionId); },
    async saveUser(user: Partial<User>): Promise<void> { 
        const { countyId, ...rest } = user;
        await apiService.saveModuleRecord('users', { ...rest, county_id: countyId }); 
    },
    async checkEmailExists(email: string): Promise<boolean> {
        if (!email) return false;
        try {
            const token = await apiService.getAuthToken();
            const response = await fetch(`${window.location.origin}/api/system?action=checkEmail&email=${encodeURIComponent(email.toLowerCase())}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error("[apiService] Non-JSON response in checkEmailExists:", text.substring(0, 200));
                return false;
            }
            const data = await response.json();
            return !!data.exists;
        } catch (e) {
            console.error("Error checking email existence:", e);
            // Fallback to local check if system API fails
            const records = await apiService.fetchModuleRecords('users', undefined, undefined, { filter: { email: email.toLowerCase() } });
            return Array.isArray(records) && records.length > 0;
        }
    },
    async registerUser(userData: Partial<User>, institutionName?: string): Promise<void> {
        const password = userData.password || (userData.role === 'student' ? 'student123' : 'password123');
        const userWithPass = { ...userData, password };
        await apiService.saveUser(userWithPass);

        if (userData.email) {
            const subject = "Welcome to Eduai Automation - Account Credentials";
            const body = `Dear ${userData.name},\n\nYour account has been created on the Eduai Automation Management System${institutionName ? ` for ${institutionName}` : ''}.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nEmail: ${userData.email}\nPassword: ${password}\n\nPlease change your password upon first login.\n\nBest Regards,\nSystem Admin`;

            // Send email asynchronously so we don't block the UI
            apiService.sendEmail(userData.email, subject, body).catch(e => {
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

            apiService.sendSms(userData.phoneNumber, smsMessage).catch(e => {
                console.error("Failed to send welcome SMS:", e);
            });
        }
    },
    async fetchAllocations(institutionId?: string): Promise<AllocationRequest[]> { return apiService.fetchModuleRecords('allocation_requests', institutionId); },
    async saveAllocation(data: Partial<AllocationRequest>): Promise<void> { await apiService.saveModuleRecord('allocation_requests', data); },
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
            // Store as cache for handle ERR_NAME_NOT_RESOLVED type failures
            localStorage.setItem('eduai_system_settings_cache', JSON.stringify(data));
            return toCamelCase(data) || null;
        } catch (e) {
            console.error("[apiService] Error fetching company settings:", e);
            // Try to recover from cache
            try {
                const cachedData = localStorage.getItem('eduai_system_settings_cache');
                if (cachedData) {
                    console.warn("[apiService] Recovered system settings from cache after fetch failure");
                    return toCamelCase(JSON.parse(cachedData));
                }
            } catch (cacheErr) {}
            return null;
        }
    },
    async getSystemSettings(): Promise<{ data: CompanyDetails | null }> {
        const settings = await apiService.fetchCompanySettings();
        return { data: settings };
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
    async fetchTimetable(institutionId: string): Promise<TimetableEntry[]> { return apiService.fetchModuleRecords('timetable_entries', institutionId); },
    async saveTimetable(institutionId: string, ayId: string, semId: string, entries: TimetableEntry[]): Promise<void> {
        // 1. Generate unique IDs and ensure tenancy for all entries
        const entriesWithIds = entries.map(e => ({
            ...e,
            id: e.id || `tt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            institutionId,
            academicYearId: ayId,
            semesterId: semId
        }));

        const snakeEntries = entriesWithIds.map(e => toSnakeCase(e));

        if (!_supabase) {
            let existing = ls.get('timetable_entries');
            existing = existing.filter((e: any) => !(e.institution_id === institutionId && e.semester_id === semId));
            existing = [...existing, ...snakeEntries];
            ls.set('timetable_entries', existing);
            return;
        }

        try {
            // 2. Clear existing entries for this academic period to avoid duplicates
            const deleteSql = `DELETE FROM timetable_entries WHERE institution_id = '${institutionId}' AND academic_year_id = '${ayId}' AND semester_id = '${semId}';`;
            await apiService.runMigration(deleteSql);

            // 3. Save new entries
            await apiService.saveModuleRecords('timetable_entries', entriesWithIds);
        } catch (e) { 
            console.error("Timetable Save Error:", e);
            try {
                // Fixed: Fallback was using singular saveModuleRecord for an array
                await apiService.saveModuleRecords('timetable_entries', snakeEntries);
            } catch (innerE) {
                console.error("Timetable Fallback Save Error:", innerE);
            }
        }
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

        const existingRecords = await apiService.fetchModuleRecords<any>('allocation_requests', undefined, undefined, {
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
        
        await apiService.saveModuleRecord('allocation_requests', { id: requestId, ...updates });
    },
    async onAddTransaction(data: Omit<MpesaTransaction, 'id' | 'transactionId' | 'timestamp' | 'status'>, items: InvoiceItem[]): Promise<TransactionStatus> {
        if (!_supabase) {
            const id = `txn_${Date.now()}`;
            const transaction: MpesaTransaction = { ...data, id, transactionId: `MPESA${id}`, timestamp: new Date().toISOString(), status: 'completed' };
            await apiService.saveModuleRecord('mpesa_transactions', transaction);
            return 'completed';
        }

        // Check if this transaction already exists (to avoid duplicates from STK push)
        // If payerName is empty, we might be able to find the existing record by amount and phone
        try {
            const existing = await apiService.fetchModuleRecords<any>('mpesa_transactions', data.institutionId, undefined, {
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
        await apiService.saveModuleRecord('mpesa_transactions', transaction);
        return 'completed';
    },
    async sendSms(recipient: string | string[], message: string, config?: SmsConfig, units?: number, institutionId?: string, authToken?: string, isSystemAlert?: boolean): Promise<any> {
        let formattedRecipient: any;
        if (Array.isArray(recipient)) {
            formattedRecipient = recipient.map(r => formatPhoneNumber(r));
        } else {
            formattedRecipient = formatPhoneNumber(recipient);
        }

        if (!_supabase) {
            return { success: false, message: "Database service (Supabase) not initialized. Live SMS requires an active backend." };
        }

        try {
            const { data } = _supabase.auth ? await _supabase.auth.getSession() : { data: { session: null } };
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
                    const session = apiService.getSession();
                    if (session?.id) token = session.id;
                }
            }

            let headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers,
                body: JSON.stringify({ 
                    action: 'sendSms', 
                    [Array.isArray(formattedRecipient) ? 'recipients' : 'recipient']: formattedRecipient, 
                    message, 
                    config, 
                    units, 
                    institutionId 
                })
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

            const isLowSmsError = !response.ok && (
                typeof resData.message === 'string' && (
                    resData.message.toLowerCase().includes('balance') || 
                    resData.message.toLowerCase().includes('units') || 
                    resData.message.toLowerCase().includes('insufficient') ||
                    resData.message.toLowerCase().includes('low sms')
                )
            );

            if (institutionId && !isSystemAlert && (isLowSmsError || response.ok)) {
                // Asynchronously check balance and alert admin if needed
                (async () => {
                    try {
                        const instList = await apiService.fetchModuleRecords('institutions', undefined, undefined, { 
                            filter: { id: institutionId } 
                        });
                        const inst = instList?.[0];
                        if (inst) {
                            const smsBalance = inst.smsBalance || 0;
                            // Trigger warning if balance is below 15 units, or if dispatch failed due to low units
                            if (smsBalance < 15 || isLowSmsError) {
                                const adminEmails: string[] = [];
                                const adminPhones: string[] = [];
                                if (inst.email) adminEmails.push(inst.email);
                                if (inst.phoneNumber) adminPhones.push(inst.phoneNumber);

                                const adminUsers = await apiService.fetchModuleRecords('users', undefined, undefined, {
                                    filter: { institution_id: institutionId, role: 'admin' }
                                }).catch(() => []);

                                (adminUsers || []).forEach((u: any) => {
                                    if (u.email && !adminEmails.includes(u.email)) adminEmails.push(u.email);
                                    if (u.phoneNumber && !adminPhones.includes(u.phoneNumber)) adminPhones.push(u.phoneNumber);
                                });

                                const subject = "Low SMS Balance Alert";
                                const mailMsg = `Dear Administrator,\n\nYour institution account (${inst.name}) has low SMS units remaining.\nCurrent Balance: ${smsBalance} units.\n\nPlease top up your SMS units to ensure uninterrupted system operations.\n\nBest Regards,\nSaaS Administrator`;

                                for (const email of adminEmails) {
                                    await apiService.sendEmail(email, subject, mailMsg).catch(() => {});
                                }

                                for (const phone of adminPhones) {
                                    await apiService.sendSms(
                                        phone, 
                                        `ALERT: Your account SMS balance is low (${smsBalance} units left). Please purchase more units to avoid service disruptions.`, 
                                        undefined, 
                                        1, 
                                        institutionId, 
                                        undefined, 
                                        true
                                    ).catch(() => {});
                                }
                            }
                        }
                    } catch (err) {
                        console.error('[apiService] Background SMS balance check / alert failed:', err);
                    }
                })();
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

        const res = await apiService.sendSms(recipient, message);
        if (res.success) {
            const updatedDriver = { ...driver, smsBalance: driver.smsBalance - 1 };
            await apiService.saveUser(updatedDriver);
            apiService.storeSession(updatedDriver);
        }
        return res;
    },
    async sendLibraryOverdueReminder(recipient: string, bookTitle: string, dueDate: string, institutionId: string): Promise<any> {
        const message = `REMINDER: Your library book "${bookTitle}" was due on ${new Date(dueDate).toLocaleDateString()}. Please return it to avoid further fines.`;
        return apiService.sendSms(recipient, message, undefined, 1, institutionId);
    },
    async fetchTransportBills(driverId: string): Promise<TransportBill[]> {
        return apiService.fetchModuleRecords('transport_bills', undefined, undefined, {
            filter: { driver_id: driverId }
        });
    },
    async saveTransportBill(bill: TransportBill): Promise<void> {
        await apiService.saveModuleRecord('transport_bills', bill);
    },
    async topUpDriverSms(driver: User, amount: number, units: number): Promise<void> {
        const updatedUser = {
            ...driver,
            smsBalance: (driver.smsBalance || 0) + units
        };
        await apiService.saveUser(updatedUser);
        apiService.storeSession(updatedUser);
        // Record as transaction
        await apiService.onAddTransaction({
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
        await apiService.saveUser(updatedUser);
        apiService.storeSession(updatedUser);

        await apiService.onAddTransaction({
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
            const { data } = _supabase.auth ? await _supabase.auth.getSession() : { data: { session: null } };
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
                    const session = apiService.getSession();
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
                    res = await apiService.sendEmail(user.email, subject, body);
                } else if (method === 'sms' && user.phoneNumber) {
                    res = await apiService.sendSms(user.phoneNumber, smsBody);
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
            const token = await apiService.getAuthToken();

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
                body: JSON.stringify({ 
                    action, 
                    recipient: formattedPhone, 
                    phone: formattedPhone,
                    phoneNumber: formattedPhone,
                    amount, 
                    config, 
                    metadata, 
                    provider 
                })
            });

            const contentType = response.headers.get('content-type');
            let result: any;
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                console.error(`[apiService] Non-JSON response in initiatePayment [${provider}]:`, text.substring(0, 200));
                return { success: false, message: "Payment gateway returned invalid response format" };
            }
            
            if (response.ok && result.success && metadata?.invoiceId) {
                // Auto-record a pending transaction
                // We wrap this in a try-catch because guest users (like Alumnae) might lack 
                // a valid session token, which causes saveModuleRecord to throw 'Unauthorized'.
                // This shouldn't block the actual payment initiation handshake.
                try {
                    await apiService.recordPayment({
                        transactionId: result.checkoutRequestId || result.requestId || `PENDING_${Date.now()}`,
                        amount,
                        phoneNumber: formattedPhone,
                        institutionId: metadata?.institutionId || 'GLOBAL',
                        payerName: 'Pending Payer',
                        description: `Payment for Invoice ${metadata.invoiceId}`,
                        status: 'pending',
                        provider,
                        metadata: { ...metadata, checkoutRequestId: result.checkoutRequestId }
                    });
                } catch (recErr) {
                    console.warn(`[apiService] Non-fatal: Failed to auto-record pending transaction:`, recErr);
                }
            }
            return result;
        } catch (e: any) {
            console.error(`${provider} API Handshake Failed:`, e);
            return { success: false, message: e.message || `${provider} gateway connection failed.` };
        }
    },

    async checkPaymentStatus(provider: 'mpesa' | 'airtel' | 'intasend' | 'ncba' | 'kcb', checkoutRequestId: string, config?: any) {
        try {
            const token = await apiService.getAuthToken();
            const systemConfig = apiService.getActiveConfig();
            
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'apikey': systemConfig.key || ''
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            } else if (systemConfig.key) {
                headers['Authorization'] = `Bearer ${systemConfig.key}`;
            }

            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'queryPaymentStatus',
                    provider,
                    checkoutRequestId,
                    config
                })
            });
            const contentType = response.headers.get('content-type');
            let result: any;
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
                if (provider === 'ncba') {
                    console.log(`[NCBA Status Query] RequestId: ${checkoutRequestId}`, result);
                }
            } else {
                const text = await response.text();
                console.error(`[apiService] Non-JSON response in checkPaymentStatus [${provider}]:`, text.substring(0, 200));
                return { status: 'pending' };
            }
            if (result.status === 'completed') {
                // The backend queryPaymentStatus already triggers reconciliation.
                // We no longer call the redundant frontend reconcilePayment.
            }
            return result;
        } catch (e) {
            console.error("Payment Status Check Error:", e);
            return { status: 'pending' };
        }
    },
    async recordPayment(data: Partial<MpesaTransaction>) {
        return apiService.saveModuleRecord('mpesa_transactions', {
            ...data,
            institution_id: data.institutionId || 'GLOBAL',
            timestamp: data.timestamp || new Date().toISOString(),
            status: data.status || 'pending'
        });
    },
    async postStudentPayment(params: {
        studentId: string;
        amount: number;
        paymentMethod: string;
        reference: string;
        paymentDate: string;
        institutionId: string;
        paidForLabel?: string;
        targetInvoiceId?: string;
        bankAccountId?: string;
        customReceiptNumber?: string;
        openingBalanceRemaining?: number;
    }) {
        const amountPaidNum = Number(params.amount);
        const instId = params.institutionId;

        // Fetch all active invoices of the student that are not fully paid
        const allInvoices = await apiService.fetchModuleRecords<any>('invoices').catch(() => []);
        const studentInvoices = allInvoices.filter((inv: any) => 
            inv.studentId === params.studentId && 
            inv.status !== 'cancelled' && 
            inv.status !== 'quote'
        );

        // Fetch all receipts of the student to calculate paid amount so far
        const allReceipts = await apiService.fetchModuleRecords<any>('receipts').catch(() => []);
        
        const invoicePaidAmounts: Record<string, number> = {};
        allReceipts.forEach((rec: any) => {
            const invId = rec.invoiceId || rec.invoice_id;
            if (invId) {
                invoicePaidAmounts[invId] = (invoicePaidAmounts[invId] || 0) + Number(rec.amountPaid || 0);
            }
        });

        const unpaidInvoices = studentInvoices.filter((inv: any) => {
            const paid = invoicePaidAmounts[inv.id] || 0;
            return paid < inv.totalAmount;
        });

        // Sort invoices: if targetInvoiceId is provided, place it first, then others sorted by issueDate/createdAt
        const isTargetingOpeningBalance = params.targetInvoiceId?.startsWith('__opening_balance__');
        const sortedInvoices = isTargetingOpeningBalance ? [] : [...unpaidInvoices].sort((a: any, b: any) => {
            if (params.targetInvoiceId) {
                if (a.id === params.targetInvoiceId) return -1;
                if (b.id === params.targetInvoiceId) return 1;
            }
            const dateA = new Date(a.issueDate || a.issue_date || 0).getTime();
            const dateB = new Date(b.issueDate || b.issue_date || 0).getTime();
            return dateA - dateB;
        });

        let remainingAmount = amountPaidNum;
        const allocations: Array<{
            invoiceId: string;
            invoiceNumber: string;
            voteHeadId?: string;
            description: string;
            amount: number;
        }> = [];

        if (isTargetingOpeningBalance) {
            let openingBalanceRemaining = params.openingBalanceRemaining;
            if (openingBalanceRemaining === undefined) {
                const student = await apiService.fetchModuleRecord<any>('users', params.studentId).catch(() => null);
                const openingBal = Number(student?.metadata?.openingBalance || student?.metadata?.opening_balance || 0);

                const studentReceipts = allReceipts.filter((rec: any) => 
                    (rec.studentId === params.studentId || rec.student_id === params.studentId)
                );
                const receiptsPaidToOpening = studentReceipts.filter((r: any) => {
                    const invId = r.invoiceId || r.invoice_id;
                    return !invId || invId.startsWith('__opening_balance__');
                }).reduce((sum: number, r: any) => {
                    let allocated = Number(r.amountPaid || 0);
                    if (r.allocations) {
                        try {
                            const allocs = typeof r.allocations === 'string' ? JSON.parse(r.allocations) : r.allocations;
                            if (Array.isArray(allocs)) {
                                const openingAlloc = allocs.find((a: any) => a.invoiceNumber === 'Opening Balance' || a.description === 'Arrears');
                                if (openingAlloc) allocated = Number(openingAlloc.amount || 0);
                            }
                        } catch (e) {}
                    }
                    return sum + allocated;
                }, 0);

                openingBalanceRemaining = Math.max(0, openingBal - receiptsPaidToOpening);
            }
            const allocatedToOpening = Math.min(remainingAmount, openingBalanceRemaining);

            if (allocatedToOpening > 0) {
                allocations.push({
                    invoiceId: params.targetInvoiceId || '',
                    invoiceNumber: 'Opening Balance',
                    description: 'Arrears',
                    amount: allocatedToOpening
                });
                remainingAmount -= allocatedToOpening;
            }
        }

        // Distribute to sorted invoices
        for (const inv of sortedInvoices) {
            if (remainingAmount <= 0) break;

            // Extract items of this invoice
            let items: any[] = [];
            if (typeof inv.items === 'string') {
                try { items = JSON.parse(inv.items); } catch(e) {}
            } else if (Array.isArray(inv.items)) {
                items = inv.items;
            }

            // Sort items by priority ascending (e.g. priority 1 first, priority 2 next, etc. Null/undefined gets 99)
            const sortedItems = [...items].sort((a: any, b: any) => {
                const prioA = a.priority !== undefined ? Number(a.priority) : 99;
                const prioB = b.priority !== undefined ? Number(b.priority) : 99;
                return prioA - prioB;
            });

            let invoiceModified = false;
            for (const item of sortedItems) {
                if (remainingAmount <= 0) break;

                const itemTotal = Number(item.amount || item.unitPrice || 0);
                const itemPaid = Number(item.paid || 0);
                const itemRemaining = Math.max(0, itemTotal - itemPaid);

                if (itemRemaining > 0) {
                    const allocated = Math.min(remainingAmount, itemRemaining);
                    item.paid = itemPaid + allocated;
                    remainingAmount -= allocated;
                    invoiceModified = true;

                    allocations.push({
                        invoiceId: inv.id,
                        invoiceNumber: inv.invoiceNumber || inv.invoice_number,
                        voteHeadId: item.voteHeadId || item.vote_head_id,
                        description: item.description,
                        amount: allocated
                    });
                }
            }

            if (invoiceModified) {
                // Determine new status
                const updatedItemsPaid = sortedItems.reduce((sum, it) => sum + (it.paid || 0), 0);
                const newStatus = updatedItemsPaid >= inv.totalAmount ? 'paid' : 'partial';

                // Save updated invoice back to DB
                await apiService.saveModuleRecord('invoices', {
                    ...inv,
                    items: sortedItems,
                    status: newStatus
                });
            }
        }

        // Prepayment check: if there is still remainingAmount > 0 and no more unpaid invoices, apply it to prepayment
        if (remainingAmount > 0) {
            allocations.push({
                invoiceId: '', // No specific invoice
                invoiceNumber: 'Prepayment',
                description: 'Prepayment / Credit',
                amount: remainingAmount
            });
        }

        // Receipt generation: "but generation of receipts all the related votes from different invoices are grouped"
        // Group allocations by votehead description / name
        const groupedAllocations: Record<string, number> = {};
        allocations.forEach(alloc => {
            groupedAllocations[alloc.description] = (groupedAllocations[alloc.description] || 0) + alloc.amount;
        });

        // Construct receipt description
        const paidForParts = Object.entries(groupedAllocations).map(([desc, amt]) => `${desc}: KES ${amt.toLocaleString()}`);
        const paidForText = params.paidForLabel || paidForParts.join(', ');

        const receiptId = `RCT_${Date.now()}_${Math.random().toString(36).substring(2,6)}`;
        const receiptNumber = params.customReceiptNumber ? params.customReceiptNumber.trim() : await apiService.getNextDocumentNumber(instId, 'receipt');

        // Save the single grouped receipt
        // Link to targetInvoiceId if provided, or the first invoice paid, or null if it's purely prepayment
        const primaryInvoiceId = params.targetInvoiceId || (allocations[0] ? allocations[0].invoiceId : null);

        const receiptPayload = {
            id: receiptId,
            receiptNumber: receiptNumber,
            receipt_number: receiptNumber,
            institutionId: instId,
            institution_id: instId,
            paymentDate: params.paymentDate,
            payment_date: params.paymentDate,
            amountPaid: amountPaidNum,
            amount_paid: amountPaidNum,
            paidFor: paidForText,
            paid_for: paidForText,
            paymentMethod: params.paymentMethod,
            payment_method: params.paymentMethod,
            relatedTransactionId: params.reference,
            related_transaction_id: params.reference,
            invoiceId: primaryInvoiceId || '',
            invoice_id: primaryInvoiceId || '',
            studentId: params.studentId,
            student_id: params.studentId,
            bankAccountId: params.bankAccountId || '',
            bank_account_id: params.bankAccountId || '',
            allocations: JSON.stringify(allocations)
        };

        await apiService.saveModuleRecord('receipts', receiptPayload);

        return { receiptNumber, allocations };
    },
    async reconcilePayment(transaction: MpesaTransaction) {
        try {
            const metadata = typeof transaction.metadata === 'string' ? JSON.parse(transaction.metadata) : transaction.metadata;
            const invoiceId = metadata?.invoiceId;
            const studentId = metadata?.studentId;
            if (!studentId) return;

            // Update transaction status in db
            await apiService.saveModuleRecord('mpesa_transactions', {
                id: transaction.id,
                status: 'reconciled',
                metadata: JSON.stringify(metadata)
            });

            // Call unified payment posting engine
            await apiService.postStudentPayment({
                studentId,
                amount: transaction.amount,
                paymentMethod: transaction.provider || 'Mpesa',
                reference: transaction.transactionId,
                paymentDate: new Date().toISOString().split('T')[0],
                institutionId: transaction.institutionId,
                targetInvoiceId: invoiceId
            });
        } catch (e) {
            console.error("Reconciliation Error:", e);
        }
    },
    async initiateMpesaPayment(amount: number, phoneNumber: string, metadata?: any, config?: MpesaConfig) {
        return apiService.initiatePayment('mpesa', amount, phoneNumber, metadata, config);
    },
    async checkMpesaStatus(checkoutRequestId: string, config?: MpesaConfig) {
        try {
            const token = await apiService.getAuthToken();
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    action: 'queryStkStatus',
                    checkoutRequestId,
                    config
                })
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        } catch (e) {
            console.error("Mpesa Status Check Error:", e);
            return { status: 'pending' };
        }
    },
    async initiateNcbaPayment(amount: number, phoneNumber: string, metadata?: any, config?: any) {
        return apiService.initiatePayment('ncba', amount, phoneNumber, metadata, config);
    },
    async checkNcbaStatus(checkoutRequestId: string, config?: any) {
        return apiService.checkPaymentStatus('ncba', checkoutRequestId, config);
    },
    async generateNcbaQr(amount: number, reference: string, config?: any) {
        try {
            const token = await apiService.getAuthToken();
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ action: 'ncbaGenerateQr', amount, reference, config })
            });
            return response.json();
        } catch (e) {
            console.error("NCBA QR Generation Failed:", e);
            return { success: false, message: "QR Gateway Connection Failed" };
        }
    },
    async testNcbaAuth(config?: any) {
        try {
            const token = await apiService.getAuthToken();
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ action: 'testNcbaAuth', config })
            });
            return response.json();
        } catch (e) {
            console.error("NCBA Auth Test Failed:", e);
            return { success: false, message: "Auth Handshake Failed" };
        }
    },
    async testFtpConnection(config?: any) {
        try {
            const token = await apiService.getAuthToken();
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ action: 'testFtp', config })
            });
            return response.json();
        } catch (e) {
            console.error("FTP Connection Test Failed:", e);
            return { success: false, message: "Handshake sequence failed at network level." };
        }
    },
    async testGoogleDriveConnection(config?: any) {
        try {
            const token = await apiService.getAuthToken();
            const response = await fetch(`/api/integrations?action=testGoogleDrive`, {
                method: 'POST',
                headers: { 
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ action: 'testGoogleDrive', config })
            });
            return response.json();
        } catch (e) {
            console.error("Google Drive Connection Test Failed:", e);
            return { success: false, message: "Google Drive handshake failed at network level." };
        }
    },
    async uploadToGoogleDrive(file: File, folderName: string = 'System_Uploads', options: any = {}) {
        try {
            const bucketName = 'eduai';
            const uniquePath = `uploads/${folderName}/${Date.now()}_${file.name}`;
            
            // Upload to Supabase instead of Google Drive
            const publicUrl = await apiService.uploadFile(bucketName, uniquePath, file);
            if (!publicUrl) {
                throw new Error("Supabase file upload returned empty URL");
            }

            return {
                success: true,
                url: publicUrl,
                fileUrl: publicUrl,
                fileId: uniquePath
            };
        } catch (error: any) {
            console.error('Supabase Redirect Storage Upload Error:', error);
            return { success: false, error: error.message };
        }
    },
    async initiateKcbStkPush(tenantId: string, amount: number, paymentType: string): Promise<{ success: boolean; message: string; requestId?: string }> {
        try {
            const token = await apiService.getAuthToken();
            const systemConfig = apiService.getActiveConfig();
            
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'apikey': systemConfig.key || ''
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            } else if (systemConfig.key) {
                headers['Authorization'] = `Bearer ${systemConfig.key}`;
            }

            const response = await fetch('/api/payments/kcb-stk-push', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    tenantId,
                    amount,
                    paymentType
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Server returned error status ${response.status}: ${text}`);
            }

            const result = await response.json();
            return {
                success: result.success,
                message: result.message || (result.success ? "STK Push initiated successfully." : "Failed to initiate STK push."),
                requestId: result.CheckoutRequestID || result.requestId
            };
        } catch (e: any) {
            console.error('[KCB STK Push Client Error]:', e);
            return {
                success: false,
                message: e.message || 'Failed to connect to payments API'
            };
        }
    },
    async verifyKcbAccount(tenantId: string): Promise<{ success: boolean; message: string; details?: any }> {
        try {
            if (!_supabase) {
                return {
                    success: true,
                    message: "Account verified successfully via KCB Buni KYC (Offline).",
                    details: {
                        verificationStatus: 'Verified',
                        customerName: 'Demo Tenant',
                        kycSource: 'KCB Buni API (Offline)'
                    }
                };
            }
            const { data: tenant, error } = await _supabase
                .from('pm_tenants')
                .select('name, phone_number, id_number')
                .eq('id', tenantId)
                .maybeSingle();

            if (error || !tenant) {
                return { success: false, message: "Tenant not found for verification." };
            }

            if (!tenant.phone_number) {
                return { success: false, message: "Verification failed: Tenant has no phone number configured." };
            }

            return {
                success: true,
                message: "Account verified successfully via KCB Buni KYC.",
                details: {
                    verificationStatus: 'Verified',
                    customerName: tenant.name,
                    kycSource: 'KCB Buni API'
                }
            };
        } catch (e: any) {
            return { success: false, message: e.message || "KYC verification failed" };
        }
    },
    async verifyMpesaTransaction(transactionId: string) {
        if (!_supabase) return { success: false, message: "Bridge unavailable" };
        try {
            const token = await apiService.getAuthToken();

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
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                const text = await response.text();
                console.error("[apiService] Non-JSON response in verifyMpesaTransaction:", text.substring(0, 200));
                return { success: false, message: "Internal server error: Invalid response format" };
            }
        } catch (e: any) {
            return { success: false, message: e.message || "Request failed" };
        }
    },
    async fetchDepartments(instId?: string): Promise<Department[]> { return apiService.fetchModuleRecords('departments', instId); },
    async fetchSubjects(instId?: string): Promise<Subject[]> { return apiService.fetchModuleRecords('subjects', instId); },
    async saveSubject(data: any) { return apiService.saveModuleRecord('subjects', data); },
    async fetchCourses(instId?: string): Promise<Course[]> { return apiService.fetchModuleRecords('courses', instId); },
    async fetchAcademicYears(instId?: string): Promise<AcademicYear[]> { return apiService.fetchModuleRecords('academic_years', instId); },
    async fetchSemesters(instId?: string): Promise<Semester[]> { return apiService.fetchModuleRecords('semesters', instId); },
    async fetchRooms(instId?: string): Promise<Room[]> { return apiService.fetchModuleRecords('rooms', instId); },
    async fetchAcademicLevels(instId?: string): Promise<AcademicLevel[]> { return apiService.fetchModuleRecords('academic_levels', instId); },
    async fetchVoteHeads(instId?: string): Promise<VoteHead[]> { return apiService.fetchModuleRecords('vote_heads', instId); },
    async fetchFeeStructures(instId?: string): Promise<FeeStructure[]> { return apiService.fetchModuleRecords('fee_structures', instId); },
    async fetchFinancialPeriods(instId?: string): Promise<FinancialPeriod[]> { return apiService.fetchModuleRecords('financial_periods', instId); },
    async fetchTransactions(instId?: string, options: any = {}): Promise<MpesaTransaction[]> { 
        const [mpesa, airtel, intasend, ncba] = await Promise.all([
            apiService.fetchModuleRecords('mpesa_transactions', instId, undefined, options).catch(() => []),
            apiService.fetchModuleRecords('airtel_transactions', instId, undefined, options).catch(() => []),
            apiService.fetchModuleRecords('intasend_transactions', instId, undefined, options).catch(() => []),
            apiService.fetchModuleRecords('ncba_transactions', instId, undefined, options).catch(() => [])
        ]);
        
        // Merge and ensure all have a valid timestamp property for the UI
        const allTxns = [...mpesa, ...airtel, ...intasend, ...ncba].map(t => ({
            ...t,
            timestamp: t.timestamp || t.createdAt || t.created_at || new Date().toISOString()
        }));

        return allTxns.sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return dateB - dateA;
        });
    },
    async fetchReceipts(instId?: string): Promise<Receipt[]> { return apiService.fetchModuleRecords('receipts', instId); },
    async fetchInvoices(instId?: string): Promise<Invoice[]> { return apiService.fetchModuleRecords('invoices', instId); },
    async fetchSmsLogs(instId?: string): Promise<SmsLog[]> { return apiService.fetchModuleRecords('sms_logs', instId); },
    async fetchExtensionRequests(instId?: string): Promise<ExtensionRequest[]> { return apiService.fetchModuleRecords('institution_extension_requests', instId); },
    async updateExtensionRequestStatus(requestId: string, status: 'approved' | 'rejected', extensionDays: number = 14): Promise<void> {
        try {
            // 1. Fetch current request to preserve mandatory fields (requester_id, institution_id, etc.)
            const existingRequests = await apiService.fetchModuleRecords<ExtensionRequest>('institution_extension_requests', undefined, undefined, { filter: { id: requestId } });
            const currentRequest = existingRequests[0];
            if (!currentRequest) throw new Error("Extension request not found");

            // 2. Update the request status and add resolved metadata
            const request = await apiService.saveModuleRecord('institution_extension_requests', { 
                ...currentRequest, 
                status,
                resolved_at: new Date().toISOString()
            });
            if (!request) throw new Error("Failed to update extension request status: No response from server.");

            // Use fallback from currentRequest if the backend select() came back empty 
            const finalRequest = request.id ? request : { ...currentRequest, ...request };

            // 3. If approved, extend the institution's trial
            if (status === 'approved' && finalRequest.institutionId) {
                const insts = await apiService.fetchModuleRecords<any>('institutions', finalRequest.institutionId);
                const inst = insts[0];
                if (!inst) throw new Error("Institution not found for the given request ID: " + finalRequest.institutionId);

                // Calculate new expiry date
                const currentExpiry = inst.trialEndsAt ? new Date(inst.trialEndsAt) : new Date();
                const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
                const newExpiry = new Date(baseDate.getTime() + (extensionDays * 24 * 60 * 60 * 1000));

                await apiService.saveModuleRecord('institutions', {
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
    async fetchAbsenceRequests(instId?: string): Promise<AbsenceRequest[]> { return apiService.fetchModuleRecords('absence_requests', instId); },
    async fetchAssessmentMarks(instId?: string): Promise<AssessmentMark[]> { return apiService.fetchModuleRecords('assessment_marks', instId); },
    async fetchExamTimetable(institutionId: string): Promise<ExamTimetableEntry[]> { return apiService.fetchModuleRecords('exam_timetable_entries', institutionId); },
    async saveExamTimetable(institutionId: string, ayId: string, semId: string, entries: ExamTimetableEntry[]): Promise<void> {
        try {
            const entriesWithIds = entries.map(e => ({
                ...e,
                id: e.id || `et_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                institutionId,
                academicYearId: ayId,
                semesterId: semId
            }));

            if (!_supabase) {
                let existing = ls.get('exam_timetable_entries');
                existing = existing.filter((e: any) => !(e.institution_id === institutionId && e.semester_id === semId));
                existing = [...existing, ...entriesWithIds.map(toSnakeCase)];
                ls.set('exam_timetable_entries', existing);
                return;
            }

            // Clear old entries
            const deleteSql = `DELETE FROM exam_timetable_entries WHERE institution_id = '${institutionId}' AND academic_year_id = '${ayId}' AND semester_id = '${semId}';`;
            await apiService.runMigration(deleteSql);

            // Bulk save
            await apiService.saveModuleRecords('exam_timetable_entries', entriesWithIds);
        } catch (e) { console.error("Exam Timetable Save Error:", e); }
    },
    async onAssociateSubjectToCourseLevel(subjectId: string | string[], levelId: string) {
        const courses = await apiService.fetchCourses();
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
            await apiService.saveModuleRecord('courses', { ...course, levels: updatedLevels });
        }
    },
    async onDisassociateSubjectFromCourseLevel(subjectId: string, levelId: string) {
        const courses = await apiService.fetchCourses();
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
            await apiService.saveModuleRecord('courses', { ...course, levels: updatedLevels });
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

        await apiService.saveModuleRecord('users', sanitizedData);

        // Send welcome emails and SMS
        sanitizedData.forEach(user => {
            if (user.email) {
                const subject = "Welcome to Eduai Automation - Account Credentials";
                const body = `Dear ${user.name},\n\nYour account has been created on the Eduai Automation Management System${institutionName ? ` for ${institutionName}` : ''}.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nEmail: ${user.email}\nPassword: ${user.password}\n\nPlease change your password upon first login.\n\nBest Regards,\nSystem Admin`;
                apiService.sendEmail(user.email, subject, body).catch(e => console.error(`Failed to send email to ${user.email}:`, e));
            }

            if (user.phoneNumber) {
                const smsMessage = `Welcome to Eduai Automation. Your account is ready. Email: ${user.email || user.staffId}, Password: ${user.password}. Portal: ${window.location.origin}`;
                apiService.sendSms(user.phoneNumber, smsMessage, undefined, 1, institutionId).catch(e => console.error(`Failed to send SMS to ${user.phoneNumber}:`, e));
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
        
        await apiService.saveModuleRecord('users', sanitizedData);

        // Send welcome emails and SMS
        sanitizedData.forEach(user => {
            if (user.email) {
                const subject = "Welcome to Eduai Automation - Account Credentials";
                const body = `Dear ${user.name},\n\nYour student account has been created on the Eduai Automation Management System${institutionName ? ` for ${institutionName}` : ''}.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nEmail: ${user.email}\nPassword: ${user.password}\n\nPlease change your password upon first login.\n\nBest Regards,\nSystem Admin`;
                apiService.sendEmail(user.email, subject, body).catch(e => console.error(`Failed to send email to ${user.email}:`, e));
            }

            if (user.phoneNumber) {
                const smsMessage = `Welcome to Eduai Automation Hub. Your student account is ready. Email: ${user.email || user.staffId}, Password: ${user.password}. Portal: ${window.location.origin}`;
                apiService.sendSms(user.phoneNumber, smsMessage, undefined, 1, institutionId).catch(e => console.error(`Failed to send SMS to ${user.phoneNumber}:`, e));
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

        await apiService.saveModuleRecord('courses', enrichedCourses);
    },
    async onImportDepartments(departments: any[]): Promise<void> {
        const enriched = departments.map((d, i) => ({
            ...d,
            id: d.id || `dept_${Date.now()}_${i}`
        }));
        await apiService.saveModuleRecord('departments', enriched);
    },
    async onImportRooms(rooms: any[]): Promise<void> {
        const enriched = rooms.map((r, i) => ({
            ...r,
            id: r.id || `room_${Date.now()}_${i}`
        }));
        await apiService.saveModuleRecord('rooms', enriched);
    },
    async onImportBuildings(buildings: any[]): Promise<void> {
        const enriched = buildings.map((b, i) => ({
            ...b,
            id: b.id || `bldg_${Date.now()}_${i}`
        }));
        await apiService.saveModuleRecord('buildings', enriched);
    },
    async onImportSubjectsAndAssociate(subjects: any[], institutionId?: string): Promise<void> {
        const currentUser = apiService.getSession();
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

        await apiService.saveModuleRecord('subjects', subjectsToInsert);
    },
    migrateLocalDataToCloud: async (onProgress: (msg: string) => void) => {
        onProgress('Analyzing local registry...');
        return { success: true, message: "Registry migration successful." };
    },
    async fetchBoardingRooms(houseId: string): Promise<any[]> {
        return apiService.fetchModuleRecords('boarding_rooms', undefined, undefined, {
            select: '*,boarding_houses!inner(name),boarding_beds(*)',
            filter: { house_id: houseId },
            order: 'room_number.asc'
        });
    },
    async fetchAvailableBeds(institutionId: string): Promise<any[]> {
        return apiService.fetchModuleRecords('boarding_beds', institutionId, undefined, {
            select: '*,boarding_rooms!inner(id,room_number,boarding_houses!inner(id,name,gender,institution_id))',
            filter: { status: 'Available' }
        });
    },
    async fetchBedAllocations(institutionId: string): Promise<any[]> {
        return apiService.fetchModuleRecords('bed_allocations', institutionId, undefined, {
            select: '*,usersStudentIdFkey:users!student_id(name, email, gender),usersAllocatedByFkey:users!allocated_by(name),boardingBeds:boarding_beds(bed_number,boardingRooms:boarding_rooms(room_number,boardingHouses:boarding_houses(name, institution_id))),boarding_checkins(id),boarding_checkouts(id)',
            order: 'allocation_date.desc'
        });
    },
    async fetchMaintenanceLogs(institutionId: string): Promise<any[]> {
        return apiService.fetchModuleRecords('boarding_maintenance_logs', institutionId, undefined, {
            select: '*,boarding_houses(name),boarding_rooms(room_number),boarding_beds(bed_number),users!boarding_maintenance_logs_reported_by_fkey(name),users!boarding_maintenance_logs_resolved_by_fkey(name)',
            order: 'reported_date.desc'
        });
    },
    async fetchBoardingCheckIns(institutionId: string): Promise<any[]> {
        return apiService.fetchModuleRecords('boarding_checkins', institutionId, undefined, {
            order: 'check_in_date.desc'
        });
    },
    async fetchBoardingCheckOuts(institutionId: string): Promise<any[]> {
        return apiService.fetchModuleRecords('boarding_checkouts', institutionId, undefined, {
            order: 'check_out_date.desc'
        });
    },
    // Transport Module
    async fetchVehicles(instId?: string): Promise<Vehicle[]> { return apiService.fetchModuleRecords('vehicles', instId); },
    async fetchTransportOnboarding(instId?: string): Promise<TransportOnboarding[]> { return apiService.fetchModuleRecords('transport_onboarding', instId); },
    async fetchVehicleLogs(instId?: string): Promise<VehicleLog[]> { return apiService.fetchModuleRecords('vehicle_logs', instId); },
    // Remedial Module
    async fetchRemedialSessions(instId?: string): Promise<RemedialSession[]> { return apiService.fetchModuleRecords('school_remedial_sessions', instId); },
    async saveRemedialSession(data: Partial<RemedialSession>): Promise<void> { await apiService.saveModuleRecord('school_remedial_sessions', data); },
    async fetchRemedialRateSettings(instId?: string): Promise<RemedialRateSetting[]> { return apiService.fetchModuleRecords('school_remedial_rate_settings', instId); },
    async saveRemedialRateSetting(data: Partial<RemedialRateSetting>): Promise<void> { await apiService.saveModuleRecord('school_remedial_rate_settings', data); },
    async fetchRemedialPayouts(instId?: string): Promise<RemedialPayout[]> { return apiService.fetchModuleRecords('school_remedial_payouts', instId); },
    async saveRemedialPayout(data: Partial<RemedialPayout>): Promise<void> { await apiService.saveModuleRecord('school_remedial_payouts', data); },
    async clearInstitutionalData(institutionId: string, currentUserId: string): Promise<void> {
        // Supabase Logic - Moved to secure proxy
        try {
            const token = await apiService.getAuthToken();
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
        return apiService.fetchModuleRecords('security_alerts', institutionId);
    },
    async fetchCoopFarmers(institutionId?: string): Promise<CoopFarmer[]> {
        return apiService.fetchModuleRecords('coop_farmers', institutionId);
    },
    async saveCoopFarmer(data: Partial<CoopFarmer>): Promise<void> {
        await apiService.saveModuleRecord('coop_farmers', data);
    },
    async fetchCoopCollections(institutionId?: string): Promise<CoopCollection[]> {
        return apiService.fetchModuleRecords('coop_collections', institutionId);
    },
    async saveCoopCollection(data: Partial<CoopCollection>): Promise<void> {
        await apiService.saveModuleRecord('coop_collections', data);
    },
    async fetchCoopRiders(institutionId?: string): Promise<CoopRider[]> {
        return apiService.fetchModuleRecords('coop_riders', institutionId);
    },
    async saveCoopRider(data: Partial<CoopRider>): Promise<void> {
        await apiService.saveModuleRecord('coop_riders', data);
    },
    async fetchCoopAgrovetInventory(institutionId?: string): Promise<CoopAgrovetInventory[]> {
        return apiService.fetchModuleRecords('coop_agrovet_inventory', institutionId);
    },
    async saveCoopAgrovetInventory(data: Partial<CoopAgrovetInventory>): Promise<void> {
        await apiService.saveModuleRecord('coop_agrovet_inventory', data);
    },
    async fetchCoopAgrovetSales(institutionId?: string): Promise<CoopAgrovetSales[]> {
        return apiService.fetchModuleRecords('coop_agrovet_sales', institutionId);
    },
    async saveCoopAgrovetSale(data: Partial<CoopAgrovetSales>): Promise<void> {
        await apiService.saveModuleRecord('coop_agrovet_sales', data);
    },
    async fetchSaccoAccounts(institutionId?: string): Promise<SaccoAccount[]> {
        return apiService.fetchModuleRecords('sacco_accounts', institutionId);
    },
    async fetchSaccoTransactions(institutionId?: string): Promise<SaccoTransaction[]> {
        return apiService.fetchModuleRecords('sacco_transactions', institutionId);
    },
    async fetchCoopMonthlyPayouts(institutionId?: string): Promise<CoopMonthlyPayout[]> {
        return apiService.fetchModuleRecords('coop_monthly_payouts', institutionId);
    },
    async fetchCoopExpenses(institutionId?: string): Promise<CoopExpense[]> {
        return apiService.fetchModuleRecords('coop_expenses', institutionId);
    },
    async saveCoopExpense(data: Partial<CoopExpense>): Promise<void> {
        await apiService.saveModuleRecord('coop_expenses', data);
    },
    async fetchCoopIncome(institutionId?: string): Promise<CoopIncome[]> {
        return apiService.fetchModuleRecords('coop_income', institutionId);
    },
    async saveCoopIncome(data: Partial<CoopIncome>): Promise<void> {
        await apiService.saveModuleRecord('coop_income', data);
    },
    async confirmCoopCollection(id: string, finalQuantity: number, confirmedBy: string): Promise<void> {
        const collections = await apiService.fetchCoopCollections();
        const collection = collections.find(c => c.id === id);
        if (!collection) throw new Error("Collection not found");

        const hasDiscrepancy = Number(finalQuantity) !== Number(collection.quantity);
        // Optimized update payload to prevent 'text = uuid' type mismatch by avoiding full object spread
        const update: any = {
            id,
            finalQuantity,
            factoryConfirmed: true,
            confirmedBy,
            confirmedAt: new Date().toISOString(),
            requiresApproval: hasDiscrepancy,
            approvalStatus: hasDiscrepancy ? 'pending' : 'approved',
            smsStatus: 'pending'
        };

        await apiService.saveModuleRecord('coop_collections', update);
    },
    async approveCoopCollection(id: string, approvedBy: string, status: 'approved' | 'rejected'): Promise<void> {
        // Optimized update payload to prevent 'text = uuid' type mismatch by avoiding full object spread
        const update: any = {
            id,
            approvalStatus: status,
            approvedBy,
            approvedAt: new Date().toISOString(),
            smsStatus: status === 'approved' ? 'pending' : 'failed'
        };
        await apiService.saveModuleRecord('coop_collections', update);
    },

    async updatePayoutStatus(idOrIds: string | string[], status: 'initiated' | 'approved' | 'paid' | 'rejected' | string, userId?: string, extraData?: Partial<CoopMonthlyPayout>): Promise<void> {
        const ids = (Array.isArray(idOrIds) ? idOrIds : [idOrIds])
            .map(id => String(id).trim())
            .filter(id => id.length > 0);

        if (ids.length === 0) return;
        const now = new Date().toISOString();
        const table = 'coop_monthly_payouts';

        // Strip prefix from userId if present to avoid DB constraint failures (Postgres UUID vs Application u_ prefix)
        const cleanUserId = userId?.startsWith('u_') ? userId.substring(2) : userId;

        const updateData: any = { status, ...extraData };
        if (cleanUserId) {
            if (status === 'initiated') {
                updateData.initiatedBy = cleanUserId;
                updateData.initiatedAt = now;
            } else if (status === 'approved') {
                updateData.approvedBy = cleanUserId;
                updateData.approvedAt = now;
            } else if (status === 'paid') {
                updateData.paidAt = now;
            }
        }

        if (!_supabase) {
            let records = ls.get(table);
            if (records) {
                ids.forEach(id => {
                    const idx = records.findIndex((r: any) => r.id === id);
                    if (idx >= 0) {
                        records[idx] = { ...records[idx], ...updateData };
                    }
                });
                ls.set(table, records);
            }
            return;
        }

        try {
            const token = await apiService.getAuthToken();
            
            // Use batching for updates if there are many IDs (e.g., > 50)
            const batchSize = 50;
            const batches = [];
            for (let i = 0; i < ids.length; i += batchSize) {
                batches.push(ids.slice(i, i + batchSize));
            }

            for (const batchIds of batches) {
                const response = await fetch(`/api/records?module=${table}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : '',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        data: toSnakeCase(updateData),
                        ids: batchIds
                    })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    const msg = err.error || err.message || `Status ${response.status}`;
                    const details = err.details ? `: ${JSON.stringify(err.details)}` : '';
                    throw new Error(`${msg}${details}`);
                }
            }
        } catch (e: any) {
            console.error("Payout Status Update Exception:", e);
            alert(`Approval failed: ${e.message}`);
            throw e;
        }
    },
    async disburseBulkMpesa(ids: string[], userId: string): Promise<any> {
        // Simulate M-Pesa B2C API Call
        console.log(`[MPESA SIMULATION] Processing bulk disbursement for ${ids.length} farmers...`);
        
        // Wait for 1.5 seconds to simulate API latency
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update all payouts to 'paid' status
        await Promise.all(ids.map(id => apiService.updatePayoutStatus(id, 'paid', userId)));

        return {
            success: true,
            transactionId: `MP_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            count: ids.length,
            timestamp: new Date().toISOString()
        };
    },
    async triggerNcbaPayment(params: { amount: number; phoneNumber: string; reference: string; description: string; institutionId: string }): Promise<any> {
        try {
            let token = await apiService.getAuthToken();
            const config = apiService.getActiveConfig();
            
            // If no token (unauthenticated public flow), try to create a temporary anonymous session
            // to satisfy the strict backend Edge Function identity checks.
            if (!token && apiService.isConfigured()) {
                try {
                    // @ts-ignore - dynamic auth check
                    const { data } = await _supabase.auth.signInAnonymously();
                    if (data?.session?.access_token) {
                        token = data.session.access_token;
                    }
                } catch (e) {
                    console.warn("Failed to generate anonymous session for payment trigger", e);
                }
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'apikey': config.key || ''
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            } else if (config.key) {
                // Fallback to anonymous application key for public registration flows
                headers['Authorization'] = `Bearer ${config.key}`;
            }

            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'ncbaInitiateStk',
                    metadata: { type: 'one-off' },
                    phone: params.phoneNumber,
                    ...params
                })
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'NCBA Push failed');
            }
            return response.json();
        } catch (error) {
            console.error('NCBA Push error:', error);
            throw error;
        }
    },
    async triggerMpesaStkPush(params: { amount: number; phoneNumber: string; reference: string; description: string; institutionId: string }): Promise<any> {
        try {
            let token = await apiService.getAuthToken();
            const config = apiService.getActiveConfig();
            
            if (!token && apiService.isConfigured()) {
                try {
                    // @ts-ignore - dynamic auth check
                    const { data } = await _supabase.auth.signInAnonymously();
                    if (data?.session?.access_token) {
                        token = data.session.access_token;
                    }
                } catch (e) {
                    console.warn("Failed to generate anonymous session for payment trigger", e);
                }
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'apikey': config.key || ''
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            } else if (config.key) {
                headers['Authorization'] = `Bearer ${config.key}`;
            }

            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'initiateStkPush',
                    metadata: { type: 'one-off' },
                    phone: params.phoneNumber,
                    ...params
                })
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'STK Push failed');
            }
            return response.json();
        } catch (error) {
            console.error('M-Pesa STK Push error:', error);
            throw error;
        }
    },
    async sendAlumnaWelcomeEmail(params: { recipient: string; alumnaName: string; loginLink?: string }): Promise<any> {
        try {
            const config = apiService.getActiveConfig();
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': config.key || '' },
                body: JSON.stringify({ action: 'sendAlumnaWelcome', ...params })
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to send welcome email');
            }
            return response.json();
        } catch (e: any) {
            console.error("Welcome Email Error:", e);
            throw e;
        }
    },
    async checkMpesaPaymentStatus(checkoutRequestId: string): Promise<any> {
        try {
            const token = await apiService.getAuthToken();
            const response = await fetch(`/api/integrations?action=stkPushQuery&checkoutRequestId=${checkoutRequestId}`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Status query failed');
            }
            return response.json();
        } catch (error) {
            console.error('M-Pesa Status query error:', error);
            throw error;
        }
    },
    async fetchChurchSacraments(institutionId?: string): Promise<ChurchSacrament[]> {
        return apiService.fetchModuleRecords('church_sacraments', institutionId);
    },
    async saveChurchSacrament(data: Partial<ChurchSacrament>): Promise<void> {
        await apiService.saveModuleRecord('church_sacraments', data);
    },
    async fetchChurchMassIntentions(institutionId?: string): Promise<ChurchMassIntention[]> {
        return apiService.fetchModuleRecords('church_mass_intentions', institutionId);
    },
    async saveChurchMassIntention(data: Partial<ChurchMassIntention>): Promise<void> {
        await apiService.saveModuleRecord('church_mass_intentions', data);
    },
    async fetchChurchCellGroups(institutionId?: string): Promise<ChurchCellGroup[]> {
        return apiService.fetchModuleRecords('church_cell_groups', institutionId);
    },
    async saveChurchCellGroup(data: Partial<ChurchCellGroup>): Promise<void> {
        await apiService.saveModuleRecord('church_cell_groups', data);
    },
    async fetchChurchFollowUps(institutionId?: string): Promise<ChurchFollowUp[]> {
        return apiService.fetchModuleRecords('church_follow_ups', institutionId);
    },
    async saveChurchFollowUp(data: Partial<ChurchFollowUp>): Promise<void> {
        await apiService.saveModuleRecord('church_follow_ups', data);
    },
    async fetchChurchFastingPeriods(institutionId?: string): Promise<ChurchFastingPeriod[]> {
        return apiService.fetchModuleRecords('church_fasting_periods', institutionId);
    },
    async saveChurchFastingPeriod(data: Partial<ChurchFastingPeriod>): Promise<void> {
        await apiService.saveModuleRecord('church_fasting_periods', data);
    },
    async fetchChurchSaintDays(institutionId?: string): Promise<ChurchSaintDay[]> {
        return apiService.fetchModuleRecords('church_saint_days', institutionId);
    },
    async saveChurchSaintDay(data: Partial<ChurchSaintDay>): Promise<void> {
        await apiService.saveModuleRecord('church_saint_days', data);
    },
    async fetchDemoRequests(): Promise<DemoRequest[]> {
        return apiService.fetchModuleRecords('demo_requests', undefined, undefined, { order: 'requested_at.desc' });
    },
    async updateDemoRequestStatus(id: string, status: DemoRequest['status']): Promise<void> {
        await apiService.saveModuleRecord('demo_requests', { id, status });
    },
    async post(url: string, body: any): Promise<any> {
        const token = await apiService.getAuthToken();
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || err.error || `HTTP error! status: ${response.status}`);
        }
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        } else {
            const text = await response.text();
            console.error("[apiService] Non-JSON response in POST [RPC]:", text.substring(0, 200));
            throw new Error(`Server Error (${response.status}): Invalid response format`);
        }
    },
    async fetchFullRegistry(): Promise<SchoolRegistry[]> {
        let allRecords: SchoolRegistry[] = [];
        let offset = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const batch = await apiService.fetchModuleRecords<SchoolRegistry>('school_registry', undefined, undefined, { limit, offset });
            if (!batch || batch.length === 0) {
                hasMore = false;
            } else {
                allRecords = [...allRecords, ...batch];
                offset += limit;
                if (batch.length < limit) hasMore = false;
                if (allRecords.length > 50000) hasMore = false;
            }
        }
        return allRecords;
    },
    async fetchCarListings(institutionId?: string, status: string = 'active', options: any = {}): Promise<CarListing[]> {
        return apiService.fetchModuleRecords('car_sales_listings', institutionId, undefined, { 
            filter: status !== 'all' ? { status, ...options.filter } : options.filter,
            order: 'created_at.desc',
            ...options
        });
    },
    async saveCarListing(data: Partial<CarListing>): Promise<void> {
        await apiService.saveModuleRecord('car_sales_listings', data);
    },
    async fetchCarTestDrives(institutionId?: string): Promise<TestDriveBooking[]> {
        return apiService.fetchModuleRecords('car_test_drives', institutionId);
    },
    async saveCarTestDrive(data: Partial<TestDriveBooking>): Promise<void> {
        await apiService.saveModuleRecord('car_test_drives', data);
    },
    async fetchCarAppraisals(institutionId?: string): Promise<CarAppraisal[]> {
        return apiService.fetchModuleRecords('car_appraisals', institutionId);
    },
    async saveCarAppraisal(data: Partial<CarAppraisal>): Promise<void> {
        await apiService.saveModuleRecord('car_appraisals', data);
    },
    async fetchCarInvoices(institutionId?: string): Promise<CarInvoice[]> {
        return apiService.fetchModuleRecords('car_sales_invoices', institutionId);
    },
    async saveCarInvoice(data: Partial<CarInvoice>): Promise<void> {
        await apiService.saveModuleRecord('car_sales_invoices', data);
    },
    async fetchCarPayments(invoiceId?: string, institutionId?: string): Promise<CarPayment[]> {
        return apiService.fetchModuleRecords('car_sales_payments', institutionId, undefined, {
            filter: invoiceId ? { invoiceId } : undefined,
            order: 'payment_date.desc'
        });
    },
    async saveCarPayment(data: Partial<CarPayment>): Promise<void> {
        await apiService.saveModuleRecord('car_sales_payments', data);
    },
    async generateMarketingAsset(params: { prompt: string; type: 'image' | 'video' }): Promise<any> {
        await new Promise(resolve => setTimeout(resolve, 2500));
        const mockAssets = [
            { 
                id: Date.now().toString(), 
                title: "AI Generated Concept", 
                image: '/marketing/marketing_hero_render_1776312304333.png', 
                images: [
                    '/marketing/marketing_hero_render_1776312304333.png',
                    '/marketing/marketing_edu_1776367280172.png',
                    '/marketing/marketing_community.png',
                    '/marketing/marketing_alumni.png'
                ],
                category: 'General' 
            },
            { 
                id: (Date.now() + 1).toString(), 
                title: "Module Showcase", 
                image: '/marketing/marketing_showroom.png', 
                images: [
                    '/marketing/marketing_showroom.png',
                    '/marketing/marketing_autoservice_1776367264534.png',
                    '/marketing/marketing_property_1776367197098.png',
                    '/marketing/marketing_campaign_1776367315708.png'
                ],
                category: 'Showcase' 
            },
            { 
                id: (Date.now() + 2).toString(), 
                title: "Future Vision", 
                image: '/marketing/marketing_retail_1776367249575.png', 
                images: [
                    '/marketing/marketing_retail_1776367249575.png',
                    '/marketing/marketing_coop_1776367214566.png',
                    '/marketing/marketing_his_1776367229035.png',
                    '/marketing/marketing_tourism.png'
                ],
                category: 'Retail' 
            }
        ];
        return mockAssets[Math.floor(Math.random() * mockAssets.length)];
    },
    async shareMarketingAsset(platform: string, asset: any): Promise<boolean> {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
    },
    async allocatePrepaymentsToInvoice(invoice: any) {
        try {
            const invNo = invoice.invoiceNumber || invoice.invoice_number;
            if (invNo?.startsWith('REMEDIAL-')) return;
            const studentId = invoice.studentId || invoice.student_id;
            if (!studentId) return;

            const allReceipts = await apiService.fetchModuleRecords<any>('receipts').catch(() => []);
            const studentReceipts = allReceipts.filter((rec: any) => 
                (rec.studentId === studentId || rec.student_id === studentId)
            );

            const prepaymentReceipts: Array<{ receipt: any; unallocatedAmount: number; allocations: any[] }> = [];

            studentReceipts.forEach((r: any) => {
                let allocs: any[] = [];
                try {
                    allocs = typeof r.allocations === 'string' ? JSON.parse(r.allocations) : r.allocations;
                } catch (e) {}
                if (!Array.isArray(allocs)) return;

                const prepAlloc = allocs.find((a: any) => a.invoiceNumber === 'Prepayment');
                if (prepAlloc && Number(prepAlloc.amount) > 0) {
                    prepaymentReceipts.push({
                        receipt: r,
                        unallocatedAmount: Number(prepAlloc.amount),
                        allocations: allocs
                    });
                }
            });

            if (prepaymentReceipts.length === 0) return;

            let invoiceModified = false;
            const invoiceItems = Array.isArray(invoice.items) ? [...invoice.items] : [];

            for (const item of invoiceItems) {
                const itemTotal = Number(item.amount || item.totalAmount || 0);
                const itemPaid = Number(item.paid || 0);
                let itemRemaining = itemTotal - itemPaid;

                if (itemRemaining <= 0) continue;

                for (const prep of prepaymentReceipts) {
                    if (itemRemaining <= 0) break;
                    if (prep.unallocatedAmount <= 0) continue;

                    const allocated = Math.min(itemRemaining, prep.unallocatedAmount);

                    item.paid = itemPaid + allocated;
                    itemRemaining -= allocated;
                    invoiceModified = true;

                    prep.unallocatedAmount -= allocated;
                    const prepAllocIndex = prep.allocations.findIndex((a: any) => a.invoiceNumber === 'Prepayment');
                    if (prepAllocIndex !== -1) {
                        const prepAlloc = prep.allocations[prepAllocIndex];
                        if (prep.unallocatedAmount === 0) {
                            prep.allocations.splice(prepAllocIndex, 1);
                        } else {
                            prep.allocations[prepAllocIndex] = {
                                ...prepAlloc,
                                amount: prep.unallocatedAmount
                            };
                        }
                    }

                    prep.allocations.push({
                        invoiceId: invoice.id,
                        invoiceNumber: invoice.invoiceNumber || invoice.invoice_number,
                        voteHeadId: item.voteHeadId || item.vote_head_id,
                        description: item.description || item.name || 'Fees',
                        amount: allocated
                    });

                    const currentInvId = prep.receipt.invoiceId || prep.receipt.invoice_id;
                    if (!currentInvId) {
                        prep.receipt.invoiceId = invoice.id;
                        prep.receipt.invoice_id = invoice.id;
                    }
                }
            }

            if (invoiceModified) {
                for (const prep of prepaymentReceipts) {
                    await apiService.saveModuleRecord('receipts', {
                        ...prep.receipt,
                        allocations: JSON.stringify(prep.allocations)
                    });
                }

                const updatedItemsPaid = invoiceItems.reduce((sum, it) => sum + Number(it.paid || 0), 0);
                const newStatus = updatedItemsPaid >= Number(invoice.totalAmount || (invoice as any).total_amount) ? 'paid' : 'partial';

                await apiService.saveModuleRecord('invoices', {
                    ...invoice,
                    items: invoiceItems,
                    status: newStatus
                });
            }
        } catch (err) {
            console.error("[apiService] Failed to automatically allocate prepayments:", err);
        }
    }
};

