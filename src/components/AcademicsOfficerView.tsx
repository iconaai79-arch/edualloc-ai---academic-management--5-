


import React, { useState, useMemo } from 'react';
import type { User, Subject, Course, Room, Department, AcademicYear, Semester, ExamTimetableEntry, TimetableSettings, Building, AcademicLevel, LetterheadConfig, EmailConfig, Institution, SmsConfig, ExamTimetableSettings, AllocationRequest, TimeOffRequest, TimetableEntry } from '../types';
import { generateExamTimetable } from '../services/geminiService';
import { generateExamTimetablePdf } from '../services/pdfService';
import { ExamTimetableGrid } from './ExamTimetableGrid';
import { SettingsManager } from './SettingsManager';
import { ClipboardListIcon, Cog8ToothIcon, PrinterIcon, DocumentArrowDownIcon, CalendarDaysIcon, BookOpenIcon, CheckCircleIcon, SparklesIcon, CommandLineIcon, BeakerIcon } from './icons/index';
import { generateStandardExamTimetable } from '../utils/examUtils';
import { TimetableWizard } from './TimetableWizard';

interface AcademicsOfficerViewProps {
    currentUser: User;
    subjects: Subject[];
    onUpdateSubject: (subjectId: string, updatedData: Partial<Omit<Subject, 'id' | 'institutionId'>>) => void;
    courses: Course[];
    onUpdateCourse?: (courseId: string, updatedData: Partial<Omit<Course, 'id' | 'institutionId'>>) => void;
    users: User[];
    rooms: Room[];
    // Added add/delete/update room
    onAddRoom?: (roomData: Omit<Room, 'id' | 'institutionId'>) => void;
    onUpdateRoom?: (roomId: string, data: Partial<Omit<Room, 'id' | 'institutionId'>>) => void;
    onDeleteRoom?: (roomId: string) => void;
    onImportRooms?: (rooms: Omit<Room, 'id' | 'institutionId'>[]) => void;

    departments: Department[];
    onAddDepartment?: (name: string) => Promise<void> | void;
    onUpdateDepartment?: (id: string, name: string) => void;
    onDeleteDepartment?: (id: string) => void;
    onImportDepartments?: (departments: Omit<Department, 'id' | 'institutionId'>[]) => Promise<void>;

    activeAcademicYear: AcademicYear | null;
    activeSemester: Semester | null;
    // Updated to accept full ExamTimetableEntry array
    onExamTimetableGenerated: (entries: ExamTimetableEntry[], academicYearId: string, semesterId: string) => Promise<void>;
    examTimetable: ExamTimetableEntry[];
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined;
    getRoomById: (id: string) => Room | undefined;
    courseSizes: Map<string, number>;
    academicYears: AcademicYear[];
    onAddAcademicYear?: (data: Omit<AcademicYear, 'id' | 'institutionId' | 'status'>) => void;
    onUpdateAcademicYear?: (yearId: string, data: Partial<Omit<AcademicYear, 'id' | 'institutionId'>>) => Promise<void>;
    onDeleteAcademicYear?: (yearId: string) => void;
    semesters: Semester[];
    onAddSemester?: (data: Omit<Semester, 'id' | 'institutionId'>) => void;
    onUpdateSemester?: (semesterId: string, data: Partial<Omit<Semester, 'id' | 'institutionId' | 'academicYearId'>>) => Promise<void>;
    onDeleteSemester?: (semesterId: string) => void;
    timetableSettings: TimetableSettings;
    onSaveTimetableSettings?: (config: TimetableSettings) => void;
    onPublishTimetable?: (config: any) => void;
    onAssociateSubjectToCourseLevel?: (subjectId: string, levelId: string) => void;
    onDisassociateSubjectFromCourseLevel?: (subjectId: string, levelId: string) => void;
    lessonRatings: any[];
    buildings: Building[];
    onAddBuilding?: (name: string) => Promise<boolean>;
    onAddBuildings?: (buildings: Omit<Building, 'id' | 'institutionId'>[]) => Promise<void>;
    onUpdateBuilding?: (buildingId: string, data: Partial<Omit<Building, 'id' | 'institutionId'>>) => void;
    onDeleteBuilding?: (buildingId: string) => void;

