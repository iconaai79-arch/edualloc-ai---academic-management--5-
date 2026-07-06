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
        console.error('[DS Cron Billing] Supabase client could not be initialized.');
        return res.status(500).json({ success: false, error: 'Database service unavailable' });
    }

    try {
        console.log('[DS Cron Billing] Starting driving school postpaid billing check...');
        const today = new Date();
        const results: any[] = [];

        // --- Step A: Generate New Bills for postpaid institutions whose billing cycle has ended ---
        // Fetch postpaid active institutions (optimized projection)
        const { data: institutions, error: instError } = await supabase
            .from('institutions')
            .select('id, name, billing_cycle_anchor, billingCycleAnchor:billing_cycle_anchor, rate_per_student, ratePerStudent:rate_per_student, email, created_at')
            .eq('status', 'active')
            .eq('billing_model', 'postpaid_student');

        if (instError) {
            console.error('[DS Cron Billing] Database error fetching institutions:', instError);
            return res.status(500).json({ success: false, error: instError.message });
        }

        // Fetch global system settings for emailing/branding fallback
        let settings: any = {};
        const { data: settingsData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
        if (settingsData) settings = settingsData.data;
        const emailConfig = settings.email_config || settings.emailConfig;
        const smsConfig = settings.sms_config;

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

        const branding = {
            logoUrl: (settings.logoUrl || settings.logo_url) || 'https://eduai.co.ke/logo.png',
            primaryColor: settings.themeColor || settings.primary_color || '#4f46e5',
            name: settings.appName || 'EduAi Network'
        };

        // 30 days cycle threshold
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        for (const inst of institutions) {
            const anchorStr = inst.billing_cycle_anchor || inst.billingCycleAnchor || inst.created_at;
            const anchor = new Date(anchorStr);

            // Cycle has elapsed (30+ days since last anchor)
            if (anchor <= thirtyDaysAgo) {
                console.log(`[DS Cron Billing] Billing period elapsed for: ${inst.name}. Last anchor: ${anchor.toISOString()}`);
                
                // Count registered students within the period
                const { data: studentsList, error: countError } = await supabase
                    .from('ds_students')
                    .select('id')
                    .eq('institution_id', inst.id)
                    .gte('created_at', anchor.toISOString())
                    .lte('created_at', today.toISOString());

                if (countError) {
                    console.error(`[DS Cron Billing] Failed to count students for ${inst.name}:`, countError);
                    continue;
                }

                const count = studentsList?.length || 0;
                const rate = Number(inst.rate_per_student || inst.ratePerStudent || 200);
                const totalPayable = count * rate;

                if (totalPayable > 0) {
                    const billId = `bill_${Date.now()}_${inst.id.slice(-4)}`;
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

                    const newBill = {
                        id: billId,
                        institution_id: inst.id,
                        billing_period_start: anchor.toISOString(),
                        billing_period_end: today.toISOString(),
                        student_count: count,
                        rate_per_student: rate,
                        total_amount: totalPayable,
                        status: 'pending',
                        due_at: dueDate.toISOString(),
                        created_at: today.toISOString()
                    };

                    const { error: billInsertError } = await supabase
                        .from('tenant_bills')
                        .insert(newBill);

                    if (billInsertError) {
                        console.error(`[DS Cron Billing] Failed to insert bill for ${inst.name}:`, billInsertError);
                        continue;
                    }

                    // Update cycle anchor to prevent duplicate bills
                    await supabase
                        .from('institutions')
                        .update({ billing_cycle_anchor: today.toISOString() })
                        .eq('id', inst.id);

                    console.log(`[DS Cron Billing] Invoice generated: ${billId} for KES ${totalPayable}`);

                    // Send Email Invoice Notification
                    if (emailConfig && inst.email) {
                        try {
                            const transporter = nodemailer.createTransport({
                                host: emailConfig.host,
                                port: Number(emailConfig.port || 587),
                                auth: { user: emailConfig.username, pass: emailConfig.password },
                                tls: { rejectUnauthorized: false }
                            });

                            const htmlContent = wrapHtml(`
                                <h2 style="color: ${branding.primaryColor}; margin-top: 0;">Monthly Driving School Student Registration Invoice</h2>
                                <p>Hello Admin,</p>
                                <p>This is your consolidated monthly bill for student registrations enrolled at <strong>${inst.name}</strong> from <strong>${anchor.toLocaleDateString()}</strong> to <strong>${today.toLocaleDateString()}</strong>.</p>
                                
                                <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; width: 45%;">Bill Reference</td>
                                            <td style="padding: 8px 0; color: #1e293b; font-weight: 800; font-size: 15px;">${billId}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Students Registered</td>
                                            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 15px;">${count}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Rate per Student</td>
                                            <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 15px;">KES ${rate.toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Total Payable</td>
                                            <td style="padding: 8px 0; color: ${branding.primaryColor}; font-weight: 800; font-size: 16px;">KES ${totalPayable.toLocaleString()}.00</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Due Date</td>
                                            <td style="padding: 8px 0; color: #ef4444; font-weight: 800; font-size: 15px;">${dueDate.toLocaleDateString()}</td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <p>Please complete payment from your portal within 7 days to avoid access disruptions.</p>
                                <p style="margin-bottom: 0;">Thank you for your business!</p>
                            `, branding);

                            await transporter.sendMail({
                                from: `"${branding.name}" <${emailConfig.fromEmail || emailConfig.username}>`,
                                to: inst.email,
                                subject: `Monthly Student Enrollment Invoice ${billId} - ${inst.name}`,
                                html: htmlContent
                            });
                        } catch (emailErr) {
                            console.error(`[DS Cron Billing] Failed to send email for ${inst.name}:`, emailErr);
                        }
                    }

                    results.push({
                        institutionId: inst.id,
                        name: inst.name,
                        billId,
                        studentsCount: count,
                        amount: totalPayable,
                        status: 'billed'
                    });
                } else {
                    // No students registered in the 30 days cycle, just update cycle anchor to today
                    await supabase
                        .from('institutions')
                        .update({ billing_cycle_anchor: today.toISOString() })
                        .eq('id', inst.id);
                }
            }
        }

        // --- Step B: Check for overdue bills and suspend access ---
        // Fetch overdue bills (corrected phoneNumber to phone_number to match schema)
        const { data: overdueBills, error: overdueFetchErr } = await supabase
            .from('tenant_bills')
            .select('*, institutions(name, email, phone_number)')
            .eq('status', 'pending')
            .lt('due_at', today.toISOString());

        if (overdueFetchErr) {
            console.error('[DS Cron Billing] Database error fetching overdue bills:', overdueFetchErr);
        } else if (overdueBills && overdueBills.length > 0) {
            console.log(`[DS Cron Billing] Found ${overdueBills.length} overdue bills. Commencing suspensions...`);
            
            for (const bill of overdueBills) {
                // 1. Mark bill status as overdue
                await supabase
                    .from('tenant_bills')
                    .update({ status: 'overdue' })
                    .eq('id', bill.id);

                // 2. Suspend institution
                await supabase
                    .from('institutions')
                    .update({ is_suspended_for_billing: true })
                    .eq('id', bill.institution_id);

                console.log(`[DS Cron Billing] Suspended institution ${bill.institution_id} due to overdue bill ${bill.id}`);

                // Send email/SMS notifications of suspension
                const instDetails = bill.institutions;
                if (emailConfig && instDetails?.email) {
                    try {
                        const transporter = nodemailer.createTransport({
                            host: emailConfig.host,
                            port: Number(emailConfig.port || 587),
                            auth: { user: emailConfig.username, pass: emailConfig.password },
                            tls: { rejectUnauthorized: false }
                        });

                        const htmlContent = wrapHtml(`
                            <h2 style="color: #ef4444; margin-top: 0;">Account Suspension Notice</h2>
                            <p>Hello Admin,</p>
                            <p>This is to inform you that access for <strong>${instDetails.name}</strong> has been suspended due to an overdue student registration monthly bill.</p>
                            <p>Details of the overdue invoice:</p>
                            
                            <div style="background-color: #fef2f2; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #fee2e2;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #991b1b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; width: 45%;">Bill Reference</td>
                                        <td style="padding: 8px 0; color: #991b1b; font-weight: 800; font-size: 15px;">${bill.id}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #991b1b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Total Payable</td>
                                        <td style="padding: 8px 0; color: #991b1b; font-weight: 800; font-size: 16px;">KES ${Number(bill.total_amount).toLocaleString()}.00</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #991b1b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Due Date</td>
                                        <td style="padding: 8px 0; color: #991b1b; font-weight: 800; font-size: 15px;">${new Date(bill.due_at).toLocaleDateString()}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <p>To restore access and unlock student enrolment, please settle the outstanding bill immediately from your administrative login portal.</p>
                        `, branding);

                        await transporter.sendMail({
                            from: `"${branding.name}" <${emailConfig.fromEmail || emailConfig.username}>`,
                            to: instDetails.email,
                            subject: `URGENT: Suspension Notice for Overdue Invoice ${bill.id} - ${instDetails.name}`,
                            html: htmlContent
                        });
                    } catch (emailErr) {
                        console.error(`[DS Cron Billing] Failed to send suspension email to ${instDetails.email}:`, emailErr);
                    }
                }

                results.push({
                    institutionId: bill.institution_id,
                    name: instDetails?.name,
                    billId: bill.id,
                    amount: bill.total_amount,
                    status: 'suspended'
                });
            }
        }

        console.log(`[DS Cron Billing] Completed run. Action count: ${results.length}`);
        return res.status(200).json({ success: true, processed: results });
    } catch (e: any) {
        console.error('[DS Cron Billing] Uncaught exception:', e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
