import React, { useState, useMemo } from 'react';
import {
    Receipt, CheckCircle2, Clock, AlertCircle, Download,
    Plus, ChevronDown, ChevronUp, Bus, User, CreditCard,
    TrendingUp, Wallet, Calendar, FileText, X, Filter,
    Banknote, BadgeCheck, RotateCcw, Send
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TripPreference = 'round_trip' | 'one_way_pickup' | 'one_way_drop' | 'none';
export type BillStatus = 'pending' | 'paid' | 'overdue' | 'waived' | 'pro_rated';
export type BillingCycle = 'term' | 'monthly';

export interface RouteFeeSetting {
    routeId: string;
    routeName: string;
    termFee: number;        // Full round-trip fee per term
    monthlyFee: number;     // Full round-trip fee per month
    currency: string;
}

export interface TransportFeeInvoice {
    id: string;
    studentId: string;
    studentName: string;
    admissionNumber: string;
    routeId: string;
    routeName: string;
    preference: TripPreference;
    billingCycle: BillingCycle;
    period: string;          // e.g. "Term 2 · 2026" or "June 2026"
    baseAmount: number;
    discountAmount: number;
    finalAmount: number;
    status: BillStatus;
    issuedDate: string;
    dueDate: string;
    paidDate?: string;
    paymentMethod?: string;
    notes?: string;
}

interface TransportBillingProps {
    routeSettings: RouteFeeSetting[];
    invoices: TransportFeeInvoice[];
    onUpdateRouteFee: (routeId: string, termFee: number, monthlyFee: number) => void;
    onGenerateInvoices: (cycle: BillingCycle, period: string) => void;
    onMarkPaid: (invoiceId: string, method: string) => void;
    onWaive: (invoiceId: string, reason: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PREFERENCE_LABELS: Record<TripPreference, { label: string; multiplier: number; color: string }> = {
    round_trip:      { label: 'Round Trip',      multiplier: 1.0,  color: 'text-indigo-600' },
    one_way_pickup:  { label: 'Morning Pick-up',  multiplier: 0.6,  color: 'text-emerald-600' },
    one_way_drop:    { label: 'Afternoon Drop-off', multiplier: 0.6, color: 'text-violet-600' },
    none:            { label: 'No Bus',           multiplier: 0.0,  color: 'text-slate-400' },
};

const STATUS_META: Record<BillStatus, { label: string; color: string; bg: string; icon: React.FC<any> }> = {
    pending:   { label: 'Pending',    color: 'text-amber-700',  bg: 'bg-amber-50 dark:bg-amber-950/30',   icon: Clock },
    paid:      { label: 'Paid',       color: 'text-emerald-700',bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: BadgeCheck },
    overdue:   { label: 'Overdue',    color: 'text-rose-700',   bg: 'bg-rose-50 dark:bg-rose-950/30',     icon: AlertCircle },
    waived:    { label: 'Waived',     color: 'text-slate-500',  bg: 'bg-slate-100 dark:bg-slate-800',     icon: RotateCcw },
    pro_rated: { label: 'Pro-Rated',  color: 'text-sky-700',    bg: 'bg-sky-50 dark:bg-sky-950/30',       icon: TrendingUp },
};

const fmt = (n: number, currency = 'KES') =>
    `${currency} ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

// ─── Sub: Route Fee Settings ──────────────────────────────────────────────────

const RouteFeeSettings: React.FC<{
    routes: RouteFeeSetting[];
    onUpdate: (routeId: string, termFee: number, monthlyFee: number) => void;
}> = ({ routes, onUpdate }) => {
    const [editing, setEditing] = useState<string | null>(null);
    const [termVal, setTermVal] = useState('');
    const [monthVal, setMonthVal] = useState('');

    const startEdit = (r: RouteFeeSetting) => {
        setEditing(r.routeId);
        setTermVal(String(r.termFee));
        setMonthVal(String(r.monthlyFee));
    };

    const save = (routeId: string) => {
        onUpdate(routeId, Number(termVal), Number(monthVal));
        setEditing(null);
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                <h4 className="text-sm font-black uppercase tracking-tight">Route Fee Configuration</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Set transport fees per route. One-way is automatically charged at 60% of the full fare.
                </p>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
                {routes.map(r => (
                    <div key={r.routeId} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Bus className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{r.routeName}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Round-trip base rate</p>
                            </div>
                        </div>

                        {editing === r.routeId ? (
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Per Term (KES)</label>
                                    <input
                                        type="number"
                                        value={termVal}
                                        onChange={e => setTermVal(e.target.value)}
                                        className="w-36 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Per Month (KES)</label>
                                    <input
                                        type="number"
                                        value={monthVal}
                                        onChange={e => setMonthVal(e.target.value)}
                                        className="w-36 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                </div>
                                <div className="flex items-end gap-2 pb-0.5">
                                    <button onClick={() => save(r.routeId)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                                        Save
                                    </button>
                                    <button onClick={() => setEditing(null)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-6 flex-wrap">
                                <div className="text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Per Term</p>
                                    <p className="text-lg font-black text-indigo-600">{fmt(r.termFee)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Per Month</p>
                                    <p className="text-lg font-black text-violet-600">{fmt(r.monthlyFee)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">One-Way</p>
                                    <p className="text-lg font-black text-emerald-600">{fmt(Math.round(r.termFee * 0.6))}</p>
                                </div>
                                <button
                                    onClick={() => startEdit(r)}
                                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                    Edit Fees
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {/* Legend */}
            <div className="p-5 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-50 dark:border-slate-700 flex flex-wrap gap-4">
                {Object.entries(PREFERENCE_LABELS).filter(([k]) => k !== 'none').map(([, v]) => (
                    <div key={v.label} className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${v.color}`}>
                            {v.label}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">→ {(v.multiplier * 100).toFixed(0)}% of base</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Sub: Invoice Table ───────────────────────────────────────────────────────

const InvoiceTable: React.FC<{
    invoices: TransportFeeInvoice[];
    onMarkPaid: (id: string, method: string) => void;
    onWaive: (id: string, reason: string) => void;
}> = ({ invoices, onMarkPaid, onWaive }) => {
    const [filterStatus, setFilterStatus] = useState<BillStatus | 'all'>('all');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [payingId, setPayingId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('M-Pesa');

    const filtered = filterStatus === 'all' ? invoices : invoices.filter(i => i.status === filterStatus);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: invoices.length };
        invoices.forEach(i => {
            counts[i.status] = (counts[i.status] || 0) + 1;
        });
        return counts;
    }, [invoices]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-tight">Transport Fee Invoices</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{invoices.length} invoices total</p>
                    </div>
                    {/* Status Filter Pills */}
                    <div className="flex flex-wrap gap-2">
                        {(['all', 'pending', 'paid', 'overdue', 'waived'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    filterStatus === s
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                            >
                                {s} {statusCounts[s] ? `(${statusCounts[s]})` : ''}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="p-16 text-center">
                    <FileText className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No invoices match this filter</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50 dark:border-slate-700">
                                {['Student', 'Route & Preference', 'Period', 'Amount', 'Due Date', 'Status', ''].map(h => (
                                    <th key={h} className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {filtered.map(inv => {
                                const meta = STATUS_META[inv.status];
                                const StatusIcon = meta.icon;
                                const prefMeta = PREFERENCE_LABELS[inv.preference];
                                const isExpanded = expanded === inv.id;
                                const isPaying = payingId === inv.id;

                                return (
                                    <React.Fragment key={inv.id}>
                                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors cursor-pointer"
                                            onClick={() => setExpanded(isExpanded ? null : inv.id)}>
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center flex-shrink-0">
                                                        <User className="w-4 h-4 text-indigo-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{inv.studentName}</p>
                                                        <p className="text-[9px] font-bold text-slate-400">{inv.admissionNumber}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[160px] truncate">{inv.routeName}</p>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${prefMeta.color}`}>{prefMeta.label}</span>
                                            </td>
                                            <td className="p-5 text-xs font-bold text-slate-500 whitespace-nowrap">{inv.period}</td>
                                            <td className="p-5">
                                                <p className="text-sm font-black text-slate-900 dark:text-white">{fmt(inv.finalAmount)}</p>
                                                {inv.discountAmount > 0 && (
                                                    <p className="text-[9px] font-bold text-emerald-600">-{fmt(inv.discountAmount)} discount</p>
                                                )}
                                            </td>
                                            <td className="p-5 text-xs font-bold text-slate-500 whitespace-nowrap">
                                                {new Date(inv.dueDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="p-5">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${meta.color} ${meta.bg}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {meta.label}
                                                </span>
                                                {inv.status === 'paid' && inv.paidDate && (
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1">{inv.paymentMethod} · {new Date(inv.paidDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}</p>
                                                )}
                                            </td>
                                            <td className="p-5">
                                                {isExpanded
                                                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                                    : <ChevronDown className="w-4 h-4 text-slate-400" />
                                                }
                                            </td>
                                        </tr>

                                        {/* Expanded row: actions */}
                                        {isExpanded && (
                                            <tr className="bg-indigo-50/30 dark:bg-indigo-950/10">
                                                <td colSpan={7} className="px-8 py-5">
                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                        <div className="flex-1 grid grid-cols-3 gap-4 text-center">
                                                            <div>
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Base Amount</p>
                                                                <p className="text-sm font-black text-slate-700 dark:text-slate-200">{fmt(inv.baseAmount)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Discount</p>
                                                                <p className="text-sm font-black text-emerald-600">{inv.discountAmount > 0 ? `-${fmt(inv.discountAmount)}` : '—'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Final</p>
                                                                <p className="text-sm font-black text-indigo-600">{fmt(inv.finalAmount)}</p>
                                                            </div>
                                                        </div>

                                                        {(inv.status === 'pending' || inv.status === 'overdue') && (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {isPaying ? (
                                                                    <>
                                                                        <select
                                                                            value={paymentMethod}
                                                                            onChange={e => setPaymentMethod(e.target.value)}
                                                                            onClick={e => e.stopPropagation()}
                                                                            className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white outline-none"
                                                                        >
                                                                            {['M-Pesa', 'Cash', 'Bank Transfer', 'Card', 'Cheque'].map(m => (
                                                                                <option key={m}>{m}</option>
                                                                            ))}
                                                                        </select>
                                                                        <button
                                                                            onClick={e => { e.stopPropagation(); onMarkPaid(inv.id, paymentMethod); setPayingId(null); setExpanded(null); }}
                                                                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                                        >
                                                                            Confirm Payment
                                                                        </button>
                                                                        <button
                                                                            onClick={e => { e.stopPropagation(); setPayingId(null); }}
                                                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            onClick={e => { e.stopPropagation(); setPayingId(inv.id); }}
                                                                            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                                        >
                                                                            <CreditCard className="w-3 h-3" />
                                                                            Mark Paid
                                                                        </button>
                                                                        <button
                                                                            onClick={e => { e.stopPropagation(); onWaive(inv.id, 'Admin waiver'); setExpanded(null); }}
                                                                            className="flex items-center gap-2 px-5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-slate-500 hover:text-amber-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                                        >
                                                                            <RotateCcw className="w-3 h-3" />
                                                                            Waive Fee
                                                                        </button>
                                                                        <button
                                                                            onClick={e => e.stopPropagation()}
                                                                            className="flex items-center gap-2 px-5 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                                        >
                                                                            <Send className="w-3 h-3" />
                                                                            Send Reminder
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ─── Main: TransportBillingManager ───────────────────────────────────────────

export const TransportBillingManager: React.FC<TransportBillingProps> = ({
    routeSettings,
    invoices,
    onUpdateRouteFee,
    onGenerateInvoices,
    onMarkPaid,
    onWaive,
}) => {
    const [activeSection, setActiveSection] = useState<'overview' | 'fees' | 'invoices'>('overview');
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('term');
    const [period, setPeriod] = useState('Term 2 · 2026');
    const [generating, setGenerating] = useState(false);

    const totalExpected = useMemo(() => invoices.filter(i => i.status !== 'waived').reduce((s, i) => s + i.finalAmount, 0), [invoices]);
    const totalCollected = useMemo(() => invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.finalAmount, 0), [invoices]);
    const totalOutstanding = useMemo(() => invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + i.finalAmount, 0), [invoices]);
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    const handleGenerate = () => {
        setGenerating(true);
        setTimeout(() => {
            onGenerateInvoices(billingCycle, period);
            setGenerating(false);
            setActiveSection('invoices');
        }, 800);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        Transport Billing
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Set route fees, generate term invoices, and track parent payments
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={billingCycle}
                        onChange={e => setBillingCycle(e.target.value as BillingCycle)}
                        className="px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white outline-none"
                    >
                        <option value="term">Per Term</option>
                        <option value="monthly">Per Month</option>
                    </select>
                    <select
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                        className="px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white outline-none"
                    >
                        {billingCycle === 'term'
                            ? ['Term 1 · 2026', 'Term 2 · 2026', 'Term 3 · 2026', 'Term 1 · 2027'].map(p => <option key={p}>{p}</option>)
                            : ['June 2026', 'July 2026', 'August 2026', 'September 2026'].map(p => <option key={p}>{p}</option>)
                        }
                    </select>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-2 px-7 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
                    >
                        {generating ? (
                            <><RotateCcw className="w-4 h-4 animate-spin" /> Generating...</>
                        ) : (
                            <><Plus className="w-4 h-4" /> Generate Invoices</>
                        )}
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Expected',    value: fmt(totalExpected),    color: 'from-indigo-500 to-indigo-700',   icon: Receipt },
                    { label: 'Collected',         value: fmt(totalCollected),   color: 'from-emerald-500 to-emerald-700', icon: BadgeCheck },
                    { label: 'Outstanding',       value: fmt(totalOutstanding), color: 'from-rose-500 to-rose-700',       icon: AlertCircle },
                    { label: 'Collection Rate',   value: `${collectionRate}%`,  color: 'from-violet-500 to-violet-700',   icon: TrendingUp },
                ].map(kpi => (
                    <div key={kpi.label} className={`bg-gradient-to-br ${kpi.color} p-6 rounded-[2rem] shadow-lg text-white`}>
                        <kpi.icon className="w-5 h-5 opacity-70 mb-3" />
                        <p className="text-2xl font-black">{kpi.value}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-80 mt-1">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* Collection progress bar */}
            {totalExpected > 0 && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Collection Progress — {period}</p>
                        <p className="text-xs font-black text-indigo-600">{collectionRate}%</p>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3">
                        <div
                            className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-3 rounded-full transition-all duration-1000"
                            style={{ width: `${collectionRate}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>{fmt(totalCollected)} collected</span>
                        <span>{fmt(totalOutstanding)} outstanding</span>
                    </div>
                </div>
            )}

            {/* Section Nav */}
            <div className="flex gap-3 flex-wrap">
                {([
                    { id: 'overview', label: 'Overview', icon: TrendingUp },
                    { id: 'fees',     label: 'Route Fees', icon: Banknote },
                    { id: 'invoices', label: `Invoices (${invoices.length})`, icon: FileText },
                ] as const).map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeSection === s.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none'
                                : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700 hover:border-indigo-200'
                        }`}
                    >
                        <s.icon className="w-4 h-4" />
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Overview Section */}
            {activeSection === 'overview' && (
                <div className="space-y-6">
                    {/* Per-route breakdown */}
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50 dark:border-slate-700">
                            <h4 className="text-sm font-black uppercase tracking-tight">Per-Route Collection Summary</h4>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-slate-700">
                            {routeSettings.map(r => {
                                const routeInvoices = invoices.filter(i => i.routeId === r.routeId);
                                const routeCollected = routeInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.finalAmount, 0);
                                const routeExpected = routeInvoices.filter(i => i.status !== 'waived').reduce((s, i) => s + i.finalAmount, 0);
                                const pct = routeExpected > 0 ? Math.round((routeCollected / routeExpected) * 100) : 0;
                                return (
                                    <div key={r.routeId} className="p-5">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight truncate max-w-[55%]">{r.routeName}</p>
                                            <div className="flex items-center gap-3 text-right flex-shrink-0">
                                                <span className="text-xs font-bold text-emerald-600">{fmt(routeCollected)}</span>
                                                <span className="text-[9px] font-bold text-slate-400">/ {fmt(routeExpected)}</span>
                                                <span className="text-[9px] font-black text-indigo-600 w-10">{pct}%</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                            <div className={`h-2 rounded-full transition-all duration-700 ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-400 mt-1">{routeInvoices.length} students · {routeInvoices.filter(i => i.status === 'paid').length} paid · {routeInvoices.filter(i => i.status === 'overdue').length} overdue</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Preference distribution */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h4 className="text-sm font-black uppercase tracking-tight mb-6">Subscription Preference Breakdown</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {(Object.entries(PREFERENCE_LABELS) as [TripPreference, typeof PREFERENCE_LABELS[TripPreference]][]).map(([key, val]) => {
                                const count = invoices.filter(i => i.preference === key).length;
                                return (
                                    <div key={key} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl text-center">
                                        <p className={`text-2xl font-black ${val.color}`}>{count}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{val.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* AI Insight */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] text-white shadow-xl">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">✨ AI Billing Insight</p>
                        <h4 className="text-lg font-black">
                            {totalOutstanding > 0
                                ? `${fmt(totalOutstanding)} remains uncollected — send payment reminders`
                                : 'All transport fees collected for this period 🎉'}
                        </h4>
                        <p className="text-sm opacity-80 mt-2">
                            {invoices.filter(i => i.status === 'overdue').length > 0
                                ? `${invoices.filter(i => i.status === 'overdue').length} invoice(s) are overdue. Consider sending SMS reminders or escalating to the school fees department.`
                                : 'Collection is on track. Generate next term\'s invoices early to give parents advance notice.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Fees Section */}
            {activeSection === 'fees' && (
                <RouteFeeSettings routes={routeSettings} onUpdate={onUpdateRouteFee} />
            )}

            {/* Invoices Section */}
            {activeSection === 'invoices' && (
                invoices.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 p-20 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-700 text-center">
                        <Receipt className="w-14 h-14 text-slate-200 dark:text-slate-700 mx-auto mb-6" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No invoices generated yet</p>
                        <p className="text-xs font-bold text-slate-300 dark:text-slate-600 mt-2">Select a billing period above and click Generate Invoices</p>
                    </div>
                ) : (
                    <InvoiceTable invoices={invoices} onMarkPaid={onMarkPaid} onWaive={onWaive} />
                )
            )}
        </div>
    );
};
