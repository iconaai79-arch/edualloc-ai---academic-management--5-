import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Invoice, Receipt, Expense, FinancialGoal, User, Institution, FeeStructure, AcademicYear, Semester, Requisition, VoteHead, Course, CompanyDetails, NGCdfBursary } from '../../types';
import { RevenueWarRoom } from './RevenueWarRoom';
import { AutomatedBilling } from './AutomatedBilling';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { AcademicCapIcon } from '../icons/AcademicCapIcon';
import { ZapIcon } from '../icons/ZapIcon';
import { CheckBadgeIcon } from '../icons/CheckBadgeIcon';
import { BarChart3Icon } from '../icons/BarChart3Icon';
import { Cog8ToothIcon } from '../icons/Cog8ToothIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { CreditCardIcon } from '../icons/CreditCardIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { XIcon } from '../icons/XIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { XCircleIcon } from '../icons/XCircleIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { Trash2Icon } from '../icons/Trash2Icon';
import { ScaleIcon } from '../icons/ScaleIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { PhotoIcon } from '../icons/PhotoIcon';
import { WalletIcon } from '../icons/WalletIcon';
import { RetailRequisitions } from '../retail/RetailRequisitions';
import { apiService } from '../../services/apiService';
import { FinancialAuditDashboard } from './FinancialAuditDashboard';
import { AnnualReportWizard } from './AnnualReportWizard';
import { isEduInstitution, isSchoolInstitution } from '../../utils/roleUtils';
import * as XLSX from 'xlsx';
import { ArrowUpTrayIcon } from '../icons/ArrowUpTrayIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import * as pdfService from '../../services/pdfService';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';
import { HomeIcon } from '../icons/HomeIcon';
import { TrendingUpIcon } from '../icons/TrendingUpIcon';
import { FileTextIcon } from '../icons/FileTextIcon';
import { ChartPieIcon } from '../icons/ChartPieIcon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { ArrowsRightLeftIcon } from '../icons/ArrowsRightLeftIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { BuildingLibraryIcon } from '../icons/BuildingLibraryIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
const HRManager = React.lazy(() => import('../HR/HRManager').then(m => ({ default: m.HRManager })));
const StudentEnrollmentManager = React.lazy(() => import('../common/StudentEnrollmentManager').then(m => ({ default: m.StudentEnrollmentManager })));
const CommunicationsManager = React.lazy(() => import('../CommunicationsManager').then(m => ({ default: m.CommunicationsManager })));

const parseMoneyAmount = (amt: any): number => {
    if (amt === null || amt === undefined) return 0;
    if (typeof amt === 'number') return amt;
    const clean = String(amt).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
};

interface FinanceManagerProps {
    invoices: Invoice[];
    receipts: Receipt[];
    expenses: Expense[];
    goals: FinancialGoal[];
    feeStructures: FeeStructure[];
    students: User[];
    academicYears: AcademicYear[];
    semesters: Semester[];
    institution: Institution;
    onGenerateInvoices: (invoices: any[]) => Promise<void>;
    onAddExpense: (expense: any) => Promise<void>;
    receiptLimit: number;
    setReceiptLimit: React.Dispatch<React.SetStateAction<number>>;
    transactionLimit: number;
    setTransactionLimit: React.Dispatch<React.SetStateAction<number>>;
    transactions?: any[];
    requisitions?: Requisition[];
    onUpdateRequisition?: (id: string, data: any) => Promise<void>;
    currentUser: User;
    voteHeads?: VoteHead[];
    courses?: Course[];
    onRefreshData?: () => Promise<void>;
    companyDetails?: CompanyDetails;
    onLogAction?: (message: string) => Promise<void> | void;
    // HR & Payroll integration
    users?: User[];
    payrollRecords?: any[];
    leaveRequests?: any[];
    onProcessPayroll?: (records: any[]) => Promise<void>;
    onUpdateLeaveStatus?: (id: string, status: 'approved' | 'rejected') => Promise<void>;
    onEditUser?: (id: string, data: any) => Promise<void>;
    onDeleteUser?: (id: string) => Promise<void>;
}

export const FinanceManager: React.FC<FinanceManagerProps> = (props) => {
    const isDrivingSchool = props.institution.institutionType === 'Driving School';
    
    // Dynamic Tabs based on Institution Type
    const [activeTab, setActiveTab] = useState<'home' | 'billing' | 'balances' | 'receipts' | 'student_invoices' | 'wizard' | 'gok_capitation' | 'bursaries' | 'expenses' | 'audit' | 'requisitions' | 'config' | 'settings' | 'goods_in_lieu' | 'payroll' | 'reports' | 'transfers'>('home');
    const [homeSubTab, setHomeSubTab] = useState<'registry' | 'communication' | 'reports' | 'dashboard'>('registry');
    const [hrSubTab, setHrSubTab] = useState<'roster' | 'payroll' | 'leave' | 'attendance' | 'reports' | 'analytics'>('roster');
    const [reportsSubTab, setReportsSubTab] = useState<'collection' | 'outstanding' | 'ledger' | 'expenses' | 'payroll_summary' | 'annual' | 'student_statement'>('collection');
    const [outstandingSubTab, setOutstandingSubTab] = useState<'balance_slip' | 'all_balances' | 'student_summary' | 'class_summary' | 'term_summary' | 'voteheads_summary' | 'votehead_distribution'>('all_balances');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [enrollments, setEnrollments] = useState<any[]>([]);

    useEffect(() => {
        const fetchEnrollments = async () => {
            try {
                const res = await apiService.fetchModuleRecords('student_enrollments', props.institution.id);
                setEnrollments(res || []);
            } catch (e) {
                console.error("Failed to load student enrollments for FinanceManager:", e);
            }
        };
        fetchEnrollments();
    }, [props.institution.id]);

    // Driving School Mode States
    const [dsInvoices, setDsInvoices] = useState<any[]>([]);
    const [dsPayments, setDsPayments] = useState<any[]>([]);
    const [dsSettings, setDsSettings] = useState<any>(null);
    const [dsFeeStructures, setDsFeeStructures] = useState<any[]>([]);
    const [isCreatingDsInvoice, setIsCreatingDsInvoice] = useState(false);
    const [selectedDsInvoice, setSelectedDsInvoice] = useState<any | null>(null);
    const [isRecordingDsPayment, setIsRecordingDsPayment] = useState(false);

    // Branch filtering states for multi-branch/multi-institution support
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

    useEffect(() => {
        if (props.institution?.id) {
            apiService.fetchModuleRecords('branches', props.institution.id)
                .then((list: any[]) => {
                    setBranches(list || []);
                })
                .catch(() => {});
        }
    }, [props.institution?.id]);

    // Translate DS structures to standard Dashboard Invoice models dynamically
    const mappedInvoices = useMemo(() => {
        const baseInvoices = (props.invoices || []).filter((inv: any) => {
            const invNo = inv.invoiceNumber || inv.invoice_number;
            const branchMatches = selectedBranchId === 'ALL' || (inv.branchId || inv.branch_id) === selectedBranchId;
            return !invNo?.startsWith('REMEDIAL-') && branchMatches;
        });
        if (!isDrivingSchool) return baseInvoices;
        return dsInvoices.map((dsInv: any) => ({
            id: dsInv.id,
            invoiceNumber: dsInv.invoiceNumber || dsInv.invoice_number || dsInv.id,
            institutionId: dsInv.institutionId,
            issueDate: dsInv.createdAt || new Date().toISOString(),
            dueDate: dsInv.dueDate || dsInv.due_date || '',
            due_date: dsInv.dueDate || dsInv.due_date || '',
            items: (dsInv.items || []).map((it: any) => ({
                description: it.name || it.voteName || 'Fee Item',
                quantity: 1,
                unitPrice: it.amount || 0,
                amount: it.amount || 0
            })),
            totalAmount: dsInv.totalAmount || 0,
            status: dsInv.status === 'Fully Paid' ? 'paid' as const : 'pending' as const,
            studentId: dsInv.studentId
        }));
    }, [props.invoices, dsInvoices, isDrivingSchool, selectedBranchId]);

    // Translate DS payments to standard Dashboard Receipt models dynamically
    const mappedReceipts = useMemo(() => {
        const baseReceipts = (props.receipts || []).filter((r: any) => {
            const invId = r.invoiceId || r.invoice_id;
            const branchMatches = selectedBranchId === 'ALL' || (r.branchId || r.branch_id) === selectedBranchId;
            if (invId) {
                const targetInvoice = props.invoices.find((i: any) => i.id === invId);
                const invNo = (targetInvoice as any)?.invoiceNumber || (targetInvoice as any)?.invoice_number;
                if (invNo?.startsWith('REMEDIAL-')) return false;
            }
            return branchMatches;
        });
        if (!isDrivingSchool) return baseReceipts;
        return dsPayments.map((dsPay: any) => ({
            id: dsPay.id,
            receiptNumber: dsPay.receiptNumber || dsPay.receipt_number || dsPay.id,
            institutionId: dsPay.institutionId,
            paymentDate: dsPay.paymentDate || new Date().toISOString(),
            amountPaid: dsPay.amount || 0,
            paidFor: `Payment for DS Invoice ${dsPay.invoiceNumber || dsPay.invoiceId}`,
            paymentMethod: dsPay.paymentMethod || 'Cash',
            relatedTransactionId: dsPay.transactionReference || '',
            invoiceId: dsPay.invoiceId,
            studentId: dsPay.studentId
        }));
    }, [props.receipts, dsPayments, isDrivingSchool, props.invoices, selectedBranchId]);

    // Reports sub-tab states
    const [stmtStudentId, setStmtStudentId] = useState('');
    const [stmtSearch, setStmtSearch] = useState('');
    const [slipSearch, setSlipSearch] = useState('');
    const [slipStudentId, setSlipStudentId] = useState('');
    const [balFilter, setBalFilter] = useState('');
    const [balClass, setBalClass] = useState('');
    const [ledgerSubTab, setLedgerSubTab] = useState<'collection_summary' | 'cash_book' | 'fee_register' | 'cash_flow' | 'fee_installment'>('collection_summary');
    const [showOpPreview, setShowOpPreview] = useState(false);
    const [showInvPreview, setShowInvPreview] = useState(false);
    const [showFinPreview, setShowFinPreview] = useState(false);
    const [cbPeriod, setCbPeriod] = useState<'all' | 'this_month' | 'last_month' | 'custom'>('all');
    const [cbStartDate, setCbStartDate] = useState('');
    const [cbEndDate, setCbEndDate] = useState('');
    const [cbViewType, setCbViewType] = useState<'unified' | 'receipts' | 'payments'>('unified');
    const [expandedCbDates, setExpandedCbDates] = useState<string[]>([]);
    const [feeRegClass, setFeeRegClass] = useState<string>('');
    const [installmentClass, setInstallmentClass] = useState<string>('All');
    const [expandedInstallmentStudentIds, setExpandedInstallmentStudentIds] = useState<string[]>([]);

    // State for settings sub-tabs
    const [settingsSubTab, setSettingsSubTab] = useState<'opening_balance' | 'grades_streams' | 'academic_calendar' | 'financial_year' | 'accounts_grants' | 'fee_structure_builder' | 'user_permissions' | 'branding' | 'numbering'>('opening_balance');

    // Grades & Streams local states
    const [localCourses, setLocalCourses] = useState<Course[]>([]);
    const [selectedGradeForStreams, setSelectedGradeForStreams] = useState<Course | null>(null);
    const [newGradeName, setNewGradeName] = useState('');
    const [newGradeCode, setNewGradeCode] = useState('');
    const [isCreatingGrade, setIsCreatingGrade] = useState(false);
    const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
    const [editGradeName, setEditGradeName] = useState('');
    const [editGradeCode, setEditGradeCode] = useState('');
    const [newStreamName, setNewStreamName] = useState('');
    const [editingStreamId, setEditingStreamId] = useState<string | null>(null);
    const [editStreamName, setEditStreamName] = useState('');

    // State for audit sub-tabs
    const [auditSubTab, setAuditSubTab] = useState<'audit_dashboard' | 'annual_report'>('audit_dashboard');

    // Dynamic settings sub-tabs based on school type
    const settingsSubTabs = useMemo(() => {
        if (isDrivingSchool) {
            return [
                { id: 'opening_balance', label: 'Opening Balance', icon: WalletIcon },
                { id: 'accounts_grants', label: 'Bank Accounts', icon: ScaleIcon },
                { id: 'fee_structure_builder', label: 'Fee Structures', icon: CreditCardIcon },
                { id: 'user_permissions', label: 'User Permissions', icon: ShieldCheckIcon },
                { id: 'branding', label: 'Branding', icon: PhotoIcon },
                { id: 'numbering', label: 'Document Numbering', icon: DocumentTextIcon }
            ] as const;
        }
        return [
            { id: 'opening_balance', label: 'Opening Balance', icon: WalletIcon },
            { id: 'grades_streams', label: 'Grades & Streams', icon: AcademicCapIcon },
            { id: 'academic_calendar', label: 'Academic Year & Calendar', icon: CalendarDaysIcon },
            { id: 'financial_year', label: 'Financial Year', icon: ClockIcon },
            { id: 'accounts_grants', label: 'Voteheads, Banks & Grants', icon: ScaleIcon },
            { id: 'fee_structure_builder', label: 'Fee Structure Builder', icon: CreditCardIcon },
            { id: 'user_permissions', label: 'User Permissions', icon: ShieldCheckIcon },
            { id: 'branding', label: 'Branding', icon: PhotoIcon },
            { id: 'numbering', label: 'Document Numbering', icon: DocumentTextIcon }
        ] as const;
    }, [isDrivingSchool]);

    // Driving School Settings Fee Structure States
    const [showDsFeeForm, setShowDsFeeForm] = useState(false);
    const [editingDsFee, setEditingDsFee] = useState<any>(null);
    const [openingBalanceSearch, setOpeningBalanceSearch] = useState('');
    const [openingBalanceClassFilter, setOpeningBalanceClassFilter] = useState('All');
    const [openingBalancesMap, setOpeningBalancesMap] = useState<Record<string, number>>(() => {
        const initialMap: Record<string, number> = {};
        props.students.forEach(s => {
            initialMap[s.id] = s.metadata?.openingBalance || 0;
        });
        return initialMap;
    });

    useEffect(() => {
        if (!props.students || props.students.length === 0) return;
        setOpeningBalancesMap(prev => {
            const newMap: Record<string, number> = {};
            props.students.forEach(s => {
                newMap[s.id] = parseMoneyAmount(s.metadata?.openingBalance ?? prev[s.id] ?? 0);
            });
            return newMap;
        });
    }, [props.students]);

    // Importer State
    const [showImporter, setShowImporter] = useState(false);
    const [importerFile, setImporterFile] = useState<File | null>(null);
    const [importerStep, setImporterStep] = useState<'upload' | 'map'>('upload');
    const [importerRawData, setImporterRawData] = useState<any[]>([]);
    const [importerHeaders, setImporterHeaders] = useState<string[]>([]);
    const [importerMappings, setImporterMappings] = useState({
        identifier: '',
        balance: ''
    });
    const [importerMatchField, setImporterMatchField] = useState<'admissionNumber' | 'name'>('admissionNumber');
    const [isSavingBalances, setIsSavingBalances] = useState(false);
    const [brandingConfig, setBrandingConfig] = useState({
        invoicePrefix: props.companyDetails?.globalInvoicePrefix || 'INV-',
        receiptPrefix: 'REC-',
        footerNotes: 'Thank you for your continued partnership. For inquiries contact accounts.'
    });

    // Document Numbering Configuration state & defaults
    const DOCUMENT_TYPES = useMemo(() => [
        { type: 'invoice', label: 'Invoice Numbering', defaultPrefix: 'INV-', defaultNextNumber: 1001 },
        { type: 'receipt', label: 'Receipt Numbering', defaultPrefix: 'REC-', defaultNextNumber: 1001 },
        { type: 'payment_voucher', label: 'Payment Voucher (Expense)', defaultPrefix: 'PV-', defaultNextNumber: 1001 },
        { type: 'credit_note', label: 'Credit Note', defaultPrefix: 'CN-', defaultNextNumber: 1001 },
        { type: 'debit_note', label: 'Debit Note', defaultPrefix: 'DN-', defaultNextNumber: 1001 },
        { type: 'goods_in_lieu', label: 'Goods In Lieu Proposal', defaultPrefix: 'GIL-', defaultNextNumber: 1001 },
    ], []);

    const [numberingConfigs, setNumberingConfigs] = useState<any[]>([]);
    const [loadingNumbering, setLoadingNumbering] = useState(false);
    const [editingPrefixes, setEditingPrefixes] = useState<Record<string, string>>({});
    const [editingNumbers, setEditingNumbers] = useState<Record<string, number>>({});

    const fetchNumberingConfigs = async () => {
        setLoadingNumbering(true);
        try {
            const instId = props.institution.id;
            const res = await apiService.fetchModuleRecords<any>('finance_numbering_configs', instId);
            setNumberingConfigs(res || []);
        } catch (err) {
            console.error("Failed to load document numbering configs:", err);
        } finally {
            setLoadingNumbering(false);
        }
    };

    const handleSaveNumberingConfig = async (docType: string, prefix: string, nextNumber: number) => {
        try {
            const instId = props.institution.id;
            const existing = numberingConfigs.find(c => c.documentType === docType || c.document_type === docType);
            const payload = {
                id: existing?.id || `num_cfg_${docType}_${Date.now()}`,
                institutionId: instId,
                institution_id: instId,
                documentType: docType,
                document_type: docType,
                prefix: prefix,
                nextNumber: Number(nextNumber),
                next_number: Number(nextNumber),
                updatedAt: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (existing?.id) {
                await apiService.updateModuleRecord('finance_numbering_configs', existing.id, payload);
            } else {
                await apiService.saveModuleRecord('finance_numbering_configs', payload);
            }
            alert(`${docType.replace('_', ' ').toUpperCase()} numbering config saved successfully!`);
            fetchNumberingConfigs();
        } catch (e: any) {
            alert("Failed to save numbering config: " + (e.message || e));
        }
    };

    useEffect(() => {
        const prefixes: Record<string, string> = {};
        const numbers: Record<string, number> = {};
        DOCUMENT_TYPES.forEach(item => {
            const cfg = numberingConfigs.find(c => c.documentType === item.type || c.document_type === item.type);
            prefixes[item.type] = cfg?.prefix ?? item.defaultPrefix;
            numbers[item.type] = cfg?.nextNumber ?? cfg?.next_number ?? item.defaultNextNumber;
        });
        setEditingPrefixes(prefixes);
        setEditingNumbers(numbers);
    }, [numberingConfigs, DOCUMENT_TYPES]);

    // Local Academic Calendar States
    const [localAcademicYears, setLocalAcademicYears] = useState(() => props.academicYears || []);
    const [localSemesters, setLocalSemesters] = useState(() => props.semesters || []);

    // Sync from props
    useEffect(() => {
        setLocalAcademicYears(props.academicYears || []);
    }, [props.academicYears]);

    useEffect(() => {
        setLocalSemesters(props.semesters || []);
    }, [props.semesters]);

    // Creation states for Academic Year
    const [isCreatingAy, setIsCreatingAy] = useState(false);
    const [newAyName, setNewAyName] = useState('');
    const [newAyStartDate, setNewAyStartDate] = useState('');
    const [newAyEndDate, setNewAyEndDate] = useState('');
    
    // Search & Filter states for Academic Year
    const [aySearchQuery, setAySearchQuery] = useState('');
    // Editing states for Academic Year
    const [editingAyId, setEditingAyId] = useState<string | null>(null);
    const [editingAyName, setEditingAyName] = useState('');
    const [editingAyStartDate, setEditingAyStartDate] = useState('');
    const [editingAyEndDate, setEditingAyEndDate] = useState('');

    // Creation states for Semester/Term
    const [isCreatingTerm, setIsCreatingTerm] = useState(false);
    const [newTermAyId, setNewTermAyId] = useState('');
    const [newTermName, setNewTermName] = useState('');
    const [newTermStartDate, setNewTermStartDate] = useState('');
    const [newTermEndDate, setNewTermEndDate] = useState('');

    useEffect(() => {
        if (localAcademicYears.length > 0 && !newTermAyId) {
            setNewTermAyId(localAcademicYears[0].id);
        }
    }, [localAcademicYears, newTermAyId]);

    // Search & Filter states for Semester/Term
    const [termSearchQuery, setTermSearchQuery] = useState('');
    const [termAyFilter, setTermAyFilter] = useState('');
    // Editing states for Semester/Term
    const [editingTermId, setEditingTermId] = useState<string | null>(null);
    const [editingTermName, setEditingTermName] = useState('');
    const [editingTermStartDate, setEditingTermStartDate] = useState('');
    const [editingTermEndDate, setEditingTermEndDate] = useState('');

    // Financial Year states
    const [financialYears, setFinancialYears] = useState([
        { id: 'fy25', name: 'FY 2025', startDate: '2025-01-01', endDate: '2025-12-31', status: 'Closed' },
        { id: 'fy26', name: 'FY 2026', startDate: '2026-01-01', endDate: '2026-12-31', status: 'Active' },
    ]);
    const [newFyName, setNewFyName] = useState('');
    const [newFyStartDate, setNewFyStartDate] = useState('');
    const [newFyEndDate, setNewFyEndDate] = useState('');

    // User Permissions states
    const [selectedRole, setSelectedRole] = useState<'Accountant' | 'Teacher' | 'Registrar' | 'Admin'>('Accountant');
    const [permissionsMap, setPermissionsMap] = useState<Record<string, Record<string, boolean>>>({
        Accountant: { billing: true, expenses: true, requisitions: true, audit: true, settings: false },
        Teacher: { billing: false, expenses: false, requisitions: false, audit: false, settings: false },
        Registrar: { billing: true, expenses: false, requisitions: false, audit: false, settings: false },
        Admin: { billing: true, expenses: true, requisitions: true, audit: true, settings: true },
    });

    const handleTogglePermission = (role: string, module: string) => {
        setPermissionsMap(prev => ({
            ...prev,
            [role]: {
                ...prev[role],
                [module]: !prev[role][module]
            }
        }));
    };

    const handleSavePermissions = async () => {
        alert(`Access control permissions for role ${selectedRole} updated successfully!`);
        if (props.onLogAction) {
            await props.onLogAction(`Updated access permissions for role ${selectedRole}`);
        }
    };

    const handleSaveOpeningBalances = async () => {
        setIsSavingBalances(true);
        try {
            // Find all students whose opening balance was modified
            const studentsToUpdate = props.students.filter(s => {
                const originalBalance = s.metadata?.openingBalance || 0;
                const newBalance = openingBalancesMap[s.id] || 0;
                return originalBalance !== newBalance;
            });

            if (studentsToUpdate.length > 0) {
                // Update them in parallel batches (chunk size 20)
                const chunkSize = 20;
                for (let i = 0; i < studentsToUpdate.length; i += chunkSize) {
                    const chunk = studentsToUpdate.slice(i, i + chunkSize);
                    await Promise.all(chunk.map(student => {
                        const updatedMetadata = {
                            ...(student.metadata || {}),
                            openingBalance: openingBalancesMap[student.id] || 0
                        };
                        return apiService.updateModuleRecord('users', student.id, {
                            metadata: updatedMetadata
                        });
                    }));
                }
                
                if (props.onRefreshData) {
                    await props.onRefreshData();
                }
            }

            alert("Opening balances saved successfully! The ledger profiles have been updated.");
            if (props.onLogAction) {
                await props.onLogAction("Updated student opening balances in ledger settings");
            }
        } catch (e: any) {
            alert("Failed to save opening balances: " + (e.message || e));
        } finally {
            setIsSavingBalances(false);
        }
    };

    // Accounts & Grants sub-tab states
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [isLoadingBanks, setIsLoadingBanks] = useState(false);
    const [newBankName, setNewBankName] = useState('');
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountNumber, setNewAccountNumber] = useState('');
    const [newBranchName, setNewBranchName] = useState('');
    const [newCurrency, setNewCurrency] = useState('KES');
    const [newIntegrationService, setNewIntegrationService] = useState('None');
    const [newIntegrationStatus, setNewIntegrationStatus] = useState('Not Configured');
    const [editingBankAccountId, setEditingBankAccountId] = useState<string | null>(null);

    const [schoolGrants, setSchoolGrants] = useState<any[]>([]);
    const [isLoadingGrants, setIsLoadingGrants] = useState(false);
    const [newGrantConstituency, setNewGrantConstituency] = useState('');
    const [newGrantCheque, setNewGrantCheque] = useState('');
    const [newGrantAmount, setNewGrantAmount] = useState('');
    const [newGrantFY, setNewGrantFY] = useState('2025/2026');
    const [newGrantPurpose, setNewGrantPurpose] = useState('');
    const [newGrantNotes, setNewGrantNotes] = useState('');
    const [editingGrantId, setEditingGrantId] = useState<string | null>(null);

    const [settingsVoteName, setSettingsVoteName] = useState('');
    const [settingsVotePriority, setSettingsVotePriority] = useState(10);
    const [settingsVoteAllocatedAmount, setSettingsVoteAllocatedAmount] = useState(0);
    const [editingSettingsVoteheadId, setEditingSettingsVoteheadId] = useState<string | null>(null);

    const fetchBankAccounts = async () => {
        setIsLoadingBanks(true);
        try {
            const data = await apiService.fetchModuleRecords<any>('school_bank_accounts', props.institution.id).catch(() => []);
            setBankAccounts(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingBanks(false);
        }
    };

    const fetchSchoolGrants = async () => {
        setIsLoadingGrants(true);
        try {
            const data = await apiService.fetchModuleRecords<any>('ng_cdf_school_grants', props.institution.id).catch(() => []);
            setSchoolGrants(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingGrants(false);
        }
    };

    const fetchBankTransfers = async () => {
        setIsLoadingBankTransfers(true);
        try {
            const data = await apiService.fetchModuleRecords<any>('inter_bank_transfers', props.institution.id).catch(() => []);
            setBankTransfersList(data || []);
        } catch (err) {
            console.error("Failed to load bank transfers:", err);
        } finally {
            setIsLoadingBankTransfers(false);
        }
    };

    const fetchVoteTransfers = async () => {
        setIsLoadingVoteTransfers(true);
        try {
            const data = await apiService.fetchModuleRecords<any>('inter_vote_transfers', props.institution.id).catch(() => []);
            setVoteTransfersList(data || []);
        } catch (err) {
            console.error("Failed to load vote transfers:", err);
        } finally {
            setIsLoadingVoteTransfers(false);
        }
    };

    const handleSaveBankAccount = async (accountData: any) => {
        try {
            const payload = {
                id: accountData.id || `bank_${Date.now()}`,
                institutionId: props.institution.id,
                bankName: accountData.bankName,
                accountName: accountData.accountName,
                accountNumber: accountData.accountNumber,
                branchName: accountData.branchName || '',
                currency: accountData.currency || 'KES',
                status: accountData.status || 'Active',
                integrationService: accountData.integrationService || 'None',
                integrationStatus: accountData.integrationStatus || 'Not Configured',
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('school_bank_accounts', payload);
            alert('Bank account saved successfully!');
            fetchBankAccounts();
            
            setNewBankName('');
            setNewAccountName('');
            setNewAccountNumber('');
            setNewBranchName('');
            setNewCurrency('KES');
            setNewIntegrationService('None');
            setNewIntegrationStatus('Not Configured');
            setEditingBankAccountId(null);
        } catch (err: any) {
            console.error('Failed to save bank account:', err);
            alert('Failed to save bank account: ' + (err.message || err));
        }
    };

    const handleDeleteBankAccount = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this bank account?')) return;
        try {
            await apiService.deleteModuleRecord('school_bank_accounts', id);
            alert('Bank account deleted!');
            fetchBankAccounts();
        } catch (err: any) {
            console.error('Failed to delete bank account:', err);
            alert('Failed to delete bank account: ' + (err.message || err));
        }
    };

    const handleSaveSchoolGrant = async (grantData: any) => {
        try {
            const payload = {
                id: grantData.id || `grant_${Date.now()}`,
                institutionId: props.institution.id,
                constituencyName: grantData.constituencyName,
                chequeNumber: grantData.chequeNumber,
                amount: Number(grantData.amount) || 0,
                financialYear: grantData.financialYear,
                purpose: grantData.purpose || '',
                notes: grantData.notes || '',
                receivedDate: new Date().toISOString()
            };
            await apiService.saveModuleRecord('ng_cdf_school_grants', payload);
            alert('Subsidy/Grant record saved successfully!');
            fetchSchoolGrants();
            
            setNewGrantConstituency('');
            setNewGrantCheque('');
            setNewGrantAmount('');
            setNewGrantFY('2025/2026');
            setNewGrantPurpose('');
            setNewGrantNotes('');
            setEditingGrantId(null);
        } catch (err: any) {
            console.error('Failed to save grant:', err);
            alert('Failed to save grant: ' + (err.message || err));
        }
    };

    const handleDeleteSchoolGrant = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this grant record?')) return;
        try {
            await apiService.deleteModuleRecord('ng_cdf_school_grants', id);
            alert('Grant record deleted!');
            fetchSchoolGrants();
        } catch (err: any) {
            console.error('Failed to delete grant:', err);
            alert('Failed to delete grant: ' + (err.message || err));
        }
    };

    const [gridVoteHeads, setGridVoteHeads] = useState<any[]>([]);

    useEffect(() => {
        if (props.voteHeads) {
            setGridVoteHeads(props.voteHeads.map(v => ({
                id: v.id,
                name: v.name || '',
                priority: v.priority || 10,
                allocatedAmount: v.allocatedAmount || 0,
                isPercentage: (v as any).isPercentage || false,
                percentage: (v as any).percentage || 0
            })));
        }
    }, [props.voteHeads]);

    const handleAddGridRow = () => {
        const tempId = `new_${Date.now()}`;
        setGridVoteHeads(prev => [
            ...prev,
            {
                id: tempId,
                name: '',
                priority: prev.length > 0 ? Math.max(...prev.map(v => v.priority || 0)) + 10 : 10,
                allocatedAmount: 0,
                isPercentage: false,
                percentage: 0,
                isNew: true
            }
        ]);
    };

    const handleSaveGridRow = async (row: any) => {
        if (!row.name.trim()) {
            alert('Vote head name cannot be empty.');
            return;
        }
        try {
            const payload = {
                id: row.id.startsWith('new_') ? `vh_${Date.now()}_${Math.floor(Math.random() * 1000)}` : row.id,
                name: row.name,
                priority: Number(row.priority) || 10,
                allocatedAmount: row.isPercentage ? 0 : (Number(row.allocatedAmount) || 0),
                isPercentage: !!row.isPercentage,
                percentage: row.isPercentage ? (Number(row.percentage) || 0) : 0,
                institutionId: props.institution.id,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('vote_heads', payload);
            alert('Vote Head saved successfully!');
            if (props.onRefreshData) {
                await props.onRefreshData();
            }
        } catch (e) {
            console.error(e);
            alert('Failed to save Vote Head.');
        }
    };

    const handleSaveAllVoteHeads = async () => {
        const invalidRows = gridVoteHeads.filter(row => !row.name.trim());
        if (invalidRows.length > 0) {
            alert('All Vote Head names must be filled out.');
            return;
        }
        try {
            await Promise.all(gridVoteHeads.map(async (row) => {
                const payload = {
                    id: row.id.startsWith('new_') ? `vh_${Date.now()}_${Math.floor(Math.random() * 1000)}` : row.id,
                    name: row.name,
                    priority: Number(row.priority) || 10,
                    allocatedAmount: row.isPercentage ? 0 : (Number(row.allocatedAmount) || 0),
                    isPercentage: !!row.isPercentage,
                    percentage: row.isPercentage ? (Number(row.percentage) || 0) : 0,
                    institutionId: props.institution.id,
                    createdAt: row.createdAt || new Date().toISOString()
                };
                await apiService.saveModuleRecord('vote_heads', payload);
            }));
            alert('All Vote Heads saved successfully!');
            if (props.onRefreshData) {
                await props.onRefreshData();
            }
        } catch (e) {
            console.error(e);
            alert('Failed to save Vote Heads.');
        }
    };

    const handleDeleteGridRow = async (row: any) => {
        if (row.id.startsWith('new_')) {
            setGridVoteHeads(prev => prev.filter(v => v.id !== row.id));
            return;
        }
        if (!window.confirm(`Are you sure you want to delete the vote head "${row.name}"?`)) return;
        try {
            await apiService.deleteModuleRecord('vote_heads', row.id);
            alert('Vote Head deleted!');
            if (props.onRefreshData) {
                await props.onRefreshData();
            }
        } catch (e) {
            console.error(e);
            alert('Failed to delete Vote Head.');
        }
    };

    const handleImporterFileSelect = (selectedFile: File) => {
        setImporterFile(selectedFile);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Parse headers
                const sheetData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                if (sheetData.length === 0) {
                    alert("Spreadsheet is empty.");
                    return;
                }
                const headers = sheetData[0].filter((h: any) => h !== null && h !== '').map(String);
                setImporterHeaders(headers);

                // Auto-detect columns
                const detectedId = headers.find((h: string) => /adm|number|reg|identifier|student|name/i.test(h)) || '';
                const detectedBal = headers.find((h: string) => /bal|amount|open/i.test(h)) || '';
                setImporterMappings({
                    identifier: detectedId,
                    balance: detectedBal
                });

                if (/name|student/i.test(detectedId)) {
                    setImporterMatchField('name');
                } else {
                    setImporterMatchField('admissionNumber');
                }

                const rowsJson = XLSX.utils.sheet_to_json(worksheet);
                setImporterRawData(rowsJson);
                setImporterStep('map');
            } catch (err: any) {
                alert("Failed to parse sheet: " + err.message);
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const handleConfirmImportBalances = () => {
        if (!importerMappings.identifier || !importerMappings.balance) {
            alert("Please map both the Student Identifier and Balance columns.");
            return;
        }

        let matchCount = 0;
        let skipCount = 0;
        const newBalancesMap = { ...openingBalancesMap };

        // Helper to parse balance numbers with currency symbols, commas, or parentheses e.g. "(500)" or "Ksh 1,500.00"
        const parseImportBalance = (val: any): number => {
            if (val === null || val === undefined || val === '') return NaN;
            if (typeof val === 'number') return val;
            let s = String(val).trim();
            if (!s) return NaN;
            let isNeg = false;
            if (s.startsWith('(') && s.endsWith(')')) {
                isNeg = true;
                s = s.slice(1, -1);
            } else if (s.startsWith('-') || s.endsWith('-')) {
                isNeg = true;
            }
            const clean = s.replace(/[^0-9.]/g, '');
            if (!clean) return NaN;
            const parsed = parseFloat(clean);
            if (isNaN(parsed)) return NaN;
            return isNeg ? -parsed : parsed;
        };

        // Helper to collect all potential admission/identifier strings for a student
        const getStudentIdentifiers = (s: User): string[] => {
            const set = new Set<string>();
            const enrollment = enrollments.find(e => e.userId === s.id);
            const candidates = [
                s.admissionNumber,
                s.admission_number,
                s.metadata?.admissionNumber,
                s.metadata?.admission_number,
                (s as any).admNo,
                (s as any).registrationNumber,
                (s as any).reg_no,
                s.staffId,
                enrollment?.admissionNumber,
                enrollment?.admission_number,
                enrollment?.admNo,
                enrollment?.metadata?.admissionNumber,
                enrollment?.metadata?.admission_number
            ];
            candidates.forEach(c => {
                if (c !== undefined && c !== null && String(c).trim() !== '') {
                    set.add(String(c).trim());
                }
            });
            return Array.from(set);
        };

        const normalize = (str: string) => str.trim().toLowerCase();
        const sanitizeAlphaNum = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        importerRawData.forEach(row => {
            const rawId = String(row[importerMappings.identifier] || '').trim();
            const rawBal = parseImportBalance(row[importerMappings.balance]);

            if (!rawId || isNaN(rawBal)) {
                skipCount++;
                return;
            }

            const normRawId = normalize(rawId);
            const alphaRawId = sanitizeAlphaNum(rawId);
            const rawInt = parseInt(rawId, 10);

            // Find matching student
            let matchedStudent: User | undefined;

            if (importerMatchField === 'admissionNumber') {
                matchedStudent = props.students.find(s => {
                    const ids = getStudentIdentifiers(s);
                    if (ids.some(id => normalize(id) === normRawId)) return true;
                    if (alphaRawId && ids.some(id => sanitizeAlphaNum(id) === alphaRawId)) return true;
                    if (!isNaN(rawInt) && ids.some(id => parseInt(id, 10) === rawInt)) return true;
                    return false;
                });

                // Fallback to student name match if admission number match failed
                if (!matchedStudent) {
                    matchedStudent = props.students.find(s => {
                        if (!s.name) return false;
                        return normalize(s.name) === normRawId || (alphaRawId && sanitizeAlphaNum(s.name) === alphaRawId);
                    });
                }
            } else {
                // Primary match by student name
                matchedStudent = props.students.find(s => {
                    if (!s.name) return false;
                    return normalize(s.name) === normRawId || (alphaRawId && sanitizeAlphaNum(s.name) === alphaRawId);
                });

                // Fallback to admission number match
                if (!matchedStudent) {
                    matchedStudent = props.students.find(s => {
                        const ids = getStudentIdentifiers(s);
                        if (ids.some(id => normalize(id) === normRawId)) return true;
                        if (alphaRawId && ids.some(id => sanitizeAlphaNum(id) === alphaRawId)) return true;
                        return false;
                    });
                }
            }

            if (matchedStudent) {
                newBalancesMap[matchedStudent.id] = rawBal;
                matchCount++;
            } else {
                skipCount++;
            }
        });

        setOpeningBalancesMap(newBalancesMap);
        alert(`Import complete! Matched and updated ${matchCount} students. Skipped ${skipCount} unmatched rows. Don't forget to click 'Save Changes' to persist updates!`);
        
        setImporterFile(null);
        setImporterStep('upload');
        setShowImporter(false);
    };

    const handleSaveBranding = async () => {
        alert("Institutional branding configurations updated successfully!");
        if (props.onLogAction) {
            await props.onLogAction("Configured institutional invoice/receipt prefix branding");
        }
    };

    // Financial calculations for students grouped by class
    function studentClassGroup(student: User) {
        const enrollment = enrollments.find(e => e.userId === student.id);
        const metaGrade = enrollment?.metadata?.gradeLevel || enrollment?.metadata?.stream || student.metadata?.gradeLevel || student.metadata?.stream;
        if (metaGrade) return metaGrade;
        
        const invClass = mappedInvoices.find(i => (i as any).studentId === student.id && (i as any).className) as any;
        if (invClass && invClass.className) return invClass.className;
        
        const courseName = props.courses?.find(c => c.id === student.courseId)?.name;
        if (courseName) return courseName;
        
        return 'Unassigned Class';
    }



    // State for students balances registry sub-tab
    const [studentSubTab, setStudentSubTab] = useState<'registry' | 'balances'>('registry');
    const [searchBalances, setSearchBalances] = useState('');
    const [balanceClassFilter, setBalanceClassFilter] = useState('All');
    const [balanceStatusFilter, setBalanceStatusFilter] = useState('All');
    const [balanceSortOption, setBalanceSortOption] = useState<'latest' | 'highest_balance' | 'lowest_balance' | 'name'>('latest');

    const studentFinanceData = useMemo(() => {
        const filteredStudents = props.students.filter(s => 
            selectedBranchId === 'ALL' || (s.branchId || s.branch_id) === selectedBranchId
        );
        return filteredStudents.map(s => {
            const enrollment = enrollments.find(e => e.userId === s.id);
            const adm = enrollment?.admissionNumber || s.admissionNumber || s.admission_number || '—';
            const cls = enrollment?.metadata?.gradeLevel || enrollment?.metadata?.stream || studentClassGroup(s);

            const openingBal = parseMoneyAmount(openingBalancesMap[s.id] ?? s.metadata?.openingBalance ?? 0);

            const studentInvoices = mappedInvoices.filter(inv => 
                (inv.studentId === s.id || (inv as any).student_id === s.id) && 
                inv.status !== 'cancelled' && 
                inv.status !== 'quote'
            );
            const invoicedWithoutOpening = studentInvoices.reduce((sum, inv) => {
                const amt = inv.totalAmount || (inv as any).total_amount || 0;
                return sum + parseMoneyAmount(amt);
            }, 0);
            
            const totalInvoiced = openingBal + invoicedWithoutOpening;

            const studentReceipts = mappedReceipts.filter(rec => 
                rec.studentId === s.id || (rec as any).student_id === s.id
            );
            const paid = studentReceipts.reduce((sum, rec) => {
                const amt = rec.amountPaid || (rec as any).amount_paid || 0;
                return sum + parseMoneyAmount(amt);
            }, 0);
            
            const netBalance = totalInvoiced - paid;
            const balance = Math.max(0, netBalance);
            const prepayment = Math.max(0, -netBalance);

            // Compute last updated timestamp
            let lastUpdatedTime = 0;
            if ((s as any).updated_at || (s as any).updatedAt) {
                lastUpdatedTime = new Date((s as any).updated_at || (s as any).updatedAt).getTime() || 0;
            }
            if ((s as any).created_at || (s as any).createdAt) {
                const cTime = new Date((s as any).created_at || (s as any).createdAt).getTime() || 0;
                if (cTime > lastUpdatedTime) lastUpdatedTime = cTime;
            }
            studentInvoices.forEach(inv => {
                const invTime = new Date((inv as any).issueDate || inv.createdAt || (inv as any).created_at || 0).getTime();
                if (invTime > lastUpdatedTime) lastUpdatedTime = invTime;
            });
            studentReceipts.forEach(rec => {
                const recTime = new Date((rec as any).paymentDate || (rec as any).payment_date || rec.createdAt || (rec as any).created_at || 0).getTime();
                if (recTime > lastUpdatedTime) lastUpdatedTime = recTime;
            });
            
            return {
                ...s,
                admissionNumber: adm,
                className: cls,
                openingBalance: openingBal,
                lastUpdatedTime,
                totals: {
                    openingBalance: openingBal,
                    invoicedWithoutOpening,
                    invoiced: totalInvoiced,
                    paid,
                    balance,
                    prepayment
                }
            };
        });
    }, [props.students, mappedInvoices, mappedReceipts, enrollments, openingBalancesMap, selectedBranchId]);

    const availableClassesForBalances = useMemo(() => {
        const classesSet = new Set<string>();
        studentFinanceData.forEach(s => {
            const cls = s.className || studentClassGroup(s);
            if (cls) classesSet.add(cls);
        });
        return Array.from(classesSet).sort();
    }, [studentFinanceData]);

    const filteredOpeningBalanceStudents = useMemo(() => {
        return studentFinanceData.filter(student => {
            const matchesSearch = student.name?.toLowerCase().includes(openingBalanceSearch.toLowerCase()) ||
                (student.admissionNumber && student.admissionNumber.toLowerCase().includes(openingBalanceSearch.toLowerCase()));
            
            const cls = student.className || studentClassGroup(student);
            const matchesClass = openingBalanceClassFilter === 'All' || cls === openingBalanceClassFilter;
            
            return matchesSearch && matchesClass;
        });
    }, [studentFinanceData, openingBalanceSearch, openingBalanceClassFilter]);

    const filteredFinanceStudents = useMemo(() => {
        const list = studentFinanceData.filter(s => {
            const matchesSearch = !searchBalances || (
                s.name?.toLowerCase().includes(searchBalances.toLowerCase()) ||
                s.admissionNumber?.toLowerCase().includes(searchBalances.toLowerCase()) ||
                s.admission_number?.toLowerCase().includes(searchBalances.toLowerCase())
            );

            const cls = s.className || studentClassGroup(s);
            const matchesClass = balanceClassFilter === 'All' || cls === balanceClassFilter;

            let matchesStatus = true;
            if (balanceStatusFilter === 'has_balance') {
                matchesStatus = s.totals.balance > 0;
            } else if (balanceStatusFilter === 'fully_paid') {
                matchesStatus = s.totals.balance <= 0 && s.totals.prepayment <= 0;
            } else if (balanceStatusFilter === 'prepaid') {
                matchesStatus = s.totals.prepayment > 0;
            } else if (balanceStatusFilter === 'no_payment') {
                matchesStatus = s.totals.paid <= 0 && s.totals.invoiced > 0;
            }

            return matchesSearch && matchesClass && matchesStatus;
        });

        return list.sort((a, b) => {
            if (balanceSortOption === 'latest') {
                return (b.lastUpdatedTime || 0) - (a.lastUpdatedTime || 0);
            } else if (balanceSortOption === 'highest_balance') {
                return b.totals.balance - a.totals.balance;
            } else if (balanceSortOption === 'lowest_balance') {
                return a.totals.balance - b.totals.balance;
            } else if (balanceSortOption === 'name') {
                return (a.name || '').localeCompare(b.name || '');
            }
            return (b.lastUpdatedTime || 0) - (a.lastUpdatedTime || 0);
        });
    }, [studentFinanceData, searchBalances, balanceClassFilter, balanceStatusFilter, balanceSortOption]);

    const groupedStudents = useMemo(() => {
        const groups: Record<string, typeof filteredFinanceStudents> = {};
        filteredFinanceStudents.forEach(s => {
            const cls = studentClassGroup(s);
            if (!groups[cls]) groups[cls] = [];
            groups[cls].push(s);
        });
        return groups;
    }, [filteredFinanceStudents]);

    const totalOutstandingAll = useMemo(() => {
        return studentFinanceData.reduce((sum, s) => sum + s.totals.balance, 0);
    }, [studentFinanceData]);

    const collectionRateAll = useMemo(() => {
        const totalInvoiced = studentFinanceData.reduce((sum, s) => sum + s.totals.invoiced, 0);
        const totalPaid = studentFinanceData.reduce((sum, s) => sum + s.totals.paid, 0);
        if (totalInvoiced === 0) return 100;
        return (totalPaid / totalInvoiced) * 100;
    }, [studentFinanceData]);

    const tabs = [
        { id: 'home', label: 'Home', icon: HomeIcon },
        { id: 'wizard', label: 'Billing Wizard', icon: SparklesIcon },
        { id: 'billing', label: isDrivingSchool ? 'DS Invoices' : 'Students', icon: ZapIcon },
        { id: 'balances', label: 'Fee Balances', icon: WalletIcon },
        { id: 'receipts', label: 'Receipts', icon: DocumentTextIcon },
        { id: 'student_invoices', label: 'Invoices', icon: ClipboardListIcon },
        { id: 'gok_capitation', label: 'GoK Capitation', icon: BuildingLibraryIcon },
        { id: 'bursaries', label: 'NG-CDF Bursaries', icon: ScaleIcon },
        { id: 'expenses', label: 'Expense Governance', icon: BanknotesIcon },
        { id: 'transfers', label: 'Inter-Account Transfers', icon: ArrowsRightLeftIcon },
        { id: 'requisitions', label: 'Requisitions & LPOs', icon: ClipboardListIcon },
        { id: 'payroll', label: 'HR & Payroll', icon: BriefcaseIcon },
        { id: 'audit', label: 'Fiscal Audit', icon: CheckBadgeIcon },
        { id: 'settings', label: 'Settings', icon: Cog8ToothIcon },
        { id: 'reports', label: 'Reports', icon: FileTextIcon },
    ] as const;

    const hrSubTabs = [
        { id: 'roster', label: 'Staff Roster', icon: UserGroupIcon },
        { id: 'payroll', label: 'Payroll', icon: BriefcaseIcon },
        { id: 'leave', label: 'Leave', icon: ClipboardListIcon },
        { id: 'attendance', label: 'Attendance', icon: CheckBadgeIcon },
        { id: 'reports', label: 'Reports', icon: FileTextIcon },
        { id: 'analytics', label: 'Analytics', icon: ChartPieIcon },
    ] as const;

    // NG-CDF Bursary States
    const [bursaryStudentSearch, setBursaryStudentSearch] = useState('');
    const [bursaryStudentId, setBursaryStudentId] = useState('');
    const [bursaryConstituency, setBursaryConstituency] = useState('');
    const [constituencyList, setConstituencyList] = useState<any[]>([]);
    const [constituencyDropdown1Open, setConstituencyDropdown1Open] = useState(false);
    const [constituencyDropdown2Open, setConstituencyDropdown2Open] = useState(false);
    const [bursaryAmount, setBursaryAmount] = useState('');
    const [bursaryChequeNumber, setBursaryChequeNumber] = useState('');
    const [bursaryNotes, setBursaryNotes] = useState('');
    const [bursaryFY, setBursaryFY] = useState('2025/2026');
    const [bursaryRecords, setBursaryRecords] = useState<NGCdfBursary[]>([]);
    const [isSavingBursary, setIsSavingBursary] = useState(false);
    const [bursarySubTab, setBursarySubTab] = useState<'post_cheque' | 'initiate_app'>('post_cheque');
    const [bursaryBankAccountId, setBursaryBankAccountId] = useState('');

    // GoK Capitation States
    const [gokEnrolment, setGokEnrolment] = useState('');
    const [gokDisbursementRate, setGokDisbursementRate] = useState('1420');  // FPE primary rate (KES)
    const [gokSneCount, setGokSneCount] = useState('');
    const [gokSneRate, setGokSneRate] = useState('6720');  // SNE top-up rate
    const [gokTranche, setGokTranche] = useState<'term_1' | 'term_2' | 'term_3'>('term_1');
    const [gokReference, setGokReference] = useState('');
    const [gokBankAccountId, setGokBankAccountId] = useState('');
    const [gokNotes, setGokNotes] = useState('');
    const [gokCapLogs, setGokCapLogs] = useState<any[]>([]);
    const [isLoadingGokLogs, setIsLoadingGokLogs] = useState(false);
    const [isSavingGokCap, setIsSavingGokCap] = useState(false);

    // Installment / Carry Forward States
    const [gokPaymentMode, setGokPaymentMode] = useState<'full' | 'installment'>('full');
    const [gokCustomAmount, setGokCustomAmount] = useState('');
    const [gokCustomPct, setGokCustomPct] = useState('');
    const [gokInstallmentLabel, setGokInstallmentLabel] = useState('');

    const GOK_TRANCHE_PCTS: Record<string, number> = { term_1: 50, term_2: 30, term_3: 20 };

    const gokTotalFull = (() => {
        const e = Number(gokEnrolment) || 0;
        const r = Number(gokDisbursementRate) || 0;
        const sne = Number(gokSneCount) || 0;
        const sneR = Number(gokSneRate) || 0;
        return e * r + sne * sneR;
    })();

    const gokTranchePct = gokPaymentMode === 'full' 
        ? (GOK_TRANCHE_PCTS[gokTranche] || 0)
        : (Number(gokCustomPct) || 0);

    const gokTotalReceived = gokPaymentMode === 'full'
        ? ((gokTotalFull * gokTranchePct) / 100)
        : (Number(gokCustomAmount) || 0);

    const gokSimbaAmount = gokTotalReceived * 0.50;
    const gokGpaAmount   = gokTotalReceived * 0.50;

    const handleCustomAmountChange = (amountStr: string) => {
        setGokCustomAmount(amountStr);
        const amount = Number(amountStr) || 0;
        if (gokTotalFull > 0) {
            const pct = (amount / gokTotalFull) * 100;
            setGokCustomPct(Number(pct.toFixed(2)).toString());
        } else {
            setGokCustomPct('');
        }
    };

    const handleCustomPctChange = (pctStr: string) => {
        setGokCustomPct(pctStr);
        const pct = Number(pctStr) || 0;
        if (gokTotalFull > 0) {
            const amount = (gokTotalFull * pct) / 100;
            setGokCustomAmount(Number(amount.toFixed(2)).toString());
        } else {
            setGokCustomAmount('');
        }
    };

    useEffect(() => {
        if (gokPaymentMode === 'installment' && gokCustomPct) {
            const pct = Number(gokCustomPct) || 0;
            const amount = (gokTotalFull * pct) / 100;
            setGokCustomAmount(Number(amount.toFixed(2)).toString());
        }
    }, [gokTotalFull, gokPaymentMode]);

    useEffect(() => {
        if (gokPaymentMode === 'installment' && !gokInstallmentLabel) {
            setGokInstallmentLabel('Installment 1');
        }
    }, [gokPaymentMode, gokTranche]);

    useEffect(() => {
        apiService.fetchModuleRecords('constituencies')
            .then(res => {
                if (Array.isArray(res)) {
                    setConstituencyList(res);
                }
            })
            .catch(err => console.error("Failed to load constituencies:", err));
    }, []);

    const fetchGokCapLogs = async () => {
        setIsLoadingGokLogs(true);
        try {
            const data = await apiService.fetchModuleRecords<any>('gok_capitation_logs', props.institution.id).catch(() => []);
            setGokCapLogs(data || []);
        } catch(e) {
            console.error('Failed to fetch GoK capitation logs:', e);
        } finally {
            setIsLoadingGokLogs(false);
        }
    };

    const handlePostGokCapitation = async () => {
        if (!gokEnrolment || Number(gokEnrolment) <= 0) { alert('Enrolment count is required and must be > 0.'); return; }
        if (!gokDisbursementRate || Number(gokDisbursementRate) <= 0) { alert('Disbursement rate is required.'); return; }
        if (!gokBankAccountId) { alert('Please select a receiving bank account.'); return; }
        if (gokPaymentMode === 'installment' && (!gokCustomAmount || Number(gokCustomAmount) <= 0)) {
            alert('Please enter a valid installment amount.');
            return;
        }

        setIsSavingGokCap(true);
        try {
            const finalNotes = gokPaymentMode === 'installment'
                ? `[Installment: ${gokInstallmentLabel || 'Partial Payment'}] ${gokNotes}`
                : gokNotes;

            const rec = {
                id: `gok_cap_${Date.now()}`,
                institutionId: props.institution.id,
                enrolmentCount: Number(gokEnrolment),
                disbursementRate: Number(gokDisbursementRate),
                sneCount: Number(gokSneCount) || 0,
                sneRate: Number(gokSneRate) || 0,
                trancheName: gokTranche,
                tranchePercentage: gokTranchePct,
                referenceNumber: gokReference,
                bankAccountId: gokBankAccountId,
                totalReceived: gokTotalReceived,
                simbaAmount: gokSimbaAmount,
                gpaAmount: gokGpaAmount,
                notes: finalNotes,
                createdAt: new Date().toISOString(),
            };
            await apiService.saveModuleRecord('gok_capitation_logs', rec);

            alert(`GoK Capitation posted!\nTotal: KES ${gokTotalReceived.toLocaleString()}\nSIMBA: KES ${gokSimbaAmount.toLocaleString()}\nGPA: KES ${gokGpaAmount.toLocaleString()}`);
            await fetchGokCapLogs();

            // Reset form
            setGokEnrolment('');
            setGokSneCount('');
            setGokReference('');
            setGokBankAccountId('');
            setGokNotes('');
            setGokCustomAmount('');
            setGokCustomPct('');
            setGokInstallmentLabel('');
            setGokPaymentMode('full');
        } catch(err: any) {
            console.error('Failed to post GoK capitation:', err);
            alert('Failed to post GoK capitation: ' + (err.message || err));
        } finally {
            setIsSavingGokCap(false);
        }
    };

    const [goodsProposals, setGoodsProposals] = useState<any[]>([]);
    const [isLoadingGoodsProposals, setIsLoadingGoodsProposals] = useState(false);
    const [receiptsMainTab, setReceiptsMainTab] = useState<'student_fees' | 'other_income' | 'bursaries' | 'payment_in_kind'>('student_fees');

    const fetchGoodsProposals = async () => {
        setIsLoadingGoodsProposals(true);
        try {
            const res = await apiService.fetchModuleRecords<any>('fee_goods_proposals', props.institution.id);
            setGoodsProposals(res || []);
        } catch (e) {
            console.error("Failed to fetch fee goods proposals:", e);
        } finally {
            setIsLoadingGoodsProposals(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'goods_in_lieu' || (activeTab === 'receipts' && receiptsMainTab === 'payment_in_kind')) {
            fetchGoodsProposals();
        }
        if (activeTab === 'gok_capitation') {
            fetchGokCapLogs();
        }
    }, [activeTab, receiptsMainTab]);

    const [retailStores, setRetailStores] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);



    const fetchDsFeeStructures = async () => {
        try {
            const res = await apiService.fetchModuleRecords<any>('ds_fee_structures', props.institution.id);
            setDsFeeStructures(res || []);
        } catch (e) {
            console.error("Failed to fetch ds_fee_structures:", e);
        }
    };

    const handleSaveDsFeeStructure = async (payload: any) => {
        try {
            await apiService.saveModuleRecord('ds_fee_structures', {
                id: payload.id || `ds_fs_${Date.now()}`,
                institutionId: props.institution.id,
                className: payload.className,
                description: payload.description,
                items: Array.isArray(payload.items) ? payload.items : [],
                totalAmount: payload.totalAmount,
                createdAt: payload.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            alert('Fee structure saved successfully!');
            await fetchDsFeeStructures();
        } catch (err: any) {
            console.error('Failed to save ds fee structure:', err);
            alert('Failed to save fee structure: ' + (err.message || err));
        }
    };

    const handleDeleteDsFeeStructure = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this fee structure?')) return;
        try {
            await apiService.deleteModuleRecord('ds_fee_structures', id);
            alert('Fee structure deleted!');
            await fetchDsFeeStructures();
        } catch (err: any) {
            console.error('Failed to delete ds fee structure:', err);
            alert('Failed to delete fee structure: ' + (err.message || err));
        }
    };

    // DS New Invoice Form States
    const [dsFormStudentId, setDsFormStudentId] = useState('');
    const [dsFormClass, setDsFormClass] = useState('');
    const [dsFormItems, setDsFormItems] = useState<Array<{ name: string; amount: number; priority: number }>>([]);
    const [dsFormNotes, setDsFormNotes] = useState('');
    const [dsFormDueDate, setDsFormDueDate] = useState('');

    // DS Payment Form States
    const [dsPayAmount, setDsPayAmount] = useState<number>(0);
    const [dsPayMethod, setDsPayMethod] = useState('M-Pesa');
    const [dsPayReference, setDsPayReference] = useState('');

    // Receipts states
    const [searchReceiptQuery, setSearchReceiptQuery] = useState('');
    const [receiptSourceFilter, setReceiptSourceFilter] = useState('All');

    // Invoices states
    const [searchInvoiceQuery, setSearchInvoiceQuery] = useState('');
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('All');
    const [invoiceClassFilter, setInvoiceClassFilter] = useState('All');
    const [selectedInvoiceForDetails, setSelectedInvoiceForDetails] = useState<any | null>(null);
    const [isPrintingInvoiceId, setIsPrintingInvoiceId] = useState<string | null>(null);
    const [unreconciledFeeds, setUnreconciledFeeds] = useState<any[]>([]);
    const [loadingFeeds, setLoadingFeeds] = useState(false);
    const [selectedFeedTx, setSelectedFeedTx] = useState<any | null>(null);
    const [showPostModal, setShowPostModal] = useState(false);
    const [showReconcileModal, setShowReconcileModal] = useState(false);

    // Post payment form states
    const [manualPayStudentId, setManualPayStudentId] = useState('');
    const [manualPayStudentSearch, setManualPayStudentSearch] = useState('');
    const [manualPayInvoiceId, setManualPayInvoiceId] = useState('');
    const [manualPayAmount, setManualPayAmount] = useState<number>(0);
    const [manualPayDate, setManualPayDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualPayMethod, setManualPayMethod] = useState('Cash');
    const [manualPayReference, setManualPayReference] = useState('');
    const [isSavingManualPay, setIsSavingManualPay] = useState(false);
    const [manualPayBankAccountId, setManualPayBankAccountId] = useState('');
    const [nextReceiptNumber, setNextReceiptNumber] = useState('');
    const [useCustomReceiptNumber, setUseCustomReceiptNumber] = useState(false);
    const [customReceiptNumber, setCustomReceiptNumber] = useState('');

    // Reconcile form states
    const [reconcileStudentId, setReconcileStudentId] = useState('');
    const [reconcileInvoiceId, setReconcileInvoiceId] = useState('');
    const [isReconciling, setIsReconciling] = useState(false);

    // Other Income states


    // Bulk Bursary Disbursement states
    const [bulkBursaryDonor, setBulkBursaryDonor] = useState('');
    const [bulkBursaryCheque, setBulkBursaryCheque] = useState('');
    const [bulkBursaryBank, setBulkBursaryBank] = useState('');
    const [bulkBursaryDate, setBulkBursaryDate] = useState(new Date().toISOString().split('T')[0]);
    const [bulkBursaryTotalAmount, setBulkBursaryTotalAmount] = useState<number>(0);
    const [bulkBursaryNotes, setBulkBursaryNotes] = useState('');
    const [bulkBursaryAllocations, setBulkBursaryAllocations] = useState<{ studentId: string; studentName: string; admNo: string; amount: number }[]>([]);
    const [bulkBursaryStudentSearch, setBulkBursaryStudentSearch] = useState('');
    const [isSavingBulkBursary, setIsSavingBulkBursary] = useState(false);
    const [bulkBursaryDisbursements, setBulkBursaryDisbursements] = useState<any[]>([]);
    const [bulkBursarySuccess, setBulkBursarySuccess] = useState('');
    const [bulkBursaryBankAccountId, setBulkBursaryBankAccountId] = useState('');
    const [showOtherIncomeModal, setShowOtherIncomeModal] = useState(false);
    const [otherIncomeCategory, setOtherIncomeCategory] = useState('Bus Hiring');
    const [otherIncomePayer, setOtherIncomePayer] = useState('');
    const [otherIncomeMethod, setOtherIncomeMethod] = useState('Cash');
    const [otherIncomeAmount, setOtherIncomeAmount] = useState<number>(0);
    const [otherIncomeDate, setOtherIncomeDate] = useState(new Date().toISOString().split('T')[0]);
    const [otherIncomeReference, setOtherIncomeReference] = useState('');
    const [otherIncomeDescription, setOtherIncomeDescription] = useState('');
    const [isSavingOtherIncome, setIsSavingOtherIncome] = useState(false);

    // Inter-Account Transfers states
    const [transfersSubTab, setTransfersSubTab] = useState<'bank' | 'vote'>('bank');
    const [bankTransferSourceId, setBankTransferSourceId] = useState('');
    const [bankTransferDestId, setBankTransferDestId] = useState('');
    const [bankTransferAmount, setBankTransferAmount] = useState<number>(0);
    const [bankTransferDate, setBankTransferDate] = useState(new Date().toISOString().split('T')[0]);
    const [bankTransferRef, setBankTransferRef] = useState('');
    const [bankTransferNotes, setBankTransferNotes] = useState('');
    const [isSavingBankTransfer, setIsSavingBankTransfer] = useState(false);
    const [bankTransfersList, setBankTransfersList] = useState<any[]>([]);
    const [isLoadingBankTransfers, setIsLoadingBankTransfers] = useState(false);

    const [voteTransferSourceId, setVoteTransferSourceId] = useState('');
    const [voteTransferDestId, setVoteTransferDestId] = useState('');
    const [voteTransferAmount, setVoteTransferAmount] = useState<number>(0);
    const [voteTransferDate, setVoteTransferDate] = useState(new Date().toISOString().split('T')[0]);
    const [voteTransferRef, setVoteTransferRef] = useState('');
    const [voteTransferNotes, setVoteTransferNotes] = useState('');
    const [isSavingVoteTransfer, setIsSavingVoteTransfer] = useState(false);
    const [voteTransfersList, setVoteTransfersList] = useState<any[]>([]);
    const [isLoadingVoteTransfers, setIsLoadingVoteTransfers] = useState(false);

    // Expense Recording states
    const [expCategory, setExpCategory] = useState('Salaries');
    const [expAmount, setExpAmount] = useState<number>(0);
    const [expDescription, setExpDescription] = useState('');
    const [isSavingExpense, setIsSavingExpense] = useState(false);
    const [expVoteHeadId, setExpVoteHeadId] = useState('');
    const [expBankAccountId, setExpBankAccountId] = useState('');
    const [expPaymentMethod, setExpPaymentMethod] = useState('Cash');
    const [expPayee, setExpPayee] = useState('');
    const [expReference, setExpReference] = useState('');
    const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
    const [expApprovedBy, setExpApprovedBy] = useState('');
    const [expPreparedBy, setExpPreparedBy] = useState(props.currentUser?.name || '');
    const [showVoucherPreviewModal, setShowVoucherPreviewModal] = useState(false);
    const [showBankScheduleModal, setShowBankScheduleModal] = useState(false);
    const [showRecordExpenseModal, setShowRecordExpenseModal] = useState(false);
    const [scheduleChequeNumber, setScheduleChequeNumber] = useState('');
    const [scheduleSourceBankId, setScheduleSourceBankId] = useState('');
    const [schedulePeriod, setSchedulePeriod] = useState('');
    const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
    const [scheduleStaffAccounts, setScheduleStaffAccounts] = useState<any[]>([]);

    useEffect(() => {
        if (showBankScheduleModal) {
            const currentPeriod = schedulePeriod || (props.payrollRecords && props.payrollRecords[0]?.period) || '';
            const currentRecords = (props.payrollRecords || []).filter(r => r.period === currentPeriod || r.payPeriod === currentPeriod);
            const mapped = currentRecords.map(r => {
                const u = (props.users || []).find(user => user.id === r.staffId || user.name === r.staffName);
                return {
                    payrollId: r.id,
                    staffId: r.staffId,
                    staffName: r.staffName || u?.name || 'Unknown Staff',
                    netPay: r.netPay || r.netSalary || 0,
                    bankName: u?.metadata?.bankName || 'Equity Bank',
                    bankBranch: u?.metadata?.bankBranch || 'Main Branch',
                    accountNumber: u?.metadata?.bankAccountNumber || '1234567890'
                };
            });
            
            if (mapped.length === 0 && props.users) {
                const staffUsers = props.users.filter(u => ['teacher', 'staff', 'admin', 'lecturer'].includes(u.role));
                const fallbackMapped = staffUsers.map((u, i) => ({
                    payrollId: `man_${Date.now()}_${i}`,
                    staffId: u.id,
                    staffName: u.name,
                    netPay: 0,
                    bankName: u.metadata?.bankName || 'Equity Bank',
                    bankBranch: u.metadata?.bankBranch || 'Main Branch',
                    accountNumber: u.metadata?.bankAccountNumber || '1234567890'
                }));
                setScheduleStaffAccounts(fallbackMapped);
            } else {
                setScheduleStaffAccounts(mapped);
            }
        }
    }, [showBankScheduleModal, schedulePeriod, props.payrollRecords, props.users]);

    const approvalOfficers = useMemo(() => {
        return (props.users || []).filter(u => u.role !== 'student' && u.role !== 'parent' && u.role !== 'customer' && u.role !== 'lead');
    }, [props.users]);

    const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isSignatureDrawing, setIsSignatureDrawing] = useState(false);
    const [isSignatureSigned, setIsSignatureSigned] = useState(false);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

    const startSignatureDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';

        const rect = canvas.getBoundingClientRect();
        let clientX = 'touches' in e ? (e as React.TouchEvent<HTMLCanvasElement>).touches[0].clientX : (e as React.MouseEvent<HTMLCanvasElement>).clientX;
        let clientY = 'touches' in e ? (e as React.TouchEvent<HTMLCanvasElement>).touches[0].clientY : (e as React.MouseEvent<HTMLCanvasElement>).clientY;

        const x = ((clientX - rect.left) / rect.width) * canvas.width;
        const y = ((clientY - rect.top) / rect.height) * canvas.height;

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsSignatureDrawing(true);
        e.preventDefault();
    };

    const drawSignature = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isSignatureDrawing) return;
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let clientX = 'touches' in e ? (e as React.TouchEvent<HTMLCanvasElement>).touches[0].clientX : (e as React.MouseEvent<HTMLCanvasElement>).clientX;
        let clientY = 'touches' in e ? (e as React.TouchEvent<HTMLCanvasElement>).touches[0].clientY : (e as React.MouseEvent<HTMLCanvasElement>).clientY;

        const x = ((clientX - rect.left) / rect.width) * canvas.width;
        const y = ((clientY - rect.top) / rect.height) * canvas.height;

        ctx.lineTo(x, y);
        ctx.stroke();
        setIsSignatureSigned(true);
        e.preventDefault();
    };

    const stopSignatureDrawing = () => {
        if (!isSignatureDrawing) return;
        setIsSignatureDrawing(false);
        const canvas = signatureCanvasRef.current;
        if (canvas) {
            setSignatureDataUrl(canvas.toDataURL());
        }
    };

    const clearSignatureCanvas = () => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsSignatureSigned(false);
        setSignatureDataUrl(null);
    };

    const studentPendingInvoices = useMemo(() => {
        const selectedId = showPostModal ? manualPayStudentId : reconcileStudentId;
        if (!selectedId) return [];
        const regularInvoices = mappedInvoices.filter(inv => inv.studentId === selectedId && inv.status !== 'paid');

        // Inject a synthetic "Opening Balance" invoice if the student has one
        const studentData = studentFinanceData.find(s => s.id === selectedId);
        const openingBal = studentData?.totals?.openingBalance ?? 0;
        if (openingBal > 0) {
            const receiptsPaidToOpening = (props.receipts || []).filter((r: any) => {
                const belongsToStudent = r.studentId === selectedId;
                const invId = r.invoiceId || r.invoice_id;
                const isOpeningBalReceipt = !invId || invId.startsWith('__opening_balance__');
                return belongsToStudent && isOpeningBalReceipt;
            }).reduce((sum: number, r: any) => {
                let allocated = Number(r.amountPaid || 0);
                if (r.allocations) {
                    try {
                        const allocs = typeof r.allocations === 'string' ? JSON.parse(r.allocations) : r.allocations;
                        if (Array.isArray(allocs)) {
                            const openingAlloc = allocs.find((a: any) => a.invoiceNumber === 'Opening Balance' || a.description === 'Arrears');
                            if (openingAlloc) allocated = Number(openingAlloc.amount || 0);
                        }
                    } catch (e) {}
                }
                return sum + allocated;
            }, 0);
            const openingBalanceRemaining = Math.max(0, openingBal - receiptsPaidToOpening);
            if (openingBalanceRemaining > 0) {
                const syntheticEntry: any = {
                    id: `__opening_balance__${selectedId}`,
                    studentId: selectedId,
                    invoiceNumber: 'Opening Balance',
                    description: 'Brought Forward Opening Balance',
                    totalAmount: openingBalanceRemaining,
                    status: 'pending',
                    isOpeningBalance: true,
                };
                return [syntheticEntry, ...regularInvoices];
            }
        }
        return regularInvoices;
    }, [props.invoices, props.receipts, studentFinanceData, manualPayStudentId, reconcileStudentId, showPostModal]);

    useEffect(() => {
        if (studentPendingInvoices && studentPendingInvoices.length > 0) {
            const firstPending = studentPendingInvoices.find(inv => inv.status === 'pending' || inv.status === 'partial') || studentPendingInvoices[0];
            if (firstPending) {
                if (showPostModal) {
                    setManualPayInvoiceId(firstPending.id);
                    setManualPayAmount(firstPending.totalAmount);
                } else if (showReconcileModal) {
                    // Don't auto-select opening balance synthetic entry for reconcile
                    if (!(firstPending as any).isOpeningBalance) {
                        setReconcileInvoiceId(firstPending.id);
                    }
                }
            }
        } else {
            if (showPostModal) {
                setManualPayInvoiceId('');
                setManualPayAmount(0);
            } else if (showReconcileModal) {
                setReconcileInvoiceId('');
            }
        }
    }, [studentPendingInvoices, showPostModal, showReconcileModal]);

    const manualFilteredStudents = useMemo(() => {
        if (!manualPayStudentSearch || manualPayStudentId) return [];
        return studentFinanceData.filter(s =>
            s.name?.toLowerCase().includes(manualPayStudentSearch.toLowerCase()) ||
            (s.admissionNumber || '').toLowerCase().includes(manualPayStudentSearch.toLowerCase())
        );
    }, [manualPayStudentSearch, manualPayStudentId, studentFinanceData]);

    const previewAllocations = useMemo(() => {
        if (!manualPayStudentId || manualPayAmount <= 0) return [];
        
        const amountPaidNum = Number(manualPayAmount);
        
        const selectedInvoice = studentPendingInvoices.find(inv => inv.id === manualPayInvoiceId);
        const isTargetingOpeningBalance = selectedInvoice?.isOpeningBalance || manualPayInvoiceId?.startsWith('__opening_balance__');
        
        let remainingAmount = amountPaidNum;
        const allocations: Array<{
            invoiceNumber: string;
            description: string;
            amount: number;
        }> = [];

        if (isTargetingOpeningBalance && selectedInvoice) {
            const allocatedToOpening = Math.min(remainingAmount, selectedInvoice.totalAmount);
            if (allocatedToOpening > 0) {
                allocations.push({
                    invoiceNumber: 'Opening Balance',
                    description: 'Brought Forward Opening Balance (Arrears)',
                    amount: allocatedToOpening
                });
                remainingAmount -= allocatedToOpening;
            }
        }

        if (remainingAmount > 0) {
            const studentInvoices = props.invoices.filter((inv: any) => 
                inv.studentId === manualPayStudentId && 
                inv.status !== 'cancelled' && 
                inv.status !== 'quote'
            );
            
            const invoicePaidAmounts: Record<string, number> = {};
            (props.receipts || []).forEach((rec: any) => {
                const invId = rec.invoiceId || rec.invoice_id;
                if (invId) {
                    invoicePaidAmounts[invId] = (invoicePaidAmounts[invId] || 0) + Number(rec.amountPaid || 0);
                }
            });
            
            const unpaidInvoices = studentInvoices.filter((inv: any) => {
                const paid = invoicePaidAmounts[inv.id] || 0;
                return paid < inv.totalAmount;
            });
            
            const sortedInvoices = [...unpaidInvoices].sort((a: any, b: any) => {
                if (manualPayInvoiceId && !isTargetingOpeningBalance) {
                    if (a.id === manualPayInvoiceId) return -1;
                    if (b.id === manualPayInvoiceId) return 1;
                }
                const dateA = new Date(a.issueDate || a.issue_date || 0).getTime();
                const dateB = new Date(b.issueDate || b.issue_date || 0).getTime();
                return dateA - dateB;
            });
            
            for (const inv of sortedInvoices) {
                if (remainingAmount <= 0) break;
                
                let items: any[] = [];
                if (typeof inv.items === 'string') {
                    try { items = JSON.parse(inv.items); } catch(e) {}
                } else if (Array.isArray(inv.items)) {
                    items = inv.items;
                }
                
                const sortedItems = [...items].sort((a: any, b: any) => {
                    const prioA = a.priority !== undefined ? Number(a.priority) : 99;
                    const prioB = b.priority !== undefined ? Number(b.priority) : 99;
                    return prioA - prioB;
                });
                
                for (const item of sortedItems) {
                    if (remainingAmount <= 0) break;
                    
                    const itemTotal = Number(item.amount || item.unitPrice || 0);
                    const itemPaid = Number(item.paid || 0);
                    const itemRemaining = Math.max(0, itemTotal - itemPaid);
                    
                    if (itemRemaining > 0) {
                        const allocated = Math.min(remainingAmount, itemRemaining);
                        remainingAmount -= allocated;
                        
                        allocations.push({
                            invoiceNumber: inv.invoiceNumber || (inv as any).invoice_number || 'INV',
                            description: item.description || 'Fee Item',
                            amount: allocated
                        });
                    }
                }
            }
        }

        if (remainingAmount > 0) {
            allocations.push({
                invoiceNumber: 'Prepayment',
                description: 'Prepayment / Credit Balance',
                amount: remainingAmount
            });
        }
        
        return allocations;
    }, [manualPayStudentId, manualPayInvoiceId, manualPayAmount, props.invoices, props.receipts, studentPendingInvoices]);

    useEffect(() => {
        if (!showPostModal) {
            setManualPayStudentSearch('');
            setManualPayStudentId('');
            setManualPayInvoiceId('');
            setManualPayAmount(0);
            setManualPayReference('');
            setManualPayBankAccountId('');
        }
    }, [showPostModal]);

    const filteredReceipts = useMemo(() => {
        const query = searchReceiptQuery.toLowerCase();
        return mappedReceipts.filter(rec => {
            // Determine if the receipt belongs to the current tab
            const isStudentFee = !!rec.studentId;
            if (receiptsMainTab === 'student_fees' && !isStudentFee) return false;
            if (receiptsMainTab === 'other_income' && isStudentFee) return false;

            const student = rec.studentId ? props.students.find(s => s.id === rec.studentId) : null;
            
            // Standard matches
            const matchesReceiptNumber = (rec.receiptNumber || '').toLowerCase().includes(query);
            const matchesRef = (rec.relatedTransactionId || '').toLowerCase().includes(query);
            
            let matchesQuery = matchesReceiptNumber || matchesRef;

            if (receiptsMainTab === 'student_fees') {
                const matchesStudentName = (student?.name || '').toLowerCase().includes(query);
                matchesQuery = matchesQuery || matchesStudentName;
            } else {
                const matchesPaidFor = (rec.paidFor || '').toLowerCase().includes(query);
                matchesQuery = matchesQuery || matchesPaidFor;
            }
            
            const matchesSource = 
                receiptSourceFilter === 'All' ||
                rec.paymentMethod === receiptSourceFilter;

            return matchesQuery && matchesSource;
        });
    }, [props.receipts, searchReceiptQuery, receiptSourceFilter, props.students, receiptsMainTab]);

    const [receiptCurrentPage, setReceiptCurrentPage] = useState(1);

    const paginatedReceipts = useMemo(() => {
        const startIndex = (receiptCurrentPage - 1) * 10;
        return filteredReceipts.slice(startIndex, startIndex + 10);
    }, [filteredReceipts, receiptCurrentPage]);

    const totalReceiptPages = Math.ceil(filteredReceipts.length / 10) || 1;

    useEffect(() => {
        setReceiptCurrentPage(1);
    }, [searchReceiptQuery, receiptSourceFilter]);

    // Invoices filtering and pagination
    const filteredStudentInvoices = useMemo(() => {
        return mappedInvoices.filter((inv: any) => {
            const studentId = inv.studentId || inv.student_id;
            const student = studentId ? studentFinanceData.find(s => s.id === studentId) : null;
            const adm = student?.admissionNumber || student?.admission_number || '—';
            const sName = student?.name || 'Unknown Student';
            const sClass = student ? studentClassGroup(student) : '—';
            const invNo = inv.invoiceNumber || inv.invoice_number || '—';

            let matchesQuery = true;
            if (searchInvoiceQuery) {
                const query = searchInvoiceQuery.toLowerCase();
                matchesQuery = 
                    invNo.toLowerCase().includes(query) ||
                    sName.toLowerCase().includes(query) ||
                    adm.toLowerCase().includes(query);
            }

            let matchesStatus = true;
            if (invoiceStatusFilter !== 'All') {
                matchesStatus = String(inv.status).toLowerCase() === invoiceStatusFilter.toLowerCase();
            }

            let matchesClass = true;
            if (invoiceClassFilter !== 'All') {
                matchesClass = sClass === invoiceClassFilter;
            }

            return matchesQuery && matchesStatus && matchesClass;
        });
    }, [mappedInvoices, studentFinanceData, searchInvoiceQuery, invoiceStatusFilter, invoiceClassFilter]);

    const [invoiceCurrentPage, setInvoiceCurrentPage] = useState(1);

    const paginatedStudentInvoices = useMemo(() => {
        const startIndex = (invoiceCurrentPage - 1) * 10;
        return filteredStudentInvoices.slice(startIndex, startIndex + 10);
    }, [filteredStudentInvoices, invoiceCurrentPage]);

    const totalInvoicePages = Math.ceil(filteredStudentInvoices.length / 10) || 1;

    useEffect(() => {
        setInvoiceCurrentPage(1);
    }, [searchInvoiceQuery, invoiceStatusFilter, invoiceClassFilter]);

    const fetchBankFeeds = async () => {
        try {
            setLoadingFeeds(true);
            const feeds = await apiService.fetchModuleRecords('mpesa_transactions', props.institution.id);
            setUnreconciledFeeds((feeds || []).filter((f: any) => f.status === 'pending'));
        } catch (e) {
            console.error("Failed to load bank feeds:", e);
        } finally {
            setLoadingFeeds(false);
        }
    };

    useEffect(() => {
        if (showPostModal && props.institution?.id) {
            apiService.fetchModuleRecords('finance_numbering_configs', props.institution.id)
                .then((configs: any[]) => {
                    const rConfig = configs.find(c => c.documentType === 'receipt' || c.document_type === 'receipt');
                    const nextNum = rConfig ? Number(rConfig.nextNumber || rConfig.next_number || 1001) : 1001;
                    const prefix = rConfig?.prefix || 'REC-';
                    setNextReceiptNumber(`${prefix}${nextNum}`);
                })
                .catch(() => {
                    setNextReceiptNumber('');
                });
        }
    }, [showPostModal, props.institution?.id]);

    useEffect(() => {
        if (activeTab === 'receipts') {
            fetchBankFeeds();
        }
    }, [activeTab]);

    const handlePostManualPayment = async () => {
        if (!manualPayStudentId || manualPayAmount <= 0) {
            alert("Please select a student and enter a valid payment amount.");
            return;
        }
        setIsSavingManualPay(true);
        try {
            const selectedInvoice = studentPendingInvoices.find(inv => inv.id === manualPayInvoiceId);
            const openingBalRemaining = selectedInvoice?.isOpeningBalance ? selectedInvoice.totalAmount : undefined;

            const { receiptNumber } = await apiService.postStudentPayment({
                studentId: manualPayStudentId,
                amount: Number(manualPayAmount),
                paymentMethod: manualPayMethod,
                reference: manualPayReference || '',
                paymentDate: manualPayDate || new Date().toISOString().split('T')[0],
                institutionId: props.institution.id,
                targetInvoiceId: manualPayInvoiceId || undefined,
                bankAccountId: manualPayBankAccountId || undefined,
                customReceiptNumber: useCustomReceiptNumber ? customReceiptNumber : undefined,
                openingBalanceRemaining: openingBalRemaining
            });

            if (props.onRefreshData) {
                await props.onRefreshData();
            }

            alert(`Receipt ${receiptNumber} generated and payment allocated successfully!`);

            setManualPayStudentId('');
            setManualPayStudentSearch('');
            setManualPayInvoiceId('');
            setManualPayAmount(0);
            setManualPayReference('');
            setManualPayBankAccountId('');
            setManualPayDate(new Date().toISOString().split('T')[0]);
            setUseCustomReceiptNumber(false);
            setCustomReceiptNumber('');
            setShowPostModal(false);
        } catch (e: any) {
            alert("Failed to post receipt: " + (e.message || e));
        } finally {
            setIsSavingManualPay(false);
        }
    };

    const handlePostBankTransfer = async () => {
        if (!bankTransferSourceId || !bankTransferDestId || bankTransferAmount <= 0) {
            alert("Please select source and destination bank accounts, and a valid amount.");
            return;
        }
        if (bankTransferSourceId === bankTransferDestId) {
            alert("Source and destination bank accounts cannot be the same.");
            return;
        }
        setIsSavingBankTransfer(true);
        try {
            const payload = {
                id: `bt_${Date.now()}`,
                institutionId: props.institution.id,
                sourceBankAccountId: bankTransferSourceId,
                destinationBankAccountId: bankTransferDestId,
                amount: Number(bankTransferAmount),
                transferDate: bankTransferDate || new Date().toISOString().split('T')[0],
                referenceNumber: bankTransferRef || '',
                notes: bankTransferNotes || ''
            };
            await apiService.saveModuleRecord('inter_bank_transfers', payload);
            alert("Inter-bank transfer posted successfully!");
            
            setBankTransferSourceId('');
            setBankTransferDestId('');
            setBankTransferAmount(0);
            setBankTransferRef('');
            setBankTransferNotes('');

            fetchBankTransfers();
            fetchBankAccounts();
        } catch (e: any) {
            alert("Failed to post bank transfer: " + (e.message || e));
        } finally {
            setIsSavingBankTransfer(false);
        }
    };

    const handlePostVoteTransfer = async () => {
        if (!voteTransferSourceId || !voteTransferDestId || voteTransferAmount <= 0) {
            alert("Please select source and destination vote heads, and a valid amount.");
            return;
        }
        if (voteTransferSourceId === voteTransferDestId) {
            alert("Source and destination vote heads cannot be the same.");
            return;
        }
        
        const sourceVH = (props.voteHeads || []).find(vh => vh.id === voteTransferSourceId);
        const destVH = (props.voteHeads || []).find(vh => vh.id === voteTransferDestId);

        if (!sourceVH || !destVH) {
            alert("Could not locate the selected vote heads.");
            return;
        }

        const currentSourceBudget = Number(sourceVH.allocatedAmount || (sourceVH as any).allocated_amount || 0);
        if (currentSourceBudget < voteTransferAmount) {
            alert(`Insufficient budget in source vote head "${sourceVH.name}". Current budget is KES ${currentSourceBudget.toLocaleString()}.`);
            return;
        }

        setIsSavingVoteTransfer(true);
        try {
            const payload = {
                id: `vt_${Date.now()}`,
                institutionId: props.institution.id,
                sourceVoteHeadId: voteTransferSourceId,
                destinationVoteHeadId: voteTransferDestId,
                amount: Number(voteTransferAmount),
                transferDate: voteTransferDate || new Date().toISOString().split('T')[0],
                referenceNumber: voteTransferRef || '',
                notes: voteTransferNotes || ''
            };
            await apiService.saveModuleRecord('inter_vote_transfers', payload);

            const updatedSource = {
                ...sourceVH,
                allocatedAmount: currentSourceBudget - Number(voteTransferAmount),
                allocated_amount: currentSourceBudget - Number(voteTransferAmount),
                institutionId: props.institution.id
            };
            const updatedDest = {
                ...destVH,
                allocatedAmount: Number(destVH.allocatedAmount || (destVH as any).allocated_amount || 0) + Number(voteTransferAmount),
                allocated_amount: Number(destVH.allocatedAmount || (destVH as any).allocated_amount || 0) + Number(voteTransferAmount),
                institutionId: props.institution.id
            };

            await apiService.saveModuleRecord('vote_heads', updatedSource);
            await apiService.saveModuleRecord('vote_heads', updatedDest);

            alert("Inter-vote budget transfer completed successfully!");

            setVoteTransferSourceId('');
            setVoteTransferDestId('');
            setVoteTransferAmount(0);
            setVoteTransferRef('');
            setVoteTransferNotes('');

            fetchVoteTransfers();
            if (props.onRefreshData) {
                await props.onRefreshData();
            }
        } catch (e: any) {
            alert("Failed to complete vote transfer: " + (e.message || e));
        } finally {
            setIsSavingVoteTransfer(false);
        }
    };

    const handlePostOtherIncome = async () => {
        if (!otherIncomePayer || otherIncomeAmount <= 0) {
            alert("Please enter a valid payer and amount.");
            return;
        }
        setIsSavingOtherIncome(true);
        try {
            const instId = props.institution.id;
            const receiptNumber = await apiService.getNextDocumentNumber(instId, 'receipt');

            const formattedPaidFor = `${otherIncomeCategory} - ${otherIncomeDescription || 'Miscellaneous Income'} (From ${otherIncomePayer})`;
            
            await apiService.saveModuleRecord('receipts', {
                amountPaid: Number(otherIncomeAmount),
                paymentMethod: otherIncomeMethod,
                relatedTransactionId: otherIncomeReference || '',
                paymentDate: otherIncomeDate || new Date().toISOString().split('T')[0],
                institutionId: instId,
                paidFor: formattedPaidFor,
                receiptNumber: receiptNumber
            });

            if (props.onRefreshData) {
                await props.onRefreshData();
            }

            alert("Other income received and recorded successfully!");

            setOtherIncomePayer('');
            setOtherIncomeAmount(0);
            setOtherIncomeReference('');
            setOtherIncomeDescription('');
            setOtherIncomeCategory('Bus Hiring');
            setShowOtherIncomeModal(false);
        } catch (e: any) {
            alert("Failed to post other income: " + (e.message || e));
        } finally {
            setIsSavingOtherIncome(false);
        }
    };

    const handleAddExpense = async () => {
        if (expAmount <= 0 || !expDescription) {
            alert("Please enter a valid amount and description.");
            return;
        }
        setIsSavingExpense(true);
        try {
            const instId = props.institution.id;
            let referenceNumber = `PV-${Date.now().toString().slice(-6)}`;

            // Look up payment voucher config
            try {
                const configs = await apiService.fetchModuleRecords<any>('finance_numbering_configs', instId);
                const pvConfig = configs.find(c => c.documentType === 'payment_voucher' || c.document_type === 'payment_voucher');
                if (pvConfig) {
                    const nextNum = Number(pvConfig.nextNumber || pvConfig.next_number || 1001);
                    const prefix = pvConfig.prefix || 'PV-';
                    referenceNumber = `${prefix}${nextNum}`;

                    // Increment
                    await apiService.updateModuleRecord('finance_numbering_configs', pvConfig.id, {
                        ...pvConfig,
                        nextNumber: nextNum + 1,
                        next_number: nextNum + 1,
                        updatedAt: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.error("Failed to generate payment voucher number:", err);
            }

            const methodToSave = expReference ? `${expPaymentMethod} (${expReference})` : expPaymentMethod;
            const approverUser = approvalOfficers.find(u => u.id === expApprovedBy);
            const approverName = approverUser ? approverUser.name : expApprovedBy || 'Admin';

            await props.onAddExpense({
                id: `exp_${Date.now()}`,
                institutionId: instId,
                category: expCategory,
                amount: Number(expAmount),
                description: expDescription,
                date: expDate || new Date().toISOString().split('T')[0],
                referenceNumber: referenceNumber,
                status: 'paid',
                voteHeadId: expVoteHeadId || undefined,
                bankAccountId: expBankAccountId || undefined,
                payeeName: expPayee || undefined,
                approvedBy: approverName || undefined,
                paymentMethod: methodToSave,
                recordedBy: expPreparedBy || props.currentUser?.name || 'Accountant',
                signatureData: signatureDataUrl || undefined
            });

            // Trigger notification to the approving person
            if (expApprovedBy) {
                try {
                    await apiService.createNotification(
                        expApprovedBy,
                        `New Payment Voucher pending approval: ${referenceNumber} for KSh ${expAmount.toLocaleString()} (${expDescription})`,
                        'warning'
                    );
                } catch (notiErr) {
                    console.error("Failed to send approval notification:", notiErr);
                }
            }

            alert(`Expense recorded successfully with Payment Voucher Reference: ${referenceNumber}`);
            setExpAmount(0);
            setExpDescription('');
            setExpVoteHeadId('');
            setExpBankAccountId('');
            setExpPaymentMethod('Cash');
            setExpPayee('');
            setExpReference('');
            setExpDate(new Date().toISOString().split('T')[0]);
            setExpApprovedBy('');
            clearSignatureCanvas();
            
            if (props.onRefreshData) {
                await props.onRefreshData();
            }
        } catch (e: any) {
            alert("Failed to save expense: " + (e.message || e));
        } finally {
            setIsSavingExpense(false);
        }
    };

    const handleReconcileBankFeed = async () => {
        if (!selectedFeedTx || !reconcileStudentId || !reconcileInvoiceId) {
            alert("Please select a student and target invoice.");
            return;
        }
        setIsReconciling(true);
        try {
            const updatedTx = {
                ...selectedFeedTx,
                status: 'reconciled',
                metadata: JSON.stringify({
                    studentId: reconcileStudentId,
                    invoiceId: reconcileInvoiceId
                })
            };

            await apiService.saveModuleRecord('mpesa_transactions', updatedTx);
            await apiService.reconcilePayment(updatedTx);

            if (props.onRefreshData) {
                await props.onRefreshData();
            }

            await fetchBankFeeds();

            alert("Bank feed transaction reconciled and receipt generated successfully!");

            setReconcileStudentId('');
            setReconcileInvoiceId('');
            setSelectedFeedTx(null);
            setShowReconcileModal(false);
        } catch (e: any) {
            alert("Failed to reconcile bank feed: " + (e.message || e));
        } finally {
            setIsReconciling(false);
        }
    };

    const handleDownloadReceipt = async (receipt: Receipt) => {
        try {
            let relatedTx = null;
            if (receipt.relatedTransactionId) {
                relatedTx = {
                    transactionId: receipt.relatedTransactionId,
                    amount: receipt.amountPaid,
                    provider: receipt.paymentMethod,
                    description: receipt.paidFor || 'Fees Payment'
                } as any;
            }
            await pdfService.downloadReceiptPdf(
                receipt,
                relatedTx,
                props.institution,
                props.companyDetails || {} as any,
                props.institution.logoUrl || null
            );
        } catch (err: any) {
            alert("Failed to generate PDF: " + (err.message || err));
        }
    };

    // Education Fee Config Sub-tab State
    const [configSubTab, setConfigSubTab] = useState<'voteheads' | 'builder'>('voteheads');

    // Voteheads Setup States
    const [newVoteName, setNewVoteName] = useState('');
    const [newVotePriority, setNewVotePriority] = useState(1);
    const [newVoteAllocatedAmount, setNewVoteAllocatedAmount] = useState(0);
    const [editingVoteheadId, setEditingVoteheadId] = useState<string | null>(null);
    const [editVoteName, setEditVoteName] = useState('');
    const [editVotePriority, setEditVotePriority] = useState(1);
    const [editVoteAllocatedAmount, setEditVoteAllocatedAmount] = useState(0);

    // Fee Structure Builder States
    const [builderCourseId, setBuilderCourseId] = useState('');
    const [builderAYId, setBuilderAYId] = useState('');

    // Spreadsheet-like states
    const [spreadsheetAmounts, setSpreadsheetAmounts] = useState<Record<string, Record<string, number>>>({});
    const [spreadsheetTargets, setSpreadsheetTargets] = useState<Record<string, 'all' | 'boarder' | 'day_scholar'>>({});

    // When builderCourseId or builderAYId changes, load existing structures
    useEffect(() => {
        if (builderCourseId && builderAYId && props.feeStructures) {
            const newAmounts: Record<string, Record<string, number>> = {};
            const newTargets: Record<string, 'all' | 'boarder' | 'day_scholar'> = {};

            // Initialize all voteheads with 0 for each semester/term
            (props.voteHeads || []).forEach(vh => {
                newAmounts[vh.id] = {};
                (props.semesters || []).forEach(sem => {
                    newAmounts[vh.id][sem.id] = 0;
                });
                newTargets[vh.id] = 'all';
            });

            // Populate with existing database records
            props.feeStructures.forEach(fs => {
                if (fs.courseId === builderCourseId && fs.academicYearId === builderAYId) {
                    if (fs.voteHeadId) {
                        if (!newAmounts[fs.voteHeadId]) {
                            newAmounts[fs.voteHeadId] = {};
                        }
                        // Match by term string or term/semester ID
                        const matchedSem = (props.semesters || []).find(s => s.id === fs.term || s.name === fs.term);
                        if (matchedSem) {
                            newAmounts[fs.voteHeadId][matchedSem.id] = fs.amount || (fs as any).allocatedAmount || 0;
                        }
                        if (fs.applicableTo || fs.applicable_to) {
                            newTargets[fs.voteHeadId] = (fs.applicableTo || fs.applicable_to) as any;
                        }
                    }
                }
            });

            setSpreadsheetAmounts(newAmounts);
            setSpreadsheetTargets(newTargets);
        }
    }, [builderCourseId, builderAYId, props.feeStructures, props.voteHeads, props.semesters]);

    const getTermTotal = (semId: string) => {
        let total = 0;
        Object.keys(spreadsheetAmounts).forEach(vhId => {
            total += spreadsheetAmounts[vhId]?.[semId] || 0;
        });
        return total;
    };

    const getYearlyTotal = () => {
        let total = 0;
        (props.semesters || []).forEach(sem => {
            total += getTermTotal(sem.id);
        });
        return total;
    };

    useEffect(() => {
        const instId = props.institution.id;
        apiService.fetchModuleRecords<any>('retail_stores', instId)
            .then(res => setRetailStores(res || []))
            .catch(err => console.error("Failed to load stores for finance:", err));
        Promise.all([
            apiService.fetchModuleRecords<any>('inventory', instId).catch(() => []),
            apiService.fetchModuleRecords<any>('retail_inventory_items', instId).catch(() => [])
        ])
        .then(([genInv, retInv]) => setInventory([...(genInv || []), ...(retInv || [])]))
            .catch(err => console.error("Failed to load inventory for finance:", err));
        apiService.fetchModuleRecords<any>('users', instId)
            .then(res => setAllUsers(res || []))
            .catch(err => console.error("Failed to load users for finance:", err));
    }, [props.institution.id]);

    // Retrieve DS records if institutionType === 'Driving School'
    useEffect(() => {
        if (isDrivingSchool) {
            const instId = props.institution.id;
            apiService.fetchModuleRecords<any>('ds_invoices', instId)
                .then(res => setDsInvoices(res || []))
                .catch(err => console.error("Failed to load ds_invoices:", err));
            apiService.fetchModuleRecords<any>('ds_payments', instId)
                .then(res => setDsPayments(res || []))
                .catch(err => console.error("Failed to load ds_payments:", err));
            apiService.fetchModuleRecords<any>('ds_settings', instId)
                .then(res => {
                    if (res && res.length > 0) setDsSettings(res[0]);
                })
                .catch(err => console.error("Failed to load ds_settings:", err));
            apiService.fetchModuleRecords<any>('ds_fee_structures', instId)
                .then(res => setDsFeeStructures(res || []))
                .catch(err => console.error("Failed to load ds_fee_structures:", err));
        }
    }, [props.institution.id, isDrivingSchool]);

    // Retrieve NG-CDF Bursary records
    useEffect(() => {
        const instId = props.institution.id;
        apiService.fetchModuleRecords<any>('ng_cdf_bursaries', instId)
            .then(res => setBursaryRecords(res || []))
            .catch(err => console.error("Failed to load ng_cdf_bursaries:", err));
        
        // Self-heal: ensure bank account integration columns, transfers tables and GoK Capitation log tables exist on the database
        apiService.runMigration(`
            ALTER TABLE public.school_bank_accounts ADD COLUMN IF NOT EXISTS integration_service TEXT DEFAULT 'None';
            ALTER TABLE public.school_bank_accounts ADD COLUMN IF NOT EXISTS integration_status TEXT DEFAULT 'Not Configured';

            CREATE TABLE IF NOT EXISTS public.inter_bank_transfers (
                id TEXT PRIMARY KEY,
                institution_id TEXT NOT NULL,
                source_bank_account_id TEXT NOT NULL,
                destination_bank_account_id TEXT NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                transfer_date DATE NOT NULL,
                reference_number TEXT,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS public.inter_vote_transfers (
                id TEXT PRIMARY KEY,
                institution_id TEXT NOT NULL,
                source_vote_head_id TEXT NOT NULL,
                destination_vote_head_id TEXT NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                transfer_date DATE NOT NULL,
                reference_number TEXT,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS public.gok_capitation_logs (
                id TEXT PRIMARY KEY,
                institution_id TEXT NOT NULL,
                enrolment_count INTEGER NOT NULL,
                disbursement_rate DECIMAL(15, 2) NOT NULL,
                sne_count INTEGER DEFAULT 0,
                sne_rate DECIMAL(15, 2) DEFAULT 0.00,
                tranche_name TEXT NOT NULL,
                tranche_percentage DECIMAL(5, 2) NOT NULL,
                reference_number TEXT,
                bank_account_id TEXT,
                total_received DECIMAL(15, 2) NOT NULL,
                simba_amount DECIMAL(15, 2) NOT NULL,
                gpa_amount DECIMAL(15, 2) NOT NULL,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            ALTER TABLE public.inter_bank_transfers ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.inter_vote_transfers ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.gok_capitation_logs ENABLE ROW LEVEL SECURITY;

            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE tablename = 'inter_bank_transfers' AND policyname = 'Enable all access for authenticated users'
                ) THEN
                    CREATE POLICY "Enable all access for authenticated users" ON public.inter_bank_transfers FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE tablename = 'inter_vote_transfers' AND policyname = 'Enable all access for authenticated users'
                ) THEN
                    CREATE POLICY "Enable all access for authenticated users" ON public.inter_vote_transfers FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE tablename = 'gok_capitation_logs' AND policyname = 'Enable all access for authenticated users'
                ) THEN
                    CREATE POLICY "Enable all access for authenticated users" ON public.gok_capitation_logs FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
                END IF;
            END
            $$;

            GRANT ALL ON public.inter_bank_transfers TO anon, authenticated, service_role;
            GRANT ALL ON public.inter_vote_transfers TO anon, authenticated, service_role;
            GRANT ALL ON public.gok_capitation_logs TO anon, authenticated, service_role;
        `).catch(err => console.warn("Self-healing school_bank_accounts/transfers/capitation schema failed:", err))
          .finally(() => {
              fetchBankAccounts();
          });
    }, [props.institution.id]);

    useEffect(() => {
        if (activeTab === 'settings') {
            if (settingsSubTab === 'accounts_grants') {
                fetchBankAccounts();
                fetchSchoolGrants();
            } else if (settingsSubTab === 'numbering') {
                fetchNumberingConfigs();
            } else if (settingsSubTab === 'grades_streams') {
                apiService.fetchModuleRecords<Course>('courses', props.institution.id)
                    .then(res => setLocalCourses(res || []))
                    .catch(err => console.error("Failed to load courses:", err));
            }
        }
    }, [activeTab, settingsSubTab, props.institution.id]);

    useEffect(() => {
        if (activeTab === 'transfers') {
            fetchBankTransfers();
            fetchVoteTransfers();
            fetchBankAccounts();
        }
    }, [activeTab, props.institution.id]);




    // Voteheads save handlers
    const handleSaveVoteHead = async (voteHead: Partial<VoteHead>) => {
        try {
            const payload = {
                id: voteHead.id || `vh_${Date.now()}`,
                name: voteHead.name,
                allocatedAmount: Number(voteHead.allocatedAmount) || 0,
                amountSpent: voteHead.amountSpent || 0,
                academicYearId: voteHead.academicYearId || '',
                priority: Number(voteHead.priority) || 10,
                institutionId: props.institution.id
            };
            await apiService.saveModuleRecord('vote_heads', payload);
            setNewVoteName('');
            setNewVotePriority(1);
            setNewVoteAllocatedAmount(0);
            setEditingVoteheadId(null);
            if (props.onRefreshData) {
                await props.onRefreshData();
            }
            alert("Vote head saved successfully!");
        } catch (e) {
            console.error("Failed to save votehead:", e);
            alert("Failed to save votehead.");
        }
    };

    const handleDeleteVoteHead = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this votehead?")) return;
        try {
            await apiService.deleteModuleRecord('vote_heads', id);
            if (props.onRefreshData) {
                await props.onRefreshData();
            }
            alert("Vote head deleted.");
        } catch (e) {
            console.error("Failed to delete votehead:", e);
            alert("Failed to delete votehead.");
        }
    };

    // Fee cohort saving
    const handleSaveFeeStructure = async () => {
        if (!builderCourseId || !builderAYId) {
            alert("Please select Course and Academic Year.");
            return;
        }
        try {
            // Find all existing records for this Course + Academic Year to clean up or update
            const existingList = props.feeStructures.filter(f =>
                f.courseId === builderCourseId &&
                f.academicYearId === builderAYId
            );

            // Construct all active entries
            const savePromises: Promise<any>[] = [];
            const activeKeys = new Set<string>(); // Keep track of (voteheadId_semName) that we are saving

            for (const vhId of Object.keys(spreadsheetAmounts)) {
                const matchedVoteHead = (props.voteHeads || []).find(v => v.id === vhId);
                const matchedName = matchedVoteHead ? matchedVoteHead.name : 'Fee Item';
                const matchedPriority = matchedVoteHead ? matchedVoteHead.priority : 10;
                const applicableTo = spreadsheetTargets[vhId] || 'all';

                for (const semId of Object.keys(spreadsheetAmounts[vhId])) {
                    const amount = spreadsheetAmounts[vhId][semId];
                    if (amount > 0) {
                        const matchedSem = (props.semesters || []).find(s => s.id === semId);
                        const semName = matchedSem ? matchedSem.name : semId;
                        
                        // Look up existing record to update
                        const existing = existingList.find(e => 
                            e.voteHeadId === vhId && 
                            (e.term === semId || e.term === semName)
                        );

                        const payload: any = {
                            id: existing ? existing.id : `fs_${Date.now()}_${Math.random().toString(36).substring(2,6)}`,
                            name: matchedName,
                            amount: amount,
                            allocatedAmount: amount,
                            academicYearId: builderAYId,
                            term: semName, // Save human-readable term name
                            courseId: builderCourseId,
                            voteHeadId: vhId,
                            priority: matchedPriority,
                            institutionId: props.institution.id,
                            applicableTo: applicableTo,
                            applicable_to: applicableTo
                        };
                        savePromises.push(apiService.saveModuleRecord('fee_structures', payload));
                        activeKeys.add(`${vhId}_${semName}`);
                    }
                }
            }

            await Promise.all(savePromises);

            // Delete any existing structures that were left out or set to 0
            const deletedStructures = existingList.filter(e => {
                if (!e.voteHeadId) return false;
                const key = `${e.voteHeadId}_${e.term}`;
                return !activeKeys.has(key);
            });
            await Promise.all(deletedStructures.map(d => apiService.deleteModuleRecord('fee_structures', d.id)));

            if (props.onRefreshData) {
                await props.onRefreshData();
            }
            alert("Fee structure cohort spreadsheet configuration saved successfully!");
        } catch (e) {
            console.error("Failed to save fee structure spreadsheet:", e);
            alert("Failed to save fee structure.");
        }
    };

    // Create DS Invoice Handler
    const handleCreateDsInvoice = async () => {
        if (!dsFormStudentId || !dsFormClass || dsFormItems.length === 0) {
            alert("Please select student, course/class, and add items.");
            return;
        }
        try {
            const instId = props.institution.id;
            let invoiceNumber = `DS-INV-${Date.now().toString().slice(-6)}`;
            try {
                const configs = await apiService.fetchModuleRecords<any>('finance_numbering_configs', instId);
                const invConfig = configs.find(c => c.documentType === 'invoice' || c.document_type === 'invoice');
                if (invConfig) {
                    const nextNum = Number(invConfig.nextNumber || invConfig.next_number || 1001);
                    const prefix = invConfig.prefix || 'INV-';
                    invoiceNumber = `${prefix}${nextNum}`;
                    
                    await apiService.updateModuleRecord('finance_numbering_configs', invConfig.id, {
                        ...invConfig,
                        nextNumber: nextNum + 1,
                        next_number: nextNum + 1,
                        updatedAt: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.error("Failed to generate custom invoice number:", err);
            }
            
            const student = props.students.find(s => s.id === dsFormStudentId);
            const studentName = student ? student.name : 'Unknown Student';
            
            const newInvoice = {
                id: `ds_inv_${Date.now()}`,
                institutionId: props.institution.id,
                studentId: dsFormStudentId,
                studentName: studentName,
                className: dsFormClass,
                items: dsFormItems.map(it => ({
                    name: it.name,
                    amount: Number(it.amount) || 0,
                    priority: Number(it.priority) || 10,
                    paidAmount: 0
                })),
                totalAmount: dsFormItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0),
                paidAmount: 0,
                balance: dsFormItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0),
                status: 'Pending',
                invoiceNumber: invoiceNumber,
                dueDate: dsFormDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                notes: dsFormNotes || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('ds_invoices', newInvoice);

            // Reload Local DS state
            const updated = await apiService.fetchModuleRecords<any>('ds_invoices', instId).catch(() => []);
            setDsInvoices(updated);

            if (props.onRefreshData) {
                await props.onRefreshData();
            }
            
            // Clean state
            setDsFormStudentId('');
            setDsFormClass('');
            setDsFormItems([]);
            setDsFormNotes('');
            setIsCreatingDsInvoice(false);
            alert(`DS Invoice ${invoiceNumber} generated!`);
        } catch (e) {
            console.error("Failed to create DS Invoice:", e);
            alert("Failed to save DS Invoice.");
        }
    };

    // Record DS Payment (Priority-Based Settlement)
    const handleRecordDsPayment = async () => {
        if (!selectedDsInvoice || dsPayAmount <= 0) {
            alert("Please enter a valid payment amount.");
            return;
        }
        try {
            const amountPaid = Number(dsPayAmount);
            const recNumber = `${(props.companyDetails?.globalReceiptPrefix || 'RCPT-').trim()}${Date.now().toString().slice(-6)}`;
            
            // Priority-based distribution Strategy
            let remainingAmount = amountPaid;
            const distributions: string[] = [];
            const sortedItems = [...(selectedDsInvoice.items || [])].sort((a, b) => (a.priority || 99) - (b.priority || 99));
            
            const updatedItems = sortedItems.map((item: any) => {
                const itemBalance = item.amount - (item.paidAmount || 0);
                if (remainingAmount <= 0) return item;
                
                const distribution = Math.min(remainingAmount, itemBalance);
                if (distribution > 0) {
                    distributions.push(`${item.name || item.voteName}: ${distribution?.toLocaleString()}`);
                }
                remainingAmount -= distribution;
                
                return {
                    ...item,
                    paidAmount: (item.paidAmount || 0) + distribution
                };
            });

            const newPaidAmount = (selectedDsInvoice.paidAmount || 0) + amountPaid;
            const newBalance = Math.max(0, selectedDsInvoice.totalAmount - newPaidAmount);
            const newStatus = newBalance <= 0 ? 'Fully Paid' : 'Partially Paid';

            const updatedInvoicePayload = {
                ...selectedDsInvoice,
                items: updatedItems,
                paidAmount: newPaidAmount,
                balance: newBalance,
                status: newStatus,
                updatedAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('ds_invoices', updatedInvoicePayload);

            const pay = {
                id: `pay_${Date.now()}`,
                institutionId: props.institution.id,
                invoiceId: selectedDsInvoice.id,
                studentId: selectedDsInvoice.studentId,
                studentName: selectedDsInvoice.studentName,
                amount: amountPaid,
                paymentMethod: dsPayMethod,
                transactionReference: dsPayReference || '',
                paymentDate: new Date().toISOString().split('T')[0],
                receiptNumber: recNumber,
                status: 'Verified',
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('ds_payments', pay);
            
            // Reload local DS Invoices/Payments state
            const instId = props.institution.id;
            const updatedInvoices = await apiService.fetchModuleRecords<any>('ds_invoices', instId).catch(() => []);
            const updatedPayments = await apiService.fetchModuleRecords<any>('ds_payments', instId).catch(() => []);
            
            setDsInvoices(updatedInvoices);
            setDsPayments(updatedPayments);
            setSelectedDsInvoice(updatedInvoices.find((i: any) => i.id === selectedDsInvoice.id) || null);
            
            if (props.onRefreshData) {
                await props.onRefreshData();
            }

            setIsRecordingDsPayment(false);
            setDsPayAmount(0);
            setDsPayReference('');
            alert(`DS Payment recorded successfully!\nDistributed settlements: ${distributions.join(', ')}`);
        } catch (err) {
            console.error("Failed to record DS payment:", err);
            alert("Database rejection recording DS payment.");
        }
    };

    // Filter students for search dropdown
    const filteredStudents = useMemo(() => {
        if (!bursaryStudentSearch || bursaryStudentId) return [];
        return studentFinanceData.filter(s => 
            s.name?.toLowerCase().includes(bursaryStudentSearch.toLowerCase()) ||
            (s.admissionNumber || '').toLowerCase().includes(bursaryStudentSearch.toLowerCase())
        );
    }, [bursaryStudentSearch, bursaryStudentId, studentFinanceData]);

    // Load bulk bursary disbursements on mount
    useEffect(() => {
        const instId = props.institution?.id;
        if (!instId) return;
        apiService.fetchModuleRecords<any>('bursary_disbursements', instId)
            .then(res => setBulkBursaryDisbursements(res || []))
            .catch(() => {});
    }, [props.institution?.id]);

    // Handle bulk bursary cheque disbursement
    const handleBulkBursaryDisburse = async () => {
        if (!bulkBursaryDonor.trim() || !bulkBursaryCheque.trim() || bulkBursaryTotalAmount <= 0 || bulkBursaryAllocations.length === 0) {
            alert('Please fill in donor name, cheque number, total amount, and add at least one student.');
            return;
        }
        const allocTotal = bulkBursaryAllocations.reduce((s, a) => s + a.amount, 0);
        if (allocTotal > bulkBursaryTotalAmount) {
            alert(`Allocated total (${allocTotal.toLocaleString()}) exceeds cheque amount (${bulkBursaryTotalAmount.toLocaleString()}). Please review allocations.`);
            return;
        }
        setIsSavingBulkBursary(true);
        try {
            const instId = props.institution.id;
            const batchId = `bursary_batch_${Date.now()}`;
            const dateStr = new Date().toISOString();
            // 1. Post individual receipts for each student
            for (const alloc of bulkBursaryAllocations) {
                if (!alloc.studentId || alloc.amount <= 0) continue;
                const receiptNumber = await apiService.getNextDocumentNumber(instId, 'receipt');
                const receipt = {
                    id: `rcpt_bursary_${Date.now()}_${alloc.studentId.slice(-4)}`,
                    receiptNumber: receiptNumber,
                    institutionId: instId,
                    studentId: alloc.studentId,
                    amountPaid: alloc.amount,
                    paymentMethod: 'Cheque',
                    relatedTransactionId: bulkBursaryCheque,
                    paymentDate: bulkBursaryDate,
                    paidFor: `Bursary from ${bulkBursaryDonor}`,
                    notes: bulkBursaryNotes,
                    bursaryBatchId: batchId,
                    bankAccountId: bulkBursaryBankAccountId || '',
                    bank_account_id: bulkBursaryBankAccountId || '',
                    createdAt: dateStr,
                };
                await apiService.saveModuleRecord('receipts', receipt);
            }
            // 2. Save the disbursement batch record (donor acknowledgement data)
            const disbursement = {
                id: batchId,
                institutionId: instId,
                donorName: bulkBursaryDonor,
                chequeNumber: bulkBursaryCheque,
                bankName: bulkBursaryBank,
                chequeDate: bulkBursaryDate,
                totalAmount: bulkBursaryTotalAmount,
                allocatedAmount: allocTotal,
                allocations: bulkBursaryAllocations,
                notes: bulkBursaryNotes,
                bankAccountId: bulkBursaryBankAccountId || '',
                bank_account_id: bulkBursaryBankAccountId || '',
                postedBy: props.currentUser?.name || 'Finance Officer',
                createdAt: dateStr,
            };
            await apiService.saveModuleRecord('bursary_disbursements', disbursement);
            // 3. Refresh
            if (props.onRefreshData) await props.onRefreshData();
            const updated = await apiService.fetchModuleRecords<any>('bursary_disbursements', instId).catch(() => []);
            setBulkBursaryDisbursements(updated);
            // 4. Reset form
            setBulkBursaryDonor('');
            setBulkBursaryCheque('');
            setBulkBursaryBank('');
            setBulkBursaryTotalAmount(0);
            setBulkBursaryAllocations([]);
            setBulkBursaryNotes('');
            setBulkBursaryBankAccountId('');
            setBulkBursarySuccess(`✓ Bursary cheque disbursed to ${bulkBursaryAllocations.length} student(s). Individual receipts posted.`);
            setTimeout(() => setBulkBursarySuccess(''), 6000);
        } catch (e) {
            console.error('Bulk bursary failed:', e);
            alert('Failed to post bursary disbursement. Please try again.');
        } finally {
            setIsSavingBulkBursary(false);
        }
    };

    // Record NG-CDF Bursary and clear student ledger
    const handlePostBursaryCheque = async () => {
        if (!bursaryStudentId || !bursaryConstituency || !bursaryAmount || !bursaryChequeNumber) {
            alert("Please search and select a student, enter constituency name, cheque reference, and amount.");
            return;
        }
        setIsSavingBursary(true);
        try {
            const student = props.students.find(s => s.id === bursaryStudentId);
            if (!student) {
                alert("Student not found.");
                setIsSavingBursary(false);
                return;
            }

            const amount = Number(bursaryAmount);
            const instId = props.institution.id;

            const receiptNumber = await apiService.getNextDocumentNumber(instId, 'receipt');

            // 1. Save standard receipt to student ledger
            const receipt = {
                id: `rcpt_bursary_${Date.now()}`,
                receiptNumber: receiptNumber,
                institutionId: instId,
                studentId: bursaryStudentId,
                amountPaid: amount,
                paymentMethod: 'Cheque',
                relatedTransactionId: bursaryChequeNumber,
                paymentDate: new Date().toISOString().split('T')[0],
                paidFor: `NG-CDF Bursary allocation (${bursaryConstituency})`,
                bankAccountId: bursaryBankAccountId || '',
                bank_account_id: bursaryBankAccountId || '',
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('receipts', receipt);

            // 2. Save NG-CDF Bursary record
            const bursary = {
                id: `bursary_${Date.now()}`,
                studentId: bursaryStudentId,
                studentName: student.name,
                institutionId: instId,
                institutionName: props.institution.name,
                constituencyName: bursaryConstituency,
                amountRequested: amount,
                amountApproved: amount,
                purpose: 'Academic Tuition Bursary',
                status: 'disbursed' as const,
                chequeNumber: bursaryChequeNumber,
                bankAccountId: bursaryBankAccountId || '',
                bank_account_id: bursaryBankAccountId || '',
                appliedAt: new Date().toISOString(),
                vettedAt: new Date().toISOString(),
                vettedBy: props.currentUser.name || 'Finance Officer',
                disbursedAt: new Date().toISOString(),
                notes: bursaryNotes || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('ng_cdf_bursaries', bursary);

            // Refresh parent state & local state
            if (props.onRefreshData) {
                await props.onRefreshData();
            }

            const updatedList = await apiService.fetchModuleRecords<any>('ng_cdf_bursaries', instId).catch(() => []);
            setBursaryRecords(updatedList);

            // Clear inputs
            setBursaryStudentId('');
            setBursaryStudentSearch('');
            setBursaryConstituency('');
            setBursaryAmount('');
            setBursaryChequeNumber('');
            setBursaryNotes('');
            setBursaryBankAccountId('');

            alert("Bursary cheque posted and allocated to student ledger successfully!");
        } catch (e) {
            console.error("Failed to post bursary cheque:", e);
            alert("Failed to save bursary cheque.");
        } finally {
            setIsSavingBursary(false);
        }
    };

    const handleInitiateBursaryApplication = async () => {
        if (!bursaryStudentId || !bursaryConstituency || !bursaryAmount) {
            alert("Please search and select a student, enter constituency name, and requested amount.");
            return;
        }
        setIsSavingBursary(true);
        try {
            const student = props.students.find(s => s.id === bursaryStudentId);
            if (!student) {
                alert("Student not found.");
                setIsSavingBursary(false);
                return;
            }

            const amount = Number(bursaryAmount);
            const instId = props.institution.id;

            const bursary = {
                id: `bursary_app_${Date.now()}`,
                studentId: bursaryStudentId,
                studentName: student.name,
                institutionId: instId,
                institutionName: props.institution.name,
                constituencyName: bursaryConstituency.trim(),
                amountRequested: amount,
                amountApproved: 0,
                purpose: bursaryNotes || 'Academic Tuition Bursary',
                status: 'pending' as const,
                chequeNumber: '',
                appliedAt: new Date().toISOString(),
                notes: bursaryNotes || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('ng_cdf_bursaries', bursary);

            // Refresh parent state & local state
            if (props.onRefreshData) {
                await props.onRefreshData();
            }

            const updatedList = await apiService.fetchModuleRecords<any>('ng_cdf_bursaries', instId).catch(() => []);
            setBursaryRecords(updatedList);

            // Clear inputs
            setBursaryStudentId('');
            setBursaryStudentSearch('');
            setBursaryConstituency('');
            setBursaryAmount('');
            setBursaryNotes('');

            alert("CDF Bursary application initiated successfully!");
        } catch (e) {
            console.error("Failed to initiate bursary application:", e);
            alert("Failed to initiate bursary application.");
        } finally {
            setIsSavingBursary(false);
        }
    };

    // Auto-load invoice items from DS fee structure template
    const handleDsClassTemplateSelect = (className: string) => {
        setDsFormClass(className);
        const template = dsFeeStructures.find(fs => fs.className === className);
        if (template && Array.isArray(template.items) && template.items.length > 0) {
            setDsFormItems(template.items.map((it: any) => ({
                name: it.name || it.voteName || 'Item',
                amount: it.amount || 0,
                priority: it.priority || 10
            })));
        } else {
            // Check settings votes presets as fallbacks
            if (dsSettings && dsSettings.votes) {
                setDsFormItems((dsSettings.votes || []).map((v: any, idx: number) => ({
                    name: v.voteName || v.vote_name || '',
                    amount: v.defaultAmount ?? v.default_amount ?? 0,
                    priority: idx + 1
                })));
            } else {
                setDsFormItems([{ name: 'Tuition Fee', amount: 15000, priority: 1 }]);
            }
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 items-start min-h-[750px] w-full text-left">
            {/* Sidebar (Vertical Menu) */}
            <div className={`${isSidebarOpen ? 'w-full lg:w-72' : 'w-full lg:w-24'} bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-[2.5rem] shadow-sm transition-all duration-500 flex flex-col p-6 shrink-0`}>
                <div className="flex items-center gap-4 mb-8 px-2">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 shrink-0">
                        <BanknotesIcon className="w-7 h-7 animate-pulse" />
                    </div>
                    {isSidebarOpen && (
                        <div className="animate-fade-in whitespace-nowrap">
                            <h2 className="text-[13px] font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mb-1">Fiscal Hub</h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Finance & Fee Control</p>
                        </div>
                    )}
                </div>

                <nav className="space-y-1 flex-1 overflow-y-auto max-h-[calc(100vh-200px)] pr-1 custom-scrollbar">
                    {tabs.filter(item => {
                        const isEdu = isEduInstitution(props.institution);
                        if (item.id === 'gok_capitation') return isEdu;
                        if (item.id === 'bursaries') return isEdu;
                        if (item.id === 'wizard') return !isDrivingSchool;
                        if (item.id === 'billing') return isDrivingSchool;
                        return true;
                    }).map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 relative group ${
                                activeTab === item.id 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105' 
                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-750'
                            }`}
                        >
                            <div className={`${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`}>
                                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
                            </div>
                            {isSidebarOpen && <span className="text-[11px] font-black uppercase tracking-widest text-left">{item.label}</span>}
                            {activeTab === item.id && isSidebarOpen && (
                                <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 text-center flex flex-col items-center">
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all mb-4"
                    >
                        {isSidebarOpen ? <XIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                    </button>
                    {isSidebarOpen && (
                        <div className="w-full p-5 bg-slate-950 rounded-[2rem] text-left relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-3xl rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                           <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3">Fiscal Governance</p>
                           <h4 className="text-xs font-black text-white mb-1">Encrypted Ledger</h4>
                           <p className="text-[9px] text-slate-500 font-medium">All financial actions are audited globally.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full space-y-8 min-w-0">
                {!isDrivingSchool && (
                    <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm shrink-0 gap-4">
                        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto custom-scrollbar-horizontal max-w-[70vw] md:max-w-full pb-1">
                            {activeTab === 'settings' ? (
                                settingsSubTabs.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setSettingsSubTab(sub.id as any)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 whitespace-nowrap ${
                                            settingsSubTab === sub.id 
                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none scale-105' 
                                            : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600'
                                        }`}
                                    >
                                        <sub.icon className={`w-4 h-4 ${settingsSubTab === sub.id ? 'text-white' : 'text-slate-400'}`} />
                                        <span className="text-[11px] font-black uppercase tracking-widest">{sub.label}</span>
                                    </button>
                                ))
                            ) : activeTab === 'receipts' ? (
                                [
                                    { id: 'student_fees', label: 'Student Fees', icon: CreditCardIcon },
                                    { id: 'bursaries', label: 'Bursaries', icon: ScaleIcon },
                                    { id: 'payment_in_kind', label: 'Payment in Kind', icon: DocumentTextIcon },
                                    { id: 'other_income', label: 'Other Income', icon: BanknotesIcon },
                                ].map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setReceiptsMainTab(sub.id as any)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 whitespace-nowrap ${
                                            receiptsMainTab === sub.id
                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none scale-105'
                                            : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600'
                                        }`}
                                    >
                                        <sub.icon className={`w-4 h-4 ${receiptsMainTab === sub.id ? 'text-white' : 'text-slate-400'}`} />
                                        <span className="text-[11px] font-black uppercase tracking-widest">{sub.label}</span>
                                    </button>
                                ))
                            ) : activeTab === 'payroll' ? (
                                hrSubTabs.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setHrSubTab(sub.id as any)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 whitespace-nowrap ${
                                            hrSubTab === sub.id
                                            ? 'bg-teal-600 text-white shadow-xl shadow-teal-100 dark:shadow-none scale-105'
                                            : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600'
                                        }`}
                                    >
                                        <sub.icon className={`w-4 h-4 ${hrSubTab === sub.id ? 'text-white' : 'text-slate-400'}`} />
                                        <span className="text-[11px] font-black uppercase tracking-widest">{sub.label}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="flex items-center gap-2 px-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                        {(activeTab as string) === 'payroll' ? 'Human Capital Module' : 
                                         activeTab === 'gok_capitation' ? 'GoK Capitation Module' :
                                         activeTab === 'transfers' ? 'Transfers Module' :
                                         'Finance Module'}
                                    </span>
                                </div>
                            )}
                        </div>
                        {/* Branch Selector Dropdown */}
                        {(props.currentUser?.role === 'super_admin' || props.currentUser?.role === 'group_admin') && branches.length > 0 && (
                            <div className="flex items-center gap-2 px-4 border-l border-slate-100 dark:border-slate-800">
                                <select
                                    value={selectedBranchId}
                                    onChange={(e) => setSelectedBranchId(e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 text-[11px] font-black uppercase tracking-widest px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
                                >
                                    <option value="ALL">All Branches</option>
                                    {branches.map((b: any) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="hidden md:flex items-center gap-4 px-6 border-l border-slate-100 dark:border-slate-800">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {(activeTab as string) === 'settings' ? 'Configuration' : (activeTab as string) === 'payroll' ? 'Human Capital' : 'Fiscal Status'}
                                </p>
                                <p className="text-sm font-black text-slate-900 dark:text-white">
                                    {(activeTab as string) === 'settings' ? 'Settings Mode' : (activeTab as string) === 'payroll' ? 'HR & Payroll' : 'Education Mode'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                const renderFeeBalancesContent = () => (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* Filter Bar & Quick Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm items-center">
                            {/* Search Bar */}
                            <div className="lg:col-span-2 relative">
                                <SearchIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search student by name or admission number..."
                                    value={searchBalances}
                                    onChange={(e) => setSearchBalances(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-900 dark:text-white"
                                />
                            </div>

                            {/* Class Filter */}
                            <div>
                                <select
                                    value={balanceClassFilter}
                                    onChange={(e) => setBalanceClassFilter(e.target.value)}
                                    className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                    <option value="All">All Classes</option>
                                    {availableClassesForBalances.map(cls => (
                                        <option key={cls} value={cls}>{cls}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <select
                                    value={balanceStatusFilter}
                                    onChange={(e) => setBalanceStatusFilter(e.target.value)}
                                    className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="has_balance">Has Balance (Owing)</option>
                                    <option value="fully_paid">Fully Paid</option>
                                    <option value="prepaid">Prepaid / Credit</option>
                                    <option value="no_payment">No Payment Made</option>
                                </select>
                            </div>

                            {/* Sort Option */}
                            <div>
                                <select
                                    value={balanceSortOption}
                                    onChange={(e) => setBalanceSortOption(e.target.value as any)}
                                    className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer"
                                >
                                    <option value="latest">Sort: Latest Updated</option>
                                    <option value="highest_balance">Sort: Highest Balance</option>
                                    <option value="lowest_balance">Sort: Lowest Balance</option>
                                    <option value="name">Sort: Name (A-Z)</option>
                                </select>
                            </div>

                            {/* Summary Stat Pill */}
                            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl text-left border border-slate-100 dark:border-slate-800/40">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Outstanding</p>
                                <p className="text-sm font-black text-rose-600 dark:text-rose-450">KSh {totalOutstandingAll.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Vertically Grouped Students per Class */}
                        <div className="space-y-8 text-left">
                            {Object.keys(groupedStudents).length === 0 ? (
                                <div className="p-8 text-center text-slate-400 font-medium bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-[2rem]">
                                    No students found matching your criteria.
                                </div>
                            ) : (
                                Object.entries(groupedStudents).map(([className, classData]) => {
                                    const totalInvoiced = classData.reduce((acc, s) => acc + s.totals.invoiced, 0);
                                    const totalPaid = classData.reduce((acc, s) => acc + s.totals.paid, 0);
                                    const totalBal = classData.reduce((acc, s) => acc + s.totals.balance, 0);
                                    
                                    return (
                                        <div key={className} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm overflow-hidden animate-in fade-in duration-300">
                                            {/* Class Header Banner */}
                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{className}</h3>
                                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{classData.length} Students enrolled</p>
                                                </div>
                                                <div className="flex gap-6">
                                                    <div>
                                                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Invoiced</span>
                                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">KSh {totalInvoiced.toLocaleString()}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Paid</span>
                                                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-450">KSh {totalPaid.toLocaleString()}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Outstanding</span>
                                                        <span className="text-xs font-black text-rose-600 dark:text-rose-400">KSh {totalBal.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Students List inside class */}
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-slate-50 dark:border-slate-800/60">
                                                            <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                                            <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Adm Number</th>
                                                            <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Updated</th>
                                                            <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Invoiced</th>
                                                            <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Paid</th>
                                                            <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance</th>
                                                            <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                            <th className="px-8 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                                                        {classData.map(student => (
                                                            <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                                                <td className="px-8 py-4 text-left">
                                                                    <span className="text-sm font-black text-slate-900 dark:text-white">{student.name}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-left">
                                                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{student.admissionNumber || student.admission_number || '—'}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-left">
                                                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                                        {student.lastUpdatedTime > 0 
                                                                            ? new Date(student.lastUpdatedTime).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: '2-digit' }) 
                                                                            : '—'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">KSh {student.totals.invoiced.toLocaleString()}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450">KSh {student.totals.paid.toLocaleString()}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <span className={`text-xs font-black ${student.totals.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-300'}`}>
                                                                        KSh {student.totals.balance.toLocaleString()}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                                        student.totals.prepayment > 0
                                                                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20'
                                                                        : student.totals.balance <= 0
                                                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                                                        : student.totals.paid > 0
                                                                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                                                                        : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                                                                    }`}>
                                                                        {student.totals.prepayment > 0 
                                                                            ? `Prepaid (KSh ${student.totals.prepayment.toLocaleString()})`
                                                                            : student.totals.balance <= 0 
                                                                            ? 'Fully Paid' 
                                                                            : student.totals.paid > 0 
                                                                            ? 'Partial' 
                                                                            : 'No Payment'
                                                                        }
                                                                    </span>
                                                                </td>
                                                                <td className="px-8 py-4 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setStmtStudentId(student.id);
                                                                            setReportsSubTab('student_statement');
                                                                            setActiveTab('reports');
                                                                        }}
                                                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-indigo-200 dark:border-indigo-800/40 shadow-xs active:scale-95 hover:shadow-sm"
                                                                        title="View Student Statement of Account"
                                                                    >
                                                                        <FileTextIcon className="w-3.5 h-3.5" />
                                                                        View Statement
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );

                {/* Dynamic View Engine */}
                <div className="min-h-[600px] w-full">

                {activeTab === 'home' && (() => {
                    const totalBilled = mappedInvoices.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);
                    const totalCollected = mappedReceipts.reduce((s: number, r: any) => s + (r.amountPaid || 0), 0);
                    const totalExpenses = (props.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
                    const outstanding = totalBilled - totalCollected;
                    const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
                    const netCashFlow = totalCollected - totalExpenses;
                    const pendingInvoices = mappedInvoices.filter((i: any) => i.status === 'pending' || i.status === 'overdue').length;
                    const recentReceipts = [...mappedReceipts].sort((a: any, b: any) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime()).slice(0, 6);

                    // Monthly collected breakdown (last 6 months)
                    const monthlyData = Array.from({ length: 6 }, (_, i) => {
                        const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
                        const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const collected = mappedReceipts.filter((r: any) => (r.createdAt || r.date || '').startsWith(prefix)).reduce((s: number, r: any) => s + (r.amountPaid || 0), 0);
                        const billed = mappedInvoices.filter((inv: any) => (inv.issueDate || inv.createdAt || '').startsWith(prefix)).reduce((s: number, inv: any) => s + (inv.totalAmount || 0), 0);
                        return { label: d.toLocaleString('default', { month: 'short' }), collected, billed };
                    });
                    const maxBar = Math.max(...monthlyData.map(m => Math.max(m.collected, m.billed)), 1);

                    // Grade/class breakdown
                    const classBreakdown = Object.entries(groupedStudents).map(([cls, data]) => ({
                        cls,
                        count: data.length,
                        invoiced: data.reduce((s, st) => s + st.totals.invoiced, 0),
                        paid: data.reduce((s, st) => s + st.totals.paid, 0),
                        balance: data.reduce((s, st) => s + st.totals.balance, 0),
                    })).sort((a, b) => b.balance - a.balance);

                    const homeSubTabs = [
                        { id: 'registry', label: 'Students Registry', icon: '🎓' },
                        { id: 'communication', label: 'Communication Hub', icon: '💬' },
                        { id: 'reports', label: 'Financial Reports', icon: '📊' },
                        { id: 'dashboard', label: 'Financial Dashboard', icon: '💰' },
                    ];

                    return (
                        <div className="space-y-6">
                            {/* Horizontal Sub-tabs menu */}
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-2 flex items-center gap-1 overflow-x-auto custom-scrollbar-horizontal pb-2">
                                {homeSubTabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setHomeSubTab(tab.id as any)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 ${
                                            homeSubTab === tab.id
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <span>{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* View contents based on active sub-tab */}
                            {homeSubTab === 'registry' && (
                                <div className="animate-in fade-in duration-300">
                                    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400 font-medium">Loading Student Registry...</div>}>
                                        <StudentEnrollmentManager
                                            context="academic"
                                            currentInstitution={props.institution}
                                            activeTab="students"
                                            companyDetails={props.companyDetails}
                                            currentUser={props.currentUser}
                                            onLogAction={props.onLogAction ? async (msg) => { await props.onLogAction!(msg); } : undefined}
                                        />
                                    </React.Suspense>
                                </div>
                            )}

                            {homeSubTab === 'communication' && (
                                <div className="animate-in fade-in duration-300">
                                    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400 font-medium">Loading Communications...</div>}>
                                        <CommunicationsManager
                                            users={props.users || []}
                                            departments={[]}
                                            courses={props.courses || []}
                                            institutions={[props.institution]}
                                            onSendSms={async (recipient, message, config, units, instId) => {
                                                return apiService.sendSms(
                                                    Array.isArray(recipient) ? recipient.join(',') : recipient, 
                                                    message, 
                                                    config, 
                                                    units, 
                                                    instId
                                                );
                                            }}
                                            currentUser={props.currentUser}
                                            smsBalance={props.institution.smsBalance || 0}
                                            currentInstitution={props.institution}
                                            smsConfig={props.institution.smsConfig}
                                            onRefreshData={props.onRefreshData}
                                            companyDetails={props.companyDetails}
                                            transactions={props.transactions || []}
                                        />
                                    </React.Suspense>
                                </div>
                            )}

                            {homeSubTab === 'reports' && (
                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8 text-center space-y-6 animate-in fade-in duration-300">
                                    <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Financial Reports Dashboard</h4>
                                    <p className="text-xs text-slate-500 max-w-md mx-auto">Select a report view below to open it in the official financial statement & ledger command center.</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto pt-4">
                                        {[
                                            { id: 'collection', label: 'Fee Collection', icon: '📥' },
                                            { id: 'outstanding', label: 'Outstanding Balances', icon: '⚠️' },
                                            { id: 'ledger', label: 'Receipts Ledger', icon: '🧾' },
                                            { id: 'expenses', label: 'Expense Summary', icon: '💸' },
                                            { id: 'payroll_summary', label: 'Payroll Summary', icon: '👔' },
                                            { id: 'annual', label: 'Annual Report', icon: '📊' },
                                            { id: 'student_statement', label: 'Student Statement', icon: '🎓' },
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    setReportsSubTab(item.id as any);
                                                    setActiveTab('reports');
                                                }}
                                                className="flex flex-col items-center justify-center p-5 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-850 dark:hover:bg-indigo-950/30 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 transition-all duration-200 group hover:-translate-y-0.5"
                                            >
                                                <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{item.icon}</span>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-650 dark:text-slate-300 text-center">{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {homeSubTab === 'dashboard' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Welcome Banner */}
                                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-500/30">
                                        <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
                                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
                                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                            <div>
                                                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Finance Command Centre</p>
                                                <h2 className="text-3xl font-black tracking-tight">{props.institution.name}</h2>
                                                <p className="text-indigo-200 text-sm font-medium mt-1">Live financial intelligence — {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="text-right">
                                                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Collection Rate</p>
                                                    <p className="text-5xl font-black">{collectionRate.toFixed(1)}<span className="text-2xl text-indigo-200">%</span></p>
                                                </div>
                                                <div className="w-40 bg-white/20 rounded-full h-2">
                                                    <div className="h-2 rounded-full bg-emerald-400 transition-all duration-1000" style={{ width: `${Math.min(collectionRate, 100)}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* KPI Cards Row */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                                        {[
                                            { label: 'Total Billed', value: totalBilled, color: 'indigo', icon: '📋', sub: `${mappedInvoices.length} invoices` },
                                            { label: 'Collected', value: totalCollected, color: 'emerald', icon: '✅', sub: `${mappedReceipts.length} receipts` },
                                            { label: 'Outstanding', value: outstanding, color: 'rose', icon: '⚠️', sub: `${pendingInvoices} pending` },
                                            { label: 'Net Cash Flow', value: netCashFlow, color: netCashFlow >= 0 ? 'teal' : 'orange', icon: netCashFlow >= 0 ? '📈' : '📉', sub: `After KSh ${totalExpenses.toLocaleString()} expenses` },
                                        ].map((kpi, i) => (
                                            <div key={i} className={`bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group`}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className="text-2xl">{kpi.icon}</span>
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest bg-${kpi.color}-50 text-${kpi.color}-600`}>{kpi.color === 'emerald' || kpi.color === 'teal' ? '▲' : '▼'}</span>
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                                                <p className="text-xl font-black text-slate-900 dark:text-white">KSh {kpi.value.toLocaleString()}</p>
                                                <p className="text-[10px] font-medium text-slate-400 mt-2">{kpi.sub}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Chart + Class Breakdown Row */}
                                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                        {/* Monthly Bar Chart */}
                                        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8">
                                            <div className="flex items-center justify-between mb-6">
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">6-Month Revenue Trend</h4>
                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Billed vs Collected</p>
                                                </div>
                                                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />Billed</span>
                                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" />Collected</span>
                                                </div>
                                            </div>
                                            <div className="flex items-end gap-3 h-44">
                                                {monthlyData.map((m, i) => (
                                                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                        <div className="w-full flex items-end justify-center gap-1" style={{ height: '140px' }}>
                                                            <div className="flex-1 bg-indigo-100 dark:bg-indigo-900/40 rounded-t-lg transition-all duration-700 hover:bg-indigo-200" style={{ height: `${(m.billed / maxBar) * 100}%`, minHeight: m.billed > 0 ? '4px' : '0' }} title={`Billed: KSh ${m.billed.toLocaleString()}`} />
                                                            <div className="flex-1 bg-emerald-400 rounded-t-lg transition-all duration-700 hover:bg-emerald-500" style={{ height: `${(m.collected / maxBar) * 100}%`, minHeight: m.collected > 0 ? '4px' : '0' }} title={`Collected: KSh ${m.collected.toLocaleString()}`} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-400">{m.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Top Classes by Outstanding */}
                                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8">
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">Outstanding by Class</h4>
                                            <p className="text-[10px] text-slate-400 font-medium mb-6">Sorted highest balance first</p>
                                            <div className="space-y-4">
                                                {classBreakdown.length === 0 ? (
                                                    <p className="text-xs text-slate-400 font-medium text-center py-6">No class data available</p>
                                                ) : classBreakdown.slice(0, 5).map((c, i) => {
                                                    const pct = c.invoiced > 0 ? (c.paid / c.invoiced) * 100 : 0;
                                                    return (
                                                        <div key={i} className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{c.cls}</span>
                                                                <span className="text-[10px] font-black text-rose-600">KSh {c.balance.toLocaleString()}</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                                                                <div className="h-1.5 rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                                                            </div>
                                                            <p className="text-[9px] text-slate-400 font-medium">{pct.toFixed(0)}% collected · {c.count} students</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recent Receipts + Quick Links */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Recent Receipts */}
                                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8">
                                            <div className="flex justify-between items-center mb-6">
                                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Receipts</h4>
                                                <button onClick={() => setActiveTab('receipts')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View All →</button>
                                            </div>
                                            <div className="space-y-3">
                                                {recentReceipts.length === 0 ? (
                                                    <p className="text-xs text-slate-400 font-medium text-center py-6">No receipts yet</p>
                                                ) : recentReceipts.map((r: any, i: number) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                                                <span className="text-xs">✓</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-slate-800 dark:text-white">{r.studentName || r.payerName || 'Student'}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium">{r.receiptNumber || r.id?.slice(-8)}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-black text-emerald-600">KSh {(r.amountPaid || 0).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Quick Navigation */}
                                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8">
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Quick Access</h4>
                                            <div className="space-y-3">
                                                {[
                                                    { label: 'Students & Invoices', tab: 'billing', emoji: '🎓', color: 'bg-indigo-50 text-indigo-700' },
                                                    { label: 'Fee Balances', tab: 'balances', emoji: '⚖️', color: 'bg-rose-50 text-rose-700' },
                                                    { label: 'Receipts', tab: 'receipts', emoji: '🧾', color: 'bg-emerald-50 text-emerald-700' },
                                                    { label: 'Billing Wizard', tab: 'wizard', emoji: '⚡', color: 'bg-amber-50 text-amber-700' },
                                                    { label: 'Expense Governance', tab: 'expenses', emoji: '💸', color: 'bg-orange-50 text-orange-700' },
                                                    { label: 'HR & Payroll', tab: 'payroll', emoji: '👔', color: 'bg-teal-50 text-teal-700' },
                                                ].map((link, i) => (
                                                    <button key={i} onClick={() => setActiveTab(link.tab as any)} className={`w-full flex items-center gap-3 p-3 rounded-2xl ${link.color} hover:scale-[1.02] transition-all duration-200 text-left`}>
                                                        <span className="text-lg">{link.emoji}</span>
                                                        <span className="text-[11px] font-black uppercase tracking-tight">{link.label}</span>
                                                        <span className="ml-auto text-xs opacity-50">→</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial Health Scoreboard */}
                                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8">
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Financial Health Indicators</h4>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                            {[
                                                { label: 'Collection Rate', value: collectionRate, suffix: '%', good: collectionRate >= 80, bar: true },
                                                { label: 'Avg. per Student', value: props.students.length > 0 ? Math.round(totalCollected / props.students.length) : 0, suffix: ' KSh', good: true, bar: false },
                                                { label: 'Total Students', value: props.students.length, suffix: '', good: true, bar: false },
                                                { label: 'Expense Ratio', value: totalCollected > 0 ? Math.round((totalExpenses / totalCollected) * 100) : 0, suffix: '%', good: totalCollected > 0 && (totalExpenses / totalCollected) < 0.5, bar: true },
                                            ].map((metric, i) => (
                                                <div key={i} className="space-y-3">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{metric.label}</p>
                                                    <p className={`text-2xl font-black ${metric.good ? 'text-emerald-600' : 'text-rose-600'}`}>{metric.value.toLocaleString()}{metric.suffix}</p>
                                                    {metric.bar && (
                                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                                                            <div className={`h-2 rounded-full transition-all duration-700 ${metric.good ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(metric.value as number, 100)}%` }} />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}


                {activeTab === 'balances' && renderFeeBalancesContent()}

                {activeTab === 'receipts' && receiptsMainTab !== 'bursaries' && receiptsMainTab !== 'payment_in_kind' && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 text-left animate-in fade-in duration-300">
                        {/* Left & Middle columns: Receipts list */}
                        <div className="lg:col-span-3 space-y-6">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                            {receiptsMainTab === 'student_fees' ? 'Student Receipts Ledger' : 'Other Income Ledger'}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                            {receiptsMainTab === 'student_fees' 
                                                ? 'Manage fees received from Cash, Bank Feed, or Bursary allocations.' 
                                                : 'Track and receive other school income such as bus hiring, donations, and other income sources.'
                                            }
                                        </p>
                                    </div>
                                    {receiptsMainTab === 'student_fees' ? (
                                        <button
                                            onClick={() => setShowPostModal(true)}
                                            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md flex items-center gap-2 transition-all active:scale-95 hover:shadow-lg"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Post Receipt
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setShowOtherIncomeModal(true)}
                                            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md flex items-center gap-2 transition-all active:scale-95 hover:shadow-lg"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Receive Other Income
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="relative flex-1">
                                        <SearchIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder={receiptsMainTab === 'student_fees' 
                                                ? "Search by student name or receipt number..."
                                                : "Search other income categories, description or receipt number..."
                                            }
                                            value={searchReceiptQuery}
                                            onChange={(e) => setSearchReceiptQuery(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <select
                                        value={receiptSourceFilter}
                                        onChange={(e) => setReceiptSourceFilter(e.target.value)}
                                        className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-300 text-xs cursor-pointer focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="All">All Methods</option>
                                        <option value="Cash">Cash (Manual)</option>
                                        <option value="M-Pesa">M-Pesa</option>
                                        <option value="Bank Transfer">Bank Feed</option>
                                        {receiptsMainTab === 'student_fees' && <option value="Bursary">Bursary</option>}
                                    </select>
                                </div>                                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-3xl">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/60">
                                                {receiptsMainTab === 'student_fees' ? (
                                                    <>
                                                        <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Adm Number</th>
                                                        <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                                        <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Grade</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                                                        <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Description / Memo</th>
                                                        <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Received From</th>
                                                    </>
                                                )}
                                                <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Receipt #</th>
                                                <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                                <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                                            {paginatedReceipts.map(rec => {
                                                const student = rec.studentId ? props.students.find(s => s.id === rec.studentId) : null;
                                                const enrollment = student ? enrollments.find(e => e.userId === student.id) : null;
                                                const admNum = enrollment?.admissionNumber || enrollment?.admission_number || student?.admissionNumber || student?.admission_number || '—';
                                                const studentName = student?.name || 'Unknown Student';
                                                const gradeName = student ? studentClassGroup(student) : '—';

                                                // Parse other income string formatting "Category - Description (From Payer)"
                                                let category = 'Other Income';
                                                let description = rec.paidFor || '';
                                                let payer = '—';
                                                if (!rec.studentId && rec.paidFor) {
                                                    const fromIdx = rec.paidFor.lastIndexOf(' (From ');
                                                    if (fromIdx >= 0) {
                                                        payer = rec.paidFor.substring(fromIdx + 7, rec.paidFor.length - 1);
                                                        const mainPart = rec.paidFor.substring(0, fromIdx);
                                                        const hypIdx = mainPart.indexOf(' - ');
                                                        if (hypIdx >= 0) {
                                                            category = mainPart.substring(0, hypIdx);
                                                            description = mainPart.substring(hypIdx + 3);
                                                        } else {
                                                            category = mainPart;
                                                            description = '—';
                                                        }
                                                    }
                                                }

                                                return (
                                                    <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                                        {receiptsMainTab === 'student_fees' ? (
                                                            <>
                                                                <td className="px-6 py-4 text-xs font-semibold text-slate-550 dark:text-slate-400">
                                                                    {admNum}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">{studentName}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                                                                    {gradeName}
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-6 py-4 text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                                    {category}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-semibold text-slate-650 dark:text-slate-400">
                                                                    {description}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white">
                                                                    {payer}
                                                                </td>
                                                            </>
                                                        )}
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="text-xs font-black text-slate-900 dark:text-white">KES {rec.amountPaid?.toLocaleString()}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-semibold text-slate-550 dark:text-slate-400">
                                                            {rec.relatedTransactionId || '—'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-xs font-black text-indigo-650 dark:text-indigo-400">{rec.receiptNumber}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                                                                rec.paymentMethod === 'Cash' 
                                                                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-250 dark:border-amber-500/20' 
                                                                : rec.paymentMethod === 'Bursary'
                                                                ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-250 dark:border-purple-500/20'
                                                                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-250 dark:border-emerald-500/20'
                                                            }`}>
                                                                {rec.paymentMethod}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                                                            {rec.paymentDate ? new Date(rec.paymentDate).toLocaleDateString() : 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                onClick={() => handleDownloadReceipt(rec)}
                                                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-650 dark:hover:bg-indigo-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                PDF
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {filteredReceipts.length === 0 && (
                                                <tr>
                                                    <td colSpan={9} className="py-12 text-center text-xs text-slate-400 font-medium italic">No receipts matched your criteria.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {totalReceiptPages > 1 && (
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-800/60">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Showing {Math.min(filteredReceipts.length, (receiptCurrentPage - 1) * 10 + 1)} to {Math.min(filteredReceipts.length, receiptCurrentPage * 10)} of {filteredReceipts.length} Receipts
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                disabled={receiptCurrentPage === 1}
                                                onClick={() => setReceiptCurrentPage(p => Math.max(1, p - 1))}
                                                className="px-4 py-2 border border-slate-205 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-40 transition-opacity hover:bg-slate-50 dark:hover:bg-slate-850"
                                            >
                                                Previous
                                            </button>
                                            {Array.from({ length: totalReceiptPages }, (_, i) => i + 1).map(p => (
                                                <button
                                                    key={p}
                                                    onClick={() => setReceiptCurrentPage(p)}
                                                    className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${
                                                        receiptCurrentPage === p 
                                                        ? 'bg-indigo-600 text-white shadow-md' 
                                                        : 'border border-slate-205 text-slate-550 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                            <button
                                                disabled={receiptCurrentPage === totalReceiptPages}
                                                onClick={() => setReceiptCurrentPage(p => Math.min(totalReceiptPages, p + 1))}
                                                className="px-4 py-2 border border-slate-205 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-40 transition-opacity hover:bg-slate-50 dark:hover:bg-slate-850"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right column: Bank Feeds / MPesa Transactions */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Unreconciled Bank Feed</h3>
                                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Approve and match incoming bank or MPesa feed transactions to students.</p>
                                </div>

                                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                                    {unreconciledFeeds.map(tx => (
                                        <div key={tx.id} className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">{tx.provider || 'BANK'} feed</span>
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-xs tracking-tight">{tx.transactionId}</h4>
                                                </div>
                                                <span className="text-xs font-black text-slate-900 dark:text-white">KES {tx.amount}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-550 dark:text-slate-405 font-semibold space-y-0.5">
                                                <p><span className="font-black text-slate-400 uppercase text-[8px] tracking-wider block">Sender</span> {tx.senderName || tx.phoneNumber || 'N/A'}</p>
                                                <p><span className="font-black text-slate-400 uppercase text-[8px] tracking-wider block">Date</span> {new Date(tx.timestamp).toLocaleString()}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setSelectedFeedTx(tx);
                                                    setShowReconcileModal(true);
                                                }}
                                                className="w-full py-2.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-650 text-indigo-650 dark:text-indigo-405 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all text-center"
                                            >
                                                Reconcile & Match
                                            </button>
                                        </div>
                                    ))}
                                    {loadingFeeds && (
                                        <div className="py-8 text-center text-xs text-slate-400">Loading bank feeds...</div>
                                    )}
                                    {!loadingFeeds && unreconciledFeeds.length === 0 && (
                                        <div className="py-12 text-center text-xs text-slate-400 italic font-medium bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                            No pending bank feed transactions.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Receive Other Income Modal */}
                {showOtherIncomeModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-left animate-in zoom-in-95 duration-200">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Receive Other Income</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Record miscellaneous school revenue such as bus hiring or canteen sales</p>
                                </div>
                                <button 
                                    onClick={() => setShowOtherIncomeModal(false)}
                                    className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <XIcon className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Income Category *</label>
                                        <select
                                            value={otherIncomeCategory}
                                            onChange={(e) => setOtherIncomeCategory(e.target.value)}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                                        >
                                            <option value="Bus Hiring">Bus Hiring</option>
                                            <option value="Canteen Sales">Canteen Sales</option>
                                            <option value="Grants & Donations">Grants & Donations</option>
                                            <option value="Tender Fees">Tender Fees</option>
                                            <option value="Asset Disposal">Asset Disposal</option>
                                            <option value="Other Income">Other Income</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Received From (Payer) *</label>
                                        <input
                                            type="text"
                                            value={otherIncomePayer}
                                            onChange={(e) => setOtherIncomePayer(e.target.value)}
                                            placeholder="e.g. John Doe / Organization Name"
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method *</label>
                                        <select
                                            value={otherIncomeMethod}
                                            onChange={(e) => setOtherIncomeMethod(e.target.value)}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                                        >
                                            <option value="Cash">Cash (Manual)</option>
                                            <option value="Bank Transfer">Bank Feed / Transfer</option>
                                            <option value="M-Pesa">M-Pesa</option>
                                            <option value="Cheque">Cheque</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount Received (KES) *</label>
                                        <input
                                            type="number"
                                            value={otherIncomeAmount || ''}
                                            onChange={(e) => setOtherIncomeAmount(Number(e.target.value))}
                                            placeholder="Enter amount received"
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Date</label>
                                        <input
                                            type="date"
                                            value={otherIncomeDate}
                                            onChange={(e) => setOtherIncomeDate(e.target.value)}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Ref / Slip Code</label>
                                        <input
                                            type="text"
                                            value={otherIncomeReference}
                                            onChange={(e) => setOtherIncomeReference(e.target.value)}
                                            placeholder="Reference code or receipt #"
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Memo</label>
                                    <input
                                        type="text"
                                        value={otherIncomeDescription}
                                        onChange={(e) => setOtherIncomeDescription(e.target.value)}
                                        placeholder="Add any extra comments or descriptions..."
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                    />
                                </div>

                                <button
                                    onClick={handlePostOtherIncome}
                                    disabled={isSavingOtherIncome || !otherIncomePayer || otherIncomeAmount <= 0}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md transition-all text-center disabled:opacity-50 mt-4 active:scale-[0.98]"
                                >
                                    {isSavingOtherIncome ? 'Saving Income...' : 'Confirm and Post Other Income'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bursaries Disbursement Panel — within receipts tab */}
                {activeTab === 'receipts' && receiptsMainTab === 'bursaries' && (() => {
                    const allocTotal = bulkBursaryAllocations.reduce((s, a) => s + (a.amount || 0), 0);
                    const remaining = bulkBursaryTotalAmount - allocTotal;
                    const bulkFilteredStudents = !bulkBursaryStudentSearch ? [] : studentFinanceData.filter(s =>
                        (s.name?.toLowerCase().includes(bulkBursaryStudentSearch.toLowerCase()) ||
                        (s.admissionNumber || '').toLowerCase().includes(bulkBursaryStudentSearch.toLowerCase())) &&
                        !bulkBursaryAllocations.some(a => a.studentId === s.id)
                    );
                    return (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-in fade-in duration-300">
                        {/* LEFT: Disbursement Form */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-5">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Bursary Cheque Disbursement</h3>
                                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Post one cheque from a donor or government and distribute it among multiple students. Each student gets an individual receipt.</p>
                                </div>

                                {bulkBursarySuccess && (
                                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">{bulkBursarySuccess}</div>
                                )}

                                {/* Donor Info */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Donor / Organisation Name *</label>
                                        <input type="text" placeholder="e.g. Kigumo NG-CDF, Ministry of Education" value={bulkBursaryDonor} onChange={e => setBulkBursaryDonor(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 dark:text-white text-xs transition-all" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Cheque / EFT Ref *</label>
                                            <input type="text" placeholder="CHQ-123456" value={bulkBursaryCheque} onChange={e => setBulkBursaryCheque(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 dark:text-white text-xs transition-all" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Bank / Issuer</label>
                                            <input type="text" placeholder="e.g. KCB, Equity" value={bulkBursaryBank} onChange={e => setBulkBursaryBank(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 dark:text-white text-xs transition-all" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Cheque Date *</label>
                                            <input type="date" value={bulkBursaryDate} onChange={e => setBulkBursaryDate(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 dark:text-white text-xs transition-all" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Total Cheque Amount (KES) *</label>
                                            <input type="number" min="0" placeholder="0" value={bulkBursaryTotalAmount || ''} onChange={e => setBulkBursaryTotalAmount(Number(e.target.value))}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 dark:text-white text-xs transition-all" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Destination Bank Account</label>
                                        <select
                                            value={bulkBursaryBankAccountId}
                                            onChange={e => setBulkBursaryBankAccountId(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 dark:text-white text-xs transition-all cursor-pointer"
                                        >
                                            <option value="">-- Select Bank Account (Optional) --</option>
                                            {bankAccounts.map(ba => (
                                                <option key={ba.id} value={ba.id}>
                                                    {ba.bankName} - {ba.accountNumber} ({ba.accountName})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Remarks / Notes</label>
                                        <textarea rows={2} placeholder="e.g. FY 2025/2026 NG-CDF Bursary Allocation" value={bulkBursaryNotes} onChange={e => setBulkBursaryNotes(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 dark:text-white text-xs transition-all resize-none" />
                                    </div>
                                </div>

                                {/* Balance indicator */}
                                {bulkBursaryTotalAmount > 0 && (
                                    <div className={`flex justify-between items-center p-4 rounded-2xl border text-xs font-black uppercase tracking-wider ${remaining < 0 ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-600' : remaining === 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-700 text-emerald-600' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700 text-amber-600'}`}>
                                        <span>Allocated: KES {allocTotal.toLocaleString()}</span>
                                        <span>{remaining < 0 ? '⚠ Over-allocated by ' : remaining === 0 ? '✓ Fully allocated' : 'Remaining: '}{remaining !== 0 ? `KES ${Math.abs(remaining).toLocaleString()}` : ''}</span>
                                    </div>
                                )}

                                {/* Add student search */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Add Student Beneficiary</label>
                                    <div className="relative">
                                        <input type="text" placeholder="Search student by name or admission no..." value={bulkBursaryStudentSearch} onChange={e => setBulkBursaryStudentSearch(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 dark:text-white text-xs transition-all" />
                                        {bulkFilteredStudents.length > 0 && (
                                            <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                                {bulkFilteredStudents.slice(0, 8).map(s => (
                                                    <button key={s.id} type="button" onClick={() => {
                                                        setBulkBursaryAllocations(prev => [...prev, { studentId: s.id, studentName: s.name, admNo: s.admissionNumber || s.admission_number || '', amount: 0 }]);
                                                        setBulkBursaryStudentSearch('');
                                                    }} className="w-full p-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-xs font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center">
                                                        <span>{s.name}</span>
                                                        <span className="text-[9px] text-slate-400 uppercase tracking-wider">{s.admissionNumber || s.admission_number || '—'}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Allocation rows */}
                                {bulkBursaryAllocations.length > 0 && (
                                    <div className="space-y-2">
                                        {bulkBursaryAllocations.map((alloc, idx) => (
                                            <div key={alloc.studentId} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-black text-slate-800 dark:text-white truncate">{alloc.studentName}</div>
                                                    <div className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{alloc.admNo || 'No Adm'}</div>
                                                </div>
                                                <input type="number" min="0" placeholder="Amount" value={alloc.amount || ''}
                                                    onChange={e => {
                                                        const updated = [...bulkBursaryAllocations];
                                                        updated[idx] = { ...updated[idx], amount: Number(e.target.value) };
                                                        setBulkBursaryAllocations(updated);
                                                    }}
                                                    className="w-28 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-white text-right outline-none focus:border-indigo-500 transition-all" />
                                                <button type="button" onClick={() => setBulkBursaryAllocations(prev => prev.filter((_, i) => i !== idx))}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button onClick={handleBulkBursaryDisburse} disabled={isSavingBulkBursary || bulkBursaryAllocations.length === 0 || !bulkBursaryDonor || !bulkBursaryCheque}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50">
                                    {isSavingBulkBursary ? 'Processing...' : `Disburse & Post ${bulkBursaryAllocations.length} Receipt${bulkBursaryAllocations.length !== 1 ? 's' : ''} →`}
                                </button>
                            </div>
                        </div>

                        {/* RIGHT: History + Donor Acknowledgements */}
                        <div className="lg:col-span-3 space-y-6">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm">
                                <div className="flex items-start justify-between mb-5">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Disbursement History</h3>
                                        <p className="text-xs text-slate-400 font-semibold mt-0.5">Past bursary cheques distributed to students</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Disbursed</div>
                                        <div className="text-lg font-black text-indigo-600">KES {bulkBursaryDisbursements.reduce((s, d) => s + (d.allocatedAmount || 0), 0).toLocaleString()}</div>
                                    </div>
                                </div>

                                {bulkBursaryDisbursements.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <ScaleIcon className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-3" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No bursary disbursements yet</p>
                                        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Post a donor cheque on the left to get started.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {[...bulkBursaryDisbursements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(d => (
                                            <div key={d.id} className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                                                {/* Batch header */}
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-950/30">
                                                    <div>
                                                        <div className="text-xs font-black text-slate-800 dark:text-white">{d.donorName}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Cheque: {d.chequeNumber} {d.bankName ? `· ${d.bankName}` : ''} · {d.chequeDate}</div>
                                                        {d.notes && <div className="text-[10px] text-slate-400 mt-0.5 italic">{d.notes}</div>}
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Disbursed</div>
                                                            <div className="text-sm font-black text-emerald-600">KES {(d.allocatedAmount || 0).toLocaleString()}</div>
                                                        </div>
                                                        <button onClick={async () => {
                                                            const inst = props.institution;
                                                            const lines = (d.allocations || []).map((a: any) => `  • ${a.studentName} (${a.admNo || '—'}): KES ${(a.amount || 0).toLocaleString()}`).join('\n');
                                                            const content = `BURSARY DONOR ACKNOWLEDGEMENT\n${'='.repeat(50)}\nInstitution: ${inst.name}\nDate: ${new Date().toLocaleDateString()}\n\nDear ${d.donorName},\n\nWe gratefully acknowledge receipt of a bursary cheque (Ref: ${d.chequeNumber}${d.bankName ? ', ' + d.bankName : ''}) dated ${d.chequeDate} for a total of KES ${(d.totalAmount || 0).toLocaleString()}.\n\nThe funds have been distributed as follows:\n${lines}\n\nTotal Allocated: KES ${(d.allocatedAmount || 0).toLocaleString()}\n${d.notes ? 'Notes: ' + d.notes + '\n' : ''}\nThank you for your generous support of our students.\n\nSigned: ${d.postedBy || ''}\n${inst.name}\nDate: ${new Date().toLocaleDateString()}`;
                                                            const blob = new Blob([content], { type: 'text/plain' });
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url; a.download = `Bursary_Acknowledgement_${d.donorName.replace(/\s+/g, '_')}.txt`;
                                                            a.click(); URL.revokeObjectURL(url);
                                                        }} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors">
                                                            <DownloadIcon className="w-3.5 h-3.5" /> Acknowledgement
                                                        </button>
                                                    </div>
                                                </div>
                                                {/* Student rows */}
                                                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                                    {(d.allocations || []).map((a: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between px-4 py-2.5">
                                                            <div>
                                                                <div className="text-xs font-black text-slate-700 dark:text-slate-200">{a.studentName}</div>
                                                                <div className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{a.admNo || '—'}</div>
                                                            </div>
                                                            <div className="text-xs font-black text-slate-800 dark:text-white">KES {(a.amount || 0).toLocaleString()}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    );
                })()}

                {activeTab === 'receipts' && receiptsMainTab === 'payment_in_kind' && (
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6 text-left animate-in fade-in duration-300">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Payment in Kind Clearance Dashboard</h3>
                            <p className="text-sm text-slate-500 mt-1">Review parent/student goods deliveries confirmed by the Storekeeper. Approve them to credit student ledgers and issue parent receipts.</p>
                        </div>

                        {isLoadingGoodsProposals ? (
                            <div className="flex justify-center p-12">
                                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : goodsProposals.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 py-12 bg-slate-50 dark:bg-slate-800 rounded-2xl">No payment in kind proposals registered in the database.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800">
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Description</th>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</th>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Value</th>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {goodsProposals.map(p => {
                                            const student = props.students.find((s: any) => s.id === p.studentId);
                                            return (
                                                <tr key={p.id} className="border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                    <td className="py-4 px-4">
                                                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{student?.name || 'Unknown Student'}</div>
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{student?.admissionNumber || 'No Adm'}</div>
                                                    </td>
                                                    <td className="py-4 px-4 text-xs font-bold text-slate-700 dark:text-slate-300">{p.itemName}</td>
                                                    <td className="py-4 px-4 text-xs font-bold text-slate-600 dark:text-slate-400">{p.quantity} {p.unit}</td>
                                                    <td className="py-4 px-4 text-xs font-black text-slate-900 dark:text-white">KSh {p.totalValue.toLocaleString()}</td>
                                                    <td className="py-4 px-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                            p.status === 'credited' 
                                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 border-emerald-200 dark:border-emerald-500/20' 
                                                                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-450 border-amber-200 dark:border-amber-500/20'
                                                        }`}>
                                                            {p.status === 'credited' ? 'Credited' : 'Pending Clearance'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        {p.status === 'pending' ? (
                                                            <button
                                                                onClick={async () => {
                                                                    if (!confirm("Are you sure you want to approve this delivery and credit the student fees for KES " + p.totalValue.toLocaleString() + "?")) return;
                                                                    try {
                                                                        // 1. Save Finance Receipt
                                                                        const instId = props.institution.id;
                                                                        const receiptNumber = await apiService.getNextDocumentNumber(instId, 'receipt');

                                                                        const receipt = {
                                                                            id: `rcpt_goods_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                                                                            receipt_number: receiptNumber,
                                                                            receiptNumber: receiptNumber,
                                                                            institution_id: instId,
                                                                            payment_date: new Date().toISOString().split('T')[0],
                                                                            amount_paid: Number(p.totalValue),
                                                                            paid_for: `Payment via supply of ${p.quantity} ${p.unit} of ${p.itemName}`,
                                                                            payment_method: 'Goods In Lieu',
                                                                            student_id: p.studentId
                                                                        };
                                                                        await apiService.saveModuleRecord('receipts', receipt);

                                                                        // 2. Mark proposal as credited
                                                                        const updatedProposal = {
                                                                            ...p,
                                                                            status: 'credited' as const,
                                                                            updatedAt: new Date().toISOString()
                                                                        };
                                                                        await apiService.saveModuleRecord('fee_goods_proposals', updatedProposal);

                                                                        alert("Delivery cleared successfully! Official receipt generated and parent credited.");
                                                                        fetchGoodsProposals();
                                                                        if (props.onRefreshData) {
                                                                            await props.onRefreshData();
                                                                        }
                                                                    } catch (e) {
                                                                        console.error("Failed to clear goods payment:", e);
                                                                        alert("Failed to clear goods payment.");
                                                                    }
                                                                }}
                                                                className="px-4 py-2 bg-indigo-605 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                                                            >
                                                                Approve & Issue Receipt
                                                            </button>
                                                        ) : p.status === 'credited' ? (
                                                            <span className="text-[10px] text-slate-400 font-bold italic">Cleared & Receipt Issued</span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 font-bold">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'student_invoices' && (
                    <div className="space-y-6 text-left animate-in fade-in duration-300">
                        {/* Header stats block */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Invoices</span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{filteredStudentInvoices.length}</h3>
                                <p className="text-[10px] text-slate-500 font-semibold mt-1">Generated and loaded records</p>
                            </div>
                             <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm">
                                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Total Invoiced</span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                    KES {filteredStudentInvoices.reduce((sum, inv) => {
                                        const amt = inv.totalAmount || (inv as any).total_amount || 0;
                                        return sum + parseMoneyAmount(amt);
                                    }, 0).toLocaleString()}
                                </h3>
                                <p className="text-[10px] text-slate-500 font-semibold mt-1">Cumulative student billings</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm">
                                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-450 tracking-wider">Collected / Paid</span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                    KES {filteredStudentInvoices.reduce((sum, inv) => {
                                        const allocations = props.receipts.filter(r => (r.invoiceId || (r as any).invoice_id) === inv.id);
                                        const paid = allocations.reduce((s, r) => {
                                            const amt = r.amountPaid || (r as any).amount_paid || 0;
                                            return s + parseMoneyAmount(amt);
                                        }, 0);
                                        return sum + paid;
                                    }, 0).toLocaleString()}
                                </h3>
                                <p className="text-[10px] text-slate-500 font-semibold mt-1">Amount cleared from receipts</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm">
                                <span className="text-[10px] font-black uppercase text-rose-650 tracking-wider">Outstanding Balance</span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                    KES {Math.max(0, filteredStudentInvoices.reduce((sum, inv) => {
                                        const allocations = props.receipts.filter(r => (r.invoiceId || (r as any).invoice_id) === inv.id);
                                        const paid = allocations.reduce((s, r) => {
                                            const amt = r.amountPaid || (r as any).amount_paid || 0;
                                            return s + parseMoneyAmount(amt);
                                        }, 0);
                                        const totalAmt = inv.totalAmount || (inv as any).total_amount || 0;
                                        return sum + Math.max(0, parseMoneyAmount(totalAmt) - paid);
                                    }, 0)).toLocaleString()}
                                </h3>
                                <p className="text-[10px] text-slate-500 font-semibold mt-1">Unpaid billing totals</p>
                            </div>
                        </div>

                        {/* Invoice List & Filters */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Student Invoices Ledger</h3>
                                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Track, audit, print and manage all academic billing invoices issued to students.</p>
                                </div>
                                {selectedInvoiceIds.size > 0 && (
                                    <button
                                        onClick={async () => {
                                            if (!window.confirm(`Are you sure you want to permanently delete the ${selectedInvoiceIds.size} selected invoice(s)? This will remove them completely and cannot be undone.`)) return;
                                            try {
                                                const idsArray = Array.from(selectedInvoiceIds);
                                                await apiService.deleteModuleRecord('invoices', idsArray.join(','));
                                                setSelectedInvoiceIds(new Set());
                                                if (props.onRefreshData) {
                                                    await props.onRefreshData();
                                                }
                                                alert("Selected invoice(s) deleted successfully.");
                                            } catch (err) {
                                                console.error("Failed to delete invoices:", err);
                                                alert("Failed to delete selected invoices.");
                                            }
                                        }}
                                        className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-rose-500/20 active:scale-95 animate-in slide-in-from-right duration-300"
                                    >
                                        <Trash2Icon className="w-4 h-4" />
                                        Delete Selected ({selectedInvoiceIds.size})
                                    </button>
                                )}
                            </div>

                            {/* Filters Bar */}
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1">
                                    <SearchIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by student name, admission number, or invoice reference..."
                                        value={searchInvoiceQuery}
                                        onChange={(e) => setSearchInvoiceQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-900 dark:text-white"
                                    />
                                </div>
                                <select
                                    value={invoiceStatusFilter}
                                    onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                                    className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-300 text-xs cursor-pointer focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                    <option value="partial">Partial</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                                <select
                                    value={invoiceClassFilter}
                                    onChange={(e) => setInvoiceClassFilter(e.target.value)}
                                    className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-300 text-xs cursor-pointer focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="All">All Classes</option>
                                    {Array.from(new Set(props.students.map(s => studentClassGroup(s)))).map(cls => (
                                        <option key={cls} value={cls}>{cls}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Invoices Table */}
                            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-3xl">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/60">
                                            <th className="px-6 py-4 text-left w-10">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                                                    checked={paginatedStudentInvoices.length > 0 && paginatedStudentInvoices.every(inv => selectedInvoiceIds.has(inv.id))}
                                                    onChange={(e) => {
                                                        const newSelected = new Set(selectedInvoiceIds);
                                                        if (e.target.checked) {
                                                            paginatedStudentInvoices.forEach(inv => newSelected.add(inv.id));
                                                        } else {
                                                            paginatedStudentInvoices.forEach(inv => newSelected.delete(inv.id));
                                                        }
                                                        setSelectedInvoiceIds(newSelected);
                                                    }}
                                                />
                                            </th>
                                            <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Invoice Number</th>
                                            <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                            <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Class / Grade</th>
                                            <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Amount</th>
                                            <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Paid Amount</th>
                                            <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Date Issued</th>
                                            <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                                        {paginatedStudentInvoices.map(inv => {
                                            const studentId = inv.studentId || (inv as any).student_id;
                                            const student = studentId ? studentFinanceData.find(s => s.id === studentId) : null;
                                            const admNum = student?.admissionNumber || student?.admission_number || '—';
                                            const studentName = student?.name || 'Unknown Student';
                                            const gradeName = student ? studentClassGroup(student) : '—';
                                            const allocations = props.receipts.filter(r => (r.invoiceId || (r as any).invoice_id) === inv.id);
                                            const paidAmount = allocations.reduce((sum, r) => sum + Number(r.amountPaid || (r as any).amount_paid || 0), 0);
                                            const totalAmount = Number(inv.totalAmount || (inv as any).total_amount || 0);

                                            return (
                                                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                                    <td className="px-6 py-4 w-10">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                                                            checked={selectedInvoiceIds.has(inv.id)}
                                                            onChange={(e) => {
                                                                const newSelected = new Set(selectedInvoiceIds);
                                                                if (e.target.checked) {
                                                                    newSelected.add(inv.id);
                                                                } else {
                                                                    newSelected.delete(inv.id);
                                                                }
                                                                setSelectedInvoiceIds(newSelected);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-black text-slate-800 dark:text-slate-100">{inv.invoiceNumber || (inv as any).invoice_number || '—'}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{studentName}</div>
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">ADM: {admNum}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400">{gradeName}</td>
                                                    <td className="px-6 py-4 text-right text-xs font-black text-slate-900 dark:text-white">KES {totalAmount.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right text-xs font-bold text-emerald-600">KES {paidAmount.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                            inv.status === 'paid'
                                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-455 border-emerald-200 dark:border-emerald-500/20'
                                                                : inv.status === 'partial'
                                                                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-455 border-blue-200 dark:border-blue-500/20'
                                                                : inv.status === 'cancelled'
                                                                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-450 border-rose-200 dark:border-rose-500/20'
                                                                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-450 border-amber-200 dark:border-amber-500/20'
                                                        }`}>
                                                            {inv.status || 'pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                                        {inv.issueDate || ((inv as any).createdAt ? new Date((inv as any).createdAt).toISOString().split('T')[0] : '—')}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex justify-center items-center gap-1">
                                                            <button
                                                                onClick={() => setSelectedInvoiceForDetails(inv)}
                                                                title="View Details"
                                                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                                                            >
                                                                <EyeIcon className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    setIsPrintingInvoiceId(inv.id);
                                                                    try {
                                                                        const studentId = inv.studentId || (inv as any).student_id;
                                                                        const student = studentId ? studentFinanceData.find(s => s.id === studentId) : null;
                                                                        const invWithStudent = student ? {
                                                                            ...inv,
                                                                            student: {
                                                                                name: student.name,
                                                                                admissionNumber: student.admissionNumber || student.admission_number || '',
                                                                                className: student.className || ''
                                                                            }
                                                                        } : inv;
                                                                        const dataUri = await pdfService.generateInvoicePdfDataUri(
                                                                            invWithStudent as any,
                                                                            props.institution,
                                                                            props.companyDetails!,
                                                                            props.institution.logoUrl || null
                                                                        );
                                                                        const printWindow = window.open();
                                                                        if (printWindow) {
                                                                            printWindow.document.write(`<iframe src="${dataUri}" style="width:100%; height:100%; border:none;"></iframe>`);
                                                                        }
                                                                    } catch (err) {
                                                                        console.error("Failed to print invoice PDF:", err);
                                                                        alert("Failed to generate PDF for printing.");
                                                                    } finally {
                                                                        setIsPrintingInvoiceId(null);
                                                                    }
                                                                }}
                                                                disabled={isPrintingInvoiceId === inv.id}
                                                                title="Print PDF Invoice"
                                                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                                                            >
                                                                {isPrintingInvoiceId === inv.id ? (
                                                                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                                                ) : (
                                                                    <PrinterIcon className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                            {inv.status !== 'cancelled' && (
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!confirm("Are you sure you want to cancel this invoice? This will remove its due outstanding balance from the student's ledger.")) return;
                                                                        try {
                                                                            await apiService.updateModuleRecord('invoices', inv.id, { status: 'cancelled' });
                                                                            if (props.onRefreshData) {
                                                                                await props.onRefreshData();
                                                                            }
                                                                            alert("Invoice cancelled successfully!");
                                                                        } catch (err) {
                                                                            console.error(err);
                                                                            alert("Failed to cancel invoice.");
                                                                        }
                                                                    }}
                                                                    title="Cancel Invoice"
                                                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                                                >
                                                                    <XCircleIcon className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={async () => {
                                                                    if (!window.confirm(`Are you sure you want to permanently delete invoice ${inv.invoiceNumber || (inv as any).invoice_number || ''}? This action cannot be undone.`)) return;
                                                                    try {
                                                                        await apiService.deleteModuleRecord('invoices', inv.id);
                                                                        const newSelected = new Set(selectedInvoiceIds);
                                                                        newSelected.delete(inv.id);
                                                                        setSelectedInvoiceIds(newSelected);
                                                                        if (props.onRefreshData) {
                                                                            await props.onRefreshData();
                                                                        }
                                                                        alert("Invoice deleted successfully.");
                                                                    } catch (err) {
                                                                        console.error("Failed to delete invoice:", err);
                                                                        alert("Failed to delete invoice.");
                                                                    }
                                                                }}
                                                                title="Delete Invoice"
                                                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredStudentInvoices.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="py-12 text-center text-xs text-slate-450 italic font-semibold">
                                                    No student invoices matched the filter criteria.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalInvoicePages > 1 && (
                                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Page {invoiceCurrentPage} of {totalInvoicePages}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setInvoiceCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={invoiceCurrentPage === 1}
                                            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-350 dark:hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                        >
                                            Prev
                                        </button>
                                        <button
                                            onClick={() => setInvoiceCurrentPage(prev => Math.min(totalInvoicePages, prev + 1))}
                                            disabled={invoiceCurrentPage === totalInvoicePages}
                                            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-350 dark:hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Invoice Details Modal */}
                {selectedInvoiceForDetails && (() => {
                    const inv = selectedInvoiceForDetails;
                    const studentId = inv.studentId || inv.student_id;
                    const student = studentId ? studentFinanceData.find(s => s.id === studentId) : null;
                    const sName = student?.name || 'Unknown Student';
                    const admNum = student?.admissionNumber || student?.admission_number || '—';
                    const sClass = student ? studentClassGroup(student) : '—';
                    
                    let items: any[] = [];
                    if (typeof inv.items === 'string') {
                        try { items = JSON.parse(inv.items); } catch(e) {}
                    } else if (Array.isArray(inv.items)) {
                        items = inv.items;
                    }

                    return (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col text-left animate-in zoom-in-95 duration-200">
                                {/* Modal Header */}
                                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-indigo-650 tracking-wider">Invoice Overview</span>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">Invoice: {inv.invoiceNumber || inv.invoice_number || '—'}</h3>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedInvoiceForDetails(null)}
                                        className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 rounded-xl text-slate-400 hover:text-slate-650 transition-colors"
                                    >
                                        <XIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <div className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                                    {/* Student Card */}
                                    <div className="bg-slate-50/50 dark:bg-slate-950/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Student Name</span>
                                            <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{sName}</p>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Admission Number</span>
                                            <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{admNum}</p>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Class / Grade</span>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{sClass}</p>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Issue Date</span>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                                                {inv.issueDate || (inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : '—')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-450 pb-1 border-b border-slate-100 dark:border-slate-800">Fee Votehead Allocation</h4>
                                        <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                                                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Votehead / Item</th>
                                                        <th className="px-4 py-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest w-24">Priority</th>
                                                        <th className="px-4 py-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest w-32">Total Billed</th>
                                                        <th className="px-4 py-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest w-32">Amount Paid</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                                                    {items.map((item, idx) => {
                                                        const name = item.name || item.voteheadName || item.description || 'Unnamed Item';
                                                        const amount = Number(item.amount || item.unitPrice || 0);
                                                        const paid = Number(item.paid || 0);
                                                        const prio = item.priority !== undefined ? item.priority : '—';
                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/5 transition-colors">
                                                                <td className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200">{name}</td>
                                                                <td className="px-4 py-3 text-center text-xs font-semibold text-slate-450">{prio}</td>
                                                                <td className="px-4 py-3 text-right text-xs font-black text-slate-900 dark:text-white">KES {amount.toLocaleString()}</td>
                                                                <td className="px-4 py-3 text-right text-xs font-bold text-emerald-600">KES {paid.toLocaleString()}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {items.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="py-6 text-center text-xs text-slate-400 italic">No items found on this invoice.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center rounded-b-[2.5rem]">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Invoice Balance</span>
                                        <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                                            KES {Math.max(0, Number(inv.totalAmount || inv.total_amount || 0) - items.reduce((s, it) => s + Number(it.paid || 0), 0)).toLocaleString()}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedInvoiceForDetails(null)}
                                        className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-850 dark:text-white rounded-xl text-xs font-bold transition-all"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {activeTab === 'wizard' && (
                    <AutomatedBilling 
                        feeStructures={props.feeStructures}
                        students={props.students}
                        academicYears={props.academicYears}
                        semesters={props.semesters}
                        institution={props.institution}
                        onGenerateInvoices={props.onGenerateInvoices}
                        companyDetails={props.companyDetails}
                        courses={props.courses || []}
                    />
                )}

                {activeTab === 'gok_capitation' && (() => {
                    const trancheLabels: Record<string, string> = { term_1: 'Term 1 (50%)', term_2: 'Term 2 (30%)', term_3: 'Term 3 (20%)' };
                    const trancheColors: Record<string, string> = { term_1: 'from-emerald-500 to-teal-600', term_2: 'from-blue-500 to-indigo-600', term_3: 'from-violet-500 to-purple-600' };
                    return (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Header Banner */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-emerald-500/30">
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_60%)]" />
                                <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/5 blur-xl" />
                                <div className="relative flex items-start justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                                                <BuildingLibraryIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Government of Kenya</span>
                                        </div>
                                        <h2 className="text-2xl font-black tracking-tight mb-1">Free Primary Education</h2>
                                        <p className="text-sm text-emerald-100">Capitation Grant Disbursement & Allocation Tracker</p>
                                        <p className="text-[10px] text-emerald-200/70 mt-2 uppercase tracking-wider">Per MoE FPE Operational Manual — June 2020</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Full Year Capitation</p>
                                        <p className="text-3xl font-black tabular-nums">KES {gokTotalFull.toLocaleString()}</p>
                                        <p className="text-[10px] text-emerald-200 mt-1">{trancheLabels[gokTranche]} → <span className="text-white font-black">KES {gokTotalReceived.toLocaleString()}</span></p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                                {/* Left: Input Form */}
                                <div className="xl:col-span-3 space-y-5">
                                    {/* Enrolment & Rates */}
                                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6">
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5">Enrolment & Rate Configuration</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Learner Enrolment</label>
                                                <input
                                                    type="number" min="0"
                                                    value={gokEnrolment}
                                                    onChange={e => setGokEnrolment(e.target.value)}
                                                    placeholder="e.g. 450"
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Rate / Learner (KES)</label>
                                                <input
                                                    type="number" min="0"
                                                    value={gokDisbursementRate}
                                                    onChange={e => setGokDisbursementRate(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                />
                                                <p className="text-[9px] text-slate-400 mt-1">Primary: 1,420 | JSS: 15,000 | SNE: 6,720</p>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">SNE Learners (Optional)</label>
                                                <input
                                                    type="number" min="0"
                                                    value={gokSneCount}
                                                    onChange={e => setGokSneCount(e.target.value)}
                                                    placeholder="0"
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">SNE Rate / Learner (KES)</label>
                                                <input
                                                    type="number" min="0"
                                                    value={gokSneRate}
                                                    onChange={e => setGokSneRate(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tranche & Receipt Details */}
                                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6">
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5">Disbursement Tranche</h3>
                                        <div className="flex gap-3 mb-5">
                                            {(['term_1', 'term_2', 'term_3'] as const).map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setGokTranche(t)}
                                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                                                        gokTranche === t
                                                        ? `bg-gradient-to-br ${trancheColors[t]} text-white shadow-lg scale-105`
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {trancheLabels[t]}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Payment Mode Selector */}
                                        <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Payment Mode</label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setGokPaymentMode('full')}
                                                    className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                                        gokPaymentMode === 'full'
                                                        ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-sm'
                                                        : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    Full Tranche
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setGokPaymentMode('installment')}
                                                    className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                                        gokPaymentMode === 'installment'
                                                        ? 'bg-emerald-600 text-white shadow-sm'
                                                        : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    Installment / Partial
                                                </button>
                                            </div>

                                            {gokPaymentMode === 'installment' && (
                                                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
                                                    <div>
                                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Installment Label</label>
                                                        <input
                                                            type="text"
                                                            value={gokInstallmentLabel}
                                                            onChange={e => setGokInstallmentLabel(e.target.value)}
                                                            placeholder="e.g. Installment 1"
                                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount (KES)</label>
                                                        <input
                                                            type="number" min="0"
                                                            value={gokCustomAmount}
                                                            onChange={e => handleCustomAmountChange(e.target.value)}
                                                            placeholder="Amount received"
                                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tranche % (of Annual)</label>
                                                        <input
                                                            type="number" min="0" max="100" step="0.01"
                                                            value={gokCustomPct}
                                                            onChange={e => handleCustomPctChange(e.target.value)}
                                                            placeholder="e.g. 25"
                                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">MoE Reference / Ref No.</label>
                                                <input
                                                    type="text"
                                                    value={gokReference}
                                                    onChange={e => setGokReference(e.target.value)}
                                                    placeholder="e.g. MOE/FPE/2024/T1/..."
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Receiving Bank Account</label>
                                                <select
                                                    value={gokBankAccountId}
                                                    onChange={e => setGokBankAccountId(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                >
                                                    <option value="">-- Select Account --</option>
                                                    {bankAccounts.map((acc: any) => (
                                                        <option key={acc.id} value={acc.id}>
                                                            {acc.bankName} — {acc.accountName} ({acc.accountNumber})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Notes</label>
                                            <textarea
                                                value={gokNotes}
                                                onChange={e => setGokNotes(e.target.value)}
                                                rows={2}
                                                placeholder="Optional remarks..."
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            />
                                        </div>
                                        <button
                                            onClick={handlePostGokCapitation}
                                            disabled={isSavingGokCap}
                                            className="mt-5 w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                                        >
                                            {isSavingGokCap ? (
                                                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing…</>
                                            ) : (
                                                <><BuildingLibraryIcon className="w-4 h-4" />Post Capitation Disbursement</>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Right: Distribution Preview */}
                                <div className="xl:col-span-2 space-y-5">
                                    {/* Tranche Calculator */}
                                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6">
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5">Live Disbursement Calculator</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                                                <span className="text-xs text-slate-500 font-semibold">Annual Entitlement</span>
                                                <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">KES {gokTotalFull.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                                                <span className="text-xs text-slate-500 font-semibold">Tranche ({gokTranchePct}%)</span>
                                                <span className={`text-sm font-black tabular-nums bg-gradient-to-r ${trancheColors[gokTranche]} bg-clip-text text-transparent`}>KES {gokTotalReceived.toLocaleString()}</span>
                                            </div>
                                            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-800 dark:to-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
                                                <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">MoE Budget Allocation</p>
                                                <div className="space-y-2.5">
                                                    {[
                                                        { label: 'SIMBA (Instructional Materials)', pct: 50, amount: gokSimbaAmount, color: 'bg-emerald-500' },
                                                        { label: 'GPA (General Purpose)', pct: 50, amount: gokGpaAmount, color: 'bg-teal-500' },
                                                    ].map(item => (
                                                        <div key={item.label}>
                                                            <div className="flex justify-between text-[10px] mb-1">
                                                                <span className="text-slate-600 dark:text-slate-400 font-semibold">{item.label}</span>
                                                                <span className="font-black text-slate-800 dark:text-slate-200">KES {item.amount.toLocaleString()}</span>
                                                            </div>
                                                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                                                            </div>
                                                            <p className="text-[9px] text-slate-400 mt-0.5">{item.pct}% of tranche</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MoE Regulation Card */}
                                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-6 text-white shadow-xl">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">MoE FPE Manual — June 2020</p>
                                        <div className="space-y-3 text-[11px]">
                                            <div className="flex gap-3 items-start">
                                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">T1</div>
                                                <span className="text-slate-300">Term 1 — <strong className="text-white">50%</strong> of annual allocation</span>
                                            </div>
                                            <div className="flex gap-3 items-start">
                                                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">T2</div>
                                                <span className="text-slate-300">Term 2 — <strong className="text-white">30%</strong> of annual allocation</span>
                                            </div>
                                            <div className="flex gap-3 items-start">
                                                <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">T3</div>
                                                <span className="text-slate-300">Term 3 — <strong className="text-white">20%</strong> of annual allocation</span>
                                            </div>
                                            <div className="border-t border-slate-700 pt-3 mt-3">
                                                <p className="text-slate-400 text-[10px]">Funds must be utilised within the financial year and are subject to audit by KNEC & MoE inspectors.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Capitation History */}
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Capitation Ledger</h3>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{gokCapLogs.length} disbursement(s) recorded</p>
                                    </div>
                                    <button onClick={fetchGokCapLogs} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                                        <ArrowPathIcon className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                                {isLoadingGokLogs ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : gokCapLogs.length === 0 ? (
                                    <div className="text-center py-16 text-slate-400">
                                        <BuildingLibraryIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm font-semibold">No capitation records yet.</p>
                                        <p className="text-xs mt-1">Post your first disbursement using the form above.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                    {['Date', 'Tranche', 'Enrolment', 'Rate', 'Total Received', 'SIMBA', 'GPA', 'Reference', 'Notes / Remarks'].map(h => (
                                                        <th key={h} className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {gokCapLogs.sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime()).map((log: any) => (
                                                    <tr key={log.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{new Date(log.createdAt || log.created_at).toLocaleDateString('en-KE')}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                                                log.trancheName === 'term_1' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                                log.trancheName === 'term_2' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                                                            }`}>
                                                                {log.trancheName?.replace('_', ' ')} ({log.tranchePercentage}%)
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-900 dark:text-white font-semibold">{Number(log.enrolmentCount).toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">KES {Number(log.disbursementRate).toLocaleString()}</td>
                                                        <td className="px-4 py-3 font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">KES {Number(log.totalReceived).toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">KES {Number(log.simbaAmount).toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">KES {Number(log.gpaAmount).toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{log.referenceNumber || '—'}</td>
                                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={log.notes}>{log.notes || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {activeTab === 'billing' && !isDrivingSchool && (
                    <div className="space-y-6">
                        {/* Sub-tabs for Students */}
                        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
                            <button
                                onClick={() => setStudentSubTab('registry')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    studentSubTab === 'registry'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md'
                                    : 'text-slate-500 hover:text-indigo-650'
                                }`}
                            >
                                Students Registry
                            </button>
                            <button
                                onClick={() => setStudentSubTab('balances')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    studentSubTab === 'balances'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md'
                                    : 'text-slate-500 hover:text-indigo-650'
                                }`}
                            >
                                Fee Balances
                            </button>
                        </div>

                        {studentSubTab === 'registry' && (
                            <div className="animate-in fade-in duration-300">
                                <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400 font-medium">Loading Student Registry...</div>}>
                                    <StudentEnrollmentManager
                                        context="academic"
                                        currentInstitution={props.institution}
                                        activeTab="students"
                                        companyDetails={props.companyDetails}
                                        currentUser={props.currentUser}
                                        onLogAction={props.onLogAction ? async (msg) => { await props.onLogAction!(msg); } : undefined}
                                    />
                                </React.Suspense>
                            </div>
                        )}

                        {studentSubTab === 'balances' && renderFeeBalancesContent()}


                    </div>
                )}

                {activeTab === 'payroll' && (
                    <div className="animate-in fade-in duration-300">
                        <React.Suspense fallback={
                            <div className="h-64 flex items-center justify-center">
                                <div className="w-8 h-8 animate-spin border-4 border-teal-500 border-t-transparent rounded-full" />
                            </div>
                        }>
                            <HRManager
                                currentUser={props.currentUser}
                                staff={(props.users || []).filter((u: any) => u.role?.toLowerCase().trim() !== 'student')}
                                payrollRecords={props.payrollRecords || []}
                                leaveRequests={props.leaveRequests || []}
                                institution={props.institution}
                                onProcessPayroll={props.onProcessPayroll || (async () => {})}
                                onUpdateLeaveStatus={props.onUpdateLeaveStatus || (async () => {})}
                                onEditUser={props.onEditUser || (async () => {})}
                                onDeleteUser={props.onDeleteUser || (async () => {})}
                                activeTab={hrSubTab}
                                setActiveTab={setHrSubTab}
                            />
                        </React.Suspense>
                    </div>
                )}

                {activeTab === 'billing' && isDrivingSchool && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* DS Invoice creation modal/drawer */}
                        {isCreatingDsInvoice ? (
                            <div className="lg:col-span-3 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                                <div className="flex justify-between items-center pb-4 border-b">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Create Driving School Invoice</h3>
                                    <button onClick={() => setIsCreatingDsInvoice(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><XIcon className="w-5 h-5" /></button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Select Student</label>
                                        <select 
                                            value={dsFormStudentId} 
                                            onChange={e => setDsFormStudentId(e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                        >
                                            <option value="">Choose Registered Student</option>
                                            {props.students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phoneNumber})</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Select Class / Course Category</label>
                                        <select 
                                            value={dsFormClass} 
                                            onChange={e => handleDsClassTemplateSelect(e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                        >
                                            <option value="">Select Category Template</option>
                                            {dsFeeStructures.map(f => <option key={f.id} value={f.className}>{f.className}</option>)}
                                            <option value="General Class">General Class (Manual Presets)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Due Date</label>
                                        <input 
                                            type="date" 
                                            value={dsFormDueDate} 
                                            onChange={e => setDsFormDueDate(e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Dynamic items list for DS Invoice */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itemized Voteheads & Amounts</h5>
                                        <button 
                                            type="button" 
                                            onClick={() => setDsFormItems(prev => [...prev, { name: '', amount: 0, priority: prev.length + 1 }])}
                                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100"
                                        >
                                            + Add Item
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {dsFormItems.map((item, idx) => (
                                            <div key={idx} className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border">
                                                <input 
                                                    type="text" 
                                                    value={item.name} 
                                                    placeholder="e.g. Tuition Fee" 
                                                    onChange={e => {
                                                        const copy = [...dsFormItems];
                                                        copy[idx].name = e.target.value;
                                                        setDsFormItems(copy);
                                                    }}
                                                    className="flex-[3] px-4 py-2 bg-white rounded-xl outline-none border font-bold text-sm"
                                                />
                                                <input 
                                                    type="number" 
                                                    value={item.amount} 
                                                    placeholder="Amount" 
                                                    onChange={e => {
                                                        const copy = [...dsFormItems];
                                                        copy[idx].amount = Number(e.target.value);
                                                        setDsFormItems(copy);
                                                    }}
                                                    className="flex-[2] px-4 py-2 bg-white rounded-xl outline-none border font-bold text-sm"
                                                />
                                                <input 
                                                    type="number" 
                                                    value={item.priority} 
                                                    placeholder="Priority" 
                                                    onChange={e => {
                                                        const copy = [...dsFormItems];
                                                        copy[idx].priority = Number(e.target.value);
                                                        setDsFormItems(copy);
                                                    }}
                                                    className="flex-[1] px-4 py-2 bg-white rounded-xl outline-none border font-bold text-sm"
                                                    title="Priority weight (lowest priority gets paid first)"
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => setDsFormItems(prev => prev.filter((_, i) => i !== idx))}
                                                    className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-right font-black text-slate-800 text-lg">
                                        Total Amount: KES {dsFormItems.reduce((s, it) => s + (it.amount || 0), 0)?.toLocaleString()}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Invoice Remarks / Notes</label>
                                    <textarea 
                                        rows={3} 
                                        value={dsFormNotes}
                                        onChange={e => setDsFormNotes(e.target.value)}
                                        placeholder="Add payment installments instructions or terms..." 
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm resize-none"
                                    />
                                </div>

                                <div className="flex gap-4 justify-end pt-4">
                                    <button onClick={() => setIsCreatingDsInvoice(false)} className="px-6 py-3 bg-slate-100 rounded-xl font-bold hover:bg-slate-200">Cancel</button>
                                    <button onClick={handleCreateDsInvoice} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-wider hover:bg-indigo-700 shadow-md">Generate Invoice</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Left column: Invoices list */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Driving School Invoices</h3>
                                                <p className="text-xs font-bold text-slate-400">Total configured ledgers: {dsInvoices.length}</p>
                                            </div>
                                            <button 
                                                onClick={() => setIsCreatingDsInvoice(true)}
                                                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 shadow-md transition-all"
                                            >
                                                + New Invoice
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Invoice #</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Student</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Course / Class</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Total</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Balance</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {dsInvoices.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="py-8 text-center text-xs font-medium text-slate-400">No driving school invoices found.</td>
                                                        </tr>
                                                    ) : (
                                                        dsInvoices.map((inv) => (
                                                            <tr 
                                                                key={inv.id} 
                                                                onClick={() => setSelectedDsInvoice(inv)}
                                                                className={`cursor-pointer hover:bg-slate-50/50 transition-colors ${selectedDsInvoice?.id === inv.id ? 'bg-indigo-50/40 font-bold' : ''}`}
                                                            >
                                                                <td className="py-4 text-xs font-black text-indigo-600">{inv.invoiceNumber || inv.invoice_number || inv.id}</td>
                                                                <td className="py-4 text-xs">{inv.studentName || 'Student'}</td>
                                                                <td className="py-4 text-xs text-slate-500">{inv.className}</td>
                                                                <td className="py-4 text-xs text-right">KES {inv.totalAmount?.toLocaleString()}</td>
                                                                <td className="py-4 text-xs text-right font-bold text-slate-900">KES {inv.balance?.toLocaleString()}</td>
                                                                <td className="py-4 text-xs">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                                        inv.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-700' :
                                                                        inv.status === 'Partially Paid' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                                    }`}>
                                                                        {inv.status}
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

                                {/* Right column: Details panel / Payment execution */}
                                <div className="lg:col-span-1 space-y-6">
                                    {selectedDsInvoice ? (
                                        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6 animate-in slide-in-from-right duration-300">
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">Invoice Details</p>
                                                <h4 className="text-xl font-black text-slate-900 tracking-tight">{selectedDsInvoice.invoiceNumber}</h4>
                                                <p className="text-xs font-medium text-slate-400">{selectedDsInvoice.studentName}</p>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex justify-between border-b pb-2 text-xs">
                                                    <span className="text-slate-400">Class / Category</span>
                                                    <span className="font-bold">{selectedDsInvoice.className}</span>
                                                </div>
                                                <div className="flex justify-between border-b pb-2 text-xs">
                                                    <span className="text-slate-400">Total Billed</span>
                                                    <span className="font-bold">KES {selectedDsInvoice.totalAmount?.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between border-b pb-2 text-xs">
                                                    <span className="text-slate-400">Total Paid</span>
                                                    <span className="font-bold text-emerald-600">KES {selectedDsInvoice.paidAmount?.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between border-b pb-2 text-xs">
                                                    <span className="text-slate-400">Outstanding Balance</span>
                                                    <span className="font-black text-rose-600">KES {selectedDsInvoice.balance?.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Itemized list of votes & payment distribution */}
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itemized Vote Settlement</p>
                                                <div className="space-y-2">
                                                    {(selectedDsInvoice.items || []).map((it: any, idx: number) => {
                                                        const bal = it.amount - (it.paidAmount || 0);
                                                        const pRate = it.amount > 0 ? ((it.paidAmount || 0) / it.amount) * 100 : 0;
                                                        return (
                                                            <div key={idx} className="bg-slate-50 p-3 rounded-xl space-y-1">
                                                                <div className="flex justify-between text-xs font-bold">
                                                                    <span className="text-slate-700">{it.name} <span className="text-[9px] text-slate-400 font-normal">(Priority {it.priority || 10})</span></span>
                                                                    <span>KES {it.paidAmount || 0} / {it.amount}</span>
                                                                </div>
                                                                <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-indigo-600" style={{ width: `${pRate}%` }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Record Payment Form */}
                                            {isRecordingDsPayment ? (
                                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                                                    <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Record Payment</h5>
                                                    <div className="space-y-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Amount Paid (KES)</label>
                                                            <input 
                                                                type="number" 
                                                                value={dsPayAmount} 
                                                                onChange={e => setDsPayAmount(Number(e.target.value))}
                                                                className="w-full px-4 py-2 rounded-xl border outline-none font-bold text-sm bg-white"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Payment Method</label>
                                                            <select 
                                                                value={dsPayMethod} 
                                                                onChange={e => setDsPayMethod(e.target.value)}
                                                                className="w-full px-4 py-2 rounded-xl border outline-none font-bold text-xs bg-white"
                                                            >
                                                                <option>M-Pesa</option>
                                                                <option>Cash</option>
                                                                <option>Bank Transfer</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Transaction Ref / Receipt #</label>
                                                            <input 
                                                                type="text" 
                                                                value={dsPayReference} 
                                                                placeholder="e.g. QWE123RTY"
                                                                onChange={e => setDsPayReference(e.target.value)}
                                                                className="w-full px-4 py-2 rounded-xl border outline-none font-bold text-xs bg-white"
                                                            />
                                                        </div>
                                                        <div className="flex gap-2 pt-2">
                                                            <button onClick={() => setIsRecordingDsPayment(false)} className="flex-1 py-2 bg-white border rounded-xl text-xs font-bold hover:bg-slate-100">Cancel</button>
                                                            <button onClick={handleRecordDsPayment} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700">Submit</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                selectedDsInvoice.balance > 0 && (
                                                    <button 
                                                        onClick={() => { setIsRecordingDsPayment(true); setDsPayAmount(selectedDsInvoice.balance); }}
                                                        className="w-full py-4 bg-slate-900 text-white hover:bg-indigo-600 transition-colors rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md"
                                                    >
                                                        Record Payment Receive
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 p-8 rounded-[3rem] border border-dashed border-slate-200 text-center text-xs font-medium text-slate-400 py-16">
                                            Select an invoice from the ledger list to manage receipts or view priority allocations.
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Expenditure Log takes full width */}
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm min-h-full">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Expenditure Log</h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{(props.expenses || []).length} expense records</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowRecordExpenseModal(true)}
                                    className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-650 transition-all shadow-md flex items-center gap-1.5"
                                >
                                    💸 Post Expense
                                </button>
                            </div>
                            <div className="space-y-4">
                                {(props.expenses || []).map((exp, i) => {
                                    const vh = (props.voteHeads || []).find(v => v.id === exp.voteHeadId || v.id === (exp as any).vote_head_id);
                                    const vhName = vh ? vh.name : 'General Expense';
                                    const bank = (bankAccounts || []).find(b => b.id === exp.bankAccountId || b.id === (exp as any).bank_account_id);
                                    const bankDetails = bank ? `${bank.bankName || bank.bank_name} - A/C ${bank.accountNumber || bank.account_number}` : 'Unspecified Bank';
                                    
                                    return (
                                        <div key={i} className="flex justify-between items-center p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100/50 transition-all group">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                    <BanknotesIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{exp.description}</p>
                                                    <p className="text-[9px] font-bold text-slate-500 mt-1 flex flex-wrap gap-1.5">
                                                        <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-black">
                                                            🗳️ {vhName}
                                                        </span>
                                                        <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-black">
                                                            🏦 {bankDetails}
                                                        </span>
                                                        {exp.payeeName && (
                                                            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-black">
                                                                👤 To: {exp.payeeName}
                                                            </span>
                                                        )}
                                                        {(exp.signatureData || (exp as any).signature_data) && (
                                                            <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-black">
                                                                ✍️ Signed
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{exp.category} • {exp.date} • Method: {exp.paymentMethod || 'Cash'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <div>
                                                    <p className="text-sm font-black text-rose-600">-KES {(exp.amount ?? 0)?.toLocaleString()}</p>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Voucher: {exp.referenceNumber || 'N/A'}</p>
                                                </div>
                                                <button
                                                    onClick={() => pdfService.downloadExpenseVoucherPdf(
                                                        exp,
                                                        vhName,
                                                        bankDetails,
                                                        props.institution,
                                                        props.companyDetails || {} as any,
                                                        props.institution.logoUrl || null,
                                                        null
                                                    )}
                                                    className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-1"
                                                >
                                                    📄 Print Voucher
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {(props.expenses || []).length === 0 && (
                                    <div className="py-12 text-center text-slate-400 font-medium">
                                        No expenses recorded. Click "Post Expense" to add your first transaction.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'transfers' && (
                    <div className="space-y-8 animate-in fade-in duration-200">
                        <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <button
                                onClick={() => setTransfersSubTab('bank')}
                                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                                    transfersSubTab === 'bank'
                                        ? 'bg-slate-900 text-white dark:bg-indigo-650'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                💵 Inter-Bank Transfers
                            </button>
                            <button
                                onClick={() => setTransfersSubTab('vote')}
                                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                                    transfersSubTab === 'vote'
                                        ? 'bg-slate-900 text-white dark:bg-indigo-650'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                📊 Inter-Vote Transfers
                            </button>
                        </div>

                        {transfersSubTab === 'bank' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-150 dark:border-slate-800/60 shadow-sm space-y-6 text-left">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Transfer Funds</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Move funds between registered bank accounts</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Source Account *</label>
                                            <select
                                                value={bankTransferSourceId}
                                                onChange={e => setBankTransferSourceId(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                                            >
                                                <option value="">-- Choose Source --</option>
                                                {bankAccounts.map(ba => (
                                                    <option key={ba.id} value={ba.id}>
                                                        {ba.bankName} - {ba.accountNumber} ({ba.accountName})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Destination Account *</label>
                                            <select
                                                value={bankTransferDestId}
                                                onChange={e => setBankTransferDestId(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                                            >
                                                <option value="">-- Choose Destination --</option>
                                                {bankAccounts.map(ba => (
                                                    <option key={ba.id} value={ba.id}>
                                                        {ba.bankName} - {ba.accountNumber} ({ba.accountName})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Amount (KES) *</label>
                                            <input
                                                type="number"
                                                placeholder="Enter amount"
                                                value={bankTransferAmount || ''}
                                                onChange={e => setBankTransferAmount(Number(e.target.value))}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Transfer Date *</label>
                                            <input
                                                type="date"
                                                value={bankTransferDate}
                                                onChange={e => setBankTransferDate(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Ref Number / Slip Code</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. TXN-100234"
                                                value={bankTransferRef}
                                                onChange={e => setBankTransferRef(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Notes</label>
                                            <textarea
                                                placeholder="Add transfer notes..."
                                                value={bankTransferNotes}
                                                onChange={e => setBankTransferNotes(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs h-20 resize-none"
                                            />
                                        </div>

                                        <button
                                            onClick={handlePostBankTransfer}
                                            disabled={isSavingBankTransfer || !bankTransferSourceId || !bankTransferDestId || bankTransferAmount <= 0}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 transition-colors shadow-md mt-2"
                                        >
                                            {isSavingBankTransfer ? 'Processing...' : 'Complete Transfer'}
                                        </button>
                                    </div>
                                </div>

                                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-150 dark:border-slate-800/60 shadow-sm space-y-6 text-left">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Transfer History</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Logs of past inter-bank transfers</p>
                                    </div>

                                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                                        <table className="w-full text-xs font-semibold text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                                    <th className="p-4">Date</th>
                                                    <th className="p-4">Source Account</th>
                                                    <th className="p-4">Destination Account</th>
                                                    <th className="p-4">Reference</th>
                                                    <th className="p-4 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {isLoadingBankTransfers ? (
                                                    <tr>
                                                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">Loading transfers...</td>
                                                    </tr>
                                                ) : bankTransfersList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">No inter-bank transfers logged.</td>
                                                    </tr>
                                                ) : (
                                                    bankTransfersList.map(bt => {
                                                        const srcAcc = bankAccounts.find(ba => ba.id === bt.sourceBankAccountId);
                                                        const destAcc = bankAccounts.find(ba => ba.id === bt.destinationBankAccountId);
                                                        return (
                                                            <tr key={bt.id} className="hover:bg-slate-55/40 dark:hover:bg-slate-950/20">
                                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-350">{bt.transferDate}</td>
                                                                <td className="p-4">
                                                                    <div className="font-bold text-slate-900 dark:text-white">{srcAcc?.bankName || 'Unknown'}</div>
                                                                    <div className="text-[8px] font-black text-slate-400 tracking-wider">{srcAcc?.accountNumber}</div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="font-bold text-slate-900 dark:text-white">{destAcc?.bankName || 'Unknown'}</div>
                                                                    <div className="text-[8px] font-black text-slate-400 tracking-wider">{destAcc?.accountNumber}</div>
                                                                </td>
                                                                <td className="p-4 font-mono text-[10px] text-slate-500">{bt.referenceNumber || '—'}</td>
                                                                <td className="p-4 text-right font-black text-indigo-650 dark:text-indigo-400">KES {Number(bt.amount).toLocaleString()}</td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-150 dark:border-slate-800/60 shadow-sm space-y-6 text-left">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Transfer Budget</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Move allocated budget between vote heads</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Source Vote Head *</label>
                                            <select
                                                value={voteTransferSourceId}
                                                onChange={e => setVoteTransferSourceId(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                                            >
                                                <option value="">-- Choose Source --</option>
                                                {(props.voteHeads || []).map(vh => {
                                                    const budget = Number(vh.allocatedAmount || (vh as any).allocated_amount || 0);
                                                    return (
                                                        <option key={vh.id} value={vh.id}>
                                                            {vh.name} (Available: KES {budget.toLocaleString()})
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Destination Vote Head *</label>
                                            <select
                                                value={voteTransferDestId}
                                                onChange={e => setVoteTransferDestId(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                                            >
                                                <option value="">-- Choose Destination --</option>
                                                {(props.voteHeads || []).map(vh => {
                                                    const budget = Number(vh.allocatedAmount || (vh as any).allocated_amount || 0);
                                                    return (
                                                        <option key={vh.id} value={vh.id}>
                                                            {vh.name} (Current: KES {budget.toLocaleString()})
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Amount (KES) *</label>
                                            <input
                                                type="number"
                                                placeholder="Enter amount to transfer"
                                                value={voteTransferAmount || ''}
                                                onChange={e => setVoteTransferAmount(Number(e.target.value))}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Transfer Date *</label>
                                            <input
                                                type="date"
                                                value={voteTransferDate}
                                                onChange={e => setVoteTransferDate(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Ref Number / Board Resolution Code</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. MIN-12/2026"
                                                value={voteTransferRef}
                                                onChange={e => setVoteTransferRef(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Notes</label>
                                            <textarea
                                                placeholder="Add budget transfer rationale..."
                                                value={voteTransferNotes}
                                                onChange={e => setVoteTransferNotes(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs h-20 resize-none"
                                            />
                                        </div>

                                        <button
                                            onClick={handlePostVoteTransfer}
                                            disabled={isSavingVoteTransfer || !voteTransferSourceId || !voteTransferDestId || voteTransferAmount <= 0}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 transition-colors shadow-md mt-2"
                                        >
                                            {isSavingVoteTransfer ? 'Processing...' : 'Complete Budget Transfer'}
                                        </button>
                                    </div>
                                </div>

                                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-150 dark:border-slate-800/60 shadow-sm space-y-6 text-left">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Transfer History</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Logs of past inter-votehead budget transfers</p>
                                    </div>

                                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                                        <table className="w-full text-xs font-semibold text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                                    <th className="p-4">Date</th>
                                                    <th className="p-4">Source Vote Head</th>
                                                    <th className="p-4">Destination Vote Head</th>
                                                    <th className="p-4">Reference</th>
                                                    <th className="p-4 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {isLoadingVoteTransfers ? (
                                                    <tr>
                                                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">Loading transfers...</td>
                                                    </tr>
                                                ) : voteTransfersList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">No inter-vote transfers logged.</td>
                                                    </tr>
                                                ) : (
                                                    voteTransfersList.map(vt => {
                                                        const srcVH = (props.voteHeads || []).find(vh => vh.id === vt.sourceVoteHeadId);
                                                        const destVH = (props.voteHeads || []).find(vh => vh.id === vt.destinationVoteHeadId);
                                                        return (
                                                            <tr key={vt.id} className="hover:bg-slate-55/40 dark:hover:bg-slate-950/20">
                                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-350">{vt.transferDate}</td>
                                                                <td className="p-4 font-bold text-slate-900 dark:text-white">
                                                                    {srcVH?.name || 'Unknown Vote Head'}
                                                                </td>
                                                                <td className="p-4 font-bold text-slate-900 dark:text-white">
                                                                    {destVH?.name || 'Unknown Vote Head'}
                                                                </td>
                                                                <td className="p-4 font-mono text-[10px] text-slate-500">{vt.referenceNumber || '—'}</td>
                                                                <td className="p-4 text-right font-black text-indigo-650 dark:text-indigo-400">KES {Number(vt.amount).toLocaleString()}</td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'requisitions' && (
                    <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm">
                        <RetailRequisitions
                            institutionId={props.institution.id}
                            currentUser={props.currentUser}
                            retailStores={retailStores}
                            requisitions={props.requisitions || []}
                            inventory={inventory}
                            onAddRequisition={async () => {}}
                            onUpdateRequisition={props.onUpdateRequisition}
                            isEducation={isEduInstitution(props.institution)}
                            allUsers={allUsers}
                        />
                    </div>
                )}

                {activeTab === 'bursaries' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left column: Sub-Tabs & Forms */}
                        <div className="lg:col-span-1 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                            {/* Premium Sub-tabs navigation */}
                            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 gap-1">
                                <button
                                    onClick={() => setBursarySubTab('post_cheque')}
                                    className={`flex-1 py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                                        bursarySubTab === 'post_cheque'
                                            ? 'bg-white text-indigo-600 shadow-sm font-black'
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Post Cheque
                                </button>
                                <button
                                    onClick={() => setBursarySubTab('initiate_app')}
                                    className={`flex-1 py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                                        bursarySubTab === 'initiate_app'
                                            ? 'bg-white text-indigo-600 shadow-sm font-black'
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Initiate CDF App
                                </button>
                            </div>

                            {bursarySubTab === 'post_cheque' ? (
                                <>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Record NG-CDF Cheque</h3>
                                        <p className="text-xs text-slate-400 font-medium">Post government bursary allocations directly to student accounts.</p>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {/* Student Search */}
                                        <div className="space-y-1 relative">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Search Student</label>
                                            <input 
                                                type="text"
                                                placeholder="Type student name or admission number..."
                                                value={bursaryStudentSearch}
                                                onChange={e => {
                                                    setBursaryStudentSearch(e.target.value);
                                                    if (bursaryStudentId) setBursaryStudentId('');
                                                }}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                            />
                                            {bursaryStudentSearch && !bursaryStudentId && (
                                                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-150 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                                                    {filteredStudents.length === 0 ? (
                                                        <div className="p-4 text-xs text-slate-400 font-medium">No students matched.</div>
                                                    ) : (
                                                        filteredStudents.map(student => (
                                                            <button
                                                                key={student.id}
                                                                onClick={() => {
                                                                    setBursaryStudentId(student.id);
                                                                    setBursaryStudentSearch(`${student.name} (${student.admissionNumber || student.admission_number || 'No Adm'})`);
                                                                }}
                                                                className="w-full p-4 hover:bg-slate-50 text-left text-xs font-bold text-slate-700 flex flex-col"
                                                            >
                                                                <span>{student.name}</span>
                                                                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Adm: {student.admissionNumber || student.admission_number || '—'}</span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Constituency */}
                                        <div className="space-y-1 relative">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">NG-CDF / Constituency Name</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. Kigumo"
                                                value={bursaryConstituency}
                                                onChange={e => {
                                                    setBursaryConstituency(e.target.value);
                                                    setConstituencyDropdown1Open(true);
                                                }}
                                                onFocus={() => setConstituencyDropdown1Open(true)}
                                                onBlur={() => setTimeout(() => setConstituencyDropdown1Open(false), 200)}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                            />
                                            {constituencyDropdown1Open && bursaryConstituency && (
                                                <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                                    {constituencyList.filter(c => 
                                                        c.name?.toLowerCase().includes(bursaryConstituency.toLowerCase())
                                                    ).length === 0 ? (
                                                        <div className="p-4 text-xs text-slate-400 font-medium">No matching constituencies.</div>
                                                    ) : (
                                                        constituencyList.filter(c => 
                                                            c.name?.toLowerCase().includes(bursaryConstituency.toLowerCase())
                                                        ).map(con => (
                                                            <button
                                                                key={con.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setBursaryConstituency(con.name);
                                                                    setConstituencyDropdown1Open(false);
                                                                }}
                                                                className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left text-xs font-bold text-slate-700 dark:text-slate-300 flex flex-col"
                                                            >
                                                                <span>{con.name}</span>
                                                                {con.code && <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Code: {con.code}</span>}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Financial Year */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Financial Year</label>
                                            <select 
                                                value={bursaryFY}
                                                onChange={e => setBursaryFY(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                            >
                                                <option value="2025/2026">2025/2026</option>
                                                <option value="2026/2027">2026/2027</option>
                                                <option value="2027/2028">2027/2028</option>
                                            </select>
                                        </div>

                                        {/* Cheque Number */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Cheque / EFT Reference Number</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. CHQ-981273"
                                                value={bursaryChequeNumber}
                                                onChange={e => setBursaryChequeNumber(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                            />
                                        </div>

                                        {/* Amount */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Amount (KES)</label>
                                            <input 
                                                type="number" 
                                                placeholder="Amount in KES"
                                                value={bursaryAmount}
                                                onChange={e => setBursaryAmount(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                            />
                                        </div>

                                        {/* Bank Account */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Destination Bank Account</label>
                                            <select 
                                                value={bursaryBankAccountId}
                                                onChange={e => setBursaryBankAccountId(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm cursor-pointer"
                                            >
                                                <option value="">-- Select Bank Account (Optional) --</option>
                                                {bankAccounts.map(ba => (
                                                    <option key={ba.id} value={ba.id}>
                                                        {ba.bankName} - {ba.accountNumber} ({ba.accountName})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Notes */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Allocations Remarks / Notes</label>
                                            <textarea 
                                                rows={3} 
                                                placeholder="Brief comments/vouching status..."
                                                value={bursaryNotes}
                                                onChange={e => setBursaryNotes(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm resize-none"
                                            />
                                        </div>

                                        <button
                                            onClick={handlePostBursaryCheque}
                                            disabled={isSavingBursary}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                                        >
                                            {isSavingBursary ? "Processing Settlement..." : "Post Bursary Cheque →"}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Initiate CDF Application</h3>
                                        <p className="text-xs text-slate-400 font-medium">Submit a digital bursary request on behalf of a parent or student to the CDF board.</p>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {/* Student Search */}
                                        <div className="space-y-1 relative">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Select Student</label>
                                            <input 
                                                type="text"
                                                placeholder="Type student name or admission number..."
                                                value={bursaryStudentSearch}
                                                onChange={e => {
                                                    setBursaryStudentSearch(e.target.value);
                                                    if (bursaryStudentId) setBursaryStudentId('');
                                                }}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                            />
                                            {bursaryStudentSearch && !bursaryStudentId && (
                                                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-150 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                                                    {filteredStudents.length === 0 ? (
                                                        <div className="p-4 text-xs text-slate-400 font-medium">No students matched.</div>
                                                    ) : (
                                                        filteredStudents.map(student => (
                                                            <button
                                                                key={student.id}
                                                                onClick={() => {
                                                                    setBursaryStudentId(student.id);
                                                                    setBursaryStudentSearch(`${student.name} (${student.admissionNumber || student.admission_number || 'No Adm'})`);
                                                                }}
                                                                className="w-full p-4 hover:bg-slate-50 text-left text-xs font-bold text-slate-700 flex flex-col"
                                                            >
                                                                <span>{student.name}</span>
                                                                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Adm: {student.admissionNumber || student.admission_number || '—'}</span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Target Constituency */}
                                        <div className="space-y-1 relative">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Target Constituency Name</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. Kigumo"
                                                value={bursaryConstituency}
                                                onChange={e => {
                                                    setBursaryConstituency(e.target.value);
                                                    setConstituencyDropdown2Open(true);
                                                }}
                                                onFocus={() => setConstituencyDropdown2Open(true)}
                                                onBlur={() => setTimeout(() => setConstituencyDropdown2Open(false), 200)}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                            />
                                            {constituencyDropdown2Open && bursaryConstituency && (
                                                <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                                    {constituencyList.filter(c => 
                                                        c.name?.toLowerCase().includes(bursaryConstituency.toLowerCase())
                                                    ).length === 0 ? (
                                                        <div className="p-4 text-xs text-slate-400 font-medium">No matching constituencies.</div>
                                                    ) : (
                                                        constituencyList.filter(c => 
                                                            c.name?.toLowerCase().includes(bursaryConstituency.toLowerCase())
                                                        ).map(con => (
                                                            <button
                                                                key={con.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setBursaryConstituency(con.name);
                                                                    setConstituencyDropdown2Open(false);
                                                                }}
                                                                className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left text-xs font-bold text-slate-700 dark:text-slate-300 flex flex-col"
                                                            >
                                                                <span>{con.name}</span>
                                                                {con.code && <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Code: {con.code}</span>}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Financial Year */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Financial Year</label>
                                            <select 
                                                value={bursaryFY}
                                                onChange={e => setBursaryFY(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                            >
                                                <option value="2025/2026">2025/2026</option>
                                                <option value="2026/2027">2026/2027</option>
                                                <option value="2027/2028">2027/2028</option>
                                            </select>
                                        </div>

                                        {/* Amount Requested */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Amount Requested (KES)</label>
                                            <input 
                                                type="number" 
                                                placeholder="Amount in KES"
                                                value={bursaryAmount}
                                                onChange={e => setBursaryAmount(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                            />
                                        </div>

                                        {/* Application Notes */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Application Remarks / Notes</label>
                                            <textarea 
                                                rows={3} 
                                                placeholder="Describe justification or special circumstances..."
                                                value={bursaryNotes}
                                                onChange={e => setBursaryNotes(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm resize-none"
                                            />
                                        </div>

                                        <button
                                            onClick={handleInitiateBursaryApplication}
                                            disabled={isSavingBursary}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                                        >
                                            {isSavingBursary ? "Submitting Request..." : "Submit CDF Application →"}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Right column: Ledger list */}
                        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Postings Ledger</h3>
                                <p className="text-xs text-slate-400 font-medium">History of allocated government bursary allocations.</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Student</th>
                                            <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Constituency</th>
                                            <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Cheque #</th>
                                            <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Amount</th>
                                            <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</th>
                                            <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Date posted</th>
                                            <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Vetted By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {bursaryRecords.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-xs font-medium text-slate-400">No bursaries recorded in the ledger yet.</td>
                                            </tr>
                                        ) : (
                                            bursaryRecords.map(rec => (
                                                <tr key={rec.id}>
                                                    <td className="py-4 text-xs font-bold text-slate-900">{rec.studentName}</td>
                                                    <td className="py-4 text-xs text-slate-500">{rec.constituencyName}</td>
                                                    <td className="py-4 text-xs font-mono text-indigo-600">{rec.chequeNumber || '—'}</td>
                                                    <td className="py-4 text-xs text-right font-black text-slate-800">KES {(rec.amountApproved || rec.amountRequested || 0)?.toLocaleString()}</td>
                                                    <td className="py-4 text-xs">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                            rec.status === 'disbursed' || rec.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                            rec.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                        }`}>
                                                            {rec.status || 'pending'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 text-xs text-slate-400">{rec.disbursedAt ? new Date(rec.disbursedAt).toLocaleDateString() : (rec.appliedAt ? new Date(rec.appliedAt).toLocaleDateString() : '—')}</td>
                                                    <td className="py-4 text-xs font-medium text-slate-500">{rec.vettedBy || '—'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}


                {activeTab === 'audit' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Sub-tab toggle */}
                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={() => setAuditSubTab('audit_dashboard')}
                                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                    auditSubTab === 'audit_dashboard'
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                🔍 Automated Audit
                            </button>
                            <button
                                onClick={() => setAuditSubTab('annual_report')}
                                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                    auditSubTab === 'annual_report'
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                📄 Annual Financial Report (MOE)
                            </button>
                        </div>

                        {auditSubTab === 'audit_dashboard' && (
                            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                <FinancialAuditDashboard
                                    invoices={props.invoices}
                                    receipts={props.receipts}
                                    expenses={props.expenses}
                                    institutionId={props.institution.id}
                                />
                            </div>
                        )}

                        {auditSubTab === 'annual_report' && (
                            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                <AnnualReportWizard
                                    invoices={props.invoices}
                                    receipts={props.receipts}
                                    expenses={props.expenses}
                                    institution={props.institution}
                                    companyDetails={props.companyDetails}
                                />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-8 animate-in fade-in duration-300 text-left overflow-y-auto max-h-[calc(100vh-180px)] pr-2 custom-scrollbar">
                        {/* Clean Page Title Header */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Institutional settings</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Manage opening balances, academic years, calendars, and organizational branding.</p>
                            </div>
                            {isDrivingSchool && (
                                <div className="flex gap-2 bg-slate-100 dark:bg-slate-850 p-1.5 rounded-2xl w-fit">
                                    {settingsSubTabs.map(sub => (
                                        <button
                                            key={sub.id}
                                            onClick={() => setSettingsSubTab(sub.id as any)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                settingsSubTab === sub.id
                                                ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md'
                                                : 'text-slate-500 hover:text-indigo-650'
                                            }`}
                                        >
                                            {sub.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Subtab content: Opening Balance */}
                        {settingsSubTab === 'opening_balance' && (
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6 text-left">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="relative flex-1">
                                        <SearchIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search student by name or admission number..."
                                            value={openingBalanceSearch}
                                            onChange={(e) => setOpeningBalanceSearch(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <select
                                        value={openingBalanceClassFilter}
                                        onChange={(e) => setOpeningBalanceClassFilter(e.target.value)}
                                        className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl outline-none font-bold text-slate-750 text-sm"
                                    >
                                        <option value="All">All Classes</option>
                                        {Array.from(new Set(props.students.map(s => studentClassGroup(s)))).map(cls => (
                                            <option key={cls} value={cls}>{cls}</option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setShowImporter(true)}
                                            className="px-5 py-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-650 hover:text-white transition-all flex items-center gap-2 border border-emerald-100 dark:border-emerald-900/50"
                                        >
                                            <ArrowUpTrayIcon className="w-4 h-4" />
                                            Import Excel
                                        </button>
                                        <button 
                                            onClick={handleSaveOpeningBalances}
                                            disabled={isSavingBalances}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50"
                                        >
                                            {isSavingBalances ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-3xl">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-850">
                                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Adm Number</th>
                                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Class</th>
                                                <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest w-48">Opening Balance (KSh)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                                            {filteredOpeningBalanceStudents.map(student => (
                                                <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-black text-slate-900 dark:text-white">{student.name}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-semibold text-slate-500">{student.admissionNumber || student.admission_number || '—'}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{studentClassGroup(student)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <input
                                                            type="number"
                                                            value={openingBalancesMap[student.id] || ''}
                                                            onChange={(e) => setOpeningBalancesMap(prev => ({
                                                                ...prev,
                                                                [student.id]: Number(e.target.value)
                                                            }))}
                                                            placeholder="0.00"
                                                            className="w-full max-w-[150px] text-right px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredOpeningBalanceStudents.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="py-8 text-center text-xs text-slate-400">No students matched the filters.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Subtab content: Grades & Streams */}
                        {settingsSubTab === 'grades_streams' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left animate-in fade-in duration-300">
                                {/* Left Column: Grades / Courses */}
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Grade Levels (Courses)</h3>
                                        <button 
                                            onClick={() => {
                                                setIsCreatingGrade(!isCreatingGrade);
                                                setNewGradeName('');
                                                setNewGradeCode('');
                                                setEditingGradeId(null);
                                            }}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            {isCreatingGrade ? 'Cancel' : 'Add Grade'}
                                        </button>
                                    </div>

                                    {/* Add Grade Form */}
                                    {isCreatingGrade && (
                                        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">New Grade Level Details</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Grade Name</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. Grade 3" 
                                                        value={newGradeName}
                                                        onChange={e => setNewGradeName(e.target.value)}
                                                        className="w-full mt-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:ring-2 focus:ring-indigo-550 text-xs font-bold text-slate-855 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Code</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. G3" 
                                                        value={newGradeCode}
                                                        onChange={e => setNewGradeCode(e.target.value)}
                                                        className="w-full mt-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-xl outline-none focus:ring-2 focus:ring-indigo-550 text-xs font-bold text-slate-855 dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    if (!newGradeName || !newGradeCode) return alert("Please fill in both fields.");
                                                    const newCourse: Course = {
                                                        id: `course_${Date.now()}`,
                                                        name: newGradeName,
                                                        code: newGradeCode,
                                                        institutionId: props.institution.id,
                                                        departmentId: '',
                                                        academicLevelId: '',
                                                        levels: []
                                                    };
                                                    try {
                                                        await apiService.saveModuleRecord('courses', newCourse);
                                                        const updated = await apiService.fetchModuleRecords<Course>('courses', props.institution.id);
                                                        setLocalCourses(updated || []);
                                                        setIsCreatingGrade(false);
                                                        setNewGradeName('');
                                                        setNewGradeCode('');
                                                        alert("Grade added successfully!");
                                                    } catch (err) {
                                                        console.error("Failed to add grade:", err);
                                                        alert("Failed to add grade.");
                                                    }
                                                }}
                                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20"
                                            >
                                                Create Grade Level
                                            </button>
                                        </div>
                                    )}

                                    {/* Grades List */}
                                    <div className="space-y-3">
                                        {localCourses.map(course => {
                                            const isEditing = editingGradeId === course.id;
                                            const isSelected = selectedGradeForStreams?.id === course.id;
                                            return (
                                                <div 
                                                    key={course.id}
                                                    onClick={() => setSelectedGradeForStreams(course)}
                                                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-3 ${
                                                        isSelected 
                                                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 shadow-sm'
                                                        : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-100 dark:border-slate-850 hover:bg-slate-100/30 dark:hover:bg-slate-900/20'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        {isEditing ? (
                                                            <div className="flex-1 space-y-3 pr-4" onClick={e => e.stopPropagation()}>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <input 
                                                                        type="text" 
                                                                        value={editGradeName}
                                                                        onChange={e => setEditGradeName(e.target.value)}
                                                                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    />
                                                                    <input 
                                                                        type="text" 
                                                                        value={editGradeCode}
                                                                        onChange={e => setEditGradeCode(e.target.value)}
                                                                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    />
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={async () => {
                                                                            if (!editGradeName || !editGradeCode) return alert("Fill in fields.");
                                                                            try {
                                                                                await apiService.updateModuleRecord('courses', course.id, { name: editGradeName, code: editGradeCode });
                                                                                const updated = await apiService.fetchModuleRecords<Course>('courses', props.institution.id);
                                                                                setLocalCourses(updated || []);
                                                                                setEditingGradeId(null);
                                                                                if (selectedGradeForStreams?.id === course.id) {
                                                                                    setSelectedGradeForStreams(updated.find(c => c.id === course.id) || null);
                                                                                }
                                                                            } catch (err) {
                                                                                console.error(err);
                                                                            }
                                                                        }}
                                                                        className="px-3 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setEditingGradeId(null)}
                                                                        className="px-3 py-1 bg-slate-300 text-slate-700 rounded text-[10px] font-bold"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <p className="text-sm font-black text-slate-800 dark:text-white">{course.name}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Code: {course.code}</p>
                                                            </div>
                                                        )}

                                                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingGradeId(course.id);
                                                                    setEditGradeName(course.name);
                                                                    setEditGradeCode(course.code || '');
                                                                }}
                                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                                                            >
                                                                <PencilIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={async () => {
                                                                    if (!window.confirm("Are you sure you want to delete this grade?")) return;
                                                                    try {
                                                                        await apiService.deleteModuleRecord('courses', course.id);
                                                                        const updated = await apiService.fetchModuleRecords<Course>('courses', props.institution.id);
                                                                        setLocalCourses(updated || []);
                                                                        if (selectedGradeForStreams?.id === course.id) {
                                                                            setSelectedGradeForStreams(null);
                                                                        }
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                    }
                                                                }}
                                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                        {(course.levels || []).map(lvl => (
                                                            <span key={lvl.id} className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-750">
                                                                {lvl.name}
                                                            </span>
                                                        ))}
                                                        {(course.levels || []).length === 0 && (
                                                            <span className="text-[9px] text-slate-400 font-bold italic">No streams allocated</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {localCourses.length === 0 && (
                                            <div className="py-12 text-center text-slate-400 text-xs font-medium">
                                                No grade levels registered. Click "Add Grade" to set one up.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column: Streams management */}
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                                    {selectedGradeForStreams ? (
                                        <div className="space-y-6">
                                            <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Streams for {selectedGradeForStreams.name}</h3>
                                                <p className="text-xs text-slate-500 font-semibold mt-0.5">Define stream names or divisions assigned to this grade level.</p>
                                            </div>

                                            {/* Add Stream Section */}
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Add new stream (e.g. East)"
                                                    value={newStreamName}
                                                    onChange={e => setNewStreamName(e.target.value)}
                                                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-white"
                                                />
                                                <button 
                                                    onClick={async () => {
                                                        if (!newStreamName) return alert("Enter stream name.");
                                                        const newLevel = {
                                                            id: `lvl_${Date.now()}`,
                                                            name: newStreamName,
                                                            subjectIds: [],
                                                            subjectMetadata: []
                                                        };
                                                        const updatedLevels = [...(selectedGradeForStreams.levels || []), newLevel];
                                                        try {
                                                            await apiService.updateModuleRecord('courses', selectedGradeForStreams.id, { levels: updatedLevels });
                                                            const updated = await apiService.fetchModuleRecords<Course>('courses', props.institution.id);
                                                            setLocalCourses(updated || []);
                                                            const activeCourse = updated.find(c => c.id === selectedGradeForStreams.id);
                                                            if (activeCourse) setSelectedGradeForStreams(activeCourse);
                                                            setNewStreamName('');
                                                        } catch (err) {
                                                            console.error(err);
                                                        }
                                                    }}
                                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 whitespace-nowrap"
                                                >
                                                    Add Stream
                                                </button>
                                            </div>

                                            {/* Streams List */}
                                            <div className="space-y-2">
                                                {(selectedGradeForStreams.levels || []).map(lvl => {
                                                    const isEditingStream = editingStreamId === lvl.id;
                                                    return (
                                                        <div key={lvl.id} className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl">
                                                            {isEditingStream ? (
                                                                <div className="flex items-center gap-2 flex-1 pr-4">
                                                                    <input 
                                                                        type="text" 
                                                                        value={editStreamName}
                                                                        onChange={e => setEditStreamName(e.target.value)}
                                                                        className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    />
                                                                    <button 
                                                                        onClick={async () => {
                                                                            if (!editStreamName) return;
                                                                            const updatedLevels = (selectedGradeForStreams.levels || []).map(l => 
                                                                                l.id === lvl.id ? { ...l, name: editStreamName } : l
                                                                            );
                                                                            try {
                                                                                await apiService.updateModuleRecord('courses', selectedGradeForStreams.id, { levels: updatedLevels });
                                                                                const updated = await apiService.fetchModuleRecords<Course>('courses', props.institution.id);
                                                                                setLocalCourses(updated || []);
                                                                                const activeCourse = updated.find(c => c.id === selectedGradeForStreams.id);
                                                                                if (activeCourse) setSelectedGradeForStreams(activeCourse);
                                                                                setEditingStreamId(null);
                                                                            } catch (err) {
                                                                                console.error(err);
                                                                            }
                                                                        }}
                                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setEditingStreamId(null)}
                                                                        className="px-3 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg text-[10px] font-bold transition-all"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{lvl.name}</span>
                                                                    <div className="flex gap-1">
                                                                        <button 
                                                                            onClick={() => {
                                                                                setEditingStreamId(lvl.id);
                                                                                setEditStreamName(lvl.name);
                                                                            }}
                                                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                                                                        >
                                                                            <PencilIcon className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button 
                                                                            onClick={async () => {
                                                                                if (!window.confirm("Are you sure you want to delete this stream?")) return;
                                                                                const updatedLevels = (selectedGradeForStreams.levels || []).filter(l => l.id !== lvl.id);
                                                                                try {
                                                                                    await apiService.updateModuleRecord('courses', selectedGradeForStreams.id, { levels: updatedLevels });
                                                                                    const updated = await apiService.fetchModuleRecords<Course>('courses', props.institution.id);
                                                                                    setLocalCourses(updated || []);
                                                                                    const activeCourse = updated.find(c => c.id === selectedGradeForStreams.id);
                                                                                    if (activeCourse) setSelectedGradeForStreams(activeCourse);
                                                                                } catch (err) {
                                                                                    console.error(err);
                                                                                }
                                                                            }}
                                                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                                                        >
                                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {(selectedGradeForStreams.levels || []).length === 0 && (
                                                    <div className="py-8 text-center text-slate-450 text-xs font-semibold italic">
                                                        No streams configured for this grade level.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full min-h-[300px] flex flex-col justify-center items-center text-center p-6 space-y-3">
                                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950/60 rounded-full flex justify-center items-center">
                                                <AcademicCapIcon className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Grade Selected</p>
                                                <p className="text-xs text-slate-450 mt-1 max-w-[240px]">Select a grade level from the list on the left to manage and view its allocated streams.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Subtab content: Academic Calendar */}
                        {settingsSubTab === 'academic_calendar' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left animate-in fade-in duration-300">
                                {/* Academic Years list */}
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Academic Years</h3>
                                        <button 
                                            onClick={() => setIsCreatingAy(!isCreatingAy)}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            {isCreatingAy ? 'Cancel' : 'Add Year'}
                                        </button>
                                    </div>

                                    {isCreatingAy && (
                                        <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800/60 space-y-4 animate-in slide-in-from-top duration-200">
                                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">➕ Register Academic Year</h4>
                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Academic Year Name</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. 2026" 
                                                        value={newAyName}
                                                        onChange={e => setNewAyName(e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Start Date</label>
                                                        <input 
                                                            type="date" 
                                                            value={newAyStartDate}
                                                            onChange={e => setNewAyStartDate(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">End Date</label>
                                                        <input 
                                                            type="date" 
                                                            value={newAyEndDate}
                                                            onChange={e => setNewAyEndDate(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                        />
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={async () => {
                                                        if (!newAyName.trim() || !newAyStartDate || !newAyEndDate) {
                                                            return alert("Please fill in all fields!");
                                                        }
                                                        const newAy = { 
                                                            id: `ay_${Date.now()}`, 
                                                            name: newAyName, 
                                                            startDate: newAyStartDate, 
                                                            endDate: newAyEndDate, 
                                                            institutionId: props.institution.id, 
                                                            status: 'inactive' as const 
                                                        };
                                                        try {
                                                            await apiService.saveModuleRecord('academic_years', newAy);
                                                            setLocalAcademicYears(prev => [...prev, newAy]);
                                                            setNewAyName('');
                                                            setNewAyStartDate('');
                                                            setNewAyEndDate('');
                                                            setIsCreatingAy(false);
                                                            alert(`Academic Year ${newAyName} registered successfully!`);
                                                            if (props.onRefreshData) {
                                                                await props.onRefreshData();
                                                            }
                                                        } catch (err: any) {
                                                            console.error("Failed to save academic year:", err);
                                                            alert("Failed to save academic year: " + (err.message || err));
                                                        }
                                                    }}
                                                    className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                                                >
                                                    Register Academic Year
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Search Input for Academic Years */}
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="Search academic years..." 
                                            value={aySearchQuery}
                                            onChange={e => setAySearchQuery(e.target.value)}
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                        />
                                    </div>

                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
                                        {localAcademicYears
                                            .filter(ay => ay.name.toLowerCase().includes(aySearchQuery.toLowerCase()))
                                            .map((ay, idx) => {
                                                const isEditing = editingAyId === ay.id;
                                                return (
                                                    <div key={ay.id} className="p-4 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-100 dark:border-slate-900 space-y-3">
                                                        {isEditing ? (
                                                            <div className="space-y-3 text-left">
                                                                <div className="space-y-1">
                                                                    <label className="text-[9px] font-black uppercase text-slate-400">Name</label>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editingAyName} 
                                                                        onChange={e => setEditingAyName(e.target.value)} 
                                                                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                                    />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="space-y-1">
                                                                        <label className="text-[9px] font-black uppercase text-slate-400">Start Date</label>
                                                                        <input 
                                                                            type="date" 
                                                                            value={editingAyStartDate} 
                                                                            onChange={e => setEditingAyStartDate(e.target.value)} 
                                                                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className="text-[9px] font-black uppercase text-slate-400">End Date</label>
                                                                        <input 
                                                                            type="date" 
                                                                            value={editingAyEndDate} 
                                                                            onChange={e => setEditingAyEndDate(e.target.value)} 
                                                                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-end gap-2">
                                                                    <button 
                                                                        onClick={() => setEditingAyId(null)} 
                                                                        className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button 
                                                                        onClick={async () => {
                                                                            if (!editingAyName.trim() || !editingAyStartDate || !editingAyEndDate) {
                                                                                return alert("Please fill in all fields!");
                                                                            }
                                                                            const updatedAy = { ...ay, name: editingAyName, startDate: editingAyStartDate, endDate: editingAyEndDate };
                                                                            try {
                                                                                await apiService.saveModuleRecord('academic_years', updatedAy);
                                                                                setLocalAcademicYears(prev => prev.map(item => item.id === ay.id ? updatedAy : item));
                                                                                setEditingAyId(null);
                                                                                alert("Academic Year details updated!");
                                                                                if (props.onRefreshData) await props.onRefreshData();
                                                                            } catch (e: any) {
                                                                                alert("Failed to update: " + (e.message || e));
                                                                            }
                                                                        }} 
                                                                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-between items-center">
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-900 dark:text-white">{ay.name}</p>
                                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                                        {ay.startDate && ay.endDate ? `Duration: ${ay.startDate} to ${ay.endDate}` : 'Year Preset'}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {ay.status !== 'active' && (
                                                                        <button 
                                                                            onClick={async () => {
                                                                                try {
                                                                                    const activeYears = localAcademicYears.filter(y => y.status === 'active' && y.id !== ay.id);
                                                                                    for (const activeAy of activeYears) {
                                                                                        await apiService.saveModuleRecord('academic_years', { ...activeAy, status: 'inactive' as const });
                                                                                    }
                                                                                    const updatedAy = { ...ay, status: 'active' as const };
                                                                                    await apiService.saveModuleRecord('academic_years', updatedAy);
                                                                                    setLocalAcademicYears(prev => prev.map(item => {
                                                                                        if (item.id === ay.id) return updatedAy;
                                                                                        if (item.status === 'active') return { ...item, status: 'inactive' as const };
                                                                                        return item;
                                                                                    }));
                                                                                    alert(`Academic Year ${ay.name} is now active!`);
                                                                                    if (props.onRefreshData) await props.onRefreshData();
                                                                                } catch (err: any) {
                                                                                    alert("Failed to activate: " + (err.message || err));
                                                                                }
                                                                            }}
                                                                            className="px-2.5 py-1 text-slate-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors border border-transparent hover:border-green-200"
                                                                        >
                                                                            Activate
                                                                        </button>
                                                                    )}
                                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                                        ay.status === 'active' 
                                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-500/20' 
                                                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-750'
                                                                    }`}>
                                                                        {ay.status === 'active' ? 'Active' : 'Inactive'}
                                                                    </span>
                                                                    <button 
                                                                        onClick={() => {
                                                                            setEditingAyId(ay.id);
                                                                            setEditingAyName(ay.name);
                                                                            setEditingAyStartDate(ay.startDate || '');
                                                                            setEditingAyEndDate(ay.endDate || '');
                                                                        }}
                                                                        className="p-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors"
                                                                        title="Edit Details"
                                                                    >
                                                                        <PencilIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={async () => {
                                                                            if (confirm(`Are you sure you want to permanently delete Academic Year "${ay.name}"?`)) {
                                                                                try {
                                                                                    await apiService.deleteModuleRecord('academic_years', ay.id);
                                                                                    setLocalAcademicYears(prev => prev.filter(item => item.id !== ay.id));
                                                                                    alert("Academic Year deleted successfully!");
                                                                                    if (props.onRefreshData) await props.onRefreshData();
                                                                                } catch (err: any) {
                                                                                    alert("Failed to delete: " + (err.message || err));
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="p-1.5 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                                                                        title="Delete Year"
                                                                    >
                                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>

                                {/* Terms / Semesters list */}
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Terms / Semesters</h3>
                                        <button 
                                            onClick={() => {
                                                if (localAcademicYears.length > 0 && !newTermAyId) {
                                                    setNewTermAyId(localAcademicYears[0].id);
                                                }
                                                setIsCreatingTerm(!isCreatingTerm);
                                            }}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            {isCreatingTerm ? 'Cancel' : 'Add Term'}
                                        </button>
                                    </div>

                                    {isCreatingTerm && (
                                        <div className="p-5 bg-slate-50 dark:bg-slate-955 rounded-3xl border border-slate-100 dark:border-slate-800/60 space-y-4 animate-in slide-in-from-top duration-200">
                                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">➕ Register Term / Semester</h4>
                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Academic Year</label>
                                                    <select
                                                        value={newTermAyId}
                                                        onChange={e => setNewTermAyId(e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                    >
                                                        <option value="">Select Academic Year</option>
                                                        {localAcademicYears.map(ay => (
                                                            <option key={ay.id} value={ay.id}>{ay.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Term / Semester Name</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. Term 1" 
                                                        value={newTermName}
                                                        onChange={e => setNewTermName(e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Start Date</label>
                                                        <input 
                                                            type="date" 
                                                            value={newTermStartDate}
                                                            onChange={e => setNewTermStartDate(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">End Date</label>
                                                        <input 
                                                            type="date" 
                                                            value={newTermEndDate}
                                                            onChange={e => setNewTermEndDate(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                        />
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={async () => {
                                                        if (!newTermName.trim() || !newTermStartDate || !newTermEndDate) {
                                                            return alert("Please fill in all fields!");
                                                        }
                                                        const targetAyId = newTermAyId || localAcademicYears[0]?.id || '';
                                                        if (!targetAyId) {
                                                            return alert("Please register and select an Academic Year first!");
                                                        }
                                                        const newSem = { 
                                                            id: `term_${Date.now()}`, 
                                                            name: newTermName, 
                                                            academicYearId: targetAyId, 
                                                            institutionId: props.institution.id, 
                                                            startDate: newTermStartDate, 
                                                            endDate: newTermEndDate,
                                                            status: 'inactive' as const
                                                        };
                                                        try {
                                                            await apiService.saveModuleRecord('semesters', newSem);
                                                            setLocalSemesters(prev => [...prev, newSem]);
                                                            setNewTermName('');
                                                            setNewTermStartDate('');
                                                            setNewTermEndDate('');
                                                            setIsCreatingTerm(false);
                                                            alert(`Term ${newTermName} calendar entry created!`);
                                                            if (props.onRefreshData) {
                                                                await props.onRefreshData();
                                                            }
                                                        } catch (err: any) {
                                                            console.error("Failed to save term:", err);
                                                            alert("Failed to save term: " + (err.message || err));
                                                        }
                                                    }}
                                                    className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                                                >
                                                    Save Term Entry
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Search & Academic Year filters for Semesters */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="Search terms..." 
                                                value={termSearchQuery}
                                                onChange={e => setTermSearchQuery(e.target.value)}
                                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                            />
                                        </div>
                                        <div>
                                            <select
                                                value={termAyFilter}
                                                onChange={e => setTermAyFilter(e.target.value)}
                                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                            >
                                                <option value="">All Academic Years</option>
                                                {localAcademicYears.map(ay => (
                                                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
                                        {localSemesters
                                            .filter(sem => {
                                                const matchesSearch = sem.name.toLowerCase().includes(termSearchQuery.toLowerCase());
                                                const matchesAy = termAyFilter ? sem.academicYearId === termAyFilter : true;
                                                return matchesSearch && matchesAy;
                                            })
                                            .map(sem => {
                                                const isEditing = editingTermId === sem.id;
                                                const ay = localAcademicYears.find(y => y.id === sem.academicYearId);
                                                const ayName = ay ? ay.name : 'Unknown Year';
                                                return (
                                                    <div key={sem.id} className="p-4 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-100 dark:border-slate-900 space-y-3">
                                                        {isEditing ? (
                                                            <div className="space-y-3 text-left">
                                                                <div className="space-y-1">
                                                                    <label className="text-[9px] font-black uppercase text-slate-400">Name</label>
                                                                    <input 
                                                                        type="text" 
                                                                        value={editingTermName} 
                                                                        onChange={e => setEditingTermName(e.target.value)} 
                                                                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                                    />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="space-y-1">
                                                                        <label className="text-[9px] font-black uppercase text-slate-400">Start Date</label>
                                                                        <input 
                                                                            type="date" 
                                                                            value={editingTermStartDate} 
                                                                            onChange={e => setEditingTermStartDate(e.target.value)} 
                                                                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className="text-[9px] font-black uppercase text-slate-400">End Date</label>
                                                                        <input 
                                                                            type="date" 
                                                                            value={editingTermEndDate} 
                                                                            onChange={e => setEditingTermEndDate(e.target.value)} 
                                                                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-end gap-2">
                                                                    <button 
                                                                        onClick={() => setEditingTermId(null)} 
                                                                        className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button 
                                                                        onClick={async () => {
                                                                            if (!editingTermName.trim() || !editingTermStartDate || !editingTermEndDate) {
                                                                                return alert("Please fill in all fields!");
                                                                            }
                                                                            const updatedSem = { ...sem, name: editingTermName, startDate: editingTermStartDate, endDate: editingTermEndDate };
                                                                            try {
                                                                                await apiService.saveModuleRecord('semesters', updatedSem);
                                                                                setLocalSemesters(prev => prev.map(item => item.id === sem.id ? updatedSem : item));
                                                                                setEditingTermId(null);
                                                                                alert("Term/Semester details updated!");
                                                                                if (props.onRefreshData) await props.onRefreshData();
                                                                            } catch (e: any) {
                                                                                alert("Failed to update: " + (e.message || e));
                                                                            }
                                                                        }} 
                                                                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-between items-center">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{sem.name}</p>
                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold border border-slate-200 dark:border-slate-700">{ayName}</span>
                                                                    </div>
                                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Duration: {sem.startDate || '—'} to {sem.endDate || '—'}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {sem.status !== 'active' && (
                                                                        <button 
                                                                            onClick={async () => {
                                                                                try {
                                                                                    const updatedSem = { ...sem, status: 'active' as const };
                                                                                    await apiService.saveModuleRecord('semesters', updatedSem);
                                                                                    setLocalSemesters(prev => prev.map(item => item.id === sem.id ? updatedSem : item));
                                                                                    alert(`Term/Semester ${sem.name} is now active!`);
                                                                                    if (props.onRefreshData) await props.onRefreshData();
                                                                                } catch (err: any) {
                                                                                    alert("Failed to activate: " + (err.message || err));
                                                                                }
                                                                            }}
                                                                            className="px-2.5 py-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors border border-transparent hover:border-indigo-200"
                                                                        >
                                                                            Activate
                                                                        </button>
                                                                    )}
                                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                                        sem.status === 'active' 
                                                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-550/20' 
                                                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                                    }`}>
                                                                        {sem.status === 'active' ? 'Active' : 'Inactive'}
                                                                    </span>
                                                                    <button 
                                                                        onClick={() => {
                                                                            setEditingTermId(sem.id);
                                                                            setEditingTermName(sem.name);
                                                                            setEditingTermStartDate(sem.startDate || '');
                                                                            setEditingTermEndDate(sem.endDate || '');
                                                                        }}
                                                                        className="p-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors"
                                                                        title="Edit Details"
                                                                    >
                                                                        <PencilIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={async () => {
                                                                            if (confirm(`Are you sure you want to permanently delete Term/Semester "${sem.name}"?`)) {
                                                                                try {
                                                                                    await apiService.deleteModuleRecord('semesters', sem.id);
                                                                                    setLocalSemesters(prev => prev.filter(item => item.id !== sem.id));
                                                                                    alert("Term/Semester deleted successfully!");
                                                                                    if (props.onRefreshData) await props.onRefreshData();
                                                                                } catch (err: any) {
                                                                                    alert("Failed to delete: " + (err.message || err));
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="p-1.5 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                                                                        title="Delete Term"
                                                                    >
                                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Subtab content: Financial Year */}
                        {settingsSubTab === 'financial_year' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left animate-in fade-in duration-300">
                                {/* Configuration Form */}
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Create Financial Year</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Financial Year Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. FY 2027"
                                                value={newFyName}
                                                onChange={(e) => setNewFyName(e.target.value)}
                                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                                                <input
                                                    type="date"
                                                    value={newFyStartDate}
                                                    onChange={(e) => setNewFyStartDate(e.target.value)}
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                                                <input
                                                    type="date"
                                                    value={newFyEndDate}
                                                    onChange={(e) => setNewFyEndDate(e.target.value)}
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (!newFyName.trim() || !newFyStartDate || !newFyEndDate) {
                                                    return alert("Please enter name, start date, and end date!");
                                                }
                                                setFinancialYears(prev => [
                                                    ...prev,
                                                    { id: `fy_${Date.now()}`, name: newFyName, startDate: newFyStartDate, endDate: newFyEndDate, status: 'Active' }
                                                ]);
                                                setNewFyName('');
                                                setNewFyStartDate('');
                                                setNewFyEndDate('');
                                                alert(`Financial Year ${newFyName} created and activated!`);
                                            }}
                                            className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all text-center"
                                        >
                                            Activate Financial Year
                                        </button>
                                    </div>
                                </div>

                                {/* Configured Financial Years Registry */}
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Configured Financial Periods</h3>
                                    <div className="space-y-3">
                                        {financialYears.map(fy => (
                                            <div key={fy.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-900">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">{fy.name}</p>
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                                        Cycle: {fy.startDate || '—'} to {fy.endDate || '—'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                        fy.status === 'Active'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                                                        : 'bg-slate-100 text-slate-550 border-slate-200'
                                                    }`}>
                                                        {fy.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Subtab content: User Permissions */}
                        {settingsSubTab === 'user_permissions' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-in fade-in duration-300">
                                {/* Roles List */}
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-4">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Select Role</h3>
                                    <div className="space-y-2">
                                        {(['Accountant', 'Teacher', 'Registrar', 'Admin'] as const).map(role => (
                                            <button
                                                key={role}
                                                onClick={() => setSelectedRole(role)}
                                                className={`w-full p-4 rounded-2xl text-left border transition-all flex justify-between items-center ${
                                                    selectedRole === role
                                                    ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-550/30 text-indigo-900 dark:text-indigo-400 font-black'
                                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-900 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100/50'
                                                }`}
                                            >
                                                <span>{role} Profile</span>
                                                <ChevronRightIcon className="w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Permissions Matrix */}
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6 lg:col-span-2">
                                    <div className="flex justify-between items-center border-b pb-4">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedRole} Module Access</h3>
                                            <p className="text-xs text-slate-500 font-semibold mt-0.5">Toggle module features and access restrictions for this role.</p>
                                        </div>
                                        <button
                                            onClick={handleSavePermissions}
                                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all"
                                        >
                                            Save Settings
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            { key: 'billing', title: 'Billing & Student Registry', desc: 'Allows viewing and managing student profiles, class balances, and running billing wizards.' },
                                            { key: 'expenses', title: 'Expense Governance', desc: 'Allows recording invoices, sorting cash items, and managing ledger entries.' },
                                            { key: 'requisitions', title: 'Requisitions & LPOs', desc: 'Allows submitting purchasing orders and approving local purchasing operations.' },
                                            { key: 'audit', title: 'Fiscal Audits & Analytics', desc: 'Allows auditing system transaction logs, balance sheets, and downloading cash flow logs.' },
                                            { key: 'settings', title: 'Institutional Settings', desc: 'Allows modifying branding configurations, calendar years, and user permissions.' },
                                        ].map(item => (
                                            <div key={item.key} className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-900">
                                                <div className="space-y-0.5 max-w-[80%]">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">{item.title}</p>
                                                    <p className="text-xs text-slate-400 font-semibold leading-relaxed">{item.desc}</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer mt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={permissionsMap[selectedRole]?.[item.key] || false}
                                                        onChange={() => handleTogglePermission(selectedRole, item.key)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-650"></div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Active Personnel */}
                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Affected Personnel ({selectedRole})</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {selectedRole === 'Accountant' && (
                                                <>
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 rounded-xl flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-650 text-xs">JD</div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800 dark:text-white">Jane Doe</p>
                                                            <p className="text-[9px] text-slate-400 font-semibold">jane.doe@institution.com</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 rounded-xl flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-650 text-xs">JS</div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800 dark:text-white">John Smith</p>
                                                            <p className="text-[9px] text-slate-400 font-semibold">john.smith@institution.com</p>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                            {selectedRole === 'Teacher' && (
                                                <>
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 rounded-xl flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-650 text-xs">MW</div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800 dark:text-white">Mary Wambui</p>
                                                            <p className="text-[9px] text-slate-400 font-semibold">mary@institution.com</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 rounded-xl flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-650 text-xs">PN</div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800 dark:text-white">Peter Njoroge</p>
                                                            <p className="text-[9px] text-slate-400 font-semibold">peter@institution.com</p>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                            {selectedRole === 'Registrar' && (
                                                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 rounded-xl flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-650 text-xs">AK</div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-white">Alice Kamau</p>
                                                        <p className="text-[9px] text-slate-400 font-semibold">alice@institution.com</p>
                                                    </div>
                                                </div>
                                            )}
                                            {selectedRole === 'Admin' && (
                                                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 rounded-xl flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-650 text-xs">SA</div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-white">System Admin</p>
                                                        <p className="text-[9px] text-slate-400 font-semibold">admin@institution.com</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Subtab content: Branding */}
                        {settingsSubTab === 'branding' && (
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm text-left max-w-2xl mx-auto space-y-6">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight border-b pb-4">Branding & Profiles</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Prefix</label>
                                            <input
                                                type="text"
                                                value={brandingConfig.invoicePrefix}
                                                onChange={(e) => setBrandingConfig(prev => ({ ...prev, invoicePrefix: e.target.value }))}
                                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Receipt Prefix</label>
                                            <input
                                                type="text"
                                                value={brandingConfig.receiptPrefix}
                                                onChange={(e) => setBrandingConfig(prev => ({ ...prev, receiptPrefix: e.target.value }))}
                                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Document Footer Notes</label>
                                        <textarea
                                            value={brandingConfig.footerNotes}
                                            onChange={(e) => setBrandingConfig(prev => ({ ...prev, footerNotes: e.target.value }))}
                                            rows={3}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSaveBranding}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all text-center"
                                    >
                                        Save Branding presets
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Subtab content: Document Numbering */}
                        {settingsSubTab === 'numbering' && (
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm text-left max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight border-b pb-4">Document Numbering & Sequences</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configure custom prefixes and starting serial sequences for financial documents</p>
                                </div>
                                
                                {loadingNumbering ? (
                                    <div className="py-12 text-center text-xs font-semibold text-slate-400 uppercase tracking-widest">
                                        Loading configurations...
                                    </div>
                                ) : (
                                    <div className="space-y-6 divide-y divide-slate-100 dark:divide-slate-800">
                                        {DOCUMENT_TYPES.map((item) => {
                                            const prefix = editingPrefixes[item.type] ?? item.defaultPrefix;
                                            const nextNum = editingNumbers[item.type] ?? item.defaultNextNumber;
                                            const previewVal = `${prefix}${nextNum}`;

                                            return (
                                                <div key={item.type} className="pt-6 first:pt-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                                    <div className="md:col-span-1">
                                                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{item.label}</h4>
                                                        <span className="text-[9px] font-bold text-slate-400 block mt-0.5 font-mono">Type: {item.type}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 md:col-span-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Prefix</label>
                                                            <input
                                                                type="text"
                                                                value={prefix}
                                                                onChange={(e) => setEditingPrefixes(prev => ({ ...prev, [item.type]: e.target.value }))}
                                                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Next Number</label>
                                                            <input
                                                                type="number"
                                                                value={nextNum}
                                                                onChange={(e) => setEditingNumbers(prev => ({ ...prev, [item.type]: Number(e.target.value) || 1 }))}
                                                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between md:col-span-1 gap-2 pt-4 md:pt-0">
                                                        <div className="text-left">
                                                            <span className="text-[8px] font-black text-slate-450 uppercase tracking-widest block">Preview Next</span>
                                                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">{previewVal}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleSaveNumberingConfig(item.type, prefix, nextNum)}
                                                            className="px-4 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white dark:bg-slate-800 dark:hover:bg-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Subtab content: Voteheads, Banks & Grants */}
                        {settingsSubTab === 'accounts_grants' && (
                            <div className="space-y-8 text-left w-full">
                                {/* SECTION 1: Vote Heads Spreadsheet Grid */}
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6 w-full">
                                    <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Vote Heads Spreadsheet</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Manage priorities, allocation types (Fixed vs Percentage) and budgets in a spreadsheet grid</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleAddGridRow}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5"
                                            >
                                                <PlusIcon className="w-3.5 h-3.5" />
                                                Add Vote Head
                                            </button>
                                            <button
                                                onClick={handleSaveAllVoteHeads}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5"
                                            >
                                                <CheckIcon className="w-3.5 h-3.5" />
                                                Save All Changes
                                            </button>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider w-[40%]">Vote Head Name</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center w-[15%]">Priority</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center w-[20%]">Allocation Type</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right w-[15%]">Value</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center w-[10%]">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {gridVoteHeads.map((row) => (
                                                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30">
                                                        {/* Name Column */}
                                                        <td className="p-3">
                                                            <input
                                                                type="text"
                                                                value={row.name}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setGridVoteHeads(prev => prev.map(item => item.id === row.id ? { ...item, name: val } : item));
                                                                }}
                                                                placeholder="Enter Vote Head Name"
                                                                className="w-full px-3 py-2 bg-transparent hover:bg-slate-100 focus:bg-white dark:hover:bg-slate-800 dark:focus:bg-slate-900 border border-transparent focus:border-indigo-500 rounded-lg outline-none font-semibold text-xs text-slate-800 dark:text-white transition-all"
                                                            />
                                                        </td>
                                                        {/* Priority Column */}
                                                        <td className="p-3 text-center">
                                                            <input
                                                                type="number"
                                                                value={row.priority}
                                                                onChange={e => {
                                                                    const val = Number(e.target.value);
                                                                    setGridVoteHeads(prev => prev.map(item => item.id === row.id ? { ...item, priority: val } : item));
                                                                }}
                                                                className="w-20 px-2 py-2 bg-transparent hover:bg-slate-100 focus:bg-white dark:hover:bg-slate-800 dark:focus:bg-slate-900 border border-transparent focus:border-indigo-500 rounded-lg outline-none text-center font-bold text-xs text-slate-800 dark:text-white transition-all mx-auto"
                                                            />
                                                        </td>
                                                        {/* Allocation Type Column */}
                                                        <td className="p-3 text-center">
                                                            <select
                                                                value={row.isPercentage ? 'percentage' : 'fixed'}
                                                                onChange={e => {
                                                                    const val = e.target.value === 'percentage';
                                                                    setGridVoteHeads(prev => prev.map(item => item.id === row.id ? { ...item, isPercentage: val } : item));
                                                                }}
                                                                className="px-3 py-2 bg-transparent hover:bg-slate-100 focus:bg-white dark:hover:bg-slate-800 dark:focus:bg-slate-900 border border-transparent focus:border-indigo-500 rounded-lg outline-none font-bold text-xs text-slate-700 dark:text-slate-300 transition-all mx-auto"
                                                            >
                                                                <option value="fixed">💵 Fixed Amount</option>
                                                                <option value="percentage">📊 Percentage Share</option>
                                                            </select>
                                                        </td>
                                                        {/* Value Column */}
                                                        <td className="p-3 text-right">
                                                            <div className="relative flex items-center justify-end">
                                                                {!row.isPercentage && <span className="absolute left-3 text-[10px] font-black text-slate-400">KES</span>}
                                                                <input
                                                                    type="number"
                                                                    value={row.isPercentage ? (row.percentage || '') : (row.allocatedAmount || '')}
                                                                    onChange={e => {
                                                                        const val = Number(e.target.value);
                                                                        setGridVoteHeads(prev => prev.map(item => item.id === row.id ? (
                                                                            item.isPercentage ? { ...item, percentage: val } : { ...item, allocatedAmount: val }
                                                                        ) : item));
                                                                    }}
                                                                    placeholder="0.00"
                                                                    className={`w-32 px-3 py-2 bg-transparent hover:bg-slate-100 focus:bg-white dark:hover:bg-slate-800 dark:focus:bg-slate-900 border border-transparent focus:border-indigo-500 rounded-lg outline-none text-right font-bold text-xs text-slate-800 dark:text-white transition-all ${row.isPercentage ? 'pr-6' : 'pl-9'}`}
                                                                />
                                                                {row.isPercentage && <span className="absolute right-3 text-xs font-black text-slate-400">%</span>}
                                                            </div>
                                                        </td>
                                                        {/* Actions Column */}
                                                        <td className="p-3 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => handleSaveGridRow(row)}
                                                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white dark:bg-emerald-950/40 dark:hover:bg-emerald-600 dark:text-emerald-400 rounded-md transition-colors"
                                                                    title="Save Vote Head"
                                                                >
                                                                    <CheckIcon className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteGridRow(row)}
                                                                    className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white dark:bg-rose-955 dark:hover:bg-rose-600 dark:text-rose-400 rounded-md transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {gridVoteHeads.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="p-8 text-center text-xs text-slate-400 italic">No Vote Heads configured yet. Click "Add Vote Head" to begin.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Percentage Shares Validation Indicator */}
                                    {gridVoteHeads.some(v => v.isPercentage) && (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex justify-between items-center text-xs">
                                            <span className="font-semibold text-slate-500 dark:text-slate-400">Total Percentage weight allocated:</span>
                                            <span className={`font-black text-sm ${gridVoteHeads.filter(v => v.isPercentage).reduce((sum, v) => sum + (v.percentage || 0), 0) === 100 ? 'text-emerald-600' : 'text-amber-500'}`}>
                                                {gridVoteHeads.filter(v => v.isPercentage).reduce((sum, v) => sum + (v.percentage || 0), 0)}%
                                                {gridVoteHeads.filter(v => v.isPercentage).reduce((sum, v) => sum + (v.percentage || 0), 0) !== 100 && (
                                                    <span className="text-[10px] font-semibold text-slate-400 ml-2">(Note: Standard split weighting usually sums to 100%)</span>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* SECTION 2: Bank Accounts & Subsidies/Grants side-by-side */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start w-full">
                                    {/* COLUMN 2: Bank Accounts Management */}
                                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                                        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Bank Accounts</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Manage School Accounts</p>
                                        </div>
                                        
                                        {/* Add / Edit Form */}
                                        <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800/60">
                                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                                {editingBankAccountId ? '✏️ Edit Account' : '➕ Register Account'}
                                            </h4>
                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Bank Name</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. Equity Bank" 
                                                        list="kenyan-banks"
                                                        value={newBankName}
                                                        onChange={e => setNewBankName(e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                    />
                                                    <datalist id="kenyan-banks">
                                                        <option value="Equity Bank" />
                                                        <option value="KCB Bank" />
                                                        <option value="Co-operative Bank of Kenya" />
                                                        <option value="NCBA Bank" />
                                                        <option value="Absa Bank Kenya" />
                                                        <option value="Standard Chartered Bank" />
                                                        <option value="Diamond Trust Bank (DTB)" />
                                                        <option value="I&M Bank" />
                                                        <option value="Stanbic Bank" />
                                                        <option value="Family Bank" />
                                                        <option value="National Bank of Kenya" />
                                                        <option value="Sidian Bank" />
                                                        <option value="Credit Bank" />
                                                        <option value="Consolidated Bank of Kenya" />
                                                        <option value="M-Pesa (Safaricom)" />
                                                        <option value="Airtel Money" />
                                                    </datalist>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Account Holder Name</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. Primary School Operations" 
                                                        value={newAccountName}
                                                        onChange={e => setNewAccountName(e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Account Number</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Account No." 
                                                            value={newAccountNumber}
                                                            onChange={e => setNewAccountNumber(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Branch Name</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Branch (e.g. Nairobi)" 
                                                            value={newBranchName}
                                                            onChange={e => setNewBranchName(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Link Integration</label>
                                                        <select
                                                            value={newIntegrationService}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setNewIntegrationService(val);
                                                                if (val === 'None') {
                                                                    setNewIntegrationStatus('Not Configured');
                                                                } else if (newIntegrationStatus === 'Not Configured') {
                                                                    setNewIntegrationStatus('Connected');
                                                                }
                                                            }}
                                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                                                        >
                                                            <option value="None">None (Manual)</option>
                                                            <option value="M-Pesa API">M-Pesa API</option>
                                                            <option value="Equity API Feed">Equity API Feed</option>
                                                            <option value="KCB Direct Feed">KCB Direct Feed</option>
                                                            <option value="Co-op Webhook">Co-op Webhook</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Integration Status</label>
                                                        <select
                                                            value={newIntegrationStatus}
                                                            onChange={e => setNewIntegrationStatus(e.target.value)}
                                                            disabled={newIntegrationService === 'None'}
                                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs cursor-pointer disabled:opacity-50"
                                                        >
                                                            {newIntegrationService === 'None' ? (
                                                                <option value="Not Configured">Not Configured</option>
                                                            ) : (
                                                                <>
                                                                    <option value="Connected">🟢 Connected</option>
                                                                    <option value="Disconnected">🔴 Disconnected</option>
                                                                </>
                                                            )}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    {editingBankAccountId ? (
                                                        <>
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingBankAccountId(null);
                                                                    setNewBankName('');
                                                                    setNewAccountName('');
                                                                    setNewAccountNumber('');
                                                                    setNewBranchName('');
                                                                    setNewCurrency('KES');
                                                                    setNewIntegrationService('None');
                                                                    setNewIntegrationStatus('Not Configured');
                                                                }}
                                                                className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                onClick={() => handleSaveBankAccount({ id: editingBankAccountId, bankName: newBankName, accountName: newAccountName, accountNumber: newAccountNumber, branchName: newBranchName, currency: newCurrency, integrationService: newIntegrationService, integrationStatus: newIntegrationStatus })}
                                                                className="flex-1 py-2.5 bg-indigo-650 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                                                            >
                                                                Save
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleSaveBankAccount({ bankName: newBankName, accountName: newAccountName, accountNumber: newAccountNumber, branchName: newBranchName, currency: newCurrency, integrationService: newIntegrationService, integrationStatus: newIntegrationStatus })}
                                                            className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                                                        >
                                                            Register Account
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* List */}
                                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                                            {bankAccounts.map(ba => (
                                                <div key={ba.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex justify-between items-center">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs font-bold text-slate-800 dark:text-white">{ba.bankName}</p>
                                                            {ba.integrationService && ba.integrationService !== 'None' && (
                                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${ba.integrationStatus === 'Connected' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-450 border border-emerald-250 dark:border-emerald-800/65' : 'bg-rose-50 text-rose-600 dark:bg-rose-955 dark:text-rose-400 border border-rose-200 dark:border-rose-900'}`}>
                                                                    {ba.integrationStatus === 'Connected' ? '🟢 Connected' : '🔴 Disconnected'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider mt-0.5">{ba.accountNumber}</p>
                                                        <p className="text-[9px] text-slate-400 font-semibold">
                                                            {ba.accountName} {ba.branchName && `(${ba.branchName} Branch)`}
                                                            {ba.integrationService && ba.integrationService !== 'None' && (
                                                                <span className="text-slate-450 dark:text-slate-500 font-bold ml-1.5">
                                                                    — Linked: {ba.integrationService}
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingBankAccountId(ba.id);
                                                                setNewBankName(ba.bankName);
                                                                setNewAccountName(ba.accountName);
                                                                setNewAccountNumber(ba.accountNumber);
                                                                setNewBranchName(ba.branchName || '');
                                                                setNewCurrency(ba.currency || 'KES');
                                                                setNewIntegrationService(ba.integrationService || 'None');
                                                                setNewIntegrationStatus(ba.integrationStatus || 'Not Configured');
                                                            }}
                                                            className="p-1 bg-slate-100 hover:bg-indigo-55/60 dark:bg-slate-800 dark:hover:bg-indigo-500/20 text-slate-500 hover:text-indigo-600 rounded"
                                                        >
                                                            <PencilIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteBankAccount(ba.id)}
                                                            className="p-1 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 rounded"
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {bankAccounts.length === 0 && (
                                                <p className="text-[11px] text-slate-400 italic text-center py-6">No bank accounts registered.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* COLUMN 3: Subsidies & Grants Management */}
                                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                                        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Subsidies & Grants</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Record Constituency & Gov Grants</p>
                                        </div>
                                        
                                        {/* Add / Edit Form */}
                                        <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800/60">
                                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                                {editingGrantId ? '✏️ Edit Grant' : '➕ Record Grant'}
                                            </h4>
                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Donor/Constituency Name</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. Westlands Constituency NG-CDF" 
                                                        value={newGrantConstituency}
                                                        onChange={e => setNewGrantConstituency(e.target.value)}
                                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Cheque/Ref Number</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Cheque No." 
                                                            value={newGrantCheque}
                                                            onChange={e => setNewGrantCheque(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Grant Amount (KES)</label>
                                                        <input 
                                                            type="number" 
                                                            placeholder="0.00" 
                                                            value={newGrantAmount}
                                                            onChange={e => setNewGrantAmount(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Financial Year</label>
                                                        <select
                                                            value={newGrantFY}
                                                            onChange={e => setNewGrantFY(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                        >
                                                            <option value="2025/2026">2025/2026</option>
                                                            <option value="2026/2027">2026/2027</option>
                                                            <option value="2027/2028">2027/2028</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Purpose</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="e.g. Infrastructure Dev" 
                                                            value={newGrantPurpose}
                                                            onChange={e => setNewGrantPurpose(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-xs"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    {editingGrantId ? (
                                                        <>
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingGrantId(null);
                                                                    setNewGrantConstituency('');
                                                                    setNewGrantCheque('');
                                                                    setNewGrantAmount('');
                                                                    setNewGrantFY('2025/2026');
                                                                    setNewGrantPurpose('');
                                                                    setNewGrantNotes('');
                                                                }}
                                                                className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                onClick={() => handleSaveSchoolGrant({ id: editingGrantId, constituencyName: newGrantConstituency, chequeNumber: newGrantCheque, amount: newGrantAmount, financialYear: newGrantFY, purpose: newGrantPurpose, notes: newGrantNotes })}
                                                                className="flex-1 py-2.5 bg-indigo-650 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                                                            >
                                                                Save
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleSaveSchoolGrant({ constituencyName: newGrantConstituency, chequeNumber: newGrantCheque, amount: newGrantAmount, financialYear: newGrantFY, purpose: newGrantPurpose, notes: newGrantNotes })}
                                                            className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                                                        >
                                                            Record Grant
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* List */}
                                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                                            {schoolGrants.map(sg => (
                                                <div key={sg.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex justify-between items-center">
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-xs font-bold text-slate-800 dark:text-white">{sg.constituencyName}</p>
                                                            <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-655 dark:text-slate-300 rounded uppercase">{sg.financialYear}</span>
                                                        </div>
                                                        <p className="text-[10px] font-extrabold text-emerald-600 tracking-wider mt-0.5">KES {sg.amount?.toLocaleString()}</p>
                                                        <p className="text-[9px] text-slate-400 font-semibold truncate max-w-[180px]">Purpose: {sg.purpose || 'General Funding'} {sg.chequeNumber && `(Cheque #${sg.chequeNumber})`}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingGrantId(sg.id);
                                                                setNewGrantConstituency(sg.constituencyName);
                                                                setNewGrantCheque(sg.chequeNumber);
                                                                setNewGrantAmount(String(sg.amount));
                                                                setNewGrantFY(sg.financialYear || '2025/2026');
                                                                setNewGrantPurpose(sg.purpose || '');
                                                                setNewGrantNotes(sg.notes || '');
                                                            }}
                                                            className="p-1 bg-slate-100 hover:bg-indigo-55/60 dark:bg-slate-800 dark:hover:bg-indigo-500/20 text-slate-500 hover:text-indigo-600 rounded"
                                                        >
                                                            <PencilIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteSchoolGrant(sg.id)}
                                                            className="p-1 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 rounded"
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {schoolGrants.length === 0 && (
                                                <p className="text-[11px] text-slate-400 italic text-center py-6">No subsidies or grants recorded.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {settingsSubTab === 'fee_structure_builder' && (
                            isDrivingSchool ? (
                                <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 text-left w-full">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Driving School Fee Structures</h3>
                                            <p className="text-xs font-medium text-slate-400">Configure pricing and standard fee vote breakdowns for license classes.</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setEditingDsFee({
                                                    className: 'Class B',
                                                    description: 'Standard License Course',
                                                    items: [
                                                        { name: 'Tuition Fee', amount: 15000, priority: 1 },
                                                        { name: 'PDL', amount: 1500, priority: 2 },
                                                        { name: 'Assessment', amount: 2000, priority: 3 }
                                                    ],
                                                    totalAmount: 18500
                                                });
                                                setShowDsFeeForm(true);
                                            }}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-md animate-pulse"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Add Class Fee
                                        </button>
                                    </div>

                                    {showDsFeeForm && (
                                        <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-200 dark:border-slate-800 space-y-6">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                                    {editingDsFee?.id ? 'Edit Class Fee Structure' : 'Add New Class Fee Structure'}
                                                </h4>
                                                <button 
                                                    onClick={() => {
                                                        setShowDsFeeForm(false);
                                                        setEditingDsFee(null);
                                                    }}
                                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    <XIcon className="w-5 h-5" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2 text-left">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">License Class / Category *</label>
                                                    <input 
                                                        type="text" 
                                                        value={editingDsFee?.className || ''}
                                                        onChange={e => setEditingDsFee((prev: any) => ({ ...prev, className: e.target.value }))}
                                                        placeholder="e.g. Class B"
                                                        className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-xs text-slate-900 dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2 text-left">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                                    <input 
                                                        type="text" 
                                                        value={editingDsFee?.description || ''}
                                                        onChange={e => setEditingDsFee((prev: any) => ({ ...prev, description: e.target.value }))}
                                                        placeholder="e.g. Standard Manual Car Course"
                                                        className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-xs text-slate-900 dark:text-white"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h5 className="text-[10px] font-black text-indigo-650 uppercase tracking-widest">Fee Vote Items (Breakdown)</h5>
                                                    <button 
                                                        onClick={() => {
                                                            const currentItems = editingDsFee?.items || [];
                                                            setEditingDsFee((prev: any) => ({
                                                                ...prev,
                                                                items: [...currentItems, { name: '', amount: 0, priority: currentItems.length + 1 }]
                                                            }));
                                                        }}
                                                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-750 uppercase tracking-widest flex items-center gap-1"
                                                    >
                                                        <PlusIcon className="w-3.5 h-3.5" /> Add Item
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    {(editingDsFee?.items || []).map((item: any, idx: number) => (
                                                        <div key={idx} className="flex gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800">
                                                            <input 
                                                                type="text" 
                                                                value={item.name} 
                                                                onChange={e => {
                                                                    const updatedItems = [...(editingDsFee?.items || [])];
                                                                    updatedItems[idx].name = e.target.value;
                                                                    setEditingDsFee((prev: any) => ({ ...prev, items: updatedItems }));
                                                                }}
                                                                placeholder="Fee Item Name (e.g. Tuition Fee)"
                                                                className="flex-1 px-4 py-2 border dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg font-bold text-xs"
                                                            />
                                                            <input 
                                                                type="number" 
                                                                value={item.amount || ''} 
                                                                onChange={e => {
                                                                    const updatedItems = [...(editingDsFee?.items || [])];
                                                                    updatedItems[idx].amount = Number(e.target.value);
                                                                    setEditingDsFee((prev: any) => ({ ...prev, items: updatedItems }));
                                                                }}
                                                                placeholder="Amount KES"
                                                                className="w-32 px-4 py-2 border dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg text-right font-bold text-xs"
                                                            />
                                                            <button 
                                                                onClick={() => {
                                                                    const updatedItems = (editingDsFee?.items || []).filter((_: any, i: number) => i !== idx);
                                                                    setEditingDsFee((prev: any) => ({ ...prev, items: updatedItems }));
                                                                }}
                                                                className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center pt-4 border-t">
                                                <div className="font-bold text-sm text-slate-500">
                                                    Total Structure Fee: <span className="font-black text-slate-900 dark:text-white text-lg">KES {
                                                        (editingDsFee?.items || []).reduce((sum: number, it: any) => sum + (it.amount || 0), 0).toLocaleString()
                                                    }</span>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button 
                                                        onClick={() => {
                                                            setShowDsFeeForm(false);
                                                            setEditingDsFee(null);
                                                        }}
                                                        className="px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-355 rounded-xl text-xs font-black uppercase tracking-wider"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={async () => {
                                                            if (!editingDsFee?.className?.trim()) {
                                                                alert('Please specify a Class Name.');
                                                                return;
                                                            }
                                                            const total = (editingDsFee?.items || []).reduce((sum: number, it: any) => sum + (it.amount || 0), 0);
                                                            const payload = {
                                                                ...editingDsFee,
                                                                totalAmount: total
                                                            };
                                                            await handleSaveDsFeeStructure(payload);
                                                            setShowDsFeeForm(false);
                                                            setEditingDsFee(null);
                                                        }}
                                                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md"
                                                    >
                                                        Save Fee Structure
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {dsFeeStructures.length === 0 ? (
                                            <p className="col-span-2 text-center text-xs font-medium text-slate-400 py-8">No fee structures configured yet.</p>
                                        ) : (
                                            dsFeeStructures.map((fee: any) => {
                                                let itemsArr: any[] = [];
                                                if (typeof fee.items === 'string') {
                                                    try { itemsArr = JSON.parse(fee.items); } catch(e){}
                                                } else if (Array.isArray(fee.items)) {
                                                    itemsArr = fee.items;
                                                }
                                                return (
                                                    <div key={fee.id} className="p-8 bg-slate-50 dark:bg-slate-800/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 group relative text-left">
                                                        <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingDsFee({
                                                                        ...fee,
                                                                        items: itemsArr
                                                                    });
                                                                    setShowDsFeeForm(true);
                                                                }}
                                                                className="p-2 bg-white dark:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-650 shadow-sm border border-slate-100 dark:border-slate-600"
                                                            >
                                                                <PencilIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteDsFeeStructure(fee.id)}
                                                                className="p-2 bg-white dark:bg-slate-700 rounded-lg text-slate-400 hover:text-rose-600 shadow-sm border border-slate-100 dark:border-slate-600"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">{fee.className}</span>
                                                            <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">KES {fee.totalAmount?.toLocaleString()}</p>
                                                        </div>
                                                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 mb-1">{fee.description || 'Standard Course'}</h4>
                                                        <p className="text-[10px] font-medium text-slate-400 mb-3">{itemsArr.length} Fee items included</p>
                                                        {itemsArr.length > 0 && (
                                                            <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-700/50 pt-3">
                                                                {itemsArr.map((item: any, i: number) => (
                                                                    <div key={i} className="flex items-center justify-between text-[11px]">
                                                                        <span className="text-slate-500 dark:text-slate-400 font-medium">{item.name}</span>
                                                                        <span className="text-slate-700 dark:text-slate-300 font-bold">KES {item.amount?.toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 text-left w-full">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Cohort Fee Structure Builder</h3>
                                        <p className="text-xs font-medium text-slate-400">Map specific courses and academic years to itemized votehead amounts across Term 1, Term 2, and Term 3 in a spreadsheet-like grid.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Cohort Course</label>
                                            <select 
                                                value={builderCourseId}
                                                onChange={e => setBuilderCourseId(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-350 text-sm"
                                            >
                                                <option value="">Choose Course</option>
                                                {(props.courses || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Academic Year</label>
                                            <select 
                                                value={builderAYId}
                                                onChange={e => setBuilderAYId(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-355 text-sm"
                                            >
                                                <option value="">Select Academic Year</option>
                                                {(props.academicYears || []).map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Spreadsheet Grid of configured voteheads for multi-term amount assignment */}
                                    {builderCourseId && builderAYId && (
                                        <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest pb-2 border-b">Configure Multi-Term Amounts & Targets</h4>
                                            
                                            <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950">
                                                <table className="w-full border-collapse text-left text-xs">
                                                    <thead>
                                                        <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-black uppercase tracking-widest text-[9px] text-slate-450">
                                                            <th className="p-4">Votehead Name</th>
                                                            {(props.semesters || []).map(sem => (
                                                                <th key={sem.id} className="p-4 text-right">{sem.name}</th>
                                                            ))}
                                                            <th className="p-4 text-center w-48">Applicable To</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(props.voteHeads || []).length === 0 ? (
                                                            <tr>
                                                                <td colSpan={(props.semesters || []).length + 2} className="p-8 text-center text-slate-400 italic">No configured voteheads found. Setup voteheads in settings to assign values.</td>
                                                            </tr>
                                                        ) : (
                                                            (props.voteHeads || []).map(vh => (
                                                                <tr key={vh.id} className="border-b border-slate-200 dark:border-slate-850 hover:bg-slate-100/50 dark:hover:bg-slate-900/40 transition-colors">
                                                                    <td className="p-4 font-bold text-slate-800 dark:text-white">
                                                                        <p className="font-extrabold text-sm">{vh.name}</p>
                                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Priority Rank #{vh.priority}</p>
                                                                    </td>
                                                                    {(props.semesters || []).map(sem => (
                                                                        <td key={sem.id} className="p-2 text-right">
                                                                            <input
                                                                                type="number"
                                                                                placeholder="0"
                                                                                value={spreadsheetAmounts[vh.id]?.[sem.id] || ''}
                                                                                onChange={e => {
                                                                                    const val = Number(e.target.value);
                                                                                    setSpreadsheetAmounts(prev => ({
                                                                                        ...prev,
                                                                                        [vh.id]: {
                                                                                            ...(prev[vh.id] || {}),
                                                                                            [sem.id]: val
                                                                                        }
                                                                                    }));
                                                                                }}
                                                                                className="w-28 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-right text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                                                                            />
                                                                        </td>
                                                                    ))}
                                                                    <td className="p-2 text-center">
                                                                        <select
                                                                            value={spreadsheetTargets[vh.id] || 'all'}
                                                                            onChange={e => {
                                                                                const val = e.target.value as any;
                                                                                setSpreadsheetTargets(prev => ({
                                                                                    ...prev,
                                                                                    [vh.id]: val
                                                                                }));
                                                                            }}
                                                                            className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer outline-none w-full"
                                                                        >
                                                                            <option value="all">All Students</option>
                                                                            <option value="boarder">Boarders Only</option>
                                                                            <option value="day_scholar">Day Scholars Only</option>
                                                                        </select>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="bg-slate-100 dark:bg-slate-900 font-extrabold border-t border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                                                            <td className="p-4 text-xs font-black">Term / Semester Totals</td>
                                                            {(props.semesters || []).map(sem => (
                                                                <td key={sem.id} className="p-4 text-right text-xs font-black text-slate-900 dark:text-white">
                                                                    KES {getTermTotal(sem.id).toLocaleString()}
                                                                </td>
                                                            ))}
                                                            <td className="p-4 text-center">
                                                                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Clearances</span>
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>

                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center">
                                                <div className="text-slate-500 font-extrabold text-sm">
                                                    Yearly Cumulative Total: <span className="font-black text-indigo-650 text-xl ml-2">KES {getYearlyTotal().toLocaleString()}</span>
                                                </div>
                                                <button 
                                                    onClick={handleSaveFeeStructure}
                                                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition-all"
                                                >
                                                    Save Structure Cohort
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* Importer Modal */}
                {showImporter && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-left">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Import Opening Balances</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                        {importerStep === 'upload' ? 'Upload opening balances Excel sheet' : 'Map spreadsheet columns to student record fields'}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => { setShowImporter(false); setImporterFile(null); setImporterStep('upload'); }} 
                                    className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <XIcon className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                {importerStep === 'upload' ? (
                                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-12 hover:border-indigo-500 transition-colors group cursor-pointer text-center relative">
                                        <input 
                                            type="file" 
                                            accept=".xlsx,.xls,.csv" 
                                            className="hidden" 
                                            id="balance-excel-upload-finance"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) handleImporterFileSelect(e.target.files[0]);
                                            }}
                                        />
                                        <label htmlFor="balance-excel-upload-finance" className="cursor-pointer block">
                                            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                                <ArrowUpTrayIcon className="w-10 h-10 text-indigo-650" />
                                            </div>
                                            <h4 className="text-base font-black text-slate-900 dark:text-white mb-2">Drop your Excel/CSV file here</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">or click to browse from files</p>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800/60">
                                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                                                <SparklesIcon className="w-5 h-5 text-emerald-650" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">{importerFile?.name}</h4>
                                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                                                    {(importerFile ? importerFile.size / 1024 : 0).toFixed(1)} KB • {importerRawData.length} Rows
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => { setImporterFile(null); setImporterStep('upload'); }} 
                                                className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                            >
                                                Change
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {/* Match Field Type Selection */}
                                            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-2 text-left">
                                                <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Match Students By *</label>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-750 dark:text-slate-300 cursor-pointer">
                                                        <input 
                                                            type="radio" 
                                                            name="matchField"
                                                            checked={importerMatchField === 'admissionNumber'} 
                                                            onChange={() => setImporterMatchField('admissionNumber')} 
                                                            className="text-indigo-650 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                                                        />
                                                        Admission Number
                                                    </label>
                                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-750 dark:text-slate-300 cursor-pointer">
                                                        <input 
                                                            type="radio" 
                                                            name="matchField"
                                                            checked={importerMatchField === 'name'} 
                                                            onChange={() => setImporterMatchField('name')} 
                                                            className="text-indigo-650 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                                                        />
                                                        Student Full Name
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Column Mappings */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 flex flex-col gap-2">
                                                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Student Identifier Column *</label>
                                                    <select
                                                        value={importerMappings.identifier}
                                                        onChange={(e) => setImporterMappings(prev => ({ ...prev, identifier: e.target.value }))}
                                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 font-bold text-xs text-slate-700 dark:text-slate-200"
                                                    >
                                                        <option value="">-- Select Column --</option>
                                                        {importerHeaders.map(h => (
                                                            <option key={h} value={h}>{h}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 flex flex-col gap-2">
                                                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Opening Balance Column *</label>
                                                    <select
                                                        value={importerMappings.balance}
                                                        onChange={(e) => setImporterMappings(prev => ({ ...prev, balance: e.target.value }))}
                                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 font-bold text-xs text-slate-700 dark:text-slate-200"
                                                    >
                                                        <option value="">-- Select Column --</option>
                                                        {importerHeaders.map(h => (
                                                            <option key={h} value={h}>{h}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex gap-4">
                                            <button 
                                                type="button"
                                                onClick={() => { setImporterFile(null); setImporterStep('upload'); }}
                                                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider text-center"
                                            >
                                                Back
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={handleConfirmImportBalances}
                                                disabled={!importerMappings.identifier || !importerMappings.balance}
                                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md disabled:opacity-50"
                                            >
                                                Apply Import
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Post Receipt Modal */}
                {showPostModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-left animate-in zoom-in-95 duration-200">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Post Manual Receipt</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Record a payment manually received from cash, cheque or bursary</p>
                                </div>
                                <button 
                                    onClick={() => setShowPostModal(false)}
                                    className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <XIcon className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-1 relative">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Search Student *</label>
                                    <input 
                                        type="text"
                                        placeholder="Type student name or admission number..."
                                        value={manualPayStudentSearch}
                                        onChange={e => {
                                            setManualPayStudentSearch(e.target.value);
                                            if (manualPayStudentId) {
                                                setManualPayStudentId('');
                                                setManualPayInvoiceId('');
                                            }
                                        }}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                    />
                                    {manualPayStudentSearch && !manualPayStudentId && (
                                        <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                            {manualFilteredStudents.length === 0 ? (
                                                <div className="p-4 text-xs text-slate-400 font-medium">No students matched.</div>
                                            ) : (
                                                manualFilteredStudents.map(student => (
                                                    <button
                                                        key={student.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setManualPayStudentId(student.id);
                                                            setManualPayStudentSearch(`${student.name} (${student.admissionNumber || student.admission_number || 'No Adm'})`);
                                                        }}
                                                        className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-xs font-bold text-slate-700 dark:text-slate-200 flex flex-col"
                                                    >
                                                        <span>{student.name}</span>
                                                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Adm: {student.admissionNumber || student.admission_number || '—'}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                {manualPayStudentId && (
                                    <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Pending Invoice *</label>
                                        <select
                                            value={manualPayInvoiceId}
                                            onChange={(e) => {
                                                setManualPayInvoiceId(e.target.value);
                                                const selectedInvoice = studentPendingInvoices.find(inv => inv.id === e.target.value);
                                                if (selectedInvoice) {
                                                    setManualPayAmount(selectedInvoice.totalAmount);
                                                }
                                            }}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                                        >
                                            <option value="">-- Choose Invoice --</option>
                                            {studentPendingInvoices.map(inv => (
                                                <option key={inv.id} value={inv.id}>
                                                    {inv.invoiceNumber} ({(inv as any).description || 'Fees'} - KES {inv.totalAmount.toLocaleString()}) [{inv.status}]
                                                </option>
                                            ))}
                                            {studentPendingInvoices.length === 0 && (
                                                <option disabled>No outstanding invoices for this student</option>
                                            )}
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method *</label>
                                        <select
                                            value={manualPayMethod}
                                            onChange={(e) => setManualPayMethod(e.target.value)}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                                        >
                                            <option value="Cash">Cash (Manual)</option>
                                            <option value="Bank Transfer">Bank Feed / Transfer</option>
                                            <option value="M-Pesa">M-Pesa</option>
                                            <option value="Cheque">Cheque</option>
                                            <option value="Bursary">Bursary</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount Paid (KES) *</label>
                                        <input
                                            type="number"
                                            value={manualPayAmount || ''}
                                            onChange={(e) => setManualPayAmount(Number(e.target.value))}
                                            placeholder="Enter amount paid"
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destination Bank Account</label>
                                    <select
                                        value={manualPayBankAccountId}
                                        onChange={(e) => setManualPayBankAccountId(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                                    >
                                        <option value="">-- Select Bank Account (Optional) --</option>
                                        {bankAccounts.map(ba => (
                                            <option key={ba.id} value={ba.id}>
                                                {ba.bankName} - {ba.accountNumber} ({ba.accountName})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {nextReceiptNumber && (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Expected Receipt Number</span>
                                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">{nextReceiptNumber}</p>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={useCustomReceiptNumber}
                                                onChange={(e) => {
                                                    setUseCustomReceiptNumber(e.target.checked);
                                                    if (e.target.checked && !customReceiptNumber) {
                                                        setCustomReceiptNumber(nextReceiptNumber);
                                                    }
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Use Custom Number</span>
                                        </label>
                                    </div>
                                )}

                                {useCustomReceiptNumber && (
                                    <div className="space-y-1 animate-in slide-in-from-top-2 duration-200 text-left">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custom Receipt Number *</label>
                                        <input
                                            type="text"
                                            value={customReceiptNumber}
                                            onChange={(e) => setCustomReceiptNumber(e.target.value)}
                                            placeholder="Enter custom receipt number (e.g. REC-Manual-01)"
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                            required
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Date</label>
                                        <input
                                            type="date"
                                            value={manualPayDate}
                                            onChange={(e) => setManualPayDate(e.target.value)}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Ref / Slip Code</label>
                                        <input
                                            type="text"
                                            value={manualPayReference}
                                            onChange={(e) => setManualPayReference(e.target.value)}
                                            placeholder="Cheque # or bank slip ref"
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                        />
                                    </div>
                                </div>

                                {manualPayStudentId && manualPayAmount > 0 && (
                                    <div className="space-y-2 p-5 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-200">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preview Votes Distribution</p>
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                            {previewAllocations.length === 0 ? (
                                                <p className="text-xs font-semibold text-slate-400 p-2">No active allocations generated. Pure prepayment/credit balance.</p>
                                            ) : (
                                                previewAllocations.map((alloc, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40 text-xs font-bold shadow-sm">
                                                        <div className="min-w-0 text-left">
                                                            <div className="text-slate-850 dark:text-slate-200 truncate">{alloc.description}</div>
                                                            <div className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">{alloc.invoiceNumber}</div>
                                                        </div>
                                                        <span className="text-indigo-650 dark:text-indigo-400 shrink-0 font-extrabold ml-2">KES {alloc.amount.toLocaleString()}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handlePostManualPayment}
                                    disabled={isSavingManualPay || !manualPayStudentId || (!manualPayInvoiceId && !studentPendingInvoices.some((inv: any) => inv.isOpeningBalance && inv.id === manualPayInvoiceId)) || manualPayAmount <= 0}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md transition-all text-center disabled:opacity-50 mt-4 active:scale-[0.98]"
                                >
                                    {isSavingManualPay ? 'Saving Receipt...' : 'Confirm and Post Receipt'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reconcile Bank Feed Modal */}
                {showReconcileModal && selectedFeedTx && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-left animate-in zoom-in-95 duration-200">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Reconcile Bank Feed</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Match feed transaction {selectedFeedTx.transactionId} (KES {selectedFeedTx.amount}) to student</p>
                                </div>
                                <button 
                                    onClick={() => { setShowReconcileModal(false); setSelectedFeedTx(null); }}
                                    className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <XIcon className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs space-y-2 font-semibold">
                                    <p><span className="font-black text-slate-400 uppercase text-[9px] tracking-wider block">Source</span> {selectedFeedTx.provider || 'BANK'}</p>
                                    <p><span className="font-black text-slate-400 uppercase text-[9px] tracking-wider block">Amount</span> KES {selectedFeedTx.amount}</p>
                                    <p><span className="font-black text-slate-400 uppercase text-[9px] tracking-wider block">Sender Info</span> {selectedFeedTx.senderName || selectedFeedTx.phoneNumber || 'N/A'}</p>
                                    <p><span className="font-black text-slate-400 uppercase text-[9px] tracking-wider block">Original Message</span> {selectedFeedTx.description || 'N/A'}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Match to Student *</label>
                                    <select
                                        value={reconcileStudentId}
                                        onChange={(e) => {
                                            setReconcileStudentId(e.target.value);
                                            setReconcileInvoiceId('');
                                        }}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                                    >
                                        <option value="">-- Choose Student --</option>
                                        {props.students.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.admissionNumber || s.admission_number || 'No Adm'})</option>
                                        ))}
                                    </select>
                                </div>

                                {reconcileStudentId && (
                                    <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Match to Outstanding Invoice *</label>
                                        <select
                                            value={reconcileInvoiceId}
                                            onChange={(e) => setReconcileInvoiceId(e.target.value)}
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                                        >
                                            <option value="">-- Choose Invoice --</option>
                                            {studentPendingInvoices.map(inv => (
                                                <option key={inv.id} value={inv.id}>
                                                    {inv.invoiceNumber} ({(inv as any).description || 'Fees'} - KES {inv.totalAmount.toLocaleString()}) [{inv.status}]
                                                </option>
                                            ))}
                                            {studentPendingInvoices.length === 0 && (
                                                <option disabled>No outstanding invoices for this student</option>
                                            )}
                                        </select>
                                    </div>
                                )}

                                <button
                                    onClick={handleReconcileBankFeed}
                                    disabled={isReconciling || !reconcileStudentId || !reconcileInvoiceId}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md transition-all text-center disabled:opacity-50 mt-4 active:scale-[0.98]"
                                >
                                    {isReconciling ? 'Reconciling...' : 'Reconcile and Generate Receipt'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* On-screen Payment Voucher Preview Modal */}
                {showVoucherPreviewModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-left animate-in zoom-in-95 duration-200">
                            
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Payment Voucher Preview</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Review the voucher details before posting to the ledger</p>
                                </div>
                                <button 
                                    onClick={() => setShowVoucherPreviewModal(false)}
                                    className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <XIcon className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            {/* Voucher Document Canvas */}
                            <div className="p-8 max-h-[60vh] overflow-y-auto bg-slate-50 dark:bg-slate-950">
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative space-y-6">
                                    
                                    {/* Double border design line */}
                                    <div className="absolute inset-2 border border-dashed border-slate-200 dark:border-slate-850 pointer-events-none rounded-[1.2rem]" />
                                    
                                    {/* Paper Header */}
                                    <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
                                        <h4 className="text-md font-black text-slate-900 dark:text-white uppercase tracking-wider">{props.institution.name}</h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{props.companyDetails?.address || 'P.O. Box School'}</p>
                                        <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mt-3">PAYMENT VOUCHER</p>
                                    </div>

                                    {/* Meta Row */}
                                    <div className="flex justify-between items-center text-xs">
                                        <div>
                                            <p className="font-black text-slate-400 uppercase text-[9px] tracking-wider">PV Reference No</p>
                                            <p className="font-bold text-slate-800 dark:text-white">[Draft/Generated on Post]</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-400 uppercase text-[9px] tracking-wider">Date</p>
                                            <p className="font-bold text-slate-800 dark:text-white">{new Date(expDate || Date.now()).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    {/* Account Details Box */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs font-semibold">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 uppercase text-[9px] tracking-wider">Source Bank Account:</span>
                                            <span className="text-slate-800 dark:text-slate-250">
                                                {(() => {
                                                    const bank = (bankAccounts || []).find(b => b.id === expBankAccountId);
                                                    return bank ? `${bank.bankName || bank.bank_name} - ${bank.accountName || bank.account_name} (${bank.accountNumber || bank.account_number})` : 'General Cash/Unspecified';
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 uppercase text-[9px] tracking-wider">Votehead Charged:</span>
                                            <span className="text-slate-850 dark:text-slate-200">
                                                {(() => {
                                                    const vh = (props.voteHeads || []).find(v => v.id === expVoteHeadId);
                                                    return vh ? vh.name : 'General Expense';
                                                })()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Payee Box */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs font-semibold">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 uppercase text-[9px] tracking-wider">Payee / Recipient:</span>
                                            <span className="text-slate-900 dark:text-white font-bold">{expPayee || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 uppercase text-[9px] tracking-wider">Payment Method:</span>
                                            <span className="text-slate-900 dark:text-white font-bold">
                                                {expPaymentMethod} {expReference ? `(Ref: ${expReference})` : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Particulars Table */}
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
                                        <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-950 p-3 font-black text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                                            <span className="col-span-2">Particulars of Expenditure / Being</span>
                                            <span className="text-right">Amount</span>
                                        </div>
                                        <div className="grid grid-cols-3 p-4 font-semibold text-slate-800 dark:text-slate-200">
                                            <span className="col-span-2 text-slate-900 dark:text-white">
                                                <p className="font-bold text-xs">{expDescription || 'No description provided.'}</p>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Category: {expCategory}</p>
                                            </span>
                                            <span className="text-right font-black text-slate-900 dark:text-white">KES {Number(expAmount || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 font-black">
                                            <span className="col-span-2 text-slate-900 dark:text-white uppercase tracking-wider">Total</span>
                                            <span className="text-right text-indigo-600 font-bold">KES {Number(expAmount || 0).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Amount in words */}
                                    <div className="text-xs font-semibold italic text-slate-505">
                                        Amount in Words: {pdfService.convertNumberToWords(expAmount || 0)}
                                    </div>

                                    {/* Signatures */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                        <div className="space-y-4">
                                            <div className="border-b border-slate-300 dark:border-slate-700 pb-1 text-slate-850 dark:text-slate-200 font-black">{expPreparedBy || props.currentUser?.name}</div>
                                            <div>Prepared By</div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="border-b border-slate-300 dark:border-slate-700 pb-1 text-slate-850 dark:text-slate-200 font-black">—</div>
                                            <div>Checked By</div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="border-b border-slate-300 dark:border-slate-700 pb-1 text-slate-850 dark:text-slate-200 font-black">
                                                {approvalOfficers.find(u => u.id === expApprovedBy)?.name || 'Pending Approval'}
                                            </div>
                                            <div>Approved By</div>
                                        </div>
                                        <div className="space-y-2 col-span-1">
                                            <div className="relative border border-dashed border-slate-350 dark:border-slate-750 bg-slate-50 dark:bg-slate-950/40 rounded-xl h-16 w-full flex items-center justify-center overflow-hidden">
                                                <canvas
                                                    ref={signatureCanvasRef}
                                                    onMouseDown={startSignatureDrawing}
                                                    onMouseMove={drawSignature}
                                                    onMouseUp={stopSignatureDrawing}
                                                    onMouseLeave={stopSignatureDrawing}
                                                    onTouchStart={startSignatureDrawing}
                                                    onTouchMove={drawSignature}
                                                    onTouchEnd={stopSignatureDrawing}
                                                    width={150}
                                                    height={60}
                                                    className="absolute inset-0 w-full h-full cursor-crosshair"
                                                />
                                                {!isSignatureSigned && (
                                                    <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider pointer-events-none select-none">
                                                        Sign / Draw here
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center text-[8px]">
                                                <span>Payee Signature</span>
                                                {isSignatureSigned && (
                                                    <button
                                                        type="button"
                                                        onClick={clearSignatureCanvas}
                                                        className="text-rose-500 hover:text-rose-600 font-bold uppercase transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/20">
                                <button
                                    onClick={() => setShowVoucherPreviewModal(false)}
                                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                >
                                    Close Preview
                                </button>
                                <button
                                    onClick={() => {
                                        handleAddExpense();
                                        setShowVoucherPreviewModal(false);
                                    }}
                                    className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md"
                                >
                                    Confirm & Post Record
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {/* Salary Bank Disbursement Advice Modal */}
                {showBankScheduleModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-left animate-in zoom-in-95 duration-200">
                            
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Salary Bank Payment Schedule</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Generate bank advice letter detailing payments to each staff account</p>
                                </div>
                                <button 
                                    onClick={() => setShowBankScheduleModal(false)}
                                    className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <XIcon className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            {/* Modal Body / Inputs */}
                            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50 dark:bg-slate-950">
                                
                                {/* Parameter Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    
                                    {/* Period Select */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Payroll Period *</label>
                                        <select
                                            value={schedulePeriod}
                                            onChange={(e) => setSchedulePeriod(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-700 dark:text-white"
                                        >
                                            {Array.from(new Set((props.payrollRecords || []).map(r => r.period || r.payPeriod || ''))).map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Source Account Select */}
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Debit Bank Account *</label>
                                        <select
                                            value={scheduleSourceBankId}
                                            onChange={(e) => setScheduleSourceBankId(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-700 dark:text-white"
                                        >
                                            <option value="">-- Choose School Debit Account --</option>
                                            {(bankAccounts || []).map(ba => (
                                                <option key={ba.id} value={ba.id}>
                                                    {ba.bankName || ba.bank_name} - {ba.accountName || ba.account_name} ({ba.accountNumber || ba.account_number})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Cheque # */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cheque Number / Ref</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. CHQ-00123"
                                            value={scheduleChequeNumber}
                                            onChange={(e) => setScheduleChequeNumber(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-700 dark:text-white"
                                        />
                                    </div>

                                </div>

                                {/* Datepicker Row */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Date</label>
                                        <input
                                            type="date"
                                            value={scheduleDate}
                                            onChange={(e) => setScheduleDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Schedule Table */}
                                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs bg-white dark:bg-slate-900">
                                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disbursement Recipients List</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">
                                            Total: KES {scheduleStaffAccounts.reduce((sum, item) => sum + (item.netPay || 0), 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto max-h-[30vh]">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-[9px] text-slate-400 uppercase font-black tracking-wider">
                                                    <th className="py-2.5 px-3">Staff Name</th>
                                                    <th className="py-2.5 px-3">Bank Name</th>
                                                    <th className="py-2.5 px-3">Branch Name</th>
                                                    <th className="py-2.5 px-3">Account Number</th>
                                                    <th className="py-2.5 px-3 text-right">Net Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {scheduleStaffAccounts.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors">
                                                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-white">{item.staffName}</td>
                                                        <td className="py-2.5 px-3">
                                                            <input 
                                                                type="text" 
                                                                value={item.bankName}
                                                                onChange={(e) => {
                                                                    const updated = [...scheduleStaffAccounts];
                                                                    updated[idx].bankName = e.target.value;
                                                                    setScheduleStaffAccounts(updated);
                                                                }}
                                                                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded outline-none text-[11px] font-bold text-slate-805 dark:text-white"
                                                            />
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <input 
                                                                type="text" 
                                                                value={item.bankBranch}
                                                                onChange={(e) => {
                                                                    const updated = [...scheduleStaffAccounts];
                                                                    updated[idx].bankBranch = e.target.value;
                                                                    setScheduleStaffAccounts(updated);
                                                                }}
                                                                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded outline-none text-[11px] font-bold text-slate-805 dark:text-white"
                                                            />
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <input 
                                                                type="text" 
                                                                value={item.accountNumber}
                                                                onChange={(e) => {
                                                                    const updated = [...scheduleStaffAccounts];
                                                                    updated[idx].accountNumber = e.target.value;
                                                                    setScheduleStaffAccounts(updated);
                                                                }}
                                                                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded outline-none text-[11px] font-bold text-slate-805 dark:text-white"
                                                            />
                                                        </td>
                                                        <td className="py-2.5 px-3 font-black text-right text-emerald-600">
                                                            KES {item.netPay.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {scheduleStaffAccounts.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                                                            No payroll records found for the selected period
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                            </div>

                            {/* Modal Actions */}
                            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/20">
                                <button
                                    onClick={() => setShowBankScheduleModal(false)}
                                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={!scheduleSourceBankId || scheduleStaffAccounts.length === 0}
                                    onClick={() => {
                                        const bankObj = (bankAccounts || []).find(ba => ba.id === scheduleSourceBankId);
                                        pdfService.downloadBankAdvicePdf({
                                            period: schedulePeriod,
                                            chequeNumber: scheduleChequeNumber,
                                            paymentDate: scheduleDate,
                                            sourceBankAccount: bankObj,
                                            staffDetails: scheduleStaffAccounts,
                                            institution: props.institution,
                                            companyDetails: props.companyDetails,
                                            logoUrl: (props as any).logoUrl,
                                            letterheadUrl: (props as any).letterheadUrl
                                        });
                                        setShowBankScheduleModal(false);
                                    }}
                                    className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md disabled:opacity-50"
                                >
                                    Download Bank Advice
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {/* Record Expense Modal */}
                {showRecordExpenseModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-left animate-in zoom-in-95 duration-200">
                            
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Record Expense</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Record a new payment voucher, utility payment, or general expense</p>
                                </div>
                                <button 
                                    onClick={() => setShowRecordExpenseModal(false)}
                                    className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <XIcon className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto bg-slate-50 dark:bg-slate-950">
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Category</label>
                                        <select
                                            value={expCategory}
                                            onChange={(e) => setExpCategory(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-700 dark:text-white"
                                        >
                                            <option>Salaries</option>
                                            <option>Utilities</option>
                                            <option>Maintenance</option>
                                            <option>Supplies</option>
                                            <option>Marketing</option>
                                            <option>Taxes</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vote Head Charged</label>
                                        <select
                                            value={expVoteHeadId}
                                            onChange={(e) => setExpVoteHeadId(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-700 dark:text-white"
                                        >
                                            <option value="">-- Select Vote Head --</option>
                                            {(props.voteHeads || []).map(vh => (
                                                <option key={vh.id} value={vh.id}>{vh.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Source Bank Account *</label>
                                        <select
                                            value={expBankAccountId}
                                            onChange={(e) => setExpBankAccountId(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-700 dark:text-white"
                                        >
                                            <option value="">-- Select Bank Account --</option>
                                            {(bankAccounts || []).map(ba => (
                                                <option key={ba.id} value={ba.id}>
                                                    {ba.bankName || ba.bank_name} - {ba.accountName || ba.account_name} ({ba.accountNumber || ba.account_number})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Amount (KES) *</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={expAmount || ''}
                                            onChange={(e) => setExpAmount(Number(e.target.value) || 0)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Payee Name (To) *</label>
                                        <input
                                            type="text"
                                            placeholder="Recipient name..."
                                            value={expPayee}
                                            onChange={(e) => setExpPayee(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Payment Method</label>
                                        <select
                                            value={expPaymentMethod}
                                            onChange={(e) => setExpPaymentMethod(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-700 dark:text-white"
                                        >
                                            <option>Cash</option>
                                            <option>Cheque</option>
                                            <option>M-Pesa</option>
                                            <option>EFT</option>
                                            <option>Bank Transfer</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Ref / Cheque #</label>
                                        <input
                                            type="text"
                                            placeholder="N/A"
                                            value={expReference}
                                            onChange={(e) => setExpReference(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Payment Date</label>
                                        <input
                                            type="date"
                                            value={expDate}
                                            onChange={(e) => setExpDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Prepared By</label>
                                        <input
                                            type="text"
                                            value={expPreparedBy}
                                            onChange={(e) => setExpPreparedBy(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Approved By</label>
                                        <select
                                            value={expApprovedBy}
                                            onChange={(e) => setExpApprovedBy(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-700 dark:text-white cursor-pointer"
                                        >
                                            <option value="">-- Select Approver --</option>
                                            {approvalOfficers.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.role?.replace('_', ' ')})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Description / Being *</label>
                                    <textarea
                                        placeholder="Purpose of expenditure..."
                                        rows={2}
                                        value={expDescription}
                                        onChange={(e) => setExpDescription(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-700 dark:text-white resize-none"
                                    />
                                </div>

                            </div>

                            {/* Modal Actions */}
                            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/20">
                                <button
                                    type="button"
                                    onClick={() => setShowVoucherPreviewModal(true)}
                                    disabled={expAmount <= 0 || !expDescription}
                                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 shadow-sm"
                                >
                                    👁️ Preview Voucher
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await handleAddExpense();
                                        setShowRecordExpenseModal(false);
                                    }}
                                    disabled={isSavingExpense || expAmount <= 0 || !expDescription}
                                    className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-650 transition-all shadow-md disabled:opacity-50"
                                >
                                    {isSavingExpense ? 'Saving...' : 'Submit Record'}
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (() => {
                    const totalBilled = mappedInvoices.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);
                    const totalCollected = mappedReceipts.reduce((s: number, r: any) => s + (r.amountPaid || 0), 0);
                    const totalExpenses = (props.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
                    const outstanding = totalBilled - totalCollected;
                    const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

                    const reportSubTabs = [
                        { id: 'collection', label: 'Fee Collection', icon: '📥' },
                        { id: 'outstanding', label: 'Outstanding Balances', icon: '⚠️' },
                        { id: 'ledger', label: 'Receipts Ledger', icon: '🧾' },
                        { id: 'expenses', label: 'Expense Summary', icon: '💸' },
                        { id: 'payroll_summary', label: 'Payroll Summary', icon: '👔' },
                        { id: 'annual', label: 'Annual Report', icon: '📊' },
                        { id: 'student_statement', label: 'Student Statement', icon: '🎓' },
                    ];

                    return (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Horizontal menu — switches to sub-menus when on outstanding or ledger tabs */}
                            {reportsSubTab === 'outstanding' ? (
                                /* Outstanding Balances sub-menu */
                                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/40 shadow-sm p-2 flex items-center gap-1 overflow-x-auto custom-scrollbar-horizontal pb-2">
                                    <button
                                        onClick={() => setReportsSubTab('collection')}
                                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all mr-1 border border-indigo-200 dark:border-indigo-800"
                                    >
                                        ← Back
                                    </button>
                                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                                    {[
                                        { id: 'balance_slip', label: 'Fee Balance Slip', icon: '🪪' },
                                        { id: 'all_balances', label: 'All Balances', icon: '📋' },
                                        { id: 'student_summary', label: 'Student Summary', icon: '👤' },
                                        { id: 'class_summary', label: 'Class Summary', icon: '🏫' },
                                        { id: 'term_summary', label: 'Term Summary', icon: '📅' },
                                        { id: 'voteheads_summary', label: 'Voteheads Summary', icon: '🗳️' },
                                        { id: 'votehead_distribution', label: 'Votehead Distribution', icon: '📊' },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setOutstandingSubTab(tab.id as any)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 ${
                                                outstandingSubTab === tab.id
                                                    ? 'bg-rose-600 text-white shadow-md'
                                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <span>{tab.icon}</span>
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            ) : reportsSubTab === 'ledger' ? (
                                /* Receipts Ledger sub-menu */
                                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/40 shadow-sm p-2 flex items-center gap-1 overflow-x-auto custom-scrollbar-horizontal pb-2">
                                    <button
                                        onClick={() => setReportsSubTab('collection')}
                                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all mr-1 border border-emerald-200 dark:border-emerald-800"
                                    >
                                        ← Back
                                    </button>
                                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                                    {[
                                        { id: 'collection_summary', label: 'Collection Summary', icon: '📥' },
                                        { id: 'cash_book', label: 'Cash Book', icon: '📖' },
                                        { id: 'fee_register', label: 'Fee Register', icon: '📓' },
                                        { id: 'cash_flow', label: 'Cash Flow', icon: '🌊' },
                                        { id: 'fee_installment', label: 'Fee Installment', icon: '💰' },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setLedgerSubTab(tab.id as any)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 ${
                                                ledgerSubTab === tab.id
                                                    ? 'bg-emerald-600 text-white shadow-md'
                                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <span>{tab.icon}</span>
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                /* Normal Reports menu */
                                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-2 flex items-center gap-1 overflow-x-auto custom-scrollbar-horizontal pb-2">
                                    {reportSubTabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setReportsSubTab(tab.id as any)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 ${
                                                reportsSubTab === tab.id
                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <span>{tab.icon}</span>
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Fee Collection Report */}
                            {reportsSubTab === 'collection' && (
                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Fee Collection Report</h3>
                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">All payments received across all invoices</p>
                                        </div>
                                        <span className="text-2xl font-black text-emerald-600">{collectionRate.toFixed(1)}%</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        {[{label:'Total Billed', val: totalBilled, cls:'bg-indigo-50 text-indigo-600'},{label:'Collected', val: totalCollected, cls:'bg-emerald-50 text-emerald-600'},{label:'Outstanding', val: outstanding, cls:'bg-rose-50 text-rose-600'}].map((s,i)=>(
                                            <div key={i} className={`${s.cls} rounded-2xl p-5`}>
                                                <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">{s.label}</p>
                                                <p className="text-xl font-black">KSh {s.val.toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead><tr className="border-b border-slate-100 dark:border-slate-800">
                                                {['Student','Invoice #','Amount','Paid','Balance','Status'].map(h=>(<th key={h} className="py-3 px-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">{h}</th>))}
                                            </tr></thead>
                                            <tbody>
                                                {mappedInvoices.slice(0,50).map((inv: any, i: number) => {
                                                    const student = props.students.find((s: any) => s.id === inv.studentId);
                                                    const paid = mappedReceipts.filter((r: any) => r.invoiceId === inv.id).reduce((s: number, r: any) => s + (r.amountPaid || 0), 0);
                                                    const bal = (inv.totalAmount || 0) - paid;
                                                    return (
                                                        <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                            <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">{student?.name || inv.studentId || '—'}</td>
                                                            <td className="py-3 px-4 text-slate-500">{inv.invoiceNumber || inv.id?.slice(-8)}</td>
                                                            <td className="py-3 px-4 font-black text-slate-700">KSh {(inv.totalAmount||0).toLocaleString()}</td>
                                                            <td className="py-3 px-4 font-black text-emerald-600">KSh {paid.toLocaleString()}</td>
                                                            <td className="py-3 px-4 font-black text-rose-600">KSh {bal.toLocaleString()}</td>
                                                            <td className="py-3 px-4"><span className={`text-[10px] font-black px-2 py-1 rounded-full ${bal <= 0 ? 'bg-emerald-50 text-emerald-700' : inv.status === 'overdue' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{bal <= 0 ? 'Cleared' : inv.status === 'overdue' ? 'Overdue' : 'Pending'}</span></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Outstanding Balances — 7 Sub-Tabs */}
                            {reportsSubTab === 'outstanding' && (() => {
                                const getInvoiceItems = (inv: any): any[] => {
                                    let items = inv.voteHeads || inv.items;
                                    if (!items) return [];
                                    if (typeof items === 'string') {
                                        try { return JSON.parse(items) || []; } catch (e) { return []; }
                                    }
                                    return Array.isArray(items) ? items : [];
                                };

                                // Derive all voteheads across all invoices
                                const allVoteHeads: string[] = Array.from(new Set(
                                    mappedInvoices.flatMap((inv: any) =>
                                        getInvoiceItems(inv).map((v: any) => v.name || v.voteHeadName || v.description || 'General')
                                    )
                                ));

                                // Per-student votehead breakdown
                                const studentVoteData = studentFinanceData.map((s: any) => {
                                    const invs = mappedInvoices.filter((i: any) => i.studentId === s.id);
                                    const rcpts = mappedReceipts.filter((r: any) => invs.some((i: any) => i.id === r.invoiceId) || r.studentId === s.id);
                                    const totalPaid = rcpts.reduce((acc: number, r: any) => acc + (r.amountPaid || 0), 0);
                                    const voteMap: Record<string, { invoiced: number; paid: number }> = {};
                                    invs.forEach((inv: any) => {
                                        getInvoiceItems(inv).forEach((v: any) => {
                                            const key = v.name || v.voteHeadName || v.description || 'General';
                                            if (!voteMap[key]) voteMap[key] = { invoiced: 0, paid: 0 };
                                            voteMap[key].invoiced += v.amount || 0;
                                        });
                                    });
                                    // Distribute payments proportionally
                                    const totalInv = Object.values(voteMap).reduce((a, v) => a + v.invoiced, 0);
                                    if (totalInv > 0) {
                                        Object.keys(voteMap).forEach(k => {
                                            voteMap[k].paid = Math.min(voteMap[k].invoiced, (voteMap[k].invoiced / totalInv) * totalPaid);
                                        });
                                    }
                                    return { ...s, voteMap };
                                });

                                // Classes list
                                const classes = Array.from(new Set(props.students.map((s: any) => s.gradeLevel || 'Unclassified'))).sort();

                                // Terms
                                const terms = Array.from(new Set(
                                    mappedInvoices.map((i: any) => i.termName || i.term || 'General')
                                )).sort();

                                // Slip student
                                const slipStudent = props.students.find((s: any) => s.id === slipStudentId);
                                const slipData = slipStudent ? studentFinanceData.find((s: any) => s.id === slipStudentId) : null;
                                const slipStudents = props.students.filter((s: any) =>
                                    s.name?.toLowerCase().includes(slipSearch.toLowerCase()) ||
                                    (s.admissionNumber || '').toLowerCase().includes(slipSearch.toLowerCase())
                                ).slice(0, 30);

                                const TH = (label: string) => <th className="py-3 px-3 font-black text-slate-400 uppercase tracking-widest text-[10px] border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">{label}</th>;
                                const TD = ({ children, cls = '' }: any) => <td className={`py-2.5 px-3 text-xs ${cls}`}>{children}</td>;

                                return (
                                    <div className="space-y-4 animate-in fade-in duration-200">

                                        {/* 1. Fee Balance Slip */}
                                        {outstandingSubTab === 'balance_slip' && (
                                            <div className="space-y-4">
                                                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6">
                                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Generate Fee Balance Slip</h3>
                                                    <div className="flex flex-col md:flex-row gap-4">
                                                        <input type="text" placeholder="Search student..." value={slipSearch} onChange={e => setSlipSearch(e.target.value)} className="flex-1 pl-4 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-sm font-bold text-slate-900 dark:text-white" />
                                                        <select value={slipStudentId} onChange={e => setSlipStudentId(e.target.value)} className="flex-1 py-2.5 px-4 bg-slate-50 dark:bg-slate-950 border-none rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-sm font-bold text-slate-900 dark:text-white">
                                                            <option value="">— Select Student —</option>
                                                            {slipStudents.map((s: any) => (<option key={s.id} value={s.id}>{s.name}{s.admissionNumber ? ` (${s.admissionNumber})` : ''}{s.gradeLevel ? ` · ${s.gradeLevel}` : ''}</option>))}
                                                        </select>
                                                        {slipStudentId && <button onClick={() => window.print()} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">🖨️ Print Slip</button>}
                                                    </div>
                                                </div>

                                                {/* A5 Balance Slip */}
                                                {slipStudent && slipData && (
                                                    <div className="mx-auto bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden" style={{ maxWidth: '560px' }}>
                                                        {/* Slip Header */}
                                                        <div className="bg-gradient-to-r from-rose-700 to-rose-500 p-6 text-white text-center">
                                                            <p className="text-rose-200 text-[9px] font-black uppercase tracking-[0.4em] mb-0.5">Fee Balance Slip</p>
                                                            <h3 className="text-xl font-black">{props.institution.name}</h3>
                                                            <p className="text-rose-200 text-[10px] mt-0.5">{new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                                        </div>
                                                        {/* Student Details */}
                                                        <div className="p-6 border-b border-dashed border-slate-200 dark:border-slate-700">
                                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                                <div><p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Student Name</p><p className="font-black text-slate-900 dark:text-white mt-0.5">{slipStudent.name}</p></div>
                                                                <div><p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Adm Number</p><p className="font-black text-slate-900 dark:text-white mt-0.5">{(slipStudent as any).admissionNumber || '—'}</p></div>
                                                                <div><p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Class</p><p className="font-black text-slate-900 dark:text-white mt-0.5">{(slipStudent as any).gradeLevel || '—'}</p></div>
                                                                <div><p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Stream</p><p className="font-black text-slate-900 dark:text-white mt-0.5">{(slipStudent as any).stream || '—'}</p></div>
                                                            </div>
                                                        </div>
                                                        {/* Balance Summary */}
                                                        <div className="p-6 space-y-2">
                                                            <div className="flex justify-between text-xs"><span className="font-black text-slate-500 uppercase tracking-widest text-[10px]">Total Invoiced</span><span className="font-black text-slate-800 dark:text-white">KSh {(slipData as any).totals.invoiced.toLocaleString()}</span></div>
                                                            <div className="flex justify-between text-xs"><span className="font-black text-slate-500 uppercase tracking-widest text-[10px]">Amount Paid</span><span className="font-black text-emerald-600">KSh {(slipData as any).totals.paid.toLocaleString()}</span></div>
                                                            <div className="flex justify-between text-xs border-t pt-2 mt-2"><span className="font-black text-slate-500 uppercase tracking-widest text-[10px]">Balance Due</span><span className={`font-black text-lg ${(slipData as any).totals.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>KSh {Math.abs((slipData as any).totals.balance).toLocaleString()}</span></div>
                                                        </div>
                                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-center">
                                                            <p className="text-[9px] text-slate-400 font-medium">This slip is computer generated. Please visit the Finance Office for queries.</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 2. All Balances */}
                                        {outstandingSubTab === 'all_balances' && (
                                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6">
                                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
                                                    <div>
                                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">All Outstanding Balances</h3>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{studentFinanceData.filter((s: any) => s.totals.balance > 0).length} students with balances</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input type="text" placeholder="Filter name/adm..." value={balFilter} onChange={e => setBalFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-none rounded-xl outline-none text-xs font-bold text-slate-900 dark:text-white" />
                                                        <select value={balClass} onChange={e => setBalClass(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-none rounded-xl outline-none text-xs font-bold text-slate-900 dark:text-white">
                                                            <option value="">All Classes</option>
                                                            {classes.map((c: any) => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead><tr>{['#', 'Student', 'Adm No.', 'Class', 'Invoiced', 'Paid', 'Balance'].map(h => TH(h))}</tr></thead>
                                                        <tbody>
                                                            {studentFinanceData
                                                                .filter((s: any) => s.totals.balance > 0)
                                                                .filter((s: any) => !balFilter || s.name?.toLowerCase().includes(balFilter.toLowerCase()) || (s.admissionNumber || '').toLowerCase().includes(balFilter.toLowerCase()))
                                                                .filter((s: any) => !balClass || s.gradeLevel === balClass)
                                                                .sort((a: any, b: any) => b.totals.balance - a.totals.balance)
                                                                .map((s: any, i: number) => (
                                                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                        <TD cls="text-slate-400 font-bold">{i + 1}</TD>
                                                                        <TD cls="font-bold text-slate-800 dark:text-white">{s.name}</TD>
                                                                        <TD cls="text-slate-500">{s.admissionNumber}</TD>
                                                                        <TD cls="text-slate-500">{s.gradeLevel || '—'}</TD>
                                                                        <TD cls="font-black text-slate-700">KSh {s.totals.invoiced.toLocaleString()}</TD>
                                                                        <TD cls="font-black text-emerald-600">KSh {s.totals.paid.toLocaleString()}</TD>
                                                                        <TD cls="font-black text-rose-600">KSh {s.totals.balance.toLocaleString()}</TD>
                                                                    </tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* 3. Student Summary — invoiced/paid/balance per votehead */}
                                        {outstandingSubTab === 'student_summary' && (
                                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6">
                                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">Student Summary by Votehead</h3>
                                                <p className="text-[10px] text-slate-400 font-medium mb-4">Amount invoiced and received per votehead per student</p>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead><tr>
                                                            {TH('Student')}
                                                            {TH('Adm No.')}
                                                            {TH('Class')}
                                                            {allVoteHeads.map(v => TH(v))}
                                                            {TH('Total Inv.')}
                                                            {TH('Total Paid')}
                                                            {TH('Balance')}
                                                        </tr></thead>
                                                        <tbody>
                                                            {studentVoteData.filter((s: any) => s.totals.balance > 0).map((s: any, i: number) => (
                                                                <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                    <TD cls="font-bold text-slate-800 dark:text-white whitespace-nowrap">{s.name}</TD>
                                                                    <TD cls="text-slate-500">{s.admissionNumber}</TD>
                                                                    <TD cls="text-slate-500">{s.gradeLevel || '—'}</TD>
                                                                    {allVoteHeads.map(v => (
                                                                        <TD key={v} cls="text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                                            {s.voteMap[v] ? (
                                                                                <div>
                                                                                    <div className="font-black text-slate-700">{s.voteMap[v].invoiced.toLocaleString()}</div>
                                                                                    <div className="text-emerald-600">{Math.round(s.voteMap[v].paid).toLocaleString()}</div>
                                                                                    <div className="text-rose-500 text-[10px]">{Math.round(s.voteMap[v].invoiced - s.voteMap[v].paid).toLocaleString()}</div>
                                                                                </div>
                                                                            ) : <span className="text-slate-300">—</span>}
                                                                        </TD>
                                                                    ))}
                                                                    <TD cls="font-black text-slate-700">KSh {s.totals.invoiced.toLocaleString()}</TD>
                                                                    <TD cls="font-black text-emerald-600">KSh {s.totals.paid.toLocaleString()}</TD>
                                                                    <TD cls="font-black text-rose-600">KSh {s.totals.balance.toLocaleString()}</TD>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <p className="text-[9px] text-slate-400 mt-2 font-medium">Each votehead cell shows: Invoiced / Paid / Balance. Paid amounts are distributed proportionally.</p>
                                            </div>
                                        )}

                                        {/* 4. Class Summary */}
                                        {outstandingSubTab === 'class_summary' && (() => {
                                            const classSummary = classes.map((cls: string) => {
                                                const students = studentFinanceData.filter((s: any) => (s.gradeLevel || 'Unclassified') === cls);
                                                return {
                                                    cls,
                                                    count: students.length,
                                                    invoiced: students.reduce((a: number, s: any) => a + s.totals.invoiced, 0),
                                                    paid: students.reduce((a: number, s: any) => a + s.totals.paid, 0),
                                                    balance: students.reduce((a: number, s: any) => a + s.totals.balance, 0),
                                                };
                                            }).filter(r => r.invoiced > 0);
                                            const totals = classSummary.reduce((a: any, r) => ({ invoiced: a.invoiced + r.invoiced, paid: a.paid + r.paid, balance: a.balance + r.balance }), { invoiced: 0, paid: 0, balance: 0 });
                                            return (
                                                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6">
                                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Class Summary</h3>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left">
                                                            <thead><tr>{['Class', 'Students', 'Total Invoiced', 'Total Paid', 'Outstanding', 'Collection %'].map(h => TH(h))}</tr></thead>
                                                            <tbody>
                                                                {classSummary.map((r, i) => (
                                                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                        <TD cls="font-black text-slate-800 dark:text-white">{r.cls}</TD>
                                                                        <TD cls="text-slate-500 font-bold">{r.count}</TD>
                                                                        <TD cls="font-black text-slate-700">KSh {r.invoiced.toLocaleString()}</TD>
                                                                        <TD cls="font-black text-emerald-600">KSh {r.paid.toLocaleString()}</TD>
                                                                        <TD cls="font-black text-rose-600">KSh {r.balance.toLocaleString()}</TD>
                                                                        <TD cls="">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${r.invoiced > 0 ? Math.min(100, (r.paid / r.invoiced) * 100) : 0}%` }} /></div>
                                                                                <span className="text-[10px] font-black text-slate-600">{r.invoiced > 0 ? ((r.paid / r.invoiced) * 100).toFixed(0) : 0}%</span>
                                                                            </div>
                                                                        </TD>
                                                                    </tr>
                                                                ))}
                                                                <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 font-black">
                                                                    <TD cls="text-slate-900 dark:text-white text-[10px] uppercase tracking-widest">TOTAL</TD>
                                                                    <TD cls="text-slate-900 dark:text-white">{classSummary.reduce((a, r) => a + r.count, 0)}</TD>
                                                                    <TD cls="text-slate-900 dark:text-white">KSh {totals.invoiced.toLocaleString()}</TD>
                                                                    <TD cls="text-emerald-600">KSh {totals.paid.toLocaleString()}</TD>
                                                                    <TD cls="text-rose-600">KSh {totals.balance.toLocaleString()}</TD>
                                                                    <TD cls="text-slate-700">{totals.invoiced > 0 ? ((totals.paid / totals.invoiced) * 100).toFixed(1) : 0}%</TD>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* 5. Term Summary Balances */}
                                        {outstandingSubTab === 'term_summary' && (() => {
                                            const termSummary = terms.map((term: string) => {
                                                const invs = mappedInvoices.filter((i: any) => (i.termName || i.term || 'General') === term);
                                                const invoiced = invs.reduce((a: number, i: any) => a + (i.totalAmount || 0), 0);
                                                const invIds = new Set(invs.map((i: any) => i.id));
                                                const paid = mappedReceipts.filter((r: any) => invIds.has(r.invoiceId)).reduce((a: number, r: any) => a + (r.amountPaid || 0), 0);
                                                return { term, invoiced, paid, balance: invoiced - paid, count: invs.length };
                                            }).filter(r => r.invoiced > 0);
                                            return (
                                                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6">
                                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Term Summary Balances</h3>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left">
                                                            <thead><tr>{['Term', 'Invoices', 'Total Invoiced', 'Total Paid', 'Outstanding', 'Collection %'].map(h => TH(h))}</tr></thead>
                                                            <tbody>
                                                                {termSummary.map((r, i) => (
                                                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                        <TD cls="font-black text-slate-800 dark:text-white">{r.term}</TD>
                                                                        <TD cls="text-slate-500 font-bold">{r.count}</TD>
                                                                        <TD cls="font-black text-slate-700">KSh {r.invoiced.toLocaleString()}</TD>
                                                                        <TD cls="font-black text-emerald-600">KSh {r.paid.toLocaleString()}</TD>
                                                                        <TD cls="font-black text-rose-600">KSh {r.balance.toLocaleString()}</TD>
                                                                        <TD cls="font-black text-slate-600">{r.invoiced > 0 ? ((r.paid / r.invoiced) * 100).toFixed(1) : 0}%</TD>
                                                                    </tr>
                                                                ))}
                                                                {termSummary.length === 0 && (<tr><td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-medium">No term data found</td></tr>)}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* 6. Voteheads Summary */}
                                        {outstandingSubTab === 'voteheads_summary' && (() => {
                                            const vhSummary = allVoteHeads.map(vh => {
                                                let invoiced = 0, paid = 0;
                                                mappedInvoices.forEach((inv: any) => {
                                                    const invPaid = mappedReceipts.filter((r: any) => r.invoiceId === inv.id).reduce((a: number, r: any) => a + (r.amountPaid || 0), 0);
                                                    const totalInv = inv.totalAmount || 0;
                                                    getInvoiceItems(inv).forEach((v: any) => {
                                                        const vName = v.name || v.voteHeadName || v.description || 'General';
                                                        if (vName === vh) {
                                                            invoiced += v.amount || 0;
                                                            paid += totalInv > 0 ? ((v.amount || 0) / totalInv) * invPaid : 0;
                                                        }
                                                    });
                                                });
                                                return { vh, invoiced, paid: Math.round(paid), balance: Math.round(invoiced - paid) };
                                            }).filter(r => r.invoiced > 0).sort((a, b) => b.balance - a.balance);
                                            const totals = vhSummary.reduce((a, r) => ({ invoiced: a.invoiced + r.invoiced, paid: a.paid + r.paid, balance: a.balance + r.balance }), { invoiced: 0, paid: 0, balance: 0 });
                                            return (
                                                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6">
                                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Voteheads Summary</h3>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left">
                                                            <thead><tr>{['Votehead', 'Total Invoiced', 'Total Paid', 'Outstanding', 'Collection %'].map(h => TH(h))}</tr></thead>
                                                            <tbody>
                                                                {vhSummary.map((r, i) => (
                                                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                        <TD cls="font-black text-slate-800 dark:text-white">{r.vh}</TD>
                                                                        <TD cls="font-black text-slate-700">KSh {r.invoiced.toLocaleString()}</TD>
                                                                        <TD cls="font-black text-emerald-600">KSh {r.paid.toLocaleString()}</TD>
                                                                        <TD cls="font-black text-rose-600">KSh {r.balance.toLocaleString()}</TD>
                                                                        <TD cls="">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${r.invoiced > 0 ? Math.min(100, (r.paid / r.invoiced) * 100) : 0}%` }} /></div>
                                                                                <span className="text-[10px] font-black">{r.invoiced > 0 ? ((r.paid / r.invoiced) * 100).toFixed(0) : 0}%</span>
                                                                            </div>
                                                                        </TD>
                                                                    </tr>
                                                                ))}
                                                                <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 font-black">
                                                                    <TD cls="text-slate-900 dark:text-white text-[10px] uppercase tracking-widest">TOTAL</TD>
                                                                    <TD cls="text-slate-900 dark:text-white">KSh {totals.invoiced.toLocaleString()}</TD>
                                                                    <TD cls="text-emerald-600">KSh {totals.paid.toLocaleString()}</TD>
                                                                    <TD cls="text-rose-600">KSh {totals.balance.toLocaleString()}</TD>
                                                                    <TD cls="text-slate-600">{totals.invoiced > 0 ? ((totals.paid / totals.invoiced) * 100).toFixed(1) : 0}%</TD>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* 7. Votehead Distribution — pivot table */}
                                        {outstandingSubTab === 'votehead_distribution' && (
                                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6">
                                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">Votehead Distribution</h3>
                                                <p className="text-[10px] text-slate-400 font-medium mb-4">Outstanding balance per student per votehead (Dr = still owed)</p>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead><tr>
                                                            {TH('#')}
                                                            {TH('Student')}
                                                            {TH('Class')}
                                                            {allVoteHeads.map(v => TH(v))}
                                                            {TH('Total Balance')}
                                                        </tr></thead>
                                                        <tbody>
                                                            {studentVoteData
                                                                .filter((s: any) => s.totals.balance > 0)
                                                                .sort((a: any, b: any) => b.totals.balance - a.totals.balance)
                                                                .map((s: any, i: number) => (
                                                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                        <TD cls="text-slate-400 font-bold">{i + 1}</TD>
                                                                        <TD cls="font-bold text-slate-800 dark:text-white whitespace-nowrap">{s.name}</TD>
                                                                        <TD cls="text-slate-500 whitespace-nowrap">{s.gradeLevel || '—'}</TD>
                                                                        {allVoteHeads.map(v => {
                                                                            const vb = s.voteMap[v] ? Math.round(s.voteMap[v].invoiced - s.voteMap[v].paid) : 0;
                                                                            return <TD key={v} cls={`whitespace-nowrap font-bold ${vb > 0 ? 'text-rose-600' : vb < 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{vb !== 0 ? `KSh ${Math.abs(vb).toLocaleString()}` : '—'}</TD>;
                                                                        })}
                                                                        <TD cls="font-black text-rose-700">KSh {s.totals.balance.toLocaleString()}</TD>
                                                                    </tr>
                                                                ))}
                                                            {/* Column totals */}
                                                            <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-rose-50 dark:bg-rose-900/10 font-black">
                                                                <TD cls="" /><TD cls="text-[10px] uppercase tracking-widest text-slate-700 dark:text-white">TOTALS</TD><TD cls="" />
                                                                {allVoteHeads.map(v => {
                                                                    const total = studentVoteData.filter((s: any) => s.totals.balance > 0).reduce((a: number, s: any) => a + (s.voteMap[v] ? Math.round(s.voteMap[v].invoiced - s.voteMap[v].paid) : 0), 0);
                                                                    return <TD key={v} cls="text-rose-700 whitespace-nowrap">{total > 0 ? `KSh ${total.toLocaleString()}` : '—'}</TD>;
                                                                })}
                                                                <TD cls="text-rose-700">KSh {studentVoteData.filter((s: any) => s.totals.balance > 0).reduce((a: number, s: any) => a + s.totals.balance, 0).toLocaleString()}</TD>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}


                            {/* Receipts Ledger — 3 Sub-Tabs */}
                            {reportsSubTab === 'ledger' && (() => {
                                const getInvoiceItems = (inv: any): any[] => {
                                    let items = inv.voteHeads || inv.items;
                                    if (!items) return [];
                                    if (typeof items === 'string') {
                                        try { return JSON.parse(items) || []; } catch (e) { return []; }
                                    }
                                    return Array.isArray(items) ? items : [];
                                };

                                // 1. Daily Collection Summary calculation
                                const collectionsByDate: Record<string, { date: string; minRcpt: string; maxRcpt: string; voteMap: Record<string, number>; total: number }> = {};
                                const allVoteHeads: string[] = Array.from(new Set(
                                    mappedInvoices.flatMap((inv: any) =>
                                        getInvoiceItems(inv).map((v: any) => v.name || v.voteHeadName || v.description || 'General')
                                    )
                                ));

                                mappedReceipts.forEach((rcpt: any) => {
                                    const dateStr = (rcpt.paymentDate || rcpt.createdAt || '').split('T')[0] || '—';
                                    if (!collectionsByDate[dateStr]) {
                                        collectionsByDate[dateStr] = { date: dateStr, minRcpt: '', maxRcpt: '', voteMap: {}, total: 0 };
                                    }
                                    const day = collectionsByDate[dateStr];
                                    const rNum = rcpt.receiptNumber || rcpt.id?.slice(-8);

                                    // Track receipt number ranges
                                    if (!day.minRcpt || rNum < day.minRcpt) day.minRcpt = rNum;
                                    if (!day.maxRcpt || rNum > day.maxRcpt) day.maxRcpt = rNum;

                                    day.total += rcpt.amountPaid || 0;

                                    // Distribute amount paid to voteheads
                                    const inv = mappedInvoices.find((i: any) => i.id === rcpt.invoiceId);
                                    if (inv) {
                                        const items = getInvoiceItems(inv);
                                        const totalInv = items.reduce((s, it) => s + (it.amount || 0), 0);
                                        if (totalInv > 0) {
                                            items.forEach((it: any) => {
                                                const key = it.name || it.voteHeadName || it.description || 'General';
                                                day.voteMap[key] = (day.voteMap[key] || 0) + ((it.amount || 0) / totalInv) * (rcpt.amountPaid || 0);
                                            });
                                        } else {
                                            day.voteMap['General'] = (day.voteMap['General'] || 0) + (rcpt.amountPaid || 0);
                                        }
                                    } else {
                                        day.voteMap['General'] = (day.voteMap['General'] || 0) + (rcpt.amountPaid || 0);
                                    }
                                });

                                const collectionList = Object.values(collectionsByDate).sort((a, b) => b.date.localeCompare(a.date));

                                // Payment method summaries for Daily Collection
                                const paymentMethodSummary: Record<string, number> = {};
                                mappedReceipts.forEach((r: any) => {
                                    const method = r.paymentMethod || r.method || 'Cash';
                                    paymentMethodSummary[method] = (paymentMethodSummary[method] || 0) + (r.amountPaid || 0);
                                });

                                // 2. Cash Book calculation
                                const allCashEntries = [
                                    ...mappedReceipts.map((r: any) => ({
                                        date: r.paymentDate || r.createdAt || '',
                                        particulars: `Fee Collection — ${r.studentName || r.payerName || 'Student'}`,
                                        ref: r.receiptNumber || r.id?.slice(-8),
                                        debit: r.amountPaid || 0,
                                        credit: 0,
                                        method: r.paymentMethod || r.method || 'Cash'
                                    })),
                                    ...(props.expenses || []).map((e: any) => ({
                                        date: e.date || '',
                                        particulars: `Expense — ${e.description || 'General Expenditure'} (${e.category || 'General'})`,
                                        ref: e.id?.slice(-8) || 'EXP',
                                        debit: 0,
                                        credit: e.amount || 0,
                                        method: 'Expense'
                                    }))
                                ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                                // Calculate bf balance before start of period
                                let bfBalance = 0;
                                allCashEntries.forEach(entry => {
                                    if (!entry.date) return;
                                    const entryDate = new Date(entry.date);
                                    const now = new Date();
                                    let isPrior = false;
                                    if (cbPeriod === 'this_month') {
                                        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                                        isPrior = entryDate < startOfThisMonth;
                                    } else if (cbPeriod === 'last_month') {
                                        const startOfLastMonth = now.getMonth() === 0 
                                            ? new Date(now.getFullYear() - 1, 11, 1) 
                                            : new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                        isPrior = entryDate < startOfLastMonth;
                                    } else if (cbPeriod === 'custom') {
                                        const start = cbStartDate ? new Date(cbStartDate) : null;
                                        if (start) {
                                            isPrior = entryDate < start;
                                        }
                                    }
                                    if (isPrior) {
                                        bfBalance += entry.debit - entry.credit;
                                    }
                                });

                                // Filter entries within chosen period
                                const filteredCashEntries = allCashEntries.filter(entry => {
                                    if (!entry.date) return true;
                                    const entryDate = new Date(entry.date);
                                    const now = new Date();
                                    if (cbPeriod === 'this_month') {
                                        return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
                                    } else if (cbPeriod === 'last_month') {
                                        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                                        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                                        return entryDate.getMonth() === lastMonth && entryDate.getFullYear() === year;
                                    } else if (cbPeriod === 'custom') {
                                        const start = cbStartDate ? new Date(cbStartDate) : null;
                                        const end = cbEndDate ? new Date(cbEndDate) : null;
                                        if (start && entryDate < start) return false;
                                        if (end && entryDate > end) return false;
                                    }
                                    return true;
                                });

                                // Compute itemized cash book list (latest first)
                                let currentItemBal = bfBalance;
                                const itemizedCashBook = filteredCashEntries.map(entry => {
                                    currentItemBal += entry.debit - entry.credit;
                                    return {
                                        date: entry.date.split('T')[0] || '—',
                                        particulars: entry.particulars,
                                        ref: entry.ref,
                                        debit: entry.debit,
                                        credit: entry.credit,
                                        method: entry.method,
                                        balance: currentItemBal,
                                    };
                                }).reverse();

                                // Group daily details for the Daily Cash Book
                                const dailyGroups: Record<string, { date: string; debit: number; credit: number; receiptsList: any[]; expensesList: any[] }> = {};
                                filteredCashEntries.forEach(entry => {
                                    const dateStr = entry.date.split('T')[0] || '—';
                                    if (!dailyGroups[dateStr]) {
                                        dailyGroups[dateStr] = { date: dateStr, debit: 0, credit: 0, receiptsList: [], expensesList: [] };
                                    }
                                    const group = dailyGroups[dateStr];
                                    group.debit += entry.debit;
                                    group.credit += entry.credit;
                                    if (entry.debit > 0) group.receiptsList.push(entry);
                                    if (entry.credit > 0) group.expensesList.push(entry);
                                });

                                // Calculate daily running balances
                                const sortedDays = Object.values(dailyGroups).sort((a, b) => a.date.localeCompare(b.date));
                                let dailyRunning = bfBalance;
                                const dailyCashBook = sortedDays.map(day => {
                                    const bf = dailyRunning;
                                    dailyRunning += day.debit - day.credit;
                                    const cf = dailyRunning;

                                    // Receipt numbers min/max range
                                    const rcptNums = day.receiptsList.map(r => r.ref).filter(Boolean);
                                    const minRcpt = rcptNums.length > 0 ? rcptNums.reduce((min, cur) => cur < min ? cur : min) : '—';
                                    const maxRcpt = rcptNums.length > 0 ? rcptNums.reduce((max, cur) => cur > max ? cur : max) : '—';

                                    // Payment methods breakdown
                                    const methods: Record<string, number> = {};
                                    day.receiptsList.forEach(r => {
                                        const m = r.method || 'Cash';
                                        methods[m] = (methods[m] || 0) + r.debit;
                                    });
                                    const methodSummary = Object.entries(methods)
                                        .map(([m, val]) => `${m}: KSh ${val.toLocaleString()}`)
                                        .join(' · ');

                                    return {
                                        ...day,
                                        bf,
                                        cf,
                                        minRcpt,
                                        maxRcpt,
                                        methodSummary
                                    };
                                }).reverse();

                                // 3. Fee Register calculation
                                const getTermIndex = (dateStr: string) => {
                                    if (!dateStr) return 0;
                                    const d = new Date(dateStr);
                                    if (isNaN(d.getTime())) return 0;
                                    
                                    const matchedSemIndex = (props.semesters || []).findIndex((sem: any) => {
                                        if (!sem.startDate || !sem.endDate) return false;
                                        const start = new Date(sem.startDate);
                                        const end = new Date(sem.endDate);
                                        return d >= start && d <= end;
                                    });
                                    if (matchedSemIndex !== -1) {
                                        return Math.min(matchedSemIndex, 2);
                                    }

                                    const month = d.getMonth() + 1;
                                    if (month >= 1 && month <= 4) return 0;
                                    if (month >= 5 && month <= 8) return 1;
                                    return 2;
                                };

                                const filteredFeeRegStudents = props.students.filter((s: any) => {
                                    if (!feeRegClass || feeRegClass === 'All') return true;
                                    const sClass = s.gradeLevel || s.class || 'Unclassified';
                                    return sClass.toLowerCase() === feeRegClass.toLowerCase();
                                });

                                const feeRegister = filteredFeeRegStudents.map((s: any) => {
                                    const sRcpts = mappedReceipts.filter((r: any) => r.studentId === s.id);
                                    const sInvs = mappedInvoices.filter((i: any) => i.studentId === s.id);

                                    const bf = s.metadata?.openingBalance || 0;
                                    const totalInvoiced = sInvs.reduce((acc: number, inv: any) => {
                                        const items = getInvoiceItems(inv);
                                        return acc + items.reduce((sSum, item) => sSum + (item.amount || 0), 0);
                                    }, 0);

                                    let t1Amount = 0, t1Count = 0;
                                    let t2Amount = 0, t2Count = 0;
                                    let t3Amount = 0, t3Count = 0;

                                    sRcpts.forEach((rcpt: any) => {
                                        const rDate = rcpt.paymentDate || rcpt.createdAt || '';
                                        const tIdx = getTermIndex(rDate);
                                        const amt = rcpt.amountPaid || 0;

                                        if (tIdx === 0) {
                                            t1Amount += amt;
                                            t1Count++;
                                        } else if (tIdx === 1) {
                                            t2Amount += amt;
                                            t2Count++;
                                        } else {
                                            t3Amount += amt;
                                            t3Count++;
                                        }
                                    });

                                    const totalPaid = t1Amount + t2Amount + t3Amount;
                                    const netBalance = (bf + totalInvoiced) - totalPaid;
                                    const prepaid = netBalance < 0 ? Math.abs(netBalance) : 0;
                                    const arrears = netBalance > 0 ? netBalance : 0;

                                    return {
                                        id: s.id,
                                        name: s.name,
                                        admissionNumber: s.admissionNumber || s.admNo || '',
                                        class: s.gradeLevel || s.class || 'Unclassified',
                                        bf,
                                        t1Count,
                                        t1Amount,
                                        t2Count,
                                        t2Amount,
                                        t3Count,
                                        t3Amount,
                                        totalPaid,
                                        prepaid,
                                        arrears
                                    };
                                });

                                const TH = (label: string) => <th className="py-3 px-3 font-black text-slate-400 uppercase tracking-widest text-[10px] border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">{label}</th>;
                                const TD = ({ children, cls = '' }: any) => <td className={`py-2.5 px-3 text-xs ${cls}`}>{children}</td>;

                                return (
                                    <div className="space-y-6 animate-in fade-in duration-200">
                                        
                                        {/* 1. Collection Tab */}
                                        {ledgerSubTab === 'collection_summary' && (
                                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8 space-y-6">
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Daily Fee Collection Summary</h3>
                                                    <p className="text-[10px] text-slate-400 font-medium">Daily summary of collections broken down by date and voteheads</p>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr>
                                                                {TH('Date')}
                                                                {TH('Receipt Range')}
                                                                {allVoteHeads.map(vh => TH(vh))}
                                                                {TH('General')}
                                                                {TH('Total Collected')}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {collectionList.map((day, i) => (
                                                                <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                    <TD cls="font-bold text-slate-900 dark:text-white">{day.date}</TD>
                                                                    <TD cls="text-slate-500 font-bold">
                                                                        {day.minRcpt === day.maxRcpt ? day.minRcpt : `${day.minRcpt} · ${day.maxRcpt}`}
                                                                    </TD>
                                                                    {allVoteHeads.map(vh => (
                                                                        <TD key={vh} cls="font-medium text-slate-700 dark:text-slate-300">
                                                                            {day.voteMap[vh] > 0 ? `KSh ${Math.round(day.voteMap[vh]).toLocaleString()}` : '—'}
                                                                        </TD>
                                                                    ))}
                                                                    <TD cls="font-medium text-slate-700 dark:text-slate-300">
                                                                        {day.voteMap['General'] > 0 ? `KSh ${Math.round(day.voteMap['General']).toLocaleString()}` : '—'}
                                                                    </TD>
                                                                    <TD cls="font-black text-emerald-600">KSh {day.total.toLocaleString()}</TD>
                                                                </tr>
                                                            ))}
                                                            {collectionList.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={allVoteHeads.length + 4} className="py-8 text-center text-slate-400 font-medium">No collections recorded.</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Bottom Payment Method Summary */}
                                                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60">
                                                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Payment Method Aggregated Totals</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {Object.entries(paymentMethodSummary).map(([method, total]) => (
                                                            <div key={method} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{method}</p>
                                                                <p className="text-lg font-black text-emerald-600 mt-1">KSh {total.toLocaleString()}</p>
                                                            </div>
                                                        ))}
                                                        {Object.keys(paymentMethodSummary).length === 0 && (
                                                            <p className="text-xs text-slate-400 col-span-4 text-center font-medium">No payment methods to summarize.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 2. Cash Book */}
                                        {ledgerSubTab === 'cash_book' && (
                                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8 space-y-6">
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                    <div>
                                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Cash Book Ledger</h3>
                                                        <p className="text-[10px] text-slate-400 font-medium">Double entry journal grouped by day with live Balance Brought Forward (bf)</p>
                                                    </div>
                                                    
                                                    {/* Print Button */}
                                                    <button onClick={() => window.print()} className="print:hidden flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">🖨️ Print Cash Book</button>
                                                </div>

                                                {/* Filters block */}
                                                <div className="print:hidden bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 flex flex-col md:flex-row gap-4 items-end">
                                                    <div className="flex-1 space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reporting Period</label>
                                                        <select value={cbPeriod} onChange={e => setCbPeriod(e.target.value as any)} className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-900 dark:text-white">
                                                            <option value="all">All Time</option>
                                                            <option value="this_month">This Month</option>
                                                            <option value="last_month">Last Month</option>
                                                            <option value="custom">Custom Date Range</option>
                                                        </select>
                                                    </div>

                                                    {cbPeriod === 'custom' && (
                                                        <>
                                                            <div className="w-full md:w-44 space-y-2">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                                                                <input type="date" value={cbStartDate} onChange={e => setCbStartDate(e.target.value)} className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-900 dark:text-white" />
                                                            </div>
                                                            <div className="w-full md:w-44 space-y-2">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">End Date</label>
                                                                <input type="date" value={cbEndDate} onChange={e => setCbEndDate(e.target.value)} className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-900 dark:text-white" />
                                                            </div>
                                                        </>
                                                    )}

                                                    <div className="flex-1 space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ledger View</label>
                                                        <select value={cbViewType} onChange={e => setCbViewType(e.target.value as any)} className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-900 dark:text-white">
                                                            <option value="unified">Unified Daily Summary</option>
                                                            <option value="receipts">Receipts Cash Book (Debit Journal)</option>
                                                            <option value="payments">Payments Cash Book (Credit Journal)</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Unified view */}
                                                {cbViewType === 'unified' && (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr>
                                                                    {TH('Date')}
                                                                    {TH('Balance B/F')}
                                                                    {TH('Receipts Range & Modes')}
                                                                    {TH('Inflow (Dr)')}
                                                                    {TH('Outflow (Cr)')}
                                                                    {TH('Balance C/F')}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {dailyCashBook.map((day, idx) => {
                                                                    const isExpanded = expandedCbDates.includes(day.date);
                                                                    return (
                                                                        <React.Fragment key={idx}>
                                                                            <tr 
                                                                                onClick={() => setExpandedCbDates(prev => prev.includes(day.date) ? prev.filter(d => d !== day.date) : [...prev, day.date])}
                                                                                className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                                                                            >
                                                                                <TD cls="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                                    <span className="print:hidden text-[9px] text-slate-400">{isExpanded ? '▼' : '▶'}</span>
                                                                                    {day.date}
                                                                                </TD>
                                                                                <TD cls="text-slate-500 font-bold">KSh {day.bf.toLocaleString()}</TD>
                                                                                <TD cls="text-[10px] text-slate-600 dark:text-slate-400">
                                                                                    {day.debit > 0 ? (
                                                                                        <div>
                                                                                            <span className="font-bold text-indigo-600">Range: {day.minRcpt === day.maxRcpt ? day.minRcpt : `${day.minRcpt} - ${day.maxRcpt}`}</span>
                                                                                            <p className="text-[9px] text-slate-400 mt-0.5">{day.methodSummary}</p>
                                                                                        </div>
                                                                                    ) : '—'}
                                                                                </TD>
                                                                                <TD cls="font-black text-emerald-600">{day.debit > 0 ? `KSh ${day.debit.toLocaleString()}` : '—'}</TD>
                                                                                <TD cls="font-black text-rose-600">{day.credit > 0 ? `KSh ${day.credit.toLocaleString()}` : '—'}</TD>
                                                                                <TD cls="font-black text-slate-900 dark:text-white">KSh {day.cf.toLocaleString()}</TD>
                                                                            </tr>
                                                                            {isExpanded && (
                                                                                <tr className="print:hidden bg-slate-50/50 dark:bg-slate-950/20">
                                                                                    <td colSpan={6} className="p-4 border-b border-slate-100 dark:border-slate-800">
                                                                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 space-y-4 shadow-sm text-left">
                                                                                            {day.debit > 0 && (
                                                                                                <div>
                                                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Itemized Inflows (Receipts)</p>
                                                                                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                                                                                                        {day.receiptsList.map((r: any, rIdx: number) => (
                                                                                                            <div key={rIdx} className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 border-b border-slate-50 dark:border-slate-800/40 pb-1">
                                                                                                                <span>{r.particulars} ({r.ref}) · <span className="font-bold text-slate-500">{r.method}</span></span>
                                                                                                                <span className="font-bold text-emerald-600">KSh {r.debit.toLocaleString()}</span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                            {day.credit > 0 && (
                                                                                                <div>
                                                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Itemized Outflows (Expenses)</p>
                                                                                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                                                                                                        {day.expensesList.map((e: any, eIdx: number) => (
                                                                                                            <div key={eIdx} className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 border-b border-slate-50 dark:border-slate-800/40 pb-1">
                                                                                                                <span>{e.particulars} ({e.ref})</span>
                                                                                                                <span className="font-bold text-rose-600">KSh {e.credit.toLocaleString()}</span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                                {dailyCashBook.length === 0 && (
                                                                    <tr>
                                                                        <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">No transactions recorded for this period.</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                                {/* Receipts Debit Journal View */}
                                                {cbViewType === 'receipts' && (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr>
                                                                    {TH('Date')}
                                                                    {TH('Balance B/F')}
                                                                    {TH('Receipts Range')}
                                                                    {TH('Payment Modes Summary')}
                                                                    {TH('Total Inflow (Dr)')}
                                                                    {TH('Balance C/F')}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {dailyCashBook.filter(d => d.debit > 0).map((day, idx) => {
                                                                    const isExpanded = expandedCbDates.includes(day.date);
                                                                    return (
                                                                        <React.Fragment key={idx}>
                                                                            <tr 
                                                                                onClick={() => setExpandedCbDates(prev => prev.includes(day.date) ? prev.filter(d => d !== day.date) : [...prev, day.date])}
                                                                                className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                                                                            >
                                                                                <TD cls="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                                    <span className="print:hidden text-[9px] text-slate-400">{isExpanded ? '▼' : '▶'}</span>
                                                                                    {day.date}
                                                                                </TD>
                                                                                <TD cls="text-slate-500 font-bold">KSh {day.bf.toLocaleString()}</TD>
                                                                                <TD cls="font-bold text-indigo-600">
                                                                                    {day.minRcpt === day.maxRcpt ? day.minRcpt : `${day.minRcpt} - ${day.maxRcpt}`}
                                                                                </TD>
                                                                                <TD cls="text-[10px] text-slate-500">{day.methodSummary || '—'}</TD>
                                                                                <TD cls="font-black text-emerald-600">KSh {day.debit.toLocaleString()}</TD>
                                                                                <TD cls="font-black text-slate-900 dark:text-white">KSh {day.cf.toLocaleString()}</TD>
                                                                            </tr>
                                                                            {isExpanded && (
                                                                                <tr className="print:hidden bg-slate-50/50 dark:bg-slate-950/20">
                                                                                    <td colSpan={6} className="p-4 border-b border-slate-100 dark:border-slate-800">
                                                                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 space-y-4 shadow-sm text-left">
                                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Itemized Inflows (Receipts)</p>
                                                                                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                                                                                                {day.receiptsList.map((r: any, rIdx: number) => (
                                                                                                    <div key={rIdx} className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 border-b border-slate-50 dark:border-slate-800/40 pb-1">
                                                                                                        <span>{r.particulars} ({r.ref}) · <span className="font-bold text-slate-500">{r.method}</span></span>
                                                                                                        <span className="font-bold text-emerald-600">KSh {r.debit.toLocaleString()}</span>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                                {dailyCashBook.filter(d => d.debit > 0).length === 0 && (
                                                                    <tr>
                                                                        <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">No receipts recorded for this period.</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                                {/* Payments Credit Journal View */}
                                                {cbViewType === 'payments' && (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr>
                                                                    {TH('Date')}
                                                                    {TH('Balance B/F')}
                                                                    {TH('Payments / Expense Breakdown')}
                                                                    {TH('Total Outflow (Cr)')}
                                                                    {TH('Balance C/F')}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {dailyCashBook.filter(d => d.credit > 0).map((day, idx) => {
                                                                    const isExpanded = expandedCbDates.includes(day.date);
                                                                    return (
                                                                        <React.Fragment key={idx}>
                                                                            <tr 
                                                                                onClick={() => setExpandedCbDates(prev => prev.includes(day.date) ? prev.filter(d => d !== day.date) : [...prev, day.date])}
                                                                                className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                                                                            >
                                                                                <TD cls="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                                    <span className="print:hidden text-[9px] text-slate-400">{isExpanded ? '▼' : '▶'}</span>
                                                                                    {day.date}
                                                                                </TD>
                                                                                <TD cls="text-slate-500 font-bold">KSh {day.bf.toLocaleString()}</TD>
                                                                                <TD cls="text-[10px] text-slate-600 dark:text-slate-400">
                                                                                    <span className="font-semibold text-rose-600">{day.expensesList.length} expenses recorded</span>
                                                                                </TD>
                                                                                <TD cls="font-black text-rose-600">KSh {day.credit.toLocaleString()}</TD>
                                                                                <TD cls="font-black text-slate-900 dark:text-white">KSh {day.cf.toLocaleString()}</TD>
                                                                            </tr>
                                                                            {isExpanded && (
                                                                                <tr className="print:hidden bg-slate-50/50 dark:bg-slate-950/20">
                                                                                    <td colSpan={5} className="p-4 border-b border-slate-100 dark:border-slate-800">
                                                                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 space-y-4 shadow-sm text-left">
                                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Itemized Outflows (Expenses)</p>
                                                                                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                                                                                                {day.expensesList.map((e: any, eIdx: number) => (
                                                                                                    <div key={eIdx} className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 border-b border-slate-50 dark:border-slate-800/40 pb-1">
                                                                                                        <span>{e.particulars} ({e.ref})</span>
                                                                                                        <span className="font-bold text-rose-600">KSh {e.credit.toLocaleString()}</span>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                                {dailyCashBook.filter(d => d.credit > 0).length === 0 && (
                                                                    <tr>
                                                                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">No expenses recorded for this period.</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 3. Fee Register */}
                                        {ledgerSubTab === 'fee_register' && (() => {
                                            const feeRegClasses = Array.from(new Set(props.students.map((s: any) => s.gradeLevel || s.class || 'Unclassified'))).filter(Boolean).sort() as string[];
                                            
                                            const totalBfSum = feeRegister.reduce((s, it) => s + it.bf, 0);
                                            const totalT1Sum = feeRegister.reduce((s, it) => s + it.t1Amount, 0);
                                            const totalT2Sum = feeRegister.reduce((s, it) => s + it.t2Amount, 0);
                                            const totalT3Sum = feeRegister.reduce((s, it) => s + it.t3Amount, 0);
                                            const totalPaidSum = feeRegister.reduce((s, it) => s + it.totalPaid, 0);
                                            const totalPrepaidSum = feeRegister.reduce((s, it) => s + it.prepaid, 0);
                                            const totalArrearsSum = feeRegister.reduce((s, it) => s + it.arrears, 0);

                                            return (
                                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8 space-y-6">
                                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                        <div>
                                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Fee Register Summary</h3>
                                                            <p className="text-[10px] text-slate-400 font-medium">Term-by-term installment details, pre-payments, and outstanding arrears</p>
                                                        </div>
                                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">FORM:</span>
                                                                <select 
                                                                    value={feeRegClass} 
                                                                    onChange={e => setFeeRegClass(e.target.value)} 
                                                                    className="py-1.5 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-900 dark:text-white"
                                                                >
                                                                    <option value="All">All Classes</option>
                                                                    {feeRegClasses.map(cls => (
                                                                        <option key={cls} value={cls}>{cls}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <button onClick={() => window.print()} className="print:hidden flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">🖨️ Print</button>
                                                        </div>
                                                    </div>

                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse border border-slate-100 dark:border-slate-800/40">
                                                            <thead>
                                                                <tr className="bg-slate-50 dark:bg-slate-950/50">
                                                                    <th rowSpan={2} className="py-3 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 whitespace-nowrap">Name</th>
                                                                    <th rowSpan={2} className="py-3 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 whitespace-nowrap">Adm.No</th>
                                                                    <th rowSpan={2} className="py-3 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-right">Amount Bf.</th>
                                                                    <th colSpan={2} className="py-2 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 text-center">1st TERM INSTALLMENTS</th>
                                                                    <th colSpan={2} className="py-2 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 text-center">2nd TERM INSTALLMENTS</th>
                                                                    <th colSpan={2} className="py-2 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 text-center">3rd TERM INSTALLMENTS</th>
                                                                    <th rowSpan={2} className="py-3 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-right">TOTAL</th>
                                                                    <th rowSpan={2} className="py-3 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-right">PREPAID</th>
                                                                    <th rowSpan={2} className="py-3 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-right">ARREARS</th>
                                                                </tr>
                                                                <tr className="bg-slate-50 dark:bg-slate-950/50">
                                                                    <th className="py-2 px-2 font-bold text-slate-400 text-[8px] uppercase border border-slate-100 dark:border-slate-800/60 text-center">No. Of. Inst.</th>
                                                                    <th className="py-2 px-2 font-bold text-slate-400 text-[8px] uppercase border border-slate-100 dark:border-slate-800/60 text-right">Term 1 Amount</th>
                                                                    <th className="py-2 px-2 font-bold text-slate-400 text-[8px] uppercase border border-slate-100 dark:border-slate-800/60 text-center">No. Of. Inst.</th>
                                                                    <th className="py-2 px-2 font-bold text-slate-400 text-[8px] uppercase border border-slate-100 dark:border-slate-800/60 text-right">Term 2 Amount</th>
                                                                    <th className="py-2 px-2 font-bold text-slate-400 text-[8px] uppercase border border-slate-100 dark:border-slate-800/60 text-center">No. Of. Inst.</th>
                                                                    <th className="py-2 px-2 font-bold text-slate-400 text-[8px] uppercase border border-slate-100 dark:border-slate-800/60 text-right">Term 3 Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {feeRegister.map((s, i) => (
                                                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 text-[11px]">
                                                                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-white border border-slate-50 dark:border-slate-800/40 whitespace-nowrap">{s.name}</td>
                                                                        <td className="py-2.5 px-3 text-slate-500 border border-slate-50 dark:border-slate-800/40">{s.admissionNumber}</td>
                                                                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 border border-slate-50 dark:border-slate-800/40 text-right font-medium">
                                                                            {s.bf > 0 ? `KSh ${s.bf.toLocaleString()}` : '0.00'}
                                                                        </td>
                                                                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 border border-slate-50 dark:border-slate-800/40 text-center font-bold">
                                                                            {s.t1Count > 0 ? s.t1Count : '—'}
                                                                        </td>
                                                                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 border border-slate-50 dark:border-slate-800/40 text-right font-medium">
                                                                            {s.t1Amount > 0 ? `KSh ${s.t1Amount.toLocaleString()}` : '0.00'}
                                                                        </td>
                                                                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 border border-slate-50 dark:border-slate-800/40 text-center font-bold">
                                                                            {s.t2Count > 0 ? s.t2Count : '—'}
                                                                        </td>
                                                                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 border border-slate-50 dark:border-slate-800/40 text-right font-medium">
                                                                            {s.t2Amount > 0 ? `KSh ${s.t2Amount.toLocaleString()}` : '0.00'}
                                                                        </td>
                                                                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 border border-slate-50 dark:border-slate-800/40 text-center font-bold">
                                                                            {s.t3Count > 0 ? s.t3Count : '—'}
                                                                        </td>
                                                                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 border border-slate-50 dark:border-slate-800/40 text-right font-medium">
                                                                            {s.t3Amount > 0 ? `KSh ${s.t3Amount.toLocaleString()}` : '0.00'}
                                                                        </td>
                                                                        <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white border border-slate-50 dark:border-slate-800/40 text-right">
                                                                            KSh {s.totalPaid.toLocaleString()}
                                                                        </td>
                                                                        <td className="py-2.5 px-3 font-black text-emerald-600 border border-slate-50 dark:border-slate-800/40 text-right">
                                                                            {s.prepaid > 0 ? `KSh ${s.prepaid.toLocaleString()}` : '0.00'}
                                                                        </td>
                                                                        <td className="py-2.5 px-3 font-black text-rose-600 border border-slate-50 dark:border-slate-800/40 text-right">
                                                                            {s.arrears > 0 ? `KSh ${s.arrears.toLocaleString()}` : '0.00'}
                                                                        </td>
                                                                    </tr>
                                                                ))}

                                                                {feeRegister.length > 0 && (
                                                                    <tr className="bg-slate-50 dark:bg-slate-950 font-black text-[11px] text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-800">
                                                                        <td colSpan={2} className="py-3 px-3 text-right uppercase tracking-wider">TOTAL SUMMARY:</td>
                                                                        <td className="py-3 px-3 text-right">KSh {totalBfSum.toLocaleString()}</td>
                                                                        <td colSpan={2} className="py-3 px-3 text-right">KSh {totalT1Sum.toLocaleString()}</td>
                                                                        <td colSpan={2} className="py-3 px-3 text-right">KSh {totalT2Sum.toLocaleString()}</td>
                                                                        <td colSpan={2} className="py-3 px-3 text-right">KSh {totalT3Sum.toLocaleString()}</td>
                                                                        <td className="py-3 px-3 text-right">KSh {totalPaidSum.toLocaleString()}</td>
                                                                        <td className="py-3 px-3 text-right text-emerald-600">KSh {totalPrepaidSum.toLocaleString()}</td>
                                                                        <td className="py-3 px-3 text-right text-rose-600">KSh {totalArrearsSum.toLocaleString()}</td>
                                                                    </tr>
                                                                )}

                                                                {feeRegister.length === 0 && (
                                                                    <tr>
                                                                        <td colSpan={12} className="py-8 text-center text-slate-400 font-medium border border-slate-50 dark:border-slate-800/40">No fee payments registered.</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* 4. Cash Flow Statement */}
                                        {ledgerSubTab === 'cash_flow' && (() => {
                                            // Categorize cash inflows & outflows
                                            const totalInflows = mappedReceipts.reduce((sum: number, r: any) => sum + (r.amountPaid || 0), 0);
                                            
                                            let operatingOutflow = 0;
                                            let investingOutflow = 0;
                                            let financingOutflow = 0;

                                            const operatingDetails: Array<{ desc: string; amount: number; date: string }> = [];
                                            const investingDetails: Array<{ desc: string; amount: number; date: string }> = [];
                                            const financingDetails: Array<{ desc: string; amount: number; date: string }> = [];

                                            (props.expenses || []).forEach((e: any) => {
                                                const category = (e.category || '').toLowerCase();
                                                const desc = (e.description || '').toLowerCase();
                                                const amount = e.amount || 0;
                                                const date = e.date?.split('T')[0] || '—';

                                                const isInvesting = category.includes('asset') || category.includes('equipment') || category.includes('computer') || category.includes('construction') || category.includes('building') || category.includes('land') || category.includes('furniture') || desc.includes('asset') || desc.includes('equipment') || desc.includes('purchase');
                                                const isFinancing = category.includes('loan') || category.includes('bank') || category.includes('capital') || category.includes('interest') || category.includes('dividend');

                                                if (isInvesting) {
                                                    investingOutflow += amount;
                                                    investingDetails.push({ desc: e.description, amount, date });
                                                } else if (isFinancing) {
                                                    financingOutflow += amount;
                                                    financingDetails.push({ desc: e.description, amount, date });
                                                } else {
                                                    operatingOutflow += amount;
                                                    operatingDetails.push({ desc: e.description, amount, date });
                                                }
                                            });

                                            const netOperating = totalInflows - operatingOutflow;
                                            const netInvesting = -investingOutflow;
                                            const netFinancing = -financingOutflow;
                                            const netCashChange = netOperating + netInvesting + netFinancing;

                                            const SectionTitle = ({ title }: { title: string }) => (
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">{title}</h4>
                                            );

                                            const Row = ({ label, val, isBold = false, isSubtotal = false }: { label: string; val: number; isBold?: boolean; isSubtotal?: boolean }) => (
                                                <div className={`flex justify-between py-2 text-xs ${isBold ? 'font-black text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'} ${isSubtotal ? 'border-t border-slate-200 dark:border-slate-700 mt-1 pt-2' : ''}`}>
                                                    <span>{label}</span>
                                                    <span className={val < 0 ? 'text-rose-600 font-bold' : val > 0 && isSubtotal ? 'text-emerald-600 font-bold' : ''}>
                                                        {val < 0 ? `(KSh ${Math.abs(val).toLocaleString()})` : `KSh ${val.toLocaleString()}`}
                                                    </span>
                                                </div>
                                            );

                                            return (
                                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8 space-y-6">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Statement of Cash Flows</h3>
                                                            <p className="text-[10px] text-slate-400 font-medium">Summarized cash inflows and outflows categorized by Operating, Investing, and Financing activities</p>
                                                        </div>
                                                        <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">🖨️ Print Statement</button>
                                                    </div>

                                                    <div className="max-w-2xl mx-auto space-y-8 bg-slate-50/50 dark:bg-slate-950/40 p-8 rounded-[2rem] border border-slate-100/80 dark:border-slate-800/30">
                                                        {/* Operating Activities */}
                                                        <div>
                                                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Cash Flows from Operating Activities</h4>
                                                                <button onClick={() => setShowOpPreview(!showOpPreview)} className="print:hidden text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors">
                                                                    {showOpPreview ? 'Hide Details' : 'Preview Details'}
                                                                </button>
                                                            </div>
                                                            <Row label="Cash Inflow: Fee Collections" val={totalInflows} />
                                                            <Row label="Cash Outflow: Operating Expenses" val={-operatingOutflow} />
                                                            <Row label="Net Cash from Operating Activities" val={netOperating} isBold isSubtotal />

                                                            {showOpPreview && (
                                                                <div className="print:hidden mt-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Collections breakdown ({mappedReceipts.length} items)</p>
                                                                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                                                            {mappedReceipts.map((r: any, idx: number) => (
                                                                                <div key={idx} className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 border-b border-slate-50 dark:border-slate-800/40 pb-1">
                                                                                    <span>{r.createdAt?.split('T')[0] || r.paymentDate?.split('T')[0] || '—'} · {r.studentName || 'Student'} ({r.receiptNumber || r.id?.slice(-8)})</span>
                                                                                    <span className="font-bold text-emerald-600">KSh {r.amountPaid.toLocaleString()}</span>
                                                                                </div>
                                                                            ))}
                                                                            {mappedReceipts.length === 0 && <p className="text-[10px] text-slate-400">No collections found.</p>}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Operating Expenses breakdown ({operatingDetails.length} items)</p>
                                                                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                                                            {operatingDetails.map((o, idx) => (
                                                                                <div key={idx} className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 border-b border-slate-50 dark:border-slate-800/40 pb-1">
                                                                                    <span>{o.date} · {o.desc}</span>
                                                                                    <span className="font-bold text-rose-600">KSh {o.amount.toLocaleString()}</span>
                                                                                </div>
                                                                            ))}
                                                                            {operatingDetails.length === 0 && <p className="text-[10px] text-slate-400">No operating expenses found.</p>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Investing Activities */}
                                                        <div>
                                                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Cash Flows from Investing Activities</h4>
                                                                <button onClick={() => setShowInvPreview(!showInvPreview)} className="print:hidden text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors">
                                                                    {showInvPreview ? 'Hide Details' : 'Preview Details'}
                                                                </button>
                                                            </div>
                                                            <Row label="Cash Outflow: Asset Purchases & Capital Capex" val={-investingOutflow} />
                                                            <Row label="Net Cash used in Investing Activities" val={netInvesting} isBold isSubtotal />

                                                            {showInvPreview && (
                                                                <div className="print:hidden mt-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Investing Expenses breakdown ({investingDetails.length} items)</p>
                                                                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                                                        {investingDetails.map((inv, idx) => (
                                                                            <div key={idx} className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 border-b border-slate-50 dark:border-slate-800/40 pb-1">
                                                                                <span>{inv.date} · {inv.desc}</span>
                                                                                <span className="font-bold text-rose-600">KSh {inv.amount.toLocaleString()}</span>
                                                                            </div>
                                                                        ))}
                                                                        {investingDetails.length === 0 && <p className="text-[10px] text-slate-400">No investing activities found.</p>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Financing Activities */}
                                                        <div>
                                                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Cash Flows from Financing Activities</h4>
                                                                <button onClick={() => setShowFinPreview(!showFinPreview)} className="print:hidden text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors">
                                                                    {showFinPreview ? 'Hide Details' : 'Preview Details'}
                                                                </button>
                                                            </div>
                                                            <Row label="Cash Outflow: Finance Costs & Loans Repaid" val={-financingOutflow} />
                                                            <Row label="Net Cash used in Financing Activities" val={netFinancing} isBold isSubtotal />

                                                            {showFinPreview && (
                                                                <div className="print:hidden mt-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Financing Expenses breakdown ({financingDetails.length} items)</p>
                                                                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                                                        {financingDetails.map((fin, idx) => (
                                                                            <div key={idx} className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 border-b border-slate-50 dark:border-slate-800/40 pb-1">
                                                                                <span>{fin.date} · {fin.desc}</span>
                                                                                <span className="font-bold text-rose-600">KSh {fin.amount.toLocaleString()}</span>
                                                                            </div>
                                                                        ))}
                                                                        {financingDetails.length === 0 && <p className="text-[10px] text-slate-400">No financing activities found.</p>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Summary block */}
                                                        <div className="border-t-2 border-dashed border-slate-200 dark:border-slate-700 pt-6 space-y-2">
                                                            <div className="flex justify-between font-black text-sm text-slate-950 dark:text-white">
                                                                <span>Net Increase / (Decrease) in Cash</span>
                                                                <span className={netCashChange < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                                                    {netCashChange < 0 ? `(KSh ${Math.abs(netCashChange).toLocaleString()})` : `KSh ${netCashChange.toLocaleString()}`}
                                                                </span>
                                                            </div>
                                                            <Row label="Cash at Beginning of Period" val={0} />
                                                            <div className="flex justify-between font-black text-base text-indigo-600 border-t border-indigo-100 dark:border-indigo-900/40 pt-3 mt-3">
                                                                <span>Cash at End of Period</span>
                                                                <span>KSh {netCashChange.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* 5. Fees Installments */}
                                        {ledgerSubTab === 'fee_installment' && (() => {
                                            const installmentClasses = Array.from(new Set(props.students.map((s: any) => s.gradeLevel || s.class || 'Unclassified'))).filter(Boolean).sort() as string[];

                                            const filteredStudents = props.students.filter((s: any) => {
                                                if (!installmentClass || installmentClass === 'All') return true;
                                                const sClass = s.gradeLevel || s.class || 'Unclassified';
                                                return sClass.toLowerCase() === installmentClass.toLowerCase();
                                            });

                                            const classEnrollment = filteredStudents.length;

                                            // Map students to their installments
                                            const studentInstallments = filteredStudents.map((s: any) => {
                                                const sRcpts = mappedReceipts
                                                    .filter((r: any) => r.studentId === s.id)
                                                    .sort((a: any, b: any) => {
                                                        const dA = new Date(a.paymentDate || a.createdAt || 0).getTime();
                                                        const dB = new Date(b.paymentDate || b.createdAt || 0).getTime();
                                                        return dA - dB;
                                                    });

                                                const sInvs = mappedInvoices.filter((i: any) => i.studentId === s.id);
                                                const bf = s.metadata?.openingBalance || 0;
                                                const totalInvoiced = sInvs.reduce((acc: number, inv: any) => {
                                                    const items = getInvoiceItems(inv);
                                                    return acc + items.reduce((sSum, item) => sSum + (item.amount || 0), 0);
                                                }, 0);
                                                const expectedFees = bf + totalInvoiced;

                                                // Extract first 12 installments
                                                const installments: number[] = Array(12).fill(0);
                                                sRcpts.forEach((r: any, idx: number) => {
                                                    if (idx < 12) {
                                                        installments[idx] = r.amountPaid || 0;
                                                    }
                                                });

                                                const totals = sRcpts.reduce((sum: number, r: any) => sum + (r.amountPaid || 0), 0);
                                                const balance = expectedFees - totals;
                                                const pctPaid = expectedFees !== 0 ? Math.round((totals / expectedFees) * 100) : 0;

                                                return {
                                                    id: s.id,
                                                    name: s.name,
                                                    admissionNumber: s.admissionNumber || s.admNo || '',
                                                    expectedFees,
                                                    installments,
                                                    totals,
                                                    balance,
                                                    pctPaid,
                                                    receipts: sRcpts
                                                };
                                            });

                                            // Aggregated sums
                                            const totalExpectedSum = studentInstallments.reduce((sum, item) => sum + item.expectedFees, 0);
                                            const totalInstSums = Array(12).fill(0);
                                            for (let col = 0; col < 12; col++) {
                                                totalInstSums[col] = studentInstallments.reduce((sum, item) => sum + item.installments[col], 0);
                                            }
                                            const totalPaidSum = studentInstallments.reduce((sum, item) => sum + item.totals, 0);
                                            const totalBalSum = studentInstallments.reduce((sum, item) => sum + item.balance, 0);
                                            const avgPctPaid = totalExpectedSum !== 0 ? Math.round((totalPaidSum / totalExpectedSum) * 100) : 0;

                                            const handleDownloadPDF = async () => {
                                                const { jsPDF } = await import('jspdf');
                                                await import('jspdf-autotable');

                                                const doc = new jsPDF({
                                                    orientation: 'landscape',
                                                    unit: 'mm',
                                                    format: 'a4'
                                                });

                                                // Title Headers
                                                doc.setFontSize(14);
                                                doc.setTextColor(37, 99, 235);
                                                doc.text('Fees Installments Summary', 14, 15);

                                                doc.setFontSize(9);
                                                doc.setTextColor(100, 116, 139);
                                                doc.text(`Class: ${installmentClass}  |  Class Enrollment: ${classEnrollment}`, 14, 21);

                                                const headers = [
                                                    ['Adm. No', 'Names', 'Expected Fees', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'Totals', 'Balance', '% Paid']
                                                ];

                                                const rows = studentInstallments.map(s => [
                                                    s.admissionNumber,
                                                    s.name,
                                                    s.expectedFees.toLocaleString(),
                                                    ...s.installments.map(val => val > 0 ? val.toLocaleString() : '—'),
                                                    s.totals.toLocaleString(),
                                                    s.balance.toLocaleString(),
                                                    `${s.pctPaid}%`
                                                ]);

                                                // Push bottom summary
                                                rows.push([
                                                    'TOTALS',
                                                    'CLASS SUMMARY',
                                                    totalExpectedSum.toLocaleString(),
                                                    ...totalInstSums.map(val => val > 0 ? val.toLocaleString() : '0'),
                                                    totalPaidSum.toLocaleString(),
                                                    totalBalSum.toLocaleString(),
                                                    `${avgPctPaid}%`
                                                ]);

                                                (doc as any).autoTable({
                                                    head: headers,
                                                    body: rows,
                                                    startY: 26,
                                                    theme: 'grid',
                                                    styles: { fontSize: 7, cellPadding: 1.2 },
                                                    headStyles: { fillColor: [37, 99, 235], textColor: 255, halign: 'center' },
                                                    columnStyles: {
                                                        0: { halign: 'left', fontStyle: 'bold' },
                                                        1: { halign: 'left', fontStyle: 'bold' },
                                                        2: { halign: 'right' },
                                                        3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
                                                        6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' },
                                                        9: { halign: 'right' }, 10: { halign: 'right' }, 11: { halign: 'right' },
                                                        12: { halign: 'right' }, 13: { halign: 'right' }, 14: { halign: 'right' },
                                                        15: { halign: 'right' }, 16: { halign: 'right' }, 17: { halign: 'right' },
                                                        18: { halign: 'center' }
                                                    },
                                                    didParseCell: (data: any) => {
                                                        if (data.row.index === rows.length - 1) {
                                                            data.cell.styles.fontStyle = 'bold';
                                                            data.cell.styles.fillColor = [241, 245, 249];
                                                        }
                                                    }
                                                });

                                                doc.save(`Fees_Installments_${installmentClass.replace(/\s+/g, '_')}.pdf`);
                                            };

                                            return (
                                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8 space-y-6">
                                                    <div className="flex flex-col items-center text-center space-y-2">
                                                        <h2 className="text-xl font-black text-blue-600 dark:text-blue-500 uppercase tracking-wide">Fees Installments</h2>
                                                        <div className="flex flex-col sm:flex-row items-center gap-6 text-sm font-bold text-slate-800 dark:text-slate-200">
                                                            <div className="flex items-center gap-2">
                                                                <span>Class:</span>
                                                                <select 
                                                                    value={installmentClass} 
                                                                    onChange={e => setInstallmentClass(e.target.value)} 
                                                                    className="py-1 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-900 dark:text-white"
                                                                >
                                                                    <option value="All">All Classes</option>
                                                                    {installmentClasses.map(cls => (
                                                                        <option key={cls} value={cls}>{cls}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span>Class Enrollment:</span>
                                                                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 py-0.5 px-2.5 rounded-full text-xs font-black">{classEnrollment}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => window.print()} className="print:hidden px-4 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">🖨️ Print</button>
                                                                <button onClick={handleDownloadPDF} className="print:hidden px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">📥 Download PDF</button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse border border-slate-100 dark:border-slate-800/40">
                                                            <thead>
                                                                <tr className="bg-slate-50 dark:bg-slate-950/50">
                                                                    <th rowSpan={2} className="py-2.5 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 whitespace-nowrap">Adm. No</th>
                                                                    <th rowSpan={2} className="py-2.5 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 whitespace-nowrap">Names</th>
                                                                    <th rowSpan={2} className="py-2.5 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 text-right whitespace-nowrap">Expected Fees</th>
                                                                    <th colSpan={12} className="py-1.5 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 text-center">All Installments Since the Beginning of the Year</th>
                                                                    <th rowSpan={2} className="py-2.5 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 text-right whitespace-nowrap">Totals</th>
                                                                    <th rowSpan={2} className="py-2.5 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 text-right whitespace-nowrap">Balance</th>
                                                                    <th rowSpan={2} className="py-2.5 px-3 font-black text-slate-400 uppercase tracking-widest text-[9px] border border-slate-100 dark:border-slate-800/60 text-center whitespace-nowrap">% Paid</th>
                                                                </tr>
                                                                <tr className="bg-slate-50 dark:bg-slate-950/50">
                                                                    {Array.from({ length: 12 }).map((_, colIdx) => (
                                                                        <th key={colIdx} className="py-1.5 px-1.5 font-black text-slate-400 text-[8px] uppercase border border-slate-100 dark:border-slate-800/60 text-center">{colIdx + 1}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {studentInstallments.map((s, i) => {
                                                                    const isExpanded = expandedInstallmentStudentIds.includes(s.id);
                                                                    return (
                                                                        <React.Fragment key={i}>
                                                                            <tr 
                                                                                onClick={() => setExpandedInstallmentStudentIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                                                                                className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors text-[11px]"
                                                                            >
                                                                                <td className="py-2 px-3 text-slate-500 border border-slate-50 dark:border-slate-800/40">{s.admissionNumber}</td>
                                                                                <td className="py-2 px-3 font-bold text-slate-800 dark:text-white border border-slate-50 dark:border-slate-800/40 whitespace-nowrap flex items-center gap-1.5">
                                                                                    <span className="print:hidden text-[9px] text-slate-400">{isExpanded ? '▼' : '▶'}</span>
                                                                                    {s.name}
                                                                                </td>
                                                                                <td className="py-2 px-3 text-slate-700 dark:text-slate-300 border border-slate-50 dark:border-slate-800/40 text-right font-medium">
                                                                                    {s.expectedFees !== 0 ? `KSh ${s.expectedFees.toLocaleString()}` : '0.00'}
                                                                                </td>
                                                                                {s.installments.map((val, colIdx) => (
                                                                                    <td key={colIdx} className="py-2 px-1.5 text-slate-700 dark:text-slate-300 border border-slate-50 dark:border-slate-800/40 text-right">
                                                                                        {val > 0 ? `KSh ${val.toLocaleString()}` : '—'}
                                                                                    </td>
                                                                                ))}
                                                                                <td className="py-2 px-3 font-bold text-slate-900 dark:text-white border border-slate-50 dark:border-slate-800/40 text-right">
                                                                                    {s.totals > 0 ? `KSh ${s.totals.toLocaleString()}` : '0.00'}
                                                                                </td>
                                                                                <td className={`py-2 px-3 font-bold border border-slate-50 dark:border-slate-800/40 text-right ${s.balance < 0 ? 'text-emerald-600' : s.balance > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                                                                                    {s.balance !== 0 ? `KSh ${s.balance.toLocaleString()}` : '0.00'}
                                                                                </td>
                                                                                <td className="py-2 px-3 font-black border border-slate-50 dark:border-slate-800/40 text-center text-slate-700 dark:text-slate-300">
                                                                                    {s.pctPaid}%
                                                                                </td>
                                                                            </tr>
                                                                            {isExpanded && (
                                                                                <tr className="print:hidden bg-slate-50/50 dark:bg-slate-950/20">
                                                                                    <td colSpan={18} className="p-4 border-b border-slate-100 dark:border-slate-800">
                                                                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 space-y-4 shadow-sm text-left">
                                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Itemized Payments History ({s.receipts.length} transactions)</p>
                                                                                            {s.receipts.length > 0 ? (
                                                                                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                                                                                                    {s.receipts.map((r: any, rIdx: number) => (
                                                                                                        <div key={rIdx} className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 border-b border-slate-50 dark:border-slate-800/40 pb-1">
                                                                                                            <span>Installment {rIdx + 1}: Receipt {r.receiptNumber || r.id?.slice(-8)} · Paid on {r.paymentDate?.split('T')[0] || '—'} via <span className="font-bold text-slate-500">{r.paymentMethod || 'Cash'}</span></span>
                                                                                                            <span className="font-bold text-emerald-600">KSh {r.amountPaid?.toLocaleString()}</span>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            ) : (
                                                                                                <p className="text-xs text-slate-400 font-medium">No installment receipts recorded for this student.</p>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </React.Fragment>
                                                                    );
                                                                })}

                                                                {studentInstallments.length > 0 && (
                                                                    <tr className="bg-slate-50 dark:bg-slate-950 font-black text-[11px] text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-800">
                                                                        <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider">TOTAL SUMMARY:</td>
                                                                        <td className="py-2.5 px-3 text-right">KSh {totalExpectedSum.toLocaleString()}</td>
                                                                        {totalInstSums.map((val, colIdx) => (
                                                                            <td key={colIdx} className="py-2.5 px-1.5 text-right">
                                                                                {val > 0 ? `KSh ${val.toLocaleString()}` : '0.00'}
                                                                            </td>
                                                                        ))}
                                                                        <td className="py-2.5 px-3 text-right">KSh {totalPaidSum.toLocaleString()}</td>
                                                                        <td className="py-2.5 px-3 text-right">KSh {totalBalSum.toLocaleString()}</td>
                                                                        <td className="py-2.5 px-3 text-center">{avgPctPaid}%</td>
                                                                    </tr>
                                                                )}

                                                                {studentInstallments.length === 0 && (
                                                                    <tr>
                                                                        <td colSpan={18} className="py-8 text-center text-slate-400 font-medium border border-slate-50 dark:border-slate-800/40">No records found.</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                    </div>
                                );
                            })()}

                            {/* Expense Summary */}
                            {reportsSubTab === 'expenses' && (
                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Expense Summary</h3>
                                    <p className="text-[10px] text-slate-400 font-medium mb-6">Total expenditure: KSh {totalExpenses.toLocaleString()}</p>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead><tr className="border-b border-slate-100 dark:border-slate-800">
                                                {['Description','Category','Date','Amount','Recorded By'].map(h=>(<th key={h} className="py-3 px-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">{h}</th>))}
                                            </tr></thead>
                                            <tbody>
                                                {[...(props.expenses||[])].sort((a,b)=>new Date(b.date||0).getTime()-new Date(a.date||0).getTime()).map((e,i)=>(
                                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">{e.description||'—'}</td>
                                                        <td className="py-3 px-4"><span className="text-[10px] font-black px-2 py-1 bg-amber-50 text-amber-700 rounded-full">{e.category||'General'}</span></td>
                                                        <td className="py-3 px-4 text-slate-500">{e.date?.split('T')[0]||'—'}</td>
                                                        <td className="py-3 px-4 font-black text-amber-700">KSh {(e.amount||0).toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-slate-500">{(e as any).recordedBy||(e as any).createdBy||'—'}</td>
                                                    </tr>
                                                ))}
                                                {(props.expenses||[]).length===0&&(<tr><td colSpan={5} className="py-8 text-center text-slate-400 font-medium">No expenses recorded</td></tr>)}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Payroll Summary */}
                            {reportsSubTab === 'payroll_summary' && (
                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Payroll Summary</h3>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{(props.payrollRecords||[]).length} payroll records</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const firstRec = (props.payrollRecords || [])[0];
                                                const currentMonthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
                                                setSchedulePeriod(firstRec?.period || firstRec?.payPeriod || currentMonthYear);
                                                setShowBankScheduleModal(true);
                                            }}
                                            className="px-5 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-650 transition-all shadow-md flex items-center gap-1.5"
                                        >
                                            🏦 Export Bank Advice PDF
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead><tr className="border-b border-slate-100 dark:border-slate-800">
                                                {['Employee','Period','Gross Pay','PAYE','NSSF','NHIF/SHIF','Net Pay'].map(h=>(<th key={h} className="py-3 px-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">{h}</th>))}
                                            </tr></thead>
                                            <tbody>
                                                {(props.payrollRecords||[]).map((p:any,i:number)=>(
                                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">{p.employeeName||p.staffName||'—'}</td>
                                                        <td className="py-3 px-4 text-slate-500">{p.period||p.payPeriod||'—'}</td>
                                                        <td className="py-3 px-4 font-black text-slate-700">KSh {(p.grossPay||p.gross||0).toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-rose-600">KSh {(p.paye||p.tax||0).toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-amber-700">KSh {(p.nssf||0).toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-amber-700">KSh {(p.nhif||p.shif||0).toLocaleString()}</td>
                                                        <td className="py-3 px-4 font-black text-emerald-600">KSh {(p.netPay||p.net||0).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                {(props.payrollRecords||[]).length===0&&(<tr><td colSpan={7} className="py-8 text-center text-slate-400 font-medium">No payroll records found</td></tr>)}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Annual Report */}
                            {reportsSubTab === 'annual' && (
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-8 text-white">
                                        <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Annual Financial Report</p>
                                        <h3 className="text-2xl font-black tracking-tight mb-1">{props.institution.name}</h3>
                                        <p className="text-slate-400 text-sm">Financial Year {new Date().getFullYear()}</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                                            {[
                                                {label:'Total Revenue', val: totalCollected, cls:'text-emerald-400'},
                                                {label:'Total Billed', val: totalBilled, cls:'text-indigo-300'},
                                                {label:'Outstanding', val: outstanding, cls:'text-rose-400'},
                                                {label:'Total Expenses', val: totalExpenses, cls:'text-amber-400'},
                                            ].map((m,i)=>(
                                                <div key={i} className="bg-white/10 rounded-2xl p-4">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
                                                    <p className={`text-lg font-black ${m.cls}`}>KSh {m.val.toLocaleString()}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6">
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Income Statement</h4>
                                            <div className="space-y-3">
                                                <div className="flex justify-between"><span className="text-xs font-bold text-slate-600">Total Fees Collected</span><span className="text-xs font-black text-emerald-600">+ KSh {totalCollected.toLocaleString()}</span></div>
                                                <div className="flex justify-between"><span className="text-xs font-bold text-slate-600">Total Expenses</span><span className="text-xs font-black text-rose-600">- KSh {totalExpenses.toLocaleString()}</span></div>
                                                <div className="flex justify-between border-t pt-3"><span className="text-xs font-black text-slate-900 dark:text-white">Net Surplus / (Deficit)</span><span className={`text-xs font-black ${totalCollected-totalExpenses>=0?'text-emerald-600':'text-rose-600'}`}>KSh {(totalCollected-totalExpenses).toLocaleString()}</span></div>
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6">
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Key Metrics</h4>
                                            <div className="space-y-3">
                                                <div className="flex justify-between"><span className="text-xs font-bold text-slate-600">Collection Rate</span><span className={`text-xs font-black ${collectionRate>=80?'text-emerald-600':'text-rose-600'}`}>{collectionRate.toFixed(1)}%</span></div>
                                                <div className="flex justify-between"><span className="text-xs font-bold text-slate-600">Total Students</span><span className="text-xs font-black text-indigo-600">{props.students.length}</span></div>
                                                <div className="flex justify-between"><span className="text-xs font-bold text-slate-600">Avg Fee / Student</span><span className="text-xs font-black text-slate-700">KSh {props.students.length>0?Math.round(totalCollected/props.students.length).toLocaleString():0}</span></div>
                                                <div className="flex justify-between"><span className="text-xs font-bold text-slate-600">Total Invoices</span><span className="text-xs font-black text-slate-700">{mappedInvoices.length}</span></div>
                                                <div className="flex justify-between"><span className="text-xs font-bold text-slate-600">Total Receipts</span><span className="text-xs font-black text-slate-700">{mappedReceipts.length}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Student Statement */}
                            {reportsSubTab === 'student_statement' && (() => {
                                const filteredStudents = studentFinanceData.filter((s: any) =>
                                    s.name?.toLowerCase().includes(stmtSearch.toLowerCase()) ||
                                    (s.admissionNumber || '').toLowerCase().includes(stmtSearch.toLowerCase())
                                ).slice(0, 30);

                                const selectedStudent = props.students.find((s: any) => s.id === stmtStudentId);
                                const studentInvoices = mappedInvoices.filter((i: any) => i.studentId === stmtStudentId);
                                const studentReceipts = mappedReceipts.filter((r: any) =>
                                    r.studentId === stmtStudentId ||
                                    studentInvoices.some((i: any) => i.id === r.invoiceId)
                                );

                                const openingBalForStmt = (() => {
                                    const sd = studentFinanceData.find(s => s.id === stmtStudentId);
                                    return sd?.totals?.openingBalance ?? 0;
                                })();
                                const totalInvoiced = openingBalForStmt + studentInvoices.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);
                                const totalPaid = studentReceipts.reduce((s: number, r: any) => s + (r.amountPaid || 0), 0);
                                const balance = totalInvoiced - totalPaid;

                                const allEntries: Array<{ date: string; eType: 'invoice' | 'payment' | 'opening'; data: any }> = [
                                    ...(openingBalForStmt > 0 ? [{ date: '0001-01-01', eType: 'opening' as const, data: { amount: openingBalForStmt } }] : []),
                                    ...studentInvoices.map((i: any) => ({ date: i.issueDate || i.createdAt || '', eType: 'invoice' as const, data: i })),
                                    ...studentReceipts.map((r: any) => ({ date: r.createdAt || r.date || '', eType: 'payment' as const, data: r })),
                                ].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

                                let running = 0;
                                const ledger = allEntries.map(entry => {
                                    if (entry.eType === 'opening') {
                                        running += entry.data.amount || 0;
                                        return { date: '—', description: 'Opening Balance (Brought Forward)', debit: entry.data.amount || 0, credit: 0, balance: running, eType: 'invoice' as const };
                                    } else if (entry.eType === 'invoice') {
                                        running += entry.data.totalAmount || 0;
                                        return { date: (entry.date || '').split('T')[0] || '—', description: `Invoice ${entry.data.invoiceNumber || entry.data.id?.slice(-8)} — School Fees`, debit: entry.data.totalAmount || 0, credit: 0, balance: running, eType: 'invoice' as const };
                                    } else {
                                        running -= entry.data.amountPaid || 0;
                                        return { date: (entry.date || '').split('T')[0] || '—', description: `Payment Rcpt ${entry.data.receiptNumber || entry.data.id?.slice(-8)} · ${entry.data.paymentMethod || entry.data.method || 'Cash'}`, debit: 0, credit: entry.data.amountPaid || 0, balance: running, eType: 'payment' as const };
                                    }
                                });

                                return (
                                    <div className="space-y-6">
                                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-8">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Student Account Statement</h3>
                                            <p className="text-[10px] text-slate-400 font-medium mb-6">Search and select a student to generate their full financial statement</p>
                                            <div className="flex flex-col md:flex-row gap-4">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-4 top-3 text-slate-400">🔍</span>
                                                    <input type="text" placeholder="Filter by name or admission number..." value={stmtSearch} onChange={e => setStmtSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white" />
                                                </div>
                                                <select value={stmtStudentId} onChange={e => setStmtStudentId(e.target.value)} className="flex-1 py-3 px-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white">
                                                    <option value="">— Select Student —</option>
                                                    {filteredStudents.map((s: any) => (<option key={s.id} value={s.id}>{s.name}{s.admissionNumber ? ` (${s.admissionNumber})` : ''}{s.gradeLevel ? ` · ${s.gradeLevel}` : ''}</option>))}
                                                </select>
                                            </div>
                                        </div>

                                        {selectedStudent && (
                                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm overflow-hidden">
                                                <div className="bg-gradient-to-r from-indigo-700 to-purple-700 p-8 text-white">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.4em] mb-1">Official Account Statement</p>
                                                            <h3 className="text-2xl font-black">{props.institution.name}</h3>
                                                            <p className="text-indigo-200 text-xs mt-1">Generated: {new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                                        </div>
                                                        <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest transition-all">🖨️ Print</button>
                                                    </div>
                                                    <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div><p className="text-indigo-200 text-[10px] uppercase tracking-widest font-black">Student</p><p className="font-black text-sm mt-0.5">{selectedStudent.name}</p></div>
                                                        <div><p className="text-indigo-200 text-[10px] uppercase tracking-widest font-black">Adm No.</p><p className="font-black text-sm mt-0.5">{(selectedStudent as any).admissionNumber || '—'}</p></div>
                                                        <div><p className="text-indigo-200 text-[10px] uppercase tracking-widest font-black">Class</p><p className="font-black text-sm mt-0.5">{(selectedStudent as any).gradeLevel || '—'}</p></div>
                                                        <div><p className="text-indigo-200 text-[10px] uppercase tracking-widest font-black">Balance</p><p className={`font-black text-sm mt-0.5 ${balance > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{balance > 0 ? `KSh ${balance.toLocaleString()} OWING` : balance < 0 ? `KSh ${Math.abs(balance).toLocaleString()} CREDIT` : '✓ FULLY PAID'}</p></div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 border-b border-slate-100 dark:border-slate-800">
                                                    {[{label:'Total Charged', val: totalInvoiced, color:'text-slate-700 dark:text-slate-200'},{label:'Total Paid', val: totalPaid, color:'text-emerald-600'},{label:'Balance Due', val: balance, color: balance > 0 ? 'text-rose-600' : 'text-emerald-600'}].map((s,i)=>(
                                                        <div key={i} className={`p-6 ${i<2?'border-r border-slate-100 dark:border-slate-800':''}`}>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                                            <p className={`text-xl font-black ${s.color}`}>KSh {Math.abs(s.val).toLocaleString()}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="p-8">
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Transaction Ledger</h4>
                                                    {ledger.length === 0 ? (
                                                        <p className="text-xs text-slate-400 text-center py-8 font-medium">No transactions found for this student.</p>
                                                    ) : (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left text-xs">
                                                                <thead>
                                                                    <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                                                                        {['Date','Description','Charges (Dr)','Payments (Cr)','Running Balance'].map(h=>(<th key={h} className="py-3 px-3 font-black text-slate-500 uppercase tracking-widest text-[10px]">{h}</th>))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {ledger.map((entry, i) => (
                                                                        <tr key={i} className={`border-b border-slate-50 dark:border-slate-800/50 ${entry.eType === 'payment' ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : ''}`}>
                                                                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{entry.date}</td>
                                                                            <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">{entry.description}</td>
                                                                            <td className="py-3 px-3 font-black text-slate-700 dark:text-slate-300">{entry.debit > 0 ? `KSh ${entry.debit.toLocaleString()}` : '—'}</td>
                                                                            <td className="py-3 px-3 font-black text-emerald-600">{entry.credit > 0 ? `KSh ${entry.credit.toLocaleString()}` : '—'}</td>
                                                                            <td className={`py-3 px-3 font-black whitespace-nowrap ${entry.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>KSh {Math.abs(entry.balance).toLocaleString()} <span className="text-[10px] opacity-70">{entry.balance > 0 ? 'Dr' : 'Cr'}</span></td>
                                                                        </tr>
                                                                    ))}
                                                                    <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 font-black">
                                                                        <td className="py-3 px-3" /><td className="py-3 px-3 text-[10px] uppercase tracking-widest text-slate-700 dark:text-white">TOTALS</td>
                                                                        <td className="py-3 px-3 text-slate-900 dark:text-white">KSh {totalInvoiced.toLocaleString()}</td>
                                                                        <td className="py-3 px-3 text-emerald-600">KSh {totalPaid.toLocaleString()}</td>
                                                                        <td className={`py-3 px-3 ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>KSh {Math.abs(balance).toLocaleString()} <span className="text-[10px] opacity-70">{balance > 0 ? 'Dr' : 'Cr'}</span></td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                    <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                                                        <p className="text-[10px] text-slate-400 font-medium">This is a computer-generated statement and does not require a signature.</p>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{props.institution.name} · {new Date().toISOString().split('T')[0]}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                        </div>
                    );
                })()}

                </div>
            </div>
        </div>
    );
};

