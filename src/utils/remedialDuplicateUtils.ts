import type { RemedialSession } from '../types';

export interface DuplicateCluster {
    clusterKey: string;
    teacherName: string;
    teacherId: string;
    subjectName: string;
    className: string;
    stream?: string;
    dateStr: string;
    canonicalSession: RemedialSession;
    duplicateSessions: RemedialSession[];
    allSessions: RemedialSession[];
    reason: string;
}

export interface DuplicateDetectionResult {
    clusters: DuplicateCluster[];
    totalDuplicatesCount: number;
    duplicateSessionIds: string[];
    duplicateSessions: RemedialSession[];
}

function cleanStr(s?: string | null): string {
    return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getSessionDateString(s: RemedialSession): string {
    const raw = s.startTime || s.createdAt || '';
    if (!raw) return '';
    try {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
    } catch (_) {}
    return (raw.split('T')[0] || '').trim();
}

/**
 * Calculates a quality score for a session.
 * Sessions with higher approval status, more complete verification metadata,
 * or completed durations receive higher priority to be retained as the canonical record.
 */
export function getSessionQualityScore(s: RemedialSession): number {
    let score = 0;
    const status = (s.status || '').toLowerCase().trim();

    // Lifecycle status hierarchy
    if (status === 'paid') score += 1000;
    else if (status === 'cash issued to dos') score += 900;
    else if (status === 'pending operations payout') score += 800;
    else if (status === 'approved') score += 700;
    else if (status === 'pending headteacher approval') score += 600;
    else if (status === 'prefect confirmed') score += 500;
    else if (status === 'pending duty approval') score += 400;
    else if (status === 'in progress' || status === 'inprogress') score += 100;
    else if (status.includes('reject')) score += 50;
    else score += 200;

    // Approvals
    if (s.headteacherApproved || (s as any).headteacher_approved) score += 60;
    if (s.dutyApproved || (s as any).duty_approved) score += 40;
    if (s.operationsDisbursed || (s as any).operations_disbursed) score += 50;

    // Prefect validation
    if (s.prefectToken || (s as any).prefect_token) score += 30;
    if (s.prefectName && s.prefectName !== 'None') score += 15;
    if (s.prefectId) score += 10;

    // Completed duration & end times
    if (s.endTime) score += 25;
    const hrs = Number(s.hours || (s as any).durationHours || (s as any).duration_hours || 0);
    if (!isNaN(hrs) && hrs > 0) score += 20;
    if (s.durationMinutes && s.durationMinutes > 0) score += 10;

    // Signature data
    if ((s as any).teacherSignatureDataUrl) score += 30;

    return score;
}

/**
 * Checks if two sessions are duplicates of each other.
 */
export function areSessionsDuplicates(a: RemedialSession, b: RemedialSession): boolean {
    if (!a || !b || a.id === b.id) return false;

    // 1. Teacher match
    const sameTeacher = (a.teacherId && b.teacherId && a.teacherId === b.teacherId) ||
        (cleanStr(a.teacherName) && cleanStr(b.teacherName) && cleanStr(a.teacherName) === cleanStr(b.teacherName));
    if (!sameTeacher) return false;

    // 2. Date match
    const dateA = getSessionDateString(a);
    const dateB = getSessionDateString(b);
    if (!dateA || !dateB || dateA !== dateB) return false;

    // 3. Subject match
    const sameSubject = (a.subjectId && b.subjectId && a.subjectId === b.subjectId) ||
        (cleanStr(a.subjectName) && cleanStr(b.subjectName) && cleanStr(a.subjectName) === cleanStr(b.subjectName));
    if (!sameSubject) return false;

    // 4. Class match
    const sameClass = (a.courseId && b.courseId && a.courseId === b.courseId) ||
        (cleanStr(a.className) && cleanStr(b.className) && cleanStr(a.className) === cleanStr(b.className));
    if (!sameClass) return false;

    // 5. Stream match (allow flexible match if one is generic / all streams)
    const streamA = cleanStr(a.stream);
    const streamB = cleanStr(b.stream);
    const streamsMatch = !streamA || !streamB || 
        streamA === 'all' || streamB === 'all' || 
        streamA === 'all streams' || streamB === 'all streams' || 
        streamA === streamB;
    if (!streamsMatch) return false;

    // 6. Time and Status correlation
    const isProgA = a.status === 'In Progress' || cleanStr(a.status) === 'inprogress';
    const isProgB = b.status === 'In Progress' || cleanStr(b.status) === 'inprogress';

    // If one is in progress and another is completed/submitted on the same day, it's an orphaned duplicate
    if (isProgA || isProgB) return true;

    // If both are completed/logged, check start time proximity
    const timeA = new Date(a.startTime).getTime();
    const timeB = new Date(b.startTime).getTime();
    if (!isNaN(timeA) && !isNaN(timeB)) {
        const diffMinutes = Math.abs(timeA - timeB) / (1000 * 60);
        // Lessons for the same teacher, class & subject starting within 90 minutes of each other on the same day are duplicates
        if (diffMinutes <= 90) return true;
    } else {
        // If times cannot be parsed, same date + class + subject + teacher constitutes a duplicate log
        return true;
    }

    return false;
}

/**
 * Detects all duplicate remedial sessions from a given list,
 * grouping them into clusters and determining which session to keep and which to remove.
 */
export function detectDuplicateRemedialSessions(sessions: RemedialSession[]): DuplicateDetectionResult {
    const validSessions = (sessions || []).filter(s => s && s.id);
    const visited = new Set<string>();
    const clusters: DuplicateCluster[] = [];

    for (let i = 0; i < validSessions.length; i++) {
        const current = validSessions[i];
        if (visited.has(current.id)) continue;

        const matchingGroup: RemedialSession[] = [current];

        for (let j = i + 1; j < validSessions.length; j++) {
            const candidate = validSessions[j];
            if (visited.has(candidate.id)) continue;

            if (areSessionsDuplicates(current, candidate)) {
                matchingGroup.push(candidate);
                visited.add(candidate.id);
            }
        }

        if (matchingGroup.length > 1) {
            visited.add(current.id);

            // Sort matching group by quality score descending (best session first)
            matchingGroup.sort((a, b) => {
                const scoreA = getSessionQualityScore(a);
                const scoreB = getSessionQualityScore(b);
                if (scoreB !== scoreA) return scoreB - scoreA;

                // Tie-breaker: older createdAt or earlier startTime
                const timeA = new Date(a.startTime || a.createdAt || 0).getTime();
                const timeB = new Date(b.startTime || b.createdAt || 0).getTime();
                return timeA - timeB;
            });

            const canonical = matchingGroup[0];
            const duplicates = matchingGroup.slice(1);

            const dateStr = getSessionDateString(canonical);
            const teacherName = canonical.teacherName || duplicates[0]?.teacherName || 'Teacher';
            const subjectName = canonical.subjectName || duplicates[0]?.subjectName || 'Subject';
            const className = canonical.className || duplicates[0]?.className || 'Class';

            let reason = `Found ${matchingGroup.length} duplicate logs for ${subjectName} (${className}) on ${dateStr}`;
            if (duplicates.some(d => d.status === 'In Progress' || cleanStr(d.status) === 'inprogress')) {
                reason = `Orphaned 'In Progress' duplicate superseded by ${canonical.status} session`;
            } else if (matchingGroup.every(m => m.status === canonical.status)) {
                reason = `Identical double-logged session (${canonical.status})`;
            }

            clusters.push({
                clusterKey: `${canonical.teacherId}_${canonical.courseId || canonical.className}_${canonical.subjectId || canonical.subjectName}_${dateStr}`,
                teacherName,
                teacherId: canonical.teacherId || '',
                subjectName,
                className,
                stream: canonical.stream || duplicates[0]?.stream,
                dateStr,
                canonicalSession: canonical,
                duplicateSessions: duplicates,
                allSessions: matchingGroup,
                reason
            });
        }
    }

    const allDuplicates: RemedialSession[] = [];
    const duplicateIds: string[] = [];

    clusters.forEach(c => {
        c.duplicateSessions.forEach(d => {
            allDuplicates.push(d);
            duplicateIds.push(d.id);
        });
    });

    return {
        clusters,
        totalDuplicatesCount: allDuplicates.length,
        duplicateSessionIds: duplicateIds,
        duplicateSessions: allDuplicates
    };
}
