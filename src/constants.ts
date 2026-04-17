
import type { Institution, User, Role, Department, Subject, Course, Building, Room, TimetableSettings, AcademicYear, Semester, CompanyDetails, MpesaTransaction, InventoryItem, Invoice, InvoiceItem, Receipt, Requisition, EmployeeDetails, PayrollRun, Supplier, ExamTimetableSettings, AcademicLevel, Visitor, GradingSystem, ScheduleProfile, TimetablePeriod, Break } from './types';

export const INITIAL_COMPANY_DETAILS: CompanyDetails = {
    name: "Eduai Automation",
    address: "123 Innovation Drive, Nairobi, Kenya",
    email: "info@eduai.co.ke",
    phone: "+254 700 123 456",
    website: "https://eduai.co.ke",
    logoUrl: '/logo.png',
    applicationTitle: "Eduai Automation",
    themeColor: "#4f46e5",
    subscriptionConfig: {
        defaultMonthlyPrice: 5000,
        defaultYearlyPrice: 50000
    },
    mpesaConfig: { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '' },
    ncbaConfig: { clientId: '', clientSecret: '', baseUrl: 'https://c2bapis.ncbagroup.com', environment: 'production' },
    emailConfig: {
        provider: 'smtp',
        host: 'mail.eduai.co.ke',
        port: 587,
        username: 'info@eduai.co.ke',
        password: 'password',
        encryption: 'tls',
        fromName: 'EduAi Support',
        fromEmail: 'info@eduai.co.ke'
    },
    smsConfig: {
        provider: 'Zettatel',
        apiKey: '',
        apiSecret: '',
        fromNumber: '',
        baseUrl: 'https://sms.zettatel.com/smsapi/send'
    },
    letterheadConfig: { headerImageUrl: null, stampImageUrl: null },
    databaseConfig: {
        dbType: 'postgresql',
        host: '',
        port: '5432',
        username: '',
        dbName: '',
        supabaseUrl: 'https://your-project.supabase.co',
        supabaseAnonKey: ''
    },
    chatAssistantConfig: {
        enabled: true,
        welcomeMessage: "Hello! I am your academic assistant. How can I help you today?"
    },
    marketplaceConfig: {
        pricingAmount: 150,
        customUrl: "https://marketplace.eduai.co.ke"
    }
};

const generatePeriods = (count: number, duration: number, start: string): TimetablePeriod[] => {
    const periods: TimetablePeriod[] = [];
    let currentMin = (parseInt(start.split(':')[0]) * 60) + parseInt(start.split(':')[1]);
    for (let i = 1; i <= count; i++) {
        const h = Math.floor(currentMin / 60);
        const m = currentMin % 60;
        const startStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        currentMin += duration;
        const endH = Math.floor(currentMin / 60);
        const endM = currentMin % 60;
        const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        periods.push({ id: `p_${i}`, name: `Period ${i}`, startTime: startStr, endTime: endStr });
    }
    return periods;
};

export const DEFAULT_SECONDARY_PROFILES: ScheduleProfile[] = [
    {
        id: 'prof_844',
        name: 'Standard 8-4-4 Pattern',
        operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: '08:00',
        endTime: '16:20',
        cellSpanMinutes: 40,
        periods: generatePeriods(8, 40, '08:00'),
        breaks: [
            { id: 'b1', name: 'Short Break', startTime: '10:00', endTime: '10:20', status: 'active' },
            { id: 'b2', name: 'Lunch Break', startTime: '12:40', endTime: '13:40', status: 'active' }
        ]
    },
    {
        id: 'prof_cbe',
        name: 'CBE (Competency Based)',
        operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: '08:00',
        endTime: '15:45',
        cellSpanMinutes: 35,
        periods: generatePeriods(9, 35, '08:00'),
        breaks: [
            { id: 'cb1', name: 'Tea Break', startTime: '10:15', endTime: '10:45', status: 'active' },
            { id: 'cb2', name: 'Lunch Break', startTime: '12:30', endTime: '13:30', status: 'active' }
        ]
    }
];

const INST_DEMO = 'INST001';

// --- INITIAL DATA SEEDING ---

export const INITIAL_DEPARTMENTS: Department[] = [
    { id: 'dept_math', name: 'Mathematics & Computer Science', institutionId: INST_DEMO },
    { id: 'dept_lang', name: 'Languages & Humanities', institutionId: INST_DEMO },
    { id: 'dept_sci', name: 'Pure & Applied Sciences', institutionId: INST_DEMO },
    { id: 'dept_arts', name: 'Creative Arts', institutionId: INST_DEMO }
];

