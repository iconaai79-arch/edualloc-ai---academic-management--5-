import { RemedialAllocation, TeacherDayPreference, User } from '../types';

export interface CutoffCheckResult {
    canCancel: boolean;
    hoursRemaining: number;
    nextLessonDate: Date;
    message?: string;
}

export interface CandidateScore {
    teacher: User;
    score: number;
    reasons: string[];
    isSubjectMatch: boolean;
    isGradeMatch: boolean;
    isPreferredDay: boolean;
    matchedSubject?: string;
    matchedGrade?: string;
}

/**
 * Calculates the next upcoming occurrence Date for a given day of the week and startTime (HH:MM).
 */
export function getNextOccurrenceDate(dayOfWeek: string, startTime: string = '08:00'): Date {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = days.findIndex(d => d.toLowerCase() === dayOfWeek.toLowerCase());
    
    const now = new Date();
    const result = new Date(now);

    const [hours, minutes] = startTime.split(':').map(n => parseInt(n, 10) || 0);
    result.setHours(hours, minutes, 0, 0);

    const currentDayIndex = now.getDay();
    let dayDiff = (targetDayIndex - currentDayIndex + 7) % 7;

    // If target day is today, check if start time has already passed
    if (dayDiff === 0 && result.getTime() <= now.getTime()) {
        dayDiff = 7; // Target next week's occurrence
    }

    result.setDate(result.getDate() + dayDiff);
    return result;
}

/**
 * Verifies if the teacher is within the allowed lead-time window to cancel/request a substitute.
 * Restricts cancellation if the lesson is too close to start (e.g. less than cutoffHours away).
 */
export function checkCancellationCutoff(
    dayOfWeek: string,
    startTime: string,
    cutoffHours: number = 3
): CutoffCheckResult {
    const nextLessonDate = getNextOccurrenceDate(dayOfWeek, startTime);
    const now = new Date();
    const diffMs = nextLessonDate.getTime() - now.getTime();
    const hoursRemaining = Math.max(0, diffMs / (1000 * 60 * 60));

    if (hoursRemaining < cutoffHours) {
        return {
            canCancel: false,
            hoursRemaining,
            nextLessonDate,
            message: `Cancellation window locked: Lessons cannot be cancelled within ${cutoffHours} hours of start time (starts in ${hoursRemaining.toFixed(1)} hrs). Please notify the Director of Studies (DOS) directly.`
        };
    }

    return {
        canCancel: true,
        hoursRemaining,
        nextLessonDate
    };
}

/**
 * Checks if two timeslot ranges on the same day overlap.
 */
export function isTimeRangeOverlapping(start1: string, end1: string, start2: string, end2: string): boolean {
    const toMinutes = (time: string) => {
        const [h, m] = (time || '00:00').split(':').map(n => parseInt(n, 10) || 0);
        return h * 60 + m;
    };

    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);

    return Math.max(s1, s2) < Math.min(e1, e2);
}

/**
 * Strict validator to ensure only authentic academic teaching staff are included
 * in remedial management, timetables, rosters, and auto-substitutions.
 * Explicitly rejects non-academic support staff (drivers, cooks, librarians, security, accountants, etc.)
 */
