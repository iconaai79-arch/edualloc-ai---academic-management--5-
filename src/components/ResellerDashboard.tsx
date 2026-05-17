import React, { useState, useEffect } from 'react';
import type { User, Institution, CompanyDetails, MpesaTransaction, Invoice, Role, CommissionWithdrawalRequest } from '../types';
import { apiService } from '../services/apiService';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ArrowRightOnRectangleIcon } from './icons/ArrowRightOnRectangleIcon';
import { PlusIcon } from './icons/PlusIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { BanknotesIcon } from './icons/BanknotesIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { EyeIcon } from './icons/EyeIcon';
import { XIcon } from './icons/XIcon';
import { ShieldIcon } from './icons/ShieldIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { BedIcon } from './icons/BedIcon';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { UserIcon } from './icons/UserIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { HomeIcon } from './icons/HomeIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { SparklesIcon } from './icons/SparklesIcon';

import { generateAlphanumericCode } from '../utils/stringUtils';
import { generateId, generateUserId } from '../utils/idGenerator';

interface ResellerDashboardProps {
    currentUser: User;
    currentInstitution: Institution;
    onImpersonate: (tenantId: string, initialRole?: Role | null) => void;
    companyDetails: CompanyDetails;
    transactions: MpesaTransaction[];
    invoices: Invoice[];
}

