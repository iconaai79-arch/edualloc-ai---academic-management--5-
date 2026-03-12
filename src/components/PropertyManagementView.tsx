import React, { useState, useEffect, useMemo } from 'react';
import {
    User, Institution, PMProperty, PMUnit, PMTenant, PMLease, PMPayment, PMTicket,
    PMPropertyType, PMUnitStatus, PMLeaseStatus, PMPaymentMethod, PMPaymentType,
    PMPriority, PMTicketStatus, PMLandlord, PMDisbursement, PMInquiry, PMInquiryStatus,
    CompanyDetails, PMInvoice, PMInvoiceStatus
} from '../types';
import { apiService } from '../services/apiService';
import {
    PlusIcon, XIcon, CheckCircleIcon, SparklesIcon, UserGroupIcon,
    ChartBarIcon, Cog8ToothIcon, ArchiveBoxIcon, UserIcon, ArrowPathIcon,
    ClockIcon, CurrencyIcon, ChartPieIcon, TrashIcon, EyeIcon, SearchIcon,
    HomeIcon, GridIcon, ListIcon, CreditCardIcon, AlertTriangleIcon,
    TrendingUpIcon, BuildingOfficeIcon, UserPlusIcon, MapPinIcon, ShoppingCartIcon,
    MpesaIcon, BanknotesIcon, PencilIcon, CalendarDaysIcon as CalendarIcon,
    PaperAirplaneIcon, DownloadIcon, ChatBubbleBottomCenterTextIcon, ChatBubbleLeftRightIcon, SettingsIcon,
    DocumentTextIcon
} from './icons/index';
import * as pdfService from '../services/pdfService';
import { sendEmailNotification, getInstitutionEmailConfig } from '../services/emailService';
import { PdfPreviewModal } from './PdfPreviewModal';
import { CommunicationsManager } from './CommunicationsManager';
import PMConfigManager from './PMConfigManager';
import { UserManager } from './UserManager';

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
    currentUser: User;
    currentInstitution: Institution;
    companyDetails: CompanyDetails;
    users: User[];
    onDataChange: () => void;
}

