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

// Local phone normalization helper
const normalizePhone = (phone: string): string => {
    let p = String(phone).replace(/[^\d]/g, '');
    if (p.startsWith('2540')) p = '254' + p.substring(4);
    else if (p.startsWith('0')) p = '254' + p.substring(1);
    else if (p.length === 9) p = '254' + p;
    return p;
};

// Local fetch with timeout helper
const fetchWithTimeout = async (url: string, options: any, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
};

// Case-insensitive, source-flexible param resolver
const getParam = (body: any, query: any, key: string): string => {
    const keysToTry = [
        key,
        key.toLowerCase(),
        key.charAt(0).toUpperCase() + key.slice(1), // PascalCase
        key.replace(/([A-Z])/g, "_$1").toLowerCase(), // snake_case
        key.replace(/([A-Z])/g, "-$1").toLowerCase() // kebab-case
    ];

    const sources = [body, query];
    for (const source of sources) {
        if (source && typeof source === 'object') {
            for (const k of keysToTry) {
                if (source[k] !== undefined && source[k] !== null) {
                    return String(source[k]).trim();
                }
            }
        }
    }
    return '';
};

/**
 * KCB IPN (Instant Payment Notification) Callback Handler
 * 
 * Used for receiving B2C, C2B, and other standard notifications from KCB.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KCB IPN Integration Playground</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0d1117;
            --panel-bg: rgba(22, 27, 34, 0.8);
            --border-color: rgba(48, 54, 61, 0.8);
            --primary: #2ea44f;
            --primary-hover: #3fb950;
            --text-main: #c9d1d9;
            --text-muted: #8b949e;
            --accent: #58a6ff;
        }
        body {
            font-family: 'Outfit', sans-serif;
            background: radial-gradient(circle at top, #161b22, #0d1117);
            color: var(--text-main);
            margin: 0;
            padding: 2rem;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container {
            max-width: 900px;
            width: 100%;
            background: var(--panel-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 2rem;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        h1 {
            font-weight: 800;
            font-size: 2.2rem;
            margin-top: 0;
            background: linear-gradient(45deg, #58a6ff, #50e3c2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-align: center;
            letter-spacing: -0.5px;
        }
        p.subtitle {
            color: var(--text-muted);
            text-align: center;
            margin-top: -10px;
            margin-bottom: 2rem;
        }
        .grid {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 2rem;
        }
        .form-section, .result-section {
            display: flex;
            flex-direction: column;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        label {
            display: block;
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-bottom: 0.4rem;
            font-weight: 600;
        }
        input {
            width: 100%;
            padding: 0.75rem;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            background: rgba(13, 17, 23, 0.6);
            color: var(--text-main);
            font-family: inherit;
            box-sizing: border-box;
            transition: all 0.2s ease;
        }
        input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.3);
        }
        button {
            width: 100%;
            padding: 1rem;
            border: none;
            border-radius: 8px;
            background: var(--primary);
            color: #ffffff;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 1rem;
        }
        button:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
        }
        button:active {
            transform: translateY(1px);
        }
        pre {
            background: rgba(13, 17, 23, 0.8);
            border: 1px solid var(--border-color);
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            flex-grow: 1;
            margin: 0;
            min-height: 200px;
        }
        .footer {
            margin-top: 2rem;
            font-size: 0.8rem;
            color: var(--text-muted);
            text-align: center;
        }
        .badge {
            background: rgba(88, 166, 255, 0.1);
            color: var(--accent);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>KCB IPN Integration Playground</h1>
        <p class="subtitle">Interactive sandbox client for KCB Instant Payment Notifications</p>
        
        <div class="grid">
            <div class="form-section">
                <h3>Request Payload</h3>
                <form id="ipnForm">
                    <div class="form-group">
                        <label>Transaction Reference</label>
                        <input type="text" id="transactionReference" value="FT00026252">
                    </div>
                    <div class="form-group">
                        <label>Request ID</label>
                        <input type="text" id="requestId" value="c7d702cb-6b5f-4fa6-8b57-436d0f789017">
                    </div>
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label>Channel Code</label>
                            <input type="text" id="channelCode" value="202">
                        </div>
                        <div class="form-group">
                            <label>Timestamp</label>
                            <input type="text" id="timestamp" value="2021111103005">
                        </div>
                    </div>
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label>Transaction Amount</label>
                            <input type="text" id="transactionAmount" value="100.00">
                        </div>
                        <div class="form-group">
                            <label>Currency</label>
                            <input type="text" id="currency" value="KES">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Customer Reference</label>
                        <input type="text" id="customerReference" value="INV-0001">
                    </div>
                    <div class="form-group">
                        <label>Customer Name</label>
                        <input type="text" id="customerName" value="John Doe">
                    </div>
                    <div class="form-group">
                        <label>Customer Mobile Number</label>
                        <input type="text" id="customerMobileNumber" value="25471111111">
                    </div>
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label>Balance</label>
                            <input type="text" id="balance" value="100000.00">
                        </div>
                        <div class="form-group">
                            <label>Narration</label>
                            <input type="text" id="narration" value="Payment for goods">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Credit Account Identifier</label>
                        <input type="text" id="creditAccountIdentifier" value="JD001">
                    </div>
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label>Organization Short Code</label>
                            <input type="text" id="organizationShortCode" value="777777">
                        </div>
                        <div class="form-group">
                            <label>Till Number</label>
                            <input type="text" id="tillNumber" value="150150">
                        </div>
                    </div>
                    <button type="submit" id="btnSend">Trigger POST Notification</button>
                </form>
            </div>
            
            <div class="result-section">
                <h3>Live Server Response <span class="badge" id="statusCodeBadge">Idle</span></h3>
                <pre id="responseOutput">// Response from the API will be shown here after triggering the POST notification</pre>
            </div>
        </div>
    </div>
    
    <div class="footer">
        Eduai Automation Integration Portal &bull; KCB IPN Protocol v2.4
    </div>

    <script>
        document.getElementById('ipnForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSend');
            const resBox = document.getElementById('responseOutput');
            const badge = document.getElementById('statusCodeBadge');
            
            btn.disabled = true;
            btn.innerText = 'Sending Notification...';
            resBox.innerText = 'Waiting for response...';
            badge.innerText = 'Pending';
            badge.style.background = 'rgba(255, 170, 0, 0.1)';
            badge.style.color = '#ffaa00';

            const payload = {
                transactionReference: document.getElementById('transactionReference').value,
                requestId: document.getElementById('requestId').value,
                channelCode: document.getElementById('channelCode').value,
                timestamp: document.getElementById('timestamp').value,
                transactionAmount: document.getElementById('transactionAmount').value,
                currency: document.getElementById('currency').value,
                customerReference: document.getElementById('customerReference').value,
                customerName: document.getElementById('customerName').value,
                customerMobileNumber: document.getElementById('customerMobileNumber').value,
                balance: document.getElementById('balance').value,
                narration: document.getElementById('narration').value,
                creditAccountIdentifier: document.getElementById('creditAccountIdentifier').value,
                organizationShortCode: document.getElementById('organizationShortCode').value,
                tillNumber: document.getElementById('tillNumber').value
            };

            try {
                const response = await fetch(window.location.pathname + window.location.search, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                const status = response.status;
                const data = await response.json();
                
                badge.innerText = 'HTTP ' + status;
                if (response.ok) {
                    badge.style.background = 'rgba(63, 185, 80, 0.1)';
                    badge.style.color = '#3fb950';
                } else {
                    badge.style.background = 'rgba(248, 81, 73, 0.1)';
                    badge.style.color = '#f85149';
                }
                
                resBox.innerText = JSON.stringify(data, null, 4);
            } catch (err) {
                badge.innerText = 'Network Error';
                badge.style.background = 'rgba(248, 81, 73, 0.1)';
                badge.style.color = '#f85149';
                resBox.innerText = 'Failed to connect to endpoint: ' + err.message;
            } finally {
                btn.disabled = false;
                btn.innerText = 'Trigger POST Notification';
            }
        });
    </script>
</body>
</html>
`);
    }

    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    // --- Robust body reading: handles Vercel raw body stream, pre-parsed body, Buffer, and string ---
    let body: any = {};
    try {
        if (req.body !== undefined && req.body !== null) {
            // Vercel has already parsed the body
            if (Buffer.isBuffer(req.body)) {
                body = JSON.parse(req.body.toString('utf-8'));
            } else if (typeof req.body === 'string' && req.body.trim().length > 0) {
                body = JSON.parse(req.body);
            } else if (typeof req.body === 'object' && !Array.isArray(req.body)) {
                body = req.body;
            }
        } else {
            // req.body is undefined: manually read the raw stream
            const rawChunks: Buffer[] = [];
            await new Promise<void>((resolve, reject) => {
                (req as any).on('data', (chunk: Buffer) => rawChunks.push(chunk));
                (req as any).on('end', () => resolve());
                (req as any).on('error', reject);
            });
            const rawBody = Buffer.concat(rawChunks).toString('utf-8').trim();
            if (rawBody.length > 0) {
                body = JSON.parse(rawBody);
            }
        }
    } catch (parseErr) {
        console.error('[KCB IPN] Failed to parse request body:', parseErr);
        body = {};
    }

    // Handle edge case: entire JSON pasted as a single form-urlencoded key with empty value
    if (body && typeof body === 'object' && !Array.isArray(body)) {
        const keys = Object.keys(body);
        if (keys.length === 1 && (body[keys[0]] === '' || body[keys[0]] === undefined) && keys[0].trim().startsWith('{')) {
            try {
                body = JSON.parse(keys[0]);
            } catch (e) {
                console.error('[KCB IPN] Failed to parse single key JSON body:', e);
            }
        }
    }

    if (typeof body !== 'object' || Array.isArray(body)) {
        body = {};
    }

    console.log('--- KCB IPN Received ---');
    console.log('Query:', JSON.stringify(req.query));
    console.log('Body:', JSON.stringify(body));

    // Count meaningful payload fields (exclude routing params like institutionId)
    const routingKeys = new Set(['institutionId']);
    const queryPayloadKeys = req.query ? Object.keys(req.query).filter(k => !routingKeys.has(k)) : [];
    const bodyPayloadKeys = body ? Object.keys(body) : [];
    const hasQueryFields = queryPayloadKeys.length > 0;
    const hasBodyFields = bodyPayloadKeys.length > 0;

    if (!hasQueryFields && !hasBodyFields) {
        return res.status(400).json({
            statusCode: 1,
            statusMessage: 'Missing or empty request payload',
            hint: 'Send a JSON body with at least transactionReference and transactionAmount fields.'
        });
    }

    const supabase = getSupabase();

    if (!supabase) return res.status(503).json({ error: 'Database context missing' });

    try {
        // Log the raw IPN
        const { error: logError } = await supabase.from('integration_logs').insert({
            provider: 'kcb_ipn',
            payload: body,
            status: 'received',
            created_at: new Date().toISOString()
        });

        if (logError) console.warn('[KCB IPN] Failed to log IPN:', logError);

        // Support both KCB nested structure and flat structure
        const header = body.header || {};
        const primaryData = body.requestPayload?.primaryData || {};
        const additionalData = body.requestPayload?.additionalData || {};
        const notificationData = additionalData.notificationData || {};

        // Flat format key fields resolved via robust getParam
        const transactionReference = getParam(body, req.query, 'transactionReference');
        const requestId = getParam(body, req.query, 'requestId');
        const customerReference = getParam(body, req.query, 'customerReference');
        const creditAccountIdentifier = getParam(body, req.query, 'creditAccountIdentifier') || getParam(body, req.query, 'creditAccountIdenti;ier');
        const customerMobileNumber = getParam(body, req.query, 'customerMobileNumber');
        const customerName = getParam(body, req.query, 'customerName');
        const transactionAmount = getParam(body, req.query, 'transactionAmount');

        const channelCode = getParam(body, req.query, 'channelCode');
        const timestamp = getParam(body, req.query, 'timestamp');
        const currency = getParam(body, req.query, 'currency');
        const balance = getParam(body, req.query, 'balance');
        const narration = getParam(body, req.query, 'narration');
        const organizationShortCode = getParam(body, req.query, 'organizationShortCode');
        const tillNumber = getParam(body, req.query, 'tillNumber');

        const messageID = header.messageID || requestId || `MSG_${Date.now()}`;
        const originatorConversationID = header.originatorConversationID || header.conversationID || requestId || '';
        const businessKey = primaryData.businessKey || customerReference || '';

        const transactionID = transactionReference || notificationData.transactionID || businessKey || `KCB_IPN_${Date.now()}`;
        const amount = parseFloat(transactionAmount || notificationData.transactionAmt || '0');
        const phone = customerMobileNumber || notificationData.debitMSISDN || '';
        const payerName = customerName || `${notificationData.firstName || ''} ${notificationData.lastName || ''}`.trim();

        // 1. Locate matching transaction
        const lookupKey = businessKey || originatorConversationID || '';
        let transaction: any = null;
        if (lookupKey || transactionID) {
            const { data } = await supabase
                .from('mpesa_transactions')
                .select('*')
                .or(`checkout_request_id.eq.${lookupKey},transaction_id.eq.${transactionID}`)
                .maybeSingle();
            transaction = data;
        }

        // 2. If no transaction, check if customerReference or businessKey corresponds to invoice or institution (C2B Paybill fallback)
        let inst: any = null;
        let invoice: any = null;
        if (!transaction && amount > 0) {
            // Check if customerReference is an invoice number
            if (customerReference) {
                const { data: invoiceData } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('invoice_number', customerReference)
                    .maybeSingle();
                invoice = invoiceData;
                if (invoice) {
                    const { data: instData } = await supabase
                        .from('institutions')
                        .select('*')
                        .eq('id', invoice.institution_id)
                        .maybeSingle();
                    inst = instData;
                } else {
                    const { data: carInvoiceData } = await supabase
                        .from('car_sales_invoices')
                        .select('*')
                        .eq('invoice_number', customerReference)
                        .maybeSingle();
                    if (carInvoiceData) {
                        invoice = carInvoiceData;
                        const { data: instData } = await supabase
                            .from('institutions')
                            .select('*')
                            .eq('id', carInvoiceData.institution_id)
                            .maybeSingle();
                        inst = instData;
                    }
                }
            }

            // Fallback: check creditAccountIdentifier
            if (!inst && creditAccountIdentifier) {
                const { data: instById } = await supabase.from('institutions').select('*').eq('id', creditAccountIdentifier).maybeSingle();
                inst = instById;
                if (!inst) {
                    const { data: instByCode } = await supabase.from('institutions').select('*').eq('code', creditAccountIdentifier).maybeSingle();
                    inst = instByCode;
                }
            }

            // Fallback: check customerReference (or businessKey) directly as institution ID/code
            const directKey = customerReference || businessKey || '';
            if (!inst && directKey) {
                const { data: instById } = await supabase.from('institutions').select('*').eq('id', directKey).maybeSingle();
                inst = instById;
                if (!inst) {
                    const { data: instByCode } = await supabase.from('institutions').select('*').eq('code', directKey).maybeSingle();
                    inst = instByCode;
                }
            }

            if (inst) {
                // Insert transaction on the fly
                const txnMetadata: Record<string, any> = {
                    payerPhoneNumber: phone,
                    payerName: payerName,
                    channelCode,
                    timestamp,
                    currency,
                    balance,
                    narration,
                    organizationShortCode,
                    tillNumber,
                    creditAccountIdentifier
                };

                if (invoice) {
                    const isCar = invoice.balance_amount !== undefined;
                    txnMetadata.type = isCar ? 'car_invoice' : 'invoice';
                    txnMetadata.invoiceId = invoice.id;
                } else {
                    txnMetadata.type = 'sms'; // assume SMS units top-up for direct Paybill C2B payments
                    txnMetadata.units = 0;
                }

                const { data: newTxn, error: insertErr } = await supabase.from('mpesa_transactions').insert({
                    id: `txn_${Date.now()}`,
                    transaction_id: transactionID,
                    checkout_request_id: transactionID,
                    institution_id: inst.id,
                    amount: amount,
                    phone_number: phone,
                    payer_name: payerName,
                    status: 'completed',
                    provider: 'kcb',
                    request_id: requestId,
                    channel_code: channelCode,
                    currency: currency,
                    customer_reference: customerReference,
                    customer_name: customerName,
                    customer_mobile_number: customerMobileNumber,
                    balance: parseFloat(balance || '0'),
                    narration: narration,
                    credit_account_identifier: creditAccountIdentifier,
                    organization_short_code: organizationShortCode,
                    till_number: tillNumber,
                    metadata: txnMetadata
                }).select().single();

                if (!insertErr && newTxn) {
                    transaction = newTxn;
                } else {
                    console.error('[KCB IPN] Failed to create transaction on the fly:', insertErr);
                }
            }
        }

        // 3. Process reconciliation and notifications if transaction is active and completed
        if (transaction) {
            // Update transaction to completed if it was pending
            if (transaction.status === 'pending') {
                await supabase
                    .from('mpesa_transactions')
                    .update({
                        status: 'completed',
                        transaction_id: transactionID
                    })
                    .eq('id', transaction.id);
                transaction.status = 'completed';
                transaction.transaction_id = transactionID;
            }

            const metadata = transaction.metadata || {};
            const isReconciled = metadata.reconciled === true || metadata.reconciled === 'true';

            if (transaction.status === 'completed' && !isReconciled) {
                const instId = transaction.institution_id;
                const amt = transaction.amount || 0;
                const type = metadata.type || 'sms';

                // Fetch settings
                let settings: any = {};
                try {
                    const { data: sData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
                    if (sData?.data) settings = sData.data;
                } catch (e) {
                    console.error('[KCB IPN] Failed to fetch settings:', e);
                }

                if (!inst && instId && instId !== 'SYSTEM' && instId !== 'GLOBAL') {
                    const { data: instData } = await supabase.from('institutions').select('*').eq('id', instId).maybeSingle();
                    inst = instData;
                }

                let newBalance = 0;
                let unitsToCredit = 0;

                if (type === 'sms' || type === 'sms_topup') {
                    unitsToCredit = parseInt(String(metadata.units || "0"));
                    const defaultUnitPrice = parseFloat(String(settings.sms_unit_price || settings.smsUnitPrice || 2));
                    if (unitsToCredit <= 0 && amt > 0) {
                        unitsToCredit = Math.floor(amt / (defaultUnitPrice || 1));
                    }

                    if (unitsToCredit > 0) {
                        console.log(`[KCB IPN - Reconcile] Adding ${unitsToCredit} units to ${instId}`);
                        await supabase.rpc('increment_sms_balance', {
                            inst_id: instId || 'SYSTEM',
                            amount: unitsToCredit
                        });

                        // Fetch new balance
                        if (instId && instId !== 'SYSTEM') {
                            const { data: updatedInst } = await supabase.from('institutions').select('sms_balance').eq('id', instId).maybeSingle();
                            if (updatedInst) {
                                newBalance = updatedInst.sms_balance;
                            }
                        }
                    }

                    // Create Invoice & Receipt
                    const invoiceId = `inv_sms_${Date.now()}`;
                    await supabase.from('invoices').insert({
                        id: invoiceId,
                        invoice_number: `INV-SMS-${Date.now().toString().slice(-6)}`,
                        institution_id: instId || 'SYSTEM',
                        issue_date: new Date().toISOString().split('T')[0],
                        due_date: new Date().toISOString().split('T')[0],
                        total_amount: amt,
                        status: 'paid',
                        items: JSON.stringify([{
                            description: `SMS Units Purchase - ${unitsToCredit} units (KCB C2B)`,
                            quantity: 1,
                            unitPrice: amt / (unitsToCredit || 1),
                            amount: amt
                        }])
                    });

                    await supabase.from('receipts').insert({
                        id: `rec_sms_${Date.now()}`,
                        receipt_number: transactionID || `REC-SMS-${Date.now().toString().slice(-6)}`,
                        institution_id: instId || 'SYSTEM',
                        invoice_id: invoiceId,
                        amount_paid: amt,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'KCB IPN',
                        related_transaction_id: transaction.id
                    });

                    // Create Notification
                    if (metadata.requesterId) {
                        await supabase.from('app_notifications').insert({
                            id: `ntf_sms_${Date.now()}`,
                            user_id: metadata.requesterId,
                            message: `Payment successful via KCB! ${unitsToCredit.toLocaleString()} SMS units added. New Balance: ${newBalance.toLocaleString()} units.`,
                            type: 'success',
                            is_read: false,
                            timestamp: new Date().toISOString()
                        });
                    }
                } else if (type === 'subscription' || type === 'license') {
                    const days = metadata.plan === 'yearly' ? 365 : 30;
                    const currentEnd = inst?.subscription_ends_at ? new Date(inst.subscription_ends_at) : new Date();
                    const baseDate = Math.max(currentEnd.getTime(), Date.now());
                    const newEndDate = new Date(baseDate + (days * 24 * 60 * 60 * 1000));

                    await supabase.from('institutions').update({
                        subscription_ends_at: newEndDate.toISOString(),
                        status: 'active'
                    }).eq('id', instId);

                    const invoiceId = `inv_sub_${Date.now()}`;
                    await supabase.from('invoices').insert({
                        id: invoiceId,
                        invoice_number: `INV-SUB-${Date.now().toString().slice(-6)}`,
                        institution_id: instId,
                        issue_date: new Date().toISOString().split('T')[0],
                        due_date: new Date().toISOString().split('T')[0],
                        total_amount: amt,
                        status: 'paid',
                        items: JSON.stringify([{
                            description: `${metadata.plan === 'yearly' ? 'Yearly' : 'Monthly'} Subscription (KCB IPN)`,
                            quantity: 1,
                            unitPrice: amt,
                            amount: amt
                        }])
                    });

                    await supabase.from('receipts').insert({
                        id: `rec_sub_${Date.now()}`,
                        receipt_number: transactionID || `REC-SUB-${Date.now().toString().slice(-6)}`,
                        institution_id: instId,
                        invoice_id: invoiceId,
                        amount_paid: amt,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'KCB IPN',
                        related_transaction_id: transaction.id
                    });

                    if (metadata.requesterId) {
                        await supabase.from('app_notifications').insert({
                            id: `ntf_sub_${Date.now()}`,
                            user_id: metadata.requesterId,
                            message: `Successfully renewed subscription via KCB IPN! New expiry: ${newEndDate.toLocaleDateString()}`,
                            type: 'success',
                            is_read: false,
                            timestamp: new Date().toISOString()
                        });
                    }
                } else if (type === 'invoice' && metadata.invoiceId) {
                    await supabase.from('invoices').update({ status: 'paid' }).eq('id', metadata.invoiceId);

                    await supabase.from('receipts').insert({
                        id: `rec_inv_${Date.now()}`,
                        receipt_number: transactionID || `REC-INV-${Date.now().toString().slice(-6)}`,
                        institution_id: instId || 'SYSTEM',
                        invoice_id: metadata.invoiceId,
                        amount_paid: amt,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'KCB IPN',
                        related_transaction_id: transaction.id
                    });

                    if (metadata.requesterId) {
                        await supabase.from('app_notifications').insert({
                            id: `ntf_inv_${Date.now()}`,
                            user_id: metadata.requesterId,
                            message: `Invoice payment successful via KCB! Ref: ${transactionID}.`,
                            type: 'success',
                            is_read: false,
                            timestamp: new Date().toISOString()
                        });
                    }
                } else if ((type === 'car_invoice' || type === 'car_sales_invoices') && metadata.invoiceId) {
                    const { data: carInvoice } = await supabase
                        .from('car_sales_invoices')
                        .select('*')
                        .eq('id', metadata.invoiceId)
                        .maybeSingle();

                    if (carInvoice) {
                        const paidAmount = parseFloat(String(carInvoice.paid_amount || 0)) + amt;
                        const balanceAmount = Math.max(0, parseFloat(String(carInvoice.total_amount || 0)) - paidAmount);
                        const status = balanceAmount <= 0 ? 'fully_paid' : 'partially_paid';

                        await supabase
                            .from('car_sales_invoices')
                            .update({
                                paid_amount: paidAmount,
                                balance_amount: balanceAmount,
                                status,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', metadata.invoiceId);

                        await supabase.from('car_sales_payments').insert({
                            id: `pay_${Date.now()}`,
                            invoice_id: metadata.invoiceId,
                            institution_id: instId || carInvoice.institution_id || 'SYSTEM',
                            amount: amt,
                            payment_method: 'KCB IPN',
                            transaction_reference: transactionID || transaction.id,
                            payment_date: new Date().toISOString().split('T')[0],
                            receipt_number: `REC-${Date.now().toString().slice(-6)}`,
                            received_by: 'KCB IPN Integration',
                            notes: `Payment received via KCB IPN. Ref: ${transactionID || transaction.id}`,
                            created_at: new Date().toISOString()
                        });

                        if (metadata.requesterId) {
                            await supabase.from('app_notifications').insert({
                                id: `ntf_car_${Date.now()}`,
                                user_id: metadata.requesterId,
                                message: `Car payment of KES ${amt} successful for Invoice ${carInvoice.invoice_number}!`,
                                type: 'success',
                                is_read: false,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                }

                // Mark transaction as reconciled (setting reconciled: true in metadata)
                await supabase.from('mpesa_transactions').update({
                    metadata: { ...metadata, reconciled: true, reconciled_at: new Date().toISOString() }
                }).eq('id', transaction.id);

                // --- Send SMS Notification with updated balance ---
                const smsConfig = settings.sms_config || settings.smsConfig;
                const payerPhone = metadata.payerPhoneNumber || transaction.phone_number || phone;

                if (smsConfig && payerPhone) {
                    let smsMessage = '';
                    if (type === 'sms' || type === 'sms_topup') {
                        smsMessage = `Payment successful via KCB! ${unitsToCredit.toLocaleString()} SMS units added. New Balance: ${newBalance.toLocaleString()} units. Ref: ${transactionID}. Thank you for choosing Eduai Automation.`;
                    } else {
                        smsMessage = `Payment confirmed via KCB! KES ${amt} received. Ref: ${transactionID}. Thank you for choosing Eduai Automation.`;
                    }

                    try {
                        const provider = smsConfig.provider || 'Zettatel';
                        const normalizedPayerPhone = normalizePhone(payerPhone);

                        const baseUrl = smsConfig.baseUrl || smsConfig.api_url || (provider === 'Zettatel' ? 'https://sms.zettatel.com/smsapi/send' : 'https://sms.abmis.co.ke/SMSApi/send');
                        
                        const smsParams = new URLSearchParams({
                            userid: smsConfig.apiKey || smsConfig.api_key || smsConfig.username || smsConfig.userId,
                            password: smsConfig.apiSecret || smsConfig.api_secret || smsConfig.password,
                            mobile: normalizedPayerPhone,
                            msg: smsMessage,
                            senderid: smsConfig.fromNumber || provider,
                            msgType: 'text',
                            output: 'json'
                        });

                        const finalUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${smsParams.toString()}`;
                        await fetchWithTimeout(finalUrl, { method: 'GET' }, 15000);
                        console.log(`[KCB IPN] SMS Notification dispatched to ${normalizedPayerPhone}`);
                    } catch (smsErr) {
                        console.error('[KCB IPN] Failed to send SMS confirmation:', smsErr);
                    }
                }
            }
        }

        // Acknowledge receipt to KCB — use standard KCB IPN response format
        return res.status(200).json({
            header: {
                messageID,
                originatorConversationID,
                statusCode: "0",
                statusMessage: "Success"
            },
            responsePayload: {
                transactionInfo: {
                    transactionId: transactionID
                }
            },
            debug: {
                receivedPayload: {
                    transactionReference,
                    requestId,
                    channelCode,
                    timestamp,
                    transactionAmount,
                    currency,
                    customerReference,
                    customerName,
                    customerMobileNumber,
                    balance,
                    narration,
                    creditAccountIdentifier,
                    organizationShortCode,
                    tillNumber
                }
            }
        });

    } catch (err: any) {
        console.error('[KCB IPN Fatal]', err);
        return res.status(500).json({ message: 'Internal processing error' });
    }
}
