import React, { useState, useEffect, useMemo } from 'react';
import type { User, TimetableEntry, Subject, Room, Course, CourseLevel, TimetableSettings, LetterheadConfig, LessonRating, UserTask, Institution, StudentAttendance, Book } from '../types';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { ArrowTrendingUpIcon } from './icons/ArrowTrendingUpIcon';
import { BellIcon } from './icons/BellIcon';
import { SunIcon } from './icons/SunIcon';
import { ClockInIcon } from './icons/ClockInIcon';
import { CheckIcon } from './icons/CheckIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { StarIcon } from './icons/StarIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { ClockIcon } from './icons/ClockIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { UserIcon } from './icons/UserIcon';

import { TimetableGrid } from './TimetableGrid';
import { generateStudentTimetablePdf } from '../services/pdfService';
import { calculateDistance, PROXIMITY_THRESHOLD_METERS } from '../utils/locationUtils';
import { MyTasks } from './MyTasks';
import { getInitials } from '../utils/stringUtils';
import { AttendanceAnalytics } from './AttendanceAnalytics';
import { DigitalCatalog } from './Library/DigitalCatalog';

interface StudentDashboardProps {
    user: User;
    timetable: TimetableEntry[];
    course: Course | null;
    level: CourseLevel | null;
    subjects: Subject[];
    users: User[];
    getSubjectById: (id: string) => Subject | undefined;
    getRoomById: (id: string) => Room | undefined;
    getLecturerById: (id: string) => User | undefined;
    now: Date;
    timetableSettings: TimetableSettings;
    studentCheckIns: Record<string, string>;
    onStudentLessonCheckIn: (timetableEntryId: string) => void;
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    lessonRatings: LessonRating[];
    onRateLesson: (lesson: TimetableEntry) => void;
    userTasks: UserTask[];
    onAddTask: (task: { title: string }) => void;
    onUpdateTask: (taskId: string, isComplete: boolean) => void;
    onDeleteTask: (taskId: string) => void;
    currentInstitution?: Institution | null;
    studentAttendances: StudentAttendance[];
    books: Book[];
    onAccessAlumnaPortal: (school: any) => void;
    schoolRegistry?: any[];
}

const formatTimeRemaining = (targetTime: Date, now: Date): string => {
    const diffMs = targetTime.getTime() - now.getTime();
    if (diffMs <= 0) return "Starting now";

    const diffSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;

    if (minutes > 0) {
        return `in ${minutes} min ${seconds}s`;
    }
    return `in ${seconds}s`;
};

const dayMapping = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const timeStringToDate = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
};


