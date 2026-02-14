import type { TimetableEntry, Conflict, Room, Course, Subject } from '../types';
import { timeToMinutes } from './timeUtils';

export const detectTimetableConflicts = (
    timetable: TimetableEntry[],
    rooms: Room[],
    courses: Course[] = [],
    subjects: Subject[] = []
): Conflict[] => {
    const conflicts: Conflict[] = [];
    const timeSlots = new Map<string, TimetableEntry[]>(); // Key: "Day-StartTime"

    // Group entries by their time slot
    for (const entry of timetable) {
        const key = `${entry.day}-${entry.startTime}`;
        if (!timeSlots.has(key)) {
            timeSlots.set(key, []);
        }
        timeSlots.get(key)!.push(entry);
    }

    const roomMap = new Map<string, Room>(rooms.map(r => [r.id, r]));

    // Iterate over each time slot and check for conflicts
    for (const [key, entriesInSlot] of timeSlots.entries()) {
        if (entriesInSlot.length < 1) continue;

        const [day, startTime] = key.split('-');

        // --- Room Conflicts ---
        const roomUsage = new Map<string, TimetableEntry[]>();
        for (const entry of entriesInSlot) {
            if (!roomUsage.has(entry.roomId)) {
                roomUsage.set(entry.roomId, []);
            }
            roomUsage.get(entry.roomId)!.push(entry);
        }

        for (const [roomId, conflictingEntries] of roomUsage.entries()) {
            const room = roomMap.get(roomId);
            const limit = room?.isShared ? room.concurrentSessions || 1 : 1;
            if (conflictingEntries.length > limit) {
                conflicts.push({
                    type: 'room',
                    resourceId: roomId,
                    day,
                    startTime,
                    conflictingEntries,
                });
            }
        }

        // --- Lecturer Conflicts ---
        const lecturerUsage = new Map<string, TimetableEntry[]>();
        for (const entry of entriesInSlot) {
            if (!lecturerUsage.has(entry.lecturerId)) {
                lecturerUsage.set(entry.lecturerId, []);
            }
            lecturerUsage.get(entry.lecturerId)!.push(entry);
        }

        for (const [lecturerId, conflictingEntries] of lecturerUsage.entries()) {
            if (conflictingEntries.length > 1) {
                conflicts.push({
                    type: 'lecturer',
                    resourceId: lecturerId,
                    day,
                    startTime,
                    conflictingEntries,
                });
            }
        }
    }

    // --- Consecutive Subject Conflicts (Per Course Level) ---
    for (const course of courses) {
        for (const level of course.levels) {
            // Find entries relevant to this level (where subject matches level's ids)
            const levelEntries = timetable.filter(e => level.subjectIds.includes(e.subjectId));

            // Check each day
            const daysOnThisLevel = [...new Set(levelEntries.map(e => e.day))];
            for (const day of daysOnThisLevel) {
                const dayEntries = levelEntries
                    .filter(e => e.day === day)
                    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

                for (let i = 0; i < dayEntries.length - 1; i++) {
                    const current = dayEntries[i];
                    const next = dayEntries[i + 1];

                    // If same subject and they are back-to-back (endTime == startTime)
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