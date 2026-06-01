
import React, { useState, useMemo, useEffect } from 'react';
import type { User, Subject, Department, AllocationRequest, RequestStatus, LessonStructure, TimetableEntry, Room, LetterheadConfig, Conflict, Course, StudentAttendance, Assessment, AssessmentMark, Institution, LecturerContract, ExamTimetableEntry, Building, TimetableSettings, Semester, AcademicYear, Visitor, ActivityLog, CarInvoice, CarPayment, CompanyDetails, InventoryItem, StockTransaction } from '../types';
import { RETAIL_SUBTYPES } from '../constants';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { AdvisoryReportView } from './AdvisoryReportView';
import { ConflictReport } from './ConflictReport';
import { AttendanceReports } from './AttendanceReports';
import { AssessmentReports } from './AssessmentReports';
import { ExamTimetableGrid } from './ExamTimetableGrid';
import { generateExamTimetablePdf, generateWorkloadStatisticsPdf, generateCarClientStatementPdfDataUri } from '../services/pdfService';
import { PrinterIcon } from './icons/PrinterIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { RoomUtilizationReport } from './RoomUtilizationReport';
import { TimetablesView } from './TimetablesView';
import { VisualReports } from './VisualReports';
import { CourseProgressReport } from './CourseProgressReport';
import { EnrollmentCapacityReport } from './EnrollmentCapacityReport';
import { ActivityLogView } from './ActivityLogView';
import { RoomDistanceReport } from './RoomDistanceReport';
import { PdfPreviewModal } from './PdfPreviewModal';
import { EyeIcon } from './icons/EyeIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { AttendanceAnalytics } from './AttendanceAnalytics';
import { isEduInstitution } from '../utils/roleUtils';
import { timeToMinutes, minutesToTime } from '../utils/timeUtils';

const UserManager = React.lazy(() => import('./UserManager').then(m => ({ default: m.UserManager })));

interface ReportsDashboardProps {
    activeScope?: string;
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
    logoUrl?: string | null;
    footerImageUrl?: string | null;
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
    activityLog: ActivityLog[];
    courseSizes: Map<string, number>;
    activityLogLimit?: number;
    setActivityLogLimit?: React.Dispatch<React.SetStateAction<number>>;
    carInvoices?: CarInvoice[];
    carPayments?: CarPayment[];
    onAddUser?: (data: any) => Promise<void>;
    onEditUser?: (id: string, data: any) => Promise<void>;
    onDeleteUser?: (id: string) => Promise<void>;
    onImportUsers?: (users: any[]) => Promise<void>;
    onSendSms?: (data: any) => Promise<any>;
    companyDetails?: CompanyDetails;
    onAddTransaction?: (data: any, items: any[]) => Promise<any>;
    onRefreshData?: () => void;
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
    onPreviewPdf?: (url: string, filename: string) => void;
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
    currentInstitution,
    onPreviewPdf
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

