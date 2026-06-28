
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type {
    User, VoteHead, Supplier, StockTransaction, Room, Subject, TimetableEntry,
    Requisition, InventoryItem, SecurityAlert, Visitor, EmployeeDetails,
    PayrollRun, Invoice, Receipt, Course, FeeStructure, Semester, AcademicYear,
    CompanyDetails, MpesaTransaction, TimetableSettings, Building, Appointment,
    FinancialPeriod, InvoiceItem, Institution, TransactionStatus, BusinessDocument,
    CountyInventoryItem, Department, TeacherCheckIn, TimeOffRequest, StudentAttendance,
    StudentAbsenceRequest, LeaveOutRequest, BulletinItem, DocumentCollection,
    WatchlistRecord, MaintenanceRequest, TransportVehicle, TransportOnboarding, VehicleLog,
    SmsConfig, LetterheadConfig
} from '../types';
import { ShieldIcon } from './icons/ShieldIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { UserIcon } from './icons/UserIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { EyeIcon } from './icons/EyeIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { MpesaIcon } from './icons/MpesaIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ArrowTrendingUpIcon } from './icons/ArrowTrendingUpIcon';
import { CameraIcon } from './icons/CameraIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { ArrowRightOnRectangleIcon } from './icons/ArrowRightOnRectangleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { UserManager } from './UserManager';
import { sendEmailNotification, getInstitutionEmailConfig } from '../services/emailService';
import { DepartmentManager } from './DepartmentManager';
import { SecurityAlertManager } from './SecurityAlertManager';
import { LicensePlateScanner } from './LicensePlateScanner';
import { StoreItemForm } from './StoreItemForm';
import { SmartInventoryImporterModal } from './SmartInventoryImporterModal';
import { TransactionForm } from './TransactionForm';
import { ItemQrCodeModal } from './ItemQrCodeModal';
import { SecurityGatePassView, printEposGatePass, printEposWalkInGatePass } from './SecurityGatePassView';
import { apiService } from '../services/apiService';
import { TransportOnboardingView } from './TransportOnboardingView';
import { SupplierForm } from './retail/SupplierForm';
import { downloadInvoicePdf, downloadReceiptPdf, generateInventoryRegistryPdfDataUri, generateIssuanceReportPdfDataUri, generateInventoryStatementPdfDataUri, generateInventoryAnalyticsPdfDataUri, generateInventorySummaryPdfDataUri, generateVisitorHistoryPdf } from '../services/pdfService';
import { TimetableGrid } from './TimetableGrid';
import { StudentLeaveOutManager } from './StudentLeaveOutManager';
import { PrivateDriverBillingPortal } from './PrivateDriverBillingPortal';
import { timeToMinutes } from '../utils/timeUtils';
import { formatRoleDisplayName } from '../utils/roleUtils';
import { StoreIssuanceManager } from './StoreIssuanceManager';
import { PdfPreviewModal } from './PdfPreviewModal';
import { checkStoreHours } from '../utils/storeHours';


export interface SupportStaffViewProps {
    user?: User | null;
    currentUser?: User | null;
    currentInstitution?: Institution | null;
    users?: User[];
    visitors?: Visitor[];
    onAddVisitor?: (visitor: Omit<Visitor, 'id'>) => Promise<any> | any;
    onCheckoutVisitor?: (id: string) => void;
    onAddAppointment?: (apt: Omit<Appointment, 'id' | 'status' | 'createdAt'>) => void;
    onUpdateVisitor?: (id: string, data: Partial<Visitor>) => void;
    generatedTimetable?: TimetableEntry[];
    timetableSettings?: TimetableSettings;
    rooms?: Room[];
    subjects?: Subject[];
    getSubjectById?: (id: string) => Subject | undefined;
    getRoomById?: (id: string) => Room | undefined;
    getLecturerById?: (id: string) => User | undefined;
    securityAlerts?: SecurityAlert[];
    onAddAlert?: (alert: Omit<SecurityAlert, 'id' | 'institutionId' | 'createdBy' | 'createdAt' | 'status'>) => void;
    onResolveAlert?: (id: string) => void;
    onAddIncident?: (data: any) => Promise<void>;
    appointments?: Appointment[];
    onUpdateAppointmentStatus?: (id: string, status: Appointment['status']) => void;
    inventory?: InventoryItem[];
    stockTransactions?: StockTransaction[];
    suppliers?: Supplier[];
    onAddItem?: (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'institutionId'>) => Promise<void>;
    onAddSupplier?: (supplier: Omit<Supplier, 'id' | 'institutionId'>) => Promise<void>;
    onAddItems?: (items: Omit<InventoryItem, 'id' | 'institutionId'>[]) => void;
    onAddStoreTransaction?: (transaction: StockTransaction) => void;
    transactions?: MpesaTransaction[];
    invoices?: Invoice[];
    receipts?: Receipt[];
    requisitions?: Requisition[];
    onLogAction?: (action: string) => Promise<void>;
    vehicles?: TransportVehicle[];
    vehicleLogs?: VehicleLog[];
    transportOnboarding?: TransportOnboarding[];
    onLogGateAction?: (vehicleId: string, eventType: 'entry' | 'exit', notes?: string) => Promise<void>;
    onAddInvoice?: (invoice: Invoice) => void;
    onAddInvoices?: (invoices: Invoice[]) => void;
    onAddReceipt?: (receipt: Receipt) => void;
    onVerifyRequisition?: (id: string, status: Requisition['status'], reason?: string) => void;
    companyDetails?: CompanyDetails;
    courses?: Course[];
    onUpdateInstitution?: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => Promise<void> | void;
    voteHeads?: VoteHead[];
    onUpdateVoteHeads?: (heads: VoteHead[]) => void;
    feeStructures?: FeeStructure[];
    onUpdateFeeStructures?: (structures: FeeStructure[]) => void;
    financialPeriods?: FinancialPeriod[];
    onUpdateFinancialPeriods?: (periods: FinancialPeriod[]) => void;
    activeTabInitial?: 'dashboard' | 'payroll' | 'billing' | 'payments' | 'requisitions' | 'settings';
    supplierProfile?: Supplier;
    onUpdateRequisition?: (reqId: string, data: Partial<Requisition>) => void;
    onUpdateSupplier?: (supplierId: string, data: Partial<Supplier>) => void;
    countyInventory?: CountyInventoryItem[];
    onMarkInventoryReceived?: (id: string) => Promise<void>;
    academicYears?: AcademicYear[];
    semesters?: Semester[];
    departments?: Department[];
    // Info Desk Extensions
    teacherCheckIns?: TeacherCheckIn[];
    timeOffRequests?: TimeOffRequest[];
    studentAbsenceRequests?: StudentAbsenceRequest[];
    leaveOutRequests?: LeaveOutRequest[];
    bulletinItems?: BulletinItem[];
    documentCollections?: DocumentCollection[];
    watchlist?: WatchlistRecord[];
    maintenanceRequests?: MaintenanceRequest[];
    onAddBulletinItem?: (item: Omit<BulletinItem, 'id' | 'institutionId' | 'createdAt'>) => void;
    onUpdateDocumentStatus?: (id: string, status: DocumentCollection['status']) => void;
    onAddMaintenanceRequest?: (req: Omit<MaintenanceRequest, 'id' | 'institutionId' | 'reportedAt'>) => void;
    studentAttendances?: StudentAttendance[];
    onOnboardStudent?: (studentId: string, vehicleId: string, direction: 'to_school' | 'from_school', lat?: number, lng?: number) => Promise<void>;
    onOffboardStudent?: (recordId: string, lat?: number, lng?: number) => Promise<void>;
    onSwitchPerspective?: (role: any) => void;
    onAddUser?: (data: any) => Promise<void>;
    onEditUser?: (id: string, data: any) => Promise<void>;
    onDeleteUser?: (id: string) => Promise<void>;
    onAddDepartment?: (data: any) => Promise<void>;
    onUpdateDepartment?: (id: string, data: any) => Promise<void>;
    onDeleteDepartment?: (id: string) => Promise<void>;
    onImportStudents?: (students: any[]) => Promise<void>;
    onImportUsers?: (users: any[]) => Promise<void>;
    smsConfig?: SmsConfig;
    letterheadConfig?: LetterheadConfig;
    logoUrl?: string | null;
    footerImageUrl?: string | null;
    onSendSms?: (recipient: string, message: string, config?: SmsConfig, units?: number, institutionId?: string) => Promise<any>;
    onAddTransaction?: (data: any, items: any[]) => Promise<any>;
    onRefreshData?: () => Promise<void>;
    onAccessAlumnaPortal?: (school: any) => void;
}


const BaseDashboard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                {icon}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
        </div>
        {children}
    </div>
);

const parseTime = (t: string) => {
    const parts = t.match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
    if (!parts) return 0;
    let hours = parseInt(parts[1], 10);
    const minutes = parseInt(parts[2], 10);
    const ampm = parts[3];
    if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }
    return hours * 60 + minutes;
};

const formatDuration = (timeIn?: string, timeOut?: string) => {
    if (!timeIn || !timeOut) return '--';
    const start = parseTime(timeIn);
    const end = parseTime(timeOut);
    const diff = end - start;
    if (diff < 0) return "--";
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
};

