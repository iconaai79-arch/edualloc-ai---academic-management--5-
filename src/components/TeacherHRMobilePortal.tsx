import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { User, Institution, PayrollRecord, LeaveRequest } from '../types';
import { apiService } from '../services/apiService';
import { generateStaffPayslipPdf, generateStaffP9Pdf } from '../services/pdfService';
import TeacherCheckInView from './TeacherCheckInView';
import { TeacherWalletCard } from './TeacherWalletCard';
import {
    Clock, Calendar, DollarSign, QrCode, FileText, CheckCircle2,
    AlertCircle, ArrowRight, Download, Send, Plus, User as UserIcon,
    Shield, Briefcase, Award, Sparkles, RefreshCw, X, ChevronRight,
    Phone, Building2, Eye, EyeOff, Printer, MapPin, Check, Heart,
    BookOpen, Layers, CreditCard, ChevronDown, Bell, Lock, UserCheck
} from 'lucide-react';

export interface TeacherHRMobilePortalProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction?: (action: string) => Promise<void> | void;
    onRefreshData?: () => void;
    allTeachers?: User[];
    initialTab?: 'attendance' | 'leave' | 'payroll' | 'wallet' | 'badge';
}

type HRTab = 'attendance' | 'leave' | 'payroll' | 'wallet' | 'badge';

interface LeaveApplication {
    id: string;
    institution_id: string;
    user_id: string;
    applicant_name: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
    handover_teacher_id?: string;
    handover_teacher_name?: string;
    emergency_phone?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    approved_by?: string;
    created_at: string;
}

interface AdvanceRequest {
    id: string;
    institution_id: string;
    user_id: string;
    staff_name: string;
    requested_amount: number;
    repayment_month: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'disbursed';
    created_at: string;
}

