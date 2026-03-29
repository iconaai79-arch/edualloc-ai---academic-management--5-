
import React, { useState, useEffect, useMemo } from 'react';
import type {
    Book, LibraryTransaction, LibraryFine, User,
    Department, v_library_statistics, Course, Institution, CompanyDetails,
    BookReservation, BookStockReceipt
} from '../types';
import { BarChart3Icon } from './icons/BarChart3Icon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UserIcon } from './icons/UserIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { ArrowTrendingUpIcon } from './icons/ArrowTrendingUpIcon';
import { SearchIcon } from './icons/SearchIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { apiService } from '../services/apiService';
import { generateLibraryUnreturnedReportPdf, generateMemberLibraryHistoryPdf } from '../services/pdfService';

interface LibraryReportsProps {
    institution: Institution;
    companyDetails: CompanyDetails;
    users: User[];
    departments: Department[];
    courses: Course[];
    onLogAction: (action: string) => Promise<void>;
}

export const LibraryReports: React.FC<LibraryReportsProps> = ({
    institution,
    companyDetails,
    users,
    departments,
    courses,
    onLogAction
}) => {
    const [books, setBooks] = useState<Book[]>([]);
    const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
    const [fines, setFines] = useState<LibraryFine[]>([]);
    const [reservations, setReservations] = useState<BookReservation[]>([]);
    const [stockReceipts, setStockReceipts] = useState<BookStockReceipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchUserTerm, setSearchUserTerm] = useState('');
    const [selectedStatementUser, setSelectedStatementUser] = useState<User | null>(null);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedStreamId, setSelectedStreamId] = useState('');
    const [isPrintingStatement, setIsPrintingStatement] = useState(false);
    const [viewMode, setViewMode] = useState<'summary' | 'intelligence'>('summary');

    useEffect(() => {
        loadData();
    }, [institution.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [booksData, transData, finesData, resData, stockData] = await Promise.all([
                apiService.fetchModuleRecords<Book>('books', institution.id),
                apiService.fetchModuleRecords<LibraryTransaction>('library_transactions', institution.id),
                apiService.fetchModuleRecords<LibraryFine>('library_fines', institution.id),
                apiService.fetchModuleRecords<BookReservation>('book_reservations', institution.id),
                apiService.fetchModuleRecords<BookStockReceipt>('book_stock_receipts', institution.id)
            ]);
            setBooks(booksData);
            setTransactions(transData);
            setFines(finesData);
            setReservations(resData);
            setStockReceipts(stockData);
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

        // 1. Demand Intelligence
        const demandIntel = books.map(b => {
            const activeRes = reservations.filter(r => r.bookId === b.id && r.status === 'pending').length;
            const demandRatio = b.available > 0 ? activeRes / b.available : activeRes;
            return { ...b, activeRes, demandRatio };
        }).filter(b => b.activeRes > 0).sort((a, b) => b.demandRatio - a.demandRatio).slice(0, 10);

        // 2. Collection Obsolescence
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const deadStock = books.filter(b => {
            const addedDate = new Date(b.addedDate);
            const loansCount = transactions.filter(t => t.bookId === b.id).length;
            return addedDate < oneYearAgo && loansCount === 0;
        }).slice(0, 10);

        // 3. Fine Leakage
        const totalFineAmount = fines.reduce((acc, f) => acc + f.amount, 0);
        const collectedFineAmount = fines.reduce((acc, f) => acc + f.paidAmount, 0);
        const fineLeakage = totalFineAmount > 0 ? ((totalFineAmount - collectedFineAmount) / totalFineAmount) * 100 : 0;

        // 4. Behavioral Engagement Segments
        const userActivity = users.map(u => {
            const count = transactions.filter(t => t.userId === u.id).length;
            let segment = 'Inactive';
            if (count > 10) segment = 'Power';
            else if (count > 2) segment = 'Regular';
            return { ...u, loanCount: count, segment };
        });
        const segments = {
            Power: userActivity.filter(u => u.segment === 'Power').length,
            Regular: userActivity.filter(u => u.segment === 'Regular').length,
            Inactive: userActivity.filter(u => u.segment === 'Inactive').length,
        };

        // 5. Category Turnover Heatmap
        const categoryTurnover = Object.entries(categoryCounts).map(([cat, total]: any) => {
            const catLoans = transactions.filter(t => {
                const book = books.find(b => b.id === t.bookId);
                return book?.category === cat;
            }).length;
            return { category: cat, total, loans: catLoans, turnover: (catLoans / total) || 0 };
        }).sort((a, b) => b.turnover - a.turnover);

        // 6. Peak Activity Audit
        const peakAudit = transactions.reduce((acc: any, t) => {
            const hour = new Date(t.issueDate).getHours();
            const slot = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
            acc[slot] = (acc[slot] || 0) + 1;
            return acc;
        }, { Morning: 0, Afternoon: 0, Evening: 0 });

        // 7. Asset Risk (Estimated at 1500 KES average per book)
        const unreturnedBooks = transactions.filter(t => t.status === 'issued' || t.status === 'overdue').length;
        const totalAssetRisk = unreturnedBooks * 1500;

        const overdueCount = transactions.filter(t => t.status === 'issued' && new Date(t.dueDate) < new Date()).length;

        return {
            topBorrowed, categoryCounts, overdueCount, totalFineAmount, collectedFineAmount,
            demandIntel, deadStock, fineLeakage, segments, categoryTurnover, peakAudit, totalAssetRisk
        };
    }, [books, transactions, fines, reservations, stockReceipts, users]);

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

    const handlePrintStatement = async () => {
        if (!selectedStatementUser || !userStatementData) return;
        setIsPrintingStatement(true);
        try {
            const dataUri = await generateMemberLibraryHistoryPdf(
                selectedStatementUser,
                userStatementData.transactions,
                userStatementData.fines,
                getBookTitle,
                institution,
                companyDetails,
                institution.logoUrl || null,
                institution.footerImageUrl || null
            );

            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `Library-Statement-${selectedStatementUser.name.replace(/\s+/g, '-')}.pdf`;
            link.click();

            await onLogAction(`Generated Library Statement for ${selectedStatementUser.name}`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate official library statement.');
        } finally {
            setIsPrintingStatement(false);
        }
    };

    const getBookTitle = (id: string) => books.find(b => b.id === id)?.title || 'Unknown Resource';
    const getBookAccession = (id: string) => books.find(b => b.id === id)?.accessionNumber || 'N/A';

    const unreturnedReportData = useMemo(() => {
        return transactions
            .filter(t => t.status === 'issued' || t.status === 'overdue')
            .map(t => {
                const user = users.find(u => u.id === t.userId);
                return { ...t, user };
            })
            .filter(item => {
                if (selectedClassId && item.user?.courseId !== selectedClassId) return false;
                if (selectedStreamId && item.user?.courseLevelId !== selectedStreamId) return false;
                return true;
            });
    }, [transactions, users, selectedClassId, selectedStreamId]);

    const handlePrintUnreturnedReport = async () => {
        const className = courses.find(c => c.id === selectedClassId)?.name || 'All Classes';
        const streamName = courses.find(c => c.id === selectedClassId)?.levels.find(l => l.id === selectedStreamId)?.name || 'All Streams';

        try {
            const dataUri = await generateLibraryUnreturnedReportPdf(
                unreturnedReportData,
                `Unreturned Books Report: ${className} - ${streamName}`,
                institution.letterheadConfig,
                institution.footerImageUrl || null,
                getBookTitle
            );
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `Unreturned-Books-${className}-${streamName}.pdf`.replace(/\s+/g, '-');
            link.click();
            onLogAction(`Generated Unreturned Books Report for ${className} - ${streamName}`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate PDF report.');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* View Switcher Toggle */}
            <div className="flex justify-center">
                <div className="bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-3xl flex items-center gap-1 border border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setViewMode('summary')}
                        className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'summary' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Operations Summary
                    </button>
                    <button
                        onClick={() => setViewMode('intelligence')}
                        className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'intelligence' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Advanced Intelligence
                    </button>
                </div>
            </div>

            {viewMode === 'intelligence' ? (
                <div className="space-y-8 animate-fade-in">
                    {/* Advanced Metrics Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asset Replacement Value</p>
                            <p className="text-3xl font-black tracking-tighter">KES {analytics.totalAssetRisk.toLocaleString()}</p>
                            <div className="pt-4 border-t border-white/10">
                                <span className="text-[9px] font-bold text-rose-400 uppercase">Risk Level: High</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Fine Leakage Rate</p>
                            <div className="flex items-end gap-3">
                                <p className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">{analytics.fineLeakage.toFixed(1)}%</p>
                                <ArrowTrendingUpIcon className="w-6 h-6 text-rose-500 mb-1" />
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-4">Uncollected: KES {(analytics.totalFineAmount - analytics.collectedFineAmount).toFixed(0)}</p>
                        </div>

                        <div className="bg-indigo-600 p-8 rounded-[3rem] text-white lg:col-span-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Behavioral Segments</p>
                                    <div className="flex gap-8 mt-6">
                                        <div>
                                            <p className="text-2xl font-black">{analytics.segments.Power}</p>
                                            <p className="text-[9px] font-black uppercase text-indigo-200 opacity-60">Power Users</p>
                                        </div>
                                        <div className="h-10 w-[1px] bg-white/20 self-center" />
                                        <div>
                                            <p className="text-2xl font-black">{analytics.segments.Regular}</p>
                                            <p className="text-[9px] font-black uppercase text-indigo-200 opacity-60">Regulars</p>
                                        </div>
                                        <div className="h-10 w-[1px] bg-white/20 self-center" />
                                        <div>
                                            <p className="text-2xl font-black">{analytics.segments.Inactive}</p>
                                            <p className="text-[9px] font-black uppercase text-indigo-200 opacity-60">Inactives</p>
                                        </div>
                                    </div>
                                </div>
                                <UserIcon className="w-12 h-12 text-white/10" />
                            </div>
                        </div>
                    </div>

                    {/* Advanced Metrics Row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Demand Intel */}
                        <div className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Predictive Demand</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">High Reservation Density (Procurement Suggestions)</p>
                                </div>
                                <ArrowPathIcon className="w-6 h-6 text-indigo-500" />
                            </div>
                            <div className="space-y-4">
                                {analytics.demandIntel.length > 0 ? analytics.demandIntel.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                            <div>
                                                <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{item.title}</p>
                                                <p className="text-[9px] font-bold text-slate-400">{item.activeRes} Pendings / {item.quantity} In Stock</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-indigo-600">Ratio: {item.demandRatio.toFixed(1)}</p>
                                            <span className="text-[8px] font-black uppercase text-indigo-400">Order Copy</span>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-xs text-slate-400 uppercase italic">No pending reservations detected.</p>
                                )}
                            </div>
                        </div>

                        {/* Obsolescence / Dead Wood */}
                        <div className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Collection Obsolescence</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Items with Zero Loans in 12+ Months</p>
                                </div>
                                <XCircleIcon className="w-6 h-6 text-rose-500" />
                            </div>
                            <div className="space-y-4">
                                {analytics.deadStock.length > 0 ? analytics.deadStock.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-transparent hover:border-rose-100 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                                            <div>
                                                <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{item.title}</p>
                                                <p className="text-[9px] font-bold text-slate-400">Added: {new Date(item.addedDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-slate-400 uppercase">Unused</p>
                                            <span className="text-[8px] font-black uppercase text-rose-400">Archive Suggestion</span>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-xs text-slate-400 uppercase italic">All collection items are currently engaged.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Turnover & Peak Audit */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-700">
                            <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-8">Category Turnover Heatmap</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {analytics.categoryTurnover.slice(0, 8).map((cat, idx) => (
                                    <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm mb-3">
                                            <p className="text-xs font-black text-indigo-600">{cat.turnover.toFixed(1)}x</p>
                                        </div>
                                        <p className="text-[9px] font-black text-slate-700 dark:text-slate-200 uppercase truncate w-full">{cat.category}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{cat.loans} Loans</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-indigo-900 p-10 rounded-[3.5rem] text-white">
                            <h4 className="text-lg font-black uppercase tracking-tight text-indigo-100 mb-8">Peak Activity Audit</h4>
                            <div className="space-y-6">
                                {Object.entries(analytics.peakAudit).map(([time, count]: any, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">{time}</span>
                                            <span className="text-xs font-black">{count} Trans.</span>
                                        </div>
                                        <div className="h-2 bg-indigo-950 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-400 rounded-full"
                                                style={{ width: `${(count / (transactions.length || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[9px] font-bold text-indigo-400 uppercase mt-6 tracking-widest">Optimal Staffing: Afternoon</p>
                        </div>
                    </div>
                </div>
            ) : (
                <>
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
                                                disabled={isPrintingStatement}
                                                className="h-14 px-8 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-xl shadow-indigo-100 dark:shadow-none transition-all hover:translate-y-[-2px] disabled:opacity-50 disabled:translate-y-0"
                                            >
                                                {isPrintingStatement ? (
                                                    <>
                                                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                                        Preparing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <PrinterIcon className="w-5 h-5" />
                                                        Print Statement
                                                    </>
                                                )}
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

                    {/* Unreturned Books Registry Report */}
                    <div className="bg-white dark:bg-slate-800 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-10 lg:p-14">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Defaulter & Active Circulation List</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Filter by Class and Stream for efficient retrieval</p>
                                </div>
                                <button
                                    onClick={handlePrintUnreturnedReport}
                                    className="h-12 px-6 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 transition-all hover:bg-slate-800"
                                >
                                    <PrinterIcon className="w-4 h-4" />
                                    Print defauter list
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Class / Grade</label>
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => { setSelectedClassId(e.target.value); setSelectedStreamId(''); }}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-xs font-black uppercase tracking-tight transition-all"
                                    >
                                        <option value="">-- All Classes --</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Stream / Section</label>
                                    <select
                                        value={selectedStreamId}
                                        onChange={(e) => setSelectedStreamId(e.target.value)}
                                        disabled={!selectedClassId}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-xs font-black uppercase tracking-tight transition-all disabled:opacity-50"
                                    >
                                        <option value="">-- All Streams --</option>
                                        {courses.find(c => c.id === selectedClassId)?.levels.map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 w-full">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Unreturned Units</p>
                                        <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">{unreturnedReportData.length} Copies</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-slate-100 dark:border-slate-700 rounded-[2.5rem] overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Recipient</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Resource (ID)</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Deadline</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                        {unreturnedReportData.map(item => {
                                            const isOverdue = new Date(item.dueDate) < new Date();
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black text-xs">
                                                                {item.user?.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{item.user?.name || 'Unknown User'}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.user?.staffId || 'No ID'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{getBookTitle(item.bookId)}</p>
                                                        <span className="text-[8px] font-bold text-slate-300">ID: {getBookAccession(item.bookId)}</span>
                                                    </td>
                                                    <td className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                        {new Date(item.dueDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        {isOverdue ? (
                                                            <span className="text-[9px] font-black px-2 py-1 bg-rose-50 dark:bg-rose-900/40 text-rose-600 rounded-full uppercase">Overdue</span>
                                                        ) : (
                                                            <span className="text-[9px] font-black px-2 py-1 bg-amber-50 dark:bg-amber-900/40 text-amber-600 rounded-full uppercase">In use</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {unreturnedReportData.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-8 py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">No unreturned books match these filters</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
