
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
import { ShieldIcon } from './icons/ShieldIcon';
import { apiService } from '../services/apiService';
import { BoardingHouseholdBalanceManager } from './Finance/BoardingHouseholdBalanceManager';
import { FeePromissoryTracker } from './Finance/FeePromissoryTracker';
import { AnnualReportWizard } from './Finance/AnnualReportWizard';
import { RevenueWarRoom } from './Finance/RevenueWarRoom';
import { DigitalExamPermitManager } from './Finance/DigitalExamPermitManager';
import { HomeIcon } from './icons/HomeIcon';

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
    onLogAction?: (action: string, entityId?: string, changes?: any) => Promise<void>;
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
    const isHeritage = useMemo(() => {
        const cat = currentInstitution?.category || '';
        const type = currentInstitution?.institutionType || '';
        return cat.includes('Heritage') || cat.includes('Family') || type.includes('Heritage');
    }, [currentInstitution]);
    const isEdu = useMemo(() => {
        return isEduInstitution(currentInstitution) && !isDS && !isHeritage;
    }, [currentInstitution, isDS, isHeritage]);

    const isEduTransportScope = useMemo(() => {
        const cat = currentInstitution?.category || '';
        const type = currentInstitution?.institutionType || '';
        return (
            cat === 'Educational Transport' ||
            type === 'Education' ||
            type === 'Primary' ||
            type === 'Secondary'
        );
    }, [currentInstitution]);

    const [subTab, setSubTab] = useState(() => {
        if (isHeritage) return 'heritage_summary';
        if (activeScope === 'inventory') return 'inventory_valuation';
        if (activeScope === 'logistics') return 'fleet_overview';
        if (activeScope === 'boarding') return 'enrollment_capacity';
        if (activeScope === 'eduvote') return 'turnout';
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

    const [heritageMembers, setHeritageMembers] = useState<any[]>([]);
    const [loadingHeritage, setLoadingHeritage] = useState(false);

    useEffect(() => {
        if (isHeritage && currentInstitution?.id) {
            const fetchHeritageReportsData = async () => {
                setLoadingHeritage(true);
                try {
                    const membersData = await apiService.fetchModuleRecords<any>('heritage_members', currentInstitution.id).catch(() => []);
                    setHeritageMembers(membersData || []);
                } catch (error) {
                    console.error('Failed to load heritage reports data:', error);
                } finally {
                    setLoadingHeritage(false);
                }
            };
            fetchHeritageReportsData();
        }
    }, [isHeritage, currentInstitution?.id]);

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

    const [elections, setElections] = useState<any[]>([]);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [ballots, setBallots] = useState<any[]>([]);
    const [loadingElections, setLoadingElections] = useState(false);

    useEffect(() => {
        if (activeScope === 'eduvote' && currentInstitution?.id) {
            const fetchElectionData = async () => {
                setLoadingElections(true);
                try {
                    const [eventsData, candData, ballotsData] = await Promise.all([
                        apiService.fetchModuleRecords('election_events', currentInstitution.id).catch(() => []),
                        apiService.fetchModuleRecords('election_candidates', currentInstitution.id).catch(() => []),
                        apiService.fetchModuleRecords('election_ballots', currentInstitution.id).catch(() => [])
                    ]);
                    setElections(eventsData || []);
                    setCandidates(candData || []);
                    setBallots(ballotsData || []);
                } catch (error) {
                    console.error('Failed to load election reports data:', error);
                } finally {
                    setLoadingElections(false);
                }
            };
            fetchElectionData();
        }
    }, [activeScope, currentInstitution?.id]);

    const totalStudentsCount = useMemo(() => {
        return (lecturers || []).filter(u => u && u.role === 'student').length;
    }, [lecturers]);

    const getCandidateName = (studentId: string) => {
        const user = (lecturers || []).find(u => u && u.id === studentId);
        return user ? user.name : studentId;
    };

    const getElectionTitle = (electionId: string) => {
        const elec = elections.find(e => e.id === electionId);
        return elec ? elec.title : electionId;
    };

    const getElectionVotersCount = (electionId: string) => {
        const electionBallots = ballots.filter(b => b.electionId === electionId);
        return new Set(electionBallots.map(b => b.receiptHash)).size;
    };

    const getCandidateVotes = (candidateId: string) => {
        return ballots.filter(b => b.candidateId === candidateId).length;
    };

    const isElectionClosed = (electionId: string) => {
        const elec = elections.find(e => e.id === electionId);
        return elec ? (elec.status === 'closed' || elec.status === 'completed') : false;
    };

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
        const accepted = list.filter(c => c && c.status === 'signed').length;
        const rejected = list.filter(c => c && c.status === 'expired').length;
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
                footerImageUrl ?? null,
                logoUrl ?? null
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
                footerImageUrl ?? null,
                logoUrl ?? null
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
        { key: 'household_balances', label: 'Boarding Household Balances', icon: <HomeIcon className="w-5 h-5 mr-3 text-emerald-500" /> },
        { key: 'promissory_commitments', label: 'Fee Promissory Commitments', icon: <DocumentArrowDownIcon className="w-5 h-5 mr-3 text-amber-500" /> },
        { key: 'annual_report_wizard', label: 'Annual Financial Report FY2025-26', icon: <BuildingOfficeIcon className="w-5 h-5 mr-3 text-indigo-500" /> },
        { key: 'revenue_warroom', label: 'Revenue Realization & Arrears', icon: <TrendingUpIcon className="w-5 h-5 mr-3 text-rose-500" /> },
        { key: 'exam_permits', label: 'Digital Exam Permits & Clearance', icon: <AcademicCapIcon className="w-5 h-5 mr-3 text-purple-500" /> },
        { key: 'heritage_summary', label: 'Family Lineage & Ancestry Report', icon: <UserGroupIcon className="w-5 h-5 mr-3" /> },
        { key: 'turnout', label: 'Electoral Turnout & Ballots', icon: <UserGroupIcon className="w-5 h-5 mr-3" /> },
        { key: 'candidates', label: 'Candidate Standing Reports', icon: <CheckCircleIcon className="w-5 h-5 mr-3" /> },
        { key: 'inventory_valuation', label: 'Inventory Stock & Valuation', icon: <ArchiveBoxIcon className="w-5 h-5 mr-3" /> },
        { key: 'store_issuances', label: 'Historical Store Issuances', icon: <ClipboardListIcon className="w-5 h-5 mr-3" /> },
        { key: 'fleet_overview', label: isEduTransportScope ? 'School Bus Fleet' : 'Fleet Overview', icon: <ChartBarIcon className="w-5 h-5 mr-3" /> },
        { key: 'route_analytics', label: isEduTransportScope ? 'Route Analytics' : 'Route Analytics', icon: <ChartPieIcon className="w-5 h-5 mr-3" /> },
        { key: 'commute_stats', label: isEduTransportScope ? 'Commute Statistics' : 'Transport Statistics', icon: <UserGroupIcon className="w-5 h-5 mr-3" /> },
        { key: 'visuals', label: 'Graphs & Visuals', icon: <ChartPieIcon className="w-5 h-5 mr-3" /> },
        { key: 'stats', label: isHeritage ? 'Family Lineage Statistics' : ((isRetailAgency || isAutoSales) ? 'Personnel & Agent Stats' : 'Workload & Statistics'), icon: <ChartBarIcon className="w-5 h-5 mr-3" /> },
        { key: 'progress', label: 'Course Progress Tracking', icon: <CheckCircleIcon className="w-5 h-5 mr-3" /> },
        { key: 'enrollment_capacity', label: 'Enrollment vs Capacity', icon: <UserGroupIcon className="w-5 h-5 mr-3" /> },
        { key: 'utilization', label: 'Room Utilization', icon: <BuildingOfficeIcon className="w-5 h-5 mr-3" /> },
        { key: 'distance', label: isEduTransportScope ? 'Bus Route Distances' : 'Travel Distance Report', icon: <DocumentArrowDownIcon className="w-5 h-5 mr-3" /> },
        { key: 'advisory', label: 'Room Advisory Report', icon: <ExclamationTriangleIcon className="w-5 h-5 mr-3" /> },
        { key: 'audit', label: isHeritage ? 'Family Vault Audit Logs' : 'Audit Trail of Changes', icon: <ClipboardListIcon className="w-5 h-5 mr-3" /> },
        { key: 'conflicts', label: 'Conflict Report', icon: <ExclamationTriangleIcon className="w-5 h-5 mr-3" /> },
        { key: 'attendance', label: (isRetailAgency || !isEdu) ? 'Staff Clock-In Reports' : 'Attendance Reports', icon: <ClipboardListIcon className="w-5 h-5 mr-3" /> },
        { key: 'assessments', label: 'Assessment Reports', icon: <AcademicCapIcon className="w-5 h-5 mr-3" /> },
        { key: 'exam_timetable', label: 'Exam Timetable', icon: <CalendarDaysIcon className="w-5 h-5 mr-3" /> },
        { key: 'generated_timetable', label: 'Generated Timetable', icon: <CalendarDaysIcon className="w-5 h-5 mr-3" /> },
        { key: 'activity_logs', label: 'Activity Logs', icon: <ClipboardListIcon className="w-5 h-5 mr-3" /> },
        { key: 'patterns', label: 'Behavioral Analytics', icon: <TrendingUpIcon className="w-5 h-5 mr-3" /> },
        { key: 'client_statements', label: 'Client Statements', icon: <UserGroupIcon className="w-5 h-5 mr-3" /> },
        { key: 'manage_users', label: 'Manage Showroom Users', icon: <UserGroupIcon className="w-5 h-5 mr-3" /> },
    ].filter(tab => {
        if (isHeritage) {
            const allowed = ['heritage_summary', 'stats', 'audit', 'activity_logs'];
            return allowed.includes(tab.key);
        }
        if (isAutoSales) {
            const allowed = ['visuals', 'stats', 'audit', 'activity_logs', 'attendance', 'client_statements', 'manage_users'];
            return allowed.includes(tab.key);
        }
        if (isRetailAgency || !isEdu) {
            const allowed = ['visuals', 'stats', 'audit', 'activity_logs', 'attendance', 'patterns'];
            if (currentInstitution?.institutionType === 'Transport' || currentInstitution?.institutionType === 'Business' || currentInstitution?.institutionType === 'Retail') {
                allowed.push('client_statements');
            }
            return allowed.includes(tab.key);
        }
        if (isDS || activeScope === 'ds') {
            const allowed = ['visuals', 'stats', 'audit', 'activity_logs', 'attendance', 'client_statements'];
            return allowed.includes(tab.key);
        }
        
        // Scope-based modular reports gating
        if (activeScope) {
            const isModuleActive = (moduleId: string) => {
                if (currentInstitution?.institutionType === 'Reseller') return true;
                if (currentInstitution?.id?.startsWith('demo_')) return true;

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
                return ['household_balances', 'enrollment_capacity', 'attendance', 'audit'].includes(tab.key);
            }
            if (activeScope === 'logistics') {
                return ['fleet_overview', 'route_analytics', 'commute_stats', 'distance', 'audit'].includes(tab.key);
            }
            if (activeScope === 'eduvote') {
                return ['turnout', 'candidates'].includes(tab.key);
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
                    {subTab === 'heritage_summary' && (
                        <div className="space-y-6 animate-fade-in text-slate-900 dark:text-white">
                            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Family Lineage & Ancestry Report</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Official registry of family souls, branches, and ancestral notes.</p>
                                </div>
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-700 transition-all shadow-md"
                                >
                                    <PrinterIcon className="w-4 h-4" />
                                    Print Report
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Family Members</span>
                                    <h4 className="text-3xl font-black text-amber-600 mt-2">{heritageMembers.length}</h4>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paternal Branch</span>
                                    <h4 className="text-3xl font-black text-blue-600 mt-2">
                                        {heritageMembers.filter(m => m.branch === 'Paternal').length}
                                    </h4>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Maternal Branch</span>
                                    <h4 className="text-3xl font-black text-pink-600 mt-2">
                                        {heritageMembers.filter(m => m.branch === 'Maternal').length}
                                    </h4>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documented Elders</span>
                                    <h4 className="text-3xl font-black text-emerald-600 mt-2">
                                        {heritageMembers.filter(m => m.birthYear || m.deathYear).length}
                                    </h4>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                                    <h4 className="text-sm font-black uppercase tracking-tight">Ancestral Lineage Registry</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Detailed list of recorded family tree souls and legacy details</p>
                                </div>
                                {loadingHeritage ? (
                                    <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                        Loading Family Lineage Records...
                                    </div>
                                ) : heritageMembers.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                        No family members registered yet.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10">
                                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</th>
                                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Branch</th>
                                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Relationship</th>
                                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Lifespan</th>
                                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Historical Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50 text-xs">
                                                {heritageMembers.map((m, idx) => (
                                                    <tr key={m.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                                                        <td className="p-5 font-black text-slate-800 dark:text-white uppercase">{m.name}</td>
                                                        <td className="p-5">
                                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${m.branch === 'Paternal' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-pink-50 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'}`}>
                                                                {m.branch}
                                                            </span>
                                                        </td>
                                                        <td className="p-5 font-bold text-slate-600 dark:text-slate-300">{m.relation}</td>
                                                        <td className="p-5 font-bold text-slate-500">
                                                            {m.birthYear || '—'} {m.deathYear ? `- ${m.deathYear}` : ''}
                                                        </td>
                                                        <td className="p-5 text-slate-500 font-medium max-w-xs truncate">{m.notes || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {subTab === 'turnout' && (
                        <div className="space-y-6 animate-fade-in text-slate-900 dark:text-white">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Elections</span>
                                    <h4 className="text-3xl font-black text-slate-900 dark:text-white mt-2">{elections.length}</h4>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Balloting</span>
                                    <h4 className="text-3xl font-black text-emerald-600 mt-2">
                                        {elections.filter(e => e.status === 'active').length}
                                    </h4>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completed Audited Elections</span>
                                    <h4 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
                                        {elections.filter(e => e.status === 'completed' || e.status === 'closed').length}
                                    </h4>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                                    <h4 className="text-sm font-black uppercase tracking-tight">Electoral Registry & Ballot Audits</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status of live and completed institutional voting events</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10">
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Election Event</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Voting Mechanism</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Total Eligible Voters</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Ballots Cast</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Turnout Rate</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                            {loadingElections ? (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                                        Loading electoral events...
                                                    </td>
                                                </tr>
                                            ) : elections.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                                        No electoral events registered
                                                    </td>
                                                </tr>
                                            ) : (
                                                elections.map(elec => {
                                                    const castVotes = getElectionVotersCount(elec.id);
                                                    const turnoutPct = totalStudentsCount > 0 ? Math.round((castVotes / totalStudentsCount) * 100) : 0;
                                                    return (
                                                        <tr key={elec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                                            <td className="p-5 text-xs font-black text-slate-900 dark:text-white">{elec.title}</td>
                                                            <td className="p-5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                                {elec.votingSystem === 'ranked_choice' ? 'Ranked Choice' : 'First-Past-The-Post (FPTP)'}
                                                            </td>
                                                            <td className="p-5 text-xs text-slate-500">{totalStudentsCount}</td>
                                                            <td className="p-5 text-xs font-bold text-slate-700 dark:text-slate-300">{castVotes}</td>
                                                            <td className="p-5 text-xs">
                                                                <div className="flex items-center">
                                                                    <span className="font-black text-indigo-600 dark:text-indigo-400 mr-2">{turnoutPct}%</span>
                                                                    <div className="w-16 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                                        <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${Math.min(turnoutPct, 100)}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-5">
                                                                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${
                                                                    elec.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 animate-pulse' :
                                                                    elec.status === 'completed' || elec.status === 'closed' ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' :
                                                                    'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                                                }`}>{elec.status}</span>
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

                    {subTab === 'candidates' && (
                        <div className="space-y-6 animate-fade-in text-slate-900 dark:text-white">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                                    <h4 className="text-sm font-black uppercase tracking-tight">Nominated Candidates Ledger</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Audit profile status, positions, and approval records of all candidates</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10">
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Candidate</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Election Event</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Position Contested</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Tagline / Motto</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Votes Received</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                            {loadingElections ? (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                                        Loading candidates...
                                                    </td>
                                                </tr>
                                            ) : candidates.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-12 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                                        No nominated candidates recorded
                                                    </td>
                                                </tr>
                                            ) : (
                                                candidates.map(cand => {
                                                    const closed = isElectionClosed(cand.electionId);
                                                    const votes = getCandidateVotes(cand.id);
                                                    return (
                                                        <tr key={cand.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                                            <td className="p-5 text-xs font-black text-slate-900 dark:text-white">
                                                                {getCandidateName(cand.studentId)}
                                                                <div className="text-[10px] font-normal text-slate-400">{cand.studentId}</div>
                                                            </td>
                                                            <td className="p-5 text-xs text-slate-500">{getElectionTitle(cand.electionId)}</td>
                                                            <td className="p-5 text-xs font-bold text-indigo-600 dark:text-indigo-400">{cand.position}</td>
                                                            <td className="p-5 text-xs font-medium text-slate-500 italic">"{cand.tagline || 'No tagline registered'}"</td>
                                                            <td className="p-5 text-xs font-black text-slate-900 dark:text-white">
                                                                {closed ? (
                                                                    <span className="text-emerald-600 dark:text-emerald-400">{votes} votes</span>
                                                                ) : (
                                                                    <span className="text-slate-400 italic font-medium flex items-center">
                                                                        <ShieldIcon className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                                                                        Masked (Live)
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-5">
                                                                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${
                                                                    cand.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' :
                                                                    cand.status === 'rejected' ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' :
                                                                    'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                                                }`}>{cand.status}</span>
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
                                                    .filter(t => (t.itemName || '').toLowerCase().includes(inventorySearch.toLowerCase()) || (t.recipientOrSupplier || '').toLowerCase().includes(inventorySearch.toLowerCase()))
                                                    .map(tx => (
                                                        <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                                            <td className="p-5">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                                        {tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A'}
                                                                    </span>
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                                        {tx.date ? new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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

                    {subTab === 'fleet_overview' && (
                        <div className="space-y-6 animate-fade-in text-slate-900 dark:text-white">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: isEduTransportScope ? 'School Buses' : 'Total Vehicles', value: '5', color: 'from-indigo-500 to-indigo-600', icon: '🚌' },
                                    { label: isEduTransportScope ? 'On Active Routes' : 'In Transit', value: '3', color: 'from-emerald-500 to-emerald-600', icon: '🛣️' },
                                    { label: 'Fleet Utilization', value: '84%', color: 'from-violet-500 to-violet-600', icon: '📊' },
                                    { label: isEduTransportScope ? 'GPS Tracked' : 'GPS Active', value: '5/5', color: 'from-sky-500 to-sky-600', icon: '📡' },
                                ].map(stat => (
                                    <div key={stat.label} className={`bg-gradient-to-br ${stat.color} p-6 rounded-[2rem] shadow-lg text-white`}>
                                        <div className="text-3xl mb-2">{stat.icon}</div>
                                        <p className="text-3xl font-black">{stat.value}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-1">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                                    <h4 className="text-sm font-black uppercase tracking-tight">{isEduTransportScope ? 'School Bus Fleet Registry' : 'Fleet Health Register'}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Current status of all registered vehicles</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-50 dark:border-slate-700">
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Reg. No.</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{isEduTransportScope ? 'Assigned Route' : 'Last Route'}</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{isEduTransportScope ? 'Driver / Attendant' : 'Driver'}</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Capacity</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Safety</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                            {[
                                                { name: isEduTransportScope ? 'Bus 04' : 'Truck Alpha', reg: 'KDC 992P', route: isEduTransportScope ? 'Route A – Kilimani & Hurlingham' : 'Mombasa → Nairobi', driver: isEduTransportScope ? 'Douglas Omwamba / Sarah W.' : 'Douglas Omwamba', capacity: isEduTransportScope ? '30 seats' : '12.5 tons', status: 'active', safety: 'Compliant' },
                                                { name: isEduTransportScope ? 'Bus 02' : 'Truck Bravo', reg: 'KBB 120Z', route: isEduTransportScope ? 'Route B – Langata & Karen' : 'Nairobi → Kampala', driver: isEduTransportScope ? 'James Kamau / Mercy N.' : 'James Kamau', capacity: isEduTransportScope ? '35 seats' : '4.2 tons', status: 'active', safety: 'Compliant' },
                                                { name: isEduTransportScope ? 'Bus 07' : 'Truck Charlie', reg: 'KDM 441X', route: isEduTransportScope ? 'Route C – Westlands & Spring Valley' : 'Kisumu → Eldoret', driver: isEduTransportScope ? 'Douglas Omwamba / Sarah W.' : 'Michael Odhiambo', capacity: isEduTransportScope ? '30 seats' : '2.8 tons', status: 'idle', safety: 'Compliant' },
                                                { name: isEduTransportScope ? 'Bus 09' : 'Truck Delta', reg: 'KCP 338B', route: isEduTransportScope ? 'Route D – South C & Embakasi' : 'Nairobi → Mombasa', driver: isEduTransportScope ? 'Grace Muthoni / Lydia A.' : 'Samuel Njoroge', capacity: isEduTransportScope ? '28 seats' : '10.0 tons', status: 'maintenance', safety: 'Under Review' },
                                                { name: isEduTransportScope ? 'Bus 11' : 'Truck Echo', reg: 'KDK 771Q', route: isEduTransportScope ? 'Route E – Thika Road' : 'Nairobi → Nakuru', driver: isEduTransportScope ? 'Peter Kimani / Ann W.' : 'Peter Kimani', capacity: isEduTransportScope ? '32 seats' : '8.0 tons', status: 'active', safety: 'Compliant' },
                                            ].map((v, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                                    <td className="p-5 text-xs font-black text-slate-900 dark:text-white">{v.name}</td>
                                                    <td className="p-5 text-xs font-bold text-indigo-600 dark:text-indigo-400">{v.reg}</td>
                                                    <td className="p-5 text-xs font-bold text-slate-600 dark:text-slate-300 max-w-[180px]">{v.route}</td>
                                                    <td className="p-5 text-xs font-bold text-slate-500">{v.driver}</td>
                                                    <td className="p-5 text-xs font-black text-center text-slate-800 dark:text-slate-200">{v.capacity}</td>
                                                    <td className="p-5">
                                                        <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${
                                                            v.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' :
                                                            v.status === 'maintenance' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400' :
                                                            'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                                        }`}>{v.status}</span>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${
                                                            v.safety === 'Compliant' ? 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                                                        }`}>{v.safety}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: 'Avg Fuel Efficiency', value: '11.4 km/L', sub: 'vs. 10.8 last month', color: 'text-emerald-600' },
                                    { label: 'Maintenance Due', value: '1 vehicle', sub: 'Bus 09 — scheduled service', color: 'text-amber-600' },
                                    { label: isEduTransportScope ? 'Total Routes Covered' : 'Total KMs This Month', value: isEduTransportScope ? '5 active routes' : '8,420 km', sub: isEduTransportScope ? '3 morning · 2 afternoon' : '+12% vs last month', color: 'text-indigo-600' },
                                ].map(card => (
                                    <div key={card.label} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{card.label}</p>
                                        <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
                                        <p className="text-xs font-bold text-slate-400 mt-1">{card.sub}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {subTab === 'route_analytics' && (
                        <div className="space-y-6 animate-fade-in text-slate-900 dark:text-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <h4 className="text-sm font-black uppercase tracking-tight mb-6">{isEduTransportScope ? 'Route Performance Breakdown' : 'Route Efficiency Breakdown'}</h4>
                                    <div className="space-y-5">
                                        {[
                                            { route: isEduTransportScope ? 'Route A – Kilimani & Hurlingham' : 'Mombasa → Nairobi ICD', load: 80, trips: isEduTransportScope ? '2/day' : '8', km: isEduTransportScope ? '18 km' : '490 km', color: 'bg-indigo-500' },
                                            { route: isEduTransportScope ? 'Route B – Langata & Karen' : 'Nairobi → Kampala', load: 94, trips: isEduTransportScope ? '2/day' : '4', km: isEduTransportScope ? '22 km' : '660 km', color: 'bg-emerald-500' },
                                            { route: isEduTransportScope ? 'Route C – Westlands & Spring Valley' : 'Kisumu → Eldoret', load: 100, trips: isEduTransportScope ? '2/day' : '6', km: isEduTransportScope ? '14 km' : '120 km', color: 'bg-violet-500' },
                                            { route: isEduTransportScope ? 'Route D – South C & Embakasi' : 'Nairobi → Mombasa', load: 57, trips: isEduTransportScope ? '2/day' : '3', km: isEduTransportScope ? '25 km' : '490 km', color: 'bg-sky-500' },
                                            { route: isEduTransportScope ? 'Route E – Thika Road' : 'Nairobi → Nakuru', load: 72, trips: isEduTransportScope ? '2/day' : '5', km: isEduTransportScope ? '19 km' : '160 km', color: 'bg-amber-500' },
                                        ].map(r => (
                                            <div key={r.route}>
                                                <div className="flex justify-between text-xs font-bold mb-1">
                                                    <span className="text-slate-700 dark:text-slate-200 truncate max-w-[60%]">{r.route}</span>
                                                    <span className="text-slate-400">{r.load}% load · {r.trips} · {r.km}</span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                                                    <div className={`${r.color} h-2.5 rounded-full transition-all duration-700`} style={{ width: `${r.load}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <h4 className="text-sm font-black uppercase tracking-tight mb-6">{isEduTransportScope ? 'Punctuality & Safety Report' : 'On-Time Delivery Record'}</h4>
                                    <div className="space-y-4">
                                        {[
                                            { label: isEduTransportScope ? 'On-Time Arrivals' : 'On-Time Deliveries', value: '94.2%', icon: '✅', color: 'text-emerald-600' },
                                            { label: isEduTransportScope ? 'Student Boarding Compliance' : 'Cargo Integrity Rate', value: '99.1%', icon: '🛡️', color: 'text-sky-600' },
                                            { label: isEduTransportScope ? 'Incidents This Term' : 'Incidents This Month', value: '0', icon: '🎯', color: 'text-violet-600' },
                                            { label: isEduTransportScope ? 'Parent Tracking Sessions' : 'Tracking Requests', value: '312', icon: '📱', color: 'text-indigo-600' },
                                            { label: 'Fuel Cost (This Month)', value: 'KES 42,800', icon: '⛽', color: 'text-amber-600' },
                                            { label: isEduTransportScope ? 'Avg Trip Duration' : 'Avg Transit Time', value: isEduTransportScope ? '38 min' : '2.4 days', icon: '⏱️', color: 'text-slate-600 dark:text-slate-300' },
                                        ].map(item => (
                                            <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-700 last:border-0">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">{item.icon}</span>
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{item.label}</span>
                                                </div>
                                                <span className={`text-sm font-black ${item.color}`}>{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h4 className="text-sm font-black uppercase tracking-tight mb-1">{isEduTransportScope ? 'Weekly Route Activity Heatmap' : 'Monthly Trip Volume Heatmap'}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Trip volume per day this week</p>
                                <div className="flex gap-2 flex-wrap">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, di) => (
                                        <div key={day} className="flex flex-col gap-2 flex-1 min-w-[40px]">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">{day}</p>
                                            {[90, 70, 85, 55, 95, 40, 80].slice(0, 5).map((v, i) => {
                                                const pct = Math.min(100, Math.max(20, v + (di * 7 + i * 5) % 30 - 10));
                                                return (
                                                    <div
                                                        key={i}
                                                        title={`${pct}% load`}
                                                        className="rounded-lg h-8 flex items-center justify-center text-[8px] font-black text-white transition-all"
                                                        style={{ background: `hsl(${220 + pct * 0.5}, 80%, ${70 - pct * 0.25}%)` }}
                                                    >{pct}%</div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {subTab === 'commute_stats' && (
                        <div className="space-y-6 animate-fade-in text-slate-900 dark:text-white">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: isEduTransportScope ? 'Commuting Students' : 'Passengers (This Month)', value: isEduTransportScope ? String(Math.max(lecturers.filter(u => (u as any).role === 'student').length || 184, 5)) : '1,240', color: 'from-indigo-500 to-indigo-700', icon: '👥' },
                                    { label: isEduTransportScope ? 'Morning Pick-ups' : 'Pickups Completed', value: isEduTransportScope ? '82' : '612', color: 'from-emerald-500 to-emerald-700', icon: '🌅' },
                                    { label: isEduTransportScope ? 'Afternoon Drop-offs' : 'Deliveries Completed', value: isEduTransportScope ? '80' : '608', color: 'from-violet-500 to-violet-700', icon: '🌆' },
                                    { label: isEduTransportScope ? 'Safety Score' : 'Safety Rating', value: '99.1%', color: 'from-sky-500 to-sky-700', icon: '🛡️' },
                                ].map(stat => (
                                    <div key={stat.label} className={`bg-gradient-to-br ${stat.color} p-6 rounded-[2rem] shadow-lg text-white`}>
                                        <div className="text-3xl mb-2">{stat.icon}</div>
                                        <p className="text-3xl font-black">{stat.value}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-1">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                                    <h4 className="text-sm font-black uppercase tracking-tight">{isEduTransportScope ? 'Route-wise Student Distribution' : 'Route-wise Passenger Load'}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{isEduTransportScope ? 'Student counts per active bus route this term' : 'Passenger volumes across all active routes'}</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-50 dark:border-slate-700">
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Route</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">{isEduTransportScope ? 'Students' : 'Passengers'}</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Capacity</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Load %</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{isEduTransportScope ? 'Bus' : 'Vehicle'}</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Driver</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                            {[
                                                { route: isEduTransportScope ? 'Route A – Kilimani' : 'Route 001', passengers: 24, capacity: 30, vehicle: 'Bus 04 (KDC 992P)', driver: 'Douglas Omwamba' },
                                                { route: isEduTransportScope ? 'Route B – Langata' : 'Route 002', passengers: 33, capacity: 35, vehicle: 'Bus 02 (KBB 120Z)', driver: 'James Kamau' },
                                                { route: isEduTransportScope ? 'Route C – Westlands' : 'Route 003', passengers: 30, capacity: 30, vehicle: 'Bus 07 (KDM 441X)', driver: 'Douglas Omwamba' },
                                                { route: isEduTransportScope ? 'Route D – South C' : 'Route 004', passengers: 16, capacity: 28, vehicle: 'Bus 09 (KCP 338B)', driver: 'Grace Muthoni' },
                                                { route: isEduTransportScope ? 'Route E – Thika Road' : 'Route 005', passengers: 23, capacity: 32, vehicle: 'Bus 11 (KDK 771Q)', driver: 'Peter Kimani' },
                                            ].map((row, i) => {
                                                const pct = Math.round((row.passengers / row.capacity) * 100);
                                                return (
                                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                                        <td className="p-5 text-xs font-black text-slate-900 dark:text-white">{row.route}</td>
                                                        <td className="p-5 text-xs font-black text-center text-indigo-600 dark:text-indigo-400">{row.passengers}</td>
                                                        <td className="p-5 text-xs font-bold text-center text-slate-500">{row.capacity}</td>
                                                        <td className="p-5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                                                    <div className={`h-2 rounded-full ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                                                                </div>
                                                                <span className="text-[10px] font-black text-slate-500 w-8 text-right">{pct}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-5 text-xs font-bold text-slate-600 dark:text-slate-300">{row.vehicle}</td>
                                                        <td className="p-5 text-xs font-bold text-slate-500">{row.driver}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] text-white shadow-xl">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">AI Transport Insight</p>
                                        <h4 className="text-xl font-black mt-1">{isEduTransportScope ? 'Route B is operating at 94% capacity' : 'Route 002 is nearing capacity'}</h4>
                                        <p className="text-sm opacity-80 mt-2 max-w-md">{isEduTransportScope ? 'Consider splitting Route B or upgrading Bus 02 to a higher-capacity vehicle before next term to prevent overcrowding and maintain safety compliance.' : 'Consider adding a second vehicle on this route to maintain service quality and on-time performance.'}</p>
                                    </div>
                                    <div className="flex-shrink-0 bg-white/20 rounded-2xl p-4 text-center">
                                        <p className="text-4xl font-black">94%</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mt-1">Peak Load</p>
                                    </div>
                                </div>
                            </div>
                        </div>
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
                    {subTab === 'household_balances' && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-left">
                            <BoardingHouseholdBalanceManager
                                currentUser={currentUser}
                                currentInstitution={currentInstitution || ({ id: 'inst-1', name: 'Institution' } as any)}
                                onLogAction={props.onLogAction}
                            />
                        </div>
                    )}
                    {subTab === 'promissory_commitments' && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-left">
                            <FeePromissoryTracker />
                        </div>
                    )}
                    {subTab === 'annual_report_wizard' && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-left">
                            <AnnualReportWizard
                                invoices={[]}
                                receipts={[]}
                                expenses={[]}
                                institution={currentInstitution || ({ id: 'inst-1', name: 'Institution' } as any)}
                            />
                        </div>
                    )}
                    {subTab === 'revenue_warroom' && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-left">
                            <RevenueWarRoom
                                invoices={[]}
                                receipts={[]}
                                expenses={[]}
                                goals={[]}
                                students={[]}
                                institution={currentInstitution || ({ id: 'inst-1', name: 'Institution' } as any)}
                                transactions={[]}
                                receiptLimit={50}
                                setReceiptLimit={() => {}}
                                transactionLimit={50}
                                setTransactionLimit={() => {}}
                            />
                        </div>
                    )}
                    {subTab === 'exam_permits' && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-left">
                            <DigitalExamPermitManager
                                institution={currentInstitution || ({ id: 'inst-1', name: 'Institution' } as any)}
                                students={[]}
                                invoices={[]}
                                receipts={[]}
                                userName={currentUser.name}
                            />
                        </div>
                    )}
                    {(subTab === 'audit' || subTab === 'activity_logs') && (
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
                            logoUrl={logoUrl || null}
                            footerImageUrl={footerImageUrl || null}
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
                            logoUrl={logoUrl || null}
                            footerImageUrl={footerImageUrl || null}
                            onPreviewPdf={(url: string, filename: string) => {
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
                            logoUrl={logoUrl ?? null}
                            footerImageUrl={footerImageUrl ?? null}
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
                            logoUrl={logoUrl ?? null}
                            footerImageUrl={footerImageUrl ?? null}
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
                            logoUrl={logoUrl ?? null}
                            footerImageUrl={footerImageUrl ?? null}
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
                            logoUrl={logoUrl ?? null}
                            footerImageUrl={footerImageUrl ?? null}
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
                                onLogAction={props.onLogAction!}
                                onImportUsers={props.onImportUsers!}
                                departments={departments}
                                courses={courses}
                                allocations={props.allocations}
                                smsConfig={{} as any}
                                currentUser={currentUser}
                                subjects={props.subjects}
                                letterheadConfig={props.letterheadConfig}
                                logoUrl={null}
                                footerImageUrl={null}
                                onSendSms={props.onSendSms!}
                                companyDetails={props.companyDetails!}
                                currentInstitution={currentInstitution}
                                isAutoMarket={true}
                                onAddTransaction={props.onAddTransaction}
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

