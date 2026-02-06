import type { TimetableEntry, Conflict, Room } from '../types';

export const detectTimetableConflicts = (timetable: TimetableEntry[], rooms: Room[]): Conflict[] => {
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
        if (entriesInSlot.length < 2) {
            continue; // No possible conflict if only one or zero lessons
        }

        const [day, startTime] = key.split('-');
        
        // Check for room conflicts
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

        // Check for lecturer conflicts
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

    return conflicts;
};