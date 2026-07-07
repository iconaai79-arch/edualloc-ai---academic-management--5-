
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { User, Subject, Course, TimetableEntry, StudentAttendance, AcademicYear, Semester } from '../types';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckIcon } from './icons/CheckIcon';

// ──────────────────────────────────────────
// PROPS
// ──────────────────────────────────────────
interface AscScannerPanelProps {
    currentUser: User;
    users: User[];
    subjects: Subject[];
    courses: Course[];
    allocations: { subjectId: string; lecturerId?: string }[];
    activeAcademicYear?: AcademicYear | null;
    activeSemester?: Semester | null;
    /** Called to persist a placeholder timetable entry + attendance rows */
    onSaveSession: (
        placeholderEntry: Omit<TimetableEntry, 'id'> & { id: string },
        attendanceRows: { studentId: string; status: 'present' | 'absent' | 'late' }[]
    ) => Promise<void>;
}

// ──────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function todayName() {
    return DAYS[new Date().getDay() - 1] ?? 'Monday';
}

function nowHHMM() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ──────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────
export const AscScannerPanel: React.FC<AscScannerPanelProps> = ({
    currentUser,
    users,
    subjects,
    courses,
    allocations,
    activeAcademicYear,
    activeSemester,
    onSaveSession
}) => {
    // ── Step state ──────────────────────────
    const [step, setStep] = useState<'setup' | 'scanning' | 'review' | 'saved'>('setup');

    // ── Setup form ──────────────────────────
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [sessionDay, setSessionDay] = useState(todayName());
    const [sessionStart, setSessionStart] = useState(nowHHMM());
    const [sessionEnd, setSessionEnd] = useState('');
    const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);

    // ── Scanning ────────────────────────────
    const [scanInput, setScanInput] = useState('');
    const [scannedIds, setScannedIds] = useState<Set<string>>(new Set());
    const [lastScan, setLastScan] = useState<{ name: string; status: 'ok' | 'err' } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    // ── Derived: subjects this teacher is allocated ──
    const mySubjects = useMemo(() => {
        const allocatedIds = new Set(
            allocations
                .filter(a => !a.lecturerId || a.lecturerId === currentUser.id)
                .map(a => a.subjectId)
        );
        return subjects.filter(s => allocatedIds.has(s.id));
    }, [subjects, allocations, currentUser.id]);

    // If no allocations, show all subjects (fallback for institutions without allocation workflow)
    const availableSubjects = mySubjects.length > 0 ? mySubjects : subjects;

    // ── Derived: students for selected course ──
    const courseStudents = useMemo(() => {
        if (!selectedCourseId) return [];
        return users.filter(u => u.role === 'student' && u.courseId === selectedCourseId);
    }, [users, selectedCourseId]);

    // All students lookup maps
    const studentByAdmission = useMemo(() => {
        const map = new Map<string, User>();
        users.filter(u => u.role === 'student').forEach(u => {
            if (u.admissionNumber) map.set(u.admissionNumber.toLowerCase().trim(), u);
            // Also index by id for manual mode
            map.set(u.id, u);
        });
        return map;
    }, [users]);

    // ── Focus scanner input when scanning ──
    useEffect(() => {
        if (step === 'scanning') {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [step]);

    // ── Handlers ────────────────────────────
    const handleSetupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubjectId || !selectedCourseId) return;
        const defaultEnd = sessionStart
            ? `${String(parseInt(sessionStart.split(':')[0]) + 1).padStart(2, '0')}:${sessionStart.split(':')[1]}`
            : '';
        if (!sessionEnd) setSessionEnd(defaultEnd);
        setStep('scanning');
    };

    const processCode = useCallback((raw: string) => {
        const code = raw.trim();
        if (!code) return;

        // Try admission number first, then id
        const student = studentByAdmission.get(code.toLowerCase()) ?? studentByAdmission.get(code);
        if (!student) {
            setLastScan({ name: `"${code}" NOT FOUND`, status: 'err' });
            return;
        }
        if (scannedIds.has(student.id)) {
            setLastScan({ name: `${student.name} (already scanned)`, status: 'ok' });
            return;
        }
        setScannedIds(prev => new Set([...prev, student.id]));
        setLastScan({ name: student.name, status: 'ok' });
    }, [studentByAdmission, scannedIds]);

    const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            processCode(scanInput);
            setScanInput('');
        }
    };

    // Mark everyone in course as present if they are in scannedIds; absent otherwise
    const buildAttendanceRows = () => {
        const rows: { studentId: string; status: 'present' | 'absent' | 'late' }[] = [];

        // Students in selected course
        courseStudents.forEach(s => {
            rows.push({ studentId: s.id, status: scannedIds.has(s.id) ? 'present' : 'absent' });
        });

        // Students scanned but not in course list (edge case)
        scannedIds.forEach(id => {
            if (!courseStudents.some(s => s.id === id)) {
                rows.push({ studentId: id, status: 'present' });
            }
        });

        return rows;
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            const entryId = `scan_${currentUser.id}_${Date.now()}`;
            const placeholder: Omit<TimetableEntry, 'id'> & { id: string } = {
                id: entryId,
                day: sessionDay,
                startTime: sessionStart,
                endTime: sessionEnd || `${String(parseInt(sessionStart.split(':')[0]) + 1).padStart(2, '0')}:${sessionStart.split(':')[1]}`,
                subjectId: selectedSubjectId,
                lecturerId: currentUser.id,
                roomId: 'scan_placeholder',
                institutionId: currentUser.institutionId,
                academicYearId: activeAcademicYear?.id || 'ay_scan',
                semesterId: activeSemester?.id || 'sem_scan',
                courseId: selectedCourseId,
                courseLevelId: '',
                attendanceStatus: 'present',
                isConflicting: false,
            };
            const rows = buildAttendanceRows();
            await onSaveSession(placeholder, rows);
            setStep('saved');
        } catch (err: any) {
            setSaveError(err?.message || 'Failed to save session. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setStep('setup');
        setScannedIds(new Set());
        setLastScan(null);
        setScanInput('');
        setSaveError(null);
        setSelectedSubjectId('');
        setSelectedCourseId('');
        setSessionDay(todayName());
        setSessionStart(nowHHMM());
        setSessionEnd('');
        setSessionDate(new Date().toISOString().split('T')[0]);
    };

    // ── Render helpers ──────────────────────
    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
    const selectedCourse = courses.find(c => c.id === selectedCourseId);
    const presentCount = scannedIds.size;
    const totalCount = courseStudents.length;
    const absentCount = Math.max(0, totalCount - Array.from(scannedIds).filter(id => courseStudents.some(s => s.id === id)).length);

    // ══════════════════════════════════════════
    // STEP: SETUP
    // ══════════════════════════════════════════
    if (step === 'setup') {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="p-8 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <QrCodeIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Free-form Scan Session</h3>
                            <p className="text-violet-200 text-xs font-bold uppercase tracking-widest mt-0.5">
                                For schools using aSc TimeTables or offline scheduling
                            </p>
                        </div>
                    </div>
                </div>

                {/* Info Banner */}
                <div className="px-8 pt-6">
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 flex gap-3">
                        <div className="w-6 h-6 mt-0.5 flex-shrink-0 text-indigo-600">ℹ</div>
                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 leading-relaxed">
                            Use this when your school schedules lessons via <strong>aSc TimeTables</strong> or any external tool.
                            Select the class &amp; subject, then scan or type student admission numbers to record attendance —
                            no system timetable needed.
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSetupSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Subject */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Subject / Unit</label>
                            <select
                                required
                                value={selectedSubjectId}
                                onChange={e => setSelectedSubjectId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                            >
                                <option value="">Select subject...</option>
                                {availableSubjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                ))}
                            </select>
                        </div>

                        {/* Class / Course */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Class / Programme</label>
                            <select
                                required
                                value={selectedCourseId}
                                onChange={e => setSelectedCourseId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                            >
                                <option value="">Select class...</option>
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Lesson Date</label>
                            <input
                                type="date"
                                required
                                value={sessionDate}
                                onChange={e => {
                                    setSessionDate(e.target.value);
                                    const d = new Date(e.target.value);
                                    setSessionDay(DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1] ?? 'Monday');
                                }}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                            />
                        </div>

                        {/* Day */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Day of Week</label>
                            <select
                                value={sessionDay}
                                onChange={e => setSessionDay(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                            >
                                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        {/* Start Time */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Start Time</label>
                            <input
                                type="time"
                                required
                                value={sessionStart}
                                onChange={e => setSessionStart(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                            />
                        </div>

                        {/* End Time */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">End Time (optional)</label>
                            <input
                                type="time"
                                value={sessionEnd}
                                onChange={e => setSessionEnd(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full h-14 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:brightness-110 transition-all active:scale-95"
                    >
                        Start Scan Session →
                    </button>
                </form>
            </div>
        );
    }

    // ══════════════════════════════════════════
    // STEP: SCANNING
    // ══════════════════════════════════════════
    if (step === 'scanning') {
        return (
            <div className="space-y-6 animate-fade-in-up">
                {/* Session Header */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-6 rounded-[2rem] flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-violet-200 text-[10px] font-black uppercase tracking-widest">Active Scan Session</p>
                        <h3 className="text-xl font-black tracking-tight mt-1">
                            {selectedSubject?.name} • {selectedCourse?.name}
                        </h3>
                        <p className="text-violet-300 text-xs mt-1">{sessionDay} {sessionStart}{sessionEnd ? ` – ${sessionEnd}` : ''} • {sessionDate}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <p className="text-3xl font-black">{presentCount}</p>
                            <p className="text-violet-200 text-[10px] uppercase tracking-widest">Scanned</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-black text-violet-300">{absentCount}</p>
                            <p className="text-violet-200 text-[10px] uppercase tracking-widest">Absent</p>
                        </div>
                    </div>
                </div>

                {/* Scanner Input */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-violet-50 dark:bg-violet-950/30 rounded-xl">
                            <QrCodeIcon className="w-6 h-6 text-violet-600" />
                        </div>
                        <div>
                            <h4 className="font-black uppercase tracking-tight text-slate-900 dark:text-white">Scan / Enter Admission Number</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Point barcode scanner here or type manually, then press Enter</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={scanInput}
                            onChange={e => setScanInput(e.target.value)}
                            onKeyDown={handleScanKeyDown}
                            placeholder="Scan barcode or type admission no..."
                            className="flex-1 px-5 py-4 text-lg font-bold bg-slate-50 dark:bg-slate-900 border-2 border-violet-300 dark:border-violet-700 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none placeholder:text-slate-300"
                            autoComplete="off"
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={() => { processCode(scanInput); setScanInput(''); }}
                            className="px-6 py-4 bg-violet-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-violet-700 transition-colors shadow-lg shadow-violet-100"
                        >
                            Add
                        </button>
                    </div>

                    {/* Last scan feedback */}
                    {lastScan && (
                        <div className={`mt-4 flex items-center gap-3 p-4 rounded-2xl border transition-all animate-fade-in ${lastScan.status === 'ok'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-800'
                            }`}>
                            {lastScan.status === 'ok'
                                ? <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                : <XIcon className="w-5 h-5 text-rose-600 flex-shrink-0" />
                            }
                            <p className={`text-sm font-black uppercase tracking-tight ${lastScan.status === 'ok' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                {lastScan.name}
                            </p>
                        </div>
                    )}
                </div>

                {/* Student list */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <UserGroupIcon className="w-5 h-5 text-slate-400" />
                            <h4 className="font-black uppercase tracking-tight text-slate-900 dark:text-white text-sm">
                                Class Register — {selectedCourse?.name}
                            </h4>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {presentCount}/{totalCount} present
                        </span>
                    </div>
                    <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-slate-50 dark:divide-slate-800">
                        {courseStudents.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-300">No students in this class</p>
                            </div>
                        ) : courseStudents.map(student => {
                            const isPresent = scannedIds.has(student.id);
                            return (
                                <div
                                    key={student.id}
                                    className={`flex items-center justify-between px-6 py-3 transition-all ${isPresent ? 'bg-emerald-50/60 dark:bg-emerald-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'}`}
                                >
                                    <div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{student.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.admissionNumber || student.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isPresent ? (
                                            <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                <CheckIcon className="w-3 h-3" /> Present
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                Absent
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            title={isPresent ? 'Mark absent' : 'Mark present'}
                                            onClick={() => {
                                                setScannedIds(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(student.id)) next.delete(student.id);
                                                    else next.add(student.id);
                                                    return next;
                                                });
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400"
                                        >
                                            {isPresent
                                                ? <XIcon className="w-4 h-4" />
                                                : <CheckIcon className="w-4 h-4" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex-1 h-12 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        Cancel Session
                    </button>
                    <button
                        type="button"
                        onClick={() => setStep('review')}
                        disabled={scannedIds.size === 0 && courseStudents.length === 0}
                        className="flex-2 flex-grow h-12 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:brightness-110 transition-all disabled:opacity-50"
                    >
                        Review & Save →
                    </button>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════
    // STEP: REVIEW
    // ══════════════════════════════════════════
    if (step === 'review') {
        const rows = buildAttendanceRows();
        const presentRows = rows.filter(r => r.status === 'present');
        const absentRows = rows.filter(r => r.status === 'absent');
        const getStudentName = (id: string) => users.find(u => u.id === id)?.name ?? id;

        return (
            <div className="space-y-6 animate-fade-in-up">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 p-8">
                    <h3 className="text-xl font-black uppercase tracking-tighter mb-6 text-slate-900 dark:text-white">Session Summary</h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Subject', value: selectedSubject?.name ?? '—', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300' },
                            { label: 'Class', value: selectedCourse?.name ?? '—', color: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300' },
                            { label: 'Present', value: presentRows.length, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' },
                            { label: 'Absent', value: absentRows.length, color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' },
                        ].map(card => (
                            <div key={card.label} className={`${card.color} rounded-2xl p-4`}>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{card.label}</p>
                                <p className="text-lg font-black mt-1 truncate">{card.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Present */}
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3">Present ({presentRows.length})</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                {presentRows.map(r => (
                                    <div key={r.studentId} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                                        <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                        <span className="text-xs font-bold text-slate-800 dark:text-white">{getStudentName(r.studentId)}</span>
                                    </div>
                                ))}
                                {presentRows.length === 0 && <p className="text-xs text-slate-400 font-bold">None</p>}
                            </div>
                        </div>
                        {/* Absent */}
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-3">Absent ({absentRows.length})</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                {absentRows.map(r => (
                                    <div key={r.studentId} className="flex items-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-950/20 rounded-xl">
                                        <XIcon className="w-4 h-4 text-rose-500 flex-shrink-0" />
                                        <span className="text-xs font-bold text-slate-800 dark:text-white">{getStudentName(r.studentId)}</span>
                                    </div>
                                ))}
                                {absentRows.length === 0 && <p className="text-xs text-slate-400 font-bold">None</p>}
                            </div>
                        </div>
                    </div>

                    {saveError && (
                        <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800 rounded-2xl text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-widest">
                            ⚠ {saveError}
                        </div>
                    )}

                    <div className="flex gap-4 mt-8">
                        <button
                            type="button"
                            onClick={() => setStep('scanning')}
                            className="flex-1 h-12 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                        >
                            ← Back to Scan
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-grow-[2] h-12 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Confirm & Save Session'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════
    // STEP: SAVED
    // ══════════════════════════════════════════
    return (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-emerald-100">
                <CheckCircleIcon className="w-12 h-12 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Session Saved!</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center max-w-sm">
                Attendance for <strong className="text-slate-700 dark:text-slate-200">{selectedSubject?.name}</strong> has been recorded.
                The session appears in Attendance Reports.
            </p>
            <button
                type="button"
                onClick={handleReset}
                className="mt-10 px-10 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:brightness-110 transition-all"
            >
                Start New Session
            </button>
        </div>
    );
};
