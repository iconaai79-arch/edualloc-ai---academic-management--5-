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

/**
 * Detects whether a string is a synthetic fallback admission number
 * (e.g. ADM-1000, ADM-2026-89CG, STF-2026-89CG, ADM-50966, internal IDs like usr_..., st_..., enr_...).
 */
export const isSyntheticAdmNo = (val: any): boolean => {
    if (!val) return true;
    const strVal = String(val).trim();
    if (!strVal || strVal === '—' || strVal === '-' || strVal === 'N/A' || strVal === 'undefined' || strVal === 'null' || strVal.toLowerCase() === 'pending') {
        return true;
    }
    if (strVal.startsWith('usr_') || strVal.startsWith('user_') || strVal.startsWith('st_') || strVal.startsWith('enr_')) {
        return true;
    }
    if (/^ADM-10\d{2,}$/i.test(strVal)) return true; // ADM-1000 synthetic
    if (/^ADM-\d{4}-[A-Za-z0-9]{4}$/i.test(strVal)) return true; // ADM-2026-89CG generated fallback
    if (/^STF-\d{4}-[A-Za-z0-9]{4}$/i.test(strVal)) return true; // STF-2026-89CG generated fallback
    if (/^ADM-\d{5,}$/i.test(strVal)) return true; // ADM-50966 generated fallback
    return false;
};

/**
 * Resolves the genuine admission number for a student, scanning all canonical candidate keys
 * and filtering out placeholder/synthetic fallbacks (such as ADM-1000, ADM-2026-89CG).
 */
