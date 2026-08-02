import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Institution, Subject, AcademicLevel, Course, User } from '../types';
import { GradingSystemManager } from './GradingSystemManager';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { isSubjectAssignedToClassStream } from './ClassSubjectAllocationModal';
import { apiService } from '../services/apiService';

export interface ClassSubjectPaper {
    id: string;
    name: string; // e.g. Language, Lugha, Main paper, Paper 1, Paper 2
    maxScore: number; // e.g. 100
}

export interface ClassSubjectConfig {
    id: string;
    subjectId: string;
    subjectCode: string; // e.g. 101, 102, 121
    subjectName: string; // e.g. ENGLISH, KISWAHILI, MATHS
    papers: ClassSubjectPaper[];
}

export interface ClassExamConfig {
    classId: string;
    className: string; // e.g. Form 3, Form 4, Grade 10
    subjects: ClassSubjectConfig[];
}

export interface ClassTeacherCommentRule {
    id: string;
    grade: string; // e.g. A, A-, B+, B, B-, C+, C, C-, D+, D, D-, E
    classTeacherComment: string;
    schoolHeadComment: string;
}

export interface ClassTeacherCommentsConfig {
    classId: string;
    className: string;
    rules: ClassTeacherCommentRule[];
}

export interface ClassRankingConfig {
    classId: string;
    className: string;
    enabled: boolean;
    criteria: 'Points' | 'Total Marks' | 'Mean Score';
    rankingSubjectsCount: number;
}

export interface OthersExamSettings {
    inviteCode: string;
    meanPointsDecimal: number;
    meanScoreDecimal: number;
    meanMarksDecimal: number;
    absentGrade: string;
    irregularityGrade: string;
    incompleteGrade: string;
    includeNonRankingInAnalysis: boolean;
}

interface ExamConfigManagerProps {
    currentInstitution?: Institution | null;
    onUpdateInstitution?: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => void;
    subjects?: Subject[];
    academicLevels?: AcademicLevel[];
    courses?: Course[];
    users?: User[];
}

