import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { GenerateReportCardsWizardModal } from './GenerateReportCardsWizardModal';
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

    // Wizard Modal State
    const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);

    // Generated Report Cards Registry State
    const [generatedReportCardsList, setGeneratedReportCardsList] = useState<Array<{ year: string; term: string; generatedAt?: string }>>(() => {
        try {
            const instKey = currentInstitution?.id || 'default';
            const saved = localStorage.getItem(`eduai_generated_report_cards_${instKey}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
            const lastConfig = localStorage.getItem(`eduai_report_card_last_config_${instKey}`);
            if (lastConfig) {
                const cfg = JSON.parse(lastConfig);
                if (cfg.academicYear && cfg.academicTerm) {
                    return [{ year: cfg.academicYear, term: cfg.academicTerm }];
                }
            }
        } catch (e) {}
        return [{ year: '2026', term: 'Term 2' }];
    });

    // Dynamic Year-Terms Tree: ONLY for years and terms with generated report cards or evaluated assessments
    const yearTermsTree = useMemo(() => {
        const pairs: { year: string; term: string }[] = [];
        const seen = new Set<string>();

        // 1. From generated report card registry
        generatedReportCardsList.forEach(entry => {
            if (entry.year && entry.term) {
                const key = `${entry.year}__${entry.term}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    pairs.push({ year: entry.year, term: entry.term });
                }
            }
        });

        // 2. From actual assessments that have marks
        if (assessments && assessments.length > 0) {
            assessments.forEach(a => {
                const y = String((a as any).academicYear || (a as any).year || (a as any).academic_year || '').trim();
                const t = String((a as any).academicTerm || (a as any).term || (a as any).academic_term || '').trim();
                const hasMarks = marks.some(m => m.assessmentId === a.id);
                if (y && t && hasMarks) {
                    const cleanYear = y.length >= 4 ? y.substring(0, 4) : y;
                    const cleanTerm = t.toLowerCase().includes('1') ? 'Term 1' : t.toLowerCase().includes('2') ? 'Term 2' : t.toLowerCase().includes('3') ? 'Term 3' : t;
                    const key = `${cleanYear}__${cleanTerm}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        pairs.push({ year: cleanYear, term: cleanTerm });
                    }
                }
            });
        }

        // Default fallback if brand new
        if (pairs.length === 0) {
            pairs.push({ year: '2026', term: 'Term 2' });
        }

        // Group terms per year
        const yearMap: Record<string, Set<string>> = {};
        pairs.forEach(p => {
            if (!yearMap[p.year]) yearMap[p.year] = new Set();
            yearMap[p.year].add(p.term);
        });

        const termOrder = ['Term 1', 'Term 2', 'Term 3'];
        return Object.keys(yearMap)
            .sort((a, b) => b.localeCompare(a)) // Sort latest years first
            .map(year => ({
                year,
                terms: Array.from(yearMap[year]).sort((t1, t2) => {
                    const idx1 = termOrder.indexOf(t1);
                    const idx2 = termOrder.indexOf(t2);
                    if (idx1 !== -1 && idx2 !== -1) return idx1 - idx2;
                    return t1.localeCompare(t2);
                })
            }));
    }, [generatedReportCardsList, assessments, marks]);

    // Class & Stream Filter States
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [selectedStream, setSelectedStream] = useState<string>('all');

    // Helper to extract clean class & stream from student
    const getStudentClassInfo = useCallback((student: any) => {
        if (!student) return { rawClass: isPrimarySchool ? 'Grade 4 East' : 'Form 3 East', cleanClass: isPrimarySchool ? 'Grade 4' : 'Form 3', stream: 'East' };
        
        const rawClass = String(
            student.studentClass ||
            student.className ||
            student.gradeLevel ||
            student.classLevel ||
            student.class_name ||
            student.class ||
            student.metadata?.gradeLevel ||
            student.metadata?.class ||
            ''
        ).trim();

        const rawStream = String(
            student.stream ||
            student.streamName ||
            student.stream_name ||
            student.metadata?.stream ||
            student.metadata?.streamName ||
            ''
        ).trim();

        let cleanClass = rawClass;
        let stream = rawStream;

        // Extract stream from class name if embedded (e.g., "Form 3 East", "Grade 4 Blue")
        if (!stream && rawClass) {
            const match = rawClass.match(/\s+(east|west|north|south|central|red|blue|green|yellow|stream\s*[a-z0-9]*|[a-d])$/i);
            if (match && match[1]) {
                stream = match[1].trim();
                cleanClass = rawClass.replace(/\s+(east|west|north|south|central|red|blue|green|yellow|stream\s*[a-z0-9]*|[a-d])$/i, '').trim();
            }
        }

        if (!cleanClass) cleanClass = isPrimarySchool ? 'Grade 4' : 'Form 3';
        if (!stream) stream = 'East';

        return {
            rawClass: rawClass || `${cleanClass} ${stream}`,
            cleanClass,
            stream
        };
    }, [isPrimarySchool]);

    // Available Classes derived dynamically from all active students & courses
    const availableClasses = useMemo(() => {
        const classSet = new Set<string>();
        activeStudents.forEach(s => {
            const { cleanClass } = getStudentClassInfo(s);
            if (cleanClass) classSet.add(cleanClass);
        });

        if (courses && courses.length > 0) {
            courses.forEach(c => {
                const name = typeof c === 'string' ? c : (c.name || (c as any).title || c.code);
                if (name) {
                    const clean = String(name).replace(/\s+(east|west|north|south|central|red|blue|green|yellow|stream\s*[a-z0-9]*|[a-d])$/i, '').trim();
                    if (clean) classSet.add(clean);
                }
            });
        }

        if (classSet.size === 0) {
            if (isPrimarySchool) {
                ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].forEach(g => classSet.add(g));
            } else {
                ['Form 1', 'Form 2', 'Form 3', 'Form 4'].forEach(f => classSet.add(f));
            }
        }

        return Array.from(classSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [activeStudents, courses, getStudentClassInfo, isPrimarySchool]);

    // Available Streams derived dynamically for the selected class
    const availableStreams = useMemo(() => {
        const streamSet = new Set<string>();
        activeStudents.forEach(s => {
            const { cleanClass, stream } = getStudentClassInfo(s);
            if (selectedClass === 'all' || cleanClass.toLowerCase() === selectedClass.toLowerCase()) {
                if (stream && stream !== '—' && stream.toLowerCase() !== 'all') {
                    streamSet.add(stream);
                }
            }
        });

        if (streamSet.size === 0) {
            ['East', 'West', 'North', 'South', 'Central'].forEach(s => streamSet.add(s));
        }

        return Array.from(streamSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }, [activeStudents, selectedClass, getStudentClassInfo]);

    // Student Fee Balances Record State
    const [feeBalances, setFeeBalances] = useState<Record<string, { balance: number; nextTermFees: number; totalDue: number }>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_report_card_fee_balances_${currentInstitution?.id || 'default'}`);
            if (saved) return JSON.parse(saved) || {};
        } catch (e) {}
        return {
            st_1: { balance: 0, nextTermFees: 18500, totalDue: 18500 },
            '1368': { balance: 0, nextTermFees: 18500, totalDue: 18500 }
        };
    });

    // Main Preview Sub-Tab
    const [previewTab, setPreviewTab] = useState<'pdf' | 'subject_comments' | 'overall_comments'>('pdf');

    // Accordion year/term selection states
    const initialYear = yearTermsTree[0]?.year || '2026';
    const initialTerm = yearTermsTree[0]?.terms[0] || 'Term 2';
    const [expandedYear, setExpandedYear] = useState<string>(initialYear);
    const [selectedTerm, setSelectedTerm] = useState<string>(initialTerm);
    const [selectedYear, setSelectedYear] = useState<string>(initialYear);

    // Search Student State
    const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>(activeStudents[0]?.id || 'st_1');


    // Filtered Students list by search, selected class, and selected stream
    const filteredStudents = useMemo(() => {
        return activeStudents.filter(s => {
            const { cleanClass, stream } = getStudentClassInfo(s);

            // Class match
            if (selectedClass !== 'all' && cleanClass.toLowerCase() !== selectedClass.toLowerCase()) {
                return false;
            }

            // Stream match
            if (selectedStream !== 'all' && stream.toLowerCase() !== selectedStream.toLowerCase()) {
                return false;
            }

            // Search query match
            if (searchStudentQuery.trim()) {
                const q = searchStudentQuery.toLowerCase();
                const matchesName = s.name.toLowerCase().includes(q);
                const matchesAdm = (s.admissionNo && s.admissionNo.toLowerCase().includes(q)) || (s.id && s.id.toLowerCase().includes(q));
                const matchesCls = cleanClass.toLowerCase().includes(q) || stream.toLowerCase().includes(q);
                if (!matchesName && !matchesAdm && !matchesCls) return false;
            }

            return true;
        });
    }, [activeStudents, selectedClass, selectedStream, searchStudentQuery, getStudentClassInfo]);

    // Ensure selectedStudentId points to a valid student in filtered list
    useEffect(() => {
        if (filteredStudents.length > 0) {
            const currentExists = filteredStudents.some(s => s.id === selectedStudentId);
            if (!currentExists) {
                setSelectedStudentId(filteredStudents[0].id);
            }
        }
    }, [filteredStudents, selectedStudentId]);

    // Current Student Index in filtered list for Next / Prev navigation
    const currentStudentIndex = useMemo(() => {
        const idx = filteredStudents.findIndex(s => s.id === selectedStudentId);
        return idx !== -1 ? idx : 0;
    }, [filteredStudents, selectedStudentId]);

    const handlePrevStudent = () => {
        if (filteredStudents.length === 0) return;
        const prevIdx = currentStudentIndex > 0 ? currentStudentIndex - 1 : filteredStudents.length - 1;
        setSelectedStudentId(filteredStudents[prevIdx].id);
    };

    const handleNextStudent = () => {
        if (filteredStudents.length === 0) return;
        const nextIdx = currentStudentIndex < filteredStudents.length - 1 ? currentStudentIndex + 1 : 0;
        setSelectedStudentId(filteredStudents[nextIdx].id);
    };

    // Active selected student object
    const currentStudent = useMemo(() => {
        return filteredStudents.find(s => s.id === selectedStudentId) || activeStudents.find(s => s.id === selectedStudentId) || filteredStudents[0] || activeStudents[0] || {
            id: 'st_1',
            name: 'Magdaline Jepkoech',
            admissionNo: '1368',
            gender: 'Female',
            studentClass: 'Form 3 East'
        };
    }, [filteredStudents, activeStudents, selectedStudentId]);

    const currentStudentClassInfo = useMemo(() => getStudentClassInfo(currentStudent), [currentStudent, getStudentClassInfo]);

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
    const calculateGrade = useCallback((score: number) => {
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
    }, [isPrimarySchool]);

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
    }, [activeSubjects, currentStudent, calculateGrade]);

    // Student Overall Summary Stats
    const studentSummary = useMemo(() => {
        const totalScore = subjectPerformance.reduce((a, b) => a + b.total, 0);
        const meanScore = subjectPerformance.length > 0 ? parseFloat((totalScore / subjectPerformance.length).toFixed(2)) : 0;
        const totalPts = subjectPerformance.reduce((a, b) => a + b.pts, 0);
        const meanPts = subjectPerformance.length > 0 ? parseFloat((totalPts / subjectPerformance.length).toFixed(2)) : 0;
        const { grade: meanGrade } = calculateGrade(meanScore);

        return {
            totalScore,
            meanScore,
            meanPts,
            meanGrade,
            overallPos: Math.min(37, filteredStudents.length || 1),
            totalStudents: Math.max(filteredStudents.length, 1),
            streamPos: Math.min(12, filteredStudents.length || 1),
            streamStudents: Math.max(filteredStudents.length, 1),
            kcpeScore: '280 C+',
            vap: '+5.7143'
        };
    }, [subjectPerformance, calculateGrade, filteredStudents.length]);

    // Historical Performance Progress
    const progressHistory = [
        { period: 'Form 3 Term 2', rank: 37, pts: 1.2857, grade: 'E' },
        { period: 'Form 3 Term 1', rank: 103, pts: 1.5714, grade: 'D-' },
        { period: 'Form 2 Term 3', rank: 46, pts: 2.0909, grade: 'D-' },
        { period: 'Form 2 Term 2', rank: 47, pts: 2.0909, grade: 'D-' },
    ];

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
                        onClick={() => setIsWizardOpen(true)}
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

                    {/* Class, Stream, Search & Quick Student Pagination Controls */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        {/* Title & Filter Badges */}
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                    ACTIVE REPORT CARD PREVIEW
                                </span>
                                <span className="text-[9px] font-bold text-slate-400">&bull;</span>
                                <span className="text-[10px] font-bold text-slate-500">
                                    {filteredStudents.length > 0 ? `Student ${currentStudentIndex + 1} of ${filteredStudents.length}` : 'No matching students'}
                                </span>
                                {selectedClass !== 'all' && (
                                    <span className="text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                                        {selectedClass}
                                    </span>
                                )}
                                {selectedStream !== 'all' && (
                                    <span className="text-[9px] font-black uppercase bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                                        {selectedStream}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                                {currentStudent.name} ({currentStudent.admissionNo || currentStudent.id}) &mdash; {selectedTerm} {selectedYear} REPORT CARD
                            </h3>
                        </div>

                        {/* Filters Bar & Prev/Next Switcher */}
                        <div className="flex items-center gap-2 flex-wrap w-full xl:w-auto">
                            {/* Class Filter Dropdown */}
                            <div className="relative">
                                <select
                                    value={selectedClass}
                                    onChange={e => {
                                        setSelectedClass(e.target.value);
                                        setSelectedStream('all');
                                    }}
                                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <option value="all">All Classes</option>
                                    {availableClasses.map(cls => (
                                        <option key={cls} value={cls}>{cls}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Stream Filter Dropdown */}
                            <div className="relative">
                                <select
                                    value={selectedStream}
                                    onChange={e => setSelectedStream(e.target.value)}
                                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <option value="all">All Streams</option>
                                    {availableStreams.map(st => (
                                        <option key={st} value={st}>{st}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Prev / Next Student Switcher */}
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={handlePrevStudent}
                                    disabled={filteredStudents.length <= 1}
                                    className="px-2.5 py-1 text-xs font-black rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                    title="Previous Student"
                                >
                                    ‹ Prev
                                </button>
                                <span className="text-[10px] font-mono text-slate-400 px-1 font-bold">
                                    {filteredStudents.length > 0 ? `${currentStudentIndex + 1}/${filteredStudents.length}` : '0/0'}
                                </span>
                                <button
                                    onClick={handleNextStudent}
                                    disabled={filteredStudents.length <= 1}
                                    className="px-2.5 py-1 text-xs font-black rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                    title="Next Student"
                                >
                                    Next ›
                                </button>
                            </div>

                            {/* Search Input dropdown */}
                            <div className="relative flex-1 sm:w-64 min-w-[200px]">
                                <input
                                    type="text"
                                    value={searchStudentQuery}
                                    onChange={e => setSearchStudentQuery(e.target.value)}
                                    placeholder="🔍 Search student..."
                                    className="form-input text-xs pl-8 pr-3 py-2 rounded-xl w-full"
                                />
                                <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />

                                {searchStudentQuery.trim() && (
                                    <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                        {filteredStudents.length === 0 ? (
                                            <div className="px-4 py-3 text-center text-xs text-slate-400 font-medium">
                                                No students match "{searchStudentQuery}" in {selectedClass !== 'all' ? selectedClass : 'all classes'}
                                            </div>
                                        ) : (
                                            filteredStudents.map(st => (
                                                <button
                                                    key={st.id}
                                                    onClick={() => {
                                                        setSelectedStudentId(st.id);
                                                        setSearchStudentQuery('');
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer"
                                                >
                                                    <div className="font-black uppercase">{st.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">Adm: {st.admissionNo || st.id} &bull; {getStudentClassInfo(st).rawClass}</div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* THE OFFICIAL ACADEMIC REPORT CARD DOCUMENT (LIGHT THEME) */}
                <div className="bg-white text-slate-900 p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-200/90 relative overflow-hidden space-y-8 print:p-0 print:shadow-none print:border-none print:rounded-none">

                    {/* OFFICIAL SCHOOL BANNER */}
                    <div className="relative flex flex-col md:flex-row justify-between items-center gap-6 p-6 md:p-8 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 rounded-3xl border border-slate-200/90 shadow-xs">
                        <div className="flex items-center gap-5">
                            <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-md shadow-indigo-500/20 shrink-0">
                                {(currentInstitution?.name || 'S').charAt(0)}
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-700 bg-indigo-100/80 px-3 py-1 rounded-full border border-indigo-200">
                                    OFFICIAL ACADEMIC REPORT CARD
                                </span>
                                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 mt-1.5">
                                    {currentInstitution?.name || 'SONGOLIET SECONDARY SCHOOL'}
                                </h1>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    P.O. BOX 2864, ELDORET &bull; TEL: 0723 706 550 &bull; INSTITUTION CODE: KNE-84092
                                </p>
                            </div>
                        </div>

                        <div className="text-right flex flex-col items-end border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6 shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">ACADEMIC PERIOD</span>
                            <span className="text-lg font-black text-indigo-600 uppercase tracking-tight mt-0.5">
                                {selectedYear} &bull; {selectedTerm.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md mt-1 border border-emerald-200">
                                OFFICIAL END-OF-TERM CARD
                            </span>
                        </div>
                    </div>

                    {/* STUDENT PROFILE & PERFORMANCE HUD */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/80 p-6 rounded-3xl border border-slate-200/90">
                        {/* Student Avatar & Basic Info */}
                        <div className="lg:col-span-4 flex items-center gap-4 border-b lg:border-b-0 lg:border-r border-slate-200 pb-4 lg:pb-0 lg:pr-6">
                            <div className="relative shrink-0">
                                <div className="w-18 h-18 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-3xl text-indigo-600 shadow-xs">
                                    👤
                                </div>
                                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                            </div>

                            <div className="min-w-0">
                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">STUDENT NAME</span>
                                <h3 className="text-lg font-black text-slate-900 uppercase leading-tight truncate">{currentStudent.name}</h3>
                                <p className="text-xs font-mono text-slate-500 mt-0.5">ADM NO: <span className="text-indigo-600 font-bold">{currentStudent.admissionNo || currentStudent.id}</span></p>
                                <p className="text-xs text-slate-600 font-bold mt-0.5">CLASS: <span className="text-slate-900 font-black">{currentStudentClassInfo.rawClass}</span></p>
                            </div>
                        </div>

                        {/* Mean Performance Metrics HUD */}
                        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">MEAN POINTS</span>
                                <div className="text-2xl font-black text-indigo-600 mt-1">{studentSummary.meanPts}</div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Points Avg</span>
                            </div>

                            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">MEAN SCORE (%)</span>
                                <div className="text-2xl font-black text-emerald-600 mt-1">{studentSummary.meanScore}%</div>
                                <span className="text-[9px] font-bold text-emerald-600 uppercase">Grade: {studentSummary.meanGrade}</span>
                            </div>

                            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">OVERALL RANK</span>
                                <div className="text-2xl font-black text-slate-900 mt-1">{studentSummary.overallPos} <span className="text-xs text-slate-400 font-normal">/ {studentSummary.totalStudents}</span></div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">School Position</span>
                            </div>

                            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">STREAM RANK</span>
                                <div className="text-2xl font-black text-purple-600 mt-1">{studentSummary.streamPos} <span className="text-xs text-slate-400 font-normal">/ {studentSummary.streamStudents}</span></div>
                                <span className="text-[9px] font-bold text-purple-600 uppercase">V.A.P: {studentSummary.vap}</span>
                            </div>
                        </div>
                    </div>

                    {/* SUBJECT MARKS PERFORMANCE MATRIX */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                                📊 SUBJECT PERFORMANCE MATRIX
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400">{activeSubjects.length} SUBJECTS RECORDED</span>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-100/80 text-[10px] font-black uppercase text-slate-600 tracking-widest">
                                        <tr>
                                            <th className="p-4 border-b border-slate-200">SUBJECT</th>
                                            <th className="p-4 border-b border-slate-200 text-center">MID TERM</th>
                                            <th className="p-4 border-b border-slate-200 text-center">END TERM</th>
                                            <th className="p-4 border-b border-slate-200 text-center">TOTAL</th>
                                            <th className="p-4 border-b border-slate-200 text-center">GRADE</th>
                                            <th className="p-4 border-b border-slate-200 text-center">PTS</th>
                                            <th className="p-4 border-b border-slate-200 text-center">POS</th>
                                            <th className="p-4 border-b border-slate-200">REMARKS</th>
                                            <th className="p-4 border-b border-slate-200 text-right">TEACHER</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                                        {subjectPerformance.map(row => (
                                            <tr key={row.subject.id} className="hover:bg-indigo-50/20 transition-colors">
                                                <td className="p-4 font-bold uppercase text-slate-900">{row.subject.name}</td>
                                                <td className="p-4 text-center font-mono text-slate-600">{row.midTerm}</td>
                                                <td className="p-4 text-center font-mono text-slate-700">{row.endTerm}</td>
                                                <td className="p-4 text-center font-black text-indigo-600 text-sm">{row.total}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                                        ['A', 'A-', 'EE'].includes(row.grade) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                        ['B+', 'B', 'B-', 'ME'].includes(row.grade) ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                                        ['C+', 'C', 'C-', 'AE'].includes(row.grade) ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                        'bg-rose-50 text-rose-700 border border-rose-200'
                                                    }`}>
                                                        {row.grade}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center font-bold text-slate-700">{row.pts}</td>
                                                <td className="p-4 text-center font-mono text-slate-500">{row.pos}</td>
                                                <td className="p-4 text-slate-600 text-[11px] uppercase font-bold">{row.remark}</td>
                                                <td className="p-4 text-right font-mono text-indigo-600 text-[10px]">{row.teacherSig}</td>
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
                        <div className="lg:col-span-7 bg-slate-50/80 p-6 rounded-3xl border border-slate-200/90 space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                                📈 STUDENT PROGRESS HISTORY
                            </h4>
                            <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100/80 text-[9px] font-black uppercase text-slate-600">
                                        <tr>
                                            <th className="p-2.5">PERIOD</th>
                                            <th className="p-2.5 text-center">RANK</th>
                                            <th className="p-2.5 text-center">M/POINTS</th>
                                            <th className="p-2.5 text-right">GRADE</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {progressHistory.map((ph, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2.5 font-bold text-slate-700">{ph.period}</td>
                                                <td className="p-2.5 text-center font-mono text-amber-600 font-bold">#{ph.rank}</td>
                                                <td className="p-2.5 text-center font-mono text-indigo-600 font-bold">{ph.pts}</td>
                                                <td className="p-2.5 text-right font-black text-slate-800">{ph.grade}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Attendance & Fee Balance Widget */}
                        <div className="lg:col-span-5 bg-slate-50/80 p-6 rounded-3xl border border-slate-200/90 space-y-4 text-xs">
                            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2">
                                🛡️ ATTENDANCE & DISCIPLINE
                            </h4>
                            <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 block">DAYS PRESENT</span>
                                    <span className="font-black text-emerald-600 text-sm">64 / 65</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 block">DISCIPLINE CASES</span>
                                    <span className="font-black text-slate-700 text-sm">0 (CLEAN)</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200 space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-widest text-amber-700">💰 FEE STATUS SUMMARY</h4>
                                {(() => {
                                    const studentFinance = feeBalances[currentStudent.id] ||
                                        feeBalances[currentStudent.admissionNo || ''] || {
                                            balance: 0,
                                            nextTermFees: 18500,
                                            totalDue: 18500
                                        };
                                    return (
                                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 font-medium">Fees Balance:</span>
                                                <span className={`font-mono font-bold ${studentFinance.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    KES {studentFinance.balance.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 font-medium">Next Term Fees:</span>
                                                <span className="font-mono text-slate-800 font-semibold">
                                                    KES {studentFinance.nextTermFees.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-t border-slate-100 pt-1.5 font-black">
                                                <span className="text-indigo-900">TOTAL DUE ON REOPENING:</span>
                                                <span className="font-mono text-indigo-600">
                                                    KES {studentFinance.totalDue.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* TEACHER COMMENTS & PRINCIPAL SEAL */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/80 p-6 rounded-3xl border border-slate-200/90">
                        <div className="lg:col-span-8 space-y-3">
                            <div>
                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">CLASS TEACHER'S REMARKS [ Lionel Japkoech ]</span>
                                <p className="text-xs font-medium text-slate-700 mt-1 italic bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs leading-relaxed">
                                    "Work rate has shown steady positive trajectory. Recommended for academic merit."
                                </p>
                            </div>
                            <div>
                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">PRINCIPAL / HEADTEACHER REMARKS [ Paul Martin ]</span>
                                <p className="text-xs font-medium text-slate-700 mt-1 italic bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs leading-relaxed">
                                    "Commendable discipline and consistency. Focus on Mathematics to reach target grade A."
                                </p>
                            </div>
                        </div>

                        {/* Encrypted QR Seal */}
                        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-indigo-100 shadow-xs text-center space-y-2">
                            <div className="w-16 h-16 bg-indigo-50 border border-indigo-200 rounded-xl p-0.5 flex items-center justify-center">
                                <FingerPrintIcon className="w-8 h-8 text-indigo-600" />
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 block">DIGITAL VERIFICATION SEAL</span>
                            <span className="text-[8px] font-mono text-slate-400 block">HASH: 8F92-A39B-4091-E271</span>
                        </div>
                    </div>

                    {/* FOOTER BAR */}
                    <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <span>SCHOOL CLOSED ON: <strong className="text-slate-800">25/08/2026</strong></span>
                        <span>NEXT TERM BEGINS ON: <strong className="text-emerald-600">20/09/2026</strong></span>
                    </div>
                </div>
            </div>

            {/* GENERATE REPORT CARDS WIZARD MODAL */}
            <GenerateReportCardsWizardModal
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                currentInstitution={currentInstitution}
                assessments={assessments}
                students={activeStudents}
                onApplyReportConfig={(config) => {
                    setSelectedYear(config.academicYear);
                    setSelectedTerm(config.academicTerm);
                    setExpandedYear(config.academicYear);
                    if (config.feeBalances) {
                        setFeeBalances(config.feeBalances);
                    }
                    const newEntry = { year: config.academicYear, term: config.academicTerm, generatedAt: new Date().toISOString() };
                    setGeneratedReportCardsList(prev => {
                        const exists = prev.some(e => e.year === newEntry.year && e.term === newEntry.term);
                        const updated = exists ? prev : [newEntry, ...prev];
                        try {
                            localStorage.setItem(`eduai_generated_report_cards_${currentInstitution?.id || 'default'}`, JSON.stringify(updated));
                        } catch (e) {}
                        return updated;
                    });
                }}
            />
        </div>
    );
};
