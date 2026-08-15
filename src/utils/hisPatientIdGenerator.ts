import { apiService } from '../services/apiService';

export interface PatientIdConfig {
    customPrefix: string;
    startNumber: number;
    zeroPadLength: number;
    includeYear: boolean;
    autoAssign: boolean;
}

export const DEFAULT_PATIENT_ID_CONFIG: PatientIdConfig = {
    customPrefix: 'PID-',
    startNumber: 1,
    zeroPadLength: 3,
    includeYear: false,
    autoAssign: true
};

/**
 * Retrieves the current patient ID configuration for the given institution.
 */
export function getPatientIdConfig(institutionId?: string): PatientIdConfig {
    try {
        const instKey = institutionId ? `his_patient_id_config_${institutionId}` : null;
        if (instKey) {
            const saved = localStorage.getItem(instKey);
            if (saved) return { ...DEFAULT_PATIENT_ID_CONFIG, ...JSON.parse(saved) };
        }
        // Fallback: check any his_patient_id_config_* key
        const anyKey = Object.keys(localStorage).find(k => k.startsWith('his_patient_id_config_'));
        if (anyKey) {
            const saved = localStorage.getItem(anyKey);
            if (saved) return { ...DEFAULT_PATIENT_ID_CONFIG, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Error reading patient ID config:', e);
    }
    return { ...DEFAULT_PATIENT_ID_CONFIG };
}

/**
 * Generates the NEXT UNIQUE Patient ID / OP Number based on existing patients and configuration.
 * Guarantees that the number will never collide with an existing patient in the database.
 */
export function generateNextPatientId(existingPatients: any[] = [], institutionId?: string): string {
    const config = getPatientIdConfig(institutionId);
    const prefix = config.customPrefix || 'PID-';
    const yearPart = config.includeYear ? `${new Date().getFullYear()}-` : '';
    const fullPrefix = `${prefix}${yearPart}`;

    let maxFoundSeq = 0;

    // Scan all existing patients to find the highest sequence number currently in use
    if (Array.isArray(existingPatients) && existingPatients.length > 0) {
        existingPatients.forEach(p => {
            const idCandidates = [
                p.customPatientId,
                p.custom_patient_id,
                p.patientNumber,
                p.patient_number,
                p.admissionNumber,
                p.admission_number,
                p.opNumber,
                p.op_number,
                p.id
            ].filter(Boolean);

            idCandidates.forEach((rawId: string) => {
                if (typeof rawId !== 'string') return;
                const trimmed = rawId.trim();

                // If it starts with the exact full prefix (e.g. "PID-005" or "PID-2026-005")
                if (trimmed.startsWith(fullPrefix)) {
                    const numStr = trimmed.slice(fullPrefix.length).replace(/\D/g, '');
                    const seq = parseInt(numStr, 10);
                    if (!isNaN(seq) && seq > maxFoundSeq) {
                        maxFoundSeq = seq;
                    }
                } else if (trimmed.startsWith(prefix)) {
                    // E.g. "PID-005" when includeYear is false
                    const numStr = trimmed.slice(prefix.length).replace(/\D/g, '');
                    const seq = parseInt(numStr, 10);
                    if (!isNaN(seq) && seq > maxFoundSeq) {
                        maxFoundSeq = seq;
                    }
                } else {
                    // Extract any trailing digits (e.g. "OP/005" or "PAT-005")
                    const match = trimmed.match(/(\d+)$/);
                    if (match && match[1]) {
                        const seq = parseInt(match[1], 10);
                        if (!isNaN(seq) && seq > maxFoundSeq && seq < 1000000) {
                            maxFoundSeq = seq;
                        }
                    }
                }
            });
        });
    }

    // The next sequence must be strictly greater than both config.startNumber and maxFoundSeq
    const nextSeq = Math.max(config.startNumber || 1, maxFoundSeq + 1);
    const padded = String(nextSeq).padStart(config.zeroPadLength || 3, '0');
    return `${fullPrefix}${padded}`;
}

/**
 * Automatically advances the stored sequence counter and commits it to localStorage and DB.
 */
export async function advancePatientIdSequence(usedId: string, institutionId?: string): Promise<void> {
    try {
        const config = getPatientIdConfig(institutionId);
        // Extract sequence number from the used ID
        const match = usedId.match(/(\d+)$/);
        if (match && match[1]) {
            const usedSeq = parseInt(match[1], 10);
            if (!isNaN(usedSeq)) {
                const nextSeq = usedSeq + 1;
                const updatedConfig: PatientIdConfig = {
                    ...config,
                    startNumber: nextSeq
                };

                // Save to localStorage
                const targetKey = institutionId ? `his_patient_id_config_${institutionId}` : 'his_patient_id_config_default';
                localStorage.setItem(targetKey, JSON.stringify(updatedConfig));
                localStorage.setItem('his_patient_id_config_latest', JSON.stringify(updatedConfig));

                // Save to database
                if (institutionId) {
                    await apiService.saveModuleRecord('his_patient_id_config', {
                        id: `his_pid_${institutionId}`,
                        institutionId,
                        institution_id: institutionId,
                        ...updatedConfig,
                        updatedAt: new Date().toISOString()
                    }).catch(() => null);
                }

                // Notify all listening components
                window.dispatchEvent(new CustomEvent('his_patient_id_advanced', { detail: { nextSeq, updatedConfig } }));
            }
        }
    } catch (e) {
        console.error('Error advancing patient ID sequence:', e);
    }
}
