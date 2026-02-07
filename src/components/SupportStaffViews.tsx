
import React, { useState, useMemo } from 'react';
import type {
    User, VoteHead, Supplier, StockTransaction, Room, Subject, TimetableEntry,
    Requisition, InventoryItem, SecurityAlert, Visitor, EmployeeDetails,
    PayrollRun, Invoice, Receipt, Course, FeeStructure, Semester, AcademicYear,
    CompanyDetails, MpesaTransaction, TimetableSettings, Building, Appointment,
    FinancialPeriod, InvoiceItem, Institution, TransactionStatus, BusinessDocument
} from '../types';
import {
    ShieldIcon, ArchiveBoxIcon, PlusIcon, CheckCircleIcon, XIcon,
    UserIcon, InformationCircleIcon, MapPinIcon, PrinterIcon,
    CreditCardIcon, DocumentArrowDownIcon, ChartBarIcon, MagnifyingGlassIcon,
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
    EnvelopeIcon
} from './icons/index.ts';
import { SecurityAlertManager } from './SecurityAlertManager.tsx';
import { LicensePlateScanner } from './LicensePlateScanner.tsx';
import { StoreItemForm } from './StoreItemForm.tsx';
import { SmartInventoryImporterModal } from './SmartInventoryImporterModal.tsx';
import { TransactionForm } from './TransactionForm.tsx';
import { ItemQrCodeModal } from './ItemQrCodeModal.tsx';
import { downloadInvoicePdf, downloadReceiptPdf } from '../services/pdfService';
import { TimetableGrid } from './TimetableGrid.tsx';

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
    onAddAlert?: (alert: any) => void;
    onResolveAlert?: (id: string) => void;
    appointments?: Appointment[];
    onUpdateAppointmentStatus?: (id: string, status: Appointment['status']) => void;
    inventory?: InventoryItem[];
    stockTransactions?: StockTransaction[];
    suppliers?: Supplier[];
    onAddItem?: (item: any) => void;
    onAddItems?: (items: any[]) => void;
    onAddStoreTransaction?: (item: InventoryItem, type: 'Restock' | 'Dispatch' | 'Adjustment', quantity: number, party: string, verificationMethod: string, signature: string | null) => void;
    transactions?: MpesaTransaction[];
    invoices?: Invoice[];
    receipts?: Receipt[];
    requisitions?: Requisition[];
    onAddInvoice?: (invoice: any) => void;
    onAddInvoices?: (invoices: any[]) => void;
    onAddReceipt?: (receipt: any) => void;
    onVerifyRequisition?: (id: string, status: any, reason?: string) => void;
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
    onAddFinanceTransaction?: (data: any, items: InvoiceItem[]) => Promise<TransactionStatus>;
    supplierProfile?: Supplier;
    onUpdateRequisition?: (reqId: string, data: Partial<Requisition>) => void;
    onUpdateSupplier?: (supplierId: string, data: Partial<Supplier>) => void;
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
        onCheckoutVisitor, onAddVisitor, onAddAlert, onResolveAlert, onUpdateAppointmentStatus
    } = props;
    const [activeTab, setActiveTab] = useState<'checkpoint' | 'expected' | 'logs' | 'alerts'>('checkpoint');
    const [isScanning, setIsScanning] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [lookupStatus, setLookupStatus] = useState<'idle' | 'searching' | 'found' | 'none'>('idle');
    const [walkInForm, setWalkInForm] = useState({ name: '', phone: '', purpose: '', hostId: '', vehiclePlate: '', vehicleModel: '' });
    const activeVisitors = useMemo(() => visitors.filter(v => !v.timeOut), [visitors]);
    const todaysAppointments = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return appointments.filter(a => a.date === today && a.status === 'pending');
    }, [appointments]);
    const handleVisitorLookup = () => {
        if (!walkInForm.phone) return;
        setLookupStatus('searching');
        // FIXED: Changed v.phone_number to v.phoneNumber to match type definition
        const matches = visitors.filter(v => v.phoneNumber === walkInForm.phone);
        if (matches.length > 0) {
            const returning = [...matches].sort((a, b) => b.visitDate.localeCompare(a.visitDate))[0];
            setWalkInForm({ ...walkInForm, name: returning.name, vehiclePlate: returning.vehiclePlate || '', vehicleModel: returning.vehicleModel || '' });
            setLookupStatus('found');
        } else {
            setLookupStatus('none');
            setTimeout(() => setLookupStatus('idle'), 2000);
        }
    };
    const handleRegisterWalkIn = (e: React.FormEvent) => {
        e.preventDefault();
        if (onAddVisitor && walkInForm.name && walkInForm.purpose) {
            onAddVisitor({
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
            setIsRegistering(false);
            setLookupStatus('idle');
            setWalkInForm({ name: '', phone: '', purpose: '', hostId: '', vehiclePlate: '', vehicleModel: '' });
            alert("Visitor Registered & Signed In");
        }
    };
    const handleCheckInAppointment = (apt: Appointment) => {
        if (onAddVisitor && onUpdateAppointmentStatus) {
            onAddVisitor({
                name: apt.guestName,
                email: apt.guestEmail,
                phoneNumber: apt.guestPhone,
                purpose: apt.purpose,
                hostId: apt.hostId,
                visitDate: new Date().toISOString().split('T')[0],
                timeIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                institutionId: apt.institutionId
            });
            onUpdateAppointmentStatus(apt.id, 'completed');
            alert(`Check-in complete for ${apt.guestName}`);
        }
    };
    return (
        <BaseDashboard title="Campus Security Hub" icon={<ShieldIcon className="w-6 h-6 text-slate-600" />}>
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar pb-1">
                    {[
                        { id: 'checkpoint', label: 'Gate Checkpoint', icon: <CameraIcon className="w-4 h-4" /> },
                        { id: 'expected', label: 'Expected Guests', icon: <CalendarDaysIcon className="w-4 h-4" />, count: todaysAppointments.length },
                        { id: 'logs', label: 'On-Site Logs', icon: <ClipboardListIcon className="w-4 h-4" />, count: activeVisitors.length },
                        { id: 'alerts', label: 'Security Alerts', icon: <ExclamationTriangleIcon className="w-4 h-4" />, count: securityAlerts.filter(a => a.status === 'active').length }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            {tab.icon} {tab.label} {tab.count !== undefined && tab.count > 0 && (<span className="bg-red-50 text-white text-[9px] px-1.5 py-0.5 rounded-full">{tab.count}</span>)}
                        </button>
                    ))}
                </nav>
            </div>
            {activeTab === 'checkpoint' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-up">
                    <div className="space-y-6">
                        <h3 className="text-xl font-black uppercase tracking-tight">Access Control</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <button onClick={() => setIsRegistering(true)} className="flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-indigo-100 hover:border-indigo-500 shadow-sm transition-all group">
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900 rounded-2xl text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                    <UserIcon className="w-10 h-10" />
                                </div>
                                <span className="font-black text-sm uppercase tracking-widest">Register Walk-in</span>
                                <p className="text-xs text-slate-400 mt-2">New visitor arriving at gate</p>
                            </button>
                            <button onClick={() => setIsScanning(true)} className="flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-emerald-100 hover:border-emerald-500 shadow-sm transition-all group">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900 rounded-2xl text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                                    <CameraIcon className="w-10 h-10" />
                                </div>
                                <span className="font-black text-sm uppercase tracking-widest">Scan License Plate</span>
                                <p className="text-xs text-slate-400 mt-2">Verify faculty or guest vehicle</p>
                            </button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 h-fit">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black uppercase tracking-tight">Active at Checkpoint</h3>
                            <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Real-time</span>
                        </div>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                            {activeVisitors.slice(0, 10).map(v => (
                                <div key={v.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group transition-all hover:border-indigo-100">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-slate-800 dark:text-white uppercase text-sm truncate">{v.name}</p>
                                            {v.vehiclePlate && (
                                                <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[9px] rounded font-black border border-slate-700 shadow-sm">{v.vehiclePlate}</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">IN: {v.timeIn} • {v.purpose}</p>
                                    </div>
                                    <button onClick={() => onCheckoutVisitor?.(v.id)} className="p-2.5 bg-white dark:bg-slate-800 text-red-600 rounded-xl shadow-sm border border-red-50 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 shrink-0"><ArrowRightOnRectangleIcon className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'alerts' && (<SecurityAlertManager alerts={securityAlerts} users={props.users || []} onAddAlert={onAddAlert!} onResolveAlert={onResolveAlert!} />)}
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; }
                .dark .form-input { border-color: #334155; background-color: #0f172a; color: #fff; }
            `}</style>
        </BaseDashboard>
    );
};



export const StoreView: React.FC<SupportStaffViewProps> = (props) => {
    const { inventory = [], suppliers = [], users = [], onAddItem, onAddItems, onAddStoreTransaction } = props;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'history' | 'suppliers'>('dashboard');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [qrItem, setQrItem] = useState<InventoryItem | null>(null);
    return (
        <BaseDashboard title="Institutional Store" icon={<ArchiveBoxIcon className="w-6 h-6 text-slate-600" />}>
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6"><nav className="-mb-px flex space-x-8 overflow-x-auto pb-1">{['dashboard', 'inventory', 'history', 'suppliers'].map(tab => (<button key={tab} onClick={() => setActiveTab(tab as any)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{tab}</button>))}</nav></div>
            {activeTab === 'inventory' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black uppercase tracking-tight">Active Stock Registry</h3>
                        <div className="flex gap-2">
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
                                        <td className="px-6 py-4 text-right"><button onClick={() => setQrItem(item)} className="text-indigo-600 hover:underline font-black text-[10px] uppercase tracking-widest">Asset Card</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </BaseDashboard>
    );
};

export const InfoDeskView: React.FC<SupportStaffViewProps> = (props) => {
    const { visitors = [], generatedTimetable = [], getSubjectById, getRoomById, getLecturerById, timetableSettings } = props;
    return (
        <BaseDashboard title="Visitor Center" icon={<InformationCircleIcon className="w-6 h-6 text-slate-600" />}>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in-up">
                <h3 className="text-xl font-black uppercase tracking-tight mb-6">Institutional Schedule Hub</h3>
                <TimetableGrid entries={generatedTimetable} getSubjectById={getSubjectById!} getRoomById={getRoomById!} getLecturerById={getLecturerById!} timetableSettings={timetableSettings!} />
            </div>
        </BaseDashboard>
    );
};

export const SupplierView: React.FC<SupportStaffViewProps> = (props) => {
    const { supplierProfile, requisitions = [], onUpdateRequisition } = props;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'catalog' | 'profile'>('dashboard');

    if (!supplierProfile) return <div className="p-20 text-center font-black uppercase text-slate-400 tracking-widest animate-pulse">Authenticating Supplier Profile...</div>;

    return (
        <BaseDashboard title={`Vendor Portal: ${supplierProfile.name}`} icon={<BuildingOfficeIcon className="w-6 h-6 text-slate-600" />}>
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6"><nav className="-mb-px flex space-x-8 overflow-x-auto pb-1">{['dashboard', 'orders', 'catalog', 'profile'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{tab}</button>
            ))}</nav></div>

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
