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
    const [creationMethod, setCreationMethod] = useState<'raw_marks' | 'combine' | 'excel'>('raw_marks');
    const [newExamName, setNewExamName] = useState('');
    const [newExamTypeRadio, setNewExamTypeRadio] = useState<'CAT' | 'End Term' | 'Inter-school'>('CAT');
    const [newAcademicYear, setNewAcademicYear] = useState('2026');
    const [newTerm, setNewTerm] = useState('Term 2');
    const [newGradingSystem, setNewGradingSystem] = useState('Main grading system');
    const [newExamStartDate, setNewExamStartDate] = useState('2026-07-26');
    const [newExamSubmissionDate, setNewExamSubmissionDate] = useState('2026-08-05');

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

            {/* MODAL 1: ADD NEW EXAM MATCHING SCREENSHOT */}
            {isAddExamModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in">
                        {/* Title Bar */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                            <h3 className="font-bold text-base text-slate-800 dark:text-white">Add exam</h3>
                            <div className="flex items-center gap-3 text-slate-400">
                                <button type="button" className="hover:text-slate-600 text-lg font-bold">+</button>
                                <button type="button" onClick={() => setIsAddExamModalOpen(false)} className="hover:text-slate-600">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Instruction Text */}
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

                        {/* Modal Footer Buttons */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center gap-3">
                            <button
                                type="button"
                                onClick={handleCreateExam}
                                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs rounded transition-all"
                            >
                                Next
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAddExamModalOpen(false)}
                                className="px-6 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium text-xs rounded transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