export const PropertyManagementView: React.FC<PropertyManagementViewProps> = ({ currentUser, currentInstitution, companyDetails, users, onDataChange }) => {
    const institutionId = currentInstitution.id;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'properties' | 'landlords' | 'tenants' | 'payouts' | 'reports' | 'listings' | 'comms' | 'inquiries' | 'staff' | 'config'>('dashboard');
    const [propertyActiveSubTab, setPropertyActiveSubTab] = useState<'properties' | 'units' | 'landlords' | 'tenants' | 'leases' | 'payments' | 'maintenance' | 'invoices'>('properties');
    const [reportsSubTab, setReportsSubTab] = useState<'analytics' | 'statements'>('analytics');

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
    const [loading, setLoading] = useState(true);

    // Modals
    const [showLandlordModal, setShowLandlordModal] = useState(false);
    const [showPropertyModal, setShowPropertyModal] = useState(false);
    const [showUnitModal, setShowUnitModal] = useState(false);
    const [showTenantModal, setShowTenantModal] = useState(false);
    const [showLeaseModal, setShowLeaseModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [showListingModal, setShowListingModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showBankModal, setShowBankModal] = useState(false);
    const [selectedTenantForBankAction, setSelectedTenantForBankAction] = useState<PMTenant | null>(null);
    const [newListingImages, setNewListingImages] = useState<string[]>([]);
    const [selectedLeaseForPreview, setSelectedLeaseForPreview] = useState<PMLease | null>(null);
    const [editingProperty, setEditingProperty] = useState<PMProperty | null>(null);
    const [editingUnit, setEditingUnit] = useState<PMUnit | null>(null);

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
                apiService.fetchModuleRecords<PMInvoice>('pm_invoices', institutionId)
            ]);
            
            const [ls, ps, un, tn, le, py, tk, ds, lts, inq, inv] = results as any[];

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
            onDataChange();
        } catch (error) {
            console.error("Failed to load PM data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [institutionId]);

    // Derived Stats
    const totalRentCollected = payments.filter(p => p.paymentType === 'Rent').reduce((sum, p) => sum + p.amount, 0);
    const totalCommissionEarned = payments.reduce((sum, p) => sum + (p.commissionAmount || 0), 0);
    const activeLeases = leases.filter(l => l.status === 'Active');
    const vacantUnits = units.filter(u => u.status === 'Vacant');
    const openTickets = tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');

    const handleSaveLandlord = async (data: Partial<PMLandlord>) => {
        try {
            const landlordId = `ll_${Date.now()}`;

            // 1. Create the system user account if email is provided
            if (data.email) {
                const tempPassword = Math.random().toString(36).slice(-8);
                const newUser = {
                    id: `user_${Date.now()}`,
                    name: data.name || '',
                    email: data.email,
                    phoneNumber: data.phoneNumber || '',
                    role: 'landlord',
                    institutionId,
                    createdAt: new Date().toISOString(),
                    isActive: true,
                    mustChangePassword: true,
                    password: tempPassword
                };
                await apiService.saveModuleRecord('users', newUser);

                // 2. Send email with credentials
                try {
                    const subject = 'Welcome to your Landlord Portal';
                    const body = `Welcome, ${data.name}!\n\nYou have been registered as a Landlord in the system.\nYou can now log in to view your properties, track tenant payments, and monitor your commission payouts.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nEmail: ${data.email}\nPassword: ${tempPassword}\n\nPlease change your password upon first login.\n\nBest Regards,\nSystem Admin`;
                    await apiService.sendEmail(data.email, subject, body, getInstitutionEmailConfig(currentInstitution, currentInstitution.emailConfig));
                } catch (emailErr) {
                    console.error("Failed to send landlord welcome email:", emailErr);
                }
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
                institutionId,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_landlords', newLandlord);

            setShowLandlordModal(false);
            loadData();

            if (data.email) {
                alert(`Landlord saved! Login credentials have been emailed to ${data.email}`);
            } else {
                alert("Landlord saved! (No email provided, so no portal access created)");
            }
        } catch (e: any) { alert(e.message || "Failed to save landlord"); console.error(e); }
    };

    const handleSaveProperty = async (data: Partial<PMProperty>) => {
        try {
            const propertyData: PMProperty = {
                id: editingProperty?.id || `prop_${Date.now()}`,
                name: data.name || '',
                address: data.address,
                propertyType: data.propertyType || 'Apartment',
                totalUnits: editingProperty?.totalUnits || 0,
                landlordId: data.landlordId,
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
            const tenantId = `tenant_${Date.now()}`;

            // 1. Create system user account for the tenant if email is provided
            if (data.email) {
                const tempPassword = Math.random().toString(36).slice(-8);
                const newUser = {
                    id: `user_${Date.now()}`,
                    name: data.name || '',
                    email: data.email,
                    phoneNumber: data.phoneNumber || '',
                    role: 'tenant',
                    institutionId,
                    createdAt: new Date().toISOString(),
                    isActive: true,
                    mustChangePassword: true,
                    password: tempPassword
                };
                await apiService.saveModuleRecord('users', newUser);

                // 2. Send tenant welcome email
                try {
                    const subject = 'Welcome to your Tenant Portal';
                    const body = `Welcome, ${data.name}!\n\nYou have been registered as a Tenant in our property management system.\nYou can now log in to view your lease agreement, track your rent payments, and raise maintenance requests.\n\nLogin Credentials:\nPortal: ${window.location.origin}\nEmail: ${data.email}\nPassword: ${tempPassword}\n\nPlease change your password upon first login.\n\nBest Regards,\nSystem Admin`;
                    await apiService.sendEmail(data.email, subject, body, getInstitutionEmailConfig(currentInstitution, currentInstitution.emailConfig));
                } catch (emailErr) {
                    console.error("Failed to send tenant welcome email:", emailErr);
                }
            }

            const newTenant: PMTenant = {
                id: tenantId,
                name: data.name || '',
                phoneNumber: data.phoneNumber || '',
                email: data.email,
                idNumber: data.idNumber,
                emergencyContactName: data.emergencyContactName,
                emergencyContactPhone: data.emergencyContactPhone,
                institutionId,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_tenants', newTenant);

            setShowTenantModal(false);
            loadData();

            if (data.email) {
                alert(`Tenant saved! Login credentials have been emailed to ${data.email}`);
            } else {
                alert("Tenant saved! (No email provided, no portal access created)");
            }
        } catch (e: any) { alert(e.message || "Failed to save tenant"); console.error(e); }
    };

    const handleSaveLease = async (data: Partial<PMLease>) => {
        try {
            const startDate = new Date().toISOString().split('T')[0];
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
                institutionId,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_leases', newLease);

            // Update unit status to Occupied
            const unit = units.find(u => u.id === data.unitId);
            if (unit) {
                await apiService.saveModuleRecord('pm_units', { ...unit, status: 'Occupied' });
            }

            setShowLeaseModal(false);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to save lease"); console.error(e); }
    };

    const LandlordsTab = () => (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 mt-4">
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
                            {landlords.map(landlord => {
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
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-700/50">
                    {landlords.map(landlord => {
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
                                        </div>
                                    </div>
                                    <button className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500"><EyeIcon className="w-4 h-4" /></button>
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
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

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

            {propertyActiveSubTab === 'properties' && (
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
                                {properties.map(property => {
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
                                                <button onClick={() => { setEditingProperty(property); setShowPropertyModal(true); }} className="p-2.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-xl transition-all"><PencilIcon className="w-4 h-4" /></button>
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
                        {properties.map(property => {
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
                                            <button onClick={() => { setEditingProperty(property); setShowPropertyModal(true); }} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500"><PencilIcon className="w-4 h-4" /></button>
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
                                    </div>
                                </div>
                            );
                        })}
                        {properties.length === 0 && (
                            <div className="p-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] italic">No Master Assets Found</div>
                        )}
                    </div>
                </div>
            )}

            {propertyActiveSubTab === 'units' && (
                <div className="mt-4">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Master Unit Registry</h3>
                        <div className="relative w-full md:w-auto">
                            <SearchIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="SEARCH BY UNIT..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-all w-full md:w-72"
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
                                    {units.filter(u => !search || u.unitNumber.toUpperCase().includes(search.toUpperCase())).map(unit => (
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
                                            <td className="p-6 text-lg font-black text-slate-900 dark:text-white italic">{unit.rentAmount.toLocaleString()}</td>
                                            <td className="p-6">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic ${unit.status === 'Vacant' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : unit.status === 'Occupied' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'}`}>{unit.status}</span>
                                            </td>
                                            <td className="p-6 text-right space-x-2">
                                                <button onClick={() => { setEditingUnit(unit); setShowUnitModal(true); }} className="p-2.5 text-slate-400 hover:text-orange-600 rounded-xl transition-colors"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteUnit(unit.id)} className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-700/50">
                            {units.filter(u => !search || u.unitNumber.toUpperCase().includes(search.toUpperCase())).map(unit => (
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
                                            <p className="text-xs font-black text-slate-900 dark:text-white mt-2 italic whitespace-nowrap">KES {unit.rentAmount.toLocaleString()}</p>
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
                        </div>
                    </div>
                </div>
            )}

            {propertyActiveSubTab === 'landlords' && <LandlordsTab />}
            {propertyActiveSubTab === 'tenants' && <TenantsTab />}
            {propertyActiveSubTab === 'leases' && <LeasesTab />}
            {propertyActiveSubTab === 'payments' && <PaymentsTab />}
            {propertyActiveSubTab === 'maintenance' && <MaintenanceTab />}
            {propertyActiveSubTab === 'invoices' && <InvoicesTab />}
        </div>
    );

    const TenantsTab = () => (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Active Tenants</h3>
                <div className="relative w-full md:w-auto">
                    <SearchIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="SEARCH TENANTS..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-all w-full md:w-72"
                    />
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
                            {tenants.filter(t => !search || t.name.toUpperCase().includes(search.toUpperCase())).map(tenant => (
                                <tr key={tenant.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                    <td className="p-6 font-black text-slate-900 dark:text-white uppercase italic">{tenant.name}</td>
                                    <td className="p-6">
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{tenant.phoneNumber}</p>
                                        <p className="text-[10px] text-slate-400">{tenant.email || 'No email'}</p>
                                    </td>
                                    <td className="p-6 text-sm font-bold text-slate-500">{tenant.idNumber || '---'}</td>
                                    <td className="p-6 text-xs text-slate-400 font-bold">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                                    <td className="p-6 text-right space-x-2">
                                        <button onClick={() => { setSelectedTenantForBankAction(tenant); setShowBankModal(true); }} className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl hover:scale-105 transition-all" title="Bank Integration"><MpesaIcon className="w-4 h-4" /></button>
                                        <button className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-xl hover:text-blue-600 transition-colors"><EyeIcon className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-700/50">
                    {tenants.filter(t => !search || t.name.toUpperCase().includes(search.toUpperCase())).map(tenant => (
                        <div key={tenant.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{tenant.name}</h4>
                                    <p className="text-xs font-bold text-slate-500 mt-1">{tenant.phoneNumber}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{tenant.idNumber || 'NO ID PROVIDED'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setSelectedTenantForBankAction(tenant); setShowBankModal(true); }} className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl"><MpesaIcon className="w-5 h-5" /></button>
                                    <button className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400"><EyeIcon className="w-5 h-5" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const BankActionModal = () => {
        if (!selectedTenantForBankAction) return null;
        const [amount, setAmount] = useState('');
        const [paymentType, setPaymentType] = useState<string>('Rent');
        const [processing, setProcessing] = useState(false);

        const handleInitiatePayment = async () => {
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

        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-600/10 rounded-2xl text-emerald-600">
                                <MpesaIcon className="w-6 h-6" />
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
                                    className="w-full bg-slate-100 dark:bg-slate-900/50 border-2 border-transparent focus:border-emerald-500 rounded-2xl p-4 text-xl font-black italic outline-none transition-all dark:text-white"
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

    const LeasesTab = () => (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Lease Agreement Registry</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Manage tenant contracts and occupancy terms</p>
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
                            {leases.map(lease => {
                                const tenant = tenants.find(t => t.id === lease.tenantId);
                                const unit = units.find(u => u.id === lease.unitId);
                                return (
                                    <tr key={lease.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-6 font-mono text-xs font-black text-slate-400 uppercase">#{lease.id.split('_')[1]}</td>
                                        <td className="p-6 font-black text-slate-900 dark:text-white uppercase italic">{tenant?.name || 'N/A'}</td>
                                        <td className="p-6 text-sm font-bold text-slate-500">UNIT {unit?.unitNumber || 'N/A'}</td>
                                        <td className="p-6 text-lg font-black text-slate-900 dark:text-white italic">KES {lease.rentAmount.toLocaleString()}</td>
                                        <td className="p-6">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic ${lease.status === 'Active' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'} `}>
                                                {lease.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <button
                                                onClick={() => setSelectedLeaseForPreview(lease)}
                                                className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-800 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ml-auto"
                                            >
                                                <EyeIcon className="w-4 h-4" /> Agreement
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-700/50">
                    {leases.map(lease => {
                        const tenant = tenants.find(t => t.id === lease.tenantId);
                        const unit = units.find(u => u.id === lease.unitId);
                        return (
                            <div key={lease.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-mono font-black text-slate-400 uppercase">#{lease.id.split('_')[1]}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${lease.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{lease.status}</span>
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{tenant?.name || 'N/A'}</h4>
                                        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest italic">Unit {unit?.unitNumber || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-slate-900 dark:text-white italic">KES {lease.rentAmount.toLocaleString()}</p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Monthly Rent</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => setSelectedLeaseForPreview(lease)}
                                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                                    >
                                        <EyeIcon className="w-4 h-4" /> View Agreement
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const handleSavePayment = async (data: Partial<PMPayment>) => {
        try {
            // Calculate Commission
            let commissionAmount = 0;
            const amount = data.amount || 0;
            const paymentType = data.paymentType || 'Rent';

            if (paymentType === 'Rent' && data.leaseId) {
                const lease = leases.find(l => l.id === data.leaseId);
                if (lease) {
                    const unit = units.find(u => u.id === lease.unitId);
                    if (unit) {
                        const property = properties.find(p => p.id === unit.propertyId);
                        if (property && property.commissionRate && property.commissionRate > 0) {
                            commissionAmount = (amount * property.commissionRate) / 100;
                        }
                    }
                }
            }

            const newPayment: PMPayment = {
                id: `pay_${Date.now()} `,
                leaseId: data.leaseId || '',
                amount,
                paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
                paymentMethod: data.paymentMethod || 'M-Pesa',
                paymentType,
                status: 'Completed',
                commissionAmount,
                institutionId,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_payments', p);

            // Automated Receipt Generation
            if (confirm("Payment recorded. Would you like to generate a receipt?")) {
                const lease = leases.find(l => l.id === p.leaseId);
                const tenant = tenants.find(t => t.id === lease?.tenantId);
                const unit = units.find(u => u.id === lease?.unitId);
                if (tenant && unit) {
                    try {
                        const dataUri = await pdfService.generatePMReceiptPdfDataUri(
                            p, tenant, unit, currentInstitution, companyDetails, currentInstitution.logoUrl || null
                        );
                        setPreviewPdfUrl(dataUri);
                        setPreviewPdfTitle(`Receipt - ${tenant.name}`);
                        setShowPdfPreview(true);
                    } catch (pdfErr) { console.error("PDF Fail:", pdfErr); }
                }
            }

            setShowPaymentModal(false);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to save payment"); }
    };

    const handleSaveInvoice = async (data: Partial<PMInvoice>) => {
        try {
            const newInvoice: PMInvoice = {
                id: `inv_${Date.now()}`,
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                leaseId: data.leaseId || '',
                tenantId: data.tenantId || '',
                unitId: data.unitId || '',
                description: data.description || '',
                amount: data.amount || 0,
                issueDate: data.issueDate || new Date().toISOString().split('T')[0],
                dueDate: data.dueDate || '',
                status: 'Sent',
                institutionId,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_invoices', newInvoice);
            setShowInvoiceModal(false);
            loadData();
        } catch (e: any) { alert(e.message || "Failed to save invoice"); }
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

    const PaymentsTab = () => (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Collection Ledger</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Real-time financial tracking</p>
                    </div>
                </div>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction ID</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lease Ref</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(payment => {
                                const lease = leases.find(l => l.id === payment.leaseId);
                                const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : null;
                                return (
                                    <tr key={payment.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-6 font-mono text-xs font-bold text-slate-400">#{payment.id.split('_')[1]}</td>
                                        <td className="p-6">
                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">{tenant?.name || 'N/A'}</p>
                                            <p className="text-[9px] text-blue-600 font-bold uppercase">{payment.paymentType}</p>
                                        </td>
                                        <td className="p-6 text-lg font-black text-slate-900 dark:text-white italic">KES {payment.amount.toLocaleString()}</td>
                                        <td className="p-6 font-bold text-slate-500 uppercase text-[10px]">{payment.paymentMethod}</td>
                                        <td className="p-6 text-xs font-bold text-slate-500 uppercase">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                        <td className="p-6 text-right">
                                            <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic">Success</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-50 dark:divide-slate-700/50">
                    {payments.map(payment => {
                        const lease = leases.find(l => l.id === payment.leaseId);
                        const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : null;
                        return (
                            <div key={payment.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-mono font-bold text-slate-400">#{payment.id.split('_')[1]}</span>
                                        <span className="bg-emerald-50 text-emerald-600 text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase">Success</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(payment.paymentDate).toLocaleDateString()}</p>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase italic">{tenant?.name || 'N/A'}</h4>
                                        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{payment.paymentType}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900 dark:text-white italic">KES {payment.amount.toLocaleString()}</p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{payment.paymentMethod}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const InvoicesTab = () => {
        const [search, setSearch] = useState('');
        const filteredInvoices = invoices.filter(inv => {
            const tenant = tenants.find(t => t.id === inv.tenantId);
            return inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
                   tenant?.name.toLowerCase().includes(search.toLowerCase());
        });

        const handleDownload = async (inv: PMInvoice) => {
            const tenant = tenants.find(t => t.id === inv.tenantId);
            const unit = units.find(u => u.id === inv.unitId);
            if (!tenant || !unit) return alert("Tenant or Unit data missing.");

            try {
                const dataUri = await pdfService.generatePMInvoicePdfDataUri(
                    inv, tenant, unit, currentInstitution, companyDetails, currentInstitution.logoUrl || null
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

            try {
                const dataUri = await pdfService.generatePMInvoicePdfDataUri(
                    inv, tenant, unit, currentInstitution, companyDetails, currentInstitution.logoUrl || null
                );
                const blob = dataURItoBlob(dataUri);
                const fileName = `pm/invoices/${inv.invoiceNumber}.pdf`;
                const publicUrl = await apiService.uploadBlob(fileName, blob);
                
                if (tenant.phoneNumber) {
                    const msg = `Dear ${tenant.name}, your rent invoice #${inv.invoiceNumber} for KES ${inv.amount.toLocaleString()} is ready. View here: ${publicUrl}`;
                    await apiService.sendSms(tenant.phoneNumber, msg, currentInstitution.smsConfig, 1, institutionId);
                    alert("Invoice link sent via SMS!");
                }
            } catch (err) { alert("Failed to send invoice."); }
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm gap-4 items-center">
                    <SearchIcon className="w-5 h-5 text-slate-400 ml-2" />
                    <input 
                        type="search" 
                        placeholder="Search invoices by number or tenant name..."
                        className="flex-1 bg-transparent font-bold outline-none text-sm dark:text-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredInvoices.map(inv => {
                        const tenant = tenants.find(t => t.id === inv.tenantId);
                        const unit = units.find(u => u.id === inv.unitId);
                        return (
                            <div key={inv.id} className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Invoice #{inv.invoiceNumber}</h4>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{tenant?.name}</h3>
                                        <p className="text-xs font-bold text-blue-600 uppercase tracking-tight">{unit?.unitNumber}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' :
                                        inv.status === 'Overdue' ? 'bg-rose-100 text-rose-600' :
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                        {inv.status}
                                    </span>
                                </div>
                                
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-[11px] font-bold">
                                        <span className="text-slate-400 uppercase">Amount</span>
                                        <span className="text-slate-900 dark:text-white uppercase italic">KES {inv.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] font-bold">
                                        <span className="text-slate-400 uppercase">Due Date</span>
                                        <span className="text-slate-900 dark:text-white uppercase italic">{new Date(inv.dueDate).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 transition-opacity">
                                    <button onClick={() => handleDownload(inv)} title="Download" className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 hover:bg-blue-600 hover:text-white transition-all">
                                        <DownloadIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleSend(inv)} title="Send via SMS" className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 hover:bg-emerald-600 hover:text-white transition-all">
                                        <PaperAirplaneIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={async () => {
                                        if (confirm("Delete this invoice?")) {
                                            await apiService.deleteModuleRecord('pm_invoices', inv.id);
                                            loadData();
                                        }
                                    }} title="Delete" className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 hover:bg-rose-600 hover:text-white transition-all ml-auto">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
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
                                <p className="text-sm font-black text-slate-900 dark:text-white italic">KES {(ticket.cost || 0).toLocaleString()}</p>
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
                                        <td className="p-6 text-lg font-black text-slate-900 dark:text-white italic">KES {d.amount.toLocaleString()}</td>
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
                                                        if (!confirm(`Mark KES ${d.amount.toLocaleString()} as paid? This will update associated payment records.`)) return;
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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (newListingImages.length + files.length > 5) {
            alert('You can only upload up to 5 images per listing.');
            return;
        }

        for (const file of files) {
            if (file.size > 2 * 1024 * 1024) {
                alert(`File ${file.name} is larger than 2MB.`);
                continue;
            }

            try {
                const timestamp = Date.now();
                const ext = file.name.split('.').pop() || 'jpg';
                const path = `marketplace/${institutionId}/listings/${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;

                const publicUrl = await apiService.uploadFile('eduai', path, file);
                if (publicUrl) {
                    setNewListingImages(prev => {
                        const next = [...prev, publicUrl];
                        return next.slice(0, 5);
                    });
                }
            } catch (err) {
                console.error("Marketplace image upload error:", err);
                alert(`Failed to upload ${file.name}`);
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
                                <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                    <HomeIcon className="w-12 h-12 mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No Preview Image</p>
                                </div>
                            )}
                            <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg">
                                <p className="text-sm font-black text-slate-900 dark:text-white italic">KES {listing.price?.toLocaleString()}</p>
                            </div>
                            <span className={`absolute bottom-4 left-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest italic shadow-sm ${listing.status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
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

    const StatementsManager = () => {
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

            if (targetType === 'tenant') {
                const tenantLeases = leases.filter(l => l.tenantId === targetId);
                tenantLeases.forEach(lease => {
                    // Generate monthly debits (Rent Due)
                    let curr = new Date(lease.startDate);
                    const endDateObj = new Date(endDate);
                    while (curr <= endDateObj) {
                        const dateStr = curr.toISOString().split('T')[0];
                        allTx.push({
                            id: `debit_${lease.id}_${dateStr}`,
                            date: dateStr,
                            description: `Rent Due - ${curr.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                            type: 'debit',
                            amount: lease.rentAmount,
                            ref: `L-${lease.id.split('_')[1]}`
                        });
                        curr.setMonth(curr.getMonth() + 1);
                    }
                });

                payments.forEach(p => {
                    const lease = leases.find(l => l.id === p.leaseId);
                    if (lease?.tenantId === targetId) {
                        allTx.push({
                            id: p.id,
                            date: p.paymentDate,
                            description: `Payment - ${p.paymentType} (${p.paymentMethod})`,
                            type: 'credit',
                            amount: p.amount,
                            ref: p.id.split('_')[1]
                        });
                    }
                });
            } else {
                // Landlord Logic: Collections vs Management Fees
                const landlordProperties = properties.filter(p => p.landlordId === targetId);
                const propertyIds = landlordProperties.map(p => p.id);
                const landlordUnits = units.filter(u => propertyIds.includes(u.propertyId));
                const unitIds = landlordUnits.map(u => u.id);
                const landlordLeases = leases.filter(l => unitIds.includes(l.unitId));

                payments.forEach(p => {
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
                if (targetType === 'tenant') {
                    const tenant = tenants.find(t => t.id === targetId);
                    if (!tenant) return;
                    title = `Tenant Statement - ${tenant.name}`;
                    dataUri = await pdfService.generateTenantStatementPdf(
                        tenant, payments, leases, units, startDate, endDate, 
                        currentInstitution, currentInstitution.letterheadConfig, 
                        currentInstitution.logoUrl || null
                    );
                } else {
                    const landlord = landlords.find(l => l.id === targetId);
                    if (!landlord) return;
                    title = `Landlord Statement - ${landlord.name}`;
                    dataUri = await pdfService.generateLandlordStatementPdf(
                        landlord, payments, leases, units, properties, startDate, endDate, 
                        currentInstitution, currentInstitution.letterheadConfig, 
                        currentInstitution.logoUrl || null
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
                if (targetType === 'tenant') {
                    dataUri = await pdfService.generateTenantStatementPdf(
                        entity as PMTenant, payments, leases, units, startDate, endDate, 
                        currentInstitution, currentInstitution.letterheadConfig, 
                        currentInstitution.logoUrl || null
                    );
                } else {
                    dataUri = await pdfService.generateLandlordStatementPdf(
                        entity as PMLandlord, payments, leases, units, properties, startDate, endDate, 
                        currentInstitution, currentInstitution.letterheadConfig, 
                        currentInstitution.logoUrl || null
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
                        const publicUrl = await apiService.uploadBlob(fileName, blob);
                        const smsMessage = `Dear ${entity.name}, your ${targetType} statement for ${startDate} to ${endDate} is ready. Download here: ${publicUrl}`;
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
                        if (targetType === 'tenant') {
                            dataUri = await pdfService.generateTenantStatementPdf(
                                entity as PMTenant, payments, leases, units, startDate, endDate, 
                                currentInstitution, currentInstitution.letterheadConfig, 
                                currentInstitution.logoUrl || null
                            );
                        } else {
                            dataUri = await pdfService.generateLandlordStatementPdf(
                                entity as PMLandlord, payments, leases, units, properties, startDate, endDate, 
                                currentInstitution, currentInstitution.letterheadConfig, 
                                currentInstitution.logoUrl || null
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
                                const publicUrl = await apiService.uploadBlob(fileName, blob);
                                
                                const smsMessage = `Dear ${entity.name}, your ${targetType} statement for ${startDate} to ${endDate} is ready. Download here: ${publicUrl}`;
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
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl pl-10 pr-4 py-4 font-bold outline-none transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select {targetType === 'tenant' ? 'Tenant' : 'Landlord'}</label>
                            <select 
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
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
                                        Opening Bal: KES {openingBal.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            {targetId && (
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">{targetType === 'tenant' ? 'Closing Balance' : 'Net Collections'}</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white italic">KES {totals.balance.toLocaleString()}</p>
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
                                                <td className="p-6 text-right text-sm font-black text-slate-400">KES {openingBal.toLocaleString()}</td>
                                            </tr>
                                            {transactions.map(t => (
                                                <tr key={t.id} className="border-b border-slate-50 dark:border-slate-700/50">
                                                    <td className="p-6 text-[10px] font-bold text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                                                    <td className="p-6">
                                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase italic">{t.description}</p>
                                                        {t.commission > 0 && <p className="text-[9px] text-purple-600 font-bold uppercase">Mgt Fee: KES {t.commission.toLocaleString()}</p>}
                                                    </td>
                                                    <td className="p-6 text-[10px] font-mono font-bold text-slate-400">#{t.ref}</td>
                                                    <td className="p-6 text-right text-sm font-black text-rose-500 italic">
                                                        {t.type === 'debit' ? `KES ${t.amount.toLocaleString()}` : '---'}
                                                    </td>
                                                    <td className="p-6 text-right text-sm font-black text-emerald-600 italic">
                                                        {t.type === 'credit' ? `KES ${t.amount.toLocaleString()}` : '---'}
                                                    </td>
                                                    <td className="p-6 text-right text-sm font-black text-blue-600 italic">
                                                        KES {t.balance.toLocaleString()}
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
                                            <span className="text-sm font-black text-slate-400">KES {openingBal.toLocaleString()}</span>
                                        </div>
                                        {transactions.map(t => (
                                            <div key={t.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(t.date).toLocaleDateString()}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase italic">#{t.ref}</span>
                                                </div>
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase italic mb-1">{t.description}</p>
                                                {t.commission > 0 && <p className="text-[9px] text-purple-600 font-bold uppercase mb-2">Mgt Fee: KES {t.commission.toLocaleString()}</p>}
                                                <div className="flex justify-between items-center mt-4">
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t.type === 'debit' ? 'Debit' : 'Credit'}</p>
                                                        <p className={`text-sm font-black italic ${t.type === 'debit' ? 'text-rose-500' : 'text-emerald-600'}`}>KES {t.amount.toLocaleString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Balance</p>
                                                        <p className="text-sm font-black text-blue-600 italic">KES {t.balance.toLocaleString()}</p>
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

    const ReportsTab = () => (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Sub-navigation bar */}
            <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar border border-slate-200 dark:border-slate-700/50 shadow-inner">
                <div className="flex gap-1.5 min-w-max">
                    {[
                        { id: 'analytics', label: 'Analytics', icon: ChartPieIcon },
                        { id: 'statements', label: 'Financial Statements', icon: CurrencyIcon },
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Rent Collection Trend (Monthly)</h4>
                        <div className="h-64 flex items-end gap-2 px-4 shadow-inner bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6">
                            {[45, 60, 85, 30, 95, 70, 90, 100].map((h, i) => (
                                <div key={i} className="flex-1 bg-blue-600 rounded-t-xl hover:bg-blue-400 transition-all cursor-pointer relative group" style={{ height: `${h}% ` }}>
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        KES {(h * 1000).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Unit Status Distribution</h4>
                        <div className="flex items-center justify-around h-64">
                            <div className="w-40 h-40 rounded-full border-[20px] border-blue-600 border-r-emerald-500 border-b-rose-500 relative flex items-center justify-center">
                                <span className="font-black text-xs text-slate-900 dark:text-white uppercase italic">Overview</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded bg-blue-600"></div><span className="text-xs font-bold text-slate-500">Occupied</span></div>
                                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded bg-emerald-500"></div><span className="text-xs font-bold text-slate-500">Vacant</span></div>
                                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded bg-rose-500"></div><span className="text-xs font-bold text-slate-500">Under Repair</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {reportsSubTab === 'statements' && <StatementsManager />}
        </div>
    );

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
                                    <button onClick={() => setShowPropertyModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all">
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
                    </div>
                </div>
            </div>

            {renderTabs()}

            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-in slide-in-from-bottom-4 duration-500 mt-4">
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                        <h4 className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                            Total Collection
                        </h4>
                        <p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">KES {totalRentCollected.toLocaleString()}</p>
                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
                                <TrendingUpIcon className="w-4 h-4" /> +12%
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase text-purple-600 tracking-wider mb-0.5">Admin Fee</p>
                                <p className="text-xs font-black text-purple-600 italic">KES {totalCommissionEarned.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                        <h4 className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                             <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                             Active Leases
                        </h4>
                        <p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">{activeLeases.length}</p>
                        <div className="mt-4 flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            Occupancy: <span className="text-slate-900 dark:text-white">{units.length > 0 ? ((activeLeases.length / units.length) * 100).toFixed(1) : 0}%</span>
                        </div>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                        <h4 className="text-amber-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-amber-600 rounded-full"></span>
                            Vacant Units
                        </h4>
                        <p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">{vacantUnits.length}</p>
                        <div className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth Opportunity</div>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                        <h4 className="text-rose-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
                            Open Tickets
                        </h4>
                        <p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">{openTickets.length}</p>
                        <div className="mt-4 text-[10px] font-bold text-rose-500 uppercase tracking-widest animate-pulse">Needs Attention</div>
                    </div>
                </div>
            )}

            {activeTab === 'properties' && <PropertiesTab />}
            {activeTab === 'payouts' && <PayoutsTab />}
            {activeTab === 'listings' && <ListingsTab />}
            {activeTab === 'inquiries' && <InquiriesTab />}
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
                />
            )}
            {activeTab === 'reports' && <ReportsTab />}
            {activeTab === 'staff' && (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                    <UserManager 
                        currentInstitution={currentInstitution} 
                        currentUser={currentUser} 
                        users={users} 
                        showOnly="staff"
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
                }}
                title={editingProperty ? "Edit Property" : "Register New Property"}
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveProperty({
                        name: formData.get('name') as string,
                        address: formData.get('address') as string,
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
                        <input name="address" defaultValue={editingProperty?.address} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="Street, City, Block" />
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

            <Modal show={showLandlordModal} onClose={() => setShowLandlordModal(false)} title="Onboard Landlord">
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
                    });
                }} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Full Name / Company Name</label>
                        <input name="name" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="e.g. John Doe / XYZ Holdings" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Phone Number</label>
                            <input name="phoneNumber" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="+254..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Address</label>
                            <input name="email" type="email" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="john@example.com" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">ID Number</label>
                            <input name="idNumber" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-bold outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tax PIN</label>
                            <input name="taxPin" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="e.g. A00..." />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Bank Details</label>
                        <textarea name="bankDetails" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-bold outline-none transition-all h-24" placeholder="Bank Name, Branch, Account Number..." />
                    </div>
                    <button type="submit" className="w-full bg-purple-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-500/20 mt-4">Save Landlord Profile</button>
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

            <Modal show={showTenantModal} onClose={() => setShowTenantModal(false)} title="Tenant Onboarding">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveTenant({
                        name: formData.get('name') as string,
                        phoneNumber: formData.get('phoneNumber') as string,
                        idNumber: formData.get('idNumber') as string
                    });
                }} className="space-y-6">
                    <input name="name" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Full Name" />
                    <input name="phoneNumber" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Phone Number" />
                    <input name="idNumber" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="ID / Passport Number" />
                    <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4">Complete Onboarding</button>
                </form>
            </Modal>

            <Modal show={showLeaseModal} onClose={() => setShowLeaseModal(false)} title="Create Lease Agreement">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
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
                    });
                }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Unit</label>
                            <select name="unitId" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none">{units.filter(u => u.status === 'Vacant').map(u => <option key={u.id} value={u.id}>{u.unitNumber} - {properties.find(p => p.id === u.propertyId)?.name}</option>)}</select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Tenant</label>
                            <select name="tenantId" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none">{tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Rent Amount</label>
                            <input name="rentAmount" type="number" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Rent" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Security Deposit</label>
                            <input name="depositAmount" type="number" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Deposit" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Late Fee (%)</label>
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
                                        <p><strong>A. RENT:</strong> The Tenant shall pay the Landlord a monthly rent of <strong>KES {selectedLeaseForPreview.rentAmount.toLocaleString()}</strong> payable on or before the 1st of every month.</p>
                                        <p><strong>B. DEPOSIT:</strong> A security deposit of <strong>KES {selectedLeaseForPreview.depositAmount.toLocaleString()}</strong> has been paid and shall be held by the Landlord until the expiration of the lease.</p>
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
                                        <div className="mt-8 flex justify-center opacity-20"><BuildingOfficeIcon className="w-16 h-16" /></div>
                                    </div>
                                    <div className="border-t border-slate-900 text-center">
                                        <p className="mt-4 text-[10px] uppercase font-black tracking-widest">TENANT SIGNATURE</p>
                                        <div className="mt-8 flex justify-center opacity-20"><UserIcon className="w-16 h-16" /></div>
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

            <Modal show={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Transaction">
                <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); handleSavePayment({ leaseId: formData.get('leaseId') as string, amount: parseFloat(formData.get('amount') as string) || 0, paymentType: formData.get('paymentType') as PMPaymentType }); }} className="space-y-6">
                    <select name="leaseId" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none">{leases.filter(l => l.status === 'Active').map(l => <option key={l.id} value={l.id}>{tenants.find(t => t.id === l.tenantId)?.name} - Unit {units.find(u => u.id === l.unitId)?.unitNumber}</option>)}</select>
                    <select name="paymentType" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none"><option value="Rent">Rent</option><option value="Utility">Utility Bill</option><option value="Deposit">Deposit</option></select>
                    <input name="amount" type="number" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Amount Paid" />
                    <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4">Finalize Payment</button>
                </form>
            </Modal>

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
                                        <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
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

            {showBankModal && <BankActionModal />}
            
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
 
            <Modal show={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="Generate New Invoice" maxWidth="max-w-md">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const leaseId = formData.get('leaseId') as string;
                    const lease = leases.find(l => l.id === leaseId);
                    if (!lease) return;
                    
                    handleSaveInvoice({
                        leaseId,
                        tenantId: lease.tenantId,
                        unitId: lease.unitId,
                        amount: parseFloat(formData.get('amount') as string) || 0,
                        description: formData.get('description') as string,
                        issueDate: new Date().toISOString().split('T')[0],
                        dueDate: formData.get('dueDate') as string,
                    });
                }} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Target Tenant / Lease</label>
                        <select name="leaseId" required className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl p-3 font-bold outline-none">
                            <option value="">Select Tenant...</option>
                            {leases.filter(l => l.status === 'Active').map(l => {
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
                        <input name="description" defaultValue="Monthly Rent" required className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl p-3 font-bold outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Amount (KES)</label>
                            <input name="amount" type="number" required className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl p-3 font-bold outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Due Date</label>
                            <input name="dueDate" type="date" required className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl p-3 font-bold outline-none" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all mt-4">
                        Generate & Finalize Invoice
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