export const INITIAL_SUBJECTS: Subject[] = [
    { id: 'sub_math', code: 'MAT101', name: 'Mathematics', departmentId: 'dept_math', institutionId: INST_DEMO, lessonStructure: [{ count: 5, periods: 1 }] },
    { id: 'sub_eng', code: 'ENG101', name: 'English Language', departmentId: 'dept_lang', institutionId: INST_DEMO, lessonStructure: [{ count: 5, periods: 1 }] },
    { id: 'sub_kisw', code: 'KIS101', name: 'Kiswahili', departmentId: 'dept_lang', institutionId: INST_DEMO, lessonStructure: [{ count: 5, periods: 1 }] },
    { id: 'sub_chem', code: 'CHE201', name: 'Chemistry', departmentId: 'dept_sci', institutionId: INST_DEMO, lessonStructure: [{ count: 4, periods: 1 }] },
    { id: 'sub_phy', code: 'PHY201', name: 'Physics', departmentId: 'dept_sci', institutionId: INST_DEMO, lessonStructure: [{ count: 4, periods: 1 }] },
    { id: 'sub_bio', code: 'BIO201', name: 'Biology', departmentId: 'dept_sci', institutionId: INST_DEMO, lessonStructure: [{ count: 4, periods: 1 }] },
    { id: 'sub_geo', code: 'GEO301', name: 'Geography', departmentId: 'dept_lang', institutionId: INST_DEMO, lessonStructure: [{ count: 3, periods: 1 }] },
    { id: 'sub_hist', code: 'HIS301', name: 'History', departmentId: 'dept_lang', institutionId: INST_DEMO, lessonStructure: [{ count: 3, periods: 1 }] },
    { id: 'sub_cre', code: 'CRE301', name: 'Religious Education', departmentId: 'dept_lang', institutionId: INST_DEMO, lessonStructure: [{ count: 3, periods: 1 }] },
    { id: 'sub_comp', code: 'COMP401', name: 'Computer Studies', departmentId: 'dept_math', institutionId: INST_DEMO, lessonStructure: [{ count: 2, periods: 2 }] }
];

export const INITIAL_COURSES: Course[] = [
    {
        id: 'c_form1', name: 'Form 1', code: 'F1', departmentId: 'dept_math', institutionId: INST_DEMO, academicLevelId: 'senior',
        levels: [
            { id: 'lvl_f1_east', name: 'East', subjectIds: ['sub_math', 'sub_eng', 'sub_kisw', 'sub_chem', 'sub_phy', 'sub_bio', 'sub_hist', 'sub_geo'] },
            { id: 'lvl_f1_west', name: 'West', subjectIds: ['sub_math', 'sub_eng', 'sub_kisw', 'sub_chem', 'sub_phy', 'sub_bio', 'sub_cre', 'sub_comp'] }
        ]
    },
    {
        id: 'c_form2', name: 'Form 2', code: 'F2', departmentId: 'dept_math', institutionId: INST_DEMO, academicLevelId: 'senior',
        levels: [
            { id: 'lvl_f2_east', name: 'East', subjectIds: ['sub_math', 'sub_eng', 'sub_kisw', 'sub_chem', 'sub_phy', 'sub_bio'] },
            { id: 'lvl_f2_west', name: 'West', subjectIds: ['sub_math', 'sub_eng', 'sub_kisw', 'sub_chem', 'sub_phy', 'sub_bio'] }
        ]
    },
    {
        id: 'c_form3', name: 'Form 3', code: 'F3', departmentId: 'dept_sci', institutionId: INST_DEMO, academicLevelId: 'senior',
        levels: [
            { id: 'lvl_f3_sci', name: 'Science Stream', subjectIds: ['sub_math', 'sub_eng', 'sub_chem', 'sub_phy', 'sub_bio', 'sub_comp'] },
            { id: 'lvl_f3_arts', name: 'Arts Stream', subjectIds: ['sub_math', 'sub_eng', 'sub_hist', 'sub_geo', 'sub_cre', 'sub_kisw'] }
        ]
    },
    {
        id: 'c_form4', name: 'Form 4', code: 'F4', departmentId: 'dept_sci', institutionId: INST_DEMO, academicLevelId: 'senior',
        levels: [
            { id: 'lvl_f4_cand', name: 'Candidates', subjectIds: ['sub_math', 'sub_eng', 'sub_chem', 'sub_phy', 'sub_bio', 'sub_hist', 'sub_geo'] }
        ]
    }
];

