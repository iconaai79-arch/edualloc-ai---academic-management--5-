import React, { useState, useMemo } from 'react';
import { 
    Car, 
    LayoutDashboard, 
    Layers, 
    FileText, 
    CreditCard, 
    Users, 
    Banknote, 
    BarChart3, 
    Settings, 
    Plus, 
    ExternalLink, 
    ChevronLeft, 
    ChevronRight, 
    Sparkles, 
    ShieldCheck, 
    DollarSign, 
    Clock, 
    Search,
    Menu,
    X,
    TrendingUp,
    RefreshCw,
    Compass,
    Eye
} from 'lucide-react';
import { 
    CarListing, 
    CarInvoice, 
    CarPayment, 
    TestDriveBooking, 
    BankTransaction, 
    Institution, 
    User, 
    CompanyDetails 
} from '../../types';
import { CarShowroomDashboard } from './CarShowroomDashboard';
import { CarInventoryList } from './CarInventoryList';
import { CarSalesLedger } from './CarSalesLedger';
import { BankFeedsManager } from './BankFeedsManager';
import { ShowroomConfigManager } from './ShowroomConfigManager';
import { CarShowroomReportsDashboard } from './CarShowroomReportsDashboard';
import { VehicleMarketplaceView } from '../VehicleMarketplaceView';
import { UserManager } from '../UserManager';
import { apiService } from '../../services/apiService';

export type AutomotiveTab = 
    | 'dashboard'
    | 'inventory'
    | 'showroom_portal'
    | 'financials'
    | 'bank_feeds'
    | 'customers'
    | 'reports'
    | 'showroom_settings';

export interface AutomotiveManagerProps {
    institution: Institution;
    currentUser: User;
    users?: User[];
    companyDetails?: CompanyDetails;
    carListings: CarListing[];
    carInvoices: CarInvoice[];
    carPayments: CarPayment[];
    carTestDrives?: TestDriveBooking[];
    carBankTransactions?: BankTransaction[];
    initialTab?: AutomotiveTab;
    onRefreshData?: () => void;
    onAddListing?: () => void;
    onEditListing?: (listing: CarListing) => void;
    onDeleteListing?: (id: string) => Promise<void>;
    onAddInvoice?: () => void;
    onEditInvoice?: (invoice: CarInvoice) => void;
    onDeleteInvoice?: (id: string) => Promise<void>;
    onAddPayment?: (invoice?: CarInvoice | null) => void;
    onEditPayment?: (payment: CarPayment) => void;
    onDeletePayment?: (id: string) => Promise<void>;
    onPrintInvoice?: (invoice: CarInvoice) => void;
    onPrintReceipt?: (payment: CarPayment) => void;
    onPrintAgreement?: (invoice: CarInvoice) => void;
    onReconcileBankTransaction?: (transactionId: string, invoiceId: string) => Promise<void>;
    onFetchBankFeeds?: () => Promise<void>;
    onAddLead?: () => void;
    onSwitchPerspective?: () => void;
    smsConfig?: any;
    onSendSms?: any;
    onImportUsers?: any;
    onImportStudents?: any;
    onDeleteUser?: any;
    onEditUser?: any;
    departments?: any[];
    courses?: any[];
    subjects?: any[];
    counties?: any[];
}

