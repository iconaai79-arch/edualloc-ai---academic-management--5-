import React, { useState, useEffect } from 'react';
import type { Institution, CompanyDetails, ResellerPackageConfig } from '../types';
import { apiService } from '../services/apiService';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

export interface ResellerOnboardingDefaults {
    defaultTrialDays: number;
    defaultInstitutionType: Institution['institutionType'];
    defaultMonthlyPrice: number;
    defaultQuarterlyPrice: number;
    defaultYearlyPrice: number;
    defaultWithdrawalAccount: string;
}

interface ResellerConfigurationManagerProps {
    resellerId: string;
    resellerInstitution: Institution;
    companyDetails: CompanyDetails;
    onInstitutionUpdated?: (updated: Institution) => void;
    onOnboardingDefaultsUpdated?: (defaults: ResellerOnboardingDefaults) => void;
}

const getDefaultOnboarding = (companyDetails: CompanyDetails): ResellerOnboardingDefaults => ({
    defaultTrialDays: 14,
    defaultInstitutionType: 'Education',
    defaultMonthlyPrice: companyDetails?.subscriptionConfig?.defaultMonthlyPrice || 4999,
    defaultQuarterlyPrice: companyDetails?.subscriptionConfig?.defaultQuarterlyPrice || 13500,
    defaultYearlyPrice: companyDetails?.subscriptionConfig?.defaultYearlyPrice || 49999,
    defaultWithdrawalAccount: ''
});

