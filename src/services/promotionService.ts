import type { AcademicYear, Semester, User, Course, StudentPromotionRecord, PromotionAction } from '../types';
import { apiService } from './apiService';

export interface PromotionCandidate {
    student: User;
    currentClass: string;
    currentStream: string;
    targetClass: string;
    targetStream: string;
    action: PromotionAction;
    closingBalance: number;
    notes?: string;
}

/**
 * Checks whether the Student Promotion Wizard can be unlocked.
 * Strictly active at the end of the academic year or when final term/semester ends.
 */
export const checkPromotionUnlockEligibility = (
    academicYear: AcademicYear | null | undefined,
    semesters: Semester[] = [],
    overrideUnlocked: boolean = false
): { canUnlock: boolean; reason: string } => {
    if (overrideUnlocked) {
        return { canUnlock: true, reason: 'Unlocked via Administrative Security Override.' };
    }

    if (!academicYear) {
        return { canUnlock: false, reason: 'No active academic year configured in system.' };
    }

    if (academicYear.isConcluded) {
        return { canUnlock: true, reason: `Academic Year ${academicYear.name} is officially concluded.` };
    }

    const now = new Date();
    const endDate = new Date(academicYear.endDate);

    if (!isNaN(endDate.getTime()) && now >= endDate) {
        return { canUnlock: true, reason: `Academic Year ${academicYear.name} end date (${academicYear.endDate}) has elapsed.` };
    }

    // Check if the final semester/term for this academic year is concluded/completed
    const yearSemesters = semesters.filter(s => s.academicYearId === academicYear.id);
    const finalSemester = yearSemesters[yearSemesters.length - 1];

    if (finalSemester && (finalSemester.status === 'completed' || finalSemester.status === 'archived')) {
        return { canUnlock: true, reason: `Final Term/Semester (${finalSemester.name}) is officially completed.` };
    }

    return {
        canUnlock: false,
        reason: `Promotion Wizard is locked during the active academic year (${academicYear.name}). It will activate at term conclusion on or after ${academicYear.endDate}.`
    };
};

/**
 * Automatically builds default grade progression rules (Form 1 -> Form 2, Form 4 -> Graduated).
 */
export const buildDefaultClassProgressionMap = (courses: Course[] = []): Record<string, string> => {
    const progressionMap: Record<string, string> = {};

    // Standard Secondary / High School progression
    progressionMap['Form 1'] = 'Form 2';
    progressionMap['Form 2'] = 'Form 3';
    progressionMap['Form 3'] = 'Form 4';
    progressionMap['Form 4'] = 'Graduated';

    // Standard Primary / Grade School progression
    for (let i = 1; i <= 12; i++) {
        progressionMap[`Grade ${i}`] = i === 12 ? 'Graduated' : `Grade ${i + 1}`;
        progressionMap[`Standard ${i}`] = i === 8 ? 'Graduated' : `Standard ${i + 1}`;
        progressionMap[`Class ${i}`] = i === 8 ? 'Graduated' : `Class ${i + 1}`;
    }

    // Kindergarten / CBC progression
    progressionMap['Playgroup'] = 'PP1';
    progressionMap['PP1'] = 'PP2';
    progressionMap['PP2'] = 'Grade 1';
    progressionMap['Baby Class'] = 'Middle Class';
    progressionMap['Middle Class'] = 'Top Class';
    progressionMap['Top Class'] = 'Grade 1';

    // Dynamic Course / Level mapping if available
    courses.forEach(c => {
        if (!progressionMap[c.name]) {
            if (c.name.toLowerCase().includes('form 4') || c.name.toLowerCase().includes('grade 12')) {
                progressionMap[c.name] = 'Graduated';
            } else {
                progressionMap[c.name] = 'Next Level';
            }
        }
    });

    return progressionMap;
};

/**
 * Batch executes student promotion and carries forward opening financial balances.
 */
export const executeBatchStudentPromotion = async (
    candidates: PromotionCandidate[],
    fromAcademicYear: AcademicYear,
    toAcademicYearName: string,
    toStartDate: string,
    toEndDate: string,
    promotedByUserId: string,
    institutionId: string
): Promise<{ success: boolean; count: number; newAcademicYearId: string }> => {
    const nowIso = new Date().toISOString();
    const newAcademicYearId = `ay_${Date.now()}`;

    // 1. Save or Create the New Academic Year
    const newAcademicYear: AcademicYear = {
        id: newAcademicYearId,
        name: toAcademicYearName,
        startDate: toStartDate,
        endDate: toEndDate,
        institutionId: institutionId,
        status: 'active',
        isConcluded: false
    };

    await apiService.saveModuleRecord('academic_years', newAcademicYear);

    // 2. Mark previous Academic Year as concluded
    if (fromAcademicYear?.id) {
        await apiService.updateModuleRecord('academic_years', fromAcademicYear.id, {
            status: 'inactive',
            isConcluded: true
        });
    }

    // 3. Process candidate promotions & balance carry-forwards
    let processedCount = 0;

    for (const candidate of candidates) {
        const student = candidate.student;
        const targetClass = candidate.targetClass;
        const targetStream = candidate.targetStream || candidate.currentStream;

        // Calculate opening balance carry-forward
        const carriedBalance = candidate.closingBalance;

        // Create promotion ledger entry
        const record: StudentPromotionRecord = {
            id: `prom_${student.id}_${Date.now()}`,
            institutionId,
            studentId: student.id,
            fromAcademicYearId: fromAcademicYear.id,
            toAcademicYearId: newAcademicYearId,
            fromClass: candidate.currentClass,
            toClass: targetClass,
            fromStream: candidate.currentStream,
            toStream: targetStream,
            action: candidate.action,
            closingBalance: candidate.closingBalance,
            carriedOpeningBalance: carriedBalance,
            promotedBy: promotedByUserId,
            promotedAt: nowIso,
            metadata: {
                notes: candidate.notes || '',
                studentName: student.name,
                admNo: (student as any).admissionNumber || student.staffId || ''
            }
        };

        await apiService.saveModuleRecord('student_promotion_history', record);

        // Update Student User profile
        const isGraduated = candidate.action === 'graduated';
        const isWithdrawn = candidate.action === 'withdrawn';

        const updatedMetadata = {
            ...(student.metadata || {}),
            gradeLevel: targetClass,
            stream: targetStream,
            academicYearId: newAcademicYearId,
            openingBalance: carriedBalance
        };

        await apiService.updateModuleRecord('users', student.id, {
            gradeLevel: targetClass,
            className: targetClass,
            stream: targetStream,
            status: isGraduated ? 'graduated' : isWithdrawn ? 'inactive' : 'active',
            metadata: updatedMetadata
        });

        processedCount++;
    }

    return { success: true, count: processedCount, newAcademicYearId };
};