        const handlePreviewPdf = async () => {
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
                onPreviewPdf?.(pdfUrl, `Exam_Timetable_${departmentFilter}.pdf`);
            } catch (error) {
                console.error("Failed to generate PDF for preview:", error);
                alert("Could not generate the PDF preview.");
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
                        <button onClick={handlePreviewPdf} disabled={isGeneratingPdf} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
                            <EyeIcon className="w-5 h-5" /> {isGeneratingPdf ? 'Preparing...' : 'Preview'}
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

const ClientStatementReport: React.FC<{
    carInvoices: CarInvoice[];
    carPayments: CarPayment[];
    currentInstitution: Institution;
    onPreviewPdf: (url: string, filename: string) => void;
}> = ({ carInvoices, carPayments, currentInstitution, onPreviewPdf }) => {
    const [selectedClient, setSelectedClient] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const clients = useMemo(() => {
        const uniqueClients = new Set((carInvoices || []).map(inv => inv.clientName));
        return Array.from(uniqueClients).sort();
    }, [carInvoices]);

    const handleGenerate = async () => {
        if (!selectedClient) return;
        setIsGenerating(true);
        try {
            const clientInvoices = carInvoices.filter(inv => inv.clientName === selectedClient);
            const clientPayments = (carPayments || []).filter(pay => {
                const inv = carInvoices.find(i => i.id === pay.invoiceId);
                return inv && inv.clientName === selectedClient;
            });

            const companyDetails = {
                name: currentInstitution.name,
                email: currentInstitution.email,
                phone: currentInstitution.phoneNumber,
                address: (currentInstitution as any).location?.address || '',
                website: (currentInstitution as any).website || ''
            };

            const uri = await generateCarClientStatementPdfDataUri(
                selectedClient,
                clientInvoices,
                clientPayments,
                currentInstitution,
                companyDetails as any,
                currentInstitution.logoUrl || null
            );
            onPreviewPdf(uri, `Statement_${selectedClient.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error("Failed to generate statement:", error);
            alert("Failed to generate statement.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-fade-in">
            <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Client Statement Generator</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Generate comprehensive account statements for specific clients</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Client</label>
                    <select
                        value={selectedClient}
                        onChange={(e) => setSelectedClient(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    >
                        <option value="">Choose a client...</option>
                        {clients.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={!selectedClient || isGenerating}
                    className="px-12 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                    {isGenerating ? 'Generating...' : 'Preview Statement'}
                </button>
            </div>
        </div>
    );
};

import { apiService } from '../services/apiService';

export const ReportsDashboard: React.FC<ReportsDashboardProps> = (props) => {
    const {
        activeScope,
        lecturers = [], subjects = [], departments = [], requests = [], allocations = [],
        allTimetableEntries = [], examTimetable = [], rooms = [], letterheadConfig, logoUrl, footerImageUrl,
        timetableConflicts = [], getLecturerById, getRoomById, getSubjectById,
        currentUser, courses = [], studentAttendances = [], studentCheckIns = {},
        assessments = [], assessmentMarks = [],
        currentInstitution,
        contracts = [],
        buildings = [],
        timetableSettings,
        academicYears = [],
        activeSemester = null,
        visitors = [],
        activityLog = [],
        courseSizes = new Map()
    } = props;

    const isRetailAgency = RETAIL_SUBTYPES.includes(currentInstitution?.businessSubType || '');
    const isAutoSales = currentInstitution?.businessSubType?.toLowerCase().includes('car') || currentInstitution?.businessSubType?.toLowerCase().includes('auto');
    const isDS = currentInstitution?.institutionType === 'Driving School' || currentInstitution?.category === 'Driving School' || currentInstitution?.institutionType?.toLowerCase().includes('driving school');
    const isEdu = useMemo(() => {
        return isEduInstitution(currentInstitution) && !isDS;
    }, [currentInstitution, isDS]);

    const [subTab, setSubTab] = useState(() => {
        if (activeScope === 'inventory') return 'inventory_valuation';
        if (activeScope === 'logistics') return 'distance';
        if (activeScope === 'boarding') return 'enrollment_capacity';
        return 'visuals';
    });
    const [departmentFilter, setDepartmentFilter] = useState<string>('all');
    const [isWorkloadPdfGenerating, setIsWorkloadPdfGenerating] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [previewPdfFilename, setPreviewPdfFilename] = useState<string>('');

    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [inventorySearch, setInventorySearch] = useState('');

    useEffect(() => {
        if (activeScope === 'inventory' && currentInstitution?.id) {
            const fetchInventoryData = async () => {
                setLoadingInventory(true);
                try {
                    const [invData, txData] = await Promise.all([
                        apiService.fetchModuleRecords<InventoryItem>('inventory', currentInstitution.id),
                        apiService.fetchModuleRecords<StockTransaction>('stock_transactions', currentInstitution.id)
                    ]);
                    setInventoryItems(invData || []);
                    setStockTransactions(txData || []);
                } catch (error) {
                    console.error('Failed to load inventory reports data:', error);
                } finally {
                    setLoadingInventory(false);
                }
            };
            fetchInventoryData();
        }
    }, [activeScope, currentInstitution?.id]);

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
        if (departmentFilter === 'all') return list.filter(l => l && l.role !== 'admin' && l.role !== 'super_admin' && l.role !== 'student');
        return list.filter(l => l && l.role !== 'admin' && l.role !== 'super_admin' && l.role !== 'student' && l.departmentId === departmentFilter);
    }, [lecturers, departmentFilter]);

    const filteredDepartments = useMemo(() => {
        const list = Array.isArray(departments) ? departments.filter(d => d) : [];
        if (departmentFilter === 'all') return list;
        return list.filter(d => d && d.id === departmentFilter);
    }, [departments, departmentFilter]);


    const allocatedSubjectIds = useMemo(() => new Set(Array.isArray(allocations) ? allocations.map(a => a?.subjectId).filter(Boolean) : []), [allocations]);
    const totalSubjectsCount = filteredSubjects.length;
    const allocatedSubjectsCount = filteredSubjects.filter(s => s && allocatedSubjectIds.has(s.id)).length;

    const filteredTimetableEntries = useMemo(() => {
        if (!allTimetableEntries) return [];
        let filtered = [...allTimetableEntries];
        
        // Always filter by active period if available to ensure report relevance
        if (activeSemester) {
            const semFiltered = filtered.filter(e => e.semesterId === activeSemester.id);
            if (semFiltered.length > 0) filtered = semFiltered;
        } else if (academicYears.length > 0) {
            const activeYear = academicYears.find(y => y.status === 'active');
            if (activeYear) {
                const yrFiltered = filtered.filter(e => e.academicYearId === activeYear.id);
                if (yrFiltered.length > 0) filtered = yrFiltered;
            }
        }
        
        if (departmentFilter === 'all') return filtered;
        
        const subjectIdsInDept = new Set(filteredSubjects.map(s => s.id));
        const deptFiltered = filtered.filter(e => e && subjectIdsInDept.has(e.subjectId));
        return deptFiltered.length > 0 ? deptFiltered : filtered;
    }, [allTimetableEntries, activeSemester, academicYears, departmentFilter, filteredSubjects]);

    const gridSettings = useMemo(() => {
        let minStart = timeToMinutes(timetableSettings.startTime);
        let maxEnd = timeToMinutes(timetableSettings.endTime);
        
        // Include any profile-specific bounds
        (currentInstitution?.scheduleProfiles || []).forEach(p => {
            if (p.startTime) minStart = Math.min(minStart, timeToMinutes(p.startTime));
            if (p.endTime) maxEnd = Math.max(maxEnd, timeToMinutes(p.endTime));
        });
        
        return {
            ...timetableSettings,
            startTime: minutesToTime(minStart),
            endTime: minutesToTime(maxEnd)
        };
    }, [timetableSettings, currentInstitution]);
    
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
            
            // 1. Calculate Target Capacity (Total Periods defined across all course levels for this department's subjects)
            let totalPeriodsTarget = 0;
            courses.forEach(course => {
                if (course.departmentId === dept.id) {
                    (course.levels || []).forEach(level => {
                        (level.subjectIds || []).forEach(sid => {
                            const sj = subjects.find(s => s.id === sid);
                            if (sj) {
                                const meta = (level.subjectMetadata || []).find(m => m.subjectId === sid);
                                const structure = meta?.lessonStructure || sj.lessonStructure || [];
                                totalPeriodsTarget += calculateTotalPeriods(structure);
                            }
                        });
                    });
                } else {
                    // Also check if subjects from this department are taught in other departments' courses (rare but possible)
                    (course.levels || []).forEach(level => {
                        (level.subjectIds || []).forEach(sid => {
                            const sj = subjects.find(s => s.id === sid && s.departmentId === dept.id);
                            if (sj) {
                                const meta = (level.subjectMetadata || []).find(m => m.subjectId === sid);
                                const structure = meta?.lessonStructure || sj.lessonStructure || [];
                                totalPeriodsTarget += calculateTotalPeriods(structure);
                            }
                        });
                    });
                }
            });

            // 2. Calculate Allocated Periods (Sum of periods * number of streams in each allocation)
            const departmentSubjects = (Array.isArray(subjects) ? subjects : []).filter(s => s && s.departmentId === dept.id);
            const allocatedDeptSubjects = (Array.isArray(allocations) ? allocations : []).filter(a =>
                a && departmentSubjects.some(s => s && s.id === a.subjectId)
            );

            const allocatedPeriods = allocatedDeptSubjects.reduce((sum, a) => {
                const subject = (Array.isArray(subjects) ? subjects : []).find(s => s && s.id === a.subjectId);
                if (!subject) return sum;
                
                const periods = (a.courseLevelIds || []).reduce((acc, levelId) => {
                    const level = (courses || []).flatMap(c => c.levels || []).find(l => l.id === levelId);
                    const meta = (level?.subjectMetadata || []).find(m => m.subjectId === a.subjectId);
                    const structure = meta?.lessonStructure || subject.lessonStructure || [];
                    return acc + calculateTotalPeriods(structure);
                }, 0) || calculateTotalPeriods(subject.lessonStructure); // Fallback to 1 stream default if no levels linked (rare)
                
                return sum + periods;
            }, 0);

            return {
                id: dept.id,
                name: dept.name,
                totalPeriods: totalPeriodsTarget,
                allocatedPeriods
            };
        });
    }, [filteredDepartments, subjects, allocations, courses]);

    const lecturerWorkload = useMemo(() => {
        return filteredLecturers
            .map(lecturer => {
                if (!lecturer) return null;
                const lecturerAllocations = (Array.isArray(allocations) ? allocations : []).filter(a => a && a.lecturerId === lecturer.id);
                const allocatedPeriods = lecturerAllocations.reduce((sum, a) => {
                    const subject = (Array.isArray(subjects) ? subjects : []).find(s => s && s.id === a.subjectId);
                    if (!subject) return sum;

                    const periods = (a.courseLevelIds || []).reduce((acc, levelId) => {
                        const level = (courses || []).flatMap(c => c.levels || []).find(l => l.id === levelId);
                        const meta = (level?.subjectMetadata || []).find(m => m.subjectId === a.subjectId);
                        const structure = meta?.lessonStructure || subject.lessonStructure || [];
                        return acc + calculateTotalPeriods(structure);
                    }, 0) || calculateTotalPeriods(subject.lessonStructure);

                    return sum + periods;
                }, 0);
                const subjectNames = lecturerAllocations
                    .map(a => (Array.isArray(subjects) ? subjects : []).find(s => s && s.id === a.subjectId)?.name)
                    .filter(Boolean)
                    .join(', ');
                const totalHours = (allocatedPeriods * (timetableSettings?.periodLengthMinutes || 60)) / 60;

                const roomNames = [...new Set(lecturerAllocations.flatMap(a => 
                    (a.courseLevelIds || []).map(levelId => {
                        const level = (courses || []).flatMap(c => c.levels || []).find(l => l.id === levelId);
                        const room = rooms.find(r => r.id === level?.roomId);
                        return room?.name;
                    }).filter(Boolean)
                ))].join(', ');

                return {
                    id: lecturer.id,
                    name: lecturer.name,
                    subjectCount: lecturerAllocations.length,
                    totalPeriods: allocatedPeriods,
                    totalHours: totalHours,
                    subjectNames: subjectNames,
                    roomNames: roomNames || 'N/A'
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

    const handlePreviewWorkloadPdf = async () => {
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
            setPreviewPdfFilename(`Workload_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            setPreviewPdfUrl(pdfUrl);
        } catch (error) {
            console.error("PDF Generation Error", error);
            alert("Failed to generate PDF preview");
        } finally {
            setIsWorkloadPdfGenerating(false);
        }
    };

    const subTabs = [
        { key: 'inventory_valuation', label: 'Inventory Stock & Valuation', icon: <ArchiveBoxIcon className="w-5 h-5 mr-3" /> },
        { key: 'store_issuances', label: 'Historical Store Issuances', icon: <ClipboardListIcon className="w-5 h-5 mr-3" /> },
        { key: 'visuals', label: 'Graphs & Visuals', icon: <ChartPieIcon className="w-5 h-5 mr-3" /> },
        { key: 'stats', label: (isRetailAgency || isAutoSales) ? 'Personnel & Agent Stats' : 'Workload & Statistics', icon: <ChartBarIcon className="w-5 h-5 mr-3" /> },
        { key: 'progress', label: 'Course Progress Tracking', icon: <CheckCircleIcon className="w-5 h-5 mr-3" /> },
        { key: 'enrollment_capacity', label: 'Enrollment vs Capacity', icon: <UserGroupIcon className="w-5 h-5 mr-3" /> },
        { key: 'utilization', label: 'Room Utilization', icon: <BuildingOfficeIcon className="w-5 h-5 mr-3" /> },
        { key: 'distance', label: 'Travel Distance Report', icon: <DocumentArrowDownIcon className="w-5 h-5 mr-3" /> },
        { key: 'advisory', label: 'Room Advisory Report', icon: <ExclamationTriangleIcon className="w-5 h-5 mr-3" /> },
        { key: 'audit', label: 'Audit Trail of Changes', icon: <ClipboardListIcon className="w-5 h-5 mr-3" /> },
        { key: 'conflicts', label: 'Conflict Report', icon: <ExclamationTriangleIcon className="w-5 h-5 mr-3" /> },
        { key: 'attendance', label: (isRetailAgency || !isEdu) ? 'Staff Clock-In Reports' : 'Attendance Reports', icon: <ClipboardListIcon className="w-5 h-5 mr-3" /> },
        { key: 'assessments', label: 'Assessment Reports', icon: <AcademicCapIcon className="w-5 h-5 mr-3" /> },
        { key: 'exam_timetable', label: 'Exam Timetable', icon: <CalendarDaysIcon className="w-5 h-5 mr-3" /> },
        { key: 'generated_timetable', label: 'Generated Timetable', icon: <CalendarDaysIcon className="w-5 h-5 mr-3" /> },
        { key: 'patterns', label: 'Behavioral Analytics', icon: <TrendingUpIcon className="w-5 h-5 mr-3" /> },
        { key: 'client_statements', label: 'Client Statements', icon: <UserGroupIcon className="w-5 h-5 mr-3" /> },
        { key: 'manage_users', label: 'Manage Showroom Users', icon: <UserGroupIcon className="w-5 h-5 mr-3" /> },
    ].filter(tab => {
        if (isAutoSales) {
            const allowed = ['visuals', 'stats', 'audit', 'attendance', 'client_statements', 'manage_users'];
            return allowed.includes(tab.key);
        }
        if (isRetailAgency || !isEdu) {
            const allowed = ['visuals', 'stats', 'audit', 'attendance', 'patterns'];
            if (currentInstitution?.institutionType === 'Transport' || currentInstitution?.institutionType === 'Business' || currentInstitution?.institutionType === 'Retail') {
                allowed.push('client_statements');
            }
            return allowed.includes(tab.key);
        }
        if (isDS || activeScope === 'ds') {
            const allowed = ['visuals', 'stats', 'audit', 'attendance', 'client_statements'];
            return allowed.includes(tab.key);
        }
        
        // Scope-based modular reports gating
        if (activeScope) {
            const isModuleActive = (moduleId: string) => {
                const state = currentInstitution?.moduleStates?.find(m => m.moduleId === moduleId);
                if (!state) return false;
                if (state.status === 'active') return true;
                if (state.status === 'trial') {
                    const expiry = state.trialEndsAt || (state as any).trial_ends_at;
                    return expiry ? new Date(expiry) > new Date() : false;
                }
                return false;
            };

            if (activeScope === 'inventory') {
                return ['inventory_valuation', 'store_issuances', 'audit'].includes(tab.key);
            }
            if (activeScope === 'academics') {
                const allowedKeys = ['audit'];
                if (isModuleActive('academics')) {
                    allowedKeys.push('visuals', 'stats', 'progress', 'advisory', 'assessments');
                }
                if (isModuleActive('timetable')) {
                    allowedKeys.push('utilization', 'conflicts', 'exam_timetable', 'generated_timetable');
                }
                return allowedKeys.includes(tab.key);
            }
            if (activeScope === 'boarding') {
                return ['enrollment_capacity', 'attendance', 'audit'].includes(tab.key);
            }
            if (activeScope === 'logistics') {
                return ['distance', 'audit'].includes(tab.key);
            }
        }
        
        return true;
    });

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
                    {subTab === 'inventory_valuation' && (
                        <div className="space-y-6 animate-fade-in text-slate-900 dark:text-white">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Stock Items</span>
                                    <h4 className="text-3xl font-black text-slate-900 dark:text-white mt-2">{inventoryItems.length}</h4>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Stock Quantity</span>
                                    <h4 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                                        {inventoryItems.reduce((sum, item) => sum + item.quantity, 0)}
                                    </h4>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Inventory Valuation</span>
                                    <h4 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
                                        KES {inventoryItems.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0)?.toLocaleString()}
                                    </h4>
                                </div>
                            </div>

                            {inventoryItems.filter(item => item.quantity <= (item.reorderLevel || item.minThreshold || 5)).length > 0 && (
                                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 p-6 rounded-3xl flex items-center gap-4 animate-pulse">
                                    <div className="p-3 bg-rose-500 text-white rounded-2xl">
                                        <ExclamationTriangleIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-black uppercase text-rose-700 dark:text-rose-400">Low Stock Warning</h5>
                                        <p className="text-xs text-rose-600 dark:text-rose-500 font-bold mt-1">
                                            {inventoryItems.filter(item => item.quantity <= (item.reorderLevel || item.minThreshold || 5)).length} items are currently below or at their safety threshold! Please reorder soon.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/20">
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-tight">Stock Level & Threshold Valuation Register</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Comprehensive store logistics statement</p>
                                    </div>
                                    <div className="relative w-full sm:w-64">
                                        <input
                                            type="text"
                                            placeholder="Search items..."
                                            value={inventorySearch}
                                            onChange={(e) => setInventorySearch(e.target.value)}
                                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold transition-all outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10">
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Name</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Available Stock</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Unit Price (KES)</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total Value (KES)</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                            {loadingInventory ? (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                                        Loading inventory data...
                                                    </td>
                                                </tr>
                                            ) : inventoryItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                                        No stock items in this store registry
                                                    </td>
                                                </tr>
                                            ) : (
                                                inventoryItems
                                                    .filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase()) || item.category.toLowerCase().includes(inventorySearch.toLowerCase()))
                                                    .map(item => {
                                                        const isLow = item.quantity <= (item.reorderLevel || item.minThreshold || 5);
                                                        return (
                                                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                                                <td className="p-5 text-xs font-black text-slate-900 dark:text-white">{item.name}</td>
                                                                <td className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest">{item.category}</td>
                                                                <td className="p-5 text-xs font-black text-center text-slate-700 dark:text-slate-200">
                                                                    {item.quantity} <span className="text-[10px] text-slate-400 font-bold">{item.unit}</span>
                                                                </td>
                                                                <td className="p-5 text-xs font-black text-right text-slate-800 dark:text-slate-300">
                                                                    {item.price ? `KES ${item.price?.toLocaleString()}` : '-'}
                                                                </td>
                                                                <td className="p-5 text-xs font-black text-right text-slate-900 dark:text-white">
                                                                    KES {(item.quantity * (item.price || 0))?.toLocaleString()}
                                                                </td>
                                                                <td className="p-5">
                                                                    {isLow ? (
                                                                        <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase tracking-widest rounded-full">
                                                                            Low Stock
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-full">
                                                                            In Stock
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {subTab === 'store_issuances' && (
                        <div className="space-y-6 animate-fade-in text-slate-900 dark:text-white">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/20">
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-tight">Direct Store Issuance Audit Ledger</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Historic records of school supplies distributed to users</p>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <input
                                            type="text"
                                            placeholder="Search issuances..."
                                            value={inventorySearch}
                                            onChange={(e) => setInventorySearch(e.target.value)}
                                            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold transition-all outline-none w-full sm:w-64"
                                        />
                                        <button onClick={() => window.print()} className="btn-secondary whitespace-nowrap text-[10px] font-black uppercase tracking-widest px-4 py-2 border rounded-xl flex items-center gap-2">
                                            <PrinterIcon className="w-4 h-4" /> Print
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10">
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date/Time</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Recipient</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Issued</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qty</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Recorded By</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Signature Confirmation</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                            {loadingInventory ? (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                                        Loading transaction logs...
                                                    </td>
                                                </tr>
                                            ) : stockTransactions.filter(t => t.type === 'Issue').length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                                        No direct issuance logs found
                                                    </td>
                                                </tr>
                                            ) : (
                                                stockTransactions
                                                    .filter(t => t.type === 'Issue')
                                                    .filter(t => t.itemName.toLowerCase().includes(inventorySearch.toLowerCase()) || t.recipientOrSupplier.toLowerCase().includes(inventorySearch.toLowerCase()))
                                                    .map(tx => (
                                                        <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                                            <td className="p-5">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                                        {new Date(tx.date).toLocaleDateString()}
                                                                    </span>
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                                        {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="p-5 text-xs font-bold text-slate-700 dark:text-slate-300">
                                                                {tx.recipientOrSupplier}
                                                            </td>
                                                            <td className="p-5 text-xs font-black uppercase text-slate-900 dark:text-white">
                                                                {tx.itemName}
                                                            </td>
                                                            <td className="p-5 text-xs font-black text-center text-slate-900 dark:text-white">
                                                                {tx.quantity}
                                                            </td>
                                                            <td className="p-5 text-xs font-bold text-slate-500">
                                                                {tx.recordedBy ? (lecturers.find(l => l.id === tx.recordedBy)?.name || tx.recordedBy) : 'System Admin'}
                                                            </td>
                                                            <td className="p-5">
                                                                {tx.signature ? (
                                                                    <div className="h-10 w-24 bg-white dark:bg-slate-950 rounded-lg p-1 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-inner overflow-hidden">
                                                                        <img src={tx.signature} alt="Signature" className="h-full object-contain mix-blend-multiply dark:invert" />
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">None</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {subTab === 'client_statements' && (
                        <ClientStatementReport
                            carInvoices={props.carInvoices || []}
                            carPayments={props.carPayments || []}
                            currentInstitution={currentInstitution!}
                            onPreviewPdf={(url, filename) => {
                                setPreviewPdfUrl(url);
                                setPreviewPdfFilename(filename);
                            }}
                        />
                    )}
                    {subTab === 'visuals' && (
                        <VisualReports
                            lecturers={lecturers || []}
                            subjects={subjects || []}
                            departments={departments || []}
                            requests={requests || []}
                            allocations={allocations || []}
                            generatedTimetable={filteredTimetableEntries || []}
                            courses={courses || []}
                            rooms={rooms || []}
                            visitors={visitors || []}
                            isAutoSales={isAutoSales}
                            isDS={isDS}
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
                                    <button onClick={handlePreviewWorkloadPdf} disabled={isWorkloadPdfGenerating} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
                                        <EyeIcon className="w-5 h-5" /> {isWorkloadPdfGenerating ? 'Preparing...' : 'Preview'}
                                    </button>
                                    <button onClick={handleDownloadWorkloadPdf} disabled={isWorkloadPdfGenerating} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                                        <DocumentArrowDownIcon className="w-5 h-5" /> {isWorkloadPdfGenerating ? 'Generating...' : 'Download PDF'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{(isRetailAgency || isAutoSales) ? 'Total Units/Items' : isDS ? 'Total Students Enrolled' : 'Total Subjects'}</h3>
                                    <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">{totalSubjectsCount}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{(isRetailAgency || isAutoSales) ? 'Active Assignments' : isDS ? 'Active Training Sessions' : 'Allocated Subjects'}</h3>
                                    <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">{allocatedSubjectsCount}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Requests</h3>
                                    <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">{totalRequestsCount}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{(isRetailAgency || isAutoSales) ? 'Total Personnel' : isDS ? 'Total Instructors' : 'Total Staff'}</h3>
                                    <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">{filteredLecturers.length}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                                {!isAutoSales && (
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
                                )}

                                {!isAutoSales && (
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
                                )}
                                {!isAutoSales && (
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
                                )}
                            </div>

                            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
                                <h3 className="text-xl font-semibold p-6">{(isAutoSales || isRetailAgency) ? 'Personnel & Sales Agent Statistics' : 'Faculty Workload Summary'}</h3>
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-50 dark:bg-slate-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{(isAutoSales || isRetailAgency) ? 'Staff / Agent' : 'Faculty Member'}</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{(isAutoSales || isRetailAgency) ? 'Assigned Leads' : 'Allocated Units'}</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Count</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{(isAutoSales || isRetailAgency) ? 'Total Shifts' : 'Total Periods'}</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Hrs/Week</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                        {lecturerWorkload.map(lec => (
                                            <tr key={lec.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{lec.name}</td>
                                                <td className="px-6 py-4 max-w-sm whitespace-normal text-sm text-slate-500 dark:text-slate-400">
                                                    <div>{lec.subjectNames}</div>
                                                    <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Rooms: {lec.roomNames}</div>
                                                </td>
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
                    {subTab === 'progress' && (
                        <CourseProgressReport
                            courses={courses}
                            subjects={subjects}
                            allTimetableEntries={filteredTimetableEntries}
                            letterheadConfig={letterheadConfig}
                            footerImageUrl={footerImageUrl}
                            onPreviewPdf={(url, filename) => {
                                setPreviewPdfUrl(url);
                                setPreviewPdfFilename(filename);
                            }}
                        />
                    )}
                    {subTab === 'enrollment_capacity' && (
                        <EnrollmentCapacityReport
                            rooms={rooms}
                            allTimetableEntries={filteredTimetableEntries}
                            courseSizes={courseSizes}
                            courses={courses}
                            subjects={subjects}
                            letterheadConfig={letterheadConfig}
                            footerImageUrl={footerImageUrl}
                            onPreviewPdf={(url, filename) => {
                                setPreviewPdfUrl(url);
                                setPreviewPdfFilename(filename);
                            }}
                        />
                    )}
                    {subTab === 'audit' && (
                        <ActivityLogView 
                            activityLog={activityLog} 
                            activityLogLimit={props.activityLogLimit}
                            setActivityLogLimit={props.setActivityLogLimit}
                        />
                    )}
                    {subTab === 'distance' && (
                        <RoomDistanceReport
                            rooms={rooms}
                            buildings={buildings}
                            letterheadConfig={letterheadConfig}
                            footerImageUrl={footerImageUrl}
                            onPreviewPdf={(url, filename) => {
                                setPreviewPdfUrl(url);
                                setPreviewPdfFilename(filename);
                            }}
                        />
                    )}
                    {subTab === 'utilization' && (
                        <RoomUtilizationReport
                            buildings={buildings || []}
                            rooms={rooms || []}
                            courses={courses || []}
                            generatedTimetable={filteredTimetableEntries || []}
                            timetableSettings={timetableSettings}
                            letterheadConfig={letterheadConfig}
                            logoUrl={logoUrl}
                            footerImageUrl={footerImageUrl}
                            onPreviewPdf={(url: string, filename: string) => {
                                setPreviewPdfUrl(url);
                                setPreviewPdfFilename(filename);
                            }}
                        />
                    )}
                    {subTab === 'advisory' && (
                        <AdvisoryReportView
                            generatedTimetable={filteredTimetableEntries || []}
                            rooms={rooms || []}
                            letterheadConfig={letterheadConfig}
                            logoUrl={logoUrl}
                            footerImageUrl={footerImageUrl}
                            onPreviewPdf={(url, filename) => {
                                setPreviewPdfUrl(url);
                                setPreviewPdfFilename(filename);
                            }}
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
                            generatedTimetable={filteredTimetableEntries || []}
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
                            currentInstitution={currentInstitution}
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
                            onPreviewPdf={(url: string, filename: string) => {
                                setPreviewPdfUrl(url);
                                setPreviewPdfFilename(filename);
                            }}
                        />
                    )}
                    {subTab === 'generated_timetable' && (
                        <TimetablesView
                            generatedTimetable={filteredTimetableEntries || []}
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
                    {subTab === 'patterns' && (
                        <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black uppercase tracking-tighter">Institutional Behavioral Patterns</h3>
                            </div>
                            <AttendanceAnalytics
                                timetable={filteredTimetableEntries}
                                studentAttendances={studentAttendances}
                                studentCheckIns={studentCheckIns}
                                users={lecturers}
                                subjects={subjects}
                                institutionId={currentUser?.institutionId || ''}
                            />
                        </div>
                    )}
                    {subTab === 'manage_users' && (
                        <React.Suspense fallback={<div className="h-96 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-slate-300" /></div>}>
                            <UserManager
                                user={currentUser}
                                users={lecturers}
                                showOnly="staff"
                                onAddUser={props.onAddUser!}
                                onEditUser={props.onEditUser!}
                                onDeleteUser={props.onDeleteUser!}
                                onImportUsers={props.onImportUsers!}
                                onSendSms={props.onSendSms!}
                                companyDetails={props.companyDetails!}
                                currentInstitution={currentInstitution}
                                isAutoMarket={true}
                                onAddTransaction={props.onAddTransaction}
                                departments={departments}
                                subjects={subjects}
                                courses={courses}
                            />
                        </React.Suspense>
                    )}
                </main>
            </div>
            {previewPdfUrl && (
                <PdfPreviewModal
                    url={previewPdfUrl}
                    filename={previewPdfFilename}
                    onClose={() => setPreviewPdfUrl(null)}
                />
            )}
        </div>
    );
};

