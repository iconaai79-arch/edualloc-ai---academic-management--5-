import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceClient } from '../lib/supabase';
import { getAuthenticatedUser } from '../lib/auth-server';

const PUBLIC_MODULES = ['users', 'institutions', 'counties', 'system_settings'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { module, id, select, order, limit, institutionId: queryInstitutionId } = req.query;
    const getStrParam = (p: any): string => (Array.isArray(p) ? p[0] : (p as string) || '');
    const moduleName = getStrParam(module);
    const recordId = getStrParam(id);
    const queryInstId = getStrParam(queryInstitutionId);
    
    console.log(`[API Records] ${req.method} request for module: ${moduleName || 'NONE'}`);

    try {
        const supabase = createServiceClient();
        if (!supabase) {
            const hasUrl = !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
            const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
            console.error(`[API Records] Supabase client creation failed. URL: ${hasUrl}, Key: ${hasKey}`);
            
            return res.status(200).json({ 
                success: false, 
                error: 'Database service unavailable: Missing environment keys.',
                diagnostic: { hasUrl, hasKey, vercel: !!process.env.VERCEL }
            });
        }
        
        if (!moduleName) return res.status(400).json({ success: false, error: 'Module parameter required' });

        const user = await getAuthenticatedUser(supabase, req.headers.authorization);
        const isPublicGet = req.method === 'GET' && PUBLIC_MODULES.includes(moduleName);

        if (!user && !isPublicGet) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Invalid session' });
        }

        const institutionId = user?.institutionId;
        const isCountyRole = user?.role === 'county_admin' || user?.role?.startsWith('county_');

        if (req.method === 'GET') {
            const getQuery = async (columns: string) => {
                let q = supabase.from(moduleName).select(columns);
                
                if (user?.role === 'super_admin') {
                    if (queryInstId) {
                        const filterCol = moduleName === 'institutions' ? 'id' : 'institution_id';
                        q = q.eq(filterCol, queryInstId);
                    }
                } else if (isPublicGet && !user) {
                    if (queryInstId) {
                        const filterCol = moduleName === 'institutions' ? 'id' : 'institution_id';
                        q = q.eq(filterCol, queryInstId);
                    }
                    if (!limit) q = q.limit(100); 
                } else if (user) {
                    const instId = user.institutionId;
                    
                    if (isCountyRole) {
                        if (moduleName === 'counties') {
                            q = q.eq('id', instId);
                        } else if (moduleName === 'institutions') {
                            q = q.eq('county_id', instId);
                        } else {
                            q = q.eq('county_id', instId);
                        }
                    } else {
                        if (moduleName === 'institutions') {
                            q = q.eq('id', instId);
                        } else {
                            if (moduleName !== 'counties') {
                                q = q.eq('institution_id', instId);
                            }
                        }
                    }
                }

                if (recordId) {
                    q = q.eq('id', recordId);
                }

                const reserved = ['module', 'id', 'select', 'order', 'limit', 'institutionId'];
                Object.entries(req.query).forEach(([key, val]) => {
                    if (!reserved.includes(key) && val) {
                        try {
                            const value = getStrParam(val);
                            if (value) q = q.eq(key, value);
                        } catch (e) {
                            console.warn(`[API Records] Filter failure for ${key}:`, e);
                        }
                    }
                });

                if (order && typeof order === 'string') {
                    const [column, direction] = order.split('.');
                    if (column) q = q.order(column, { ascending: direction !== 'desc' });
                }
                
                if (limit) {
                    const parsedLimit = parseInt(getStrParam(limit));
                    if (!isNaN(parsedLimit)) q = q.limit(parsedLimit);
                }
                return await q;
            };

            let selectString = getStrParam(select) || '*';
            if (isPublicGet && !user && !select) {
                if (moduleName === 'users') {
                    selectString = 'id, name, email, role, roles, institution_id, phone_number, password';
                } else if (moduleName === 'institutions') {
                    selectString = 'id, name, logo_url, institution_type, is_otp_enabled, status, phone_number, institution_code, business_sub_type, trial_ends_at, subscription_ends_at';
                }
            }

            try {
                let { data, error } = await getQuery(selectString);

                if (error && error.code === '42703' && selectString !== '*') {
                    const retry = await getQuery('*');
                    data = retry.data;
                    error = retry.error;
                }

                if (error && error.code === '42703' && isCountyRole) {
                     const retry = await supabase.from(moduleName).select(selectString).limit(100);
                     data = retry.data;
                     error = retry.error;
                }

                if (error) {
                    console.error(`[API Records] GET Error [${moduleName}]:`, error);
                    return res.status(200).json({ 
                        success: false,
                        error: `Database Error: ${error.message}`,
                        code: error.code,
                        module: moduleName
                    });
                }
                return res.status(200).json(data || []);
            } catch (innerErr: any) {
                console.error(`[API Records] Internal GET Failure [${moduleName}]:`, innerErr);
                return res.status(500).json({ success: false, error: innerErr.message });
            }
        }

        if (req.method === 'POST') {
            const { data: recordData } = req.body || {};
            if (!recordData) return res.status(400).json({ success: false, error: 'Record data required' });

            let secureData: any;
            if (user?.role === 'super_admin' || moduleName === 'counties') {
                secureData = recordData;
            } else if (isCountyRole) {
                secureData = Array.isArray(recordData) 
                    ? recordData.map((r: any) => ({ ...r, county_id: institutionId }))
                    : { ...recordData, county_id: institutionId };
            } else {
                secureData = Array.isArray(recordData) 
                    ? recordData.map((r: any) => ({ ...r, institution_id: institutionId }))
                    : { ...recordData, institution_id: institutionId };
            }

            const { data, error } = await supabase.from(moduleName).upsert(secureData).select();
            if (error) {
                console.error(`[API Records] POST Error [${moduleName}]:`, error);
                return res.status(500).json({ success: false, error: `Save Error: ${error.message}` });
            }
            return res.status(200).json(data?.[0] || { success: true });
        }

        if (req.method === 'PATCH') {
            const { id: targetId, ...updates } = req.body || {};
            if (!targetId) return res.status(400).json({ success: false, error: 'ID required for update' });

            const { data, error } = await supabase.from(moduleName).update(updates).eq('id', targetId).select();
            if (error) {
                return res.status(500).json({ success: false, error: `Update Error: ${error.message}` });
            }
            return res.status(200).json(data?.[0] || { success: true });
        }

        if (req.method === 'DELETE') {
            const targetId = id || req.body?.id;
            if (!targetId) return res.status(400).json({ success: false, error: 'ID required for deletion' });

            const { error } = await supabase.from(moduleName).delete().eq('id', targetId);
            if (error) {
                return res.status(500).json({ success: false, error: `Delete Error: ${error.message}` });
            }
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ success: false, error: 'Method not allowed' });
    } catch (err: any) {
        console.error(`[API Records] Critical Failure:`, err);
        return res.status(500).json({ 
            success: false,
            error: 'Internal Server Error', 
            message: err?.message || 'Unexpected server failure'
        });
    }
}
