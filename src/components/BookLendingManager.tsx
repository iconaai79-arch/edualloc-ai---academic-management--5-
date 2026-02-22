
import React, { useState, useEffect, useMemo } from 'react';
import type { Book, User, LibraryTransaction, LibrarySettings } from '../types';
import {
    PlusIcon, SearchIcon, CheckCircleIcon, XIcon, UserIcon,
    BookOpenIcon, ClockIcon, AlertTriangleIcon, ArrowPathIcon,
    CurrencyIcon, QrCodeIcon
} from './icons/index';
import { apiService } from '../services/apiService';

interface BookLendingManagerProps {
    institutionId: string;
    users: User[];
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => void;
}

export const BookLendingManager: React.FC<BookLendingManagerProps> = ({
    institutionId,
    users,
    onLogAction,
    onDataChange
}) => {
    const [books, setBooks] = useState<Book[]>([]);
    const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
    const [settings, setSettings] = useState<LibrarySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isIssuing, setIsIssuing] = useState(false);
    const [scanSearch, setScanSearch] = useState('');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const [newLoan, setNewLoan] = useState({
        userId: '',
        bookId: '',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    useEffect(() => {
        loadData();
    }, [institutionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [booksData, transData, configData] = await Promise.all([
                apiService.fetchModuleRecords<Book>('books', institutionId),
                apiService.fetchModuleRecords<LibraryTransaction>('library_transactions', institutionId),
                apiService.fetchModuleRecords<LibrarySettings>('library_settings', institutionId)
            ]);
            setBooks(booksData);
            setTransactions(transData.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()));
            if (configData.length > 0) setSettings(configData[0]);
        } catch (error) {
            console.error('Error loading circulation data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleIssueBook = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!newLoan.userId || !newLoan.bookId || !newLoan.dueDate) {
            alert('Please select both a member and a book, and set a due date.');
            return;
        }

        if (isProcessing) return;

        const book = books.find(b => b.id === newLoan.bookId);
        if (!book) {
            alert('Selected resource not found in registry.');
            return;
        }

        // Strict Check 1: Check if this user already has an active loan for this EXACT book
        const hasActiveLoan = transactions.some(t =>
            t.userId === newLoan.userId &&
            t.bookId === newLoan.bookId &&
            (t.status === 'issued' || t.status === 'overdue')
        );

        if (hasActiveLoan) {
            alert(`This member already has an active loan for "${book.title}". They must return the current copy before being issued another one.`);
            return;
        }

        // Strict Check 2: Check availability
        if (book.available < 1) {
            alert(`"${book.title}" is currently out of stock. (Total: ${book.quantity}, Available: 0)`);
            return;
        }

        setIsProcessing(true);
        try {
            const transactionId = `ltx_${Date.now()}`;
            // Ensure full ISO strings for consistency
            const issueDate = new Date().toISOString();
            const dueDate = new Date(newLoan.dueDate).toISOString();

            const transaction: LibraryTransaction = {
                id: transactionId,
                bookId: newLoan.bookId,
                userId: newLoan.userId,
                issueDate,
                dueDate,
                status: 'issued',
                institutionId,
                fineAmount: 0
            };

            await apiService.saveModuleRecord('library_transactions', transaction);

            // Deduct from availability - Ensure we pass the full book object with updated available count
            await apiService.saveModuleRecord('books', {
                ...book,
                available: Math.max(0, book.available - 1)
            });

            await onLogAction(`Issued book "${book.title}" to user ${newLoan.userId}`);

            setIsIssuing(false);
            setNewLoan({
                userId: '',
                bookId: '',
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });
            await loadData();
            onDataChange();
        } catch (error: any) {
            console.error('Critical Issuance Error:', error);
            const errorMessage = error.message || 'Unknown database error';
            const details = error.details || '';
            alert(`Failed to process book issuance:\n\n${errorMessage}\n${details}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReturnBook = async (transaction: LibraryTransaction) => {
        const book = books.find(b => b.id === transaction.bookId);
        if (!book) return;

        const isOverdue = new Date(transaction.dueDate) < new Date() && transaction.status !== 'returned';
        let calculatedFine = 0;

        if (isOverdue && settings) {
            const diffTime = Math.abs(new Date().getTime() - new Date(transaction.dueDate).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            calculatedFine = diffDays * settings.overdueFinePerDay;
        }

        if (calculatedFine > 0) {
            if (!confirm(`This book is overdue. A fine of KES ${calculatedFine.toFixed(2)} will be applied. Proceed with return?`)) return;
        } else {
            if (!confirm(`Confirm return for "${book.title}"?`)) return;
        }

        try {
            const returnDate = new Date().toISOString();
            const updatedTransaction: LibraryTransaction = {
                ...transaction,
                status: 'returned',
                returnDate,
                fineAmount: calculatedFine
            };

            await apiService.saveModuleRecord('library_transactions', updatedTransaction);
            await apiService.saveModuleRecord('books', { ...book, available: book.available + 1 });

            if (calculatedFine > 0) {
                // Create a fine record
                const fineId = `fine_${Date.now()}`;
                const now = new Date().toISOString();
                await apiService.saveModuleRecord('library_fines', {
                    id: fineId,
                    transactionId: transaction.id,
                    userId: transaction.userId,
                    amount: calculatedFine,
                    paidAmount: 0,
                    status: 'pending',
                    description: `Overdue return for "${book.title}"`,
                    createdAt: now,
                    updatedAt: now,
                    institutionId
                });
            }

            await onLogAction(`Processed return for "${book.title}" from user ${transaction.userId}`);
            loadData();
            onDataChange();
        } catch (error: any) {
            console.error('Return Processing Error:', error);
            alert(`Error processing return: ${error.message || 'Unknown error'}`);
        }
    };

    const getBookTitle = (id: string) => books.find(b => b.id === id)?.title || 'Unknown Resource';
    const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown User';
    const getUserStaffId = (id: string) => users.find(u => u.id === id)?.staffId || 'N/A';

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header / Stats Wrapper */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Active Issues Table */}
                <div className="flex-grow space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Active Circulation</h3>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Lent items awaiting retrieval</p>
                        </div>
                        <button
                            onClick={() => setIsIssuing(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-[1.5rem] flex items-center gap-3 shadow-lg shadow-emerald-100 transition-all font-black uppercase text-[10px] tracking-widest"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Launch Issuance Registry
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden min-h-[400px]">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Recipient</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Resource</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Issue Context</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Deadline</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                {transactions.filter(t => t.status === 'issued' || t.status === 'overdue').map(transaction => {
                                    const isOverdue = new Date(transaction.dueDate) < new Date();
                                    return (
                                        <tr key={transaction.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg flex items-center justify-center font-black text-xs">
                                                        {getUserName(transaction.userId).charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{getUserName(transaction.userId)}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{getUserStaffId(transaction.userId)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{getBookTitle(transaction.bookId)}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded">
                                                        {books.find(b => b.id === transaction.bookId)?.accessionNumber || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                {new Date(transaction.issueDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className={`flex items-center gap-2 ${isOverdue ? 'text-rose-600' : 'text-slate-600'}`}>
                                                    <ClockIcon className="w-4 h-4" />
                                                    <span className="text-xs font-black uppercase tracking-tight">{new Date(transaction.dueDate).toLocaleDateString()}</span>
                                                    {isOverdue && <span className="text-[8px] px-1.5 py-0.5 bg-rose-50 dark:bg-rose-900/30 rounded-full font-black animate-pulse">OVERDUE</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button
                                                    onClick={() => handleReturnBook(transaction)}
                                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Process Return
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {transactions.filter(t => t.status === 'issued' || t.status === 'overdue').length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">
                                            No active loans found in registry
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar - History & Quick Scan */}
                <div className="lg:w-96 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                                <QrCodeIcon className="w-5 h-5" />
                            </div>
                            <h4 className="font-black uppercase tracking-tight text-sm">Quick Intake</h4>
                        </div>
                        <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">Scan the book QR code or ISBN to instantly pull up return context or issue registry.</p>
                        <div className="relative group mb-4">
                            <input
                                type="text"
                                placeholder="Scan or Enter Accession ID..."
                                value={scanSearch}
                                onChange={(e) => {
                                    const val = e.target.value.toUpperCase();
                                    setScanSearch(val);
                                    const foundBook = books.find(b => b.accessionNumber === val);
                                    if (foundBook) {
                                        setIsIssuing(true);
                                        setNewLoan(prev => ({ ...prev, bookId: foundBook.id }));
                                        setScanSearch('');
                                    }
                                }}
                                className="w-full px-5 py-4 bg-slate-900 border-2 border-indigo-500/30 focus:border-indigo-500 rounded-2xl text-xs font-black text-white uppercase placeholder:text-slate-600 outline-none transition-all"
                            />
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900/10 dark:from-black/40 rounded-[2rem] pointer-events-none" />
                            <div className="aspect-square bg-slate-900 flex flex-col items-center justify-center rounded-[2rem] border-4 border-slate-800 relative z-10 transition-transform group-hover:scale-95 duration-500">
                                <QrCodeIcon className="w-16 h-16 text-indigo-500/40" />
                                <div className="absolute top-4 inset-x-4 h-1 bg-indigo-500/20 animate-scan pointer-events-none" />
                            </div>
                        </div>
                        <button
                            onClick={() => alert("Scanner hardware layer initialization requested. In a live production environment, this would activate the device camera.")}
                            className="w-full mt-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                            Initialize Camera Scanner
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h4 className="font-black uppercase tracking-tight text-sm mb-6 flex items-center justify-between">
                            Recent History
                            <ArrowPathIcon className="w-4 h-4 text-slate-400" />
                        </h4>
                        <div className="space-y-4">
                            {transactions.filter(t => t.status === 'returned').slice(0, 5).map(t => (
                                <div key={t.id} className="flex gap-3">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg h-fit">
                                        <ArrowPathIcon className="w-3 h-3" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">{getBookTitle(t.bookId)}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Returned By {getUserName(t.userId).split(' ')[0]}</p>
                                    </div>
                                    <p className="text-[9px] font-mono text-slate-400 whitespace-nowrap">{new Date(t.returnDate!).toLocaleDateString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Issuance Registry Modal */}
            {isIssuing && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-indigo-600">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                                    Issuance Registry
                                </h3>
                                <p className="text-xs font-bold text-indigo-100 uppercase tracking-[0.2em] mt-1">Lending resource to member</p>
                            </div>
                            <button onClick={() => setIsIssuing(false)} className="p-3 hover:bg-white/20 rounded-2xl transition-all" aria-label="Close">
                                <XIcon className="w-6 h-6 text-white" />
                            </button>
                        </div>
                        <form onSubmit={handleIssueBook} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Member Registry</label>
                                    <select
                                        required
                                        value={newLoan.userId}
                                        onChange={(e) => setNewLoan({ ...newLoan, userId: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">-- Select Student or Staff --</option>
                                        {users.filter(u => u.role !== 'super_admin').map(user => (
                                            <option key={user.id} value={user.id}>{user.name} ({user.staffId || 'No ID'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Catalogued Resource</label>
                                    <select
                                        required
                                        value={newLoan.bookId}
                                        onChange={(e) => setNewLoan({ ...newLoan, bookId: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">-- Select Book --</option>
                                        {books.filter(b => b.available > 0).map(book => (
                                            <option key={book.id} value={book.id}>
                                                [{book.accessionNumber}] {book.title} ({book.available} Available)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Lending Deadline</label>
                                    <input
                                        type="date" required
                                        value={newLoan.dueDate}
                                        onChange={(e) => setNewLoan({ ...newLoan, dueDate: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all"
                                    />
                                </div>
                            </div>
                            <div className="pt-6 flex gap-3">
                                <button type="button" disabled={isProcessing} onClick={() => setIsIssuing(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50">Discard</button>
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-100 dark:shadow-none hover:translate-y-[-2px] disabled:opacity-50 disabled:translate-y-0"
                                >
                                    {isProcessing ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </div>
                                    ) : 'Commit Issuance'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(0); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(300px); opacity: 0; }
                }
                .animate-scan { animation: scan 2s linear infinite; }
            `}</style>
        </div>
    );
};
