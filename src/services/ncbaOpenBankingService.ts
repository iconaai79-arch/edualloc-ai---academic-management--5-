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

        // 55s client-side timeout — just under the 60s Vercel function limit
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), 55000);

        let res: Response;
        try {
            res = await fetch(`${this.baseUrl}?action=${encodeURIComponent(action)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...payload,
                    config: mergedConfig
                }),
                signal: abort.signal
            });
        } catch (fetchErr: any) {
            clearTimeout(timer);
            if (fetchErr.name === 'AbortError') {
                throw new Error(`[ncba] Payment request timed out (${action}). The NCBA API did not respond within 55s.`);
            }
            throw fetchErr;
        } finally {
            clearTimeout(timer);
        }

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
     * Hakikisha – Validate an M-Pesa or Airtel Money phone number prior to disbursement (v3.1 Section 6)
     */
    async validateMpesaRecipient(
        mobileNumber: string,
        config?: Partial<NcbaConfig>,
        provider: 'safaricom' | 'airtel' = 'safaricom'
    ): Promise<NcbaMpesaValidationResponse> {
        return this.callEndpoint<NcbaMpesaValidationResponse>('validateMpesa', { mobileNumber, provider }, config);
    }

    /**
     * PesaLink Account Validation (A1 – v3.1 Section 6)
     */
    async validatePesaLinkAccount(
        params: { targetPic: string; accountToVerify: string; debitAccount?: string },
        config?: Partial<NcbaConfig>
    ): Promise<any> {
        return this.callEndpoint('validatePesaLinkAccount', params, config);
    }

    /**
     * PesaLink Phone Validation (A2 – v3.1 Section 6)
     */
    async validatePesaLinkPhone(
        params: { phoneNumber: string; debitAccount?: string },
        config?: Partial<NcbaConfig>
    ): Promise<any> {
        return this.callEndpoint('validatePesaLinkPhone', params, config);
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
     * RTGS Payment (v3.1 Section 7.4)
     */
    async transferRtgs(
        params: {
            beneficiaryAccountNumber: string;
            beneficiaryBankBic: string;
            beneficiaryName: string;
            beneficiaryAddress?: string;
            amount: number | string;
            purposeCode?: string;
            narration?: string;
            transactionId?: string;
        },
        config?: Partial<NcbaConfig>
    ): Promise<any> {
        return this.callEndpoint('rtgs', params, config);
    }

    /**
     * Retrieve live account balance and mini-statement
     */
    async getMiniStatement(accountNo?: string, config?: Partial<NcbaConfig>): Promise<NcbaMiniStatementResponse> {
        return this.callEndpoint<NcbaMiniStatementResponse>('miniStatement', { accountNo }, config);
    }

    /**
     * Retrieve account statement for a date range (DDMMYYYY, v3.1 Section 5)
     */
    async getAccountStatement(
        params: { accountNo?: string; fromDate: string; toDate: string },
        config?: Partial<NcbaConfig>
    ): Promise<any> {
        return this.callEndpoint('accountStatement', params, config);
    }

    /**
     * Transaction Status Query by client reference (v3.1 Section 9.3, STS-04, STS-06)
     * Returns CoreReference (FT) if posted; use checkTransactionChecker() for final status.
     */
    async checkTransactionStatus(transactionId: string, config?: Partial<NcbaConfig>): Promise<any> {
        return this.callEndpoint('transactionStatus', { transactionId }, config);
    }

    /**
     * Transaction Checker by FT reference + debit account (v3.1 Section 9.4, STS-01..06)
     * Authoritative final status source: isSuccessful decides success.
     */
    async checkTransactionChecker(
        txnReferenceNo: string,
        debitAccountNumber?: string,
        clientReference?: string,
        config?: Partial<NcbaConfig>
    ): Promise<any> {
        return this.callEndpoint('transactionChecker', { txnReferenceNo, debitAccountNumber, clientReference }, config);
    }

    /**
     * Poll Transaction Checker every 30s up to 10 minutes until final status (v3.1 Section 9.5, STS-02, STS-05)
     */
    async pollTransactionUntilFinal(
        txnReferenceNo: string,
        debitAccountNumber?: string,
        options?: { intervalMs?: number; maxAttempts?: number; clientReference?: string; config?: Partial<NcbaConfig> }
    ): Promise<any> {
        const intervalMs = options?.intervalMs ?? 30000;
        const maxAttempts = options?.maxAttempts ?? 20; // 20 * 30s = 10 minutes
        let lastResult: any = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            lastResult = await this.checkTransactionChecker(
                txnReferenceNo,
                debitAccountNumber,
                options?.clientReference,
                options?.config
            );
            if (lastResult?.isFinal) return lastResult;
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }
        }
        return lastResult;
    }

    /**
     * Fetch formal transaction advice / bank receipt details (v3.1 Section 5, transactionId = FT)
     */
    async getTransactionAdvise(transactionId: string, config?: Partial<NcbaConfig>): Promise<any> {
        return this.callEndpoint('transactionAdvise', { transactionId }, config);
    }
}

export const ncbaOpenBankingService = new NcbaOpenBankingService();
