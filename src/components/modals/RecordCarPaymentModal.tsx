
import React, { useState } from 'react';
import { CarInvoice, CarPayment, User, CarListing } from '../../types';
import { XIcon } from '../icons/XIcon';
import { CurrencyIcon } from '../icons/CurrencyIcon';
import { CreditCardIcon } from '../icons/CreditCardIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { apiService } from '../../services/apiService';

interface RecordCarPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<CarPayment>) => Promise<void>;
    invoice: CarInvoice | null;
    invoices?: CarInvoice[];
    currentUser: User;
    payment?: CarPayment | null;
}

export const RecordCarPaymentModal: React.FC<RecordCarPaymentModalProps> = ({ isOpen, onClose, onSave, invoice, invoices, currentUser, payment }) => {
    const [selectedInvoice, setSelectedInvoice] = useState<CarInvoice | null>(invoice);
    const [formData, setFormData] = useState<Partial<CarPayment>>({
        amount: invoice ? Math.min(100000, invoice.balanceAmount) : 0,
        paymentMethod: 'MPESA',
        transactionReference: '',
        notes: '',
        paymentDate: new Date().toISOString().split('T')[0]
    });

    const [isSaving, setIsSaving] = useState(false);
    const [stkPhone, setStkPhone] = useState(invoice ? (invoice.clientPhone || '') : '');
    const [isStkPushing, setIsStkPushing] = useState(false);
    const [stkStatus, setStkStatus] = useState<'idle' | 'prompt_sent' | 'completed' | 'failed'>('idle');
    const [stkError, setStkError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [listings, setListings] = useState<CarListing[]>([]);

    React.useEffect(() => {
        const loadListings = async () => {
            try {
                const data = await apiService.fetchCarListings(currentUser?.institutionId, 'all');
                setListings(data || []);
            } catch (err) {
                console.error("Failed to load car listings for payment mapping:", err);
            }
        };
        if (isOpen && currentUser?.institutionId) {
            loadListings();
        }
    }, [isOpen, currentUser?.institutionId]);

    React.useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    React.useEffect(() => {
        if (payment) {
            const inv = invoices?.find(i => i.id === payment.invoiceId) || invoice || null;
            setSelectedInvoice(inv);
            setFormData({
                id: payment.id,
                invoiceId: payment.invoiceId,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
                transactionReference: payment.transactionReference || '',
                notes: payment.notes || '',
                paymentDate: payment.paymentDate ? payment.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0]
            });
            setStkPhone(inv?.clientPhone || '');
        } else {
            setSelectedInvoice(invoice);
            if (invoice) {
                setFormData({
                    amount: Math.min(100000, invoice.balanceAmount),
                    paymentMethod: 'MPESA',
                    transactionReference: '',
                    notes: '',
                    paymentDate: new Date().toISOString().split('T')[0]
                });
                setStkPhone(invoice.clientPhone || '');
            } else {
                setFormData({
                    amount: 0,
                    paymentMethod: 'MPESA',
                    transactionReference: '',
                    notes: '',
                    paymentDate: new Date().toISOString().split('T')[0]
                });
                setStkPhone('');
            }
        }
    }, [invoice, payment, isOpen, invoices]);

    if (!isOpen) return null;

    const handleInvoiceChange = (invoiceId: string) => {
        const inv = invoices?.find(i => i.id === invoiceId) || null;
        setSelectedInvoice(inv);
        if (inv) {
            setFormData(prev => ({
                ...prev,
                amount: Math.min(100000, inv.balanceAmount)
            }));
            setStkPhone(inv.clientPhone || '');
        } else {
            setFormData(prev => ({
                ...prev,
                amount: 0
            }));
            setStkPhone('');
        }
    };

    const handleTriggerStkPush = async () => {
        if (!selectedInvoice || !formData.amount || !stkPhone) return;
        setIsStkPushing(true);
        setStkStatus('idle');
        setStkError(null);
        try {
            const res = await apiService.post('/api/payments/kcb-stk-push', {
                customerMobileNumber: stkPhone,
                transactionAmount: String(formData.amount),
                customerReference: selectedInvoice.invoiceNumber,
                customerName: selectedInvoice.clientName || 'Valued Customer',
                narration: `Payment for Vehicle Invoice ${selectedInvoice.invoiceNumber}`,
                creditAccountIdentifier: selectedInvoice.institutionId,
                config: {}
            });

            if (res.success || res.ResponseCode === '0') {
                setStkStatus('prompt_sent');
                const checkoutRequestId = res.CheckoutRequestID || res.checkoutRequestId || `KCB_CO_${Date.now()}`;
                
                // Save pending transaction to mpesa_transactions so that queryPaymentStatus backend can check it
                await apiService.saveModuleRecord('mpesa_transactions', {
                    id: `txn_${Date.now()}`,
                    transactionId: checkoutRequestId,
                    checkoutRequestId: checkoutRequestId,
                    institutionId: selectedInvoice.institutionId,
                    amount: Number(formData.amount),
                    phoneNumber: stkPhone,
                    payerName: selectedInvoice.clientName || 'Valued Customer',
                    status: 'pending',
                    provider: 'kcb',
                    customer_reference: selectedInvoice.invoiceNumber,
                    customer_name: selectedInvoice.clientName || 'Valued Customer',
                    customer_mobile_number: stkPhone,
                    balance: Number(formData.amount),
                    narration: `Payment for Vehicle Invoice ${selectedInvoice.invoiceNumber}`,
                    credit_account_identifier: selectedInvoice.institutionId,
                    metadata: { 
                        type: 'car_invoice', 
                        invoiceId: selectedInvoice.id,
                        requesterId: 'SYSTEM'
                    },
                    timestamp: new Date().toISOString()
                });

                // Poll for status
                let confirmed = false;
                let attempts = 0;
                const maxAttempts = 24; // 24 * 5s = 120s
                
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
                        const statusRes = await apiService.checkPaymentStatus('kcb', checkoutRequestId);
                        if (statusRes.success && (statusRes.status === 'Completed' || statusRes.status === 'Success' || statusRes.status === 'completed' || statusRes.resultCode === '0')) {
                            confirmed = true;
                            clearInterval(checkInterval);
                            setFormData(prev => ({
                                ...prev,
                                transactionReference: statusRes.transactionId || checkoutRequestId,
                                notes: prev.notes ? `${prev.notes} (STK Push confirmed)` : 'STK Push payment confirmed.'
                            }));
                            setStkStatus('completed');
                            setIsStkPushing(false);
                        } else if (statusRes.status === 'Failed' || statusRes.status === 'failed' || statusRes.resultCode === '1') {
                            confirmed = true;
                            clearInterval(checkInterval);
                            setIsStkPushing(false);
                            setStkStatus('failed');
                            setStkError(statusRes.message || "Payment request rejected or failed.");
                        }
                    } catch (err: any) {
                        console.warn("Error polling payment status:", err);
                    }
                }, 5000);
            } else {
                throw new Error(res.message || "Gateway rejected the push request.");
            }
        } catch (err: any) {
            console.error("STK Push error:", err);
            setIsStkPushing(false);
            setStkStatus('failed');
            setStkError(err.message || "Failed to initiate KCB STK push.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoice) return;
        setIsSaving(true);
        try {
            await onSave({
                ...formData,
                invoiceId: selectedInvoice.id,
                receivedBy: currentUser.id
            });
            onClose();
        } catch (error) {
            console.error("Failed to record payment:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const maxAmount = selectedInvoice 
        ? (payment ? (selectedInvoice.balanceAmount + (payment.amount || 0)) : selectedInvoice.balanceAmount) 
        : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scale-in border border-slate-100 dark:border-slate-700">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">{payment ? 'Edit' : 'Record'} <span className="text-emerald-600">Payment</span></h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Vehicle Installment Tracking</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-100">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 bg-emerald-50/30 dark:bg-emerald-900/10 border-b border-emerald-50 dark:border-emerald-900/20 flex-shrink-0">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[8px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-1">Current Balance</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white italic">KES {selectedInvoice ? selectedInvoice.balanceAmount?.toLocaleString() : '0.00'}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Invoice</p>
                            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400">#{selectedInvoice ? selectedInvoice.invoiceNumber : 'None'}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-grow custom-scrollbar">
                    {/* Invoice Selection Dropdown */}
                    {!invoice && !payment && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Search Invoice</label>
                                <div className="relative">
                                    <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                                    <input 
                                        type="text"
                                        placeholder="Search by Reg No, Client, Invoice or Car Model..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Invoice to Pay</label>
                                <select 
                                    required
                                    value={selectedInvoice?.id || ''}
                                    onChange={(e) => handleInvoiceChange(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                                >
                                    <option value="">Choose an invoice...</option>
                                    {(invoices || [])
                                        .filter(i => i.status !== 'fully_paid')
                                        .filter(i => {
                                            const query = searchQuery.toLowerCase().trim();
                                            if (!query) return true;

                                            const matchesInv = i.invoiceNumber?.toLowerCase().includes(query);
                                            const matchesName = i.clientName?.toLowerCase().includes(query);
                                            
                                            const listing = listings.find(l => l.id === i.listingId);
                                            const matchesReg = i.registrationNumber?.toLowerCase().includes(query) || 
                                                              listing?.registrationNumber?.toLowerCase().includes(query);
                                            const matchesMake = listing?.make?.toLowerCase().includes(query);
                                            const matchesModel = listing?.model?.toLowerCase().includes(query);
                                            const matchesCar = matchesMake || matchesModel;

                                            return matchesInv || matchesName || matchesReg || matchesCar;
                                        })
                                        .map(i => {
                                            const listing = listings.find(l => l.id === i.listingId);
                                            const carDetails = listing ? ` - ${listing.make} ${listing.model} (${listing.year})` : '';
                                            return (
                                                <option key={i.id} value={i.id}>
                                                    {i.invoiceNumber} - {i.clientName}{carDetails} (Bal: KES {i.balanceAmount?.toLocaleString()})
                                                </option>
                                            );
                                        })}
                                </select>
                            </div>
                        </div>
                    )}

                    {selectedInvoice ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Payment Amount (KES)</label>
                                <div className="relative">
                                    <CurrencyIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                                    <input 
                                        required
                                        type="number"
                                        max={maxAmount}
                                        value={formData.amount || ''}
                                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-lg font-black focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                                    />
                                </div>
                                {formData.amount && formData.amount > maxAmount ? (
                                    <p className="text-[9px] font-bold text-red-500 uppercase tracking-tight ml-2">Amount exceeds remaining balance!</p>
                                ) : null}
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

                            {formData.paymentMethod === 'MPESA' && !payment && (
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
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Payment Date</label>
                                <input 
                                    required
                                    type="date"
                                    value={formData.paymentDate}
                                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
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
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Please select an invoice from the dropdown above to load billing details.</p>
                        </div>
                    )}
                </form>

                <div className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-50 dark:border-slate-700 flex gap-4 flex-shrink-0">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-5 bg-white dark:bg-slate-800 text-slate-500 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={isSaving || !selectedInvoice || !formData.amount || !formData.transactionReference || (formData.amount > maxAmount)}
                        className="flex-[2] py-5 bg-emerald-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Processing...' : payment ? 'Save Changes' : 'Confirm Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
};
