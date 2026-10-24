import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
    ClipboardListIcon,
    SearchIcon,
    ArrowPathIcon,
    DownloadIcon,
    PrinterIcon,
    FunnelIcon,
    CalendarDaysIcon,
    BuildingOfficeIcon,
    UserIcon,
    DocumentTextIcon,
    CurrencyIcon,
    ZapIcon,
    CheckCircleIcon,
    ClockIcon,
    ChatBubbleLeftRightIcon,
    ShieldCheckIcon,
    XIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    EyeIcon
} from './icons';
import { apiService } from '../services/apiService';
import type {
    PMProperty,
    PMUnit,
    PMTenant,
    PMLandlord,
    PMLease,
    PMPayment,
    PMInvoice,
    PMNoticeLetter,
    PMUtilityReading,
    PMInspection,
    PMDepositRefund,
    PMDisbursement,
    PMExpenseVoucher,
    PMTicket,
    ActivityLog,
    SmsLog
} from '../types';

export type PMLogCategory = 'all' | 'financial' | 'utilities' | 'notices' | 'inspections' | 'maintenance' | 'audit' | 'sms';

export interface UnifiedPMLogItem {
    id: string;
    timestamp: string; // ISO format
    category: 'Financial' | 'Utilities' | 'Notices' | 'Inspections' | 'Maintenance' | 'Audit' | 'SMS';
    action: string;
    propertyName?: string;
    propertyId?: string;
    unitNumber?: string;
    unitId?: string;
    targetName?: string;
    targetRole?: string;
    details: string;
    amount?: number;
    referenceCode?: string;
    performerName: string;
    status?: string;
    badgeColor: 'emerald' | 'cyan' | 'indigo' | 'amber' | 'purple' | 'rose' | 'blue' | 'slate';
    rawPayload?: any;
}

interface PMLogsReportsViewProps {
    institutionId?: string;
    currentInstitution?: any;
    properties: PMProperty[];
    units: PMUnit[];
    tenants: PMTenant[];
    landlords: PMLandlord[];
    leases: PMLease[];
    payments: PMPayment[];
    invoices: PMInvoice[];
    notices: PMNoticeLetter[];
    utilityReadings: PMUtilityReading[];
    inspections: PMInspection[];
    depositRefunds: PMDepositRefund[];
    disbursements: PMDisbursement[];
    expenses: PMExpenseVoucher[];
    tickets: PMTicket[];
    users?: any[];
}

const PAGE_SIZE = 25;
export const safeFormatNumber = (val: any): string => {
    if (val === undefined || val === null || val === '') return '0';
    const num = Number(val);
    if (isNaN(num)) return '0';
    return num.toLocaleString();
};

