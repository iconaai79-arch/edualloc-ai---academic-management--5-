
import React, { useState, useMemo } from 'react';
import type {
    User, VoteHead, Supplier, StockTransaction, Room, Subject, TimetableEntry,
    Requisition, InventoryItem, SecurityAlert, Visitor, EmployeeDetails,
    PayrollRun, Invoice, Receipt, Course, FeeStructure, Semester, AcademicYear,
    CompanyDetails, MpesaTransaction, TimetableSettings, Building, Appointment,
    FinancialPeriod, InvoiceItem, Institution, TransactionStatus, BusinessDocument,
    CountyInventoryItem, Department, TeacherCheckIn, TimeOffRequest, StudentAttendance,
    StudentAbsenceRequest, LeaveOutRequest, BulletinItem, DocumentCollection,
    WatchlistRecord, MaintenanceRequest, TransportVehicle, TransportOnboarding, VehicleLog
} from '../types';
import {
    ShieldIcon, ArchiveBoxIcon, PlusIcon, CheckCircleIcon, XIcon,
    UserIcon, InformationCircleIcon, MapPinIcon, PrinterIcon,
    CreditCardIcon, DocumentArrowDownIcon, ChartBarIcon, MagnifyingGlassIcon,
    // Added BuildingOfficeIcon to resolve name collision or missing reference errors
    BuildingOfficeIcon, ClockIcon, CheckIcon, ArrowUpTrayIcon, ClipboardListIcon,
    LockClosedIcon,
    MpesaIcon,
    SparklesIcon,
    CameraIcon,
    CalendarDaysIcon,
    PhoneIcon,
    ArrowRightOnRectangleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    EnvelopeIcon,
    ArrowsRightLeftIcon,
    PaperAirplaneIcon
} from './icons/index';
import { SecurityAlertManager } from './SecurityAlertManager';
import { LicensePlateScanner } from './LicensePlateScanner';
import { StoreItemForm } from './StoreItemForm';
import { SmartInventoryImporterModal } from './SmartInventoryImporterModal';
import { TransactionForm } from './TransactionForm';
import { ItemQrCodeModal } from './ItemQrCodeModal';
import { SecurityGatePassView } from './SecurityGatePassView';
import { TransportOnboardingView } from './TransportOnboardingView';
import { downloadInvoicePdf, downloadReceiptPdf } from '../services/pdfService';
import { TimetableGrid } from './TimetableGrid';
import { StudentLeaveOutManager } from './StudentLeaveOutManager';
import { PrivateDriverBillingPortal } from './PrivateDriverBillingPortal';
import { timeToMinutes } from '../utils/timeUtils';


export interface SupportStaffViewProps {
    user: User;
    users?: User[];
    visitors?: Visitor[];
    onAddVisitor?: (visitor: Omit<Visitor, 'id'>) => void;
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
    appointments?: Appointment[];
    onUpdateAppointmentStatus?: (id: string, status: Appointment['status']) => void;
    inventory?: InventoryItem[];
    stockTransactions?: StockTransaction[];
    suppliers?: Supplier[];
    onAddItem?: (item: Omit<InventoryItem, 'id' | 'institutionId' | 'lastUpdated'>) => void;
    onAddItems?: (items: Omit<InventoryItem, 'id' | 'institutionId'>[]) => void;
    onAddStoreTransaction?: (item: InventoryItem, type: 'Restock' | 'Dispatch' | 'Adjustment', quantity: number, party: string, verificationMethod: string, signature: string | null) => void;
    transactions?: MpesaTransaction[];
    invoices?: Invoice[];
    receipts?: Receipt[];
    requisitions?: Requisition[];
    onAddInvoice?: (invoice: Invoice) => void;
    onAddInvoices?: (invoices: Invoice[]) => void;
    onAddReceipt?: (receipt: Receipt) => void;
    onVerifyRequisition?: (id: string, status: Requisition['status'], reason?: string) => void;
    companyDetails?: CompanyDetails;
    courses?: Course[];
    currentInstitution?: Institution | null;
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
    onLogAction?: (action: string) => Promise<void>;
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
    vehicles?: TransportVehicle[];
    transportOnboarding?: TransportOnboarding[];
    vehicleLogs?: VehicleLog[];
    onLogGateAction?: (vehicleId: string, eventType: 'entry' | 'exit', notes?: string) => Promise<void>;
    onOnboardStudent?: (studentId: string, vehicleId: string, direction: 'to_school' | 'from_school', lat?: number, lng?: number) => Promise<void>;
    onOffboardStudent?: (recordId: string, lat?: number, lng?: number) => Promise<void>;
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

const formatDuration = (timeIn?: string, timeOut?: string) => {
    if (!timeIn || !timeOut) return '--';
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
        securityAlerts = [], visitors = [], appointments = [], users = [],
        onCheckoutVisitor, onAddVisitor, onAddAlert, onResolveAlert, onUpdateAppointmentStatus,
        onLogAction
    } = props;
    const [activeTab, setActiveTab] = useState<'checkpoint' | 'expected' | 'leaveout' | 'logs' | 'alerts' | 'gatepass'>('checkpoint');

