
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
    const lecturerOccupancy = new Set<string>();
    const roomOccupancy = new Set<string>();
    const studentOccupancy = new Set<string>();

    // Capacity Tracking
    // courseLevelId -> totalDurationPlaced
    const levelWorkload = new Map<string, number>();

    // lecturerId -> day -> count
    const lecturerDailyCounts = new Map<string, Map<string, number>>();
    // lecturerId -> day -> lastEndTimeMinutes
    const lecturerSlotEnds = new Map<string, Map<string, Set<number>>>();

    const sortedAllocations = [...(allocations || [])].sort(() => Math.random() - 0.5); // Global shuffle to prevent priority-clogging in high-density schedules

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

        // Calculate available capacity for this level
        const days = activeDays.length || 0;
        const periodCount = displaySlots.length || 0;
        const totalSlots = days * periodCount;
        const capacityInSesh = 99999; // Effectively removed pruning for Legacy generator to allow maximum institutional density

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

            for (let count = 0; count < (structure.count || 0); count++) {
                let placed = false;

                // Capacity check for each level associated with this allocation
                const targetLevelIds = alloc.courseLevelIds || [];
                let skipDueToCapacity = false;
                
                for (const lid of targetLevelIds) {
                    const currentLvlSesh = levelWorkload.get(lid) || 0;
                    if (currentLvlSesh + requiredPeriods > capacityInSesh && capacityInSesh > 0) {
                        const levelName = courses.flatMap(c => c.levels || []).find(l => l.id === lid)?.name || lid;
                        const msg = `Standard Algorithm: Capacity exceeded for ${levelName}. Pruned excess ${subject.name} lessons.`;
                        if (!notifications.includes(msg)) notifications.push(msg);
                        skipDueToCapacity = true;
                        break;
                    }
                }

                if (skipDueToCapacity) continue;

                // Day Selection Logic
                const prioritizedDays = [...activeDays].sort((d1, d2) => {
                    const c1 = lecturerDailyCounts.get(alloc.lecturerId)?.get(d1) || 0;
                    const c2 = lecturerDailyCounts.get(alloc.lecturerId)?.get(d2) || 0;
                    if (c1 === c2) return Math.random() - 0.5;
                    return c1 - c2;
                });

                for (const day of prioritizedDays) {
                    if (placed) break;

                    const currentDailyCount = lecturerDailyCounts.get(alloc.lecturerId)?.get(day) || 0;
                    if (currentDailyCount >= 20) continue; // Further increased to 20 for absolute faculty utilization

                    const shuffledSlots = [...displaySlots].sort(() => Math.random() - 0.5);

                    for (const slot of shuffledSlots) {
                        const startTimeMin = timeToMinutes(slot.start);
                        const endTimeMin = startTimeMin + requiredDuration;
                        const endTimeStr = minutesToTime(endTimeMin);

                        const maxTime = timeToMinutes(profile?.endTime || settings?.endTime || '17:00');
                        if (endTimeMin > maxTime) continue;

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

                            // STUDENT (STREAM) OCCUPANCY CHECK
                            let isStudentBusy = false;
                            for (const lid of targetLevelIds) {
                                if (studentOccupancy.has(`${day}-${checkTime}-${lid}`)) {
                                    isStudentBusy = true;
                                    break;
                                }
                            }

                            if (isBreak || isUnvailable || lecturerOccupancy.has(lecKey) || isStudentBusy) {
                                isPathClear = false;
                                break;
                            }
                        }

                        if (!isPathClear) continue;

                        // HOME-ROOM BINDING: Prioritize the room assigned to the level
                        const levelRooms = targetLevelIds.map(lid => {
                            const course = (courses || []).find(c => (c.levels || []).some(l => l.id === lid));
                            return (course?.levels || []).find(l => l.id === lid)?.roomId;
                        }).filter(Boolean);

                        const primaryHomeRoomId = levelRooms[0];

                        // RANDOMIZED ROOM SELECTION: Prevent facility bottlenecks
                        const shuffledRooms = [...(rooms || [])].sort((a, b) => {
                            // If a room is the home-room for this level, prioritize it to the top
                            if (primaryHomeRoomId) {
                                if (a.id === primaryHomeRoomId) return -1;
                                if (b.id === primaryHomeRoomId) return 1;
                            }
                            return Math.random() - 0.5;
                        });

                        let availableRoom = shuffledRooms.find(room => {
                            if (!room || room.status !== 'active') return false;
                            
                            // 1. Strict Subject-Level Dedicated Room
                            if (structure.dedicatedRoomId && room.id !== structure.dedicatedRoomId) return false;

                            // 2. Prevent "Squatting": If this room is someone ELSE'S homeroom, and they aren't this level, 
                            // avoid using it unless no other rooms are found.
                            const isHomeRoomForOther = (courses || []).some(c => 
                                (c.levels || []).some(l => l.roomId === room.id && !targetLevelIds.includes(l.id))
                            );
                            
                            // If we have a primary home room for THIS level, we ONLY use it.
                            if (primaryHomeRoomId && room.id !== primaryHomeRoomId) return false;

                            // If this isn't our home room, but it IS a home room for someone else, skip it to keep it clear.
                            if (!primaryHomeRoomId && isHomeRoomForOther) return false;

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

                        // EMERGENCY FALLBACK: If no room is found, use a Virtual Overflow Room
                        if (!availableRoom) {
                            const virtualRooms = ['VR-1', 'VR-2', 'VR-3', 'VR-4', 'VR-5'];
                            for (const vr of virtualRooms) {
                                let vrFree = true;
                                for (let p = 0; p < requiredPeriods; p++) {
                                    const checkTime = minutesToTime(startTimeMin + (p * cellSpan));
                                    if (roomOccupancy.has(`${day}-${checkTime}-${vr}`)) {
                                        vrFree = false;
                                        break;
                                    }
                                }
                                if (vrFree) {
                                    availableRoom = { id: vr, name: `Virtual Room ${vr.split('-')[1]}`, status: 'active', institutionId: alloc.institutionId } as any;
                                    const msg = `Institutional Saturation: ${subject.name} assigned to Virtual Room to prevent generation cutoff.`;
                                    if (!notifications.includes(msg)) notifications.push(msg);
                                    break;
                                }
                            }
                        }

                        if (availableRoom) {
                            // Place entry
                            for (let p = 0; p < requiredPeriods; p++) {
                                const checkTime = minutesToTime(startTimeMin + (p * cellSpan));
                                lecturerOccupancy.add(`${day}-${checkTime}-${alloc.lecturerId}`);
                                roomOccupancy.add(`${day}-${checkTime}-${availableRoom.id}`);
                                // MARK STUDENTS AS OCCUPIED
                                targetLevelIds.forEach(lid => {
                                    studentOccupancy.add(`${day}-${checkTime}-${lid}`);
                                });
                            }

                            // Update Trackers
                            const currentC = lecturerDailyCounts.get(alloc.lecturerId)?.get(day) || 0;
                            lecturerDailyCounts.get(alloc.lecturerId)?.set(day, currentC + 1);

                            // Update Level Workload
                            targetLevelIds.forEach(lid => {
                                const cur = levelWorkload.get(lid) || 0;
                                levelWorkload.set(lid, cur + requiredPeriods);
                            });

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

                    // ZERO-SKIP POLICY: If still not placed after checking all days/slots
                    if (!placed) {
                        const safetyDay = prioritizedDays[0] || 'Monday';
                        const safetySlot = displaySlots.find(s => !activeBreaks.some(b => b.status === 'active' && timeToMinutes(s.start) >= timeToMinutes(b.startTime) && timeToMinutes(s.start) < timeToMinutes(b.endTime))) || displaySlots[0];
                        
                        if (safetySlot) {
                            entries.push({
                                id: `entry_f_${Date.now()}_${entries.length}_${Math.random().toString(36).substr(2, 4)}`,
                                day: safetyDay,
                                startTime: safetySlot.start,
                                endTime: minutesToTime(timeToMinutes(safetySlot.start) + requiredDuration),
                                subjectId: subject.id,
                                lecturerId: alloc.lecturerId,
                                roomId: `VR-OVERFLOW-${Math.floor(Math.random() * 50)}`,
                                institutionId: alloc.institutionId,
                                academicYearId: academicYearId,
                                semesterId: semesterId,
                                courseId: linkedCourse?.id || 'unknown',
                                courseLevelId: alloc.courseLevelIds?.[0] || 'unknown',
                                duration: requiredDuration,
                                isConflicting: true
                            });
                            notifications.push(`Workload Integrity Force: ${subject.name} (Lecturer: ${alloc.lecturerId}) forced into timetable to guarantee 100% completion.`);
                            placed = true;
                        }
                    }
                }
            });
        });

    return { entries, notifications };
}
