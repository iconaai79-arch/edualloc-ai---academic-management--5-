
import React, { useState, useEffect, useMemo } from 'react';
import type {
    Book, LibraryTransaction, LibraryFine, User,
    Department, v_library_statistics
} from '../types';
import {
    BarChart3Icon, ClipboardListIcon, DownloadIcon, UserIcon,
    BookOpenIcon, ArrowPathIcon, ChartPieIcon, ArrowTrendingUpIcon,
    SearchIcon, PrinterIcon,
    CheckCircleIcon, XCircleIcon, ClockIcon, ChartBarIcon,
    ArrowRightIcon
} from './icons/index';
import { apiService } from '../services/apiService';

interface LibraryReportsProps {
    institutionId: string;
    users: User[];
    departments: Department[];
    onLogAction: (action: string) => Promise<void>;
}

export const LibraryReports: React.FC<LibraryReportsProps> = ({
    institutionId,
    users,
    departments,
    onLogAction
}) => {
    const [books, setBooks] = useState<Book[]>([]);
    const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
    const [fines, setFines] = useState<LibraryFine[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchUserTerm, setSearchUserTerm] = useState('');
    const [selectedStatementUser, setSelectedStatementUser] = useState<User | null>(null);

    useEffect(() => {
        loadData();
    }, [institutionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [booksData, transData, finesData] = await Promise.all([
                apiService.fetchModuleRecords<Book>('books', institutionId),
                apiService.fetchModuleRecords<LibraryTransaction>('library_transactions', institutionId),
                apiService.fetchModuleRecords<LibraryFine>('library_fines', institutionId)
            ]);
            setBooks(booksData);
            setTransactions(transData);
            setFines(finesData);
        } catch (error) {
            console.error('Error loading report data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Analytics Logic
    const analytics = useMemo(() => {
        const topBorrowed = books.map(b => ({
            ...b,
            borrowCount: transactions.filter(t => t.bookId === b.id).length
        })).sort((a, b) => b.borrowCount - a.borrowCount).slice(0, 5);

        const categoryCounts = books.reduce((acc: any, b) => {
            acc[b.category] = (acc[b.category] || 0) + b.quantity;
            return acc;
        }, {});

        const overdueCount = transactions.filter(t => t.status === 'issued' && new Date(t.dueDate) < new Date()).length;
        const totalFineAmount = fines.reduce((acc, f) => acc + f.amount, 0);
        const collectedFineAmount = fines.reduce((acc, f) => acc + f.paidAmount, 0);

        return { topBorrowed, categoryCounts, overdueCount, totalFineAmount, collectedFineAmount };
    }, [books, transactions, fines]);

    const filteredUsers = useMemo(() => {
        if (!searchUserTerm) return [];
        return users.filter(u =>
            u.name.toLowerCase().includes(searchUserTerm.toLowerCase()) ||
            u.staffId?.toLowerCase().includes(searchUserTerm.toLowerCase())
        ).slice(0, 5);
    }, [users, searchUserTerm]);

    const userStatementData = useMemo(() => {
        if (!selectedStatementUser) return null;
        const userTrans = transactions.filter(t => t.userId === selectedStatementUser.id);
        const userFines = fines.filter(f => f.userId === selectedStatementUser.id);
        return { transactions: userTrans, fines: userFines };
    }, [selectedStatementUser, transactions, fines]);

    const handlePrintStatement = () => {
        if (!selectedStatementUser) return;
        alert(`Generating Official Library Statement for ${selectedStatementUser.name}. This would trigger a high-fidelity PDF print job.`);
        onLogAction(`Generated Library Statement for ${selectedStatementUser.name}`);
    };

    const getBookTitle = (id: string) => books.find(b => b.id === id)?.title || 'Unknown Resource';

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Analytics Dashboard Segment */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-sm min-h-[400px]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Trend Intelligence</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Resource Utilization & Engagement</p>
                            </div>
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl">
                                <ChartBarIcon className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Top Borrowed */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">High Demand Catalog</h4>
                                <div className="space-y-4">
                                    {analytics.topBorrowed.map((book, idx) => (
                                        <div key={idx} className="flex items-center gap-4">
                                            <div className="text-lg font-black text-slate-200 w-6">0{idx + 1}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{book.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500 rounded-full"
                                                            style={{ width: `${(book.borrowCount / (analytics.topBorrowed[0]?.borrowCount || 1)) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] font-black text-indigo-600 uppercase whitespace-nowrap">{book.borrowCount} Loans</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Category Mix */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Inventory Composition</h4>
                                <div className="space-y-3">
                                    {Object.entries(analytics.categoryCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([cat, count]: any, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-indigo-500' : idx === 1 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{cat}</span>
                                            </div>
                                            <span className="text-xs font-black text-slate-900 dark:text-white">{count} Units</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-xl shadow-emerald-100 dark:shadow-none">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100 opacity-60 mb-2">Total Fine Revenue</p>
                        <p className="text-3xl font-black tracking-tighter mb-4">KES {analytics.collectedFineAmount.toFixed(2)}</p>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-bold text-emerald-100 uppercase">Outstanding</p>
                                <p className="text-sm font-black text-white">KES {(analytics.totalFineAmount - analytics.collectedFineAmount).toFixed(2)}</p>
                            </div>
                            <div className="p-2 bg-white/20 rounded-lg">
                                <ArrowTrendingUpIcon className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h4 className="text-sm font-black uppercase tracking-tight mb-6">Issue Health</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Loans</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white">{transactions.filter(t => t.status === 'issued').length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-rose-500">Total Delays</span>
                                <span className="text-xs font-black text-rose-600">{analytics.overdueCount}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden mt-4">
                                <div
                                    className="h-full bg-rose-500"
                                    style={{ width: `${(analytics.overdueCount / (transactions.length || 1)) * 100}%` }}
                                />
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase text-center mt-2">Delay Ratio: {((analytics.overdueCount / (transactions.length || 1)) * 100).toFixed(1)}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statement Generation Segment */}
            <div className="bg-white dark:bg-slate-800 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-10 lg:p-14">
                    <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Member Financial & Activity Statements</h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed uppercase tracking-wide">Enter member details to compile a comprehensive history of borrowed resources, returned items, and outstanding financial liabilities.</p>

                        <div className="relative max-w-xl mx-auto mt-8">
                            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by Student Name or Staff ID..."
                                value={searchUserTerm}
                                onChange={(e) => setSearchUserTerm(e.target.value)}
                                className="w-full pl-16 pr-6 py-6 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-3xl text-sm font-black transition-all shadow-sm"
                            />
                            {/* Search Results Dropdown */}
                            {filteredUsers.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-fade-in">
                                    {filteredUsers.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => { setSelectedStatementUser(u); setSearchUserTerm(''); }}
                                            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b last:border-none border-slate-50 dark:border-slate-700"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-black">
                                                    {u.name.charAt(0)}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{u.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.staffId || 'No ID'}</p>
                                                </div>
                                            </div>
                                            <ArrowRightIcon className="w-4 h-4 text-slate-300" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedStatementUser && (
                        <div className="space-y-8 animate-fade-in pt-10 border-t border-slate-100 dark:border-slate-700">
                            {/* User Profile Header */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem]">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm flex items-center justify-center border-2 border-indigo-100 dark:border-slate-700">
                                        <UserIcon className="w-10 h-10 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{selectedStatementUser.name}</h4>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Registry ID: {selectedStatementUser.staffId || 'N/A'}</p>
                                        <div className="flex gap-4 mt-3">
                                            <span className="text-[10px] font-black uppercase text-indigo-600 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-xs border border-indigo-50 dark:border-slate-700">
                                                {userStatementData?.transactions.length || 0} Total History
                                            </span>
                                            <span className="text-[10px] font-black uppercase text-rose-600 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-xs border border-rose-50 dark:border-slate-700">
                                                KES {userStatementData?.fines.reduce((acc, f) => acc + (f.amount - f.paidAmount), 0).toFixed(2)} Total Due
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSelectedStatementUser(null)}
                                        className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 hover:text-indigo-600 transition-all"
                                        title="Clear Selection"
                                    >
                                        <XCircleIcon className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={handlePrintStatement}
                                        className="h-14 px-8 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-xl shadow-indigo-100 dark:shadow-none transition-all hover:translate-y-[-2px]"
                                    >
                                        <PrinterIcon className="w-5 h-5" />
                                        Print Statement
                                    </button>
                                </div>
                            </div>

                            {/* Statement Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                                        <ArrowPathIcon className="w-3.5 h-3.5" />
                                        Borrowing History
                                    </h4>
                                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-900/50">
                                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                                {userStatementData?.transactions.map(t => (
                                                    <tr key={t.id}>
                                                        <td className="px-6 py-4 text-[10px] font-bold text-slate-500">{new Date(t.issueDate).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4 text-[10px] font-black text-slate-900 dark:text-white uppercase">{getBookTitle(t.bookId)}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-[8px] font-black uppercase tracking-widest ${t.status === 'returned' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                                {t.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {userStatementData?.transactions.length === 0 && (
                                                    <tr><td colSpan={3} className="px-6 py-10 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">No activity found</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                                        <ClipboardListIcon className="w-3.5 h-3.5" />
                                        Penalty/Fine Ledger
                                    </h4>
                                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-900/50">
                                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Description</th>
                                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                                    <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Due</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                                {userStatementData?.fines.map(f => (
                                                    <tr key={f.id}>
                                                        <td className="px-6 py-4 text-[10px] font-bold text-slate-500 truncate max-w-[150px]">{f.description}</td>
                                                        <td className="px-6 py-4 text-[10px] font-black text-slate-900 dark:text-white">KES {f.amount.toFixed(2)}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-[10px] font-black ${f.status === 'paid' ? 'text-emerald-500' : 'text-rose-600'}`}>
                                                                KES {(f.amount - f.paidAmount).toFixed(2)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {userStatementData?.fines.length === 0 && (
                                                    <tr><td colSpan={3} className="px-6 py-10 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">No fines issued</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
