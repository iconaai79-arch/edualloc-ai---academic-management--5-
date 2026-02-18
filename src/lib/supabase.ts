import { createClient, SupabaseClient } from '@supabase/supabase-js';

export let supabase: SupabaseClient | null = null;

let supabaseInstance: SupabaseClient | null = null;

/**
 * Initializes or returns the existing Supabase client instance.
 * @param url The Supabase Project URL
 * @param key The Supabase Anon Key
 */
export const initSupabase = (url: string, key: string): SupabaseClient => {
    if (!url || !key) {
        throw new Error("Missing Supabase URL or Anon Key");
    }

    // Only re-initialize if the URL changes or instance is null
    if (!supabaseInstance || (supabaseInstance as any).supabaseUrl !== url) {
        supabaseInstance = createClient(url, key);
        supabase = supabaseInstance;
    }

    return supabaseInstance;
};

/**
 * Gets the current Supabase client instance.
 */
export const getSupabase = (): SupabaseClient | null => {
    return supabaseInstance;
};

/**
 * Tests the connection to the Supabase project.
 */
export const testSupabaseConnection = async (url: string, key: string): Promise<{ success: boolean; message: string }> => {
    try {
        const client = initSupabase(url, key);
        // Ping the health check or a simple fetch
        const { data, error } = await client.from('institutions').select('id').limit(1);

        if (error) {
            // Check if it's a "relation does not exist" error (meaning connection is good, but tables aren't setup)
            if (error.code === '42P01' || error.message.includes('not found')) {
                return {
                    success: true,
                    message: "Connection successful! Project is reachable, but database tables need initialization."
                };
            }
            return { success: false, message: `Supabase Error: ${error.message}` };
        }

        return { success: true, message: "Connection successful! Database is online and reachable." };
    } catch (err: any) {
        return { success: false, message: `Connection failed: ${err.message}` };
    }
};