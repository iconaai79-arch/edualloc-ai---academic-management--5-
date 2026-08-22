import React, { useState, useMemo } from 'react';
import {
    BankFeedsService,
    BankFeedAccount,
    IngestedTransaction,
    DEFAULT_BANK_FEED_ACCOUNTS
} from '../../services/bankFeedsService';
import {
    ArrowPathIcon,
    BuildingLibraryIcon,
    CheckBadgeIcon,
    CreditCardIcon,
    DevicePhoneMobileIcon,
    ExclamationTriangleIcon,
    PlusIcon,
    SignalIcon,
    SparklesIcon,
    XMarkIcon,
    FunnelIcon,
    DocumentCheckIcon,
    ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

interface BankFeedsManagerProps {
    institution: any;
    students: any[];
    receipts: any[];
    expenses: any[];
    onReceiptCreated?: (newReceipt: any) => void;
    onLogAction?: (msg: string) => void;
}

export const BankFeedsManager: React.FC<BankFeedsManagerProps> = ({
    institution,
    students,
    receipts,
    expenses,
    onReceiptCreated,
    onLogAction
}) => {
    const [accounts, setAccounts] = useState<BankFeedAccount[]>(DEFAULT_BANK_FEED_ACCOUNTS);
    const [transactions, setTransactions] = useState<IngestedTransaction[]>([
        {
            id: 'txn_mpesa_sample_1',
            institutionId: institution.id,
            provider: 'MPESA_DARAJA',
            transactionReference: 'UH92KLP8X2',
            billReferenceNumber: '3175',
            payerName: 'Latricia Kedolwa',
            payerPhone: '0712345678',
            amount: 5000,
            transactionDate: new Date().toISOString().split('T')[0],
            status: 'MATCHED_AND_RECEIPTED',
            matchedStudentId: 'st_1',
            matchedStudentName: 'Latricia Kedolwa',
            matchedStudentAdm: '3175',
            generatedReceiptId: 'rec_sample_1',
            generatedReceiptNumber: 'RCPT-1301',
            reconciliationConfidence: 'EXACT_ADM',
            createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString()
        },
        {
            id: 'txn_coop_sample_2',
            institutionId: institution.id,
            provider: 'COOP_CONNECT',
            transactionReference: 'FT260822009',
            billReferenceNumber: '3031',
            payerName: 'Rodgers Kipchirchir',
            amount: 12500,
            transactionDate: new Date().toISOString().split('T')[0],
            status: 'MATCHED_AND_RECEIPTED',
            matchedStudentId: 'st_2',
            matchedStudentName: 'Rodgers Kipchirchir',
            matchedStudentAdm: '3031',
            generatedReceiptId: 'rec_sample_2',
            generatedReceiptNumber: 'RCPT-1302',
            reconciliationConfidence: 'EXACT_ADM',
            createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString()
        }
    ]);

    const [isSimulating, setIsSimulating] = useState(false);
    const [simTransId, setSimTransId] = useState(`TXN${Math.floor(100000 + Math.random() * 900000)}`);
    const [simAmount, setSimAmount] = useState('4500');
    const [simBillRef, setSimBillRef] = useState(students[0]?.admissionNumber || students[0]?.admission_number || '3175');
    const [simPhone, setSimPhone] = useState('254712345678');
    const [simPayer, setSimPayer] = useState(students[0]?.name || 'Mary Wanjiku');
    const [simProvider, setSimProvider] = useState<'MPESA_DARAJA' | 'EQUITY_JENGA' | 'COOP_CONNECT' | 'KCB_BUNI'>('MPESA_DARAJA');
    const [isProcessingSim, setIsProcessingSim] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'MATCHED' | 'SUSPENSE'>('ALL');
    const [activeTab, setActiveTab] = useState<'live_feed' | 'accounts' | 'reconciliation'>('live_feed');

    // ── Simulate Incoming C2B Webhook ──
    const handleTriggerWebhookSimulation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!simAmount || Number(simAmount) <= 0) {
            alert('Please specify a valid transaction amount.');
            return;
        }

        setIsProcessingSim(true);
        try {
            const res = await BankFeedsService.processIncomingMpesaC2B({
                TransID: simTransId,
                TransAmount: Number(simAmount),
                BillRefNumber: simBillRef,
                MSISDN: simPhone,
                FirstName: simPayer.split(' ')[0] || '',
                LastName: simPayer.split(' ')[1] || '',
                institutionId: institution.id,
                students
            });

            if (res.success) {
                setTransactions(prev => [res.transaction, ...prev]);

                // Update account balance
                setAccounts(prev => prev.map(a => {
                    if (a.provider === simProvider) {
                        return { ...a, balance: a.balance + Number(simAmount), lastSyncedAt: new Date().toISOString() };
                    }
                    return a;
                }));

                if (onReceiptCreated && res.transaction.generatedReceiptId) {
                    onReceiptCreated({
                        id: res.transaction.generatedReceiptId,
                        receiptNumber: res.transaction.generatedReceiptNumber,
                        studentId: res.transaction.matchedStudentId,
                        studentName: res.transaction.matchedStudentName,
                        amountPaid: res.transaction.amount,
                        paymentMethod: 'M-Pesa',
                        paymentDate: res.transaction.transactionDate,
                        relatedTransactionId: res.transaction.transactionReference,
                        remarks: `Automated C2B Ingestion: ${res.transaction.transactionReference}`
                    });
                }

                if (onLogAction) {
                    onLogAction(`Processed live payment feed: ${res.transaction.transactionReference} for KSh ${Number(simAmount).toLocaleString()}`);
                }

                alert(`✓ Webhook Ingestion Successful!\n\n${res.message}`);
                setIsSimulating(false);
                setSimTransId(`TXN${Math.floor(100000 + Math.random() * 900000)}`);
            }
        } catch (err: any) {
            console.error('Webhook simulation failed:', err);
            alert('Webhook simulation failed. Please try again.');
        } finally {
            setIsProcessingSim(false);
        }
    };

    // ── Filtered Transactions ──
    const filteredTxns = useMemo(() => {
        if (filterStatus === 'MATCHED') {
            return transactions.filter(t => t.status === 'MATCHED_AND_RECEIPTED');
        }
        if (filterStatus === 'SUSPENSE') {
            return transactions.filter(t => t.status === 'UNMATCHED_SUSPENSE');
        }
        return transactions;
    }, [transactions, filterStatus]);

    const totalIngestedVolume = useMemo(() => {
        return transactions.reduce((sum, t) => sum + t.amount, 0);
    }, [transactions]);

    const matchedCount = useMemo(() => {
        return transactions.filter(t => t.status === 'MATCHED_AND_RECEIPTED').length;
    }, [transactions]);

    return (
        <div className="space-y-6">
            {/* ── Top Hero Banner ── */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
                <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <SignalIcon className="w-3.5 h-3.5 animate-pulse" /> Live Real-Time Gateway
                            </span>
                            <span className="px-3 py-1 bg-white/10 text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                                M-Pesa Daraja &amp; Multi-Bank APIs
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Direct Banking &amp; Payment Feeds</h2>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
                            Continuous real-time ingestion from M-Pesa C2B, Co-op Bank, Equity Bank, and KCB. Instant $O(1)$ auto-receipting and automatic ledger credits.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsSimulating(true)}
                            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <SparklesIcon className="w-4 h-4" /> Simulate Inflow
                        </button>
                    </div>
                </div>

                {/* KPI Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
                    <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Live Inflows</p>
                        <p className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
                            KSh {totalIngestedVolume.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">{transactions.length} Total Webhook Events</p>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Auto-Matched Rate</p>
                        <p className="text-lg sm:text-xl font-black text-white mt-0.5">
                            {transactions.length > 0 ? Math.round((matchedCount / transactions.length) * 100) : 100}%
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">{matchedCount} Instantly Receipted</p>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Bank Connectors</p>
                        <p className="text-lg sm:text-xl font-black text-indigo-400 mt-0.5">
                            {accounts.filter(a => a.status === 'ACTIVE').length} / {accounts.length}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">M-Pesa, Co-op, Equity, KCB</p>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Suspense Queue</p>
                        <p className="text-lg sm:text-xl font-black text-amber-400 mt-0.5">
                            {transactions.filter(t => t.status === 'UNMATCHED_SUSPENSE').length} Unmatched
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Awaiting Manual Resolution</p>
                    </div>
                </div>
            </div>

            {/* ── Sub-Navigation Tabs ── */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
                {[
                    { id: 'live_feed', label: 'Live Payment Stream', icon: SignalIcon },
                    { id: 'accounts', label: 'Connected Bank Accounts', icon: BuildingLibraryIcon },
                ].map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                active
                                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── TAB 1: LIVE PAYMENT STREAM ── */}
            {activeTab === 'live_feed' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Real-Time Ingestion Stream</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Live events ingested via M-Pesa C2B and bank webhooks</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {(['ALL', 'MATCHED', 'SUSPENSE'] as const).map(st => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setFilterStatus(st)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        filterStatus === st
                                            ? 'bg-emerald-600 text-white shadow-md'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <th className="px-6 py-3.5">Provider · Reference</th>
                                    <th className="px-6 py-3.5">Payer / Account Key</th>
                                    <th className="px-6 py-3.5">Amount</th>
                                    <th className="px-6 py-3.5">Matched Student</th>
                                    <th className="px-6 py-3.5">Receipt #</th>
                                    <th className="px-6 py-3.5 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredTxns.map(txn => (
                                    <tr key={txn.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-2">
                                                {txn.provider === 'MPESA_DARAJA' ? (
                                                    <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                                                        <DevicePhoneMobileIcon className="w-4 h-4" />
                                                    </span>
                                                ) : (
                                                    <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                                                        <BuildingLibraryIcon className="w-4 h-4" />
                                                    </span>
                                                )}
                                                <div>
                                                    <span className="font-mono font-black text-slate-900 dark:text-white block">
                                                        {txn.transactionReference}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · {txn.provider.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{txn.payerName}</span>
                                            <span className="font-mono text-[10px] text-slate-400">
                                                Acc: "{txn.billReferenceNumber || 'None'}" {txn.payerPhone ? `· ${txn.payerPhone}` : ''}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                            KSh {txn.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            {txn.matchedStudentName ? (
                                                <div>
                                                    <span className="font-bold text-slate-900 dark:text-white block">
                                                        {txn.matchedStudentName}
                                                    </span>
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                        ADM {txn.matchedStudentAdm} ({txn.reconciliationConfidence})
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-amber-600 font-bold">
                                                    ⚠ Unmatched (In Suspense)
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            {txn.generatedReceiptNumber ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                    🧾 {txn.generatedReceiptNumber}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">No receipt</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                txn.status === 'MATCHED_AND_RECEIPTED'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                                            }`}>
                                                {txn.status === 'MATCHED_AND_RECEIPTED' ? '✓ Auto-Receipted' : '⚠ Suspense'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── TAB 2: CONNECTED BANK ACCOUNTS ── */}
            {activeTab === 'accounts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {accounts.map(acc => (
                        <div key={acc.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm hover:border-emerald-500/40 transition-all">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        {acc.provider === 'MPESA_DARAJA' ? <DevicePhoneMobileIcon className="w-6 h-6" /> : <BuildingLibraryIcon className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-slate-900 dark:text-white">{acc.accountName}</h4>
                                        <p className="text-xs text-slate-400 font-mono">
                                            {acc.paybillOrTillNumber ? `Paybill: ${acc.paybillOrTillNumber}` : `Acc No: ${acc.accountNumber}`}
                                        </p>
                                    </div>
                                </div>
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    {acc.status}
                                </span>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Real-Time Ledger Balance</p>
                                    <p className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                                        KSh {acc.balance.toLocaleString()}
                                    </p>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                    Last synced: {new Date(acc.lastSyncedAt).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── MODAL: Webhook Simulation Console ── */}
            {isSimulating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <SparklesIcon className="w-5 h-5 text-emerald-500" />
                                    Live Inflow Webhook Simulator
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">Test real-time C2B validation and auto-receipting</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSimulating(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleTriggerWebhookSimulation} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Provider Gateway</label>
                                <select
                                    value={simProvider}
                                    onChange={(e) => setSimProvider(e.target.value as any)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="MPESA_DARAJA">📱 M-Pesa C2B Paybill (522522)</option>
                                    <option value="COOP_CONNECT">🏦 Co-operative Bank Direct Feed</option>
                                    <option value="EQUITY_JENGA">🏦 Equity Bank Jenga API</option>
                                    <option value="KCB_BUNI">🏦 KCB Bank Buni Gateway</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-500 mb-1">Trans Reference Code</label>
                                    <input
                                        type="text"
                                        value={simTransId}
                                        onChange={(e) => setSimTransId(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-500 mb-1">Amount (KSh)</label>
                                    <input
                                        type="number"
                                        value={simAmount}
                                        onChange={(e) => setSimAmount(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 mb-1">Student Admission No. / BillRefNumber</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 3175"
                                    value={simBillRef}
                                    onChange={(e) => setSimBillRef(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">This is the account number entered by the parent on their phone</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-500 mb-1">Payer Name</label>
                                    <input
                                        type="text"
                                        value={simPayer}
                                        onChange={(e) => setSimPayer(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-500 mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={simPhone}
                                        onChange={(e) => setSimPhone(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsSimulating(false)}
                                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isProcessingSim}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                                >
                                    {isProcessingSim ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <SignalIcon className="w-4 h-4" />
                                    )}
                                    <span>Fire Webhook Event</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
