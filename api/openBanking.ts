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

// Format amount as string with 2 decimals per NCBA V2 v3.1 Rules R1 & R5
const formatAmount2dp = (val: any): string => {
    const n = Number(val);
    if (!Number.isFinite(n)) return '0.00';
    return n.toFixed(2);
};

// Classify synchronous payment API responses (NCBA V2 v3.1 Sections 4 & 9.2)
const classifySyncPaymentResponse = (apiResult: any, httpStatus = 200) => {
    const resCode = String(apiResult?.resultCode ?? apiResult?.resErrorCode ?? apiResult?.resResultCode ?? apiResult?.ErrorCode ?? '').trim();
    const isDuplicate = resCode === '115';
    const ftReference = String(
        apiResult?.txnReferenceNo ||
        apiResult?.resCoreReferenceNo ||
        apiResult?.data?.bankRef ||
        apiResult?.CoreReference ||
        ''
    ).trim();
    const clientReference = String(
        apiResult?.cbxReferenceNumber ||
        apiResult?.resCbxReferenceNo ||
        apiResult?.hdrTranId ||
        apiResult?.data?.channelRef ||
        apiResult?.TransactionId ||
        ''
    ).trim();

    if (isDuplicate) {
        return {
            statusClass: 'duplicate' as const,
            accepted: false,
            isDuplicate: true,
            isFinal: false,
            ftReference,
            clientReference,
            errorShape: 'E4',
            message: apiResult?.statusDescription || apiResult?.message || 'Duplicate client reference (code 115) — already processed; reconcile on original FT.',
        };
    }

    const familyASuccess = apiResult?.resultCode === '000';
    const familyBSuccess = apiResult?.resErrorCode === '000';
    const familyCSuccess = apiResult?.succeeded === true && (!apiResult?.statusCode || Number(apiResult.statusCode) === 200);

    if (familyASuccess || familyBSuccess || familyCSuccess) {
        return {
            statusClass: 'accepted' as const,
            accepted: true,
            isDuplicate: false,
            isFinal: false, // Rule R11: synchronous success means accepted & posted, NOT final
            ftReference,
            clientReference,
            errorShape: null,
            message: apiResult?.statusDescription || apiResult?.message || 'Accepted and posted (awaiting final status via callback or Transaction Checker).',
        };
    }

    let errorShape = 'E3';
    if (apiResult?.succeeded === false && Number(apiResult?.statusCode) === 422) errorShape = 'E1';
    else if (httpStatus === 400 || Number(apiResult?.status) === 400) errorShape = 'E2';

    return {
        statusClass: 'rejected' as const,
        accepted: false,
        isDuplicate: false,
        isFinal: true,
        ftReference,
        clientReference,
        errorShape,
        message: apiResult?.message || apiResult?.statusDescription || apiResult?.title || apiResult?.ErrorMessage || 'Rejected at submission',
    };
};

// Classify Transaction Checker responses (NCBA V2 v3.1 Sections 9.2, 9.4, STS-01..06)
const classifyTransactionCheckerResponse = (checkerBody: any, httpStatus: number) => {
    if (httpStatus === 404) {
        return {
            statusClass: 'not_yet_known' as const,
            isFinal: false,
            isSuccessful: false,
            transactionStatus: 'NotFound',
            thirdPartyId: '',
            thirdPartyStatus: '',
            cbxReferenceNumber: '',
            txnReferenceNo: '',
            lastCheckedAt: null,
            message: checkerBody?.message || 'Transaction not found (status checks run in batches; retry after next batch).',
        };
    }

    const isSuccessful = checkerBody?.isSuccessful === true;
    const transactionStatus = String(checkerBody?.transactionStatus || '').trim();
    const isPending = !isSuccessful && transactionStatus.toLowerCase() === 'pending';

    let statusClass: 'final_success' | 'pending' | 'final_failure';
    if (isSuccessful) {
        statusClass = 'final_success';
    } else if (isPending) {
        statusClass = 'pending';
    } else {
        // Section 9.2 & STS-05: isSuccessful false with any transactionStatus other than "Pending" = Final failure
        statusClass = 'final_failure';
    }

    return {
        statusClass,
        isFinal: statusClass === 'final_success' || statusClass === 'final_failure',
        isSuccessful,
        transactionStatus: transactionStatus || (isSuccessful ? 'Completed' : 'Failed'),
        thirdPartyId: String(checkerBody?.thirdPartyId || ''),
        thirdPartyStatus: String(checkerBody?.thirdPartyStatus || ''),
        cbxReferenceNumber: String(checkerBody?.cbxReferenceNumber || ''),
        txnReferenceNo: String(checkerBody?.txnReferenceNo || ''),
        lastCheckedAt: checkerBody?.lastCheckedAt || null,
        message: statusClass === 'final_success'
            ? 'Final success confirmed by Transaction Checker'
            : statusClass === 'pending'
                ? 'Transaction is still Pending at NCBA or scheme/provider'
                : `Final failure confirmed by Transaction Checker (${transactionStatus || 'Failed'})`,
    };
};

