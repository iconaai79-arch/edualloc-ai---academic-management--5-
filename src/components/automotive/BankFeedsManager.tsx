import React, { useState, useMemo } from 'react';
import { 
    BankTransaction, 
    CarInvoice, 
    CarPayment, 
    User,
    Institution
} from '../../types';
import { 
    Search, 
    Filter, 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle, 
    ArrowUpRight, 
    ArrowDownLeft,
    Banknote,
    Link as LinkIcon,
    History,
    CreditCard,
    X,
    Trash2
} from 'lucide-react';
import { apiService } from '../../services/apiService';

interface BankFeedsManagerProps {
    transactions: BankTransaction[];
    invoices: CarInvoice[];
    onReconcile: (transactionId: string, invoiceId: string) => void;
    onFetchFeeds: () => void;
    currentUser: User;
    institution: Institution;
}

export const BankFeedsManager: React.FC<BankFeedsManagerProps> = ({
    transactions,
    invoices,
    onReconcile,
    onFetchFeeds,
    currentUser,
    institution
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'reconciled' | 'unreconciled'>('all');
    const [isReconciling, setIsReconciling] = useState(false);
    
    // Manual reconciliation modal states
    const [selectedTransactionForReconcile, setSelectedTransactionForReconcile] = useState<BankTransaction | null>(null);
    const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');

    const filteredTransactions = useMemo(() => {
        const getDetails = (t: BankTransaction) => {
            const linkedInvoice = invoices.find(inv => inv.id === t.linkedInvoiceId || inv.id === (t as any).linked_invoice_id);
            let invoiceNum = linkedInvoice?.invoiceNumber || '';
            
            if (!invoiceNum) {
                const payload = t.payload || {};
                const refStr = String(t.reference || '').toUpperCase();
                const custRef = String(payload.customerReference || payload.accountReference || payload.billReferenceNumber || '').toUpperCase();
                
                const matchingInv = invoices.find(inv => {
                    const invNum = String(inv.invoiceNumber || '').toUpperCase();
                    return (refStr && refStr.includes(invNum)) || (custRef && custRef.includes(invNum));
                });
                if (matchingInv) invoiceNum = matchingInv.invoiceNumber;
            }

            let plate = linkedInvoice?.registrationNumber || '';
            if (!plate) {
                const payload = t.payload || {};
                const refStr = String(t.reference || '').toUpperCase();
                const custRef = String(payload.customerReference || payload.accountReference || payload.billReferenceNumber || '').toUpperCase();
                
                const matchingInv = invoices.find(inv => {
                    const regNum = String(inv.registrationNumber || '').toUpperCase();
                    return regNum && ((refStr && refStr.includes(regNum)) || (custRef && custRef.includes(regNum)));
                });
                if (matchingInv) plate = matchingInv.registrationNumber || '';
            }

            const payload = t.payload || {};
            const narration = payload.description || 
                              payload.narration || 
                              payload.remarks || 
                              '';

            const customerReference = payload.customerReference || 
                                     payload.accountReference || 
                                     payload.billReferenceNumber || 
                                     payload.businessKey || 
                                     (payload.requestPayload?.primaryData?.businessKey) || 
                                     '';

            let customerMobile = payload.customerMobileNumber || 
                                 payload.phoneNumber || 
                                 payload.customer_mobile_number || 
                                 payload.phone || 
                                 '';
            if (!customerMobile) {
                const items = payload.Body?.stkCallback?.CallbackMetadata?.Item || 
                              payload.body?.stkCallback?.CallbackMetadata?.Item ||
                              payload.body?.stkcallback?.CallbackMetadata?.Item ||
                              payload.CallbackMetadata?.Item || 
                              payload.callbackMetadata?.Item ||
                              payload.Body?.stkCallback?.CallbackMetadata?.item ||
                              payload.CallbackMetadata?.item;
                if (Array.isArray(items)) {
                    const phoneItem = items.find(item => {
                        const key = String(item.Name || item.Key || '').toLowerCase();
                        return key === 'phonenumber';
                    });
                    if (phoneItem) customerMobile = String(phoneItem.Value || '');
                }
            }
            if (!customerMobile) {
                const params = payload.ResultParameters?.ResultParameter || 
                               payload.Result?.ResultParameters?.ResultParameter ||
                               payload.Body?.stkCallback?.ResultParameters?.ResultParameter ||
                               payload.stkCallback?.ResultParameters?.ResultParameter;
                if (Array.isArray(params)) {
                    const phoneItem = params.find(item => {
                        const key = String(item.Key || item.Name || '').toLowerCase();
                        return key === 'phonenumber';
                    });
                    if (phoneItem) customerMobile = String(phoneItem.Value || '');
                } else if (params) {
                    const key = String(params.Key || params.Name || '').toLowerCase();
                    if (key === 'phonenumber') customerMobile = String(params.Value || '');
                }
            }

            const requestId = t.id || 
                              payload.checkoutRequestId || 
                              payload.checkoutRequestID || 
                              payload.CheckoutRequestID || 
                              payload.requestId || 
                              payload.transactionId || 
                              payload.transactionID || 
                              (payload.Body?.stkCallback?.CheckoutRequestID) || 
                              (payload.body?.stkCallback?.CheckoutRequestID) || 
                              '';

            return {
                invoiceNum,
                plate,
                narration: String(narration).trim(),
                customerReference: String(customerReference).trim(),
                customerMobile: String(customerMobile).trim(),
                requestId: String(requestId).trim(),
                isLinked: !!linkedInvoice
            };
        };

        return transactions
            .map(t => {
                const normalized = {
                    ...t,
                    transactionDate: t.transactionDate || (t as any).transaction_date || '',
                    senderName: t.senderName || (t as any).sender_name || '',
                    bankName: t.bankName || (t as any).bank_name || '',
                    linkedInvoiceId: t.linkedInvoiceId || (t as any).linked_invoice_id || '',
                    reconciledBy: t.reconciledBy || (t as any).reconciled_by || '',
                    reference: t.reference || '',
                };
                return {
                    ...normalized,
                    details: getDetails(normalized)
                };
            })
            .filter(t => {
                const matchesSearch = 
                    (t.reference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.senderName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.details.invoiceNum || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.details.plate || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.details.narration || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.details.customerMobile || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.details.requestId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.details.customerReference || '').toLowerCase().includes(searchQuery.toLowerCase());
                const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => new Date(b.transactionDate || 0).getTime() - new Date(a.transactionDate || 0).getTime());
    }, [transactions, invoices, searchQuery, statusFilter]);

    const handleAutoReconcile = () => {
        setIsReconciling(true);
        // Simulate a delay for "processing"
        setTimeout(() => {
            transactions.filter(t => t.status === 'unreconciled').forEach(t => {
                // Logic: Match reference with invoice number or registration plate (case-insensitive) and exact amount
                const matchingInvoice = invoices.find(inv => {
                    const refUpper = t.reference.toUpperCase().trim();
                    const invNumUpper = inv.invoiceNumber.toUpperCase().trim();
                    const regNumUpper = inv.registrationNumber ? inv.registrationNumber.toUpperCase().trim() : '';

                    const matchesInvoiceNum = refUpper.includes(invNumUpper) || invNumUpper.includes(refUpper);
                    const matchesRegNum = regNumUpper && (refUpper.includes(regNumUpper) || regNumUpper.includes(refUpper));

                    return (matchesInvoiceNum || matchesRegNum) && 
                           inv.totalAmount === t.amount &&
                           inv.status !== 'fully_paid';
                });

                if (matchingInvoice) {
                    onReconcile(t.id, matchingInvoice.id);
                }
            });
            setIsReconciling(false);
        }, 1500);
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!confirm('Are you sure you want to delete this bank transaction record? This action cannot be undone.')) {
            return;
        }
        try {
            await apiService.deleteModuleRecord('bank_transactions', id);
            onFetchFeeds();
        } catch (error) {
            console.error('Failed to delete bank transaction:', error);
            alert('Failed to delete the bank transaction record. Please try again.');
        }
    };

    const filteredInvoices = useMemo(() => {
        // Show only pending/partially_paid invoices
        const activeInvoices = invoices.filter(inv => inv.status !== 'fully_paid' && inv.status !== 'cancelled');
        if (!invoiceSearchQuery.trim()) return activeInvoices;
        const q = invoiceSearchQuery.toLowerCase();
        return activeInvoices.filter(inv => 
            (inv.invoiceNumber || '').toLowerCase().includes(q) ||
            (inv.clientName || '').toLowerCase().includes(q) ||
            (inv.registrationNumber || '').toLowerCase().includes(q) ||
            (inv.clientEmail || '').toLowerCase().includes(q) ||
            (inv.clientPhone || '').toLowerCase().includes(q)
        );
    }, [invoices, invoiceSearchQuery]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-3">
                        <Banknote className="w-8 h-8 text-indigo-600" />
                        Bank Feeds
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Reconcile bank transactions with showroom invoices</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onFetchFeeds}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 text-indigo-600 ${isReconciling ? 'animate-spin' : ''}`} /> Fetch New Feeds
                    </button>
                    <button 
                        onClick={handleAutoReconcile}
                        disabled={isReconciling}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <CheckCircle2 className="w-4 h-4" /> Run Auto-Match
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Unreconciled</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                        {transactions.filter(t => t.status === 'unreconciled').length}
                    </h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Pending Amount</p>
                    <h3 className="text-2xl font-black text-emerald-600">
                        KES {transactions.filter(t => t.status === 'unreconciled').reduce((sum, t) => sum + t.amount, 0)?.toLocaleString()}
                    </h3>
                </div>
                <div className="md:col-span-2 bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Search by reference or sender..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white outline-none"
                        />
                    </div>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    >
                        <option value="all">All Status</option>
                        <option value="unreconciled">Unreconciled</option>
                        <option value="reconciled">Reconciled</option>
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1300px]">
                    <thead>
                        <tr className="border-b border-slate-50 dark:border-slate-700">
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Name</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Mobile</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Reference</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Request ID</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Reference</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Narration</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {filteredTransactions.map((transaction) => {
                            return (
                                <tr key={transaction.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="px-6 py-6 text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span>{transaction.transactionDate ? new Date(transaction.transactionDate).toLocaleDateString() : '—'}</span>
                                            {transaction.bankName && (
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                    {transaction.bankName}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-xs font-black text-slate-900 dark:text-white uppercase whitespace-nowrap">
                                        {transaction.senderName || 'External Deposit'}
                                    </td>
                                    <td className="px-6 py-6 text-xs font-medium text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                                        {transaction.details.customerMobile || '—'}
                                    </td>
                                    <td className="px-6 py-6 text-xs font-black text-slate-900 dark:text-white whitespace-nowrap">
                                        KES {transaction.amount?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-6 text-xs font-black text-slate-700 dark:text-slate-300 font-mono whitespace-nowrap">
                                        {transaction.reference || '—'}
                                    </td>
                                    <td className="px-6 py-6 text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap truncate max-w-[150px]" title={transaction.details.requestId}>
                                        {transaction.details.requestId || '—'}
                                    </td>
                                    <td className="px-6 py-6 text-xs font-semibold text-slate-900 dark:text-white">
                                        <div className="space-y-1">
                                            <span>{transaction.details.customerReference || '—'}</span>
                                            <div className="flex flex-wrap gap-1">
                                                {transaction.details.invoiceNum && (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                        transaction.details.isLinked 
                                                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20' 
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                                                    }`}>
                                                        <LinkIcon className="w-2.5 h-2.5" />
                                                        Invoice: {transaction.details.invoiceNum}
                                                    </span>
                                                )}
                                                {transaction.details.plate && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 dark:bg-amber-950/20">
                                                        Plate: {transaction.details.plate}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-xs text-slate-500 dark:text-slate-400 font-medium italic max-w-[200px] truncate" title={transaction.details.narration}>
                                        {transaction.details.narration ? `"${transaction.details.narration}"` : '—'}
                                    </td>
                                    <td className="px-6 py-6 whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                            transaction.status === 'reconciled' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                        }`}>
                                            {transaction.status === 'reconciled' ? (
                                                <CheckCircle2 className="w-3 h-3" />
                                            ) : (
                                                <AlertCircle className="w-3 h-3" />
                                            )}
                                            {transaction.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-3">
                                            {transaction.status === 'unreconciled' ? (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedTransactionForReconcile(transaction);
                                                        setInvoiceSearchQuery('');
                                                    }}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 dark:shadow-none"
                                                >
                                                    Manual Reconcile
                                                </button>
                                            ) : (
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    Reconciled By {transaction.reconciledBy || 'System'}
                                                </div>
                                            )}
                                            <button 
                                                onClick={() => handleDeleteTransaction(transaction.id)}
                                                className="p-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all active:scale-90"
                                                title="Delete Transaction Record"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredTransactions.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl">
                                            <Banknote className="w-12 h-12 text-slate-200" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">No transactions found</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Manual Reconciliation Modal */}
            {selectedTransactionForReconcile && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in" 
                    onClick={() => setSelectedTransactionForReconcile(null)}
                >
                    <div 
                        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Manual Reconciliation</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Select an invoice to reconcile with this transaction</p>
                            </div>
                            <button 
                                onClick={() => setSelectedTransactionForReconcile(null)} 
                                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Transaction Summary Panel */}
                        <div className="p-8 bg-indigo-50/50 dark:bg-indigo-950/10 border-b border-slate-100 dark:border-slate-800/50 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">Transaction Amount</span>
                                <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                                    KES {selectedTransactionForReconcile.amount?.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">Reference</span>
                                <p className="text-sm font-black text-slate-700 dark:text-slate-300 font-mono mt-0.5">
                                    {selectedTransactionForReconcile.reference}
                                </p>
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">Sender & Date</span>
                                <p className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight mt-0.5">
                                    {selectedTransactionForReconcile.senderName || 'External Deposit'}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                    {new Date(selectedTransactionForReconcile.transactionDate).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        {/* Invoices List Section */}
                        <div className="p-8 flex flex-col">
                            {/* Search / Filter bar */}
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="Search invoices by invoice number, customer name, or registration plate..."
                                    value={invoiceSearchQuery}
                                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white outline-none"
                                />
                            </div>

                            {/* Invoices Scroll Area */}
                            <div className="overflow-y-auto pr-2 space-y-4 max-h-[300px] no-scrollbar">
                                {filteredInvoices.map((inv) => {
                                    const isExactAmount = inv.balanceAmount === selectedTransactionForReconcile.amount || inv.totalAmount === selectedTransactionForReconcile.amount;
                                    const hasMatchingRef = 
                                        selectedTransactionForReconcile.reference.toUpperCase().includes(inv.invoiceNumber.toUpperCase()) ||
                                        (inv.registrationNumber && selectedTransactionForReconcile.reference.toUpperCase().includes(inv.registrationNumber.toUpperCase()));

                                    return (
                                        <div 
                                            key={inv.id} 
                                            className={`p-6 bg-white dark:bg-slate-900 border-2 rounded-3xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-lg ${
                                                isExactAmount && hasMatchingRef 
                                                ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/5' 
                                                : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="space-y-3 flex-1">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white font-mono">
                                                        #{inv.invoiceNumber}
                                                    </h4>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                        inv.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                                                    }`}>
                                                        {inv.status.replace('_', ' ')}
                                                    </span>
                                                    {isExactAmount && (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600">
                                                            Exact Amount Match
                                                        </span>
                                                    )}
                                                    {hasMatchingRef && (
                                                        <span className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600">
                                                            Ref Match
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{inv.clientName}</p>
                                                    </div>
                                                    {inv.registrationNumber && (
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reg Number</p>
                                                            <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{inv.registrationNumber}</p>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Amount</p>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">KES {inv.totalAmount?.toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Remaining Balance</p>
                                                        <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5">KES {inv.balanceAmount?.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <button 
                                                    onClick={() => {
                                                        onReconcile(selectedTransactionForReconcile.id, inv.id);
                                                        setSelectedTransactionForReconcile(null);
                                                    }}
                                                    className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-100 dark:shadow-none"
                                                >
                                                    Select & Reconcile
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredInvoices.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-full mb-3">
                                            <Search className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">No matching invoices found</p>
                                        <p className="text-xs text-slate-500 mt-1 max-w-xs">Try searching for other invoice numbers or check client details.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
