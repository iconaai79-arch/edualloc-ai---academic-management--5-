import type { 
    Subject, User, Room, Course, ExamTimetableEntry, ExamTimetableSettings, Semester, AllocationRequest 
} from '../types';

/**
 * Deterministically generates an exam timetable by filling available slots sequentially.
 * Automatically uses subject allocation data to bind allocated lecturers to subjects.
 */
export const generateStandardExamTimetable = (
    subjectsWithExams: Subject[],
    courses: Course[],
    lecturers: User[],
    rooms: Room[],
    activeSemester: Semester,
    settings: ExamTimetableSettings,
    allocations?: AllocationRequest[]
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

    // 3. Sequential load balancing with automatic allocation binding
    let windowIndex = 0;
    let roomIndexInWindow = 0;
    let fallbackLecturerIndex = 0;

    examTasks.forEach((task, idx) => {
        if (roomIndexInWindow >= availableRooms.length) {
            windowIndex++;
            roomIndexInWindow = 0;
        }

        const currentWindow = allWindows[windowIndex % allWindows.length];
        const currentRoom = availableRooms[roomIndexInWindow % availableRooms.length];

        // AUTOMATIC ALLOCATION BINDING: Check if an approved allocation exists for this subject
        const approvedAlloc = (allocations || []).find(a => 
            a && a.subjectId === task.subjectId && 
            (a.status === 'approved' || a.status === 'hod_approved')
        );

        const assignedInvigilator = approvedAlloc
            ? availableLecturers.find(l => l.id === approvedAlloc.lecturerId) || availableLecturers[fallbackLecturerIndex % availableLecturers.length]
            : availableLecturers[fallbackLecturerIndex % availableLecturers.length];

        fallbackLecturerIndex++;
        roomIndexInWindow++;

        // CLASS / GRADE NAME ACTS AS ROOM FOR PRIMARY & SECONDARY SCHOOLS:
        // Check if there is a physical room matching the class/grade, otherwise assign courseLevelId/courseId
        const matchingClassRoom = availableRooms.find(r => 
            r && r.name && (
                r.name.toLowerCase() === (task.courseId || '').toLowerCase() ||
                r.name.toLowerCase() === (task.courseLevelId || '').toLowerCase()
            )
        );

        const assignedRoomId = matchingClassRoom 
            ? matchingClassRoom.id 
            : (currentRoom ? currentRoom.id : (task.courseLevelId || task.courseId));

        entries.push({
            id: `exam_std_${Date.now()}_${idx}`,
            date: currentWindow.date,
            startTime: currentWindow.startTime,
            endTime: currentWindow.endTime,
            subjectId: task.subjectId,
            courseId: task.courseId,
            courseLevelId: task.courseLevelId,
            roomId: assignedRoomId,
            invigilatorId: assignedInvigilator ? assignedInvigilator.id : '',
            institutionId: activeSemester.institutionId,
            academicYearId: activeSemester.academicYearId,
            semesterId: activeSemester.id
        });

        roomIndexInWindow++;
    });

    return entries;
};