export const isAcademicTeacher = (u: any): boolean => {
    if (!u) return false;

    // 1. Normalize primary role & roles array
    const primaryRole = (u.role || '').trim().toLowerCase();
    const roles: string[] = Array.isArray(u.roles)
        ? u.roles.map((r: any) => String(r).trim().toLowerCase())
        : [];
    const meta = u.metadata || {};
    const staffType = (meta.staffType || meta.staff_type || meta.category || '').trim().toLowerCase();

    // 2. Explicit support staff metadata flags
    if (staffType === 'support_staff' || staffType === 'support' || meta.isSupportStaff === true) {
        return false;
    }

    // 3. Known Support Staff and Non-Teaching Roles
    const supportRoles = [
        'support_staff', 'staff', 'subordinate', 'subordinate_staff',
        'librarian', 'library_assistant',
        'security', 'security_guard', 'watchman', 'guard',
        'info_desk', 'reception', 'receptionist', 'front_desk',
        'store', 'stores', 'storekeeper', 'store_keeper', 'inventory_manager',
        'finance', 'finance_officer', 'accountant', 'accounts_clerk', 'bursar', 'cashier',
        'procurement', 'procurement_officer', 'purchasing_officer',
        'boarding_master', 'matron', 'house_parent', 'hostel_warden',
        'driver', 'transport_assistant', 'transport_manager', 'bus_driver',
        'event_manager', 'managing_director', 'hoi',
        'nurse', 'doctor', 'clinic', 'medic',
        'hr_officer', 'human_resource',
        'cateress', 'catering', 'chef', 'cook', 'kitchen', 'mess', 'waiter',
        'cleaner', 'janitor', 'grounds', 'groundskeeper', 'gardener',
        'caretaker', 'maintenance', 'artisan', 'plumber', 'electrician', 'carpenter', 'mason',
        'lab_technician', 'lab_tech', 'technician',
        'secretary', 'worker', 'attendant',
        'student', 'parent', 'customer', 'lead', 'member', 'reseller', 'vendor', 'visitor'
    ];

    if (supportRoles.includes(primaryRole)) {
        return false;
    }

    // If roles contains support staff role, exclude unless primary is explicitly an academic leader
    if (roles.some(r => supportRoles.includes(r)) && !['teacher', 'lecturer', 'instructor', 'dos', 'hod'].includes(primaryRole)) {
        return false;
    }

    // 4. Department filter if set
    const dept = (u.department || meta.department || meta.departmentName || '').toLowerCase();
    if (dept && (
        dept.includes('support') || dept.includes('kitchen') || dept.includes('security') || 
        dept.includes('transport') || dept.includes('clean') || dept.includes('catering') || 
        dept.includes('maintenance') || dept.includes('ground') || dept.includes('sanitation')
    )) {
        return false;
    }

    // 5. Valid Academic Teaching Roles
    const academicTeachingRoles = [
        'teacher',
        'lecturer',
        'instructor',
        'hod',
        'dos',
        'director_of_studies',
        'deputy',
        'deputy_principal',
        'deputy_head',
        'academics_officer',
        'class_supervisor',
        'tto',
        'practice_teacher',
        'county_teacher'
    ];

    const hasAcademicPrimary = academicTeachingRoles.includes(primaryRole);
    const hasAcademicInRoles = roles.some(r => academicTeachingRoles.includes(r));

    return hasAcademicPrimary || hasAcademicInRoles;
};

/**
 * Normalizes a class or course name to standard grade representation (e.g. "Form 4", "Grade 8", "PP2", "Year 11")
 */
export function extractGradeLevel(name: string): string {
    if (!name) return '';
    const clean = name.trim();
    const formMatch = clean.match(/\b(form|f)\s*([1-4])\b/i);
    if (formMatch) return `Form ${formMatch[2]}`;
    const gradeMatch = clean.match(/\b(grade|g|std|standard|class)\s*([0-9]{1,2})\b/i);
    if (gradeMatch) return `Grade ${gradeMatch[2]}`;
    const ppMatch = clean.match(/\b(pp\s*[1-2]|playgroup|ecde|ecd|nursery|reception)\b/i);
    if (ppMatch) return ppMatch[1].toUpperCase().replace(/\s+/g, '');
    const yearMatch = clean.match(/\b(year|yr)\s*([0-9]{1,2})\b/i);
    if (yearMatch) return `Year ${yearMatch[2]}`;
    return clean;
}

/**
 * Checks if two grade levels are adjacent (e.g. Form 3 and Form 4, or Grade 7 and Grade 8)
 */
export function isAdjacentGrade(grade1: string, grade2: string): boolean {
    if (!grade1 || !grade2) return false;
    const g1 = extractGradeLevel(grade1);
    const g2 = extractGradeLevel(grade2);
    if (g1.toLowerCase() === g2.toLowerCase()) return true;

    const num1 = parseInt(g1.replace(/\D/g, ''), 10);
    const num2 = parseInt(g2.replace(/\D/g, ''), 10);
    if (!isNaN(num1) && !isNaN(num2)) {
        const type1 = g1.replace(/[0-9\s]/g, '').toLowerCase();
        const type2 = g2.replace(/[0-9\s]/g, '').toLowerCase();
        if (type1 === type2 && Math.abs(num1 - num2) === 1) {
            return true;
        }
    }
    return false;
}

/**
 * Normalizes subject names for fuzzy matching (e.g. "Mathematics" and "Maths", "Chemistry" and "Chem")
 */
