
import React, { useMemo, useState, useEffect } from 'react';
import type { User, AllocationRequest, Subject, RequestStatus, TimetableEntry, Room, LessonStructure, UserTask, Institution, StudentAbsenceRequest } from '../types';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { ClockInIcon } from './icons/ClockInIcon';
import { StarIcon } from './icons/StarIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { ArrowTrendingUpIcon } from './icons/ArrowTrendingUpIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ShieldIcon } from './icons/ShieldIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { PlusIcon } from './icons/PlusIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { AbsenceRequestModal } from './AbsenceRequestModal';
import { calculateDistance, PROXIMITY_THRESHOLD_METERS } from '../utils/locationUtils';
import { MyTasks } from './MyTasks';
import { AttendanceTakerModal } from './AttendanceTakerModal';
import { CheckCircle2, ArrowRight } from 'lucide-react';


interface LecturerDashboardProps {
    user: User;
    requests: AllocationRequest[];
    allocations: AllocationRequest[];
    subjects: Subject[];
    getSubjectById: (id: string) => Subject | undefined;
    getRoomById: (id: string) => Room | undefined;
    setActiveTab: (tab: string | any) => void;
    generatedTimetable: TimetableEntry[];
    onLessonCheckIn: (timetableEntryId: string) => void;
    onAbsenceRequest: (timetableEntryId: string, reason: string) => void;
    userTasks: UserTask[];
    onAddTask: (task: { title: string; dueDate?: string; }) => void;
    onUpdateTask: (taskId: string, isComplete: boolean) => void;
    onDeleteTask: (taskId: string) => void;
    onNavigateToNearby: () => void;
    currentInstitution?: Institution | null;
    onRequestChange?: (allocation: AllocationRequest) => void;
    studentAttendances?: any[];
    studentAbsenceRequests?: any[];
    onSaveAttendance?: (lessonId: string, attendance: any[]) => Promise<void>;
    users?: User[];
    onAccessAlumnaPortal: (school: any) => void;
    schoolRegistry?: any[];
}

