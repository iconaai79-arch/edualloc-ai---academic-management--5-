
import React, { useState, useMemo, useEffect } from 'react';
import type { TimetableEntry, Subject, User, Department, Building, Room, LetterheadConfig, Course, TimetableSettings, AllocationRequest, Semester, AcademicYear, Institution, Conflict } from '../types';
import { TimetableGrid } from './TimetableGrid';
import { DepartmentWorkloadSummary } from './DepartmentWorkloadSummary';
import { RelationsView } from './RelationsView';
import { MasterCourseTimetableGrid } from './MasterCourseTimetableGrid';
import { DepartmentalMasterTimetable } from './DepartmentalMasterTimetable';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { UserIcon } from './icons/UserIcon';
import { RectangleStackIcon } from './icons/RectangleStackIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { EyeIcon } from './icons/EyeIcon';
import { XIcon } from './icons/XIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { PdfPreviewModal } from './PdfPreviewModal';
import { generateMasterCourseTimetablePdf, generateMasterFacilityGridPdf, generateLecturerTimetablePdf, generateStudentTimetablePdf } from '../services/pdfService';
import { apiService } from '../services/apiService';
import { generatePeriodLabels, timeToMinutes, minutesToTime } from '../utils/timeUtils';
import { getInstitutionEmailConfig } from '../services/emailService';
import { MasterBuildingTimetable } from './MasterBuildingTimetable';
import { LecturerTimetableList } from './LecturerTimetableList';
import { generatePastelColor } from '../utils/colorUtils';
import { getInitials } from '../utils/stringUtils';
import { isSchoolInstitution } from '../utils/roleUtils';

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
    allUsers?: User[];
}

