import React, { useState, useEffect, useMemo } from 'react';
import { 
    BookOpen, BarChart3, ClipboardList, Clock, CheckCircle2, 
    Plus, X, User as UserIcon, TrendingUp, QrCode, Layers, 
    CircleDollarSign, Settings, Archive, Building, Users, Shield, 
    RefreshCw, List, ChevronLeft, ChevronRight, Menu, Zap, Search,
    Sparkles, Filter, Radio, BookMarked, Cpu
} from 'lucide-react';
import type {
    User, Institution, Book, LibraryTransaction, LibraryFine,
    BookReservation, BookStockReceipt, LibrarySettings, v_library_statistics,
    CompanyDetails, Course, Department, AcademicYear, Semester, ActivityLog
} from '../types';
import { ActivityLogPanel } from './common/ActivityLogPanel';
import { apiService } from '../services/apiService';

// Sub-components
import { BookInventoryManager } from './BookInventoryManager';
import { BookLendingManager } from './BookLendingManager';
import { LibraryPenaltyManager } from './LibraryPenaltyManager';
import { BookReservationManager } from './BookReservationManager';
import { LibraryReports } from './LibraryReports';
import { BookSponsorManager } from './BookSponsorManager';
import { LibraryMemberManager } from './LibraryMemberManager';

const EduFlowManager = React.lazy(() => import('./common/EduFlowManager').then(m => ({ default: m.EduFlowManager })));

interface LibraryMasterViewProps {
    currentUser: User;
    currentInstitution: Institution;
    companyDetails: CompanyDetails;
    users: User[];
    academicYears: AcademicYear[];
    semesters: Semester[];
    courses: Course[];
    departments: Department[];
    onLogAction: (action: string) => Promise<void>;
    onSwitchPerspective?: (role: any) => void;
    /** Activity log entries passed from App.tsx — filtered for library events */
    activityLog?: ActivityLog[];
}

type LibraryTab = 'dashboard' | 'inventory' | 'sponsors' | 'lending' | 'members' | 'reservations' | 'penalties' | 'reports' | 'eduflow' | 'activity_log';