    academicLevels: AcademicLevel[];
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    emailConfig: EmailConfig;
    onSaveEmailConfig: (config: EmailConfig) => void;
    onSendTestEmail: (recipient: string) => Promise<{ success: boolean; message: string; }>;
    currentInstitution?: Institution | null;
    onUpdateInstitution?: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => void;
    smsConfig: SmsConfig;
    themeColor: string;
    examTimetableSettings: ExamTimetableSettings;
    onSaveExamTimetableSettings: (config: ExamTimetableSettings) => void;
    // Added for Wizard
    onTimetableGenerated?: (timetable: Omit<TimetableEntry, 'id' | 'institutionId' | 'academicYearId' | 'semesterId'>[], academicYearId: string, semesterId: string) => Promise<void>;
    allocations?: AllocationRequest[];
    timeOffRequests?: TimeOffRequest[];
    onLogAction?: (action: string) => Promise<void>;
    onImportStudents?: (students: any[]) => Promise<void>;
    onWithdrawRequest?: (requestId: string) => Promise<void>;
    onAddExtensionRequest?: (reason: string) => void;
}

export const AcademicsOfficerView: React.FC<AcademicsOfficerViewProps> = (props) => {
    const {
        currentUser, subjects = [], courses = [], users = [], rooms = [], departments = [],
        activeAcademicYear, activeSemester, onExamTimetableGenerated, examTimetable = [],
        getSubjectById, getLecturerById, getRoomById, courseSizes, letterheadConfig,
        logoUrl, footerImageUrl, currentInstitution, timetableSettings,
        onUpdateSubject, examTimetableSettings, buildings = [], academicYears = [],
        onLogAction, onAssociateSubjectToCourseLevel, onDisassociateSubjectFromCourseLevel
    } = props;

    const [activeTab, setActiveTab] = useState('dashboard');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [examUnitSearch, setExamUnitSearch] = useState('');
    const [generationMode, setGenerationMode] = useState<'ai' | 'standard'>('ai');
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    const canGenerate = useMemo(() => {
        return activeAcademicYear && activeSemester && (activeSemester.sessions || []).some(s => (s.examPeriods || []).length > 0);
    }, [activeAcademicYear, activeSemester]);

    const handleGenerate = async () => {
        if (!canGenerate || !activeAcademicYear || !activeSemester) {
            setError("Configuration incomplete. Set active semester and exam periods in Settings.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const subjectsWithExams = (Array.isArray(subjects) ? subjects : []).filter(s => s && s.hasExam !== false);

            if (generationMode === 'ai') {
                const lecturers = (Array.isArray(users) ? users : []).filter(u => u && u.role !== 'student' && u.role !== 'super_admin');
                const allExamPeriods = (activeSemester.sessions || []).flatMap(s => s.examPeriods || []);
                if (allExamPeriods.length === 0) throw new Error("No exam periods defined.");

                const allStartDates = allExamPeriods.map(p => new Date(p.startDate));
                const allEndDates = allExamPeriods.map(p => new Date(p.endDate));
                const examPeriod = {
                    start: new Date(Math.min(...allStartDates.map(d => d.getTime()))).toISOString().split('T')[0],
                    end: new Date(Math.max(...allEndDates.map(d => d.getTime()))).toISOString().split('T')[0]
                };

                const rawTimetable = await generateExamTimetable(subjectsWithExams, Array.isArray(courses) ? courses : [], lecturers, Array.isArray(rooms) ? rooms : [], examPeriod, courseSizes, examTimetableSettings);
                await onExamTimetableGenerated(rawTimetable, activeAcademicYear.id, activeSemester.id);
                onLogAction?.(`Generated AI exam timetable for ${activeSemester.name} (${activeAcademicYear.name})`);
            } else {
                const standardEntries = generateStandardExamTimetable(subjectsWithExams, Array.isArray(courses) ? courses : [], Array.isArray(users) ? users : [], Array.isArray(rooms) ? rooms : [], activeSemester, examTimetableSettings);
                await onExamTimetableGenerated(standardEntries, activeAcademicYear.id, activeSemester.id);
                onLogAction?.(`Generated standard exam timetable for ${activeSemester.name} (${activeAcademicYear.name})`);
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during generation.");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredExamTimetable = useMemo(() => {
        const list = Array.isArray(examTimetable) ? examTimetable : [];
        if (departmentFilter === 'all') return list;
        const subjectIdsInDept = new Set((Array.isArray(subjects) ? subjects : []).filter(s => s && s.departmentId === departmentFilter).map(s => s.id));
        return list.filter(entry => entry && subjectIdsInDept.has(entry.subjectId));
    }, [examTimetable, departmentFilter, subjects]);

    const title = useMemo(() => {
        if (departmentFilter === 'all') return 'Exam Timetable (All Departments)';
        const dept = (Array.isArray(departments) ? departments : []).find(d => d && d.id === departmentFilter);
        return `Exam Timetable for ${dept?.name || 'Unknown Department'}`;
    }, [departmentFilter, departments]);

    const filteredExamUnits = useMemo(() => {
        let filtered = Array.isArray(subjects) ? subjects : [];
        if (departmentFilter !== 'all') filtered = filtered.filter(s => s && s.departmentId === departmentFilter);
        if (examUnitSearch.trim()) {
            const q = examUnitSearch.toLowerCase();
            filtered = filtered.filter(s => s && ((s.name || "").toLowerCase().includes(q) || (s.code || "").toLowerCase().includes(q)));
        }
        return filtered;
    }, [subjects, departmentFilter, examUnitSearch]);

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const pdfUrl = await generateExamTimetablePdf(filteredExamTimetable, getSubjectById, getLecturerById, getRoomById, buildings, courses, title, letterheadConfig, footerImageUrl, logoUrl);
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `Exam_Timetable.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Academics Officer Dashboard</h2>
            <div className="border-b border-slate-200 dark:border-slate-700 no-print text-slate-900 dark:text-slate-100">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('dashboard')} className={`${activeTab === 'dashboard' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'} inline-flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}><ClipboardListIcon className="w-5 h-5 mr-2" /> Dashboard</button>
                    <button onClick={() => setActiveTab('exam_units')} className={`${activeTab === 'exam_units' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'} inline-flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}><BookOpenIcon className="w-5 h-5 mr-2" /> Exam Units</button>
                    <button onClick={() => setActiveTab('settings')} className={`${activeTab === 'settings' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'} inline-flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}><Cog8ToothIcon className="w-5 h-5 mr-2" /> Settings</button>
                </nav>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <section className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="text-xl font-black tracking-tighter uppercase mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                            <SparklesIcon className="w-5 h-5 text-indigo-600" />
                            Operational Hub
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <button
                                onClick={() => setIsWizardOpen(true)}
                                className="flex flex-col items-start p-6 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all group text-left hover:-translate-y-1"
                            >
                                <div className="p-3 bg-white/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                                    <BeakerIcon className="w-6 h-6" />
                                </div>
                                <span className="font-black text-sm uppercase tracking-tight">Timetable Wizard</span>
                                <p className="text-[10px] opacity-80 uppercase mt-1">Guided Generation</p>
                            </button>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Exam Timetable Generator</h3>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                            {!canGenerate || !activeAcademicYear || !activeSemester ? (
                                <p className="p-4 text-center text-amber-600 bg-amber-50 dark:bg-amber-900/50 rounded-lg">
                                    Please set an active academic year and semester with at least one defined <strong>Exam Period</strong> in the Admin's <span className="font-bold">Settings &rarr; Academic Calendar</span> tab to enable generation.
                                </p>
                            ) : (
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">Ready to generate for:</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{activeSemester.name} ({activeAcademicYear.name})</p>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">
                                            {activeSemester.sessions?.map(session => (
                                                session.examPeriods?.map(examPeriod => (
                                                    <div key={examPeriod.id}>- {session.name} / {examPeriod.name}: {examPeriod.startDate} to {examPeriod.endDate}</div>
                                                ))
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setGenerationMode('ai')}
                                            className={`btn-secondary ${generationMode === 'ai' ? 'ring-2 ring-indigo-500' : ''}`}
                                        >
                                            <SparklesIcon className="w-4 h-4 inline mr-1" /> AI Mode
                                        </button>
                                        <button
                                            onClick={() => setGenerationMode('standard')}
                                            className={`btn-secondary ${generationMode === 'standard' ? 'ring-2 ring-indigo-500' : ''}`}
                                        >
                                            <CommandLineIcon className="w-4 h-4 inline mr-1" /> Std Mode
                                        </button>
                                        <button onClick={handleGenerate} disabled={isLoading} className="btn-primary">
                                            {isLoading ? 'Generating...' : `Generate (${generationMode.toUpperCase()})`}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {isLoading && <div className="mt-4"><div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden"><div className="bg-[var(--color-primary)] h-2.5 rounded-full animate-pulse"></div></div></div>}
                            {error && <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}
                        </div>
                    </section>

                    <section>
                        <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                            <div className="flex items-center gap-4">
                                <label htmlFor="dept-filter" className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter by Department:</label>
                                <select
                                    id="dept-filter"
                                    value={departmentFilter}
                                    onChange={e => setDepartmentFilter(e.target.value)}
                                    className="form-select"
                                >
                                    <option value="all">All Departments</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => window.print()} className="btn-secondary inline-flex items-center gap-2"><PrinterIcon className="w-5 h-5" /> Print</button>
                                <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="btn-secondary inline-flex items-center gap-2">
                                    <DocumentArrowDownIcon className="w-5 h-5" /> {isGeneratingPdf ? 'Generating...' : 'PDF'}
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            {/* FIXED: currentInstitution is now correctly passed to ExamTimetableGrid */}
                            <ExamTimetableGrid
                                entries={filteredExamTimetable}
                                getSubjectById={getSubjectById}
                                getLecturerById={getLecturerById}
                                getRoomById={getRoomById}
                                buildings={props.buildings}
                                courses={courses}
                                title={title}
                                currentInstitution={currentInstitution}
                            />
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'exam_units' && (
                <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Manage Exam Units</h3>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-md">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Unit Code</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Unit Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Department</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Has Exam?</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                    {filteredExamUnits.map(subject => (
                                        <tr key={subject.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{subject.code}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{subject.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                {departments.find(d => d.id === subject.departmentId)?.name || 'Unknown'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => onUpdateSubject(subject.id, { hasExam: subject.hasExam === false ? true : false })}
                                                    className={`inline-flex items-center justify-center p-2 rounded-full transition-colors ${subject.hasExam !== false
                                                        ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/50 dark:hover:bg-green-900'
                                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600'
                                                        }`}
                                                    title={subject.hasExam !== false ? "Click to disable exam" : "Click to enable exam"}
                                                >
                                                    {subject.hasExam !== false ? <CheckCircleIcon className="w-6 h-6" /> : <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-500" />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredExamUnits.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                                No units found matching your criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <SettingsManager
                    {...props}
                    onAssociateSubjectToCourseLevel={onAssociateSubjectToCourseLevel}
                    onDisassociateSubjectFromCourseLevel={onDisassociateSubjectFromCourseLevel}
                    isAcademicsOfficer={true}
                    allocations={[]}
                />
            )}

            {isWizardOpen && (
                <TimetableWizard
                    onClose={() => setIsWizardOpen(false)}
                    allocations={(props.allocations || []).filter(r => r.status === 'approved')}
                    subjects={subjects}
                    lecturers={users.filter(u => u.role === 'lecturer' || u.role === 'teacher')}
                    rooms={rooms}
                    courses={courses}
                    timetableSettings={timetableSettings}
                    activeAcademicYear={activeAcademicYear}
                    activeSemester={activeSemester}
                    currentInstitution={currentInstitution}
                    courseSizes={courseSizes}
                    timeOffRequests={props.timeOffRequests || []}
                    onTimetableGenerated={props.onTimetableGenerated || (async () => { })}
                    onLogAction={onLogAction}
                />
            )}

            <style>{`
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 600; border: none; cursor: pointer; } 
                .btn-primary:hover:not(:disabled) { filter: brightness(0.9); } .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .dark .btn-secondary { background-color: #4b5563; color: #e5e7eb; }
                .form-input { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input { border-color: #4b5563; background-color: #374151; color: white; }
                .form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; display: block; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
            `}</style>
        </div>
    );
};
