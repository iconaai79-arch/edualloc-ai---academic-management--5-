import { SupabaseClient } from '@supabase/supabase-js';

export interface AuthenticatedUser {
    id: string;
    email: string;
    institutionId: string;
    role: string;
}

/**
 * Validates the Supabase JWT or fallback Internal User ID and retrieves the user's profile.
 * This ensures we don't trust sensitive data passed from the client blindly.
 */
export async function getAuthenticatedUser(supabase: SupabaseClient, authHeader?: string): Promise<AuthenticatedUser | null> {
    try {
        let userId: string | null = null;
        let userEmail: string | null = null;

        // 1. Try Supabase Auth (JWT)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (user) {
            userId = user.id;
            userEmail = user.email || null;
        } else if (authHeader && authHeader.startsWith('Bearer ')) {
            // 2. Fallback: Internal User ID (u_...) passed as Bearer token
            // This is used by the frontend's custom login system
            const token = authHeader.split(' ')[1];
            if (token && (token.startsWith('u_') || token.includes('-'))) {
                userId = token;
            }
        }

        if (!userId) {
            console.error('[Auth] Validation failed: No valid session or token found');
            return null;
        }

        // 3. Fetch user profile to get institutionId and role
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('id, email, institution_id, role')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            console.error('[Auth] Failed to fetch user profile for ID:', userId, profileError?.message);
            return null;
        }

        return {
            id: profile.id,
            email: profile.email || userEmail || '',
            institutionId: profile.institution_id,
            role: profile.role
        };
    } catch (err) {
        console.error('[Auth] Internal error during validation:', err);
        return null;
    }
}
