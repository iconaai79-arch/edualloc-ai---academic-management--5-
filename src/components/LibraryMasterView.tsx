
import React, { useState, useEffect, useMemo } from 'react';
import type {
    User, Institution, Book, LibraryTransaction, LibraryFine,
    BookReservation, BookStockReceipt, LibrarySettings, v_library_statistics,
    CompanyDetails, Course, Department, AcademicYear, Semester
} from '../types';
import {
    BookOpenIcon, BarChart3Icon, ClipboardListIcon, ClockIcon,
    CheckCircleIcon, PlusIcon, XIcon, UserIcon, ArrowTrendingUpIcon,
    QrCodeIcon, RectangleStackIcon, CurrencyIcon, SettingsIcon, ArchiveBoxIcon,
    BuildingOfficeIcon, UsersIcon, ShieldIcon, ArrowPathIcon
} from './icons/index';
import { apiService } from '../services/apiService';

// Sub-components
import { BookInventoryManager } from './BookInventoryManager';
import { BookLendingManager } from './BookLendingManager';
import { LibraryPenaltyManager } from './LibraryPenaltyManager';
import { BookReservationManager } from './BookReservationManager';
import { LibraryReports } from './LibraryReports';
import { BookSponsorManager } from './BookSponsorManager';
import { LibraryMemberManager } from './LibraryMemberManager';

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
}

type LibraryTab = 'dashboard' | 'inventory' | 'sponsors' | 'lending' | 'members' | 'reservations' | 'penalties' | 'reports';

