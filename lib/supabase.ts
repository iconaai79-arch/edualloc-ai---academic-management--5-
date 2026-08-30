import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Environment Variables
 * - Supports standard and VITE_ prefixed variables for Vercel/Local compatibility
 * - Safely accesses process.env (Node) and import.meta.env (Vite)
 */
const getEnv = () => {
    if (typeof process !== 'undefined' && process.env) return process.env;
    // @ts-ignore - Vite specific
    if (typeof import.meta !== 'undefined' && import.meta.env) return import.meta.env;
    return {} as any;
};

const env = getEnv();

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

/**
 * Debug Logs for missing env vars
 */
if (!SUPABASE_URL) console.error('[Supabase] Missing SUPABASE_URL. Check Vercel dashboard or .env.local');
if (!SUPABASE_ANON_KEY) console.warn('[Supabase] Missing SUPABASE_ANON_KEY. Public frontend access will fail.');
if (!SUPABASE_SERVICE_ROLE_KEY) console.warn('[Supabase] Missing SUPABASE_SERVICE_ROLE_KEY. Server-side API proxies will return 500.');
else console.log('[Supabase] Service Role Key detected.');

const safeAuthLock = async (_name: string, _acquireTimeout: number, fn: () => Promise<any>): Promise<any> => {
    return await fn();
};

/**
 * FRONTEND CLIENT
 * - For browser/React usage
 * - Uses ANON key
 */
export let supabase: SupabaseClient | null =
    SUPABASE_URL && SUPABASE_ANON_KEY
        ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                lock: safeAuthLock
            }
        })
        : null;

/**
 * Re-initializes the shared Supabase client (e.g. for dynamic config changes)
 */
export const initSupabase = (url: string, key: string) => {
    if (url && key) {
        supabase = createClient(url, key, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                lock: safeAuthLock
            }
        });
        return supabase;
    }
    return null;
};

/**
 * SERVER CLIENT (API routes)
 * - Uses SERVICE ROLE key
 * - Optional: add user's auth header for auditing/logging
 */
export const createServerClient = (authHeader?: string): SupabaseClient | null => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[Supabase] Cannot create server client: missing URL or service role key');
        return null;
    }

    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        global: {
            headers: authHeader ? { Authorization: authHeader } : undefined
        }
    });
};

/**
 * Creates a privileged Supabase client using the SERVICE_ROLE_KEY.
 * Use this ONLY on the server to bypass RLS.
 */
export const createServiceClient = (): SupabaseClient | null => {
    if (!SUPABASE_URL) {
        console.error('[Supabase] Cannot create service client: SUPABASE_URL is missing.');
        return null;
    }
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[Supabase] Cannot create service client: SUPABASE_SERVICE_ROLE_KEY is missing.');
        return null;
    }

    try {
        return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    } catch (err) {
        console.error('[Supabase] Factory error:', err);
        return null;
    }
};

/**
 * UTILITY: Optional helper to pick the right client
 * - Use this in API routes if you want auto-switching
 */
export const getSupabaseClient = (serverSide = false, authHeader?: string): SupabaseClient | null => {
    if (serverSide) return createServerClient(authHeader);
    return supabase;
};