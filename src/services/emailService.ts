
import type { Invoice, Receipt, MpesaTransaction, Institution, CompanyDetails, EmailConfig, TimetableEntry, Subject, Room, SmsConfig } from '../types';
import { apiService } from './apiService';

/**
 * Sends an email notification using the backend API.
 */
export const sendEmailNotification = async (
    recipientEmail: string,
    subject: string,
    body: string,
    emailConfig?: EmailConfig,
    companyName?: string
): Promise<{ success: boolean; message: string }> => {
    try {
        const result = await apiService.sendEmail(recipientEmail, subject, body, emailConfig);
        return result;
    } catch (error: any) {
        console.error("Email Sending Error:", error);
        return { success: false, message: error.message || "Failed to send email." };
    }
};

/**
 * Generates an EmailConfig using the institution's details as the 'from' sender.
 * This can be used to override the default sender while still using system SMTP settings
 * if the institution hasn't configured their own.
 */
export const getInstitutionEmailConfig = (institution: { name: string; email: string }, existingConfig?: EmailConfig): EmailConfig => {
    return {
        ...(existingConfig || { provider: 'smtp', fromName: institution.name, fromEmail: institution.email }),
        fromName: institution.name,
        fromEmail: institution.email
    };
};


export const generateInvoiceEmailBody = (invoice: Invoice, institution: Institution, companyDetails: CompanyDetails): string => {
    return `
Dear ${institution.name},

New invoice ${invoice.invoiceNumber} from ${companyDetails.name}.
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
 * Sends an SMS using the backend API.
 */
export const sendSms = async (
    recipient: string,
    message: string,
    config?: SmsConfig
): Promise<{ success: boolean; message: string }> => {
    try {
        const result = await apiService.sendSms(recipient, message, config);
        return result;
    } catch (error: any) {
        console.error("SMS Sending Error:", error);
        return { success: false, message: error.message || "Failed to send SMS." };
    }
};