export const parseSafeIsoDate = (rawDate?: any, fallbackDate?: any, defaultTime = '12:00:00'): string => {
    const candidates = [rawDate, fallbackDate];
    for (const cand of candidates) {
        if (!cand) continue;
        const str = String(cand).trim();
        if (!str || str.toLowerCase() === 'invalid date' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
            continue;
        }

        // Direct parse
        const direct = new Date(str);
        if (!isNaN(direct.getTime())) {
            return direct.toISOString();
        }

        // YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const parsed = new Date(`${str}T${defaultTime}Z`);
            if (!isNaN(parsed.getTime())) return parsed.toISOString();
        }

        // YYYY-MM-DD prefix with arbitrary suffix
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
            const datePart = str.substring(0, 10);
            const parsed = new Date(`${datePart}T${defaultTime}Z`);
            if (!isNaN(parsed.getTime())) return parsed.toISOString();
        }

        // DD/MM/YYYY or DD-MM-YYYY
        const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
        if (dmy) {
            const parsed = new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}T${defaultTime}Z`);
            if (!isNaN(parsed.getTime())) return parsed.toISOString();
        }
    }

    return new Date().toISOString();
};

export const safeFormatDate = (val: any): string => {
    if (!val) return 'Recent';
    try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return d.toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    } catch {}

    try {
        const iso = parseSafeIsoDate(val);
        const d = new Date(iso);
        if (!isNaN(d.getTime())) {
            return d.toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    } catch {}

    return 'Recent';
};

export const safeFormatDateOnly = (val: any): string => {
    if (!val) return 'Recent';
    try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    } catch {}

    try {
        const iso = parseSafeIsoDate(val);
        const d = new Date(iso);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    } catch {}

    return 'Recent';
};

export const safeFormatTimeOnly = (val: any): string => {
    if (!val) return '—';
    try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return d.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    } catch {}

    try {
        const iso = parseSafeIsoDate(val);
        const d = new Date(iso);
        if (!isNaN(d.getTime())) {
            return d.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    } catch {}

    return '—';
};


export const PMLogsReportsView: React.FC<PMLogsReportsViewProps> = ({
    institutionId,
    currentInstitution,
    properties = [],
    units = [],
    tenants = [],
    landlords = [],
    leases = [],
    payments = [],
    invoices = [],
    notices = [],
    utilityReadings = [],
    inspections = [],
    depositRefunds = [],
    disbursements = [],
    expenses = [],
    tickets = [],
    users = []
}) => {
    const [categoryFilter, setCategoryFilter] = useState<PMLogCategory>('all');
    const [propertyFilter, setPropertyFilter] = useState<string>('all');
    const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [selectedLogForModal, setSelectedLogForModal] = useState<UnifiedPMLogItem | null>(null);

    // Live remote logs (Activity log and SMS log from DB)
    const [remoteActivityLogs, setRemoteActivityLogs] = useState<ActivityLog[]>([]);
    const [remoteSmsLogs, setRemoteSmsLogs] = useState<SmsLog[]>([]);
    const [isLoadingRemote, setIsLoadingRemote] = useState<boolean>(false);

    const loadRemoteLogs = useCallback(async () => {
        if (!institutionId) return;
        setIsLoadingRemote(true);
        try {
            const [acts, sms] = await Promise.all([
                apiService.fetchModuleRecords<ActivityLog>('activity_log', institutionId).catch(() => []),
                apiService.fetchSmsLogs(institutionId).catch(() => [])
            ]);
            setRemoteActivityLogs(acts || []);
            setRemoteSmsLogs(sms || []);
        } catch (err) {
            console.error("Failed to fetch remote PM logs:", err);
        } finally {
            setIsLoadingRemote(false);
        }
    }, [institutionId]);

    useEffect(() => {
        loadRemoteLogs();
    }, [loadRemoteLogs]);

    // Build Maps for instant Lookups
    const propertyMap = useMemo(() => new Map(properties.map(p => [p.id, p])), [properties]);
    const unitMap = useMemo(() => new Map(units.map(u => [u.id, u])), [units]);
    const tenantMap = useMemo(() => new Map(tenants.map(t => [t.id, t])), [tenants]);
    const landlordMap = useMemo(() => new Map(landlords.map(l => [l.id, l])), [landlords]);
    const leaseMap = useMemo(() => new Map(leases.map(l => [l.id, l])), [leases]);

    // Compile Unified Chronological Log
    const unifiedLogs = useMemo(() => {
        const items: UnifiedPMLogItem[] = [];

        // 1. Rent Collections & Payments
        payments.forEach(p => {
            const lease = p.leaseId ? leaseMap.get(p.leaseId) : undefined;
            const tenant = lease?.tenantId ? tenantMap.get(lease.tenantId) : undefined;
            const unit = lease?.unitId ? unitMap.get(lease.unitId) : undefined;
            const prop = unit?.propertyId ? propertyMap.get(unit.propertyId) : undefined;

            items.push({
                id: `pm_pay_${p.id}`,
                timestamp: parseSafeIsoDate(p.paymentDate || (p as any).payment_date, p.createdAt || (p as any).created_at, '12:00:00'),
                category: 'Financial',
                action: `${p.paymentType || 'Rent'} Payment Received`,
                propertyName: prop?.name,
                propertyId: prop?.id,
                unitNumber: unit?.unitNumber,
                unitId: unit?.id,
                targetName: tenant?.name || 'Tenant',
                targetRole: 'Tenant',
                details: `KES ${safeFormatNumber(p?.amount)} via ${p.paymentMethod || 'M-Pesa'}${p.referenceNumber ? ` • Ref: ${p.referenceNumber}` : ''}${p.receiptNumber ? ` • Receipt #${p.receiptNumber}` : ''}`,
                amount: p.amount,
                referenceCode: p.referenceNumber || p.receiptNumber,
                performerName: 'Finance Desk',
                status: 'Completed',
                badgeColor: 'emerald',
                rawPayload: p
            });
        });

        // 2. Invoices Generated
        invoices.forEach(inv => {
            const lease = inv.leaseId ? leaseMap.get(inv.leaseId) : undefined;
            const tenant = inv.tenantId ? tenantMap.get(inv.tenantId) : (lease?.tenantId ? tenantMap.get(lease.tenantId) : undefined);
            const unit = inv.unitId ? unitMap.get(inv.unitId) : (lease?.unitId ? unitMap.get(lease.unitId) : undefined);
            const prop = inv.propertyId ? propertyMap.get(inv.propertyId) : (unit?.propertyId ? propertyMap.get(unit.propertyId) : undefined);

            items.push({
                id: `pm_inv_${inv.id}`,
                timestamp: parseSafeIsoDate(inv.createdAt || (inv as any).created_at, inv.dueDate || (inv as any).due_date, '09:00:00'),
                category: 'Financial',
                action: `Billing Invoice Generated (#${inv.invoiceNumber || inv.id.substring(0, 6)})`,
                propertyName: prop?.name,
                propertyId: prop?.id,
                unitNumber: unit?.unitNumber,
                unitId: unit?.id,
                targetName: tenant?.name || 'Tenant',
                targetRole: 'Tenant',
                details: `Billed KES ${safeFormatNumber(inv?.totalAmount ?? (inv as any)?.amount)} • Balance: KES ${safeFormatNumber(inv?.balance !== undefined ? inv.balance : (inv?.totalAmount ?? (inv as any)?.amount))} • Due: ${inv.dueDate || 'Immediate'}`,
                amount: inv.totalAmount,
                referenceCode: inv.invoiceNumber,
                performerName: 'Billing Engine',
                status: inv.status || 'Issued',
                badgeColor: 'blue',
                rawPayload: inv
            });
        });

        // 3. Landlord Disbursements
        disbursements.forEach(d => {
            const landlord = d.landlordId ? landlordMap.get(d.landlordId) : undefined;
            const prop = d.propertyId ? propertyMap.get(d.propertyId) : undefined;

            items.push({
                id: `pm_disb_${d.id}`,
                timestamp: parseSafeIsoDate(d.disbursementDate || (d as any).disbursement_date, d.createdAt || (d as any).created_at, '12:00:00'),
                category: 'Financial',
                action: `Landlord Disbursement Payout`,
                propertyName: prop?.name,
                propertyId: prop?.id,
                targetName: landlord?.name || 'Property Owner',
                targetRole: 'Landlord',
                details: `Net Disbursed: KES ${safeFormatNumber(d?.netPayout ?? (d as any)?.amount)} (Gross: KES ${safeFormatNumber(d?.grossCollected)} less commission KES ${safeFormatNumber(d?.commissionAmount)})${d.referenceNumber ? ` • Ref: ${d.referenceNumber}` : ''}`,
                amount: d.netPayout,
                referenceCode: d.referenceNumber,
                performerName: 'Disbursement Officer',
                status: d.status || 'Paid',
                badgeColor: 'purple',
                rawPayload: d
            });
        });

        // 4. Property Expenses
        expenses.forEach(ex => {
            const prop = ex.propertyId ? propertyMap.get(ex.propertyId) : undefined;
            items.push({
                id: `pm_exp_${ex.id}`,
                timestamp: parseSafeIsoDate(ex.expenseDate || (ex as any).expense_date, ex.createdAt || (ex as any).created_at, '12:00:00'),
                category: 'Financial',
                action: `Expense Voucher Recorded (${ex.category || 'Maintenance'})`,
                propertyName: prop?.name,
                propertyId: prop?.id,
                targetName: ex.payee || 'Vendor',
                targetRole: 'Payee',
                details: `Voucher #${ex?.voucherNumber || ex?.id?.substring(0, 6) || "VOUCH"}: KES ${safeFormatNumber(ex?.amount)} for "${ex.description || 'Property Expense'}" • Payee: ${ex.payee || 'Vendor'}`,
                amount: ex.amount,
                referenceCode: ex.voucherNumber,
                performerName: ex.approvedBy || 'Property Manager',
                status: ex.status || 'Approved',
                badgeColor: 'rose',
                rawPayload: ex
            });
        });

        // 5. Utility Meter Readings
        utilityReadings.forEach(u => {
            const unit = u.unitId ? unitMap.get(u.unitId) : undefined;
            const prop = u.propertyId ? propertyMap.get(u.propertyId) : (unit?.propertyId ? propertyMap.get(unit.propertyId) : undefined);

            items.push({
                id: `pm_ut_${u.id}`,
                timestamp: parseSafeIsoDate(u.readingDate || (u as any).reading_date, u.createdAt || (u as any).created_at, '10:00:00'),
                category: 'Utilities',
                action: `${u.utilityType || 'Utility'} Reading Logged`,
                propertyName: prop?.name,
                propertyId: prop?.id,
                unitNumber: unit?.unitNumber,
                unitId: unit?.id,
                details: `Meter: ${u?.previousReading ?? 0} → ${u?.currentReading ?? 0} (${u?.consumption ?? 0} units @ KES ${u?.rate ?? 0}/unit) = KES ${safeFormatNumber(u?.totalAmount)}`,
                amount: u.totalAmount,
                referenceCode: u.id.substring(0, 8),
                performerName: 'Meter Reader',
                status: u.status || 'Pending',
                badgeColor: 'cyan',
                rawPayload: u
            });
        });

        // 6. Notice Transmission Letters
        notices.forEach(n => {
            const lease = n.leaseId ? leaseMap.get(n.leaseId) : undefined;
            const tenant = n.tenantId ? tenantMap.get(n.tenantId) : (lease?.tenantId ? tenantMap.get(lease.tenantId) : undefined);
            const unit = lease?.unitId ? unitMap.get(lease.unitId) : undefined;
            const prop = unit?.propertyId ? propertyMap.get(unit.propertyId) : undefined;

            items.push({
                id: `pm_nt_${n.id}`,
                timestamp: parseSafeIsoDate(n.issuedDate || (n as any).issued_date, n.createdAt || (n as any).created_at, '09:00:00'),
                category: 'Notices',
                action: `${n.noticeType || 'Official'} Notice Dispatched`,
                propertyName: prop?.name,
                propertyId: prop?.id,
                unitNumber: unit?.unitNumber,
                unitId: unit?.id,
                targetName: tenant?.name || 'Tenant',
                targetRole: 'Tenant',
                details: `Subject: "${n.subject || 'Notice'}" • Effective: ${n.effectiveDate || 'Immediate'} • Method: ${n.method || 'SMS/Email'}`,
                referenceCode: n.id.substring(0, 8),
                performerName: 'Property Admin',
                status: n.status || 'Issued',
                badgeColor: 'amber',
                rawPayload: n
            });
        });

        // 7. Move-out & Vacate Inspections
        inspections.forEach(insp => {
            const lease = insp.leaseId ? leaseMap.get(insp.leaseId) : undefined;
            const tenant = lease?.tenantId ? tenantMap.get(lease.tenantId) : undefined;
            const unit = insp.unitId ? unitMap.get(insp.unitId) : (lease?.unitId ? unitMap.get(lease.unitId) : undefined);
            const prop = unit?.propertyId ? propertyMap.get(unit.propertyId) : undefined;

            items.push({
                id: `pm_insp_${insp.id}`,
                timestamp: parseSafeIsoDate(insp.inspectionDate || (insp as any).inspection_date, insp.createdAt || (insp as any).created_at, '14:00:00'),
                category: 'Inspections',
                action: `${insp.inspectionType || 'Move-out'} Inspection Recorded`,
                propertyName: prop?.name,
                propertyId: prop?.id,
                unitNumber: unit?.unitNumber,
                unitId: unit?.id,
                targetName: tenant?.name || 'Tenant',
                targetRole: 'Tenant',
                details: `Rating: ${insp.conditionRating || 'Good'} • Est. Repairs: KES ${safeFormatNumber(insp?.estimatedRepairCost)} • Notes: ${insp.notes || 'No remarks'}`,
                amount: insp.estimatedRepairCost,
                referenceCode: insp.id.substring(0, 8),
                performerName: 'Field Inspector',
                status: insp.status || 'Completed',
                badgeColor: 'indigo',
                rawPayload: insp
            });
        });

        // 8. Deposit Refunds
        depositRefunds.forEach(ref => {
            const lease = ref.leaseId ? leaseMap.get(ref.leaseId) : undefined;
            const tenant = ref.tenantId ? tenantMap.get(ref.tenantId) : (lease?.tenantId ? tenantMap.get(lease.tenantId) : undefined);
            const unit = lease?.unitId ? unitMap.get(lease.unitId) : undefined;
            const prop = unit?.propertyId ? propertyMap.get(unit.propertyId) : undefined;

            items.push({
                id: `pm_ref_${ref.id}`,
                timestamp: parseSafeIsoDate(ref.refundDate || (ref as any).refund_date, ref.createdAt || (ref as any).created_at, '15:00:00'),
                category: 'Inspections',
                action: `Security Deposit Refund Settled`,
                propertyName: prop?.name,
                propertyId: prop?.id,
                unitNumber: unit?.unitNumber,
                unitId: unit?.id,
                targetName: tenant?.name || 'Tenant',
                targetRole: 'Tenant',
                details: `Deposit KES ${safeFormatNumber(ref?.originalDeposit)} less deductions KES ${safeFormatNumber(ref?.deductions)} → Net Refund: KES ${safeFormatNumber(ref?.refundAmount)}`,
                amount: ref.refundAmount,
                referenceCode: ref.reference,
                performerName: 'Estate Administrator',
                status: ref.status || 'Completed',
                badgeColor: 'emerald',
                rawPayload: ref
            });
        });

        // 9. Maintenance Tickets
        tickets.forEach(tk => {
            const unit = tk.unitId ? unitMap.get(tk.unitId) : undefined;
            const prop = unit?.propertyId ? propertyMap.get(unit.propertyId) : undefined;

            items.push({
                id: `pm_tk_${tk.id}`,
                timestamp: parseSafeIsoDate(tk.createdAt || (tk as any).created_at, (tk as any).date, '11:00:00'),
                category: 'Maintenance',
                action: `Maintenance Ticket: ${tk.title || 'Work Order'}`,
                propertyName: prop?.name,
                propertyId: prop?.id,
                unitNumber: unit?.unitNumber,
                unitId: unit?.id,
                details: `Priority: ${tk.priority || 'Medium'} • Status: ${tk.status || 'Open'}${tk.assignedTo ? ` • Tech: ${tk.assignedTo}` : ''}${tk?.cost !== undefined && tk?.cost !== null ? ` • Cost: KES ${safeFormatNumber(tk.cost)}` : ''}`,
                amount: tk.cost,
                referenceCode: tk.id.substring(0, 8),
                performerName: tk.assignedTo || 'Facility Team',
                status: tk.status || 'Open',
                badgeColor: tk.priority === 'Urgent' ? 'rose' : (tk.priority === 'High' ? 'amber' : 'slate'),
                rawPayload: tk
            });
        });

        // 10. Remote Database Activity Logs
        remoteActivityLogs.forEach(act => {
            const isPM = !act.module || /pm|property|lease|tenant|landlord|utility|notice/i.test(act.module || '') || /pm|property|lease|tenant|landlord/i.test(act.action || '');
            if (!isPM && act.module) return;

            items.push({
                id: `act_${act.id}`,
                timestamp: parseSafeIsoDate(act.timestamp || (act as any).created_at, (act as any).date, '12:00:00'),
                category: 'Audit',
                action: act.action || 'Administrative Action',
                details: act.details || (act as any).message || 'System operation executed',
                referenceCode: act.id.substring(0, 8),
                performerName: act.userName || (act as any).user_name || 'Staff User',
                status: 'Verified',
                badgeColor: 'purple',
                rawPayload: act
            });
        });

        // 11. Remote SMS Communication Logs
        remoteSmsLogs.forEach(sms => {
            items.push({
                id: `sms_${sms.id}`,
                timestamp: parseSafeIsoDate((sms as any).created_at || sms.timestamp, (sms as any).sent_at, '12:00:00'),
                category: 'SMS',
                action: `SMS Alert (${sms.recipient || 'Recipient'})`,
                targetName: sms.recipient,
                targetRole: 'Recipient',
                details: `"${(sms.message || '').substring(0, 120)}${(sms.message || '').length > 120 ? '...' : ''}" • Units: ${sms.units || 1}`,
                referenceCode: sms.id.substring(0, 8),
                performerName: 'Automated SMS Gateway',
                status: sms.status || 'sent',
                badgeColor: 'blue',
                rawPayload: sms
            });
        });

        // Sort descending by timestamp (newest first)
        items.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        });

        return items;
    }, [
        payments, invoices, disbursements, expenses, utilityReadings, notices,
        inspections, depositRefunds, tickets, remoteActivityLogs, remoteSmsLogs,
        propertyMap, unitMap, tenantMap, landlordMap, leaseMap
    ]);

    // Filter Logic
    const filteredLogs = useMemo(() => {
        return unifiedLogs.filter(log => {
            // 1. Category Filter
            if (categoryFilter !== 'all') {
                if (categoryFilter === 'financial' && log.category !== 'Financial') return false;
                if (categoryFilter === 'utilities' && log.category !== 'Utilities') return false;
                if (categoryFilter === 'notices' && log.category !== 'Notices') return false;
                if (categoryFilter === 'inspections' && log.category !== 'Inspections') return false;
                if (categoryFilter === 'maintenance' && log.category !== 'Maintenance') return false;
                if (categoryFilter === 'audit' && log.category !== 'Audit') return false;
                if (categoryFilter === 'sms' && log.category !== 'SMS') return false;
            }

            // 2. Property Filter
            if (propertyFilter !== 'all') {
                if (log.propertyId && log.propertyId !== propertyFilter) return false;
                if (!log.propertyId && log.propertyName) {
                    const matchProp = properties.find(p => p.id === propertyFilter);
                    if (matchProp && matchProp.name !== log.propertyName) return false;
                }
            }

            // 3. Date / Period Filter
            if (periodFilter !== 'all') {
                const logTime = new Date(log.timestamp).getTime();
                const now = new Date();

                if (periodFilter === 'today') {
                    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                    if (logTime < startOfToday) return false;
                } else if (periodFilter === 'week') {
                    const sevenDaysAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
                    if (logTime < sevenDaysAgo) return false;
                } else if (periodFilter === 'month') {
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                    if (logTime < startOfMonth) return false;
                } else if (periodFilter === 'custom') {
                    if (customStartDate) {
                        const start = new Date(customStartDate).getTime();
                        if (logTime < start) return false;
                    }
                    if (customEndDate) {
                        const end = new Date(customEndDate).getTime() + 86400000;
                        if (logTime > end) return false;
                    }
                }
            }

            // 4. Free-Text Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchAction = log.action.toLowerCase().includes(q);
                const matchDetails = log.details.toLowerCase().includes(q);
                const matchProp = (log.propertyName || '').toLowerCase().includes(q);
                const matchUnit = (log.unitNumber || '').toLowerCase().includes(q);
                const matchTarget = (log.targetName || '').toLowerCase().includes(q);
                const matchPerformer = log.performerName.toLowerCase().includes(q);
                const matchRef = (log.referenceCode || '').toLowerCase().includes(q);
                if (!matchAction && !matchDetails && !matchProp && !matchUnit && !matchTarget && !matchPerformer && !matchRef) {
                    return false;
                }
            }

            return true;
        });
    }, [unifiedLogs, categoryFilter, propertyFilter, periodFilter, customStartDate, customEndDate, searchQuery, properties]);

    // KPI Metrics calculation
    const metrics = useMemo(() => {
        const total = filteredLogs.length;
        const financialLogs = filteredLogs.filter(l => l.category === 'Financial');
        const financialVolume = financialLogs.reduce((sum, l) => sum + (l.amount || 0), 0);
        const utilityCount = filteredLogs.filter(l => l.category === 'Utilities').length;
        const noticeCount = filteredLogs.filter(l => l.category === 'Notices').length;
        const inspectionCount = filteredLogs.filter(l => l.category === 'Inspections').length;
        const auditCount = filteredLogs.filter(l => l.category === 'Audit').length;
        const smsCount = filteredLogs.filter(l => l.category === 'SMS').length;

        return {
            total,
            financialCount: financialLogs.length,
            financialVolume,
            utilityCount,
            noticeCount,
            inspectionCount,
            auditCount,
            smsCount
        };
    }, [filteredLogs]);

    // Category Count Badges for Pills
    const categoryCounts = useMemo(() => {
        return {
            all: unifiedLogs.length,
            financial: unifiedLogs.filter(l => l.category === 'Financial').length,
            utilities: unifiedLogs.filter(l => l.category === 'Utilities').length,
            notices: unifiedLogs.filter(l => l.category === 'Notices').length,
            inspections: unifiedLogs.filter(l => l.category === 'Inspections').length,
            maintenance: unifiedLogs.filter(l => l.category === 'Maintenance').length,
            audit: unifiedLogs.filter(l => l.category === 'Audit').length,
            sms: unifiedLogs.filter(l => l.category === 'SMS').length
        };
    }, [unifiedLogs]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredLogs.slice(start, start + PAGE_SIZE);
    }, [filteredLogs, currentPage]);

    // Export to Excel
    const handleExportExcel = () => {
        try {
            const rows = filteredLogs.map(l => ({
                'Date & Time': safeFormatDate(l.timestamp),
                'Log Category': l.category,
                'Action / Event': l.action,
                'Property Asset': l.propertyName || 'N/A',
                'Unit Number': l.unitNumber || 'N/A',
                'Target Entity': l.targetName || 'N/A',
                'Party Role': l.targetRole || 'N/A',
                'Details & Summary': l.details,
                'Amount (KES)': l.amount ? l.amount : '',
                'Reference Code': l.referenceCode || '',
                'Operator / System': l.performerName,
                'Status': l.status || 'Completed'
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(rows);

            // Auto-fit column widths
            const colWidths = [
                { wch: 22 }, // Date
                { wch: 15 }, // Category
                { wch: 32 }, // Action
                { wch: 22 }, // Property
                { wch: 12 }, // Unit
                { wch: 22 }, // Target
                { wch: 12 }, // Role
                { wch: 50 }, // Details
                { wch: 15 }, // Amount
                { wch: 18 }, // Ref
                { wch: 20 }, // Performer
                { wch: 14 }  // Status
            ];
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, 'PM Audit & Activity Logs');
            const fileName = `PM_Logs_Report_${(currentInstitution?.name || 'Estate').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } catch (e: any) {
            alert("Failed to export Excel report: " + (e?.message || e));
        }
    };

    // Export to CSV
    const handleExportCsv = () => {
        try {
            const headers = ['Timestamp', 'Category', 'Action', 'Property', 'Unit', 'Target', 'Role', 'Details', 'Amount', 'Reference', 'Operator', 'Status'];
            const csvRows = [headers.join(',')];

            filteredLogs.forEach(l => {
                const row = [
                    `"${safeFormatDate(l.timestamp)}"`,
                    `"${l.category}"`,
                    `"${(l.action || '').replace(/"/g, '""')}"`,
                    `"${(l.propertyName || '').replace(/"/g, '""')}"`,
                    `"${l.unitNumber || ''}"`,
                    `"${(l.targetName || '').replace(/"/g, '""')}"`,
                    `"${l.targetRole || ''}"`,
                    `"${(l.details || '').replace(/"/g, '""')}"`,
                    l.amount || '',
                    `"${l.referenceCode || ''}"`,
                    `"${(l.performerName || '').replace(/"/g, '""')}"`,
                    `"${l.status || ''}"`
                ];
                csvRows.push(row.join(','));
            });

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `PM_Logs_Report_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (e: any) {
            alert("Failed to export CSV: " + (e?.message || e));
        }
    };

    const getBadgeStyle = (color: string) => {
        switch (color) {
            case 'emerald':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
            case 'cyan':
                return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60';
            case 'indigo':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60';
            case 'amber':
                return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
            case 'purple':
                return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60';
            case 'rose':
                return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
            case 'blue':
                return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-[2.5rem] p-8 sm:p-10 border border-indigo-500/30 text-white shadow-2xl shadow-indigo-950/40">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-300">
                                <ShieldCheckIcon className="w-3.5 h-3.5 text-blue-300" />
                                Institutional Audit & Telemetry
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                                • {currentInstitution?.name || 'Property Portfolio'}
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-white">
                            Property Management Logs & Audit Ledger
                        </h2>
                        <p className="text-xs text-blue-100/80 leading-relaxed font-medium">
                            Comprehensive chronological log of rent payments, invoice generations, landlord disbursements, utility meter readings, notice letters, move-out inspections, SMS notifications & administrative operations.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 self-stretch lg:self-auto justify-start sm:justify-end">
                        <button
                            type="button"
                            onClick={loadRemoteLogs}
                            disabled={isLoadingRemote}
                            className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-widest rounded-2xl border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                            title="Refresh real-time audit logs from database"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${isLoadingRemote ? 'animate-spin text-blue-300' : ''}`} />
                            Sync Logs
                        </button>
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-widest rounded-2xl border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2 shadow-sm"
                            title="Export filtered logs to CSV"
                        >
                            <DownloadIcon className="w-4 h-4 text-emerald-300" />
                            CSV
                        </button>
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5"
                            title="Download full multi-sheet audit ledger in Microsoft Excel"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            Export Excel (.xlsx)
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-blue-500/40 transition-all">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Filtered Logs</span>
                        <h4 className="text-3xl font-black text-slate-900 dark:text-white mt-1 italic tracking-tight">
                            {safeFormatNumber(metrics.total)}
                        </h4>
                        <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mt-1">
                            {categoryCounts.all} Cumulative Entries
                        </p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                        <ClipboardListIcon className="w-7 h-7" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-emerald-500/40 transition-all">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Financial Log Volume</span>
                        <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 italic tracking-tight">
                            KES {safeFormatNumber(metrics.financialVolume)}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                            {metrics.financialCount} Collections & Payouts
                        </p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                        <CurrencyIcon className="w-7 h-7" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-cyan-500/40 transition-all">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Utility Meter Readings</span>
                        <h4 className="text-3xl font-black text-cyan-600 dark:text-cyan-400 mt-1 italic tracking-tight">
                            {safeFormatNumber(metrics.utilityCount)}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                            Water, Electricity & Gas
                        </p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                        <ZapIcon className="w-7 h-7" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-amber-500/40 transition-all">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notices & SMS Dispatches</span>
                        <h4 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 italic tracking-tight">
                            {safeFormatNumber(metrics.noticeCount + metrics.smsCount)}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                            {metrics.noticeCount} Letters • {metrics.smsCount} SMS Alerts
                        </p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                        <ChatBubbleLeftRightIcon className="w-7 h-7" />
                    </div>
                </div>
            </div>

            {/* Filter Bar & Category Pills */}
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                {/* Category Pills Navigation */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-100 dark:border-slate-800">
                    {[
                        { id: 'all', label: 'All Logs', count: categoryCounts.all, color: 'blue' },
                        { id: 'financial', label: 'Financial Transactions', count: categoryCounts.financial, color: 'emerald' },
                        { id: 'utilities', label: 'Utility Meter Readings', count: categoryCounts.utilities, color: 'cyan' },
                        { id: 'notices', label: 'Notice Letters', count: categoryCounts.notices, color: 'amber' },
                        { id: 'inspections', label: 'Move-out Inspections', count: categoryCounts.inspections, color: 'indigo' },
                        { id: 'maintenance', label: 'Maintenance Tickets', count: categoryCounts.maintenance, color: 'rose' },
                        { id: 'sms', label: 'SMS Notifications', count: categoryCounts.sms, color: 'blue' },
                        { id: 'audit', label: 'System Audit Trail', count: categoryCounts.audit, color: 'purple' }
                    ].map(tab => {
                        const isActive = categoryFilter === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                    setCategoryFilter(tab.id as PMLogCategory);
                                    setCurrentPage(1);
                                }}
                                className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all ${
                                    isActive
                                        ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-md'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Secondary Filters Row: Search, Property, Period */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Search Field */}
                    <div className="md:col-span-5 relative">
                        <SearchIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search by action, tenant, unit, property, ref code, user..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 transition-all"
                        />
                    </div>

                    {/* Property Filter */}
                    <div className="md:col-span-3">
                        <select
                            value={propertyFilter}
                            onChange={e => {
                                setPropertyFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-all"
                        >
                            <option value="all">All Properties ({properties.length})</option>
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>{p.name} {p.town ? `(${p.town})` : ''}</option>
                            ))}
                        </select>
                    </div>

                    {/* Period Filter */}
                    <div className="md:col-span-4 flex items-center gap-2">
                        <select
                            value={periodFilter}
                            onChange={e => {
                                setPeriodFilter(e.target.value as any);
                                setCurrentPage(1);
                            }}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-all"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">Past 7 Days</option>
                            <option value="month">This Month</option>
                            <option value="custom">Custom Date Range</option>
                        </select>

                        {(searchQuery || propertyFilter !== 'all' || periodFilter !== 'all') && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setPropertyFilter('all');
                                    setPeriodFilter('all');
                                    setCustomStartDate('');
                                    setCustomEndDate('');
                                    setCurrentPage(1);
                                }}
                                className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-2xl transition-all"
                                title="Reset all filters"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Custom Date Range Pickers (conditional) */}
                {periodFilter === 'custom' && (
                    <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-300">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">From:</span>
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={e => {
                                setCustomStartDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                        />
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">To:</span>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={e => {
                                setCustomEndDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                        />
                    </div>
                )}
            </div>

            {/* Main Logs Table Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            Activity Records & Operational Audit Log
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                            Showing {filteredLogs.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length} matching events
                        </p>
                    </div>

                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Page {currentPage} of {totalPages}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                <th className="p-5">Timestamp</th>
                                <th className="p-5">Category & Action</th>
                                <th className="p-5">Asset / Unit</th>
                                <th className="p-5">Target Party</th>
                                <th className="p-5">Log Details & Values</th>
                                <th className="p-5">Operator</th>
                                <th className="p-5">Status</th>
                                <th className="p-5 text-right">Inspect</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                            {paginatedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-16 text-center text-slate-400">
                                        <div className="max-w-md mx-auto space-y-3">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                                                <ClipboardListIcon className="w-6 h-6" />
                                            </div>
                                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                                No Matching Log Entries
                                            </h4>
                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                No activity records found matching the current search query or active filter criteria.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedLogs.map((log) => {
                                    const dateStr = safeFormatDateOnly(log.timestamp);
                                    const timeStr = safeFormatTimeOnly(log.timestamp);

                                    return (
                                        <tr
                                            key={log.id}
                                            onClick={() => setSelectedLogForModal(log)}
                                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                                        >
                                            {/* Timestamp */}
                                            <td className="p-5 whitespace-nowrap">
                                                <div className="font-black text-slate-900 dark:text-white">{dateStr}</div>
                                                <div className="text-[10px] font-bold text-slate-400">{timeStr}</div>
                                            </td>

                                            {/* Category & Action */}
                                            <td className="p-5">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getBadgeStyle(log.badgeColor)}`}>
                                                        {log.category}
                                                    </span>
                                                </div>
                                                <div className="font-black text-slate-800 dark:text-slate-100 text-xs">
                                                    {log.action}
                                                </div>
                                                {log.referenceCode && (
                                                    <div className="text-[9px] font-bold text-slate-400 font-mono mt-0.5">
                                                        REF: {log.referenceCode}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Asset / Unit */}
                                            <td className="p-5 whitespace-nowrap">
                                                {log.propertyName ? (
                                                    <div>
                                                        <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                                            <BuildingOfficeIcon className="w-3.5 h-3.5 text-slate-400" />
                                                            {log.propertyName}
                                                        </div>
                                                        {log.unitNumber && (
                                                            <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                                                                Unit {log.unitNumber}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[11px]">General / All</span>
                                                )}
                                            </td>

                                            {/* Target Party */}
                                            <td className="p-5 whitespace-nowrap">
                                                {log.targetName ? (
                                                    <div>
                                                        <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                                            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                                            {log.targetName}
                                                        </div>
                                                        {log.targetRole && (
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 block">
                                                                {log.targetRole}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[11px]">—</span>
                                                )}
                                            </td>

                                            {/* Details & Values */}
                                            <td className="p-5 max-w-md">
                                                <div className="text-slate-700 dark:text-slate-300 text-xs line-clamp-2 leading-relaxed">
                                                    {log.details}
                                                </div>
                                                {log.amount !== undefined && log.amount > 0 && (
                                                    <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                                        KES {safeFormatNumber(log.amount)}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Operator */}
                                            <td className="p-5 whitespace-nowrap text-slate-600 dark:text-slate-400 font-bold text-xs">
                                                {log.performerName}
                                            </td>

                                            {/* Status */}
                                            <td className="p-5 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    {log.status || 'Logged'}
                                                </span>
                                            </td>

                                            {/* Inspect Button */}
                                            <td className="p-5 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedLogForModal(log);
                                                    }}
                                                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all"
                                                    title="View detailed log inspect modal"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-400">
                            Page {currentPage} of {totalPages}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-white rounded-xl text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <ChevronLeftIcon className="w-3.5 h-3.5" />
                                Prev
                            </button>

                            <button
                                type="button"
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-white rounded-xl text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                Next
                                <ChevronRightIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detailed Inspect Modal */}
            {selectedLogForModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getBadgeStyle(selectedLogForModal.badgeColor)}`}>
                                    {selectedLogForModal.category}
                                </span>
                                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Audit Record Inspector
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedLogForModal(null)}
                                className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 overflow-y-auto space-y-6 text-xs">
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Action / Event Name</div>
                                <div className="text-base font-black text-slate-900 dark:text-white italic">{selectedLogForModal.action}</div>
                                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2">{selectedLogForModal.details}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Timestamp</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {safeFormatDate(selectedLogForModal.timestamp)}
                                    </span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {selectedLogForModal.status || 'Verified'}
                                    </span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Property Asset</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {selectedLogForModal.propertyName || 'N/A'} {selectedLogForModal.unitNumber ? `(Unit ${selectedLogForModal.unitNumber})` : ''}
                                    </span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Target Entity</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {selectedLogForModal.targetName || 'N/A'} {selectedLogForModal.targetRole ? `(${selectedLogForModal.targetRole})` : ''}
                                    </span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Financial Value</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {selectedLogForModal.amount !== undefined && selectedLogForModal.amount !== null ? `KES ${safeFormatNumber(selectedLogForModal.amount)}` : 'None'}
                                    </span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Operator / Initiator</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {selectedLogForModal.performerName}
                                    </span>
                                </div>
                            </div>

                            {/* Raw Payload Preview */}
                            {selectedLogForModal.rawPayload && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Underlying Record Payload (JSON)</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(JSON.stringify(selectedLogForModal.rawPayload, null, 2));
                                                alert("JSON payload copied to clipboard!");
                                            }}
                                            className="text-[9px] font-bold text-blue-500 uppercase tracking-wider hover:underline"
                                        >
                                            Copy JSON
                                        </button>
                                    </div>
                                    <pre className="p-4 bg-slate-950 text-slate-200 rounded-2xl overflow-x-auto text-[10px] font-mono leading-relaxed border border-slate-800 max-h-48">
                                        {JSON.stringify(selectedLogForModal.rawPayload, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedLogForModal(null)}
                                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
