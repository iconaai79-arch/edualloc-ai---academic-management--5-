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

interface StudentProgressReportViewProps {
    assessments?: Assessment[];
    marks?: AssessmentMark[];
    students?: User[];
    users?: User[];
    subjects?: Subject[];
    currentInstitution?: Institution | null;
    courses?: Course[];
    onSelectReportTab?: (tabId: string) => void;
}

export const StudentProgressReportView: React.FC<StudentProgressReportViewProps> = ({
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

    // Navigation & Drawer state
    const [activeNavItem, setActiveNavItem] = useState<string>('student_progress');
    const [isLeftNavCollapsed, setIsLeftNavCollapsed] = useState<boolean>(false);

    // Search Student State
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>(activeStudents[0]?.id || 'st_1');

    // Filtered Students dropdown
    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return activeStudents;
        const q = searchQuery.toLowerCase();
        return activeStudents.filter(s =>
            s.name.toLowerCase().includes(q) ||
            (s.admissionNo && s.admissionNo.toLowerCase().includes(q)) ||
            (s as any).studentClass?.toLowerCase().includes(q)
        );
    }, [activeStudents, searchQuery]);

    // Current selected student
    const currentStudent = useMemo(() => {
        return activeStudents.find(s => s.id === selectedStudentId) || activeStudents[0] || {
            id: 'st_1',
            name: "Abdalla's Yahyah Nwampasa",
            admissionNo: '1329',
            studentClass: 'Form 3 West 2026'
        };
    }, [activeStudents, selectedStudentId]);

    // Active Subjects list
    const activeSubjects = useMemo(() => {
        return subjects.length > 0 ? subjects : [
            { id: '1', name: 'English', code: 'ENG' },
            { id: '2', name: 'Kiswahili', code: 'KISW' },
            { id: '3', name: 'MATHS', code: 'MATH' },
            { id: '4', name: 'Biology', code: 'BIO' },
            { id: '5', name: 'Physics', code: 'PHYS' },
            { id: '6', name: 'Chemistry', code: 'CHEM' },
            { id: '7', name: 'History and Government', code: 'HIST' },
            { id: '8', name: 'Geography', code: 'GEO' },
            { id: '9', name: 'Christian Religious Education', code: 'CRE' },
            { id: '10', name: 'Computer Studies', code: 'COMP' },
            { id: '11', name: 'Business Studies', code: 'BST' },
        ];
    }, [subjects]);

    // Exam Terms Header Columns
    const examTermsList = [
        { id: 't2_end', label: 'T2 2026 END' },
        { id: 't2_cat', label: 'T2 2026 CAT' },
        { id: 't1_end', label: 'T1 2026 END' },
        { id: 't1_end2', label: 'T1 2026 END 2' },
        { id: 't1_cat', label: 'T1 2026 CAT' },
    ];

    // Grade calculation helper
    const getGradeInfo = (score: number) => {
        if (isPrimarySchool) {
            if (score >= 80) return { grade: 'EE', pts: 4.0 };
            if (score >= 65) return { grade: 'ME', pts: 3.0 };
            if (score >= 50) return { grade: 'AE', pts: 2.0 };
            return { grade: 'BE', pts: 1.0 };
        } else {
            if (score >= 80) return { grade: 'A', pts: 12.0 };
            if (score >= 75) return { grade: 'A-', pts: 11.0 };
            if (score >= 70) return { grade: 'B+', pts: 10.0 };
            if (score >= 65) return { grade: 'B', pts: 9.0 };
            if (score >= 60) return { grade: 'B-', pts: 8.0 };
            if (score >= 55) return { grade: 'C+', pts: 7.0 };
            if (score >= 50) return { grade: 'C', pts: 6.0 };
            if (score >= 45) return { grade: 'C-', pts: 5.0 };
            if (score >= 40) return { grade: 'D+', pts: 4.0 };
            if (score >= 35) return { grade: 'D', pts: 3.0 };
            if (score >= 30) return { grade: 'D-', pts: 2.0 };
            return { grade: 'E', pts: 1.0 };
        }
    };

    // Overall Performance Exam History Records
    const overallExamRecords = [
        { exam: 'End term Exam', classStream: 'Form 3 West 2026', term: 'Term 2', position: '41 / 205', marks: 540, meanScore: 67.5, meanGrade: isPrimarySchool ? 'ME' : 'B-', meanPoints: 8.0, deviation: '+12.4 marks', positive: true },
        { exam: 'MID TERM 2 EXAM 2026', classStream: 'Form 3 West 2026', term: 'Term 2', position: '71 / 205', marks: 498, meanScore: 62.25, meanGrade: isPrimarySchool ? 'ME' : 'C+', meanPoints: 7.0, deviation: '-8.5 marks', positive: false },
        { exam: 'END TERM EXAM', classStream: 'Form 3 West 2026', term: 'Term 1', position: '72 / 415', marks: 512, meanScore: 64.0, meanGrade: isPrimarySchool ? 'ME' : 'B-', meanPoints: 8.0, deviation: '+5.0 marks', positive: true },
        { exam: 'MID TERM EXAM', classStream: 'Form 3 West 2026', term: 'Term 1', position: '109 / 304', marks: 472, meanScore: 59.0, meanGrade: isPrimarySchool ? 'AE' : 'C', meanPoints: 6.0, deviation: '—', positive: true },
    ];

    // Subject Performance Matrix Data
    const subjectPerformanceMatrix = useMemo(() => {
        return activeSubjects.map((sub, idx) => {
            const termScores: Record<string, { score: number; grade: string }> = {};
            let sum = 0;

            examTermsList.forEach((et, eIdx) => {
                const sc = Math.max(22, Math.min(88, Math.round(55 + (idx * 5 + eIdx * 7) % 35)));
                termScores[et.id] = { score: sc, grade: getGradeInfo(sc).grade };
                sum += sc;
            });

            const avgScore = Math.round(sum / examTermsList.length);
            const avgGrade = getGradeInfo(avgScore).grade;

            return {
                subject: sub,
                termScores,
                avgScore,
                avgGrade
            };
        });
    }, [activeSubjects, examTermsList, isPrimarySchool]);

    // Student KPI Metrics
    const studentKpis = useMemo(() => {
        return {
            avgMarks: 68,
            avgGrade: isPrimarySchool ? 'ME' : 'B-',
            avgPoints: 7.85,
            avgRank: 41
        };
    }, [isPrimarySchool]);

    // Left navigation items
    const navItems = [
        { id: 'exam_overview', label: 'Exam overview', icon: BarChart3Icon, reportTab: 'exam_analysis' },
        { id: 'inter_school', label: 'Inter-school', icon: SparklesIcon },
        { id: 'subject_grades_distribution', label: 'Subject grades distribution', icon: ChartPieIcon, reportTab: 'subject_grades_analysis' },
        { id: 'result_slips', label: 'Result slips', icon: DocumentArrowDownIcon, reportTab: 'result_slips' },
        { id: 'broadsheet', label: 'Broadsheet', icon: GridIcon, reportTab: 'broadsheet' },
        { id: 'marksheet', label: 'Marksheet (Raw Data)', icon: BookOpenIcon, reportTab: 'marksheet' },
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
            <div className={`transition-all duration-300 ${isLeftNavCollapsed ? 'w-full lg:w-16' : 'w-full lg:w-60'} shrink-0 space-y-4`}>
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

            {/* COLUMN 2: STUDENT PROFILE & KEY METRICS HUD */}
            <div className="w-full lg:w-72 shrink-0 space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                    {/* Search student input */}
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search student by name or ID..."
                            className="form-input text-xs pl-8 py-2 w-full"
                        />
                        <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />

                        {searchQuery.trim() && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                {filteredStudents.map(st => (
                                    <button
                                        key={st.id}
                                        onClick={() => {
                                            setSelectedStudentId(st.id);
                                            setSearchQuery('');
                                        }}
                                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-50 dark:border-slate-700/50"
                                    >
                                        <div className="font-black uppercase">{st.name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">ID: {st.admissionNo || st.id}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Student Profile Card */}
                    <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 text-center space-y-2">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400 p-0.5 shadow-md">
                            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-3xl">
                                👤
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">{currentStudent.name}</h3>
                            <span className="text-[10px] text-slate-400 font-mono block">ID: {currentStudent.admissionNo || currentStudent.id}</span>
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                                {(currentStudent as any).studentClass || 'Form 3 West 2026'}
                            </span>
                        </div>
                    </div>

                    {/* 4 Metric KPI Cards */}
                    <div className="space-y-2 text-center">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">AVERAGE MARKS</span>
                            <span className="text-xl font-black text-slate-900 dark:text-white">{studentKpis.avgMarks}%</span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">AVERAGE GRADE</span>
                            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{studentKpis.avgGrade}</span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">AVERAGE POINTS</span>
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{studentKpis.avgPoints}</span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">AVERAGE RANK</span>
                            <span className="text-xl font-black text-amber-500">#{studentKpis.avgRank}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* COLUMN 3: MAIN PROGRESS REPORT DASHBOARD */}
            <div className="flex-1 w-full min-w-0 space-y-6">
                {/* Header Actions */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm flex justify-between items-center">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                            📊 ACADEMIC PROGRESS TRAJECTORY
                        </span>
                        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-1">
                            STUDENT PROGRESS REPORT &bull; {currentStudent.name}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => window.print()} className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                            <PrinterIcon className="w-4 h-4" /> Print
                        </button>
                        <button onClick={() => alert("Downloading Progress Report...")} className="btn-primary px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md">
                            <ArrowUpTrayIcon className="w-4 h-4" /> Download
                        </button>
                    </div>
                </div>

                {/* TRAJECTORY LINE CHART CARD */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                            LAST 5 EXAMS PERFORMANCE SUMMARY
                        </h4>
                        <div className="flex items-center gap-4 text-xs font-bold">
                            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                <span className="w-3 h-3 bg-indigo-600 rounded-full inline-block" /> Student Trend
                            </span>
                            <span className="flex items-center gap-1.5 text-rose-500">
                                <span className="w-3 h-3 bg-rose-500 rounded-full inline-block" /> Class Average
                            </span>
                        </div>
                    </div>

                    {/* SVG Trajectory Chart Representation */}
                    <div className="w-full h-56 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 relative flex flex-col justify-between">
                        <div className="w-full flex-1 relative flex items-center">
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                                {/* Grid lines */}
                                <line x1="0" y1="30" x2="500" y2="30" stroke="currentColor" strokeDasharray="4 4" className="text-slate-200 dark:text-slate-700" />
                                <line x1="0" y1="75" x2="500" y2="75" stroke="currentColor" strokeDasharray="4 4" className="text-slate-200 dark:text-slate-700" />
                                <line x1="0" y1="120" x2="500" y2="120" stroke="currentColor" strokeDasharray="4 4" className="text-slate-200 dark:text-slate-700" />

                                {/* Red Curve: Class Average */}
                                <path
                                    d="M 20 50 Q 120 70, 250 55 T 480 60"
                                    fill="none"
                                    stroke="#ef4444"
                                    strokeWidth="3"
                                />

                                {/* Blue Curve: Student Performance */}
                                <path
                                    d="M 20 130 Q 120 90, 250 50 T 480 80"
                                    fill="none"
                                    stroke="#4f46e5"
                                    strokeWidth="4"
                                />

                                {/* Data points */}
                                <circle cx="20" cy="130" r="5" fill="#4f46e5" />
                                <circle cx="135" cy="90" r="5" fill="#4f46e5" />
                                <circle cx="250" cy="50" r="5" fill="#4f46e5" />
                                <circle cx="365" cy="65" r="5" fill="#4f46e5" />
                                <circle cx="480" cy="80" r="5" fill="#4f46e5" />
                            </svg>
                        </div>

                        {/* Chart X-Axis Labels */}
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span>T2 2026 END</span>
                            <span>T2 2026 CAT</span>
                            <span>T1 2026 END</span>
                            <span>T1 2026 END 2</span>
                            <span>T1 2026 CAT</span>
                        </div>
                    </div>
                </div>

                {/* OVERALL PERFORMANCE TABLE */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm space-y-3">
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                            OVERALL PERFORMANCE HISTORY
                        </h4>
                    </div>

                    <div className="overflow-x-auto p-4">
                        <table className="w-full text-left">
                            <thead className="bg-slate-100/60 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <tr>
                                    <th className="p-3">Exam</th>
                                    <th className="p-3">Class</th>
                                    <th className="p-3">Term</th>
                                    <th className="p-3 text-center">Position</th>
                                    <th className="p-3 text-center">Marks</th>
                                    <th className="p-3 text-center">M.Score</th>
                                    <th className="p-3 text-center">M.Grade</th>
                                    <th className="p-3 text-center">M.Points</th>
                                    <th className="p-3 text-right">Deviation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                                {overallExamRecords.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="p-3 font-black text-slate-900 dark:text-white uppercase">{row.exam}</td>
                                        <td className="p-3 text-slate-500">{row.classStream}</td>
                                        <td className="p-3 text-slate-600 dark:text-slate-300">{row.term}</td>
                                        <td className="p-3 text-center font-bold text-indigo-600 dark:text-indigo-400">{row.position}</td>
                                        <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">{row.marks}</td>
                                        <td className="p-3 text-center font-black text-slate-900 dark:text-white">{row.meanScore}%</td>
                                        <td className="p-3 text-center">
                                            <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-black">
                                                {row.meanGrade}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center text-slate-500 font-bold">{row.meanPoints}</td>
                                        <td className="p-3 text-right font-black">
                                            <span className={`px-2.5 py-1 rounded-xl text-xs ${
                                                row.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                            }`}>
                                                {row.positive ? '▲' : '▼'} {row.deviation}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* SUBJECT PERFORMANCE MATRIX TABLE */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm space-y-3">
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                            SUBJECT PERFORMANCE BREAKDOWN
                        </h4>
                    </div>

                    <div className="overflow-x-auto p-4">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100/60 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <tr>
                                    <th className="p-3">Subject</th>
                                    {examTermsList.map(et => (
                                        <th key={et.id} className="p-3 text-center">{et.label}</th>
                                    ))}
                                    <th className="p-3 text-right">Average</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                                {subjectPerformanceMatrix.map(sp => (
                                    <tr key={sp.subject.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="p-3 font-black text-slate-900 dark:text-white uppercase">{sp.subject.name}</td>
                                        {examTermsList.map(et => {
                                            const item = sp.termScores[et.id];
                                            return (
                                                <td key={et.id} className="p-3 text-center">
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.score}</span>
                                                    <span className="ml-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400">{item.grade}</span>
                                                </td>
                                            );
                                        })}
                                        <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                                            {sp.avgScore}% ({sp.avgGrade})
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};
