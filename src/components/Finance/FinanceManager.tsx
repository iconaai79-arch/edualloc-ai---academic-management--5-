import React, { useState, useEffect, useMemo } from 'react';
import type { Invoice, Receipt, Expense, FinancialGoal, User, Institution, FeeStructure, AcademicYear, Semester, Requisition, VoteHead, Course, CompanyDetails, NGCdfBursary } from '../../types';
import { RevenueWarRoom } from './RevenueWarRoom';
import { AutomatedBilling } from './AutomatedBilling';
import { BanknotesIcon } from '../icons/BanknotesIcon';
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
import { isEduInstitution } from '../../utils/roleUtils';
import { StudentEnrollmentManager } from '../common/StudentEnrollmentManager';
import * as XLSX from 'xlsx';
import { ArrowUpTrayIcon } from '../icons/ArrowUpTrayIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import * as pdfService from '../../services/pdfService';

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
}

export const FinanceManager: React.FC<FinanceManagerProps> = (props) => {
    const isDrivingSchool = props.institution.institutionType === 'Driving School';
    
    // Dynamic Tabs based on Institution Type
    const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'balances' | 'receipts' | 'bursaries' | 'expenses' | 'audit' | 'requisitions' | 'config' | 'settings'>('billing');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // State for settings sub-tabs
    const [settingsSubTab, setSettingsSubTab] = useState<'opening_balance' | 'academic_calendar' | 'financial_year' | 'accounts_grants' | 'user_permissions' | 'branding'>('opening_balance');
    const [openingBalanceSearch, setOpeningBalanceSearch] = useState('');
    const [openingBalanceClassFilter, setOpeningBalanceClassFilter] = useState('All');
    const [openingBalancesMap, setOpeningBalancesMap] = useState<Record<string, number>>(() => {
        const initialMap: Record<string, number> = {};
        props.students.forEach(s => {
            initialMap[s.id] = s.metadata?.openingBalance || 0;
        });
        return initialMap;
    });

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

    // Financial Year states
    const [financialYears, setFinancialYears] = useState([
        { id: 'fy25', name: 'FY 2025', startMonth: 'January', endMonth: 'December', status: 'Closed' },
        { id: 'fy26', name: 'FY 2026', startMonth: 'January', endMonth: 'December', status: 'Active' },
    ]);
    const [newFyName, setNewFyName] = useState('');
    const [newFyStart, setNewFyStart] = useState('January');

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
                // Update them in the database
                for (const student of studentsToUpdate) {
                    const updatedMetadata = {
                        ...(student.metadata || {}),
                        openingBalance: openingBalancesMap[student.id] || 0
                    };
                    
                    await apiService.saveModuleRecord('users', {
                        id: student.id,
                        metadata: updatedMetadata
                    });
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
                const detectedId = headers.find(h => /adm|number|reg|identifier|student|name/i.test(h)) || '';
                const detectedBal = headers.find(h => /bal|amount|open/i.test(h)) || '';
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

        importerRawData.forEach(row => {
            const rawId = String(row[importerMappings.identifier] || '').trim();
            const rawBal = Number(row[importerMappings.balance]);

            if (!rawId || isNaN(rawBal)) {
                skipCount++;
                return;
            }

            // Find matching student
            let matchedStudent: User | undefined;
            if (importerMatchField === 'admissionNumber') {
                matchedStudent = props.students.find(s => {
                    const adm = s.admissionNumber || s.admission_number || '';
                    return adm.trim().toLowerCase() === rawId.toLowerCase();
                });
            } else {
                matchedStudent = props.students.find(s => {
                    return s.name.trim().toLowerCase() === rawId.toLowerCase();
                });
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
        const metaGrade = student.metadata?.gradeLevel || student.metadata?.stream;
        if (metaGrade) return metaGrade;
        
        const invClass = props.invoices.find(i => i.studentId === student.id && i.className)?.className;
        if (invClass) return invClass;
        
        const courseName = props.courses?.find(c => c.id === student.courseId)?.name;
        if (courseName) return courseName;
        
        return 'Unassigned Class';
    }

    const filteredOpeningBalanceStudents = useMemo(() => {
        return props.students.filter(student => {
            const matchesSearch = student.name?.toLowerCase().includes(openingBalanceSearch.toLowerCase()) ||
                student.admissionNumber?.toLowerCase().includes(openingBalanceSearch.toLowerCase()) ||
                student.admission_number?.toLowerCase().includes(openingBalanceSearch.toLowerCase());
            
            const cls = studentClassGroup(student);
            const matchesClass = openingBalanceClassFilter === 'All' || cls === openingBalanceClassFilter;
            
            return matchesSearch && matchesClass;
        });
    }, [props.students, openingBalanceSearch, openingBalanceClassFilter]);

    // State for students balances registry sub-tab
    const [studentSubTab, setStudentSubTab] = useState<'registry' | 'balances' | 'wizard'>('registry');
    const [searchBalances, setSearchBalances] = useState('');

    const studentFinanceData = useMemo(() => {
        return props.students.map(s => {
            const studentInvoices = props.invoices.filter(inv => inv.studentId === s.id && inv.status !== 'cancelled' && inv.status !== 'quote');
            const invoiced = studentInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
            
            const studentReceipts = props.receipts.filter(rec => studentInvoices.some(inv => inv.id === rec.paidFor));
            const paid = studentReceipts.reduce((sum, rec) => sum + rec.amountPaid, 0);
            
            const balance = Math.max(0, invoiced - paid);
            
            return {
                ...s,
                totals: {
                    invoiced,
                    paid,
                    balance
                }
            };
        });
    }, [props.students, props.invoices, props.receipts]);

    const filteredFinanceStudents = useMemo(() => {
        return studentFinanceData.filter(s => {
            if (!searchBalances) return true;
            const searchLower = searchBalances.toLowerCase();
            return (
                s.name?.toLowerCase().includes(searchLower) ||
                s.admissionNumber?.toLowerCase().includes(searchLower) ||
                s.admission_number?.toLowerCase().includes(searchLower)
            );
        });
    }, [studentFinanceData, searchBalances]);

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
        { id: 'billing', label: isDrivingSchool ? 'DS Invoices' : 'Students', icon: ZapIcon },
        { id: 'overview', label: 'Revenue War Room', icon: BarChart3Icon },
        { id: 'balances', label: 'Fee Balances', icon: WalletIcon },
        { id: 'receipts', label: 'Receipts', icon: DocumentTextIcon },
        { id: 'bursaries', label: 'Govt & NG-CDF Bursaries', icon: ScaleIcon },
        ...(!isDrivingSchool ? [{ id: 'config', label: 'Fee Configuration', icon: CreditCardIcon }] : []),
        { id: 'expenses', label: 'Expense Governance', icon: BanknotesIcon },
        { id: 'requisitions', label: 'Requisitions & LPOs', icon: ClipboardListIcon },
        { id: 'audit', label: 'Fiscal Audit', icon: CheckBadgeIcon },
        { id: 'settings', label: 'Settings', icon: Cog8ToothIcon },
    ] as const;

    // NG-CDF Bursary States
    const [bursaryStudentSearch, setBursaryStudentSearch] = useState('');
    const [bursaryStudentId, setBursaryStudentId] = useState('');
    const [bursaryConstituency, setBursaryConstituency] = useState('');
    const [bursaryAmount, setBursaryAmount] = useState('');
    const [bursaryChequeNumber, setBursaryChequeNumber] = useState('');
    const [bursaryNotes, setBursaryNotes] = useState('');
    const [bursaryFY, setBursaryFY] = useState('2025/2026');
    const [bursaryRecords, setBursaryRecords] = useState<NGCdfBursary[]>([]);
    const [isSavingBursary, setIsSavingBursary] = useState(false);
    const [bursarySubTab, setBursarySubTab] = useState<'post_cheque' | 'initiate_app'>('post_cheque');

    const [retailStores, setRetailStores] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);

    // Driving School Mode States
    const [dsInvoices, setDsInvoices] = useState<any[]>([]);
    const [dsPayments, setDsPayments] = useState<any[]>([]);
    const [dsSettings, setDsSettings] = useState<any>(null);
    const [dsFeeStructures, setDsFeeStructures] = useState<any[]>([]);
    const [isCreatingDsInvoice, setIsCreatingDsInvoice] = useState(false);
    const [selectedDsInvoice, setSelectedDsInvoice] = useState<any | null>(null);
    const [isRecordingDsPayment, setIsRecordingDsPayment] = useState(false);

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
    const [unreconciledFeeds, setUnreconciledFeeds] = useState<any[]>([]);
    const [loadingFeeds, setLoadingFeeds] = useState(false);
    const [selectedFeedTx, setSelectedFeedTx] = useState<any | null>(null);
    const [showPostModal, setShowPostModal] = useState(false);
    const [showReconcileModal, setShowReconcileModal] = useState(false);

    // Post payment form states
    const [manualPayStudentId, setManualPayStudentId] = useState('');
    const [manualPayInvoiceId, setManualPayInvoiceId] = useState('');
    const [manualPayAmount, setManualPayAmount] = useState<number>(0);
    const [manualPayDate, setManualPayDate] = useState('');
    const [manualPayMethod, setManualPayMethod] = useState('Cash');
    const [manualPayReference, setManualPayReference] = useState('');
    const [isSavingManualPay, setIsSavingManualPay] = useState(false);

    // Reconcile form states
    const [reconcileStudentId, setReconcileStudentId] = useState('');
    const [reconcileInvoiceId, setReconcileInvoiceId] = useState('');
    const [isReconciling, setIsReconciling] = useState(false);

    const studentPendingInvoices = useMemo(() => {
        const selectedId = showPostModal ? manualPayStudentId : reconcileStudentId;
        if (!selectedId) return [];
        return props.invoices.filter(inv => inv.studentId === selectedId && inv.status !== 'paid');
    }, [props.invoices, manualPayStudentId, reconcileStudentId, showPostModal]);

    const filteredReceipts = useMemo(() => {
        const query = searchReceiptQuery.toLowerCase();
        return (props.receipts || []).filter(rec => {
            const student = props.students.find(s => s.id === rec.studentId);
            const matchesQuery = 
                (rec.receiptNumber || '').toLowerCase().includes(query) ||
                (student?.name || '').toLowerCase().includes(query) ||
                (rec.relatedTransactionId || '').toLowerCase().includes(query);
            
            const matchesSource = 
                receiptSourceFilter === 'All' ||
                rec.paymentMethod === receiptSourceFilter;

            return matchesQuery && matchesSource;
        });
    }, [props.receipts, searchReceiptQuery, receiptSourceFilter, props.students]);

    const [receiptCurrentPage, setReceiptCurrentPage] = useState(1);

    const paginatedReceipts = useMemo(() => {
        const startIndex = (receiptCurrentPage - 1) * 10;
        return filteredReceipts.slice(startIndex, startIndex + 10);
    }, [filteredReceipts, receiptCurrentPage]);

    const totalReceiptPages = Math.ceil(filteredReceipts.length / 10) || 1;

    useEffect(() => {
        setReceiptCurrentPage(1);
    }, [searchReceiptQuery, receiptSourceFilter]);

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
        if (activeTab === 'receipts') {
            fetchBankFeeds();
        }
    }, [activeTab]);

    const handlePostManualPayment = async () => {
        if (!manualPayStudentId || !manualPayInvoiceId || manualPayAmount <= 0) {
            alert("Please select a student, target invoice, and enter a valid payment amount.");
            return;
        }
        setIsSavingManualPay(true);
        try {
            const invoice = props.invoices.find(inv => inv.id === manualPayInvoiceId);
            if (!invoice) throw new Error("Target invoice not found");

            const amountPaidNum = Number(manualPayAmount);
            const receiptId = `RCT_${Date.now()}`;
            const receiptNumber = `RCT-${Date.now().toString().slice(-6)}`;

            await apiService.saveModuleRecord('receipts', {
                id: receiptId,
                receiptNumber: receiptNumber,
                institutionId: props.institution.id,
                paymentDate: manualPayDate || new Date().toISOString().split('T')[0],
                amountPaid: amountPaidNum,
                paidFor: invoice.invoiceNumber || 'School Fees',
                paymentMethod: manualPayMethod,
                relatedTransactionId: manualPayReference || '',
                invoiceId: manualPayInvoiceId,
                studentId: manualPayStudentId
            });

            const currentReceipts = await apiService.fetchModuleRecords<Receipt>('receipts', undefined, undefined, {
                filter: { invoice_id: manualPayInvoiceId }
            }).catch(() => []);

            const totalPaid = currentReceipts.reduce((sum, r) => sum + (r.amountPaid || 0), 0) + amountPaidNum;
            const newStatus = totalPaid >= invoice.totalAmount ? 'paid' : 'partial';

            await apiService.saveModuleRecord('invoices', {
                id: manualPayInvoiceId,
                status: newStatus
            });

            if (props.onRefreshData) {
                await props.onRefreshData();
            }

            alert(`Receipt ${receiptNumber} generated and invoice updated successfully!`);

            setManualPayStudentId('');
            setManualPayInvoiceId('');
            setManualPayAmount(0);
            setManualPayReference('');
            setShowPostModal(false);
        } catch (e: any) {
            alert("Failed to post receipt: " + (e.message || e));
        } finally {
            setIsSavingManualPay(false);
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
    const [builderTerm, setBuilderTerm] = useState('');
    const [builderAmounts, setBuilderAmounts] = useState<Record<string, number>>({});

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
    }, [props.institution.id]);

    useEffect(() => {
        if (activeTab === 'settings' && settingsSubTab === 'accounts_grants') {
            fetchBankAccounts();
            fetchSchoolGrants();
        }
    }, [activeTab, settingsSubTab, props.institution.id]);

    // Pre-populate builder amounts from existing structures
    useEffect(() => {
        if (builderCourseId && builderAYId && builderTerm) {
            const matchingFS = props.feeStructures.filter(f =>
                f.courseId === builderCourseId &&
                f.academicYearId === builderAYId &&
                f.term === builderTerm
            );
            const initialAmounts: Record<string, number> = {};
            (props.voteHeads || []).forEach(v => {
                const fs = matchingFS.find(item => item.voteHeadId === v.id);
                initialAmounts[v.id] = fs ? fs.amount : 0;
            });
            setBuilderAmounts(initialAmounts);
        } else {
            setBuilderAmounts({});
        }
    }, [builderCourseId, builderAYId, builderTerm, props.feeStructures, props.voteHeads]);

    // Translate DS structures to standard Dashboard Invoice models dynamically
    const mappedInvoices = useMemo(() => {
        if (!isDrivingSchool) return props.invoices;
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
    }, [props.invoices, dsInvoices, isDrivingSchool]);

    // Translate DS payments to standard Dashboard Receipt models dynamically
    const mappedReceipts = useMemo(() => {
        if (!isDrivingSchool) return props.receipts;
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
    }, [props.receipts, dsPayments, isDrivingSchool]);

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
        if (!builderCourseId || !builderAYId || !builderTerm) {
            alert("Please select Course, Academic Year, and Semester.");
            return;
        }
        try {
            const activeVotes = Object.entries(builderAmounts).filter(([_, amt]) => amt > 0);
            const existingList = props.feeStructures.filter(f =>
                f.courseId === builderCourseId &&
                f.academicYearId === builderAYId &&
                f.term === builderTerm
            );

            await Promise.all(activeVotes.map(async ([voteHeadId, amount]) => {
                const matchedVoteHead = (props.voteHeads || []).find(v => v.id === voteHeadId);
                const matchedName = matchedVoteHead ? matchedVoteHead.name : 'Fee Item';
                const matchedPriority = matchedVoteHead ? matchedVoteHead.priority : 10;
                
                const existing = existingList.find(e => e.voteHeadId === voteHeadId);
                const payload: FeeStructure = {
                    id: existing ? existing.id : `fs_${Date.now()}_${Math.random().toString(36).substring(2,6)}`,
                    name: `${matchedName}`,
                    amount: amount,
                    academicYearId: builderAYId,
                    term: builderTerm,
                    courseId: builderCourseId,
                    voteHeadId: voteHeadId,
                    priority: matchedPriority,
                    institutionId: props.institution.id
                };
                await apiService.saveModuleRecord('fee_structures', payload);
            }));

            // Delete any existing structures that were set to 0 or left out
            const keptVoteIds = new Set(activeVotes.map(([id]) => id));
            const deletedStructures = existingList.filter(e => e.voteHeadId && !keptVoteIds.has(e.voteHeadId));
            await Promise.all(deletedStructures.map(d => apiService.deleteModuleRecord('fee_structures', d.id)));

            if (props.onRefreshData) {
                await props.onRefreshData();
            }
            alert("Fee structure cohort configuration saved successfully!");
        } catch (err) {
            console.error("Failed to save fee structures:", err);
            alert("Failed to save fee structures.");
        }
    };

    // Create DS Invoice Handler
    const handleCreateDsInvoice = async () => {
        if (!dsFormStudentId || !dsFormClass || dsFormItems.length === 0) {
            alert("Please select student, course/class, and add items.");
            return;
        }
        try {
            const student = props.students.find(s => s.id === dsFormStudentId);
            const studentName = student ? student.name : 'Unknown Student';
            const invoiceNumber = `DS-INV-${Date.now().toString().slice(-6)}`;
            
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
            const instId = props.institution.id;
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
            const recNumber = `RCPT-${Date.now().toString().slice(-6)}`;
            
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
        return props.students.filter(s => 
            s.name?.toLowerCase().includes(bursaryStudentSearch.toLowerCase()) ||
            s.admissionNumber?.toLowerCase().includes(bursaryStudentSearch.toLowerCase()) ||
            s.admission_number?.toLowerCase().includes(bursaryStudentSearch.toLowerCase())
        );
    }, [bursaryStudentSearch, bursaryStudentId, props.students]);

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

            // 1. Save standard receipt to student ledger
            const receipt = {
                id: `rcpt_bursary_${Date.now()}`,
                receiptNumber: `B-RCPT-${Date.now().toString().slice(-6)}`,
                institutionId: instId,
                studentId: bursaryStudentId,
                amountPaid: amount,
                paymentMethod: 'Cheque',
                relatedTransactionId: bursaryChequeNumber,
                paymentDate: new Date().toISOString().split('T')[0],
                paidFor: `NG-CDF Bursary allocation (${bursaryConstituency})`,
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

                <nav className="space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 no-scrollbar">
                    {tabs.filter(item => isDrivingSchool ? true : (item.id !== 'billing' && item.id !== 'bursaries' && item.id !== 'config')).map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 relative group ${
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
                    <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm shrink-0 gap-4 overflow-hidden">
                        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar max-w-[70vw] md:max-w-full">
                            {activeTab === 'settings' ? (
                                ([
                                    { id: 'opening_balance', label: 'Opening Balance', icon: WalletIcon },
                                    { id: 'academic_calendar', label: 'Academic Year & Calendar', icon: CalendarDaysIcon },
                                    { id: 'financial_year', label: 'Financial Year', icon: ClockIcon },
                                    { id: 'accounts_grants', label: 'Voteheads, Banks & Grants', icon: ScaleIcon },
                                    { id: 'user_permissions', label: 'User Permissions', icon: ShieldCheckIcon },
                                    { id: 'branding', label: 'Branding', icon: PhotoIcon }
                                ] as const).map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setSettingsSubTab(sub.id as any)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 whitespace-nowrap ${
                                            settingsSubTab === sub.id 
                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none scale-105' 
                                            : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-655'
                                        }`}
                                    >
                                        <sub.icon className={`w-4 h-4 ${settingsSubTab === sub.id ? 'text-white' : 'text-slate-400'}`} />
                                        <span className="text-[11px] font-black uppercase tracking-widest">{sub.label}</span>
                                    </button>
                                ))
                            ) : (
                                tabs.filter(item => item.id === 'billing' || item.id === 'bursaries' || item.id === 'config').map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 whitespace-nowrap ${
                                            activeTab === tab.id 
                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none scale-105' 
                                            : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-655'
                                        }`}
                                    >
                                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} />
                                        <span className="text-[11px] font-black uppercase tracking-widest">{tab.label}</span>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="hidden md:flex items-center gap-4 px-6 border-l border-slate-100 dark:border-slate-800">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {activeTab === 'settings' ? 'Configuration' : 'Fiscal Status'}
                                </p>
                                <p className="text-sm font-black text-slate-900 dark:text-white">
                                    {activeTab === 'settings' ? 'Settings Mode' : 'Education Mode'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dynamic View Engine */}
                <div className="min-h-[600px] w-full">
                {activeTab === 'overview' && (
                    <RevenueWarRoom 
                        invoices={mappedInvoices}
                        receipts={mappedReceipts}
                        expenses={props.expenses}
                        goals={props.goals}
                        students={props.students}
                        institution={props.institution}
                        receiptLimit={props.receiptLimit}
                        setReceiptLimit={props.setReceiptLimit}
                        transactionLimit={props.transactionLimit}
                        setTransactionLimit={props.setTransactionLimit}
                        transactions={props.transactions || []}
                    />
                )}

                {activeTab === 'balances' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* Search and Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm">
                            <div className="md:col-span-2 relative">
                                <SearchIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search student by name or admission number..."
                                    value={searchBalances}
                                    onChange={(e) => setSearchBalances(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl text-left">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Outstanding</p>
                                <p className="text-lg font-black text-rose-600 dark:text-rose-450">KSh {totalOutstandingAll.toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl text-left">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Collection Rate</p>
                                <p className="text-lg font-black text-emerald-600 dark:text-emerald-450">{collectionRateAll.toFixed(1)}%</p>
                            </div>
                        </div>

                        {/* Vertically Grouped Students per Class */}
                        <div className="space-y-8 text-left">
                            {Object.keys(groupedStudents).length === 0 ? (
                                <div className="p-8 text-center text-slate-405 font-medium bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-[2rem]">
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
                                                    <p className="text-slate-505 dark:text-slate-400 text-xs font-semibold">{classData.length} Students enrolled</p>
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
                                                            <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Invoiced</th>
                                                            <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Paid</th>
                                                            <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance</th>
                                                            <th className="px-8 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
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
                                                                <td className="px-8 py-4 text-center">
                                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                                        student.totals.balance <= 0
                                                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                                                        : student.totals.paid > 0
                                                                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                                                                        : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                                                                    }`}>
                                                                        {student.totals.balance <= 0 ? 'Fully Paid' : student.totals.paid > 0 ? 'Partial' : 'No Payment'}
                                                                    </span>
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
                )}

                {activeTab === 'receipts' && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 text-left animate-in fade-in duration-300">
                        {/* Left & Middle columns: Receipts list */}
                        <div className="lg:col-span-3 space-y-6">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Receipt Ledger</h3>
                                        <p className="text-xs text-slate-500 font-semibold mt-0.5">Manage fees received from Cash, Bank Feed, or Bursary allocations.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowPostModal(true)}
                                        className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md flex items-center gap-2 transition-all active:scale-95 hover:shadow-lg"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Post Receipt
                                    </button>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="relative flex-1">
                                        <SearchIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by student name or receipt number..."
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
                                        <option value="Bursary">Bursary</option>
                                    </select>
                                </div>                                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-3xl">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/60">
                                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Adm Number</th>
                                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Grade</th>
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
                                                const student = props.students.find(s => s.id === rec.studentId);
                                                const admNum = student?.admissionNumber || student?.admission_number || '—';
                                                const studentName = student?.name || 'Unknown Student';
                                                const gradeName = student ? studentClassGroup(student) : '—';
                                                return (
                                                    <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                                        <td className="px-6 py-4 text-xs font-semibold text-slate-550 dark:text-slate-400">
                                                            {admNum}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-xs font-bold text-slate-900 dark:text-white">{studentName}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                                                            {gradeName}
                                                        </td>
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
                            <button
                                onClick={() => setStudentSubTab('wizard')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    studentSubTab === 'wizard'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md'
                                    : 'text-slate-500 hover:text-indigo-650'
                                }`}
                            >
                                Billing Wizard
                            </button>
                        </div>

                        {studentSubTab === 'registry' && (
                            <div className="animate-in fade-in duration-300">
                                <StudentEnrollmentManager
                                    context="academic"
                                    currentInstitution={props.institution}
                                    activeTab="students"
                                    companyDetails={props.companyDetails}
                                    currentUser={props.currentUser}
                                    onLogAction={props.onLogAction ? async (msg) => { await props.onLogAction!(msg); } : undefined}
                                />
                            </div>
                        )}

                        {studentSubTab === 'balances' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                {/* Search and Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm">
                                    <div className="md:col-span-2 relative">
                                        <SearchIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search student by name or admission number..."
                                            value={searchBalances}
                                            onChange={(e) => setSearchBalances(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl text-left">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Outstanding</p>
                                        <p className="text-lg font-black text-rose-600 dark:text-rose-450">KSh {totalOutstandingAll.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl text-left">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Collection Rate</p>
                                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-450">{collectionRateAll.toFixed(1)}%</p>
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
                                                                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Invoiced</th>
                                                                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Paid</th>
                                                                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance</th>
                                                                    <th className="px-8 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
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
                                                                        <td className="px-6 py-4 text-right">
                                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">KSh {student.totals.invoiced.toLocaleString()}</span>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right">
                                                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450">KSh {student.totals.paid.toLocaleString()}</span>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right">
                                                                            <span className={`text-xs font-black ${student.totals.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-850 dark:text-slate-300'}`}>
                                                                                KSh {student.totals.balance.toLocaleString()}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-8 py-4 text-center">
                                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                                                student.totals.balance <= 0
                                                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                                                                : student.totals.paid > 0
                                                                                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                                                                                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                                                                            }`}>
                                                                                {student.totals.balance <= 0 ? 'Fully Paid' : student.totals.paid > 0 ? 'Partial' : 'No Payment'}
                                                                            </span>
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
                        )}

                        {studentSubTab === 'wizard' && (
                            <AutomatedBilling 
                                feeStructures={props.feeStructures}
                                students={props.students}
                                academicYears={props.academicYears}
                                semesters={props.semesters}
                                institution={props.institution}
                                onGenerateInvoices={props.onGenerateInvoices}
                                companyDetails={props.companyDetails}
                            />
                        )}
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

                {/* New Fee Configuration Tab for Education Institutions */}
                {activeTab === 'config' && !isDrivingSchool && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Configuration sub-tabs bar */}
                        <div className="flex border-b border-slate-200 pb-2">
                            <button
                                onClick={() => setConfigSubTab('voteheads')}
                                className={`px-6 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                                    configSubTab === 'voteheads' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
                                }`}
                            >
                                Vote Heads & Priorities
                            </button>
                            <button
                                onClick={() => setConfigSubTab('builder')}
                                className={`px-6 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                                    configSubTab === 'builder' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
                                }`}
                            >
                                Fee Structure Builder
                            </button>
                        </div>

                        {configSubTab === 'voteheads' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Voteheads left panel: creation */}
                                <div className="lg:col-span-1">
                                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                            {editingVoteheadId ? 'Edit Vote Head' : 'Add Vote Head'}
                                        </h3>
                                        
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vote Head Label</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="e.g. Tuition Fee" 
                                                    value={editingVoteheadId ? editVoteName : newVoteName}
                                                    onChange={e => editingVoteheadId ? setEditVoteName(e.target.value) : setNewVoteName(e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Payment Priority Ranking</label>
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    max="100"
                                                    placeholder="e.g. 1" 
                                                    value={editingVoteheadId ? editVotePriority : newVotePriority}
                                                    onChange={e => editingVoteheadId ? setEditVotePriority(Number(e.target.value)) : setNewVotePriority(Number(e.target.value))}
                                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                                />
                                                <p className="text-[9px] font-medium text-slate-400 leading-tight">Priority ranking determines order of fee payment allocation (lower number = paid first).</p>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Allocated Budget (Optional)</label>
                                                <input 
                                                    type="number" 
                                                    placeholder="0.00" 
                                                    value={editingVoteheadId ? editVoteAllocatedAmount : newVoteAllocatedAmount}
                                                    onChange={e => editingVoteheadId ? setEditVoteAllocatedAmount(Number(e.target.value)) : setNewVoteAllocatedAmount(Number(e.target.value))}
                                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                                />
                                            </div>

                                            {editingVoteheadId ? (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => setEditingVoteheadId(null)}
                                                        className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-bold"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={() => handleSaveVoteHead({ id: editingVoteheadId, name: editVoteName, priority: editVotePriority, allocatedAmount: editVoteAllocatedAmount })}
                                                        className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                                                    >
                                                        Save Changes
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleSaveVoteHead({ name: newVoteName, priority: newVotePriority, allocatedAmount: newVoteAllocatedAmount })}
                                                    className="w-full py-4 bg-slate-900 text-white hover:bg-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md"
                                                >
                                                    Register Vote Head
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Voteheads right panel: grid/table */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">Active Institutional Vote Heads</h3>
                                        
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Vote Head Name</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Priority</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Budget</th>
                                                        <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {(props.voteHeads || []).length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="py-8 text-center text-xs text-slate-400">No Vote Heads configured yet. Setup presets using the form.</td>
                                                        </tr>
                                                    ) : (
                                                        [...(props.voteHeads || [])].sort((a,b) => (a.priority || 99) - (b.priority || 99)).map(vh => (
                                                            <tr key={vh.id} className="hover:bg-slate-50/50">
                                                                <td className="py-4 text-xs font-bold text-slate-800">{vh.name}</td>
                                                                <td className="py-4 text-xs text-center">
                                                                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-black text-[10px]">
                                                                        #{vh.priority}
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 text-xs text-right text-slate-500">KES {vh.allocatedAmount?.toLocaleString()}</td>
                                                                <td className="py-4 text-xs text-right">
                                                                    <div className="inline-flex gap-2">
                                                                        <button 
                                                                            onClick={() => {
                                                                                setEditingVoteheadId(vh.id);
                                                                                setEditVoteName(vh.name);
                                                                                setEditVotePriority(vh.priority || 10);
                                                                                setEditVoteAllocatedAmount(vh.allocatedAmount || 0);
                                                                            }}
                                                                            className="p-1.5 bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-md"
                                                                            title="Edit"
                                                                        >
                                                                            <PencilIcon className="w-4 h-4" />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleDeleteVoteHead(vh.id)}
                                                                            className="p-1.5 bg-slate-50 text-slate-500 hover:text-rose-600 rounded-md"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2Icon className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {configSubTab === 'builder' && (
                            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cohort Fee Structure Builder</h3>
                                    <p className="text-xs font-medium text-slate-400">Map specific courses, academic years, and terms/semesters to itemized votehead amounts to structure institutional billing structures.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Cohort Course</label>
                                        <select 
                                            value={builderCourseId}
                                            onChange={e => setBuilderCourseId(e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
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
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                        >
                                            <option value="">Select Academic Year</option>
                                            {(props.academicYears || []).map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Term / Semester</label>
                                        <select 
                                            value={builderTerm}
                                            onChange={e => setBuilderTerm(e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                        >
                                            <option value="">Select Semester</option>
                                            {(props.semesters || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Grid of configured voteheads for amount assignment */}
                                {builderCourseId && builderAYId && builderTerm && (
                                    <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest pb-2 border-b">Configure amounts for this cohort</h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {(props.voteHeads || []).length === 0 ? (
                                                <p className="col-span-2 text-center text-xs text-slate-400 p-4">No configured voteheads found. Setup voteheads in the first tab to assign values.</p>
                                            ) : (
                                                (props.voteHeads || []).map(vh => (
                                                    <div key={vh.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-slate-800">{vh.name}</p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority Rank #{vh.priority}</p>
                                                        </div>
                                                        <div className="w-1/3">
                                                            <input 
                                                                type="number" 
                                                                placeholder="KES 0.00"
                                                                value={builderAmounts[vh.id] || ''}
                                                                onChange={e => setBuilderAmounts(prev => ({ ...prev, [vh.id]: Number(e.target.value) }))}
                                                                className="w-full px-3 py-2 border rounded-xl outline-none font-bold text-right text-sm bg-white focus:ring-2 focus:ring-indigo-600"
                                                            />
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="pt-6 border-t flex justify-between items-center">
                                            <div className="text-slate-500 font-medium text-sm">
                                                Total Structure Amount: <span className="font-black text-slate-900 text-lg">KES {Object.values(builderAmounts).reduce((sum, a) => sum + (a || 0), 0)?.toLocaleString()}</span>
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
                        )}
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-1 space-y-6">
                            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Record Expense</h3>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Category</label>
                                        <select className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none">
                                            <option>Salaries</option>
                                            <option>Utilities</option>
                                            <option>Maintenance</option>
                                            <option>Supplies</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Amount (KES)</label>
                                        <input type="number" placeholder="0.00" className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Description</label>
                                        <textarea placeholder="Purpose of expenditure..." rows={3} className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none resize-none" />
                                    </div>
                                    <button onClick={() => alert("Expense recorded in session.")} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg">Submit Record</button>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm min-h-full">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6">Expenditure Log</h3>
                                <div className="space-y-4">
                                    {(props.expenses || []).map((exp, i) => (
                                        <div key={i} className="flex justify-between items-center p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100/50 transition-all group">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                    <BanknotesIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{exp.description}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{exp.category} • {exp.date}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-rose-600">-KES {(exp.amount ?? 0)?.toLocaleString()}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
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
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">NG-CDF / Constituency Name</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. Kigumo NG-CDF"
                                                value={bursaryConstituency}
                                                onChange={e => setBursaryConstituency(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                            />
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
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Target Constituency Name</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. Kigumo"
                                                value={bursaryConstituency}
                                                onChange={e => setBursaryConstituency(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-700 text-sm"
                                            />
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
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <FinancialAuditDashboard
                            invoices={props.invoices}
                            receipts={props.receipts}
                            expenses={props.expenses}
                            institutionId={props.institution.id}
                        />
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-8 animate-in fade-in duration-300 text-left">
                        {/* Clean Page Title Header */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Institutional settings</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Manage opening balances, academic years, calendars, and organizational branding.</p>
                            </div>
                            {isDrivingSchool && (
                                <div className="flex gap-2 bg-slate-100 dark:bg-slate-850 p-1.5 rounded-2xl w-fit">
                                    <button
                                        onClick={() => setSettingsSubTab('opening_balance')}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            settingsSubTab === 'opening_balance'
                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md'
                                            : 'text-slate-500 hover:text-indigo-650'
                                        }`}
                                    >
                                        Opening Balance
                                    </button>
                                    <button
                                        onClick={() => setSettingsSubTab('academic_calendar')}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            settingsSubTab === 'academic_calendar'
                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md'
                                            : 'text-slate-500 hover:text-indigo-650'
                                        }`}
                                    >
                                        Academic Year & Calendar
                                    </button>
                                    <button
                                        onClick={() => setSettingsSubTab('financial_year')}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            settingsSubTab === 'financial_year'
                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md'
                                            : 'text-slate-500 hover:text-indigo-650'
                                        }`}
                                    >
                                        Financial Year
                                    </button>
                                    <button
                                        onClick={() => setSettingsSubTab('accounts_grants')}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            settingsSubTab === 'accounts_grants'
                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md'
                                            : 'text-slate-500 hover:text-indigo-650'
                                        }`}
                                    >
                                        Accounts & Grants
                                    </button>
                                    <button
                                        onClick={() => setSettingsSubTab('user_permissions')}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            settingsSubTab === 'user_permissions'
                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md'
                                            : 'text-slate-500 hover:text-indigo-650'
                                        }`}
                                    >
                                        User Permissions
                                    </button>
                                    <button
                                        onClick={() => setSettingsSubTab('branding')}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            settingsSubTab === 'branding'
                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md'
                                            : 'text-slate-550 hover:text-indigo-655'
                                        }`}
                                    >
                                        Branding
                                    </button>
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

                        {/* Subtab content: Academic Calendar */}
                        {settingsSubTab === 'academic_calendar' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
                                {/* Academic Years list */}
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Academic Years</h3>
                                        <button 
                                            onClick={() => {
                                                const year = prompt("Enter Academic Year name (e.g. 2026):");
                                                if (year) alert(`Academic Year ${year} configured!`);
                                            }}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Add Year
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {props.academicYears.map(ay => (
                                            <div key={ay.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">{ay.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Year Preset</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    ay.id === props.academicYears[0]?.id 
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' 
                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                    {ay.id === props.academicYears[0]?.id ? 'Current Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Terms / Semesters list */}
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Terms / Semesters</h3>
                                        <button 
                                            onClick={() => {
                                                const termName = prompt("Enter Term/Semester name (e.g. Term 1):");
                                                if (termName) alert(`Term ${termName} calendar entry created!`);
                                            }}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Add Term
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {props.semesters.map(sem => (
                                            <div key={sem.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">Term {sem.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Duration: {sem.startDate || '—'} to {sem.endDate || '—'}</p>
                                                </div>
                                                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-750 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-wider">
                                                    Configured
                                                </span>
                                            </div>
                                        ))}
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
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Month</label>
                                                <select
                                                    value={newFyStart}
                                                    onChange={(e) => setNewFyStart(e.target.value)}
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-750 text-sm outline-none"
                                                >
                                                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End Month</label>
                                                <select
                                                    disabled
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 rounded-2xl outline-none font-bold text-slate-400 cursor-not-allowed text-sm"
                                                >
                                                    <option>December</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (!newFyName.trim()) return alert("Enter a valid name!");
                                                setFinancialYears(prev => [
                                                    ...prev,
                                                    { id: `fy_${Date.now()}`, name: newFyName, startMonth: newFyStart, endMonth: 'December', status: 'Active' }
                                                ]);
                                                setNewFyName('');
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
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Cycle: {fy.startMonth} to {fy.endMonth}</p>
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
                                        <button
                                            onClick={handleAddGridRow}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5"
                                        >
                                            <PlusIcon className="w-3.5 h-3.5" />
                                            Add Vote Head
                                        </button>
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
                                                                    className="p-1.5 bg-indigo-55/60 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-indigo-950 dark:hover:bg-indigo-650 dark:text-indigo-400 rounded-md transition-colors"
                                                                    title="Save Changes"
                                                                >
                                                                    <ArrowUpTrayIcon className="w-3.5 h-3.5" />
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
                                                                }}
                                                                className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                onClick={() => handleSaveBankAccount({ id: editingBankAccountId, bankName: newBankName, accountName: newAccountName, accountNumber: newAccountNumber, branchName: newBranchName, currency: newCurrency })}
                                                                className="flex-1 py-2.5 bg-indigo-650 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                                                            >
                                                                Save
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleSaveBankAccount({ bankName: newBankName, accountName: newAccountName, accountNumber: newAccountNumber, branchName: newBranchName, currency: newCurrency })}
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
                                                        <p className="text-xs font-bold text-slate-800 dark:text-white">{ba.bankName}</p>
                                                        <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider mt-0.5">{ba.accountNumber}</p>
                                                        <p className="text-[9px] text-slate-400 font-semibold">{ba.accountName} {ba.branchName && `(${ba.branchName} Branch)`}</p>
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
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Student *</label>
                                    <select
                                        value={manualPayStudentId}
                                        onChange={(e) => {
                                            setManualPayStudentId(e.target.value);
                                            setManualPayInvoiceId('');
                                        }}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                                    >
                                        <option value="">-- Choose Student --</option>
                                        {props.students.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.admissionNumber || s.admission_number || 'No Adm'})</option>
                                        ))}
                                    </select>
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
                                                    {inv.invoiceNumber} ({inv.description || 'Fees'} - KES {inv.totalAmount.toLocaleString()}) [{inv.status}]
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
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
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
                                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white text-xs"
                                        />
                                    </div>
                                </div>

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

                                <button
                                    onClick={handlePostManualPayment}
                                    disabled={isSavingManualPay || !manualPayStudentId || !manualPayInvoiceId || manualPayAmount <= 0}
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
                                                    {inv.invoiceNumber} ({inv.description || 'Fees'} - KES {inv.totalAmount.toLocaleString()}) [{inv.status}]
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
                </div>
            </div>
        </div>
    );
};
