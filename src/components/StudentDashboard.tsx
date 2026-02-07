import React, { useState, useEffect, useMemo } from 'react';
import type { User, TimetableEntry, Subject, Room, Course, CourseLevel, TimetableSettings, LetterheadConfig, LessonRating, UserTask, Institution } from '../types';
import { AcademicCapIcon, ArrowTrendingUpIcon, BellIcon, SunIcon, ClockInIcon, CheckIcon, PrinterIcon, DocumentArrowDownIcon, MapPinIcon, StarIcon } from './icons';
import { TimetableGrid } from './TimetableGrid';
import { generateStudentTimetablePdf } from '../services/pdfService';
import { calculateDistance, PROXIMITY_THRESHOLD_METERS } from '../utils/locationUtils';
import { MyTasks } from './MyTasks';
import { getInitials } from '../utils/stringUtils';


interface StudentDashboardProps {
    user: User;
    timetable: TimetableEntry[];
    course: Course | null;
    level: CourseLevel | null;
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


export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, timetable, course, level, getSubjectById, getRoomById, getLecturerById, now, timetableSettings, studentCheckIns, onStudentLessonCheckIn, letterheadConfig, logoUrl, footerImageUrl, lessonRatings, onRateLesson, userTasks, onAddTask, onUpdateTask, onDeleteTask, currentInstitution }) => {
    const enrolledSubjectsCount = user.enrolledSubjectIds?.length || 0;
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [checkInState, setCheckInState] = useState<Record<string, {
        status: 'idle' | 'checking' | 'error';
        message: string;
        mapUrl?: string;
    }>>({});

    const isSchool = currentInstitution?.institutionType === 'Primary' || currentInstitution?.institutionType === 'Secondary';
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
                        const newState = {...prev};
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

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">Welcome, {user.name}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{courseLabel}</h3>
                    <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{course?.name || 'Not Enrolled'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{levelLabel}</h3>
                    <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{level?.name || 'N/A'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Enrolled Subjects</h3>
                    <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{enrolledSubjectsCount}</p>
                </div>
            </div>

            {renderLessonProgress()}

            {nextLesson && !currentLesson && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold mb-2">Next Lesson</h3>
                    <p className="font-bold text-lg text-slate-800 dark:text-slate-100">{getSubjectById(nextLesson.subjectId)?.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Starts at {nextLesson.startTime} ({formatTimeRemaining(timeStringToDate(nextLesson.startTime), now)}) in Room {getRoomById(nextLesson.roomId)?.name}
                    </p>
                </div>
            )}

            {pastLessonsToRate.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold mb-4">Rate Past Lessons</h3>
                    <ul className="space-y-3">
                        {pastLessonsToRate.map(lesson => (
                            <li key={lesson.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{getSubjectById(lesson.subjectId)?.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">with {getLecturerById(lesson.lecturerId)?.name} at {lesson.startTime}</p>
                                </div>
                                <button onClick={() => onRateLesson(lesson)} className="inline-flex items-center gap-2 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-amber-500 hover:bg-amber-600">
                                    <StarIcon className="w-4 h-4"/> Rate
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

            <style>{`.btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 600; }`}</style>
        </div>
    );
};