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

export interface SubjectPaperConfig {
    id: string;
    subjectId: string;
    subjectName: string;
    papers: {
        id: string;
        name: string; // e.g. Paper 1, Paper 2
        maxScore: number; // e.g. 100, 80, 50
        weightPercent: number; // e.g. 50, 40
    }[];
}

export interface TeacherCommentRule {
    grade: string; // e.g. A, B+, B, C+, C, D+, D, E
    minScore: number;
    classTeacherComment: string;
    principalComment: string;
}

export interface RankingConfig {
    criteria: 'total_marks' | 'mean_score' | 'total_points';
    subjectCountPerYearGroup: Record<string, number>; // e.g. { 'form_1': 11, 'form_4': 7 }
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
    const [activeSubTab, setActiveSubTab] = useState<'exam_papers' | 'grading_system' | 'teachers_comments' | 'students_ranking'>('exam_papers');

    // 1. Exam Papers State
    const [paperConfigs, setPaperConfigs] = useState<SubjectPaperConfig[]>([
        {
            id: 'sp_math',
            subjectId: 'sub_math',
            subjectName: 'Mathematics',
            papers: [
                { id: 'p1', name: 'Paper 1 (Alt A)', maxScore: 100, weightPercent: 50 },
                { id: 'p2', name: 'Paper 2 (Alt A)', maxScore: 100, weightPercent: 50 }
            ]
        },
        {
            id: 'sp_eng',
            subjectId: 'sub_eng',
            subjectName: 'English Language',
            papers: [
                { id: 'p1', name: 'Paper 1 (Functional Writing)', maxScore: 60, weightPercent: 30 },
                { id: 'p2', name: 'Paper 2 (Comprehension & Literature)', maxScore: 80, weightPercent: 40 },
                { id: 'p3', name: 'Paper 3 (Creative Composition)', maxScore: 60, weightPercent: 30 }
            ]
        }
    ]);

    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [newPaperName, setNewPaperName] = useState('');
    const [newPaperMaxScore, setNewPaperMaxScore] = useState<number>(100);
    const [newPaperWeight, setNewPaperWeight] = useState<number>(50);

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
    const defaultYearGroups = useMemo(() => [
        { id: 'form_1', name: 'Form 1', defaultSubjects: 11 },
        { id: 'form_2', name: 'Form 2', defaultSubjects: 11 },
        { id: 'form_3', name: 'Form 3', defaultSubjects: 7 },
        { id: 'form_4', name: 'Form 4', defaultSubjects: 7 },
        { id: 'grade_7', name: 'Grade 7', defaultSubjects: 9 },
        { id: 'grade_8', name: 'Grade 8', defaultSubjects: 9 },
        { id: 'grade_9', name: 'Grade 9', defaultSubjects: 9 }
    ], []);

    const yearGroups = useMemo(() => {
        if (academicLevels && academicLevels.length > 0) {
            return academicLevels.map(lvl => ({
                id: lvl.id,
                name: lvl.name,
                defaultSubjects: 7
            }));
        }
        if (courses && courses.length > 0) {
            return courses.map(c => ({
                id: c.id,
                name: c.name,
                defaultSubjects: 7
            }));
        }
        return defaultYearGroups;
    }, [academicLevels, courses, defaultYearGroups]);

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

