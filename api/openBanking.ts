import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Self-contained Supabase service client factory
const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
};

// In-memory token cache for Open Banking credentials
interface CachedToken {
    token: string;
    expiresAt: number;
}
const tokenCache: Record<string, CachedToken> = {};

// Clean characters
const sanitizeVal = (s: any) => String(s || '').replace(/[^\x20-\x7E]/g, '').trim();

// Format phone to 254XXXXXXXXX
const formatKenyanPhone = (phone: string): string => {
    let clean = (phone || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '254' + clean.slice(1);
    if (clean.startsWith('7') || clean.startsWith('1')) clean = '254' + clean;
    if (clean.startsWith('+254')) clean = clean.slice(1);
    return clean;
};

// Default Gateway Base URLs from NCBA UAT Guide (31/03/2026)
const DEFAULT_TEST_GATEWAY = 'https://openbankingtest.api.ncbagroup.com/test/apigateway/';
const DEFAULT_PROD_GATEWAY = 'https://openbanking.api.ncbagroup.com/apigateway/';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-ID, Ocp-Apim-Subscription-Key');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const action = (req.query.action as string) || (req.body?.action as string) || 'help';
    const institutionId = (req.query.institutionId as string) || req.body?.institutionId;

    try {
        const supabase = getSupabase();
        let config: any = req.body?.config || {};

        // If config not passed in body, try to hydrate from Supabase
        if ((!config.subscriptionKey || !config.openBankingUserId) && supabase && institutionId) {
            if (institutionId === 'SYSTEM' || institutionId === 'GLOBAL') {
                const { data: settings } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
                if (settings?.data?.ncbaConfig) {
                    config = { ...settings.data.ncbaConfig, ...config };
                }
            } else {
                const { data: inst } = await supabase.from('institutions').select('ncba_config').eq('id', institutionId).maybeSingle();
                if (inst?.ncba_config) {
                    config = { ...inst.ncba_config, ...config };
                }
            }
        }

        const isMock = config.isMock === true || config.isMock === 'true' || process.env.NCBA_MOCK_MODE === 'true';
        const environment = config.environment || 'sandbox';
        let rawBase = (config.openBankingBaseUrl || '').trim();
        if (!rawBase) {
            rawBase = environment === 'production' ? DEFAULT_PROD_GATEWAY : DEFAULT_TEST_GATEWAY;
        }
        // Normalize: strip wildcards (*), trailing slashes
        rawBase = rawBase.replace(/[\/\*]+$/, '');
        const rootBase = rawBase.toLowerCase().endsWith('/api/v1') 
            ? rawBase.slice(0, -7) 
            : rawBase;
        const apiV1Base = rawBase.toLowerCase().endsWith('/api/v1') 
            ? rawBase 
            : `${rootBase}/api/v1`;
        const baseUrl = rootBase + '/';

        const userId = sanitizeVal(config.openBankingUserId || config.username || process.env.NCBA_OPEN_BANKING_USER_ID);
        const password = sanitizeVal(config.openBankingPassword || config.password || process.env.NCBA_OPEN_BANKING_PASSWORD);
        const subscriptionKey = sanitizeVal(config.subscriptionKey || process.env.NCBA_SUBSCRIPTION_KEY);
        const debitAccount = sanitizeVal(config.debitAccount || config.accountNumber || process.env.NCBA_DEBIT_ACCOUNT);
        const senderCif = sanitizeVal(config.senderCif || (debitAccount ? debitAccount.slice(0, 6) : ''));
        const defaultCountry = sanitizeVal(config.senderCountry || 'Kenya');
        const customTokenUrl = sanitizeVal(config.openBankingTokenUrl || config.tokenUrl);

        // Helper: Obtain Bearer Token via Multi-Format APIM Probing
        let lastProbeResults: any[] = [];
        const getAccessToken = async (): Promise<string | null> => {
            if (isMock) {
                return 'mock-openbanking-token-' + Date.now();
            }

            if (!userId || !password) {
                throw new Error('NCBA Open Banking credentials missing: User ID and Password required.');
            }

            const cacheKey = `${userId}:${rootBase}`;
            const cached = tokenCache[cacheKey];
            if (cached && Date.now() < cached.expiresAt) {
                return cached.token;
            }

            interface TokenProbe {
                url: string;
                method: 'GET' | 'POST';
                format: 'json' | 'form';
                useBasicAuth?: boolean;
            }

            const probeList: TokenProbe[] = [];

            // If user supplied an explicit custom token URL, test that first with all formats
            if (customTokenUrl) {
                probeList.push(
                    { url: customTokenUrl, method: 'POST', format: 'json' },
                    { url: customTokenUrl, method: 'POST', format: 'form' },
                    { url: customTokenUrl, method: 'POST', format: 'form', useBasicAuth: true },
                    { url: customTokenUrl, method: 'GET', format: 'form' }
                );
            }

            // Probes on APIM gateway (JSON, Form-Urlencoded OAuth2, and Basic Auth combinations)
            probeList.push(
                // 1. JSON POST
                { url: `${apiV1Base}/token`, method: 'POST', format: 'json' },
                { url: `${rootBase}/token`, method: 'POST', format: 'json' },
                // 2. Standard OAuth2 Form-UrlEncoded (RFC 6749)
                { url: `${apiV1Base}/token`, method: 'POST', format: 'form' },
                { url: `${rootBase}/token`, method: 'POST', format: 'form' },
                // 3. OAuth2 Form-UrlEncoded with Basic Auth header
                { url: `${apiV1Base}/token`, method: 'POST', format: 'form', useBasicAuth: true },
                { url: `${rootBase}/token`, method: 'POST', format: 'form', useBasicAuth: true },
                // 4. Auth & OAuth paths
                { url: `${apiV1Base}/auth/token`, method: 'POST', format: 'json' },
                { url: `${apiV1Base}/auth/token`, method: 'POST', format: 'form', useBasicAuth: true },
                { url: `${apiV1Base}/oauth/token`, method: 'POST', format: 'json' },
                { url: `${apiV1Base}/oauth/token`, method: 'POST', format: 'form', useBasicAuth: true },
                { url: `${rootBase}/oauth/token`, method: 'POST', format: 'form', useBasicAuth: true },
                // 5. GET token queries
                { url: `${apiV1Base}/token`, method: 'GET', format: 'form' },
                { url: `${rootBase}/token`, method: 'GET', format: 'form' },
                // 6. Production APIM gateway (if credentials were issued for prod)
                { url: `https://openbanking.api.ncbagroup.com/apigateway/token`, method: 'POST', format: 'json' },
                { url: `https://openbanking.api.ncbagroup.com/apigateway/api/v1/token`, method: 'POST', format: 'json' },
                { url: `https://openbanking.api.ncbagroup.com/apigateway/token`, method: 'POST', format: 'form', useBasicAuth: true },
                // 7. C2B Live Gateway token endpoint (where IP is whitelisted)
                { url: `https://c2bapis.ncbagroup.com/payments/api/v1/auth/token`, method: 'POST', format: 'json', useBasicAuth: true },
                { url: `https://c2bapis.ncbagroup.com/payments/api/v1/auth/token`, method: 'GET', format: 'form', useBasicAuth: true }
            );

            let tokenFound = '';
            let tokenExpiryMs = Date.now() + 50 * 60 * 1000;
            lastProbeResults = [];

            for (const probe of probeList) {
                const tokenAbort = new AbortController();
                const tokenTimer = setTimeout(() => tokenAbort.abort(), 6000);

                const reqHeaders: Record<string, string> = {
                    'Accept': 'application/json',
                    'User-Agent': 'EduAlloc-AI/1.0.0 (Bank-Integration-Client)'
                };
                if (subscriptionKey) {
                    reqHeaders['Ocp-Apim-Subscription-Key'] = subscriptionKey;
                    reqHeaders['ocp-apim-subscription-key'] = subscriptionKey;
                }
                if (probe.useBasicAuth) {
                    reqHeaders['Authorization'] = `Basic ${Buffer.from(`${userId}:${password}`).toString('base64')}`;
                }

                let fetchUrl = probe.url;
                let fetchBody: string | undefined = undefined;

                if (probe.method === 'POST') {
                    if (probe.format === 'json') {
                        reqHeaders['Content-Type'] = 'application/json';
                        fetchBody = JSON.stringify({
                            userID: userId,
                            username: userId,
                            clientId: userId,
                            password: password,
                            clientSecret: password
                        });
                    } else {
                        reqHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
                        const params = new URLSearchParams();
                        params.append('grant_type', 'client_credentials');
                        params.append('client_id', userId);
                        params.append('client_secret', password);
                        params.append('username', userId);
                        params.append('password', password);
                        fetchBody = params.toString();
                    }
                } else {
                    const queryParams = new URLSearchParams();
                    queryParams.append('grant_type', 'client_credentials');
                    queryParams.append('username', userId);
                    queryParams.append('password', password);
                    fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + queryParams.toString();
                }

                try {
                    const resp = await fetch(fetchUrl, {
                        method: probe.method,
                        headers: reqHeaders,
                        body: fetchBody,
                        signal: tokenAbort.signal
                    });
                    clearTimeout(tokenTimer);

                    const resText = await resp.text();
                    let resJson: any = null;
                    try { resJson = JSON.parse(resText); } catch (_) {}

                    const probeEntry = {
                        url: probe.url,
                        method: probe.method,
                        format: probe.format,
                        status: resp.status,
                        snippet: resText.substring(0, 150)
                    };
                    lastProbeResults.push(probeEntry);

                    if (resp.ok && resJson) {
                        const token = resJson.accessToken || resJson.access_token || resJson.token;
                        if (token) {
                            tokenFound = token;
                            if (resJson.tokenExpiry) {
                                const parsed = new Date(resJson.tokenExpiry).getTime();
                                if (!isNaN(parsed) && parsed > Date.now()) {
                                    tokenExpiryMs = parsed - 60000;
                                }
                            }
                            console.log(`[NCBA OpenBanking] 🎉 Token acquired from ${probe.url} (${probe.method}/${probe.format})`);
                            break;
                        }
                    }
                } catch (probeErr: any) {
                    clearTimeout(tokenTimer);
                    lastProbeResults.push({
                        url: probe.url,
                        method: probe.method,
                        format: probe.format,
                        status: 'ERROR',
                        snippet: probeErr.message
                    });
                }
            }

            if (tokenFound) {
                tokenCache[cacheKey] = { token: tokenFound, expiresAt: tokenExpiryMs };
                return tokenFound;
            }

            return null;
        };

        // Helper: Call Authenticated Open Banking API
        const callOpenBankingApi = async (endpointPath: string, payload: any, method = 'POST') => {
            if (isMock) {
                console.log(`[NCBA OpenBanking MOCK] Simulating call to ${endpointPath}:`, JSON.stringify(payload));
                return null; // Will trigger simulated return
            }

            const token = await getAccessToken();
            if (!token) {
                const probeSummary = lastProbeResults.map(p => `${p.method} ${p.url.replace(/^https?:\/\/[^\/]+/, '')} [${p.format}] -> ${p.status}`).join(' | ');
                throw new Error(`NCBA Open Banking Bearer token could not be acquired. Probed endpoints: ${probeSummary || 'None'}. Please verify your Open Banking User ID, Password, and Subscription Key, or provide the exact Token URL in the Token URL Override field.`);
            }
            const cleanPath = endpointPath.startsWith('/') ? endpointPath.slice(1) : endpointPath;
            // Always build fullUrl using rootBase + cleanPath to avoid duplicate api/v1
            const fullUrl = `${rootBase}/${cleanPath}`;

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'EduAlloc-AI/1.0.0 (Bank-Integration-Client)',
                'Authorization': `Bearer ${token}`
            };
            if (subscriptionKey) {
                headers['Ocp-Apim-Subscription-Key'] = subscriptionKey;
                headers['ocp-apim-subscription-key'] = subscriptionKey;
            }

            console.log(`[NCBA OpenBanking] Requesting ${fullUrl} [${method}] with Bearer Token`);
            const apiAbort = new AbortController();
            const apiTimer = setTimeout(() => apiAbort.abort(), 12000);
            let response: Response;
            try {
                response = await fetch(fullUrl, {
                    method,
                    headers,
                    body: method !== 'GET' ? JSON.stringify(payload) : undefined,
                    signal: apiAbort.signal
                });
            } catch (fetchErr: any) {
                clearTimeout(apiTimer);
                if (fetchErr.name === 'AbortError') {
                    throw new Error(`NCBA Open Banking API request timed out after 12s (${fullUrl})`);
                }
                throw fetchErr;
            } finally {
                clearTimeout(apiTimer);
            }

            const text = await response.text();
            let parsed: any;
            try {
                parsed = JSON.parse(text);
            } catch (_) {
                parsed = { rawText: text };
            }

            if (!response.ok) {
                console.error(`[NCBA OpenBanking Error ${response.status}] at ${fullUrl}:`, text);
                const errMsg = parsed.message || parsed.errorMessage || parsed.statusDescription || text || `HTTP ${response.status}`;
                throw new Error(`NCBA Open Banking error (${response.status}) at ${fullUrl}: ${errMsg}`);
            }

            return parsed;
        };

        // ---------------------------------------------------------------------
        // ACTION DISPATCHER
        // ---------------------------------------------------------------------

        switch (action) {
            // 1. Authenticate & Retrieve Token
            case 'token':
            case 'authenticate': {
                const token = await getAccessToken();
                return res.status(200).json({
                    success: !!token,
                    tokenType: token ? 'Bearer' : 'None',
                    accessToken: token,
                    authMode: token ? 'OAuth Bearer Token' : 'Token Not Found',
                    message: token ? 'Bearer token acquired successfully!' : 'No token endpoint issued a Bearer token.',
                    probes: lastProbeResults,
                    isMock
                });
            }

            // 2. B2C Mobile Money Transfer (Disburse Bank to M-Pesa)
            case 'b2cMpesa':
            case 'mobileMoneyTransfer': {
                const {
                    beneficiaryName,
                    debitAmount,
                    mobileNumber,
                    transactionNarration,
                    uniqueReferenceNumber,
                    date
                } = req.body;

                if (!beneficiaryName || !debitAmount || !mobileNumber) {
                    return res.status(400).json({
                        success: false,
                        message: 'beneficiaryName, debitAmount, and mobileNumber are required.'
                    });
                }

                const formattedPhone = formatKenyanPhone(mobileNumber);
                const amtNum = Math.round(Number(debitAmount));
                const ref = uniqueReferenceNumber || `OB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const narration = (transactionNarration || 'EduAlloc Payout').slice(0, 30);
                const txnDate = date || new Date().toISOString().split('T')[0];
                const activeDebitAccount = req.body.debitAccount || debitAccount;

                if (!activeDebitAccount && !isMock) {
                    return res.status(400).json({
                        success: false,
                        message: 'Debit Account number is required for B2C Mobile Money Transfer.'
                    });
                }

                const payload = {
                    beneficiaryName,
                    date: txnDate,
                    debitAccount: activeDebitAccount,
                    debitAmount: String(amtNum),
                    mobileNumber: formattedPhone,
                    transactionNarration: narration,
                    uniqueReferenceNumber: ref
                };

                let apiResult = await callOpenBankingApi('/api/v1/MobileMoneyTransfer/mobilemoneytransfer', payload);

                if (isMock || !apiResult) {
                    apiResult = {
                        statusCode: 200,
                        message: 'Success (Mock)',
                        succeeded: true,
                        data: {
                            id: `mock-uuid-${Date.now()}`,
                            channelRef: ref,
                            bankRef: `FTX${Date.now().toString().slice(-8)}AAQVT`,
                            message: 'SUCCESS'
                        }
                    };
                }

                // Record transaction in Supabase if available
                if (supabase) {
                    try {
                        await supabase.from('ncba_transactions').insert({
                            institution_id: institutionId && institutionId !== 'GLOBAL' ? institutionId : null,
                            transaction_id: ref,
                            reference_id: apiResult?.data?.bankRef || ref,
                            receipt_number: apiResult?.data?.bankRef,
                            type: 'b2c_mpesa_transfer',
                            amount: amtNum,
                            phone: formattedPhone,
                            status: apiResult.succeeded ? 'completed' : 'failed',
                            metadata: {
                                ...payload,
                                provider: 'ncba_open_banking',
                                response: apiResult
                            }
                        });
                    } catch (dbErr) {
                        console.warn('[NCBA OpenBanking] Failed to persist ncba_transaction record:', dbErr);
                    }
                }

                return res.status(200).json({
                    success: apiResult.succeeded ?? true,
                    data: apiResult.data,
                    message: apiResult.message || 'Payment processed successfully',
                    statusCode: apiResult.statusCode || 200
                });
            }

            // 3. M-Pesa Recipient Phone Number Validation
            case 'validateMpesa': {
                const phone = formatKenyanPhone(req.body.mobileNumber || req.body.phone || req.body.msisdn);
                if (!phone) {
                    return res.status(400).json({ success: false, message: 'Valid phone number required.' });
                }

                let apiResult = await callOpenBankingApi('/api/v1/MobileMoneyTransfer/validate', { msisdn: phone });
                if (isMock || !apiResult) {
                    apiResult = {
                        statusCode: 200,
                        succeeded: true,
                        validationId: `val-${Date.now()}-08dcc836`,
                        customerMsisdn: phone,
                        minimumPaymentAmount: 50.0
                    };
                }

                return res.status(200).json({
                    success: apiResult.succeeded ?? true,
                    ...apiResult
                });
            }

            // 4. Internal Funds Transfer (IFT) – NCBA to NCBA
            case 'ift':
            case 'internalFundsTransfer': {
                const {
                    beneficiaryAccountName,
                    creditAccountNumber,
                    amount,
                    narration,
                    currency = 'KES'
                } = req.body;

                const activeDebit = req.body.debitAccountNumber || debitAccount;
                const ref = req.body.transactionId || `IFT-${Date.now()}`;

                const payload = {
                    Country: req.body.country || defaultCountry,
                    TransactionID: ref,
                    BeneficiaryAccountName: beneficiaryAccountName,
                    DebitAccountNumber: activeDebit,
                    CreditAccountNumber: creditAccountNumber,
                    Currency: currency,
                    Amount: String(Math.round(Number(amount))),
                    Narration: (narration || 'IFT Transfer').slice(0, 30)
                };

                let apiResult = await callOpenBankingApi('/api/v1/Transfer/internal', payload);
                if (isMock || !apiResult) {
                    apiResult = {
                        resultCode: '000',
                        statusDescription: 'SUCCESS (Mock)',
                        cbxReferenceNumber: `IFT${Date.now().toString().slice(-6)}-1`,
                        txnReferenceNo: `FTX${Date.now().toString().slice(-8)}TAACS`
                    };
                }

                return res.status(200).json({
                    success: apiResult.resultCode === '000' || apiResult.statusDescription?.includes('SUCCESS'),
                    ...apiResult
                });
            }

            // 5. Electronic Funds Transfer (EFT) – To Local Bank Accounts
            case 'eft':
            case 'electronicFundsTransfer': {
                const {
                    amount,
                    beneficiaryAccountNumber,
                    beneficiaryBankBic,
                    beneficiaryName,
                    currency = 'KES',
                    narration
                } = req.body;

                const activeDebit = req.body.debitAccountNumber || debitAccount;
                const ref = req.body.transactionId || `EFT-${Date.now()}`;
                const activeCif = req.body.senderCif || senderCif || (activeDebit ? activeDebit.slice(0, 6) : '');

                const payload = {
                    Amount: String(Math.round(Number(amount))),
                    BeneficiaryAccountNumber: beneficiaryAccountNumber,
                    BeneficiaryBankBIC: beneficiaryBankBic,
                    BeneficiaryName: beneficiaryName,
                    Currency: currency,
                    DebitAccountNumber: activeDebit,
                    Narration: (narration || 'EFT Transfer').slice(0, 16),
                    SenderCountry: req.body.senderCountry || defaultCountry,
                    TransactionID: ref,
                    SenderCIF: activeCif
                };

                let apiResult = await callOpenBankingApi('/api/v1/Transfer/eft', payload);
                if (isMock || !apiResult) {
                    apiResult = {
                        resultCode: '000',
                        statusDescription: 'SUCCESS (Mock)',
                        cbxReferenceNumber: `EFT${Date.now().toString().slice(-6)}-2`,
                        txnReferenceNo: `FTX${Date.now().toString().slice(-8)}TAACS`
                    };
                }

                return res.status(200).json({
                    success: apiResult.resultCode === '000' || apiResult.statusDescription?.includes('SUCCESS'),
                    ...apiResult
                });
            }

            // 6. PesaLink Payment (Instant Bank-to-Bank)
            case 'pesalink': {
                const {
                    amount,
                    beneficiaryAccountNumber,
                    beneficiaryBankBic,
                    beneficiaryName,
                    currency = 'KES',
                    narration
                } = req.body;

                const activeDebit = req.body.senderAccountNumber || debitAccount;
                const ref = req.body.transactionId || `PLK-${Date.now()}`;
                const activeCif = req.body.senderCif || senderCif || (activeDebit ? activeDebit.slice(0, 6) : '');

                const payload = {
                    BeneficiaryAccountNumber: beneficiaryAccountNumber,
                    BeneficiaryBankBIC: beneficiaryBankBic.startsWith('00') ? beneficiaryBankBic : `00${beneficiaryBankBic}`,
                    BeneficiaryName: beneficiaryName,
                    Amount: String(Number(amount).toFixed(2)),
                    Currency: currency,
                    Narration: (narration || 'PesaLink Transfer').slice(0, 30),
                    SenderAccountNumber: activeDebit,
                    SenderCIF: activeCif,
                    SenderCountry: req.body.senderCountry || defaultCountry,
                    TransactionID: ref
                };

                let apiResult = await callOpenBankingApi('/api/v1/Transfer/pesalink', payload);
                if (isMock || !apiResult) {
                    apiResult = {
                        resultCode: '000',
                        statusDescription: 'SUCCESS (Mock)',
                        cbxReferenceNumber: `PLK${Date.now().toString().slice(-6)}`,
                        txnReferenceNo: `FTX${Date.now().toString().slice(-8)}TAACS`
                    };
                }

                return res.status(200).json({
                    success: apiResult.resultCode === '000' || apiResult.statusDescription?.includes('SUCCESS'),
                    ...apiResult
                });
            }

            // 7. Account Mini-Statement & Balance Query
            case 'miniStatement':
            case 'balance': {
                const targetAccount = req.body.accountNo || debitAccount;
                if (!targetAccount && !isMock) {
                    return res.status(400).json({ success: false, message: 'Account number is required.' });
                }

                const payload = {
                    Country: req.body.country || defaultCountry,
                    AccountNo: targetAccount
                };

                let apiResult = await callOpenBankingApi('/api/v1/Account/ministatement', payload);
                if (isMock || !apiResult) {
                    apiResult = {
                        ErrorCode: '000',
                        ErrorMessage: 'success (Mock)',
                        UnitID: 'KE0010001',
                        AccountNumber: targetAccount || '9115310018',
                        AccountType: 1,
                        Currency: 'KES',
                        AvailableBalance: '485290.50',
                        MiniStatementList: [
                            {
                                ValueDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
                                UniqueTransactionLegNo: `${Date.now()}.000001`,
                                TransactionCode: '213',
                                TransactionCodeDescription: 'Float Credit',
                                TransactionAmount: '50000.00',
                                CreditDebitFlag: 'Credit',
                                TransactionCurrency: 'KES',
                                TransactionReference: 'FT241238JVL3',
                                Narrative: 'SCHOOL FLOAT TOPUP',
                                PaymentDetails: 'TOPUP'
                            }
                        ]
                    };
                }

                return res.status(200).json({
                    success: apiResult.ErrorCode === '000' || apiResult.ErrorMessage === 'success',
                    ...apiResult
                });
            }

            // 8. Transaction Status Enquiry
            case 'transactionStatus': {
                const transactionId = req.body.transactionId || req.query.transactionId;
                if (!transactionId) {
                    return res.status(400).json({ success: false, message: 'transactionId is required.' });
                }

                const payload = {
                    country: req.body.country || defaultCountry,
                    transactionId
                };

                let apiResult = await callOpenBankingApi('/api/v1/Transaction/status', payload);
                if (isMock || !apiResult) {
                    apiResult = {
                        ErrorCode: '000',
                        ErrorMessage: 'success (Mock)',
                        TransactionId: transactionId,
                        CoreReference: `FTX${Date.now().toString().slice(-8)}MAAGM`
                    };
                }

                return res.status(200).json({
                    success: apiResult.ErrorCode === '000',
                    ...apiResult
                });
            }

            // 9. Transaction Advise / Official Receipt
            case 'transactionAdvise': {
                const transactionId = req.body.transactionId || req.query.transactionId;
                if (!transactionId) {
                    return res.status(400).json({ success: false, message: 'transactionId is required.' });
                }

                const payload = {
                    country: req.body.country || defaultCountry,
                    transactionId
                };

                let apiResult = await callOpenBankingApi('/api/v1/Transaction/advise', payload);
                if (isMock || !apiResult) {
                    apiResult = {
                        ErrorCode: '000',
                        ErrorMessage: 'success (Mock)',
                        UnitID: 'KE0010001',
                        FtReference: transactionId,
                        TransactionType: 'B2C',
                        CreditCcy: 'KES',
                        CreditAmount: req.body.amount ? String(req.body.amount) : '1000.00',
                        CreditAccountNumber: req.body.phone || '254700000000',
                        TotalCharges: '0.00',
                        SenderRef: `REF-${Date.now().toString().slice(-6)}`,
                        CreditedAt: new Date().toISOString(),
                        CreditAcctTitle: req.body.beneficiaryName || 'Beneficiary',
                        DEBITCcy: 'KES',
                        DebitAccountNo: debitAccount || '9115310018'
                    };
                }

                return res.status(200).json({
                    success: apiResult.ErrorCode === '000',
                    ...apiResult
                });
            }

            default:
                return res.status(200).json({
                    service: 'NCBA Open Banking Gateway API',
                    version: '2026.1 (UAT Standard)',
                    supportedActions: [
                        'token',
                        'b2cMpesa',
                        'validateMpesa',
                        'ift',
                        'eft',
                        'pesalink',
                        'miniStatement',
                        'transactionStatus',
                        'transactionAdvise'
                    ],
                    environment,
                    baseUrl
                });
        }
    } catch (err: any) {
        console.error('[NCBA OpenBanking Fatal Error]:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Internal Open Banking gateway error'
        });
    }
}
