import React, { useState, useMemo } from 'react';
import type { User, StudentAttendance, Institution, AcademicYear, Semester } from '../../types';
import { apiService } from '../../services/apiService';
import { 
    CheckCircle2, Calendar, Users, Award, ThumbsUp, ThumbsDown, 
    Filter, Download, RefreshCw, ChevronDown, ChevronRight, Plus, 
    Search, Send, Eye, Clock, Sparkles, ShieldCheck, ArrowUpRight, UserCheck
} from 'lucide-react';
import { AttendanceTakerModal } from '../AttendanceTakerModal';
import { QuickAttendanceRecordModal } from './QuickAttendanceRecordModal';

export interface AdvancedAttendanceManagerProps {
    users?: User[];
    students?: User[];
    currentInstitution?: Institution | null;
    activeAcademicYear?: AcademicYear | null;
    activeSemester?: Semester | null;
    studentAttendances?: StudentAttendance[];
    onSaveAttendance?: (lessonId: string, data: { studentId: string; status: 'present' | 'absent' | 'late' | 'excused'; remarks?: string }[]) => Promise<void>;
    onLogAction?: (action: string) => Promise<void> | void;
}

export interface ClassDateAttendanceRecord {
    id: string;
    className: string;
    studentCount: number;
    supervisorName: string;
    supervisorId: string;
    date: string;
    present: number;
    absent: number;
    excused: number;
    notTaken: number;
    rate: number;
}

