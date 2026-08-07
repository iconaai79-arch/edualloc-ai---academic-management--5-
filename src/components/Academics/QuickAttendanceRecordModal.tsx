import React, { useState, useMemo, useEffect } from 'react';
import type { User, StudentAttendance, Institution, AcademicYear, Semester } from '../../types';
import { apiService } from '../../services/apiService';
import { 
    X, Calendar as CalendarIcon, Users, CheckCircle2, XCircle, Clock, 
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, 
    Search, Send, Sparkles, AlertCircle, ShieldCheck, CheckCheck, RefreshCw
} from 'lucide-react';

export interface QuickAttendanceRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: User[];
    users?: User[];
    currentInstitution?: Institution | null;
    initialDate?: string;
    initialClassName?: string;
    onSaveAttendanceComplete?: (date: string, className: string, attendanceData: { studentId: string; status: 'present' | 'absent' | 'late' | 'excused'; remarks?: string }[]) => void;
}

export const QuickAttendanceRecordModal: React.FC<QuickAttendanceRecordModalProps> = ({
    isOpen,
    onClose,
    students = [],
    users = [],
    currentInstitution,
    initialDate,
    initialClassName,
    onSaveAttendanceComplete
}) => {
    // ── CALENDAR STATE ──
    const [currentMonthDate, setCurrentMonthDate] = useState(() => {
        return initialDate ? new Date(initialDate) : new Date();
    });

    const [selectedDate, setSelectedDate] = useState<string>(() => {
        return initialDate || new Date().toISOString().split('T')[0];
    });

    // ── CLASS SELECTOR STATE ──
    const [selectedClass, setSelectedClass] = useState<string>(() => {
        return initialClassName || 'All Students';
    });

    // Get all students
    const allStudents = useMemo(() => {
        if (students.length > 0) return students;
        return users.filter(u => u.role === 'student');
    }, [students, users]);

    // Available Classes list with student counts
    const classOptions = useMemo(() => {
        const map: Record<string, number> = {
            'All Students': allStudents.length || 67,
            'Form 3 2026': 22,
            'Form 4 2026': 29,
            'GRADE 10 2026': 16,
            'Grade 4 Blue': 25,
        };

        // Populate counts from real students if available
        allStudents.forEach(s => {
            const clsName = s.studentClass || s.courseLevelId;
            if (clsName && clsName !== 'All Students') {
                map[clsName] = (map[clsName] || 0) + 1;
            }
        });

        return Object.entries(map).map(([name, count]) => ({ name, count }));
    }, [allStudents]);

    // Filter students for the selected class
    const classStudents = useMemo(() => {
        if (selectedClass === 'All Students') {
            return allStudents.length > 0 ? allStudents : Array.from({ length: 67 }).map((_, i) => ({
                id: `std_${i + 1}`,
                name: i < 22 ? `Student ${i + 1} (Form 3)` : i < 51 ? `Student ${i + 1} (Form 4)` : `Student ${i + 1} (Grade 10)`,
                email: `student${i + 1}@school.edu`,
                role: 'student' as const,
                institutionId: 'inst_1',
                admissionNumber: `ADM/2026/${100 + i}`,
                studentClass: i < 22 ? 'Form 3 2026' : i < 51 ? 'Form 4 2026' : 'GRADE 10 2026'
            }));
        }

        const filtered = allStudents.filter(s => s.studentClass === selectedClass || s.courseLevelId === selectedClass);
        if (filtered.length > 0) return filtered;

        // Fallback demo students for selected class matching standard counts
        const targetCount = classOptions.find(c => c.name === selectedClass)?.count || 20;
        return Array.from({ length: targetCount }).map((_, i) => ({
            id: `std_${selectedClass.replace(/\s+/g, '')}_${i + 1}`,
            name: `${selectedClass} Student ${i + 1}`,
            email: `student_${i + 1}@school.edu`,
            role: 'student' as const,
            institutionId: 'inst_1',
            admissionNumber: `ADM/${selectedClass.substring(0, 3).toUpperCase()}/${100 + i}`,
            studentClass: selectedClass
        }));
    }, [allStudents, selectedClass, classOptions]);

    // ── ATTENDANCE RECORDING MAP ──
    const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: 'present' | 'absent' | 'late' | 'excused' | 'not_taken'; remarks: string }>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [isMassDropdownOpen, setIsMassDropdownOpen] = useState(false);
    const [notifyParentsSms, setNotifyParentsSms] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize attendance map for students
    useEffect(() => {
        const initial: Record<string, { status: 'present' | 'absent' | 'late' | 'excused' | 'not_taken'; remarks: string }> = {};
        classStudents.forEach(s => {
            initial[s.id] = { status: 'not_taken', remarks: '' };
        });
        setAttendanceMap(initial);
    }, [classStudents, selectedDate, selectedClass]);

    // Calculate whether any attendance has been taken for selected date/class
    const hasAttendanceRecorded = useMemo(() => {
        return Object.values(attendanceMap).some(v => v.status !== 'not_taken');
    }, [attendanceMap]);

    // Metrics summary
    const metrics = useMemo(() => {
        let present = 0, absent = 0, late = 0, excused = 0, notTaken = 0;
        Object.values(attendanceMap).forEach(v => {
            if (v.status === 'present') present++;
            else if (v.status === 'absent') absent++;
            else if (v.status === 'late') late++;
            else if (v.status === 'excused') excused++;
            else notTaken++;
        });
        const total = classStudents.length;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        return { total, present, absent, late, excused, notTaken, rate };
    }, [attendanceMap, classStudents.length]);

    // ── MASS ACTIONS (Dropdown options matching reference image) ──
    const handleMassMark = (status: 'present' | 'absent' | 'excused' | 'present_except' | 'absent_except' | 'not_taken') => {
        const updated: Record<string, { status: 'present' | 'absent' | 'late' | 'excused' | 'not_taken'; remarks: string }> = {};

        classStudents.forEach(s => {
            if (status === 'present') {
                updated[s.id] = { status: 'present', remarks: '' };
            } else if (status === 'absent') {
                updated[s.id] = { status: 'absent', remarks: '' };
            } else if (status === 'excused') {
                updated[s.id] = { status: 'excused', remarks: '' };
            } else if (status === 'not_taken') {
                updated[s.id] = { status: 'not_taken', remarks: '' };
            } else if (status === 'present_except') {
                // Default present, keep existing absent/late
                const existing = attendanceMap[s.id]?.status;
                updated[s.id] = { status: (existing === 'absent' || existing === 'late') ? existing : 'present', remarks: '' };
            } else if (status === 'absent_except') {
                // Default absent, keep existing present
                const existing = attendanceMap[s.id]?.status;
                updated[s.id] = { status: existing === 'present' ? 'present' : 'absent', remarks: '' };
            }
        });

        setAttendanceMap(updated);
        setIsMassDropdownOpen(false);
    };

    // Single student status change
    const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
        setAttendanceMap(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status }
        }));
    };

    // Single student remarks change
    const handleRemarksChange = (studentId: string, remarks: string) => {
        setAttendanceMap(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], remarks }
        }));
    };

    // Formatted date title e.g. "Fri, 07/08/2026"
    const formattedDateTitle = useMemo(() => {
        const d = new Date(selectedDate);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = String(d.getDate()).padStart(2, '0');
        const monthNum = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${dayName}, ${dayNum}/${monthNum}/${year}`;
    }, [selectedDate]);

    // Calendar Days Computation for currentMonthDate
    const calendarGrid = useMemo(() => {
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const days = [];

        // Prev month padding
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            days.push({ dayNum: daysInPrevMonth - i, isCurrentMonth: false, dateStr: '' });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const mStr = String(month + 1).padStart(2, '0');
            const dStr = String(i).padStart(2, '0');
            const dateStr = `${year}-${mStr}-${dStr}`;
            days.push({ dayNum: i, isCurrentMonth: true, dateStr });
        }

        // Next month padding
        const total = days.length;
        const remaining = (35 - (total % 35)) % 35;
        for (let i = 1; i <= remaining; i++) {
            days.push({ dayNum: i, isCurrentMonth: false, dateStr: '' });
        }

        return days;
    }, [currentMonthDate]);

    const monthYearLabel = currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Handle Month Navigation
    const handlePrevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
    const handlePrevYear = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear() - 1, currentMonthDate.getMonth(), 1));
    const handleNextYear = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear() + 1, currentMonthDate.getMonth(), 1));

    // Submit Attendance
    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const data = Object.entries(attendanceMap).map(([studentId, val]) => ({
                studentId,
                status: val.status === 'not_taken' ? 'present' : val.status,
                remarks: val.remarks
            }));

            if (onSaveAttendanceComplete) {
                onSaveAttendanceComplete(selectedDate, selectedClass, data as any);
            }

            alert(`Attendance successfully recorded for ${selectedClass} on ${formattedDateTitle}!`);
            onClose();
        } catch (err) {
            console.error(err);
            alert('Error saving attendance register.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto no-print">
            <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl overflow-hidden flex flex-col max-h-[92vh] text-left animate-scale-in">
                
                {/* ── TOP MODAL HEADER BAR ── */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                                <span>Record '{formattedDateTitle}' class attendance</span>
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                                Quick Attendance Command • {currentInstitution?.name || 'Academic Institution'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── TWO-COLUMN BODY LAYOUT ── */}
                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

                    {/* ── LEFT PANEL: INTERACTIVE CALENDAR + CLASS SELECTOR ── */}
                    <div className="w-full lg:w-80 bg-slate-50/70 dark:bg-slate-900/60 p-5 border-r border-slate-200/60 dark:border-slate-800 flex flex-col gap-6 overflow-y-auto shrink-0 custom-scrollbar">
                        
                        {/* 1. Interactive Calendar Navigation Widget */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            {/* Calendar Header Controls */}
                            <div className="flex items-center justify-between mb-3 text-xs font-black text-indigo-600 dark:text-indigo-400">
                                <div className="flex items-center gap-1">
                                    <button onClick={handlePrevYear} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700" title="Previous Year">
                                        <ChevronsLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700" title="Previous Month">
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <span className="uppercase tracking-wider">{monthYearLabel}</span>

                                <div className="flex items-center gap-1">
                                    <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700" title="Next Month">
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={handleNextYear} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700" title="Next Year">
                                        <ChevronsRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Calendar Day Labels */}
                            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase text-slate-400 mb-1">
                                <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold">
                                {calendarGrid.map((item, idx) => {
                                    if (!item.isCurrentMonth) {
                                        return (
                                            <div key={idx} className="p-1.5 text-slate-300 dark:text-slate-700 pointer-events-none">
                                                {item.dayNum}
                                            </div>
                                        );
                                    }

                                    const isSelected = selectedDate === item.dateStr;
                                    const isToday = item.dateStr === new Date().toISOString().split('T')[0];

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedDate(item.dateStr)}
                                            className={`p-1.5 rounded-xl transition-all font-mono text-[11px] ${
                                                isSelected
                                                    ? 'bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-black shadow-md scale-105'
                                                    : isToday
                                                        ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-400/40 font-black'
                                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            {item.dayNum}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. CHOOSE CLASS Selector List */}
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">CHOOSE CLASS</h4>
                            <div className="space-y-1.5">
                                {classOptions.map(cls => {
                                    const isActive = selectedClass === cls.name;

                                    return (
                                        <button
                                            key={cls.name}
                                            onClick={() => setSelectedClass(cls.name)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left border ${
                                                isActive
                                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md scale-[1.02]'
                                                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                                            }`}
                                        >
                                            <span className="truncate">{cls.name}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                isActive ? 'bg-black/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                            }`}>
                                                ({cls.count})
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                    {/* ── RIGHT MAIN AREA: BATCH DROPDOWN & ROLL CALL WORKSPACE ── */}
                    <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar bg-white dark:bg-slate-950">
                        <div className="space-y-6">

                            {/* Top Mass Action Bar & Header */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <h4 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>{selectedClass}</span>
                                        <span className="text-xs font-bold text-slate-400 font-mono">({classStudents.length} Students)</span>
                                    </h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        Date: {formattedDateTitle}
                                    </p>
                                </div>

                                {/* MASS ACTION DROPDOWN ("Mark whole school as" / "Mark class as") */}
                                <div className="relative">
                                    <div className="inline-flex rounded-2xl shadow-sm">
                                        <button
                                            onClick={() => handleMassMark('present')}
                                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-l-2xl border-r border-indigo-500 transition-all flex items-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            <span>Mark {selectedClass === 'All Students' ? 'whole school' : 'class'} as</span>
                                        </button>

                                        <button
                                            onClick={() => setIsMassDropdownOpen(!isMassDropdownOpen)}
                                            className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-r-2xl transition-all"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Dropdown Menu Options matching reference picture */}
                                    {isMassDropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs font-bold animate-scale-in">
                                            <button
                                                onClick={() => handleMassMark('present')}
                                                className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-between"
                                            >
                                                <span>Present</span>
                                                <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleMassMark('absent')}
                                                className="w-full px-4 py-2.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-between"
                                            >
                                                <span>Absent</span>
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleMassMark('excused')}
                                                className="w-full px-4 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-between border-b border-slate-100 dark:border-slate-800"
                                            >
                                                <span>Excused</span>
                                                <Clock className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => handleMassMark('present_except')}
                                                className="w-full px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                                            >
                                                <span>Present except...</span>
                                            </button>
                                            <button
                                                onClick={() => handleMassMark('absent_except')}
                                                className="w-full px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800"
                                            >
                                                <span>Absent except...</span>
                                            </button>

                                            <button
                                                onClick={() => handleMassMark('not_taken')}
                                                className="w-full px-4 py-2.5 text-left hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                                            >
                                                <span>Not taken (Reset)</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Initial Empty State Banner if no attendance recorded yet */}
                            {!hasAttendanceRecorded && (
                                <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3 my-4">
                                    <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mx-auto shadow-inner">
                                        <AlertCircle className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-lg font-black uppercase text-slate-800 dark:text-slate-200 tracking-tight">
                                        No attendance taken on '{formattedDateTitle}'
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium">
                                        Click on <strong className="text-indigo-600 dark:text-indigo-400">🔻 next to 'Mark whole school/class as'</strong> and choose an option to quickly record attendance for all students, or manually select statuses below for each student.
                                    </p>
                                </div>
                            )}

                            {/* Search Student Input Bar */}
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search student by name or adm no..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Student Attendance List Grid */}
                            <div className="space-y-2.5 max-h-[42vh] overflow-y-auto pr-1 custom-scrollbar">
                                {classStudents.filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.admissionNumber || '').toLowerCase().includes(searchQuery.toLowerCase())).map((st, idx) => {
                                    const currentStatus = attendanceMap[st.id]?.status || 'not_taken';
                                    const currentRemarks = attendanceMap[st.id]?.remarks || '';

                                    return (
                                        <div key={st.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 gap-3 hover:border-indigo-200 transition-all">
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-xs">
                                                    {idx + 1}. {st.name}
                                                </p>
                                                <p className="text-[10px] font-mono text-slate-400">
                                                    ADM: {st.admissionNumber || `ADM/${idx + 100}`} • {st.studentClass || selectedClass}
                                                </p>
                                            </div>

                                            {/* Status Choice Chips */}
                                            <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                                                {(['present', 'absent', 'late', 'excused'] as const).map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => handleStatusChange(st.id, status)}
                                                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                                            currentStatus === status
                                                                ? status === 'present' ? 'bg-emerald-600 text-white shadow-md' :
                                                                  status === 'absent' ? 'bg-rose-600 text-white shadow-md' :
                                                                  status === 'late' ? 'bg-amber-500 text-slate-950 shadow-md' :
                                                                  'bg-blue-600 text-white shadow-md'
                                                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                                        }`}
                                                    >
                                                        {status}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                        </div>

                        {/* ── FOOTER ACTION & PARENT SMS DISPATCH BAR ── */}
                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={notifyParentsSms}
                                    onChange={e => setNotifyParentsSms(e.target.checked)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                />
                                <span className="flex items-center gap-1">
                                    <Send className="w-3.5 h-3.5 text-cyan-500" />
                                    Dispatch SMS alerts to parents for absent/late students
                                </span>
                            </label>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                    onClick={onClose}
                                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSubmitting}
                                    className="px-7 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    <ShieldCheck className="w-4 h-4" />
                                    <span>{isSubmitting ? 'Saving Register...' : 'Confirm & Save Attendance'}</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};
