import type { 
    Subject, User, Room, Course, ExamTimetableEntry, ExamTimetableSettings, Semester 
} from '../types';

/**
 * Deterministically generates an exam timetable by filling available slots sequentially.
 * This provides a "Standard Logic" alternative to the AI generator.
 */
export const generateStandardExamTimetable = (
    subjectsWithExams: Subject[],
    courses: Course[],
    lecturers: User[],
    rooms: Room[],
    activeSemester: Semester,
    settings: ExamTimetableSettings
): ExamTimetableEntry[] => {
    const entries: ExamTimetableEntry[] = [];
    const availableLecturers = (lecturers || []).filter(u => u && u.role !== 'student' && u.role !== 'super_admin');
    const availableRooms = (rooms || []).filter(r => r && r.status === 'active');

    // 1. Flatten all available exam windows from the academic calendar
    const allWindows: { date: string; name: string; startTime: string; endTime: string }[] = [];
    
    (activeSemester?.sessions || []).forEach(session => {
        (session?.examPeriods || []).forEach(period => {
            const start = new Date(period.startDate);
            const end = new Date(period.endDate);
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                (settings?.sessionsPerDay || []).forEach(s => {
                    allWindows.push({
                        date: dateStr,
                        name: s.name,
                        startTime: s.startTime,
                        endTime: s.endTime
                    });
                });
            }
        });
    });

    if (allWindows.length === 0 || (subjectsWithExams || []).length === 0) return [];

    // 2. Identify every unique subject-class pair that needs an exam
    const examTasks: { subjectId: string; courseId: string; courseLevelId: string }[] = [];
    (subjectsWithExams || []).forEach(sub => {
        (courses || []).forEach(course => {
            (course?.levels || []).forEach(level => {
                if ((level?.subjectIds || []).includes(sub.id)) {
                    examTasks.push({
                        subjectId: sub.id,
                        courseId: course.id,
                        courseLevelId: level.id
                    });
                }
            });
        });
    });

    // 3. Sequential load balancing
    let windowIndex = 0;
    let roomIndexInWindow = 0;
    let lecturerIndex = 0;

    examTasks.forEach((task, idx) => {
        if (roomIndexInWindow >= availableRooms.length) {
            windowIndex++;
            roomIndexInWindow = 0;
        }

        const currentWindow = allWindows[windowIndex % allWindows.length];
        const currentRoom = availableRooms[roomIndexInWindow % availableRooms.length];
        const currentInvigilator = availableLecturers[lecturerIndex % availableLecturers.length];

        entries.push({
            id: `exam_std_${Date.now()}_${idx}`,
            date: currentWindow.date,
            startTime: currentWindow.startTime,
            endTime: currentWindow.endTime,
            subjectId: task.subjectId,
            courseId: task.courseId,
            courseLevelId: task.courseLevelId,
            roomId: currentRoom.id,
            invigilatorId: currentInvigilator.id,
            institutionId: activeSemester.institutionId,
            academicYearId: activeSemester.academicYearId,
            semesterId: activeSemester.id
        });

        roomIndexInWindow++;
        lecturerIndex++;
    });

    return entries;
};