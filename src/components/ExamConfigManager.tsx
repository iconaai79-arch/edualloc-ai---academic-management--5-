import React, { useState, useEffect, useMemo } from 'react';
import type { Institution, Subject, AcademicLevel, Course } from '../types';
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

export interface TeacherCommentRule {
    grade: string; // e.g. A, B+, B, C+, C, D+, D, E
    minScore: number;
    classTeacherComment: string;
    principalComment: string;
}

export interface RankingConfig {
    criteria: 'total_marks' | 'mean_score' | 'total_points';
    subjectCountPerYearGroup: Record<string, number>;
    tieBreaker: 'joint_rank' | 'sequential';
}

interface ExamConfigManagerProps {
    currentInstitution?: Institution | null;
    onUpdateInstitution?: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => void;
    subjects?: Subject[];
    academicLevels?: AcademicLevel[];
    courses?: Course[];
}

export const ExamConfigManager: React.FC<ExamConfigManagerProps> = ({
    currentInstitution,
    onUpdateInstitution,
    subjects = [],
    academicLevels = [],
    courses = []
}) => {
    const [activeSubTab, setActiveSubTab] = useState<'exam_papers' | 'grading_system' | 'teachers_comments' | 'students_ranking' | 'others'>('exam_papers');

    // Default classes list if no academic levels or courses passed
    const defaultClasses = useMemo(() => [
        { id: 'form_3', name: 'Form 3' },
        { id: 'form_4', name: 'Form 4' },
        { id: 'grade_10', name: 'Grade 10' }
    ], []);

    const classList = useMemo(() => {
        if (academicLevels && academicLevels.length > 0) {
            return academicLevels.map(lvl => ({
                id: lvl.id,
                name: lvl.name
            }));
        }
        if (courses && courses.length > 0) {
            return courses.map(c => ({
                id: c.id,
                name: c.name
            }));
        }
        return defaultClasses;
    }, [academicLevels, courses, defaultClasses]);

    const [activeClassId, setActiveClassId] = useState<string>('form_3');

    // Default initial Per-Class Exam Papers state
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

    // 2. Teachers Comments State
    const [commentRules, setCommentRules] = useState<TeacherCommentRule[]>([
        { grade: 'A', minScore: 80, classTeacherComment: 'An outstanding academic performance. Keep up the high standard!', principalComment: 'Excellent result. Approved for promotion with distinction.' },
        { grade: 'A-', minScore: 75, classTeacherComment: 'Very strong intellectual capability. Consistently commendable work.', principalComment: 'Superb effort. Keep striving for the top grade.' },
        { grade: 'B+', minScore: 70, classTeacherComment: 'Good performance. Shows great potential for an A grade.', principalComment: 'Very good work. Approved for promotion.' },
        { grade: 'B', minScore: 65, classTeacherComment: 'Good result overall. Continue working hard in core subjects.', principalComment: 'Good effort. Strive for higher performance.' },
        { grade: 'B-', minScore: 60, classTeacherComment: 'Fair performance. Needs more effort in technical subjects.', principalComment: 'Satisfactory result. Encouraged to aim higher.' },
        { grade: 'C+', minScore: 55, classTeacherComment: 'Average performance. Potential exists for better scores with focus.', principalComment: 'Average result. Work harder in weaker areas.' },
        { grade: 'C', minScore: 50, classTeacherComment: 'Pass grade. Needs consistent revision and assistance.', principalComment: 'Passable effort. Must double effort next term.' },
        { grade: 'C-', minScore: 45, classTeacherComment: 'Below average. More dedication required in daily assignments.', principalComment: 'Needs improvement. Close academic monitoring advised.' },
        { grade: 'D+', minScore: 40, classTeacherComment: 'Weak performance. Requires remediation in core subjects.', principalComment: 'Weak result. Needs urgent academic focus.' },
        { grade: 'D', minScore: 35, classTeacherComment: 'Poor performance. Regular study plan strongly recommended.', principalComment: 'Underperforming. Parent conference required.' },
        { grade: 'E', minScore: 0, classTeacherComment: 'Unsatisfactory result. Requires intensive remedial coaching.', principalComment: 'Critical concern. Urgent intervention plan mandated.' }
    ]);

    // 3. Ranking State
    const [rankingConfig, setRankingConfig] = useState<RankingConfig>({
        criteria: 'total_marks',
        subjectCountPerYearGroup: {
            'form_1': 11,
            'form_2': 11,
            'form_3': 7,
            'form_4': 7,
            'grade_7': 9,
            'grade_8': 9,
            'grade_9': 9
        },
        tieBreaker: 'joint_rank'
    });

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Sync saved configuration from institution
    useEffect(() => {
        if (currentInstitution) {
            const savedClassConfigs = (currentInstitution as any)?.classExamConfigs;
            if (savedClassConfigs && Array.isArray(savedClassConfigs) && savedClassConfigs.length > 0) {
                setClassConfigs(savedClassConfigs);
            }

            const savedComments = (currentInstitution as any)?.teacherCommentRules;
            if (savedComments && Array.isArray(savedComments)) {
                setCommentRules(savedComments);
            }

            const savedRanking = (currentInstitution as any)?.examRankingConfig;
            if (savedRanking) {
                setRankingConfig({
                    criteria: savedRanking.criteria || 'total_marks',
                    subjectCountPerYearGroup: savedRanking.subjectCountPerYearGroup || rankingConfig.subjectCountPerYearGroup,
                    tieBreaker: savedRanking.tieBreaker || 'joint_rank'
                });
            }
        }
    }, [currentInstitution]);

    // Active class configuration helper
    const activeClassConfig = useMemo(() => {
        let found = classConfigs.find(c => c.classId === activeClassId);
        if (!found) {
            const activeClassObj = classList.find(c => c.id === activeClassId);
            found = {
                classId: activeClassId,
                className: activeClassObj?.name || 'Class',
                subjects: []
            };
        }
        return found;
    }, [classConfigs, activeClassId, classList]);

    // Helper to get total paper count for a class
    const getClassPaperCount = (cId: string): number => {
        const conf = classConfigs.find(c => c.classId === cId);
        if (!conf) return 0;
        return conf.subjects.reduce((sum, s) => sum + s.papers.length, 0);
    };

    // Save handler
    const handleSaveAllExamConfigs = async () => {
        if (!currentInstitution || !onUpdateInstitution) return;
        setSaveStatus('saving');
        try {
            await onUpdateInstitution(currentInstitution.id, {
                classExamConfigs: classConfigs,
                teacherCommentRules: commentRules,
                examRankingConfig: rankingConfig
            } as any);

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch (err) {
            console.error('[ExamConfigManager] Error saving exam configuration:', err);
            setSaveStatus('idle');
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
                                    {saveStatus === 'saving' ? 'Saving Exam Papers...' : 'Save Exam Papers Config'}
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
                    <GradingSystemManager currentInstitution={currentInstitution} onUpdateInstitution={onUpdateInstitution} />
                </div>
            )}

            {/* TAB 3: TEACHER COMMENTS */}
            {activeSubTab === 'teachers_comments' && (
                <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 animate-fade-in shadow-sm">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Teacher comments allow us to automate remarks made by the class teacher and the school's head as shown in the report card and results slips.
                    </p>

                    <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-wider w-20">Grade</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-wider w-24">Min %</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Automated Class Teacher Remarks</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Automated Principal / Head Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {commentRules.map((rule, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                        <td className="px-4 py-3.5 text-center">
                                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold text-xs rounded-md">
                                                {rule.grade}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center font-bold text-xs">{rule.minScore}%</td>
                                        <td className="px-6 py-3.5">
                                            <input
                                                type="text"
                                                value={rule.classTeacherComment}
                                                onChange={e => {
                                                    const updated = [...commentRules];
                                                    updated[idx].classTeacherComment = e.target.value;
                                                    setCommentRules(updated);
                                                }}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium"
                                            />
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <input
                                                type="text"
                                                value={rule.principalComment}
                                                onChange={e => {
                                                    const updated = [...commentRules];
                                                    updated[idx].principalComment = e.target.value;
                                                    setCommentRules(updated);
                                                }}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={handleSaveAllExamConfigs}
                            disabled={saveStatus === 'saving'}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all disabled:opacity-50"
                        >
                            Save Teacher Comments
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 4: STUDENTS RANKING */}
            {activeSubTab === 'students_ranking' && (
                <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 animate-fade-in shadow-sm">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Specify the criteria that the school uses to rank students by clicking the arrow below. We support ranking by total marks, mean score or points. Also choose the number of subjects used to rank for each year group.
                    </p>

                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Primary Ranking Criterion</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div
                                onClick={() => setRankingConfig(prev => ({ ...prev, criteria: 'total_marks' }))}
                                className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                                    rankingConfig.criteria === 'total_marks'
                                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-900/20 shadow-sm'
                                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 opacity-70 hover:opacity-100'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-xs uppercase text-slate-900 dark:text-white">Total Marks</span>
                                    {rankingConfig.criteria === 'total_marks' && <CheckIcon className="w-4 h-4 text-blue-600" />}
                                </div>
                                <p className="text-[10px] text-slate-500 uppercase">Rank students by aggregate raw marks sum achieved across subjects.</p>
                            </div>

                            <div
                                onClick={() => setRankingConfig(prev => ({ ...prev, criteria: 'mean_score' }))}
                                className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                                    rankingConfig.criteria === 'mean_score'
                                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-900/20 shadow-sm'
                                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 opacity-70 hover:opacity-100'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-xs uppercase text-slate-900 dark:text-white">Mean Score (%)</span>
                                    {rankingConfig.criteria === 'mean_score' && <CheckIcon className="w-4 h-4 text-blue-600" />}
                                </div>
                                <p className="text-[10px] text-slate-500 uppercase">Rank students by overall average percentage score achieved across papers.</p>
                            </div>

                            <div
                                onClick={() => setRankingConfig(prev => ({ ...prev, criteria: 'total_points' }))}
                                className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                                    rankingConfig.criteria === 'total_points'
                                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-900/20 shadow-sm'
                                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 opacity-70 hover:opacity-100'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-xs uppercase text-slate-900 dark:text-white">Total Points (KNEC)</span>
                                    {rankingConfig.criteria === 'total_points' && <CheckIcon className="w-4 h-4 text-blue-600" />}
                                </div>
                                <p className="text-[10px] text-slate-500 uppercase">Rank students using KNEC aggregate grade points (1 to 12 pts per subject).</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={handleSaveAllExamConfigs}
                            disabled={saveStatus === 'saving'}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all disabled:opacity-50"
                        >
                            Save Ranking Rules
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 5: OTHERS */}
            {activeSubTab === 'others' && (
                <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 animate-fade-in shadow-sm">
                    <h3 className="text-sm font-bold uppercase text-slate-900 dark:text-white">Additional Examination Policies</h3>
                    <p className="text-xs text-slate-500">Configure secondary exam rules, transcript headers, and report card disclaimers.</p>
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
