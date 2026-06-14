import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceClient } from '../lib/supabase';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 1. Cron authentication check (Vercel sets Authorization: Bearer <CRON_SECRET> header)
    const authHeader = req.headers.authorization;
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const supabase = createServiceClient();
    if (!supabase) {
        console.error('[Cron Billing] Supabase client could not be initialized.');
        return res.status(500).json({ success: false, error: 'Database service unavailable' });
    }

    try {
        console.log('[Cron Billing] Starting daily subscription check...');

        // Calculate date boundaries (expiring in the next 7 days)
        const today = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(today.getDate() + 7);

        // Fetch active institutions with a subscription expiring in the next 7 days
        const { data: institutions, error: instError } = await supabase
            .from('institutions')
            .select('*')
            .eq('status', 'active')
            .gte('subscription_ends_at', today.toISOString())
            .lte('subscription_ends_at', sevenDaysFromNow.toISOString());

        if (instError) {
            console.error('[Cron Billing] Database error fetching institutions:', instError);
            return res.status(500).json({ success: false, error: instError.message });
        }

        if (!institutions || institutions.length === 0) {
            console.log('[Cron Billing] No active institutions expiring in the next 7 days.');
            return res.status(200).json({ success: true, message: 'No expiring subscriptions found.' });
        }

        console.log(`[Cron Billing] Found ${institutions.length} institutions expiring soon. Checking invoices...`);

        // Fetch global system settings
        let settings: any = {};
        const { data: settingsData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
        if (settingsData) settings = settingsData.data;

        const emailConfig = settings.email_config || settings.emailConfig;
        const smsConfig = settings.sms_config;
        const defaultMonthlyPrice = settings.subscriptionConfig?.monthly || 10000;
        const results: any[] = [];

        // Setup HTML email wrapper helper
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

        // Process billing for each institution
        for (const inst of institutions) {
            const instId = inst.id;

            // De-duplication check: check if we generated a subscription renewal invoice in the last 15 days
            const fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(today.getDate() - 15);

            const { data: existingInvoices, error: invError } = await supabase
                .from('invoices')
                .select('id')
                .eq('institution_id', instId)
                .gte('created_at', fifteenDaysAgo.toISOString())
                .ilike('invoice_number', 'INV-SUB-%');

            if (invError) {
                console.error(`[Cron Billing] Failed to query existing invoices for ${inst.name}:`, invError);
                continue;
            }

            if (existingInvoices && existingInvoices.length > 0) {
                console.log(`[Cron Billing] Subscription invoice already generated recently for ${inst.name}. Skipping.`);
                continue;
            }

            // Calculate subscription renewal price
            let monthlyPrice = defaultMonthlyPrice;
            if (inst.custom_subscription_price && typeof inst.custom_subscription_price === 'object') {
                const custom = inst.custom_subscription_price as any;
                if (custom.monthly) monthlyPrice = Number(custom.monthly);
                else if (custom.monthlyPrice) monthlyPrice = Number(custom.monthlyPrice);
            }

            const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const invoiceNumber = `INV-SUB-${Date.now().toString().slice(-6)}`;
            const dueDate = inst.subscription_ends_at;

            const nextExpiryDate = new Date(new Date(inst.subscription_ends_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            const itemDescription = `Monthly Subscription renewal for the period: ${new Date(inst.subscription_ends_at).toLocaleDateString('en-GB')} to ${nextExpiryDate}`;

            const invoiceItems = [{
                description: itemDescription,
                quantity: 1,
                unitPrice: monthlyPrice,
                amount: monthlyPrice
            }];

            const newInvoice = {
                id: invoiceId,
                invoice_number: invoiceNumber,
                institution_id: instId,
                issue_date: today.toISOString().split('T')[0],
                due_date: dueDate.split('T')[0],
                total_amount: monthlyPrice,
                status: 'pending',
                items: JSON.stringify(invoiceItems),
                created_at: today.toISOString()
            };

            // Insert invoice
            const { error: insertError } = await supabase.from('invoices').insert(newInvoice);
            if (insertError) {
                console.error(`[Cron Billing] Failed to insert invoice for ${inst.name}:`, insertError);
                continue;
            }

            console.log(`[Cron Billing] Successfully generated invoice ${invoiceNumber} for ${inst.name}`);

            // Send Email notification
            let emailSent = false;
            if (emailConfig && inst.email) {
                try {
                    const transporter = nodemailer.createTransport({
                        host: emailConfig.host,
                        port: Number(emailConfig.port || 587),
                        auth: { user: emailConfig.username, pass: emailConfig.password },
                        tls: { rejectUnauthorized: false }
                    });

                    const branding = {
                        logoUrl: (settings.logoUrl || settings.logo_url) || 'https://eduai.co.ke/logo.png',
                        primaryColor: settings.themeColor || settings.primary_color || '#4f46e5',
                        name: settings.appName || 'EduAi Network'
                    };

                    const paymentInstructions = settings.paymentInstructions || 
                        `Please complete settlement of this invoice using the official system Paybill:\nPaybill Number: ${settings.mpesaConfig?.paybillNumber || 'N/A'}  |  Account Name: [Institution Code / Invoice Number]`;

                    const htmlContent = wrapHtml(`
                        <h2 style="color: ${branding.primaryColor}; margin-top: 0;">Subscription Renewal Invoice</h2>
                        <p>Hello Admin,</p>
                        <p>This is a notification that the subscription for <strong>${inst.name}</strong> will expire on <strong>${new Date(inst.subscription_ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>.</p>
                        <p>A subscription renewal invoice has been generated for the next period:</p>
                        
                        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; width: 40%;">Invoice Number</td>
                                    <td style="padding: 8px 0; color: #1e293b; font-weight: 800; font-size: 15px;">${invoiceNumber}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Due Date</td>
                                    <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 15px;">${new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Total Payable</td>
                                    <td style="padding: 8px 0; color: ${branding.primaryColor}; font-weight: 800; font-size: 16px;">KES ${monthlyPrice.toLocaleString()}.00</td>
                                </tr>
                            </table>
                        </div>
                        
                        <h4 style="margin: 0 0 10px; color: #1e293b;">Invoice Payment Instructions</h4>
                        <div style="background-color: #eff6ff; border-radius: 12px; padding: 15px; border-left: 4px solid #3b82f6; font-size: 13px; color: #1e3a8a; white-space: pre-line; margin-bottom: 24px;">
                            ${paymentInstructions}
                        </div>

                        <p>To ensure uninterrupted access to all platform modules and systems, please complete settlement before the expiry date. Renewals are automatically applied once payment is confirmed.</p>
                        <p style="margin-bottom: 0;">Thank you for your business!</p>
                    `, branding);

                    await transporter.sendMail({
                        from: `"${branding.name}" <${emailConfig.fromEmail || emailConfig.username}>`,
                        to: inst.email,
                        subject: `Subscription Renewal Invoice ${invoiceNumber} - ${inst.name}`,
                        html: htmlContent
                    });
                    emailSent = true;
                    console.log(`[Cron Billing] Sent invoice email to ${inst.email}`);
                } catch (emailErr) {
                    console.error(`[Cron Billing] Failed to send email for ${inst.name}:`, emailErr);
                }
            }

            // Send SMS notification
            let smsSent = false;
            if (smsConfig && inst.phoneNumber) {
                try {
                    const provider = smsConfig.provider || 'Zettatel';
                    let phone = inst.phoneNumber.replace(/[^\d]/g, '');

                    // Normalize phone to international format 254...
                    if (phone.startsWith('2540')) phone = '254' + phone.substring(4);
                    else if (phone.startsWith('0')) phone = '254' + phone.substring(1);
                    else if (phone.length === 9) phone = '254' + phone;

                    const smsMessage = `Hello Admin, subscription for ${inst.name} expires on ${new Date(dueDate).toLocaleDateString()}. Renewal Invoice ${invoiceNumber} of KES ${monthlyPrice.toLocaleString()} is due. Settle via Paybill to avoid disruption.`;

                    const baseUrl = smsConfig.baseUrl || smsConfig.api_url || (provider === 'Zettatel' ? 'https://sms.zettatel.com/smsapi/send' : 'https://sms.abmis.co.ke/SMSApi/send');
                    const smsParams = new URLSearchParams({
                        userid: smsConfig.apiKey || smsConfig.api_key || smsConfig.username || smsConfig.userId,
                        password: smsConfig.apiSecret || smsConfig.api_secret || smsConfig.password,
                        mobile: phone,
                        msg: smsMessage,
                        senderid: smsConfig.fromNumber || provider,
                        msgType: 'text',
                        output: 'json'
                    });

                    const finalUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${smsParams.toString()}`;
                    await fetch(finalUrl, { method: 'GET' });
                    smsSent = true;
                    console.log(`[Cron Billing] Sent invoice SMS to ${phone}`);
                } catch (smsErr) {
                    console.error(`[Cron Billing] Failed to send SMS for ${inst.name}:`, smsErr);
                }
            }

            results.push({
                institutionId: instId,
                name: inst.name,
                invoiceNumber,
                amount: monthlyPrice,
                emailSent,
                smsSent
            });
        }

        console.log(`[Cron Billing] Finished billing run. Processed ${results.length} invoices.`);
        return res.status(200).json({ success: true, processedCount: results.length, details: results });
    } catch (err: any) {
        console.error('[Cron Billing] Uncaught exception during execution:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
