import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceClient } from '../lib/supabase';

export const config = {
    maxDuration: 60,
};

/**
 * M-Pesa Callback Handler
 * 
 * This endpoint receives payment notifications from Safaricom's Daraja API
 * and automatically processes subscription renewals and account reactivation.
 * 
 * Flow:
 * 1. Receive callback from Safaricom with payment status
 * 2. Update transaction record in database
 * 3. If payment successful, automatically reactivate tenant account
 * 4. Extend subscription period based on plan (monthly/yearly)
 */
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
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('========================================');
    console.log('[M-Pesa Callback] Received notification from Safaricom');
    console.log('[M-Pesa Callback] Raw Body:', JSON.stringify(req.body, null, 2));
    console.log('========================================');

    try {
        const supabase = createServiceClient();

        // Helper for fetch with timeout
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

        // Fetch settings (bypass RLS as we are on the server)
        let settings: any = {};
        const { data: settingsData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
        if (settingsData) settings = settingsData.data;
        const invoicePrefix = (settings.global_invoice_prefix || settings.globalInvoicePrefix || 'INV-').trim();
        const receiptPrefix = (settings.global_receipt_prefix || settings.globalReceiptPrefix || 'RCT-').trim();

        const getBranding = async (instId?: string) => {
            const protocol = String(req.headers['x-forwarded-proto'] || 'https');
            const hostHeader = req.headers.host || 'eduai.co.ke';
            const siteUrl = `${protocol}://${hostHeader}`;

            const makeAbsolute = (url: string) => {
                if (!url || url.startsWith('http') || url.startsWith('data:')) return url;
                return `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`;
            };

            const defaultBranding = {
                logoUrl: makeAbsolute(settings.logoUrl || settings.logo_url) || 'https://eduai.co.ke/logo.png',
                primaryColor: settings.themeColor || settings.primary_color || '#4f46e5',
                name: settings.appName || 'EduAi Network'
            };

            if (!instId || instId === 'GLOBAL' || instId === 'SYSTEM') return defaultBranding;

            try {
                const { data: inst } = await supabase.from('institutions').select('name, logo_url, theme_color, institution_type').eq('id', instId).maybeSingle();
                if (inst) {
                    return {
                        logoUrl: makeAbsolute(inst.logo_url) || defaultBranding.logoUrl,
                        primaryColor: inst.theme_color || defaultBranding.primaryColor,
                        name: inst.name,
                        type: inst.institution_type
                    };
                }
            } catch (e) {
                console.error(`[Branding] Failed to fetch for ${instId}:`, e);
            }
            return defaultBranding;
        };

        const wrapHtml = (content: string, branding: any) => {
            return `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
                    <div style="background-color: ${branding.primaryColor}; padding: 30px; text-align: center;">
                        <img src="${branding.logoUrl}" alt="${branding.name}" width="180" style="display: inline-block; max-height: 60px; width: auto; height: auto; border: 0;" />
                    </div>
                    <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
                        ${content}
                    </div>
                    <div style="padding: 20px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                            Sent via ${branding.name}
                        </p>
                        <p style="margin: 5px 0 0; font-size: 10px; color: #94a3b8;">
                            &copy; ${new Date().getFullYear()} EduAi Global Network. All rights reserved.
                        </p>
                    </div>
                </div>
            `;
        };

        // Parse M-Pesa callback data
        const { Body } = req.body;

        if (!Body || !Body.stkCallback) {
            console.error('[M-Pesa Callback] Invalid callback structure');
            return res.status(400).json({
                ResultCode: 1,
                ResultDesc: 'Invalid callback data'
            });
        }

        const { stkCallback } = Body;
        const {
            MerchantRequestID,
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            CallbackMetadata
        } = stkCallback;

        console.log(`[M-Pesa Callback] CheckoutRequestID: ${CheckoutRequestID}`);
        console.log(`[M-Pesa Callback] ResultCode: ${ResultCode}`);
        console.log(`[M-Pesa Callback] ResultDesc: ${ResultDesc}`);

        // Find the pending transaction
        const { data: transaction, error: fetchError } = await supabase
            .from('mpesa_transactions')
            .select('*')
            .eq('checkout_request_id', CheckoutRequestID)
            .single();

        if (fetchError || !transaction) {
            console.error('[M-Pesa Callback] Transaction not found:', CheckoutRequestID);
            return res.status(404).json({
                ResultCode: 1,
                ResultDesc: 'Transaction not found'
            });
        }

        console.log(`[M-Pesa Callback] Found transaction: ${transaction.id}`);
        console.log(`[M-Pesa Callback] Institution: ${transaction.institution_id}`);
        console.log(`[M-Pesa Callback] Amount: KES ${transaction.amount}`);

        // ResultCode "0" means success
        if (ResultCode === "0" || ResultCode === 0) {
            console.log('[M-Pesa Callback] ✅ Payment SUCCESSFUL');

            // Extract payment details from callback metadata
            let mpesaReceiptNumber = '';
            let transactionDate = '';
            let phoneNumber = transaction.phone_number;

            if (CallbackMetadata && CallbackMetadata.Item) {
                CallbackMetadata.Item.forEach((item: any) => {
                    if (item.Name === 'MpesaReceiptNumber') {
                        mpesaReceiptNumber = item.Value;
                    } else if (item.Name === 'TransactionDate') {
                        transactionDate = item.Value;
                    } else if (item.Name === 'PhoneNumber') {
                        phoneNumber = item.Value;
                    }
                });
            }

            console.log(`[M-Pesa Callback] Receipt Number: ${mpesaReceiptNumber}`);
            console.log(`[M-Pesa Callback] Transaction Date: ${transactionDate}`);

            // Update transaction status to completed
            const { error: updateError } = await supabase
                .from('mpesa_transactions')
                .update({
                    status: 'completed',
                    transaction_id: mpesaReceiptNumber || `MPESA_${CheckoutRequestID}`,
                    phone_number: phoneNumber
                })
                .eq('id', transaction.id);

            if (updateError) {
                console.error('[M-Pesa Callback] Failed to update transaction:', updateError);
            } else {
                console.log('[M-Pesa Callback] ✅ Transaction updated to COMPLETED');
            }

            // Process subscription renewal and account reactivation
            const metadata = transaction.metadata || {};

            if (metadata.type === 'subscription' && metadata.plan) {
                console.log(`[M-Pesa Callback] Processing ${metadata.plan} subscription renewal...`);

                // Calculate subscription extension
                const days = metadata.plan === 'monthly' ? 30 : 365;

                // Fetch current institution data
                const { data: institution, error: instError } = await supabase
                    .from('institutions')
                    .select('subscription_ends_at, status')
                    .eq('id', transaction.institution_id)
                    .single();

                if (instError) {
                    console.error('[M-Pesa Callback] Failed to fetch institution:', instError);
                } else {
                    // Calculate new subscription end date
                    const currentEnd = institution?.subscription_ends_at
                        ? new Date(institution.subscription_ends_at)
                        : new Date();

                    // Extend from whichever is later: current end date or now
                    const baseDate = Math.max(currentEnd.getTime(), Date.now());
                    const newEndDate = new Date(baseDate + (days * 24 * 60 * 60 * 1000));

                    console.log(`[M-Pesa Callback] Current subscription ends: ${currentEnd.toISOString()}`);
                    console.log(`[M-Pesa Callback] New subscription ends: ${newEndDate.toISOString()}`);

                    // Update institution: reactivate account and extend subscription
                    const { error: activationError } = await supabase
                        .from('institutions')
                        .update({
                            subscription_ends_at: newEndDate.toISOString(),
                            status: 'active' // Automatically reactivate the account
                        })
                        .eq('id', transaction.institution_id);

                    if (activationError) {
                        console.error('[M-Pesa Callback] Failed to reactivate account:', activationError);
                    } else {
                        console.log('[M-Pesa Callback] ✅ ACCOUNT REACTIVATED');

                        // Create an invoice for the subscription
                        const invoiceId = `inv_${Date.now()}`;
                        await supabase.from('invoices').insert({
                            id: invoiceId,
                            invoice_number: `${invoicePrefix}SUB-${Date.now().toString().slice(-6)}`,
                            institution_id: transaction.institution_id,
                            issue_date: new Date().toISOString().split('T')[0],
                            due_date: new Date().toISOString().split('T')[0],
                            total_amount: transaction.amount,
                            status: 'paid',
                            items: JSON.stringify([{
                                description: `${metadata.plan.charAt(0).toUpperCase() + metadata.plan.slice(1)} Subscription renewal`,
                                quantity: 1,
                                unitPrice: transaction.amount,
                                amount: transaction.amount
                            }])
                        });

                        // Create a receipt
                        await supabase.from('receipts').insert({
                            id: `rec_${Date.now()}`,
                            receipt_number: mpesaReceiptNumber || `${receiptPrefix}SUB-${Date.now().toString().slice(-6)}`,
                            institution_id: transaction.institution_id,
                            invoice_id: invoiceId,
                            amount_paid: transaction.amount,
                            payment_date: new Date().toISOString().split('T')[0],
                            payment_method: 'M-Pesa',
                            related_transaction_id: mpesaReceiptNumber || transaction.transaction_id || transaction.id
                        });

                        console.log(`[M-Pesa Callback] ✅ Subscription extended by ${days} days`);
                        console.log(`[M-Pesa Callback] ✅ New expiry: ${newEndDate.toISOString()}`);

                        // Create notification for subscription
                        if (metadata.requesterId) {
                            await supabase.from('app_notifications').insert({
                                id: `ntf_${Date.now()}`,
                                user_id: metadata.requesterId,
                                message: `Successfully renewed ${metadata.plan} subscription! New expiry: ${newEndDate.toLocaleDateString()}`,
                                type: 'success',
                                is_read: false,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                }
            } else if (metadata.type === 'student_admission' && metadata.student_id) {
                console.log(`[M-Pesa Callback] Processing student admission payment for student: ${metadata.student_id}`);
                
                // 1. Update student record in ds_students
                const { error: studentUpdateErr } = await supabase
                    .from('ds_students')
                    .update({
                        payment_status: 'paid',
                        status: 'Enrolled',
                        activation_date: new Date().toISOString()
                    })
                    .eq('id', metadata.student_id);
                
                if (studentUpdateErr) {
                    console.error('[M-Pesa Callback] Failed to update student record:', studentUpdateErr);
                } else {
                    console.log('[M-Pesa Callback] ✅ STUDENT RECORD ENROLLED & PAID');
                }

                // 2. Fetch student details to get userId and email/phone for credentials
                const { data: studentData, error: studentFetchErr } = await supabase
                    .from('ds_students')
                    .select('*')
                    .eq('id', metadata.student_id)
                    .maybeSingle();

                if (studentFetchErr || !studentData) {
                    console.error('[M-Pesa Callback] Failed to fetch student details:', studentFetchErr);
                } else {
                    // Activate associated user profile
                    if (studentData.user_id || studentData.userId) {
                        const uid = studentData.user_id || studentData.userId;
                        await supabase.from('users').update({ status: 'active' }).eq('id', uid);
                        console.log(`[M-Pesa Callback] ✅ USER PROFILE ACTIVATED: ${uid}`);
                    }

                    // 3. Generate Invoice and Receipt for Student registration
                    const invoiceId = `inv_stud_${Date.now()}`;
                    const studentCode = studentData.admission_number || studentData.id.slice(-6).toUpperCase();
                    const invoiceNumber = `${invoicePrefix}STUD-${studentCode}`;
                    
                    await supabase.from('invoices').insert({
                        id: invoiceId,
                        invoice_number: invoiceNumber,
                        institution_id: transaction.institution_id,
                        issue_date: new Date().toISOString().split('T')[0],
                        due_date: new Date().toISOString().split('T')[0],
                        total_amount: transaction.amount,
                        status: 'paid',
                        items: JSON.stringify([{
                            description: `Driving School Student Registration Fee for ${studentData.full_name} (${studentCode})`,
                            quantity: 1,
                            unitPrice: transaction.amount,
                            amount: transaction.amount
                        }])
                    });

                    await supabase.from('receipts').insert({
                        id: `rec_stud_${Date.now()}`,
                        receipt_number: mpesaReceiptNumber || `${receiptPrefix}STUD-${Date.now().toString().slice(-6)}`,
                        institution_id: transaction.institution_id,
                        invoice_id: invoiceId,
                        amount_paid: transaction.amount,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'M-Pesa',
                        related_transaction_id: mpesaReceiptNumber || transaction.transaction_id || transaction.id
                    });

                    // 4. Send Welcome Credentials SMS
                    const smsConfig = settings.sms_config;
                    const studentPhone = studentData.phone || transaction.phone_number;
                    if (smsConfig && studentPhone && studentPhone.trim().length >= 9) {
                        try {
                            const { data: inst } = await supabase.from('institutions').select('name').eq('id', transaction.institution_id).maybeSingle();
                            const portalTitle = (inst?.name && !inst.name.toLowerCase().includes('law firm')) ? inst.name : 'Driving School';
                            const portalUrl = `https://${req.headers['x-forwarded-host'] || req.headers.host || 'eduai.co.ke'}`;
                            
                            const smsMsg = `Payment Verified! Welcome to ${portalTitle}. Your Driving School account is now active.\nPortal: ${portalUrl}\nUser ID: ${studentPhone}`;
                            
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
                            console.log("[M-Pesa Callback] Dispatched credentials SMS to student after payment success");
                        } catch (smsErr) {
                            console.error("[M-Pesa Callback] Failed to dispatch welcome credentials SMS:", smsErr);
                        }
                    }
                }
            } else if (metadata.type === 'tenant_postpaid_bill' && metadata.bill_id) {
                console.log(`[M-Pesa Callback] Processing postpaid monthly bill payment: ${metadata.bill_id} for institution: ${transaction.institution_id}`);

                // 1. Mark postpaid bill as paid in tenant_bills
                const { error: billUpdateErr } = await supabase
                    .from('tenant_bills')
                    .update({ status: 'paid' })
                    .eq('id', metadata.bill_id);

                if (billUpdateErr) {
                    console.error('[M-Pesa Callback] Failed to update postpaid bill:', billUpdateErr);
                } else {
                    console.log('[M-Pesa Callback] ✅ POSTPAID BILL STATUS MARKED AS PAID');
                }

                // 2. Unsuspend the institution
                const { error: instUpdateErr } = await supabase
                    .from('institutions')
                    .update({ is_suspended_for_billing: false })
                    .eq('id', transaction.institution_id);

                if (instUpdateErr) {
                    console.error('[M-Pesa Callback] Failed to unsuspend institution:', instUpdateErr);
                } else {
                    console.log('[M-Pesa Callback] ✅ INSTITUTION UNSUSPENDED');
                }

                // 3. Create invoice & receipt for Postpaid bill
                const invoiceId = `inv_bill_${Date.now()}`;
                await supabase.from('invoices').insert({
                    id: invoiceId,
                    invoice_number: `${invoicePrefix}BILL-${Date.now().toString().slice(-6)}`,
                    institution_id: transaction.institution_id,
                    issue_date: new Date().toISOString().split('T')[0],
                    due_date: new Date().toISOString().split('T')[0],
                    total_amount: transaction.amount,
                    status: 'paid',
                    items: JSON.stringify([{
                        description: `Consolidated Monthly Student Registration Bill settlement`,
                        quantity: 1,
                        unitPrice: transaction.amount,
                        amount: transaction.amount
                    }])
                });

                await supabase.from('receipts').insert({
                    id: `rec_bill_${Date.now()}`,
                    receipt_number: mpesaReceiptNumber || `${receiptPrefix}BILL-${Date.now().toString().slice(-6)}`,
                    institution_id: transaction.institution_id,
                    invoice_id: invoiceId,
                    amount_paid: transaction.amount,
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_method: 'M-Pesa',
                    related_transaction_id: mpesaReceiptNumber || transaction.transaction_id || transaction.id
                });
            } else if (metadata.type === 'invoice' || metadata.type === 'fee_payment' || metadata.studentId || metadata.invoiceId) {
                console.log(`[M-Pesa Callback] Processing invoice/fee payment for institution: ${transaction.institution_id}`);
                const invId = metadata.invoiceId;
                let invoiceObj: any = null;
                if (invId) {
                    const { data: invFound } = await supabase.from('invoices').select('*').eq('id', invId).maybeSingle();
                    invoiceObj = invFound;
                }

                if (invoiceObj) {
                    const existingPaid = Number(invoiceObj.paid_amount || invoiceObj.paidAmount || 0);
                    const invTotal = Number(invoiceObj.total_amount || invoiceObj.amount || 0);
                    const newPaid = existingPaid + transaction.amount;
                    const newStatus = (newPaid >= invTotal && invTotal > 0) ? 'paid' : (newPaid > 0 ? 'partial' : 'pending');
                    await supabase.from('invoices').update({
                        paid_amount: newPaid,
                        status: newStatus,
                        updated_at: new Date().toISOString()
                    }).eq('id', invoiceObj.id);
                } else if (metadata.studentId || metadata.student_id) {
                    const stdId = metadata.studentId || metadata.student_id;
                    const { data: openInvs } = await supabase
                        .from('invoices')
                        .select('*')
                        .eq('student_id', stdId)
                        .in('status', ['pending', 'partial', 'unpaid', 'issued'])
                        .order('due_date', { ascending: true });
                    if (openInvs && openInvs.length > 0) {
                        let unallocated = transaction.amount;
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

                const studentAdm = metadata.admissionNumber || metadata.admission_number || metadata.admNo || '';
                const studentName = metadata.studentName || metadata.student_name || 'Student';
                const receiptNum = mpesaReceiptNumber || `${receiptPrefix}INV-${Date.now().toString().slice(-6)}`;
                const receiptId = `rec_inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                await supabase.from('receipts').insert({
                    id: receiptId,
                    receipt_number: receiptNum,
                    institution_id: transaction.institution_id || 'SYSTEM',
                    invoice_id: invoiceObj?.id || metadata.invoiceId || null,
                    student_id: metadata.studentId || metadata.student_id || invoiceObj?.student_id || null,
                    student_name: studentName,
                    admission_number: studentAdm,
                    amount_paid: transaction.amount,
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_method: 'M-Pesa',
                    paid_for: 'School Fees',
                    related_transaction_id: mpesaReceiptNumber || transaction.transaction_id || transaction.id,
                    remarks: `Automated headless reconciliation via M-Pesa Callback (Ref: ${mpesaReceiptNumber || transaction.id})`
                });

                if (metadata.requesterId) {
                    await supabase.from('app_notifications').insert({
                        id: `ntf_inv_${Date.now()}`,
                        user_id: metadata.requesterId,
                        message: `Invoice payment of KES ${transaction.amount} successful via M-Pesa! Ref: ${mpesaReceiptNumber || transaction.id}.`,
                        type: 'success',
                        is_read: false,
                        timestamp: new Date().toISOString()
                    });
                }
            } else if (metadata.type === 'sms' && metadata.units) {
                console.log(`[M-Pesa Callback] Crediting SMS units: ${metadata.units} for ${transaction.institution_id}`);

                const unitsToCredit = parseInt(metadata.units);
                const { error: smsCreditError } = await supabase.rpc('increment_sms_balance', {
                    inst_id: transaction.institution_id,
                    amount: unitsToCredit
                });

                if (smsCreditError) {
                    console.error('[M-Pesa Callback] RPC Error crediting SMS:', smsCreditError);
                    // Fallback to direct update if RPC fails
                    await supabase.from('institutions')
                        .update({ sms_balance: supabase.rpc('increment', { amount: unitsToCredit }) })
                        .eq('id', transaction.institution_id);
                }

                // Create invoice & receipt for SMS
                const invoiceId = `inv_sms_${Date.now()}`;
                await supabase.from('invoices').insert({
                    id: invoiceId,
                    invoice_number: `${invoicePrefix}SMS-${Date.now().toString().slice(-6)}`,
                    institution_id: transaction.institution_id,
                    issue_date: new Date().toISOString().split('T')[0],
                    due_date: new Date().toISOString().split('T')[0],
                    total_amount: transaction.amount,
                    status: 'paid',
                    items: JSON.stringify([{
                        description: `SMS Units Purchase - ${unitsToCredit} units`,
                        quantity: 1,
                        unitPrice: transaction.amount,
                        amount: transaction.amount
                    }])
                });

                await supabase.from('receipts').insert({
                    id: `rec_sms_${Date.now()}`,
                    receipt_number: mpesaReceiptNumber || `${receiptPrefix}SMS-${Date.now().toString().slice(-6)}`,
                    institution_id: transaction.institution_id,
                    invoice_id: invoiceId,
                    amount_paid: transaction.amount,
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_method: 'M-Pesa',
                    related_transaction_id: mpesaReceiptNumber || transaction.transaction_id || transaction.id
                });

                // Fetch new balance for accurate notifications
                const { data: updatedInst } = await supabase
                    .from('institutions')
                    .select('sms_balance, email, sms_config')
                    .eq('id', transaction.institution_id)
                    .single();

                const newBalance = updatedInst?.sms_balance || 0;

                console.log(`[M-Pesa Callback] ✅ SMS Units Credited: ${unitsToCredit}. New Total: ${newBalance}`);

                // Create notification if requesterId exists
                if (metadata.requesterId) {
                    await supabase.from('app_notifications').insert({
                        id: `ntf_sms_${Date.now()}`,
                        user_id: metadata.requesterId,
                        message: `Payment successful! ${unitsToCredit.toLocaleString()} SMS units have been added to your institution's balance. New Balance: ${newBalance.toLocaleString()} units.`,
                        type: 'success',
                        is_read: false,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`[M-Pesa Callback] Notification created for user: ${metadata.requesterId}`);
                }

                // Send Email confirmation
                const emailConfig = settings.email_config || settings.emailConfig;
                if (emailConfig && updatedInst?.email) {
                    try {
                        const nodemailerModule: any = await import('nodemailer');
                        const nodemailer = nodemailerModule.default || nodemailerModule;
                        const transporter = nodemailer.createTransport({
                            host: emailConfig.host,
                            port: Number(emailConfig.port || 587),
                            auth: { user: emailConfig.username, pass: emailConfig.password },
                            tls: { rejectUnauthorized: false }
                        });
                        
                        const unitsCount = unitsToCredit.toLocaleString();
                        const purpose = `SMS Top-up (${unitsCount} units)`;
                        const emailMessage = `Dear Admin, payment confirmed! ${unitsCount} SMS units have been added to your balance. Your new balance is ${newBalance.toLocaleString()} units. Ref: ${mpesaReceiptNumber || transaction.id}. Thank you for choosing Eduai Automation.`;

                        const branding = await getBranding(transaction.institution_id);
                        const htmlContent = wrapHtml(`
                            <h2 style="color: ${branding.primaryColor}; margin-top: 0;">Payment Verified</h2>
                            <p>Hello,</p>
                            <p>Your payment of <strong>KES ${transaction.amount.toLocaleString()}</strong> for SMS units has been successfully verified.</p>
                            
                            <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; width: 40%;">Amount Paid</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-weight: 800; font-size: 15px;">KES ${transaction.amount.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Purpose</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 15px;">${purpose}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Reference</td>
                                        <td style="padding: 8px 0; color: #1e293b; font-family: monospace; font-size: 14px;">${mpesaReceiptNumber || transaction.id}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">New SMS Balance</td>
                                        <td style="padding: 8px 0; color: #059669; font-weight: 800; font-size: 15px;">${newBalance.toLocaleString()} Units</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <p style="margin-bottom: 0;">Thank you for your continued partnership with the Eduai Automation Platform.</p>
                        `, branding);

                        await transporter.sendMail({
                            from: `"${branding.name}" <${emailConfig.fromEmail || emailConfig.username}>`,
                            to: updatedInst.email,
                            subject: 'SMS Units Topped Up Successfully',
                            text: emailMessage,
                            html: htmlContent
                        });
                    } catch (emailErr) {
                        console.error('[M-Pesa Callback] Email notification failed:', emailErr);
                    }
                }

                // Send SMS confirmation if payerPhoneNumber exists
                const instSmsConfig = (updatedInst as any)?.sms_config || (updatedInst as any)?.smsConfig;
                const sysSmsConfig = settings.sms_config || settings.smsConfig;
                const payerPhone = metadata.payerPhoneNumber || phoneNumber;

                if (payerPhone) {
                    const unitsCount = unitsToCredit.toLocaleString();
                    const smsMessage = `Payment successful! ${unitsCount} SMS units have been added to your institution's balance. New Balance: ${newBalance.toLocaleString()} units. Ref: ${mpesaReceiptNumber || transaction.id}. Thank you for choosing Eduai Automation.`;

                    try {
                        const candidateGateways = buildCandidateSmsGateways(instSmsConfig, sysSmsConfig);
                        if (candidateGateways.length > 0) {
                            await dispatchSmsNotificationWithCascade(candidateGateways, payerPhone, smsMessage);
                        }
                    } catch (smsErr) {
                        console.error('[M-Pesa Callback] Failed to send SMS confirmation:', smsErr);
                    }
                }
            }

            // --- Send SMS Notification with custom finance template & multi-gateway cascade ---
            const { data: instData } = await supabase.from('institutions').select('*').eq('id', transaction.institution_id).maybeSingle();
            const instSmsConfig = instData?.sms_config || instData?.smsConfig;
            const sysSmsConfig = settings.sms_config || settings.smsConfig;
            const payerPhone = metadata.payerPhoneNumber || phoneNumber || transaction.phone_number;
            const isFinancePayment = metadata.type === 'invoice' || metadata.type === 'fee_payment' || Boolean(metadata.studentId) || Boolean(metadata.invoiceId);

            if (isFinancePayment) {
                try {
                    const targetInstId = transaction.institution_id;

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
                        paymentAmount: transaction.amount,
                        totalCharged: totalCharged,
                        totalAdjusted: 0,
                        currentBalance: currentBalance,
                        paymentDate: transaction.created_at || new Date(),
                        institutionName: instData?.name || 'School',
                        receiptNumber: mpesaReceiptNumber || transaction.id
                    });

                    // 6. Multi-gateway cascading dispatch
                    const candidateGateways = buildCandidateSmsGateways(instSmsConfig, sysSmsConfig);

                    if (targetParentPhone && candidateGateways.length > 0) {
                        console.log(`[M-Pesa Callback - Finance SMS] Dispatching to ${targetParentPhone} for student ${studentName} (${studentAdm}). Available gateways: ${candidateGateways.map(c => c.provider).join(', ')}`);
                        const dispatchRes = await dispatchSmsNotificationWithCascade(candidateGateways, targetParentPhone, financeSms);

                        if (dispatchRes.success) {
                            console.log(`[M-Pesa Callback - Finance SMS] Delivered successfully to ${targetParentPhone} via ${dispatchRes.provider}`);
                            if (targetInstId && targetInstId !== 'SYSTEM' && targetInstId !== 'GLOBAL') {
                                await supabase.rpc('decrement_sms_balance', { inst_id: targetInstId, amount: 1 });
                            }
                            try {
                                await supabase.from('sms_logs').insert({
                                    id: `smslog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                                    institution_id: targetInstId || 'SYSTEM',
                                    sender_id: null,
                                    recipient: normalizePhone(targetParentPhone),
                                    message: financeSms,
                                    units: 1,
                                    status: 'sent',
                                    provider: dispatchRes.provider,
                                    gateway_response: {
                                        via: 'M-Pesa Callback Finance Notification',
                                        receiptNumber: mpesaReceiptNumber || transaction.id,
                                        amount: transaction.amount,
                                        raw: dispatchRes.rawResponse
                                    }
                                });
                            } catch (logErr) {
                                console.warn('[M-Pesa Callback] SMS Log insert failed:', logErr);
                            }
                        } else {
                            console.error(`[M-Pesa Callback - Finance SMS] Failed to dispatch SMS to ${targetParentPhone}:`, dispatchRes.error);
                        }
                    } else if (!targetParentPhone) {
                        console.warn(`[M-Pesa Callback - Finance SMS] No valid parent phone number resolved for student ${studentName}`);
                    } else {
                        console.warn(`[M-Pesa Callback - Finance SMS] No active SMS gateways configured for institution or system.`);
                    }
                } catch (finSmsErr) {
                    console.error('[M-Pesa Callback] Finance payment SMS dispatch exception:', finSmsErr);
                }
            } else if (metadata.type !== 'sms' && payerPhone) {
                let smsMessage = `Payment confirmed via M-Pesa! KES ${transaction.amount} received. Ref: ${mpesaReceiptNumber || transaction.id}. Thank you for choosing Eduai Automation.`;
                try {
                    const candidateGateways = buildCandidateSmsGateways(instSmsConfig, sysSmsConfig);
                    if (candidateGateways.length > 0) {
                        await dispatchSmsNotificationWithCascade(candidateGateways, payerPhone, smsMessage);
                    }
                } catch (smsErr) {
                    console.error('[M-Pesa Callback] Failed to send SMS confirmation:', smsErr);
                }
            }

            console.log('[M-Pesa Callback] ========================================');
            console.log('[M-Pesa Callback] PAYMENT PROCESSING COMPLETE');
            console.log('[M-Pesa Callback] ========================================');

            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: 'Payment processed successfully'
            });

        } else {
            // Payment failed or cancelled
            console.log(`[M-Pesa Callback] ❌ Payment FAILED: ${ResultDesc}`);

            const { error: updateError } = await supabase
                .from('mpesa_transactions')
                .update({ status: 'failed' })
                .eq('id', transaction.id);

            if (updateError) {
                console.error('[M-Pesa Callback] Failed to update transaction status:', updateError);
            } else {
                console.log('[M-Pesa Callback] Transaction marked as FAILED');
            }

            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: 'Callback received'
            });
        }

    } catch (error: any) {
        console.error('[M-Pesa Callback] ERROR:', error);
        return res.status(500).json({
            ResultCode: 1,
            ResultDesc: 'Internal server error'
        });
    }
}