export const ExamConfigManager: React.FC<ExamConfigManagerProps> = ({
    currentInstitution,
    onUpdateInstitution,
    subjects = [],
    academicLevels = [],
    courses = [],
    users = []
}) => {
    const isPrimarySchool = useMemo(() => {
        const type = (currentInstitution?.institutionType || '').toLowerCase();
        const name = (currentInstitution?.name || '').toLowerCase();
        return type === 'primary' || type === 'primary_school' || name.includes('primary') || name.includes('academy') || name.includes('cbc') || name.includes('cbe');
    }, [currentInstitution]);
    const [activeSubTab, setActiveSubTab] = useState<'exam_papers' | 'grading_system' | 'teachers_comments' | 'students_ranking' | 'others'>('exam_papers');

    // Default classes list if no academic levels or courses passed
    const defaultClasses = useMemo(() => [
        { id: 'form_3', name: 'Form 3' },
        { id: 'form_4', name: 'Form 4' },
        { id: 'grade_10', name: 'Grade 10' }
    ], []);

    const classList = useMemo(() => {
        const classMap = new Map<string, { id: string; name: string }>();

        const addCl = (id: string, name: string) => {
            const key = name.toLowerCase().trim();
            if (!classMap.has(key)) {
                classMap.set(key, { id, name });
            }
        };

        if (academicLevels && academicLevels.length > 0) {
            academicLevels.forEach(lvl => addCl(lvl.id, lvl.name));
        }
        if (courses && courses.length > 0) {
            courses.forEach(c => addCl(c.id, c.name));
        }

        if (users && users.length > 0) {
            users.forEach(u => {
                const cl = (u as any).studentClass || (u as any).classLevel || (u as any).class_name || (u as any).class;
                const stream = (u as any).stream || (u as any).streamName || (u as any).stream_name;
                if (cl && stream) {
                    const fullName = `${cl.trim()} ${stream.trim()}`;
                    const id = `cls_${fullName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                    addCl(id, fullName);
                }
            });
        }

        if (classMap.size === 0) {
            defaultClasses.forEach(c => addCl(c.id, c.name));
        }

        return Array.from(classMap.values());
    }, [academicLevels, courses, users, defaultClasses]);

    const [activeClassId, setActiveClassId] = useState<string>('form_3');
    const [activeCommentClassId, setActiveCommentClassId] = useState<string>('form_3');

    // Sync active class to first real class when classList resolves from DB
    useEffect(() => {
        if (classList.length > 0 && !classList.find(c => c.id === activeClassId)) {
            setActiveClassId(classList[0].id);
            setActiveCommentClassId(classList[0].id);
        }
    }, [classList, activeClassId]);

    // DB subject_allocations records — used to detect subjects added via LessonsAllocationManager
    // that may not have targetClasses set on their Subject record
    const [dbAllocations, setDbAllocations] = useState<Array<{ className: string; subjectName: string; subjectCode?: string; subjectId?: string }>>([]);
    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<any>('subject_allocations', currentInstitution.id)
                .then((recs: any[]) => {
                    if (recs && recs.length > 0) {
                        setDbAllocations(recs.map((r: any) => ({
                            className: r.className || '',
                            subjectName: r.subjectName || '',
                            subjectCode: r.subjectCode,
                            subjectId: r.subjectId
                        })));
                    }
                })
                .catch(() => {});
        }
    }, [currentInstitution]);

    // 1. Default initial Per-Class Exam Papers state
    const initialClassConfigs: ClassExamConfig[] = useMemo(() => [
        {
            classId: 'form_3',
            className: 'Form 3',
            subjects: [
                {
                    id: 'f3_eng',
                    subjectId: 'sub_101',
                    subjectCode: '101',
                    subjectName: 'ENGLISH',
                    papers: [{ id: 'p_eng_1', name: 'Language', maxScore: 100 }]
                },
                {
                    id: 'f3_kisw',
                    subjectId: 'sub_102',
                    subjectCode: '102',
                    subjectName: 'KISWAHILI',
                    papers: [{ id: 'p_kisw_1', name: 'Lugha', maxScore: 100 }]
                },
                {
                    id: 'f3_math',
                    subjectId: 'sub_121',
                    subjectCode: '121',
                    subjectName: 'MATHS',
                    papers: [{ id: 'p_math_1', name: 'Main paper', maxScore: 100 }]
                },
                {
                    id: 'f3_bio',
                    subjectId: 'sub_231',
                    subjectCode: '231',
                    subjectName: 'BIOLOGY',
                    papers: [{ id: 'p_bio_1', name: 'Main paper', maxScore: 100 }]
                },
                {
                    id: 'f3_phy',
                    subjectId: 'sub_232',
                    subjectCode: '232',
                    subjectName: 'PHYSICS',
                    papers: [{ id: 'p_phy_1', name: 'Main paper', maxScore: 100 }]
                },
                {
                    id: 'f3_chem',
                    subjectId: 'sub_233',
                    subjectCode: '233',
                    subjectName: 'CHEMISTRY',
                    papers: [{ id: 'p_chem_1', name: 'Main paper', maxScore: 100 }]
                },
                {
                    id: 'f3_hist',
                    subjectId: 'sub_311',
                    subjectCode: '311',
                    subjectName: 'HISTORY',
                    papers: [{ id: 'p_hist_1', name: 'Main paper', maxScore: 100 }]
                },
                {
                    id: 'f3_geog',
                    subjectId: 'sub_312',
                    subjectCode: '312',
                    subjectName: 'GEOGRAPHY',
                    papers: [{ id: 'p_geog_1', name: 'Main paper', maxScore: 100 }]
                },
                {
                    id: 'f3_cre',
                    subjectId: 'sub_313',
                    subjectCode: '313',
                    subjectName: 'CRE',
                    papers: [{ id: 'p_cre_1', name: 'Main paper', maxScore: 100 }]
                },
                {
                    id: 'f3_agri',
                    subjectId: 'sub_443',
                    subjectCode: '443',
                    subjectName: 'AGRICULTURE',
                    papers: [{ id: 'p_agri_1', name: 'Main paper', maxScore: 100 }]
                },
                {
                    id: 'f3_bst',
                    subjectId: 'sub_565',
                    subjectCode: '565',
                    subjectName: 'BUSINESS STUDIES',
                    papers: [{ id: 'p_bst_1', name: 'Main paper', maxScore: 100 }]
                },
                {
                    id: 'f3_comp',
                    subjectId: 'sub_451',
                    subjectCode: '451',
                    subjectName: 'COMPUTER STUDIES',
                    papers: [{ id: 'p_comp_1', name: 'Main paper', maxScore: 100 }]
                },
                {
                    id: 'f3_hs',
                    subjectId: 'sub_441',
                    subjectCode: '441',
                    subjectName: 'HOME SCIENCE',
                    papers: [{ id: 'p_hs_1', name: 'Main paper', maxScore: 100 }]
                }
            ]
        },
        {
            classId: 'form_4',
            className: 'Form 4',
            subjects: [
                {
                    id: 'f4_eng',
                    subjectId: 'sub_101',
                    subjectCode: '101',
                    subjectName: 'ENGLISH',
                    papers: [
                        { id: 'p_f4_eng_1', name: 'Paper 1 (Functional Writing)', maxScore: 60 },
                        { id: 'p_f4_eng_2', name: 'Paper 2 (Comprehension)', maxScore: 80 },
                        { id: 'p_f4_eng_3', name: 'Paper 3 (Composition)', maxScore: 60 }
                    ]
                },
                {
                    id: 'f4_kisw',
                    subjectId: 'sub_102',
                    subjectCode: '102',
                    subjectName: 'KISWAHILI',
                    papers: [
                        { id: 'p_f4_kisw_1', name: 'Insha', maxScore: 50 },
                        { id: 'p_f4_kisw_2', name: 'Lugha', maxScore: 80 },
                        { id: 'p_f4_kisw_3', name: 'Fasihi', maxScore: 70 }
                    ]
                },
                {
                    id: 'f4_math',
                    subjectId: 'sub_121',
                    subjectCode: '121',
                    subjectName: 'MATHS',
                    papers: [
                        { id: 'p_f4_math_1', name: 'Paper 1', maxScore: 100 },
                        { id: 'p_f4_math_2', name: 'Paper 2', maxScore: 100 }
                    ]
                }
            ]
        },
        {
            classId: 'grade_10',
            className: 'Grade 10',
            subjects: [
                {
                    id: 'g10_eng',
                    subjectId: 'sub_101',
                    subjectCode: '101',
                    subjectName: 'ENGLISH',
                    papers: [{ id: 'p_g10_eng_1', name: 'Language & Literature', maxScore: 100 }]
                },
                {
                    id: 'g10_math',
                    subjectId: 'sub_121',
                    subjectCode: '121',
                    subjectName: 'MATHS',
                    papers: [{ id: 'p_g10_math_1', name: 'Core Mathematics', maxScore: 100 }]
                }
            ]
        }
    ], []);

    const [classConfigs, setClassConfigs] = useState<ClassExamConfig[]>(initialClassConfigs);

    // Modal state for adding a new paper
    const [isAddPaperModalOpen, setIsAddPaperModalOpen] = useState(false);
    const [modalSelectedSubjectId, setModalSelectedSubjectId] = useState('');
    const [modalPaperName, setModalPaperName] = useState('Main paper');
    const [modalMaxScore, setModalMaxScore] = useState<number>(100);

    // 2. Per-Class Teachers Comments State matching screenshot
    const initialClassComments: ClassTeacherCommentsConfig[] = useMemo(() => [
        {
            classId: 'form_3',
            className: 'Form 3',
            rules: [
                { id: 'r1', grade: 'A', classTeacherComment: 'Excellent work, keep it up to maintain these encouraging results.', schoolHeadComment: 'Congratulations, you have scored an excellent mean grade. Keep up and work even harder.' },
                { id: 'r2', grade: 'A-', classTeacherComment: 'Excellent work, keep it up so as to improve further.', schoolHeadComment: 'Very good performance but aim even higher. You have the potential.' },
                { id: 'r3', grade: 'B', classTeacherComment: 'Good work but aim higher. You have potential.', schoolHeadComment: 'Good, but aim higher. You are capable of doing much better.' },
                { id: 'r4', grade: 'B-', classTeacherComment: 'Good work but aim higher. You have potential.', schoolHeadComment: 'Good, but aim higher. You are capable of doing much better.' },
                { id: 'r5', grade: 'B+', classTeacherComment: 'Good work but aim higher for better grades.', schoolHeadComment: 'Good work but aim higher. You have potential.' },
                { id: 'r6', grade: 'C', classTeacherComment: 'Average but work harder, you can do much better than this.', schoolHeadComment: 'Average, but work harder, there is a lot of room for improvement.' },
                { id: 'r7', grade: 'C+', classTeacherComment: 'Fair performance, double your efforts to get to the top band.', schoolHeadComment: 'Fair performance, stay focused and aim for grade B and above.' },
                { id: 'r8', grade: 'C-', classTeacherComment: 'Passable work, put more effort into your weak subjects.', schoolHeadComment: 'Passable effort. You can achieve better results with consistency.' },
                { id: 'r9', grade: 'D+', classTeacherComment: 'Weak performance, seek help from subject teachers immediately.', schoolHeadComment: 'Weak performance. Regular study and remedial assistance recommended.' },
                { id: 'r10', grade: 'D', classTeacherComment: 'Poor performance, work harder in daily assignments.', schoolHeadComment: 'Poor performance. Parent consultation strongly advised.' },
                { id: 'r11', grade: 'D-', classTeacherComment: 'Very poor performance, urgent academic intervention required.', schoolHeadComment: 'Very poor performance. Must follow remedial revision program.' },
                { id: 'r12', grade: 'E', classTeacherComment: 'Unsatisfactory result, total commitment to studies is mandated.', schoolHeadComment: 'Unsatisfactory result. Critical academic concern.' }
            ]
        },
        {
            classId: 'form_4',
            className: 'Form 4',
            rules: [
                { id: 'r4_1', grade: 'A', classTeacherComment: 'Outstanding candidate performance. Keep maintaining top position.', schoolHeadComment: 'Superb result! Maintain this high standard for your national exams.' },
                { id: 'r4_2', grade: 'A-', classTeacherComment: 'Very strong candidate. Great potential for Grade A.', schoolHeadComment: 'Excellent effort. Focus on weak subject areas.' },
                { id: 'r4_3', grade: 'B+', classTeacherComment: 'Good candidate result. Double effort for distinctions.', schoolHeadComment: 'Very good performance. Aim higher in final papers.' },
                { id: 'r4_4', grade: 'B', classTeacherComment: 'Solid performance. Focus on consistent revision.', schoolHeadComment: 'Good effort. Keep revising core syllabus.' },
                { id: 'r4_5', grade: 'B-', classTeacherComment: 'Satisfactory result. Work harder on practical subjects.', schoolHeadComment: 'Good result, but room for improvement exists.' },
                { id: 'r4_6', grade: 'C+', classTeacherComment: 'Average performance. Double your study hours.', schoolHeadComment: 'Average result. Consistent practice required.' },
                { id: 'r4_7', grade: 'C', classTeacherComment: 'Fair result. Requires extra tuition in sciences.', schoolHeadComment: 'Passable performance. Work harder.' },
                { id: 'r4_8', grade: 'C-', classTeacherComment: 'Below average candidate grade.', schoolHeadComment: 'Needs close academic monitoring.' },
                { id: 'r4_9', grade: 'D+', classTeacherComment: 'Weak performance. Mandatory remedial classes.', schoolHeadComment: 'Weak result. Urgent intervention required.' },
                { id: 'r4_10', grade: 'D', classTeacherComment: 'Poor performance in mock exams.', schoolHeadComment: 'Parent consultation required.' },
                { id: 'r4_11', grade: 'D-', classTeacherComment: 'Very weak result.', schoolHeadComment: 'Requires intensive revision plan.' },
                { id: 'r4_12', grade: 'E', classTeacherComment: 'Unsatisfactory grade.', schoolHeadComment: 'Critical academic concern.' }
            ]
        },
        {
            classId: 'grade_10',
            className: 'Grade 10',
            rules: [
                { id: 'rg10_1', grade: 'A', classTeacherComment: 'Exceptional performance across all CBC learning areas.', schoolHeadComment: 'Outstanding achievement! Keep up the brilliant effort.' },
                { id: 'rg10_2', grade: 'A-', classTeacherComment: 'High competence level demonstrated.', schoolHeadComment: 'Very good performance. Aim for top honors.' },
                { id: 'rg10_3', grade: 'B+', classTeacherComment: 'Good understanding of core concepts.', schoolHeadComment: 'Good work, keep improving.' },
                { id: 'rg10_4', grade: 'B', classTeacherComment: 'Meets expectations consistently.', schoolHeadComment: 'Good effort overall.' },
                { id: 'rg10_5', grade: 'C+', classTeacherComment: 'Approaching expectation. More practice needed.', schoolHeadComment: 'Fair effort, stay focused.' },
                { id: 'rg10_6', grade: 'C', classTeacherComment: 'Average competence level.', schoolHeadComment: 'Needs more dedication.' },
                { id: 'rg10_7', grade: 'D+', classTeacherComment: 'Below expectation. Remediation advised.', schoolHeadComment: 'Requires additional support.' },
                { id: 'rg10_8', grade: 'D', classTeacherComment: 'Needs significant improvement.', schoolHeadComment: 'Parent conference recommended.' },
                { id: 'rg10_9', grade: 'E', classTeacherComment: 'Below minimum benchmark level.', schoolHeadComment: 'Urgent remedial plan mandated.' }
            ]
        }
    ], []);

    const [classComments, setClassComments] = useState<ClassTeacherCommentsConfig[]>(initialClassComments);

    // 3. Per-Class Students Ranking State matching screenshot
    const initialClassRankingConfigs: ClassRankingConfig[] = useMemo(() => [
        { classId: 'form_3', className: 'Form 3', enabled: true, criteria: 'Points', rankingSubjectsCount: 7 },
        { classId: 'form_4', className: 'Form 4', enabled: true, criteria: 'Points', rankingSubjectsCount: 7 },
        { classId: 'grade_10', className: 'Grade 10', enabled: true, criteria: 'Points', rankingSubjectsCount: 7 }
    ], []);

    const [classRankingConfigs, setClassRankingConfigs] = useState<ClassRankingConfig[]>(initialClassRankingConfigs);

    // 4. Others Settings State matching screenshot
    const [othersSettings, setOthersSettings] = useState<OthersExamSettings>({
        inviteCode: '6ZH7L',
        meanPointsDecimal: 4,
        meanScoreDecimal: 2,
        meanMarksDecimal: 2,
        absentGrade: 'X',
        irregularityGrade: 'Y',
        incompleteGrade: 'Z',
        includeNonRankingInAnalysis: false
    });

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Sync saved configuration from institution
    useEffect(() => {
        if (currentInstitution) {
            const savedClassConfigs = (currentInstitution as any)?.classExamConfigs;
            if (savedClassConfigs && Array.isArray(savedClassConfigs) && savedClassConfigs.length > 0) {
                setClassConfigs(savedClassConfigs);
            }

            const savedCommentsConfig = (currentInstitution as any)?.classTeacherCommentsConfig;
            if (savedCommentsConfig && Array.isArray(savedCommentsConfig) && savedCommentsConfig.length > 0) {
                setClassComments(savedCommentsConfig);
            }

            const savedClassRankingConfigs = (currentInstitution as any)?.classRankingConfigs;
            if (savedClassRankingConfigs && Array.isArray(savedClassRankingConfigs) && savedClassRankingConfigs.length > 0) {
                setClassRankingConfigs(savedClassRankingConfigs);
            }

            const savedOthersSettings = (currentInstitution as any)?.othersExamSettings;
            if (savedOthersSettings) {
                setOthersSettings({
                    inviteCode: savedOthersSettings.inviteCode || '6ZH7L',
                    meanPointsDecimal: savedOthersSettings.meanPointsDecimal ?? 4,
                    meanScoreDecimal: savedOthersSettings.meanScoreDecimal ?? 2,
                    meanMarksDecimal: savedOthersSettings.meanMarksDecimal ?? 2,
                    absentGrade: savedOthersSettings.absentGrade || 'X',
                    irregularityGrade: savedOthersSettings.irregularityGrade || 'Y',
                    incompleteGrade: savedOthersSettings.incompleteGrade || 'Z',
                    includeNonRankingInAnalysis: !!savedOthersSettings.includeNonRankingInAnalysis
                });
            }
        }
    }, [currentInstitution]);

    // Make sure all classes in classList have a ranking row
    const rankingRows = useMemo(() => {
        return classList.map(c => {
            const existing = classRankingConfigs.find(r => r.classId === c.id);
            if (existing) return existing;
            return {
                classId: c.id,
                className: c.name,
                enabled: true,
                criteria: 'Points' as const,
                rankingSubjectsCount: 7
            };
        });
    }, [classList, classRankingConfigs]);

    const instId = currentInstitution?.id || 'default_inst';

    // Persistent Class Allocations Store (configured in Manage Subjects per Class Stream)
    const [classAllocationsStore, setClassAllocationsStore] = useState<Record<string, string[]>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_class_subject_allocations_${instId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch(e) {}
        return (currentInstitution as any)?.classSubjectAllocations || {};
    });

    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<any>('class_subject_allocations', currentInstitution.id)
                .then(records => {
                    const match = (records || []).find(r => r.id === `alloc_${currentInstitution.id}` || r.institutionId === currentInstitution.id);
                    if (match && match.allocations) {
                        setClassAllocationsStore(prev => {
                            const merged = { ...match.allocations, ...prev };
                            try {
                                localStorage.setItem(`eduai_class_subject_allocations_${currentInstitution.id}`, JSON.stringify(merged));
                            } catch(e) {}
                            return merged;
                        });
                    }
                })
                .catch(() => {});
        }
    }, [currentInstitution]);

    // Helper to get applicable subjects for any given class name
    const getApplicableSubjectsForClass = useCallback((clsName: string) => {
        if (!clsName) return [];
        const cClean = clsName.trim();
        const cLower = cClean.toLowerCase();

        // 1. Persistent Per-Class Allocations Store (from Manage Subjects per Class Stream)
        const storedAssignedIds = classAllocationsStore[cClean] ?? classAllocationsStore[cLower];
        if (Array.isArray(storedAssignedIds)) {
            if (storedAssignedIds.length === 0) return [];
            const set = new Set(storedAssignedIds.map(id => String(id).toLowerCase().trim()));
            return subjects.filter(s => {
                const sId = (s.id || '').toLowerCase().trim();
                const sName = (s.name || '').toLowerCase().trim();
                const sCode = (s.code || '').toLowerCase().trim();
                return set.has(sId) || set.has(sName) || (sCode && set.has(sCode));
            });
        }

        // 2. Explicit targetClasses / assignedClasses array on subject
        if (subjects && subjects.length > 0) {
            const explicitMatch = subjects.filter(s => {
                const targetCls = (s as any).targetClasses || (s as any).assignedClasses || (s as any).classes;
                if (Array.isArray(targetCls)) {
                    return targetCls.some((tc: string) => {
                        const cleanTC = (tc || '').toLowerCase().trim();
                        return cleanTC === cLower || cLower.startsWith(cleanTC) || cleanTC.startsWith(cLower);
                    });
                }
                return false;
            });
            if (explicitMatch.length > 0) return explicitMatch;
        }

        // 3. DB Allocations fallback
        const dbSet = new Set(dbAllocations.filter(a => (a.className || '').toLowerCase().trim() === cLower).map(a => (a.subjectName || '').toLowerCase().trim()));
        if (dbSet.size > 0) {
            const matched = subjects.filter(s => dbSet.has((s.name || '').toLowerCase().trim()));
            if (matched.length > 0) return matched;
        }

        // 4. Standard grade-level applicability rules fallback
        if (subjects && subjects.length > 0) {
            const applicable = subjects.filter(s => isSubjectAssignedToClassStream(s, clsName, courses));
            if (applicable.length > 0) return applicable;
        }

        return [];
    }, [subjects, courses, dbAllocations, classAllocationsStore]);

    // Active class configuration helper for Exam Papers
    // If no saved config exists for the active class, auto-populate from allocated subjects
    const activeClassConfig = useMemo(() => {
        let found = classConfigs.find(c => c.classId === activeClassId);
        if (!found) {
            const activeClassObj = classList.find(c => c.id === activeClassId);
            const className = activeClassObj?.name || '';

            // Auto-populate subjects from those allocated to this class
            const seenNames = new Set<string>();
            const autoSubjects: ClassSubjectConfig[] = [];

            const applicableForClass = getApplicableSubjectsForClass(className);
            applicableForClass.forEach((s: Subject) => {
                const nameKey = (s.name || '').toLowerCase().trim();
                if (nameKey && !seenNames.has(nameKey)) {
                    seenNames.add(nameKey);
                    autoSubjects.push({
                        id: `auto_${s.id}_${activeClassId}`,
                        subjectId: s.id,
                        subjectCode: s.code || s.name.substring(0, 4).toUpperCase(),
                        subjectName: s.name.toUpperCase(),
                        papers: [{ id: `auto_paper_${s.id}_${activeClassId}`, name: 'Main paper', maxScore: 100 }]
                    });
                }
            });

            found = {
                classId: activeClassId,
                className: activeClassObj?.name || 'Class',
                subjects: autoSubjects
            };
        }
        return found;
    }, [classConfigs, activeClassId, classList, getApplicableSubjectsForClass]);

    // Active class comments helper for Teacher Comments
    const activeClassComments = useMemo(() => {
        let found = classComments.find(c => c.classId === activeCommentClassId);
        if (!found) {
            const activeClassObj = classList.find(c => c.id === activeCommentClassId);
            found = {
                classId: activeCommentClassId,
                className: activeClassObj?.name || 'Class',
                rules: []
            };
        }
        return found;
    }, [classComments, activeCommentClassId, classList]);

    // Helper to get total paper count for a class
    // Falls back to counting auto-populated subjects (1 paper each) if no saved config exists
    const getClassPaperCount = (cId: string): number => {
        const conf = classConfigs.find(c => c.classId === cId);
        if (conf) return conf.subjects.reduce((sum, s) => sum + s.papers.length, 0);

        const classObj = classList.find(c => c.id === cId);
        if (!classObj) return 0;
        const applicable = getApplicableSubjectsForClass(classObj.name);
        return applicable.length;
    };

    // Helper to get total teacher comment rules count for a class
    const getClassCommentCount = (cId: string): number => {
        const conf = classComments.find(c => c.classId === cId);
        if (!conf) return 0;
        return conf.rules.length;
    };

    // Save handler
    const handleSaveAllExamConfigs = async () => {
        if (!currentInstitution) {
            alert('No institution context found. Please refresh and try again.');
            return;
        }
        setSaveStatus('saving');
        try {
            // Update local memory reference immediately
            (currentInstitution as any).classExamConfigs = classConfigs;
            (currentInstitution as any).class_exam_configs = classConfigs;
            (currentInstitution as any).classTeacherCommentsConfig = classComments;
            (currentInstitution as any).class_teacher_comments_config = classComments;
            (currentInstitution as any).classRankingConfigs = classRankingConfigs;
            (currentInstitution as any).class_ranking_configs = classRankingConfigs;
            (currentInstitution as any).othersExamSettings = othersSettings;
            (currentInstitution as any).others_exam_settings = othersSettings;

            const payloadData = {
                classExamConfigs: classConfigs,
                class_exam_configs: classConfigs,
                classTeacherCommentsConfig: classComments,
                class_teacher_comments_config: classComments,
                classRankingConfigs: classRankingConfigs,
                class_ranking_configs: classRankingConfigs,
                othersExamSettings: othersSettings,
                others_exam_settings: othersSettings
            };

            if (onUpdateInstitution) {
                await onUpdateInstitution(currentInstitution.id, payloadData as any);
            } else {
                await apiService.saveInstitution({
                    ...currentInstitution,
                    ...payloadData
                } as any);
            }

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch (err) {
            console.error('[ExamConfigManager] Error saving exam configuration:', err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    // Update Paper Name or Score for active class
    const handleUpdatePaperDetail = (subjectId: string, paperId: string, field: 'name' | 'maxScore', value: any) => {
        setClassConfigs(prev => {
            return prev.map(c => {
                if (c.classId === activeClassId) {
                    return {
                        ...c,
                        subjects: c.subjects.map(s => {
                            if (s.subjectId === subjectId || s.id === subjectId) {
                                return {
                                    ...s,
                                    papers: s.papers.map(p => p.id === paperId ? { ...p, [field]: value } : p)
                                };
                            }
                            return s;
                        })
                    };
                }
                return c;
            });
        });
    };

    // Remove a paper from a subject in active class
    const handleRemovePaperFromClass = (subjectId: string, paperId: string) => {
        setClassConfigs(prev => {
            return prev.map(c => {
                if (c.classId === activeClassId) {
                    const nextSubjects = c.subjects.map(s => {
                        if (s.subjectId === subjectId || s.id === subjectId) {
                            return {
                                ...s,
                                papers: s.papers.filter(p => p.id !== paperId)
                            };
                        }
                        return s;
                    }).filter(s => s.papers.length > 0);

                    return { ...c, subjects: nextSubjects };
                }
                return c;
            });
        });
    };

    // Add a paper to a subject in active class
    const handleAddPaperToActiveClass = () => {
        if (!modalSelectedSubjectId) {
            alert('Please select a subject.');
            return;
        }

        const subjObj = subjects.find(s => s.id === modalSelectedSubjectId);
        const subjName = subjObj ? subjObj.name.toUpperCase() : 'SUBJECT';
        const subjCode = subjObj ? (subjObj.code || '100') : '100';

        setClassConfigs(prev => {
            const classIdx = prev.findIndex(c => c.classId === activeClassId);
            const activeClassObj = classList.find(c => c.id === activeClassId);
            const className = activeClassObj?.name || 'Class';

            const newPaperObj: ClassSubjectPaper = {
                id: `p_${Date.now()}`,
                name: modalPaperName.trim() || 'Paper',
                maxScore: modalMaxScore || 100
            };

            if (classIdx >= 0) {
                const updatedClasses = [...prev];
                const currentClassConfig = updatedClasses[classIdx];
                const subjIdx = currentClassConfig.subjects.findIndex(s => s.subjectId === modalSelectedSubjectId);

                if (subjIdx >= 0) {
                    const updatedSubjects = [...currentClassConfig.subjects];
                    updatedSubjects[subjIdx] = {
                        ...updatedSubjects[subjIdx],
                        papers: [...updatedSubjects[subjIdx].papers, newPaperObj]
                    };
                    updatedClasses[classIdx] = { ...currentClassConfig, subjects: updatedSubjects };
                } else {
                    const newSubjConfig: ClassSubjectConfig = {
                        id: `cs_${Date.now()}`,
                        subjectId: modalSelectedSubjectId,
                        subjectCode: subjCode,
                        subjectName: subjName,
                        papers: [newPaperObj]
                    };
                    updatedClasses[classIdx] = {
                        ...currentClassConfig,
                        subjects: [...currentClassConfig.subjects, newSubjConfig]
                    };
                }
                return updatedClasses;
            } else {
                const newClassConfig: ClassExamConfig = {
                    classId: activeClassId,
                    className: className,
                    subjects: [{
                        id: `cs_${Date.now()}`,
                        subjectId: modalSelectedSubjectId,
                        subjectCode: subjCode,
                        subjectName: subjName,
                        papers: [newPaperObj]
                    }]
                };
                return [...prev, newClassConfig];
            }
        });

        setIsAddPaperModalOpen(false);
        setModalPaperName('Main paper');
        setModalMaxScore(100);
        setModalSelectedSubjectId('');
    };

    // Teacher comment row change
    const handleUpdateTeacherComment = (ruleId: string, field: 'grade' | 'classTeacherComment' | 'schoolHeadComment', value: string) => {
        setClassComments(prev => {
            return prev.map(c => {
                if (c.classId === activeCommentClassId) {
                    return {
                        ...c,
                        rules: c.rules.map(r => r.id === ruleId ? { ...r, [field]: value } : r)
                    };
                }
                return c;
            });
        });
    };

    // Add teacher comment rule to active class
    const handleAddTeacherCommentRule = () => {
        const newRule: ClassTeacherCommentRule = {
            id: `r_${Date.now()}`,
            grade: 'B',
            classTeacherComment: 'Good performance, keep pushing for higher grades.',
            schoolHeadComment: 'Good result, aim higher.'
        };

        setClassComments(prev => {
            const classIdx = prev.findIndex(c => c.classId === activeCommentClassId);
            const activeClassObj = classList.find(c => c.id === activeCommentClassId);
            const className = activeClassObj?.name || 'Class';

            if (classIdx >= 0) {
                const updated = [...prev];
                updated[classIdx] = {
                    ...updated[classIdx],
                    rules: [...updated[classIdx].rules, newRule]
                };
                return updated;
            } else {
                return [...prev, {
                    classId: activeCommentClassId,
                    className: className,
                    rules: [newRule]
                }];
            }
        });
    };

    // Delete teacher comment rule from active class
    const handleDeleteTeacherCommentRule = (ruleId: string) => {
        setClassComments(prev => {
            return prev.map(c => {
                if (c.classId === activeCommentClassId) {
                    return {
                        ...c,
                        rules: c.rules.filter(r => r.id !== ruleId)
                    };
                }
                return c;
            });
        });
    };

    // Auto-generate Class Teacher and School Head remarks based on Grading System
    const handleAutoGenerateTeacherComments = (forAllClasses = false) => {
        const DEFAULT_REMARKS: Record<string, { teacher: string; head: string }> = {
            'A': {
                teacher: 'Excellent performance! Consistently displays exceptional academic proficiency and dedication.',
                head: 'An outstanding result. Maintain this exemplary standard of academic excellence.'
            },
            'A-': {
                teacher: 'Very impressive results. Demonstrates strong understanding and commitment to learning.',
                head: 'Commendable performance. Keep striving for the top position.'
            },
            'B+': {
                teacher: 'Good performance. Shows great potential and active participation in class.',
                head: 'Very good result. Focus on target areas to achieve an A grade.'
            },
            'B': {
                teacher: 'Good effort demonstrated. Meets expected competencies across most learning areas.',
                head: 'Satisfactory performance. Consistent effort will yield even higher results.'
            },
            'B-': {
                teacher: 'Fair performance with room for improvement. Encouraged to increase revision hours.',
                head: 'Steady progress shown. Put in extra effort to reach high achievement levels.'
            },
            'C+': {
                teacher: 'Average performance. Needs to show more consistency and concentration.',
                head: 'Average work. Additional revision and focus required next term.'
            },
            'C': {
                teacher: 'Fair result. Approaching expected standards; requires more practice and focus.',
                head: 'Fair attempt. Must put in more effort to achieve higher proficiency.'
            },
            'C-': {
                teacher: 'Below average. Must dedicate more time to studies and seek teacher guidance.',
                head: 'Fair result. Needs closer supervision and academic support.'
            },
            'D+': {
                teacher: 'Weak performance. Requires serious academic intervention and consistent effort.',
                head: 'Below expected standard. Needs immediate academic attention.'
            },
            'D': {
                teacher: 'Unsatisfactory performance. Falls below expectations; extra tuition recommended.',
                head: 'Poor performance. Requires intensive remedial support and regular monitoring.'
            },
            'D-': {
                teacher: 'Very weak result. Serious effort and remedial assistance required immediately.',
                head: 'Unsatisfactory. Parent/teacher consultation required to address weakness.'
            },
            'E': {
                teacher: 'Critical condition. Needs total dedication, remedial lessons, and close monitoring.',
                head: 'Unacceptable performance. Immediate academic intervention required.'
            },
            'EE': {
                teacher: 'Exceeding Expectations. Demonstrates exceptional mastery of core competencies.',
                head: 'Outstanding achievement. Keep up the high level of competency.'
            },
            'ME': {
                teacher: 'Meeting Expectations. Shows clear understanding of required skills and concepts.',
                head: 'Good progress. Continue working hard to achieve mastery.'
            },
            'AE': {
                teacher: 'Approaching Expectations. Basic understanding shown; needs extra practice.',
                head: 'Needs encouragement and additional support to reach expectations.'
            },
            'BE': {
                teacher: 'Below Expectations. Needs targeted remedial support and continuous guidance.',
                head: 'Requires urgent intervention and structured learning assistance.'
            }
        };

        const treeNodes = (currentInstitution as any)?.treeGradingNodes || (currentInstitution as any)?.tree_grading_nodes;
        const targetClasses = forAllClasses ? classList : classList.filter(c => c.id === activeCommentClassId);

        if (targetClasses.length === 0) return;

        setClassComments(prev => {
            const updated = [...prev];

            targetClasses.forEach((cObj) => {
                const cId = cObj.id;
                const cName = cObj.name;
                const classKey = `class_${cName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_overall`;
                
                let gradeList: Array<{ grade: string; comment?: string }> = [];
                
                if (treeNodes && treeNodes[classKey]?.definitions?.length > 0) {
                    gradeList = treeNodes[classKey].definitions;
                } else if (treeNodes && treeNodes['root_main']?.definitions?.length > 0) {
                    gradeList = treeNodes['root_main'].definitions;
                } else {
                    const fallbackGrades = isPrimarySchool
                        ? ['EE', 'ME', 'AE', 'BE']
                        : ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'];
                    gradeList = fallbackGrades.map(g => ({ grade: g }));
                }

                const rules: ClassTeacherCommentRule[] = gradeList.map((gObj, gIdx) => {
                    const gCode = (gObj.grade || 'B').trim();
                    const pre = DEFAULT_REMARKS[gCode] || DEFAULT_REMARKS['B'];
                    const customComment = gObj.comment && !['EXCELLENT', 'VERY GOOD', 'GOOD', 'AVERAGE', 'PUT MORE EFFORT', 'POOR', 'VERY POOR'].includes(gObj.comment.toUpperCase())
                        ? `${gObj.comment}. `
                        : '';

                    return {
                        id: `r_auto_${cId}_${gIdx}_${Date.now()}`,
                        grade: gCode,
                        classTeacherComment: `${customComment}${pre.teacher}`,
                        schoolHeadComment: `${customComment}${pre.head}`
                    };
                });

                const existingIdx = updated.findIndex(c => c.classId === cId);
                if (existingIdx >= 0) {
                    updated[existingIdx] = {
                        ...updated[existingIdx],
                        className: cName,
                        rules: rules
                    };
                } else {
                    updated.push({
                        classId: cId,
                        className: cName,
                        rules: rules
                    });
                }
            });

            return updated;
        });
    };

    // Available grades for active comment class
    const availableGradesForActiveCommentClass = useMemo(() => {
        const treeNodes = (currentInstitution as any)?.treeGradingNodes || (currentInstitution as any)?.tree_grading_nodes;
        const activeClassObj = classList.find(c => c.id === activeCommentClassId);
        const cName = activeClassObj?.name || '';
        const classKey = `class_${cName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_overall`;
        
        if (treeNodes && treeNodes[classKey]?.definitions?.length > 0) {
            return treeNodes[classKey].definitions.map((g: any) => g.grade);
        }
        if (treeNodes && treeNodes['root_main']?.definitions?.length > 0) {
            return treeNodes['root_main'].definitions.map((g: any) => g.grade);
        }
        return isPrimarySchool
            ? ['EE', 'ME', 'AE', 'BE']
            : ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'];
    }, [currentInstitution, activeCommentClassId, classList, isPrimarySchool]);

    // Update Ranking Rule for a Class
    const handleUpdateRankingRule = (cId: string, cName: string, field: keyof ClassRankingConfig, value: any) => {
        setClassRankingConfigs(prev => {
            const idx = prev.findIndex(r => r.classId === cId);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], [field]: value };
                return updated;
            } else {
                const newRow: ClassRankingConfig = {
                    classId: cId,
                    className: cName,
                    enabled: true,
                    criteria: 'Points',
                    rankingSubjectsCount: 7,
                    [field]: value
                };
                return [...prev, newRow];
            }
        });
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-6xl">
            {/* Top Navigation Tabs matching screenshot */}
            <div className="bg-white dark:bg-slate-900 rounded-t-2xl border-b border-slate-200 dark:border-slate-800 px-6 pt-4">
                <nav className="flex space-x-8 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveSubTab('exam_papers')}
                        className={`pb-4 px-1 border-b-2 font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                            activeSubTab === 'exam_papers' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Exam Papers
                    </button>
                    <button
                        onClick={() => setActiveSubTab('grading_system')}
                        className={`pb-4 px-1 border-b-2 font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                            activeSubTab === 'grading_system' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Grading Systems
                    </button>
                    <button
                        onClick={() => setActiveSubTab('teachers_comments')}
                        className={`pb-4 px-1 border-b-2 font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                            activeSubTab === 'teachers_comments' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Teacher Comments
                    </button>
                    <button
                        onClick={() => setActiveSubTab('students_ranking')}
                        className={`pb-4 px-1 border-b-2 font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                            activeSubTab === 'students_ranking' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Students Ranking
                    </button>
                    <button
                        onClick={() => setActiveSubTab('others')}
                        className={`pb-4 px-1 border-b-2 font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                            activeSubTab === 'others' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Others
                    </button>
                </nav>
            </div>

            {/* TAB 1: EXAM PAPERS (MATCHING USER SCREENSHOT EXACTLY) */}
            {activeSubTab === 'exam_papers' && (
                <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 animate-fade-in shadow-sm">
                    {/* Description Text */}
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        By default, students sit only one paper per subject during an exam. However, some subjects may require students to take several papers e.g Mathematics Paper 1 & Paper 2, English Language & Composition etc..
                    </p>

                    {/* Main Layout Grid: Left Sidebar for Classes, Right Panel for Papers */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                        {/* Left Column: Classes Sidebar */}
                        <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                Classes / Year Groups
                            </div>
                            <div className="divide-y divide-slate-200/60 dark:divide-slate-800">
                                {classList.map(c => {
                                    const isSelected = activeClassId === c.id;
                                    const pCount = getClassPaperCount(c.id);
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setActiveClassId(c.id)}
                                            className={`w-full text-left px-4 py-3.5 text-xs font-bold transition-all flex items-center justify-between ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white font-black shadow-md'
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <span>{c.name}</span>
                                            <span className={`text-[11px] font-medium ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                                                &#123;{pCount}&#125;
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right Panel: Selected Class Papers Config */}
                        <div className="md:col-span-3 space-y-6">
                            {/* Section Header with Add New Paper Button */}
                            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="font-black text-sm uppercase text-slate-900 dark:text-white tracking-wider">
                                    {activeClassConfig.className.toUpperCase()} PAPERS
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (subjects && subjects.length > 0) {
                                            setModalSelectedSubjectId(subjects[0].id);
                                        }
                                        setIsAddPaperModalOpen(true);
                                    }}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
                                >
                                    <PlusIcon className="w-3.5 h-3.5" /> Add new paper
                                </button>
                            </div>

                            {/* Subjects & Papers Cards List matching screenshot */}
                            <div className="space-y-6">
                                {activeClassConfig.subjects.map((subj, sIdx) => (
                                    <div key={subj.id || sIdx} className="bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
                                        <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">
                                            {sIdx + 1}. {subj.subjectName} - {subj.subjectCode}
                                        </h4>

                                        <div className="space-y-4">
                                            {subj.papers.map((paper, pIdx) => (
                                                <div key={paper.id || pIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    {/* Name Input */}
                                                    <div className="sm:col-span-7">
                                                        <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                                                            Name
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={paper.name}
                                                            onChange={e => handleUpdatePaperDetail(subj.subjectId || subj.id, paper.id, 'name', e.target.value)}
                                                            className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                                            placeholder="Language / Main paper"
                                                        />
                                                    </div>

                                                    {/* Maximum Score Input */}
                                                    <div className="sm:col-span-4">
                                                        <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                                                            Maximum Score
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={paper.maxScore}
                                                            onChange={e => handleUpdatePaperDetail(subj.subjectId || subj.id, paper.id, 'maxScore', parseInt(e.target.value) || 100)}
                                                            className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                                        />
                                                    </div>

                                                    {/* Delete Icon Button */}
                                                    <div className="sm:col-span-1 flex justify-center pb-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemovePaperFromClass(subj.subjectId || subj.id, paper.id)}
                                                            className="p-2 text-blue-600 hover:text-red-600 transition-colors"
                                                            title="Delete paper"
                                                        >
                                                            <XIcon className="w-5 h-5 stroke-[2.5]" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {activeClassConfig.subjects.length === 0 && (
                                    <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 space-y-2">
                                        <DocumentTextIcon className="w-10 h-10 mx-auto opacity-30" />
                                        <p className="text-xs font-bold uppercase tracking-wider">No exam papers configured for {activeClassConfig.className}</p>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddPaperModalOpen(true)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
                                        >
                                            Add First Exam Paper
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={handleSaveAllExamConfigs}
                                    disabled={saveStatus === 'saving'}
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all disabled:opacity-50"
                                >
                                    {saveStatus === 'saving' ? 'Saving Exam Papers...' : saveStatus === 'saved' ? '✓ Exam Papers Saved!' : saveStatus === 'error' ? '✗ Save Failed — Retry' : 'Save Exam Papers Config'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: GRADING SYSTEMS */}
            {activeSubTab === 'grading_system' && (
                <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 animate-fade-in shadow-sm">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Help us determine what scores or marks constitute a grade A, B+ or C- in your school. The system defaults to overall grading if subject-specific grading is not specified.
                    </p>
                    <GradingSystemManager currentInstitution={currentInstitution} onUpdateInstitution={onUpdateInstitution} courses={courses} academicLevels={academicLevels} subjects={subjects} />
                </div>
            )}

            {/* TAB 3: TEACHER COMMENTS (MATCHING SCREENSHOT EXACTLY) */}
            {activeSubTab === 'teachers_comments' && (
                <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 animate-fade-in shadow-sm">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        <span className="bg-blue-600 text-white font-bold px-1 rounded">Teacher comments</span> allow us to automate remarks made by the class teacher and the school's head as shown in the report card and results slips.
                    </p>

                    {/* Grid Layout: Left Sidebar for CHOOSE YEAR GROUP, Right Table for Comments */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                        {/* Left Column: CHOOSE YEAR GROUP Sidebar */}
                        <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                CHOOSE YEAR GROUP
                            </div>
                            <div className="divide-y divide-slate-200/60 dark:divide-slate-800">
                                {classList.map(c => {
                                    const isSelected = activeCommentClassId === c.id;
                                    const cCount = getClassCommentCount(c.id);
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setActiveCommentClassId(c.id)}
                                            className={`w-full text-left px-4 py-3.5 text-xs font-bold transition-all flex items-center justify-between ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white font-black shadow-md'
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <span>{c.name}</span>
                                            <span className={`text-[11px] font-medium ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                                                &#40;{cCount}&#41;
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right Panel Table */}
                        <div className="md:col-span-3 space-y-4">
                            <div className="flex flex-wrap justify-between items-center gap-2 pb-2">
                                <h3 className="font-black text-xs uppercase text-slate-900 dark:text-white tracking-wider">
                                    {activeClassComments.className.toUpperCase()} REMARKS SETUP
                                </h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => handleAutoGenerateTeacherComments(false)}
                                        className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1.5 cursor-pointer"
                                        title="Auto-populate remarks for this class based on the Grading System"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" /> Auto-Generate (Active Class)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAutoGenerateTeacherComments(true)}
                                        className="px-3.5 py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold hover:bg-purple-100 transition-all flex items-center gap-1.5 cursor-pointer"
                                        title="Auto-populate remarks for all classes based on the Grading System"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" /> Auto-Generate (All Classes)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAddTeacherCommentRule}
                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" /> Add New Comment
                                    </button>
                                </div>
                            </div>

                            {/* Table Matching Screenshot */}
                            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold w-24">Grade</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold">Class Teacher's Comment</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold">School Head's Comment</th>
                                            <th className="px-4 py-3 text-center w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {activeClassComments.rules.map(rule => (
                                            <tr key={rule.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                                {/* Grade Select Dropdown matching screenshot */}
                                                <td className="px-4 py-3 align-top">
                                                    <div className="relative">
                                                        <select
                                                            value={rule.grade}
                                                            onChange={e => handleUpdateTeacherComment(rule.id, 'grade', e.target.value)}
                                                            className="w-full h-10 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            {(availableGradesForActiveCommentClass.includes(rule.grade) ? availableGradesForActiveCommentClass : [rule.grade, ...availableGradesForActiveCommentClass]).map((g: string) => (
                                                                <option key={g} value={g}>{g}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                                                    </div>
                                                </td>

                                                {/* Class Teacher's Comment Input */}
                                                <td className="px-6 py-3 align-top">
                                                    <textarea
                                                        rows={2}
                                                        value={rule.classTeacherComment}
                                                        onChange={e => handleUpdateTeacherComment(rule.id, 'classTeacherComment', e.target.value)}
                                                        className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                                                        placeholder="Class teacher remark..."
                                                    />
                                                </td>

                                                {/* School Head's Comment Input */}
                                                <td className="px-6 py-3 align-top">
                                                    <textarea
                                                        rows={2}
                                                        value={rule.schoolHeadComment}
                                                        onChange={e => handleUpdateTeacherComment(rule.id, 'schoolHeadComment', e.target.value)}
                                                        className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                                                        placeholder="School head remark..."
                                                    />
                                                </td>

                                                {/* Delete Icon Button */}
                                                <td className="px-4 py-3 text-center align-top pt-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteTeacherCommentRule(rule.id)}
                                                        className="p-1.5 text-blue-600 hover:text-red-600 transition-colors"
                                                        title="Delete remark rule"
                                                    >
                                                        <XIcon className="w-4 h-4 stroke-[2.5]" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                        {activeClassComments.rules.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">
                                                    No comments configured for {activeClassComments.className}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={handleSaveAllExamConfigs}
                                    disabled={saveStatus === 'saving'}
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all disabled:opacity-50"
                                >
                                    {saveStatus === 'saving' ? 'Saving Comments...' : saveStatus === 'saved' ? '✓ Comments Saved!' : saveStatus === 'error' ? '✗ Save Failed — Retry' : 'Save Teacher Comments Config'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: STUDENTS RANKING (MATCHING SCREENSHOT EXACTLY) */}
            {activeSubTab === 'students_ranking' && (
                <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 animate-fade-in shadow-sm">
                    {/* Description matching screenshot */}
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Specify the criteria that the school uses to rank students by clicking the <ChevronDownIcon className="w-3.5 h-3.5 inline text-slate-700 dark:text-slate-300 stroke-[2.5]" /> arrow below. We support ranking by total marks, mean score or points. Also choose the number of subjects used to rank for each year group.
                    </p>

                    {/* Table View matching screenshot */}
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                        <table className="min-w-full divide-y divide-slate-200 dark:border-slate-800">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-3.5 text-left text-xs font-bold w-48">Year Group</th>
                                    <th className="px-6 py-3.5 text-left text-xs font-bold w-44">Ranking Enabled</th>
                                    <th className="px-6 py-3.5 text-left text-xs font-bold">Criteria</th>
                                    <th className="px-6 py-3.5 text-left text-xs font-bold">Ranking Subjects</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {rankingRows.map(row => (
                                    <tr key={row.classId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                        {/* Year Group Name */}
                                        <td className="px-6 py-4 font-bold text-xs text-slate-900 dark:text-white">
                                            {row.className}
                                        </td>

                                        {/* Ranking Enabled Checkbox */}
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={row.enabled}
                                                onChange={e => handleUpdateRankingRule(row.classId, row.className, 'enabled', e.target.checked)}
                                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </td>

                                        {/* Criteria Select Dropdown with Chevron */}
                                        <td className="px-6 py-4">
                                            <div className="relative max-w-xs">
                                                <select
                                                    value={row.criteria}
                                                    onChange={e => handleUpdateRankingRule(row.classId, row.className, 'criteria', e.target.value as any)}
                                                    className="w-full h-10 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="Points">Points</option>
                                                    <option value="Total Marks">Total Marks</option>
                                                    <option value="Mean Score">Mean Score</option>
                                                </select>
                                                <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                                            </div>
                                        </td>

                                        {/* Ranking Subjects Count Select Dropdown with Chevron */}
                                        <td className="px-6 py-4">
                                            <div className="relative max-w-xs">
                                                <select
                                                    value={row.rankingSubjectsCount}
                                                    onChange={e => handleUpdateRankingRule(row.classId, row.className, 'rankingSubjectsCount', parseInt(e.target.value) || 7)}
                                                    className="w-full h-10 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(num => (
                                                        <option key={num} value={num}>{num}</option>
                                                    ))}
                                                </select>
                                                <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom Right Save Changes Button matching screenshot */}
                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={handleSaveAllExamConfigs}
                            disabled={saveStatus === 'saving'}
                            className="px-8 py-3 bg-blue-400 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all disabled:opacity-50"
                        >
                            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Changes Saved!' : saveStatus === 'error' ? '✗ Save Failed — Retry' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 5: OTHERS (MATCHING SCREENSHOT EXACTLY) */}
            {activeSubTab === 'others' && (
                <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-8 animate-fade-in shadow-sm">
                    {/* SECTION 1: Inter-school invite code */}
                    <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Inter-school invite code</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
                            Inter-school exams allow multiple schools to test their students through one standardized exam. The system then generates exam analysis reports involving all participating students. Share the code below with schools you wish to conduct joint exams with.
                        </p>
                        <div className="pt-2 flex items-center gap-3">
                            <span className="text-xs font-medium text-slate-500">Your code is:</span>
                            <span className="font-mono text-sm font-bold text-slate-900 dark:text-white px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
                                {othersSettings.inviteCode}
                            </span>
                        </div>
                    </div>

                    {/* SECTION 2: Decimal Places */}
                    <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Decimal Places</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
                            Choose the number of decimal places used to round off figures in your exam analysis, broadsheet and other reports.
                        </p>

                        <div className="space-y-3 max-w-md">
                            {/* Mean points */}
                            <div className="flex justify-between items-center py-1">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Mean points:</span>
                                <div className="relative w-32">
                                    <select
                                        value={othersSettings.meanPointsDecimal}
                                        onChange={e => setOthersSettings(prev => ({ ...prev, meanPointsDecimal: parseInt(e.target.value) || 4 }))}
                                        className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {[0, 1, 2, 3, 4].map(n => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                </div>
                            </div>

                            {/* Mean score */}
                            <div className="flex justify-between items-center py-1">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Mean score:</span>
                                <div className="relative w-32">
                                    <select
                                        value={othersSettings.meanScoreDecimal}
                                        onChange={e => setOthersSettings(prev => ({ ...prev, meanScoreDecimal: parseInt(e.target.value) || 2 }))}
                                        className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {[0, 1, 2, 3, 4].map(n => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                </div>
                            </div>

                            {/* Mean marks */}
                            <div className="flex justify-between items-center py-1">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Mean marks:</span>
                                <div className="relative w-32">
                                    <select
                                        value={othersSettings.meanMarksDecimal}
                                        onChange={e => setOthersSettings(prev => ({ ...prev, meanMarksDecimal: parseInt(e.target.value) || 2 }))}
                                        className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {[0, 1, 2, 3, 4].map(n => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: Non-ranking grades */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Non-ranking grades</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
                            Here you can indicate the grades to assign to students who do not take all papers in an exam, those who were absent during the exam or those who committed irregularities.
                        </p>

                        <div className="space-y-3 max-w-md">
                            {/* Absent during exam */}
                            <div className="flex justify-between items-center py-1">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Absent during exam:</span>
                                <input
                                    type="text"
                                    value={othersSettings.absentGrade}
                                    onChange={e => setOthersSettings(prev => ({ ...prev, absentGrade: e.target.value }))}
                                    className="w-32 h-9 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* With exam irregularities */}
                            <div className="flex justify-between items-center py-1">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">With exam irregularities:</span>
                                <input
                                    type="text"
                                    value={othersSettings.irregularityGrade}
                                    onChange={e => setOthersSettings(prev => ({ ...prev, irregularityGrade: e.target.value }))}
                                    className="w-32 h-9 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* With incomplete papers */}
                            <div className="flex justify-between items-center py-1">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">With incomplete papers:</span>
                                <input
                                    type="text"
                                    value={othersSettings.incompleteGrade}
                                    onChange={e => setOthersSettings(prev => ({ ...prev, incompleteGrade: e.target.value }))}
                                    className="w-32 h-9 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Checkbox: Include students with non-ranking grades in exam analysis */}
                        <div className="pt-2 flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="chk_non_ranking"
                                checked={othersSettings.includeNonRankingInAnalysis}
                                onChange={e => setOthersSettings(prev => ({ ...prev, includeNonRankingInAnalysis: e.target.checked }))}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor="chk_non_ranking" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                Include students with non-ranking grades in exam analysis
                            </label>
                        </div>
                    </div>

                    {/* Bottom Right Save Changes Button matching screenshot */}
                    <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={handleSaveAllExamConfigs}
                            disabled={saveStatus === 'saving'}
                            className="px-8 py-3 bg-blue-400 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all disabled:opacity-50"
                        >
                            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Changes Saved!' : saveStatus === 'error' ? '✗ Save Failed — Retry' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}

            {/* ADD NEW PAPER MODAL */}
            {isAddPaperModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-5 animate-scale-in">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-sm uppercase text-slate-900 dark:text-white">Add Exam Paper to {activeClassConfig.className}</h3>
                            <button onClick={() => setIsAddPaperModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XIcon className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Select Subject</label>
                                <select
                                    value={modalSelectedSubjectId}
                                    onChange={e => setModalSelectedSubjectId(e.target.value)}
                                    className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                                >
                                    {subjects && subjects.length > 0 ? (
                                        subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                        ))
                                    ) : (
                                        <>
                                            <option value="sub_101">101 - ENGLISH</option>
                                            <option value="sub_102">102 - KISWAHILI</option>
                                            <option value="sub_121">121 - MATHS</option>
                                            <option value="sub_231">231 - BIOLOGY</option>
                                            <option value="sub_232">232 - PHYSICS</option>
                                            <option value="sub_233">233 - CHEMISTRY</option>
                                            <option value="sub_311">311 - HISTORY</option>
                                            <option value="sub_312">312 - GEOGRAPHY</option>
                                            <option value="sub_313">313 - CRE</option>
                                            <option value="sub_443">443 - AGRICULTURE</option>
                                            <option value="sub_565">565 - BUSINESS STUDIES</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Paper Name</label>
                                <input
                                    type="text"
                                    value={modalPaperName}
                                    onChange={e => setModalPaperName(e.target.value)}
                                    className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
                                    placeholder="e.g. Language, Lugha, Main paper, Paper 1, Composition"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Maximum Score</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={modalMaxScore}
                                    onChange={e => setModalMaxScore(parseInt(e.target.value) || 100)}
                                    className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsAddPaperModalOpen(false)}
                                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold uppercase"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAddPaperToActiveClass}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase shadow-md"
                            >
                                Add Paper
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
