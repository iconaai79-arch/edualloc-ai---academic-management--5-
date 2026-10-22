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

// --- Custom Payment Notification & SMS Gateway Cascade Helpers ---
const DEFAULT_PAYMENT_NOTIFICATION_TEMPLATE = `Dear parent,
Student: {adm_no} - {student_name}
Class: {class_name}
Term: {academic_year} - {term}
Charged: {charged}
Adjusted: {adjusted}
Paid: {paid}
Bal: {balance} as at {timestamp}

{payment_instructions}`;

const formatPaymentNotificationTimestamp = (dateInput?: string | Date): string => {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()] || 'Jan';
    const year = String(d.getFullYear()).slice(-2);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
};

const formatCurrencyAmount = (val: number | string | undefined | null): string => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const buildCustomPaymentNotification = (params: {
    account?: any;
    student?: any;
    enrollment?: any;
    paymentAmount: number;
    totalCharged?: number;
    totalAdjusted?: number;
    currentBalance?: number;
    paymentDate?: string | Date;
    institutionName?: string;
    academicTerm?: string;
    academicYear?: string;
    receiptNumber?: string;
}): string => {
    const {
        account,
        student,
        enrollment,
        paymentAmount,
        totalCharged,
        totalAdjusted = 0,
        currentBalance,
        paymentDate,
        institutionName = 'School',
        academicTerm,
        academicYear,
        receiptNumber = ''
    } = params;

    const studentName = student?.name || student?.fullName || 'Student';
    const admNo = String(student?.admissionNumber || student?.admission_number || student?.admNo || student?.id || '').trim();

    let className = enrollment?.className || enrollment?.class_name || student?.className || student?.grade || student?.class || '';
    if (enrollment?.stream && !className.includes(enrollment.stream)) {
        className = `${className} - ${enrollment.stream}`;
    }
    if (!className) className = 'Student';

    const now = new Date();
    const currentYear = academicYear || String(now.getFullYear());
    let termText = academicTerm || '';
    if (!termText) {
        const month = now.getMonth() + 1;
        if (month <= 4) termText = 'Term I';
        else if (month <= 8) termText = 'Term II';
        else termText = 'Term III';
    }

    const paidFormatted = formatCurrencyAmount(paymentAmount);
    const chargedFormatted = formatCurrencyAmount(totalCharged ?? (Number(currentBalance || 0) + Number(paymentAmount)));
    const adjustedFormatted = formatCurrencyAmount(totalAdjusted);
    const balanceFormatted = formatCurrencyAmount(currentBalance ?? 0);
    const timestampFormatted = formatPaymentNotificationTimestamp(paymentDate);

    let instructions = account?.payment_instructions || account?.paymentInstructions || '';
    instructions = typeof instructions === 'string' ? instructions.trim() : '';
    if (!instructions && account?.account_number) {
        instructions = `Fees should be paid to ${account.bank_name || account.bankName || 'Bank'} A/C ${account.account_number || account.accountNumber}${account.account_name || account.accountName ? ` (${account.account_name || account.accountName})` : ''}. Thank you.`;
    }

    const isCustomEnabled = account?.enable_custom_notification !== false && account?.enableCustomNotification !== false;
    const rawTemplate = account?.payment_notification_template || account?.paymentNotificationTemplate;
    let template = (isCustomEnabled && rawTemplate && typeof rawTemplate === 'string' && rawTemplate.trim())
        ? rawTemplate.trim()
        : DEFAULT_PAYMENT_NOTIFICATION_TEMPLATE;

    const rNo = String(receiptNumber || '').trim();
    const directReceiptUrl = rNo ? `https://eduai.co.ke/?receipt=${encodeURIComponent(rNo)}` : '';

    let message = template
        .replace(/\{student_name\}/gi, studentName)
        .replace(/\{adm_no\}/gi, admNo)
        .replace(/\{student\}/gi, admNo ? `${admNo} - ${studentName}` : studentName)
        .replace(/\{class_name\}/gi, className)
        .replace(/\{class\}/gi, className)
        .replace(/\{term\}/gi, termText)
        .replace(/\{academic_year\}/gi, currentYear)
        .replace(/\{year\}/gi, currentYear)
        .replace(/\{term_display\}/gi, `${currentYear} - ${termText}`)
        .replace(/\{charged\}/gi, chargedFormatted)
        .replace(/\{total_charged\}/gi, chargedFormatted)
        .replace(/\{billed\}/gi, chargedFormatted)
        .replace(/\{adjusted\}/gi, adjustedFormatted)
        .replace(/\{adjustments\}/gi, adjustedFormatted)
        .replace(/\{paid\}/gi, paidFormatted)
        .replace(/\{amount_paid\}/gi, paidFormatted)
        .replace(/\{amount\}/gi, paidFormatted)
        .replace(/\{balance\}/gi, balanceFormatted)
        .replace(/\{bal\}/gi, balanceFormatted)
        .replace(/\{timestamp\}/gi, timestampFormatted)
        .replace(/\{date\}/gi, timestampFormatted)
        .replace(/\{school_name\}/gi, institutionName)
        .replace(/\{institution_name\}/gi, institutionName)
        .replace(/\{payment_instructions\}/gi, instructions)
        .replace(/\{receipt_number\}/gi, receiptNumber || '')
        .replace(/\{receipt_no\}/gi, receiptNumber || '')
        .replace(/\{ref\}/gi, receiptNumber || '')
        .replace(/\{receipt_url\}/gi, directReceiptUrl)
        .replace(/\{receipt_link\}/gi, directReceiptUrl)
        .replace(/\{download_url\}/gi, directReceiptUrl)
        .replace(/\{short_url\}/gi, directReceiptUrl)
        .replace(/\{bank_name\}/gi, account?.bank_name || account?.bankName || '')
        .replace(/\{account_number\}/gi, account?.account_number || account?.accountNumber || '')
        .replace(/\{account_name\}/gi, account?.account_name || account?.accountName || '');

    return message.replace(/\n{3,}/g, '\n\n').trim();
};

const buildCandidateSmsGateways = (instConfig?: any, sysConfig?: any): any[] => {
    const list: any[] = [];
    const seen = new Set<string>();

    const push = (cfg: any, origin: string) => {
        if (!cfg) return;
        const provider = (cfg.provider || 'Zettatel').trim();
        const apiKey = String(cfg.apiKey || cfg.api_key || cfg.userId || cfg.user_id || cfg.username || cfg.accountId || cfg.account_id || '').trim();
        const apiSecret = String(cfg.apiSecret || cfg.api_secret || cfg.password || cfg.authToken || cfg.auth_token || cfg.token || '').trim();

        if (!apiKey && !apiSecret) return;

        const key = `${provider.toLowerCase()}:${apiKey}`;
        if (!seen.has(key)) {
            seen.add(key);
            list.push({ ...cfg, provider, _origin: origin });
        }
    };

    if (instConfig) {
        push(instConfig, 'Institution Primary Config');
        if (instConfig.sematimeConfig) push({ ...instConfig.sematimeConfig, provider: 'Sematime' }, 'Inst Sematime');
        if (instConfig.zettatelConfig) push({ ...instConfig.zettatelConfig, provider: 'Zettatel' }, 'Inst Zettatel');
        if (instConfig.advantaConfig) push({ ...instConfig.advantaConfig, provider: 'Advanta' }, 'Inst Advanta');
    }

    if (sysConfig) {
        push(sysConfig, 'System Global Config');
        if (sysConfig.sematimeConfig) push({ ...sysConfig.sematimeConfig, provider: 'Sematime' }, 'System Sematime');
        if (sysConfig.zettatelConfig) push({ ...sysConfig.zettatelConfig, provider: 'Zettatel' }, 'System Zettatel');
        if (sysConfig.advantaConfig) push({ ...sysConfig.advantaConfig, provider: 'Advanta' }, 'System Advanta');
    }

    if (process.env.SEMATIME_ACCOUNT_ID && (process.env.SEMATIME_AUTH_TOKEN || process.env.SEMATIME_API_KEY)) {
        push({
            provider: 'Sematime',
            accountId: process.env.SEMATIME_ACCOUNT_ID,
            authToken: process.env.SEMATIME_AUTH_TOKEN || process.env.SEMATIME_API_KEY,
            fromNumber: process.env.SEMATIME_SENDER_ID || 'EDUAI'
        }, 'Env Sematime');
    }

    if (process.env.ZETTATEL_USERID && process.env.ZETTATEL_PASSWORD) {
        push({
            provider: 'Zettatel',
            userId: process.env.ZETTATEL_USERID,
            password: process.env.ZETTATEL_PASSWORD,
            fromNumber: process.env.ZETTATEL_SENDER_ID || 'EDUAI'
        }, 'Env Zettatel');
    }

    if (process.env.AFRICASTALKING_API_KEY) {
        push({
            provider: 'AfricasTalking',
            username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
            apiKey: process.env.AFRICASTALKING_API_KEY,
            fromNumber: process.env.AFRICASTALKING_SENDER_ID || ''
        }, 'Env AfricaTalking');
    }

    return list;
};

