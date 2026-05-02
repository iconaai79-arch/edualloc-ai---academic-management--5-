
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Book, User, LibraryTransaction, LibrarySettings } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { SearchIcon } from './icons/SearchIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { UserIcon } from './icons/UserIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ClockIcon } from './icons/ClockIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { BellIcon } from './icons/BellIcon';
import { EyeIcon } from './icons/EyeIcon';
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
    const [memberSearch, setMemberSearch] = useState('');
    const [bookSearch, setBookSearch] = useState('');
    const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
    const [hasSigned, setHasSigned] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);

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

        const hasActiveLoan = transactions.some(t =>
            t.userId === newLoan.userId &&
            t.bookId === newLoan.bookId &&
            (t.status === 'issued' || t.status === 'overdue')
        );

        if (hasActiveLoan) {
            alert(`This member already has an active loan for "${book.title}". They must return the current copy before being issued another one.`);
            return;
        }

        if (book.available < 1) {
            alert(`"${book.title}" is currently out of stock. (Total: ${book.quantity}, Available: 0)`);
            return;
        }

        setIsProcessing(true);
        try {
            const signatureUrl = hasSigned && signatureCanvasRef.current ? signatureCanvasRef.current.toDataURL('image/png') : undefined;

            const transactionId = `ltx_${Date.now()}`;
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
                fineAmount: 0,
                memberSignature: signatureUrl
            };

            await apiService.saveModuleRecord('library_transactions', transaction);

            await apiService.saveModuleRecord('books', {
                ...book,
                available: Math.max(0, book.available - 1)
            });

            await onLogAction(`Issued book "${book.title}" to user ${newLoan.userId}`);

            setIsIssuing(false);
            setHasSigned(false);
            setNewLoan({
                userId: '',
                bookId: '',
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });
            setMemberSearch('');
            setBookSearch('');
            await loadData();
            onDataChange();
        } catch (error: any) {
            console.error('Critical Issuance Error:', error);
            alert(`Failed to process book issuance: ${error.message || 'Unknown database error'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Signature Pad Logic
    useEffect(() => {
        if (!isIssuing || !signatureCanvasRef.current) return;
        const canvas = signatureCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }

        const getCoords = (e: MouseEvent | TouchEvent) => {
            const rect = canvas.getBoundingClientRect();
            if (e instanceof MouseEvent) return { x: e.clientX - rect.left, y: e.clientY - rect.top };
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        };

        const start = (e: MouseEvent | TouchEvent) => {
            const { x, y } = getCoords(e);
            ctx?.beginPath();
            ctx?.moveTo(x, y);
            setIsDrawing(true);
            setHasSigned(true);
        };

        const move = (e: MouseEvent | TouchEvent) => {
            if (!isDrawing) return;
            const { x, y } = getCoords(e);
            ctx?.lineTo(x, y);
            ctx?.stroke();
        };

        const stop = () => setIsDrawing(false);

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        canvas.addEventListener('mouseup', stop);
        canvas.addEventListener('mouseleave', stop);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        canvas.addEventListener('touchend', stop);

        return () => {
            canvas.removeEventListener('mousedown', start);
            canvas.removeEventListener('mousemove', move);
            canvas.removeEventListener('mouseup', stop);
            canvas.removeEventListener('mouseleave', stop);
            canvas.removeEventListener('touchstart', start);
            canvas.removeEventListener('touchmove', move);
            canvas.removeEventListener('touchend', stop);
        };
    }, [isIssuing, isDrawing]);

    const handleSendReminder = async (transaction: LibraryTransaction) => {
        const user = users.find(u => u.id === transaction.userId);
        const book = books.find(b => b.id === transaction.bookId);

        if (!user || !user.phoneNumber) {
            alert('User contact information missing.');
            return;
        }
        if (!book) return;

        try {
            const res = await apiService.sendLibraryOverdueReminder(
                user.phoneNumber,
                book.title,
                transaction.dueDate,
                institutionId
            );
            if (res.success) {
                alert(`Reminder sent to ${user.name}`);
                await onLogAction(`Sent overdue reminder to ${user.name} for "${book.title}"`);
            } else {
                alert(`Failed to send reminder: ${res.message}`);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleBulkReminders = async () => {
        const overdueLoans = transactions.filter(t => t.status === 'issued' && new Date(t.dueDate) < new Date());

        if (overdueLoans.length === 0) {
            alert('No overdue loans found to send reminders.');
            return;
        }

        if (!confirm(`Send SMS reminders to ${overdueLoans.length} members?`)) return;

        setIsProcessing(true);
        let successCount = 0;

        try {
            for (const loan of overdueLoans) {
                const user = users.find(u => u.id === loan.userId);
                const book = books.find(b => b.id === loan.bookId);

                if (user && user.phoneNumber && book) {
                    const res = await apiService.sendLibraryOverdueReminder(
                        user.phoneNumber,
                        book.title,
                        loan.dueDate,
                        institutionId
                    );
                    if (res.success) successCount++;
                }
            }
            alert(`Bulk reminders process complete. ${successCount} reminders sent.`);
            await onLogAction(`Sent bulk library reminders to ${successCount} members.`);
        } catch (error: any) {
            console.error('Bulk reminders error:', error);
            alert('A critical error occurred during bulk messaging.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReturnBook = async (transaction: LibraryTransaction) => {
        if (!confirm('Process return for this resource?')) return;
        setIsProcessing(true);
        try {
            const book = books.find(b => b.id === transaction.bookId);
            if (book) {
                await apiService.saveModuleRecord('books', {
                    ...book,
                    available: Math.min(book.quantity, book.available + 1)
                });
            }
            await apiService.saveModuleRecord('library_transactions', {
                ...transaction,
                status: 'returned',
                returnDate: new Date().toISOString()
            });
            await onLogAction(`Received return of "${book?.title || 'resource'}" from ${getUserName(transaction.userId)}`);
            loadData();
            onDataChange();
        } catch (error: any) {
            console.error('Return error:', error);
            alert(`Return process failed: ${error.message || 'Database connection error'}`);
        } finally {
            setIsProcessing(false);
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
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleBulkReminders}
                                disabled={isProcessing}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-600 px-5 h-14 rounded-[1.5rem] flex items-center gap-2 transition-all font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
                            >
                                <BellIcon className="w-5 h-5" />
                                Bulk Prompt Overdue
                            </button>
                            <button
                                onClick={() => setIsIssuing(true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 h-14 rounded-[1.5rem] flex items-center gap-3 shadow-lg shadow-emerald-100 transition-all font-black uppercase text-[10px] tracking-widest"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Launch Issuance Registry
                            </button>
                        </div>
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
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleSendReminder(transaction)}
                                                        className={`p-2.5 rounded-xl transition-all ${isOverdue ? 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-200'}`}
                                                        title="Send SMS Reminder"
                                                    >
                                                        <BellIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReturnBook(transaction)}
                                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Process Return
                                                    </button>
                                                    {transaction.memberSignature && (
                                                        <div className="group relative">
                                                            <button className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl" title="View Confirmation Signature">
                                                                <EyeIcon className="w-4 h-4" />
                                                            </button>
                                                            <div className="absolute bottom-full right-0 mb-2 p-2 bg-white dark:bg-slate-800 border rounded-xl shadow-xl hidden group-hover:block z-50">
                                                                <img loading="lazy" src={transaction.memberSignature} className="w-32 h-16 object-contain" alt="Signature" />
                                                                <p className="text-[8px] font-black uppercase text-center text-slate-400 mt-1">Receipt Confirm</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
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
                        <form onSubmit={handleIssueBook} className="p-8 space-y-6 overflow-y-auto max-h-[75vh]">
                            {/* Member Identity Card */}
                            {newLoan.userId && (() => {
                                const member = users.find(u => u.id === newLoan.userId);
                                if (!member) return null;
                                return (
                                    <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 animate-fade-in">
                                        <div className="flex-shrink-0">
                                            {member.profilePhotoUrl ? (
                                                <img loading="lazy"
                                                    src={member.profilePhotoUrl}
                                                    alt={member.name}
                                                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-lg"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-700">
                                                    <span className="text-2xl font-black text-white">{member.name.charAt(0).toUpperCase()}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Member Identified</p>
                                            </div>
                                            <p className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5 truncate">{member.name}</p>
                                            <p className="text-xs font-bold text-slate-500 font-mono">{member.staffId || 'No ID'}</p>
                                            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-0.5">{(member.role || 'Member').replace(/_/g, ' ')}</p>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Member Registry</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search by QR, ID or Name..."
                                            value={memberSearch}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setMemberSearch(val);

                                                // Automatic QR Matching
                                                try {
                                                    const qrData = JSON.parse(val);
                                                    if (qrData.type === 'member' && qrData.id) {
                                                        setNewLoan(prev => ({ ...prev, userId: qrData.id }));
                                                        const foundUser = users.find(u => u.id === qrData.id);
                                                        if (foundUser) setMemberSearch(foundUser.name);
                                                        return;
                                                    }
                                                } catch (e) { }

                                                // Partial Matching for ID or Name
                                                const found = users.find(u =>
                                                    u.staffId?.toLowerCase() === val.toLowerCase() ||
                                                    u.name.toLowerCase() === val.toLowerCase()
                                                );
                                                if (found) setNewLoan(prev => ({ ...prev, userId: found.id }));
                                            }}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all outline-none"
                                        />
                                        <div className="absolute right-4 top-4 text-slate-400">
                                            <SearchIcon className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <select
                                        required
                                        value={newLoan.userId}
                                        onChange={(e) => {
                                            setNewLoan({ ...newLoan, userId: e.target.value });
                                            const u = users.find(user => user.id === e.target.value);
                                            if (u) setMemberSearch(u.name);
                                        }}
                                        className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold mt-2 outline-none border-none"
                                    >
                                        <option value="">-- Or select from list --</option>
                                        {users.filter(u => {
                                            const search = memberSearch.toLowerCase();
                                            return u.role !== 'super_admin' && (
                                                u.name.toLowerCase().includes(search) ||
                                                (u.staffId || '').toLowerCase().includes(search)
                                            );
                                        }).map(user => (
                                            <option key={user.id} value={user.id}>{user.name} ({user.staffId || 'No ID'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Catalogued Resource</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search by Title, Author, ISBN or scan QR/Accession..."
                                            value={bookSearch}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setBookSearch(val);

                                                // QR / Accession exact match (auto-select)
                                                const upper = val.toUpperCase();
                                                const exactAccession = books.find(b => b.accessionNumber === upper);
                                                if (exactAccession) {
                                                    setNewLoan(prev => ({ ...prev, bookId: exactAccession.id }));
                                                    setBookSearch(`[${exactAccession.accessionNumber}] ${exactAccession.title}`);
                                                    return;
                                                }

                                                // Try parsing as QR JSON
                                                try {
                                                    const qrData = JSON.parse(val);
                                                    if (qrData.accessionNumber) {
                                                        const found = books.find(b => b.accessionNumber === qrData.accessionNumber);
                                                        if (found) {
                                                            setNewLoan(prev => ({ ...prev, bookId: found.id }));
                                                            setBookSearch(`[${found.accessionNumber}] ${found.title}`);
                                                        }
                                                    }
                                                } catch (e) { }
                                            }}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all outline-none"
                                        />
                                        <div className="absolute right-4 top-4 text-slate-400">
                                            <SearchIcon className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <select
                                        required
                                        value={newLoan.bookId}
                                        onChange={(e) => {
                                            const book = books.find(b => b.id === e.target.value);
                                            setNewLoan({ ...newLoan, bookId: e.target.value });
                                            if (book) setBookSearch(`[${book.accessionNumber}] ${book.title}`);
                                        }}
                                        className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold mt-2 outline-none border-none"
                                    >
                                        <option value="">-- Or select from list --</option>
                                        {books.filter(b => {
                                            if (b.available < 1) return false;
                                            const search = bookSearch.toLowerCase();
                                            if (!search) return true;
                                            return (
                                                b.title.toLowerCase().includes(search) ||
                                                b.author.toLowerCase().includes(search) ||
                                                (b.isbn || '').toLowerCase().includes(search) ||
                                                (b.accessionNumber || '').toLowerCase().includes(search) ||
                                                (b.category || '').toLowerCase().includes(search)
                                            );
                                        }).map(book => (
                                            <option key={book.id} value={book.id}>
                                                [{book.accessionNumber}] {book.title} — {book.author} ({book.available} avail.)
                                            </option>
                                        ))}
                                    </select>
                                    {/* Book Identity Card */}
                                    {newLoan.bookId && (() => {
                                        const book = books.find(b => b.id === newLoan.bookId);
                                        if (!book) return null;
                                        return (
                                            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800 animate-fade-in">
                                                <div className="w-10 h-12 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow">
                                                    <BookOpenIcon className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{book.title}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 truncate">by {book.author}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[9px] font-black text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{book.accessionNumber}</span>
                                                        <span className="text-[9px] font-black text-emerald-600">{book.available} Available</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
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

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400">Digital Signature</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const ctx = signatureCanvasRef.current?.getContext('2d');
                                                if (ctx && signatureCanvasRef.current) {
                                                    ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
                                                    setHasSigned(false);
                                                }
                                            }}
                                            className="text-[9px] font-black text-indigo-600 hover:underline uppercase"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <canvas
                                        ref={signatureCanvasRef}
                                        width={450}
                                        height={120}
                                        className="w-full h-32 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 touch-none cursor-crosshair"
                                    />
                                    {hasSigned ? (
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                                            <CheckCircleIcon className="w-3 h-3" /> Signature Captured
                                        </p>
                                    ) : (
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Member must sign to confirm receipt</p>
                                    )}
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

