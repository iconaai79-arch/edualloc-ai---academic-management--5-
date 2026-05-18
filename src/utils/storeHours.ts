import type { Institution } from '../types';

export const checkStoreHours = (institution?: Institution | null): { allowed: boolean; reason?: string } => {
    if (!institution || !institution.storeHoursEnforced) {
        return { allowed: true };
    }
    
    const openTime = institution.storeOpenTime || '08:00';
    const closeTime = institution.storeCloseTime || '17:00';
    
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    const parseTimeToMinutes = (timeStr: string): number => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };
    
    const currentMins = hours * 60 + minutes;
    const openMins = parseTimeToMinutes(openTime);
    const closeMins = parseTimeToMinutes(closeTime);
    
    if (currentMins < openMins || currentMins > closeMins) {
        return {
            allowed: false,
            reason: `Store Operational Hours Policy violation: Actions are restricted outside set hours.\nStore Hours: ${openTime} - ${closeTime}\nCurrent Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        };
    }
    
    return { allowed: true };
};
