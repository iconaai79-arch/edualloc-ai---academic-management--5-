import type { GradingSystem, GradeDefinition, Assessment, AssessmentMark, AcademicConfig, RankingCriteria } from '../types';

/**
 * Calculates the grade for a given score and maximum possible marks.
 */
export const calculateGrade = (
    marks: number | null,
    maxMarks: number,
    gradingSystem: GradingSystem | null
): GradeDefinition | null => {
    if (marks === null || !gradingSystem || maxMarks <= 0) return null;

    const percentage = (marks / maxMarks) * 100;
    
    // Find matching definition where percentage is between min and max (inclusive)
    // We sort by maxScore descending to handle edge cases if any
    return gradingSystem.definitions
        .sort((a,b) => b.maxScore - a.maxScore)
        .find(
            def => percentage >= def.minScore && percentage <= (def.maxScore + 0.001) // Small epsilon for float precision
        ) || null;
};

/**
 * Calculates a weighted score for an assessment.
 */
export const calculateWeightedScore = (
    marks: number | null,
    maxMarks: number,
    weightPercentage: number | undefined
): number | null => {
    if (marks === null || maxMarks <= 0) return null;
    if (weightPercentage === undefined) return marks; // No weighting applied, return raw marks
    
    const percentage = (marks / maxMarks) * 100;
    return (percentage * weightPercentage) / 100;
};

/**
 * Formats a percentage nicely.
 */
export const formatPercentage = (marks: number | null, maxMarks: number): string => {
    if (marks === null || maxMarks <= 0) return 'N/A';
    return `${((marks / maxMarks) * 100).toFixed(1)}%`;
};

/**
 * Calculates rankings for a list of student records based on criteria.
 */
export const calculateRankings = <T extends { id: string; score: number }>(
    records: T[],
    criteria: RankingCriteria = 'total_marks'
): (T & { position: number })[] => {
    // Sort descending by score
    const sorted = [...records].sort((a, b) => b.score - a.score);
    
    let lastScore: number | null = null;
    let lastPosition = 0;
    
    return sorted.map((record, index) => {
        if (record.score !== lastScore) {
            lastPosition = index + 1;
            lastScore = record.score;
        }
        return {
            ...record,
            position: lastPosition
        };
    });
};

/**
 * Aggregates student marks across assessments for a specific subject.
 */
export const aggregateSubjectMarks = (
    studentId: string,
    subjectId: string,
    assessments: Assessment[],
    marks: AssessmentMark[],
    config?: AcademicConfig
): { score: number; maxPossible: number; percentage: number; grade: GradeDefinition | null } | null => {
    const subjectAssessments = assessments.filter(a => a.subjectId === subjectId);
    const studentMarks = marks.filter(m => m.studentId === studentId && subjectAssessments.some(a => a.id === m.assessmentId));
    
    if (studentMarks.length === 0) return null;

    let totalWeightedScore = 0;
    let totalWeight = 0;
    let hasWeighting = false;

    studentMarks.forEach(mark => {
        const assessment = subjectAssessments.find(a => a.id === mark.assessmentId);
        if (!assessment || mark.marks === null) return;

        const weight = config?.assessmentWeighting?.[assessment.id];
        if (weight !== undefined) {
            hasWeighting = true;
            const percentage = (mark.marks / assessment.maxMarks) * 100;
            totalWeightedScore += (percentage * weight) / 100;
            totalWeight += weight;
        } else {
            // If no weight defined, we treat it as raw addition for now or equal weight if mixed?
            // Usually, it's either all weighted or all raw.
            totalWeightedScore += mark.marks;
            totalWeight += assessment.maxMarks;
        }
    });

    if (totalWeight === 0) return null;

    const finalPercentage = hasWeighting ? (totalWeightedScore / (totalWeight || 100)) * 100 : (totalWeightedScore / totalWeight) * 100;
    
    return {
        score: totalWeightedScore,
        maxPossible: totalWeight,
        percentage: finalPercentage,
        grade: null // Will be calculated by the caller using grading system
    };
};