    // Sync saved configurations from institution profile
    useEffect(() => {
        if (currentInstitution) {
            const savedPaperConfigs = (currentInstitution as any)?.examPaperConfigs;
            if (savedPaperConfigs && Array.isArray(savedPaperConfigs)) {
                setPaperConfigs(savedPaperConfigs);
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

    const handleSaveAllExamConfigs = async () => {
        if (!currentInstitution || !onUpdateInstitution) return;
        setSaveStatus('saving');
        try {
            await onUpdateInstitution(currentInstitution.id, {
                examPaperConfigs: paperConfigs,
                teacherCommentRules: commentRules,
                examRankingConfig: rankingConfig
            } as any);

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch (err) {
            console.error('[ExamConfigManager] Failed to save exam configuration:', err);
            setSaveStatus('idle');
        }
    };

    // Paper Add / Remove handlers
    const handleAddPaper = () => {
        if (!selectedSubjectId) {
            alert('Please select a subject to add a paper to.');
            return;
        }
        if (!newPaperName.trim()) {
            alert('Please enter a paper name (e.g. Paper 1).');
            return;
        }

        const subj = subjects.find(s => s.id === selectedSubjectId);
        const subjName = subj ? `${subj.code} - ${subj.name}` : 'Selected Subject';

        setPaperConfigs(prev => {
            const existingIdx = prev.findIndex(p => p.subjectId === selectedSubjectId);
            const newPaper = {
                id: `paper_${Date.now()}`,
                name: newPaperName.trim(),
                maxScore: newPaperMaxScore || 100,
                weightPercent: newPaperWeight || 50
            };

            if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = {
                    ...updated[existingIdx],
                    papers: [...updated[existingIdx].papers, newPaper]
                };
                return updated;
            } else {
                return [...prev, {
                    id: `sp_${Date.now()}`,
                    subjectId: selectedSubjectId,
                    subjectName: subjName,
                    papers: [newPaper]
                }];
            }
        });

        setNewPaperName('');
    };

    const handleRemovePaper = (subjectId: string, paperId: string) => {
        setPaperConfigs(prev => {
            return prev.map(sp => {
                if (sp.subjectId === subjectId) {
                    return {
                        ...sp,
                        papers: sp.papers.filter(p => p.id !== paperId)
                    };
                }
                return sp;
            }).filter(sp => sp.papers.length > 0);
        });
    };

    const handleSubjectCountChange = (yearGroupId: string, count: number) => {
        setRankingConfig(prev => ({
            ...prev,
            subjectCountPerYearGroup: {
                ...prev.subjectCountPerYearGroup,
                [yearGroupId]: count
            }
        }));
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl">
            {/* Header Navigation Bar */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <AcademicCapIcon className="w-7 h-7 text-indigo-600" />
                            Exam System Configuration
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Configure exam papers, grading boundaries, automated teacher remarks & ranking criteria
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleSaveAllExamConfigs}
                        disabled={saveStatus === 'saving'}
                        className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {saveStatus === 'saving' ? 'Saving Exam Settings...' : saveStatus === 'saved' ? 'Settings Saved!' : 'Save All Exam Settings'}
                    </button>
                </div>

                {/* Inner Tabs Bar */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveSubTab('exam_papers')}
                        className={`py-4 px-6 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                            activeSubTab === 'exam_papers' ? 'border-indigo-600 text-indigo-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <DocumentTextIcon className="w-4 h-4" /> Exam Papers
                    </button>
                    <button
                        onClick={() => setActiveSubTab('grading_system')}
                        className={`py-4 px-6 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                            activeSubTab === 'grading_system' ? 'border-indigo-600 text-indigo-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <AcademicCapIcon className="w-4 h-4" /> Grading System
                    </button>
                    <button
                        onClick={() => setActiveSubTab('teachers_comments')}
                        className={`py-4 px-6 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                            activeSubTab === 'teachers_comments' ? 'border-indigo-600 text-indigo-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <ChatBubbleBottomCenterTextIcon className="w-4 h-4" /> Teachers Comments
                    </button>
                    <button
                        onClick={() => setActiveSubTab('students_ranking')}
                        className={`py-4 px-6 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                            activeSubTab === 'students_ranking' ? 'border-indigo-600 text-indigo-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <ChartBarIcon className="w-4 h-4" /> Students Ranking
                    </button>
                </div>
            </div>

            {/* TAB 1: EXAM PAPERS */}
            {activeSubTab === 'exam_papers' && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 animate-fade-in">
                    <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl space-y-2">
                        <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tight flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-indigo-600" /> Multi-Paper Subject Setup
                        </h3>
                        <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed font-medium">
                            By default, students sit only one paper per subject during an exam. However, some subjects may require students to take several papers e.g Mathematics Paper 1 & Paper 2, English Language & Composition etc.
                        </p>
                    </div>

                    {/* Add Paper Form */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                        <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">Configure Subject Exam Papers</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Target Subject</label>
                                <select
                                    value={selectedSubjectId}
                                    onChange={e => setSelectedSubjectId(e.target.value)}
                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                >
                                    <option value="">-- Select Subject --</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Paper Label / Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Paper 1, Composition"
                                    value={newPaperName}
                                    onChange={e => setNewPaperName(e.target.value)}
                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Max Score</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newPaperMaxScore}
                                    onChange={e => setNewPaperMaxScore(Number(e.target.value))}
                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={handleAddPaper}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
                            >
                                <PlusIcon className="w-4 h-4" /> Add Subject Paper
                            </button>
                        </div>
                    </div>

                    {/* Configured Multi-Paper List */}
                    <div className="space-y-4">
                        <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">Configured Subject Papers</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {paperConfigs.map(sp => (
                                <div key={sp.id} className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                                        <h5 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">{sp.subjectName}</h5>
                                        <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-black text-[10px] uppercase tracking-widest rounded-lg">
                                            {sp.papers.length} Papers Configured
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {sp.papers.map(p => (
                                            <div key={p.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 dark:text-white">{p.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Max Score: {p.maxScore} Marks</p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemovePaper(sp.subjectId, p.id)}
                                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Remove Paper"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: GRADING SYSTEM */}
            {activeSubTab === 'grading_system' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl space-y-2">
                        <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tight flex items-center gap-2">
                            <AcademicCapIcon className="w-5 h-5 text-indigo-600" /> Grading Boundaries & Scales
                        </h3>
                        <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed font-medium">
                            Help us determine what scores or marks constitute a grade A, B+ or C- in your school. The system defaults to overall grading if subject-specific grading is not specified.
                        </p>
                    </div>

                    <GradingSystemManager currentInstitution={currentInstitution} onUpdateInstitution={onUpdateInstitution} />
                </div>
            )}

            {/* TAB 3: TEACHERS COMMENTS */}
            {activeSubTab === 'teachers_comments' && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 animate-fade-in">
                    <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl space-y-2">
                        <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tight flex items-center gap-2">
                            <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-indigo-600" /> Automated Remark Generators
                        </h3>
                        <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed font-medium">
                            Teacher comments allow us to automate remarks made by the class teacher and the school's head as shown in the report card and results slips.
                        </p>
                    </div>

                    {/* Comments Table */}
                    <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl">
                        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest w-20">Grade</th>
                                    <th className="px-4 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest w-24">Min %</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Automated Class Teacher Remarks</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Automated Principal / Head Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {commentRules.map((rule, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-4 text-center">
                                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-black text-xs rounded-lg">
                                                {rule.grade}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center font-bold text-xs">{rule.minScore}%</td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={rule.classTeacherComment}
                                                onChange={e => {
                                                    const updated = [...commentRules];
                                                    updated[idx].classTeacherComment = e.target.value;
                                                    setCommentRules(updated);
                                                }}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={rule.principalComment}
                                                onChange={e => {
                                                    const updated = [...commentRules];
                                                    updated[idx].principalComment = e.target.value;
                                                    setCommentRules(updated);
                                                }}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: STUDENTS RANKING */}
            {activeSubTab === 'students_ranking' && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 animate-fade-in">
                    <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl space-y-2">
                        <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tight flex items-center gap-2">
                            <ChartBarIcon className="w-5 h-5 text-indigo-600" /> Student Ranking Criteria & Subject Count
                        </h3>
                        <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed font-medium">
                            Specify the criteria that the school uses to rank students by clicking the options below. We support ranking by total marks, mean score or points. Also choose the number of subjects used to rank for each year group.
                        </p>
                    </div>

                    {/* Ranking Criteria Cards */}
                    <div className="space-y-4">
                        <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">Primary Ranking Criterion</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div
                                onClick={() => setRankingConfig(prev => ({ ...prev, criteria: 'total_marks' }))}
                                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                                    rankingConfig.criteria === 'total_marks'
                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-md'
                                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 opacity-70 hover:opacity-100'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-black text-sm uppercase text-slate-900 dark:text-white">Total Marks</span>
                                    {rankingConfig.criteria === 'total_marks' && <CheckIcon className="w-5 h-5 text-indigo-600" />}
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Rank students strictly by aggregate raw marks sum achieved across subjects.</p>
                            </div>

                            <div
                                onClick={() => setRankingConfig(prev => ({ ...prev, criteria: 'mean_score' }))}
                                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                                    rankingConfig.criteria === 'mean_score'
                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-md'
                                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 opacity-70 hover:opacity-100'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-black text-sm uppercase text-slate-900 dark:text-white">Mean Score (%)</span>
                                    {rankingConfig.criteria === 'mean_score' && <CheckIcon className="w-5 h-5 text-indigo-600" />}
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Rank students by overall average percentage score achieved across papers.</p>
                            </div>

                            <div
                                onClick={() => setRankingConfig(prev => ({ ...prev, criteria: 'total_points' }))}
                                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                                    rankingConfig.criteria === 'total_points'
                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-md'
                                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 opacity-70 hover:opacity-100'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-black text-sm uppercase text-slate-900 dark:text-white">Total Points (KNEC)</span>
                                    {rankingConfig.criteria === 'total_points' && <CheckIcon className="w-5 h-5 text-indigo-600" />}
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Rank students using KNEC aggregate grade points (1 to 12 pts per subject).</p>
                            </div>
                        </div>
                    </div>

                    {/* Number of Subjects Used to Rank for Each Year Group */}
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                            Number of Subjects Used to Rank for Each Year Group
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {yearGroups.map(yg => (
                                <div key={yg.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                                    <h5 className="font-black text-sm text-slate-900 dark:text-white uppercase">{yg.name}</h5>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Ranked Subjects Count</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="15"
                                            value={rankingConfig.subjectCountPerYearGroup[yg.id] ?? yg.defaultSubjects}
                                            onChange={e => handleSubjectCountChange(yg.id, parseInt(e.target.value) || 7)}
                                            className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
