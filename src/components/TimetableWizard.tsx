
import React, { useState, useMemo } from 'react';
import type {
    AllocationRequest, Subject, User, Room, TimetableEntry,
    TimetableSettings, Course, AcademicYear, Semester, TimeOffRequest,
    Institution
} from '../types';
import { generateTimetable } from '../services/geminiService';
import { generateStandardTimetable } from '../utils/timetableLogic';
import {
    SparklesIcon, CommandLineIcon, ExclamationTriangleIcon,
    ChevronRightIcon, XIcon, CheckCircleIcon, BuildingOfficeIcon,
    UserGroupIcon, RectangleStackIcon, CalendarDaysIcon
} from './icons/index';

interface TimetableWizardProps {
    onClose?: () => void;
    isInline?: boolean;
    allocations: AllocationRequest[];
    subjects: Subject[];
    lecturers: User[];
    rooms: Room[];
    courses: Course[];
    timetableSettings: TimetableSettings;
    activeAcademicYear: AcademicYear | null;
    activeSemester: Semester | null;
    currentInstitution?: Institution | null;
    courseSizes: Map<string, number>;
    timeOffRequests: TimeOffRequest[];
    onTimetableGenerated: (timetable: Omit<TimetableEntry, 'id' | 'institutionId' | 'academicYearId' | 'semesterId'>[], academicYearId: string, semesterId: string) => Promise<void>;
    onNavigateToSettings?: (tab?: string) => void;
    onLogAction?: (action: string) => Promise<void>;
}

