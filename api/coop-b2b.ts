import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Self-contained Supabase service client factory to avoid external library crashes
const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Serve interactive playground for testing
    if (req.method === 'GET') {
        const url = req.url || '';
        let subRoute = '';
        if (req.query.path) {
            subRoute = String(req.query.path).toLowerCase().replace(/\/$/, '');
        } else {
            const pathname = url.split('?')[0];
            const parts = pathname.split('/');
            const lastPart = parts[parts.length - 1].toLowerCase();
            if (lastPart !== 'coop-b2b') {
                subRoute = lastPart;
            }
        }

        if (subRoute === 'ip') {
            res.setHeader('Content-Type', 'application/json');
            let serverIp = 'Unknown';
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = (await ipRes.json()) as any;
                serverIp = ipData.ip || 'Unknown';
            } catch (err) {
                // Fallback
            }
            const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Unknown').split(',')[0].trim();
            return res.status(200).json({ serverIp, clientIp });
        }

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Co-op Bank B2B Gateway Playground</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0b0f19;
            --panel-bg: rgba(17, 24, 39, 0.9);
            --border-color: rgba(37, 99, 235, 0.2);
            --coop-green: #005F54;
            --coop-gold: #D4AF37;
            --coop-green-hover: #007D6E;
            --text-main: #f3f4f6;
            --text-muted: #9ca3af;
        }
        body {
            font-family: 'Outfit', sans-serif;
            background: radial-gradient(circle at top, #111827, #0b0f19);
            color: var(--text-main);
            margin: 0;
            padding: 2rem;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container {
            max-width: 1000px;
            width: 100%;
            background: var(--panel-bg);
            border: 1px solid var(--border-color);
            border-radius: 24px;
            padding: 2.5rem;
            backdrop-filter: blur(12px);
            box-shadow: 0 10px 50px 0 rgba(0, 0, 0, 0.5);
        }
        .logo-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid rgba(212, 175, 55, 0.2);
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
        }
        .logo-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .logo-circle {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, var(--coop-green), var(--coop-gold));
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            color: white;
            font-size: 1.5rem;
        }
        h1 {
            font-weight: 800;
            font-size: 2rem;
            margin: 0;
            background: linear-gradient(45deg, #f3f4f6, var(--coop-gold));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.5px;
        }
        p.subtitle {
            color: var(--text-muted);
            margin: 5px 0 0 0;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 600;
        }
        .grid {
            display: grid;
            grid-template-columns: 1.1fr 0.9fr;
            gap: 2.5rem;
        }
        .form-section, .result-section {
            display: flex;
            flex-direction: column;
        }
        .tab-buttons {
            display: flex;
            gap: 10px;
            margin-bottom: 1.5rem;
            background: rgba(0, 0, 0, 0.2);
            padding: 6px;
            border-radius: 12px;
        }
        .tab-btn {
            flex: 1;
            padding: 10px;
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-family: 'Outfit', sans-serif;
            font-size: 0.85rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .tab-btn.active {
            background: var(--coop-green);
            color: white;
            box-shadow: 0 4px 12px rgba(0, 95, 84, 0.3);
        }
        .form-group {
            margin-bottom: 1.2rem;
        }
        label {
            display: block;
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-bottom: 0.4rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        input, select, textarea {
            width: 100%;
            box-sizing: border-box;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px;
            color: white;
            font-family: 'Outfit', sans-serif;
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: var(--coop-gold);
            box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
        }
        .submit-btn {
            background: linear-gradient(135deg, var(--coop-green), var(--coop-green-hover));
            border: 1px solid var(--coop-gold);
            color: white;
            padding: 14px;
            font-size: 0.95rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-radius: 12px;
            cursor: pointer;
            margin-top: 1rem;
            transition: all 0.2s;
        }
        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 95, 84, 0.4);
        }
        .submit-btn:active {
            transform: translateY(0);
        }
        pre {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 1.5rem;
            overflow-x: auto;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            color: #50e3c2;
            flex-grow: 1;
            min-height: 250px;
        }
        .badge {
            align-self: flex-start;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 1rem;
        }
        .badge-success { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-pending { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
        .endpoint-url {
            background: rgba(0, 0, 0, 0.2);
            padding: 8px 12px;
            border-radius: 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            color: var(--coop-gold);
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-bar">
            <div class="logo-title">
                <div class="logo-circle">C</div>
                <div>
                    <h1>Co-op Bank B2B Standard API Gateway</h1>
                    <p class="subtitle">Validation & Payment Advice Integration Portal</p>
                </div>
            </div>
            <span class="badge badge-success">Online & Listening</span>
        </div>

        <div class="endpoint-url">
            <span id="endpoint-display">ENDPOINT URL: /api/coop-b2b/validation</span>
            <span style="font-size: 0.7rem; color: var(--text-muted)">REST METHOD: POST</span>
        </div>

        <div class="grid">
            <div class="form-section">
                <div class="tab-buttons">
                    <button id="tab-validate" class="tab-btn active" onclick="switchTab('validate')">Account Validation</button>
                    <button id="tab-advise" class="tab-btn" onclick="switchTab('advise')">Payment Advice</button>
                    <button id="tab-credentials" class="tab-btn" onclick="switchTab('credentials')">Validate Credentials</button>
                </div>

                <form id="playground-form" onsubmit="runSimulation(event)">
                    <div class="form-group">
                        <label>ServiceName (Header)</label>
                        <input type="text" id="serviceName" value="KEWISCO SACCO" required>
                    </div>
                    <div class="form-group">
                        <label>Connection ID</label>
                        <input type="text" id="connectionID" value="TEST" required>
                    </div>
                    <div class="form-group">
                        <label>Connection Password</label>
                        <input type="text" id="connectionPassword" value="CoopTest" required>
                    </div>

                    <!-- Validation Fields -->
                    <div id="validation-fields">
                        <div class="form-group">
                            <label>TransactionReferenceCode (Identifier / Invoice / Registration #)</label>
                            <input type="text" id="valRefCode" placeholder="e.g. EDA/1140/13 or Showroom Invoice #">
                        </div>
                        <div class="form-group">
                            <label>Institution Code</label>
                            <input type="text" id="valInstCode" value="210001918">
                        </div>
                    </div>

                    <!-- Payment Advice Fields -->
                    <div id="advise-fields" style="display: none;">
                        <div class="form-group">
                            <label>TransactionReferenceCode (Bank unique code)</label>
                            <input type="text" id="advTxnRef" placeholder="e.g. COOPB2B87492194">
                        </div>
                        <div class="form-group">
                            <label>DocumentReferenceNumber / AccountNumber (Target Invoice / Reg #)</label>
                            <input type="text" id="advDocRef" placeholder="e.g. EDA/1140/13 or Invoice Number">
                        </div>
                        <div class="form-group">
                            <label>Total Payment Amount (KES)</label>
                            <input type="number" id="advAmount" value="500.0">
                        </div>
                        <div class="form-group">
                            <label>Institution Code</label>
                            <input type="number" id="advInstCode" value="210001918">
                        </div>
                    </div>

                    <button type="submit" class="submit-btn">Fire API Request</button>
                </form>
            </div>

            <div class="result-section">
                <label>API Response Payload</label>
                <pre id="api-output">// Response will display here after submission</pre>
            </div>
        </div>
    </div>

    <script>
        let currentAction = 'validate';

        function switchTab(action) {
            currentAction = action;
            document.getElementById('tab-validate').classList.toggle('active', action === 'validate');
            document.getElementById('tab-advise').classList.toggle('active', action === 'advise');
            document.getElementById('tab-credentials').classList.toggle('active', action === 'credentials');
            
            document.getElementById('validation-fields').style.display = action === 'validate' ? 'block' : 'none';
            document.getElementById('advise-fields').style.display = action === 'advise' ? 'block' : 'none';

            let endpointPath = '/api/coop-b2b/validation';
            if (action === 'advise') {
                endpointPath = '/api/coop-b2b/payment-advice';
            } else if (action === 'credentials') {
                endpointPath = '/api/coop-b2b/validate-credentials';
            }
            document.getElementById('endpoint-display').textContent = 'ENDPOINT URL: ' + endpointPath;
        }

        async function runSimulation(e) {
            e.preventDefault();
            const outputElement = document.getElementById('api-output');
            outputElement.textContent = "Loading response...";

            let requestPayload = {};
            let endpoint = '/api/coop-b2b/validation';

            if (currentAction === 'validate') {
                endpoint = '/api/coop-b2b/validation';
                requestPayload = {
                    TransactionReferenceCode: document.getElementById('valRefCode').value || "536",
                    TransactionDate: new Date().toISOString(),
                    InstitutionCode: document.getElementById('valInstCode').value
                };
            } else if (currentAction === 'advise') {
                endpoint = '/api/coop-b2b/payment-advice';
                requestPayload = {
                    TransactionReferenceCode: document.getElementById('advTxnRef').value || ("COOPB2B" + Math.floor(Math.random() * 1000000000)),
                    TransactionDate: new Date().toISOString(),
                    TotalAmount: parseFloat(document.getElementById('advAmount').value).toFixed(1),
                    Currency: "KES",
                    DocumentReferenceNumber: document.getElementById('advDocRef').value || "536",
                    BankCode: "00011",
                    BranchCode: "00011001",
                    PaymentDate: new Date().toISOString(),
                    PaymentReferenceCode: document.getElementById('advTxnRef').value || "COOPB2B_REF",
                    PaymentCode: "1",
                    PaymentMode: "1",
                    PaymentAmount: parseFloat(document.getElementById('advAmount').value).toFixed(1),
                    AdditionalInfo: "IDENTIFIER'S_NAME",
                    AccountNumber: document.getElementById('advDocRef').value || "536",
                    AccountName: "IDENTIFIER'S_NAME",
                    InstitutionCode: parseInt(document.getElementById('advInstCode').value),
                    InstitutionName: "KEWISCO SACCO"
                };
            } else if (currentAction === 'credentials') {
                endpoint = '/api/coop-b2b/validate-credentials';
                requestPayload = {};
            }

            const payload = {
                header: {
                    serviceName: document.getElementById('serviceName').value,
                    connectionID: document.getElementById('connectionID').value,
                    connectionPassword: document.getElementById('connectionPassword').value,
                    messageID: crypto.randomUUID()
                },
                request: requestPayload
            };

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                const data = await response.json();
                outputElement.textContent = JSON.stringify(data, null, 2);
            } catch (err) {
                outputElement.textContent = "API Error:\n" + err.message;
            }
        }
    </script>
</body>
</html>`);
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Parse sub-route
    const url = req.url || '';
    let subRoute = '';
    if (req.query.path) {
        subRoute = String(req.query.path).toLowerCase().replace(/\/$/, '');
    } else {
        const pathname = url.split('?')[0];
        const parts = pathname.split('/');
        const lastPart = parts[parts.length - 1].toLowerCase();
        if (lastPart !== 'coop-b2b') {
            subRoute = lastPart;
        }
    }

    const body = req.body || {};
    const header = body.header || {};
    const bodyRequest = body.request || {};

    const connectionID = header.connectionID || '';
    const connectionPassword = header.connectionPassword || '';
    const messageID = header.messageID || `MSG_${Date.now()}`;

    if (!connectionID || !connectionPassword) {
        return res.status(200).json({
            header: {
                messageID,
                statusCode: '401',
                statusDescription: 'The caller is not authorized for this request. Connection credentials missing.'
            }
        });
    }

    const supabase = getSupabase();
    if (!supabase) {
        return res.status(200).json({
            header: {
                messageID,
                statusCode: '405',
                statusDescription: 'Database context missing or unavailable.'
            }
        });
    }

    // Credentials verification
    let isAuthorized = false;
    let institution: any = null;

    if (connectionID === 'TEST' && connectionPassword === 'CoopTest') {
        isAuthorized = true;
    } else {
        try {
            // Match connection credentials in database (institutions.coop_settings)
            const { data: inst } = await supabase
                .from('institutions')
                .select('*')
                .eq('coop_settings->>connectionID', connectionID)
                .maybeSingle();

            if (inst) {
                const settings = inst.coop_settings || {};
                if (settings.connectionPassword === connectionPassword) {
                    isAuthorized = true;
                    institution = inst;
                }
            }
        } catch (err) {
            console.error('[Coop B2B] Auth check failed:', err);
        }
    }

    if (!isAuthorized) {
        return res.status(200).json({
            header: {
                messageID,
                statusCode: '401',
                statusDescription: 'The caller is not authorized for this request. Invalid connection credentials.'
            }
        });
    }

    // Handle credentials check endpoint
    if (subRoute === 'validate-credentials' || subRoute === 'credentials') {
        return res.status(200).json({
            header: {
                messageID,
                statusCode: '200',
                statusDescription: 'Credentials successfully validated.'
            }
        });
    }

    try {
        // Log transaction integration
        try {
            await supabase.from('integration_logs').insert({
                provider: 'coop_b2b',
                payload: body,
                status: 'received',
                created_at: new Date().toISOString()
            });
        } catch (err) {
            console.warn('[Coop B2B] Log failed:', err);
        }

        // Determine if this is a validation request
        let isValidation = false;
        if (subRoute === 'validation') {
            isValidation = true;
        } else if (subRoute === 'payment-advice' || subRoute === 'advice') {
            isValidation = false;
        } else {
            // Fallback: Dynamic detection for backward compatibility
            isValidation = bodyRequest.TotalAmount === undefined || parseFloat(String(bodyRequest.TotalAmount)) === 0;
        }

        if (isValidation) {
            // ================= ACCOUNT VALIDATION LOGIC =================
            const refCode = String(bodyRequest.TransactionReferenceCode || '').trim();
            const instCode = String(bodyRequest.InstitutionCode || '').trim();

            if (!refCode) {
                return res.status(200).json({
                    header: {
                        messageID,
                        statusCode: '400',
                        statusDescription: 'TransactionReferenceCode is required.'
                    }
                });
            }

            let invoice: any = null;
            let institution: any = null;
            let accountName = '';

            // 1. Try matching with car sales invoices first
            let carInvMatched = null;
            const { data: carInv } = await supabase
                .from('car_sales_invoices')
                .select('*')
                .eq('invoice_number', refCode)
                .maybeSingle();
            carInvMatched = carInv;

            if (!carInvMatched) {
                const { data: carInvReg } = await supabase
                    .from('car_sales_invoices')
                    .select('*')
                    .ilike('registration_number', refCode)
                    .maybeSingle();
                carInvMatched = carInvReg;
            }

            if (carInvMatched) {
                invoice = carInvMatched;
                accountName = carInvMatched.client_name || 'Client';
            } else {
                // 2. Try matching with standard school billing invoices
                const { data: stdInv } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('invoice_number', refCode)
                    .maybeSingle();
                if (stdInv) {
                    invoice = stdInv;
                    accountName = stdInv.student_name || stdInv.client_name || 'Student';
                } else {
                    // Try matching with property management invoices
                    const { data: pmInv } = await supabase
                        .from('pm_invoices')
                        .select('*')
                        .eq('invoice_number', refCode)
                        .maybeSingle();
                    if (pmInv) {
                        invoice = pmInv;
                        // Find tenant details
                        const { data: pmTenant } = await supabase
                            .from('pm_tenants')
                            .select('name')
                            .eq('id', pmInv.tenant_id)
                            .maybeSingle();
                        accountName = pmTenant?.name || 'Tenant';
                    }
                }
            }

            // 3. Fallback: Search by registration number, client name, or property tenant name
            if (!invoice) {
                const { data: stdInvByReg } = await supabase
                    .from('invoices')
                    .select('*')
                    .or(`student_name.eq.${refCode},client_name.eq.${refCode}`)
                    .limit(1);

                if (stdInvByReg && stdInvByReg.length > 0) {
                    invoice = stdInvByReg[0];
                    accountName = invoice.student_name || invoice.client_name || 'Student';
                } else {
                    const { data: carInvByReg } = await supabase
                        .from('car_sales_invoices')
                        .select('*')
                        .or(`registration_number.eq.${refCode},client_name.eq.${refCode}`)
                        .limit(1);
                    if (carInvByReg && carInvByReg.length > 0) {
                        invoice = carInvByReg[0];
                        accountName = invoice.client_name || 'Client';
                    } else {
                        const { data: pmTenantsMatched } = await supabase
                            .from('pm_tenants')
                            .select('*')
                            .eq('name', refCode)
                            .limit(1);
                        if (pmTenantsMatched && pmTenantsMatched.length > 0) {
                            const { data: pmInvByTenant } = await supabase
                                .from('pm_invoices')
                                .select('*')
                                .eq('tenant_id', pmTenantsMatched[0].id)
                                .limit(1);
                            if (pmInvByTenant && pmInvByTenant.length > 0) {
                                invoice = pmInvByTenant[0];
                                accountName = pmTenantsMatched[0].name;
                            }
                        }
                    }
                }
            }

            // Fetch institution mapping
            if (invoice) {
                const { data: inst } = await supabase
                    .from('institutions')
                    .select('*')
                    .eq('id', invoice.institution_id)
                    .maybeSingle();
                institution = inst;
            } else if (instCode) {
                const { data: inst } = await supabase
                    .from('institutions')
                    .select('*')
                    .eq('institution_code', instCode)
                    .maybeSingle();
                institution = inst;
            }

            // If no matched invoice or institution, return 404
            if (!invoice && !institution) {
                return res.status(200).json({
                    header: {
                        messageID,
                        statusCode: '404',
                        statusDescription: `Reference '${refCode}' or Institution not found.`
                    }
                });
            }

            const responsePayload = {
                header: {
                    messageID,
                    statusCode: '200',
                    statusDescription: 'Successfully validated customer'
                },
                response: {
                    TransactionReferenceCode: refCode,
                    TransactionDate: bodyRequest.TransactionDate || new Date().toISOString(),
                    TotalAmount: invoice ? (invoice.balance_amount !== undefined ? invoice.balance_amount : (invoice.amount || 0.0)) : 0.0,
                    Currency: 'KES',
                    AdditionalInfo: accountName || institution?.name || 'Authorized Client',
                    AccountNumber: refCode,
                    AccountName: accountName || institution?.name || 'Authorized Client',
                    InstitutionCode: instCode || institution?.code || '210001918',
                    InstitutionName: institution?.name || 'Academic Management Portal'
                }
            };

            return res.status(200).json(responsePayload);

        } else {
            // ================= PAYMENT ADVICE LOGIC =================
            const bankTxnId = String(bodyRequest.TransactionReferenceCode || '').trim();
            const targetAccount = String(bodyRequest.AccountNumber || bodyRequest.DocumentReferenceNumber || '').trim();
            const amount = parseFloat(String(bodyRequest.PaymentAmount || bodyRequest.TotalAmount || '0'));
            const instCode = String(bodyRequest.InstitutionCode || '');

            if (!bankTxnId || !targetAccount || amount <= 0) {
                return res.status(200).json({
                    header: {
                        messageID,
                        statusCode: '400',
                        statusDescription: 'TransactionReferenceCode, AccountNumber, and PaymentAmount must be provided.'
                    }
                });
            }

            // 1. Duplicate check in logged transactions (either checkout_request_id or transaction_id matches bankTxnId)
            const { data: existingTxn } = await supabase
                .from('mpesa_transactions')
                .select('*')
                .eq('transaction_id', bankTxnId)
                .maybeSingle();

            if (existingTxn) {
                return res.status(200).json({
                    header: {
                        messageID,
                        statusCode: '402',
                        statusDescription: 'Duplicate transaction detected.'
                    }
                });
            }

            let invoice: any = null;
            let isCarInvoice = false;
            let isPmInvoice = false;
            let institution: any = null;

            // Find target invoice
            let carInvMatched = null;
            const { data: carInv } = await supabase
                .from('car_sales_invoices')
                .select('*')
                .eq('invoice_number', targetAccount)
                .maybeSingle();
            carInvMatched = carInv;

            if (!carInvMatched) {
                const { data: carInvReg } = await supabase
                    .from('car_sales_invoices')
                    .select('*')
                    .ilike('registration_number', targetAccount)
                    .maybeSingle();
                carInvMatched = carInvReg;
            }

            if (carInvMatched) {
                invoice = carInvMatched;
                isCarInvoice = true;
            } else {
                const { data: stdInv } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('invoice_number', targetAccount)
                    .maybeSingle();
                if (stdInv) {
                    invoice = stdInv;
                } else {
                    const { data: pmInv } = await supabase
                        .from('pm_invoices')
                        .select('*')
                        .eq('invoice_number', targetAccount)
                        .maybeSingle();
                    if (pmInv) {
                        invoice = pmInv;
                        isPmInvoice = true;
                    }
                }
            }

            // Find institution
            if (invoice) {
                const { data: inst } = await supabase
                    .from('institutions')
                    .select('*')
                    .eq('id', invoice.institution_id)
                    .maybeSingle();
                institution = inst;
            } else if (instCode) {
                const { data: inst } = await supabase
                    .from('institutions')
                    .select('*')
                    .eq('institution_code', instCode)
                    .maybeSingle();
                institution = inst;
            }

            const targetInstId = institution?.id || invoice?.institution_id || 'SYSTEM';

            // 2. Insert transaction into mpesa_transactions
            const metadata: any = {
                type: isCarInvoice ? 'car_invoice' : 'invoice',
                invoiceId: invoice?.id,
                channel: 'coop_b2b',
                reconciled: true,
                reconciled_at: new Date().toISOString()
            };

            const coopTxnId = `coop_${Date.now()}`;

            const { error: insertTxnErr } = await supabase.from('mpesa_transactions').insert({
                id: coopTxnId,
                transaction_id: bankTxnId,
                checkout_request_id: bankTxnId,
                institution_id: targetInstId,
                amount,
                phone_number: 'Coop Bank B2B',
                payer_name: bodyRequest.AccountName || 'Coop Bank Client',
                status: 'completed',
                provider: 'coop_b2b',
                currency: 'KES',
                customer_reference: targetAccount,
                metadata
            });

            if (insertTxnErr) {
                console.error('[Coop B2B Advice] Failed to log payment transaction:', insertTxnErr);
            }

            // Write/Upsert to bank_transactions so it appears in Bank Feeds
            try {
                const isReconciledNow = !!invoice;
                
                // Delete any temporary duplicate records created by database triggers under the raw reference ID
                if (bankTxnId) {
                    await supabase
                        .from('bank_transactions')
                        .delete()
                        .eq('id', bankTxnId);
                }

                const { error: bankTxnErr } = await supabase.from('bank_transactions').upsert({
                    id: coopTxnId,
                    institution_id: targetInstId,
                    amount: amount,
                    transaction_date: bodyRequest.PaymentDate || bodyRequest.TransactionDate || new Date().toISOString(),
                    reference: bankTxnId,
                    sender_name: bodyRequest.AccountName || 'Coop Bank Client',
                    bank_name: 'Coop',
                    status: isReconciledNow ? 'reconciled' : 'unreconciled',
                    linked_invoice_id: invoice?.id || null,
                    reconciled_at: isReconciledNow ? new Date().toISOString() : null,
                    reconciled_by: isReconciledNow ? 'Coop B2B API' : null,
                    created_at: new Date().toISOString(),
                    payload: body
                });
                if (bankTxnErr) console.error('[Coop B2B Advice] Failed to write to bank_transactions:', bankTxnErr);
            } catch (bankErr) {
                console.error('[Coop B2B Advice] Exception writing to bank_transactions:', bankErr);
            }

            // 3. Perform Invoice Reconciliations
            if (invoice) {
                if (isCarInvoice) {
                    const paidAmount = parseFloat(String(invoice.paid_amount || 0)) + amount;
                    const balanceAmount = Math.max(0, parseFloat(String(invoice.total_amount || 0)) - paidAmount);
                    const status = balanceAmount <= 0 ? 'fully_paid' : 'partially_paid';

                    await supabase
                        .from('car_sales_invoices')
                        .update({
                            paid_amount: paidAmount,
                            balance_amount: balanceAmount,
                            status,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', invoice.id);

                    await supabase.from('car_sales_payments').insert({
                        id: `pay_coop_${Date.now()}`,
                        invoice_id: invoice.id,
                        institution_id: targetInstId,
                        amount,
                        payment_method: 'Coop Bank B2B',
                        transaction_reference: bankTxnId,
                        payment_date: new Date().toISOString().split('T')[0],
                        receipt_number: `REC-${Date.now().toString().slice(-6)}`,
                        received_by: 'Coop Bank B2B API',
                        notes: `Coop Bank B2B payment received. Ref: ${bankTxnId}`
                    });
                } else if (isPmInvoice) {
                    await supabase
                        .from('pm_invoices')
                        .update({
                            status: 'Paid',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', invoice.id);

                    // Insert payment in pm_payments
                    // Find active lease to check commission
                    const { data: lease } = await supabase
                        .from('pm_leases')
                        .select('*')
                        .eq('id', invoice.lease_id)
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
                                commissionAmount = (amount * parseFloat(String(property.commission_rate))) / 100;
                            }
                        }
                    }

                    await supabase.from('pm_payments').insert({
                        id: `pay_coop_${Date.now()}`,
                        lease_id: invoice.lease_id,
                        amount,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'Coop Bank B2B',
                        payment_type: 'Rent',
                        status: 'Completed',
                        commission_amount: commissionAmount,
                        institution_id: targetInstId,
                        created_at: new Date().toISOString()
                    });
                } else {
                    const paidAmount = parseFloat(String(invoice.paid_amount || 0)) + amount;
                    const balanceAmount = Math.max(0, parseFloat(String(invoice.total_amount || 0)) - paidAmount);
                    const status = balanceAmount <= 0 ? 'paid' : 'partially_paid';

                    await supabase
                        .from('invoices')
                        .update({
                            paid_amount: paidAmount,
                            balance_amount: balanceAmount,
                            status,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', invoice.id);

                    await supabase.from('receipts').insert({
                        id: `rec_coop_${Date.now()}`,
                        receipt_number: bankTxnId,
                        institution_id: targetInstId,
                        invoice_id: invoice.id,
                        amount_paid: amount,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'Coop Bank B2B',
                        related_transaction_id: bankTxnId
                    });
                }
            }

            return res.status(200).json({
                header: {
                    messageID,
                    statusCode: '200',
                    statusDescription: 'Payment successfully received'
                },
                response: {
                    TransactionReferenceCode: bankTxnId,
                    TransactionDate: bodyRequest.TransactionDate || new Date().toISOString(),
                    TransactionAmount: amount.toFixed(1),
                    AccountNumber: targetAccount,
                    AccountName: bodyRequest.AccountName || '',
                    InstitutionCode: parseInt(instCode) || 210001918,
                    InstitutionName: institution?.name || 'KEWISCO SACCO',
                    Currency: 'KES',
                    AdditionalInfo: targetAccount,
                    TotalAmount: amount.toFixed(1)
                }
            });
        }
    } catch (e: any) {
        console.error('[Coop B2B Integration] Error:', e);
        return res.status(200).json({
            header: {
                messageID,
                statusCode: '405',
                statusDescription: `A severe error occurred: ${e.message}`
            }
        });
    }
}
