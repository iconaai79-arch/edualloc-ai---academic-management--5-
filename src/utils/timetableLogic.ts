
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

        const shuffledDays = [...activeDays].sort(() => Math.random() - 0.5);
        const shuffledSlots = [...displaySlots].sort(() => Math.random() - 0.5);

        (subject.lessonStructure || []).forEach(structure => {
            const requiredPeriods = structure.periods || 1;
            const requiredDuration = requiredPeriods * cellSpan;

            for (let count = 0; count < (structure.count || 0); count++) {
                let placed = false;

                for (const day of shuffledDays) {
                    if (placed) break;

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
                            for (let p = 0; p < requiredPeriods; p++) {
                                const checkTime = minutesToTime(startTimeMin + (p * cellSpan));
                                lecturerOccupancy.add(`${day}-${checkTime}-${alloc.lecturerId}`);
                                roomOccupancy.add(`${day}-${checkTime}-${availableRoom.id}`);
                            }

                            entries.push({
                                id: `entry_std_${Date.now()}_${entries.length}`,
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
                                // Snake Case mappings
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