export const ResellerConfigurationManager: React.FC<ResellerConfigurationManagerProps> = ({
    resellerId,
    resellerInstitution,
    companyDetails,
    onInstitutionUpdated,
    onOnboardingDefaultsUpdated
}) => {
    const [section, setSection] = useState<'profile' | 'payments' | 'comms' | 'onboarding'>('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);
    const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // 1. Agency Profile & Branding State
    const [agencyName, setAgencyName] = useState(resellerInstitution?.name || '');
    const [agencyEmail, setAgencyEmail] = useState(resellerInstitution?.email || '');
    const [agencyPhone, setAgencyPhone] = useState(resellerInstitution?.phoneNumber || '');
    const [agencyAddress, setAgencyAddress] = useState(resellerInstitution?.address || '');
    const [themeColor, setThemeColor] = useState(resellerInstitution?.themeColor || '#4f46e5');
    const [logoUrl, setLogoUrl] = useState<string | null>(resellerInstitution?.logoUrl || null);
    const [letterheadUrl, setLetterheadUrl] = useState<string | null>(resellerInstitution?.letterheadUrl || null);
    const [stampUrl, setStampUrl] = useState<string | null>(resellerInstitution?.stampUrl || null);
    const [footerImageUrl, setFooterImageUrl] = useState<string | null>(resellerInstitution?.footerImageUrl || null);

    // 2. Payment Collection & Gateway State
    const [pkgConfig, setPkgConfig] = useState<ResellerPackageConfig>(() => {
        try {
            const raw = localStorage.getItem(`eduai_reseller_pkg_cfg_${resellerId}`);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return {
            id: `reseller_pkg_cfg_${resellerId}`,
            institutionId: resellerId,
            resellerId,
            collectionMode: 'platform_ncba',
            directPaymentInstructions: {
                paybill: '',
                accountNumber: '',
                tillNumber: '',
                bankDetails: '',
                phoneNumber: resellerInstitution?.phoneNumber || '',
                notes: 'Pay using the details above and enter your M-Pesa / Bank reference to submit your renewal.'
            },
            packageAdjustments: {},
            institutionOverrides: {}
        };
    });

    const [mpesaShortcode, setMpesaShortcode] = useState((resellerInstitution?.mpesaConfig as any)?.shortCode || (resellerInstitution?.mpesaConfig as any)?.shortcode || '');
    const [mpesaConsumerKey, setMpesaConsumerKey] = useState((resellerInstitution?.mpesaConfig as any)?.consumerKey || '');
    const [mpesaConsumerSecret, setMpesaConsumerSecret] = useState((resellerInstitution?.mpesaConfig as any)?.consumerSecret || '');
    const [mpesaPasskey, setMpesaPasskey] = useState((resellerInstitution?.mpesaConfig as any)?.passkey || '');
    const [mpesaEnv, setMpesaEnv] = useState<'sandbox' | 'production'>((resellerInstitution?.mpesaConfig as any)?.environment || 'production');

    // 3. SMS & Email State
    const [smsProvider, setSmsProvider] = useState((resellerInstitution?.smsConfig as any)?.provider || 'talksasa');
    const [smsSenderId, setSmsSenderId] = useState((resellerInstitution?.smsConfig as any)?.senderId || '');
    const [smsApiKey, setSmsApiKey] = useState((resellerInstitution?.smsConfig as any)?.apiKey || '');
    const [smsPartnerId, setSmsPartnerId] = useState((resellerInstitution?.smsConfig as any)?.partnerId || '');
    const [enableLowSmsReminders, setEnableLowSmsReminders] = useState(Boolean(resellerInstitution?.enableLowSmsReminders));
    const [lowSmsThreshold, setLowSmsThreshold] = useState(resellerInstitution?.lowSmsThreshold ?? 200);

    const [emailSenderName, setEmailSenderName] = useState((resellerInstitution?.emailConfig as any)?.senderName || resellerInstitution?.name || '');
    const [emailSenderAddress, setEmailSenderAddress] = useState((resellerInstitution?.emailConfig as any)?.senderEmail || resellerInstitution?.email || '');
    const [smtpHost, setSmtpHost] = useState((resellerInstitution?.emailConfig as any)?.smtpHost || '');
    const [smtpPort, setSmtpPort] = useState(String((resellerInstitution?.emailConfig as any)?.smtpPort || '587'));
    const [smtpUser, setSmtpUser] = useState((resellerInstitution?.emailConfig as any)?.smtpUser || '');
    const [smtpPass, setSmtpPass] = useState((resellerInstitution?.emailConfig as any)?.smtpPass || '');

    // 4. Onboarding & Payout Defaults
    const [onboardingDefaults, setOnboardingDefaults] = useState<ResellerOnboardingDefaults>(() => {
        try {
            const raw = localStorage.getItem(`eduai_reseller_onboarding_cfg_${resellerId}`);
            if (raw) return { ...getDefaultOnboarding(companyDetails), ...JSON.parse(raw) };
        } catch (_) {}
        return getDefaultOnboarding(companyDetails);
    });

    useEffect(() => {
        if (!resellerId) return;
        apiService.fetchModuleRecords<ResellerPackageConfig>('reseller_package_configs', resellerId)
            .then(records => {
                if (Array.isArray(records) && records.length > 0) {
                    setPkgConfig(prev => ({ ...prev, ...records[0] }));
                }
            })
            .catch(() => {});

        apiService.fetchModuleRecords<any>('reseller_onboarding_configs', resellerId)
            .then(records => {
                if (Array.isArray(records) && records.length > 0) {
                    const merged = { ...getDefaultOnboarding(companyDetails), ...records[0] };
                    setOnboardingDefaults(merged);
                    try { localStorage.setItem(`eduai_reseller_onboarding_cfg_${resellerId}`, JSON.stringify(merged)); } catch (_) {}
                }
            })
            .catch(() => {});
    }, [resellerId, companyDetails]);

    const showBanner = (type: 'success' | 'error', text: string) => {
        setStatusBanner({ type, text });
        setTimeout(() => setStatusBanner(null), 4000);
    };

    const handleAssetUpload = async (
        field: 'logoUrl' | 'letterheadUrl' | 'stampUrl' | 'footerImageUrl',
        file: File | null
    ) => {
        if (!file) return;
        setUploadingField(field);
        try {
            const ext = file.name.split('.').pop() || 'png';
            const uniquePath = `reseller/${resellerId}/${field}_${Date.now()}.${ext}`;
            let uploadedUrl: string | null = null;
            try {
                uploadedUrl = await apiService.uploadFile('institution-assets', uniquePath, file);
            } catch (_) {
                uploadedUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result || ''));
                    reader.onerror = () => reject(new Error('Failed to read image file.'));
                    reader.readAsDataURL(file);
                });
            }
            if (uploadedUrl) {
                if (field === 'logoUrl') setLogoUrl(uploadedUrl);
                if (field === 'letterheadUrl') setLetterheadUrl(uploadedUrl);
                if (field === 'stampUrl') setStampUrl(uploadedUrl);
                if (field === 'footerImageUrl') setFooterImageUrl(uploadedUrl);
                showBanner('success', 'Asset uploaded. Click "Save Configuration" to persist.');
            }
        } catch (err: any) {
            showBanner('error', `Upload failed: ${err?.message || 'Unknown error'}`);
        } finally {
            setUploadingField(null);
        }
    };

    const handleSaveInstitutionConfig = async (label: string) => {
        setIsSaving(true);
        try {
            const updatedInstitution: Institution = {
                ...resellerInstitution,
                name: agencyName.trim() || resellerInstitution.name,
                email: agencyEmail.trim() || resellerInstitution.email,
                phoneNumber: agencyPhone.trim() || resellerInstitution.phoneNumber,
                address: agencyAddress.trim(),
                themeColor,
                logoUrl,
                letterheadUrl,
                stampUrl,
                footerImageUrl,
                enableLowSmsReminders,
                lowSmsThreshold: Number(lowSmsThreshold) || 200,
                mpesaConfig: {
                    ...(resellerInstitution.mpesaConfig || {}),
                    shortCode: mpesaShortcode.trim(),
                    consumerKey: mpesaConsumerKey.trim(),
                    consumerSecret: mpesaConsumerSecret.trim(),
                    passkey: mpesaPasskey.trim(),
                    environment: mpesaEnv
                } as any,
                smsConfig: {
                    ...(resellerInstitution.smsConfig || {}),
                    provider: smsProvider,
                    senderId: smsSenderId.trim(),
                    apiKey: smsApiKey.trim(),
                    partnerId: smsPartnerId.trim()
                } as any,
                emailConfig: {
                    ...(resellerInstitution.emailConfig || {}),
                    senderName: emailSenderName.trim(),
                    senderEmail: emailSenderAddress.trim(),
                    smtpHost: smtpHost.trim(),
                    smtpPort: Number(smtpPort) || 587,
                    smtpUser: smtpUser.trim(),
                    smtpPass: smtpPass.trim()
                } as any
            };

            await apiService.saveInstitution(updatedInstitution);
            onInstitutionUpdated?.(updatedInstitution);
            showBanner('success', label);
        } catch (err: any) {
            showBanner('error', `Save failed: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePaymentAndPayoutConfig = async () => {
        setIsSaving(true);
        try {
            const nextPkgConfig: ResellerPackageConfig = {
                ...pkgConfig,
                id: pkgConfig.id || `reseller_pkg_cfg_${resellerId}`,
                institutionId: resellerId,
                resellerId,
                updatedAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('reseller_package_configs', nextPkgConfig).catch(() => {});
            try { localStorage.setItem(`eduai_reseller_pkg_cfg_${resellerId}`, JSON.stringify(nextPkgConfig)); } catch (_) {}

            const onboardingPayload = {
                ...onboardingDefaults,
                id: `reseller_onboarding_cfg_${resellerId}`,
                institutionId: resellerId,
                resellerId
            };
            await apiService.saveModuleRecord('reseller_onboarding_configs', onboardingPayload).catch(() => {});
            try { localStorage.setItem(`eduai_reseller_onboarding_cfg_${resellerId}`, JSON.stringify(onboardingDefaults)); } catch (_) {}
            onOnboardingDefaultsUpdated?.(onboardingDefaults);

            await handleSaveInstitutionConfig('Payment collection, gateway & payout settings saved.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveOnboardingDefaults = async () => {
        setIsSaving(true);
        try {
            const payload = {
                ...onboardingDefaults,
                id: `reseller_onboarding_cfg_${resellerId}`,
                institutionId: resellerId,
                resellerId,
                updatedAt: new Date().toISOString()
            };
            try { localStorage.setItem(`eduai_reseller_onboarding_cfg_${resellerId}`, JSON.stringify(onboardingDefaults)); } catch (_) {}
            await apiService.saveModuleRecord('reseller_onboarding_configs', payload).catch(() => {});
            onOnboardingDefaultsUpdated?.(onboardingDefaults);
            showBanner('success', 'Default onboarding & payout preferences saved.');
        } catch (err: any) {
            showBanner('error', `Failed to save defaults: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const brandingCards: { key: 'logoUrl' | 'letterheadUrl' | 'stampUrl' | 'footerImageUrl'; label: string; hint: string; url: string | null; clear: () => void }[] = [
        { key: 'logoUrl', label: 'Agency Logo', hint: 'Displayed on portal header & invoices', url: logoUrl, clear: () => setLogoUrl(null) },
        { key: 'letterheadUrl', label: 'Official Letterhead', hint: 'Top banner for PDF quotes & invoices', url: letterheadUrl, clear: () => setLetterheadUrl(null) },
        { key: 'stampUrl', label: 'Official Stamp / Seal', hint: 'Applied on official receipts & bills', url: stampUrl, clear: () => setStampUrl(null) },
        { key: 'footerImageUrl', label: 'Document Footer', hint: 'Bottom strip on exported PDFs', url: footerImageUrl, clear: () => setFooterImageUrl(null) }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {statusBanner && (
                <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                    statusBanner.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}>
                    <CheckCircleIcon className="w-4 h-4 shrink-0" />
                    <span>{statusBanner.text}</span>
                </div>
            )}

            {/* Sub-navigation pills */}
            <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                {[
                    { id: 'profile', label: 'Agency Profile & Branding', icon: <BuildingOfficeIcon className="w-4 h-4" /> },
                    { id: 'payments', label: 'Payments & Payouts', icon: <CreditCardIcon className="w-4 h-4" /> },
                    { id: 'comms', label: 'SMS & Email Setup', icon: <ChatBubbleBottomCenterTextIcon className="w-4 h-4" /> },
                    { id: 'onboarding', label: 'Onboarding Defaults', icon: <SparklesIcon className="w-4 h-4" /> }
                ].map(item => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setSection(item.id as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                            section === item.id
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>

            {/* SECTION 1: AGENCY PROFILE & BRANDING */}
            {section === 'profile' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Agency Profile &amp; White-Label Branding</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Manage your reseller agency contact information, theme color, and official document branding.</p>
                        </div>
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSaveInstitutionConfig('Agency profile & branding saved.')}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Agency Name</label>
                            <input
                                type="text"
                                value={agencyName}
                                onChange={e => setAgencyName(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Official Email</label>
                            <input
                                type="email"
                                value={agencyEmail}
                                onChange={e => setAgencyEmail(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Phone Number</label>
                            <input
                                type="text"
                                value={agencyPhone}
                                onChange={e => setAgencyPhone(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Physical Address</label>
                            <input
                                type="text"
                                value={agencyAddress}
                                onChange={e => setAgencyAddress(e.target.value)}
                                placeholder="e.g. Nairobi, Kenya"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Brand Theme Color</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={themeColor}
                                    onChange={e => setThemeColor(e.target.value)}
                                    className="w-12 h-10 rounded-lg border border-slate-300 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={themeColor}
                                    onChange={e => setThemeColor(e.target.value)}
                                    className="w-32 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Brand Assets (Logo, Letterhead, Stamp &amp; Footer)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {brandingCards.map(card => (
                                <div key={card.key} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-black text-slate-900 dark:text-white">{card.label}</div>
                                        <div className="text-[10px] text-slate-500">{card.hint}</div>
                                    </div>
                                    <div className="h-24 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden p-2">
                                        {card.url ? (
                                            <img src={card.url} alt={card.label} className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-medium">No image uploaded</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="flex-1 text-center py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider cursor-pointer">
                                            {uploadingField === card.key ? 'Uploading...' : card.url ? 'Replace' : 'Upload'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => handleAssetUpload(card.key, e.target.files?.[0] || null)}
                                            />
                                        </label>
                                        {card.url && (
                                            <button
                                                type="button"
                                                onClick={card.clear}
                                                className="py-2 px-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10px] font-black uppercase cursor-pointer"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 2: PAYMENTS, DIRECT COLLECTION & PAYOUTS */}
            {section === 'payments' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Payment Collection, Gateway &amp; Payout Settings</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Configure how your clients pay you, your default commission payout account, and optional M-Pesa Daraja keys.</p>
                        </div>
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleSavePaymentAndPayoutConfig}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? 'Saving...' : 'Save Payment Settings'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Subscription Collection Mode</label>
                            <select
                                value={pkgConfig.collectionMode}
                                onChange={e => setPkgConfig(prev => ({ ...prev, collectionMode: e.target.value as any }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            >
                                <option value="platform_ncba">Use Super Admin NCBA / M-Pesa (Auto-Commission)</option>
                                <option value="reseller_direct">Collect Direct from School &amp; Settle Super Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Default Commission Withdrawal Account</label>
                            <input
                                type="text"
                                value={onboardingDefaults.defaultWithdrawalAccount}
                                onChange={e => setOnboardingDefaults(prev => ({ ...prev, defaultWithdrawalAccount: e.target.value }))}
                                placeholder="e.g. M-Pesa 0712345678 / KCB Acct 1234567890"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Direct Client Payment Instructions</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <input
                                type="text"
                                value={pkgConfig.directPaymentInstructions?.paybill || ''}
                                onChange={e => setPkgConfig(prev => ({ ...prev, directPaymentInstructions: { ...prev.directPaymentInstructions, paybill: e.target.value } }))}
                                placeholder="M-Pesa Paybill (e.g. 522522)"
                                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                            <input
                                type="text"
                                value={pkgConfig.directPaymentInstructions?.accountNumber || ''}
                                onChange={e => setPkgConfig(prev => ({ ...prev, directPaymentInstructions: { ...prev.directPaymentInstructions, accountNumber: e.target.value } }))}
                                placeholder="Account Number"
                                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                            <input
                                type="text"
                                value={pkgConfig.directPaymentInstructions?.tillNumber || ''}
                                onChange={e => setPkgConfig(prev => ({ ...prev, directPaymentInstructions: { ...prev.directPaymentInstructions, tillNumber: e.target.value } }))}
                                placeholder="Buy Goods Till Number"
                                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                            <input
                                type="text"
                                value={pkgConfig.directPaymentInstructions?.phoneNumber || ''}
                                onChange={e => setPkgConfig(prev => ({ ...prev, directPaymentInstructions: { ...prev.directPaymentInstructions, phoneNumber: e.target.value } }))}
                                placeholder="Direct M-Pesa Phone"
                                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                            <input
                                type="text"
                                value={pkgConfig.directPaymentInstructions?.bankDetails || ''}
                                onChange={e => setPkgConfig(prev => ({ ...prev, directPaymentInstructions: { ...prev.directPaymentInstructions, bankDetails: e.target.value } }))}
                                placeholder="Bank Name, Account & Branch"
                                className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Reseller M-Pesa Daraja API (Optional)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <input
                                type="text"
                                value={mpesaShortcode}
                                onChange={e => setMpesaShortcode(e.target.value)}
                                placeholder="Shortcode / Paybill"
                                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                            <input
                                type="text"
                                value={mpesaConsumerKey}
                                onChange={e => setMpesaConsumerKey(e.target.value)}
                                placeholder="Consumer Key"
                                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                            <input
                                type="password"
                                value={mpesaConsumerSecret}
                                onChange={e => setMpesaConsumerSecret(e.target.value)}
                                placeholder="Consumer Secret"
                                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                            <input
                                type="password"
                                value={mpesaPasskey}
                                onChange={e => setMpesaPasskey(e.target.value)}
                                placeholder="STK Passkey"
                                className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                            <select
                                value={mpesaEnv}
                                onChange={e => setMpesaEnv(e.target.value as any)}
                                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            >
                                <option value="production">Production</option>
                                <option value="sandbox">Sandbox</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 3: SMS & EMAIL SETUP */}
            {section === 'comms' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">SMS &amp; Email Configuration</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Configure your reseller SMS sender credentials, low-balance alerts, and outbound email settings.</p>
                        </div>
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSaveInstitutionConfig('SMS & Email configuration saved.')}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? 'Saving...' : 'Save Comms Setup'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">SMS Gateway Settings</h4>
                            <select
                                value={smsProvider}
                                onChange={e => setSmsProvider(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            >
                                <option value="talksasa">Talksasa</option>
                                <option value="africastalking">Africa&apos;s Talking</option>
                                <option value="advanta">Advanta SMS</option>
                                <option value="celcom">Celcom Africa</option>
                            </select>
                            <input
                                type="text"
                                value={smsSenderId}
                                onChange={e => setSmsSenderId(e.target.value)}
                                placeholder="Sender ID (e.g. EDUAI)"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                            <input
                                type="password"
                                value={smsApiKey}
                                onChange={e => setSmsApiKey(e.target.value)}
                                placeholder="SMS API Key / Token"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                            <input
                                type="text"
                                value={smsPartnerId}
                                onChange={e => setSmsPartnerId(e.target.value)}
                                placeholder="Partner ID / Username (if required)"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                            <div className="flex items-center justify-between pt-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={enableLowSmsReminders}
                                        onChange={e => setEnableLowSmsReminders(e.target.checked)}
                                        className="w-4 h-4 accent-indigo-600"
                                    />
                                    Low SMS Balance Alerts
                                </label>
                                <input
                                    type="number"
                                    min={10}
                                    value={lowSmsThreshold}
                                    onChange={e => setLowSmsThreshold(Number(e.target.value) || 0)}
                                    className="w-24 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Outbound Email / SMTP</h4>
                            <input
                                type="text"
                                value={emailSenderName}
                                onChange={e => setEmailSenderName(e.target.value)}
                                placeholder="Sender Name"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                            <input
                                type="email"
                                value={emailSenderAddress}
                                onChange={e => setEmailSenderAddress(e.target.value)}
                                placeholder="Sender Email"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    value={smtpHost}
                                    onChange={e => setSmtpHost(e.target.value)}
                                    placeholder="SMTP Host"
                                    className="col-span-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                                />
                                <input
                                    type="text"
                                    value={smtpPort}
                                    onChange={e => setSmtpPort(e.target.value)}
                                    placeholder="Port (587)"
                                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                                />
                            </div>
                            <input
                                type="text"
                                value={smtpUser}
                                onChange={e => setSmtpUser(e.target.value)}
                                placeholder="SMTP Username"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                            <input
                                type="password"
                                value={smtpPass}
                                onChange={e => setSmtpPass(e.target.value)}
                                placeholder="SMTP Password"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 4: DEFAULT ONBOARDING PREFERENCES */}
            {section === 'onboarding' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Default Client Onboarding Preferences</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Pre-fill trial duration, institution type, and standard pricing whenever you onboard a new client.</p>
                        </div>
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleSaveOnboardingDefaults}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? 'Saving...' : 'Save Defaults'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Default Trial Period (Days)</label>
                            <input
                                type="number"
                                min={1}
                                max={90}
                                value={onboardingDefaults.defaultTrialDays}
                                onChange={e => setOnboardingDefaults(prev => ({ ...prev, defaultTrialDays: Math.max(1, Number(e.target.value) || 14) }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Default Client Type</label>
                            <select
                                value={onboardingDefaults.defaultInstitutionType}
                                onChange={e => setOnboardingDefaults(prev => ({ ...prev, defaultInstitutionType: e.target.value as any }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            >
                                <option value="Education">Education (Schools &amp; Colleges)</option>
                                <option value="Business">Business / Retail</option>
                                <option value="HIS">Hospital / Clinic (HIS)</option>
                                <option value="Pharmacy">Pharmacy</option>
                                <option value="Driving School">Driving School</option>
                                <option value="Property Management">Property Management</option>
                                <option value="SACCO">SACCO / Cooperative</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Default Monthly Rate (KES)</label>
                            <input
                                type="number"
                                min={0}
                                value={onboardingDefaults.defaultMonthlyPrice}
                                onChange={e => setOnboardingDefaults(prev => ({ ...prev, defaultMonthlyPrice: Math.max(0, Number(e.target.value) || 0) }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Default Quarterly Rate (KES)</label>
                            <input
                                type="number"
                                min={0}
                                value={onboardingDefaults.defaultQuarterlyPrice}
                                onChange={e => setOnboardingDefaults(prev => ({ ...prev, defaultQuarterlyPrice: Math.max(0, Number(e.target.value) || 0) }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Default Yearly Rate (KES)</label>
                            <input
                                type="number"
                                min={0}
                                value={onboardingDefaults.defaultYearlyPrice}
                                onChange={e => setOnboardingDefaults(prev => ({ ...prev, defaultYearlyPrice: Math.max(0, Number(e.target.value) || 0) }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