export const resolveRealStudentAdmNo = (student: any, idx?: number, registry?: any[]): string => {
    if (!student) return 'N/A';

    // Safely parse metadata if stored as JSON string
    let meta = student.metadata;
    if (typeof meta === 'string' && meta.trim().startsWith('{')) {
        try {
            meta = JSON.parse(meta);
        } catch (e) {}
    }

    let userMeta = student.user?.metadata;
    if (typeof userMeta === 'string' && userMeta.trim().startsWith('{')) {
        try {
            userMeta = JSON.parse(userMeta);
        } catch (e) {}
    }

    const candidates = [
        student.admissionNumber,
        student.admission_number,
        student.admissionNo,
        student.admission_no,
        student.admNo,
        student.adm_no,
        student.adm,
        student.admission,
        student.admNumber,
        student.adm_number,
        student.assessmentNo,
        student.assessment_no,
        student.assessmentNumber,
        student.assessment_number,
        student.registrationNo,
        student.registration_number,
        student.regNo,
        student.reg_no,
        student.regNumber,
        student.reg_number,
        student.studentId,
        student.student_id,
        student.studentNumber,
        student.student_number,
        student.staffId,
        student.staff_id,
        student.customId,
        student.custom_id,
        student.upi,
        student.nemis,
        meta?.admissionNumber,
        meta?.admission_number,
        meta?.admissionNo,
        meta?.admission_no,
        meta?.admNo,
        meta?.adm_no,
        meta?.adm,
        meta?.admission,
        meta?.registrationNo,
        meta?.registration_number,
        meta?.regNo,
        meta?.studentId,
        meta?.student_id,
        meta?.assessmentNo,
        meta?.assessment_no,
        student.user?.admissionNumber,
        student.user?.admission_number,
        student.user?.admissionNo,
        student.user?.admission_no,
        student.user?.admNo,
        student.user?.adm_no,
        student.user?.staffId,
        userMeta?.admissionNumber,
        userMeta?.admission_number,
        userMeta?.admissionNo,
        userMeta?.admNo
    ];

    for (const cand of candidates) {
        if (cand !== null && cand !== undefined) {
            const strVal = String(cand).trim();
            if (!isSyntheticAdmNo(strVal)) {
                return strVal;
            }
        }
    }

    // Direct ID check if it is a real custom admission number and not an internal UUID / prefix
    if (student.id && typeof student.id === 'string') {
        const cleanId = student.id.trim();
        if (!isSyntheticAdmNo(cleanId)) {
            return cleanId;
        }
    }

    // If registry not supplied, attempt to check cached enrollments in localStorage
    let effectiveRegistry = registry;
    if (!effectiveRegistry || !Array.isArray(effectiveRegistry) || effectiveRegistry.length === 0) {
        try {
            const instKey = student.institutionId || student.institution_id || '';
            const rawEnr = (instKey ? localStorage.getItem(`eduai_student_enrollments_${instKey}`) : null) ||
                           localStorage.getItem('eduai_student_enrollments_default') ||
                           (instKey ? localStorage.getItem(`eduai_students_${instKey}`) : null) ||
                           localStorage.getItem('eduai_students_default') ||
                           (instKey ? localStorage.getItem(`eduai_enrollments_${instKey}`) : null);
            if (rawEnr) {
                const parsed = JSON.parse(rawEnr);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    effectiveRegistry = parsed;
                }
            }
        } catch (e) {}
    }

    // Match by ID or exact name in registry / enrollments
    if (effectiveRegistry && Array.isArray(effectiveRegistry) && effectiveRegistry.length > 0) {
        const studentId = String(student.id || student.userId || student.user_id || '').trim();
        const cleanName = student.name ? String(student.name).trim().toLowerCase() : '';
        const nameTokens = cleanName.split(/\s+/).filter(Boolean);

        const matched = effectiveRegistry.find((s: any) => {
            if (!s) return false;
            const sId = String(s.id || '').trim();
            const sUserId = String(s.userId || s.user_id || '').trim();
            const sStudentId = String(s.studentId || s.student_id || '').trim();

            if (studentId && (sUserId === studentId || sStudentId === studentId || sId === studentId)) {
                return true;
            }

            // Match by name
            if (cleanName) {
                const sName = String(s.name || s.fullName || s.studentName || s.student_name || '').trim().toLowerCase();
                if (sName && (sName === cleanName || (nameTokens.length >= 2 && (sName.includes(cleanName) || cleanName.includes(sName))))) {
                    return true;
                }
            }
            return false;
        });

        if (matched) {
            let mMeta = matched.metadata;
            if (typeof mMeta === 'string' && mMeta.trim().startsWith('{')) {
                try { mMeta = JSON.parse(mMeta); } catch (e) {}
            }

            const realAdm = matched.admissionNumber || matched.admission_number || matched.admissionNo || matched.admission_no ||
                            matched.admNo || matched.adm_no || matched.registrationNo || matched.registration_number ||
                            matched.studentId || matched.student_id || matched.customId ||
                            mMeta?.admissionNumber || mMeta?.admission_number || mMeta?.admissionNo || mMeta?.admNo;
            const strAdm = String(realAdm || '').trim();
            if (!isSyntheticAdmNo(strAdm)) {
                return strAdm;
            }
        }
    }

    // If any non-empty candidate was found even if synthetic
    for (const cand of candidates) {
        if (cand) {
            const s = String(cand).trim();
            if (s && !s.startsWith('usr_') && !s.startsWith('user_') && s !== 'N/A' && s !== 'undefined' && s !== 'null') return s;
        }
    }

    return idx !== undefined ? `ADM-${1000 + idx}` : 'N/A';
};

/**
 * Normalizes and splits combined class/stream/year strings into structured parts.
 * Handles patterns like:
 *   "FORM 4" -> { className: "Form 4" }
 *   "Form 4 B 2026" -> { className: "Form 4", stream: "B", academicYear: "2026" }
 *   "Form 4 - B" -> { className: "Form 4", stream: "B" }
 *   "GRADE 10 (Blue)" -> { className: "Grade 10", stream: "Blue" }
 *   "Class 8 East" -> { className: "Class 8", stream: "East" }
 *   "PP1 Red" -> { className: "PP1", stream: "Red" }
 */
