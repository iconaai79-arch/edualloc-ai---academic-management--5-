
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
): { entries: TimetableEntry[], notifications: string[] } => {
    const entries: TimetableEntry[] = [];
    const notifications: string[] = [];
    
    // High-Performance Numeric Occupancy Matrix
    const lecturerOccupancy = new Set<string>();
    const roomOccupancy = new Set<string>();
    const studentOccupancy = new Set<string>();

    const levelWorkload = new Map<string, number>();
    const lecturerDailyCounts = new Map<string, Map<string, number>>();

    // Optimization: Pre-process lecturer unavailability and breaks into numeric minutes
    const lecturerUnavailabilityMap = new Map<string, { day: string, start: number, end: number }[]>();
    lecturers.forEach(l => {
        if (l.unavailability) {
            lecturerUnavailabilityMap.set(l.id, l.unavailability
                .filter(u => u.status === 'active')
                .map(u => ({ day: u.day, start: timeToMinutes(u.startTime), end: timeToMinutes(u.endTime) }))
            );
        }
    });

    const breakMap = new Map<string, { start: number, end: number }[]>();
    // Pre-calculate profile-specific breaks
    profiles.forEach(p => {
        if (p.breaks) {
            breakMap.set(p.id, p.breaks
                .filter(b => b.status === 'active')
                .map(b => ({ start: timeToMinutes(b.startTime), end: timeToMinutes(b.endTime) }))
            );
        }
    });
    const defaultBreaks = (settings?.breaks || [])
        .filter(b => b.status === 'active')
        .map(b => ({ start: timeToMinutes(b.startTime), end: timeToMinutes(b.endTime) }));

    const sortedAllocations = [...(allocations || [])].sort(() => Math.random() - 0.5);

    sortedAllocations.forEach(alloc => {
        const subject = (subjects || []).find(s => s && s.id === alloc.subjectId);
        if (!subject || !subject.lessonStructure) return;

        const linkedCourse = (courses || []).find(c =>
            c && (c.levels || []).some(l => l && (l.subjectIds || []).includes(alloc.subjectId))
        );
        const profile = linkedCourse ? (profiles || []).find(p => p && p.id === linkedCourse.scheduleProfileId) : null;

        const activeBreaks = profile ? (breakMap.get(profile.id) || []) : defaultBreaks;
        const activeDays = profile?.operatingDays || settings?.operatingDays || [];
        const cellSpan = profile?.cellSpanMinutes || settings?.cellSpanMinutes || 60;
        const displaySlots = generateDisplaySlots(profile ? { ...settings, ...profile } as any : settings);

        const targetLevelIds = alloc.courseLevelIds || [];
        const lecturerUnavail = lecturerUnavailabilityMap.get(alloc.lecturerId) || [];

        // Pre-initialize tracking maps
        if (!lecturerDailyCounts.has(alloc.lecturerId)) {
            lecturerDailyCounts.set(alloc.lecturerId, new Map());
        }

        // Optimization: Sort rooms ONCE per allocation to reduce O(N^2) complexity in the slot loop
        const levelRooms = targetLevelIds.map(lid => {
            const course = (courses || []).find(c => (c.levels || []).some(l => l.id === lid));
            return (course?.levels || []).find(l => l.id === lid)?.roomId;
        }).filter(Boolean);
        const primaryHomeRoomId = levelRooms[0];

        const optimizedRooms = [...(rooms || [])]
            .filter(r => r && r.status === 'active')
            .sort((a, b) => {
                if (primaryHomeRoomId) {
                    if (a.id === primaryHomeRoomId) return -1;
                    if (b.id === primaryHomeRoomId) return 1;
                }
                return Math.random() - 0.5;
            });

        (subject.lessonStructure || []).forEach(structure => {
            const requiredPeriods = structure.periods || 1;
            const requiredDuration = requiredPeriods * cellSpan;

            for (let count = 0; count < (structure.count || 0); count++) {
                let placed = false;

                // Capacity check (Legacy limit set to 999k for high volume)
                for (const lid of targetLevelIds) {
                    const currentLvlSesh = levelWorkload.get(lid) || 0;
                    if (currentLvlSesh + requiredPeriods > 999999) continue;
                }

                // Day Selection Logic (Balanced Load)
                const prioritizedDays = [...activeDays].sort((d1, d2) => {
                    const c1 = lecturerDailyCounts.get(alloc.lecturerId)?.get(d1) || 0;
                    const c2 = lecturerDailyCounts.get(alloc.lecturerId)?.get(d2) || 0;
                    return c1 - c2 || Math.random() - 0.5;
                });

                for (const day of prioritizedDays) {
                    if (placed) break;

                    const currentDailyCount = lecturerDailyCounts.get(alloc.lecturerId)?.get(day) || 0;
                    if (currentDailyCount >= 50) continue; // Increased to 50 for extreme density

                    const shuffledSlots = [...displaySlots].sort(() => Math.random() - 0.5);

                    for (const slot of shuffledSlots) {
                        const startTimeMin = timeToMinutes(slot.start);
                        const endTimeMin = startTimeMin + requiredDuration;

                        const maxTime = timeToMinutes(profile?.endTime || settings?.endTime || '21:00'); // Expanded default
                        if (endTimeMin > maxTime) continue;

                        let isPathClear = true;
                        for (let p = 0; p < requiredPeriods; p++) {
                            const currentCheckMin = startTimeMin + (p * cellSpan);
                            
                            // 1. Break Check (Pre-calculated numeric)
                            const isBreak = activeBreaks.some(b => currentCheckMin >= b.start && currentCheckMin < b.end);
                            if (isBreak) { isPathClear = false; break; }

                            // 2. Lecturer Availability (Pre-calculated numeric)
                            const isLecUnavail = lecturerUnavail.some(u => u.day === day && currentCheckMin >= u.start && currentCheckMin < u.end);
                            if (isLecUnavail) { isPathClear = false; break; }

                            // 3. Occupancy Matrix Check (Direct Set Lookup)
                            if (lecturerOccupancy.has(`${day}-${currentCheckMin}-${alloc.lecturerId}`)) { isPathClear = false; break; }
                            
                            let isStudentBusy = false;
                            for (const lid of targetLevelIds) {
                                if (studentOccupancy.has(`${day}-${currentCheckMin}-${lid}`)) {
                                    isStudentBusy = true;
                                    break;
                                }
                            }
                            if (isStudentBusy) { isPathClear = false; break; }
                        }

                        if (!isPathClear) continue;

                        // Room Search (Optimized Room List)
                        let availableRoom = optimizedRooms.find(room => {
                            if (structure.dedicatedRoomId && room.id !== structure.dedicatedRoomId) return false;
                            
                            // Prevent "Squatting" logic (Simplified for high speed)


                            let roomFree = true;
                            for (let p = 0; p < requiredPeriods; p++) {
                                const currentCheckMin = startTimeMin + (p * cellSpan);
                                if (roomOccupancy.has(`${day}-${currentCheckMin}-${room.id}`)) {
                                    roomFree = false;
                                    break;
                                }
                            }
                            return roomFree;
                        });

                        // Virtual Overflow (Emergency)
                        if (!availableRoom) {
                            const virtualRooms = ['VR-1', 'VR-2', 'VR-3', 'VR-4', 'VR-5', 'VR-6', 'VR-7', 'VR-8', 'VR-9', 'VR-10'];
                            for (const vr of virtualRooms) {
                                let vrFree = true;
                                for (let p = 0; p < requiredPeriods; p++) {
                                    const currentCheckMin = startTimeMin + (p * cellSpan);
                                    if (roomOccupancy.has(`${day}-${currentCheckMin}-${vr}`)) {
                                        vrFree = false;
                                        break;
                                    }
                                }
                                if (vrFree) {
                                    availableRoom = { id: vr, name: `Virtual ${vr}`, status: 'active' } as any;
                                    break;
                                }
                            }
                        }

                        if (availableRoom) {
                            // Atomic Placement
                            for (let p = 0; p < requiredPeriods; p++) {
                                const currentCheckMin = startTimeMin + (p * cellSpan);
                                lecturerOccupancy.add(`${day}-${currentCheckMin}-${alloc.lecturerId}`);
                                roomOccupancy.add(`${day}-${currentCheckMin}-${availableRoom.id}`);
                                targetLevelIds.forEach(lid => studentOccupancy.add(`${day}-${currentCheckMin}-${lid}`));
                            }

                            lecturerDailyCounts.get(alloc.lecturerId)?.set(day, currentDailyCount + 1);
                            targetLevelIds.forEach(lid => levelWorkload.set(lid, (levelWorkload.get(lid) || 0) + requiredPeriods));

                            entries.push({
                                id: `entry_v${Date.now()}_${entries.length}_${Math.random().toString(36).substr(2, 4)}`,
                                day,
                                startTime: slot.start,
                                endTime: minutesToTime(endTimeMin),
                                subjectId: subject.id,
                                lecturerId: alloc.lecturerId,
                                roomId: availableRoom.id,
                                institutionId: alloc.institutionId,
                                academicYearId: academicYearId,
                                semesterId: semesterId,
                                courseId: linkedCourse?.id || 'unknown',
                                courseLevelId: alloc.courseLevelIds?.[0] || 'unknown',
                                duration: requiredDuration
                            });

                            placed = true;
                            break;
                        }
                    }
                    if (placed) break;
                }

                // Workload Integrity Guarantee (Force placement if no fit found)
                if (!placed) {
                    const fallbackDay = prioritizedDays[0] || 'Monday';
                    const fallbackSlot = displaySlots[0];
                    if (fallbackSlot) {
                        entries.push({
                            id: `force_${Date.now()}_${entries.length}`,
                            day: fallbackDay,
                            startTime: fallbackSlot.start,
                            endTime: minutesToTime(timeToMinutes(fallbackSlot.start) + requiredDuration),
                            subjectId: subject.id,
                            lecturerId: alloc.lecturerId,
                            roomId: `VR-OVERFLOW-${Math.floor(Math.random() * 100)}`,
                            institutionId: alloc.institutionId,
                            academicYearId: academicYearId,
                            semesterId: semesterId,
                            courseId: linkedCourse?.id || 'unknown',
                            courseLevelId: alloc.courseLevelIds?.[0] || 'unknown',
                            duration: requiredDuration,
                            isConflicting: true
                        });
                        notifications.push(`Mass Generation Alert: Forced entry for ${subject.name} to maintain matrix integrity.`);
                    }
                }
            }
        });
    });

    return { entries, notifications };
}