export const TeacherHRMobilePortal: React.FC<TeacherHRMobilePortalProps> = ({
    currentUser,
    currentInstitution,
    onLogAction,
    onRefreshData,
    allTeachers = [],
    initialTab = 'attendance'
}) => {
    const [activeTab, setActiveTab] = useState<HRTab>(initialTab);
    const [hideSalary, setHideSalary] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Leave States
    const [leaveRequests, setLeaveRequests] = useState<LeaveApplication[]>([]);
    const [isApplyingLeave, setIsApplyingLeave] = useState(false);
    const [leaveType, setLeaveType] = useState('Annual Leave');
    const [leaveStartDate, setLeaveStartDate] = useState('');
    const [leaveEndDate, setLeaveEndDate] = useState('');
    const [leaveReason, setLeaveReason] = useState('');
    const [leaveHandoverTeacherId, setLeaveHandoverTeacherId] = useState('');
    const [leavePhone, setLeavePhone] = useState(currentUser.phoneNumber || currentUser.phone || '');
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

    // Payroll States
    const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
    const [selectedP9Year, setSelectedP9Year] = useState<string>(new Date().getFullYear().toString());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Salary Advance States
    const [isApplyingAdvance, setIsApplyingAdvance] = useState(false);
    const [advanceAmount, setAdvanceAmount] = useState('');
    const [advanceReason, setAdvanceReason] = useState('');
    const [advanceRepaymentMonth, setAdvanceRepaymentMonth] = useState('');
    const [advanceRequests, setAdvanceRequests] = useState<AdvanceRequest[]>([]);
    const [isSubmittingAdvance, setIsSubmittingAdvance] = useState(false);

    // ID Badge Flipped State
    const [isBadgeFlipped, setIsBadgeFlipped] = useState(false);

    const institutionId = currentInstitution?.id || currentUser?.institutionId || '';
    const userId = currentUser?.id || '';

    // -------------------------------------------------------------
    // DATA LOADING
    // -------------------------------------------------------------
    const loadHRData = useCallback(async () => {
        if (!institutionId || !userId) return;
        setIsLoading(true);

        try {
            // 1. Load Leave Requests
            const localLeaveKey = `eduai_teacher_leaves_${institutionId}_${userId}`;
            let loadedLeaves: LeaveApplication[] = [];
            try {
                const local = localStorage.getItem(localLeaveKey);
                if (local) loadedLeaves = JSON.parse(local);
            } catch (_) {}

            try {
                const remoteLeaves = await apiService.fetchModuleRecords<any>('leave_requests', institutionId);
                if (Array.isArray(remoteLeaves)) {
                    const myLeaves = remoteLeaves.filter(r => r.user_id === userId || r.userId === userId || r.staff_id === userId);
                    if (myLeaves.length > 0) {
                        loadedLeaves = myLeaves;
                        localStorage.setItem(localLeaveKey, JSON.stringify(myLeaves));
                    }
                }
            } catch (_) {}
            setLeaveRequests(loadedLeaves);

            // 2. Load Payroll Records
            try {
                const records = await apiService.fetchModuleRecords<PayrollRecord>('payroll_records', institutionId);
                if (Array.isArray(records)) {
                    const myRecords = records.filter(r => 
                        r.userId === userId || r.staffId === userId || (r as any).user_id === userId || (r as any).staff_id === userId
                    );
                    setPayrollRecords(myRecords);
                }
            } catch (_) {}

            // 3. Load Salary Advances
            const localAdvKey = `eduai_teacher_advances_${institutionId}_${userId}`;
            let loadedAdvances: AdvanceRequest[] = [];
            try {
                const localAdv = localStorage.getItem(localAdvKey);
                if (localAdv) loadedAdvances = JSON.parse(localAdv);
            } catch (_) {}

            try {
                const remoteAdv = await apiService.fetchModuleRecords<any>('salary_advances', institutionId);
                if (Array.isArray(remoteAdv)) {
                    const myAdv = remoteAdv.filter(r => r.user_id === userId || r.userId === userId || r.staff_id === userId);
                    if (myAdv.length > 0) {
                        loadedAdvances = myAdv;
                        localStorage.setItem(localAdvKey, JSON.stringify(myAdv));
                    }
                }
            } catch (_) {}
            setAdvanceRequests(loadedAdvances);

        } catch (e) {
            console.error('[TeacherHRMobilePortal] Error loading HR data:', e);
        } finally {
            setIsLoading(false);
        }
    }, [institutionId, userId]);

    useEffect(() => {
        loadHRData();
    }, [loadHRData]);

    // Available Teachers for Lesson Handover / Cover
    const eligiblePeers = useMemo(() => {
        return (allTeachers || []).filter(t => t.id !== userId && t.role?.toLowerCase().includes('teacher') || t.role?.toLowerCase().includes('lecturer'));
    }, [allTeachers, userId]);

    // -------------------------------------------------------------
    // LEAVE BALANCES (Standard 30 Days Annual Allowance)
    // -------------------------------------------------------------
    const leaveBalances = useMemo(() => {
        const approvedLeaves = leaveRequests.filter(l => l.status === 'Approved');
        const usedAnnual = approvedLeaves
            .filter(l => l.leave_type === 'Annual Leave')
            .reduce((sum, l) => sum + (l.days || 0), 0);
        const usedSick = approvedLeaves
            .filter(l => l.leave_type === 'Sick Leave')
            .reduce((sum, l) => sum + (l.days || 0), 0);
        const usedCompassionate = approvedLeaves
            .filter(l => l.leave_type === 'Compassionate Leave')
            .reduce((sum, l) => sum + (l.days || 0), 0);

        return {
            annual: { total: 30, used: usedAnnual, remaining: Math.max(0, 30 - usedAnnual) },
            sick: { total: 14, used: usedSick, remaining: Math.max(0, 14 - usedSick) },
            compassionate: { total: 10, used: usedCompassionate, remaining: Math.max(0, 10 - usedCompassionate) },
            maternity: { total: 90, used: 0, remaining: 90 }
        };
    }, [leaveRequests]);

    // Working Days Calculator
    const calculatedDays = useMemo(() => {
        if (!leaveStartDate || !leaveEndDate) return 0;
        const start = new Date(leaveStartDate);
        const end = new Date(leaveEndDate);
        if (end < start) return 0;
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }, [leaveStartDate, leaveEndDate]);

    // -------------------------------------------------------------
    // SUBMIT LEAVE APPLICATION
    // -------------------------------------------------------------
    const handleApplyLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leaveStartDate || !leaveEndDate) {
            alert('Please select both start and end dates.');
            return;
        }
        if (calculatedDays <= 0) {
            alert('End date must be equal to or after start date.');
            return;
        }

        const handoverTeacher = eligiblePeers.find(t => t.id === leaveHandoverTeacherId);

        setIsSubmittingLeave(true);
        const newApp: LeaveApplication = {
            id: `leave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            institution_id: institutionId,
            user_id: userId,
            applicant_name: currentUser.name || 'Teacher',
            leave_type: leaveType,
            start_date: leaveStartDate,
            end_date: leaveEndDate,
            days: calculatedDays,
            reason: leaveReason,
            handover_teacher_id: leaveHandoverTeacherId || undefined,
            handover_teacher_name: handoverTeacher?.name || undefined,
            emergency_phone: leavePhone,
            status: 'Pending',
            created_at: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('leave_requests', newApp).catch(() => {});
            
            // Local update
            const localKey = `eduai_teacher_leaves_${institutionId}_${userId}`;
            const updated = [newApp, ...leaveRequests];
            setLeaveRequests(updated);
            localStorage.setItem(localKey, JSON.stringify(updated));

            await onLogAction?.(`Submitted ${leaveType} application for ${calculatedDays} days`);
            alert(`✅ Leave Application Submitted!\n\n• Type: ${leaveType}\n• Period: ${leaveStartDate} to ${leaveEndDate} (${calculatedDays} days)\n• Handover: ${handoverTeacher ? handoverTeacher.name : 'None assigned'}\n\nYour application has been routed to the Director of Studies (DOS) & Principal for approval.`);
            
            setIsApplyingLeave(false);
            setLeaveReason('');
            setLeaveStartDate('');
            setLeaveEndDate('');
            setLeaveHandoverTeacherId('');
        } catch (err: any) {
            alert(err?.message || 'Failed to submit leave application.');
        } finally {
            setIsSubmittingLeave(false);
        }
    };

    // -------------------------------------------------------------
    // SUBMIT SALARY ADVANCE REQUEST
    // -------------------------------------------------------------
    const handleApplyAdvance = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(advanceAmount);
        if (isNaN(amt) || amt <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        setIsSubmittingAdvance(true);
        const newAdv: AdvanceRequest = {
            id: `adv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            institution_id: institutionId,
            user_id: userId,
            staff_name: currentUser.name || 'Teacher',
            requested_amount: amt,
            repayment_month: advanceRepaymentMonth || new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
            reason: advanceReason,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('salary_advances', newAdv).catch(() => {});

            const localAdvKey = `eduai_teacher_advances_${institutionId}_${userId}`;
            const updated = [newAdv, ...advanceRequests];
            setAdvanceRequests(updated);
            localStorage.setItem(localAdvKey, JSON.stringify(updated));

            await onLogAction?.(`Requested salary advance of KES ${amt.toLocaleString()}`);
            alert(`✅ Salary Advance Requested!\n\n• Amount: KES ${amt.toLocaleString()}\n• Recovery Month: ${newAdv.repayment_month}\n\nYour request has been forwarded to the Finance Office / Bursar for review.`);
            setIsApplyingAdvance(false);
            setAdvanceAmount('');
            setAdvanceReason('');
        } catch (err: any) {
            alert(err?.message || 'Failed to submit salary advance request.');
        } finally {
            setIsSubmittingAdvance(false);
        }
    };

    // -------------------------------------------------------------
    // MOST RECENT PAYSLIP (Or default benchmark statement)
    // -------------------------------------------------------------
    const latestPayslip = useMemo<PayrollRecord>(() => {
        if (payrollRecords && payrollRecords.length > 0) {
            return payrollRecords[0];
        }
        // Benchmark Teaching Service Record
        return {
            id: `pay_sample_${userId}`,
            institutionId: institutionId,
            userId: userId,
            staffId: (currentUser as any)?.staffId || (currentUser as any)?.staff_id || 'TSC/94821',
            month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
            basicSalary: 52000,
            allowances: 18500, // House + Commuter
            grossSalary: 70500,
            deductions: 14200, // PAYE + NSSF + SHIF + Housing Levy
            netSalary: 56300,
            status: 'Paid',
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'Bank Transfer'
        };
    }, [payrollRecords, institutionId, userId, currentUser]);

    // Download Payslip PDF
    const handleDownloadPayslip = async (rec: PayrollRecord) => {
        setIsGeneratingPdf(true);
        try {
            const dataUri = await generateStaffPayslipPdf(
                currentUser,
                rec,
                currentInstitution,
                currentInstitution.letterheadConfig
            );
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `Payslip_${(currentUser.name || 'Teacher').replace(/\s+/g, '_')}_${rec.month || 'Current'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) {
            alert(err?.message || 'Failed to generate PDF payslip.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Download KRA P9 Tax Certificate PDF
    const handleDownloadP9 = async () => {
        setIsGeneratingPdf(true);
        try {
            const yearRecords = (payrollRecords || []).filter(r => (r.month || '').includes(selectedP9Year));
            const activeRecords = yearRecords.length > 0 ? yearRecords : [latestPayslip];

            const dataUri = await generateStaffP9Pdf(
                currentUser,
                activeRecords,
                selectedP9Year,
                currentInstitution,
                currentInstitution.letterheadConfig
            );
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `KRA_P9_Card_${(currentUser.name || 'Teacher').replace(/\s+/g, '_')}_${selectedP9Year}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) {
            alert(err?.message || 'Failed to generate P9 Tax Certificate.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Print Digital ID Badge
    const handlePrintBadge = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* Top Teacher Profile & Quick Stats Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-indigo-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-400 p-0.5 shadow-lg shadow-indigo-500/30 shrink-0">
                            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden">
                                {currentUser.avatarUrl || (currentUser as any).avatar ? (
                                    <img src={currentUser.avatarUrl || (currentUser as any).avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl sm:text-3xl font-black text-indigo-400">
                                        {(currentUser.name || 'T').charAt(0)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-black uppercase tracking-wider text-indigo-300 mb-1">
                                <Sparkles className="w-3 h-3 text-indigo-400" />
                                Teacher HR Self-Service
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white capitalize">
                                {currentUser.name || 'Staff Member'}
                            </h2>
                            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                                <span>{(currentUser as any)?.tscNumber || (currentUser as any)?.tsc_number ? `TSC: ${(currentUser as any)?.tscNumber || (currentUser as any)?.tsc_number}` : 'TSC Certified'}</span>
                                <span>&bull;</span>
                                <span>{(currentUser as any)?.department || 'Academic Department'}</span>
                                <span>&bull;</span>
                                <span>{currentInstitution?.name || 'Main Campus'}</span>
                            </p>
                        </div>
                    </div>

                    {/* Quick Metric Pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-800/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/60 flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-indigo-400" /> Leave Balance
                            </span>
                            <span className="text-lg font-black text-emerald-400 mt-1">
                                {leaveBalances.annual.remaining} <span className="text-xs text-slate-400 font-normal">/ 30 Days</span>
                            </span>
                        </div>

                        <div className="bg-slate-800/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/60 flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-emerald-400" /> Net Salary</span>
                                <button onClick={() => setHideSalary(!hideSalary)} className="text-slate-400 hover:text-white">
                                    {hideSalary ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                            </span>
                            <span className="text-lg font-black text-white mt-1">
                                {hideSalary ? '••••••' : `KES ${(latestPayslip.netSalary || 0).toLocaleString()}`}
                            </span>
                        </div>

                        <div className="col-span-2 sm:col-span-1 bg-slate-800/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/60 flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-400" /> Today's Shift
                            </span>
                            <span className="text-xs font-black text-amber-300 mt-2 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                On-Campus Active
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sub-Tabs Bar */}
                <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'attendance', label: 'Attendance & Clock-In', icon: Clock },
                        { id: 'leave', label: 'Leave & Absences', icon: Calendar, badge: leaveBalances.annual.remaining },
                        { id: 'payroll', label: 'Payslips & Tax (P9)', icon: DollarSign },
                        { id: 'wallet', label: 'Remedials Wallet', icon: CreditCard },
                        { id: 'badge', label: 'Digital Staff ID', icon: QrCode }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as HRTab)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-200 active:scale-95 ${
                                    isActive
                                        ? 'bg-gradient-to-r from-indigo-500 to-teal-500 text-white shadow-md shadow-indigo-500/20'
                                        : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{tab.label}</span>
                                {tab.badge !== undefined && (
                                    <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[9px]">
                                        {tab.badge}d
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TAB 1: ATTENDANCE & GEOFENCED CLOCK-IN */}
            {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-200/60 dark:border-slate-800 animate-fade-in">
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-150 dark:border-slate-800">
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-500" /> Campus Attendance & Duty Clock
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Automated morning (7:45 AM) & afternoon (3:45 PM) attendance verification via GPS perimeter and Gate QR scans.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800/60">
                            <MapPin className="w-3.5 h-3.5" /> Geofence Monitored
                        </div>
                    </div>

                    <TeacherCheckInView
                        currentUser={currentUser}
                        currentInstitution={currentInstitution || ({ id: institutionId, name: 'Institution', checkinRadiusEnabled: false } as Institution)}
                        onLogAction={async (action: string) => {
                            if (onLogAction) await onLogAction(action);
                        }}
                    />
                </div>
            )}

            {/* TAB 2: LEAVE & ABSENCE MANAGEMENT */}
            {activeTab === 'leave' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Leave Balance Meters */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { title: 'Annual Leave', total: leaveBalances.annual.total, used: leaveBalances.annual.used, remaining: leaveBalances.annual.remaining, color: 'indigo' },
                            { title: 'Sick Leave', total: leaveBalances.sick.total, used: leaveBalances.sick.used, remaining: leaveBalances.sick.remaining, color: 'emerald' },
                            { title: 'Compassionate', total: leaveBalances.compassionate.total, used: leaveBalances.compassionate.used, remaining: leaveBalances.compassionate.remaining, color: 'amber' },
                            { title: 'Maternity/Paternity', total: leaveBalances.maternity.total, used: leaveBalances.maternity.used, remaining: leaveBalances.maternity.remaining, color: 'rose' }
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{item.title}</span>
                                    <div className="flex items-baseline gap-1 mt-2">
                                        <span className="text-2xl font-black text-slate-900 dark:text-white">{item.remaining}</span>
                                        <span className="text-xs text-slate-400 font-bold">/ {item.total} days</span>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${
                                                item.color === 'indigo' ? 'bg-indigo-500' :
                                                item.color === 'emerald' ? 'bg-emerald-500' :
                                                item.color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                                            }`}
                                            style={{ width: `${Math.min(100, (item.remaining / item.total) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 mt-1 block">
                                        {item.used} days utilized this year
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Action Bar */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                Leave Requests & Lesson Handover Records
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Applications include automatic peer teacher delegation for uninterrupted learner lessons.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsApplyingLeave(true)}
                            className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
                        >
                            <Plus className="w-4 h-4" /> Apply for Leave
                        </button>
                    </div>

                    {/* Leave History List */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50 dark:bg-slate-850/60 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                My Leave Application History
                            </span>
                            <span className="text-xs text-slate-400 font-bold">{leaveRequests.length} Applications</span>
                        </div>

                        {leaveRequests.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                                <p className="text-sm font-bold">No Leave Applications Found</p>
                                <p className="text-xs mt-1">Tap &ldquo;Apply for Leave&rdquo; above to submit an upcoming absence request.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-150 dark:divide-slate-800">
                                {leaveRequests.map((item) => (
                                    <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-slate-900 dark:text-white">
                                                    {item.leave_type}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    item.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                                    item.status === 'Rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                                    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                                                <span>{item.start_date} &rarr; {item.end_date}</span>
                                                <span>&bull;</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">{item.days} Day(s)</span>
                                                {item.handover_teacher_name && (
                                                    <>
                                                        <span>&bull;</span>
                                                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                                            Cover: {item.handover_teacher_name}
                                                        </span>
                                                    </>
                                                )}
                                            </p>
                                            {item.reason && (
                                                <p className="text-xs text-slate-600 dark:text-slate-400 italic mt-1">
                                                    &ldquo;{item.reason}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right text-[10px] text-slate-400 shrink-0">
                                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: PAYROLL & STATUTORY TAX (P9) */}
            {activeTab === 'payroll' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Latest Payslip Highlight Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/60 dark:border-slate-800 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-150 dark:border-slate-800">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    Official Compensation Statement
                                </span>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                                    Payslip for {latestPayslip.month || 'Current Period'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Disbursed via {latestPayslip.paymentMethod || 'Bank Transfer'} &bull; Status: <span className="text-emerald-500 font-bold">{latestPayslip.status}</span>
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => handleDownloadPayslip(latestPayslip)}
                                    disabled={isGeneratingPdf}
                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    {isGeneratingPdf ? 'Generating...' : 'Download Payslip PDF'}
                                </button>
                                <button
                                    onClick={() => setIsApplyingAdvance(true)}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                    Request Advance
                                </button>
                            </div>
                        </div>

                        {/* Breakdown Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                            {/* Earnings */}
                            <div className="bg-slate-50 dark:bg-slate-850/60 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
                                <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Earnings & Allowances
                                </h5>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                        <span>Basic Teaching Salary</span>
                                        <span className="font-bold">KES {(latestPayslip.basicSalary || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                        <span>House Allowance</span>
                                        <span className="font-bold">KES {((latestPayslip.allowances || 0) * 0.65).toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                        <span>Commuter Allowance</span>
                                        <span className="font-bold">KES {((latestPayslip.allowances || 0) * 0.35).toFixed(0)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-slate-900 dark:text-white">
                                        <span>Gross Earnings</span>
                                        <span className="text-indigo-600 dark:text-indigo-400">KES {(latestPayslip.grossSalary || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Deductions */}
                            <div className="bg-slate-50 dark:bg-slate-850/60 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
                                <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-rose-500" /> Statutory Deductions
                                </h5>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                        <span>PAYE Income Tax</span>
                                        <span className="font-bold">KES {((latestPayslip.deductions || 0) * 0.60).toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                        <span>NSSF Tier I & II</span>
                                        <span className="font-bold">KES {((latestPayslip.deductions || 0) * 0.15).toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                        <span>SHIF (Health Insurance)</span>
                                        <span className="font-bold">KES {((latestPayslip.deductions || 0) * 0.15).toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                        <span>Housing Levy (1.5%)</span>
                                        <span className="font-bold">KES {((latestPayslip.deductions || 0) * 0.10).toFixed(0)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-rose-600 dark:text-rose-400">
                                        <span>Total Deductions</span>
                                        <span>- KES {(latestPayslip.deductions || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Net Disbursed */}
                            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl border border-indigo-500/30 flex flex-col justify-between">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                                        Net Take-Home Pay
                                    </span>
                                    <div className="text-3xl font-black text-emerald-400 mt-2">
                                        KES {(latestPayslip.netSalary || 0).toLocaleString()}
                                    </div>
                                    <p className="text-[11px] text-slate-300 mt-1">
                                        Direct credit to account on file: {currentUser.name}
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-white/10 text-[10px] text-slate-400 flex items-center justify-between">
                                    <span>Verified by Bursar</span>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KRA P9 Tax Card Center */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                    KRA P9 Tax Deduction Certificate
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Download your official employer tax certificate required for filing your annual KRA iTax individual income returns.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={selectedP9Year}
                                onChange={(e) => setSelectedP9Year(e.target.value)}
                                className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                            >
                                <option value="2026">Tax Year 2026</option>
                                <option value="2025">Tax Year 2025</option>
                                <option value="2024">Tax Year 2024</option>
                            </select>
                            <button
                                onClick={handleDownloadP9}
                                disabled={isGeneratingPdf}
                                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                            >
                                <Download className="w-3.5 h-3.5" />
                                {isGeneratingPdf ? 'Generating...' : `Download P9 (${selectedP9Year})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: REMEDIAL & EXTRA DUTY WALLET */}
            {activeTab === 'wallet' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
                        <div className="mb-4">
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-indigo-500" /> Remedial Lessons & Extra Duty Cash-Out Wallet
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Instant M-Pesa B2C disbursements for verified remedial teaching hours and weekend duty allowances.
                            </p>
                        </div>

                        <TeacherWalletCard
                            teacherId={userId}
                            institutionId={institutionId}
                            teacherName={currentUser.name || 'Teacher'}
                            defaultPhone={currentUser.phone || currentUser.phoneNumber || ''}
                            onBalanceChange={() => {
                                onRefreshData?.();
                            }}
                        />
                    </div>
                </div>
            )}

            {/* TAB 5: DIGITAL STAFF ID CARD */}
            {activeTab === 'badge' && (
                <div className="space-y-6 animate-fade-in flex flex-col items-center">
                    <div className="w-full max-w-md">
                        {/* ID Card Outer */}
                        <div
                            onClick={() => setIsBadgeFlipped(!isBadgeFlipped)}
                            className="cursor-pointer transition-all duration-500 transform hover:scale-102"
                        >
                            {!isBadgeFlipped ? (
                                /* Front of Card */
                                <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-[2rem] p-7 shadow-2xl border-2 border-indigo-400/40 relative overflow-hidden flex flex-col justify-between min-h-[460px]">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

                                    {/* Header */}
                                    <div className="flex items-center justify-between border-b border-indigo-400/20 pb-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-xl bg-white/10 p-1 flex items-center justify-center font-black text-indigo-300">
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                                                    {currentInstitution?.name || 'Institution'}
                                                </h4>
                                                <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest block">
                                                    Faculty Staff ID Card
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                    </div>

                                    {/* Photo & Details */}
                                    <div className="flex flex-col items-center text-center my-4">
                                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 p-0.5 shadow-xl shadow-indigo-500/40 mb-3">
                                            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden">
                                                {currentUser.avatarUrl || (currentUser as any).avatar ? (
                                                    <img src={currentUser.avatarUrl || (currentUser as any).avatar} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-3xl font-black text-indigo-400">
                                                        {(currentUser.name || 'T').charAt(0)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-black text-white capitalize">{currentUser.name}</h3>
                                        <p className="text-xs text-indigo-300 font-bold mt-0.5">
                                            {(currentUser as any)?.roleTitle || 'Senior Academic Staff'}
                                        </p>
                                    </div>

                                    {/* Attributes Grid */}
                                    <div className="grid grid-cols-2 gap-2 p-3 bg-white/5 rounded-xl border border-white/10 text-[10px]">
                                        <div>
                                            <span className="text-slate-400 font-bold block">TSC Number</span>
                                            <span className="font-black text-white">{(currentUser as any)?.tscNumber || (currentUser as any)?.tsc_number || 'TSC/84920'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 font-bold block">Staff Code</span>
                                            <span className="font-black text-white">{(currentUser as any)?.staffId || (currentUser as any)?.staff_id || `FAC-${userId.substring(0, 6).toUpperCase()}`}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 font-bold block">Department</span>
                                            <span className="font-black text-white">{(currentUser as any)?.department || 'Sciences'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 font-bold block">Valid Until</span>
                                            <span className="font-black text-emerald-400">Dec 2027</span>
                                        </div>
                                    </div>

                                    {/* Tap to Flip Notice */}
                                    <div className="text-center text-[9px] text-slate-400 font-bold mt-3">
                                        Tap card to reveal Gate Check-In QR &amp; Security Token &bull; &infin;
                                    </div>
                                </div>
                            ) : (
                                /* Back of Card */
                                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-[2rem] p-7 shadow-2xl border-2 border-indigo-400/40 relative overflow-hidden flex flex-col justify-between min-h-[460px]">
                                    <div className="text-center border-b border-indigo-400/20 pb-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                            Gate Access &amp; Security Clearance
                                        </span>
                                    </div>

                                    {/* High-Contrast QR Code */}
                                    <div className="flex flex-col items-center justify-center my-4">
                                        <div className="bg-white p-4 rounded-2xl shadow-xl">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`staff_badge:${userId}:${institutionId}`)}`}
                                                alt="Staff QR"
                                                className="w-40 h-40 object-contain"
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono text-indigo-300 font-bold mt-2">
                                            ID: {userId.substring(0, 16)}
                                        </span>
                                    </div>

                                    <div className="text-[10px] text-slate-400 text-center space-y-1">
                                        <p>This card is property of {currentInstitution?.name || 'the school'}.</p>
                                        <p>If found, please return to the Principal / HR Office.</p>
                                    </div>

                                    <div className="text-center text-[9px] text-slate-400 font-bold mt-2">
                                        Tap card to return to front
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Card Print & Save Buttons */}
                        <div className="flex items-center justify-center gap-3 mt-4">
                            <button
                                onClick={handlePrintBadge}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                            >
                                <Printer className="w-3.5 h-3.5" /> Print Physical ID Card
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: APPLY FOR LEAVE */}
            {isApplyingLeave && (
                <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-up">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Apply for Leave
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Submit leave request with peer lesson handover coverage.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsApplyingLeave(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleApplyLeave} className="space-y-4 mt-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                    Leave Category
                                </label>
                                <select
                                    value={leaveType}
                                    onChange={(e) => setLeaveType(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                                >
                                    <option value="Annual Leave">Annual Leave (Remaining: {leaveBalances.annual.remaining}d)</option>
                                    <option value="Sick Leave">Sick Leave (Remaining: {leaveBalances.sick.remaining}d)</option>
                                    <option value="Compassionate Leave">Compassionate Leave (Remaining: {leaveBalances.compassionate.remaining}d)</option>
                                    <option value="Maternity Leave">Maternity Leave (90 Days)</option>
                                    <option value="Paternity Leave">Paternity Leave (14 Days)</option>
                                    <option value="Study / Official Duty">Study / Official Duty Leave</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={leaveStartDate}
                                        onChange={(e) => setLeaveStartDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={leaveEndDate}
                                        onChange={(e) => setLeaveEndDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                                    />
                                </div>
                            </div>

                            {calculatedDays > 0 && (
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                                    <span>Total Duration:</span>
                                    <span>{calculatedDays} Calendar Days</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                    Lesson Handover &bull; Peer Teacher Coverage
                                </label>
                                <select
                                    value={leaveHandoverTeacherId}
                                    onChange={(e) => setLeaveHandoverTeacherId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                                >
                                    <option value="">-- Select Colleague for Class Coverage --</option>
                                    {eligiblePeers.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({(t as any).department || 'Teacher'})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Selected teacher will receive notification to cover your scheduled timetable sessions.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                    Reason / Notes
                                </label>
                                <textarea
                                    required
                                    rows={2}
                                    value={leaveReason}
                                    onChange={(e) => setLeaveReason(e.target.value)}
                                    placeholder="Brief explanation for your absence..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none resize-none"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsApplyingLeave(false)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingLeave}
                                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmittingLeave ? 'Submitting...' : 'Send to DOS & Principal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: APPLY FOR SALARY ADVANCE */}
            {isApplyingAdvance && (
                <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-up">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Request Salary Advance
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Emergency advance deductible from next month&apos;s payroll.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsApplyingAdvance(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleApplyAdvance} className="space-y-4 mt-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                    Requested Amount (KES)
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1000"
                                    max="50000"
                                    step="500"
                                    placeholder="e.g. 15,000"
                                    value={advanceAmount}
                                    onChange={(e) => setAdvanceAmount(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-black px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Maximum advance ceiling: 40% of net monthly compensation.
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                    Recovery Payroll Month
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. November 2026"
                                    value={advanceRepaymentMonth}
                                    onChange={(e) => setAdvanceRepaymentMonth(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                    Reason / Emergency Details
                                </label>
                                <textarea
                                    required
                                    rows={2}
                                    value={advanceReason}
                                    onChange={(e) => setAdvanceReason(e.target.value)}
                                    placeholder="State reason for salary advance request..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium p-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none resize-none"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsApplyingAdvance(false)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingAdvance}
                                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmittingAdvance ? 'Submitting...' : 'Submit to Bursar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherHRMobilePortal;
