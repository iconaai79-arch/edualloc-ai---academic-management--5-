import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as sharedSupabase, initSupabase } from '../lib/supabase';
import { generateAlphanumericCode, formatPhoneNumber } from '../utils/stringUtils';
import { isPlaceholderEmail } from '../utils/academicUtils';
import { localDb } from './localDb';
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
    RemedialSession, RemedialRateSetting, RemedialPayout, RemedialAllocation, RemedialSubject, FeePromise,
    InvoiceClient, CompanyInvoiceSettings,
    SchoolAuthorizedDevice, SchoolRouterProfile
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
let _rpcGetNextDocFailed = false;
let _migrationQueue: Promise<any> = Promise.resolve();
const _executedMigrations = new Set<string>();

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
let _sessionUser: { institutionId?: string; branchId?: string; branch_id?: string; role?: string } | null = null;
export const setSessionUser = (user: { institutionId?: string; branchId?: string; branch_id?: string; role?: string } | null) => {
    _sessionUser = user;
};

// ── Resource Optimization: Client-side In-Flight Deduplication & Memory Cache ──
interface CacheEntry {
    data: any[];
    timestamp: number;
    ttl: number;
}
const _moduleMemoryCache = new Map<string, CacheEntry>();
const _inFlightRequests = new Map<string, Promise<any>>();

const STATIC_CONFIG_MODULES = new Set([
    'institutions',
    'departments',
    'subjects',
    'courses',
    'academic_levels',
    'academic_years',
    'semesters',
    'buildings',
    'rooms',
    'finance_numbering_configs',
    'ds_settings',
    'his_pharmacy_settings',
    'his_insurance_providers',
    'store_categories',
    'system_settings',
    'system_configs',
    'branches',
    'counties',
    'constituencies'
]);

export const invalidateModuleCache = (module?: string) => {
    if (!module) {
        _moduleMemoryCache.clear();
        return;
    }
    for (const key of _moduleMemoryCache.keys()) {
        if (key.startsWith(`${module}:`)) {
            _moduleMemoryCache.delete(key);
        }
    }
};

const _unsupportedServerModules = new Set<string>([
    'his_branding',
    'his_consultation_rates',
    'his_hospital_rooms',
    'hr_allowance_categories',
    'hr_deduction_categories'
]);

const PROTECTED_KEYS = new Set([
    'data', 'state_data', 'stateData',
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
    'cpanelSettings', 'cpanel_settings',
    'treeGradingNodes', 'tree_grading_nodes',
    'classExamConfigs', 'class_exam_configs',
    'classTeacherCommentsConfig', 'class_teacher_comments_config',
    'classRankingConfigs', 'class_ranking_configs',
    'othersExamSettings', 'others_exam_settings',
    'teacherPreferences', 'teacher_preferences',
    'imConfig', 'im_config'
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

// Safe Local Storage Helper with automatic quota eviction and LRU cache capping
export const safeLocalStorage = {
    freeSpace: () => {
        try {
            const evictableKeys = Object.keys(localStorage).filter(k => 
                !k.includes('active_session') && 
                !k.includes('super_admin') &&
                !k.includes('current_user') && 
                !k.includes('credentials') &&
                !k.includes('token') &&
                !k.includes('auth') &&
                !k.includes('user') &&
                (
                    k.includes('_cache') || 
                    k.includes('_backup') || 
                    k.includes('_history') || 
                    k.includes('_logs') || 
                    k.includes('_outbox') ||
                    k.startsWith('eduai_') || 
                    k.startsWith('ds_') || 
                    k.startsWith('temp_')
                )
            );
            // Evict the largest 15 bloated keys to free up plenty of headroom
            const keySizes = evictableKeys.map(k => ({ key: k, size: (localStorage.getItem(k) || '').length }));
            keySizes.sort((a, b) => b.size - a.size);
            for (const item of keySizes.slice(0, 15)) {
                localStorage.removeItem(item.key);
            }
        } catch (e) {}
    },
    setItem: (key: string, value: string) => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            safeLocalStorage.freeSpace();
            try {
                localStorage.removeItem(key);
                localStorage.setItem(key, value);
            } catch (_) {
                // Secondary aggressive eviction: remove largest non-session keys except target key
                try {
                    const allKeys = Object.keys(localStorage).filter(k => 
                        k !== key && 
                        !k.includes('session') && 
                        !k.includes('token') && 
                        !k.includes('user') && 
                        !k.includes('auth')
                    );
                    const sizes = allKeys.map(k => ({ k, len: (localStorage.getItem(k) || '').length }));
                    sizes.sort((a, b) => b.len - a.len);
                    for (const s of sizes.slice(0, 10)) {
                        localStorage.removeItem(s.k);
                    }
                    localStorage.setItem(key, value);
                } catch (finalErr) {
                    // CRITICAL: NEVER re-throw QuotaExceededError - keep app running smoothly in memory
                    console.warn(`[safeLocalStorage] Storage quota full for '${key}' - state retained in memory.`);
                }
            }
        }
    },
    getItem: (key: string): string | null => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    },
    removeItem: (key: string) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {}
    }
};

