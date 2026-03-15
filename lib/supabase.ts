import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Environment Variables
 */
/**
 * Environment Variables
 * - Supports standard and VITE_ prefixed variables for Vercel/Local compatibility
 * - Safely accesses process.env to prevent crashes in non-Node environments
 */
const env = typeof process !== 'undefined' ? process.env : {} as any;

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

/**
 * Debug Logs for missing env vars
 */
if (!SUPABASE_URL) console.error('[Supabase] Missing SUPABASE_URL or VITE_SUPABASE_URL');
if (!SUPABASE_ANON_KEY) console.warn('[Supabase] Missing SUPABASE_ANON_KEY (frontend client will not work)');
if (!SUPABASE_SERVICE_ROLE_KEY) console.warn('[Supabase] Missing SUPABASE_SERVICE_ROLE_KEY (server API routes may fail)');
else console.log('[Supabase] Service Role Key detected.');

/**
 * FRONTEND CLIENT
 * - For browser/React usage
 * - Uses ANON key
 */
export const supabase: SupabaseClient | null =
    SUPABASE_URL && SUPABASE_ANON_KEY
        ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        : null;

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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[Supabase] Cannot create service client: missing URL or service role key');
        return null;
    }

    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

/**
 * UTILITY: Optional helper to pick the right client
 * - Use this in API routes if you want auto-switching
 */
export const getSupabaseClient = (serverSide = false, authHeader?: string): SupabaseClient | null => {
    if (serverSide) return createServerClient(authHeader);
    return supabase;
};