export const INITIAL_BUILDINGS: Building[] = [
    { id: 'bldg_admin', name: 'Administration Block', institutionId: INST_DEMO },
    { id: 'bldg_tuition', name: 'Tuition Block A', institutionId: INST_DEMO },
    { id: 'bldg_labs', name: 'Science Complex', institutionId: INST_DEMO }
];

export const INITIAL_ROOMS: Room[] = [
    { id: 'rm_101', name: 'Room 101', capacity: 45, buildingId: 'bldg_tuition', institutionId: INST_DEMO, status: 'active', shortName: 'R101' },
    { id: 'rm_102', name: 'Room 102', capacity: 45, buildingId: 'bldg_tuition', institutionId: INST_DEMO, status: 'active', shortName: 'R102' },
    { id: 'rm_103', name: 'Room 103', capacity: 45, buildingId: 'bldg_tuition', institutionId: INST_DEMO, status: 'active', shortName: 'R103' },
    { id: 'rm_lab_chem', name: 'Chemistry Lab', capacity: 40, buildingId: 'bldg_labs', institutionId: INST_DEMO, status: 'active', equipment: ['Gas', 'Water'], shortName: 'CHEM' },
    { id: 'rm_lab_comp', name: 'Computer Lab', capacity: 35, buildingId: 'bldg_labs', institutionId: INST_DEMO, status: 'active', equipment: ['Computers', 'Projector'], shortName: 'COMP' }
];

export const INITIAL_TIMETABLE_SETTINGS: TimetableSettings = {
    operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '08:00',
    endTime: '17:00',
    periods: [],
    periodLengthMinutes: 40,
    cellSpanMinutes: 40,
    maxPeriodsPerDay: 9,
    minWeeklyPeriods: 10,
    maxWeeklyPeriods: 35,
    breaks: [],
    constraints: [],
    teacherRules: []
};

export const INITIAL_EXAM_TIMETABLE_SETTINGS: ExamTimetableSettings = {
    sessionsPerDay: [
        { id: 's1', name: 'Morning', startTime: '09:00', endTime: '12:00' },
        { id: 's2', name: 'Afternoon', startTime: '14:00', endTime: '17:00' }
    ],
    rules: ['No student shall sit for more than two exams a day.']
};

export const INITIAL_INSTITUTIONS: Institution[] = [
    {
        id: 'SYSTEM',
        name: 'System Administration',
        email: 'system@eduai.com',
        phoneNumber: '0000000000',
        institutionType: 'Education',
        category: 'University',
        status: 'active',
        institutionCode: 'SYS-ADMIN',
        themeColor: '#1e293b',
        timetableSettings: INITIAL_TIMETABLE_SETTINGS,
        examTimetableSettings: INITIAL_EXAM_TIMETABLE_SETTINGS,
        useAllocationRequests: false,
        isOtpEnabled: false,
        gradingSystems: DEFAULT_GRADING_SYSTEMS
    },
    {
        id: INST_DEMO,
        name: 'Modern Science Academy',
        email: 'admin@edu.com',
        phoneNumber: '020111222',
        institutionType: 'Education',
        category: 'Secondary',
        status: 'active',
        institutionCode: INST_DEMO,
        themeColor: '#4f46e5',
        scheduleProfiles: DEFAULT_SECONDARY_PROFILES,
        timetableSettings: INITIAL_TIMETABLE_SETTINGS,
        examTimetableSettings: INITIAL_EXAM_TIMETABLE_SETTINGS,
        useAllocationRequests: true,
        isOtpEnabled: false,
        gradingSystems: DEFAULT_GRADING_SYSTEMS
    }
];

export const INITIAL_ACADEMIC_LEVELS: AcademicLevel[] = [
    { id: 'ug', name: 'Undergraduate', institutionId: INST_DEMO },
    { id: 'senior', name: 'Senior Secondary', institutionId: INST_DEMO }
];

export const INITIAL_ACADEMIC_YEARS: AcademicYear[] = [
    { id: 'ay_2024', name: '2024/2025', startDate: '2024-09-01', endDate: '2025-08-31', institutionId: INST_DEMO, status: 'active' }
];

