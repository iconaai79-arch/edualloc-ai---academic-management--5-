import React, { useState, useEffect, useRef } from 'react';
import type { User, Institution, CarWashPackage, CarWashCustomer, CarWashVehicle, CarWashJob, CarWashInventoryItem, CarWashFeedback, CarWashShiftLog, CarWashVehicleType, CarWashPaymentMethod, MpesaTransaction, CarWashAccount, CarWashJournalEntry, CarWashJournalLine, CarWashExpense, CarWashPayroll, RetailSale, RetailInventoryItem, CafeOrder, CafeMenuItem } from '../types';
import type { Invoice, Receipt } from '../types';
import { apiService } from '../services/apiService';
import { CommunicationsManager } from './CommunicationsManager';
import { SmartCarWashCustomerImporterModal } from './SmartCarWashCustomerImporterModal';
import { HybridPOSView } from './hybrid/HybridPOSView';
import { KitchenDisplaySystem } from './hybrid/KitchenDisplaySystem';
import { CustomerStatusBoard } from './hybrid/CustomerStatusBoard';
import { CafeMenuManager } from './hybrid/CafeMenuManager';
import {
    generateCarWashTrialBalancePdf,
    generateCarWashCashbookPdf,
    generateCarWashExpensesPdf,
    generateCarWashPayrollPdf,
    generateInvoicePdfDataUri,
    generateReceiptPdfDataUri
} from '../services/pdfService';
import { formatRoleDisplayName } from '../utils/roleUtils';
import {
    PlusIcon, XIcon, SearchIcon, Cog8ToothIcon, StarIcon, SparklesIcon,
    WrenchIcon, DocumentTextIcon, CurrencyIcon, ChartPieIcon, UserGroupIcon,
    BanknotesIcon, ArchiveBoxIcon, ClockIcon, UserIcon, ChartBarIcon,
    EnvelopeIcon, ArrowUpTrayIcon, CheckCircleIcon,
    ClipboardListIcon, EyeIcon
} from './icons/index';

const VEHICLE_TYPES: CarWashVehicleType[] = ['Sedan', 'SUV', 'Truck', 'Matatu', 'Motorbike', 'Van', 'Bus', 'Other'];
const PAYMENT_METHODS: CarWashPaymentMethod[] = ['cash', 'mpesa', 'card', 'credit'];
const ADD_ONS = ['Waxing', 'Interior Vacuum', 'Tire Dressing', 'Engine Wash', 'Seat Shampoo', 'Odor Removal'];
const PACKAGE_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface CarWashViewProps {
    currentUser: User;
    currentInstitution: Institution;
    users: User[];
    onDataChange: () => void;
    onSendSms: (recipient: string, message: string, config?: any, units?: number, institutionId?: string) => Promise<any>;
    onAddTransaction?: (data: any, items: any[]) => Promise<any>;
    smsConfig?: any;
    smsBalance?: number;
    mpesaConfig?: any;
    departments?: any[];
    courses?: any[];
    onRegisterUser?: (userData: Partial<User>) => Promise<void>;
    cafeOrders?: CafeOrder[];
}