const dispatchSmsNotificationWithCascade = async (
    candidates: any[],
    recipientPhone: string,
    messageText: string
): Promise<{ success: boolean; provider: string; rawResponse?: any; error?: string }> => {
    const cleanPhone = normalizePhone(recipientPhone);
    if (!cleanPhone || cleanPhone.length < 9) {
        return { success: false, provider: 'none', error: `Invalid phone number: ${recipientPhone}` };
    }

    let lastError = '';
    let lastResponse: any = null;

    for (const candidate of candidates) {
        const prov = (candidate.provider || 'Zettatel').trim();

        try {
            if (prov.toLowerCase() === 'sematime') {
                const accId = String(
                    candidate.accountId || candidate.account_id || candidate.userId || candidate.user_id ||
                    candidate.apiKey || candidate.api_key || candidate.username || ''
                ).trim();
                const authToken = String(
                    candidate.authToken || candidate.auth_token || candidate.apiSecret || candidate.api_secret ||
                    candidate.password || candidate.token || ''
                ).trim();

                if (!accId || !authToken) {
                    lastError = 'Sematime missing accountId or authToken';
                    continue;
                }

                let semaUrl = (candidate.baseUrl || candidate.api_url || '').trim();
                if (!semaUrl || !semaUrl.includes('/messages/single')) {
                    const domain = (semaUrl.includes('api.sematime.com') || semaUrl.includes('apis.sematime.com'))
                        ? semaUrl.replace(/\/+$/, '')
                        : 'https://apis.sematime.com/v1';
                    const cleanDomain = domain.includes('/v1') ? domain : `${domain}/v1`;
                    semaUrl = `${cleanDomain}/${accId}/messages/single`;
                }

                const semaPayload: any = {
                    text: messageText,
                    recipients: cleanPhone
                };

                const customSender = (candidate.fromNumber || candidate.senderId || candidate.senderid || '').trim();
                if (customSender && customSender !== 'EDUAI' && customSender !== 'SEMATIME' && customSender.toUpperCase() !== 'DEFAULT') {
                    semaPayload.senderId = customSender;
                }

                const semaHeaders: Record<string, string> = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'AuthToken': authToken
                };

                let sRes = await fetchWithTimeout(semaUrl, {
                    method: 'POST',
                    headers: semaHeaders,
                    body: JSON.stringify(semaPayload)
                }, 12000);

                let resRaw = await sRes.text();
                let resData: any;
                try { resData = JSON.parse(resRaw); } catch { resData = { raw: resRaw }; }

                // Auto-retry without senderId if rejected
                if ((!sRes.ok || (resData && (resData.response === 'error' || resData.status === 'error' || resData.error || resData.errorMessage))) && semaPayload.senderId) {
                    delete semaPayload.senderId;
                    sRes = await fetchWithTimeout(semaUrl, {
                        method: 'POST',
                        headers: semaHeaders,
                        body: JSON.stringify(semaPayload)
                    }, 12000);
                    resRaw = await sRes.text();
                    try { resData = JSON.parse(resRaw); } catch { resData = { raw: resRaw }; }
                }

                // Alternate domain retry if 404 or 5xx
                if (!sRes.ok && (sRes.status >= 500 || sRes.status === 404)) {
                    const altUrl = semaUrl.includes('apis.sematime.com')
                        ? semaUrl.replace('apis.sematime.com', 'api.sematime.com')
                        : semaUrl.replace('api.sematime.com', 'apis.sematime.com');
                    if (altUrl !== semaUrl) {
                        sRes = await fetchWithTimeout(altUrl, {
                            method: 'POST',
                            headers: semaHeaders,
                            body: JSON.stringify(semaPayload)
                        }, 12000);
                        resRaw = await sRes.text();
                        try { resData = JSON.parse(resRaw); } catch { resData = { raw: resRaw }; }
                    }
                }

                const isErr = !sRes.ok || (resData && (resData.response === 'error' || resData.status === 'error' || resData.error || resData.errorMessage));
                if (!isErr) {
                    return { success: true, provider: 'Sematime', rawResponse: resData };
                } else {
                    lastError = `Sematime error (${sRes.status}): ${resRaw.substring(0, 150)}`;
                    lastResponse = resData;
                }
            } else if (prov === 'AfricasTalking' || prov === "Africa's Talking") {
                const username = candidate.username || candidate.userId || 'sandbox';
                const apiKey = candidate.apiKey || candidate.apiSecret || candidate.authToken || '';
                if (!apiKey) {
                    lastError = "Africa's Talking missing apiKey";
                    continue;
                }

                const atUrl = (username === 'sandbox')
                    ? 'https://api.sandbox.africastalking.com/version1/messaging'
                    : 'https://api.africastalking.com/version1/messaging';

                const postData = new URLSearchParams();
                postData.append('username', username);
                postData.append('to', `+${cleanPhone}`);
                postData.append('message', messageText);
                if (candidate.fromNumber) {
                    postData.append('from', candidate.fromNumber);
                }

                const atRes = await fetchWithTimeout(atUrl, {
                    method: 'POST',
                    headers: {
                        'apiKey': apiKey,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: postData.toString()
                }, 12000);

                const resRaw = await atRes.text();
                let resData: any;
                try { resData = JSON.parse(resRaw); } catch { resData = { raw: resRaw }; }

                if (atRes.ok) {
                    return { success: true, provider: "Africa's Talking", rawResponse: resData };
                } else {
                    lastError = `Africa's Talking error (${atRes.status}): ${resRaw.substring(0, 150)}`;
                    lastResponse = resData;
                }
            } else if (prov.toLowerCase() === 'advanta' || prov.toLowerCase() === 'textsms') {
                const apiKey = candidate.apiKey || candidate.api_key || candidate.password || '';
                const partnerID = candidate.partnerId || candidate.partner_id || candidate.userId || candidate.user_id || '';
                const senderId = candidate.fromNumber || candidate.senderId || candidate.senderid || 'TEXTSMS';

                if (!apiKey || !partnerID) {
                    lastError = 'Advanta missing partnerID or apiKey';
                    continue;
                }

                const advUrl = candidate.baseUrl || candidate.api_url || 'https://quicksms.advantasms.com/api/services/sendsms/';
                const advRes = await fetchWithTimeout(advUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        apikey: apiKey,
                        partnerID: partnerID,
                        message: messageText,
                        shortcode: senderId,
                        mobile: cleanPhone
                    })
                }, 12000);

                const resRaw = await advRes.text();
                let resData: any;
                try { resData = JSON.parse(resRaw); } catch { resData = { raw: resRaw }; }

                if (advRes.ok) {
                    return { success: true, provider: 'Advanta', rawResponse: resData };
                } else {
                    lastError = `Advanta error (${advRes.status}): ${resRaw.substring(0, 150)}`;
                    lastResponse = resData;
                }
            } else {
                // Default: Zettatel / ABMIS / Generic Gateway
                const baseUrl = candidate.baseUrl || candidate.api_url || (prov === 'Zettatel' ? 'https://sms.zettatel.com/smsapi/send' : 'https://sms.abmis.co.ke/SMSApi/send');
                const userId = candidate.apiKey || candidate.api_key || candidate.username || candidate.userId || candidate.userid;
                const password = candidate.apiSecret || candidate.api_secret || candidate.password;

                if (!userId || !password) {
                    lastError = `${prov} missing userid or password`;
                    continue;
                }

                const smsParams = new URLSearchParams({
                    userid: userId,
                    password: password,
                    mobile: cleanPhone,
                    msg: messageText,
                    senderid: candidate.fromNumber || prov,
                    msgType: 'text',
                    output: 'json'
                });

                const finalUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${smsParams.toString()}`;
                const zRes = await fetchWithTimeout(finalUrl, { method: 'GET' }, 12000);
                const resRaw = await zRes.text();
                let resData: any;
                try { resData = JSON.parse(resRaw); } catch { resData = { raw: resRaw }; }

                if (zRes.ok) {
                    return { success: true, provider: prov, rawResponse: resData };
                } else {
                    lastError = `${prov} error (${zRes.status}): ${resRaw.substring(0, 150)}`;
                    lastResponse = resData;
                }
            }
        } catch (gatewayErr: any) {
            lastError = `${prov} exception: ${gatewayErr?.message || gatewayErr}`;
            console.warn(`[SMS Cascade] Failed attempt on provider ${prov}:`, gatewayErr?.message || gatewayErr);
        }
    }

    return { success: false, provider: 'none', error: lastError || 'All candidate SMS gateways failed', rawResponse: lastResponse };
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

// Recursive helper to extract M-Pesa receipt number from nested structures
const findMpesaReceipt = (obj: any): string => {
    if (!obj || typeof obj !== 'object') return '';
    
    // Check if standard key directly exists
    const directKeys = [
        'mpesaReceiptNumber', 'MpesaReceiptNumber', 'mpesareceiptnumber',
        'receiptNumber', 'ReceiptNumber', 'transactionId', 'TransactionID',
        'mpesaRef', 'MpesaRef', 'mpesaref', 'receipt', 'Receipt'
    ];
    for (const key of directKeys) {
        if (obj[key] && typeof obj[key] !== 'object') {
            const val = String(obj[key]).trim();
            if (val && !val.toLowerCase().includes('not provided') && !val.toLowerCase().includes('null') && !val.toLowerCase().includes('undefined')) {
                return val;
            }
        }
    }

    // Check if it's CallbackMetadata Item array
    if (obj.Item && Array.isArray(obj.Item)) {
        for (const item of obj.Item) {
            if (item && /mpesa.*receipt|receipt.*number/i.test(item.Name || item.Key || '')) {
                if (item.Value && typeof item.Value !== 'object') {
                    const val = String(item.Value).trim();
                    if (val) return val;
                }
            }
        }
    }

    // Check if it's ResultParameter array
    if (obj.ResultParameter) {
        const list = Array.isArray(obj.ResultParameter) ? obj.ResultParameter : [obj.ResultParameter];
        for (const p of list) {
            if (p && /mpesa.*receipt|receipt.*number|transactionId|mpesaref/i.test(p.Key || p.Name || '')) {
                if (p.Value && typeof p.Value !== 'object') {
                    const val = String(p.Value).trim();
                    if (val) return val;
                }
            }
        }
    }

    // Recurse into children
    for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
            const found = findMpesaReceipt(obj[key]);
            if (found) return found;
        }
    }

    return '';
};


/**
 * KCB STK Push Callback Handler
 * 
 * Used for receiving STK push callback responses from KCB Buni API.
 * Extracts M-Pesa receipt number (e.g. UEJG4LRTF) and updates transaction record.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    console.log('--- KCB STK Push Callback Received ---');
    console.log('Query:', JSON.stringify(req.query));
    console.log('Body:', JSON.stringify(req.body));
    
    let body = req.body || {};
    if (body && Buffer.isBuffer(body)) {
        body = body.toString('utf-8');
    }
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            console.error('[KCB STK] Failed to parse stringified body:', e);
            body = {};
        }
    }

    // Handle form-urlencoded pasting issues where the entire JSON string is received as a key with an empty value
    if (body && typeof body === 'object' && !Array.isArray(body)) {
        const keys = Object.keys(body);
        if (keys.length === 1 && (body[keys[0]] === '' || body[keys[0]] === undefined) && keys[0].trim().startsWith('{')) {
            try {
                body = JSON.parse(keys[0]);
            } catch (e) {
                console.error('[KCB STK] Failed to parse single key JSON body:', e);
            }
        }
    }

    if (typeof body !== 'object' || Array.isArray(body)) {
        body = {};
    }

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
        // Log the raw Callback
        const { error: logError } = await supabase.from('integration_logs').insert({
            provider: 'kcb_stk_callback',
            payload: body,
            status: 'received',
            created_at: new Date().toISOString()
        });

        if (logError) console.warn('[KCB STK] Failed to log STK Callback:', logError);

        // --- Parse KCB callback structure ---
        // KCB Buni format uses nested header + requestPayload.primaryData
        const header = body.header || {};
        const messageID = header.messageID || `MSG_${Date.now()}`;
        const originatorConversationID = header.originatorConversationID || header.conversationID || '';
        const primaryData = body.requestPayload?.primaryData || {};
        const businessKey = primaryData.businessKey || '';
        const stkCallback = body.Body?.stkCallback || {};

        // ResultCode / status: check multiple formats KCB may send
        let resultCode = String(
            body.ResultCode ?? body.resultCode ??
            body.ResponseCode ?? body.responseCode ??
            stkCallback.ResultCode ?? stkCallback.resultCode ??
            stkCallback.ResponseCode ?? stkCallback.responseCode ??
            body.Result?.ResultCode ?? body.Result?.ResponseCode ??
            primaryData.resultCode ?? primaryData.responseCode ??
            getParam(body, req.query, 'statusCode') ?? ''
        );
        // If it's a flat callback, default to successful transaction status '0'
        if (!resultCode && (getParam(body, req.query, 'transactionReference') || getParam(body, req.query, 'requestId'))) {
            resultCode = '0';
        }
        const resultDesc = body.ResultDesc || body.resultDesc || stkCallback.ResultDesc || body.Result?.ResultDesc || primaryData.resultDescription || '';

        // Checkout request ID - used to match the pending transaction
        const checkoutRequestId = 
            body.CheckoutRequestID ||
            body.checkoutRequestID ||
            body.checkoutRequestId ||
            stkCallback.CheckoutRequestID ||
            stkCallback.MerchantRequestID ||
            primaryData.checkoutRequestID ||
            originatorConversationID ||
            getParam(body, req.query, 'requestId') ||
            getParam(body, req.query, 'transactionReference') ||
            '';

        // ---- Extract M-Pesa receipt reference ----
        // KCB/Safaricom format 1: CallbackMetadata.Item array (root or nested under Body.stkCallback)
        let mpesaReceiptNumber = '';
        const callbackMetadata = body.CallbackMetadata || stkCallback.CallbackMetadata;
        if (callbackMetadata?.Item && Array.isArray(callbackMetadata.Item)) {
            for (const item of callbackMetadata.Item) {
                if (/mpesa.*receipt|receipt.*number/i.test(item.Name || item.Key || '')) {
                    mpesaReceiptNumber = String(item.Value || '');
                    break;
                }
            }
        }
        // KCB Buni format 2: ResultParameters.ResultParameter array (root or nested)
        const resultParams = body.ResultParameters || body.Result?.ResultParameters || stkCallback.ResultParameters;
        if (!mpesaReceiptNumber && resultParams?.ResultParameter) {
            const list = Array.isArray(resultParams.ResultParameter) ? resultParams.ResultParameter : [resultParams.ResultParameter];
            for (const p of list) {
                if (p && /mpesa.*receipt|receipt.*number|transactionId|mpesaref/i.test(p.Key || p.Name || '')) {
                    mpesaReceiptNumber = String(p.Value || '');
                    break;
                }
            }
        }
        // KCB Buni format 3: primaryData.mpesaReceiptNumber or businessKey or query param
        if (!mpesaReceiptNumber) {
            mpesaReceiptNumber =
                primaryData.mpesaReceiptNumber ||
                primaryData.MpesaReceiptNumber ||
                primaryData.transactionId ||
                body.MpesaReceiptNumber ||
                body.mpesaReceiptNumber ||
                businessKey ||
                getParam(body, req.query, 'transactionReference') ||
                '';
        }

        // Fallback: Deep recursive search in case the receipt is in a custom or differently nested field
        if (!mpesaReceiptNumber || mpesaReceiptNumber.toLowerCase().includes('not provided') || mpesaReceiptNumber.toLowerCase() === 'null') {
            const scanResult = findMpesaReceipt(body);
            if (scanResult) {
                mpesaReceiptNumber = scanResult;
            }
        }

        // ---- Extract Amount paid ----
        let callbackAmount = 0;
        if (callbackMetadata?.Item && Array.isArray(callbackMetadata.Item)) {
            for (const item of callbackMetadata.Item) {
                if (String(item.Name || item.Key || '').toLowerCase() === 'amount') {
                    callbackAmount = parseFloat(String(item.Value || '0'));
                    break;
                }
            }
        }
        if (callbackAmount <= 0 && resultParams?.ResultParameter) {
            const list = Array.isArray(resultParams.ResultParameter) ? resultParams.ResultParameter : [resultParams.ResultParameter];
            for (const p of list) {
                if (p && String(p.Key || p.Name || '').toLowerCase() === 'amount') {
                    callbackAmount = parseFloat(String(p.Value || '0'));
                    break;
                }
            }
        }
        if (callbackAmount <= 0) {
            const rawAmt = getParam(body, req.query, 'transactionAmount') || getParam(body, req.query, 'amount');
            if (rawAmt) {
                callbackAmount = parseFloat(rawAmt);
            }
        }

        console.log(`[KCB STK Callback] CheckoutRequestID: ${checkoutRequestId}`);
        console.log(`[KCB STK Callback] ResultCode: ${resultCode}`);
        console.log(`[KCB STK Callback] M-Pesa Receipt: ${mpesaReceiptNumber || '(not provided)'}`);
        console.log(`[KCB STK Callback] Callback Amount: ${callbackAmount}`);


        // --- Caller Authentication Check for Production Setups ---
        let resolvedInstitutionId = 'SYSTEM';
        let kcbConfig: any = {};
        let isProduction = false;

        if (checkoutRequestId) {
            const isMockCheckout = String(checkoutRequestId).toLowerCase().includes('mock') || 
                                   String(checkoutRequestId).toLowerCase().includes('test');
            
            if (!isMockCheckout) {
                const { data: transactionRecord } = await supabase
                    .from('mpesa_transactions')
                    .select('institution_id')
                    .eq('checkout_request_id', checkoutRequestId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (transactionRecord?.institution_id) {
                    resolvedInstitutionId = transactionRecord.institution_id;
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
                const webhookSecret = String(kcbConfig.webhookSecret || kcbConfig.webhook_secret || kcbConfig.webhookToken || '').trim();
                const requireWebhookAuth = kcbConfig.requireWebhookAuth === true || kcbConfig.require_webhook_auth === true;

                // Only enforce/check webhook auth if an institution has specifically configured a webhook token or secret
                if (webhookSecret && requireWebhookAuth) {
                    const rawAuthHeader = (req.headers.authorization || req.headers['x-api-key'] || req.headers['x-webhook-token'] || req.query.secret || '') as string;
                    const bearerToken = rawAuthHeader.startsWith('Bearer ') ? rawAuthHeader.substring(7).trim() : rawAuthHeader;
                    const expectedBasic = appKey && appSecret ? `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString('base64')}` : '';

                    const isMatch = rawAuthHeader === webhookSecret || 
                                    bearerToken === webhookSecret || 
                                    (expectedBasic && rawAuthHeader === expectedBasic) ||
                                    req.query.secret === webhookSecret;

                    if (!isMatch) {
                        console.warn(`[KCB STK Callback] Webhook authentication token mismatch. Received header did not match configured webhook secret.`);
                        await supabase.from('integration_logs').insert({
                            provider: 'kcb_stk_callback_auth_warn',
                            payload: {
                                warning: 'Configured webhook secret did not match incoming webhook request, but payload processing allowed.',
                                receivedHeader: rawAuthHeader ? '***' : '(none)',
                                checkoutRequestId
                            },
                            status: 'warning',
                            created_at: new Date().toISOString()
                        });
                    }
                }
            }
        }

        // Update the matching transaction if we have enough context
        if (checkoutRequestId) {
            const normCode = String(resultCode).trim().toUpperCase();
            const isSuccess = normCode === '0' || normCode === '00' || normCode === 'SUCCESS' || normCode === 'SUCCESSFUL' || normCode === '';
            const updateData: Record<string, any> = {
                status: isSuccess ? 'completed' : 'failed',
            };
            if (mpesaReceiptNumber) {
                updateData.transaction_id = mpesaReceiptNumber;
            }
            if (callbackAmount > 0) {
                updateData.amount = callbackAmount;
            }

            // Map flat KCB callback parameters if available in payload
            const requestId = getParam(body, req.query, 'requestId');
            const channelCode = getParam(body, req.query, 'channelCode');
            const currency = getParam(body, req.query, 'currency');
            const customerReference = getParam(body, req.query, 'customerReference');
            const customerName = getParam(body, req.query, 'customerName');
            const customerMobileNumber = getParam(body, req.query, 'customerMobileNumber');
            const balance = getParam(body, req.query, 'balance');
            const narration = getParam(body, req.query, 'narration');
            const creditAccountIdentifier = getParam(body, req.query, 'creditAccountIdenti;ier') || getParam(body, req.query, 'creditAccountIdentifier');
            const organizationShortCode = getParam(body, req.query, 'organizationShortCode');
            const tillNumber = getParam(body, req.query, 'tillNumber');

            if (requestId) updateData.request_id = requestId;
            if (channelCode) updateData.channel_code = channelCode;
            if (currency) updateData.currency = currency;
            if (customerReference) updateData.customer_reference = customerReference;
            if (customerName) updateData.customer_name = customerName;
            if (customerMobileNumber) updateData.customer_mobile_number = customerMobileNumber;
            if (balance) updateData.balance = parseFloat(balance || '0');
            if (narration) updateData.narration = narration;
            if (creditAccountIdentifier) updateData.credit_account_identifier = creditAccountIdentifier;
            if (organizationShortCode) updateData.organization_short_code = organizationShortCode;
            if (tillNumber) updateData.till_number = tillNumber;
            if (!updateData.provider) updateData.provider = 'kcb';

            const { error: updateErr } = await supabase
                .from('mpesa_transactions')
                .update(updateData)
                .eq('checkout_request_id', checkoutRequestId);

            if (updateErr) {
                console.warn('[KCB STK Callback] Could not update transaction:', updateErr.message);
            } else {
                console.log(`[KCB STK Callback] ✅ Transaction updated: ${isSuccess ? 'completed' : 'failed'}, receipt: ${mpesaReceiptNumber || 'N/A'}`);
                
                if (isSuccess) {
                    console.log(`[KCB STK Callback] Initiating post-payment reconciliation and SMS notification for checkoutRequestId: ${checkoutRequestId}`);
                    
                    // Fetch the transaction record
                    const { data: transaction } = await supabase
                        .from('mpesa_transactions')
                        .select('*')
                        .eq('checkout_request_id', checkoutRequestId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (transaction) {
                        const metadata = transaction.metadata || {};
                        const isReconciled = metadata.reconciled === true || metadata.reconciled === 'true';

                        if (!isReconciled) {
                            const instId = transaction.institution_id;
                            const amt = callbackAmount > 0 ? callbackAmount : (transaction.amount || 0);
                            const type = metadata.type;
                            
                            // Fetch system settings for SMS pricing/configs
                            let settings: any = {};
                            try {
                                const { data: sData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
                                if (sData?.data) settings = sData.data;
                            } catch (e) {
                                console.error('[KCB STK Callback] Failed to fetch settings:', e);
                            }

                            const invoicePrefix = (settings.global_invoice_prefix || settings.globalInvoicePrefix || 'INV-').trim();
                            const receiptPrefix = (settings.global_receipt_prefix || settings.globalReceiptPrefix || 'RCT-').trim();

                            // Fetch institution name & branding
                            let inst: any = null;
                            if (instId && instId !== 'SYSTEM' && instId !== 'GLOBAL') {
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
                                    console.log(`[KCB STK Callback - Reconcile] Adding ${unitsToCredit} units to ${instId}`);
                                    await supabase.rpc('increment_sms_balance', { 
                                        inst_id: instId || 'SYSTEM', 
                                        amount: unitsToCredit 
                                    });

                                    // Fetch updated balance
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
                                    invoice_number: `${invoicePrefix}SMS-${Date.now().toString().slice(-6)}`,
                                    institution_id: instId || 'SYSTEM',
                                    issue_date: new Date().toISOString().split('T')[0],
                                    due_date: new Date().toISOString().split('T')[0],
                                    total_amount: amt,
                                    status: 'paid',
                                    items: JSON.stringify([{
                                        description: `SMS Units Purchase - ${unitsToCredit} units (KCB)`,
                                        quantity: 1,
                                        unitPrice: amt / (unitsToCredit || 1),
                                        amount: amt
                                    }])
                                });

                                await supabase.from('receipts').insert({
                                    id: `rec_sms_${Date.now()}`,
                                    receipt_number: mpesaReceiptNumber || `${receiptPrefix}SMS-${Date.now().toString().slice(-6)}`,
                                    institution_id: instId || 'SYSTEM',
                                    invoice_id: invoiceId,
                                    amount_paid: amt,
                                    payment_date: new Date().toISOString().split('T')[0],
                                    payment_method: 'KCB STK',
                                    related_transaction_id: mpesaReceiptNumber || transaction.transaction_id || transaction.id
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
                                    invoice_number: `${invoicePrefix}SUB-${Date.now().toString().slice(-6)}`,
                                    institution_id: instId,
                                    issue_date: new Date().toISOString().split('T')[0],
                                    due_date: new Date().toISOString().split('T')[0],
                                    total_amount: amt,
                                    status: 'paid',
                                    items: JSON.stringify([{
                                        description: `${metadata.plan === 'yearly' ? 'Yearly' : 'Monthly'} Subscription (KCB)`,
                                        quantity: 1,
                                        unitPrice: amt,
                                        amount: amt
                                    }])
                                });

                                await supabase.from('receipts').insert({
                                    id: `rec_sub_${Date.now()}`,
                                    receipt_number: mpesaReceiptNumber || `${receiptPrefix}SUB-${Date.now().toString().slice(-6)}`,
                                    institution_id: instId,
                                    invoice_id: invoiceId,
                                    amount_paid: amt,
                                    payment_date: new Date().toISOString().split('T')[0],
                                    payment_method: 'KCB STK',
                                    related_transaction_id: mpesaReceiptNumber || transaction.transaction_id || transaction.id
                                });

                            } else if (type === 'student_admission' && metadata.student_id) {
                                console.log(`[KCB STK Callback] Processing student admission payment for student: ${metadata.student_id}`);
                                
                                // 1. Update student record in ds_students
                                await supabase
                                    .from('ds_students')
                                    .update({
                                        payment_status: 'paid',
                                        status: 'Enrolled',
                                        activation_date: new Date().toISOString()
                                    })
                                    .eq('id', metadata.student_id);

                                // 2. Fetch student details to get userId and email/phone for credentials
                                const { data: studentData } = await supabase
                                    .from('ds_students')
                                    .select('*')
                                    .eq('id', metadata.student_id)
                                    .maybeSingle();

                                if (studentData) {
                                    // Activate associated user profile
                                    if (studentData.user_id || studentData.userId) {
                                        const uid = studentData.user_id || studentData.userId;
                                        await supabase.from('users').update({ status: 'active' }).eq('id', uid);
                                    }

                                    // 3. Generate Invoice and Receipt for Student registration
                                    const invoiceId = `inv_stud_${Date.now()}`;
                                    const studentCode = studentData.admission_number || studentData.id.slice(-6).toUpperCase();
                                    const invoiceNumber = `${invoicePrefix}STUD-${studentCode}`;
                                    
                                    await supabase.from('invoices').insert({
                                        id: invoiceId,
                                        invoice_number: invoiceNumber,
                                        institution_id: instId || 'SYSTEM',
                                        issue_date: new Date().toISOString().split('T')[0],
                                        due_date: new Date().toISOString().split('T')[0],
                                        total_amount: amt,
                                        status: 'paid',
                                        items: JSON.stringify([{
                                            description: `Driving School Student Registration Fee for ${studentData.full_name} (${studentCode}) (KCB)`,
                                            quantity: 1,
                                            unitPrice: amt,
                                            amount: amt
                                        }])
                                    });

                                    await supabase.from('receipts').insert({
                                        id: `rec_stud_${Date.now()}`,
                                        receipt_number: mpesaReceiptNumber || `${receiptPrefix}STUD-${Date.now().toString().slice(-6)}`,
                                        institution_id: instId || 'SYSTEM',
                                        invoice_id: invoiceId,
                                        amount_paid: amt,
                                        payment_date: new Date().toISOString().split('T')[0],
                                        payment_method: 'KCB STK',
                                        related_transaction_id: mpesaReceiptNumber || transaction.transaction_id || transaction.id
                                    });

                                    // 4. Send Welcome Credentials SMS
                                    const smsConfig = settings.sms_config;
                                    const studentPhone = studentData.phone || transaction.phone_number;
                                    if (smsConfig && studentPhone && studentPhone.trim().length >= 9) {
                                        try {
                                            const { data: inst } = await supabase.from('institutions').select('name').eq('id', instId).maybeSingle();
                                            const portalTitle = (inst?.name && !inst.name.toLowerCase().includes('law firm')) ? inst.name : 'Driving School';
                                            const portalUrl = `https://${req.headers['x-forwarded-host'] || req.headers.host || 'eduai.co.ke'}`;
                                            const smsMsg = `Payment Verified via KCB! Welcome to ${portalTitle}. Your Driving School account is now active.\nPortal: ${portalUrl}\nUser ID: ${studentPhone}`;
                                            
                                            let phone = studentPhone.replace(/[^\d]/g, '');
                                            if (phone.startsWith('2540')) phone = '254' + phone.substring(4);
                                            else if (phone.startsWith('0')) phone = '254' + phone.substring(1);
                                            else if (phone.length === 9) phone = '254' + phone;

                                            const provider = smsConfig.provider || 'Zettatel';
                                            const baseUrl = smsConfig.baseUrl || smsConfig.api_url || (provider === 'Zettatel' ? 'https://sms.zettatel.com/smsapi/send' : 'https://sms.abmis.co.ke/SMSApi/send');
                                            const smsParams = new URLSearchParams({
                                                userid: smsConfig.apiKey || smsConfig.api_key || smsConfig.username || smsConfig.userId,
                                                password: smsConfig.apiSecret || smsConfig.api_secret || smsConfig.password,
                                                mobile: phone,
                                                msg: smsMsg,
                                                senderid: smsConfig.fromNumber || provider,
                                                msgType: 'text',
                                                output: 'json'
                                            });

                                            const finalUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${smsParams.toString()}`;
                                            await fetchWithTimeout(finalUrl, { method: 'GET' }, 15000);
                                        } catch (smsErr) {
                                            console.error("[KCB STK Callback] Failed to dispatch welcome credentials SMS:", smsErr);
                                        }
                                    }
                                }
                            } else if (type === 'tenant_postpaid_bill' && metadata.bill_id) {
                                console.log(`[KCB STK Callback] Processing postpaid monthly bill payment: ${metadata.bill_id} for institution: ${instId}`);

                                // 1. Mark postpaid bill as paid in tenant_bills
                                await supabase
                                    .from('tenant_bills')
                                    .update({ status: 'paid' })
                                    .eq('id', metadata.bill_id);

                                // 2. Unsuspend the institution
                                await supabase
                                    .from('institutions')
                                    .update({ is_suspended_for_billing: false })
                                    .eq('id', instId);

                                // 3. Create invoice & receipt for Postpaid bill
                                const invoiceId = `inv_bill_${Date.now()}`;
                                await supabase.from('invoices').insert({
                                    id: invoiceId,
                                    invoice_number: `${invoicePrefix}BILL-${Date.now().toString().slice(-6)}`,
                                    institution_id: instId || 'SYSTEM',
                                    issue_date: new Date().toISOString().split('T')[0],
                                    due_date: new Date().toISOString().split('T')[0],
                                    total_amount: amt,
                                    status: 'paid',
                                    items: JSON.stringify([{
                                        description: `Consolidated Monthly Student Registration Bill settlement (KCB)`,
                                        quantity: 1,
                                        unitPrice: amt,
                                        amount: amt
                                    }])
                                });

                                await supabase.from('receipts').insert({
                                    id: `rec_bill_${Date.now()}`,
                                    receipt_number: mpesaReceiptNumber || `${receiptPrefix}BILL-${Date.now().toString().slice(-6)}`,
                                    institution_id: instId || 'SYSTEM',
                                    invoice_id: invoiceId,
                                    amount_paid: amt,
                                    payment_date: new Date().toISOString().split('T')[0],
                                    payment_method: 'KCB STK',
                                    related_transaction_id: mpesaReceiptNumber || transaction.transaction_id || transaction.id
                                });
                            } else if (type === 'invoice' || type === 'fee_payment' || metadata.studentId) {
                                const invId = metadata.invoiceId;
                                let invoiceObj: any = null;
                                if (invId) {
                                    const { data: invFound } = await supabase.from('invoices').select('*').eq('id', invId).maybeSingle();
                                    invoiceObj = invFound;
                                }

                                if (invoiceObj) {
                                    const existingPaid = Number(invoiceObj.paid_amount || invoiceObj.paidAmount || 0);
                                    const invTotal = Number(invoiceObj.total_amount || invoiceObj.amount || 0);
                                    const newPaid = existingPaid + amt;
                                    const newStatus = (newPaid >= invTotal && invTotal > 0) ? 'paid' : (newPaid > 0 ? 'partial' : 'pending');
                                    await supabase.from('invoices').update({
                                        paid_amount: newPaid,
                                        status: newStatus,
                                        updated_at: new Date().toISOString()
                                    }).eq('id', invoiceObj.id);
                                }

                                const receiptNum = mpesaReceiptNumber || `${receiptPrefix}INV-${Date.now().toString().slice(-6)}`;
                                const receiptId = `rec_inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                                await supabase.from('receipts').insert({
                                    id: receiptId,
                                    receipt_number: receiptNum,
                                    institution_id: instId || 'SYSTEM',
                                    invoice_id: invoiceObj?.id || metadata.invoiceId || null,
                                    student_id: metadata.studentId || invoiceObj?.student_id || null,
                                    amount_paid: amt,
                                    payment_date: new Date().toISOString().split('T')[0],
                                    payment_method: 'KCB STK',
                                    related_transaction_id: mpesaReceiptNumber || transaction.transaction_id || transaction.id
                                });

                                if (metadata.requesterId) {
                                    await supabase.from('app_notifications').insert({
                                        id: `ntf_inv_${Date.now()}`,
                                        user_id: metadata.requesterId,
                                        message: `Invoice payment of KES ${amt} successful via KCB STK! Ref: ${mpesaReceiptNumber || transaction.id}.`,
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
                                        payment_method: 'KCB STK',
                                        transaction_reference: mpesaReceiptNumber || transaction.id,
                                        payment_date: new Date().toISOString().split('T')[0],
                                        receipt_number: `REC-${Date.now().toString().slice(-6)}`,
                                        received_by: 'KCB STK Integration',
                                        notes: `Payment received via KCB STK push. Ref: ${mpesaReceiptNumber || transaction.id}`,
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
                            } else if (type === 'retail_pos_sale' || type === 'retail_sale') {
                                const storeId = metadata.storeId;
                                const mpesaRef = mpesaReceiptNumber || transaction.transaction_id || transaction.id;
                                const checkoutReqId = checkoutRequestId || transaction.checkout_request_id;

                                // Check if already recorded in retail_sales by payment ref or checkoutRequestId
                                let existingSale = null;
                                if (checkoutReqId) {
                                    const { data: saleByCrid } = await supabase
                                        .from('retail_sales')
                                        .select('id')
                                        .eq('metadata->>kcbCheckoutRequestId', checkoutReqId)
                                        .maybeSingle();
                                    existingSale = saleByCrid;
                                }
                                if (!existingSale && mpesaRef) {
                                    const { data: saleByRef } = await supabase
                                        .from('retail_sales')
                                        .select('id')
                                        .eq('metadata->>mpesaReceiptNumber', mpesaRef)
                                        .maybeSingle();
                                    existingSale = saleByRef;
                                }

                                if (!existingSale) {
                                    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                                    const saleData: any = {
                                        id: saleId,
                                        institution_id: instId || resolvedInstitutionId || 'SYSTEM',
                                        store_id: storeId || null,
                                        agent_id: metadata.agentId || null,
                                        customer_id: metadata.customerId || null,
                                        customer_name: metadata.customerName || transaction.payer_name || 'Retail Customer',
                                        customer_phone: metadata.customerPhone || transaction.phone_number || '',
                                        customer_email: metadata.customerEmail || null,
                                        total_amount: amt,
                                        payment_method: 'kcb_stk',
                                        items: metadata.items || [],
                                        metadata: {
                                            kcbCheckoutRequestId: checkoutReqId,
                                            mpesaReceiptNumber: mpesaRef,
                                            paymentGateway: 'kcb_buni_open_banking',
                                            carrier: metadata.carrier,
                                            carrierFee: metadata.carrierFee,
                                            carrierName: metadata.carrierName,
                                            carrierDestination: metadata.carrierDestination
                                        },
                                        created_at: new Date().toISOString()
                                    };

                                    await supabase.from('retail_sales').insert(saleData);

                                    // Deduct stock for inventory items
                                    if (Array.isArray(metadata.items)) {
                                        for (const itm of metadata.items) {
                                            if (itm.itemId && itm.quantity > 0 && itm.source !== 'cafe') {
                                                try {
                                                    const { data: itemData } = await supabase
                                                        .from('retail_inventory_items')
                                                        .select('quantity')
                                                        .eq('id', itm.itemId)
                                                        .maybeSingle();
                                                    if (itemData) {
                                                        const newQty = Math.max(0, (Number(itemData.quantity) || 0) - Number(itm.quantity));
                                                        await supabase
                                                            .from('retail_inventory_items')
                                                            .update({ quantity: newQty, last_updated: new Date().toISOString() })
                                                            .eq('id', itm.itemId);
                                                    }
                                                } catch (stockErr) {
                                                    console.warn('[KCB STK Callback Retail] Stock update warning:', stockErr);
                                                }
                                            }

                                            // Record commission if agent sold above base price
                                            if (metadata.agentId && itm.itemId && itm.unitPrice && itm.basePrice && itm.unitPrice > itm.basePrice) {
                                                try {
                                                    await supabase.from('retail_commissions_ledger').insert({
                                                        id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                                        institution_id: instId || resolvedInstitutionId || 'SYSTEM',
                                                        agent_id: metadata.agentId,
                                                        sale_id: saleId,
                                                        item_id: itm.itemId,
                                                        base_price: itm.basePrice,
                                                        sold_price: itm.unitPrice,
                                                        commission_amount: (itm.unitPrice - itm.basePrice) * itm.quantity,
                                                        is_paid: false,
                                                        created_at: new Date().toISOString()
                                                    });
                                                } catch (commErr) {
                                                    console.warn('[KCB STK Callback Retail] Commission insert warning:', commErr);
                                                }
                                            }
                                        }
                                    }

                                    // Insert Receipt
                                    const receiptId = `rec_retail_${Date.now()}`;
                                    await supabase.from('receipts').insert({
                                        id: receiptId,
                                        receipt_number: mpesaRef ? `${receiptPrefix}${mpesaRef}` : `${receiptPrefix}RET-${Date.now().toString().slice(-6)}`,
                                        institution_id: instId || resolvedInstitutionId || 'SYSTEM',
                                        amount_paid: amt,
                                        payment_date: new Date().toISOString().split('T')[0],
                                        payment_method: 'KCB STK',
                                        related_transaction_id: mpesaRef || transaction.id
                                    });
                                }

                                if (metadata.requesterId || metadata.agentId) {
                                    await supabase.from('app_notifications').insert({
                                        id: `ntf_retail_${Date.now()}`,
                                        user_id: metadata.requesterId || metadata.agentId,
                                        message: `Retail sale of KES ${amt} verified successfully via KCB STK! Ref: ${mpesaRef}`,
                                        type: 'success',
                                        is_read: false,
                                        timestamp: new Date().toISOString()
                                    });
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
                                        payment_method: 'KCB STK',
                                        transaction_reference: mpesaReceiptNumber || transaction.id,
                                        payment_date: new Date().toISOString(),
                                        receipt_number: `REC-${Date.now().toString().slice(-6)}`,
                                        received_by: 'KCB STK Integration'
                                    });

                                    if (metadata.requesterId) {
                                        await supabase.from('app_notifications').insert({
                                            id: `ntf_ds_${Date.now()}`,
                                            user_id: metadata.requesterId,
                                            message: `Driving School invoice payment successful via KCB STK! Ref: ${mpesaReceiptNumber || transaction.id}.`,
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
                                        payment_method: 'KCB STK',
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
                                            message: `Rent payment of KES ${amt} successful via KCB STK! Ref: ${mpesaReceiptNumber || transaction.id}.`,
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
                                const phone = metadata.phone || transaction.phone_number || body.phoneNumber || '';
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
                                            mpesa_reference: mpesaReceiptNumber || transaction.transaction_id || ''
                                        })
                                        .eq('id', participant.id);

                                    await supabase
                                        .from('event_pledges')
                                        .update({ payment_status: 'paid' })
                                        .eq('participant_id', participant.id);
                                    
                                    console.log(`[Reconcile STK] Updated existing event participant ${participant.id} and pledges to paid.`);
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
                                            mpesa_reference: mpesaReceiptNumber || transaction.transaction_id || '',
                                            emergency_contact_name: emergencyContactName,
                                            emergency_contact_phone: emergencyContactPhone,
                                            status: 'registered',
                                            created_at: new Date().toISOString()
                                        });

                                    if (insertPartErr) {
                                        console.error('[Reconcile STK] Failed to insert event participant:', insertPartErr.message);
                                    } else {
                                        console.log(`[Reconcile STK] Created new event participant ${participantId}, BIB: ${newBib}`);
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
                                                console.error('[Reconcile STK] Failed to insert event pledge:', insertPledgeErr.message);
                                            } else {
                                                console.log(`[Reconcile STK] Created new event pledge ${pledgeId} for ${initialPledge}`);
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
                                const isReconciledNow = metadata.reconciled === true || metadata.reconciled === 'true' || type === 'invoice' || type === 'car_invoice' || type === 'car_sales_invoices' || type === 'ds_invoice' || type === 'pm_invoice' || type === 'event_registration' || type === 'retail_pos_sale' || type === 'retail_sale';
                                
                                // Delete any temporary duplicate records created by database triggers under the raw reference ID
                                const rawRef = mpesaReceiptNumber || transaction.transaction_id;
                                if (rawRef) {
                                    await supabase
                                        .from('bank_transactions')
                                        .delete()
                                        .eq('id', rawRef);
                                }

                                const { error: bankTxnErr } = await supabase.from('bank_transactions').upsert({
                                    id: transaction.id,
                                    institution_id: instId || resolvedInstitutionId,
                                    amount: amt,
                                    transaction_date: transaction.created_at || transaction.timestamp || new Date().toISOString(),
                                    reference: mpesaReceiptNumber || transaction.transaction_id || '',
                                    sender_name: metadata.payerName || transaction.payer_name || 'External Deposit',
                                    bank_name: 'KCB',
                                    status: isReconciledNow ? 'reconciled' : 'unreconciled',
                                    linked_invoice_id: metadata.invoiceId || null,
                                    reconciled_at: isReconciledNow ? new Date().toISOString() : null,
                                    reconciled_by: isReconciledNow ? 'KCB STK Callback' : null,
                                    created_at: transaction.created_at || new Date().toISOString(),
                                    payload: {
                                        ...body,
                                        phoneNumber: transaction.phone_number || metadata.payerPhoneNumber || metadata.phone || '',
                                        customerMobileNumber: transaction.phone_number || metadata.payerPhoneNumber || metadata.phone || '',
                                        payerPhoneNumber: transaction.phone_number || metadata.payerPhoneNumber || metadata.phone || '',
                                        admissionNumber: metadata.admissionNumber || metadata.admission_number || metadata.admNo || transaction.customer_reference || '',
                                        studentAdm: metadata.admissionNumber || metadata.admission_number || metadata.admNo || transaction.customer_reference || ''
                                    }
                                });
                                if (bankTxnErr) console.error('[KCB STK Callback] Failed to write to bank_transactions:', bankTxnErr);
                            } catch (bankErr) {
                                console.error('[KCB STK Callback] Exception writing to bank_transactions:', bankErr);
                            }

                            // --- Send SMS Notification with updated balance & custom finance template ---
                            const instSmsConfig = inst?.sms_config || inst?.smsConfig;
                            const sysSmsConfig = settings.sms_config || settings.smsConfig;
                            const payerPhone = metadata.payerPhoneNumber || transaction.phone_number || body.phoneNumber;
                            const isFinancePayment = type === 'invoice' || type === 'fee_payment' || Boolean(metadata.studentId) || Boolean(metadata.invoiceId);

                            if (isFinancePayment) {
                                try {
                                    const targetInstId = instId || resolvedInstitutionId || transaction.institution_id;

                                    // 1. Resolve school bank account
                                    let receivingBankAccount: any = null;
                                    const creditAccountIdentifier = metadata.creditAccountIdentifier || metadata.accountNumber;
                                    const tillNumber = metadata.tillNumber || metadata.shortCode;
                                    const organizationShortCode = metadata.organizationShortCode || metadata.shortcode;
                                    const accFilters: string[] = [];
                                    if (creditAccountIdentifier) accFilters.push(`account_number.eq.${creditAccountIdentifier}`);
                                    if (tillNumber) accFilters.push(`account_number.eq.${tillNumber}`);
                                    if (organizationShortCode) accFilters.push(`account_number.eq.${organizationShortCode}`);

                                    if (accFilters.length > 0 && targetInstId) {
                                        const { data: matchedAcc } = await supabase
                                            .from('school_bank_accounts')
                                            .select('*')
                                            .eq('institution_id', targetInstId)
                                            .or(accFilters.join(','))
                                            .maybeSingle();
                                        receivingBankAccount = matchedAcc;
                                    }

                                    if (!receivingBankAccount && targetInstId) {
                                        const { data: primaryAcc } = await supabase
                                            .from('school_bank_accounts')
                                            .select('*')
                                            .eq('institution_id', targetInstId)
                                            .order('created_at', { ascending: true })
                                            .limit(1)
                                            .maybeSingle();
                                        receivingBankAccount = primaryAcc;
                                    }

                                    // 2. Resolve Student Details
                                    const studentId = metadata.studentId || metadata.student_id;
                                    let studentUser: any = null;
                                    let studentEnrollment: any = null;

                                    if (studentId) {
                                        const { data: u } = await supabase.from('users').select('*').eq('id', studentId).maybeSingle();
                                        studentUser = u;
                                        const { data: enr } = await supabase.from('student_enrollments').select('*').or(`user_id.eq.${studentId},student_id.eq.${studentId},id.eq.${studentId}`).maybeSingle();
                                        studentEnrollment = enr;
                                    }

                                    const admLookup = metadata.admissionNumber || metadata.admission_number || metadata.admNo;
                                    if (admLookup) {
                                        if (!studentEnrollment) {
                                            const { data: enrByAdm } = await supabase.from('student_enrollments').select('*').or(`admission_number.eq.${admLookup},metadata->>admissionNumber.eq.${admLookup},metadata->>admNo.eq.${admLookup}`).maybeSingle();
                                            if (enrByAdm) studentEnrollment = enrByAdm;
                                        }
                                        if (!studentUser) {
                                            const { data: userByAdm } = await supabase.from('users').select('*').or(`admission_number.eq.${admLookup},metadata->>admissionNumber.eq.${admLookup},metadata->>admNo.eq.${admLookup}`).maybeSingle();
                                            if (userByAdm) studentUser = userByAdm;
                                        }
                                    }

                                    if (!studentUser && studentEnrollment) {
                                        const linkedUid = studentEnrollment.student_id || studentEnrollment.user_id || studentEnrollment.id;
                                        if (linkedUid) {
                                            const { data: linkedUser } = await supabase.from('users').select('*').eq('id', linkedUid).maybeSingle();
                                            if (linkedUser) studentUser = linkedUser;
                                        }
                                    }

                                    const studentName = studentUser?.name || studentUser?.fullName || studentEnrollment?.student_name || studentEnrollment?.name || metadata.studentName || 'Student';
                                    const studentAdm = studentUser?.admission_number || studentEnrollment?.admission_number || metadata.admissionNumber || metadata.admission_number || '';
                                    const resolvedStudentId = studentId || studentUser?.id || studentEnrollment?.student_id || studentEnrollment?.user_id;

                                    // 3. Compute student fee totals & balance
                                    let totalCharged = 0;
                                    let totalPaid = 0;
                                    if (resolvedStudentId && targetInstId) {
                                        const { data: invRows } = await supabase
                                            .from('invoices')
                                            .select('total_amount, amount')
                                            .eq('institution_id', targetInstId)
                                            .eq('student_id', resolvedStudentId);
                                        totalCharged = (invRows || []).reduce((sum: number, i: any) => sum + Number(i.total_amount || i.amount || 0), 0);

                                        const { data: recRows } = await supabase
                                            .from('receipts')
                                            .select('amount_paid')
                                            .eq('institution_id', targetInstId)
                                            .eq('student_id', resolvedStudentId);
                                        totalPaid = (recRows || []).reduce((sum: number, r: any) => sum + Number(r.amount_paid || 0), 0);
                                    }
                                    const currentBalance = Math.max(0, totalCharged - totalPaid);

                                    // 4. Resolve parent phone
                                    const targetParentPhone = 
                                        studentUser?.parent_phone || 
                                        studentUser?.parentPhone ||
                                        studentEnrollment?.parent_phone || 
                                        studentEnrollment?.parentPhone ||
                                        studentEnrollment?.metadata?.parentPhone || 
                                        studentEnrollment?.metadata?.parent_phone ||
                                        metadata.parentPhone || 
                                        metadata.parent_phone ||
                                        payerPhone || 
                                        transaction.phone_number || 
                                        studentUser?.phone;

                                    // 5. Compose personalized Finance SMS message
                                    const financeSms = buildCustomPaymentNotification({
                                        account: receivingBankAccount,
                                        student: {
                                            name: studentName,
                                            admissionNumber: studentAdm
                                        },
                                        enrollment: studentEnrollment || {
                                            className: metadata.className || studentUser?.grade || studentUser?.class
                                        },
                                        paymentAmount: amt,
                                        totalCharged: totalCharged,
                                        totalAdjusted: 0,
                                        currentBalance: currentBalance,
                                        paymentDate: transaction.created_at || new Date(),
                                        institutionName: inst?.name || 'School',
                                        receiptNumber: mpesaReceiptNumber || transaction.id
                                    });

                                    // 6. Multi-gateway cascading dispatch
                                    const candidateGateways = buildCandidateSmsGateways(instSmsConfig, sysSmsConfig);

                                    if (targetParentPhone && candidateGateways.length > 0) {
                                        console.log(`[KCB STK - Finance SMS] Dispatching to ${targetParentPhone} for student ${studentName} (${studentAdm}). Available gateways: ${candidateGateways.map(c => c.provider).join(', ')}`);
                                        const dispatchRes = await dispatchSmsNotificationWithCascade(candidateGateways, targetParentPhone, financeSms);

                                        if (dispatchRes.success) {
                                            console.log(`[KCB STK - Finance SMS] Delivered successfully to ${targetParentPhone} via ${dispatchRes.provider}`);
                                            if (targetInstId && targetInstId !== 'SYSTEM' && targetInstId !== 'GLOBAL') {
                                                await supabase.rpc('decrement_sms_balance', { inst_id: targetInstId, amount: 1 });
                                            }
                                            try {
                                                await supabase.from('sms_logs').insert({
                                                    id: `smslog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                                                    institution_id: (targetInstId && targetInstId !== 'SYSTEM' && targetInstId !== 'GLOBAL') ? targetInstId : null,
                                                    sender_id: null,
                                                    recipient: normalizePhone(targetParentPhone),
                                                    message: financeSms,
                                                    units: 1,
                                                    status: 'sent',
                                                    provider: dispatchRes.provider,
                                                    gateway_response: {
                                                        via: 'KCB STK Callback Finance Notification',
                                                        receiptNumber: mpesaReceiptNumber || transaction.id,
                                                        amount: amt,
                                                        raw: dispatchRes.rawResponse
                                                    }
                                                });
                                            } catch (logErr) {
                                                console.warn('[KCB STK Callback] SMS Log insert failed:', logErr);
                                            }
                                        } else {
                                            console.error(`[KCB STK - Finance SMS] Failed to dispatch SMS to ${targetParentPhone}:`, dispatchRes.error);
                                        }
                                    } else if (!targetParentPhone) {
                                        console.warn(`[KCB STK - Finance SMS] No valid parent phone number resolved for student ${studentName}`);
                                    } else {
                                        console.warn(`[KCB STK - Finance SMS] No active SMS gateways configured for institution or system.`);
                                    }
                                } catch (finSmsErr) {
                                    console.error('[KCB STK Callback] Finance payment SMS dispatch exception:', finSmsErr);
                                }
                            } else if (payerPhone) {
                                let smsMessage = '';
                                if (type === 'sms' || type === 'sms_topup') {
                                    smsMessage = `Payment successful via KCB! ${unitsToCredit.toLocaleString()} SMS units added. New Balance: ${newBalance.toLocaleString()} units. Ref: ${mpesaReceiptNumber || transaction.id}. Thank you for choosing Eduai Automation.`;
                                } else {
                                    smsMessage = `Payment confirmed via KCB! KES ${amt} received. Ref: ${mpesaReceiptNumber || transaction.id}. Thank you for choosing Eduai Automation.`;
                                }

                                try {
                                    const candidateGateways = buildCandidateSmsGateways(instSmsConfig, sysSmsConfig);
                                    if (candidateGateways.length > 0) {
                                        await dispatchSmsNotificationWithCascade(candidateGateways, payerPhone, smsMessage);
                                    }
                                } catch (smsErr) {
                                    console.error('[KCB STK Callback] Failed to send SMS confirmation:', smsErr);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Acknowledge receipt to KCB strictly following the expected KCBIPNResponse schema
        // Acknowledge receipt to KCB strictly following the expected schema
        return res.status(200).json({
            transactionID: mpesaReceiptNumber || businessKey || `TXN_${Date.now()}`,
            statusCode: 0,
            statusMessage: "Notification received"
        });

    } catch (err: any) {
        console.error('[KCB STK Fatal]', err);
        return res.status(500).json({ message: 'Internal processing error' });
    }
}
