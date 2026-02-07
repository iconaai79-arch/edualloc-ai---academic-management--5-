
import React, { useState, useMemo, useEffect } from 'react';
import type { User, Subject, Department, AllocationRequest, RequestStatus, LessonStructure, TimetableEntry, Room, LetterheadConfig, Conflict, Course, StudentAttendance, Assessment, AssessmentMark, Institution, LecturerContract, ExamTimetableEntry, Building, TimetableSettings, Semester, AcademicYear, Visitor } from '../types';
import { AdvisoryReportView } from './AdvisoryReportView.tsx';
import { ConflictReport } from './ConflictReport.tsx';
import { AttendanceReports } from './AttendanceReports.tsx';
import { AssessmentReports } from './AssessmentReports.tsx';
import { ExamTimetableGrid } from './ExamTimetableGrid.tsx';
import { generateExamTimetablePdf, generateWorkloadStatisticsPdf } from '../services/pdfService.ts';
import { PrinterIcon, DocumentArrowDownIcon, ChartBarIcon, BuildingOfficeIcon, ExclamationTriangleIcon, ClipboardListIcon, AcademicCapIcon, CalendarDaysIcon, ChartPieIcon } from './icons/index.ts';
import { RoomUtilizationReport } from './RoomUtilizationReport.tsx';
import { TimetablesView } from './TimetablesView.tsx';
import { VisualReports } from './VisualReports.tsx';

interface ReportsDashboardProps {
    lecturers: User[];
    subjects: Subject[];
    departments: Department[];
    requests: AllocationRequest[];
    allocations: AllocationRequest[];
    allTimetableEntries: TimetableEntry[];
    examTimetable: ExamTimetableEntry[];
    rooms: Room[];
    buildings: Building[];
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    timetableConflicts: Conflict[];
    getLecturerById?: (id: string) => User | undefined;
    getRoomById?: (id: string) => Room | undefined;
    getSubjectById?: (id: string) => Subject | undefined;
    currentUser: User;
    courses: Course[];
    studentAttendances: StudentAttendance[];
    studentCheckIns: Record<string, string>;
    assessments: Assessment[];
    assessmentMarks: AssessmentMark[];
    currentInstitution?: Institution | null;
    contracts: LecturerContract[];
    timetableSettings: TimetableSettings;
    academicYears: AcademicYear[];
    activeSemester: Semester | null;
    visitors: Visitor[];
}

const ProgressBar: React.FC<{ value: number; max: number }> = ({ value, max }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
            <div
                className="bg-indigo-600 h-2.5 rounded-full"
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};

