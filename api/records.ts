import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../lib/supabase';
import { getAuthenticatedUser } from '../lib/auth-server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabase = createServerClient(req.headers.authorization);
    if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });

    // JWT Validation & Institution Derivation
    const user = await getAuthenticatedUser(supabase);
    if (!user) return res.status(401).json({ error: 'Unauthorized: Invalid session' });

    const { module, id } = req.query;
    const { institutionId } = user; // Derive from session, NEVER trust request body/query for this

    if (!module) return res.status(400).json({ error: 'Module parameter required' });

    if (req.method === 'GET') {
        let query = supabase.from(module as string).select('*');

        // Always filter by institution_id unless it's a super_admin accessing institutions
        if (module === 'institutions' && user.role === 'super_admin') {
            // Allow super admin to see all institutions or filter by ID
            if (req.query.institutionId) {
                query = query.eq('id', req.query.institutionId);
            }
        } else if (module === 'institutions') {
            // Regular users can only see THEIR institution
            query = query.eq('id', institutionId);
        } else {
            // For all other tables, enforce institution_id filter
            query = query.eq('institution_id', institutionId);
        }

        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const { data: recordData } = req.body;

        // Enforce institutionId parity on POST
        const secureData = { ...recordData, institution_id: institutionId };

        // Special case: if user is not super_admin, they can only upsert records for their institution
        if (module === 'institutions' && user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Forbidden: Unauthorized to modify institution details' });
        }

        const { data, error } = await supabase.from(module as string).upsert(secureData).select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
    }

    if (req.method === 'PATCH') {
        const { id: recordId, ...updates } = req.body;

        // Verify ownership before update
        const { data: existing, error: fetchError } = await supabase
            .from(module as string)
            .select('institution_id')
            .eq('id', recordId)
            .single();

        if (fetchError || !existing || existing.institution_id !== institutionId) {
            if (user.role !== 'super_admin') {
                return res.status(403).json({ error: 'Forbidden: Access denied to this record' });
            }
        }

        const { data, error } = await supabase.from(module as string).update(updates).eq('id', recordId).select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
    }

    if (req.method === 'DELETE') {
        if (!id) return res.status(400).json({ error: 'ID required for deletion' });

        // Verify ownership before delete
        const { data: existing, error: fetchError } = await supabase
            .from(module as string)
            .select('institution_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing || existing.institution_id !== institutionId) {
            if (user.role !== 'super_admin') {
                return res.status(403).json({ error: 'Forbidden: Access denied to this record' });
            }
        }

        const { error } = await supabase.from(module as string).delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
