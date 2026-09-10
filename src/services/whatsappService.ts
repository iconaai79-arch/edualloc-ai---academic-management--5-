import { apiService } from './apiService';

export interface WhatsAppConfig {
    id?: string;
    institution_id: string;
    provider_type: 'gateway' | 'meta_cloud';
    gateway_url?: string;
    api_key?: string;
    instance_name?: string;
    phone_number?: string;
    is_connected?: boolean;
    qr_code_data?: string;
    meta_phone_number_id?: string;
    meta_access_token?: string;
    meta_waba_id?: string;
    auto_send_receipts?: boolean;
    auto_send_fee_reminders?: boolean;
    auto_send_academic_results?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface WhatsAppLog {
    id: string;
    institution_id: string;
    recipient: string;
    recipient_name?: string;
    message_type: 'text' | 'document' | 'receipt' | 'fee_reminder' | 'academic_results' | 'broadcast';
    content?: string;
    media_url?: string;
    file_name?: string;
    status: 'queued' | 'sent' | 'delivered' | 'failed';
    error_message?: string;
    created_at: string;
}

export interface WhatsAppStatusResponse {
    success: boolean;
    isConnected: boolean;
    phoneNumber?: string;
    qrCode?: string; // Base64 or ASCII QR string
    providerType: 'gateway' | 'meta_cloud';
    message?: string;
}

export interface SendWhatsAppParams {
    institutionId: string;
    recipient: string;
    recipientName?: string;
    message: string;
    mediaUrl?: string;
    fileName?: string;
    messageType?: 'text' | 'document' | 'receipt' | 'fee_reminder' | 'academic_results' | 'broadcast';
    configOverride?: Partial<WhatsAppConfig>;
}

export const formatWhatsAppTemplate = (
    template: string,
    tokens: Record<string, string | number | undefined | null>
): string => {
    let result = template;
    for (const [key, value] of Object.entries(tokens)) {
        const placeholder = new RegExp(`\\{${key}\\}`, 'gi');
        result = result.replace(placeholder, value !== undefined && value !== null ? String(value) : '');
    }
    return result;
};

export const whatsappService = {
    /**
     * Query live connection status and QR code for an institution
     */
    async getStatus(institutionId: string): Promise<WhatsAppStatusResponse> {
        try {
            const res = await apiService.post('/api/integrations', {
                action: 'getWhatsAppStatus',
                institutionId
            });
            return res || { success: false, isConnected: false, providerType: 'gateway' };
        } catch (error: any) {
            return {
                success: false,
                isConnected: false,
                providerType: 'gateway',
                message: error?.message || 'Failed to fetch WhatsApp gateway status'
            };
        }
    },

    /**
     * Provision or verify an Evolution API gateway instance
     */
    async provisionInstance(params: {
        gatewayUrl: string;
        apiKey: string;
        instanceName: string;
        institutionId?: string;
    }): Promise<{ success: boolean; message: string; alreadyExists?: boolean }> {
        try {
            const res = await apiService.post('/api/integrations', {
                action: 'provisionWhatsAppInstance',
                ...params
            });
            return res || { success: false, message: 'No response from server' };
        } catch (error: any) {
            return {
                success: false,
                message: error?.message || 'Failed to provision instance'
            };
        }
    },

    /**
     * Send a WhatsApp message (Text or Document attachment)
     */
    async sendMessage(params: SendWhatsAppParams): Promise<{ success: boolean; messageId?: string; message?: string }> {
        try {
            const cleanPhone = String(params.recipient || '').replace(/[^0-9+]/g, '');
            if (!cleanPhone || cleanPhone.length < 9) {
                throw new Error('Invalid WhatsApp recipient phone number');
            }

            const res = await apiService.post('/api/integrations', {
                action: 'sendWhatsApp',
                ...params,
                recipient: cleanPhone
            });
            return res || { success: true };
        } catch (error: any) {
            console.error('[WhatsAppService] Send error:', error);
            return {
                success: false,
                message: error?.message || 'Failed to send WhatsApp message'
            };
        }
    },

    /**
     * Unpair WhatsApp session from the gateway
     */
    async disconnect(institutionId: string): Promise<{ success: boolean; message?: string }> {
        try {
            return await apiService.post('/api/integrations', {
                action: 'disconnectWhatsApp',
                institutionId
            });
        } catch (error: any) {
            return {
                success: false,
                message: error?.message || 'Failed to disconnect WhatsApp session'
            };
        }
    },

    /**
     * Fetch recent WhatsApp communication logs
     */
    async getLogs(institutionId?: string, limit = 50): Promise<{ success: boolean; logs: WhatsAppLog[]; message?: string }> {
        try {
            const res = await apiService.post('/api/integrations', {
                action: 'getWhatsAppLogs',
                institutionId: institutionId || 'global',
                limit
            });
            return {
                success: res?.success ?? true,
                logs: res?.logs || []
            };
        } catch (error: any) {
            console.error('[WhatsAppService] getLogs error:', error);
            return {
                success: false,
                logs: [],
                message: error?.message || 'Failed to fetch WhatsApp logs'
            };
        }
    },

    /**
     * Save WhatsApp configuration to database via server API (using Service Role)
     */
    async saveConfig(config: Partial<WhatsAppConfig>): Promise<{ success: boolean; data?: any; message?: string }> {
        try {
            const res = await apiService.post('/api/integrations', {
                action: 'saveWhatsAppConfig',
                config
            });
            return res || { success: true };
        } catch (error: any) {
            return {
                success: false,
                message: error?.message || 'Failed to save WhatsApp configuration'
            };
        }
    },


    /**
     * Send instant payment receipt over WhatsApp
     */
    async sendPaymentReceipt(params: {
        institutionId: string;
        schoolName: string;
        recipientPhone: string;
        studentName: string;
        admNo: string;
        amount: number;
        receiptNumber: string;
        paymentMethod: string;
        receiptUrl?: string;
    }): Promise<{ success: boolean; message?: string }> {
        const receiptLink = params.receiptUrl || `${window.location.origin}/?receipt=${params.receiptNumber}`;
        const message = 
`🧾 *PAYMENT RECEIPT: ${params.receiptNumber}*
━━━━━━━━━━━━━━━━━━━━
🏫 *${params.schoolName}*
👤 *Student:* ${params.studentName} (${params.admNo || 'No Adm'})
💰 *Amount Received:* KES ${params.amount.toLocaleString()}
💳 *Payment Method:* ${params.paymentMethod}
📅 *Date:* ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}

Thank you for your payment. You can view or download the official stamped receipt here:
🔗 ${receiptLink}
━━━━━━━━━━━━━━━━━━━━`;

        return this.sendMessage({
            institutionId: params.institutionId,
            recipient: params.recipientPhone,
            recipientName: params.studentName,
            message,
            mediaUrl: receiptLink,
            fileName: `Receipt_${params.receiptNumber}.pdf`,
            messageType: 'receipt'
        });
    },

    /**
     * Send fee balance reminder over WhatsApp
     */
    async sendFeeBalanceReminder(params: {
        institutionId: string;
        schoolName: string;
        recipientPhone: string;
        studentName: string;
        admNo: string;
        balance: number;
        paybillNumber?: string;
        accountNumber?: string;
        portalUrl?: string;
    }): Promise<{ success: boolean; message?: string }> {
        const paybillInfo = params.paybillNumber 
            ? `\n\n💳 *M-Pesa Payment Details:*\n• *Paybill / Till:* ${params.paybillNumber}\n• *Account No:* ${params.accountNumber || params.admNo}`
            : '';

        const portalLink = params.portalUrl || `${window.location.origin}`;
        const message = 
`📢 *FEE BALANCE NOTIFICATION*
━━━━━━━━━━━━━━━━━━━━
🏫 *${params.schoolName}*
Dear Parent/Guardian,

This is a reminder regarding learner *${params.studentName}* (Adm: *${params.admNo || 'N/A'}*).

⚠️ *Outstanding Balance:* *KES ${params.balance.toLocaleString()}*${paybillInfo}

Please settle the due balance to ensure uninterrupted learning.
View fee breakdown & statement online:
🔗 ${portalLink}

Thank you for your continued partnership.
━━━━━━━━━━━━━━━━━━━━`;

        return this.sendMessage({
            institutionId: params.institutionId,
            recipient: params.recipientPhone,
            recipientName: params.studentName,
            message,
            messageType: 'fee_reminder'
        });
    },

    /**
     * Send term academic results over WhatsApp
     */
    async sendAcademicResults(params: {
        institutionId: string;
        schoolName: string;
        recipientPhone: string;
        studentName: string;
        admNo: string;
        term: string;
        year: string | number;
        meanGrade: string;
        totalPoints?: string | number;
        rank?: string;
        reportCardUrl?: string;
    }): Promise<{ success: boolean; message?: string }> {
        const reportLink = params.reportCardUrl || `${window.location.origin}`;
        const rankInfo = params.rank ? `\n🏅 *Position / Rank:* ${params.rank}` : '';
        const pointsInfo = params.totalPoints ? `\n📊 *Total Score / Points:* ${params.totalPoints}` : '';

        const message = 
`🎓 *ACADEMIC PROGRESS REPORT*
━━━━━━━━━━━━━━━━━━━━
🏫 *${params.schoolName}*
📅 *${params.term} (${params.year})*

Learner: *${params.studentName}* (Adm: *${params.admNo || 'N/A'}*)
⭐ *Overall Grade:* *${params.meanGrade}*${rankInfo}${pointsInfo}

Download and view the official term report card with subject breakdown & teacher remarks:
🔗 ${reportLink}

Congratulations to our learner on their efforts!
━━━━━━━━━━━━━━━━━━━━`;

        return this.sendMessage({
            institutionId: params.institutionId,
            recipient: params.recipientPhone,
            recipientName: params.studentName,
            message,
            mediaUrl: params.reportCardUrl,
            fileName: `ReportCard_${params.studentName.replace(/\s+/g, '_')}_${params.term}.pdf`,
            messageType: 'academic_results'
        });
    }
};
