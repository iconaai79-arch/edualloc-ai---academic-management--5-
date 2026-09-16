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
    isPreferredDay: boolean;
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
 * Priority-based auto-reassignment engine:
 * Evaluates all candidate teachers in the school, checks collisions and quota limits,
 * scores subject competence and preferred day availability, and ranks the candidates.
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
}): { bestCandidate: User | null; rankedCandidates: CandidateScore[] } {
    const {
        allocation,
        candidates,
        allAllocations,
        declinedTeacherIds = [],
        teacherPreferences = {},
        classSubjectAllocations = {},
        maxLessonsPerDay = 1,
        maxWeekendLessonsPerDay = 2
    } = params;

    const isWeekend = ['Saturday', 'Sunday'].includes(allocation.dayOfWeek);
    const dailyQuota = isWeekend ? maxWeekendLessonsPerDay : maxLessonsPerDay;

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

        // 1. Collision check with existing confirmed allocations
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

        // 2. Quota check: ensure teacher won't exceed maximum daily remedial sessions
        if (teacherAllocationsToday.length >= dailyQuota) {
            continue; // Reached maximum allowed remedial lessons on this day
        }

        // 3. Score calculation
        let score = 100;
        const reasons: string[] = [];

        // A. Subject Competence Matching
        let isSubjectMatch = false;

        // Check classSubjectAllocations (institution level allocation map)
        const courseAllocations = classSubjectAllocations[allocation.courseId] || classSubjectAllocations[allocation.className || ''] || {};
        const teachesExactClass = courseAllocations[allocation.subjectId] === teacher.id;

        // Check across any course in classSubjectAllocations
        let teachesSubjectSomewhere = false;
        Object.values(classSubjectAllocations).forEach((subjMap: any) => {
            if (subjMap && subjMap[allocation.subjectId] === teacher.id) {
                teachesSubjectSomewhere = true;
            }
        });

        // Check teacher metadata / departments
        const teacherSubjects = (teacher.metadata as any)?.subjects || (teacher.metadata as any)?.subjectIds || [];
        const teachesInProfile = teacherSubjects.includes(allocation.subjectId) || teacherSubjects.includes(allocation.subjectName);
        const matchesDepartment = (teacher as any).departmentId && (allocation as any).departmentId && (teacher as any).departmentId === (allocation as any).departmentId;

        if (teachesExactClass) {
            score += 120;
            reasons.push('Assigned subject teacher for this stream (+120)');
            isSubjectMatch = true;
        } else if (teachesSubjectSomewhere || teachesInProfile) {
            score += 70;
            reasons.push('Teaches this subject in other streams (+70)');
            isSubjectMatch = true;
        } else if (matchesDepartment) {
            score += 40;
            reasons.push('Same department as subject (+40)');
        }

        // B. Day Preference Matching
        const teacherPref = prefsMap[teacher.id];
        const preferredDays = teacherPref?.preferredDays || [];
        const isPreferredDay = preferredDays.includes(allocation.dayOfWeek);

        if (isPreferredDay) {
            score += 50;
            reasons.push(`Day ${allocation.dayOfWeek} is in teacher's preferred schedule (+50)`);
        } else if (preferredDays.length > 0) {
            score -= 20;
            reasons.push(`Teacher has preferred days, but not ${allocation.dayOfWeek} (-20)`);
        }

        // C. Workload Balancing (fairness penalty)
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
            isPreferredDay
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