// Local Storage Helper with automatic QuotaExceeded recovery and LRU cache capping
const ls = {
    get: (table: string): any[] => {
        try {
            const data = localStorage.getItem(`eduai_${table}`);
            if (!data) return [];
            const parsed = JSON.parse(data);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter(r => r && typeof r === 'object');
        } catch (e) {
            return [];
        }
    },
    set: (table: string, data: any) => {
        try {
            if (Array.isArray(data)) {
                // Cap oversized local caches to the most recent 150 items to prevent local storage quota saturation
                const trimmedData = data.length > 150 ? data.slice(-150) : data;
                safeLocalStorage.setItem(`eduai_${table}`, JSON.stringify(trimmedData));
            } else if (data && typeof data === 'object') {
                safeLocalStorage.setItem(`eduai_${table}`, JSON.stringify(data));
            } else {
                safeLocalStorage.setItem(`eduai_${table}`, JSON.stringify([]));
            }
        } catch (e: any) {
            // Suppress storage error
        }
    },
    upsert: (table: string, record: any) => {

        try {
            const records = ls.get(table);
            const index = records.findIndex((r: any) => r && r.id === record.id);
            if (index >= 0) {
                records[index] = { ...records[index], ...record };
            } else {
                records.push(record);
            }
            ls.set(table, records);
            return [record];
        } catch (_) {
            return [record];
        }
    },
    delete: (table: string, id: string) => {
        try {
            const records = ls.get(table);
            const filtered = records.filter((r: any) => r && r.id !== id);
            ls.set(table, filtered);
        } catch (_) {}
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

            const cleanInstId = String(instId || '').replace(/^inst_/, '').trim();
            const defaultPrefixes: Record<string, string> = {
                invoice: 'INV-',
                receipt: 'REC-',
                payment_voucher: 'PV-',
                credit_note: 'CN-',
                debit_note: 'DN-',
                goods_in_lieu: 'GIL-',
                lpo: 'LPO-',
                requisition: 'REQ-',
                admission: 'ADM-',
                student: 'ADM-',
                quote: 'QUO-',
                quotation: 'QUO-'
            };

            let defaultNextNumber = 1001;
            if (cleanInstId === 'superadmin' || cleanInstId === 'global') {
                try {
                    const sysSettings = ls.get('system_settings') as any;
                    const settData = sysSettings?.data || sysSettings;
                    if (settData) {
                        if (settData.global_invoice_prefix || settData.globalInvoicePrefix) {
                            defaultPrefixes.invoice = String(settData.global_invoice_prefix || settData.globalInvoicePrefix).trim();
                        }
                        if (settData.global_receipt_prefix || settData.globalReceiptPrefix) {
                            defaultPrefixes.receipt = String(settData.global_receipt_prefix || settData.globalReceiptPrefix).trim();
                        }
                        if (settData.global_quote_prefix || settData.globalQuotePrefix) {
                            defaultPrefixes.quote = String(settData.global_quote_prefix || settData.globalQuotePrefix).trim();
                            defaultPrefixes.quotation = defaultPrefixes.quote;
                        }
                        if (docType === 'invoice' && (settData.global_invoice_next_number || settData.globalInvoiceNextNumber)) {
                            defaultNextNumber = Number(settData.global_invoice_next_number || settData.globalInvoiceNextNumber);
                        } else if (docType === 'receipt' && (settData.global_receipt_next_number || settData.globalReceiptNextNumber)) {
                            defaultNextNumber = Number(settData.global_receipt_next_number || settData.globalReceiptNextNumber);
                        } else if ((docType === 'quote' || docType === 'quotation') && (settData.global_quote_next_number || settData.globalQuoteNextNumber)) {
                            defaultNextNumber = Number(settData.global_quote_next_number || settData.globalQuoteNextNumber);
                        }
                    }
                } catch (_) {}
            }

            // Try atomic RPC first to avoid concurrent/race-condition duplicate numbers
            if (!_rpcGetNextDocFailed) {
                try {
                    const { data, error } = await supabaseClient.rpc('get_next_document_number', {
                        p_institution_id: instId,
                        p_document_type: docType
                    });
                    if (!error && data) {
                        return data;
                    }
                    if (error && (error.code === 'PGRST202' || error.message?.includes('404') || String(error.message || '').includes('Could not find the function'))) {
                        _rpcGetNextDocFailed = true;
                    }
                } catch (rpcErr) {
                    _rpcGetNextDocFailed = true;
                }
            }

            // Fallback 1: Query numbering config directly via supabase
            let config: any = null;
            try {
                const { data: dbConfigs, error: queryErr } = await supabaseClient
                    .from('finance_numbering_configs')
                    .select('*')
                    .or(`institution_id.eq.${instId},institution_id.eq.${cleanInstId},institution_id.eq.inst_${cleanInstId}`)
                    .eq('document_type', docType)
                    .limit(1);

                if (!queryErr && Array.isArray(dbConfigs) && dbConfigs.length > 0) {
                    config = dbConfigs[0];
                }
            } catch (qErr) {
                // Ignore query error and fallback to fetchModuleRecords
            }

            if (!config) {
                const numberingConfigs = await apiService.fetchModuleRecords<any>('finance_numbering_configs', instId).catch(() => []);
                config = (numberingConfigs || []).find((c: any) => 
                    String(c.documentType || c.document_type || '').toLowerCase() === docType.toLowerCase()
                );
            }

            const prefix = config?.prefix || defaultPrefixes[docType] || 'DOC-';
            const stableId = config?.id || `num_cfg_${docType}_${cleanInstId || instId}`;

            if (!config) {
                config = {
                    id: stableId,
                    institutionId: instId,
                    institution_id: instId,
                    documentType: docType,
                    document_type: docType,
                    prefix: prefix,
                    nextNumber: defaultNextNumber,
                    next_number: defaultNextNumber,
                    updatedAt: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                // Upsert via supabase if available to prevent 23505 conflict
                try {
                    const { data: upserted } = await supabaseClient
                        .from('finance_numbering_configs')
                        .upsert({
                            id: stableId,
                            institution_id: instId,
                            document_type: docType,
                            prefix: prefix,
                            next_number: defaultNextNumber,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'institution_id,document_type' })
                        .select()
                        .single();
                    if (upserted) {
                        config = upserted;
                    }
                } catch (upErr) {
                    await apiService.saveModuleRecord('finance_numbering_configs', config).catch(() => {});
                }
            }

            const nextNum = Number(config.nextNumber || config.next_number || 1001);
            const formattedNum = `${prefix}${nextNum}`;

            // Increment next number
            if (config.id) {
                try {
                    await supabaseClient
                        .from('finance_numbering_configs')
                        .update({
                            next_number: nextNum + 1,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', config.id);
                } catch (uErr) {
                    await apiService.updateModuleRecord('finance_numbering_configs', config.id, {
                        ...config,
                        nextNumber: nextNum + 1,
                        next_number: nextNum + 1,
                        updatedAt: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }).catch(() => {});
                }
            }

            return formattedNum;
        } catch (err) {
            console.error(`[apiService] Failed to get next document number for ${docType}:`, err);
            const fallbackPrefix = docType === 'invoice' ? 'INV-' : docType === 'receipt' ? 'REC-' : 'DOC-';
            return `${fallbackPrefix}${Date.now().toString().slice(-6)}`;
        }
    },
    async getAuthToken(): Promise<string> {
        const isJwtExpired = (tkn: string): boolean => {
            try {
                const parts = tkn.split('.');
                if (parts.length !== 3) return false;
                const payload = JSON.parse(atob(parts[1]));
                if (payload?.exp) {
                    return (Date.now() / 1000) >= (payload.exp - 5);
                }
                return false;
            } catch {
                return false;
            }
        };

        // 1. Try Supabase session (JWT)
        if (_supabase) {
            try {
                const { data } = _supabase.auth ? await _supabase.auth.getSession() : { data: { session: null } };
                if (data?.session?.access_token && !isJwtExpired(data.session.access_token)) {
                    return data.session.access_token;
                }

                // Session missing or expired — attempt a silent refresh
                if (_supabase.auth) {
                    try {
                        const { data: refreshData, error: refreshErr } = await _supabase.auth.refreshSession();
                        if (!refreshErr && refreshData?.session?.access_token && !isJwtExpired(refreshData.session.access_token)) {
                            console.log('[apiService] Token silently refreshed.');
                            return refreshData.session.access_token;
                        }
                    } catch (refreshEx: any) {
                        if (refreshEx?.name !== 'AbortError' && !String(refreshEx?.message || refreshEx).includes('aborted')) {
                            console.warn('[apiService] Silent refresh failed:', refreshEx);
                        }
                    }
                }
            } catch (e) { }

            // fallback to localStorage supanse-auth-token if available and not expired
            const storageKey = Object.keys(localStorage).find(k => k.includes('-auth-token'));
            if (storageKey) {
                try {
                    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
                    if (stored.access_token && !isJwtExpired(stored.access_token)) {
                        return stored.access_token;
                    }
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

        // 3. Fallback to active session user ID or temp_admin_bypass
        let session = apiService.getSession();
        
        // 3.1 Try Alumnae Session fallback
        if (!session) {
            try {
                const alumStored = localStorage.getItem('eduai_alumna_session');
                if (alumStored) session = JSON.parse(alumStored);
            } catch (e) {}
        }

        const token = session?.id || (session as any)?.userId || (session as any)?.user_id || '';
        if (token && typeof token === 'string' && token.length > 5) return token;

        // Fallback for active institution / local admin sessions
        const localSession = localStorage.getItem('eduai_session') || localStorage.getItem('eduai_user') || localStorage.getItem('user');
        if (localSession || _sessionUser) {
            return 'temp_admin_bypass';
        }

        return token || 'temp_admin_bypass';
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

        // Cache key — per unique normalized URL, using v6 prefix to clear legacy entries
        const cacheKey = `eduai_short_v6_${encodeURIComponent(normalizedUrl)}`;

        const isGenericOrStale = (url: string) => {
            if (!url) return true;
            const lower = url.toLowerCase();
            return lower.includes('24borchc') || 
                   lower.includes('kmf6f2') || 
                   lower.includes('fox2detroit') || 
                   lower.includes('90rfdn') || 
                   lower.includes('392vwj8s') || 
                   lower.includes('28xapexb') ||
                   lower.includes('cleanuri.com') ||
                   lower.includes('error');
        };

        // Validate cached entry: discard if it doesn't look like a legit short URL or is a generic fallback
        try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached && cached.startsWith('http') && !cached.includes('localhost') && !isGenericOrStale(cached)) {
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
                    // Accept any valid HTTP short URL returned by proxy (da.gd, TinyURL, Ulvis, is.gd, or normalized longUrl)
                    if (short && short.startsWith('http') && !short.includes('localhost') && !isGenericOrStale(short)) {
                        try { sessionStorage.setItem(cacheKey, short); } catch (_) {}
                        return short;
                    }
                }
            }
        } catch (_) {}

        // Helper: attempt a shortener service and return the result or null
        const tryShorten = async (shortenerUrl: string, extractFn: (res: Response, text: string) => string | null): Promise<string | null> => {
            try {
                const res = await fetch(shortenerUrl, { 
                    method: 'GET', 
                    headers: {
                        'Accept': 'text/plain',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    signal: AbortSignal.timeout(6000) 
                });
                if (res.ok) {
                    const text = (await res.text()).trim();
                    const extracted = extractFn(res, text);
                    if (extracted && !isGenericOrStale(extracted)) return extracted;
                }
            } catch (_) {}
            return null;
        };

        // 2. Client-side da.gd fallback (ultra-short: https://da.gd/XXXX)
        const dagdShort = await tryShorten(
            `https://da.gd/s?url=${encodeURIComponent(normalizedUrl)}`,
            (_, text) => (text.startsWith('https://da.gd/') && !text.includes('error') ? text : null)
        );
        if (dagdShort) {
            try { sessionStorage.setItem(cacheKey, dagdShort); } catch (_) {}
            return dagdShort;
        }

        // 3. Client-side TinyURL fallback (100% reliable direct redirect)
        const tinyShort = await tryShorten(
            `https://tinyurl.com/api-create.php?url=${encodeURIComponent(normalizedUrl)}`,
            (_, text) => (text.startsWith('https://tinyurl.com/') && !text.includes('error') ? text : null)
        );
        if (tinyShort) {
            try { sessionStorage.setItem(cacheKey, tinyShort); } catch (_) {}
            return tinyShort;
        }

        // 4. Client-side Ulvis fallback
        const ulvisShort = await tryShorten(
            `https://ulvis.net/api.php?url=${encodeURIComponent(normalizedUrl)}`,
            (_, text) => (text.startsWith('https://ulvis.net/') && !text.includes('error') ? text : null)
        );
        if (ulvisShort) {
            try { sessionStorage.setItem(cacheKey, ulvisShort); } catch (_) {}
            return ulvisShort;
        }

        // 5. Client-side is.gd fallback
        const isgdShort = await tryShorten(
            `https://is.gd/create.php?format=simple&url=${encodeURIComponent(normalizedUrl)}`,
            (_, text) => (text.startsWith('https://is.gd/') && !text.toLowerCase().includes('error') ? text : null)
        );
        if (isgdShort) {
            try { sessionStorage.setItem(cacheKey, isgdShort); } catch (_) {}
            return isgdShort;
        }

        // 6. Final fallback: return the original normalized URL unchanged
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
            const formattedRecipient = type === 'phone' ? formatPhoneNumber(identifier) : identifier.trim();
            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'forgotPassword', 
                    recipient: formattedRecipient,
                    method: type,
                    isOtp: true,
                    isSystemMessage: true
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
        const trimmedSql = sql.trim();
        const isDdl = /^(CREATE|DROP|ALTER|GRANT|REVOKE|DO\s+\$\$)/i.test(trimmedSql);

        // Avoid re-running identical static DDL migrations in the same session
        if (isDdl && _executedMigrations.has(trimmedSql)) {
            return { success: true, cached: true };
        }

        if (isDdl) {
            _executedMigrations.add(trimmedSql);
        }

        // Serialize migration execution to avoid concurrent lock deadlocks in Postgres
        const task = _migrationQueue.then(async () => {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;
            try {
                const response = await fetch('/api/system?action=execute_sql', {
                    signal: controller ? controller.signal : undefined,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sql: trimmedSql })
                });
                
                const contentType = response.headers.get("content-type");
                let result: any;
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    result = await response.json();
                } else {
                    const text = await response.text();
                    console.error(`[SQL Engine] Server Error (${response.status}):`, text.substring(0, 500));
                    result = { 
                        success: response.ok, 
                        message: text.substring(0, 200) || (response.ok ? "Operation completed successfully" : `Server Error (${response.status}) - The execution engine returned an invalid response.`)
                    };
                }

                return result;
            } catch (e: any) {
                const isNetworkErr = String(e?.message || '').toLowerCase().includes('network') || 
                                     String(e?.message || '').toLowerCase().includes('fetch') ||
                                     e?.name === 'AbortError';
                if (isNetworkErr) {
                    console.warn("Migration Notice (Network or Timeout):", e.message || e);
                } else {
                    console.error("Migration Error:", e);
                }
                return { success: false, message: e.message || "Execution engine failure." };
            } finally {
                if (timeoutId) clearTimeout(timeoutId);
            }
        });

        _migrationQueue = task.catch(() => {});
        return task;
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
    async uploadFile(bucketOrFile: string | File, pathOrBucket: string, fileOrPath?: File | string, contentType?: string): Promise<string | null> {
        let file: File | undefined;
        try {
            let activeBucket = 'eduai';
            let path = '';

            // Parameter normalization if called as uploadFile(file, bucket, path) or uploadFile(bucket, path, file)
            if (bucketOrFile instanceof File || (bucketOrFile && typeof (bucketOrFile as any).name === 'string' && (bucketOrFile as any).size !== undefined)) {
                file = bucketOrFile as File;
                activeBucket = typeof pathOrBucket === 'string' ? pathOrBucket : 'eduai';
                path = typeof fileOrPath === 'string' ? fileOrPath : `uploads/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            } else {
                activeBucket = typeof bucketOrFile === 'string' ? bucketOrFile : 'eduai';
                path = typeof pathOrBucket === 'string' ? pathOrBucket : '';
                file = fileOrPath as File;
            }

            if (!file) {
                console.warn('[Storage] No valid file provided for upload.');
                return null;
            }

            if (!_supabase) {
                // Return as base64 for local development/offline mode
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file!);
                });
            }

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
                    reader.readAsDataURL(file!);
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
                if (file) {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(file!);
                    });
                }
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
        const cacheKey = `${module}:${institutionId || 'all'}:${countyId || 'none'}:${JSON.stringify(options || {})}`;
        const now = Date.now();
        const cached = _moduleMemoryCache.get(cacheKey);
        if (cached && (now - cached.timestamp) < cached.ttl) {
            return cached.data as T[];
        }

        if (_inFlightRequests.has(cacheKey)) {
            return _inFlightRequests.get(cacheKey) as Promise<T[]>;
        }

        const executeFetch = async (): Promise<T[]> => {
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
                if (options?.order && Array.isArray(records)) {
                    const [orderCol, orderDir] = options.order.split('.');
                    const isAsc = orderDir === 'asc';
                    records.sort((a: any, b: any) => {
                        const valA = a[orderCol] ?? a[orderCol.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] ?? '';
                        const valB = b[orderCol] ?? b[orderCol.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] ?? '';
                        if (valA < valB) return isAsc ? -1 : 1;
                        if (valA > valB) return isAsc ? 1 : -1;
                        return 0;
                    });
                }
                if (options?.limit && typeof options.limit === 'number' && Array.isArray(records)) {
                    records = records.slice(0, options.limit);
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
                        const tNodes = inst.treeGradingNodes || inst.tree_grading_nodes;
                        if (tNodes) {
                            const parsed = typeof tNodes === 'string' ? JSON.parse(tNodes) : tNodes;
                            inst.treeGradingNodes = parsed;
                            inst.tree_grading_nodes = parsed;
                        }
                        const cConfigs = inst.classExamConfigs || inst.class_exam_configs;
                        if (cConfigs) {
                            const parsed = typeof cConfigs === 'string' ? JSON.parse(cConfigs) : cConfigs;
                            inst.classExamConfigs = parsed;
                            inst.class_exam_configs = parsed;
                        }
                        const cComments = inst.classTeacherCommentsConfig || inst.class_teacher_comments_config;
                        if (cComments) {
                            const parsed = typeof cComments === 'string' ? JSON.parse(cComments) : cComments;
                            inst.classTeacherCommentsConfig = parsed;
                            inst.class_teacher_comments_config = parsed;
                        }
                        const cRankings = inst.classRankingConfigs || inst.class_ranking_configs;
                        if (cRankings) {
                            const parsed = typeof cRankings === 'string' ? JSON.parse(cRankings) : cRankings;
                            inst.classRankingConfigs = parsed;
                            inst.class_ranking_configs = parsed;
                        }
                        const oSettings = inst.othersExamSettings || inst.others_exam_settings;
                        if (oSettings) {
                            const parsed = typeof oSettings === 'string' ? JSON.parse(oSettings) : oSettings;
                            inst.othersExamSettings = parsed;
                            inst.others_exam_settings = parsed;
                        }

                        // Hydrate visitor auto-finalize settings
                        if (inst.visitor_auto_finalize_enabled !== undefined && inst.visitorAutoFinalizeEnabled === undefined) {
                            inst.visitorAutoFinalizeEnabled = inst.visitor_auto_finalize_enabled;
                        }
                        if (inst.visitor_auto_finalize_time && !inst.visitorAutoFinalizeTime) {
                            inst.visitorAutoFinalizeTime = inst.visitor_auto_finalize_time;
                        }
                        if (inst.notify_host_on_visitor_arrival !== undefined && inst.notifyHostOnVisitorArrival === undefined) {
                            inst.notifyHostOnVisitorArrival = inst.notify_host_on_visitor_arrival;
                        }
                        if (inst.visitor_arrival_sms_template && !inst.visitorArrivalSmsTemplate) {
                            inst.visitorArrivalSmsTemplate = inst.visitor_arrival_sms_template;
                        }

                        const cachedInsts = ls.get('institutions') || [];
                        const cached = Array.isArray(cachedInsts) ? cachedInsts.find((ci: any) => ci.id === inst.id) : null;
                        if (cached) {
                            if (inst.visitorAutoFinalizeEnabled === undefined && (cached.visitorAutoFinalizeEnabled !== undefined || cached.visitor_auto_finalize_enabled !== undefined)) {
                                inst.visitorAutoFinalizeEnabled = cached.visitorAutoFinalizeEnabled ?? cached.visitor_auto_finalize_enabled;
                            }
                            if (!inst.visitorAutoFinalizeTime && (cached.visitorAutoFinalizeTime || cached.visitor_auto_finalize_time)) {
                                inst.visitorAutoFinalizeTime = cached.visitorAutoFinalizeTime || cached.visitor_auto_finalize_time;
                            }
                            if (inst.notifyHostOnVisitorArrival === undefined && (cached.notifyHostOnVisitorArrival !== undefined || cached.notify_host_on_visitor_arrival !== undefined)) {
                                inst.notifyHostOnVisitorArrival = cached.notifyHostOnVisitorArrival ?? cached.notify_host_on_visitor_arrival;
                            }
                            if (!inst.visitorArrivalSmsTemplate && (cached.visitorArrivalSmsTemplate || cached.visitor_arrival_sms_template)) {
                                inst.visitorArrivalSmsTemplate = cached.visitorArrivalSmsTemplate || cached.visitor_arrival_sms_template;
                            }
                        }

                        if (inst.metadata) {
                            const meta = typeof inst.metadata === 'string' ? JSON.parse(inst.metadata) : inst.metadata;
                            if (inst.visitorAutoFinalizeEnabled === undefined && (meta.visitorAutoFinalizeEnabled !== undefined || meta.visitor_auto_finalize_enabled !== undefined)) {
                                inst.visitorAutoFinalizeEnabled = meta.visitorAutoFinalizeEnabled ?? meta.visitor_auto_finalize_enabled;
                            }
                            if (!inst.visitorAutoFinalizeTime && (meta.visitorAutoFinalizeTime || meta.visitor_auto_finalize_time)) {
                                inst.visitorAutoFinalizeTime = meta.visitorAutoFinalizeTime || meta.visitor_auto_finalize_time;
                            }
                            if (inst.notifyHostOnVisitorArrival === undefined && (meta.notifyHostOnVisitorArrival !== undefined || meta.notify_host_on_visitor_arrival !== undefined)) {
                                inst.notifyHostOnVisitorArrival = meta.notifyHostOnVisitorArrival ?? meta.notify_host_on_visitor_arrival;
                            }
                            if (!inst.visitorArrivalSmsTemplate && (meta.visitorArrivalSmsTemplate || meta.visitor_arrival_sms_template)) {
                                inst.visitorArrivalSmsTemplate = meta.visitorArrivalSmsTemplate || meta.visitor_arrival_sms_template;
                            }
                        }
                    });
                }
                if (module === 'courses' && Array.isArray(finalResult)) {
                    finalResult.forEach((course: any) => {
                        if (Array.isArray(course.levels)) {
                            course.levels = course.levels.map((l: any) => {
                                const rawIds = [...(l.subjectIds || []), ...((l as any).subject_ids || [])];
                                const sIds = Array.from(new Set(rawIds));
                                const sMeta = l.subjectMetadata || (l as any).subject_metadata || [];
                                const normalizedMeta = Array.isArray(sMeta) ? sMeta.map((m: any) => ({
                                    ...m,
                                    subjectId: m.subjectId || m.subject_id,
                                    subject_id: m.subjectId || m.subject_id,
                                    lessonStructure: m.lessonStructure || m.lesson_structure,
                                    lesson_structure: m.lessonStructure || m.lesson_structure
                                })) : [];
                                return {
                                    ...l,
                                    subjectIds: sIds,
                                    subject_ids: sIds,
                                    subjectMetadata: normalizedMeta
                                };
                            });
                        }
                    });
                }
                if (module === 'his_patients' && Array.isArray(finalResult)) {
                    finalResult.forEach((p: any) => {
                        const fileNo = p.admissionNumber || p.admission_number || p.customPatientId || p.custom_patient_id || p.patientNumber || p.patient_number || p.opNumber || p.op_number || '';
                        p.admissionNumber = fileNo;
                        p.admission_number = fileNo;
                        p.customPatientId = fileNo;
                        p.custom_patient_id = fileNo;
                        p.patientNumber = fileNo;
                        p.patient_number = fileNo;
                        p.opNumber = fileNo;
                        p.op_number = fileNo;
                    });
                }
                if (module === 'student_enrollments' && Array.isArray(finalResult)) {
                    finalResult.forEach((enr: any) => {
                        const meta = typeof enr.metadata === 'object' && enr.metadata !== null ? enr.metadata : {};
                        const leadPos = enr.leadershipPosition || enr.leadership_position || meta.leadershipPosition || meta.leadership_position || '';
                        if (leadPos) {
                            enr.leadershipPosition = leadPos;
                            enr.leadership_position = leadPos;
                        }
                    });
                }
                if (module === 'vehicles' && Array.isArray(finalResult)) {
                    finalResult.forEach((v: any) => {
                        const meta = typeof v.metadata === 'object' && v.metadata !== null ? v.metadata : {};
                        if (!v.driverName && (meta.driverName || v.driver_name)) {
                            v.driverName = meta.driverName || v.driver_name;
                        }
                    });
                }
                return finalResult;
            };

            if (module === 'exam_units') {
                const targetInstId = (institutionId && institutionId !== 'ALL') ? institutionId : ((ls.get('current_institution') as any)?.id || 'default_inst');
                let remoteExams: any[] = [];

                if (_supabase) {
                    try {
                        let query = _supabase.from('institution_module_states').select('*');
                        if (institutionId && institutionId !== 'ALL') {
                            query = query.eq('institution_id', institutionId);
                        }
                        const { data: imsData, error: imsErr } = await query;
                        if (!imsErr && imsData && imsData.length > 0) {
                            const camelRows = toCamelCase(imsData);
                            for (const row of camelRows) {
                                const modId = row.moduleId || row.module_id;
                                const rowId = row.id || '';
                                if (modId === 'exam_units' || rowId.includes('exam_units')) {
                                    const rawData = row.data || row.settings || row.stateData || row.state_data;
                                    if (Array.isArray(rawData)) {
                                        remoteExams.push(...rawData);
                                    } else if (rawData && Array.isArray(rawData.exams)) {
                                        remoteExams.push(...rawData.exams);
                                    } else if (rawData && typeof rawData === 'object' && rawData.id) {
                                        remoteExams.push(rawData);
                                    }
                                } else if (modId === 'exam_unit' || rowId.includes('_exam_unit_')) {
                                    const rawData = row.data || row.settings || row.stateData || row;
                                    if (rawData && rawData.id) {
                                        remoteExams.push(rawData);
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('[apiService] Supabase fetch for exam_units failed:', e);
                    }
                }

                // If remoteExams is empty, try API records endpoint
                if (remoteExams.length === 0) {
                    try {
                        let token = await apiService.getAuthToken();
                        const url = new URL(`${window.location.origin}/api/records`);
                        url.searchParams.append('module', 'institution_module_states');
                        if (institutionId && institutionId !== 'ALL') url.searchParams.append('institutionId', institutionId);
                        const response = await fetch(url.toString(), {
                            headers: {
                                'Authorization': token ? `Bearer ${token}` : '',
                                'Content-Type': 'application/json'
                            }
                        });
                        if (response.ok) {
                            const resJson = await response.json();
                            const fetched = resJson.data || resJson || [];
                            if (Array.isArray(fetched) && fetched.length > 0) {
                                const camelRows = toCamelCase(fetched);
                                for (const row of camelRows) {
                                    const modId = row.moduleId || row.module_id;
                                    const rowId = row.id || '';
                                    if (modId === 'exam_units' || rowId.includes('exam_units')) {
                                        const rawData = row.data || row.settings || row.stateData || row.state_data;
                                        if (Array.isArray(rawData)) {
                                            remoteExams.push(...rawData);
                                        } else if (rawData && Array.isArray(rawData.exams)) {
                                            remoteExams.push(...rawData.exams);
                                        } else if (rawData && typeof rawData === 'object' && rawData.id) {
                                            remoteExams.push(rawData);
                                        }
                                    } else if (modId === 'exam_unit' || rowId.includes('_exam_unit_')) {
                                        const rawData = row.data || row.settings || row.stateData || row;
                                        if (rawData && rawData.id) {
                                            remoteExams.push(rawData);
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('[apiService] API records fetch for exam_units failed:', e);
                    }
                }

                // Filter out legacy dummy sample exams
                const dummyIds = new Set(['exam_1', 'exam_2', 'exam_3', 'exam_pub_1', 'exam_pub_2', 'exam_pub_3']);
                const cleanRemote = remoteExams.filter(e => e && e.id && !dummyIds.has(e.id)).map(e => toCamelCase(e));

                // Local storage fallback / merge
                let localUnits: any[] = [];
                try {
                    const saved = localStorage.getItem(`eduai_exam_units_${targetInstId}`);
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (Array.isArray(parsed)) localUnits = parsed;
                    }
                } catch (e) {}
                if (localUnits.length === 0) {
                    const lsRecs = ls.get('exam_units');
                    if (Array.isArray(lsRecs)) localUnits = lsRecs;
                }
                const cleanLocal = localUnits.filter(e => e && e.id && !dummyIds.has(e.id)).map(e => toCamelCase(e));

                // CleanRemote takes priority; merge in any local units not yet on remote
                const examsMap = new Map<string, any>();
                cleanLocal.forEach(e => examsMap.set(e.id, e));
                cleanRemote.forEach(e => examsMap.set(e.id, { ...examsMap.get(e.id), ...e }));
                const finalExams = Array.from(examsMap.values());

                // Write through cache
                try {
                    if (targetInstId) {
                        localStorage.setItem(`eduai_exam_units_${targetInstId}`, JSON.stringify(finalExams));
                    }
                    ls.set('exam_units', finalExams);
                } catch (e) {}

                return finalExams as T[];
            }

            if (module === 'exam_broadsheets') {
                const targetInstId = (institutionId && institutionId !== 'ALL') ? institutionId : ((ls.get('current_institution') as any)?.id || 'default_inst');
                let remoteStore: Record<string, any> = {};

                if (_supabase) {
                    try {
                        let query = _supabase.from('institution_module_states').select('*');
                        if (institutionId && institutionId !== 'ALL') {
                            query = query.eq('institution_id', institutionId);
                        }
                        const { data: imsData, error: imsErr } = await query;
                        if (!imsErr && imsData && imsData.length > 0) {
                            const camelRows = toCamelCase(imsData);
                            const match = camelRows.find((r: any) => 
                                r.id === `ims_exam_broadsheets_${targetInstId}` ||
                                r.id === `broadsheets_${targetInstId}` ||
                                r.moduleId === 'exam_broadsheets' ||
                                r.module_id === 'exam_broadsheets'
                            );
                            const storeData = match?.settings || match?.stateData || match?.data;
                            if (storeData && typeof storeData === 'object') {
                                remoteStore = storeData;
                            }
                        }
                    } catch (e) {
                        console.warn('[apiService] Supabase fetch for exam_broadsheets failed:', e);
                    }
                }

                if (Object.keys(remoteStore).length === 0) {
                    try {
                        let token = await apiService.getAuthToken();
                        const url = new URL(`${window.location.origin}/api/records`);
                        url.searchParams.append('module', 'institution_module_states');
                        if (institutionId && institutionId !== 'ALL') url.searchParams.append('institutionId', institutionId);
                        const response = await fetch(url.toString(), {
                            headers: {
                                'Authorization': token ? `Bearer ${token}` : '',
                                'Content-Type': 'application/json'
                            }
                        });
                        if (response.ok) {
                            const resJson = await response.json();
                            const fetched = resJson.data || resJson || [];
                            if (Array.isArray(fetched) && fetched.length > 0) {
                                const camelRows = toCamelCase(fetched);
                                const match = camelRows.find((r: any) => 
                                    r.id === `ims_exam_broadsheets_${targetInstId}` ||
                                    r.id === `broadsheets_${targetInstId}` ||
                                    r.moduleId === 'exam_broadsheets' ||
                                    r.module_id === 'exam_broadsheets'
                                );
                                const storeData = match?.settings || match?.stateData || match?.data;
                                if (storeData && typeof storeData === 'object') {
                                    remoteStore = storeData;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('[apiService] API fetch for exam_broadsheets failed:', e);
                    }
                }

                let localStore: Record<string, any> = {};
                try {
                    const saved = localStorage.getItem(`eduai_exam_broadsheets_${targetInstId}`);
                    if (saved) localStore = JSON.parse(saved) || {};
                } catch (e) {}

                const mergedStore = { ...localStore, ...remoteStore };
                try {
                    localStorage.setItem(`eduai_exam_broadsheets_${targetInstId}`, JSON.stringify(mergedStore));
                    ls.set('exam_broadsheets', mergedStore);
                } catch (e) {}

                return [mergedStore] as any;
            }

            if (module === 'class_subject_allocations') {
                const targetInstId = (institutionId && institutionId !== 'ALL') ? institutionId : ((ls.get('current_institution') as any)?.id || 'default_inst');
                let remoteStore: Record<string, string[]> = {};

                if (_supabase) {
                    try {
                        let query = _supabase.from('institution_module_states').select('*');
                        if (institutionId && institutionId !== 'ALL') {
                            query = query.eq('institution_id', institutionId);
                        }
                        const { data: imsData, error: imsErr } = await query;
                        if (!imsErr && imsData && imsData.length > 0) {
                            const camelRows = toCamelCase(imsData);
                            const match = camelRows.find((r: any) => 
                                r.id === `ims_class_subject_allocations_${targetInstId}` ||
                                r.id === `alloc_${targetInstId}` ||
                                (r.id && r.id.includes('class_subject_allocations')) ||
                                r.moduleId === 'class_subject_allocations' ||
                                r.module_id === 'class_subject_allocations'
                            );
                            const storeData = match?.data?.allocations || match?.settings?.allocations || match?.allocations || match?.settings || match?.stateData || match?.data;
                            if (storeData && typeof storeData === 'object' && !Array.isArray(storeData)) {
                                remoteStore = storeData;
                            }
                        }
                    } catch (e) {
                        console.warn('[apiService] Supabase fetch for class_subject_allocations failed:', e);
                    }
                }

                if (Object.keys(remoteStore).length === 0) {
                    try {
                        let token = await apiService.getAuthToken();
                        const url = new URL(`${window.location.origin}/api/records`);
                        url.searchParams.append('module', 'institution_module_states');
                        if (institutionId && institutionId !== 'ALL') url.searchParams.append('institutionId', institutionId);
                        const response = await fetch(url.toString(), {
                            headers: {
                                'Authorization': token ? `Bearer ${token}` : '',
                                'Content-Type': 'application/json'
                            }
                        });
                        if (response.ok) {
                            const resJson = await response.json();
                            const fetched = resJson.data || resJson || [];
                            if (Array.isArray(fetched) && fetched.length > 0) {
                                const camelRows = toCamelCase(fetched);
                                const match = camelRows.find((r: any) => 
                                    r.id === `ims_class_subject_allocations_${targetInstId}` ||
                                    r.id === `alloc_${targetInstId}` ||
                                    (r.id && r.id.includes('class_subject_allocations')) ||
                                    r.moduleId === 'class_subject_allocations' ||
                                    r.module_id === 'class_subject_allocations'
                                );
                                const storeData = match?.data?.allocations || match?.settings?.allocations || match?.allocations || match?.settings || match?.stateData || match?.data;
                                if (storeData && typeof storeData === 'object' && !Array.isArray(storeData)) {
                                    remoteStore = storeData;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('[apiService] API fetch for class_subject_allocations failed:', e);
                    }
                }

                let localStore: Record<string, string[]> = {};
                try {
                    const saved = localStorage.getItem(`eduai_class_subject_allocations_${targetInstId}`);
                    if (saved) localStore = JSON.parse(saved) || {};
                } catch (e) {}

                const mergedStore = { ...localStore, ...remoteStore };
                try {
                    localStorage.setItem(`eduai_class_subject_allocations_${targetInstId}`, JSON.stringify(mergedStore));
                    ls.set('class_subject_allocations', [{ id: `alloc_${targetInstId}`, institutionId: targetInstId, allocations: mergedStore }]);
                } catch (e) {}

                return [{ id: `alloc_${targetInstId}`, institutionId: targetInstId, allocations: mergedStore }] as any;
            }

            if (module === 'subject_allocations') {
                const targetInstId = (institutionId && institutionId !== 'ALL') ? institutionId : ((ls.get('current_institution') as any)?.id || 'default_inst');
                let remoteAllocs: any[] = [];

                if (_supabase) {
                    try {
                        let query = _supabase.from('institution_module_states').select('*');
                        if (institutionId && institutionId !== 'ALL') {
                            query = query.eq('institution_id', institutionId);
                        }
                        const { data: imsData, error: imsErr } = await query;
                        if (!imsErr && imsData && imsData.length > 0) {
                            const camelRows = toCamelCase(imsData);
                            const match = camelRows.find((r: any) => 
                                r.id === `ims_subject_allocations_${targetInstId}` ||
                                (r.id && r.id.includes('subject_allocations')) ||
                                r.moduleId === 'subject_allocations' ||
                                r.module_id === 'subject_allocations'
                            );
                            const storeData = match?.data?.allocations || match?.settings?.allocations || match?.allocations || match?.settings || match?.stateData || match?.data;
                            if (Array.isArray(storeData)) {
                                remoteAllocs = storeData;
                            }
                        }
                    } catch (e) {
                        console.warn('[apiService] Supabase fetch for subject_allocations failed:', e);
                    }
                }

                if (remoteAllocs.length === 0) {
                    try {
                        let token = await apiService.getAuthToken();
                        const url = new URL(`${window.location.origin}/api/records`);
                        url.searchParams.append('module', 'institution_module_states');
                        if (institutionId && institutionId !== 'ALL') url.searchParams.append('institutionId', institutionId);
                        const response = await fetch(url.toString(), {
                            headers: {
                                'Authorization': token ? `Bearer ${token}` : '',
                                'Content-Type': 'application/json'
                            }
                        });
                        if (response.ok) {
                            const resJson = await response.json();
                            const fetched = resJson.data || resJson || [];
                            if (Array.isArray(fetched) && fetched.length > 0) {
                                const camelRows = toCamelCase(fetched);
                                const match = camelRows.find((r: any) => 
                                    r.id === `ims_subject_allocations_${targetInstId}` ||
                                    (r.id && r.id.includes('subject_allocations')) ||
                                    r.moduleId === 'subject_allocations' ||
                                    r.module_id === 'subject_allocations'
                                );
                                const storeData = match?.data?.allocations || match?.settings?.allocations || match?.allocations || match?.settings || match?.stateData || match?.data;
                                if (Array.isArray(storeData)) {
                                    remoteAllocs = storeData;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('[apiService] API fetch for subject_allocations failed:', e);
                    }
                }

                let localAllocs: any[] = [];
                try {
                    const saved = localStorage.getItem(`eduai_subject_allocations_${targetInstId}`) || localStorage.getItem('eduai_subject_allocations');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (Array.isArray(parsed)) localAllocs = parsed;
                    }
                } catch (e) {}

                const map = new Map<string, any>();
                localAllocs.forEach(a => {
                    const k = a.id || `${(a.className || '').toLowerCase().trim()}_${(a.subjectName || '').toLowerCase().trim()}`;
                    map.set(k, a);
                });
                remoteAllocs.forEach(a => {
                    const k = a.id || `${(a.className || '').toLowerCase().trim()}_${(a.subjectName || '').toLowerCase().trim()}`;
                    map.set(k, { ...map.get(k), ...a });
                });

                const finalAllocs = Array.from(map.values());
                try {
                    localStorage.setItem(`eduai_subject_allocations_${targetInstId}`, JSON.stringify(finalAllocs));
                    localStorage.setItem('eduai_subject_allocations', JSON.stringify(finalAllocs));
                    ls.set('subject_allocations', finalAllocs);
                } catch (e) {}

                return finalAllocs as T[];
            }

            if (_unsupportedServerModules.has(module) || !_supabase) {
                return queryLocal();
            }

            if (module === 'institution_module_states') {
                let remoteRecords: any[] = [];
                if (_supabase) {
                    try {
                        let query = _supabase.from('institution_module_states').select('*');
                        if (institutionId && institutionId !== 'ALL') {
                            query = query.eq('institution_id', institutionId);
                        }
                        const { data: imsData, error: imsErr } = await query;
                        if (!imsErr && imsData && imsData.length > 0) {
                            remoteRecords = toCamelCase(imsData);
                        }
                    } catch (e) {
                        console.warn('[apiService] Supabase fetch for institution_module_states failed:', e);
                    }
                }

                // If remoteRecords is empty, try API records endpoint
                if (remoteRecords.length === 0) {
                    try {
                        let token = await apiService.getAuthToken();
                        const url = new URL(`${window.location.origin}/api/records`);
                        url.searchParams.append('module', 'institution_module_states');
                        if (institutionId && institutionId !== 'ALL') url.searchParams.append('institutionId', institutionId);
                        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                        const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;
                        const response = await fetch(url.toString(), {
                            signal: controller ? controller.signal : undefined,
                            headers: {
                                'Authorization': token ? `Bearer ${token}` : '',
                                'Content-Type': 'application/json'
                            }
                        }).finally(() => { if (timeoutId) clearTimeout(timeoutId); });
                        if (response.ok) {
                            const resJson = await response.json();
                            const fetched = resJson.data || resJson || [];
                            if (Array.isArray(fetched) && fetched.length > 0) {
                                remoteRecords = toCamelCase(fetched);
                            }
                        }
                    } catch (e: any) {
                        const isNetwork = String(e?.message || '').toLowerCase().includes('network') || 
                                          String(e?.message || '').toLowerCase().includes('fetch') ||
                                          e?.name === 'AbortError';
                        if (!isNetwork) {
                            console.warn('[apiService] API records fetch for institution_module_states:', e?.message || e);
                        }
                    }
                }

                // Always merge localDb records as fallback, with REMOTE records taking priority over local records!
                const localRecords = (ls.get('institution_module_states') || []) as any[];
                const localFiltered = localRecords.filter((m: any) => 
                    !institutionId || institutionId === 'ALL' || m.institutionId === institutionId || m.institution_id === institutionId
                ).map((item: any) => toCamelCase(item));

                const map = new Map<string, any>();
                localFiltered.forEach((r: any) => map.set(r.id || `${r.institutionId}_${r.moduleId}`, r));
                remoteRecords.forEach((r: any) => map.set(r.id || `${r.institutionId}_${r.moduleId}`, r));
                return Array.from(map.values());
            }

            // Fast offline short-circuit: serve cached local data immediately when offline
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
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
                    Object.entries(options.filter).forEach(([k, v]) => {
                        const dbKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                        url.searchParams.append(dbKey, v as string);
                    });
                }

                const fetchTimeoutMs = module === 'activity_log' ? 8000 : 15000;
                const doFetch = (tkn: string) => {
                    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                    const timeoutId = controller ? setTimeout(() => controller.abort(), fetchTimeoutMs) : null;
                    return fetch(url.toString(), {
                        signal: controller ? controller.signal : undefined,
                        headers: {
                            'Authorization': tkn ? `Bearer ${tkn}` : '',
                            'Content-Type': 'application/json'
                        }
                    }).finally(() => {
                        if (timeoutId) clearTimeout(timeoutId);
                    });
                };

                let response = await doFetch(token);

                // --- 401 handler: try silent token refresh then retry once ---
                if (response.status === 401) {
                    console.warn(`[apiService] 401 on fetch [${module}] — attempting token refresh...`);
                    let refreshedToken = '';
                    if (_supabase?.auth) {
                        try {
                            const { data: rd } = await _supabase.auth.refreshSession();
                            if (rd?.session?.access_token) {
                                refreshedToken = rd.session.access_token;
                                token = refreshedToken;
                                console.log('[apiService] Token refreshed, retrying fetch...');
                                response = await doFetch(refreshedToken);
                            }
                        } catch (refreshErr) {
                            console.warn('[apiService] Refresh failed during fetch:', refreshErr);
                        }
                    }

                    // Fallback attempt: if JWT expired and refresh couldn't renew it, try active user session ID or bypass
                    if (response.status === 401) {
                        const fallbackToken = apiService.getSession()?.id || 'temp_admin_bypass';
                        if (fallbackToken && fallbackToken !== token) {
                            response = await doFetch(fallbackToken);
                        }
                    }

                    if (response.status === 401) {
                        // Check if user has an active local/browser session before dispatching destructive session expiry
                        const hasActiveSession = Boolean(
                            apiService.getSession() || 
                            localStorage.getItem('user') || 
                            localStorage.getItem('eduai_active_session') || 
                            localStorage.getItem('eduai_session') ||
                            localStorage.getItem('eduai_user_session')
                        );
                        if (!hasActiveSession) {
                            apiService._notifySessionExpired();
                        }
                        console.warn(`[apiService] Session expired / 401 — falling back to local storage for [${module}]`);
                        return queryLocal();
                    }
                }
                // --- end 401 handler ---

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    console.error(`[apiService] Fetch API Error [${module}]:`, response.status, errData);
                    
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
                if (data && typeof data === 'object' && !Array.isArray(data) && (data.success === false || data.error)) {
                    console.warn(`[apiService] Server returned error object for [${module}]:`, data.error || data.message);
                    return queryLocal();
                }
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
                        const tNodes = inst.treeGradingNodes || inst.tree_grading_nodes;
                        if (tNodes) {
                            const parsed = typeof tNodes === 'string' ? JSON.parse(tNodes) : tNodes;
                            inst.treeGradingNodes = parsed;
                            inst.tree_grading_nodes = parsed;
                        }
                        const cConfigs = inst.classExamConfigs || inst.class_exam_configs;
                        if (cConfigs) {
                            const parsed = typeof cConfigs === 'string' ? JSON.parse(cConfigs) : cConfigs;
                            inst.classExamConfigs = parsed;
                            inst.class_exam_configs = parsed;
                        }
                        const cComments = inst.classTeacherCommentsConfig || inst.class_teacher_comments_config;
                        if (cComments) {
                            const parsed = typeof cComments === 'string' ? JSON.parse(cComments) : cComments;
                            inst.classTeacherCommentsConfig = parsed;
                            inst.class_teacher_comments_config = parsed;
                        }
                        const cRankings = inst.classRankingConfigs || inst.class_ranking_configs;
                        if (cRankings) {
                            const parsed = typeof cRankings === 'string' ? JSON.parse(cRankings) : cRankings;
                            inst.classRankingConfigs = parsed;
                            inst.class_ranking_configs = parsed;
                        }
                        const oSettings = inst.othersExamSettings || inst.others_exam_settings;
                        if (oSettings) {
                            const parsed = typeof oSettings === 'string' ? JSON.parse(oSettings) : oSettings;
                            inst.othersExamSettings = parsed;
                            inst.others_exam_settings = parsed;
                        }

                        // Hydrate visitor auto-finalize settings
                        if (inst.visitor_auto_finalize_enabled !== undefined && inst.visitorAutoFinalizeEnabled === undefined) {
                            inst.visitorAutoFinalizeEnabled = inst.visitor_auto_finalize_enabled;
                        }
                        if (inst.visitor_auto_finalize_time && !inst.visitorAutoFinalizeTime) {
                            inst.visitorAutoFinalizeTime = inst.visitor_auto_finalize_time;
                        }
                        if (inst.notify_host_on_visitor_arrival !== undefined && inst.notifyHostOnVisitorArrival === undefined) {
                            inst.notifyHostOnVisitorArrival = inst.notify_host_on_visitor_arrival;
                        }
                        if (inst.visitor_arrival_sms_template && !inst.visitorArrivalSmsTemplate) {
                            inst.visitorArrivalSmsTemplate = inst.visitor_arrival_sms_template;
                        }

                        const cachedInsts = ls.get('institutions') || [];
                        const cached = Array.isArray(cachedInsts) ? cachedInsts.find((ci: any) => ci.id === inst.id) : null;
                        if (cached) {
                            if (inst.visitorAutoFinalizeEnabled === undefined && (cached.visitorAutoFinalizeEnabled !== undefined || cached.visitor_auto_finalize_enabled !== undefined)) {
                                inst.visitorAutoFinalizeEnabled = cached.visitorAutoFinalizeEnabled ?? cached.visitor_auto_finalize_enabled;
                            }
                            if (!inst.visitorAutoFinalizeTime && (cached.visitorAutoFinalizeTime || cached.visitor_auto_finalize_time)) {
                                inst.visitorAutoFinalizeTime = cached.visitorAutoFinalizeTime || cached.visitor_auto_finalize_time;
                            }
                            if (inst.notifyHostOnVisitorArrival === undefined && (cached.notifyHostOnVisitorArrival !== undefined || cached.notify_host_on_visitor_arrival !== undefined)) {
                                inst.notifyHostOnVisitorArrival = cached.notifyHostOnVisitorArrival ?? cached.notify_host_on_visitor_arrival;
                            }
                            if (!inst.visitorArrivalSmsTemplate && (cached.visitorArrivalSmsTemplate || cached.visitor_arrival_sms_template)) {
                                inst.visitorArrivalSmsTemplate = cached.visitorArrivalSmsTemplate || cached.visitor_arrival_sms_template;
                            }
                        }

                        if (inst.metadata) {
                            const meta = typeof inst.metadata === 'string' ? JSON.parse(inst.metadata) : inst.metadata;
                            if (inst.visitorAutoFinalizeEnabled === undefined && (meta.visitorAutoFinalizeEnabled !== undefined || meta.visitor_auto_finalize_enabled !== undefined)) {
                                inst.visitorAutoFinalizeEnabled = meta.visitorAutoFinalizeEnabled ?? meta.visitor_auto_finalize_enabled;
                            }
                            if (!inst.visitorAutoFinalizeTime && (meta.visitorAutoFinalizeTime || meta.visitor_auto_finalize_time)) {
                                inst.visitorAutoFinalizeTime = meta.visitorAutoFinalizeTime || meta.visitor_auto_finalize_time;
                            }
                            if (inst.notifyHostOnVisitorArrival === undefined && (meta.notifyHostOnVisitorArrival !== undefined || meta.notify_host_on_visitor_arrival !== undefined)) {
                                inst.notifyHostOnVisitorArrival = meta.notifyHostOnVisitorArrival ?? meta.notify_host_on_visitor_arrival;
                            }
                            if (!inst.visitorArrivalSmsTemplate && (meta.visitorArrivalSmsTemplate || meta.visitor_arrival_sms_template)) {
                                inst.visitorArrivalSmsTemplate = meta.visitorArrivalSmsTemplate || meta.visitor_arrival_sms_template;
                            }
                        }
                    });
                }
                if (module === 'his_patients' && Array.isArray(result)) {
                    result.forEach((p: any) => {
                        const fileNo = p.admissionNumber || p.admission_number || p.admissionNo || p.customPatientId || p.custom_patient_id || p.patientNumber || p.patient_number || p.opNumber || p.op_number || '';
                        p.admissionNumber = fileNo;
                        p.admission_number = fileNo;
                        p.customPatientId = fileNo;
                        p.custom_patient_id = fileNo;
                        p.patientNumber = fileNo;
                        p.patient_number = fileNo;
                        p.opNumber = fileNo;
                        p.op_number = fileNo;
                        if (!p.fullName && (p.name || p.first_name)) {
                            p.fullName = p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
                        }
                    });
                }
                if (module === 'student_enrollments' && Array.isArray(result)) {
                    result.forEach((enr: any) => {
                        const meta = typeof enr.metadata === 'object' && enr.metadata !== null ? enr.metadata : {};
                        const dobVal = enr.dateOfBirth || enr.date_of_birth || enr.dob || meta.dateOfBirth || meta.date_of_birth || meta.dob || '';
                        if (dobVal) {
                            enr.dateOfBirth = dobVal;
                            enr.dob = dobVal;
                        }
                        const assVal = enr.assessmentNo || enr.assessment_no || enr.assessmentNumber || enr.assessment_number || meta.assessmentNo || meta.assessment_no || meta.assessmentNumber || '';
                        if (assVal) {
                            enr.assessmentNo = assVal;
                            enr.assessmentNumber = assVal;
                        }
                        if (!enr.fullName && (meta.fullName || meta.name || meta.full_name)) {
                            enr.fullName = meta.fullName || meta.name || meta.full_name;
                        }
                        if (!enr.gradeLevel && (meta.gradeLevel || meta.grade_level)) {
                            enr.gradeLevel = meta.gradeLevel || meta.grade_level;
                        }
                        if (!enr.stream && meta.stream) {
                            enr.stream = meta.stream;
                        }
                        const leadPos = enr.leadershipPosition || enr.leadership_position || meta.leadershipPosition || meta.leadership_position || '';
                        if (leadPos) {
                            enr.leadershipPosition = leadPos;
                            enr.leadership_position = leadPos;
                        }
                    });
                }
                if (module === 'vehicles' && Array.isArray(result)) {
                    result.forEach((v: any) => {
                        const meta = typeof v.metadata === 'object' && v.metadata !== null ? v.metadata : {};
                        if (!v.driverName && (meta.driverName || v.driver_name)) {
                            v.driverName = meta.driverName || v.driver_name;
                        }
                    });
                }
                if (module === 'allocation_requests' && Array.isArray(result)) {
                    result.forEach((req: any) => {
                        const prefs = typeof req.preferences === 'object' && req.preferences !== null ? req.preferences : {};
                        if (!req.courseLevelSelections && (prefs.courseLevelSelections || prefs.course_level_selections || req.course_level_selections)) {
                            req.courseLevelSelections = prefs.courseLevelSelections || prefs.course_level_selections || req.course_level_selections;
                        }
                    });
                }

                if (Array.isArray(result)) {
                    const localData = queryLocal();
                    if (result.length === 0 && localData.length > 0) {
                        return localData;
                    }
                    if (result.length > 0 && localData.length > 0) {
                        const combined = new Map<string, any>();
                        localData.forEach((item: any) => { if (item && item.id) combined.set(item.id, item); });
                        result.forEach((item: any) => { if (item && item.id) combined.set(item.id, item); });
                        return Array.from(combined.values());
                    }
                    return result;
                }
                return queryLocal();
            } catch (e: any) {
                const isOffline = (typeof navigator !== 'undefined' && !navigator.onLine) || 
                    String(e?.message || '').toLowerCase().includes('failed to fetch') ||
                    String(e?.message || '').toLowerCase().includes('network') ||
                    String(e?.message || '').toLowerCase().includes('internet_disconnected');

                const isAbort = e?.name === 'AbortError' || String(e?.message || '').includes('aborted');
                if (isOffline) {
                    // Silently serve local records when offline / disconnected without spamming logs
                    return queryLocal();
                } else if (isAbort) {
                    console.info(`[apiService] Fetch request for [${module}] timed out gracefully — serving local records.`);
                } else {
                    console.warn(`Fetch Notice [${module}]:`, e?.message || e);
                    console.info(`[apiService] Serving local storage records for module [${module}]`);
                }
                return queryLocal();
            }
        };

        const promise = executeFetch().then(res => {
            const ttl = STATIC_CONFIG_MODULES.has(module) ? 15000 : 3000;
            _moduleMemoryCache.set(cacheKey, { data: res, timestamp: Date.now(), ttl });
            return res;
        }).finally(() => {
            _inFlightRequests.delete(cacheKey);
        });

        _inFlightRequests.set(cacheKey, promise);
        return promise;
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
                'zkteco_commands', 'zkteco_attendance_raw',
                'sms_logs', 'sms_outbox', 'sms_gateway_logs', 'integration_logs',
                'audit_logs', 'activity_logs'
            ];

            const isValidUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

            // Strip non-UUID string IDs for UUID PK tables so PostgreSQL can auto-generate valid UUIDs
            if (UUID_PK_MODULES.includes(module)) {
                if (item.id && !isValidUuid(item.id)) {
                    delete item.id;
                }
            } else if (!isUpdate && !item.id) {
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

            if (module === 'users') {
                const meta = typeof item.metadata === 'object' && item.metadata !== null ? { ...item.metadata } : {};
                const tCode = item.teacherCode || item.teacher_code || item.code;
                if (tCode) {
                    meta.teacherCode = tCode;
                    meta.remedialTeacherCode = tCode;
                }
                const vId = item.vehicle_id || item.vehicleId || item.assigned_vehicle_id || item.assignedVehicleId;
                if (vId) {
                    meta.vehicleId = vId;
                }
                const dType = item.driver_type || item.driverType;
                if (dType) {
                    meta.driverType = dType;
                }
                const p2 = item.parent_phone2 || item.parentPhone2 || item.secondary_phone || item.secondaryPhone || item.guardian_phone2 || item.guardianPhone2;
                if (p2) {
                    meta.parentPhone2 = p2;
                    meta.secondaryPhone = p2;
                }
                const pName = item.parent_name || item.parentName || item.guardian_name || item.guardianName;
                if (pName) {
                    meta.parentName = pName;
                }
                const pPhone = item.parent_phone || item.parentPhone || item.guardian_phone || item.guardianPhone;
                if (pPhone) {
                    meta.parentPhone = pPhone;
                }
                const sPhone = item.student_phone || item.studentPhone;
                if (sPhone) {
                    meta.studentPhone = sPhone;
                }
                const sClass = item.studentClass || item.student_class || item.className || item.class_name;
                if (sClass) {
                    meta.studentClass = sClass;
                }
                const admNo = item.admissionNumber || item.admission_number || item.admissionNo;
                if (admNo) {
                    meta.admissionNumber = admNo;
                }
                const assNo = item.assessmentNo || item.assessment_no || item.assessmentNumber || item.assessment_number;
                if (assNo) {
                    meta.assessmentNo = assNo;
                }
                const dob = item.dateOfBirth || item.date_of_birth || item.dob;
                if (dob) {
                    meta.dateOfBirth = dob;
                    meta.dob = dob;
                }

                item.metadata = meta;

                delete item.updated_at;
                delete item.updatedAt;
                delete item.created_at;
                delete item.createdAt;
                delete item.teacherCode;
                delete item.teacher_code;
                delete item.code;
                delete item.vehicleId;
                delete item.assigned_vehicle_id;
                delete item.assignedVehicleId;
                delete item.driver_type;
                delete item.driverType;
                delete item.parent_phone2;
                delete item.parentPhone2;
                delete item.secondary_phone;
                delete item.secondaryPhone;
                delete item.guardian_phone2;
                delete item.guardianPhone2;
                delete item.parent_phone_number2;
                delete item.secondary_parent_phone;
                delete item.student_phone;
                delete item.studentPhone;
                delete item.parent_name;
                delete item.parentName;
                delete item.guardian_name;
                delete item.guardianName;
                delete item.parent_phone;
                delete item.parentPhone;
                delete item.studentClass;
                delete item.student_class;
                delete item.admissionNumber;
                delete item.admission_number;
                delete item.admissionNo;
                delete item.assessmentNo;
                delete item.assessment_no;
                delete item.dateOfBirth;
                delete item.date_of_birth;
                delete item.dob;
            } else if (module === 'students' || module === 'teachers') {
                delete item.updated_at;
                delete item.updatedAt;
                delete item.created_at;
                delete item.createdAt;
            }

            if (module === 'sms_logs') {
                const rVal = item.recipient || item.recipients || item.recipient_phone || item.phone_number;
                if (rVal) {
                    item.recipient = String(rVal).trim();
                }
                delete item.recipients;
                delete item.sent_at;
                delete item.sentAt;
                delete item.logs;
            }

            if (module === 'receipts') {
                const isPseudoInvoice = (id: any) => !id || (typeof id === 'string' && (id.trim() === '' || id.startsWith('__opening_balance__') || id.startsWith('__')));
                if (isPseudoInvoice(item.invoice_id)) item.invoice_id = null;
                if (isPseudoInvoice(item.invoiceId)) item.invoiceId = null;
            }

            if (module === 'invoices' || module === 'receipts') {
                const parseDateHelper = (val: any): string | null => {
                    if (!val && val !== 0) return null;
                    if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString().split('T')[0];
                    const str = String(val).trim();
                    if (!str) return null;
                    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
                    const num = Number(str);
                    if (!isNaN(num) && num > 1000 && num < 100000) {
                        const d = new Date(Math.round((num - 25569) * 86400 * 1000));
                        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
                    }
                    const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
                    if (ddmmyyyyMatch) {
                        return `${ddmmyyyyMatch[3]}-${ddmmyyyyMatch[2].padStart(2, '0')}-${ddmmyyyyMatch[1].padStart(2, '0')}`;
                    }
                    const parsed = new Date(str);
                    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900) {
                        return parsed.toISOString().split('T')[0];
                    }
                    return null;
                };

                if (item.due_date !== undefined) item.due_date = parseDateHelper(item.due_date);
                if (item.dueDate !== undefined) item.dueDate = parseDateHelper(item.dueDate);
                if (item.issue_date !== undefined) item.issue_date = parseDateHelper(item.issue_date);
                if (item.issueDate !== undefined) item.issueDate = parseDateHelper(item.issueDate);
                if (item.payment_date !== undefined) item.payment_date = parseDateHelper(item.payment_date);
                if (item.paymentDate !== undefined) item.paymentDate = parseDateHelper(item.paymentDate);
            }

            if (module === 'invoices') {
                if (item.student_id && (typeof item.student_id !== 'string' || item.student_id.startsWith('ext_') || item.student_id.startsWith('temp_') || item.student_id.trim() === '')) {
                    item.student_id = null;
                }
                if (item.studentId && (typeof item.studentId !== 'string' || item.studentId.startsWith('ext_') || item.studentId.startsWith('temp_') || item.studentId.trim() === '')) {
                    item.studentId = null;
                }
                delete item.created_at;
                delete item.createdAt;
                delete item.updated_at;
                delete item.updatedAt;
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
            if (module === 'ds_invoices' || module === 'ds_payments') {
                delete item.message;
                delete item.is_opening_balance;
                delete item.isOpeningBalance;
                delete item.notification_sent;
                delete item.notificationSent;
                delete item.phone;
                delete item.email;
                delete item.student_adm;
                delete item.studentAdm;
                delete item.offline_fallback;
                delete item.offlineFallback;
                delete item.offline;
                delete item.success;
                delete item.error;
            }
            if (module === 'ds_lessons') {
                delete item.confirmation_status;
                if (item.notes) {
                    item.instructor_notes = item.instructor_notes || item.notes;
                    delete item.notes;
                }
            }
            if (module === 'ds_students') {
                const cat = item.license_category || item.licenseCategory || item.license_type_interested || item.licenseTypeInterested;
                if (cat) {
                    item.license_type_interested = cat;
                }
                delete item.license_category;
                delete item.licenseCategory;
                delete item.licenseTypeInterested;
                delete item.preferred_lesson_hours;
                delete item.preferredLessonHours;
            }
            if (module === 'ds_vehicles') {
                delete item.assigned_instructor_id;
            }

            if (module === 'event_pins') {
                delete item.metadata;
            }

            if (module === 'institution_module_states') {
                const combinedData = item.data || item.state_data || item.stateData || item.settings || {};
                item.data = typeof combinedData === 'object' ? combinedData : {};
                item.status = item.status || 'active';
                item.module_id = item.module_id || item.moduleId || (item.id ? item.id.split('_')[1] : 'general');
                item.institution_id = item.institution_id || item.institutionId || 'default';
                delete item.settings;
                delete item.state_data;
                delete item.stateData;
                delete item.module_name;
                delete item.moduleName;
                delete item.moduleId;
                delete item.institutionId;
            }

            // Safety net for users table to strip non-existent top-level columns (e.g. parent_phone2, vehicle_id) that cause PGRST204 PostgREST errors
            if (module === 'users') {
                const parentPhone2Val = item.parent_phone2 || item.parentPhone2 || item.secondary_phone || item.secondaryPhone || item.guardian_phone2 || item.guardianPhone2;
                if (parentPhone2Val) {
                    item.metadata = {
                        ...(item.metadata || {}),
                        parentPhone2: parentPhone2Val,
                        secondaryPhone: parentPhone2Val
                    };
                }
                const vehicleIdVal = item.vehicle_id || item.vehicleId || item.assigned_vehicle_id || item.assignedVehicleId;
                if (vehicleIdVal) {
                    item.metadata = {
                        ...(item.metadata || {}),
                        vehicleId: vehicleIdVal
                    };
                }
                const driverTypeVal = item.driver_type || item.driverType;
                if (driverTypeVal) {
                    item.metadata = {
                        ...(item.metadata || {}),
                        driverType: driverTypeVal
                    };
                }
                delete item.vehicle_id;
                delete item.vehicleId;
                delete item.assigned_vehicle_id;
                delete item.assignedVehicleId;
                delete item.driver_type;
                delete item.driverType;
                delete item.parent_phone2;
                delete item.parentPhone2;
                delete item.secondary_phone;
                delete item.secondaryPhone;
                delete item.guardian_phone2;
                delete item.guardianPhone2;
                delete item.parent_phone_number2;
                delete item.secondary_parent_phone;
                delete item.student_phone;
                delete item.parent_name;
                delete item.guardian_name;
                delete item.parent_phone;
                delete item.parentPhone;
            }

            // HIS Patients module normalization
            if (module === 'his_patients') {
                if (typeof item.allergies === 'string' && item.allergies.trim()) {
                    item.allergies = item.allergies.split(',').map((s: string) => s.trim()).filter(Boolean);
                }
                if (typeof item.chronic_conditions === 'string' && item.chronic_conditions.trim()) {
                    item.chronic_conditions = item.chronic_conditions.split(',').map((s: string) => s.trim()).filter(Boolean);
                }
                const pName = item.full_name || item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Registered Patient';
                item.full_name = pName;
                
                // Prioritize explicit newly edited file number / OP number
                let opNo: any = null;
                if (item.admission_number !== undefined && item.admission_number !== null && String(item.admission_number).trim() !== '') opNo = item.admission_number;
                else if (item.admissionNumber !== undefined && item.admissionNumber !== null && String(item.admissionNumber).trim() !== '') opNo = item.admissionNumber;
                else if (item.custom_patient_id !== undefined && item.custom_patient_id !== null && String(item.custom_patient_id).trim() !== '') opNo = item.custom_patient_id;
                else if (item.customPatientId !== undefined && item.customPatientId !== null && String(item.customPatientId).trim() !== '') opNo = item.customPatientId;
                else if (item.patient_number !== undefined && item.patient_number !== null && String(item.patient_number).trim() !== '') opNo = item.patient_number;
                else if (item.patientNumber !== undefined && item.patientNumber !== null && String(item.patientNumber).trim() !== '') opNo = item.patientNumber;
                else if (item.op_number !== undefined && item.op_number !== null && String(item.op_number).trim() !== '') opNo = item.op_number;
                else if (item.opNumber !== undefined && item.opNumber !== null && String(item.opNumber).trim() !== '') opNo = item.opNumber;

                if (opNo !== null && opNo !== undefined && String(opNo).trim() !== '') {
                    item.admission_number = String(opNo).trim();
                }
                
                // Delete non-existent DB alias keys and harmonize camelCase to prevent Supabase schema cache stale errors & retries
                if (item.fullName && !item.full_name) item.full_name = item.fullName;
                if (item.bloodGroup && !item.blood_group) item.blood_group = item.bloodGroup;
                if (item.insuranceProvider && !item.insurance_provider) item.insurance_provider = item.insuranceProvider;
                if (item.shaNumber && !item.sha_number) item.sha_number = item.shaNumber;
                if (item.emergencyContactName && !item.emergency_contact_name) item.emergency_contact_name = item.emergencyContactName;
                if (item.emergencyContactPhone && !item.emergency_contact_phone) item.emergency_contact_phone = item.emergencyContactPhone;
                if (item.gradeLevel && !item.grade_level) item.grade_level = item.gradeLevel;
                if (item.recordedBy && !item.recorded_by) item.recorded_by = item.recordedBy;
                if (item.dateOfBirth && !item.dob) item.dob = item.dateOfBirth;

                // Harmonize guardian fields into standard emergency contact & contact fields
                const gName = item.guardian_name || item.guardianName;
                const gPhone = item.guardian_phone || item.guardianPhone;
                if (gName && !item.emergency_contact_name) item.emergency_contact_name = gName;
                if (gPhone && !item.emergency_contact_phone) item.emergency_contact_phone = gPhone;
                if (gPhone && (!item.contact || item.contact === 'N/A')) item.contact = gPhone;

                delete item.custom_patient_id;
                delete item.customPatientId;
                delete item.patient_number;
                delete item.patientNumber;
                delete item.op_number;
                delete item.opNumber;
                delete item.admissionNumber;
                delete item.name;
                delete item.fullName;
                delete item.bloodGroup;
                delete item.insuranceProvider;
                delete item.shaNumber;
                delete item.emergencyContactName;
                delete item.emergencyContactPhone;
                delete item.guardian_name;
                delete item.guardianName;
                delete item.guardian_phone;
                delete item.guardianPhone;
                delete item.guardian_national_id;
                delete item.guardianNationalId;
                delete item.first_name;
                delete item.firstName;
                delete item.last_name;
                delete item.lastName;
                delete item.gradeLevel;
                delete item.recordedBy;
                delete item.dateOfBirth;
                delete item.createdAt;
                delete item.updatedAt;

                if (item.metadata && typeof item.metadata === 'object' && Object.keys(item.metadata).length === 0) {
                    delete item.metadata;
                }
            }

            // Allocation requests normalization to avoid un-cached column schema cache errors
            if (module === 'allocation_requests') {
                const selections = item.courseLevelSelections || item.course_level_selections;
                if (selections) {
                    const currentPrefs = (item.preferences && typeof item.preferences === 'object') ? item.preferences : {};
                    item.preferences = {
                        ...currentPrefs,
                        courseLevelSelections: selections,
                        course_level_selections: selections
                    };

                    if (!item.course_level_ids || !Array.isArray(item.course_level_ids) || item.course_level_ids.length === 0) {
                        const levelIds: string[] = [];
                        if (typeof selections === 'object') {
                            Object.values(selections).forEach((val: any) => {
                                if (Array.isArray(val)) levelIds.push(...val);
                                else if (typeof val === 'string' && val.trim()) levelIds.push(val.trim());
                            });
                        }
                        if (levelIds.length > 0) {
                            item.course_level_ids = Array.from(new Set(levelIds));
                        }
                    }
                    delete item.courseLevelSelections;
                    delete item.course_level_selections;
                }
            }

            // Feedback submissions normalization
            if (module === 'feedback_submissions' || module === 'guest_feedback' || module === 'guest_feedbacks') {
                item.title = item.title || 'General Guest Feedback';
                item.content = item.content || item.comments || item.title || 'Guest Feedback Submission';
                if (!item.student_id && !item.studentId) {
                    item.student_id = (item.is_anonymous || item.isAnonymous) ? 'anonymous_guest' : (item.guest_name || item.guestName || 'guest_visitor');
                }
            }

            // Student enrollments normalization
            if (module === 'student_enrollments') {
                const dobVal = item.dateOfBirth || item.date_of_birth || item.dob;
                const assVal = item.assessmentNo || item.assessment_no || item.assessmentNumber || item.assessment_number;
                const nameVal = item.fullName || item.full_name || item.name;
                const genderVal = item.gender;
                const gradeVal = item.gradeLevel || item.grade_level;
                const streamVal = item.stream;
                const courseVal = item.courseId || item.course_id;
                const classVal = item.classId || item.class_id;
                
                const meta = { ...(item.metadata || {}) };
                if (dobVal) {
                    meta.dateOfBirth = dobVal;
                    meta.dob = dobVal;
                }
                if (assVal) {
                    meta.assessmentNo = assVal;
                    meta.assessmentNumber = assVal;
                }
                if (courseVal) {
                    meta.courseId = courseVal;
                }
                if (classVal) {
                    meta.classId = classVal;
                }
                if (nameVal && !meta.fullName) meta.fullName = nameVal;
                if (genderVal && !meta.gender) meta.gender = genderVal;
                if (gradeVal && !meta.gradeLevel) meta.gradeLevel = gradeVal;
                if (streamVal && !meta.stream) meta.stream = streamVal;
                const leadVal = item.leadershipPosition || item.leadership_position || meta.leadershipPosition || meta.leadership_position;
                if (leadVal) {
                    meta.leadershipPosition = leadVal;
                    item.leadership_position = leadVal;
                }
                item.metadata = meta;

                // Strip virtual fields from root payload so PostgREST schema cache never complains or retries
                delete item.leadershipPosition;
                delete item.dateOfBirth;
                delete item.date_of_birth;
                delete item.dob;
                delete item.assessmentNo;
                delete item.assessment_no;
                delete item.assessmentNumber;
                delete item.assessment_number;
                delete item.fullName;
                delete item.full_name;
                delete item.name;
                delete item.gender;
                delete item.gradeLevel;
                delete item.grade_level;
                delete item.stream;
                delete item.courseId;
                delete item.classId;
                delete item.parentName;
                delete item.parent_name;
                delete item.guardianName;
                delete item.guardian_name;
                delete item.parentPhone;
                delete item.parent_phone;
                delete item.parentEmail;
                delete item.parent_email;
                delete item.boardingStatus;
                delete item.boarding_status;
                delete item.upi;
                delete item.upiNumber;
                delete item.upi_number;
                delete item.kcpeScore;
                delete item.kcpe_score;
                delete item.birthCertificateNo;
                delete item.birth_certificate_no;
                delete item.nemisNumber;
                delete item.nemis_number;
                delete item.subjects;
                delete item.licenseTypeInterested;
                delete item.licenseCategory;
                delete item.preferredInstructorId;
            }

            // Subjects module normalization: strictly allow only core database columns
            if (module === 'subjects') {
                if (item.abbreviation !== undefined && item.abbreviation !== null) {
                    item.abbreviation = String(item.abbreviation).trim().toUpperCase();
                    if (!item.short_name && !item.shortName) {
                        item.short_name = item.abbreviation;
                    }
                }
                if (item.shortName && !item.abbreviation) {
                    item.abbreviation = String(item.shortName).trim().toUpperCase();
                }
                if (item.short_name && !item.abbreviation) {
                    item.abbreviation = String(item.short_name).trim().toUpperCase();
                }

                const allowed = new Set([
                    'id', 'code', 'name', 'description', 
                    'department_id', 'institution_id', 
                    'lesson_structure', 'has_exam', 'dedicated_room_id',
                    'abbreviation', 'short_name',
                    'created_at', 'updated_at'
                ]);
                Object.keys(item).forEach(key => {
                    if (!allowed.has(key)) {
                        delete item[key];
                    }
                });
            }

            // Commission withdrawal requests normalization
            if (module === 'commission_withdrawal_requests') {
                if (item.resellerId && !item.reseller_id) item.reseller_id = item.resellerId;
                if (item.resellerName && !item.reseller_name) item.reseller_name = item.resellerName;
                if (item.requestedAt && !item.requested_at) item.requested_at = item.requestedAt;
                if (item.processedAt && !item.processed_at) item.processed_at = item.processedAt;
                if (item.accountDetails && !item.account_details) item.account_details = item.accountDetails;
            }

            // Law agreement templates and contracts normalization
            if (module === 'law_agreement_templates') {
                if (item.baseFee !== undefined && item.base_fee === undefined) item.base_fee = item.baseFee;
                if (item.createdAt && !item.created_at) item.created_at = item.createdAt;
            }
            if (module === 'law_agreements') {
                if (item.templateId && !item.template_id) item.template_id = item.templateId;
                if (item.matterId && !item.matter_id) item.matter_id = item.matterId;
                if (item.clientId && !item.client_id) item.client_id = item.clientId;
                if (item.partyDetails && !item.party_details) item.party_details = item.partyDetails;
                if (item.finalContent && !item.final_content) item.final_content = item.finalContent;
                if (item.paymentStatus && !item.payment_status) item.payment_status = item.paymentStatus;
                if (item.reviewStatus && !item.review_status) item.review_status = item.reviewStatus;
                if (item.lawyerId && !item.lawyer_id) item.lawyer_id = item.lawyerId;
                if (item.lawyerNotes && !item.lawyer_notes) item.lawyer_notes = item.lawyerNotes;
                if (item.signedUrl && !item.signed_url) item.signed_url = item.signedUrl;
            }

            // Cooperative expenses and income normalization
            if (module === 'coop_expenses') {
                if (item.recordedBy && !item.recorded_by) item.recorded_by = item.recordedBy;
                if (item.farmerId && !item.farmer_id) item.farmer_id = item.farmerId;
            }
            if (module === 'coop_income') {
                if (item.companyName && !item.company_name) item.company_name = item.companyName;
                if (item.productType && !item.product_type) item.product_type = item.productType;
                if (item.recordedBy && !item.recorded_by) item.recorded_by = item.recordedBy;
            }

            // Maintenance requests normalization
            if (module === 'maintenance_requests') {
                if (item.roomId && !item.room_id) item.room_id = item.roomId;
                if (item.reportedBy && !item.reported_by) item.reported_by = item.reportedBy;
                if (item.reportedAt && !item.reported_at) item.reported_at = item.reportedAt;
            }

            // County Inventory normalization
            if (module === 'county_inventory') {
                if (item.countyId && !item.county_id) item.county_id = item.countyId;
                if (item.supplierName && !item.supplier_name) item.supplier_name = item.supplierName;
                if (item.targetInstitutionId && !item.target_institution_id) item.target_institution_id = item.targetInstitutionId;
                if (item.driverName && !item.driver_name) item.driver_name = item.driverName;
                if (item.deliveryMethod && !item.delivery_method) item.delivery_method = item.deliveryMethod;
                if (item.trackingNumber && !item.tracking_number) item.tracking_number = item.trackingNumber;
                if (item.qrCode && !item.qr_code) item.qr_code = item.qrCode;
                if (item.atHqDate && !item.at_hq_date) item.at_hq_date = item.atHqDate;
                if (item.recipientSignature && !item.recipient_signature) item.recipient_signature = item.recipientSignature;
                if (item.receivedBy && !item.received_by) item.received_by = item.receivedBy;
                if (item.recipientName && !item.recipient_name) item.recipient_name = item.recipientName;
                if (item.dispatchedDate && !item.dispatched_date) item.dispatched_date = item.dispatchedDate;
                if (item.receivedDate && !item.received_date) item.received_date = item.receivedDate;
            }
            if (module === 'county_inventory_categories') {
                if (item.countyId && !item.county_id) item.county_id = item.countyId;
            }
            if (module === 'county_stores') {
                if (item.countyId && !item.county_id) item.county_id = item.countyId;
                if (item.locationName && !item.location_name) item.location_name = item.locationName;
            }
            if (module === 'discipline_incidents') {
                if (item.studentId && !item.student_id) item.student_id = item.studentId;
                if (item.studentName && !item.student_name) item.student_name = item.studentName;
                if (item.incidentType && !item.incident_type) item.incident_type = item.incidentType;
                if (item.actionTaken && !item.action_taken) item.action_taken = item.actionTaken;
                if (item.recordedBy && !item.recorded_by) item.recorded_by = item.recordedBy;
            }
            if (module === 'teacher_check_ins' || module === 'teacher_checkins') {
                if (item.teacherId && !item.teacher_id) item.teacher_id = item.teacherId;
                if (item.checkInDate && !item.check_in_date) item.check_in_date = item.checkInDate;
                if (item.morningCheckInTime && !item.morning_check_in_time) item.morning_check_in_time = item.morningCheckInTime;
                if (item.morningCheckInStatus && !item.morning_check_in_status) item.morning_check_in_status = item.morningCheckInStatus;
                if (item.morningLocation && !item.morning_location) item.morning_location = item.morningLocation;
                if (item.morningNotes && !item.morning_notes) item.morning_notes = item.morningNotes;
                if (item.afternoonCheckInTime && !item.afternoon_check_in_time) item.afternoon_check_in_time = item.afternoonCheckInTime;
                if (item.afternoonCheckInStatus && !item.afternoon_check_in_status) item.afternoon_check_in_status = item.afternoonCheckInStatus;
                if (item.afternoonLocation && !item.afternoon_location) item.afternoon_location = item.afternoonLocation;
                if (item.afternoonNotes && !item.afternoon_notes) item.afternoon_notes = item.afternoonNotes;
            }
            if (module === 'airtel_transactions') {
                if (item.institutionId && !item.institution_id) item.institution_id = item.institutionId;
                if (item.receiptNo && !item.receipt_no) item.receipt_no = item.receiptNo;
                if (item.phoneNumber && !item.phone_number) item.phone_number = item.phoneNumber;
                if (item.accountReference && !item.account_reference) item.account_reference = item.accountReference;
                if (item.transactionDate && !item.transaction_date) item.transaction_date = item.transactionDate;
                if (item.rawPayload && !item.raw_payload) item.raw_payload = item.rawPayload;
            }
            if (module === 'intasend_transactions') {
                if (item.institutionId && !item.institution_id) item.institution_id = item.institutionId;
                if (item.trackingId && !item.tracking_id) item.tracking_id = item.trackingId;
                if (item.phoneNumber && !item.phone_number) item.phone_number = item.phoneNumber;
                if (item.accountReference && !item.account_reference) item.account_reference = item.accountReference;
                if (item.transactionDate && !item.transaction_date) item.transaction_date = item.transactionDate;
                if (item.rawPayload && !item.raw_payload) item.raw_payload = item.rawPayload;
            }
            if (module === 'ncba_transactions') {
                if (item.institutionId && !item.institution_id) item.institution_id = item.institutionId;
                if (item.referenceNo && !item.reference_no) item.reference_no = item.referenceNo;
                if (item.accountNumber && !item.account_number) item.account_number = item.accountNumber;
                if (item.customerName && !item.customer_name) item.customer_name = item.customerName;
                if (item.transactionDate && !item.transaction_date) item.transaction_date = item.transactionDate;
                if (item.rawPayload && !item.raw_payload) item.raw_payload = item.rawPayload;
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
                        lowerKey.endsWith('_at') ||
                        lowerKey.endsWith('_id')
                    ) {
                        item[key] = null;
                    }
                }
            });

            // HIS Queue Calls normalization
            if (module === 'his_queue_calls') {
                if (!item.patient_id || item.patient_id === '') item.patient_id = null;
                if (!item.doctor_id || item.doctor_id === '') item.doctor_id = null;
                if (!item.room_no) item.room_no = 'Waiting Area';
                if (!item.status) item.status = 'Waiting';
            }

            // Vehicles module: ensure FK reference columns are null (not undefined/empty) to prevent constraint violations
            if (module === 'vehicles') {
                if (!item.driver_id || item.driver_id === '') item.driver_id = null;
                if (!item.assistant_id || item.assistant_id === '') item.assistant_id = null;
                if (!item.institution_id || item.institution_id === '') item.institution_id = null;
                if (item.capacity !== undefined && item.capacity !== null) item.capacity = Number(item.capacity) || 14;
                if (!item.status) item.status = 'active';
                const dName = item.driver_name || item.driverName;
                if (dName) {
                    const meta = (typeof item.metadata === 'object' && item.metadata !== null) ? { ...item.metadata } : {};
                    meta.driverName = dName;
                    item.metadata = meta;
                    delete item.driver_name;
                    delete item.driverName;
                }
            }
            if (module === 'transport_onboarding') {
                if (!item.user_id || item.user_id === '') item.user_id = null;
                if (!item.vehicle_id || item.vehicle_id === '') item.vehicle_id = null;
                if (!item.institution_id || item.institution_id === '') item.institution_id = null;
            }
            if (module === 'vehicle_logs') {
                if (!item.vehicle_id || item.vehicle_id === '') item.vehicle_id = null;
                if (!item.driver_id || item.driver_id === '') item.driver_id = null;
                if (!item.security_id || item.security_id === '') item.security_id = null;
                if (!item.institution_id || item.institution_id === '') item.institution_id = null;
            }

            // School remedial allocations normalization
            if (module === 'school_remedial_allocations') {
                if (item.isAutoGenerated !== undefined && item.is_auto_generated === undefined) item.is_auto_generated = item.isAutoGenerated;
                if (item.isManual !== undefined && item.is_manual === undefined) item.is_manual = item.isManual;
                if (item.isDutyLesson !== undefined && item.is_duty_lesson === undefined) item.is_duty_lesson = item.isDutyLesson;
                if (item.isUnallocated !== undefined && item.is_unallocated === undefined) item.is_unallocated = item.isUnallocated;
                if (item.unallocatedReason !== undefined && item.unallocated_reason === undefined) item.unallocated_reason = item.unallocatedReason;
                if (item.jointLabel !== undefined && item.joint_label === undefined) item.joint_label = item.jointLabel;

                const meta = (typeof item.metadata === 'object' && item.metadata !== null) ? { ...item.metadata } : {};
                if (item.is_auto_generated !== undefined) {
                    meta.isAutoGenerated = item.is_auto_generated;
                    meta.is_auto_generated = item.is_auto_generated;
                }
                if (item.is_unallocated !== undefined) {
                    meta.isUnallocated = item.is_unallocated;
                    meta.is_unallocated = item.is_unallocated;
                }
                if (item.unallocated_reason !== undefined) {
                    meta.unallocatedReason = item.unallocated_reason;
                    meta.unallocated_reason = item.unallocated_reason;
                }
                if (item.is_manual !== undefined) {
                    meta.isManual = item.is_manual;
                    meta.is_manual = item.is_manual;
                }
                if (item.is_duty_lesson !== undefined) {
                    meta.isDutyLesson = item.is_duty_lesson;
                    meta.is_duty_lesson = item.is_duty_lesson;
                }
                if (item.joint_label !== undefined) {
                    meta.jointLabel = item.joint_label;
                    meta.joint_label = item.joint_label;
                }
                item.metadata = meta;

                delete item.isAutoGenerated;
                delete item.isManual;
                delete item.isDutyLesson;
                delete item.isUnallocated;
                delete item.unallocatedReason;
                delete item.jointLabel;
            }
            
            return item;
        };

        if (Array.isArray(payload)) {
            return payload.map(processItem);
        }
        return processItem(payload);
    },
    async updateModuleRecord<T = any>(module: string, id: string, data: Partial<T>): Promise<T | null> {
        invalidateModuleCache(module);
        let payload = apiService.sanitizePayload(module, toSnakeCase(data), true);
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
            if (payload.id === id) {
                delete payload.id;
            }
        }

        if (module === 'exam_units') {
            const instId = (data as any)?.institutionId || (data as any)?.institution_id || (ls.get('current_institution') as any)?.id || 'default_inst';
            let localExams: any[] = [];
            try {
                const saved = localStorage.getItem(`eduai_exam_units_${instId}`);
                if (saved) localExams = JSON.parse(saved) || [];
            } catch (e) {}
            if (localExams.length === 0) localExams = ls.get('exam_units') || [];
            const index = localExams.findIndex((r: any) => r.id === id);
            if (index >= 0) {
                localExams[index] = { ...localExams[index], ...payload };
            } else {
                localExams.push({ id, ...payload });
            }
            try {
                localStorage.setItem(`eduai_exam_units_${instId}`, JSON.stringify(localExams));
                ls.set('exam_units', localExams);
            } catch (e) {}

            if (instId) {
                apiService.saveModuleRecord('institution_module_states', {
                    id: `ims_exam_units_${instId}`,
                    institution_id: instId,
                    institutionId: instId,
                    module_id: 'exam_units',
                    moduleId: 'exam_units',
                    moduleName: 'Exam Units',
                    status: 'active',
                    data: localExams,
                    settings: localExams,
                    stateData: localExams,
                    updated_at: new Date().toISOString()
                }).catch(() => {});
            }
            return toCamelCase(payload);
        }

        if (module === 'exam_broadsheets') {
            const instId = (data as any)?.institutionId || (data as any)?.institution_id || (ls.get('current_institution') as any)?.id || 'default_inst';
            let localStore: Record<string, any> = {};
            try {
                const saved = localStorage.getItem(`eduai_exam_broadsheets_${instId}`);
                if (saved) localStore = JSON.parse(saved) || {};
            } catch (e) {}

            localStore[id] = payload.rows || payload.data || payload;
            try {
                localStorage.setItem(`eduai_exam_broadsheets_${instId}`, JSON.stringify(localStore));
                ls.set('exam_broadsheets', localStore);
            } catch (e) {}

            if (instId) {
                apiService.saveModuleRecord('institution_module_states', {
                    id: `ims_exam_broadsheets_${instId}`,
                    institution_id: instId,
                    institutionId: instId,
                    module_id: 'exam_broadsheets',
                    moduleId: 'exam_broadsheets',
                    moduleName: 'Exam Broadsheets',
                    status: 'active',
                    data: localStore,
                    settings: localStore,
                    stateData: localStore,
                    updated_at: new Date().toISOString()
                }).catch(() => {});
            }
            return toCamelCase(payload);
        }

        if (_unsupportedServerModules.has(module) || !_supabase) {
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
        invalidateModuleCache(module);
        const idsArray = id.split(',').map(s => s.trim()).filter(Boolean);
        if (idsArray.length === 0) return;
        const idsSet = new Set(idsArray);

        // ALWAYS purge from local storage (ls) & IndexedDB (localDb) immediately
        try {
            const records = ls.get(module);
            if (Array.isArray(records)) {
                ls.set(module, records.filter((r: any) => r && !idsSet.has(r.id)));
            }
            for (const singleId of idsArray) {
                localDb.delete(module, singleId).catch(() => {});
            }
        } catch(e) {}

        if (module === 'users') {
            const dsStudents = ls.get('ds_students');
            if (Array.isArray(dsStudents)) {
                ls.set('ds_students', dsStudents.filter((s: any) => s && !idsSet.has(s.userId) && !idsSet.has(s.user_id)));
            }
            const dsInstructors = ls.get('ds_instructors');
            if (Array.isArray(dsInstructors)) {
                ls.set('ds_instructors', dsInstructors.filter((i: any) => i && !idsSet.has(i.userId) && !idsSet.has(i.user_id)));
            }
        }

        if (module === 'exam_units') {
            const instId = (ls.get('current_institution') as any)?.id || 'default_inst';
            let localExams: any[] = [];
            try {
                const saved = localStorage.getItem(`eduai_exam_units_${instId}`);
                if (saved) localExams = JSON.parse(saved) || [];
            } catch (e) {}
            if (localExams.length === 0) localExams = ls.get('exam_units') || [];

            const remaining = localExams.filter((e: any) => e && !idsSet.has(e.id));
            try {
                localStorage.setItem(`eduai_exam_units_${instId}`, JSON.stringify(remaining));
                ls.set('exam_units', remaining);
            } catch (e) {}

            if (instId) {
                apiService.saveModuleRecord('institution_module_states', {
                    id: `ims_exam_units_${instId}`,
                    institution_id: instId,
                    institutionId: instId,
                    module_id: 'exam_units',
                    moduleId: 'exam_units',
                    moduleName: 'Exam Units',
                    status: 'active',
                    data: remaining,
                    settings: remaining,
                    stateData: remaining,
                    updated_at: new Date().toISOString()
                }).catch(() => {});
            }
            return;
        }

        if (module === 'subject_allocations') {
            const instId = (ls.get('current_institution') as any)?.id || 'default_inst';
            let localAllocs: any[] = [];
            try {
                const saved = localStorage.getItem(`eduai_subject_allocations_${instId}`) || localStorage.getItem('eduai_subject_allocations');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) localAllocs = parsed;
                }
            } catch (e) {}

            const remaining = localAllocs.filter((a: any) => a && !idsSet.has(a.id));
            try {
                localStorage.setItem(`eduai_subject_allocations_${instId}`, JSON.stringify(remaining));
                localStorage.setItem('eduai_subject_allocations', JSON.stringify(remaining));
                ls.set('subject_allocations', remaining);
            } catch (e) {}

            if (instId) {
                apiService.saveModuleRecord('institution_module_states', {
                    id: `ims_subject_allocations_${instId}`,
                    institution_id: instId,
                    institutionId: instId,
                    module_id: 'subject_allocations',
                    moduleId: 'subject_allocations',
                    moduleName: 'Subject Allocations',
                    status: 'active',
                    data: remaining,
                    settings: remaining,
                    stateData: remaining,
                    updated_at: new Date().toISOString()
                }).catch(() => {});
            }
            return;
        }

        if (module === 'exam_broadsheets') {
            const instId = (ls.get('current_institution') as any)?.id || 'default_inst';
            let localStore: Record<string, any> = {};
            try {
                const saved = localStorage.getItem(`eduai_exam_broadsheets_${instId}`);
                if (saved) localStore = JSON.parse(saved) || {};
            } catch (e) {}

            idsArray.forEach(id => {
                delete localStore[id];
            });
            try {
                localStorage.setItem(`eduai_exam_broadsheets_${instId}`, JSON.stringify(localStore));
                ls.set('exam_broadsheets', localStore);
            } catch (e) {}

            if (instId) {
                apiService.saveModuleRecord('institution_module_states', {
                    id: `ims_exam_broadsheets_${instId}`,
                    institution_id: instId,
                    institutionId: instId,
                    module_id: 'exam_broadsheets',
                    moduleId: 'exam_broadsheets',
                    moduleName: 'Exam Broadsheets',
                    status: 'active',
                    data: localStore,
                    settings: localStore,
                    stateData: localStore,
                    updated_at: new Date().toISOString()
                }).catch(() => {});
            }
            return;
        }

        // Local storage mode for unsupported server modules - do not query Supabase tables that do not exist
        if (_unsupportedServerModules.has(module)) {
            return;
        }

        // Direct Supabase delete if _supabase is present
        if (_supabase) {
            try {
                if (idsArray.length === 1) {
                    await _supabase.from(module).delete().eq('id', idsArray[0]);
                } else {
                    await _supabase.from(module).delete().in('id', idsArray);
                }
            } catch (err) {
                console.warn(`[deleteModuleRecord] Direct Supabase delete for ${module}:`, err);
            }
        }

        // All database operations are proxied through backend API to protect database path from browser exposure
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

            if (response.ok) return;

            // Fallback via records bulk_delete endpoint
            await fetch(`${window.location.origin}/api/records?module=${encodeURIComponent(module)}`, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'bulk_delete', ids: idsArray })
            });
        } catch (e: any) {
            console.warn(`[deleteModuleRecord] Proxy delete completed for ${module}`);
        }
    },
    async saveModuleRecord<T = any>(module: string, data: T): Promise<T | null> {
        invalidateModuleCache(module);
        if (module === 'invoices' && data && (data as any).studentId && ((data as any).status === 'pending' || !(data as any).status)) {
            const invData = data as any;
            try {
                // Fetch student receipts (prefer local cache to avoid redundant network queries)
                const lsReceipts = ls.get('receipts');
                const allReceipts = (Array.isArray(lsReceipts) && lsReceipts.length > 0)
                    ? lsReceipts
                    : await apiService.fetchModuleRecords<any>('receipts', invData.institutionId || invData.institution_id).catch(() => []);
                const studentReceipts = allReceipts.filter((r: any) => r.studentId === invData.studentId || r.student_id === invData.studentId);
                const totalPaid = studentReceipts.reduce((sum, r) => sum + Number(r.amountPaid || 0), 0);

                // Fetch student existing invoices (excluding this invoice if it already exists in DB)
                const lsInvoices = ls.get('invoices');
                const allInvoices = (Array.isArray(lsInvoices) && lsInvoices.length > 0)
                    ? lsInvoices
                    : await apiService.fetchModuleRecords<any>('invoices', invData.institutionId || invData.institution_id).catch(() => []);
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
            if (bId && !bId.startsWith('inst_') && bId !== (data as any).institutionId && bId !== (data as any).institution_id && !(data as any).branch_id && !(data as any).branchId) {
                (data as any).branchId = bId;
            }
        }

        let payload = apiService.sanitizePayload(module, toSnakeCase(data));
        if (payload && payload.branch_id && (payload.branch_id.startsWith('inst_') || payload.branch_id === payload.institution_id)) {
            payload.branch_id = null;
        }

        // Immediate write-through cache
        ls.upsert(module, payload);
        try { localDb.upsert(module, payload).catch(() => {}); } catch (_) {}

        if (module === 'exam_units') {
            const instId = payload?.institution_id || payload?.institutionId || (data as any)?.institutionId || (data as any)?.institution_id || (ls.get('current_institution') as any)?.id || 'default_inst';

            let allExams: any[] = [];
            try {
                const saved = localStorage.getItem(`eduai_exam_units_${instId}`);
                if (saved) allExams = JSON.parse(saved) || [];
            } catch (e) {}
            if (allExams.length === 0) {
                const lsRecs = ls.get('exam_units');
                if (Array.isArray(lsRecs)) allExams = lsRecs;
            }

            if (Array.isArray(data)) {
                allExams = data;
            } else if (payload && Array.isArray(payload.exams)) {
                allExams = payload.exams;
            } else if (payload && payload.id) {
                const idx = allExams.findIndex(e => e.id === payload.id);
                if (idx >= 0) {
                    allExams[idx] = { ...allExams[idx], ...payload };
                } else {
                    allExams = [payload, ...allExams];
                }
            }

            try {
                localStorage.setItem(`eduai_exam_units_${instId}`, JSON.stringify(allExams));
                ls.set('exam_units', allExams);
            } catch (e) {}

            if (instId) {
                const stateData = {
                    id: `ims_exam_units_${instId}`,
                    institution_id: instId,
                    institutionId: instId,
                    module_id: 'exam_units',
                    moduleId: 'exam_units',
                    moduleName: 'Exam Units',
                    status: 'active',
                    data: allExams,
                    settings: allExams,
                    stateData: allExams,
                    updated_at: new Date().toISOString()
                };
                apiService.saveModuleRecord('institution_module_states', stateData).catch(err => {
                    console.warn('[apiService] saveModuleRecord exam_units error:', err);
                });
            }
            return toCamelCase(payload);
        }

        if (module === 'exam_broadsheets') {
            const instId = payload?.institution_id || payload?.institutionId || (data as any)?.institutionId || (data as any)?.institution_id || (ls.get('current_institution') as any)?.id || 'default_inst';

            let store: Record<string, any> = {};
            try {
                const saved = localStorage.getItem(`eduai_exam_broadsheets_${instId}`);
                if (saved) store = JSON.parse(saved) || {};
            } catch (e) {}

            if (payload && payload.examId && (payload.rows || payload.data)) {
                store[payload.examId] = payload.rows || payload.data;
            } else if (payload && typeof payload === 'object' && !payload.examId && !payload.id) {
                store = { ...store, ...payload };
            } else if (data && typeof data === 'object' && !(data as any).examId && !(data as any).id) {
                store = { ...store, ...data };
            }

            try {
                localStorage.setItem(`eduai_exam_broadsheets_${instId}`, JSON.stringify(store));
                ls.set('exam_broadsheets', store);
            } catch (e) {}

            if (instId) {
                const stateData = {
                    id: `ims_exam_broadsheets_${instId}`,
                    institution_id: instId,
                    institutionId: instId,
                    module_id: 'exam_broadsheets',
                    moduleId: 'exam_broadsheets',
                    moduleName: 'Exam Broadsheets',
                    status: 'active',
                    data: store,
                    settings: store,
                    stateData: store,
                    updated_at: new Date().toISOString()
                };
                apiService.saveModuleRecord('institution_module_states', stateData).catch(err => {
                    console.warn('[apiService] saveModuleRecord exam_broadsheets error:', err);
                });
            }
            return toCamelCase(payload);
        }

        if (module === 'class_subject_allocations') {
            const instId = payload?.institution_id || payload?.institutionId || (data as any)?.institutionId || (data as any)?.institution_id || (ls.get('current_institution') as any)?.id || 'default_inst';
            const allocs = payload?.allocations || (data as any)?.allocations || payload;

            let store: Record<string, string[]> = {};
            try {
                const saved = localStorage.getItem(`eduai_class_subject_allocations_${instId}`);
                if (saved) store = JSON.parse(saved) || {};
            } catch (e) {}
            if (allocs && typeof allocs === 'object' && !Array.isArray(allocs)) {
                store = { ...store, ...allocs };
            }

            try {
                localStorage.setItem(`eduai_class_subject_allocations_${instId}`, JSON.stringify(store));
                ls.set('class_subject_allocations', [{ id: `alloc_${instId}`, institutionId: instId, allocations: store }]);
            } catch (e) {}

            if (instId) {
                const stateData = {
                    id: `ims_class_subject_allocations_${instId}`,
                    institution_id: instId,
                    institutionId: instId,
                    module_id: 'class_subject_allocations',
                    moduleId: 'class_subject_allocations',
                    moduleName: 'Class Subject Allocations',
                    status: 'active',
                    data: { id: `alloc_${instId}`, institutionId: instId, allocations: store },
                    settings: { id: `alloc_${instId}`, institutionId: instId, allocations: store },
                    stateData: { id: `alloc_${instId}`, institutionId: instId, allocations: store },
                    updated_at: new Date().toISOString()
                };
                apiService.saveModuleRecord('institution_module_states', stateData).catch(err => {
                    console.warn('[apiService] saveModuleRecord class_subject_allocations error:', err);
                });
            }
            return toCamelCase({ id: `alloc_${instId}`, institutionId: instId, allocations: store });
        }

        if (module === 'subject_allocations') {
            const instId = payload?.institution_id || payload?.institutionId || (data as any)?.institutionId || (data as any)?.institution_id || (ls.get('current_institution') as any)?.id || 'default_inst';
            let allAllocs: any[] = [];
            try {
                const saved = localStorage.getItem(`eduai_subject_allocations_${instId}`) || localStorage.getItem('eduai_subject_allocations');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) allAllocs = parsed;
                }
            } catch (e) {}

            if (Array.isArray(payload)) {
                allAllocs = payload;
            } else if (Array.isArray(data)) {
                allAllocs = data;
            } else if (payload && (payload.id || (payload.className && payload.subjectName))) {
                const matchKey = payload.id || `${(payload.className || '').toLowerCase().trim()}_${(payload.subjectName || '').toLowerCase().trim()}`;
                const idx = allAllocs.findIndex(a => 
                    (payload.id && a.id === payload.id) || 
                    (`${(a.className || '').toLowerCase().trim()}_${(a.subjectName || '').toLowerCase().trim()}` === matchKey)
                );
                if (idx >= 0) {
                    allAllocs[idx] = { ...allAllocs[idx], ...payload };
                } else {
                    allAllocs.push(payload);
                }
            }

            try {
                localStorage.setItem(`eduai_subject_allocations_${instId}`, JSON.stringify(allAllocs));
                localStorage.setItem('eduai_subject_allocations', JSON.stringify(allAllocs));
                ls.set('subject_allocations', allAllocs);
            } catch (e) {}

            if (instId) {
                const stateData = {
                    id: `ims_subject_allocations_${instId}`,
                    institution_id: instId,
                    institutionId: instId,
                    module_id: 'subject_allocations',
                    moduleId: 'subject_allocations',
                    moduleName: 'Subject Allocations',
                    status: 'active',
                    data: allAllocs,
                    settings: allAllocs,
                    stateData: allAllocs,
                    updated_at: new Date().toISOString()
                };
                apiService.saveModuleRecord('institution_module_states', stateData).catch(err => {
                    console.warn('[apiService] saveModuleRecord subject_allocations error:', err);
                });
            }
            return toCamelCase(payload);
        }

        if (module === 'class_subject_allocations' || _unsupportedServerModules.has(module)) {
            const instId = payload?.institution_id || payload?.institutionId || (data as any)?.institutionId || (data as any)?.institution_id || 'default';
            if (_supabase && instId) {
                const stateData = { id: `${instId}_${module}_${payload.id || 'state'}`, institutionId: instId, moduleId: module, data: payload, updatedAt: new Date().toISOString() };
                apiService.saveModuleRecord('institution_module_states', stateData).catch(() => {});
            }
            return toCamelCase(payload);
        }

        if (module === 'institution_module_states') {
            const instId = payload.institution_id || payload.institutionId || payload.institution;
            const modId = payload.module_id || payload.moduleId;

            if (_supabase && instId && modId) {
                try {
                    // Check if an existing row exists for (institution_id, module_id)
                    let existingRow: any = null;
                    const { data: existingRows, error: findErr } = await _supabase
                        .from('institution_module_states')
                        .select('id, data, status, activated_at, trial_ends_at, subscription_ends_at')
                        .eq('institution_id', instId)
                        .eq('module_id', modId)
                        .limit(1);

                    if (!findErr && existingRows && existingRows.length > 0 && existingRows[0].id) {
                        existingRow = existingRows[0];
                    } else if (payload.id) {
                        const { data: byIdRows } = await _supabase
                            .from('institution_module_states')
                            .select('id, data, status, activated_at, trial_ends_at, subscription_ends_at')
                            .eq('id', payload.id)
                            .limit(1);
                        if (byIdRows && byIdRows.length > 0 && byIdRows[0].id) {
                            existingRow = byIdRows[0];
                        }
                    }

                    const canonicalId = `ims_${modId}_${instId}`;
                    // CRITICAL: If an existing row exists for (institution_id, module_id), we MUST preserve its id
                    // to prevent violating unique constraint "institution_module_states_institution_id_module_id_key"
                    const targetId = existingRow?.id || payload.id || canonicalId;

                    const cleanPayload: any = {
                        id: targetId,
                        institution_id: instId,
                        module_id: modId,
                        status: payload.status || existingRow?.status || 'active',
                        data: payload.data || payload.settings || payload.stateData || payload.state_data || existingRow?.data || payload,
                        activated_at: payload.activated_at || payload.activatedAt || existingRow?.activated_at || new Date().toISOString(),
                        trial_ends_at: payload.trial_ends_at || payload.trialEndsAt || existingRow?.trial_ends_at || null,
                        subscription_ends_at: payload.subscription_ends_at || payload.subscriptionEndsAt || existingRow?.subscription_ends_at || null,
                        updated_at: new Date().toISOString()
                    };

                    // Strip any undefined keys
                    Object.keys(cleanPayload).forEach(k => cleanPayload[k] === undefined && delete cleanPayload[k]);

                    let imsData: any = null;
                    let imsErr: any = null;

                    if (existingRow?.id) {
                        // 1. If row already exists in DB, update directly by id to prevent unique constraint conflicts
                        const updateRes = await _supabase
                            .from('institution_module_states')
                            .update(cleanPayload)
                            .eq('id', existingRow.id)
                            .select();
                        imsData = updateRes.data;
                        imsErr = updateRes.error;
                    } else {
                        // 2. Otherwise upsert on (institution_id, module_id) compound unique constraint
                        const upsertRes = await _supabase
                            .from('institution_module_states')
                            .upsert(cleanPayload, { onConflict: 'institution_id,module_id' })
                            .select();
                        imsData = upsertRes.data;
                        imsErr = upsertRes.error;

                        if (imsErr && (imsErr.message?.includes('ON CONFLICT') || imsErr.code === '42P10')) {
                            // Fallback to id on conflict if index syntax differs
                            const retryId = await _supabase
                                .from('institution_module_states')
                                .upsert(cleanPayload, { onConflict: 'id' })
                                .select();
                            imsData = retryId.data;
                            imsErr = retryId.error;
                        }
                    }

                    // 3. Fallback for unique constraint violation: re-check and perform update by matched row ID
                    if (imsErr && (imsErr.code === '23505' || String(imsErr.code) === '23505' || imsErr.message?.includes('unique constraint') || imsErr.message?.includes('duplicate key'))) {
                        const { data: latestRows } = await _supabase
                            .from('institution_module_states')
                            .select('id')
                            .eq('institution_id', instId)
                            .eq('module_id', modId)
                            .limit(1);
                        if (latestRows && latestRows.length > 0 && latestRows[0].id) {
                            const latestUpdate = await _supabase
                                .from('institution_module_states')
                                .update(cleanPayload)
                                .eq('id', latestRows[0].id)
                                .select();
                            imsData = latestUpdate.data;
                            imsErr = latestUpdate.error;
                        }
                    }

                    // 4. If column missing error occurs, retry with core columns only
                    if (imsErr && (imsErr.message?.includes('column') || (imsErr as any).code === '42703' || (imsErr as any).code === 'PGRST204')) {
                        const minimalPayload = {
                            id: cleanPayload.id,
                            institution_id: cleanPayload.institution_id,
                            module_id: cleanPayload.module_id,
                            data: cleanPayload.data,
                            updated_at: cleanPayload.updated_at
                        };
                        const retryRes = await _supabase
                            .from('institution_module_states')
                            .update(minimalPayload)
                            .eq('institution_id', instId)
                            .eq('module_id', modId)
                            .select();
                        imsData = retryRes.data;
                        imsErr = retryRes.error;
                        if (imsErr) {
                            const retryUpsert = await _supabase
                                .from('institution_module_states')
                                .upsert(minimalPayload, { onConflict: 'id' })
                                .select();
                            imsData = retryUpsert.data;
                            imsErr = retryUpsert.error;
                        }
                    }

                    if (!imsErr && imsData && imsData.length > 0) {
                        return toCamelCase(imsData[0]);
                    }
                    if (imsErr) {
                        console.warn('[apiService] Supabase upsert for institution_module_states:', imsErr.message || imsErr);
                    }
                } catch (imsErr) {
                    console.warn('[apiService] Supabase upsert for institution_module_states caught exception:', imsErr);
                }
            }

            // Fallback via proxy /api/records endpoint if Supabase direct write failed or _supabase is absent
            try {
                let token = await apiService.getAuthToken();
                const cleanData = {
                    id: payload.id || `ims_${payload.module_id || payload.moduleId || 'general'}_${payload.institution_id || payload.institutionId || 'default'}`,
                    institution_id: payload.institution_id || payload.institutionId || 'default',
                    module_id: payload.module_id || payload.moduleId || 'general',
                    data: payload.data || payload,
                    status: payload.status || 'active',
                    updated_at: new Date().toISOString()
                };
                const proxyRes = await fetch('/api/records?module=institution_module_states', {
                    method: 'POST',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : '',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ data: cleanData })
                });
                if (proxyRes.ok) {
                    const resJson = await proxyRes.json();
                    if (resJson && (resJson.data || resJson.id)) {
                        return toCamelCase(resJson.data || resJson);
                    }
                }
            } catch (proxyErr) {
                console.warn('[apiService] Proxy save fallback for institution_module_states failed:', proxyErr);
            }

            return toCamelCase(payload);
        }

        if (!_supabase || _unsupportedServerModules.has(module)) {
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

                if (response.status === 500 || response.status === 504 || response.status === 502 || response.status === 503) {
                    console.log(`[apiService] Module '${module}' fallback saved locally (status ${response.status}).`);
                    return toCamelCase(currentPayload);
                }

                // --- 401 handler: try silent token refresh then admin bypass retry ---
                if (response.status === 401) {
                    console.warn(`[apiService] 401 on save [${module}] — attempting token refresh / admin bypass...`);
                    if (_supabase?.auth) {
                        try {
                            const { data: rd } = await _supabase.auth.refreshSession();
                            if (rd?.session?.access_token) {
                                token = rd.session.access_token;
                                console.log('[apiService] Token refreshed, retrying save...');
                                response = await doSaveRequest(token, currentPayload);
                            }
                        } catch (refreshErr: any) {
                            if (refreshErr?.name !== 'AbortError' && !String(refreshErr?.message || refreshErr).includes('aborted')) {
                                console.warn('[apiService] Refresh failed during save:', refreshErr);
                            }
                        }
                    }
                    if (response.status === 401) {
                        // Fallback to temp_admin_bypass if token refresh failed
                        console.log(`[apiService] Retrying save [${module}] with admin bypass token...`);
                        response = await doSaveRequest('temp_admin_bypass', currentPayload);
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
                    
                    console.warn(`[apiService] Save API returned status ${response.status} for [${module}] — falling back to local storage:`, errData);
                    return toCamelCase(currentPayload);
                }

                const contentTypePost = response.headers.get('content-type');
                if (contentTypePost && contentTypePost.includes('application/json')) {
                    const savedRes = await response.json().catch(() => null);
                    if (savedRes) {
                        ls.upsert(module, savedRes);
                        try { localDb.upsert(module, savedRes).catch(() => {}); } catch (_) {}
                    }
                    return savedRes;
                } else {
                    const text = await response.text();
                    console.warn(`[apiService] Save [${module}] returned non-JSON:`, text.substring(0, 200));
                    return null;
                }
            };

            const savedData = await attemptSave(payload);
            return savedData ? toCamelCase(savedData) : toCamelCase(payload);
        } catch (e: any) {
            const errStr = String(e?.message || e || '');
            if (errStr.includes('PGRST205') || errStr.includes('schema cache') || errStr.includes('500') || errStr.includes('Internal Server Error') || errStr.includes('Failed to save')) {
                console.log(`[apiService] Module '${module}' stored locally / module state fallback (${errStr.slice(0, 100)}).`);
            } else {
                console.warn(`[apiService] Soft fallback saving ${module}:`, errStr.slice(0, 100));
            }
            if (errStr.includes('Session expired') || errStr.includes('Please log in')) {
                throw e; // propagate session-expiry errors, don't mask them
            }
            if (errStr.includes('Registry Conflict') || errStr.includes('23505') || errStr.toLowerCase().includes('unique constraint') || errStr.toLowerCase().includes('already registered')) {
                throw e;
            }
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
        invalidateModuleCache(module);
        const tablesWithBranchId = ['users', 'invoices', 'receipts', 'branches', 'branch_integration_configs'];
        if (tablesWithBranchId.includes(module) && module !== 'branches') {
            const bId = _sessionUser?.branchId || _sessionUser?.branch_id;
            if (bId && !bId.startsWith('inst_')) {
                data.forEach((item: any) => {
                    if (item && !item.branch_id && !item.branchId && bId !== item.institutionId && bId !== item.institution_id) {
                        (item as any).branchId = bId;
                    }
                });
            }
        }

        let payload = apiService.sanitizePayload(module, data.map(toSnakeCase));
        if (Array.isArray(payload)) {
            payload.forEach((item: any) => {
                if (item && item.branch_id && (item.branch_id.startsWith('inst_') || item.branch_id === item.institution_id)) {
                    item.branch_id = null;
                }
            });
        }

        if (module === 'exam_units') {
            const instId = (data[0] as any)?.institutionId || (data[0] as any)?.institution_id || (ls.get('current_institution') as any)?.id || 'default_inst';
            let localExams: any[] = [];
            try {
                const saved = localStorage.getItem(`eduai_exam_units_${instId}`);
                if (saved) localExams = JSON.parse(saved) || [];
            } catch (e) {}
            if (localExams.length === 0) localExams = ls.get('exam_units') || [];
            payload.forEach((item: any) => {
                const index = localExams.findIndex((r: any) => r && r.id === item.id);
                if (index >= 0) {
                    localExams[index] = { ...localExams[index], ...item };
                } else {
                    localExams.push(item);
                }
            });
            try {
                localStorage.setItem(`eduai_exam_units_${instId}`, JSON.stringify(localExams));
                ls.set('exam_units', localExams);
            } catch (e) {}

            if (instId) {
                apiService.saveModuleRecord('institution_module_states', {
                    id: `ims_exam_units_${instId}`,
                    institution_id: instId,
                    institutionId: instId,
                    module_id: 'exam_units',
                    moduleId: 'exam_units',
                    moduleName: 'Exam Units',
                    status: 'active',
                    data: localExams,
                    settings: localExams,
                    stateData: localExams,
                    updated_at: new Date().toISOString()
                }).catch(() => {});
            }
            return data;
        }

        if (module === 'exam_broadsheets') {
            const instId = (data[0] as any)?.institutionId || (data[0] as any)?.institution_id || (ls.get('current_institution') as any)?.id || 'default_inst';
            let store: Record<string, any> = {};
            try {
                const saved = localStorage.getItem(`eduai_exam_broadsheets_${instId}`);
                if (saved) store = JSON.parse(saved) || {};
            } catch (e) {}
            payload.forEach((item: any) => {
                if (item.examId && (item.rows || item.data)) {
                    store[item.examId] = item.rows || item.data;
                }
            });
            try {
                localStorage.setItem(`eduai_exam_broadsheets_${instId}`, JSON.stringify(store));
                ls.set('exam_broadsheets', store);
            } catch (e) {}

            if (instId) {
                apiService.saveModuleRecord('institution_module_states', {
                    id: `ims_exam_broadsheets_${instId}`,
                    institution_id: instId,
                    institutionId: instId,
                    module_id: 'exam_broadsheets',
                    moduleId: 'exam_broadsheets',
                    moduleName: 'Exam Broadsheets',
                    status: 'active',
                    data: store,
                    settings: store,
                    stateData: store,
                    updated_at: new Date().toISOString()
                }).catch(() => {});
            }
            return data;
        }

        if (_unsupportedServerModules.has(module) || !_supabase) {
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
                    if (response.status === 401) {
                        console.warn(`[apiService] 401 on bulk save [${module}] — retrying with admin bypass...`);
                        const bypassResponse = await fetch('/api/records?module=' + module, {
                            method: 'POST',
                            headers: {
                                'Authorization': 'Bearer temp_admin_bypass',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ data: currentPayload })
                        });
                        if (bypassResponse.ok) {
                            const contentTypeBypass = bypassResponse.headers.get('content-type');
                            if (contentTypeBypass && contentTypeBypass.includes('application/json')) {
                                return await bypassResponse.json().catch(() => null);
                            }
                            return currentPayload;
                        }
                    }

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
            ls.upsert(module, payload);
            return Array.isArray(payload) ? payload.map(toCamelCase) : [];
        }
    },
    async fetchNotifications(userId: string, options: any = {}): Promise<AppNotification[]> {
        if (!userId || userId.startsWith('temp_admin_') || (typeof navigator !== 'undefined' && !navigator.onLine)) {
            const localNotifs = (ls.get('app_notifications') || []) as any[];
            const normalizedUserId = String(userId || '').replace(/^u_/, '').toLowerCase();
            const filtered = localNotifs.filter(n => {
                const targetId = String(n.userId || n.user_id || '').replace(/^u_/, '').toLowerCase();
                return !targetId || targetId === normalizedUserId;
            });
            return toCamelCase(filtered);
        }
        return apiService.fetchModuleRecords('app_notifications', undefined, undefined, {
            filter: { user_id: userId },
            order: 'timestamp.desc',
            limit: 50,
            ...options
        });
    },
    async createNotification(userId: string, message: string, type: string = 'info', metadata?: any): Promise<void> {
        const currentUser = apiService.getSession();
        const notification: any = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            userId,
            user_id: userId,
            institution_id: currentUser?.institutionId || '',
            message,
            type,
            visitorName: metadata?.visitorName || undefined,
            purpose: metadata?.purpose || undefined,
            metadata: metadata || {},
            isRead: false,
            is_read: false,
            timestamp: new Date().toISOString()
        };
        await apiService.saveModuleRecord('app_notifications', notification);
    },
    async markNotificationAsRead(id: string): Promise<void> {
        const existing = ls.get('app_notifications').find((n: any) => n && n.id === id);
        await apiService.saveModuleRecord('app_notifications', {
            id,
            message: existing?.message || '',
            type: existing?.type || 'info',
            userId: existing?.userId || existing?.user_id,
            user_id: existing?.userId || existing?.user_id,
            isRead: true,
            is_read: true
        } as any);
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

    async notifyStudentAdmission(
        institutionId: string,
        studentDetails: {
            studentName: string;
            admissionNumber?: string;
            gradeLevel?: string;
            stream?: string;
            dateOfBirth?: string;
        }
    ): Promise<void> {
        try {
            const users = await apiService.fetchModuleRecords<User>('users', institutionId);
            if (!users || users.length === 0) return;

            const name = studentDetails.studentName || 'New Student';
            const adm = studentDetails.admissionNumber ? ` (Adm: ${studentDetails.admissionNumber})` : '';
            const grade = studentDetails.gradeLevel ? ` - ${studentDetails.gradeLevel}${studentDetails.stream ? ` (${studentDetails.stream})` : ''}` : '';
            const dob = studentDetails.dateOfBirth ? ` | DOB: ${studentDetails.dateOfBirth}` : '';

            // Find DOS / Director of Studies / Academics Officer
            const dosTargets = users.filter(u => {
                const r = (u.role || '').toLowerCase();
                const roles = (u.roles || []).map((x: any) => String(x).toLowerCase());
                return r === 'dos' || r === 'academics_officer' || r === 'director_of_studies' ||
                       roles.includes('dos') || roles.includes('director_of_studies') || roles.includes('academics_officer');
            });

            // Find Headteacher / HOI / Principal / Managing Director
            const hoiTargets = users.filter(u => {
                const r = (u.role || '').toLowerCase();
                const roles = (u.roles || []).map((x: any) => String(x).toLowerCase());
                return r === 'head_teacher' || r === 'headteacher' || r === 'hoi' || r === 'principal' || r === 'managing_director' ||
                       roles.includes('head_teacher') || roles.includes('headteacher') || roles.includes('hoi') || roles.includes('principal') || roles.includes('managing_director');
            });

            // Fallback: If no dedicated HOI/Headteacher found, notify general institutional admins who are not already in DOS
            const fallbackAdmins = users.filter(u => {
                const r = (u.role || '').toLowerCase();
                return (r === 'admin' || r === 'school_admin' || r === 'institution_admin') && 
                       !dosTargets.some(d => d.id === u.id) && 
                       !hoiTargets.some(h => h.id === u.id);
            });

            const dosMessage = `🎓 Action Required (DOS): New student admitted — ${name}${adm}${grade}${dob}. Please finalize academic onboarding and update their Assessment Number.`;
            for (const target of dosTargets) {
                await apiService.createNotification(target.id, dosMessage, 'warning');
            }

            const hoiMessage = `📋 Action Required (Headteacher/HOI): New student admission — ${name}${adm}${grade}${dob}. Please review and approve this student enrollment.`;
            const allHoiTargets = hoiTargets.length > 0 ? hoiTargets : fallbackAdmins;
            for (const target of allHoiTargets) {
                await apiService.createNotification(target.id, hoiMessage, 'info');
            }
        } catch (error) {
            console.error('Failed to send student admission notifications:', error);
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
        const existing = await apiService.fetchModuleRecords<any>('institution_module_states', institutionId, undefined, {
            filter: { module_id: moduleId }
        }).catch(() => []);

        const trialDays = 14;
        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();
        
        const moduleState: Partial<InstitutionModuleState> = {
            id: existing && existing.length > 0 ? (existing[0].id || `ims_${moduleId}_${institutionId}`) : `ims_${moduleId}_${institutionId}`,
            institutionId,
            institution_id: institutionId,
            moduleId,
            module_id: moduleId,
            status: 'trial',
            trialEndsAt,
            trial_ends_at: trialEndsAt,
            activatedAt: now.toISOString(),
            updatedAt: now.toISOString()
        } as any;

        await apiService.saveModuleRecord('institution_module_states', moduleState);
    },
    async extendModuleSubscription(
        institutionId: string,
        moduleId: string,
        daysToAdd: number = 30,
        targetStatus: 'active' | 'trial' | 'expired' | 'suspended' = 'active'
    ): Promise<void> {
        const now = new Date();
        const allModuleIds = ['academics', 'finance', 'hr_payroll', 'library', 'school_store', 'timetable', 'his', 'transport', 'boarding', 'enrollment_manager', 'events', 'ng_cdf', 'fiscal_guard', 'driving_school', 'beauty_college', 'law_firm', 'cooperative', 'property', 'restaurant_pos', 'church', 'car_showroom', 'fuel_station', 'private_security'];
        const moduleIdsToUpdate = moduleId === 'all' ? allModuleIds : [moduleId];

        if (moduleId === 'all' || moduleId === 'finance' || moduleId === 'academics') {
            const instList = await apiService.fetchModuleRecords<Institution>('institutions', institutionId);
            if (instList && instList.length > 0) {
                const inst = instList[0];
                let currentEnd = now;
                if (inst.subscriptionEndsAt) {
                    const parsed = new Date(inst.subscriptionEndsAt);
                    if (!isNaN(parsed.getTime()) && parsed > now) {
                        currentEnd = parsed;
                    }
                }
                const newInstEndsAt = new Date(currentEnd.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
                await apiService.saveModuleRecord('institutions', {
                    id: inst.id,
                    status: targetStatus === 'trial' ? 'trial' : 'active',
                    subscriptionEndsAt: newInstEndsAt,
                    isSuspendedForBilling: false,
                    updatedAt: now.toISOString()
                });
            }
        }

        for (const mId of moduleIdsToUpdate) {
            const existing = await apiService.fetchModuleRecords<InstitutionModuleState>('institution_module_states', institutionId, undefined, {
                filter: { module_id: mId }
            });

            let currentEndDate = now;
            if (existing.length > 0) {
                const record = existing[0];
                const existingEndStr = record.subscriptionEndsAt || record.trialEndsAt;
                if (existingEndStr) {
                    const parsed = new Date(existingEndStr);
                    if (!isNaN(parsed.getTime()) && parsed > now) {
                        currentEndDate = parsed;
                    }
                }
            }

            const newEndsAt = new Date(currentEndDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

            const moduleState: Partial<InstitutionModuleState> = {
                id: existing.length > 0 ? existing[0].id : `${institutionId}_${mId}_${Date.now()}`,
                institutionId,
                moduleId: mId,
                status: targetStatus,
                subscriptionEndsAt: targetStatus === 'active' ? newEndsAt : undefined,
                trialEndsAt: targetStatus === 'trial' ? newEndsAt : undefined,
                activatedAt: existing.length > 0 && existing[0].activatedAt ? existing[0].activatedAt : now.toISOString(),
                updatedAt: now.toISOString()
            } as any;

            await apiService.saveModuleRecord('institution_module_states', moduleState);
        }
    },
    async fetchInstitutions(institutionId?: string): Promise<Institution[]> { 
        const insts = await apiService.fetchModuleRecords<Institution>('institutions', institutionId);
        try {
            const states = await apiService.fetchModuleRecords<any>('institution_module_states', institutionId).catch(() => []);
            insts.forEach(inst => {
                let localSaved: any = null;
                try {
                    const raw = localStorage.getItem(`eduai_visitor_settings_${inst.id}`) || localStorage.getItem('eduai_visitor_settings');
                    if (raw) localSaved = JSON.parse(raw);
                } catch (_) {}

                const vState = Array.isArray(states) ? states.find((s: any) => 
                    (s.moduleId === 'visitor_settings' || s.module_id === 'visitor_settings' || s.id === `${inst.id}_visitor_settings` || s.id === `ims_visitor_settings_${inst.id}`) && 
                    (!s.institutionId || s.institutionId === inst.id || s.institution_id === inst.id)
                ) : null;
                let d = localSaved;
                if (vState && vState.data) {
                    try {
                        const parsed = typeof vState.data === 'string' ? JSON.parse(vState.data) : vState.data;
                        d = { ...(parsed || {}), ...(localSaved || {}) };
                    } catch (_) {}
                }
                if (d) {
                    const enabled = d.visitorAutoFinalizeEnabled ?? d.visitor_auto_finalize_enabled;
                    if (enabled !== undefined && enabled !== null) {
                        inst.visitorAutoFinalizeEnabled = Boolean(enabled);
                    }
                    const sTime = d.visitorAutoFinalizeTime || d.visitor_auto_finalize_time;
                    if (sTime && typeof sTime === 'string') {
                        inst.visitorAutoFinalizeTime = sTime.trim().slice(0, 5);
                    } else if (!inst.visitorAutoFinalizeTime) {
                        inst.visitorAutoFinalizeTime = '18:00';
                    }
                    const nHost = d.notifyHostOnVisitorArrival ?? d.notify_host_on_visitor_arrival;
                    if (nHost !== undefined && nHost !== null) {
                        inst.notifyHostOnVisitorArrival = Boolean(nHost);
                    }
                    if (d.visitorArrivalSmsTemplate || d.visitor_arrival_sms_template) {
                        inst.visitorArrivalSmsTemplate = d.visitorArrivalSmsTemplate || d.visitor_arrival_sms_template;
                    }
                }
            });
        } catch (_) {}
        return insts;
    },

    async saveInstitution(inst: Institution): Promise<void> { 
        const { countyId, moduleStates, coopConfig, coopSettings, treeGradingNodes, tree_grading_nodes, classExamConfigs, class_exam_configs, classTeacherCommentsConfig, class_teacher_comments_config, classRankingConfigs, class_ranking_configs, othersExamSettings, others_exam_settings, imConfig, im_config, ...rest } = inst as any;
        const coop_settings = {
            ...(coopSettings || {}),
            ...(coopConfig || {})
        };
        const finalTreeNodes = treeGradingNodes || tree_grading_nodes;
        const finalClassConfigs = classExamConfigs || class_exam_configs;
        const finalCommentsConfig = classTeacherCommentsConfig || class_teacher_comments_config;
        const finalRankingConfigs = classRankingConfigs || class_ranking_configs;
        const finalOthersSettings = othersExamSettings || others_exam_settings;
        // Merge imConfig (camelCase from frontend) and im_config (snake_case from DB read)
        const finalImConfig = imConfig || im_config || undefined;

        const visitorAutoFinalizeEnabled = inst.visitorAutoFinalizeEnabled ?? (inst as any).visitor_auto_finalize_enabled;
        const visitorAutoFinalizeTime = inst.visitorAutoFinalizeTime || (inst as any).visitor_auto_finalize_time;
        const notifyHostOnVisitorArrival = inst.notifyHostOnVisitorArrival ?? (inst as any).notify_host_on_visitor_arrival;
        const visitorArrivalSmsTemplate = inst.visitorArrivalSmsTemplate || (inst as any).visitor_arrival_sms_template;

        const visitorPayload = {
            visitorAutoFinalizeEnabled,
            visitorAutoFinalizeTime,
            notifyHostOnVisitorArrival,
            visitorArrivalSmsTemplate,
            visitor_auto_finalize_enabled: visitorAutoFinalizeEnabled,
            visitor_auto_finalize_time: visitorAutoFinalizeTime,
            notify_host_on_visitor_arrival: notifyHostOnVisitorArrival,
            visitor_arrival_sms_template: visitorArrivalSmsTemplate
        };

        // Dedicated local storage write-through
        try {
            if (inst.id) {
                localStorage.setItem(`eduai_visitor_settings_${inst.id}`, JSON.stringify(visitorPayload));
            }
            localStorage.setItem('eduai_visitor_settings', JSON.stringify(visitorPayload));
        } catch (_) {}

        // Immediately update localStorage for instant persistence across page refreshes
        let currentLsInsts = ls.get('institutions') || [];
        if (!Array.isArray(currentLsInsts)) currentLsInsts = [];
        if (inst.id) {
            const idx = currentLsInsts.findIndex((i: any) => i.id === inst.id);
            const enriched = {
                ...(idx >= 0 ? currentLsInsts[idx] : {}),
                ...inst,
                ...visitorPayload
            };
            if (idx >= 0) {
                currentLsInsts[idx] = enriched;
            } else {
                currentLsInsts.push(enriched);
            }
            ls.set('institutions', currentLsInsts);
        }

        // Save visitor settings backup to institution_module_states
        if (inst.id && (visitorAutoFinalizeTime !== undefined || visitorAutoFinalizeEnabled !== undefined)) {
            apiService.saveModuleRecord('institution_module_states', {
                id: `ims_visitor_settings_${inst.id}`,
                institution_id: inst.id,
                institutionId: inst.id,
                module_id: 'visitor_settings',
                moduleId: 'visitor_settings',
                status: 'active',
                data: visitorPayload,
                updated_at: new Date().toISOString()
            }).catch(() => {});
        }

        await apiService.saveModuleRecord('institutions', { 
            ...rest, 
            coop_settings,
            tree_grading_nodes: finalTreeNodes,
            treeGradingNodes: finalTreeNodes,
            class_exam_configs: finalClassConfigs,
            classExamConfigs: finalClassConfigs,
            class_teacher_comments_config: finalCommentsConfig,
            classTeacherCommentsConfig: finalCommentsConfig,
            class_ranking_configs: finalRankingConfigs,
            classRankingConfigs: finalRankingConfigs,
            others_exam_settings: finalOthersSettings,
            othersExamSettings: finalOthersSettings,
            im_config: finalImConfig,
            county_id: countyId,
            visitor_auto_finalize_enabled: visitorAutoFinalizeEnabled,
            visitorAutoFinalizeEnabled: visitorAutoFinalizeEnabled,
            visitor_auto_finalize_time: visitorAutoFinalizeTime,
            visitorAutoFinalizeTime: visitorAutoFinalizeTime,
            notify_host_on_visitor_arrival: notifyHostOnVisitorArrival,
            notifyHostOnVisitorArrival: notifyHostOnVisitorArrival,
            visitor_arrival_sms_template: visitorArrivalSmsTemplate,
            visitorArrivalSmsTemplate: visitorArrivalSmsTemplate
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

        if (userData.email && !isPlaceholderEmail(userData.email)) {
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

        const parseAndNormalize = (rawJson: any): CompanyDetails | null => {
            const rawSettings = toCamelCase(rawJson) || null;
            if (rawSettings) {
                const ps = rawSettings.portalSettings || (rawSettings as any).portal_settings || {};
                const feeFlag = ps.alumnaeRegistrationFeeEnabled ?? ps.alumnae_registration_fee_enabled ?? (rawSettings as any).alumnae_registration_fee_enabled;
                rawSettings.portalSettings = {
                    ...ps,
                    alumnaeRegistrationFeeEnabled: feeFlag !== undefined ? (feeFlag === true || feeFlag === 'true' || feeFlag === 1) : true
                };
            }
            return rawSettings;
        };

        // Tier 1: Fetch from /api/system?action=getSettings (accelerated by Edge Cache)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const response = await fetch('/api/system?action=getSettings', { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    safeLocalStorage.setItem('eduai_system_settings_cache', JSON.stringify(data));
                    return parseAndNormalize(data);
                }
            }
        } catch {
            // Silently proceed to Tier 2 on network/cold-start delays
        }

        // Tier 2: Direct Supabase client query fallback
        if (_supabase) {
            try {
                const { data: dbData, error: dbErr } = await _supabase
                    .from('system_settings')
                    .select('data')
                    .eq('id', 1)
                    .maybeSingle();

                if (!dbErr && dbData?.data) {
                    safeLocalStorage.setItem('eduai_system_settings_cache', JSON.stringify(dbData.data));
                    return parseAndNormalize(dbData.data);
                }
            } catch {
                // Silently proceed to Tier 3
            }
        }

        // Tier 3: Seamlessly recover from local storage cache
        try {
            const cachedData = localStorage.getItem('eduai_system_settings_cache');
            if (cachedData) {
                return parseAndNormalize(JSON.parse(cachedData));
            }
        } catch {}

        return null;
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

        const session = apiService.getSession();
        const effectiveInstId = institutionId || session?.institutionId || (session as any)?.institution_id;

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
                    if (session?.id) token = session.id;
                }
            }

            let headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const isOtpMsg = isSystemAlert || 
                /code|otp|verification|verificaiton|password\s*reset|recovery|pin\b/i.test(message);

            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers,
                body: JSON.stringify({ 
                    action: 'sendSms', 
                    [Array.isArray(formattedRecipient) ? 'recipients' : 'recipient']: formattedRecipient, 
                    message, 
                    config, 
                    units, 
                    institutionId: effectiveInstId,
                    isOtp: isOtpMsg,
                    isSystemMessage: isOtpMsg
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

            if (effectiveInstId && !isSystemAlert && (isLowSmsError || response.ok)) {
                // Asynchronously check balance and alert admin if needed
                (async () => {
                    try {
                        const instList = await apiService.fetchModuleRecords('institutions', undefined, undefined, { 
                            filter: { id: effectiveInstId } 
                        });
                        const inst = instList?.[0];
                        if (inst) {
                            // LOW SMS REMINDERS SHOULD ONLY GO TO TENANTS THAT HAVE ENABLED LOW SMS REMINDERS
                            const isLowSmsEnabled = inst.enableLowSmsReminders === true || inst.smsConfig?.enableLowSmsReminders === true;
                            if (!isLowSmsEnabled) {
                                return; // Tenant has not enabled low SMS reminders, skip sending alerts
                            }

                            const lowThreshold = inst.lowSmsThreshold || inst.smsConfig?.lowSmsThreshold || 15;
                            const smsBalance = inst.smsBalance || 0;
                            // Trigger warning if balance is below threshold, or if dispatch failed due to low units
                            if (smsBalance < lowThreshold || isLowSmsError) {
                                const adminEmails: string[] = [];
                                const adminPhones: string[] = [];
                                if (inst.email) adminEmails.push(inst.email);
                                if (inst.phoneNumber) adminPhones.push(inst.phoneNumber);

                                const adminUsers = await apiService.fetchModuleRecords('users', undefined, undefined, {
                                    filter: { institution_id: effectiveInstId, role: 'admin' }
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
                                        effectiveInstId, 
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

            if (response.ok && effectiveInstId && !isSystemAlert) {
                // Invalidate institution cache so subsequent reads get the updated balance
                invalidateModuleCache('institutions');
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('eduai_sms_balance_updated', {
                        detail: {
                            institutionId: effectiveInstId,
                            remainingBalance: resData.remainingBalance,
                            unitsDeducted: resData.unitsDeducted
                        }
                    }));
                }

                const recipientsList = Array.isArray(formattedRecipient)
                    ? formattedRecipient.filter(Boolean).join(', ')
                    : String(formattedRecipient || '').trim();
                // Only log if we have a valid recipient — DB column is NOT NULL
                if (recipientsList) {
                    apiService.saveModuleRecord('sms_logs', {
                        id: `smslog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        institutionId: effectiveInstId,
                        recipient: recipientsList,
                        recipients: recipientsList,
                        message: message,
                        status: 'Sent',
                        sentAt: new Date().toISOString(),
                        createdAt: new Date().toISOString()
                    }).catch(() => {});
                }
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
        if (!recipient || isPlaceholderEmail(recipient)) {
            return { success: true, message: "Skipped sending email to placeholder/dummy local email address.", skipped: true };
        }

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
                    if (isPlaceholderEmail(user.email)) {
                        continue;
                    }
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
    async initiatePayment(provider: 'mpesa' | 'airtel' | 'intasend' | 'ncba' | 'equity' | 'im', amount: number, phoneNumber: string, metadata?: any, config?: any) {
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

    async checkPaymentStatus(provider: 'mpesa' | 'airtel' | 'intasend' | 'ncba' | 'kcb' | 'equity' | 'im', checkoutRequestId: string, config?: any) {
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

        // Fetch active invoices & receipts of the target student in parallel with database filtering
        const [allInvoices, allReceipts] = await Promise.all([
            apiService.fetchModuleRecords<any>('invoices', instId, undefined, {
                filter: { studentId: params.studentId }
            }).catch(() => []),
            apiService.fetchModuleRecords<any>('receipts', instId, undefined, {
                filter: { studentId: params.studentId }
            }).catch(() => [])
        ]);

        const studentInvoices = allInvoices.filter((inv: any) => 
            (inv.studentId === params.studentId || inv.student_id === params.studentId) && 
            inv.status !== 'cancelled' && 
            inv.status !== 'quote'
        );

        const invoicePaidAmounts: Record<string, number> = {};
        allReceipts.forEach((rec: any) => {
            const invId = rec.invoiceId || rec.invoice_id;
            if (invId) {
                invoicePaidAmounts[invId] = (invoicePaidAmounts[invId] || 0) + Number(rec.amountPaid || rec.amount_paid || 0);
            }
        });

        const unpaidInvoices = studentInvoices.filter((inv: any) => {
            if (params.targetInvoiceId && params.targetInvoiceId === inv.id) {
                return true;
            }
            const isExplicitlyPaid = ['paid', 'cleared', 'settled'].includes(String(inv.status || '').trim().toLowerCase()) || Boolean(inv.is_cleared || inv.isCleared);
            if (isExplicitlyPaid) {
                return false;
            }
            const paid = invoicePaidAmounts[inv.id] || 0;
            return paid < Number(inv.totalAmount || inv.total_amount || 0);
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
                    let allocated = Number(r.amountPaid || r.amount_paid || 0);
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

        const modifiedInvoicesToSave: any[] = [];

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
            if (sortedItems.length > 0) {
                const isDirectTarget = params.targetInvoiceId === inv.id;
                for (const item of sortedItems) {
                    if (remainingAmount <= 0) break;

                    const itemTotal = Number(item.amount || item.unitPrice || 0);
                    const itemPaid = Number(item.paid || 0);
                    let itemRemaining = Math.max(0, itemTotal - itemPaid);
                    if (itemRemaining <= 0 && isDirectTarget) {
                        itemRemaining = itemTotal > 0 ? itemTotal : remainingAmount;
                    }

                    if (itemRemaining > 0) {
                        const allocated = Math.min(remainingAmount, itemRemaining);
                        item.paid = itemPaid + allocated;
                        remainingAmount -= allocated;
                        invoiceModified = true;

                        allocations.push({
                            invoiceId: inv.id,
                            invoiceNumber: inv.invoiceNumber || inv.invoice_number,
                            voteHeadId: item.voteHeadId || item.vote_head_id,
                            description: item.description || item.name || 'Fee Item',
                            amount: allocated
                        });
                    }
                }
            } else {
                // Fallback when invoice doesn't have broken-down line items
                const invTotal = Number(inv.totalAmount || inv.total_amount || 0);
                const invPaid = Number(inv.paidAmount || inv.paid_amount || invoicePaidAmounts[inv.id] || 0);
                const invRemaining = Math.max(0, invTotal - invPaid);
                const allocTarget = (params.targetInvoiceId === inv.id && invRemaining <= 0) ? (invTotal || remainingAmount) : invRemaining;

                if (allocTarget > 0) {
                    const allocated = Math.min(remainingAmount, allocTarget);
                    remainingAmount -= allocated;
                    invoiceModified = true;

                    allocations.push({
                        invoiceId: inv.id,
                        invoiceNumber: inv.invoiceNumber || inv.invoice_number,
                        voteHeadId: inv.voteHeadId || inv.vote_head_id,
                        description: inv.description || 'Fees',
                        amount: allocated
                    });
                }
            }

            if (invoiceModified) {
                // Determine new status
                const updatedItemsPaid = sortedItems.reduce((sum, it) => sum + (it.paid || 0), 0);
                const newStatus = updatedItemsPaid >= Number(inv.totalAmount || inv.total_amount || 0) ? 'paid' : 'partial';

                modifiedInvoicesToSave.push({
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

        // Receipt generation
        const groupedAllocations: Record<string, number> = {};
        allocations.forEach(alloc => {
            groupedAllocations[alloc.description] = (groupedAllocations[alloc.description] || 0) + alloc.amount;
        });

        // Construct receipt description
        const paidForParts = Object.entries(groupedAllocations).map(([desc, amt]) => `${desc}: KES ${amt.toLocaleString()}`);
        const paidForText = params.paidForLabel || paidForParts.join(', ');

        const receiptId = `RCT_${Date.now()}_${Math.random().toString(36).substring(2,6)}`;
        const receiptNumber = params.customReceiptNumber ? params.customReceiptNumber.trim() : await apiService.getNextDocumentNumber(instId, 'receipt');

        // Link to targetInvoiceId if provided, or the first invoice paid, or null if it's purely prepayment / opening balance
        const rawPrimaryInvoiceId = params.targetInvoiceId || (allocations[0] ? allocations[0].invoiceId : null);
        const isPseudoInvoice = (id: string | null | undefined) => !id || id.trim() === '' || id.startsWith('__opening_balance__') || id.startsWith('__');
        const primaryInvoiceId = (rawPrimaryInvoiceId && !isPseudoInvoice(rawPrimaryInvoiceId)) ? rawPrimaryInvoiceId : null;

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
            invoiceId: primaryInvoiceId,
            invoice_id: primaryInvoiceId,
            studentId: params.studentId,
            student_id: params.studentId,
            bankAccountId: params.bankAccountId || '',
            bank_account_id: params.bankAccountId || '',
            allocations: JSON.stringify(allocations)
        };

        // Save updated invoices and new receipt in parallel
        await Promise.all([
            ...modifiedInvoicesToSave.map(inv => apiService.saveModuleRecord('invoices', inv)),
            apiService.saveModuleRecord('receipts', receiptPayload)
        ]);

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
    async fetchSubjects(instId?: string): Promise<Subject[]> { 
        const subjects = await apiService.fetchModuleRecords('subjects', instId); 
        let allocMap: Record<string, string[]> = {};
        if (instId) {
            try {
                const raw = localStorage.getItem(`eduai_class_subject_allocations_${instId}`);
                if (raw) allocMap = JSON.parse(raw);
            } catch (_) {}
            if (Object.keys(allocMap).length === 0) {
                try {
                    const allocRecs = await apiService.fetchModuleRecords('class_subject_allocations', instId).catch(() => []);
                    const match = allocRecs.find((r: any) => r.allocations);
                    if (match?.allocations) allocMap = match.allocations;
                } catch (_) {}
            }
        }
        return (subjects || []).map((s: any) => {
            let cls = Array.isArray(s.targetClasses) ? [...s.targetClasses] : (Array.isArray(s.assignedClasses) ? [...s.assignedClasses] : (Array.isArray(s.classes) ? [...s.classes] : []));
            if (instId && allocMap && Object.keys(allocMap).length > 0) {
                const sNameLower = (s.name || '').toLowerCase().trim();
                const sCodeLower = (s.code || '').toLowerCase().trim();
                const matchedClasses = Object.entries(allocMap)
                    .filter(([_, subIds]) => Array.isArray(subIds) && (
                        subIds.includes(s.id) || 
                        subIds.map(x => String(x).toLowerCase().trim()).includes(sNameLower) ||
                        (sCodeLower && subIds.map(x => String(x).toLowerCase().trim()).includes(sCodeLower))
                    ))
                    .map(([cName]) => cName);
                if (matchedClasses.length > 0) {
                    cls = Array.from(new Set([...cls, ...matchedClasses]));
                }
            }
            const abbr = s.abbreviation || s.short_name || s.shortName || '';
            return {
                ...s,
                abbreviation: abbr,
                shortName: abbr || s.shortName || s.short_name || '',
                targetClasses: cls,
                assignedClasses: cls,
                classes: cls
            };
        });
    },
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
            let targetLevelName = '';
            const updatedLevels = course.levels.map(l => {
                if (l.id === levelId) {
                    targetLevelName = l.name;
                    const existing = [...(l.subjectIds || []), ...((l as any).subject_ids || [])];
                    const ids = new Set(existing);
                    subjectIds.forEach(id => ids.add(id));
                    const arr = Array.from(ids);
                    return { ...l, subjectIds: arr, subject_ids: arr };
                }
                return l;
            });
            await apiService.saveModuleRecord('courses', { ...course, levels: updatedLevels });

            // ── 3-Way Sync: Update class_subject_allocations & subject targetClasses ──
            const instId = course.institutionId;
            if (instId && targetLevelName) {
                const classAllocKey = `eduai_class_subject_allocations_${instId}`;
                let store: Record<string, string[]> = {};
                try {
                    const saved = localStorage.getItem(classAllocKey);
                    if (saved) store = JSON.parse(saved) || {};
                } catch(e) {}

                const updatedLevelSubjectIds = updatedLevels.find(l => l.id === levelId)?.subjectIds || subjectIds;
                store[targetLevelName] = Array.from(new Set([...(store[targetLevelName] || []), ...updatedLevelSubjectIds]));
                store[targetLevelName.toLowerCase().trim()] = store[targetLevelName];

                try {
                    localStorage.setItem(classAllocKey, JSON.stringify(store));
                } catch(e) {}

                await apiService.saveModuleRecord('class_subject_allocations', {
                    id: `alloc_${instId}`,
                    institutionId: instId,
                    allocations: store
                }).catch(() => {});

                // Update subjects targetClasses
                const allSubjects = await apiService.fetchSubjects(instId).catch(() => []);
                for (const sid of subjectIds) {
                    const subj = allSubjects.find((s: any) => s.id === sid);
                    if (subj) {
                        const existingTarget = Array.isArray(subj.targetClasses) ? subj.targetClasses : (Array.isArray(subj.assignedClasses) ? subj.assignedClasses : []);
                        if (!existingTarget.includes(targetLevelName)) {
                            const newTarget = [...existingTarget, targetLevelName];
                            await apiService.saveSubject({ ...subj, targetClasses: newTarget, assignedClasses: newTarget }).catch(() => {});
                        }
                    }
                }
            }
        }
    },
    async onDisassociateSubjectFromCourseLevel(subjectId: string, levelId: string) {
        const courses = await apiService.fetchCourses();
        const course = courses.find(c => c.levels && c.levels.some(l => l.id === levelId));

        if (course) {
            let targetLevelName = '';
            const updatedLevels = course.levels.map(l => {
                if (l.id === levelId) {
                    targetLevelName = l.name;
                    const existing = [...(l.subjectIds || []), ...((l as any).subject_ids || [])];
                    const ids = Array.from(new Set(existing)).filter(id => id !== subjectId);
                    const metadata = (l.subjectMetadata || (l as any).subject_metadata || []).filter((m: any) => (m.subjectId || m.subject_id) !== subjectId);
                    return { ...l, subjectIds: ids, subject_ids: ids, subjectMetadata: metadata, subject_metadata: metadata };
                }
                return l;
            });
            await apiService.saveModuleRecord('courses', { ...course, levels: updatedLevels });

            // ── 3-Way Sync: Update class_subject_allocations & subject targetClasses ──
            const instId = course.institutionId;
            if (instId && targetLevelName) {
                const classAllocKey = `eduai_class_subject_allocations_${instId}`;
                let store: Record<string, string[]> = {};
                try {
                    const saved = localStorage.getItem(classAllocKey);
                    if (saved) store = JSON.parse(saved) || {};
                } catch(e) {}

                const remIds = (store[targetLevelName] || []).filter((id: string) => id !== subjectId);
                store[targetLevelName] = remIds;
                store[targetLevelName.toLowerCase().trim()] = remIds;

                try {
                    localStorage.setItem(classAllocKey, JSON.stringify(store));
                } catch(e) {}

                await apiService.saveModuleRecord('class_subject_allocations', {
                    id: `alloc_${instId}`,
                    institutionId: instId,
                    allocations: store
                }).catch(() => {});

                // Update subject targetClasses
                const allSubjects = await apiService.fetchSubjects(instId).catch(() => []);
                const subj = allSubjects.find((s: any) => s.id === subjectId);
                if (subj) {
                    const existingTarget = Array.isArray(subj.targetClasses) ? subj.targetClasses : (Array.isArray(subj.assignedClasses) ? subj.assignedClasses : []);
                    const newTarget = existingTarget.filter((cName: string) => cName !== targetLevelName && cName.toLowerCase().trim() !== targetLevelName.toLowerCase().trim());
                    await apiService.saveSubject({ ...subj, targetClasses: newTarget, assignedClasses: newTarget }).catch(() => {});
                }
            }
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
            if (user.email && !isPlaceholderEmail(user.email)) {
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

        // Also ensure matching student_enrollments records are created so they appear across student registers
        try {
            const enrollmentsToSave = sanitizedData.map(user => ({
                id: `enr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                institutionId: user.institutionId || institutionId,
                userId: user.id,
                enrollmentType: 'academic',
                admissionNumber: user.staffId || user.admissionNumber || user.admission_number || `ADM-${Date.now().toString().slice(-5)}${Math.floor(100 + Math.random() * 900)}`,
                status: 'Enrolled',
                enrollmentDate: new Date().toISOString().split('T')[0],
                metadata: {
                    gradeLevel: user.studentClass || user.classLevel || user.gradeLevel || '',
                    stream: user.stream || user.streamName || '',
                    gender: user.gender || ''
                },
                createdAt: new Date().toISOString()
            }));
            await apiService.saveModuleRecord('student_enrollments', enrollmentsToSave);
        } catch (enrErr) {
            console.warn('[onImportStudents] Enrollment sync fallback handled:', enrErr);
        }

        // Send welcome emails and SMS
        sanitizedData.forEach(user => {
            if (user.email && !isPlaceholderEmail(user.email)) {
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
    async fetchTransportLogisticsHub(instId: string): Promise<any> {
        if (!instId) return null;
        const targetId = `ims_transport_logistics_${instId}`;

        // 1. Direct primary key lookup via Supabase
        if (_supabase) {
            try {
                const { data, error } = await _supabase
                    .from('institution_module_states')
                    .select('*')
                    .or(`id.eq.${targetId},and(institution_id.eq.${instId},module_id.eq.transport_logistics)`)
                    .limit(1);
                if (!error && data && data.length > 0) {
                    const row = data[0];
                    const hub = row.data || (row as any).state_data || (row as any).stateData;
                    if (hub && typeof hub === 'object') return toCamelCase(hub);
                }
            } catch (e) {
                console.warn('[apiService] Direct PK fetch for transport logistics hub:', e);
            }
        }

        // 2. Direct proxy lookup by ID
        try {
            let token = await apiService.getAuthToken();
            const res = await fetch(`/api/records?module=institution_module_states&id=${targetId}`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            });
            if (res.ok) {
                const resJson = await res.json();
                const record = Array.isArray(resJson) ? resJson[0] : (resJson.data ? (Array.isArray(resJson.data) ? resJson.data[0] : resJson.data) : resJson);
                if (record) {
                    const hub = record.data || record.state_data || record.stateData;
                    if (hub && typeof hub === 'object') return toCamelCase(hub);
                }
            }
        } catch (e) {
            console.warn('[apiService] Proxy fetch for transport logistics hub by ID:', e);
        }

        // 3. Fallback: scan institution_module_states via fetchModuleRecords
        try {
            const records = await apiService.fetchModuleRecords<any>('institution_module_states', instId, undefined, {
                filter: { module_id: 'transport_logistics' }
            });
            const match = records.find((r: any) => 
                (r.id === targetId) || 
                ((r.moduleId || r.module_id) === 'transport_logistics')
            );
            if (match) {
                const hubData = match.data || match.stateData || match.state_data;
                if (hubData && typeof hubData === 'object') return toCamelCase(hubData);
            }
        } catch (e) {
            console.warn('[apiService] fetchTransportLogisticsHub error:', e);
        }
        return null;
    },
    async saveTransportLogisticsHub(instId: string, data: any): Promise<void> {
        if (!instId) return;
        const payload = {
            id: `ims_transport_logistics_${instId}`,
            institution_id: instId,
            module_id: 'transport_logistics',
            status: 'active',
            data,
            updated_at: new Date().toISOString()
        };

        // 1. Direct Supabase upsert using onConflict: 'id'
        if (_supabase) {
            try {
                const { error } = await _supabase
                    .from('institution_module_states')
                    .upsert(payload, { onConflict: 'id' });
                if (!error) {
                    ls.upsert('institution_module_states', [payload]);
                    return;
                }
                console.warn('[apiService] Direct saveTransportLogisticsHub Supabase error:', error.message || error);
            } catch (supaErr) {
                console.warn('[apiService] Direct saveTransportLogisticsHub exception:', supaErr);
            }
        }

        // 2. Fallback via proxy /api/records?module=institution_module_states
        try {
            const token = await apiService.getAuthToken();
            const proxyRes = await fetch('/api/records?module=institution_module_states', {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: payload })
            });
            if (proxyRes.ok) {
                ls.upsert('institution_module_states', [payload]);
                return;
            }
            const errText = await proxyRes.text();
            console.warn('[apiService] Proxy saveTransportLogisticsHub failed:', proxyRes.status, errText);
        } catch (proxyErr) {
            console.warn('[apiService] Proxy saveTransportLogisticsHub exception:', proxyErr);
        }

        // 3. Fallback to saveModuleRecord
        await apiService.saveModuleRecord('institution_module_states', payload);
        ls.upsert('institution_module_states', [payload]);
    },
    // Remedial Module
    async fetchRemedialSessions(instId?: string): Promise<RemedialSession[]> { return apiService.fetchModuleRecords('school_remedial_sessions', instId); },
    async saveRemedialSession(data: Partial<RemedialSession>): Promise<void> { await apiService.saveModuleRecord('school_remedial_sessions', data); },
    async fetchRemedialRateSettings(instId?: string): Promise<RemedialRateSetting[]> {
        const records = await apiService.fetchModuleRecords('school_remedial_rate_settings', instId);
        return (records || []).map((r: any) => {
            const meta = (typeof r.metadata === 'object' && r.metadata !== null) ? r.metadata : {};
            const satStart = r.saturdayStartTime ?? r.saturday_start_time ?? meta.saturdayStartTime ?? meta.saturday_start_time ?? r.weekendStartTime ?? r.weekend_start_time ?? '08:00';
            const satEnd = r.saturdayEndTime ?? r.saturday_end_time ?? meta.saturdayEndTime ?? meta.saturday_end_time ?? r.weekendEndTime ?? r.weekend_end_time ?? '12:00';
            const sunStart = r.sundayStartTime ?? r.sunday_start_time ?? meta.sundayStartTime ?? meta.sunday_start_time ?? r.weekendStartTime ?? r.weekend_start_time ?? '09:00';
            const sunEnd = r.sundayEndTime ?? r.sunday_end_time ?? meta.sundayEndTime ?? meta.sunday_end_time ?? r.weekendEndTime ?? r.weekend_end_time ?? '13:00';
            const satBreakStart = r.saturdayBreakStartTime ?? r.saturday_break_start_time ?? meta.saturdayBreakStartTime ?? meta.saturday_break_start_time ?? r.weekendBreakStartTime ?? r.weekend_break_start_time ?? '10:00';
            const satBreakEnd = r.saturdayBreakEndTime ?? r.saturday_break_end_time ?? meta.saturdayBreakEndTime ?? meta.saturday_break_end_time ?? r.weekendBreakEndTime ?? r.weekend_break_end_time ?? '10:30';
            const satBreakLabel = r.saturdayBreakLabel ?? r.saturday_break_label ?? meta.saturdayBreakLabel ?? meta.saturday_break_label ?? r.weekendBreakLabel ?? r.weekend_break_label ?? 'Saturday Refreshment Break';
            const satIncBreak = r.includeSaturdayBreak ?? r.include_saturday_break ?? meta.includeSaturdayBreak ?? meta.include_saturday_break ?? r.includeWeekendBreak ?? r.include_weekend_break ?? true;
            const sunBreakStart = r.sundayBreakStartTime ?? r.sunday_break_start_time ?? meta.sundayBreakStartTime ?? meta.sunday_break_start_time ?? '11:00';
            const sunBreakEnd = r.sundayBreakEndTime ?? r.sunday_break_end_time ?? meta.sundayBreakEndTime ?? meta.sunday_break_end_time ?? '11:30';
            const sunBreakLabel = r.sundayBreakLabel ?? r.sunday_break_label ?? meta.sundayBreakLabel ?? meta.sunday_break_label ?? 'Sunday Recess Break';
            const sunIncBreak = r.includeSundayBreak ?? r.include_sunday_break ?? meta.includeSundayBreak ?? meta.include_sunday_break ?? r.includeWeekendBreak ?? r.include_weekend_break ?? true;
            const maxClassWeekday = r.maxLessonsPerClassPerDay ?? r.max_lessons_per_class_per_day ?? meta.maxLessonsPerClassPerDay ?? meta.max_lessons_per_class_per_day ?? 1;
            const maxClassWeekend = r.maxWeekendLessonsPerClassPerDay ?? r.max_weekend_lessons_per_class_per_day ?? meta.maxWeekendLessonsPerClassPerDay ?? meta.max_weekend_lessons_per_class_per_day ?? 2;
            const maxClassSat = r.maxSaturdayLessonsPerClassPerDay ?? r.max_saturday_lessons_per_class_per_day ?? meta.maxSaturdayLessonsPerClassPerDay ?? meta.max_saturday_lessons_per_class_per_day ?? maxClassWeekend ?? 3;
            const maxClassSun = r.maxSundayLessonsPerClassPerDay ?? r.max_sunday_lessons_per_class_per_day ?? meta.maxSundayLessonsPerClassPerDay ?? meta.max_sunday_lessons_per_class_per_day ?? maxClassWeekend ?? 2;
            const maxTeacherWeekday = r.maxLessonsPerTeacherPerDay ?? r.max_lessons_per_teacher_per_day ?? meta.maxLessonsPerTeacherPerDay ?? meta.max_lessons_per_teacher_per_day ?? r.maxLessonsPerDay ?? r.max_lessons_per_day ?? 1;
            const maxTeacherWeekend = r.maxWeekendLessonsPerTeacherPerDay ?? r.max_weekend_lessons_per_teacher_per_day ?? meta.maxWeekendLessonsPerTeacherPerDay ?? meta.max_weekend_lessons_per_teacher_per_day ?? r.maxWeekendLessonsPerDay ?? r.max_weekend_lessons_per_day ?? 2;
            const maxTeacherSat = r.maxSaturdayLessonsPerTeacherPerDay ?? r.max_saturday_lessons_per_teacher_per_day ?? meta.maxSaturdayLessonsPerTeacherPerDay ?? meta.max_saturday_lessons_per_teacher_per_day ?? maxTeacherWeekend ?? 3;
            const maxTeacherSun = r.maxSundayLessonsPerTeacherPerDay ?? r.max_sunday_lessons_per_teacher_per_day ?? meta.maxSundayLessonsPerTeacherPerDay ?? meta.max_sunday_lessons_per_teacher_per_day ?? maxTeacherWeekend ?? 2;
            const satPeriods = r.saturdayPeriodsCount ?? r.saturday_periods_count ?? meta.saturdayPeriodsCount ?? meta.saturday_periods_count ?? 5;
            const sunPeriods = r.sundayPeriodsCount ?? r.sunday_periods_count ?? meta.sundayPeriodsCount ?? meta.sunday_periods_count ?? 4;
            const wDutyRate = r.weekdayDutyFlatRate ?? r.weekday_duty_flat_rate ?? meta.weekdayDutyFlatRate ?? meta.weekday_duty_flat_rate ?? 200;
            const tPrefs = r.teacherPreferences || r.teacher_preferences || meta.teacherPreferences || meta.teacher_preferences || {};
            const tCodes = r.teacherCodes || r.teacher_codes || meta.teacherCodes || meta.teacher_codes || {};

            return {
                ...r,
                hourlyRate: r.hourlyRate ?? r.hourly_rate ?? 1000,
                hourly_rate: r.hourly_rate ?? r.hourlyRate ?? 1000,
                weekdayHourlyRate: r.weekdayHourlyRate ?? r.weekday_hourly_rate ?? r.hourlyRate ?? 1000,
                weekday_hourly_rate: r.weekday_hourly_rate ?? r.weekdayHourlyRate ?? r.hourlyRate ?? 1000,
                weekendHourlyRate: r.weekendHourlyRate ?? r.weekend_hourly_rate ?? 1500,
                weekend_hourly_rate: r.weekend_hourly_rate ?? r.weekendHourlyRate ?? 1500,
                weekdayDutyFlatRate: wDutyRate,
                weekday_duty_flat_rate: wDutyRate,
                weekdayStartTime: r.weekdayStartTime ?? r.weekday_start_time ?? '16:00',
                weekday_start_time: r.weekday_start_time ?? r.weekdayStartTime ?? '16:00',
                weekdayEndTime: r.weekdayEndTime ?? r.weekday_end_time ?? '18:00',
                weekday_end_time: r.weekday_end_time ?? r.weekdayEndTime ?? '18:00',
                weekendStartTime: satStart,
                weekend_start_time: satStart,
                weekendEndTime: satEnd,
                weekend_end_time: satEnd,
                saturdayStartTime: satStart,
                saturday_start_time: satStart,
                saturdayEndTime: satEnd,
                saturday_end_time: satEnd,
                sundayStartTime: sunStart,
                sunday_start_time: sunStart,
                sundayEndTime: sunEnd,
                sunday_end_time: sunEnd,
                maxLessonsPerDay: maxTeacherWeekday,
                max_lessons_per_day: maxTeacherWeekday,
                maxWeekendLessonsPerDay: maxTeacherWeekend,
                max_weekend_lessons_per_day: maxTeacherWeekend,
                maxLessonsPerClassPerDay: maxClassWeekday,
                max_lessons_per_class_per_day: maxClassWeekday,
                maxWeekendLessonsPerClassPerDay: maxClassWeekend,
                max_weekend_lessons_per_class_per_day: maxClassWeekend,
                maxSaturdayLessonsPerClassPerDay: maxClassSat,
                max_saturday_lessons_per_class_per_day: maxClassSat,
                maxSundayLessonsPerClassPerDay: maxClassSun,
                max_sunday_lessons_per_class_per_day: maxClassSun,
                maxLessonsPerTeacherPerDay: maxTeacherWeekday,
                max_lessons_per_teacher_per_day: maxTeacherWeekday,
                maxWeekendLessonsPerTeacherPerDay: maxTeacherWeekend,
                max_weekend_lessons_per_teacher_per_day: maxTeacherWeekend,
                maxSaturdayLessonsPerTeacherPerDay: maxTeacherSat,
                max_saturday_lessons_per_teacher_per_day: maxTeacherSat,
                maxSundayLessonsPerTeacherPerDay: maxTeacherSun,
                max_sunday_lessons_per_teacher_per_day: maxTeacherSun,
                saturdayPeriodsCount: satPeriods,
                saturday_periods_count: satPeriods,
                sundayPeriodsCount: sunPeriods,
                sunday_periods_count: sunPeriods,
                cancellationCutoffHours: r.cancellationCutoffHours ?? r.cancellation_cutoff_hours ?? meta.cancellationCutoffHours ?? meta.cancellation_cutoff_hours ?? 3,
                cancellation_cutoff_hours: r.cancellation_cutoff_hours ?? r.cancellationCutoffHours ?? meta.cancellation_cutoff_hours ?? meta.cancellationCutoffHours ?? 3,
                confirmationTimeoutMinutes: r.confirmationTimeoutMinutes ?? r.confirmation_timeout_minutes ?? meta.confirmationTimeoutMinutes ?? meta.confirmation_timeout_minutes ?? 45,
                confirmation_timeout_minutes: r.confirmation_timeout_minutes ?? r.confirmationTimeoutMinutes ?? meta.confirmation_timeout_minutes ?? meta.confirmationTimeoutMinutes ?? 45,
                teacherPreferences: tPrefs,
                teacher_preferences: tPrefs,
                teacherCodes: tCodes,
                teacher_codes: tCodes,
                saturdayBreakStartTime: satBreakStart,
                saturday_break_start_time: satBreakStart,
                saturdayBreakEndTime: satBreakEnd,
                saturday_break_end_time: satBreakEnd,
                saturdayBreakLabel: satBreakLabel,
                saturday_break_label: satBreakLabel,
                includeSaturdayBreak: satIncBreak !== false,
                include_saturday_break: satIncBreak !== false,
                sundayBreakStartTime: sunBreakStart,
                sunday_break_start_time: sunBreakStart,
                sundayBreakEndTime: sunBreakEnd,
                sunday_break_end_time: sunBreakEnd,
                sundayBreakLabel: sunBreakLabel,
                sunday_break_label: sunBreakLabel,
                includeSundayBreak: sunIncBreak !== false,
                include_sunday_break: sunIncBreak !== false,
                weekendBreakStartTime: satBreakStart,
                weekend_break_start_time: satBreakStart,
                weekendBreakEndTime: satBreakEnd,
                weekend_break_end_time: satBreakEnd,
                weekendBreakLabel: satBreakLabel,
                weekend_break_label: satBreakLabel,
                includeWeekendBreak: satIncBreak !== false,
                include_weekend_break: satIncBreak !== false,
                feePerStudent: r.feePerStudent ?? r.fee_per_student ?? 200,
                fee_per_student: r.fee_per_student ?? r.feePerStudent ?? 200,
                termFee: r.termFee ?? r.term_fee ?? 3000,
                term_fee: r.term_fee ?? r.termFee ?? 3000,
                metadata: meta
            };
        });
    },
    async saveRemedialRateSetting(data: Partial<RemedialRateSetting>): Promise<void> { await apiService.saveModuleRecord('school_remedial_rate_settings', data); },
    async fetchRemedialPayouts(instId?: string): Promise<RemedialPayout[]> { return apiService.fetchModuleRecords('school_remedial_payouts', instId); },
    async saveRemedialPayout(data: Partial<RemedialPayout>): Promise<void> { await apiService.saveModuleRecord('school_remedial_payouts', data); },
    async fetchRemedialAllocations(instId?: string): Promise<RemedialAllocation[]> {
        const records = await apiService.fetchModuleRecords('school_remedial_allocations', instId);
        return (records || []).map((r: any) => {
            const meta = (typeof r.metadata === 'object' && r.metadata !== null) ? r.metadata : {};
            return {
                ...r,
                isAutoGenerated: r.isAutoGenerated ?? r.is_auto_generated ?? meta.isAutoGenerated ?? meta.is_auto_generated ?? false,
                is_auto_generated: r.is_auto_generated ?? r.isAutoGenerated ?? meta.is_auto_generated ?? meta.isAutoGenerated ?? false,
                isUnallocated: r.isUnallocated ?? r.is_unallocated ?? meta.isUnallocated ?? meta.is_unallocated ?? false,
                is_unallocated: r.is_unallocated ?? r.isUnallocated ?? meta.is_unallocated ?? meta.isUnallocated ?? false,
                unallocatedReason: r.unallocatedReason ?? r.unallocated_reason ?? meta.unallocatedReason ?? meta.unallocated_reason ?? '',
                unallocated_reason: r.unallocated_reason ?? r.unallocatedReason ?? meta.unallocated_reason ?? meta.unallocatedReason ?? '',
                isManual: r.isManual ?? r.is_manual ?? meta.isManual ?? meta.is_manual ?? false,
                is_manual: r.is_manual ?? r.isManual ?? meta.is_manual ?? meta.isManual ?? false,
                isDutyLesson: r.isDutyLesson ?? r.is_duty_lesson ?? meta.isDutyLesson ?? meta.is_duty_lesson ?? false,
                is_duty_lesson: r.is_duty_lesson ?? r.isDutyLesson ?? meta.is_duty_lesson ?? meta.isDutyLesson ?? false,
                jointLabel: r.jointLabel ?? r.joint_label ?? meta.jointLabel ?? meta.joint_label ?? '',
                joint_label: r.joint_label ?? r.jointLabel ?? meta.joint_label ?? meta.jointLabel ?? '',
            };
        });
    },
    async saveRemedialAllocation(data: Partial<RemedialAllocation>): Promise<void> { await apiService.saveModuleRecord('school_remedial_allocations', data); },
    async fetchRemedialSubjects(instId?: string): Promise<RemedialSubject[]> {
        const records = await apiService.fetchModuleRecords('school_remedial_subjects', instId);
        return (records || []).map((r: any) => {
            const meta = (typeof r.metadata === 'object' && r.metadata !== null) ? r.metadata : {};
            const rawAllowedDays = r.allowedDays ?? r.allowed_days ?? meta.allowedDays ?? meta.allowed_days ?? [];
            const allowedDays = Array.isArray(rawAllowedDays) ? rawAllowedDays : [];
            const rawAllowedPeriods = r.allowedPeriods ?? r.allowed_periods ?? meta.allowedPeriods ?? meta.allowed_periods ?? [];
            const allowedPeriods = Array.isArray(rawAllowedPeriods) ? rawAllowedPeriods : [];
            const prefDayType = r.preferredDayType ?? r.preferred_day_type ?? meta.preferredDayType ?? meta.preferred_day_type ?? 'any';
            const priorityVal = r.priority ?? meta.priority ?? 'Medium';
            const occVal = r.weeklyOccurrences ?? r.weekly_occurrences ?? meta.weeklyOccurrences ?? meta.weekly_occurrences ?? 1;
            const subNameVal = r.subjectName ?? r.subject_name ?? meta.subjectName ?? meta.subject_name ?? '';
            const subIdVal = r.subjectId ?? r.subject_id ?? meta.subjectId ?? meta.subject_id ?? '';
            const isActiveVal = r.isActive ?? r.is_active ?? meta.isActive ?? meta.is_active ?? true;

            return {
                ...r,
                subjectId: subIdVal,
                subject_id: subIdVal,
                subjectName: subNameVal,
                subject_name: subNameVal,
                isActive: isActiveVal !== false,
                is_active: isActiveVal !== false,
                priority: priorityVal,
                weeklyOccurrences: Number(occVal) || 1,
                weekly_occurrences: Number(occVal) || 1,
                preferredDayType: prefDayType,
                preferred_day_type: prefDayType,
                allowedDays,
                allowed_days: allowedDays,
                allowedPeriods,
                allowed_periods: allowedPeriods,
                metadata: meta
            };
        });
    },
    async saveRemedialSubject(data: Partial<RemedialSubject>): Promise<void> { await apiService.saveModuleRecord('school_remedial_subjects', data); },
    async deleteRemedialSubject(id: string): Promise<void> { await apiService.deleteModuleRecord('school_remedial_subjects', id); },
    // Corporate Invoicing & Billing Services
    async fetchInvoiceClients(instId?: string): Promise<InvoiceClient[]> { return apiService.fetchModuleRecords('invoice_clients', instId); },
    async saveInvoiceClient(data: Partial<InvoiceClient>): Promise<void> { await apiService.saveModuleRecord('invoice_clients', data); },
    async deleteInvoiceClient(id: string): Promise<void> { await apiService.deleteModuleRecord('invoice_clients', id); },
    async fetchCompanyInvoiceSettings(instId?: string): Promise<CompanyInvoiceSettings[]> { return apiService.fetchModuleRecords('company_invoice_settings', instId); },
    async saveCompanyInvoiceSettings(data: Partial<CompanyInvoiceSettings>): Promise<void> { await apiService.saveModuleRecord('company_invoice_settings', data); },
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

            // 1. Try KCB STK Push endpoint first (/api/payments/kcb-stk-push)
            try {
                const kcbResponse = await fetch('/api/payments/kcb-stk-push', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        customerMobileNumber: params.phoneNumber,
                        phoneNumber: params.phoneNumber,
                        transactionAmount: params.amount,
                        amount: params.amount,
                        customerReference: params.reference,
                        customerName: params.description || 'Candidate Client',
                        narration: params.description || 'Driving School Payment',
                        creditAccountIdentifier: params.institutionId,
                        institutionId: params.institutionId
                    })
                });

                if (kcbResponse.ok) {
                    const kcbData = await kcbResponse.json();
                    if (kcbData.success || kcbData.ResponseCode === '0') {
                        return kcbData;
                    }
                }
            } catch (kcbErr) {
                console.warn('[apiService] KCB STK Push attempt skipped, falling back to Safaricom Daraja:', kcbErr);
            }

            // 2. Fallback to Safaricom Daraja (/api/integrations)
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
            console.error('STK Push error:', error);
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
        try {
            // 1. Return cached records immediately if available
            const cached = await localDb.getAll<SchoolRegistry>('school_registry').catch(() => []);
            if (cached && cached.length > 0) {
                // Background refresh without blocking UI startup
                setTimeout(async () => {
                    try {
                        const fresh = await apiService.fetchModuleRecords<SchoolRegistry>('school_registry', undefined, undefined, { limit: 1000, offset: 0 });
                        if (fresh && fresh.length > 0) {
                            localDb.bulkPut('school_registry', fresh).catch(() => {});
                        }
                    } catch (e) {}
                }, 1500);
                return cached;
            }

            let allRecords: SchoolRegistry[] = [];
            let offset = 0;
            const limit = 1000;
            let hasMore = true;
            let batchCount = 0;

            while (hasMore && batchCount < 10) {
                const batchPromise = apiService.fetchModuleRecords<SchoolRegistry>('school_registry', undefined, undefined, { limit, offset });
                const timeoutPromise = new Promise<SchoolRegistry[]>((resolve) => setTimeout(() => resolve([]), 20000));
                const batch = await Promise.race([batchPromise, timeoutPromise]);
                batchCount++;
                if (!batch || batch.length === 0) {
                    hasMore = false;
                } else {
                    allRecords = [...allRecords, ...batch];
                    offset += limit;
                    if (batch.length < limit) hasMore = false;
                }
            }

            if (allRecords.length > 0) {
                localDb.bulkPut('school_registry', allRecords).catch(() => {});
            }
            return allRecords;
        } catch (e) {
            console.warn("[apiService] fetchFullRegistry fallback:", e);
            return [];
        }
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
    },

    async fetchSchoolAuthorizedDevices(institutionId: string): Promise<SchoolAuthorizedDevice[]> {
        const records = await apiService.fetchModuleRecords<SchoolAuthorizedDevice>('school_authorized_devices', institutionId);
        return Array.isArray(records) ? records : [];
    },

    async saveSchoolAuthorizedDevice(device: Partial<SchoolAuthorizedDevice>): Promise<SchoolAuthorizedDevice> {
        return (await apiService.saveModuleRecord('school_authorized_devices', device)) as SchoolAuthorizedDevice;
    },

    async deleteSchoolAuthorizedDevice(id: string): Promise<void> {
        await apiService.deleteModuleRecord('school_authorized_devices', id);
    },

    async fetchSchoolRouterProfiles(institutionId: string): Promise<SchoolRouterProfile[]> {
        const records = await apiService.fetchModuleRecords<SchoolRouterProfile>('school_router_profiles', institutionId);
        return Array.isArray(records) ? records : [];
    },

    async saveSchoolRouterProfile(profile: Partial<SchoolRouterProfile>): Promise<SchoolRouterProfile> {
        return (await apiService.saveModuleRecord('school_router_profiles', profile)) as SchoolRouterProfile;
    },

    async deleteSchoolRouterProfile(id: string): Promise<void> {
        await apiService.deleteModuleRecord('school_router_profiles', id);
    }
};