export const AutomotiveManager: React.FC<AutomotiveManagerProps> = ({
    institution,
    currentUser,
    users = [],
    companyDetails,
    carListings = [],
    carInvoices = [],
    carPayments = [],
    carTestDrives = [],
    carBankTransactions = [],
    initialTab = 'dashboard',
    onRefreshData,
    onAddListing,
    onEditListing,
    onDeleteListing,
    onAddInvoice,
    onEditInvoice,
    onDeleteInvoice,
    onAddPayment,
    onEditPayment,
    onDeletePayment,
    onPrintInvoice,
    onPrintReceipt,
    onPrintAgreement,
    onReconcileBankTransaction,
    onFetchBankFeeds,
    onAddLead,
    onSwitchPerspective,
    smsConfig,
    onSendSms,
    onImportUsers,
    onImportStudents,
    onDeleteUser,
    onEditUser,
    departments,
    courses,
    subjects,
    counties
}) => {
    const [activeTab, setActiveTab] = useState<AutomotiveTab>(initialTab);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [layoutMode, setLayoutMode] = useState<'vertical' | 'horizontal'>('vertical');

    // Metrics for sidebar status badges
    const availableCars = useMemo(() => carListings.filter(c => c.status === 'active' || !c.status).length, [carListings]);
    const unreconciledFeeds = useMemo(() => carBankTransactions.filter(t => t.status === 'unreconciled' || t.status === 'pending').length, [carBankTransactions]);
    const totalRevenue = useMemo(() => carPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0), [carPayments]);
    const pendingInvoices = useMemo(() => carInvoices.filter(i => (i.status || '').toLowerCase() === 'unpaid' || (i.status || '').toLowerCase() === 'partial').length, [carInvoices]);

    const openPublicShowroom = () => {
        const slug = institution?.slug || institution?.id;
        window.open(`/?view=showroom&showroom=${slug}`, '_blank');
    };

    const navSections = [
        {
            title: 'Command & Floor',
            items: [
                { id: 'dashboard' as AutomotiveTab, label: 'Operations Hub', icon: LayoutDashboard, badge: null, desc: 'Live floor metrics & KPIs' },
                { id: 'showroom_portal' as AutomotiveTab, label: 'Live Marketplace', icon: Compass, badge: 'Live View', desc: 'Simulated customer portal' }
            ]
        },
        {
            title: 'Inventory & Stock',
            items: [
                { id: 'inventory' as AutomotiveTab, label: 'Vehicle Inventory', icon: Car, badge: availableCars > 0 ? `${availableCars}` : null, desc: 'Stock specifications & tags' }
            ]
        },
        {
            title: 'Commerce & Sales',
            items: [
                { id: 'financials' as AutomotiveTab, label: 'Sales & Invoices', icon: FileText, badge: pendingInvoices > 0 ? `${pendingInvoices}` : null, desc: 'Deals, agreements & receipts' },
                { id: 'customers' as AutomotiveTab, label: 'Customer CRM', icon: Users, badge: null, desc: 'Buyer profiles & leads' }
            ]
        },
        {
            title: 'Treasury & Money',
            items: [
                { 
                    id: 'bank_feeds' as AutomotiveTab, 
                    label: 'Bank & Gateways', 
                    icon: Banknote, 
                    badge: unreconciledFeeds > 0 ? `${unreconciledFeeds} New` : null, 
                    badgeAlert: unreconciledFeeds > 0,
                    desc: 'M-Pesa, NCBA, KCB auto-match' 
                },
                { id: 'reports' as AutomotiveTab, label: 'Analytics & P&L', icon: BarChart3, badge: null, desc: 'Dealership profitability & margins' }
            ]
        },
        {
            title: 'System',
            items: [
                { id: 'showroom_settings' as AutomotiveTab, label: 'Showroom Config', icon: Settings, badge: null, desc: 'Branding, Paybills & Accounts' }
            ]
        }
    ];

    const renderNavigationContent = () => (
        <div className="space-y-6">
            {/* Sidebar Branding Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                {!isSidebarCollapsed ? (
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <Car className="w-5 h-5 text-white" />
                            </div>
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 shadow-[0_0_8px_#34d399] animate-pulse" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-white tracking-tight uppercase flex items-center gap-1.5">
                                AUTO<span className="text-cyan-400">HUB</span>
                            </h3>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[130px]">
                                {institution.name || 'Dealership'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="w-10 h-10 mx-auto bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Car className="w-5 h-5 text-white" />
                    </div>
                )}

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setLayoutMode(layoutMode === 'vertical' ? 'horizontal' : 'vertical')}
                        title="Switch Layout Mode"
                        className="hidden lg:flex p-2 rounded-xl bg-slate-800/80 hover:bg-indigo-600/30 text-slate-400 hover:text-cyan-300 transition-all border border-slate-700/50"
                    >
                        <Menu className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        className="hidden lg:flex p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-all border border-slate-700/50"
                    >
                        {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {/* Quick Action Buttons */}
            {!isSidebarCollapsed ? (
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={onAddListing}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-md shadow-indigo-900/30 transition-all active:scale-95"
                    >
                        <Plus className="w-3.5 h-3.5" /> + Vehicle
                    </button>
                    <button
                        onClick={onAddInvoice}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-md shadow-cyan-900/30 transition-all active:scale-95"
                    >
                        <Plus className="w-3.5 h-3.5" /> + Invoice
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-2 items-center">
                    <button
                        onClick={onAddListing}
                        title="Add Vehicle"
                        className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-md transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Nav Group List */}
            <div className="space-y-5">
                {navSections.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-1.5">
                        {!isSidebarCollapsed && (
                            <h4 className="text-[9px] font-black text-cyan-400/80 uppercase tracking-[0.2em] px-2.5">
                                {section.title}
                            </h4>
                        )}
                        <div className="space-y-1">
                            {section.items.map((tab) => {
                                const isActive = activeTab === tab.id;
                                const IconComponent = tab.icon;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        title={isSidebarCollapsed ? tab.label : undefined}
                                        className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all duration-200 group text-left ${
                                            isActive
                                                ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-600/30 ring-1 ring-white/20'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                                                isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:bg-slate-700/80'
                                            }`}>
                                                <IconComponent className="w-4 h-4" />
                                            </div>
                                            {!isSidebarCollapsed && (
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black uppercase tracking-wide truncate">
                                                        {tab.label}
                                                    </p>
                                                    <p className={`text-[8px] font-bold truncate ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                                                        {tab.desc}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {!isSidebarCollapsed && tab.badge && (
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 tracking-widest ${
                                                tab.badgeAlert 
                                                    ? 'bg-rose-500 text-white animate-pulse shadow-sm shadow-rose-900/50' 
                                                    : (isActive ? 'bg-white/25 text-white' : 'bg-slate-800 text-cyan-400 border border-cyan-500/20')
                                            }`}>
                                                {tab.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Sidebar Live Status Card */}
            {!isSidebarCollapsed && (
                <div className="p-4 bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl border border-slate-700/60 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Live Showroom</p>
                        </div>
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Active</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/50">
                        <div>
                            <p className="text-[8px] font-bold uppercase text-slate-400">Inventory</p>
                            <p className="text-sm font-black text-white">{availableCars} Cars</p>
                        </div>
                        <div>
                            <p className="text-[8px] font-bold uppercase text-slate-400">Total Volume</p>
                            <p className="text-xs font-black text-emerald-400 truncate">KES {totalRevenue.toLocaleString()}</p>
                        </div>
                    </div>
                    <button
                        onClick={openPublicShowroom}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-cyan-300 hover:text-cyan-200 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-500/30 transition-all active:scale-95"
                    >
                        <ExternalLink className="w-3 h-3" /> View Public Portal
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-[85vh] space-y-6">
            {/* Top Bar for Mobile & Compact Screens */}
            <div className="lg:hidden flex items-center justify-between bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                        <Car className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-xs uppercase tracking-tight">AutoHub Dealership</h3>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px]">{institution.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={openPublicShowroom}
                        className="p-2 bg-slate-800 rounded-xl text-cyan-400 hover:text-cyan-300 border border-slate-700"
                        title="Open Showroom"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 bg-indigo-600 text-white rounded-xl shadow-md"
                    >
                        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Drawer */}
            {isMobileMenuOpen && (
                <div className="lg:hidden bg-slate-950 text-slate-100 p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-6 animate-fade-in-up">
                    {renderNavigationContent()}
                </div>
            )}

            {/* Horizontal Tabs Alternative (When user toggles layoutMode === 'horizontal') */}
            {layoutMode === 'horizontal' && (
                <div className="hidden lg:flex items-center justify-between bg-white dark:bg-slate-800/90 p-2 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-x-auto scrollbar-none gap-2">
                    <div className="flex items-center gap-1.5 min-w-max">
                        {navSections.flatMap(s => s.items).map(tab => {
                            const isActive = activeTab === tab.id;
                            const IconComponent = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        isActive 
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <IconComponent className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                    {tab.badge && (
                                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                                            tab.badgeAlert ? 'bg-rose-500 text-white animate-pulse' : (isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300')
                                        }`}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setLayoutMode('vertical')}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" /> Sidebar View
                        </button>
                    </div>
                </div>
            )}

            {/* Main Layout Area */}
            <div className={`flex flex-col lg:flex-row gap-6 items-start`}>
                {/* Vertical Sidebar (Desktop) */}
                {layoutMode === 'vertical' && (
                    <aside className={`hidden lg:block transition-all duration-300 shrink-0 ${isSidebarCollapsed ? 'w-20' : 'w-64 xl:w-72'}`}>
                        <div className="bg-slate-950 text-slate-100 border border-slate-800/90 rounded-[2.5rem] p-5 shadow-2xl shadow-indigo-950/40 backdrop-blur-2xl sticky top-6 z-30 space-y-6">
                            {renderNavigationContent()}
                        </div>
                    </aside>
                )}

                {/* Sub-Module Viewport */}
                <main className="flex-1 w-full min-w-0 transition-all duration-300">
                    <div className="animate-fade-in-up space-y-6">
                        {activeTab === 'dashboard' && (
                            <CarShowroomDashboard
                                listings={carListings}
                                invoices={carInvoices}
                                payments={carPayments}
                                testDrives={carTestDrives}
                                users={users}
                                institution={institution}
                                currentUser={currentUser}
                                onAction={(tab, sub) => {
                                    if (tab === 'inventory') setActiveTab('inventory');
                                    else if (tab === 'financials') setActiveTab('financials');
                                    else if (tab === 'bank_feeds') setActiveTab('bank_feeds');
                                    else if (tab === 'customers') setActiveTab('customers');
                                    else if (tab === 'auto_marketplace' && sub) setActiveTab(sub as any);
                                }}
                                onAddListing={() => onAddListing && onAddListing()}
                                onAddInvoice={() => onAddInvoice && onAddInvoice()}
                                onAddPayment={() => onAddPayment && onAddPayment()}
                                onAddLead={() => onAddLead && onAddLead()}
                                onSwitchPerspective={onSwitchPerspective || openPublicShowroom}
                            />
                        )}

                        {activeTab === 'inventory' && (
                            <CarInventoryList
                                listings={carListings}
                                institution={institution}
                                onAddListing={() => onAddListing && onAddListing()}
                                onEditListing={(listing) => onEditListing && onEditListing(listing)}
                                onDeleteListing={async (id) => {
                                    if (onDeleteListing) {
                                        await onDeleteListing(id);
                                    } else {
                                        if (confirm('Are you sure you want to delete this vehicle listing?')) {
                                            await apiService.deleteModuleRecord('car_sales_listings', id);
                                            if (onRefreshData) onRefreshData();
                                        }
                                    }
                                }}
                                onViewShowroom={openPublicShowroom}
                            />
                        )}

                        {activeTab === 'showroom_portal' && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                                            <Compass className="w-5 h-5 text-indigo-600" /> Marketplace Simulated Experience
                                        </h3>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                                            Interactive buyer perspective with real-time test drive booking and specs discovery.
                                        </p>
                                    </div>
                                    <button
                                        onClick={openPublicShowroom}
                                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                                    >
                                        <ExternalLink className="w-4 h-4" /> Open In New Window
                                    </button>
                                </div>

                                <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden h-[850px] relative">
                                    <div className="h-full overflow-y-auto scrollbar-none p-6 sm:p-10">
                                        <VehicleMarketplaceView
                                            listings={carListings}
                                            currentInstitution={institution}
                                            onBookTestDrive={() => {}}
                                            onInquiry={() => {}}
                                            onEditListing={(listing) => onEditListing && onEditListing(listing)}
                                            onAddListing={() => onAddListing && onAddListing()}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'financials' && (
                            <CarSalesLedger
                                invoices={carInvoices}
                                payments={carPayments}
                                listings={carListings}
                                onAddInvoice={() => onAddInvoice && onAddInvoice()}
                                onAddPayment={(inv) => onAddPayment && onAddPayment(inv)}
                                onPrintInvoice={(inv) => onPrintInvoice && onPrintInvoice(inv)}
                                onPrintReceipt={(pay) => onPrintReceipt && onPrintReceipt(pay)}
                                onPrintAgreement={(inv) => onPrintAgreement && onPrintAgreement(inv)}
                                onEditInvoice={(inv) => onEditInvoice && onEditInvoice(inv)}
                                onEditPayment={(pay) => onEditPayment && onEditPayment(pay)}
                                onDeleteInvoice={onDeleteInvoice}
                                onDeletePayment={onDeletePayment}
                            />
                        )}

                        {activeTab === 'customers' && (
                            <UserManager
                                showOnly="customer"
                                currentInstitution={institution}
                                smsConfig={smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' }}
                                users={users}
                                departments={departments || []}
                                courses={courses || []}
                                subjects={subjects || []}
                                currentUser={currentUser}
                                onImportUsers={onImportUsers}
                                onImportStudents={onImportStudents}
                                onDeleteUser={onDeleteUser}
                                onEditUser={onEditUser}
                                onWithdrawRequest={async () => {}}
                                letterheadConfig={companyDetails?.letterheadConfig}
                                logoUrl={companyDetails?.logoUrl}
                                footerImageUrl={companyDetails?.footerImageUrl}
                                onSendSms={onSendSms}
                            />
                        )}

                        {activeTab === 'bank_feeds' && (
                            <BankFeedsManager
                                transactions={carBankTransactions}
                                invoices={carInvoices}
                                onReconcile={async (tid, invId) => {
                                    if (onReconcileBankTransaction) {
                                        await onReconcileBankTransaction(tid, invId);
                                    }
                                }}
                                onFetchFeeds={async () => {
                                    if (onFetchBankFeeds) {
                                        await onFetchBankFeeds();
                                    }
                                }}
                                currentUser={currentUser}
                                institution={institution}
                            />
                        )}

                        {activeTab === 'reports' && (
                            <CarShowroomReportsDashboard
                                institutionId={institution.id}
                                users={users}
                                companyDetails={companyDetails}
                            />
                        )}

                        {activeTab === 'showroom_settings' && (
                            <ShowroomConfigManager
                                institutionId={institution.id}
                            />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};