export function isSubjectEquivalent(subj1: string, subj2: string): boolean {
    if (!subj1 || !subj2) return false;
    const s1 = subj1.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = subj2.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (s1 === s2) return true;

    const aliases: Record<string, string[]> = {
        math: ['mathematics', 'maths', 'puremath', 'generalmath'],
        chem: ['chemistry'],
        bio: ['biology'],
        phys: ['physics'],
        hist: ['history', 'historygovernment', 'government'],
        geo: ['geography'],
        cre: ['christianreligiouseducation', 'religiouseducation', 'ire', 'islamicreligiouseducation', 'hre'],
        eng: ['english', 'englishlanguage', 'literature', 'englishliterature'],
        kisw: ['kiswahili', 'swahili', 'fasihi'],
        biz: ['businessstudies', 'business', 'commerce', 'accounting', 'economics'],
        agri: ['agriculture'],
        comp: ['computerstudies', 'computerscience', 'ict'],
        french: ['francais']
    };

    for (const [key, list] of Object.entries(aliases)) {
        const fullGroup = [key, ...list];
        const match1 = fullGroup.some(item => s1.includes(item) || item.includes(s1));
        const match2 = fullGroup.some(item => s2.includes(item) || item.includes(s2));
        if (match1 && match2) return true;
    }
    return false;
}

/**
 * Priority-based auto-reassignment engine:
 * Evaluates candidate teachers in the school, strictly verifies remedial eligibility,
 * checks subject competence & grade/class level qualifications, timetable collisions,
 * daily quota limits, preferred day availability, and workload fairness.
 */
