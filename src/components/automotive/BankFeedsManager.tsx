
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
    CreditCard
} from 'lucide-react';

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

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = 
                t.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.senderName?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
    }, [transactions, searchQuery, statusFilter]);

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
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Status</option>
                        <option value="unreconciled">Unreconciled</option>
                        <option value="reconciled">Reconciled</option>
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-50 dark:border-slate-700">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Details</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Amount</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Reference</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {filteredTransactions.map((transaction) => {
                            const linkedInvoice = invoices.find(inv => inv.id === transaction.linkedInvoiceId);
                            
                            return (
                                <tr key={transaction.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${transaction.status === 'reconciled' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {transaction.status === 'reconciled' ? <ArrowDownLeft className="w-5 h-5" /> : <History className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                    {transaction.senderName || 'External Deposit'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                    {new Date(transaction.transactionDate).toLocaleDateString()} • {transaction.bankName}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className="text-sm font-black text-slate-900 dark:text-white">
                                            KES {transaction.amount?.toLocaleString()}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-[11px] font-black text-slate-600 dark:text-slate-300 font-mono">
                                            {transaction.reference}
                                        </p>
                                        {linkedInvoice && (
                                            <div className="flex items-center gap-1.5 mt-1 text-indigo-600">
                                                <LinkIcon className="w-3 h-3" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Linked to #{linkedInvoice.invoiceNumber}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
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
                                    <td className="px-8 py-6 text-right">
                                        {transaction.status === 'unreconciled' ? (
                                            <button 
                                                onClick={() => {
                                                    // This would ideally open a modal to select an invoice
                                                    // Prioritize matches that also match reference / registration narration
                                                    const bestMatch = invoices.find(inv => {
                                                        const refUpper = transaction.reference.toUpperCase().trim();
                                                        const invNumUpper = inv.invoiceNumber.toUpperCase().trim();
                                                        const regNumUpper = inv.registrationNumber ? inv.registrationNumber.toUpperCase().trim() : '';

                                                        const matchesInvoiceNum = refUpper.includes(invNumUpper) || invNumUpper.includes(refUpper);
                                                        const matchesRegNum = regNumUpper && (refUpper.includes(regNumUpper) || regNumUpper.includes(refUpper));

                                                        return (matchesInvoiceNum || matchesRegNum) && 
                                                               inv.totalAmount === transaction.amount && 
                                                               inv.status !== 'fully_paid';
                                                    }) || invoices.find(inv => 
                                                        inv.totalAmount === transaction.amount && 
                                                        inv.status !== 'fully_paid'
                                                    );
                                                    if (bestMatch) {
                                                        onReconcile(transaction.id, bestMatch.id);
                                                    } else {
                                                        alert("No automatic match found. Please use the invoice selector (To be implemented).");
                                                    }
                                                }}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                                            >
                                                Manual Reconcile
                                            </button>
                                        ) : (
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                Reconciled By {transaction.reconciledBy || 'System'}
                                            </div>
                                        )}
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
        </div>
    );
};
