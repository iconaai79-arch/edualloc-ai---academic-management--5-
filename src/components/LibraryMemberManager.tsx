
import React, { useState, useEffect, useMemo } from 'react';
import type { User, LibraryTransaction, LibraryFine, Book } from '../types';
import {
    SearchIcon, UserIcon, BookOpenIcon, ClockIcon,
    CurrencyIcon, ArrowPathIcon, ChevronRightIcon, XIcon,
    CheckCircleIcon
} from './icons/index';
import { apiService } from '../services/apiService';

interface LibraryMemberManagerProps {
    institutionId: string;
    users: User[];
    onLogAction: (action: string) => Promise<void>;
}

export const LibraryMemberManager: React.FC<LibraryMemberManagerProps> = ({
    institutionId,
    users,
    onLogAction
}) => {
    const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
    const [fines, setFines] = useState<LibraryFine[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMember, setSelectedMember] = useState<User | null>(null);

    useEffect(() => {
        loadData();
    }, [institutionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [transData, finesData, booksData] = await Promise.all([
                apiService.fetchModuleRecords<LibraryTransaction>('library_transactions', institutionId),
                apiService.fetchModuleRecords<LibraryFine>('library_fines', institutionId),
                apiService.fetchModuleRecords<Book>('books', institutionId)
            ]);
            setTransactions(transData);
            setFines(finesData);
            setBooks(booksData);
        } catch (error) {
            console.error('Error loading member management data:', error);
        } finally {
            setLoading(false);
        }
    };

    const members = useMemo(() => {
        const eligibleUsers = users.filter(u => u.role !== 'super_admin');

        return eligibleUsers.map(user => {
            const userTrans = transactions.filter(t => t.userId === user.id);
            const userFines = fines.filter(f => f.userId === user.id);

            return {
                ...user,
                activeLoans: userTrans.filter(t => t.status === 'issued' || t.status === 'overdue').length,
                overdueCount: userTrans.filter(t => t.status === 'overdue').length,
                totalFines: userFines.reduce((acc, f) => acc + (f.amount - f.paidAmount), 0)
            };
        }).filter(u =>
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.staffId && u.staffId.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [users, transactions, fines, searchTerm]);

    const handleClearFine = async (fine: LibraryFine) => {
        if (!confirm(`Confirm full payment of KES ${fine.amount - fine.paidAmount}?`)) return;

        try {
            await apiService.saveModuleRecord('library_fines', {
                ...fine,
                paidAmount: fine.amount,
                status: 'paid',
                updatedAt: new Date().toISOString()
            });
            await onLogAction(`Cleared fine for user ${fine.userId}`);
            loadData();
        } catch (error) {
            alert('Failed to clear fine.');
        }
    };

    const getBookTitle = (id: string) => books.find(b => b.id === id)?.title || 'Unknown Resource';

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Member Registry...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Search Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex-1 max-w-xl relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search Members by Name or Registration ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-xs font-black uppercase tracking-tight transition-all"
                    />
                </div>
                <div className="flex gap-4 px-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Members</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white">{members.length}</span>
                    </div>
                </div>
            </div>

            {/* Members Grid/List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map(member => (
                    <div
                        key={member.id}
                        className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => setSelectedMember(member)}
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border border-indigo-100/50 dark:border-indigo-800/50">
                                    {member.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase truncate tracking-tight">{member.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{member.staffId || 'No ID'}</p>
                                    <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-[8px] font-black text-slate-500 rounded-md uppercase tracking-tighter">
                                        {member.role.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                            <ChevronRightIcon className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl text-center border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900 transition-colors">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Loans</p>
                                <p className={`text-sm font-black ${member.activeLoans > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{member.activeLoans}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl text-center border border-transparent hover:border-rose-100 dark:hover:border-rose-900 transition-colors">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Overdue</p>
                                <p className={`text-sm font-black ${member.overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{member.overdueCount}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl text-center border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900 transition-colors">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Dues</p>
                                <p className={`text-sm font-black ${member.totalFines > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{member.totalFines > 0 ? `KES ${member.totalFines.toFixed(0)}` : '0'}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Member Side Profile Detail Drawer/Overlay */}
            {selectedMember && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedMember(null)}>
                    <div
                        className="bg-white dark:bg-slate-800 w-full max-w-2xl h-full rounded-[3rem] shadow-2xl border-l border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col animate-slide-left"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 bg-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="relative z-10 flex items-center gap-6">
                                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center font-black text-3xl">
                                    {selectedMember.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{selectedMember.name}</h3>
                                    <p className="text-sm font-bold text-indigo-100 uppercase tracking-widest mt-2">Member Reference: {selectedMember.staffId || 'N/A'}</p>
                                    <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mt-1">{selectedMember.role.replace('_', ' ')} Registry</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedMember(null)} className="p-3 bg-white/10 hover:bg-white/30 rounded-2xl transition-all relative z-10">
                                <XIcon className="w-6 h-6" />
                            </button>
                            <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                                <UserIcon className="w-48 h-48" />
                            </div>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3 mb-2">
                                        <BookOpenIcon className="w-4 h-4 text-indigo-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lifetime Borrowed</span>
                                    </div>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                                        {transactions.filter(t => t.userId === selectedMember.id).length} Books
                                    </p>
                                </div>
                                <div className="p-6 bg-rose-50 dark:bg-rose-900/10 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/30">
                                    <div className="flex items-center gap-3 mb-2">
                                        <CurrencyIcon className="w-4 h-4 text-rose-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Total Indebtedness</span>
                                    </div>
                                    <p className="text-2xl font-black text-rose-600">
                                        KES {fines.filter(f => f.userId === selectedMember.id && f.status !== 'paid').reduce((acc, f) => acc + (f.amount - f.paidAmount), 0).toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            {/* Active Transactions */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    Active Loans In-Progress
                                </h4>
                                <div className="space-y-3">
                                    {transactions.filter(t => t.userId === selectedMember.id && (t.status === 'issued' || t.status === 'overdue')).map((t, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-indigo-500/50 transition-all shadow-sm">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-indigo-600">
                                                    <BookOpenIcon className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{getBookTitle(t.bookId)}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Expected Return: {new Date(t.dueDate).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-full tracking-widest ${t.status === 'overdue' ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {t.status}
                                            </span>
                                        </div>
                                    ))}
                                    {transactions.filter(t => t.userId === selectedMember.id && (t.status === 'issued' || t.status === 'overdue')).length === 0 && (
                                        <div className="py-10 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-700">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">No Active Loans Found</p>
                                            <p className="text-[9px] font-bold text-slate-300 uppercase">Current Inventory Posession: Zero</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Outstanding Fines */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                                    <CurrencyIcon className="w-3.5 h-3.5" />
                                    Outstanding Financial Liabilities
                                </h4>
                                <div className="space-y-3">
                                    {fines.filter(f => f.userId === selectedMember.id && f.status !== 'paid').map((f, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl group hover:border-emerald-500/50 transition-all shadow-sm">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600">
                                                    <CurrencyIcon className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{f.description}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        Total Due: <span className="text-rose-600 font-black">KES {(f.amount - f.paidAmount).toFixed(2)}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleClearFine(f)}
                                                className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-100 dark:shadow-none"
                                            >
                                                Clear Full Due
                                            </button>
                                        </div>
                                    ))}
                                    {fines.filter(f => f.userId === selectedMember.id && f.status !== 'paid').length === 0 && (
                                        <div className="py-10 text-center bg-emerald-50/30 dark:bg-emerald-900/10 rounded-3xl border-2 border-dashed border-emerald-100/50 dark:border-emerald-900/30">
                                            <CheckCircleIcon className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Account is Clean</p>
                                            <p className="text-[9px] font-bold text-emerald-400 uppercase">No active fines found in registry</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer Actions */}
                        <div className="p-8 border-t border-slate-50 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                            <button onClick={() => setSelectedMember(null)} className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 transition-all">Close Profile View</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .animate-slide-left { animation: slide-left 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
};
