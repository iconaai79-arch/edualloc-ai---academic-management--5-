import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import type {
    User, Course, StudentAttendance, TimetableEntry,
    Subject, Room, Building, TimetableSettings, LeaveOutRequest, TransportOnboarding, TransportVehicle,
    Assessment, AssessmentMark
} from '../types';
import { UserIcon } from './icons/UserIcon';
import { SynergyHub } from './SynergyHub';
import { Sparkles, Home, Receipt, BadgeCheck, Clock, AlertCircle, Truck, FileText, X, CreditCard, TrendingUp, Wallet, Calendar, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { TransportDisruptionAlert } from './TransportDisruptionAlert';
import type { TransportDisruption } from './TransportDisruptionAlert';
import type { TransportFeeInvoice } from './TransportBillingManager';


interface ParentViewProps {
    user?: User;
    users?: User[];
    courses?: Course[];
    studentAttendances?: StudentAttendance[];
    generatedTimetable?: TimetableEntry[];
    subjects?: Subject[];
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined;
    getRoomById: (id: string) => Room | undefined;
    timetableSettings?: TimetableSettings;
    buildings?: Building[];
    studentCheckIns?: Record<string, string>;
    leaveOutRequests?: LeaveOutRequest[];
    onUpdateLeaveOut?: (id: string, data: Partial<LeaveOutRequest>) => Promise<void>;
    transportOnboarding?: TransportOnboarding[];
    vehicles?: TransportVehicle[];
    onConfirmTransport?: (recordId: string) => Promise<void>;
    assessments?: Assessment[];
    assessmentMarks?: AssessmentMark[];
    onAddAssessment?: (data: any) => Promise<void>;
    onDeleteAssessment?: (id: string) => Promise<void>;
    onAccessAlumnaPortal?: (school: any) => void;
    transportAlerts?: TransportDisruption[];
    onAcknowledgeAlert?: (id: string, parentId: string) => void;
    transportInvoices?: TransportFeeInvoice[];
    isSimulatorMode?: boolean;
    onLogAction?: (msg: string) => Promise<void> | void;
}

import { AttendanceAnalytics } from './AttendanceAnalytics';
import { StudentTransportTracker } from './StudentTransportTracker';

const ChildCard: React.FC<{ child: User, course?: Course, attendances: StudentAttendance[], timetable: TimetableEntry[], subjects: Subject[] }> = ({ child, course, attendances, timetable, subjects }) => {
    const childAttendances = attendances.filter(a => a.studentId === child.id);
    const totalLessons = timetable.filter(t => child.enrolledSubjectIds?.includes(t.subjectId)).length;
    const presentCount = childAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
    const attendanceRate = totalLessons > 0 ? (presentCount / totalLessons) * 100 : 100;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                    <h4 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">{child.name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{course?.name || 'N/A'}</p>
                </div>
            </div>
            <div className="mt-6">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Academic Summary</h5>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enrolled Subjects</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{child.enrolledSubjectIds?.length || 0}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attendance Rate</p>
                        <p className={`text-2xl font-black ${attendanceRate >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{attendanceRate.toFixed(0)}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LeaveOutManager: React.FC<{
    child: User,
    requests: LeaveOutRequest[],
    onUpdate?: (id: string, data: Partial<LeaveOutRequest>) => Promise<void>
}> = ({ child, requests, onUpdate }) => {
    const childRequests = requests.filter(r => r.studentId === child.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (childRequests.length === 0) return null;

    const activeRequest = childRequests.find(r => r.status !== 'cancelled' && r.status !== 'pending_boarding');
    if (!activeRequest) return null;

    return (
        <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-6">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                Leave Out / Exeat Management
            </h5>

            <div className={`p-6 rounded-[2rem] border transition-all ${activeRequest.status === 'checked_out' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                }`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div>
                        <p className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{activeRequest.reason}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {new Date(activeRequest.leaveDate).toLocaleDateString()} - {new Date(activeRequest.returnDate).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${activeRequest.status === 'checked_out' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-100'
                        }`}>
                        {activeRequest.status.replace('_', ' ')}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Home Arrival */}
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Safe Arrival Alert</p>
                        {activeRequest.homeArrivalAt ? (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-black uppercase tracking-tight text-emerald-600 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    Confirmed At Home
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged: {new Date(activeRequest.homeArrivalAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => onUpdate?.(activeRequest.id, { homeArrivalAt: new Date().toISOString() })}
                                disabled={activeRequest.status !== 'checked_out'}
                                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95"
                            >
                                Confirm Arrival
                            </button>
                        )}
                    </div>

                    {/* Home Departure */}
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Return To School Alert</p>
                        {activeRequest.homeDepartureAt ? (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-black uppercase tracking-tight text-indigo-600 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                    Departure Confirmed
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged: {new Date(activeRequest.homeDepartureAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => onUpdate?.(activeRequest.id, { homeDepartureAt: new Date().toISOString() })}
                                disabled={!activeRequest.homeArrivalAt}
                                className="w-full h-12 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-100 transition-all active:scale-95"
                            >
                                Confirm Departure
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ParentView: React.FC<ParentViewProps> = (props) => {
    const { 
        user, 
        users = [], 
        courses = [], 
        studentAttendances = [], 
        generatedTimetable = [], 
        subjects = [],
        getSubjectById = () => undefined,
        getLecturerById = () => undefined,
        getRoomById = () => undefined,
        timetableSettings = {} as any,
        buildings = [],
        studentCheckIns = {},
        leaveOutRequests = [],
        onAccessAlumnaPortal = () => {}
    } = props;
    const isSimulator = props.isSimulatorMode || user?.id?.startsWith('demo_') || user?.id?.startsWith('temp_admin_') || user?.institutionId?.startsWith('demo_') || user?.role === 'super_admin';

    const demoChildUser: User = {
        id: 'demo_student_1',
        name: 'Alex Mwangi',
        role: 'student',
        institutionId: user?.institutionId || 'demo_inst',
        email: 'alex@demo.edu',
        studentIds: [],
        enrolledSubjectIds: ['sub_1', 'sub_2'],
        courseId: 'course_1',
        admissionNumber: 'ADM-001',
        phoneNumber: '0712345678',
    };

    const children = users.filter(u => u && user?.studentIds?.includes(u.id));
    const effectiveChildren = children.length > 0 
        ? children 
        : (isSimulator ? [demoChildUser] : []);

    const [activePanel, setActivePanel] = useState<'dashboard' | 'synergy' | 'transport'>('dashboard');

    // ── Transport Invoice & Statement States ──────────────────────────────────
    const [transportInvoices, setTransportInvoices] = useState<TransportFeeInvoice[]>(() => {
        const saved = localStorage.getItem('eduai_transport_fee_invoices');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                console.error('Error loading transport invoices:', e);
            }
        }
        return [];
    });

    const [selectedInvoice, setSelectedInvoice] = useState<TransportFeeInvoice | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

    // Form inputs and status for simulator checkout
    const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '0712345678');
    const [cardNo, setCardNo] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [isPaying, setIsPaying] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [receiptNumber, setReceiptNumber] = useState('');

    // Remedial Billing States
    const [remedialInvoices, setRemedialInvoices] = useState<any[]>([]);
    const [selectedRemedialInvoice, setSelectedRemedialInvoice] = useState<any | null>(null);
    const [isRemedialPaymentModalOpen, setIsRemedialPaymentModalOpen] = useState(false);
    const [remedialInstallmentAmount, setRemedialInstallmentAmount] = useState<string>('');

    const loadRemedialInvoices = async () => {
        try {
            const childIds = effectiveChildren.map(c => c.id);
            const allInvoices = await apiService.fetchModuleRecords('invoices');
            const filtered = (allInvoices || []).filter((inv: any) => 
                inv && 
                childIds.includes(inv.studentId) && 
                (inv.invoiceNumber?.startsWith('REMEDIAL-') || inv.items?.[0]?.description?.includes('Remedial'))
            );
            setRemedialInvoices(filtered);
        } catch (e) {
            console.error('Failed to load remedial invoices', e);
        }
    };

    useEffect(() => {
        loadRemedialInvoices();
    }, [users, user?.studentIds]);

    const handlePayRemedialInstallment = async (invoiceId: string, payAmount: number, method: string) => {
        try {
            const invoice = remedialInvoices.find(i => i.id === invoiceId);
            if (!invoice) return;

            const currentPaid = Number(invoice.paidAmount || 0);
            const total = Number(invoice.totalAmount || 0);
            const newPaid = Math.min(total, currentPaid + payAmount);
            const status = newPaid >= total ? 'paid' : 'pending';

            const updatedInvoice = {
                ...invoice,
                paidAmount: newPaid,
                status: status
            };

            await apiService.updateModuleRecord('invoices', invoiceId, updatedInvoice);
            
            // Log receipt of installment
            const receiptId = `rec_${Date.now()}`;
            const receiptData = {
                id: receiptId,
                receiptNumber: `REC-REM-${Date.now().toString().slice(-6)}`,
                invoiceId: invoiceId,
                amount: payAmount,
                paymentMethod: method,
                paymentDate: new Date().toISOString(),
                institutionId: user?.institutionId || invoice.institutionId
            };
            await apiService.saveModuleRecord('receipts', receiptData);

            props.onLogAction?.(`Parent paid KES ${payAmount} installment for remedial invoice ${invoice.invoiceNumber}`);
            alert(`Installment payment of KES ${payAmount} processed successfully!`);
            loadRemedialInvoices();
        } catch (e: any) {
            alert(e.message || 'Failed to process payment');
        }
    };

    // ── Simulator / demo fallback data ────────────────────────────────────────
    // When no real transport data is present (e.g. parent_portal simulator),
    // synthesize demo records so all transport sections render visibly.
    const demoChild = effectiveChildren[0];

    const demoInvoice: TransportFeeInvoice = {
        id: 'sim_inv_1',
        studentId: demoChild?.id || 'demo_student_1',
        studentName: demoChild?.name || 'Alex Mwangi',
        admissionNumber: demoChild?.admissionNumber || 'ADM-001',
        routeId: 'sim_route_1',
        routeName: 'Nairobi CBD – School Gate',
        preference: 'round_trip' as const,
        billingCycle: 'term' as const,
        period: 'Term 1 2025',
        baseAmount: 12000,
        discountAmount: 0,
        finalAmount: 12000,
        status: 'pending' as const,
        issuedDate: new Date(Date.now() - 5 * 86400000).toISOString(),
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    };

    const effectiveTransportOnboarding: TransportOnboarding[] = (props.transportOnboarding && props.transportOnboarding.length > 0)
        ? props.transportOnboarding
        : (isSimulator && demoChild ? [{
            id: `sim_ton_${demoChild.id}`,
            studentId: demoChild.id,
            studentName: demoChild.name,
            vehicleId: 'sim_vehicle_1',
            routeId: 'sim_route_1',
            routeName: 'Nairobi CBD – School Gate',
            preference: 'round_trip',
            status: 'boarded',
            boardedAt: new Date(Date.now() - 30 * 60000).toISOString(),
            institutionId: user?.institutionId || '',
            createdAt: new Date().toISOString(),
        }] as any : []);

    const effectiveVehicles: TransportVehicle[] = (props.vehicles && props.vehicles.length > 0)
        ? props.vehicles
        : (isSimulator ? [{
            id: 'sim_vehicle_1',
            plateNumber: 'KBZ 001T',
            capacity: 45,
            model: 'Toyota Coaster',
            vehicleType: 'school' as const,
            institutionId: user?.institutionId || '',
            driverId: 'sim_driver_1',
            assistantId: undefined,
            status: 'active' as const,
        }] : []);

    const effectiveDrivers: User[] = isSimulator
        ? [{ id: 'sim_driver_1', name: 'John Mwangi', role: 'driver', institutionId: user?.institutionId || '', phoneNumber: '0712 345 678', email: 'driver@sim.co.ke' }]
        : [];

    const effectiveTransportAlerts = (props.transportAlerts && props.transportAlerts.length > 0)
        ? props.transportAlerts
        : (isSimulator ? [{
            id: 'sim_alert_1',
            institutionId: user?.institutionId || '',
            title: 'Route Change – Route 3 (CBD–Westlands)',
            message: 'Bus KBZ 001T has been reassigned to cover Route 5 due to a mechanical issue. Students on Route 3 will board Bus KBZ 022Y at the usual stops from 4:00 PM today. Alternative arrangements are in place. Please confirm pickup with the school gate.',
            reason: 'reassigned' as const,
            incidentType: 'route_change' as any,
            affectedRoutes: ['Route 3 – CBD to Westlands'],
            status: 'active' as const,
            createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
            createdBy: 'transport_admin',
            acknowledgedBy: [],
        }] as any : []);

    const effectiveTransportInvoices = transportInvoices.length > 0
        ? transportInvoices
        : (props.transportInvoices && props.transportInvoices.length > 0)
            ? props.transportInvoices
            : (isSimulator && demoChild ? [demoInvoice] : []);

    const handlePayInvoice = (invoiceId: string, method: string) => {
        let updated = [...transportInvoices];
        const index = updated.findIndex(i => i.id === invoiceId);
        
        if (index >= 0) {
            updated[index] = {
                ...updated[index],
                status: 'paid',
                paidDate: new Date().toISOString(),
                paymentMethod: method
            };
        } else {
            // If paying the fallback demo invoice, instantiate it in local storage as paid
            const sourceInvoice = effectiveTransportInvoices.find(i => i.id === invoiceId) || demoInvoice;
            const paidInvoice: TransportFeeInvoice = {
                ...sourceInvoice,
                status: 'paid',
                paidDate: new Date().toISOString(),
                paymentMethod: method
            };
            updated = [paidInvoice, ...updated];
        }
        
        setTransportInvoices(updated);
        localStorage.setItem('eduai_transport_fee_invoices', JSON.stringify(updated));
        
        // Update selectedInvoice in active state if it's the one displayed
        if (selectedInvoice && selectedInvoice.id === invoiceId) {
            setSelectedInvoice(prev => prev ? { ...prev, status: 'paid', paidDate: new Date().toISOString(), paymentMethod: method } : null);
        }
    };

    const getStatementTransactions = () => {
        const txs: Array<{
            date: string;
            ref: string;
            type: 'Invoice' | 'Payment';
            details: string;
            debit: number;
            credit: number;
            balance: number;
        }> = [];

        // Sort invoices by date
        const sortedInvoices = [...effectiveTransportInvoices].sort((a, b) => 
            new Date(a.issuedDate || '').getTime() - new Date(b.issuedDate || '').getTime()
        );

        let runningBalance = 0;

        sortedInvoices.forEach(inv => {
            const invDate = inv.issuedDate || new Date().toISOString();
            
            // Debit (charge)
            runningBalance += inv.finalAmount;
            txs.push({
                date: invDate,
                ref: `INV-${inv.id.substring(0, 8).toUpperCase()}`,
                type: 'Invoice',
                details: `${inv.period} - Bus Transport (${inv.routeName.split('–')[0]?.trim()})`,
                debit: inv.finalAmount,
                credit: 0,
                balance: runningBalance
            });

            // Credit (payment)
            if (inv.status === 'paid') {
                runningBalance -= inv.finalAmount;
                const paidDate = inv.paidDate || new Date(new Date(invDate).getTime() + 86400000).toISOString();
                txs.push({
                    date: paidDate,
                    ref: `REC-${inv.id.substring(0, 8).toUpperCase()}`,
                    type: 'Payment',
                    details: `Payment via ${inv.paymentMethod || 'M-Pesa'}`,
                    debit: 0,
                    credit: inv.finalAmount,
                    balance: runningBalance
                });
            }
        });

        // Sort all ledger transactions by date ascending
        return txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    return (
        <div className="space-y-10 py-6">
            {/* Contextual Navigation Bar */}
            <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl shadow-sm px-2 flex justify-between items-center">
                <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActivePanel('dashboard')}
                        className={`py-4 px-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                            activePanel === 'dashboard' ? 'border-indigo-650 text-indigo-650' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Home className="w-4 h-4 text-indigo-500" />
                        Family Dashboard
                    </button>
                    <button
                        onClick={() => setActivePanel('transport')}
                        className={`py-4 px-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                            activePanel === 'transport' ? 'border-indigo-650 text-indigo-650' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Truck className="w-4 h-4 text-orange-500" />
                        Transport Tracker
                    </button>
                    <button
                        onClick={() => setActivePanel('synergy')}
                        className={`py-4 px-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                            activePanel === 'synergy' ? 'border-indigo-650 text-indigo-650' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                        EduAI Synergy Hub
                    </button>
                </nav>
            </div>

            {activePanel === 'dashboard' ? (
                <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Family Dashboard</h2>
                            <p className="text-slate-500 font-medium">Monitoring academic progress and safety for your children.</p>
                        </div>
                    </div>

            <div className="space-y-8">

                {/* Transport Disruption Alert Banner */}
                {effectiveTransportAlerts.filter((a: any) => a.status === 'active').length > 0 && (
                    <div className="animate-fade-in">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                            </span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Transport Alert — Action Required</p>
                        </div>
                        <TransportDisruptionAlert
                            mode="parent"
                            alerts={effectiveTransportAlerts}
                            onAcknowledge={props.onAcknowledgeAlert}
                            parentId={user?.id || 'parent_user'}
                            parentChildRoutes={[]}
                        />
                    </div>
                )}

                {/* Transport Fee Invoice Status */}
                {effectiveTransportInvoices.length > 0 && (() => {
                    const childIds = effectiveChildren.map(c => c.id);
                    const myInvoices = effectiveTransportInvoices.filter(i => childIds.includes(i.studentId) || isSimulator);
                    if (myInvoices.length === 0) return null;
                    return (
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <Receipt className="w-5 h-5 text-indigo-500" />
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Transport Fee Invoices</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{myInvoices.length} invoice{myInvoices.length !== 1 ? 's' : ''} for your children</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsStatementModalOpen(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-850 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm"
                                >
                                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                    View Statement
                                </button>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-700">
                                {myInvoices.map(inv => {
                                    const isPaid = inv.status === 'paid';
                                    const isOverdue = inv.status === 'overdue';
                                    return (
                                        <div 
                                            key={inv.id} 
                                            onClick={() => setSelectedInvoice(inv)}
                                            className="p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-all"
                                        >
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                                isPaid ? 'bg-emerald-50 dark:bg-emerald-950/30' : isOverdue ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-amber-50 dark:bg-amber-950/30'
                                            }`}>
                                                {isPaid ? <BadgeCheck className="w-5 h-5 text-emerald-600" /> : isOverdue ? <AlertCircle className="w-5 h-5 text-rose-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{inv.studentName}</p>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{inv.routeName.split('–')[0]?.trim()}</span>
                                                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{inv.period}</span>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-sm font-black text-slate-900 dark:text-white">KES {inv.finalAmount.toLocaleString()}</p>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${
                                                    isPaid ? 'text-emerald-600' : isOverdue ? 'text-rose-600' : 'text-amber-600'
                                                }`}>{inv.status}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {myInvoices.some(i => i.status === 'pending' || i.status === 'overdue') && (
                                <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/10 border-t border-indigo-100 dark:border-indigo-900">
                                    <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Please make payment at the school finance office or via M-Pesa Paybill. Contact the bursar for queries.</p>
                                </div>
                            )}
                        </div>
                    );
                })()}

                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <UserIcon className="w-6 h-6 text-indigo-500" />
                    My Children ({effectiveChildren.length})
                </h3>

                {effectiveChildren.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {effectiveChildren.map(child => {
                            const course = courses.find(c => c.id === child.courseId);
                            return (
                                <div key={child.id} className="space-y-6">
                                    <ChildCard
                                        child={child}
                                        course={course}
                                        attendances={studentAttendances}
                                        timetable={generatedTimetable}
                                        subjects={subjects}
                                    />
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <AttendanceAnalytics
                                            timetable={generatedTimetable}
                                            studentAttendances={studentAttendances}
                                            studentCheckIns={props.studentCheckIns ?? {}}
                                            users={users}
                                            subjects={subjects}
                                            institutionId={user?.institutionId ?? ''}
                                            studentId={child.id}
                                        />
                                    </div>

                                    {effectiveTransportOnboarding.length > 0 && (
                                        <div className="mt-6">
                                            {(() => {
                                                const activeRecord = effectiveTransportOnboarding.find(r => r.studentId === child.id && r.status !== 'received');
                                                const vehicle = effectiveVehicles.find(v => v.id === activeRecord?.vehicleId);
                                                const driver = [...users, ...effectiveDrivers].find(u => u.id === vehicle?.driverId);
                                                const assistant = [...users, ...effectiveDrivers].find(u => u.id === vehicle?.assistantId);

                                                return (
                                                    <StudentTransportTracker
                                                        student={child}
                                                        activeOnboarding={activeRecord}
                                                        assignedVehicle={vehicle}
                                                        driver={driver}
                                                        assistant={assistant}
                                                        onConfirmReceipt={props.onConfirmTransport!}
                                                    />
                                                );
                                            })()}
                                        </div>
                                    )}
                                    <LeaveOutManager
                                        child={child}
                                        requests={props.leaveOutRequests || []}
                                        onUpdate={props.onUpdateLeaveOut}
                                    />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-16 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                            <UserIcon className="w-10 h-10 text-slate-300" />
                        </div>
                        <p className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-sm">No linked accounts found</p>
                        <p className="text-slate-400 text-xs mt-2">Please contact the administration to link your children to this portal.</p>
                    </div>
                )}
            </div>
            </>
            ) : activePanel === 'transport' ? (
                <div className="space-y-8 animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Transport Tracker</h2>
                            <p className="text-slate-500 font-medium">Real-time school bus tracking, route alerts, and billing statements.</p>
                        </div>
                    </div>

                    {/* Transport Disruption Alert Banner */}
                    {effectiveTransportAlerts.filter((a: any) => a.status === 'active').length > 0 && (
                        <div className="animate-fade-in">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                                </span>
                                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Transport Alert — Action Required</p>
                            </div>
                            <TransportDisruptionAlert
                                mode="parent"
                                alerts={effectiveTransportAlerts}
                                onAcknowledge={props.onAcknowledgeAlert}
                                parentId={user?.id || 'parent_user'}
                                parentChildRoutes={[]}
                            />
                        </div>
                    )}

                    {/* Remedial Fee Invoices Status */}
                    {remedialInvoices.length > 0 && (() => {
                        return (
                            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden animate-fade-in-up">
                                <div className="p-5 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <Wallet className="w-5 h-5 text-indigo-500" />
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Remedial Extra Lessons Fees</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{remedialInvoices.length} billing invoice(s)</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                                    {remedialInvoices.map(inv => {
                                        const paid = Number(inv.paidAmount || 0);
                                        const total = Number(inv.totalAmount || 0);
                                        const percent = Math.min(100, Math.round((paid / total) * 100));
                                        const balance = Math.max(0, total - paid);
                                        const student = effectiveChildren.find(c => c.id === inv.studentId);

                                        return (
                                            <div key={inv.id} className="p-6 space-y-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{inv.invoiceNumber}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Student: {student?.name || 'Child'}</p>
                                                    </div>
                                                    <div className="text-right sm:text-right">
                                                        <p className="text-xs font-black text-indigo-650 font-mono">Total: KES {total.toLocaleString()}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Balance: KES {balance.toLocaleString()}</p>
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        <span>Paid: KES {paid.toLocaleString()} ({percent}%)</span>
                                                        <span>Remaining: KES {balance.toLocaleString()}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden">
                                                        <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                                                    </div>
                                                </div>

                                                {balance > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedRemedialInvoice(inv);
                                                            setRemedialInstallmentAmount(balance.toString());
                                                            setIsRemedialPaymentModalOpen(true);
                                                        }}
                                                        className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Pay Installment
                                                    </button>
                                                )}
                                                {balance === 0 && (
                                                    <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-1">
                                                        <BadgeCheck className="w-4.5 h-4.5 text-emerald-500" /> Fully Paid
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Transport Fee Invoice Status */}
                    {effectiveTransportInvoices.length > 0 && (() => {
                        const childIds = effectiveChildren.map(c => c.id);
                        const myInvoices = effectiveTransportInvoices.filter(i => childIds.includes(i.studentId) || isSimulator);
                        if (myInvoices.length === 0) return null;
                        return (
                            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <Receipt className="w-5 h-5 text-indigo-500" />
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Transport Fee Invoices</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{myInvoices.length} invoice{myInvoices.length !== 1 ? 's' : ''} for your children</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsStatementModalOpen(true)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-850 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm"
                                    >
                                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                        View Statement
                                    </button>
                                </div>
                                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                                    {myInvoices.map(inv => {
                                        const isPaid = inv.status === 'paid';
                                        const isOverdue = inv.status === 'overdue';
                                        return (
                                            <div 
                                                key={inv.id} 
                                                onClick={() => setSelectedInvoice(inv)}
                                                className="p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-all"
                                            >
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                                    isPaid ? 'bg-emerald-50 dark:bg-emerald-950/30' : isOverdue ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-amber-50 dark:bg-amber-950/30'
                                                }`}>
                                                    {isPaid ? <BadgeCheck className="w-5 h-5 text-emerald-600" /> : isOverdue ? <AlertCircle className="w-5 h-5 text-rose-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{inv.studentName}</p>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{inv.routeName.split('–')[0]?.trim()}</span>
                                                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{inv.period}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">KES {inv.finalAmount.toLocaleString()}</p>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                                                        isPaid ? 'text-emerald-600' : isOverdue ? 'text-rose-600' : 'text-amber-600'
                                                    }`}>{inv.status}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {myInvoices.some(i => i.status === 'pending' || i.status === 'overdue') && (
                                    <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/10 border-t border-indigo-100 dark:border-indigo-900">
                                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Please make payment at the school finance office or via M-Pesa Paybill. Contact the bursar for queries.</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Tracker details per child */}
                    {effectiveChildren.length > 0 ? (
                        <div className="grid grid-cols-1 gap-8">
                            {effectiveChildren.map(child => {
                                const activeRecord = effectiveTransportOnboarding.find(r => r.studentId === child.id && r.status !== 'received');
                                const vehicle = effectiveVehicles.find(v => v.id === activeRecord?.vehicleId);
                                const driver = [...users, ...effectiveDrivers].find(u => u.id === vehicle?.driverId);
                                const assistant = [...users, ...effectiveDrivers].find(u => u.id === vehicle?.assistantId);

                                return (
                                    <div key={child.id} className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>
                                            <h4 className="font-black text-md text-slate-800 dark:text-white uppercase tracking-wider">{child.name}'s Status</h4>
                                        </div>
                                        <StudentTransportTracker
                                            student={child}
                                            activeOnboarding={activeRecord}
                                            assignedVehicle={vehicle}
                                            driver={driver}
                                            assistant={assistant}
                                            onConfirmReceipt={props.onConfirmTransport!}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-16 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-slate-400 text-xs font-medium">No children linked to retrieve transport tracking details.</p>
                        </div>
                    )}
                </div>
            ) : (
                <SynergyHub
                    role="parent"
                    currentUser={user!}
                    users={users}
                    subjects={subjects}
                    courses={courses}
                    studentAttendances={studentAttendances}
                    assessments={props.assessments || []}
                    assessmentMarks={props.assessmentMarks || []}
                />
            )}

            {/* ── Transport Invoice Detail Modal ────────────────────────────────────── */}
            {selectedInvoice && !isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center text-indigo-650">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Transport Invoice</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{selectedInvoice.id.substring(0, 8).toUpperCase()}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedInvoice(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-350 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8 space-y-6">
                            {/* Institution Branding */}
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">EDUALLOC TRANSPORT ACADEMY</h4>
                                    <p className="text-xs text-slate-400 font-medium">Official Student Transportation Billing</p>
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                                    selectedInvoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-300' :
                                    selectedInvoice.status === 'overdue' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/45 dark:text-rose-300' :
                                    'bg-amber-100 text-amber-800 dark:bg-amber-950/45 dark:text-amber-305'
                                }`}>
                                    {selectedInvoice.status}
                                </span>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-700" />

                            {/* Billed To / Invoice Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Billed To</p>
                                    <p className="font-black text-slate-900 dark:text-white uppercase">{selectedInvoice.studentName}</p>
                                    <p className="text-xs text-slate-500 font-medium font-mono">Adm No: {selectedInvoice.admissionNumber}</p>
                                    <p className="text-xs text-slate-550 font-medium">Linked Parent Account</p>
                                </div>
                                <div className="space-y-1 md:text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Details</p>
                                    <p className="text-xs text-slate-500 font-medium">Date Issued: {new Date(selectedInvoice.issuedDate || '').toLocaleDateString()}</p>
                                    <p className="text-xs text-slate-500 font-medium">Due Date: {new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                                    <p className="text-xs text-slate-500 font-medium">Period: <span className="font-bold text-indigo-500">{selectedInvoice.period}</span></p>
                                    {selectedInvoice.paidDate && (
                                        <p className="text-xs text-emerald-600 font-black uppercase mt-1">Paid On: {new Date(selectedInvoice.paidDate).toLocaleDateString()} ({selectedInvoice.paymentMethod})</p>
                                    )}
                                </div>
                            </div>

                            {/* Line Items Table */}
                            <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden mt-6">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 uppercase tracking-widest font-black border-b border-slate-100 dark:border-slate-700">
                                            <th className="p-4">Description</th>
                                            <th className="p-4 text-right">Base Fare</th>
                                            <th className="p-4 text-right">Discount</th>
                                            <th className="p-4 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-350">
                                        <tr>
                                            <td className="p-4 font-semibold">
                                                School Bus Transportation Fee
                                                <div className="text-[10px] font-medium text-slate-400 uppercase mt-0.5">
                                                    Route: {selectedInvoice.routeName} ({selectedInvoice.preference.replace('_', ' ')})
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">KES {selectedInvoice.baseAmount.toLocaleString()}</td>
                                            <td className="p-4 text-right">KES {selectedInvoice.discountAmount?.toLocaleString() || 0}</td>
                                            <td className="p-4 text-right font-black text-slate-900 dark:text-white">KES {selectedInvoice.finalAmount.toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Totals Summary */}
                            <div className="flex flex-col items-end gap-2 text-sm pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between w-64">
                                    <span className="text-slate-500 font-medium">Subtotal</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">KES {selectedInvoice.finalAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between w-64 border-t border-slate-50 dark:border-slate-700 pt-2 text-base font-black">
                                    <span className="text-slate-955 dark:text-white uppercase tracking-tight">Total Amount Due</span>
                                    <span className="text-indigo-650 dark:text-indigo-400">KES {selectedInvoice.finalAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between w-64 text-xs font-semibold pt-1">
                                    <span className="text-slate-400">Balance Outstanding</span>
                                    <span className={selectedInvoice.status === 'paid' ? 'text-emerald-600' : 'text-rose-605'}>
                                        KES {selectedInvoice.status === 'paid' ? '0' : selectedInvoice.finalAmount.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex justify-between items-center gap-3">
                            <button
                                onClick={() => setSelectedInvoice(null)}
                                className="px-5 h-11 bg-white hover:bg-slate-100 border border-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-650 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Close View
                            </button>
                            
                            {selectedInvoice.status !== 'paid' && (
                                <button
                                    onClick={() => {
                                        setPaymentSuccess(false);
                                        setReceiptNumber('');
                                        setIsPaymentModalOpen(true);
                                    }}
                                    className="px-6 h-11 bg-indigo-600 hover:bg-indigo-705 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-150 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Pay Now (KES {selectedInvoice.finalAmount.toLocaleString()})
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Transport Fee Payment Checkout Modal ───────────────────────────────── */}
            {isPaymentModalOpen && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div className="flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-indigo-500" />
                                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Secure Checkout</h3>
                            </div>
                            {!isPaying && (
                                <button 
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-350 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        {!paymentSuccess ? (
                            <div className="p-6 space-y-6">
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Payable Amount</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">KES {selectedInvoice.finalAmount.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Student: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedInvoice.studentName}</span></p>
                                    <p className="text-[10px] text-slate-404 font-bold uppercase tracking-widest mt-0.5">{selectedInvoice.period} Transport Fee</p>
                                </div>

                                {/* Payment Method Chooser */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('mpesa')}
                                        disabled={isPaying}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                                            paymentMethod === 'mpesa' 
                                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' 
                                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className="text-xs font-black uppercase tracking-widest">M-Pesa STK</span>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Mobile Money</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('card')}
                                        disabled={isPaying}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                                            paymentMethod === 'card' 
                                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400' 
                                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className="text-xs font-black uppercase tracking-widest">Card Pay</span>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Visa / Master</span>
                                    </button>
                                </div>

                                {paymentMethod === 'mpesa' ? (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">M-Pesa Phone Number</label>
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            disabled={isPaying}
                                            placeholder="e.g. 0712345678"
                                            className="w-full px-4 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 transition-colors"
                                        />
                                        <p className="text-[9px] text-slate-400 font-medium">An STK push PIN request will be sent to this mobile number.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Card Number</label>
                                            <input
                                                type="text"
                                                value={cardNo}
                                                onChange={(e) => setCardNo(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                                                disabled={isPaying}
                                                maxLength={19}
                                                placeholder="4000 1234 5678 9010"
                                                className="w-full px-4 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expiry (MM/YY)</label>
                                                <input
                                                    type="text"
                                                    value={expiry}
                                                    onChange={(e) => setExpiry(e.target.value)}
                                                    disabled={isPaying}
                                                    maxLength={5}
                                                    placeholder="12/28"
                                                    className="w-full px-4 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 transition-colors text-center"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CVV</label>
                                                <input
                                                    type="password"
                                                    value={cvv}
                                                    onChange={(e) => setCvv(e.target.value)}
                                                    disabled={isPaying}
                                                    maxLength={3}
                                                    placeholder="***"
                                                    className="w-full px-4 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 transition-colors text-center"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isPaying ? (
                                    <div className="py-4 flex flex-col items-center justify-center gap-3 text-center">
                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white">Processing Transaction</p>
                                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-1">
                                                {paymentMethod === 'mpesa' ? `Awaiting pin prompt on ${phoneNumber}...` : 'Authorizing with secure gateway...'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setIsPaying(true);
                                            await new Promise(r => setTimeout(r, 2200)); // Simulate gateway delay
                                            setIsPaying(false);
                                            setPaymentSuccess(true);
                                            const rec = 'REC-' + Math.floor(Math.random() * 900000 + 100000);
                                            setReceiptNumber(rec);
                                            handlePayInvoice(selectedInvoice.id, paymentMethod === 'mpesa' ? 'M-Pesa STK' : 'Card');
                                        }}
                                        className="w-full h-12 bg-slate-900 hover:bg-black text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02]"
                                    >
                                        Authorize & Pay KES {selectedInvoice.finalAmount.toLocaleString()}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Payment Successful</h4>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Receipt Number: <span className="font-bold text-slate-800 dark:text-slate-200">{receiptNumber}</span></p>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-1">
                                        Transport charges settled via {paymentMethod === 'mpesa' ? 'M-Pesa Mobile Money' : 'Credit Card'}.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsPaymentModalOpen(false);
                                        setPaymentSuccess(false);
                                    }}
                                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-705 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Back to Portal
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Transport Account Statement History Modal ──────────────────────────── */}
            {isStatementModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center text-indigo-650">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Transport Account Statement</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historical Ledger & Transactions</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsStatementModalOpen(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-350 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Statement Body */}
                        <div className="p-8 space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">ACCOUNT OWNER</p>
                                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{user?.name || 'Parent Portal'}</h4>
                                    <p className="text-xs text-slate-500 font-medium">{user?.email}</p>
                                </div>
                                <div className="space-y-1 sm:text-right">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">RUNNING TRANSPORT STATUS</p>
                                    <div className="flex flex-col gap-0.5">
                                        {effectiveChildren.map(c => {
                                            const activeOnb = effectiveTransportOnboarding.find(o => o.studentId === c.id) as any;
                                            return (
                                                <p key={c.id} className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    {c.name} (Adm: {c.admissionNumber}) – <span className="text-indigo-500 font-black uppercase tracking-wider">{activeOnb?.preference?.replace('_', ' ') || 'none'}</span>
                                                </p>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Ledger Table */}
                            {(() => {
                                const txs = getStatementTransactions();
                                const totalBilled = txs.reduce((acc, t) => acc + t.debit, 0);
                                const totalPaid = txs.reduce((acc, t) => acc + t.credit, 0);
                                const outstanding = totalBilled - totalPaid;

                                return (
                                    <>
                                        <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden mt-6">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 uppercase tracking-widest font-black border-b border-slate-100 dark:border-slate-700">
                                                        <th className="p-4">Date</th>
                                                        <th className="p-4">Reference</th>
                                                        <th className="p-4">Type</th>
                                                        <th className="p-4">Details</th>
                                                        <th className="p-4 text-right">Debit (Charges)</th>
                                                        <th className="p-4 text-right">Credit (Payments)</th>
                                                        <th className="p-4 text-right">Balance</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                                                    {txs.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="p-8 text-center text-slate-400 font-medium uppercase tracking-wider">No transaction history found</td>
                                                        </tr>
                                                    ) : (
                                                        txs.map((tx, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                                                                <td className="p-4 whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</td>
                                                                <td className="p-4 font-mono font-bold text-slate-900 dark:text-white uppercase">{tx.ref}</td>
                                                                <td className="p-4">
                                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                                        tx.type === 'Invoice' ? 'bg-amber-50 text-amber-700 dark:bg-amber-955/20' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-955/20'
                                                                    }`}>
                                                                        {tx.type}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4">{tx.details}</td>
                                                                <td className="p-4 text-right text-rose-600 font-semibold">{tx.debit > 0 ? `KES ${tx.debit.toLocaleString()}` : '—'}</td>
                                                                <td className="p-4 text-right text-emerald-600 font-semibold">{tx.credit > 0 ? `KES ${tx.credit.toLocaleString()}` : '—'}</td>
                                                                <td className="p-4 text-right font-black text-slate-950 dark:text-white">KES {tx.balance.toLocaleString()}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Summaries */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-750">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Billed Charges</p>
                                                <p className="text-xl font-black text-slate-900 dark:text-white mt-1">KES {totalBilled.toLocaleString()}</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-750">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Paid Credits</p>
                                                <p className="text-xl font-black text-emerald-650 dark:text-emerald-400 mt-1">KES {totalPaid.toLocaleString()}</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-750">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Outstanding Balance</p>
                                                <p className={`text-xl font-black mt-1 ${outstanding > 0 ? 'text-rose-600' : 'text-slate-500'}`}>KES {outstanding.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Statement Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex justify-between items-center">
                            <button
                                onClick={() => setIsStatementModalOpen(false)}
                                className="px-5 h-11 bg-white hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-650 text-slate-750 dark:text-slate-350 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Close Statement
                            </button>
                            
                            <button
                                onClick={() => window.print()}
                                className="px-5 h-11 bg-slate-900 hover:bg-black dark:bg-indigo-650 dark:hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-2"
                            >
                                <TrendingUp className="w-3.5 h-3.5" />
                                Export Ledger
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Remedial Fee Installment Checkout Modal ───────────────────────────────── */}
            {isRemedialPaymentModalOpen && selectedRemedialInvoice && (() => {
                const total = Number(selectedRemedialInvoice.totalAmount || 0);
                const paid = Number(selectedRemedialInvoice.paidAmount || 0);
                const balance = total - paid;
                const student = effectiveChildren.find(c => c.id === selectedRemedialInvoice.studentId);

                const handleConfirmPayment = async () => {
                    const payVal = Number(remedialInstallmentAmount);
                    if (isNaN(payVal) || payVal <= 0) {
                        return alert('Please enter a valid payment amount');
                    }
                    if (payVal > balance) {
                        return alert(`Payment amount cannot exceed remaining balance of KES ${balance.toLocaleString()}`);
                    }

                    setIsPaying(true);
                    await new Promise(r => setTimeout(r, 2000));
                    setIsPaying(false);
                    await handlePayRemedialInstallment(selectedRemedialInvoice.id, payVal, paymentMethod === 'mpesa' ? 'M-Pesa STK' : 'Card');
                    setIsRemedialPaymentModalOpen(false);
                };

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                                <div className="flex items-center gap-2">
                                    <Wallet className="w-5 h-5 text-indigo-500" />
                                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Remedial Fee Installment</h3>
                                </div>
                                {!isPaying && (
                                    <button 
                                        onClick={() => setIsRemedialPaymentModalOpen(false)}
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-350 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice: {selectedRemedialInvoice.invoiceNumber}</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">KES {balance.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Outstanding Balance for <span className="font-bold text-slate-800 dark:text-slate-200">{student?.name}</span></p>
                                </div>

                                <div className="space-y-4">
                                    {/* Installment Amount Input */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Installment Amount to Pay (KES)</label>
                                        <input
                                            type="number"
                                            value={remedialInstallmentAmount}
                                            onChange={(e) => setRemedialInstallmentAmount(e.target.value)}
                                            disabled={isPaying}
                                            max={balance}
                                            placeholder="Enter custom amount"
                                            className="w-full px-4 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                                        />
                                    </div>

                                    {/* Payment Method Switcher */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('mpesa')}
                                            disabled={isPaying}
                                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                                                paymentMethod === 'mpesa' 
                                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' 
                                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span className="text-xs font-black uppercase tracking-widest">M-Pesa</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('card')}
                                            disabled={isPaying}
                                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                                                paymentMethod === 'card' 
                                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400' 
                                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span className="text-xs font-black uppercase tracking-widest">Card Pay</span>
                                        </button>
                                    </div>

                                    {paymentMethod === 'mpesa' ? (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                disabled={isPaying}
                                                className="w-full px-4 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Card Info</label>
                                            <input
                                                type="text"
                                                placeholder="Card number"
                                                disabled={isPaying}
                                                className="w-full px-4 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none"
                                            />
                                        </div>
                                    )}

                                    {isPaying ? (
                                        <div className="py-4 flex flex-col items-center justify-center gap-2">
                                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-xs font-bold text-slate-500">Processing installment payment...</p>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleConfirmPayment}
                                            className="w-full h-12 bg-slate-900 hover:bg-black text-white dark:bg-indigo-650 dark:hover:bg-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                        >
                                            Pay KES {Number(remedialInstallmentAmount).toLocaleString()}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

