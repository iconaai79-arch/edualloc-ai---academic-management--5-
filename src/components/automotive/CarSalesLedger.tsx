
import React, { useState, useMemo, useEffect } from 'react';
import { CarInvoice, CarPayment, CarListing } from '../../types';
import { 
    CreditCard, 
    ArrowLeftRight, 
    FileText, 
    CheckCircle, 
    XCircle,
    Search,
    Download,
    Printer,
    Coins,
    Plus,
    CalendarDays,
    Send,
    Link,
    Smartphone,
    Sparkles,
    Copy,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Filter,
    ArrowUpDown
} from 'lucide-react';
import { apiService } from '../../services/apiService';

interface CarSalesLedgerProps {
    invoices: CarInvoice[];
    payments: CarPayment[];
    listings: CarListing[];
    onAddInvoice: () => void;
    onAddPayment: (invoice?: CarInvoice) => void;
    onPrintInvoice: (invoice: CarInvoice) => void;
    onPrintReceipt: (payment: CarPayment) => void;
    onPrintAgreement?: (invoice: CarInvoice) => void;
    onEditInvoice?: (invoice: CarInvoice) => void;
    onEditPayment?: (payment: CarPayment) => void;
    onDeleteInvoice?: (invoiceId: string) => Promise<void>;
    onDeletePayment?: (paymentId: string) => Promise<void>;
    institutionId?: string;
}

