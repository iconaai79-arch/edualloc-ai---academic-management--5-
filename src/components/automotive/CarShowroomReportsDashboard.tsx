import React, { useState, useEffect } from 'react';
import { 
    CarListing, 
    CarInvoice, 
    CarPayment, 
    TestDriveBooking, 
    User, 
    Institution, 
    CompanyDetails 
} from '../../types';
import { apiService } from '../../services/apiService';
import * as pdfService from '../../services/pdfService';
import { 
    LayoutDashboard, 
    FileText, 
    Calendar, 
    Search, 
    Eye, 
    User as UserIcon, 
    AlertTriangle, 
    Car, 
    DollarSign, 
    ClipboardList,
    Layers,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Fuel,
    Settings,
    CheckCircle2,
    CalendarCheck,
    Download
} from 'lucide-react';

interface CarShowroomReportsDashboardProps {
    institutionId: string;
    users: User[];
    companyDetails?: CompanyDetails;
}

export function CarShowroomReportsDashboard({ institutionId, users, companyDetails }: CarShowroomReportsDashboardProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'sales' | 'reports'>('overview');
    const [isLoading, setIsLoading] = useState(true);
    const [institution, setInstitution] = useState<Institution | null>(null);

    // Data State
    const [listings, setListings] = useState<CarListing[]>([]);
    const [invoices, setInvoices] = useState<CarInvoice[]>([]);
    const [payments, setPayments] = useState<CarPayment[]>([]);
    const [bookings, setBookings] = useState<TestDriveBooking[]>([]);

    // Search and Filters
    const [inventorySearch, setInventorySearch] = useState('');
    const [inventoryStatusFilter, setInventoryStatusFilter] = useState('all');
    const [inventoryFuelFilter, setInventoryFuelFilter] = useState('all');

    const [salesSearch, setSalesSearch] = useState('');
    const [salesStatusFilter, setSalesStatusFilter] = useState('all');

    // Statement Report State
    const [selectedClient, setSelectedClient] = useState('');
    const [statementStartDate, setStatementStartDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [statementEndDate, setStatementEndDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [isGeneratingStatement, setIsGeneratingStatement] = useState(false);
    const [isGeneratingInventoryPdf, setIsGeneratingInventoryPdf] = useState(false);
    const [isGeneratingSalesPdf, setIsGeneratingSalesPdf] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                const [listingsData, invoicesData, paymentsData, bookingsData, institutions] = await Promise.all([
                    apiService.fetchModuleRecords<CarListing>('car_listings', institutionId),
                    apiService.fetchModuleRecords<CarInvoice>('car_sales_invoices', institutionId),
                    apiService.fetchModuleRecords<CarPayment>('car_sales_payments', institutionId),
                    apiService.fetchModuleRecords<TestDriveBooking>('car_test_drive_bookings', institutionId),
                    apiService.fetchInstitutions(institutionId)
                ]);

                setListings(listingsData || []);
                setInvoices(invoicesData || []);
                setPayments(paymentsData || []);
                setBookings(bookingsData || []);
                setInstitution(institutions[0] || null);
            } catch (error) {
                console.error("Failed to fetch showroom reports data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [institutionId]);

    // --- Overview KPI calculations ---
    const liveInventoryValue = listings
        .filter(c => c.status === 'active')
        .reduce((sum, c) => sum + (c.price || 0), 0);

    const grossShowroomRevenue = payments
        .reduce((sum, p) => sum + (p.amount || 0), 0);

    const outstandingBalances = invoices
        .filter(inv => inv.status !== 'cancelled')
        .reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);

    const totalLeads = bookings.length + listings.reduce((sum, c) => sum + (c.inquiryCount || 0), 0);

    // Get list of clients who have invoices
    const invoiceClients = Array.from(new Set(invoices.map(inv => inv.clientName))).sort();

    // Filters & Searches
    const filteredListings = listings.filter(item => {
        const matchSearch = `${item.make} ${item.model} ${item.registrationNumber || ''}`.toLowerCase().includes(inventorySearch.toLowerCase());
        const matchStatus = inventoryStatusFilter === 'all' || item.status === inventoryStatusFilter;
        const matchFuel = inventoryFuelFilter === 'all' || item.fuelType === inventoryFuelFilter;
        return matchSearch && matchStatus && matchFuel;
    });

    const filteredInvoices = invoices.filter(inv => {
        const matchSearch = `${inv.invoiceNumber} ${inv.clientName} ${inv.registrationNumber || ''}`.toLowerCase().includes(salesSearch.toLowerCase());
        const matchStatus = salesStatusFilter === 'all' || inv.status === salesStatusFilter;
        return matchSearch && matchStatus;
    });

    // --- PDF Generator Triggers ---
    const handleDownloadInventoryPdf = async () => {
        if (!institution) return;
        setIsGeneratingInventoryPdf(true);
        try {
            const dataUri = await pdfService.generateCarShowroomInventoryPdf(
                listings,
                institution,
                companyDetails || ({} as any),
                institution.logoUrl || null
            );
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `Showroom_Inventory_${institution.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            link.click();
        } catch (err) {
            console.error("Inventory PDF failed:", err);
            alert("Could not generate inventory PDF");
        } finally {
            setIsGeneratingInventoryPdf(false);
        }
    };

    const handleDownloadSalesPdf = async () => {
        if (!institution) return;
        setIsGeneratingSalesPdf(true);
        try {
            const dataUri = await pdfService.generateCarSalesSummaryPdf(
                invoices,
                payments,
                institution,
                companyDetails || ({} as any),
                institution.logoUrl || null
            );
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `Showroom_Sales_Summary_${institution.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            link.click();
        } catch (err) {
            console.error("Sales Summary PDF failed:", err);
            alert("Could not generate sales summary PDF");
        } finally {
            setIsGeneratingSalesPdf(false);
        }
    };

    const handleDownloadClientStatementPdf = async (previewOnly: boolean = false) => {
        if (!selectedClient) {
            alert("Please select a client.");
            return;
        }
        if (!institution) return;
        setIsGeneratingStatement(true);
        try {
            const clientInvoices = invoices.filter(inv => {
                const date = inv.createdAt ? inv.createdAt.split('T')[0] : '';
                return inv.clientName === selectedClient && date >= statementStartDate && date <= statementEndDate;
            });

            const clientPayments = payments.filter(pay => {
                const date = pay.paymentDate ? pay.paymentDate.split('T')[0] : '';
                // Locate invoices for this client to filter their payments
                const matchingInvoiceIds = invoices
                    .filter(inv => inv.clientName === selectedClient)
                    .map(inv => inv.id);
                return matchingInvoiceIds.includes(pay.invoiceId) && date >= statementStartDate && date <= statementEndDate;
            });

            const dataUri = await pdfService.generateCarClientStatementPdfDataUri(
                selectedClient,
                clientInvoices,
                clientPayments,
                institution,
                companyDetails || ({} as any),
                institution.logoUrl || null
            );

            if (previewOnly) {
                const blob = await (await fetch(dataUri)).blob();
                const previewUrl = URL.createObjectURL(blob);
                window.open(previewUrl);
            } else {
                const link = document.createElement('a');
                link.href = dataUri;
                link.download = `Client_Statement_${selectedClient.replace(/\s+/g, '_')}_${statementStartDate}_to_${statementEndDate}.pdf`;
                link.click();
            }
        } catch (err) {
            console.error("Statement PDF failed:", err);
            alert("Could not generate statement PDF");
        } finally {
            setIsGeneratingStatement(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading showroom analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-px">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-3.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'overview'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                >
                    <LayoutDashboard className="w-4 h-4" /> Overview
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`px-6 py-3.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'inventory'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                >
                    <Car className="w-4 h-4" /> Showroom Inventory
                </button>
                <button
                    onClick={() => setActiveTab('sales')}
                    className={`px-6 py-3.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'sales'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                >
                    <DollarSign className="w-4 h-4" /> Sales & Revenue
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-6 py-3.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'reports'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                >
                    <ClipboardList className="w-4 h-4" /> Statement Reports
                </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 group hover:scale-[1.02] transition-transform duration-300">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                                <Car className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Live Inventory Value</p>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">KES {liveInventoryValue.toLocaleString()}</h3>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 group hover:scale-[1.02] transition-transform duration-300">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gross Showroom Revenue</p>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">KES {grossShowroomRevenue.toLocaleString()}</h3>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 group hover:scale-[1.02] transition-transform duration-300">
                            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 rounded-2xl text-rose-600 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/50 transition-colors">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Outstanding Balances</p>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">KES {outstandingBalances.toLocaleString()}</h3>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 group hover:scale-[1.02] transition-transform duration-300">
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/50 rounded-2xl text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 transition-colors">
                                <Layers className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Leads & Test Drives</p>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">{totalLeads} Records</h3>
                            </div>
                        </div>
                    </div>

                    {/* Showroom Health Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-950 dark:text-white">Recent Test Drive Requests</h4>
                                <span className="text-xs text-slate-400 font-bold">{bookings.length} schedules</span>
                            </div>
                            {bookings.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs font-bold">No test drive requests scheduled yet.</div>
                            ) : (
                                <div className="space-y-3.5">
                                    {bookings.slice(0, 5).map(b => (
                                        <div key={b.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                                    <CalendarCheck className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">{b.buyerName || 'Anonymous Buyer'}</p>
                                                    <p className="text-xs text-slate-400 font-bold">{b.buyerPhone || 'No Phone'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-slate-800 dark:text-slate-200">{new Date(b.bookingDate).toLocaleDateString()}</p>
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                    b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' :
                                                    b.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400' :
                                                    b.status === 'cancelled' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400' :
                                                    'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                                                }`}>
                                                    {b.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between space-y-4">
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-950 dark:text-white">Inventory Status</h4>
                                <div className="space-y-4 mt-6">
                                    {[
                                        { label: 'Live Available', count: listings.filter(l => l.status === 'active').length, color: 'bg-emerald-500' },
                                        { label: 'Sold Listings', count: listings.filter(l => l.status === 'sold').length, color: 'bg-indigo-500' },
                                        { label: 'Review Pending', count: listings.filter(l => l.status === 'draft').length, color: 'bg-amber-500' },
                                        { label: 'Archived Listings', count: listings.filter(l => l.status === 'archived').length, color: 'bg-slate-400' }
                                    ].map((stat, idx) => {
                                        const percent = listings.length > 0 ? (stat.count / listings.length) * 100 : 0;
                                        return (
                                            <div key={idx} className="space-y-1.5">
                                                <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                                                    <span>{stat.label}</span>
                                                    <span>{stat.count} ({Math.round(percent)}%)</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className={`h-full ${stat.color}`} style={{ width: `${percent}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400 font-bold">
                                <span>Total Fleet Database Size</span>
                                <span className="font-black text-slate-800 dark:text-slate-200">{listings.length} Vehicles</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-grow max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search make, model or registration..."
                                value={inventorySearch}
                                onChange={e => setInventorySearch(e.target.value)}
                                className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-11 pr-5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                            <select
                                value={inventoryStatusFilter}
                                onChange={e => setInventoryStatusFilter(e.target.value)}
                                className="h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 outline-none"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Available</option>
                                <option value="sold">Sold</option>
                                <option value="draft">Review Pending</option>
                                <option value="archived">Archived</option>
                            </select>

                            <select
                                value={inventoryFuelFilter}
                                onChange={e => setInventoryFuelFilter(e.target.value)}
                                className="h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 outline-none"
                            >
                                <option value="all">All Fuels</option>
                                <option value="Petrol">Petrol</option>
                                <option value="Diesel">Diesel</option>
                                <option value="Electric">Electric</option>
                                <option value="Hybrid">Hybrid</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <th className="p-6">Vehicle</th>
                                    <th className="p-6">Specs</th>
                                    <th className="p-6">Mileage</th>
                                    <th className="p-6">Price</th>
                                    <th className="p-6">Views / Inquiries</th>
                                    <th className="p-6">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredListings.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-400 text-xs font-bold">No vehicles match filters.</td>
                                    </tr>
                                ) : (
                                    filteredListings.map(item => (
                                        <tr key={item.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        <Car className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{item.make} {item.model}</p>
                                                        <p className="text-xs text-slate-400 font-mono font-bold uppercase">{item.registrationNumber || 'No Plate'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs text-slate-800 dark:text-slate-200 font-bold">{item.year} Model</p>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase">{item.fuelType} • {item.transmission}</p>
                                                </div>
                                            </td>
                                            <td className="p-6 text-sm font-bold text-slate-800 dark:text-slate-200">
                                                {(item.mileage || 0).toLocaleString()} KM
                                            </td>
                                            <td className="p-6 text-sm font-black text-slate-900 dark:text-white">
                                                KES {(item.price || 0).toLocaleString()}
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                    <span>👁️ {item.viewCount || 0}</span>
                                                    <span>💬 {item.inquiryCount || 0}</span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                                                    item.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' :
                                                    item.status === 'sold' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400' :
                                                    item.status === 'draft' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400' :
                                                    'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-400'
                                                }`}>
                                                    {item.status === 'active' ? 'Available' : item.status === 'sold' ? 'Sold' : item.status === 'draft' ? 'Pending Review' : 'Archived'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Sales Tab */}
            {activeTab === 'sales' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-grow max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search client name, invoice number, plate..."
                                value={salesSearch}
                                onChange={e => setSalesSearch(e.target.value)}
                                className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-11 pr-5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                            />
                        </div>
                        <div>
                            <select
                                value={salesStatusFilter}
                                onChange={e => setSalesStatusFilter(e.target.value)}
                                className="h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 outline-none"
                            >
                                <option value="all">All Invoice Statuses</option>
                                <option value="fully_paid">Fully Paid</option>
                                <option value="partially_paid">Partially Paid</option>
                                <option value="pending">Unpaid/Pending</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <th className="p-6">Invoice #</th>
                                    <th className="p-6">Client Details</th>
                                    <th className="p-6">Car Registration</th>
                                    <th className="p-6">Total Amount</th>
                                    <th className="p-6">Paid Amount</th>
                                    <th className="p-6">Balance</th>
                                    <th className="p-6">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-400 text-xs font-bold">No sales invoices matches criteria.</td>
                                    </tr>
                                ) : (
                                    filteredInvoices.map(inv => (
                                        <tr key={inv.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                                            <td className="p-6 text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                                                {inv.invoiceNumber}
                                            </td>
                                            <td className="p-6">
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">{inv.clientName}</p>
                                                    <p className="text-xs text-slate-400 font-bold">{inv.clientPhone || 'No contact phone'}</p>
                                                </div>
                                            </td>
                                            <td className="p-6 text-xs font-mono font-black uppercase text-slate-800 dark:text-slate-200">
                                                {inv.registrationNumber || 'N/A'}
                                            </td>
                                            <td className="p-6 text-sm font-black text-slate-900 dark:text-white">
                                                KES {(inv.totalAmount || 0).toLocaleString()}
                                            </td>
                                            <td className="p-6 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                KES {(inv.paidAmount || 0).toLocaleString()}
                                            </td>
                                            <td className="p-6 text-sm font-bold text-rose-600 dark:text-rose-400">
                                                KES {(inv.balanceAmount || 0).toLocaleString()}
                                            </td>
                                            <td className="p-6">
                                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                                                    inv.status === 'fully_paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' :
                                                    inv.status === 'partially_paid' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400' :
                                                    inv.status === 'cancelled' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400' :
                                                    'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                                                }`}>
                                                    {inv.status === 'fully_paid' ? 'Fully Paid' : inv.status === 'partially_paid' ? 'Partially Paid' : inv.status === 'cancelled' ? 'Cancelled' : 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Reports & PDF download Tab */}
            {activeTab === 'reports' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* General Reports */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl text-indigo-600 dark:text-indigo-400 w-fit">
                                <Car className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-950 dark:text-white">Showroom Inventory ledger</h4>
                                <p className="text-xs font-bold text-slate-400 mt-1">Generates a complete PDF listing of all vehicles including registration plates, specifications, prices, and statuses.</p>
                            </div>
                            <button
                                onClick={handleDownloadInventoryPdf}
                                disabled={isGeneratingInventoryPdf}
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-550 hover:bg-indigo-600 hover:text-white dark:hover:bg-slate-700 font-black uppercase text-[10px] tracking-widest text-slate-600 dark:text-slate-200 rounded-2xl transition-all flex items-center justify-center gap-2"
                            >
                                {isGeneratingInventoryPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF Report
                            </button>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl text-emerald-600 dark:text-emerald-400 w-fit">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-950 dark:text-white">Sales & Revenue Summary</h4>
                                <p className="text-xs font-bold text-slate-400 mt-1">Export a summary of showroom payments and invoices showing overall invoicing, payments received, and outstanding balances.</p>
                            </div>
                            <button
                                onClick={handleDownloadSalesPdf}
                                disabled={isGeneratingSalesPdf}
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-550 hover:bg-indigo-600 hover:text-white dark:hover:bg-slate-700 font-black uppercase text-[10px] tracking-widest text-slate-600 dark:text-slate-200 rounded-2xl transition-all flex items-center justify-center gap-2"
                            >
                                {isGeneratingSalesPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download Sales Summary
                            </button>
                        </div>
                    </div>

                    {/* Client Statement of Account */}
                    <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-950 dark:text-white">Client Account Statement</h4>
                                <p className="text-xs font-bold text-slate-400">Generate a financial statement displaying invoices and payments for a specific client over a selected date range.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select Showroom Client</label>
                                <select
                                    value={selectedClient}
                                    onChange={e => setSelectedClient(e.target.value)}
                                    className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                >
                                    <option value="">-- Choose Client --</option>
                                    {invoiceClients.map((client, idx) => (
                                        <option key={idx} value={client}>{client}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Start Date</label>
                                    <input
                                        type="date"
                                        value={statementStartDate}
                                        onChange={e => setStatementStartDate(e.target.value)}
                                        className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">End Date</label>
                                    <input
                                        type="date"
                                        value={statementEndDate}
                                        onChange={e => setStatementEndDate(e.target.value)}
                                        className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                            <button
                                onClick={() => handleDownloadClientStatementPdf(true)}
                                disabled={isGeneratingStatement || !selectedClient}
                                className="flex-1 h-12 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-black uppercase text-[10px] tracking-widest text-slate-700 dark:text-slate-200 rounded-2xl transition-all disabled:opacity-50"
                            >
                                Preview Statement
                            </button>
                            <button
                                onClick={() => handleDownloadClientStatementPdf(false)}
                                disabled={isGeneratingStatement || !selectedClient}
                                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isGeneratingStatement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF Statement
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
