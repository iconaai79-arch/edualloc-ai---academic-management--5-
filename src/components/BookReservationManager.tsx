
import React, { useState, useEffect } from 'react';
import type { Book, BookReservation, User } from '../types';
import { RectangleStackIcon } from './icons/RectangleStackIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { UserIcon } from './icons/UserIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { apiService } from '../services/apiService';

interface BookReservationManagerProps {
    institutionId: string;
    users: User[];
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => void;
}

export const BookReservationManager: React.FC<BookReservationManagerProps> = ({
    institutionId,
    users,
    onLogAction,
    onDataChange
}) => {
    const [reservations, setReservations] = useState<BookReservation[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [institutionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [resData, booksData] = await Promise.all([
                apiService.fetchModuleRecords<BookReservation>('book_reservations', institutionId),
                apiService.fetchModuleRecords<Book>('books', institutionId)
            ]);
            setReservations(resData.sort((a, b) => new Date(b.reservationDate).getTime() - new Date(a.reservationDate).getTime()));
            setBooks(booksData);
        } catch (error) {
            console.error('Error loading reservations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: BookReservation['status']) => {
        const reservation = reservations.find(r => r.id === id);
        if (!reservation) return;

        try {
            await apiService.saveModuleRecord('book_reservations', { ...reservation, status });
            await onLogAction(`Updated reservation ${id} status to ${status}`);

            if (status === 'fulfilled') {
                alert('Reservation marked as fulfilled. Please proceed to the Circulation tab to issue the book.');
            }

            loadData();
            onDataChange();
        } catch (error) {
            alert('Failed to update reservation.');
        }
    };

    const getBookTitle = (id: string) => books.find(b => b.id === id)?.title || 'Unknown Resource';
    const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown User';
    const getUserStaffId = (id: string) => users.find(u => u.id === id)?.staffId || 'N/A';

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="p-6 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-[2rem]">
                        <RectangleStackIcon className="w-10 h-10" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Hold & Reserve Registry</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-amber-500" />
                            Managing digital requests from Student Portal
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Queue Size</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{reservations.filter(r => r.status === 'pending').length} Requests</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Reservation Intake Ledger</h4>
                    <div className="flex gap-4">
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" /> Fulfilled
                        </span>
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500">
                            <div className="w-2 h-2 rounded-full bg-amber-500" /> Pending
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Member</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Requested Resource</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Request Context</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Expiration</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {reservations.map(res => (
                                <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-xl flex items-center justify-center">
                                                <UserIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{getUserName(res.userId)}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{getUserStaffId(res.userId)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                                <BookOpenIcon className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight max-w-[200px] truncate">{getBookTitle(res.bookId)}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reservation Logged</p>
                                            <p className="text-xs font-black text-slate-700 dark:text-slate-300 mt-1 uppercase">
                                                {new Date(res.reservationDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                                            <span className="text-xs font-black text-rose-500 uppercase tracking-tight">{new Date(res.expiryDate).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        {res.status === 'pending' ? (
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleUpdateStatus(res.id, 'fulfilled')}
                                                    className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all shadow-sm"
                                                    title="Mark as Fulfilled (Book Collected)"
                                                >
                                                    <CheckCircleIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(res.id, 'cancelled')}
                                                    className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 hover:bg-rose-600 hover:text-white rounded-2xl transition-all shadow-sm"
                                                    title="Cancel Reservation"
                                                >
                                                    <XCircleIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border ${res.status === 'fulfilled' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                {res.status}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {reservations.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">
                                        No active book reservations in the queue
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-8 bg-slate-900 rounded-[3rem] text-white overflow-hidden relative">
                <div className="relative z-10 w-full md:w-2/3">
                    <h4 className="text-xl font-black uppercase tracking-tighter mb-4">Digital Hold Protocol</h4>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium uppercase tracking-wide">Digital holds expire automatically after 3 days of non-collection to ensure equitable access to limited resources. All actions performed here are synchronized in real-time with the Student Portal.</p>
                    <button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Review Hold Polices</button>
                </div>
                <RectangleStackIcon className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 rotate-12" />
            </div>
        </div>
    );
};