export function rankSubstituteCandidates(params: {
    allocation: RemedialAllocation;
    candidates: User[];
    allAllocations: RemedialAllocation[];
    declinedTeacherIds?: string[];
    teacherPreferences?: Record<string, TeacherDayPreference | any> | TeacherDayPreference[];
    classSubjectAllocations?: any;
    maxLessonsPerDay?: number;
    maxWeekendLessonsPerDay?: number;
    strictSubjectMatch?: boolean;
    strictGradeMatch?: boolean;
    allowAdjacentGrade?: boolean;
    strictDayMatch?: boolean;
}): { bestCandidate: User | null; rankedCandidates: CandidateScore[] } {
    const {
        allocation,
        candidates,
        allAllocations,
        declinedTeacherIds = [],
        teacherPreferences = {},
        classSubjectAllocations = {},
        maxLessonsPerDay = 1,
        maxWeekendLessonsPerDay = 2,
        strictSubjectMatch = true,
        strictGradeMatch = true,
        allowAdjacentGrade = false,
        strictDayMatch = false
    } = params;

    const isWeekend = ['Saturday', 'Sunday'].includes(allocation.dayOfWeek);
    const dailyQuota = isWeekend ? maxWeekendLessonsPerDay : maxLessonsPerDay;

    // Target allocation Subject & Grade level
    const targetSubject = (allocation.subjectName || allocation.subjectId || '').trim();
    const targetGrade = extractGradeLevel(allocation.className || allocation.courseId || '');

    // Normalize teacher preferences map
    const prefsMap: Record<string, TeacherDayPreference> = Array.isArray(teacherPreferences)
        ? teacherPreferences.reduce((acc, p) => ({ ...acc, [p.teacherId || '']: p }), {})
        : teacherPreferences;

    // Filter out:
    // 1. Original / current teacher of this allocation
    // 2. Teachers who have already declined this substitute request
    const excludedIds = new Set<string>([
        allocation.teacherId,
        allocation.originalTeacherId || '',
        ...declinedTeacherIds
    ].filter(Boolean));

    const scoredCandidates: CandidateScore[] = [];

    for (const teacher of candidates) {
        if (!teacher || !teacher.id || excludedIds.has(teacher.id)) {
            continue;
        }

        // Check if teacher is authentic teaching staff (strictly excluding support staff)
        if (!isAcademicTeacher(teacher)) {
            continue;
        }

        // 1. Explicit Remedial Eligibility Check
        const teacherPref = prefsMap[teacher.id];
        if (teacherPref?.isEligible === false) {
            continue; // Excluded from remedial program by administration
        }
        const teacherMeta = teacher.metadata || {};
        if (teacherMeta.remedialEligible === false || teacherMeta.isRemedialEligible === false) {
            continue;
        }

        // 2. Preferred Day Availability Check
        const preferredDays = teacherPref?.preferredDays || [];
        const isPreferredDay = preferredDays.includes(allocation.dayOfWeek);
        if (strictDayMatch && preferredDays.length > 0 && !isPreferredDay) {
            continue; // Teacher has strictly set availability and this day is not included
        }

        // 3. Collision check with existing confirmed allocations on this day
        const teacherAllocationsToday = allAllocations.filter(a =>
            a.id !== allocation.id &&
            a.status !== 'Cancelled' &&
            (a.teacherId === teacher.id || (a.status === 'Substitute Pending' && a.substituteTeacherId === teacher.id)) &&
            a.dayOfWeek === allocation.dayOfWeek
        );

        const hasCollision = teacherAllocationsToday.some(a =>
            isTimeRangeOverlapping(a.startTime, a.endTime, allocation.startTime, allocation.endTime)
        );

        if (hasCollision) {
            continue; // Cannot substitute due to timetable collision
        }

        // 4. Daily Quota Check: ensure teacher won't exceed maximum daily remedial sessions
        if (teacherAllocationsToday.length >= dailyQuota) {
            continue; // Reached maximum allowed remedial lessons on this day
        }

        // 5. Subject Competence Discovery & Matching
        const authorizedSubjects = teacherPref?.authorizedSubjects || [];
        const teacherSubjectsInMeta = (teacherMeta.subjects || teacherMeta.subjectIds || []) as string[];

        // Find all subjects this teacher already teaches in remedial allocations
        const teacherRemedialAllocations = allAllocations.filter(a =>
            a.teacherId === teacher.id && a.status !== 'Cancelled'
        );
        const teachesInRemedials = teacherRemedialAllocations.some(a =>
            isSubjectEquivalent(a.subjectName || a.subjectId || '', targetSubject)
        );

        // Check classSubjectAllocations (master curriculum allocation map)
        const courseAllocations = classSubjectAllocations[allocation.courseId] || classSubjectAllocations[allocation.className || ''] || {};
        const teachesExactClass = courseAllocations[allocation.subjectId] === teacher.id ||
            courseAllocations[targetSubject] === teacher.id;

        let teachesSubjectInMasterTimetable = false;
        Object.values(classSubjectAllocations).forEach((subjMap: any) => {
            if (subjMap && (subjMap[allocation.subjectId] === teacher.id || subjMap[targetSubject] === teacher.id)) {
                teachesSubjectInMasterTimetable = true;
            }
        });

        const isAuthSubjectMatch = authorizedSubjects.some(s => isSubjectEquivalent(s, targetSubject));
        const isMetaSubjectMatch = teacherSubjectsInMeta.some(s => isSubjectEquivalent(s, targetSubject));
        const matchesDepartment = (teacher as any).departmentId && (allocation as any).departmentId &&
            (teacher as any).departmentId === (allocation as any).departmentId;

        const isSubjectMatch = teachesExactClass ||
            isAuthSubjectMatch ||
            teachesInRemedials ||
            teachesSubjectInMasterTimetable ||
            isMetaSubjectMatch;

        // Disqualify if strictSubjectMatch is enabled and teacher doesn't teach this subject
        if (strictSubjectMatch && !isSubjectMatch && !matchesDepartment) {
            continue; // Not qualified for this subject
        }

        // 6. Grade / Class Level Qualification Check
        const authorizedGrades = teacherPref?.authorizedGrades || [];
        const teacherGradesInMeta = (teacherMeta.classes || teacherMeta.grades || []) as string[];

        // Extract grades teacher currently teaches in remedial allocations
        const teacherRemedialGrades = teacherRemedialAllocations.map(a =>
            extractGradeLevel(a.className || a.courseId || '')
        ).filter(Boolean);

        // Check if teacher matches the target grade level
        const isExactGradeAuth = authorizedGrades.some(g => extractGradeLevel(g) === targetGrade);
        const isExactGradeRemedial = teacherRemedialGrades.some(g => g === targetGrade);
        const isExactGradeMeta = teacherGradesInMeta.some(g => extractGradeLevel(g) === targetGrade);
        const isExactGradeTimetable = teachesExactClass;

        const isGradeMatch = isExactGradeAuth || isExactGradeRemedial || isExactGradeMeta || isExactGradeTimetable;
        const isAdjacentGradeMatch = allowAdjacentGrade && (
            authorizedGrades.some(g => isAdjacentGrade(g, targetGrade)) ||
            teacherRemedialGrades.some(g => isAdjacentGrade(g, targetGrade))
        );

        // If teacher has explicit authorized grades or remedial teaching history, enforce grade match
        const hasDefinedGradeQualifications = authorizedGrades.length > 0 || teacherRemedialGrades.length > 0 || teacherGradesInMeta.length > 0;
        if (strictGradeMatch && hasDefinedGradeQualifications && !isGradeMatch && !isAdjacentGradeMatch) {
            continue; // Not qualified to teach this grade level (e.g. Form 1 teacher attempting Form 4)
        }

        // 7. Score Calculation
        let score = 100;
        const reasons: string[] = [];

        if (teachesExactClass) {
            score += 150;
            reasons.push('Assigned curriculum teacher for this stream (+150)');
        } else if (isSubjectMatch && isGradeMatch) {
            score += 100;
            reasons.push(`Teaches ${targetSubject} in ${targetGrade} (+100)`);
        } else if (isSubjectMatch && isAdjacentGradeMatch) {
            score += 50;
            reasons.push(`Teaches ${targetSubject} in adjacent grade (+50)`);
        } else if (isSubjectMatch) {
            score += 40;
            reasons.push(`Verified teacher for ${targetSubject} (+40)`);
        } else if (matchesDepartment) {
            score += 20;
            reasons.push('Same department (+20)');
        }

        // Day preference boost / penalty
        if (isPreferredDay) {
            score += 50;
            reasons.push(`Day ${allocation.dayOfWeek} is in preferred schedule (+50)`);
        } else if (preferredDays.length > 0) {
            score -= 25;
            reasons.push(`Preferred days exist, but not ${allocation.dayOfWeek} (-25)`);
        }

        // Workload Balancing (fairness penalty)
        const teacherAllAllocationsCount = allAllocations.filter(a =>
            a.status !== 'Cancelled' &&
            (a.teacherId === teacher.id || a.substituteTeacherId === teacher.id)
        ).length;

        const dailyCount = teacherAllocationsToday.length;
        score -= dailyCount * 25;
        score -= teacherAllAllocationsCount * 10;

        if (dailyCount > 0) {
            reasons.push(`Currently has ${dailyCount} session(s) today (-${dailyCount * 25})`);
        }
        if (teacherAllAllocationsCount > 0) {
            reasons.push(`Total load: ${teacherAllAllocationsCount} weekly sessions (-${teacherAllAllocationsCount * 10})`);
        }

        scoredCandidates.push({
            teacher,
            score,
            reasons,
            isSubjectMatch,
            isGradeMatch: isGradeMatch || isAdjacentGradeMatch,
            isPreferredDay,
            matchedSubject: targetSubject,
            matchedGrade: targetGrade
        });
    }

    // Sort descending by score
    scoredCandidates.sort((a, b) => b.score - a.score);

    return {
        bestCandidate: scoredCandidates.length > 0 ? scoredCandidates[0].teacher : null,
        rankedCandidates: scoredCandidates
    };
}