export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, timetable, course, level, subjects, users, getSubjectById, getRoomById, getLecturerById, now, timetableSettings, studentCheckIns, onStudentLessonCheckIn, letterheadConfig, logoUrl, footerImageUrl, lessonRatings, onRateLesson, userTasks, onAddTask, onUpdateTask, onDeleteTask, currentInstitution, studentAttendances, books, onAccessAlumnaPortal, schoolRegistry }) => {
    const enrolledSubjectsCount = user.enrolledSubjectIds?.length || 0;
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [checkInState, setCheckInState] = useState<Record<string, {
        status: 'idle' | 'checking' | 'error';
        message: string;
        mapUrl?: string;
    }>>({});

    const [smsNotifyEnabled, setSmsNotifyEnabled] = useState(true);
    const [lastNotifiedEntryId, setLastNotifiedEntryId] = useState<string | null>(null);

    const isSchool = currentInstitution?.institutionType === 'Education' && (currentInstitution?.category === 'Primary' || currentInstitution?.category === 'Secondary');
    const courseLabel = isSchool ? 'My Grade' : 'My Course';
    const levelLabel = isSchool ? 'Current Stream' : 'Current Level';

    const { currentLesson, nextLesson } = useMemo(() => {
        const todayStr = dayMapping[now.getDay()];
        const todaysLessons = timetable
            .filter(entry => entry.day === todayStr)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        let current: TimetableEntry | null = null;
        let next: TimetableEntry | null = null;

        for (const lesson of todaysLessons) {
            const lessonStart = timeStringToDate(lesson.startTime);
            const lessonEnd = timeStringToDate(lesson.endTime);

            if (now >= lessonStart && now < lessonEnd) {
                current = lesson;
            } else if (now < lessonStart) {
                if (!next) {
                    next = lesson;
                }
            }
        }

        return { currentLesson: current, nextLesson: next };
    }, [now, timetable]);

    // Auto-Notification Logic (Simulation)
    useEffect(() => {
        if (nextLesson && smsNotifyEnabled && nextLesson.id !== lastNotifiedEntryId) {
            const lessonStart = timeStringToDate(nextLesson.startTime);
            const diffMs = lessonStart.getTime() - now.getTime();
            const diffMin = diffMs / (1000 * 60);

            // Trigger when 10 minutes or less
            if (diffMin <= 10 && diffMin > 0) {
                const subject = getSubjectById(nextLesson.subjectId);
                const room = getRoomById(nextLesson.roomId);
                const lecturer = getLecturerById(nextLesson.lecturerId);

                console.log(`[SMS Simulation] To: ${user.phoneNumber} - "Hi ${user.name}, your next class ${subject?.name} starts in 10 mins at room ${room?.name}. Your tutor ${lecturer?.name} is ready!"`);
                setLastNotifiedEntryId(nextLesson.id);
            }
        }
    }, [now, nextLesson, smsNotifyEnabled, lastNotifiedEntryId]);

    const pastLessonsToRate = useMemo(() => {
        const todayStr = dayMapping[now.getDay()];
        const ratedEntryIds = new Set(lessonRatings.filter(r => r.studentId === user.id).map(r => r.timetableEntryId));

        return timetable
            .filter(entry => {
                if (entry.day !== todayStr) return false;
                const lessonEnd = timeStringToDate(entry.endTime);
                return now > lessonEnd && !ratedEntryIds.has(entry.id);
            })
            .sort((a, b) => b.startTime.localeCompare(a.startTime))
            .slice(0, 3); // Limit to 3 most recent unrated lessons
    }, [now, timetable, lessonRatings, user.id]);

    const handleDownloadPdf = async () => {
        if (!course || !level) return;
        setIsGeneratingPdf(true);
        try {
            const pdfUrl = await generateStudentTimetablePdf(
                user,
                timetable,
                getSubjectById,
                getLecturerById,
                getRoomById,
                letterheadConfig,
                footerImageUrl,
                course,
                level,
                timetableSettings
            );
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `Timetable-${user.name.replace(/\s/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to generate PDF for download:", error);
            alert("Could not generate the PDF for download.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handlePrint = async () => {
        if (!course || !level) return;
        setIsGeneratingPdf(true);
        try {
            const pdfUrl = await generateStudentTimetablePdf(
                user,
                timetable,
                getSubjectById,
                getLecturerById,
                getRoomById,
                letterheadConfig,
                footerImageUrl,
                course,
                level,
                timetableSettings
            );
            const pdfWindow = window.open("");
            pdfWindow?.document.write(`<html><head><title>Print Timetable</title></head><body style="margin: 0; padding: 0;"><iframe width='100%' height='100%' style="border: none;" src='${pdfUrl}'></iframe></body></html>`);
            pdfWindow?.document.close();
            pdfWindow?.focus();
        } catch (error) {
            console.error("Failed to generate PDF for printing:", error);
            alert("Could not generate the PDF for printing.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

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
                    onStudentLessonCheckIn(lesson.id);
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
                    ...prev,
                    [lesson.id]: {
                        status: 'error',
                        message: `Could not get location: ${error.message}. Please enable location services and try again.`
                    }
                }));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const renderLessonProgress = () => {
        if (!currentLesson) return null;

        const subject = getSubjectById(currentLesson.subjectId);
        const room = getRoomById(currentLesson.roomId);

        const lessonStart = timeStringToDate(currentLesson.startTime);
        const lessonEnd = timeStringToDate(currentLesson.endTime);
        const totalDuration = lessonEnd.getTime() - lessonStart.getTime();
        const elapsed = now.getTime() - lessonStart.getTime();
        const progress = Math.min(100, (elapsed / totalDuration) * 100);

        const checkInKey = `${user.id}-${currentLesson.id}`;
        const isCheckedIn = studentCheckIns[checkInKey];
        const currentCheckInState = checkInState[currentLesson.id];

        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-2">Current Lesson</h3>
                <div className="flex justify-between items-center mb-2">
                    <p className="font-bold text-lg text-[var(--color-primary)]">{subject?.name}</p>
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 animate-pulse">LIVE</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Room: {room?.name} | Ends at: {currentLesson.endTime}</p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-4">
                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                {!isCheckedIn && (
                    <div className="mt-4">
                        <button
                            onClick={() => handleCheckInAttempt(currentLesson)}
                            disabled={currentCheckInState?.status === 'checking'}
                            className="btn-primary w-full sm:w-auto inline-flex items-center gap-2"
                        >
                            <ClockInIcon className="w-5 h-5" />
                            {currentCheckInState?.status === 'checking' ? 'Checking Location...' : 'Check In'}
                        </button>
                        {currentCheckInState && (
                            <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                                <p className={`text-xs ${currentCheckInState.status === 'error' ? 'text-red-500' : 'text-slate-500'}`}>{currentCheckInState.message}</p>
                                {currentCheckInState.mapUrl && <a href={currentCheckInState.mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">Get Directions</a>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const [dashboardTab, setDashboardTab] = useState<'main' | 'library'>('main');

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                    <h2 className="text-3xl font-black tracking-tighter uppercase">Member Dashboard</h2>
                    <div className="flex gap-2 mt-2">
                        <button 
                            onClick={() => setDashboardTab('main')}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${dashboardTab === 'main' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        >
                            Operations
                        </button>
                        <button 
                            onClick={() => setDashboardTab('library')}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${dashboardTab === 'library' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        >
                            Digital Library
                        </button>
                        <button 
                            onClick={() => {
                                const school = (schoolRegistry || []).find(s => s.institutionId === currentInstitution?.id || s.id === currentInstitution?.id);
                                if (school) onAccessAlumnaPortal(school);
                                else alert("School registry record not found for this institution.");
                            }}
                            className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-100"
                        >
                            Alumnae Portal
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className={`p-2 rounded-xl transition-colors ${smsNotifyEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <BellIcon className="w-5 h-5" />
                    </div>
                    <div className="pr-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Push Notifications</p>
                        <button
                            onClick={() => setSmsNotifyEnabled(!smsNotifyEnabled)}
                            className="text-xs font-bold text-slate-900 dark:text-white uppercase leading-none hover:text-indigo-600 transition-colors"
                        >
                            {smsNotifyEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                    </div>
                </div>
            </div>

            {dashboardTab === 'main' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{courseLabel}</h3>
                            <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{course?.name || 'Not Enrolled'}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{levelLabel}</h3>
                            <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{level?.name || 'N/A'}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Enrolled Subjects</h3>
                            <p className="text-xl font-black text-indigo-600 uppercase tracking-tight">{enrolledSubjectsCount} Modules</p>
                        </div>
                    </div>

                    {/* Engagement Card - Next Class Notification */}
                    {nextLesson && (
                        <div className={`p-8 rounded-[3rem] shadow-2xl transition-all duration-500 overflow-hidden relative ${timeStringToDate(nextLesson.startTime).getTime() - now.getTime() <= 600000
                            ? 'bg-indigo-600 text-white ring-8 ring-indigo-100'
                            : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700'
                            }`}>
                            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                                <div className="flex items-center gap-6 text-center lg:text-left">
                                    <div className={`p-5 rounded-[2rem] ${timeStringToDate(nextLesson.startTime).getTime() - now.getTime() <= 600000
                                        ? 'bg-white/20 border border-white/30'
                                        : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
                                        }`}>
                                        <ClockIcon className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${timeStringToDate(nextLesson.startTime).getTime() - now.getTime() <= 600000
                                            ? 'text-indigo-100'
                                            : 'text-slate-400'
                                            }`}>
                                            Up Next Notification
                                        </h3>
                                        <h4 className="text-2xl font-black uppercase tracking-tighter leading-none mb-2">
                                            {getSubjectById(nextLesson.subjectId)?.name}
                                        </h4>
                                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                                            <div className="flex items-center gap-2">
                                                <MapPinIcon className="w-4 h-4 opacity-70" />
                                                <span className="text-sm font-bold uppercase tracking-tight">Room {getRoomById(nextLesson.roomId)?.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="w-4 h-4 opacity-70" />
                                                <span className="text-sm font-bold uppercase tracking-tight underline cursor-help" title={`View profile of ${getLecturerById(nextLesson.lecturerId)?.name}`}>
                                                    Tutor: {getLecturerById(nextLesson.lecturerId)?.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center lg:items-end gap-3">
                                    <div className={`px-6 py-3 rounded-2xl text-xl font-black tabular-nums transition-colors ${timeStringToDate(nextLesson.startTime).getTime() - now.getTime() <= 600000
                                        ? 'bg-white text-indigo-600'
                                        : 'bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white'
                                        }`}>
                                        {formatTimeRemaining(timeStringToDate(nextLesson.startTime), now)}
                                    </div>
                                    {smsNotifyEnabled && (
                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-80">
                                            <PaperAirplaneIcon className="w-3 h-3" />
                                            <span>SMS alert scheduled</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Progress bar background for upcoming */}
                            {timeStringToDate(nextLesson.startTime).getTime() - now.getTime() <= 600000 && (
                                <div className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-1000" style={{ width: '100%', animation: 'shrink 600s linear' }} />
                            )}
                        </div>
                    )}

                    {renderLessonProgress()}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-8">
                            {pastLessonsToRate.length > 0 && (
                                <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center justify-between">
                                        Review Attendance
                                        <StarIcon className="w-5 h-5 text-amber-500" />
                                    </h3>
                                    <ul className="space-y-4">
                                        {pastLessonsToRate.map(lesson => (
                                            <li key={lesson.id} className="flex justify-between items-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100/50 dark:border-slate-800 transition-all hover:translate-x-1">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{getSubjectById(lesson.subjectId)?.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">with {getLecturerById(lesson.lecturerId)?.name}</p>
                                                </div>
                                                <button onClick={() => onRateLesson(lesson)} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                                    Rate Module
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <MyTasks
                                tasks={userTasks}
                                onAddTask={onAddTask}
                                onUpdateTask={onUpdateTask}
                                onDeleteTask={onDeleteTask}
                            />
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black uppercase tracking-tighter">Behavioral Stats</h3>
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                                    <ArrowTrendingUpIcon className="w-5 h-5" />
                                </div>
                            </div>
                            <AttendanceAnalytics
                                timetable={timetable}
                                studentAttendances={studentAttendances}
                                studentCheckIns={studentCheckIns}
                                users={users}
                                subjects={subjects}
                                institutionId={user.institutionId}
                                studentId={user.id}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Knowledge Repository</h3>
                            <p className="text-slate-500 font-medium text-sm">Browse and reserve physical assets from the institutional library.</p>
                        </div>
                    </div>
                    <DigitalCatalog 
                        books={books} 
                        onReserve={async (id) => {
                            alert(`Reservation request for asset ${id} has been queued for Librarian approval.`);
                        }} 
                    />
                </div>
            )}

            <style>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                .btn-primary { 
                    padding: 0.75rem 1.5rem; 
                    background-color: var(--color-primary); 
                    color: white; 
                    border-radius: 1rem; 
                    font-weight: 900; 
                    text-transform: uppercase; 
                    font-size: 0.75rem; 
                    letter-spacing: 0.05em; 
                }
            `}</style>
        </div>
    );
};
