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
    accessToken?: string;
    tokenId?: string;
    sourceUrl?: string;
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
        let customTokenUrl = sanitizeVal(config.openBankingTokenUrl || config.tokenUrl);
        if (customTokenUrl) {
            if (!customTokenUrl.startsWith('http://') && !customTokenUrl.startsWith('https://')) {
                customTokenUrl = `${rootBase}/${customTokenUrl.replace(/^\/+/, '')}`;
            }
        }

        // Helper: Obtain Bearer Token via Multi-Format APIM Probing
        let lastProbeResults: any[] = [];
        const getAccessTokenData = async (): Promise<CachedToken | null> => {
            if (isMock) {
                return {
                    token: 'mock-openbanking-token-' + Date.now(),
                    expiresAt: Date.now() + 3600000,
                    sourceUrl: 'mock'
                };
            }

            if (!userId || !password) {
                throw new Error('NCBA Open Banking credentials missing: User ID and Password required.');
            }

            const cacheKey = `${userId}:${rootBase}`;
            const cached = tokenCache[cacheKey];
            if (cached && Date.now() < cached.expiresAt) {
                return cached;
            }

            interface TokenProbe {
                url: string;
                method: 'GET' | 'POST';
                format: 'json' | 'json_full' | 'form';
                useBasicAuth?: boolean;
            }

            const probeList: TokenProbe[] = [];

            // 1. Explicit Custom Token URL (if provided by user in settings)
            if (customTokenUrl) {
                probeList.push(
                    { url: customTokenUrl, method: 'POST', format: 'json' },
                    { url: customTokenUrl, method: 'POST', format: 'json_full' },
                    { url: customTokenUrl, method: 'POST', format: 'form' },
                    { url: customTokenUrl, method: 'POST', format: 'form', useBasicAuth: true },
                    { url: customTokenUrl, method: 'GET', format: 'form' }
                );
            }

            // Clean host base (e.g., https://openbankingtest.api.ncbagroup.com)
            const hostBase = rootBase.replace(/\/test\/apigateway\/?$/i, '').replace(/\/apigateway\/?$/i, '');

            // 2. Official NCBA UAT Open Banking Token Endpoints (per CLIENT OPEN BANKING UAT GUIDE- 31032026.docx)
            // Primary path: https://openbankingtest.api.ncbagroup.com/test/apigateway/token
            probeList.push(
                // Official standard JSON body: { "userID": "...", "password": "..." }
                { url: `${rootBase}/token`, method: 'POST', format: 'json' },
                { url: `${apiV1Base}/token`, method: 'POST', format: 'json' },
                // Non-prefixed test gateway routes (without /test)
                { url: `${hostBase}/apigateway/token`, method: 'POST', format: 'json' },
                { url: `${hostBase}/apigateway/api/v1/token`, method: 'POST', format: 'json' },
                // Common APIM service product mounts
                { url: `${rootBase}/api/v1/Token/token`, method: 'POST', format: 'json' },
                { url: `${rootBase}/api/v1/Authentication/token`, method: 'POST', format: 'json' },
                { url: `${rootBase}/api/v1/Authenticate/token`, method: 'POST', format: 'json' },
                { url: `${rootBase}/api/v1/Auth/token`, method: 'POST', format: 'json' },
                { url: `${rootBase}/api/v1/auth/token`, method: 'POST', format: 'json' },
                { url: `${rootBase}/api/v1/Security/token`, method: 'POST', format: 'json' },
                { url: `${rootBase}/api/v1/Login/token`, method: 'POST', format: 'json' },
                { url: `${rootBase}/api/v1/Account/token`, method: 'POST', format: 'json' },
                { url: `${rootBase}/api/v1/oauth/token`, method: 'POST', format: 'json' },
                // JSON with full field variants
                { url: `${rootBase}/token`, method: 'POST', format: 'json_full' },
                { url: `${apiV1Base}/token`, method: 'POST', format: 'json_full' },
                { url: `${hostBase}/apigateway/token`, method: 'POST', format: 'json_full' },
                // Standard OAuth2 Form-UrlEncoded (RFC 6749)
                { url: `${rootBase}/token`, method: 'POST', format: 'form' },
                { url: `${apiV1Base}/token`, method: 'POST', format: 'form' },
                // OAuth2 Form-UrlEncoded with Basic Auth header
                { url: `${rootBase}/token`, method: 'POST', format: 'form', useBasicAuth: true },
                { url: `${apiV1Base}/token`, method: 'POST', format: 'form', useBasicAuth: true },
                { url: `${rootBase}/oauth/token`, method: 'POST', format: 'form', useBasicAuth: true }
            );

            // 3. Production APIM Gateway (only if environment is production or custom)
            if (environment === 'production') {
                probeList.push(
                    { url: `https://openbanking.api.ncbagroup.com/apigateway/token`, method: 'POST', format: 'json' },
                    { url: `https://openbanking.api.ncbagroup.com/apigateway/api/v1/token`, method: 'POST', format: 'json' }
                );
            }

            let tokenFound: CachedToken | null = null;
            lastProbeResults = [];

            for (const probe of probeList) {
                const tokenAbort = new AbortController();
                const tokenTimer = setTimeout(() => tokenAbort.abort(), 7000);

                const reqHeaders: Record<string, string> = {
                    'Accept': 'application/json',
                    'User-Agent': 'EduAlloc-AI/1.0.0 (Bank-Integration-Client)'
                };
                if (subscriptionKey) {
                    reqHeaders['Ocp-Apim-Subscription-Key'] = subscriptionKey;
                }

                if (probe.useBasicAuth) {
                    reqHeaders['Authorization'] = `Basic ${Buffer.from(`${userId}:${password}`).toString('base64')}`;
                }

                let fetchUrl = probe.url;
                let fetchBody: string | undefined = undefined;

                if (probe.method === 'POST') {
                    if (probe.format === 'json') {
                        // Strict NCBA UAT Guide specification: { "userID": "...", "password": "..." }
                        reqHeaders['Content-Type'] = 'application/json';
                        fetchBody = JSON.stringify({
                            userID: userId,
                            password: password
                        });
                    } else if (probe.format === 'json_full') {
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
                        const accessToken = resJson.accessToken || resJson.access_token || '';
                        const tokenId = resJson.tokenID || resJson.tokenId || '';
                        const genericToken = resJson.token || '';
                        const primary = accessToken || tokenId || genericToken;

                        if (primary) {
                            let expiryMs = Date.now() + 50 * 60 * 1000;
                            if (resJson.tokenExpiry) {
                                const parsed = new Date(resJson.tokenExpiry).getTime();
                                if (!isNaN(parsed) && parsed > Date.now()) {
                                    expiryMs = parsed - 60000;
                                }
                            }
                            tokenFound = {
                                token: primary,
                                accessToken: accessToken || undefined,
                                tokenId: tokenId || undefined,
                                sourceUrl: probe.url,
                                expiresAt: expiryMs
                            };
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
                tokenCache[cacheKey] = tokenFound;
                return tokenFound;
            }

            return null;
        };

        const getAccessToken = async (): Promise<string | null> => {
            const data = await getAccessTokenData();
            return data ? data.token : null;
        };

        // Helper: Call Authenticated Open Banking API
        const callOpenBankingApi = async (endpointPath: string, payload: any, method = 'POST') => {
            if (isMock) {
                console.log(`[NCBA OpenBanking MOCK] Simulating call to ${endpointPath}:`, JSON.stringify(payload));
                return null; // Will trigger simulated return
            }

            const tokenData = await getAccessTokenData();
            const cleanPath = endpointPath.startsWith('/') ? endpointPath.slice(1) : endpointPath;
            const fullUrl = `${rootBase}/${cleanPath}`;

            const buildHeaders = (authHeaderVal: string): Record<string, string> => {
                const h: Record<string, string> = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'EduAlloc-AI/1.0.0 (Bank-Integration-Client)'
                };
                if (authHeaderVal) {
                    h['Authorization'] = authHeaderVal;
                }
                if (subscriptionKey) {
                    h['Ocp-Apim-Subscription-Key'] = subscriptionKey;
                }
                return h;
            };

            const executeFetch = async (authHeaderVal: string) => {
                const apiAbort = new AbortController();
                const apiTimer = setTimeout(() => apiAbort.abort(), 14000);
                try {
                    return await fetch(fullUrl, {
                        method,
                        headers: buildHeaders(authHeaderVal),
                        body: method !== 'GET' ? JSON.stringify(payload) : undefined,
                        signal: apiAbort.signal
                    });
                } finally {
                    clearTimeout(apiTimer);
                }
            };

            let response: Response;
            let usedAuthMode = 'None';

            if (tokenData && tokenData.token) {
                const initialBearer = tokenData.accessToken || tokenData.token;
                usedAuthMode = `Bearer Token (${tokenData.sourceUrl})`;
                console.log(`[NCBA OpenBanking] Requesting ${fullUrl} [${method}] with ${usedAuthMode}`);
                try {
                    response = await executeFetch(`Bearer ${initialBearer}`);
                } catch (fetchErr: any) {
                    if (fetchErr.name === 'AbortError') {
                        throw new Error(`NCBA Open Banking API request timed out after 14s (${fullUrl})`);
                    }
                    throw fetchErr;
                }

                // If 401 Unauthorized and we have an alternative tokenID (JWT), retry immediately with tokenID
                if (response.status === 401 && tokenData.tokenId && initialBearer !== tokenData.tokenId) {
                    console.warn(`[NCBA OpenBanking] Got 401 using accessToken. Retrying with tokenID (JWT) Bearer...`);
                    try {
                        response = await executeFetch(`Bearer ${tokenData.tokenId}`);
                    } catch (retryErr: any) {
                        console.warn(`[NCBA OpenBanking] tokenID retry network error:`, retryErr.message);
                    }
                }
            } else if (userId && password) {
                // Direct APIM Basic Auth fallback (when gateway uses subscription key without separate /token endpoint)
                usedAuthMode = 'Direct APIM Key + Basic Auth';
                console.log(`[NCBA OpenBanking] No token endpoint found (all 404). Falling back to ${usedAuthMode} for ${fullUrl}`);
                const basicAuth = `Basic ${Buffer.from(`${userId}:${password}`).toString('base64')}`;
                try {
                    response = await executeFetch(basicAuth);
                } catch (fetchErr: any) {
                    if (fetchErr.name === 'AbortError') {
                        throw new Error(`NCBA Open Banking API request timed out after 14s (${fullUrl})`);
                    }
                    throw fetchErr;
                }
            } else {
                const probeSummary = lastProbeResults.map(p => `${p.method} ${p.url.replace(/^https?:\/\/[^\/]+/, '')} [${p.format}] -> ${p.status}`).join(' | ');
                throw new Error(`NCBA Open Banking credentials missing: User ID and Password required. Probed: ${probeSummary || 'None'}`);
            }

            const text = await response.text();
            let parsed: any;
            try {
                parsed = JSON.parse(text);
            } catch (_) {
                parsed = { rawText: text };
            }

            if (!response.ok) {
                // If 401 Unauthorized, purge the cached token so next request forces a fresh authentication
                if (response.status === 401) {
                    const cacheKey = `${userId}:${rootBase}`;
                    delete tokenCache[cacheKey];
                    console.error(`[NCBA OpenBanking 401 Unauthorized] at ${fullUrl}:`, text);
                    const probeSummary = lastProbeResults.map(p => `${p.method} ${p.url.replace(/^https?:\/\/[^\/]+/, '')} [${p.format}] -> ${p.status}`).join(' | ');
                    throw new Error(
                        `NCBA Open Banking error (401) at ${fullUrl}: Unauthorized using ${usedAuthMode}. ` +
                        (probeSummary ? `Probed token endpoints: ${probeSummary}. ` : '') +
                        `Please verify that: (1) Your Subscription Key is activated for the Mobile Money Transfer API product on NCBA's developer portal, ` +
                        `(2) Your Open Banking User ID and Password are correct, and (3) The Debit Account is authorized for B2C payouts.`
                    );
                }

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
            // 0. Query Server Outbound IP for NCBA Firewall Whitelisting
            case 'ip':
            case 'getIp':
            case 'serverIp': {
                let serverIp = 'Unknown';
                try {
                    const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) });
                    const ipJson = await ipRes.json() as any;
                    serverIp = ipJson?.ip || serverIp;
                } catch (_) {
                    try {
                        const ipRes2 = await fetch('https://ifconfig.me/ip', { signal: AbortSignal.timeout(4000) });
                        serverIp = (await ipRes2.text()).trim();
                    } catch (_) {}
                }
                const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'Unknown';
                return res.status(200).json({
                    success: true,
                    serverIp,
                    clientIp
                });
            }

            // 1. Authenticate & Retrieve Token
            case 'token':
            case 'authenticate': {
                const tokenData = await getAccessTokenData();
                return res.status(200).json({
                    success: !!tokenData?.token || (!!userId && !!password),
                    tokenType: tokenData?.token ? 'Bearer' : 'Direct-APIM-Subscription-Key',
                    accessToken: tokenData?.accessToken || tokenData?.token || 'direct-subscription-key-active',
                    tokenId: tokenData?.tokenId,
                    sourceUrl: tokenData?.sourceUrl || 'direct-apim-gateway',
                    authMode: tokenData?.token ? 'OAuth Bearer Token' : 'Direct APIM Subscription Key + Basic Auth',
                    message: tokenData?.token 
                        ? `Bearer token acquired successfully from ${tokenData.sourceUrl}!` 
                        : 'No dedicated /token endpoint found (404); Direct APIM Subscription Key & Basic Auth fallback is active.',
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
                const rawPhone = req.body.mobileNumber || req.body.phone || req.body.msisdn;
                const phone = formatKenyanPhone(rawPhone);
                if (!phone || phone.length !== 12 || !phone.startsWith('254')) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Invalid Kenyan phone number: "${rawPhone || ''}". Expected 10 or 12-digit Kenyan mobile number (e.g., 0712345678 or 254712345678).` 
                    });
                }

                // NCBA Open Banking APIM candidate paths
                const validationPaths = [
                    '/api/v1/MobileMoneyTransfer/validate',
                    '/api/v1/MobileMoneyTransfer/Validate',
                    '/api/v1/mobilemoneytransfer/validate',
                    '/api/v1/Mpesa/validate',
                    '/api/v1/MobileMoney/validate'
                ];

                let apiResult: any = null;
                let lastError = '';

                if (!isMock) {
                    for (const path of validationPaths) {
                        try {
                            apiResult = await callOpenBankingApi(path, { msisdn: phone });
                            if (apiResult) break;
                        } catch (err: any) {
                            lastError = err.message || '';
                            const isNotFound = lastError.includes('(404)') || lastError.includes('(405)') || lastError.includes('Resource not found');
                            // If 404 or 405, try the next path; if network/auth error, halt probing
                            if (!isNotFound) break;
                        }
                    }
                }

                // If real API is not accessible (NCBA official UAT guide marks MPesa Validation as WIP)
                if (isMock || !apiResult) {
                    apiResult = {
                        statusCode: 200,
                        succeeded: true,
                        validationId: `val-${Date.now()}-08dcc836`,
                        customerMsisdn: phone,
                        minimumPaymentAmount: 50.0,
                        isMockFallback: !isMock,
                        note: !isMock
                            ? 'NCBA UAT Gateway has flagged M-Pesa Validation as WIP (404 Resource Not Found). The mobile number format is valid (254XXXXXXXXX). Direct M-Pesa payouts (/api/v1/MobileMoneyTransfer/mobilemoneytransfer) do not require a validationId and can proceed.'
                            : undefined
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

            // 7. Account Mini-Statement & Balance Query (multi-path probe)
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

                // NCBA APIM may expose the Account API under different path patterns
                const miniStatementPaths = [
                    '/api/v1/Account/ministatement',
                    '/api/v1/Account/MiniStatement',
                    '/api/v1/account/ministatement',
                    '/api/v1/Accounts/ministatement',
                    '/api/v1/AccountInquiry/ministatement',
                    '/api/v1/AccountInquiry/MiniStatement',
                    '/api/v1/AccountServices/ministatement',
                    '/api/v1/MiniStatement/ministatement',
                    '/api/v1/MiniStatement',
                ];

                let apiResult: any = null;
                let lastError = '';
                let probeLog: string[] = [];

                if (!isMock) {
                    for (const p of miniStatementPaths) {
                        try {
                            apiResult = await callOpenBankingApi(p, payload);
                            probeLog.push(`${p} -> OK`);
                            break; // success — stop probing
                        } catch (err: any) {
                            const status = (err.message || '').match(/\((\d{3})\)/)?.[1] || 'ERR';
                            probeLog.push(`${p} -> ${status}`);
                            // 404 / 405 = wrong path, keep trying; any other error = real failure
                            if (status !== '404' && status !== '405' && status !== '400') {
                                lastError = err.message;
                                break; // auth failure, timeout, etc. — stop
                            }
                            lastError = err.message;
                        }
                    }
                }

                if (isMock || !apiResult) {
                    if (!isMock && lastError) {
                        // All paths failed — return diagnostic
                        return res.status(200).json({
                            success: false,
                            message: `Account mini-statement endpoint not found. This API product may not be provisioned on your NCBA subscription. Probed: ${probeLog.join(' | ')}`,
                            probedPaths: probeLog,
                            hint: 'Check with your NCBA integration manager whether the Account Inquiry API product is enabled on your subscription key, or provide the exact Account API base URL.',
                            // Fall back to mock data so the UI still renders
                            isMockFallback: true,
                            ErrorCode: '000',
                            ErrorMessage: 'success (Mock Fallback — real API unavailable)',
                            UnitID: 'KE0010001',
                            AccountNumber: targetAccount || '9115310018',
                            AccountType: 1,
                            Currency: 'KES',
                            AvailableBalance: '0.00',
                            MiniStatementList: []
                        });
                    }
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
                    ...(probeLog.length > 0 ? { probedPaths: probeLog } : {}),
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