/**
 * Checks whether a substitution confirmation deadline has elapsed.
 */
export function isConfirmationExpired(deadlineIso?: string): boolean {
    if (!deadlineIso) return false;
    return new Date(deadlineIso).getTime() <= Date.now();
}

/**
 * Calculates remaining minutes until confirmation deadline.
 */
export function getRemainingMinutes(deadlineIso?: string): number {
    if (!deadlineIso) return 0;
    const diffMs = new Date(deadlineIso).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / 60000));
}

export interface TeacherQualificationParams {
    teacher: User;
    targetSubject: string;
    targetClassOrGrade?: string;
    teacherPreferences?: Record<string, TeacherDayPreference | any> | TeacherDayPreference[];
    classSubjectAllocations?: any;
    strictSubjectMatchOnly?: boolean;
    strictGradeMatchOnly?: boolean;
    allowAdjacentGradeSubstitution?: boolean;
    targetDayOfWeek?: string;
}

export interface TeacherQualificationResult {
    qualified: boolean;
    reasons: string[];
    isSubjectMatch: boolean;
    isGradeMatch: boolean;
    isPreferredDay?: boolean;
}

/**
 * Checks whether a teacher is qualified to teach a specific remedial lesson,
 * verifying academic staff status, remedial eligibility, subject matching,
 * grade/class matching, and day preferences.
 */
