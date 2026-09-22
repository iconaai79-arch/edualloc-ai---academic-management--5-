import React, { useState, useMemo, useEffect } from 'react';
import type { User, StudentAttendance, Institution, AcademicYear, Semester, Course } from '../../types';
import { apiService } from '../../services/apiService';
import { extractClassAndStream, naturalClassSort } from '../../utils/academicUtils';
import { 
    CheckCircle2, XCircle, Clock, Users, 
    CheckCheck, Send, Printer, Search, ShieldCheck
} from 'lucide-react';

export interface ClassSupervisorAttendanceManagerProps {
    currentUser: User;
    students?: User[];
    users?: User[];
    courses?: Course[];
    allocatedGrades?: string[];
    subjectAllocations?: any[];
    currentInstitution?: Institution | null;
    activeAcademicYear?: AcademicYear | null;
    activeSemester?: Semester | null;
    onSaveAttendance?: (lessonId: string, data: { studentId: string; status: 'present' | 'absent' | 'late' | 'excused'; remarks?: string }[]) => Promise<void>;
    onLogAction?: (msg: string) => void;
}

export const ClassSupervisorAttendanceManager: React.FC<ClassSupervisorAttendanceManagerProps> = ({
    currentUser,
    students = [],
    users = [],
    courses = [],
    allocatedGrades = [],
    subjectAllocations = [],
    currentInstitution,
    activeAcademicYear,
    activeSemester,
    onSaveAttendance,
    onLogAction
}) => {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [notifyParentsSms, setNotifyParentsSms] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Get all student users
    const allStudents = useMemo(() => {
        if (students.length > 0) return students;
        return users.filter(u => {
            const r = (u.role || '').toLowerCase();
            return r === 'student' || r === 'learner' || r === 'pupil' || !!u.admissionNumber;
        });
    }, [students, users]);

    // Extract available classes/streams from supervisor assignments, courses, and student records
    const availableClasses = useMemo(() => {
        const set = new Set<string>();

        // 1. Direct supervisor class on user
        if (currentUser.supervisedClass) set.add(currentUser.supervisedClass.trim());
        if ((currentUser as any).supervised_class) set.add(String((currentUser as any).supervised_class).trim());
        if (currentUser.studentClass) set.add(currentUser.studentClass.trim());

        // 2. From courses where current user is class teacher/supervisor
        (courses || []).forEach(c => {
            (c.levels || []).forEach(lvl => {
                if (lvl.classTeacherId === currentUser.id || 
                    (lvl as any).supervisorId === currentUser.id ||
                    ((lvl as any).classTeacher && currentUser.name && (lvl as any).classTeacher.toLowerCase().trim() === currentUser.name.toLowerCase().trim())) {
                    if (lvl.name) set.add(lvl.name.trim());
                }
            });
        });

        // 3. From subjectAllocations where user is class supervisor/teacher
        const uId = currentUser.id;
        const uName = (currentUser.name || '').toLowerCase().trim();
        (subjectAllocations || []).forEach(a => {
            if (!a) return;
            const isMe = a.teacherId === uId || (uName && a.teacherName && a.teacherName.toLowerCase().trim() === uName);
            if (isMe && (a.isClassTeacher || a.is_class_teacher || a.isSupervisor || a.is_supervisor || a.role === 'class_teacher' || a.role === 'class_supervisor')) {
                const cName = a.className || a.class || a.grade;
                if (cName) set.add(cName.trim());
            }
        });

        // 4. From allocatedGrades
        (allocatedGrades || []).forEach(g => {
            if (g && g.trim()) set.add(g.trim());
        });

        // 5. If no specific supervised class found, fallback to classes in student directory
        if (set.size === 0) {
            allStudents.forEach(s => {
                if (s.studentClass) set.add(s.studentClass.trim());
                const gr = (s as any).gradeLevel || (s as any).grade || (s as any).academicLevel;
                if (gr) set.add(String(gr).trim());
            });
        }

        const list = Array.from(set).filter(Boolean);
        return list.length > 0 ? naturalClassSort(list) : ['Grade 9'];
    }, [currentUser, courses, subjectAllocations, allocatedGrades, allStudents]);

    // Active selected class state
    const [selectedClass, setSelectedClass] = useState<string>(() => {
        return currentUser.supervisedClass || currentUser.studentClass || availableClasses[0] || 'Grade 9';
    });

    useEffect(() => {
        if (!availableClasses.includes(selectedClass) && availableClasses.length > 0) {
            setSelectedClass(currentUser.supervisedClass && availableClasses.includes(currentUser.supervisedClass) 
                ? currentUser.supervisedClass 
                : availableClasses[0]);
        }
    }, [availableClasses, selectedClass, currentUser.supervisedClass]);

    // Resilient class matching helper
    const doesStudentMatchClass = (s: User, targetClass: string): boolean => {
        if (!targetClass || targetClass === 'all') return true;
        const cleanTarget = targetClass.toLowerCase().trim();
        const parsedTarget = extractClassAndStream(targetClass);
        const canonicalTarget = parsedTarget.className.toLowerCase().trim();
        const targetStream = parsedTarget.stream.toLowerCase().trim();

        // Direct user class properties
        const studentProps = [
            s.studentClass,
            (s as any).gradeLevel,
            (s as any).grade,
            (s as any).academicLevel,
            (s as any).currentClass,
            (s as any).class,
            (s as any).className
        ].filter(Boolean).map(x => String(x).toLowerCase().trim());

        for (const prop of studentProps) {
            if (prop === cleanTarget || prop === canonicalTarget) return true;
            const parsedProp = extractClassAndStream(prop);
            const canonicalProp = parsedProp.className.toLowerCase().trim();
            if (canonicalProp === canonicalTarget || canonicalProp === cleanTarget) {
                if (!targetStream || parsedProp.stream.toLowerCase().trim() === targetStream) {
                    return true;
                }
            }
            if (prop.includes(cleanTarget) || cleanTarget.includes(prop)) return true;
        }

        if (s.courseLevelId) {
            if (s.courseLevelId === targetClass) return true;
            if (courses && courses.length > 0) {
                for (const c of courses) {
                    const lvl = (c.levels || []).find(l => l.id === s.courseLevelId);
                    if (lvl && lvl.name) {
                        const lName = lvl.name.toLowerCase().trim();
                        if (lName === cleanTarget || lName === canonicalTarget || lName.includes(cleanTarget)) return true;
                    }
                }
            }
        }

        // Digit check (e.g. 9 in Grade 9)
        const targetDigits = (targetClass.match(/\d+/) || [])[0];
        if (targetDigits) {
            for (const prop of studentProps) {
                const pDigits = (prop.match(/\d+/) || [])[0];
                if (pDigits && pDigits === targetDigits) return true;
            }
        }

        return false;
    };

    // Filter students for the active supervised class
    const classStudents = useMemo(() => {
        return allStudents.filter(s => {
            const matchClass = doesStudentMatchClass(s, selectedClass);
            const q = searchQuery.toLowerCase().trim();
            const matchSearch = !q || 
                (s.name || '').toLowerCase().includes(q) || 
                (s.admissionNumber || (s as any).admission_number || '').toLowerCase().includes(q);
            return matchClass && matchSearch;
        }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [allStudents, selectedClass, searchQuery]);

    // State for student statuses
    const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: 'present' | 'absent' | 'late' | 'excused'; remarks: string }>>({});

    // Initialize attendance on class or date change
    useEffect(() => {
        const initial: Record<string, { status: 'present' | 'absent' | 'late' | 'excused'; remarks: string }> = {};
        classStudents.forEach(s => {
            initial[s.id] = { status: 'present', remarks: '' };
        });
        setAttendanceMap(initial);
    }, [classStudents, selectedDate]);

    // Metrics calculation
    const metrics = useMemo(() => {
        const total = classStudents.length;
        let present = 0;
        let absent = 0;
        let late = 0;
        let excused = 0;

        Object.values(attendanceMap).forEach(val => {
            if (val.status === 'present') present++;
            else if (val.status === 'absent') absent++;
            else if (val.status === 'late') late++;
            else if (val.status === 'excused') excused++;
        });

        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

        return { total, present, absent, late, excused, rate };
    }, [classStudents.length, attendanceMap]);

    // Single student status toggle
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

    // Batch mark all present
    const handleMarkAllPresent = () => {
        const updated: Record<string, { status: 'present' | 'absent' | 'late' | 'excused'; remarks: string }> = {};
        classStudents.forEach(s => {
            updated[s.id] = { status: 'present', remarks: '' };
        });
        setAttendanceMap(updated);
    };

    // Submit Attendance Register
    const handleSubmitRegister = async () => {
        if (classStudents.length === 0) {
            alert('No students found in selected class register.');
            return;
        }

        setIsSubmitting(true);
        try {
            const recordId = `att_class_${selectedClass.replace(/\s+/g, '_')}_${selectedDate}`;
            const attendanceList = classStudents.map(s => ({
                studentId: s.id,
                status: attendanceMap[s.id]?.status || 'present',
                remarks: attendanceMap[s.id]?.remarks || ''
            }));

            // Save to database
            await apiService.saveModuleRecord('daily_class_attendances', {
                id: recordId,
                institutionId: currentInstitution?.id || currentUser.institutionId,
                supervisorId: currentUser.id,
                supervisorName: currentUser.name,
                className: selectedClass,
                date: selectedDate,
                academicYearId: activeAcademicYear?.id,
                semesterId: activeSemester?.id,
                metrics,
                attendances: attendanceList,
                createdAt: new Date().toISOString()
            });

            if (onSaveAttendance) {
                await onSaveAttendance(recordId, attendanceList as any);
            }

            if (onLogAction) {
                onLogAction(`Class Supervisor ${currentUser.name} submitted daily attendance for ${selectedClass} on ${selectedDate}`);
            }

            setSuccessMsg(`Daily Attendance Register successfully saved for ${selectedClass} (${metrics.present} Present, ${metrics.absent} Absent)!`);
            setTimeout(() => setSuccessMsg(null), 6000);
        } catch (error) {
            console.error('Failed to submit daily class attendance', error);
            alert('Failed to save attendance register. Local record preserved.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 text-left no-print animate-fade-in">
            {/* ── SUPERVISOR HERO BANNER ── */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 md:p-8 text-white border border-indigo-500/30 shadow-2xl backdrop-blur-2xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-800/50">
                                Official Class Supervisor Portal
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                            <span>Daily Student Attendance Register</span>
                        </h2>
                        <p className="text-xs text-slate-300 mt-1 max-w-xl font-medium">
                            Supervisor: <strong className="text-cyan-300">{currentUser.name}</strong> • Active Class: <strong className="text-emerald-400 px-2.5 py-0.5 bg-emerald-950/80 rounded-lg border border-emerald-500/40">{selectedClass}</strong>
                        </p>
                    </div>

                    {/* Date Control */}
                    <div className="flex items-center gap-3 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 shadow-lg">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block px-2">Register Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="bg-slate-950 text-xs font-mono font-bold text-white px-3 py-2 rounded-xl border border-slate-700/80 focus:ring-2 focus:ring-cyan-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── ACTIVE CLASS TABS BAR ── */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-3 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-2">
                <div className="flex items-center justify-between px-2 pt-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Active Supervised Class Tabs</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                        {availableClasses.length} Supervised Class{availableClasses.length !== 1 ? 'es' : ''}
                    </span>
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                    {availableClasses.map(cls => {
                        const isActive = selectedClass === cls;
                        const studentCount = allStudents.filter(s => doesStudentMatchClass(s, cls)).length;
                        return (
                            <button
                                key={cls}
                                type="button"
                                onClick={() => setSelectedClass(cls)}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap shadow-sm ${
                                    isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-500/50'
                                        : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50'
                                }`}
                            >
                                <Users className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                <span>{cls}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                    {studentCount} Students
                                </span>
                                {isActive && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Success Notification Alert */}
            {successMsg && (
                <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs font-black uppercase tracking-wider flex items-center gap-3 shadow-xl animate-fade-in">
                    <CheckCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* ── METRICS COUNTER STAT CARDS ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Enrolled</span>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">{metrics.total}</span>
                        <Users className="w-5 h-5 text-indigo-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Present</span>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{metrics.present}</span>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">Absent</span>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-rose-600 dark:text-rose-400">{metrics.absent}</span>
                        <XCircle className="w-5 h-5 text-rose-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Late Arrived</span>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{metrics.late}</span>
                        <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-cyan-500">Attendance Rate</span>
                    <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-black text-cyan-600 dark:text-cyan-400">{metrics.rate}%</span>
                        <ShieldCheck className="w-5 h-5 text-cyan-500" />
                    </div>
                </div>
            </div>

            {/* ── ATTENDANCE ROLL CALL TABLE ── */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                
                {/* Table Header Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                            <CheckCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Student Roll Call — {selectedClass}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Mark student statuses & add supervisor remarks
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by student name or adm no..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <button
                            onClick={handleMarkAllPresent}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                        >
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Mark All Present</span>
                        </button>
                    </div>
                </div>

                {/* Students List Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider text-[10px]">
                            <tr>
                                <th className="p-4">#</th>
                                <th className="p-4">Student Details</th>
                                <th className="p-4">Gender</th>
                                <th className="p-4">Parent Contact</th>
                                <th className="p-4 text-center">Attendance Status</th>
                                <th className="p-4">Supervisor Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {classStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400 uppercase tracking-widest font-black text-xs">
                                        No students found in class register "{selectedClass}"
                                    </td>
                                </tr>
                            ) : (
                                classStudents.map((st, idx) => {
                                    const currentStatus = attendanceMap[st.id]?.status || 'present';
                                    const currentRemarks = attendanceMap[st.id]?.remarks || '';

                                    return (
                                        <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="p-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                                            <td className="p-4">
                                                <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">
                                                    {st.name}
                                                </div>
                                                <div className="text-[10px] font-mono text-indigo-500 font-bold">
                                                    ADM: {st.admissionNumber || (st as any).admission_number || (st as any).admissionNo || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-500 uppercase font-bold">{st.gender || 'N/A'}</td>
                                            <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                                                {st.phoneNumber || (st as any).parentPhone2 || 'N/A'}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-fit mx-auto">
                                                    <button
                                                        onClick={() => handleStatusChange(st.id, 'present')}
                                                        className={`px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all ${
                                                            currentStatus === 'present'
                                                                ? 'bg-emerald-600 text-white shadow-md'
                                                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                                        }`}
                                                    >
                                                        Present
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(st.id, 'absent')}
                                                        className={`px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all ${
                                                            currentStatus === 'absent'
                                                                ? 'bg-rose-600 text-white shadow-md animate-pulse'
                                                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                                        }`}
                                                    >
                                                        Absent
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(st.id, 'late')}
                                                        className={`px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all ${
                                                            currentStatus === 'late'
                                                                ? 'bg-amber-500 text-slate-950 shadow-md'
                                                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                                        }`}
                                                    >
                                                        Late
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(st.id, 'excused')}
                                                        className={`px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all ${
                                                            currentStatus === 'excused'
                                                                ? 'bg-blue-600 text-white shadow-md'
                                                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                                        }`}
                                                    >
                                                        Excused
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Sick, Fees delay..."
                                                    value={currentRemarks}
                                                    onChange={e => handleRemarksChange(st.id, e.target.value)}
                                                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Controls & Parent SMS Dispatch Bar */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={notifyParentsSms}
                            onChange={e => setNotifyParentsSms(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="flex items-center gap-1">
                            <Send className="w-3.5 h-3.5 text-cyan-500" />
                            Dispatch instant parent SMS alerts for absent/late students
                        </span>
                    </label>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-2xl transition-all flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Print Register</span>
                        </button>

                        <button
                            onClick={handleSubmitRegister}
                            disabled={isSubmitting || classStudents.length === 0}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            <span>{isSubmitting ? 'Saving Register...' : 'Confirm & Save Register'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
