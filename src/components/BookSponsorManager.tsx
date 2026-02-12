
import React, { useState, useEffect } from 'react';
import type { Book, BookStockReceipt, User } from '../types';
import {
    PlusIcon, BuildingOfficeIcon, TrashIcon, ArchiveBoxIcon,
    CalendarIcon, ClipboardListIcon, DownloadIcon, CheckCircleIcon,
    ArrowTrendingUpIcon, ActivityIcon, XIcon
} from './icons/index';
import { apiService } from '../services/apiService';

interface BookSponsorManagerProps {
    institutionId: string;
    users: User[];
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => void;
}

export const BookSponsorManager: React.FC<BookSponsorManagerProps> = ({
    institutionId,
    users,
    onLogAction,
    onDataChange
}) => {
    const [books, setBooks] = useState<Book[]>([]);
    const [receipts, setReceipts] = useState<BookStockReceipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLogging, setIsLogging] = useState(false);

    const [newReceipt, setNewReceipt] = useState<Partial<BookStockReceipt>>({
        bookId: '',
        source: '',
        quantity: 0,
        receiptDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, [institutionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [booksData, receiptsData] = await Promise.all([
                apiService.fetchModuleRecords<Book>('books', institutionId),
                apiService.fetchModuleRecords<BookStockReceipt>('book_stock_receipts', institutionId)
            ]);
            setBooks(booksData);
            setReceipts(receiptsData.sort((a, b) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime()));
        } catch (error) {
            console.error('Error loading sponsors data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        const book = books.find(b => b.id === newReceipt.bookId);
        if (!book) return;

        try {
            const receiptId = `rcpt_${Date.now()}`;
            const receipt: BookStockReceipt = {
                id: receiptId,
                bookId: newReceipt.bookId!,
                source: newReceipt.source!,
                quantity: newReceipt.quantity!,
                receiptDate: newReceipt.receiptDate!,
                notes: newReceipt.notes,
                recordedBy: users.find(u => u.role === 'librarian')?.id || 'admin',
                institutionId
            };

            await apiService.saveModuleRecord('book_stock_receipts', receipt);

            // Automatically update stock in inventory
            await apiService.saveModuleRecord('books', {
                ...book,
                quantity: book.quantity + (newReceipt.quantity || 0),
                available: book.available + (newReceipt.quantity || 0)
            });

            await onLogAction(`Logged intake of ${newReceipt.quantity} copies of "${book.title}" from ${newReceipt.source}`);

            setIsLogging(false);
            setNewReceipt({ bookId: '', source: '', quantity: 0, receiptDate: new Date().toISOString().split('T')[0], notes: '' });
            loadData();
            onDataChange();
        } catch (error) {
            alert('Failed to log book receipt.');
        }
    };

    const getBookTitle = (id: string) => books.find(b => b.id === id)?.title || 'Unknown Resource';

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header / Actions */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="p-6 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-[2rem]">
                        <BuildingOfficeIcon className="w-10 h-10" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">External Inflow Tracking</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                            Auto-Stock Synchronization Enabled
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsLogging(true)}
                    className="btn-primary h-14 px-8 rounded-2xl flex items-center gap-3 shadow-xl shadow-indigo-100 dark:shadow-none"
                >
                    <PlusIcon className="w-5 h-5" />
                    Record New Intake
                </button>
            </div>

            {/* Statistics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Government Supplies</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {receipts.filter(r => r.source === 'Government').reduce((acc, r) => acc + r.quantity, 0)} Units
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Sponsor Donations</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {receipts.filter(r => r.source !== 'Government' && r.source !== 'Purchase').reduce((acc, r) => acc + r.quantity, 0)} Units
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total External Intake</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {receipts.reduce((acc, r) => acc + r.quantity, 0)} Units
                    </p>
                </div>
            </div>

            {/* Inflow Ledger */}
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <ClipboardListIcon className="w-4 h-4" />
                        Inward Stock Ledger
                    </h4>
                    <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">Export Full Ledger</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50">
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date Received</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Source Entity</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Catalog Item</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Units Logged</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {receipts.map(receipt => (
                                <tr key={receipt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-8 py-5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                                        {new Date(receipt.receiptDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{receipt.source}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{getBookTitle(receipt.bookId)}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-black text-indigo-600">+{receipt.quantity} Units</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 text-emerald-500">
                                            <CheckCircleIcon className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Inventoried</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {receipts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">
                                        No external stock intake records found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Log Intake Modal */}
            {isLogging && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-emerald-600">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                                    Inward Log Registry
                                </h3>
                                <p className="text-xs font-bold text-emerald-100 uppercase tracking-[0.2em] mt-1">Accepting resources into storage</p>
                            </div>
                            <button onClick={() => setIsLogging(false)} className="p-3 hover:bg-white/20 rounded-2xl transition-all" aria-label="Close">
                                <XIcon className="w-6 h-6 text-white" />
                            </button>
                        </div>
                        <form onSubmit={handleLogReceipt} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Catalogued Resource</label>
                                    <select
                                        required
                                        value={newReceipt.bookId}
                                        onChange={(e) => setNewReceipt({ ...newReceipt, bookId: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">-- Targeted Catalog Item --</option>
                                        {books.map(book => (
                                            <option key={book.id} value={book.id}>{book.title} (Current: {book.quantity})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Supply Source Entity</label>
                                    <input
                                        type="text" required list="source-list"
                                        value={newReceipt.source}
                                        onChange={(e) => setNewReceipt({ ...newReceipt, source: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all"
                                        placeholder="e.g. Government, Sponsor Name, UNICEF"
                                    />
                                    <datalist id="source-list">
                                        <option value="Government" />
                                        <option value="Sponsor" />
                                        <option value="Internal Purchase" />
                                        <option value="Donation" />
                                    </datalist>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Units Received</label>
                                        <input
                                            type="number" required min="1"
                                            value={newReceipt.quantity}
                                            onChange={(e) => setNewReceipt({ ...newReceipt, quantity: parseInt(e.target.value) })}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Entry Date</label>
                                        <input
                                            type="date" required
                                            value={newReceipt.receiptDate}
                                            onChange={(e) => setNewReceipt({ ...newReceipt, receiptDate: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Internal Reference / Notes</label>
                                    <textarea
                                        rows={2}
                                        value={newReceipt.notes}
                                        onChange={(e) => setNewReceipt({ ...newReceipt, notes: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all resize-none"
                                        placeholder="Add batch numbers or reference codes..."
                                    />
                                </div>
                            </div>
                            <div className="pt-6 flex gap-3">
                                <button type="button" onClick={() => setIsLogging(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs transition-all">Discard</button>
                                <button type="submit" className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-100 dark:shadow-none hover:translate-y-[-2px]">
                                    Commit Stock Addition
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
