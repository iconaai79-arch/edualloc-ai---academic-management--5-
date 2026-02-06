import type { 
    User, Department, Subject, Course, Building, Room, 
    AcademicYear, Semester, InventoryItem, Supplier, Visitor, 
    AllocationRequest, TimetableEntry, SecurityAlert, UserTask, Requisition,
    ScheduleProfile
} from '../types';
import { DEFAULT_SECONDARY_PROFILES, INITIAL_TIMETABLE_SETTINGS, INITIAL_EXAM_TIMETABLE_SETTINGS } from '../constants';

export const generateInstitutionalDemoData = (instId: string, adminId: string) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // 1. Departments
    const depts: Department[] = [
        { id: `dept_stem_${instId}`, name: 'Science & Mathematics', institutionId: instId },
        { id: `dept_hums_${instId}`, name: 'Humanities & Languages', institutionId: instId },
        { id: `dept_tech_${instId}`, name: 'Technical & Applied', institutionId: instId }
    ];

    // 2. Buildings & Rooms
    const bldg: Building = { id: `bldg_main_${instId}`, name: 'Main Campus', institutionId: instId };
    const rooms: Room[] = [
        { id: `room_1_${instId}`, name: 'Class 1A', capacity: 45, buildingId: bldg.id, institutionId: instId, status: 'active' },
        { id: `room_lab_${instId}`, name: 'Physics Lab', capacity: 30, buildingId: bldg.id, institutionId: instId, status: 'active', equipment: ['Burners', 'Kits'] },
    ];

    // 3. Academic Levels
    const levels = [
        { id: `al_jr_${instId}`, name: 'Junior Secondary', institutionId: instId },
        { id: `al_sr_${instId}`, name: 'Senior Secondary', institutionId: instId }
    ];

    // 4. Academic Calendar
    const ay: AcademicYear = { 
        id: `ay_2025_${instId}`, 
        name: '2025 Academic Cycle', 
        startDate: '2025-01-01', 
        endDate: '2025-12-31', 
        institutionId: instId, 
        status: 'active' 
    };
    const sem: Semester = {
        id: `sem_1_${instId}`,
        name: 'Term 1',
        academicYearId: ay.id,
        institutionId: instId,
        startDate: '2025-01-06',
        endDate: '2025-04-10',
        status: 'active',
        requestDeadline: '2025-01-20'
    };

    // 5. Faculty & Staff
    const staff: User[] = [
        { id: `u_dos_${instId}`, name: 'Director of Studies', email: `dos@demo-${instId}.edu`, phoneNumber: '0711000001', role: 'dos', institutionId: instId, departmentId: depts[0].id, expertise: ['Curriculum'], password: 'password123' },
        { id: `u_tea1_${instId}`, name: 'Mr. James Maxwell', email: `james@demo-${instId}.edu`, phoneNumber: '0711000002', role: 'teacher', institutionId: instId, departmentId: depts[0].id, expertise: ['Physics'], password: 'password123' },
    ];

    // 6. Subjects & Courses
    const subjs: Subject[] = [
        { id: `sub1_${instId}`, code: 'PHY-01', name: 'General Physics', departmentId: depts[0].id, institutionId: instId, lessonStructure: [{ count: 5, periods: 1 }] },
        { id: `sub2_${instId}`, code: 'MAT-01', name: 'Pure Mathematics', departmentId: depts[0].id, institutionId: instId, lessonStructure: [{ count: 6, periods: 1 }] }
    ];

    const courses: Course[] = [
        { 
            id: `c_844_${instId}`, name: 'Grade 10 (8-4-4)', code: 'G10-844', departmentId: depts[0].id, institutionId: instId, academicLevelId: levels[1].id, curriculumType: '8-4-4', scheduleProfileId: 'prof_844',
            levels: [{ id: `lvl_10_${instId}`, name: 'Form 3 North', subjectIds: [subjs[0].id, subjs[1].id] }]
        },
        { 
            id: `c_cbe_${instId}`, name: 'Grade 10 (CBE)', code: 'G10-CBE', departmentId: depts[0].id, institutionId: instId, academicLevelId: levels[1].id, curriculumType: 'CBC', scheduleProfileId: 'prof_cbe',
            levels: [{ id: `lvl_10cbe_${instId}`, name: 'Grade 10 Alpha', subjectIds: [subjs[0].id, subjs[1].id] }]
        }
    ];

    // 7. Allocations & Timetable
    const allocations: AllocationRequest[] = [
        { id: `alloc1_${instId}`, lecturerId: staff[1].id, subjectId: subjs[0].id, status: 'approved', priority: 'High', academicYearId: ay.id, semesterId: sem.id, timestamp: todayStr, institutionId: instId, courseLevelIds: [courses[0].levels[0].id] }
    ];

    return {
        departments: depts,
        buildings: [bldg],
        rooms,
        academicLevels: levels,
        academicYears: [ay],
        semesters: [sem],
        users: [...staff],
        subjects: subjs,
        courses,
        allocations,
        timetable: [],
        inventory: [],
        visitors: [],
        securityAlerts: [],
        institutionUpdates: {
            scheduleProfiles: DEFAULT_SECONDARY_PROFILES,
            timetableSettings: INITIAL_TIMETABLE_SETTINGS,
            examTimetableSettings: INITIAL_EXAM_TIMETABLE_SETTINGS
        }
    };
};