const AnimatedProfitBar = ({ d, i, maxGraphValue }: { d: any, i: number, maxGraphValue: number }) => {
    const rawRevHeight = (d.revenue / maxGraphValue) * 100;
    const rawExpHeight = (d.expense / maxGraphValue) * 100;
    const [revHeight, setRevHeight] = useState(0);
    const [expHeight, setExpHeight] = useState(0);

    // Trigger animation on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setRevHeight(rawRevHeight);
            setExpHeight(rawExpHeight);
        }, 100 + (i * 150));
        return () => clearTimeout(timer);
    }, [rawRevHeight, rawExpHeight, i]);

    return (
        <div className="flex flex-col items-center flex-1 group">
            <div className="flex items-end justify-center w-full h-full gap-1 sm:gap-4 relative">
                {/* Revenue Bar */}
                <div className="relative w-8 sm:w-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-t-lg transition-all duration-1000 ease-out" style={{ height: `${revHeight}%` }}>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-lg transition-all duration-1000 ease-out" style={{ height: '100%' }} />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded">
                        Rev: KES {d.revenue.toLocaleString()}
                    </div>
                </div>
                {/* Expense Bar */}
                <div className="relative w-8 sm:w-12 bg-red-100 dark:bg-red-900/40 rounded-t-lg transition-all duration-1000 ease-out" style={{ height: `${expHeight}%` }}>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-red-500 to-orange-400 rounded-t-lg transition-all duration-1000 ease-out" style={{ height: '100%' }} />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded">
                        Exp: KES {d.expense.toLocaleString()}
                    </div>
                </div>
            </div>
            <div className="mt-4 text-center">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{d.label}</p>
                <p className={`text-[10px] font-black mt-1 ${d.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {d.profit >= 0 ? '+' : ''}KES {d.profit.toLocaleString()}
                </p>
            </div>
        </div>
    );
};

export const CarWashView: React.FC<CarWashViewProps> = ({
    currentUser, currentInstitution, users, onDataChange,
    onSendSms, onAddTransaction, smsConfig, smsBalance, mpesaConfig, departments, courses, onRegisterUser,
    cafeOrders
}) => {
    const institutionId = currentInstitution.id;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'queue' | 'customers' | 'services' | 'inventory' | 'staff' | 'reports' | 'feedback' | 'broadcast' | 'transactions' | 'finance' | 'settings' | 'hybrid_pos' | 'kds' | 'live_board' | 'cafe_menu'>('dashboard');

    const [packages, setPackages] = useState<CarWashPackage[]>([]);
    const [customers, setCustomers] = useState<CarWashCustomer[]>([]);
    const [vehicles, setVehicles] = useState<CarWashVehicle[]>([]);
    const [jobs, setJobs] = useState<CarWashJob[]>([]);
    const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);

    // Accounting State
    const [accounts, setAccounts] = useState<CarWashAccount[]>([]);
    const [journalEntries, setJournalEntries] = useState<CarWashJournalEntry[]>([]);
    const [journalLines, setJournalLines] = useState<CarWashJournalLine[]>([]);
    const [isSeedingAccounts, setIsSeedingAccounts] = useState(false);
    const [expenses, setExpenses] = useState<CarWashExpense[]>([]);
    const [payroll, setPayroll] = useState<CarWashPayroll[]>([]);

    const [financeTab, setFinanceTab] = useState<'dashboard' | 'cashbook' | 'expenses' | 'payroll'>('dashboard');

    const [payrlForm, setPayrlForm] = useState({
        staffId: '', baseSalary: 0, commissionEarned: 0, advancesTaken: 0, deductions: 0,
        nssf: 0, shif: 0, paye: 0, housingLevy: 0,
        periodStart: new Date(Date.now() - 30 * 864e5).toISOString().split('T')[0],
        periodEnd: new Date().toISOString().split('T')[0]
    });

    const [inventory, setInventory] = useState<CarWashInventoryItem[]>([]);
    const [retailSales, setRetailSales] = useState<RetailSale[]>([]);
    const [retailInventory, setRetailInventory] = useState<RetailInventoryItem[]>([]);
    const [cafeInventory, setCafeInventory] = useState<CafeMenuItem[]>([]);
    const [feedbacks, setFeedbacks] = useState<CarWashFeedback[]>([]);
    const [shifts, setShifts] = useState<CarWashShiftLog[]>([]);
    const [localCafeOrders, setLocalCafeOrders] = useState<CafeOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const [showNewJobModal, setShowNewJobModal] = useState(false);
    const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
    const [showNewPackageModal, setShowNewPackageModal] = useState(false);
    const [showNewInventoryModal, setShowNewInventoryModal] = useState(false);
    const [showNewStaffModal, setShowNewStaffModal] = useState(false);
    const [showSmartImporter, setShowSmartImporter] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState<CarWashJob | null>(null);
    const [showCheckoutModal, setShowCheckoutModal] = useState<CarWashJob | null>(null);
    const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<CarWashExpense | null>(null);
    const [showNewPayrollModal, setShowNewPayrollModal] = useState(false);
    const [showBulkPayrollModal, setShowBulkPayrollModal] = useState(false);
    const [bulkPayrollPeriod, setBulkPayrollPeriod] = useState({
        start: new Date(Date.now() - 30 * 864e5).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [cashbookPeriod, setCashbookPeriod] = useState({
        start: new Date(Date.now() - 30 * 864e5).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');
    const [pdfFileName, setPdfFileName] = useState('');

    const [brandingForm, setBrandingForm] = useState({
        logoUrl: currentInstitution.logoUrl || '',
        footerImageUrl: currentInstitution.footerImageUrl || '',
        headerImageUrl: currentInstitution.letterheadConfig?.headerImageUrl || '',
        stampImageUrl: currentInstitution.letterheadConfig?.stampImageUrl || ''
    });

    // ── Derived Variables (Placed before handlers to avoid TDT issues) ──
    const todayJobs = jobs.filter(j => j.createdAt?.startsWith(new Date().toISOString().split('T')[0]));
    const todayRevenue = todayJobs.filter(j => j.status === 'completed').reduce((s, j) => s + (j.amountPaid || 0), 0);
    const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'in_progress' || j.status === 'ready');
    const lowStock = inventory.filter(i => i.currentStock <= i.reorderLevel);
    const avgRating = feedbacks.length ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1) : '—';
    const attendants = users.filter(u => u.role === 'carwash_admin' || u.role === 'carwash_attendant');

    const getJobTabTotal = (job: CarWashJob) => {
        const relevantCafe = (cafeOrders && cafeOrders.length > 0 ? cafeOrders : localCafeOrders).filter(s => s.jobId === job.id && s.paymentMethod === 'tab');
        const relevantRetail = retailSales.filter(s => s.unifiedTabId === job.id && s.paymentMethod === 'tab');
        const tabTotal = [...relevantCafe, ...relevantRetail].reduce((sum, s) => sum + s.totalAmount, 0);
        return (job.amountCharged || 0) + tabTotal;
    };

    // ── Profit Graph Calculations (Last 3 Months) ──
    const last3MonthsData = Array.from({ length: 3 }).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (2 - i));
        const monthPrefix = d.toISOString().slice(0, 7); // YYYY-MM
        const monthLabel = d.toLocaleString('default', { month: 'short' });

        const rev = jobs.filter(j => j.status === 'completed' && j.createdAt?.startsWith(monthPrefix)).reduce((s, j) => s + (j.amountPaid || 0), 0);
        const exp = expenses.filter(e => e.expenseDate?.startsWith(monthPrefix)).reduce((s, e) => s + e.amount, 0);
        const prl = payroll.filter(p => p.paymentDate?.startsWith(monthPrefix)).reduce((s, p) => s + p.totalPay, 0);
        const totalExp = exp + prl;

        return {
            label: monthLabel,
            revenue: rev,
            expense: totalExp,
            profit: rev - totalExp
        };
    });
    const maxGraphValue = Math.max(...last3MonthsData.map(d => Math.max(d.revenue, d.expense, d.profit)), 1);

    // ── Accounting Helpers (Moved up to avoid TDT) ──
    const handleSeedAccounts = async () => {
        setIsSeedingAccounts(true);
        try {
            const defaultAccounts: Partial<CarWashAccount>[] = [
                { id: `acc_${institutionId}_1000`, accountCode: '1000', name: 'Cash on Hand', type: 'Asset', description: 'Physical cash in till', isActive: true },
                { id: `acc_${institutionId}_1010`, accountCode: '1010', name: 'M-Pesa Till', type: 'Asset', description: 'Digital payments via M-Pesa', isActive: true },
                { id: `acc_${institutionId}_2000`, accountCode: '2000', name: 'Accounts Payable', type: 'Liability', description: 'Money owed to suppliers', isActive: true },
                { id: `acc_${institutionId}_3000`, accountCode: '3000', name: 'Owner Equity', type: 'Equity', description: 'Owner investments / Retained earnings', isActive: true },
                { id: `acc_${institutionId}_4000`, accountCode: '4000', name: 'Wash Revenue', type: 'Revenue', description: 'Income from car washes', isActive: true },
                { id: `acc_${institutionId}_5000`, accountCode: '5000', name: 'Supplies Expense', type: 'Expense', description: 'Soap, wax, rags, etc', isActive: true },
                { id: `acc_${institutionId}_5010`, accountCode: '5010', name: 'Wages & Salary Expense', type: 'Expense', description: 'Staff payroll and commissions', isActive: true },
                { id: `acc_${institutionId}_5020`, accountCode: '5020', name: 'Utilities Expense', type: 'Expense', description: 'Water and electricity bills', isActive: true },
            ];

            for (const acc of defaultAccounts) {
                await apiService.saveModuleRecord('carwash_accounts', { ...acc, institutionId, createdAt: new Date().toISOString() });
            }
            alert('Accounting structure initialized successfully!');
            onDataChange();
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert('Failed to initialize accounting');
        } finally {
            setIsSeedingAccounts(false);
        }
    };

    const recordJournalEntry = async (description: string, amount: number, debitAccCode: string, creditAccCode: string, refType?: string, refId?: string) => {
        const availableAccounts = accounts.length > 0 ? accounts : (await apiService.fetchModuleRecords<CarWashAccount>('carwash_accounts', institutionId)) || [];
        let debitAcc = availableAccounts.find(a => a.accountCode === debitAccCode);
        let creditAcc = availableAccounts.find(a => a.accountCode === creditAccCode);

        if (!debitAcc || !creditAcc) {
            await handleSeedAccounts();
            const freshAccounts = (await apiService.fetchModuleRecords<CarWashAccount>('carwash_accounts', institutionId)) || [];
            debitAcc = freshAccounts.find(a => a.accountCode === debitAccCode);
            creditAcc = freshAccounts.find(a => a.accountCode === creditAccCode);
        }

        const debitAccId = debitAcc?.id || `acc_${institutionId}_${debitAccCode}`;
        const creditAccId = creditAcc?.id || `acc_${institutionId}_${creditAccCode}`;

        const entryId = `je_${Date.now()}`;
        const journalEntry: CarWashJournalEntry = {
            id: entryId, institutionId, entryNumber: `JE-${Date.now().toString().slice(-6)}`,
            entryDate: new Date().toISOString().split('T')[0], description,
            referenceType: refType, referenceId: refId,
            createdBy: users.some(u => u.id === currentUser.id) ? currentUser.id : undefined,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };

        const debitLine: CarWashJournalLine = { id: `jl_${Date.now()}_1`, institutionId, entryId, accountId: debitAccId, debit: amount, credit: 0, createdAt: new Date().toISOString() };
        const creditLine: CarWashJournalLine = { id: `jl_${Date.now()}_2`, institutionId, entryId, accountId: creditAccId, debit: 0, credit: amount, createdAt: new Date().toISOString() };

        await apiService.saveModuleRecord('carwash_journal_entries', journalEntry);
        await apiService.saveModuleRecord('carwash_journal_lines', debitLine);
        await apiService.saveModuleRecord('carwash_journal_lines', creditLine);
    };

    const calculateKenyanPayroll = (basic: number, commissions: number) => {
        const gross = basic + commissions;
        const nssf = gross >= 18000 ? 2160 : (gross * 0.12 > 2160 ? 2160 : gross * 0.12);
        const shif = gross * 0.0275;
        const housingLevy = gross * 0.015;
        const taxablePay = gross - nssf;
        let paye = 0;
        if (taxablePay <= 24000) paye = taxablePay * 0.1;
        else if (taxablePay <= 32333) paye = (24000 * 0.1) + ((taxablePay - 24000) * 0.25);
        else paye = (24000 * 0.1) + (8333 * 0.25) + ((taxablePay - 32333) * 0.3);
        const personalRelief = 2400;
        paye = Math.max(0, paye - personalRelief);
        return { nssf, shif, housingLevy, paye, gross };
    };

    const handleSaveBranding = async () => {
        try {
            const updatedInst: Institution = {
                ...currentInstitution,
                logoUrl: brandingForm.logoUrl,
                footerImageUrl: brandingForm.footerImageUrl,
                letterheadConfig: {
                    headerImageUrl: brandingForm.headerImageUrl,
                    stampImageUrl: brandingForm.stampImageUrl
                }
            };
            await apiService.saveModuleRecord('institutions', updatedInst);
            alert('Branding updated successfully!');
            onDataChange();
        } catch (e) {
            alert('Failed to update branding');
        }
    };

    const [search, setSearch] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [pkgs, custs, vehs, jobList, trans, inv, fbs, shiftList, accs, jEntries, jLines, exps, pyrl, rSales, rInv, cInv, cOrders] = await Promise.all([
                apiService.fetchModuleRecords<CarWashPackage>('carwash_packages', institutionId),
                apiService.fetchModuleRecords<CarWashCustomer>('carwash_customers', institutionId),
                apiService.fetchModuleRecords<CarWashVehicle>('carwash_vehicles', institutionId),
                apiService.fetchModuleRecords<CarWashJob>('carwash_jobs', institutionId),
                apiService.fetchModuleRecords<MpesaTransaction>('mpesa_transactions', institutionId),
                apiService.fetchModuleRecords<CarWashInventoryItem>('carwash_inventory', institutionId),
                apiService.fetchModuleRecords<CarWashFeedback>('carwash_feedback', institutionId),
                apiService.fetchModuleRecords<CarWashShiftLog>('carwash_shifts', institutionId),
                apiService.fetchModuleRecords<CarWashAccount>('carwash_accounts', institutionId),
                apiService.fetchModuleRecords<CarWashJournalEntry>('carwash_journal_entries', institutionId),
                apiService.fetchModuleRecords<CarWashJournalLine>('carwash_journal_lines', institutionId),
                apiService.fetchModuleRecords<CarWashExpense>('carwash_expenses', institutionId),
                apiService.fetchModuleRecords<CarWashPayroll>('carwash_payroll', institutionId),
                apiService.fetchModuleRecords<RetailSale>('retail_sales', institutionId),
                apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', institutionId),
                apiService.fetchModuleRecords<CafeMenuItem>('cafe_menu_items', institutionId),
                apiService.fetchModuleRecords<CafeOrder>('cafe_orders', institutionId),
            ]);
            setPackages(pkgs || []);
            setCustomers(custs || []);
            setVehicles(vehs || []);
            setJobs(jobList || []);
            setTransactions(trans || []);
            setInventory(inv || []);
            setFeedbacks(fbs || []);
            setShifts(shiftList || []);
            setAccounts(accs || []);
            setJournalEntries(jEntries || []);
            setJournalLines(jLines || []);
            setExpenses(exps || []);
            setPayroll(pyrl || []);
            setRetailSales(rSales || []);
            setRetailInventory(rInv || []);
            setCafeInventory(cInv || []);
            setLocalCafeOrders(cOrders || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleExportTrialBalance = async () => {
        try {
            const dataUri = await generateCarWashTrialBalancePdf(
                accounts,
                currentInstitution,
                currentInstitution.letterheadConfig,
                currentInstitution.logoUrl || '',
                currentInstitution.footerImageUrl || ''
            );
            setPdfPreviewUrl(dataUri);
            setPdfPreviewTitle("Trial Balance Report Preview");
            setPdfFileName(`Trial-Balance-${currentInstitution.name}-${new Date().toLocaleDateString()}.pdf`);
        } catch (e) {
            console.error(e);
            alert('Failed to generate Trial Balance PDF');
        }
    };

    const handleExportCashbook = async () => {
        try {
            const dataUri = await generateCarWashCashbookPdf(
                journalEntries,
                journalLines,
                accounts,
                currentInstitution,
                currentInstitution.letterheadConfig,
                currentInstitution.logoUrl || '',
                currentInstitution.footerImageUrl || ''
            );
            setPdfPreviewUrl(dataUri);
            setPdfPreviewTitle("General Journal / Cashbook Preview");
            setPdfFileName(`Cashbook-${currentInstitution.name}-${new Date().toLocaleDateString()}.pdf`);
        } catch (e) {
            console.error(e);
            alert('Failed to generate Cashbook PDF');
        }
    };

    const handleExportExpenses = async () => {
        try {
            const dataUri = await generateCarWashExpensesPdf(
                expenses,
                currentInstitution,
                currentInstitution.letterheadConfig,
                currentInstitution.logoUrl || '',
                currentInstitution.footerImageUrl || ''
            );
            setPdfPreviewUrl(dataUri);
            setPdfPreviewTitle("Operating Expenses Report Preview");
            setPdfFileName(`Expenses-${currentInstitution.name}-${new Date().toLocaleDateString()}.pdf`);
        } catch (e) {
            console.error(e);
            alert('Failed to generate Expenses PDF');
        }
    };

    const handleExportPayroll = async () => {
        try {
            const dataUri = await generateCarWashPayrollPdf(
                payroll,
                attendants,
                currentInstitution,
                currentInstitution.letterheadConfig,
                currentInstitution.logoUrl || '',
                currentInstitution.footerImageUrl || ''
            );
            setPdfPreviewUrl(dataUri);
            setPdfPreviewTitle("Staff Payroll History Preview");
            setPdfFileName(`Payroll-${currentInstitution.name}-${new Date().toLocaleDateString()}.pdf`);
        } catch (e) {
            console.error(e);
            alert('Failed to generate Payroll PDF');
        }
    };

    useEffect(() => { loadData(); }, [institutionId]);

    // Auto-calculate commission when staff or period changes in payroll form
    useEffect(() => {
        if (showNewPayrollModal && payrlForm.staffId && payrlForm.periodStart && payrlForm.periodEnd) {
            const unpaidComms = jobs.filter(j =>
                j.attendantId === payrlForm.staffId &&
                j.status === 'completed' &&
                !j.isCommissionPaid &&
                j.completedAt &&
                j.completedAt.split('T')[0] >= payrlForm.periodStart &&
                j.completedAt.split('T')[0] <= payrlForm.periodEnd
            ).reduce((s, j) => s + (j.commissionEarned || 0), 0);

            if (unpaidComms !== payrlForm.commissionEarned) {
                setPayrlForm(prev => ({ ...prev, commissionEarned: unpaidComms }));
            }
        }
    }, [payrlForm.staffId, payrlForm.periodStart, payrlForm.periodEnd, showNewPayrollModal, jobs]);

    // ── New Job Modal State ──
    const [jobForm, setJobForm] = useState({ vehiclePlate: '', vehicleType: 'Sedan' as CarWashVehicleType, packageId: '', addOns: [] as string[], attendantId: '', bayNumber: 1, paymentMethod: 'cash' as CarWashPaymentMethod, customerId: '' });
    const handleCreateJob = async () => {
        if (!jobForm.packageId) return alert('Select a package');
        const pkg = packages.find(p => p.id === jobForm.packageId);
        if (!pkg) return;
        const price = pkg.pricing[jobForm.vehicleType] || 0;
        const job: CarWashJob = {
            id: `cwj_${Date.now()}`, institutionId, vehiclePlate: jobForm.vehicleType === 'Other' && !jobForm.vehiclePlate ? 'N/A' : jobForm.vehiclePlate.toUpperCase(), vehicleType: jobForm.vehicleType,
            packageId: jobForm.packageId, packageName: pkg.name, addOns: jobForm.addOns,
            attendantId: users.some(u => u.id === jobForm.attendantId) ? jobForm.attendantId : undefined,
            attendantName: attendants.find(a => a.id === jobForm.attendantId)?.name,
            bayNumber: jobForm.bayNumber, status: 'queued', paymentMethod: jobForm.paymentMethod,
            amountCharged: price, amountPaid: 0, isLoyaltyRedemption: false, createdAt: new Date().toISOString(),
            customerId: jobForm.customerId || undefined,
        };
        try {
            await apiService.saveModuleRecord('carwash_jobs', job);
            setShowNewJobModal(false);
            setJobForm({ vehiclePlate: '', vehicleType: 'Sedan', packageId: '', addOns: [], attendantId: '', bayNumber: 1, paymentMethod: 'cash', customerId: '' });
            onDataChange();
            loadData();
        } catch (e: any) {
            alert(e.message || 'Failed to create job');
        }
    };

    const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);

    const updateJobStatus = async (job: CarWashJob, status: CarWashJob['status']) => {
        if (status === 'completed') {
            setShowCheckoutModal(job);
            setUseLoyaltyPoints(false); // Reset for new checkout
            return;
        }

        if (status === 'ready') {
            // Notify customer when car is ready and in waiting bay
            const customer = customers.find(c => c.id === job.customerId);
            if (customer && customer.phoneNumber) {
                const message = `Hello ${customer.name}, your ${job.packageName} for vehicle ${job.vehiclePlate} is complete and ready in the waiting bay! Please proceed to checkout. Amount due: KES ${(job.amountCharged || 0).toLocaleString()}. Thank you for choosing ${currentInstitution.name}.`;
                try {
                    await onSendSms(customer.phoneNumber, message, smsConfig, 1, institutionId);
                } catch (e) {
                    console.error('Failed to send readiness SMS', e);
                }
            }
        }

        const updated: CarWashJob = {
            ...job,
            status,
            ...(status === 'in_progress' ? { startedAt: new Date().toISOString() } : {}),
            ...(status === 'ready' ? { completedAt: new Date().toISOString() } : {})
        };
        await apiService.saveModuleRecord('carwash_jobs', updated);
        onDataChange();
        loadData();
    };

    const handleCheckout = async (job: CarWashJob, method: CarWashPaymentMethod) => {
        setIsProcessingPayment(true);
        try {
            const customer = customers.find(c => c.id === job.customerId);

            // Calculate linked cafe orders (tabs) from both new dedicated table and legacy retail sales
            const relevantCafe = (cafeOrders && cafeOrders.length > 0 ? cafeOrders : localCafeOrders).filter(s => s.jobId === job.id && s.paymentMethod === 'tab');
            const relevantRetail = retailSales.filter(s => s.unifiedTabId === job.id && s.paymentMethod === 'tab');
            const relevantOrders = [...relevantCafe, ...relevantRetail];
            const tabTotal = relevantOrders.reduce((sum, s) => sum + s.totalAmount, 0);

            // Calculate discount and final amount
            let discountApplied = 0;
            let baseAmount = (job.amountCharged || 0) + tabTotal;
            let finalAmountToPay = baseAmount;
            if (useLoyaltyPoints && customer && (customer.loyaltyPoints || 0) > 0) {
                discountApplied = Math.min(finalAmountToPay, customer.loyaltyPoints || 0);
                finalAmountToPay -= discountApplied;
            }

            if (method === 'mpesa' && onAddTransaction && finalAmountToPay > 0) {
                // Initiate STK Push only if there's an actual cash amount due
                await onAddTransaction({
                    amount: finalAmountToPay,
                    phoneNumber: customer?.phoneNumber || '',
                    description: `Car Wash + Cafe Tab: ${job.vehiclePlate}`,
                    institutionId,
                    userId: users.some(u => u.id === currentUser.id) ? currentUser.id : undefined
                }, [
                    { name: `${job.packageName} (Wash)`, quantity: 1, unitPrice: job.amountCharged, total: job.amountCharged },
                    ...relevantOrders.flatMap(s => s.items.map(i => ({ name: `${i.name} (Cafe)`, quantity: i.quantity, unitPrice: i.unitPrice, total: i.quantity * i.unitPrice })))
                ]);
            } else if (finalAmountToPay > 0 || discountApplied > 0) {
                // Create manual transaction record for cash/card/credit so it appears in the audit log
                // Also create a "loyalty" log if fully paid by points (rare but possible)
                const paymentDesc = discountApplied > 0
                    ? `Car Wash & Cafe (${method}): ${job.vehiclePlate} (Discount: KES ${discountApplied})`
                    : `Car Wash & Cafe (${method}): ${job.vehiclePlate}`;

                if (finalAmountToPay > 0) {
                    await apiService.saveModuleRecord('mpesa_transactions', {
                        id: `txn_cw_${Date.now()}`,
                        institutionId,
                        transactionId: `${method.toUpperCase()}-${Date.now().toString().slice(-6)}`,
                        phoneNumber: customer?.phoneNumber || 'N/A',
                        amount: finalAmountToPay,
                        description: paymentDesc,
                        status: 'completed',
                        timestamp: new Date().toISOString(),
                        userId: users.some(u => u.id === currentUser.id) ? currentUser.id : undefined
                    });
                }
            }

            const pkg = packages.find(p => p.id === job.packageId);
            let commission = 0;
            if (pkg?.commissionType === 'percentage') {
                commission = (job.amountCharged * (pkg.commissionValue || 0)) / 100;
            } else if (pkg?.commissionType === 'fixed') {
                commission = pkg.commissionValue || 0;
            }

            const updated: CarWashJob = {
                ...job,
                status: 'completed',
                paymentMethod: method,
                completedAt: new Date().toISOString(),
                amountPaid: finalAmountToPay,
                commissionEarned: commission,
                isCommissionPaid: false,
                isLoyaltyRedemption: discountApplied > 0
            };

            await apiService.saveModuleRecord('carwash_jobs', updated);

            // ── Update linked cafe orders to completed status ──
            for (const order of relevantCafe) {
                await apiService.saveModuleRecord('cafe_orders', { ...order, status: 'completed' });
            }

            // Link retail sales to the same payment method used for the wash if they were on tab
            for (const sale of relevantRetail) {
                await apiService.saveModuleRecord('retail_sales', { ...sale, paymentMethod: method });
            }

            // ── Loyalty Points Update ──
            if (customer) {
                // Points Earned = 1 Point per KES paid in cash (exclude discounted amount)
                const pointsEarned = finalAmountToPay;

                const existingStamps = customer.loyaltyStamps || 0;
                let newStamps = existingStamps + 1;

                const remainingPoints = discountApplied > 0
                    ? (customer.loyaltyPoints || 0) - discountApplied
                    : (customer.loyaltyPoints || 0);

                const finalLoyaltyPoints = remainingPoints + pointsEarned;

                const updatedCustomer = {
                    ...customer,
                    loyaltyStamps: newStamps >= 10 ? 0 : newStamps,
                    loyaltyPoints: finalLoyaltyPoints
                };
                await apiService.saveModuleRecord('carwash_customers', updatedCustomer);
            }

            // ── Accounting Integration: Income ──
            const incomeAcc = method === 'mpesa' ? '1010' : '1000';
            await recordJournalEntry(
                `Wash Revenue: ${job.packageName} - ${job.vehiclePlate}`,
                job.amountCharged,
                incomeAcc, // Debit: Cash/Mpesa
                '4000',    // Credit: Wash Revenue
                'Job',
                job.id
            );

            // Record Cafe Revenue separate if needed, but for now it's grouped in wash revenue for simplicity
            // or we could split it. Let's keep it simple as before but using the new source.

            setShowCheckoutModal(null);
            setShowFeedbackModal(updated);

            // ── Billing Integration: Invoice & Receipt ──
            const invoiceId = `inv_${Date.now()}`;
            const receiptId = `rcpt_${Date.now()}`;
            const invNumber = `INV-${Date.now().toString().slice(-6)}`;
            const rcptNumber = `RCPT-${Date.now().toString().slice(-6)}`;

            const items: any[] = [{ description: `${job.packageName} - ${job.vehiclePlate}`, quantity: 1, unitPrice: job.amountCharged, amount: job.amountCharged }];

            // Add cafe items to the invoice
            relevantOrders.forEach(sale => {
                sale.items.forEach(item => {
                    items.push({
                        description: `${item.name} (Cafe)`,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        amount: item.quantity * item.unitPrice
                    });
                });
            });

            if (discountApplied > 0) {
                items.push({ description: `Loyalty Points Discount applied`, quantity: -1, unitPrice: discountApplied, amount: -discountApplied });
            }

            const invoice: Invoice = {
                id: invoiceId,
                invoiceNumber: invNumber,
                institutionId,
                issueDate: new Date().toISOString(),
                dueDate: new Date().toISOString(),
                due_date: new Date().toISOString(),
                items,
                totalAmount: finalAmountToPay,
                status: 'paid'
            };

            const receipt: Receipt = {
                id: receiptId,
                receiptNumber: rcptNumber,
                institutionId,
                paymentDate: new Date().toISOString(),
                amountPaid: finalAmountToPay,
                paidFor: `${job.packageName} - ${job.vehiclePlate}`,
                paymentMethod: method,
                relatedTransactionId: job.id,
                invoiceId: invoiceId
            };

            await Promise.all([
                apiService.saveModuleRecord('invoices', invoice),
                apiService.saveModuleRecord('receipts', receipt)
            ]);

            // ── Email Notification ──
            if (customer && customer.email) {
                const emailSubject = `Payment Receipt - ${invNumber} - ${job.vehiclePlate}`;
                const emailBody = `
                    Dear ${customer.name},
                    
                    Thank you for your payment for car wash services at ${currentInstitution.name}.
                    
                    VEHICLE: ${job.vehiclePlate} (${job.vehicleType})
                    SERVICE: ${job.packageName}
                    TOTAL VALUE: KES ${job.amountCharged.toLocaleString()}
                    ${discountApplied > 0 ? `LOYALTY DISCOUNT: -KES ${discountApplied.toLocaleString()}` : ''}
                    FINAL PAID: KES ${finalAmountToPay.toLocaleString()}
                    PAYMENT METHOD: ${method.toUpperCase()}
                    DATE: ${new Date().toLocaleDateString()}
                    
                    INVOICE NO: ${invNumber}
                    RECEIPT NO: ${rcptNumber}
                    
                    Your new Loyalty Points balance is: ${(customer.loyaltyPoints || 0) + finalAmountToPay - (useLoyaltyPoints ? discountApplied : 0)} PTS
                    
                    We appreciate your business!
                    
                    Regards,
                    Management
                    ${currentInstitution.name}
                `.trim();

                try {
                    // Generate PDFs
                    const proxyTransaction: MpesaTransaction = {
                        id: job.id,
                        transactionId: `${method.toUpperCase()}-${Date.now().toString().slice(-6)}`,
                        institutionId,
                        amount: job.amountCharged,
                        phoneNumber: customer.phoneNumber || 'N/A',
                        status: 'completed',
                        timestamp: new Date().toISOString(),
                        payerName: customer.name
                    };

                    const proxyCompanyDetails = {
                        name: currentInstitution.name,
                        address: 'N/A',
                        phone: currentInstitution.phoneNumber,
                        email: currentInstitution.email,
                        website: '',
                        kraPin: '',
                        motto: '',
                        subscriptionConfig: {
                            subscriptionType: 'free' as const,
                            subscriptionBaseCost: 0,
                            defaultMonthlyPrice: 0,
                            defaultYearlyPrice: 0,
                            tierLimits: {
                                maxStudents: Infinity,
                                maxStaff: Infinity,
                                storageMbs: Infinity
                            },
                        },
                        databaseConfig: {
                            provider: 'supabase' as const,
                            dbType: 'postgresql' as const,
                            host: '',
                            port: '5432',
                            username: '',
                            dbName: '',
                            connectionUrl: '',
                            poolSize: 10
                        },
                        country: 'Kenya',
                        currency: 'KES',
                        timezone: 'Africa/Nairobi',
                        logoUrl: currentInstitution.logoUrl || null,
                        mpesaConfig: undefined as any,
                        emailConfig: undefined as any,
                        smsConfig: undefined as any,
                        letterheadConfig: undefined as any
                    };

                    const invDataUri = await generateInvoicePdfDataUri(invoice, currentInstitution, proxyCompanyDetails, currentInstitution.logoUrl || null);
                    const rcptDataUri = await generateReceiptPdfDataUri(receipt, proxyTransaction, currentInstitution, proxyCompanyDetails, currentInstitution.logoUrl || null);

                    const invBase64 = invDataUri.split(',')[1];
                    const rcptBase64 = rcptDataUri.split(',')[1];

                    const attachments = [
                        { filename: `Invoice_${invNumber}.pdf`, content: invBase64, encoding: 'base64' },
                        { filename: `Receipt_${rcptNumber}.pdf`, content: rcptBase64, encoding: 'base64' }
                    ];

                    await apiService.sendEmail(customer.email, emailSubject, emailBody, undefined, undefined, attachments);
                } catch (e) {
                    console.error('Failed to send billing email with attachments', e);
                }
            }

            // Automated SMS Notification (Payment Confirmation)
            if (customer && customer.phoneNumber) {
                const message = `Payment Received! KES ${(job.amountCharged || 0).toLocaleString()} for ${job.packageName} (${job.vehiclePlate}). Receipt: ${rcptNumber}. Thank you for choosing ${currentInstitution.name}!`;
                try {
                    await onSendSms(customer.phoneNumber, message, smsConfig, 1, institutionId);
                } catch (e) {
                    console.error('Failed to send payment confirmation SMS', e);
                }
            }
            onDataChange();
            loadData();
        } catch (e: any) {
            alert(e.message || 'Checkout failed');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    // ── Customer Form ──
    const [custForm, setCustForm] = useState({ name: '', phoneNumber: '', email: '', plateNumber: '', make: '', model: '', color: '', vehicleType: 'Sedan' as CarWashVehicleType, editingId: undefined as string | undefined, originalVehicleId: undefined as string | undefined });

    const handleBulkImport = async (newCustomers: any[], newVehicles: any[]) => {
        try {
            await Promise.all([
                ...newCustomers.map(c => apiService.saveModuleRecord('carwash_customers', c)),
                ...newVehicles.map(v => apiService.saveModuleRecord('carwash_vehicles', v))
            ]);
            loadData();
            onDataChange();
        } catch (e) {
            console.error("Bulk import failed:", e);
            throw e;
        }
    };

    const handleEditCustomer = (cust: CarWashCustomer) => {
        const vehicle = vehicles.find(v => v.customerId === cust.id);
        setCustForm({
            name: cust.name,
            phoneNumber: cust.phoneNumber,
            email: cust.email || '',
            plateNumber: vehicle?.plateNumber || '',
            make: vehicle?.make || '',
            model: vehicle?.model || '',
            color: vehicle?.color || '',
            vehicleType: vehicle?.vehicleType || 'Sedan',
            editingId: cust.id,
            originalVehicleId: vehicle?.id
        });
        setShowNewCustomerModal(true);
    };

    const handleCreateCustomer = async () => {
        if (!custForm.name || !custForm.phoneNumber) {
            alert('Please provide at least a name and phone number');
            return;
        }

        try {
            const customerId = custForm.editingId || `cwc_${Date.now()}`;
            const cust: CarWashCustomer = {
                id: customerId,
                institutionId,
                name: custForm.name,
                phoneNumber: custForm.phoneNumber,
                email: custForm.email,
                loyaltyStamps: 0,
                stampsForFreeWash: 10,
                createdAt: new Date().toISOString()
            };

            // If editing, preserve the original creation date and stamps by finding the existing customer
            if (custForm.editingId) {
                const existing = customers.find(c => c.id === custForm.editingId);
                if (existing) {
                    cust.loyaltyStamps = existing.loyaltyStamps;
                    cust.stampsForFreeWash = existing.stampsForFreeWash;
                    cust.createdAt = existing.createdAt;
                }
            }

            await apiService.saveModuleRecord('carwash_customers', cust);

            // Auto-register customer as a user to grant Portal Access
            if (onRegisterUser) {
                // If they didn't provide an email, generate a dummy one required by User type
                const accountEmail = cust.email || `${cust.phoneNumber.replace(/[^0-9]/g, '')}@carwash.local`;

                const existingUser = users.find(u => u.email?.toLowerCase() === accountEmail.toLowerCase() || u.phoneNumber === cust.phoneNumber);

                // Only register and send credentials if this is a brand new customer (no editingId) AND no existing user exists
                if (!existingUser && !custForm.editingId) {
                    try {
                        // Generate a random 8 character password
                        const generatedPassword = Math.random().toString(36).slice(-8).toUpperCase();

                        await onRegisterUser({
                            name: cust.name,
                            email: accountEmail,
                            phoneNumber: cust.phoneNumber,
                            role: 'carwash_customer',
                            institutionId: institutionId,
                            expertise: ['Car Wash Customer'],
                            password: generatedPassword
                        });

                        // Dispatch SMS with Credentials
                        if (cust.phoneNumber) {
                            const smsMessage = `Welcome to ${currentInstitution.name}! Access your Customer Portal to track washes & download receipts.\nLogin: ${cust.phoneNumber}\nPass: ${generatedPassword}`;
                            try {
                                await onSendSms(cust.phoneNumber, smsMessage, smsConfig, 1, institutionId);
                            } catch (e) {
                                console.error('Failed to dispatch welcome credentials SMS', e);
                            }
                        }
                    } catch (e) {
                        console.error("Auto-registration failed:", e);
                    }
                }
            }

            if (custForm.plateNumber) {
                const vehicleId = custForm.originalVehicleId || `cwv_${Date.now()}`;
                const veh: CarWashVehicle = {
                    id: vehicleId,
                    institutionId,
                    customerId: cust.id,
                    plateNumber: custForm.plateNumber.toUpperCase(),
                    make: custForm.make,
                    model: custForm.model,
                    color: custForm.color,
                    vehicleType: custForm.vehicleType
                };
                await apiService.saveModuleRecord('carwash_vehicles', veh);
            }

            // If we were adding from the job modal, auto-select this customer and plate
            if (showNewJobModal && !custForm.editingId) {
                setJobForm(prev => ({
                    ...prev,
                    customerId: customerId,
                    vehiclePlate: custForm.plateNumber || prev.vehiclePlate,
                    vehicleType: custForm.vehicleType || prev.vehicleType
                }));
            }

            setShowNewCustomerModal(false);
            setCustForm({ name: '', phoneNumber: '', email: '', plateNumber: '', make: '', model: '', color: '', vehicleType: 'Sedan', editingId: undefined, originalVehicleId: undefined });
            loadData();
        } catch (e: any) {
            console.error("Save Customer Error:", e);
            alert(`Failed to save customer: ${e.message || JSON.stringify(e) || 'Unknown error'}`);
        }
    };

    // ── Package Form ──
    const [pkgForm, setPkgForm] = useState({
        name: '',
        description: '',
        pricing: {} as Partial<Record<CarWashVehicleType, number>>,
        estimatedMinutes: 30,
        includesInterior: false,
        color: PACKAGE_COLORS[0],
        commissionType: 'percentage' as 'percentage' | 'fixed',
        commissionValue: 0,
        editingId: undefined as string | undefined
    });
    const handleEditPackage = (pkg: CarWashPackage) => {
        setPkgForm({
            name: pkg.name,
            description: pkg.description || '',
            pricing: pkg.pricing,
            estimatedMinutes: pkg.estimatedMinutes,
            includesInterior: pkg.includesInterior || false,
            color: pkg.color || PACKAGE_COLORS[0],
            commissionType: pkg.commissionType || 'percentage',
            commissionValue: pkg.commissionValue || 0,
            editingId: pkg.id
        });
        setShowNewPackageModal(true);
    };
    const handleCreatePackage = async () => {
        if (!pkgForm.name) return;
        try {
            const pkg: CarWashPackage = {
                id: pkgForm.editingId || `cwp_${Date.now()}`,
                institutionId,
                name: pkgForm.name,
                description: pkgForm.description,
                pricing: pkgForm.pricing as Record<CarWashVehicleType, number>,
                estimatedMinutes: pkgForm.estimatedMinutes,
                includesInterior: pkgForm.includesInterior,
                isActive: true,
                color: pkgForm.color,
                commissionType: pkgForm.commissionType,
                commissionValue: pkgForm.commissionValue
            };
            await apiService.saveModuleRecord('carwash_packages', pkg);
            setShowNewPackageModal(false);
            setPkgForm({ name: '', description: '', pricing: {}, estimatedMinutes: 30, includesInterior: false, color: PACKAGE_COLORS[0], commissionType: 'percentage', commissionValue: 0, editingId: undefined });
            loadData();
        } catch (e: any) {
            console.error("Save Package Error:", e);
            alert(`Failed to save package: ${e.message || JSON.stringify(e) || 'Unknown error'}`);
        }
    };

    // ── Inventory Form ──
    const [invForm, setInvForm] = useState({ name: '', unit: 'litres', currentStock: 0, reorderLevel: 5, costPerUnit: 0, category: 'chemical' as CarWashInventoryItem['category'] });
    const handleCreateInventory = async () => {
        if (!invForm.name) return;
        try {
            const item: CarWashInventoryItem = { id: `cwi_${Date.now()}`, institutionId, ...invForm };
            await apiService.saveModuleRecord('carwash_inventory', item);
            setShowNewInventoryModal(false); setInvForm({ name: '', unit: 'litres', currentStock: 0, reorderLevel: 5, costPerUnit: 0, category: 'chemical' });
            loadData();
        } catch (e: any) {
            console.error("Save Inventory Error:", e);
            alert(`Failed to save inventory item: ${e.message || JSON.stringify(e) || 'Unknown error'}`);
        }
    };

    // ── Staff Form ──
    const [staffForm, setStaffForm] = useState({ name: '', phoneNumber: '', email: '', role: 'carwash_attendant', password: '' });
    const handleCreateStaff = async () => {
        if (!staffForm.name || !staffForm.phoneNumber || !staffForm.password) {
            alert('Name, phone, and password are required'); return;
        }
        try {
            const newUser: User = {
                id: `u_${Date.now()}`,
                institutionId,
                name: staffForm.name,
                phoneNumber: staffForm.phoneNumber,
                email: staffForm.email,
                role: staffForm.role as any,
                password: staffForm.password,
                expertise: []
            };
            await apiService.saveModuleRecord('users', newUser);
            setShowNewStaffModal(false);
            setStaffForm({ name: '', phoneNumber: '', email: '', role: 'carwash_attendant', password: '' });
            onDataChange(); // notify parent to reload users
        } catch (e: any) {
            console.error("Save Staff Error:", e);
            alert(`Failed to save staff: ${e.message || 'Unknown error'}`);
        }
    };

    // -- Expense Form --
    const [expForm, setExpForm] = useState({ description: '', amount: 0, category: 'supplies', paymentMethod: 'cash' as CarWashExpense['paymentMethod'], expenseDate: new Date().toISOString().split('T')[0] });
    const handleCreateExpense = async () => {
        if (!expForm.description || !expForm.amount) return alert('Description and amount are required');
        try {
            const exp: CarWashExpense = {
                id: editingExpense?.id || `cwe_${Date.now()}`,
                institutionId,
                ...expForm,
                recordedBy: users.some(u => u.id === currentUser.id) ? currentUser.id : undefined,
                createdAt: editingExpense?.createdAt || new Date().toISOString()
            };
            await apiService.saveModuleRecord('carwash_expenses', exp);

            // ── Accounting Integration: Expense ──
            const contraAcc = exp.paymentMethod === 'mpesa' ? '1010' : '1000';
            let expenseAcc = '5000'; // Default Supplies
            if (exp.category.toLowerCase().includes('utility')) expenseAcc = '5020';
            if (exp.category.toLowerCase().includes('maintenance')) expenseAcc = '5030';

            await recordJournalEntry(
                `Expense: ${exp.description} (${exp.category})`,
                exp.amount,
                expenseAcc, // Debit: Expense
                contraAcc,  // Credit: Cash/Mpesa
                'Expense',
                exp.id
            );

            setShowNewExpenseModal(false);
            setEditingExpense(null);
            setExpForm({ description: '', amount: 0, category: 'supplies', paymentMethod: 'cash', expenseDate: new Date().toISOString().split('T')[0] });
            loadData();
        } catch (e: any) { alert(`Failed: ${e.message}`); }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            await apiService.deleteModuleRecord('carwash_expenses', id);
            loadData();
        } catch (e: any) { alert(`Failed to delete: ${e.message}`); }
    };

    const handleEditExpense = (exp: CarWashExpense) => {
        setEditingExpense(exp);
        setExpForm({
            description: exp.description,
            amount: exp.amount,
            category: exp.category,
            paymentMethod: exp.paymentMethod,
            expenseDate: exp.expenseDate
        });
        setShowNewExpenseModal(true);
    };

    // -- Payroll Form --

    const handleProcessPayroll = async () => {
        if (!payrlForm.staffId) return alert('Select staff');
        try {
            const { nssf, shif, housingLevy, paye, gross } = calculateKenyanPayroll(payrlForm.baseSalary, payrlForm.commissionEarned);
            const totalPay = gross - nssf - shif - housingLevy - paye - payrlForm.advancesTaken - payrlForm.deductions;

            const pyrl: CarWashPayroll = {
                id: `cwp_${Date.now()}`,
                institutionId,
                ...payrlForm,
                nssf,
                shif,
                paye,
                housingLevy,
                totalPay,
                status: 'paid',
                paymentDate: new Date().toISOString(),
                processedBy: users.some(u => u.id === currentUser.id) ? currentUser.id : undefined,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('carwash_payroll', pyrl);

            // Mark jobs as commission paid
            const unpaidJobs = jobs.filter(j =>
                j.attendantId === pyrl.staffId &&
                j.status === 'completed' &&
                !j.isCommissionPaid &&
                j.completedAt &&
                j.completedAt.split('T')[0] >= pyrl.periodStart &&
                j.completedAt.split('T')[0] <= pyrl.periodEnd
            );

            for (const job of unpaidJobs) {
                await apiService.saveModuleRecord('carwash_jobs', { ...job, isCommissionPaid: true });
            }

            // ── Accounting Integration: Payroll ──
            await recordJournalEntry(
                `Payroll: ${attendants.find(a => a.id === pyrl.staffId)?.name || 'Staff'} - ${pyrl.periodStart}`,
                pyrl.totalPay,
                '5010', // Debit: Wages & Salary Expense
                '1000', // Credit: Cash on Hand
                'Payroll',
                pyrl.id
            );
            setShowNewPayrollModal(false);
            setPayrlForm({
                staffId: '', baseSalary: 0, commissionEarned: 0, advancesTaken: 0, deductions: 0,
                nssf: 0, shif: 0, paye: 0, housingLevy: 0,
                periodStart: new Date(Date.now() - 30 * 864e5).toISOString().split('T')[0],
                periodEnd: new Date().toISOString().split('T')[0]
            });
            loadData();
        } catch (e: any) { alert(`Failed: ${e.message}`); }
    };

    // ── Bulk Payroll Form ──
    const handleProcessBulkPayroll = async () => {
        if (!confirm('Are you sure you want to process payroll for all attendants in this period?')) return;
        try {
            let totalDisbursed = 0;
            const updatedJobs: CarWashJob[] = [];
            const newPayrolls: CarWashPayroll[] = [];

            for (const attendant of attendants) {
                // Find unpaid jobs for this attendant in the period
                const attendantJobs = jobs.filter(j =>
                    j.attendantId === attendant.id &&
                    j.status === 'completed' &&
                    !j.isCommissionPaid &&
                    j.completedAt &&
                    j.completedAt.split('T')[0] >= bulkPayrollPeriod.start &&
                    j.completedAt.split('T')[0] <= bulkPayrollPeriod.end
                );

                if (attendantJobs.length === 0) continue;

                // Calculate total commission for these jobs
                let totalCommission = 0;
                for (const job of attendantJobs) {
                    const pkg = packages.find(p => p.id === job.packageId);
                    if (pkg) {
                        if (pkg.commissionType === 'fixed') totalCommission += (pkg.commissionValue || 0);
                        else totalCommission += (job.amountCharged * (pkg.commissionValue || 0)) / 100;
                    }
                    updatedJobs.push({ ...job, isCommissionPaid: true });
                }

                const basicSalary = 0; // Default or configured per attendant
                const { nssf, shif, housingLevy, paye, gross } = calculateKenyanPayroll(basicSalary, totalCommission);
                const totalPay = gross - nssf - shif - housingLevy - paye;

                newPayrolls.push({
                    id: `cwp_${Date.now()}_${attendant.id}`,
                    institutionId,
                    staffId: attendant.id,
                    baseSalary: basicSalary,
                    commissionEarned: totalCommission,
                    advancesTaken: 0,
                    deductions: 0,
                    nssf, shif, housingLevy, paye, totalPay,
                    periodStart: bulkPayrollPeriod.start,
                    periodEnd: bulkPayrollPeriod.end,
                    status: 'paid',
                    paymentDate: new Date().toISOString(),
                    processedBy: users.some(u => u.id === currentUser.id) ? currentUser.id : undefined,
                    createdAt: new Date().toISOString()
                });

                totalDisbursed += totalPay;
            }

            if (newPayrolls.length === 0) {
                return alert('No unpaid commissions found in this period.');
            }

            // Save all generated payrolls concurrently
            await Promise.all(newPayrolls.map(pr => apiService.saveModuleRecord('carwash_payroll', pr)));
            await Promise.all(updatedJobs.map(job => apiService.saveModuleRecord('carwash_jobs', job)));

            // Single journal entry for the bulk disbursement
            await recordJournalEntry(
                `Bulk Payroll Processing: ${bulkPayrollPeriod.start} to ${bulkPayrollPeriod.end}`,
                totalDisbursed,
                '5010', // Debit: Wages & Salary Expense
                '1000', // Credit: Cash on Hand
                'Payroll',
                `bulk_pyrl_${Date.now()}`
            );

            setShowBulkPayrollModal(false);
            alert(`Successfully processed payroll for ${newPayrolls.length} attendants. Total disbursed: KES ${totalDisbursed.toLocaleString()}`);
            loadData();
        } catch (e: any) {
            alert(`Failed: ${e.message}`);
        }
    };

    // ── Feedback Form ──
    const [fbRating, setFbRating] = useState(5); const [fbComment, setFbComment] = useState('');
    const handleSubmitFeedback = async () => {
        if (!showFeedbackModal) return;
        try {
            const fb: CarWashFeedback = { id: `cwf_${Date.now()}`, institutionId, jobId: showFeedbackModal.id, customerId: showFeedbackModal.customerId, rating: fbRating, comment: fbComment, createdAt: new Date().toISOString() };
            await apiService.saveModuleRecord('carwash_feedback', fb);
            setShowFeedbackModal(null); setFbRating(5); setFbComment('');
            loadData();
        } catch (e: any) {
            console.error("Submit Feedback Error:", e);
            alert(`Failed to submit feedback: ${e.message || JSON.stringify(e) || 'Unknown error'}`);
        }
    };

    const inputCls = 'w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-semibold outline-none transition-all';
    const labelCls = 'block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1 tracking-widest';

    const statusColor: Record<CarWashJob['status'], string> = { queued: 'bg-amber-100 text-amber-700', in_progress: 'bg-blue-100 text-blue-700', ready: 'bg-purple-100 text-purple-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' };

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <ChartPieIcon className="w-4 h-4" /> },
        { id: 'queue', label: 'Queue & Bays', icon: <ClockIcon className="w-4 h-4" /> },
        { id: 'customers', label: 'Customers', icon: <UserGroupIcon className="w-4 h-4" /> },
        { id: 'services', label: 'Services', icon: <SparklesIcon className="w-4 h-4" /> },
        { id: 'inventory', label: 'Inventory', icon: <ArchiveBoxIcon className="w-4 h-4" /> },
        { id: 'staff', label: 'Staff', icon: <UserIcon className="w-4 h-4" /> },
        { id: 'reports', label: 'Reports', icon: <ChartBarIcon className="w-4 h-4" /> },
        { id: 'feedback', label: 'Feedback', icon: <StarIcon className="w-4 h-4" /> },
        { id: 'broadcast', label: 'Broadcast', icon: <EnvelopeIcon className="w-4 h-4" /> },
        { id: 'transactions', label: 'Bills & Payments', icon: <CurrencyIcon className="w-4 h-4" /> },
        { id: 'finance', label: 'Finance', icon: <BanknotesIcon className="w-4 h-4" /> },
        { id: 'hybrid_pos', label: 'Hybrid POS', icon: <ArchiveBoxIcon className="w-4 h-4" /> },
        { id: 'kds', label: 'Kitchen Display', icon: <ClipboardListIcon className="w-4 h-4" /> },
        { id: 'live_board', label: 'Live Board', icon: <EyeIcon className="w-4 h-4" /> },
        { id: 'cafe_menu', label: 'Cafe Menu', icon: <ArchiveBoxIcon className="w-4 h-4" /> },
        currentUser.role === 'carwash_admin' ? { id: 'settings', label: 'Settings', icon: <Cog8ToothIcon className="w-4 h-4" /> } : null,
    ].filter(Boolean) as { id: string, label: string, icon: React.ReactNode }[];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-sky-700 px-8 py-6 flex items-center justify-between shadow-xl">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">🚗 {currentInstitution.name}</h1>
                    <p className="text-xs font-bold text-cyan-200 uppercase tracking-widest mt-0.5">Car Wash Management System</p>
                </div>
                <div className="flex items-center gap-3">
                    {lowStock.length > 0 && <span className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-black uppercase rounded-full animate-pulse">{lowStock.length} Low Stock</span>}
                    <span className="px-3 py-1.5 bg-white/20 text-white text-[10px] font-black uppercase rounded-full">{activeJobs.length} Active Jobs</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 flex overflow-x-auto gap-1 scrollbar-hide">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                        className={`flex items-center gap-2 px-4 py-4 text-[11px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${activeTab === t.id ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            <div className="p-6 space-y-6">
                {loading && <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>}

                {/* DASHBOARD */}
                {!loading && activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: "Today's Revenue", value: `KES ${todayRevenue.toLocaleString()}`, sub: `${todayJobs.filter(j => j.status === 'completed').length} washes`, color: 'from-emerald-500 to-teal-600' },
                                { label: 'Active Queue', value: activeJobs.length, sub: `${jobs.filter(j => j.status === 'in_progress').length} in bays, ${jobs.filter(j => j.status === 'ready').length} waiting`, color: 'from-blue-500 to-cyan-600' },
                                { label: 'Total Customers', value: customers.length, sub: `${vehicles.length} vehicles registered`, color: 'from-violet-500 to-purple-600' },
                                { label: 'Avg Rating', value: `${avgRating} ★`, sub: `${feedbacks.length} reviews`, color: 'from-amber-500 to-orange-600' },
                            ].map(card => (
                                <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-3xl p-6 text-white shadow-lg`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{card.label}</p>
                                    <p className="text-3xl font-black mt-1">{card.value}</p>
                                    <p className="text-xs font-bold opacity-70 mt-1">{card.sub}</p>
                                </div>
                            ))}
                        </div>
                        {lowStock.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
                                <h3 className="text-sm font-black uppercase text-red-700 mb-3">⚠️ Low Stock Alerts</h3>
                                <div className="flex flex-wrap gap-2">{lowStock.map(i => <span key={i.id} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg">{i.name} — {i.currentStock} {i.unit} left</span>)}</div>
                            </div>
                        )}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6">
                            <h3 className="text-sm font-black uppercase text-slate-700 dark:text-white mb-6">Profit Analysis (Last 3 Months)</h3>
                            <div className="flex items-end justify-around h-64 gap-2 border-b-2 border-slate-200 dark:border-slate-700 pb-2 relative">
                                {/* Y-Axis lines optional, keep it clean */}
                                {last3MonthsData.map((d, i) => (
                                    <AnimatedProfitBar key={d.label} d={d} i={i} maxGraphValue={maxGraphValue} />
                                ))}
                            </div>
                            <div className="flex justify-center gap-6 mt-6">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-teal-500" /><span className="text-[10px] font-black uppercase text-slate-500">Revenue</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500" /><span className="text-[10px] font-black uppercase text-slate-500">Expenses & Payroll</span></div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6">
                            <h3 className="text-sm font-black uppercase text-slate-700 dark:text-white mb-4">Recent Jobs</h3>
                            <div className="space-y-2">
                                {jobs.slice(0, 8).map(job => (
                                    <div key={job.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">🚗</span>
                                            <div>
                                                <p className="text-sm font-black">{job.vehiclePlate}</p>
                                                <p className="text-[10px] text-slate-400">{job.packageName} · {job.vehicleType}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${statusColor[job.status]}`}>{job.status.replace('_', ' ')}</span>
                                            <span className="text-sm font-black text-emerald-600">KES {getJobTabTotal(job).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* QUEUE & BAYS */}
                {!loading && activeTab === 'queue' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-black uppercase">Live Queue</h2>
                            <button onClick={() => setShowNewJobModal(true)} className="flex items-center gap-2 px-5 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow hover:bg-cyan-700 transition-all">
                                <PlusIcon className="w-4 h-4" /> New Job
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {(['queued', 'in_progress', 'ready', 'completed'] as const).map(status => (
                                <div key={status} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                                    <h3 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${status === 'queued' ? 'text-amber-600' : status === 'in_progress' ? 'text-blue-600' : status === 'ready' ? 'text-purple-600' : 'text-emerald-600'}`}>
                                        {status === 'queued' ? '🕐 Queue' : status === 'in_progress' ? '🔄 In Bays' : status === 'ready' ? '🏁 Waiting' : '✅ Done'} ({jobs.filter(j => j.status === status && j.createdAt?.startsWith(new Date().toISOString().split('T')[0])).length})
                                    </h3>
                                    <div className="space-y-2">
                                        {jobs.filter(j => j.status === status).map(job => (
                                            <div key={job.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-black text-sm">{job.vehiclePlate}</p>
                                                        <p className="text-[10px] text-slate-400">{job.packageName} · Bay {job.bayNumber}</p>
                                                        <p className="text-[10px] text-slate-400">{job.attendantName || 'Unassigned'}</p>
                                                    </div>
                                                    <p className="font-black text-emerald-600 text-sm">KES {getJobTabTotal(job).toLocaleString()}</p>
                                                </div>
                                                <div className="flex gap-1 mt-2">
                                                    {status === 'queued' && <button onClick={() => updateJobStatus(job, 'in_progress')} className="flex-1 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase">Start</button>}
                                                    {status === 'in_progress' && <button onClick={() => updateJobStatus(job, 'ready')} className="flex-1 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-black uppercase">Finish</button>}
                                                    {status === 'ready' && <button onClick={() => updateJobStatus(job, 'completed')} className="flex-1 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase">Checkout</button>}
                                                    {status === 'queued' && <button onClick={() => updateJobStatus(job, 'cancelled')} className="py-1.5 px-2 bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase">✕</button>}
                                                </div>
                                            </div>
                                        ))}
                                        {jobs.filter(j => j.status === status).length === 0 && <p className="text-xs text-slate-400 text-center py-4">No jobs</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CUSTOMERS */}
                {!loading && activeTab === 'customers' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-black uppercase">Customer Registry</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setShowSmartImporter(true)} className="flex items-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-black text-sm uppercase shadow-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">
                                    <ArrowUpTrayIcon className="w-4 h-4" /> Import
                                </button>
                                <button onClick={() => { setCustForm(prev => ({ ...prev, name: '', phoneNumber: '', email: '', plateNumber: '', make: '', model: '', color: '', vehicleType: 'Sedan', editingId: undefined, originalVehicleId: undefined })); setShowNewCustomerModal(true); }} className="flex items-center gap-2 px-5 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow hover:bg-cyan-700 transition-all active:scale-95 animate-pulse-subtle">
                                    <PlusIcon className="w-4 h-4" /> Add Customer
                                </button>
                            </div>
                        </div>
                        <div className="relative"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers or plate..." className={inputCls + ' pl-10'} /><SearchIcon className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {customers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phoneNumber.includes(search)).map(cust => {
                                const custVehicles = vehicles.filter(v => v.customerId === cust.id);
                                const custJobs = jobs.filter(j => j.customerId === cust.id);
                                return (
                                    <div key={cust.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center text-white text-xl font-black">{cust.name.charAt(0)}</div>
                                                <div>
                                                    <p className="font-black text-sm">{cust.name}</p>
                                                    <p className="text-xs text-slate-400">{cust.phoneNumber}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleEditCustomer(cust)} className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-cyan-600 transition-colors">
                                                <Cog8ToothIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-2">
                                            <span>{custVehicles.length} vehicle{custVehicles.length !== 1 ? 's' : ''}</span>
                                            <span>{custJobs.length} washes</span>
                                        </div>
                                        <div className="flex items-center gap-1 flex-wrap">
                                            {Array.from({ length: 10 }).map((_, i) => <span key={i} className={`w-5 h-5 rounded-full text-center text-[10px] leading-5 font-black ${i < cust.loyaltyStamps ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-300'}`}>★</span>)}
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-1">{cust.loyaltyStamps}/10 stamps for free wash</p>
                                        {custVehicles.map(v => <p key={v.id} className="text-[10px] font-mono mt-1 bg-slate-50 dark:bg-slate-900 rounded px-2 py-0.5">{v.plateNumber} · {v.make} {v.model}</p>)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* SERVICES */}
                {!loading && activeTab === 'services' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-black uppercase">Service Packages</h2>
                            <button onClick={() => { setPkgForm({ name: '', description: '', pricing: {}, estimatedMinutes: 30, includesInterior: false, color: PACKAGE_COLORS[0], commissionType: 'percentage', commissionValue: 0, editingId: undefined }); setShowNewPackageModal(true); }} className="flex items-center gap-2 px-5 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow hover:bg-cyan-700 transition-all"><PlusIcon className="w-4 h-4" /> New Package</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {packages.map(pkg => (
                                <div key={pkg.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                    <div className="h-2" style={{ background: pkg.color || '#6366f1' }} />
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-black text-base">{pkg.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleEditPackage(pkg)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-cyan-600 transition-all" title="Edit Package">
                                                    <Cog8ToothIcon className="w-4 h-4" />
                                                </button>
                                                <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">{pkg.estimatedMinutes} min</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-3">{pkg.description}</p>
                                        <div className="space-y-1">
                                            {Object.entries(pkg.pricing).map(([type, price]) => (
                                                <div key={type} className="flex justify-between text-xs"><span className="font-semibold">{type}</span><span className="font-black text-emerald-600">KES {price.toLocaleString()}</span></div>
                                            ))}
                                        </div>
                                        {pkg.includesInterior && <p className="text-[9px] font-black text-cyan-600 mt-2 uppercase">✓ Includes Interior Cleaning</p>}
                                    </div>
                                </div>
                            ))}
                            {packages.length === 0 && <div className="col-span-3 text-center py-20 text-slate-400"><SparklesIcon className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-bold">No packages yet. Add your first service.</p></div>}
                        </div>
                    </div>
                )}

                {/* INVENTORY */}
                {!loading && activeTab === 'inventory' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-black uppercase">Consumables & Stock</h2>
                            <button onClick={() => setShowNewInventoryModal(true)} className="flex items-center gap-2 px-5 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow hover:bg-cyan-700 transition-all"><PlusIcon className="w-4 h-4" /> Add Item</button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"><th className="px-5 py-4 text-left text-[10px] font-black uppercase text-slate-400">Item</th><th className="px-5 py-4 text-left text-[10px] font-black uppercase text-slate-400">Category</th><th className="px-5 py-4 text-right text-[10px] font-black uppercase text-slate-400">In Stock</th><th className="px-5 py-4 text-right text-[10px] font-black uppercase text-slate-400">Reorder At</th><th className="px-5 py-4 text-right text-[10px] font-black uppercase text-slate-400">Status</th></tr></thead>
                                <tbody>{inventory.map(item => (
                                    <tr key={item.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="px-5 py-4 font-bold">{item.name}</td>
                                        <td className="px-5 py-4 text-slate-500 capitalize">{item.category}</td>
                                        <td className="px-5 py-4 text-right font-black">{item.currentStock} {item.unit}</td>
                                        <td className="px-5 py-4 text-right text-slate-400">{item.reorderLevel} {item.unit}</td>
                                        <td className="px-5 py-4 text-right"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${item.currentStock <= item.reorderLevel ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.currentStock <= item.reorderLevel ? 'Low' : 'OK'}</span></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                            {inventory.length === 0 && <p className="text-center py-16 text-slate-400 font-bold">No inventory items tracked yet.</p>}
                        </div>
                    </div>
                )}

                {/* STAFF */}
                {!loading && activeTab === 'staff' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-black uppercase">Attendant Performance & Staff</h2>
                            <button onClick={() => setShowNewStaffModal(true)} className="flex items-center gap-2 px-5 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow hover:bg-cyan-700 transition-all"><PlusIcon className="w-4 h-4" /> Add Staff</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {attendants.map(att => {
                                const attJobs = jobs.filter(j => j.attendantId === att.id && j.status === 'completed');
                                const revenue = attJobs.reduce((s, j) => s + (j.amountPaid || 0), 0);
                                return (
                                    <div key={att.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                                        <div className="flex items-center gap-3 mb-4">
                                            {att.profilePhotoUrl ? <img src={att.profilePhotoUrl} className="w-12 h-12 rounded-2xl object-cover" alt={att.name} /> : <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center text-white text-lg font-black">{att.name.charAt(0)}</div>}
                                            <div><p className="font-black">{att.name}</p><p className="text-xs text-slate-400 capitalize">{formatRoleDisplayName(att.role, currentInstitution)}</p></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-center"><p className="text-2xl font-black text-cyan-600">{attJobs.length}</p><p className="text-[9px] font-black text-slate-400 uppercase">Jobs Done</p></div>
                                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-center"><p className="text-lg font-black text-emerald-600">KES{(revenue / 1000).toFixed(1)}K</p><p className="text-[9px] font-black text-slate-400 uppercase">Revenue</p></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* REPORTS */}
                {!loading && activeTab === 'reports' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-black uppercase">Revenue Reports</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {[
                                { label: "Today", jobs: jobs.filter(j => j.status === 'completed' && j.createdAt?.startsWith(new Date().toISOString().split('T')[0])) },
                                { label: "This Week", jobs: jobs.filter(j => j.status === 'completed' && new Date(j.createdAt) > new Date(Date.now() - 7 * 864e5)) },
                                { label: "This Month", jobs: jobs.filter(j => j.status === 'completed' && new Date(j.createdAt).getMonth() === new Date().getMonth()) },
                            ].map(period => (
                                <div key={period.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
                                    <p className="text-[10px] font-black uppercase text-slate-400">{period.label}</p>
                                    <p className="text-3xl font-black text-emerald-600 mt-1">KES {period.jobs.reduce((s, j) => s + (j.amountPaid || 0), 0).toLocaleString()}</p>
                                    <p className="text-xs font-bold text-slate-400 mt-1">{period.jobs.length} washes completed</p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
                            <h3 className="font-black uppercase text-sm mb-4">Revenue by Package</h3>
                            {packages.map(pkg => {
                                const pkgJobs = jobs.filter(j => j.packageId === pkg.id && j.status === 'completed');
                                const rev = pkgJobs.reduce((s, j) => s + (j.amountPaid || 0), 0);
                                const maxRev = Math.max(...packages.map(p => jobs.filter(j => j.packageId === p.id && j.status === 'completed').reduce((s, j) => s + (j.amountPaid || 0), 0)), 1);
                                return (
                                    <div key={pkg.id} className="mb-3">
                                        <div className="flex justify-between text-xs font-bold mb-1"><span>{pkg.name}</span><span className="text-emerald-600">KES {rev.toLocaleString()}</span></div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${(rev / maxRev) * 100}%`, background: pkg.color || '#06b6d4' }} /></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* FEEDBACK */}
                {!loading && activeTab === 'feedback' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-black uppercase">Customer Feedback</h2>
                            <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl"><span className="text-2xl font-black text-amber-600">{avgRating}</span><span className="text-xs font-bold text-amber-500 ml-1">/ 5</span></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {feedbacks.map(fb => (
                                <div key={fb.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                                    <div className="flex items-center gap-1 mb-2">{Array.from({ length: 5 }).map((_, i) => <span key={i} className={`text-lg ${i < fb.rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>)}</div>
                                    {fb.comment && <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{fb.comment}"</p>}
                                    <p className="text-[10px] text-slate-400 mt-2">{new Date(fb.createdAt).toLocaleDateString()}</p>
                                </div>
                            ))}
                            {feedbacks.length === 0 && <div className="col-span-2 text-center py-16 text-slate-400"><StarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-bold">No feedback collected yet.</p></div>}
                        </div>
                    </div>
                )}

                {/* BROADCAST */}
                {!loading && activeTab === 'broadcast' && (
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <CommunicationsManager
                            users={[
                                ...attendants,
                                ...customers.map(c => ({
                                    id: c.id,
                                    name: c.name,
                                    email: c.email || '',
                                    phoneNumber: c.phoneNumber,
                                    role: 'customer' as any,
                                    institutionId: c.institutionId,
                                    isActive: true,
                                    createdAt: c.createdAt,
                                    expertise: []
                                }))
                            ]}
                            departments={departments || []}
                            courses={courses || []}
                            smsConfig={smsConfig}
                            smsBalance={smsBalance}
                            onSendSms={onSendSms}
                            currentInstitution={currentInstitution}
                            currentUser={currentUser}
                            mpesaConfig={mpesaConfig}
                            onRefreshData={onDataChange}
                            moduleContext="carwash"
                        />
                    </div>
                )}

                {/* TRANSACTIONS */}
                {!loading && activeTab === 'transactions' && (
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Financial History</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Audit log of all car wash payments</p>
                            </div>
                            <div className="flex gap-4 items-center">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Collected</p>
                                    <p className="text-2xl font-black text-emerald-600">KES {transactions.filter(t => t.status === 'completed').reduce((s, t) => s + (t.amount || 0), 0).toLocaleString()}</p>
                                </div>
                                <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
                                    <p className="text-2xl font-black text-amber-500">KES {transactions.filter(t => t.status === 'pending').reduce((s, t) => s + (t.amount || 0), 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Transaction ID</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Details</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Amount</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Date/Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(t => (
                                        <tr key={t.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                                            <td className="px-8 py-5 font-mono text-xs font-bold text-slate-500 uppercase tracking-tighter">{t.transactionId || t.id.split('_').pop()}</td>
                                            <td className="px-8 py-5">
                                                <p className="font-black text-slate-700 dark:text-slate-200">{t.phoneNumber}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.description}</p>
                                            </td>
                                            <td className="px-8 py-5 font-black text-emerald-600">KES {(t.amount || 0).toLocaleString()}</td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${t.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                    t.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-xs font-bold text-slate-400">{new Date(t.timestamp).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-black uppercase tracking-widest">No payment records found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* CHECKOUT MODAL */}
            {showCheckoutModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-700">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-8 py-8 flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/30">
                                <CurrencyIcon className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Process Checkout</h3>
                            <p className="text-emerald-50 text-xs font-bold uppercase tracking-[0.2em] mt-2 opacity-80">Job ID: {showCheckoutModal.id.split('_').pop()}</p>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vehicle Summary</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm font-bold">
                                        <span className="text-slate-500">{showCheckoutModal.packageName} ({showCheckoutModal.vehicleType})</span>
                                        <span className="text-slate-700 dark:text-white">KES {(showCheckoutModal.amountCharged || 0).toLocaleString()}</span>
                                    </div>
                                    {showCheckoutModal.addOns.map(ao => (
                                        <div key={ao} className="flex justify-between text-xs font-bold text-slate-400">
                                            <span>+ {ao}</span>
                                            <span>Included</span>
                                        </div>
                                    ))}
                                    <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Total Payable</span>
                                        <span className="text-2xl font-black text-emerald-600">KES {(showCheckoutModal.amountCharged || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Choose Payment Method</p>

                                {/* Loyalty Points Redemption Box */}
                                {customers.find(c => c.id === showCheckoutModal.customerId) && (customers.find(c => c.id === showCheckoutModal.customerId)?.loyaltyPoints || 0) > 0 && (
                                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/30">
                                                    <StarIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-amber-900 dark:text-amber-400 uppercase tracking-tight">Loyalty Reward Available</h4>
                                                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500/80 uppercase tracking-widest mt-0.5">
                                                        Customer has {(customers.find(c => c.id === showCheckoutModal.customerId)?.loyaltyPoints || 0).toLocaleString()} points
                                                    </p>
                                                </div>
                                            </div>
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${useLoyaltyPoints ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>Use Points</span>
                                                <div className="relative">
                                                    <input type="checkbox" className="sr-only" checked={useLoyaltyPoints} onChange={(e) => setUseLoyaltyPoints(e.target.checked)} />
                                                    <div className={`block w-12 h-6 rounded-full transition-colors duration-300 ease-in-out ${useLoyaltyPoints ? 'bg-amber-500 shadow-inner' : 'bg-slate-300 dark:bg-slate-700 border border-slate-400/20'}`}></div>
                                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out shadow-sm ${useLoyaltyPoints ? 'transform translate-x-6' : ''}`}></div>
                                                </div>
                                            </label>
                                        </div>

                                        {useLoyaltyPoints && (
                                            <div className="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-800/50 flex justify-between items-center animate-in slide-in-from-top-2">
                                                <span className="text-xs font-black text-amber-800 dark:text-amber-500 uppercase tracking-widest">Discount Applied:</span>
                                                <span className="text-lg font-black text-rose-600">- KES {Math.min(showCheckoutModal.amountCharged, customers.find(c => c.id === showCheckoutModal.customerId)?.loyaltyPoints || 0).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {useLoyaltyPoints && customers.find(c => c.id === showCheckoutModal.customerId) && (
                                    <div className="flex justify-between items-center px-4 py-3 bg-slate-900 text-white rounded-2xl">
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Final Amount Required:</span>
                                        <span className="text-xl font-black text-emerald-400">
                                            KES {Math.max(0, showCheckoutModal.amountCharged - (customers.find(c => c.id === showCheckoutModal.customerId)?.loyaltyPoints || 0)).toLocaleString()}
                                        </span>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleCheckout(showCheckoutModal, 'cash')}
                                        disabled={isProcessingPayment}
                                        className="flex flex-col items-center gap-3 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                            <CurrencyIcon className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">Cash</span>
                                    </button>
                                    <button
                                        onClick={() => handleCheckout(showCheckoutModal, 'mpesa')}
                                        disabled={isProcessingPayment}
                                        className="flex flex-col items-center gap-3 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                            <SparklesIcon className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">M-Pesa</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 pb-8 flex gap-4">
                            <button
                                onClick={() => setShowCheckoutModal(null)}
                                disabled={isProcessingPayment}
                                className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW JOB MODAL */}
            {showNewJobModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="bg-cyan-600 px-6 py-5 flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase">New Wash Job</h3><button onClick={() => setShowNewJobModal(false)}><XIcon className="w-5 h-5 text-white" /></button></div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div><label className={labelCls}>{jobForm.vehicleType === 'Other' ? 'Item Name / Identifier (optional)' : 'Vehicle Plate'}</label><input className={inputCls} value={jobForm.vehiclePlate} onChange={e => setJobForm({ ...jobForm, vehiclePlate: e.target.value })} placeholder={jobForm.vehicleType === 'Other' ? 'e.g. Living Room Carpet' : 'e.g. KCA 123A'} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Vehicle Type</label><select className={inputCls} value={jobForm.vehicleType} onChange={e => setJobForm({ ...jobForm, vehicleType: e.target.value as CarWashVehicleType })}>{VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                                <div><label className={labelCls}>Bay #</label><input type="number" className={inputCls} value={jobForm.bayNumber} onChange={e => setJobForm({ ...jobForm, bayNumber: +e.target.value })} min={1} max={20} /></div>
                            </div>
                            <div><label className={labelCls}>Package</label><select className={inputCls} value={jobForm.packageId} onChange={e => setJobForm({ ...jobForm, packageId: e.target.value })}><option value="">-- Select --</option>{packages.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name} — KES {p.pricing[jobForm.vehicleType] || 'N/A'}</option>)}</select></div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className={labelCls}>Customer (optional)</label>
                                    <button
                                        type="button"
                                        onClick={() => { setCustForm(prev => ({ ...prev, editingId: undefined, originalVehicleId: undefined })); setShowNewCustomerModal(true); }}
                                        className="text-[10px] font-black text-cyan-600 uppercase hover:underline flex items-center gap-1"
                                    >
                                        <PlusIcon className="w-3 h-3" /> New Customer
                                    </button>
                                </div>
                                <select className={inputCls} value={jobForm.customerId} onChange={e => setJobForm({ ...jobForm, customerId: e.target.value })}>
                                    <option value="">-- Walk-in --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phoneNumber})</option>)}
                                </select>
                            </div>
                            <div><label className={labelCls}>Attendant</label><select className={inputCls} value={jobForm.attendantId} onChange={e => setJobForm({ ...jobForm, attendantId: e.target.value })}><option value="">-- Unassigned --</option>{attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                            <div><label className={labelCls}>Payment Method</label><select className={inputCls} value={jobForm.paymentMethod} onChange={e => setJobForm({ ...jobForm, paymentMethod: e.target.value as CarWashPaymentMethod })}>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select></div>
                            <div><label className={labelCls}>Add-ons</label><div className="flex flex-wrap gap-2">{ADD_ONS.map(ao => <button key={ao} type="button" onClick={() => setJobForm(prev => ({ ...prev, addOns: prev.addOns.includes(ao) ? prev.addOns.filter(x => x !== ao) : [...prev.addOns, ao] }))} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${jobForm.addOns.includes(ao) ? 'bg-cyan-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{ao}</button>)}</div></div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3"><button onClick={() => setShowNewJobModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-black text-sm uppercase">Cancel</button><button onClick={handleCreateJob} className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow">Add to Queue</button></div>
                    </div>
                </div>
            )}

            {/* NEW CUSTOMER MODAL */}
            {showNewCustomerModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-cyan-600 px-6 py-5 flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase">{custForm.editingId ? 'Edit Customer' : 'New Customer'}</h3><button onClick={() => setShowNewCustomerModal(false)}><XIcon className="w-5 h-5 text-white" /></button></div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div><label className={labelCls}>Full Name</label><input className={inputCls} value={custForm.name} onChange={e => setCustForm({ ...custForm, name: e.target.value })} placeholder="John Doe" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Phone</label><input className={inputCls} value={custForm.phoneNumber} onChange={e => setCustForm({ ...custForm, phoneNumber: e.target.value })} placeholder="07xx..." /></div>
                                <div><label className={labelCls}>Email</label><input className={inputCls} value={custForm.email} onChange={e => setCustForm({ ...custForm, email: e.target.value })} placeholder="optional" /></div>
                            </div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-t pt-3">Vehicle (optional)</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Plate</label><input className={inputCls} value={custForm.plateNumber} onChange={e => setCustForm({ ...custForm, plateNumber: e.target.value })} placeholder="KCA 123A" /></div>
                                <div><label className={labelCls}>Type</label><select className={inputCls} value={custForm.vehicleType} onChange={e => setCustForm({ ...custForm, vehicleType: e.target.value as CarWashVehicleType })}>{VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                                <div><label className={labelCls}>Make</label><input className={inputCls} value={custForm.make} onChange={e => setCustForm({ ...custForm, make: e.target.value })} placeholder="Toyota" /></div>
                                <div><label className={labelCls}>Model</label><input className={inputCls} value={custForm.model} onChange={e => setCustForm({ ...custForm, model: e.target.value })} placeholder="Vitz" /></div>
                                <div><label className={labelCls}>Color</label><input className={inputCls} value={custForm.color} onChange={e => setCustForm({ ...custForm, color: e.target.value })} placeholder="White" /></div>
                            </div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3"><button onClick={() => setShowNewCustomerModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-black text-sm uppercase">Cancel</button><button onClick={handleCreateCustomer} className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow">{custForm.editingId ? 'Save Changes' : 'Save Customer'}</button></div>
                    </div>
                </div>
            )}

            {/* NEW PACKAGE MODAL */}
            {showNewPackageModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-cyan-600 px-6 py-5 flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase">{pkgForm.editingId ? 'Edit Package' : 'New Package'}</h3><button onClick={() => setShowNewPackageModal(false)}><XIcon className="w-5 h-5 text-white" /></button></div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div><label className={labelCls}>Package Name</label><input className={inputCls} value={pkgForm.name} onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })} placeholder="e.g. Premium Wash" /></div>
                            <div><label className={labelCls}>Description</label><input className={inputCls} value={pkgForm.description} onChange={e => setPkgForm({ ...pkgForm, description: e.target.value })} placeholder="What's included..." /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Est. Minutes</label><input type="number" className={inputCls} value={pkgForm.estimatedMinutes} onChange={e => setPkgForm({ ...pkgForm, estimatedMinutes: +e.target.value })} /></div>
                                <div className="flex items-center gap-3 pt-5"><input type="checkbox" id="interior" checked={pkgForm.includesInterior} onChange={e => setPkgForm({ ...pkgForm, includesInterior: e.target.checked })} className="w-5 h-5" /><label htmlFor="interior" className="text-xs font-bold">Includes Interior</label></div>
                            </div>
                            <div><label className={labelCls}>Pricing by Vehicle Type (KES)</label><div className="space-y-2">{VEHICLE_TYPES.map(vt => <div key={vt} className="flex items-center gap-3"><span className="text-xs font-bold w-20">{vt}</span><input type="number" className={inputCls} placeholder="0" value={pkgForm.pricing[vt] || ''} onChange={e => setPkgForm(prev => ({ ...prev, pricing: { ...prev.pricing, [vt]: +e.target.value } }))} /></div>)}</div></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Commission Type</label><select className={inputCls} value={pkgForm.commissionType} onChange={e => setPkgForm({ ...pkgForm, commissionType: e.target.value as any })}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed Amount</option></select></div>
                                <div><label className={labelCls}>Commission Value</label><input type="number" className={inputCls} value={pkgForm.commissionValue} onChange={e => setPkgForm({ ...pkgForm, commissionValue: +e.target.value })} /></div>
                            </div>
                            <div><label className={labelCls}>Accent Color</label><div className="flex gap-2">{PACKAGE_COLORS.map(c => <button key={c} type="button" onClick={() => setPkgForm({ ...pkgForm, color: c })} className={`w-8 h-8 rounded-full border-2 transition-all ${pkgForm.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`} style={{ background: c }} />)}</div></div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3"><button onClick={() => setShowNewPackageModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-black text-sm uppercase">Cancel</button><button onClick={handleCreatePackage} className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow">{pkgForm.editingId ? 'Save Changes' : 'Save Package'}</button></div>
                    </div>
                </div>
            )}

            {/* INVENTORY MODAL */}
            {showNewInventoryModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-cyan-600 px-6 py-5 flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase">Add Inventory</h3><button onClick={() => setShowNewInventoryModal(false)}><XIcon className="w-5 h-5 text-white" /></button></div>
                        <div className="p-6 space-y-4">
                            <div><label className={labelCls}>Item Name</label><input className={inputCls} value={invForm.name} onChange={e => setInvForm({ ...invForm, name: e.target.value })} placeholder="e.g. Car Shampoo" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Category</label><select className={inputCls} value={invForm.category} onChange={e => setInvForm({ ...invForm, category: e.target.value as any })}><option value="chemical">Chemical</option><option value="equipment">Equipment</option><option value="consumable">Consumable</option><option value="other">Other</option></select></div>
                                <div><label className={labelCls}>Unit</label><input className={inputCls} value={invForm.unit} onChange={e => setInvForm({ ...invForm, unit: e.target.value })} placeholder="litres / pcs" /></div>
                                <div><label className={labelCls}>Current Stock</label><input type="number" className={inputCls} value={invForm.currentStock} onChange={e => setInvForm({ ...invForm, currentStock: +e.target.value })} /></div>
                                <div><label className={labelCls}>Reorder Level</label><input type="number" className={inputCls} value={invForm.reorderLevel} onChange={e => setInvForm({ ...invForm, reorderLevel: +e.target.value })} /></div>
                                <div><label className={labelCls}>Cost/Unit (KES)</label><input type="number" className={inputCls} value={invForm.costPerUnit} onChange={e => setInvForm({ ...invForm, costPerUnit: +e.target.value })} /></div>
                            </div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3"><button onClick={() => setShowNewInventoryModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-black text-sm uppercase">Cancel</button><button onClick={handleCreateInventory} className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow">Save Item</button></div>
                    </div>
                </div>
            )}

            {/* FEEDBACK MODAL */}
            {showFeedbackModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="bg-amber-500 px-6 py-5 text-center"><h3 className="text-lg font-black text-white uppercase">Rate Your Experience</h3><p className="text-xs text-amber-100 mt-1">{showFeedbackModal.vehiclePlate} · {showFeedbackModal.packageName}</p></div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-center gap-2">{Array.from({ length: 5 }).map((_, i) => <button key={i} onClick={() => setFbRating(i + 1)} className={`text-4xl transition-transform hover:scale-110 ${i < fbRating ? 'text-amber-400' : 'text-slate-200'}`}>★</button>)}</div>
                            <textarea className={inputCls + ' h-24 resize-none'} placeholder="Any comments? (optional)" value={fbComment} onChange={e => setFbComment(e.target.value)} />
                        </div>
                        <div className="px-6 pb-6 flex gap-3"><button onClick={() => setShowFeedbackModal(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-black text-sm uppercase">Skip</button><button onClick={handleSubmitFeedback} className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-black text-sm uppercase shadow">Submit ★</button></div>
                    </div>
                </div>
            )}

            {/* NEW STAFF MODAL */}
            {showNewStaffModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="text-lg font-black uppercase">Add Staff Member</h3>
                            <button onClick={() => setShowNewStaffModal(false)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 transition-all shadow-sm"><XIcon className="w-4 h-4" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className={labelCls}>Name</label><input value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} className={inputCls} placeholder="e.g. John Doe" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className={labelCls}>Phone</label><input value={staffForm.phoneNumber} onChange={e => setStaffForm({ ...staffForm, phoneNumber: e.target.value })} className={inputCls} placeholder="07XX..." /></div>
                                <div><label className={labelCls}>Role</label><select value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })} className={inputCls}><option value="carwash_attendant">Attendant</option><option value="carwash_admin">Admin</option></select></div>
                            </div>
                            <div><label className={labelCls}>Email (Optional)</label><input value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} className={inputCls} placeholder="john@example.com" /></div>
                            <div><label className={labelCls}>Initial Password</label><input value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} className={inputCls} placeholder="Required" /></div>
                            <button onClick={handleCreateStaff} className="w-full py-4 bg-cyan-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-cyan-700 transition-all mt-2 active:scale-95 shadow-md shadow-cyan-600/20">Create Staff</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SMART IMPORTER MODAL */}
            {showSmartImporter && (
                <SmartCarWashCustomerImporterModal
                    institutionId={institutionId}
                    onClose={() => setShowSmartImporter(false)}
                    onImport={handleBulkImport}
                />
            )}

            {/* EXPENSE MODAL */}
            {showNewExpenseModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-rose-600 px-6 py-5 flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase">{editingExpense ? 'Edit Expense' : 'Record Expense'}</h3><button onClick={() => { setShowNewExpenseModal(false); setEditingExpense(null); }}><XIcon className="w-5 h-5 text-white" /></button></div>
                        <div className="p-6 space-y-4">
                            <div><label className={labelCls}>Description</label><input className={inputCls} value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} placeholder="e.g. Soap refill" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Amount (KES)</label><input type="number" className={inputCls} value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: +e.target.value })} /></div>
                                <div><label className={labelCls}>Category</label><select className={inputCls} value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })}><option value="supplies">Supplies</option><option value="utilities">Utilities</option><option value="maintenance">Maintenance</option><option value="rent">Rent</option><option value="marketing">Marketing</option><option value="other">Other</option></select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={expForm.expenseDate} onChange={e => setExpForm({ ...expForm, expenseDate: e.target.value })} /></div>
                                <div><label className={labelCls}>Method</label><select className={inputCls} value={expForm.paymentMethod} onChange={e => setExpForm({ ...expForm, paymentMethod: e.target.value as any })}><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="bank">Bank</option></select></div>
                            </div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3"><button onClick={() => { setShowNewExpenseModal(false); setEditingExpense(null); }} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-black text-sm uppercase">Cancel</button><button onClick={handleCreateExpense} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-sm uppercase shadow">{editingExpense ? 'Update Record' : 'Save Expense'}</button></div>
                    </div>
                </div>
            )}

            {/* PAYROLL MODAL */}
            {showNewPayrollModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="bg-blue-600 px-6 py-5 flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase">Process Payroll</h3><button onClick={() => setShowNewPayrollModal(false)}><XIcon className="w-5 h-5 text-white" /></button></div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div><label className={labelCls}>Staff Member</label><select className={inputCls} value={payrlForm.staffId} onChange={e => setPayrlForm({ ...payrlForm, staffId: e.target.value })}><option value="">-- Select --</option>{attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Base Salary</label><input type="number" className={inputCls} value={payrlForm.baseSalary} onChange={e => setPayrlForm({ ...payrlForm, baseSalary: +e.target.value })} /></div>
                                <div><label className={labelCls}>Commission</label><input type="number" className={inputCls} value={payrlForm.commissionEarned} onChange={e => setPayrlForm({ ...payrlForm, commissionEarned: +e.target.value })} /></div>
                                <div><label className={labelCls}>Advances</label><input type="number" className={inputCls} value={payrlForm.advancesTaken} onChange={e => setPayrlForm({ ...payrlForm, advancesTaken: +e.target.value })} /></div>
                                <div><label className={labelCls}>Deductions</label><input type="number" className={inputCls} value={payrlForm.deductions} onChange={e => setPayrlForm({ ...payrlForm, deductions: +e.target.value })} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>From</label><input type="date" className={inputCls} value={payrlForm.periodStart} onChange={e => setPayrlForm({ ...payrlForm, periodStart: e.target.value })} /></div>
                                <div><label className={labelCls}>To</label><input type="date" className={inputCls} value={payrlForm.periodEnd} onChange={e => setPayrlForm({ ...payrlForm, periodEnd: e.target.value })} /></div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl space-y-3">
                                {(() => {
                                    const { nssf, shif, housingLevy, paye, gross } = calculateKenyanPayroll(payrlForm.baseSalary, payrlForm.commissionEarned);
                                    const net = gross - nssf - shif - housingLevy - paye - payrlForm.advancesTaken - payrlForm.deductions;
                                    return (
                                        <>
                                            <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                                                <span>Gross Pay:</span>
                                                <span className="text-slate-600 dark:text-slate-200">KES {(gross || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-black uppercase text-rose-400">
                                                <span>NSSF Deduction:</span>
                                                <span>-KES {(nssf || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-black uppercase text-rose-400">
                                                <span>SHIF Deduction (2.75%):</span>
                                                <span>-KES {(shif || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-black uppercase text-rose-400">
                                                <span>Housing Levy (1.5%):</span>
                                                <span>-KES {(housingLevy || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-black uppercase text-rose-400">
                                                <span>PAYE (Net of Relief):</span>
                                                <span>-KES {(paye || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                <span className="text-xs font-black uppercase">Net Take-Home:</span>
                                                <span className="text-xl font-black text-blue-600">KES {(net || 0).toLocaleString()}</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3"><button onClick={() => setShowNewPayrollModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-black text-sm uppercase">Cancel</button><button onClick={handleProcessPayroll} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase shadow">Finalize & Pay</button></div>
                    </div>
                </div>
            )}

            {/* FINANCE TAB */}
            {!loading && activeTab === 'finance' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700">
                        <h2 className="text-xl font-black uppercase tracking-wider text-slate-800 dark:text-white px-4">Financial Cockpit</h2>
                        <div className="flex gap-2 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl">
                            {['dashboard', 'cashbook', 'expenses', 'payroll'].map(ft => (
                                <button key={ft} onClick={() => setFinanceTab(ft as any)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${financeTab === ft ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
                                    {ft}
                                </button>
                            ))}
                        </div>
                    </div>

                    {financeTab === 'dashboard' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Top Level Finance Metrics Dashboard */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { title: 'Total Revenue', value: `KES ${journalLines.filter(l => l.credit > 0 && accounts.find(a => a.id === l.accountId)?.accountCode === '4000').reduce((s, l) => s + l.credit, 0).toLocaleString()}`, icon: <CurrencyIcon className="w-6 h-6 text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                                    { title: 'Total Expenses', value: `KES ${journalLines.filter(l => l.debit > 0 && accounts.find(a => a.id === l.accountId)?.type === 'Expense').reduce((s, l) => s + l.debit, 0).toLocaleString()}`, icon: <ChartPieIcon className="w-6 h-6 text-rose-500" />, bg: 'bg-rose-50 dark:bg-rose-900/20' },
                                    { title: 'Payroll Disbursed', value: `KES ${payroll.filter(p => p.status === 'paid').reduce((s, p) => s + p.totalPay, 0).toLocaleString()}`, icon: <UserGroupIcon className="w-6 h-6 text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-900/20' },
                                    { title: 'Cash on Hand', value: `KES ${journalLines.filter(l => accounts.find(a => a.id === l.accountId)?.accountCode === '1000').reduce((s, l) => s + (l.debit - l.credit), 0).toLocaleString()}`, icon: <BanknotesIcon className="w-6 h-6 text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-900/20' }
                                ].map((stat, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg}`}>
                                                {stat.icon}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.title}</p>
                                                <p className="text-xl font-black tracking-tight">{stat.value}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {accounts.length === 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-3xl p-8 text-center">
                                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <Cog8ToothIcon className={`w-8 h-8 text-amber-500 ${isSeedingAccounts ? 'animate-spin' : ''}`} />
                                    </div>
                                    <h3 className="text-lg font-black uppercase text-amber-800 dark:text-amber-400">Accounting Not Initialized</h3>
                                    <p className="max-w-md mx-auto text-sm text-amber-700 dark:text-amber-500 mt-2 mb-6">The standardized chart of accounts needs to be set up to enable formal bookkeeping and the cashbook view.</p>
                                    <button
                                        onClick={handleSeedAccounts}
                                        disabled={isSeedingAccounts}
                                        className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-600/20 disabled:opacity-50 transition-all active:scale-95"
                                    >
                                        {isSeedingAccounts ? 'Initializing...' : 'Initialize Accounting Structure'}
                                    </button>
                                </div>
                            )}


                            {/* Accounts Overview */}
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black uppercase tracking-widest text-sm">Chart of Accounts Status</h3>
                                    <div className="flex gap-2">
                                        <button onClick={handleExportTrialBalance} className="text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-xl transition-colors shadow-sm">
                                            Export PDF ↓
                                        </button>
                                        <button className="text-xs font-bold text-cyan-600 hover:text-cyan-700 bg-cyan-50 dark:bg-cyan-900/30 px-4 py-2 rounded-xl transition-colors">
                                            View Full Report →
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {accounts.map(acc => (
                                        <div key={acc.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center group hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                            <div>
                                                <p className="text-xs font-bold text-slate-500">{acc.accountCode} <span className="uppercase text-[9px] ml-1 tracking-wider text-slate-400">({acc.type})</span></p>
                                                <p className="font-black text-sm">{acc.name}</p>
                                            </div>
                                            <p className={`font-black ${(acc.balance || 0) < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                {(acc.balance || 0).toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                                    {accounts.length === 0 && (
                                        <div className="col-span-full py-8 text-center text-slate-400">
                                            <BanknotesIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p className="font-bold text-sm">No accounts initialized yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {financeTab === 'cashbook' && (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div>
                                    <h3 className="font-black uppercase tracking-widest text-sm">General Journal / Cashbook</h3>
                                    <p className="text-xs text-slate-400 mt-1">All standardized accounting entries across the module.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <input type="date" value={cashbookPeriod.start} onChange={e => setCashbookPeriod({ ...cashbookPeriod, start: e.target.value })} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm" />
                                        <span className="text-slate-400 text-xs font-bold uppercase">to</span>
                                        <input type="date" value={cashbookPeriod.end} onChange={e => setCashbookPeriod({ ...cashbookPeriod, end: e.target.value })} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm" />
                                    </div>
                                    <button onClick={handleExportCashbook} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-black text-xs uppercase hover:bg-slate-200 transition-all">
                                        <DocumentTextIcon className="w-4 h-4" /> Export PDF
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="text-[10px] uppercase font-black text-slate-400 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Reference/Description</th>
                                            <th className="px-6 py-4">Account</th>
                                            <th className="px-6 py-4 text-right text-emerald-600">Debit (KES)</th>
                                            <th className="px-6 py-4 text-right text-rose-500">Credit (KES)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {(() => {
                                            const filteredEntries = journalEntries.filter(e => {
                                                const d = e.entryDate?.split('T')[0];
                                                if (!d) return true;
                                                return d >= cashbookPeriod.start && d <= cashbookPeriod.end;
                                            }).sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

                                            return (
                                                <>
                                                    {filteredEntries.flatMap(entry => {
                                                        const lines = journalLines.filter(l => l.entryId === entry.id);
                                                        return lines.map((line, idx) => (
                                                            <tr key={line.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                                                                {idx === 0 ? (
                                                                    <>
                                                                        <td className="px-6 py-4 text-xs font-bold text-slate-500 align-top" rowSpan={lines.length}>
                                                                            {new Date(entry.entryDate).toLocaleDateString()}
                                                                        </td>
                                                                        <td className="px-6 py-4 align-top" rowSpan={lines.length}>
                                                                            <p className="font-black text-xs">{entry.entryNumber}</p>
                                                                            <p className="text-xs text-slate-400 italic max-w-xs truncate" title={entry.description}>{entry.description}</p>
                                                                        </td>
                                                                    </>
                                                                ) : null}
                                                                <td className={`px-6 py-3 font-semibold text-xs ${line.credit > 0 ? 'pl-10 text-slate-500' : ''}`}>
                                                                    {accounts.find(a => a.id === line.accountId)?.name || 'Unknown Account'}
                                                                </td>
                                                                <td className="px-6 py-3 text-right font-black text-emerald-600">
                                                                    {line.debit > 0 ? line.debit.toLocaleString() : ''}
                                                                </td>
                                                                <td className="px-6 py-3 text-right font-black text-rose-500">
                                                                    {line.credit > 0 ? line.credit.toLocaleString() : ''}
                                                                </td>
                                                            </tr>
                                                        ));
                                                    })}
                                                    {filteredEntries.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                                                <ArchiveBoxIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                                <p className="font-bold">No journal entries found for this period.</p>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </tbody>
                                    <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700 font-black text-sm">
                                        {(() => {
                                            const filteredEntries = journalEntries.filter(e => {
                                                const d = e.entryDate?.split('T')[0];
                                                if (!d) return true;
                                                return d >= cashbookPeriod.start && d <= cashbookPeriod.end;
                                            });
                                            const totalDebit = filteredEntries.reduce((sum, e) => sum + journalLines.filter(l => l.entryId === e.id).reduce((s, l) => s + (l.debit || 0), 0), 0);
                                            const totalCredit = filteredEntries.reduce((sum, e) => sum + journalLines.filter(l => l.entryId === e.id).reduce((s, l) => s + (l.credit || 0), 0), 0);
                                            return (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-4 text-right text-xs uppercase tracking-widest text-slate-500">Running Total / Period Balance:</td>
                                                    <td className="px-6 py-4 text-right text-emerald-600">{totalDebit.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right text-rose-500">{totalCredit.toLocaleString()}</td>
                                                </tr>
                                            );
                                        })()}
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {financeTab === 'expenses' && (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div>
                                    <h3 className="font-black uppercase tracking-widest text-sm">Operating Expenses</h3>
                                    <p className="text-xs text-slate-400 mt-1">Record and manage daily car wash expenditures.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleExportExpenses} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-black text-xs uppercase hover:bg-slate-200 transition-all">
                                        <DocumentTextIcon className="w-4 h-4" /> Export PDF
                                    </button>
                                    <button onClick={() => setShowNewExpenseModal(true)} className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl font-black text-xs uppercase shadow hover:bg-rose-600 transition-all">
                                        <PlusIcon className="w-4 h-4" /> Record Expense
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="text-[10px] uppercase font-black text-slate-400 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4">Payment Method</th>
                                            <th className="px-6 py-4 text-right">Amount (KES)</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {expenses.map(exp => (
                                            <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-500">{new Date(exp.expenseDate).toLocaleDateString()}</td>
                                                <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-black uppercase text-slate-500">{exp.category}</span></td>
                                                <td className="px-6 py-4 font-semibold">{exp.description}</td>
                                                <td className="px-6 py-4 capitalize text-slate-500 font-medium">{exp.paymentMethod.replace('_', ' ')}</td>
                                                <td className="px-6 py-4 text-right font-black text-rose-500">{(exp.amount || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 text-slate-400">
                                                        <button onClick={() => handleEditExpense(exp)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg hover:text-indigo-600 transition-all" title="Edit Expense">
                                                            <Cog8ToothIcon className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDeleteExpense(exp.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg hover:text-rose-600 transition-all" title="Delete Expense">
                                                            <XIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {expenses.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                    <ChartPieIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                    <p className="font-bold">No expenses recorded yet.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {financeTab === 'payroll' && (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div>
                                    <h3 className="font-black uppercase tracking-widest text-sm">Staff Commissions & Payroll</h3>
                                    <p className="text-xs text-slate-400 mt-1">Manage attendant commissions and salary disbursements.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleExportPayroll} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-black text-xs uppercase hover:bg-slate-200 transition-all">
                                        <DocumentTextIcon className="w-4 h-4" /> Export PDF
                                    </button>
                                    <button onClick={() => setShowBulkPayrollModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-black text-xs uppercase shadow hover:bg-purple-700 transition-all">
                                        <UserGroupIcon className="w-4 h-4" /> Bulk Process
                                    </button>
                                    <button onClick={() => setShowNewPayrollModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs uppercase shadow hover:bg-blue-700 transition-all">
                                        <PlusIcon className="w-4 h-4" /> Single Payroll
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="text-[10px] uppercase font-black text-slate-400 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4">Period</th>
                                            <th className="px-6 py-4">Staff Member</th>
                                            <th className="px-6 py-4 text-right">Base Salary</th>
                                            <th className="px-6 py-4 text-right">Commission</th>
                                            <th className="px-6 py-4 text-right">Deductions</th>
                                            <th className="px-6 py-4 text-right">Net Pay (KES)</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {payroll.map(pr => {
                                            const staff = attendants.find(a => a.id === pr.staffId);
                                            return (
                                                <tr key={pr.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-500">{new Date(pr.periodStart).toLocaleDateString()} - {new Date(pr.periodEnd).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 font-black">{staff?.name || 'Unknown Staff'}</td>
                                                    <td className="px-6 py-4 text-right font-medium text-slate-500">{(pr.baseSalary || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right font-medium text-emerald-600">+{(pr.commissionEarned || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right font-medium text-rose-500">-{(pr.deductions || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right font-black text-blue-600">{(pr.totalPay || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${pr.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {pr.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {payroll.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                                    <UserGroupIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                    <p className="font-bold">No payroll records found.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* SETTINGS */}
            {!loading && activeTab === 'settings' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-2xl">
                                <Cog8ToothIcon className="w-6 h-6 text-cyan-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight">Branch Settings</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage branding and document identity</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 border-b pb-2">Logos & Images</h3>

                                <div>
                                    <label className={labelCls}>Branch Logo URL</label>
                                    <div className="flex gap-3">
                                        <input value={brandingForm.logoUrl} onChange={e => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })} className={inputCls} placeholder="https://..." />
                                        {brandingForm.logoUrl && <img src={brandingForm.logoUrl} className="w-12 h-12 rounded-xl object-contain bg-slate-50" alt="Logo" />}
                                    </div>
                                </div>

                                <div>
                                    <label className={labelCls}>Letterhead Header URL</label>
                                    <input value={brandingForm.headerImageUrl} onChange={e => setBrandingForm({ ...brandingForm, headerImageUrl: e.target.value })} className={inputCls} placeholder="Header image for invoices" />
                                    {brandingForm.headerImageUrl && <img src={brandingForm.headerImageUrl} className="mt-2 h-20 w-full object-contain rounded-xl bg-slate-50" alt="Header" />}
                                </div>

                                <div>
                                    <label className={labelCls}>Footer Image URL</label>
                                    <input value={brandingForm.footerImageUrl} onChange={e => setBrandingForm({ ...brandingForm, footerImageUrl: e.target.value })} className={inputCls} placeholder="Footer image for documents" />
                                    {brandingForm.footerImageUrl && <img src={brandingForm.footerImageUrl} className="mt-2 h-16 w-full object-contain rounded-xl bg-slate-50" alt="Footer" />}
                                </div>

                                <div>
                                    <label className={labelCls}>Stamp Image URL</label>
                                    <input value={brandingForm.stampImageUrl} onChange={e => setBrandingForm({ ...brandingForm, stampImageUrl: e.target.value })} className={inputCls} placeholder="Official stamp image" />
                                    {brandingForm.stampImageUrl && <img src={brandingForm.stampImageUrl} className="mt-2 w-20 h-20 object-contain rounded-xl bg-slate-50" alt="Stamp" />}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 border-b pb-2">Module Info</h3>
                                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center text-white">
                                            <SparklesIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-black text-sm">{currentInstitution.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentInstitution.institutionType} · Car Wash</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500 font-bold uppercase">Active Packages</span>
                                            <span className="font-black">{packages.length}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500 font-bold uppercase">Staff Count</span>
                                            <span className="font-black">{attendants.length}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500 font-bold uppercase">Total Washes</span>
                                            <span className="font-black">{jobs.length}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] border border-blue-100 dark:border-blue-800">
                                    <h4 className="text-[10px] font-black uppercase text-blue-700 mb-2 tracking-widest">Automation Note</h4>
                                    <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                                        Commissions are automatically calculated based on package settings when a job is completed. These are aggregated during the monthly payroll run for each staff member.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 flex justify-end">
                            <button onClick={handleSaveBranding} className="px-10 py-4 bg-cyan-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-600/20 active:scale-95 btn-save-animate">
                                Save Branch Branding
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* BULK PAYROLL MODAL */}
            {showBulkPayrollModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-8 flex justify-between items-center text-white relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                                    <UserGroupIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight">Bulk Payroll Run</h3>
                                    <p className="text-[10px] text-purple-200 font-bold mt-1 tracking-widest uppercase">Assess & process staff commissions simultaneously</p>
                                </div>
                            </div>
                            <button onClick={() => setShowBulkPayrollModal(false)} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all relative z-10 border border-white/10"><XIcon className="w-5 h-5 text-white" /></button>
                        </div>

                        <div className="p-8">
                            <div className="grid grid-cols-2 gap-6 mb-8 relative z-10">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <label className={labelCls}>Period Start Date</label>
                                    <input type="date" value={bulkPayrollPeriod.start} onChange={e => setBulkPayrollPeriod({ ...bulkPayrollPeriod, start: e.target.value })} className={inputCls + ' bg-white dark:bg-slate-900 shadow-sm'} />
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <label className={labelCls}>Period End Date</label>
                                    <input type="date" value={bulkPayrollPeriod.end} onChange={e => setBulkPayrollPeriod({ ...bulkPayrollPeriod, end: e.target.value })} className={inputCls + ' bg-white dark:bg-slate-900 shadow-sm'} />
                                </div>
                            </div>

                            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden mb-8 shadow-sm">
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><ChartBarIcon className="w-4 h-4 text-purple-500" /> Commission Preview</h4>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">Auto-Calculated from Jobs</span>
                                </div>
                                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                        <thead className="text-[10px] uppercase font-black text-slate-400 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-6 py-4">Staff Member</th>
                                                <th className="px-6 py-4 text-center">Unpaid Jobs</th>
                                                <th className="px-6 py-4 text-right">Est. Commission</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 bg-white dark:bg-slate-900">
                                            {attendants.map(attendant => {
                                                const attendantJobs = jobs.filter(j => j.attendantId === attendant.id && j.status === 'completed' && !j.isCommissionPaid && j.completedAt && j.completedAt.split('T')[0] >= bulkPayrollPeriod.start && j.completedAt.split('T')[0] <= bulkPayrollPeriod.end);
                                                if (attendantJobs.length === 0) return null;
                                                let comm = 0;
                                                attendantJobs.forEach(j => {
                                                    const pkg = packages.find(p => p.id === j.packageId);
                                                    if (pkg) { if (pkg.commissionType === 'fixed') comm += (pkg.commissionValue || 0); else comm += (j.amountCharged * (pkg.commissionValue || 0)) / 100; }
                                                });
                                                return (
                                                    <tr key={attendant.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center font-black text-xs">{attendant.name.charAt(0)}</div>
                                                                <span className="font-black text-slate-700 dark:text-slate-200">{attendant.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold text-slate-500 text-xs">{attendantJobs.length} washes</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-emerald-600 text-base">KES {comm.toLocaleString()}</td>
                                                    </tr>
                                                );
                                            })}
                                            {attendants.every(a => jobs.filter(j => j.attendantId === a.id && j.status === 'completed' && !j.isCommissionPaid && j.completedAt && j.completedAt.split('T')[0] >= bulkPayrollPeriod.start && j.completedAt.split('T')[0] <= bulkPayrollPeriod.end).length === 0) && (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-12 text-center">
                                                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 scale-90 opacity-50"><UserGroupIcon className="w-8 h-8 text-slate-400" /></div>
                                                        <p className="text-sm font-black text-slate-500 uppercase tracking-widest">No Unpaid Commissions</p>
                                                        <p className="text-xs text-slate-400 font-medium mt-1">Adjust the date range to find pending payouts.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setShowBulkPayrollModal(false)} className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Cancel</button>
                                <button onClick={handleProcessBulkPayroll} className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-600/20 hover:shadow-purple-600/40 transition-all active:scale-95 flex items-center justify-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5" /> Confirm & Process All Staff
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF PREVIEW MODAL */}
            {pdfPreviewUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-5xl h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-sky-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-black uppercase tracking-widest text-sm">{pdfPreviewTitle}</h3>
                                <p className="text-cyan-100 text-[10px] font-bold uppercase tracking-widest">{pdfFileName}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = pdfPreviewUrl;
                                        link.download = pdfFileName;
                                        link.click();
                                    }}
                                    className="px-5 py-2.5 bg-white text-cyan-600 rounded-xl font-black text-xs uppercase shadow hover:bg-cyan-50 transition-all flex items-center gap-2"
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4 rotate-180" /> Download PDF
                                </button>
                                <button
                                    onClick={() => setPdfPreviewUrl(null)}
                                    className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-900 p-4">
                            <iframe
                                src={pdfPreviewUrl}
                                title="PDF Preview"
                                className="w-full h-full rounded-2xl border-none shadow-inner"
                            />
                        </div>
                        <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-slate-400">
                            <p className="text-[10px] font-bold uppercase tracking-widest italic">Confidential Report · Generated by Antigravity OS</p>
                            <button onClick={() => setPdfPreviewUrl(null)} className="text-[10px] font-black uppercase tracking-widest hover:text-slate-600 transition-colors">Close Preview</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hybrid Views */}
            {!loading && activeTab === 'hybrid_pos' && (
                <HybridPOSView
                    currentUser={currentUser}
                    currentInstitution={currentInstitution}
                    carWashJobs={jobs}
                    retailInventory={retailInventory}
                    cafeInventory={cafeInventory}
                    retailSales={retailSales}
                    onLogAction={async () => { }}
                    onDataChange={loadData}
                />
            )}
            {!loading && activeTab === 'kds' && (
                <KitchenDisplaySystem
                    retailSales={retailSales}
                    cafeOrders={cafeOrders && cafeOrders.length > 0 ? cafeOrders : localCafeOrders}
                    onUpdateItemStatus={async (orderId, itemId, newStatus, source) => {
                        if (source === 'retail') {
                            const targetSale = retailSales.find(s => s.id === orderId);
                            if (!targetSale) return;
                            const updatedItems = targetSale.items.map(i => i.itemId === itemId ? { ...i, kitchenStatus: newStatus } : i);
                            await apiService.saveModuleRecord('retail_sales', { ...targetSale, items: updatedItems });
                        } else {
                            const targetOrder = (cafeOrders && cafeOrders.length > 0 ? cafeOrders : localCafeOrders).find(o => o.id === orderId);
                            if (!targetOrder) return;
                            const updatedItems = targetOrder.items.map(i => i.itemId === itemId ? { ...i, kitchenStatus: newStatus } : i);
                            await apiService.saveModuleRecord('cafe_orders', { ...targetOrder, items: updatedItems });
                        }
                        onDataChange();
                        loadData();
                    }}
                />
            )}
            {!loading && activeTab === 'live_board' && (
                <CustomerStatusBoard
                    carWashJobs={jobs}
                    retailSales={retailSales}
                />
            )}
            {!loading && activeTab === 'cafe_menu' && (
                <CafeMenuManager institutionId={institutionId} onDataChange={loadData} />
            )}

            <style>{`
                @keyframes pulse-subtle {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.4); }
                    50% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(6, 182, 212, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(6, 182, 212, 0); }
                }
                .animate-pulse-subtle {
                    animation: pulse-subtle 2s infinite ease-in-out;
                }
                .btn-save-animate {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .btn-save-animate:hover {
                    transform: translateY(-2px) scale(1.02);
                    filter: brightness(1.1);
                    box-shadow: 0 10px 15px -3px rgba(6, 182, 212, 0.3);
                }
                .btn-save-animate:active {
                    transform: translateY(0) scale(0.98);
                }
            `}</style>
        </div>
    );
};
