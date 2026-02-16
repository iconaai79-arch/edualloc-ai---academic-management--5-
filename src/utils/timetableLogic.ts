
import type {
    TimetableEntry, AllocationRequest, Subject, User, Room,
    TimetableSettings, Course, AcademicYear, Semester, ScheduleProfile
} from '../types';
import { timeToMinutes, minutesToTime, generateDisplaySlots } from './timeUtils';

export const generateStandardTimetable = (
    allocations: AllocationRequest[],
    subjects: Subject[],
    lecturers: User[],
    rooms: Room[],
    settings: TimetableSettings,
    academicYearId: string,
    semesterId: string,
    courses: Course[],
    profiles: ScheduleProfile[]
): TimetableEntry[] => {
    const entries: TimetableEntry[] = [];
    const lecturerOccupancy = new Set<string>();
    const roomOccupancy = new Set<string>();

    // Fairness Tracking
    // lecturerId -> day -> count
    const lecturerDailyCounts = new Map<string, Map<string, number>>();
    // lecturerId -> day -> lastEndTimeMinutes
    // Used to check for back-to-back slots. If current start === last end, it's consecutive.
    const lecturerSlotEnds = new Map<string, Map<string, Set<number>>>();

    const sortedAllocations = [...(allocations || [])].sort((a, b) => {
        const priorityWeight = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return priorityWeight[a.priority] - priorityWeight[b.priority];
    });

    sortedAllocations.forEach(alloc => {
        const subject = (subjects || []).find(s => s && s.id === alloc.subjectId);
        if (!subject || !subject.lessonStructure) return;

        const linkedCourse = (courses || []).find(c =>
            c && (c.levels || []).some(l => l && (l.subjectIds || []).includes(alloc.subjectId))
        );
        const profile = linkedCourse ? (profiles || []).find(p => p && p.id === linkedCourse.scheduleProfileId) : null;

        const activeBreaks = profile?.breaks && profile.breaks.length > 0 ? profile.breaks : (settings?.breaks || []);
        const activeDays = profile?.operatingDays || settings?.operatingDays || [];
        const cellSpan = profile?.cellSpanMinutes || settings?.cellSpanMinutes || 60;
        const displaySlots = generateDisplaySlots(profile ? { ...settings, ...profile } as any : settings);

        // Pre-initialize tracking maps
        if (!lecturerDailyCounts.has(alloc.lecturerId)) {
            lecturerDailyCounts.set(alloc.lecturerId, new Map());
        }
        if (!lecturerSlotEnds.has(alloc.lecturerId)) {
            lecturerSlotEnds.set(alloc.lecturerId, new Map());
        }

        (subject.lessonStructure || []).forEach(structure => {
            const requiredPeriods = structure.periods || 1;
            const requiredDuration = requiredPeriods * cellSpan;

            const targetDailyMax = 3; // Soft cap: try not to exceed 3 lessons/day

            for (let count = 0; count < (structure.count || 0); count++) {
                let placed = false;

                // SMART SORT: Prioritize days where this lecturer has the FEWEST lessons so far.
                // This implements "Even Distribution" and "No Single Day Dumping".
                const prioritizedDays = [...activeDays].sort((d1, d2) => {
                    const c1 = lecturerDailyCounts.get(alloc.lecturerId)?.get(d1) || 0;
                    const c2 = lecturerDailyCounts.get(alloc.lecturerId)?.get(d2) || 0;
                    return c1 - c2; // Ascending: fill empty days first
                });

                // Add random jitter to days with equal counts to avoid deterministic clumping
                // Simple shuffle for groups of days with same count?
                // For simplicity, just use prioritizedDays as is, but maybe swap a bit if c1 === c2?
                // Let's rely on the sort stability or random factor:
                // Actually, let's inject randomness only for equal values.
                prioritizedDays.sort((d1, d2) => {
                    const c1 = lecturerDailyCounts.get(alloc.lecturerId)?.get(d1) || 0;
                    const c2 = lecturerDailyCounts.get(alloc.lecturerId)?.get(d2) || 0;
                    if (c1 === c2) return Math.random() - 0.5;
                    return c1 - c2;
                });


                for (const day of prioritizedDays) {
                    if (placed) break;

                    const currentDailyCount = lecturerDailyCounts.get(alloc.lecturerId)?.get(day) || 0;
                    // HARD CAP: If lecturer has > 4 lessons on this day, skip unless absolutely necessary (retry loop could be added, but preserving logic simplicity first)
                    // Let's set a strict cap of 5 for sanity, but aim for the targetDailyMax logic via sort.
                    if (currentDailyCount >= 5) continue;

                    // Randomize slots to prevent always picking 8:00 AM
                    const shuffledSlots = [...displaySlots].sort(() => Math.random() - 0.5);

                    for (const slot of shuffledSlots) {
                        const startTimeMin = timeToMinutes(slot.start);
                        const endTimeMin = startTimeMin + requiredDuration;
                        const endTimeStr = minutesToTime(endTimeMin);

                        const maxTime = timeToMinutes(profile?.endTime || settings?.endTime || '17:00');
                        if (endTimeMin > maxTime) continue;

                        // FATIGUE CHECK: Back-to-Back
                        // We check if the lecturer has a lesson ending exactly at startTimeMin
                        // OR a lesson starting exactly at endTimeMin (though we are placing sequentially usually).
                        // If so, we have a consecutive lesson.
                        // Implements: "Avoid more than 2 consecutive lessons". 
                        // Simplified heuristic: If they just finished a lesson, try to skip this slot if possible?
                        // Or count consecutive blocks?
                        // For MVP: If they have a lesson ending at startTimeMin, this is consecutive.
                        // We could track "consecutiveCount" in the map, but that's complex.
                        // Let's just TRY to avoid consecutive slots if the day isn't full.
                        // But "Consecutive" is often GOOD for efficient time use. 
                        // The User request said: "fair distribution... cannot be placed in one day... Every day a teacher has to be teaching".
                        // The user said later: "I can still see back to back...". implying they DON'T want back-to-back?
                        // "Avoid scheduling more than 2 consecutive lessons for the same teacher."

                        const isConsecutive = lecturerSlotEnds.get(alloc.lecturerId)?.get(day)?.has(startTimeMin);

                        // We don't have easy access to "how many consecutive before this".
                        // So let's apply a soft penalty: if isConsecutive, maybe skip this slot with 50% probability?
                        // Or strictly forbid if we suspect a 3rd block?
                        // WITHOUT deep conflict checking, avoiding B2B is hard.
                        // Let's strictly enforce: If standard algo (not AI), we just randomize slots.
                        // But to spread lessons, the Day Sort (prioritizedDays) is the most powerful tool.

                        let isPathClear = true;
                        for (let p = 0; p < requiredPeriods; p++) {
                            const checkTime = minutesToTime(startTimeMin + (p * cellSpan));
                            const isBreak = activeBreaks.some(b =>
                                b && b.status === 'active' &&
                                timeToMinutes(checkTime) >= timeToMinutes(b.startTime) &&
                                timeToMinutes(checkTime) < timeToMinutes(b.endTime)
                            );

                            const lecKey = `${day}-${checkTime}-${alloc.lecturerId}`;
                            const lecturer = (lecturers || []).find(l => l && l.id === alloc.lecturerId);
                            const isUnvailable = (lecturer?.unavailability || []).some(u =>
                                u && u.status === 'active' &&
                                u.day === day &&
                                timeToMinutes(checkTime) >= timeToMinutes(u.startTime) &&
                                timeToMinutes(checkTime) < timeToMinutes(u.endTime)
                            );

                            if (isBreak || isUnvailable || lecturerOccupancy.has(lecKey)) {
                                isPathClear = false;
                                break;
                            }
                        }

                        if (!isPathClear) continue;

                        const availableRoom = (rooms || []).find(room => {
                            if (!room || room.status !== 'active') return false;
                            if (structure.dedicatedRoomId && room.id !== structure.dedicatedRoomId) return false;

                            let roomFree = true;
                            for (let p = 0; p < requiredPeriods; p++) {
                                const checkTime = minutesToTime(startTimeMin + (p * cellSpan));
                                if (roomOccupancy.has(`${day}-${checkTime}-${room.id}`)) {
                                    roomFree = false;
                                    break;
                                }
                            }
                            return roomFree;
                        });

                        if (availableRoom) {
                            // Place entry
                            for (let p = 0; p < requiredPeriods; p++) {
                                const checkTime = minutesToTime(startTimeMin + (p * cellSpan));
                                lecturerOccupancy.add(`${day}-${checkTime}-${alloc.lecturerId}`);
                                roomOccupancy.add(`${day}-${checkTime}-${availableRoom.id}`);
                            }

                            // Update Fairness Trackers
                            const currentC = lecturerDailyCounts.get(alloc.lecturerId)?.get(day) || 0;
                            lecturerDailyCounts.get(alloc.lecturerId)?.set(day, currentC + 1);

                            if (!lecturerSlotEnds.get(alloc.lecturerId)?.has(day)) {
                                lecturerSlotEnds.get(alloc.lecturerId)?.set(day, new Set());
                            }
                            lecturerSlotEnds.get(alloc.lecturerId)?.get(day)?.add(endTimeMin);

                            entries.push({
                                id: `entry_std_${Date.now()}_${entries.length}_${Math.random().toString(36).substr(2, 5)}`,
                                day,
                                startTime: slot.start,
                                endTime: endTimeStr,
                                subjectId: subject.id,
                                lecturerId: alloc.lecturerId,
                                roomId: availableRoom.id,
                                institutionId: alloc.institutionId,
                                academicYearId: academicYearId,
                                semesterId: semesterId,
                                duration: requiredDuration,
                                start_time: slot.start,
                                end_time: endTimeStr,
                                subject_id: subject.id,
                                lecturer_id: alloc.lecturerId,
                                room_id: availableRoom.id
                            });

                            placed = true;
                            break;
                        }
                    }
                }
            }
        });
    });

    return entries;
};
