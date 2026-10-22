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

// --- Custom Payment Notification & SMS Helper ---
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

    const studentName = student?.name || 'Student';
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
        .replace(/\{date_time\}/gi, timestampFormatted)
        .replace(/\{balance_timestamp\}/gi, `${balanceFormatted} as at ${timestampFormatted}`)
        .replace(/\{receipt_number\}/gi, receiptNumber)
        .replace(/\{receipt_no\}/gi, receiptNumber)
        .replace(/\{receipt_url\}/gi, directReceiptUrl)
        .replace(/\{receipt_link\}/gi, directReceiptUrl)
        .replace(/\{download_url\}/gi, directReceiptUrl)
        .replace(/\{short_url\}/gi, directReceiptUrl)
        .replace(/\{payment_instructions\}/gi, instructions)
        .replace(/\{account_instructions\}/gi, instructions)
        .replace(/\{instructions\}/gi, instructions)
        .replace(/\{bank_name\}/gi, account?.bank_name || account?.bankName || '')
        .replace(/\{account_number\}/gi, account?.account_number || account?.accountNumber || '')
        .replace(/\{account_name\}/gi, account?.account_name || account?.accountName || '')
        .replace(/\{school_name\}/gi, institutionName);

    if (!template.includes('{payment_instructions}') && !template.includes('{instructions}') && instructions) {
        message = `${message}\n\n${instructions}`;
    }

    return message.trim();
};