const ResellerDashboard: React.FC<ResellerDashboardProps> = ({ currentUser, currentInstitution, onImpersonate, companyDetails, transactions, invoices }) => {
    const [tenants, setTenants] = useState<Institution[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'clients' | 'commissions'>('clients');
    const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);
    const [isPerspectiveModalOpen, setIsPerspectiveModalOpen] = useState(false);
    const [selectedTenantForPerspective, setSelectedTenantForPerspective] = useState<Institution | null>(null);
    const [withdrawalRequests, setWithdrawalRequests] = useState<CommissionWithdrawalRequest[]>([]);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState(0);
    const [withdrawNotes, setWithdrawNotes] = useState('');
    const [withdrawAccount, setWithdrawAccount] = useState('');
    const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

    // New Tenant Form State
    const [newTenantName, setNewTenantName] = useState('');
    const [newTenantEmail, setNewTenantEmail] = useState('');
    const [newTenantPhone, setNewTenantPhone] = useState('');
    const [newTenantType, setNewTenantType] = useState<Institution['institutionType']>('Education');
    const [newTenantCategory, setNewTenantCategory] = useState('Primary');
    const [newTenantSubType, setNewTenantSubType] = useState<Institution['businessSubType']>('');
    const [newTenantMonthlyPrice, setNewTenantMonthlyPrice] = useState(companyDetails.subscriptionConfig.defaultMonthlyPrice);
    const [newTenantYearlyPrice, setNewTenantYearlyPrice] = useState(companyDetails.subscriptionConfig.defaultYearlyPrice);

    // Edit Pricing State
    const [isEditPricingModalOpen, setIsEditPricingModalOpen] = useState(false);
    const [selectedTenantForPricing, setSelectedTenantForPricing] = useState<Institution | null>(null);
    const [editMonthlyPrice, setEditMonthlyPrice] = useState(0);
    const [editYearlyPrice, setEditYearlyPrice] = useState(0);
    const [isUpdatingPricing, setIsUpdatingPricing] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const fetchedInstitutions = await apiService.fetchInstitutions();
                const myTenants = fetchedInstitutions.filter(inst => inst.resellerId === currentInstitution.id);
                setTenants(myTenants);

                // Fetch users for our tenants to get metrics
                const fetchedUsers = await apiService.fetchUsers();
                const tenantUserIds = myTenants.map(t => t.id);
                const usersInMyTenants = fetchedUsers.filter(u => tenantUserIds.includes(u.institutionId));
                setAllUsers(usersInMyTenants);

                const fetchedRequests = await apiService.fetchModuleRecords<CommissionWithdrawalRequest>('commission_withdrawal_requests');
                setWithdrawalRequests(fetchedRequests.filter(r => r.resellerId === currentInstitution.id));
            } catch (error) {
                console.error("Error loading reseller data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [currentInstitution.id]);

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        const tenantId = generateId('inst');
        const adminId = generateUserId();

        // Starting tenant onboarding process

        try {
            // Step 1: Prepare Institution
            const newInst: Institution = {
                id: tenantId,
                name: newTenantName,
                email: newTenantEmail,
                phoneNumber: newTenantPhone,
                institutionType: newTenantType,
                category: newTenantCategory,
                businessSubType: newTenantSubType,
                status: 'trial',
                trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                institutionCode: generateAlphanumericCode(6),
                resellerId: currentInstitution.id,
                isOtpEnabled: false,
                useAllocationRequests: true,
                customSubscriptionPrice: {
                    monthly: newTenantMonthlyPrice,
                    yearly: newTenantYearlyPrice
                }
            };

            // Saving Institution
            try {
                await apiService.saveInstitution(newInst);
            } catch (instError: any) {
                console.error("Institution Save Failed:", instError);
                throw new Error(`Institution setup failed: ${instError.message || 'Database error'} `);
            }

            // Step 2: Prepare and Register Admin
            const newAdmin: Partial<User> = {
                id: adminId,
                name: `Admin - ${newTenantName} `,
                email: newTenantEmail,
                phoneNumber: newTenantPhone,
                role: 'admin',
                roles: ['admin'],
                institutionId: tenantId,
                expertise: ['Administration'],
            };

            // Registering Admin
            try {
                await apiService.registerUser(newAdmin, newTenantName);
            } catch (adminError: any) {
                console.error("Admin Registration Failed:", adminError);
                // We don't rollback the institution here to avoid potential data loss if it partially worked,
                // but we inform the user it was the user part that failed.
                throw new Error(`Admin account setup failed: ${adminError.message || 'Registration error'} `);
            }

            // Success
            const updatedTenants = [...tenants, newInst];
            setTenants(updatedTenants);
            setIsAddTenantModalOpen(false);

            // Reset form
            setNewTenantName('');
            setNewTenantEmail('');
            setNewTenantPhone('');
            setNewTenantType('Education');
            setNewTenantCategory('Primary');
            setNewTenantSubType('');
            setNewTenantMonthlyPrice(companyDetails.subscriptionConfig.defaultMonthlyPrice);
            setNewTenantYearlyPrice(companyDetails.subscriptionConfig.defaultYearlyPrice);

            alert('Congratulations! The tenant and admin account have been successfully created.');
        } catch (error: any) {
            console.error("Critical Failure in handleCreateTenant:", error);
            alert(`detailed error report: \n\n${error.message} \n\nCheck the browser console(Inspect > Console) for full technical logs.`);
        }
    };

    const handleUpdatePricing = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTenantForPricing) return;

        setIsUpdatingPricing(true);
        try {
            const updatedInst = {
                ...selectedTenantForPricing,
                customSubscriptionPrice: {
                    monthly: editMonthlyPrice,
                    yearly: editYearlyPrice
                }
            };
            await apiService.saveInstitution(updatedInst);
            setTenants(prev => prev.map(t => t.id === updatedInst.id ? updatedInst : t));
            setIsEditPricingModalOpen(false);
            alert('Pricing updated successfully.');
        } catch (error: any) {
            console.error("Pricing Update Failed:", error);
            alert(`Failed to update pricing: ${error.message} `);
        } finally {
            setIsUpdatingPricing(false);
        }
    };

    const openEditPricing = (tenant: Institution) => {
        setSelectedTenantForPerspective(null);
        setSelectedTenantForPricing(tenant);
        setEditMonthlyPrice(tenant.customSubscriptionPrice?.monthly || companyDetails.subscriptionConfig.defaultMonthlyPrice);
        setEditYearlyPrice(tenant.customSubscriptionPrice?.yearly || companyDetails.subscriptionConfig.defaultYearlyPrice);
        setIsEditPricingModalOpen(true);
    };

    const openPerspectiveSelection = (tenant: Institution) => {
        setSelectedTenantForPerspective(tenant);
        setIsPerspectiveModalOpen(true);
    };

    const perspectiveOptions = [
        { role: 'admin', label: 'Timetable', icon: <BuildingOfficeIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'security', label: 'Security Module', icon: <ShieldIcon className="w-6 h-6" />, color: 'bg-red-50 text-red-600' },
        { role: 'store', label: 'Inventory Module', icon: <ArchiveBoxIcon className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600' },
        { role: 'transport_assistant', label: 'Transport Module', icon: <MapPinIcon className="w-6 h-6" />, color: 'bg-teal-50 text-teal-600' },
        { role: 'boarding_master', label: 'Boarding Module', icon: <BedIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
        { role: 'info_desk', label: 'Info Desk Module', icon: <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />, color: 'bg-sky-50 text-sky-600' },
        { role: 'librarian', label: 'Library Module', icon: <BookOpenIcon className="w-6 h-6" />, color: 'bg-purple-50 text-purple-600' },
        { role: 'parent', label: 'Parent Portal', icon: <UserGroupIcon className="w-6 h-6" />, color: 'bg-rose-50 text-rose-600' },
        { role: 'student', label: 'Student Portal', icon: <AcademicCapIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'lecturer', label: 'Teacher/Lecturer Portal', icon: <UserIcon className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600' },
        { role: 'agrovet_admin', label: 'Agrovet Module', icon: <BeakerIcon className="w-6 h-6" />, color: 'bg-green-50 text-green-600' },
        { role: 'property_admin', label: 'Property Module', icon: <HomeIcon className="w-6 h-6" />, color: 'bg-cyan-50 text-cyan-600' },
        { role: 'carwash_admin', label: 'Car Wash Module', icon: <SparklesIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-400' }
    ];

    const handleRequestWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (withdrawAmount <= 0) return alert("Please enter a valid amount.");
        if (withdrawAmount > pendingPayout) return alert("You cannot withdraw more than your pending payout.");

        setIsSubmittingWithdrawal(true);
        try {
            const request: CommissionWithdrawalRequest = {
                id: generateId('wireq'),
                resellerId: currentInstitution.id,
                resellerName: currentInstitution.name,
                amount: withdrawAmount,
                status: 'pending',
                requestedAt: new Date().toISOString(),
                notes: withdrawNotes,
                accountDetails: withdrawAccount
            };

            await apiService.saveModuleRecord('commission_withdrawal_requests', request);
            setWithdrawalRequests(prev => [request, ...prev]);
            setIsWithdrawModalOpen(false);
            setWithdrawAmount(0);
            setWithdrawNotes('');
            setWithdrawAccount('');
            alert("Withdrawal request submitted successfully. It will be processed by the Super Admin.");
        } catch (error: any) {
            console.error("Withdrawal Request Failed:", error);
            alert(`Failed to submit request: ${error.message}`);
        } finally {
            setIsSubmittingWithdrawal(false);
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeTenants = tenants.filter(t => t.status === 'active').length;
    const trialTenants = tenants.filter(t => t.status === 'trial').length;
    const totalUsers = allUsers.length;

    // Commission Logic
    const tenantIds = tenants.map(t => t.id);
    const commissionTransactions = transactions.filter(tx => tenantIds.includes(tx.institutionId) && tx.status === 'completed');

    const calculateCommission = (tx: MpesaTransaction) => {
        const tenant = tenants.find(t => t.id === tx.institutionId);
        if (!tenant) return 0;

        const baseMonthly = companyDetails.subscriptionConfig.defaultMonthlyPrice;
        const baseYearly = companyDetails.subscriptionConfig.defaultYearlyPrice;
        const tenantMonthly = tenant.customSubscriptionPrice?.monthly || baseMonthly;
        const tenantYearly = tenant.customSubscriptionPrice?.yearly || baseYearly;

        // If amount matches yearly pricing
        if (Math.abs(tx.amount - tenantYearly) < 1) return Math.max(0, tenantYearly - baseYearly);
        // If amount matches monthly
        if (Math.abs(tx.amount - tenantMonthly) < 1) return Math.max(0, tenantMonthly - baseMonthly);

        // For multi-month or partial payments, calculate proportional commission
        const monthlyCommission = tenantMonthly - baseMonthly;
        if (monthlyCommission <= 0) return 0;

        const monthsCovered = tx.amount / tenantMonthly;
        return monthsCovered * monthlyCommission;
    };

    const totalCommissions = commissionTransactions.reduce((acc, tx) => acc + calculateCommission(tx), 0);
    // We assume any transaction with "Payout" in metadata or role specific is a disbursed amount
    const disbursedCommissions = transactions.filter(tx => tx.institutionId === currentInstitution.id && tx.metadata?.type === 'commission_payout').reduce((acc, tx) => acc + tx.amount, 0);
    const pendingPayout = Math.max(0, totalCommissions - disbursedCommissions);

    if (isLoading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center">
                <SparklesIcon className="w-8 h-8 text-indigo-500 animate-pulse mb-4" />
                <p className="text-slate-500 font-medium">Loading your portfolio...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in p-6">
            <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`px - 6 py - 2 rounded - xl text - sm font - bold transition - all ${activeTab === 'clients' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                >
                    Client Portfolio
                </button>
                <button
                    onClick={() => setActiveTab('commissions')}
                    className={`px - 6 py - 2 rounded - xl text - sm font - bold transition - all ${activeTab === 'commissions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                >
                    Earnings & Commissions
                </button>
            </div>

            {activeTab === 'clients' ? (
                <>
                    {/* Metrics Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                                <BuildingOfficeIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium tracking-tight">Active Clients</p>
                                <p className="text-3xl font-black text-slate-900">{activeTenants}</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="p-4 bg-amber-50 text-amber-600 rounded-xl">
                                <ChartBarIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium tracking-tight">Trial Clients</p>
                                <p className="text-3xl font-black text-slate-900">{trialTenants}</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                                <UserGroupIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium tracking-tight">Total Managed Users</p>
                                <p className="text-3xl font-black text-slate-900">{totalUsers}</p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 border-l-4 border-l-indigo-500">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl">
                            <BanknotesIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Total Earned</p>
                            <p className="text-3xl font-black text-slate-900 font-mono">KES {totalCommissions.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 border-l-4 border-l-emerald-500">
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                            <ArrowRightIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Pending Payout</p>
                            <div className="flex items-center gap-4">
                                <p className="text-3xl font-black text-emerald-600 font-mono">KES {pendingPayout.toLocaleString()}</p>
                                {pendingPayout > 0 && (
                                    <button
                                        onClick={() => {
                                            setWithdrawAmount(pendingPayout);
                                            setIsWithdrawModalOpen(true);
                                        }}
                                        className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                                    >
                                        Withdraw
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 border-l-4 border-l-amber-500">
                        <div className="p-4 bg-amber-50 text-amber-600 rounded-xl">
                            <ArrowPathIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Disbursed to Date</p>
                            <p className="text-3xl font-black text-slate-900 font-mono">KES {disbursedCommissions.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Agency Invite Link */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 mb-8 text-white shadow-xl shadow-indigo-200/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <SparklesIcon className="w-5 h-5 text-indigo-100" />
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-tight italic">Agency Expansion Link</h2>
                        </div>
                        <p className="text-indigo-100 font-medium">Share this unique link with potential clients. When they register using this link, they will be automatically associated with your agency portfolio for commission tracking.</p>
                    </div>
                    <div className="flex flex-col gap-3 w-full md:w-auto">
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 font-mono text-xs overflow-hidden">
                            <span className="truncate opacity-80">{`${window.location.origin} /?resellerId=${currentInstitution.id}`}</span >
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/?resellerId=${currentInstitution.id}`);
                                    alert("Magic link copied to clipboard! Share it to start growing your agency.");
                                }}
                                className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-50 transition-colors shadow-lg active:scale-95 flex-shrink-0"
                            >
                                Copy Link
                            </button>
                        </div >
                        <p className="text-[10px] font-black uppercase tracking-widest text-center md:text-right text-white/60">Recruit Unlimited Tenants</p>
                    </div >
                </div >
            </div >

            {activeTab === 'clients' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <h2 className="text-lg font-bold text-slate-800">Your Portfolio</h2>
                            <button
                                onClick={() => setIsAddTenantModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Register Tenant
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full md:w-64 transition-all"
                        />
                    </div>
                    {filteredTenants.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <BuildingOfficeIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="text-lg font-medium text-slate-700">No clients found</p>
                            <p className="text-sm mb-6">You haven't onboarded any clients yet, or no clients match your search.</p>
                            <button
                                onClick={() => setIsAddTenantModalOpen(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Onboard Your First Client
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client Name</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Users</th>
                                        <th className="text-right py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTenants.map(tenant => {
                                        const tenantUsers = allUsers.filter(u => u.institutionId === tenant.id).length;
                                        return (
                                            <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="font-medium text-slate-800">{tenant.name}</div>
                                                    <div className="text-sm text-slate-500">{tenant.email}</div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                        {tenant.institutionType}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tenant.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                        tenant.status === 'trial' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                            'bg-red-100 text-red-800 border border-red-200'
                                                        }`}>
                                                        {tenant.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-1 text-slate-600">
                                                        <BanknotesIcon className="w-6 h-6 text-emerald-600 mb-2" />
                                                        <span className="font-medium">{tenantUsers}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-right flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditPricing(tenant)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                                        title="Adjust subscription pricing for this client"
                                                    >
                                                        <CreditCardIcon className="w-4 h-4" />
                                                        Pricing
                                                    </button>
                                                    <button
                                                        onClick={() => openPerspectiveSelection(tenant)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                                        title="Switch perspective for this client"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                        Perspective
                                                    </button>
                                                    <button
                                                        onClick={() => onImpersonate(tenant.id)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                                        title="Log in as this client to provide support"
                                                    >
                                                        <LockClosedIcon className="w-4 h-4" />
                                                        Access
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="text-lg font-bold text-slate-800">Commission History</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Filter by Tenant</span>
                            <select
                                className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                onChange={() => { }} // TODO: Implement filtering
                            >
                                <option value="all">All Clients</option>
                                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Withdrawal Requests Sub-section */}
                    {withdrawalRequests.length > 0 && (
                        <div className="p-6 border-b border-slate-100 bg-amber-50/20">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Withdrawal Requests</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {withdrawalRequests.map(req => (
                                    <div key={req.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group hover:border-amber-200 transition-all">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(req.requestedAt).toLocaleDateString()}</p>
                                            <p className="text-lg font-black text-slate-900 font-mono">KES {req.amount.toLocaleString()}</p>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                            req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-rose-100 text-rose-700'
                                            }`}>
                                            {req.status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {commissionTransactions.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <BanknotesIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="text-lg font-medium text-slate-700">No earnings yet</p>
                            <p className="text-sm">When your clients make subscription payments, your commissions will appear here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Rate</th>
                                        <th className="text-right py-4 px-6 text-xs font-semibold text-indigo-600 uppercase tracking-wider">Your Commission</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {commissionTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(tx => {
                                        const tenant = tenants.find(t => t.id === tx.institutionId);
                                        const commission = calculateCommission(tx);
                                        const baseRate = tx.amount - commission;
                                        return (
                                            <tr key={tx.id} className="hover:bg-indigo-50/30 transition-colors">
                                                <td className="py-4 px-6 text-sm text-slate-600 whitespace-nowrap">
                                                    {new Date(tx.timestamp).toLocaleDateString()}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="font-bold text-slate-800">{tenant?.name || 'Unknown Client'}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{tx.transactionId}</div>
                                                </td>
                                                <td className="py-4 px-6 font-mono text-sm text-slate-700 font-bold">
                                                    KES {tx.amount.toLocaleString()}
                                                </td>
                                                <td className="py-4 px-6 font-mono text-xs text-slate-500">
                                                    KES {baseRate.toLocaleString()}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="text-indigo-600 font-black font-mono">
                                                        +KES {commission.toLocaleString()}
                                                    </div>
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

            {/* Add Tenant Modal */}
            {
                isAddTenantModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="text-xl font-bold text-slate-800">Onboard New Client</h3>
                                <button onClick={() => setIsAddTenantModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <span className="sr-only">Close</span>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleCreateTenant} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Client / Institution Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newTenantName}
                                        onChange={(e) => setNewTenantName(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="e.g. Greenwood High School"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Primary Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={newTenantEmail}
                                        onChange={(e) => setNewTenantEmail(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="admin@greenwood.com"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">We will create a default admin account with this email.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        required
                                        value={newTenantPhone}
                                        onChange={(e) => setNewTenantPhone(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="e.g. 0712345678"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Institution Type</label>
                                    <select
                                        value={newTenantType}
                                        onChange={(e) => {
                                            const val = e.target.value as any;
                                            setNewTenantType(val);
                                            if (val === 'Business') {
                                                setNewTenantSubType('Agrovet');
                                            } else {
                                                setNewTenantSubType('');
                                                setNewTenantCategory('');
                                            }
                                        }}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        <option value="Education">School / College / University</option>
                                        <option value="HIS">Health Information System (HIS)</option>
                                        <option value="Business">General Business</option>
                                        <option value="Cooperative">Cooperative / SACCO</option>
                                        <option value="Agrovet">Agrovet</option>
                                        <option value="Church">Church / Ministry</option>
                                        <option value="Property Management">Property Management</option>
                                        <option value="Pharmacy">Pharmacy</option>
                                    </select>
                                </div>

                                {newTenantType === 'Education' && (
                                    <div className="animate-fade-in">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Education Category</label>
                                        <select
                                            value={newTenantCategory}
                                            onChange={(e) => setNewTenantCategory(e.target.value)}
                                            className="w-full border border-indigo-200 bg-indigo-50/30 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                                            required
                                        >
                                            <option value="Primary">Primary School</option>
                                            <option value="Secondary">Secondary School</option>
                                            <option value="University">University</option>
                                            <option value="College">College</option>
                                            <option value="Institute">Vocational Institute</option>
                                            <option value="Polytechnic">Polytechnic</option>
                                            <option value="ECD">ECD / Kindergarten</option>
                                        </select>
                                    </div>
                                )}

                                {newTenantType === 'Business' && (
                                    <div className="animate-fade-in">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Business Category / Niche</label>
                                        <select
                                            value={newTenantSubType || 'General'}
                                            onChange={(e) => setNewTenantSubType(e.target.value as any)}
                                            className="w-full border border-indigo-200 bg-indigo-50/30 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                                            required
                                        >
                                            <option value="Agrovet">Agrovet (Agricultural Supplies)</option>
                                            <option value="Property Management">Property Management (Rent/Leases)</option>
                                            <option value="Car Wash">Car Wash / Service Center</option>
                                            <option value="Hardware">Hardware Store</option>
                                            <option value="Pharmacy">Pharmacy / Chemist</option>
                                            <option value="General">General Retail / Business</option>
                                        </select>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-black uppercase text-indigo-500 mb-4 tracking-widest flex items-center gap-2">
                                        <SparklesIcon className="w-4 h-4" /> Custom Subscription Pricing
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Monthly Price (KES)</label>
                                            <input
                                                type="number"
                                                required
                                                min={companyDetails.subscriptionConfig.defaultMonthlyPrice}
                                                value={newTenantMonthlyPrice}
                                                onChange={(e) => setNewTenantMonthlyPrice(Number(e.target.value))}
                                                className={`w-full border rounded-xl px-4 py-2 outline-none transition-all ${newTenantMonthlyPrice < companyDetails.subscriptionConfig.defaultMonthlyPrice ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'}`}
                                            />
                                            <p className="text-[9px] text-slate-400 mt-1 ml-1">Min: KES {companyDetails.subscriptionConfig.defaultMonthlyPrice.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Yearly Price (KES)</label>
                                            <input
                                                type="number"
                                                required
                                                min={companyDetails.subscriptionConfig.defaultYearlyPrice}
                                                value={newTenantYearlyPrice}
                                                onChange={(e) => setNewTenantYearlyPrice(Number(e.target.value))}
                                                className={`w-full border rounded-xl px-4 py-2 outline-none transition-all ${newTenantYearlyPrice < companyDetails.subscriptionConfig.defaultYearlyPrice ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'}`}
                                            />
                                            <p className="text-[9px] text-slate-400 mt-1 ml-1">Min: KES {companyDetails.subscriptionConfig.defaultYearlyPrice.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {(newTenantMonthlyPrice > companyDetails.subscriptionConfig.defaultMonthlyPrice || newTenantYearlyPrice > companyDetails.subscriptionConfig.defaultYearlyPrice) && (
                                        <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-indigo-600">Reseller Commission (Monthly)</p>
                                                <p className="text-sm font-bold text-indigo-900">KES {(newTenantMonthlyPrice - companyDetails.subscriptionConfig.defaultMonthlyPrice).toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase text-indigo-600">Reseller Commission (Yearly)</p>
                                                <p className="text-sm font-bold text-indigo-900">KES {(newTenantYearlyPrice - companyDetails.subscriptionConfig.defaultYearlyPrice).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddTenantModalOpen(false)}
                                        className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                                    >
                                        Provision Account
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Edit Pricing Modal */}
            {
                isEditPricingModalOpen && selectedTenantForPricing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in border border-indigo-100">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Edit Subscription Pricing</h3>
                                    <p className="text-xs text-indigo-600 font-medium">{selectedTenantForPricing.name}</p>
                                </div>
                                <button onClick={() => setIsEditPricingModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <span className="sr-only">Close</span>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <form onSubmit={handleUpdatePricing} className="p-6 space-y-6">
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                                    <InformationCircleIcon className="w-5 h-5 text-amber-600 shrink-0" />
                                    <p className="text-xs text-amber-800 leading-relaxed">
                                        Adjusting prices will affect future invoices for this tenant. Pricing must not be lower than the system's base rate.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Monthly (KES)</label>
                                        <input
                                            type="number"
                                            required
                                            min={companyDetails.subscriptionConfig.defaultMonthlyPrice}
                                            value={editMonthlyPrice}
                                            onChange={(e) => setEditMonthlyPrice(Number(e.target.value))}
                                            className={`w-full border rounded-xl px-4 py-2 outline-none transition-all ${editMonthlyPrice < companyDetails.subscriptionConfig.defaultMonthlyPrice ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'}`}
                                        />
                                        <p className="text-[9px] text-slate-400 mt-1 ml-1">Min: KES {companyDetails.subscriptionConfig.defaultMonthlyPrice.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Yearly (KES)</label>
                                        <input
                                            type="number"
                                            required
                                            min={companyDetails.subscriptionConfig.defaultYearlyPrice}
                                            value={editYearlyPrice}
                                            onChange={(e) => setEditYearlyPrice(Number(e.target.value))}
                                            className={`w-full border rounded-xl px-4 py-2 outline-none transition-all ${editYearlyPrice < companyDetails.subscriptionConfig.defaultYearlyPrice ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'}`}
                                        />
                                        <p className="text-[9px] text-slate-400 mt-1 ml-1">Min: KES {companyDetails.subscriptionConfig.defaultYearlyPrice.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-indigo-600">Pending Commission</p>
                                        <p className="text-sm font-bold text-indigo-900">
                                            Monthly: KES {(editMonthlyPrice - companyDetails.subscriptionConfig.defaultMonthlyPrice).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase text-indigo-600">Yearly</p>
                                        <p className="text-sm font-bold text-indigo-900">
                                            KES {(editYearlyPrice - companyDetails.subscriptionConfig.defaultYearlyPrice).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditPricingModalOpen(false)}
                                        className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                                    >
                                        Discard Changes
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUpdatingPricing || editMonthlyPrice < companyDetails.subscriptionConfig.defaultMonthlyPrice || editYearlyPrice < companyDetails.subscriptionConfig.defaultYearlyPrice}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                    >
                                        {isUpdatingPricing ? 'Updating...' : 'Save New Rates'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Withdraw Modal */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in border border-emerald-100">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50/30">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Request Withdrawal</h3>
                                <p className="text-xs text-emerald-600 font-medium tracking-tight uppercase">Transfer commissions to your account</p>
                            </div>
                            <button onClick={() => setIsWithdrawModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleRequestWithdrawal} className="p-6 space-y-6">
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                                <InformationCircleIcon className="w-5 h-5 text-amber-600 shrink-0" />
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    Funds will be disbursed to your registered mobile money account or bank details as provided below.
                                </p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Amount to Withdraw (KES)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        required
                                        max={pendingPayout}
                                        min={1}
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono font-bold text-lg"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                                        MAX: {pendingPayout.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Payout Details (M-Pesa / Bank)</label>
                                <textarea
                                    required
                                    value={withdrawAccount}
                                    onChange={(e) => setWithdrawAccount(e.target.value)}
                                    placeholder="e.g. M-Pesa 07XX XXX XXX or Equity Bank Acc XXXXXX"
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm h-20 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Additional Notes (Optional)</label>
                                <input
                                    type="text"
                                    value={withdrawNotes}
                                    onChange={(e) => setWithdrawNotes(e.target.value)}
                                    placeholder="Reference or reason for withdrawal"
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmittingWithdrawal}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-100 transition-all active:scale-95"
                            >
                                {isSubmittingWithdrawal ? 'Processing...' : 'Submit Request'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Perspective Switching Modal */}
            {isPerspectiveModalOpen && selectedTenantForPerspective && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPerspectiveModalOpen(false)}>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">Perspective Switcher</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Impersonate {selectedTenantForPerspective.name}</p>
                            </div>
                            <button onClick={() => setIsPerspectiveModalOpen(false)} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
                                <XIcon className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {perspectiveOptions.filter(opt => {
                                const instType = selectedTenantForPerspective?.institutionType;
                                const isEdu = instType === 'Education' || ['Primary', 'Secondary', 'University', 'College', 'Institute', 'Polytechnic', 'ECD', 'International', 'TVET', 'Kindergarten'].includes(instType || '');
                                if (isEdu) {
                                    const eduAllowed = ['admin', 'security', 'store', 'transport_assistant', 'boarding_master', 'info_desk', 'librarian', 'parent', 'student', 'lecturer'];
                                    return eduAllowed.includes(opt.role);
                                }
                                return true;
                            }).map(opt => (
                                <button
                                    key={opt.role}
                                    onClick={() => {
                                        onImpersonate(selectedTenantForPerspective.id, opt.role as Role);
                                        setIsPerspectiveModalOpen(false);
                                    }}
                                    className={`flex items-center gap-4 p-5 rounded-3xl border-2 border-transparent transition-all text-left group hover:border-indigo-500 ${opt.color}`}
                                >
                                    <div className="p-3 bg-white rounded-2xl shadow-sm transition-transform group-hover:scale-110">
                                        {opt.icon}
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                            <p className="text-xs text-slate-400 font-medium">Selecting a perspective will instantly launch that module's view for this client.</p>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default ResellerDashboard;