export const INITIAL_SEMESTERS: Semester[] = [
    { id: 'sem_1_2024', name: 'Term 1', academicYearId: 'ay_2024', institutionId: INST_DEMO, startDate: '2024-09-01', endDate: '2024-12-20', status: 'active' }
];

export const DEFAULT_GRADING_SYSTEMS: GradingSystem[] = [
    {
        id: 'gs_standard',
        name: 'Secondary Standard',
        definitions: [
            { id: 'A', grade: 'A', minScore: 80, maxScore: 100, points: 12, comment: 'Plain' },
            { id: 'Am', grade: 'A-', minScore: 75, maxScore: 79, points: 11, comment: 'Minus' },
            { id: 'Bp', grade: 'B+', minScore: 70, maxScore: 74, points: 10, comment: 'Plus' },
            { id: 'B', grade: 'B', minScore: 65, maxScore: 69, points: 9, comment: 'Plain' },
            { id: 'Bm', grade: 'B-', minScore: 60, maxScore: 64, points: 8, comment: 'Minus' },
            { id: 'Cp', grade: 'C+', minScore: 55, maxScore: 59, points: 7, comment: 'Plus' },
            { id: 'C', grade: 'C', minScore: 50, maxScore: 54, points: 6, comment: 'Plain' },
            { id: 'Cm', grade: 'C-', minScore: 45, maxScore: 49, points: 5, comment: 'Minus' },
            { id: 'Dp', grade: 'D+', minScore: 40, maxScore: 44, points: 4, comment: 'Plus' },
            { id: 'D', grade: 'D', minScore: 35, maxScore: 39, points: 3, comment: 'Plain' },
            { id: 'Dm', grade: 'D-', minScore: 30, maxScore: 34, points: 2, comment: 'Minus' },
            { id: 'E', grade: 'E', minScore: 0, maxScore: 29, points: 1, comment: 'Fail' },
        ]
    }
];

export const INITIAL_USERS: User[] = [
    {
        id: 'u_super_admin',
        name: 'System Super Admin',
        email: 'super@app.com',
        phoneNumber: '0000000000',
        role: 'super_admin',
        roles: ['super_admin'],
        institutionId: 'SYSTEM',
        expertise: ['System Administration'],
        password: 'password123'
    },
    {
        id: 'u_admin_uni',
        name: 'Principal Newton',
        email: 'admin@edu.com',
        phoneNumber: '0711111111',
        role: 'head_teacher',
        roles: ['head_teacher'],
        institutionId: INST_DEMO,
        expertise: ['Education Management'],
        password: 'password123'
    },
    {
        id: 'u_lec_stem',
        name: 'Ms. Sarah Curie',
        email: 'lecturer@edu.com',
        phoneNumber: '0711111112',
        role: 'teacher',
        roles: ['teacher'],
        institutionId: INST_DEMO,
        departmentId: 'dept_sci',
        expertise: ['Physics', 'Mathematics'],
        password: 'password123'
    },
    {
        id: 'u_lec_lang',
        name: 'Mr. William Shakespeare',
        email: 'will@edu.com',
        phoneNumber: '0711111113',
        role: 'teacher',
        roles: ['teacher'],
        institutionId: INST_DEMO,
        departmentId: 'dept_lang',
        expertise: ['English', 'Literature'],
        password: 'password123'
    }
];

export const RETAIL_SUBTYPES = ['Hardware', 'General', 'Retail', 'Retail Shop', 'Retail Agency', 'Boutique', 'Salon', 'Barber Shop', 'Electronics', 'Supermarket', 'Wholesale', 'General Retail', 'Restaurant', 'Cafe', 'Eatery', 'Pharmacy', 'Chemist', 'Fuel Station'];

export const VALID_STAFF_ROLES: Role[] = ['admin', 'deputy', 'hod', 'tto', 'lecturer', 'practice_teacher', 'academics_officer', 'head_teacher', 'dos', 'teacher', 'librarian', 'security', 'info_desk', 'store', 'boarding_master', 'driver', 'transport_assistant', 'reseller', 'retail_agent', 'field_agent', 'customer', 'lead', 'pastor', 'deacon', 'elder', 'treasurer', 'secretary', 'worker', 'church_admin', 'fuel_admin', 'attendant'];
 