export const extractClassAndStream = (raw?: any): { className: string; stream?: string; academicYear?: string } => {
    if (raw === null || raw === undefined) {
        return { className: '' };
    }

    const textStr = typeof raw === 'string' ? raw : String(raw);
    let text = textStr.trim();
    if (!text || text === 'undefined' || text === 'null' || text === '—' || text === 'N/A' || text === 'Unclassified') {
        return { className: '' };
    }

    // Extract embedded academic year like "2024", "2025", "2026", "2027"
    let academicYear: string | undefined;
    const yearMatch = text.match(/\b(20\d{2})\b/);
    if (yearMatch) {
        academicYear = yearMatch[1];
        text = text.replace(/\b20\d{2}\b/, '').trim();
    }

    // Clean extraneous punctuation
    text = text.replace(/[-–—:/()]+/g, ' ').replace(/\s+/g, ' ').trim();

    // Standard school class patterns (Form 1-6, Grade 1-12, Class 1-8, Year 1-13, Std 1-8, Standard 1-8, PP1, PP2, Playgroup, Nursery, Kindergarten, Daycare, ECDE, CBC Grade 1-10)
    const schoolClassRegex = /^(Form|Grade|Class|Year|Standard|Std|CBC\s*Grade)\s*(\d{1,2})(.*)$/i;
    const earlyChildhoodRegex = /^(PP\s*[1-2]|Pre-Primary\s*[1-2]|Play\s*group|Kindergarten|Nursery|Daycare|ECDE|Reception)(.*)$/i;

    const matchSchool = text.match(schoolClassRegex);
    if (matchSchool) {
        let prefix = matchSchool[1].trim();
        const num = matchSchool[2].trim();
        const remainder = matchSchool[3].trim();

        // Standardize prefix: "FORM" -> "Form", "grade" -> "Grade", "std" -> "Class", etc.
        const pLower = prefix.toLowerCase();
        if (pLower.startsWith('form')) prefix = 'Form';
        else if (pLower.startsWith('grade') || pLower.startsWith('cbc')) prefix = 'Grade';
        else if (pLower.startsWith('class') || pLower.startsWith('std') || pLower.startsWith('standard')) prefix = 'Class';
        else if (pLower.startsWith('year')) prefix = 'Year';
        else prefix = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();

        const className = `${prefix} ${num}`;
        const stream = remainder ? normalizeStreamName(remainder) : undefined;
        return { className, stream: stream || undefined, academicYear };
    }

    const matchECDE = text.match(earlyChildhoodRegex);
    if (matchECDE) {
        const rawPrefix = matchECDE[1].trim();
        const remainder = matchECDE[2].trim();

        let prefix = rawPrefix;
        if (/^pp\s*1$/i.test(rawPrefix) || /^pre-primary\s*1$/i.test(rawPrefix)) prefix = 'PP1';
        else if (/^pp\s*2$/i.test(rawPrefix) || /^pre-primary\s*2$/i.test(rawPrefix)) prefix = 'PP2';
        else if (/^play\s*group$/i.test(rawPrefix)) prefix = 'Playgroup';
        else if (/^ecde$/i.test(rawPrefix)) prefix = 'ECDE';
        else prefix = rawPrefix.charAt(0).toUpperCase() + rawPrefix.slice(1).toLowerCase();

        const stream = remainder ? normalizeStreamName(remainder) : undefined;
        return { className: prefix, stream: stream || undefined, academicYear };
    }

    // Tertiary / College / Vocational or custom name e.g. "Diploma in IT", "Certificate in Electrical"
    const titleCased = text
        .split(' ')
        .map(w => {
            if (/^(and|in|of|for|to|the|at)$/i.test(w)) return w.toLowerCase();
            if (/^(it|ict|cpa|ecde|tvet|tto|dos|hod)$/i.test(w)) return w.toUpperCase();
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join(' ');

    return { className: titleCased, academicYear };
};

/**
 * Normalizes class names into a clean, canonical form (e.g. "FORM 4" -> "Form 4", "Form 4 B 2026" -> "Form 4").
 */
export const normalizeClassName = (raw?: any): string => {
    if (raw === null || raw === undefined) return '';
    const parsed = extractClassAndStream(raw);
    return parsed.className || '';
};

/**
 * Normalizes stream names (e.g. "b" -> "B", "stream b" -> "B", "NORTH" -> "North").
 */
export const normalizeStreamName = (raw?: any): string => {
    if (raw === null || raw === undefined) return '';
    const strRaw = typeof raw === 'string' ? raw : String(raw);
    let str = strRaw.trim();
    if (!str || str === '—' || str === 'undefined' || str === 'null' || str === 'N/A' || str === 'Unassigned' || str.toLowerCase() === 'all') {
        return '';
    }

    // Strip "Stream" prefix: "Stream B" -> "B", "Stream East" -> "East"
    str = str.replace(/^stream\s+/i, '').replace(/^[-–—:]+\s*/, '').trim();
    if (!str) return '';

    // If stream was registered in all caps (e.g. "WEST", "EAST", "A", "BLUE"), preserve the exact uppercase registration!
    if (str === str.toUpperCase()) {
        return str;
    }

    // Single letter streams: "a" -> "A", "b" -> "B"
    if (/^[a-zA-Z]$/.test(str)) {
        return str.toUpperCase();
    }

    // Title case lowercase multi-letter streams: "north" -> "North", "blue" -> "Blue"
    return str
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
};

/**
 * Natural sort helper & comparator for academic classes (e.g. PP1, PP2, Grade 1..12, Form 1..4).
 * Supports both direct function call on an array: naturalClassSort(['Form 4', 'Form 1'])
 * AND standard array sort comparator: ['Form 4', 'Form 1'].sort(naturalClassSort)
 */
export const naturalClassSort = (a: any, b?: any): any => {
    const parseClassWeight = (cls: any): number => {
        if (cls === null || cls === undefined) return 9999;
        const str = typeof cls === 'string' ? cls : String(cls);
        const lower = str.toLowerCase().trim();
        if (!lower) return 9999;

        if (lower.includes('playgroup') || lower.includes('daycare')) return 10;
        if (lower.includes('pp1') || lower.includes('pre-primary 1') || lower.includes('nursery')) return 20;
        if (lower.includes('pp2') || lower.includes('pre-primary 2') || lower.includes('kindergarten')) return 30;
        if (lower.includes('ecde')) return 40;

        const gradeMatch = lower.match(/(?:grade|class|standard|std|year)\s*(\d+)/);
        if (gradeMatch) {
            return 100 + parseInt(gradeMatch[1], 10);
        }

        const formMatch = lower.match(/form\s*(\d+)/);
        if (formMatch) {
            return 300 + parseInt(formMatch[1], 10);
        }

        return 500;
    };

    const compareTwo = (x: any, y: any): number => {
        const strX = typeof x === 'string' ? x : String(x || '');
        const strY = typeof y === 'string' ? y : String(y || '');
        const weightA = parseClassWeight(strX);
        const weightB = parseClassWeight(strY);
        if (weightA !== weightB) return weightA - weightB;
        return strX.localeCompare(strY, undefined, { numeric: true, sensitivity: 'base' });
    };

    // If first argument is an array (e.g. naturalClassSort(myArray)), sort and return a new array
    if (Array.isArray(a)) {
        return [...a].sort(compareTwo);
    }

    // Otherwise treat as standard comparator (a, b)
    return compareTwo(a, b);
};

/**
 * Resolves the genuine, normalized class name for a student from all possible record fields and enrollments.
 */
export const resolveRealStudentClass = (
    student: any,
    enrollments?: any[],
    courses?: any[],
    fallback: string = 'Unclassified'
): string => {
    if (!student) return fallback;

    // 1. Check direct properties
    const candidates = [
        student.className,
        student.class_name,
        student.gradeLevel,
        student.grade_level,
        student.studentClass,
        student.student_class,
        student.class,
        student.grade,
        student.form,
        student.academicLevel,
        student.academic_level,
        student.courseName,
        student.course_name,
        student.course,
        student.metadata?.className,
        student.metadata?.class_name,
        student.metadata?.gradeLevel,
        student.metadata?.grade_level,
        student.metadata?.studentClass,
        student.metadata?.student_class,
        student.metadata?.class,
        student.metadata?.grade,
        student.metadata?.form,
        student.metadata?.academicLevel,
        student.metadata?.academic_level,
        student.metadata?.courseName,
        student.metadata?.course
    ];

    for (const val of candidates) {
        if (val !== undefined && val !== null) {
            const parsed = extractClassAndStream(val);
            if (parsed.className && parsed.className !== 'Unclassified' && parsed.className !== '—') {
                return parsed.className;
            }
        }
    }

    // 2. Check enrollments
    if (enrollments && Array.isArray(enrollments) && enrollments.length > 0) {
        const sId = student.id || student.userId || student.user_id;
        const enr = enrollments.find((e: any) => e && (e.userId === sId || e.user_id === sId || e.studentId === sId || e.student_id === sId || e.id === sId));
        if (enr) {
            const enrCandidates = [
                enr.className,
                enr.class_name,
                enr.gradeLevel,
                enr.grade_level,
                enr.grade,
                enr.form,
                enr.studentClass,
                enr.courseName,
                enr.course_name,
                enr.course,
                enr.metadata?.className,
                enr.metadata?.class_name,
                enr.metadata?.gradeLevel,
                enr.metadata?.grade_level,
                enr.metadata?.class,
                enr.metadata?.grade,
                enr.metadata?.form
            ];
            for (const val of enrCandidates) {
                if (val !== undefined && val !== null) {
                    const parsed = extractClassAndStream(val);
                    if (parsed.className && parsed.className !== 'Unclassified' && parsed.className !== '—') {
                        return parsed.className;
                    }
                }
            }
        }
    }

    // 3. Match from courses if courseId is present
    if (courses && Array.isArray(courses) && courses.length > 0) {
        const cId = student.courseId || student.course_id || student.metadata?.courseId;
        if (cId) {
            const course = courses.find((c: any) => c && (c.id === cId || c.code === cId));
            if (course) {
                const cName = course.name || course.title || course.code;
                const parsed = extractClassAndStream(cName);
                if (parsed.className) return parsed.className;
            }
        }
    }

    return fallback;
};

/**
 * Resolves the genuine, normalized stream name for a student from all possible record fields and enrollments.
 */
export const resolveRealStudentStream = (
    student: any,
    enrollments?: any[]
): string => {
    if (!student) return '';

    // Check direct stream properties
    const streamCandidates = [
        student.stream,
        student.streamName,
        student.stream_name,
        student.metadata?.stream,
        student.metadata?.streamName,
        student.metadata?.stream_name
    ];

    for (const val of streamCandidates) {
        const st = normalizeStreamName(val);
        if (st) return st;
    }

    // Check embedded stream in className
    const classCandidates = [
        student.className,
        student.class_name,
        student.gradeLevel,
        student.grade_level,
        student.studentClass,
        student.metadata?.className,
        student.metadata?.gradeLevel
    ];
    for (const val of classCandidates) {
        const parsed = extractClassAndStream(val);
        if (parsed.stream) return parsed.stream;
    }

    // Check enrollments
    if (enrollments && Array.isArray(enrollments) && enrollments.length > 0) {
        const sId = student.id || student.userId || student.user_id;
        const enr = enrollments.find((e: any) => e && (e.userId === sId || e.user_id === sId || e.studentId === sId || e.student_id === sId || e.id === sId));
        if (enr) {
            const enrStreamCandidates = [
                enr.stream,
                enr.streamName,
                enr.stream_name,
                enr.metadata?.stream,
                enr.metadata?.streamName,
                enr.metadata?.stream_name
            ];
            for (const val of enrStreamCandidates) {
                const st = normalizeStreamName(val);
                if (st) return st;
            }
            const enrClassCandidates = [
                enr.className,
                enr.class_name,
                enr.gradeLevel,
                enr.grade_level,
                enr.metadata?.className,
                enr.metadata?.gradeLevel
            ];
            for (const val of enrClassCandidates) {
                const parsed = extractClassAndStream(val);
                if (parsed.stream) return parsed.stream;
            }
        }
    }

    return '';
};

/**
 * Checks whether an email address is a synthetic / dummy placeholder
 * (e.g. student_usr_1787924229587_04no7z@eduai.local, student_123@eduai.local, *@eduai.local, *.local).
 * Returns true if the email is a placeholder that should NOT be sent emails.
 */
export const isPlaceholderEmail = (email?: string | null): boolean => {
    if (!email || typeof email !== 'string') return true;
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes('@')) return true;

    const domain = clean.split('@')[1] || '';

    return (
        clean.endsWith('@eduai.local') ||
        clean.endsWith('.local') ||
        clean.endsWith('@local') ||
        domain === 'local' ||
        domain === 'localhost' ||
        domain.endsWith('.local') ||
        clean.startsWith('student_usr_') ||
        clean.startsWith('usr_') ||
        (clean.startsWith('student_') && (domain.includes('eduai') || domain.includes('local'))) ||
        (clean.startsWith('parent_') && (domain.includes('eduai') || domain.includes('local'))) ||
        (clean.startsWith('staff_') && (domain.includes('eduai') || domain.includes('local'))) ||
        clean.endsWith('@localhost') ||
        clean.includes('example.com') ||
        clean.includes('noemail') ||
        clean === 'student@eduai.local' ||
        clean === 'parent@eduai.local' ||
        clean === 'user@eduai.local'
    );
};