export const TimetablesView: React.FC<TimetablesViewProps> = (props) => {
    const {
        generatedTimetable = [], subjects = [], lecturers = [], departments = [], courses = [], buildings = [],
        rooms = [], allocations = [], getSubjectById, getLecturerById, getRoomById, letterheadConfig,
        logoUrl, footerImageUrl, currentUser, timetableSettings, activeSemester,
        academicYears = [], currentInstitution, onMoveTimetableEntry, onLogAction, timetableConflicts,
        allUsers = []
    } = props;

    const [viewMode, setViewMode] = useState<'grid' | 'workload' | 'relations' | 'master_course' | 'master_department' | 'master_building' | 'lecturer_schedule' | 'master_staff'>('master_course');
    const [selectedCourseForMasterView, setSelectedCourseForMasterView] = useState<string>('all');
    const [selectedLevelIdForMasterView, setSelectedLevelIdForMasterView] = useState<string>('all');
    const [selectedLecturerId, setSelectedLecturerId] = useState<string>('');
    const [selectedDay, setSelectedDay] = useState<string>(timetableSettings?.operatingDays?.[0] || 'Monday');
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isBulkEmailing, setIsBulkEmailing] = useState(false);
    const [bulkEmailProgress, setBulkEmailProgress] = useState({ current: 0, total: 0 });
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('vertical'); // List Layout by default to match PDF default

    const activeAcademicYear = useMemo(() => (academicYears || []).find(y => y && y.status === 'active'), [academicYears]);
    const isSchool = isSchoolInstitution(currentInstitution);

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
            if (selectedLecturerId === 'all') return list; // Return all for "All" view (though grid handles single)
            return selectedLecturerId ? list.filter(e => e && e.lecturerId === selectedLecturerId) : [];
        }
        return list;
    }, [generatedTimetable, viewMode, selectedLecturerId]);

    const filteredRooms = useMemo(() => {
        const list = Array.isArray(rooms) ? rooms : [];
        if (selectedBuildingId === 'all') return list;
        return list.filter(r => r && r.buildingId === selectedBuildingId);
    }, [rooms, selectedBuildingId]);

    const getEffectiveSettings = (courseId?: string) => {
        let base = { ...timetableSettings };
        const course = courses.find(c => c.id === courseId);
        const profileId = course?.scheduleProfileId || timetableSettings.defaultScheduleProfileId;
        const profile = (currentInstitution?.scheduleProfiles || []).find(p => p.id === profileId);

        if (profile) {
            return {
                ...base,
                operatingDays: profile.operatingDays || base.operatingDays,
                startTime: profile.startTime || base.startTime,
                endTime: profile.endTime || base.endTime,
                periods: (profile.periods && profile.periods.length > 0) ? profile.periods : (base.periods || []),
                breaks: (profile.breaks && profile.breaks.length > 0) ? profile.breaks : (base.breaks || []),
                cellSpanMinutes: profile.cellSpanMinutes || base.cellSpanMinutes
            };
        }
        return base;
    };

    const wideSettings = useMemo(() => {
        let minStart = timeToMinutes(timetableSettings.startTime);
        let maxEnd = timeToMinutes(timetableSettings.endTime);
        const allBreaks = [...(timetableSettings.breaks || [])];
        
        (currentInstitution?.scheduleProfiles || []).forEach(p => {
            if (p.startTime) minStart = Math.min(minStart, timeToMinutes(p.startTime));
            if (p.endTime) maxEnd = Math.max(maxEnd, timeToMinutes(p.endTime));
            if (p.breaks) {
                p.breaks.forEach(pb => {
                    if (!allBreaks.find(b => b.startTime === pb.startTime && b.endTime === pb.endTime)) {
                        allBreaks.push(pb);
                    }
                });
            }
        });
        
        return {
            ...timetableSettings,
            startTime: minutesToTime(minStart),
            endTime: minutesToTime(maxEnd),
            breaks: allBreaks
        };
    }, [timetableSettings, currentInstitution]);
    
    const periodHeaders = useMemo(() => generatePeriodLabels(wideSettings, true), [wideSettings]);
    const cellSpanMinutes = wideSettings?.cellSpanMinutes || 60;

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleBulkEmail = async () => {
        const recipients: User[] = [];
        if (viewMode === 'lecturer_schedule') {
            if (selectedLecturerId && selectedLecturerId !== 'all') {
                const lecturer = getLecturerById(selectedLecturerId);
                if (lecturer) recipients.push(lecturer);
            } else {
                recipients.push(...filteredLecturers);
            }
        } else if (viewMode === 'master_course') {
            const courseId = selectedCourseForMasterView;
            if (courseId === 'all') {
                alert("Please select a specific course to email students.");
                return;
            }
            const students = allUsers.filter(u => u.role === 'student' && u.courseId === courseId);
            recipients.push(...students);
        }

        if (recipients.length === 0) {
            alert("No recipients found for the current selection.");
            return;
        }

        if (!confirm(`Are you sure you want to send automated timetable emails to ${recipients.length} ${viewMode === 'lecturer_schedule' ? 'lecturers' : 'students'}?`)) return;

        setIsBulkEmailing(true);
        setBulkEmailProgress({ current: 0, total: recipients.length });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];
            setBulkEmailProgress(prev => ({ ...prev, current: i + 1 }));

            if (!recipient.email) {
                failCount++;
                continue;
            }

            try {
                if (recipient.role === 'student') {
                    const studentCourse = courses.find(c => c.id === recipient.courseId);
                    const level = studentCourse?.levels?.find(l => l.id === recipient.courseLevelId);
                    if (!studentCourse || !level) continue;

                    const studentEntries = (generatedTimetable || []).filter(e => {
                        const subject = getSubjectById(e.subjectId);
                        return subject && (level.subjectIds || []).includes(e.subjectId);
                    });

                    const studentSettings = getEffectiveSettings(studentCourse.id);

                    const dataUri = await generateStudentTimetablePdf(
                        recipient,
                        studentEntries,
                        getSubjectById,
                        getLecturerById,
                        getRoomById,
                        letterheadConfig,
                        footerImageUrl,
                        studentCourse,
                        level,
                        studentSettings
                    );

                    const base64 = dataUri.split(',')[1];
                    const subject = `Your Timetable - ${studentCourse.code} ${level.name}`;
                    const message = `Dear ${recipient.name},\n\nPlease find attached your personalized timetable for ${activeSemester?.name || 'the current semester'}.\n\nBest Regards,\nRegistrar's Office`;

                    await apiService.sendEmail(recipient.email, subject, message, currentInstitution ? getInstitutionEmailConfig(currentInstitution) : undefined, undefined, [
                        { filename: `Timetable_${recipient.staffId || recipient.name}.pdf`, content: base64, encoding: 'base64' }
                    ]);
                } else {
                    const blob = await generateLecturerTimetablePdf(
                        generatedTimetable,
                        [recipient],
                        `Timetable - ${recipient.name}`,
                        activeSemester?.name || '',
                        letterheadConfig,
                        footerImageUrl,
                        logoUrl,
                        activeAcademicYear?.name || '',
                        activeSemester?.name || '',
                        timetableSettings,
                        getSubjectById,
                        getRoomById,
                        courses,
                        false
                    );

                    const base64 = await blobToBase64(blob);
                    const subject = `Timetable Update - ${recipient.name}`;
                    const message = `Dear ${recipient.name},\n\nPlease find attached your teaching schedule for ${activeSemester?.name || 'the current semester'}.\n\nBest Regards,\nAcademic Affairs`;

                    await apiService.sendEmail(recipient.email, subject, message, currentInstitution ? getInstitutionEmailConfig(currentInstitution) : undefined, undefined, [
                        { filename: `Timetable_${recipient.name}.pdf`, content: base64, encoding: 'base64' }
                    ]);
                }
                successCount++;
            } catch (err) {
                console.error(`Failed to send email to ${recipient.email}:`, err);
                failCount++;
            }
        }

        setIsBulkEmailing(false);
        alert(`Bulk emailing complete!\nSuccess: ${successCount}\nFailed: ${failCount}`);
        onLogAction?.(`Completed bulk email of timetables. Success: ${successCount}, Failed: ${failCount}`);
    };

    const handleDownloadPdf = async () => {
        if (!generatedTimetable || generatedTimetable.length === 0) return;
        setIsGeneratingPdf(true);
        try {
            let blob: Blob;

            if (viewMode === 'lecturer_schedule') {
                const targetLecturers = selectedLecturerId === 'all'
                    ? filteredLecturers
                    : filteredLecturers.filter(l => l.id === selectedLecturerId);

                blob = await generateLecturerTimetablePdf(
                    generatedTimetable,
                    targetLecturers,
                    viewModeTitles['lecturer_schedule'],
                    "",
                    letterheadConfig,
                    footerImageUrl,
                    logoUrl,
                    activeAcademicYear?.name || 'Academic Period',
                    activeSemester?.name || '',
                    timetableSettings,
                    getSubjectById,
                    getRoomById,
                    courses || [],
                    false
                );
            } else {
                const isSingleCourse = selectedCourseForMasterView !== 'all';
                const isSingleLevel = isSingleCourse && selectedLevelIdForMasterView !== 'all';
                const effectiveSettings = getEffectiveSettings(isSingleCourse ? selectedCourseForMasterView : undefined);
                
                let coursesToInclude = isSingleCourse
                    ? (courses || []).filter(c => c && c.id === selectedCourseForMasterView)
                    : (courses || []);

                // If a single level is selected, we need to handle it during filtering
                // The generator currently doesn't filter by levelId but the pdfService does if we pass the right data.
                // We'll pass a level-specific subset of course.levels if isSingleLevel
                if (isSingleLevel && coursesToInclude.length > 0) {
                    coursesToInclude = coursesToInclude.map(c => ({
                        ...c,
                        levels: (c.levels || []).filter(l => l.id === selectedLevelIdForMasterView)
                    }));
                }

                const filteredEntriesForPdf = (generatedTimetable || []).filter(e => {
                    if (!e) return false;
                    const courseId = String(e.courseId || (e as any).course_id || '');
                    const targetCourseId = String(selectedCourseForMasterView);
                    const isCourseMatch = targetCourseId === 'all' || courseId === targetCourseId;
                    if (!isCourseMatch) return false;
                    
                    if (selectedLevelIdForMasterView !== 'all') {
                        const levelId = String(e.courseLevelId || (e as any).course_level_id || '');
                        const targetLevelId = String(selectedLevelIdForMasterView);
                        return levelId === targetLevelId;
                    }
                    return true;
                });

                blob = await generateMasterCourseTimetablePdf(
                    filteredEntriesForPdf,
                    coursesToInclude,
                    viewModeTitles['master_course'],
                    "",
                    letterheadConfig,
                    footerImageUrl,
                    logoUrl,
                    activeAcademicYear?.name || 'Academic Period',
                    activeSemester?.name || '',
                    effectiveSettings,
                    getSubjectById,
                    getLecturerById,
                    getRoomById,
                    false,
                    layoutMode
                );
            }

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
                wideSettings,
                selectedDay,
                getSubjectById,
                getLecturerById,
                getCourseById,
                courses || [],
                false
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
                    {(viewMode === 'grid' || viewMode === 'master_staff' || (viewMode === 'master_course' && layoutMode === 'horizontal')) && (
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
                        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 h-11 items-center gap-1">
                            <button
                                onClick={() => setLayoutMode('horizontal')}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${layoutMode === 'horizontal' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                <ArrowsRightLeftIcon className="w-3.5 h-3.5" /> Grid
                            </button>
                            <button
                                onClick={() => setLayoutMode('vertical')}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${layoutMode === 'vertical' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                <RectangleStackIcon className="w-3.5 h-3.5" /> List
                            </button>
                        </div>
                    )}
                    {viewMode === 'lecturer_schedule' && (
                        <>
                            <select
                                value={selectedLecturerId}
                                onChange={e => setSelectedLecturerId(e.target.value)}
                                className="form-select text-[10px] font-black uppercase tracking-widest h-11 lg:w-48"
                            >
                                <option value="">Select individual...</option>
                                <option value="all">All {staffLabel}s</option>
                                {filteredLecturers.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                            {selectedLecturerId === 'all' && (
                                <button
                                    onClick={handleDownloadPdf}
                                    disabled={isGeneratingPdf}
                                    className="h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm border border-indigo-100 disabled:opacity-50"
                                >
                                    <EyeIcon className="w-4 h-4" /> {isGeneratingPdf ? 'Compiling...' : 'All PDF'}
                                </button>
                            )}
                            <button
                                onClick={handleBulkEmail}
                                disabled={isBulkEmailing}
                                className="h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center gap-2 shadow-sm border border-emerald-100 disabled:opacity-50"
                            >
                                <EnvelopeIcon className="w-4 h-4" /> {isBulkEmailing ? `Sending (${bulkEmailProgress.current}/${bulkEmailProgress.total})` : selectedLecturerId === 'all' ? `Email All ${staffLabel}s` : `Email ${staffLabel}`}
                            </button>
                        </>
                    )}
                    {viewMode === 'master_course' && (
                        <>
                            <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 h-11 items-center gap-1">
                                <button
                                    onClick={() => setLayoutMode('horizontal')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${layoutMode === 'horizontal' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    <ArrowsRightLeftIcon className="w-3.5 h-3.5" /> Grid
                                </button>
                                <button
                                    onClick={() => setLayoutMode('vertical')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${layoutMode === 'vertical' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    <RectangleStackIcon className="w-3.5 h-3.5" /> List
                                </button>
                            </div>
                            <select
                                value={selectedCourseForMasterView}
                                onChange={e => {
                                    setSelectedCourseForMasterView(e.target.value);
                                    setSelectedLevelIdForMasterView('all');
                                }}
                                className="form-select text-[10px] font-black uppercase tracking-widest h-11 lg:min-w-40"
                            >
                                <option value="all">All {isSchool ? 'Grades' : 'Courses'}</option>
                                {(courses || []).map(c => c && <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            {selectedCourseForMasterView !== 'all' && (
                                <select
                                    value={selectedLevelIdForMasterView}
                                    onChange={e => setSelectedLevelIdForMasterView(e.target.value)}
                                    className="form-select text-[10px] font-black uppercase tracking-widest h-11 lg:min-w-40 bg-indigo-50/50"
                                >
                                    <option value="all">All {isSchool ? 'Streams' : 'Levels'}</option>
                                    {(() => {
                                        const course = (courses || []).find(c => c && c.id === selectedCourseForMasterView);
                                        return (course?.levels || []).map(l => l && <option key={l.id} value={l.id}>{l.name}</option>);
                                    })()}
                                </select>
                            )}
                            <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm border border-indigo-100 disabled:opacity-50">
                                <EyeIcon className="w-4 h-4" /> {isGeneratingPdf ? 'Compiling...' : 'PDF Preview'}
                            </button>
                            {selectedCourseForMasterView !== 'all' && (
                                <button
                                    onClick={handleBulkEmail}
                                    disabled={isBulkEmailing}
                                    className="h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center gap-2 shadow-sm border border-emerald-100 disabled:opacity-50"
                                >
                                    <EnvelopeIcon className="w-4 h-4" /> {isBulkEmailing ? `Sending (${bulkEmailProgress.current}/${bulkEmailProgress.total})` : 'Email Students'}
                                </button>
                            )}
                        </>
                    )}
                    <button onClick={() => window.print()} className="h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:opacity-90 transition-all flex items-center gap-2 shadow-lg">
                        <PrinterIcon className="w-4 h-4" /> Print View
                    </button>
                </div>
            </div>

            <div className="printable-area">
                {viewMode === 'master_course' ? (
                    (() => {
                        const isSingleCourse = selectedCourseForMasterView !== 'all';
                        const effectiveSettings = getEffectiveSettings(isSingleCourse ? selectedCourseForMasterView : undefined);
                        const filteredEntries = (generatedTimetable || []).filter(e => {
                            if (!e) return false;
                            const courseId = String(e.courseId || (e as any).course_id || '');
                            const targetCourseId = String(selectedCourseForMasterView);
                            const isCourseMatch = targetCourseId === 'all' || courseId === targetCourseId;
                            if (!isCourseMatch) return false;
                            
                            if (selectedLevelIdForMasterView !== 'all') {
                                const levelId = String(e.courseLevelId || (e as any).course_level_id || '');
                                const targetLevelId = String(selectedLevelIdForMasterView);
                                return levelId === targetLevelId;
                            }
                            return true;
                        });

                        return (
                            <MasterCourseTimetableGrid
                                courses={courses || []}
                                subjects={subjects || []}
                                lecturers={lecturers || []}
                                rooms={rooms || []}
                                entries={filteredEntries}
                                getSubjectById={getSubjectById}
                                getLecturerById={getLecturerById}
                                getRoomById={getRoomById}
                                timetableSettings={effectiveSettings}
                                selectedCourseId={selectedCourseForMasterView}
                                selectedLevelId={selectedLevelIdForMasterView}
                                academicYears={academicYears || []}
                                activeSemester={activeSemester || null}
                                isSchool={isSchool}
                                currentInstitution={currentInstitution}
                                timetableConflicts={timetableConflicts}
                                layoutMode={layoutMode}
                                onLayoutModeChange={setLayoutMode}
                                selectedDay={selectedDay}
                            />
                        );
                    })()
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
                            {viewMode === 'lecturer_schedule' && layoutMode === 'vertical' ? (
                                <LecturerTimetableList
                                    entries={filteredEntries || []}
                                    getSubjectById={getSubjectById}
                                    getLecturerById={getLecturerById}
                                    getRoomById={getRoomById}
                                    courses={courses || []}
                                    timetableSettings={wideSettings}
                                />
                            ) : (
                                <TimetableGrid
                                    entries={filteredEntries || []}
                                    subjects={subjects || []}
                                    courses={courses || []}
                                    rooms={rooms || []}
                                    getSubjectById={getSubjectById}
                                    getLecturerById={getLecturerById}
                                    getRoomById={getRoomById}
                                    timetableSettings={wideSettings}
                                    onMoveLesson={onMoveTimetableEntry}
                                    isEditable={!!onMoveTimetableEntry}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {previewPdfUrl && <PdfPreviewModal url={previewPdfUrl} onClose={() => setPreviewPdfUrl(null)} />}
        </div>
    );
};
