import React, { useState, useMemo } from 'react';
import type { Institution, Subject, User, Assessment, AssessmentMark, AcademicYear, Course } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { XIcon } from '../icons/XIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

export interface ExamUnitRecord {
    id: string;
    name: string; // e.g. Endterm 2 Exam 2026, Kapseret Mock, Mid Term Exam
    term: string; // e.g. TERM 2, TERM 1
    type: string; // e.g. END TERM, CAT, MOCK
    year: number; // e.g. 2026, 2025
    status: 'in_progress' | 'published';
    submittedPercent: number; // e.g. 27.6
    studentsEnrolled: number; // e.g. 361
    missingMarks: number; // e.g. 4354
}

export interface TestedPaperConfig {
    id: string;
    subject: string;
    paperName: string;
    maxInputScore: number; // e.g. 30 for 30%
    convertToHundred: boolean; // Auto convert raw scores to 100%
    enabled: boolean;
}

interface ExamUnitsManagerProps {
    currentInstitution?: Institution | null;
    subjects?: Subject[];
    users?: User[];
    assessments?: Assessment[];
    marks?: AssessmentMark[];
    courses?: Course[];
    onAddAssessment?: (assessment: any) => void;
    onUpdateAssessment?: (id: string, data: any) => void;
}

export const ExamUnitsManager: React.FC<ExamUnitsManagerProps> = ({
    currentInstitution,
    subjects = [],
    users = [],
    assessments = [],
    marks = [],
    courses = []
}) => {
    // List of Exams State
    const [exams, setExams] = useState<ExamUnitRecord[]>([
        { id: 'exam_1', name: 'Endterm 2 Exam 2026', term: 'TERM 2', type: 'END TERM', year: 2026, status: 'in_progress', submittedPercent: 27.6, studentsEnrolled: 361, missingMarks: 4354 },
        { id: 'exam_2', name: 'Kapseret Mock', term: 'TERM 2', type: 'END TERM', year: 2026, status: 'in_progress', submittedPercent: 19.2, studentsEnrolled: 340, missingMarks: 5120 },
        { id: 'exam_3', name: 'Mid Term Exam', term: 'TERM 1', type: 'CAT', year: 2026, status: 'in_progress', submittedPercent: 47.4, studentsEnrolled: 380, missingMarks: 2100 },
        { id: 'exam_pub_1', name: 'Mid Term 2 Exam', term: 'TERM 2', type: 'CAT', year: 2026, status: 'published', submittedPercent: 100, studentsEnrolled: 610, missingMarks: 0 },
        { id: 'exam_pub_2', name: 'End Term Exam', term: 'TERM 1', type: 'END TERM', year: 2026, status: 'published', submittedPercent: 100, studentsEnrolled: 594, missingMarks: 0 },
        { id: 'exam_pub_3', name: 'Mock Exam 2025', term: 'TERM 3', type: 'MOCK', year: 2025, status: 'published', submittedPercent: 100, studentsEnrolled: 580, missingMarks: 0 }
    ]);

    const [selectedExamId, setSelectedExamId] = useState<string>('exam_1');
    const [activeSubTab, setActiveSubTab] = useState<'progress' | 'irregularities' | 'history'>('progress');
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);
    const [isBroadsheetModalOpen, setIsBroadsheetModalOpen] = useState(false);
    const [isSendResultsModalOpen, setIsSendResultsModalOpen] = useState(false);

    // Accordion state for class progress table
    const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({
        'c_form_3_central': true,
        'c_form_3_south': false
    });

    // Form states for creating a new exam matching screenshot
    const [wizardStep, setWizardStep] = useState<1 | 2>(1);
    const [creationMethod, setCreationMethod] = useState<'raw_marks' | 'combine' | 'excel'>('raw_marks');
    const [newExamName, setNewExamName] = useState('');
    const [newExamTypeRadio, setNewExamTypeRadio] = useState<'CAT' | 'End Term' | 'Inter-school'>('CAT');
    const [newAcademicYear, setNewAcademicYear] = useState('2026');
    const [newTerm, setNewTerm] = useState('Term 2');
    const [newGradingSystem, setNewGradingSystem] = useState('Main grading system');
    const [newExamStartDate, setNewExamStartDate] = useState('2026-07-26');
    const [newExamSubmissionDate, setNewExamSubmissionDate] = useState('2026-08-05');

    // Step 2 Wizard States:
    const [targetStudentSearch, setTargetStudentSearch] = useState('');
    const [selectedClasses, setSelectedClasses] = useState<string[]>(['Form 3 Central', 'Form 3 South', 'Form 3 East', 'Form 3 West', 'Grade 10']);
    const [isPapersModalOpen, setIsPapersModalOpen] = useState(false);
    // Tested Papers Configuration State:
    const [testedPaperConfigs, setTestedPaperConfigs] = useState<TestedPaperConfig[]>([
        { id: 'tp_1', subject: 'Mathematics', paperName: 'Paper 1', maxInputScore: 30, convertToHundred: true, enabled: true },
        { id: 'tp_2', subject: 'Mathematics', paperName: 'Paper 2', maxInputScore: 70, convertToHundred: true, enabled: true },
        { id: 'tp_3', subject: 'English', paperName: 'Paper 1 (Functional Skills)', maxInputScore: 60, convertToHundred: true, enabled: true },
        { id: 'tp_4', subject: 'English', paperName: 'Paper 2 (Comprehension)', maxInputScore: 80, convertToHundred: true, enabled: true },
        { id: 'tp_5', subject: 'English', paperName: 'Paper 3 (Creative Writing)', maxInputScore: 40, convertToHundred: true, enabled: true },
        { id: 'tp_6', subject: 'Kiswahili', paperName: 'Insha (Paper 1)', maxInputScore: 40, convertToHundred: true, enabled: true },
        { id: 'tp_7', subject: 'Kiswahili', paperName: 'Lugha (Paper 2)', maxInputScore: 80, convertToHundred: true, enabled: true },
        { id: 'tp_8', subject: 'Biology', paperName: 'Paper 1 (Theory)', maxInputScore: 80, convertToHundred: true, enabled: true },
        { id: 'tp_9', subject: 'Biology', paperName: 'Paper 2 (Practical)', maxInputScore: 40, convertToHundred: true, enabled: true },
        { id: 'tp_10', subject: 'Chemistry', paperName: 'Paper 1 (Theory)', maxInputScore: 80, convertToHundred: true, enabled: true },
        { id: 'tp_11', subject: 'Physics', paperName: 'Paper 1 (Theory)', maxInputScore: 80, convertToHundred: true, enabled: true }
    ]);
    const [useCustomRanking, setUseCustomRanking] = useState(false);
    const [rankingScope, setRankingScope] = useState<'overall' | 'per_class'>('overall');
    const [customRankingCriteria, setCustomRankingCriteria] = useState<'Points' | 'Total Marks' | 'Mean Score'>('Points');
    const [customRankingSubjectsCount, setCustomRankingSubjectsCount] = useState<number>(7);
    const [perClassRankingSettings, setPerClassRankingSettings] = useState<Record<string, { criteria: 'Points' | 'Total Marks' | 'Mean Score'; subjectsCount: number; enabled: boolean }>>({
        'Form 3 Central': { criteria: 'Points', subjectsCount: 7, enabled: true },
        'Form 3 South': { criteria: 'Points', subjectsCount: 7, enabled: true },
        'Form 3 East': { criteria: 'Points', subjectsCount: 7, enabled: true },
        'Form 3 West': { criteria: 'Points', subjectsCount: 7, enabled: true },
        'Grade 10 Central': { criteria: 'Points', subjectsCount: 7, enabled: true },
    });

    const activeExam = useMemo(() => {
        return exams.find(e => e.id === selectedExamId) || exams[0];
    }, [exams, selectedExamId]);

    const inProgressExams = useMemo(() => exams.filter(e => e.status === 'in_progress'), [exams]);
    const publishedExams = useMemo(() => exams.filter(e => e.status === 'published'), [exams]);

    // Group published exams by year
    const publishedByYear = useMemo(() => {
        const groups: Record<number, ExamUnitRecord[]> = { 2026: [], 2025: [], 2024: [], 2023: [], 2022: [], 2020: [] };
        publishedExams.forEach(e => {
            if (!groups[e.year]) groups[e.year] = [];
            groups[e.year].push(e);
        });
        return groups;
    }, [publishedExams]);

    const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({ 2026: true, 2025: false });

    // Mock progress data matching screenshot
    const teacherProgressList = [
        { name: 'Mr. Kipsang', progress: 88.64 },
        { name: 'Md Kandie', progress: 84.21 },
        { name: 'Mdm. Faith Kanguha', progress: 75.55 },
        { name: 'Md Linet', progress: 75.40 },
        { name: 'Mdm Sharon Jepchumba', progress: 74.29 }
    ];

    const classProgressList = [
        { name: 'Form 3 Central 2026', progress: 42.58 },
        { name: 'Form 3 South 2026', progress: 35.07 },
        { name: 'Form 3 East 2026', progress: 32.95 },
        { name: 'Form 3 West 2026', progress: 31.60 },
        { name: 'Grade 10 Central 2026', progress: 27.56 }
    ];

    const subjectProgressList = [
        { name: 'COMMUNITY SERVICE LEARNING', progress: 82.62 },
        { name: 'English', progress: 70.21 },
        { name: 'Kiswahili', progress: 64.32 },
        { name: 'ESSENTIAL MATHS', progress: 62.15 },
        { name: 'MATHS', progress: 59.39 }
    ];

    const classPaperRows = [
        {
            classKey: 'c_form_3_central',
            className: 'Form 3 Central 2026',
            enrollment: 60,
            overallProgress: 42.69,
            papers: [
                { id: 'p1', subject: 'English', teacher: 'Mdm. Faith Kanguha', enrollment: 58, progress: 74.14 },
                { id: 'p2', subject: 'Kiswahili', teacher: 'Mr Justus', enrollment: 58, progress: 74.14 },
                { id: 'p3', subject: 'MATHS', teacher: 'Chome Ngala', enrollment: 58, progress: 67.24 },
                { id: 'p4', subject: 'Biology', teacher: 'Mdm Romana', enrollment: 58, progress: 67.24 }
            ]
        },
        {
            classKey: 'c_form_3_south',
            className: 'Form 3 South 2026',
            enrollment: 55,
            overallProgress: 35.07,
            papers: [
                { id: 'p5', subject: 'English', teacher: 'Mdm. Faith Kanguha', enrollment: 55, progress: 50.00 },
                { id: 'p6', subject: 'Kiswahili', teacher: 'Mr Justus', enrollment: 55, progress: 48.20 }
            ]
        }
    ];

    const handleCreateExam = () => {
        if (!newExamName.trim()) {
            alert('Please enter an exam title.');
            return;
        }
        const newExam: ExamUnitRecord = {
            id: `exam_${Date.now()}`,
            name: newExamName.trim(),
            term: newTerm.toUpperCase(),
            type: newExamTypeRadio.toUpperCase(),
            year: parseInt(newAcademicYear) || 2026,
            status: 'in_progress',
            submittedPercent: 0,
            studentsEnrolled: 360,
            missingMarks: 3600
        };
        setExams(prev => [newExam, ...prev]);
        setSelectedExamId(newExam.id);
        setNewExamName('');
        setIsAddExamModalOpen(false);
    };

    const handleTogglePublish = () => {
        setExams(prev => prev.map(e => {
            if (e.id === activeExam.id) {
                return { ...e, status: e.status === 'published' ? 'in_progress' : 'published' };
            }
            return e;
        }));
    };

    const handleDeleteExam = () => {
        if (confirm(`Are you sure you want to delete "${activeExam.name}"?`)) {
            setExams(prev => prev.filter(e => e.id !== activeExam.id));
            if (exams.length > 1) {
                setSelectedExamId(exams[0].id);
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl">
            {/* Top Action Header Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <button
                    type="button"
                    onClick={() => setIsAddExamModalOpen(true)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-2"
                >
                    <PlusIcon className="w-4 h-4 stroke-[3]" /> Add Exam
                </button>

                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-5 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                >
                    <ArrowPathIcon className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Main Master-Detail Grid Layout matching screenshot */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Left Master Panel: Exams List & Status Groups */}
                <div className="space-y-6">
                    {/* SECTION 1: EXAMS IN PROGRESS */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            EXAMS IN PROGRESS
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {inProgressExams.map(exam => {
                                const isSelected = selectedExamId === exam.id;
                                return (
                                    <div
                                        key={exam.id}
                                        onClick={() => setSelectedExamId(exam.id)}
                                        className={`p-4 cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-blue-600 text-white font-bold'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-900 dark:text-white'
                                        }`}
                                    >
                                        <h4 className="text-xs font-bold uppercase tracking-tight mb-1">{exam.name}</h4>
                                        <p className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                                            {exam.term} • {exam.type} • {exam.submittedPercent}% submitted
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 2: PUBLISHED EXAMS */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            PUBLISHED EXAMS
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {Object.entries(publishedByYear).map(([yearStr, list]) => {
                                const yearNum = parseInt(yearStr);
                                const isExp = expandedYears[yearNum];
                                return (
                                    <div key={yearNum} className="space-y-0.5">
                                        <div
                                            onClick={() => setExpandedYears(prev => ({ ...prev, [yearNum]: !prev[yearNum] }))}
                                            className="px-4 py-3 cursor-pointer text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-50 flex items-center justify-between"
                                        >
                                            <span>{yearNum} ({list.length})</span>
                                            {isExp ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                        </div>

                                        {isExp && list.length > 0 && (
                                            <div className="pl-4 space-y-0.5 bg-slate-50/50 dark:bg-slate-950/40 divide-y divide-slate-100">
                                                {list.map(exam => {
                                                    const isSelected = selectedExamId === exam.id;
                                                    return (
                                                        <div
                                                            key={exam.id}
                                                            onClick={() => setSelectedExamId(exam.id)}
                                                            className={`p-3 cursor-pointer transition-all ${
                                                                isSelected
                                                                    ? 'bg-blue-600 text-white font-bold'
                                                                    : 'hover:bg-slate-100 text-slate-800 dark:text-slate-200'
                                                            }`}
                                                        >
                                                            <h5 className="text-xs font-bold uppercase">{exam.name}</h5>
                                                            <p className={`text-[9px] uppercase font-bold tracking-wider ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                                                                {exam.term} • {exam.type} • {exam.studentsEnrolled} students
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Main Panel: Active Selected Exam Dashboard */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Header Controls & Exam Title */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">
                                {activeExam.name}
                            </h2>

                            <div className="flex items-center gap-3 relative">
                                <button
                                    type="button"
                                    onClick={handleTogglePublish}
                                    className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all"
                                >
                                    {activeExam.status === 'published' ? 'Unpublish Exam' : 'Publish Exam'}
                                </button>

                                {/* Exam Actions Dropdown */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsActionsOpen(!isActionsOpen)}
                                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-1.5"
                                    >
                                        Exam Actions <ChevronDownIcon className="w-4 h-4 stroke-[2.5]" />
                                    </button>

                                    {isActionsOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-30 py-2 divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 animate-scale-in">
                                            <div className="py-1">
                                                <button
                                                    onClick={() => { setIsActionsOpen(false); alert('Edit Exam settings...'); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                                >
                                                    <PencilIcon className="w-4 h-4 text-slate-400" /> Edit Exam
                                                </button>
                                                <button
                                                    onClick={() => { setIsActionsOpen(false); setIsBroadsheetModalOpen(true); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                                >
                                                    <DocumentTextIcon className="w-4 h-4 text-slate-400" /> View Broadsheet
                                                </button>
                                                <button
                                                    onClick={() => { setIsActionsOpen(false); setIsSendResultsModalOpen(true); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                                >
                                                    <PaperAirplaneIcon className="w-4 h-4 text-slate-400" /> Send Results
                                                </button>
                                            </div>
                                            <div className="py-1">
                                                <button
                                                    onClick={() => { setIsActionsOpen(false); handleTogglePublish(); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-amber-600"
                                                >
                                                    {activeExam.status === 'published' ? 'Unpublish' : 'Publish'}
                                                </button>
                                                <button
                                                    onClick={() => { setIsActionsOpen(false); alert('Invitation Accepted'); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                >
                                                    Accept Invitation
                                                </button>
                                            </div>
                                            <div className="py-1">
                                                <button
                                                    onClick={() => { setIsActionsOpen(false); handleDeleteExam(); }}
                                                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                                                >
                                                    <TrashIcon className="w-4 h-4" /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top KPI Stat Cards matching screenshot */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                                <h3 className="text-3xl font-black text-blue-600">{activeExam.studentsEnrolled}</h3>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">STUDENTS ENROLLED</p>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                                <h3 className="text-3xl font-black text-red-500">{activeExam.missingMarks.toLocaleString()}</h3>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">MISSING MARKS</p>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                                <h3 className="text-3xl font-black text-emerald-500">{activeExam.submittedPercent}%</h3>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">OF MARKS SUBMITTED</p>
                            </div>
                        </div>

                        {/* 3 Progress Columns matching screenshot */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            {/* Column 1: PROGRESS PER TEACHER */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PROGRESS PER TEACHER</h4>
                                <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {teacherProgressList.map((t, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                                            <span>{t.name}</span>
                                            <span className="font-mono text-slate-900 dark:text-white">{t.progress}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Column 2: PROGRESS BY CLASS */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PROGRESS BY CLASS</h4>
                                <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {classProgressList.map((c, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                                            <span>{c.name}</span>
                                            <span className="font-mono text-slate-900 dark:text-white">{c.progress}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Column 3: PROGRESS BY SUBJECT */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PROGRESS BY SUBJECT</h4>
                                <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {subjectProgressList.map((s, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                                            <span>{s.name}</span>
                                            <span className="font-mono text-slate-900 dark:text-white">{s.progress}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Subtabs & Marks Entry Progress Panel */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
                        {/* Subtabs Bar */}
                        <div className="flex space-x-6 border-b border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setActiveSubTab('progress')}
                                className={`pb-3 border-b-2 font-black text-xs uppercase tracking-wider transition-all ${
                                    activeSubTab === 'progress' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Marks Entry Progress
                            </button>
                            <button
                                onClick={() => setActiveSubTab('irregularities')}
                                className={`pb-3 border-b-2 font-black text-xs uppercase tracking-wider transition-all ${
                                    activeSubTab === 'irregularities' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Exam Irregularities
                            </button>
                            <button
                                onClick={() => setActiveSubTab('history')}
                                className={`pb-3 border-b-2 font-black text-xs uppercase tracking-wider transition-all ${
                                    activeSubTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Edit History
                            </button>
                        </div>

                        {/* SUBTAB 1: MARKS ENTRY PROGRESS */}
                        {activeSubTab === 'progress' && (
                            <div className="space-y-4">
                                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                                        <thead className="bg-slate-700 text-white font-bold text-xs uppercase">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Paper</th>
                                                <th className="px-4 py-3 text-left">Subject Teacher</th>
                                                <th className="px-4 py-3 text-center w-28">Enrollment</th>
                                                <th className="px-6 py-3 text-left">Marks Entry Progress</th>
                                                <th className="px-4 py-3 text-center w-32">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {classPaperRows.map(cRow => {
                                                const isExpanded = expandedClasses[cRow.classKey];
                                                return (
                                                    <React.Fragment key={cRow.classKey}>
                                                        {/* Class Accordion Header Row */}
                                                        <tr className="bg-slate-100 dark:bg-slate-800/60 font-bold text-xs text-slate-900 dark:text-white">
                                                            <td className="px-4 py-3 cursor-pointer flex items-center gap-2" onClick={() => setExpandedClasses(prev => ({ ...prev, [cRow.classKey]: !prev[cRow.classKey] }))}>
                                                                {isExpanded ? <ChevronDownIcon className="w-4 h-4 text-slate-500" /> : <ChevronRightIcon className="w-4 h-4 text-slate-500" />}
                                                                <span>{cRow.className}</span>
                                                            </td>
                                                            <td className="px-4 py-3"></td>
                                                            <td className="px-4 py-3 text-center font-bold">{cRow.enrollment}</td>
                                                            <td className="px-6 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{cRow.overallProgress}% progress</span>
                                                                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${cRow.overallProgress}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => alert(`View Marks for ${cRow.className}`)}
                                                                    className="text-xs font-bold text-blue-600 hover:underline"
                                                                >
                                                                    View Marks
                                                                </button>
                                                            </td>
                                                        </tr>

                                                        {/* Class Inner Paper Rows */}
                                                        {isExpanded && cRow.papers.map(p => (
                                                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-xs">
                                                                <td className="px-4 py-3 pl-10 font-bold text-slate-800 dark:text-slate-200">{p.subject}</td>
                                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{p.teacher}</td>
                                                                <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">{p.enrollment}</td>
                                                                <td className="px-6 py-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-12">{p.progress}%</span>
                                                                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.progress}%` }}></div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => alert(`View Marks for ${p.subject}`)}
                                                                        className="text-xs font-bold text-blue-600 hover:underline"
                                                                    >
                                                                        View Marks
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* SUBTAB 2: EXAM IRREGULARITIES */}
                        {activeSubTab === 'irregularities' && (
                            <div className="space-y-4 py-6 text-center text-slate-400">
                                <SparklesIcon className="w-10 h-10 mx-auto opacity-30 text-amber-500" />
                                <p className="text-xs font-bold uppercase tracking-wider">No exam irregularities or malpractice cases reported for {activeExam.name}.</p>
                            </div>
                        )}

                        {/* SUBTAB 3: EDIT HISTORY */}
                        {activeSubTab === 'history' && (
                            <div className="space-y-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex justify-between">
                                    <span>Created assessment `{activeExam.name}`</span>
                                    <span className="text-slate-400">Today at 08:30 AM</span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex justify-between">
                                    <span>Marks updated for English (Form 3 Central) by Mdm. Faith Kanguha</span>
                                    <span className="text-slate-400">Today at 10:15 AM</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL 1: ADD NEW EXAM (STEP 1 & STEP 2) */}
            {isAddExamModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in">
                        {/* Title Bar */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                            <div>
                                <h3 className="font-bold text-base text-slate-800 dark:text-white">Add exam</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step {wizardStep} of 2</p>
                            </div>
                            <div className="flex items-center gap-3 text-slate-400">
                                <button type="button" className="hover:text-slate-600 text-lg font-bold">+</button>
                                <button type="button" onClick={() => { setIsAddExamModalOpen(false); setWizardStep(1); }} className="hover:text-slate-600">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        {wizardStep === 1 ? (
                            /* STEP 1: GENERAL CONFIG */
                            <div className="p-6 space-y-6">
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    Start by choosing the type of exam you want to create from the three options below.
                                </p>

                                {/* Creation Method Radio Group */}
                                <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="creationMethod"
                                            checked={creationMethod === 'raw_marks'}
                                            onChange={() => setCreationMethod('raw_marks')}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Allow teachers to enter raw marks</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="creationMethod"
                                            checked={creationMethod === 'combine'}
                                            onChange={() => setCreationMethod('combine')}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Combine existing exams</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="creationMethod"
                                            checked={creationMethod === 'excel'}
                                            onChange={() => setCreationMethod('excel')}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Import exam results from Excel</span>
                                    </label>
                                </div>

                                {/* Form Fields Table/Grid */}
                                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    {/* Exam Name */}
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Exam name</label>
                                        <div className="col-span-2">
                                            <input
                                                type="text"
                                                value={newExamName}
                                                onChange={e => setNewExamName(e.target.value)}
                                                placeholder="e.g County pre-mock"
                                                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Exam Type */}
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Exam type</label>
                                        <div className="col-span-2 flex items-center gap-6 text-xs text-slate-700 dark:text-slate-300">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="examTypeRadio"
                                                    checked={newExamTypeRadio === 'CAT'}
                                                    onChange={() => setNewExamTypeRadio('CAT')}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>CAT</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="examTypeRadio"
                                                    checked={newExamTypeRadio === 'End Term'}
                                                    onChange={() => setNewExamTypeRadio('End Term')}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>End Term</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="examTypeRadio"
                                                    checked={newExamTypeRadio === 'Inter-school'}
                                                    onChange={() => setNewExamTypeRadio('Inter-school')}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>Inter-school</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Academic Year */}
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Academic year</label>
                                        <div className="col-span-2 relative">
                                            <select
                                                value={newAcademicYear}
                                                onChange={e => setNewAcademicYear(e.target.value)}
                                                className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="2026">2026</option>
                                                <option value="2025">2025</option>
                                                <option value="2024">2024</option>
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Term */}
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Term</label>
                                        <div className="col-span-2 relative">
                                            <select
                                                value={newTerm}
                                                onChange={e => setNewTerm(e.target.value)}
                                                className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="Term 1">Term 1</option>
                                                <option value="Term 2">Term 2</option>
                                                <option value="Term 3">Term 3</option>
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Grading System */}
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Grading system</label>
                                        <div className="col-span-2 relative">
                                            <select
                                                value={newGradingSystem}
                                                onChange={e => setNewGradingSystem(e.target.value)}
                                                className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="Main grading system">Main grading system</option>
                                                <option value="8-4-4 KCSE Grading">8-4-4 KCSE Grading</option>
                                                <option value="CBC Standardized Grading">CBC Standardized Grading</option>
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Exam Starts On */}
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Exam starts on</label>
                                        <div className="col-span-2">
                                            <input
                                                type="date"
                                                value={newExamStartDate}
                                                onChange={e => setNewExamStartDate(e.target.value)}
                                                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Marks Submission Deadline */}
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Marks submission deadline</label>
                                        <div className="col-span-2">
                                            <input
                                                type="date"
                                                value={newExamSubmissionDate}
                                                onChange={e => setNewExamSubmissionDate(e.target.value)}
                                                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* STEP 2: STUDENTS & PAPERS SCOPE & UNIQUE RANKING CRITERIA */
                            <div className="p-6 space-y-6">
                                {/* Instructions prompt matching exact wording */}
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                                    Specify the students that will be sitting this exam by entering student names, admission or class name. If not all subjects will be tested, click <span className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">'Papers to Test'</span> to choose papers being tested. You can also specify a unique ranking criteria to be used on this exam only.
                                </p>

                                {/* Section 1: Student Scope & Search */}
                                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Students Sitting Exam</label>
                                    <input
                                        type="text"
                                        value={targetStudentSearch}
                                        onChange={e => setTargetStudentSearch(e.target.value)}
                                        placeholder="Search student names, admission no. or class..."
                                        className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                    />

                                    {/* Target Classes Selector */}
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {['Form 3 Central', 'Form 3 South', 'Form 3 East', 'Form 3 West', 'Grade 10 Central'].map(cName => {
                                            const isSelected = selectedClasses.includes(cName);
                                            return (
                                                <button
                                                    key={cName}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedClasses(prev =>
                                                            isSelected ? prev.filter(c => c !== cName) : [...prev, cName]
                                                        );
                                                    }}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                                                        isSelected
                                                            ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-300 text-blue-600 dark:text-blue-300'
                                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-500'
                                                    }`}
                                                >
                                                    {isSelected ? '✓ ' : '+ '}{cName}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Section 2: Papers to Test Button */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-white">Exam Papers</h4>
                                        <p className="text-[10px] text-slate-400">{testedPaperConfigs.filter(p => p.enabled).length} paper components configured for testing</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsPapersModalOpen(true)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-sm transition-all flex items-center gap-1.5"
                                    >
                                        <DocumentTextIcon className="w-4 h-4" /> Papers to Test
                                    </button>
                                </div>

                                {/* Section 3: Unique Ranking Criteria */}
                                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-white">
                                        <input
                                            type="checkbox"
                                            checked={useCustomRanking}
                                            onChange={e => setUseCustomRanking(e.target.checked)}
                                            className="text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span>Specify a unique ranking criteria for this exam only</span>
                                    </label>

                                    {useCustomRanking && (
                                        <div className="space-y-4 pl-6 pt-1 animate-fade-in">
                                            {/* Scope Radio options: Overall vs Per-Class */}
                                            <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-700 dark:text-slate-300">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="rankingScope"
                                                        checked={rankingScope === 'overall'}
                                                        onChange={() => setRankingScope('overall')}
                                                        className="text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span>Overall (All sitting classes)</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="rankingScope"
                                                        checked={rankingScope === 'per_class'}
                                                        onChange={() => setRankingScope('per_class')}
                                                        className="text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span>Specify unique criteria per class</span>
                                                </label>
                                            </div>

                                            {rankingScope === 'overall' ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Criteria</label>
                                                        <select
                                                            value={customRankingCriteria}
                                                            onChange={e => setCustomRankingCriteria(e.target.value as any)}
                                                            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white"
                                                        >
                                                            <option value="Points">Points</option>
                                                            <option value="Total Marks">Total Marks</option>
                                                            <option value="Mean Score">Mean Score</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Subjects Count</label>
                                                        <select
                                                            value={customRankingSubjectsCount}
                                                            onChange={e => setCustomRankingSubjectsCount(parseInt(e.target.value) || 7)}
                                                            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white"
                                                        >
                                                            <option value={7}>7 Subjects</option>
                                                            <option value={8}>8 Subjects</option>
                                                            <option value={9}>9 Subjects</option>
                                                            <option value={10}>10 Subjects</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Per Class Table View */
                                                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm max-h-48 overflow-y-auto">
                                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                                        <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-400">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left">Class Name</th>
                                                                <th className="px-3 py-2 text-center w-16">Rank</th>
                                                                <th className="px-3 py-2 text-left">Criteria</th>
                                                                <th className="px-3 py-2 text-center w-24">Subjects</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                            {selectedClasses.map(cName => {
                                                                const conf = perClassRankingSettings[cName] || { criteria: 'Points', subjectsCount: 7, enabled: true };
                                                                return (
                                                                    <tr key={cName} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                                                        <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">{cName}</td>
                                                                        <td className="px-3 py-2 text-center">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={conf.enabled}
                                                                                onChange={e => {
                                                                                    setPerClassRankingSettings(prev => ({
                                                                                        ...prev,
                                                                                        [cName]: { ...conf, enabled: e.target.checked }
                                                                                    }));
                                                                                }}
                                                                                className="text-blue-600 rounded focus:ring-blue-500"
                                                                            />
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            <select
                                                                                value={conf.criteria}
                                                                                disabled={!conf.enabled}
                                                                                onChange={e => {
                                                                                    setPerClassRankingSettings(prev => ({
                                                                                        ...prev,
                                                                                        [cName]: { ...conf, criteria: e.target.value as any }
                                                                                    }));
                                                                                }}
                                                                                className="w-full h-7 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold disabled:opacity-50"
                                                                            >
                                                                                <option value="Points">Points</option>
                                                                                <option value="Total Marks">Total Marks</option>
                                                                                <option value="Mean Score">Mean Score</option>
                                                                            </select>
                                                                        </td>
                                                                        <td className="px-3 py-2 text-center">
                                                                            <select
                                                                                value={conf.subjectsCount}
                                                                                disabled={!conf.enabled}
                                                                                onChange={e => {
                                                                                    setPerClassRankingSettings(prev => ({
                                                                                        ...prev,
                                                                                        [cName]: { ...conf, subjectsCount: parseInt(e.target.value) || 7 }
                                                                                    }));
                                                                                }}
                                                                                className="w-full h-7 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold text-center disabled:opacity-50"
                                                                            >
                                                                                <option value={7}>7</option>
                                                                                <option value={8}>8</option>
                                                                                <option value={9}>9</option>
                                                                                <option value={10}>10</option>
                                                                            </select>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Modal Footer Buttons */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            {wizardStep === 2 ? (
                                <button
                                    type="button"
                                    onClick={() => setWizardStep(1)}
                                    className="px-5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium text-xs rounded transition-all"
                                >
                                    &larr; Back
                                </button>
                            ) : <div></div>}

                            <div className="flex items-center gap-3">
                                {wizardStep === 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!newExamName.trim()) {
                                                alert('Please enter an exam name.');
                                                return;
                                            }
                                            setWizardStep(2);
                                        }}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-sm transition-all"
                                    >
                                        Next &rarr;
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleCreateExam}
                                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow-sm transition-all"
                                    >
                                        Save & Create Exam
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => { setIsAddExamModalOpen(false); setWizardStep(1); }}
                                    className="px-6 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium text-xs rounded transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: PAPERS TO TEST & MAX SCORE CONVERSION CONFIGURATION */}
            {isPapersModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                            <div>
                                <h4 className="font-bold text-sm text-slate-800 dark:text-white uppercase">Papers to Test & Max Input Score</h4>
                                <p className="text-[10px] text-slate-400 font-medium">Configure maximum raw input marks per paper (e.g. Math Paper 1: 30 marks) & auto-conversion to 100%.</p>
                            </div>
                            <button onClick={() => setIsPapersModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XIcon className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 shadow-sm max-h-72 overflow-y-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Subject</th>
                                            <th className="px-4 py-3 text-left">Paper Component</th>
                                            <th className="px-4 py-3 text-center w-32">Max Input Score</th>
                                            <th className="px-4 py-3 text-center w-36">Convert to 100%</th>
                                            <th className="px-4 py-3 text-center w-16">Tested</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {testedPaperConfigs.map(tp => (
                                            <tr key={tp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                                <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">{tp.subject}</td>
                                                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-medium">{tp.paperName}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={tp.maxInputScore}
                                                            disabled={!tp.enabled}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                setTestedPaperConfigs(prev => prev.map(item => item.id === tp.id ? { ...item, maxInputScore: val } : item));
                                                            }}
                                                            className="w-16 h-7 px-2 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white disabled:opacity-50"
                                                        />
                                                        <span className="text-[10px] text-slate-400 font-bold">pts</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                        <input
                                                            type="checkbox"
                                                            checked={tp.convertToHundred}
                                                            disabled={!tp.enabled}
                                                            onChange={e => {
                                                                setTestedPaperConfigs(prev => prev.map(item => item.id === tp.id ? { ...item, convertToHundred: e.target.checked } : item));
                                                            }}
                                                            className="text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                                                        />
                                                        <span>&rarr; 100%</span>
                                                    </label>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={tp.enabled}
                                                        onChange={e => {
                                                            setTestedPaperConfigs(prev => prev.map(item => item.id === tp.id ? { ...item, enabled: e.target.checked } : item));
                                                        }}
                                                        className="text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Quick Add Custom Paper Component */}
                            <div className="flex justify-between items-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const subName = prompt('Enter Subject Name (e.g. Computer Studies):', 'Computer Studies');
                                        if (!subName) return;
                                        const pName = prompt('Enter Paper Name (e.g. Paper 1 Practical):', 'Paper 1');
                                        if (!pName) return;
                                        const maxScore = parseInt(prompt('Enter Max Raw Input Score (e.g. 50):', '50') || '50') || 50;

                                        setTestedPaperConfigs(prev => [
                                            ...prev,
                                            { id: `tp_${Date.now()}`, subject: subName, paperName: pName, maxInputScore: maxScore, convertToHundred: true, enabled: true }
                                        ]);
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded transition-all flex items-center gap-1"
                                >
                                    <PlusIcon className="w-3.5 h-3.5" /> Add Custom Paper Component
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsPapersModalOpen(false)}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-md transition-all"
                                >
                                    Save Papers Configuration ({testedPaperConfigs.filter(p => p.enabled).length} Active)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