export function isTeacherQualifiedForLesson(params: TeacherQualificationParams): TeacherQualificationResult {
    const {
        teacher,
        targetSubject,
        targetClassOrGrade = '',
        teacherPreferences = {},
        classSubjectAllocations = {},
        strictSubjectMatchOnly = true,
        strictGradeMatchOnly = true,
        allowAdjacentGradeSubstitution = false,
        targetDayOfWeek
    } = params;

    const reasons: string[] = [];

    if (!teacher || !teacher.id) {
        return {
            qualified: false,
            reasons: ['Invalid teacher object'],
            isSubjectMatch: false,
            isGradeMatch: false
        };
    }

    // 1. Academic teacher verification
    if (!isAcademicTeacher(teacher)) {
        reasons.push('Staff member is not an active academic teaching staff');
    }

    // 2. Preferences map normalization
    const prefsMap: Record<string, TeacherDayPreference> = Array.isArray(teacherPreferences)
        ? teacherPreferences.reduce((acc, p) => ({ ...acc, [p.teacherId || '']: p }), {})
        : (teacherPreferences || {});

    const teacherPref = prefsMap[teacher.id];
    const teacherMeta = teacher.metadata || {};

    // 3. Remedial Program Eligibility
    if (teacherPref?.isEligible === false || teacherMeta.remedialEligible === false || teacherMeta.isRemedialEligible === false) {
        reasons.push('Teacher is flagged as ineligible for the remedial program');
    }

    // 4. Subject Matching
    const cleanSubj = (targetSubject || '').trim();
    let isSubjectMatch = true;
    if (cleanSubj) {
        const authorizedSubjects = teacherPref?.authorizedSubjects || [];
        const teacherSubjectsInMeta = (teacherMeta.subjects || teacherMeta.subjectIds || []) as string[];

        const isAuthSubjectMatch = authorizedSubjects.some((s: string) => isSubjectEquivalent(s, cleanSubj));
        const isMetaSubjectMatch = teacherSubjectsInMeta.some((s: string) => isSubjectEquivalent(s, cleanSubj));

        let teachesInAllocations = false;
        if (classSubjectAllocations && typeof classSubjectAllocations === 'object') {
            const courseAllocations = classSubjectAllocations[targetClassOrGrade] || {};
            if (courseAllocations[cleanSubj] === teacher.id) {
                teachesInAllocations = true;
            } else {
                Object.values(classSubjectAllocations).forEach((subjMap: any) => {
                    if (subjMap && typeof subjMap === 'object' && subjMap[cleanSubj] === teacher.id) {
                        teachesInAllocations = true;
                    }
                });
            }
        }

        isSubjectMatch = isAuthSubjectMatch || isMetaSubjectMatch || teachesInAllocations;

        if (strictSubjectMatchOnly && !isSubjectMatch) {
            reasons.push(`Does not have subject qualification for "${cleanSubj}"`);
        }
    }

    // 5. Grade / Class Matching
    const targetGrade = extractGradeLevel(targetClassOrGrade);
    let isGradeMatch = true;
    let isAdjacentMatch = false;
    if (targetGrade) {
        const authorizedGrades = teacherPref?.authorizedGrades || [];
        const teacherGradesInMeta = (teacherMeta.classes || teacherMeta.grades || []) as string[];

        const hasDefinedGrades = authorizedGrades.length > 0 || teacherGradesInMeta.length > 0;
        if (hasDefinedGrades) {
            isGradeMatch = authorizedGrades.some((g: string) => extractGradeLevel(g) === targetGrade) ||
                           teacherGradesInMeta.some((g: string) => extractGradeLevel(g) === targetGrade);

            if (!isGradeMatch && allowAdjacentGradeSubstitution) {
                isAdjacentMatch = authorizedGrades.some((g: string) => isAdjacentGrade(g, targetGrade)) ||
                                  teacherGradesInMeta.some((g: string) => isAdjacentGrade(g, targetGrade));
            }

            if (strictGradeMatchOnly && !isGradeMatch && !isAdjacentMatch) {
                reasons.push(`Not authorized for class level "${targetGrade}"`);
            }
        }
    }

    // 6. Day Preference check (if targetDayOfWeek provided)
    let isPreferredDay: boolean | undefined = undefined;
    if (targetDayOfWeek && teacherPref?.preferredDays && teacherPref.preferredDays.length > 0) {
        isPreferredDay = teacherPref.preferredDays.includes(targetDayOfWeek);
    }

    return {
        qualified: reasons.length === 0,
        reasons,
        isSubjectMatch,
        isGradeMatch: isGradeMatch || isAdjacentMatch,
        isPreferredDay
    };
}