export const LibraryMasterView: React.FC<LibraryMasterViewProps> = ({
    currentUser,
    currentInstitution,
    companyDetails,
    users,
    academicYears,
    semesters,
    courses,
    departments,
    onLogAction
}) => {
    const [activeTab, setActiveTab] = useState<LibraryTab>('dashboard');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<v_library_statistics | null>(null);

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

    const renderDashboard = () => (
        <div className="space-y-8 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Central Library Repository</h2>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Knowledge Management & Resource Circulation</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadLibraryData}
                        className="p-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl hover:border-indigo-500 transition-all shadow-sm"
                        title="Refresh Analytics"
                    >
                        <ArrowPathIcon className="w-6 h-6 text-slate-600" />
                    </button>
                    <button onClick={() => setActiveTab('inventory')} className="btn-primary h-12 px-6 flex items-center gap-2 shadow-lg shadow-indigo-100">
                        <PlusIcon className="w-5 h-5" />
                        Add New Book
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Catalogued Titles', value: stats?.total_books || 0, icon: BookOpenIcon, color: 'indigo', detail: `${stats?.total_copies || 0} Total Copies` },
                    { label: 'Active Loans', value: stats?.active_loans || 0, icon: UsersIcon, color: 'emerald', detail: `${stats?.available_copies || 0} Available` },
                    { label: 'Delayed Returns', value: stats?.overdue_loans || 0, icon: ClockIcon, color: 'rose', detail: 'Requires Penalty' },
                    { label: 'Reservations', value: stats?.pending_reservations || 0, icon: RectangleStackIcon, color: 'amber', detail: 'Pending Collection' }
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 bg-slate-50 dark:bg-slate-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Metric</span>
                        </div>
                        <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{stat.value}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</p>
                        <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700">
                            <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full bg-indigo-500 anim-pulse`} />
                                {stat.detail}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions & Analytics Teaser */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm h-full">
                        <h3 className="text-lg font-black uppercase tracking-tight mb-6">Circulation Pulse</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button onClick={() => setActiveTab('lending')} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-transparent hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800 transition-all text-left group">
                                <div className="p-3 bg-white dark:bg-slate-800 w-fit rounded-xl mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <ArchiveBoxIcon className="w-6 h-6 text-indigo-600" />
                                </div>
                                <p className="font-bold text-slate-900 dark:text-white">Issue Book</p>
                                <p className="text-xs text-slate-500 mt-1">Assign books to students or staff</p>
                            </button>
                            <button onClick={() => setActiveTab('sponsors')} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-transparent hover:border-emerald-500 hover:bg-white dark:hover:bg-slate-800 transition-all text-left group">
                                <div className="p-3 bg-white dark:bg-slate-800 w-fit rounded-xl mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <BuildingOfficeIcon className="w-6 h-6 text-emerald-600" />
                                </div>
                                <p className="font-bold text-slate-900 dark:text-white">Inward Receipts</p>
                                <p className="text-xs text-slate-500 mt-1">Log books from sponsors or GoK</p>
                            </button>
                            <button onClick={() => setActiveTab('penalties')} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-transparent hover:border-rose-500 hover:bg-white dark:hover:bg-slate-800 transition-all text-left group">
                                <div className="p-3 bg-white dark:bg-slate-800 w-fit rounded-xl mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <CurrencyIcon className="w-6 h-6 text-rose-600" />
                                </div>
                                <p className="font-bold text-slate-900 dark:text-white">Manage Penalties</p>
                                <p className="text-xs text-slate-500 mt-1">Configure fines & track dues</p>
                            </button>
                            <button onClick={() => setActiveTab('reports')} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-transparent hover:border-amber-500 hover:bg-white dark:hover:bg-slate-800 transition-all text-left group">
                                <div className="p-3 bg-white dark:bg-slate-800 w-fit rounded-xl mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <BarChart3Icon className="w-6 h-6 text-amber-600" />
                                </div>
                                <p className="font-bold text-slate-900 dark:text-white">Analytics Hub</p>
                                <p className="text-xs text-slate-500 mt-1">Generate lists and statements</p>
                            </button>
                            <button onClick={() => setActiveTab('members')} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-transparent hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800 transition-all text-left group">
                                <div className="p-3 bg-white dark:bg-slate-800 w-fit rounded-xl mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                    <UsersIcon className="w-6 h-6 text-indigo-600" />
                                </div>
                                <p className="font-bold text-slate-900 dark:text-white">Member Registry</p>
                                <p className="text-xs text-slate-500 mt-1">Manage students & staff profiles</p>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-indigo-600 rounded-[3rem] p-8 text-white shadow-xl shadow-indigo-200 dark:shadow-none overflow-hidden relative group">
                        <QrCodeIcon className="absolute -right-4 -bottom-4 w-40 h-40 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                        <h4 className="text-xl font-black uppercase tracking-tighter mb-2">QR Enabled</h4>
                        <p className="text-indigo-100 text-sm leading-relaxed mb-6 font-medium">Generate and print unique QR codes for every book in inventory for quick checkout scanning.</p>
                        <button onClick={() => setActiveTab('inventory')} className="w-full py-4 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all">
                            Scan / Manage Inventory
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                                <ShieldIcon className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold uppercase tracking-tight text-sm">Policy Watch</h4>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-widest">Fine Rate</span>
                                <span className="font-black text-rose-600">KES 10.00 / Day</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-widest">Limit</span>
                                <span className="font-black text-indigo-600">3 Books / User</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-widest">Lending Period</span>
                                <span className="font-black text-emerald-600">14 Days</span>
                            </div>
                        </div>
                        <button onClick={() => setActiveTab('penalties')} className="mt-8 w-full py-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-all border border-slate-100 dark:border-slate-700">
                            Adjust Policy
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Synchronizing Library Registry...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-2 sm:p-6 lg:p-8 space-y-8">
            {/* Top Navigation */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl sticky top-4 z-[40] p-2 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-wrap gap-1 items-center justify-between">
                <div className="flex flex-wrap gap-1 p-1">
                    {[
                        { id: 'dashboard', label: 'Overview', icon: BarChart3Icon },
                        { id: 'inventory', label: 'Inventory', icon: BookOpenIcon },
                        { id: 'lending', label: 'Circulation', icon: ArchiveBoxIcon },
                        { id: 'members', label: 'Members', icon: UsersIcon },
                        { id: 'sponsors', label: 'Inward Receipts', icon: BuildingOfficeIcon },
                        { id: 'reservations', label: 'Reservations', icon: RectangleStackIcon },
                        { id: 'penalties', label: 'Dues & Fines', icon: CurrencyIcon },
                        { id: 'reports', label: 'Statement Hub', icon: ClipboardListIcon }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as LibraryTab)}
                            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="min-h-[60vh]">
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'inventory' && <BookInventoryManager institutionId={currentInstitution.id} users={users} onLogAction={onLogAction} onDataChange={loadLibraryData} />}
                {activeTab === 'lending' && <BookLendingManager institutionId={currentInstitution.id} users={users} onLogAction={onLogAction} onDataChange={loadLibraryData} />}
                {activeTab === 'members' && <LibraryMemberManager institutionId={currentInstitution.id} users={users} onLogAction={onLogAction} />}
                {activeTab === 'sponsors' && <BookSponsorManager institutionId={currentInstitution.id} users={users} onLogAction={onLogAction} onDataChange={loadLibraryData} />}
                {activeTab === 'reservations' && <BookReservationManager institutionId={currentInstitution.id} users={users} onLogAction={onLogAction} onDataChange={loadLibraryData} />}
                {activeTab === 'penalties' && <LibraryPenaltyManager institutionId={currentInstitution.id} onLogAction={onLogAction} onDataChange={loadLibraryData} />}
                {activeTab === 'reports' && <LibraryReports institution={currentInstitution} companyDetails={companyDetails} users={users} departments={departments} courses={courses} onLogAction={onLogAction} />}
            </div>

            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                .anim-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
            `}</style>
        </div>
    );
};