interface UpcomingLessonsWidgetProps {
    userId: string;
    timetable: TimetableEntry[];
    getSubjectById: (id: string) => Subject | undefined;
    getRoomById: (id: string) => Room | undefined;
    onCheckIn: (entryId: string) => void;
    onAbsenceRequest: (entryId: string, reason: string) => void;
    studentAttendances?: any[];
    studentAbsenceRequests?: any[];
    onSaveAttendance?: (lessonId: string, attendance: any[]) => Promise<void>;
    users?: User[];
    currentUser: User;
    studentAbsences: StudentAbsenceRequest[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; colorClass?: string }> = ({ title, value, icon, colorClass = 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' }) => (
    <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md p-6 rounded-[2rem] border border-slate-200/40 dark:border-slate-800/50 flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 group">
        <div>
            <h3 className="text-[9px] font-black uppercase text-slate-450 dark:text-slate-500 tracking-widest truncate">{title}</h3>
            <p className="mt-2 text-2.5xl font-black text-slate-950 dark:text-white tracking-tight">{value}</p>
        </div>
        <div className={`p-3.5 rounded-2xl transition-all duration-300 group-hover:scale-110 ${colorClass}`}>
            {icon}
        </div>
    </div>
);


const RequestStatusIcon: React.FC<{ status: RequestStatus }> = ({ status }) => {
    const baseClasses = "w-5 h-5 mr-3 flex-shrink-0";
    if (status === 'approved') {
        return <div className="p-1 rounded-full bg-green-100 dark:bg-green-900"><CheckIcon className={`${baseClasses} text-green-600 dark:text-green-300`} /></div>;
    }
    if (status === 'disapproved') {
        return <div className="p-1 rounded-full bg-red-100 dark:bg-red-900"><XIcon className={`${baseClasses} text-red-600 dark:text-red-300`} /></div>;
    }
    if (status === 'deallocation_pending') {
        return <div className="p-1 rounded-full bg-rose-100 dark:bg-rose-900"><ClockIcon className={`${baseClasses} text-rose-600 dark:text-rose-300`} /></div>;
    }
    return <div className="p-1 rounded-full bg-yellow-100 dark:bg-yellow-900"><ClockIcon className={`${baseClasses} text-yellow-600 dark:text-yellow-300`} /></div>;
};

interface UpcomingLessonsWidgetProps {
    userId: string;
    timetable: TimetableEntry[];
    getSubjectById: (id: string) => Subject | undefined;
    getRoomById: (id: string) => Room | undefined;
    onCheckIn: (entryId: string) => void;
    onAbsenceRequest: (entryId: string, reason: string) => void;
    studentAttendances?: any[];
    studentAbsenceRequests?: any[];
    onSaveAttendance?: (lessonId: string, attendance: any[]) => Promise<void>;
    users?: User[];
}

const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const dayMapping = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const UpcomingLessonsWidget: React.FC<UpcomingLessonsWidgetProps> = ({
    userId, timetable = [], getSubjectById, getRoomById, onCheckIn, onAbsenceRequest,
    studentAttendances = [], studentAbsenceRequests = [], onSaveAttendance, users = [],
    currentUser, studentAbsences
}) => {
    const [now, setNow] = useState(new Date());
    const [absenceModalEntry, setAbsenceModalEntry] = useState<TimetableEntry | null>(null);
    const [attendanceModalEntry, setAttendanceModalEntry] = useState<TimetableEntry | null>(null);
    const [checkInState, setCheckInState] = useState<Record<string, {
        status: 'idle' | 'checking' | 'error';
        message: string;
        mapUrl?: string;
    }>>({});

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 5000);
        return () => clearInterval(timer);
    }, []);

    const handleCheckInAttempt = (lesson: TimetableEntry) => {
        const room = getRoomById(lesson.roomId);
        if (!room?.location) {
            setCheckInState(prev => ({
                ...prev,
                [lesson.id]: {
                    status: 'error',
                    message: "Cannot verify location: Classroom coordinates are not set. Please contact an administrator."
                }
            }));
            return;
        }

        if (!navigator.geolocation) {
            setCheckInState(prev => ({
                ...prev,
                [lesson.id]: {
                    status: 'error',
                    message: "Geolocation is not supported by your browser."
                }
            }));
            return;
        }

        setCheckInState(prev => ({
            ...prev,
            [lesson.id]: {
                status: 'checking',
                message: "Verifying your location..."
            }
        }));

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const distance = calculateDistance(latitude, longitude, room.location!.latitude, room.location!.longitude);

                if (distance <= PROXIMITY_THRESHOLD_METERS) {
                    onCheckIn(lesson.id);
                    setCheckInState(prev => {
                        const newState = { ...prev };
                        delete newState[lesson.id];
                        return newState;
                    });
                } else {
                    setCheckInState(prev => ({
                        ...prev,
                        [lesson.id]: {
                            status: 'error',
                            message: `You are ~${distance.toFixed(0)} meters away. You must be within ${PROXIMITY_THRESHOLD_METERS}m of the class to check in.`,
                            mapUrl: `https://www.google.com/maps/dir/?api=1&destination=${room.location!.latitude},${room.location!.longitude}`
                        }
                    }));
                }
            },
            (error) => {
                setCheckInState(prev => ({
                    [lesson.id]: {
                        status: 'error',
                        message: `Could not get location: ${error.message}. Please enable location services and try again.`
                    }
                }));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const upcomingLessons = useMemo(() => {
        if (!timetable || timetable.length === 0) return [];

        const currentDayIndex = now.getDay();
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

        return timetable
            .filter(entry => {
                if (!entry || entry.lecturerId !== userId) return false;
                const entryDayIndex = dayMapping.indexOf(entry.day);
                if (entryDayIndex < currentDayIndex) return false;
                if (entryDayIndex === currentDayIndex) {
                    return timeToMinutes(entry.endTime) > currentTimeInMinutes;
                }
                return true;
            })
            .sort((a, b) => {
                const dayA = dayMapping.indexOf(a.day);
                const dayB = dayMapping.indexOf(b.day);
                if (dayA !== dayB) return dayA - dayB;
                return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
            })
            .slice(0, 3);
    }, [now, timetable, userId]);

    const handleAbsenceSubmit = (reason: string) => {
        if (absenceModalEntry) {
            onAbsenceRequest(absenceModalEntry.id, reason);
        }
        setAbsenceModalEntry(null);
    };

    if (upcomingLessons.length === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-white/90 to-slate-50/50 dark:from-slate-900/90 dark:to-slate-950/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/60 shadow-xl shadow-slate-100/50 dark:shadow-none">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-650 dark:text-indigo-400">
                    <CalendarDaysIcon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Active Schedule Reminders</h3>
                    <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mt-0.5">Real-time Session Verification</p>
                </div>
            </div>

            <div className="relative border-l-2 border-slate-100 dark:border-slate-800/60 pl-6 ml-3.5 space-y-8 my-2">
                {upcomingLessons.map(lesson => {
                    const subject = getSubjectById(lesson.subjectId);
                    const room = getRoomById(lesson.roomId);
                    const isToday = lesson.day === dayMapping[now.getDay()];
                    const lessonStartMinutes = timeToMinutes(lesson.startTime);
                    const lessonEndMinutes = timeToMinutes(lesson.endTime);
                    const nowMinutes = now.getHours() * 60 + now.getMinutes();

                    const canCheckIn = isToday && (nowMinutes >= lessonStartMinutes - 15) && (nowMinutes < lessonEndMinutes);
                    const isLive = isToday && nowMinutes >= lessonStartMinutes && nowMinutes < lessonEndMinutes;

                    const currentCheckInState = checkInState[lesson.id];

                    return (
                        <div key={lesson.id} className="relative group">
                            {/* Pulsing Timeline Node */}
                            <div className={`absolute -left-[35px] top-2 w-5 h-5 rounded-full border-4 border-white dark:border-slate-900 shadow-md transition-all duration-500 ${
                                isLive 
                                    ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse scale-110' 
                                    : canCheckIn 
                                        ? 'bg-indigo-500 shadow-lg shadow-indigo-500/50 scale-105' 
                                        : 'bg-slate-350 dark:bg-slate-700'
                            }`} />

                            <div className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 ${
                                isLive 
                                    ? 'border-red-500/20 shadow-lg shadow-red-500/5' 
                                    : 'border-slate-150 dark:border-slate-850'
                            }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                                            <p className="text-md font-black text-slate-900 dark:text-white uppercase tracking-tight">{subject?.name}</p>
                                            {isLive && (
                                                <span className="inline-flex items-center gap-1.5 text-[8px] font-black text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 px-2.5 py-1 rounded-lg animate-pulse uppercase tracking-widest border border-red-100 dark:border-red-900/30">
                                                    LIVE NOW
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                                            {lesson.day} • {lesson.startTime} - {lesson.endTime} • Room <span className="text-indigo-600 dark:text-indigo-400">{room?.name || 'N/A'}</span>
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                        {lesson.attendanceStatus === 'present' ? (
                                            <span className="px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 border border-green-150 dark:border-green-900/40">Handshake Verified</span>
                                        ) : lesson.attendanceStatus === 'pending_absence_request' ? (
                                            <span className="px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-150 dark:border-amber-900/40">Absence Notified</span>
                                        ) : (
                                            <>
                                                <button onClick={() => setAbsenceModalEntry(lesson)} className="px-4 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl text-slate-500 dark:text-slate-450 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all active:scale-95">Notify Absence</button>
                                                {canCheckIn && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleCheckInAttempt(lesson)}
                                                            className="px-5 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-60 transition-all active:scale-95"
                                                            disabled={currentCheckInState?.status === 'checking'}
                                                        >
                                                            {currentCheckInState?.status === 'checking' ? 'Verifying...' : 'Class Check-In'}
                                                        </button>
                                                        <button
                                                            onClick={() => setAttendanceModalEntry(lesson)}
                                                            className="px-5 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 transition-all flex items-center gap-1.5 active:scale-95"
                                                        >
                                                            <CheckCircleIcon className="w-3.5 h-3.5" />
                                                            Mark Students
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                {currentCheckInState && (
                                    <div className="mt-4 p-4 bg-white dark:bg-slate-950/40 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-start gap-3 animate-fade-in">
                                        <InformationCircleIcon className="w-5 h-5 text-indigo-500 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-xs font-bold ${currentCheckInState.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-slate-650'}`}>
                                                {currentCheckInState.message}
                                            </p>
                                            {currentCheckInState.mapUrl && (
                                                <a
                                                    href={currentCheckInState.mapUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-2.5 inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline"
                                                >
                                                    <MapPinIcon className="w-3.5 h-3.5" /> Navigate to Registry Room
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {absenceModalEntry && (
                <AbsenceRequestModal
                    timetableEntry={absenceModalEntry}
                    subject={getSubjectById(absenceModalEntry.subjectId)}
                    onClose={() => setAbsenceModalEntry(null)}
                    onSubmit={handleAbsenceSubmit}
                />
            )}
            {attendanceModalEntry && (
                <AttendanceTakerModal
                    lesson={attendanceModalEntry}
                    subject={getSubjectById(attendanceModalEntry.subjectId)!}
                    students={users.filter(u => u.role === 'student' && (u.courseLevelId === attendanceModalEntry.courseLevelId || u.courseId === attendanceModalEntry.courseId))}
                    initialAttendance={studentAttendances.filter(a => a.lessonId === attendanceModalEntry.id)}
                    onClose={() => setAttendanceModalEntry(null)}
                    onSave={async (lid, data) => {
                        if (onSaveAttendance) await onSaveAttendance(lid, data);
                        setAttendanceModalEntry(null);
                    }}
                    currentUser={currentUser}
                    studentAbsences={studentAbsences}
                />
            )}
        </div>
    );
};


export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({
    user, requests = [], allocations = [], subjects = [], getSubjectById, getRoomById, setActiveTab, generatedTimetable = [], onLessonCheckIn, onAbsenceRequest,
    userTasks = [], onAddTask, onUpdateTask, onDeleteTask, onNavigateToNearby, currentInstitution, onRequestChange,
    studentAttendances = [], studentAbsenceRequests = [], onSaveAttendance, users = [],
    onAccessAlumnaPortal, schoolRegistry
}) => {
    const useRequests = currentInstitution?.useAllocationRequests ?? true;
    const pendingRequestsCount = requests.filter(r => r && r.lecturerId === user.id && (r.status === 'pending' || r.status === 'hod_approved' || r.status === 'deallocation_pending')).length;
    const approvedAllocationsCount = allocations.length;

    const calculateTotalPeriods = (structure: LessonStructure[]) => {
        if (!structure || !Array.isArray(structure)) return 0;
        return structure.reduce((sum, s) => sum + (s.periods || 0) * (s.count || 0), 0);
    };

    const totalAllocatedPeriods = allocations.reduce((total, alloc) => {
        const subject = (subjects || []).find(s => s && s.id === alloc.subjectId);
        return total + (subject ? calculateTotalPeriods(subject.lessonStructure) : 0);
    }, 0);

    const recentRequests = useMemo(() => {
        return [...requests]
            .filter(r => r && r.lecturerId === user.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);
    }, [requests, user.id]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    const registryFlowItems = useMemo(() => {
        const pending = requests.filter(r => r.lecturerId === user.id && r.status === 'pending');
        const hod = requests.filter(r => r.lecturerId === user.id && r.status === 'hod_approved');
        const approved = requests.filter(r => r.lecturerId === user.id && r.status === 'approved');
        const changes = requests.filter(r => r.lecturerId === user.id && r.status === 'change_request_pending');

        return {
            pendingCount: pending.length,
            hodCount: hod.length,
            approvedCount: approved.length,
            changesCount: changes.length
        };
    }, [requests, user.id]);

    return (
        <div className="space-y-8 font-sans text-slate-900 dark:text-slate-100">
            {/* Header / Greeting */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/60 shadow-lg animate-fade-in">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-wider mb-2 border border-indigo-100/50 dark:border-indigo-900/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                        Online Status: Active
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-955 dark:text-white uppercase leading-none">{greeting}, {user.name.split(' ')[0]}</h2>
                    <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px] tracking-widest mt-1.5">Faculty Access Portal • {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                {useRequests && (
                    <button
                        onClick={() => setActiveTab('my_requests')}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3.5 rounded-2xl shadow-xl shadow-indigo-500/10 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest active:scale-95 shrink-0"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Apply Subject Load
                    </button>
                )}
            </div>

            {/* Class Supervisor Duty Banner */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 p-6 md:p-8 rounded-[2.5rem] border border-emerald-500/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 shrink-0">
                        <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Class Supervisor Duty</span>
                        </div>
                        <h4 className="text-lg font-black uppercase text-white tracking-tight">Daily Student Roll Call Register</h4>
                        <p className="text-xs text-slate-300 font-medium mt-0.5">Responsible for taking & verifying daily student attendance for assigned class ({user.supervisedClass || user.studentClass || 'Class Register'})</p>
                    </div>
                </div>

                <button
                    onClick={() => setActiveTab('class_supervisor_attendance')}
                    className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                    <span>Take Class Roll Call</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            {/* Quick Actions Console */}
            <div className="bg-gradient-to-br from-white/95 to-slate-50/50 dark:from-slate-900/95 dark:to-slate-950/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/60 shadow-xl shadow-slate-100/50 dark:shadow-none space-y-6">
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Quick Action Console</h3>
                    <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mt-0.5">Primary Launch Pad</p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { id: 'self_checkin', label: 'Clock In/Out', desc: 'Verify Attendance', color: 'from-emerald-500/10 to-teal-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400', icon: <ClockInIcon className="w-6 h-6" /> },
                        { id: 'my_timetable', label: 'Weekly Schedule', desc: 'Browse Timetable', color: 'from-indigo-500/10 to-violet-500/5 border-indigo-500/20 text-indigo-600 dark:text-indigo-400', icon: <CalendarDaysIcon className="w-6 h-6" /> },
                        { id: 'eduflow', label: 'EduFlow Tasks', desc: 'View Workflows', color: 'from-purple-500/10 to-pink-500/5 border-purple-500/20 text-purple-600 dark:text-purple-400', icon: <ClipboardListIcon className="w-6 h-6" /> },
                        { id: 'academic_hub', label: 'Marks Hub', desc: 'Assessments', color: 'from-amber-500/10 to-orange-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400', icon: <BookOpenIcon className="w-6 h-6" /> }
                    ].map((act) => (
                        <button
                            key={act.id}
                            onClick={() => setActiveTab(act.id)}
                            className={`flex flex-col items-start text-left p-5 rounded-3xl bg-gradient-to-br ${act.color} border hover:shadow-lg transition-all duration-305 hover:-translate-y-1 active:scale-95 group w-full`}
                        >
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-4 group-hover:scale-110 transition-transform">
                                {act.icon}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider block">{act.label}</span>
                            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5 block">{act.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Upcoming Active Schedule Reminders */}
            <UpcomingLessonsWidget
                userId={user.id}
                timetable={generatedTimetable}
                getSubjectById={getSubjectById}
                getRoomById={getRoomById}
                onCheckIn={onLessonCheckIn}
                onAbsenceRequest={onAbsenceRequest}
                studentAttendances={studentAttendances}
                studentAbsenceRequests={studentAbsenceRequests}
                onSaveAttendance={onSaveAttendance}
                users={users}
                currentUser={user}
                studentAbsences={studentAbsenceRequests || []}
            />

            {/* Main Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    title="Allocated Units"
                    value={`${approvedAllocationsCount} Units`}
                    icon={<BookOpenIcon className="w-7 h-7" />}
                    colorClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300"
                />
                {useRequests && (
                    <StatCard
                        title="In Review Queue"
                        value={pendingRequestsCount}
                        icon={<ClockIcon className="w-7 h-7" />}
                        colorClass="bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
                    />
                )}
                <StatCard
                    title="Weekly Contact Hours"
                    value={`${totalAllocatedPeriods} Periods`}
                    icon={<CalendarDaysIcon className="w-7 h-7" />}
                    colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
                />
            </div>

            {/* Registry Stepper Progress */}
            {useRequests && (registryFlowItems.pendingCount + registryFlowItems.hodCount + registryFlowItems.changesCount > 0) && (
                <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/60 shadow-lg">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <ArrowPathIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight">Registry Processing Pipeline</h3>
                            <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-555 tracking-widest mt-0.5">Allocation Request Status</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-6 left-12 right-12 h-1 bg-slate-100 dark:bg-slate-800 -z-0"></div>

                        {[
                            { label: 'Departmental Review', count: registryFlowItems.pendingCount, icon: <BookOpenIcon className="w-5 h-5" />, active: registryFlowItems.pendingCount > 0 },
                            { label: 'Registry Verification', count: registryFlowItems.hodCount, icon: <ShieldIcon className="w-5 h-5" />, active: registryFlowItems.hodCount > 0 },
                            { label: 'Modifications', count: registryFlowItems.changesCount, icon: <ArrowsRightLeftIcon className="w-5 h-5" />, active: registryFlowItems.changesCount > 0 },
                            { label: 'Active Load', count: approvedAllocationsCount, icon: <CheckCircleIcon className="w-5 h-5" />, active: approvedAllocationsCount > 0, success: true }
                        ].map((step, idx) => (
                            <div key={idx} className="flex flex-col items-center relative z-10 w-full md:w-auto">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${step.active ? (step.success ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-110') : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                    {step.icon}
                                    {step.count > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800 shadow-sm animate-bounce">
                                            {step.count}
                                        </span>
                                    )}
                                </div>
                                <p className={`mt-3 text-[9px] font-black uppercase tracking-widest text-center ${step.active ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                                    {step.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Load utilization circular gauge */}
                    <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/60 shadow-lg flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex-1 space-y-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-650 dark:text-indigo-400">
                                    <ArrowTrendingUpIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight">Load Utilization</h3>
                                    <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mt-0.5">Faculty Workload Allocation</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-550 dark:text-slate-400 font-medium leading-relaxed">Your teaching load intensity is dynamically tracked against weekly departmental constraints.</p>
                            <div className="flex gap-2.5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-3.5 py-1.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">Target: 15 Periods/wk</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-450 bg-slate-50 dark:bg-slate-800/50 px-3.5 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/30">Current: {totalAllocatedPeriods} Periods</span>
                            </div>
                        </div>

                        {/* Circular Gauge / Reactor Core */}
                        <div className="relative flex items-center justify-center shrink-0 w-36 h-36">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                {/* Track Circle */}
                                <circle cx="50" cy="50" r="40" className="stroke-slate-100 dark:stroke-slate-800/60" strokeWidth="8" fill="transparent" />
                                {/* Progress Arc */}
                                <circle 
                                    cx="50" 
                                    cy="50" 
                                    r="40" 
                                    className="stroke-indigo-600 dark:stroke-indigo-400 transition-all duration-1000 ease-out" 
                                    strokeWidth="8" 
                                    strokeDasharray={`${2 * Math.PI * 40}`}
                                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(1, totalAllocatedPeriods / 15))}`}
                                    strokeLinecap="round"
                                    fill="transparent"
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center text-center">
                                <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">{Math.round((totalAllocatedPeriods / 15) * 100)}%</span>
                                <span className="text-[8px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Utilized</span>
                            </div>
                        </div>
                    </div>

                    {/* Allocated Subjects list grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {allocations.slice(0, 4).map(alloc => {
                            const subject = getSubjectById(alloc.subjectId);
                            return (
                                <div key={alloc.id} className="p-5 bg-white/50 dark:bg-slate-900/40 rounded-3xl border border-slate-150 dark:border-slate-850 group hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-lg hover:shadow-indigo-500/5 transition-all">
                                    <div className="flex justify-between items-start mb-2.5">
                                        <span className="text-[9px] font-mono font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md">{subject?.code}</span>
                                        <button onClick={() => onRequestChange?.(alloc)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-indigo-600"><ArrowsRightLeftIcon className="w-4 h-4" /></button>
                                    </div>
                                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm truncate">{subject?.name}</p>
                                </div>
                            );
                        })}
                        {allocations.length === 0 && <p className="col-span-2 text-center py-10 text-slate-400 font-bold uppercase text-xs tracking-widest opacity-50">No units confirmed for this cycle.</p>}
                    </div>

                    <MyTasks
                        tasks={userTasks}
                        onAddTask={onAddTask}
                        onUpdateTask={onUpdateTask}
                        onDeleteTask={onDeleteTask}
                    />
                </div>

                <div className="space-y-8">
                    <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/60 shadow-lg">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                <SparklesIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Academic Hub</h3>
                        </div>
                        <div className="space-y-3">
                            {useRequests && (
                                <button
                                    onClick={() => setActiveTab('my_requests')}
                                    className="w-full text-left p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 hover:bg-white hover:shadow-xl hover:border-indigo-200 border-2 border-transparent transition-all group"
                                >
                                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest block mb-1">Catalog</span>
                                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Apply for Subject Load</p>
                                    <p className="text-sm text-slate-500 mt-2 font-medium">Find and request units across all departments.</p>
                                </button>
                            )}
                            <button
                                onClick={() => setActiveTab('my_timetable')}
                                className="w-full text-left p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 hover:bg-white hover:shadow-xl hover:border-indigo-200 border-2 border-transparent transition-all group"
                            >
                                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest block mb-1">Schedule</span>
                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Master Weekly Calendar</p>
                                <p className="text-sm text-slate-500 mt-2 font-medium">Review confirmed lecture slots and locations.</p>
                            </button>
                            <button
                                onClick={() => {
                                    const school = (schoolRegistry || []).find(s => s.institutionId === currentInstitution?.id || s.id === currentInstitution?.id);
                                    if (school) onAccessAlumnaPortal(school);
                                    else alert("School registry record not found for this institution.");
                                }}
                                className="w-full text-left p-6 rounded-[2rem] bg-rose-50 dark:bg-rose-900/50 hover:bg-white hover:shadow-xl hover:border-rose-200 border-2 border-transparent transition-all group"
                            >
                                <span className="text-[10px] font-black uppercase text-rose-600 tracking-widest block mb-1">Network</span>
                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Alumnae Portal</p>
                                <p className="text-sm text-slate-500 mt-2 font-medium">Connect with former students and alumni community.</p>
                            </button>
                        </div>
                    </div>

                    {useRequests && (
                        <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/60 shadow-lg">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                    <ClipboardListIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Registry Activity</h3>
                            </div>
                            <div className="space-y-4">
                                {recentRequests.length > 0 ? recentRequests.map((req) => {
                                    const subject = getSubjectById(req.subjectId);
                                    return (
                                        <div key={req.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-2xl transition-all">
                                            <RequestStatusIcon status={req.status} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate uppercase tracking-tight">{subject?.name}</p>
                                                <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-0.5">{req.status.replace(/_/g, ' ')}</p>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-400">{new Date(req.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center py-10 opacity-30">
                                        <ClipboardListIcon className="w-10 h-10 mx-auto text-slate-300" />
                                        <p className="text-[10px] font-black uppercase tracking-widest mt-2">No activity</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

