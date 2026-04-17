import type { TimetableEntry, Conflict, Room, Course, Subject, TimetableSettings, TimetablePeriod } from '../types';
import { timeToMinutes, minutesToTime } from './timeUtils';

export const detectTimetableConflicts = (
    timetable: TimetableEntry[],
    rooms: Room[],
    courses: Course[] = [],
    subjects: Subject[] = [],
    settings?: TimetableSettings
): Conflict[] => {
    const conflicts: Conflict[] = [];
    const roomMap = new Map<string, Room>(rooms.map(r => [r.id, r]));

    // Group entries by day and Level for efficient "blocked" check
    const entriesByDay: Record<string, TimetableEntry[]> = {};
    for (const entry of timetable) {
        if (!entriesByDay[entry.day]) entriesByDay[entry.day] = [];
        entriesByDay[entry.day].push(entry);
    }

    // Pre-calculate groups for "blocked" detection (Optimized)
    const dayLevelSlotMap = new Map<string, TimetableEntry[]>();
    for (const entry of timetable) {
        const key = `${entry.day}-${entry.courseLevelId}-${entry.startTime}`;
        if (!dayLevelSlotMap.has(key)) dayLevelSlotMap.set(key, []);
        dayLevelSlotMap.get(key)!.push(entry);
    }

    for (const day in entriesByDay) {
        const dayEntries = entriesByDay[day];

        // --- Room and Lecturer Overlap Checks ---
        for (let i = 0; i < dayEntries.length; i++) {
            const e1 = dayEntries[i];
            const s1 = timeToMinutes(e1.startTime);
            const d1 = e1.duration || (timeToMinutes(e1.endTime) - s1);
            const f1 = s1 + d1;

            // --- Period Alignment Enforcement (One period per slot) ---
            if (settings && settings.periods && settings.periods.length > 0) {
                const key = `${day}-${e1.courseLevelId}-${e1.startTime}`;
                const siblings = dayLevelSlotMap.get(key) || [];
                const isBlocked = siblings.length > 1;

                if (!isBlocked) {
                    // This is a single entry slot. It MUST match exactly ONE period in the registry.
                    const matchingPeriod = settings.periods.find(p => p.startTime === e1.startTime);
                    
                    if (!matchingPeriod) {
                        conflicts.push({
                            type: 'period_alignment',
                            resourceId: e1.id,
                            day,
                            startTime: e1.startTime,
                            conflictingEntries: [e1]
                        });
                    } else if (e1.endTime !== matchingPeriod.endTime) {
                        // Duration mismatch (e.g. double period combined into one object, or manual stretch)
                        conflicts.push({
                            type: 'period_alignment',
                            resourceId: e1.id,
                            day,
                            startTime: e1.startTime,
                            conflictingEntries: [e1]
                        });
                    }
                }
            }

            for (let j = i + 1; j < dayEntries.length; j++) {
                const e2 = dayEntries[j];
                const s2 = timeToMinutes(e2.startTime);
                const d2 = e2.duration || (timeToMinutes(e2.endTime) - s2);
                const f2 = s2 + d2;

                // Check for temporal overlap: (StartA < EndB) and (StartB < EndA)
                if (s1 < f2 && s2 < f1) {
                    // Lecturer Conflict
                    if (e1.lecturerId === e2.lecturerId) {
                        conflicts.push({
                            type: 'lecturer',
                            resourceId: e1.lecturerId,
                            day,
                            startTime: e1.startTime,
                            conflictingEntries: [e1, e2]
                        });
                    }

                    // Room Conflict (taking sharing into account)
                    if (e1.roomId === e2.roomId) {
                        const room = roomMap.get(e1.roomId);
                        if (!room?.isShared) {
                            conflicts.push({
                                type: 'room',
                                resourceId: e1.roomId,
                                day,
                                startTime: e1.startTime,
                                conflictingEntries: [e1, e2]
                            });
                        }
                    }

                    // Group (Stream) Conflict
                    if (e1.courseLevelId === e2.courseLevelId) {
                        // Special check: If they start at the same time, it's a "block" (Pathway), not a conflict
                        if (e1.startTime !== e2.startTime) {
                            conflicts.push({
                                type: 'group_overlap',
                                resourceId: e1.courseLevelId,
                                day,
                                startTime: e1.startTime,
                                conflictingEntries: [e1, e2]
                            });
                        }
                    }
                }
            }
        }
    }

    // --- Consecutive Subject Conflicts (Per Course Level) ---
    for (const course of courses) {
        for (const level of (course.levels || [])) {
            const levelEntries = timetable.filter(e => level.subjectIds && level.subjectIds.includes(e.subjectId));
            const daysOnThisLevel = [...new Set(levelEntries.map(e => e.day))];

            for (const day of daysOnThisLevel) {
                const sortedDayEntries = levelEntries
                    .filter(e => e.day === day)
                    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

                for (let i = 0; i < sortedDayEntries.length - 1; i++) {
                    const current = sortedDayEntries[i];
                    const next = sortedDayEntries[i + 1];

                    if (current.subjectId === next.subjectId && current.endTime === next.startTime) {
                        conflicts.push({
                            type: 'consecutive_subject',
                            resourceId: level.id,
                            day,
                            startTime: next.startTime,
                            conflictingEntries: [current, next]
                        });
                    }
                }
            }
        }
    }

    return conflicts;
};

export const checkMoveValidity = (
    entryId: string,
    newDay: string,
    newStartTime: string,
    timetable: TimetableEntry[],
    rooms: Room[],
    courses: Course[] = [],
    subjects: Subject[] = [],
    settings?: TimetableSettings
): { isValid: boolean, conflicts: Conflict[] } => {
    const entry = timetable.find(e => e.id === entryId);
    if (!entry) return { isValid: true, conflicts: [] };

    const duration = timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime);
    const newEndTime = minutesToTime(timeToMinutes(newStartTime) + duration);

    const tempTimetable = timetable.map(e =>
        e.id === entryId
            ? { ...e, day: newDay, startTime: newStartTime, endTime: newEndTime }
            : e
    );

    const allConflicts = detectTimetableConflicts(tempTimetable, rooms, courses, subjects, settings);

    const relevantConflicts = allConflicts.filter(c =>
        c.day === newDay &&
        (c.startTime === newStartTime || c.conflictingEntries.some(e => e.id === entryId))
    );

    return {
        isValid: relevantConflicts.length === 0,
        conflicts: relevantConflicts
    };
};