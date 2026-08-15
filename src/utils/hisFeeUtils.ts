import { apiService } from '../services/apiService';

/**
 * Retrieves the configured Consultation Fee rate from settings (localStorage or database).
 * @param institutionId Institution ID
 * @param isInsured Boolean indicating if patient has insurance/cover
 * @returns Configured Consultation Fee in KES
 */
export function getConsultationFeeFromSettings(institutionId?: string, isInsured: boolean = false): number {
    try {
        if (institutionId) {
            const saved = localStorage.getItem(`his_consultation_rates_${institutionId}`);
            if (saved) {
                const rates = JSON.parse(saved);
                const fee = isInsured ? Number(rates.coverConsultation) : Number(rates.cashConsultation);
                if (fee && fee > 0) return fee;
            }
        }
    } catch (e) {
        console.warn('[hisFeeUtils] Error reading local consultation fee:', e);
    }
    // Default configured fallbacks (Cash: 1,000 | Cover: 1,500)
    return isInsured ? 1500 : 1000;
}

export async function fetchConsultationFeeFromSettings(institutionId?: string, isInsured: boolean = false): Promise<number> {
    const localFee = getConsultationFeeFromSettings(institutionId, isInsured);
    if (!institutionId) return localFee;

    try {
        const records = await apiService.fetchModuleRecords('his_tariffs', institutionId).catch(() => []);
        const rateRecord = (records || []).find((r: any) => r.id?.includes('consultation_rates') || r.type === 'consultation_rates');
        if (rateRecord) {
            const fee = isInsured ? Number(rateRecord.coverConsultation) : Number(rateRecord.cashConsultation);
            if (fee && fee > 0) {
                try {
                    localStorage.setItem(`his_consultation_rates_${institutionId}`, JSON.stringify(rateRecord));
                } catch (e) {}
                return fee;
            }
        }
    } catch (e) {
        console.warn('[hisFeeUtils] Error fetching database consultation fee:', e);
    }
    return localFee;
}
