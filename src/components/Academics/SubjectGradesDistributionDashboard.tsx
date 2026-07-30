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
import * as XLSX from 'xlsx';

interface SubjectGradesDistributionDashboardProps {
    assessments?: Assessment[];
    marks?: AssessmentMark[];
    students?: User[];
    users?: User[];
    subjects?: Subject[];
    currentInstitution?: Institution | null;
    courses?: Course[];
    onSelectReportTab?: (tabId: string) => void;
}

export const SubjectGradesDistributionDashboard: React.FC<SubjectGradesDistributionDashboardProps> = ({
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

    // Navigation & Layout States
    const [activeNavItem, setActiveNavItem] = useState<string>('subject_grades_distribution');
    const [isLeftNavCollapsed, setIsLeftNavCollapsed] = useState<boolean>(false);

    // Exam & Year States
    const [expandedYear, setExpandedYear] = useState<string>('2026');
    const [selectedExamId, setSelectedExamId] = useState<string>(assessments[0]?.id || 'exam_endterm_2');
    const [selectedYearGroup, setSelectedYearGroup] = useState<string>('Form 3');
    const [selectedStream, setSelectedStream] = useState<string>('all');
    const [searchSubject, setSearchSubject] = useState<string>('');

    // Collapsed subjects map
    const [collapsedSubjects, setCollapsedSubjects] = useState<Record<string, boolean>>({});

    const toggleSubjectCollapse = (subjectId: string) => {
        setCollapsedSubjects(prev => ({ ...prev, [subjectId]: !prev[subjectId] }));
    };

    const toggleAllSubjects = (collapse: boolean) => {
        const next: Record<string, boolean> = {};
        activeSubjects.forEach(s => next[s.id] = collapse);
        setCollapsedSubjects(next);
    };

    // Active selected exam object
    const selectedExamObj = useMemo(() => {
        return assessments.find(a => a.id === selectedExamId) || assessments[0] || {
            id: 'exam_endterm_2',
            title: 'Endterm 2 Exam 2026',
            type: 'END TERM',
            term: 'TERM 2',
            year: 2026,
            studentCount: activeStudents.length || 361
        };
    }, [assessments, selectedExamId, activeStudents]);

    // Grade Columns headers
    const gradeHeaders = isPrimarySchool
        ? ['EE', 'ME', 'AE', 'BE', 'X']
        : ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E', 'X'];

    // Stream options
    const streamsList = ['Form 3 East', 'Form 3 South', 'Form 3 Central', 'Form 3 West'];

    // Active Subjects list
    const activeSubjects = useMemo(() => {
        const list = subjects.length > 0 ? subjects : [
            { id: 'sub_eng', name: 'English', code: 'ENG' },
            { id: 'sub_kisw', name: 'Kiswahili', code: 'KISW' },
            { id: 'sub_math', name: 'Mathematics', code: 'MATH' },
            { id: 'sub_bio', name: 'Biology', code: 'BIO' },
            { id: 'sub_chem', name: 'Chemistry', code: 'CHEM' },
            { id: 'sub_phys', name: 'Physics', code: 'PHYS' },
            { id: 'sub_geo', name: 'Geography', code: 'GEO' },
            { id: 'sub_hist', name: 'History & Government', code: 'HIST' },
            { id: 'sub_cre', name: 'CRE', code: 'CRE' },
            { id: 'sub_bst', name: 'Business Studies', code: 'BST' },
        ];

        if (!searchSubject.trim()) return list;
        const q = searchSubject.toLowerCase();
        return list.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }, [subjects, searchSubject]);

    // Exam History grouped by Year
    const examHistoryByYear = useMemo(() => {
        const list = [
            { id: 'exam_1', title: 'Endterm 2 Exam 2026', year: '2026', term: 'TERM 2', type: 'END TERM', count: 361 },
            { id: 'exam_2', title: 'Kapseret Mock', year: '2026', term: 'TERM 2', type: 'END TERM', count: 251 },
            { id: 'exam_3', title: 'Mid Term 2 Exam', year: '2026', term: 'TERM 2', type: 'CAT', count: 610 },
            { id: 'exam_4', title: 'End Term Exam', year: '2026', term: 'TERM 1', type: 'END TERM', count: 594 },
            { id: 'exam_5', title: 'Mid Term Exam', year: '2026', term: 'TERM 1', type: 'CAT', count: 477 },
        ];

        const groups: Record<string, typeof list> = {};
        list.forEach(item => {
            const yr = item.year || '2026';
            if (!groups[yr]) groups[yr] = [];
            groups[yr].push(item);
        });

        return groups;
    }, []);

    // Generate distribution matrix data per subject and per stream
    const subjectDistributionMatrix = useMemo(() => {
        const matrix: Record<string, {
            streamRows: { stream: string; counts: Record<string, number> }[];
            totalCounts: Record<string, number>;
            totalStudents: number;
        }> = {};

        activeSubjects.forEach((subj, sIdx) => {
            const streamRows: { stream: string; counts: Record<string, number> }[] = [];
            const totalCounts: Record<string, number> = {};
            gradeHeaders.forEach(g => totalCounts[g] = 0);
            let totalStudents = 0;

            streamsList.forEach((stName, stIdx) => {
                const counts: Record<string, number> = {};
                gradeHeaders.forEach(g => counts[g] = 0);

                // Deterministic sample realistic distribution matching image pattern
                if (isPrimarySchool) {
                    counts['EE'] = (sIdx + stIdx) % 4;
                    counts['ME'] = 12 + ((sIdx * 3 + stIdx) % 15);
                    counts['AE'] = 10 + ((sIdx * 2 + stIdx) % 12);
                    counts['BE'] = 5 + ((sIdx + stIdx * 2) % 8);
                    counts['X'] = 0;
                } else {
                    counts['A'] = (sIdx + stIdx) % 2;
                    counts['A-'] = (sIdx * 2 + stIdx) % 3;
                    counts['B+'] = 1 + ((sIdx + stIdx) % 4);
                    counts['B'] = (sIdx + stIdx) % 3;
                    counts['B-'] = 2 + ((sIdx * 2 + stIdx) % 5);
                    counts['C+ font'] = 1 + ((sIdx + stIdx) % 4);
                    counts['C+'] = 1 + ((sIdx + stIdx) % 3);
                    counts['C'] = 2 + ((sIdx + stIdx * 2) % 6);
                    counts['C-'] = 4 + ((sIdx * 3 + stIdx) % 5);
                    counts['D+'] = 2 + ((sIdx + stIdx) % 6);
                    counts['D'] = 3 + ((sIdx * 2 + stIdx) % 7 || 3);
                    counts['D-'] = 4 + ((sIdx + stIdx) % 8);
                    counts['E'] = 18 + ((sIdx * 5 + stIdx * 4) % 14);
                    counts['X'] = 0;
                }

                gradeHeaders.forEach(g => {
                    totalCounts[g] += counts[g] || 0;
                    totalStudents += counts[g] || 0;
                });

                streamRows.push({ stream: stName, counts });
            });

            matrix[subj.id] = { streamRows, totalCounts, totalStudents };
        });

        return matrix;
    }, [activeSubjects, gradeHeaders, isPrimarySchool]);

    // Export Matrix to Excel
    const handleExportExcel = () => {
        const exportData: any[] = [];

        activeSubjects.forEach(subj => {
            const data = subjectDistributionMatrix[subj.id];
            if (!data) return;

            // Subject Header Row
            exportData.push({ 'Class / Stream': `=== ${subj.name} (${subj.code}) ===` });

            data.streamRows.forEach(sr => {
                const rowObj: any = { 'Class / Stream': sr.stream };
                gradeHeaders.forEach(g => {
                    rowObj[g] = sr.counts[g] || 0;
                });
                exportData.push(rowObj);
            });

            // Total Row
            const totalObj: any = { 'Class / Stream': `Total (${subj.name})` };
            gradeHeaders.forEach(g => {
                totalObj[g] = data.totalCounts[g] || 0;
            });
            exportData.push(totalObj);
            exportData.push({}); // blank line
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Subject_Grades_Distribution');
        XLSX.writeFile(wb, `Subject_Grades_Distribution_${selectedExamObj.title.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    };

    // Navigation items left drawer
    const navItems = [
        { id: 'exam_overview', label: 'Exam overview', icon: BarChart3Icon, reportTab: 'exam_analysis' },
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
            {/* COLUMN 1: LEFT NAVIGATION DRAWER */}
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

            {/* COLUMN 2: EXAM HISTORY COLUMN */}
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

            {/* COLUMN 3: MAIN SUBJECT GRADES DISTRIBUTION MATRIX DASHBOARD */}
            <div className="flex-1 w-full min-w-0 space-y-6">
                {/* Header Control Panel */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                                {selectedYearGroup.toUpperCase()} &bull; {selectedExamObj.title.toUpperCase()} GRADES DISTRIBUTION
                            </span>
                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-2">
                                {selectedYearGroup} &mdash; {selectedExamObj.title} GRADES DISTRIBUTION
                            </h2>
                        </div>

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
                                    <option value="Grade 4">Grade 4</option>
                                    <option value="Grade 7">Grade 7</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Stream Filter</label>
                                <select
                                    value={selectedStream}
                                    onChange={e => setSelectedStream(e.target.value)}
                                    className="form-select text-xs font-bold"
                                >
                                    <option value="all">All Streams</option>
                                    <option value="Form 3 East">Form 3 East</option>
                                    <option value="Form 3 South">Form 3 South</option>
                                    <option value="Form 3 Central">Form 3 Central</option>
                                    <option value="Form 3 West">Form 3 West</option>
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
                                    onClick={handleExportExcel}
                                    className="btn-primary px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-indigo-100"
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4" /> Download Excel
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filter & Quick Action Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                        <div className="relative w-full sm:w-72">
                            <input
                                type="text"
                                value={searchSubject}
                                onChange={e => setSearchSubject(e.target.value)}
                                placeholder="Search subject name or code..."
                                className="form-input text-xs pl-9 py-2"
                            />
                            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        </div>

                        <div className="flex gap-3 text-[10px] font-black uppercase tracking-wider">
                            <button onClick={() => toggleAllSubjects(false)} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                Expand All Subjects
                            </button>
                            <span className="text-slate-300">|</span>
                            <button onClick={() => toggleAllSubjects(true)} className="text-slate-400 hover:underline">
                                Collapse All Subjects
                            </button>
                        </div>
                    </div>
                </div>

                {/* THE MATRIX TABLE FROM PICTURE */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            {/* Table Header */}
                            <thead className="bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase">
                                <tr>
                                    <th className="p-4 border-b border-slate-200 dark:border-slate-700 w-48">Class / Stream</th>
                                    {gradeHeaders.map(g => (
                                        <th key={g} className="p-3 text-center border-b border-l border-slate-200 dark:border-slate-700 w-12 font-black">
                                            {g}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            {/* Table Body Grouped by Subject */}
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                {activeSubjects.map(subj => {
                                    const data = subjectDistributionMatrix[subj.id];
                                    const isCollapsed = collapsedSubjects[subj.id];
                                    if (!data) return null;

                                    return (
                                        <React.Fragment key={subj.id}>
                                            {/* SUBJECT SECTION HEADER ROW */}
                                            <tr 
                                                onClick={() => toggleSubjectCollapse(subj.id)}
                                                className="bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 cursor-pointer transition-colors"
                                            >
                                                <td colSpan={gradeHeaders.length + 1} className="p-4 font-black uppercase text-indigo-700 dark:text-indigo-300 border-t border-b border-slate-200 dark:border-slate-700">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-400 text-xs">{isCollapsed ? '▶' : '▼'}</span>
                                                            <span className="text-sm font-black">{subj.name}</span>
                                                            <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded-md">
                                                                {subj.code}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {data.totalStudents} Students Examined
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* STREAM ROWS FOR THIS SUBJECT */}
                                            {!isCollapsed && data.streamRows.map(sr => (
                                                <tr key={sr.stream} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="p-3 pl-8 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                                                        {sr.stream}
                                                    </td>
                                                    {gradeHeaders.map(g => {
                                                        const cnt = sr.counts[g] || 0;
                                                        return (
                                                            <td key={g} className={`p-3 text-center font-bold border-l border-slate-100 dark:border-slate-800/60 ${
                                                                cnt > 0 ? (
                                                                    ['A', 'A-', 'EE'].includes(g) ? 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-black' :
                                                                    ['B+', 'B', 'B-', 'ME'].includes(g) ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-black' :
                                                                    ['E', 'BE'].includes(g) ? 'bg-rose-50/60 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-black' :
                                                                    'text-slate-800 dark:text-slate-200'
                                                                ) : 'text-slate-300 dark:text-slate-600 font-normal'
                                                            }`}>
                                                                {cnt}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}

                                            {/* TOTAL SUMMARY ROW FOR THIS SUBJECT */}
                                            {!isCollapsed && (
                                                <tr className="bg-slate-100/60 dark:bg-slate-800/90 font-black border-t-2 border-b-2 border-slate-200 dark:border-slate-700">
                                                    <td className="p-3 pl-8 font-black uppercase text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">
                                                        Total ({subj.name})
                                                    </td>
                                                    {gradeHeaders.map(g => {
                                                        const tot = data.totalCounts[g] || 0;
                                                        return (
                                                            <td key={g} className={`p-3 text-center border-l border-slate-200 dark:border-slate-700 ${
                                                                tot > 0 ? 'text-indigo-700 dark:text-indigo-300 font-black text-sm' : 'text-slate-400 font-normal'
                                                            }`}>
                                                                {tot}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