const ExamTimetableReport: React.FC<{
    examTimetable: ExamTimetableEntry[];
    subjects: Subject[];
    departments: Department[];
    currentUser: User;
    getSubjectById?: (id: string) => Subject | undefined;
    getLecturerById?: (id: string) => User | undefined;
    getRoomById?: (id: string) => Room | undefined;
    buildings: Building[];
    courses: Course[];
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    currentInstitution?: Institution | null;
}> = ({
    examTimetable = [],
    subjects = [],
    departments = [],
    currentUser,
    getSubjectById,
    getLecturerById,
    getRoomById,
    buildings = [],
    courses = [],
    letterheadConfig,
    logoUrl,
    footerImageUrl,
    currentInstitution
}) => {
        const [departmentFilter, setDepartmentFilter] = useState(
            currentUser?.role === 'hod' ? currentUser.departmentId || 'all' : 'all'
        );
        const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

        const safeExams = useMemo(() => Array.isArray(examTimetable) ? examTimetable.filter(e => e) : [], [examTimetable]);
        const safeSubjects = useMemo(() => Array.isArray(subjects) ? subjects.filter(s => s) : [], [subjects]);

        const filteredEntries = useMemo(() => {
            if (departmentFilter === 'all') {
                return safeExams;
            }
            const subjectIdsInDept = new Set(
                safeSubjects.filter(s => s && s.departmentId === departmentFilter).map(s => s.id)
            );
            return safeExams.filter(e => e && subjectIdsInDept.has(e.subjectId));
        }, [safeExams, departmentFilter, safeSubjects]);

        const title = useMemo(() => {
            if (departmentFilter === 'all') {
                return 'Exam Timetable (All Departments)';
            }
            const dept = (departments || []).find(d => d && d.id === departmentFilter);
            return `Exam Timetable for ${dept?.name || 'Unknown Department'}`;
        }, [departmentFilter, departments]);

        const handleDownloadPdf = async () => {
            setIsGeneratingPdf(true);
            try {
                const pdfUrl = await generateExamTimetablePdf(
                    filteredEntries,
                    getSubjectById || (id => undefined),
                    getLecturerById || (id => undefined),
                    getRoomById || (id => undefined),
                    buildings || [],
                    courses || [],
                    title,
                    letterheadConfig,
                    footerImageUrl,
                    logoUrl
                );
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.download = `Exam_Timetable.pdf`;
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

        const handlePrint = () => {
            window.print();
        };

        return (
            <div className="space-y-6">
                <style>{`
                .form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; display: block; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .dark .btn-secondary { background-color: #4b5563; color: #e5e7eb; }
            `}</style>
                <div className="flex flex-wrap gap-4 justify-between items-center no-print">
                    <div className="flex items-center gap-4">
                        <label htmlFor="dept-filter-report" className="text-sm font-medium">Filter by Department:</label>
                        <select
                            id="dept-filter-report"
                            value={departmentFilter}
                            onChange={e => setDepartmentFilter(e.target.value)}
                            disabled={currentUser?.role === 'hod'}
                            className="form-select"
                        >
                            <option value="all">All Departments</option>
                            {(departments || []).map(d => d && <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint} disabled={isGeneratingPdf} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
                            <PrinterIcon className="w-5 h-5" /> {isGeneratingPdf ? 'Preparing...' : 'Print'}
                        </button>
                        <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
                            <DocumentArrowDownIcon className="w-5 h-5" /> {isGeneratingPdf ? 'Generating...' : 'PDF'}
                        </button>
                    </div>
                </div>
                <ExamTimetableGrid
                    entries={filteredEntries}
                    getSubjectById={getSubjectById || (id => undefined)}
                    getLecturerById={getLecturerById || (id => undefined)}
                    getRoomById={getRoomById || (id => undefined)}
                    buildings={buildings || []}
                    courses={courses || []}
                    title={title}
                    currentInstitution={currentInstitution}
                />
            </div>
        );
    };

export const ReportsDashboard: React.FC<ReportsDashboardProps> = (props) => {
    const {
        lecturers = [], subjects = [], departments = [], requests = [], allocations = [],
        allTimetableEntries = [], examTimetable = [], rooms = [], letterheadConfig, logoUrl, footerImageUrl,
        timetableConflicts = [], getLecturerById, getRoomById, getSubjectById,
        currentUser, courses = [], studentAttendances = [], studentCheckIns = {},
        assessments = [], assessmentMarks = [],
        currentInstitution,
        contracts = [],
        buildings = [],
        timetableSettings,
        activeSemester,
        academicYears = [],
        visitors = []
    } = props;

    const [subTab, setSubTab] = useState('visuals');
    const [departmentFilter, setDepartmentFilter] = useState<string>('all');
    const [isWorkloadPdfGenerating, setIsWorkloadPdfGenerating] = useState(false);

    const calculateTotalPeriods = (structure: LessonStructure[] | undefined): number => {
        if (!structure || !Array.isArray(structure)) return 0;
        return structure.reduce((sum, s) => sum + (s.periods || 0) * (s.count || 0), 0);
    };

    const filteredSubjects = useMemo(() => {
        const list = Array.isArray(subjects) ? subjects.filter(s => s) : [];
        if (departmentFilter === 'all') return list;
        return list.filter(s => s && s.departmentId === departmentFilter);
    }, [subjects, departmentFilter]);

    const filteredLecturers = useMemo(() => {
        const list = Array.isArray(lecturers) ? lecturers.filter(l => l) : [];
        if (departmentFilter === 'all') return list.filter(l => l && l.role !== 'admin');
        return list.filter(l => l && l.role !== 'admin' && l.departmentId === departmentFilter);
    }, [lecturers, departmentFilter]);

    const filteredDepartments = useMemo(() => {
        const list = Array.isArray(departments) ? departments.filter(d => d) : [];
        if (departmentFilter === 'all') return list;
        return list.filter(d => d && d.id === departmentFilter);
    }, [departments, departmentFilter]);


    const allocatedSubjectIds = useMemo(() => new Set(Array.isArray(allocations) ? allocations.map(a => a?.subjectId).filter(Boolean) : []), [allocations]);
    const totalSubjectsCount = filteredSubjects.length;
    const allocatedSubjectsCount = filteredSubjects.filter(s => s && allocatedSubjectIds.has(s.id)).length;

    const filteredRequests = useMemo(() => {
        const reqList = Array.isArray(requests) ? requests.filter(r => r) : [];
        if (departmentFilter === 'all') return reqList;
        const subjectIdsInDept = new Set(filteredSubjects.map(s => s.id));
        return reqList.filter(r => r && subjectIdsInDept.has(r.subjectId));
    }, [requests, filteredSubjects, departmentFilter]);

    const requestStatusCounts = useMemo(() => {
        return filteredRequests.reduce((acc, req) => {
            if (req?.status) acc[req.status] = (acc[req.status] || 0) + 1;
            return acc;
        }, {} as Record<RequestStatus, number>);
    }, [filteredRequests]);

    const totalRequestsCount = filteredRequests.length;

    const contractStats = useMemo(() => {
        const list = Array.isArray(contracts) ? contracts.filter(c => c) : [];
        const pending = list.filter(c => c && c.status === 'pending').length;
        const accepted = list.filter(c => c && c.status === 'accepted').length;
        const rejected = list.filter(c => c && c.status === 'rejected').length;
        return { pending, accepted, rejected };
    }, [contracts]);

    const departmentWorkload = useMemo(() => {
        return filteredDepartments.map(dept => {
            if (!dept) return { id: '', name: '', totalPeriods: 0, allocatedPeriods: 0 };
            const departmentSubjects = (Array.isArray(subjects) ? subjects : []).filter(s => s && s.departmentId === dept.id);
            const allocatedDeptSubjects = (Array.isArray(allocations) ? allocations : []).filter(a =>
                a && departmentSubjects.some(s => s && s.id === a.subjectId)
            );

            const totalPeriods = departmentSubjects.reduce((sum, s) => sum + calculateTotalPeriods(s?.lessonStructure), 0);
            const allocatedPeriods = allocatedDeptSubjects.reduce((sum, a) => {
                const subject = (Array.isArray(subjects) ? subjects : []).find(s => s && s.id === a.subjectId);
                return sum + (subject ? calculateTotalPeriods(subject.lessonStructure) : 0);
            }, 0);

            return {
                id: dept.id,
                name: dept.name,
                totalPeriods,
                allocatedPeriods
            };
        });
    }, [filteredDepartments, subjects, allocations]);

    const lecturerWorkload = useMemo(() => {
        return filteredLecturers
            .map(lecturer => {
                if (!lecturer) return null;
                const lecturerAllocations = (Array.isArray(allocations) ? allocations : []).filter(a => a && a.lecturerId === lecturer.id);
                const allocatedPeriods = lecturerAllocations.reduce((sum, a) => {
                    const subject = (Array.isArray(subjects) ? subjects : []).find(s => s && s.id === a.subjectId);
                    return sum + (subject ? calculateTotalPeriods(subject.lessonStructure) : 0);
                }, 0);
                const subjectNames = lecturerAllocations
                    .map(a => (Array.isArray(subjects) ? subjects : []).find(s => s && s.id === a.subjectId)?.name)
                    .filter(Boolean)
                    .join(', ');
                const totalHours = (allocatedPeriods * (timetableSettings?.periodLengthMinutes || 60)) / 60;
                return {
                    id: lecturer.id,
                    name: lecturer.name,
                    subjectCount: lecturerAllocations.length,
                    totalPeriods: allocatedPeriods,
                    totalHours: totalHours,
                    subjectNames: subjectNames,
                };
            })
            .filter((l): l is NonNullable<typeof l> => l !== null)
            .sort((a, b) => b.totalPeriods - a.totalPeriods);
    }, [filteredLecturers, allocations, subjects, timetableSettings]);

    const subjectAllocationStatus = useMemo(() => {
        return filteredSubjects.map(subject => {
            const isAllocated = allocatedSubjectIds.has(subject.id);
            const department = (Array.isArray(departments) ? departments : []).find(d => d && d.id === subject.departmentId)?.name || 'N/A';
            const requiredPeriods = calculateTotalPeriods(subject.lessonStructure);
            const allocatedPeriods = isAllocated ? requiredPeriods : 0;
            return {
                id: subject.id,
                name: subject.name,
                code: subject.code,
                departmentName: department,
                requiredPeriods: requiredPeriods,
                allocatedPeriods: allocatedPeriods,
            };
        }).sort((a, b) => (a.code || "").localeCompare(b.code || ""));
    }, [filteredSubjects, allocatedSubjectIds, departments]);

    const handlePrintStats = () => {
        window.print();
    };

    const handleDownloadWorkloadPdf = async () => {
        setIsWorkloadPdfGenerating(true);
        try {
            const summaryStats = [
                { label: 'Total Subjects', value: totalSubjectsCount },
                { label: 'Allocated Subjects', value: allocatedSubjectsCount },
                { label: 'Total Requests', value: totalRequestsCount },
                { label: 'Total Staff', value: filteredLecturers.length },
            ];

            const pdfUrl = await generateWorkloadStatisticsPdf(
                summaryStats,
                departmentWorkload,
                lecturerWorkload,
                subjectAllocationStatus,
                `Workload & Statistics Report${departmentFilter !== 'all' ? ` - ${(Array.isArray(departments) ? departments : []).find(d => d && d.id === departmentFilter)?.name}` : ''}`,
                letterheadConfig,
                footerImageUrl,
                logoUrl
            );
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `Workload_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("PDF Generation Error", error);
            alert("Failed to generate PDF");
        } finally {
            setIsWorkloadPdfGenerating(false);
        }
    };

    const subTabs = [
        { key: 'visuals', label: 'Graphs & Visuals', icon: <ChartPieIcon className="w-5 h-5 mr-3" /> },
        { key: 'stats', label: 'Workload & Statistics', icon: <ChartBarIcon className="w-5 h-5 mr-3" /> },
        { key: 'utilization', label: 'Room Utilization', icon: <BuildingOfficeIcon className="w-5 h-5 mr-3" /> },
        { key: 'advisory', label: 'Room Advisory Report', icon: <ExclamationTriangleIcon className="w-5 h-5 mr-3" /> },
        { key: 'conflicts', label: 'Conflict Report', icon: <ExclamationTriangleIcon className="w-5 h-5 mr-3" /> },
        { key: 'attendance', label: 'Attendance Reports', icon: <ClipboardListIcon className="w-5 h-5 mr-3" /> },
        { key: 'assessments', label: 'Assessment Reports', icon: <AcademicCapIcon className="w-5 h-5 mr-3" /> },
        { key: 'exam_timetable', label: 'Exam Timetable', icon: <CalendarDaysIcon className="w-5 h-5 mr-3" /> },
        { key: 'generated_timetable', label: 'Generated Timetable', icon: <CalendarDaysIcon className="w-5 h-5 mr-3" /> },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight no-print">Institutional Reports</h2>

            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-64 flex-shrink-0 no-print text-slate-900 dark:text-slate-100">
                    <nav className="flex flex-col space-y-1" aria-label="Report Tabs">
                        {subTabs.map(tabInfo => (
                            <button
                                key={tabInfo.key}
                                onClick={() => setSubTab(tabInfo.key)}
                                className={`${subTab === tabInfo.key ? 'bg-slate-100 dark:bg-slate-700 text-[var(--color-primary)]' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'} group flex items-center px-3 py-2 text-sm font-medium rounded-md w-full text-left transition-colors`}
                            >
                                {tabInfo.icon}
                                {tabInfo.label}
                            </button>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 min-w-0">
                    {subTab === 'visuals' && (
                        <VisualReports
                            lecturers={lecturers || []}
                            subjects={subjects || []}
                            departments={departments || []}
                            requests={requests || []}
                            allocations={allocations || []}
                            generatedTimetable={allTimetableEntries || []}
                            courses={courses || []}
                            rooms={rooms || []}
                            visitors={visitors || []}
                        />
                    )}
                    {subTab === 'stats' && (
                        <div className="space-y-8 printable-area text-slate-900 dark:text-slate-100">
                            <div className="flex flex-wrap gap-4 justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm no-print">
                                <div className="w-full sm:w-64">
                                    <label htmlFor="dept-filter-stats" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Filter by Department
                                    </label>
                                    <select
                                        id="dept-filter-stats"
                                        value={departmentFilter}
                                        onChange={e => setDepartmentFilter(e.target.value)}
                                        className="mt-1 form-select w-full"
                                    >
                                        <option value="all">All Departments</option>
                                        {(Array.isArray(departments) ? departments : []).map(d => d && <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handlePrintStats} className="btn-secondary inline-flex items-center gap-2">
                                        <PrinterIcon className="w-5 h-5" /> Print
                                    </button>
                                    <button onClick={handleDownloadWorkloadPdf} disabled={isWorkloadPdfGenerating} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                                        <DocumentArrowDownIcon className="w-5 h-5" /> {isWorkloadPdfGenerating ? 'Generating...' : 'Download PDF'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Subjects</h3>
                                    <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">{totalSubjectsCount}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Allocated Subjects</h3>
                                    <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">{allocatedSubjectsCount}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Requests</h3>
                                    <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">{totalRequestsCount}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Staff</h3>
                                    <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">{filteredLecturers.length}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                    <h3 className="text-xl font-semibold mb-4">Department Workload</h3>
                                    <div className="space-y-4">
                                        {departmentWorkload.map(dept => (
                                            <div key={dept.id}>
                                                <div className="flex justify-between text-sm font-medium mb-1">
                                                    <span className="text-slate-700 dark:text-slate-200">{dept.name}</span>
                                                    <span className="text-slate-500 dark:text-slate-400">{dept.allocatedPeriods} / {dept.totalPeriods} periods</span>
                                                </div>
                                                <ProgressBar value={dept.allocatedPeriods} max={dept.totalPeriods} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                    <h3 className="text-xl font-semibold mb-4">Request Lifecycle</h3>
                                    <dl>
                                        <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                            <dt className="text-sm text-slate-500 dark:text-slate-400">Approved</dt>
                                            <dd className="text-sm font-medium text-green-600 dark:text-green-400">{requestStatusCounts.approved || 0}</dd>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                            <dt className="text-sm text-slate-500 dark:text-slate-400">Pending Dept. Review</dt>
                                            <dd className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{requestStatusCounts.pending || 0}</dd>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                            <dt className="text-sm text-slate-500 dark:text-slate-400">Pending Final Registry</dt>
                                            <dd className="text-sm font-medium text-sky-600 dark:text-sky-400">{requestStatusCounts.hod_approved || 0}</dd>
                                        </div>
                                        <div className="flex justify-between py-2">
                                            <dt className="text-sm text-slate-500 dark:text-slate-400">Disapproved</dt>
                                            <dd className="text-sm font-medium text-red-600 dark:text-red-400">{requestStatusCounts.disapproved || 0}</dd>
                                        </div>
                                    </dl>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                    <h3 className="text-xl font-semibold mb-4">Workload Agreements</h3>
                                    <dl>
                                        <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                            <dt className="text-sm text-slate-500 dark:text-slate-400">Accepted</dt>
                                            <dd className="text-sm font-medium text-green-600 dark:text-green-400">{contractStats.accepted}</dd>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                            <dt className="text-sm text-slate-500 dark:text-slate-400">Pending</dt>
                                            <dd className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{contractStats.pending}</dd>
                                        </div>
                                        <div className="flex justify-between py-2">
                                            <dt className="text-sm text-slate-500 dark:text-slate-400">Rejected</dt>
                                            <dd className="text-sm font-medium text-red-600 dark:text-red-400">{contractStats.rejected}</dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
                                <h3 className="text-xl font-semibold p-6">Faculty Workload Summary</h3>
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-50 dark:bg-slate-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Faculty Member</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Allocated Units</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Count</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Total Periods</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Hrs/Week</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                        {lecturerWorkload.map(lec => (
                                            <tr key={lec.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{lec.name}</td>
                                                <td className="px-6 py-4 max-w-sm whitespace-normal text-sm text-slate-500 dark:text-slate-400">{lec.subjectNames}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{lec.subjectCount}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{lec.totalPeriods}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{lec.totalHours.toFixed(1)}</td>
                                            </tr>
                                        ))}
                                        {lecturerWorkload.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">No workload data recorded.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {subTab === 'utilization' && (
                        <RoomUtilizationReport
                            buildings={buildings || []}
                            rooms={rooms || []}
                            generatedTimetable={allTimetableEntries || []}
                            timetableSettings={timetableSettings}
                            letterheadConfig={letterheadConfig}
                            logoUrl={logoUrl}
                            footerImageUrl={footerImageUrl}
                        />
                    )}
                    {subTab === 'advisory' && (
                        <AdvisoryReportView
                            generatedTimetable={allTimetableEntries || []}
                            rooms={rooms || []}
                            letterheadConfig={letterheadConfig}
                            logoUrl={logoUrl}
                            footerImageUrl={footerImageUrl}
                        />
                    )}
                    {subTab === 'conflicts' && (
                        <ConflictReport
                            conflicts={timetableConflicts || []}
                            getLecturerById={getLecturerById || (id => undefined)}
                            getRoomById={getRoomById || (id => undefined)}
                            getSubjectById={getSubjectById || (id => undefined)}
                        />
                    )}
                    {subTab === 'attendance' && (
                        <AttendanceReports
                            currentUser={currentUser}
                            users={lecturers || []}
                            subjects={subjects || []}
                            departments={departments || []}
                            courses={courses || []}
                            generatedTimetable={allTimetableEntries || []}
                            studentAttendances={studentAttendances || []}
                            studentCheckIns={studentCheckIns || {}}
                            letterheadConfig={letterheadConfig}
                            logoUrl={logoUrl}
                            footerImageUrl={footerImageUrl}
                            currentInstitution={currentInstitution}
                        />
                    )}
                    {subTab === 'assessments' && (
                        <AssessmentReports
                            currentUser={currentUser}
                            assessments={assessments || []}
                            assessmentMarks={assessmentMarks || []}
                            users={lecturers || []}
                            subjects={subjects || []}
                            courses={courses || []}
                            departments={departments || []}
                            letterheadConfig={letterheadConfig}
                            logoUrl={logoUrl}
                            footerImageUrl={footerImageUrl}
                        />
                    )}
                    {subTab === 'exam_timetable' && (
                        <ExamTimetableReport
                            examTimetable={examTimetable || []}
                            subjects={subjects || []}
                            departments={departments || []}
                            currentUser={currentUser}
                            getSubjectById={getSubjectById || (id => undefined)}
                            getLecturerById={getLecturerById || (id => undefined)}
                            getRoomById={getRoomById || (id => undefined)}
                            buildings={buildings || []}
                            courses={courses || []}
                            letterheadConfig={letterheadConfig}
                            logoUrl={logoUrl}
                            footerImageUrl={footerImageUrl}
                            currentInstitution={currentInstitution}
                        />
                    )}
                    {subTab === 'generated_timetable' && (
                        <TimetablesView
                            generatedTimetable={allTimetableEntries || []}
                            subjects={subjects || []}
                            lecturers={lecturers || []}
                            departments={departments || []}
                            courses={courses || []}
                            buildings={buildings || []}
                            rooms={rooms || []}
                            allocations={allocations || []}
                            getSubjectById={getSubjectById || (id => undefined)}
                            getLecturerById={getLecturerById || (id => undefined)}
                            getRoomById={getRoomById || (id => undefined)}
                            letterheadConfig={letterheadConfig}
                            logoUrl={logoUrl}
                            footerImageUrl={footerImageUrl}
                            currentUser={currentUser}
                            timetableSettings={timetableSettings}
                            onSaveTimetableSettings={() => { }}
                            academicYears={academicYears || []}
                            activeSemester={activeSemester}
                            currentInstitution={currentInstitution}
                        />
                    )}
                </main>
            </div>
        </div>
    );
};
