import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Self-contained Supabase service client factory to avoid external lib crashes
const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
};

/**
 * NCBA Callback Handler (2024 Standard)
 * 
 * Handles notifications for:
 * 1. Pull Payments (STK Push / Direct Debit)
 * 2. QR Code Payments
 * 3. Push Payments (Settlements / Disbursements / B2C)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-NCBA-Signature');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    console.log('--- NCBA Callback Received ---');
    console.log('Query:', JSON.stringify(req.query));
    console.log('Body:', JSON.stringify(req.body));
    
    const body = req.body;
    const institutionId = req.query.institutionId as string;
    const supabase = getSupabase();

    if (!supabase) return res.status(503).json({ error: 'Database context missing' });

    try {
        // Standard NCBA 2024 Payload mapping
        const transactionId = body.TransactionID || body.CheckoutRequestID || body.ReferenceID;
        const resultCode = String(body.ResultCode || body.status_code || '');
        const status = body.status || '';

        if (!transactionId) {
            console.error('[NCBA] Missing TransactionID in payload');
            return res.status(400).json({ ResultCode: 1, ResultDesc: 'Missing TransactionID' });
        }

        // 1. Locate Transaction
        const { data: txn, error: fetchError } = await supabase
            .from('ncba_transactions')
            .select('*')
            .eq('transaction_id', transactionId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (!txn) {
            console.warn(`[NCBA] Transaction ${transactionId} not found in registry.`);
            // If it's a global settlement, it might not be in ncba_transactions yet if initiated externally
            // For now, we return success to acknowledge receipt
            return res.status(200).json({ ResultCode: 0, ResultDesc: 'Acknowledge Unregistered Transaction' });
        }

        // 2. Determine Success
        const isSuccess = resultCode === '0' || status.toUpperCase() === 'SUCCESS' || status.toUpperCase() === 'COMPLETED';

        if (isSuccess) {
            console.log(`[NCBA] ✅ Payment Verified for Transaction ${transactionId}`);
            
            // 3. Update Transaction Record
            await supabase.from('ncba_transactions').update({
                status: 'completed',
                metadata: {
                    ...txn.metadata,
                    callback_payload: body,
                    verified_at: new Date().toISOString()
                }
            }).eq('id', txn.id);

            // 4. Trigger Reconciliation
            // We use the same bridge pattern as integrations.ts
            const bridgeUrl = `https://${req.headers.host}/api/integrations?action=reconcileInternal`;
            try {
                 await fetch(bridgeUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
                    body: JSON.stringify({ transaction: { ...txn, provider: 'ncba', status: 'completed' } })
                });
            } catch (bridgeErr) {
                console.error('[NCBA] Reconciliation bridge failed:', bridgeErr);
                // Fallback: If bridge fails, we might need to manually trigger logic here
                // But usually, integrations.ts handles this.
            }

        } else {
            console.log(`[NCBA] ❌ Payment Failed for Transaction ${transactionId}: ${body.ResultDesc || body.message}`);
            await supabase.from('ncba_transactions').update({
                status: 'failed',
                metadata: { ...txn.metadata, last_error: body.ResultDesc || body.status_desc || 'Unknown error' }
            }).eq('id', txn.id);
        }

        // Standard Success Response for NCBA
        return res.status(200).json({
            ResultCode: 0,
            ResultDesc: 'Callback processed successfully'
        });

    } catch (err: any) {
        console.error('[NCBA Fatal]', err);
        return res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal processing error' });
    }
}
