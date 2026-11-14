import React, { useState } from 'react';
import { XIcon } from '../icons/XIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { BuildingOfficeIcon } from '../icons/BuildingOfficeIcon';
import { StoreIcon } from '../icons/StoreIcon';
import { UserPlusIcon } from '../icons/UserPlusIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { apiService } from '../../services/apiService';
import { Institution } from '../../types';

interface MarketplaceClientOnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClientOnboarded?: (institution: Institution) => void;
}

const BUSINESS_CATEGORIES = [
    { id: 'Retail', name: 'Retail & Wholesale Supplier', icon: '🛒', desc: 'Equipment, general stock, appliances, electronics' },
    { id: 'Primary/Secondary School', name: 'School / Academy (K-12)', icon: '🏫', desc: 'Campuses, school buses, student supplies' },
    { id: 'College/University', name: 'College, TVET & University', icon: '🎓', desc: 'Tertiary institution equipment & facilities' },
    { id: 'Hospital', name: 'Hospital & Healthcare Clinic', icon: '🏥', desc: 'Medical devices, pharmacy stock, clinic supplies' },
    { id: 'Automotive', name: 'Car Dealership & Fleet Showroom', icon: '🚗', desc: 'School buses, commercial vans, car sales' },
    { id: 'Real Estate', name: 'Campus & Real Estate Agency', icon: '🏢', desc: 'School campuses, land parcels, commercial properties' },
    { id: 'Uniforms', name: 'Uniforms & Apparel Manufacturer', icon: '👔', desc: 'School uniforms, sportswear, staff branding' },
    { id: 'Lab & Science', name: 'Lab Equipment & Chemical Supplier', icon: '🧪', desc: 'Science kits, microscopes, lab reagents' },
    { id: 'Furniture', name: 'Institutional Furniture & Desks', icon: '🪑', desc: 'Student desks, office furniture, dorm beds' },
    { id: 'Books', name: 'Bookstore & Publishing House', icon: '📚', desc: 'Curriculum books, stationery, exam materials' },
    { id: 'SACCO', name: 'SACCO / Cooperative Society', icon: '🏦', desc: 'Financial cooperative & member trade services' },
    { id: 'Enterprise', name: 'General Enterprise / Manufacturer', icon: '🏭', desc: 'Direct factory products & custom bulk orders' },
];

const KENYA_COUNTIES = [
    'Nairobi', 'Kiambu', 'Mombasa', 'Nakuru', 'Uasin Gishu (Eldoret)', 'Kisumu', 'Machakos',
    'Kajiado', 'Meru', 'Kilifi', 'Nyeri', 'Murang\'a', 'Kakamega', 'Kisii', 'Kericho',
    'Bungoma', 'Trans Nzoia (Kitale)', 'Laikipia', 'Embu', 'Homa Bay', 'Migori', 'Kitui'
];

