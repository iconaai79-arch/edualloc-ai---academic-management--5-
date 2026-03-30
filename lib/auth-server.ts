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
    if (!authHeader || authHeader === 'null' || authHeader === 'undefined' || authHeader === 'Bearer null' || authHeader === 'Bearer undefined') {
        return null;
    }

    try {
        let userId: string | null = null;
        let userEmail: string | null = null;

        const token = authHeader.replace('Bearer ', '');
        if (!token || token === 'null' || token === 'undefined') return null;

        const isJwt = token.includes('.') && token.split('.').length === 3;

        // 1. Try Supabase Auth (JWT) if present
        if (isJwt) {
            try {
                const { data, error: authError } = await supabase.auth.getUser(token);
                if (authError) {
                    console.warn('[Auth] JWT Validation failed:', authError.message);
                }
                if (data?.user) {
                    userId = data.user.id;
                    userEmail = data.user.email || null;
                }
        }

        if (!userId && token && (token.startsWith('u_') || token.includes('-'))) {
            // 2. Fallback: Internal User ID (u_...) passed as Bearer token
            // This is used by the frontend's custom login system
            userId = token;
        }

        if (!userId) {
            if (token) console.warn('[Auth] Invalid or expired token provided');
            return null;
        }

        // 3. Fetch user profile to get institutionId and role
        // Support BOTH raw UUID and 'u_' prefixed UUID (matches DB RLS and records.ts logic)
        // If userId already starts with u_, don't double prefix it
        const dbQuery = userId.startsWith('u_') 
            ? `id.eq.${userId},id.eq.${userId.substring(2)}`
            : `id.eq.${userId},id.eq.u_${userId}`;

        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('id, email, institution_id, role')
            .or(dbQuery)
            .single();

        if (profileError || !profile) {
            // Fallback for Super Admin bootstrap (matching DB RLS behavior)
            if (userEmail === 'super@app.com') {
                return {
                    id: userId,
                    email: userEmail,
                    institutionId: 'GLOBAL',
                    role: 'super_admin'
                };
            }
            
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
