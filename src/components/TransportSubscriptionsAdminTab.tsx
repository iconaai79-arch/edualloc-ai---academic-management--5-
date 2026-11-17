import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Bus, Search, Filter, RefreshCw, CheckCircle, XCircle, Clock,
    Phone, MessageSquare, Download, Share2, AlertTriangle, User,
    MapPin, Banknote, Calendar, ChevronRight, Check, Send, Trash2,
    ExternalLink, ArrowUpRight, ShieldCheck, Sparkles, Layers,
    Eye, Users, AlertCircle, FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiService } from '../services/apiService';
import type { Institution, User as UserType } from '../types';
import type { RouteFeeSetting, TripPreference, BillingCycle, BillStatus } from './TransportBillingManager';
import type { SubscriptionRequest } from './public/PublicTransportSubscriptionView';

// ─── Constants & Meta ─────────────────────────────────────────────────────────

const PREFERENCE_META: Record<TripPreference, { label: string; icon: string; badge: string }> = {
    round_trip:     { label: 'Round Trip',   icon: '🔄', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800' },
    one_way_pickup: { label: 'Morning Only', icon: '🌅', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
    one_way_drop:   { label: 'Evening Only', icon: '🌆', badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' },
    none:           { label: 'None',         icon: '❌', badge: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
};

const APPROVAL_META: Record<'pending' | 'approved' | 'rejected', { label: string; badge: string; icon: any }> = {
    pending:  { label: 'Pending Review', badge: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800', icon: Clock },
    approved: { label: 'Approved',       badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800', icon: CheckCircle },
    rejected: { label: 'Declined',       badge: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800', icon: XCircle },
};

const fmtKES = (amount: number): string => `KES ${(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ─── Component Props ──────────────────────────────────────────────────────────

interface TransportSubscriptionsAdminTabProps {
    institution: Institution;
    routes: RouteFeeSetting[];
    users?: UserType[];
    currentUser?: any;
    onRefreshParent?: () => void;
}

export const TransportSubscriptionsAdminTab: React.FC<TransportSubscriptionsAdminTabProps> = ({
    institution,
    routes = [],
    users = [],
    currentUser,
    onRefreshParent,
}) => {
    // ── State ─────────────────────────────────────────────────────────────────
    const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('all');
    const [routeFilter, setRouteFilter] = useState<string>('all');

    // Modals & Action States
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [rejectionModalTarget, setRejectionModalTarget] = useState<SubscriptionRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState<string>('Route at full capacity');
    const [customReason, setCustomReason] = useState<string>('');

    // Quick SMS Modal
    const [smsModalTarget, setSmsModalTarget] = useState<SubscriptionRequest | null>(null);
    const [smsMessage, setSmsMessage] = useState<string>('');
    const [isSendingSms, setIsSendingSms] = useState<boolean>(false);

    // Share link feedback
    const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);

    // ── Fetch Subscriptions ───────────────────────────────────────────────────
    const fetchRequests = useCallback(async () => {
        if (!institution?.id) return;
        setIsLoading(true);
        try {
            const rawData = await apiService.fetchModuleRecords<SubscriptionRequest>(
                'transport_subscription_requests',
                institution.id
            );
            const list = Array.isArray(rawData) ? rawData : [];
            // Normalize items so approvalStatus has default 'pending'
            const normalized = list.map((item, idx) => ({
                ...item,
                id: item.id || `SUB-AUTO-${idx}-${Date.now().toString(36)}`,
                approvalStatus: item.approvalStatus || 'pending',
                status: item.status || 'pending',
            }));
            // Sort by submittedAt descending
            normalized.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
            setRequests(normalized);
        } catch (error) {
            console.error('Failed to load transport subscription requests:', error);
        } finally {
            setIsLoading(false);
        }
    }, [institution?.id]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // ── Metrics Calculation ───────────────────────────────────────────────────
    const metrics = useMemo(() => {
        const total = requests.length;
        const pending = requests.filter(r => (r.approvalStatus || 'pending') === 'pending').length;
        const approved = requests.filter(r => r.approvalStatus === 'approved').length;
        const rejected = requests.filter(r => r.approvalStatus === 'rejected').length;

        const totalRevenue = requests.reduce((sum, r) => sum + (r.finalAmount || 0), 0);
        const paidRevenue = requests
            .filter(r => r.status === 'paid')
            .reduce((sum, r) => sum + (r.finalAmount || 0), 0);
        const pendingRevenue = requests
            .filter(r => r.status !== 'paid')
            .reduce((sum, r) => sum + (r.finalAmount || 0), 0);

        return { total, pending, approved, rejected, totalRevenue, paidRevenue, pendingRevenue };
    }, [requests]);

    // ── Filtering ─────────────────────────────────────────────────────────────
    const filteredRequests = useMemo(() => {
        return requests.filter(r => {
            // Status filter
            const appStatus = r.approvalStatus || 'pending';
            if (statusFilter !== 'all' && appStatus !== statusFilter) return false;

            // Payment filter
            if (paymentFilter === 'paid' && r.status !== 'paid') return false;
            if (paymentFilter === 'pending' && r.status === 'paid') return false;

            // Route filter
            if (routeFilter !== 'all' && r.routeId !== routeFilter) return false;

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const sName = (r.studentName || '').toLowerCase();
                const adm = (r.admissionNumber || '').toLowerCase();
                const phone = (r.parentPhone || '').toLowerCase();
                const rName = (r.routeName || '').toLowerCase();
                return sName.includes(q) || adm.includes(q) || phone.includes(q) || rName.includes(q);
            }

            return true;
        });
    }, [requests, statusFilter, paymentFilter, routeFilter, searchQuery]);

    // ── Approve Action ────────────────────────────────────────────────────────
    const handleApprove = async (req: SubscriptionRequest) => {
        if (!req.id || !institution?.id) return;
        setActionLoadingId(req.id);
        try {
            const updated: SubscriptionRequest = {
                ...req,
                approvalStatus: 'approved',
                approvedAt: new Date().toISOString(),
                approvedBy: currentUser?.name || 'Transport Administrator',
            };

            // Save updated subscription request
            await apiService.saveModuleRecord('transport_subscription_requests', updated, institution.id);

            // Optimistically update local state
            setRequests(prev => prev.map(r => r.id === req.id ? updated : r));

            // Link to student record if matching student is in users list
            const matchedStudent = users.find(u => 
                (u.role === 'student' || (u as any).roles?.includes?.('student')) &&
                (
                    ((u as any).admissionNumber && (u as any).admissionNumber.toLowerCase() === req.admissionNumber.toLowerCase()) ||
                    ((u as any).admission_number && (u as any).admission_number.toLowerCase() === req.admissionNumber.toLowerCase()) ||
                    (u.name && u.name.toLowerCase() === req.studentName.toLowerCase())
                )
            );

            if (matchedStudent) {
                try {
                    const studentUpdate = {
                        ...matchedStudent,
                        assignedRouteId: req.routeId,
                        routeId: req.routeId,
                        transportPreference: req.tripPreference,
                        metadata: {
                            ...(matchedStudent.metadata || {}),
                            assignedRouteId: req.routeId,
                            transportPreference: req.tripPreference,
                            transportSubscriptionId: req.id,
                        }
                    };
                    await apiService.saveModuleRecord('users', studentUpdate, institution.id);
                } catch (assignErr) {
                    console.warn('Student route link update non-fatal error:', assignErr);
                }
            }

            // Send instant SMS confirmation to parent
            if (req.parentPhone) {
                const schoolName = institution.name || 'School';
                const prefLabel = PREFERENCE_META[req.tripPreference]?.label || req.tripPreference;
                const smsText = `Dear Parent, ${req.studentName}'s transport subscription for ${req.routeName} (${prefLabel}) has been APPROVED by ${schoolName}. Bus pickup details will be shared shortly. Welcome aboard! - EduAI Transport`;
                try {
                    await apiService.sendSms(req.parentPhone, smsText, institution.id);
                } catch (smsErr) {
                    console.warn('Approval SMS delivery skipped:', smsErr);
                }
            }

            if (onRefreshParent) onRefreshParent();
        } catch (error: any) {
            console.error('Failed to approve subscription:', error);
            alert(`Approval failed: ${error.message || 'Unknown error'}`);
        } finally {
            setActionLoadingId(null);
        }
    };

    // ── Reject Action ─────────────────────────────────────────────────────────
    const handleConfirmReject = async () => {
        if (!rejectionModalTarget || !rejectionModalTarget.id || !institution?.id) return;
        const reason = customReason.trim() || rejectionReason;
        setActionLoadingId(rejectionModalTarget.id);
        try {
            const updated: SubscriptionRequest = {
                ...rejectionModalTarget,
                approvalStatus: 'rejected',
                rejectionReason: reason,
            };

            await apiService.saveModuleRecord('transport_subscription_requests', updated, institution.id);

            // Optimistically update
            setRequests(prev => prev.map(r => r.id === rejectionModalTarget.id ? updated : r));

            // Send notification SMS
            if (rejectionModalTarget.parentPhone) {
                const schoolName = institution.name || 'School';
                const smsText = `Dear Parent, ${rejectionModalTarget.studentName}'s transport subscription request for ${rejectionModalTarget.routeName} could not be approved at this time: ${reason}. Please contact the transport office for assistance. - ${schoolName}`;
                try {
                    await apiService.sendSms(rejectionModalTarget.parentPhone, smsText, institution.id);
                } catch (smsErr) {
                    console.warn('Rejection SMS delivery skipped:', smsErr);
                }
            }

            setRejectionModalTarget(null);
            setCustomReason('');
            if (onRefreshParent) onRefreshParent();
        } catch (error: any) {
            console.error('Failed to reject subscription:', error);
            alert(`Action failed: ${error.message || 'Unknown error'}`);
        } finally {
            setActionLoadingId(null);
        }
    };

    // ── Mark Paid Action ──────────────────────────────────────────────────────
    const handleMarkPaid = async (req: SubscriptionRequest) => {
        if (!req.id || !institution?.id) return;
        if (!window.confirm(`Mark ${req.studentName}'s transport fee (${fmtKES(req.finalAmount)}) as Paid?`)) return;

        setActionLoadingId(req.id);
        try {
            const updated: SubscriptionRequest = {
                ...req,
                status: 'paid',
            };
            await apiService.saveModuleRecord('transport_subscription_requests', updated, institution.id);
            setRequests(prev => prev.map(r => r.id === req.id ? updated : r));

            // Send SMS
            if (req.parentPhone) {
                const schoolName = institution.name || 'School';
                const smsText = `Dear Parent, payment of ${fmtKES(req.finalAmount)} for ${req.studentName}'s transport (${req.routeName}) has been confirmed. Thank you! - ${schoolName}`;
                apiService.sendSms(req.parentPhone, smsText, institution.id).catch(() => {});
            }
        } catch (error: any) {
            alert(`Update failed: ${error.message || 'Unknown error'}`);
        } finally {
            setActionLoadingId(null);
        }
    };

    // ── Delete Action ─────────────────────────────────────────────────────────
    const handleDelete = async (req: SubscriptionRequest) => {
        if (!req.id || !institution?.id) return;
        if (!window.confirm(`Permanently delete the subscription request for ${req.studentName}?`)) return;

        setActionLoadingId(req.id);
        try {
            await apiService.deleteModuleRecord('transport_subscription_requests', req.id, institution.id);
            setRequests(prev => prev.filter(r => r.id !== req.id));
        } catch (error: any) {
            alert(`Delete failed: ${error.message || 'Unknown error'}`);
        } finally {
            setActionLoadingId(null);
        }
    };

    // ── Send Custom SMS ───────────────────────────────────────────────────────
    const handleSendCustomSms = async () => {
        if (!smsModalTarget || !smsMessage.trim() || !institution?.id) return;
        setIsSendingSms(true);
        try {
            await apiService.sendSms(smsModalTarget.parentPhone, smsMessage.trim(), institution.id);
            alert(`SMS alert successfully dispatched to ${smsModalTarget.parentPhone}!`);
            setSmsModalTarget(null);
            setSmsMessage('');
        } catch (error: any) {
            alert(`Failed to send SMS: ${error.message || 'Gateway error'}`);
        } finally {
            setIsSendingSms(false);
        }
    };

    // ── Export to Excel ───────────────────────────────────────────────────────
    const handleExportExcel = () => {
        if (filteredRequests.length === 0) {
            alert('No subscription records to export for the current filters.');
            return;
        }

        const dataToExport = filteredRequests.map((r, idx) => ({
            '#': idx + 1,
            'Request ID': r.id || 'N/A',
            'Student Name': r.studentName,
            'Admission No.': r.admissionNumber,
            'Parent Phone': r.parentPhone,
            'Route': r.routeName,
            'Trip Preference': PREFERENCE_META[r.tripPreference]?.label || r.tripPreference,
            'Billing Cycle': r.billingCycle === 'monthly' ? 'Monthly' : 'Per Term',
            'Period': r.period,
            'Fee Amount (KES)': r.finalAmount,
            'Payment Method': r.paymentMethod === 'mpesa_now' ? 'M-Pesa STK' : 'Pay Later (Invoice)',
            'Payment Status': r.status === 'paid' ? 'Paid' : 'Pending',
            'Approval Status': (r.approvalStatus || 'pending').toUpperCase(),
            'Approved By': r.approvedBy || '—',
            'Approved Date': r.approvedAt ? new Date(r.approvedAt).toLocaleDateString() : '—',
            'Rejection Reason': r.rejectionReason || '—',
            'Submitted At': r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—',
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Transport Subscriptions');
        const filename = `Transport_Subscriptions_${institution.name?.replace(/\s+/g, '_') || 'Export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
    };

    // ── Copy Link ─────────────────────────────────────────────────────────────
    const handleCopyShareLink = () => {
        const link = `${window.location.origin}/?view=transport-subscribe&inst=${institution?.id || ''}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopiedShareLink(true);
            setTimeout(() => setCopiedShareLink(false), 2500);
        }).catch(() => {
            window.prompt('Copy public enrolment link for parents:', link);
        });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-[2.5rem] p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-sky-500/20 text-sky-300 border border-sky-400/30 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" /> Self-Service Parent Portal
                            </span>
                            {metrics.pending > 0 && (
                                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
                                    {metrics.pending} Pending Approval
                                </span>
                            )}
                        </div>
                        <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                            <Bus className="w-8 h-8 text-sky-400" />
                            Transport Subscriptions & Enrolments
                        </h3>
                        <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                            Review and approve online transport bookings submitted by parents. Approving a request links the student to the route roster and sends an automated SMS confirmation.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            type="button"
                            onClick={handleCopyShareLink}
                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95 ${
                                copiedShareLink 
                                    ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
                            }`}
                            title="Copy the public transport enrolment link to send to parents via WhatsApp or SMS"
                        >
                            {copiedShareLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                            <span>{copiedShareLink ? 'Link Copied!' : 'Share Enrol Link'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExportExcel}
                            disabled={filteredRequests.length === 0}
                            className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export Excel</span>
                        </button>

                        <button
                            type="button"
                            onClick={fetchRequests}
                            disabled={isLoading}
                            className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl transition-all cursor-pointer active:scale-95"
                            title="Refresh enrolment data"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Enrolments</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.total}</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1">{fmtKES(metrics.totalRevenue)} total value</p>
                </div>

                <div className={`p-5 rounded-[2rem] border shadow-sm transition-all ${
                    metrics.pending > 0 
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' 
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                }`}>
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Pending Review
                    </p>
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{metrics.pending}</p>
                    <p className="text-[10px] font-semibold text-amber-600/80 dark:text-amber-400/80 mt-1">Requires admin approval</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" /> Approved Subscriptions
                    </p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{metrics.approved}</p>
                    <p className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-400/80 mt-1">Active commuters on roster</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5" /> Settled via M-Pesa
                    </p>
                    <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1">{fmtKES(metrics.paidRevenue)}</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1">{fmtKES(metrics.pendingRevenue)} pending on fee bill</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search student, adm, phone, route..."
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
                    />
                </div>

                {/* Filter Controls */}
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                    {/* Status Tabs */}
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                        {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setStatusFilter(tab)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    statusFilter === tab
                                        ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {tab === 'all' ? 'All' : tab === 'pending' ? `Pending (${metrics.pending})` : tab}
                            </button>
                        ))}
                    </div>

                    {/* Payment Status Dropdown */}
                    <select
                        value={paymentFilter}
                        onChange={e => setPaymentFilter(e.target.value as any)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                    >
                        <option value="all">Payment: All</option>
                        <option value="paid">M-Pesa Paid</option>
                        <option value="pending">Pay Later / Pending</option>
                    </select>

                    {/* Route Filter Dropdown */}
                    <select
                        value={routeFilter}
                        onChange={e => setRouteFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer max-w-[180px] truncate"
                    >
                        <option value="all">Route: All Routes</option>
                        {routes.map(r => (
                            <option key={r.routeId} value={r.routeId}>
                                {r.routeName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* List / Table of Requests */}
            {isLoading ? (
                <div className="bg-white dark:bg-slate-800 p-20 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 text-center">
                    <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Transport Requests...</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 p-16 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 text-center space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mx-auto text-slate-300 dark:text-slate-600">
                        <Bus className="w-8 h-8" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                            No Subscription Requests Found
                        </h4>
                        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                            {searchQuery || statusFilter !== 'all' || routeFilter !== 'all'
                                ? 'No requests match your current filters. Try resetting the search or filter options.'
                                : 'No parent has submitted an enrolment yet. Share the parent enrolment link to start receiving online registrations.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleCopyShareLink}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                    >
                        <Share2 className="w-4 h-4" />
                        <span>Copy Parent Enrolment Link</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredRequests.map(req => {
                        const appStatus = req.approvalStatus || 'pending';
                        const appMeta = APPROVAL_META[appStatus];
                        const prefMeta = PREFERENCE_META[req.tripPreference] || PREFERENCE_META.round_trip;
                        const isActionLoading = actionLoadingId === req.id;

                        return (
                            <div
                                key={req.id}
                                className={`bg-white dark:bg-slate-800 rounded-3xl border transition-all p-5 lg:p-6 shadow-sm hover:shadow-md ${
                                    appStatus === 'pending'
                                        ? 'border-amber-200/80 dark:border-amber-800/60 bg-gradient-to-r from-amber-50/30 to-white dark:from-amber-950/10 dark:to-slate-800'
                                        : 'border-slate-100 dark:border-slate-700'
                                }`}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                    {/* Student & Route Info */}
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg shadow-sm ${
                                            appStatus === 'approved' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700' :
                                            appStatus === 'rejected' ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700' :
                                            'bg-amber-100 dark:bg-amber-950/50 text-amber-700'
                                        }`}>
                                            <Bus className="w-6 h-6" />
                                        </div>

                                        <div className="space-y-1.5 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                    {req.studentName}
                                                </h4>
                                                <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                    {req.admissionNumber || 'NO ADM'}
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${appMeta.badge}`}>
                                                    <appMeta.icon className="w-3 h-3" />
                                                    {appMeta.label}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                                <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                                                    <MapPin className="w-3.5 h-3.5 text-sky-500" />
                                                    {req.routeName}
                                                </span>
                                                <span>•</span>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${prefMeta.badge}`}>
                                                    {prefMeta.icon} {prefMeta.label}
                                                </span>
                                                <span>•</span>
                                                <span className="font-semibold">
                                                    {req.period} ({req.billingCycle === 'monthly' ? 'Monthly' : 'Termly'})
                                                </span>
                                                {req.submittedAt && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-[10px] text-slate-400">
                                                            Submitted {new Date(req.submittedAt).toLocaleDateString()}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Notes / Reason if rejected */}
                                            {appStatus === 'rejected' && req.rejectionReason && (
                                                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 inline-block">
                                                    Reason: {req.rejectionReason}
                                                </p>
                                            )}

                                            {/* Approval details if approved */}
                                            {appStatus === 'approved' && req.approvedBy && (
                                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                    ✓ Approved by {req.approvedBy} {req.approvedAt ? `on ${new Date(req.approvedAt).toLocaleDateString()}` : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Fare & Payment Status */}
                                    <div className="flex items-center gap-6 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-700">
                                        <div className="text-left lg:text-right">
                                            <p className="text-base font-black text-slate-900 dark:text-white">
                                                {fmtKES(req.finalAmount)}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5 justify-start lg:justify-end">
                                                {req.status === 'paid' ? (
                                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-md text-[9px] font-black uppercase tracking-wider">
                                                        Paid via M-Pesa
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 rounded-md text-[9px] font-black uppercase tracking-wider">
                                                        Pay Later (Fee Bill)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Contact Parent */}
                                        <div className="flex items-center gap-1.5">
                                            {req.parentPhone && (
                                                <>
                                                    <a
                                                        href={`tel:${req.parentPhone}`}
                                                        className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
                                                        title={`Call parent: ${req.parentPhone}`}
                                                    >
                                                        <Phone className="w-4 h-4 text-emerald-600" />
                                                    </a>
                                                    <a
                                                        href={`https://wa.me/${req.parentPhone.replace(/\+/g, '').replace(/^0/, '254')}?text=${encodeURIComponent(`Hello, regarding ${req.studentName}'s transport subscription at ${institution.name}...`)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl transition-all"
                                                        title="WhatsApp Parent"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSmsModalTarget(req);
                                                            setSmsMessage(`Dear Parent, regarding ${req.studentName}'s transport subscription for ${req.routeName} at ${institution.name}: `);
                                                        }}
                                                        className="p-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 rounded-xl transition-all cursor-pointer"
                                                        title="Send Custom SMS"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            {appStatus === 'pending' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={isActionLoading}
                                                        onClick={() => handleApprove(req)}
                                                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                                                    >
                                                        {isActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                        <span>Approve</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={isActionLoading}
                                                        onClick={() => {
                                                            setRejectionModalTarget(req);
                                                            setRejectionReason('Route at full capacity');
                                                            setCustomReason('');
                                                        }}
                                                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 dark:bg-slate-700 dark:hover:bg-rose-950/50 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                                                    >
                                                        Decline
                                                    </button>
                                                </>
                                            )}

                                            {appStatus === 'approved' && req.status !== 'paid' && (
                                                <button
                                                    type="button"
                                                    disabled={isActionLoading}
                                                    onClick={() => handleMarkPaid(req)}
                                                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                                    title="Mark fee paid if parent paid directly at bursar"
                                                >
                                                    Mark Paid
                                                </button>
                                            )}

                                            {appStatus === 'rejected' && (
                                                <button
                                                    type="button"
                                                    disabled={isActionLoading}
                                                    onClick={() => handleApprove(req)}
                                                    className="px-3 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 dark:bg-slate-700 dark:hover:bg-emerald-950/40 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                                >
                                                    Re-Approve
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                disabled={isActionLoading}
                                                onClick={() => handleDelete(req)}
                                                className="p-2.5 text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 rounded-xl transition-all cursor-pointer"
                                                title="Delete this record"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Rejection / Decline Modal */}
            {rejectionModalTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 lg:p-8 border border-slate-100 dark:border-slate-800 space-y-5 animate-in zoom-in-95">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                                <XCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    Decline Subscription
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                    {rejectionModalTarget.studentName} · {rejectionModalTarget.routeName}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Select Reason for Decline
                            </label>
                            <div className="space-y-2">
                                {[
                                    'Route at full capacity',
                                    'Pickup point out of operational radius',
                                    'Pending previous term transport arrears',
                                    'Vehicle unavailable for requested timing',
                                    'Other (custom reason below)'
                                ].map(preset => (
                                    <label
                                        key={preset}
                                        className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                                            rejectionReason === preset
                                                ? 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/30 dark:border-rose-700 dark:text-rose-200'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="rejectionReason"
                                            checked={rejectionReason === preset}
                                            onChange={() => setRejectionReason(preset)}
                                            className="text-rose-600 focus:ring-rose-500"
                                        />
                                        <span>{preset}</span>
                                    </label>
                                ))}
                            </div>

                            {rejectionReason === 'Other (custom reason below)' && (
                                <textarea
                                    value={customReason}
                                    onChange={e => setCustomReason(e.target.value)}
                                    placeholder="Enter custom explanation to include in SMS to parent..."
                                    rows={3}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            )}
                        </div>

                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>An automated SMS will be sent to the parent ({rejectionModalTarget.parentPhone}) explaining why the booking could not be approved.</span>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setRejectionModalTarget(null)}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmReject}
                                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                            >
                                Confirm & Notify Parent
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick SMS Modal */}
            {smsModalTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 lg:p-8 border border-slate-100 dark:border-slate-800 space-y-4 animate-in zoom-in-95">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center">
                                <Send className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    Send SMS to Parent
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                    Recipient: {smsModalTarget.parentPhone} ({smsModalTarget.studentName})
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Message Text
                            </label>
                            <textarea
                                value={smsMessage}
                                onChange={e => setSmsMessage(e.target.value)}
                                rows={4}
                                placeholder="Type custom SMS update..."
                                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                            />
                            <p className="text-[10px] text-slate-400 text-right">
                                {smsMessage.length} characters (~{Math.ceil((smsMessage.length || 1) / 160)} SMS units)
                            </p>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setSmsModalTarget(null)}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isSendingSms || !smsMessage.trim()}
                                onClick={handleSendCustomSms}
                                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-2"
                            >
                                {isSendingSms ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                <span>{isSendingSms ? 'Sending...' : 'Send SMS'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
