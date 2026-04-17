import type { 
    User, Department, Subject, Course, Building, Room, 
    AcademicYear, Semester, InventoryItem, Supplier, Visitor, 
    AllocationRequest, TimetableEntry, SecurityAlert, UserTask, Requisition,
    ScheduleProfile, HISStaff, HISPatient, HISWard, HISBed, HISAppointment,
    HISStaffAttendance, HISFinancialRecord, HISVitalStatistics, HISClinicalEvent
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
        { id: `u_dos_${instId}`, name: 'Director of Studies', email: `dos@demo-${instId}.edu`, phoneNumber: '0711000001', role: 'dos', roles: ['dos'], institutionId: instId, departmentId: depts[0].id, expertise: ['Curriculum'], password: 'password123' },
        { id: `u_tea1_${instId}`, name: 'Mr. James Maxwell', email: `james@demo-${instId}.edu`, phoneNumber: '0711000002', role: 'teacher', roles: ['teacher'], institutionId: instId, departmentId: depts[0].id, expertise: ['Physics'], password: 'password123' },
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

    // 8. HIS - Health Information System Data
    const hisStaff: HISStaff[] = [
        { id: `his_s1_${instId}`, name: 'Dr. John Smith', role: 'Doctor', specialty: 'General Surgeon', status: 'Available', contact: '+254711222333', institutionId: instId, createdAt: todayStr },
        { id: `his_s2_${instId}`, name: 'Jane Wilson', role: 'Nurse', specialty: 'ICU Specialist', status: 'Busy', contact: '+254722333444', institutionId: instId, createdAt: todayStr },
        { id: `his_s3_${instId}`, name: 'Dr. Sarah Omondi', role: 'Doctor', specialty: 'Dentist', status: 'Available', contact: '+254733444555', institutionId: instId, createdAt: todayStr }
    ];

    const hisPatients: HISPatient[] = [
        { id: `his_p1_${instId}`, institutionId: instId, fullName: 'David Kamau', dob: '1985-05-12', gender: 'Male', bloodGroup: 'O+', insuranceProvider: 'SHA', contact: '+254700000111', createdAt: todayStr, updatedAt: todayStr },
        { id: `his_p2_${instId}`, institutionId: instId, fullName: 'Mary Atieno', dob: '1992-08-24', gender: 'Female', bloodGroup: 'A-', insuranceProvider: 'AAR', contact: '+254700000222', createdAt: todayStr, updatedAt: todayStr }
    ];

    const hisWards: HISWard[] = [
        { id: `his_w1_${instId}`, institutionId: instId, name: 'General Ward A', wardType: 'General', capacity: 20, createdAt: todayStr },
        { id: `his_w2_${instId}`, institutionId: instId, name: 'ICU', wardType: 'Specialized', capacity: 5, createdAt: todayStr }
    ];

    const hisBeds: HISBed[] = [
        { id: `his_b1_${instId}`, wardId: hisWards[0].id, bedNumber: 'B01', status: 'Vacant', isSmartBed: true, institutionId: instId, createdAt: todayStr },
        { id: `his_b2_${instId}`, wardId: hisWards[1].id, bedNumber: 'ICU-01', status: 'Occupied', isSmartBed: true, institutionId: instId, createdAt: todayStr }
    ];

    const hisAppointments: HISAppointment[] = [
        { id: `his_a1_${instId}`, patientId: hisPatients[0].id, doctorId: hisStaff[0].id, date: todayStr, time: '09:00', status: 'Confirmed', type: 'Consultation', institutionId: instId, createdAt: todayStr },
        { id: `his_a2_${instId}`, patientId: hisPatients[1].id, doctorId: hisStaff[2].id, date: todayStr, time: '10:30', status: 'Pending', type: 'Procedure', institutionId: instId, createdAt: todayStr }
    ];

    const hisAttendance: HISStaffAttendance[] = [
        { id: `his_att1_${instId}`, staffId: hisStaff[0].id, date: todayStr, checkIn: now.toISOString(), status: 'Present', institutionId: instId, createdAt: todayStr }
    ];

    const hisFinancials: HISFinancialRecord[] = [
        { id: `his_f1_${instId}`, type: 'Consultation', amount: 3500.00, date: todayStr, department: 'General OPD', paymentMethod: 'M-Pesa', institutionId: instId, createdAt: todayStr }
    ];

    const hisVitals: HISVitalStatistics[] = [
        { id: `his_v1_${instId}`, patientId: hisPatients[0].id, label: 'Blood Pressure', value: '120/80', unit: 'mmHg', trend: 'Normal', color: 'text-emerald-400', recordedAt: now.toISOString(), institutionId: instId },
        { id: `his_v2_${instId}`, patientId: hisPatients[0].id, label: 'Heart Rate', value: '72', unit: 'BPM', trend: '+2', color: 'text-white', recordedAt: now.toISOString(), institutionId: instId },
        { id: `his_v3_${instId}`, patientId: hisPatients[0].id, label: 'Oxygen Saturation', value: '98%', unit: 'SpO2', trend: 'Normal', color: 'text-blue-400', recordedAt: now.toISOString(), institutionId: instId },
        { id: `his_v4_${instId}`, patientId: hisPatients[0].id, label: 'Body Temp', value: '36.8', unit: '°C', trend: '-0.2', color: 'text-white', recordedAt: now.toISOString(), institutionId: instId }
    ];

    const hisEvents: HISClinicalEvent[] = [
        { id: `his_e1_${instId}`, patientId: hisPatients[0].id, date: 'Oct 12', time: '14:30', event: 'Dental Extraction (Tooth 14)', dept: 'Dental', provider: 'Dr. Sarah', institutionId: instId },
        { id: `his_e2_${instId}`, patientId: hisPatients[0].id, date: 'Sep 28', time: '10:15', event: 'Refraction Exam (OD: -2.25)', dept: 'Ophthalmology', provider: 'Dr. Mike', institutionId: instId },
        { id: `his_e3_${instId}`, patientId: hisPatients[0].id, date: 'Sep 15', time: '09:00', event: 'General Consultation', dept: 'OPD', provider: 'Dr. Jane', institutionId: instId }
    ];

    // 9. Cooperative & Farming Data
    const coopFarmers: any[] = [
        { id: `f_1_${instId}`, name: 'Samuel Mwangi', phone: '+254711223344', location: 'Nyeri North', farmSize: 5.5, institutionId: instId, status: 'active', createdAt: todayStr },
        { id: `f_2_${instId}`, name: 'Grace Atieno', phone: '+254722334455', location: 'Kisumu Sub-county', farmSize: 3.2, institutionId: instId, status: 'active', createdAt: todayStr }
    ];

    const coopCollections: any[] = [
        { id: `coll_1_${instId}`, farmerId: coopFarmers[0].id, quantity: 45.5, unit: 'kg', type: 'Milk', pricePerUnit: 48, totalAmount: 2184, status: 'confirmed', date: todayStr, institutionId: instId },
        { id: `coll_2_${instId}`, farmerId: coopFarmers[1].id, quantity: 120.0, unit: 'kg', type: 'Maize', pricePerUnit: 35, totalAmount: 4200, status: 'pending', date: todayStr, institutionId: instId }
    ];

    // 10. Law Firm & Matter Management Data
    const lawClients: any[] = [
        { id: `lc_1_${instId}`, name: 'Alpha Corp Ltd', industry: 'Real Estate', contactPerson: 'John Doe', email: 'legal@alphacorp.com', institutionId: instId, createdAt: todayStr },
        { id: `lc_2_${instId}`, name: 'Estate of Peter Pan', industry: 'Private', contactPerson: 'Wendy Darling', email: 'wendy@neverland.com', institutionId: instId, createdAt: todayStr }
    ];

    const lawMatters: any[] = [
        { id: `lm_1_${instId}`, clientId: lawClients[0].id, title: 'Land Acquisition - Runda Phase 2', caseNumber: 'MAT-2025-001', status: 'Active', category: 'Conveyancing', institutionId: instId, openDate: todayStr },
        { id: `lm_2_${instId}`, clientId: lawClients[1].id, title: 'Probate & Administration', caseNumber: 'MAT-2025-002', status: 'Pending', category: 'Succession', institutionId: instId, openDate: todayStr }
    ];

    // 11. Property Management Data
    const pmProperties: any[] = [
        { id: `prop_1_${instId}`, name: 'Serene Heights', location: 'Kileleshwa', type: 'Residential', totalUnits: 24, institutionId: instId, createdAt: todayStr },
        { id: `prop_2_${instId}`, name: 'Capital Plaza', location: 'Upper Hill', type: 'Commercial', totalUnits: 15, institutionId: instId, createdAt: todayStr }
    ];

    const pmUnits: any[] = [
        { id: `unit_A1_${instId}`, propertyId: pmProperties[0].id, unitNumber: 'A1', type: '3 Bedroom', rentAmount: 85000, status: 'Occupied', institutionId: instId },
        { id: `unit_B2_${instId}`, propertyId: pmProperties[0].id, unitNumber: 'B2', type: '2 Bedroom', rentAmount: 65000, status: 'Vacant', institutionId: instId }
    ];

    // 12. Fuel Station Data
    const fuelTanks: any[] = [
        { id: `tank_p_${instId}`, name: 'Petrol Main', fuelType: 'Petrol', capacityLiters: 20000, currentLevelLiters: 14500, institutionId: instId, createdAt: todayStr },
        { id: `tank_d_${instId}`, name: 'Diesel North', fuelType: 'Diesel', capacityLiters: 15000, currentLevelLiters: 4200, institutionId: instId, createdAt: todayStr }
    ];

    const fuelPumps: any[] = [
        { id: `pump_1_${instId}`, tankId: fuelTanks[0].id, pumpNumber: 'P01', status: 'active', institutionId: instId, createdAt: todayStr },
        { id: `pump_2_${instId}`, tankId: fuelTanks[1].id, pumpNumber: 'D02', status: 'active', institutionId: instId, createdAt: todayStr }
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
        hisStaff,
        hisPatients,
        hisWards,
        hisBeds,
        hisAppointments,
        hisAttendance,
        hisFinancials,
        hisVitals,
        hisEvents,
        
        // Extended Industrial Data
        coopFarmers,
        coopCollections,
        lawClients,
        lawMatters,
        pmProperties,
        pmUnits,
        fuelTanks,
        fuelPumps,

        institutionUpdates: {
            scheduleProfiles: DEFAULT_SECONDARY_PROFILES,
            timetableSettings: INITIAL_TIMETABLE_SETTINGS,
            examTimetableSettings: INITIAL_EXAM_TIMETABLE_SETTINGS
        }
    };
};
