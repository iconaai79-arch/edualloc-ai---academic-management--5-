
import React, { useState, useMemo, useEffect } from 'react';
import type { TimetableEntry, Subject, User, Department, Building, Room, LetterheadConfig, Course, TimetableSettings, AllocationRequest, Semester, AcademicYear, Institution, Conflict } from '../types';
import { TimetableGrid } from './TimetableGrid';
import { DepartmentWorkloadSummary } from './DepartmentWorkloadSummary';
import { RelationsView } from './RelationsView';
import { MasterCourseTimetableGrid } from './MasterCourseTimetableGrid';
import { DepartmentalMasterTimetable } from './DepartmentalMasterTimetable';
import {
    BuildingOfficeIcon,
    ChartBarIcon,
    CalendarDaysIcon,
    UserGroupIcon,
    PrinterIcon,
    DocumentArrowDownIcon,
    UserIcon,
    RectangleStackIcon,
    EyeIcon,
    XIcon
} from './icons/index';
import { generateMasterCourseTimetablePdf, generateMasterFacilityGridPdf } from '../services/pdfService';
import { generatePeriodLabels, timeToMinutes } from '../utils/timeUtils';
import { MasterBuildingTimetable } from './MasterBuildingTimetable';
import { generatePastelColor } from '../utils/colorUtils';
import { getInitials } from '../utils/stringUtils';

export interface TimetablesViewProps {
    generatedTimetable: TimetableEntry[];
    subjects: Subject[];
    lecturers: User[];
    departments: Department[];
    courses: Course[];
    buildings: Building[];
    rooms: Room[];
    allocations: AllocationRequest[];
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined;
    getRoomById: (id: string) => Room | undefined;
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    currentUser: User;
    timetableSettings: TimetableSettings;
    onSaveTimetableSettings: (config: TimetableSettings) => void;
    academicYears: AcademicYear[];
    activeSemester: Semester | null;
    isSchool?: boolean;
    currentInstitution?: Institution | null;
    onMoveTimetableEntry?: (entryId: string, newDay: string, newStartTime: string) => void;
    onLogAction?: (action: string) => void;
    timetableConflicts?: Conflict[];
}

const PdfPreviewModal: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
    useEffect(() => {
        return () => {
            if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
        };
    }, [url]);

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Document Preview</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Ready for Print or Archiving</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `Timetable_Export_${Date.now()}.pdf`;
                                link.click();
                            }}
                            className="btn-primary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4" /> Save Local
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                <div className="flex-grow bg-slate-100 dark:bg-slate-950 p-4">
                    <iframe
                        src={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
                        className="w-full h-full rounded-2xl shadow-inner border border-slate-200 dark:border-slate-800 bg-white"
                        title="PDF Preview"
                    />
                </div>
            </div>
        </div>
    );
};

