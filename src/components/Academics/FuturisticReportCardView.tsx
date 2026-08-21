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
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { FingerPrintIcon } from '../icons/FingerPrintIcon';
import * as XLSX from 'xlsx';

interface FuturisticReportCardViewProps {
    assessments?: Assessment[];
    marks?: AssessmentMark[];
    students?: User[];
    users?: User[];
    subjects?: Subject[];
    currentInstitution?: Institution | null;
    courses?: Course[];
    onSelectReportTab?: (tabId: string) => void;
}

export const FuturisticReportCardView: React.FC<FuturisticReportCardViewProps> = ({
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
    const [activeNavItem, setActiveNavItem] = useState<string>('report_cards');
    const [isLeftNavCollapsed, setIsLeftNavCollapsed] = useState<boolean>(false);

    // Term Selector Accordion
    const [expandedYear, setExpandedYear] = useState<string>('2026');
    const [selectedTerm, setSelectedTerm] = useState<string>('Term 2');
    const [selectedYear, setSelectedYear] = useState<string>('2026');

    // Main Preview Sub-Tab
    const [previewTab, setPreviewTab] = useState<'pdf' | 'subject_comments' | 'overall_comments'>('pdf');

    // Search Student State
    const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>(activeStudents[0]?.id || 'st_1');

    // Filtered Students list by search
    const filteredStudents = useMemo(() => {
        if (!searchStudentQuery.trim()) return activeStudents;
        const q = searchStudentQuery.toLowerCase();
        return activeStudents.filter(s =>
            s.name.toLowerCase().includes(q) ||
            (s.admissionNo && s.admissionNo.toLowerCase().includes(q)) ||
            (s as any).studentClass?.toLowerCase().includes(q)
        );
    }, [activeStudents, searchStudentQuery]);

    // Active selected student object
    const currentStudent = useMemo(() => {
        return activeStudents.find(s => s.id === selectedStudentId) || activeStudents[0] || {
            id: 'st_1',
            name: 'Magdaline Jepkoech',
            admissionNo: '1368',
            gender: 'Female',
            studentClass: 'Form 3 East'
        };
    }, [activeStudents, selectedStudentId]);

    // Subjects list
    const activeSubjects = useMemo(() => {
        return subjects.length > 0 ? subjects : [
            { id: '1', name: 'English', code: 'ENG' },
            { id: '2', name: 'Kiswahili', code: 'KISW' },
            { id: '3', name: 'Mathematics', code: 'MATH' },
            { id: '4', name: 'Biology', code: 'BIO' },
            { id: '5', name: 'Physics', code: 'PHYS' },
            { id: '6', name: 'Chemistry', code: 'CHEM' },
            { id: '7', name: 'Geography', code: 'GEO' },
            { id: '8', name: 'CRE', code: 'CRE' }
        ];
    }, [subjects]);

    // Calculate Grade and Points
    const calculateGrade = (score: number) => {
        if (isPrimarySchool) {
            if (score >= 80) return { grade: 'EE', pts: 4, remark: 'Exceeding Expectations' };
            if (score >= 65) return { grade: 'ME', pts: 3, remark: 'Meeting Expectations' };
            if (score >= 50) return { grade: 'AE', pts: 2, remark: 'Approaching Expectations' };
            return { grade: 'BE', pts: 1, remark: 'Below Expectations' };
        } else {
            if (score >= 80) return { grade: 'A', pts: 12, remark: 'EXCELLENT' };
            if (score >= 75) return { grade: 'A-', pts: 11, remark: 'EXCELLENT' };
            if (score >= 70) return { grade: 'B+', pts: 10, remark: 'VERY GOOD' };
            if (score >= 65) return { grade: 'B', pts: 9, remark: 'VERY GOOD' };
            if (score >= 60) return { grade: 'B-', pts: 8, remark: 'GOOD' };
            if (score >= 55) return { grade: 'C+', pts: 7, remark: 'AVERAGE' };
            if (score >= 50) return { grade: 'C', pts: 6, remark: 'AVERAGE' };
            if (score >= 45) return { grade: 'C-', pts: 5, remark: 'AVERAGE' };
            if (score >= 40) return { grade: 'D+', pts: 4, remark: 'PUT MORE EFFORT' };
            if (score >= 35) return { grade: 'D', pts: 3, remark: 'POOR' };
            if (score >= 30) return { grade: 'D-', pts: 2, remark: 'POOR' };
            return { grade: 'E', pts: 1, remark: 'VERY POOR' };
        }
    };

    // Subject Performance Records
    const subjectPerformance = useMemo(() => {
        return activeSubjects.map((sub, idx) => {
            const mid = 30 + ((currentStudent.id.charCodeAt(0) + idx * 7) % 45);
            const end = 35 + ((currentStudent.id.charCodeAt(0) + idx * 9) % 45);
            const total = Math.round((mid + end) / 2);
            const { grade, pts, remark } = calculateGrade(total);
            const pos = (idx % 4) + 1;
            return {
                subject: sub,
                midTerm: mid,
                endTerm: end,
                total,
                grade,
                pts,
                pos,
                remark,
                teacherSig: sub.code.charAt(0) + '.' + sub.code.charAt(sub.code.length - 1)
            };
        });
    }, [activeSubjects, currentStudent, isPrimarySchool]);

    // Student Overall Summary Stats
    const studentSummary = useMemo(() => {
        const totalScore = subjectPerformance.reduce((a, b) => a + b.total, 0);
        const meanScore = parseFloat((totalScore / subjectPerformance.length).toFixed(2));
        const totalPts = subjectPerformance.reduce((a, b) => a + b.pts, 0);
        const meanPts = parseFloat((totalPts / subjectPerformance.length).toFixed(2));
        const { grade: meanGrade } = calculateGrade(meanScore);

        return {
            totalScore,
            meanScore,
            meanPts,
            meanGrade,
            overallPos: 37,
            totalStudents: 205,
            streamPos: 12,
            streamStudents: 68,
            kcpeScore: '280 C+',
            vap: '+5.7143'
        };
    }, [subjectPerformance, isPrimarySchool]);

    // Historical Performance Progress
    const progressHistory = [
        { period: 'Form 3 Term 2', rank: 37, pts: 1.2857, grade: 'E' },
        { period: 'Form 3 Term 1', rank: 103, pts: 1.5714, grade: 'D-' },
        { period: 'Form 2 Term 3', rank: 46, pts: 2.0909, grade: 'D-' },
        { period: 'Form 2 Term 2', rank: 47, pts: 2.0909, grade: 'D-' },
    ];

    // Accordion Terms Tree
    const yearTermsTree = [
        { year: '2026', terms: ['Term 3', 'Term 2', 'Term 1'] },
        { year: '2025', terms: ['Term 3', 'Term 2', 'Term 1'] },
        { year: '2024', terms: ['Term 3', 'Term 2', 'Term 1'] },
        { year: '2023', terms: ['Term 3', 'Term 2', 'Term 1'] },
        { year: '2022', terms: ['Term 3', 'Term 2', 'Term 1'] },
    ];

    // Left Navigation Items
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

    const cbcNavItems = [
        { id: 'student_summary', label: 'Student summary', icon: UserGroupIcon },
        { id: 'student_subject_perf', label: 'Student subject performance', icon: BarChart3Icon },
        { id: 'class_summary', label: 'Class summary', icon: GridIcon },
        { id: 'class_subject_perf', label: 'Class subject performance', icon: ChartPieIcon },
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
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">CBC ASSESSMENTS</span>
                                <span className="text-[10px] font-bold text-slate-400">— COLLAPSE</span>
                            </div>
                            <nav className="space-y-1">
                                {cbcNavItems.map(item => (
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

            {/* COLUMN 2: CHOOSE TERM ACCORDION */}
            <div className="w-full lg:w-56 shrink-0 space-y-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3">
                    <button
                        onClick={() => alert("Batch generating report cards for all students...")}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <SparklesIcon className="w-4 h-4" /> Generate Report Cards
                    </button>

                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                        CHOOSE TERM
                    </div>

                    <div className="space-y-2">
                        {yearTermsTree.map(yt => {
                            const isExpanded = expandedYear === yt.year;
                            return (
                                <div key={yt.year} className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                                    <button
                                        onClick={() => setExpandedYear(isExpanded ? '' : yt.year)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 font-black text-xs text-indigo-600 dark:text-indigo-400 flex justify-between items-center"
                                    >
                                        <span>{yt.year}</span>
                                        <span>{isExpanded ? '▲' : '▼'}</span>
                                    </button>

                                    {isExpanded && (
                                        <div className="p-1.5 space-y-1 bg-white dark:bg-slate-900">
                                            {yt.terms.map(term => {
                                                const isSelected = selectedYear === yt.year && selectedTerm === term;
                                                return (
                                                    <button
                                                        key={term}
                                                        onClick={() => {
                                                            setSelectedYear(yt.year);
                                                            setSelectedTerm(term);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                                                            isSelected
                                                            ? 'bg-indigo-600 text-white font-black shadow-md'
                                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        {term}
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

            {/* COLUMN 3: MAIN PREVIEW & FUTURISTIC REPORT CARD CONTAINER */}
            <div className="flex-1 w-full min-w-0 space-y-6">
                {/* Header Subtabs & Search Bar Controls */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[2.5rem] shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        {/* Subtabs */}
                        <div className="flex gap-2 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                            <button
                                onClick={() => setPreviewTab('pdf')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                    previewTab === 'pdf' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                PDF Preview
                            </button>
                            <button
                                onClick={() => setPreviewTab('subject_comments')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                    previewTab === 'subject_comments' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                Subject Specific Comments
                            </button>
                            <button
                                onClick={() => setPreviewTab('overall_comments')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                    previewTab === 'overall_comments' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                Overall Performance Comments
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button onClick={() => window.print()} className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                                <PrinterIcon className="w-4 h-4" /> Print
                            </button>
                            <button onClick={() => alert("Downloading Futuristic PDF Report...")} className="btn-primary px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md">
                                <ArrowUpTrayIcon className="w-4 h-4" /> Download
                            </button>
                            <button onClick={() => alert("Sending Report via Email/SMS to Guardian...")} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-1.5 shadow-md">
                                <PaperAirplaneIcon className="w-4 h-4" /> Send
                            </button>
                        </div>
                    </div>

                    {/* Search Student & Active Title Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                ACTIVE REPORT CARD PREVIEW
                            </span>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                {currentStudent.name} ({currentStudent.admissionNo || currentStudent.id}) &mdash; {selectedTerm} {selectedYear} REPORT CARD
                            </h3>
                        </div>

                        {/* Search Input dropdown */}
                        <div className="relative w-full sm:w-80">
                            <input
                                type="text"
                                value={searchStudentQuery}
                                onChange={e => setSearchStudentQuery(e.target.value)}
                                placeholder="🔍 Search student by name or ID..."
                                className="form-input text-xs pl-9 py-2 rounded-xl"
                            />
                            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />

                            {searchStudentQuery.trim() && (
                                <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                    {filteredStudents.map(st => (
                                        <button
                                            key={st.id}
                                            onClick={() => {
                                                setSelectedStudentId(st.id);
                                                setSearchStudentQuery('');
                                            }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-50 dark:border-slate-700/50"
                                        >
                                            <div className="font-black uppercase">{st.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">Adm: {st.admissionNo || st.id} &bull; {(st as any).studentClass || 'Form 3 East'}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* THE FUTURISTIC CYBER REPORT CARD DOCUMENT */}
                <div className="bg-slate-950 text-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-indigo-500/30 relative overflow-hidden space-y-10 no-print-bg">
                    {/* Background Ambient Glow Effects */}
                    <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

                    {/* FUTURISTIC SCHOOL BANNER */}
                    <div className="relative flex flex-col md:flex-row justify-between items-center gap-6 p-8 bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-indigo-500/20 shadow-2xl">
                        <div className="flex items-center gap-5">
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-600 to-emerald-500 rounded-2xl p-0.5 shadow-lg shadow-indigo-500/30">
                                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl font-black text-white">
                                    {(currentInstitution?.name || 'S').charAt(0)}
                                </div>
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                                    VERIFIED CYBER ACADEMIC RECORD
                                </span>
                                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mt-1">
                                    {currentInstitution?.name || 'SONGOLIET SECONDARY SCHOOL'}
                                </h1>
                                <p className="text-xs text-indigo-300 font-mono mt-0.5">
                                    P.O. BOX 2864, ELDORET &bull; TEL: 0723 706 550 &bull; INSTITUTION CODE: KNE-84092
                                </p>
                            </div>
                        </div>

                        <div className="text-right flex flex-col items-end border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">ACADEMIC PERIOD</span>
                            <span className="text-lg font-black text-indigo-400 uppercase tracking-tight mt-0.5">
                                {selectedYear} &bull; {selectedTerm.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2.5 py-0.5 rounded-md mt-1 border border-emerald-500/30">
                                OFFICIAL END-OF-TERM CARD
                            </span>
                        </div>
                    </div>

                    {/* STUDENT BIOMETRIC HUD CARD */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800">
                        {/* Student Avatar & Basic Info */}
                        <div className="lg:col-span-4 flex items-center gap-4 border-b lg:border-b-0 lg:border-r border-slate-800 pb-4 lg:pb-0 lg:pr-6">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-400 p-0.5">
                                    <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-3xl font-black">
                                        👤
                                    </div>
                                </div>
                                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                            </div>

                            <div>
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">STUDENT NAME</span>
                                <h3 className="text-lg font-black text-white uppercase leading-tight">{currentStudent.name}</h3>
                                <p className="text-xs font-mono text-slate-400 mt-0.5">ADM NO: <span className="text-emerald-400 font-bold">{currentStudent.admissionNo || currentStudent.id}</span></p>
                                <p className="text-xs text-slate-300 font-bold mt-0.5">CLASS: <span className="text-indigo-300 font-black">Form 3 East</span></p>
                            </div>
                        </div>

                        {/* Mean Performance Metrics HUD */}
                        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">MEAN POINTS</span>
                                <div className="text-2xl font-black text-indigo-400 mt-1">{studentSummary.meanPts}</div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Points Avg</span>
                            </div>

                            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">MEAN SCORE (%)</span>
                                <div className="text-2xl font-black text-emerald-400 mt-1">{studentSummary.meanScore}%</div>
                                <span className="text-[9px] font-bold text-emerald-500 uppercase">Grade: {studentSummary.meanGrade}</span>
                            </div>

                            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">OVERALL RANK</span>
                                <div className="text-2xl font-black text-amber-400 mt-1">{studentSummary.overallPos} <span className="text-xs text-slate-500 font-normal">/ {studentSummary.totalStudents}</span></div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">School Position</span>
                            </div>

                            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">STREAM RANK</span>
                                <div className="text-2xl font-black text-purple-400 mt-1">{studentSummary.streamPos} <span className="text-xs text-slate-500 font-normal">/ {studentSummary.streamStudents}</span></div>
                                <span className="text-[9px] font-bold text-purple-400 uppercase">V.A.P: {studentSummary.vap}</span>
                            </div>
                        </div>
                    </div>

                    {/* SUBJECT MARKS PERFORMANCE MATRIX */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                                📊 SUBJECT PERFORMANCE MATRIX
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400">8 SUBJECTS RECORDED</span>
                        </div>

                        <div className="bg-slate-900/80 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-950 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        <tr>
                                            <th className="p-4 border-b border-slate-800">SUBJECT</th>
                                            <th className="p-4 border-b border-slate-800 text-center">MID TERM</th>
                                            <th className="p-4 border-b border-slate-800 text-center">END TERM</th>
                                            <th className="p-4 border-b border-slate-800 text-center">TOTAL</th>
                                            <th className="p-4 border-b border-slate-800 text-center">GRADE</th>
                                            <th className="p-4 border-b border-slate-800 text-center">PTS</th>
                                            <th className="p-4 border-b border-slate-800 text-center">POS</th>
                                            <th className="p-4 border-b border-slate-800">REMARKS</th>
                                            <th className="p-4 border-b border-slate-800 text-right">TEACHER</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 text-xs font-semibold">
                                        {subjectPerformance.map(row => (
                                            <tr key={row.subject.id} className="hover:bg-slate-800/40 transition-colors">
                                                <td className="p-4 font-black uppercase text-white">{row.subject.name}</td>
                                                <td className="p-4 text-center font-mono text-slate-400">{row.midTerm}</td>
                                                <td className="p-4 text-center font-mono text-slate-300">{row.endTerm}</td>
                                                <td className="p-4 text-center font-black text-indigo-400 text-sm">{row.total}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                                        ['A', 'A-', 'EE'].includes(row.grade) ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                                                        ['B+', 'B', 'B-', 'ME'].includes(row.grade) ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30' :
                                                        ['C+', 'C', 'C-', 'AE'].includes(row.grade) ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                                                        'bg-rose-950 text-rose-300 border border-rose-500/30'
                                                    }`}>
                                                        {row.grade}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center font-bold text-slate-300">{row.pts}</td>
                                                <td className="p-4 text-center font-mono text-slate-400">{row.pos}</td>
                                                <td className="p-4 text-slate-300 text-[11px] uppercase font-bold">{row.remark}</td>
                                                <td className="p-4 text-right font-mono text-indigo-400 text-[10px]">{row.teacherSig}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* PROGRESS HISTORY & ATTENDANCE / FEES GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Progress History Table */}
                        <div className="lg:col-span-7 bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800 space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                                📈 STUDENT PROGRESS HISTORY
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-950 text-[9px] font-black uppercase text-slate-400">
                                        <tr>
                                            <th className="p-2.5">PERIOD</th>
                                            <th className="p-2.5 text-center">RANK</th>
                                            <th className="p-2.5 text-center">M/POINTS</th>
                                            <th className="p-2.5 text-right">GRADE</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {progressHistory.map((ph, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2.5 font-bold text-slate-300">{ph.period}</td>
                                                <td className="p-2.5 text-center font-mono text-amber-400 font-bold">#{ph.rank}</td>
                                                <td className="p-2.5 text-center font-mono text-indigo-400 font-bold">{ph.pts}</td>
                                                <td className="p-2.5 text-right font-black text-slate-200">{ph.grade}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Attendance & Fee Balance Widget */}
                        <div className="lg:col-span-5 bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800 space-y-4 text-xs">
                            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                                🛡️ ATTENDANCE & DISCIPLINE
                            </h4>
                            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 block">DAYS PRESENT</span>
                                    <span className="font-black text-emerald-400 text-sm">64 / 65</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 block">DISCIPLINE CASES</span>
                                    <span className="font-black text-slate-200 text-sm">0 (CLEAN)</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-800 space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-widest text-amber-400">💰 FEE STATUS SUMMARY</h4>
                                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                                    <div className="flex justify-between"><span className="text-slate-400">Fees Balance:</span> <span className="font-mono text-slate-200">KES 0</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Next Term Fees:</span> <span className="font-mono text-slate-200">KES 18,500</span></div>
                                    <div className="flex justify-between border-t border-slate-800 pt-1 font-black"><span className="text-amber-400">TOTAL DUE:</span> <span className="font-mono text-amber-400">KES 18,500</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TEACHER COMMENTS & PRINCIPAL SEAL */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-800">
                        <div className="lg:col-span-8 space-y-3">
                            <div>
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">CLASS TEACHER'S REMARKS [ Lionel Japkoech ]</span>
                                <p className="text-xs font-bold text-slate-200 mt-1 italic bg-slate-950 p-3 rounded-2xl border border-slate-800">
                                    "Work rate has shown steady positive trajectory. Recommended for academic merit."
                                </p>
                            </div>
                            <div>
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">PRINCIPAL / HEADTEACHER REMARKS [ Paul Martin ]</span>
                                <p className="text-xs font-bold text-slate-200 mt-1 italic bg-slate-950 p-3 rounded-2xl border border-slate-800">
                                    "Commendable discipline and consistency. Focus on Mathematics to reach target grade A."
                                </p>
                            </div>
                        </div>

                        {/* Encrypted QR Seal */}
                        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-2xl border border-indigo-500/20 text-center space-y-2">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-emerald-400 rounded-xl p-0.5">
                                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-xs font-black text-indigo-300">
                                    <FingerPrintIcon className="w-8 h-8 text-emerald-400 animate-pulse" />
                                </div>
                            </div>
                            <span className="text-[9px] font-mono text-slate-400 block">DIGITAL VERIFICATION SEAL</span>
                            <span className="text-[8px] font-mono text-emerald-400 block">HASH: 8F92-A39B-4091-E271</span>
                        </div>
                    </div>

                    {/* FOOTER BAR */}
                    <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>SCHOOL CLOSED ON: <strong className="text-white">25/08/2026</strong></span>
                        <span>NEXT TERM BEGINS ON: <strong className="text-emerald-400">20/09/2026</strong></span>
                    </div>
                </div>
            </div>
        </div>
    );
};
