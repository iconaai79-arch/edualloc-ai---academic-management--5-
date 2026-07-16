import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Self-contained Supabase service client factory to avoid external lib crashes
const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                process.env.SUPABASE_ANON_KEY || 
                process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ resultCode: 1, message: 'Method not allowed' });

    console.log('--- I&M Collections API Callback Received ---');
    console.log('Path:', req.url);
    console.log('Query:', JSON.stringify(req.query));
    console.log('Headers:', JSON.stringify({
        'x-api-key': req.headers['x-api-key'] ? 'PRESENT' : 'MISSING',
        'authorization': req.headers['authorization'] ? 'PRESENT' : 'MISSING'
    }));
    console.log('Body:', JSON.stringify(req.body));

    const supabase = getSupabase();
    if (!supabase) {
        return res.status(503).json({ resultCode: 1, message: 'Database context missing' });
    }

    try {
        // 1. Authenticate Request to find the corresponding Institution (Tenant)
        let institution: any = null;

        const apiKey = req.headers['x-api-key'] as string;
        const authHeader = req.headers['authorization'] as string;

        if (apiKey) {
            // Find institution matching the API Key in im_config JSONB column
            const { data: matchedInsts, error: apiErr } = await supabase
                .from('institutions')
                .select('*')
                .eq('im_config->>apiKey', apiKey.trim());
            
            if (apiErr) throw apiErr;
            if (matchedInsts && matchedInsts.length > 0) {
                institution = matchedInsts[0];
            }
        } else if (authHeader && authHeader.startsWith('Basic ')) {
            // Find institution matching the Basic auth username and secret
            const base64Credentials = authHeader.split(' ')[1];
            const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
            const [username, password] = credentials.split(':');

            if (username && password) {
                const { data: matchedInsts, error: basicErr } = await supabase
                    .from('institutions')
                    .select('*')
                    .eq('im_config->>callbackUsername', username.trim())
                    .eq('im_config->>callbackSecret', password.trim());
                
                if (basicErr) throw basicErr;
                if (matchedInsts && matchedInsts.length > 0) {
                    institution = matchedInsts[0];
                }
            }
        }

        if (!institution) {
            console.warn('[I&M collections] Authentication failed: No matching institution configuration found.');
            const isValidationPath = (req.url || '').includes('/validate');
            if (isValidationPath) {
                return res.status(401).json({
                    resultCode: 1,
                    message: 'Authentication failed. Token missing or expired.',
                    customerName: '',
                    customerRef: ''
                });
            } else {
                return res.status(401).json({
                    resultCode: 1,
                    resultDesc: 'Authentication failed. Token missing, invalid, or expired.',
                    erpRefId: null
                });
            }
        }

        console.log(`[I&M Collections] Authenticated tenant: ${institution.name} (${institution.id})`);

        // Check if request is for the Validation API
        const isValidation = (req.url || '').includes('/validate');

        if (isValidation) {
            const customerRef = req.body?.customerRef as string;
            if (!customerRef) {
                return res.status(400).json({
                    resultCode: 1,
                    message: 'Missing customerRef parameter',
                    customerName: '',
                    customerRef: ''
                });
            }

            console.log(`[I&M Validation] Searching reference: ${customerRef} for institution: ${institution.id}`);
            let customerName = '';
            let customerRefMatched = customerRef;

            // Step A: Search users (checks admission_number, metadata->>admissionNumber, or direct ID)
            const { data: userMatch } = await supabase
                .from('users')
                .select('name, id')
                .eq('institution_id', institution.id)
                .or(`admission_number.eq."${customerRef}",metadata->>admissionNumber.eq."${customerRef}",id.eq."${customerRef}"`)
                .maybeSingle();

            if (userMatch) {
                customerName = userMatch.name;
                customerRefMatched = customerRef;
            }

            // Step B: Search ds_students (Driving School students)
            if (!customerName) {
                const { data: dsMatch } = await supabase
                    .from('ds_students')
                    .select('full_name, id, admission_number')
                    .eq('institution_id', institution.id)
                    .or(`admission_number.eq."${customerRef}",id.eq."${customerRef}"`)
                    .maybeSingle();
                
                if (dsMatch) {
                    customerName = dsMatch.full_name;
                    customerRefMatched = dsMatch.admission_number || dsMatch.id;
                }
            }

            // Step C: Search pm_tenants (Property Management tenants)
            if (!customerName) {
                const { data: pmMatch } = await supabase
                    .from('pm_tenants')
                    .select('name, id')
                    .eq('institution_id', institution.id)
                    .eq('id', customerRef)
                    .maybeSingle();
                
                if (pmMatch) {
                    customerName = pmMatch.name;
                    customerRefMatched = pmMatch.id;
                }
            }

            // Step D: Search invoices (matching customRef directly to invoice number)
            if (!customerName) {
                const { data: invMatch } = await supabase
                    .from('invoices')
                    .select('id, user_id, invoice_number')
                    .eq('institution_id', institution.id)
                    .eq('invoice_number', customerRef)
                    .maybeSingle();
                
                if (invMatch && invMatch.user_id) {
                    const { data: uMatch } = await supabase
                        .from('users')
                        .select('name')
                        .eq('id', invMatch.user_id)
                        .maybeSingle();
                    if (uMatch) {
                        customerName = uMatch.name;
                        customerRefMatched = invMatch.invoice_number;
                    }
                }
            }

            if (customerName) {
                console.log(`[I&M Validation] ✅ Reference resolved to Customer: "${customerName}"`);
                return res.status(200).json({
                    resultCode: 0,
                    message: 'Customer found',
                    customerName: customerName,
                    customerRef: customerRefMatched
                });
            } else {
                console.warn(`[I&M Validation] ❌ Reference "${customerRef}" not found.`);
                return res.status(404).json({
                    resultCode: 1,
                    message: 'Customer not found',
                    customerName: '',
                    customerRef: ''
                });
            }
        } else {
            // Processing Payment Notification Callback
            const body = req.body;
            const { paymentType, transactionReference, amount, currency, shortCode, additions } = body || {};

            if (!transactionReference || !amount || !paymentType || !shortCode) {
                return res.status(400).json({
                    resultCode: 1,
                    resultDesc: 'Missing required payment payload fields.',
                    erpRefId: null
                });
            }

            console.log(`[I&M Payment] Processing txn ref: ${transactionReference} | Amount: ${amount}`);
            
            // Check if transaction has already been registered (idempotency check)
            const { data: existingTxn } = await supabase
                .from('im_transactions')
                .select('id')
                .eq('transaction_reference', transactionReference)
                .maybeSingle();

            const txnId = existingTxn ? existingTxn.id : `im_txn_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            if (!existingTxn) {
                // Insert transaction record
                const { error: insertErr } = await supabase.from('im_transactions').insert({
                    id: txnId,
                    transaction_reference: transactionReference,
                    institution_id: institution.id,
                    payment_type: paymentType,
                    amount: parseFloat(String(amount)),
                    currency: currency || 'KES',
                    short_code: shortCode,
                    customer_ref: additions?.customerRef || null,
                    external_ref_number: additions?.externalRefNumber || null,
                    payer_name: additions?.payerName || null,
                    payer_mobile_number: additions?.payerMobileNumber || null,
                    sender_bank_code: additions?.senderBankCode || null,
                    sender_account_number: additions?.senderAccountNumber || null,
                    sender_account_name: additions?.senderAccountName || null,
                    cheque_number: additions?.chequeNumber || null,
                    status: 'completed',
                    metadata: {
                        additions,
                        transactionDate: body.transactionDate,
                        raw_payload: body
                    }
                });

                if (insertErr) throw insertErr;
                console.log(`[I&M Payment] Transaction registered in database with ID: ${txnId}`);
            } else {
                console.log(`[I&M Payment] Duplicate transaction reference detected. Re-triggering reconciliation.`);
            }

            // Trigger Reconciliation via internal webhook bridge
            const protocol = req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1') ? 'http' : 'https';
            const bridgeUrl = `${protocol}://${req.headers.host}/api/integrations?action=reconcileInternal`;
            
            try {
                await fetch(bridgeUrl, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` 
                    },
                    body: JSON.stringify({ 
                        transaction: { 
                            id: txnId, 
                            institution_id: institution.id, 
                            amount: parseFloat(String(amount)), 
                            transaction_id: transactionReference, 
                            provider: 'im', 
                            status: 'completed' 
                        } 
                    })
                });
                console.log(`[I&M Payment] Reconciliation webhook triggered.`);
            } catch (bridgeErr) {
                console.error('[I&M Payment] Reconciliation bridge failed:', bridgeErr);
            }

            return res.status(200).json({
                resultCode: 0,
                resultDesc: 'Payment received successfully',
                erpRefId: txnId
            });
        }

    } catch (err: any) {
        console.error('[I&M Fatal]', err);
        const isValidationPath = (req.url || '').includes('/validate');
        if (isValidationPath) {
            return res.status(500).json({
                resultCode: 1,
                message: 'An unexpected error occurred while processing the request. Please try again later.',
                customerName: '',
                customerRef: ''
            });
        } else {
            return res.status(500).json({
                resultCode: 1,
                resultDesc: 'Internal server error, please try again later',
                erpRefId: null
            });
        }
    }
}
