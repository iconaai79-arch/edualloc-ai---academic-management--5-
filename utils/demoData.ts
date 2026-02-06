import type { 
    User, Department, Subject, Course, Building, Room, 
    AcademicYear, Semester, InventoryItem, Supplier, Visitor, 
    AllocationRequest, TimetableEntry, SecurityAlert, UserTask
} from '../types';
// FIXED: Added missing constant imports for the new institutionUpdates property
import { DEFAULT_SECONDARY_PROFILES, INITIAL_TIMETABLE_SETTINGS, INITIAL_EXAM_TIMETABLE_SETTINGS } from '../constants';

export const generateInstitutionalDemoData = (instId: string, adminId: string) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const depts: Department[] = [
        { id: `dept_cs_${instId}`, name: 'Computer Science & IT', institutionId: instId },
        { id: `dept_biz_${instId}`, name: 'Business School', institutionId: instId }
    ];

    const bldg: Building = { id: `bldg_main_${instId}`, name: 'Main Academic Block', institutionId: instId };
    const rooms: Room[] = [
        { id: `room_101_${instId}`, name: 'Lecture Room 101', capacity: 50, buildingId: bldg.id, institutionId: instId, status: 'active', equipment: ['Projector', 'AC'] },
        { id: `room_lab_${instId}`, name: 'Computing Lab A', capacity: 30, buildingId: bldg.id, institutionId: instId, status: 'active', equipment: ['Workstations', 'Servers'], isShared: true, concurrentSessions: 1 }
    ];

    const levels = [
        { id: `al_ug_${instId}`, name: 'Undergraduate', institutionId: instId }
    ];

    const ay: AcademicYear = { 
        id: `ay_2024_${instId}`, 
        name: '2024/2025 Academic Year', 
        startDate: '2024-01-01', 
        endDate: '2024-12-31', 
        institutionId: instId, 
        status: 'active' 
    };
    const sem: Semester = {
        id: `sem_1_${instId}`,
        name: 'Semester 1',
        academicYearId: ay.id,
        institutionId: instId,
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        status: 'active'
    };

    const staff: User[] = [
        { id: `u_lec1_${instId}`, name: 'Prof. Mark Otieno', email: `mark.lec@demo-${instId}.edu`, phoneNumber: '0711000002', role: 'lecturer', institutionId: instId, departmentId: depts[0].id, expertise: ['Database Systems'], password: 'password123' }
    ];

    const subjs: Subject[] = [
        { id: `sub1_${instId}`, code: 'CS101', name: 'Intro to Programming', departmentId: depts[0].id, institutionId: instId, lessonStructure: [{ count: 2, periods: 2 }] },
        { id: `sub2_${instId}`, code: 'DB202', name: 'Database Design', departmentId: depts[0].id, institutionId: instId, lessonStructure: [{ count: 1, periods: 3 }] }
    ];

    const courses: Course[] = [
        { 
            id: `c_cs_${instId}`, name: 'BSc. Computer Science', code: 'BCS', departmentId: depts[0].id, institutionId: instId, academicLevelId: levels[0].id,
            levels: [{ id: `lvl_1_${instId}`, name: 'Year 1', subjectIds: [subjs[0].id, subjs[1].id] }]
        }
    ];

    const allocations: AllocationRequest[] = [
        { id: `alloc1_${instId}`, lecturerId: staff[0].id, subjectId: subjs[0].id, status: 'approved', priority: 'High', academicYearId: ay.id, semesterId: sem.id, timestamp: todayStr, institutionId: instId, courseLevelIds: [courses[0].levels[0].id] }
    ];

    return {
        departments: depts,
        buildings: [bldg],
        rooms,
        academicLevels: levels,
        academicYears: [ay],
        semesters: [sem],
        users: staff,
        subjects: subjs,
        courses,
        allocations,
        // FIXED: Added missing institutionUpdates property to return object
        institutionUpdates: {
            scheduleProfiles: DEFAULT_SECONDARY_PROFILES,
            timetableSettings: INITIAL_TIMETABLE_SETTINGS,
            examTimetableSettings: INITIAL_EXAM_TIMETABLE_SETTINGS
        }
    };
};