export const SecurityView: React.FC<SupportStaffViewProps> = (props) => {
    const {
        user = { name: 'User', institutionId: '' } as any,
        securityAlerts = [], visitors = [], appointments = [], users = [],
        onCheckoutVisitor, onAddVisitor, onAddAlert, onResolveAlert, onUpdateAppointmentStatus,
        onLogAction, courses = []
    } = props;
    const [activeTab, setActiveTab] = useState<'checkpoint' | 'expected' | 'leaveout' | 'logs' | 'alerts' | 'gatepass' | 'reports'>('checkpoint');
    const isSchool = ['Primary', 'Secondary', 'ECD', 'International', 'primary', 'secondary'].includes(props.currentInstitution?.institutionType || '') ||
                     ['Primary', 'Secondary', 'ECD', 'International', 'primary', 'secondary'].includes(props.currentInstitution?.category || '');

    // Local states for dynamically fetched data to ensure real-time updates without page reload
    const [localUsers, setLocalUsers] = useState<User[]>(users || []);
    const [eventPins, setEventPins] = useState<any[]>([]);
    const [institutionEvents, setInstitutionEvents] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [exitingVisitorIds, setExitingVisitorIds] = useState<string[]>([]);

    const fetchData = async () => {
        if (!user?.institutionId) return;
        setLoadingData(true);
        try {
            const [fetchedUsers, pins, events] = await Promise.all([
                apiService.fetchModuleRecords<User>('users', user.institutionId),
                apiService.fetchModuleRecords<any>('event_pins', user.institutionId),
                apiService.fetchModuleRecords<any>('institution_events', user.institutionId)
            ]);

            if (fetchedUsers && fetchedUsers.length > 0) {
                setLocalUsers(fetchedUsers);
            }
            setEventPins(pins || []);
            setInstitutionEvents(events || []);
        } catch (e) {
            console.error("Failed to fetch security module data:", e);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // periodically refresh every 10 seconds
        return () => clearInterval(interval);
    }, [user?.institutionId]);

    // Sync localUsers with props.users if props change
    useEffect(() => {
        if (users && users.length > 0) {
            setLocalUsers(users);
        }
    }, [users]);

    const [selectedVisitorIds, setSelectedVisitorIds] = useState<string[]>([]);
    const [showBulkCheckoutModal, setShowBulkCheckoutModal] = useState(false);
    const [bulkCheckoutDate, setBulkCheckoutDate] = useState(new Date().toISOString().split('T')[0]);
    const [bulkCheckoutTime, setBulkCheckoutTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const [reportsStartDate, setReportsStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7); // Default to last 7 days
        return d.toISOString().split('T')[0];
    });
    const [reportsEndDate, setReportsEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportFilterPurpose, setReportFilterPurpose] = useState('all');

    const [isScanning, setIsScanning] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [lookupStatus, setLookupStatus] = useState<'idle' | 'searching' | 'found' | 'none'>('idle');
    const [customHostName, setCustomHostName] = useState('');
    const [walkInForm, setWalkInForm] = useState({ name: '', phone: '', idNumber: '', purpose: '', hostId: '', vehiclePlate: '', vehicleModel: '' });
    const [walkInSuccess, setWalkInSuccess] = useState(false);
    const [hostSearch, setHostSearch] = useState('');
    const [showHostDropdown, setShowHostDropdown] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [hostSignature, setHostSignature] = useState<string>('');
    const sigCanvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const [visitorSignature, setVisitorSignature] = useState<string>('');
    const visitorSigCanvasRef = useRef<HTMLCanvasElement>(null);
    const isVisitorDrawingRef = useRef(false);
    const lastVisitorPointRef = useRef<{ x: number; y: number } | null>(null);
    const todaysActiveEvents = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return (institutionEvents || []).filter(e =>
            (e.eventDate || e.event_date || '').split('T')[0] === today
        );
    }, [institutionEvents]);

    const activeVisitors = useMemo(() => {
        return (visitors || [])
            .filter(v => !v.timeOut)
            .sort((a, b) => {
                const dateCompare = (b.visitDate || '').localeCompare(a.visitDate || '');
                if (dateCompare !== 0) return dateCompare;
                return parseTime(b.timeIn || '') - parseTime(a.timeIn || '');
            });
    }, [visitors]);

    // Search and pagination for Security Logs tab
    const [activeSearch, setActiveSearch] = useState('');
    const [activePage, setActivePage] = useState(1);
    const [historySearch, setHistorySearch] = useState('');
    const [historyPage, setHistoryPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const filteredActiveVisitors = useMemo(() => {
        const query = activeSearch.toLowerCase().trim();
        if (!query) return activeVisitors;
        return activeVisitors.filter(v =>
            v.name?.toLowerCase().includes(query) ||
            v.phoneNumber?.toLowerCase().includes(query) ||
            v.idNumber?.toLowerCase().includes(query) ||
            v.purpose?.toLowerCase().includes(query) ||
            v.vehiclePlate?.toLowerCase().includes(query) ||
            v.vehicleModel?.toLowerCase().includes(query) ||
            (v.hostName && v.hostName.toLowerCase().includes(query))
        );
    }, [activeVisitors, activeSearch]);

    const historicalVisitors = useMemo(() => {
        return (visitors || [])
            .filter(v => !!v.timeOut)
            .sort((a, b) => {
                const dateCompare = (b.visitDate || '').localeCompare(a.visitDate || '');
                if (dateCompare !== 0) return dateCompare;
                return parseTime(b.timeIn || '') - parseTime(a.timeIn || '');
            });
    }, [visitors]);

    const filteredHistoryVisitors = useMemo(() => {
        const query = historySearch.toLowerCase().trim();
        if (!query) return historicalVisitors;
        return historicalVisitors.filter(v =>
            v.name?.toLowerCase().includes(query) ||
            v.phoneNumber?.toLowerCase().includes(query) ||
            v.idNumber?.toLowerCase().includes(query) ||
            v.purpose?.toLowerCase().includes(query) ||
            v.vehiclePlate?.toLowerCase().includes(query) ||
            v.vehicleModel?.toLowerCase().includes(query) ||
            (v.hostName && v.hostName.toLowerCase().includes(query))
        );
    }, [historicalVisitors, historySearch]);

    const totalActivePages = useMemo(() => {
        return Math.ceil(filteredActiveVisitors.length / ITEMS_PER_PAGE) || 1;
    }, [filteredActiveVisitors]);

    const activePageIndex = Math.min(activePage, totalActivePages);

    const paginatedActiveVisitors = useMemo(() => {
        const startIndex = (activePageIndex - 1) * ITEMS_PER_PAGE;
        return filteredActiveVisitors.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredActiveVisitors, activePageIndex]);

    const totalHistoryPages = useMemo(() => {
        return Math.ceil(filteredHistoryVisitors.length / ITEMS_PER_PAGE) || 1;
    }, [filteredHistoryVisitors]);

    const historyPageIndex = Math.min(historyPage, totalHistoryPages);

    const paginatedHistoryVisitors = useMemo(() => {
        const startIndex = (historyPageIndex - 1) * ITEMS_PER_PAGE;
        return filteredHistoryVisitors.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredHistoryVisitors, historyPageIndex]);
    const todaysAppointments = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return (appointments || []).filter(a => a.date === today && a.status === 'pending');
    }, [appointments]);

    const todaysEventPins = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return eventPins
            .filter(pin => {
                const isAccepted = pin.status === 'accepted';
                const event = institutionEvents.find(e => e.id === pin.eventId);
                const isToday = event && (event.eventDate || event.event_date || '').split('T')[0] === today;
                return isAccepted && isToday;
            })
            .map(pin => {
                const parent = localUsers.find(u => u.id === pin.userId) || ({
                    id: pin.userId,
                    name: 'Invited Guest',
                    phoneNumber: pin.guests ? '' : 'N/A',
                    role: 'parent',
                    institutionId: user.institutionId
                } as User);
                const event = institutionEvents.find(e => e.id === pin.eventId);
                const student = localUsers.find(u => 
                    u.role === 'student' && (
                        u.parentIds?.includes(pin.userId) || 
                        parent.studentIds?.includes(u.id) || 
                        (u as any).parentPhone === (parent.phoneNumber || '')
                    )
                ) || null;
                return { pin, parent, event, student };
            });
    }, [eventPins, institutionEvents, localUsers, user.institutionId]);
    const handleVisitorLookup = () => {
        if (!walkInForm.phone) return;
        setLookupStatus('searching');
        const matches = (visitors || []).filter(v => v.phoneNumber === walkInForm.phone);
        if (matches.length > 0) {
            const returning = [...matches].sort((a, b) => (b.visitDate || '').localeCompare(a.visitDate || ''))[0];
            if (returning) {
                setWalkInForm({ ...walkInForm, name: returning.name || '', idNumber: returning.idNumber || '', vehiclePlate: returning.vehiclePlate || '', vehicleModel: returning.vehicleModel || '' });
                setLookupStatus('found');
            }
        } else {
            setLookupStatus('none');
            setTimeout(() => setLookupStatus('idle'), 2000);
        }
    };
     const handleRegisterWalkIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (onAddVisitor && walkInForm.name && walkInForm.purpose) {
            let finalHostId = walkInForm.hostId;
            let finalHostName = '';
            if (walkInForm.hostId === 'other_custom') {
                const receptionist = users.find(u => u.role === 'info_desk' || u.role === 'reception');
                finalHostId = receptionist ? receptionist.id : (user?.id || '');
                finalHostName = customHostName.trim();
            }

            const visitorPayload: any = {
                name: walkInForm.name,
                phoneNumber: walkInForm.phone,
                purpose: walkInForm.purpose,
                hostId: finalHostId,
                hostName: finalHostName || undefined,
                vehiclePlate: walkInForm.vehiclePlate.toUpperCase(),
                vehicleModel: walkInForm.vehicleModel,
                idNumber: walkInForm.idNumber,
                visitDate: new Date().toISOString().split('T')[0],
                timeIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                institutionId: user?.institutionId || '',
                status: 'pending_authorization'
            };

            // Process saving and host notification asynchronously
            (async () => {
                try {
                    const savedVisitor = onAddVisitor ? await onAddVisitor(visitorPayload) : null;
                    const visitorId = savedVisitor?.id || `vis_${Date.now()}`;
                    const matchedHost = (localUsers || users || []).find(u => u.id === finalHostId);

                    if (matchedHost) {
                        const link = `${window.location.origin}/?view=visitor-auth&id=${visitorId}`;

                        // 1. Dispatch SMS
                        if (matchedHost.phoneNumber && props.onSendSms) {
                            const smsMsg = `Hi ${matchedHost.name}, guest ${visitorPayload.name} is at the gate. Purpose: ${visitorPayload.purpose}. Tap here to authorize: ${link}`;
                            await props.onSendSms(matchedHost.phoneNumber, smsMsg, props.smsConfig, 1, user?.institutionId || '');
                            console.info('[Security Notification] Sent SMS authorization request to host:', matchedHost.phoneNumber);
                        }

                        // 2. Dispatch Email
                        if (matchedHost.email && props.companyDetails?.emailConfig?.username) {
                            const emailSubject = `Visitor Authorization Request: ${visitorPayload.name}`;
                            const emailBody = `Dear ${matchedHost.name},\n\nA visitor has registered at the security gate and requested to see you.\n\nVisitor Name: ${visitorPayload.name}\nPurpose of Visit: ${visitorPayload.purpose}\nArrival Time: ${visitorPayload.timeIn}\n\nPlease click the secure link below to review, sign, and authorize or deny entry:\n${link}\n\nBest Regards,\nSecurity Operations`;
                            
                            const emailConfig = getInstitutionEmailConfig(props.currentInstitution, props.companyDetails.emailConfig);
                            await sendEmailNotification(matchedHost.email, emailSubject, emailBody, emailConfig);
                            console.info('[Security Notification] Sent Email authorization request to host:', matchedHost.email);
                        }
                    }
                } catch (err) {
                    console.error("Failed to complete visitor registration host notification:", err);
                }
            })();

            // If visitor is attending a today's event, check them in immediately
            if (selectedEventId) {
                const targetEvent = institutionEvents.find(e => e.id === selectedEventId);
                if (targetEvent) {
                    const walkinUserId = `walkin_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
                    const pinRecord = {
                        id: `pin_walkin_${Date.now()}`,
                        eventId: selectedEventId,
                        userId: walkinUserId,
                        pin: Math.floor(100000 + Math.random() * 900000).toString(),
                        status: 'used',
                        institutionId: user?.institutionId || '',
                        createdAt: new Date().toISOString(),
                        metadata: {
                            walkIn: true,
                            visitorName: walkInForm.name,
                            visitorPhone: walkInForm.phone,
                            visitorId: walkInForm.idNumber,
                            checkedInAt: new Date().toISOString(),
                            checkedInBy: user?.name || 'Security'
                        }
                    };
                    apiService.saveModuleRecord('event_pins', pinRecord).catch(console.error);
                    props.onLogAction?.(`Walk-in ${walkInForm.name} checked in to event: ${targetEvent.title}`)?.catch?.(() => {});
                }
            }

            // Print gate pass immediately (non-blocking)
            try {
                const hostUser = users.find(u => u.id === finalHostId);
                printEposWalkInGatePass(visitorPayload, hostUser, props.currentInstitution, hostSignature || undefined, visitorSignature || undefined);
            } catch (err) {
                console.error("Failed to automatically print walk-in gatepass:", err);
            }

            // Log in background – don't await
            props.onLogAction?.(`Registered visitor: ${walkInForm.name} (ID: ${walkInForm.idNumber}) for ${walkInForm.purpose}`).catch?.(() => {});

            // Reset form instantly
            setIsRegistering(false);
            setLookupStatus('idle');
            setCustomHostName('');
            setHostSearch('');
            setShowHostDropdown(false);
            setHostSignature('');
            setVisitorSignature('');
            setSelectedEventId('');
            // Clear canvases
            [sigCanvasRef, visitorSigCanvasRef].forEach(ref => {
                const c = ref.current;
                if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
            });
            setWalkInForm({ name: '', phone: '', idNumber: '', purpose: '', hostId: '', vehiclePlate: '', vehicleModel: '' });

            // Show brief inline success toast instead of blocking alert
            setWalkInSuccess(true);
            setTimeout(() => setWalkInSuccess(false), 3000);
        }
    };
    const handleCheckInAppointment = async (apt: Appointment) => {
        if (onAddVisitor && onUpdateAppointmentStatus) {
            await onAddVisitor({
                name: apt.guestName,
                email: apt.guestEmail,
                phoneNumber: apt.guestPhone,
                purpose: apt.purpose,
                hostId: apt.hostId,
                visitDate: new Date().toISOString().split('T')[0],
                timeIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                institutionId: apt.institutionId
            });
            await onUpdateAppointmentStatus(apt.id, 'completed');
            await props.onLogAction?.(`Checked in appointment guest: ${apt.guestName}`);
            alert(`Check-in complete for ${apt.guestName}`);
        }
    };

    const handleCheckInEventPin = async (pin: any, parent: User, event: any, student: User | null) => {
        if (onAddVisitor) {
            try {
                const dateStr = new Date().toISOString().split('T')[0];
                const timeInStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const plate = pin?.vehicleRegistration || pin?.vehicle_registration || '';

                let resolvedHostId = student?.id || user.id;
                if (isSchool && student) {
                    const classLevel = courses.flatMap(c => c.levels || []).find(lvl => lvl.id === student.courseLevelId);
                    if (classLevel && classLevel.classTeacherId) {
                        resolvedHostId = classLevel.classTeacherId;
                    } else {
                        resolvedHostId = user.id;
                    }
                }

                // Add the parent first
                await onAddVisitor({
                    name: parent.name,
                    phoneNumber: parent.phoneNumber || '',
                    purpose: `Event Check-In: Parent of ${student?.name || 'Student'}`,
                    visitDate: dateStr,
                    timeIn: timeInStr,
                    institutionId: user.institutionId,
                    hostId: resolvedHostId,
                    vehiclePlate: plate,
                    idNumber: pin ? `PIN: ${pin.pin}` : ''
                });

                // Also add any accompanying guests
                if (pin && pin.guests) {
                    try {
                        const parsedGuests = JSON.parse(pin.guests || '[]');
                        if (Array.isArray(parsedGuests)) {
                            for (const guestName of parsedGuests) {
                                if (guestName && typeof guestName === 'string' && guestName.trim()) {
                                    await onAddVisitor({
                                        name: guestName.trim(),
                                        phoneNumber: parent.phoneNumber || '',
                                        purpose: `Accompanying Guest (Invited by ${parent.name})`,
                                        visitDate: dateStr,
                                        timeIn: timeInStr,
                                        institutionId: user.institutionId,
                                        hostId: resolvedHostId,
                                        vehiclePlate: plate,
                                        idNumber: `PIN: ${pin.pin}`
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Failed to parse/add accompanying guests:", e);
                    }
                }

                if (pin) {
                    printEposGatePass(pin, parent, event, props.currentInstitution);
                    const updatedPin = {
                        ...pin,
                        status: 'used'
                    };
                    await apiService.updateModuleRecord('event_pins', pin.id, updatedPin);
                }

                await props.onLogAction?.(`Checked in event guest: ${parent.name} (PIN: ${pin.pin})`);
                alert('Parent and guests verified and logged successfully for entry. Gatepass sent to printer.');
                
                // Refresh data to update expected guests list immediately
                await fetchData();
            } catch (err: any) {
                alert(err.message || 'Error logging parent entry');
            }
        }
    };

    const handleViewGatePassForVisitor = (v: Visitor) => {
        const pinCode = v.idNumber?.startsWith('PIN: ') ? v.idNumber.replace('PIN: ', '') : '';
        const foundPin = pinCode ? eventPins.find(p => p.pin === pinCode) : null;
        
        if (foundPin) {
            const parent = localUsers.find(u => u.id === foundPin.userId) || ({
                id: foundPin.userId,
                name: v.name,
                phoneNumber: v.phoneNumber || '',
                role: 'parent',
                institutionId: user.institutionId
            } as User);
            const event = institutionEvents.find(e => e.id === foundPin.eventId);
            printEposGatePass(foundPin, parent, event, props.currentInstitution);
        } else {
            const hostUser = localUsers.find(u => u.id === v.hostId);
            printEposWalkInGatePass(v, hostUser, props.currentInstitution);
        }
    };

    const dashboardTitle = isSchool ? "School Security Hub" : "Campus Security Hub";

    return (
        <BaseDashboard title={dashboardTitle} icon={<ShieldIcon className="w-6 h-6 text-slate-600" />}>
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar pb-1">
                    {[
                        { id: 'checkpoint', label: 'Gate Checkpoint', icon: <CameraIcon className="w-4 h-4" /> },
                        { id: 'expected', label: 'Expected Guests', icon: <CalendarDaysIcon className="w-4 h-4" />, count: todaysAppointments.length + todaysEventPins.length },
                        { id: 'leaveout', label: 'Student Leave Out', icon: <ArrowUpTrayIcon className="w-4 h-4" /> },
                        { id: 'logs', label: 'Security Logs', icon: <ClipboardListIcon className="w-4 h-4" />, count: activeVisitors.length },
                        { id: 'gatepass', label: 'Gate Passes', icon: <MapPinIcon className="w-4 h-4" /> },
                        { id: 'reports', label: 'Reports', icon: <ChartBarIcon className="w-4 h-4" /> },
                        { id: 'alerts', label: 'Security Alerts', icon: <ExclamationTriangleIcon className="w-4 h-4" />, count: securityAlerts.filter(a => a.status === 'active').length }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            {tab.icon} {tab.label} {tab.count !== undefined && tab.count > 0 && (<span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">{tab.count}</span>)}
                        </button>
                    ))}
                </nav>
            </div>
            {walkInSuccess && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl shadow-emerald-200 animate-fade-in-up font-black uppercase tracking-widest text-sm">
                    <CheckCircleIcon className="w-5 h-5" />
                    Visitor Registered & Pass Sent to Printer
                </div>
            )}
            {activeTab === 'checkpoint' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-up">
                    <div className="space-y-6">
                        <div className="flex flex-col">
                            <h3 className="text-xl font-black uppercase tracking-tight">Access Control</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase mt-1">Manage physical entry and exit</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <button onClick={() => setIsRegistering(true)} className="flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-indigo-100 hover:border-indigo-500 shadow-sm transition-all group">
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900 rounded-2xl text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                    <UserIcon className="w-10 h-10" />
                                </div>
                                <span className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white">Register Walk-in</span>
                                <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-tighter">New visitor profile creation</p>
                            </button>
                            <button onClick={() => setIsScanning(true)} className="flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-emerald-100 hover:border-emerald-500 shadow-sm transition-all group">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900 rounded-2xl text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                                    <CameraIcon className="w-10 h-10" />
                                </div>
                                <span className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white">Scan License Plate</span>
                                <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-tighter">Automated extraction via OCR</p>
                            </button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 h-fit">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black uppercase tracking-tight">Active at Checkpoint</h3>
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[10px] font-black uppercase text-indigo-600">LIVE FEED</span>
                            </div>
                        </div>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                            {activeVisitors.slice(0, 10).map(v => (
                                <div key={v.id} className={`p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group transition-all hover:border-indigo-100 hover:shadow-md ${exitingVisitorIds.includes(v.id) ? 'visitor-checkout-exit' : ''}`}>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-black text-slate-800 dark:text-white uppercase text-sm truncate">{v.name}</p>
                                            {v.vehiclePlate && (
                                                <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[9px] rounded font-black border border-slate-700 shadow-sm">{v.vehiclePlate}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md">{v.purpose}</span>
                                            {v.idNumber && <span className="text-[9px] font-black text-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded-md">ID: {v.idNumber}</span>}
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {v.timeIn}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            setExitingVisitorIds(prev => [...prev, v.id]);
                                            setTimeout(async () => {
                                                onCheckoutVisitor?.(v.id);
                                                await onLogAction?.(`Checked out visitor: ${v.name}`);
                                                setExitingVisitorIds(prev => prev.filter(id => id !== v.id));
                                            }, 400);
                                        }}
                                        className="p-3 bg-red-50 text-red-600 rounded-xl shadow-sm border border-red-50 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                        title="Secure Checkout"
                                    >
                                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {activeVisitors.length === 0 && (
                                <div className="py-20 text-center flex flex-col items-center gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full">
                                        <ShieldIcon className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Registry is currently empty</p>
                                </div>
                            )}
                        </div>
                        {activeVisitors.length > 10 && (
                            <button onClick={() => setActiveTab('logs')} className="w-full mt-4 py-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors">
                                View All Records ({activeVisitors.length})
                            </button>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'expected' && (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in-up">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Expected Guests</h3>
                            <p className="text-xs text-slate-400 mt-1 uppercase font-bold">Planned appointments and event RSVPs for today</p>
                        </div>
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                            <CalendarDaysIcon className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Appointments */}
                        {todaysAppointments.map(apt => (
                            <div key={apt.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 relative overflow-hidden group hover:border-indigo-200 transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-black shadow-sm">
                                        {apt.guestName.charAt(0)}
                                    </div>
                                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded-lg border border-indigo-100">Appointment</span>
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 dark:text-white uppercase text-base truncate">{apt.guestName}</h4>
                                    <p className="text-[10px] text-slate-450 font-bold uppercase tracking-widest">{apt.purpose}</p>
                                </div>
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                        <ClockIcon className="w-3.5 h-3.5 text-indigo-500" /> {apt.startTime} - {apt.endTime}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                        <UserIcon className="w-3.5 h-3.5 text-slate-400" /> Host: {localUsers.find(u => u.id === apt.hostId)?.name || 'N/A'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleCheckInAppointment(apt)}
                                    className="w-full py-3.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-100 dark:shadow-none"
                                >
                                    Verify & Sign-In
                                </button>
                            </div>
                        ))}

                        {/* Confirmed Event RSVPs */}
                        {todaysEventPins.map(({ pin, parent, event, student }) => (
                            <div key={pin.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 relative overflow-hidden group hover:border-purple-200 transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-purple-650 font-black shadow-sm">
                                        {parent.name.charAt(0)}
                                    </div>
                                    <span className="px-2.5 py-1 bg-purple-50 text-purple-650 text-[9px] font-black uppercase rounded-lg border border-purple-100">Event RSVP</span>
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 dark:text-white uppercase text-base truncate">{parent.name}</h4>
                                    <p className="text-[10px] text-purple-550 font-bold uppercase tracking-widest">PIN: {pin.pin}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate mt-1">Event: {event?.title || 'School Event'}</p>
                                </div>
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                        <ClockIcon className="w-3.5 h-3.5 text-purple-500" /> {event?.eventTime || 'Time TBD'}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                        <UserIcon className="w-3.5 h-3.5 text-slate-400" /> Student: {student?.name || 'N/A'}
                                    </div>
                                    {pin.vehicleRegistration && (
                                        <div className="text-[10.5px] font-bold text-slate-500 uppercase flex items-center gap-1.5 mt-0.5">
                                            <span className="shrink-0 text-slate-400">VEHICLE:</span>
                                            <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-850 rounded font-mono text-slate-800 dark:text-slate-350 font-black">{pin.vehicleRegistration}</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleCheckInEventPin(pin, parent, event, student)}
                                    className="w-full py-3.5 bg-purple-650 hover:bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-purple-100 dark:shadow-none"
                                >
                                    Verify & Sign-In
                                </button>
                            </div>
                        ))}

                        {todaysAppointments.length === 0 && todaysEventPins.length === 0 && (
                            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full opacity-50">
                                    <CalendarDaysIcon className="w-10 h-10 text-slate-300" />
                                </div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No pending appointments or event RSVPs scheduled for today</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'leaveout' && (
                <StudentLeaveOutManager
                    currentUser={user}
                    currentInstitution={props.currentInstitution!}
                    companyDetails={props.companyDetails!}
                    users={props.users || []}
                    academicYears={props.academicYears || []}
                    semesters={props.semesters || []}
                    courses={props.courses || []}
                    departments={props.departments || []}
                    onLogAction={props.onLogAction || (async () => { })}
                    onDataChange={() => { }}
                />
            )}

            {activeTab === 'alerts' && (<SecurityAlertManager alerts={securityAlerts} users={props.users || []} onAddAlert={onAddAlert!} onResolveAlert={onResolveAlert!} />)}

            {activeTab === 'gatepass' && (
                <SecurityGatePassView
                    vehicles={props.vehicles || []}
                    vehicleLogs={props.vehicleLogs || []}
                    users={localUsers}
                    visitors={props.visitors || []}
                    currentUser={user}
                    currentInstitution={props.currentInstitution!}
                    onLogGateAction={props.onLogGateAction!}
                    onAddVisitor={props.onAddVisitor}
                    courses={courses}
                    eventPins={eventPins}
                    events={institutionEvents}
                />
            )}

            {activeTab === 'reports' && (() => {
                // Filter visitors by dates and purpose
                const filteredRepVisitors = (visitors || []).filter(v => {
                    const vDate = v.visitDate || '';
                    const matchesDate = (!reportsStartDate || vDate >= reportsStartDate) && 
                                        (!reportsEndDate || vDate <= reportsEndDate);
                    const matchesPurpose = reportFilterPurpose === 'all' || 
                                           (v.purpose || '').toLowerCase().includes(reportFilterPurpose.toLowerCase());
                    return matchesDate && matchesPurpose;
                });

                // Compute statistics
                const totalVisitors = filteredRepVisitors.length;
                const activeCount = filteredRepVisitors.filter(v => !v.timeOut).length;
                
                // Average duration in minutes
                let totalDurationMinutes = 0;
                let durationCount = 0;
                filteredRepVisitors.forEach(v => {
                    if (v.timeIn && v.timeOut) {
                        const inMins = parseTime(v.timeIn);
                        const outMins = parseTime(v.timeOut);
                        if (outMins > inMins) {
                            totalDurationMinutes += (outMins - inMins);
                            durationCount++;
                        }
                    }
                });
                const avgDuration = durationCount > 0 ? Math.round(totalDurationMinutes / durationCount) : 0;

                // Distribution of purposes
                const purposeCounts: Record<string, number> = {};
                filteredRepVisitors.forEach(v => {
                    const p = v.purpose || 'General';
                    // Simplify purpose categorization
                    let cat = 'Other';
                    const lp = p.toLowerCase();
                    if (lp.includes('meeting') || lp.includes('visit') || lp.includes('parent')) cat = 'Official Visit';
                    else if (lp.includes('delivery') || lp.includes('courier')) cat = 'Delivery/Courier';
                    else if (lp.includes('interview') || lp.includes('job')) cat = 'HR/Interview';
                    else if (lp.includes('event') || lp.includes('pin')) cat = 'School Event';
                    else if (lp.includes('maintenance') || lp.includes('repair')) cat = 'Maintenance/Service';
                    
                    purposeCounts[cat] = (purposeCounts[cat] || 0) + 1;
                });

                // Peak Entry Hour calculations
                const hourlyCounts = Array(24).fill(0);
                filteredRepVisitors.forEach(v => {
                    if (v.timeIn) {
                        const mins = parseTime(v.timeIn);
                        const hour = Math.floor(mins / 60);
                        if (hour >= 0 && hour < 24) {
                            hourlyCounts[hour]++;
                        }
                    }
                });

                // Find peak hour
                let peakHour = 0;
                let maxHourCount = 0;
                hourlyCounts.forEach((count, hour) => {
                    if (count > maxHourCount) {
                        maxHourCount = count;
                        peakHour = hour;
                    }
                });

                return (
                    <div className="space-y-8 animate-fade-in-up">
                        {/* Filter Bar */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-end justify-between gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Start Date</label>
                                    <input
                                        type="date"
                                        value={reportsStartDate}
                                        onChange={(e) => setReportsStartDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">End Date</label>
                                    <input
                                        type="date"
                                        value={reportsEndDate}
                                        onChange={(e) => setReportsEndDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Filter by Purpose</label>
                                    <select
                                        value={reportFilterPurpose}
                                        onChange={(e) => setReportFilterPurpose(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-900 dark:text-white"
                                    >
                                        <option value="all">All Purposes</option>
                                        <option value="Official Visit">Official Visit</option>
                                        <option value="Delivery">Delivery/Courier</option>
                                        <option value="Event">School Event</option>
                                        <option value="Maintenance">Maintenance/Service</option>
                                    </select>
                                </div>
                            </div>
                            
                            <button
                                onClick={async () => {
                                    try {
                                        const titleText = `${props.currentInstitution?.name || 'Security Registry'} - Visitor History`;
                                        const uri = await generateVisitorHistoryPdf(
                                            filteredRepVisitors,
                                            titleText,
                                            props.currentInstitution?.letterheadConfig,
                                            props.currentInstitution?.logoUrl || null,
                                            props.currentInstitution?.footerImageUrl || null,
                                            localUsers,
                                            props.currentInstitution!
                                        );
                                        setPdfUrl(uri);
                                    } catch (err: any) {
                                        alert(err.message || 'Error generating visitor history PDF');
                                    }
                                }}
                                className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/20"
                            >
                                <PrinterIcon className="w-4 h-4" /> Export PDF Report
                            </button>
                        </div>

                        {/* Summary Metrics Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Check-ins</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{totalVisitors}</h3>
                                    <p className="text-[9px] text-indigo-500 font-bold uppercase mt-1">Vetted & cleared logs</p>
                                </div>
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                                    <UserIcon className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active On-Premises</p>
                                    <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</h3>
                                    <p className="text-[9px] text-emerald-500 font-bold uppercase mt-1">Currently inside campus</p>
                                </div>
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                                    <ClockIcon className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Average Stay</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{avgDuration} <span className="text-xs font-black">mins</span></h3>
                                    <p className="text-[9px] text-indigo-500 font-bold uppercase mt-1">Stay duration average</p>
                                </div>
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                                    <TrendingUpIcon className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Peak Entry Hour</p>
                                    <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                                        {maxHourCount > 0 ? `${peakHour % 12 || 12}:00 ${peakHour >= 12 ? 'PM' : 'AM'}` : 'N/A'}
                                    </h3>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Highest frequency gate flow</p>
                                </div>
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                                    <MapPinIcon className="w-6 h-6" />
                                </div>
                            </div>
                        </div>

                        {/* Detailed Analysis Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Visitor Purpose Distribution */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h4 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white mb-6">Entry Purpose Distribution</h4>
                                <div className="space-y-4">
                                    {Object.entries(purposeCounts).map(([cat, count]) => {
                                        const pct = totalVisitors > 0 ? Math.round((count / totalVisitors) * 100) : 0;
                                        return (
                                            <div key={cat} className="space-y-2">
                                                <div className="flex justify-between text-xs font-black uppercase text-slate-650 dark:text-slate-350">
                                                    <span>{cat}</span>
                                                    <span>{count} ({pct}%)</span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden">
                                                    <div 
                                                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                                                        style={{ width: `${pct}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {Object.keys(purposeCounts).length === 0 && (
                                        <p className="text-xs text-slate-400 font-bold uppercase text-center py-10">No categorical visitor data within range</p>
                                    )}
                                </div>
                            </div>

                            {/* Gate Flow Hourly Analysis */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h4 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white mb-6">Hourly Gate Activity Index</h4>
                                <div className="h-48 flex items-end justify-between gap-1 pt-6 border-b border-slate-100 dark:border-slate-700">
                                    {hourlyCounts.slice(7, 19).map((count, idx) => {
                                        const hr = idx + 7;
                                        const maxVal = Math.max(...hourlyCounts) || 1;
                                        const hPct = Math.min(100, Math.round((count / maxVal) * 100));
                                        return (
                                            <div key={hr} className="flex flex-col items-center flex-1 h-full group justify-end">
                                                <div className="relative w-full flex justify-center">
                                                    <span className="absolute bottom-full mb-1 bg-slate-900 text-white text-[9px] font-black p-1 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow z-10">
                                                        {count} Check-ins
                                                    </span>
                                                </div>
                                                <div 
                                                    className="w-full max-w-[16px] bg-indigo-500/20 group-hover:bg-indigo-600 rounded-t-md transition-all duration-300"
                                                    style={{ height: `${hPct}%` }}
                                                ></div>
                                                <span className="text-[8px] font-black text-slate-400 mt-2 uppercase">
                                                    {hr > 12 ? `${hr-12}p` : `${hr}a`}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Recent Suspicious Activity / Security Incidents analysis */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <h4 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white mb-6">Alerts & Incidents Diagnostics</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-5 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/40">
                                    <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">Active Alerts</span>
                                    <h3 className="text-2xl font-black text-red-650 dark:text-red-400 mt-1">
                                        {securityAlerts.filter(a => a.status === 'active').length}
                                    </h3>
                                    <p className="text-[9px] text-red-500 font-bold uppercase mt-1">Immediate response required</p>
                                </div>

                                <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                                    <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Resolved Threat Vector</span>
                                    <h3 className="text-2xl font-black text-emerald-655 dark:text-emerald-400 mt-1">
                                        {securityAlerts.filter(a => a.status === 'resolved').length}
                                    </h3>
                                    <p className="text-[9px] text-emerald-500 font-bold uppercase mt-1">Mitigated security risks</p>
                                </div>

                                <div className="p-5 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                                    <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Total Incidents Vetted</span>
                                    <h3 className="text-2xl font-black text-indigo-650 dark:text-indigo-400 mt-1">
                                        {securityAlerts.length}
                                    </h3>
                                    <p className="text-[9px] text-indigo-500 font-bold uppercase mt-1">Aggregated logs overview</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {activeTab === 'logs' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Active Registry</h3>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Currently identified personnel on premises</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[10px] font-black uppercase text-emerald-600">Secure Live Status</span>
                            </div>
                        </div>

                        {/* Search Bar for Active Registry */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="relative w-full max-w-md">
                                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={activeSearch}
                                    onChange={(e) => {
                                        setActiveSearch(e.target.value);
                                        setActivePage(1);
                                    }}
                                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs"
                                    placeholder="Search by name, phone, plate, host..."
                                />
                            </div>
                            {selectedVisitorIds.length > 0 && (
                                <div className="flex items-center gap-4 bg-indigo-50 dark:bg-indigo-950/40 p-3 px-6 rounded-2xl border border-indigo-100 dark:border-indigo-900 animate-fade-in">
                                    <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                                        {selectedVisitorIds.length} Guest{selectedVisitorIds.length > 1 ? 's' : ''} Selected
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBulkCheckoutDate(new Date().toISOString().split('T')[0]);
                                            setBulkCheckoutTime(new Date().toTimeString().split(' ')[0].substring(0, 5));
                                            setShowBulkCheckoutModal(true);
                                        }}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md shadow-indigo-600/20"
                                    >
                                        Bulk Checkout
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                                <thead>
                                    <tr>
                                        <th className="w-10 px-4 py-3 text-left">
                                            <input 
                                                type="checkbox"
                                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                                checked={paginatedActiveVisitors.length > 0 && paginatedActiveVisitors.every(v => selectedVisitorIds.includes(v.id))}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        const newSelections = [...selectedVisitorIds];
                                                        paginatedActiveVisitors.forEach(v => {
                                                            if (!newSelections.includes(v.id)) {
                                                                newSelections.push(v.id);
                                                            }
                                                        });
                                                        setSelectedVisitorIds(newSelections);
                                                    } else {
                                                        setSelectedVisitorIds(prev => prev.filter(id => !paginatedActiveVisitors.some(v => v.id === id)));
                                                    }
                                                }}
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Visitor / Name</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Time</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Host / Destination</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Assets</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-900/50">
                                    {paginatedActiveVisitors.map(v => {
                                        const host = users.find(u => u.id === v.hostId);
                                        return (
                                            <tr key={v.id} className={`group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors ${exitingVisitorIds.includes(v.id) ? 'visitor-checkout-exit' : ''}`}>
                                                <td className="w-10 px-4 py-4">
                                                    <input 
                                                        type="checkbox"
                                                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                                        checked={selectedVisitorIds.includes(v.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedVisitorIds(prev => [...prev, v.id]);
                                                            } else {
                                                                setSelectedVisitorIds(prev => prev.filter(id => id !== v.id));
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 font-black text-xs shadow-inner">
                                                            {v.name?.charAt(0) || ''}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-slate-800 dark:text-white uppercase text-sm flex items-center gap-2">
                                                                {v.name || 'Unknown'}
                                                                {v.status === 'pending_authorization' && (
                                                                    <span className="px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/25 text-yellow-600 dark:text-yellow-400 font-black text-[8px] rounded-md uppercase tracking-wider shrink-0">Pending Auth</span>
                                                                )}
                                                                {v.status === 'authorized' && (
                                                                    <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-black text-[8px] rounded-md uppercase tracking-wider shrink-0">Authorized</span>
                                                                )}
                                                                {v.status === 'declined' && (
                                                                    <span className="px-1.5 py-0.5 bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 font-black text-[8px] rounded-md uppercase tracking-wider shrink-0">Declined</span>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                                <div className="text-[10px] text-slate-500 font-bold">{v.phoneNumber}</div>
                                                                {v.idNumber && (
                                                                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">ID: {v.idNumber}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <ClockIcon className="w-3.5 h-3.5 text-indigo-500" />
                                                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{v.timeIn}</span>
                                                    </div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-tight mt-1">{v.visitDate}</div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase truncate max-w-[150px]">{v.hostName ? `${v.hostName} (via Reception)` : (host?.name || 'N/A')}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{v.purpose}</div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {v.vehiclePlate ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[9px] rounded-md border border-slate-700 text-center shadow-sm">{v.vehiclePlate}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 truncate max-w-[100px] uppercase">{v.vehicleModel}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest opacity-50">Pedestrian</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewGatePassForVisitor(v)}
                                                            className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95 border border-indigo-100 dark:border-indigo-900/50"
                                                        >
                                                            View Pass
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                setExitingVisitorIds(prev => [...prev, v.id]);
                                                                setTimeout(async () => {
                                                                    onCheckoutVisitor?.(v.id);
                                                                    await onLogAction?.(`Checked out visitor: ${v.name}`);
                                                                    setExitingVisitorIds(prev => prev.filter(id => id !== v.id));
                                                                }, 400);
                                                            }}
                                                            className="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 border border-red-100 dark:border-red-900/50"
                                                        >
                                                            Finalize Exit
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredActiveVisitors.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-20 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full mb-3 opacity-50">
                                                        <ClipboardListIcon className="w-8 h-8 text-slate-300" />
                                                    </div>
                                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No matching active records found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Active Registry Pagination */}
                        {filteredActiveVisitors.length > ITEMS_PER_PAGE && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Showing {(activePageIndex - 1) * ITEMS_PER_PAGE + 1} to {Math.min(activePageIndex * ITEMS_PER_PAGE, filteredActiveVisitors.length)} of {filteredActiveVisitors.length} entries
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setActivePage(prev => Math.max(prev - 1, 1))}
                                        disabled={activePageIndex === 1}
                                        className="px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-650 dark:text-slate-350 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border border-slate-100 dark:border-slate-800"
                                    >
                                        Previous
                                    </button>
                                    {Array.from({ length: totalActivePages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalActivePages || Math.abs(p - activePageIndex) <= 1)
                                        .map((p, index, array) => {
                                            const showEllipsis = index > 0 && p - array[index - 1] > 1;
                                            return (
                                                <React.Fragment key={p}>
                                                    {showEllipsis && <span className="px-2 self-center text-slate-400">...</span>}
                                                    <button
                                                        onClick={() => setActivePage(p)}
                                                        className={`w-8 h-8 rounded-xl font-black text-[10px] transition-all flex items-center justify-center ${activePageIndex === p ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150 dark:shadow-none' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
                                                    >
                                                        {p}
                                                    </button>
                                                </React.Fragment>
                                            );
                                        })
                                    }
                                    <button
                                        onClick={() => setActivePage(prev => Math.min(prev + 1, totalActivePages))}
                                        disabled={activePageIndex === totalActivePages}
                                        className="px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-650 dark:text-slate-350 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border border-slate-100 dark:border-slate-800"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <ArchiveBoxIcon className="w-32 h-32 text-slate-900 dark:text-white" />
                        </div>
                        <div className="mb-6">
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Checkout History</h3>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Archive of previous visitors</p>
                        </div>

                        {/* Search Bar for History */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="relative w-full max-w-md">
                                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={historySearch}
                                    onChange={(e) => {
                                        setHistorySearch(e.target.value);
                                        setHistoryPage(1);
                                    }}
                                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs"
                                    placeholder="Search history by name, phone, plate, purpose..."
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                                <thead>
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Visitor / Contact</th>
                                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Visit Date</th>
                                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry / Exit</th>
                                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Purpose</th>
                                                        <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-900/50">
                                    {paginatedHistoryVisitors.map(v => (
                                        <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                                            <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">
                                                <div>{v.name}</div>
                                                <div className="text-[10px] text-slate-400 font-normal">{v.phoneNumber || 'NO CONTACT'}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-400">{v.visitDate}</td>
                                            <td className="px-4 py-3 text-[11px] font-black uppercase space-y-0.5">
                                                <div className="text-indigo-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> {v.timeIn}</div>
                                                <div className="text-slate-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> {v.timeOut}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-lg truncate">
                                                    {formatDuration(v.timeIn, v.timeOut)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{v.purpose}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewGatePassForVisitor(v)}
                                                    className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95 border border-indigo-100 dark:border-indigo-900/50"
                                                >
                                                    View Pass
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredHistoryVisitors.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">No matching history records found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* History Pagination */}
                        {filteredHistoryVisitors.length > ITEMS_PER_PAGE && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Showing {(historyPageIndex - 1) * ITEMS_PER_PAGE + 1} to {Math.min(historyPageIndex * ITEMS_PER_PAGE, filteredHistoryVisitors.length)} of {filteredHistoryVisitors.length} entries
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                                        disabled={historyPageIndex === 1}
                                        className="px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-650 dark:text-slate-350 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border border-slate-100 dark:border-slate-800"
                                    >
                                        Previous
                                    </button>
                                    {Array.from({ length: totalHistoryPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalHistoryPages || Math.abs(p - historyPageIndex) <= 1)
                                        .map((p, index, array) => {
                                            const showEllipsis = index > 0 && p - array[index - 1] > 1;
                                            return (
                                                <React.Fragment key={p}>
                                                    {showEllipsis && <span className="px-2 self-center text-slate-400">...</span>}
                                                    <button
                                                        onClick={() => setHistoryPage(p)}
                                                        className={`w-8 h-8 rounded-xl font-black text-[10px] transition-all flex items-center justify-center ${historyPageIndex === p ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150 dark:shadow-none' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
                                                    >
                                                        {p}
                                                    </button>
                                                </React.Fragment>
                                            );
                                        })
                                    }
                                    <button
                                        onClick={() => setHistoryPage(prev => Math.min(prev + 1, totalHistoryPages))}
                                        disabled={historyPageIndex === totalHistoryPages}
                                        className="px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-655 dark:text-slate-355 hover:bg-indigo-600 hover:text-white disabled:opacity-50 disabled:pointer-events-none rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border border-slate-100 dark:border-slate-800"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {showBulkCheckoutModal && (
                <div className="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 animate-zoom-in text-slate-900 dark:text-white">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Bulk Guest Checkout</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase mt-1">Configure exit date & time for {selectedVisitorIds.length} guests</p>
                            </div>
                            <button 
                                onClick={() => setShowBulkCheckoutModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Checkout Date</label>
                                <input
                                    type="date"
                                    value={bulkCheckoutDate}
                                    onChange={(e) => setBulkCheckoutDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Checkout Time</label>
                                <input
                                    type="time"
                                    value={bulkCheckoutTime}
                                    onChange={(e) => setBulkCheckoutTime(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                type="button"
                                onClick={() => setShowBulkCheckoutModal(false)}
                                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    setExitingVisitorIds(prev => [...prev, ...selectedVisitorIds]);
                                    setTimeout(async () => {
                                        for (const id of selectedVisitorIds) {
                                            const v = visitors.find(x => x.id === id);
                                            if (v) {
                                                await props.onUpdateVisitor?.(id, {
                                                    timeOut: bulkCheckoutTime,
                                                    visitDate: bulkCheckoutDate
                                                });
                                                await onLogAction?.(`Bulk checked out visitor: ${v.name} at ${bulkCheckoutTime} on ${bulkCheckoutDate}`);
                                            }
                                        }
                                        setExitingVisitorIds(prev => prev.filter(id => !selectedVisitorIds.includes(id)));
                                        setSelectedVisitorIds([]);
                                        setShowBulkCheckoutModal(false);
                                        alert('Successfully checked out selected visitors in bulk!');
                                    }, 400);
                                }}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                            >
                                Confirm Checkout
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {isRegistering && (
                <div className="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col border border-slate-200 dark:border-slate-800 animate-fade-in-up" style={{maxHeight:'95vh'}}>
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                            <h3 className="text-xl font-black uppercase tracking-tight">Visitor Entry Card</h3>
                            <button onClick={() => setIsRegistering(false)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleRegisterWalkIn} className="p-5 space-y-4 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Phone Number (Lookup)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="tel"
                                            className="form-input"
                                            value={walkInForm.phone}
                                            onChange={(e) => setWalkInForm({ ...walkInForm, phone: e.target.value })}
                                            placeholder="07..."
                                            required
                                        />
                                        <button type="button" onClick={handleVisitorLookup} className="px-4 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shrink-0">
                                            {lookupStatus === 'searching' ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <MagnifyingGlassIcon className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {lookupStatus === 'found' && <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase">Returning Visitor Identified</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">National ID / Passport</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={walkInForm.idNumber}
                                        onChange={(e) => setWalkInForm({ ...walkInForm, idNumber: e.target.value })}
                                        placeholder="e.g. 12345678"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Full Name</label>
                                    <input type="text" className="form-input" value={walkInForm.name} onChange={(e) => setWalkInForm({ ...walkInForm, name: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Purpose of Visit</label>
                                    <select className="form-select" value={walkInForm.purpose} onChange={(e) => setWalkInForm({ ...walkInForm, purpose: e.target.value })} required>
                                        <option value="">Select Purpose</option>
                                        <option value="Official">Official Business</option>
                                        <option value="Personal">Personal Visit</option>
                                        <option value="Delivery">Delivery / Courier</option>
                                        <option value="Service">Maintenance / Service</option>
                                    </select>
                                </div>
                            </div>

                            {/* Today's Events — optional event check-in */}
                            {todaysActiveEvents.length > 0 && (
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <label className="block text-[10px] font-black uppercase mb-2 ml-1" style={{color: selectedEventId ? '#6366f1' : undefined}}>
                                        🎫 Attending Today's Event <span className="text-slate-400 normal-case font-semibold">(optional)</span>
                                    </label>
                                    <select
                                        className="form-select"
                                        value={selectedEventId}
                                        onChange={(e) => {
                                            setSelectedEventId(e.target.value);
                                            if (e.target.value) {
                                                setWalkInForm(prev => ({ ...prev, purpose: 'Event Attendance' }));
                                            }
                                        }}
                                    >
                                        <option value="">-- Not attending an event --</option>
                                        {todaysActiveEvents.map(ev => (
                                            <option key={ev.id} value={ev.id}>
                                                {ev.title}{ev.eventTime ? ` — ${ev.eventTime}` : ''}{ev.venue ? ` @ ${ev.venue}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedEventId && (
                                        <p className="text-[10px] font-bold text-indigo-500 mt-1.5 ml-1 uppercase tracking-wide">
                                            ✓ Visitor will be checked in to this event on entry
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="relative">
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Host / Personnel To See</label>
                                {/* Searchable host picker */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="form-input pr-10"
                                        placeholder="Search by name or role..."
                                        value={hostSearch}
                                        autoComplete="off"
                                        onFocus={() => setShowHostDropdown(true)}
                                        onChange={(e) => {
                                            setHostSearch(e.target.value);
                                            setShowHostDropdown(true);
                                            // Clear selection if user starts typing again
                                            if (walkInForm.hostId && walkInForm.hostId !== 'other_custom') {
                                                setWalkInForm({ ...walkInForm, hostId: '' });
                                            }
                                        }}
                                    />
                                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                                {showHostDropdown && (
                                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-h-56 overflow-y-auto">
                                        {(() => {
                                            const q = hostSearch.toLowerCase();
                                            const filtered = users.filter(u =>
                                                u.role !== 'student' && u.role !== 'parent' &&
                                                (u.name?.toLowerCase().includes(q) || formatRoleDisplayName(u.role, props.currentInstitution).toLowerCase().includes(q))
                                            );
                                            return (
                                                <>
                                                    {filtered.length === 0 && (
                                                        <div className="px-4 py-3 text-xs text-slate-400 font-bold uppercase tracking-widest">No staff found</div>
                                                    )}
                                                    {filtered.map(u => (
                                                        <button
                                                            key={u.id}
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => {
                                                                setWalkInForm({ ...walkInForm, hostId: u.id });
                                                                setHostSearch(`${u.name} (${formatRoleDisplayName(u.role, props.currentInstitution)})`);
                                                                setShowHostDropdown(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors flex items-center justify-between gap-2 ${
                                                                walkInForm.hostId === u.id ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600' : 'text-slate-800 dark:text-slate-200'
                                                            }`}
                                                        >
                                                            <span>{u.name}</span>
                                                            <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full shrink-0">{formatRoleDisplayName(u.role, props.currentInstitution)}</span>
                                                        </button>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => {
                                                            setWalkInForm({ ...walkInForm, hostId: 'other_custom' });
                                                            setHostSearch('-- Other (Direct to Receptionist) --');
                                                            setShowHostDropdown(false);
                                                        }}
                                                        className="w-full text-left px-4 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border-t border-slate-100 dark:border-slate-800 transition-colors"
                                                    >
                                                        Other — Not on list (Direct to Receptionist)
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                                {/* Click-outside to close */}
                                {showHostDropdown && (
                                    <div className="fixed inset-0 z-40" onClick={() => setShowHostDropdown(false)} />
                                )}
                                {/* Hidden native input for form validation */}
                                <input type="text" required value={walkInForm.hostId} onChange={() => {}} className="sr-only" aria-hidden />
                            </div>
                            {walkInForm.hostId === 'other_custom' && (
                                <div className="animate-fade-in-up">
                                    <label className="block text-[10px] font-black uppercase text-slate-450 mb-2 ml-1">Custom Host Name</label>
                                    <input
                                        type="text"
                                        value={customHostName}
                                        onChange={(e) => setCustomHostName(e.target.value)}
                                        className="form-input"
                                        placeholder="Type name of the person to see..."
                                        required={walkInForm.hostId === 'other_custom'}
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Vehicle Plate (Optional)</label>
                                    <input type="text" className="form-input font-mono uppercase" value={walkInForm.vehiclePlate} onChange={(e) => setWalkInForm({ ...walkInForm, vehiclePlate: e.target.value })} placeholder="KAA 001A" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Vehicle Model</label>
                                    <input type="text" className="form-input" value={walkInForm.vehicleModel} onChange={(e) => setWalkInForm({ ...walkInForm, vehicleModel: e.target.value })} placeholder="e.g. Toyota Prado" />
                                </div>
                            </div>

                            {/* ── Signatures Row: Visitor + Host ── */}
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-3 ml-1">Signatures</p>
                                <div className="grid grid-cols-2 gap-4">

                                    {/* Visitor Signature */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[10px] font-black uppercase text-emerald-600">Visitor Sign</label>
                                            {visitorSignature && (
                                                <button type="button" onClick={() => {
                                                    setVisitorSignature('');
                                                    const c = visitorSigCanvasRef.current;
                                                    if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
                                                }} className="text-[9px] font-black uppercase text-red-400 hover:text-red-600 transition-colors">Clear</button>
                                            )}
                                        </div>
                                        <div className={`relative rounded-xl border-2 transition-colors overflow-hidden bg-white dark:bg-slate-950 ${visitorSignature ? 'border-emerald-400' : 'border-dashed border-emerald-200 dark:border-emerald-900'}`}>
                                            <canvas
                                                ref={visitorSigCanvasRef}
                                                width={220} height={100}
                                                className="w-full touch-none cursor-crosshair block"
                                                onPointerDown={(e) => {
                                                    const c = visitorSigCanvasRef.current; if (!c) return;
                                                    c.setPointerCapture(e.pointerId);
                                                    isVisitorDrawingRef.current = true;
                                                    const r = c.getBoundingClientRect();
                                                    lastVisitorPointRef.current = { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
                                                }}
                                                onPointerMove={(e) => {
                                                    if (!isVisitorDrawingRef.current) return;
                                                    const c = visitorSigCanvasRef.current; if (!c) return;
                                                    const ctx = c.getContext('2d'); if (!ctx || !lastVisitorPointRef.current) return;
                                                    const r = c.getBoundingClientRect();
                                                    const x = (e.clientX - r.left) * (c.width / r.width);
                                                    const y = (e.clientY - r.top) * (c.height / r.height);
                                                    ctx.beginPath(); ctx.moveTo(lastVisitorPointRef.current.x, lastVisitorPointRef.current.y);
                                                    ctx.lineTo(x, y); ctx.strokeStyle = '#059669'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
                                                    lastVisitorPointRef.current = { x, y };
                                                }}
                                                onPointerUp={() => {
                                                    isVisitorDrawingRef.current = false; lastVisitorPointRef.current = null;
                                                    const c = visitorSigCanvasRef.current;
                                                    if (c) setVisitorSignature(c.toDataURL('image/png'));
                                                }}
                                                onPointerLeave={() => { isVisitorDrawingRef.current = false; lastVisitorPointRef.current = null; }}
                                            />
                                            {!visitorSignature && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
                                                    <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">I acknowledge entry</p>
                                                    <p className="text-[9px] text-slate-300">Sign with finger</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Host Signature */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[10px] font-black uppercase text-indigo-600">Host Sign</label>
                                            {hostSignature && (
                                                <button type="button" onClick={() => {
                                                    setHostSignature('');
                                                    const c = sigCanvasRef.current;
                                                    if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
                                                }} className="text-[9px] font-black uppercase text-red-400 hover:text-red-600 transition-colors">Clear</button>
                                            )}
                                        </div>
                                        <div className={`relative rounded-xl border-2 transition-colors overflow-hidden bg-white dark:bg-slate-950 ${hostSignature ? 'border-indigo-400' : 'border-dashed border-indigo-200 dark:border-indigo-900'}`}>
                                            <canvas
                                                ref={sigCanvasRef}
                                                width={220} height={100}
                                                className="w-full touch-none cursor-crosshair block"
                                                onPointerDown={(e) => {
                                                    const c = sigCanvasRef.current; if (!c) return;
                                                    c.setPointerCapture(e.pointerId);
                                                    isDrawingRef.current = true;
                                                    const r = c.getBoundingClientRect();
                                                    lastPointRef.current = { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
                                                }}
                                                onPointerMove={(e) => {
                                                    if (!isDrawingRef.current) return;
                                                    const c = sigCanvasRef.current; if (!c) return;
                                                    const ctx = c.getContext('2d'); if (!ctx || !lastPointRef.current) return;
                                                    const r = c.getBoundingClientRect();
                                                    const x = (e.clientX - r.left) * (c.width / r.width);
                                                    const y = (e.clientY - r.top) * (c.height / r.height);
                                                    ctx.beginPath(); ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
                                                    ctx.lineTo(x, y); ctx.strokeStyle = '#4f46e5'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
                                                    lastPointRef.current = { x, y };
                                                }}
                                                onPointerUp={() => {
                                                    isDrawingRef.current = false; lastPointRef.current = null;
                                                    const c = sigCanvasRef.current;
                                                    if (c) setHostSignature(c.toDataURL('image/png'));
                                                }}
                                                onPointerLeave={() => { isDrawingRef.current = false; lastPointRef.current = null; }}
                                            />
                                            {!hostSignature && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
                                                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide">I authorize entry</p>
                                                    <p className="text-[9px] text-slate-300">Sign with finger</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <button type="submit" className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 mt-2">
                                Authorize Entry
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isScanning && (
                <LicensePlateScanner
                    onClose={() => setIsScanning(false)}
                    onPlateDetected={(plate) => {
                        setWalkInForm(prev => ({ ...prev, vehiclePlate: plate }));
                        setIsScanning(false);
                        setIsRegistering(true);
                    }}
                />
            )}

            {pdfUrl && (
                <PdfPreviewModal
                    url={pdfUrl}
                    onClose={() => setPdfUrl(null)}
                    filename={`Security_Report_${Date.now()}.pdf`}
                />
            )}
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; }
                .dark .form-input { border-color: #334155; background-color: #0f172a; color: #fff; }
                @keyframes visitorExit {
                    0% {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(-30px);
                        background-color: rgba(239, 68, 68, 0.08);
                    }
                }
                .visitor-checkout-exit {
                    animation: visitorExit 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                    pointer-events: none;
                }
            `}</style>
        </BaseDashboard>
    );
};

export const StoreView: React.FC<SupportStaffViewProps> = (props) => {
    const { 
        user = { name: 'User', institutionId: '' } as any,
        inventory = [], 
        suppliers = [], 
        users = [], 
        stockTransactions = [], 
        onAddItem, 
        onAddItems, 
        onAddStoreTransaction, 
        countyInventory = [], 
        onMarkInventoryReceived,
        onSwitchPerspective,
        onAddSupplier,
        onAddUser,
        onEditUser,
        onDeleteUser,
        onAddDepartment,
        onUpdateDepartment,
        onDeleteDepartment,
        onImportStudents,
        onImportUsers,
        departments = [],
        smsConfig,
        subjects,
        courses,
        letterheadConfig,
        logoUrl,
        footerImageUrl,
        onSendSms,
        companyDetails,
        onAddTransaction,
        onLogAction,
        onRefreshData
    } = props;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'history' | 'suppliers' | 'shipments' | 'issuance' | 'reports' | 'students' | 'departments' | 'staff'>('dashboard');
    const [activeReportTab, setActiveReportTab] = useState<'summary' | 'registry' | 'issuance' | 'statements' | 'analytics'>('summary');

    // Reporting Filters
    const [registrySearch, setRegistrySearch] = useState('');
    const [registryCategory, setRegistryCategory] = useState('');
    const [issuanceSearch, setIssuanceSearch] = useState('');
    const [issuanceSubTab, setIssuanceSubTab] = useState<'all' | 'staff' | 'student'>('all');
    const [issuanceStartDate, setIssuanceStartDate] = useState('');
    const [issuanceEndDate, setIssuanceEndDate] = useState('');
    const [statementSearch, setStatementSearch] = useState('');
    const [statementStartDate, setStatementStartDate] = useState('');
    const [statementEndDate, setStatementEndDate] = useState('');
    const [statementType, setStatementType] = useState<string>('');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
    const isCountyManaged = Boolean(props.currentInstitution?.countyId);

    const pendingShipments = useMemo(() => countyInventory.filter(i => i.status === 'in_transit'), [countyInventory]);

    const issuanceHistory = useMemo(() => (stockTransactions || []).filter(t => t.type === 'Issue'), [stockTransactions]);
    const lowStockItems = useMemo(() => inventory.filter(i => i.quantity <= (i.reorderLevel ?? 0)), [inventory]);
    
    const expiringItems = useMemo(() => {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return inventory.filter(i => i.expiryDate && new Date(i.expiryDate) <= thirtyDaysFromNow);
    }, [inventory]);

    const filteredUsers = useMemo(() => {
        const instId = props.currentInstitution?.id || user?.institutionId;
        if (!instId) return users;
        return users.filter(u => u.institutionId === instId);
    }, [users, props.currentInstitution?.id, user?.institutionId]);

    const students = useMemo(() => filteredUsers.filter(u => u.role === 'student'), [filteredUsers]);
    const staff = useMemo(() => filteredUsers.filter(u => u.role !== 'student' && u.role !== 'parent' && u.role !== 'reseller'), [filteredUsers]);

    return (
        <BaseDashboard 
            title="Institutional Store" 
            icon={<ArchiveBoxIcon className="w-6 h-6 text-slate-600" />}
        >
            <div className="absolute top-24 right-8 flex items-center gap-3">
                {onSwitchPerspective && (
                    <button 
                        onClick={() => onSwitchPerspective('admin')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 dark:border-slate-700"
                    >
                        <ShieldIcon className="w-3.5 h-3.5" />
                        Admin Perspective
                    </button>
                )}
            </div>
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-8 overflow-x-auto pb-2 custom-scrollbar-horizontal">
                    {[
                        { id: 'dashboard', label: 'Dashboard' },
                        { id: 'inventory', label: 'Inventory' },
                        { id: 'issuance', label: 'Issuance' },
                        ...(isCountyManaged ? [{ id: 'shipments', label: 'County Shipments', count: pendingShipments.length }] : []),
                        { id: 'history', label: 'History' },
                        { id: 'suppliers', label: 'Suppliers' },
                        { id: 'students', label: 'Students', count: students.length },
                        { id: 'departments', label: 'Departments', count: departments.length },
                        { id: 'staff', label: 'Staff', count: staff.length },
                        { id: 'reports', label: 'Reports' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm">{tab.count}</span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-fade-in-up">
                    {/* Hero Stats Nexus - Glassmorphism & Cyber Glimmer */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="relative group overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-200/50 dark:shadow-none border border-white/20 transition-all duration-500 hover:scale-[1.02]">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-400/10 rounded-full blur-3xl" />
                            <h4 className="text-[10px] font-black uppercase text-indigo-100/60 tracking-[0.25em] mb-4">Core Assets</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black text-white tracking-tighter tabular-nums">{inventory.length}</span>
                                <span className="text-indigo-200/80 text-[10px] font-black uppercase tracking-widest">SKUs</span>
                            </div>
                            <div className="mt-6 flex items-center gap-3">
                                <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
                                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" style={{ width: '88%' }} />
                                </div>
                                <span className="text-[9px] font-black text-emerald-300 uppercase tracking-tighter">Operational</span>
                            </div>
                        </div>

                        <div className="relative group overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/50 dark:border-slate-700 transition-all duration-500 hover:scale-[1.02] hover:bg-white dark:hover:bg-slate-800">
                            <div className="absolute top-6 right-8 p-3 bg-rose-50 dark:bg-rose-900/30 rounded-2xl text-rose-500 group-hover:animate-pulse shadow-inner">
                                <ExclamationTriangleIcon className="w-5 h-5" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em] mb-4">Critical Risk</h4>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-5xl font-black tracking-tighter tabular-nums ${lowStockItems.length > 0 ? 'text-rose-600 drop-shadow-[0_0_8px_rgba(225,29,72,0.2)]' : 'text-slate-900 dark:text-white'}`}>
                                    {lowStockItems.length}
                                </span>
                            </div>
                            <div className="mt-6 flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Immediate Action Required</p>
                            </div>
                        </div>

                        {isCountyManaged ? (
                            <div className="relative group overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/50 dark:border-slate-700 transition-all duration-500 hover:scale-[1.02] hover:bg-white dark:hover:bg-slate-800">
                                <div className="absolute top-6 right-8 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl text-amber-500 group-hover:rotate-12 transition-transform duration-500 shadow-inner">
                                    <ArrowUpTrayIcon className="w-5 h-5" />
                                </div>
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em] mb-4">Inbound Stream</h4>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{pendingShipments.length}</span>
                                </div>
                                <div className="mt-6 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                    <ClockIcon className="w-3 h-3" />
                                    <p className="text-[9px] font-black uppercase tracking-widest">Awaiting Verification</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative group overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/50 dark:border-slate-700 transition-all duration-500 hover:scale-[1.02] hover:bg-white dark:hover:bg-slate-800">
                                <div className="absolute top-6 right-8 p-3 bg-violet-50 dark:bg-violet-900/30 rounded-2xl text-violet-500 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                                    <ClockIcon className="w-5 h-5" />
                                </div>
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em] mb-4">Expiry Risk</h4>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-5xl font-black tracking-tighter tabular-nums ${expiringItems.length > 0 ? 'text-violet-600' : 'text-slate-900 dark:text-white'}`}>{expiringItems.length}</span>
                                </div>
                                <div className="mt-6 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-violet-400" />
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Perishables Registry</p>
                                </div>
                            </div>
                        )}

                        <div className="relative group overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/50 dark:border-slate-700 transition-all duration-500 hover:scale-[1.02] hover:bg-white dark:hover:bg-slate-800">
                            <div className="absolute top-6 right-8 p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-500 shadow-inner">
                                <ArrowsRightLeftIcon className="w-5 h-5" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em] mb-4">Dispersal Flow</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{issuanceHistory.length}</span>
                            </div>
                            <div className="mt-6 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <ChartBarIcon className="w-3 h-3" />
                                <p className="text-[9px] font-black uppercase tracking-widest">Active Cycle Record</p>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Nexus & Health Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Transaction Log Cyber-Panel */}
                        <div className="bg-slate-900 dark:bg-slate-950 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group border border-slate-800">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-violet-500/5 pointer-events-none" />
                            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px]" />
                            
                            <div className="flex justify-between items-center mb-10 relative z-10">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Logistics Nexus</h3>
                                    <p className="text-[10px] font-black text-indigo-400/80 mt-1 uppercase tracking-[0.2em]">Real-time Transaction Stream</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                    <ArchiveBoxIcon className="w-6 h-6 text-indigo-400 animate-pulse" />
                                </div>
                            </div>
                            
                            <div className="space-y-4 relative z-10">
                                {(issuanceHistory || []).slice(0, 5).map((t, idx) => (
                                    <div key={t.id} className="group/item flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all duration-300">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-xl flex items-center justify-center border border-white/10">
                                                <span className="text-indigo-300 font-black text-xs">#{idx + 1}</span>
                                            </div>
                                            <div>
                                                <p className="font-black uppercase text-xs tracking-tight text-white group-hover/item:text-indigo-300 transition-colors">{t.itemName}</p>
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{t.recipientOrSupplier}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono font-black text-indigo-400">-{t.quantity}</p>
                                            <p className="text-[9px] text-slate-600 uppercase font-black mt-1">{new Date(t.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                                {issuanceHistory.length === 0 && (
                                    <div className="py-20 text-center text-slate-700 font-black uppercase text-[10px] tracking-[0.3em] border border-dashed border-slate-800 rounded-[2.5rem]">
                                        Logistics Engine Idle
                                    </div>
                                )}
                            </div>
                            
                            <button 
                                onClick={() => setActiveTab('issuance')}
                                className="group w-full mt-10 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl shadow-indigo-950 flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                Enter Central Registry
                                <PlusIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                            </button>
                        </div>

                        {/* Inventory Matrix Visualization */}
                        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-10 rounded-[3.5rem] border border-slate-200/50 dark:border-slate-700 shadow-2xl flex flex-col relative overflow-hidden">
                            <div className="absolute -left-20 -top-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />
                            
                            <div className="flex justify-between items-center mb-12 relative z-10">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Health Matrix</h3>
                                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">Operational Analytics</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                </div>
                            </div>
                            
                            <div className="flex-1 space-y-8 relative z-10">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Asset Integrity</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                                            {Math.round(((inventory.length - lowStockItems.length) / (inventory.length || 1)) * 100)}%
                                        </p>
                                    </div>
                                    <div className="h-4 bg-slate-100 dark:bg-slate-900 rounded-full p-1 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${((inventory.length - lowStockItems.length) / (inventory.length || 1)) * 100}%` }} />
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{inventory.length - lowStockItems.length} Stable Assets Detected</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 transition-all duration-300">
                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-6 group-hover:rotate-6 transition-transform">
                                            <ArchiveBoxIcon className="w-5 h-5" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Categories</p>
                                        <p className="text-3xl font-black text-slate-900 dark:text-white">{new Set(inventory.map(i => i.category)).size}</p>
                                    </div>
                                    <div className="p-8 bg-rose-50/30 dark:bg-rose-900/10 rounded-3xl border border-rose-100/50 dark:border-rose-900/30 group hover:border-rose-300 transition-all duration-300">
                                        <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600 mb-6 group-hover:scale-110 transition-transform">
                                            <ExclamationTriangleIcon className="w-5 h-5" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Criticals</p>
                                        <p className="text-3xl font-black text-rose-600 tabular-nums">{lowStockItems.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 p-6 bg-gradient-to-r from-indigo-500/5 to-transparent dark:from-indigo-500/10 rounded-3xl border border-indigo-100/50 dark:border-indigo-800/30 flex items-center justify-between group cursor-help transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-indigo-600 shadow-sm transition-transform group-hover:scale-110">
                                        <SparklesIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-black uppercase text-xs text-indigo-900 dark:text-indigo-100 tracking-tight">AI Intelligence Layer</p>
                                        <p className="text-[9px] text-indigo-700/70 dark:text-indigo-300/70 font-bold uppercase mt-0.5">Automated Predictive Restock Active</p>
                                    </div>
                                </div>
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-gradient-to-tr from-indigo-400 to-indigo-600" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'inventory' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase tracking-tight">Active Stock Registry</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const check = checkStoreHours(props.currentInstitution);
                                    if (!check.allowed) {
                                        alert(check.reason);
                                        return;
                                    }
                                    setIsImportModalOpen(true);
                                }}
                                className="btn-secondary text-[10px] uppercase font-black tracking-widest h-10 px-6 flex items-center gap-2"
                            >
                                <SparklesIcon className="w-4 h-4" />
                                Smart Import
                            </button>
                            <button
                                onClick={() => {
                                    const check = checkStoreHours(props.currentInstitution);
                                    if (!check.allowed) {
                                        alert(check.reason);
                                        return;
                                    }
                                    setIsAddModalOpen(true);
                                }}
                                className="btn-primary text-[10px] uppercase font-black tracking-widest h-10 px-6"
                            >
                                Add Item
                            </button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 shadow-sm rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-700">
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-900/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Description</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-500 tracking-widest">Type / Expiry</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-500 tracking-widest">Qty / Level</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-500 tracking-widest">Status</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {inventory.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-black uppercase tracking-tight text-slate-800 dark:text-white mb-0.5">{item.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${item.itemType === 'consumable' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {item.itemType || 'Asset'}
                                                </span>
                                                {item.expiryDate && (
                                                    <p className={`text-[10px] font-black mt-1 ${new Date(item.expiryDate) < new Date() ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`}>
                                                        EXP: {new Date(item.expiryDate).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono font-black text-indigo-600">{item.quantity} {item.unit}</td>
                                            <td className="px-6 py-4 text-center">
                                                {item.quantity <= (item.reorderLevel ?? 0) ? (
                                                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-[9px] font-black uppercase tracking-widest">Low Stock</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-[9px] font-black uppercase tracking-widest">Stable</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-indigo-600 hover:underline font-black text-[10px] uppercase tracking-widest">Asset Card</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'suppliers' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="flex justify-between items-center px-2">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Support Network Registry</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verified Institutional Vendors & Suppliers</p>
                        </div>
                        <button 
                            onClick={() => setIsAddSupplierModalOpen(true)}
                            className="btn-primary text-[10px] uppercase font-black tracking-widest h-10 px-6 flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            New Vendor
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(suppliers || []).map(supplier => (
                            <div key={supplier.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4 hover:border-indigo-200 transition-all group relative overflow-hidden">
                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black text-lg">
                                        {supplier.name.charAt(0)}
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${supplier.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {supplier.status}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-base truncate">{supplier.name}</h4>
                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">{supplier.category}</p>
                                </div>
                                <div className="pt-4 border-t border-slate-50 dark:border-slate-700 space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                        <span className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center text-[8px]">📞</span> {supplier.phoneNumber}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 truncate">
                                        <span className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center text-[8px]">✉️</span> {supplier.email}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <span key={star} className={`text-xs ${star <= (supplier.rating || 0) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                                        ))}
                                    </div>
                                    <button className="text-[9px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors">Catalog</button>
                                </div>
                            </div>
                        ))}
                        {(suppliers || []).length === 0 && (
                            <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-300">
                                    <BuildingOfficeIcon className="w-8 h-8" />
                                </div>
                                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No registered suppliers in the system database</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'shipments' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-6 rounded-[2rem] flex items-center gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-2xl text-amber-600">
                            <ArrowUpTrayIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-black text-amber-800 dark:text-amber-200 uppercase tracking-tight">County Distribution Registry</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Verify and acknowledge receipt of items dispatched from Headquarters.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {countyInventory.filter(i => i.status === 'in_transit' || i.status === 'received').map(item => (
                            <div key={item.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group hover:border-indigo-200 transition-all">
                                <div className="flex gap-4 items-center">
                                    <div className={`p-3 rounded-2xl ${item.status === 'received' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                        <ArchiveBoxIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{item.quantity} {item.unit}</span>
                                            <span className="text-[10px] font-black text-slate-400">•</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${item.status === 'received' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {item.status === 'received' ? 'Successfully Received' : 'In Transit'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {item.status === 'in_transit' && (
                                    <button
                                        onClick={() => {
                                            const check = checkStoreHours(props.currentInstitution);
                                            if (!check.allowed) {
                                                alert(check.reason);
                                                return;
                                            }
                                            onMarkInventoryReceived?.(item.id);
                                        }}
                                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95"
                                    >
                                        Mark as Received
                                    </button>
                                )}
                            </div>
                        ))}
                        {countyInventory.filter(i => i.status === 'in_transit' || i.status === 'received').length === 0 && (
                            <div className="py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest bg-slate-50 dark:bg-slate-900/30 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
                                No shipments records found for this institution.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'issuance' && (
                <div className="animate-fade-in-up">
                    <StoreIssuanceManager
                        inventory={inventory}
                        users={filteredUsers}
                        departments={departments}
                        institutionId={user?.institutionId || ''}
                        currentUserId={user?.id || ''}
                        onLogAction={props.onLogAction || (async () => {})}
                        onDataChange={() => {
                            onRefreshData?.();
                            setActiveTab('inventory');
                        }}
                        currentInstitution={props.currentInstitution}
                    />
                </div>
            )}

            {activeTab === 'history' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase tracking-tight">Full Transaction Audit Log</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50">
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qty</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Recipient/Supplier</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {[...(stockTransactions || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-5 font-bold text-slate-400 text-[10px]">{new Date(t.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-5">
                                                <p className="font-black text-slate-900 dark:text-white uppercase text-xs">{t.itemName}</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    t.type === 'Restock' ? 'bg-emerald-50 text-emerald-600' :
                                                    t.type === 'Issue' ? 'bg-indigo-50 text-indigo-600' :
                                                    t.type === 'Adjustment' ? 'bg-amber-50 text-amber-600' :
                                                    'bg-slate-50 text-slate-600'
                                                }`}>
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center font-mono font-black text-slate-900 dark:text-white">{t.quantity}</td>
                                            <td className="px-6 py-5 text-right font-black text-slate-600 dark:text-slate-400 uppercase text-xs">{t.recipientOrSupplier}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="space-y-8 animate-fade-in-up">
                    {/* Sub-tab Navigation */}
                    <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-2xl w-fit border border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => setActiveReportTab('summary')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReportTab === 'summary' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Inventory Summary
                        </button>
                        <button
                            onClick={() => setActiveReportTab('registry')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReportTab === 'registry' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Inventory Registry
                        </button>
                        <button
                            onClick={() => setActiveReportTab('issuance')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReportTab === 'issuance' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Issuance Reports
                        </button>
                        <button
                            onClick={() => setActiveReportTab('statements')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReportTab === 'statements' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            History Statements
                        </button>
                        <button
                            onClick={() => setActiveReportTab('analytics')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReportTab === 'analytics' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Analytics & Insights
                        </button>
                    </div>

                    {activeReportTab === 'summary' && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="flex justify-between items-center">
                                <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-widest">Executive Overview</h3>
                                <button
                                    onClick={async () => {
                                        const dataUri = await generateInventorySummaryPdfDataUri(
                                            inventory,
                                            issuanceHistory,
                                            props.currentInstitution!,
                                            letterheadConfig!,
                                            footerImageUrl!
                                        );
                                        setPdfUrl(dataUri);
                                    }}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                                >
                                    <PrinterIcon className="w-4 h-4" /> Preview Summary PDF
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Stock Health</h4>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{inventory.length - lowStockItems.length}/{inventory.length}</p>
                                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-tighter">Items above reorder level</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm border-l-4 border-l-rose-500">
                                    <h4 className="text-[10px] font-black uppercase text-rose-400 tracking-[0.2em] mb-2">Critical Alerts</h4>
                                    <p className="text-3xl font-black text-rose-600">{lowStockItems.length}</p>
                                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-tighter">Items requiring restock</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-2">Total Issued</h4>
                                    <p className="text-3xl font-black text-indigo-600">{issuanceHistory.length}</p>
                                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-tighter">Total distribution records</p>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black uppercase tracking-tight">Recent Distributions</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Recipient</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qty</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {(issuanceHistory || []).slice(0, 10).map(t => (
                                                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-5 font-black text-slate-900 dark:text-white uppercase text-xs">{t.recipientOrSupplier}</td>
                                                    <td className="px-6 py-5 font-bold text-slate-600 dark:text-slate-400 text-xs">{t.itemName}</td>
                                                    <td className="px-6 py-5 text-center font-mono font-black text-indigo-600">{t.quantity}</td>
                                                    <td className="px-6 py-5 text-right font-bold text-slate-400 text-[10px]">{new Date(t.date).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeReportTab === 'registry' && (
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex-grow">
                                    <input
                                        type="text"
                                        placeholder="Search inventory..."
                                        value={registrySearch}
                                        onChange={(e) => setRegistrySearch(e.target.value)}
                                        className="form-input"
                                    />
                                </div>
                                <select
                                    value={registryCategory}
                                    onChange={(e) => setRegistryCategory(e.target.value)}
                                    className="form-select w-48"
                                >
                                    <option value="">All Categories</option>
                                    {Array.from(new Set(inventory.map(i => i.category).filter(Boolean))).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={async () => {
                                        const filteredItems = inventory.filter(item => {
                                            const matchesSearch = item.name.toLowerCase().includes(registrySearch.toLowerCase());
                                            const matchesCategory = !registryCategory || item.category === registryCategory;
                                            return matchesSearch && matchesCategory;
                                        });
                                        const dataUri = await generateInventoryRegistryPdfDataUri(
                                            filteredItems,
                                            props.currentInstitution!,
                                            letterheadConfig!,
                                            footerImageUrl!
                                        );
                                        setPdfUrl(dataUri);
                                    }}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                                >
                                    <PrinterIcon className="w-4 h-4" /> Preview PDF
                                </button>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Name</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">In Stock</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Value (KES)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {inventory
                                                .filter(item => {
                                                    const matchesSearch = item.name.toLowerCase().includes(registrySearch.toLowerCase());
                                                    const matchesCategory = !registryCategory || item.category === registryCategory;
                                                    return matchesSearch && matchesCategory;
                                                })
                                                .map(item => (
                                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-5">
                                                            <p className="font-black text-slate-900 dark:text-white uppercase text-xs">{item.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{item.unit || 'Units'}</p>
                                                        </td>
                                                        <td className="px-6 py-5 text-xs font-bold text-slate-500 uppercase">{item.category || 'Uncategorized'}</td>
                                                        <td className="px-6 py-5 text-center">
                                                            <span className={`px-3 py-1 rounded-full font-mono font-black text-xs ${Number(item.quantity) <= Number(item.reorderLevel) ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                {item.quantity}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 text-right font-black text-slate-700 dark:text-slate-300">
                                                            {(item.quantity * (item.price || 0))?.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeReportTab === 'issuance' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="md:col-span-1">
                                    <input
                                        type="text"
                                        placeholder="Search recipient..."
                                        value={issuanceSearch}
                                        onChange={(e) => setIssuanceSearch(e.target.value)}
                                        className="form-input"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="date"
                                        value={issuanceStartDate}
                                        onChange={(e) => setIssuanceStartDate(e.target.value)}
                                        className="form-input"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="date"
                                        value={issuanceEndDate}
                                        onChange={(e) => setIssuanceEndDate(e.target.value)}
                                        className="form-input"
                                    />
                                </div>
                                <button
                                    onClick={async () => {
                                        const filteredTxns = issuanceHistory.filter(t => {
                                            const recipient = users.find(u => u.id === t.recipientId);
                                            const matchesRole = issuanceSubTab === 'all' || 
                                                               (issuanceSubTab === 'staff' && recipient?.role !== 'student') || 
                                                               (issuanceSubTab === 'student' && recipient?.role === 'student');
                                            
                                            const matchesSearch = t.recipientOrSupplier?.toLowerCase().includes(issuanceSearch.toLowerCase()) || 
                                                                t.itemName.toLowerCase().includes(issuanceSearch.toLowerCase());
                                            const matchesStart = !issuanceStartDate || new Date(t.date) >= new Date(issuanceStartDate);
                                            const matchesEnd = !issuanceEndDate || new Date(t.date) <= new Date(issuanceEndDate);
                                            return matchesRole && matchesSearch && matchesStart && matchesEnd;
                                        }).map(t => {
                                            const recipient = users.find(u => u.id === t.recipientId);
                                            const course = (courses || []).find(c => c.id === recipient?.courseId);
                                            const level = course?.levels.find(l => l.id === recipient?.courseLevelId);
                                            return {
                                                ...t,
                                                recipientClass: level ? `${course?.shortName || course?.name} ${level.name}` : 'N/A',
                                                recipientDisplayId: recipient?.staffId || t.recipientId?.substring(0, 8) || 'N/A'
                                            };
                                        });
                                        const dataUri = await generateIssuanceReportPdfDataUri(
                                            filteredTxns as any,
                                            props.currentInstitution!,
                                            letterheadConfig!,
                                            footerImageUrl!
                                        );
                                        setPdfUrl(dataUri);
                                    }}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95 whitespace-nowrap"
                                >
                                    <PrinterIcon className="w-4 h-4" /> Preview PDF
                                </button>
                            </div>

                            {/* Sub-tabs for Staff / Student */}
                            <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl w-fit mb-6">
                                {(['all', 'staff', 'student'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setIssuanceSubTab(tab)}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            issuanceSubTab === tab
                                                ? 'bg-white text-indigo-600 shadow-sm'
                                                : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        {tab === 'all' ? 'All Issuances' : tab === 'staff' ? 'Staff Members' : 'Students'}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Recipient</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ID</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Class</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Issued</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qty</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Signature</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {(() => {
                                                const filtered = issuanceHistory.filter(t => {
                                                    const recipient = users.find(u => u.id === t.recipientId);
                                                    const matchesRole = issuanceSubTab === 'all' || 
                                                                       (issuanceSubTab === 'staff' && recipient?.role !== 'student') || 
                                                                       (issuanceSubTab === 'student' && recipient?.role === 'student');
                                                    
                                                    const matchesSearch = t.recipientOrSupplier?.toLowerCase().includes(issuanceSearch.toLowerCase()) || 
                                                                        t.itemName.toLowerCase().includes(issuanceSearch.toLowerCase());
                                                    const matchesStart = !issuanceStartDate || new Date(t.date) >= new Date(issuanceStartDate);
                                                    const matchesEnd = !issuanceEndDate || new Date(t.date) <= new Date(issuanceEndDate);
                                                    return matchesRole && matchesSearch && matchesStart && matchesEnd;
                                                });

                                                if (filtered.length === 0) {
                                                    return (
                                                        <tr>
                                                            <td colSpan={7} className="px-6 py-12 text-center">
                                                                <div className="flex flex-col items-center gap-3">
                                                                    <div className="p-4 bg-slate-50 rounded-full">
                                                                        <ArchiveBoxIcon className="w-8 h-8 text-slate-300" />
                                                                    </div>
                                                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No matching issuances found</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                return filtered.map(t => {
                                                    const recipient = users.find(u => u.id === t.recipientId);
                                                    const course = (courses || []).find(c => c.id === recipient?.courseId);
                                                    const level = course?.levels.find(l => l.id === recipient?.courseLevelId);
                                                    const className = level ? `${course?.shortName || course?.name} ${level.name}` : 'N/A';

                                                    return (
                                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-5 font-black text-slate-900 dark:text-white uppercase text-xs">{t.recipientOrSupplier}</td>
                                                            <td className="px-6 py-5 font-bold text-slate-400 text-[10px]">{recipient?.staffId || t.recipientId?.substring(0, 8) || 'N/A'}</td>
                                                            <td className="px-6 py-5 font-bold text-slate-400 text-[10px] uppercase">{className}</td>
                                                            <td className="px-6 py-5 font-bold text-slate-600 dark:text-slate-400 text-xs">{t.itemName}</td>
                                                            <td className="px-6 py-5 text-center font-mono font-black text-indigo-600">{t.quantity}</td>
                                                            <td className="px-6 py-5 text-center">
                                                                {t.signature ? (
                                                                    <img loading="lazy" src={t.signature} alt="Sign" className="h-6 w-auto mx-auto border border-slate-100 rounded bg-white shadow-sm" />
                                                                ) : (
                                                                    <span className="text-[8px] text-slate-300 font-black uppercase">None</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-5 text-right font-bold text-slate-400 text-[10px]">{new Date(t.date).toLocaleDateString()}</td>
                                                        </tr>
                                                    );
                                                })})()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeReportTab === 'statements' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="md:col-span-1">
                                    <input
                                        type="text"
                                        placeholder="Search item/party..."
                                        value={statementSearch}
                                        onChange={(e) => setStatementSearch(e.target.value)}
                                        className="form-input"
                                    />
                                </div>
                                <select
                                    value={statementType}
                                    onChange={(e) => setStatementType(e.target.value)}
                                    className="form-select"
                                >
                                    <option value="">All Types</option>
                                    <option value="Restock">Restock</option>
                                    <option value="Issue">Issue</option>
                                    <option value="Adjustment">Adjustment</option>
                                    <option value="Dispatch">Dispatch</option>
                                </select>
                                <div>
                                    <input
                                        type="date"
                                        value={statementStartDate}
                                        onChange={(e) => setStatementStartDate(e.target.value)}
                                        className="form-input"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="date"
                                        value={statementEndDate}
                                        onChange={(e) => setStatementEndDate(e.target.value)}
                                        className="form-input"
                                    />
                                </div>
                                <button
                                    onClick={async () => {
                                        const filteredTxns = stockTransactions.filter(t => {
                                            const matchesSearch = t.recipientOrSupplier?.toLowerCase().includes(statementSearch.toLowerCase()) || 
                                                                t.itemName.toLowerCase().includes(statementSearch.toLowerCase());
                                            const matchesType = !statementType || t.type === statementType;
                                            const matchesStart = !statementStartDate || new Date(t.date) >= new Date(statementStartDate);
                                            const matchesEnd = !statementEndDate || new Date(t.date) <= new Date(statementEndDate);
                                            return matchesSearch && matchesType && matchesStart && matchesEnd;
                                        });
                                        const dataUri = await generateInventoryStatementPdfDataUri(
                                            filteredTxns,
                                            props.currentInstitution!,
                                            letterheadConfig!,
                                            footerImageUrl!
                                        );
                                        setPdfUrl(dataUri);
                                    }}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95 whitespace-nowrap"
                                >
                                    <PrinterIcon className="w-4 h-4" /> Preview PDF
                                </button>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qty</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Recipient/Supplier</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {stockTransactions
                                                .filter(t => {
                                                    const matchesSearch = t.recipientOrSupplier?.toLowerCase().includes(statementSearch.toLowerCase()) || 
                                                                        t.itemName.toLowerCase().includes(statementSearch.toLowerCase());
                                                    const matchesType = !statementType || t.type === statementType;
                                                    const matchesStart = !statementStartDate || new Date(t.date) >= new Date(statementStartDate);
                                                    const matchesEnd = !statementEndDate || new Date(t.date) <= new Date(statementEndDate);
                                                    return matchesSearch && matchesType && matchesStart && matchesEnd;
                                                })
                                                .map(t => (
                                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-5 font-bold text-slate-400 text-[10px]">{new Date(t.date).toLocaleDateString()}</td>
                                                        <td className="px-6 py-5">
                                                            <p className="font-black text-slate-900 dark:text-white uppercase text-xs">{t.itemName}</p>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                                t.type === 'Restock' ? 'bg-emerald-50 text-emerald-600' :
                                                                t.type === 'Issue' ? 'bg-indigo-50 text-indigo-600' :
                                                                t.type === 'Adjustment' ? 'bg-amber-50 text-amber-600' :
                                                                'bg-slate-50 text-slate-600'
                                                            }`}>
                                                                {t.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 text-center font-mono font-black text-slate-900 dark:text-white">{t.quantity}</td>
                                                        <td className="px-6 py-5 text-right font-black text-slate-600 dark:text-slate-400 uppercase text-xs">{t.recipientOrSupplier}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeReportTab === 'analytics' && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="flex justify-between items-center">
                                <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-widest">Inventory Intelligence</h3>
                                <button
                                    onClick={async () => {
                                        const dataUri = await generateInventoryAnalyticsPdfDataUri(
                                            inventory,
                                            issuanceHistory,
                                            props.currentInstitution!,
                                            letterheadConfig!,
                                            footerImageUrl!
                                        );
                                        setPdfUrl(dataUri);
                                    }}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                                >
                                    <PrinterIcon className="w-4 h-4" /> Preview Analytics PDF
                                </button>
                            </div>

                            {/* Advanced Insights Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                                <TrendingUpIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Value Distribution</span>
                                        </div>
                                        <h4 className="text-3xl font-black mb-2">
                                            KES {inventory.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0)?.toLocaleString()}
                                        </h4>
                                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-tight">Total Estimated Stock Valuation</p>
                                        <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                                            <span className="text-[9px] font-black uppercase">Top Category</span>
                                            <span className="px-3 py-1 bg-white/20 rounded-lg text-[9px] font-black uppercase">
                                                {Object.entries(inventory.reduce((acc, i) => {
                                                    acc[i.category] = (acc[i.category] || 0) + (i.quantity * (i.price || 0));
                                                    return acc;
                                                }, {} as Record<string, number>)).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                                            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Health</span>
                                    </div>
                                    <div className="flex items-end gap-3 mb-2">
                                        <span className="text-3xl font-black text-slate-900 dark:text-white">
                                            {inventory.filter(i => i.quantity <= (i.reorderLevel ?? 0)).length}
                                        </span>
                                        <span className="text-xs font-bold text-rose-600 mb-1">Critical SKUs</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-4">
                                        <div 
                                            className="bg-rose-500 h-full rounded-full" 
                                            style={{ width: `${(inventory.filter(i => i.quantity <= (i.reorderLevel ?? 0)).length / Math.max(1, inventory.length)) * 100}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4">
                                        {((inventory.filter(i => i.quantity > (i.reorderLevel ?? 0)).length / Math.max(1, inventory.length)) * 100).toFixed(0)}% Stock Optimization Level
                                    </p>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                            <SparklesIcon className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Insight</span>
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                            "{inventory.filter(i => i.quantity <= (i.reorderLevel ?? 0)).length > 3 
                                                ? "Current low stock levels in key categories may disrupt operations within 14 days. Recommend prioritizing restock for items below reorder thresholds." 
                                                : "Inventory levels are currently optimized. Focus on reconciling high-frequency issuance items to maintain accuracy."}"
                                        </p>
                                        <div className="flex gap-2">
                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[8px] font-black uppercase">Optimization</span>
                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase">Predictive</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Graphical Representation Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Stock Value by Category - Bar Chart */}
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <div className="flex justify-between items-center mb-8">
                                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Stock Value by Category</h4>
                                        <ChartBarIcon className="w-5 h-5 text-slate-300" />
                                    </div>
                                    <div className="space-y-6">
                                        {Object.entries(inventory.reduce((acc, i) => {
                                            acc[i.category] = (acc[i.category] || 0) + (i.quantity * (i.price || 0));
                                            return acc;
                                        }, {} as Record<string, number>))
                                        .sort((a,b) => b[1]-a[1])
                                        .slice(0, 6)
                                        .map(([cat, val]) => {
                                            const total = inventory.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0);
                                            const percentage = (val / Math.max(1, total)) * 100;
                                            return (
                                                <div key={cat} className="space-y-2">
                                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                                                        <span className="text-slate-600 dark:text-slate-400">{cat}</span>
                                                        <span className="text-indigo-600">KES {val?.toLocaleString()}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-50 dark:bg-slate-900/50 h-3 rounded-full overflow-hidden">
                                                        <div 
                                                            className="bg-indigo-500 h-full rounded-full transition-all duration-1000" 
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Top Issued Items - Horizontal Bar Chart */}
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <div className="flex justify-between items-center mb-8">
                                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Top 5 Most Issued Items</h4>
                                        <ArrowTrendingUpIcon className="w-5 h-5 text-slate-300" />
                                    </div>
                                    <div className="space-y-6">
                                        {Object.entries(issuanceHistory.reduce((acc, txn) => {
                                            acc[txn.itemName] = (acc[txn.itemName] || 0) + txn.quantity;
                                            return acc;
                                        }, {} as Record<string, number>))
                                        .sort((a,b) => b[1]-a[1])
                                        .slice(0, 5)
                                        .map(([item, qty], idx) => {
                                            const maxQty = Math.max(...Object.values(issuanceHistory.reduce((acc, txn) => {
                                                acc[txn.itemName] = (acc[txn.itemName] || 0) + txn.quantity;
                                                return acc;
                                            }, {} as Record<string, number>)));
                                            const percentage = (qty / maxQty) * 100;
                                            return (
                                                <div key={item} className="flex items-center gap-4">
                                                    <div className="w-24 text-right">
                                                        <p className="text-[9px] font-black uppercase text-slate-400 truncate">{item}</p>
                                                    </div>
                                                    <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 h-6 rounded-lg overflow-hidden relative">
                                                        <div 
                                                            className={`h-full opacity-20 ${idx === 0 ? 'bg-indigo-500' : 'bg-slate-400'}`}
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                        <div className="absolute inset-0 flex items-center px-3">
                                                            <span className={`text-[10px] font-black ${idx === 0 ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                {qty} Units Issued
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'students' && (
                <UserManager
                    currentUser={user}
                    currentInstitution={props.currentInstitution}
                    users={filteredUsers}
                    courses={courses || []}
                    departments={departments || []}
                    onLogAction={onLogAction}
                    onAddUser={onAddUser}
                    onEditUser={async (uid, data) => {
                        if (onEditUser) await onEditUser(uid, data);
                    }}
                    onDeleteUser={async (uid) => { await onDeleteUser?.(uid); }}
                    onImportStudents={onImportStudents!}
                    onImportUsers={onImportUsers!}
                    smsConfig={smsConfig!}
                    subjects={subjects || []}
                    letterheadConfig={letterheadConfig!}
                    logoUrl={logoUrl!}
                    footerImageUrl={footerImageUrl!}
                    onSendSms={onSendSms}
                    showOnly="student"
                    allocations={[]}
                    onWithdrawRequest={() => Promise.resolve()}
                    onDeleteParent={() => { }}
                    companyDetails={companyDetails}
                    onAddTransaction={onAddTransaction}
                    onAccessAlumnaPortal={props.onAccessAlumnaPortal}
                />
            )}

            {activeTab === 'departments' && (
                <DepartmentManager
                    departments={departments || []}
                    onAddDepartment={onAddDepartment as any}
                    onUpdateDepartment={onUpdateDepartment as any}
                    onDeleteDepartment={onDeleteDepartment as any}
                    currentInstitution={props.currentInstitution}
                />
            )}

            {activeTab === 'staff' && (
                <UserManager
                    currentUser={user}
                    currentInstitution={props.currentInstitution}
                    users={filteredUsers}
                    courses={courses || []}
                    departments={departments || []}
                    onLogAction={onLogAction}
                    onAddUser={onAddUser}
                    onEditUser={async (uid, data) => {
                        if (onEditUser) await onEditUser(uid, data);
                    }}
                    onDeleteUser={async (uid) => { await onDeleteUser?.(uid); }}
                    onImportStudents={onImportStudents!}
                    onImportUsers={onImportUsers!}
                    smsConfig={smsConfig!}
                    subjects={subjects || []}
                    letterheadConfig={letterheadConfig!}
                    logoUrl={logoUrl!}
                    footerImageUrl={footerImageUrl!}
                    onSendSms={onSendSms}
                    showOnly="staff"
                    defaultRole="store"
                    allocations={[]}
                    onWithdrawRequest={() => Promise.resolve()}
                    onDeleteParent={() => { }}
                    companyDetails={companyDetails}
                    onAddTransaction={onAddTransaction}
                    onAccessAlumnaPortal={props.onAccessAlumnaPortal}
                />
            )}

            {isAddModalOpen && (
                <StoreItemForm
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={async (item) => {
                        await onAddItem?.(item);
                        setIsAddModalOpen(false);
                    }}
                />
            )}

            {isImportModalOpen && (
                <SmartInventoryImporterModal
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={async (items) => {
                        onAddItems?.(items.map(i => ({ ...i, institutionId: user?.institutionId || '' })));
                        setIsImportModalOpen(false);
                    }}
                    countyId="INSTITUTIONAL"
                    institutions={props.currentInstitution ? [props.currentInstitution] : []}
                />
            )}

            {pdfUrl && (
                <PdfPreviewModal
                    url={pdfUrl}
                    onClose={() => setPdfUrl(null)}
                    filename={`Inventory_Report_${Date.now()}.pdf`}
                />
            )}

            {isAddSupplierModalOpen && (
                <SupplierForm
                    onSave={async (data) => {
                        await onAddSupplier?.(data);
                        setIsAddSupplierModalOpen(false);
                    }}
                    onClose={() => setIsAddSupplierModalOpen(false)}
                />
            )}
        </BaseDashboard>
    );
};

export const InfoDeskView: React.FC<SupportStaffViewProps> = (props) => {
    const {
        user = { name: 'User' } as any,
        visitors = [],
        generatedTimetable = [],
        getSubjectById,
        getRoomById,
        getLecturerById,
        timetableSettings,
        users = [],
        onUpdateVisitor,
        onLogAction,
        teacherCheckIns = [],
        timeOffRequests = [],
        studentAbsenceRequests = [],
        leaveOutRequests = [],
        bulletinItems = [],
        documentCollections = [],
        watchlist = [],
        maintenanceRequests = [],
        onAddBulletinItem,
        onUpdateDocumentStatus,
        onAddMaintenanceRequest,
        rooms = [],
        invoices = []
    } = props;

    const [activeTab, setActiveTab] = useState<'schedule' | 'guests' | 'finder' | 'bulletin' | 'facility' | 'registry'>('schedule');
    const [searchQuery, setSearchQuery] = useState('');
    const [redirectingVisitor, setRedirectingVisitor] = useState<Visitor | null>(null);
    const [newHostId, setNewHostId] = useState('');

    const activeVisitors = useMemo(() => visitors.filter(v => v.timeIn && !v.timeOut), [visitors]);

    const handleRedirect = async () => {
        if (!redirectingVisitor || !newHostId) return;
        await onUpdateVisitor?.(redirectingVisitor.id, { hostId: newHostId });
        await onLogAction?.(`Redirected visitor ${redirectingVisitor.name} to new host`);
        setRedirectingVisitor(null);
        setNewHostId('');
        alert("Visitor redirected successfully.");
    };

    const searchResults = useMemo(() => {
        if (searchQuery.length < 2) return [];
        return users.filter(u =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.staffId && u.staffId.toLowerCase().includes(searchQuery.toLowerCase()))
        ).slice(0, 10);
    }, [searchQuery, users]);

    const getUserStatus = (user: User) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Check Leave/Absence
        const leave = timeOffRequests.find(r => r.lecturerId === user.id && r.status === 'approved' && todayStr >= r.startDate && todayStr <= r.endDate);
        if (leave) return { status: 'On Leave', type: 'error', reason: leave.reason };

        const studentAbsence = studentAbsenceRequests.find(r => r.studentId === user.id && r.status === 'approved' && todayStr >= r.startDate && todayStr <= r.endDate);
        if (studentAbsence) return { status: 'Absent (Approved)', type: 'error', reason: studentAbsence.reason };

        const leaveOut = leaveOutRequests.find(r => r.studentId === user.id && r.status === 'checked_out');
        if (leaveOut) return { status: 'Checked Out (Exeat)', type: 'warning', reason: leaveOut.reason };

        // Check Teacher Check-in
        if (user.role === 'teacher' || user.role === 'lecturer') {
            const checkIn = teacherCheckIns.find(c => c.teacherId === user.id && c.checkInDate === todayStr);
            if (!checkIn) return { status: 'Not Checked In', type: 'warning' };
            if (checkIn.morningCheckInStatus === 'Late') return { status: 'Checked In (Late)', type: 'warning' };
        }

        return { status: 'Active', type: 'success' };
    };

    const findLocation = (user: User) => {
        const now = new Date();
        const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
        const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const currentMins = timeToMinutes(currentTime);

        const entry = (generatedTimetable || []).find(e => {
            if (e.day !== currentDay) return false;
            if (user.role === 'teacher' || user.role === 'lecturer') {
                return e.lecturerId === user.id && currentMins >= timeToMinutes(e.startTime) && currentMins < timeToMinutes(e.endTime);
            }
            if (user.role === 'student') {
                return e.courseLevelId === user.courseLevelId && currentMins >= timeToMinutes(e.startTime) && currentMins < timeToMinutes(e.endTime);
            }
            return false;
        });

        if (!entry) return null;
        const room = getRoomById?.(entry.roomId);
        const subject = getSubjectById?.(entry.subjectId);
        return { room: room?.name || 'Unknown Room', subject: subject?.name || 'Class', timeSlot: `${entry.startTime} - ${entry.endTime}` };
    };

    const isRoomAvailable = (roomId: string) => {
        const now = new Date();
        const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
        const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const currentMins = timeToMinutes(currentTime);

        const occupied = (generatedTimetable || []).some(e =>
            e.roomId === roomId && e.day === currentDay && currentMins >= timeToMinutes(e.startTime) && currentMins < timeToMinutes(e.endTime)
        );
        return !occupied;
    };

    return (
        <BaseDashboard title="Institutional Concierge Hub" icon={<InformationCircleIcon className="w-6 h-6 text-slate-600" />}>
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6 sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 pt-2">
                <nav className="-mb-px flex space-x-6 overflow-x-auto no-scrollbar pb-1">
                    {[
                        { id: 'schedule', label: 'Schedule', icon: <CalendarDaysIcon className="w-4 h-4" /> },
                        { id: 'guests', label: 'Guests', icon: <UserIcon className="w-4 h-4" />, count: activeVisitors.length },
                        { id: 'finder', label: 'Locator', icon: <MagnifyingGlassIcon className="w-4 h-4" /> },
                        { id: 'bulletin', label: 'Bulletin', icon: <SparklesIcon className="w-4 h-4" /> },
                        { id: 'facility', label: 'Facility', icon: <BuildingOfficeIcon className="w-4 h-4" /> },
                        { id: 'registry', label: 'Registry', icon: <DocumentArrowDownIcon className="w-4 h-4" /> },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            {tab.icon} {tab.label} {tab.count !== undefined && tab.count > 0 && (<span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">{tab.count}</span>)}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'schedule' && (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black uppercase tracking-tight">Master Timetable Grid</h3>
                        <div className="flex gap-2 text-[10px] font-bold uppercase text-slate-400">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Live Now</span>
                        </div>
                    </div>
                    <TimetableGrid
                        entries={generatedTimetable!}
                        subjects={props.subjects || []}
                        courses={props.courses || []}
                        rooms={props.rooms || []}
                        getSubjectById={getSubjectById!}
                        getRoomById={getRoomById!}
                        getLecturerById={getLecturerById!}
                        timetableSettings={timetableSettings!}
                    />
                </div>
            )}

            {activeTab === 'guests' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-3 space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h3 className="text-xl font-black uppercase tracking-tight mb-8">Active Guests Hub</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {activeVisitors.map(v => {
                                        const watchlistHit = watchlist.find(w => w.phoneNumber === v.phoneNumber || (v.name && w.name.toLowerCase() === v.name.toLowerCase()));
                                        return (
                                            <div key={v.id} className={`p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border ${watchlistHit ? 'border-amber-300 bg-amber-50/30' : 'border-slate-100 dark:border-slate-800'} space-y-4 relative overflow-hidden group hover:border-indigo-200 transition-all shadow-sm`}>
                                                <div className="flex justify-between items-start">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-black shadow-sm">
                                                        {v.name?.charAt(0) || 'V'}
                                                    </div>
                                                    {watchlistHit && (
                                                        <span className="px-2.5 py-1 bg-amber-500 text-white text-[9px] font-black uppercase rounded-lg shadow-sm flex items-center gap-1 animate-pulse">
                                                            <ShieldIcon className="w-3 h-3" /> Security Flag
                                                        </span>
                                                    )}
                                                    {!watchlistHit && <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-lg border border-emerald-100 italic">CLEARED</span>}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800 dark:text-white uppercase text-base truncate">{v.name}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{v.purpose}</p>
                                                </div>
                                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                                        <ClockIcon className="w-3.5 h-3.5 text-indigo-500" /> Entered at {v.timeIn}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                                        <UserIcon className="w-3.5 h-3.5 text-slate-400" /> Current Host: {v.hostName ? `${v.hostName} (via Reception)` : (users.find(u => u.id === v.hostId)?.name || 'N/A')}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setRedirectingVisitor(v)}
                                                    className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-indigo-600 hover:text-white flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    <ArrowsRightLeftIcon className="w-4 h-4" /> Redirect Guest
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {activeVisitors.length === 0 && (
                                        <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                                            <p className="text-slate-300 font-black uppercase text-xs">No active guests checked in</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white mb-4">Security Watchlist</h4>
                                <div className="space-y-3">
                                    {watchlist.map(w => (
                                        <div key={w.id} className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl">
                                            <p className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase">{w.name}</p>
                                            <p className="text-[9px] font-bold text-rose-500 dark:text-rose-300 mt-0.5 line-clamp-2">{w.reason}</p>
                                        </div>
                                    ))}
                                    {watchlist.length === 0 && <p className="text-[10px] text-slate-400 italic">No watchlisted individuals</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'finder' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="max-w-4xl mx-auto space-y-10">
                            <div className="text-center">
                                <h3 className="text-3xl font-black uppercase tracking-tight">Personnel Intelligence Finder</h3>
                                <p className="text-sm text-slate-400 mt-2 font-bold uppercase tracking-widest">Cross-referencing Timetable • Attendance • Leaves</p>
                            </div>

                            <div className="relative group max-w-2xl mx-auto">
                                <MagnifyingGlassIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name, staff ID, or student number..."
                                    className="w-full h-18 pl-16 pr-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] font-bold text-lg focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 transition-all outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {searchResults.map(user => {
                                    const loc = findLocation(user);
                                    const statusObj = getUserStatus(user);
                                    return (
                                        <div key={user.id} className="p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 space-y-6 hover:border-indigo-100 transition-all shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                                        <UserIcon className="w-8 h-8" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black uppercase text-slate-900 dark:text-white text-lg">{user.name}</h4>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.role} • {user.staffId || user.email}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase shadow-sm border ${statusObj.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    statusObj.type === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-rose-50 text-rose-600 border-rose-100'
                                                    }`}>
                                                    {statusObj.status}
                                                </span>
                                            </div>

                                            {statusObj.reason && (
                                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 italic">
                                                    Note: {statusObj.reason}
                                                </div>
                                            )}

                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                                                {loc ? (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-emerald-600">
                                                            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                            <span className="text-xs font-black uppercase tracking-widest">In Scheduled Session</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                                <p className="text-[10px] font-black uppercase text-slate-400 pb-1">Facility / Room</p>
                                                                <p className="font-black text-slate-800 dark:text-white flex items-center gap-2"><MapPinIcon className="w-4 h-4 text-indigo-500" /> {loc.room}</p>
                                                            </div>
                                                            <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                                <p className="text-[10px] font-black uppercase text-slate-400 pb-1">Activity</p>
                                                                <p className="font-black text-slate-800 dark:text-white truncate">{loc.subject}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-center text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 py-2 rounded-lg">{loc.timeSlot}</p>
                                                    </div>
                                                ) : (
                                                    <div className="py-6 text-center text-slate-400 italic text-sm font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50 rounded-[2rem]">
                                                        Off Duty / No Active Classes
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => {
                                                    alert(`Sending arrival notification to ${user.name}...`);
                                                    onLogAction?.(`Notified ${user.name} about a guest arrival.`);
                                                }}
                                                className="w-full h-12 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:text-indigo-600 hover:border-indigo-100 transition-all flex items-center justify-center gap-2"
                                            >
                                                <PaperAirplaneIcon className="w-4 h-4" /> Send Guest Alert
                                            </button>
                                        </div>
                                    );
                                })}
                                {searchQuery.length >= 2 && searchResults.length === 0 && (
                                    <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                                        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-full">
                                            <MagnifyingGlassIcon className="w-12 h-12 text-slate-300" />
                                        </div>
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No records found for that identification</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'bulletin' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-black uppercase tracking-tight">Institutional Bulletin Board</h3>
                                    <button
                                        onClick={() => {
                                            const title = prompt("Enter announcement title:");
                                            const content = prompt("Enter content:");
                                            if (title && content) onAddBulletinItem?.({ title, content, category: 'Announcement', date: new Date().toISOString().split('T')[0], authorId: 'RECEPTION' });
                                        }}
                                        className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-indigo-100 flex items-center gap-2"
                                    >
                                        <PlusIcon className="w-4 h-4" /> Add Post
                                    </button>
                                </div>
                                <div className="space-y-6">
                                    {bulletinItems.map(item => (
                                        <div key={item.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className={`px-2.5 py-1 text-[8px] font-black uppercase rounded-lg shadow-sm border ${item.category === 'Emergency' ? 'bg-rose-600 text-white border-rose-500' :
                                                    item.category === 'Holiday' ? 'bg-emerald-600 text-white border-emerald-500' :
                                                        'bg-white text-slate-600 border-slate-200'
                                                    }`}>
                                                    {item.category}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</span>
                                            </div>
                                            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-2">{item.title}</h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{item.content}</p>
                                        </div>
                                    ))}
                                    {bulletinItems.length === 0 && <p className="text-center py-20 text-slate-300 font-black uppercase text-xs">No active notices/bulletins</p>}
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white mb-6">Today's Key Events</h4>
                                <div className="space-y-4">
                                    <div className="flex gap-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border-l-4 border-indigo-600 rounded-r-2xl">
                                        <div className="text-center min-w-[50px]">
                                            <p className="text-[10px] font-black uppercase text-indigo-600">8:00</p>
                                            <p className="text-[8px] font-bold text-slate-400">AM</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-slate-800 dark:text-white">Assembly Session</p>
                                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">Main Hall • All Students</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic text-center py-4">Integration with Calendar Hub...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'facility' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-3 space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h3 className="text-xl font-black uppercase tracking-tight mb-8">Real-Time Facility Status</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {rooms.slice(0, 12).map(room => {
                                        const available = isRoomAvailable(room.id);
                                        return (
                                            <div key={room.id} className={`p-4 rounded-2xl border-2 transition-all group ${available ? 'bg-emerald-50/30 border-emerald-100 hover:border-emerald-300' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                                                }`}>
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className={`w-2.5 h-2.5 rounded-full ${available ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                                    <span className="text-[9px] font-black uppercase text-slate-400">{available ? 'Available' : 'Occupied'}</span>
                                                </div>
                                                <h5 className="font-black uppercase text-slate-800 dark:text-white truncate text-sm">{room.name}</h5>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Cap: {room.capacity}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Maintenance Log</h4>
                                    <button
                                        onClick={() => {
                                            const desc = prompt("Describe the facility issue:");
                                            if (desc) onAddMaintenanceRequest?.({ roomId: rooms[0]?.id || 'GEN', description: desc, priority: 'Medium', status: 'Pending', reportedBy: 'RECEPTION' });
                                        }}
                                        className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg"
                                    ><PlusIcon className="w-4 h-4 text-slate-600" /></button>
                                </div>
                                <div className="space-y-3">
                                    {maintenanceRequests.map(req => (
                                        <div key={req.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[9px] font-black uppercase text-indigo-600">{getRoomById?.(req.roomId)?.name || 'Facility'}</span>
                                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-lg">{req.status}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 line-clamp-2">{req.description}</p>
                                        </div>
                                    ))}
                                    {maintenanceRequests.length === 0 && <p className="text-[10px] text-slate-400 text-center py-6 italic">No active requests logged</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'registry' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <h3 className="text-xl font-black uppercase tracking-tight mb-8">Registry & Fee Queries</h3>
                            <div className="space-y-6">
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Quick fee balance lookup by student ID..."
                                        className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold transition-all focus:border-indigo-600 outline-none"
                                    />
                                </div>
                                {searchResults.filter(u => u.role === 'student').map(student => {
                                    const studentInvoices = invoices.filter(inv => inv.studentId === student.id);
                                    const totalDue = studentInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
                                    return (
                                        <div key={student.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group">
                                            <div>
                                                <p className="font-black uppercase text-slate-800 dark:text-white">{student.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.staffId || 'No ID'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-black text-xl ${totalDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>KES {totalDue?.toLocaleString()}</p>
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{totalDue > 0 ? 'ARREARS' : 'CLEARED'}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {searchQuery.length < 2 && <p className="text-center py-10 text-[11px] font-black text-slate-300 uppercase tracking-widest">Enter student ID for audit information</p>}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <h3 className="text-xl font-black uppercase tracking-tight mb-8">Documents for Collection</h3>
                            <div className="space-y-4">
                                {documentCollections.map(doc => (
                                    <div key={doc.id} className="flex gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-indigo-100 transition-all">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${doc.status === 'Ready' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                                            <ArchiveBoxIcon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h5 className="font-black uppercase text-slate-900 dark:text-white truncate">{doc.ownerName}</h5>
                                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${doc.status === 'Ready' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>{doc.status}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{doc.documentType}</p>
                                            <p className="text-[9px] text-slate-400 mt-2">Dropped by: {doc.droppedOffBy} on {doc.droppedOffDate}</p>
                                        </div>
                                    </div>
                                ))}
                                {documentCollections.length === 0 && <p className="text-center py-20 text-slate-300 font-black uppercase text-xs">No documents listed for collection</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Redirect Modal */}
            {redirectingVisitor && (
                <div className="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">Redirect Guest</h3>
                                <p className="text-xs text-slate-400 mt-1 uppercase font-bold">Routing to a different host</p>
                            </div>
                            <button onClick={() => setRedirectingVisitor(null)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center gap-4 border border-indigo-100 dark:border-indigo-800">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 shadow-sm font-black">
                                    {redirectingVisitor.name?.charAt(0) || '?'}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-slate-900 dark:text-white uppercase truncate">{redirectingVisitor.name || 'Unknown'}</p>
                                    <p className="text-[10px] text-indigo-600 font-bold uppercase">Current Host: {redirectingVisitor.hostName ? `${redirectingVisitor.hostName} (via Reception)` : (users.find(u => u.id === redirectingVisitor.hostId)?.name || 'N/A')}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Target Host Selection</label>
                                <select
                                    className="w-full h-14 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 font-bold focus:border-indigo-600 transition-all font-sans"
                                    value={newHostId}
                                    onChange={(e) => setNewHostId(e.target.value)}
                                >
                                    <option value="">Select Target Host</option>
                                    {users.filter(u => u.id !== redirectingVisitor.hostId && u.role !== 'student' && u.role !== 'parent').map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleRedirect}
                                disabled={!newHostId}
                                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                            >
                                Confirm Redirection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </BaseDashboard>
    );
};

export const SupplierView: React.FC<SupportStaffViewProps> = (props) => {
    const { user = { name: 'User' } as any, supplierProfile, requisitions = [], onUpdateRequisition } = props;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'catalog' | 'profile'>('dashboard');

    if (!supplierProfile) return <div className="p-20 text-center font-black uppercase text-slate-400 tracking-widest animate-pulse">Authenticating Supplier Profile...</div>;

    return (
        <BaseDashboard title={`Vendor Portal: ${supplierProfile.name}`} icon={<BuildingOfficeIcon className="w-6 h-6 text-slate-600" />}>
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6"><nav className="-mb-px flex space-x-8 overflow-x-auto pb-1">
                {['dashboard', 'orders', 'catalog', 'profile'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{tab}</button>
                ))}
            </nav>
            </div>

            {activeTab === 'orders' && (
                <div className="space-y-4 animate-fade-in-up">
                    <h3 className="text-lg font-black uppercase tracking-tight">Active Supply Requests</h3>
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-800">
                        {requisitions.filter(r => r.supplierId === supplierProfile.id).map(req => (
                            <div key={req.id} className="p-8 hover:bg-slate-50/50 transition-colors">
                                <div className="flex justify-between items-center">
                                    <div><p className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">Supply LPO #{req.id.slice(-6).toUpperCase()}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry Value: KES {req.totalEstimatedCost?.toLocaleString()}</p></div>
                                    <div className="flex gap-2">
                                        <button onClick={() => onUpdateRequisition!(req.id, { supplierResponse: 'accepted', status: 'ordered' })} className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-100">Acknowledge</button>
                                        <button onClick={() => onUpdateRequisition!(req.id, { supplierResponse: 'rejected' })} className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100">Decline</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </BaseDashboard>
    );
};

export const TransportAssistantView: React.FC<SupportStaffViewProps> = (props) => {
    const { 
        user = { name: 'User', driverType: 'standard' } as any,
        users = [],
        vehicles = [],
        transportOnboarding = [],
        currentInstitution = {} as any,
        onOnboardStudent,
        onOffboardStudent
    } = props;
    if (user.driverType === 'private') {
        return (
            <PrivateDriverBillingPortal
                user={user}
                users={users}
                vehicles={vehicles}
                transportOnboarding={transportOnboarding}
                currentInstitution={currentInstitution}
                onOnboardStudent={onOnboardStudent!}
                onOffboardStudent={onOffboardStudent!}
            />
        );
    }

    return (
        <TransportOnboardingView
            currentUser={user}
            currentInstitution={currentInstitution}
            vehicles={vehicles}
            users={users}
            onboardingRecords={transportOnboarding}
            onOnboardStudent={onOnboardStudent!}
            onOffboardStudent={onOffboardStudent!}
        />
    );
};