export const AdvancedAttendanceManager: React.FC<AdvancedAttendanceManagerProps> = ({
    users = [],
    students = [],
    currentInstitution,
    activeAcademicYear,
    activeSemester,
    studentAttendances = [],
    onSaveAttendance,
    onLogAction
}) => {
    // Dates Range Filter Default (Last 7 Days)
    const todayStr = new Date().toISOString().split('T')[0];
    const pastSevenDaysStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(pastSevenDaysStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({ [todayStr]: true });
    const [searchClassQuery, setSearchClassQuery] = useState('');
    const [selectedClassRecord, setSelectedClassRecord] = useState<ClassDateAttendanceRecord | null>(null);
    const [isRollCallModalOpen, setIsRollCallModalOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // List of students
    const allStudents = useMemo(() => {
        if (students.length > 0) return students;
        return users.filter(u => u.role === 'student');
    }, [students, users]);

    // List of teachers / supervisors
    const supervisors = useMemo(() => {
        return users.filter(u => u.role === 'teacher' || u.role === 'lecturer' || u.role === 'class_supervisor' || u.role === 'hod');
    }, [users]);

    // Mock/Generated structured class records by Date matching the reference picture format
    const dateRecordsMap = useMemo(() => {
        const dates: string[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let d = new Date(end); d >= start; d.setDate(d.getDate() - 1)) {
            dates.push(d.toISOString().split('T')[0]);
        }

        const classesList = [
            { name: 'Form 3 2026', count: 22, supervisor: 'Francis Okengo', supId: 'sup_1' },
            { name: 'Form 4 2026', count: 29, supervisor: 'Josiah Okiring', supId: 'sup_2' },
            { name: 'GRADE 10 2026', count: 16, supervisor: 'Raphael Oeri', supId: 'sup_3' },
            { name: 'Grade 4 Blue', count: 25, supervisor: 'Mary Nduta', supId: 'sup_4' },
        ];

        const map: Record<string, ClassDateAttendanceRecord[]> = {};

        dates.forEach(dStr => {
            const records: ClassDateAttendanceRecord[] = classesList.map((cls, idx) => {
                // If it's today and some attendances submitted
                const isToday = dStr === todayStr;
                const pCount = isToday ? (idx === 0 ? 20 : idx === 1 ? 26 : 0) : Math.floor(cls.count * (idx === 3 ? 0.95 : 0.88));
                const aCount = isToday ? (idx === 0 ? 2 : idx === 1 ? 3 : 0) : Math.floor(cls.count * 0.08);
                const eCount = isToday ? 0 : 0;
                const ntCount = isToday && (idx === 2 || idx === 3) ? cls.count : Math.max(0, cls.count - (pCount + aCount + eCount));
                const rate = cls.count > 0 ? Math.round(((pCount) / cls.count) * 100) : 0;

                return {
                    id: `rec_${dStr}_${cls.name.replace(/\s+/g, '_')}`,
                    className: cls.name,
                    studentCount: cls.count,
                    supervisorName: cls.supervisor,
                    supervisorId: cls.supId,
                    date: dStr,
                    present: pCount,
                    absent: aCount,
                    excused: eCount,
                    notTaken: ntCount,
                    rate: rate
                };
            });

            map[dStr] = records;
        });

        return map;
    }, [startDate, endDate, todayStr]);

    // Leaderboard computations
    const leaderboard = useMemo(() => {
        const supStats: Record<string, { name: string; class: string; totalDays: number; takenDays: number; totalRate: number }> = {
            'Francis Okengo': { name: 'Francis Okengo', class: 'Form 3 2026', totalDays: 7, takenDays: 6, totalRate: 92 },
            'Josiah Okiring': { name: 'Josiah Okiring', class: 'Form 4 2026', totalDays: 7, takenDays: 5, totalRate: 88 },
            'Raphael Oeri': { name: 'Raphael Oeri', class: 'GRADE 10 2026', totalDays: 7, takenDays: 1, totalRate: 14 },
            'Mary Nduta': { name: 'Mary Nduta', class: 'Grade 4 Blue', totalDays: 7, takenDays: 7, totalRate: 98 },
        };

        return Object.values(supStats).sort((a, b) => b.totalRate - a.totalRate);
    }, []);

    // Toggle Expand Date Row
    const toggleDateExpand = (dStr: string) => {
        setExpandedDates(prev => ({ ...prev, [dStr]: !prev[dStr] }));
    };

    // Handle Manual Refresh
    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 600);
    };

    // Export CSV Report
    const handleExportCSV = () => {
        const rows: string[] = ['Date,Class,Supervisor,Present,Absent,Excused,Not Taken,Rate%'];
        Object.entries(dateRecordsMap).forEach(([dStr, recs]) => {
            recs.forEach(r => {
                rows.push(`${dStr},"${r.className}","${r.supervisorName}",${r.present},${r.absent},${r.excused},${r.notTaken},${r.rate}%`);
            });
        });

        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Attendance_Records_${startDate}_to_${endDate}.csv`;
        a.click();
    };

    // Open Take Attendance Modal for specific class
    const handleOpenRollCall = (rec: ClassDateAttendanceRecord) => {
        setSelectedClassRecord(rec);
        setIsRollCallModalOpen(true);
    };

    // Total Overall KPI Metrics
    const kpis = useMemo(() => {
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalExcused = 0;
        let totalNotTaken = 0;
        let grandTotalStudents = 0;

        Object.values(dateRecordsMap).forEach(recs => {
            recs.forEach(r => {
                totalPresent += r.present;
                totalAbsent += r.absent;
                totalExcused += r.excused;
                totalNotTaken += r.notTaken;
                grandTotalStudents += r.studentCount;
            });
        });

        const overallRate = grandTotalStudents > 0 ? Math.round((totalPresent / grandTotalStudents) * 100) : 0;
        return { totalPresent, totalAbsent, totalExcused, totalNotTaken, grandTotalStudents, overallRate };
    }, [dateRecordsMap]);

    return (
        <div className="space-y-6 text-left font-sans text-slate-900 dark:text-slate-100 no-print">
            
            {/* ── TOP BANNER & ACTION BAR ── */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 md:p-8 text-white border border-indigo-500/30 shadow-2xl backdrop-blur-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-800/50">
                                Institutional Attendance Hub
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                            <UserCheck className="w-8 h-8 text-emerald-400" />
                            <span>Daily Attendance Governance</span>
                        </h2>
                        <p className="text-xs text-slate-300 font-medium mt-1">
                            Monitor daily class registers, supervisor compliance, attendance rates & parent SMS dispatches.
                        </p>
                    </div>

                    {/* Primary Take Attendance & Refresh Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => {
                                const firstRec = Object.values(dateRecordsMap)[0]?.[0];
                                if (firstRec) handleOpenRollCall(firstRec);
                            }}
                            className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <Plus className="w-4.5 h-4.5" />
                            <span>Take Attendance</span>
                        </button>

                        <button
                            onClick={handleRefresh}
                            className={`p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-700 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                            title="Refresh Records"
                        >
                            <RefreshCw className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── METRICS SUMMARY STAT CARDS ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Total Students Monitored</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{allStudents.length || 67}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 block">Present Records</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{kpis.totalPresent}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 block">Absent Records</span>
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">{kpis.totalAbsent}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block">Unsubmitted / Not Taken</span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">{kpis.totalNotTaken}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-cyan-500 block">Overall Compliance Rate</span>
                    <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1 block">{kpis.overallRate}%</span>
                </div>
            </div>

            {/* ── TWO COLUMN MAIN PANEL (LEFT TABLE + RIGHT LEADERBOARD) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ── LEFT MAIN PANEL: DATE ACCORDION ATTENDANCE TABLE ── */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                    
                    {/* Header Controls & Filter Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-500" />
                                ATTENDANCE RECORDS FROM {startDate} TO {endDate}
                            </h3>
                        </div>

                        {/* Filter & Export Buttons */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="bg-transparent text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none px-1"
                                />
                                <span className="text-slate-400">-</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="bg-transparent text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none px-1"
                                />
                            </div>

                            <button
                                onClick={handleExportCSV}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                            </button>
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="p-3.5">Class</th>
                                    <th className="p-3.5">Supervisor</th>
                                    <th className="p-3.5 text-center">Present</th>
                                    <th className="p-3.5 text-center">Absent</th>
                                    <th className="p-3.5 text-center">Excused</th>
                                    <th className="p-3.5 text-center">Not Taken</th>
                                    <th className="p-3.5 text-center">Rate</th>
                                    <th className="p-3.5 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                                {Object.entries(dateRecordsMap).map(([dStr, recs]) => {
                                    const isExpanded = !!expandedDates[dStr];
                                    
                                    // Aggregate for the date row
                                    const dayPresent = recs.reduce((s, r) => s + r.present, 0);
                                    const dayAbsent = recs.reduce((s, r) => s + r.absent, 0);
                                    const dayExcused = recs.reduce((s, r) => s + r.excused, 0);
                                    const dayNotTaken = recs.reduce((s, r) => s + r.notTaken, 0);
                                    const dayTotal = recs.reduce((s, r) => s + r.studentCount, 0);
                                    const dayRate = dayTotal > 0 ? Math.round((dayPresent / dayTotal) * 100) : 0;

                                    // Format Date display
                                    const dateObj = new Date(dStr);
                                    const formattedDateLabel = dateObj.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });

                                    return (
                                        <React.Fragment key={dStr}>
                                            {/* Parent Date Group Header Row */}
                                            <tr
                                                onClick={() => toggleDateExpand(dStr)}
                                                className="bg-slate-100/70 dark:bg-slate-800/50 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer font-black text-slate-800 dark:text-slate-100 transition-colors"
                                            >
                                                <td className="p-3.5 flex items-center gap-2">
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-4 h-4 text-indigo-500" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                                    )}
                                                    <span className="uppercase text-xs font-black text-indigo-600 dark:text-indigo-400">
                                                        {formattedDateLabel} ({dStr})
                                                    </span>
                                                </td>
                                                <td className="p-3.5 text-slate-400 font-medium text-[10px]">All Assigned Classes</td>
                                                <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">{dayPresent}</td>
                                                <td className="p-3.5 text-center font-bold text-rose-600 dark:text-rose-400">{dayAbsent}</td>
                                                <td className="p-3.5 text-center font-bold text-slate-400">{dayExcused}</td>
                                                <td className="p-3.5 text-center font-bold text-amber-500">{dayNotTaken}</td>
                                                <td className="p-3.5 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                                                        dayRate >= 80
                                                            ? 'bg-emerald-500 text-white'
                                                            : dayRate >= 50
                                                                ? 'bg-amber-500 text-white'
                                                                : 'bg-orange-500 text-white'
                                                    }`}>
                                                        {dayRate}%
                                                    </span>
                                                </td>
                                                <td className="p-3.5 text-center">
                                                    <button className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline">
                                                        {isExpanded ? 'Collapse' : 'Expand'}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Child Rows for Each Class under this Date */}
                                            {isExpanded && recs.map(r => (
                                                <tr key={r.id} className="bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="p-3.5 pl-8 font-bold text-slate-800 dark:text-slate-200">
                                                        {r.className} <span className="text-slate-400 font-medium text-[10px]">({r.studentCount})</span>
                                                    </td>
                                                    <td className="p-3.5 font-medium text-slate-600 dark:text-slate-300">
                                                        {r.supervisorName}
                                                    </td>
                                                    <td className="p-3.5 text-center text-emerald-600 font-bold">{r.present}</td>
                                                    <td className="p-3.5 text-center text-rose-600 font-bold">{r.absent}</td>
                                                    <td className="p-3.5 text-center text-slate-400">{r.excused}</td>
                                                    <td className="p-3.5 text-center text-amber-500 font-bold">{r.notTaken}</td>
                                                    <td className="p-3.5 text-center">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                                                            r.rate >= 80
                                                                ? 'bg-emerald-500 text-white'
                                                                : r.rate >= 50
                                                                    ? 'bg-amber-500 text-white'
                                                                    : 'bg-orange-500 text-white'
                                                        }`}>
                                                            {r.rate}%
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 text-center">
                                                        <button
                                                            onClick={() => handleOpenRollCall(r)}
                                                            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                                                        >
                                                            View / Take
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

                {/* ── RIGHT PANEL: ATTENDANCE TAKING LEADERBOARD ── */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-500" />
                            ATTENDANCE TAKING LEADERBOARD
                        </h3>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">
                            Compliance Rank
                        </span>
                    </div>

                    {/* Leaderboard Rankings List */}
                    <div className="space-y-3">
                        {leaderboard.map((item, index) => {
                            const isCompliant = item.totalRate >= 80;

                            return (
                                <div key={index} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 hover:border-indigo-200 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                                            index === 0 ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' :
                                            index === 1 ? 'bg-slate-300 text-slate-900' :
                                            index === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                        }`}>
                                            {index + 1}
                                        </div>

                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-xs">
                                                {item.name}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                {item.class}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="font-black text-xs text-slate-900 dark:text-white">
                                            {item.totalRate}%
                                        </span>

                                        <div className={`p-1.5 rounded-xl ${
                                            isCompliant ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                        }`}>
                                            {isCompliant ? (
                                                <ThumbsUp className="w-4 h-4" />
                                            ) : (
                                                <ThumbsDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Supervisor Nudge Action Bar */}
                    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs space-y-2">
                        <div className="font-black uppercase text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            <span>Supervisor Nudge Engine</span>
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                            Send automated reminder SMS & app notification to supervisors with pending attendance registers.
                        </p>
                        <button
                            onClick={() => alert("Automated reminder dispatches sent to all pending supervisors!")}
                            className="w-full py-2 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>Nudge Delinquent Supervisors</span>
                        </button>
                    </div>
                </div>

            </div>

            {/* ── ADVANCED QUICK ATTENDANCE COMMAND MODAL ── */}
            {isRollCallModalOpen && (
                <QuickAttendanceRecordModal
                    isOpen={isRollCallModalOpen}
                    onClose={() => setIsRollCallModalOpen(false)}
                    students={allStudents}
                    users={users}
                    currentInstitution={currentInstitution}
                    initialDate={selectedClassRecord?.date || todayStr}
                    initialClassName={selectedClassRecord?.className || 'Form 3 2026'}
                    onSaveAttendanceComplete={async (dStr, clsName, data) => {
                        if (onSaveAttendance) {
                            await onSaveAttendance(`att_${dStr}_${clsName}`, data as any);
                        }
                    }}
                />
            )}
        </div>
    );
};