export const MarketplaceClientOnboardingModal: React.FC<MarketplaceClientOnboardingModalProps> = ({
    isOpen,
    onClose,
    onClientOnboarded
}) => {
    const [formData, setFormData] = useState({
        name: '',
        businessType: 'Retail',
        contactPerson: '',
        phone: '',
        email: '',
        county: 'Nairobi',
        locationTown: '',
        inventoryDescription: '',
        password: '',
        autoProvisionPortal: true
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [onboardSuccess, setOnboardSuccess] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState<{
        instId: string;
        instName: string;
        email: string;
        password: string;
        portalUrl: string;
    } | null>(null);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const generateSecurePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let res = 'Edu!';
        for (let i = 0; i < 6; i++) {
            res += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return res;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim()) {
            alert('Please fill in the client name, phone number, and email.');
            return;
        }

        setIsSubmitting(true);
        try {
            const rawPassword = formData.password.trim() || generateSecurePassword();
            const instId = `inst_mkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const adminId = `u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const nowIso = new Date().toISOString();
            const trialEndIso = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days complimentary marketplace onboarding

            // 1. Provision new Institution record
            const newInstitution: any = {
                id: instId,
                name: formData.name.trim(),
                code: formData.name.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase(),
                institutionType: formData.businessType,
                status: 'active',
                phone: formData.phone.trim(),
                email: formData.email.trim().toLowerCase(),
                county: formData.county,
                location: formData.locationTown.trim() ? `${formData.locationTown.trim()}, ${formData.county}` : formData.county,
                marketplaceEnabled: true,
                showMarketplace: true,
                subscriptionEndsAt: trialEndIso,
                createdAt: nowIso,
                updatedAt: nowIso
            };

            await apiService.saveInstitution(newInstitution);

            // 2. Provision Client Admin User
            const newAdminUser: any = {
                id: adminId,
                name: formData.contactPerson.trim() || formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                password: rawPassword,
                phone: formData.phone.trim(),
                role: 'institution_admin',
                institutionId: instId,
                status: 'active',
                createdAt: nowIso,
                updatedAt: nowIso
            };

            await apiService.saveUser(newAdminUser);

            // 3. Provision Core Marketplace Modules (Retail, Inventory, Properties)
            const activeModules = ['retail', 'inventory', 'properties', 'logistics', 'comms'];
            for (const modId of activeModules) {
                try {
                    await apiService.saveModuleRecord('institution_module_states', {
                        id: `ims_${modId}_${instId}`,
                        institutionId: instId,
                        moduleId: modId,
                        status: 'active',
                        activatedAt: nowIso,
                        trialEndsAt: trialEndIso,
                        subscriptionEndsAt: trialEndIso,
                        updatedAt: nowIso
                    });
                } catch (mErr) {
                    console.warn(`Module state provisioning notice for ${modId}:`, mErr);
                }
            }

            // 4. Record formal Client Onboarding audit log
            await apiService.saveModuleRecord('client_onboarding', {
                id: `onb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                institutionId: instId,
                clientName: formData.name.trim(),
                contactPerson: formData.contactPerson.trim(),
                phone: formData.phone.trim(),
                email: formData.email.trim().toLowerCase(),
                businessType: formData.businessType,
                county: formData.county,
                locationTown: formData.locationTown.trim(),
                inventoryDescription: formData.inventoryDescription.trim(),
                source: 'marketplace_direct_onboarding',
                status: 'onboarded',
                onboardedAt: nowIso
            }).catch(() => { });

            // 5. Also log a demo / onboarding lead entry
            await apiService.saveModuleRecord('demo_requests', {
                id: `demo_${Date.now()}`,
                name: formData.contactPerson.trim() || formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                institution: formData.name.trim(),
                phone: formData.phone.trim(),
                message: `Direct Marketplace Client Onboarding: ${formData.businessType} in ${formData.county}. Sourcing/Selling: ${formData.inventoryDescription || 'General stock'}`,
                status: 'onboarded',
                requestedAt: nowIso
            }).catch(() => { });

            // 6. Notify Super Admins
            await apiService.notifySuperAdmins(
                `🎉 New Client Onboarded to Marketplace: ${formData.name.trim()} (${formData.businessType}) in ${formData.county} - Phone: ${formData.phone.trim()}`,
                'system_alert'
            ).catch(() => { });

            // 7. Store created credentials for immediate presentation
            const portalBaseUrl = window.location.origin.includes('marketplace')
                ? 'https://portal.eduai.co.ke'
                : window.location.origin;

            setCreatedCredentials({
                instId,
                instName: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                password: rawPassword,
                portalUrl: portalBaseUrl
            });

            setOnboardSuccess(true);
            if (onClientOnboarded) {
                onClientOnboarded(newInstitution);
            }
        } catch (err: any) {
            console.error('Marketplace client onboarding error:', err);
            alert(`Onboarding failed: ${err.message || 'Network error'}. Please check details and retry.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/85 z-[350] flex items-center justify-center p-3 sm:p-6 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div 
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative my-auto animate-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Gradient Ribbon */}
                <div className="bg-gradient-to-r from-[#FF6000] via-[#FF5400] to-[#E55000] p-6 sm:p-8 text-white relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-5 right-5 w-9 h-9 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center transition-colors text-white"
                        title="Close"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner border border-white/30">
                            <StoreIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="bg-white text-[#FF6000] text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm">
                                    Direct Onboarding
                                </span>
                                <span className="text-amber-200 text-xs font-bold flex items-center gap-1">
                                    <ShieldCheckIcon className="w-3.5 h-3.5" /> Instant Activation
                                </span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-1">
                                Onboard Client to Marketplace
                            </h2>
                        </div>
                    </div>
                    <p className="text-xs text-white/90 max-w-lg">
                        Register and provision new clients, vendors, schools, or institutional suppliers directly into the EduAI Marketplace network.
                    </p>
                </div>

                {/* Body Content */}
                <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto">
                    {onboardSuccess && createdCredentials ? (
                        <div className="py-4 text-center space-y-6">
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                                <CheckCircleIcon className="w-12 h-12" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Client Successfully Onboarded!
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    <strong>{createdCredentials.instName}</strong> is now registered and active on the EduAI Marketplace.
                                </p>
                            </div>

                            {/* Credentials Card */}
                            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-left space-y-3">
                                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Portal Access Credentials</span>
                                    <button 
                                        type="button"
                                        onClick={() => copyToClipboard(`Portal: ${createdCredentials.portalUrl}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`)}
                                        className="text-xs font-bold text-[#FF6000] hover:underline flex items-center gap-1"
                                    >
                                        <span>{copied ? '✓ Copied' : '📋 Copy All'}</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Portal URL</span>
                                        <a href={createdCredentials.portalUrl} target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                                            {createdCredentials.portalUrl}
                                        </a>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Client ID</span>
                                        <span className="font-mono text-slate-700 dark:text-slate-300">{createdCredentials.instId}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Admin Email</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-100">{createdCredentials.email}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Default Password</span>
                                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                                            {createdCredentials.password}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <a 
                                    href={createdCredentials.portalUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95"
                                >
                                    <span>🚀 Launch Client Merchant Portal</span>
                                </a>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-2xl transition-colors"
                                >
                                    Close / Return to Marketplace
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* 1. Client Organization Name & Type */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                <div className="sm:col-span-7">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5">
                                        Client / Institution / Business Name <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Apex Lab Supplies Ltd / St. Jude High"
                                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-[#FF6000]"
                                    />
                                </div>

                                <div className="sm:col-span-5">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5">
                                        Business Category <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.businessType}
                                        onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-[#FF6000]"
                                    >
                                        {BUSINESS_CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.icon} {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 2. Contact Person & Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5">
                                        Contact Person Name & Title
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.contactPerson}
                                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                        placeholder="e.g. Peter Kamau (Director)"
                                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-[#FF6000]"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5">
                                        Contact Phone / WhatsApp <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="tel" 
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="e.g. 0712 345 678 / +254..."
                                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-[#FF6000]"
                                    />
                                </div>
                            </div>

                            {/* 3. Email Address & County */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5">
                                        Admin Email Address <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="email" 
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="e.g. info@clientcompany.co.ke"
                                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-[#FF6000]"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5">
                                        County / Region <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.county}
                                        onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-[#FF6000]"
                                    >
                                        {KENYA_COUNTIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 4. Town / Street & Custom Password */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5">
                                        Town / Physical Street Address
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.locationTown}
                                        onChange={(e) => setFormData({ ...formData, locationTown: e.target.value })}
                                        placeholder="e.g. Industrial Area, Enterprise Road"
                                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-[#FF6000]"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5">
                                        Portal Password <span className="text-slate-400 font-normal lowercase">(leave empty to auto-generate)</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Auto-generated if left empty"
                                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-[#FF6000]"
                                    />
                                </div>
                            </div>

                            {/* 5. Inventory / Products to List */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5">
                                    Products, Stock or Services Intended for Marketplace Listing
                                </label>
                                <textarea 
                                    rows={2}
                                    value={formData.inventoryDescription}
                                    onChange={(e) => setFormData({ ...formData, inventoryDescription: e.target.value })}
                                    placeholder="e.g. 100x Three-seater wooden student desks, 20x Laboratory microscopes, 50x Bunsen burners ready for wholesale."
                                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-[#FF6000]"
                                />
                            </div>

                            {/* Provisioning Features Callout */}
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-3.5 flex items-start gap-3">
                                <span className="text-lg">⚡</span>
                                <div className="text-[11px] text-amber-900 dark:text-amber-200 leading-tight">
                                    <span className="font-bold">Instant Marketplace Integration:</span> Onboarding automatically creates the merchant institution, provisions an Admin user account, enables public marketplace listing visibility, and activates inventory modules.
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-gradient-to-r from-[#FF6000] via-[#FF5400] to-[#E55000] hover:from-[#E55000] hover:to-[#CC4500] text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Provisioning Client Tenant & Marketplace Access...</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserPlusIcon className="w-4 h-4" />
                                            <span>Complete Client Onboarding to Marketplace</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