export const CarSalesLedger: React.FC<CarSalesLedgerProps> = ({
    invoices,
    payments,
    listings,
    onAddInvoice,
    onAddPayment,
    onPrintInvoice,
    onPrintReceipt,
    onPrintAgreement,
    onEditInvoice,
    onEditPayment,
    onDeleteInvoice,
    onDeletePayment,
    institutionId
}) => {
    const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
    const [searchQuery, setSearchQuery] = useState('');
    const [showStkModal, setShowStkModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<CarInvoice | null>(null);
    const [stkPhone, setStkPhone] = useState('');
    const [stkAmount, setStkAmount] = useState('');
    const [stkLoading, setStkLoading] = useState(false);
    const [stkStatus, setStkStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
    const [stkMessage, setStkMessage] = useState('');

    // Bulk Invoice Reminders State
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [showBulkRemindersModal, setShowBulkRemindersModal] = useState(false);
    const [bulkRemindersProgress, setBulkRemindersProgress] = useState(0);
    const [bulkRemindersStatus, setBulkRemindersStatus] = useState<'idle' | 'sending' | 'completed' | 'failed'>('idle');
    const [bulkRemindersLogs, setBulkRemindersLogs] = useState<string[]>([]);
    const [bulkRemindersMessages, setBulkRemindersMessages] = useState<Record<string, string>>({});
    const [bulkRemindersPhones, setBulkRemindersPhones] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchSettings = async () => {
            const instId = institutionId || invoices[0]?.institutionId;
            if (!instId) return;
            try {
                const records = await apiService.fetchModuleRecords<any>('showroom_settings', instId);
                if (records && records.length > 0) {
                    setSettings(records[0]);
                }
            } catch (err) {
                console.error("Failed to load showroom settings for bulk reminders:", err);
            }
        };
        fetchSettings();
    }, [institutionId, invoices]);

    const replacePlaceholders = (template: string, invoice: CarInvoice, listing?: CarListing) => {
        return template
            .replace(/{client_name}/g, invoice.clientName || '')
            .replace(/{amount_due}/g, (invoice.balanceAmount ?? (invoice.totalAmount - invoice.paidAmount))?.toLocaleString())
            .replace(/{registration_number}/g, invoice.registrationNumber || listing?.registrationNumber || 'N/A')
            .replace(/{invoice_number}/g, invoice.invoiceNumber || '')
            .replace(/{due_date}/g, invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A');
    };

    // Sorting & Filtering State
    const [invoiceSortKey, setInvoiceSortKey] = useState<'date' | 'clientName' | 'amount' | 'status'>('date');
    const [invoiceSortOrder, setInvoiceSortOrder] = useState<'asc' | 'desc'>('desc');
    const [paymentSortKey, setPaymentSortKey] = useState<'date' | 'clientName' | 'amount' | 'method'>('date');
    const [paymentSortOrder, setPaymentSortOrder] = useState<'asc' | 'desc'>('desc');
    
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'fully_paid' | 'partially_paid' | 'pending' | 'cancelled'>('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
    
    const [invoiceDateFilter, setInvoiceDateFilter] = useState<'all' | '7days' | '30days' | 'thisMonth' | 'thisYear'>('all');
    const [paymentDateFilter, setPaymentDateFilter] = useState<'all' | '7days' | '30days' | 'thisMonth' | 'thisYear'>('all');

    // Pagination State
    const [invoicePage, setInvoicePage] = useState(1);
    const [paymentPage, setPaymentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const isWithinDateRange = (dateStr: string | Date | undefined, filter: string) => {
        if (filter === 'all' || !dateStr) return true;
        const date = new Date(dateStr);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (filter) {
            case '7days': {
                const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
                return date >= sevenDaysAgo;
            }
            case '30days': {
                const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
                return date >= thirtyDaysAgo;
            }
            case 'thisMonth': {
                return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
            }
            case 'thisYear': {
                return date.getFullYear() === now.getFullYear();
            }
            default:
                return true;
        }
    };

    const sortedFilteredInvoices = useMemo(() => {
        const filtered = invoices.filter(inv => {
            const matchesSearch = 
                inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
                
            const matchesStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
            const matchesDate = isWithinDateRange(inv.createdAt, invoiceDateFilter);
            
            return matchesSearch && matchesStatus && matchesDate;
        });

        return filtered.sort((a, b) => {
            let comparison = 0;
            if (invoiceSortKey === 'date') {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                comparison = dateA - dateB;
            } else if (invoiceSortKey === 'clientName') {
                comparison = a.clientName.localeCompare(b.clientName);
            } else if (invoiceSortKey === 'amount') {
                comparison = a.totalAmount - b.totalAmount;
            } else if (invoiceSortKey === 'status') {
                comparison = a.status.localeCompare(b.status);
            }
            return invoiceSortOrder === 'asc' ? comparison : -comparison;
        });
    }, [invoices, searchQuery, invoiceStatusFilter, invoiceDateFilter, invoiceSortKey, invoiceSortOrder]);

    const sortedFilteredPayments = useMemo(() => {
        const filtered = payments.filter(pay => {
            const query = searchQuery.toLowerCase().trim();
            let matchesSearch = true;
            if (query) {
                const matchesPaymentId = pay.id.toLowerCase().includes(query);
                const matchesRef = pay.transactionReference?.toLowerCase().includes(query);
                const inv = invoices.find(i => i.id === pay.invoiceId);
                const matchesClient = inv?.clientName?.toLowerCase().includes(query);
                const matchesInvNumber = inv?.invoiceNumber?.toLowerCase().includes(query);
                const matchesRegNumber = inv?.registrationNumber?.toLowerCase().includes(query);
                matchesSearch = matchesPaymentId || matchesRef || matchesClient || matchesInvNumber || matchesRegNumber;
            }
            
            const matchesMethod = paymentMethodFilter === 'all' || pay.paymentMethod === paymentMethodFilter;
            const matchesDate = isWithinDateRange(pay.paymentDate, paymentDateFilter);
            
            return matchesSearch && matchesMethod && matchesDate;
        });

        return filtered.sort((a, b) => {
            let comparison = 0;
            if (paymentSortKey === 'date') {
                const dateA = new Date(a.paymentDate || 0).getTime();
                const dateB = new Date(b.paymentDate || 0).getTime();
                comparison = dateA - dateB;
            } else if (paymentSortKey === 'clientName') {
                const invA = invoices.find(i => i.id === a.invoiceId);
                const invB = invoices.find(i => i.id === b.invoiceId);
                const nameA = invA?.clientName || 'Valued Customer';
                const nameB = invB?.clientName || 'Valued Customer';
                comparison = nameA.localeCompare(nameB);
            } else if (paymentSortKey === 'amount') {
                comparison = a.amount - b.amount;
            } else if (paymentSortKey === 'method') {
                comparison = a.paymentMethod.localeCompare(b.paymentMethod);
            }
            return paymentSortOrder === 'asc' ? comparison : -comparison;
        });
    }, [payments, invoices, searchQuery, paymentMethodFilter, paymentDateFilter, paymentSortKey, paymentSortOrder]);

    const paymentMethods = useMemo(() => {
        const methods = new Set<string>();
        payments.forEach(p => {
            if (p.paymentMethod) methods.add(p.paymentMethod);
        });
        return Array.from(methods);
    }, [payments]);

    const paginatedInvoices = useMemo(() => {
        const startIndex = (invoicePage - 1) * itemsPerPage;
        return sortedFilteredInvoices.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedFilteredInvoices, invoicePage, itemsPerPage]);

    const paginatedPayments = useMemo(() => {
        const startIndex = (paymentPage - 1) * itemsPerPage;
        return sortedFilteredPayments.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedFilteredPayments, paymentPage, itemsPerPage]);

    const totalInvoicePages = Math.ceil(sortedFilteredInvoices.length / itemsPerPage);
    const totalPaymentPages = Math.ceil(sortedFilteredPayments.length / itemsPerPage);

    const filteredInvoices = sortedFilteredInvoices; 
    const filteredPayments = sortedFilteredPayments; 

    const outstandingInvoices = useMemo(() => {
        return sortedFilteredInvoices.filter(inv => inv.status !== 'fully_paid' && inv.status !== 'cancelled');
    }, [sortedFilteredInvoices]);

    const stats = useMemo(() => {
        const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalCollected = payments.reduce((sum, pay) => sum + pay.amount, 0);
        const outstanding = totalSales - totalCollected;
        return { totalSales, totalCollected, outstanding };
    }, [invoices, payments]);

    const isAllSelected = useMemo(() => {
        if (outstandingInvoices.length === 0) return false;
        return outstandingInvoices.every(inv => selectedInvoiceIds.includes(inv.id));
    }, [outstandingInvoices, selectedInvoiceIds]);

    const handleSelectAll = () => {
        if (isAllSelected) {
            const idsToRemove = outstandingInvoices.map(inv => inv.id);
            setSelectedInvoiceIds(prev => prev.filter(id => !idsToRemove.includes(id)));
        } else {
            const idsToAdd = outstandingInvoices.map(inv => inv.id).filter(id => !selectedInvoiceIds.includes(id));
            setSelectedInvoiceIds(prev => [...prev, ...idsToAdd]);
        }
    };

    const handleSelectRow = (id: string) => {
        setSelectedInvoiceIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleOpenBulkReminders = () => {
        const selectedInvs = invoices.filter(inv => selectedInvoiceIds.includes(inv.id));
        const rawReminders = settings?.invoiceReminders || settings?.invoice_reminders;
        const template = rawReminders?.template || 
            'Dear {client_name}, this is a reminder that your payment of KES {amount_due} for vehicle {registration_number} (invoice {invoice_number}) is due on {due_date}. Please clear it to avoid service disruption.';
        
        const msgs: Record<string, string> = {};
        const phones: Record<string, string> = {};
        
        selectedInvs.forEach(inv => {
            const listing = listings.find(l => l.id === inv.listingId);
            msgs[inv.id] = replacePlaceholders(template, inv, listing);
            phones[inv.id] = inv.clientPhone || '';
        });
        
        setBulkRemindersMessages(msgs);
        setBulkRemindersPhones(phones);
        setBulkRemindersStatus('idle');
        setBulkRemindersProgress(0);
        setBulkRemindersLogs([]);
        setShowBulkRemindersModal(true);
    };

    const handleSendBulkReminders = async () => {
        const selectedInvs = invoices.filter(inv => selectedInvoiceIds.includes(inv.id));
        if (selectedInvs.length === 0) return;

        setBulkRemindersStatus('sending');
        setBulkRemindersProgress(0);
        setBulkRemindersLogs([]);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < selectedInvs.length; i++) {
            const inv = selectedInvs[i];
            const msg = bulkRemindersMessages[inv.id];
            const phone = bulkRemindersPhones[inv.id];
            const clientName = inv.clientName;

            const logPrefix = `[${i + 1}/${selectedInvs.length}] ${clientName}`;
            setBulkRemindersLogs(prev => [...prev, `${logPrefix}: Initializing SMS...`]);

            if (!phone || phone.trim().length < 9) {
                setBulkRemindersLogs(prev => [...prev, `❌ ${logPrefix}: Failed - Invalid/Empty phone number.`]);
                failCount++;
                setBulkRemindersProgress(Math.round(((i + 1) / selectedInvs.length) * 100));
                continue;
            }

            try {
                const res = await apiService.sendSms(
                    phone.trim(), 
                    msg, 
                    undefined, 
                    1, 
                    inv.institutionId
                );
                if (res && (res.success || res.status === 'success' || res.ResponseCode === '0')) {
                    setBulkRemindersLogs(prev => [...prev, `✅ ${logPrefix}: Sent successfully!`]);
                    successCount++;
                } else {
                    const errMsg = res?.message || "Rejected by gateway";
                    setBulkRemindersLogs(prev => [...prev, `❌ ${logPrefix}: Failed - ${errMsg}`]);
                    failCount++;
                }
            } catch (err: any) {
                setBulkRemindersLogs(prev => [...prev, `❌ ${logPrefix}: Connection error - ${err.message || err}`]);
                failCount++;
            }

            setBulkRemindersProgress(Math.round(((i + 1) / selectedInvs.length) * 100));
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        setBulkRemindersStatus('completed');
        setBulkRemindersLogs(prev => [
            ...prev,
            `--- Summary: Sent ${successCount} successfully, ${failCount} failed. ---`
        ]);
        setSelectedInvoiceIds([]);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Ledger Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-indigo-600">
                            <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Sales Value</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">KES {stats.totalSales?.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">{invoices.length} Invoices Generated</p>
                </div>
                <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 dark:shadow-none">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Revenue Collected</span>
                    </div>
                    <p className="text-3xl font-black leading-none">KES {stats.totalCollected?.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-2">{payments.length} Payments Recorded</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-amber-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-amber-600">
                            <ArrowLeftRight className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Outstanding</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">KES {stats.outstanding?.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-2 italic font-black">Requires Follow-up</p>
                </div>
            </div>

            {/* Controls & List */}
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl w-full md:w-auto">
                        <button 
                            onClick={() => setActiveTab('invoices')}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'invoices' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Invoices
                        </button>
                        <button 
                            onClick={() => setActiveTab('payments')}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'payments' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Sales & Revenue
                        </button>
                    </div>

                    <div className="flex flex-grow max-w-md w-full relative group">
                        <input 
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 pl-12 pr-6 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        <Search className="w-4 h-4 absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>

                    <div className="flex gap-3">
                        {activeTab === 'invoices' && selectedInvoiceIds.length > 0 && (
                            <button 
                                onClick={handleOpenBulkReminders}
                                className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-100 hover:bg-amber-700 transition-all active:scale-95 animate-fade-in"
                            >
                                <Send className="w-4 h-4" /> Bulk Reminder ({selectedInvoiceIds.length})
                            </button>
                        )}
                        <button 
                            onClick={onAddInvoice}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> New Invoice
                        </button>
                        <button 
                            onClick={() => onAddPayment()}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Record Payment
                        </button>
                    </div>
                </div>

                {/* Filters & Sorting Panel */}
                <div className="px-8 py-4 bg-slate-50/50 dark:bg-slate-900/10 border-b border-slate-50 dark:border-slate-700 flex flex-wrap items-center gap-6">
                    {activeTab === 'invoices' ? (
                        <>
                            {/* Invoice Status Filter */}
                            <div className="flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status:</span>
                                <select
                                    value={invoiceStatusFilter}
                                    onChange={(e) => {
                                        setInvoiceStatusFilter(e.target.value as any);
                                        setInvoicePage(1);
                                    }}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-650 dark:text-slate-350 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <option value="all">ALL STATUSES</option>
                                    <option value="pending">PENDING</option>
                                    <option value="partially_paid">PARTIALLY PAID</option>
                                    <option value="fully_paid">FULLY PAID</option>
                                    <option value="cancelled">CANCELLED</option>
                                </select>
                            </div>

                            {/* Invoice Date Filter */}
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Period:</span>
                                <select
                                    value={invoiceDateFilter}
                                    onChange={(e) => {
                                        setInvoiceDateFilter(e.target.value as any);
                                        setInvoicePage(1);
                                    }}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-655 dark:text-slate-350 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <option value="all">ALL TIME</option>
                                    <option value="7days">LAST 7 DAYS</option>
                                    <option value="30days">LAST 30 DAYS</option>
                                    <option value="thisMonth">THIS MONTH</option>
                                    <option value="thisYear">THIS YEAR</option>
                                </select>
                            </div>

                            {/* Invoice Sort */}
                            <div className="flex items-center gap-2">
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sort By:</span>
                                <select
                                    value={`${invoiceSortKey}-${invoiceSortOrder}`}
                                    onChange={(e) => {
                                        const [key, order] = e.target.value.split('-');
                                        setInvoiceSortKey(key as any);
                                        setInvoiceSortOrder(order as any);
                                    }}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-655 dark:text-slate-350 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <option value="date-desc">DATE (NEWEST FIRST)</option>
                                    <option value="date-asc">DATE (OLDEST FIRST)</option>
                                    <option value="clientName-asc">CLIENT NAME (A-Z)</option>
                                    <option value="clientName-desc">CLIENT NAME (Z-A)</option>
                                    <option value="amount-desc">AMOUNT (HIGH TO LOW)</option>
                                    <option value="amount-asc">AMOUNT (LOW TO HIGH)</option>
                                    <option value="status-asc">STATUS</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Payment Method Filter */}
                            <div className="flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Method:</span>
                                <select
                                    value={paymentMethodFilter}
                                    onChange={(e) => {
                                        setPaymentMethodFilter(e.target.value);
                                        setPaymentPage(1);
                                    }}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-655 dark:text-slate-350 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <option value="all">ALL METHODS</option>
                                    {paymentMethods.map(m => (
                                        <option key={m} value={m}>{m.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Payment Date Filter */}
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Period:</span>
                                <select
                                    value={paymentDateFilter}
                                    onChange={(e) => {
                                        setPaymentDateFilter(e.target.value as any);
                                        setPaymentPage(1);
                                    }}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-655 dark:text-slate-350 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <option value="all">ALL TIME</option>
                                    <option value="7days">LAST 7 DAYS</option>
                                    <option value="30days">LAST 30 DAYS</option>
                                    <option value="thisMonth">THIS MONTH</option>
                                    <option value="thisYear">THIS YEAR</option>
                                </select>
                            </div>

                            {/* Payment Sort */}
                            <div className="flex items-center gap-2">
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sort By:</span>
                                <select
                                    value={`${paymentSortKey}-${paymentSortOrder}`}
                                    onChange={(e) => {
                                        const [key, order] = e.target.value.split('-');
                                        setPaymentSortKey(key as any);
                                        setPaymentSortOrder(order as any);
                                    }}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-655 dark:text-slate-350 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <option value="date-desc">DATE (NEWEST FIRST)</option>
                                    <option value="date-asc">DATE (OLDEST FIRST)</option>
                                    <option value="clientName-asc">CUSTOMER NAME (A-Z)</option>
                                    <option value="clientName-desc">CUSTOMER NAME (Z-A)</option>
                                    <option value="amount-desc">AMOUNT (HIGH TO LOW)</option>
                                    <option value="amount-asc">AMOUNT (LOW TO HIGH)</option>
                                    <option value="method-asc">PAYMENT METHOD</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50">
                                {activeTab === 'invoices' ? (
                                    <>
                                        <th className="pl-8 py-6 w-12">
                                            <input 
                                                type="checkbox" 
                                                checked={isAllSelected}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900 cursor-pointer"
                                                disabled={outstandingInvoices.length === 0}
                                            />
                                        </th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle / Reference</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Financials</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Name</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Car Registration Number</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Number</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Reference</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {activeTab === 'invoices' ? (
                                paginatedInvoices.map(inv => {
                                    const listing = listings.find(l => l.id === inv.listingId);
                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                                            {activeTab === 'invoices' && (
                                                <td className="pl-8 py-6">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedInvoiceIds.includes(inv.id)}
                                                        onChange={() => handleSelectRow(inv.id)}
                                                        disabled={inv.status === 'fully_paid' || inv.status === 'cancelled'}
                                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-8 py-6 text-sm font-bold text-slate-600 dark:text-slate-400">
                                                {new Date(inv.createdAt || Date.now()).toLocaleDateString()}
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{inv.clientName}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Invoice #{inv.invoiceNumber}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                                                        <ArrowLeftRight className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase">{listing ? `${listing.year} ${listing.make} ${listing.model}` : 'Special Order'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <p className="text-sm font-black text-slate-900 dark:text-white italic">KES {inv.totalAmount?.toLocaleString()}</p>
                                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">Net Payable</p>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    inv.status === 'fully_paid' ? 'bg-emerald-50 text-emerald-600' : 
                                                    inv.status === 'partially_paid' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {inv.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {onEditInvoice && (
                                                        <button 
                                                            onClick={() => onEditInvoice(inv)}
                                                            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                                                            title="Edit Invoice"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {onDeleteInvoice && (
                                                        <button 
                                                            onClick={async () => {
                                                                if (window.confirm("Are you sure you want to delete this invoice?")) {
                                                                    await onDeleteInvoice(inv.id);
                                                                }
                                                            }}
                                                            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-red-600 transition-all"
                                                            title="Delete Invoice"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => onPrintInvoice(inv)}
                                                        className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                                                        title="Print Invoice"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                    {onPrintAgreement && (
                                                        <button 
                                                            onClick={() => onPrintAgreement(inv)}
                                                            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-amber-600 transition-all"
                                                            title="Print Agreement"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => {
                                                            const payUrl = `${window.location.origin}/?view=pay-car-invoice&id=${inv.id}`;
                                                            navigator.clipboard.writeText(payUrl);
                                                            alert(`Payment link copied successfully!\n${payUrl}`);
                                                        }}
                                                        className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-emerald-600 transition-all"
                                                        title="Copy Self-Service Payment Link"
                                                    >
                                                        <Link className="w-4 h-4" />
                                                    </button>
                                                    {inv.status !== 'fully_paid' && (
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedInvoice(inv);
                                                                setStkPhone(inv.clientPhone || '');
                                                                setStkAmount(String(inv.balanceAmount || inv.totalAmount - (inv.paidAmount || 0)));
                                                                setShowStkModal(true);
                                                                setStkStatus('idle');
                                                                setStkMessage('');
                                                            }}
                                                            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                                                            title="Send STK Push Prompt"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {inv.status !== 'fully_paid' && (
                                                        <button 
                                                            onClick={() => onAddPayment(inv)}
                                                            className="px-4 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                                                        >
                                                            Pay
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                paginatedPayments.map(pay => {
                                    const inv = invoices.find(i => i.id === pay.invoiceId);
                                    return (
                                        <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                                            {/* Date */}
                                            <td className="px-8 py-6 text-sm font-bold text-slate-600 dark:text-slate-400">
                                                {new Date(pay.paymentDate).toLocaleDateString()}
                                            </td>
                                            {/* Customer Name */}
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                    {inv?.clientName || 'Valued Customer'}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                                    Method: {pay.paymentMethod}
                                                </p>
                                            </td>
                                            {/* Car Registration Number */}
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-500">
                                                        <ArrowLeftRight className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase">
                                                            {inv?.registrationNumber || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Invoice Number */}
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                    #{inv?.invoiceNumber || 'N/A'}
                                                </p>
                                            </td>
                                            {/* Transaction Reference */}
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                                    {pay.transactionReference || 'CASH / DIRECT'}
                                                </p>
                                            </td>
                                            {/* Amount */}
                                            <td className="px-8 py-6 text-right">
                                                <p className="text-sm font-black text-emerald-600 italic">
                                                    KES {pay.amount?.toLocaleString()}
                                                </p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                    Paid
                                                </p>
                                            </td>
                                            {/* Status */}
                                            <td className="px-8 py-6 text-center">
                                                <span className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                                                    Completed
                                                </span>
                                            </td>
                                            {/* Actions */}
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {onEditPayment && (
                                                        <button 
                                                            onClick={() => onEditPayment(pay)}
                                                            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                                                            title="Edit Payment"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {onDeletePayment && (
                                                        <button 
                                                            onClick={async () => {
                                                                if (window.confirm("Are you sure you want to delete this payment?")) {
                                                                    await onDeletePayment(pay.id);
                                                                }
                                                            }}
                                                            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-red-600 transition-all"
                                                            title="Delete Payment"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {((activeTab === 'invoices' ? sortedFilteredInvoices : sortedFilteredPayments).length > 0) && (
                    <div className="px-8 py-5 bg-white dark:bg-slate-800 border-t border-slate-50 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                        {/* Entry info */}
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                Showing {activeTab === 'invoices' 
                                    ? `${Math.min(sortedFilteredInvoices.length, (invoicePage - 1) * itemsPerPage + 1)} to ${Math.min(sortedFilteredInvoices.length, invoicePage * itemsPerPage)} of ${sortedFilteredInvoices.length}`
                                    : `${Math.min(sortedFilteredPayments.length, (paymentPage - 1) * itemsPerPage + 1)} to ${Math.min(sortedFilteredPayments.length, paymentPage * itemsPerPage)} of ${sortedFilteredPayments.length}`
                                } entries
                            </span>
                            
                            {/* Page size selector */}
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Per Page:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setInvoicePage(1);
                                        setPaymentPage(1);
                                    }}
                                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-350 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>

                        {/* Page Buttons */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => activeTab === 'invoices' ? setInvoicePage(p => Math.max(1, p - 1)) : setPaymentPage(p => Math.max(1, p - 1))}
                                disabled={activeTab === 'invoices' ? invoicePage === 1 : paymentPage === 1}
                                className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-40 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {/* Render page numbers */}
                            {Array.from({ length: activeTab === 'invoices' ? totalInvoicePages : totalPaymentPages }, (_, i) => i + 1)
                                .filter(p => {
                                    const currPage = activeTab === 'invoices' ? invoicePage : paymentPage;
                                    const total = activeTab === 'invoices' ? totalInvoicePages : totalPaymentPages;
                                    return p === 1 || p === total || Math.abs(p - currPage) <= 1;
                                })
                                .map((p, index, array) => {
                                    const currPage = activeTab === 'invoices' ? invoicePage : paymentPage;
                                    const prevVal = array[index - 1];
                                    
                                    return (
                                        <React.Fragment key={p}>
                                            {prevVal && p - prevVal > 1 && (
                                                <span className="text-xs text-slate-400 px-1 font-bold">...</span>
                                            )}
                                            <button
                                                onClick={() => activeTab === 'invoices' ? setInvoicePage(p) : setPaymentPage(p)}
                                                className={`w-8 h-8 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                                                    currPage === p
                                                        ? 'bg-indigo-600 text-white shadow-md'
                                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-indigo-600 border border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        </React.Fragment>
                                    );
                                })
                            }

                            <button
                                onClick={() => activeTab === 'invoices' ? setInvoicePage(p => Math.min(totalInvoicePages, p + 1)) : setPaymentPage(p => Math.min(totalPaymentPages, p + 1))}
                                disabled={activeTab === 'invoices' ? invoicePage === totalInvoicePages : paymentPage === totalPaymentPages}
                                className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-40 disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {(activeTab === 'invoices' ? sortedFilteredInvoices : sortedFilteredPayments).length === 0 && (
                    <div className="py-24 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50">
                        <Coins className="w-16 h-16 text-slate-200 mb-4" />
                        <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter italic">No records found</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-2">The financial ledger is currently empty</p>
                    </div>
                )}
            </div>

            {/* STK Push Modal */}
            {showStkModal && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[3rem] p-8 border border-slate-100 dark:border-slate-700 shadow-2xl relative animate-scale-up">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600" /> Send Payment Prompt
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">
                            Initiate a real-time KCB/M-Pesa payment prompt to the client's device.
                        </p>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Client Name</label>
                                <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                                    {selectedInvoice.clientName}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Invoice Number / Reference</label>
                                <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                                    {selectedInvoice.invoiceNumber}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Recipient Phone Number</label>
                                <input
                                    type="text"
                                    value={stkPhone}
                                    onChange={(e) => setStkPhone(e.target.value)}
                                    placeholder="e.g. 254711111111"
                                    className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Request Amount (KES)</label>
                                <input
                                    type="number"
                                    value={stkAmount}
                                    onChange={(e) => setStkAmount(e.target.value)}
                                    placeholder="Amount to pay"
                                    className="w-full h-12 px-6 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-white"
                                />
                            </div>

                            {stkStatus !== 'idle' && (
                                <div className={`p-5 rounded-2xl text-xs font-bold ${
                                    stkStatus === 'pending' ? 'bg-indigo-50 text-indigo-700 dark:bg-slate-900 dark:text-indigo-400' :
                                    stkStatus === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-900 dark:text-emerald-400' :
                                    'bg-rose-50 text-rose-700 dark:bg-slate-900 dark:text-rose-400'
                                }`}>
                                    {stkMessage}
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setShowStkModal(false)}
                                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                    disabled={stkLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!stkPhone.trim()) return alert("Please enter a phone number.");
                                        if (!stkAmount || parseFloat(stkAmount) <= 0) return alert("Please enter a valid amount.");
                                        
                                        setStkLoading(true);
                                        setStkStatus('pending');
                                        setStkMessage("Sending payment request to KCB gateway...");
                                        
                                        try {
                                            const { apiService } = await import('../../services/apiService');
                                            
                                            const response = await apiService.post('/api/payments/kcb-stk-push', {
                                                customerMobileNumber: stkPhone,
                                                transactionAmount: stkAmount,
                                                customerReference: selectedInvoice.invoiceNumber,
                                                customerName: selectedInvoice.clientName,
                                                narration: `Payment for Vehicle Invoice ${selectedInvoice.invoiceNumber}`,
                                                creditAccountIdentifier: selectedInvoice.institutionId,
                                                config: {}
                                            });

                                            if (response.success || response.ResponseCode === '0') {
                                                setStkStatus('success');
                                                setStkMessage("Prompt sent! Customer will receive an STK Push on their device.");
                                                
                                                const checkoutRequestId = response.CheckoutRequestID || `KCB_CO_${Date.now()}`;
                                                await apiService.saveModuleRecord('mpesa_transactions', {
                                                    id: `txn_${Date.now()}`,
                                                    transactionId: checkoutRequestId,
                                                    checkoutRequestId: checkoutRequestId,
                                                    institutionId: selectedInvoice.institutionId,
                                                    amount: parseFloat(stkAmount),
                                                    phoneNumber: stkPhone,
                                                    payerName: selectedInvoice.clientName,
                                                    status: 'pending',
                                                    provider: 'kcb',
                                                    customer_reference: selectedInvoice.invoiceNumber,
                                                    customer_name: selectedInvoice.clientName,
                                                    customer_mobile_number: stkPhone,
                                                    balance: parseFloat(stkAmount),
                                                    narration: `Payment for Vehicle Invoice ${selectedInvoice.invoiceNumber}`,
                                                    credit_account_identifier: selectedInvoice.institutionId,
                                                    metadata: { 
                                                        type: 'car_invoice', 
                                                        invoiceId: selectedInvoice.id,
                                                        requesterId: 'SYSTEM'
                                                    },
                                                    timestamp: new Date().toISOString()
                                                });
                                                
                                                setTimeout(() => {
                                                    setShowStkModal(false);
                                                    if (window.location.reload) window.location.reload();
                                                }, 3000);
                                            } else {
                                                setStkStatus('failed');
                                                setStkMessage(response.message || "Failed to trigger payment prompt. Gateway rejected request.");
                                            }
                                        } catch (err: any) {
                                            setStkStatus('failed');
                                            setStkMessage("Gateway connection error: " + (err.message || err));
                                        } finally {
                                            setStkLoading(false);
                                        }
                                    }}
                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                                    disabled={stkLoading}
                                >
                                    {stkLoading ? "Processing..." : "Send Prompt"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Reminders Modal */}
            {showBulkRemindersModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-[3rem] p-8 border border-slate-100 dark:border-slate-700 shadow-2xl relative flex flex-col max-h-[90vh] animate-scale-up">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 flex items-center gap-2">
                            <Send className="w-6 h-6 text-amber-500 animate-pulse" /> Bulk Invoice Reminders
                        </h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">
                            Review, customize, and dispatch outstanding payment alerts to {selectedInvoiceIds.length} client(s).
                        </p>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden flex-grow mb-6">
                            {/* Left panel: List of invoices and message editors */}
                            <div className="lg:col-span-7 flex flex-col overflow-y-auto space-y-4 pr-2 max-h-[50vh] lg:max-h-none">
                                {invoices
                                    .filter(inv => selectedInvoiceIds.includes(inv.id))
                                    .map(inv => (
                                        <div key={inv.id} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">{inv.clientName}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Invoice #{inv.invoiceNumber}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="px-3 py-1 bg-amber-50 dark:bg-slate-850 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                        KES {(inv.balanceAmount ?? (inv.totalAmount - inv.paidAmount))?.toLocaleString()} Due
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                                <div className="md:col-span-4">
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phone Number</label>
                                                    <input 
                                                        type="text"
                                                        value={bulkRemindersPhones[inv.id] || ''}
                                                        onChange={(e) => setBulkRemindersPhones(prev => ({ ...prev, [inv.id]: e.target.value }))}
                                                        className="w-full h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-white"
                                                    />
                                                </div>
                                                <div className="md:col-span-8">
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Message Body</label>
                                                    <textarea 
                                                        rows={3}
                                                        value={bulkRemindersMessages[inv.id] || ''}
                                                        onChange={(e) => setBulkRemindersMessages(prev => ({ ...prev, [inv.id]: e.target.value }))}
                                                        className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-white resize-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => setSelectedInvoiceIds(prev => prev.filter(id => id !== inv.id))}
                                                    className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors"
                                                >
                                                    Exclude from Batch
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                {selectedInvoiceIds.length === 0 && (
                                    <div className="py-12 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-3xl">
                                        <XCircle className="w-12 h-12 text-slate-300 mb-2" />
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No invoices selected</p>
                                    </div>
                                )}
                            </div>

                            {/* Right panel: Execution state and Logs */}
                            <div className="lg:col-span-5 flex flex-col space-y-6">
                                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch Actions</h4>
                                    
                                    {bulkRemindersStatus === 'sending' && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                <span>Sending Progress</span>
                                                <span className="text-indigo-600">{bulkRemindersProgress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                                    style={{ width: `${bulkRemindersProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Action description */}
                                    <p className="text-xs text-slate-500 leading-relaxed font-bold">
                                        {bulkRemindersStatus === 'idle' && "Clicking 'Send' will trigger real-time SMS reminders to the phone numbers configured on the left."}
                                        {bulkRemindersStatus === 'sending' && "Reminders are being dispatched. Please do not close this window."}
                                        {bulkRemindersStatus === 'completed' && "Completed processing the reminder batch."}
                                    </p>

                                    {/* Console Logs */}
                                    <div className="flex flex-col h-48 bg-slate-950 rounded-2xl p-4 font-mono text-[9px] text-emerald-400 overflow-y-auto space-y-1.5 border border-slate-900">
                                        {bulkRemindersLogs.length === 0 && (
                                            <span className="text-slate-500 italic">No logs. Waiting to send...</span>
                                        )}
                                        {bulkRemindersLogs.map((log, idx) => (
                                            <span key={idx}>{log}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="flex justify-end gap-4 pt-4 border-t border-slate-50 dark:border-slate-700">
                            <button
                                onClick={() => setShowBulkRemindersModal(false)}
                                className="px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                disabled={bulkRemindersStatus === 'sending'}
                            >
                                {bulkRemindersStatus === 'completed' ? 'Close' : 'Cancel'}
                            </button>
                            {bulkRemindersStatus !== 'completed' && (
                                <button
                                    onClick={handleSendBulkReminders}
                                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                    disabled={bulkRemindersStatus === 'sending' || selectedInvoiceIds.length === 0}
                                >
                                    {bulkRemindersStatus === 'sending' ? 'Sending...' : 'Send Bulk Reminders'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
