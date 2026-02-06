
import type { TimetableEntry, User, Semester, Subject, Room, Building } from '../types';

// Helper to format date to YYYYMMDDTHHMMSSZ format
const toICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

// Helper to get the first occurrence of a weekday in a semester
const getFirstDayOccurrence = (semesterStartDate: Date, dayOfWeek: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'): Date => {
    const dayMapping = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const targetDayIndex = dayMapping.indexOf(dayOfWeek);
    const startDate = new Date(semesterStartDate);
    const startDayIndex = startDate.getDay();

    let dateOffset = targetDayIndex - startDayIndex;
    if (dateOffset < 0) {
        dateOffset += 7;
    }

    const firstOccurrence = new Date(startDate);
    firstOccurrence.setDate(startDate.getDate() + dateOffset);
    return firstOccurrence;
};

export const generateIcsContent = (
    timetableEntries: TimetableEntry[],
    user: User,
    activeSemester: Semester,
    getSubjectById: (id: string) => Subject | undefined,
    getRoomById: (id: string) => Room | undefined,
    buildings: Building[]
): string => {
    const buildingMap = new Map(buildings.map(b => [b.id, b.name]));

    let icsString = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//EduAi//Timetable Allocator//EN',
        `X-WR-CALNAME:My Timetable - ${user.name}`,
        'X-WR-TIMEZONE:UTC',
    ].join('\r\n');

    const semesterStartDate = new Date(activeSemester.startDate + 'T00:00:00Z');
    const semesterEndDate = new Date(activeSemester.endDate + 'T23:59:59Z');
    const untilDate = toICSDate(semesterEndDate).split('T')[0];
    const dayToIcsDay = {
        'Sunday': 'SU', 'Monday': 'MO', 'Tuesday': 'TU', 'Wednesday': 'WE', 'Thursday': 'TH', 'Friday': 'FR', 'Saturday': 'SA'
    };


    timetableEntries.forEach(entry => {
        const subject = getSubjectById(entry.subjectId);
        const room = getRoomById(entry.roomId);
        const buildingName = room ? buildingMap.get(room.buildingId) : '';

        if (!subject || !room) return;

        const firstOccurrenceDate = getFirstDayOccurrence(semesterStartDate, entry.day as any);
        
        const [startHour, startMinute] = entry.startTime.split(':').map(Number);
        const [endHour, endMinute] = entry.endTime.split(':').map(Number);

        const dtStart = new Date(firstOccurrenceDate);
        dtStart.setUTCHours(startHour, startMinute, 0, 0);

        const dtEnd = new Date(firstOccurrenceDate);
        dtEnd.setUTCHours(endHour, endMinute, 0, 0);

        const uid = `${entry.id}@edusolutions.com`;
        const location = `${room.name}${buildingName ? `, ${buildingName}` : ''}`;
        const description = `Taught by: ${user.name}\\nSubject: ${subject.name}\\nRoom: ${room.name}`;
        const summary = `${subject.code} - ${subject.name}`;
        
        const rrule = `FREQ=WEEKLY;BYDAY=${dayToIcsDay[entry.day as keyof typeof dayToIcsDay]};UNTIL=${untilDate}`;

        const event = [
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${toICSDate(new Date())}`,
            `DTSTART:${toICSDate(dtStart)}`,
            `DTEND:${toICSDate(dtEnd)}`,
            `RRULE:${rrule}`,
            `SUMMARY:${summary}`,
            `LOCATION:${location}`,
            `DESCRIPTION:${description}`,
            'END:VEVENT',
        ].join('\r\n');

        icsString += '\r\n' + event;
    });

    icsString += '\r\n' + 'END:VCALENDAR';

    return icsString;
};
