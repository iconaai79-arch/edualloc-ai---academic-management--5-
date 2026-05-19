
import React, { useState } from 'react';
import { CarInvoice, CarPayment, User } from '../../types';
import { XIcon } from '../icons/XIcon';
import { CurrencyIcon } from '../icons/CurrencyIcon';
import { CreditCardIcon } from '../icons/CreditCardIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { apiService } from '../../services/apiService';

interface RecordCarPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<CarPayment>) => Promise<void>;
    invoice: CarInvoice | null;
    currentUser: User;
}

export const RecordCarPaymentModal: React.FC<RecordCarPaymentModalProps> = ({ isOpen, onClose, onSave, invoice, currentUser }) => {
    const [formData, setFormData] = useState<Partial<CarPayment>>({
        amount: invoice ? Math.min(100000, invoice.balanceAmount) : 0,
        paymentMethod: 'Bank Transfer',
        transactionReference: '',
        notes: ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [stkPhone, setStkPhone] = useState(invoice ? (invoice.clientPhone || '') : '');
    const [isStkPushing, setIsStkPushing] = useState(false);
    const [stkStatus, setStkStatus] = useState<'idle' | 'prompt_sent' | 'completed' | 'failed'>('idle');
    const [stkError, setStkError] = useState<string | null>(null);

    if (!isOpen || !invoice) return null;

    const handleTriggerStkPush = async () => {
        if (!invoice || !formData.amount || !stkPhone) return;
        setIsStkPushing(true);
        setStkStatus('idle');
        setStkError(null);
        try {
            const res = await apiService.triggerMpesaStkPush({
                amount: formData.amount,
                phoneNumber: stkPhone,
                reference: invoice.invoiceNumber,
                description: `Car Showroom Invoice ${invoice.invoiceNumber}`,
                institutionId: invoice.institutionId
            });

            if (res.success) {
                setStkStatus('prompt_sent');
                const checkoutRequestId = res.checkoutRequestId || res.requestId;
                if (!checkoutRequestId) {
                    throw new Error("Missing checkout request identifier from gateway.");
                }

                // Poll for status
                let confirmed = false;
                let attempts = 0;
                const maxAttempts = 20; // 20 * 3s = 60s
                
                const checkInterval = setInterval(async () => {
                    attempts++;
                    if (attempts >= maxAttempts && !confirmed) {
                        clearInterval(checkInterval);
                        setIsStkPushing(false);
                        setStkStatus('failed');
                        setStkError("Verification timed out. Please enter the transaction code manually.");
                        return;
                    }

                    try {
                        const statusRes = await apiService.checkPaymentStatus('mpesa', checkoutRequestId);
                        if (statusRes.success && (statusRes.status === 'completed' || statusRes.status === 'Completed' || statusRes.status === 'Success')) {
                            confirmed = true;
                            clearInterval(checkInterval);
                            setFormData(prev => ({
                                ...prev,
                                transactionReference: statusRes.transactionId || checkoutRequestId,
                                notes: prev.notes ? `${prev.notes} (STK Push confirmed)` : 'STK Push payment confirmed.'
                            }));
                            setStkStatus('completed');
                            setIsStkPushing(false);
                        } else if (statusRes.status === 'failed' || statusRes.status === 'Failed') {
                            confirmed = true;
                            clearInterval(checkInterval);
                            setIsStkPushing(false);
                            setStkStatus('failed');
                            setStkError(statusRes.message || "Payment request rejected or failed.");
                        }
                    } catch (err: any) {
                        console.warn("Error polling payment status:", err);
                    }
                }, 3000);
            } else {
                throw new Error(res.message || "Gateway rejected the push request.");
            }
        } catch (err: any) {
            console.error("STK Push error:", err);
            setIsStkPushing(false);
            setStkStatus('failed');
            setStkError(err.message || "Failed to initiate M-Pesa STK push.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({
                ...formData,
                invoiceId: invoice.id,
                receivedBy: currentUser.id
            });
            onClose();
        } catch (error) {
            console.error("Failed to record payment:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in border border-slate-100 dark:border-slate-700">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Record <span className="text-emerald-600">Payment</span></h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Vehicle Installment Tracking</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-100">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 bg-emerald-50/30 dark:bg-emerald-900/10 border-b border-emerald-50 dark:border-emerald-900/20">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[8px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-1">Current Balance</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white italic">KES {invoice.balanceAmount.toLocaleString()}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Invoice</p>
                            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400">#{invoice.invoiceNumber}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Payment Amount (KES)</label>
                        <div className="relative">
                            <CurrencyIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                            <input 
                                required
                                type="number"
                                max={invoice.balanceAmount}
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-lg font-black focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                            />
                        </div>
                        {formData.amount && formData.amount > invoice.balanceAmount && (
                            <p className="text-[9px] font-bold text-red-500 uppercase tracking-tight ml-2">Amount exceeds remaining balance!</p>
                        )}
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Payment Method</label>
                        <div className="relative">
                            <CreditCardIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <select 
                                required
                                value={formData.paymentMethod}
                                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white appearance-none"
                            >
                                <option value="MPESA">M-PESA</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cash">Cash / Cheque</option>
                                <option value="Card">Credit/Debit Card</option>
                            </select>
                        </div>
                    </div>

                    {formData.paymentMethod === 'MPESA' && (
                        <div className="p-5 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block ml-2">M-Pesa STK Push Prompt</label>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <PhoneIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                                    <input 
                                        type="tel"
                                        placeholder="e.g. 254711111111"
                                        value={stkPhone}
                                        onChange={(e) => setStkPhone(e.target.value)}
                                        className="w-full pl-14 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleTriggerStkPush}
                                    disabled={isStkPushing || !stkPhone || !formData.amount}
                                    className="px-6 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-200 dark:shadow-none flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-sans font-bold"
                                >
                                    {isStkPushing ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
                                    {isStkPushing ? 'Pushing...' : 'Send STK Push'}
                                </button>
                            </div>
                            {stkStatus === 'prompt_sent' && (
                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-tight ml-2 animate-pulse">STK Prompt dispatched to phone. Please check and enter pin...</p>
                            )}
                            {stkStatus === 'completed' && (
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight ml-2">STK Push verified and filled automatically! ✅</p>
                            )}
                            {stkStatus === 'failed' && stkError && (
                                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight ml-2">{stkError}</p>
                            )}
                        </div>
                    )}

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Transaction Reference</label>
                        <input 
                            required
                            type="text"
                            placeholder="e.g. QWE123RTY"
                            value={formData.transactionReference}
                            onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white uppercase tracking-widest"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Payment Notes</label>
                        <textarea 
                            rows={2}
                            placeholder="Optional details..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                        ></textarea>
                    </div>
                </form>

                <div className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-50 dark:border-slate-700 flex gap-4">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-5 bg-white dark:bg-slate-800 text-slate-500 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={isSaving || !formData.amount || !formData.transactionReference || (formData.amount > invoice.balanceAmount)}
                        className="flex-[2] py-5 bg-emerald-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Processing...' : 'Confirm Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
};
