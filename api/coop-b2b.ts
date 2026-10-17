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
                    payload: {
                        ...body,
                        phoneNumber: bodyRequest.MobileNumber || bodyRequest.PhoneNumber || '',
                        customerMobileNumber: bodyRequest.MobileNumber || bodyRequest.PhoneNumber || '',
                        customerReference: bodyRequest.AccountReference || bodyRequest.DocumentReferenceNumber || '',
                        admissionNumber: bodyRequest.AccountReference || bodyRequest.DocumentReferenceNumber || ''
                    }
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

                    // Dispatch Custom Payment Notification SMS to Parent
                    try {
                        const studentId = invoice.student_id;
                        let studentUser: any = null;
                        let studentEnrollment: any = null;

                        if (studentId) {
                            const { data: u } = await supabase.from('users').select('*').eq('id', studentId).maybeSingle();
                            studentUser = u;
                            const { data: enr } = await supabase.from('student_enrollments').select('*').or(`user_id.eq.${studentId},student_id.eq.${studentId},id.eq.${studentId}`).maybeSingle();
                            studentEnrollment = enr;
                        }

                        if (!studentUser && studentEnrollment) {
                            const linkedUid = studentEnrollment.student_id || studentEnrollment.user_id || studentEnrollment.id;
                            if (linkedUid) {
                                const { data: linkedUser } = await supabase.from('users').select('*').eq('id', linkedUid).maybeSingle();
                                if (linkedUser) studentUser = linkedUser;
                            }
                        }

                        let receivingBankAccount: any = null;
                        if (targetAccount && targetInstId) {
                            const { data: matchedAcc } = await supabase
                                .from('school_bank_accounts')
                                .select('*')
                                .eq('institution_id', targetInstId)
                                .eq('account_number', targetAccount)
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

                        const studentName = studentUser?.name || studentUser?.fullName || studentEnrollment?.student_name || studentEnrollment?.name || 'Student';
                        const studentAdm = studentUser?.admission_number || studentEnrollment?.admission_number || '';
                        const resolvedStudentId = studentId || studentUser?.id || studentEnrollment?.student_id || studentEnrollment?.user_id;

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

                        const targetParentPhone = 
                            studentUser?.parent_phone || 
                            studentUser?.parentPhone ||
                            studentEnrollment?.parent_phone || 
                            studentEnrollment?.parentPhone ||
                            studentEnrollment?.metadata?.parentPhone || 
                            studentEnrollment?.metadata?.parent_phone ||
                            studentUser?.phone;

                        const financeSms = buildCustomPaymentNotification({
                            account: receivingBankAccount,
                            student: {
                                name: studentName,
                                admissionNumber: studentAdm
                            },
                            enrollment: studentEnrollment || {
                                className: studentUser?.grade || studentUser?.class
                            },
                            paymentAmount: amount,
                            totalCharged: totalCharged,
                            totalAdjusted: 0,
                            currentBalance: currentBalance,
                            paymentDate: bodyRequest.PaymentDate || bodyRequest.TransactionDate || new Date(),
                            institutionName: institution?.name || 'School',
                            receiptNumber: bankTxnId
                        });

                        const instSmsConfig = institution?.sms_config || institution?.smsConfig;
                        const { data: settingsData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
                        const sysSmsConfig = settingsData?.data?.sms_config || settingsData?.data?.smsConfig;

                        const candidateGateways = buildCandidateSmsGateways(instSmsConfig, sysSmsConfig);
                        if (targetParentPhone && candidateGateways.length > 0) {
                            const dispatchRes = await dispatchSmsNotificationWithCascade(candidateGateways, targetParentPhone, financeSms);
                            if (dispatchRes.success) {
                                if (targetInstId && targetInstId !== 'SYSTEM') {
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
                                            via: 'Coop Bank B2B Advice Finance Notification',
                                            receiptNumber: bankTxnId,
                                            amount: amount,
                                            raw: dispatchRes.rawResponse
                                        }
                                    });
                                } catch (logErr) {
                                    console.warn('[Coop B2B Advice] SMS Log insert failed:', logErr);
                                }
                            }
                        }
                    } catch (coopSmsErr) {
                        console.error('[Coop B2B Advice] Error dispatching parent finance SMS:', coopSmsErr);
                    }
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
