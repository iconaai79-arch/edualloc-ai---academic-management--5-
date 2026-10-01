import { safeLocalStorage } from './apiService';
import type { 
    NcbaConfig, 
    NcbaB2cMpesaRequest, 
    NcbaB2cMpesaResponse, 
    NcbaMpesaValidationResponse,
    NcbaIftRequest,
    NcbaEftRequest,
    NcbaPesaLinkRequest,
    NcbaMiniStatementResponse
} from '../types';

export class NcbaOpenBankingService {
    private baseUrl = '/api/openBanking';

    private async callEndpoint<T>(action: string, payload: any = {}, config?: Partial<NcbaConfig>): Promise<T> {
        const storedConfig = this.getStoredConfig();
        const mergedConfig = { ...storedConfig, ...(config || {}) };

        const res = await fetch(`${this.baseUrl}?action=${encodeURIComponent(action)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...payload,
                config: mergedConfig
            })
        });

        const data = await res.json();
        if (!res.ok && !data.succeeded && !data.success) {
            throw new Error(data.message || `NCBA Open Banking error (${res.status})`);
        }
        return data as T;
    }

    /**
     * Retrieve active or cached NCBA Configuration from localStorage
     */
    getStoredConfig(): Partial<NcbaConfig> {
        try {
            const raw = safeLocalStorage.getItem('company_details');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.ncbaConfig) return parsed.ncbaConfig;
            }
        } catch (_) {}
        return {};
    }

    /**
     * Authenticate and retrieve active Bearer access token
     */
    async getAuthToken(config?: Partial<NcbaConfig>): Promise<{ accessToken: string; isMock: boolean }> {
        return this.callEndpoint<{ accessToken: string; isMock: boolean }>('token', {}, config);
    }

    /**
     * B2C Mobile Money Transfer (Disburse Bank to M-Pesa phone number)
     * Limit: KES 50 - KES 250,000 per transaction
     */
    async sendB2cMpesaPayment(params: NcbaB2cMpesaRequest, config?: Partial<NcbaConfig>): Promise<NcbaB2cMpesaResponse> {
        return this.callEndpoint<NcbaB2cMpesaResponse>('b2cMpesa', params, config);
    }

    /**
     * Validate an M-Pesa phone number prior to disbursement
     */
    async validateMpesaRecipient(mobileNumber: string, config?: Partial<NcbaConfig>): Promise<NcbaMpesaValidationResponse> {
        return this.callEndpoint<NcbaMpesaValidationResponse>('validateMpesa', { mobileNumber }, config);
    }

    /**
     * Internal Funds Transfer (IFT) – Real-time transfer to NCBA bank account
     */
    async transferInternalFunds(params: NcbaIftRequest, config?: Partial<NcbaConfig>): Promise<any> {
        return this.callEndpoint('ift', params, config);
    }

    /**
     * Electronic Funds Transfer (EFT) – Local bank accounts via BIC/Branch code
     */
    async transferEft(params: NcbaEftRequest, config?: Partial<NcbaConfig>): Promise<any> {
        return this.callEndpoint('eft', params, config);
    }

    /**
     * PesaLink Payment – Instant 24/7 bank-to-bank transfer
     */
    async transferPesaLink(params: NcbaPesaLinkRequest, config?: Partial<NcbaConfig>): Promise<any> {
        return this.callEndpoint('pesalink', params, config);
    }

    /**
     * Retrieve live account balance and mini-statement
     */
    async getMiniStatement(accountNo?: string, config?: Partial<NcbaConfig>): Promise<NcbaMiniStatementResponse> {
        return this.callEndpoint<NcbaMiniStatementResponse>('miniStatement', { accountNo }, config);
    }

    /**
     * Check transaction status by ID
     */
    async checkTransactionStatus(transactionId: string, config?: Partial<NcbaConfig>): Promise<any> {
        return this.callEndpoint('transactionStatus', { transactionId }, config);
    }

    /**
     * Fetch formal transaction advise / bank receipt details
     */
    async getTransactionAdvise(transactionId: string, config?: Partial<NcbaConfig>): Promise<any> {
        return this.callEndpoint('transactionAdvise', { transactionId }, config);
    }
}

export const ncbaOpenBankingService = new NcbaOpenBankingService();
