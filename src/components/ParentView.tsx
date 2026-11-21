import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import type {
    User, Course, StudentAttendance, TimetableEntry,
    Subject, Room, Building, TimetableSettings, LeaveOutRequest, TransportOnboarding, TransportVehicle,
    Assessment, AssessmentMark
} from '../types';
import { UserIcon } from './icons/UserIcon';
import { SynergyHub } from './SynergyHub';
import { 
    Sparkles, Home, Receipt, BadgeCheck, Clock, AlertCircle, Truck, FileText, X, 
    CreditCard, TrendingUp, Wallet, Calendar, ArrowLeft, CheckCircle2,
    Bus, MapPin, Phone, Check, Plus, ChevronRight, CheckCircle, XCircle, ArrowRight, Loader2, Navigation, ShieldCheck, RefreshCw, Compass, Info
} from 'lucide-react';
import { TransportDisruptionAlert } from './TransportDisruptionAlert';
import type { TransportDisruption } from './TransportDisruptionAlert';
import type { TransportFeeInvoice, RouteFeeSetting, TripPreference, BillingCycle } from './TransportBillingManager';


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
    companyDetails?: any;
    onLogAction?: (msg: string) => Promise<void> | void;
}

import { AttendanceAnalytics } from './AttendanceAnalytics';
import { StudentTransportTracker } from './StudentTransportTracker';
import { ParentPocketMoneyPanel } from './Finance/ParentPocketMoneyPanel';

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

            {/* Kids Coding & Robotics Account Activation */}
            <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-5">
                <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-900 p-5 rounded-2xl text-white space-y-3 shadow-md">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🚀</span>
                            <div>
                                <h5 className="font-black text-sm uppercase italic tracking-tight">Kids Coding & Robotics Studio</h5>
                                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Syllabus-Aligned Block Coding & Audio</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 text-[9px] font-black uppercase">
                            ACTIVE
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                        <button
                            onClick={() => {
                                window.open(`/?view=robotics&student=${encodeURIComponent(child.name)}`, '_blank');
                            }}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-95"
                        >
                            <span>▶ Launch Robotics Studio for {child.name.split(' ')[0]}</span>
                        </button>
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
    const childRequests = requests
        .filter(r => r.studentId === child.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (childRequests.length === 0) return null;

    // Active request is any non-cancelled and non-rejected request (or latest)
    const activeRequest = childRequests.find(r => r.status !== 'cancelled' && r.status !== 'rejected') || childRequests[0];
    if (!activeRequest) return null;

    const isPendingApproval = activeRequest.status === 'pending_headteacher';
    const isPendingClearance = activeRequest.status === 'pending_boarding' || activeRequest.status === 'pending_security';
    const isCheckedOut = activeRequest.status === 'checked_out';
    const isRejected = activeRequest.status === 'rejected';

    return (
        <div className="bg-gradient-to-br from-white to-indigo-50/40 dark:from-slate-800 dark:to-slate-900 p-7 rounded-[2.5rem] border border-indigo-100/80 dark:border-slate-700 shadow-sm transition-all space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                        <Home className="w-5 h-5" />
                    </div>
                    <div>
                        <h5 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            Exeat & Home Transit Tracker
                        </h5>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Leave Permission &bull; Safe Arrival & Return Confirmation
                        </p>
                    </div>
                </div>

                {/* Status Badge */}
                <div>
                    {isPendingApproval && (
                        <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                            Awaiting Headteacher Approval
                        </span>
                    )}
                    {isPendingClearance && (
                        <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                            Approved &bull; Exit Clearance In Progress
                        </span>
                    )}
                    {isCheckedOut && (
                        <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            Checked Out of School Gate
                        </span>
                    )}
                    {isRejected && (
                        <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-300">
                            Rejected by Administration
                        </span>
                    )}
                </div>
            </div>

            {/* Leave Details Card */}
            <div className="p-4 bg-white/90 dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason for Leave</span>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100">{activeRequest.reason}</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Permitted Period</span>
                        <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                            {new Date(activeRequest.leaveDate).toLocaleDateString()} &rarr; {new Date(activeRequest.returnDate).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                {activeRequest.headteacherApprovedAt && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-[10px] font-bold text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approved by School Administration on {new Date(activeRequest.headteacherApprovedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}. Parent notified.
                    </div>
                )}
            </div>

            {/* Home Arrival & Departure Confirmations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Safe Arrival at Home */}
                <div className={`p-5 rounded-3xl border transition-all ${activeRequest.homeArrivalAt ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phase 1: Safe Arrival</span>
                        <Home className={`w-4 h-4 ${activeRequest.homeArrivalAt ? 'text-emerald-600' : 'text-slate-400'}`} />
                    </div>

                    {activeRequest.homeArrivalAt ? (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                Safely Arrived at Home
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                Logged: {new Date(activeRequest.homeArrivalAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <button
                                onClick={() => onUpdate?.(activeRequest.id, { homeArrivalAt: new Date().toISOString() })}
                                disabled={activeRequest.status !== 'checked_out'}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-emerald-200 transition-all cursor-pointer active:scale-95"
                            >
                                Confirm Safe Arrival at Home
                            </button>
                            <p className="text-[9px] text-slate-400 font-bold text-center">
                                {activeRequest.status !== 'checked_out' ? 'Active once learner checks out of school gate' : 'Click to notify school administration that your child has arrived safely'}
                            </p>
                        </div>
                    )}
                </div>

                {/* 2. Departure from Home (Return to School) */}
                <div className={`p-5 rounded-3xl border transition-all ${activeRequest.homeDepartureAt ? 'bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phase 2: Return to School</span>
                        <Clock className={`w-4 h-4 ${activeRequest.homeDepartureAt ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>

                    {activeRequest.homeDepartureAt ? (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-tight">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                                Departed Home &bull; En Route to School
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                Logged: {new Date(activeRequest.homeDepartureAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <button
                                onClick={() => onUpdate?.(activeRequest.id, { homeDepartureAt: new Date().toISOString() })}
                                disabled={!activeRequest.homeArrivalAt}
                                className="w-full py-3.5 bg-slate-900 hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-slate-200 transition-all cursor-pointer active:scale-95"
                            >
                                Confirm Departure from Home
                            </button>
                            <p className="text-[9px] text-slate-400 font-bold text-center">
                                {!activeRequest.homeArrivalAt ? 'Confirm safe arrival first before departure' : 'Click when student departs home to return to school'}
                            </p>
                        </div>
                    )}
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

    // ── Student Leave Out / Exeat Local State ─────────────────────────────────
    const [localLeaveOuts, setLocalLeaveOuts] = useState<LeaveOutRequest[]>(leaveOutRequests || []);

    const loadLeaveOuts = async () => {
        const instId = user?.institutionId;
        if (!instId) return;
        try {
            const records = await apiService.fetchModuleRecords<LeaveOutRequest>('leave_out_requests', instId);
            if (records && Array.isArray(records)) {
                setLocalLeaveOuts(records);
            }
        } catch (e) {
            console.error("Failed to load parent leave outs:", e);
        }
    };

    useEffect(() => {
        if (leaveOutRequests && leaveOutRequests.length > 0) {
            setLocalLeaveOuts(leaveOutRequests);
        } else {
            loadLeaveOuts();
        }
    }, [leaveOutRequests, user?.institutionId]);

    const handleUpdateLeaveOut = async (id: string, data: Partial<LeaveOutRequest>) => {
        if (props.onUpdateLeaveOut) {
            try {
                await props.onUpdateLeaveOut(id, data);
            } catch (_) {}
        }

        const now = new Date().toISOString();
        setLocalLeaveOuts(prev => prev.map(r => r.id === id ? { ...r, ...data, updatedAt: now } : r));

        try {
            const instId = user?.institutionId || '';
            const existing = localLeaveOuts.find(r => r.id === id);
            if (existing) {
                const updated: LeaveOutRequest = { ...existing, ...data, updatedAt: now };
                await apiService.saveModuleRecord('leave_out_requests', updated);

                // Safe Arrival at Home notification to School
                if (data.homeArrivalAt && existing.classTeacherId) {
                    try {
                        await apiService.createNotification({
                            userId: existing.classTeacherId,
                            institutionId: instId,
                            title: 'Student Safe Arrival at Home Confirmed',
                            message: `Parent confirmed that their child has arrived safely at home on ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                            type: 'system',
                            link: '/leave-out-requests'
                        });
                    } catch (_) {}
                }

                // Departure from Home (Returning to School) notification to School & Gate
                if (data.homeDepartureAt && existing.classTeacherId) {
                    try {
                        await apiService.createNotification({
                            userId: existing.classTeacherId,
                            institutionId: instId,
                            title: 'Student Departed Home - Returning to School',
                            message: `Parent confirmed student departure from home at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Returning to school for resumption.`,
                            type: 'alert',
                            link: '/leave-out-requests'
                        });
                    } catch (_) {}
                }
            }
        } catch (err) {
            console.error("Failed to save parent leave out update:", err);
        }
    };

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

    const [activePanel, setActivePanel] = useState<'dashboard' | 'synergy' | 'transport' | 'pocket_money'>('dashboard');

    // ── Transport Invoice & Statement States ──────────────────────────────────
    const transportInvKey = user?.institutionId ? `eduai_transport_fee_invoices_${user.institutionId}` : null;
    const [transportInvoices, setTransportInvoices] = useState<TransportFeeInvoice[]>(() => {
        if (!transportInvKey) return [];
        const saved = localStorage.getItem(transportInvKey);
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

    // ── Transport Subscriptions & Routes ──────────────────────────────────────
    const [transportRoutes, setTransportRoutes] = useState<RouteFeeSetting[]>([]);
    const [isLoadingRoutes, setIsLoadingRoutes] = useState<boolean>(false);
    const [parentSubscriptions, setParentSubscriptions] = useState<any[]>([]);
    const [isLoadingParentSubs, setIsLoadingParentSubs] = useState<boolean>(false);

    // Modal state for Subscribing to Transport
    const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState<boolean>(false);
    const [subStep, setSubStep] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [subStudentId, setSubStudentId] = useState<string>('');
    const [subRouteId, setSubRouteId] = useState<string>('');
    const [subTripPreference, setSubTripPreference] = useState<TripPreference>('round_trip');
    const [subBillingCycle, setSubBillingCycle] = useState<BillingCycle>('term');
    const [subPickupStage, setSubPickupStage] = useState<string>('');
    const [subNotes, setSubNotes] = useState<string>('');
    const [subParentPhone, setSubParentPhone] = useState<string>(user?.phoneNumber || '');
    const [subPayMethod, setSubPayMethod] = useState<'pay_later' | 'mpesa_now'>('pay_later');
    const [subIsSubmitting, setSubIsSubmitting] = useState<boolean>(false);
    const [subSuccess, setSubSuccess] = useState<boolean>(false);
    const [subErrorMessage, setSubErrorMessage] = useState<string>('');

    const loadTransportRoutes = React.useCallback(async () => {
        const instId = user?.institutionId;
        if (!instId) return;
        setIsLoadingRoutes(true);
        try {
            let list: RouteFeeSetting[] = await apiService.fetchModuleRecords('transport_route_fee_settings', instId);
            if (!Array.isArray(list) || list.length === 0) {
                const rawKey = `eduai_transport_route_fee_settings_${instId}`;
                const cached = localStorage.getItem(rawKey);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
                    } catch {}
                }
            }
            if (!Array.isArray(list) || list.length === 0) {
                list = [
                    { routeId: 'route_1', routeName: 'Route 1: Nairobi CBD – Westlands – School Gate', termFee: 12000, monthlyFee: 4500, oneWayPercentage: 60 },
                    { routeId: 'route_2', routeName: 'Route 2: Kilimani – Kileleshwa – Lavington – School Gate', termFee: 14000, monthlyFee: 5000, oneWayPercentage: 60 },
                    { routeId: 'route_3', routeName: 'Route 3: Ngong Road – Karen – Langata – School Gate', termFee: 15500, monthlyFee: 5500, oneWayPercentage: 60 },
                    { routeId: 'route_4', routeName: 'Route 4: Thika Road – Kasarani – Roysambu – School Gate', termFee: 13500, monthlyFee: 4800, oneWayPercentage: 60 },
                    { routeId: 'route_5', routeName: 'Route 5: South B – South C – Nairobi West – School Gate', termFee: 12500, monthlyFee: 4500, oneWayPercentage: 60 }
                ];
            }
            setTransportRoutes(list);
            if (!subRouteId && list.length > 0) {
                setSubRouteId(list[0].routeId);
            }
        } catch (e) {
            console.warn('Could not load transport routes:', e);
        } finally {
            setIsLoadingRoutes(false);
        }
    }, [user?.institutionId, subRouteId]);

    const loadParentSubscriptions = React.useCallback(async () => {
        const instId = user?.institutionId;
        if (!instId) return;
        setIsLoadingParentSubs(true);
        try {
            const records = await apiService.fetchModuleRecords<any>('transport_subscription_requests', instId);
            const childIds = effectiveChildren.map(c => c.id);
            const childNames = effectiveChildren.map(c => c.name?.toLowerCase().trim());
            const childAdms = effectiveChildren.map(c => (c.admissionNumber || (c as any).admNumber || '').toLowerCase().trim());

            let mySubs = (records || []).filter((r: any) => {
                if (!r) return false;
                if (r.parentId === user?.id) return true;
                if (r.studentId && childIds.includes(r.studentId)) return true;
                if (r.studentName && childNames.includes(r.studentName.toLowerCase().trim())) return true;
                if (r.admissionNumber && childAdms.includes(r.admissionNumber.toLowerCase().trim())) return true;
                return false;
            });

            const localKey = `eduai_transport_subscription_requests_${instId}`;
            const localCached = localStorage.getItem(localKey);
            if (localCached) {
                try {
                    const parsed = JSON.parse(localCached);
                    if (Array.isArray(parsed)) {
                        parsed.forEach((pr: any) => {
                            if (
                                (pr.parentId === user?.id || childIds.includes(pr.studentId)) &&
                                !mySubs.some(s => s.id === pr.id)
                            ) {
                                mySubs.push(pr);
                            }
                        });
                    }
                } catch {}
            }

            if (mySubs.length === 0 && isSimulator && demoChild) {
                mySubs = [{
                    id: `sub_sim_${demoChild.id}`,
                    institutionId: instId,
                    studentId: demoChild.id,
                    studentName: demoChild.name,
                    admissionNumber: demoChild.admissionNumber || 'ADM-001',
                    parentPhone: user?.phoneNumber || '0712 345 678',
                    parentId: user?.id,
                    routeId: 'route_1',
                    routeName: 'Route 1: Nairobi CBD – Westlands – School Gate',
                    pickupStage: 'Westlands Square Stage',
                    notes: 'Morning pickup at 6:45 AM',
                    tripPreference: 'round_trip',
                    billingCycle: 'term',
                    baseAmount: 12000,
                    finalAmount: 12000,
                    paymentMethod: 'pay_later',
                    status: 'pending',
                    approvalStatus: 'approved',
                    submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
                    period: 'Term 1 · 2025'
                }];
            }

            setParentSubscriptions(mySubs);
        } catch (e) {
            console.warn('Could not load parent transport subscriptions:', e);
        } finally {
            setIsLoadingParentSubs(false);
        }
    }, [user?.institutionId, user?.id, effectiveChildren, isSimulator, demoChild]);

    useEffect(() => {
        loadTransportRoutes();
        loadParentSubscriptions();
    }, [loadTransportRoutes, loadParentSubscriptions]);

    const activeRouteForSub = transportRoutes.find(r => r.routeId === subRouteId) || transportRoutes[0];
    const subBaseAmount = React.useMemo(() => {
        if (!activeRouteForSub) return 0;
        return subBillingCycle === 'term' ? (activeRouteForSub.termFee || 0) : (activeRouteForSub.monthlyFee || 0);
    }, [activeRouteForSub, subBillingCycle]);

    const subMultiplier = subTripPreference === 'round_trip' 
        ? 1.0 
        : subTripPreference === 'none' 
        ? 0 
        : ((activeRouteForSub?.oneWayPercentage || 60) / 100);
    const subFinalAmount = Math.round(subBaseAmount * subMultiplier);

    const handleSubscribeSubmit = async () => {
        const student = effectiveChildren.find(c => c.id === subStudentId) || effectiveChildren[0];
        if (!student) {
            setSubErrorMessage('Please select a student.');
            return;
        }
        if (!activeRouteForSub) {
            setSubErrorMessage('Please select a transport route.');
            return;
        }
        if (!subParentPhone.trim()) {
            setSubErrorMessage('Please enter your contact phone number.');
            return;
        }

        setSubIsSubmitting(true);
        setSubErrorMessage('');

        try {
            const instId = user?.institutionId || 'default';
            const now = new Date();
            const monthNum = now.getMonth() + 1;
            const term = monthNum <= 4 ? 1 : monthNum <= 8 ? 2 : 3;
            const period = subBillingCycle === 'term' 
                ? `Term ${term} · ${now.getFullYear()}` 
                : `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;

            const subId = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

            const payload: any = {
                id: subId,
                institutionId: instId,
                studentId: student.id,
                studentName: student.name,
                admissionNumber: student.admissionNumber || (student as any).admNumber || 'ADM-' + String(student.id).slice(-4),
                parentPhone: subParentPhone.trim(),
                parentId: user?.id,
                routeId: activeRouteForSub.routeId,
                routeName: activeRouteForSub.routeName,
                pickupStage: subPickupStage.trim() || 'Designated Home Stage',
                notes: subNotes.trim(),
                tripPreference: subTripPreference,
                billingCycle: subBillingCycle,
                baseAmount: subBaseAmount,
                finalAmount: subFinalAmount,
                paymentMethod: subPayMethod,
                status: subPayMethod === 'mpesa_now' ? 'paid' : 'pending',
                approvalStatus: 'pending',
                submittedAt: now.toISOString(),
                period: period
            };

            await apiService.saveModuleRecord('transport_subscription_requests', payload, instId);

            try {
                const localKey = `eduai_transport_subscription_requests_${instId}`;
                const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
                existing.unshift(payload);
                localStorage.setItem(localKey, JSON.stringify(existing));
            } catch {}

            // Generate Transport Fee Invoice
            const invId = `INV-TRP-${Date.now().toString(36).toUpperCase()}`;
            const newInvoice: TransportFeeInvoice = {
                id: invId,
                studentId: student.id,
                studentName: student.name,
                admissionNumber: student.admissionNumber || (student as any).admNumber || 'ADM-' + String(student.id).slice(-4),
                routeId: activeRouteForSub.routeId,
                routeName: activeRouteForSub.routeName,
                preference: subTripPreference,
                billingCycle: subBillingCycle,
                period: period,
                baseAmount: subBaseAmount,
                discountAmount: 0,
                finalAmount: subFinalAmount,
                status: subPayMethod === 'mpesa_now' ? 'paid' : 'pending',
                issuedDate: now.toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
                institutionId: instId,
                parentPhone: subParentPhone.trim()
            };

            try {
                await apiService.saveModuleRecord('transport_fee_invoices', newInvoice, instId);
                const invLocalKey = `eduai_transport_fee_invoices_${instId}`;
                const existingInvs = JSON.parse(localStorage.getItem(invLocalKey) || '[]');
                existingInvs.unshift(newInvoice);
                localStorage.setItem(invLocalKey, JSON.stringify(existingInvs));
                setTransportInvoices(prev => [newInvoice, ...prev]);
            } catch {}

            if (subPayMethod === 'mpesa_now') {
                try {
                    const receiptData = {
                        id: `rec_${Date.now()}`,
                        receiptNumber: `REC-TRP-${Date.now().toString().slice(-6)}`,
                        invoiceId: invId,
                        amount: subFinalAmount,
                        paymentMethod: 'mpesa',
                        paymentDate: now.toISOString(),
                        institutionId: instId
                    };
                    await apiService.saveModuleRecord('receipts', receiptData);
                } catch {}
            }

            props.onLogAction?.(`Parent submitted transport subscription for ${student.name} on ${activeRouteForSub.routeName}`);
            setParentSubscriptions(prev => [payload, ...prev]);
            setSubStep(5);
            setSubSuccess(true);
        } catch (e: any) {
            setSubErrorMessage(e?.message || 'Failed to submit transport subscription. Please try again.');
        } finally {
            setSubIsSubmitting(false);
        }
    };

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
        if (transportInvKey) localStorage.setItem(transportInvKey, JSON.stringify(updated));
        
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
                        onClick={() => setActivePanel('pocket_money')}
                        className={`py-4 px-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                            activePanel === 'pocket_money' ? 'border-indigo-650 text-indigo-650' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Wallet className="w-4 h-4 text-emerald-500" />
                        Pocket Money
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
                        <button
                            type="button"
                            onClick={() => {
                                setSubStep(1);
                                setSubSuccess(false);
                                setSubErrorMessage('');
                                setSubStudentId(effectiveChildren[0]?.id || '');
                                setSubParentPhone(user?.phoneNumber || '');
                                setIsSubscribeModalOpen(true);
                            }}
                            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap self-start md:self-auto"
                        >
                            <Bus className="w-4 h-4" />
                            Subscribe to Transport
                        </button>
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
                            institutionId={user?.institutionId}
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
                                        requests={localLeaveOuts}
                                        onUpdate={handleUpdateLeaveOut}
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
            ) : activePanel === 'pocket_money' ? (
                <ParentPocketMoneyPanel
                    parentUser={user}
                    childrenList={effectiveChildren}
                    institutionId={user?.institutionId || effectiveChildren[0]?.institutionId || ''}
                    companyDetails={props.companyDetails}
                />
            ) : activePanel === 'transport' ? (
                <div className="space-y-8 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Transport Tracker</h2>
                            <p className="text-slate-500 font-medium">Real-time school bus tracking, route alerts, and billing statements.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setSubStep(1);
                                setSubSuccess(false);
                                setSubErrorMessage('');
                                setSubStudentId(effectiveChildren[0]?.id || '');
                                setSubParentPhone(user?.phoneNumber || '');
                                setIsSubscribeModalOpen(true);
                            }}
                            className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
                        >
                            <Bus className="w-4 h-4" />
                            Subscribe to Transport
                        </button>
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
                                institutionId={user?.institutionId}
                            />
                        </div>
                    )}

                    {/* ── Active Transport Subscriptions & Passes Section ────────── */}
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/20">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/30 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400">
                                    <Bus className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                        School Transport Subscriptions
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {parentSubscriptions.length > 0 
                                            ? `${parentSubscriptions.length} registered commute pass(es) for your children`
                                            : 'Enroll your child for daily tracked school bus commuting'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSubStep(1);
                                    setSubSuccess(false);
                                    setSubErrorMessage('');
                                    setSubStudentId(effectiveChildren[0]?.id || '');
                                    setSubParentPhone(user?.phoneNumber || '');
                                    setIsSubscribeModalOpen(true);
                                }}
                                className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                New Subscription
                            </button>
                        </div>

                        {parentSubscriptions.length > 0 ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                {parentSubscriptions.map((sub: any, idx: number) => {
                                    const isApproved = sub.approvalStatus === 'approved';
                                    const isRejected = sub.approvalStatus === 'rejected';
                                    const isPaid = sub.status === 'paid' || sub.paymentMethod === 'mpesa_now';
                                    const prefLabel = sub.tripPreference === 'round_trip' 
                                        ? 'Round Trip (Both Morning & Evening)' 
                                        : sub.tripPreference === 'one_way_pickup' 
                                        ? 'Morning Pickup Only' 
                                        : sub.tripPreference === 'one_way_drop' 
                                        ? 'Evening Drop-off Only' 
                                        : 'Standard Route';

                                    return (
                                        <div key={sub.id || idx} className="p-6 hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                                    isApproved 
                                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' 
                                                        : isRejected 
                                                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' 
                                                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                                                }`}>
                                                    {isApproved ? <CheckCircle2 className="w-6 h-6" /> : isRejected ? <XCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">{sub.studentName}</h4>
                                                        <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                                                            {sub.admissionNumber}
                                                        </span>
                                                        <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full border ${
                                                            isApproved 
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                                                                : isRejected 
                                                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' 
                                                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                                        }`}>
                                                            {isApproved ? 'Approved & Assigned' : isRejected ? 'Declined' : 'Pending Review'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                                                        <span>{sub.routeName}</span>
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                                                        <span className="font-semibold">Plan: <span className="text-slate-700 dark:text-slate-300 font-bold">{prefLabel}</span></span>
                                                        <span>•</span>
                                                        <span className="font-semibold">Period: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{sub.period}</span></span>
                                                        {sub.pickupStage && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="font-semibold">Stage: <span className="text-slate-700 dark:text-slate-300">{sub.pickupStage}</span></span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {isRejected && sub.rejectionReason && (
                                                        <p className="text-[11px] text-rose-600 font-medium bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-100 dark:border-rose-900/50 mt-2">
                                                            Reason: {sub.rejectionReason}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:items-end justify-between gap-3 self-stretch sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-700">
                                                <div className="sm:text-right">
                                                    <p className="text-base font-black text-slate-900 dark:text-white font-mono">
                                                        KES {Number(sub.finalAmount || 0).toLocaleString()}
                                                    </p>
                                                    <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
                                                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                                                            isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                                        }`}>
                                                            {isPaid ? 'Paid via M-Pesa ✅' : 'Added to Fee Bill 📋'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {isRejected && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSubStep(1);
                                                            setSubSuccess(false);
                                                            setSubErrorMessage('');
                                                            setSubStudentId(sub.studentId || effectiveChildren[0]?.id || '');
                                                            setIsSubscribeModalOpen(true);
                                                        }}
                                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                                                    >
                                                        Re-Apply
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center space-y-4">
                                <div className="w-16 h-16 rounded-3xl bg-orange-50 dark:bg-orange-950/30 text-orange-500 mx-auto flex items-center justify-center">
                                    <Bus className="w-8 h-8" />
                                </div>
                                <div className="max-w-md mx-auto space-y-1">
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                        No School Transport Subscriptions Yet
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Subscribe your child for daily tracked school bus commuting. Safe pickups, live arrival tracking, and verified attendance.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSubStep(1);
                                        setSubSuccess(false);
                                        setSubErrorMessage('');
                                        setSubStudentId(effectiveChildren[0]?.id || '');
                                        setSubParentPhone(user?.phoneNumber || '');
                                        setIsSubscribeModalOpen(true);
                                    }}
                                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Subscribe Child to Transport
                                </button>
                            </div>
                        )}
                    </div>

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

            {/* ── Transport Subscription Modal ────────────────────────────────────────── */}
            {isSubscribeModalOpen && (() => {
                const selectedChild = effectiveChildren.find(c => c.id === subStudentId) || effectiveChildren[0];
                const tripOptions: { id: TripPreference; title: string; desc: string; icon: string }[] = [
                    { id: 'round_trip', title: 'Round Trip', desc: 'Morning pickup to school & evening drop-off home', icon: '🔄' },
                    { id: 'one_way_pickup', title: 'Morning Pickup Only', desc: 'Morning commute to school only', icon: '🌅' },
                    { id: 'one_way_drop', title: 'Evening Drop-off Only', desc: 'Evening commute from school to home only', icon: '🌇' },
                ];

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 flex flex-col">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/60 dark:bg-slate-950/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-orange-500/25">
                                        <Bus className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                            Subscribe to School Transport
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Enroll your child for daily tracked school bus commuting
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsSubscribeModalOpen(false)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Step Progress Dots */}
                            {!subSuccess && (
                                <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 flex items-center justify-between">
                                    {[
                                        { step: 1, label: 'Child' },
                                        { step: 2, label: 'Route' },
                                        { step: 3, label: 'Schedule' },
                                        { step: 4, label: 'Payment' }
                                    ].map((s) => (
                                        <div key={s.step} className="flex items-center gap-2">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                                subStep === s.step 
                                                    ? 'bg-orange-600 text-white shadow-md ring-4 ring-orange-100 dark:ring-orange-950/60' 
                                                    : subStep > s.step 
                                                    ? 'bg-emerald-500 text-white' 
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                            }`}>
                                                {subStep > s.step ? <Check className="w-3.5 h-3.5" /> : s.step}
                                            </div>
                                            <span className={`text-[11px] font-black uppercase tracking-wider hidden sm:inline ${
                                                subStep === s.step ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'
                                            }`}>
                                                {s.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Modal Body */}
                            <div className="p-6 space-y-6 flex-1">
                                {subErrorMessage && (
                                    <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>{subErrorMessage}</span>
                                    </div>
                                )}

                                {/* Step 1: Select Child */}
                                {subStep === 1 && (
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                                Step 1: Choose Child to Enroll
                                            </h4>
                                            <p className="text-xs text-slate-500">Select the student for this school bus route pass.</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {effectiveChildren.map((child) => {
                                                const isSelected = subStudentId === child.id || (!subStudentId && child.id === effectiveChildren[0]?.id);
                                                return (
                                                    <button
                                                        key={child.id}
                                                        type="button"
                                                        onClick={() => setSubStudentId(child.id)}
                                                        className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                                                            isSelected 
                                                                ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 shadow-md ring-2 ring-orange-200 dark:ring-orange-900/50' 
                                                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-850'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                                                                isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                                            }`}>
                                                                {child.name?.slice(0, 2).toUpperCase() || 'ST'}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                                                                    {child.name}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 font-mono">
                                                                    {child.admissionNumber || (child as any).admNumber || 'Enrolled Student'}
                                                                </p>
                                                            </div>
                                                            {isSelected && <CheckCircle2 className="w-5 h-5 text-orange-500 flex-shrink-0" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Route & Pickup Stage */}
                                {subStep === 2 && (
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                                Step 2: Select School Bus Route & Stage
                                            </h4>
                                            <p className="text-xs text-slate-500">Pick the route closest to your home and specify your landmark.</p>
                                        </div>

                                        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                            {transportRoutes.map((route) => {
                                                const isSelected = subRouteId === route.routeId;
                                                return (
                                                    <button
                                                        key={route.routeId}
                                                        type="button"
                                                        onClick={() => setSubRouteId(route.routeId)}
                                                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                                                            isSelected 
                                                                ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 shadow-md ring-2 ring-orange-200 dark:ring-orange-900/50' 
                                                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-850'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="space-y-1">
                                                                <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                    <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-orange-500' : 'text-slate-400'}`} />
                                                                    {route.routeName}
                                                                </p>
                                                                <p className="text-[11px] text-slate-500">
                                                                    Term Fee: <strong className="text-slate-800 dark:text-slate-200 font-mono">KES {route.termFee.toLocaleString()}</strong> • Monthly: <strong className="text-slate-800 dark:text-slate-200 font-mono">KES {route.monthlyFee.toLocaleString()}</strong>
                                                                </p>
                                                            </div>
                                                            {isSelected && <CheckCircle2 className="w-5 h-5 text-orange-500 flex-shrink-0" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="space-y-2 pt-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Pickup / Drop-off Stage or Landmark
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Total Petrol Station Stage, Estate Main Gate 2..."
                                                value={subPickupStage}
                                                onChange={(e) => setSubPickupStage(e.target.value)}
                                                className="w-full px-4 h-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-orange-500"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Special Commute Notes / Instructions (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Travels with older sibling, emergency contact..."
                                                value={subNotes}
                                                onChange={(e) => setSubNotes(e.target.value)}
                                                className="w-full px-4 h-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-orange-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Trip Preference & Billing Plan */}
                                {subStep === 3 && (
                                    <div className="space-y-5">
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                                Step 3: Trip Plan & Billing Cycle
                                            </h4>
                                            <p className="text-xs text-slate-500">Select commute direction and how frequently you wish to be invoiced.</p>
                                        </div>

                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trip Direction</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                {tripOptions.map((opt) => {
                                                    const isSelected = subTripPreference === opt.id;
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            type="button"
                                                            onClick={() => setSubTripPreference(opt.id)}
                                                            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                                                                isSelected 
                                                                    ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 shadow-md' 
                                                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-850'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xl">{opt.icon}</span>
                                                                {isSelected && <Check className="w-4 h-4 text-orange-500" />}
                                                            </div>
                                                            <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                                                {opt.title}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                                                                {opt.desc}
                                                            </p>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Billing Interval</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setSubBillingCycle('term')}
                                                    className={`p-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                                                        subBillingCycle === 'term' 
                                                            ? 'border-orange-500 bg-orange-600 text-white shadow-md' 
                                                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    Per Term (3 Months)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSubBillingCycle('monthly')}
                                                    className={`p-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                                                        subBillingCycle === 'monthly' 
                                                            ? 'border-orange-500 bg-orange-600 text-white shadow-md' 
                                                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    Monthly (30 Days)
                                                </button>
                                            </div>
                                        </div>

                                        {/* Live Pricing Breakdown Card */}
                                        <div className="p-4 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-200 dark:border-orange-900/50 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-400">
                                                    Calculated Transport Fare
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {activeRouteForSub?.routeName.split('–')[0]} • {subTripPreference === 'round_trip' ? 'Round Trip (100%)' : 'One Way (60%)'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
                                                    KES {subFinalAmount.toLocaleString()}
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {subBillingCycle === 'term' ? '/ Term' : '/ Month'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Review & Payment Options */}
                                {subStep === 4 && (
                                    <div className="space-y-5">
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                                Step 4: Review & Confirm Subscription
                                            </h4>
                                            <p className="text-xs text-slate-500">Confirm details and choose how you would like to settle the fee.</p>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Student</span>
                                                <span className="font-bold text-slate-900 dark:text-white">{selectedChild?.name} ({selectedChild?.admissionNumber || 'ADM'})</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Route</span>
                                                <span className="font-bold text-slate-900 dark:text-white text-right max-w-[65%]">{activeRouteForSub?.routeName}</span>
                                            </div>
                                            {subPickupStage && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Stage</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{subPickupStage}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Schedule</span>
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    {subTripPreference === 'round_trip' ? 'Round Trip (Morning & Evening)' : subTripPreference === 'one_way_pickup' ? 'Morning Only' : 'Evening Only'} ({subBillingCycle === 'term' ? 'Per Term' : 'Monthly'})
                                                </span>
                                            </div>
                                            <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center text-sm">
                                                <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider">Total Due</span>
                                                <span className="font-black text-orange-600 dark:text-orange-400 font-mono text-base">KES {subFinalAmount.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Parent / Guardian Mobile Phone (For SMS & Tracking Updates)
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="tel"
                                                    value={subParentPhone}
                                                    onChange={(e) => setSubParentPhone(e.target.value)}
                                                    placeholder="0712 345 678"
                                                    className="w-full pl-10 pr-4 h-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-orange-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2.5 pt-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Option</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setSubPayMethod('pay_later')}
                                                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                                                        subPayMethod === 'pay_later' 
                                                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-200 dark:ring-indigo-900/50' 
                                                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-850'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs font-black uppercase tracking-tight text-indigo-700 dark:text-indigo-400">
                                                            Add to Fee Bill
                                                        </span>
                                                        {subPayMethod === 'pay_later' && <Check className="w-4 h-4 text-indigo-500" />}
                                                    </div>
                                                    <p className="text-[11px] text-slate-500">
                                                        Invoice will be billed to your school fee ledger. Pay later with school fees.
                                                    </p>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setSubPayMethod('mpesa_now')}
                                                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                                                        subPayMethod === 'mpesa_now' 
                                                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-200 dark:ring-emerald-900/50' 
                                                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-850'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs font-black uppercase tracking-tight text-emerald-700 dark:text-emerald-400">
                                                            Pay Now (M-Pesa)
                                                        </span>
                                                        {subPayMethod === 'mpesa_now' && <Check className="w-4 h-4 text-emerald-500" />}
                                                    </div>
                                                    <p className="text-[11px] text-slate-500">
                                                        Instant confirmation and active pass issuance right away.
                                                    </p>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 5: Success Screen */}
                                {subStep === 5 && subSuccess && (
                                    <div className="py-6 text-center space-y-4 animate-fade-in">
                                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                                            <CheckCircle className="w-10 h-10" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                                Subscription Confirmed!
                                            </h4>
                                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                                {selectedChild?.name}'s transport pass has been registered for <strong>{activeRouteForSub?.routeName}</strong>.
                                            </p>
                                        </div>
                                        <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 max-w-sm mx-auto text-left space-y-1.5">
                                            <p className="font-bold flex items-center gap-1.5">
                                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                                <span>Commute Status: Registered</span>
                                            </p>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                                {subPayMethod === 'mpesa_now' 
                                                    ? 'Payment received via M-Pesa. Receipt recorded.' 
                                                    : 'Invoice has been added to your student fee statement.'}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-mono">
                                                Confirmation SMS sent to {subParentPhone}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer Controls */}
                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between gap-3">
                                {subStep === 5 ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSubscribeModalOpen(false);
                                            setActivePanel('transport');
                                        }}
                                        className="w-full py-3 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                        Done & View Transport Tracker
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            disabled={subIsSubmitting}
                                            onClick={() => {
                                                if (subStep === 1) setIsSubscribeModalOpen(false);
                                                else setSubStep((prev) => (prev - 1) as any);
                                            }}
                                            className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                                        >
                                            {subStep === 1 ? 'Cancel' : 'Back'}
                                        </button>

                                        {subStep < 4 ? (
                                            <button
                                                type="button"
                                                onClick={() => setSubStep((prev) => (prev + 1) as any)}
                                                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-orange-600/20"
                                            >
                                                <span>Continue</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={subIsSubmitting}
                                                onClick={handleSubscribeSubmit}
                                                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-500/25"
                                            >
                                                {subIsSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Submitting...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="w-4 h-4" />
                                                        <span>Confirm & Subscribe</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