export const TimetablesView: React.FC<TimetablesViewProps> = (props) => {
    const {
        generatedTimetable = [], subjects = [], lecturers = [], departments = [], courses = [], buildings = [],
        rooms = [], allocations = [], getSubjectById, getLecturerById, getRoomById, letterheadConfig,
        logoUrl, footerImageUrl, currentUser, timetableSettings, activeSemester,
        academicYears = [], currentInstitution, onMoveTimetableEntry, onLogAction, timetableConflicts
    } = props;

    const [viewMode, setViewMode] = useState<'grid' | 'workload' | 'relations' | 'master_course' | 'master_department' | 'master_building' | 'lecturer_schedule' | 'master_staff'>('master_course');
    const [selectedCourseForMasterView, setSelectedCourseForMasterView] = useState<string>('all');
    const [selectedLecturerId, setSelectedLecturerId] = useState<string>('');
    const [selectedDay, setSelectedDay] = useState<string>(timetableSettings?.operatingDays?.[0] || 'Monday');
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('vertical'); // List Layout by default to match PDF default

    const activeAcademicYear = useMemo(() => (academicYears || []).find(y => y && y.status === 'active'), [academicYears]);
    const isSchool = currentInstitution?.institutionType === 'Primary' || currentInstitution?.institutionType === 'Secondary';

    const staffLabel = isSchool ? 'Teacher' : 'Lecturer';
    const facultyLabel = isSchool ? 'Staff' : 'Faculty';

    const viewModeTitles: Record<string, string> = {
        grid: `Master Facility Grid - ${selectedDay}`,
        workload: 'Workload Summary',
        relations: 'Registry Hierarchy',
        master_course: `Master ${isSchool ? 'Grade' : 'Course'} Schedule`,
        master_department: 'Departmental Load',
        master_building: 'Facility Occupancy',
        lecturer_schedule: `${staffLabel} Individual Timetable`,
        master_staff: `Daily Master ${facultyLabel} View - ${selectedDay}`,
    };

    const academicRoles = ['lecturer', 'hod', 'tto', 'head_teacher', 'dos', 'teacher', 'deputy', 'academics_officer'];

    const filteredLecturers = useMemo(() => {
        return (lecturers || [])
            .filter(u => u && academicRoles.includes(u.role))
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [lecturers]);

    const filteredEntries = useMemo(() => {
        const list = Array.isArray(generatedTimetable) ? generatedTimetable : [];
        if (viewMode === 'lecturer_schedule') {
            return selectedLecturerId ? list.filter(e => e && e.lecturerId === selectedLecturerId) : [];
        }
        return list;
    }, [generatedTimetable, viewMode, selectedLecturerId]);

    const filteredRooms = useMemo(() => {
        const list = Array.isArray(rooms) ? rooms : [];
        if (selectedBuildingId === 'all') return list;
        return list.filter(r => r && r.buildingId === selectedBuildingId);
    }, [rooms, selectedBuildingId]);

    const periodHeaders = useMemo(() => generatePeriodLabels(timetableSettings, true), [timetableSettings]);
    const cellSpanMinutes = timetableSettings?.cellSpanMinutes || 60;

    const handleDownloadPdf = async () => {
        if (!generatedTimetable || generatedTimetable.length === 0) return;
        setIsGeneratingPdf(true);
        try {
            const coursesToInclude = selectedCourseForMasterView === 'all'
                ? (courses || [])
                : (courses || []).filter(c => c && c.id === selectedCourseForMasterView);

            const blob = await generateMasterCourseTimetablePdf(
                generatedTimetable,
                coursesToInclude,
                viewModeTitles['master_course'],
                "",
                letterheadConfig,
                footerImageUrl,
                logoUrl,
                activeAcademicYear?.name || 'Academic Period',
                activeSemester?.name || '',
                timetableSettings,
                getSubjectById,
                getLecturerById,
                getRoomById, // Pass the room getter to resolve dedicated rooms
                true, // Preview mode: generate only first page
                layoutMode // Pass the current layout mode
            );
            const url = URL.createObjectURL(blob);
            setPreviewPdfUrl(url);
            onLogAction?.(`Generated and previewed ${viewModeTitles[viewMode]} PDF`);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("An error occurred while generating the PDF.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleDownloadFacilityPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            // Helper for course lookup
            const getCourseById = (id: string) => (courses || []).find(c => c.id === id);

            const blob = await generateMasterFacilityGridPdf(
                generatedTimetable,
                buildings || [],
                rooms || [],
                viewModeTitles['grid'],
                letterheadConfig,
                footerImageUrl,
                logoUrl,
                activeAcademicYear?.name || 'Academic Period',
                activeSemester?.name || '',
                timetableSettings,
                selectedDay,
                getSubjectById,
                getLecturerById,
                getCourseById,
                courses || [], // Pass courses for strict room lookup
                true // Preview mode
            );
            const url = URL.createObjectURL(blob);
            setPreviewPdfUrl(url);
            onLogAction?.(`Generated and previewed Facility Grid PDF for ${selectedDay}`);
        } catch (error) {
            console.error("Failed to generate Facility PDF:", error);
            alert("An error occurred while generating the PDF.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="space-y-6">
            <style>{`
                .form-select { display: block; border-radius: 0.75rem; border: 1px solid #e2e8f0; padding: 0.25rem 2.5rem 0.25rem 1rem; background-color: white; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.75rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; }
                .dark .form-select { border-color: #334155; background-color: #0f172a; color: white; }
                @media print {
                   .print-col-force { background-color: #f8fafc !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>

            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between no-print bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setViewMode('master_course')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'master_course' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
                        {isSchool ? 'Grade' : 'Course'} Map
                    </button>
                    <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
                        Facility Grid
                    </button>
                    <button onClick={() => setViewMode('master_staff')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'master_staff' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
                        {facultyLabel} Grid
                    </button>
                    <button onClick={() => setViewMode('lecturer_schedule')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'lecturer_schedule' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
                        Single {staffLabel}
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {(viewMode === 'grid' || viewMode === 'master_staff') && (
                        <>
                            <select
                                value={selectedDay}
                                onChange={e => setSelectedDay(e.target.value)}
                                className="form-select text-[10px] font-black uppercase tracking-widest h-11 w-36"
                            >
                                {(timetableSettings?.operatingDays || []).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            {viewMode === 'grid' && (
                                <button
                                    onClick={handleDownloadFacilityPdf}
                                    disabled={isGeneratingPdf}
                                    className="h-11 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm border border-indigo-100 disabled:opacity-50"
                                >
                                    <EyeIcon className="w-4 h-4" /> {isGeneratingPdf ? 'Compiling...' : 'Rooms Report'}
                                </button>
                            )}
                        </>
                    )}
                    {viewMode === 'lecturer_schedule' && (
                        <select
                            value={selectedLecturerId}
                            onChange={e => setSelectedLecturerId(e.target.value)}
                            className="form-select text-[10px] font-black uppercase tracking-widest h-11 lg:w-48"
                        >
                            <option value="">Select {staffLabel}...</option>
                            {filteredLecturers.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                    )}
                    {viewMode === 'master_course' && (
                        <>
                            <select
                                value={selectedCourseForMasterView}
                                onChange={e => setSelectedCourseForMasterView(e.target.value)}
                                className="form-select text-[10px] font-black uppercase tracking-widest h-11 lg:w-48"
                            >
                                <option value="all">All {isSchool ? 'Grades' : 'Courses'}</option>
                                {(courses || []).map(c => c && <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm border border-indigo-100 disabled:opacity-50">
                                <EyeIcon className="w-4 h-4" /> {isGeneratingPdf ? 'Compiling...' : 'PDF Preview'}
                            </button>
                        </>
                    )}
                    <button onClick={() => window.print()} className="h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:opacity-90 transition-all flex items-center gap-2 shadow-lg">
                        <PrinterIcon className="w-4 h-4" /> Print View
                    </button>
                </div>
            </div>

            <div className="printable-area">
                {viewMode === 'master_course' ? (
                    <MasterCourseTimetableGrid
                        courses={courses || []}
                        subjects={subjects || []}
                        lecturers={lecturers || []}
                        rooms={rooms || []}
                        entries={generatedTimetable || []}
                        getSubjectById={getSubjectById}
                        getLecturerById={getLecturerById}
                        getRoomById={getRoomById}
                        timetableSettings={timetableSettings}
                        selectedCourseId={selectedCourseForMasterView}
                        academicYears={academicYears || []}
                        activeSemester={activeSemester || null}
                        isSchool={isSchool}
                        currentInstitution={currentInstitution}
                        timetableConflicts={timetableConflicts}
                        layoutMode={layoutMode}
                        onLayoutModeChange={setLayoutMode}
                    />
                ) : viewMode === 'grid' ? (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3 border-l-4 border-indigo-600 pl-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-r-2xl no-print">
                            <BuildingOfficeIcon className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-xl font-black uppercase tracking-tighter">Master Facility Grid: {selectedDay}</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto print:overflow-visible">
                                <table className="min-w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                            <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 sticky left-0 bg-slate-50 dark:bg-slate-900/50 z-20 print:static print:bg-transparent min-w-[200px]">Room / Facility</th>
                                            {periodHeaders.map((p, i) => (
                                                <th key={i} colSpan={p.colSpan} className="p-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-l border-slate-100 dark:border-slate-800">
                                                    <span className="block text-indigo-600 dark:text-indigo-400">{p.label}</span>
                                                    <span className="block opacity-60 font-mono text-[9px] mt-0.5">{p.startTime}-{p.endTime}</span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredRooms.map(room => {
                                            if (!room) return null;
                                            const roomEntries = (generatedTimetable || []).filter(e => e && e.roomId === room.id && e.day === selectedDay);
                                            const occupiedSlots = new Set<string>();

                                            return (
                                                <tr key={room.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all">
                                                    <td className="p-4 sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-slate-50 dark:border-slate-700 print:static print:bg-transparent">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400">
                                                                <BuildingOfficeIcon className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate uppercase tracking-tight">{room.name}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {periodHeaders.map((period, pIdx) => {
                                                        if (occupiedSlots.has(period.startTime)) return null;

                                                        if (period.isBreak) {
                                                            return (
                                                                <td key={pIdx} className="p-1 border-l border-slate-50 dark:border-slate-800 align-middle bg-slate-50/50 dark:bg-slate-900/10 text-center">
                                                                    <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest whitespace-nowrap">BREAK</span>
                                                                </td>
                                                            );
                                                        }

                                                        const slotEntries = roomEntries.filter(e =>
                                                            e && timeToMinutes(e.startTime) === timeToMinutes(period.startTime)
                                                        );

                                                        if (slotEntries.length > 0) {
                                                            const primaryEntry = slotEntries[0];
                                                            const duration = timeToMinutes(primaryEntry.endTime) - timeToMinutes(primaryEntry.startTime);
                                                            const colSpan = Math.max(1, Math.round(duration / cellSpanMinutes));

                                                            // Mark all slots covered by this entry as occupied
                                                            for (let k = 0; k < colSpan; k++) {
                                                                if (periodHeaders[pIdx + k]) occupiedSlots.add(periodHeaders[pIdx + k].startTime);
                                                            }

                                                            return (
                                                                <td key={pIdx} colSpan={colSpan} className="p-1 border-l border-slate-50 dark:border-slate-800 align-middle">
                                                                    <div className="flex h-full gap-1">
                                                                        {slotEntries.map(entry => {
                                                                            const subject = getSubjectById(entry.subjectId);
                                                                            const lecturer = getLecturerById(entry.lecturerId);
                                                                            return (
                                                                                <div key={entry.id} className="flex-1 rounded-xl p-2 text-center shadow-sm border border-black/5" style={{ backgroundColor: generatePastelColor(entry.subjectId) }}>
                                                                                    <p className="text-[10px] font-black text-slate-900 leading-tight uppercase truncate">{subject?.shortName || subject?.code}</p>
                                                                                    <p className="text-[9px] font-bold text-slate-600 mt-0.5 truncate">{lecturer?.name}</p>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </td>
                                                            );
                                                        }
                                                        return <td key={pIdx} className="p-1 border-l border-slate-50 dark:border-slate-800"></td>;
                                                    })}
                                                </tr>
                                            );
                                        })}
                                        {filteredRooms.length === 0 && (
                                            <tr>
                                                <td colSpan={periodHeaders.length + 1} className="p-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest opacity-30">
                                                    No facilities registered or matching search
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3 border-l-4 border-indigo-600 pl-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-r-2xl no-print">
                            <CalendarDaysIcon className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-xl font-black uppercase tracking-tighter">{viewModeTitles[viewMode]}</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto">
                            <TimetableGrid
                                entries={filteredEntries || []}
                                getSubjectById={getSubjectById}
                                getLecturerById={getLecturerById}
                                getRoomById={getRoomById}
                                timetableSettings={timetableSettings}
                                onMoveLesson={onMoveTimetableEntry}
                                isEditable={!!onMoveTimetableEntry}
                            />
                        </div>
                    </div>
                )}
            </div>

            {previewPdfUrl && <PdfPreviewModal url={previewPdfUrl} onClose={() => setPreviewPdfUrl(null)} />}
        </div>
    );
};
