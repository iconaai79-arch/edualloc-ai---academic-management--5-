
import React, { useState, useMemo } from 'react';
import { CarInvoice, CarPayment, CarListing } from '../../types';
import { 
    CreditCard, 
    ArrowLeftRight, 
    FileText, 
    CheckCircle, 
    XCircle,
    Search,
    Download,
    Printer,
    Coins,
    Plus,
    CalendarDays,
    Send,
    Link,
    Smartphone,
    Sparkles,
    Copy
} from 'lucide-react';

interface CarSalesLedgerProps {
    invoices: CarInvoice[];
    payments: CarPayment[];
    listings: CarListing[];
    onAddInvoice: () => void;
    onAddPayment: (invoice?: CarInvoice) => void;
    onPrintInvoice: (invoice: CarInvoice) => void;
    onPrintReceipt: (payment: CarPayment) => void;
    onPrintAgreement?: (invoice: CarInvoice) => void;
}

export const CarSalesLedger: React.FC<CarSalesLedgerProps> = ({
    invoices,
    payments,
    listings,
    onAddInvoice,
    onAddPayment,
    onPrintInvoice,
    onPrintReceipt,
    onPrintAgreement
}) => {
    const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
    const [searchQuery, setSearchQuery] = useState('');
    const [showStkModal, setShowStkModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<CarInvoice | null>(null);
    const [stkPhone, setStkPhone] = useState('');
    const [stkAmount, setStkAmount] = useState('');
    const [stkLoading, setStkLoading] = useState(false);
    const [stkStatus, setStkStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
    const [stkMessage, setStkMessage] = useState('');

    const filteredInvoices = invoices.filter(inv => 
        inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredPayments = payments.filter(pay => 
        pay.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        pay.invoiceId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = useMemo(() => {
        const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalCollected = payments.reduce((sum, pay) => sum + pay.amount, 0);
        const outstanding = totalSales - totalCollected;
        return { totalSales, totalCollected, outstanding };
    }, [invoices, payments]);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Ledger Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-indigo-600">
                            <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Sales Value</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">KES {stats.totalSales.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">{invoices.length} Invoices Generated</p>
                </div>
                <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 dark:shadow-none">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Revenue Collected</span>
                    </div>
                    <p className="text-3xl font-black leading-none">KES {stats.totalCollected.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-2">{payments.length} Payments Recorded</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-amber-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-amber-600">
                            <ArrowLeftRight className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Outstanding</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">KES {stats.outstanding.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-2 italic font-black">Requires Follow-up</p>
                </div>
            </div>

            {/* Controls & List */}
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl w-full md:w-auto">
                        <button 
                            onClick={() => setActiveTab('invoices')}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'invoices' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Invoices
                        </button>
                        <button 
                            onClick={() => setActiveTab('payments')}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'payments' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Sales & Revenue
                        </button>
                    </div>

                    <div className="flex flex-grow max-w-md w-full relative group">
                        <input 
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 pl-12 pr-6 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        <Search className="w-4 h-4 absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={onAddInvoice}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> New Invoice
                        </button>
                        <button 
                            onClick={() => onAddPayment()}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Record Payment
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle / Reference</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Financials</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {activeTab === 'invoices' ? (
                                filteredInvoices.map(inv => {
                                    const listing = listings.find(l => l.id === inv.listingId);
                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{inv.clientName}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Invoice #{inv.invoiceNumber}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                                                        <ArrowLeftRight className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase">{listing ? `${listing.year} ${listing.make} ${listing.model}` : 'Special Order'}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{new Date(inv.createdAt || Date.now()).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <p className="text-sm font-black text-slate-900 dark:text-white italic">KES {inv.totalAmount.toLocaleString()}</p>
                                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">Net Payable</p>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    inv.status === 'fully_paid' ? 'bg-emerald-50 text-emerald-600' : 
                                                    inv.status === 'partially_paid' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {inv.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => onPrintInvoice(inv)}
                                                        className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                                                        title="Print Invoice"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                    {onPrintAgreement && (
                                                        <button 
                                                            onClick={() => onPrintAgreement(inv)}
                                                            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-amber-600 transition-all"
                                                            title="Print Agreement"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => {
                                                            const payUrl = `${window.location.origin}/?view=pay-car-invoice&id=${inv.id}`;
                                                            navigator.clipboard.writeText(payUrl);
                                                            alert(`Payment link copied successfully!\n${payUrl}`);
                                                        }}
                                                        className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-emerald-600 transition-all"
                                                        title="Copy Self-Service Payment Link"
                                                    >
                                                        <Link className="w-4 h-4" />
                                                    </button>
                                                    {inv.status !== 'fully_paid' && (
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedInvoice(inv);
                                                                setStkPhone(inv.clientPhone || '');
                                                                setStkAmount(String(inv.balanceAmount || inv.totalAmount - (inv.paidAmount || 0)));
                                                                setShowStkModal(true);
                                                                setStkStatus('idle');
                                                                setStkMessage('');
                                                            }}
                                                            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                                                            title="Send STK Push Prompt"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {inv.status !== 'fully_paid' && (
                                                        <button 
                                                            onClick={() => onAddPayment(inv)}
                                                            className="px-4 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                                                        >
                                                            Pay
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                filteredPayments.map(pay => (
                                    <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{pay.paymentMethod}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reference: {pay.transactionReference || 'CASH'}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-emerald-600">
                                                    <CheckCircle className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase">Settlement #{pay.invoiceId}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{new Date(pay.paymentDate).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className="text-sm font-black text-emerald-600 italic">KES {pay.amount.toLocaleString()}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Confirmed</p>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                                                Completed
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button 
                                                onClick={() => onPrintReceipt(pay)}
                                                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                                                title="Print Receipt"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {(activeTab === 'invoices' ? filteredInvoices : filteredPayments).length === 0 && (
                    <div className="py-24 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50">
                        <Coins className="w-16 h-16 text-slate-200 mb-4" />
                        <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter italic">No records found</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-2">The financial ledger is currently empty</p>
                    </div>
                )}
            </div>

            {/* STK Push Modal */}
            {showStkModal && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[3rem] p-8 border border-slate-100 dark:border-slate-700 shadow-2xl relative animate-scale-up">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600" /> Send Payment Prompt
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">
                            Initiate a real-time KCB/M-Pesa payment prompt to the client's device.
                        </p>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Client Name</label>
                                <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                                    {selectedInvoice.clientName}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Invoice Number / Reference</label>
                                <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                                    {selectedInvoice.invoiceNumber}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Recipient Phone Number</label>
                                <input
                                    type="text"
                                    value={stkPhone}
                                    onChange={(e) => setStkPhone(e.target.value)}
                                    placeholder="e.g. 254711111111"
                                    className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Request Amount (KES)</label>
                                <input
                                    type="number"
                                    value={stkAmount}
                                    onChange={(e) => setStkAmount(e.target.value)}
                                    placeholder="Amount to pay"
                                    className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-white"
                                />
                            </div>

                            {stkStatus !== 'idle' && (
                                <div className={`p-5 rounded-2xl text-xs font-bold ${
                                    stkStatus === 'pending' ? 'bg-indigo-50 text-indigo-700 dark:bg-slate-900 dark:text-indigo-400' :
                                    stkStatus === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-900 dark:text-emerald-400' :
                                    'bg-rose-50 text-rose-700 dark:bg-slate-900 dark:text-rose-400'
                                }`}>
                                    {stkMessage}
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setShowStkModal(false)}
                                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                    disabled={stkLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!stkPhone.trim()) return alert("Please enter a phone number.");
                                        if (!stkAmount || parseFloat(stkAmount) <= 0) return alert("Please enter a valid amount.");
                                        
                                        setStkLoading(true);
                                        setStkStatus('pending');
                                        setStkMessage("Sending payment request to KCB gateway...");
                                        
                                        try {
                                            const { apiService } = await import('../../services/apiService');
                                            
                                            const response = await apiService.post('/api/payments/kcb-stk-push', {
                                                customerMobileNumber: stkPhone,
                                                transactionAmount: stkAmount,
                                                customerReference: selectedInvoice.invoiceNumber,
                                                customerName: selectedInvoice.clientName,
                                                narration: `Payment for Vehicle Invoice ${selectedInvoice.invoiceNumber}`,
                                                creditAccountIdentifier: selectedInvoice.institutionId,
                                                config: {}
                                            });

                                            if (response.success || response.ResponseCode === '0') {
                                                setStkStatus('success');
                                                setStkMessage("Prompt sent! Customer will receive an STK Push on their device.");
                                                
                                                const checkoutRequestId = response.CheckoutRequestID || `KCB_CO_${Date.now()}`;
                                                await apiService.saveModuleRecord('mpesa_transactions', {
                                                    id: `txn_${Date.now()}`,
                                                    transactionId: checkoutRequestId,
                                                    checkoutRequestId: checkoutRequestId,
                                                    institutionId: selectedInvoice.institutionId,
                                                    amount: parseFloat(stkAmount),
                                                    phoneNumber: stkPhone,
                                                    payerName: selectedInvoice.clientName,
                                                    status: 'pending',
                                                    provider: 'kcb',
                                                    customer_reference: selectedInvoice.invoiceNumber,
                                                    customer_name: selectedInvoice.clientName,
                                                    customer_mobile_number: stkPhone,
                                                    balance: parseFloat(stkAmount),
                                                    narration: `Payment for Vehicle Invoice ${selectedInvoice.invoiceNumber}`,
                                                    credit_account_identifier: selectedInvoice.institutionId,
                                                    metadata: { 
                                                        type: 'car_invoice', 
                                                        invoiceId: selectedInvoice.id,
                                                        requesterId: 'SYSTEM'
                                                    },
                                                    timestamp: new Date().toISOString()
                                                });
                                                
                                                setTimeout(() => {
                                                    setShowStkModal(false);
                                                    if (window.location.reload) window.location.reload();
                                                }, 3000);
                                            } else {
                                                setStkStatus('failed');
                                                setStkMessage(response.message || "Failed to trigger payment prompt. Gateway rejected request.");
                                            }
                                        } catch (err: any) {
                                            setStkStatus('failed');
                                            setStkMessage("Gateway connection error: " + (err.message || err));
                                        } finally {
                                            setStkLoading(false);
                                        }
                                    }}
                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                                    disabled={stkLoading}
                                >
                                    {stkLoading ? "Processing..." : "Send Prompt"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
