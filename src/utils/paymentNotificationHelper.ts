/**
 * Payment Notification Helper
 * Provides custom notification templates and formatters for institutional bank & collection accounts.
 */

export const DEFAULT_PAYMENT_NOTIFICATION_TEMPLATE = `Dear parent,
Student: {adm_no} - {student_name}
Class: {class_name}
Term: {academic_year} - {term}
Charged: {charged}
Adjusted: {adjusted}
Paid: {paid}
Bal: {balance} as at {timestamp}

{payment_instructions}`;

export const DEFAULT_SAMPLE_PAYMENT_INSTRUCTIONS = `Fees should be paid by Bankers cheque or direct deposit to KCB A/C 1107881838 or Mpesa paybill 522533 Account no. 7789000#admno.For those paying via bank transfer please send the message/proof of pay to 0729328079(patrick)`;

/**
 * Formats a timestamp in Kenyan school standard format: '24-Sep-26 14:40:25'
 */
export function formatPaymentNotificationTimestamp(dateInput?: string | Date): string {
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
}

/**
 * Formats monetary amounts with commas and 2 decimal places: '50,300.00'
 */
export function formatCurrencyAmount(val: number | string | undefined | null): string {
    const num = Number(val) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface PaymentNotificationParams {
    account?: {
        bankName?: string;
        accountName?: string;
        accountNumber?: string;
        paymentNotificationTemplate?: string;
        paymentInstructions?: string;
        enableCustomNotification?: boolean;
        [key: string]: any;
    } | null;
    student?: {
        name?: string;
        admissionNumber?: string;
        admission_number?: string;
        admNo?: string;
        grade?: string;
        class?: string;
        className?: string;
        stream?: string;
        [key: string]: any;
    } | null;
    enrollment?: {
        className?: string;
        class_name?: string;
        stream?: string;
        grade?: string;
        [key: string]: any;
    } | null;
    paymentAmount: number;
    totalCharged?: number;
    totalAdjusted?: number;
    currentBalance?: number;
    paymentDate?: string | Date;
    institutionName?: string;
    academicTerm?: string;
    academicYear?: string;
    receiptNumber?: string;
}

/**
 * Builds the personalized SMS / notification string using the account's custom template
 */
export function buildCustomPaymentNotification(params: PaymentNotificationParams): string {
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

    // Student identity details
    const studentName = student?.name || 'Student';
    const admNo = String(student?.admissionNumber || student?.admission_number || student?.admNo || student?.id || '').trim();
    
    // Class / Form / Stream resolution
    let className = enrollment?.className || enrollment?.class_name || student?.className || student?.grade || student?.class || '';
    if (enrollment?.stream && !className.includes(enrollment.stream)) {
        className = `${className} - ${enrollment.stream}`;
    }
    if (!className) className = 'Student';

    // Term & Year resolution (defaulting to current term/year if not provided)
    const now = new Date();
    const currentYear = academicYear || String(now.getFullYear());
    let termText = academicTerm || '';
    if (!termText) {
        const month = now.getMonth() + 1;
        if (month <= 4) termText = 'Term I';
        else if (month <= 8) termText = 'Term II';
        else termText = 'Term III';
    }

    // Money formatting
    const paidFormatted = formatCurrencyAmount(paymentAmount);
    const chargedFormatted = formatCurrencyAmount(totalCharged ?? (Number(currentBalance || 0) + Number(paymentAmount)));
    const adjustedFormatted = formatCurrencyAmount(totalAdjusted);
    const balanceFormatted = formatCurrencyAmount(currentBalance ?? 0);
    const timestampFormatted = formatPaymentNotificationTimestamp(paymentDate);

    // Account instructions
    let instructions = account?.paymentInstructions?.trim() || '';
    if (!instructions && account?.accountNumber) {
        instructions = `Fees should be paid to ${account.bankName || 'Bank'} A/C ${account.accountNumber}${account.accountName ? ` (${account.accountName})` : ''}. Thank you.`;
    }

    // Template selection
    const isCustomEnabled = account?.enableCustomNotification !== false;
    let template = (isCustomEnabled && account?.paymentNotificationTemplate?.trim()) 
        ? account.paymentNotificationTemplate.trim() 
        : DEFAULT_PAYMENT_NOTIFICATION_TEMPLATE;

    // Replace all variable tokens
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
        .replace(/\{payment_instructions\}/gi, instructions)
        .replace(/\{account_instructions\}/gi, instructions)
        .replace(/\{instructions\}/gi, instructions)
        .replace(/\{bank_name\}/gi, account?.bankName || '')
        .replace(/\{account_number\}/gi, account?.accountNumber || '')
        .replace(/\{account_name\}/gi, account?.accountName || '')
        .replace(/\{school_name\}/gi, institutionName);

    // If payment_instructions tag was omitted from template but instructions exist, append it cleanly
    if (!template.includes('{payment_instructions}') && !template.includes('{instructions}') && instructions) {
        message = `${message}\n\n${instructions}`;
    }

    return message.trim();
}

/**
 * Generates sample preview text for an account's template editor
 */
export function previewCustomPaymentNotification(
    template?: string, 
    instructions?: string, 
    account?: any,
    institutionName: string = 'School'
): string {
    const sampleAccount = {
        bankName: account?.bankName || 'KCB Bank',
        accountName: account?.accountName || 'Operations Account',
        accountNumber: account?.accountNumber || '1107881838',
        paymentNotificationTemplate: template || DEFAULT_PAYMENT_NOTIFICATION_TEMPLATE,
        paymentInstructions: instructions || DEFAULT_SAMPLE_PAYMENT_INSTRUCTIONS,
        enableCustomNotification: true
    };

    return buildCustomPaymentNotification({
        account: sampleAccount,
        student: {
            name: 'Felin Kiptoo Choge',
            admissionNumber: '5914'
        },
        enrollment: {
            className: 'Form 4',
            stream: 'N'
        },
        paymentAmount: 25000,
        totalCharged: 50300,
        totalAdjusted: 0,
        currentBalance: 25300,
        paymentDate: '2026-09-24T14:40:25',
        institutionName,
        academicTerm: 'Term III',
        academicYear: '2026',
        receiptNumber: 'RCT-2026-5914'
    });
}
