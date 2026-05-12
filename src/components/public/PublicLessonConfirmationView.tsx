import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { UserIcon } from '../icons/UserIcon';

interface PublicLessonConfirmationViewProps {
    lessonId: string;
    onClose: () => void;
}

export const PublicLessonConfirmationView: React.FC<PublicLessonConfirmationViewProps> = ({ lessonId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [lesson, setLesson] = useState<any>(null);
    const [student, setStudent] = useState<any>(null);
    const [instructor, setInstructor] = useState<any>(null);
    const [vehicle, setVehicle] = useState<any>(null);
    const [institution, setInstitution] = useState<any>(null);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const fetchLessonDetails = async () => {
            setLoading(true);
            try {
                // 1. Fetch Lesson
                const lessons = await apiService.fetchModuleRecords('ds_lessons', undefined, undefined, { filter: { id: lessonId } });
                const currentLesson = lessons?.[0];
                if (!currentLesson) {
                    setLoading(false);
                    setStatusMessage({ type: 'error', text: 'Lesson record not found or link has expired.' });
                    return;
                }
                setLesson(currentLesson);

                // 2. Fetch dependencies concurrently
                const [students, instructors, vehicles, insts] = await Promise.all([
                    apiService.fetchModuleRecords('ds_students', undefined, undefined, { filter: { id: currentLesson.studentId || currentLesson.student_id } }).catch(() => []),
                    apiService.fetchModuleRecords('ds_instructors', undefined, undefined, { filter: { id: currentLesson.instructorId || currentLesson.instructor_id } }).catch(() => []),
                    apiService.fetchModuleRecords('ds_vehicles', undefined, undefined, { filter: { id: currentLesson.vehicleId || currentLesson.vehicle_id } }).catch(() => []),
                    apiService.fetchModuleRecords('institutions', undefined, undefined, { filter: { id: currentLesson.institutionId || currentLesson.institution_id } }).catch(() => [])
                ]);

                setStudent(students?.[0] || null);
                setInstructor(instructors?.[0] || null);
                setVehicle(vehicles?.[0] || null);
                setInstitution(insts?.[0] || null);
            } catch (err) {
                console.error("Failed to load lesson confirmation details:", err);
                setStatusMessage({ type: 'error', text: 'Failed to retrieve lesson details. Please check your network connection.' });
            } finally {
                setLoading(false);
            }
        };

        fetchLessonDetails();
    }, [lessonId]);

    const handleConfirmStatus = async (newStatus: 'Confirmed' | 'Reschedule Requested') => {
        if (!lesson) return;
        setActionLoading(true);
        setStatusMessage(null);
        try {
            // Apply updates locally and trigger record persist
            const updatedLesson = {
                ...lesson,
                confirmationStatus: newStatus,
                confirmation_status: newStatus,
                status: newStatus === 'Reschedule Requested' ? 'Reschedule Requested' : lesson.status
            };

            await apiService.saveModuleRecord('ds_lessons', updatedLesson);
            setLesson(updatedLesson);
            
            setStatusMessage({
                type: 'success',
                text: newStatus === 'Confirmed' 
                    ? 'Your attendance has been officially confirmed! See you at the training site.' 
                    : 'Reschedule request submitted successfully. Your instructor will coordinate a new slot with you.'
            });

            // Dispatch instant status alerts if appropriate
            if (instructor?.phone && institution) {
                const companySettings = await apiService.fetchCompanySettings().catch(() => null);
                const activeSmsConfig = companySettings?.smsConfig || institution.smsConfig;
                const msgText = newStatus === 'Confirmed'
                    ? `Update: Student ${student?.fullName || 'Assigned Student'} confirmed attendance for lesson on ${lesson.lessonDate || lesson.date} at ${lesson.startTime}.`
                    : `Alert: Student ${student?.fullName || 'Assigned Student'} requested a reschedule for lesson on ${lesson.lessonDate || lesson.date} at ${lesson.startTime}.`;
                apiService.sendSms(instructor.phone, msgText, activeSmsConfig, 1, institution.id).catch(() => {});
            }
        } catch (err) {
            console.error("Status update error:", err);
            setStatusMessage({ type: 'error', text: 'Failed to finalize status update. Please try again.' });
        } finally {
            setActionLoading(false);
        }
    };

    const headerThemeBg = institution?.themeColor || '#0ea5e9';

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
            {/* Top Sleek Brand Ribbon */}
            <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {institution?.logoUrl ? (
                            <img src={institution.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-full border border-slate-700" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                                DS
                            </div>
                        )}
                        <div>
                            <h1 className="text-lg font-extrabold tracking-tight text-white">
                                {institution?.name || 'Driving School Academy'}
                            </h1>
                            <p className="text-xs text-sky-400 font-medium tracking-wide">Lesson Confirmation & Management</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all border border-slate-700"
                    >
                        Exit Portal
                    </button>
                </div>
            </header>

            {/* Main Stage */}
            <main className="flex-grow flex items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-xl bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative backdrop-blur-xl">
                    {/* Top gradient glow string */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-600"></div>

                    <div className="p-6 sm:p-10">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 space-y-4">
                                <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm text-slate-400 font-medium animate-pulse">Retrieving encrypted lesson credentials...</p>
                            </div>
                        ) : !lesson ? (
                            <div className="text-center py-12 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
                                    <span className="text-2xl font-bold">!</span>
                                </div>
                                <h3 className="text-xl font-bold text-white">Record Unavailable</h3>
                                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                                    {statusMessage?.text || "The requested link is invalid or the underlying schedule item has been modified."}
                                </p>
                                <button 
                                    onClick={onClose} 
                                    className="mt-4 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm rounded-xl transition-all"
                                >
                                    Return to Home
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-fade-in-up">
                                {/* Status Banner */}
                                {statusMessage && (
                                    <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
                                        statusMessage.type === 'success' 
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                                            : 'bg-red-500/10 border-red-500/20 text-red-300'
                                    }`}>
                                        {statusMessage.type === 'success' ? (
                                            <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">!</span>
                                        )}
                                        <p className="text-xs sm:text-sm font-medium leading-relaxed">{statusMessage.text}</p>
                                    </div>
                                )}

                                {/* Student Badge Info */}
                                <div className="text-center pb-4 border-b border-slate-800/80">
                                    <span className="inline-block px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-bold uppercase tracking-wider mb-2">
                                        Assigned Trainee
                                    </span>
                                    <h2 className="text-2xl font-extrabold text-white tracking-tight">
                                        {student?.fullName || student?.name || 'Authorized Student'}
                                    </h2>
                                    {student?.admissionNumber && (
                                        <p className="text-xs text-slate-400 font-mono mt-1">ID: {student.admissionNumber}</p>
                                    )}
                                </div>

                                {/* Comprehensive Information Deck */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Lesson Details Desk</h4>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Date */}
                                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                                <CalendarDaysIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Scheduled Date</p>
                                                <p className="text-sm font-bold text-slate-200 mt-0.5">{lesson.lessonDate || lesson.date || 'Unspecified'}</p>
                                            </div>
                                        </div>

                                        {/* Time */}
                                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                <ClockIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Assigned Slot</p>
                                                <p className="text-sm font-bold text-slate-200 mt-0.5">
                                                    {lesson.startTime} {lesson.endTime ? ` - ${lesson.endTime}` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Instructor */}
                                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 sm:col-span-2">
                                            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                <UserIcon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-grow flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Lead Instructor</p>
                                                    <p className="text-sm font-bold text-slate-200 mt-0.5">{instructor?.name || 'Pending Assignment'}</p>
                                                </div>
                                                <span className="text-[11px] px-2.5 py-0.5 rounded bg-slate-800 font-medium text-slate-400">
                                                    {lesson.lessonType || 'Standard'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Vehicle Info */}
                                        {vehicle && (
                                            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 sm:col-span-2">
                                                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    <span className="font-bold text-xs">🚗</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Training Vehicle</p>
                                                    <p className="text-sm font-bold text-slate-200 mt-0.5">
                                                        {vehicle.make} {vehicle.model} <span className="text-sky-400 font-mono ml-1">({vehicle.plateNumber})</span>
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Confirmation State Indication */}
                                <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/80 text-center">
                                    <p className="text-xs text-slate-400">
                                        Current Confirmation Status:{' '}
                                        <span className={`font-bold ml-1 px-2 py-0.5 rounded-md text-xs ${
                                            (lesson.confirmationStatus || lesson.confirmation_status) === 'Confirmed'
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : (lesson.confirmationStatus || lesson.confirmation_status) === 'Reschedule Requested'
                                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                : 'bg-slate-800 text-slate-300'
                                        }`}>
                                            {lesson.confirmationStatus || lesson.confirmation_status || 'Pending Review'}
                                        </span>
                                    </p>
                                </div>

                                {/* Active Management Control Center */}
                                <div className="space-y-3 pt-2">
                                    <button 
                                        onClick={() => handleConfirmStatus('Confirmed')}
                                        disabled={actionLoading || (lesson.confirmationStatus || lesson.confirmation_status) === 'Confirmed'}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 transition-all disabled:opacity-40 disabled:pointer-events-none relative"
                                    >
                                        {actionLoading ? 'Synchronizing Status...' : '🔒 Absolutely, Confirm My Attendance'}
                                    </button>
                                    
                                    <button 
                                        onClick={() => handleConfirmStatus('Reschedule Requested')}
                                        disabled={actionLoading || (lesson.confirmationStatus || lesson.confirmation_status) === 'Reschedule Requested'}
                                        className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs border border-slate-800 transition-all disabled:opacity-40 disabled:pointer-events-none"
                                    >
                                        Request Rescheduling Slot Instead
                                    </button>
                                </div>

                                <p className="text-[11px] text-slate-500 text-center italic">
                                    Kindly ensure prompt arrival at least 5 minutes prior to avoid forfeiture of the allotted training slot.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-4 text-center border-t border-slate-800/60 text-slate-600 text-xs font-medium">
                Powered by {institution?.name || 'EduAI Automation Hub'} &bull; Verified Transport Framework
            </footer>
        </div>
    );
};