const buildCandidateSmsGateways = (instConfig: any, sysConfig: any): any[] => {
    const list: any[] = [];
    const seen = new Set<string>();

    const push = (cfg: any, label: string) => {
        if (!cfg || typeof cfg !== 'object') return;
        const prov = (cfg.provider || 'Zettatel').trim();
        const key = cfg.apiKey || cfg.api_key || cfg.username || cfg.userId || cfg.user_id || cfg.accountId || cfg.account_id || cfg.partnerID || '';
        const secret = cfg.apiSecret || cfg.api_secret || cfg.password || cfg.authToken || cfg.auth_token || cfg.token || cfg.apikey || '';
        if (!key && !secret && !cfg.baseUrl && !cfg.api_url) return;

        const hash = `${prov.toLowerCase()}:${key}:${secret.substring(0, 4)}:${cfg.baseUrl || cfg.api_url || ''}`;
        if (seen.has(hash)) return;
        seen.add(hash);
        list.push({ ...cfg, provider: prov, _source: label });
    };

    if (instConfig) {
        push(instConfig, 'Institution Config');
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

                const atUrl = username === 'sandbox'
                    ? 'https://api.sandbox.africastalking.com/version1/messaging'
                    : 'https://api.africastalking.com/version1/messaging';

                const bodyParams = new URLSearchParams();
                bodyParams.append('username', username);
                bodyParams.append('to', `+${cleanPhone}`);
                bodyParams.append('message', messageText);
                if (candidate.fromNumber) bodyParams.append('from', candidate.fromNumber);

                const atRes = await fetchWithTimeout(atUrl, {
                    method: 'POST',
                    headers: {
                        'apiKey': apiKey,
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: bodyParams.toString()
                }, 12000);

                const atRaw = await atRes.text();
                let atData: any;
                try { atData = JSON.parse(atRaw); } catch { atData = { raw: atRaw }; }

                const isErr = !atRes.ok || (atData && atData.SMSMessageData && atData.SMSMessageData.Recipients && atData.SMSMessageData.Recipients.some((r: any) => r.status && r.status.toLowerCase().includes('failed')));
                if (!isErr) {
                    return { success: true, provider: "Africa's Talking", rawResponse: atData };
                } else {
                    lastError = `Africa's Talking error: ${atRaw.substring(0, 150)}`;
                    lastResponse = atData;
                }
            } else if (prov === 'Advanta' || prov === 'TextSMS') {
                const partnerID = candidate.apiKey || candidate.partnerId || candidate.userId || '';
                const apikey = candidate.apiSecret || candidate.apiKey || candidate.password || '';
                const shortcode = candidate.fromNumber || candidate.senderid || 'TextSMS';
                const advUrl = candidate.baseUrl || candidate.api_url || 'https://quicksms.advantasms.com/api/services/sendsms/';

                const advRes = await fetchWithTimeout(advUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        partnerID,
                        apikey,
                        mobile: cleanPhone,
                        message: messageText,
                        shortcode
                    })
                }, 12000);

                const advRaw = await advRes.text();
                const isErr = !advRes.ok || advRaw.toLowerCase().includes('error') || advRaw.toLowerCase().includes('invalid');
                if (!isErr) {
                    return { success: true, provider: 'Advanta', rawResponse: advRaw };
                } else {
                    lastError = `Advanta error: ${advRaw.substring(0, 150)}`;
                    lastResponse = advRaw;
                }
            } else {
                // Zettatel / ABMIS / HTTP GET Gateway
                const baseUrl = candidate.baseUrl || candidate.api_url || (prov === 'Zettatel' ? 'https://sms.zettatel.com/smsapi/send' : 'https://sms.abmis.co.ke/SMSApi/send');
                const smsParams = new URLSearchParams({
                    userid: candidate.apiKey || candidate.api_key || candidate.username || candidate.userId,
                    password: candidate.apiSecret || candidate.api_secret || candidate.password,
                    mobile: cleanPhone,
                    msg: messageText,
                    senderid: candidate.fromNumber || prov,
                    msgType: 'text',
                    output: 'json'
                });

                const finalUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${smsParams.toString()}`;
                const zRes = await fetchWithTimeout(finalUrl, { method: 'GET' }, 12000);
                const zRaw = await zRes.text();
                const isErr = !zRes.ok || zRaw.toLowerCase().includes('failed') || zRaw.toLowerCase().includes('error');
                if (!isErr) {
                    return { success: true, provider: prov, rawResponse: zRaw };
                } else {
                    lastError = `${prov} error: ${zRaw.substring(0, 150)}`;
                    lastResponse = zRaw;
                }
            }
        } catch (gatewayErr: any) {
            lastError = `${prov} exception: ${gatewayErr?.message || gatewayErr}`;
            console.warn(`[IPN SMS Cascade] ${prov} failed:`, lastError);
        }
    }

    return {
        success: false,
        provider: candidates[0]?.provider || 'unknown',
        error: lastError || 'All SMS gateways failed',
        rawResponse: lastResponse
    };
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
                        params.forEach((value, key) => {
                            parsedBody[key] = value;
                        });
                        body = parsedBody;
                    }
                } else {
                    // Try parsing as form urlencoded
                    const params = new URLSearchParams(rawBody);
                    const parsedBody: any = {};
                    let hasKeys = false;
                    params.forEach((value, key) => {
                        parsedBody[key] = value;
                        hasKeys = true;
                    });
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
        // Support both KCB nested structure and flat structure
        const header = body.header || {};
        const primaryData = body.requestPayload?.primaryData || {};
        const additionalData = body.requestPayload?.additionalData || {};
        const notificationData = additionalData.notificationData || {};

        // Flat format key fields resolved via robust getParam with comprehensive nested fallbacks
        const transactionReference = getParam(body, req.query, 'transactionReference') ||
                                     getParam(body, req.query, 'transID') ||
                                     getParam(body, req.query, 'transId') ||
                                     getParam(body, req.query, 'TransID') ||
                                     getParam(body, req.query, 'mpesaReceiptNumber') ||
                                     getParam(body, req.query, 'MpesaReceiptNumber') ||
                                     getParam(body, req.query, 'receiptNumber') ||
                                     getParam(body, req.query, 'ReceiptNumber') ||
                                     getParam(body, req.query, 'reference') ||
                                     getParam(body, req.query, 'retrievalRefNo') ||
                                     getParam(body, req.query, 'retrievalReferenceNumber') ||
                                     getParam(body, req.query, 'checkoutRequestId') ||
                                     getParam(body, req.query, 'checkoutRequestID') ||
                                     getParam(body, req.query, 'thirdPartyTransID') ||
                                     primaryData.checkoutRequestID ||
                                     primaryData.checkoutRequestId ||
                                     primaryData.transactionReference ||
                                     primaryData.transID ||
                                     primaryData.transId ||
                                     primaryData.mpesaReceiptNumber ||
                                     notificationData.transactionID ||
                                     notificationData.transID ||
                                     notificationData.transId ||
                                     notificationData.mpesaReceiptNumber ||
                                     notificationData.retrievalRefNo ||
                                     '';

        const requestId = getParam(body, req.query, 'requestId') ||
                          header.messageID ||
                          '';

        const customerReference = getParam(body, req.query, 'customerReference') ||
                                  getParam(body, req.query, 'billRefNumber') ||
                                  getParam(body, req.query, 'BillRefNumber') ||
                                  getParam(body, req.query, 'billReferenceNumber') ||
                                  getParam(body, req.query, 'accountReference') ||
                                  getParam(body, req.query, 'accountNumber') ||
                                  getParam(body, req.query, 'accountNo') ||
                                  getParam(body, req.query, 'businessKey') ||
                                  primaryData.businessKey ||
                                  primaryData.customerReference ||
                                  notificationData.accountReference ||
                                  notificationData.customerReference ||
                                  notificationData.billReferenceNumber ||
                                  '';

        // Parse compound references (e.g. "8145955-201" -> ShortCode: "8145955", ADM: "201")
        let parsedAdmissionNumber = '';
        let compoundPaybillPrefix = '';
        if (customerReference) {
            const compoundMatch = customerReference.match(/^([0-9A-Za-z]{4,10})[\-_\/#\s:]+([A-Za-z0-9\/-]+)$/i);
            if (compoundMatch) {
                compoundPaybillPrefix = compoundMatch[1].trim();
                parsedAdmissionNumber = compoundMatch[2].trim();
            } else if (customerReference.includes('-')) {
                const parts = customerReference.split('-');
                parsedAdmissionNumber = parts[parts.length - 1].trim();
                compoundPaybillPrefix = parts[0].trim();
            } else {
                const prefixMatch = customerReference.match(/(?:ADM|ACC|STU|STUDENT|NO)[\s\-_#:\/.]*([0-9A-Za-z\/-]+)$/i);
                if (prefixMatch && prefixMatch[1]) {
                    parsedAdmissionNumber = prefixMatch[1].trim();
                } else {
                    parsedAdmissionNumber = customerReference;
                }
            }
        }

        const creditAccountIdentifier = getParam(body, req.query, 'creditAccountIdentifier') ||
                                        getParam(body, req.query, 'creditAccountIdenti;ier') ||
                                        primaryData.creditAccountIdentifier ||
                                        primaryData['creditAccountIdenti;ier'] ||
                                        '';

        const customerMobileNumber = getParam(body, req.query, 'customerMobileNumber') ||
                                     getParam(body, req.query, 'phoneNumber') ||
                                     notificationData.debitMSISDN ||
                                     '';

        const rawCustomerName = getParam(body, req.query, 'customerName') ||
                                getParam(body, req.query, 'payerName') ||
                                getParam(body, req.query, 'senderName') ||
                                getParam(body, req.query, 'clientName') ||
                                getParam(body, req.query, 'debitorReference') ||
                                getParam(body, req.query, 'beneficiaryName') ||
                                `${getParam(body, req.query, 'firstName') || getParam(body, req.query, 'FirstName') || ''} ${getParam(body, req.query, 'lastName') || getParam(body, req.query, 'LastName') || ''}`.trim() ||
                                `${notificationData.firstName || ''} ${notificationData.lastName || ''}`.trim() ||
                                notificationData.customerName ||
                                notificationData.payerName ||
                                primaryData.customerName ||
                                '';
        let customerName = (rawCustomerName && !/^(customer|null|none|undefined|bank depositor)$/i.test(rawCustomerName)) ? rawCustomerName : '';

        const transactionAmount = getParam(body, req.query, 'transactionAmount') ||
                                  getParam(body, req.query, 'amount') ||
                                  notificationData.transactionAmt ||
                                  notificationData.transactionAmount ||
                                  notificationData.amount ||
                                  primaryData.transactionAmount ||
                                  '';

        const channelCode = getParam(body, req.query, 'channelCode') || '';
        
        const rawTimestamp = getParam(body, req.query, 'timestamp') ||
                             primaryData.timestamp ||
                             notificationData.transactionDate ||
                             '';

        let timestamp = rawTimestamp;
        if (rawTimestamp && /^\d{14}$/.test(rawTimestamp)) {
            const y = rawTimestamp.substring(0, 4);
            const m = rawTimestamp.substring(4, 6);
            const d = rawTimestamp.substring(6, 8);
            const h = rawTimestamp.substring(8, 10);
            const min = rawTimestamp.substring(10, 12);
            const s = rawTimestamp.substring(12, 14);
            timestamp = `${y}-${m}-${d}T${h}:${min}:${s}Z`;
        } else if (rawTimestamp && /^\d{8}$/.test(rawTimestamp)) {
            const y = rawTimestamp.substring(0, 4);
            const m = rawTimestamp.substring(4, 6);
            const d = rawTimestamp.substring(6, 8);
            timestamp = `${y}-${m}-${d}T00:00:00Z`;
        }

        const currency = getParam(body, req.query, 'currency') || '';
        const balance = getParam(body, req.query, 'balance') || '';
        const narration = getParam(body, req.query, 'narration') || '';
        
        const organizationShortCode = getParam(body, req.query, 'organizationShortCode') ||
                                      getParam(body, req.query, 'shortCode') ||
                                      getParam(body, req.query, 'short_code') ||
                                      getParam(body, req.query, 'paybill') ||
                                      primaryData.organizationShortCode ||
                                      primaryData.shortCode ||
                                      primaryData.short_code ||
                                      primaryData.paybill ||
                                      compoundPaybillPrefix ||
                                      '';

        const tillNumber = getParam(body, req.query, 'tillNumber') ||
                           getParam(body, req.query, 'till_number') ||
                           primaryData.tillNumber ||
                           primaryData.till_number ||
                           '';

        const messageID = header.messageID || requestId || `MSG_${Date.now()}`;
        const originatorConversationID = header.originatorConversationID || header.conversationID || requestId || '';
        const businessKey = primaryData.businessKey || customerReference || '';
        const referenceCode = (customerReference || narration || businessKey || '').trim();

        // Prioritize real alphanumeric transaction code (e.g. UJ1F48QRBS) over generic timestamp fallback
        const transactionID = transactionReference || notificationData.transactionID || businessKey || `KCB_${Date.now()}`;
        const amount = parseFloat(transactionAmount || notificationData.transactionAmt || notificationData.amount || notificationData.transactionAmount || '0');
        const phone = customerMobileNumber || notificationData.debitMSISDN || '';
        let payerName = customerName || `${notificationData.firstName || ''} ${notificationData.lastName || ''}`.trim() || 'Parent / Depositor';

        // Construct normalized flat payload as requested
        const normalizedPayload = {
            balance: balance || "0.00",
            currency: currency || "KES",
            narration: narration || "Transfer",
            requestId: requestId || "",
            timestamp: timestamp || "",
            tillNumber: tillNumber || "Not Provided",
            channelCode: channelCode || "100",
            customerName: customerName || "",
            customerReference: customerReference || "",
            transactionAmount: transactionAmount || "",
            customerMobileNumber: customerMobileNumber || "",
            phoneNumber: customerMobileNumber || phone || "",
            payerPhoneNumber: customerMobileNumber || phone || "",
            admissionNumber: parsedAdmissionNumber || customerReference || "",
            studentAdm: parsedAdmissionNumber || customerReference || "",
            transactionReference: transactionReference || transactionID || "",
            organizationShortCode: organizationShortCode || "",
            creditAccountIdentifier: creditAccountIdentifier || ""
        };

        // Log the raw IPN in the requested flat format
        const { error: logError } = await supabase.from('integration_logs').insert({
            provider: 'kcb_ipn',
            payload: normalizedPayload,
            status: 'received',
            created_at: new Date().toISOString()
        });

        if (logError) console.warn('[KCB IPN] Failed to log IPN:', logError);

        // 1. Locate matching transaction
        let transaction: any = null;
        if (transactionID) {
            const { data: txnById } = await supabase
                .from('mpesa_transactions')
                .select('*')
                .eq('transaction_id', transactionID)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (txnById) transaction = txnById;
        }

        const lookupKey = businessKey || originatorConversationID || '';
        if (!transaction && lookupKey) {
            const { data: txnByCheckout } = await supabase
                .from('mpesa_transactions')
                .select('*')
                .eq('checkout_request_id', lookupKey)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (txnByCheckout) transaction = txnByCheckout;
        }

        if (!transaction && requestId) {
            const { data: txnByReq } = await supabase
                .from('mpesa_transactions')
                .select('*')
                .eq('request_id', requestId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (txnByReq) transaction = txnByReq;
        }

        if (!transaction && transactionReference && transactionReference !== transactionID) {
            const { data: txnByRef } = await supabase
                .from('mpesa_transactions')
                .select('*')
                .eq('transaction_id', transactionReference)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (txnByRef) transaction = txnByRef;
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
                .select('id, kcb_config, mpesa_config')
                .or(`id.eq.${creditAccountIdentifier},institution_code.eq.${creditAccountIdentifier}`)
                .maybeSingle();
            if (instData) {
                resolvedInstitutionId = instData.id;
                kcbConfig = instData.kcb_config || {};
            } else {
                // Search in kcb_config and mpesa_config JSON properties for a match
                const { data: instList } = await supabase
                    .from('institutions')
                    .select('id, kcb_config, mpesa_config');
                if (instList && instList.length > 0) {
                    const found = instList.find(i => {
                        const cfg = i.kcb_config || {};
                        const mCfg = i.mpesa_config || {};
                        return String(cfg.shortCode || cfg.short_code || '').trim() === creditAccountIdentifier.trim() ||
                               String(cfg.tillNumber || cfg.till_number || '').trim() === creditAccountIdentifier.trim() ||
                               String(cfg.companyCode || cfg.company_code || '').trim() === creditAccountIdentifier.trim() ||
                               String(cfg.creditAccountIdentifier || cfg.credit_account_identifier || '').trim() === creditAccountIdentifier.trim() ||
                               String(cfg.accountNumber || cfg.account_number || '').trim() === creditAccountIdentifier.trim() ||
                               String(cfg.bank_account || cfg.bankAccount || '').trim() === creditAccountIdentifier.trim() ||
                               String(mCfg.paybillNumber || mCfg.paybill_number || '').trim() === creditAccountIdentifier.trim();
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
                .select('id, kcb_config, mpesa_config')
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
                .select('id, kcb_config, mpesa_config');
            if (instList && instList.length > 0) {
                const found = instList.find(i => {
                    const cfg = i.kcb_config || {};
                    const mCfg = i.mpesa_config || {};
                    const sc = String(cfg.shortCode || cfg.short_code || '').trim();
                    const tn = String(cfg.tillNumber || cfg.till_number || '').trim();
                    const cc = String(cfg.companyCode || cfg.company_code || '').trim();
                    const osc = String(cfg.organizationShortCode || cfg.organization_short_code || '').trim();
                    const mPaybill = String(mCfg.paybillNumber || mCfg.paybill_number || '').trim();

                    // Prioritize matching tillNumber if present
                    if (tillNumber) {
                        const payloadTill = String(tillNumber).trim();
                        if (tn === payloadTill || sc === payloadTill || mPaybill === payloadTill) return true;
                    }

                    // Fallback to matching organizationShortCode
                    if (organizationShortCode) {
                        const payloadOsc = String(organizationShortCode).trim();
                        if (osc === payloadOsc || sc === payloadOsc || tn === payloadOsc || cc === payloadOsc || mPaybill === payloadOsc) return true;
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
                console.warn(`[KCB IPN] Webhook authentication token mismatch. Received header did not match configured webhook secret.`);
                await supabase.from('integration_logs').insert({
                    provider: 'kcb_ipn_auth_warn',
                    payload: {
                        warning: 'Configured webhook secret did not match incoming webhook request, but payload processing allowed.',
                        receivedHeader: rawAuthHeader ? '***' : '(none)',
                        transactionReference
                    },
                    status: 'warning',
                    created_at: new Date().toISOString()
                });
            }
        }

        // 2. If no transaction, check if customerReference or businessKey corresponds to invoice or institution (C2B Paybill fallback)
        let inst: any = null;
        let invoice: any = null;
        let matchUser: any = null;
        let matchEnrollment: any = null;

        if (!transaction && amount > 0) {
            // Check if customerReference or narration is an invoice number or admission number
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
                        try {
                            const { data: regMatch } = await supabase
                                .from('car_sales_invoices')
                                .select('*')
                                .ilike('registration_number', referenceCode)
                                .maybeSingle();
                            carInvoiceData = regMatch;
                        } catch {
                            // Column registration_number might not exist yet
                        }
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

                // Fallback 3: Try matching student admission number in users table or student_enrollments table
                if (!invoice) {
                    const candidateAdms = new Set<string>();
                    if (referenceCode) candidateAdms.add(referenceCode.trim());
                    if (parsedAdmissionNumber) candidateAdms.add(parsedAdmissionNumber.trim());
                    
                    // Suffix matching (e.g. "8145955-201" -> "201", "ADM-002" -> "002", "2024/001" -> "001")
                    if (referenceCode.includes('-') || referenceCode.includes('/') || referenceCode.includes(' ')) {
                        const parts = referenceCode.split(/[-/\s:]+/).map(p => p.trim()).filter(Boolean);
                        if (parts.length > 1) {
                            candidateAdms.add(parts[parts.length - 1]);
                        }
                    }

                    // Candidate phones (last 9 digits)
                    const cleanPhoneDigits = (customerMobileNumber || phone || referenceCode || '').replace(/\D/g, '').slice(-9);
                    const targetScopeInstId = inst?.id || resolvedInstitutionId || null;

                    // A. Check student_enrollments table by admission number
                    for (const adm of Array.from(candidateAdms)) {
                        if (matchUser) break;
                        let q = supabase.from('student_enrollments').select('*');
                        if (targetScopeInstId) q = q.eq('institution_id', targetScopeInstId);
                        
                        const { data: enrList } = await q.or(`admission_number.ilike.${adm},admission_number.ilike.%-${adm},admission_number.ilike.%/${adm},metadata->>admissionNumber.ilike.${adm},metadata->>admNo.ilike.${adm}`).limit(2);
                        if (enrList && enrList.length > 0) {
                            const enrFound = enrList[0];
                            matchEnrollment = enrFound;
                            matchUser = {
                                id: enrFound.student_id || enrFound.user_id || enrFound.id,
                                institution_id: enrFound.institution_id,
                                name: enrFound.student_name || enrFound.name,
                                parent_name: enrFound.parent_name || enrFound.metadata?.parentName,
                                parent_phone: enrFound.parent_phone || enrFound.metadata?.parentPhone,
                                phone: enrFound.phone || enrFound.metadata?.phone,
                                admission_number: enrFound.admission_number || adm,
                                class_name: enrFound.class_name || enrFound.grade
                            };
                            break;
                        }
                    }

                    // B. Check users table by admission number
                    if (!matchUser) {
                        for (const adm of Array.from(candidateAdms)) {
                            if (matchUser) break;
                            let q = supabase.from('users').select('id, institution_id, name, parent_name, parent_phone, phone, admission_number, class_name');
                            if (targetScopeInstId) q = q.eq('institution_id', targetScopeInstId);
                            
                            const { data: userList } = await q.or(`admission_number.ilike.${adm},admission_number.ilike.%-${adm},admission_number.ilike.%/${adm},metadata->>admissionNumber.ilike.${adm}`).limit(2);
                            if (userList && userList.length > 0) {
                                matchUser = userList[0];
                                break;
                            }
                        }
                    }

                    // C. Fallback: Check student_enrollments by parent phone
                    if (!matchUser && cleanPhoneDigits.length >= 9) {
                        let q = supabase.from('student_enrollments').select('*');
                        if (targetScopeInstId) q = q.eq('institution_id', targetScopeInstId);
                        const { data: enrByPhone } = await q.or(`parent_phone.ilike.%${cleanPhoneDigits},phone.ilike.%${cleanPhoneDigits},metadata->>parentPhone.ilike.%${cleanPhoneDigits}`).limit(1);
                        if (enrByPhone && enrByPhone.length > 0) {
                            const enrFound = enrByPhone[0];
                            matchEnrollment = enrFound;
                            matchUser = {
                                id: enrFound.student_id || enrFound.user_id || enrFound.id,
                                institution_id: enrFound.institution_id,
                                name: enrFound.student_name || enrFound.name,
                                parent_name: enrFound.parent_name || enrFound.metadata?.parentName,
                                parent_phone: enrFound.parent_phone || enrFound.metadata?.parentPhone,
                                phone: enrFound.phone || enrFound.metadata?.phone,
                                admission_number: enrFound.admission_number || '',
                                class_name: enrFound.class_name || enrFound.grade
                            };
                        }
                    }

                    // D. Fallback: Check users by parent phone
                    if (!matchUser && cleanPhoneDigits.length >= 9) {
                        let q = supabase.from('users').select('id, institution_id, name, parent_name, parent_phone, phone, admission_number, class_name');
                        if (targetScopeInstId) q = q.eq('institution_id', targetScopeInstId);
                        const { data: userByPhone } = await q.or(`parent_phone.ilike.%${cleanPhoneDigits},phone.ilike.%${cleanPhoneDigits}`).limit(1);
                        if (userByPhone && userByPhone.length > 0) {
                            matchUser = userByPhone[0];
                        }
                    }

                    if (matchUser) {
                        const { data: instData } = await supabase
                            .from('institutions')
                            .select('*')
                            .eq('id', matchUser.institution_id)
                            .maybeSingle();
                        inst = instData;
                        if (!customerName || customerName === 'Parent / Depositor') {
                            customerName = matchUser.parent_name || matchUser.name;
                            payerName = customerName;
                        }

                        if (inst) {
                            // Find pending or partially paid invoice for this student
                            const { data: oldestStd } = await supabase
                                .from('invoices')
                                .select('*')
                                .eq('student_id', matchUser.id)
                                .in('status', ['pending', 'partial', 'unpaid', 'issued'])
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
                                    .in('status', ['Pending', 'Partially Paid', 'Unpaid'])
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
                                            .in('status', ['Pending', 'Unpaid'])
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
                    amount,
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
                    if (invoice.student_id) txnMetadata.studentId = invoice.student_id;
                    if (matchUser?.admission_number || parsedAdmissionNumber) {
                        txnMetadata.admissionNumber = matchUser?.admission_number || parsedAdmissionNumber;
                    }
                    if (matchUser?.name) txnMetadata.studentName = matchUser.name;
                    if (matchUser?.parent_phone) txnMetadata.parentPhone = matchUser.parent_phone;
                    if (matchUser?.class_name) txnMetadata.className = matchUser.class_name;
                } else if (matchUser || matchEnrollment) {
                    // School fees payment for matched student without pre-existing invoice
                    txnMetadata.type = 'invoice';
                    txnMetadata.studentId = matchUser?.id || matchEnrollment?.student_id || matchEnrollment?.user_id || matchEnrollment?.id;
                    txnMetadata.admissionNumber = matchUser?.admission_number || matchEnrollment?.admission_number || parsedAdmissionNumber || referenceCode;
                    txnMetadata.studentName = matchUser?.name || matchEnrollment?.student_name || matchEnrollment?.name;
                    txnMetadata.className = matchEnrollment?.class_name || matchEnrollment?.grade || matchUser?.class_name;
                    txnMetadata.parentPhone = matchUser?.parent_phone || matchEnrollment?.parent_phone || matchEnrollment?.metadata?.parentPhone;
                } else {
                    // Bank feed payment with no matched invoice — do NOT assume SMS top-up.
                    // Classifying as 'bank_feed' ensures reconciliation only marks the transaction
                    // as completed without incorrectly crediting the institution's SMS balance.
                    txnMetadata.type = 'bank_feed';
                }

                const isPendingNarration = /chq|mobi|transfer|cash\s+deposit/i.test(narration || '');
                const initialStatus = isPendingNarration ? 'pending' : 'completed';

                const { data: newTxn, error: insertErr } = await supabase.from('mpesa_transactions').insert({
                    id: `txn_${Date.now()}`,
                    transaction_id: transactionID,
                    checkout_request_id: transactionID,
                    institution_id: inst.id,
                    amount: amount,
                    phone_number: phone,
                    payer_name: payerName,
                    status: initialStatus,
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
                }).select().maybeSingle();

                if (!insertErr && newTxn) {
                    transaction = newTxn;
                } else if (insertErr && (insertErr.code === '23505' || String(insertErr.message || '').includes('duplicate key') || String(insertErr.details || '').includes('already exists'))) {
                    console.log(`[KCB IPN] Transaction ${transactionID} already exists in mpesa_transactions (duplicate key). Fetching existing record.`);
                    const { data: existingTxn } = await supabase
                        .from('mpesa_transactions')
                        .select('*')
                        .or(`transaction_id.eq.${transactionID},checkout_request_id.eq.${transactionID}`)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (existingTxn) {
                        transaction = existingTxn;
                    }
                } else {
                    console.error('[KCB IPN] Failed to create transaction on the fly:', insertErr);
                }
            }
        }

        // 3. Process reconciliation and notifications if transaction is active and completed
        if (transaction) {
            // Update transaction to completed if it was pending and not a pending narration type
            const isPendingNarration = /chq|mobi|transfer|cash\s+deposit/i.test(transaction.narration || narration || '');
            if (transaction.status === 'pending' && !isPendingNarration) {
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

                const invoicePrefix = (settings.global_invoice_prefix || settings.globalInvoicePrefix || 'INV-').trim();
                const receiptPrefix = (settings.global_receipt_prefix || settings.globalReceiptPrefix || 'RCT-').trim();

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
                        invoice_number: `${invoicePrefix}SMS-${Date.now().toString().slice(-6)}`,
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
                        receipt_number: transactionID || `${receiptPrefix}SMS-${Date.now().toString().slice(-6)}`,
                        institution_id: instId || 'SYSTEM',
                        invoice_id: invoiceId,
                        amount_paid: amt,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'KCB IPN',
                        related_transaction_id: transactionReference || transactionID || transaction.transaction_id || transaction.id
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
                            description: `${metadata.plan === 'yearly' ? 'Yearly' : 'Monthly'} Subscription (KCB IPN)`,
                            quantity: 1,
                            unitPrice: amt,
                            amount: amt
                        }])
                    });

                    await supabase.from('receipts').insert({
                        id: `rec_sub_${Date.now()}`,
                        receipt_number: transactionID || `${receiptPrefix}SUB-${Date.now().toString().slice(-6)}`,
                        institution_id: instId,
                        invoice_id: invoiceId,
                        amount_paid: amt,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'KCB IPN',
                        related_transaction_id: transactionReference || transactionID || transaction.transaction_id || transaction.id
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
                } else if (type === 'student_admission' && metadata.student_id) {
                    console.log(`[KCB IPN] Processing student admission payment for student: ${metadata.student_id}`);
                    
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
                                description: `Driving School Student Registration Fee for ${studentData.full_name} (${studentCode}) (KCB C2B)`,
                                quantity: 1,
                                unitPrice: amt,
                                amount: amt
                            }])
                        });

                        await supabase.from('receipts').insert({
                            id: `rec_stud_${Date.now()}`,
                            receipt_number: transactionID || `${receiptPrefix}STUD-${Date.now().toString().slice(-6)}`,
                            institution_id: instId || 'SYSTEM',
                            invoice_id: invoiceId,
                            amount_paid: amt,
                            payment_date: new Date().toISOString().split('T')[0],
                            payment_method: 'KCB IPN',
                            related_transaction_id: transactionReference || transactionID || transaction.transaction_id || transaction.id
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
                                await fetch(finalUrl, { method: 'GET' });
                            } catch (smsErr) {
                                console.error("[KCB IPN] Failed to dispatch welcome credentials SMS:", smsErr);
                            }
                        }
                    }
                } else if (type === 'tenant_postpaid_bill' && metadata.bill_id) {
                    console.log(`[KCB IPN] Processing postpaid monthly bill payment: ${metadata.bill_id} for institution: ${instId}`);

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
                            description: `Consolidated Monthly Student Registration Bill settlement (KCB C2B)`,
                            quantity: 1,
                            unitPrice: amt,
                            amount: amt
                        }])
                    });

                    await supabase.from('receipts').insert({
                        id: `rec_bill_${Date.now()}`,
                        receipt_number: transactionID || `${receiptPrefix}BILL-${Date.now().toString().slice(-6)}`,
                        institution_id: instId || 'SYSTEM',
                        invoice_id: invoiceId,
                        amount_paid: amt,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'KCB IPN',
                        related_transaction_id: transactionReference || transactionID || transaction.transaction_id || transaction.id
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
                    } else if (metadata.studentId) {
                        // Headless FIFO allocation across open invoices for this student
                        const { data: openInvs } = await supabase
                            .from('invoices')
                            .select('*')
                            .eq('student_id', metadata.studentId)
                            .in('status', ['pending', 'partial', 'unpaid', 'issued'])
                            .order('due_date', { ascending: true });
                        if (openInvs && openInvs.length > 0) {
                            let unallocated = amt;
                            for (const inv of openInvs) {
                                if (unallocated <= 0) break;
                                const curPaid = Number(inv.paid_amount || 0);
                                const tot = Number(inv.total_amount || inv.amount || 0);
                                const due = Math.max(0, tot - curPaid);
                                const alloc = Math.min(unallocated, due);
                                const nextPaid = curPaid + alloc;
                                const nextStatus = nextPaid >= tot ? 'paid' : (nextPaid > 0 ? 'partial' : 'pending');
                                await supabase.from('invoices').update({
                                    paid_amount: nextPaid,
                                    status: nextStatus,
                                    updated_at: new Date().toISOString()
                                }).eq('id', inv.id);
                                if (!invoiceObj) invoiceObj = inv;
                                unallocated -= alloc;
                            }
                        }
                    }

                    const targetInstId = instId || resolvedInstitutionId || 'SYSTEM';
                    const studentAdm = metadata.admissionNumber || parsedAdmissionNumber || referenceCode || '';
                    const studentName = metadata.studentName || payerName || 'Student';
                    const receiptNum = transactionReference || transactionID || `${receiptPrefix}INV-${Date.now().toString().slice(-6)}`;
                    const receiptId = `rec_inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                    await supabase.from('receipts').insert({
                        id: receiptId,
                        receipt_number: receiptNum,
                        institution_id: targetInstId,
                        invoice_id: invoiceObj?.id || metadata.invoiceId || null,
                        student_id: metadata.studentId || invoiceObj?.student_id || null,
                        student_name: studentName,
                        admission_number: studentAdm,
                        amount_paid: amt,
                        payment_date: (timestamp ? timestamp.split('T')[0] : null) || new Date().toISOString().split('T')[0],
                        payment_method: 'KCB IPN',
                        paid_for: 'School Fees',
                        related_transaction_id: transactionReference || transactionID || transaction.transaction_id || transaction.id,
                        remarks: `Automated headless reconciliation via KCB IPN (Ref: ${transactionReference || transactionID})`
                    });

                    if (metadata.requesterId) {
                        await supabase.from('app_notifications').insert({
                            id: `ntf_inv_${Date.now()}`,
                            user_id: metadata.requesterId,
                            message: `Invoice payment of KES ${amt} successful via KCB! Ref: ${transactionID}.`,
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
                } else if (type === 'retail_pos_sale' || type === 'retail_sale') {
                    const saleId = metadata.saleId || `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                    const storeId = metadata.storeId || transaction.institution_id || instId;
                    const customerName = metadata.customerName || metadata.payerName || payerName || 'Walk-in Customer';
                    const customerPhone = metadata.customerPhone || transaction.phone_number || '';
                    const items = Array.isArray(metadata.items) ? metadata.items : [];
                    const agentId = metadata.agentId || metadata.requesterId || null;

                    // Deduplication check: see if a sale already exists with this ID or transaction reference
                    const { data: existingSale } = await supabase
                        .from('retail_sales')
                        .select('id')
                        .or(`id.eq.${saleId},payment_reference.eq.${transactionReference || transactionID || transaction.id}`)
                        .limit(1)
                        .maybeSingle();

                    if (!existingSale) {
                        const { error: saleErr } = await supabase.from('retail_sales').insert({
                            id: saleId,
                            institution_id: instId || storeId || 'SYSTEM',
                            store_id: storeId,
                            customer_name: customerName,
                            customer_phone: customerPhone,
                            items: items,
                            subtotal: metadata.subtotal || amt,
                            discount: metadata.discount || 0,
                            total_amount: amt,
                            amount_paid: amt,
                            balance: 0,
                            payment_method: 'mpesa',
                            payment_status: 'paid',
                            payment_reference: transactionReference || transactionID || transaction.id,
                            status: 'completed',
                            created_at: new Date().toISOString()
                        });

                        if (saleErr) {
                            console.error('[Reconcile IPN] Failed to insert retail sale:', saleErr.message);
                        } else {
                            console.log(`[Reconcile IPN] Successfully recorded retail sale ${saleId} for KES ${amt}`);

                            // Decrement inventory stock
                            for (const item of items) {
                                const itemId = item.id || item.itemId || item.item_id;
                                const qty = parseFloat(String(item.quantity || item.qty || 1));
                                if (itemId && qty > 0) {
                                    const { data: invItem } = await supabase
                                        .from('retail_inventory_items')
                                        .select('id, quantity_on_hand')
                                        .eq('id', itemId)
                                        .maybeSingle();
                                    if (invItem) {
                                        const newQty = Math.max(0, (invItem.quantity_on_hand || 0) - qty);
                                        await supabase
                                            .from('retail_inventory_items')
                                            .update({ quantity_on_hand: newQty, updated_at: new Date().toISOString() })
                                            .eq('id', itemId);
                                    }
                                }
                            }

                            // Record agent commission if applicable
                            const commissionAmount = parseFloat(String(metadata.commissionAmount || 0));
                            if (agentId && commissionAmount > 0) {
                                await supabase.from('retail_commissions_ledger').insert({
                                    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                    institution_id: instId || storeId || 'SYSTEM',
                                    agent_id: agentId,
                                    sale_id: saleId,
                                    amount: commissionAmount,
                                    rate: metadata.commissionRate || 0,
                                    status: 'approved',
                                    created_at: new Date().toISOString()
                                });
                            }

                            // Generate receipt record
                            await supabase.from('receipts').insert({
                                id: `rec_ret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                receipt_number: transactionReference || transactionID || `REC-${Date.now().toString().slice(-6)}`,
                                institution_id: instId || storeId || 'SYSTEM',
                                student_name: customerName,
                                amount_paid: amt,
                                payment_date: (timestamp ? timestamp.split('T')[0] : null) || new Date().toISOString().split('T')[0],
                                payment_method: 'M-PESA (KCB IPN)',
                                paid_for: 'Retail POS Sale',
                                related_transaction_id: transactionReference || transactionID || transaction.id,
                                remarks: `Retail POS Sale completed via KCB IPN (Ref: ${transactionReference || transactionID})`
                            });

                            if (metadata.requesterId) {
                                await supabase.from('app_notifications').insert({
                                    id: `ntf_ret_${Date.now()}`,
                                    user_id: metadata.requesterId,
                                    message: `Retail POS sale of KES ${amt} completed successfully! Ref: ${transactionReference || transactionID}.`,
                                    type: 'success',
                                    is_read: false,
                                    timestamp: new Date().toISOString()
                                });
                            }
                        }
                    } else {
                        console.log(`[Reconcile IPN] Retail sale ${existingSale.id} already exists for this payment.`);
                    }
                }

                const shouldMarkReconciled = type !== 'bank_feed' || Boolean(metadata.studentId);

                if (shouldMarkReconciled) {
                    // Mark transaction as reconciled (setting reconciled: true in metadata)
                    await supabase.from('mpesa_transactions').update({
                        metadata: { ...metadata, reconciled: true, reconciled_at: new Date().toISOString() }
                    }).eq('id', transaction.id);

                    // Update local metadata object so that checks down below can read it correctly
                    metadata.reconciled = true;
                    metadata.reconciled_at = new Date().toISOString();
                }

                // Write/Upsert to bank_transactions so it appears in Bank Feeds
                try {
                    const isReconciledNow = shouldMarkReconciled && (metadata.reconciled === true || metadata.reconciled === 'true' || type === 'invoice' || type === 'car_invoice' || type === 'car_sales_invoices' || type === 'ds_invoice' || type === 'pm_invoice' || type === 'event_registration' || type === 'retail_pos_sale' || type === 'retail_sale');
                    
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
                        payload: normalizedPayload
                    });
                    if (bankTxnErr) console.error('[KCB IPN] Failed to write to bank_transactions:', bankTxnErr);
                } catch (bankErr) {
                    console.error('[KCB IPN] Exception writing to bank_transactions:', bankErr);
                }

                // --- Dispatch SMS Notification with updated balance ---
                const instSmsConfig = inst?.sms_config || inst?.smsConfig;
                const sysSmsConfig = settings.sms_config || settings.smsConfig;
                const payerPhone = metadata.payerPhoneNumber || transaction.phone_number || phone;
                const isFinancePayment = type === 'invoice' || type === 'fee_payment' || Boolean(metadata.studentId) || Boolean(metadata.invoiceId);

                if (isFinancePayment) {
                    try {
                        const targetInstId = instId || resolvedInstitutionId;
                        
                        // 1. Resolve school bank account
                        let receivingBankAccount: any = null;
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
                        const studentId = metadata.studentId || (invoice ? invoice.student_id : null);
                        let studentUser: any = null;
                        let studentEnrollment: any = null;

                        if (studentId) {
                            const { data: u } = await supabase.from('users').select('*').eq('id', studentId).maybeSingle();
                            studentUser = u;
                            const { data: enr } = await supabase.from('student_enrollments').select('*').or(`user_id.eq.${studentId},student_id.eq.${studentId},id.eq.${studentId}`).maybeSingle();
                            studentEnrollment = enr;
                        }

                        const admLookup = metadata.admissionNumber || parsedAdmissionNumber || referenceCode;
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
                        const studentAdm = studentUser?.admission_number || studentEnrollment?.admission_number || metadata.admissionNumber || parsedAdmissionNumber || referenceCode || '';
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
                            phone || 
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
                            paymentDate: timestamp || new Date(),
                            institutionName: inst?.name || 'School',
                            receiptNumber: transactionID || transaction.id
                        });

                        // 6. Multi-gateway cascading dispatch
                        const candidateGateways = buildCandidateSmsGateways(instSmsConfig, sysSmsConfig);

                        if (targetParentPhone && candidateGateways.length > 0) {
                            console.log(`[KCB IPN - Finance SMS] Dispatching to ${targetParentPhone} for student ${studentName} (${studentAdm}). Available gateways: ${candidateGateways.map(c => c.provider).join(', ')}`);
                            const dispatchRes = await dispatchSmsNotificationWithCascade(candidateGateways, targetParentPhone, financeSms);

                            if (dispatchRes.success) {
                                console.log(`[KCB IPN - Finance SMS] Delivered successfully to ${targetParentPhone} via ${dispatchRes.provider}`);
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
                                            via: 'KCB IPN Finance Notification',
                                            receiptNumber: transactionID || transaction.id,
                                            amount: amt,
                                            raw: dispatchRes.rawResponse
                                        }
                                    });
                                } catch (logErr) {
                                    console.warn('[KCB IPN] SMS Log insert failed:', logErr);
                                }
                            } else {
                                console.error(`[KCB IPN - Finance SMS] Failed to dispatch SMS to ${targetParentPhone}:`, dispatchRes.error);
                            }
                        } else if (!targetParentPhone) {
                            console.warn(`[KCB IPN - Finance SMS] No valid parent phone number resolved for student ${studentName}`);
                        } else {
                            console.warn(`[KCB IPN - Finance SMS] No active SMS gateways configured for institution or system.`);
                        }
                    } catch (finSmsErr) {
                        console.error('[KCB IPN] Finance payment SMS dispatch exception:', finSmsErr);
                    }
                } else if (payerPhone) {
                    // Non-finance payments (SMS topup, subscription, etc.)
                    let smsMessage = '';
                    if (type === 'sms' || type === 'sms_topup') {
                        smsMessage = `Payment successful via KCB! ${unitsToCredit.toLocaleString()} SMS units added. New Balance: ${newBalance.toLocaleString()} units. Ref: ${transactionID}. Thank you for choosing Eduai Automation.`;
                    } else {
                        smsMessage = `Payment confirmed via KCB! KES ${amt} received. Ref: ${transactionID}. Thank you for choosing Eduai Automation.`;
                    }

                    try {
                        const candidateGateways = buildCandidateSmsGateways(instSmsConfig, sysSmsConfig);
                        if (candidateGateways.length > 0) {
                            await dispatchSmsNotificationWithCascade(candidateGateways, payerPhone, smsMessage);
                        }
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
