import React, { useState, useEffect, useMemo } from 'react';
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
    Download,
    Receipt,
    TrendingUp
} from 'lucide-react';

interface CarShowroomReportsDashboardProps {
    institutionId: string;
    users: User[];
    companyDetails?: CompanyDetails;
}

export function CarShowroomReportsDashboard({ institutionId, users, companyDetails }: CarShowroomReportsDashboardProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'sales' | 'reports' | 'expenses' | 'pnl'>('overview');
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
    const [salesStartDate, setSalesStartDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [salesEndDate, setSalesEndDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

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

    // Expense Report State
    const [expenseStartDate, setExpenseStartDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [expenseEndDate, setExpenseEndDate] = useState(
        new Date().toISOString().split('T')[0]
    );

    // P&L Report State
    const [pnlStartDate, setPnlStartDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [pnlEndDate, setPnlEndDate] = useState(
        new Date().toISOString().split('T')[0]
    );

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

    const flattenedExpenses = useMemo(() => {
        const all: any[] = [];
        listings.forEach(listing => {
            if (listing.importExpenses && Array.isArray(listing.importExpenses)) {
                listing.importExpenses.forEach((exp: any) => {
                    all.push({
                        ...exp,
                        vehicleId: listing.id,
                        vehicleName: `${listing.make} ${listing.model}`,
                        registration: listing.registrationNumber || 'Pending',
                        vehicleStatus: listing.status
                    });
                });
            }
        });
        
        // Filter by date
        return all.filter(exp => {
            const expDate = exp.expenseDate ? exp.expenseDate.split('T')[0] : '';
            return (!expenseStartDate || expDate >= expenseStartDate) && (!expenseEndDate || expDate <= expenseEndDate);
        }).sort((a, b) => new Date(b.expenseDate || 0).getTime() - new Date(a.expenseDate || 0).getTime());
    }, [listings, expenseStartDate, expenseEndDate]);

    const expenseTotals = useMemo(() => {
        let totalKes = 0;
        const byCategory: Record<string, number> = {};
        
        flattenedExpenses.forEach(exp => {
            const amount = exp.amountInKes || 0;
            totalKes += amount;
            byCategory[exp.category] = (byCategory[exp.category] || 0) + amount;
        });
        
        const topCategory = Object.keys(byCategory).length > 0 
            ? Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] 
            : ['None', 0];
            
        return { totalKes, byCategory, topCategory };
    }, [flattenedExpenses]);

    const pnlData = useMemo(() => {
        const soldVehicles = listings.filter(l => l.status === 'sold');
        const vehicleProfits: any[] = [];
        
        let totalRevenue = 0;
        let totalCogs = 0;

        soldVehicles.forEach(vehicle => {
            const vehicleInvoices = invoices.filter(inv => inv.registrationNumber === vehicle.registrationNumber && inv.status !== 'cancelled');
            
            const revenue = vehicleInvoices.length > 0 
                ? vehicleInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
                : vehicle.price || 0;
                
            const cogs = vehicle.totalLandedCost || vehicle.fobPrice || 0;
            const grossProfit = revenue - cogs;
            const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
            
            const saleDate = vehicleInvoices.length > 0 && vehicleInvoices[0].createdAt 
                ? vehicleInvoices[0].createdAt.split('T')[0] 
                : (vehicle.createdAt || '').split('T')[0];
                
            if ((!pnlStartDate || saleDate >= pnlStartDate) && (!pnlEndDate || saleDate <= pnlEndDate)) {
                totalRevenue += revenue;
                totalCogs += cogs;
                vehicleProfits.push({
                    vehicleId: vehicle.id,
                    vehicleName: `${vehicle.make} ${vehicle.model}`,
                    registration: vehicle.registrationNumber || 'N/A',
                    saleDate,
                    revenue,
                    cogs,
                    grossProfit,
                    marginPct
                });
            }
        });
        
        const grossProfit = totalRevenue - totalCogs;
        const avgMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        
        vehicleProfits.sort((a, b) => new Date(b.saleDate || 0).getTime() - new Date(a.saleDate || 0).getTime());

        return { totalRevenue, totalCogs, grossProfit, avgMargin, vehicleProfits };
    }, [listings, invoices, pnlStartDate, pnlEndDate]);

    // Filters & Searches
    const filteredListings = listings.filter(item => {
        const matchSearch = `${item.make} ${item.model} ${item.registrationNumber || ''}`.toLowerCase().includes(inventorySearch.toLowerCase());
        const matchStatus = inventoryStatusFilter === 'all' || item.status === inventoryStatusFilter;
        const matchFuel = inventoryFuelFilter === 'all' || item.fuelType === inventoryFuelFilter;
        return matchSearch && matchStatus && matchFuel;
    });

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchSearch = `${inv.invoiceNumber} ${inv.clientName} ${inv.registrationNumber || ''}`.toLowerCase().includes(salesSearch.toLowerCase());
            const matchStatus = salesStatusFilter === 'all' || inv.status === salesStatusFilter;
            const date = inv.createdAt ? inv.createdAt.split('T')[0] : '';
            const matchDate = (!salesStartDate || date >= salesStartDate) && (!salesEndDate || date <= salesEndDate);
            return matchSearch && matchStatus && matchDate;
        });
    }, [invoices, salesSearch, salesStatusFilter, salesStartDate, salesEndDate]);

    const salesTotals = useMemo(() => {
        let invoiced = 0;
        let collected = 0;
        let due = 0;
        filteredInvoices.forEach(inv => {
            if (inv.status !== 'cancelled') {
                invoiced += inv.totalAmount || 0;
                collected += inv.paidAmount || 0;
                due += inv.balanceAmount || 0;
            }
        });
        return { invoiced, collected, due };
    }, [filteredInvoices]);

    useEffect(() => {
        let active = true;
        let localBlobUrl: string | null = null;

        const updatePreview = async () => {
            if (!institution) return;
            setIsGeneratingPreview(true);
            try {
                const dataUri = await pdfService.generateCarSalesSummaryPdf(
                    filteredInvoices,
                    payments,
                    institution,
                    companyDetails || ({} as any),
                    institution.logoUrl || null
                );
                if (!active) {
                    if (localBlobUrl) {
                        try { URL.revokeObjectURL(localBlobUrl); } catch (e) {}
                    }
                    return;
                }
                
                const base64 = dataUri.split(',')[1];
                const binary = atob(base64);
                const array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    array[i] = binary.charCodeAt(i);
                }
                const blob = new Blob([array], { type: 'application/pdf' });
                localBlobUrl = URL.createObjectURL(blob);
                
                setPdfPreviewUrl(prev => {
                    if (prev) {
                        try {
                            URL.revokeObjectURL(prev);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    return localBlobUrl;
                });
            } catch (err) {
                console.error("Failed to generate live PDF preview:", err);
            } finally {
                if (active) {
                    setIsGeneratingPreview(false);
                }
            }
        };

        const timer = setTimeout(updatePreview, 300);

        return () => {
            active = false;
            clearTimeout(timer);
            if (localBlobUrl) {
                URL.revokeObjectURL(localBlobUrl);
            }
        };
    }, [filteredInvoices, institution, companyDetails, payments]);

    useEffect(() => {
        return () => {
            setPdfPreviewUrl(prev => {
                if (prev) {
                    try {
                        URL.revokeObjectURL(prev);
                    } catch (e) {
                        console.error(e);
                    }
                }
                return null;
            });
        };
    }, []);

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
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`px-6 py-3.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'expenses'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                >
                    <Receipt className="w-4 h-4" /> Expense Analysis
                </button>
                <button
                    onClick={() => setActiveTab('pnl')}
                    className={`px-6 py-3.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'pnl'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                >
                    <TrendingUp className="w-4 h-4" /> P&L Analysis
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
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">KES {liveInventoryValue?.toLocaleString()}</h3>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 group hover:scale-[1.02] transition-transform duration-300">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gross Showroom Revenue</p>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">KES {grossShowroomRevenue?.toLocaleString()}</h3>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 group hover:scale-[1.02] transition-transform duration-300">
                            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 rounded-2xl text-rose-600 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/50 transition-colors">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Outstanding Balances</p>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">KES {outstandingBalances?.toLocaleString()}</h3>
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
                                                {(item.mileage || 0)?.toLocaleString()} KM
                                            </td>
                                            <td className="p-6 text-sm font-black text-slate-900 dark:text-white">
                                                KES {(item.price || 0)?.toLocaleString()}
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Filters and Table */}
                    <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                            <div className="relative w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search client name, invoice number, plate..."
                                    value={salesSearch}
                                    onChange={e => setSalesSearch(e.target.value)}
                                    className="w-full h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-11 pr-5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <select
                                    value={salesStatusFilter}
                                    onChange={e => setSalesStatusFilter(e.target.value)}
                                    className="flex-grow sm:flex-grow-0 h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 outline-none"
                                >
                                    <option value="all">All Invoice Statuses</option>
                                    <option value="fully_paid">Fully Paid</option>
                                    <option value="partially_paid">Partially Paid</option>
                                    <option value="pending">Unpaid/Pending</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>

                                <div className="flex-grow sm:flex-grow-0 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 rounded-2xl px-3 h-11">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">From</span>
                                        <input
                                            type="date"
                                            value={salesStartDate}
                                            onChange={e => setSalesStartDate(e.target.value)}
                                            className="bg-transparent border-none p-0 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-0 w-28"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">To</span>
                                        <input
                                            type="date"
                                            value={salesEndDate}
                                            onChange={e => setSalesEndDate(e.target.value)}
                                            className="bg-transparent border-none p-0 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-0 w-28"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto flex-grow max-h-[600px] overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 sticky top-0 bg-white dark:bg-slate-900 z-10">
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
                                                    KES {(inv.totalAmount || 0)?.toLocaleString()}
                                                </td>
                                                <td className="p-6 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                    KES {(inv.paidAmount || 0)?.toLocaleString()}
                                                </td>
                                                <td className="p-6 text-sm font-bold text-rose-600 dark:text-rose-400">
                                                    KES {(inv.balanceAmount || 0)?.toLocaleString()}
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

                    {/* Right Column: PDF Preview and Totals */}
                    <div className="lg:col-span-5 flex flex-col space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col h-[650px] shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">On-Screen PDF Report</h4>
                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Auto-updates as filters change</p>
                                </div>
                                {pdfPreviewUrl && (
                                    <button
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = pdfPreviewUrl;
                                            link.download = `Showroom_Sales_Summary_${institution?.name.replace(/\s+/g, '_')}_${salesStartDate}_to_${salesEndDate}.pdf`;
                                            link.click();
                                        }}
                                        disabled={isGeneratingPreview}
                                        className="h-9 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-550 hover:bg-indigo-600 hover:text-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-800/50"
                                        title="Download Report PDF"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Download
                                    </button>
                                )}
                            </div>

                            <div className="flex-grow bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-850 relative">
                                {isGeneratingPreview && (
                                    <div className="absolute top-3 right-3 z-20 bg-white/80 dark:bg-slate-900/80 p-2 rounded-full shadow-md backdrop-blur-sm">
                                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                                    </div>
                                )}
                                {pdfPreviewUrl ? (
                                    <iframe
                                        src={`${pdfPreviewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                                        className="w-full h-full border-none"
                                        title="Sales PDF Preview"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs font-bold gap-3">
                                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                        <span className="uppercase tracking-widest text-[9px]">Generating live PDF...</span>
                                    </div>
                                )}
                            </div>

                            {/* Total summaries for both collected and due at bottom of preview */}
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100/10">
                                    <span className="block text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Total Revenue Collected</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white mt-1 block">KES {salesTotals.collected?.toLocaleString()}</span>
                                </div>
                                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-100/10">
                                    <span className="block text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Total Outstanding Due</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white mt-1 block">KES {salesTotals.due?.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
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

            {/* Expense Analysis Tab */}
            {activeTab === 'expenses' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Import Expense Analysis</h3>
                                <p className="text-xs text-slate-400 font-bold mt-1">Aggregated logistics, duties, and overhead costs</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-2xl px-3 h-11">
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">From</span>
                                    <input
                                        type="date"
                                        value={expenseStartDate}
                                        onChange={e => setExpenseStartDate(e.target.value)}
                                        className="bg-transparent border-none p-0 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-0 w-28"
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-2xl px-3 h-11">
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">To</span>
                                    <input
                                        type="date"
                                        value={expenseEndDate}
                                        onChange={e => setExpenseEndDate(e.target.value)}
                                        className="bg-transparent border-none p-0 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-0 w-28"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="p-5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-wider text-rose-500 mb-1">Total Showroom Expenses</p>
                                <h4 className="text-2xl font-black text-rose-600 dark:text-rose-400">KES {expenseTotals.totalKes?.toLocaleString()}</h4>
                            </div>
                            <div className="p-5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500 mb-1">Top Expense Category</p>
                                <h4 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{expenseTotals.topCategory[0]}</h4>
                                <p className="text-xs text-indigo-500/70 font-bold mt-1">KES {Number(expenseTotals.topCategory[1])?.toLocaleString()}</p>
                            </div>
                            <div className="p-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Expenses Logged</p>
                                <h4 className="text-2xl font-black text-slate-700 dark:text-slate-300">{flattenedExpenses.length} Records</h4>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Vehicle</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4">Description</th>
                                        <th className="p-4 text-right">Original Amount</th>
                                        <th className="p-4 text-right">KES Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {flattenedExpenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-400 text-xs font-bold">No expenses found for the selected dates.</td>
                                        </tr>
                                    ) : (
                                        flattenedExpenses.map((exp, idx) => (
                                            <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                                <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                                                    {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white">{exp.vehicleName}</p>
                                                    <p className="text-[10px] font-mono text-slate-400">{exp.registration}</p>
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                                        {exp.category}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-xs text-slate-500 font-medium">
                                                    {exp.description || '-'}
                                                </td>
                                                <td className="p-4 text-xs font-black text-slate-500 text-right">
                                                    {exp.currency} {Number(exp.amount)?.toLocaleString()}
                                                </td>
                                                <td className="p-4 text-sm font-black text-rose-600 dark:text-rose-400 text-right">
                                                    {Number(exp.amountInKes)?.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* P&L Analysis Tab */}
            {activeTab === 'pnl' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Profit & Loss Analysis</h3>
                                <p className="text-xs text-slate-400 font-bold mt-1">Real-time unit economics and profit margins</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-2xl px-3 h-11">
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">From</span>
                                    <input
                                        type="date"
                                        value={pnlStartDate}
                                        onChange={e => setPnlStartDate(e.target.value)}
                                        className="bg-transparent border-none p-0 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-0 w-28"
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-2xl px-3 h-11">
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">To</span>
                                    <input
                                        type="date"
                                        value={pnlEndDate}
                                        onChange={e => setPnlEndDate(e.target.value)}
                                        className="bg-transparent border-none p-0 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-0 w-28"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 mb-1">Gross Revenue</p>
                                <h4 className="text-xl font-black text-emerald-700 dark:text-emerald-400">KES {pnlData.totalRevenue?.toLocaleString()}</h4>
                            </div>
                            <div className="p-5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 mb-1">Cost of Goods (COGS)</p>
                                <h4 className="text-xl font-black text-rose-700 dark:text-rose-400">KES {pnlData.totalCogs?.toLocaleString()}</h4>
                            </div>
                            <div className="p-5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-1">Gross Profit</p>
                                <h4 className="text-xl font-black text-indigo-700 dark:text-indigo-400">KES {pnlData.grossProfit?.toLocaleString()}</h4>
                            </div>
                            <div className="p-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Avg Net Margin</p>
                                <h4 className={`text-xl font-black ${pnlData.avgMargin >= 15 ? 'text-emerald-600 dark:text-emerald-400' : pnlData.avgMargin > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {pnlData.avgMargin.toFixed(1)}%
                                </h4>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="p-4">Sale Date</th>
                                        <th className="p-4">Vehicle</th>
                                        <th className="p-4 text-right">Revenue (Sale Price)</th>
                                        <th className="p-4 text-right">COGS (Landed Cost)</th>
                                        <th className="p-4 text-right">Gross Profit</th>
                                        <th className="p-4 text-right">Margin</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pnlData.vehicleProfits.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-400 text-xs font-bold">No sold vehicles found for the selected dates.</td>
                                        </tr>
                                    ) : (
                                        pnlData.vehicleProfits.map((item: any, idx: number) => (
                                            <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                                <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                                                    {item.saleDate ? new Date(item.saleDate).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white">{item.vehicleName}</p>
                                                    <p className="text-[10px] font-mono text-slate-400">{item.registration}</p>
                                                </td>
                                                <td className="p-4 text-sm font-black text-slate-700 dark:text-slate-300 text-right">
                                                    {Number(item.revenue)?.toLocaleString()}
                                                </td>
                                                <td className="p-4 text-sm font-black text-rose-600 dark:text-rose-400 text-right">
                                                    {Number(item.cogs)?.toLocaleString()}
                                                </td>
                                                <td className="p-4 text-sm font-black text-emerald-600 dark:text-emerald-400 text-right">
                                                    {Number(item.grossProfit)?.toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider ${
                                                        item.marginPct >= 15 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' :
                                                        item.marginPct > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                                                        'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'
                                                    }`}>
                                                        {item.marginPct.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
