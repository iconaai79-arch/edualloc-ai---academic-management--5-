import { SupabaseClient } from '@supabase/supabase-js';

export interface AuthenticatedUser {
    id: string;
    email: string;
    institutionId: string;
    role: string;
}

/**
 * Validates the Supabase JWT and retrieves the user's institutionId from their profile.
 * This ensures we don't trust the institutionId passed from the client.
 */
export async function getAuthenticatedUser(supabase: SupabaseClient): Promise<AuthenticatedUser | null> {
    try {
        // 1. Get user from session (Supabase validates the JWT automatically if headers were passed to createClient)
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('[Auth] JWT Validation failed:', authError?.message);
            return null;
        }

        // 2. Fetch user profile to get institutionId and role
        // We use the service role client (which supabase is) to fetch this, but we filter by the authenticated user's ID
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('institution_id, role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            console.error('[Auth] Failed to fetch user profile:', profileError?.message);
            return null;
        }

        return {
            id: user.id,
            email: user.email!,
            institutionId: profile.institution_id,
            role: profile.role
        };
    } catch (err) {
        console.error('[Auth] Internal error during validation:', err);
        return null;
    }
}