export const LibraryMasterView: React.FC<LibraryMasterViewProps> = ({
    currentUser,
    currentInstitution,
    companyDetails,
    users,
    academicYears,
    semesters,
    courses,
    departments,
    onLogAction,
    onSwitchPerspective,
    activityLog = []
}) => {
    // Filter activity log to show only library-relevant entries
    const libraryLogs = useMemo(() =>
        activityLog.filter(l =>
            (l.action || '').toLowerCase().includes('library') ||
            (l.action || '').toLowerCase().includes('book') ||
            (l.action || '').toLowerCase().includes('lend') ||
            (l.action || '').toLowerCase().includes('return') ||
            (l.action || '').toLowerCase().includes('fine') ||
            (l.action || '').toLowerCase().includes('reservation') ||
            (l.action || '').toLowerCase().includes('catalog') ||
            ((l.module || '') as string) === 'Library'
        ),
    [activityLog]);

    const [activeTab, setActiveTab] = useState<LibraryTab>('dashboard');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<v_library_statistics | null>(null);

    // Navigation Vertical Menu State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [layoutNavMode, setLayoutNavMode] = useState<'vertical' | 'horizontal'>('vertical');

    // RFID Express Checkout Modal
    const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);
    const [rfidScanCode, setRfidScanCode] = useState('');
    const [isScanningRfid, setIsScanningRfid] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);

    // Selected Category Filter Pill
    const [selectedCategoryPill, setSelectedCategoryPill] = useState('All');

    useEffect(() => {
        loadLibraryData();
    }, [currentInstitution.id]);

    const loadLibraryData = async () => {
        setLoading(true);
        try {
            const statRecords = await apiService.fetchModuleRecords<any>('v_library_statistics', currentInstitution.id);
            if (statRecords && statRecords.length > 0) {
                setStats(statRecords[0]);
            } else {
                setStats({
                    institution_id: currentInstitution.id,
                    total_books: 0,
                    total_copies: 0,
                    available_copies: 0,
                    active_loans: 0,
                    overdue_loans: 0,
                    pending_reservations: 0
                });
            }
            await onLogAction('Accessed Library Dashboard');
        } catch (error) {
            console.error('Error loading library data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Simulate RFID Chip Scan
    const handleSimulateRfidScan = () => {
        if (!rfidScanCode.trim()) return;
        setIsScanningRfid(true);
        setScanResult(null);

        setTimeout(() => {
            setIsScanningRfid(false);
            setScanResult(`✅ RFID Tag Registered: ${rfidScanCode.toUpperCase()} - Available for Instant Express Issue`);
        }, 1200);
    };

    // Menu Structure for Vertical & Horizontal Nav
    const navSections = [
        {
            group: 'MAIN HUB',
            items: [
                { id: 'dashboard', label: 'Overview HUD', icon: BarChart3, badge: null, color: 'text-cyan-400' },
            ]
        },
        {
            group: 'CATALOG & STOCK',
            items: [
                { id: 'inventory', label: 'Book Inventory', icon: BookOpen, badge: stats?.total_books ? `${stats.total_books}` : null, color: 'text-indigo-400' },
                { id: 'sponsors', label: 'Inward Receipts', icon: Building, badge: null, color: 'text-emerald-400' },
            ]
        },
        {
            group: 'CIRCULATION & PATRONS',
            items: [
                { id: 'lending', label: 'Express Lending', icon: Archive, badge: stats?.active_loans ? `${stats.active_loans}` : null, color: 'text-cyan-400' },
                { id: 'members', label: 'Patron Registry', icon: Users, badge: null, color: 'text-violet-400' },
                { id: 'reservations', label: 'Reservations', icon: Layers, badge: stats?.pending_reservations ? `${stats.pending_reservations}` : null, color: 'text-amber-400' },
            ]
        },
        {
            group: 'POLICY & FINES',
            items: [
                { id: 'penalties', label: 'Dues & Fines', icon: CircleDollarSign, badge: stats?.overdue_loans ? `${stats.overdue_loans} Overdue` : null, color: 'text-rose-400' },
            ]
        },
        {
            group: 'AUDIT & REPORTS',
            items: [
                { id: 'reports', label: 'Statement Hub', icon: ClipboardList, badge: null, color: 'text-sky-400' },
                { id: 'activity_log', label: 'System Logs', icon: List, badge: libraryLogs.length ? `${libraryLogs.length}` : null, color: 'text-slate-400' }
            ]
        }
    ];

    const renderDashboard = () => (
        <div className="space-y-8 animate-fade-in">
            {/* Cyberpunk Neon Header Banner */}
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-8 md:p-10 rounded-[3rem] shadow-2xl border border-cyan-500/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-cyan-500/20 border border-cyan-400/30 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                            Next-Gen RFID Digital Library System
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
                            Central Library <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-violet-400 italic">Repository HUD</span>
                        </h2>
                        <p className="text-slate-300 text-sm max-w-2xl font-medium">
                            Automated RFID book circulation, real-time patron intelligence, AI recommendation radar, and digital catalog management.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={loadLibraryData}
                            disabled={loading}
                            className="p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10 shadow-lg"
                            title="Refresh Analytics"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        <button
                            onClick={() => setIsRfidModalOpen(true)}
                            className="px-5 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-cyan-500/20 transition-all hover:scale-105"
                        >
                            <Zap className="w-4 h-4 text-cyan-200" />
                            ⚡ RFID Express Checkout
                        </button>

                        <button
                            onClick={() => setActiveTab('inventory')}
                            className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition-all hover:scale-105"
                        >
                            <Plus className="w-4 h-4" />
                            Add Book
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Filter Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5" /> Quick Filter:
                </span>
                {['All', '🍿 STEM & Tech', '📖 Literature', '🔬 Natural Science', '💼 Business & Law', '📜 Historical Archives', '🎨 Fine Arts'].map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategoryPill(cat)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                            selectedCategoryPill === cat
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-105'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Futuristic Live Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Catalogued Titles', value: stats?.total_books || 0, icon: BookOpen, color: 'from-cyan-500/20 to-blue-500/10', textColor: 'text-cyan-400', border: 'border-cyan-500/30', detail: `${stats?.total_copies || 0} Physical Copies` },
                    { label: 'Active Loans', value: stats?.active_loans || 0, icon: Users, color: 'from-emerald-500/20 to-teal-500/10', textColor: 'text-emerald-400', border: 'border-emerald-500/30', detail: `${stats?.available_copies || 0} Available On Shelf` },
                    { label: 'Delayed Returns', value: stats?.overdue_loans || 0, icon: Clock, color: 'from-rose-500/20 to-red-500/10', textColor: 'text-rose-400', border: 'border-rose-500/30', detail: 'Requires Penalty Settlement' },
                    { label: 'Pending Reservations', value: stats?.pending_reservations || 0, icon: Layers, color: 'from-amber-500/20 to-orange-500/10', textColor: 'text-amber-400', border: 'border-amber-500/30', detail: 'Awaiting Pickup Counter' }
                ].map((stat, idx) => (
                    <div
                        key={idx}
                        className={`bg-slate-900/80 backdrop-blur-md p-6 rounded-[2.5rem] border ${stat.border} shadow-lg relative overflow-hidden transition-all hover:scale-[1.02]`}
                    >
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${stat.color} rounded-full blur-2xl pointer-events-none`}></div>
                        
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className={`p-3.5 bg-slate-800/80 ${stat.textColor} rounded-2xl border border-slate-700/50 shadow-inner`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full border border-slate-700">Live RFID</span>
                        </div>
                        
                        <div className="relative z-10 space-y-1">
                            <h3 className="text-3xl md:text-4xl font-black tracking-tight text-white">{stat.value}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-800 relative z-10">
                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                                <span className={`w-2 h-2 rounded-full ${stat.textColor.replace('text-', 'bg-')} animate-ping`} />
                                {stat.detail}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions & AI Recommendation Teaser */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700/60 shadow-sm h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Circulation & Terminal Actions</h3>
                                    <p className="text-xs text-slate-400 font-bold">Fast-track library operations and inventory controls</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={() => setActiveTab('lending')}
                                className="p-6 bg-slate-50 dark:bg-slate-900/60 rounded-[2rem] border-2 border-transparent hover:border-indigo-500 transition-all text-left group"
                            >
                                <div className="p-3 bg-white dark:bg-slate-800 w-fit rounded-2xl mb-4 shadow-sm group-hover:scale-110 transition-transform text-indigo-600 dark:text-indigo-400">
                                    <Archive className="w-6 h-6" />
                                </div>
                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Issue Book</p>
                                <p className="text-xs text-slate-400 mt-1">Assign books to students or staff</p>
                            </button>

                            <button
                                onClick={() => setActiveTab('sponsors')}
                                className="p-6 bg-slate-50 dark:bg-slate-900/60 rounded-[2rem] border-2 border-transparent hover:border-emerald-500 transition-all text-left group"
                            >
                                <div className="p-3 bg-white dark:bg-slate-800 w-fit rounded-2xl mb-4 shadow-sm group-hover:scale-110 transition-transform text-emerald-600 dark:text-emerald-400">
                                    <Building className="w-6 h-6" />
                                </div>
                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Inward Receipts</p>
                                <p className="text-xs text-slate-400 mt-1">Log books from sponsors or GoK</p>
                            </button>

                            <button
                                onClick={() => setActiveTab('penalties')}
                                className="p-6 bg-slate-50 dark:bg-slate-900/60 rounded-[2rem] border-2 border-transparent hover:border-rose-500 transition-all text-left group"
                            >
                                <div className="p-3 bg-white dark:bg-slate-800 w-fit rounded-2xl mb-4 shadow-sm group-hover:scale-110 transition-transform text-rose-600 dark:text-rose-400">
                                    <CircleDollarSign className="w-6 h-6" />
                                </div>
                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Manage Penalties</p>
                                <p className="text-xs text-slate-400 mt-1">Configure fines & track dues</p>
                            </button>

                            <button
                                onClick={() => setActiveTab('reports')}
                                className="p-6 bg-slate-50 dark:bg-slate-900/60 rounded-[2rem] border-2 border-transparent hover:border-amber-500 transition-all text-left group"
                            >
                                <div className="p-3 bg-white dark:bg-slate-800 w-fit rounded-2xl mb-4 shadow-sm group-hover:scale-110 transition-transform text-amber-600 dark:text-amber-400">
                                    <BarChart3 className="w-6 h-6" />
                                </div>
                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Analytics Hub</p>
                                <p className="text-xs text-slate-400 mt-1">Generate lists and statements</p>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* QR & RFID Scanner Widget */}
                    <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-[3rem] p-8 text-white shadow-xl border border-indigo-500/30 overflow-hidden relative group">
                        <QrCode className="absolute -right-6 -bottom-6 w-44 h-44 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/30 rounded-full text-[9px] font-black uppercase tracking-widest text-indigo-300 mb-3 border border-indigo-400/30">
                            <Cpu className="w-3 h-3 text-cyan-400" /> Smart Hardware Scanner
                        </div>
                        <h4 className="text-xl font-black uppercase tracking-tight mb-2">QR & RFID Enabled</h4>
                        <p className="text-indigo-200 text-xs leading-relaxed mb-6 font-medium">
                            Generate and print unique 2D barcodes or RFID microchips for instant cataloguing and express self-service checkout.
                        </p>
                        <button
                            onClick={() => setIsRfidModalOpen(true)}
                            className="w-full py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                        >
                            <Zap className="w-4 h-4 text-cyan-400" /> Open Express Scanner Modal
                        </button>
                    </div>

                    {/* Policy Watch Card */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700/60 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-black uppercase tracking-tight text-sm text-slate-800 dark:text-white">Policy Watch</h4>
                                <p className="text-[10px] text-slate-400 font-bold">Current Circulation Rules</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Overdue Fine Rate</span>
                                <span className="font-black text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg">KES 10.00 / Day</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Borrowing Limit</span>
                                <span className="font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg">3 Books / Member</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Max Lending Term</span>
                                <span className="font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">14 Calendar Days</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setActiveTab('penalties')}
                            className="mt-6 w-full py-3 bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700"
                        >
                            Adjust Policy Parameters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="w-16 h-16 border-4 border-cyan-100 border-t-cyan-500 rounded-full animate-spin" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Synchronizing RFID Library Repository...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col lg:flex-row transition-all duration-500">
            {/* ── COLLAPSIBLE VERTICAL SIDEBAR MENU ── */}
            {layoutNavMode === 'vertical' && (
                <aside
                    className={`${
                        isSidebarOpen ? 'w-full lg:w-72' : 'w-full lg:w-24'
                    } bg-slate-900 text-white border-r border-slate-800 transition-all duration-500 flex flex-col p-4 shrink-0 z-30`}
                >
                    {/* Sidebar Header */}
                    <div className="flex items-center justify-between pb-6 mb-4 border-b border-slate-800">
                        {isSidebarOpen ? (
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-2xl shadow-lg shadow-cyan-500/20">
                                    <BookMarked className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="font-black text-sm uppercase tracking-wider text-white">Digital Library</h2>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-cyan-400">RFID Terminal v2.5</p>
                                </div>
                            </div>
                        ) : (
                            <div className="mx-auto p-3 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-2xl">
                                <BookMarked className="w-6 h-6 text-white" />
                            </div>
                        )}

                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="hidden lg:flex p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                            title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
                        >
                            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    </div>

                    {/* Portal Hub Return Button if onSwitchPerspective */}
                    {onSwitchPerspective && (
                        <button
                            onClick={() => onSwitchPerspective(null)}
                            className={`mb-4 flex items-center gap-3 p-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 hover:bg-indigo-900/50 ${
                                isSidebarOpen ? 'justify-start' : 'justify-center'
                            }`}
                        >
                            <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            {isSidebarOpen && <span>Portal Hub</span>}
                        </button>
                    )}

                    {/* Navigation Items Grouped */}
                    <div className="space-y-6 flex-1 overflow-y-auto scrollbar-none pr-1">
                        {navSections.map((sec, secIdx) => (
                            <div key={secIdx} className="space-y-1.5">
                                {isSidebarOpen && (
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 px-3">
                                        {sec.group}
                                    </h4>
                                )}
                                {sec.items.map(item => {
                                    const isActive = activeTab === item.id;
                                    const IconComp = item.icon;

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id as LibraryTab)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all relative ${
                                                isActive
                                                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30'
                                                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                                            } ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                                                {isSidebarOpen && <span>{item.label}</span>}
                                            </div>

                                            {isSidebarOpen && item.badge && (
                                                <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${
                                                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-cyan-400 border border-slate-700'
                                                }`}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Sidebar Footer Widget */}
                    {isSidebarOpen ? (
                        <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                            <button
                                onClick={() => setIsRfidModalOpen(true)}
                                className="w-full p-3 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/50 rounded-2xl text-[10px] font-black uppercase tracking-wider text-cyan-300 flex items-center justify-center gap-2 transition-all"
                            >
                                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                                ⚡ RFID Express Checkout
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsRfidModalOpen(true)}
                            className="mt-4 p-3 bg-cyan-950 text-cyan-300 rounded-2xl flex items-center justify-center"
                            title="RFID Express Checkout"
                        >
                            <Zap className="w-4 h-4 text-cyan-400" />
                        </button>
                    )}
                </aside>
            )}

            {/* ── MAIN CONTENT AREA ── */}
            <main className="flex-1 p-4 md:p-8 space-y-6 overflow-x-hidden">
                {/* Horizontal Nav Bar (if user switches layout mode) */}
                {layoutNavMode === 'horizontal' && (
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-4 z-[40] p-2 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-xl flex flex-wrap gap-1 items-center justify-between">
                        <div className="flex flex-wrap gap-1 p-1 items-center">
                            {onSwitchPerspective && (
                                <button
                                    onClick={() => onSwitchPerspective(null)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-indigo-50 dark:bg-indigo-950 text-indigo-600 mr-2"
                                >
                                    Portal Hub
                                </button>
                            )}
                            {navSections.flatMap(s => s.items).map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as LibraryTab)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Layout Mode Switcher Top Bar */}
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-2">Navigation View:</span>
                        <button
                            onClick={() => setLayoutNavMode('vertical')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                layoutNavMode === 'vertical'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            📊 Vertical Sidebar
                        </button>
                        <button
                            onClick={() => setLayoutNavMode('horizontal')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                layoutNavMode === 'horizontal'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            📑 Horizontal Bar
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Institution: <strong className="text-slate-700 dark:text-slate-200">{currentInstitution.name}</strong></span>
                    </div>
                </div>

                {/* Active Tab View Rendering */}
                <div className="min-h-[60vh]">
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'inventory' && <BookInventoryManager institutionId={currentInstitution.id} users={users} onLogAction={onLogAction} onDataChange={loadLibraryData} />}
                    {activeTab === 'lending' && <BookLendingManager institutionId={currentInstitution.id} users={users} onLogAction={onLogAction} onDataChange={loadLibraryData} />}
                    {activeTab === 'members' && <LibraryMemberManager institutionId={currentInstitution.id} institution={currentInstitution} companyDetails={companyDetails} users={users} onLogAction={onLogAction} />}
                    {activeTab === 'sponsors' && <BookSponsorManager institutionId={currentInstitution.id} users={users} onLogAction={onLogAction} onDataChange={loadLibraryData} />}
                    {activeTab === 'reservations' && <BookReservationManager institutionId={currentInstitution.id} users={users} onLogAction={onLogAction} onDataChange={loadLibraryData} />}
                    {activeTab === 'penalties' && <LibraryPenaltyManager institutionId={currentInstitution.id} onLogAction={onLogAction} onDataChange={loadLibraryData} />}
                    {activeTab === 'reports' && <LibraryReports institution={currentInstitution} companyDetails={companyDetails} users={users} departments={departments} courses={courses} onLogAction={onLogAction} />}
                    {activeTab === 'activity_log' && <ActivityLogPanel logs={libraryLogs} module="Library" />}
                </div>
            </main>

            {/* ── MODAL: RFID EXPRESS CHECKOUT TERMINAL ── */}
            {isRfidModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 text-white rounded-[3rem] p-8 max-w-lg w-full border border-cyan-500/40 shadow-2xl space-y-6 relative overflow-hidden animate-scale-up">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-3.5 bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30">
                                    <Zap className="w-6 h-6 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-lg uppercase tracking-tight">Express RFID Terminal</h3>
                                    <p className="text-[10px] text-cyan-300 font-mono">Instant Hardware Tag Auto-Scan</p>
                                </div>
                            </div>
                            <button onClick={() => setIsRfidModalOpen(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
                        </div>

                        <div className="p-6 bg-slate-950/80 rounded-2xl border border-slate-800 text-center space-y-4 relative">
                            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400 flex items-center justify-center relative">
                                <Radio className={`w-8 h-8 text-cyan-400 ${isScanningRfid ? 'animate-ping' : ''}`} />
                            </div>
                            <p className="text-xs font-bold text-slate-300">Tap RFID Book Tag or Scan Barcode</p>

                            <div className="space-y-2">
                                <input
                                    type="text"
                                    placeholder="Enter or scan RFID Tag Code (e.g. RFID-9902)..."
                                    value={rfidScanCode}
                                    onChange={(e) => setRfidScanCode(e.target.value)}
                                    className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-cyan-300 text-center focus:ring-2 focus:ring-cyan-500"
                                />

                                <button
                                    onClick={handleSimulateRfidScan}
                                    disabled={isScanningRfid || !rfidScanCode}
                                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20"
                                >
                                    {isScanningRfid ? 'Scanning Hardware...' : 'Simulate RFID Tap'}
                                </button>
                            </div>
                        </div>

                        {scanResult && (
                            <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-xs font-bold text-emerald-300 space-y-1">
                                <p>{scanResult}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setIsRfidModalOpen(false)}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                            >
                                Close Terminal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
