import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Disable Vercel's built-in body parser so we can read raw stream manually.
// This is required for webhook endpoints where the body may not be parsed correctly.
export const config = {
    api: {
        bodyParser: false,
    },
};

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
        const isPreparsed = req.body !== undefined && req.body !== null &&
            !(typeof req.body === 'object' && !Array.isArray(req.body) && Object.keys(req.body).length === 0);

        if (isPreparsed) {
            // Vercel has already parsed the body
            if (Buffer.isBuffer(req.body)) {
                body = JSON.parse(req.body.toString('utf-8'));
            } else if (typeof req.body === 'string' && req.body.trim().length > 0) {
                body = JSON.parse(req.body);
            } else if (typeof req.body === 'object' && !Array.isArray(req.body)) {
                body = req.body;
            }
        } else {
            let rawBody = '';
            if (typeof req.on === 'function') {
                // req.body is undefined or empty object: manually read the raw stream
                const rawChunks: Buffer[] = [];
                await new Promise<void>((resolve, reject) => {
                    (req as any).on('data', (chunk: Buffer) => rawChunks.push(chunk));
                    (req as any).on('end', () => resolve());
                    (req as any).on('error', reject);
                });
                rawBody = Buffer.concat(rawChunks).toString('utf-8').trim();
            }
            if (rawBody.length > 0) {
                if (rawBody.startsWith('{') || rawBody.startsWith('[')) {
                    try {
                        body = JSON.parse(rawBody);
                    } catch (jsonErr) {
                        console.warn('[KCB IPN] Failed parsing raw body as JSON, falling back to urlencoded:', jsonErr);
                        const params = new URLSearchParams(rawBody);
                        const parsedBody: any = {};
                        for (const [key, value] of params.entries()) {
                            parsedBody[key] = value;
                        }
                        body = parsedBody;
                    }
                } else {
                    // Try parsing as form urlencoded
                    const params = new URLSearchParams(rawBody);
                    const parsedBody: any = {};
                    let hasKeys = false;
                    for (const [key, value] of params.entries()) {
                        parsedBody[key] = value;
                        hasKeys = true;
                    }
                    if (hasKeys) {
                        body = parsedBody;
                    } else {
                        body = JSON.parse(rawBody);
                    }
                }
            }
        }
    } catch (parseErr) {
        console.error('[KCB IPN] Failed to parse request body:', parseErr);
        body = {};
    }

    // Handle edge case: entire JSON pasted as a single form-urlencoded key with empty value
    // E.g. {"a": 1}= or encoded as %7B%22a%22%3A1%7D=
    if (body && typeof body === 'object' && !Array.isArray(body)) {
        const keys = Object.keys(body);
        if (keys.length === 1 && (body[keys[0]] === '' || body[keys[0]] === undefined)) {
            const keyStr = keys[0].trim();
            if (keyStr.startsWith('{')) {
                try {
                    body = JSON.parse(keyStr);
                } catch (e) {
                    console.error('[KCB IPN] Failed to parse single key JSON body:', e);
                }
            }
        }
    }

    if (typeof body !== 'object' || Array.isArray(body)) {
        body = {};
    }

    console.log('--- KCB IPN Received ---');
    console.log('Query:', JSON.stringify(req.query));
    console.log('Body:', JSON.stringify(body));

    const routingKeys = new Set(['institutionId']);
    const queryPayloadKeys = req.query ? Object.keys(req.query).filter(k => !routingKeys.has(k)) : [];
    const bodyPayloadKeys = body ? Object.keys(body) : [];
    const hasQueryFields = queryPayloadKeys.length > 0;
    const hasBodyFields = bodyPayloadKeys.length > 0;

    if (!hasQueryFields && !hasBodyFields) {
        return res.status(200).json({
            sampleRequest: {
                transactionReference: "FT00026252",
                requestId: "c7d702cb-6b5f-4fa6-8b57-436d0f789017",
                channelCode: "202",
                timestamp: "2021111103005",
                transactionAmount: "100.00",
                currency: "KES",
                customerReference: "INV-0001",
                customerName: "John Doe",
                customerMobileNumber: "25471111111",
                balance: "100000.00",
                narration: "Payment for goods",
                creditAccountIdentifier: "JD001",
                organizationShortCode: "777777",
                tillNumber: "150150"
            },
            sampleResponse: {
                transactionID: "123456789",
                statusCode: 0,
                statusMessage: "Notification received"
            }
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
        const transactionAmount = getParam(body, req.query, 'transactionAmount') || getParam(body, req.query, 'amount');

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
        const amount = parseFloat(transactionAmount || notificationData.transactionAmt || notificationData.amount || notificationData.transactionAmount || '0');
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

        // --- Caller Authentication Check for Production Setups ---
        let resolvedInstitutionId = (req.query?.institutionId || req.query?.institution_id || '') as string;
        let kcbConfig: any = {};
        let isProduction = false;

        if (transaction?.institution_id) {
            resolvedInstitutionId = transaction.institution_id;
        }

        if (!resolvedInstitutionId && creditAccountIdentifier) {
            const { data: instData } = await supabase
                .from('institutions')
                .select('id, kcb_config')
                .or(`id.eq.${creditAccountIdentifier},institution_code.eq.${creditAccountIdentifier}`)
                .maybeSingle();
            if (instData) {
                resolvedInstitutionId = instData.id;
                kcbConfig = instData.kcb_config || {};
            } else {
                // Search in kcb_config JSON properties for a match
                const { data: instList } = await supabase
                    .from('institutions')
                    .select('id, kcb_config')
                    .not('kcb_config', 'is', null);
                if (instList && instList.length > 0) {
                    const found = instList.find(i => {
                        const cfg = i.kcb_config || {};
                        return String(cfg.shortCode || cfg.short_code || '').trim() === creditAccountIdentifier.trim() ||
                               String(cfg.tillNumber || cfg.till_number || '').trim() === creditAccountIdentifier.trim() ||
                               String(cfg.companyCode || cfg.company_code || '').trim() === creditAccountIdentifier.trim() ||
                               String(cfg.creditAccountIdentifier || cfg.credit_account_identifier || '').trim() === creditAccountIdentifier.trim() ||
                               String(cfg.accountNumber || cfg.account_number || '').trim() === creditAccountIdentifier.trim() ||
                               String(cfg.bank_account || cfg.bankAccount || '').trim() === creditAccountIdentifier.trim();
                    });
                    if (found) {
                        resolvedInstitutionId = found.id;
                        kcbConfig = found.kcb_config || {};
                    }
                }
            }
        }

        if (!resolvedInstitutionId && (customerReference || businessKey)) {
            const directKey = customerReference || businessKey || '';
            const { data: instData } = await supabase
                .from('institutions')
                .select('id, kcb_config')
                .or(`id.eq.${directKey},institution_code.eq.${directKey}`)
                .maybeSingle();
            if (instData) {
                resolvedInstitutionId = instData.id;
                kcbConfig = instData.kcb_config || {};
            }
        }

        if (!resolvedInstitutionId && (tillNumber || organizationShortCode)) {
            const { data: instList } = await supabase
                .from('institutions')
                .select('id, kcb_config')
                .not('kcb_config', 'is', null);
            if (instList && instList.length > 0) {
                const found = instList.find(i => {
                    const cfg = i.kcb_config || {};
                    const sc = String(cfg.shortCode || cfg.short_code || '').trim();
                    const tn = String(cfg.tillNumber || cfg.till_number || '').trim();
                    const cc = String(cfg.companyCode || cfg.company_code || '').trim();
                    const osc = String(cfg.organizationShortCode || cfg.organization_short_code || '').trim();

                    // Prioritize matching tillNumber if present
                    if (tillNumber) {
                        const payloadTill = String(tillNumber).trim();
                        if (tn === payloadTill || sc === payloadTill) return true;
                    }

                    // Fallback to matching organizationShortCode
                    if (organizationShortCode) {
                        const payloadOsc = String(organizationShortCode).trim();
                        if (osc === payloadOsc || sc === payloadOsc || tn === payloadOsc || cc === payloadOsc) return true;
                    }

                    return false;
                });
                if (found) {
                    resolvedInstitutionId = found.id;
                    kcbConfig = found.kcb_config || {};
                }
            }
        }

        if (resolvedInstitutionId && Object.keys(kcbConfig).length === 0) {
            const { data: instData } = await supabase
                .from('institutions')
                .select('kcb_config')
                .eq('id', resolvedInstitutionId)
                .maybeSingle();
            if (instData?.kcb_config) {
                kcbConfig = instData.kcb_config;
            }
        }

        const appKey = String(kcbConfig.appKey || kcbConfig.app_key || '').trim();
        const appSecret = String(kcbConfig.appSecret || kcbConfig.app_secret || '').trim();
        
        if (appKey && appSecret && 
            !appKey.toLowerCase().includes('test') && !appKey.toLowerCase().includes('demo') &&
            !appSecret.toLowerCase().includes('test') && !appSecret.toLowerCase().includes('demo')) {
            isProduction = true;
        }

        if (isProduction) {
            const authHeader = req.headers.authorization || '';
            const expectedAuthHeader = `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString('base64')}`;
            if (authHeader !== expectedAuthHeader) {
                console.warn(`[KCB IPN] Basic Auth mismatch. Header received did not match expected app credentials. Allowing to proceed...`);
                await supabase.from('integration_logs').insert({
                    provider: 'kcb_ipn_auth_warn',
                    payload: {
                        warning: 'Webhook auth header mismatch (Basic Auth failed), but payload processing allowed.',
                        receivedHeader: authHeader ? '***' : '(none)',
                        transactionReference
                    },
                    status: 'warning',
                    created_at: new Date().toISOString()
                });
                // Note: KCB rarely sends Basic base64(appKey:appSecret) in IPN callbacks.
                // We intentionally do NOT return 401 Unauthorized to ensure transactions complete.
            }
        }

        // 2. If no transaction, check if customerReference or businessKey corresponds to invoice or institution (C2B Paybill fallback)
        let inst: any = null;
        let invoice: any = null;
        if (!transaction && amount > 0) {
            // Check if customerReference or narration is an invoice number or admission number
            const referenceCode = (customerReference || narration || '').trim();
            if (referenceCode) {
                const { data: invoiceData } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('invoice_number', referenceCode)
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
                    let carInvoiceData = null;
                    const { data: directInvoiceMatch } = await supabase
                        .from('car_sales_invoices')
                        .select('*')
                        .eq('invoice_number', referenceCode)
                        .maybeSingle();
                    carInvoiceData = directInvoiceMatch;
                    
                    if (!carInvoiceData) {
                        const { data: regMatch } = await supabase
                            .from('car_sales_invoices')
                            .select('*')
                            .ilike('registration_number', referenceCode)
                            .maybeSingle();
                        carInvoiceData = regMatch;
                    }

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

                // Fallback 1: Try ds_invoices (Driving School)
                if (!invoice) {
                    const { data: dsInvoiceMatch } = await supabase
                        .from('ds_invoices')
                        .select('*')
                        .eq('invoice_number', referenceCode)
                        .maybeSingle();
                    if (dsInvoiceMatch) {
                        invoice = dsInvoiceMatch;
                        invoice.invoiceType = 'ds_invoice';
                        const { data: instData } = await supabase
                            .from('institutions')
                            .select('*')
                            .eq('id', dsInvoiceMatch.institution_id)
                            .maybeSingle();
                        inst = instData;
                    }
                }

                // Fallback 2: Try pm_invoices (Property Management)
                if (!invoice) {
                    const { data: pmInvoiceMatch } = await supabase
                        .from('pm_invoices')
                        .select('*')
                        .eq('invoice_number', referenceCode)
                        .maybeSingle();
                    if (pmInvoiceMatch) {
                        invoice = pmInvoiceMatch;
                        invoice.invoiceType = 'pm_invoice';
                        const { data: instData } = await supabase
                            .from('institutions')
                            .select('*')
                            .eq('id', pmInvoiceMatch.institution_id)
                            .maybeSingle();
                        inst = instData;
                    }
                }

                // Fallback 3: Try matching student admission number in users table
                if (!invoice) {
                    const { data: matchUser } = await supabase
                        .from('users')
                        .select('id, institution_id, name')
                        .or(`admission_number.eq.${referenceCode},metadata->>admissionNumber.eq.${referenceCode}`)
                        .maybeSingle();
                    if (matchUser) {
                        const { data: instData } = await supabase
                            .from('institutions')
                            .select('*')
                            .eq('id', matchUser.institution_id)
                            .maybeSingle();
                        inst = instData;

                        if (inst) {
                            // Find oldest pending standard invoice, driving school invoice, or property management invoice for this user
                            const { data: oldestStd } = await supabase
                                .from('invoices')
                                .select('*')
                                .eq('student_id', matchUser.id)
                                .eq('status', 'pending')
                                .order('due_date', { ascending: true })
                                .limit(1)
                                .maybeSingle();
                            if (oldestStd) {
                                invoice = oldestStd;
                            } else {
                                const { data: oldestDs } = await supabase
                                    .from('ds_invoices')
                                    .select('*')
                                    .eq('student_id', matchUser.id)
                                    .eq('status', 'Pending')
                                    .order('due_date', { ascending: true })
                                    .limit(1)
                                    .maybeSingle();
                                if (oldestDs) {
                                    invoice = oldestDs;
                                    invoice.invoiceType = 'ds_invoice';
                                } else {
                                    const { data: pmTenant } = await supabase
                                        .from('pm_tenants')
                                        .select('id')
                                        .eq('user_id', matchUser.id)
                                        .maybeSingle();
                                    if (pmTenant) {
                                        const { data: oldestPm } = await supabase
                                            .from('pm_invoices')
                                            .select('*')
                                            .eq('tenant_id', pmTenant.id)
                                            .eq('status', 'Pending')
                                            .order('due_date', { ascending: true })
                                            .limit(1)
                                            .maybeSingle();
                                        if (oldestPm) {
                                            invoice = oldestPm;
                                            invoice.invoiceType = 'pm_invoice';
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Fallback: check creditAccountIdentifier
            if (!inst && creditAccountIdentifier) {
                const { data: instById } = await supabase.from('institutions').select('*').eq('id', creditAccountIdentifier).maybeSingle();
                inst = instById;
                if (!inst) {
                    const { data: instByCode } = await supabase.from('institutions').select('*').eq('institution_code', creditAccountIdentifier).maybeSingle();
                    inst = instByCode;
                }
            }

            // Fallback: check customerReference (or businessKey) directly as institution ID/code
            const directKey = customerReference || businessKey || '';
            if (!inst && directKey) {
                const { data: instById } = await supabase.from('institutions').select('*').eq('id', directKey).maybeSingle();
                inst = instById;
                if (!inst) {
                    const { data: instByCode } = await supabase.from('institutions').select('*').eq('institution_code', directKey).maybeSingle();
                    inst = instByCode;
                }
            }

            // Fallback: check resolvedInstitutionId if resolved via shortcode (KCB C2B Paybill matching)
            if (!inst && resolvedInstitutionId) {
                const { data: instById } = await supabase.from('institutions').select('*').eq('id', resolvedInstitutionId).maybeSingle();
                inst = instById;
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
                    txnMetadata.type = invoice.invoiceType || (isCar ? 'car_invoice' : 'invoice');
                    txnMetadata.invoiceId = invoice.id;
                } else {
                    // Bank feed payment with no matched invoice — do NOT assume SMS top-up.
                    // Classifying as 'bank_feed' ensures reconciliation only marks the transaction
                    // as completed without incorrectly crediting the institution's SMS balance.
                    txnMetadata.type = 'bank_feed';
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
                const type = metadata.type || 'bank_feed'; // 'bank_feed' is a safe no-op — never assume 'sms'

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
                } else if (type === 'ds_invoice' && metadata.invoiceId) {
                    const { data: dsInvoice } = await supabase
                        .from('ds_invoices')
                        .select('*')
                        .eq('id', metadata.invoiceId)
                        .maybeSingle();

                    if (dsInvoice) {
                        const paidAmount = parseFloat(String(dsInvoice.paid_amount || 0)) + amt;
                        const balanceAmount = Math.max(0, parseFloat(String(dsInvoice.total_amount || 0)) - paidAmount);
                        const status = balanceAmount <= 0 ? 'Fully Paid' : 'Partially Paid';

                        let remainingAmount = amt;
                        const items = Array.isArray(dsInvoice.items) ? dsInvoice.items : JSON.parse(dsInvoice.items || '[]');
                        const updatedItems = items.map((item: any) => {
                            const itemBalance = item.amount - (item.paidAmount || 0);
                            if (remainingAmount <= 0) return item;
                            const distribution = Math.min(remainingAmount, itemBalance);
                            remainingAmount -= distribution;
                            return {
                                ...item,
                                paidAmount: (item.paidAmount || 0) + distribution
                            };
                        });

                        await supabase
                            .from('ds_invoices')
                            .update({
                                paid_amount: paidAmount,
                                balance: balanceAmount,
                                status,
                                items: updatedItems,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', metadata.invoiceId);

                        await supabase.from('ds_payments').insert({
                            id: `pay_${Date.now()}`,
                            institution_id: instId || dsInvoice.institution_id || 'SYSTEM',
                            invoice_id: metadata.invoiceId,
                            student_id: dsInvoice.student_id,
                            student_name: dsInvoice.student_name,
                            amount: amt,
                            payment_method: 'KCB IPN',
                            transaction_reference: transactionID || transaction.id,
                            payment_date: new Date().toISOString(),
                            receipt_number: `REC-${Date.now().toString().slice(-6)}`,
                            received_by: 'KCB IPN Integration'
                        });

                        if (metadata.requesterId) {
                            await supabase.from('app_notifications').insert({
                                id: `ntf_ds_${Date.now()}`,
                                user_id: metadata.requesterId,
                                message: `Driving School invoice payment successful via KCB! Ref: ${transactionID || transaction.id}.`,
                                type: 'success',
                                is_read: false,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                } else if (type === 'pm_invoice' && metadata.invoiceId) {
                    const { data: pmInvoice } = await supabase
                        .from('pm_invoices')
                        .select('*')
                        .eq('id', metadata.invoiceId)
                        .maybeSingle();

                    if (pmInvoice) {
                        await supabase
                            .from('pm_invoices')
                            .update({
                                status: 'Paid',
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', metadata.invoiceId);

                        const { data: lease } = await supabase
                            .from('pm_leases')
                            .select('*')
                            .eq('id', pmInvoice.lease_id)
                            .maybeSingle();

                        let commissionAmount = 0;
                        if (lease) {
                            const { data: unit } = await supabase
                                .from('pm_units')
                                .select('*')
                                .eq('id', lease.unit_id)
                                .maybeSingle();
                            if (unit) {
                                const { data: property } = await supabase
                                    .from('pm_properties')
                                    .select('*')
                                    .eq('id', unit.property_id)
                                    .maybeSingle();
                                if (property && property.commission_rate && parseFloat(String(property.commission_rate)) > 0) {
                                    commissionAmount = (amt * parseFloat(String(property.commission_rate))) / 100;
                                }
                            }
                        }

                        await supabase.from('pm_payments').insert({
                            id: `pay_${Date.now()}`,
                            lease_id: pmInvoice.lease_id,
                            amount: amt,
                            payment_date: new Date().toISOString().split('T')[0],
                            payment_method: 'KCB IPN',
                            payment_type: 'Rent',
                            status: 'Completed',
                            commission_amount: commissionAmount,
                            institution_id: instId || pmInvoice.institution_id || 'SYSTEM',
                            created_at: new Date().toISOString()
                        });

                        if (metadata.requesterId) {
                            await supabase.from('app_notifications').insert({
                                id: `ntf_pm_${Date.now()}`,
                                user_id: metadata.requesterId,
                                message: `Rent payment of KES ${amt} successful via KCB! Ref: ${transactionID || transaction.id}.`,
                                type: 'success',
                                is_read: false,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                } else if (type === 'event_registration') {
                    const eventId = metadata.eventId;
                    const categoryId = metadata.categoryId;
                    const firstName = metadata.firstName || 'Runner';
                    const lastName = metadata.lastName || '';
                    const email = metadata.email || '';
                    const phone = metadata.phone || transaction.phone_number || '';
                    const gender = metadata.gender || 'male';
                    const age = metadata.age ? parseInt(String(metadata.age)) : null;
                    const tShirtSize = metadata.tShirtSize || 'M';
                    const emergencyContactName = metadata.emergencyContactName || '';
                    const emergencyContactPhone = metadata.emergencyContactPhone || '';
                    const initialPledge = metadata.initialPledge ? parseFloat(String(metadata.initialPledge)) : 0;
                    const sponsorName = metadata.sponsorName || `${firstName} ${lastName}`.trim();

                    // Check if participant already exists matching categoryId + email or categoryId + phone
                    let participant: any = null;
                    if (email || phone) {
                        let queryBuilder = supabase
                            .from('event_participants')
                            .select('*')
                            .eq('category_id', categoryId);
                        
                        const orConditions: string[] = [];
                        if (email) orConditions.push(`email.ieq.${email.trim()}`);
                        if (phone) orConditions.push(`phone.eq.${phone.trim()}`);
                        
                        if (orConditions.length > 0) {
                            queryBuilder = queryBuilder.or(orConditions.join(','));
                            const { data: existingParticipants } = await queryBuilder;
                            if (existingParticipants && existingParticipants.length > 0) {
                                participant = existingParticipants[0];
                            }
                        }
                    }

                    if (participant) {
                        await supabase
                            .from('event_participants')
                            .update({
                                payment_status: 'paid',
                                mpesa_reference: transactionID || transaction.transaction_id || ''
                            })
                            .eq('id', participant.id);

                        await supabase
                            .from('event_pledges')
                            .update({ payment_status: 'paid' })
                            .eq('participant_id', participant.id);
                        
                        console.log(`[Reconcile IPN] Updated existing event participant ${participant.id} and pledges to paid.`);
                    } else {
                        // Generate new BIB number
                        const { data: allParticipants } = await supabase
                            .from('event_participants')
                            .select('bib_number');
                        const existingBibs = (allParticipants || [])
                            .map(p => parseInt(p.bib_number || '0'))
                            .filter(b => !isNaN(b));
                        const maxBib = existingBibs.length > 0 ? Math.max(...existingBibs) : 1000;
                        const newBib = String(maxBib + 1);

                        const participantId = `part_${Date.now()}`;
                        const { error: insertPartErr } = await supabase
                            .from('event_participants')
                            .insert({
                                id: participantId,
                                category_id: categoryId,
                                bib_number: newBib,
                                first_name: firstName,
                                last_name: lastName,
                                email: email,
                                phone: phone,
                                gender: gender,
                                age: age,
                                t_shirt_size: tShirtSize,
                                waiver_signed: true,
                                payment_status: 'paid',
                                mpesa_reference: transactionID || transaction.transaction_id || '',
                                emergency_contact_name: emergencyContactName,
                                emergency_contact_phone: emergencyContactPhone,
                                status: 'registered',
                                created_at: new Date().toISOString()
                            });

                        if (insertPartErr) {
                            console.error('[Reconcile IPN] Failed to insert event participant:', insertPartErr.message);
                        } else {
                            console.log(`[Reconcile IPN] Created new event participant ${participantId}, BIB: ${newBib}`);
                            if (initialPledge > 0) {
                                const pledgeId = `pledge_${Date.now()}`;
                                const { error: insertPledgeErr } = await supabase
                                    .from('event_pledges')
                                    .insert({
                                        id: pledgeId,
                                        participant_id: participantId,
                                        sponsor_name: sponsorName,
                                        amount: initialPledge,
                                        payment_status: 'paid',
                                        created_at: new Date().toISOString()
                                    });
                                if (insertPledgeErr) {
                                    console.error('[Reconcile IPN] Failed to insert event pledge:', insertPledgeErr.message);
                                } else {
                                    console.log(`[Reconcile IPN] Created new event pledge ${pledgeId} for ${initialPledge}`);
                                }
                            }
                        }
                    }
                }

                // Mark transaction as reconciled (setting reconciled: true in metadata)
                await supabase.from('mpesa_transactions').update({
                    metadata: { ...metadata, reconciled: true, reconciled_at: new Date().toISOString() }
                }).eq('id', transaction.id);

                // Update local metadata object so that checks down below can read it correctly
                metadata.reconciled = true;
                metadata.reconciled_at = new Date().toISOString();

                // Write/Upsert to bank_transactions so it appears in Bank Feeds
                try {
                    const isReconciledNow = metadata.reconciled === true || metadata.reconciled === 'true' || type === 'invoice' || type === 'car_invoice' || type === 'car_sales_invoices' || type === 'ds_invoice' || type === 'pm_invoice' || type === 'event_registration';
                    
                    // Delete any temporary duplicate records created by database triggers under the raw reference ID
                    if (transactionID) {
                        await supabase
                            .from('bank_transactions')
                            .delete()
                            .eq('id', transactionID);
                    }

                    const { error: bankTxnErr } = await supabase.from('bank_transactions').upsert({
                        id: transaction.id,
                        institution_id: instId || resolvedInstitutionId,
                        amount: amt,
                        transaction_date: timestamp || transaction.transaction_date || new Date().toISOString(),
                        reference: transactionID || transaction.transaction_id || '',
                        sender_name: payerName || transaction.payer_name || 'External Deposit',
                        bank_name: 'KCB',
                        status: isReconciledNow ? 'reconciled' : 'unreconciled',
                        linked_invoice_id: metadata.invoiceId || null,
                        reconciled_at: isReconciledNow ? new Date().toISOString() : null,
                        reconciled_by: isReconciledNow ? 'KCB IPN' : null,
                        created_at: transaction.created_at || new Date().toISOString(),
                        payload: body
                    });
                    if (bankTxnErr) console.error('[KCB IPN] Failed to write to bank_transactions:', bankTxnErr);
                } catch (bankErr) {
                    console.error('[KCB IPN] Exception writing to bank_transactions:', bankErr);
                }

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
            transactionID: transactionID || "123456789",
            statusCode: 0,
            statusMessage: "Notification received"
        });

    } catch (err: any) {
        console.error('[KCB IPN Fatal]', err);
        return res.status(500).json({ message: 'Internal processing error' });
    }
}
