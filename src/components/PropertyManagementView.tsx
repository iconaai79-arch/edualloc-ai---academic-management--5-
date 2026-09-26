import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    User, Institution, PMProperty, PMUnit, PMTenant, PMLease, PMPayment, PMTicket,
    PMPropertyType, PMUnitStatus, PMLeaseStatus, PMPaymentMethod, PMPaymentType,
    PMPriority, PMLandlord, PMDisbursement, PMInquiry, PMInquiryStatus,
    CompanyDetails, PMInvoice, PMInvoiceStatus, SmsConfig, Department, Subject, Course, LetterheadConfig, UserUpdateData, PMSettings,
    PMExpenseVoucher, PMNoticeLetter, PMUtilityReading, PMNoticeStatus, PMNoticeType, PMExpenseCategory, PMExpenseStatus,
    PMInspection, PMDepositRefund
} from '../types';
import { apiService } from '../services/apiService';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { Cog8ToothIcon } from './icons/Cog8ToothIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { UserIcon } from './icons/UserIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { TrashIcon } from './icons/TrashIcon';
import { EyeIcon } from './icons/EyeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { HomeIcon } from './icons/HomeIcon';
import { GridIcon } from './icons/GridIcon';
import { ListIcon } from './icons/ListIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { ShoppingCartIcon } from './icons/ShoppingCartIcon';
import { MpesaIcon } from './icons/MpesaIcon';
import { KcbIcon } from './icons/KcbIcon';
import { CoopIcon } from './icons/CoopIcon';
import { BanknotesIcon } from './icons/BanknotesIcon';
import { PencilIcon } from './icons/PencilIcon';
import { CalendarDaysIcon as CalendarIcon } from './icons/CalendarDaysIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import * as pdfService from '../services/pdfService';
import { sendEmailNotification, getInstitutionEmailConfig } from '../services/emailService';
import { PdfPreviewModal } from './PdfPreviewModal';
import { CommunicationsManager } from './CommunicationsManager';
import PMConfigManager from './PMConfigManager';
import { UserManager } from './UserManager';
import * as XLSX from 'xlsx';

const dataUriToBlob = (dataUri: string) => {
    const byteString = atob(dataUri.split(',')[1]);
    const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
};

interface PropertyManagementViewProps {
    currentUser?: User;
    currentInstitution?: Institution;
    companyDetails: CompanyDetails;
    users: User[];
    onDataChange: () => void;
    onAddUser: (userData: any) => Promise<void>;
    onEditUser: (userId: string, data: UserUpdateData) => Promise<void>;
    onDeleteUser: (id: string) => Promise<void>;
    onImportUsers: (users: Omit<User, 'id' | 'institutionId'>[]) => Promise<void>;
    onLogAction: (action: string) => Promise<void>;
    smsConfig: SmsConfig;
    departments: Department[];
    subjects: Subject[];
    courses: Course[];
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    onSendBulkCredentials?: (users: User[], method: 'email' | 'sms') => Promise<{ success_count: number; fail_count: number }>;
    transactions?: any[];
    onAddProperty?: (p: any) => Promise<void>;
    onEditProperty?: (id: string, p: any) => Promise<void>;
    onDeleteProperty?: (id: string) => Promise<void>;
    onAddUnit?: (u: any) => Promise<void>;
    onEditUnit?: (id: string, u: any) => Promise<void>;
    onDeleteUnit?: (id: string) => Promise<void>;
    onAddLandlord?: (l: any) => Promise<void>;
    onEditLandlord?: (id: string, l: any) => Promise<void>;
    onDeleteLandlord?: (id: string) => Promise<void>;
}

export const PropertyManagementView: React.FC<PropertyManagementViewProps> = (props) => {
    const { 
        currentUser, currentInstitution = {} as any, companyDetails = {} as any, users = [], onDataChange = () => {},
        onAddUser = async () => {}, onEditUser = async () => {}, onDeleteUser = async () => {}, onImportUsers = async () => {}, onLogAction = async () => {},
        smsConfig = {} as any, departments = [], subjects = [], courses = [], letterheadConfig = {} as any, logoUrl, footerImageUrl,
        onSendBulkCredentials = async () => ({ success_count: 0, fail_count: 0 }), transactions = [],
        onAddProperty = async () => {}, onEditProperty = async () => {}, onDeleteProperty = async () => {},
        onAddUnit = async () => {}, onEditUnit = async () => {}, onDeleteUnit = async () => {},
        onAddLandlord = async () => {}, onEditLandlord = async () => {}, onDeleteLandlord = async () => {}
    } = props;
    const institutionId = currentInstitution?.id;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'properties' | 'landlords' | 'tenants' | 'payouts' | 'expenses' | 'reports' | 'listings' | 'comms' | 'inquiries' | 'staff' | 'config'>('dashboard');
    const [propertyActiveSubTab, setPropertyActiveSubTab] = useState<'properties' | 'units' | 'landlords' | 'tenants' | 'leases' | 'payments' | 'maintenance' | 'invoices' | 'notices' | 'utilities' | 'broadcasts'>('properties');
    const [reportsSubTab, setReportsSubTab] = useState<'analytics' | 'statements' | 'commission' | 'arrears' | 'inspections' | 'refunds' | 'itax'>('analytics');
    const [expenses, setExpenses] = useState<PMExpenseVoucher[]>([]);

    const [landlords, setLandlords] = useState<PMLandlord[]>([]);

    const [properties, setProperties] = useState<PMProperty[]>([]);
    const [units, setUnits] = useState<PMUnit[]>([]);
    const [tenants, setTenants] = useState<PMTenant[]>([]);
    const [leases, setLeases] = useState<PMLease[]>([]);
    const [payments, setPayments] = useState<PMPayment[]>([]);
    const [tickets, setTickets] = useState<PMTicket[]>([]);
    const [disbursements, setDisbursements] = useState<PMDisbursement[]>([]);
    const [listings, setListings] = useState<any[]>([]); // Using any for now until types are fully recognized
    const [inquiries, setInquiries] = useState<PMInquiry[]>([]);
    const [invoices, setInvoices] = useState<PMInvoice[]>([]);
    const [notices, setNotices] = useState<PMNoticeLetter[]>([]);
    const [showNoticeModal, setShowNoticeModal] = useState(false);
    const [utilityReadings, setUtilityReadings] = useState<PMUtilityReading[]>([]);
    const [showUtilityModal, setShowUtilityModal] = useState(false);
    const [inspections, setInspections] = useState<PMInspection[]>([]);
    const [showInspectionModal, setShowInspectionModal] = useState(false);
    const [editingInspection, setEditingInspection] = useState<PMInspection | null>(null);
    const [showWhtReviewModal, setShowWhtReviewModal] = useState(false);
    const [selectedInvoiceForWhtReview, setSelectedInvoiceForWhtReview] = useState<PMInvoice | null>(null);

    const [selectedVacateNotice, setSelectedVacateNotice] = useState<PMNoticeLetter | null>(null);
    const [inspectionDetails, setInspectionDetails] = useState<{
        waterMeterNo: string;
        waterBill: number;
        waterRemarks: string;
        electricityMeterNo: string;
        electricityBill: number;
        electricityRemarks: string;
        ciuNo: string;
        items: Array<{ description: string; amount: number; remarks: string }>;
        checkedBy: string;
        tenantIdNo: string;
        tenantTel: string;
    }>({
        waterMeterNo: '',
        waterBill: 0,
        waterRemarks: '',
        electricityMeterNo: '',
        electricityBill: 0,
        electricityRemarks: '',
        ciuNo: '',
        items: [],
        checkedBy: '',
        tenantIdNo: '',
        tenantTel: ''
    });

    useEffect(() => {
        if (editingInspection) {
            try {
                const parsed = JSON.parse(editingInspection.repairsRequired || '{}');
                setInspectionDetails({
                    waterMeterNo: parsed.waterMeterNo || '',
                    waterBill: parsed.waterBill || 0,
                    waterRemarks: parsed.waterRemarks || '',
                    electricityMeterNo: parsed.electricityMeterNo || '',
                    electricityBill: parsed.electricityBill || 0,
                    electricityRemarks: parsed.electricityRemarks || '',
                    ciuNo: parsed.ciuNo || '',
                    items: parsed.items || [],
                    checkedBy: parsed.checkedBy || '',
                    tenantIdNo: parsed.tenantIdNo || '',
                    tenantTel: parsed.tenantTel || ''
                });
            } catch (e) {
                setInspectionDetails({
                    waterMeterNo: '',
                    waterBill: 0,
                    waterRemarks: '',
                    electricityMeterNo: '',
                    electricityBill: 0,
                    electricityRemarks: '',
                    ciuNo: '',
                    items: editingInspection.repairsRequired ? [{ description: editingInspection.repairsRequired, amount: editingInspection.estimatedRepairCost || 0, remarks: '' }] : [],
                    checkedBy: '',
                    tenantIdNo: '',
                    tenantTel: ''
                });
            }
        } else {
            setInspectionDetails({
                waterMeterNo: '',
                waterBill: 0,
                waterRemarks: '',
                electricityMeterNo: '',
                electricityBill: 0,
                electricityRemarks: '',
                ciuNo: '',
                items: [],
                checkedBy: '',
                tenantIdNo: '',
                tenantTel: ''
            });
        }
    }, [editingInspection, showInspectionModal]);

    const [depositRefunds, setDepositRefunds] = useState<PMDepositRefund[]>([]);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [editingRefund, setEditingRefund] = useState<PMDepositRefund | null>(null);
    const [renewingLease, setRenewingLease] = useState<PMLease | null>(null);
    const [landlordSignatureFile, setLandlordSignatureFile] = useState<File | null>(null);
    const [tenantSignatureFile, setTenantSignatureFile] = useState<File | null>(null);
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const existingTowns = useMemo(() => {
        const unique = new Set<string>();
        properties.forEach(p => {
            if (p.town) unique.add(p.town.trim());
        });
        const defaults = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Nyeri", "Malindi", "Kakamega", "Kericho", "Kisii", "Machakos", "Kitale", "Garissa", "Kiambu", "Ruiru", "Athi River"];
        defaults.forEach(d => unique.add(d));
        return Array.from(unique).sort((a, b) => a.localeCompare(b));
    }, [properties]);

    // Modals
    const [showLandlordModal, setShowLandlordModal] = useState(false);
    const [editingLandlord, setEditingLandlord] = useState<PMLandlord | null>(null);
    const [showPropertyModal, setShowPropertyModal] = useState(false);
    const [editingPropertyTown, setEditingPropertyTown] = useState('');
    const [propertyPage, setPropertyPage] = useState(1);
    const PROPERTY_PAGE_SIZE = 10;
    const [dashPropPage, setDashPropPage] = useState(1);
    const [unitSearch, setUnitSearch] = useState('');
    const [unitPage, setUnitPage] = useState(1);
    const [landlordSearch, setLandlordSearch] = useState('');
    const [landlordPage, setLandlordPage] = useState(1);
    const [tenantPage, setTenantPage] = useState(1);
    const [leaseSearch, setLeaseSearch] = useState('');
    const [leaseStatusFilter, setLeaseStatusFilter] = useState('all');
    const [leasePage, setLeasePage] = useState(1);
    const PAGE_SIZE = 10;
    const [showUnitModal, setShowUnitModal] = useState(false);
    const [showTenantModal, setShowTenantModal] = useState(false);
    const [showTenantImportModal, setShowTenantImportModal] = useState(false);
    const [showLeaseModal, setShowLeaseModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [tenantSearchQuery, setTenantSearchQuery] = useState('');
    const [selectedLeaseId, setSelectedLeaseId] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [pmSettings, setPmSettings] = useState<PMSettings | null>(null);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [showListingModal, setShowListingModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [selectedExpensePropertyId, setSelectedExpensePropertyId] = useState('');
    const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
    const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
    const [expensePropertyFilter, setExpensePropertyFilter] = useState<string>('all');
    const [expenseStatusFilter, setExpenseStatusFilter] = useState<string>('all');
    const [expensePage, setExpensePage] = useState(1);
    const [showBankModal, setShowBankModal] = useState(false);
    const [selectedTenantForBankAction, setSelectedTenantForBankAction] = useState<PMTenant | null>(null);
    const [showCoopModal, setShowCoopModal] = useState(false);
    const [selectedTenantForCoopAction, setSelectedTenantForCoopAction] = useState<PMTenant | null>(null);
    const [newListingImages, setNewListingImages] = useState<string[]>([]);
    const [selectedLeaseForPreview, setSelectedLeaseForPreview] = useState<PMLease | null>(null);
    const [editingProperty, setEditingProperty] = useState<PMProperty | null>(null);
    const [editingInvoice, setEditingInvoice] = useState<PMInvoice | null>(null);
    const [editingUnit, setEditingUnit] = useState<PMUnit | null>(null);
    const [editingTenant, setEditingTenant] = useState<PMTenant | null>(null);
    const [refundSelectedLeaseId, setRefundSelectedLeaseId] = useState('');
    const [isAddingStaff, setIsAddingStaff] = useState(false);
    const [commStartDate, setCommStartDate] = useState('');
    const [commEndDate, setCommEndDate] = useState('');
    const [showGenerateArrearsModal, setShowGenerateArrearsModal] = useState(false);
    const [showBulkDateModal, setShowBulkDateModal] = useState(false);
    const [bulkUpdateDate, setBulkUpdateDate] = useState(new Date().toISOString().split('T')[0]);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    // Collection progress analysis state
    const [selectedReportPeriod, setSelectedReportPeriod] = useState<string>(() => {
        const d = new Date();
        return `${d.getFullYear()}-${d.getMonth() + 1}`;
    });
    const [propertySearchQuery, setPropertySearchQuery] = useState('');
    const [selectedPropertyForDrillDown, setSelectedPropertyForDrillDown] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState('');
    const [previewPdfTitle, setPreviewPdfTitle] = useState('');

    // Derived for Communications
    const commsUsers = useMemo(() => {
        const mappedTenants = tenants.map(t => ({
            id: t.id,
            name: t.name,
            phoneNumber: t.phoneNumber,
            role: 'tenant',
            institutionId: t.institutionId
        }));
        const mappedLandlords = landlords.map(l => ({
            id: l.id,
            name: l.name,
            phoneNumber: l.phoneNumber,
            role: 'landlord',
            institutionId: l.institutionId
        }));
        const mappedStaff = users.filter(u => u.institutionId === institutionId).map(u => ({
            ...u,
            role: u.role || 'staff'
        }));

        return [...mappedStaff, ...mappedTenants, ...mappedLandlords] as any[];
    }, [users, tenants, landlords, institutionId]);

    const getNextRentDueDate = (dueDay: number): string => {
        const today = new Date();
        let targetMonth = today.getMonth();
        let targetYear = today.getFullYear();
        
        if (today.getDate() > dueDay) {
            targetMonth += 1;
            if (targetMonth > 11) {
                targetMonth = 0;
                targetYear += 1;
            }
        }
        
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const finalDay = Math.min(dueDay, daysInMonth);
        
        const dateObj = new Date(targetYear, targetMonth, finalDay);
        const year = dateObj.getFullYear();
        const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dayStr = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${monthStr}-${dayStr}`;
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const results = await Promise.all([
                apiService.fetchModuleRecords<PMLandlord>('pm_landlords', institutionId),
                apiService.fetchModuleRecords<PMProperty>('pm_properties', institutionId),
                apiService.fetchModuleRecords<PMUnit>('pm_units', institutionId),
                apiService.fetchModuleRecords<PMTenant>('pm_tenants', institutionId),
                apiService.fetchModuleRecords<PMLease>('pm_leases', institutionId),
                apiService.fetchModuleRecords<PMPayment>('pm_payments', institutionId),
                apiService.fetchModuleRecords<PMTicket>('pm_maintenance', institutionId),
                apiService.fetchModuleRecords<PMDisbursement>('pm_disbursements', institutionId),
                apiService.fetchModuleRecords<any>('pm_listings', institutionId),
                apiService.fetchModuleRecords<PMInquiry>('pm_inquiries', institutionId),
                apiService.fetchModuleRecords<PMInvoice>('pm_invoices', institutionId),
                apiService.fetchModuleRecords<PMSettings>('pm_settings', institutionId),
                apiService.fetchModuleRecords<PMNoticeLetter>('pm_notices', institutionId),
                apiService.fetchModuleRecords<PMExpenseVoucher>('pm_expenses', institutionId),
                apiService.fetchModuleRecords<PMUtilityReading>('pm_utility_readings', institutionId),
                apiService.fetchModuleRecords<PMInspection>('pm_inspections', institutionId),
                apiService.fetchModuleRecords<PMDepositRefund>('pm_deposit_refunds', institutionId)
            ]);
            
            const [ls, ps, un, tn, le, py, tk, ds, lts, inq, inv, stg, nt, ex, utr, insp, ref] = results as any[];

            setLandlords(ls || []);
            setProperties(ps || []);
            setUnits(un || []);
            setTenants(tn || []);
            setLeases(le || []);
            setPayments(py || []);
            setTickets(tk || []);
            setDisbursements(ds || []);
            setListings(lts || []);
            setInquiries(inq || []);
            setInvoices(inv || []);
            setNotices(nt || []);
            setExpenses(ex || []);
            setUtilityReadings(utr || []);
            setInspections(insp || []);
            setDepositRefunds(ref || []);
            
            if (stg && stg.length > 0) {
                setPmSettings(stg[0]);
            } else {
                setPmSettings(null);
            }
            
            onDataChange();
        } catch (error) {
            console.error("Failed to load PM data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [institutionId]);

    useEffect(() => {
        if (!showPaymentModal) {
            setTenantSearchQuery('');
            setSelectedLeaseId('');
            setIsDropdownOpen(false);
        }
    }, [showPaymentModal]);

    // Derived Stats
    const totalRentCollected = payments.filter(p => p.paymentType === 'Rent').reduce((sum, p) => sum + p.amount, 0);
    const totalCommissionEarned = payments.reduce((sum, p) => sum + (p.commissionAmount || 0), 0);
    const activeLeases = leases.filter(l => l.status === 'Active');
    const vacantUnits = units.filter(u => u.status === 'Vacant');
    const openTickets = tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');

    // Available periods for the filter dropdown
    const availablePeriods = useMemo(() => {
        const periods = new Set<string>();
        const current = new Date();
        periods.add(`${current.getFullYear()}-${current.getMonth() + 1}`);

        invoices.forEach(inv => {
            if (inv.issueDate) {
                const d = new Date(inv.issueDate);
                if (!isNaN(d.getTime())) {
                    periods.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
                }
            }
        });

        payments.forEach(p => {
            if (p.periodYear && p.periodMonth) {
                periods.add(`${p.periodYear}-${p.periodMonth}`);
            } else if (p.paymentDate) {
                const d = new Date(p.paymentDate);
                if (!isNaN(d.getTime())) {
                    periods.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
                }
            }
        });

        return Array.from(periods).map(p => {
            const [year, month] = p.split('-').map(Number);
            return {
                key: p,
                year,
                month,
                label: new Date(year, month - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' })
            };
        }).sort((a, b) => b.year - a.year || b.month - a.month);
    }, [invoices, payments]);

    // Real monthly rent trend (for the trend chart)
    const realMonthlyRentTrend = useMemo(() => {
        const trend = [];
        const now = new Date();
        // Look back 8 months
        for (let i = 7; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();
            const label = d.toLocaleDateString('default', { month: 'short' });
            
            const total = payments
                .filter(p => {
                    if (p.paymentType !== 'Rent' || p.status !== 'Completed') return false;
                    const pMonth = p.periodMonth ?? (new Date(p.paymentDate).getMonth() + 1);
                    const pYear = p.periodYear ?? new Date(p.paymentDate).getFullYear();
                    return pMonth === m && pYear === y;
                })
                .reduce((sum, p) => sum + p.amount, 0);

            trend.push({ monthLabel: `${label} ${y}`, amount: total });
        }
        return trend;
    }, [payments]);

    // Cash flow trend breakdown (revenue vs expenses vs payouts)
    const cashFlowTrend = useMemo(() => {
        const trend = [];
        const now = new Date();
        for (let i = 7; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();
            const label = d.toLocaleDateString('default', { month: 'short' });

            const revenue = payments
                .filter(p => {
                    if (p.status !== 'Completed') return false;
                    const dateObj = new Date(p.paymentDate);
                    return (dateObj.getMonth() + 1) === m && dateObj.getFullYear() === y;
                })
                .reduce((sum, p) => sum + p.amount, 0);

            const outflow = expenses
                .filter(e => {
                    if (e.status !== 'Paid') return false;
                    const dateObj = new Date(e.paymentDate);
                    return (dateObj.getMonth() + 1) === m && dateObj.getFullYear() === y;
                })
                .reduce((sum, e) => sum + e.amount, 0);

            const payouts = disbursements
                .filter(disb => {
                    if (disb.status !== 'Paid' && disb.status !== 'Approved') return false;
                    const dateObj = new Date(disb.processedDate || disb.requestDate || Date.now());
                    return (dateObj.getMonth() + 1) === m && dateObj.getFullYear() === y;
                })
                .reduce((sum, disb) => sum + disb.amount, 0);

            trend.push({ monthLabel: `${label} ${y}`, revenue, outflow, payouts });
        }
        return trend;
    }, [payments, expenses, disbursements]);

    // Calculated metrics per property for the selected period
    const propertiesCollectionData = useMemo(() => {
        let selYear: number | null = null;
        let selMonth: number | null = null;
        
        if (selectedReportPeriod !== 'All') {
            const [y, m] = selectedReportPeriod.split('-').map(Number);
            selYear = y;
            selMonth = m;
        }

        return properties.map(prop => {
            const propUnits = units.filter(u => u.propertyId === prop.id);
            const unitIds = propUnits.map(u => u.id);
            const propLeases = leases.filter(l => unitIds.includes(l.unitId));
            const leaseIds = propLeases.map(l => l.id);

            // Filter invoices
            const propInvoices = invoices.filter(inv => {
                if (!unitIds.includes(inv.unitId)) return false;
                if (inv.status === 'Cancelled' || inv.status === 'Draft') return false;
                if (selYear !== null && selMonth !== null) {
                    const invDate = new Date(inv.issueDate);
                    return (invDate.getMonth() + 1) === selMonth && invDate.getFullYear() === selYear;
                }
                return true;
            });

            // Filter payments
            const propPayments = payments.filter(p => {
                if (!leaseIds.includes(p.leaseId)) return false;
                if (p.status !== 'Completed') return false;
                if (selYear !== null && selMonth !== null) {
                    const pMonth = p.periodMonth ?? (new Date(p.paymentDate).getMonth() + 1);
                    const pYear = p.periodYear ?? new Date(p.paymentDate).getFullYear();
                    return pMonth === selMonth && pYear === selYear;
                }
                return true;
            });

            const totalInvoiced = propInvoices.reduce((sum, inv) => sum + inv.amount, 0);
            const totalCollected = propPayments.reduce((sum, p) => sum + p.amount, 0);
            const arrears = Math.max(0, totalInvoiced - totalCollected);
            const collectionRate = totalInvoiced > 0 
                ? Math.round((totalCollected / totalInvoiced) * 100) 
                : (totalCollected > 0 ? 100 : 0);

            return {
                property: prop,
                unitsCount: propUnits.length,
                totalInvoiced,
                totalCollected,
                arrears,
                collectionRate,
                propUnits,
                propLeases,
                propInvoices,
                propPayments
            };
        });
    }, [properties, units, leases, invoices, payments, selectedReportPeriod]);

    // Period overall summary metrics
    const periodSummary = useMemo(() => {
        const totalInvoiced = propertiesCollectionData.reduce((sum, d) => sum + d.totalInvoiced, 0);
        const totalCollected = propertiesCollectionData.reduce((sum, d) => sum + d.totalCollected, 0);
        const totalArrears = propertiesCollectionData.reduce((sum, d) => sum + d.arrears, 0);
        const collectionRate = totalInvoiced > 0 
            ? Math.round((totalCollected / totalInvoiced) * 100) 
            : (totalCollected > 0 ? 100 : 0);

        return {
            totalInvoiced,
            totalCollected,
            totalArrears,
            collectionRate
        };
    }, [propertiesCollectionData]);

    const effectiveSmsConfig = useMemo(() => {
        if (currentInstitution?.smsConfig && (currentInstitution.smsConfig.apiKey || currentInstitution.smsConfig.userId || currentInstitution.smsConfig.username || currentInstitution.smsConfig.accountId)) {
            return currentInstitution.smsConfig;
        }
        if (companyDetails?.smsConfig && (companyDetails.smsConfig.apiKey || companyDetails.smsConfig.userId || companyDetails.smsConfig.username || companyDetails.smsConfig.accountId)) {
            return companyDetails.smsConfig;
        }
        if (smsConfig && (smsConfig.apiKey || smsConfig.userId || smsConfig.username || smsConfig.accountId)) {
            return smsConfig;
        }
        return currentInstitution?.smsConfig || companyDetails?.smsConfig || smsConfig || undefined;
    }, [currentInstitution?.smsConfig, companyDetails?.smsConfig, smsConfig]);

    const findOrCreatePortalUser = async (name: string, email: string | null | undefined, phoneNumber: string | null | undefined, role: 'landlord' | 'tenant', tempPassword: string) => {
        let matchingUser: any = null;
        const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
        const cleanPhone = phoneNumber && typeof phoneNumber === 'string' ? phoneNumber.trim() : null;

        // 1. First search in local state array as a fast check
        const localMatch = users.find(u => 
            (cleanEmail && u.email?.toLowerCase() === cleanEmail) || 
            (cleanPhone && (u.phoneNumber === cleanPhone || (u as any).phone === cleanPhone))
        );
        if (localMatch) {
            matchingUser = localMatch;
        } else {
            // 2. If not found locally, check the database globally via email
            if (cleanEmail) {
                try {
                    const dbMatches = await apiService.fetchModuleRecords('users', undefined, undefined, { 
                        filter: { email: cleanEmail } 
                    });
                    if (dbMatches && dbMatches.length > 0) {
                        matchingUser = dbMatches[0];
                    }
                } catch (e) {
                    console.warn("Global email check failed:", e);
                }
            }
            
            // 3. If still not found, check the database globally via phone number
            if (!matchingUser && cleanPhone) {
                try {
                    const dbMatches = await apiService.fetchModuleRecords('users', undefined, undefined, { 
                        filter: { phoneNumber: cleanPhone } 
                    });
                    if (dbMatches && dbMatches.length > 0) {
                        matchingUser = dbMatches[0];
                    }
                } catch (e) {
                    console.warn("Global phone check failed:", e);
                }
            }
        }

        if (matchingUser) {
            // Update existing user profile
            const updatedUser = { 
                ...matchingUser, 
                role: matchingUser.role === role ? matchingUser.role : role,
                password: tempPassword,
                mustChangePassword: true 
            };
            try {
                await apiService.updateModuleRecord('users', matchingUser.id, updatedUser);
            } catch (err) {
                console.warn("[PM] Failed to update matching user in users table:", err);
            }
            return matchingUser;
        } else {
            // Create a new user profile
            const newUser: any = {
                id: `user_${Date.now()}_${Math.random().toString(36).slice(-4)}`,
                name: name,
                email: cleanEmail,
                phoneNumber: cleanPhone || '',
                role: role,
                institutionId: institutionId || currentInstitution?.id,
                createdAt: new Date().toISOString(),
                isActive: true,
                mustChangePassword: true,
                needsEmailActivation: !cleanEmail,
                password: tempPassword
            };
            try {
                await apiService.saveModuleRecord('users', newUser);
            } catch (err) {
                console.warn("[PM] Failed to save new user in users table:", err);
            }
            return newUser;
        }
    };

    const handleSaveLandlord = async (data: Partial<PMLandlord>) => {
        try {
            if (editingLandlord) {
                // UPDATE existing landlord record
                const updatedLandlord: PMLandlord = {
                    ...editingLandlord,
                    name: data.name || editingLandlord.name,
                    phoneNumber: data.phoneNumber || editingLandlord.phoneNumber,
                    email: data.email ?? editingLandlord.email,
                    idNumber: data.idNumber ?? editingLandlord.idNumber,
                    taxPin: data.taxPin ?? editingLandlord.taxPin,
                    bankDetails: data.bankDetails ?? editingLandlord.bankDetails,
                    preferredPaymentMethod: data.preferredPaymentMethod ?? editingLandlord.preferredPaymentMethod,
                };
                await apiService.updateModuleRecord('pm_landlords', updatedLandlord.id, updatedLandlord);
                // Optimistically update local state immediately so UI reflects changes right away
                setLandlords(prev => prev.map(l => l.id === updatedLandlord.id ? updatedLandlord : l));
                setShowLandlordModal(false);
                setEditingLandlord(null);
                await loadData();
                alert('Landlord profile updated successfully!');
            } else {
                // CREATE new landlord
                const landlordId = `ll_${Date.now()}`;
                const tempPassword = Math.random().toString(36).slice(-8);

                // 1. Find or create portal user account globally (avoids conflicts)
                await findOrCreatePortalUser(data.name || '', data.email, data.phoneNumber, 'landlord', tempPassword);

                // 2. Send credentials — SMS if no email, email if email provided
                try {
                    if (data.email) {
                        const subject = 'Welcome to your Landlord Portal';
                        const body = `Welcome, ${data.name}!\n\nYou have been registered as a Landlord in the system.\nYou can now log in using your phone number or email to view your properties, track tenant payments, and monitor your commission payouts.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nPhone / Email: ${data.email}\nPassword: ${tempPassword}\n\nPlease change your password upon first login.\n\nBest Regards,\nSystem Admin`;
                        await apiService.sendEmail(data.email, subject, body, getInstitutionEmailConfig(currentInstitution, currentInstitution.emailConfig));
                    } else if (data.phoneNumber) {
                        const smsBody = `Welcome ${data.name}! Your Landlord Portal access:\nURL: ${window.location.origin}\nPhone: ${data.phoneNumber}\nPIN: ${tempPassword}\nLogin with your phone number & PIN. You will be asked to provide your email on first login.`;
                        const hasCustomGateway = !!(effectiveSmsConfig?.apiKey || effectiveSmsConfig?.userId || effectiveSmsConfig?.username || effectiveSmsConfig?.accountId);
                        const smsBalance = currentInstitution?.smsBalance || 0;
                        if (!hasCustomGateway && smsBalance < 1) {
                            const outboxMsg = {
                                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                phoneNumber: data.phoneNumber,
                                message: smsBody,
                                status: 'pending',
                                institutionId,
                                createdAt: new Date().toISOString()
                            };
                            await apiService.saveToSmsOutbox([outboxMsg]);
                            alert(`Landlord created. Insufficient SMS units, so credentials message was queued to outbox.`);
                        } else {
                            const res = await apiService.sendSms(data.phoneNumber, smsBody, effectiveSmsConfig, 1, institutionId || currentInstitution?.id, undefined, true);
                            if (res && res.success === false) {
                                throw new Error(res.message || "Failed to send SMS credentials");
                            }
                        }
                    }
                } catch (notifyErr) {
                    console.error('Failed to send landlord credentials notification:', notifyErr);
                }

                // 3. Create the PM landlord record
                const newLandlord: PMLandlord = {
                    id: landlordId,
                    name: data.name || '',
                    phoneNumber: data.phoneNumber || '',
                    email: data.email,
                    idNumber: data.idNumber,
                    taxPin: data.taxPin,
                    bankDetails: data.bankDetails,
                    preferredPaymentMethod: data.preferredPaymentMethod,
                    institutionId,
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('pm_landlords', newLandlord);

                setShowLandlordModal(false);
                loadData();

                if (data.email) {
                    alert(`Landlord saved! Login credentials emailed to ${data.email}`);
                } else {
                    alert(`Landlord saved! Login credentials sent via SMS to ${data.phoneNumber}.\nThey can log in with their phone number and will be prompted to add their email on first login.`);
                }
            }
        } catch (e: any) { alert(e.message || "Failed to save landlord"); console.error(e); }
    };

    const handleDeleteLandlord = async (id: string) => {
        // Prevent deletion if the landlord owns properties
        const ownedProperties = properties.filter(p => p.landlordId === id);
        if (ownedProperties.length > 0) {
            alert(`Cannot delete landlord. This landlord is currently assigned to ${ownedProperties.length} property/properties: ${ownedProperties.map(p => p.name).join(', ')}. Please reassign or delete these properties first.`);
            return;
        }

        if (!window.confirm('Are you sure you want to delete this landlord? This cannot be undone.')) return;
        try {
            // Find the landlord to get their email/phone number for deleting their user account
            const landlord = landlords.find(l => l.id === id);
            if (landlord) {
                // Find matching user record
                const matchingUser = users.find(u => 
                    u.role === 'landlord' && 
                    ((landlord.email && u.email?.toLowerCase() === landlord.email.toLowerCase()) || 
                     (landlord.phoneNumber && u.phoneNumber === landlord.phoneNumber))
                );
                if (matchingUser) {
                    await onDeleteUser(matchingUser.id);
                }
            }

            await apiService.deleteModuleRecord('pm_landlords', id);
            setLandlords(prev => prev.filter(l => l.id !== id));
            await loadData();
        } catch (e: any) { alert(e.message || 'Failed to delete landlord'); console.error(e); }
    };

    const handleResendLandlordCredentials = async (landlord: PMLandlord, preferredMethod?: 'sms' | 'email') => {
        if (!landlord.email && !landlord.phoneNumber) {
            return alert('This landlord has neither email nor phone number on record.');
        }

        let sendViaSms = false;
        let sendViaEmail = false;

        if (preferredMethod === 'sms') {
            if (!landlord.phoneNumber) return alert('This landlord has no phone number on record.');
            sendViaSms = true;
        } else if (preferredMethod === 'email') {
            if (!landlord.email) return alert('This landlord has no email on record.');
            sendViaEmail = true;
        } else {
            if (landlord.phoneNumber && landlord.email) {
                const choice = window.confirm(`Resend credentials to ${landlord.name} via SMS (${landlord.phoneNumber})?\n\nClick OK for SMS, or Cancel for Email (${landlord.email}).`);
                if (choice) sendViaSms = true;
                else sendViaEmail = true;
            } else if (landlord.phoneNumber) {
                if (!window.confirm(`Resend credentials via SMS to ${landlord.phoneNumber}?`)) return;
                sendViaSms = true;
            } else {
                if (!window.confirm(`Resend credentials via Email to ${landlord.email}?`)) return;
                sendViaEmail = true;
            }
        }
        
        try {
            const tempPassword = Math.random().toString(36).slice(-8);
            
            // 1. Find or create the user account in the database and update the password (avoids conflicts)
            await findOrCreatePortalUser(landlord.name, landlord.email, landlord.phoneNumber, 'landlord', tempPassword);
            
            // 2. Send the notification
            if (sendViaEmail && landlord.email) {
                const subject = 'Your Landlord Portal Login Credentials';
                const body = `Dear ${landlord.name},\n\nHere are your updated login credentials for the Landlord Portal.\n\nPortal: ${window.location.origin}\nEmail: ${landlord.email}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password as soon as possible.\n\nBest Regards,\nProperty Management`;
                const emailConfig = getInstitutionEmailConfig(currentInstitution, currentInstitution.emailConfig);
                await apiService.sendEmail(landlord.email, subject, body, emailConfig);
                alert(`Login credentials emailed to ${landlord.email} successfully!`);
            } else if (sendViaSms && landlord.phoneNumber) {
                const smsBody = `Hello ${landlord.name}! Your updated Landlord Portal login details:\nURL: ${window.location.origin}\nPhone: ${landlord.phoneNumber}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password.`;
                const hasCustomGateway = !!(effectiveSmsConfig?.apiKey || effectiveSmsConfig?.userId || effectiveSmsConfig?.username || effectiveSmsConfig?.accountId);
                const smsBalance = currentInstitution?.smsBalance || 0;

                if (!hasCustomGateway && smsBalance < 1) {
                    const outboxMsg = {
                        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        phoneNumber: landlord.phoneNumber,
                        message: smsBody,
                        status: 'pending',
                        institutionId,
                        createdAt: new Date().toISOString()
                    };
                    await apiService.saveToSmsOutbox([outboxMsg]);
                    alert(`Insufficient SMS units. The credentials message has been queued to your outbox.`);
                } else {
                    const res = await apiService.sendSms(
                        landlord.phoneNumber, 
                        smsBody, 
                        effectiveSmsConfig, 
                        1, 
                        institutionId || currentInstitution?.id,
                        undefined,
                        true // isSystemAlert
                    );
                    if (res && res.success === false) {
                        throw new Error(res.message || "Failed to send SMS credentials");
                    }
                    alert(`Login credentials sent via SMS to ${landlord.phoneNumber} successfully!`);
                }
            }
        } catch (e: any) { 
            alert(e.message || 'Failed to send credentials'); 
            console.error(e); 
        }
    };

    const handleSendEmailPromptSms = async (landlord: PMLandlord) => {
        if (!landlord.phoneNumber) {
            return alert("This landlord does not have a phone number on record.");
        }
        if (!window.confirm(`Send email update SMS prompt to ${landlord.name}?`)) return;
        
        try {
            const smsBody = `Hello ${landlord.name}, please log in to your Landlord Portal at ${window.location.origin} and update your email address so you can receive direct financial statements and payment receipts. Thank you.`;
            const hasCustomGateway = !!(effectiveSmsConfig?.apiKey || effectiveSmsConfig?.userId || effectiveSmsConfig?.username || effectiveSmsConfig?.accountId);
            const smsBalance = currentInstitution?.smsBalance || 0;
            
            if (!hasCustomGateway && smsBalance < 1) {
                const outboxMsg = {
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    phoneNumber: landlord.phoneNumber,
                    message: smsBody,
                    status: 'pending',
                    institutionId,
                    createdAt: new Date().toISOString()
                };
                await apiService.saveToSmsOutbox([outboxMsg]);
                alert(`Insufficient SMS units. The email prompt message has been queued to your outbox.`);
            } else {
                const res = await apiService.sendSms(landlord.phoneNumber, smsBody, effectiveSmsConfig, 1, institutionId || currentInstitution?.id, undefined, true);
                if (res && res.success === false) {
                    throw new Error(res.message || "Failed to send SMS prompt");
                }
                alert(`SMS email update prompt sent to ${landlord.name} successfully!`);
            }
        } catch (e: any) {
            alert(e.message || "Failed to send email prompt");
        }
    };

    const handleBulkPromptLandlordsForEmail = async () => {
        const pendingLandlords = landlords.filter(l => !l.email && !!l.phoneNumber);
        if (pendingLandlords.length === 0) {
            return alert("All landlords have emails configured, or missing landlords have no phone numbers.");
        }

        if (!window.confirm(`Are you sure you want to send email update SMS prompts to all ${pendingLandlords.length} landlords?`)) return;

        setLoading(true);
        let successCount = 0;
        let failCount = 0;
        try {
            const hasCustomGateway = !!(effectiveSmsConfig?.apiKey || effectiveSmsConfig?.userId || effectiveSmsConfig?.username || effectiveSmsConfig?.accountId);
            const smsBalance = currentInstitution?.smsBalance || 0;
            const totalUnitsNeeded = pendingLandlords.length;

            if (!hasCustomGateway && smsBalance < totalUnitsNeeded) {
                const outboxMessages = pendingLandlords.map((landlord, idx) => {
                    const smsBody = `Hello ${landlord.name}, please log in to your Landlord Portal at ${window.location.origin} and update your email address so you can receive direct financial statements and payment receipts. Thank you.`;
                    return {
                        id: `msg_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
                        phoneNumber: landlord.phoneNumber!,
                        message: smsBody,
                        status: 'pending',
                        institutionId,
                        createdAt: new Date().toISOString()
                    };
                });
                await apiService.saveToSmsOutbox(outboxMessages);
                alert(`Insufficient SMS units (${smsBalance} units available, ${totalUnitsNeeded} required). The ${outboxMessages.length} prompt message(s) have been successfully queued to your outbox.`);
                loadData();
                return;
            }

            for (const landlord of pendingLandlords) {
                try {
                    const smsBody = `Hello ${landlord.name}, please log in to your Landlord Portal at ${window.location.origin} and update your email address so you can receive direct financial statements and payment receipts. Thank you.`;
                    const res = await apiService.sendSms(landlord.phoneNumber!, smsBody, effectiveSmsConfig, 1, institutionId || currentInstitution?.id, undefined, true);
                    if (res && res.success === false) {
                        throw new Error(res.message || "Failed to send SMS");
                    }
                    successCount++;
                } catch (err) {
                    console.error(`Failed to send email prompt to ${landlord.name}:`, err);
                    failCount++;
                }
            }
            alert(`Bulk Prompt Complete!\n\nSuccessfully sent: ${successCount}\nFailed: ${failCount}`);
            loadData();
        } catch (e: any) {
            alert(e.message || "Failed to process bulk email prompts");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSendLandlordCredentials = async (method: 'email' | 'sms') => {
        // Filter landlords that have email or phone depending on the method
        const targetLandlords = landlords.filter(l => 
            method === 'email' ? !!l.email : !!l.phoneNumber
        );
        
        if (targetLandlords.length === 0) {
            return alert(`No landlords have a valid ${method === 'email' ? 'email address' : 'phone number'} to send credentials to.`);
        }
        
        if (!window.confirm(`Are you sure you want to resend login credentials to all ${targetLandlords.length} landlords via ${method === 'email' ? 'Email' : 'SMS'}?`)) return;
        
        // Confirm SMS units balance first for SMS dispatch
        if (method === 'sms') {
            const hasCustomGateway = !!(effectiveSmsConfig?.apiKey || effectiveSmsConfig?.userId || effectiveSmsConfig?.username || effectiveSmsConfig?.accountId);
            const smsBalance = currentInstitution?.smsBalance || 0;
            const totalUnitsNeeded = targetLandlords.length; // 1 unit per landlord credentials message
            
            if (!hasCustomGateway && smsBalance < totalUnitsNeeded) {
                setLoading(true);
                try {
                    const outboxMessages = [];
                    for (let idx = 0; idx < targetLandlords.length; idx++) {
                        const landlord = targetLandlords[idx];
                        const tempPassword = Math.random().toString(36).slice(-8);
                        
                        // Find or create portal user account globally (avoids conflicts)
                        await findOrCreatePortalUser(landlord.name, landlord.email, landlord.phoneNumber, 'landlord', tempPassword);

                        const smsBody = `Hello ${landlord.name}! Your Landlord Portal login details:\nURL: ${window.location.origin}\nPhone: ${landlord.phoneNumber}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password.`;
                        
                        outboxMessages.push({
                            id: `msg_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
                            phoneNumber: landlord.phoneNumber!,
                            message: smsBody,
                            status: 'pending',
                            institutionId,
                            createdAt: new Date().toISOString()
                        });
                    }

                    await apiService.saveToSmsOutbox(outboxMessages);
                    alert(`Insufficient SMS units (${smsBalance} units available, ${totalUnitsNeeded} required). The ${outboxMessages.length} landlord credential message(s) have been successfully queued to your outbox.`);
                    loadData();
                } catch (err: any) {
                    alert(err.message || "Failed to process outbox credentials");
                } finally {
                    setLoading(false);
                }
                return;
            }
        }

        setLoading(true);
        let successCount = 0;
        let failCount = 0;
        
        try {
            for (const landlord of targetLandlords) {
                try {
                    const tempPassword = Math.random().toString(36).slice(-8);
                    
                    // 1. Find or create portal user account globally (avoids conflicts)
                    await findOrCreatePortalUser(landlord.name, landlord.email, landlord.phoneNumber, 'landlord', tempPassword);
                    
                    // 2. Send notification
                    if (method === 'email' && landlord.email) {
                        const subject = 'Your Landlord Portal Login Credentials';
                        const body = `Dear ${landlord.name},\n\nHere are your login credentials for the Landlord Portal.\n\nPortal: ${window.location.origin}\nEmail: ${landlord.email}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password as soon as possible.\n\nBest Regards,\nProperty Management`;
                        const emailConfig = getInstitutionEmailConfig(currentInstitution, currentInstitution.emailConfig);
                        await apiService.sendEmail(landlord.email, subject, body, emailConfig);
                    } else if (method === 'sms' && landlord.phoneNumber) {
                        const smsBody = `Hello ${landlord.name}! Your Landlord Portal login details:\nURL: ${window.location.origin}\nPhone: ${landlord.phoneNumber}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password.`;
                        const res = await apiService.sendSms(landlord.phoneNumber, smsBody, effectiveSmsConfig, 1, institutionId || currentInstitution?.id, undefined, true);
                        if (res && res.success === false) {
                            throw new Error(res.message || "Failed to send SMS credentials");
                        }
                    }
                    successCount++;
                } catch (err) {
                    console.error(`Failed to send bulk credentials to ${landlord.name}:`, err);
                    failCount++;
                }
            }
            alert(`Bulk Send Complete!\n\nSuccessfully sent: ${successCount}\nFailed: ${failCount}`);
            loadData();
        } catch (e: any) {
            alert(e.message || "Failed to process bulk credentials");
        } finally {
            setLoading(false);
        }
    };

    const handlePmSendBulkCredentials = async (targetUsers: User[], method: 'email' | 'sms'): Promise<{ success_count: number; fail_count: number }> => {
        if (props.onSendBulkCredentials) {
            try {
                const res = await props.onSendBulkCredentials(targetUsers, method);
                if (res && (res.success_count > 0 || res.fail_count > 0)) {
                    return res;
                }
            } catch (err) {
                console.warn("[PM] Parent onSendBulkCredentials threw, falling back to local handler:", err);
            }
        }

        let success_count = 0;
        let fail_count = 0;

        for (const user of targetUsers) {
            try {
                const tempPassword = user.password || Math.random().toString(36).slice(-8);
                const phone = user.phoneNumber || (user as any).phone;
                const email = user.email;

                // 1. Update user password in DB so login works immediately
                if (user.id) {
                    try {
                        await apiService.updateModuleRecord('users', user.id, {
                            password: tempPassword,
                            mustChangePassword: true
                        });
                    } catch (pwErr) {
                        console.warn("[PM] Could not update user temp password in DB:", pwErr);
                    }
                }

                if (method === 'email') {
                    if (!email) {
                        fail_count++;
                        continue;
                    }
                    const subject = `Your ${currentInstitution.name || 'Property Management'} Login Credentials`;
                    const body = `Dear ${user.name},\n\nHere are your login credentials for the Property Management Portal.\n\nPortal: ${window.location.origin}\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password.\n\nBest Regards,\nProperty Management`;
                    const emailConfig = getInstitutionEmailConfig(currentInstitution, currentInstitution.emailConfig);
                    const res = await apiService.sendEmail(email, subject, body, emailConfig);
                    if (res?.success) success_count++;
                    else fail_count++;
                } else if (method === 'sms') {
                    if (!phone) {
                        fail_count++;
                        continue;
                    }
                    const smsBody = `Hello ${user.name}! Your ${currentInstitution.name || 'PM'} Portal login:\nURL: ${window.location.origin}\nPhone: ${phone}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password.`;
                    
                    const res = await apiService.sendSms(
                        phone, 
                        smsBody, 
                        effectiveSmsConfig, 
                        1, 
                        institutionId || currentInstitution?.id, 
                        undefined, 
                        true // isSystemAlert
                    );

                    if (res && res.success !== false) {
                        success_count++;
                    } else {
                        console.error(`[PM] SMS send failed for ${phone}:`, res?.message);
                        fail_count++;
                    }
                }
            } catch (err) {
                console.error(`[PM] Error sending credentials to ${user.name}:`, err);
                fail_count++;
            }
        }

        return { success_count, fail_count };
    };

    const handleSaveProperty = async (data: Partial<PMProperty>) => {
        try {
            const propertyData: PMProperty = {
                id: editingProperty?.id || `prop_${Date.now()}`,
                name: data.name || '',
                address: data.address,
                town: data.town,
                propertyType: data.propertyType || 'Apartment',
                totalUnits: editingProperty?.totalUnits || 0,
                landlordId: (data.landlordId && data.landlordId !== '') ? data.landlordId : undefined,
                commissionRate: data.commissionRate || 0,
                institutionId,
                createdAt: editingProperty?.createdAt || new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_properties', propertyData);
            setShowPropertyModal(false);
            setEditingProperty(null);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to save property"); console.error(e); }
    };

    const handleDeleteProperty = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this property? All associated units and leases may be affected.")) return;
        try {
            await apiService.deleteModuleRecord('pm_properties', id);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to delete property"); console.error(e); }
    };

    const handleSaveExpense = async (data: Partial<PMExpenseVoucher>) => {
        try {
            const voucherData: PMExpenseVoucher = {
                id: `exp_${Date.now()}`,
                voucherNumber: data.voucherNumber || `PV-${String(expenses.length + 1).padStart(4, '0')}`,
                propertyId: data.propertyId || '',
                unitId: data.unitId || undefined,
                category: data.category || 'Other',
                payeeName: data.payeeName || '',
                payeePhone: data.payeePhone || undefined,
                amount: data.amount || 0,
                paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
                paymentMethod: data.paymentMethod || 'Cash',
                reference: data.reference || undefined,
                description: data.description || '',
                status: data.status || 'Pending Approval',
                approvedBy: data.approvedBy || undefined,
                receiptUrl: data.receiptUrl || undefined,
                institutionId,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_expenses', voucherData);
            setShowExpenseModal(false);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to save expense voucher"); console.error(e); }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete/cancel this expense voucher?")) return;
        try {
            await apiService.deleteModuleRecord('pm_expenses', id);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to delete expense voucher"); console.error(e); }
    };

    const handleApproveExpense = async (voucher: PMExpenseVoucher) => {
        try {
            const updated = {
                ...voucher,
                status: 'Approved' as PMExpenseStatus,
                approvedBy: currentUser?.name || 'Admin'
            };
            await apiService.saveModuleRecord('pm_expenses', updated);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to approve expense voucher"); console.error(e); }
    };

    const handlePayExpense = async (voucher: PMExpenseVoucher) => {
        try {
            const updated = {
                ...voucher,
                status: 'Paid' as PMExpenseStatus
            };
            await apiService.saveModuleRecord('pm_expenses', updated);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to mark expense voucher as Paid"); console.error(e); }
    };

    const handleSaveUnit = async (data: Partial<PMUnit>) => {
        try {
            const unitData: PMUnit = {
                id: editingUnit?.id || `unit_${Date.now()}`,
                propertyId: data.propertyId || '',
                unitNumber: data.unitNumber || '',
                unitType: data.unitType || '',
                floorNumber: data.floorNumber,
                rentAmount: data.rentAmount || 0,
                status: editingUnit?.status || 'Vacant',
                institutionId,
                createdAt: editingUnit?.createdAt || new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_units', unitData);

            setShowUnitModal(false);
            setEditingUnit(null);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to save unit"); console.error(e); }
    };

    const handleDeleteUnit = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this unit?")) return;
        try {
            await apiService.deleteModuleRecord('pm_units', id);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to delete unit"); console.error(e); }
    };

    const handleSaveTenant = async (data: Partial<PMTenant>) => {
        try {
            const tenantId = editingTenant?.id || `tenant_${Date.now()}`;
            const tempPassword = Math.random().toString(36).slice(-8);

            // 1. Create or update system user account for the tenant (only for new tenants)
            if (!editingTenant && (data.email || data.phoneNumber)) {
                await findOrCreatePortalUser(data.name || '', data.email, data.phoneNumber, 'tenant', tempPassword);

                // 2. Send tenant welcome notification
                if (data.email) {
                    try {
                        const subject = 'Welcome to your Tenant Portal';
                        const body = `Welcome, ${data.name}!\n\nYou have been registered as a Tenant in our property management system.\nYou can now log in to view your lease agreement, track your rent payments, and raise maintenance requests.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nEmail: ${data.email}\nPassword: ${tempPassword}\n\nPlease change your password upon first login.\n\nBest Regards,\nSystem Admin`;
                        await apiService.sendEmail(data.email, subject, body, getInstitutionEmailConfig(currentInstitution, currentInstitution.emailConfig));
                    } catch (emailErr) {
                        console.error("Failed to send tenant welcome email:", emailErr);
                    }
                } else if (data.phoneNumber) {
                    try {
                        const smsBody = `Welcome ${data.name}! Your Tenant Portal access:\nURL: ${window.location.origin}\nPhone: ${data.phoneNumber}\nPIN: ${tempPassword}\nLogin with your phone number & PIN.`;
                        await apiService.sendSms(data.phoneNumber, smsBody, effectiveSmsConfig, 1, institutionId || currentInstitution?.id, undefined, true);
                    } catch (smsErr) {
                        console.error("Failed to send tenant welcome SMS:", smsErr);
                    }
                }
            }

            const newTenant: PMTenant = {
                id: tenantId,
                name: data.name || '',
                phoneNumber: data.phoneNumber || '',
                email: data.email,
                idNumber: data.idNumber,
                emergencyContactName: data.emergencyContactName || (editingTenant?.emergencyContactName),
                emergencyContactPhone: data.emergencyContactPhone || (editingTenant?.emergencyContactPhone),
                institutionId,
                createdAt: editingTenant?.createdAt || new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_tenants', newTenant);

            setShowTenantModal(false);
            setEditingTenant(null);
            loadData();

            if (!editingTenant && data.email) {
                alert(`Tenant saved! Login credentials have been emailed to ${data.email}`);
            } else if (!editingTenant && data.phoneNumber) {
                alert(`Tenant saved! Login credentials sent via SMS to ${data.phoneNumber}`);
            } else {
                alert("Tenant saved successfully!");
            }
        } catch (e: any) { alert(e.message || "Failed to save tenant"); console.error(e); }
    };

    const handleResendTenantCredentials = async (tenant: PMTenant) => {
        if (!tenant.email && !tenant.phoneNumber) {
            return alert('This tenant has neither email nor phone number on record.');
        }

        let sendViaSms = false;
        let sendViaEmail = false;

        if (tenant.phoneNumber && tenant.email) {
            const choice = window.confirm(`Resend credentials to ${tenant.name} via SMS (${tenant.phoneNumber})?\n\nClick OK for SMS, or Cancel for Email (${tenant.email}).`);
            if (choice) sendViaSms = true;
            else sendViaEmail = true;
        } else if (tenant.phoneNumber) {
            if (!window.confirm(`Resend credentials via SMS to ${tenant.phoneNumber}?`)) return;
            sendViaSms = true;
        } else {
            if (!window.confirm(`Resend credentials via Email to ${tenant.email}?`)) return;
            sendViaEmail = true;
        }

        try {
            const tempPassword = Math.random().toString(36).slice(-8);
            await findOrCreatePortalUser(tenant.name, tenant.email, tenant.phoneNumber, 'tenant', tempPassword);

            if (sendViaEmail && tenant.email) {
                const subject = 'Your Tenant Portal Login Credentials';
                const body = `Dear ${tenant.name},\n\nHere are your updated login credentials for the Tenant Portal.\n\nPortal: ${window.location.origin}\nEmail: ${tenant.email}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password.\n\nBest Regards,\nProperty Management`;
                const emailConfig = getInstitutionEmailConfig(currentInstitution, currentInstitution.emailConfig);
                await apiService.sendEmail(tenant.email, subject, body, emailConfig);
                alert(`Login credentials emailed to ${tenant.email} successfully!`);
            } else if (sendViaSms && tenant.phoneNumber) {
                const smsBody = `Hello ${tenant.name}! Your updated Tenant Portal login details:\nURL: ${window.location.origin}\nPhone: ${tenant.phoneNumber}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password.`;
                const res = await apiService.sendSms(tenant.phoneNumber, smsBody, effectiveSmsConfig, 1, institutionId || currentInstitution?.id, undefined, true);
                if (res && res.success === false) {
                    throw new Error(res.message || "Failed to send SMS credentials");
                }
                alert(`Login credentials sent via SMS to ${tenant.phoneNumber} successfully!`);
            }
        } catch (e: any) {
            alert(e.message || 'Failed to send credentials');
            console.error(e);
        }
    };

    const handleDeleteTenant = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this tenant? All associated lease records might be affected.")) return;
        try {
            await apiService.deleteModuleRecord('pm_tenants', id);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to delete tenant"); console.error(e); }
    };

    const handleSaveInspection = async (data: Partial<PMInspection>) => {
        try {
            const inspectionId = data.id || `insp_${Date.now()}`;
            const inspectionData: PMInspection = {
                id: inspectionId,
                leaseId: data.leaseId || '',
                tenantId: data.tenantId || '',
                inspectionDate: data.inspectionDate || new Date().toISOString(),
                inspectedBy: data.inspectedBy || currentUser?.name || 'Inspector',
                status: data.status || 'Draft',
                structuralCondition: data.structuralCondition,
                structuralComments: data.structuralComments,
                cleaningCondition: data.cleaningCondition,
                cleaningComments: data.cleaningComments,
                fittingsCondition: data.fittingsCondition,
                fittingsComments: data.fittingsComments,
                repairsRequired: data.repairsRequired,
                estimatedRepairCost: data.estimatedRepairCost || 0,
                tenantSignoff: data.tenantSignoff || false,
                institutionId,
                createdAt: data.createdAt || new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_inspections', inspectionData);
            setShowInspectionModal(false);
            setEditingInspection(null);
            loadData();
            alert("Inspection report saved successfully!");
        } catch (e: any) { alert(e.message || "Failed to save inspection"); console.error(e); }
    };

    const handleDeleteInspection = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this inspection record?")) return;
        try {
            await apiService.deleteModuleRecord('pm_inspections', id);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to delete inspection"); console.error(e); }
    };

    const handleSaveRefund = async (data: Partial<PMDepositRefund>) => {
        try {
            const refundId = data.id || `ref_${Date.now()}`;
            const refundData: PMDepositRefund = {
                id: refundId,
                leaseId: data.leaseId || '',
                tenantId: data.tenantId || '',
                statementDate: data.statementDate || new Date().toISOString().split('T')[0],
                originalDeposit: data.originalDeposit || 0,
                rentArrearsDeduction: data.rentArrearsDeduction || 0,
                utilityArrearsDeduction: data.utilityArrearsDeduction || 0,
                damageRepairDeduction: data.damageRepairDeduction || 0,
                otherDeductions: data.otherDeductions || 0,
                otherDeductionsComments: data.otherDeductionsComments,
                refundAmount: data.refundAmount || 0,
                paymentMethod: data.paymentMethod,
                paymentReference: data.paymentReference,
                status: data.status || 'Pending Approval',
                institutionId,
                createdAt: data.createdAt || new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_deposit_refunds', refundData);
            setShowRefundModal(false);
            setEditingRefund(null);
            loadData();
            alert("Deposit refund statement saved successfully!");
        } catch (e: any) { alert(e.message || "Failed to save deposit refund"); console.error(e); }
    };

    const handleDeleteRefund = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this deposit refund statement?")) return;
        try {
            await apiService.deleteModuleRecord('pm_deposit_refunds', id);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to delete deposit refund"); console.error(e); }
    };

    const handleSaveLease = async (data: Partial<PMLease>) => {
        try {
            const startDate = new Date().toISOString().split('T')[0];
            const leasePrefix = pmSettings?.numbering?.leasePrefix || 'LSE';
            const leaseNextNum = pmSettings?.numbering?.leaseNextNumber || 1000;
            const leaseNumber = `${leasePrefix}-${leaseNextNum}`;

            const newLease: PMLease = {
                id: `lease_${Date.now()}`,
                unitId: data.unitId || '',
                tenantId: data.tenantId || '',
                startDate,
                rentAmount: data.rentAmount || 0,
                depositAmount: data.depositAmount || 0,
                billingCycle: 'Monthly',
                status: 'Active',
                termsAndConditions: data.termsAndConditions,
                witnessName: data.witnessName,
                witnessPhone: data.witnessPhone,
                noticePeriodDays: data.noticePeriodDays,
                lateFeePercentage: data.lateFeePercentage,
                tenantSignatureUrl: data.tenantSignatureUrl,
                landlordSignatureUrl: data.landlordSignatureUrl,
                leaseNumber,
                institutionId,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_leases', newLease);

            if (pmSettings) {
                const updatedSettings = {
                    ...pmSettings,
                    numbering: {
                        ...(pmSettings.numbering || {}),
                        leaseNextNumber: leaseNextNum + 1
                    }
                };
                await apiService.saveModuleRecord('pm_settings', updatedSettings);
                setPmSettings(updatedSettings);
            }

            // Update unit status to Occupied
            const unit = units.find(u => u.id === data.unitId);
            if (unit) {
                await apiService.saveModuleRecord('pm_units', { ...unit, status: 'Occupied' });
            }

            setShowLeaseModal(false);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to save lease"); console.error(e); }
    };

    const LandlordsTab = () => {
        const filtered = landlords.filter(l =>
            !landlordSearch ||
            l.name.toUpperCase().includes(landlordSearch.toUpperCase()) ||
            (l.phoneNumber || '').includes(landlordSearch) ||
            (l.email || '').toUpperCase().includes(landlordSearch.toUpperCase())
        );
        const totalLandlordPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        const paged = filtered.slice((landlordPage - 1) * PAGE_SIZE, landlordPage * PAGE_SIZE);
        
        const landlordsWithEmail = landlords.filter(l => !!l.email);
        const landlordsWithoutEmail = landlords.filter(l => !l.email);
        const emailUpdateProgress = landlords.length > 0 ? Math.round((landlordsWithEmail.length / landlords.length) * 100) : 0;

        return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 mt-4">
            {/* Email Update Tracking Progress */}
            <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] border border-slate-850 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 w-full md:w-2/3">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Landlord Profile Integration</h4>
                    <h3 className="text-xl font-black italic tracking-wide uppercase">Email Update Progress</h3>
                    <p className="text-slate-300 text-[10px] uppercase font-bold tracking-wider leading-relaxed">
                        Landlords must configure their email address to receive monthly statements, commission payouts, and payment receipt logs directly.
                    </p>
                    <div className="flex items-center gap-4 mt-4">
                        <div className="flex-1 bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700">
                            <div 
                                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-1000" 
                                style={{ width: `${emailUpdateProgress}%` }}
                            />
                        </div>
                        <span className="text-xs font-black italic text-purple-400">{emailUpdateProgress}%</span>
                    </div>
                    <div className="flex gap-4 mt-2">
                        <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">● {landlordsWithEmail.length} Configured</span>
                        <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider">● {landlordsWithoutEmail.length} Pending</span>
                    </div>
                </div>

                {landlordsWithoutEmail.length > 0 && (
                    <div className="w-full md:w-auto">
                        <button
                            onClick={handleBulkPromptLandlordsForEmail}
                            className="w-full md:w-auto px-5 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-750 hover:to-indigo-750 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                            Prompt All Pending ({landlordsWithoutEmail.length}) via SMS
                        </button>
                    </div>
                )}
            </div>
            {/* Header + Search */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Landlord Directory</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">{filtered.length} of {landlords.length} landlords</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {landlords.length > 0 && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleBulkSendLandlordCredentials('email')}
                                className="px-3.5 py-3 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm flex items-center gap-1.5"
                                title="Resend credentials to all landlords with email addresses"
                            >
                                Bulk Email Credentials
                            </button>
                            <button
                                onClick={() => handleBulkSendLandlordCredentials('sms')}
                                className="px-3.5 py-3 bg-purple-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-purple-750 transition-all shadow-sm flex items-center gap-1.5"
                                title="Resend credentials to all landlords with phone numbers"
                            >
                                Bulk SMS Credentials
                            </button>
                        </div>
                    )}
                    <div className="relative group w-full md:w-80">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="SEARCH LANDLORDS..."
                            value={landlordSearch}
                            onChange={e => { setLandlordSearch(e.target.value); setLandlordPage(1); }}
                            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-purple-500 transition-all text-slate-900 dark:text-white shadow-sm hover:shadow-md"
                        />
                    </div>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden mb-12">
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Landlord Name</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Contact Info</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Properties Owned</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paged.map(landlord => {
                                const ownedProperties = properties.filter(p => p.landlordId === landlord.id);
                                return (
                                    <tr key={landlord.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors group">
                                        <td className="p-6 font-black text-slate-900 dark:text-white uppercase italic text-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-600/10 rounded-xl text-purple-600">
                                                    <UserPlusIcon className="w-5 h-5" />
                                                </div>
                                                {landlord.name}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight flex items-center gap-2">
                                                <CreditCardIcon className="w-3 h-3 text-slate-400" /> {landlord.phoneNumber}
                                            </div>
                                            {landlord.email && (
                                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight flex items-center gap-2">
                                                    <UserIcon className="w-3 h-3 text-slate-400" /> {landlord.email}
                                                </div>
                                            )}
                                            {landlord.preferredPaymentMethod && (
                                                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-tight flex items-center gap-2">
                                                    <BanknotesIcon className="w-3 h-3 text-emerald-500" /> Method: {landlord.preferredPaymentMethod}
                                                </div>
                                            )}
                                            {landlord.email ? (
                                                <div className="mt-2">
                                                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[8px] font-black uppercase tracking-wider">Email Configured</span>
                                                </div>
                                            ) : (
                                                <div className="mt-2">
                                                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full text-[8px] font-black uppercase tracking-wider animate-pulse">Email Pending</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-6">
                                            <div className="text-xs font-black text-purple-600">{ownedProperties.length} Properties</div>
                                            <div className="mt-2 space-y-1">
                                                {ownedProperties.slice(0, 2).map(p => (
                                                    <div key={p.id} className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[15rem]">
                                                        • {p.name} <span className="text-purple-400">({p.commissionRate}%)</span>
                                                    </div>
                                                ))}
                                                {ownedProperties.length > 2 && (
                                                    <div className="text-[9px] font-bold text-slate-400 italic">...and {ownedProperties.length - 2} more</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6 text-right space-x-2 whitespace-nowrap">
                                            <button className="p-2.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-xl transition-all" title="View Landlord">
                                                <EyeIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setEditingLandlord(landlord); setShowLandlordModal(true); }}
                                                className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all"
                                                title="Edit Landlord"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleResendLandlordCredentials(landlord)}
                                                className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-all"
                                                title="Resend Login Credentials"
                                            >
                                                <PaperAirplaneIcon className="w-4 h-4" />
                                            </button>
                                            {!landlord.email && landlord.phoneNumber && (
                                                <button
                                                    onClick={() => handleSendEmailPromptSms(landlord)}
                                                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-all animate-pulse"
                                                    title="Send SMS Prompt to update Email"
                                                >
                                                    <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteLandlord(landlord.id)}
                                                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                                                title="Delete Landlord"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr><td colSpan={4} className="p-12 text-center text-slate-400 text-xs font-black uppercase tracking-[0.2em] italic">No Landlords Found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-700/50">
                    {paged.map(landlord => {
                        const ownedProperties = properties.filter(p => p.landlordId === landlord.id);
                        return (
                            <div key={landlord.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-500/20 text-white">
                                            <UserPlusIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{landlord.name}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{landlord.phoneNumber}</p>
                                            {landlord.email ? (
                                                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{landlord.email}</p>
                                            ) : (
                                                <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 mt-1 uppercase tracking-tight animate-pulse">Email Pending</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500"><EyeIcon className="w-4 h-4" /></button>
                                        <button
                                            onClick={() => { setEditingLandlord(landlord); setShowLandlordModal(true); }}
                                            className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600"
                                            title="Edit Landlord"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleResendLandlordCredentials(landlord)}
                                            className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600"
                                            title="Resend Login Credentials"
                                        >
                                            <PaperAirplaneIcon className="w-4 h-4" />
                                        </button>
                                        {!landlord.email && landlord.phoneNumber && (
                                            <button
                                                onClick={() => handleSendEmailPromptSms(landlord)}
                                                className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 animate-pulse"
                                                title="Send SMS Prompt to update Email"
                                            >
                                                <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteLandlord(landlord.id)}
                                            className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-600"
                                            title="Delete Landlord"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ownership Block</p>
                                        <span className="bg-purple-100 text-purple-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">{ownedProperties.length} Assets</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {ownedProperties.slice(0, 3).map(p => (
                                            <div key={p.id} className="text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase truncate">
                                                • {p.name} <span className="text-purple-600/70 italic">({p.commissionRate}% Com.)</span>
                                            </div>
                                        ))}
                                        {ownedProperties.length > 3 && <p className="text-[8px] text-slate-400 font-bold italic ml-2">+ {ownedProperties.length - 3} more properties</p>}
                                    </div>
                                </div>
                                {landlord.email && (
                                    <div className="mt-4 text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <UserIcon className="w-3 h-3 text-slate-400" /> {landlord.email}
                                    </div>
                                )}
                                {landlord.preferredPaymentMethod && (
                                    <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-2">
                                        <BanknotesIcon className="w-3 h-3 text-emerald-500" /> Method: {landlord.preferredPaymentMethod}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div className="p-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] italic">No Landlords Found</div>
                    )}
                </div>

                {/* Pagination Footer */}
                {totalLandlordPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between gap-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Showing {((landlordPage - 1) * PAGE_SIZE) + 1}–{Math.min(landlordPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setLandlordPage(p => Math.max(1, p - 1))} disabled={landlordPage === 1} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
                            {Array.from({ length: totalLandlordPages }, (_, i) => i + 1).map(pg => (
                                <button key={pg} onClick={() => setLandlordPage(pg)} className={`w-8 h-8 rounded-xl text-[10px] font-black transition-colors ${pg === landlordPage ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{pg}</button>
                            ))}
                            <button onClick={() => setLandlordPage(p => Math.min(totalLandlordPages, p + 1))} disabled={landlordPage === totalLandlordPages} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        );
    };

    const PropertiesTab = () => (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Sub-navigation bar */}
            {/* Sub-navigation bar - Scrollable */}
            <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl w-full overflow-x-auto scrollbar-hide border border-slate-200 dark:border-slate-700/50 shadow-inner no-scrollbar">
                <div className="flex gap-1.5 min-w-max">
                    {[
                        { id: 'properties', label: 'Master Assets', icon: BuildingOfficeIcon },
                        { id: 'units', label: 'Unit Registry', icon: GridIcon },
                        { id: 'landlords', label: 'Landlord Directory', icon: UserGroupIcon },
                        { id: 'tenants', label: 'Tenant Directory', icon: UserIcon },
                        { id: 'leases', label: 'Lease Registry', icon: ArchiveBoxIcon },
                        { id: 'payments', label: 'Payments', icon: CurrencyIcon },
                        { id: 'maintenance', label: 'Maintenance', icon: Cog8ToothIcon },
                        { id: 'invoices', label: 'Invoices', icon: DocumentTextIcon },
                        { id: 'notices', label: 'Notice Letters', icon: DocumentTextIcon },
                        { id: 'utilities', label: 'Utility Billing', icon: SparklesIcon },
                        { id: 'broadcasts', label: 'SMS Broadcasts', icon: PaperAirplaneIcon },
                    ].map(sub => (
                        <button
                            key={sub.id}
                            onClick={() => setPropertyActiveSubTab(sub.id as any)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${propertyActiveSubTab === sub.id
                                ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200 dark:border-slate-700'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            <sub.icon className="w-3.5 h-3.5" />
                            {sub.label}
                        </button>
                    ))}
                </div>
            </div>

            {propertyActiveSubTab === 'properties' && (() => {
                const totalPages = Math.max(1, Math.ceil(properties.length / PROPERTY_PAGE_SIZE));
                const pagedProperties = properties.slice((propertyPage - 1) * PROPERTY_PAGE_SIZE, propertyPage * PROPERTY_PAGE_SIZE);
                return (
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden mb-12">
                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Property Name</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Type</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Address</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Units</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Landlord</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedProperties.map(property => {
                                        const vacantCount = units.filter(u => u.propertyId === property.id && u.status === 'Vacant').length;
                                        const landlord = property.landlordId ? landlords.find(l => l.id === property.landlordId) : null;
                                        return (
                                            <tr key={property.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors group">
                                                <td className="p-6 font-black text-slate-900 dark:text-white uppercase italic text-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-600/10 rounded-xl text-blue-600">
                                                            <BuildingOfficeIcon className="w-5 h-5" />
                                                        </div>
                                                        {property.name}
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{property.propertyType}</span>
                                                </td>
                                                <td className="p-6 text-xs font-bold text-slate-500 uppercase tracking-tight">
                                                    <div className="flex items-center gap-2">
                                                        <MapPinIcon className="w-3 h-3 text-slate-400" /> {property.address || 'No Address'}
                                                    </div>
                                                    {property.town && (
                                                        <div className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">
                                                            {property.town}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-6">
                                                    <div className="text-xs font-black text-slate-900 dark:text-white">{property.totalUnits || 0} Total</div>
                                                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">{vacantCount} Vacant</div>
                                                </td>
                                                <td className="p-6">
                                                    {landlord ? (
                                                        <div>
                                                            <div className="text-xs font-black text-purple-600 truncate max-w-[10rem]">{landlord.name}</div>
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{property.commissionRate}% rate</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic font-bold">Standalone</span>
                                                    )}
                                                </td>
                                                <td className="p-6 text-right space-x-1 whitespace-nowrap">
                                                    <button onClick={() => { setEditingProperty(property); setEditingPropertyTown(property.town || ''); setShowPropertyModal(true); }} className="p-2.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-xl transition-all"><PencilIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDeleteProperty(property.id)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"><TrashIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => { setEditingUnit(null); setShowUnitModal(true); }} className="p-2.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all"><PlusIcon className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {properties.length === 0 && (
                                        <tr><td colSpan={6} className="p-12 text-center text-slate-400 text-xs font-black uppercase tracking-[0.2em] italic">No Master Assets Found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-700/50">
                            {pagedProperties.map(property => {
                                const vacantCount = units.filter(u => u.propertyId === property.id && u.status === 'Vacant').length;
                                return (
                                    <div key={property.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
                                                    <BuildingOfficeIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{property.name}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{property.propertyType}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setEditingProperty(property); setEditingPropertyTown(property.town || ''); setShowPropertyModal(true); }} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteProperty(property.id)} className="p-2.5 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-6">
                                            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Capacity</p>
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{property.totalUnits || 0} Units</p>
                                                <p className="text-[9px] font-bold text-blue-600 mt-0.5">{vacantCount} Vacant</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Commission</p>
                                                <p className="text-xs font-black text-purple-600 uppercase">{property.commissionRate}% Rate</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                                            <MapPinIcon className="w-3 h-3 text-slate-400" /> {property.address || 'No Address Provided'}
                                            {property.town && (
                                                <span className="ml-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">
                                                    {property.town}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {properties.length === 0 && (
                                <div className="p-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] italic">No Master Assets Found</div>
                            )}
                        </div>

                        {/* Pagination Footer */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between gap-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Showing {((propertyPage - 1) * PROPERTY_PAGE_SIZE) + 1}–{Math.min(propertyPage * PROPERTY_PAGE_SIZE, properties.length)} of {properties.length} properties
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPropertyPage(p => Math.max(1, p - 1))}
                                        disabled={propertyPage === 1}
                                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        ← Prev
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                                        <button
                                            key={pg}
                                            onClick={() => setPropertyPage(pg)}
                                            className={`w-8 h-8 rounded-xl text-[10px] font-black transition-colors ${
                                                pg === propertyPage
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                    : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {pg}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPropertyPage(p => Math.min(totalPages, p + 1))}
                                        disabled={propertyPage === totalPages}
                                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {propertyActiveSubTab === 'units' && (() => {
                const filteredUnits = units.filter(u => !unitSearch || u.unitNumber.toUpperCase().includes(unitSearch.toUpperCase()) || (properties.find(p => p.id === u.propertyId)?.name || '').toUpperCase().includes(unitSearch.toUpperCase()));
                const totalUnitPages = Math.max(1, Math.ceil(filteredUnits.length / PAGE_SIZE));
                const pagedUnits = filteredUnits.slice((unitPage - 1) * PAGE_SIZE, unitPage * PAGE_SIZE);
                return (
                <div className="mt-4">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Master Unit Registry</h3>
                        <div className="relative group w-full md:w-80">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="SEARCH BY UNIT / PROPERTY..."
                                value={unitSearch}
                                onChange={e => { setUnitSearch(e.target.value); setUnitPage(1); }}
                                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white shadow-sm hover:shadow-md"
                            />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                        {/* Desktop Table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Unit Details</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Property</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Type / Floor</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Rent (KES)</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Status</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedUnits.map(unit => (
                                        <tr key={unit.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors group">
                                            <td className="p-6 text-sm font-black italic text-slate-900 dark:text-white">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-600"><GridIcon className="w-5 h-5" /></div>
                                                    {unit.unitNumber}
                                                </div>
                                            </td>
                                            <td className="p-6 text-sm font-bold text-slate-600 dark:text-slate-400">{properties.find(p => p.id === unit.propertyId)?.name || 'N/A'}</td>
                                            <td className="p-6">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{unit.unitType}</span>
                                                <p className="text-xs font-bold text-slate-500 italic mt-1">Floor {unit.floorNumber || 'G'}</p>
                                            </td>
                                            <td className="p-6 text-lg font-black text-slate-900 dark:text-white italic">{unit.rentAmount?.toLocaleString()}</td>
                                            <td className="p-6">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic ${unit.status === 'Vacant' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : unit.status === 'Occupied' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'}`}>{unit.status}</span>
                                            </td>
                                            <td className="p-6 text-right space-x-2">
                                                <button onClick={() => { setEditingUnit(unit); setShowUnitModal(true); }} className="p-2.5 text-slate-400 hover:text-orange-600 rounded-xl transition-colors"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteUnit(unit.id)} className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUnits.length === 0 && (
                                        <tr><td colSpan={6} className="p-12 text-center text-slate-400 text-xs font-black uppercase tracking-[0.2em] italic">No Units Found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-700/50">
                            {pagedUnits.map(unit => (
                                <div key={unit.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-slate-100 dark:bg-slate-900 shadow-sm text-slate-600 dark:text-slate-300 rounded-2xl">
                                                <GridIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{unit.unitNumber}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{unit.unitType} (F-{unit.floorNumber || 'G'})</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest italic ${unit.status === 'Vacant' ? 'bg-emerald-100 text-emerald-600' : unit.status === 'Occupied' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}>{unit.status}</span>
                                            <p className="text-xs font-black text-slate-900 dark:text-white mt-2 italic whitespace-nowrap">KES {unit.rentAmount?.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                                        <div className="flex items-center gap-2 truncate max-w-[60%]">
                                            <BuildingOfficeIcon className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                                            <span className="truncate">{properties.find(p => p.id === unit.propertyId)?.name || 'N/A'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingUnit(unit); setShowUnitModal(true); }} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400"><PencilIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteUnit(unit.id)} className="p-2.5 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredUnits.length === 0 && (
                                <div className="p-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] italic">No Units Found</div>
                            )}
                        </div>

                        {/* Pagination Footer */}
                        {totalUnitPages > 1 && (
                            <div className="px-6 py-4 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between gap-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Showing {((unitPage - 1) * PAGE_SIZE) + 1}–{Math.min(unitPage * PAGE_SIZE, filteredUnits.length)} of {filteredUnits.length} units
                                </p>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setUnitPage(p => Math.max(1, p - 1))} disabled={unitPage === 1} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
                                    {Array.from({ length: totalUnitPages }, (_, i) => i + 1).map(pg => (
                                        <button key={pg} onClick={() => setUnitPage(pg)} className={`w-8 h-8 rounded-xl text-[10px] font-black transition-colors ${pg === unitPage ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{pg}</button>
                                    ))}
                                    <button onClick={() => setUnitPage(p => Math.min(totalUnitPages, p + 1))} disabled={unitPage === totalUnitPages} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                );
            })()}

            {propertyActiveSubTab === 'landlords' && LandlordsTab()}
            {propertyActiveSubTab === 'tenants' && TenantsTab()}
            {propertyActiveSubTab === 'leases' && LeasesTab()}
            {propertyActiveSubTab === 'payments' && <PaymentsTab />}
            {propertyActiveSubTab === 'maintenance' && MaintenanceTab()}
            {propertyActiveSubTab === 'invoices' && <InvoicesTab />}
            {propertyActiveSubTab === 'notices' && <NoticesTab />}
            {propertyActiveSubTab === 'utilities' && <UtilitiesTab />}
            {propertyActiveSubTab === 'broadcasts' && <BroadcastsTab />}
        </div>
    );

    const TenantsTab = () => {
        const filteredTenants = tenants.filter(t => !search || t.name.toUpperCase().includes(search.toUpperCase()) || (t.phoneNumber || '').includes(search));
        const totalTenantPages = Math.max(1, Math.ceil(filteredTenants.length / PAGE_SIZE));
        const pagedTenants = filteredTenants.slice((tenantPage - 1) * PAGE_SIZE, tenantPage * PAGE_SIZE);
        return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-6">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Tenant Directory</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                        Active Leased Residents ({filteredTenants.length}{filteredTenants.length !== tenants.length ? ` of ${tenants.length}` : ''})
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    <div className="relative group w-full sm:w-64">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="SEARCH TENANTS..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setTenantPage(1); }}
                            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white shadow-sm hover:shadow-md"
                        />
                    </div>
                    <button
                        onClick={() => setShowTenantImportModal(true)}
                        className="btn-primary flex items-center justify-center gap-2 h-12 bg-indigo-600 hover:bg-indigo-700 text-white uppercase tracking-widest text-[10px] font-black px-6 rounded-2xl shadow-lg transition-all"
                    >
                        <DownloadIcon className="w-4 h-4 rotate-180" /> Import Tenants
                    </button>
                    <button
                        onClick={() => { setEditingTenant(null); setShowTenantModal(true); }}
                        className="btn-primary flex items-center justify-center gap-2 h-12 bg-blue-600 hover:bg-blue-700 text-white uppercase tracking-widest text-[10px] font-black px-6 rounded-2xl shadow-lg transition-all"
                    >
                        <PlusIcon className="w-4 h-4" /> Onboard Tenant
                    </button>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Tenant Name</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Contact Info</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">National ID</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Onboarded</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagedTenants.map(tenant => (
                                <tr key={tenant.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                    <td className="p-6 font-black text-slate-900 dark:text-white uppercase italic">{tenant.name}</td>
                                    <td className="p-6">
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{tenant.phoneNumber}</p>
                                        <p className="text-[10px] text-slate-400">{tenant.email || 'No email'}</p>
                                    </td>
                                    <td className="p-6 text-sm font-bold text-slate-500">{tenant.idNumber || '---'}</td>
                                    <td className="p-6 text-xs text-slate-400 font-bold">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                                    <td className="p-6 text-right space-x-2 whitespace-nowrap">
                                        <button onClick={() => { setSelectedTenantForBankAction(tenant); setShowBankModal(true); }} className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl hover:scale-105 transition-all" title="KCB Integration"><KcbIcon className="w-4 h-4" /></button>
                                        <button onClick={() => { setSelectedTenantForCoopAction(tenant); setShowCoopModal(true); }} className="p-3 bg-teal-50 dark:bg-teal-900/30 text-teal-600 rounded-xl hover:scale-105 transition-all" title="Coop B2B Integration"><CoopIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleResendTenantCredentials(tenant)} className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl hover:scale-105 transition-all" title="Resend Tenant Credentials"><PaperAirplaneIcon className="w-4 h-4" /></button>
                                        <button className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-xl hover:text-blue-600 transition-colors"><EyeIcon className="w-4 h-4" /></button>
                                        <button onClick={() => { setEditingTenant(tenant); setShowTenantModal(true); }} className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl hover:scale-105 transition-all" title="Edit Tenant"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteTenant(tenant.id)} className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-xl hover:scale-105 transition-all" title="Delete Tenant"><TrashIcon className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTenants.length === 0 && (
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400 text-xs font-black uppercase tracking-[0.2em] italic">No Tenants Found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-700/50">
                    {pagedTenants.map(tenant => (
                        <div key={tenant.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{tenant.name}</h4>
                                    <p className="text-xs font-bold text-slate-500 mt-1">{tenant.phoneNumber}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{tenant.idNumber || 'NO ID PROVIDED'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setSelectedTenantForBankAction(tenant); setShowBankModal(true); }} className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl"><KcbIcon className="w-5 h-5" /></button>
                                    <button onClick={() => { setSelectedTenantForCoopAction(tenant); setShowCoopModal(true); }} className="p-3 bg-teal-50 dark:bg-teal-900/30 text-teal-600 rounded-2xl" title="Coop B2B Integration"><CoopIcon className="w-5 h-5" /></button>
                                    <button onClick={() => handleResendTenantCredentials(tenant)} className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl" title="Resend Tenant Credentials"><PaperAirplaneIcon className="w-5 h-5" /></button>
                                    <button className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400"><EyeIcon className="w-5 h-5" /></button>
                                    <button onClick={() => { setEditingTenant(tenant); setShowTenantModal(true); }} className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl" title="Edit Tenant"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteTenant(tenant.id)} className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-2xl" title="Delete Tenant"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredTenants.length === 0 && (
                        <div className="p-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] italic">No Tenants Found</div>
                    )}
                </div>

                {/* Pagination Footer */}
                {totalTenantPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between gap-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Showing {((tenantPage - 1) * PAGE_SIZE) + 1}–{Math.min(tenantPage * PAGE_SIZE, filteredTenants.length)} of {filteredTenants.length} tenants
                        </p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setTenantPage(p => Math.max(1, p - 1))} disabled={tenantPage === 1} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
                            {Array.from({ length: totalTenantPages }, (_, i) => i + 1).map(pg => (
                                <button key={pg} onClick={() => setTenantPage(pg)} className={`w-8 h-8 rounded-xl text-[10px] font-black transition-colors ${pg === tenantPage ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{pg}</button>
                            ))}
                            <button onClick={() => setTenantPage(p => Math.min(totalTenantPages, p + 1))} disabled={tenantPage === totalTenantPages} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        );
    };

    const BankActionModal = () => {
        const [amount, setAmount] = useState('');
        const [paymentType, setPaymentType] = useState<string>('Rent');
        const [processing, setProcessing] = useState(false);

        const handleInitiatePayment = async () => {
            if (!selectedTenantForBankAction) return;
            if (!amount || isNaN(Number(amount))) {
                alert("Please enter a valid amount");
                return;
            }
            setProcessing(true);
            try {
                const res = await apiService.initiateKcbStkPush(selectedTenantForBankAction.id, Number(amount), paymentType);
                if (res.success) {
                    alert(res.message);
                    setShowBankModal(false);
                } else {
                    alert(res.message);
                }
            } catch (e: any) {
                alert(e.message || "Failed to initiate payment");
            }
            setProcessing(false);
        };

        const handleVerifyAccount = async () => {
            if (!selectedTenantForBankAction) return;
            setProcessing(true);
            try {
                const res = await apiService.verifyKcbAccount(selectedTenantForBankAction.id);
                if (res.success) {
                    alert(`${res.message}\n\nDetails: ${res.details.customerName} - ${res.details.verificationStatus}`);
                } else {
                    alert(res.message);
                }
            } catch (e: any) {
                alert(e.message || "Failed to verify account");
            }
            setProcessing(false);
        };

        if (!selectedTenantForBankAction) return null;

        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-600/10 rounded-2xl text-emerald-600">
                                <KcbIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">KCB Bank Integration</h3>
                                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{selectedTenantForBankAction.name}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowBankModal(false)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={handleVerifyAccount}
                                disabled={processing}
                                className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border-2 border-transparent hover:border-emerald-500/30 transition-all text-left group"
                            >
                                <CheckCircleIcon className="w-5 h-5 text-emerald-600 mb-2" />
                                <div className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest italic">Verify KYC</div>
                                <div className="text-[9px] text-slate-500 font-bold uppercase mt-1">Check Identity via KCB</div>
                            </button>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border-2 border-transparent text-left">
                                <BanknotesIcon className="w-5 h-5 text-blue-600 mb-2" />
                                <div className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest italic">Account Status</div>
                                <div className="text-[9px] text-emerald-500 font-bold uppercase mt-1">Active / Regular</div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-700">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Initiate Collection (STK Push)</h4>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Payment Amount (KES)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 15000"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-900/50 border-2 border-transparent focus:border-emerald-500 rounded-2xl p-4 text-xl font-black italic outline-none transition-all text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Payment For</label>
                                <div className="flex gap-2">
                                    {['Rent', 'Deposit', 'Utility'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setPaymentType(type)}
                                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentType === type
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleInitiatePayment}
                                disabled={processing}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl p-4 font-black uppercase tracking-widest italic shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {processing ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-5 h-5" />
                                        Initiate KCB Payment
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const CoopBankB2bModal = () => {
        const tenantInvoices = selectedTenantForCoopAction ? invoices.filter(inv => inv.tenantId === selectedTenantForCoopAction.id) : [];
        const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(tenantInvoices[0]?.id || '');
        const [simulatedAmount, setSimulatedAmount] = useState<string>('');
        const [processing, setProcessing] = useState(false);
        const [apiResponse, setApiResponse] = useState<any>(null);
        const [activeTab, setActiveTab] = useState<'validate' | 'pay'>('validate');

        const selectedInvoice = tenantInvoices.find(inv => inv.id === selectedInvoiceId);

        // Pre-fill amount when invoice changes
        useEffect(() => {
            if (selectedInvoice) {
                setSimulatedAmount(selectedInvoice.amount.toString());
            }
        }, [selectedInvoiceId, selectedInvoice]);

        const handleValidate = async () => {
            if (!selectedInvoice) {
                alert("Please select or create an invoice first.");
                return;
            }
            setProcessing(true);
            setApiResponse(null);
            try {
                const response = await fetch('/api/coop-b2b', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        header: {
                            connectionID: 'coop_b2b_agent',
                            connectionPassword: 'Password123',
                            messageID: `VAL_${Date.now()}`
                        },
                        request: {
                            TransactionReferenceCode: selectedInvoice.invoiceNumber,
                            InstitutionCode: currentInstitution.code || '210001918',
                            TotalAmount: 0
                        }
                    })
                });
                const res = await response.json();
                setApiResponse(res);
                if (res?.header?.statusCode === '200') {
                    alert("Account Validation Test Succeeded: " + res?.header?.statusDescription);
                } else {
                    alert("Account Validation Test Failed: " + (res?.header?.statusDescription || "Unknown error"));
                }
            } catch (e: any) {
                alert(e.message || "Failed to query validation endpoint");
            }
            setProcessing(false);
        };

        const handleSimulatePayment = async () => {
            if (!selectedInvoice) {
                alert("Please select or create an invoice first.");
                return;
            }
            if (!simulatedAmount || isNaN(Number(simulatedAmount)) || Number(simulatedAmount) <= 0) {
                alert("Please enter a valid payment amount");
                return;
            }
            setProcessing(true);
            setApiResponse(null);
            try {
                const response = await fetch('/api/coop-b2b', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        header: {
                            connectionID: 'coop_b2b_agent',
                            connectionPassword: 'Password123',
                            messageID: `ADV_${Date.now()}`
                        },
                        request: {
                            TransactionReferenceCode: `COOPB2B_${Date.now().toString().slice(-6)}`,
                            AccountNumber: selectedInvoice.invoiceNumber,
                            PaymentAmount: parseFloat(simulatedAmount),
                            InstitutionCode: currentInstitution.code || '210001918',
                            AccountName: selectedTenantForCoopAction.name,
                            TransactionDate: new Date().toISOString()
                        }
                    })
                });
                const res = await response.json();
                setApiResponse(res);
                if (res?.header?.statusCode === '200') {
                    alert("Coop B2B Payment simulated and reconciled successfully!");
                    loadData();
                } else {
                    alert("Payment Simulation Failed: " + (res?.header?.statusDescription || "Unknown error"));
                }
            } catch (e: any) {
                alert(e.message || "Failed to send payment advice simulated call");
            }
            setProcessing(false);
        };

        if (!selectedTenantForCoopAction) return null;

        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                    {/* Header */}
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-teal-50/50 dark:bg-teal-900/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-teal-600/10 rounded-2xl text-teal-600">
                                <CoopIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Co-op Bank B2B Integration</h3>
                                <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest">{selectedTenantForCoopAction.name}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowCoopModal(false)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-6">
                        {/* Tabs */}
                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
                            <button
                                onClick={() => { setActiveTab('validate'); setApiResponse(null); }}
                                className={`flex-1 py-3 text-center rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'validate'
                                    ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                Account Validation
                            </button>
                            <button
                                onClick={() => { setActiveTab('pay'); setApiResponse(null); }}
                                className={`flex-1 py-3 text-center rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'pay'
                                    ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                Payment Advice Simulation
                            </button>
                        </div>

                        {/* Invoice Selection */}
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Tenant Invoice</label>
                            {tenantInvoices.length > 0 ? (
                                <select
                                    value={selectedInvoiceId}
                                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none text-slate-900 dark:text-white"
                                >
                                    {tenantInvoices.map(inv => (
                                        <option key={inv.id} value={inv.id}>
                                            {inv.invoiceNumber} - {inv.description} (KES {inv.amount}) [{inv.status}]
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-2xl text-xs font-bold border border-amber-200/30">
                                    No invoices found for this tenant. Please generate an invoice in the "Invoices" tab to test Coop B2B integration.
                                </div>
                            )}
                        </div>

                        {activeTab === 'validate' ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-3xl text-left border border-slate-100 dark:border-slate-700/50">
                                    <div className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest italic mb-1">Verify Tenant Reference</div>
                                    <p className="text-[11px] text-slate-500 font-bold uppercase">This triggers a customer account validation request to ensure Co-op Bank can check client legitimacy prior to receiving payment advice.</p>
                                </div>

                                <button
                                    onClick={handleValidate}
                                    disabled={processing || !selectedInvoice}
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-2xl p-4 font-black uppercase tracking-widest italic shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {processing ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="w-5 h-5" />
                                            Run Account Validation Test
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Simulated Payment Amount (KES)</label>
                                    <input
                                        type="text"
                                        placeholder="Amount to pay"
                                        value={simulatedAmount}
                                        onChange={(e) => setSimulatedAmount(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:border-teal-500 rounded-2xl p-4 text-xl font-black italic outline-none transition-all text-slate-900 dark:text-white"
                                    />
                                </div>

                                <button
                                    onClick={handleSimulatePayment}
                                    disabled={processing || !selectedInvoice}
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-2xl p-4 font-black uppercase tracking-widest italic shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {processing ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <BanknotesIcon className="w-5 h-5" />
                                            Simulate Payment Advice
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* API Response Display */}
                        {apiResponse && (
                            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Callback API Response</label>
                                <div className="bg-slate-950 p-4 rounded-2xl max-h-48 overflow-y-auto border border-slate-800 text-[11px] font-mono text-emerald-400">
                                    <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const LeasesTab = () => {
        const expiringLeases = (() => {
            const today = new Date();
            const sixtyDays = new Date();
            sixtyDays.setDate(today.getDate() + 60);
            return leases.filter(l => {
                if (l.status !== 'Active' || !l.endDate) return false;
                const end = new Date(l.endDate);
                return end >= today && end <= sixtyDays;
            });
        })();

        const filteredLeases = leases.filter(l => {
            const tenant = tenants.find(t => t.id === l.tenantId);
            const unit = units.find(u => u.id === l.unitId);
            const matchesSearch = !leaseSearch ||
                (tenant?.name || '').toUpperCase().includes(leaseSearch.toUpperCase()) ||
                (unit?.unitNumber || '').toUpperCase().includes(leaseSearch.toUpperCase()) ||
                (l.leaseNumber || '').toUpperCase().includes(leaseSearch.toUpperCase());
            const matchesStatus = leaseStatusFilter === 'all' || l.status === leaseStatusFilter;
            return matchesSearch && matchesStatus;
        });
        const totalLeasePages = Math.max(1, Math.ceil(filteredLeases.length / PAGE_SIZE));
        const pagedLeases = filteredLeases.slice((leasePage - 1) * PAGE_SIZE, leasePage * PAGE_SIZE);
        return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {expiringLeases.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-955/20 border-2 border-rose-200/50 dark:border-rose-800/30 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
                            <AlertTriangleIcon className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-rose-850 dark:text-rose-300 uppercase tracking-wider italic">Lease Agreements Expiring Soon</h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">There are {expiringLeases.length} active lease(s) expiring within the next 60 days that require immediate escalation/renewal.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {expiringLeases.slice(0, 3).map(el => {
                            const tenant = tenants.find(t => t.id === el.tenantId);
                            const unit = units.find(u => u.id === el.unitId);
                            return (
                                <button
                                    key={el.id}
                                    onClick={() => { setRenewingLease(el); setShowRenewModal(true); }}
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow shadow-rose-600/20"
                                >
                                    Renew Unit {unit?.unitNumber} ({tenant?.name?.split(' ')[0]})
                                </button>
                            );
                        })}
                        {expiringLeases.length > 3 && (
                            <span className="text-[9px] font-black text-rose-500 uppercase flex items-center ml-2">+{expiringLeases.length - 3} More</span>
                        )}
                    </div>
                </div>
            )}

            {/* Header + Controls */}
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 flex-wrap">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Lease Agreement Registry</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Manage tenant contracts and occupancy terms</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative group w-full sm:w-64">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="SEARCH LEASES..."
                            value={leaseSearch}
                            onChange={e => { setLeaseSearch(e.target.value); setLeasePage(1); }}
                            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] pl-12 pr-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white shadow-sm"
                        />
                    </div>
                    <select
                        value={leaseStatusFilter}
                        onChange={e => { setLeaseStatusFilter(e.target.value); setLeasePage(1); }}
                        className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                    >
                        <option value="all">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Terminated">Terminated</option>
                        <option value="Expired">Expired</option>
                    </select>
                    <button
                        onClick={() => setShowBulkDateModal(true)}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-4 py-3 rounded-xl font-bold text-xs transition-all whitespace-nowrap"
                    >
                        <CalendarIcon className="w-4 h-4" /> Bulk Update Start Dates
                    </button>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Lease Reference</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Tenant</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Unit</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Monthly Rent</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Status</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagedLeases.map(lease => {
                                const tenant = tenants.find(t => t.id === lease.tenantId);
                                const unit = units.find(u => u.id === lease.unitId);
                                return (
                                    <tr key={lease.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-6 font-mono text-xs font-black text-slate-400 uppercase">{lease.leaseNumber || `#${lease.id.split('_')[1]}`}</td>
                                        <td className="p-6 font-black text-slate-900 dark:text-white uppercase italic">{tenant?.name || 'N/A'}</td>
                                        <td className="p-6 text-sm font-bold text-slate-500">UNIT {unit?.unitNumber || 'N/A'}</td>
                                        <td className="p-6 text-lg font-black text-slate-900 dark:text-white italic">KES {lease.rentAmount?.toLocaleString()}</td>
                                        <td className="p-6">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic ${lease.status === 'Active' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'}`}>
                                                {lease.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => setSelectedLeaseForPreview(lease)}
                                                    className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-800 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                                                    title="View Agreement"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                </button>
                                                {lease.status === 'Active' && (
                                                    <button
                                                        onClick={() => { setRenewingLease(lease); setShowRenewModal(true); }}
                                                        className="px-4 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-500 transition-all font-black text-[10px] uppercase tracking-widest"
                                                        title="Renew Lease"
                                                    >
                                                        Renew
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredLeases.length === 0 && (
                                <tr><td colSpan={6} className="p-12 text-center text-slate-400 text-xs font-black uppercase tracking-[0.2em] italic">No Leases Found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-700/50">
                    {pagedLeases.map(lease => {
                        const tenant = tenants.find(t => t.id === lease.tenantId);
                        const unit = units.find(u => u.id === lease.unitId);
                        return (
                            <div key={lease.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-mono font-black text-slate-400 uppercase">{lease.leaseNumber || `#${lease.id.split('_')[1]}`}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${lease.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{lease.status}</span>
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{tenant?.name || 'N/A'}</h4>
                                        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest italic">Unit {unit?.unitNumber || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-slate-900 dark:text-white italic">KES {lease.rentAmount?.toLocaleString()}</p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Monthly Rent</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => setSelectedLeaseForPreview(lease)}
                                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <EyeIcon className="w-4 h-4" /> Agreement
                                    </button>
                                    {lease.status === 'Active' && (
                                        <button
                                            onClick={() => { setRenewingLease(lease); setShowRenewModal(true); }}
                                            className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
                                        >
                                            Renew
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {filteredLeases.length === 0 && (
                        <div className="p-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] italic">No Leases Found</div>
                    )}
                </div>

                {/* Pagination Footer */}
                {totalLeasePages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between gap-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Showing {((leasePage - 1) * PAGE_SIZE) + 1}–{Math.min(leasePage * PAGE_SIZE, filteredLeases.length)} of {filteredLeases.length} leases
                        </p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setLeasePage(p => Math.max(1, p - 1))} disabled={leasePage === 1} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
                            {Array.from({ length: totalLeasePages }, (_, i) => i + 1).map(pg => (
                                <button key={pg} onClick={() => setLeasePage(pg)} className={`w-8 h-8 rounded-xl text-[10px] font-black transition-colors ${pg === leasePage ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{pg}</button>
                            ))}
                            <button onClick={() => setLeasePage(p => Math.min(totalLeasePages, p + 1))} disabled={leasePage === totalLeasePages} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        );
    };    const handleSavePayment = async (data: Partial<PMPayment> & { payments?: { paymentType: PMPaymentType; amount: number }[] }) => {
        try {
            const items = data.payments && data.payments.length > 0
                ? data.payments
                : [{ paymentType: data.paymentType || 'Rent', amount: data.amount || 0 }];

            let receiptPrefix = pmSettings?.numbering?.receiptPrefix || 'REC';
            let receiptNextNum = pmSettings?.numbering?.receiptNextNumber || 1000;
            const receiptNumber = `${receiptPrefix}-${receiptNextNum}`;

            const createdPayments: PMPayment[] = [];

            for (const item of items) {
                if (item.amount <= 0) continue;

                // Calculate Commission
                let commissionAmount = 0;
                if (item.paymentType === 'Rent' && data.leaseId) {
                    const lease = leases.find(l => l.id === data.leaseId);
                    if (lease) {
                        const unit = units.find(u => u.id === lease.unitId);
                        if (unit) {
                            const property = properties.find(p => p.id === unit.propertyId);
                            if (property && property.commissionRate && property.commissionRate > 0) {
                                commissionAmount = (item.amount * property.commissionRate) / 100;
                            }
                        }
                    }
                }

                const p: PMPayment = {
                    id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    leaseId: data.leaseId || '',
                    amount: item.amount,
                    paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
                    paymentMethod: data.paymentMethod || 'M-Pesa',
                    paymentType: item.paymentType,
                    reference: data.reference,
                    receiptNumber,
                    status: 'Completed',
                    commissionAmount,
                    institutionId,
                    createdAt: new Date().toISOString()
                };

                await apiService.saveModuleRecord('pm_payments', p);
                createdPayments.push(p);

                // Auto-allocate rent payment to oldest unpaid rent/arrears invoices
                if (item.paymentType === 'Rent' && data.leaseId) {
                    let paymentRemaining = item.amount;
                    const unpaidLeaseInvoices = invoices
                        .filter(inv => inv.leaseId === data.leaseId &&
                            inv.status !== 'Paid' && inv.status !== 'Cancelled' &&
                            (inv.description.toLowerCase().includes('rent') || inv.description.toLowerCase().includes('arrears')))
                        .sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());

                    for (const inv of unpaidLeaseInvoices) {
                        if (paymentRemaining <= 0) break;
                        if (paymentRemaining >= inv.amount) {
                            paymentRemaining -= inv.amount;
                            await apiService.saveModuleRecord('pm_invoices', {
                                ...inv,
                                status: 'Paid'
                            });
                        } else {
                            break;
                        }
                    }
                }
            }

            if (createdPayments.length === 0) {
                alert("Please enter a payment amount greater than 0.");
                return;
            }

            if (pmSettings) {
                const updatedSettings = {
                    ...pmSettings,
                    numbering: {
                        ...(pmSettings.numbering || {}),
                        receiptNextNumber: receiptNextNum + 1
                    }
                };
                await apiService.saveModuleRecord('pm_settings', updatedSettings);
                setPmSettings(updatedSettings);
            }

            // Generate receipt preview & delivery for consolidated payments
            if (createdPayments.length > 0) {
                const firstPay = createdPayments[0];
                const lease = leases.find(l => l.id === firstPay.leaseId);
                const tenant = tenants.find(t => t.id === lease?.tenantId);
                const unit = units.find(u => u.id === lease?.unitId);
                if (tenant && unit) {
                    try {
                        const dataUri = await pdfService.generateConsolidatedPMReceiptPdfDataUri(
                            createdPayments, tenant, unit, currentInstitution, companyDetails, currentInstitution.logoUrl || null,
                            pmSettings?.branding?.letterheadUrl || null
                        );
                        
                        setPreviewPdfUrl(dataUri);
                        setPreviewPdfTitle(`Receipt - ${tenant.name}`);
                        setShowPdfPreview(true);

                        // Instantly send email receipt to tenant if email exists
                        if (tenant.email) {
                            const base64Data = dataUri.split(',')[1];
                            const totalAmount = createdPayments.reduce((sum, p) => sum + p.amount, 0);
                            const breakdownStr = createdPayments.map(p => `${p.paymentType}: KES ${p.amount.toLocaleString()}`).join(', ');
                            const emailSubject = `Payment Receipt - Unit ${unit.unitNumber}`;
                            const emailBody = `Dear ${tenant.name},\n\nPlease find attached your payment receipt for KES ${totalAmount.toLocaleString()} (${breakdownStr}) recorded on ${firstPay.paymentDate} for Unit ${unit.unitNumber}.\n\nBest Regards,\nProperty Management`;
                            const emailConfig = getInstitutionEmailConfig(currentInstitution, currentInstitution.emailConfig);
                            
                            apiService.sendEmail(
                                tenant.email,
                                emailSubject,
                                emailBody,
                                emailConfig,
                                undefined,
                                [{ filename: `Receipt_${receiptNumber}.pdf`, content: base64Data, encoding: 'base64' }]
                            ).then(() => {
                                console.log(`Receipt email sent successfully to ${tenant.email}`);
                            }).catch(emailErr => {
                                console.error("Failed to send receipt email to tenant:", emailErr);
                            });
                        }

                        // Instantly send SMS receipt to tenant if phone exists
                        if (tenant.phoneNumber) {
                            try {
                                const blob = dataUriToBlob(dataUri);
                                const fileName = `receipts/Receipt_${receiptNumber}.pdf`;
                                let publicUrl = '';
                                let shortUrl = '';
                                try {
                                    publicUrl = await apiService.uploadBlob(fileName, blob, 'application/pdf');
                                    shortUrl = await apiService.shortenUrl(publicUrl);
                                } catch (uploadErr) {
                                    console.warn("Supabase storage upload failed, sending SMS without attachment", uploadErr);
                                }
                                
                                const tenantFirstName = tenant.name ? tenant.name.trim().split(' ')[0] : 'Tenant';
                                const totalAmount = createdPayments.reduce((sum, p) => sum + p.amount, 0);
                                const breakdownStr = createdPayments.map(p => `${p.paymentType}: ${p.amount.toLocaleString()}`).join(', ');
                                const smsMessage = publicUrl 
                                    ? `Dear ${tenantFirstName}, payment of KES ${totalAmount.toLocaleString()} (${breakdownStr}) at Unit ${unit.unitNumber} has been received. Receipt ID: ${receiptNumber}. Download receipt here: ${shortUrl} `
                                    : `Dear ${tenantFirstName}, payment of KES ${totalAmount.toLocaleString()} (${breakdownStr}) at Unit ${unit.unitNumber} has been received. Receipt ID: ${receiptNumber}. (PDF receipt generated successfully)`;
                                
                                apiService.sendSms(
                                    tenant.phoneNumber, 
                                    smsMessage, 
                                    currentInstitution.smsConfig, 
                                    1, 
                                    currentInstitution.id!
                                ).then(() => {
                                    console.log(`Receipt SMS sent successfully to ${tenant.phoneNumber}`);
                                }).catch(smsErr => {
                                    console.error("Failed to send receipt SMS:", smsErr);
                                });
                            } catch (smsErr) {
                                console.warn("SMS processing failed:", smsErr);
                            }
                        }
                    } catch (pdfErr) {
                        console.error("PDF Receipt Generation/Delivery Fail:", pdfErr);
                    }
                }
            }

            setShowPaymentModal(false);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to save payment"); }
    };

    const handleDeletePayment = async (paymentId: string) => {
        if (!confirm("Are you sure you want to delete this payment record? This action cannot be undone.")) return;
        try {
            await apiService.deleteModuleRecord('pm_payments', paymentId);
            alert("Payment deleted successfully.");
            loadData();
        } catch (e: any) {
            alert(e.message || "Failed to delete payment.");
            console.error(e);
        }
    };

    const handleSaveInvoice = async (data: Partial<PMInvoice>) => {
        try {
            if (editingInvoice) {
                const updated: PMInvoice = {
                    ...editingInvoice,
                    ...data,
                    amount: data.amount !== undefined ? data.amount : editingInvoice.amount,
                    description: data.description !== undefined ? data.description : editingInvoice.description,
                    dueDate: data.dueDate !== undefined ? data.dueDate : editingInvoice.dueDate,
                    status: data.status !== undefined ? data.status : editingInvoice.status,
                    openingBalance: data.openingBalance !== undefined ? data.openingBalance : editingInvoice.openingBalance,
                };
                await apiService.saveModuleRecord('pm_invoices', updated);
                setEditingInvoice(null);
            } else {
                const prefix = pmSettings?.numbering?.invoicePrefix || 'INV';
                const nextNum = pmSettings?.numbering?.invoiceNextNumber || 1000;
                const invoiceNumber = `${prefix}-${nextNum}`;

                const newInvoice: PMInvoice = {
                    id: `inv_${Date.now()}`,
                    invoiceNumber,
                    leaseId: data.leaseId || '',
                    tenantId: data.tenantId || '',
                    unitId: data.unitId || '',
                    description: data.description || '',
                    amount: data.amount || 0,
                    issueDate: data.issueDate || new Date().toISOString().split('T')[0],
                    dueDate: data.dueDate || '',
                    status: data.status || 'Sent',
                    institutionId,
                    createdAt: new Date().toISOString(),
                    openingBalance: data.openingBalance,
                };
                await apiService.saveModuleRecord('pm_invoices', newInvoice);

                if (pmSettings) {
                    const updatedSettings = {
                        ...pmSettings,
                        numbering: {
                            ...(pmSettings.numbering || {}),
                            invoiceNextNumber: nextNum + 1
                        }
                    };
                    await apiService.saveModuleRecord('pm_settings', updatedSettings);
                    setPmSettings(updatedSettings);
                }
            }

            setShowInvoiceModal(false);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to save invoice"); }
    };

    const handleApproveWht = async (inv: PMInvoice) => {
        try {
            const totalWht = inv.withholdingTaxAmount || Math.round(inv.amount * 0.1);
            const updatedInvoice: PMInvoice = {
                ...inv,
                withholdingStatus: 'approved',
                withholdingRejectionReason: undefined
            };

            const newPayment: PMPayment = {
                id: `pay_wht_${Date.now()}`,
                leaseId: inv.leaseId,
                amount: totalWht,
                paymentDate: new Date().toISOString().split('T')[0],
                paymentMethod: 'Bank',
                paymentType: 'Rent',
                reference: inv.withholdingCertificateNumber || 'WHT CERT',
                receiptNumber: `WHT-${inv.withholdingCertificateNumber || Date.now()}`,
                status: 'Completed',
                institutionId: institutionId || '',
                createdAt: new Date().toISOString()
            };

            const invoicePayments = payments.filter(p => p.leaseId === inv.leaseId && p.status === 'Completed');
            const totalPaidSoFar = invoicePayments.reduce((sum, p) => sum + p.amount, 0) + totalWht;
            if (totalPaidSoFar >= inv.amount) {
                updatedInvoice.status = 'Paid';
            }

            await apiService.saveModuleRecord('pm_invoices', updatedInvoice);
            await apiService.saveModuleRecord('pm_payments', newPayment);
            alert("Withholding tax certificate approved successfully!");
            setShowWhtReviewModal(false);
            setSelectedInvoiceForWhtReview(null);
            loadData();
        } catch (err: any) {
            alert(err.message || "Failed to approve withholding tax certificate.");
        }
    };

    const handleRejectWht = async (inv: PMInvoice, reason: string) => {
        try {
            if (!reason.trim()) {
                return alert("Please enter a rejection reason.");
            }
            const updatedInvoice: PMInvoice = {
                ...inv,
                withholdingStatus: 'rejected',
                withholdingRejectionReason: reason
            };
            await apiService.saveModuleRecord('pm_invoices', updatedInvoice);
            alert("Withholding tax certificate rejected.");
            setShowWhtReviewModal(false);
            setSelectedInvoiceForWhtReview(null);
            loadData();
        } catch (err: any) {
            alert(err.message || "Failed to reject withholding tax certificate.");
        }
    };

    const handleGenerateArrears = async (data: {
        billingMonth: string;
        propertyId: string;
        dueDate: string;
        generateRent: boolean;
        generateArrears: boolean;
    }) => {
        try {
            const [yearStr, monthStr] = data.billingMonth.split('-');
            const targetYear = parseInt(yearStr);
            const targetMonth = parseInt(monthStr);
            
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const monthName = monthNames[targetMonth - 1];
            const rentDescription = `Rent - ${monthName} ${targetYear}`;

            let targetLeases = leases.filter(l => l.status === 'Active');
            if (data.propertyId !== 'all') {
                targetLeases = targetLeases.filter(l => {
                    const unit = units.find(u => u.id === l.unitId);
                    return unit?.propertyId === data.propertyId;
                });
            }

            const prefix = pmSettings?.numbering?.invoicePrefix || 'INV';
            let nextNum = pmSettings?.numbering?.invoiceNextNumber || 1000;

            const newInvoices: PMInvoice[] = [];

            for (const lease of targetLeases) {
                const tenant = tenants.find(t => t.id === lease.tenantId);
                const unit = units.find(u => u.id === lease.unitId);
                if (!tenant || !unit) continue;

                if (data.generateRent) {
                    const alreadyExists = invoices.some(inv => 
                        inv.leaseId === lease.id && 
                        inv.description.toLowerCase().includes(rentDescription.toLowerCase())
                    );

                    if (!alreadyExists) {
                        newInvoices.push({
                            id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            invoiceNumber: `${prefix}-${nextNum++}`,
                            leaseId: lease.id,
                            tenantId: lease.tenantId,
                            unitId: lease.unitId,
                            description: rentDescription,
                            amount: lease.rentAmount,
                            issueDate: new Date().toISOString().split('T')[0],
                            dueDate: data.dueDate,
                            status: 'Sent',
                            institutionId,
                            createdAt: new Date().toISOString()
                        });
                    }
                }

                if (data.generateArrears) {
                    const start = new Date(lease.startDate);
                    const leaseEnd = lease.endDate ? new Date(lease.endDate) : null;
                    const billingMonthStart = new Date(targetYear, targetMonth - 1, 1);
                    const billingMonthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);

                    const isLeaseActiveInPeriod = start <= billingMonthEnd && (!leaseEnd || leaseEnd >= billingMonthStart);
                    const expectedRent = isLeaseActiveInPeriod ? (lease.rentAmount || 0) : 0;

                    const totalPaid = payments
                        .filter(p => {
                            if (p.leaseId !== lease.id || p.paymentType === 'Utility' || p.paymentType === 'Deposit') return false;
                            const pDate = new Date(p.paymentDate);
                            return pDate >= billingMonthStart && pDate <= billingMonthEnd;
                        })
                        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

                    const totalInvoiced = invoices
                        .filter(inv => {
                            if (inv.leaseId !== lease.id) return false;
                            if (inv.status === 'Cancelled' || inv.status === 'Draft') return false;
                            if (!inv.description.toLowerCase().includes('rent') && !inv.description.toLowerCase().includes('arrears')) return false;
                            const iDate = new Date(inv.issueDate);
                            return iDate >= billingMonthStart && iDate <= billingMonthEnd;
                        })
                        .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

                    const newlyAddedRent = newInvoices.find(inv => 
                        inv.leaseId === lease.id && 
                        inv.description.toLowerCase().includes('rent')
                    );
                    const newlyAddedRentAmount = newlyAddedRent ? (Number(newlyAddedRent.amount) || 0) : 0;

                    const unInvoicedArrears = Math.max(0, expectedRent - Math.max(totalPaid, totalInvoiced) - newlyAddedRentAmount);

                    if (unInvoicedArrears > 0) {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const billingPeriodLabel = `${monthName} ${targetYear}`;
                        const alreadyExistsArrears = invoices.some(inv => 
                            inv.leaseId === lease.id && 
                            inv.description.includes(billingPeriodLabel)
                        );

                        if (!alreadyExistsArrears) {
                            newInvoices.push({
                                id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                invoiceNumber: `${prefix}-${nextNum++}`,
                                leaseId: lease.id,
                                tenantId: lease.tenantId,
                                unitId: lease.unitId,
                                description: `Outstanding Arrears Adjustment - ${billingPeriodLabel}`,
                                amount: unInvoicedArrears,
                                issueDate: todayStr,
                                dueDate: data.dueDate,
                                status: 'Sent',
                                institutionId,
                                createdAt: new Date().toISOString()
                            });
                        }
                    }
                }
            }

            if (newInvoices.length === 0) {
                alert("No new rent or arrears invoices need to be generated for the selected criteria.");
                return;
            }

            await apiService.saveModuleRecords('pm_invoices', newInvoices);

            if (pmSettings) {
                const updatedSettings = {
                    ...pmSettings,
                    numbering: {
                        ...(pmSettings.numbering || {}),
                        invoiceNextNumber: nextNum
                    }
                };
                await apiService.saveModuleRecord('pm_settings', updatedSettings);
                setPmSettings(updatedSettings);
            }

            alert(`Successfully generated ${newInvoices.length} invoices!`);
            setShowGenerateArrearsModal(false);
            loadData();
        } catch (e: any) {
            alert(e.message || "Failed to generate invoices");
        }
    };

    const handleSaveTicket = async (data: Partial<PMTicket>) => {
        try {
            const newTicket: PMTicket = {
                id: `tick_${Date.now()} `,
                propertyId: data.propertyId || '',
                unitId: data.unitId || '',
                title: data.title || '',
                description: data.description || '',
                priority: data.priority || 'Medium',
                status: 'Open',
                cost: 0,
                institutionId,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_maintenance', newTicket);
            setShowTicketModal(false);
            loadData();
        } catch (e) { console.error(e); }
    };

    const PaymentsTab = () => {
        const [search, setSearch] = useState('');
        const [methodFilter, setMethodFilter] = useState('all');
        const [typeFilter, setTypeFilter] = useState('all');
        const [propertyFilter, setPropertyFilter] = useState('all');
        const [monthFilter, setMonthFilter] = useState('all');
        const [page, setPage] = useState(1);
        const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
        const PAGE_SIZE = 15;

        const getMonthName = (dateStr?: string) => {
            if (!dateStr) return '—';
            const parts = dateStr.split('-');
            if (parts.length < 2) return '—';
            const monthIndex = parseInt(parts[1], 10) - 1;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[monthIndex] || ''} '${parts[0].slice(2)}`;
        };

        const formatMonthYear = (monthStr: string) => {
            const [year, month] = monthStr.split('-');
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthIndex = parseInt(month, 10) - 1;
            return `${months[monthIndex] || ''} ${year}`;
        };

        const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
        const handleMethodChange = (v: string) => { setMethodFilter(v); setPage(1); };
        const handleTypeChange = (v: string) => { setTypeFilter(v); setPage(1); };
        const handlePropertyChange = (v: string) => { setPropertyFilter(v); setPage(1); };
        const handleMonthChange = (v: string) => { setMonthFilter(v); setPage(1); };

        const uniqueMethods = useMemo(() => {
            const methods = new Set<string>();
            payments.forEach(p => {
                if (p.paymentMethod) methods.add(p.paymentMethod);
            });
            return Array.from(methods).sort();
        }, [payments]);

        const uniqueTypes = useMemo(() => {
            const types = new Set<string>();
            payments.forEach(p => {
                if (p.paymentType) types.add(p.paymentType);
            });
            return Array.from(types).sort();
        }, [payments]);

        const uniqueMonths = useMemo(() => {
            const months = new Set<string>();
            payments.forEach(p => {
                if (p.paymentDate && typeof p.paymentDate === 'string') {
                    const parts = p.paymentDate.split('-');
                    if (parts.length >= 2) {
                        const year = parts[0];
                        const month = parts[1];
                        if (year.length === 4 && month.length === 2) {
                            months.add(`${year}-${month}`);
                        }
                    }
                }
            });
            return Array.from(months).sort((a, b) => b.localeCompare(a));
        }, [payments]);

        const handlePreview = async (payment: PMPayment) => {
            const lease = leases.find(l => l.id === payment.leaseId);
            const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : undefined;
            const unit = lease ? units.find(u => u.id === lease.unitId) : undefined;
            if (!tenant || !unit) return alert("Tenant or Unit data missing for this payment.");

            setPreviewLoadingId(payment.id);
            try {
                const relatedPayments = payment.receiptNumber 
                    ? payments.filter(p => p.receiptNumber === payment.receiptNumber)
                    : [payment];

                const dataUri = await pdfService.generateConsolidatedPMReceiptPdfDataUri(
                    relatedPayments, tenant, unit, currentInstitution, companyDetails, currentInstitution.logoUrl || null,
                    pmSettings?.branding?.letterheadUrl || null
                );
                setPreviewPdfUrl(dataUri);
                setPreviewPdfTitle(`Receipt ${payment.receiptNumber || payment.id}`);
                setShowPdfPreview(true);
            } catch (err) {
                console.error(err);
                alert("Failed to generate PDF receipt preview.");
            } finally {
                setPreviewLoadingId(null);
            }
        };

        const handleDownload = async (payment: PMPayment) => {
            const lease = leases.find(l => l.id === payment.leaseId);
            const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : undefined;
            const unit = lease ? units.find(u => u.id === lease.unitId) : undefined;
            if (!tenant || !unit) return alert("Tenant or Unit data missing for this payment.");

            try {
                const relatedPayments = payment.receiptNumber 
                    ? payments.filter(p => p.receiptNumber === payment.receiptNumber)
                    : [payment];

                const dataUri = await pdfService.generateConsolidatedPMReceiptPdfDataUri(
                    relatedPayments, tenant, unit, currentInstitution, companyDetails, currentInstitution.logoUrl || null,
                    pmSettings?.branding?.letterheadUrl || null
                );
                const link = document.createElement('a');
                link.href = dataUri;
                link.download = `Receipt-${payment.receiptNumber || payment.id}.pdf`;
                link.click();
            } catch (err) { 
                console.error(err);
                alert("Failed to generate PDF receipt."); 
            }
        };

        const filteredPayments = useMemo(() => {
            return payments.filter(payment => {
                const lease = leases.find(l => l.id === payment.leaseId);
                const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : null;
                const unit = lease ? units.find(u => u.id === lease.unitId) : null;

                const matchesSearch = 
                    (payment.receiptNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                    (tenant?.name || '').toLowerCase().includes(search.toLowerCase()) ||
                    (unit?.unitNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                    (payment.reference || '').toLowerCase().includes(search.toLowerCase());

                const matchesMethod = methodFilter === 'all' || payment.paymentMethod === methodFilter;
                const matchesType = typeFilter === 'all' || payment.paymentType === typeFilter;
                const matchesProperty = propertyFilter === 'all' || unit?.propertyId === propertyFilter;
                const matchesMonth = monthFilter === 'all' || (payment.paymentDate && payment.paymentDate.startsWith(monthFilter));

                return matchesSearch && matchesMethod && matchesType && matchesProperty && matchesMonth;
            });
        }, [payments, leases, tenants, units, search, methodFilter, typeFilter, propertyFilter, monthFilter]);

        const sortedPayments = useMemo(() => {
            return [...filteredPayments].sort((a, b) => {
                const recA = a.receiptNumber || '';
                const recB = b.receiptNumber || '';
                
                if (recA && recB) {
                    return recB.localeCompare(recA, undefined, { numeric: true, sensitivity: 'base' });
                }
                if (recA && !recB) return -1;
                if (!recA && recB) return 1;
                
                return new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
            });
        }, [filteredPayments]);

        const totalPages = Math.max(1, Math.ceil(sortedPayments.length / PAGE_SIZE));
        const pagedPayments = sortedPayments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Search & Filters */}
                <div className="flex bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm gap-4 items-center flex-wrap">
                    <div className="flex flex-1 items-center gap-4 min-w-[200px]">
                        <SearchIcon className="w-5 h-5 text-slate-400 ml-2" />
                        <input 
                            type="search" 
                            placeholder="Search payments by receipt, tenant, unit or ref..."
                            className="flex-1 bg-transparent font-bold outline-none text-sm dark:text-white"
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </div>
                    
                    {/* Method Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Method</label>
                        <select 
                            value={methodFilter} 
                            onChange={(e) => handleMethodChange(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                        >
                            <option value="all">All Methods</option>
                            {uniqueMethods.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    {/* Type Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Type</label>
                        <select 
                            value={typeFilter} 
                            onChange={(e) => handleTypeChange(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                        >
                            <option value="all">All Types</option>
                            {uniqueTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Month Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Month</label>
                        <select 
                            value={monthFilter} 
                            onChange={(e) => handleMonthChange(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                        >
                            <option value="all">All Months</option>
                            {uniqueMonths.map(m => (
                                <option key={m} value={m}>{formatMonthYear(m)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Property Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Property</label>
                        <select 
                            value={propertyFilter} 
                            onChange={(e) => handlePropertyChange(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs font-bold outline-none max-w-[150px] truncate dark:text-white"
                        >
                            <option value="all">All Properties</option>
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Ledger Table */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Collection Ledger</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                                {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
                            </p>
                        </div>
                    </div>

                    {pagedPayments.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-slate-400 font-bold text-sm">No payments found</p>
                            <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">Try adjusting your filters or record a new payment</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tenant Name</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt No</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ref</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagedPayments.map(payment => {
                                            const lease = leases.find(l => l.id === payment.leaseId);
                                            const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : null;
                                            return (
                                                <tr key={payment.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                                    {/* 1. Unit */}
                                                    <td className="p-6 font-black text-slate-900 dark:text-white uppercase italic text-xs">
                                                        {lease ? (units.find(u => u.id === lease.unitId)?.unitNumber || 'N/A') : 'N/A'}
                                                    </td>
                                                    {/* 2. Tenant Name */}
                                                    <td className="p-6">
                                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">{tenant?.name || 'N/A'}</p>
                                                    </td>
                                                    {/* 3. Type */}
                                                    <td className="p-6 text-xs font-black text-blue-650 dark:text-blue-400 uppercase">{payment.paymentType}</td>
                                                    {/* 4. Amount */}
                                                    <td className="p-6 text-lg font-black text-slate-900 dark:text-white italic">KES {payment.amount?.toLocaleString()}</td>
                                                    {/* 5. Receipt No */}
                                                    <td className="p-6">
                                                        <p className="text-xs font-black text-purple-650 dark:text-purple-400">{payment.receiptNumber || '—'}</p>
                                                        <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">ID: #{payment.id.split('_')[1] || payment.id}</p>
                                                    </td>
                                                    {/* 6. Ref */}
                                                    <td className="p-6 text-xs font-bold text-slate-600 dark:text-slate-350 uppercase">
                                                        {payment.reference || '—'}
                                                    </td>
                                                    {/* 7. Method */}
                                                    <td className="p-6 font-bold text-slate-500 uppercase text-[10px]">{payment.paymentMethod}</td>
                                                    {/* 8. Date */}
                                                    <td className="p-6 text-xs font-bold text-slate-500 uppercase">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                                    {/* 9. Status */}
                                                    <td className="p-6">
                                                        <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic">{payment.status || 'Success'}</span>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex gap-2 justify-end items-center">
                                                            <button 
                                                                onClick={() => handlePreview(payment)} 
                                                                title="Preview Receipt" 
                                                                disabled={previewLoadingId === payment.id}
                                                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                                                            >
                                                                {previewLoadingId === payment.id ? (
                                                                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                                                ) : (
                                                                    <EyeIcon className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDownload(payment)} 
                                                                title="Download Receipt" 
                                                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-blue-600 hover:text-white transition-all"
                                                            >
                                                                <DownloadIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeletePayment(payment.id)} 
                                                                title="Delete Payment" 
                                                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-rose-600 hover:text-white transition-all"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-700/50">
                                {pagedPayments.map(payment => {
                                    const lease = leases.find(l => l.id === payment.leaseId);
                                    const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : null;
                                    return (
                                        <div key={payment.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-purple-650 dark:text-purple-400">{payment.receiptNumber || 'No Receipt'}</span>
                                                    <span className="text-[9px] font-mono font-bold text-slate-400">| #{payment.id.split('_')[1] || payment.id}</span>
                                                    <span className="bg-emerald-50 text-emerald-600 text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase">Success</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(payment.paymentDate).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{tenant?.name || 'N/A'}</h4>
                                                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{payment.paymentType}</p>
                                                    {payment.reference && (
                                                        <p className="text-[9px] text-purple-650 font-black uppercase tracking-wider mt-0.5">Ref: {payment.reference}</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white italic">KES {payment.amount?.toLocaleString()}</p>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{payment.paymentMethod}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                                                <button 
                                                    onClick={() => handlePreview(payment)} 
                                                    disabled={previewLoadingId === payment.id}
                                                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-indigo-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
                                                >
                                                    {previewLoadingId === payment.id ? (
                                                        <ArrowPathIcon className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <EyeIcon className="w-3 h-3" />
                                                    )}
                                                    Preview
                                                </button>
                                                <button 
                                                    onClick={() => handleDownload(payment)} 
                                                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-blue-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
                                                >
                                                    <DownloadIcon className="w-3 h-3" />
                                                    Download
                                                </button>
                                                <button 
                                                    onClick={() => handleDeletePayment(payment.id)} 
                                                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-rose-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
                                                >
                                                    <TrashIcon className="w-3 h-3" />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-50 dark:border-slate-700/50">
                                    <p className="text-xs font-bold text-slate-400">Page {page} of {totalPages}</p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setPage(1)}
                                            disabled={page === 1}
                                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500 disabled:opacity-30 hover:bg-indigo-600 hover:text-white transition-all"
                                        >«</button>
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500 disabled:opacity-30 hover:bg-indigo-600 hover:text-white transition-all"
                                        >‹ Prev</button>
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                                            const p = start + i;
                                            return p <= totalPages ? (
                                                <button
                                                    key={p}
                                                    onClick={() => setPage(p)}
                                                    className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                                                        p === page
                                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'
                                                    }`}
                                                >{p}</button>
                                            ) : null;
                                        })}
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500 disabled:opacity-30 hover:bg-indigo-600 hover:text-white transition-all"
                                        >Next ›</button>
                                        <button
                                            onClick={() => setPage(totalPages)}
                                            disabled={page === totalPages}
                                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500 disabled:opacity-30 hover:bg-indigo-600 hover:text-white transition-all"
                                        >»</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

    const InvoicesTab = () => {
        const [search, setSearch] = useState('');
        const [statusFilter, setStatusFilter] = useState('all');
        const [propertyFilter, setPropertyFilter] = useState('all');
        const [monthFilter, setMonthFilter] = useState('all');
        const [sortOrder, setSortOrder] = useState<'default' | 'amount_desc' | 'amount_asc'>('default');
        const [sendingBulk, setSendingBulk] = useState(false);
        const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
        const [page, setPage] = useState(1);
        const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
        const PAGE_SIZE = 15;

        const getMonthName = (dateStr?: string) => {
            if (!dateStr) return '—';
            const parts = dateStr.split('-');
            if (parts.length < 2) return '—';
            const monthIndex = parseInt(parts[1], 10) - 1;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[monthIndex] || ''} '${parts[0].slice(2)}`;
        };

        const formatDisplayDate = (dateStr?: string) => {
            if (!dateStr) return '—';
            const parts = dateStr.split('-');
            if (parts.length < 3) return dateStr;
            const [year, month, day] = parts;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthIndex = parseInt(month, 10) - 1;
            const monthName = months[monthIndex] || month;
            return `${day} ${monthName} ${year.slice(2)}`;
        };

        // Parse unique months from invoice due dates (format: YYYY-MM)
        const uniqueMonths = useMemo(() => {
            const months = new Set<string>();
            invoices.forEach(inv => {
                if (inv.dueDate && typeof inv.dueDate === 'string') {
                    const parts = inv.dueDate.split('-');
                    if (parts.length >= 2) {
                        const year = parts[0];
                        const month = parts[1];
                        if (year.length === 4 && month.length === 2) {
                            months.add(`${year}-${month}`);
                        }
                    }
                }
            });
            return Array.from(months).sort((a, b) => b.localeCompare(a));
        }, [invoices]);

        const formatMonthYear = (monthStr: string) => {
            const [year, month] = monthStr.split('-');
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthIndex = parseInt(month, 10) - 1;
            return `${months[monthIndex] || ''} ${year}`;
        };

        const filteredInvoices = invoices.filter(inv => {
            const tenant = tenants.find(t => t.id === inv.tenantId);
            const unit = units.find(u => u.id === inv.unitId);
            
            const matchesSearch = inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
                                 tenant?.name.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
            const matchesProperty = propertyFilter === 'all' || unit?.propertyId === propertyFilter;
            const matchesMonth = monthFilter === 'all' || (inv.dueDate && inv.dueDate.startsWith(monthFilter));

            return matchesSearch && matchesStatus && matchesProperty && matchesMonth;
        });

        const sortedInvoices = useMemo(() => {
            const list = [...filteredInvoices];
            if (sortOrder === 'amount_desc') {
                return list.sort((a, b) => (b.amount || 0) - (a.amount || 0));
            } else if (sortOrder === 'amount_asc') {
                return list.sort((a, b) => (a.amount || 0) - (b.amount || 0));
            }
            return list;
        }, [filteredInvoices, sortOrder]);

        const totalPages = Math.max(1, Math.ceil(sortedInvoices.length / PAGE_SIZE));
        const pagedInvoices = sortedInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

        // Reset to page 1 whenever filters change
        const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
        const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1); };
        const handlePropertyChange = (v: string) => { setPropertyFilter(v); setPage(1); };
        const handleMonthChange = (v: string) => { setMonthFilter(v); setPage(1); };
        const handleSortChange = (v: 'default' | 'amount_desc' | 'amount_asc') => { setSortOrder(v); setPage(1); };


        const handlePreview = async (inv: PMInvoice) => {
            const tenant = tenants.find(t => t.id === inv.tenantId);
            const unit = units.find(u => u.id === inv.unitId);
            if (!tenant || !unit) return alert("Tenant or Unit data missing.");

            const property = properties.find(p => p.id === unit.propertyId);
            const landlord = property?.landlordId ? landlords.find(l => l.id === property.landlordId) : undefined;

            setPreviewLoadingId(inv.id);
            try {
                const dataUri = await pdfService.generatePMInvoicePdfDataUri(
                    inv, tenant, unit, currentInstitution, companyDetails, currentInstitution.logoUrl || null, landlord,
                    pmSettings?.branding?.letterheadUrl || null
                );
                setPreviewPdfUrl(dataUri);
                setPreviewPdfTitle(`Invoice ${inv.invoiceNumber}`);
                setShowPdfPreview(true);
            } catch (err) {
                alert("Failed to generate PDF preview.");
            } finally {
                setPreviewLoadingId(null);
            }
        };

        const handleDownload = async (inv: PMInvoice) => {
            const tenant = tenants.find(t => t.id === inv.tenantId);
            const unit = units.find(u => u.id === inv.unitId);
            if (!tenant || !unit) return alert("Tenant or Unit data missing.");

            const property = properties.find(p => p.id === unit.propertyId);
            const landlord = property?.landlordId ? landlords.find(l => l.id === property.landlordId) : undefined;

            try {
                const dataUri = await pdfService.generatePMInvoicePdfDataUri(
                    inv, tenant, unit, currentInstitution, companyDetails, currentInstitution.logoUrl || null, landlord,
                    pmSettings?.branding?.letterheadUrl || null
                );
                const link = document.createElement('a');
                link.href = dataUri;
                link.download = `Invoice-${inv.invoiceNumber}.pdf`;
                link.click();
            } catch (err) { alert("Failed to generate PDF."); }
        };

        const handleSend = async (inv: PMInvoice) => {
            const tenant = tenants.find(t => t.id === inv.tenantId);
            const unit = units.find(u => u.id === inv.unitId);
            if (!tenant || !unit) return alert("Tenant data missing.");

            const property = properties.find(p => p.id === unit.propertyId);
            const landlord = property?.landlordId ? landlords.find(l => l.id === property.landlordId) : undefined;

            try {
                const dataUri = await pdfService.generatePMInvoicePdfDataUri(
                    inv, tenant, unit, currentInstitution, companyDetails, currentInstitution.logoUrl || null, landlord,
                    pmSettings?.branding?.letterheadUrl || null
                );
                const blob = dataURItoBlob(dataUri);
                const fileName = `pm/invoices/${inv.invoiceNumber}.pdf`;
                
                let publicUrl = '';
                try {
                    publicUrl = await apiService.uploadBlob(fileName, blob, 'application/pdf');
                } catch (uploadErr) {
                    console.warn("Invoice PDF upload failed, sending notification without attachment", uploadErr);
                }
                
                if (tenant.phoneNumber) {
                    let shortUrl = publicUrl;
                    if (publicUrl) {
                        try {
                            shortUrl = await apiService.shortenUrl(publicUrl);
                        } catch (shortErr) {
                            console.warn("Failed to shorten invoice URL", shortErr);
                        }
                    }
                    const msg = publicUrl 
                        ? `Dear ${tenant.name}, your rent invoice #${inv.invoiceNumber} for KES ${inv.amount?.toLocaleString()} is ready. View here: ${shortUrl} `
                        : `Dear ${tenant.name}, your rent invoice #${inv.invoiceNumber} for KES ${inv.amount?.toLocaleString()} is ready. (PDF link temporarily unavailable)`;
                    await apiService.sendSms(tenant.phoneNumber, msg, currentInstitution.smsConfig, 1, institutionId);
                    alert(publicUrl ? "Invoice link sent via SMS!" : "Invoice notification sent via SMS! (PDF link unavailable due to storage connection issues)");
                }
            } catch (err) { alert("Failed to send invoice."); }
        };

        const handleBulkSendInvoices = async () => {
            const unsentInvoices = filteredInvoices.filter(inv => inv.status !== 'Paid');
            if (unsentInvoices.length === 0) {
                return alert("No unpaid invoices found in the current list to send.");
            }

            if (!confirm(`Are you sure you want to generate and send ${unsentInvoices.length} invoices via SMS?`)) return;

            setSendingBulk(true);
            let successCount = 0;
            let failCount = 0;

            try {
                for (const inv of unsentInvoices) {
                    const tenant = tenants.find(t => t.id === inv.tenantId);
                    const unit = units.find(u => u.id === inv.unitId);
                    if (!tenant || !unit || !tenant.phoneNumber) {
                        failCount++;
                        continue;
                    }

                    const property = properties.find(p => p.id === unit.propertyId);
                    const landlord = property?.landlordId ? landlords.find(l => l.id === property.landlordId) : undefined;

                    try {
                        const dataUri = await pdfService.generatePMInvoicePdfDataUri(
                            inv, tenant, unit, currentInstitution, companyDetails, currentInstitution.logoUrl || null, landlord,
                            pmSettings?.branding?.letterheadUrl || null
                        );
                        const blob = dataURItoBlob(dataUri);
                        const fileName = `pm/invoices/${inv.invoiceNumber}.pdf`;
                        
                        let publicUrl = '';
                        try {
                            publicUrl = await apiService.uploadBlob(fileName, blob, 'application/pdf');
                        } catch (uploadErr) {
                            console.warn(`Bulk send: PDF upload failed for invoice #${inv.invoiceNumber}`, uploadErr);
                        }
                        
                        let shortUrl = publicUrl;
                        if (publicUrl) {
                            try {
                                shortUrl = await apiService.shortenUrl(publicUrl);
                            } catch (shortErr) {
                                console.warn("Failed to shorten bulk invoice URL", shortErr);
                            }
                        }
                        const msg = publicUrl
                            ? `Dear ${tenant.name}, your rent invoice #${inv.invoiceNumber} for KES ${inv.amount?.toLocaleString()} is ready. View here: ${shortUrl} `
                            : `Dear ${tenant.name}, your rent invoice #${inv.invoiceNumber} for KES ${inv.amount?.toLocaleString()} is ready. (PDF link temporarily unavailable)`;
                        await apiService.sendSms(tenant.phoneNumber, msg, currentInstitution.smsConfig, 1, institutionId);
                        successCount++;
                    } catch (err) {
                        console.error(`Failed to send invoice #${inv.invoiceNumber} to ${tenant.name}:`, err);
                        failCount++;
                    }
                }
                alert(`Bulk invoice send complete!\nSuccessfully sent: ${successCount}\nFailed: ${failCount}`);
                loadData();
            } catch (error) {
                console.error("Error in bulk invoice dispatch:", error);
                alert("Bulk invoice send encountered an error.");
            } finally {
                setSendingBulk(false);
            }
        };

        const handleBulkDeleteInvoices = async () => {
            if (selectedInvoiceIds.length === 0) return;
            if (!confirm(`Are you sure you want to delete ${selectedInvoiceIds.length} selected invoice(s)? This action cannot be undone.`)) return;

            // Optimistically remove from UI immediately
            const deletedSet = new Set(selectedInvoiceIds);
            const prevInvoices = invoices;
            setInvoices(prev => prev.filter(inv => !deletedSet.has(inv.id)));
            setSelectedInvoiceIds([]);

            try {
                const chunks: string[][] = [];
                for (let i = 0; i < selectedInvoiceIds.length; i += 50) {
                    chunks.push(selectedInvoiceIds.slice(i, i + 50));
                }

                for (const chunk of chunks) {
                    await apiService.deleteModuleRecord('pm_invoices', chunk.join(','));
                }

                alert(`Successfully deleted ${prevInvoices.filter(inv => deletedSet.has(inv.id)).length} invoice(s).`);
                loadData();
            } catch (e: any) {
                // Restore on failure
                setInvoices(prevInvoices);
                setSelectedInvoiceIds(Array.from(deletedSet));
                alert(e.message || "Failed to delete invoices.");
                console.error(e);
            }
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm gap-4 items-center flex-wrap">
                    <div className="flex flex-1 items-center gap-4 min-w-[200px]">
                        <SearchIcon className="w-5 h-5 text-slate-400 ml-2" />
                        <input 
                            type="search" 
                            placeholder="Search invoices by number or tenant name..."
                            className="flex-1 bg-transparent font-bold outline-none text-sm dark:text-white"
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </div>
                    
                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</label>
                        <select 
                            value={statusFilter} 
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                        >
                            <option value="all">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* Month Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Month</label>
                        <select 
                            value={monthFilter} 
                            onChange={(e) => handleMonthChange(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                        >
                            <option value="all">All Months</option>
                            {uniqueMonths.map(m => (
                                <option key={m} value={m}>{formatMonthYear(m)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Property Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Property</label>
                        <select 
                            value={propertyFilter} 
                            onChange={(e) => handlePropertyChange(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs font-bold outline-none max-w-[150px] truncate dark:text-white"
                        >
                            <option value="all">All Properties</option>
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort Order Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sort By</label>
                        <select 
                            value={sortOrder} 
                            onChange={(e) => handleSortChange(e.target.value as any)}
                            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                        >
                            <option value="default">Default</option>
                            <option value="amount_desc">Amount (Highest to Lowest)</option>
                            <option value="amount_asc">Amount (Lowest to Highest)</option>
                        </select>
                    </div>

                    <div className="flex gap-2 ml-auto">
                        {selectedInvoiceIds.length > 0 && (
                            <button
                                onClick={handleBulkDeleteInvoices}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] py-3.5 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-rose-600/10 shrink-0"
                            >
                                <TrashIcon className="w-4.5 h-4.5" />
                                Delete Selected ({selectedInvoiceIds.length})
                            </button>
                        )}
                        <button
                            onClick={() => setShowGenerateArrearsModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] py-3.5 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-blue-600/10 shrink-0"
                        >
                            <DocumentTextIcon className="w-4.5 h-4.5" />
                            Generate Rent & Arrears
                        </button>
                        {filteredInvoices.length > 0 && (
                            <button
                                onClick={handleBulkSendInvoices}
                                disabled={sendingBulk}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black uppercase tracking-widest text-[10px] py-3.5 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-emerald-600/10 shrink-0"
                            >
                                <PaperAirplaneIcon className="w-4.5 h-4.5" />
                                {sendingBulk ? "Sending..." : "Bulk Send via SMS"}
                            </button>
                        )}
                    </div>
                </div>
                {/* Invoice Count */}
                <div className="flex items-center justify-between px-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
                        {filteredInvoices.length > 0 && ` — showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredInvoices.length)}`}
                    </p>
                </div>

                {/* List Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className="grid grid-cols-[40px_minmax(0,1.5fr)_minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-x-2 px-5 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center">
                            <input 
                                type="checkbox"
                                checked={pagedInvoices.length > 0 && pagedInvoices.every(inv => selectedInvoiceIds.includes(inv.id))}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        const toAdd = pagedInvoices.map(inv => inv.id);
                                        setSelectedInvoiceIds(prev => Array.from(new Set([...prev, ...toAdd])));
                                    } else {
                                        const toRemove = pagedInvoices.map(inv => inv.id);
                                        setSelectedInvoiceIds(prev => prev.filter(id => !toRemove.includes(id)));
                                    }
                                }}
                                className="rounded border-slate-300 dark:border-slate-650 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice #</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tenant</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unit</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Month</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">B/F (KES)</div>
                        <button 
                            onClick={() => {
                                if (sortOrder === 'amount_desc') {
                                    handleSortChange('amount_asc');
                                } else {
                                    handleSortChange('amount_desc');
                                }
                            }}
                            className="w-full text-right text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-white outline-none flex items-center justify-end gap-1"
                        >
                            Rent (KES) {sortOrder === 'amount_desc' ? '▼' : sortOrder === 'amount_asc' ? '▲' : ''}
                        </button>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total Due</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Due Date</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</div>
                    </div>

                    {/* Rows */}
                    {pagedInvoices.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-slate-400 font-bold text-sm">No invoices found</p>
                            <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">Try adjusting your filters or generate new invoices</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {pagedInvoices.map(inv => {
                                const tenant = tenants.find(t => t.id === inv.tenantId);
                                const unit = units.find(u => u.id === inv.unitId);
                                const bf = inv.openingBalance || 0;
                                const rent = inv.amount || 0;
                                const totalDue = rent + bf;
                                const monthName = getMonthName(inv.dueDate);
                                return (
                                    <div key={inv.id} className="grid grid-cols-[40px_minmax(0,1.5fr)_minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-x-2 px-5 py-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                                        {/* Checkbox */}
                                        <div className="flex items-center">
                                            <input 
                                                type="checkbox"
                                                checked={selectedInvoiceIds.includes(inv.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedInvoiceIds(prev => [...prev, inv.id]);
                                                    } else {
                                                        setSelectedInvoiceIds(prev => prev.filter(id => id !== inv.id));
                                                    }
                                                }}
                                                className="rounded border-slate-300 dark:border-slate-650 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                            />
                                        </div>
                                        {/* Invoice # */}
                                        <div>
                                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">{inv.invoiceNumber}</span>
                                        </div>

                                        {/* Tenant */}
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{tenant?.name || '—'}</p>
                                        </div>

                                        {/* Unit */}
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-blue-600 truncate">{unit?.unitNumber || '—'}</p>
                                        </div>

                                        {/* Month */}
                                        <div>
                                            <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wide">{monthName}</p>
                                        </div>

                                        {/* B/F */}
                                        <div className="text-right">
                                            {bf > 0 ? (
                                                <p className="text-xs font-black text-rose-500 italic">{bf.toLocaleString()}</p>
                                            ) : (
                                                <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600">—</p>
                                            )}
                                        </div>

                                        {/* Rent */}
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{rent.toLocaleString()}</p>
                                        </div>

                                        {/* Total Due */}
                                        <div className="text-right">
                                            <p className={`text-xs font-black italic ${totalDue > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{totalDue.toLocaleString()}</p>
                                            {bf > 0 && (
                                                <p className="text-[8px] text-rose-400 font-bold">incl. arrears</p>
                                            )}
                                        </div>

                                        {/* Status */}
                                        <div className="flex justify-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                                                inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' :
                                                inv.status === 'Overdue' ? 'bg-rose-100 text-rose-600' :
                                                inv.status === 'Cancelled' ? 'bg-slate-100 text-slate-500' :
                                                'bg-blue-100 text-blue-600'
                                            }`}>{inv.status}</span>
                                        </div>

                                        {/* Due Date */}
                                        <div className="text-center">
                                            <p className="text-[10px] font-bold text-slate-500 whitespace-nowrap">{formatDisplayDate(inv.dueDate)}</p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            {inv.withholdingStatus === 'submitted' && (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedInvoiceForWhtReview(inv);
                                                        setShowWhtReviewModal(true);
                                                    }} 
                                                    title="Verify Withholding Tax Certificate" 
                                                    className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-600 hover:text-white transition-all animate-pulse"
                                                >
                                                    <CheckCircleIcon className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handlePreview(inv)} 
                                                title="Preview on Screen" 
                                                disabled={previewLoadingId === inv.id}
                                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                                            >
                                                {previewLoadingId === inv.id ? (
                                                    <ArrowPathIcon className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <EyeIcon className="w-3 h-3" />
                                                )}
                                            </button>
                                            <button onClick={() => handleDownload(inv)} title="Download" className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-blue-600 hover:text-white transition-all">
                                                <DownloadIcon className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => handleSend(inv)} title="Send via SMS" className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-emerald-600 hover:text-white transition-all">
                                                <PaperAirplaneIcon className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => { setEditingInvoice(inv); setShowInvoiceModal(true); }} title="Edit" className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-orange-500 hover:text-white transition-all">
                                                <PencilIcon className="w-3 h-3" />
                                            </button>
                                            <button onClick={async () => {
                                                if (confirm("Delete this invoice?")) {
                                                    // Optimistically remove from UI
                                                    const prevInvoices = invoices;
                                                    setInvoices(prev => prev.filter(i => i.id !== inv.id));
                                                    try {
                                                        await apiService.deleteModuleRecord('pm_invoices', inv.id);
                                                        loadData();
                                                    } catch (e: any) {
                                                        setInvoices(prevInvoices);
                                                        alert(e.message || "Failed to delete invoice.");
                                                    }
                                                }
                                            }} title="Delete" className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-rose-600 hover:text-white transition-all">
                                                <TrashIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-2 py-1">
                        <p className="text-xs font-bold text-slate-400">Page {page} of {totalPages}</p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(1)}
                                disabled={page === 1}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500 disabled:opacity-30 hover:bg-indigo-600 hover:text-white transition-all"
                            >«</button>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500 disabled:opacity-30 hover:bg-indigo-600 hover:text-white transition-all"
                            >‹ Prev</button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                                const p = start + i;
                                return p <= totalPages ? (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                                            p === page
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'
                                        }`}
                                    >{p}</button>
                                ) : null;
                            })}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500 disabled:opacity-30 hover:bg-indigo-600 hover:text-white transition-all"
                            >Next ›</button>
                            <button
                                onClick={() => setPage(totalPages)}
                                disabled={page === totalPages}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500 disabled:opacity-30 hover:bg-indigo-600 hover:text-white transition-all"
                            >»</button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const handleSaveNotice = async (data: Partial<PMNoticeLetter>) => {
        try {
            const lease = leases.find(l => l.id === data.leaseId);
            const tenant = tenants.find(t => t.id === (lease?.tenantId || data.tenantId));
            const unit = units.find(u => u.id === lease?.unitId);

            if (!tenant || !unit) {
                alert("Associated tenant or unit record not found.");
                return;
            }

            const n: PMNoticeLetter = {
                id: `notice_${Date.now()}`,
                leaseId: data.leaseId || '',
                tenantId: tenant.id,
                noticeType: data.noticeType || 'Custom Warning',
                issueDate: data.issueDate || new Date().toISOString().split('T')[0],
                effectiveDate: data.effectiveDate || '',
                subject: data.subject || '',
                messageBody: data.messageBody || '',
                status: 'Issued',
                institutionId,
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('pm_notices', n);

            // Generate and open PDF preview
            const dataUri = await pdfService.generatePMNoticeLetterPdf(
                n, tenant, unit, currentInstitution, companyDetails, currentInstitution.logoUrl || null,
                pmSettings?.branding?.letterheadUrl || null
            );
            
            // Email Delivery
            if (tenant.email) {
                const base64Data = dataUri.split(',')[1];
                const emailSubject = `Notice: ${n.subject}`;
                const emailBody = `Dear ${tenant.name},\n\nPlease find attached the official formal notice regarding "${n.subject}" issued on ${n.issueDate} for Unit ${unit.unitNumber}.\n\nBest Regards,\nProperty Management`;
                const emailConfig = getInstitutionEmailConfig(currentInstitution, currentInstitution.emailConfig);
                
                apiService.sendEmail(
                    tenant.email,
                    emailSubject,
                    emailBody,
                    emailConfig,
                    undefined,
                    [{ filename: `Notice_${n.id.substring(0, 8)}.pdf`, content: base64Data, encoding: 'base64' }]
                ).then(() => {
                    console.log(`Notice email sent successfully to ${tenant.email}`);
                }).catch(emailErr => {
                    console.error("Failed to send notice email to tenant:", emailErr);
                });
            }

            // SMS Delivery
            if (tenant.phoneNumber) {
                try {
                    const blob = dataURItoBlob(dataUri);
                    const fileName = `notices/Notice_${n.id.trim()}.pdf`;
                    let publicUrl = '';
                    let shortUrl = '';
                    try {
                        publicUrl = await apiService.uploadBlob(fileName, blob, 'application/pdf');
                        shortUrl = await apiService.shortenUrl(publicUrl);
                    } catch (uploadErr) {
                        console.warn("Supabase upload failed, sending SMS warning without link", uploadErr);
                    }
                    
                    const smsMessage = publicUrl 
                        ? `Dear ${tenant.name}, you have been issued a formal ${n.noticeType} notice. Subject: ${n.subject}. Effective date: ${n.effectiveDate}. View notice letter here: ${shortUrl} `
                        : `Dear ${tenant.name}, you have been issued a formal ${n.noticeType} notice. Subject: ${n.subject}. Effective date: ${n.effectiveDate}. Please check your email for the copy.`;
                    
                    apiService.sendSms(
                        tenant.phoneNumber, 
                        smsMessage, 
                        currentInstitution.smsConfig, 
                        1, 
                        currentInstitution.id!
                    ).then(() => {
                        console.log(`Notice SMS sent successfully to ${tenant.phoneNumber}`);
                    }).catch(smsErr => {
                        console.error("Failed to send notice SMS alert:", smsErr);
                    });
                } catch (smsErr) {
                    console.warn("SMS processing failed:", smsErr);
                }
            }

            setPreviewPdfUrl(dataUri);
            setPreviewPdfTitle(`${n.noticeType} - ${tenant.name}`);
            setShowPdfPreview(true);

            setShowNoticeModal(false);
            alert("Notice letter generated and alerts dispatched successfully!");
            loadData();
        } catch (e: any) {
            alert(e.message || "Failed to issue notice.");
        }
    };

    const handleSaveUtilityReading = async (data: Partial<PMUtilityReading>) => {
        try {
            const r: PMUtilityReading = {
                id: `reading_${Date.now()}`,
                propertyId: data.propertyId || '',
                unitId: data.unitId || '',
                utilityType: data.utilityType as any || 'Water',
                previousReading: Number(data.previousReading || 0),
                currentReading: Number(data.currentReading || 0),
                ratePerUnit: Number(data.ratePerUnit || 0),
                consumption: Number(data.currentReading || 0) - Number(data.previousReading || 0),
                amount: (Number(data.currentReading || 0) - Number(data.previousReading || 0)) * Number(data.ratePerUnit || 0),
                readingDate: data.readingDate || new Date().toISOString().split('T')[0],
                billingStatus: 'Pending',
                institutionId,
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('pm_utility_readings', r);
            setShowUtilityModal(false);
            alert("Utility reading logged successfully!");
            loadData();
        } catch (e: any) {
            alert(e.message || "Failed to log utility reading.");
        }
    };

    const handleRenewLease = async (data: { leaseId: string; endDate: string; newRent: number; escalationPercentage: number }) => {
        try {
            const oldLease = leases.find(l => l.id === data.leaseId);
            if (!oldLease) {
                alert("Old lease record not found.");
                return;
            }

            // Create renewed lease record
            const newLease: PMLease = {
                ...oldLease,
                id: `lease_${Date.now()}`,
                startDate: new Date().toISOString().split('T')[0],
                endDate: data.endDate,
                rentAmount: data.newRent,
                depositAmount: oldLease.depositAmount,
                status: 'Active',
                escalationPercentage: data.escalationPercentage,
                renewedFromLeaseId: oldLease.id,
                leaseNumber: oldLease.leaseNumber ? `${oldLease.leaseNumber}-R` : undefined,
                createdAt: new Date().toISOString()
            };

            // Terminate/Expire old lease
            const updatedOldLease: PMLease = {
                ...oldLease,
                status: 'Expired'
            };

            // Save both
            await apiService.saveModuleRecord('pm_leases', updatedOldLease);
            await apiService.saveModuleRecord('pm_leases', newLease);

            alert("Lease successfully renewed with rent escalation applied!");
            setShowRenewModal(false);
            setRenewingLease(null);
            loadData();
        } catch (e: any) {
            alert(e.message || "Failed to renew lease.");
        }
    };

    const NoticesTab = () => {
        const [search, setSearch] = useState('');
        const [typeFilter, setTypeFilter] = useState('all');
        const [statusFilter, setStatusFilter] = useState('all');

        const filteredNotices = notices.filter(n => {
            const lease = leases.find(l => l.id === n.leaseId);
            const tenant = tenants.find(t => t.id === (lease?.tenantId || n.tenantId));
            const tenantName = tenant?.name || '';
            const matchesSearch = tenantName.toLowerCase().includes(search.toLowerCase());
            const matchesType = typeFilter === 'all' || n.noticeType === typeFilter;
            const matchesStatus = statusFilter === 'all' || n.status === statusFilter;
            return matchesSearch && matchesType && matchesStatus;
        });

        const handleViewNoticePdf = async (notice: PMNoticeLetter) => {
            try {
                const lease = leases.find(l => l.id === notice.leaseId);
                const tenant = tenants.find(t => t.id === (lease?.tenantId || notice.tenantId));
                const unit = units.find(u => u.id === lease?.unitId);
                if (!tenant || !unit) {
                    alert("Associated tenant or unit record not found.");
                    return;
                }
                const dataUri = await pdfService.generatePMNoticeLetterPdf(
                    notice, tenant, unit, currentInstitution, companyDetails, currentInstitution.logoUrl || null,
                    pmSettings?.branding?.letterheadUrl || null
                );
                setPreviewPdfUrl(dataUri);
                setPreviewPdfTitle(`${notice.noticeType} - ${tenant.name}`);
                setShowPdfPreview(true);
            } catch (e: any) {
                alert("Failed to render PDF preview: " + e.message);
            }
        };

        const handleResendNoticeAlerts = async (notice: PMNoticeLetter) => {
            try {
                const lease = leases.find(l => l.id === notice.leaseId);
                const tenant = tenants.find(t => t.id === (lease?.tenantId || notice.tenantId));
                const unit = units.find(u => u.id === lease?.unitId);
                if (!tenant || !unit) {
                    alert("Associated tenant or unit record not found.");
                    return;
                }
                const dataUri = await pdfService.generatePMNoticeLetterPdf(
                    notice, tenant, unit, currentInstitution, companyDetails, currentInstitution.logoUrl || null,
                    pmSettings?.branding?.letterheadUrl || null
                );
                
                // Email
                if (tenant.email) {
                    const base64Data = dataUri.split(',')[1];
                    const emailSubject = `Notice: ${notice.subject}`;
                    const emailBody = `Dear ${tenant.name},\n\nPlease find attached the official formal notice regarding "${notice.subject}" issued on ${notice.issueDate} for Unit ${unit.unitNumber}.\n\nBest Regards,\nProperty Management`;
                    const emailConfig = getInstitutionEmailConfig(currentInstitution, currentInstitution.emailConfig);
                    await apiService.sendEmail(
                        tenant.email,
                        emailSubject,
                        emailBody,
                        emailConfig,
                        undefined,
                        [{ filename: `Notice_${notice.id.substring(0, 8)}.pdf`, content: base64Data, encoding: 'base64' }]
                    );
                    alert("Notice email resent successfully to " + tenant.email);
                }

                // SMS
                if (tenant.phoneNumber) {
                    const blob = dataURItoBlob(dataUri);
                    const fileName = `notices/Notice_${notice.id.trim()}.pdf`;
                    let publicUrl = '';
                    let shortUrl = '';
                    try {
                        publicUrl = await apiService.uploadBlob(fileName, blob, 'application/pdf');
                        shortUrl = await apiService.shortenUrl(publicUrl);
                    } catch (uploadErr) {
                        console.warn("Supabase upload failed, sending SMS warning without link", uploadErr);
                    }
                    
                    const smsMessage = publicUrl 
                        ? `Dear ${tenant.name}, you have been issued a formal ${notice.noticeType} notice. Subject: ${notice.subject}. Effective date: ${notice.effectiveDate}. View notice letter here: ${shortUrl} `
                        : `Dear ${tenant.name}, you have been issued a formal ${notice.noticeType} notice. Subject: ${notice.subject}. Effective date: ${notice.effectiveDate}. Please check your email for the copy.`;
                    
                    await apiService.sendSms(
                        tenant.phoneNumber, 
                        smsMessage, 
                        currentInstitution.smsConfig, 
                        1, 
                        currentInstitution.id!
                    );
                    alert("Notice SMS alert sent successfully to " + tenant.phoneNumber);
                }
            } catch (e: any) {
                alert("Failed to send notice: " + e.message);
            }
        };

        const handleUpdateNoticeStatus = async (notice: PMNoticeLetter, newStatus: PMNoticeStatus) => {
            try {
                const updated = { ...notice, status: newStatus };
                await apiService.saveModuleRecord('pm_notices', updated);
                alert("Notice status updated to " + newStatus);
                loadData();
            } catch (e: any) {
                alert("Failed to update status: " + e.message);
            }
        };

        const handleDeleteNotice = async (id: string) => {
            if (!confirm("Are you sure you want to delete this notice record? This action cannot be undone.")) return;
            try {
                await apiService.deleteModuleRecord('pm_notices', id);
                alert("Notice deleted successfully.");
                loadData();
            } catch (e: any) {
                alert("Failed to delete notice: " + e.message);
            }
        };

        return (
            <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl p-8 flex flex-col md:flex-row gap-6 justify-between items-center">
                    <div className="relative w-full md:max-w-md">
                        <SearchIcon className="absolute left-4 top-4.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-55 dark:bg-slate-900/50 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-colors dark:text-white"
                            placeholder="Search by Tenant Name..."
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl px-6 py-4 text-xs font-bold outline-none dark:text-white transition-colors"
                        >
                            <option value="all">All Notice Types</option>
                            <option value="Vacate">Vacate</option>
                            <option value="Late Rent Warning">Late Rent Warning</option>
                            <option value="Lease Non-Renewal">Lease Non-Renewal</option>
                            <option value="Custom Warning">Custom Warning</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl px-6 py-4 text-xs font-bold outline-none dark:text-white transition-colors"
                        >
                            <option value="all">All Statuses</option>
                            <option value="Draft">Draft</option>
                            <option value="Issued">Issued</option>
                            <option value="Acknowledged">Acknowledged</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-slate-50 dark:border-slate-700">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Notice Transmission Log</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <th className="p-6">Issue Date</th>
                                    <th className="p-6">Tenant / Unit</th>
                                    <th className="p-6">Notice Type</th>
                                    <th className="p-6">Subject</th>
                                    <th className="p-6">Vacate/Effective Date</th>
                                    <th className="p-6">Status</th>
                                    <th className="p-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredNotices.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                                            No notices found matching filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredNotices.map(notice => {
                                        const lease = leases.find(l => l.id === notice.leaseId);
                                        const tenant = tenants.find(t => t.id === (lease?.tenantId || notice.tenantId));
                                        const unit = units.find(u => u.id === lease?.unitId);
                                        const property = unit ? properties.find(p => p.id === unit.propertyId) : null;

                                        return (
                                            <tr key={notice.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                                <td className="p-6 font-bold text-slate-600 dark:text-slate-355">
                                                    {new Date(notice.issueDate).toLocaleDateString()}
                                                </td>
                                                <td className="p-6">
                                                    <p className="font-black text-slate-800 dark:text-white">{tenant?.name || 'N/A'}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">{property?.name || 'N/A'} - Unit {unit?.unitNumber || 'N/A'}</p>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        notice.noticeType === 'Vacate' ? 'bg-rose-50 text-rose-600 dark:bg-rose-955/30' :
                                                        notice.noticeType === 'Late Rent Warning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-955/30' :
                                                        'bg-blue-50 text-blue-600 dark:bg-blue-955/30'
                                                    }`}>
                                                        {notice.noticeType}
                                                    </span>
                                                </td>
                                                <td className="p-6 font-bold text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                                                    {notice.subject}
                                                </td>
                                                <td className="p-6 font-bold text-slate-600 dark:text-slate-355">
                                                    {new Date(notice.effectiveDate).toLocaleDateString()}
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        notice.status === 'Acknowledged' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-955/30' :
                                                        notice.status === 'Issued' ? 'bg-blue-50 text-blue-600 dark:bg-blue-955/30' :
                                                        'bg-slate-50 text-slate-500 dark:bg-slate-900/50'
                                                    }`}>
                                                        {notice.status}
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex gap-2 justify-end">
                                                        {notice.noticeType === 'Vacate' && (
                                                            <button
                                                                onClick={() => setSelectedVacateNotice(notice)}
                                                                className="p-2 bg-slate-50 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-955/30 rounded-xl text-slate-400 hover:text-rose-650 transition-colors"
                                                                title="View Vacation Details"
                                                            >
                                                                <ListIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleViewNoticePdf(notice)}
                                                            className="p-2 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-955/30 rounded-xl text-slate-400 hover:text-indigo-650 transition-colors"
                                                            title="View PDF"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleResendNoticeAlerts(notice)}
                                                            className="p-2 bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-955/30 rounded-xl text-slate-400 hover:text-emerald-650 transition-colors"
                                                            title="Resend Alerts"
                                                        >
                                                            <PaperAirplaneIcon className="w-4 h-4" />
                                                        </button>
                                                        {notice.status === 'Issued' && (
                                                            <button
                                                                onClick={() => handleUpdateNoticeStatus(notice, 'Acknowledged')}
                                                                className="p-2 bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-955/30 rounded-xl text-slate-400 hover:text-emerald-650 transition-colors"
                                                                title="Mark Acknowledged"
                                                            >
                                                                <CheckCircleIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteNotice(notice.id)}
                                                            className="p-2 bg-rose-50/50 dark:bg-rose-955/20 hover:bg-rose-100 rounded-xl text-rose-600 transition-colors"
                                                            title="Delete Notice"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const UtilitiesTab = () => {
        const [search, setSearch] = useState('');
        const [typeFilter, setTypeFilter] = useState('all');
        const [statusFilter, setStatusFilter] = useState('all');

        const filteredReadings = utilityReadings.filter(r => {
            const property = properties.find(p => p.id === r.propertyId);
            const unit = units.find(u => u.id === r.unitId);
            const propertyName = property?.name || '';
            const unitNum = unit?.unitNumber || '';
            const matchesSearch = propertyName.toLowerCase().includes(search.toLowerCase()) || unitNum.toLowerCase().includes(search.toLowerCase());
            const matchesType = typeFilter === 'all' || r.utilityType === typeFilter;
            const matchesStatus = statusFilter === 'all' || r.billingStatus === statusFilter;
            return matchesSearch && matchesType && matchesStatus;
        });

        const handleGenerateUtilityInvoice = async (reading: PMUtilityReading) => {
            try {
                // Find active lease for the unit
                const activeLease = leases.find(l => l.unitId === reading.unitId && l.status === 'Active');
                if (!activeLease) {
                    alert("No active lease found for this unit. An active lease is required to bill a tenant.");
                    return;
                }
                const tenant = tenants.find(t => t.id === activeLease.tenantId);
                if (!tenant) {
                    alert("Associated tenant record not found.");
                    return;
                }

                if (!confirm(`Generate utility invoice of KES ${reading.amount} for Unit ${units.find(u => u.id === reading.unitId)?.unitNumber || ''} (${tenant.name})?`)) return;

                const invoiceId = 'inv_' + Math.random().toString(36).substr(2, 9);
                const invNum = `INV-UTL-${Math.floor(100000 + Math.random() * 900000)}`;
                const newInvoice: PMInvoice = {
                    id: invoiceId,
                    invoiceNumber: invNum,
                    leaseId: activeLease.id,
                    tenantId: activeLease.tenantId,
                    unitId: reading.unitId || '',
                    description: `${reading.utilityType} Utility Bill (Reading: ${reading.previousReading} to ${reading.currentReading}, Consumption: ${reading.consumption} @ KES ${reading.ratePerUnit})`,
                    amount: reading.amount,
                    status: 'Sent',
                    issueDate: new Date().toISOString().split('T')[0],
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    institutionId: institutionId,
                    createdAt: new Date().toISOString()
                };

                // Save invoice
                await apiService.saveModuleRecord('pm_invoices', newInvoice);

                // Update utility reading to 'Billed'
                const updatedReading = { ...reading, billingStatus: 'Billed' as const, invoiceId };
                await apiService.saveModuleRecord('pm_utility_readings', updatedReading);

                alert("Utility invoice generated successfully!");
                loadData();
            } catch (e: any) {
                alert("Failed to generate utility invoice: " + e.message);
            }
        };

        const handleDeleteReading = async (id: string) => {
            if (!confirm("Are you sure you want to delete this utility reading record?")) return;
            try {
                await apiService.deleteModuleRecord('pm_utility_readings', id);
                alert("Reading record deleted successfully.");
                loadData();
            } catch (e: any) {
                alert("Failed to delete reading: " + e.message);
            }
        };

        return (
            <div className="space-y-8 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl p-8 flex flex-col md:flex-row gap-6 justify-between items-center">
                    <div className="relative w-full md:max-w-md">
                        <SearchIcon className="absolute left-4 top-4.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-colors dark:text-white"
                            placeholder="Search by Property or Unit..."
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl px-6 py-4 text-xs font-bold outline-none dark:text-white transition-colors"
                        >
                            <option value="all">All Utility Types</option>
                            <option value="Water">Water</option>
                            <option value="Electricity">Electricity</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl px-6 py-4 text-xs font-bold outline-none dark:text-white transition-colors"
                        >
                            <option value="all">All Billing Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Billed">Billed</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-slate-50 dark:border-slate-700">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Utility Consumption Log</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <th className="p-6">Reading Date</th>
                                    <th className="p-6">Property / Unit</th>
                                    <th className="p-6">Utility Type</th>
                                    <th className="p-6">Prev → Current</th>
                                    <th className="p-6 text-right">Consumption</th>
                                    <th className="p-6 text-right">Rate</th>
                                    <th className="p-6 text-right">Total Amount</th>
                                    <th className="p-6">Status</th>
                                    <th className="p-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReadings.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-12 text-center text-slate-400 font-bold">
                                            No utility reading records found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReadings.map(reading => {
                                        const unit = units.find(u => u.id === reading.unitId);
                                        const property = properties.find(p => p.id === reading.propertyId);
                                        return (
                                            <tr key={reading.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                                <td className="p-6 font-bold text-slate-600 dark:text-slate-300">
                                                    {new Date(reading.readingDate).toLocaleDateString()}
                                                </td>
                                                <td className="p-6">
                                                    <p className="font-black text-slate-800 dark:text-white">{property?.name || 'N/A'}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">Unit {unit?.unitNumber || 'N/A'}</p>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        reading.utilityType === 'Water' ? 'bg-blue-50 text-blue-600 dark:bg-blue-955/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-955/30'
                                                    }`}>
                                                        {reading.utilityType}
                                                    </span>
                                                </td>
                                                <td className="p-6 font-bold text-slate-600 dark:text-slate-300">
                                                    {reading.previousReading} → {reading.currentReading}
                                                </td>
                                                <td className="p-6 text-right font-black text-slate-700 dark:text-slate-350">
                                                    {reading.consumption}
                                                </td>
                                                <td className="p-6 text-right text-slate-600 dark:text-slate-400">
                                                    KES {reading.ratePerUnit}
                                                </td>
                                                <td className="p-6 text-right font-black text-slate-850 dark:text-slate-200">
                                                    KES {reading.amount.toLocaleString()}
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        reading.billingStatus === 'Billed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-955/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-955/30'
                                                    }`}>
                                                        {reading.billingStatus}
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex gap-2 justify-end">
                                                        {reading.billingStatus === 'Pending' && (
                                                            <button
                                                                onClick={() => handleGenerateUtilityInvoice(reading)}
                                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-colors"
                                                                title="Generate Invoice"
                                                            >
                                                                Bill Tenant
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteReading(reading.id)}
                                                            className="p-2 bg-rose-50/50 dark:bg-rose-955/20 hover:bg-rose-100 rounded-xl text-rose-600 transition-colors"
                                                            title="Delete Reading"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const BroadcastsTab = () => {
        const [selectedPropertyId, setSelectedPropertyId] = useState('all');
        const [broadcastMessage, setBroadcastMessage] = useState('');
        const [sendingBroadcast, setSendingBroadcast] = useState(false);

        // Get tenants with active leases and arrears
        const tenantsWithArrears = useMemo(() => {
            return leases.filter(l => l.status === 'Active').map(l => {
                const tenant = tenants.find(t => t.id === l.tenantId);
                const unit = units.find(u => u.id === l.unitId);
                const property = unit ? properties.find(p => p.id === unit.propertyId) : null;
                
                const tenantInvoices = invoices.filter(inv => inv.leaseId === l.id && inv.status !== 'Draft' && inv.status !== 'Cancelled');
                const tenantPayments = payments.filter(p => p.leaseId === l.id && p.status === 'Completed');
                
                const totalInvoiced = tenantInvoices.reduce((sum, inv) => sum + inv.amount, 0);
                const totalPaid = tenantPayments.reduce((sum, pay) => sum + pay.amount, 0);
                const balance = totalInvoiced - totalPaid;
                
                return {
                    lease: l,
                    tenant,
                    unit,
                    property,
                    balance
                };
            }).filter(item => item.tenant && item.balance > 0);
        }, [leases, tenants, units, properties, invoices, payments]);

        const handleSendBroadcast = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!broadcastMessage.trim()) {
                alert("Please enter a message to broadcast.");
                return;
            }

            const targets = leases.filter(l => {
                if (l.status !== 'Active') return false;
                if (selectedPropertyId === 'all') return true;
                const unit = units.find(u => u.id === l.unitId);
                return unit?.propertyId === selectedPropertyId;
            }).map(l => tenants.find(t => t.id === l.tenantId)).filter(t => t && t.phoneNumber);

            if (targets.length === 0) {
                alert("No active tenants with phone numbers found for the selected property filter.");
                return;
            }

            if (!confirm(`Are you sure you want to broadcast this SMS to ${targets.length} tenant(s)?`)) return;

            setSendingBroadcast(true);
            let successCount = 0;
            let failCount = 0;

            for (const t of targets) {
                try {
                    await apiService.sendSms(
                        t!.phoneNumber!,
                        broadcastMessage,
                        currentInstitution.smsConfig,
                        1,
                        currentInstitution.id!
                    );
                    successCount++;
                } catch (err) {
                    console.error(`Failed to send SMS to ${t!.name}:`, err);
                    failCount++;
                }
            }

            setSendingBroadcast(false);
            setBroadcastMessage('');
            alert(`Broadcast completed! Sent successfully to ${successCount} tenants. Failed: ${failCount}`);
        };

        const handleSendReminder = async (item: typeof tenantsWithArrears[0]) => {
            if (!item.tenant?.phoneNumber) {
                alert("This tenant does not have a registered phone number.");
                return;
            }

            const msg = `Dear ${item.tenant.name}, this is a friendly reminder that you have an outstanding balance of KES ${item.balance.toLocaleString()} for Unit ${item.unit?.unitNumber || 'N/A'}. Please settle this balance as soon as possible. Thank you.`;
            
            try {
                await apiService.sendSms(
                    item.tenant.phoneNumber,
                    msg,
                    currentInstitution.smsConfig,
                    1,
                    currentInstitution.id!
                );
                alert(`Arrears reminder SMS sent successfully to ${item.tenant.name}!`);
            } catch (e: any) {
                alert("Failed to send reminder SMS: " + e.message);
            }
        };

        const handleSendAllReminders = async () => {
            const targets = tenantsWithArrears.filter(item => item.tenant?.phoneNumber);
            if (targets.length === 0) {
                alert("No tenants with arrears and registered phone numbers found.");
                return;
            }

            if (!confirm(`Send automated arrears reminders to all ${targets.length} tenant(s)?`)) return;

            let successCount = 0;
            for (const item of targets) {
                try {
                    const msg = `Dear ${item.tenant!.name}, this is a friendly reminder that you have an outstanding balance of KES ${item.balance.toLocaleString()} for Unit ${item.unit?.unitNumber || 'N/A'}. Please settle this balance as soon as possible. Thank you.`;
                    await apiService.sendSms(
                        item.tenant!.phoneNumber!,
                        msg,
                        currentInstitution.smsConfig,
                        1,
                        currentInstitution.id!
                    );
                    successCount++;
                } catch (err) {
                    console.error("Failed to send auto reminder:", err);
                }
            }

            alert(`Automated reminders complete! Dispatched successfully to ${successCount} tenant(s).`);
        };

        return (
            <div className="space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl p-8">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tight mb-2">New SMS Broadcast</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Send custom SMS alerts to active residents</p>
                        
                        <form onSubmit={handleSendBroadcast} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Filter Property</label>
                                <select
                                    value={selectedPropertyId}
                                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-850 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs"
                                >
                                    <option value="all">All Properties</option>
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">SMS Message Body</label>
                                <textarea
                                    required
                                    rows={5}
                                    value={broadcastMessage}
                                    onChange={(e) => setBroadcastMessage(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-850 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs"
                                    placeholder="Type broadcast message here..."
                                    maxLength={320}
                                />
                                <div className="text-[9px] text-slate-400 font-bold text-right">
                                    {broadcastMessage.length} / 320 characters
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={sendingBroadcast}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <PaperAirplaneIcon className="w-4 h-4" /> {sendingBroadcast ? 'Sending...' : 'Send Broadcast'}
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl p-8 flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Late Payment Reminders</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Send SMS collection reminders to tenants with arrears</p>
                            </div>
                            {tenantsWithArrears.length > 0 && (
                                <button
                                    onClick={handleSendAllReminders}
                                    className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-600/20"
                                >
                                    Remind All ({tenantsWithArrears.length})
                                </button>
                            )}
                        </div>

                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="p-6">Tenant / Unit</th>
                                        <th className="p-6">Property</th>
                                        <th className="p-6 text-right">Outstanding Arrears</th>
                                        <th className="p-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tenantsWithArrears.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-12 text-center text-slate-400 font-bold">
                                                No tenants currently in arrears. All accounts up-to-date!
                                            </td>
                                        </tr>
                                    ) : (
                                        tenantsWithArrears.map(item => (
                                            <tr key={item.lease.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                                <td className="p-6">
                                                    <p className="font-black text-slate-800 dark:text-white">{item.tenant?.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">Unit {item.unit?.unitNumber || 'N/A'}</p>
                                                </td>
                                                <td className="p-6 font-bold text-slate-600 dark:text-slate-300">
                                                    {item.property?.name || 'N/A'}
                                                </td>
                                                <td className="p-6 text-right font-black text-rose-600 dark:text-rose-400 text-sm">
                                                    KES {item.balance.toLocaleString()}
                                                </td>
                                                <td className="p-6 text-right">
                                                    <button
                                                        onClick={() => handleSendReminder(item)}
                                                        className="px-4 py-2 bg-slate-50 dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-955/20 text-slate-500 hover:text-amber-600 rounded-xl font-bold transition-colors"
                                                    >
                                                        Send Reminder
                                                    </button>
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
        );
    };

    const MaintenanceTab = () => (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                {tickets.map(ticket => (
                    <div key={ticket.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl group hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                        <div className={`absolute top-0 right-10 w-12 h-2 rounded-b-full ${ticket.priority === 'Urgent' ? 'bg-rose-500 shadow-lg shadow-rose-500/50' : ticket.priority === 'High' ? 'bg-amber-500 shadow-lg shadow-amber-500/50' : 'bg-blue-500 shadow-lg shadow-blue-500/50'} `}></div>
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest italic ${ticket.status === 'Open' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>{ticket.status}</span>
                            <span className="text-[9px] font-mono text-slate-400">#{ticket.id.split('_')[1]}</span>
                        </div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic mb-2">{ticket.title}</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold leading-relaxed mb-6">{ticket.description}</p>
                        <div className="flex justify-between items-center pt-6 border-t border-slate-50 dark:border-slate-700">
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Assigned Unit</p>
                                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase italic">Unit {units.find(u => u.id === ticket.unitId)?.unitNumber || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Est. Cost</p>
                                <p className="text-sm font-black text-slate-900 dark:text-white italic">KES {(ticket.cost || 0)?.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const PayoutsTab = () => (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Landlord Disbursements</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Manage and process payout requests from landlords</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                        <tr>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Request Date</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Landlord</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Bank Details</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Amount (KES)</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Status</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {disbursements.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400 text-sm font-bold uppercase tracking-widest italic border-b-transparent">No payout requests found</td>
                            </tr>
                        ) : (
                            disbursements.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()).map(d => {
                                const landlord = landlords.find(l => l.id === d.landlordId);
                                return (
                                    <tr key={d.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                                        <td className="p-6 text-sm font-bold text-slate-600 dark:text-slate-300">{new Date(d.requestDate).toLocaleDateString()}</td>
                                        <td className="p-6">
                                            <div className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{landlord?.name || 'Unknown'}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{landlord?.phoneNumber}</div>
                                        </td>
                                        <td className="p-6 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">{d.bankDetails || landlord?.bankDetails || 'N/A'}</td>
                                        <td className="p-6 text-lg font-black text-slate-900 dark:text-white italic">KES {d.amount?.toLocaleString()}</td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic ${d.status === 'Paid' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                                                d.status === 'Pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' :
                                                    'bg-slate-100 text-slate-600 dark:bg-slate-700/50'
                                                } `}>
                                                {d.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            {d.status === 'Pending' && (
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm(`Mark KES ${d.amount?.toLocaleString()} as paid? This will update associated payment records.`)) return;
                                                        try {
                                                            const updatedDisb: PMDisbursement = {
                                                                ...d,
                                                                status: 'Paid',
                                                                processedDate: new Date().toISOString()
                                                            };
                                                            await apiService.saveModuleRecord('pm_disbursements', updatedDisb);

                                                            // Update associated payments to 'paid'
                                                            if (d.paymentIds && d.paymentIds.length > 0) {
                                                                await Promise.all(d.paymentIds.map(async pid => {
                                                                    const p = payments.find(pay => pay.id === pid);
                                                                    if (p) {
                                                                        await apiService.saveModuleRecord('pm_payments', {
                                                                            ...p,
                                                                            landlordPayoutStatus: 'paid'
                                                                        });
                                                                    }
                                                                }));
                                                            }

                                                            alert("Disbursement completed successfully.");
                                                            loadData();
                                                        } catch (err) {
                                                            console.error(err);
                                                            alert("Failed to process disbursement.");
                                                        }
                                                    }}
                                                    className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-800 transition-colors text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    Mark as Paid
                                                </button>
                                            )}
                                            {d.status === 'Paid' && (
                                                <span className="text-xs text-slate-400 font-bold italic">Processed on {new Date(d.processedDate || '').toLocaleDateString()}</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const ExpensesTab = () => {
        // Calculations
        const approvedAndPaid = expenses.filter(e => e.status === 'Approved' || e.status === 'Paid');
        const totalExpensesVal = approvedAndPaid.reduce((sum, e) => sum + e.amount, 0);
        
        const pendingVouchers = expenses.filter(e => e.status === 'Pending Approval');
        const totalPendingVal = pendingVouchers.reduce((sum, e) => sum + e.amount, 0);

        const currentMonthExpenses = approvedAndPaid.filter(e => {
            const date = new Date(e.paymentDate);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });
        const thisMonthOutflow = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

        // Filtering
        const filteredExpenses = expenses.filter(e => {
            const matchesSearch = e.voucherNumber.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
                e.payeeName.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
                (e.description || '').toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
                (e.reference || '').toLowerCase().includes(expenseSearchQuery.toLowerCase());

            const matchesCategory = expenseCategoryFilter === 'all' || e.category === expenseCategoryFilter;
            const matchesProperty = expensePropertyFilter === 'all' || e.propertyId === expensePropertyFilter;
            const matchesStatus = expenseStatusFilter === 'all' || e.status === expenseStatusFilter;

            return matchesSearch && matchesCategory && matchesProperty && matchesStatus;
        });

        // Pagination
        const totalExpensesPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
        const pagedExpenses = filteredExpenses.slice((expensePage - 1) * PAGE_SIZE, expensePage * PAGE_SIZE);

        const handlePrintVoucher = async (voucher: PMExpenseVoucher) => {
            try {
                const property = properties.find(p => p.id === voucher.propertyId);
                if (!property) return alert("Property not found for this voucher.");
                
                const unit = voucher.unitId ? (units.find(u => u.id === voucher.unitId) || null) : null;
                
                const dataUri = await pdfService.generatePMExpenseVoucherPdf(
                    voucher,
                    property,
                    unit,
                    currentInstitution,
                    companyDetails,
                    currentInstitution.logoUrl || null,
                    currentInstitution.letterheadConfig?.headerImageUrl || null
                );
                
                setPreviewPdfUrl(dataUri);
                setPreviewPdfTitle(`Payment_Voucher_${voucher.voucherNumber}`);
                setShowPdfPreview(true);
            } catch (err: any) {
                console.error("Voucher PDF Generation Error:", err);
                alert("Failed to render PDF preview: " + err.message);
            }
        };

        return (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Payment Vouchers & Expenses</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Record day-to-day asset expenses and print payment vouchers</p>
                    </div>
                    <button
                        onClick={() => setShowExpenseModal(true)}
                        className="bg-blue-600 hover:bg-blue-750 text-white font-black uppercase tracking-widest text-[9px] px-6 py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2 hover:scale-102"
                    >
                        <CurrencyIcon className="w-4 h-4" /> Record Expense Voucher
                    </button>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Outflow (Approved/Paid)</p>
                            <h4 className="text-2xl font-black text-slate-950 dark:text-white italic mt-1">KES {totalExpensesVal.toLocaleString()}</h4>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{approvedAndPaid.length} Vouchers</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center border border-emerald-100/50 dark:border-emerald-950/30">
                            <CurrencyIcon className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pending Vouchers Value</p>
                            <h4 className="text-2xl font-black text-slate-950 dark:text-white italic mt-1">KES {totalPendingVal.toLocaleString()}</h4>
                            <p className="text-[9px] text-rose-500 font-bold mt-1 uppercase">{pendingVouchers.length} Awaiting Approval</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 flex items-center justify-center border border-amber-100/50 dark:border-amber-950/30">
                            <Cog8ToothIcon className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">This Month's Expense Outflow</p>
                            <h4 className="text-2xl font-black text-slate-950 dark:text-white italic mt-1">KES {thisMonthOutflow.toLocaleString()}</h4>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{currentMonthExpenses.length} Records</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-750 text-blue-600 flex items-center justify-center border border-blue-100/50 dark:border-slate-750">
                            <DocumentTextIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Expense Filters</p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search voucher, payee..."
                                value={expenseSearchQuery}
                                onChange={(e) => { setExpenseSearchQuery(e.target.value); setExpensePage(1); }}
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-850 dark:text-slate-200"
                            />
                            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        </div>
                        <div>
                            <select
                                value={expensePropertyFilter}
                                onChange={(e) => { setExpensePropertyFilter(e.target.value); setExpensePage(1); }}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold focus:outline-none text-slate-855 dark:text-slate-300"
                            >
                                <option value="all">All Properties</option>
                                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <select
                                value={expenseCategoryFilter}
                                onChange={(e) => { setExpenseCategoryFilter(e.target.value); setExpensePage(1); }}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold focus:outline-none text-slate-855 dark:text-slate-300"
                            >
                                <option value="all">All Categories</option>
                                <option value="Utilities">Utilities</option>
                                <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                                <option value="Staff Salaries & Caretakers">Staff Salaries & Caretakers</option>
                                <option value="Trash & Cleaning">Trash & Cleaning</option>
                                <option value="Water & Plumbing">Water & Plumbing</option>
                                <option value="Government Licenses & Taxes">Government Licenses & Taxes</option>
                                <option value="Legal & Professional Fees">Legal & Professional Fees</option>
                                <option value="Insurance">Insurance</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <select
                                value={expenseStatusFilter}
                                onChange={(e) => { setExpenseStatusFilter(e.target.value); setExpensePage(1); }}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs font-bold focus:outline-none text-slate-855 dark:text-slate-300"
                            >
                                <option value="all">All Statuses</option>
                                <option value="Pending Approval">Pending Approval</option>
                                <option value="Approved">Approved</option>
                                <option value="Paid">Paid</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Registry Table */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Voucher Info</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Property / Unit</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Payee / Method</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Description</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Amount</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-center">Status</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {pagedExpenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No expense vouchers registered yet</td>
                                    </tr>
                                ) : (
                                    pagedExpenses.map(item => {
                                        const prop = properties.find(p => p.id === item.propertyId);
                                        const unit = item.unitId ? units.find(u => u.id === item.unitId) : null;
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                                <td className="p-6">
                                                    <div className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">{item.voucherNumber}</div>
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{new Date(item.paymentDate).toLocaleDateString()}</div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="text-xs font-black uppercase text-blue-600 tracking-wider truncate max-w-[150px]">{prop?.name || 'Unknown Asset'}</div>
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{unit ? `Unit ${unit.unitNumber}` : 'General Property'}</div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">{item.payeeName}</div>
                                                    <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                                                        {item.paymentMethod} {item.reference ? `(${item.reference})` : ''}
                                                    </div>
                                                </td>
                                                <td className="p-6 max-w-[200px] truncate text-xs font-bold text-slate-500 dark:text-slate-400">
                                                    {item.description || '—'}
                                                </td>
                                                <td className="p-6 text-right text-xs font-black text-rose-500 italic">
                                                    KES {item.amount.toLocaleString()}
                                                </td>
                                                <td className="p-6 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                        item.status === 'Paid' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100 dark:border-emerald-950/30' :
                                                        item.status === 'Approved' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-100 dark:border-blue-950/30' :
                                                        item.status === 'Cancelled' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-100 dark:border-rose-950/30' :
                                                        'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-100 dark:border-amber-950/30'
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-right">
                                                    <div className="flex justify-end items-center gap-2">
                                                        {item.status === 'Pending Approval' && (
                                                            <button
                                                                onClick={() => handleApproveExpense(item)}
                                                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-slate-750 dark:hover:bg-slate-700 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-wider"
                                                            >
                                                                Approve
                                                            </button>
                                                        )}
                                                        {item.status === 'Approved' && (
                                                            <button
                                                                onClick={() => handlePayExpense(item)}
                                                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-wider"
                                                            >
                                                                Pay
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handlePrintVoucher(item)}
                                                            className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-755 text-slate-650 dark:text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1"
                                                            title="Print Voucher PDF"
                                                        >
                                                            <DocumentTextIcon className="w-4 h-4" /> Print
                                                        </button>
                                                        {item.status !== 'Paid' && (
                                                            <button
                                                                onClick={() => handleDeleteExpense(item.id)}
                                                                className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-wider"
                                                                title="Delete/Cancel Voucher"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
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
                    {totalExpensesPages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Showing {((expensePage - 1) * PAGE_SIZE) + 1}–{Math.min(expensePage * PAGE_SIZE, filteredExpenses.length)} of {filteredExpenses.length} expense vouchers
                            </p>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setExpensePage(p => Math.max(1, p - 1))} disabled={expensePage === 1} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
                                {Array.from({ length: totalExpensesPages }, (_, i) => i + 1).map(pg => (
                                    <button key={pg} onClick={() => setExpensePage(pg)} className={`w-8 h-8 rounded-xl text-[10px] font-black transition-colors ${pg === expensePage ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{pg}</button>
                                ))}
                                <button onClick={() => setExpensePage(p => Math.min(totalExpensesPages, p + 1))} disabled={expensePage === totalExpensesPages} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        if (newListingImages.length + files.length > 5) {
            alert('You can only upload up to 5 images per listing.');
            return;
        }

        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) { // Increased to 5MB for high quality property photos
                alert(`File ${file.name} is larger than 5MB.`);
                continue;
            }

            try {
                const folderName = `Property_Marketplace_${currentInstitution.name.replace(/\s+/g, '_')}`;
                const res = await apiService.uploadToGoogleDrive(file, folderName, { 
                    institutionId 
                });

                if (res.success && res.fileUrl) {
                    setNewListingImages(prev => {
                        const next = [...prev, res.fileUrl!];
                        return next.slice(0, 5);
                    });
                } else {
                    throw new Error(res.error || 'Upload failed');
                }
            } catch (err: any) {
                console.error("Marketplace image upload error:", err);
                alert(`Failed to upload ${file.name}: ${err.message}`);
            }
        }
    };

    const handleSaveListing = async (data: any) => {
        try {
            await apiService.saveModuleRecord('pm_listings', {
                ...data, // includes propertyId which API maps to property_id
                propertyId: data.propertyId, // Explicitly ensure it is passed
                unitId: data.unitId || null,
                images: newListingImages,
                id: data.id || `list_${Date.now()}`,
                institutionId,
                status: data.status || 'Published',
                createdAt: new Date().toISOString()
            });
            setShowListingModal(false);
            setNewListingImages([]);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to save listing"); }
    };

    const handleDeleteListing = async (id: string) => {
        if (!confirm("Are you sure you want to remove this listing?")) return;
        try {
            await apiService.deleteModuleRecord('pm_listings', id);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to delete listing"); }
    };

    const handleUpdateInquiryStatus = async (id: string, status: PMInquiryStatus) => {
        try {
            const inquiry = inquiries.find(i => i.id === id);
            if (inquiry) {
                await apiService.saveModuleRecord('pm_inquiries', { ...inquiry, status });
                loadData();
            }
        } catch (e: any) { alert(e.message || "Failed to update inquiry status"); }
    };

    const handleDeleteInquiry = async (id: string) => {
        if (!confirm("Are you sure you want to delete this inquiry?")) return;
        try {
            await apiService.deleteModuleRecord('pm_inquiries', id);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to delete inquiry"); }
    };

    const InquiriesTab = () => (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Marketplace Inquiries</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Track and manage potential tenants and buyers</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(inquiry => {
                    const listing = listings.find(l => l.id === inquiry.listingId);
                    return (
                        <div key={inquiry.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl group hover:-translate-y-2 transition-all duration-500 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest italic ${inquiry.status === 'New' ? 'bg-blue-600 text-white' : inquiry.status === 'Contacted' ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white'}`}>
                                        {inquiry.status}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase italic">{new Date(inquiry.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic mb-1">{inquiry.customerName}</h4>
                                <p className="text-blue-600 text-xs font-black uppercase italic mb-4">{inquiry.phoneNumber}</p>

                                {listing && (
                                    <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Inquired For</p>
                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase italic truncate">{listing.title}</p>
                                        <p className="text-[9px] text-blue-600 font-bold uppercase">{listing.listingType} • KES {listing.price?.toLocaleString()}</p>
                                    </div>
                                )}

                                {inquiry.inquiryDate && (
                                    <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 italic">
                                        <CalendarIcon className="w-4 h-4 text-emerald-500" />
                                        Preferred Viewing: {new Date(inquiry.inquiryDate).toLocaleDateString()}
                                    </div>
                                )}

                                {inquiry.message && <p className="text-xs text-slate-500 font-medium italic mb-6">"{inquiry.message}"</p>}
                            </div>

                            <div className="flex gap-2 pt-6 border-t border-slate-50 dark:border-slate-700 mt-auto">
                                <select
                                    value={inquiry.status}
                                    onChange={(e) => handleUpdateInquiryStatus(inquiry.id, e.target.value as PMInquiryStatus)}
                                    className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer"
                                >
                                    <option value="New">Mark as New</option>
                                    <option value="Contacted">Contacted</option>
                                    <option value="Closed">Closed</option>
                                </select>
                                <button onClick={() => handleDeleteInquiry(inquiry.id)} className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {inquiries.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                        <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-xl mb-6">
                            <UserPlusIcon className="w-12 h-12 text-slate-300" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic mb-2">No Inquiries Yet</h4>
                        <p className="text-slate-500 text-sm font-medium max-max-sm">Customer enquiries from the marketplace will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const ListingsTab = () => (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Marketplace Listings</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                        Active Public Advertisements ({listings.length} / {currentInstitution.listingQuota || 'Unlimited'})
                    </p>
                </div>
                <button
                    onClick={() => setShowListingModal(true)}
                    className="btn-primary flex items-center gap-2 h-12 shadow-indigo-100 dark:shadow-none uppercase tracking-widest text-[10px]"
                >
                    <PlusIcon className="w-4 h-4" /> New Ad Listing
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map(listing => (
                    <div key={listing.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                        <div className="h-48 bg-slate-100 dark:bg-slate-900 relative">
                            {listing.images && listing.images[0] ? (
                                <img loading="lazy" src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                    <HomeIcon className="w-12 h-12 mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No Preview Image</p>
                                </div>
                            )}
                            <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg">
                                <p className="text-sm font-black text-slate-900 dark:text-white italic">KES {listing.price?.toLocaleString()}</p>
                            </div>
                            <span className={`absolute bottom-4 left-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest italic shadow-sm ${listing.status === 'Active' || listing.status === 'Published' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {listing.status}
                            </span>
                        </div>
                        <div className="p-6">
                            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-1 truncate">{listing.title}</h4>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">{listing.listingType} • {listing.propertyType}</p>
                            <p className="text-xs text-slate-500 font-medium line-clamp-2 h-10 mb-6">{listing.description}</p>

                            <div className="flex justify-between items-center pt-6 border-t border-slate-50 dark:border-slate-700">
                                <div className="flex gap-2">
                                    <button onClick={() => handleDeleteListing(listing.id)} className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="text-right flex gap-6">
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Views</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{listing.viewCount || 0}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inquiries</p>
                                        <p className="text-sm font-black text-blue-600 mt-0.5">{listing.inquiryCount || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {listings.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                        <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-xl mb-6">
                            <ShoppingCartIcon className="w-12 h-12 text-slate-300" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic mb-2">No Active Listings</h4>
                        <p className="text-slate-500 text-sm font-medium max-w-sm">Tap the "New Ad Listing" button to start advertising your properties on the public marketplace.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const StatementsManager = (): React.ReactElement => {
        const [targetType, setTargetType] = useState<'tenant' | 'landlord'>('tenant');
        const [targetId, setTargetId] = useState('');
        const [searchTerm, setSearchTerm] = useState('');
        const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
        const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
        const [isBulkDispatching, setIsBulkDispatching] = useState(false);

        // Financial Data Aggregators
        const getFinancialData = () => {
            if (!targetId) return { openingBal: 0, transactions: [], totals: { gross: 0, comm: 0, balance: 0 } };

            let allTx: any[] = [];
            let openingBal = 0;

            // Precautionary deduplication
            const uniqueInvoices = Array.from(new Map(invoices.map(inv => [inv.id, inv])).values());
            const uniquePayments = Array.from(new Map(payments.map(p => [p.id, p])).values());

            if (targetType === 'tenant') {
                const tenantLeases = leases.filter(l => l.tenantId === targetId);
                const leaseIds = tenantLeases.map(l => l.id);

                // Debits: Invoices matching tenant's leases (exclude Cancelled and Draft)
                uniqueInvoices
                    .filter(inv => leaseIds.includes(inv.leaseId) && inv.status !== 'Cancelled' && inv.status !== 'Draft')
                    .forEach(inv => {
                        allTx.push({
                            id: inv.id,
                            date: inv.issueDate,
                            description: inv.description,
                            type: 'debit',
                            amount: inv.amount,
                            ref: inv.invoiceNumber
                        });
                    });

                // Credits: Payments matching tenant's leases (Completed status only)
                uniquePayments
                    .filter(p => leaseIds.includes(p.leaseId) && p.status === 'Completed')
                    .forEach(p => {
                        allTx.push({
                            id: p.id,
                            date: p.paymentDate,
                            description: `Payment - ${p.paymentType} (${p.paymentMethod})`,
                            type: 'credit',
                            amount: p.amount,
                            ref: p.receiptNumber || p.id.split('_')[1]
                        });
                    });
            } else {
                // Landlord Logic: Collections vs Management Fees (Completed status only)
                const landlordProperties = properties.filter(p => p.landlordId === targetId);
                const propertyIds = landlordProperties.map(p => p.id);
                const landlordUnits = units.filter(u => propertyIds.includes(u.propertyId));
                const unitIds = landlordUnits.map(u => u.id);
                const landlordLeases = leases.filter(l => unitIds.includes(l.unitId));

                uniquePayments
                    .filter(p => p.status === 'Completed')
                    .forEach(p => {
                        const lease = landlordLeases.find(l => l.id === p.leaseId);
                        if (lease) {
                            const unit = units.find(u => u.id === lease.unitId);
                            const property = properties.find(prop => prop.id === unit?.propertyId);
                            allTx.push({
                                id: p.id,
                                date: p.paymentDate,
                                description: `Collection: ${unit?.unitNumber} - ${property?.name}`,
                                type: 'credit',
                                amount: p.amount,
                                commission: p.commissionAmount || 0,
                                ref: p.id.split('_')[1]
                            });
                        }
                    });
            }

            // Sort by date then by type (debits first for same day)
            allTx.sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'debit' ? -1 : 1));

            const filtered = allTx.filter(t => {
                if (t.date < startDate) {
                    openingBal += (t.type === 'debit' ? t.amount : -t.amount);
                    return false;
                }
                return t.date <= endDate;
            });

            let runningBal = openingBal;
            const transactions = filtered.map(t => {
                runningBal += (t.type === 'debit' ? t.amount : -t.amount);
                return { ...t, balance: runningBal };
            });

            const totals = transactions.reduce((acc, t) => ({
                gross: acc.gross + (t.type === 'credit' ? t.amount : 0),
                comm: acc.comm + (t.commission || 0),
                balance: runningBal
            }), { gross: 0, comm: 0, balance: runningBal });

            return { openingBal, transactions, totals };
        };

        const { openingBal, transactions, totals } = getFinancialData();

        const filteredTargets = (targetType === 'tenant' ? tenants : landlords)
            .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));

        const handlePreview = async () => {
            if (!targetId) return alert("Please select a " + targetType);
            try {
                let dataUri = '';
                let title = '';
                const effectiveLetterhead = currentInstitution.letterheadConfig?.headerImageUrl 
                    ? currentInstitution.letterheadConfig 
                    : pmSettings?.branding?.letterheadUrl 
                        ? { headerImageUrl: pmSettings.branding.letterheadUrl } 
                        : undefined;
                const effectiveLogo = pmSettings?.branding?.logoUrl || currentInstitution.logoUrl || null;

                if (targetType === 'tenant') {
                    const tenant = tenants.find(t => t.id === targetId);
                    if (!tenant) return;
                    title = `Tenant Statement - ${tenant.name}`;
                    dataUri = await pdfService.generateTenantStatementPdf(
                        tenant, payments, invoices, leases, units, startDate, endDate, 
                        currentInstitution, effectiveLetterhead, effectiveLogo
                    );
                } else {
                    const landlord = landlords.find(l => l.id === targetId);
                    if (!landlord) return;
                    title = `Landlord Statement - ${landlord.name}`;
                    dataUri = await pdfService.generateLandlordStatementPdf(
                        landlord, payments, leases, units, properties, startDate, endDate, 
                        currentInstitution, effectiveLetterhead, effectiveLogo, expenses
                    );
                }
                
                // Convert to Blob URL for better browser support and to avoid download issues
                const blob = dataUriToBlob(dataUri);
                const blobUrl = URL.createObjectURL(blob);
                
                setPreviewPdfUrl(blobUrl);
                setPreviewPdfTitle(title);
                setShowPdfPreview(true);
            } catch (err: any) { alert("Failed to generate PDF: " + err.message); }
        };

        const handleEmail = async () => {
            if (!targetId) return alert("Please select a " + targetType);
            const entity = targetType === 'tenant' ? tenants.find(t => t.id === targetId) : landlords.find(l => l.id === targetId);
            if (!entity?.email) return alert("This " + targetType + " has no email address registered.");
            
            if (!confirm(`Send statement for ${startDate} to ${endDate} to ${entity.email}?`)) return;
            
            try {
                let dataUri = '';
                const effectiveLetterhead = currentInstitution.letterheadConfig?.headerImageUrl 
                    ? currentInstitution.letterheadConfig 
                    : pmSettings?.branding?.letterheadUrl 
                        ? { headerImageUrl: pmSettings.branding.letterheadUrl } 
                        : undefined;
                const effectiveLogo = pmSettings?.branding?.logoUrl || currentInstitution.logoUrl || null;

                if (targetType === 'tenant') {
                    dataUri = await pdfService.generateTenantStatementPdf(
                        entity as PMTenant, payments, invoices, leases, units, startDate, endDate, 
                        currentInstitution, effectiveLetterhead, effectiveLogo
                    );
                } else {
                    dataUri = await pdfService.generateLandlordStatementPdf(
                        entity as PMLandlord, payments, leases, units, properties, startDate, endDate, 
                        currentInstitution, effectiveLetterhead, effectiveLogo, expenses
                    );
                }
                
                const subject = `${currentInstitution.name} - ${targetType === 'tenant' ? 'Tenant' : 'Landlord'} Statement (${startDate} to ${endDate})`;
                const body = `Dear ${entity.name},\n\nPlease find attached your ${targetType} statement for the period ${startDate} to ${endDate}.\n\nRegards,\n${currentInstitution.name}`;
                
                await apiService.sendEmail(
                    entity.email!, 
                    subject, 
                    body, 
                    getInstitutionEmailConfig(currentInstitution, currentInstitution.emailConfig), 
                    undefined, 
                    [{ filename: 'statement.pdf', content: dataUri }]
                );
                
                // Also send SMS for individual email if phone exists
                if (entity.phoneNumber) {
                    try {
                        const blob = await (await fetch(dataUri)).blob();
                        const fileName = `statements/${targetType}_${entity.id}_${startDate}_${endDate}.pdf`;
                        const publicUrl = await apiService.uploadBlob(fileName, blob, 'application/pdf');
                        let shortUrl = publicUrl;
                        if (publicUrl) {
                            try {
                                shortUrl = await apiService.shortenUrl(publicUrl);
                            } catch (shortErr) {
                                console.warn("Failed to shorten statement URL", shortErr);
                            }
                        }
                        const smsMessage = `Dear ${entity.name}, your ${targetType} statement for ${startDate} to ${endDate} is ready. Download here: ${shortUrl} `;
                        await apiService.sendSms(entity.phoneNumber!, smsMessage, currentInstitution.smsConfig, 1, currentInstitution.id!);
                    } catch (smsErr) { console.warn("SMS link failed:", smsErr); }
                }

                alert("Statement has been sent successfully to " + entity.email);
            } catch (err: any) { alert("Failed to send email: " + err.message); }
        };

        const handleBulkDispatch = async () => {
            const list = targetType === 'tenant' ? tenants : landlords;
            const validList = list.filter(e => e.email);
            if (validList.length === 0) return alert(`No ${targetType}s with registered email addresses found.`);
            
            if (!confirm(`Are you sure you want to generate and email statements to all ${validList.length} ${targetType}s with emails?`)) return;
            
            setIsBulkDispatching(true);
            let successCount = 0;
            let failCount = 0;

            try {
                for (const entity of validList) {
                    try {
                        let dataUri = '';
                        const effectiveLetterhead = currentInstitution.letterheadConfig?.headerImageUrl 
                            ? currentInstitution.letterheadConfig 
                            : pmSettings?.branding?.letterheadUrl 
                                ? { headerImageUrl: pmSettings.branding.letterheadUrl } 
                                : undefined;
                        const effectiveLogo = pmSettings?.branding?.logoUrl || currentInstitution.logoUrl || null;

                        if (targetType === 'tenant') {
                            dataUri = await pdfService.generateTenantStatementPdf(
                                entity as PMTenant, payments, invoices, leases, units, startDate, endDate, 
                                currentInstitution, effectiveLetterhead, effectiveLogo
                            );
                        } else {
                            dataUri = await pdfService.generateLandlordStatementPdf(
                                entity as PMLandlord, payments, leases, units, properties, startDate, endDate, 
                                currentInstitution, effectiveLetterhead, effectiveLogo, expenses
                            );
                        }
                        
                        const subject = `${currentInstitution.name} - ${targetType === 'tenant' ? 'Tenant' : 'Landlord'} Statement (${startDate} to ${endDate})`;
                        const body = `Dear ${entity.name},\n\nPlease find attached your ${targetType} statement for the period ${startDate} to ${endDate}.\n\nRegards,\n${currentInstitution.name}`;
                        
                        await apiService.sendEmail(
                            entity.email!, 
                            subject, 
                            body, 
                            getInstitutionEmailConfig(currentInstitution, currentInstitution.emailConfig), 
                            undefined, 
                            [{ filename: 'statement.pdf', content: dataUri }]
                        );
                        
                        // Upload PDF for public link if SMS is needed
                        if (entity.phoneNumber) {
                            try {
                                const blob = await (await fetch(dataUri)).blob();
                                const fileName = `statements/${targetType}_${entity.id}_${startDate}_${endDate}.pdf`;
                                const publicUrl = await apiService.uploadBlob(fileName, blob, 'application/pdf');
                                let shortUrl = publicUrl;
                                if (publicUrl) {
                                    try {
                                        shortUrl = await apiService.shortenUrl(publicUrl);
                                    } catch (shortErr) {
                                        console.warn("Failed to shorten bulk statement URL", shortErr);
                                    }
                                }
                                const smsMessage = `Dear ${entity.name}, your ${targetType} statement for ${startDate} to ${endDate} is ready. Download here: ${shortUrl} `;
                                await apiService.sendSms(entity.phoneNumber!, smsMessage, currentInstitution.smsConfig, 1, currentInstitution.id!);
                            } catch (smsErr) {
                                console.error(`Failed to send SMS to ${entity.phoneNumber}:`, smsErr);
                            }
                        }
                        
                        successCount++;
                    } catch (e) {
                        console.error(`Failed to send to ${entity.email}:`, e);
                        failCount++;
                    }
                }
                alert(`Bulk dispatch complete.\nSuccess: ${successCount}\nFailed: ${failCount}`);
            } catch (err) { alert("Bulk dispatch encountered an error."); } finally { setIsBulkDispatching(false); }
        };

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Controls Panel */}
                    <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl flex flex-col gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Statement Type</label>
                            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-2xl p-1">
                                <button onClick={() => { setTargetType('tenant'); setTargetId(''); setSearchTerm(''); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetType === 'tenant' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}>Tenant</button>
                                <button onClick={() => { setTargetType('landlord'); setTargetId(''); setSearchTerm(''); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetType === 'landlord' ? 'bg-white dark:bg-slate-800 text-purple-600 shadow-sm' : 'text-slate-400'}`}>Landlord</button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Search {targetType === 'tenant' ? 'Tenant' : 'Landlord'}</label>
                            <div className="relative">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder={`Search names...`}
                                    value={searchTerm}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSearchTerm(val);
                                        const list = targetType === 'tenant' ? tenants : landlords;
                                        const matches = list.filter(item => item.name.toLowerCase().includes(val.toLowerCase()));
                                        if (matches.length === 1) {
                                            setTargetId(matches[0].id);
                                        } else {
                                            const exactMatch = list.find(item => item.name.toLowerCase() === val.trim().toLowerCase());
                                            if (exactMatch) {
                                                setTargetId(exactMatch.id);
                                            } else {
                                                setTargetId('');
                                            }
                                        }
                                    }}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl pl-10 pr-4 py-4 font-bold outline-none transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select {targetType === 'tenant' ? 'Tenant' : 'Landlord'}</label>
                            <select 
                                value={targetId}
                                onChange={(e) => {
                                    const id = e.target.value;
                                    setTargetId(id);
                                    if (id) {
                                        const match = (targetType === 'tenant' ? tenants : landlords).find(item => item.id === id);
                                        if (match) {
                                            setSearchTerm(match.name);
                                        }
                                    } else {
                                        setSearchTerm('');
                                    }
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all text-sm appearance-none"
                            >
                                <option value="">--- Select {targetType === 'tenant' ? 'Tenant' : 'Landlord'} ---</option>
                                {filteredTargets.map(item => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Start Date</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all text-sm" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">End Date</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all text-sm" />
                            </div>
                        </div>

                        <div className="pt-4 space-y-3">
                            <button 
                                onClick={handlePreview}
                                className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                            >
                                <EyeIcon className="w-4 h-4" /> Preview PDF
                            </button>
                            <button 
                                onClick={handleEmail}
                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                            >
                                <PaperAirplaneIcon className="w-4 h-4 -rotate-45" /> Email Direct
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-2"></div>
                            <button 
                                onClick={handleBulkDispatch}
                                disabled={isBulkDispatching}
                                className="w-full py-4 border-2 border-blue-600/20 text-blue-600 dark:text-blue-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isBulkDispatching ? "Processing..." : "Bulk Monthly Dispatch"}
                            </button>
                        </div>
                    </div>

                    {/* Data Preview Panel */}
                    <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Transaction Preview</h3>
                                <div className="flex gap-4 mt-1">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                                        {startDate} to {endDate}
                                    </p>
                                    <span className="text-[10px] text-blue-600 font-black uppercase italic">
                                        Opening Bal: KES {openingBal?.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            {targetId && (
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">{targetType === 'tenant' ? 'Closing Balance' : 'Net Collections'}</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white italic">KES {totals.balance?.toLocaleString()}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-auto max-h-[600px]">
                            {targetId ? (
                                <>
                                    {/* Desktop Table */}
                                    <table className="hidden md:table w-full text-left">
                                        <thead className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 z-10">
                                            <tr>
                                                <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                                <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                                <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ref</th>
                                                <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Debit</th>
                                                <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Credit</th>
                                                <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Opening Balance Row */}
                                            <tr className="bg-slate-50/30 dark:bg-slate-900/10 italic">
                                                <td className="p-6 text-[10px] font-bold text-slate-400">{startDate}</td>
                                                <td className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest" colSpan={3}>Opening Balance Brought Forward</td>
                                                <td className="p-6 text-right text-sm font-black text-slate-400">---</td>
                                                <td className="p-6 text-right text-sm font-black text-slate-400">KES {openingBal?.toLocaleString()}</td>
                                            </tr>
                                            {transactions.map(t => (
                                                <tr key={t.id} className="border-b border-slate-50 dark:border-slate-700/50">
                                                    <td className="p-6 text-[10px] font-bold text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                                                    <td className="p-6">
                                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase italic">{t.description}</p>
                                                        {t.commission > 0 && <p className="text-[9px] text-purple-600 font-bold uppercase">Mgt Fee: KES {t.commission?.toLocaleString()}</p>}
                                                    </td>
                                                    <td className="p-6 text-[10px] font-mono font-bold text-slate-400">#{t.ref}</td>
                                                    <td className="p-6 text-right text-sm font-black text-rose-500 italic">
                                                        {t.type === 'debit' ? `KES ${t.amount?.toLocaleString()}` : '---'}
                                                    </td>
                                                    <td className="p-6 text-right text-sm font-black text-emerald-600 italic">
                                                        {t.type === 'credit' ? `KES ${t.amount?.toLocaleString()}` : '---'}
                                                    </td>
                                                    <td className="p-6 text-right text-sm font-black text-blue-600 italic">
                                                        KES {t.balance?.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {transactions.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="p-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No transactions found for this period</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>

                                    {/* Mobile Cards */}
                                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                                        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center italic">
                                            <span className="text-[10px] font-bold text-slate-400">Opening Balance</span>
                                            <span className="text-sm font-black text-slate-400">KES {openingBal?.toLocaleString()}</span>
                                        </div>
                                        {transactions.map(t => (
                                            <div key={t.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(t.date).toLocaleDateString()}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase italic">#{t.ref}</span>
                                                </div>
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase italic mb-1">{t.description}</p>
                                                {t.commission > 0 && <p className="text-[9px] text-purple-600 font-bold uppercase mb-2">Mgt Fee: KES {t.commission?.toLocaleString()}</p>}
                                                <div className="flex justify-between items-center mt-4">
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t.type === 'debit' ? 'Debit' : 'Credit'}</p>
                                                        <p className={`text-sm font-black italic ${t.type === 'debit' ? 'text-rose-500' : 'text-emerald-600'}`}>KES {t.amount?.toLocaleString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Balance</p>
                                                        <p className="text-sm font-black text-blue-600 italic">KES {t.balance?.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {transactions.length === 0 && (
                                            <div className="p-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest italic">No transactions found</div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-20 text-center">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-full mb-6">
                                        <CurrencyIcon className="w-12 h-12 text-slate-300" />
                                    </div>
                                    <h4 className="text-lg font-black text-slate-400 uppercase italic">Select an entity to preview data</h4>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Choose a tenant or landlord from the sidebar</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const KRAiTaxReportsPanel = (): React.ReactElement => {
        const [activeTaxTab, setActiveTaxTab] = useState<'mri' | 'wht'>('mri');
        const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
        const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
        const [selectedLandlordId, setSelectedLandlordId] = useState<'all' | string>('all');

        const monthsList = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const mriReportData = useMemo(() => {
            const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
            const rentPayments = payments.filter(p => {
                if (p.paymentType !== 'Rent' || p.status !== 'Completed') return false;
                return p.paymentDate && p.paymentDate.startsWith(monthStr);
            });

            const aggregates: Record<string, {
                landlordName: string;
                landlordPin: string;
                grossRent: number;
                mriTax: number;
                collections: { unitNumber: string; propertyName: string; amount: number; tenantName: string }[];
            }> = {};

            const targetLandlords = selectedLandlordId === 'all' 
                ? landlords 
                : landlords.filter(l => l.id === selectedLandlordId);

            targetLandlords.forEach(l => {
                aggregates[l.id] = {
                    landlordName: l.name,
                    landlordPin: l.taxPin || 'Not Provided',
                    grossRent: 0,
                    mriTax: 0,
                    collections: []
                };
            });

            rentPayments.forEach(p => {
                const lease = leases.find(l => l.id === p.leaseId);
                if (!lease) return;

                const unit = units.find(u => u.id === lease.unitId);
                if (unit && unit.unitType && unit.unitType.toLowerCase().includes('commercial')) {
                    return;
                }

                const property = properties.find(prop => prop.id === unit?.propertyId);
                if (!property || !property.landlordId) return;

                const landlordId = property.landlordId;
                if (!aggregates[landlordId]) return;

                const tenant = tenants.find(t => t.id === lease.tenantId);

                aggregates[landlordId].grossRent += p.amount;
                aggregates[landlordId].collections.push({
                    unitNumber: unit?.unitNumber || 'N/A',
                    propertyName: property.name,
                    amount: p.amount,
                    tenantName: tenant?.name || 'N/A'
                });
            });

            Object.keys(aggregates).forEach(id => {
                aggregates[id].mriTax = Math.round(aggregates[id].grossRent * 0.075);
            });

            return Object.entries(aggregates).map(([id, val]) => ({
                landlordId: id,
                ...val
            })).filter(item => item.grossRent > 0 || selectedLandlordId !== 'all');
        }, [selectedYear, selectedMonth, selectedLandlordId, payments, leases, units, properties, landlords, tenants]);

        const whtReportData = useMemo(() => {
            const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
            const monthInvoices = invoices.filter(inv => {
                if (inv.status === 'Cancelled' || inv.status === 'Draft') return false;
                return inv.issueDate && inv.issueDate.startsWith(monthStr);
            });

            return monthInvoices.map(inv => {
                const lease = leases.find(l => l.id === inv.leaseId);
                const unit = lease ? units.find(u => u.id === lease.unitId) : null;
                const tenant = tenants.find(t => t.id === inv.tenantId);
                const expectedWht = inv.withholdingTaxAmount || (tenant?.isWithholdingAgent ? Math.round(inv.amount * 0.1) : 0);

                return {
                    id: inv.id,
                    invoiceNumber: inv.invoiceNumber,
                    issueDate: inv.issueDate,
                    tenantName: tenant?.name || 'N/A',
                    tenantPin: tenant?.taxPin || 'N/A',
                    isWhtAgent: !!tenant?.isWithholdingAgent,
                    invoiceAmount: inv.amount,
                    expectedWht,
                    actualWht: inv.withholdingStatus === 'approved' ? (inv.withholdingTaxAmount || Math.round(inv.amount * 0.1)) : 0,
                    status: inv.withholdingStatus || 'none',
                    certificateNumber: inv.withholdingCertificateNumber,
                    certificateDate: inv.withholdingCertificateDate,
                    rejectionReason: inv.withholdingRejectionReason
                };
            }).filter(item => item.isWhtAgent || item.expectedWht > 0);
        }, [selectedYear, selectedMonth, invoices, leases, units, tenants]);

        const handleDownloadMriCsv = () => {
            const headers = ['Landlord Name', 'Landlord KRA PIN', 'Reporting Month', 'Gross Residential Rent (KES)', 'MRI Tax due (7.5%) (KES)'];
            const rows = mriReportData.map(item => [
                item.landlordName,
                item.landlordPin,
                `${monthsList[selectedMonth - 1]} ${selectedYear}`,
                item.grossRent,
                item.mriTax
            ]);

            const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `KRA_MRI_Report_${selectedYear}_${selectedMonth}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        const handleDownloadWhtCsv = () => {
            const headers = [
                'Tenant Name', 'Tenant PIN', 'Invoice #', 'Invoice Date', 
                'Gross Amount (KES)', 'Expected WHT 10% (KES)', 'Actual WHT Offset (KES)', 
                'Certificate Number', 'Certificate Date', 'Status'
            ];
            const rows = whtReportData.map(item => [
                item.tenantName,
                item.tenantPin,
                item.invoiceNumber,
                item.issueDate,
                item.invoiceAmount,
                item.expectedWht,
                item.actualWht,
                item.certificateNumber || '—',
                item.certificateDate || '—',
                item.status.toUpperCase()
            ]);

            const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `KRA_Rent_Withholding_Tax_Report_${selectedYear}_${selectedMonth}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-500 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl">
                <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 dark:border-slate-700 pb-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-wider">KRA iTax Integration Portal</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Tenant Rent withholding & Landlord residential MRI tax filings</p>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                        <button 
                            onClick={() => setActiveTaxTab('mri')}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTaxTab === 'mri' ? 'bg-white dark:bg-slate-800 text-blue-650 shadow-sm' : 'text-slate-400'}`}
                        >
                            Monthly Rental Income (MRI)
                        </button>
                        <button 
                            onClick={() => setActiveTaxTab('wht')}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTaxTab === 'wht' ? 'bg-white dark:bg-slate-800 text-blue-655 shadow-sm' : 'text-slate-400'}`}
                        >
                            Rent Withholding Tax (WHT)
                        </button>
                    </div>
                </div>

                <div className="flex gap-4 items-center flex-wrap p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl">
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Filing Year</label>
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                        >
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Filing Month</label>
                        <select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                        >
                            {monthsList.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>)}
                        </select>
                    </div>

                    {activeTaxTab === 'mri' && (
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Landlord</label>
                            <select 
                                value={selectedLandlordId} 
                                onChange={(e) => setSelectedLandlordId(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none max-w-[200px] truncate dark:text-white"
                            >
                                <option value="all">All Landlords</option>
                                {landlords.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="ml-auto flex gap-2">
                        {activeTaxTab === 'mri' ? (
                            <button 
                                onClick={handleDownloadMriCsv}
                                className="px-4 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2"
                            >
                                <DownloadIcon className="w-4 h-4" /> Download MRI CSV
                            </button>
                        ) : (
                            <button 
                                onClick={handleDownloadWhtCsv}
                                className="px-4 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2"
                            >
                                <DownloadIcon className="w-4 h-4" /> Download WHT CSV
                            </button>
                        )}
                    </div>
                </div>

                {activeTaxTab === 'mri' ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-750 rounded-3xl">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Residential Rents</p>
                                <p className="text-xl font-black italic text-slate-900 dark:text-white">KES {mriReportData.reduce((sum, item) => sum + item.grossRent, 0).toLocaleString()}</p>
                            </div>
                            <div className="p-6 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/30 rounded-3xl">
                                <p className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">MRI Tax Rate</p>
                                <p className="text-xl font-black italic text-amber-600 dark:text-amber-400">7.5%</p>
                            </div>
                            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl">
                                <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Net MRI Tax Payable</p>
                                <p className="text-xl font-black italic text-emerald-600 dark:text-emerald-400">KES {mriReportData.reduce((sum, item) => sum + item.mriTax, 0).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-3xl">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Landlord</th>
                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tax PIN</th>
                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Gross Rent (KES)</th>
                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Tax Due (KES)</th>
                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Filing Month</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {mriReportData.map(item => (
                                        <tr key={item.landlordId} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-5 text-xs font-black text-slate-900 dark:text-white uppercase italic">{item.landlordName}</td>
                                            <td className="p-5 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{item.landlordPin}</td>
                                            <td className="p-5 text-xs font-black text-slate-900 dark:text-white text-right">KES {item.grossRent.toLocaleString()}</td>
                                            <td className="p-5 text-xs font-black text-emerald-600 dark:text-emerald-400 text-right">KES {item.mriTax.toLocaleString()}</td>
                                            <td className="p-5 text-[10px] font-bold text-slate-500 text-center uppercase">{monthsList[selectedMonth - 1].slice(0, 3)} {selectedYear}</td>
                                        </tr>
                                    ))}
                                    {mriReportData.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-xs font-bold text-slate-400 italic uppercase">No residential rent collections recorded for this month.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-750 rounded-3xl">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected Rent WHT (10%)</p>
                                <p className="text-xl font-black italic text-slate-900 dark:text-white">KES {whtReportData.reduce((sum, item) => sum + item.expectedWht, 0).toLocaleString()}</p>
                            </div>
                            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl">
                                <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Approved WHT Offsets</p>
                                <p className="text-xl font-black italic text-emerald-600 dark:text-emerald-400">KES {whtReportData.reduce((sum, item) => sum + item.actualWht, 0).toLocaleString()}</p>
                            </div>
                            <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-3xl">
                                <p className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Pending Certificates</p>
                                <p className="text-xl font-black italic text-amber-600 dark:text-amber-400">
                                    {whtReportData.filter(item => item.status === 'submitted').length} Certificate(s)
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-3xl">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tenant</th>
                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tax PIN</th>
                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Invoice #</th>
                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Rent (KES)</th>
                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">WHT due (10%)</th>
                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Certificate #</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {whtReportData.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-5 text-xs font-black text-slate-900 dark:text-white uppercase italic">{item.tenantName}</td>
                                            <td className="p-5 text-xs font-mono font-bold text-slate-600 dark:text-slate-350">{item.tenantPin}</td>
                                            <td className="p-5 text-xs font-bold text-slate-500 font-mono">{item.invoiceNumber}</td>
                                            <td className="p-5 text-xs font-black text-slate-900 dark:text-white text-right">KES {item.invoiceAmount.toLocaleString()}</td>
                                            <td className="p-5 text-xs font-black text-amber-600 dark:text-amber-400 text-right">KES {item.expectedWht.toLocaleString()}</td>
                                            <td className="p-5 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap ${
                                                    item.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                                                    item.status === 'submitted' ? 'bg-indigo-100 text-indigo-600 animate-pulse' :
                                                    item.status === 'rejected' ? 'bg-rose-100 text-rose-600' :
                                                    'bg-amber-100 text-amber-600'
                                                }`}>
                                                    {item.status === 'none' ? 'not agent' : item.status}
                                                </span>
                                            </td>
                                            <td className="p-5 text-xs font-mono font-bold text-slate-500 text-right">{item.certificateNumber || '—'}</td>
                                        </tr>
                                    ))}
                                    {whtReportData.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center text-xs font-bold text-slate-400 italic uppercase">No corporate tenant withholding agents found for this month.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const ReportsTab = () => (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Sub-navigation bar */}
            <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar border border-slate-200 dark:border-slate-700/50 shadow-inner">
                <div className="flex gap-1.5 min-w-max">
                    {[
                        { id: 'analytics', label: 'Analytics', icon: ChartPieIcon },
                        { id: 'statements', label: 'Financial Statements', icon: CurrencyIcon },
                        { id: 'commission', label: 'Commission Report', icon: ChartBarIcon },
                        { id: 'arrears', label: 'Arrears Manager', icon: DocumentTextIcon },
                        { id: 'inspections', label: 'Move-out Inspections', icon: ListIcon },
                        { id: 'refunds', label: 'Deposit Refunds', icon: BanknotesIcon },
                        { id: 'itax', label: 'KRA iTax Reports', icon: Cog8ToothIcon },
                    ].map(sub => (
                        <button
                            key={sub.id}
                            onClick={() => setReportsSubTab(sub.id as any)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportsSubTab === sub.id
                                ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200 dark:border-slate-700'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            <sub.icon className="w-3.5 h-3.5" />
                            {sub.label}
                        </button>
                    ))}
                </div>
            </div>

            {reportsSubTab === 'analytics' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Period selection bar */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider italic">Collection Analysis Dashboard</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time property collections and invoicing data</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Reporting Period:</span>
                            <select
                                value={selectedReportPeriod}
                                onChange={(e) => {
                                    setSelectedReportPeriod(e.target.value);
                                    setSelectedPropertyForDrillDown(null); // Reset drill-down
                                }}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            >
                                <option value="All">All Time</option>
                                {availablePeriods.map(p => (
                                    <option key={p.key} value={p.key}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Overall Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-md relative overflow-hidden group">
                            <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                                Total Invoiced
                            </h5>
                            <p className="text-2xl font-black text-slate-950 dark:text-white italic">KES {periodSummary.totalInvoiced.toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-md relative overflow-hidden group">
                            <h5 className="text-[9px] font-black uppercase text-emerald-600 tracking-widest mb-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                                Total Collected
                            </h5>
                            <p className="text-2xl font-black text-slate-950 dark:text-white italic">KES {periodSummary.totalCollected.toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-md relative overflow-hidden group">
                            <h5 className="text-[9px] font-black uppercase text-rose-600 tracking-widest mb-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
                                Outstanding Arrears
                            </h5>
                            <p className="text-2xl font-black text-slate-950 dark:text-white italic">KES {periodSummary.totalArrears.toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-md relative overflow-hidden group">
                            <h5 className="text-[9px] font-black uppercase text-indigo-600 tracking-widest mb-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                                Collection Rate
                            </h5>
                            <div className="flex items-center gap-3">
                                <p className="text-2xl font-black text-slate-950 dark:text-white italic">{periodSummary.collectionRate}%</p>
                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-705 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            periodSummary.collectionRate >= 90 ? 'bg-emerald-500' :
                                            periodSummary.collectionRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${Math.min(periodSummary.collectionRate, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Rent Collection Trend (Monthly)</h4>
                            <div className="h-64 flex items-end gap-2 px-4 shadow-inner bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6">
                                {(() => {
                                    const maxAmount = Math.max(...realMonthlyRentTrend.map(t => t.amount), 1);
                                    return realMonthlyRentTrend.map((t, i) => {
                                        const h = (t.amount / maxAmount) * 100;
                                        return (
                                            <div key={i} className="flex-1 bg-blue-600 rounded-t-xl hover:bg-blue-400 transition-all cursor-pointer relative group" style={{ height: `${Math.max(h, 4)}%` }}>
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-md">
                                                    {t.monthLabel}: KES {t.amount?.toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                            <div className="flex justify-between mt-4 px-2">
                                {realMonthlyRentTrend.map((t, i) => (
                                    <span key={i} className="text-[8px] font-black text-slate-400 uppercase tracking-widest" style={{ transform: 'rotate(-45deg)' }}>{t.monthLabel.split(' ')[0]}</span>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Unit Status Distribution</h4>
                            {(() => {
                                const occupiedCount = units.filter(u => u.status === 'Occupied').length;
                                const vacantCount = units.filter(u => u.status === 'Vacant').length;
                                const repairCount = units.filter(u => u.status === 'Maintenance').length;
                                const totalUnitsCount = units.length || 1;

                                const occupiedPercent = Math.round((occupiedCount / totalUnitsCount) * 100);
                                const vacantPercent = Math.round((vacantCount / totalUnitsCount) * 100);
                                const repairPercent = Math.max(0, 100 - occupiedPercent - vacantPercent);

                                let accum = 0;
                                const gradientParts = [];
                                if (occupiedCount > 0) {
                                    gradientParts.push(`#2563eb 0% ${occupiedPercent}%`);
                                    accum += occupiedPercent;
                                }
                                if (vacantCount > 0) {
                                    gradientParts.push(`#10b981 ${accum}% ${accum + vacantPercent}%`);
                                    accum += vacantPercent;
                                }
                                if (repairCount > 0) {
                                    gradientParts.push(`#ef4444 ${accum}% 100%`);
                                }
                                const gradientStyle = gradientParts.length > 0 
                                    ? `conic-gradient(${gradientParts.join(', ')})`
                                    : 'conic-gradient(#cbd5e1 0% 100%)';
                                    
                                return (
                                    <div className="flex items-center justify-around h-64">
                                        <div 
                                            className="w-40 h-40 rounded-full relative flex items-center justify-center shadow-lg"
                                            style={{ background: gradientStyle }}
                                        >
                                            <div className="w-28 h-28 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center flex-col shadow-inner">
                                                <span className="font-black text-2xl text-slate-800 dark:text-white italic">{units.length}</span>
                                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Total Units</span>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded bg-blue-600 shadow-sm"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Occupied</span>
                                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{occupiedCount} ({occupiedPercent}%)</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded bg-emerald-500 shadow-sm"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Vacant</span>
                                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{vacantCount} ({vacantPercent}%)</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded bg-rose-500 shadow-sm"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Under Repair</span>
                                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{repairCount} ({repairPercent}%)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Cash Flow Breakdown Chart */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cash Flow Breakdown (Incoming vs Expenses vs Landlord Payouts)</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Comparison of collections, expense vouchers paid, and landlord payouts</p>
                            </div>
                            <div className="flex gap-4 text-[8px] font-black uppercase tracking-widest">
                                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-600 rounded"></span> Inflow</div>
                                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded"></span> Outflow</div>
                                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded"></span> Payouts</div>
                            </div>
                        </div>
                        <div className="h-72 flex items-end gap-6 px-4 shadow-inner bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6">
                            {(() => {
                                const maxVal = Math.max(...cashFlowTrend.map(t => Math.max(t.revenue, t.outflow, t.payouts)), 1);
                                return cashFlowTrend.map((t, i) => (
                                    <div key={i} className="flex-1 flex flex-col justify-end h-full relative group">
                                        <div className="flex items-end justify-center gap-1.5 h-full">
                                            {/* Inflow bar */}
                                            <div className="w-4 bg-blue-600 rounded-t hover:brightness-110 transition-all relative" style={{ height: `${(t.revenue / maxVal) * 100}%` }}>
                                                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded shadow z-10 whitespace-nowrap">
                                                    Inflow: KES {t.revenue.toLocaleString()}
                                                </div>
                                            </div>
                                            {/* Outflow bar */}
                                            <div className="w-4 bg-rose-500 rounded-t hover:brightness-110 transition-all relative" style={{ height: `${(t.outflow / maxVal) * 100}%` }}>
                                                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded shadow z-10 whitespace-nowrap">
                                                    Outflow: KES {t.outflow.toLocaleString()}
                                                </div>
                                            </div>
                                            {/* Payouts bar */}
                                            <div className="w-4 bg-amber-500 rounded-t hover:brightness-110 transition-all relative" style={{ height: `${(t.payouts / maxVal) * 100}%` }}>
                                                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded shadow z-10 whitespace-nowrap">
                                                    Payouts: KES {t.payouts.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center mt-2 truncate w-full">{t.monthLabel}</span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* Property Collection Progress Table/Breakdown */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Collection Progress per Property</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Detailed performance tracking of billing vs cash collection</p>
                            </div>
                            <div className="relative w-full md:w-80">
                                <input
                                    type="text"
                                    placeholder="Search property..."
                                    value={propertySearchQuery}
                                    onChange={(e) => setPropertySearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-200"
                                />
                                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            </div>
                        </div>

                        {/* List/Table */}
                        <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-inner bg-slate-50/50 dark:bg-slate-900/30">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50">
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Property</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Units</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Invoiced</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Collected</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Arrears</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Progress</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                                    {propertiesCollectionData
                                        .filter(d => d.property.name.toLowerCase().includes(propertySearchQuery.toLowerCase()))
                                        .map((d) => (
                                            <React.Fragment key={d.property.id}>
                                                <tr className={`hover:bg-slate-100/30 dark:hover:bg-slate-800/20 transition-all ${selectedPropertyForDrillDown === d.property.id ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}>
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-slate-750 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100/50 dark:border-slate-750">
                                                                <HomeIcon className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">{d.property.name}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{d.property.town || 'No Address'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-center text-xs font-bold text-slate-600 dark:text-slate-300">{d.unitsCount}</td>
                                                    <td className="p-5 text-right text-xs font-black text-slate-900 dark:text-white italic">KES {d.totalInvoiced.toLocaleString()}</td>
                                                    <td className="p-5 text-right text-xs font-black text-emerald-600 italic">KES {d.totalCollected.toLocaleString()}</td>
                                                    <td className="p-5 text-right text-xs font-black text-rose-500 italic">KES {d.arrears.toLocaleString()}</td>
                                                    <td className="p-5 w-48">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                                        d.collectionRate >= 90 ? 'bg-emerald-500' :
                                                                        d.collectionRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                                                    }`}
                                                                    style={{ width: `${Math.min(d.collectionRate, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className={`text-[10px] font-black ${
                                                                d.collectionRate >= 90 ? 'text-emerald-500' :
                                                                d.collectionRate >= 60 ? 'text-amber-500' : 'text-rose-500'
                                                            }`}>{d.collectionRate}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <button
                                                            onClick={() => setSelectedPropertyForDrillDown(selectedPropertyForDrillDown === d.property.id ? null : d.property.id)}
                                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider mx-auto transition-all ${
                                                                selectedPropertyForDrillDown === d.property.id
                                                                    ? 'bg-blue-600 text-white shadow-md'
                                                                    : 'bg-white dark:bg-slate-750 border border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                                                            }`}
                                                        >
                                                            <EyeIcon className="w-3.5 h-3.5" />
                                                            {selectedPropertyForDrillDown === d.property.id ? 'Close' : 'View Units'}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* Expanded Units Drilldown */}
                                                {selectedPropertyForDrillDown === d.property.id && (
                                                    <tr>
                                                        <td colSpan={7} className="p-6 bg-slate-100/40 dark:bg-slate-900/40 border-y border-slate-200/50 dark:border-slate-700/50">
                                                            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                                <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600 italic">Unit-level Collection Drill-down</h5>
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                    {d.propUnits.map(unit => {
                                                                        const lease = d.propLeases.find(l => l.unitId === unit.id);
                                                                        const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : null;
                                                                        
                                                                        const unitInvoices = d.propInvoices.filter(inv => inv.unitId === unit.id);
                                                                        const unitPayments = d.propPayments.filter(p => p.leaseId === lease?.id);

                                                                        const invSum = unitInvoices.reduce((s, inv) => s + inv.amount, 0);
                                                                        const paySum = unitPayments.reduce((s, p) => s + p.amount, 0);
                                                                        const unitArrears = Math.max(0, invSum - paySum);
                                                                        const unitRate = invSum > 0 ? Math.round((paySum / invSum) * 100) : (paySum > 0 ? 100 : 0);

                                                                        return (
                                                                            <div key={unit.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm space-y-3">
                                                                                <div className="flex justify-between items-start">
                                                                                    <div>
                                                                                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Unit {unit.unitNumber}</p>
                                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{unit.unitType}</p>
                                                                                    </div>
                                                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                                                        unit.status === 'Occupied' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100 dark:border-emerald-950/30' :
                                                                                        unit.status === 'Vacant' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-100 dark:border-amber-950/30' :
                                                                                        'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-100 dark:border-rose-950/30'
                                                                                    }`}>
                                                                                        {unit.status}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="border-t border-slate-100 dark:border-slate-700/50 pt-2 space-y-1.5">
                                                                                    <div className="flex justify-between text-[10px]">
                                                                                        <span className="font-bold text-slate-400 uppercase">Tenant:</span>
                                                                                        <span className="font-black text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{tenant ? tenant.name : <em className="text-slate-400">None</em>}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between text-[10px]">
                                                                                        <span className="font-bold text-slate-400 uppercase">Invoiced:</span>
                                                                                        <span className="font-black text-slate-800 dark:text-slate-200">KES {invSum.toLocaleString()}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between text-[10px]">
                                                                                        <span className="font-bold text-slate-400 uppercase">Collected:</span>
                                                                                        <span className="font-black text-emerald-600">KES {paySum.toLocaleString()}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between text-[10px]">
                                                                                        <span className="font-bold text-slate-400 uppercase">Balance:</span>
                                                                                        <span className="font-black text-rose-500">KES {unitArrears.toLocaleString()}</span>
                                                                                    </div>
                                                                                </div>
                                                                                {invSum > 0 && (
                                                                                    <div className="space-y-1">
                                                                                        <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase">
                                                                                            <span>Collection Progress:</span>
                                                                                            <span className={unitRate >= 90 ? 'text-emerald-500' : unitRate >= 60 ? 'text-amber-500' : 'text-rose-500'}>{unitRate}%</span>
                                                                                        </div>
                                                                                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                                                                            <div 
                                                                                                className={`h-full rounded-full transition-all duration-300 ${
                                                                                                    unitRate >= 90 ? 'bg-emerald-500' :
                                                                                                    unitRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                                                                                }`}
                                                                                                style={{ width: `${Math.min(unitRate, 100)}%` }}
                                                                                            ></div>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {d.propUnits.length === 0 && (
                                                                    <p className="text-center text-xs text-slate-400 py-6 font-bold uppercase tracking-wider">No units found in this property</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    {propertiesCollectionData.filter(d => d.property.name.toLowerCase().includes(propertySearchQuery.toLowerCase())).length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest italic">No properties matching your search</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {reportsSubTab === 'statements' && <StatementsManager />}

            {reportsSubTab === 'arrears' && (
                <ArrearsManager
                    leases={leases}
                    tenants={tenants}
                    units={units}
                    properties={properties}
                    landlords={landlords}
                    payments={payments}
                    invoices={invoices}
                    currentInstitution={currentInstitution}
                    institutionId={institutionId}
                    loadData={loadData}
                    pmSettings={pmSettings}
                    setPmSettings={setPmSettings}
                    companyDetails={companyDetails}
                />
            )}

            {reportsSubTab === 'inspections' && <InspectionsManager />}
            {reportsSubTab === 'refunds' && <DepositRefundsManager />}
            {reportsSubTab === 'itax' && <KRAiTaxReportsPanel />}

            {reportsSubTab === 'commission' && (() => {
                // Apply date range filter
                const filteredPayments = payments.filter(p => {
                    if (p.paymentType !== 'Rent') return false;
                    if (commStartDate && p.paymentDate < commStartDate) return false;
                    if (commEndDate && p.paymentDate > commEndDate) return false;
                    return true;
                });

                // Build per-property commission data
                const commissionRows = properties.map(prop => {
                    const propUnits = units.filter(u => u.propertyId === prop.id);
                    const unitIds = propUnits.map(u => u.id);
                    const propLeases = leases.filter(l => unitIds.includes(l.unitId));
                    const leaseIds = propLeases.map(l => l.id);
                    const propPayments = filteredPayments.filter(p => leaseIds.includes(p.leaseId));
                    const gross = propPayments.reduce((s, p) => s + p.amount, 0);
                    const commission = propPayments.reduce((s, p) => s + (p.commissionAmount || 0), 0);
                    
                    // Deduct approved and paid expenses
                    const propExpenses = expenses.filter(e => e.propertyId === prop.id && (e.status === 'Approved' || e.status === 'Paid'));
                    const totalPropExpenses = propExpenses.reduce((s, e) => s + e.amount, 0);
                    const net = gross - commission - totalPropExpenses;
                    
                    const landlord = landlords.find(l => l.id === prop.landlordId);
                    return { prop, propPayments, gross, commission, net, landlord, propUnits, totalPropExpenses };
                }).filter(r => r.gross > 0 || r.propPayments.length > 0 || r.totalPropExpenses > 0);

                const totalGross = commissionRows.reduce((s, r) => s + r.gross, 0);
                const totalComm = commissionRows.reduce((s, r) => s + r.commission, 0);
                const totalExpensesVal = commissionRows.reduce((s, r) => s + r.totalPropExpenses, 0);
                const totalNet = totalGross - totalComm - totalExpensesVal;

                return (
                    <div className="space-y-8">
                        {/* ── Date Range Filter Bar ── */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Filter by Date Range</p>
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Quick filters */}
                                {[
                                    { label: 'All Time', start: '', end: '' },
                                    { label: 'This Month', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10), end: new Date().toISOString().slice(0,10) },
                                    { label: 'Last 30d', start: new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10), end: new Date().toISOString().slice(0,10) },
                                    { label: 'Last 3 Months', start: new Date(Date.now() - 90*24*60*60*1000).toISOString().slice(0,10), end: new Date().toISOString().slice(0,10) },
                                    { label: 'Last 6 Months', start: new Date(Date.now() - 180*24*60*60*1000).toISOString().slice(0,10), end: new Date().toISOString().slice(0,10) },
                                    { label: 'This Year', start: `${new Date().getFullYear()}-01-01`, end: new Date().toISOString().slice(0,10) },
                                ].map(q => (
                                    <button
                                        key={q.label}
                                        onClick={() => { setCommStartDate(q.start); setCommEndDate(q.end); }}
                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                            commStartDate === q.start && commEndDate === q.end
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        }`}
                                    >
                                        {q.label}
                                    </button>
                                ))}
                                <div className="flex items-center gap-2 ml-auto">
                                    <input
                                        type="date"
                                        value={commStartDate}
                                        onChange={e => setCommStartDate(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-purple-500 transition-all"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400">to</span>
                                    <input
                                        type="date"
                                        value={commEndDate}
                                        onChange={e => setCommEndDate(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-purple-500 transition-all"
                                    />
                                </div>
                            </div>
                            {(commStartDate || commEndDate) && (
                                <p className="text-[9px] font-bold text-purple-500 mt-3 uppercase tracking-widest">
                                    Showing: {commStartDate || 'beginning'} → {commEndDate || 'today'} · {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                        {/* ── Summary Cards ── */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Total Rent Collected</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-white italic">KES {totalGross.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{commissionRows.length} propert{commissionRows.length === 1 ? 'y' : 'ies'}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-purple-100 dark:border-purple-900/30 shadow-xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-3">Total Commission Earned</p>
                                <p className="text-3xl font-black text-purple-600 italic">KES {totalComm.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{totalGross > 0 ? ((totalComm / totalGross) * 100).toFixed(1) : 0}% of collections</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/30 shadow-xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-3">Total Net to Landlords</p>
                                <p className="text-3xl font-black text-emerald-600 italic">KES {totalNet.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">After management fees & expenses</p>
                            </div>
                        </div>

                        {/* ── Per-Property Summary ── */}
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Property Commission Summary</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Property</th>
                                            <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Landlord</th>
                                            <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Rate</th>
                                            <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Gross Collected</th>
                                            <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Commission</th>
                                            <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Expenses</th>
                                            <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Net Payout</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {commissionRows.map(({ prop, gross, commission, net, landlord, totalPropExpenses }) => (
                                            <tr key={prop.id} className="border-t border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                                                <td className="p-5">
                                                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase italic">{prop.name}</div>
                                                    {prop.town && <div className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">{prop.town}</div>}
                                                </td>
                                                <td className="p-5 text-xs font-bold text-purple-600 uppercase">{landlord?.name || <span className="text-slate-400 italic font-normal">Standalone</span>}</td>
                                                <td className="p-5">
                                                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 text-[9px] font-black px-2.5 py-1 rounded-full">{prop.commissionRate || 0}%</span>
                                                </td>
                                                <td className="p-5 text-right text-sm font-black text-slate-900 dark:text-white">KES {gross.toLocaleString()}</td>
                                                <td className="p-5 text-right text-sm font-black text-purple-600">KES {commission.toLocaleString()}</td>
                                                <td className="p-5 text-right text-sm font-black text-rose-500">KES {totalPropExpenses.toLocaleString()}</td>
                                                <td className="p-5 text-right text-sm font-black text-emerald-600">KES {net.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {commissionRows.length === 0 && (
                                            <tr><td colSpan={7} className="p-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest italic">No payment data found</td></tr>
                                        )}
                                        {commissionRows.length > 0 && (
                                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-t-2 border-slate-200 dark:border-slate-600">
                                                <td colSpan={3} className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Totals</td>
                                                <td className="p-5 text-right font-black text-slate-900 dark:text-white">KES {totalGross.toLocaleString()}</td>
                                                <td className="p-5 text-right font-black text-purple-600">KES {totalComm.toLocaleString()}</td>
                                                <td className="p-5 text-right font-black text-rose-500">KES {totalExpensesVal.toLocaleString()}</td>
                                                <td className="p-5 text-right font-black text-emerald-600">KES {totalNet.toLocaleString()}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ── Detailed Per-Payment Breakdown ── */}
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Detailed Commission Breakdown — All Payments</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Property / Unit</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Tenant</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Method</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Gross (KES)</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Commission (KES)</th>
                                            <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Net (KES)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const allDetailRows = filteredPayments
                                                .filter(p => (p.commissionAmount || 0) > 0)
                                                .map(p => {
                                                    const lease = leases.find(l => l.id === p.leaseId);
                                                    const unit = units.find(u => u.id === lease?.unitId);
                                                    const prop = properties.find(pr => pr.id === unit?.propertyId);
                                                    const tenant = tenants.find(t => t.id === lease?.tenantId);
                                                    return { p, lease, unit, prop, tenant };
                                                })
                                                .sort((a, b) => b.p.paymentDate.localeCompare(a.p.paymentDate));

                                            if (allDetailRows.length === 0) return (
                                                <tr><td colSpan={7} className="p-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest italic">No commission payments recorded yet</td></tr>
                                            );

                                            return allDetailRows.map(({ p, unit, prop, tenant }) => (
                                                <tr key={p.id} className="border-t border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                                                    <td className="p-4 text-[10px] font-bold text-slate-500">{p.paymentDate}</td>
                                                    <td className="p-4">
                                                        <div className="text-xs font-black text-slate-900 dark:text-white uppercase">{prop?.name || '—'}</div>
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Unit {unit?.unitNumber || '—'}</div>
                                                    </td>
                                                    <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">{tenant?.name || '—'}</td>
                                                    <td className="p-4">
                                                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">{p.paymentMethod || '—'}</span>
                                                    </td>
                                                    <td className="p-4 text-right text-xs font-black text-slate-900 dark:text-white">{p.amount.toLocaleString()}</td>
                                                    <td className="p-4 text-right text-xs font-black text-purple-600">{(p.commissionAmount || 0).toLocaleString()}</td>
                                                    <td className="p-4 text-right text-xs font-black text-emerald-600">{(p.amount - (p.commissionAmount || 0)).toLocaleString()}</td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );

    const InspectionsManager = () => {
        const [inspSearch, setInspSearch] = useState('');
        const [statusFilter, setStatusFilter] = useState('all');

        const filtered = inspections.filter(insp => {
            const lease = leases.find(l => l.id === insp.leaseId);
            const tenant = tenants.find(t => t.id === (lease?.tenantId || insp.tenantId));
            const matchesSearch = !inspSearch || (tenant?.name || '').toLowerCase().includes(inspSearch.toLowerCase());
            const matchesStatus = statusFilter === 'all' || insp.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider italic">Move-Out & Vacate Inspections</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Record physical unit condition before lease termination</p>
                    </div>
                    <button
                        onClick={() => { setEditingInspection(null); setShowInspectionModal(true); }}
                        className="btn-primary flex items-center justify-center gap-2 h-12 bg-blue-600 hover:bg-blue-700 text-white uppercase tracking-widest text-[10px] font-black px-6 rounded-2xl shadow-lg transition-all"
                    >
                        <PlusIcon className="w-4 h-4" /> Conduct Inspection
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="search"
                        placeholder="Search by Tenant Name..."
                        value={inspSearch}
                        onChange={e => setInspSearch(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold outline-none text-slate-700 dark:text-slate-200 shadow-sm"
                    />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none shadow-sm"
                    >
                        <option value="all">All Statuses</option>
                        <option value="Draft">Draft</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tenant / Unit</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Repairs Needed</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Est. Cost</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(insp => {
                                    const lease = leases.find(l => l.id === insp.leaseId);
                                    const tenant = tenants.find(t => t.id === (lease?.tenantId || insp.tenantId));
                                    const unit = units.find(u => u.id === lease?.unitId);
                                    return (
                                        <tr key={insp.id} className="border-t border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-5 text-xs text-slate-500 font-bold">{new Date(insp.inspectionDate).toLocaleDateString()}</td>
                                            <td className="p-5">
                                                <div className="font-black text-slate-900 dark:text-white uppercase italic">{tenant?.name || '—'}</div>
                                                <div className="text-[9px] text-slate-400 uppercase font-black">Unit {unit?.unitNumber || '—'}</div>
                                            </td>
                                            <td className="p-5 text-xs text-slate-600 dark:text-slate-300">
                                                {(() => {
                                                    try {
                                                        const parsed = JSON.parse(insp.repairsRequired || '{}');
                                                        const itemsDesc = parsed.items.map((it: any) => it.description).filter(Boolean).join(', ');
                                                        let desc = '';
                                                        if (parsed.waterBill > 0) desc += `Water Bill (KES ${parsed.waterBill}), `;
                                                        if (parsed.electricityBill > 0) desc += `Electricity Bill (KES ${parsed.electricityBill}), `;
                                                        if (itemsDesc) desc += itemsDesc;
                                                        return desc.replace(/, $/, '') || <span className="text-slate-400 italic">No issues found</span>;
                                                    } catch (e) {
                                                        return insp.repairsRequired || <span className="text-slate-400 italic">None</span>;
                                                    }
                                                })()}
                                            </td>
                                            <td className="p-5 text-right font-black text-slate-900 dark:text-white text-xs">KES {insp.estimatedRepairCost.toLocaleString()}</td>
                                            <td className="p-5">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${
                                                    insp.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/30' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-100'
                                                }`}>
                                                    {insp.status}
                                                </span>
                                            </td>
                                            <td className="p-5 text-right space-x-2 whitespace-nowrap">
                                                <button
                                                    onClick={async () => {
                                                        if (!lease || !tenant || !unit) {
                                                            alert("Required record details not found to generate PDF.");
                                                            return;
                                                        }
                                                        const prop = properties.find(p => p.id === unit.propertyId);
                                                        if (!prop) {
                                                            alert("Property details not found.");
                                                            return;
                                                        }
                                                        await pdfService.downloadPMInspectionPdf(
                                                            insp, tenant, unit, prop, currentInstitution, companyDetails, currentInstitution.logoUrl || null, pmSettings?.branding?.letterheadUrl || null
                                                        );
                                                    }}
                                                    className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"
                                                    title="Download PDF"
                                                >
                                                    <DownloadIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { setEditingInspection(insp); setShowInspectionModal(true); }} className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl" title="Edit"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteInspection(insp.id)} className="p-2.5 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-xl" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={6} className="p-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest italic">No inspection forms found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const DepositRefundsManager = () => {
        const [refSearch, setRefSearch] = useState('');
        const [statusFilter, setStatusFilter] = useState('all');

        const filtered = depositRefunds.filter(ref => {
            const lease = leases.find(l => l.id === ref.leaseId);
            const tenant = tenants.find(t => t.id === (lease?.tenantId || ref.tenantId));
            const matchesSearch = !refSearch || (tenant?.name || '').toLowerCase().includes(refSearch.toLowerCase());
            const matchesStatus = statusFilter === 'all' || ref.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        const handleApproveRefund = async (refund: PMDepositRefund) => {
            try {
                const updated = { ...refund, status: 'Approved' as const };
                await apiService.saveModuleRecord('pm_deposit_refunds', updated);
                loadData();
                alert("Deposit refund statement approved!");
            } catch (e: any) { alert(e.message || "Failed to approve refund"); }
        };

        const handlePayRefund = async (refund: PMDepositRefund) => {
            try {
                const updated = { ...refund, status: 'Paid' as const };
                await apiService.saveModuleRecord('pm_deposit_refunds', updated);
                loadData();
                alert("Deposit refund statement marked as Paid!");
            } catch (e: any) { alert(e.message || "Failed to mark refund as Paid"); }
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider italic">Deposit Refund Statements</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Generate final settlement statements for vacating tenants</p>
                    </div>
                    <button
                        onClick={() => { setEditingRefund(null); setShowRefundModal(true); }}
                        className="btn-primary flex items-center justify-center gap-2 h-12 bg-blue-600 hover:bg-blue-700 text-white uppercase tracking-widest text-[10px] font-black px-6 rounded-2xl shadow-lg transition-all"
                    >
                        <PlusIcon className="w-4 h-4" /> Create Refund Statement
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="search"
                        placeholder="Search by Tenant Name..."
                        value={refSearch}
                        onChange={e => setRefSearch(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold outline-none text-slate-700 dark:text-slate-200 shadow-sm"
                    />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none shadow-sm"
                    >
                        <option value="all">All Statuses</option>
                        <option value="Pending Approval">Pending Approval</option>
                        <option value="Approved">Approved</option>
                        <option value="Paid">Paid</option>
                    </select>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tenant / Unit</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Original Deposit</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total Deductions</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Refund Amount</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(ref => {
                                    const lease = leases.find(l => l.id === ref.leaseId);
                                    const tenant = tenants.find(t => t.id === (lease?.tenantId || ref.tenantId));
                                    const unit = units.find(u => u.id === lease?.unitId);
                                    const deductions = ref.rentArrearsDeduction + ref.utilityArrearsDeduction + ref.damageRepairDeduction + ref.otherDeductions;
                                    return (
                                        <tr key={ref.id} className="border-t border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-5 text-xs text-slate-500 font-bold">{new Date(ref.statementDate).toLocaleDateString()}</td>
                                            <td className="p-5">
                                                <div className="font-black text-slate-900 dark:text-white uppercase italic">{tenant?.name || '—'}</div>
                                                <div className="text-[9px] text-slate-400 uppercase font-black">Unit {unit?.unitNumber || '—'}</div>
                                            </td>
                                            <td className="p-5 text-right font-black text-slate-600 dark:text-slate-400 text-xs">KES {ref.originalDeposit.toLocaleString()}</td>
                                            <td className="p-5 text-right font-black text-rose-500 text-xs">- KES {deductions.toLocaleString()}</td>
                                            <td className="p-5 text-right font-black text-emerald-600 text-xs">KES {ref.refundAmount.toLocaleString()}</td>
                                            <td className="p-5">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${
                                                    ref.status === 'Paid' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100 dark:border-emerald-950/30' :
                                                    ref.status === 'Approved' ? 'bg-blue-50 dark:bg-blue-955/20 text-blue-600 border-blue-100 dark:border-blue-955/30' :
                                                    'bg-amber-50 dark:bg-amber-955/20 text-amber-600 border-amber-100'
                                                }`}>
                                                    {ref.status}
                                                </span>
                                            </td>
                                            <td className="p-5 text-right space-x-2 whitespace-nowrap">
                                                {ref.status === 'Pending Approval' && (
                                                    <button onClick={() => handleApproveRefund(ref)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider">Approve</button>
                                                )}
                                                {ref.status === 'Approved' && (
                                                    <button onClick={() => handlePayRefund(ref)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider">Disburse</button>
                                                )}
                                                <button
                                                    onClick={async () => {
                                                        if (!lease || !tenant || !unit) {
                                                            alert("Required record details not found to generate PDF.");
                                                            return;
                                                        }
                                                        const prop = properties.find(p => p.id === unit.propertyId);
                                                        if (!prop) {
                                                            alert("Property details not found.");
                                                            return;
                                                        }
                                                        await pdfService.downloadPMDepositRefundPdf(
                                                            ref, lease, tenant, unit, prop, currentInstitution, companyDetails, currentInstitution.logoUrl || null, pmSettings?.branding?.letterheadUrl || null
                                                        );
                                                    }}
                                                    className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"
                                                    title="Download PDF"
                                                >
                                                    <DownloadIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { setEditingRefund(ref); setShowRefundModal(true); }} className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl" title="Edit"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteRefund(ref.id)} className="p-2.5 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-xl" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={7} className="p-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest italic">No deposit refund statements found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderTabs = () => (
        <div className="relative group/tabs mb-8">
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl w-full overflow-x-auto scrollbar-hide border border-slate-200 dark:border-slate-700/50 shadow-inner no-scrollbar">
                <div className="flex gap-1.5 min-w-max">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
                        { id: 'properties', label: 'Assets', icon: BuildingOfficeIcon },
                        { id: 'staff', label: 'Staff Members', icon: UserGroupIcon },
                        { id: 'config', label: 'PM Settings', icon: SettingsIcon },
                        { id: 'payouts', label: 'Payouts', icon: CreditCardIcon },
                        { id: 'expenses', label: 'Expenses', icon: CurrencyIcon },
                        { id: 'listings', label: 'Listings', icon: ShoppingCartIcon },
                        { id: 'inquiries', label: 'Inquiries', icon: UserPlusIcon },
                        { id: 'comms', label: 'Communications', icon: ChatBubbleLeftRightIcon },
                        { id: 'reports', label: 'Reports', icon: DocumentTextIcon },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/50'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-white/5'
                                } `}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-bounce' : ''} `} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            {/* Scroll Indicator Gradient */}
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-50 dark:from-slate-900 to-transparent pointer-events-none opacity-0 group-hover/tabs:opacity-100 transition-opacity lg:hidden"></div>
        </div>
    );

    const SmartTenantImporterModal = () => {
        const [importFile, setImportFile] = useState<File | null>(null);
        const [isProcessing, setIsProcessing] = useState(false);
        const [processedCount, setProcessedCount] = useState(0);
        const [totalCount, setTotalCount] = useState(0);
        const [step, setStep] = useState<'upload' | 'map'>('upload');
        const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
        const [rawData, setRawData] = useState<any[]>([]);

        // ── Bulk Undo State ──────────────────────────────────────────────────
        type ImportLog = { module: string; ids: string[] }[];
        const [lastImportLog, setLastImportLog] = useState<ImportLog | null>(null);
        const [showUndoConfirm, setShowUndoConfirm] = useState(false);
        const [isUndoing, setIsUndoing] = useState(false);
        const [undoProgress, setUndoProgress] = useState({ done: 0, total: 0 });
        // ─────────────────────────────────────────────────────────────────────

        const [mappings, setMappings] = useState<Record<string, string>>({
            tenantName: '',
            phone: '',
            email: '',
            idNumber: '',
            propertyName: '',
            unitNumber: '',
            monthlyRent: '',
            depositPaid: '',
            openingBalance: '',
            startDate: ''
        });

        const handleFileSelect = (selectedFile: File) => {
            setImportFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    const sheetData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    if (sheetData.length === 0) {
                        alert("Spreadsheet is empty.");
                        return;
                    }

                    const headers = (sheetData[0] || []).map((h: any) => String(h || '').trim()).filter((h: string) => h !== '');
                    setDetectedHeaders(headers);

                    // Auto-mapping heuristics
                    const nameCol = headers.find((h: string) => /tenant|name|client|customer|full/i.test(h)) || '';
                    const phoneCol = headers.find((h: string) => /phone|mobile|tel|contact/i.test(h)) || '';
                    const emailCol = headers.find((h: string) => /email|mail/i.test(h)) || '';
                    const idCol = headers.find((h: string) => /id|passport|national/i.test(h)) || '';
                    const propCol = headers.find((h: string) => /property|building|apartment|estate|house/i.test(h)) || '';
                    const unitCol = headers.find((h: string) => /unit|room|door|shop|office/i.test(h)) || '';
                    const rentCol = headers.find((h: string) => /rent|monthly|pay|amount|charge/i.test(h)) || '';
                    const depCol = headers.find((h: string) => /deposit|dep/i.test(h)) || '';
                    const balCol = headers.find((h: string) => /balance|opening|arrears|debt|credit/i.test(h)) || '';
                    const startCol = headers.find((h: string) => /start|date|lease|onboard/i.test(h)) || '';

                    setMappings({
                        tenantName: nameCol,
                        phone: phoneCol,
                        email: emailCol,
                        idNumber: idCol,
                        propertyName: propCol,
                        unitNumber: unitCol,
                        monthlyRent: rentCol,
                        depositPaid: depCol,
                        openingBalance: balCol,
                        startDate: startCol
                    });

                    const rowsJson = XLSX.utils.sheet_to_json(worksheet);
                    setRawData(rowsJson);
                    setStep('map');
                } catch (err: any) {
                    alert("Failed to parse sheet: " + err.message);
                }
            };
            reader.readAsArrayBuffer(selectedFile);
        };

        const previewData = useMemo(() => {
            return rawData.slice(0, 5).map(row => {
                return {
                    tenantName: row[mappings.tenantName] || '—',
                    phone: row[mappings.phone] || '—',
                    email: row[mappings.email] || '—',
                    propertyName: row[mappings.propertyName] || '—',
                    unitNumber: row[mappings.unitNumber] || '—',
                    monthlyRent: row[mappings.monthlyRent] || '—',
                    openingBalance: row[mappings.openingBalance] || '—',
                    startDate: row[mappings.startDate] || '—'
                };
            });
        }, [rawData, mappings]);

        const handleImport = async () => {
            if (!mappings.tenantName || !mappings.phone || !mappings.propertyName || !mappings.unitNumber || !mappings.monthlyRent) {
                alert("Tenant Name, Phone, Property Name, Unit Number, and Monthly Rent mappings are required.");
                return;
            }
            setIsProcessing(true);
            setProcessedCount(0);
            setTotalCount(rawData.length);

            try {
                const targetInstitutionId = currentInstitution?.id || currentUser?.institutionId;
                if (!targetInstitutionId) {
                    alert("Cannot resolve a valid institution context for import.");
                    setIsProcessing(false);
                    return;
                }

                const localProperties = [...properties];
                const localUnits = [...units];
                const localTenants = [...tenants];

                const tenantPayloads: any[] = [];
                const userPayloads: any[] = [];
                const leasePayloads: any[] = [];
                const invoicePayloads: any[] = [];
                const paymentPayloads: any[] = [];
                const propertyPayloads: any[] = [];
                const unitPayloads: any[] = [];
                const unitUpdates: any[] = [];

                for (const row of rawData) {
                    const tenantName = String(row[mappings.tenantName] || '').trim();
                    const phone = String(row[mappings.phone] || '').trim();
                    const propertyName = String(row[mappings.propertyName] || '').trim();
                    const unitNum = String(row[mappings.unitNumber] || '').trim();
                    const monthlyRent = parseFloat(row[mappings.monthlyRent]) || 0;

                    if (!tenantName || !phone || !propertyName || !unitNum) continue;

                    // 1. Resolve Property
                    let property = localProperties.find(p => p.name.toLowerCase() === propertyName.toLowerCase());
                    if (!property) {
                        const newPropId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        property = {
                            id: newPropId,
                            name: propertyName,
                            address: 'Imported Property',
                            propertyType: 'Apartment',
                            totalUnits: 0,
                            commissionRate: 8,
                            institutionId: targetInstitutionId,
                            createdAt: new Date().toISOString()
                        };
                        localProperties.push(property);
                        propertyPayloads.push(property);
                    }

                    // 2. Resolve Unit
                    let unit = localUnits.find(u => u.propertyId === property!.id && u.unitNumber.toLowerCase() === unitNum.toLowerCase());
                    if (!unit) {
                        const newUnitId = `unit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        unit = {
                            id: newUnitId,
                            propertyId: property!.id,
                            unitNumber: unitNum,
                            unitType: '1 Bedroom',
                            floorNumber: 0,
                            rentAmount: monthlyRent,
                            status: 'Occupied',
                            institutionId: targetInstitutionId,
                            createdAt: new Date().toISOString()
                        };
                        localUnits.push(unit);
                        unitPayloads.push(unit);
                    } else {
                        unit.status = 'Occupied';
                        unitUpdates.push({ ...unit, status: 'Occupied' });
                    }

                    // 3. Resolve/Create Tenant
                    let tenant = localTenants.find(t => t.name.toLowerCase() === tenantName.toLowerCase() || t.phoneNumber === phone);
                    let tenantId = tenant?.id;
                    
                    if (!tenant) {
                        tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${tenantPayloads.length}`;
                        const email = mappings.email ? String(row[mappings.email] || '').trim() : '';
                        const idNumber = mappings.idNumber ? String(row[mappings.idNumber] || '').trim() : '';

                        tenant = {
                            id: tenantId,
                            name: tenantName,
                            phoneNumber: phone,
                            email: email || undefined,
                            idNumber: idNumber || undefined,
                            institutionId: targetInstitutionId,
                            createdAt: new Date().toISOString()
                        };
                        localTenants.push(tenant);
                        tenantPayloads.push(tenant);

                        // User credentials creation if email exists
                        if (email) {
                            const tempPassword = Math.random().toString(36).slice(-8);
                            userPayloads.push({
                                id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                name: tenantName,
                                email,
                                phoneNumber: phone,
                                role: 'tenant',
                                institutionId: targetInstitutionId,
                                createdAt: new Date().toISOString(),
                                isActive: true,
                                mustChangePassword: true,
                                password: tempPassword
                            });
                        }
                    }

                    // 4. Create Lease
                    const leaseId = `lease_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${leasePayloads.length}`;
                    const depositPaid = mappings.depositPaid ? parseFloat(row[mappings.depositPaid]) || 0 : 0;
                    
                    let leaseStartDate = new Date().toISOString().split('T')[0];
                    if (mappings.startDate && row[mappings.startDate]) {
                        try {
                            const parsedDate = new Date(row[mappings.startDate]);
                            if (!isNaN(parsedDate.getTime())) {
                                leaseStartDate = parsedDate.toISOString().split('T')[0];
                            }
                        } catch (_) {}
                    }

                    const lease = {
                        id: leaseId,
                        unitId: unit.id,
                        tenantId: tenantId,
                        startDate: leaseStartDate,
                        rentAmount: monthlyRent,
                        depositAmount: depositPaid,
                        billingCycle: 'Monthly',
                        status: 'Active',
                        institutionId: targetInstitutionId,
                        createdAt: new Date().toISOString()
                    } as PMLease;
                    leasePayloads.push(lease);

                    // 5. Opening Balance Processing
                    const openingBalance = mappings.openingBalance ? parseFloat(row[mappings.openingBalance]) || 0 : 0;
                    if (openingBalance > 0) {
                        // Outstanding debt
                        invoicePayloads.push({
                            id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${invoicePayloads.length}`,
                            invoiceNumber: `INV-OB-${Date.now().toString().slice(-6)}_${invoicePayloads.length}`,
                            leaseId: leaseId,
                            tenantId: tenantId,
                            unitId: unit.id,
                            description: 'Opening Balance (Carried Forward)',
                            amount: openingBalance,
                            issueDate: new Date().toISOString().split('T')[0],
                            dueDate: new Date().toISOString().split('T')[0],
                            status: 'Sent',
                            institutionId: targetInstitutionId,
                            createdAt: new Date().toISOString()
                        } as PMInvoice);
                    } else if (openingBalance < 0) {
                        // Prepaid credit
                        paymentPayloads.push({
                            id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${paymentPayloads.length}`,
                            leaseId: leaseId,
                            amount: Math.abs(openingBalance),
                            paymentDate: new Date().toISOString(),
                            paymentMethod: 'Cash',
                            paymentType: 'Rent',
                            periodMonth: new Date().getMonth() + 1,
                            periodYear: new Date().getFullYear(),
                            status: 'Completed',
                            notes: 'Opening Balance Credit (Carried Forward)',
                            institutionId: targetInstitutionId,
                            createdAt: new Date().toISOString()
                        } as PMPayment);
                    }
                }

                // Batch save the payloads to DB
                let savedItems = 0;
                const totalItemsToSave = propertyPayloads.length + unitPayloads.length + tenantPayloads.length + userPayloads.length + leasePayloads.length + invoicePayloads.length + paymentPayloads.length + unitUpdates.length;
                setTotalCount(totalItemsToSave);

                if (totalItemsToSave === 0) {
                    alert("No valid new records detected in the sheet.");
                    setIsProcessing(false);
                    return;
                }

                const saveBatch = async (module: string, batch: any[]) => {
                    if (batch.length === 0) return;
                    await apiService.saveModuleRecords(module, batch);
                    savedItems += batch.length;
                    setProcessedCount(savedItems);
                };

                await saveBatch('pm_properties', propertyPayloads);
                await saveBatch('pm_units', unitPayloads);
                await saveBatch('pm_units', unitUpdates); // occupied updates
                await saveBatch('pm_tenants', tenantPayloads);
                await saveBatch('users', userPayloads);
                await saveBatch('pm_leases', leasePayloads);
                await saveBatch('pm_invoices', invoicePayloads);
                await saveBatch('pm_payments', paymentPayloads);

                // ── Record import log for bulk undo ──────────────────────────
                const importLog: { module: string; ids: string[] }[] = [];
                if (paymentPayloads.length > 0)  importLog.push({ module: 'pm_payments',   ids: paymentPayloads.map((p: any) => p.id) });
                if (invoicePayloads.length > 0)   importLog.push({ module: 'pm_invoices',   ids: invoicePayloads.map((i: any) => i.id) });
                if (leasePayloads.length > 0)     importLog.push({ module: 'pm_leases',     ids: leasePayloads.map((l: any) => l.id) });
                if (userPayloads.length > 0)      importLog.push({ module: 'users',          ids: userPayloads.map((u: any) => u.id) });
                if (tenantPayloads.length > 0)    importLog.push({ module: 'pm_tenants',    ids: tenantPayloads.map((t: any) => t.id) });
                if (unitPayloads.length > 0)      importLog.push({ module: 'pm_units',      ids: unitPayloads.map((u: any) => u.id) });
                if (propertyPayloads.length > 0)  importLog.push({ module: 'pm_properties', ids: propertyPayloads.map((p: any) => p.id) });
                setLastImportLog(importLog);
                // ─────────────────────────────────────────────────────────────

                alert(`Import completed successfully! Registered: ${tenantPayloads.length} tenants, ${propertyPayloads.length} properties, ${unitPayloads.length} units, and ${leasePayloads.length} leases.`);
                await loadData();
                setShowTenantImportModal(false);
            } catch (e: any) {
                alert("Import failed: " + e.message);
                console.error(e);
            } finally {
                setIsProcessing(false);
            }
        };

        // ── Bulk Undo Handler ────────────────────────────────────────────────
        const handleBulkUndo = async () => {
            if (!lastImportLog || lastImportLog.length === 0) return;
            setIsUndoing(true);
            setShowUndoConfirm(false);
            const totalIds = lastImportLog.reduce((sum, entry) => sum + entry.ids.length, 0);
            setUndoProgress({ done: 0, total: totalIds });
            let done = 0;
            try {
                for (const entry of lastImportLog) {
                    if (entry.ids.length === 0) continue;
                    // Delete in batches of 50 to avoid URI-too-long issues
                    const BATCH = 50;
                    for (let i = 0; i < entry.ids.length; i += BATCH) {
                        const chunk = entry.ids.slice(i, i + BATCH);
                        await apiService.deleteModuleRecord(entry.module, chunk.join(','));
                        done += chunk.length;
                        setUndoProgress({ done, total: totalIds });
                    }
                }
                alert('Bulk undo completed. All imported records have been removed.');
                setLastImportLog(null);
                await loadData();
                setShowTenantImportModal(false);
            } catch (err: any) {
                alert('Bulk undo failed: ' + err.message);
                console.error(err);
            } finally {
                setIsUndoing(false);
            }
        };
        // ────────────────────────────────────────────────────────────────────

        // Total count of records that can be undone
        const undoableCount = lastImportLog ? lastImportLog.reduce((s, e) => s + e.ids.length, 0) : 0;

        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                    {/* Modal Header */}
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-blue-50/50 dark:bg-blue-900/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-600">
                                <DownloadIcon className="w-6 h-6 rotate-180" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Import Tenants from Excel</h3>
                                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Onboard properties, units, tenants, and opening balances in one click</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Undo Last Import Button – visible only when a log exists */}
                            {lastImportLog && lastImportLog.length > 0 && !isUndoing && (
                                <button
                                    onClick={() => setShowUndoConfirm(true)}
                                    title={`Undo last import (${undoableCount} records)`}
                                    className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 dark:hover:bg-rose-800/30 transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 7v6h6"/><path d="M3 13C5.33 7.44 11.19 4 18 4a15 15 0 0 1 3 .3"/></svg>
                                    Undo Import
                                </button>
                            )}
                            <button onClick={() => setShowTenantImportModal(false)} disabled={isProcessing || isUndoing} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* ── Undo Confirm Banner ── */}
                    {showUndoConfirm && (
                        <div className="mx-8 mt-6 p-5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-3xl flex flex-col md:flex-row items-start md:items-center gap-4">
                            <div className="flex-1">
                                <p className="text-sm font-black text-rose-700 dark:text-rose-300 uppercase tracking-tight">⚠ Confirm Bulk Undo</p>
                                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                                    This will permanently delete <strong>{undoableCount}</strong> records created in the last import:
                                </p>
                                <ul className="mt-2 flex flex-wrap gap-2">
                                    {lastImportLog!.map(entry => (
                                        <li key={entry.module} className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-rose-100 dark:bg-rose-800/30 text-rose-700 dark:text-rose-300 rounded-full">
                                            {entry.ids.length} × {entry.module.replace('pm_', '').replace('_', ' ')}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => setShowUndoConfirm(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-white dark:hover:bg-slate-700 transition-all"
                                >Cancel</button>
                                <button
                                    onClick={handleBulkUndo}
                                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-500/20 active:scale-95"
                                >Yes, Undo All</button>
                            </div>
                        </div>
                    )}

                    {/* ── Undo Progress ── */}
                    {isUndoing && (
                        <div className="mx-8 mt-6 p-5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-3xl space-y-3">
                            <div className="flex justify-between text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
                                <span>Reversing Import…</span>
                                <span>{undoProgress.done} / {undoProgress.total} deleted</span>
                            </div>
                            <div className="w-full bg-rose-200 dark:bg-rose-800/30 h-3 rounded-full overflow-hidden">
                                <div
                                    className="bg-rose-600 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${undoProgress.total > 0 ? (undoProgress.done / undoProgress.total) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        {step === 'upload' ? (
                            <div className="flex flex-col items-center justify-center border-4 border-dashed border-slate-200 dark:border-slate-700 p-12 rounded-[2rem] hover:border-blue-500 transition-all bg-slate-50/50 dark:bg-slate-900/30">
                                <DownloadIcon className="w-16 h-16 text-slate-300 mb-4 rotate-180" />
                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase italic mb-1">Drag and drop your spreadsheet here</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">Supports .xlsx, .xls, .csv</p>
                                <label className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 py-4 font-black uppercase text-[10px] tracking-widest cursor-pointer shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                                    Browse File
                                    <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} />
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Column Mapping Section */}
                                <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 italic">Configure Column Mappings</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.keys(mappings).map((key) => (
                                            <div key={key} className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()} {['tenantName', 'phone', 'propertyName', 'unitNumber', 'monthlyRent'].includes(key) && '*'}
                                                </label>
                                                <select
                                                    value={mappings[key]}
                                                    onChange={(e) => setMappings(prev => ({ ...prev, [key]: e.target.value }))}
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                                >
                                                    <option value="">-- Ignore / Skip --</option>
                                                    {detectedHeaders.map((header) => (
                                                        <option key={header} value={header}>{header}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Preview Table */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">First 5 Rows Preview</h4>
                                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-2xl">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 dark:bg-slate-900/50 font-bold border-b border-slate-100 dark:border-slate-700">
                                                <tr>
                                                    <th className="p-4 uppercase">Tenant Name</th>
                                                    <th className="p-4 uppercase">Phone</th>
                                                    <th className="p-4 uppercase">Property</th>
                                                    <th className="p-4 uppercase">Unit</th>
                                                    <th className="p-4 uppercase">Rent</th>
                                                    <th className="p-4 uppercase">Opening Bal</th>
                                                    <th className="p-4 uppercase">Start Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.map((row, idx) => (
                                                    <tr key={idx} className="border-b border-slate-50 dark:border-slate-800">
                                                        <td className="p-4 font-bold text-slate-900 dark:text-white">{row.tenantName}</td>
                                                        <td className="p-4 font-mono">{row.phone}</td>
                                                        <td className="p-4 font-bold text-blue-600">{row.propertyName}</td>
                                                        <td className="p-4">{row.unitNumber}</td>
                                                        <td className="p-4 font-black">KES {parseFloat(row.monthlyRent)?.toLocaleString() || '0'}</td>
                                                        <td className={`p-4 font-black ${parseFloat(row.openingBalance) > 0 ? 'text-rose-500' : parseFloat(row.openingBalance) < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                            KES {parseFloat(row.openingBalance)?.toLocaleString() || '0'}
                                                        </td>
                                                        <td className="p-4 font-mono text-slate-500">{row.startDate}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Start Import Button / Progress */}
                                {isProcessing ? (
                                    <div className="space-y-3 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                                        <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
                                            <span>Saving and Configuring Records...</span>
                                            <span>{processedCount} / {totalCount}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-3.5 rounded-full overflow-hidden">
                                            <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${(processedCount / totalCount) * 100}%` }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleImport}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-4 font-black uppercase tracking-widest italic shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-3"
                                    >
                                        <SparklesIcon className="w-5 h-5 animate-pulse" />
                                        Begin Tenant Onboarding Import
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const Modal = ({ show, onClose, title, children, maxWidth = "max-w-lg" }: { show: boolean, onClose: () => void, title: string, children: React.ReactNode, maxWidth?: string }) => {
        if (!show) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className={`bg-white dark:bg-slate-900 w-full ${maxWidth} rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300`}>
                    <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">{title}</h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            <XIcon className="w-6 h-6 text-slate-400" />
                        </button>
                    </div>
                    <div className="p-8 max-h-[70vh] overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">Synchronizing Assets...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30">
                        <HomeIcon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            Property Management
                            <span className="text-[10px] md:text-xs bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full tracking-widest not-italic w-fit">RENTAL HUB PREMIER</span>
                        </h1>
                        <p className="text-slate-500 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.3em] mt-2 opacity-60">Architecting {currentInstitution.name}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={loadData} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-600 shadow-sm group">
                        <ArrowPathIcon className="w-6 h-6 group-active:rotate-180 transition-transform duration-500" />
                    </button>
                    <div className="flex flex-wrap gap-2 md:gap-3 flex-1 md:flex-none">
                        {activeTab === 'properties' && (
                            <>
                                {propertyActiveSubTab === 'properties' && (
                                    <button onClick={() => { setEditingPropertyTown(''); setShowPropertyModal(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                                        <PlusIcon className="w-5 h-5" /> <span className="hidden sm:inline">Add</span> Property
                                    </button>
                                )}
                                {propertyActiveSubTab === 'landlords' && (
                                    <button onClick={() => setShowLandlordModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-xl shadow-purple-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                                        <UserPlusIcon className="w-5 h-5" /> <span className="hidden sm:inline">Add</span> Landlord
                                    </button>
                                )}
                                {propertyActiveSubTab === 'units' && (
                                    <button onClick={() => setShowUnitModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                                        <PlusIcon className="w-5 h-5" /> <span className="hidden sm:inline">Register</span> Unit
                                    </button>
                                )}
                                {propertyActiveSubTab === 'tenants' && (
                                    <button onClick={() => setShowTenantModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                                        <PlusIcon className="w-5 h-5" /> <span className="hidden sm:inline">Onboard</span> Tenant
                                    </button>
                                )}
                                {propertyActiveSubTab === 'leases' && (
                                    <button onClick={() => setShowLeaseModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                                        <PlusIcon className="w-5 h-5" /> <span className="hidden sm:inline">New</span> Lease
                                    </button>
                                )}
                                {propertyActiveSubTab === 'payments' && (
                                    <button onClick={() => setShowPaymentModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                                        <CurrencyIcon className="w-5 h-5" /> <span className="hidden sm:inline">Record</span> Payment
                                    </button>
                                )}
                                {propertyActiveSubTab === 'maintenance' && (
                                    <button onClick={() => setShowTicketModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-rose-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-xl shadow-rose-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                                        <Cog8ToothIcon className="w-5 h-5" /> <span className="hidden sm:inline">New</span> Ticket
                                    </button>
                                )}
                                {propertyActiveSubTab === 'notices' && (
                                    <button onClick={() => setShowNoticeModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-xl shadow-amber-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                                        <PlusIcon className="w-5 h-5" /> <span className="hidden sm:inline">Issue</span> Notice
                                    </button>
                                )}
                                {propertyActiveSubTab === 'utilities' && (
                                    <button onClick={() => setShowUtilityModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                                        <PlusIcon className="w-5 h-5" /> <span className="hidden sm:inline">Log</span> Reading
                                    </button>
                                )}
                            </>
                        )}
                        {activeTab === 'listings' && (
                            <button
                                onClick={() => {
                                    if (!currentInstitution.marketplaceEnabled) {
                                        alert("Marketplace access is currently disabled for your institution. Please contact Super Admin.");
                                        return;
                                    }
                                    const quota = currentInstitution.listingQuota || 0;
                                    if (quota > 0 && listings.length >= quota) {
                                        alert(`You have reached your listing quota of ${quota} ads. Please upgrade your plan or remove old listings.`);
                                        return;
                                    }
                                    setShowListingModal(true);
                                }}
                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-4 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest shadow-xl shadow-orange-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <ShoppingCartIcon className="w-5 h-5" /> <span className="hidden md:inline">New</span> Ad Listing
                            </button>
                        )}
                        {activeTab === 'staff' && (
                            <button onClick={() => setIsAddingStaff(!isAddingStaff)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                                <PlusIcon className="w-5 h-5" /> {isAddingStaff ? 'Hide Form' : 'Add Staff Member'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {renderTabs()}

            {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500 mt-4">
                    {/* Period selection bar */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider italic">Collection Analysis Dashboard</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time property collections and invoicing data</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Reporting Period:</span>
                            <select
                                value={selectedReportPeriod}
                                onChange={(e) => {
                                    setSelectedReportPeriod(e.target.value);
                                    setSelectedPropertyForDrillDown(null); // Reset drill-down
                                }}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            >
                                <option value="All">All Time</option>
                                {availablePeriods.map(p => (
                                    <option key={p.key} value={p.key}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Overall Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-md relative overflow-hidden group">
                            <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                                Total Invoiced
                            </h5>
                            <p className="text-2xl font-black text-slate-950 dark:text-white italic">KES {periodSummary.totalInvoiced.toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-md relative overflow-hidden group">
                            <h5 className="text-[9px] font-black uppercase text-emerald-600 tracking-widest mb-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                                Total Collected
                            </h5>
                            <p className="text-2xl font-black text-slate-950 dark:text-white italic">KES {periodSummary.totalCollected.toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-md relative overflow-hidden group">
                            <h5 className="text-[9px] font-black uppercase text-rose-600 tracking-widest mb-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
                                Outstanding Arrears
                            </h5>
                            <p className="text-2xl font-black text-slate-950 dark:text-white italic">KES {periodSummary.totalArrears.toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-md relative overflow-hidden group">
                            <h5 className="text-[9px] font-black uppercase text-indigo-600 tracking-widest mb-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                                Collection Rate
                            </h5>
                            <div className="flex items-center gap-3">
                                <p className="text-2xl font-black text-slate-950 dark:text-white italic">{periodSummary.collectionRate}%</p>
                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-705 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            periodSummary.collectionRate >= 90 ? 'bg-emerald-500' :
                                            periodSummary.collectionRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${Math.min(periodSummary.collectionRate, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Rent Collection Trend (Monthly)</h4>
                            <div className="h-64 flex items-end gap-2 px-4 shadow-inner bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6">
                                {(() => {
                                    const maxAmount = Math.max(...realMonthlyRentTrend.map(t => t.amount), 1);
                                    return realMonthlyRentTrend.map((t, i) => {
                                        const h = (t.amount / maxAmount) * 100;
                                        return (
                                            <div key={i} className="flex-1 bg-blue-600 rounded-t-xl hover:bg-blue-400 transition-all cursor-pointer relative group" style={{ height: `${Math.max(h, 4)}%` }}>
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-md">
                                                    {t.monthLabel}: KES {t.amount?.toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                            <div className="flex justify-between mt-4 px-2">
                                {realMonthlyRentTrend.map((t, i) => (
                                    <span key={i} className="text-[8px] font-black text-slate-400 uppercase tracking-widest" style={{ transform: 'rotate(-45deg)' }}>{t.monthLabel.split(' ')[0]}</span>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Unit Status Distribution</h4>
                            {(() => {
                                const occupiedCount = units.filter(u => u.status === 'Occupied').length;
                                const vacantCount = units.filter(u => u.status === 'Vacant').length;
                                const repairCount = units.filter(u => u.status === 'Maintenance').length;
                                const totalUnitsCount = units.length || 1;

                                const occupiedPercent = Math.round((occupiedCount / totalUnitsCount) * 100);
                                const vacantPercent = Math.round((vacantCount / totalUnitsCount) * 100);
                                const repairPercent = Math.max(0, 100 - occupiedPercent - vacantPercent);

                                let accum = 0;
                                const gradientParts = [];
                                if (occupiedCount > 0) {
                                    gradientParts.push(`#2563eb 0% ${occupiedPercent}%`);
                                    accum += occupiedPercent;
                                }
                                if (vacantCount > 0) {
                                    gradientParts.push(`#10b981 ${accum}% ${accum + vacantPercent}%`);
                                    accum += vacantPercent;
                                }
                                if (repairCount > 0) {
                                    gradientParts.push(`#ef4444 ${accum}% 100%`);
                                }
                                const gradientStyle = gradientParts.length > 0 
                                    ? `conic-gradient(${gradientParts.join(', ')})`
                                    : 'conic-gradient(#cbd5e1 0% 100%)';
                                    
                                return (
                                    <div className="flex items-center justify-around h-64">
                                        <div 
                                            className="w-40 h-40 rounded-full relative flex items-center justify-center shadow-lg"
                                            style={{ background: gradientStyle }}
                                        >
                                            <div className="w-28 h-28 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center flex-col shadow-inner">
                                                <span className="font-black text-2xl text-slate-800 dark:text-white italic">{units.length}</span>
                                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Total Units</span>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded bg-blue-600 shadow-sm"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Occupied</span>
                                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{occupiedCount} ({occupiedPercent}%)</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded bg-emerald-500 shadow-sm"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Vacant</span>
                                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{vacantCount} ({vacantPercent}%)</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded bg-rose-500 shadow-sm"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Under Repair</span>
                                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{repairCount} ({repairPercent}%)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Property Collection Progress Table/Breakdown */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Collection Progress per Property</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Detailed performance tracking of billing vs cash collection</p>
                            </div>
                            <div className="relative w-full md:w-80">
                                <input
                                    type="text"
                                    placeholder="Search property..."
                                    value={propertySearchQuery}
                                    onChange={(e) => setPropertySearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-200"
                                />
                                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            </div>
                        </div>

                        {/* List/Table */}
                        <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-inner bg-slate-50/50 dark:bg-slate-900/30">
                            {(() => {
                                const filteredDashProps = propertiesCollectionData.filter(d => d.property.name.toLowerCase().includes(propertySearchQuery.toLowerCase()));
                                const totalDashPropPages = Math.max(1, Math.ceil(filteredDashProps.length / PAGE_SIZE));
                                const pagedDashProps = filteredDashProps.slice((dashPropPage - 1) * PAGE_SIZE, dashPropPage * PAGE_SIZE);
                                return (
                                    <>
                                        <table className="w-full border-collapse text-left">
                                            <thead>
                                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50">
                                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Property</th>
                                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Units</th>
                                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Invoiced</th>
                                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Collected</th>
                                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Arrears</th>
                                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Progress</th>
                                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                                                {pagedDashProps.map((d) => (
                                                    <React.Fragment key={d.property.id}>
                                                        <tr className={`hover:bg-slate-100/30 dark:hover:bg-slate-800/20 transition-all ${selectedPropertyForDrillDown === d.property.id ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}>
                                                            <td className="p-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-slate-750 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100/50 dark:border-slate-750">
                                                                        <HomeIcon className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">{d.property.name}</p>
                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{d.property.town || 'No Address'}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-5 text-center text-xs font-bold text-slate-600 dark:text-slate-300">{d.unitsCount}</td>
                                                            <td className="p-5 text-right text-xs font-black text-slate-900 dark:text-white italic">KES {d.totalInvoiced.toLocaleString()}</td>
                                                            <td className="p-5 text-right text-xs font-black text-emerald-600 italic">KES {d.totalCollected.toLocaleString()}</td>
                                                            <td className="p-5 text-right text-xs font-black text-rose-500 italic">KES {d.arrears.toLocaleString()}</td>
                                                            <td className="p-5 w-48">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                                                        <div 
                                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                                d.collectionRate >= 90 ? 'bg-emerald-500' :
                                                                                d.collectionRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                                                            }`}
                                                                            style={{ width: `${Math.min(d.collectionRate, 100)}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className={`text-[10px] font-black ${
                                                                        d.collectionRate >= 90 ? 'text-emerald-500' :
                                                                        d.collectionRate >= 60 ? 'text-amber-500' : 'text-rose-500'
                                                                    }`}>{d.collectionRate}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-5 text-center">
                                                                <button
                                                                    onClick={() => setSelectedPropertyForDrillDown(selectedPropertyForDrillDown === d.property.id ? null : d.property.id)}
                                                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider mx-auto transition-all ${
                                                                        selectedPropertyForDrillDown === d.property.id
                                                                            ? 'bg-blue-600 text-white shadow-md'
                                                                            : 'bg-white dark:bg-slate-755 border border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                                                                    }`}
                                                                >
                                                                    <EyeIcon className="w-3.5 h-3.5" />
                                                                    {selectedPropertyForDrillDown === d.property.id ? 'Close' : 'View Units'}
                                                                </button>
                                                            </td>
                                                        </tr>

                                                        {/* Expanded Units Drilldown */}
                                                        {selectedPropertyForDrillDown === d.property.id && (
                                                            <tr>
                                                                <td colSpan={7} className="p-6 bg-slate-100/40 dark:bg-slate-900/40 border-y border-slate-200/50 dark:border-slate-700/50">
                                                                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600 italic">Unit-level Collection Drill-down</h5>
                                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                            {d.propUnits.map(unit => {
                                                                                const lease = d.propLeases.find(l => l.unitId === unit.id);
                                                                                const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : null;
                                                                                
                                                                                const unitInvoices = d.propInvoices.filter(inv => inv.unitId === unit.id);
                                                                                const unitPayments = d.propPayments.filter(p => p.leaseId === lease?.id);

                                                                                const invSum = unitInvoices.reduce((s, inv) => s + inv.amount, 0);
                                                                                const paySum = unitPayments.reduce((s, p) => s + p.amount, 0);
                                                                                const unitArrears = Math.max(0, invSum - paySum);
                                                                                const unitRate = invSum > 0 ? Math.round((paySum / invSum) * 100) : (paySum > 0 ? 100 : 0);

                                                                                return (
                                                                                    <div key={unit.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm space-y-3">
                                                                                        <div className="flex justify-between items-start">
                                                                                            <div>
                                                                                                <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Unit {unit.unitNumber}</p>
                                                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{unit.unitType}</p>
                                                                                            </div>
                                                                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                                                                unit.status === 'Occupied' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100 dark:border-emerald-950/30' :
                                                                                                unit.status === 'Vacant' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-100 dark:border-amber-950/30' :
                                                                                                'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-100 dark:border-rose-950/30'
                                                                                            }`}>
                                                                                                {unit.status}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="border-t border-slate-100 dark:border-slate-700/50 pt-2 space-y-1.5">
                                                                                            <div className="flex justify-between text-[10px]">
                                                                                                <span className="font-bold text-slate-400 uppercase">Tenant:</span>
                                                                                                <span className="font-black text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{tenant ? tenant.name : <em className="text-slate-400">None</em>}</span>
                                                                                            </div>
                                                                                            <div className="flex justify-between text-[10px]">
                                                                                                <span className="font-bold text-slate-400 uppercase">Invoiced:</span>
                                                                                                <span className="font-black text-slate-800 dark:text-slate-200">KES {invSum.toLocaleString()}</span>
                                                                                            </div>
                                                                                            <div className="flex justify-between text-[10px]">
                                                                                                <span className="font-bold text-slate-400 uppercase">Collected:</span>
                                                                                                <span className="font-black text-emerald-600">KES {paySum.toLocaleString()}</span>
                                                                                            </div>
                                                                                            <div className="flex justify-between text-[10px]">
                                                                                                <span className="font-bold text-slate-400 uppercase">Balance:</span>
                                                                                                <span className="font-black text-rose-500">KES {unitArrears.toLocaleString()}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                        {invSum > 0 && (
                                                                                            <div className="space-y-1">
                                                                                                <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase">
                                                                                                    <span>Collection Progress:</span>
                                                                                                    <span className={unitRate >= 90 ? 'text-emerald-500' : unitRate >= 60 ? 'text-amber-500' : 'text-rose-500'}>{unitRate}%</span>
                                                                                                </div>
                                                                                                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                                                                                    <div 
                                                                                                        className={`h-full rounded-full transition-all duration-300 ${
                                                                                                            unitRate >= 90 ? 'bg-emerald-500' :
                                                                                                            unitRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                                                                                        }`}
                                                                                                        style={{ width: `${Math.min(unitRate, 100)}%` }}
                                                                                                    ></div>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                        {d.propUnits.length === 0 && (
                                                                            <p className="text-center text-xs text-slate-400 py-6 font-bold uppercase tracking-wider">No units found in this property</p>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                                {filteredDashProps.length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="p-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest italic">No properties matching your search</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>

                                        {/* Pagination Footer */}
                                        {totalDashPropPages > 1 && (
                                            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    Showing {((dashPropPage - 1) * PAGE_SIZE) + 1}–{Math.min(dashPropPage * PAGE_SIZE, filteredDashProps.length)} of {filteredDashProps.length} properties
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setDashPropPage(p => Math.max(1, p - 1))} disabled={dashPropPage === 1} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
                                                    {Array.from({ length: totalDashPropPages }, (_, i) => i + 1).map(pg => (
                                                        <button key={pg} onClick={() => setDashPropPage(pg)} className={`w-8 h-8 rounded-xl text-[10px] font-black transition-colors ${pg === dashPropPage ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{pg}</button>
                                                    ))}
                                                    <button onClick={() => setDashPropPage(p => Math.min(totalDashPropPages, p + 1))} disabled={dashPropPage === totalDashPropPages} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'properties' && PropertiesTab()}
            {activeTab === 'payouts' && PayoutsTab()}
            {activeTab === 'expenses' && ExpensesTab()}
            {activeTab === 'listings' && ListingsTab()}
            {activeTab === 'inquiries' && InquiriesTab()}
            {activeTab === 'comms' && (
                <CommunicationsManager 
                    users={commsUsers}
                    departments={[]}
                    courses={[]}
                    onSendSms={apiService.sendSms}
                    currentUser={currentUser}
                    smsBalance={currentInstitution.smsBalance}
                    currentInstitution={currentInstitution}
                    mpesaConfig={currentInstitution.mpesaConfig || companyDetails.mpesaConfig}
                    smsConfig={currentInstitution.smsConfig || companyDetails.smsConfig}
                    onRefreshData={loadData}
                    moduleContext="property"
                    transactions={transactions}
                />
            )}
            {activeTab === 'reports' && ReportsTab()}
            {activeTab === 'staff' && (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                    <UserManager 
                        currentInstitution={currentInstitution} 
                        currentUser={currentUser as User} 
                        users={users} 
                        showOnly="staff"
                        onAddUser={onAddUser}
                        onEditUser={onEditUser}
                        onDeleteUser={onDeleteUser}
                        onImportUsers={onImportUsers}
                        onImportStudents={async () => {}}
                        onLogAction={onLogAction}
                        smsConfig={effectiveSmsConfig || smsConfig}
                        departments={departments}
                        subjects={subjects}
                        courses={courses}
                        allocations={[]}
                        onWithdrawRequest={async (reqId) => { console.log(reqId); }}
                        letterheadConfig={letterheadConfig}
                        logoUrl={logoUrl}
                        footerImageUrl={footerImageUrl}
                        isAdding={isAddingStaff}
                        isPm={true}
                        onSendBulkCredentials={handlePmSendBulkCredentials}
                    />
                </div>
            )}
            {activeTab === 'config' && (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                    <PMConfigManager 
                        institutionId={institutionId} 
                        onDataChange={loadData}
                    />
                </div>
            )}

            <Modal show={showListingModal} onClose={() => setShowListingModal(false)} title="Create Marketplace Ad" maxWidth="max-w-2xl">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveListing({
                        title: formData.get('title') as string,
                        description: formData.get('description') as string,
                        price: parseFloat(formData.get('price') as string) || 0,
                        listingType: formData.get('listingType') as any,
                        propertyType: formData.get('propertyType') as any,
                        location: formData.get('location') as string,
                        features: (formData.get('features') as string).split(',').map(f => f.trim()),
                        images: [] // To be handled by image upload logic if needed
                    });
                }} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Listing Title</label>
                        <input name="title" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-orange-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="e.g. Luxury 3 Bedroom Apartment in Kilimani" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Listing Type</label>
                            <select name="listingType" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-orange-500 rounded-2xl p-4 font-bold outline-none transition-all">
                                <option value="Rent">For Rent</option>
                                <option value="Sale">For Sale</option>
                                <option value="Lease">For Lease</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Property Type</label>
                            <select name="propertyType" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-orange-500 rounded-2xl p-4 font-bold outline-none transition-all">
                                <option value="Apartment">Apartment</option>
                                <option value="House">House</option>
                                <option value="Commercial">Commercial</option>
                                <option value="Land">Land</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Asking Price (KES)</label>
                            <input name="price" type="number" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-orange-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="50000" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">General Location</label>
                            <input name="location" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-orange-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="e.g. Kilimani, Nairobi" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Description</label>
                        <textarea name="description" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-orange-500 rounded-2xl p-4 font-bold outline-none transition-all h-32" placeholder="Describe the property, amenities, nearby facilities..." />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Key Features (Comma separated)</label>
                        <input name="features" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-orange-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="e.g. WiFi, Parking, Backup Generator" />
                    </div>

                    <p className="text-[10px] text-slate-400 font-bold italic text-center">Note: Your contact details from your profile will be used for inquiries.</p>

                    <button type="submit" className="w-full bg-orange-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 mt-4 transition-all hover:bg-orange-700 active:scale-95 leading-none">
                        Publish Ad to Marketplace
                    </button>
                </form>
            </Modal>

            <Modal
                show={showPropertyModal}
                onClose={() => {
                    setShowPropertyModal(false);
                    setEditingProperty(null);
                    setEditingPropertyTown('');
                }}
                title={editingProperty ? "Edit Property" : "Register New Property"}
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveProperty({
                        name: formData.get('name') as string,
                        address: formData.get('address') as string,
                        town: editingPropertyTown,
                        propertyType: formData.get('propertyType') as PMPropertyType,
                        landlordId: formData.get('landlordId') as string,
                        commissionRate: parseFloat(formData.get('commissionRate') as string) || 0,
                    });
                }} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Property Name</label>
                        <input name="name" defaultValue={editingProperty?.name} required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="e.g. Blue Lagoon Apartments" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Physical Address</label>
                        <input name="address" defaultValue={editingProperty?.address} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="Street, Block No." />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Town / City</label>
                        <input 
                            name="town" 
                            list="towns-list"
                            value={editingPropertyTown}
                            onChange={(e) => setEditingPropertyTown(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" 
                            placeholder="e.g. Nairobi, Mombasa, Kisumu" 
                        />
                        <datalist id="towns-list">
                            {existingTowns.map(town => (
                                <option key={town} value={town} />
                            ))}
                        </datalist>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Type</label>
                        <select name="propertyType" defaultValue={editingProperty?.propertyType || 'Apartment'} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all">
                            <option value="Apartment">Apartment</option>
                            <option value="Commercial">Commercial</option>
                            <option value="Mixed-use">Mixed-use</option>
                            <option value="Warehouse">Warehouse</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Landlord (Optional)</label>
                            <select name="landlordId" defaultValue={editingProperty?.landlordId || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all">
                                <option value="">Select Landlord</option>
                                {landlords.map(ll => <option key={ll.id} value={ll.id}>{ll.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Commission Rate (%)</label>
                            <input name="commissionRate" type="number" step="0.1" defaultValue={editingProperty?.commissionRate || 0} min="0" max="100" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 mt-4">
                        {editingProperty ? "Save Changes" : "Save Asset"}
                    </button>
                </form>
            </Modal>

            <Modal
                show={showLandlordModal}
                onClose={() => { setShowLandlordModal(false); setEditingLandlord(null); }}
                title={editingLandlord ? 'Edit Landlord Profile' : 'Onboard Landlord'}
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveLandlord({
                        name: formData.get('name') as string,
                        phoneNumber: formData.get('phoneNumber') as string,
                        email: formData.get('email') as string,
                        idNumber: formData.get('idNumber') as string,
                        taxPin: formData.get('taxPin') as string,
                        bankDetails: formData.get('bankDetails') as string,
                        preferredPaymentMethod: formData.get('preferredPaymentMethod') as string,
                    });
                }} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Full Name / Company Name</label>
                        <input key={editingLandlord?.id + '-name'} name="name" required defaultValue={editingLandlord?.name || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="e.g. John Doe / XYZ Holdings" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Phone Number</label>
                            <input key={editingLandlord?.id + '-phone'} name="phoneNumber" required defaultValue={editingLandlord?.phoneNumber || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="+254..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Address</label>
                            <input key={editingLandlord?.id + '-email'} name="email" type="email" defaultValue={editingLandlord?.email || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="john@example.com" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">ID Number</label>
                            <input key={editingLandlord?.id + '-id'} name="idNumber" defaultValue={editingLandlord?.idNumber || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-bold outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tax PIN</label>
                            <input key={editingLandlord?.id + '-tax'} name="taxPin" defaultValue={editingLandlord?.taxPin || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="e.g. A00..." />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Preferred Payment Method</label>
                        <select key={editingLandlord?.id + '-method'} name="preferredPaymentMethod" defaultValue={editingLandlord?.preferredPaymentMethod || 'Bank'} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-bold outline-none transition-all">
                            <option value="Bank">Bank Transfer</option>
                            <option value="M-Pesa">M-Pesa</option>
                            <option value="Cash">Cash</option>
                            <option value="Other">Other / Multiple</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Bank / Payment Details</label>
                        <textarea key={editingLandlord?.id + '-bank'} name="bankDetails" defaultValue={editingLandlord?.bankDetails || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-bold outline-none transition-all h-24" placeholder="Bank name & details, or M-Pesa Till/Paybill details..." />
                    </div>
                    <button type="submit" className="w-full bg-purple-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-500/20 mt-4">
                        {editingLandlord ? 'Update Landlord Profile' : 'Save Landlord Profile'}
                    </button>
                </form>
            </Modal>

            <Modal
                show={showUnitModal}
                onClose={() => {
                    setShowUnitModal(false);
                    setEditingUnit(null);
                }}
                title={editingUnit ? "Edit Unit" : "Register New Unit"}
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveUnit({
                        propertyId: formData.get('propertyId') as string,
                        unitNumber: formData.get('unitNumber') as string,
                        unitType: formData.get('unitType') as string,
                        floorNumber: formData.get('floorNumber') ? parseInt(formData.get('floorNumber') as string) : undefined,
                        rentAmount: parseFloat(formData.get('rentAmount') as string) || 0
                    });
                }} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Target Property</label>
                        <select name="propertyId" defaultValue={editingUnit?.propertyId || ''} required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all">
                            <option value="">Select Property</option>
                            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Unit Number</label>
                            <input name="unitNumber" defaultValue={editingUnit?.unitNumber} required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="e.g. A1, Suite 202" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Unit Type</label>
                            <select name="unitType" defaultValue={editingUnit?.unitType || '1 Bedroom'} required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all">
                                <option value="Bedsitter">Bedsitter</option>
                                <option value="Studio">Studio</option>
                                <option value="1 Bedroom">1 Bedroom</option>
                                <option value="2 Bedroom">2 Bedroom</option>
                                <option value="3 Bedroom">3 Bedroom</option>
                                <option value="Office Space">Office Space</option>
                                <option value="Shop">Shop</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Floor Number</label>
                            <input name="floorNumber" type="number" defaultValue={editingUnit?.floorNumber} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="e.g. 1, 2, 3" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Monthly Rent (KES)</label>
                            <input name="rentAmount" type="number" defaultValue={editingUnit?.rentAmount || 0} required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="0.00" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 mt-4">
                        {editingUnit ? "Save Changes" : "Deploy Unit"}
                    </button>
                </form>
            </Modal>

            <Modal show={showTenantModal} onClose={() => setShowTenantModal(false)} title={editingTenant ? "Edit Tenant Profile" : "Tenant Onboarding"}>
                <form key={editingTenant?.id || 'new'} onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveTenant({
                        name: formData.get('name') as string,
                        email: (formData.get('email') as string) || undefined,
                        phoneNumber: formData.get('phoneNumber') as string,
                        idNumber: formData.get('idNumber') as string
                    });
                }} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tenant Name</label>
                        <input name="name" required defaultValue={editingTenant?.name || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Full Name" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Address</label>
                        <input name="email" type="email" defaultValue={editingTenant?.email || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Email (optional, creates portal login)" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Phone Number</label>
                        <input name="phoneNumber" required defaultValue={editingTenant?.phoneNumber || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Phone Number" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">ID / Passport Number</label>
                        <input name="idNumber" defaultValue={editingTenant?.idNumber || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="ID / Passport Number" />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4">
                        {editingTenant ? "Save Changes" : "Complete Onboarding"}
                    </button>
                </form>
            </Modal>

            <Modal show={showWhtReviewModal} onClose={() => { setShowWhtReviewModal(false); setSelectedInvoiceForWhtReview(null); }} title="Verify Withholding Tax Certificate">
                {selectedInvoiceForWhtReview && (() => {
                    const inv = selectedInvoiceForWhtReview;
                    const tenant = tenants.find(t => t.id === inv.tenantId);
                    const lease = leases.find(l => l.id === inv.leaseId);
                    const unit = lease ? units.find(u => u.id === lease.unitId) : null;
                    return (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Tenant Name</p>
                                    <p className="text-xs font-black text-slate-800 dark:text-white mt-1">{tenant?.name || 'N/A'}</p>
                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">PIN: {tenant?.taxPin || 'Not Provided'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Unit & Invoice</p>
                                    <p className="text-xs font-black text-blue-600 mt-1">Unit {unit?.unitNumber || 'N/A'}</p>
                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{inv.invoiceNumber}</p>
                                </div>
                                <div className="mt-2">
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Invoice Amount</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white italic mt-0.5">KES {inv.amount.toLocaleString()}</p>
                                </div>
                                <div className="mt-2">
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Withholding Tax (10%)</p>
                                    <p className="text-sm font-black text-amber-600 dark:text-amber-400 italic mt-0.5">KES {inv.withholdingTaxAmount?.toLocaleString() || Math.round(inv.amount * 0.1).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="border border-slate-100 dark:border-slate-750 p-5 rounded-2xl space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600">Submitted Certificate Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Certificate Number</p>
                                        <p className="text-xs font-black text-slate-850 dark:text-slate-100 mt-0.5">{inv.withholdingCertificateNumber || 'Not Specified'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Certificate Date</p>
                                        <p className="text-xs font-black text-slate-850 dark:text-slate-100 mt-0.5">{inv.withholdingCertificateDate || 'Not Specified'}</p>
                                    </div>
                                </div>
                                {inv.withholdingCertificateUrl ? (
                                    <div className="mt-2">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Attached Document</p>
                                        <div className="flex flex-col gap-2">
                                            <a 
                                                href={inv.withholdingCertificateUrl} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all text-center"
                                            >
                                                Open Certificate Document
                                            </a>
                                            {inv.withholdingCertificateUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) && (
                                                <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-40">
                                                    <img loading="lazy" src={inv.withholdingCertificateUrl} alt="WHT Cert" className="w-full h-auto object-contain mx-auto" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-rose-500 font-bold italic">No document file attached.</p>
                                )}
                            </div>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const reason = formData.get('rejectionReason') as string;
                                // We can use the button's action through passing state or similar, or just read which button was clicked.
                                // But since we have the functions handleApproveWht and handleRejectWht, let's call them directly from onClick!
                            }} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Rejection Reason (only required if rejecting)</label>
                                    <input id="whtRejectionReasonInput" name="rejectionReason" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 rounded-2xl p-4 font-bold outline-none text-xs" placeholder="e.g. Invalid PIN, certificate number does not match KRA records" />
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const val = (document.getElementById('whtRejectionReasonInput') as HTMLInputElement)?.value || '';
                                            handleRejectWht(inv, val);
                                        }}
                                        className="flex-1 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-600 dark:hover:bg-rose-600 text-rose-600 hover:text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                                    >
                                        Reject Certificate
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => handleApproveWht(inv)}
                                        className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                                    >
                                        Approve & Offset Rent
                                    </button>
                                </div>
                            </form>
                        </div>
                    );
                })()}
            </Modal>

            <Modal show={showLeaseModal} onClose={() => { setShowLeaseModal(false); setLandlordSignatureFile(null); setTenantSignatureFile(null); }} title="Create Lease Agreement">
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);

                    const landlordSigUrl = landlordSignatureFile
                        ? await apiService.uploadFile('eduai', `leases/signatures/landlord_${Date.now()}`, landlordSignatureFile)
                        : undefined;
                    const tenantSigUrl = tenantSignatureFile
                        ? await apiService.uploadFile('eduai', `leases/signatures/tenant_${Date.now()}`, tenantSignatureFile)
                        : undefined;

                    handleSaveLease({
                        unitId: formData.get('unitId') as string,
                        tenantId: formData.get('tenantId') as string,
                        rentAmount: parseFloat(formData.get('rentAmount') as string) || 0,
                        depositAmount: parseFloat(formData.get('depositAmount') as string) || 0,
                        witnessName: formData.get('witnessName') as string,
                        witnessPhone: formData.get('witnessPhone') as string,
                        noticePeriodDays: parseInt(formData.get('noticePeriodDays') as string) || 30,
                        lateFeePercentage: parseFloat(formData.get('lateFeePercentage') as string) || 5,
                        termsAndConditions: formData.get('termsAndConditions') as string,
                        landlordSignatureUrl: landlordSigUrl || undefined,
                        tenantSignatureUrl: tenantSigUrl || undefined,
                    });

                    setLandlordSignatureFile(null);
                    setTenantSignatureFile(null);
                }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Unit</label>
                            <select name="unitId" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none">
                                <option value="">Choose Unit...</option>
                                {units.filter(u => u.status === 'Vacant' || u.status === 'Maintenance').map(u => (
                                    <option key={u.id} value={u.id}>{u.unitNumber} ({u.unitType}) - KES {u.rentAmount}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Tenant</label>
                            <select name="tenantId" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none">
                                <option value="">Choose Tenant...</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.idNumber || 'No ID'})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Monthly Rent (KES)</label>
                            <input name="rentAmount" type="number" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="0.00" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Deposit Required (KES)</label>
                            <input name="depositAmount" type="number" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="0.00" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Late Fee Penalty (%)</label>
                            <input name="lateFeePercentage" type="number" defaultValue="5" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Notice Period (Days)</label>
                            <input name="noticePeriodDays" type="number" defaultValue="30" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Witness Name</label>
                            <input name="witnessName" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Enter witness name" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Witness Phone</label>
                            <input name="witnessPhone" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Enter witness phone" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Landlord Signature Image</label>
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={e => setLandlordSignatureFile(e.target.files?.[0] || null)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-xs" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tenant Signature Image</label>
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={e => setTenantSignatureFile(e.target.files?.[0] || null)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-xs" 
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Special Terms & Conditions</label>
                        <textarea name="termsAndConditions" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none h-24" placeholder="Enter any specific terms, rules or inclusions..." />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 mt-4">Generate Agreement & Activate Lease</button>
                </form>
            </Modal>

            {/* Lease Preview Modal (Print Ready) */}
            {selectedLeaseForPreview && (
                <Modal
                    show={true}
                    onClose={() => setSelectedLeaseForPreview(null)}
                    title="Lease Agreement Preview"
                    maxWidth="max-w-4xl"
                >
                    <div className="print:p-0 p-4">
                        <div className="flex justify-end mb-6 print:hidden">
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all"
                            >
                                <ArrowPathIcon className="w-4 h-4" /> Download PDF / Print
                            </button>
                        </div>

                        <div id="lease-document" className="bg-white text-slate-900 p-12 border border-slate-200 shadow-sm font-serif leading-relaxed text-sm overflow-y-auto max-h-[70vh] print:max-h-none print:border-none print:shadow-none">
                            {/* Document Header */}
                            <div className="text-center border-b-2 border-slate-900 pb-8 mb-8">
                                <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">RESIDENTIAL LEASE AGREEMENT</h1>
                                <p className="text-xs uppercase font-bold tracking-[0.3em] text-slate-500 italic">Official Property Management Binding Document</p>
                            </div>

                            {/* Section 1: Parties */}
                            <div className="space-y-6">
                                <section>
                                    <h2 className="font-black uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 text-xs italic">1. PARTIES TO THE AGREEMENT</h2>
                                    <p>This agreement is entered into this <strong>{new Date(selectedLeaseForPreview.startDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>, by and between:</p>
                                    <div className="grid grid-cols-2 gap-12 mt-4 bg-slate-50 p-6 rounded-2xl font-sans">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-slate-400 mb-2">Landlord (Lessor)</p>
                                            <p className="font-black uppercase italic">{properties.find(p => p.id === units.find(u => u.id === selectedLeaseForPreview.unitId)?.propertyId)?.landlordId ? landlords.find(l => l.id === properties.find(p => p.id === units.find(u => u.id === selectedLeaseForPreview.unitId)?.propertyId)?.landlordId)?.name : currentInstitution.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-slate-400 mb-2">Tenant (Lessee)</p>
                                            <p className="font-black uppercase italic">{tenants.find(t => t.id === selectedLeaseForPreview.tenantId)?.name}</p>
                                        </div>
                                    </div>
                                </section>

                                {/* Section 2: Property */}
                                <section>
                                    <h2 className="font-black uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 text-xs italic">2. DESCRIPTION OF THE PREMISES</h2>
                                    <p>The Landlord hereby leases to the Tenant, and the Tenant hereby takes from the Landlord, the residential premises described as:</p>
                                    <div className="mt-4 bg-slate-50 p-6 rounded-2xl font-sans">
                                        <p className="font-black uppercase italic">
                                            UNIT {units.find(u => u.id === selectedLeaseForPreview.unitId)?.unitNumber}
                                            {" "} — {properties.find(p => p.id === units.find(u => u.id === selectedLeaseForPreview.unitId)?.propertyId)?.name}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1 uppercase font-bold">{properties.find(p => p.id === units.find(u => u.id === selectedLeaseForPreview.unitId)?.propertyId)?.address}</p>
                                    </div>
                                </section>

                                {/* Section 3: Financials */}
                                <section>
                                    <h2 className="font-black uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 text-xs italic">3. FINANCIAL OBLIGATIONS</h2>
                                    <div className="space-y-4">
                                        <p><strong>A. RENT:</strong> The Tenant shall pay the Landlord a monthly rent of <strong>KES {selectedLeaseForPreview.rentAmount?.toLocaleString()}</strong> payable on or before the 1st of every month.</p>
                                        <p><strong>B. DEPOSIT:</strong> A security deposit of <strong>KES {selectedLeaseForPreview.depositAmount?.toLocaleString()}</strong> has been paid and shall be held by the Landlord until the expiration of the lease.</p>
                                        <p><strong>C. LATE FEES:</strong> Payments made after the 5th day of the month shall incur a late fee penalty of <strong>{selectedLeaseForPreview.lateFeePercentage || 5}%</strong> of the outstanding balance.</p>
                                    </div>
                                </section>

                                {/* Section 4: Terms */}
                                <section>
                                    <h2 className="font-black uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 text-xs italic">4. ADDITIONAL TERMS & CONDITIONS</h2>
                                    <div className="space-y-4">
                                        <p><strong>NOTICE PERIOD:</strong> This agreement may be terminated by either party giving <strong>{selectedLeaseForPreview.noticePeriodDays || 30} days</strong> written notice.</p>
                                        {selectedLeaseForPreview.termsAndConditions ? (
                                            <p className="whitespace-pre-wrap italic text-slate-700 bg-slate-50 p-6 rounded-2xl border-l-4 border-slate-300">"{selectedLeaseForPreview.termsAndConditions}"</p>
                                        ) : (
                                            <p className="text-slate-400 italic">No special terms specified.</p>
                                        )}
                                    </div>
                                </section>

                                {/* Section 5: Witness */}
                                {selectedLeaseForPreview.witnessName && (
                                    <section>
                                        <h2 className="font-black uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 text-xs italic">5. ATTESTATION</h2>
                                        <p>This lease has been witnessed by <strong>{selectedLeaseForPreview.witnessName}</strong> ({selectedLeaseForPreview.witnessPhone}).</p>
                                    </section>
                                )}

                                {/* Signatures */}
                                <div className="mt-16 grid grid-cols-2 gap-24 pt-12">
                                    <div className="border-t border-slate-900 text-center">
                                        <p className="mt-4 text-[10px] uppercase font-black tracking-widest">LANDLORD SIGNATURE</p>
                                        {selectedLeaseForPreview.landlordSignatureUrl ? (
                                            <img src={selectedLeaseForPreview.landlordSignatureUrl} alt="Landlord Signature" className="h-16 mx-auto object-contain mt-4" />
                                        ) : (
                                            <div className="mt-8 flex justify-center opacity-20"><BuildingOfficeIcon className="w-16 h-16" /></div>
                                        )}
                                    </div>
                                    <div className="border-t border-slate-900 text-center">
                                        <p className="mt-4 text-[10px] uppercase font-black tracking-widest">TENANT SIGNATURE</p>
                                        {selectedLeaseForPreview.tenantSignatureUrl ? (
                                            <img src={selectedLeaseForPreview.tenantSignatureUrl} alt="Tenant Signature" className="h-16 mx-auto object-contain mt-4" />
                                        ) : (
                                            <div className="mt-8 flex justify-center opacity-20"><UserIcon className="w-16 h-16" /></div>
                                        )}
                                    </div>
                                </div>

                                <div className="text-center pt-24 text-[9px] uppercase font-bold text-slate-300 tracking-[0.5em] italic">
                                    Generated via {currentInstitution.name} ERP — {new Date().getFullYear()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Print CSS */}
                    <style>{`
                        @media print {
                            body * { visibility: hidden; }
                            #lease-document, #lease-document * { visibility: visible; }
                            #lease-document {
                                position: fixed;
                                left: 0;
                                top: 0;
                                width: 100%;
                                height: 100%;
                                margin: 0;
                                padding: 2cm;
                                border: none;
                                font-size: 11pt;
                            }
                        }
                    `}</style>
                </Modal>
            )}

            {showPaymentModal && (
                <RecordPaymentModal
                    show={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    leases={leases}
                    tenants={tenants}
                    units={units}
                    properties={properties}
                    onSave={handleSavePayment}
                    pmSettings={pmSettings}
                    getNextRentDueDate={getNextRentDueDate}
                    invoices={invoices}
                />
            )}

            {selectedVacateNotice && (() => {
                const lease = leases.find(l => l.id === selectedVacateNotice.leaseId);
                const tenant = tenants.find(t => t.id === (lease?.tenantId || selectedVacateNotice.tenantId));
                const unit = units.find(u => u.id === lease?.unitId);
                const property = unit ? properties.find(p => p.id === unit.propertyId) : null;
                
                let details = { poBox: 'Eldoret', waterAccount: '', electricityAccount: '', bankDetails: { bankName: '', accountName: '', accountNumber: '', branch: '' } };
                try {
                    details = JSON.parse(selectedVacateNotice.messageBody);
                } catch (e) {
                    // Fallback
                }
                
                return (
                    <Modal show={!!selectedVacateNotice} onClose={() => setSelectedVacateNotice(null)} title="Vacation Notice Details">
                        <div className="space-y-6">
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] grid grid-cols-2 gap-4 text-xs font-bold">
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 tracking-wider">Tenant Name</p>
                                    <p className="text-slate-800 dark:text-white mt-0.5">{tenant?.name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 tracking-wider">Mobile Number</p>
                                    <p className="text-slate-800 dark:text-white mt-0.5">{tenant?.phoneNumber || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 tracking-wider">Estate / Property</p>
                                    <p className="text-slate-800 dark:text-white mt-0.5">{property?.name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 tracking-wider">House / Unit Number</p>
                                    <p className="text-slate-800 dark:text-white mt-0.5">{unit?.unitNumber || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 tracking-wider">P.O. Box</p>
                                    <p className="text-slate-800 dark:text-white mt-0.5">{details.poBox || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 tracking-wider">Intended Vacate Date</p>
                                    <p className="text-rose-500 mt-0.5">{new Date(selectedVacateNotice.effectiveDate).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem]">
                                    <p className="text-[10px] uppercase text-slate-400 tracking-wider mb-2">Utility Accounts</p>
                                    <p className="text-slate-800 dark:text-white">Water Account: <span className="font-black">{details.waterAccount || '—'}</span></p>
                                    <p className="text-slate-800 dark:text-white mt-1">Electricity Account: <span className="font-black">{details.electricityAccount || '—'}</span></p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem]">
                                    <p className="text-[10px] uppercase text-slate-400 tracking-wider mb-2">Refund Bank Account</p>
                                    {details.bankDetails?.bankName ? (
                                        <>
                                            <p className="text-slate-800 dark:text-white">Bank: <span className="font-black">{details.bankDetails.bankName}</span></p>
                                            <p className="text-slate-800 dark:text-white mt-0.5">Name: <span className="font-black">{details.bankDetails.accountName}</span></p>
                                            <p className="text-slate-800 dark:text-white mt-0.5">Acc No: <span className="font-black">{details.bankDetails.accountNumber}</span></p>
                                            <p className="text-slate-800 dark:text-white mt-0.5">Branch: <span className="font-black">{details.bankDetails.branch || '—'}</span></p>
                                        </>
                                    ) : (
                                        <p className="text-slate-400 italic">None provided</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={async () => {
                                        if (lease) {
                                            const saved = inspections.find(insp => insp.leaseId === lease.id);
                                            if (saved) {
                                                setEditingInspection(saved);
                                            } else {
                                                setEditingInspection({
                                                    id: `insp_${Date.now()}`,
                                                    leaseId: lease.id,
                                                    tenantId: lease.tenantId,
                                                    inspectionDate: new Date().toISOString().split('T')[0],
                                                    status: 'Draft',
                                                    structuralCondition: 'Good',
                                                    structuralComments: '',
                                                    cleaningCondition: 'Good',
                                                    cleaningComments: '',
                                                    fittingsCondition: 'Good',
                                                    fittingsComments: '',
                                                    repairsRequired: JSON.stringify({
                                                        waterMeterNo: '',
                                                        waterBill: 0,
                                                        waterRemarks: '',
                                                        electricityMeterNo: '',
                                                        electricityBill: 0,
                                                        electricityRemarks: '',
                                                        ciuNo: '',
                                                        items: [],
                                                        checkedBy: '',
                                                        tenantIdNo: '',
                                                        tenantTel: ''
                                                    }),
                                                    estimatedRepairCost: 0,
                                                    tenantSignoff: false,
                                                    institutionId: selectedVacateNotice.institutionId,
                                                    createdAt: new Date().toISOString()
                                                });
                                            }
                                            setShowInspectionModal(true);
                                            setSelectedVacateNotice(null);
                                        } else {
                                            alert("Lease record not found.");
                                        }
                                    }}
                                    className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors"
                                >
                                    Conduct Move-Out Inspection
                                </button>
                                {selectedVacateNotice.status === 'Issued' && (
                                    <button
                                        onClick={async () => {
                                            try {
                                                const updated = { ...selectedVacateNotice, status: 'Acknowledged' as any };
                                                await apiService.saveModuleRecord('pm_notices', updated);
                                                alert("Notice status updated to Acknowledged");
                                                loadData();
                                                setSelectedVacateNotice(null);
                                            } catch (e: any) {
                                                alert("Failed to update status: " + e.message);
                                            }
                                        }}
                                        className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-colors"
                                    >
                                        Acknowledge Notice
                                    </button>
                                )}
                            </div>
                        </div>
                    </Modal>
                );
            })()}

            {showNoticeModal && (
                <IssueNoticeModal
                    show={showNoticeModal}
                    onClose={() => setShowNoticeModal(false)}
                    leases={leases}
                    tenants={tenants}
                    units={units}
                    properties={properties}
                    onSave={handleSaveNotice}
                />
            )}

            {showUtilityModal && (
                <LogUtilityModal
                    show={showUtilityModal}
                    onClose={() => setShowUtilityModal(false)}
                    units={units}
                    properties={properties}
                    leases={leases}
                    onSave={handleSaveUtilityReading}
                    utilityReadings={utilityReadings}
                />
            )}

            {showRenewModal && renewingLease && (
                <RenewLeaseModal
                    show={showRenewModal}
                    onClose={() => { setShowRenewModal(false); setRenewingLease(null); }}
                    lease={renewingLease}
                    tenants={tenants}
                    units={units}
                    properties={properties}
                    onSave={handleRenewLease}
                />
            )}

            <Modal show={showTicketModal} onClose={() => setShowTicketModal(false)} title="Maintenance Request">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveTicket({
                        unitId: formData.get('unitId') as string,
                        propertyId: units.find(u => u.id === formData.get('unitId'))?.propertyId || '',
                        title: formData.get('title') as string,
                        description: formData.get('description') as string,
                        priority: formData.get('priority') as PMPriority
                    });
                }} className="space-y-6">
                    <select name="unitId" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none">{units.map(u => <option key={u.id} value={u.id}>Unit {u.unitNumber} - {properties.find(p => p.id === u.propertyId)?.name}</option>)}</select>
                    <input name="title" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Issue Title" />
                    <textarea name="description" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none h-32" placeholder="Describe the maintenance issue..."></textarea>
                    <select name="priority" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Urgent">Urgent</option></select>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4">Submit Request</button>
                </form>
            </Modal>
            <Modal show={showListingModal} onClose={() => setShowListingModal(false)} title="New Marketplace Listing">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveListing({
                        title: formData.get('title') as string,
                        propertyId: formData.get('propertyId') as string,
                        unitId: formData.get('unitId') as string || null,
                        description: formData.get('description') as string,
                        price: parseFloat(formData.get('price') as string) || 0,
                        listingType: formData.get('listingType') as string,
                        status: formData.get('status') as string,
                    });
                }} className="space-y-6">
                    <select name="propertyId" required className="form-select">
                        <option value="">Select Target Property...</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Listing Title</label>
                        <input name="title" required className="form-input" placeholder="e.g. Spacious 2BR Apartment in Westlands" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Market Objective</label>
                            <select name="listingType" className="form-select">
                                <option value="Rent">For Rent</option>
                                <option value="Sale">For Sale</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Asking Price (KES)</label>
                            <input name="price" type="number" required className="form-input" placeholder="0.00" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Description</label>
                        <textarea name="description" required className="form-input h-32" placeholder="Detail the prime features of this property..."></textarea>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Property Images ({newListingImages.length}/5)</label>
                            {newListingImages.length < 5 && (
                                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 cursor-pointer hover:underline">
                                    + Add Image
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            )}
                        </div>

                        {newListingImages.length > 0 && (
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
                                {newListingImages.map((img, idx) => (
                                    <div key={idx} className="relative flex-none w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                                        <img loading="lazy" src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setNewListingImages(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Visibility Status</label>
                        <select name="status" className="form-select">
                            <option value="Draft">Save as Draft (Hidden)</option>
                            <option value="Published">Publish to Marketplace</option>
                        </select>
                    </div>

                    <button type="submit" className="btn-primary w-full h-14 mt-4 text-[10px]">Create Advertisement</button>
                </form>
            </Modal>

            <Modal show={showInspectionModal} onClose={() => { setShowInspectionModal(false); setEditingInspection(null); }} title={editingInspection ? "Edit Inspection Form" : "Move-Out Inspection Form"}>
                <form key={editingInspection?.id || 'new'} onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const calculatedCost = (parseFloat(inspectionDetails.waterBill as any) || 0) +
                                           (parseFloat(inspectionDetails.electricityBill as any) || 0) +
                                           inspectionDetails.items.reduce((sum, item) => sum + (parseFloat(item.amount as any) || 0), 0);
                    handleSaveInspection({
                        leaseId: formData.get('leaseId') as string,
                        tenantId: leases.find(l => l.id === formData.get('leaseId'))?.tenantId || '',
                        inspectionDate: formData.get('inspectionDate') as string,
                        inspectedBy: formData.get('inspectedBy') as string,
                        status: formData.get('status') as any,
                        structuralCondition: formData.get('structuralCondition') as string,
                        structuralComments: formData.get('structuralComments') as string,
                        cleaningCondition: formData.get('cleaningCondition') as string,
                        cleaningComments: formData.get('cleaningComments') as string,
                        fittingsCondition: formData.get('fittingsCondition') as string,
                        fittingsComments: formData.get('fittingsComments') as string,
                        repairsRequired: JSON.stringify(inspectionDetails),
                        estimatedRepairCost: calculatedCost,
                        tenantSignoff: formData.get('tenantSignoff') === 'on',
                        id: editingInspection?.id,
                        createdAt: editingInspection?.createdAt
                    });
                }} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 no-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Active Lease</label>
                            <select name="leaseId" required defaultValue={editingInspection?.leaseId || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white">
                                <option value="">Choose Lease...</option>
                                {leases.map(l => {
                                    const t = tenants.find(ten => ten.id === l.tenantId);
                                    const u = units.find(un => un.id === l.unitId);
                                    return <option key={l.id} value={l.id}>{t?.name || 'Unknown'} - Unit {u?.unitNumber || '—'}</option>;
                                })}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Inspection Date</label>
                            <input name="inspectionDate" type="date" required defaultValue={editingInspection?.inspectionDate ? editingInspection.inspectionDate.split('T')[0] : new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Inspected By (Agent)</label>
                            <input name="inspectedBy" defaultValue={editingInspection?.inspectedBy || currentUser?.name || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white" placeholder="Inspector Name" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Report Status</label>
                            <select name="status" defaultValue={editingInspection?.status || 'Draft'} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white">
                                <option value="Draft">Draft</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-700/50 my-4 pt-4 space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Condition Checklist</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Structural</label>
                                <select name="structuralCondition" defaultValue={editingInspection?.structuralCondition || 'Good'} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white">
                                    <option value="Good">Good</option>
                                    <option value="Fair">Fair</option>
                                    <option value="Poor">Poor</option>
                                </select>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Structural Comments</label>
                                <input name="structuralComments" defaultValue={editingInspection?.structuralComments || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white" placeholder="Walls, paint, floors, windows..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Cleaning</label>
                                <select name="cleaningCondition" defaultValue={editingInspection?.cleaningCondition || 'Good'} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white">
                                    <option value="Good">Good</option>
                                    <option value="Fair">Fair</option>
                                    <option value="Poor">Poor</option>
                                </select>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Cleaning Comments</label>
                                <input name="cleaningComments" defaultValue={editingInspection?.cleaningComments || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white" placeholder="Kitchen, bathrooms, overall dirt..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Fittings & Plugs</label>
                                <select name="fittingsCondition" defaultValue={editingInspection?.fittingsCondition || 'Good'} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white">
                                    <option value="Good">Good</option>
                                    <option value="Fair">Fair</option>
                                    <option value="Poor">Poor</option>
                                </select>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Fittings Comments</label>
                                <input name="fittingsComments" defaultValue={editingInspection?.fittingsComments || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white" placeholder="Lights, sockets, taps, shower..." />
                            </div>
                        </div>
                    </div>

                    {/* House Inspection Form Items (from image) */}
                    <div className="border-t border-slate-100 dark:border-slate-700/50 my-4 pt-4 space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">House Inspection Readings & Items</h4>
                        
                        {/* 1. Water Readings */}
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-3">
                            <p className="text-[10px] font-black text-slate-505 uppercase tracking-wider">1 - Water readings</p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase tracking-wider text-slate-400">Meter No</label>
                                    <input
                                        type="text"
                                        value={inspectionDetails.waterMeterNo}
                                        onChange={(e) => setInspectionDetails({ ...inspectionDetails, waterMeterNo: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-850 rounded-xl p-3 text-xs font-bold outline-none border border-transparent focus:border-blue-500 dark:text-white"
                                        placeholder="Meter Number"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase tracking-wider text-slate-400">Current Bill (KES)</label>
                                    <input
                                        type="number"
                                        value={inspectionDetails.waterBill}
                                        onChange={(e) => setInspectionDetails({ ...inspectionDetails, waterBill: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-white dark:bg-slate-850 rounded-xl p-3 text-xs font-bold outline-none border border-transparent focus:border-blue-500 dark:text-white"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase tracking-wider text-slate-400">Remarks</label>
                                    <input
                                        type="text"
                                        value={inspectionDetails.waterRemarks}
                                        onChange={(e) => setInspectionDetails({ ...inspectionDetails, waterRemarks: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-850 rounded-xl p-3 text-xs font-bold outline-none border border-transparent focus:border-blue-500 dark:text-white"
                                        placeholder="Remarks"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Electricity Readings */}
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-3">
                            <p className="text-[10px] font-black text-slate-505 uppercase tracking-wider">2 - Electricity readings</p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase tracking-wider text-slate-400">Meter No</label>
                                    <input
                                        type="text"
                                        value={inspectionDetails.electricityMeterNo}
                                        onChange={(e) => setInspectionDetails({ ...inspectionDetails, electricityMeterNo: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-850 rounded-xl p-3 text-xs font-bold outline-none border border-transparent focus:border-blue-500 dark:text-white"
                                        placeholder="Meter Number"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase tracking-wider text-slate-400">Current Bill (KES)</label>
                                    <input
                                        type="number"
                                        value={inspectionDetails.electricityBill}
                                        onChange={(e) => setInspectionDetails({ ...inspectionDetails, electricityBill: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-white dark:bg-slate-850 rounded-xl p-3 text-xs font-bold outline-none border border-transparent focus:border-blue-500 dark:text-white"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase tracking-wider text-slate-400">Remarks</label>
                                    <input
                                        type="text"
                                        value={inspectionDetails.electricityRemarks}
                                        onChange={(e) => setInspectionDetails({ ...inspectionDetails, electricityRemarks: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-850 rounded-xl p-3 text-xs font-bold outline-none border border-transparent focus:border-blue-550 dark:text-white"
                                        placeholder="Remarks"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. C.I.U no (pre-paid only) */}
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl grid grid-cols-2 gap-3 items-center">
                            <p className="text-[10px] font-black text-slate-505 uppercase tracking-wider">3 - C.I.U no (for pre-paid meters)</p>
                            <input
                                type="text"
                                value={inspectionDetails.ciuNo}
                                onChange={(e) => setInspectionDetails({ ...inspectionDetails, ciuNo: e.target.value })}
                                className="w-full bg-white dark:bg-slate-850 rounded-xl p-3 text-xs font-bold outline-none border border-transparent focus:border-blue-500 dark:text-white"
                                placeholder="C.I.U Number"
                            />
                        </div>

                        {/* Itemized checklist items (4, 5, 7, etc) */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Additional Items required to be fixed/cleared</p>
                                <button
                                    type="button"
                                    onClick={() => setInspectionDetails({
                                        ...inspectionDetails,
                                        items: [...inspectionDetails.items, { description: '', amount: 0, remarks: '' }]
                                    })}
                                    className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-650 hover:bg-indigo-100 rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest transition-colors"
                                >
                                    + Add Item
                                </button>
                            </div>

                            {inspectionDetails.items.map((item, idx) => (
                                <div key={idx} className="flex gap-3 items-center bg-slate-50 dark:bg-slate-800/20 p-3 rounded-2xl">
                                    <span className="text-[10px] font-black text-slate-400 pl-2">{idx + 4}-</span>
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => {
                                            const updated = [...inspectionDetails.items];
                                            updated[idx].description = e.target.value;
                                            setInspectionDetails({ ...inspectionDetails, items: updated });
                                        }}
                                        className="flex-1 bg-white dark:bg-slate-850 rounded-xl p-3 text-xs font-bold outline-none border border-transparent focus:border-blue-500 dark:text-white"
                                        placeholder="Item to fix or purchase"
                                        required
                                    />
                                    <input
                                        type="number"
                                        value={item.amount}
                                        onChange={(e) => {
                                            const updated = [...inspectionDetails.items];
                                            updated[idx].amount = parseFloat(e.target.value) || 0;
                                            setInspectionDetails({ ...inspectionDetails, items: updated });
                                        }}
                                        className="w-24 bg-white dark:bg-slate-850 rounded-xl p-3 text-xs font-bold outline-none border border-transparent focus:border-blue-500 dark:text-white"
                                        placeholder="Amount"
                                    />
                                    <input
                                        type="text"
                                        value={item.remarks}
                                        onChange={(e) => {
                                            const updated = [...inspectionDetails.items];
                                            updated[idx].remarks = e.target.value;
                                            setInspectionDetails({ ...inspectionDetails, items: updated });
                                        }}
                                        className="flex-1 bg-white dark:bg-slate-850 rounded-xl p-3 text-xs font-bold outline-none border border-transparent focus:border-blue-500 dark:text-white"
                                        placeholder="Remarks/Details"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const updated = inspectionDetails.items.filter((_, i) => i !== idx);
                                            setInspectionDetails({ ...inspectionDetails, items: updated });
                                        }}
                                        className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Signatures / Checked By details */}
                        <div className="grid grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Checked By</label>
                                <input
                                    type="text"
                                    value={inspectionDetails.checkedBy}
                                    onChange={(e) => setInspectionDetails({ ...inspectionDetails, checkedBy: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white"
                                    placeholder="Checked By Name"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tenant ID No</label>
                                <input
                                    type="text"
                                    value={inspectionDetails.tenantIdNo}
                                    onChange={(e) => setInspectionDetails({ ...inspectionDetails, tenantIdNo: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white"
                                    placeholder="ID Number"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tenant Tel</label>
                                <input
                                    type="text"
                                    value={inspectionDetails.tenantTel}
                                    onChange={(e) => setInspectionDetails({ ...inspectionDetails, tenantTel: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-550 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white"
                                    placeholder="Tenant Phone"
                                />
                            </div>
                        </div>

                        {/* Calculated Total Display */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl flex justify-between items-center text-xs font-bold my-4">
                            <span className="text-slate-500 uppercase tracking-widest">Total Estimated Repair Cost</span>
                            <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                                KES {((parseFloat(inspectionDetails.waterBill as any) || 0) +
                                      (parseFloat(inspectionDetails.electricityBill as any) || 0) +
                                      inspectionDetails.items.reduce((sum, item) => sum + (parseFloat(item.amount as any) || 0), 0)).toLocaleString()}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 h-full pl-2">
                            <input type="checkbox" name="tenantSignoff" id="tenantSignoff" defaultChecked={editingInspection?.tenantSignoff} className="w-5 h-5 accent-blue-600 rounded" />
                            <label htmlFor="tenantSignoff" className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Tenant Acknowledged & Confirmed</label>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4">
                        {editingInspection?.id && !editingInspection.id.startsWith('new_') ? "Save Inspection Report" : "Complete Inspection Form"}
                    </button>
                </form>
            </Modal>

            {(() => {
                const selectedLeaseForRefund = leases.find(l => l.id === (editingRefund?.leaseId || refundSelectedLeaseId));
                const originalDeposit = selectedLeaseForRefund ? selectedLeaseForRefund.depositAmount : 0;
                const unpaidRent = selectedLeaseForRefund
                    ? invoices.filter(inv => inv.leaseId === selectedLeaseForRefund.id && (inv.status === 'Sent' || inv.status === 'Overdue')).reduce((sum, inv) => sum + inv.amount, 0)
                    : 0;
                const damageCost = selectedLeaseForRefund
                    ? inspections.filter(insp => insp.leaseId === selectedLeaseForRefund.id).reduce((sum, insp) => sum + insp.estimatedRepairCost, 0)
                    : 0;

                let extraDeposits = { electricityDeposit: 0, waterDeposit: 0, aobDeposit: 0, comments: '' };
                if (editingRefund?.otherDeductionsComments) {
                    try {
                        extraDeposits = JSON.parse(editingRefund.otherDeductionsComments);
                    } catch (e) {
                        extraDeposits.comments = editingRefund.otherDeductionsComments;
                    }
                }

                return (
                    <Modal show={showRefundModal} onClose={() => { setShowRefundModal(false); setEditingRefund(null); setRefundSelectedLeaseId(''); }} title={editingRefund ? "Edit Deposit Refund Statement" : "Generate Deposit Refund Statement"}>
                        <form key={editingRefund?.id || refundSelectedLeaseId || 'new'} onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const origDep = parseFloat(formData.get('originalDeposit') as string) || 0;
                            const elecDep = parseFloat(formData.get('electricityDeposit') as string) || 0;
                            const waterDep = parseFloat(formData.get('waterDeposit') as string) || 0;
                            const aobDep = parseFloat(formData.get('aobDeposit') as string) || 0;

                            const rentArr = parseFloat(formData.get('rentArrearsDeduction') as string) || 0;
                            const utilArr = parseFloat(formData.get('utilityArrearsDeduction') as string) || 0;
                            const dmgRep = parseFloat(formData.get('damageRepairDeduction') as string) || 0;
                            const otherDed = parseFloat(formData.get('otherDeductions') as string) || 0;
                            const otherDedComments = formData.get('otherDeductionsComments') as string;

                            const totalDeposits = origDep + elecDep + waterDep + aobDep;
                            const finalRefund = totalDeposits - rentArr - utilArr - dmgRep - otherDed;

                            const commentsPayload = JSON.stringify({
                                electricityDeposit: elecDep,
                                waterDeposit: waterDep,
                                aobDeposit: aobDep,
                                comments: otherDedComments
                            });

                            handleSaveRefund({
                                leaseId: editingRefund?.leaseId || refundSelectedLeaseId,
                                tenantId: leases.find(l => l.id === (editingRefund?.leaseId || refundSelectedLeaseId))?.tenantId || '',
                                statementDate: formData.get('statementDate') as string,
                                originalDeposit: origDep,
                                rentArrearsDeduction: rentArr,
                                utilityArrearsDeduction: utilArr,
                                damageRepairDeduction: dmgRep,
                                otherDeductions: otherDed,
                                otherDeductionsComments: commentsPayload,
                                refundAmount: finalRefund,
                                paymentMethod: formData.get('paymentMethod') as string || undefined,
                                paymentReference: formData.get('paymentReference') as string || undefined,
                                status: editingRefund?.status || 'Pending Approval',
                                id: editingRefund?.id,
                                createdAt: editingRefund?.createdAt
                            });
                        }} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 no-scrollbar">
                            
                            {!editingRefund && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Lease</label>
                                    <select 
                                        required 
                                        value={refundSelectedLeaseId}
                                        onChange={(e) => setRefundSelectedLeaseId(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white"
                                    >
                                        <option value="">Choose Lease...</option>
                                        {leases.map(l => {
                                            const t = tenants.find(ten => ten.id === l.tenantId);
                                            const u = units.find(un => un.id === l.unitId);
                                            return <option key={l.id} value={l.id}>{t?.name || 'Unknown'} - Unit {u?.unitNumber || '—'}</option>;
                                        })}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Statement Date</label>
                                    <input name="statementDate" type="date" required defaultValue={editingRefund?.statementDate ? editingRefund.statementDate.split('T')[0] : new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white" />
                                </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-700/50 my-4 pt-4 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Deposits Paid</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Rent Deposit (KES)</label>
                                        <input name="originalDeposit" type="number" step="0.01" required defaultValue={editingRefund?.originalDeposit ?? originalDeposit} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Electricity Deposit (KES)</label>
                                        <input name="electricityDeposit" type="number" step="0.01" required defaultValue={extraDeposits.electricityDeposit} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Water Deposit (KES)</label>
                                        <input name="waterDeposit" type="number" step="0.01" required defaultValue={extraDeposits.waterDeposit} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">A.O.B Deposit (KES)</label>
                                        <input name="aobDeposit" type="number" step="0.01" required defaultValue={extraDeposits.aobDeposit} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white" />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-700/50 my-4 pt-4 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Deductions</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Rent Arrears (Auto-computed)</label>
                                        <input name="rentArrearsDeduction" type="number" step="0.01" required defaultValue={editingRefund?.rentArrearsDeduction ?? unpaidRent} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-rose-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Damage / Repair (From Inspection)</label>
                                        <input name="damageRepairDeduction" type="number" step="0.01" required defaultValue={editingRefund?.damageRepairDeduction ?? damageCost} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-rose-500" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Utility Arrears (KES)</label>
                                        <input name="utilityArrearsDeduction" type="number" step="0.01" required defaultValue={editingRefund?.utilityArrearsDeduction || 0} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-rose-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Other Deductions (KES)</label>
                                        <input name="otherDeductions" type="number" step="0.01" required defaultValue={editingRefund?.otherDeductions || 0} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-rose-500" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Comments on Other Deductions</label>
                                    <input name="otherDeductionsComments" defaultValue={editingRefund?.otherDeductionsComments || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white" placeholder="Describe other deductions (e.g. cleaning charges, legal notice fee)..." />
                                </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-700/50 my-4 pt-4 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Settlement Payout</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Payment Method</label>
                                        <select name="paymentMethod" defaultValue={editingRefund?.paymentMethod || 'Bank Transfer'} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white">
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="M-Pesa">M-Pesa</option>
                                            <option value="Cheque">Cheque</option>
                                            <option value="Cash">Cash</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Ref / Tx Number</label>
                                        <input name="paymentReference" defaultValue={editingRefund?.paymentReference || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white" placeholder="e.g. MPESA Ref, Check No" />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4">
                                {editingRefund ? "Save Refund Statement" : "Generate Refund Statement"}
                            </button>
                        </form>
                    </Modal>
                );
            })()}

            {showBulkDateModal && (
                <Modal show={showBulkDateModal} onClose={() => setShowBulkDateModal(false)} title="Bulk Update Lease Start Dates">
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setIsBulkUpdating(true);
                        try {
                            const activeLeases = leases.filter(l => l.status === 'Active');
                            const updatedLeases = activeLeases.map(l => ({ ...l, startDate: bulkUpdateDate }));
                            await apiService.saveModuleRecords('pm_leases', updatedLeases);
                            alert(`Successfully updated start date for ${updatedLeases.length} leases.`);
                            setShowBulkDateModal(false);
                            loadData();
                        } catch (err: any) {
                            alert("Failed to bulk update lease start dates: " + err.message);
                        } finally {
                            setIsBulkUpdating(false);
                        }
                    }} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select New Start Date</label>
                            <input
                                type="date"
                                required
                                value={bulkUpdateDate}
                                onChange={(e) => setBulkUpdateDate(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white"
                            />
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            This will set the start date of all <strong>{leases.filter(l => l.status === 'Active').length}</strong> active leases to the selected date. This is typically used to align the billing cycles of imported/onboarded leases.
                        </p>
                        <div className="flex gap-4 justify-end">
                            <button
                                type="button"
                                onClick={() => setShowBulkDateModal(false)}
                                className="px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >Cancel</button>
                            <button
                                type="submit"
                                disabled={isBulkUpdating}
                                className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                            >{isBulkUpdating ? "Updating..." : "Confirm Bulk Update"}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {showTenantImportModal && <SmartTenantImporterModal />}
            {showBankModal && <BankActionModal />}
            {showCoopModal && <CoopBankB2bModal />}
            
            {showPdfPreview && (
                <PdfPreviewModal 
                    url={previewPdfUrl} 
                    onClose={() => {
                        setShowPdfPreview(false);
                        if (previewPdfUrl.startsWith('blob:')) {
                            URL.revokeObjectURL(previewPdfUrl);
                        }
                    }} 
                    filename={`${previewPdfTitle.replace(/\s+/g, '_').toLowerCase()}.pdf`}
                />
            )}

            <Modal
                show={showExpenseModal}
                onClose={() => { setShowExpenseModal(false); setSelectedExpensePropertyId(''); }}
                title="Record Expense / Create Payment Voucher"
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveExpense({
                        propertyId: formData.get('propertyId') as string,
                        unitId: (formData.get('unitId') as string) || undefined,
                        category: formData.get('category') as PMExpenseCategory,
                        payeeName: formData.get('payeeName') as string,
                        payeePhone: (formData.get('payeePhone') as string) || undefined,
                        amount: parseFloat(formData.get('amount') as string),
                        paymentDate: formData.get('paymentDate') as string,
                        paymentMethod: formData.get('paymentMethod') as any,
                        reference: (formData.get('reference') as string) || undefined,
                        description: formData.get('description') as string,
                        status: 'Pending Approval'
                    });
                }} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Voucher Number</label>
                            <input type="text" readOnly defaultValue={`PV-${String(expenses.length + 1).padStart(4, '0')}`} className="w-full bg-slate-100 dark:bg-slate-900 border-2 border-transparent rounded-2xl p-4 font-bold outline-none text-slate-500 cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Payment Date</label>
                            <input name="paymentDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Property</label>
                            <select 
                                name="propertyId" 
                                required 
                                value={selectedExpensePropertyId} 
                                onChange={(e) => setSelectedExpensePropertyId(e.target.value)} 
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all"
                            >
                                <option value="">Select Property...</option>
                                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Unit (Optional)</label>
                            <select 
                                name="unitId" 
                                disabled={!selectedExpensePropertyId}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all disabled:opacity-50"
                            >
                                <option value="">Whole Property</option>
                                {units.filter(u => u.propertyId === selectedExpensePropertyId).map(u => (
                                    <option key={u.id} value={u.id}>Unit {u.unitNumber} ({u.unitType})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Expense Category</label>
                            <select 
                                name="category" 
                                required 
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all"
                            >
                                <option value="Utilities">Utilities</option>
                                <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                                <option value="Staff Salaries & Caretakers">Staff Salaries & Caretakers</option>
                                <option value="Trash & Cleaning">Trash & Cleaning</option>
                                <option value="Water & Plumbing">Water & Plumbing</option>
                                <option value="Government Licenses & Taxes">Government Licenses & Taxes</option>
                                <option value="Legal & Professional Fees">Legal & Professional Fees</option>
                                <option value="Insurance">Insurance</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Expense Amount (KES)</label>
                            <input name="amount" type="number" step="0.01" required min="0.01" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="Enter amount..." />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Payee / Vendor Name</label>
                            <input name="payeeName" type="text" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="e.g. John Doe, Kenya Power..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Payee Phone (Optional)</label>
                            <input name="payeePhone" type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="e.g. 0712345678" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Payment Method</label>
                            <select 
                                name="paymentMethod" 
                                required 
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all"
                            >
                                <option value="Cash">Cash</option>
                                <option value="M-Pesa">M-Pesa</option>
                                <option value="Bank">Bank Transfer</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Payment Reference (Optional)</label>
                            <input name="reference" type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="e.g. MPesa Ref, Cheque No..." />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Description / Particulars</label>
                        <textarea name="description" required rows={3} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all resize-none" placeholder="Provide particulars of the payment..."></textarea>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 mt-4">
                        Record Voucher
                    </button>
                </form>
            </Modal>

            <Modal 
                show={showInvoiceModal} 
                onClose={() => {
                    setShowInvoiceModal(false);
                    setEditingInvoice(null);
                }} 
                title={editingInvoice ? `Edit Invoice - #${editingInvoice.invoiceNumber}` : "Generate New Invoice"} 
                maxWidth="max-w-md"
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const leaseId = formData.get('leaseId') as string;
                    
                    const payload: Partial<PMInvoice> = {
                        amount: parseFloat(formData.get('amount') as string) || 0,
                        description: formData.get('description') as string,
                        dueDate: formData.get('dueDate') as string,
                        openingBalance: formData.get('openingBalance') !== '' ? parseFloat(formData.get('openingBalance') as string) : 0
                    };

                    if (editingInvoice) {
                        payload.status = formData.get('status') as PMInvoiceStatus;
                    } else {
                        const lease = leases.find(l => l.id === leaseId);
                        if (!lease) return;
                        payload.leaseId = leaseId;
                        payload.tenantId = lease.tenantId;
                        payload.unitId = lease.unitId;
                        payload.issueDate = new Date().toISOString().split('T')[0];
                        payload.status = 'Sent';
                    }

                    handleSaveInvoice(payload);
                }} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Target Tenant / Lease</label>
                        <select 
                            name="leaseId" 
                            required 
                            disabled={!!editingInvoice}
                            key={editingInvoice ? editingInvoice.id : 'new'}
                            defaultValue={editingInvoice?.leaseId || ""}
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl p-3 font-bold outline-none disabled:opacity-60"
                        >
                            <option value="">Select Tenant...</option>
                            {leases.filter(l => l.status === 'Active' || l.id === editingInvoice?.leaseId).map(l => {
                                const tenant = tenants.find(t => t.id === l.tenantId);
                                const unit = units.find(u => u.id === l.unitId);
                                return (
                                    <option key={l.id} value={l.id}>
                                        {tenant?.name} ({unit?.unitNumber})
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Description</label>
                        <input 
                            name="description" 
                            defaultValue={editingInvoice ? editingInvoice.description : "Monthly Rent"} 
                            required 
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl p-3 font-bold outline-none" 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Amount (KES)</label>
                            <input 
                                name="amount" 
                                type="number" 
                                defaultValue={editingInvoice ? editingInvoice.amount : ""}
                                required 
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl p-3 font-bold outline-none" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Due Date</label>
                            <input 
                                name="dueDate" 
                                type="date" 
                                required 
                                defaultValue={editingInvoice ? editingInvoice.dueDate.split('T')[0] : (pmSettings?.defaultRentDueDate ? getNextRentDueDate(pmSettings.defaultRentDueDate) : new Date().toISOString().split('T')[0])}
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl p-3 font-bold outline-none" 
                            />
                        </div>
                    </div>

                    {editingInvoice && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Status</label>
                                <select 
                                    name="status" 
                                    defaultValue={editingInvoice.status} 
                                    required 
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl p-3 font-bold outline-none"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Sent">Sent</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Overdue">Overdue</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Opening Balance (KES)</label>
                                <input 
                                    name="openingBalance" 
                                    type="number" 
                                    defaultValue={editingInvoice.openingBalance || ''} 
                                    placeholder="0"
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl p-3 font-bold outline-none" 
                                />
                            </div>
                        </div>
                    )}

                    {!editingInvoice && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Opening Balance (KES) - Optional</label>
                            <input 
                                name="openingBalance" 
                                type="number" 
                                placeholder="0"
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl p-3 font-bold outline-none" 
                            />
                        </div>
                    )}

                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all mt-4">
                        {editingInvoice ? "Save Changes" : "Generate & Finalize Invoice"}
                    </button>
                </form>
            </Modal>

            <Modal show={showGenerateArrearsModal} onClose={() => setShowGenerateArrearsModal(false)} title="Generate Rent & Arrears Invoices" maxWidth="max-w-md">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleGenerateArrears({
                        billingMonth: formData.get('billingMonth') as string,
                        propertyId: formData.get('propertyId') as string,
                        dueDate: formData.get('dueDate') as string,
                        generateRent: formData.get('generateRent') === 'true',
                        generateArrears: formData.get('generateArrears') === 'true',
                    });
                }} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Target Billing Month</label>
                        <input name="billingMonth" type="month" required defaultValue={new Date().toISOString().slice(0, 7)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl p-3 font-bold outline-none text-sm dark:text-slate-800" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Property</label>
                        <select name="propertyId" required className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl p-3 font-bold outline-none text-sm dark:text-slate-800">
                            <option value="all">All Properties</option>
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Payment Due Date</label>
                        <input name="dueDate" type="date" required defaultValue={pmSettings?.defaultRentDueDate ? getNextRentDueDate(pmSettings.defaultRentDueDate) : new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl p-3 font-bold outline-none text-sm dark:text-slate-800" />
                    </div>
                    
                    <div className="space-y-3 pt-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" name="generateRent" value="true" defaultChecked className="w-4.5 h-4.5 rounded text-blue-600 focus:ring-blue-500" />
                            <span className="text-xs font-bold text-slate-650 dark:text-slate-350">Generate Standard Rent Invoices</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" name="generateArrears" value="true" defaultChecked className="w-4.5 h-4.5 rounded text-blue-600 focus:ring-blue-500" />
                            <span className="text-xs font-bold text-slate-650 dark:text-slate-350">Generate Outstanding Arrears Invoices</span>
                        </label>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all mt-4">
                        Generate & Process Invoices
                    </button>
                </form>
            </Modal>
        </div>
    );
};

const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
};

interface RecordPaymentModalProps {
    show: boolean;
    onClose: () => void;
    leases: PMLease[];
    tenants: PMTenant[];
    units: PMUnit[];
    properties: PMProperty[];
    onSave: (data: Partial<PMPayment> & { payments?: { paymentType: PMPaymentType; amount: number }[] }) => void;
    pmSettings: PMSettings | null;
    getNextRentDueDate: (dueDay: number) => string;
    invoices: PMInvoice[];
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
    show, onClose, leases, tenants, units, properties, onSave, pmSettings, getNextRentDueDate, invoices
}) => {
    const [tenantSearchQuery, setTenantSearchQuery] = useState('');
    const [selectedLeaseId, setSelectedLeaseId] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [rentAmt, setRentAmt] = useState('');
    const [depositAmt, setDepositAmt] = useState('');
    const [utilityAmt, setUtilityAmt] = useState('');

    useEffect(() => {
        if (selectedLeaseId) {
            const lease = leases.find(l => l.id === selectedLeaseId);
            if (lease) {
                setRentAmt(lease.rentAmount.toString());
                setDepositAmt('');
                setUtilityAmt('');
            }
        } else {
            setRentAmt('');
            setDepositAmt('');
            setUtilityAmt('');
        }
    }, [selectedLeaseId, leases]);

    const totalAmount = (parseFloat(rentAmt) || 0) + (parseFloat(depositAmt) || 0) + (parseFloat(utilityAmt) || 0);

    const receiptPrefix = pmSettings?.numbering?.receiptPrefix || 'REC';
    const receiptNextNum = pmSettings?.numbering?.receiptNextNumber || 1000;

    const getReceiptBadgeText = () => {
        const count = [parseFloat(rentAmt) > 0, parseFloat(depositAmt) > 0, parseFloat(utilityAmt) > 0].filter(Boolean).length;
        if (count <= 1) {
            return `Receipt No: ${receiptPrefix}-${receiptNextNum}`;
        }
        return `Receipt Nos: ${receiptPrefix}-${receiptNextNum} to ${receiptPrefix}-${receiptNextNum + count - 1}`;
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Record Transaction</h3>
                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                            {getReceiptBadgeText()}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-8 max-h-[70vh] overflow-y-auto">
                    <form onSubmit={(e) => { 
                        e.preventDefault(); 
                        if (!selectedLeaseId) {
                            alert("Please search and select a tenant lease.");
                            return;
                        }
                        const formData = new FormData(e.currentTarget); 
                        
                        const payloadPayments: { paymentType: PMPaymentType; amount: number }[] = [];
                        if (parseFloat(rentAmt) > 0) payloadPayments.push({ paymentType: 'Rent', amount: parseFloat(rentAmt) });
                        if (parseFloat(depositAmt) > 0) payloadPayments.push({ paymentType: 'Deposit', amount: parseFloat(depositAmt) });
                        if (parseFloat(utilityAmt) > 0) payloadPayments.push({ paymentType: 'Utility', amount: parseFloat(utilityAmt) });

                        if (payloadPayments.length === 0) {
                            alert("Please enter a payment amount for at least one type.");
                            return;
                        }

                        onSave({ 
                            leaseId: selectedLeaseId, 
                            paymentDate: formData.get('paymentDate') as string,
                            paymentMethod: formData.get('paymentMethod') as PMPaymentMethod,
                            reference: formData.get('reference') as string,
                            payments: payloadPayments
                        }); 
                    }} className="space-y-6">
                        {/* Tenant Search & Select Dropdown */}
                        <div className="relative">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Search Tenant</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Type tenant name or unit number to search..."
                                    value={tenantSearchQuery}
                                    onChange={(e) => {
                                        setTenantSearchQuery(e.target.value);
                                        setIsDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-sm dark:text-white"
                                />
                                {selectedLeaseId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedLeaseId('');
                                            setTenantSearchQuery('');
                                        }}
                                        className="px-4 bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 rounded-2xl font-bold text-xs"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {/* Selected Lease Indicator */}
                            {selectedLeaseId ? (() => {
                                const lease = leases.find(l => l.id === selectedLeaseId);
                                const tenant = tenants.find(t => t.id === lease?.tenantId);
                                const unit = units.find(u => u.id === lease?.unitId);
                                const expectedRent = lease?.rentAmount || 0;
                                const unpaidInvoices = invoices
                                    ? invoices.filter(inv => inv.leaseId === selectedLeaseId && inv.status !== 'Paid' && inv.status !== 'Cancelled')
                                    : [];
                                const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0) + (inv.openingBalance || 0), 0);
                                return (
                                    <div className="mt-2 p-4 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 rounded-2xl text-xs border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                                        <div className="flex justify-between items-center font-bold">
                                            <span>Selected: {tenant?.name || 'Unknown'} (Unit {unit?.unitNumber || 'N/A'})</span>
                                            <span className="text-[9px] bg-indigo-200 dark:bg-indigo-900 text-indigo-850 px-2 py-0.5 rounded-full uppercase tracking-wider font-black">Active Lease</span>
                                        </div>
                                        <div className="pt-2.5 border-t border-indigo-100 dark:border-indigo-900/30 grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Expected Rent</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">KES {expectedRent.toLocaleString()}</p>
                                                    {rentAmt !== expectedRent.toString() && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => setRentAmt(expectedRent.toString())}
                                                            className="text-[8px] bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wider transition-all"
                                                        >
                                                            Use
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Outstanding Balance</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <p className={`text-sm font-black ${totalOutstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>KES {totalOutstanding.toLocaleString()}</p>
                                                    {totalOutstanding > 0 && rentAmt !== totalOutstanding.toString() && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => setRentAmt(totalOutstanding.toString())}
                                                            className="text-[8px] bg-rose-100 hover:bg-rose-200 text-rose-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wider transition-all"
                                                        >
                                                            Use
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })() : (
                                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold border border-amber-100 dark:border-amber-900/50">
                                    ⚠ Please search and select a tenant from the matches list.
                                </div>
                            )}

                            {/* Dropdown Options */}
                            {isDropdownOpen && (
                                <div className="absolute z-[1100] left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 space-y-1">
                                    {(() => {
                                        const filtered = leases.filter(l => {
                                            if (l.status !== 'Active') return false;
                                            const tenant = tenants.find(t => t.id === l.tenantId);
                                            const unit = units.find(u => u.id === l.unitId);
                                            const query = tenantSearchQuery.toLowerCase();
                                            return (tenant?.name || '').toLowerCase().includes(query) ||
                                                   (unit?.unitNumber || '').toLowerCase().includes(query);
                                        });

                                        if (filtered.length === 0) {
                                            return <div className="text-center p-4 text-xs text-slate-400">No active tenants match your search.</div>;
                                        }

                                        return filtered.map(l => {
                                            const tenant = tenants.find(t => t.id === l.tenantId);
                                            const unit = units.find(u => u.id === l.unitId);
                                            return (
                                                <div
                                                    key={l.id}
                                                    onClick={() => {
                                                        setSelectedLeaseId(l.id);
                                                        setTenantSearchQuery(`${tenant?.name} - Unit ${unit?.unitNumber}`);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`p-3 rounded-xl text-xs font-bold cursor-pointer transition-colors text-left flex justify-between items-center ${
                                                        selectedLeaseId === l.id 
                                                            ? 'bg-indigo-600 text-white' 
                                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                                                    }`}
                                                >
                                                    <span>{tenant?.name}</span>
                                                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                                                        selectedLeaseId === l.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'
                                                    }`}>Unit {unit?.unitNumber}</span>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Payment Date</label>
                                <input 
                                    type="date" 
                                    name="paymentDate" 
                                    required 
                                    defaultValue={new Date().toISOString().split('T')[0]} 
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-sm dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Payment Method</label>
                                <select 
                                    name="paymentMethod" 
                                    required
                                    defaultValue="M-Pesa"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-sm dark:text-white"
                                >
                                    <option value="M-Pesa">M-Pesa</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Transaction Reference (Optional)</label>
                            <input 
                                name="reference" 
                                type="text" 
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-sm dark:text-white" 
                                placeholder="e.g. QX87654321 / BANK-REF" 
                            />
                        </div>

                        <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Payment Breakdown</p>
                            
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Rent Amount (KES)</label>
                                    <input 
                                        type="number"
                                        value={rentAmt}
                                        onChange={(e) => setRentAmt(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 font-bold outline-none dark:text-white text-sm focus:border-blue-500 transition-colors"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Deposit Amount (KES)</label>
                                    <input 
                                        type="number"
                                        value={depositAmt}
                                        onChange={(e) => setDepositAmt(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 font-bold outline-none dark:text-white text-sm focus:border-blue-500 transition-colors"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Utility Amount (KES)</label>
                                    <input 
                                        type="number"
                                        value={utilityAmt}
                                        onChange={(e) => setUtilityAmt(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 font-bold outline-none dark:text-white text-sm focus:border-blue-500 transition-colors"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs font-black text-slate-700 dark:text-slate-350">
                                <span>TOTAL AMOUNT:</span>
                                <span className="text-base text-blue-600 dark:text-blue-400">KES {totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4">Finalize Payment</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const ArrearsManager: React.FC<{
    leases: PMLease[];
    tenants: PMTenant[];
    units: PMUnit[];
    properties: PMProperty[];
    landlords: PMLandlord[];
    payments: PMPayment[];
    invoices: PMInvoice[];
    currentInstitution: Institution;
    institutionId: string;
    loadData: () => void;
    pmSettings: PMSettings | null;
    setPmSettings: (settings: PMSettings) => void;
    companyDetails: CompanyDetails;
}> = ({
    leases, tenants, units, properties, landlords, payments, invoices, currentInstitution, institutionId, loadData, pmSettings, setPmSettings, companyDetails
}) => {
    const [arrSearch, setArrSearch] = useState('');
    const [arrProperty, setArrProperty] = useState('all');
    const [arrLandlord, setArrLandlord] = useState('all');
    const [arrMin, setArrMin] = useState('');
    const [arrMax, setArrMax] = useState('');
    const [arrPeriod, setArrPeriod] = useState(new Date().toISOString().slice(0, 7));
    const [sendingReminder, setSendingReminder] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [showSmsModal, setShowSmsModal] = useState(false);
    const [smsAdditionalText, setSmsAdditionalText] = useState('');
    const [sendingSms, setSendingSms] = useState(false);
    const [arrCurrentPage, setArrCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [includePaymentMethod, setIncludePaymentMethod] = useState(false);

    useEffect(() => {
        setArrCurrentPage(1);
    }, [arrSearch, arrProperty, arrLandlord, arrMin, arrMax, arrPeriod]);

    const Modal = ({ show, onClose, title, children, maxWidth = "max-w-lg" }: { show: boolean, onClose: () => void, title: string, children: React.ReactNode, maxWidth?: string }) => {
        if (!show) return null;
        return createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className={`bg-white dark:bg-slate-905 w-full ${maxWidth} rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300`}>
                    <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">{title}</h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-105 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            <XIcon className="w-6 h-6 text-slate-400" />
                        </button>
                    </div>
                    <div className="p-8 max-h-[70vh] overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    const handleExportPdf = async () => {
        setExporting(true);
        try {
            const dataUri = await pdfService.generateArrearsReportPdf(
                filteredArrears,
                currentInstitution,
                companyDetails,
                currentInstitution.logoUrl || null
            );
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `Arrears-Report-${new Date().toISOString().split('T')[0]}.pdf`;
            link.click();
        } catch (err) {
            alert("Failed to export arrears report PDF.");
            console.error(err);
        } finally {
            setExporting(false);
        }
    };

    const arrearsList = useMemo(() => {
        const targetYear = arrPeriod ? parseInt(arrPeriod.split('-')[0]) : new Date().getFullYear();
        const targetMonth = arrPeriod ? parseInt(arrPeriod.split('-')[1]) - 1 : new Date().getMonth();
        const periodStart = new Date(targetYear, targetMonth, 1);
        const periodEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
        const prevMonthStart = new Date(targetYear, targetMonth - 1, 1);

        // Deduplicate active leases to prevent duplicate rows in the Arrears Manager
        const uniqueLeases: PMLease[] = [];
        const seenUnits = new Set<string>();
        const seenLeaseIds = new Set<string>();
        
        const sortedActiveLeases = [...leases]
            .filter(l => l.status === 'Active')
            .sort((a, b) => {
                const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
                const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
                return dateB - dateA;
            });

        for (const lease of sortedActiveLeases) {
            if (seenLeaseIds.has(lease.id)) continue;
            seenLeaseIds.add(lease.id);

            if (lease.unitId) {
                if (seenUnits.has(lease.unitId)) continue;
                seenUnits.add(lease.unitId);
            }

            uniqueLeases.push(lease);
        }

        return uniqueLeases.map(lease => {
            const tenant = tenants.find(t => t.id === lease.tenantId);
            const unit = units.find(u => u.id === lease.unitId);
            const property = unit ? (properties.find(p => p.id === unit.propertyId) || null) : null;
            const landlord = (property && property.landlordId) ? (landlords.find(la => la.id === property.landlordId) || null) : null;

            const start = new Date(lease.startDate);
            const leaseEnd = lease.endDate ? new Date(lease.endDate) : null;

            // Check if lease is active during the selected period
            const isLeaseActiveInPeriod = start <= periodEnd && (!leaseEnd || leaseEnd >= periodStart);

            if (!isLeaseActiveInPeriod) {
                return {
                    lease, tenant, unit, property, landlord,
                    periodArrears: 0, unpaidInvoicesAmount: 0, expectedRent: 0, paidRent: 0,
                    unInvoicedArrears: 0
                };
            }

            const expectedRent = lease.rentAmount || 0;

            // Sum all cash payments against this lease during the selected period
            const paidRent = payments
                .filter(p => {
                    if (p.leaseId !== lease.id || p.paymentType === 'Utility' || p.paymentType === 'Deposit') return false;
                    const pDate = new Date(p.paymentDate);
                    return pDate >= periodStart && pDate <= periodEnd;
                })
                .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            // Sum all rent/arrears invoices generated during the selected period (exclude Cancelled/Draft)
            const totalInvoicedAmount = invoices
                .filter(inv => {
                    if (inv.leaseId !== lease.id) return false;
                    if (inv.status === 'Cancelled' || inv.status === 'Draft') return false;
                    if (!inv.description.toLowerCase().includes('rent') && !inv.description.toLowerCase().includes('arrears')) return false;
                    const iDate = new Date(inv.issueDate);
                    return iDate >= periodStart && iDate <= periodEnd;
                })
                .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

            // Sum unpaid rent/arrears invoices during current month and previous month (Sent/Overdue, exclude Cancelled/Paid)
            const unpaidInvoicesAmount = invoices
                .filter(inv => {
                    if (inv.leaseId !== lease.id) return false;
                    if (inv.status === 'Paid' || inv.status === 'Cancelled') return false;
                    if (!inv.description.toLowerCase().includes('rent') && !inv.description.toLowerCase().includes('arrears')) return false;
                    const iDate = new Date(inv.issueDate);
                    return iDate >= prevMonthStart && iDate <= periodEnd;
                })
                .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

            const unInvoicedArrears = Math.max(0, expectedRent - Math.max(paidRent, totalInvoicedAmount));
            const periodArrears = unpaidInvoicesAmount + unInvoicedArrears;

            return {
                lease,
                tenant,
                unit,
                property,
                landlord,
                periodArrears: periodArrears > 0 ? periodArrears : 0,
                unInvoicedArrears,
                unpaidInvoicesAmount,
                expectedRent,
                paidRent
            };
        });
    }, [leases, tenants, units, properties, landlords, payments, invoices, arrPeriod]);

    const filteredArrears = useMemo(() => {
        return arrearsList.filter(item => {
            if (!item.tenant) return false;
            const matchesSearch = item.tenant.name.toLowerCase().includes(arrSearch.toLowerCase()) ||
                                 item.unit?.unitNumber.toLowerCase().includes(arrSearch.toLowerCase());
            const matchesProperty = arrProperty === 'all' || item.unit?.propertyId === arrProperty;
            const matchesLandlord = arrLandlord === 'all' || item.property?.landlordId === arrLandlord;
            
            const arrearsVal = item.periodArrears;
            const matchesMin = arrMin === '' || arrearsVal >= parseFloat(arrMin);
            const matchesMax = arrMax === '' || arrearsVal <= parseFloat(arrMax);

            return matchesSearch && matchesProperty && matchesLandlord && matchesMin && matchesMax;
        });
    }, [arrearsList, arrSearch, arrProperty, arrLandlord, arrMin, arrMax]);

    const totalFilteredArrears = filteredArrears.reduce((sum, item) => sum + item.periodArrears, 0);

    const totalPages = Math.ceil(filteredArrears.length / itemsPerPage);
    const paginatedArrears = useMemo(() => {
        const start = (arrCurrentPage - 1) * itemsPerPage;
        return filteredArrears.slice(start, start + itemsPerPage);
    }, [filteredArrears, arrCurrentPage, itemsPerPage]);

    const handleSendReminder = async (item: typeof filteredArrears[0]) => {
        if (!item.tenant?.phoneNumber) return alert("Tenant has no phone number registered.");
        setSendingReminder(item.lease.id);
        try {
            const msg = `Dear ${item.tenant.name}, this is a friendly reminder that you have outstanding rent arrears of KES ${item.periodArrears.toLocaleString()} for Unit ${item.unit?.unitNumber}. Please clear this balance as soon as possible.`;
            await apiService.sendSms(item.tenant.phoneNumber, msg, currentInstitution.smsConfig, 1, institutionId);
            alert("Payment reminder sent successfully via SMS.");
        } catch (err) {
            alert("Failed to send reminder SMS.");
        } finally {
            setSendingReminder(null);
        }
    };

    const getLandlordPaymentInfo = (item: typeof filteredArrears[0]) => {
        if (!item.landlord) return '';
        const parts = [];
        if (item.landlord.preferredPaymentMethod) {
            parts.push(item.landlord.preferredPaymentMethod);
        }
        if (item.landlord.bankDetails) {
            parts.push(item.landlord.bankDetails);
        }
        if (parts.length === 0) return '';
        return `Payment details: ${parts.join(' - ')}`;
    };

    const getSmsMessage = (item: typeof filteredArrears[0]) => {
        const base = `Dear ${item.tenant!.name}, you have outstanding rent arrears of KES ${item.periodArrears.toLocaleString()} for Unit ${item.unit?.unitNumber}. Please clear this balance.`;
        const paymentInfo = includePaymentMethod ? getLandlordPaymentInfo(item) : '';
        const messageParts = [base];
        if (paymentInfo) {
            messageParts.push(paymentInfo);
        }
        if (smsAdditionalText.trim()) {
            messageParts.push(smsAdditionalText.trim());
        }
        return messageParts.join(' ');
    };

    const handleBulkReminderClick = () => {
        const listWithArrears = filteredArrears.filter(item => item.periodArrears > 0 && item.tenant?.phoneNumber);
        if (listWithArrears.length === 0) {
            return alert("No tenants in the filtered list have outstanding arrears and a registered phone number.");
        }
        setShowSmsModal(true);
    };

    const handleSendBulkReminder = async () => {
        const listWithArrears = filteredArrears.filter(item => item.periodArrears > 0 && item.tenant?.phoneNumber);
        if (listWithArrears.length === 0) return;

        setSendingSms(true);
        let sent = 0;
        try {
            // Calculate total SMS units needed (160 characters per unit page)
            const totalUnitsNeeded = listWithArrears.reduce((sum, item) => {
                const msg = getSmsMessage(item);
                return sum + Math.ceil(msg.length / 160);
            }, 0);

            const smsBalance = currentInstitution?.smsBalance || 0;

            if (smsBalance < totalUnitsNeeded) {
                // Not enough SMS units. Queue them in outbox instead.
                const outboxMessages = listWithArrears.map((item, idx) => ({
                    id: `msg_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
                    phoneNumber: item.tenant!.phoneNumber!,
                    message: getSmsMessage(item),
                    status: 'pending',
                    institutionId,
                    createdAt: new Date().toISOString()
                }));

                await apiService.saveToSmsOutbox(outboxMessages);
                alert(`Insufficient SMS units (${smsBalance} units available, ${totalUnitsNeeded} required). The ${outboxMessages.length} reminder message(s) have been moved to your outbox.`);
                setShowSmsModal(false);
                setSmsAdditionalText('');
                return;
            }

            for (const item of listWithArrears) {
                const msg = getSmsMessage(item);
                await apiService.sendSms(item.tenant!.phoneNumber!, msg, currentInstitution.smsConfig, 1, institutionId);
                sent++;
            }
            alert(`Reminders dispatch completed! Sent: ${sent}`);
            setShowSmsModal(false);
            setSmsAdditionalText('');
        } catch (err: any) {
            alert(err.message || "Failed to send reminders.");
        } finally {
            setSendingSms(false);
        }
    };

    const handleBulkInvoiceArrears = async () => {
        const listWithArrears = filteredArrears.filter(item => item.unInvoicedArrears > 0);
        if (listWithArrears.length === 0) return alert("No tenants in the filtered list have un-invoiced arrears to invoice.");
        if (!confirm(`Generate individual arrears adjustment invoices for ${listWithArrears.length} tenants?`)) return;

        const newInvoices: PMInvoice[] = [];
        const todayStr = new Date().toISOString().split('T')[0];

        const prefix = pmSettings?.numbering?.invoicePrefix || 'INV';
        let nextNum = pmSettings?.numbering?.invoiceNextNumber || 1000;

        const billingPeriodLabel = arrPeriod 
            ? (() => {
                const [y, m] = arrPeriod.split('-');
                const date = new Date(parseInt(y), parseInt(m) - 1, 1);
                return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
              })()
            : new Date().toLocaleDateString('default', { month: 'long', year: 'numeric' });

        for (const item of listWithArrears) {
            const alreadyExists = invoices.some(inv => 
                inv.leaseId === item.lease.id && 
                inv.description.includes(billingPeriodLabel)
            );
            if (alreadyExists) continue;

            newInvoices.push({
                id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                invoiceNumber: `${prefix}-${nextNum++}`,
                leaseId: item.lease.id,
                tenantId: item.lease.tenantId,
                unitId: item.lease.unitId,
                description: `Outstanding Arrears Adjustment - ${billingPeriodLabel}`,
                amount: item.unInvoicedArrears,
                issueDate: todayStr,
                dueDate: todayStr,
                status: 'Sent',
                institutionId,
                createdAt: new Date().toISOString()
            });
        }

        if (newInvoices.length === 0) {
            return alert("All eligible tenants already have arrears invoices generated for the selected billing period.");
        }

        await apiService.saveModuleRecords('pm_invoices', newInvoices);

        if (pmSettings) {
            const updatedSettings = {
                ...pmSettings,
                numbering: {
                    ...(pmSettings.numbering || {}),
                    invoiceNextNumber: nextNum
                }
            };
            await apiService.saveModuleRecord('pm_settings', updatedSettings);
            setPmSettings(updatedSettings);
        }

        alert(`Successfully generated ${newInvoices.length} arrears invoices.`);
        loadData();
    };

    const handleBulkDeleteArrearsInvoices = async () => {
        const billingPeriodLabel = arrPeriod 
            ? (() => {
                const [y, m] = arrPeriod.split('-');
                const date = new Date(parseInt(y), parseInt(m) - 1, 1);
                return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
              })()
            : new Date().toLocaleDateString('default', { month: 'long', year: 'numeric' });

        const selectedPropertyObj = arrProperty !== 'all' ? properties.find(p => p.id === arrProperty) : null;
        const propertyName = selectedPropertyObj ? selectedPropertyObj.name : "all properties";

        // Helper filter to check if invoice belongs to selected property
        const belongsToProperty = (inv: PMInvoice) => {
            if (arrProperty === 'all') return true;
            const unit = units.find(u => u.id === inv.unitId);
            return unit && unit.propertyId === arrProperty;
        };

        const periodArrearsInvoices = invoices.filter(inv => 
            inv.description.includes("Outstanding Arrears Adjustment") && 
            inv.description.includes(billingPeriodLabel) &&
            inv.status !== 'Paid' && inv.status !== 'Cancelled' &&
            belongsToProperty(inv)
        );

        const allArrearsInvoices = invoices.filter(inv => 
            inv.description.includes("Outstanding Arrears Adjustment") &&
            inv.status !== 'Paid' && inv.status !== 'Cancelled' &&
            belongsToProperty(inv)
        );

        if (allArrearsInvoices.length === 0) {
            return alert(`No outstanding arrears adjustment invoices found to remove for ${propertyName}.`);
        }

        const choice = window.confirm(
            `Found ${periodArrearsInvoices.length} arrears invoices for ${billingPeriodLabel} in ${propertyName}.\n` +
            `Click [OK] to delete ONLY these ${periodArrearsInvoices.length} invoices, or [Cancel] if you want to delete ALL ${allArrearsInvoices.length} arrears invoices for ${propertyName} across all periods.`
        );

        let targetInvoices = [];
        if (choice) {
            targetInvoices = periodArrearsInvoices;
        } else {
            if (window.confirm(`Delete ALL ${allArrearsInvoices.length} arrears adjustment invoices for ${propertyName} across all periods? This action cannot be undone.`)) {
                targetInvoices = allArrearsInvoices;
            } else {
                return;
            }
        }

        if (targetInvoices.length === 0) return;

        try {
            const deletedIds = new Set(targetInvoices.map(inv => inv.id));
            const idChunks = [];
            const ids = Array.from(deletedIds);
            for (let i = 0; i < ids.length; i += 20) {
                idChunks.push(ids.slice(i, i + 20));
            }

            for (const chunk of idChunks) {
                await apiService.deleteModuleRecord('pm_invoices', chunk.join(','));
            }

            alert(`Successfully deleted ${ids.length} arrears adjustment invoices for ${propertyName}.`);
            loadData();
        } catch (err: any) {
            alert(err.message || "Failed to delete arrears invoices.");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Advanced Filter Panel */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Advanced Arrears Filters</p>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Billing Period</label>
                        <input 
                            type="month"
                            value={arrPeriod}
                            onChange={(e) => setArrPeriod(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Search Tenant</label>
                        <input 
                            type="text"
                            placeholder="Search by name/unit..."
                            value={arrSearch}
                            onChange={(e) => setArrSearch(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Property</label>
                        <select 
                            value={arrProperty}
                            onChange={(e) => setArrProperty(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                        >
                            <option value="all">All Properties</option>
                            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Landlord</label>
                        <select 
                            value={arrLandlord}
                            onChange={(e) => setArrLandlord(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                        >
                            <option value="all">All Landlords</option>
                            {landlords.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-2 flex gap-2">
                        <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Min Arrears (KES)</label>
                            <input 
                                type="number"
                                placeholder="0"
                                value={arrMin}
                                onChange={(e) => setArrMin(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                            />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Max Arrears (KES)</label>
                            <input 
                                type="number"
                                placeholder="No Max"
                                value={arrMax}
                                onChange={(e) => setArrMax(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg flex justify-between items-center">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Outstanding Arrears</p>
                        <p className="text-2xl font-black text-rose-600 italic">KES {totalFilteredArrears.toLocaleString()}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg flex justify-between items-center">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tenants in Arrears</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white italic">{filteredArrears.filter(a => a.periodArrears > 0).length} Residents</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-lg flex flex-col sm:flex-row gap-2 items-center justify-stretch">
                    <button 
                        onClick={handleBulkReminderClick}
                        className="flex-grow w-full bg-emerald-600 hover:bg-emerald-750 text-white font-black uppercase tracking-widest text-[8px] py-4 rounded-xl shadow-lg transition-all"
                    >
                        SMS Reminders
                    </button>
                    <button 
                        onClick={handleExportPdf}
                        disabled={exporting}
                        className="flex-grow w-full bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[8px] py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1"
                    >
                        {exporting ? 'Exporting...' : 'Export PDF'}
                    </button>

                </div>
            </div>

            {/* Arrears List Table */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Arrears Analysis Ledger</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 font-bold border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tenant Name</th>
                                <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                                <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Asset Details</th>
                                <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Monthly Rent</th>
                                <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Rent Paid</th>
                                <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Rent Arrears</th>
                                <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredArrears.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No matching tenants found with arrears</td>
                                </tr>
                            ) : (
                                paginatedArrears.map(item => (
                                    <tr key={item.lease.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                        {/* Tenant Name */}
                                        <td className="p-5">
                                            <div className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{item.tenant?.name || '—'}</div>
                                            {item.tenant?.phoneNumber && (
                                                <div className="text-[9px] text-slate-400 font-bold mt-0.5">{item.tenant.phoneNumber}</div>
                                            )}
                                        </td>
                                        {/* Unit */}
                                        <td className="p-5">
                                            <div className="text-xs font-black text-blue-600 uppercase">{item.unit?.unitNumber || '—'}</div>
                                        </td>
                                        {/* Asset Details */}
                                        <td className="p-5">
                                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.property?.name}</div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase">Landlord: {item.landlord?.name || 'N/A'}</div>
                                        </td>
                                        <td className="p-5 text-xs font-bold text-slate-800 dark:text-white">KES {item.lease.rentAmount.toLocaleString()}</td>
                                        <td className="p-5 text-xs font-bold text-emerald-600">KES {item.paidRent.toLocaleString()}</td>
                                        <td className="p-5">
                                            <span className={`text-sm font-black italic ${item.periodArrears > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                KES {item.periodArrears.toLocaleString()}
                                            </span>
                                        </td>
                                         <td className="p-5 text-right flex justify-end gap-2">
                                             {item.periodArrears > 0 && (
                                                 <button 
                                                     disabled={sendingReminder === item.lease.id}
                                                     onClick={() => handleSendReminder(item)}
                                                     className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap"
                                                 >
                                                     {sendingReminder === item.lease.id ? "Sending..." : "SMS Reminder"}
                                                 </button>
                                             )}
                                         </td>
                                     </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 mt-4">
                        <span className="text-xs font-bold text-slate-400">
                            Showing {Math.min(filteredArrears.length, (arrCurrentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredArrears.length, arrCurrentPage * itemsPerPage)} of {filteredArrears.length} entries
                        </span>
                        <div className="flex gap-1 flex-wrap">
                            <button
                                disabled={arrCurrentPage === 1}
                                onClick={() => setArrCurrentPage(prev => Math.max(1, prev - 1))}
                                className="px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 font-bold rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent text-xs"
                            >
                                Prev
                            </button>
                            {Array.from({ length: totalPages }).map((_, idx) => {
                                const pageNum = idx + 1;
                                if (totalPages > 6 && pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - arrCurrentPage) > 1) {
                                    if (pageNum === 2 || pageNum === totalPages - 1) {
                                        return <span key={pageNum} className="px-2 text-slate-400 text-xs font-black self-center">...</span>;
                                    }
                                    return null;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setArrCurrentPage(pageNum)}
                                        className={`w-9 h-9 font-black text-xs rounded-xl transition-all ${
                                            arrCurrentPage === pageNum
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                disabled={arrCurrentPage === totalPages}
                                onClick={() => setArrCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                className="px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 font-bold rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent text-xs"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* SMS Reminders Preview Modal */}
            <Modal show={showSmsModal} onClose={() => setShowSmsModal(false)} title="Arrears SMS Reminders" maxWidth="max-w-xl">
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Base Message Template</p>
                        <p className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 text-slate-650 dark:text-slate-300 font-medium">
                            Dear <span className="font-bold text-slate-800 dark:text-white">[Tenant Name]</span>, you have outstanding rent arrears of <span className="font-bold text-slate-800 dark:text-white">KES [Arrears Amount]</span> for Unit <span className="font-bold text-slate-800 dark:text-white">[Unit Number]</span>. Please clear this balance.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Append Additional SMS Text</label>
                        <textarea
                            rows={3}
                            value={smsAdditionalText}
                            onChange={(e) => setSmsAdditionalText(e.target.value)}
                            placeholder="e.g. Please clear this by Friday evening to avoid penalties. Thank you."
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none dark:text-white focus:border-blue-500 transition-colors resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={includePaymentMethod} 
                                onChange={(e) => setIncludePaymentMethod(e.target.checked)} 
                                className="w-4.5 h-4.5 rounded text-blue-600 focus:ring-blue-500" 
                            />
                            <span className="text-xs font-bold text-slate-650 dark:text-slate-350">Include Landlord Payment Method/Details</span>
                        </label>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Preview (First 3 Recipients)</p>
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                            {filteredArrears.filter(item => item.periodArrears > 0 && item.tenant?.phoneNumber).slice(0, 3).map(item => (
                                <div key={item.lease.id} className="text-xs bg-slate-50 dark:bg-slate-805 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <span>{item.tenant?.name} ({item.unit?.unitNumber})</span>
                                        <span>{item.tenant?.phoneNumber}</span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-300 font-medium italic">
                                        {getSmsMessage(item)}
                                    </p>
                                </div>
                            ))}
                            {filteredArrears.filter(item => item.periodArrears > 0 && item.tenant?.phoneNumber).length > 3 && (
                                <p className="text-[10px] text-slate-400 italic text-center">
                                    ...and {filteredArrears.filter(item => item.periodArrears > 0 && item.tenant?.phoneNumber).length - 3} other tenants in arrears.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setShowSmsModal(false)}
                            className="flex-1 py-3.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 font-black uppercase tracking-widest text-[9px] rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSendBulkReminder}
                            disabled={sendingSms}
                            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-750 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg shadow-blue-500/20 transition-colors disabled:opacity-50"
                        >
                            {sendingSms ? "Sending..." : `Send ${filteredArrears.filter(item => item.periodArrears > 0 && item.tenant?.phoneNumber).length} Reminders`}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const TEMPLATE_PRESETS: Record<PMNoticeType, { subject: string; body: string }> = {
    'Vacate': {
        subject: 'Notice to Vacate Premise',
        body: 'Please be advised that you are required to vacate the premises at Unit [UNIT_NUMBER] of [PROPERTY_NAME] on or before [DATE] in accordance with the terms of your lease agreement. Please ensure all outstanding balances are cleared and the room is left in good condition.'
    },
    'Late Rent Warning': {
        subject: 'Demand Notice: Outstanding Rent Arrears',
        body: 'Our records indicate that your rent account for Unit [UNIT_NUMBER] is currently in arrears. You are requested to settle the outstanding balance immediately. Failure to comply may lead to lease termination or legal action.'
    },
    'Lease Non-Renewal': {
        subject: 'Notice of Lease Agreement Non-Renewal',
        body: 'Please note that your lease agreement for Unit [UNIT_NUMBER] expiring on [DATE] will not be renewed. You are expected to hand over the keys and vacate the property by the expiry date.'
    },
    'Custom Warning': {
        subject: 'Official Warning / Compliance Notice',
        body: 'This is an official notice to draw your attention to a violation of the tenancy rules in Unit [UNIT_NUMBER]. You are requested to rectify the situation immediately.'
    }
};

interface IssueNoticeModalProps {
    show: boolean;
    onClose: () => void;
    leases: PMLease[];
    tenants: PMTenant[];
    units: PMUnit[];
    properties: PMProperty[];
    onSave: (notice: Partial<PMNoticeLetter>) => Promise<void>;
}

const IssueNoticeModal: React.FC<IssueNoticeModalProps> = ({
    show, onClose, leases, tenants, units, properties, onSave
}) => {
    const [tenantSearchQuery, setTenantSearchQuery] = useState('');
    const [selectedLeaseId, setSelectedLeaseId] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [noticeType, setNoticeType] = useState<PMNoticeType>('Vacate');
    const [subject, setSubject] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');

    const activeLeases = leases.filter(l => l.status === 'Active');

    const filteredLeases = activeLeases.filter(lease => {
        const tenant = tenants.find(t => t.id === lease.tenantId);
        const unit = units.find(u => u.id === lease.unitId);
        const term = tenantSearchQuery.toLowerCase();
        return (tenant?.name.toLowerCase().includes(term) || unit?.unitNumber.toLowerCase().includes(term));
    });

    const handleSelectLease = (leaseId: string) => {
        setSelectedLeaseId(leaseId);
        setIsDropdownOpen(false);
        const lease = leases.find(l => l.id === leaseId);
        const tenant = tenants.find(t => t.id === lease?.tenantId);
        setTenantSearchQuery(tenant ? `${tenant.name} (Unit ${units.find(u => u.id === lease?.unitId)?.unitNumber || ''})` : '');
    };

    // Update body template based on selections
    useEffect(() => {
        const lease = leases.find(l => l.id === selectedLeaseId);
        const unit = units.find(u => u.id === lease?.unitId);
        const property = unit ? properties.find(p => p.id === unit.propertyId) : null;
        
        const preset = TEMPLATE_PRESETS[noticeType];
        if (preset) {
            const bodyText = preset.body
                .replace('[UNIT_NUMBER]', unit?.unitNumber || '_____')
                .replace('[PROPERTY_NAME]', property?.name || '_____')
                .replace('[DATE]', effectiveDate ? new Date(effectiveDate).toLocaleDateString() : '_____');
            
            setSubject(preset.subject);
            setMessageBody(bodyText);
        }
    }, [selectedLeaseId, noticeType, effectiveDate, leases, units, properties]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Issue Notice Letter</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-8 max-h-[70vh] overflow-y-auto">
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!selectedLeaseId) {
                            alert("Please search and select a tenant lease.");
                            return;
                        }
                        if (!effectiveDate) {
                            alert("Please select the effective compliance/vacate date.");
                            return;
                        }

                        const lease = leases.find(l => l.id === selectedLeaseId);

                        await onSave({
                            leaseId: selectedLeaseId,
                            tenantId: lease?.tenantId || '',
                            noticeType,
                            issueDate: new Date().toISOString().split('T')[0],
                            effectiveDate,
                            subject,
                            messageBody,
                            status: 'Issued'
                        });
                    }} className="space-y-6">
                        
                        {/* Tenant Search & Select Dropdown */}
                        <div className="relative">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Search Tenant / Unit</label>
                            <div className="relative">
                                <SearchIcon className="absolute left-4 top-4.5 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={tenantSearchQuery}
                                    onChange={(e) => {
                                        setTenantSearchQuery(e.target.value);
                                        setIsDropdownOpen(true);
                                        if (selectedLeaseId) setSelectedLeaseId('');
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    className="w-full bg-slate-50 dark:bg-slate-805 border-2 border-transparent focus:border-blue-500 rounded-2xl pl-12 pr-4 py-4 font-bold outline-none dark:text-white text-xs transition-colors"
                                    placeholder="Type Tenant Name or Unit Number..."
                                />
                            </div>

                            {isDropdownOpen && filteredLeases.length > 0 && (
                                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-805 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                                    {filteredLeases.map(lease => {
                                        const tenant = tenants.find(t => t.id === lease.tenantId);
                                        const unit = units.find(u => u.id === lease.unitId);
                                        const prop = unit ? properties.find(p => p.id === unit.propertyId) : null;
                                        return (
                                            <button
                                                key={lease.id}
                                                type="button"
                                                onClick={() => handleSelectLease(lease.id)}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex justify-between items-center transition-colors"
                                            >
                                                <div>
                                                    <p className="text-xs font-black text-slate-800 dark:text-white">{tenant?.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">{prop?.name} - Unit {unit?.unitNumber}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Notice Type</label>
                                <select 
                                    value={noticeType} 
                                    onChange={(e) => setNoticeType(e.target.value as PMNoticeType)}
                                    className="w-full bg-slate-50 dark:bg-slate-805 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs"
                                >
                                    <option value="Vacate">Notice to Vacate</option>
                                    <option value="Late Rent Warning">Late Rent Warning</option>
                                    <option value="Lease Non-Renewal">Lease Non-Renewal</option>
                                    <option value="Custom Warning">Custom Warning</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Effective Compliance Date</label>
                                <input 
                                    type="date"
                                    value={effectiveDate}
                                    onChange={(e) => setEffectiveDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-850 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Subject</label>
                            <input 
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-805 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs"
                                placeholder="Subject of the letter"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Message Body</label>
                            <textarea 
                                rows={6}
                                value={messageBody}
                                onChange={(e) => setMessageBody(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-805 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs"
                                placeholder="Write notice content here..."
                            />
                        </div>

                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 mt-4">
                            Generate & Send Notice
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};


interface LogUtilityModalProps {
    show: boolean;
    onClose: () => void;
    units: PMUnit[];
    properties: PMProperty[];
    leases: PMLease[];
    onSave: (data: Partial<PMUtilityReading>) => Promise<void>;
    utilityReadings: PMUtilityReading[];
}

const LogUtilityModal: React.FC<LogUtilityModalProps> = ({ show, onClose, units, properties, leases, onSave, utilityReadings }) => {
    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [utilityType, setUtilityType] = useState<'Water' | 'Electricity'>('Water');
    const [previousReading, setPreviousReading] = useState(0);
    const [currentReading, setCurrentReading] = useState('');
    const [ratePerUnit, setRatePerUnit] = useState('120'); // Default Water rate
    const [readingDate, setReadingDate] = useState(new Date().toISOString().split('T')[0]);

    // Filter units based on selected property
    const filteredUnits = units.filter(u => u.propertyId === selectedPropertyId);

    // Auto-fetch the previous reading when unit or type changes
    useEffect(() => {
        if (!selectedUnitId) {
            setPreviousReading(0);
            return;
        }
        // Find last reading for this unit and utility type
        const unitReadings = utilityReadings.filter(r => r.unitId === selectedUnitId && r.utilityType === utilityType);
        if (unitReadings.length > 0) {
            // Sort by date descending
            const sorted = [...unitReadings].sort((a, b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime());
            setPreviousReading(sorted[0].currentReading);
        } else {
            setPreviousReading(0);
        }
    }, [selectedUnitId, utilityType, utilityReadings]);

    // Update rate per unit default when type changes
    useEffect(() => {
        if (utilityType === 'Water') {
            setRatePerUnit('120');
        } else {
            setRatePerUnit('25');
        }
    }, [utilityType]);

    if (!show) return null;

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const curr = Number(currentReading);
        if (isNaN(curr) || curr < previousReading) {
            alert(`Current reading must be a valid number and greater than or equal to the previous reading (${previousReading}).`);
            return;
        }

        await onSave({
            propertyId: selectedPropertyId,
            unitId: selectedUnitId,
            utilityType,
            previousReading,
            currentReading: curr,
            ratePerUnit: Number(ratePerUnit),
            readingDate
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-blue-50/50 dark:bg-blue-900/10">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Log Utility Reading</h3>
                        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">Record sub-meter electricity or water readings</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 max-h-[80vh] overflow-y-auto">
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Select Property</label>
                            <select
                                required
                                value={selectedPropertyId}
                                onChange={(e) => {
                                    setSelectedPropertyId(e.target.value);
                                    setSelectedUnitId('');
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-805 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs"
                            >
                                <option value="">-- Choose Property --</option>
                                {properties.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Select Unit</label>
                            <select
                                required
                                disabled={!selectedPropertyId}
                                value={selectedUnitId}
                                onChange={(e) => setSelectedUnitId(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-805 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs disabled:opacity-50"
                            >
                                <option value="">-- Choose Unit --</option>
                                {filteredUnits.map(u => (
                                    <option key={u.id} value={u.id}>Unit {u.unitNumber} ({u.status})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Utility Type</label>
                                <select
                                    value={utilityType}
                                    onChange={(e) => setUtilityType(e.target.value as any)}
                                    className="w-full bg-slate-50 dark:bg-slate-805 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs"
                                >
                                    <option value="Water">Water (m³)</option>
                                    <option value="Electricity">Electricity (kWh)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Reading Date</label>
                                <input
                                    required
                                    type="date"
                                    value={readingDate}
                                    onChange={(e) => setReadingDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-805 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Prev Reading</label>
                                <input
                                    type="number"
                                    disabled
                                    value={previousReading}
                                    className="w-full bg-slate-100 dark:bg-slate-900 border-2 border-transparent rounded-2xl p-4 font-black text-slate-500 text-xs text-center"
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Current Reading</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={currentReading}
                                    onChange={(e) => setCurrentReading(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-805 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs"
                                    placeholder="Enter current reading"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Rate per Unit (KES)</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={ratePerUnit}
                                    onChange={(e) => setRatePerUnit(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-805 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Estimated Cost</label>
                                <div className="w-full bg-blue-50 dark:bg-blue-955/20 border-2 border-transparent rounded-2xl p-4 font-black text-blue-600 text-sm text-center">
                                    KES {((Number(currentReading || previousReading) - previousReading) * Number(ratePerUnit || 0)).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 mt-4">
                            Save Reading & Log
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};


interface RenewLeaseModalProps {
    show: boolean;
    onClose: () => void;
    lease: PMLease;
    tenants: PMTenant[];
    units: PMUnit[];
    properties: PMProperty[];
    onSave: (data: { leaseId: string; endDate: string; newRent: number; escalationPercentage: number }) => Promise<void>;
}

const RenewLeaseModal: React.FC<RenewLeaseModalProps> = ({ show, onClose, lease, tenants, units, properties, onSave }) => {
    const tenant = tenants.find(t => t.id === lease.tenantId);
    const unit = units.find(u => u.id === lease.unitId);
    const property = unit ? properties.find(p => p.id === unit.propertyId) : null;

    const currentRent = lease.rentAmount || 0;
    const [escalationPercentage, setEscalationPercentage] = useState('10');
    const [newRent, setNewRent] = useState((currentRent * 1.1).toFixed(2));
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().split('T')[0];
    });

    // Auto-calculate new rent when escalation percentage changes
    useEffect(() => {
        const percentage = Number(escalationPercentage);
        if (!isNaN(percentage)) {
            setNewRent((currentRent * (1 + percentage / 100)).toFixed(2));
        }
    }, [escalationPercentage, currentRent]);

    if (!show) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const rent = Number(newRent);
        const escalation = Number(escalationPercentage);
        if (isNaN(rent) || rent <= 0) {
            alert("Please enter a valid rent amount.");
            return;
        }
        if (!endDate) {
            alert("Please select a new lease end date.");
            return;
        }

        await onSave({
            leaseId: lease.id,
            endDate,
            newRent: rent,
            escalationPercentage: isNaN(escalation) ? 0 : escalation
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-rose-50/50 dark:bg-rose-900/10">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Renew Lease Agreement</h3>
                        <p className="text-[10px] text-rose-600 font-bold uppercase tracking-widest mt-1">Configure Rent Escalation and Occupancy Terms</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 max-h-[80vh] overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Tenant Name</label>
                                <input
                                    type="text"
                                    disabled
                                    value={tenant?.name || 'N/A'}
                                    className="w-full bg-slate-100 dark:bg-slate-900 border-2 border-transparent rounded-2xl p-4 font-bold text-slate-500 text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Unit / Asset</label>
                                <input
                                    type="text"
                                    disabled
                                    value={property?.name && unit?.unitNumber ? `${property.name} - Unit ${unit.unitNumber}` : 'N/A'}
                                    className="w-full bg-slate-100 dark:bg-slate-900 border-2 border-transparent rounded-2xl p-4 font-bold text-slate-500 text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Current Monthly Rent</label>
                                <div className="w-full bg-slate-100 dark:bg-slate-900 border-2 border-transparent rounded-2xl p-4 font-black text-slate-500 text-sm">
                                    KES {currentRent.toLocaleString()}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Escalation Percentage (%)</label>
                                <input
                                    required
                                    type="number"
                                    step="0.1"
                                    value={escalationPercentage}
                                    onChange={(e) => setEscalationPercentage(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-805 border-2 border-transparent focus:border-rose-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs"
                                    placeholder="e.g. 10"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">New Monthly Rent (KES)</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={newRent}
                                    onChange={(e) => setNewRent(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-805 border-2 border-transparent focus:border-rose-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">New Lease End Date</label>
                                <input
                                    required
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-805 border-2 border-transparent focus:border-rose-500 rounded-2xl p-4 font-bold outline-none dark:text-white text-xs"
                                />
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-500/20 mt-4">
                            Renew Agreement
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};