    const [isScanning, setIsScanning] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [lookupStatus, setLookupStatus] = useState<'idle' | 'searching' | 'found' | 'none'>('idle');
    const [walkInForm, setWalkInForm] = useState({ name: '', phone: '', purpose: '', hostId: '', vehiclePlate: '', vehicleModel: '' });
    const activeVisitors = useMemo(() => (visitors || []).filter(v => !v.timeOut), [visitors]);
    const todaysAppointments = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return (appointments || []).filter(a => a.date === today && a.status === 'pending');
    }, [appointments]);
    const handleVisitorLookup = () => {
        if (!walkInForm.phone) return;
        setLookupStatus('searching');
        const matches = (visitors || []).filter(v => v.phoneNumber === walkInForm.phone);
        if (matches.length > 0) {
            const returning = [...matches].sort((a, b) => b.visitDate.localeCompare(a.visitDate))[0];
            setWalkInForm({ ...walkInForm, name: returning.name, vehiclePlate: returning.vehiclePlate || '', vehicleModel: returning.vehicleModel || '' });
            setLookupStatus('found');
        } else {
            setLookupStatus('none');
            setTimeout(() => setLookupStatus('idle'), 2000);
        }
    };
    const handleRegisterWalkIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (onAddVisitor && walkInForm.name && walkInForm.purpose) {
            await onAddVisitor({
                name: walkInForm.name,
                phoneNumber: walkInForm.phone,
                purpose: walkInForm.purpose,
                hostId: walkInForm.hostId,
                vehiclePlate: walkInForm.vehiclePlate.toUpperCase(),
                vehicleModel: walkInForm.vehicleModel,
                visitDate: new Date().toISOString().split('T')[0],
                timeIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                institutionId: props.user.institutionId
            });
            await props.onLogAction?.(`Registered visitor: ${walkInForm.name} for ${walkInForm.purpose}`);
            setIsRegistering(false);
            setLookupStatus('idle');
            setWalkInForm({ name: '', phone: '', purpose: '', hostId: '', vehiclePlate: '', vehicleModel: '' });
            alert("Visitor Registered & Signed In");
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
    const isSchool = ['Primary', 'Secondary', 'ECD', 'International'].includes(props.currentInstitution?.institutionType || '');
    const dashboardTitle = isSchool ? "School Security Hub" : "Campus Security Hub";

    return (
        <BaseDashboard title={dashboardTitle} icon={<ShieldIcon className="w-6 h-6 text-slate-600" />}>
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar pb-1">
                    {[
                        { id: 'checkpoint', label: 'Gate Checkpoint', icon: <CameraIcon className="w-4 h-4" /> },
                        { id: 'expected', label: 'Expected Guests', icon: <CalendarDaysIcon className="w-4 h-4" />, count: todaysAppointments.length },
                        { id: 'leaveout', label: 'Student Leave Out', icon: <ArrowUpTrayIcon className="w-4 h-4" /> },
                        { id: 'logs', label: 'Security Logs', icon: <ClipboardListIcon className="w-4 h-4" />, count: activeVisitors.length },
                        { id: 'gatepass', label: 'Gate Passes', icon: <MapPinIcon className="w-4 h-4" /> },
                        { id: 'alerts', label: 'Security Alerts', icon: <ExclamationTriangleIcon className="w-4 h-4" />, count: securityAlerts.filter(a => a.status === 'active').length }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            {tab.icon} {tab.label} {tab.count !== undefined && tab.count > 0 && (<span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">{tab.count}</span>)}
                        </button>
                    ))}
                </nav>
            </div>
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
                                <div key={v.id} className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group transition-all hover:border-indigo-100 hover:shadow-md">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-black text-slate-800 dark:text-white uppercase text-sm truncate">{v.name}</p>
                                            {v.vehiclePlate && (
                                                <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[9px] rounded font-black border border-slate-700 shadow-sm">{v.vehiclePlate}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md">{v.purpose}</span>
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {v.timeIn}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            onCheckoutVisitor?.(v.id);
                                            await onLogAction?.(`Checked out visitor: ${v.name}`);
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
                            <p className="text-xs text-slate-400 mt-1 uppercase font-bold">Planned appointments for today</p>
                        </div>
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                            <CalendarDaysIcon className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{apt.purpose}</p>
                                </div>
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                        <ClockIcon className="w-3.5 h-3.5 text-indigo-500" /> {apt.startTime} - {apt.endTime}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                        <UserIcon className="w-3.5 h-3.5 text-slate-400" /> Host: {users.find(u => u.id === apt.hostId)?.name || 'N/A'}
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
                        {todaysAppointments.length === 0 && (
                            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full opacity-50">
                                    <CalendarDaysIcon className="w-10 h-10 text-slate-300" />
                                </div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No pending appointments scheduled for today</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'leaveout' && (
                <StudentLeaveOutManager
                    currentUser={props.user}
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
                    users={props.users || []}
                    currentUser={props.user}
                    currentInstitution={props.currentInstitution!}
                    onLogGateAction={props.onLogGateAction!}
                />
            )}

            {activeTab === 'logs' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Active Registry</h3>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Currently identified personnel on premises</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[10px] font-black uppercase text-emerald-600">Secure Live Status</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Visitor / Name</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Time</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Host / Destination</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Assets</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-900/50">
                                    {activeVisitors.map(v => {
                                        const host = users.find(u => u.id === v.hostId);
                                        return (
                                            <tr key={v.id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors">
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 font-black text-xs shadow-inner">
                                                            {v.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-slate-800 dark:text-white uppercase text-sm">{v.name}</div>
                                                            <div className="text-[10px] text-slate-500 font-bold">{v.phoneNumber}</div>
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
                                                    <div className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase truncate max-w-[150px]">{host?.name || 'N/A'}</div>
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
                                                    <button
                                                        onClick={async () => {
                                                            onCheckoutVisitor?.(v.id);
                                                            await onLogAction?.(`Checked out visitor: ${v.name}`);
                                                        }}
                                                        className="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 border border-red-100 dark:border-red-900/50"
                                                    >
                                                        Finalize Exit
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {activeVisitors.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-20 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full mb-3 opacity-50">
                                                        <ClipboardListIcon className="w-8 h-8 text-slate-300" />
                                                    </div>
                                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Registry is currently empty</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <ArchiveBoxIcon className="w-32 h-32 text-slate-900 dark:text-white" />
                        </div>
                        <div className="mb-6">
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Checkout History</h3>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Archive of previous visitors</p>
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
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-900/50">
                                    {(visitors || []).filter(v => !!v.timeOut).sort((a, b) => b.visitDate.localeCompare(a.visitDate)).slice(0, 20).map(v => (
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
                                        </tr>
                                    ))}
                                    {(visitors || []).filter(v => !!v.timeOut).length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">No historical records found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}


            {isRegistering && (
                <div className="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="text-2xl font-black uppercase tracking-tight">Visitor Entry Card</h3>
                            <button onClick={() => setIsRegistering(false)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleRegisterWalkIn} className="p-8 space-y-5">
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
                                    <button type="button" onClick={handleVisitorLookup} className="px-4 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors">
                                        {lookupStatus === 'searching' ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <MagnifyingGlassIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                                {lookupStatus === 'found' && <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase">Returning Visitor Identified</p>}
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
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Host / Personnel To See</label>
                                <select className="form-select" value={walkInForm.hostId} onChange={(e) => setWalkInForm({ ...walkInForm, hostId: e.target.value })} required>
                                    <option value="">Select Host</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                </select>
                            </div>
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
                            <button type="submit" className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 mt-4">
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

            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; }
                .dark .form-input { border-color: #334155; background-color: #0f172a; color: #fff; }
            `}</style>
        </BaseDashboard>
    );
};

export const StoreView: React.FC<SupportStaffViewProps> = (props) => {
    const { inventory = [], suppliers = [], users = [], onAddItem, onAddItems, onAddStoreTransaction, countyInventory = [], onMarkInventoryReceived } = props;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'history' | 'suppliers' | 'shipments'>('dashboard');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const pendingShipments = useMemo(() => countyInventory.filter(i => i.status === 'in_transit'), [countyInventory]);

    return (
        <BaseDashboard title="Institutional Store" icon={<ArchiveBoxIcon className="w-6 h-6 text-slate-600" />}>
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-8 overflow-x-auto pb-1">
                    {[
                        { id: 'dashboard', label: 'Dashboard' },
                        { id: 'inventory', label: 'Inventory' },
                        { id: 'shipments', label: 'County Shipments', count: pendingShipments.length },
                        { id: 'history', label: 'History' },
                        { id: 'suppliers', label: 'Suppliers' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">{tab.count}</span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>
            {activeTab === 'inventory' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase tracking-tight">Active Stock Registry</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="btn-secondary text-[10px] uppercase font-black tracking-widest h-10 px-6 flex items-center gap-2"
                            >
                                <SparklesIcon className="w-4 h-4" />
                                Smart Import
                            </button>
                            <button onClick={() => setIsAddModalOpen(true)} className="btn-primary text-[10px] uppercase font-black tracking-widest h-10 px-6">Add Item</button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 shadow-sm rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-700">
                        <table className="min-w-full border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-900/50"><tr><th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Description</th><th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-500 tracking-widest">Level</th><th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-500 tracking-widest">Status</th><th className="px-6 py-4"></th></tr></thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {inventory.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-black uppercase tracking-tight text-slate-800 dark:text-white">{item.name}</td>
                                        <td className="px-6 py-4 text-center font-mono font-black text-indigo-600">{item.quantity} {item.unit}</td>
                                        <td className="px-6 py-4 text-center">
                                            {item.quantity <= item.reorderLevel ? <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-[9px] font-black uppercase tracking-widest">Low Stock</span> : <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-[9px] font-black uppercase tracking-widest">Stable</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right"><button className="text-indigo-600 hover:underline font-black text-[10px] uppercase tracking-widest">Asset Card</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                                        onClick={() => onMarkInventoryReceived?.(item.id)}
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
        </BaseDashboard>

    );
};

export const InfoDeskView: React.FC<SupportStaffViewProps> = (props) => {
    const {
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
                                        const watchlistHit = watchlist.find(w => w.phoneNumber === v.phoneNumber || w.name.toLowerCase() === v.name.toLowerCase());
                                        return (
                                            <div key={v.id} className={`p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border ${watchlistHit ? 'border-amber-300 bg-amber-50/30' : 'border-slate-100 dark:border-slate-800'} space-y-4 relative overflow-hidden group hover:border-indigo-200 transition-all shadow-sm`}>
                                                <div className="flex justify-between items-start">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-black shadow-sm">
                                                        {v.name.charAt(0)}
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
                                                        <UserIcon className="w-3.5 h-3.5 text-slate-400" /> Current Host: {users.find(u => u.id === v.hostId)?.name || 'N/A'}
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
                                                <p className={`font-black text-xl ${totalDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>KES {totalDue.toLocaleString()}</p>
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
                                    {redirectingVisitor.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-slate-900 dark:text-white uppercase truncate">{redirectingVisitor.name}</p>
                                    <p className="text-[10px] text-indigo-600 font-bold uppercase">Current Host: {users.find(u => u.id === redirectingVisitor.hostId)?.name || 'N/A'}</p>
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
                                    {users.filter(u => u.id !== redirectingVisitor.hostId).map(u => (
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
    const { supplierProfile, requisitions = [], onUpdateRequisition } = props;
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
                                    <div><p className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">Supply LPO #{req.id.slice(-6).toUpperCase()}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry Value: KES {req.totalEstimatedCost.toLocaleString()}</p></div>
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
    if (props.user.driverType === 'private') {
        return (
            <PrivateDriverBillingPortal
                user={props.user}
                users={props.users || []}
                vehicles={props.vehicles || []}
                transportOnboarding={props.transportOnboarding || []}
                currentInstitution={props.currentInstitution!}
                onOnboardStudent={props.onOnboardStudent!}
                onOffboardStudent={props.onOffboardStudent!}
            />
        );
    }

    return (
        <TransportOnboardingView
            currentUser={props.user}
            currentInstitution={props.currentInstitution!}
            vehicles={props.vehicles || []}
            users={props.users || []}
            onboardingRecords={props.transportOnboarding || []}
            onOnboardStudent={props.onOnboardStudent!}
            onOffboardStudent={props.onOffboardStudent!}
        />
    );
};
