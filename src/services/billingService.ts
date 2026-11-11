import type { Institution, CompanyDetails, Invoice, Receipt, InvoiceItem, MpesaTransaction } from '../types';
import { apiService } from './apiService';
import { generateReceiptPdfDataUri, generateInvoicePdfDataUri } from './pdfService';

export interface PaymentCompletionPayload {
    institution: Institution;
    companyDetails?: CompanyDetails;
    amount: number;
    phoneNumber?: string;
    payerName?: string;
    payerEmail?: string;
    transactionId?: string;
    provider?: string;
    paymentMethod?: string;
    items: InvoiceItem[];
    packageName?: string;
    billingCycle?: string;
    studentCount?: number;
    smsAllocated?: number;
}

export interface BillingAutomationResult {
    success: boolean;
    invoice: Invoice;
    receipt: Receipt;
    receiptPdfUri?: string;
    invoicePdfUri?: string;
    emailSent: boolean;
}

export const billingService = {
    /**
     * Complete Post-Payment Automation:
     * 1. Generates & saves official Invoice (status: 'paid')
     * 2. Generates & saves official Receipt
     * 3. Generates PDF Data URIs
     * 4. Auto-emails the client with itemized HTML receipt & confirmation
     * 5. Allocates SMS pool & updates institution subscription dates
     */
    async processSuccessfulPaymentAndAutoEmail(payload: PaymentCompletionPayload): Promise<BillingAutomationResult> {
        const {
            institution,
            companyDetails,
            amount,
            phoneNumber = '',
            payerName = 'School Administrator',
            payerEmail,
            transactionId = `TXN_${Date.now()}`,
            provider = 'mpesa',
            items = [],
            packageName = 'Student Academic Plan',
            billingCycle = 'per_term',
            studentCount = 1,
            smsAllocated = 0
        } = payload;

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        
        // Calculate due / expiry date (4 months for term, 1 year for annual, 1 month for monthly)
        const expiryDate = new Date(now);
        if (billingCycle === 'per_year' || billingCycle === 'yearly') {
            expiryDate.setFullYear(now.getFullYear() + 1);
        } else if (billingCycle === 'per_term' || billingCycle === 'quarterly') {
            expiryDate.setMonth(now.getMonth() + 4);
        } else {
            expiryDate.setMonth(now.getMonth() + 1);
        }
        const expiryDateStr = expiryDate.toISOString().split('T')[0];

        const randomSuffix = Math.floor(10000 + Math.random() * 90000);
        const invoiceNumber = `INV-${now.getFullYear()}-${randomSuffix}`;
        const receiptNumber = `RCT-${now.getFullYear()}-${randomSuffix}`;

        // 1. Create Invoice Record
        const invoice: Invoice = {
            id: `inv_${Date.now()}_${randomSuffix}`,
            institutionId: institution.id,
            invoiceNumber,
            issueDate: dateStr,
            dueDate: dateStr,
            items: items.length > 0 ? items : [{
                description: `${packageName} (${billingCycle.replace('_', ' ')}) for ${studentCount} Students`,
                quantity: studentCount,
                unitPrice: studentCount > 0 ? Math.round(amount / studentCount) : amount,
                amount: amount
            }],
            totalAmount: amount,
            status: 'paid'
        };

        // 2. Create Receipt Record
        const receipt: Receipt = {
            id: `rcpt_${Date.now()}_${randomSuffix}`,
            institutionId: institution.id,
            receiptNumber,
            invoiceId: invoice.id,
            paymentDate: dateStr,
            amountPaid: amount,
            paymentMethod: provider.toUpperCase() as any
        };

        // 3. Create Transaction Record
        const proxyTransaction: MpesaTransaction = {
            id: `txn_${Date.now()}`,
            institutionId: institution.id,
            transactionId,
            amount,
            phoneNumber,
            payerName,
            timestamp: now.toISOString(),
            status: 'completed',
            provider: provider.toLowerCase() as any,
            paymentMethod: 'stk_push'
        };

        // Save records to database/localStorage
        try {
            await Promise.all([
                apiService.saveModuleRecord('invoices', invoice).catch(() => {}),
                apiService.saveModuleRecord('receipts', receipt).catch(() => {}),
                apiService.saveModuleRecord('mpesa_transactions', proxyTransaction).catch(() => {})
            ]);

            // Save to tenant local arrays
            const existingInvoices = JSON.parse(localStorage.getItem(`eduai_invoices_${institution.id}`) || '[]');
            localStorage.setItem(`eduai_invoices_${institution.id}`, JSON.stringify([invoice, ...existingInvoices]));

            const existingReceipts = JSON.parse(localStorage.getItem(`eduai_receipts_${institution.id}`) || '[]');
            localStorage.setItem(`eduai_receipts_${institution.id}`, JSON.stringify([receipt, ...existingReceipts]));
        } catch (e) {
            console.warn('[BillingService] Failed to persist billing records:', e);
        }

        // 4. Generate PDF Documents
        let receiptPdfUri = '';
        let invoicePdfUri = '';
        const resolvedCompany: CompanyDetails = companyDetails || {
            name: 'EduAI Automation Hub',
            address: 'Nairobi, Kenya',
            email: 'billing@eduai.co.ke',
            phone: '+254 700 000 000',
            website: 'https://portal.eduai.co.ke'
        } as any;

        try {
            receiptPdfUri = await generateReceiptPdfDataUri(
                receipt,
                proxyTransaction,
                institution,
                resolvedCompany,
                institution.logoUrl || null
            );
        } catch (pdfErr) {
            console.warn('[BillingService] PDF Receipt generation warning:', pdfErr);
        }

        try {
            invoicePdfUri = await generateInvoicePdfDataUri(
                invoice,
                institution,
                resolvedCompany,
                institution.logoUrl || null
            );
        } catch (pdfErr) {
            console.warn('[BillingService] PDF Invoice generation warning:', pdfErr);
        }

        // 5. Update Institution Subscription & SMS Allocation
        try {
            const currentSmsBalance = (institution as any).smsBalance || (institution as any).sms_balance || 0;
            const updatedSmsBalance = currentSmsBalance + smsAllocated;

            const newExpiryIso = expiryDate.toISOString();
            await apiService.saveInstitution({
                ...institution,
                status: 'active',
                subscriptionEndsAt: newExpiryIso,
                subscription_ends_at: newExpiryIso,
                isSuspendedForBilling: false,
                is_suspended_for_billing: false,
                smsBalance: updatedSmsBalance,
                sms_balance: updatedSmsBalance
            } as any).catch(() => {});
            await apiService.extendModuleSubscription(institution.id, 'all', 30, 'active', newExpiryIso).catch(() => {});
        } catch (instErr) {
            console.warn('[BillingService] Failed to update institution subscription status:', instErr);
        }

        // 6. Auto-Email Receipt & Invoice to Client
        const targetEmail = payerEmail || institution.email || (institution as any).adminEmail || (institution as any).contactEmail;
        let emailSent = false;

        if (targetEmail) {
            const emailSubject = `Official Receipt #${receiptNumber} & Invoice Confirmation — ${institution.name}`;
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                    <div style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 20px;">
                        <h2 style="color: #4f46e5; margin: 0; font-size: 22px; text-transform: uppercase;">Payment Receipt & Subscription Confirmation</h2>
                        <p style="color: #64748b; font-size: 12px; margin-top: 4px;">EduAI Automation Hub · Official Transaction Confirmation</p>
                    </div>

                    <p style="font-size: 14px;">Dear <strong>${payerName || institution.name}</strong>,</p>
                    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                        Thank you for your payment. Your subscription package for <strong>${institution.name}</strong> has been successfully activated.
                    </p>

                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <h3 style="margin-top: 0; font-size: 14px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; text-transform: uppercase;">
                            Transaction Summary
                        </h3>
                        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;">Receipt Number:</td>
                                <td style="padding: 6px 0; font-weight: bold; text-align: right;">${receiptNumber}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;">Invoice Reference:</td>
                                <td style="padding: 6px 0; font-weight: bold; text-align: right;">${invoiceNumber}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;">Transaction Reference:</td>
                                <td style="padding: 6px 0; font-family: monospace; text-align: right;">${transactionId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;">Package Subscribed:</td>
                                <td style="padding: 6px 0; font-weight: bold; color: #4f46e5; text-align: right;">${packageName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;">Enrolled Learners:</td>
                                <td style="padding: 6px 0; font-weight: bold; text-align: right;">${studentCount} Students</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;">Allocated SMS Pool:</td>
                                <td style="padding: 6px 0; font-weight: bold; color: #d97706; text-align: right;">+${smsAllocated.toLocaleString()} SMS</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b;">Active Period:</td>
                                <td style="padding: 6px 0; font-weight: bold; text-align: right;">${dateStr} to ${expiryDateStr}</td>
                            </tr>
                            <tr style="border-top: 2px solid #cbd5e1;">
                                <td style="padding: 10px 0; font-size: 15px; font-weight: bold; color: #0f172a;">Total Amount Paid:</td>
                                <td style="padding: 10px 0; font-size: 16px; font-weight: bold; color: #059669; text-align: right;">KES ${amount.toLocaleString()}.00</td>
                            </tr>
                        </table>
                    </div>

                    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                        Your official printable PDF Receipt and Invoice have been archived into your portal billing history. You can download and print them at any time from your <strong>Subscription & Billing</strong> dashboard.
                    </p>

                    <div style="text-align: center; margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
                        <p style="margin: 0;">EduAI Academic & Institutional Management Platform</p>
                        <p style="margin: 4px 0 0;">Need assistance? Contact our 24/7 billing support at billing@eduai.co.ke</p>
                    </div>
                </div>
            `;

            try {
                const mailRes = await fetch('/api/system?action=sendEmail', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: targetEmail,
                        subject: emailSubject,
                        html: emailHtml
                    })
                });
                const mailData = await mailRes.json();
                emailSent = !!mailData?.success;
                console.log(`[BillingService] Dispatched confirmation email to ${targetEmail}:`, mailData);
            } catch (mailSendErr) {
                console.warn('[BillingService] Failed to dispatch email via API:', mailSendErr);
            }
        }

        return {
            success: true,
            invoice,
            receipt,
            receiptPdfUri,
            invoicePdfUri,
            emailSent
        };
    },

    /**
     * Trigger instant browser download of a PDF data URI
     */
    downloadPdfUri(dataUri: string, filename: string) {
        if (!dataUri) return;
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
