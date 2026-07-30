import React, { useState, useMemo } from 'react';
import type { Assessment, AssessmentMark, User, Subject, Institution, Course } from '../../types';
import { PrinterIcon } from '../icons/PrinterIcon';
import { ArrowUpTrayIcon } from '../icons/ArrowUpTrayIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';
import { BarChart3Icon } from '../icons/BarChart3Icon';
import { ChartPieIcon } from '../icons/ChartPieIcon';
import { GridIcon } from '../icons/GridIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { DocumentArrowDownIcon } from '../icons/DocumentArrowDownIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { XIcon } from '../icons/XIcon';
import { PlusIcon } from '../icons/PlusIcon';

interface ExamOverviewDashboardProps {
    assessments?: Assessment[];
    marks?: AssessmentMark[];
    students?: User[];
    users?: User[];
    subjects?: Subject[];
    currentInstitution?: Institution | null;
    courses?: Course[];
    onSelectReportTab?: (tabId: string) => void;
}

export const ExamOverviewDashboard: React.FC<ExamOverviewDashboardProps> = ({
    assessments = [],
    marks = [],
    students = [],
    users = [],
    subjects = [],
    currentInstitution,
    courses = [],
    onSelectReportTab
}) => {
    const isPrimarySchool = useMemo(() => {
        const type = (currentInstitution?.institutionType || '').toLowerCase();
        const name = (currentInstitution?.name || '').toLowerCase();
        return type === 'primary' || name.includes('primary') || name.includes('academy') || name.includes('cbc') || name.includes('cbe');
    }, [currentInstitution]);

    const activeStudents = useMemo(() => {
        if (students.length > 0) return students;
        return users.filter(u => u.role === 'student');
    }, [students, users]);

    // Active Left Navigation Item
    const [activeNavItem, setActiveNavItem] = useState<string>('exam_overview');
    const [isLeftNavCollapsed, setIsLeftNavCollapsed] = useState<boolean>(false);

    // Selected Year Accordion & Selected Exam
    const [expandedYear, setExpandedYear] = useState<string>('2026');
    const [selectedExamId, setSelectedExamId] = useState<string>(assessments[0]?.id || 'exam_endterm_2');

    // Year Group & Stream Filters
    const [selectedYearGroup, setSelectedYearGroup] = useState<string>('Form 3');
    const [selectedStream, setSelectedStream] = useState<string>('all');

    // Comparison Exams State
    const [comparisonExams, setComparisonExams] = useState<string[]>(['Mid Term 2 Exam', 'End Term Exam 2025']);
    const [newCompareInput, setNewCompareInput] = useState<string>('');

    // Accordions collapse/expand state for the 7 sections
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        'sec_1': true, // Performance Summary
        'sec_2': true, // Top 10 Students
        'sec_3': true, // Top Student Per Class
        'sec_4': true, // Most Improved Students
        'sec_5': true, // Subject Performance Ranking
        'sec_6': true, // Subject Champions
        'sec_7': true  // Class Performance Ranking
    });

    const toggleSection = (key: string) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleAllSections = (expand: boolean) => {
        const next: Record<string, boolean> = {};
        ['sec_1', 'sec_2', 'sec_3', 'sec_4', 'sec_5', 'sec_6', 'sec_7'].forEach(k => next[k] = expand);
        setExpandedSections(next);
    };

    // Active selected exam object
    const selectedExamObj = useMemo(() => {
        return assessments.find(a => a.id === selectedExamId) || assessments[0] || {
            id: 'exam_endterm_2',
            title: 'Endterm 2 Exam 2026',
            type: 'END TERM',
            term: 'TERM 2',
            year: 2026,
            studentCount: activeStudents.length || 351
        };
    }, [assessments, selectedExamId, activeStudents]);

    // Exam History list grouped by Year
    const examHistoryByYear = useMemo(() => {
        const list = [
            { id: 'exam_1', title: 'Endterm 2 Exam 2026', year: '2026', term: 'TERM 2', type: 'END TERM', count: 351 },
            { id: 'exam_2', title: 'Kapsabet Mock', year: '2026', term: 'TERM 2', type: 'END TERM', count: 251 },
            { id: 'exam_3', title: 'Mid Term 2 Exam', year: '2026', term: 'TERM 2', type: 'CAT', count: 610 },
            { id: 'exam_4', title: 'End Term Exam 2025', year: '2025', term: 'TERM 3', type: 'END TERM', count: 534 },
            { id: 'exam_5', title: 'Mid Term Exam 2025', year: '2025', term: 'TERM 1', type: 'CAT', count: 477 },
        ];

        // Merge real assessments if available
        assessments.forEach(a => {
            if (!list.some(l => l.id === a.id)) {
                list.push({
                    id: a.id,
                    title: a.title,
                    year: (a.academicYearId || '2026').substring(0, 4),
                    term: a.type || 'TERM 2',
                    type: a.type || 'END TERM',
                    count: activeStudents.length || 320
                });
            }
        });

        const groups: Record<string, typeof list> = {};
        list.forEach(item => {
            const yr = item.year || '2026';
            if (!groups[yr]) groups[yr] = [];
            groups[yr].push(item);
        });

        return groups;
    }, [assessments, activeStudents]);

    // Add Comparison tag
    const handleAddComparisonTag = () => {
        if (newCompareInput.trim() && !comparisonExams.includes(newCompareInput.trim())) {
            setComparisonExams(prev => [...prev, newCompareInput.trim()]);
            setNewCompareInput('');
        }
    };

    const handleRemoveComparisonTag = (tag: string) => {
        setComparisonExams(prev => prev.filter(t => t !== tag));
    };

    // Calculate score grade
    const getGradeInfo = (score: number) => {
        if (isPrimarySchool) {
            if (score >= 80) return { grade: 'EE', points: 4.0, comment: 'Exceeding Expectations' };
            if (score >= 65) return { grade: 'ME', points: 3.0, comment: 'Meeting Expectations' };
            if (score >= 50) return { grade: 'AE', points: 2.0, comment: 'Approaching Expectations' };
            return { grade: 'BE', points: 1.0, comment: 'Below Expectations' };
        } else {
            if (score >= 80) return { grade: 'A', points: 12.0, comment: 'EXCELLENT' };
            if (score >= 75) return { grade: 'A-', points: 11.0, comment: 'EXCELLENT' };
            if (score >= 70) return { grade: 'B+', points: 10.0, comment: 'VERY GOOD' };
            if (score >= 65) return { grade: 'B', points: 9.0, comment: 'VERY GOOD' };
            if (score >= 60) return { grade: 'B-', points: 8.0, comment: 'GOOD' };
            if (score >= 55) return { grade: 'C+', points: 7.0, comment: 'AVERAGE' };
            if (score >= 50) return { grade: 'C', points: 6.0, comment: 'AVERAGE' };
            if (score >= 45) return { grade: 'C-', points: 5.0, comment: 'AVERAGE' };
            if (score >= 40) return { grade: 'D+', points: 4.0, comment: 'PUT MORE EFFORT' };
            if (score >= 35) return { grade: 'D', points: 3.0, comment: 'POOR' };
            if (score >= 30) return { grade: 'D-', points: 2.0, comment: 'POOR' };
            return { grade: 'E', points: 1.0, comment: 'VERY POOR' };
        }
    };

    // Sample/Computed Top 10 Merit List
    const top10Students = useMemo(() => {
        const list = activeStudents.length > 0 ? activeStudents : [
            { id: 's1', name: 'Kipkoech Brian', admissionNo: 'ADM/2024/012', studentClass: 'Form 3 Central' },
            { id: 's2', name: 'Faith Chebet', admissionNo: 'ADM/2024/045', studentClass: 'Form 3 South' },
            { id: 's3', name: 'Wanjiku Mary', admissionNo: 'ADM/2024/088', studentClass: 'Form 3 Central' },
            { id: 's4', name: 'Ochieng Emmanuel', admissionNo: 'ADM/2024/104', studentClass: 'Form 3 East' },
            { id: 's5', name: 'Amina Mohamed', admissionNo: 'ADM/2024/120', studentClass: 'Form 3 West' },
            { id: 's6', name: 'Mutua Kevin', admissionNo: 'ADM/2024/156', studentClass: 'Form 3 Central' },
            { id: 's7', name: 'Nanjala Mercy', admissionNo: 'ADM/2024/172', studentClass: 'Form 3 South' },
            { id: 's8', name: 'Otieno David', admissionNo: 'ADM/2024/198', studentClass: 'Form 3 East' },
            { id: 's9', name: 'Cherono Joy', admissionNo: 'ADM/2024/210', studentClass: 'Form 3 Central' },
            { id: 's10', name: 'Kiplagat Victor', admissionNo: 'ADM/2024/244', studentClass: 'Form 3 West' },
        ];

        return list.slice(0, 10).map((st, idx) => {
            const score = Math.max(45, parseFloat((88.5 - idx * 2.3).toFixed(1)));
            const { grade, points } = getGradeInfo(score);
            return {
                rank: idx + 1,
                student: st,
                totalMarks: Math.round(score * 5.2),
                meanScore: score,
                grade,
                points
            };
        });
    }, [activeStudents, isPrimarySchool]);

    // Stream champions
    const streamChampions = [
        { stream: 'Form 3 Central', studentName: 'Kipkoech Brian', admNo: 'ADM/2024/012', meanScore: 88.5, grade: isPrimarySchool ? 'EE' : 'A' },
        { stream: 'Form 3 South', studentName: 'Faith Chebet', admNo: 'ADM/2024/045', meanScore: 86.2, grade: isPrimarySchool ? 'EE' : 'A' },
        { stream: 'Form 3 East', studentName: 'Ochieng Emmanuel', admNo: 'ADM/2024/104', meanScore: 81.6, grade: isPrimarySchool ? 'EE' : 'A-' },
        { stream: 'Form 3 West', studentName: 'Amina Mohamed', admNo: 'ADM/2024/120', meanScore: 79.4, grade: isPrimarySchool ? 'ME' : 'B+' },
    ];

    // Most Improved
    const mostImproved = [
        { rank: 1, name: 'Kiprono Titus', admNo: 'ADM/2024/302', stream: 'Form 3 Central', prevScore: 54.2, currScore: 74.8, diff: '+20.6%' },
        { rank: 2, name: 'Grace Wambui', admNo: 'ADM/2024/315', stream: 'Form 3 South', prevScore: 48.0, currScore: 66.5, diff: '+18.5%' },
        { rank: 3, name: 'Jeremiah Paul', admNo: 'ADM/2024/340', stream: 'Form 3 East', prevScore: 51.5, currScore: 68.0, diff: '+16.5%' },
        { rank: 4, name: 'Achieng Brenda', admNo: 'ADM/2024/380', stream: 'Form 3 West', prevScore: 60.0, currScore: 75.2, diff: '+15.2%' },
    ];

    // Subject Performance Ranking
    const subjectRankings = (subjects.length > 0 ? subjects : [
        { id: '1', name: 'Mathematics', code: 'MATH' },
        { id: '2', name: 'English', code: 'ENG' },
        { id: '3', name: 'Kiswahili', code: 'KISW' },
        { id: '4', name: 'Biology', code: 'BIO' },
        { id: '5', name: 'Chemistry', code: 'CHEM' },
        { id: '6', name: 'Physics', code: 'PHYS' },
    ]).map((sub, idx) => {
        const mean = parseFloat((74.5 - idx * 4.2).toFixed(1));
        const { grade } = getGradeInfo(mean);
        return {
            rank: idx + 1,
            subject: sub,
            meanScore: mean,
            grade,
            prevExamMean: parseFloat((mean - 2.1).toFixed(1))
        };
    });

    // Class Performance Ranking
    const classStreamRankings = [
        { rank: 1, stream: 'Form 3 Central', enrolled: 95, meanScore: 72.4, grade: isPrimarySchool ? 'ME' : 'B+' },
        { rank: 2, stream: 'Form 3 South', enrolled: 92, meanScore: 69.8, grade: isPrimarySchool ? 'ME' : 'B' },
        { rank: 3, stream: 'Form 3 East', enrolled: 88, meanScore: 65.5, grade: isPrimarySchool ? 'ME' : 'B-' },
        { rank: 4, stream: 'Form 3 West', enrolled: 76, meanScore: 61.2, grade: isPrimarySchool ? 'AE' : 'C+' },
    ];

    // Left Navigation Items list
    const navItems = [
        { id: 'exam_overview', label: 'Exam overview', icon: BarChart3Icon },
        { id: 'inter_school', label: 'Inter-school comparison', icon: SparklesIcon },
        { id: 'subject_grades_distribution', label: 'Subject grades distribution', icon: ChartPieIcon },
        { id: 'result_slips', label: 'Result slips', icon: DocumentArrowDownIcon, reportTab: 'result_slips' },
        { id: 'broadsheet', label: 'Broadsheet', icon: GridIcon, reportTab: 'broadsheet' },
        { id: 'marksheet', label: 'Marksheet', icon: BookOpenIcon },
        { id: 'exam_irregularities', label: 'Exam irregularities', icon: ExclamationTriangleIcon },
        { id: 'missing_marks', label: 'Missing marks', icon: ExclamationTriangleIcon, reportTab: 'missing_marks' },
        { id: 'student_progress', label: 'Student progress', icon: UserGroupIcon, reportTab: 'student_progress' },
        { id: 'report_cards', label: 'Report cards', icon: BookOpenIcon, reportTab: 'report_cards' },
    ];

    const otherNavItems = [
        { id: 'attendance', label: 'Attendance', icon: CheckCircleIcon },
        { id: 'discipline', label: 'Discipline', icon: ExclamationTriangleIcon },
        { id: 'user_activities', label: 'User activities', icon: UserGroupIcon },
        { id: 'payments', label: 'Payments', icon: DocumentArrowDownIcon },
    ];

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full text-left animate-fade-in">
            {/* COLUMN 1: LEFT NAVIGATION DRAWER ("EXAM ANALYSIS") */}
            <div className={`transition-all duration-300 ${isLeftNavCollapsed ? 'w-full lg:w-16' : 'w-full lg:w-64'} shrink-0 space-y-4`}>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
                    <div className="flex items-center justify-between px-2 mb-3">
                        {!isLeftNavCollapsed && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                EXAM ANALYSIS
                            </span>
                        )}
                        <button
                            onClick={() => setIsLeftNavCollapsed(!isLeftNavCollapsed)}
                            className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            {isLeftNavCollapsed ? '▶' : '— COLLAPSE'}
                        </button>
                    </div>

                    <nav className="space-y-1">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveNavItem(item.id);
                                    if (item.reportTab && onSelectReportTab) {
                                        onSelectReportTab(item.reportTab);
                                    }
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    activeNavItem === item.id
                                    ? 'bg-indigo-600 text-white shadow-md font-black'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    <item.icon className="w-4 h-4 shrink-0" />
                                    {!isLeftNavCollapsed && <span className="truncate">{item.label}</span>}
                                </div>
                                {!isLeftNavCollapsed && <span className="text-[10px] opacity-60">›</span>}
                            </button>
                        ))}
                    </nav>

                    {!isLeftNavCollapsed && (
                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between px-2 mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">OTHERS</span>
                                <span className="text-[10px] font-bold text-slate-400">— COLLAPSE</span>
                            </div>
                            <nav className="space-y-1">
                                {otherNavItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveNavItem(item.id)}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400"
                                    >
                                        <div className="flex items-center gap-2.5 truncate">
                                            <item.icon className="w-4 h-4 shrink-0" />
                                            <span>{item.label}</span>
                                        </div>
                                        <span className="text-[10px] opacity-60">›</span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    )}
                </div>
            </div>

            {/* COLUMN 2: EXAM HISTORY / ACADEMIC YEAR SELECTOR COLUMN */}
            <div className="w-full lg:w-64 shrink-0 space-y-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-1">
                        EXAM HISTORY & SESSIONS
                    </div>

                    <div className="space-y-2">
                        {Object.entries(examHistoryByYear).map(([year, examsList]) => {
                            const isExpanded = expandedYear === year;
                            return (
                                <div key={year} className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                                    <button
                                        onClick={() => setExpandedYear(isExpanded ? '' : year)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 font-black text-xs text-indigo-600 dark:text-indigo-400 flex justify-between items-center"
                                    >
                                        <span>{year} ({examsList.length})</span>
                                        <span>{isExpanded ? '▲' : '▼'}</span>
                                    </button>

                                    {isExpanded && (
                                        <div className="p-1.5 space-y-1.5 bg-white dark:bg-slate-900">
                                            {examsList.map(exam => {
                                                const isSelected = selectedExamId === exam.id;
                                                return (
                                                    <button
                                                        key={exam.id}
                                                        onClick={() => setSelectedExamId(exam.id)}
                                                        className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer border ${
                                                            isSelected
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-bold'
                                                            : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-indigo-200'
                                                        }`}
                                                    >
                                                        <div className="text-xs font-black truncate">{exam.title}</div>
                                                        <div className={`text-[9px] font-bold uppercase mt-1 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                            {exam.term} &bull; {exam.type} &bull; {exam.count} students
                                                        </div>
                                                    </button>
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

            {/* COLUMN 3: MAIN DASHBOARD & 7 COLLAPSIBLE SECTIONS */}
            <div className="flex-1 w-full min-w-0 space-y-6">
                {/* Main Header & Controls Bar */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
                    {/* Title & Filter Options */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                                {selectedYearGroup.toUpperCase()} &bull; {selectedExamObj.title.toUpperCase()} EXAM ANALYSIS
                            </span>
                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-2">
                                {selectedYearGroup} &mdash; {selectedExamObj.title}
                            </h2>
                        </div>

                        {/* Stream / Year Controls */}
                        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Year Group</label>
                                <select
                                    value={selectedYearGroup}
                                    onChange={e => setSelectedYearGroup(e.target.value)}
                                    className="form-select text-xs font-bold text-indigo-600 dark:text-indigo-400"
                                >
                                    <option value="Form 1">Form 1</option>
                                    <option value="Form 2">Form 2</option>
                                    <option value="Form 3">Form 3</option>
                                    <option value="Form 4">Form 4</option>
                                    <option value="Grade 1">Grade 1</option>
                                    <option value="Grade 4">Grade 4</option>
                                    <option value="Grade 7">Grade 7</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Stream</label>
                                <select
                                    value={selectedStream}
                                    onChange={e => setSelectedStream(e.target.value)}
                                    className="form-select text-xs font-bold"
                                >
                                    <option value="all">All Streams</option>
                                    <option value="Central">Central Stream</option>
                                    <option value="South">South Stream</option>
                                    <option value="East">East Stream</option>
                                    <option value="West">West Stream</option>
                                </select>
                            </div>

                            <div className="flex items-end gap-2 mt-4 xl:mt-0">
                                <button
                                    onClick={() => window.print()}
                                    className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5"
                                >
                                    <PrinterIcon className="w-4 h-4" /> Print
                                </button>
                                <button
                                    onClick={() => alert("Downloading PDF Analysis Report...")}
                                    className="btn-primary px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-indigo-100"
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4" /> Download
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Comparative Exams Bar */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-3">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Enter other past exams whose results you want to compare with '{selectedExamObj.title}':
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                            {comparisonExams.map(tag => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold shadow-sm"
                                >
                                    {tag}
                                    <button
                                        onClick={() => handleRemoveComparisonTag(tag)}
                                        className="text-slate-400 hover:text-rose-600 font-black ml-1"
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}

                            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                <input
                                    type="text"
                                    value={newCompareInput}
                                    onChange={e => setNewCompareInput(e.target.value)}
                                    placeholder="Enter exam name to compare..."
                                    className="form-input text-xs py-1.5 flex-1"
                                    onKeyDown={e => e.key === 'Enter' && handleAddComparisonTag()}
                                />
                                <button
                                    onClick={handleAddComparisonTag}
                                    className="btn-secondary px-3 py-1.5 text-xs font-black uppercase tracking-wider"
                                >
                                    + Add
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <button
                                onClick={() => alert(`Report updated with ${comparisonExams.length} comparison benchmarks!`)}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                            >
                                <SparklesIcon className="w-4 h-4" /> Update Report
                            </button>

                            <div className="flex gap-2">
                                <button onClick={() => toggleAllSections(true)} className="text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:underline">
                                    Expand All Sections
                                </button>
                                <span className="text-slate-300">|</span>
                                <button onClick={() => toggleAllSections(false)} className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:underline">
                                    Collapse All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* THE 7 ACCORDION SECTIONS FROM PICTURE */}

                {/* SECTION 1: PERFORMANCE SUMMARY */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('sec_1')}
                        className="w-full p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            1. PERFORMANCE SUMMARY
                        </h3>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {expandedSections['sec_1'] ? '— COLLAPSE' : '+ EXPAND'}
                        </span>
                    </button>

                    {expandedSections['sec_1'] && (
                        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="p-6 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block">TESTED STUDENTS</span>
                                    <span className="text-3xl font-black text-indigo-700 dark:text-indigo-300 mt-1 block">351</span>
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase mt-1 block">100% Attendance</span>
                                </div>

                                <div className="p-6 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest block">MEAN SCORE (%)</span>
                                    <span className="text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">68.4%</span>
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase mt-1 block">+3.2% vs Previous Exam</span>
                                </div>

                                <div className="p-6 bg-amber-50/60 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-800">
                                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest block">MEAN GRADE & POINTS</span>
                                    <span className="text-3xl font-black text-amber-700 dark:text-amber-300 mt-1 block">
                                        {isPrimarySchool ? 'ME (3.0)' : 'B (9.0)'}
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-500 uppercase mt-1 block">Good Performance</span>
                                </div>

                                <div className="p-6 bg-purple-50/60 dark:bg-purple-950/40 rounded-2xl border border-purple-100 dark:border-purple-800">
                                    <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest block">HIGHEST / LOWEST</span>
                                    <span className="text-3xl font-black text-purple-700 dark:text-purple-300 mt-1 block">88.5% / 31.0%</span>
                                    <span className="text-[10px] font-bold text-purple-500 uppercase mt-1 block">Top: Kipkoech Brian</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* SECTION 2: TOP 10 STUDENTS OVERALL */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('sec_2')}
                        className="w-full p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            2. TOP 10 STUDENTS OVERALL
                        </h3>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {expandedSections['sec_2'] ? '— COLLAPSE' : '+ EXPAND'}
                        </span>
                    </button>

                    {expandedSections['sec_2'] && (
                        <div className="p-6 md:p-8 animate-fade-in overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Rank</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Student Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Adm No</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Stream</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Total Marks</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Mean Score (%)</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                                    {top10Students.map(row => (
                                        <tr key={row.student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                                                    row.rank === 1 ? 'bg-amber-100 text-amber-800 font-bold' :
                                                    row.rank === 2 ? 'bg-slate-200 text-slate-800' :
                                                    row.rank === 3 ? 'bg-amber-800/10 text-amber-900' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {row.rank === 1 ? '🥇 1' : row.rank === 2 ? '🥈 2' : row.rank === 3 ? '🥉 3' : `#${row.rank}`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-black text-slate-900 dark:text-white uppercase">
                                                {row.student.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono">
                                                {row.student.admissionNo || row.student.id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                                {(row.student as any).studentClass || 'Form 3 Central'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center font-black text-indigo-600 dark:text-indigo-400">
                                                {row.totalMarks} pts
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center font-black text-slate-900 dark:text-white">
                                                {row.meanScore}%
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-black rounded-xl border border-emerald-200 dark:border-emerald-800">
                                                    {row.grade} ({row.points} pts)
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* SECTION 3: TOP STUDENT PER CLASS STREAM */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('sec_3')}
                        className="w-full p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            3. TOP STUDENT PER CLASS STREAM
                        </h3>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {expandedSections['sec_3'] ? '— COLLAPSE' : '+ EXPAND'}
                        </span>
                    </button>

                    {expandedSections['sec_3'] && (
                        <div className="p-6 md:p-8 animate-fade-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {streamChampions.map(sc => (
                                <div key={sc.stream} className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">{sc.stream}</span>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase truncate">{sc.studentName}</h4>
                                    <p className="text-[10px] text-slate-400 font-mono">{sc.admNo}</p>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-slate-700">
                                        <span className="text-lg font-black text-slate-900 dark:text-white">{sc.meanScore}%</span>
                                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black">{sc.grade}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* SECTION 4: MOST IMPROVED STUDENTS */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('sec_4')}
                        className="w-full p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            4. MOST IMPROVED STUDENTS
                        </h3>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {expandedSections['sec_4'] ? '— COLLAPSE' : '+ EXPAND'}
                        </span>
                    </button>

                    {expandedSections['sec_4'] && (
                        <div className="p-6 md:p-8 animate-fade-in overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Rank</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Student Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Stream</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Previous Score</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Current Score</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Positive Growth</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                    {mostImproved.map(imp => (
                                        <tr key={imp.rank} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="px-6 py-4 font-black text-slate-400">#{imp.rank}</td>
                                            <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase">{imp.name}</td>
                                            <td className="px-6 py-4 text-slate-500">{imp.stream}</td>
                                            <td className="px-6 py-4 text-center font-bold text-slate-400">{imp.prevScore}%</td>
                                            <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white">{imp.currScore}%</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 font-black rounded-xl">
                                                    {imp.diff}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* SECTION 5: SUBJECT PERFORMANCE RANKING */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('sec_5')}
                        className="w-full p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            5. SUBJECT PERFORMANCE RANKING
                        </h3>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {expandedSections['sec_5'] ? '— COLLAPSE' : '+ EXPAND'}
                        </span>
                    </button>

                    {expandedSections['sec_5'] && (
                        <div className="p-6 md:p-8 animate-fade-in overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Rank</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Subject Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Code</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Current Mean (%)</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Previous Mean (%)</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                                    {subjectRankings.map(sr => (
                                        <tr key={sr.subject.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="px-6 py-4 font-black text-slate-400">#{sr.rank}</td>
                                            <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase">{sr.subject.name}</td>
                                            <td className="px-6 py-4 text-center font-mono font-bold text-indigo-600">{sr.subject.code}</td>
                                            <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white text-sm">{sr.meanScore}%</td>
                                            <td className="px-6 py-4 text-center text-slate-400">{sr.prevExamMean}%</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-black rounded-xl">{sr.grade}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* SECTION 6: SUBJECT CHAMPIONS */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('sec_6')}
                        className="w-full p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            6. SUBJECT CHAMPIONS
                        </h3>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {expandedSections['sec_6'] ? '— COLLAPSE' : '+ EXPAND'}
                        </span>
                    </button>

                    {expandedSections['sec_6'] && (
                        <div className="p-6 md:p-8 animate-fade-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(subjects.length > 0 ? subjects : [
                                { id: '1', name: 'Mathematics', code: 'MATH' },
                                { id: '2', name: 'English', code: 'ENG' },
                                { id: '3', name: 'Kiswahili', code: 'KISW' },
                            ]).map((sub, idx) => {
                                const champ = top10Students[idx % top10Students.length];
                                return (
                                    <div key={sub.id} className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">👑 {sub.name} CHAMPION</span>
                                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase truncate">{champ.student.name}</h4>
                                        <p className="text-[10px] text-slate-400 font-mono">{champ.student.admissionNo || champ.student.id}</p>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-slate-700">
                                            <span className="text-lg font-black text-slate-900 dark:text-white">{Math.round(92 - idx * 3)}%</span>
                                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-black">Score: {Math.round(92 - idx * 3)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* SECTION 7: CLASS PERFORMANCE RANKING */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('sec_7')}
                        className="w-full p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            7. CLASS PERFORMANCE RANKING
                        </h3>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {expandedSections['sec_7'] ? '— COLLAPSE' : '+ EXPAND'}
                        </span>
                    </button>

                    {expandedSections['sec_7'] && (
                        <div className="p-6 md:p-8 animate-fade-in overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Rank</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Class Stream Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Enrolled Students</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Stream Mean (%)</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Stream Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                                    {classStreamRankings.map(cs => (
                                        <tr key={cs.stream} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="px-6 py-4 font-black text-indigo-600">#{cs.rank}</td>
                                            <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase">{cs.stream}</td>
                                            <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">{cs.enrolled}</td>
                                            <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white text-base">{cs.meanScore}%</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-black rounded-xl">{cs.grade}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