export const MODULES = [
  {
    id: 'property',
    title: "Property Hub",
    description: "Complete real estate automation from tenant onboarding to automated rent reconciliation.",
    advantages: ["Auto-Invoicing", "Maintenance Tracking", "Tenant Portal"],
    role: 'property_admin',
    category: 'Real Estate',
    imageUrl: '/marketing/marketing_property_1776367197098.png'
  },
  {
    id: 'coop',
    title: "Coop Connect",
    description: "The digital spine for agricultural cooperatives. Manage farmers, intake, and payouts seamlessly.",
    advantages: ["Daily Intake Log", "Batch Payouts", "Farmer SMS"],
    role: 'cooperative_manager',
    category: 'Agriculture',
    imageUrl: '/marketing/marketing_coop_1776367214566.png'
  },
  {
    id: 'his',
    title: "HealthFirst HIS",
    description: "Advanced Health Information System for clinics and hospitals with integrated pharmacy.",
    advantages: ["Patient Records", "Prescription Flow", "Pharmacy Inventory"],
    role: 'his_admin',
    category: 'Healthcare',
    imageUrl: '/marketing/marketing_his_1776367229035.png'
  },
  {
    id: 'retail',
    title: "Retail & Agrovet",
    description: "Specialized Point of Sale and inventory systems for retail stores and agricultural shops.",
    advantages: ["Batch Tracking", "Commission Ledger", "Smart Stock"],
    role: 'retail_agent',
    category: 'Business',
    imageUrl: '/marketing/marketing_retail_1776367249575.png'
  },
  {
    id: 'autoservice',
    title: "Auto Services",
    description: "Streamlined management for Car Washes and Service Centers with customer tracking.",
    advantages: ["Job Cards", "Service History", "Customer Rewards"],
    role: 'carwash_admin',
    category: 'Automotive',
    imageUrl: '/marketing/marketing_autoservice_1776367264534.png'
  },
  {
    id: 'edu',
    title: "EduAlloc Engine",
    description: "The most powerful academic management system for timetabling and student oversight.",
    advantages: ["Conflict Detection", "Library Master", "Exam Timetabling"],
    role: 'admin',
    category: 'Education',
    imageUrl: '/marketing/marketing_edu_1776367280172.png'
  },
  {
    id: 'fuel',
    title: "Fuel Command",
    description: "Digital energy management for fuel stations with tank monitoring and shift reconciliation.",
    advantages: ["Live Tank Levels", "Pump Status", "Shift Closing"],
    role: 'fuel_admin',
    category: 'Energy',
    imageUrl: '/marketing/marketing_fuel_1776367300641.png'
  },
  {
    id: 'campaign',
    title: "Campaign AI",
    description: "Strategic political campaign management tool with voter analytics and ward-level tracking.",
    advantages: ["Voter Registry", "Ward Mapping", "Campaign Analytics"],
    role: 'admin',
    category: 'Politics',
    imageUrl: '/marketing/marketing_campaign_1776367315708.png'
  },
  {
    id: 'legal',
    title: "LexLink Legal",
    description: "Comprehensive law firm management covering matters, documents, and trust accounting.",
    advantages: ["Matter Management", "Trust Accounting", "Agreement Templates"],
    role: 'legal_admin',
    category: 'Legal',
    imageUrl: '/marketing/marketing_legal_1776367332080.png'
  },
  {
    id: 'ds',
    title: "DS Pro Master",
    description: "Advanced Driving School system for student onboarding, lesson tracking, and skill mastery.",
    advantages: ["Lesson Scheduling", "Skill Tracking", "Instructor Logs"],
    role: 'driving_instructor',
    category: 'Education',
    imageUrl: '/marketing/marketing_ds_1776367354223.png'
  },
  {
    id: 'civil',
    title: "CivicWorks Hub",
    description: "Robust yard and civil works management for equipment, staff, and project logs.",
    advantages: ["Equipment Logs", "Staff Duty Rota", "Project Tracking"],
    role: 'admin',
    category: 'Construction',
    imageUrl: '/marketing/marketing_civil_1776367369017.png'
  },
  {
    id: 'logistics',
    title: "Logistics Sync",
    description: "Smart logistics management for fleet operations, delivery tracking, and warehouse sync.",
    advantages: ["Fleet Dispatch", "Delivery Tracking", "Warehouse Sync"],
    role: 'admin',
    category: 'Logistics',
    imageUrl: '/marketing/marketing_logistics_1776367388474.png'
  }
];
