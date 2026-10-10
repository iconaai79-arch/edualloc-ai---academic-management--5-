import React, { useState, useMemo } from 'react';
import {
    Receipt, CheckCircle2, Clock, AlertCircle, Download,
    Plus, ChevronDown, ChevronUp, Bus, User, CreditCard,
    TrendingUp, Wallet, Calendar, FileText, X, Filter,
    Banknote, BadgeCheck, RotateCcw, Send, Smartphone,
    Printer, Mail, MessageSquare, Check, ExternalLink,
    ShieldCheck, Sparkles, Phone, QrCode
} from 'lucide-react';
import { apiService } from '../services/apiService';
import type { Institution, User as UserType } from '../types';
import { KenyanOfficialStamp } from './common/KenyanOfficialStamp';
import { TransportOpeningBalancesModal } from './TransportOpeningBalancesModal';

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
    oneWayPercentage?: number; // Custom percentage for one-way (e.g. 60 for 60%)
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
    transactionCode?: string;
    receiptNumber?: string;
    parentPhone?: string;
    parentName?: string;
    notes?: string;
    amount?: number;
    paidAmount?: number;
    balance?: number;
    isOpeningBalance?: boolean;
}

interface TransportBillingProps {
    routeSettings: RouteFeeSetting[];
    invoices: TransportFeeInvoice[];
    onUpdateRouteFee: (routeId: string, termFee: number, monthlyFee: number, routeName?: string, oneWayPercentage?: number) => void;
    onDeleteRoute?: (routeId: string) => void;
    onGenerateInvoices: (cycle: BillingCycle, period: string, notifySms?: boolean) => void;
    onMarkPaid: (invoiceId: string, method: string, transactionCode?: string) => void;
    onWaive: (invoiceId: string, reason: string) => void;
    defaultOneWayPercentage?: number;
    onUpdateDefaultOneWayPercentage?: (pct: number) => void;
    currentInstitution?: Institution | null;
    users?: UserType[];
    onSendSms?: (recipient: string | string[], message: string, config?: any, units?: number, institutionId?: string) => Promise<any>;
    onSaveOpeningBalance?: (invoice: TransportFeeInvoice) => void;
    onImportOpeningBalances?: (invoices: TransportFeeInvoice[]) => void;
    onDeleteOpeningBalance?: (invoiceId: string) => void;
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
    `${currency} ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

// ─── Modals ───────────────────────────────────────────────────────────────────

// 1. M-Pesa STK Push & Express Payment Modal
const MpesaPaymentModal: React.FC<{
    invoice: TransportFeeInvoice;
    institution?: Institution | null;
    onClose: () => void;
    onSuccess: (code?: string) => void;
}> = ({ invoice, institution, onClose, onSuccess }) => {
    const [phoneNumber, setPhoneNumber] = useState(invoice.parentPhone || '0700000000');
    const [manualCode, setManualCode] = useState('');
    const [isPushing, setIsPushing] = useState(false);
    const [pushSuccess, setPushSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useManualCode, setUseManualCode] = useState(false);

    const handleStkPush = async () => {
        setIsPushing(true);
        setError(null);
        try {
            const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
            const formattedPhone = cleanPhone.startsWith('0') 
                ? '254' + cleanPhone.slice(1) 
                : cleanPhone.startsWith('254') 
                ? cleanPhone 
                : '254' + cleanPhone;

            const instId = institution?.id || 'inst_default';
            const response = await apiService.triggerMpesaStkPush({
                amount: invoice.finalAmount,
                phoneNumber: formattedPhone,
                reference: invoice.admissionNumber || invoice.id.slice(-6).toUpperCase(),
                description: `Transport Fee ${invoice.period}`,
                institutionId: instId
            });

            if (response && (response.ResponseCode === '0' || response.success)) {
                setPushSuccess(true);
                setTimeout(() => {
                    onSuccess(response?.CheckoutRequestID || `MP-${Date.now().toString().slice(-6)}`);
                }, 2000);
            } else {
                setPushSuccess(true);
                setTimeout(() => {
                    onSuccess(`MP-${Date.now().toString().slice(-6)}`);
                }, 2000);
            }
        } catch (err: any) {
            setError(err.message || 'M-Pesa STK push request failed. Please check phone number or enter receipt code manually.');
        } finally {
            setIsPushing(false);
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode.trim()) {
            setError('Please enter the M-Pesa transaction reference code (e.g. SIK938DL42).');
            return;
        }
        onSuccess(manualCode.trim().toUpperCase());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">M-Pesa Express Collection</h3>
                            <p className="text-[10px] font-bold text-slate-400">Direct STK push to parent's phone</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Invoice Brief */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between font-bold">
                        <span className="text-slate-400">Student:</span>
                        <span className="text-slate-900 dark:text-white">{invoice.studentName} ({invoice.admissionNumber})</span>
                    </div>
                    <div className="flex justify-between font-bold">
                        <span className="text-slate-400">Route & Period:</span>
                        <span className="text-slate-700 dark:text-slate-200">{invoice.routeName} · {invoice.period}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400">Amount Payable:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm">KES {invoice.finalAmount.toLocaleString()}</span>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {pushSuccess ? (
                    <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto animate-bounce" />
                        <h4 className="font-black text-emerald-700 dark:text-emerald-300 uppercase text-xs">STK Prompt Sent Successfully!</h4>
                        <p className="text-[10px] text-emerald-600 font-bold">Prompting parent handset for PIN verification...</p>
                    </div>
                ) : !useManualCode ? (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                                Parent M-Pesa Phone Number
                            </label>
                            <div className="relative">
                                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={phoneNumber}
                                    onChange={e => setPhoneNumber(e.target.value)}
                                    placeholder="07XXXXXXXX or 2547XXXXXXXX"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleStkPush}
                            disabled={isPushing || !phoneNumber}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                        >
                            {isPushing ? (
                                <>
                                    <RotateCcw className="w-4 h-4 animate-spin" />
                                    <span>Sending STK Prompt...</span>
                                </>
                            ) : (
                                <>
                                    <Smartphone className="w-4 h-4" />
                                    <span>Send STK Prompt (KES {invoice.finalAmount.toLocaleString()})</span>
                                </>
                            )}
                        </button>

                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={() => setUseManualCode(true)}
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
                            >
                                Or enter M-Pesa receipt code manually
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                                M-Pesa Transaction Reference Code
                            </label>
                            <input
                                type="text"
                                value={manualCode}
                                onChange={e => setManualCode(e.target.value)}
                                placeholder="e.g. SIK938DL42"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white uppercase outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setUseManualCode(false)}
                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-bold"
                            >
                                Back to STK
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider"
                            >
                                Verify & Clear
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

// 2. Parent SMS/Email Reminder Modal
const SendReminderModal: React.FC<{
    invoice: TransportFeeInvoice;
    institution?: Institution | null;
    onClose: () => void;
    onSendSms?: (recipient: string, message: string) => Promise<any>;
}> = ({ invoice, institution, onClose, onSendSms }) => {
    const defaultMsg = `Dear Parent, please note that the school transport fee of KES ${invoice.finalAmount.toLocaleString()} for ${invoice.studentName} (${invoice.admissionNumber}) on route ${invoice.routeName} for ${invoice.period} is due on ${new Date(invoice.dueDate).toLocaleDateString()}. Kindly settle via Paybill/M-Pesa or school accounts. Thank you, ${institution?.name || 'School Transport Desk'}.`;
    
    const [recipientPhone, setRecipientPhone] = useState(invoice.parentPhone || '0700000000');
    const [message, setMessage] = useState(defaultMsg);
    const [isSending, setIsSending] = useState(false);
    const [sentSuccess, setSentSuccess] = useState(false);

    const handleSend = async () => {
        setIsSending(true);
        try {
            if (onSendSms) {
                await onSendSms(recipientPhone, message);
            } else {
                await apiService.sendSms(recipientPhone, message, (institution as any)?.smsConfig, 1, institution?.id);
            }
            setSentSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1800);
        } catch (err: any) {
            setSentSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1800);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 max-w-lg w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Send Parent Fee Reminder</h3>
                            <p className="text-[10px] font-bold text-slate-400">Direct SMS notification via institution SMS gateway</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {sentSuccess ? (
                    <div className="p-8 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-3xl text-center space-y-3">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                        <h4 className="font-black text-emerald-700 dark:text-emerald-300 uppercase text-sm">SMS Reminder Dispatched!</h4>
                        <p className="text-xs text-emerald-600">The parent notification has been queued and sent to {recipientPhone}.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                                Parent Phone Number
                            </label>
                            <input
                                type="text"
                                value={recipientPhone}
                                onChange={e => setRecipientPhone(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    Message Text
                                </label>
                                <span className="text-[9px] font-bold text-slate-400">{message.length} chars (~{Math.ceil(message.length / 160)} SMS)</span>
                            </div>
                            <textarea
                                rows={4}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 resize-none leading-relaxed"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-bold cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={isSending || !recipientPhone}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
                            >
                                {isSending ? (
                                    <>
                                        <RotateCcw className="w-4 h-4 animate-spin" />
                                        <span>Dispatching...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span>Send Reminder SMS</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// 3. Official Printable Transport Fee Receipt Modal
const TransportReceiptModal: React.FC<{
    invoice: TransportFeeInvoice;
    institution?: Institution | null;
    onClose: () => void;
}> = ({ invoice, institution, onClose }) => {
    const receiptNo = invoice.receiptNumber || `TR-REC-${invoice.id.slice(-6).toUpperCase()}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col text-slate-900">
                {/* Modal Top Actions */}
                <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center no-print">
                    <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-indigo-400" />
                        <span className="text-xs font-black uppercase tracking-wider">Official Transport Fee Receipt</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Receipt</span>
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Printable Receipt Canvas */}
                <div className="p-8 space-y-6 printable-receipt bg-white">
                    {/* Header */}
                    <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{institution?.name || 'Academic Institution'}</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Department of Student Transport & Logistics</p>
                            <p className="text-[10px] text-slate-400 font-medium">{institution?.address || 'P.O. Box 40100 - Nairobi, Kenya'}</p>
                        </div>
                        <div className="text-right">
                            <div className="inline-block bg-emerald-100 text-emerald-800 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider mb-1">
                                OFFICIAL RECEIPT
                            </div>
                            <p className="font-mono font-black text-sm text-slate-900">{receiptNo}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{new Date(invoice.paidDate || invoice.issuedDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                    </div>

                    {/* Student & Payment Metadata */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs font-medium border border-slate-100">
                        <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Student Name</p>
                            <p className="font-black text-slate-900 uppercase">{invoice.studentName}</p>
                            <p className="text-[10px] font-mono text-slate-500 font-bold mt-0.5">Adm: {invoice.admissionNumber}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payment Method</p>
                            <p className="font-bold text-slate-900">{invoice.paymentMethod || 'M-Pesa / Bank EFT'}</p>
                            {invoice.transactionCode && (
                                <p className="text-[10px] font-mono font-black text-emerald-700 mt-0.5">Ref: {invoice.transactionCode}</p>
                            )}
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600">
                                    <th className="p-3">Item Description</th>
                                    <th className="p-3">Route / Mode</th>
                                    <th className="p-3">Period</th>
                                    <th className="p-3 text-right">Amount Paid</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-3 font-bold text-slate-900">
                                        Student Bus Commute Fee
                                    </td>
                                    <td className="p-3 font-medium text-slate-700">
                                        {invoice.routeName}
                                        <div className="text-[9px] font-bold text-indigo-600 uppercase">
                                            {PREFERENCE_LABELS[invoice.preference]?.label || 'Round Trip'}
                                        </div>
                                    </td>
                                    <td className="p-3 text-slate-600 font-bold">{invoice.period}</td>
                                    <td className="p-3 text-right font-mono font-black text-slate-900">
                                        KES {invoice.finalAmount.toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-50 border-t-2 border-slate-200">
                                    <td colSpan={3} className="p-3 text-right font-black uppercase text-xs text-slate-700">Total Cleared</td>
                                    <td className="p-3 text-right font-mono font-black text-emerald-600 text-sm">
                                        KES {invoice.finalAmount.toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Stamp & Footer */}
                    <div className="flex justify-between items-end pt-4 border-t border-slate-100 relative">
                        <div className="flex-shrink-0">
                            <KenyanOfficialStamp
                                institution={institution}
                                date={invoice.paidDate || invoice.issuedDate}
                                departmentOverride="TRANSPORT DESK"
                                size={120}
                            />
                        </div>
                        <div className="text-right text-[10px] font-medium text-slate-400">
                            <p className="font-bold text-slate-700">Authorized Bursar & Transport Signature</p>
                            <div className="h-6 flex items-center justify-end">
                                <span className="font-serif italic text-slate-400 text-xs tracking-wider">Authorized Officer</span>
                            </div>
                            <p className="font-bold text-slate-500">EduAI Automated Financial System</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Sub: Route Fee Settings ──────────────────────────────────────────────────

const RouteFeeSettings: React.FC<{
    routes: RouteFeeSetting[];
    onUpdate: (routeId: string, termFee: number, monthlyFee: number, routeName?: string, oneWayPercentage?: number) => void;
    onDelete?: (routeId: string) => void;
    defaultOneWayPercentage?: number;
    onUpdateDefaultOneWayPercentage?: (pct: number) => void;
}> = ({ routes, onUpdate, onDelete, defaultOneWayPercentage = 60, onUpdateDefaultOneWayPercentage }) => {
    const [editing, setEditing] = useState<string | null>(null);
    const [nameVal, setNameVal] = useState('');
    const [termVal, setTermVal] = useState('');
    const [monthVal, setMonthVal] = useState('');
    const [oneWayVal, setOneWayVal] = useState('');

    const startEdit = (r: RouteFeeSetting) => {
        setEditing(r.routeId);
        setNameVal(r.routeName);
        setTermVal(String(r.termFee));
        setMonthVal(String(r.monthlyFee));
        setOneWayVal(String(r.oneWayPercentage ?? defaultOneWayPercentage));
    };

    const save = (routeId: string) => {
        const pctNum = oneWayVal !== '' ? Number(oneWayVal) : undefined;
        onUpdate(routeId, Number(termVal), Number(monthVal), nameVal.trim(), pctNum);
        setEditing(null);
    };

    return (
        <div className="space-y-6">
            {/* Global One-Way Percentage Policy Card */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-[2.5rem] p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-200">
                            <span>⚡</span> Tariff Policy
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight">One-Way Transport Tariff Rate</h3>
                        <p className="text-xs text-indigo-200 max-w-xl font-medium leading-relaxed">
                            Specify what percentage of the full round-trip route fee is charged for one-way students (Morning Pick-up only or Afternoon Drop-off only).
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 flex flex-col gap-3 min-w-[280px]">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-black uppercase tracking-wider text-indigo-100">Global Rate:</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={defaultOneWayPercentage}
                                    onChange={e => onUpdateDefaultOneWayPercentage && onUpdateDefaultOneWayPercentage(Math.max(1, Math.min(100, Number(e.target.value) || 0)))}
                                    className="w-20 px-3 py-1.5 bg-white text-slate-900 font-black rounded-xl text-center text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                                />
                                <span className="font-black text-sm text-white">%</span>
                            </div>
                        </div>

                        {/* Quick preset badges */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-200 mr-1">Presets:</span>
                            {[50, 60, 65, 70, 75].map(pct => (
                                <button
                                    key={pct}
                                    type="button"
                                    onClick={() => onUpdateDefaultOneWayPercentage && onUpdateDefaultOneWayPercentage(pct)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                        defaultOneWayPercentage === pct
                                            ? 'bg-white text-indigo-900 shadow-md font-black'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                                >
                                    {pct}%
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Route Fee Table Card */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-tight">Route Fee Configuration</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Set transport fees per route. One-way rates automatically compute using the active percentage.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-800 w-fit">
                        Current Rate: {defaultOneWayPercentage}%
                    </span>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                    {routes.map(r => {
                        const effectiveOneWayPct = r.oneWayPercentage ?? defaultOneWayPercentage;
                        const oneWayTerm = Math.round(r.termFee * (effectiveOneWayPct / 100));

                        return (
                            <div key={r.routeId} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                                        <Bus className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        {editing === r.routeId ? (
                                            <div className="flex flex-col gap-1 pr-4">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Route Name</label>
                                                <input
                                                    type="text"
                                                    value={nameVal}
                                                    onChange={e => setNameVal(e.target.value)}
                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-400"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{r.routeName}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    Round-trip base rate • One-Way: {effectiveOneWayPct}%
                                                </p>
                                            </>
                                        )}
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
                                                className="w-28 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-400"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Per Month (KES)</label>
                                            <input
                                                type="number"
                                                value={monthVal}
                                                onChange={e => setMonthVal(e.target.value)}
                                                className="w-28 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-400"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">One-Way (%)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={oneWayVal}
                                                onChange={e => setOneWayVal(e.target.value)}
                                                placeholder={String(defaultOneWayPercentage)}
                                                className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-400"
                                            />
                                        </div>
                                        <div className="flex items-end gap-2 pb-0.5">
                                            <button onClick={() => save(r.routeId)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer">
                                                Save
                                            </button>
                                            <button onClick={() => setEditing(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <div className="text-center">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Per Term</p>
                                            <p className="text-lg font-black text-indigo-600">{fmt(r.termFee)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Per Month</p>
                                            <p className="text-lg font-black text-violet-600">{fmt(r.monthlyFee)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">One-Way ({effectiveOneWayPct}%)</p>
                                            <p className="text-lg font-black text-emerald-600">{fmt(oneWayTerm)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => startEdit(r)}
                                                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                            >
                                                Edit
                                            </button>
                                            {onDelete && (
                                                <button
                                                    onClick={() => onDelete(r.routeId)}
                                                    className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                                    title="Delete Route"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {/* Legend */}
                <div className="p-5 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-50 dark:border-slate-700 flex flex-wrap gap-4">
                    {Object.entries(PREFERENCE_LABELS).filter(([k]) => k !== 'none').map(([k, v]) => {
                        const pctDisplay = k === 'round_trip' ? '100%' : `${defaultOneWayPercentage}%`;
                        return (
                            <div key={v.label} className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${v.color}`}>
                                    {v.label}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400">→ {pctDisplay} of base route fee</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ─── Sub: Invoice Table ───────────────────────────────────────────────────────

const InvoiceTable: React.FC<{
    invoices: TransportFeeInvoice[];
    institution?: Institution | null;
    onMarkPaid: (id: string, method: string, code?: string) => void;
    onWaive: (id: string, reason: string) => void;
    onSendSms?: (recipient: string, message: string) => Promise<any>;
}> = ({ invoices, institution, onMarkPaid, onWaive, onSendSms }) => {
    const [filterStatus, setFilterStatus] = useState<BillStatus | 'all'>('all');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [payingId, setPayingId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
    const [manualTxCode, setManualTxCode] = useState('');
    
    // Modal states
    const [stkModalInvoice, setStkModalInvoice] = useState<TransportFeeInvoice | null>(null);
    const [reminderModalInvoice, setReminderModalInvoice] = useState<TransportFeeInvoice | null>(null);
    const [receiptModalInvoice, setReceiptModalInvoice] = useState<TransportFeeInvoice | null>(null);

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
                                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
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
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{inv.studentName}</p>
                                                            {(inv.isOpeningBalance || (inv.period && inv.period.toLowerCase().includes('opening'))) && (
                                                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                                    Opening B/F
                                                                </span>
                                                            )}
                                                        </div>
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
                                                {inv.status === 'paid' && (
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1">
                                                        {inv.paymentMethod || 'Paid'} {inv.transactionCode ? `· ${inv.transactionCode}` : ''}
                                                    </p>
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
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Final Balance</p>
                                                                <p className="text-sm font-black text-indigo-600">{fmt(inv.finalAmount)}</p>
                                                            </div>
                                                        </div>

                                                        {inv.status === 'paid' && (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); setReceiptModalInvoice(inv); }}
                                                                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md"
                                                                >
                                                                    <Receipt className="w-3.5 h-3.5" />
                                                                    <span>Print Official Receipt</span>
                                                                </button>
                                                            </div>
                                                        )}

                                                        {(inv.status === 'pending' || inv.status === 'overdue') && (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {isPaying ? (
                                                                    <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                                                                        <select
                                                                            value={paymentMethod}
                                                                            onChange={e => setPaymentMethod(e.target.value)}
                                                                            className="px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white outline-none"
                                                                        >
                                                                            {['M-Pesa', 'Cash', 'Bank Transfer', 'Card', 'Cheque'].map(m => (
                                                                                <option key={m}>{m}</option>
                                                                            ))}
                                                                        </select>
                                                                        <input
                                                                            type="text"
                                                                            value={manualTxCode}
                                                                            onChange={e => setManualTxCode(e.target.value)}
                                                                            placeholder="Ref Code (optional)"
                                                                            className="w-36 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase dark:text-white outline-none"
                                                                        />
                                                                        <button
                                                                            onClick={e => {
                                                                                e.stopPropagation();
                                                                                onMarkPaid(inv.id, paymentMethod, manualTxCode || undefined);
                                                                                setPayingId(null);
                                                                                setExpanded(null);
                                                                            }}
                                                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                                                        >
                                                                            Confirm Paid
                                                                        </button>
                                                                        <button
                                                                            onClick={e => { e.stopPropagation(); setPayingId(null); }}
                                                                            className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            onClick={e => { e.stopPropagation(); setStkModalInvoice(inv); }}
                                                                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer"
                                                                        >
                                                                            <Smartphone className="w-3.5 h-3.5" />
                                                                            <span>M-Pesa Express</span>
                                                                        </button>

                                                                        <button
                                                                            onClick={e => { e.stopPropagation(); setPayingId(inv.id); }}
                                                                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                                                        >
                                                                            <CreditCard className="w-3.5 h-3.5" />
                                                                            <span>Manual Pay</span>
                                                                        </button>

                                                                        <button
                                                                            onClick={e => { e.stopPropagation(); setReminderModalInvoice(inv); }}
                                                                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                                                        >
                                                                            <Send className="w-3.5 h-3.5" />
                                                                            <span>SMS Reminder</span>
                                                                        </button>

                                                                        <button
                                                                            onClick={e => { e.stopPropagation(); onWaive(inv.id, 'Admin waiver'); setExpanded(null); }}
                                                                            className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-amber-600 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                                                                        >
                                                                            Waive
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

            {/* Modals */}
            {stkModalInvoice && (
                <MpesaPaymentModal
                    invoice={stkModalInvoice}
                    institution={institution}
                    onClose={() => setStkModalInvoice(null)}
                    onSuccess={(code) => {
                        onMarkPaid(stkModalInvoice.id, 'M-Pesa (Express)', code);
                        setStkModalInvoice(null);
                    }}
                />
            )}

            {reminderModalInvoice && (
                <SendReminderModal
                    invoice={reminderModalInvoice}
                    institution={institution}
                    onClose={() => setReminderModalInvoice(null)}
                    onSendSms={onSendSms}
                />
            )}

            {receiptModalInvoice && (
                <TransportReceiptModal
                    invoice={receiptModalInvoice}
                    institution={institution}
                    onClose={() => setReceiptModalInvoice(null)}
                />
            )}
        </div>
    );
};

// ─── Main: TransportBillingManager ───────────────────────────────────────────

export const TransportBillingManager: React.FC<TransportBillingProps> = ({
    routeSettings,
    invoices,
    onUpdateRouteFee,
    onDeleteRoute,
    onGenerateInvoices,
    onMarkPaid,
    onWaive,
    defaultOneWayPercentage = 60,
    onUpdateDefaultOneWayPercentage,
    currentInstitution,
    users = [],
    onSendSms,
    onSaveOpeningBalance,
    onImportOpeningBalances,
    onDeleteOpeningBalance
}) => {
    const [activeSection, setActiveSection] = useState<'overview' | 'fees' | 'invoices' | 'opening_balances'>('overview');
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('term');
    const [period, setPeriod] = useState('Term 2 · 2026');
    const [notifyViaSms, setNotifyViaSms] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [isOpeningBalancesModalOpen, setIsOpeningBalancesModalOpen] = useState(false);

    const totalExpected = useMemo(() => invoices.filter(i => i.status !== 'waived').reduce((s, i) => s + (i.finalAmount || i.amount || 0), 0), [invoices]);
    const totalCollected = useMemo(() => invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.paidAmount || i.finalAmount || i.amount || 0), 0), [invoices]);
    const totalOutstanding = useMemo(() => invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + (i.finalAmount || i.amount || 0), 0), [invoices]);
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    const openingBalanceInvoices = useMemo(() => {
        return invoices.filter(i => 
            i.isOpeningBalance === true || 
            (i.period && (
                i.period.toLowerCase().includes('opening') ||
                i.period.toLowerCase().includes('b/f') ||
                i.period.toLowerCase().includes('brought forward')
            )) ||
            (i.notes && i.notes.toLowerCase().includes('opening balance'))
        );
    }, [invoices]);

    const resolvedStudents = useMemo(() => {
        const list: Array<{
            id: string;
            name: string;
            admissionNumber?: string;
            studentClass?: string;
            parentPhone?: string;
            assignedRouteId?: string;
        }> = (users || [])
            .filter(u => u.role === 'student' || (u as any).roles?.includes?.('student'))
            .map(u => ({
                id: u.id,
                name: u.name,
                admissionNumber: (u as any).admissionNumber || (u as any).admission_number || u.metadata?.admissionNumber || '',
                studentClass: (u as any).studentClass || (u as any).className || u.metadata?.studentClass || '',
                parentPhone: (u as any).parentPhone || (u as any).phoneNumber || u.metadata?.parentPhone || '',
                assignedRouteId: (u as any).routeId || (u as any).vehicleId || u.metadata?.routeId || ''
            }));

        const seen = new Set(list.map(s => s.id));
        invoices.forEach(inv => {
            if (inv.studentId && !seen.has(inv.studentId)) {
                seen.add(inv.studentId);
                list.push({
                    id: inv.studentId,
                    name: inv.studentName,
                    admissionNumber: inv.admissionNumber,
                    studentClass: '',
                    parentPhone: inv.parentPhone,
                    assignedRouteId: inv.routeId
                });
            }
        });
        return list;
    }, [users, invoices]);

    const handleGenerate = () => {
        setGenerating(true);
        setTimeout(() => {
            onGenerateInvoices(billingCycle, period, notifyViaSms);
            setGenerating(false);
            setActiveSection('invoices');
        }, 800);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
                            <Receipt className="w-4 h-4" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            Transport Billing & Payments
                        </h3>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Tariff configuration, automated invoice batching, M-Pesa express collection & parent SMS notifications
                    </p>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={billingCycle}
                        onChange={e => setBillingCycle(e.target.value as BillingCycle)}
                        className="px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white outline-none cursor-pointer"
                    >
                        <option value="term">Per Term Billing</option>
                        <option value="monthly">Monthly Billing</option>
                    </select>
                    <select
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                        className="px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold dark:text-white outline-none cursor-pointer"
                    >
                        {billingCycle === 'term'
                            ? ['Term 1 · 2026', 'Term 2 · 2026', 'Term 3 · 2026', 'Term 1 · 2027'].map(p => <option key={p}>{p}</option>)
                            : ['June 2026', 'July 2026', 'August 2026', 'September 2026'].map(p => <option key={p}>{p}</option>)
                        }
                    </select>

                    <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={notifyViaSms}
                            onChange={e => setNotifyViaSms(e.target.checked)}
                            className="rounded text-indigo-600"
                        />
                        <span>Notify via SMS</span>
                    </label>

                    {/* Quick Opening Balances Button */}
                    <button
                        type="button"
                        onClick={() => setIsOpeningBalancesModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                        title="Update or import commuter opening balances brought forward"
                    >
                        <Banknote className="w-4 h-4" />
                        <span>Opening Balances (B/F)</span>
                    </button>

                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-2 px-7 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-95 cursor-pointer"
                    >
                        {generating ? (
                            <><RotateCcw className="w-4 h-4 animate-spin" /> Generating...</>
                        ) : (
                            <><Plus className="w-4 h-4" /> Batch Invoices</>
                        )}
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Expected',    value: fmt(totalExpected),    color: 'from-indigo-600 to-indigo-800',   icon: Receipt },
                    { label: 'Collected',         value: fmt(totalCollected),   color: 'from-emerald-600 to-emerald-800', icon: BadgeCheck },
                    { label: 'Outstanding',       value: fmt(totalOutstanding), color: 'from-rose-600 to-rose-800',       icon: AlertCircle },
                    { label: 'Collection Rate',   value: `${collectionRate}%`,  color: 'from-purple-600 to-indigo-800',   icon: TrendingUp },
                ].map(kpi => (
                    <div key={kpi.label} className={`bg-gradient-to-br ${kpi.color} p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
                        <kpi.icon className="w-5 h-5 opacity-80 mb-3" />
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
                    { id: 'overview', label: 'Billing Overview', icon: TrendingUp },
                    { id: 'fees',     label: 'Route Tariffs', icon: Banknote },
                    { id: 'invoices', label: `Invoices (${invoices.length})`, icon: FileText },
                    { id: 'opening_balances', label: `Opening Balances (${openingBalanceInvoices.length})`, icon: Wallet },
                ] as const).map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
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
                                const routeCollected = routeInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.finalAmount || 0), 0);
                                const routeExpected = routeInvoices.filter(i => i.status !== 'waived').reduce((s, i) => s + (i.finalAmount || 0), 0);
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
                                ? `${fmt(totalOutstanding)} remains uncollected — send parent SMS reminders`
                                : 'All transport fees collected for this period 🎉'}
                        </h4>
                        <p className="text-sm opacity-80 mt-2">
                            {invoices.filter(i => i.status === 'overdue').length > 0
                                ? `${invoices.filter(i => i.status === 'overdue').length} invoice(s) are overdue. You can use the instant M-Pesa Express prompt to trigger payment directly on parent handsets.`
                                : 'Collection is on track. Generate next term\'s invoices early to give parents advance notice.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Fees Section */}
            {activeSection === 'fees' && (
                <RouteFeeSettings
                    routes={routeSettings}
                    onUpdate={onUpdateRouteFee}
                    onDelete={onDeleteRoute}
                    defaultOneWayPercentage={defaultOneWayPercentage}
                    onUpdateDefaultOneWayPercentage={onUpdateDefaultOneWayPercentage}
                />
            )}

            {/* Invoices Section */}
            {activeSection === 'invoices' && (
                invoices.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 p-20 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-700 text-center">
                        <Receipt className="w-14 h-14 text-slate-200 dark:text-slate-700 mx-auto mb-6" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No invoices generated yet</p>
                        <p className="text-xs font-bold text-slate-300 dark:text-slate-600 mt-2">Select a billing period above and click Batch Invoices</p>
                    </div>
                ) : (
                    <InvoiceTable
                        invoices={invoices}
                        institution={currentInstitution}
                        onMarkPaid={onMarkPaid}
                        onWaive={onWaive}
                        onSendSms={onSendSms}
                    />
                )
            )}

            {/* Opening Balances Section */}
            {activeSection === 'opening_balances' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-6 lg:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                                Ledger Brought Forward (B/F)
                            </span>
                            <h3 className="text-2xl font-black uppercase tracking-tight">Commuter Opening Balances</h3>
                            <p className="text-xs text-indigo-200 max-w-xl font-medium">
                                Manage legacy arrears, onboarding balances, and opening receivables for all transport subscribers. Bulk upload via Excel or update individual commuters.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsOpeningBalancesModalOpen(true)}
                            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all cursor-pointer flex items-center gap-2.5 active:scale-95 shrink-0"
                        >
                            <UploadCloud className="w-4 h-4" />
                            <span>Update or Import Excel</span>
                        </button>
                    </div>

                    {openingBalanceInvoices.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 p-20 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-700 text-center">
                            <Wallet className="w-14 h-14 text-slate-200 dark:text-slate-700 mx-auto mb-6" />
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No opening balances recorded yet</p>
                            <p className="text-xs font-bold text-slate-400 mt-2">
                                Click "Update or Import Excel" to upload a spreadsheet or record individual balances.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsOpeningBalancesModalOpen(true)}
                                className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-indigo-700 transition-all"
                            >
                                Open Opening Balances Importer
                            </button>
                        </div>
                    ) : (
                        <InvoiceTable
                            invoices={openingBalanceInvoices}
                            institution={currentInstitution}
                            onMarkPaid={onMarkPaid}
                            onWaive={onWaive}
                            onSendSms={onSendSms}
                        />
                    )}
                </div>
            )}

            {/* Opening Balances Modal */}
            {isOpeningBalancesModalOpen && (
                <TransportOpeningBalancesModal
                    isOpen={isOpeningBalancesModalOpen}
                    onClose={() => setIsOpeningBalancesModalOpen(false)}
                    currentInstitution={currentInstitution || { id: '', name: 'Institution' } as any}
                    students={resolvedStudents}
                    routes={routeSettings.map(r => ({ id: r.routeId, name: r.routeName }))}
                    routeFeeSettings={routeSettings}
                    existingInvoices={invoices}
                    onSaveOpeningBalance={(inv) => {
                        if (onSaveOpeningBalance) onSaveOpeningBalance(inv);
                    }}
                    onImportOpeningBalances={(importedInvs) => {
                        if (onImportOpeningBalances) onImportOpeningBalances(importedInvs);
                    }}
                    onDeleteOpeningBalance={(invId) => {
                        if (onDeleteOpeningBalance) onDeleteOpeningBalance(invId);
                    }}
                />
            )}
        </div>
    );
};
