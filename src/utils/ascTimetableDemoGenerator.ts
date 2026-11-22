import type { Course, Subject, Room, User, TimetableEntry, TimetableSettings } from '../types';
import type { AscLessonRow } from '../components/AscSubjectsManager';
import type { AscCardRelationshipRow } from '../components/AscCardRelationshipsManager';
import type { AscSchoolSettings } from '../components/AscSchoolSettingsPanel';

export interface SmartTimetableDemoBundle {
    courses: Course[];
    subjects: Subject[];
    rooms: Room[];
    lecturers: User[];
    entries: TimetableEntry[];
    timetableSettings: TimetableSettings;
    ascLessons: AscLessonRow[];
    cardRelations: AscCardRelationshipRow[];
    teacherPrefs: Record<string, any>;
    classPrefs: Record<string, any>;
    subjectPrefs: Record<string, any>;
    schoolSettings: AscSchoolSettings;
}

const DEMO_PERIOD_STARTS = [
    { start: '08:00', end: '08:40' }, // P1
    { start: '08:40', end: '09:20' }, // P2
    { start: '09:20', end: '10:00' }, // P3
    { start: '10:15', end: '10:55' }, // P4
    { start: '11:25', end: '12:05' }, // P5
    { start: '12:05', end: '12:45' }, // P6
    { start: '13:45', end: '14:25' }, // P7
    { start: '14:25', end: '15:05' }, // P8
    { start: '15:05', end: '15:45' }, // P9
    { start: '15:45', end: '16:25' }, // P10
];

