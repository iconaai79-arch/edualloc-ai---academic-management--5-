import React, { useState, useMemo } from 'react';
import { 
    BankTransaction, 
    MpesaTransaction,
    DSInvoice, 
    User,
    Institution
} from '../../types';
import { 
    Search, 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle, 
    ArrowDownLeft,
    Banknote,
    Link as LinkIcon,
    History,
    CreditCard,
    Filter
} from 'lucide-react';

interface DSFinanceFeedsProps {
    bankTransactions: BankTransaction[];
    mpesaTransactions: MpesaTransaction[];
    invoices: DSInvoice[];
    onReconcile: (transactionId: string, invoiceId: string, type: 'bank' | 'mpesa') => void;
    onFetchFeeds: () => void;
    currentUser: User;
    institution: Institution;
}

export const DSFinanceFeeds: React.FC<DSFinanceFeedsProps> = ({
    bankTransactions,
    mpesaTransactions,
    invoices,
    onReconcile,
    onFetchFeeds,
    currentUser,
    institution
}) => {
    const [activeFeed, setActiveFeed] = useState<'bank' | 'mpesa'>('mpesa');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'reconciled' | 'unreconciled' | 'completed' | 'pending'>('all');
    const [isReconciling, setIsReconciling] = useState(false);

    const filteredBank = useMemo(() => {
        return (bankTransactions || []).filter(t => {
            const matchesSearch = 
                (t.reference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.senderName || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
    }, [bankTransactions, searchQuery, statusFilter]);

    const filteredMpesa = useMemo(() => {
        return (mpesaTransactions || []).filter(t => {
            const matchesSearch = 
                (t.transactionId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.phoneNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.payerName || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            // Map Mpesa status to reconciliation status for consistency in UI
            const reconStatus = (t.metadata?.reconciled || t.status === 'completed') ? 'reconciled' : 'unreconciled';
            const matchesStatus = statusFilter === 'all' || 
                                 (statusFilter === 'reconciled' && reconStatus === 'reconciled') ||
                                 (statusFilter === 'unreconciled' && reconStatus === 'unreconciled');
            
            return matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [mpesaTransactions, searchQuery, statusFilter]);

    const handleAutoMatch = () => {
        setIsReconciling(true);
        setTimeout(() => {
            if (activeFeed === 'bank') {
                (filteredBank || []).filter(t => t.status === 'unreconciled').forEach(t => {
                    const match = (invoices || []).find(inv => 
                        (t.reference.includes(inv.invoiceNumber) || inv.invoiceNumber.includes(t.reference)) && 
                        inv.totalAmount === t.amount &&
                        inv.status !== 'Fully Paid'
                    );
                    if (match) onReconcile(t.id, match.id, 'bank');
                });
            } else {
                (filteredMpesa || []).filter(t => t.status === 'completed' && !t.metadata?.reconciled).forEach(t => {
                    const match = (invoices || []).find(inv => 
                        (t.description?.includes(inv.invoiceNumber) || inv.invoiceNumber.includes(t.transactionId)) && 
                        inv.totalAmount === t.amount &&
                        inv.status !== 'Fully Paid'
                    );
                    if (match) onReconcile(t.id, match.id, 'mpesa');
                });
            }
            setIsReconciling(false);
        }, 1500);
    };

    const formatDisplayPhone = (raw?: string): string => {
        if (!raw) return '-';
        let clean = String(raw).replace(/[^0-9]/g, '');
        if (clean.startsWith('254') && clean.length === 12) {
            return '0' + clean.slice(3);
        }
        if (clean.length === 9) {
            return '0' + clean;
        }
        return clean || raw;
    };

    const formatPaidOn = (dateStr?: string): string => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (isToday) {
            return timeStr;
        }
        if (diffDays < 7 && diffDays >= 0) {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return `${dayNames[d.getDay()]} ${timeStr}`;
        }
        return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-indigo-600" />
                        Finance <span className="text-indigo-600">Feeds</span>
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">
                        Real-time transaction synchronization & reconciliation
                    </p>
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                    <button 
                        onClick={() => setActiveFeed('mpesa')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeFeed === 'mpesa' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        M-Pesa Gateway
                    </button>
                    <button 
                        onClick={() => setActiveFeed('bank')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeFeed === 'bank' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Bank Statement
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={onFetchFeeds}
                        className="p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-white rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                        title="Fetch New Transactions"
                    >
                        <RefreshCw className={`w-4 h-4 ${isReconciling ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={handleAutoMatch}
                        disabled={isReconciling}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <CheckCircle2 className="w-4 h-4" /> Run Smart-Match
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder={`Search ${activeFeed === 'mpesa' ? 'ID, Name, Phone...' : 'Reference, Sender...'}`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Transactions</option>
                        <option value="unreconciled">Unreconciled</option>
                        <option value="reconciled">Reconciled</option>
                    </select>
                </div>

                <div className="md:col-span-4 bg-indigo-600 p-6 rounded-[2rem] shadow-lg shadow-indigo-600/20 flex justify-between items-center text-white">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Unmatched Volume</p>
                        <h3 className="text-2xl font-black">
                            KES {((activeFeed === 'bank' ? filteredBank : filteredMpesa) || [])
                                .filter(t => (t as any).status === 'unreconciled' || (t as any).status === 'completed')
                                .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)?.toLocaleString()}
                        </h3>
                    </div>
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                        <Banknote className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-[#4b6b82] text-white text-xs font-bold border-b border-slate-300">
                                <th className="px-4 py-3.5 border-r border-white/20 text-left">ID</th>
                                <th className="px-4 py-3.5 border-r border-white/20 text-left">Name</th>
                                <th className="px-4 py-3.5 border-r border-white/20 text-right">Amount</th>
                                <th className="px-4 py-3.5 border-r border-white/20 text-left">Reference</th>
                                <th className="px-4 py-3.5 border-r border-white/20 text-left">Paid By</th>
                                <th className="px-4 py-3.5 border-r border-white/20 text-left">Phone Number</th>
                                <th className="px-4 py-3.5 border-r border-white/20 text-left">Paid On</th>
                                <th className="px-4 py-3.5 border-r border-white/20 text-center">Status</th>
                                <th className="px-4 py-3.5 text-left">Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {(activeFeed === 'bank' ? filteredBank : filteredMpesa).map((t: any) => {
                                const match = (invoices || []).find(inv => 
                                    (t.reference && inv.invoiceNumber && t.reference.includes(inv.invoiceNumber)) ||
                                    (t.linkedInvoiceId && t.linkedInvoiceId === inv.id) ||
                                    (t.metadata?.invoice_id && t.metadata.invoice_id === inv.id) ||
                                    (t.description?.includes(inv.invoiceNumber) || inv.invoiceNumber.includes(t.transactionId)) ||
                                    (inv.totalAmount === t.amount && (t.status === 'reconciled' || t.metadata?.reconciled))
                                );

                                const idVal = (match as any)?.admissionNumber || (match as any)?.studentId?.split('_')[1] || (match as any)?.invoiceNumber || (t.id ? t.id.slice(-4) : '-');
                                const nameVal = (match as any)?.studentName || (activeFeed === 'mpesa' ? t.payerName : t.senderName) || 'Unassigned';
                                const amountVal = (Number(t.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                const refVal = t.reference || t.transactionId;
                                const paidByVal = (activeFeed === 'mpesa' ? t.payerName : t.senderName) || 'Unknown';
                                const phoneVal = formatDisplayPhone(t.phoneNumber || t.payerPhone || (match as any)?.phone);
                                const paidOnVal = formatPaidOn(t.transactionDate || t.timestamp);
                                const isReconciled = t.status === 'reconciled' || t.metadata?.reconciled;
                                const sourceVal = activeFeed === 'bank' 
                                    ? `${t.bankName || 'National Bank'} account [${t.payload?.accountNumber || (institution as any)?.ncbaConfig?.accountNumber || '7700089957'}]`
                                    : `M-Pesa Paybill [${(institution as any)?.mpesaConfig?.shortCode || (institution as any)?.mpesaConfig?.paybillNumber || '522522'}]`;

                                return (
                                    <tr key={t.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono text-xs">{idVal}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 text-xs">{nameVal}</td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200 font-mono text-xs">{amountVal}</td>
                                        <td className="px-4 py-3 font-mono font-medium text-slate-700 dark:text-slate-300 text-xs">{refVal}</td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs">{paidByVal}</td>
                                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 text-xs">{phoneVal}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap text-xs">{paidOnVal}</td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            {isReconciled ? (
                                                <span className="inline-block px-2.5 py-0.5 rounded bg-[#5cb85c] text-white text-[11px] font-bold tracking-wide shadow-sm">
                                                    Reconciled
                                                </span>
                                            ) : (
                                                <button 
                                                    onClick={() => {
                                                        const m = invoices.find(inv => inv.totalAmount === t.amount && inv.status !== 'Fully Paid');
                                                        if (m) {
                                                            onReconcile(t.id, m.id, activeFeed);
                                                        } else {
                                                            alert("No exact amount match found. Manual selection required.");
                                                        }
                                                    }}
                                                    className="inline-block px-2.5 py-0.5 rounded bg-[#f0ad4e] hover:bg-[#ec971f] text-white text-[11px] font-bold tracking-wide shadow-sm transition-all cursor-pointer"
                                                    title="Click to Match"
                                                >
                                                    Pending (Match)
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                                            {sourceVal}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