export const TimetableWizard: React.FC<TimetableWizardProps> = ({
    onClose, isInline = false, allocations, subjects, lecturers, rooms, courses, timetableSettings,
    activeAcademicYear, activeSemester, currentInstitution, courseSizes,
    timeOffRequests, onTimetableGenerated, onNavigateToSettings, onLogAction
}) => {
    const [step, setStep] = useState(1);
    const [mode, setMode] = useState<'ai' | 'standard'>('ai');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedCount, setGeneratedCount] = useState(0);

    const steps = [
        { id: 1, title: 'Context Check' },
        { id: 2, title: 'Resource Audit' },
        { id: 3, title: 'Workload Validation' },
        { id: 4, title: 'Generation' }
    ];

    const contextStatus = useMemo(() => {
        return {
            year: !!activeAcademicYear,
            semester: !!activeSemester,
            settings: !!timetableSettings && timetableSettings.operatingDays.length > 0
        };
    }, [activeAcademicYear, activeSemester, timetableSettings]);

    const resourceStatus = useMemo(() => {
        return {
            rooms: rooms.length,
            lecturers: lecturers.length,
            subjects: subjects.length,
            courses: courses.length
        };
    }, [rooms, lecturers, subjects, courses]);

    const workloadStatus = useMemo(() => {
        const approved = allocations.filter(a => a.status === 'approved').length;
        const pending = allocations.filter(a => a.status === 'pending' || a.status === 'hod_approved').length;
        return { approved, pending };
    }, [allocations]);

    const canProceedStep1 = contextStatus.year && contextStatus.semester && contextStatus.settings;
    const canProceedStep2 = resourceStatus.rooms > 0 && resourceStatus.lecturers > 0 && resourceStatus.subjects > 0;
    const canProceedStep3 = workloadStatus.approved > 0;

    const handleGenerate = async () => {
        if (!activeAcademicYear || !activeSemester) return;

        setIsGenerating(true);
        setError(null);

        try {
            let result: any[] = [];

            if (mode === 'ai') {
                result = await generateTimetable(
                    allocations.filter(a => a.status === 'approved'),
                    subjects,
                    lecturers,
                    rooms,
                    timetableSettings,
                    courseSizes,
                    courses,
                    timeOffRequests,
                    currentInstitution?.scheduleProfiles || [],
                    currentInstitution?.aiModelTier
                );
            } else {
                result = generateStandardTimetable(
                    allocations.filter(a => a.status === 'approved'),
                    subjects,
                    lecturers,
                    rooms,
                    timetableSettings,
                    activeAcademicYear.id,
                    activeSemester.id,
                    courses,
                    currentInstitution?.scheduleProfiles || []
                );
            }

            if (result && result.length > 0) {
                await onTimetableGenerated(result, activeAcademicYear.id, activeSemester.id);
                setGeneratedCount(result.length);
                onLogAction?.(`Generated ${mode === 'ai' ? 'AI' : 'standard'} timetable for ${activeSemester.name} (${activeAcademicYear.name}): ${result.length} entries`);
                setStep(5); // Success step
            } else {
                setError("The generator produced 0 entries. Please check your allocations and constraints.");
            }
        } catch (e: any) {
            setError(e.message || "An unexpected error occurred during generation.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNext = () => {
        setError(null);
        if (step === 1 && !canProceedStep1) {
            setError("Please ensure Academic Year, Semester, and Operating Hours are configured.");
            return;
        }
        if (step === 2 && !canProceedStep2) {
            setError("Missing critical resources. Please add rooms, faculty, and subjects.");
            return;
        }
        if (step === 3 && !canProceedStep3) {
            setError("No approved allocations found to schedule.");
            return;
        }
        setStep(prev => prev + 1);
    };

    const containerClasses = isInline
        ? "w-full bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in-up"
        : "bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up";

    const content = (
        <div className={containerClasses}>
            {/* Header */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                        <SparklesIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Timetable Wizard</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Step {step} of 5</p>
                    </div>
                </div>
                {!isInline && onClose && (
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        <XIcon className="w-6 h-6 text-slate-400" />
                    </button>
                )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5">
                <div
                    className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                    style={{ width: `${(step / 5) * 100}%` }}
                />
            </div>

            {/* Body */}
            <div className="p-8 min-h-[300px] flex flex-col justify-center">

                {step === 1 && (
                    <div className="space-y-6 animate-fade-in">
                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">1. Academic Context Verification</h4>
                        <div className="space-y-3">
                            <div className={`flex items-center justify-between p-4 rounded-2xl border ${contextStatus.year ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                                <div className="flex items-center gap-3">
                                    <CalendarDaysIcon className={`w-5 h-5 ${contextStatus.year ? 'text-green-600' : 'text-red-600'}`} />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Active Academic Year</span>
                                </div>
                                {contextStatus.year ? <CheckCircleIcon className="w-6 h-6 text-green-600" /> : <XIcon className="w-6 h-6 text-red-600" />}
                            </div>
                            <div className={`flex items-center justify-between p-4 rounded-2xl border ${contextStatus.semester ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                                <div className="flex items-center gap-3">
                                    <CalendarDaysIcon className={`w-5 h-5 ${contextStatus.semester ? 'text-green-600' : 'text-red-600'}`} />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Active Semester</span>
                                </div>
                                {contextStatus.semester ? <CheckCircleIcon className="w-6 h-6 text-green-600" /> : <XIcon className="w-6 h-6 text-red-600" />}
                            </div>
                            <div className={`flex items-center justify-between p-4 rounded-2xl border ${contextStatus.settings ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                                <div className="flex items-center gap-3">
                                    <CommandLineIcon className={`w-5 h-5 ${contextStatus.settings ? 'text-green-600' : 'text-red-600'}`} />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Operational Hours Configured</span>
                                </div>
                                {contextStatus.settings ? <CheckCircleIcon className="w-6 h-6 text-green-600" /> : <XIcon className="w-6 h-6 text-red-600" />}
                            </div>
                        </div>
                        {!canProceedStep1 && (
                            <div className="flex justify-center mt-4">
                                <button
                                    onClick={() => onNavigateToSettings?.('calendar')}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest underline decoration-2 underline-offset-4"
                                >
                                    Configure in Settings &rarr;
                                </button>
                            </div>
                        )}
                    </div>
                )}


                {step === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">2. Resource Availability</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-center">
                                <BuildingOfficeIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{resourceStatus.rooms}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rooms</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-center">
                                <UserGroupIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{resourceStatus.lecturers}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Faculty</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-center">
                                <RectangleStackIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{resourceStatus.subjects}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subjects</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-center">
                                <CommandLineIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{resourceStatus.courses}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Courses</p>
                            </div>
                        </div>
                        {!canProceedStep2 && <p className="text-center text-xs text-red-500 font-bold uppercase tracking-widest mt-4">Missing critical resources. Add rooms, staff, or subjects first.</p>}
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-fade-in">
                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">3. Registry Load Check</h4>

                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center p-5 bg-white dark:bg-slate-800 border-2 border-green-100 dark:border-green-900 rounded-2xl">
                                <div>
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Ready for Scheduling</p>
                                    <p className="text-3xl font-black text-green-600 dark:text-green-400 mt-1">{workloadStatus.approved}</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Approved Allocations</p>
                                </div>
                                <CheckCircleIcon className="w-10 h-10 text-green-500 opacity-20" />
                            </div>

                            <div className="flex justify-between items-center p-5 bg-white dark:bg-slate-800 border-2 border-yellow-100 dark:border-yellow-900 rounded-2xl">
                                <div>
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Pending Approval</p>
                                    <p className="text-3xl font-black text-yellow-600 dark:text-yellow-400 mt-1">{workloadStatus.pending}</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Excluded from generation</p>
                                </div>
                                <ExclamationTriangleIcon className="w-10 h-10 text-yellow-500 opacity-20" />
                            </div>
                        </div>

                        {!canProceedStep3 && <p className="text-center text-xs text-red-500 font-bold uppercase tracking-widest mt-2">No approved allocations found. Go to 'Registry' to approve requests.</p>}
                        {workloadStatus.pending > 0 && <p className="text-center text-xs text-yellow-600 font-bold uppercase tracking-widest mt-2">Note: Only approved allocations will be scheduled.</p>}
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="text-center">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Ready to Launch</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Select your engine and start the generation process.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setMode('ai')}
                                className={`p-6 rounded-2xl border-2 text-center transition-all ${mode === 'ai' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200'}`}
                            >
                                <SparklesIcon className={`w-8 h-8 mx-auto mb-3 ${mode === 'ai' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <h5 className={`font-bold ${mode === 'ai' ? 'text-indigo-700' : 'text-slate-600 dark:text-slate-300'}`}>AI Neural Engine</h5>
                                <p className="text-[10px] text-slate-400 mt-1">Best for complex, constraint-heavy schedules. Optimizes for conflict resolution.</p>
                            </button>

                            <button
                                onClick={() => setMode('standard')}
                                className={`p-6 rounded-2xl border-2 text-center transition-all ${mode === 'standard' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200'}`}
                            >
                                <CommandLineIcon className={`w-8 h-8 mx-auto mb-3 ${mode === 'standard' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <h5 className={`font-bold ${mode === 'standard' ? 'text-indigo-700' : 'text-slate-600 dark:text-slate-300'}`}>Standard Algorithm</h5>
                                <p className="text-[10px] text-slate-400 mt-1">Faster, deterministic generation. Best for simple, linear schedules.</p>
                            </button>
                        </div>



                        {isGenerating && (
                            <div className="flex flex-col items-center justify-center py-4 animate-pulse">
                                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Processing Logic Matrix...</p>
                            </div>
                        )}
                    </div>
                )}

                {step === 5 && (
                    <div className="text-center py-8 animate-scale-in">
                        <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-[3rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-100 dark:shadow-none">
                            <CheckCircleIcon className="w-12 h-12" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Generation Complete</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">Successfully scheduled <span className="text-indigo-600 font-bold">{generatedCount}</span> lesson entries.</p>
                        {onClose && (
                            <button onClick={onClose} className="btn-primary h-14 px-12 uppercase tracking-widest text-xs shadow-indigo-100">View Master Timetable</button>
                        )}
                    </div>
                )}

                {error && (
                    <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 text-xs font-bold rounded-xl border border-red-200 dark:border-red-800 text-center animate-shake">
                        {error}
                    </div>
                )}
            </div>


            {/* Footer Controls */}
            {
                step < 5 && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between">
                        <button
                            onClick={() => { setError(null); setStep(Math.max(1, step - 1)); }}
                            disabled={step === 1 || isGenerating}
                            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                        >
                            Back
                        </button>

                        {step < 4 ? (
                            <button
                                onClick={handleNext}
                                className="btn-primary h-12 px-8 flex items-center gap-2 uppercase text-xs font-black tracking-widest hover:scale-105 active:scale-95 transition-all"
                            >
                                Next Step <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="btn-primary h-12 px-10 flex items-center gap-2 uppercase text-xs font-black tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 disabled:opacity-70"
                            >
                                {isGenerating ? 'Processing...' : 'Run Generator'}
                            </button>
                        )}
                    </div>
                )
            }
        </div >
    );

    if (isInline) {
        return content;
    }

    return (
        <div className="fixed inset-0 bg-slate-900/95 z-[300] flex items-center justify-center p-4 backdrop-blur-md">
            {content}
        </div>
    );
};