const DEMO_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function buildSmartTimetableDemoBundle(instId: string, institutionName?: string): SmartTimetableDemoBundle {
    const nowIso = new Date().toISOString();

    const subjects: Subject[] = [
        { id: 'demo_sub_eng', institutionId: instId, name: 'ENGLISH', code: 'ENG', departmentId: 'demo_dept_lang', hoursPerWeek: 6, lessonStructure: [{ count: 6, periods: 1 }] } as any,
        { id: 'demo_sub_kis', institutionId: instId, name: 'KISWAHILI', code: 'KIS', departmentId: 'demo_dept_lang', hoursPerWeek: 6, lessonStructure: [{ count: 6, periods: 1 }] } as any,
        { id: 'demo_sub_mat', institutionId: instId, name: 'MATHEMATICS', code: 'MAT', departmentId: 'demo_dept_math', hoursPerWeek: 6, lessonStructure: [{ count: 6, periods: 1 }] } as any,
        { id: 'demo_sub_bio', institutionId: instId, name: 'BIOLOGY', code: 'BIO', departmentId: 'demo_dept_sci', hoursPerWeek: 6, lessonStructure: [{ count: 4, periods: 1 }, { count: 1, periods: 2 }] } as any,
        { id: 'demo_sub_che', institutionId: instId, name: 'CHEMISTRY', code: 'CHE', departmentId: 'demo_dept_sci', hoursPerWeek: 6, lessonStructure: [{ count: 4, periods: 1 }, { count: 1, periods: 2 }] } as any,
        { id: 'demo_sub_phy', institutionId: instId, name: 'PHYSICS', code: 'PHY', departmentId: 'demo_dept_sci', hoursPerWeek: 6, lessonStructure: [{ count: 6, periods: 1 }] } as any,
        { id: 'demo_sub_hist', institutionId: instId, name: 'HISTORY', code: 'HIST', departmentId: 'demo_dept_hum', hoursPerWeek: 6, lessonStructure: [{ count: 6, periods: 1 }] } as any,
        { id: 'demo_sub_geo', institutionId: instId, name: 'GEOGRAPHY', code: 'GEO', departmentId: 'demo_dept_hum', hoursPerWeek: 6, lessonStructure: [{ count: 6, periods: 1 }] } as any,
        { id: 'demo_sub_cre', institutionId: instId, name: 'CRE', code: 'CRE', departmentId: 'demo_dept_hum', hoursPerWeek: 6, lessonStructure: [{ count: 6, periods: 1 }] } as any,
        { id: 'demo_sub_agri', institutionId: instId, name: 'AGRICULTURE', code: 'AGRI', departmentId: 'demo_dept_tech', hoursPerWeek: 6, lessonStructure: [{ count: 6, periods: 1 }] } as any,
        { id: 'demo_sub_hs', institutionId: instId, name: 'HOME SCIENCE', code: 'HS', departmentId: 'demo_dept_tech', hoursPerWeek: 6, lessonStructure: [{ count: 6, periods: 1 }] } as any,
        { id: 'demo_sub_cs', institutionId: instId, name: 'COMPUTER STUDIES', code: 'CS', departmentId: 'demo_dept_tech', hoursPerWeek: 6, lessonStructure: [{ count: 6, periods: 1 }] } as any,
        { id: 'demo_sub_bst', institutionId: instId, name: 'BUSINESS STUDIES', code: 'BST', departmentId: 'demo_dept_tech', hoursPerWeek: 6, lessonStructure: [{ count: 6, periods: 1 }] } as any,
    ];

    const allSubIds = subjects.map(s => s.id);

    const courses: Course[] = [
        {
            id: 'demo_cls_4n',
            institutionId: instId,
            name: 'FORM FOUR NORTH',
            code: '4N',
            levels: [{ id: 'demo_lvl_4n', name: 'FORM FOUR NORTH', subjectIds: allSubIds }],
        } as any,
        {
            id: 'demo_cls_4c',
            institutionId: instId,
            name: 'FORM FOUR CENTRAL',
            code: '4C',
            levels: [{ id: 'demo_lvl_4c', name: 'FORM FOUR CENTRAL', subjectIds: allSubIds }],
        } as any,
        {
            id: 'demo_cls_4s',
            institutionId: instId,
            name: 'FORM FOUR SOUTH',
            code: '4S',
            levels: [{ id: 'demo_lvl_4s', name: 'FORM FOUR SOUTH', subjectIds: allSubIds }],
        } as any,
        {
            id: 'demo_cls_4e',
            institutionId: instId,
            name: 'FORM FOUR EAST',
            code: '4E',
            levels: [{ id: 'demo_lvl_4e', name: 'FORM FOUR EAST', subjectIds: allSubIds }],
        } as any,
    ];

    const rooms: Room[] = [
        { id: 'demo_rm_lab1', institutionId: instId, name: 'LAB 1', capacity: 45, type: 'Laboratory', buildingId: 'demo_bld_sci' } as any,
        { id: 'demo_rm_lab2', institutionId: instId, name: 'LAB 2', capacity: 45, type: 'Laboratory', buildingId: 'demo_bld_sci' } as any,
        { id: 'demo_rm_comp', institutionId: instId, name: 'COMPUTER LAB', capacity: 40, type: 'Computer Lab', buildingId: 'demo_bld_tech' } as any,
        { id: 'demo_rm_fld', institutionId: instId, name: 'FIELD', capacity: 120, type: 'Field', buildingId: 'demo_bld_main' } as any,
        { id: 'demo_rm_4n', institutionId: instId, name: '4N ROOM', capacity: 48, type: 'Classroom', buildingId: 'demo_bld_main' } as any,
        { id: 'demo_rm_4c', institutionId: instId, name: '4C ROOM', capacity: 48, type: 'Classroom', buildingId: 'demo_bld_main' } as any,
        { id: 'demo_rm_4s', institutionId: instId, name: '4S ROOM', capacity: 48, type: 'Classroom', buildingId: 'demo_bld_main' } as any,
        { id: 'demo_rm_4e', institutionId: instId, name: '4E ROOM', capacity: 48, type: 'Classroom', buildingId: 'demo_bld_main' } as any,
    ];

    const teacherDefs = [
        { id: 'demo_t_01', name: 'MRS. KIMOSOP', short: '05', color: '#4ade80', classOf: '4E' },
        { id: 'demo_t_02', name: 'Mr Kachumo', short: '14', color: '#f472b6', classOf: '4N' },
        { id: 'demo_t_03', name: 'MS KOMEN E', short: '06', color: '#0ea5e9', classOf: '4C' },
        { id: 'demo_t_04', name: 'MR.NGETICH', short: '09', color: '#bae6fd', classOf: '' },
        { id: 'demo_t_05', name: 'MRS CHIRCHIR', short: '04', color: '#f87171', classOf: '' },
        { id: 'demo_t_06', name: 'MR RONO', short: '10', color: '#67e8f9', classOf: '' },
        { id: 'demo_t_07', name: 'Mrs KIPTOO', short: '08', color: '#ef4444', classOf: '' },
        { id: 'demo_t_08', name: 'Mr Mokomari', short: '12', color: '#991b1b', classOf: '4S' },
        { id: 'demo_t_09', name: 'Mr Kirwa', short: '11', color: '#d9f99d', classOf: '' },
        { id: 'demo_t_10', name: 'Mr Collins', short: '28', color: '#86efac', classOf: '' },
        { id: 'demo_t_11', name: 'Ms Joan Zaddy', short: '01', color: '#1d4ed8', classOf: '' },
        { id: 'demo_t_12', name: 'Ms Togoch', short: '15', color: '#ca8a04', classOf: '' },
        { id: 'demo_t_13', name: 'Mr Kaguko', short: '17', color: '#fbcfe8', classOf: '' },
        { id: 'demo_t_14', name: 'Mr Nathan', short: '19', color: '#7f1d1d', classOf: '' },
        { id: 'demo_t_15', name: 'Ms Sandra', short: '25', color: '#db2777', classOf: '' },
        { id: 'demo_t_16', name: 'Mr Yator', short: '20', color: '#16a34a', classOf: '' },
    ];

    const lecturers: User[] = teacherDefs.map(t => ({
        id: t.id,
        institutionId: instId,
        name: t.name,
        email: `${t.id}@demo.eduai.co.ke`,
        role: 'teacher',
    } as any));

    const teacherPrefs: Record<string, any> = {};
    teacherDefs.forEach(t => {
        teacherPrefs[t.id] = {
            shortCode: t.short,
            color: t.color,
            classTeacherOf: t.classOf || undefined,
            maxPerDay: 6,
            maxConsecutive: 3,
            constraints: {
                limitWindowsWeek: true,
                maxWindowsWeek: 8,
                limitConsecutive: true,
                maxConsecutive: 3,
                limitMinMaxPerDay: true,
                minLessonsPerDay: 1,
                maxLessonsPerDay: 6,
            },
        };
    });

    // Authentic 5-day × 10-period template per stream (with Friday P9-P10 open)
    // Tokens: single code ('KIS','MAT','CHE','ENG','BIO') OR split group ('HIST/GEO', 'PHY/CRE', 'AGRI/HS/CS/BST')
    const streamPatterns: Record<string, string[][]> = {
        '4N': [
            ['HIST/GEO', 'KIS', 'MAT', 'KIS', 'PHY/CRE', 'BIO', 'ENG', 'HIST/GEO', 'AGRI/HS/CS/BST', 'CHE'],
            ['CHE', 'ENG', 'CHE', 'AGRI/HS/CS/BST', 'PHY/CRE', 'MAT', 'HIST/GEO', 'PHY/CRE', 'KIS', 'BIO'],
            ['PHY/CRE', 'MAT', 'HIST/GEO', 'BIO', 'ENG', 'BIO', 'AGRI/HS/CS/BST', 'CHE', 'KIS', 'ENG'],
            ['CHE', 'ENG', 'MAT', 'HIST/GEO', 'BIO', 'AGRI/HS/CS/BST', 'PHY/CRE', 'KIS', 'MAT', 'AGRI/HS/CS/BST'],
            ['ENG', 'HIST/GEO', 'MAT', 'PHY/CRE', 'AGRI/HS/CS/BST', 'BIO', 'KIS', 'CHE', '', ''],
        ],
        '4C': [
            ['HIST/GEO', 'ENG', 'MAT', 'BIO', 'PHY/CRE', 'KIS', 'CHE', 'HIST/GEO', 'AGRI/HS/CS/BST', 'BIO'],
            ['KIS', 'ENG', 'MAT', 'AGRI/HS/CS/BST', 'PHY/CRE', 'BIO', 'HIST/GEO', 'PHY/CRE', 'ENG', 'CHE'],
            ['PHY/CRE', 'MAT', 'HIST/GEO', 'CHE', 'ENG', 'CHE', 'AGRI/HS/CS/BST', 'BIO', 'KIS', 'MAT'],
            ['MAT', 'KIS', 'CHE', 'HIST/GEO', 'KIS', 'AGRI/HS/CS/BST', 'PHY/CRE', 'ENG', 'BIO', 'AGRI/HS/CS/BST'],
            ['ENG', 'HIST/GEO', 'CHE', 'PHY/CRE', 'AGRI/HS/CS/BST', 'MAT', 'BIO', 'KIS', '', ''],
        ],
        '4S': [
            ['HIST/GEO', 'CHE', 'MAT', 'BIO', 'PHY/CRE', 'ENG', 'ENG', 'HIST/GEO', 'AGRI/HS/CS/BST', 'KIS'],
            ['MAT', 'KIS', 'CHE', 'AGRI/HS/CS/BST', 'PHY/CRE', 'BIO', 'HIST/GEO', 'PHY/CRE', 'ENG', 'KIS'],
            ['PHY/CRE', 'MAT', 'HIST/GEO', 'CHE', 'BIO', 'ENG', 'AGRI/HS/CS/BST', 'KIS', 'BIO', 'CHE'],
            ['MAT', 'KIS', 'CHE', 'HIST/GEO', 'BIO', 'AGRI/HS/CS/BST', 'PHY/CRE', 'ENG', 'MAT', 'AGRI/HS/CS/BST'],
            ['KIS', 'HIST/GEO', 'ENG', 'PHY/CRE', 'AGRI/HS/CS/BST', 'MAT', 'BIO', 'CHE', '', ''],
        ],
        '4E': [
            ['HIST/GEO', 'MAT', 'ENG', 'BIO', 'PHY/CRE', 'KIS', 'CHE', 'HIST/GEO', 'AGRI/HS/CS/BST', 'MAT'],
            ['BIO', 'ENG', 'CHE', 'AGRI/HS/CS/BST', 'PHY/CRE', 'MAT', 'HIST/GEO', 'PHY/CRE', 'KIS', 'ENG'],
            ['PHY/CRE', 'MAT', 'HIST/GEO', 'KIS', 'CHE', 'BIO', 'AGRI/HS/CS/BST', 'KIS', 'CHE', 'ENG'],
            ['BIO', 'KIS', 'CHE', 'HIST/GEO', 'MAT', 'AGRI/HS/CS/BST', 'PHY/CRE', 'BIO', 'ENG', 'AGRI/HS/CS/BST'],
            ['ENG', 'HIST/GEO', 'CHE', 'PHY/CRE', 'AGRI/HS/CS/BST', 'MAT', 'BIO', 'KIS', '', ''],
        ],
    };

    const subByCode: Record<string, string> = {};
    subjects.forEach(s => { subByCode[(s.code || '').toUpperCase()] = s.id; });

    const teacherForSubAndStream = (code: string, stream: string): string => {
        if (code === 'ENG') return stream === '4N' ? 'demo_t_14' : stream === '4C' ? 'demo_t_12' : 'demo_t_01';
        if (code === 'KIS') return stream === '4N' || stream === '4C' ? 'demo_t_03' : 'demo_t_07';
        if (code === 'MAT') return stream === '4N' || stream === '4E' ? 'demo_t_13' : 'demo_t_08';
        if (code === 'BIO') return 'demo_t_16';
        if (code === 'CHE') return 'demo_t_02';
        if (code === 'PHY') return 'demo_t_04';
        if (code === 'HIST') return 'demo_t_06';
        if (code === 'GEO') return 'demo_t_09';
        if (code === 'CRE') return 'demo_t_11';
        if (code === 'AGRI') return 'demo_t_05';
        if (code === 'HS') return 'demo_t_15';
        if (code === 'CS') return 'demo_t_10';
        return 'demo_t_07';
    };

    const roomForSubAndStream = (code: string, stream: string): string => {
        if (code === 'BIO' || code === 'CHE') return 'demo_rm_lab1';
        if (code === 'PHY') return 'demo_rm_lab2';
        if (code === 'CS') return 'demo_rm_comp';
        if (stream === '4N') return 'demo_rm_4n';
        if (stream === '4C') return 'demo_rm_4c';
        if (stream === '4S') return 'demo_rm_4s';
        return 'demo_rm_4e';
    };

    const entries: TimetableEntry[] = [];
    let eid = 1;
    const streamMeta = [
        { code: '4N', courseId: 'demo_cls_4n', levelId: 'demo_lvl_4n' },
        { code: '4C', courseId: 'demo_cls_4c', levelId: 'demo_lvl_4c' },
        { code: '4S', courseId: 'demo_cls_4s', levelId: 'demo_lvl_4s' },
        { code: '4E', courseId: 'demo_cls_4e', levelId: 'demo_lvl_4e' },
    ];

    streamMeta.forEach(sm => {
        const grid = streamPatterns[sm.code];
        DEMO_DAYS.forEach((day, dIdx) => {
            grid[dIdx].forEach((token, pIdx) => {
                if (!token) return;
                const slot = DEMO_PERIOD_STARTS[pIdx];
                const codes = token.split('/');
                codes.forEach(c => {
                    const subId = subByCode[c];
                    if (!subId) return;
                    entries.push({
                        id: `demo_tt_${eid++}`,
                        institutionId: instId,
                        courseId: sm.courseId,
                        levelId: sm.levelId,
                        subjectId: subId,
                        lecturerId: teacherForSubAndStream(c, sm.code),
                        roomId: roomForSubAndStream(c, sm.code),
                        day,
                        startTime: slot.start,
                        endTime: slot.end,
                    } as any);
                });
            });
        });
    });

    // Populate aSc Lessons list (for Subjects / Classes / Teachers "Lessons" modals)
    const ascLessons: AscLessonRow[] = [];
    let lid = 1;
    ['ENG', 'KIS', 'MAT', 'BIO', 'CHE'].forEach(code => {
        streamMeta.forEach(sm => {
            const tid = teacherForSubAndStream(code, sm.code);
            const tObj = teacherDefs.find(t => t.id === tid);
            ascLessons.push({
                id: `demo_les_${lid++}`,
                institutionId: instId,
                subjectId: subByCode[code],
                teacherId: tid,
                teacherName: tObj?.name || 'Teacher',
                courseId: sm.courseId,
                levelId: sm.levelId,
                classLabel: sm.code,
                count: 6,
                length: 1,
                classroomMode: 'home',
                week: '',
                term: '',
                createdAt: nowIso,
            });
        });
    });
    // Joint elective lessons across 4N, 4C, 4S, 4E
    ['PHY', 'HIST', 'GEO', 'CRE', 'AGRI', 'HS', 'CS', 'BST'].forEach(code => {
        const tid = teacherForSubAndStream(code, '4N');
        const tObj = teacherDefs.find(t => t.id === tid);
        ascLessons.push({
            id: `demo_les_${lid++}`,
            institutionId: instId,
            subjectId: subByCode[code],
            teacherId: tid,
            teacherName: tObj?.name || 'Teacher',
            courseId: 'demo_cls_4n',
            levelId: 'demo_lvl_4n',
            classLabel: `4N, 4C, 4S, 4E ${code}`,
            count: 6,
            length: 1,
            classroomMode: code === 'CS' ? 'specific' : 'home',
            roomId: code === 'CS' ? 'demo_rm_comp' : undefined,
            roomName: code === 'CS' ? 'COMPUTER LAB' : undefined,
            week: '',
            term: '',
            createdAt: nowIso,
        });
    });

    const cardRelations: AscCardRelationshipRow[] = [
        {
            id: 'demo_rel_1',
            institutionId: instId,
            ruleType: 'cannot_follow',
            subjectIds: ['demo_sub_bio', 'demo_sub_phy', 'demo_sub_che', 'demo_sub_mat'],
            applyToScope: 'all_classes',
            courseIds: [],
            importance: 'Strict',
            active: true,
            createdAt: nowIso,
        },
        {
            id: 'demo_rel_2',
            institutionId: instId,
            ruleType: 'cannot_same_day',
            subjectIds: ['demo_sub_bio', 'demo_sub_phy'],
            applyToScope: 'all_classes',
            courseIds: [],
            importance: 'Normal',
            active: true,
            createdAt: nowIso,
        },
        {
            id: 'demo_rel_3',
            institutionId: instId,
            ruleType: 'same_time_all_classes',
            subjectIds: ['demo_sub_hist', 'demo_sub_geo'],
            applyToScope: 'all_classes',
            courseIds: [],
            importance: 'Strict',
            note: 'Humanities split group',
            active: true,
            createdAt: nowIso,
        },
        {
            id: 'demo_rel_4',
            institutionId: instId,
            ruleType: 'same_time_all_classes',
            subjectIds: ['demo_sub_agri', 'demo_sub_hs', 'demo_sub_cs', 'demo_sub_bst'],
            applyToScope: 'all_classes',
            courseIds: [],
            importance: 'Strict',
            note: 'Technicals split group',
            active: true,
            createdAt: nowIso,
        },
    ];

    // Class prefs (Friday P9-P10 blocked red + Divisions)
    const classPrefs: Record<string, any> = {};
    streamMeta.forEach(sm => {
        classPrefs[`${sm.courseId}::${sm.levelId}`] = {
            shortCode: sm.code,
            timeOff: { '4_8': true, '4_9': true }, // Friday P9 & P10 blocked
            divisions: [
                { id: `div_hum_${sm.code}`, name: 'Humanities', groups: ['HIST', 'GEO'] },
                { id: `div_sci_${sm.code}`, name: 'Science / CRE', groups: ['PHY', 'CRE'] },
                { id: `div_tech_${sm.code}`, name: 'Technicals', groups: ['AGRI', 'HS', 'CS', 'BST'] },
            ],
        };
    });

    const subjectPrefs: Record<string, any> = {};
    subjects.forEach(s => {
        subjectPrefs[s.id] = { distribution: 'Ideal' };
    });

    const schoolSettings: AscSchoolSettings = {
        id: `asc_school_${instId}`,
        institutionId: instId,
        schoolName: (institutionName || 'DEMO SECONDARY SCHOOL').toUpperCase(),
        academicYear: `${new Date().getFullYear()}`,
        registrationName: 'EDUAI SMART TIMETABLE DEMO',
        periodsPerDay: 10,
        workWithZeroPeriods: false,
        numberOfDays: 5,
        weekend: 'Saturday - Sunday',
        showDayNumberInsteadOfName: false,
        multiTermOrWeek: false,
        weeksCount: 1,
        termsCount: 3,
        dayNames: DEMO_DAYS,
        bellTimes: [
            { id: 'p_1', period: 1, name: '1', short: '1', start: '08:00', end: '08:40', isBreak: false, print: true, bell: 'All classes' },
            { id: 'p_2', period: 2, name: '2', short: '2', start: '08:40', end: '09:20', isBreak: false, print: true, bell: 'All classes' },
            { id: 'p_3', period: 3, name: '3', short: '3', start: '09:20', end: '10:00', isBreak: false, print: true, bell: 'All classes' },
            { id: 'b_1', name: 'BREAK', short: 'BREAK', start: '10:00', end: '10:15', isBreak: true, print: true, bell: 'All classes' },
            { id: 'p_4', period: 4, name: '4', short: '4', start: '10:15', end: '10:55', isBreak: false, print: true, bell: 'All classes' },
            { id: 'b_2', name: 'LONG BREAK', short: 'BREAK', start: '10:55', end: '11:25', isBreak: true, print: true, bell: 'All classes' },
            { id: 'p_5', period: 5, name: '5', short: '5', start: '11:25', end: '12:05', isBreak: false, print: true, bell: 'All classes' },
            { id: 'p_6', period: 6, name: '6', short: '6', start: '12:05', end: '12:45', isBreak: false, print: true, bell: 'All classes' },
            { id: 'b_3', name: 'LUNCH BREAK', short: 'LUNCH', start: '12:45', end: '13:45', isBreak: true, print: true, bell: 'All classes' },
            { id: 'p_7', period: 7, name: '7', short: '7', start: '13:45', end: '14:25', isBreak: false, print: true, bell: 'All classes' },
            { id: 'p_8', period: 8, name: '8', short: '8', start: '14:25', end: '15:05', isBreak: false, print: true, bell: 'All classes' },
            { id: 'p_9', period: 9, name: '9', short: '9', start: '15:05', end: '15:45', isBreak: false, print: true, bell: 'All classes' },
            { id: 'p_10', period: 10, name: '10', short: '10', start: '15:45', end: '16:25', isBreak: false, print: true, bell: 'All classes' },
        ],
        country: 'Kenya',
        curriculum: 'CBC / KCSE Secondary',
        scheduleType: 'standard_weekly',
        parameters: {
            allowDoubleAcrossBreak: false,
            prioritizeCoreMorning: true,
            defaultMaxConsecutive: 3,
        },
        customFields: {
            motto: 'Excellence Through Discipline',
            principalName: 'Dr. J. Kiprop',
            dosName: 'Mr. D. Kiptoo',
            footerNote: 'EduAI Smart Timetable Demo',
        },
        updatedAt: nowIso,
    };

    const timetableSettings: TimetableSettings = {
        operatingDays: DEMO_DAYS,
        startTime: '08:00',
        endTime: '16:25',
        lessonDurationMinutes: 40,
        cellSpanMinutes: 40,
        breaks: [
            { name: 'SHORT BREAK', startTime: '10:00', endTime: '10:15' },
            { name: 'LONG BREAK', startTime: '10:55', endTime: '11:25' },
            { name: 'LUNCH BREAK', startTime: '12:45', endTime: '13:45' },
        ],
    } as any;

    return {
        courses,
        subjects,
        rooms,
        lecturers,
        entries,
        timetableSettings,
        ascLessons,
        cardRelations,
        teacherPrefs,
        classPrefs,
        subjectPrefs,
        schoolSettings,
    };
}