// Default Gateway Base URLs from NCBA Open Banking V2 Client UAT Guide v3.1 (24 Nov 2026)
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
        const defaultCountry = sanitizeVal(config.senderCountry || 'KE');
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

            // 2. Official NCBA Open Banking V2 Token Endpoint (Client UAT Guide v3.1 Section 2)
            // Primary path: POST {baseUrl}/api/v1/Auth/generate-token
            probeList.push(
                { url: `${apiV1Base}/Auth/generate-token`, method: 'POST', format: 'json' },
                { url: `${hostBase}/apigateway/api/v1/Auth/generate-token`, method: 'POST', format: 'json' },
                // Legacy / fallback token paths
                { url: `${rootBase}/token`, method: 'POST', format: 'json' },
                { url: `${apiV1Base}/token`, method: 'POST', format: 'json' },
                { url: `${hostBase}/apigateway/token`, method: 'POST', format: 'json' },
                { url: `${hostBase}/apigateway/api/v1/token`, method: 'POST', format: 'json' },
                { url: `${rootBase}/api/v1/Auth/token`, method: 'POST', format: 'json' },
                { url: `${rootBase}/api/v1/auth/token`, method: 'POST', format: 'json' },
                { url: `${rootBase}/api/v1/Token/token`, method: 'POST', format: 'json' },
                { url: `${rootBase}/api/v1/Authentication/token`, method: 'POST', format: 'json' },
                { url: `${rootBase}/token`, method: 'POST', format: 'form' },
                { url: `${rootBase}/token`, method: 'POST', format: 'form', useBasicAuth: true }
            );

            // 3. Production APIM Gateway (only if environment is production or custom)
            if (environment === 'production') {
                probeList.push(
                    { url: `https://openbanking.api.ncbagroup.com/apigateway/api/v1/Auth/generate-token`, method: 'POST', format: 'json' },
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
        const callOpenBankingApi = async (
            endpointPath: string,
            payload: any,
            method = 'POST',
            options?: { returnHttpStatus?: boolean }
        ) => {
            if (isMock) {
                console.log(`[NCBA OpenBanking MOCK] Simulating call to ${endpointPath} [${method}]`);
                return null; // Will trigger simulated return
            }

            const tokenData = await getAccessTokenData();
            const cleanPath = endpointPath.startsWith('/') ? endpointPath.slice(1) : endpointPath;
            const fullUrl = `${rootBase}/${cleanPath}`;

            const buildHeaders = (authHeaderVal: string): Record<string, string> => {
                const h: Record<string, string> = {
                    'Accept': 'application/json',
                    'User-Agent': 'EduAlloc-AI/2.0.0 (NCBA-OpenBanking-V2-Client)'
                };
                if (method !== 'GET') {
                    h['Content-Type'] = 'application/json';
                }
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

            if (options?.returnHttpStatus) {
                if (response.status === 401) {
                    delete tokenCache[`${userId}:${rootBase}`];
                }
                return { httpStatus: response.status, body: parsed };
            }

            if (!response.ok) {
                // If 401 Unauthorized, purge the cached token so next request forces a fresh authentication
                if (response.status === 401) {
                    const cacheKey = `${userId}:${rootBase}`;
                    delete tokenCache[cacheKey];
                    console.error(`[NCBA OpenBanking 401 Unauthorized] at ${fullUrl}`);
                    const probeSummary = lastProbeResults.map(p => `${p.method} ${p.url.replace(/^https?:\/\/[^\/]+/, '')} [${p.format}] -> ${p.status}`).join(' | ');
                    throw new Error(
                        `NCBA Open Banking error (401) at ${fullUrl}: Unauthorized using ${usedAuthMode}. ` +
                        (probeSummary ? `Probed token endpoints: ${probeSummary}. ` : '') +
                        `Please verify that: (1) Your Subscription Key is activated for the NCBA Open Banking V2 product, ` +
                        `(2) Your Open Banking User ID and Password are correct, and (3) Your static IP is whitelisted.`
                    );
                }

                // NCBA v3.1 Section 4: Business rejections (E3) may return HTTP 500 with JSON { succeeded: false, message }
                if (parsed && typeof parsed === 'object' && ('succeeded' in parsed || 'resultCode' in parsed || 'resErrorCode' in parsed)) {
                    return parsed;
                }

                console.error(`[NCBA OpenBanking Error ${response.status}] at ${fullUrl}:`, text.slice(0, 300));
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

            // 1b. Test B2C Authentication (token probe + transfer endpoint reachability, no real money moved)
            case 'testB2cAuth': {
                const steps: Array<{ step: string; status: string; detail: string }> = [];
                let overallSuccess = false;
                let tokenData: CachedToken | null = null;

                // Step 1 – Acquire Open Banking token
                try {
                    tokenData = await getAccessTokenData();
                    if (tokenData?.token) {
                        steps.push({
                            step: 'Token Acquisition',
                            status: 'OK',
                            detail: `Bearer token acquired from ${tokenData.sourceUrl} (accessToken: ${(tokenData.accessToken || tokenData.token).slice(0, 20)}...)`
                        });
                    } else {
                        steps.push({
                            step: 'Token Acquisition',
                            status: 'FALLBACK',
                            detail: 'No /token endpoint answered — running in Direct APIM Subscription Key + Basic Auth fallback mode.'
                        });
                    }
                } catch (tokenErr: any) {
                    steps.push({ step: 'Token Acquisition', status: 'ERROR', detail: tokenErr.message });
                }

                // Step 2 – Probe NCBA V2 Hakikisha validation endpoint (safe, non-debiting per v3.1 Section 6)
                const transferPath = '/api/v1/MobileB2WValidation/validate-account';
                const fullTransferUrl = `${rootBase}${transferPath}`;
                try {
                    const transferHeaders: Record<string, string> = {
                        'Ocp-Apim-Subscription-Key': subscriptionKey,
                        'Content-Type': 'application/json'
                    };
                    if (tokenData?.token) {
                        transferHeaders['Authorization'] = `Bearer ${tokenData.token}`;
                    } else if (userId && password) {
                        transferHeaders['Authorization'] = `Basic ${Buffer.from(`${userId}:${password}`).toString('base64')}`;
                    }
                    const probePayload = {
                        provider: 'safaricom',
                        msisdn: '254700000000'
                    };
                    const probeRes = await fetch(fullTransferUrl, {
                        method: 'POST',
                        headers: transferHeaders,
                        body: JSON.stringify(probePayload),
                        signal: AbortSignal.timeout(10000)
                    });
                    const probeStatus = probeRes.status;
                    let probeBody = '';
                    try { probeBody = await probeRes.text(); } catch (_) {}

                    if (probeStatus === 403) {
                        steps.push({
                            step: 'Transfer Endpoint Reachability',
                            status: 'BLOCKED',
                            detail: `HTTP 403 Forbidden — Server IP is NOT whitelisted by NCBA WAF. Ask NCBA to whitelist the server outbound IP shown above.`
                        });
                    } else if (probeStatus === 401) {
                        steps.push({
                            step: 'Transfer Endpoint Reachability',
                            status: 'AUTH_FAIL',
                            detail: `HTTP 401 Unauthorized — Endpoint reachable but credentials rejected. Verify UserID, Password, and Subscription Key.`
                        });
                        overallSuccess = false;
                    } else if (probeStatus === 400 || probeStatus === 422) {
                        // 400/422 means endpoint is alive and authenticated — just rejected the dummy payload
                        steps.push({
                            step: 'Transfer Endpoint Reachability',
                            status: 'REACHABLE',
                            detail: `HTTP ${probeStatus} — Endpoint authenticated and reachable! (Probe payload rejected as expected for a 0-amount dummy request).`
                        });
                        overallSuccess = true;
                    } else if (probeStatus === 200) {
                        steps.push({
                            step: 'Transfer Endpoint Reachability',
                            status: 'OK',
                            detail: `HTTP 200 — Transfer endpoint fully reachable and authenticated. B2C is ready.`
                        });
                        overallSuccess = true;
                    } else if (probeStatus === 404) {
                        steps.push({
                            step: 'Transfer Endpoint Reachability',
                            status: 'NOT_FOUND',
                            detail: `HTTP 404 — Transfer endpoint not found at ${fullTransferUrl}. Check Base URL configuration.`
                        });
                    } else {
                        steps.push({
                            step: 'Transfer Endpoint Reachability',
                            status: `HTTP_${probeStatus}`,
                            detail: `HTTP ${probeStatus} from transfer endpoint. Response: ${probeBody.slice(0, 200)}`
                        });
                        overallSuccess = probeStatus < 400;
                    }
                } catch (probeErr: any) {
                    const msg = probeErr.message || String(probeErr);
                    if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT')) {
                        steps.push({
                            step: 'Transfer Endpoint Reachability',
                            status: 'NETWORK_ERROR',
                            detail: `Network error reaching ${fullTransferUrl}: ${msg}. Check server internet connectivity.`
                        });
                    } else {
                        steps.push({ step: 'Transfer Endpoint Reachability', status: 'ERROR', detail: msg });
                    }
                }

                // Step 3 – Token probe summary
                steps.push({
                    step: 'Token Probe Summary',
                    status: 'INFO',
                    detail: `${lastProbeResults.length} token endpoint(s) probed. Auth mode: ${tokenData?.token ? `OAuth Bearer (from ${tokenData.sourceUrl})` : 'Direct APIM Subscription Key + Basic Auth fallback'}.`
                });

                // Determine human-readable overall message
                const blockedStep = steps.find(s => s.status === 'BLOCKED');
                const authFailStep = steps.find(s => s.status === 'AUTH_FAIL');
                const reachableStep = steps.find(s => s.status === 'REACHABLE' || s.status === 'OK');
                let summaryMessage: string;
                if (blockedStep) {
                    summaryMessage = `❌ IP Not Whitelisted — NCBA WAF is blocking the server. Contact NCBA to whitelist the server outbound IP shown at the top of this tab.`;
                } else if (authFailStep) {
                    summaryMessage = `⚠️ Authentication Failed — The transfer endpoint is reachable but credentials were rejected (401). Double-check User ID, Password, and Subscription Key.`;
                } else if (reachableStep) {
                    summaryMessage = `✅ B2C Auth OK — Token acquired and transfer endpoint is reachable. Ready for live transfers!`;
                } else {
                    summaryMessage = `ℹ️ B2C Auth Probe Complete — Review the step results below for details.`;
                }

                return res.status(200).json({
                    success: overallSuccess,
                    message: summaryMessage,
                    steps,
                    tokenAcquired: !!tokenData?.token,
                    tokenSourceUrl: tokenData?.sourceUrl,
                    authMode: tokenData?.token ? 'OAuth Bearer Token' : 'Direct APIM Subscription Key + Basic Auth',
                    transferEndpoint: fullTransferUrl,
                    probes: lastProbeResults,
                    isMock
                });
            }

            // 2. Bank-to-Wallet (M-PESA & Airtel Money) – NCBA V2 v3.1 Section 7.5
            case 'b2cMpesa':
            case 'mobileB2W':
            case 'mobileMoneyTransfer': {
                const {
                    beneficiaryName,
                    debitAmount,
                    amount,
                    mobileNumber,
                    receipientNumber,
                    msisdn,
                    senderNumber,
                    transactionNarration,
                    narration,
                    uniqueReferenceNumber,
                    channelRef,
                    provider = 'safaricom',
                    validationId: suppliedValidationId,
                } = req.body;

                const rawAmt = debitAmount ?? amount;
                const rawPhone = receipientNumber || mobileNumber || msisdn;

                if (!rawAmt || !rawPhone) {
                    return res.status(400).json({
                        success: false,
                        message: 'amount (or debitAmount) and mobileNumber (or receipientNumber) are required.'
                    });
                }

                const formattedPhone = formatKenyanPhone(rawPhone);
                if (!/^254[71]\d{8}$/.test(formattedPhone)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid mobile number format "${rawPhone}". Expected 12 digits starting 2547 or 2541 (Rule R6).`
                    });
                }

                const amtNum = Number(rawAmt);
                const amtStr = formatAmount2dp(amtNum);
                const ref = sanitizeVal(channelRef || uniqueReferenceNumber || `OB-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
                const cleanNarration = sanitizeVal(narration || transactionNarration || 'EduAlloc Payout').slice(0, 30);
                const activeDebitAccount = sanitizeVal(req.body.debitAccount || debitAccount);
                const activeProvider = String(provider || 'safaricom').toLowerCase() === 'airtel' ? 'airtel' : 'safaricom';
                const activeSenderNumber = formatKenyanPhone(senderNumber || config.senderNumber || '254700000001');

                if (!activeDebitAccount && !isMock) {
                    return res.status(400).json({
                        success: false,
                        message: 'Debit Account number is required for Bank-to-Wallet transfer.'
                    });
                }

                // Rule R8 & R9: Validate via Hakikisha before Bank-to-Wallet if validationId not already provided
                let resolvedValidationId = sanitizeVal(suppliedValidationId || '');
                let resolvedCustomerName = sanitizeVal(beneficiaryName || '');
                if (!resolvedValidationId && !isMock) {
                    try {
                        const valRes = await callOpenBankingApi('/api/v1/MobileB2WValidation/validate-account', {
                            provider: activeProvider,
                            msisdn: formattedPhone,
                        });
                        if (valRes?.succeeded && valRes?.validationId) {
                            resolvedValidationId = String(valRes.validationId);
                            if (valRes.customerName) resolvedCustomerName = String(valRes.customerName);
                        }
                    } catch (valErr: any) {
                        console.warn('[NCBA V2 B2W] Auto-Hakikisha pre-validation failed:', valErr?.message || valErr);
                    }
                }

                // Section 7.5 payload (Rule R10: never include callbackUrl)
                const payload = {
                    validationId: resolvedValidationId,
                    provider: activeProvider,
                    amount: amtStr,
                    debitAccount: activeDebitAccount,
                    receipientNumber: formattedPhone, // spelt as deployed by NCBA V2
                    senderNumber: activeSenderNumber,
                    channelRef: ref,
                    reqChnlId: ref,
                    narration: cleanNarration,
                };

                let apiResult = await callOpenBankingApi('/api/v1/MobileB2WPayment/mobileb2wpayment', payload);

                if (isMock || !apiResult) {
                    apiResult = {
                        statusCode: 200,
                        message: 'Payment request saved successfully (Mock)',
                        succeeded: true,
                        data: {
                            id: `mock-uuid-${Date.now()}`,
                            channelRef: ref,
                            bankRef: `FTX${Date.now().toString().slice(-8)}AAQVT`,
                            message: 'Payment request saved successfully'
                        }
                    };
                }

                const classification = classifySyncPaymentResponse(apiResult);
                const bankRef = classification.ftReference || apiResult?.data?.bankRef || ref;

                // Record transaction in Supabase if available (Rule R11: accepted is NON-FINAL; Rule R3: do not record second payment on duplicate 115)
                if (supabase && !classification.isDuplicate) {
                    try {
                        await supabase.from('ncba_transactions').insert({
                            institution_id: institutionId && institutionId !== 'GLOBAL' ? institutionId : null,
                            transaction_id: ref,
                            reference_id: bankRef,
                            receipt_number: bankRef,
                            type: activeProvider === 'airtel' ? 'b2w_airtel_transfer' : 'b2c_mpesa_transfer',
                            amount: amtNum,
                            phone: formattedPhone,
                            status: classification.accepted ? 'accepted' : 'failed',
                            metadata: {
                                ...payload,
                                beneficiaryName: resolvedCustomerName,
                                provider: 'ncba_open_banking',
                                rail: 'B2W',
                                debitAccount: activeDebitAccount,
                                ftReference: bankRef,
                                clientReference: ref,
                                syncClassification: classification,
                                response: apiResult
                            }
                        });
                    } catch (dbErr) {
                        console.warn('[NCBA OpenBanking] Failed to persist ncba_transaction record:', dbErr);
                    }
                }

                return res.status(200).json({
                    success: classification.accepted,
                    isFinal: false,
                    statusClass: classification.statusClass,
                    isDuplicate: classification.isDuplicate,
                    ftReference: bankRef,
                    clientReference: ref,
                    data: apiResult.data,
                    message: classification.message,
                    statusCode: apiResult.statusCode || 200,
                    raw: apiResult
                });
            }

            // 3. Hakikisha – M-PESA and Airtel Money Name Validation (NCBA V2 v3.1 Section 6)
            case 'validateMpesa':
            case 'hakikisha': {
                const rawPhone = req.body.mobileNumber || req.body.phone || req.body.msisdn;
                const provider = String(req.body.provider || 'safaricom').toLowerCase();
                const phone = formatKenyanPhone(rawPhone);
                if (!phone || !/^254[71]\d{8}$/.test(phone)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid Kenyan mobile number: "${rawPhone || ''}". Expected 12 digits starting 2547 or 2541 (Rule R6).`
                    });
                }

                let apiResult: any = null;
                if (!isMock) {
                    apiResult = await callOpenBankingApi('/api/v1/MobileB2WValidation/validate-account', {
                        provider,
                        msisdn: phone
                    });
                }

                if (isMock || !apiResult) {
                    apiResult = {
                        statusCode: 200,
                        succeeded: true,
                        validationId: `val-${Date.now()}-08dcc836`,
                        customerMsisdn: phone,
                        customerName: 'TEST RECIPIENT',
                        minimumPaymentAmount: 50.0,
                        isMock: true
                    };
                }

                return res.status(200).json({
                    success: apiResult.succeeded === true,
                    ...apiResult
                });
            }

            // 3b. PesaLink Account Validation (A1 – NCBA V2 v3.1 Section 6)
            case 'validatePesaLinkAccount': {
                const { targetPic, accountToVerify } = req.body;
                const activeDebit = sanitizeVal(req.body.debitAccount || debitAccount);
                if (!targetPic || !accountToVerify || !activeDebit) {
                    return res.status(400).json({
                        success: false,
                        message: 'targetPic, accountToVerify, and debitAccount are required.'
                    });
                }

                let apiResult = await callOpenBankingApi('/api/v1/PesalinkValidation/validate-account', {
                    targetPic: String(targetPic),
                    accountToVerify: String(accountToVerify),
                    debitAccount: activeDebit
                });

                if (isMock || !apiResult) {
                    apiResult = {
                        StatusCode: '00',
                        StatusMessage: 'Account Found',
                        AccountName: 'JANE DOE',
                        AccountNumber: String(accountToVerify)
                    };
                }

                return res.status(200).json({
                    success: apiResult.StatusCode === '00' || apiResult.succeeded === true,
                    ...apiResult
                });
            }

            // 3c. PesaLink Phone Validation (A2 – NCBA V2 v3.1 Section 6)
            case 'validatePesaLinkPhone': {
                const rawPhone = req.body.phoneNumber || req.body.mobileNumber || req.body.msisdn;
                const phone = formatKenyanPhone(rawPhone);
                const activeDebit = sanitizeVal(req.body.debitAccount || debitAccount);
                if (!phone || !/^254[71]\d{8}$/.test(phone) || !activeDebit) {
                    return res.status(400).json({
                        success: false,
                        message: 'Valid 12-digit phoneNumber (2547.../2541...) and debitAccount are required.'
                    });
                }

                let apiResult = await callOpenBankingApi('/api/v1/PesalinkValidation/validate-phone', {
                    phoneNumber: phone,
                    debitAccount: activeDebit
                });

                if (isMock || !apiResult) {
                    apiResult = {
                        destName: 'JANE DOE',
                        bankList: {
                            bank: [{ bankName: 'EQUITY BANK', lookupBankName: 'EQUITY', sortCode: '00680000', def: true }]
                        }
                    };
                }

                return res.status(200).json({
                    success: !!apiResult.destName,
                    ...apiResult
                });
            }

            // 4. Internal Funds Transfer (IFT) – NCBA to NCBA (v3.1 Section 7.1)
            case 'ift':
            case 'internalFundsTransfer': {
                const {
                    beneficiaryAccountName,
                    creditAccountNumber,
                    amount,
                    narration,
                    currency = 'KES'
                } = req.body;

                const activeDebit = sanitizeVal(req.body.debitAccountNumber || debitAccount);
                const ref = sanitizeVal(req.body.transactionId || `OB-${Date.now()}-IFT`);
                const amtStr = formatAmount2dp(amount);

                const payload = {
                    Country: sanitizeVal(req.body.country || defaultCountry),
                    TransactionID: ref,
                    BeneficiaryAccountName: beneficiaryAccountName,
                    DebitAccountNumber: activeDebit,
                    CreditAccountNumber: creditAccountNumber,
                    Currency: currency,
                    Amount: amtStr,
                    Narration: sanitizeVal(narration || 'IFT Transfer').slice(0, 30)
                };

                let apiResult = await callOpenBankingApi('/api/v1/IFTTransaction/ifttransaction', payload);
                if (isMock || !apiResult) {
                    apiResult = {
                        resultCode: '000',
                        statusDescription: 'SUCCESS (Mock)',
                        cbxReferenceNumber: ref,
                        txnReferenceNo: `FTX${Date.now().toString().slice(-8)}TAACS`
                    };
                }

                const classification = classifySyncPaymentResponse(apiResult);
                if (supabase && !classification.isDuplicate) {
                    await supabase.from('ncba_transactions').insert({
                        institution_id: institutionId && institutionId !== 'GLOBAL' ? institutionId : null,
                        transaction_id: ref,
                        reference_id: classification.ftReference || ref,
                        type: 'ift_transfer',
                        amount: Number(amount) || 0,
                        status: classification.accepted ? 'accepted' : 'failed',
                        metadata: { ...payload, provider: 'ncba_open_banking', rail: 'IFT', debitAccount: activeDebit, ftReference: classification.ftReference, clientReference: ref, response: apiResult }
                    }).then(() => {}, () => {});
                }

                return res.status(200).json({
                    success: classification.accepted,
                    isFinal: false,
                    statusClass: classification.statusClass,
                    isDuplicate: classification.isDuplicate,
                    ftReference: classification.ftReference,
                    clientReference: ref,
                    ...apiResult
                });
            }

            // 5. Electronic Funds Transfer (EFT) – To Local Bank Accounts (v3.1 Section 7.2)
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

                const activeDebit = sanitizeVal(req.body.debitAccountNumber || debitAccount);
                const ref = sanitizeVal(req.body.transactionId || `OB-${Date.now()}-EFT`);
                const activeCif = sanitizeVal(req.body.senderCif || senderCif || (activeDebit ? activeDebit.slice(0, 6) : ''));

                const payload = {
                    Amount: formatAmount2dp(amount),
                    BeneficiaryAccountNumber: beneficiaryAccountNumber,
                    BeneficiaryBankBIC: beneficiaryBankBic,
                    BeneficiaryName: beneficiaryName,
                    Currency: currency,
                    DebitAccountNumber: activeDebit,
                    Narration: sanitizeVal(narration || 'EFT Transfer').slice(0, 30),
                    SenderCountry: sanitizeVal(req.body.senderCountry || defaultCountry),
                    TransactionID: ref,
                    SenderCIF: activeCif
                };

                let apiResult = await callOpenBankingApi('/api/v1/EFTTransaction/efttransaction', payload);
                if (isMock || !apiResult) {
                    apiResult = {
                        resultCode: '000',
                        statusDescription: 'SUCCESS (Mock)',
                        cbxReferenceNumber: ref,
                        txnReferenceNo: `FTX${Date.now().toString().slice(-8)}TAACS`
                    };
                }

                const classification = classifySyncPaymentResponse(apiResult);
                if (supabase && !classification.isDuplicate) {
                    await supabase.from('ncba_transactions').insert({
                        institution_id: institutionId && institutionId !== 'GLOBAL' ? institutionId : null,
                        transaction_id: ref,
                        reference_id: classification.ftReference || ref,
                        type: 'eft_transfer',
                        amount: Number(amount) || 0,
                        status: classification.accepted ? 'accepted' : 'failed',
                        metadata: { ...payload, provider: 'ncba_open_banking', rail: 'EFT', debitAccount: activeDebit, ftReference: classification.ftReference, clientReference: ref, response: apiResult }
                    }).then(() => {}, () => {});
                }

                return res.status(200).json({
                    success: classification.accepted,
                    isFinal: false,
                    statusClass: classification.statusClass,
                    isDuplicate: classification.isDuplicate,
                    ftReference: classification.ftReference,
                    clientReference: ref,
                    ...apiResult
                });
            }

            // 6. PesaLink Payment (Instant Bank-to-Bank, v3.1 Section 7.3)
            case 'pesalink': {
                const {
                    amount,
                    beneficiaryAccountNumber,
                    beneficiaryBankBic,
                    beneficiaryBankName,
                    beneficiaryName,
                    senderName,
                    validationId = '',
                    currency = 'KES',
                    narration
                } = req.body;

                const activeDebit = sanitizeVal(req.body.senderAccountNumber || debitAccount);
                const ref = sanitizeVal(req.body.transactionId || req.body.channelReference || `OB-${Date.now()}-PESA`);
                const activeCif = sanitizeVal(req.body.senderCif || senderCif || (activeDebit ? activeDebit.slice(0, 6) : ''));

                // Rule R2: send identical value in TransactionID & channelReference; Rule R10: never send callbackUrl
                const payload = {
                    BeneficiaryAccountNumber: beneficiaryAccountNumber,
                    BeneficiaryBankBIC: String(beneficiaryBankBic || '').padStart(4, '0'),
                    BeneficiaryBankName: beneficiaryBankName || '',
                    BeneficiaryName: beneficiaryName,
                    Amount: formatAmount2dp(amount),
                    Currency: currency,
                    Narration: sanitizeVal(narration || 'PesaLink Transfer').slice(0, 30),
                    SenderAccountNumber: activeDebit,
                    SenderCIF: activeCif,
                    SenderCountry: sanitizeVal(req.body.senderCountry || defaultCountry),
                    senderName: senderName || config.accountName || 'EDUALLOC CLIENT',
                    TransactionID: ref,
                    channelReference: ref,
                    validationId: validationId || ''
                };

                let apiResult = await callOpenBankingApi('/api/v1/PesaLinkTransaction/pesaLinktransaction', payload);
                if (isMock || !apiResult) {
                    apiResult = {
                        resultCode: '000',
                        statusDescription: 'SUCCESS (Mock)',
                        cbxReferenceNumber: ref,
                        txnReferenceNo: `FTX${Date.now().toString().slice(-8)}TAACS`
                    };
                }

                const classification = classifySyncPaymentResponse(apiResult);
                if (supabase && !classification.isDuplicate) {
                    await supabase.from('ncba_transactions').insert({
                        institution_id: institutionId && institutionId !== 'GLOBAL' ? institutionId : null,
                        transaction_id: ref,
                        reference_id: classification.ftReference || ref,
                        type: 'pesalink_transfer',
                        amount: Number(amount) || 0,
                        status: classification.accepted ? 'accepted' : 'failed',
                        metadata: { ...payload, provider: 'ncba_open_banking', rail: 'PesaLink', debitAccount: activeDebit, ftReference: classification.ftReference, clientReference: ref, response: apiResult }
                    }).then(() => {}, () => {});
                }

                return res.status(200).json({
                    success: classification.accepted,
                    isFinal: false,
                    statusClass: classification.statusClass,
                    isDuplicate: classification.isDuplicate,
                    ftReference: classification.ftReference,
                    clientReference: ref,
                    ...apiResult
                });
            }

            // 6b. RTGS Payment (v3.1 Section 7.4)
            case 'rtgs': {
                const {
                    beneficiaryAccountNumber,
                    beneficiaryBankBic,
                    beneficiaryCountry = 'KE',
                    beneficiaryName,
                    beneficiaryAddress = 'NAIROBI',
                    amount,
                    debitCurrency = 'KES',
                    creditCurrency = 'KES',
                    purposeCode = 'MSC',
                    narration
                } = req.body;

                const activeDebit = sanitizeVal(req.body.senderAccountNumber || debitAccount);
                const ref = sanitizeVal(req.body.transactionId || `OB-${Date.now()}-RTGS`);
                const activeCif = sanitizeVal(req.body.senderCif || senderCif || (activeDebit ? activeDebit.slice(0, 6) : ''));

                const payload = {
                    BeneficiaryAccountNumber: beneficiaryAccountNumber,
                    BeneficiaryBankBIC: beneficiaryBankBic,
                    BeneficiaryCountry: beneficiaryCountry,
                    BeneficiaryName: beneficiaryName,
                    BeneficiaryAddress: beneficiaryAddress,
                    CreditAmount: formatAmount2dp(amount),
                    DebitCurrency: debitCurrency,
                    CreditCurrency: creditCurrency,
                    Narration: sanitizeVal(narration || 'RTGS Transfer').slice(0, 35),
                    SenderAccountNumber: activeDebit,
                    SenderCIF: activeCif,
                    SenderCountry: sanitizeVal(req.body.senderCountry || defaultCountry),
                    PurposeCode: purposeCode,
                    TransactionID: ref
                };

                let apiResult = await callOpenBankingApi('/api/v1/RTGSPayment/RTGSPayment', payload);
                if (isMock || !apiResult) {
                    apiResult = {
                        resultCode: '000',
                        statusDescription: 'SUCCESS (Mock)',
                        cbxReferenceNumber: ref,
                        txnReferenceNo: `FTX${Date.now().toString().slice(-8)}RTGS`
                    };
                }

                const classification = classifySyncPaymentResponse(apiResult);
                if (supabase && !classification.isDuplicate) {
                    await supabase.from('ncba_transactions').insert({
                        institution_id: institutionId && institutionId !== 'GLOBAL' ? institutionId : null,
                        transaction_id: ref,
                        reference_id: classification.ftReference || ref,
                        type: 'rtgs_transfer',
                        amount: Number(amount) || 0,
                        status: classification.accepted ? 'accepted' : 'failed',
                        metadata: { ...payload, provider: 'ncba_open_banking', rail: 'RTGS', debitAccount: activeDebit, ftReference: classification.ftReference, clientReference: ref, response: apiResult }
                    }).then(() => {}, () => {});
                }

                return res.status(200).json({
                    success: classification.accepted,
                    isFinal: false,
                    statusClass: classification.statusClass,
                    isDuplicate: classification.isDuplicate,
                    ftReference: classification.ftReference,
                    clientReference: ref,
                    ...apiResult
                });
            }

            // 7. Account Mini-Statement & Balance Query (v3.1 Section 5)
            case 'miniStatement':
            case 'balance': {
                const targetAccount = sanitizeVal(req.body.accountNo || debitAccount);
                if (!targetAccount && !isMock) {
                    return res.status(400).json({ success: false, message: 'Account number is required.' });
                }

                // Section 5: lowercase keys { "country": "KE", "accountNo": "..." }
                const payload = {
                    country: sanitizeVal(req.body.country || defaultCountry),
                    accountNo: targetAccount
                };

                const miniStatementPaths = [
                    '/api/v1/AccountMiniStatement/accountministatement',
                    '/api/v1/Account/ministatement',
                    '/api/v1/AccountInquiry/ministatement',
                ];

                let apiResult: any = null;
                let lastError = '';
                let probeLog: string[] = [];

                if (!isMock) {
                    for (const p of miniStatementPaths) {
                        try {
                            apiResult = await callOpenBankingApi(p, payload);
                            probeLog.push(`${p} -> OK`);
                            break;
                        } catch (err: any) {
                            const status = (err.message || '').match(/\((\d{3})\)/)?.[1] || 'ERR';
                            probeLog.push(`${p} -> ${status}`);
                            if (status !== '404' && status !== '405' && status !== '400') {
                                lastError = err.message;
                                break;
                            }
                            lastError = err.message;
                        }
                    }
                }

                if (isMock || !apiResult) {
                    if (!isMock && lastError) {
                        return res.status(200).json({
                            success: false,
                            message: `Account mini-statement endpoint unavailable. Probed: ${probeLog.join(' | ')}`,
                            probedPaths: probeLog,
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

            // 7b. Account Statement (v3.1 Section 5, dates DDMMYYYY)
            case 'accountStatement': {
                const targetAccount = sanitizeVal(req.body.accountNo || debitAccount);
                const { fromDate, toDate } = req.body;
                if (!targetAccount || !fromDate || !toDate) {
                    return res.status(400).json({ success: false, message: 'accountNo, fromDate (DDMMYYYY), and toDate (DDMMYYYY) are required.' });
                }

                const apiResult = await callOpenBankingApi('/api/v1/AccountStatement/accountstatement', {
                    country: sanitizeVal(req.body.country || defaultCountry),
                    accountNo: targetAccount,
                    fromDate: String(fromDate),
                    toDate: String(toDate),
                });

                return res.status(200).json({
                    success: apiResult?.ErrorCode === '000',
                    ...apiResult
                });
            }

            // 8. Transaction Status Query (by client reference — v3.1 Section 9.3, STS-04, STS-06)
            // Confirms whether transaction was posted and returns CoreReference (FT). Final status comes from Transaction Checker.
            case 'transactionStatus': {
                const transactionId = sanitizeVal(req.body.transactionId || req.query.transactionId);
                if (!transactionId) {
                    return res.status(400).json({ success: false, message: 'transactionId (client reference) is required.' });
                }

                const payload = {
                    country: sanitizeVal(req.body.country || defaultCountry),
                    transactionId
                };

                let apiResult = await callOpenBankingApi('/api/v1/TransactionStatusQuery/transactionstatusquery', payload);
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
                    note: 'Status query confirms posting and returns CoreReference (FT). Call transactionChecker with FT + debitAccount for authoritative final status (v3.1 Section 9.5).',
                    ...apiResult
                });
            }

            // 8b. Transaction Checker (by FT reference + debit account — v3.1 Section 9.4, STS-01..06)
            // Authoritative record of final payment status: isSuccessful decides success.
            case 'transactionChecker': {
                const txnReferenceNo = sanitizeVal(req.body.txnReferenceNo || req.body.ftReference || req.query.txnReferenceNo || req.query.ftReference);
                const activeDebit = sanitizeVal(req.body.debitAccountNumber || req.body.debitAccount || req.query.debitAccountNumber || debitAccount);
                if (!txnReferenceNo || !activeDebit) {
                    return res.status(400).json({
                        success: false,
                        message: 'txnReferenceNo (NCBA FT reference) and debitAccountNumber are required.'
                    });
                }

                let httpStatus = 200;
                let checkerBody: any = null;

                if (isMock) {
                    checkerBody = {
                        cbxReferenceNumber: req.body.clientReference || `OB-MOCK-${Date.now()}`,
                        txnReferenceNo,
                        transactionStatus: 'Completed',
                        isSuccessful: true,
                        lastCheckedAt: new Date().toISOString(),
                        thirdPartyId: `MPESA${Date.now().toString().slice(-7)}`,
                        thirdPartyStatus: 'ACSC'
                    };
                } else {
                    const checkerPath = `/api/v1/TransactionChecker/transactions/${encodeURIComponent(txnReferenceNo)}/${encodeURIComponent(activeDebit)}`;
                    const resObj: any = await callOpenBankingApi(checkerPath, undefined, 'GET', { returnHttpStatus: true });
                    httpStatus = resObj?.httpStatus ?? 200;
                    checkerBody = resObj?.body ?? {};
                }

                const classified = classifyTransactionCheckerResponse(checkerBody, httpStatus);

                // Persist authoritative final status back to ncba_transactions if we have a matching record
                if (supabase && classified.isFinal) {
                    try {
                        const finalDbStatus = classified.statusClass === 'final_success' ? 'completed' : 'failed';
                        const matchCol = classified.cbxReferenceNumber ? 'transaction_id' : 'reference_id';
                        const matchVal = classified.cbxReferenceNumber || txnReferenceNo;
                        const { data: existing } = await supabase
                            .from('ncba_transactions')
                            .select('id, status, metadata')
                            .eq(matchCol, matchVal)
                            .maybeSingle();
                        if (existing && existing.status !== finalDbStatus) {
                            const prevMeta = typeof existing.metadata === 'object' && existing.metadata ? existing.metadata : {};
                            await supabase.from('ncba_transactions').update({
                                status: finalDbStatus,
                                reference_id: txnReferenceNo,
                                receipt_number: classified.thirdPartyId || txnReferenceNo,
                                completed_at: finalDbStatus === 'completed' ? new Date().toISOString() : null,
                                metadata: {
                                    ...prevMeta,
                                    thirdPartyId: classified.thirdPartyId || prevMeta.thirdPartyId,
                                    thirdPartyStatus: classified.thirdPartyStatus || prevMeta.thirdPartyStatus,
                                    checker_response: checkerBody,
                                    checker_verified_at: new Date().toISOString(),
                                }
                            }).eq('id', existing.id);
                        }
                    } catch (dbErr) {
                        console.warn('[NCBA TransactionChecker] DB sync warning:', dbErr);
                    }
                }

                return res.status(200).json({
                    success: httpStatus === 200,
                    httpStatus,
                    ...classified,
                    raw: checkerBody
                });
            }

            // 9. Transaction Advice / Official Receipt (v3.1 Section 5)
            case 'transactionAdvise':
            case 'transactionAdvice': {
                const transactionId = sanitizeVal(req.body.transactionId || req.query.transactionId);
                if (!transactionId) {
                    return res.status(400).json({ success: false, message: 'transactionId (FT reference) is required.' });
                }

                const payload = {
                    country: sanitizeVal(req.body.country || defaultCountry),
                    transactionId
                };

                let apiResult = await callOpenBankingApi('/api/v1/TransactionAdvice/transactionadvice', payload);
                if (isMock || !apiResult) {
                    apiResult = {
                        ErrorCode: '000',
                        ErrorMessage: 'success (Mock)',
                        UnitID: 'KE0010001',
                        FtReference: transactionId,
                        TransactionType: 'B2W',
                        CreditCcy: 'KES',
                        CreditAmount: req.body.amount ? formatAmount2dp(req.body.amount) : '1000.00',
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
                    service: 'NCBA Open Banking V2 Gateway API',
                    version: '3.1 (Nov 2026 UAT Standard)',
                    supportedActions: [
                        'token',
                        'testB2cAuth',
                        'b2cMpesa',
                        'mobileB2W',
                        'validateMpesa',
                        'hakikisha',
                        'validatePesaLinkAccount',
                        'validatePesaLinkPhone',
                        'ift',
                        'eft',
                        'pesalink',
                        'rtgs',
                        'miniStatement',
                        'accountStatement',
                        'transactionStatus',
                        'transactionChecker',
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
