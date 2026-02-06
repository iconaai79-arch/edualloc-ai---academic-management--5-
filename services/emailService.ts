
import type { Invoice, Receipt, MpesaTransaction, Institution, CompanyDetails, EmailConfig, TimetableEntry, Subject, Room, SmsConfig } from '../types';

/**
 * Simulates sending an email notification.
 */
export const sendEmailNotification = async (
    recipientEmail: string,
    subject: string,
    body: string,
    emailConfig: EmailConfig,
    companyName: string
): Promise<{ success: boolean; message: string }> => {
    
    if (!emailConfig.host || !emailConfig.fromEmail) {
        const message = `Email not sent: SMTP is not configured.`;
        console.warn(message);
        return { success: false, message };
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.group("📧 Sending Email (Simulation)");
    console.log(`- To: ${recipientEmail}`);
    console.log(`- Subject: ${subject}`);
    console.log(body);
    console.groupEnd();

    return { success: true, message: `Email successfully sent to ${recipientEmail}.` };
};


export const generateInvoiceEmailBody = (invoice: Invoice, institution: Institution, companyDetails: CompanyDetails): string => {
    return `
Dear ${institution.name},

New invoice ${invoice.invoiceNumber} from ${companyDetails.name}.
/* FIXED: Changed total_amount to totalAmount and due_date to dueDate to match type definitions */
Amount Due: KES ${invoice.totalAmount.toLocaleString()}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}

Regards,
The ${companyDetails.name} Team
    `;
};

export const generateReceiptEmailBody = (receipt: Receipt, institution: Institution, companyDetails: CompanyDetails): string => {
     return `
Dear ${institution.name},

Official receipt ${receipt.receiptNumber}.
/* FIXED: Changed amount_paid to amountPaid, payment_date to paymentDate, and paid_for to paidFor to match type definitions */
Amount Paid: KES ${receipt.amountPaid.toLocaleString()}
Payment Date: ${new Date(receipt.paymentDate).toLocaleDateString()}
Paid For: ${receipt.paidFor}

Thank you,
The ${companyDetails.name} Team
    `;
};

export const generateDailyScheduleEmailBody = (
    lecturerName: string,
    todaysEntries: TimetableEntry[],
    getSubjectById: (id: string) => Subject | undefined,
    getRoomById: (id: string) => Room | undefined
): string => {
    if (todaysEntries.length === 0) {
        return `Dear ${lecturerName}, you have no lessons scheduled for today.`;
    }

    const scheduleList = todaysEntries
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map(entry => {
            const subject = getSubjectById(entry.subjectId);
            const room = getRoomById(entry.roomId);
            return `- ${entry.startTime} - ${entry.endTime}: ${subject?.name} in Room ${room?.name}`;
        })
        .join('\n');

    return `Dear ${lecturerName}, schedule for today:\n\n${scheduleList}`;
};

/**
 * Simulates sending an SMS.
 */
export const sendSms = async (
    recipient: string,
    message: string,
    config: SmsConfig
): Promise<{ success: boolean; message: string }> => {
    if (!config.apiKey || !config.apiSecret || !config.fromNumber) {
        return { success: false, message: "SMS config missing." };
    }
    console.log(`SMS to ${recipient}: ${message}`);
    return { success: true, message: "SMS sent successfully (Simulation)." };
};
