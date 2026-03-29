
import React, { useMemo, useState, useEffect } from 'react';
import type { User, AllocationRequest, Subject, RequestStatus, TimetableEntry, Room, LessonStructure, UserTask, Institution } from '../types';
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
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; colorClass?: string }> = ({ title, value, icon, colorClass = 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between transition-all hover:shadow-md">
        <div>
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest truncate">{title}</h3>
            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</p>
        </div>
        <div className={`p-4 rounded-2xl ${colorClass}`}>
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
    studentAttendances = [], studentAbsenceRequests = [], onSaveAttendance, users = []
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
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                    <CalendarDaysIcon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Active Schedule Reminders</h3>
            </div>
            <div className="space-y-4">
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
                        <div key={lesson.id} className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{subject?.name}</p>
                                        {isLive && <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg animate-pulse uppercase tracking-widest border border-red-100">LIVE</span>}
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        {lesson.day} • {lesson.startTime} - {lesson.endTime} • Room <span className="text-indigo-600">{room?.name || 'N/A'}</span>
                                    </p>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-2">
                                    {lesson.attendanceStatus === 'present' ? (
                                        <span className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl text-green-700 bg-green-50 border border-green-100">Handshake Verified</span>
                                    ) : lesson.attendanceStatus === 'pending_absence_request' ? (
                                        <span className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl text-amber-700 bg-amber-50 border border-amber-100">Absence Notified</span>
                                    ) : (
                                        <>
                                            <button onClick={() => setAbsenceModalEntry(lesson)} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl text-slate-500 bg-white border border-slate-200 hover:bg-slate-50">Notify Absence</button>
                                            {canCheckIn && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleCheckInAttempt(lesson)}
                                                        className="px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-60"
                                                        disabled={currentCheckInState?.status === 'checking'}
                                                    >
                                                        {currentCheckInState?.status === 'checking' ? 'Verifying...' : 'Class Check-In'}
                                                    </button>
                                                    <button
                                                        onClick={() => setAttendanceModalEntry(lesson)}
                                                        className="px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-all flex items-center gap-1.5"
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
                                <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-start gap-3 animate-fade-in">
                                    <InformationCircleIcon className="w-5 h-5 text-indigo-500 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-xs font-bold ${currentCheckInState.status === 'error' ? 'text-red-600' : 'text-slate-600'}`}>
                                            {currentCheckInState.message}
                                        </p>
                                        {currentCheckInState.mapUrl && (
                                            <a
                                                href={currentCheckInState.mapUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline"
                                            >
                                                <MapPinIcon className="w-3.5 h-3.5" /> Navigate to Registry Room
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
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
                />
            )}
        </div>
    );
};


export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({
    user, requests = [], allocations = [], subjects = [], getSubjectById, getRoomById, setActiveTab, generatedTimetable = [], onLessonCheckIn, onAbsenceRequest,
    userTasks = [], onAddTask, onUpdateTask, onDeleteTask, onNavigateToNearby, currentInstitution, onRequestChange,
    studentAttendances = [], studentAbsenceRequests = [], onSaveAttendance, users = []
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">{greeting}, {user.name.split(' ')[0]}</h2>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Faculty Access Portal • {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                {useRequests && (
                    <button
                        onClick={() => setActiveTab('my_requests')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center gap-2 text-xs uppercase tracking-widest active:scale-95"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Request Subject Allocation
                    </button>
                )}
            </div>

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
            />

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
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                            <ArrowPathIcon className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Registry Processing Pipeline</h3>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-6 left-12 right-12 h-1 bg-slate-100 dark:bg-slate-700 -z-0"></div>

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
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                    <ArrowTrendingUpIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Load Utilization Progress</h3>
                            </div>
                            <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Target: 15/wk</span>
                        </div>

                        <div className="space-y-6">
                            <div className="relative pt-1">
                                <div className="flex mb-2 items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-black inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-100">
                                            Current Workload Intensity
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-black inline-block text-indigo-600 uppercase">
                                            {Math.round((totalAllocatedPeriods / 15) * 100)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-indigo-50 dark:bg-slate-700 shadow-inner">
                                    <div style={{ width: `${Math.min(100, (totalAllocatedPeriods / 15) * 100)}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-1000 ease-out rounded-full"></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {allocations.slice(0, 4).map(alloc => {
                                    const subject = getSubjectById(alloc.subjectId);
                                    return (
                                        <div key={alloc.id} className="p-5 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-mono font-black text-indigo-600 uppercase tracking-tighter">{subject?.code}</span>
                                                <button onClick={() => onRequestChange?.(alloc)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-indigo-600"><ArrowsRightLeftIcon className="w-4 h-4" /></button>
                                            </div>
                                            <p className="font-bold text-slate-800 dark:text-white uppercase tracking-tight text-sm truncate">{subject?.name}</p>
                                        </div>
                                    );
                                })}
                                {allocations.length === 0 && <p className="col-span-2 text-center py-10 text-slate-400 font-bold uppercase text-xs tracking-widest opacity-50">No units confirmed for this cycle.</p>}
                            </div>
                        </div>
                    </div>

                    <MyTasks
                        tasks={userTasks}
                        onAddTask={onAddTask}
                        onUpdateTask={onUpdateTask}
                        onDeleteTask={onDeleteTask}
                    />
                </div>

                <div className="space-y-8">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
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
                        </div>
                    </div>

                    {useRequests && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
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
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{req.status.replace(/_/g, ' ')}</p>
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
